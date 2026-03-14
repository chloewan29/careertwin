import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";

// legacy route.
// compatibility-only path for older consumers.
// canonical matching runtime is in lib/career-engine/matching/capability-match-v2.ts and job-copilot flows.
// do not use for new runtime paths.
// see: docs/system_map.md, docs/schema_inventory.md, docs/canonical_schema.md

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobDescription, profileId } = body as {
            jobDescription: string;
            profileId: string;
        };

        if (!jobDescription || jobDescription.length < 50) {
            return NextResponse.json(
                { error: "Job description must be at least 50 characters" },
                { status: 400 }
            );
        }

        if (!profileId) {
            return NextResponse.json(
                { error: "Profile ID is required" },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        // 1. Fetch user profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profileId)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // 2. Fetch user skills from user_skills table
        const { data: userSkills } = await supabase
            .from("user_skills")
            .select("skills(name)")
            .eq("user_id", profile.user_id);

        type UserSkillRow = { skills: { name: string | null } | null };
        const rawSkills: string[] = userSkills
            ? (userSkills as UserSkillRow[])
                .map((us) => us.skills?.name)
                .filter((name): name is string => Boolean(name))
            : [];

        // 2b. Fetch latest resume raw_text and parsed_json for evidence mapping
        const { data: latestResume } = await supabase
            .from("resumes")
            .select("raw_text, parsed_json")
            .eq("profile_id", profileId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        const rawResumeText: string = latestResume?.raw_text ?? "";
        let parsedResumeJson = latestResume?.parsed_json ?? null;
        if (typeof parsedResumeJson === 'string') {
            try {
                parsedResumeJson = JSON.parse(parsedResumeJson);
            } catch (e) {
                console.error("Failed to parse parsed_json string", e);
            }
        }

        // 3. Parse job description
        const { parseJobDescription } = await import("@/lib/career-engine/parsing/jd-parser");
        const parsedJD = parseJobDescription(jobDescription);

        // 4. Normalize profile skills + title
        const { normalizeSkills } = await import("@/lib/career-engine/parsing/skill-normalizer");

        // Trace skills hierarchy
        const parsedSkills = parsedResumeJson?.skills || [];
        const profileDirectSkills = profile.skills || [];
        const parsedCapabilities = Array.isArray(parsedResumeJson?.capabilities) ? parsedResumeJson.capabilities : [];
        const profileCapabilities = Array.isArray(profile.capabilities) ? profile.capabilities : [];

        // 1. Profile skills if present
        // 2. Database user_skills if present
        // 3. Parsed resume skills as fallback
        let resolvedSkills: string[] = [];
        let skillSource = "unknown";

        if (profileDirectSkills.length > 0) {
            resolvedSkills = profileDirectSkills;
            skillSource = "profile.skills";
        } else if (rawSkills.length > 0) {
            resolvedSkills = rawSkills;
            skillSource = "user_skills";
        } else if (parsedSkills.length > 0) {
            resolvedSkills = parsedSkills;
            skillSource = "resumes.parsed_json.skills";
        }

        console.log("=== Profile Skill Normalization Trace ===");
        console.log("Source Selected:", skillSource);
        console.log("Parsed JSON Skills:", parsedSkills);
        console.log("Database user_skills:", rawSkills);
        console.log("Profile DB Skills:", profileDirectSkills);
        console.log("Resolved Skills to Normalize:", resolvedSkills);

        const normalizedSkills = normalizeSkills(resolvedSkills);
        console.log("Normalized Profile Skills:", normalizedSkills.map(s => s.normalized));
        console.log("=========================================");

        // 5. Build profile input
        const { matchRoles } = await import("@/lib/career-engine/matching/role-matcher");
        const profileInput = {
            current_title: profile.current_title ?? null,
            years_experience: profile.years_experience != null ? parseFloat(profile.years_experience) : null,
            skills: normalizedSkills.map(s => s.normalized),
            capabilities: profileCapabilities.length > 0 ? profileCapabilities : parsedCapabilities,
            parsed_skills: parsedSkills,
            resume_text: rawResumeText,
        };

        const matchResult = matchRoles(profileInput, parsedJD);

        // --- DEBUG LOGS FOR MATCHING PIPELINE ---
        console.log("=== Matching Pipeline Debug ===");
        console.log("Normalized Profile Skills:", profileInput.skills);
        console.log("Normalized JD Skills (Required):", parsedJD.required_skills.map(s => s.normalized));
        console.log("Normalized JD Skills (Preferred):", parsedJD.preferred_skills.map(s => s.normalized));
        console.log("Matched Skills:", matchResult.matched_skills);
        console.log("Missing Skills:", matchResult.missing_skills);
        console.log("===============================");

        // --- 5b. LLM Evidence Mapping for Capabilities (optional) ---
        if (process.env.GEMINI_API_KEY) {
            try {
                const { extractCapabilitiesWithLLM } = await import("@/lib/career-engine/matching/llm-evidence-mapper");

                // Extract recent bullets roughly using line breaks from raw text
                // (A fully parsed bullet array is ideal, but raw text lines work as a proxy for the LLM)
                const resumeLines = rawResumeText.split('\n').map(l => l.trim()).filter(l => l.length > 20);

                // Target specifically the missing skills as capabilities to verify
                const missingCapabilities = matchResult.missing_skills;

                const capabilityAssessment = await extractCapabilitiesWithLLM(resumeLines, missingCapabilities);

                console.log("=== LLM Capability Mapping Debug ===");
                console.log("LLM Found Evidence For:", capabilityAssessment.matched_capabilities.map(c => c.capability));

                // Remove skills from missing_skills if the LLM successfully mapped them to evidence
                if (capabilityAssessment.matched_capabilities.length > 0) {
                    const mappedSkillNames = new Set(
                        capabilityAssessment.matched_capabilities.map(c => c.capability.toLowerCase())
                    );

                    matchResult.missing_skills = matchResult.missing_skills.filter(
                        s => !mappedSkillNames.has(s.toLowerCase())
                    );

                    // Add them to matched skills
                    matchResult.matched_skills.push(...capabilityAssessment.matched_capabilities.map(c => c.capability));
                }

                console.log("Final Missing Skills after LLM fix:", matchResult.missing_skills);
                console.log("====================================");
            } catch (llmError) {
                console.warn("LLM enrichment skipped due to mapper error:", llmError);
            }
        } else {
            console.log("LLM enrichment skipped: GEMINI_API_KEY is missing.");
        }

        // 6. Prioritize gaps
        const { prioritizeGaps } = await import("@/lib/career-engine/scoring/gap-prioritizer");
        const gapReport = prioritizeGaps(profileInput, parsedJD, matchResult);

        // 7. Build career strategy
        const { buildCareerStrategy } = await import("@/lib/career-engine/strategy/career-strategy");
        const strategy = buildCareerStrategy(profileInput, parsedJD, matchResult, gapReport);

        // 7b. Build action plan
        const { buildActionPlan } = await import("@/lib/career-engine/strategy/action-plan");
        const actionPlan = buildActionPlan(profileInput, parsedJD, matchResult, gapReport, strategy);

        // 8. Map evidence from resume text
        const { mapEvidence } = await import("@/lib/career-engine/matching/evidence-mapper");
        const evidenceMap = mapEvidence(
            parsedResumeJson ?? {
                full_name: null, current_title: null, years_experience: null,
                industry: null, skills: rawSkills, companies: [], education: [],
                summary: null, contact: { email: null, phone: null, linkedin: null, address: null },
                parse_quality: "low", missing_fields: [],
            },
            rawResumeText,
            matchResult.matched_skills,
            matchResult.missing_skills
        );

        // 10. Career Twin Score
        const { calculateCareerTwinScore } = await import("@/lib/career-engine/scoring/career-twin-score");
        const twinScore = calculateCareerTwinScore(profileInput, matchResult, gapReport);
        const { explainMatch } = await import("@/lib/career-engine/profile/explain-match");
        const matchExplanation = explainMatch({ match: matchResult, gaps: gapReport, score: twinScore });

        // 11. Resume Rewrite
        const { rewriteResume } = await import("@/lib/career-engine/profile/resume-rewriter");
        const resumeRewrite = rewriteResume(
            parsedResumeJson ?? {
                full_name: null, current_title: null, years_experience: null,
                industry: null, skills: rawSkills, capabilities: [], companies: [], education: [],
                summary: null, contact: { email: null, phone: null, linkedin: null, address: null },
                experience_entries: [],
                parse_quality: "low", missing_fields: [],
            },
            parsedJD,
            gapReport
        );

        // 12. Career Simulation
        const { simulateGapResolution } = await import("@/lib/career-engine/strategy/career-simulator");
        const simulation = simulateGapResolution(profileInput, parsedJD, matchResult, gapReport);
        // legacy job_matches shape (user_id + matched_skills/missing_skills/gap_analysis) for compatibility-only writes.
        const { error: dbError } = await supabase
            .from("job_matches")
            .insert({
                user_id: profileId,
                job_description: jobDescription,
                match_score: matchResult.match_score,
                matched_skills: matchResult.matched_skills,
                missing_skills: matchResult.missing_skills,
                gap_analysis: {
                    priority_gaps: gapReport.priority_gaps,
                    quick_wins: gapReport.quick_wins,
                    stretch_gaps: gapReport.stretch_gaps,
                    summary: gapReport.summary,
                },
                strategy: {
                    resume_improvements: strategy.resume_improvements,
                    positioning_suggestions: strategy.positioning_suggestions,
                    skills_to_build: strategy.skills_to_build,
                    next_best_actions: strategy.next_best_actions,
                },
                action_plan: {
                    actions_7d: actionPlan.actions_7d,
                    actions_30d: actionPlan.actions_30d,
                    actions_90d: actionPlan.actions_90d,
                },
                evidence: {
                    matched: evidenceMap.matched_evidence,
                    missing: evidenceMap.missing_evidence,
                },
                simulation: {
                    baseline: simulation.baseline_score,
                    best_case: simulation.best_case_score,
                    improvements: simulation.improvements,
                },
                target_title: parsedJD.target_title,
                target_company: parsedJD.company,
            });

        if (dbError) {
            console.error("job_matches insert error:", dbError);
        }

        // 9. Return full analysis to frontend
        return NextResponse.json({
            success: true,
            analysis: {
                overallScore: matchResult.match_score,
                matchLabel: matchResult.match_label,
                matchedSkills: matchResult.matched_skills,
                missingSkills: matchResult.missing_skills,
                experienceGap: {
                    requiredYears: parsedJD.years_required,
                    candidateYears: profileInput.years_experience ?? 0,
                    meets: matchResult.experience_score >= 85,
                },
                titleGap: matchResult.title_gap,
                seniorityGap: matchResult.seniority_gap,
                priorityGaps: gapReport.priority_gaps,
                gapSummary: gapReport.summary,
                resumeImprovements: strategy.resume_improvements,
                positioningSuggestions: strategy.positioning_suggestions,
                nextBestActions: strategy.next_best_actions,
                matchedEvidence: evidenceMap.matched_evidence,
                missingEvidence: evidenceMap.missing_evidence,
                actionPlan: {
                    actions_7d: actionPlan.actions_7d,
                    actions_30d: actionPlan.actions_30d,
                    actions_90d: actionPlan.actions_90d,
                },
                careerTwinScore: {
                    score: twinScore.career_twin_score,
                    label: twinScore.label,
                    breakdown: twinScore.breakdown,
                },
                recommendation: matchExplanation.recommendation,
                whyThisRoleFitsYou: matchExplanation.why_this_role_fits_you,
                criticalGaps: gapReport.critical_gaps.map(g => g.label),
                evidenceGaps: gapReport.evidence_gaps
                    .map(g => g.skill ?? g.label)
                    .filter((v): v is string => Boolean(v)),
                explanationSummary: matchExplanation.summary,
                resumeRewrite: {
                    roles: resumeRewrite.roles,
                    summary_suggestion: resumeRewrite.summary_suggestion,
                    resume_document: resumeRewrite.resume_document,
                },
                simulation: {
                    baseline_score: simulation.baseline_score,
                    best_case_score: simulation.best_case_score,
                    improvements: simulation.improvements,
                },
            },
        });

    } catch (err) {
        console.error("Match API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
