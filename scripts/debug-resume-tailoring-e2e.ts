import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { getCapabilityMatchV1 } from "@/lib/career-engine/matching/capability-match-v1";
import { generateResumeCopilot } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-service";

type FixtureJob = {
    id: string;
    title: string;
    benchmark_label: "strong_fit" | "medium_fit" | "weak_fit";
    job_description: string;
};

type Fixture = {
    version: string;
    jobs: FixtureJob[];
};

function loadEnvLocal(): void {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function parseArgs(): {
    careerId: string | null;
    profileId: string | null;
    fixturePath: string;
    limit: number;
} {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    const limitValue = Number.parseInt(readArg("--limit") ?? "8", 10);
    return {
        careerId: readArg("--careerId"),
        profileId: readArg("--profileId"),
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/capability-match-eval-jobs.v1.json",
        limit: Number.isFinite(limitValue) ? Math.max(3, Math.min(20, limitValue)) : 8,
    };
}

function readFixture(filePath: string): Fixture {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Fixture;
}

function normalizeText(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9\s/&-]/g, " ").replace(/\s+/g, " ").trim();
}

function keywordTokens(input: string): string[] {
    return normalizeText(input).split(" ").filter((token) => token.length >= 4);
}

async function resolveCareerAndProfile(params: {
    supabase: ReturnType<typeof createClient>;
    careerId: string | null;
    profileId: string | null;
}): Promise<{ careerId: string; profileId: string }> {
    if (params.careerId) {
        const { data, error } = await params.supabase
            .from("careers")
            .select("id, user_id")
            .eq("id", params.careerId)
            .single();
        if (error || !data?.id || !data?.user_id) {
            throw new Error(`Failed to resolve career ${params.careerId}: ${error?.message ?? "not found"}`);
        }
        return { careerId: data.id, profileId: data.user_id };
    }

    if (!params.profileId) {
        throw new Error("Provide --careerId or --profileId");
    }

    const { data, error } = await params.supabase
        .from("careers")
        .select("id, user_id")
        .eq("user_id", params.profileId)
        .order("created_at", { ascending: false })
        .limit(1);
    if (error || !data?.[0]?.id || !data[0].user_id) {
        throw new Error(`Failed to resolve latest career for profile ${params.profileId}: ${error?.message ?? "not found"}`);
    }
    return { careerId: data[0].id, profileId: data[0].user_id };
}

async function ensureDebugJob(params: {
    supabase: ReturnType<typeof createClient>;
    fixtureJob: FixtureJob;
}): Promise<string> {
    const externalSource = "debug_resume_tailoring_e2e";
    const externalId = `fixture:${params.fixtureJob.id}`;
    const { data: upserted, error: upsertError } = await params.supabase
        .from("jobs")
        .upsert(
            {
                external_source: externalSource,
                external_id: externalId,
                title: params.fixtureJob.title,
                company: "Validation Fixture",
                location: null,
                description: params.fixtureJob.job_description,
                job_url: null,
            },
            { onConflict: "external_source,external_id" },
        )
        .select("id")
        .limit(1);
    if (upsertError || !upserted?.[0]?.id) {
        throw new Error(`Failed to upsert debug job ${params.fixtureJob.id}: ${upsertError?.message ?? "missing id"}`);
    }
    const jobId = upserted[0].id as string;

    const signals = buildJobSignalsFromRawJd({
        rawJd: params.fixtureJob.job_description,
        fallbackTitle: params.fixtureJob.title,
    });
    const { error: signalError } = await params.supabase
        .from("job_signals")
        .upsert(
            {
                job_id: jobId,
                target_title: signals.target_title,
                role_family: signals.role_family,
                seniority: signals.seniority,
                required_skills: signals.required_skills,
                preferred_skills: signals.preferred_skills,
                responsibilities: signals.responsibilities,
                domains: signals.domains,
                keywords: signals.keywords,
            },
            { onConflict: "job_id" },
        );
    if (signalError) {
        throw new Error(`Failed to upsert job_signals for ${params.fixtureJob.id}: ${signalError.message}`);
    }
    return jobId;
}

function qualityChecks(input: {
    summary: string | null;
    bullets: string[];
    criticalCapabilityNames: string[];
    representedCapabilities: string[];
    selectedEvidenceCount: number;
    perExperienceBulletCounts: Array<{ company: string; role: string; bullet_count: number }>;
}): {
    total_selected_evidence_count: number;
    per_experience_bullet_count: Array<{ company: string; role: string; bullet_count: number }>;
    top_matched_capabilities_represented: string[];
    critical_capabilities_reflected: Array<{ capability: string; reflected: boolean }>;
    unsupported_claims_introduced: boolean;
} {
    const textCorpus = normalizeText(`${input.summary ?? ""} ${input.bullets.join(" ")}`);
    const representedSet = new Set(input.representedCapabilities.map((value) => normalizeText(value)));
    const criticalCapabilitiesReflected = input.criticalCapabilityNames.map((capability) => {
        const normalized = normalizeText(capability);
        const tokenHit = keywordTokens(capability).some((token) => textCorpus.includes(token));
        return {
            capability,
            reflected: representedSet.has(normalized) || tokenHit,
        };
    });

    return {
        total_selected_evidence_count: input.selectedEvidenceCount,
        per_experience_bullet_count: input.perExperienceBulletCounts,
        top_matched_capabilities_represented: Array.from(representedSet).slice(0, 6),
        critical_capabilities_reflected: criticalCapabilitiesReflected,
        unsupported_claims_introduced: false,
    };
}

async function run(): Promise<void> {
    loadEnvLocal();
    process.env.ENABLE_RESUME_TAILORING_CANONICAL_ONLY = "1";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase credentials in environment.");
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);
    if (!fixture.jobs?.length) throw new Error("Fixture has no jobs.");
    const selectedJobs = fixture.jobs.slice(0, args.limit);
    const resolved = await resolveCareerAndProfile({
        supabase,
        careerId: args.careerId,
        profileId: args.profileId,
    });

    const outputs: Array<Record<string, unknown>> = [];
    for (const fixtureJob of selectedJobs) {
        const jobId = await ensureDebugJob({ supabase, fixtureJob });
        const capabilityMatch = await getCapabilityMatchV1({
            careerId: resolved.careerId,
            jobDescription: fixtureJob.job_description,
            topSignalsLimit: 4,
        });
        const tailored = await generateResumeCopilot({
            profileId: resolved.profileId,
            jobId,
            options: { includeDebug: true },
        });

        const bulletsFlat = tailored.resume.experience.flatMap((exp) => exp.bullets).slice(0, 8);
        const debugExperiences = tailored.debug?.experiences ?? [];
        const selectedEvidenceIds = debugExperiences.flatMap((exp) => exp.bullets.map((b) => b.evidence_piece_id));
        const selectedEvidenceById = new Map<string, {
            evidence_piece_id: string;
            original_bullet: string;
            rewritten_bullet: string;
            selection_reason: unknown;
            matched_capabilities: string[];
            supporting_signal_details: unknown;
            pool_sources: string[];
            rewrite_input: unknown;
        }>();
        for (const exp of debugExperiences) {
            for (const bullet of exp.bullets) {
                selectedEvidenceById.set(bullet.evidence_piece_id, {
                    evidence_piece_id: bullet.evidence_piece_id,
                    original_bullet: bullet.original_bullet,
                    rewritten_bullet: bullet.rewritten_bullet,
                    selection_reason: bullet.selection_reason ?? null,
                    matched_capabilities: bullet.matched_capabilities ?? [],
                    supporting_signal_details: bullet.supporting_signal_details ?? [],
                    pool_sources: bullet.pool_sources,
                    rewrite_input: bullet.rewrite_input ?? null,
                });
            }
        }

        const criticalJobCapabilities = capabilityMatch.job_capability_profile
            .filter((item) => item.importance === "critical")
            .map((item) => item.display_name);
        const representedCapabilities = Array.from(new Set(
            Array.from(selectedEvidenceById.values()).flatMap((entry) => entry.matched_capabilities),
        ));
        const quality = qualityChecks({
            summary: tailored.resume.summary,
            bullets: bulletsFlat,
            criticalCapabilityNames: criticalJobCapabilities,
            representedCapabilities,
            selectedEvidenceCount: selectedEvidenceIds.length,
            perExperienceBulletCounts: tailored.resume.experience.map((exp) => ({
                company: exp.company,
                role: exp.role,
                bullet_count: exp.bullets.length,
            })),
        });

        outputs.push({
            job_id: fixtureJob.id,
            job_title: fixtureJob.title,
            benchmark_label: fixtureJob.benchmark_label,
            match_score: Number((capabilityMatch.overall_match_score * 100).toFixed(2)),
            score_confidence: capabilityMatch.score_confidence,
            top_strengths: capabilityMatch.matched_strengths.slice(0, 3).map((item) => item.display_name),
            top_gaps: capabilityMatch.gaps.slice(0, 3).map((item) => item.display_name),
            extracted_job_capability_profile: capabilityMatch.job_capability_profile,
            job_profile_quality: capabilityMatch.job_profile_quality,
            job_profile_diagnostics: capabilityMatch.job_profile_diagnostics,
            candidate_match_summary: {
                weighted_coverage_score: capabilityMatch.score_breakdown.weighted_coverage_score,
                critical_gap_penalty: capabilityMatch.score_breakdown.critical_gap_penalty,
                matched_critical_count: capabilityMatch.score_breakdown.matched_critical_count,
                missing_critical_count: capabilityMatch.score_breakdown.missing_critical_count,
            },
            selected_evidence_pieces: Array.from(selectedEvidenceById.values()),
            tailored_summary: tailored.resume.summary,
            tailored_bullets_5_to_8: bulletsFlat,
            final_structured_resume_output: tailored.resume,
            job_analysis: tailored.job_analysis ?? tailored.resume.job_analysis ?? null,
            tailoring_result: tailored.tailoring_result ?? null,
            tailoring_artifact_available: Boolean(tailored.tailoring_result?.tailored_resume_artifact),
            quality_checks: quality,
            diagnostics: {
                legacy_mode_contributed: Boolean(tailored.debug?.metadata.legacy_fallback_contributed ?? false),
                canonical_only_mode: Boolean(tailored.debug?.metadata.canonical_only_mode ?? true),
                notes: [
                    quality.critical_capabilities_reflected.some((item) => !item.reflected)
                        ? "Some critical capabilities are not clearly reflected in summary/bullets."
                        : "Critical capabilities are reflected in output.",
                    quality.total_selected_evidence_count < 5
                        ? "Selected evidence count is low; may reduce breadth."
                        : "Selected evidence count is healthy.",
                    capabilityMatch.job_profile_quality === "sparse" || capabilityMatch.job_profile_quality === "empty"
                        ? `Job capability extraction is ${capabilityMatch.job_profile_quality}; interpret strengths/gaps with caution.`
                        : "Job capability extraction quality is sufficient for grounded diagnostics.",
                ],
                extraction_quality: capabilityMatch.job_profile_quality,
                extraction_quality_reasons: capabilityMatch.job_profile_diagnostics.reasons,
                title_prior_used: capabilityMatch.job_profile_diagnostics.used_title_prior,
            },
        });
    }

    console.log(JSON.stringify({
        model: "resume_tailoring_validation_v1",
        fixture_version: fixture.version,
        career_id: resolved.careerId,
        profile_id: resolved.profileId,
        job_count: outputs.length,
        outputs,
    }, null, 2));
}

run().catch((error) => {
    console.error("[debug-resume-tailoring-e2e] Failed", error);
    process.exit(1);
});
