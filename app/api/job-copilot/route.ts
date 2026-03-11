import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { generateJobRecommendations } from "@/lib/career-engine/job/job-copilot";
import { parseJobDescription } from "@/lib/career-engine/parsing/jd-parser";
import { normalizeTitle } from "@/lib/career-engine/parsing/title-normalizer";

// LEGACY ROUTE: extension-based job detail analysis is now the primary Job Copilot path.
// Keep this route for backward compatibility and controlled re-enable only.
const LEGACY_JOB_FEED_ENABLED = process.env.ENABLE_LEGACY_JOB_FEED === "1";

type RequestBody = {
    profileId?: string;
    query?: string;
    location?: string;
};

type JobSignalValidation = {
    job_id: string;
    canonical_job_id: string;
    title: string;
    weak: boolean;
    reasons: string[];
    extracted: {
        target_title: string | null;
        role_family: string | null;
        required_skills_count: number;
        preferred_skills_count: number;
        responsibilities_count: number;
        domains_count: number;
        keywords_count: number;
        raw_text_length: number;
    };
};

function canonicalizeJobUrl(jobUrl: string | null): string {
    const raw = (jobUrl ?? "").trim();
    if (!raw) return "";
    try {
        const parsed = new URL(raw);
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString().replace(/\/+$/, "").toLowerCase();
    } catch {
        return raw.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
    }
}

function normalizeJobTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeCompany(company: string | null): string {
    return (company ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\b(proprietary|pty|ltd|limited|inc|llc|corp|corporation|co|company)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function canonicalJobId(jobUrl: string | null, title: string, company: string | null): string {
    const canonicalUrl = canonicalizeJobUrl(jobUrl);
    if (canonicalUrl) return `url:${canonicalUrl}`;
    return `title_company:${normalizeJobTitle(title)}|${normalizeCompany(company)}`;
}

const STOPWORDS = new Set(["the", "and", "for", "with", "from", "into", "across", "that", "this", "your", "you", "our", "their", "was", "were", "are", "is", "of", "to", "in", "on", "by", "as", "at", "or", "an", "a"]);
const DOMAIN_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: "analytics", pattern: /\b(analytics|insight|bi|dashboard|reporting)\b/i },
    { label: "data platform", pattern: /\b(data platform|data warehouse|bigquery|snowflake|etl|pipeline)\b/i },
    { label: "transformation", pattern: /\b(transformation|change|operating model|modernization)\b/i },
    { label: "strategy", pattern: /\b(strategy|strategic planning|roadmap|planning)\b/i },
    { label: "program delivery", pattern: /\b(program|portfolio|delivery|governance)\b/i },
    { label: "commercial", pattern: /\b(commercial|revenue|growth|margin|profit)\b/i },
];

type JdSignals = {
    targetTitleTokens: Set<string>;
    roleFamilyTokens: Set<string>;
    requiredSkillTokens: Set<string>;
    preferredSkillTokens: Set<string>;
    responsibilityTokens: Set<string>;
    domainTokens: Set<string>;
    keywordTokens: Set<string>;
};

function tokenize(text: string): string[] {
    return (text ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function buildTokenSet(input: string[]): Set<string> {
    const tokens = new Set<string>();
    for (const text of input) {
        for (const token of tokenize(text)) tokens.add(token);
    }
    return tokens;
}

function inferDomainTokensForJd(rawText: string, targetTitle: string | null, roleFamily: string | null): Set<string> {
    const domains = new Set<string>();
    const corpus = [rawText, targetTitle ?? "", roleFamily ?? ""].join(" ");
    for (const domain of DOMAIN_SIGNAL_PATTERNS) {
        if (domain.pattern.test(corpus)) {
            for (const token of tokenize(domain.label)) domains.add(token);
        }
    }
    return domains;
}

function overlapCount(tokens: string[], signals: Set<string>): number {
    let count = 0;
    for (const token of tokens) {
        if (signals.has(token)) count += 1;
    }
    return count;
}

function buildJdSignalsFromParsedJd(jd: ReturnType<typeof parseJobDescription>): JdSignals {
    const targetTitleTokens = buildTokenSet([jd.target_title ?? ""]);
    const roleFamilyTokens = buildTokenSet([jd.normalized_title?.function ?? "", jd.normalized_title?.normalized ?? ""]);
    const requiredSkillTokens = buildTokenSet(jd.required_skills.map((s) => s.normalized));
    const preferredSkillTokens = buildTokenSet(jd.preferred_skills.map((s) => s.normalized));
    const responsibilityTokens = buildTokenSet(jd.responsibilities ?? []);
    const domainTokens = inferDomainTokensForJd(jd.raw_text, jd.target_title ?? null, jd.normalized_title?.function ?? null);
    const keywordTokens = buildTokenSet([jd.raw_text]);
    return {
        targetTitleTokens,
        roleFamilyTokens,
        requiredSkillTokens,
        preferredSkillTokens,
        responsibilityTokens,
        domainTokens,
        keywordTokens,
    };
}

function scoreEvidenceText(rawText: string, signals: JdSignals): number {
    const tokens = tokenize(rawText);
    const keywordOverlap = overlapCount(tokens, signals.keywordTokens);
    const requiredSkillOverlap = overlapCount(tokens, signals.requiredSkillTokens);
    const preferredSkillOverlap = overlapCount(tokens, signals.preferredSkillTokens);
    const responsibilityOverlap = overlapCount(tokens, signals.responsibilityTokens);
    const roleFamilyOverlap = overlapCount(tokens, signals.roleFamilyTokens) + overlapCount(tokens, signals.targetTitleTokens);
    const domainOverlap = overlapCount(tokens, signals.domainTokens);
    return (
        keywordOverlap * 1 +
        requiredSkillOverlap * 4 +
        preferredSkillOverlap * 2 +
        responsibilityOverlap * 3 +
        roleFamilyOverlap * 2 +
        domainOverlap * 2
    );
}

function scoreMatchFromCareerMemory(
    jd: ReturnType<typeof parseJobDescription>,
    evidenceRawTexts: string[],
    capabilityNames: string[]
): { matchScore: number; gapSummary: Record<string, unknown>; matchedCapabilities: string[] } {
    const signals = buildJdSignalsFromParsedJd(jd);
    const evidenceScores = evidenceRawTexts.map((text) => scoreEvidenceText(text, signals));
    const evidenceScoreTotal = evidenceScores.reduce((sum, value) => sum + value, 0);
    const normalizedEvidenceScore = Math.min(100, Math.round(evidenceScoreTotal / Math.max(1, evidenceRawTexts.length)));

    const requiredSkills = jd.required_skills.map((s) => s.normalized);
    const preferredSkills = jd.preferred_skills.map((s) => s.normalized);
    const allEvidenceText = evidenceRawTexts.join(" ").toLowerCase();

    const matchedRequiredSkills = requiredSkills.filter((skill) =>
        tokenize(skill).every((token) => allEvidenceText.includes(token))
    );
    const missingRequiredSkills = requiredSkills.filter((skill) => !matchedRequiredSkills.includes(skill));
    const matchedPreferredSkills = preferredSkills.filter((skill) =>
        tokenize(skill).every((token) => allEvidenceText.includes(token))
    );

    const normalizedCapabilities = capabilityNames.map((name) => name.toLowerCase().trim());
    const matchedCapabilities = normalizedCapabilities.filter((capability) => {
        const tokens = tokenize(capability);
        if (tokens.length === 0) return false;
        return tokens.some((token) => jd.raw_text.toLowerCase().includes(token));
    });

    const requiredCoverage = requiredSkills.length > 0
        ? matchedRequiredSkills.length / requiredSkills.length
        : 0.5;
    const preferredCoverage = preferredSkills.length > 0
        ? matchedPreferredSkills.length / preferredSkills.length
        : 0.5;
    const capabilityCoverage = normalizedCapabilities.length > 0
        ? matchedCapabilities.length / normalizedCapabilities.length
        : 0.5;

    const matchScore = Math.max(
        0,
        Math.min(
            100,
            Math.round(
                (normalizedEvidenceScore * 0.5) +
                (requiredCoverage * 100 * 0.3) +
                (preferredCoverage * 100 * 0.1) +
                (capabilityCoverage * 100 * 0.1)
            )
        )
    );

    return {
        matchScore,
        matchedCapabilities: matchedCapabilities.slice(0, 10),
        gapSummary: {
            evidence_piece_count: evidenceRawTexts.length,
            matched_required_skills: matchedRequiredSkills,
            missing_required_skills: missingRequiredSkills,
            matched_preferred_skills: matchedPreferredSkills,
            required_skill_coverage: requiredCoverage,
            preferred_skill_coverage: preferredCoverage,
            capability_coverage: capabilityCoverage,
        },
    };
}

function deriveJobSignalFields(
    parsedJd: ReturnType<typeof parseJobDescription>,
    jobTitle: string,
): {
    targetTitle: string | null;
    roleFamily: string | null;
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
    domains: string[];
    keywords: string[];
} {
    const titleFallback = parsedJd.target_title ?? jobTitle ?? null;
    const normalizedFromTitle = titleFallback ? normalizeTitle(titleFallback) : null;
    const roleFamily = parsedJd.normalized_title?.function ?? normalizedFromTitle?.function ?? null;
    const domains = Array.from(inferDomainTokensForJd(parsedJd.raw_text, titleFallback, roleFamily));
    const keywords = Array.from(new Set(tokenize(parsedJd.raw_text))).slice(0, 50);

    return {
        targetTitle: titleFallback,
        roleFamily,
        requiredSkills: parsedJd.required_skills.map((s) => s.normalized),
        preferredSkills: parsedJd.preferred_skills.map((s) => s.normalized),
        responsibilities: parsedJd.responsibilities ?? [],
        domains,
        keywords,
    };
}

function validateJobSignalsQuality(
    params: {
        jobId: string;
        canonicalJobId: string;
        title: string;
        parsedJd: ReturnType<typeof parseJobDescription>;
        signalFields: ReturnType<typeof deriveJobSignalFields>;
    },
): JobSignalValidation {
    const reasons: string[] = [];
    const extracted = {
        target_title: params.signalFields.targetTitle,
        role_family: params.signalFields.roleFamily,
        required_skills_count: params.signalFields.requiredSkills.length,
        preferred_skills_count: params.signalFields.preferredSkills.length,
        responsibilities_count: params.signalFields.responsibilities.length,
        domains_count: params.signalFields.domains.length,
        keywords_count: params.signalFields.keywords.length,
        raw_text_length: (params.parsedJd.raw_text ?? "").length,
    };

    if (!extracted.target_title && !extracted.role_family) {
        reasons.push("missing_target_title_and_role_family");
    }
    if (extracted.required_skills_count === 0 && extracted.responsibilities_count === 0 && extracted.domains_count === 0) {
        reasons.push("missing_required_responsibility_domain_signals");
    }
    if (extracted.raw_text_length < 600) {
        reasons.push("source_jd_too_short");
    }

    return {
        job_id: params.jobId,
        canonical_job_id: params.canonicalJobId,
        title: params.title,
        weak: reasons.length > 0,
        reasons,
        extracted,
    };
}

export async function POST(request: NextRequest) {
    const debugMode = request.nextUrl.searchParams.get("debug") === "1";
    const jobSignalValidations: JobSignalValidation[] = [];
    if (!LEGACY_JOB_FEED_ENABLED) {
        return NextResponse.json(
            {
                error: "Legacy job feed flow is disabled. Use extension-driven Job Copilot routes.",
                code: "legacy_job_feed_disabled",
                legacy: true,
            },
            { status: 410 },
        );
    }
    try {
        const body = (await request.json()) as RequestBody;
        const profileId = body.profileId;
        const query = body.query?.trim() ?? "";
        const location = body.location?.trim() ?? "";

        if (!profileId) {
            return NextResponse.json({ error: "profileId is required" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profileId)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }
        const { data: careers, error: careerLoadError } = await supabase
            .from("careers")
            .select("id, user_id")
            .eq("user_id", profile.user_id)
            .order("created_at", { ascending: false })
            .limit(1);

        if (careerLoadError) {
            console.error("job-copilot career load error:", careerLoadError);
            return NextResponse.json({ error: "Failed to load career memory" }, { status: 500 });
        }

        const careerId = careers?.[0]?.id ?? null;

        const { data: userSkills } = await supabase
            .from("user_skills")
            .select("skills(name)")
            .eq("user_id", profile.user_id);

        type UserSkillRow = { skills: { name: string | null } | null };
        const dbSkills: string[] = userSkills
            ? (userSkills as UserSkillRow[])
                .map((us) => us.skills?.name)
                .filter((name): name is string => Boolean(name))
            : [];

        const { data: latestResume } = await supabase
            .from("resumes")
            .select("raw_text, parsed_json")
            .eq("profile_id", profileId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        let parsedResumeJson = latestResume?.parsed_json ?? null;
        if (typeof parsedResumeJson === "string") {
            try {
                parsedResumeJson = JSON.parse(parsedResumeJson);
            } catch {
                parsedResumeJson = null;
            }
        }

        const parsedSkills = Array.isArray(parsedResumeJson?.skills) ? parsedResumeJson.skills : [];
        const profileSkills = Array.isArray(profile.skills) ? profile.skills : [];
        const resolvedSkills = profileSkills.length > 0
            ? profileSkills
            : (dbSkills.length > 0 ? dbSkills : parsedSkills);

        const experienceEntries = Array.isArray(parsedResumeJson?.experience_entries)
            ? parsedResumeJson.experience_entries
            : [];

        console.log("job-copilot API provider fetch start:", {
            profileId,
            query: query || null,
            location: location || null,
        });
        const recommendations = await generateJobRecommendations({
            current_title: profile.current_title ?? null,
            query_override: query || null,
            summary: profile.summary ?? parsedResumeJson?.summary ?? null,
            years_experience: profile.years_experience != null ? parseFloat(profile.years_experience) : null,
            skills: resolvedSkills,
            experience_entries: experienceEntries,
            resume_text: latestResume?.raw_text ?? "",
            location,
        });
        console.log("job-copilot API provider fetch diagnostics:", recommendations.meta.jobs_fetched_per_role.map((row) => ({
            role: row.role,
            provider: row.provider,
            provider_status: row.provider_status,
            provider_response_status: row.provider_response_status,
            provider_jobs_returned: row.provider_jobs_returned,
            provider_attempts: row.provider_attempts,
            query_variants_tried: row.query_variants_tried,
            selected_query_variant: row.selected_query_variant,
            final_source: row.source,
            fallback_trigger_reason: row.fallback_trigger_reason,
        })));

        // Legacy feed exclusion now reads from extension-first pipeline tables.
        // user_job_actions remains write-only compatibility/audit, not a product read source.
        const { data: priorInteractions, error: priorInteractionError } = await supabase
            .from("user_job_interactions")
            .select("job_snapshot_id, pipeline_status")
            .eq("profile_id", profile.id)
            .in("pipeline_status", ["applied", "interview"]);

        if (priorInteractionError) {
            console.error("job-copilot interaction exclusion load error:", priorInteractionError);
            return NextResponse.json({ error: "Failed to load existing pipeline interactions" }, { status: 500 });
        }

        const priorSnapshotIds = Array.from(
            new Set(
                (priorInteractions ?? [])
                    .map((row) => row.job_snapshot_id)
                    .filter((value): value is number => typeof value === "number"),
            ),
        );

        const { data: priorSnapshots, error: priorSnapshotsError } = priorSnapshotIds.length > 0
            ? await supabase
                .from("job_snapshots")
                .select("job_snapshot_id, job_url, job_title, company")
                .in("job_snapshot_id", priorSnapshotIds)
            : { data: [], error: null };

        if (priorSnapshotsError) {
            console.error("job-copilot snapshot exclusion load error:", priorSnapshotsError);
            return NextResponse.json({ error: "Failed to load existing pipeline snapshots" }, { status: 500 });
        }

        const excludedByUrl = new Set(
            (priorSnapshots ?? [])
                .map((row) => (row.job_url ?? "").trim().toLowerCase())
                .filter((value) => value.length > 0),
        );
        const excludedByTitleCompany = new Set(
            (priorSnapshots ?? []).map((row) =>
                `${(row.job_title ?? "").trim().toLowerCase()}|${(row.company ?? "").trim().toLowerCase()}`,
            ),
        );

        const filteredJobs = recommendations.recommended_jobs.filter((job) => {
            const urlKey = (job.job_url ?? "").trim().toLowerCase();
            if (urlKey && excludedByUrl.has(urlKey)) return false;
            const titleCompanyKey = `${job.job_title.trim().toLowerCase()}|${(job.company ?? "").trim().toLowerCase()}`;
            return !excludedByTitleCompany.has(titleCompanyKey);
        });

        const feedCandidates = filteredJobs.map((job) => ({
            ...job,
            canonical_job_id: canonicalJobId(job.job_url, job.job_title, job.company),
        }));
        const canonicalIds = Array.from(new Set(feedCandidates.map((job) => job.canonical_job_id)));
        const { data: existingFeedRows } = canonicalIds.length > 0
            ? await supabase
                .from("user_job_feed_memory")
                .select("canonical_job_id")
                .eq("user_id", profile.user_id)
                .in("canonical_job_id", canonicalIds)
            : { data: [] as Array<{ canonical_job_id: string }> };

        const existingIdSet = new Set((existingFeedRows ?? []).map((row) => row.canonical_job_id));
        const nowIso = new Date().toISOString();

        const newFeedRows = feedCandidates
            .filter((job) => !existingIdSet.has(job.canonical_job_id))
            .map((job) => ({
                user_id: profile.user_id,
                canonical_job_id: job.canonical_job_id,
                job_url: job.job_url,
                job_title: job.job_title,
                company: job.company,
                first_seen_at: nowIso,
                last_seen_at: nowIso,
                is_new: true,
            }));

        if (newFeedRows.length > 0) {
            await supabase
                .from("user_job_feed_memory")
                .upsert(newFeedRows, { onConflict: "user_id,canonical_job_id", ignoreDuplicates: true });
        }

        if (existingIdSet.size > 0) {
            await supabase
                .from("user_job_feed_memory")
                .update({ last_seen_at: nowIso, is_new: false })
                .eq("user_id", profile.user_id)
                .in("canonical_job_id", Array.from(existingIdSet));
        }

        const jobsWithFeedMemory = feedCandidates.map((job) => ({
            ...job,
            is_new: !existingIdSet.has(job.canonical_job_id),
        }));

        if (careerId && jobsWithFeedMemory.length > 0) {
            const [{ data: persistedEvidencePieces, error: evidenceLoadError }, { data: persistedCapabilities, error: capabilityLoadError }] = await Promise.all([
                supabase
                    .from("evidence_pieces")
                    .select("id, raw_text")
                    .eq("career_id", careerId),
                supabase
                    .from("capabilities")
                    .select("id, name, normalized_name")
                    .eq("career_id", careerId),
            ]);

            if (evidenceLoadError || capabilityLoadError) {
                console.error("job-copilot memory load error:", { evidenceLoadError, capabilityLoadError });
                return NextResponse.json({ error: "Failed to load persisted career memory" }, { status: 500 });
            }

            const persistedEvidenceRawTexts = (persistedEvidencePieces ?? []).map((row) => row.raw_text).filter((t): t is string => Boolean(t));
            const persistedCapabilityNames = (persistedCapabilities ?? []).map((row) => row.name).filter((t): t is string => Boolean(t));

            for (const job of jobsWithFeedMemory) {
                const parsedJd = parseJobDescription(job.job_description);
                const canonicalId = canonicalJobId(job.job_url, job.job_title, job.company);

                const { data: upsertedJobRows, error: jobUpsertError } = await supabase
                    .from("jobs")
                    .upsert(
                        {
                            external_source: "job_copilot",
                            external_id: canonicalId,
                            title: job.job_title,
                            company: job.company,
                            location: job.location ?? null,
                            description: job.job_description,
                            job_url: job.job_url,
                        },
                        { onConflict: "external_source,external_id" }
                    )
                    .select("id")
                    .limit(1);

                if (jobUpsertError || !upsertedJobRows || upsertedJobRows.length === 0) {
                    console.error("job-copilot jobs upsert error:", { jobUpsertError, job: job.job_title });
                    continue;
                }
                const jobId = upsertedJobRows[0].id as string;
                const signalFields = deriveJobSignalFields(parsedJd, job.job_title);
                const signalValidation = validateJobSignalsQuality({
                    jobId,
                    canonicalJobId: canonicalId,
                    title: job.job_title,
                    parsedJd,
                    signalFields,
                });
                jobSignalValidations.push(signalValidation);

                if (signalValidation.weak) {
                    console.warn("job-copilot weak job_signals flagged; skipping save", signalValidation);
                } else {
                    const { error: signalUpsertError } = await supabase
                        .from("job_signals")
                        .upsert(
                            {
                                job_id: jobId,
                                target_title: signalFields.targetTitle,
                                role_family: signalFields.roleFamily,
                                seniority: parsedJd.seniority_level ?? null,
                                required_skills: signalFields.requiredSkills,
                                preferred_skills: signalFields.preferredSkills,
                                responsibilities: signalFields.responsibilities,
                                domains: signalFields.domains,
                                keywords: signalFields.keywords,
                            },
                            { onConflict: "job_id" }
                        );

                    if (signalUpsertError) {
                        console.error("job-copilot job_signals upsert error:", { signalUpsertError, jobId, signalValidation });
                        continue;
                    }
                }

                const memoryAvailable = persistedEvidenceRawTexts.length > 0;
                const memoryScored = scoreMatchFromCareerMemory(parsedJd, persistedEvidenceRawTexts, persistedCapabilityNames);
                const matchScore = memoryAvailable ? memoryScored.matchScore : job.match_score;
                const gapSummary = memoryAvailable
                    ? memoryScored.gapSummary
                    : {
                        source: "fallback_recommendation",
                        note: "No persisted evidence_pieces available for evidence-based scoring.",
                    };
                const matchedCapabilities = memoryAvailable
                    ? memoryScored.matchedCapabilities
                    : [];

                const { data: existingJobMatchRows } = await supabase
                    .from("job_matches")
                    .select("status")
                    .eq("career_id", careerId)
                    .eq("job_id", jobId)
                    .limit(1);
                const existingStatus = existingJobMatchRows?.[0]?.status ?? null;
                const preservedStatus = existingStatus === "skipped" || existingStatus === "applied"
                    ? existingStatus
                    : "new";

                const { error: jobMatchUpsertError } = await supabase
                    .from("job_matches")
                    .upsert(
                        {
                            career_id: careerId,
                            job_id: jobId,
                            match_score: matchScore,
                            gap_summary: gapSummary,
                            matched_capabilities: matchedCapabilities,
                            status: preservedStatus,
                        },
                        { onConflict: "career_id,job_id" }
                    );

                if (jobMatchUpsertError) {
                    console.error("job-copilot job_matches upsert error:", { jobMatchUpsertError, careerId, jobId });
                }
            }
        }

        const liveCount = jobsWithFeedMemory.filter((job) => job.source === "live").length;
        const mockCount = jobsWithFeedMemory.filter((job) => job.source === "mock").length;
        console.log("job-copilot API source summary:", {
            profileId,
            live: liveCount,
            mock: mockCount,
            mode: liveCount > 0 && mockCount > 0 ? "mixed" : (liveCount > 0 ? "live" : "mock"),
            total: jobsWithFeedMemory.length,
            newJobs: jobsWithFeedMemory.filter((job) => job.is_new).length,
            rolesSearched: recommendations.meta.roles_searched,
            jobsFetchedPerRole: recommendations.meta.jobs_fetched_per_role.map((row) => ({
                role: row.role,
                provider: row.provider,
                source: row.source,
                provider_status: row.provider_status,
                provider_response_status: row.provider_response_status,
                provider_jobs_returned: row.provider_jobs_returned,
                provider_attempts: row.provider_attempts,
                query_variants_tried: row.query_variants_tried,
                selected_query_variant: row.selected_query_variant,
                final_jobs_used: row.final_jobs_used,
                fallback_trigger_reason: row.fallback_trigger_reason,
            })),
        });

        return NextResponse.json({
            recommended_jobs: jobsWithFeedMemory,
            meta: {
                ...recommendations.meta,
                source_summary: {
                    live: liveCount,
                    mock: mockCount,
                    mode: liveCount > 0 && mockCount > 0 ? "mixed" : (liveCount > 0 ? "live" : "mock"),
                },
                job_signals_quality: {
                    total_jobs_evaluated: jobSignalValidations.length,
                    weak_jobs_count: jobSignalValidations.filter((entry) => entry.weak).length,
                    saved_jobs_count: jobSignalValidations.filter((entry) => !entry.weak).length,
                    ...(debugMode ? { diagnostics: jobSignalValidations } : {}),
                },
            },
        });
    } catch (error) {
        console.error("job-copilot error:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                ...(debugMode ? { debug: { message: error instanceof Error ? error.message : String(error) } } : {}),
            },
            { status: 500 }
        );
    }
}
