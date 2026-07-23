import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { getRoleFit } from "@/lib/career-engine/matching/role-fit-service";
import { getCapabilityMatchV1 } from "@/lib/career-engine/matching/capability-match-v1";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";
import { getCareerSignals } from "@/lib/career-engine/strategy/career-signals-service";
import { selectCoverageAwareBullets } from "./resume-bullet-selector";
import { buildResumeEvidencePool } from "./resume-evidence-pool";
import { rankResumeEvidence } from "./resume-evidence-ranker";
import { buildResumeCopilotOutput } from "./resume-output-builder";
import { buildGroundedResumeSummary } from "./resume-summary-builder";
import { buildJobCopilotAnalysis } from "@/lib/career-engine/job-copilot/job-copilot-ui-adapter";
import type {
    ResumeCopilotJobSignals,
    ResumeCopilotServiceInput,
    ResumeCopilotServiceResult,
} from "./resume-copilot-types";

type JobSignalsRow = {
    job_id: string;
    target_title: string | null;
    role_family: string | null;
    required_skills: unknown;
    preferred_skills: unknown;
    responsibilities: unknown;
    domains: unknown;
    keywords: unknown;
};

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function mapJobSignals(row: JobSignalsRow): ResumeCopilotJobSignals {
    return {
        job_id: row.job_id,
        target_title: row.target_title,
        role_family: row.role_family,
        required_skills: toStringArray(row.required_skills),
        preferred_skills: toStringArray(row.preferred_skills),
        responsibilities: toStringArray(row.responsibilities),
        domains: toStringArray(row.domains),
        keywords: toStringArray(row.keywords),
    };
}

async function loadJobSignals(jobId: string): Promise<ResumeCopilotJobSignals> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("job_signals")
        .select("job_id, target_title, role_family, required_skills, preferred_skills, responsibilities, domains, keywords")
        .eq("job_id", jobId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            throw new Error(`No job_signals found for jobId=${jobId}`);
        }
        throw new Error(`Failed to load job_signals for jobId=${jobId}: ${error.message}`);
    }
    if (!data) {
        throw new Error(`No job_signals found for jobId=${jobId}`);
    }

    return mapJobSignals(data as JobSignalsRow);
}

function envEnabled(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
}

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function mergeCalibrationIntoJobSignals(params: {
    jobSignals: ResumeCopilotJobSignals;
    confirmedStrengthAreas: string[];
    positioningHints: string[];
}): ResumeCopilotJobSignals {
    if (params.confirmedStrengthAreas.length === 0 && params.positioningHints.length === 0) {
        return params.jobSignals;
    }
    return {
        ...params.jobSignals,
        required_skills: dedupe([
            ...params.jobSignals.required_skills,
            ...params.confirmedStrengthAreas,
        ]),
        keywords: dedupe([
            ...params.jobSignals.keywords,
            ...params.confirmedStrengthAreas,
            ...params.positioningHints,
        ]),
    };
}

function buildFallbackJobDescription(jobSignals: ResumeCopilotJobSignals): string {
    const lines = [
        jobSignals.target_title ?? "",
        jobSignals.role_family ?? "",
        ...jobSignals.required_skills.map((value) => `Required: ${value}`),
        ...jobSignals.preferred_skills.map((value) => `Preferred: ${value}`),
        ...jobSignals.responsibilities.map((value) => `Responsibility: ${value}`),
        ...jobSignals.domains.map((value) => `Domain: ${value}`),
        ...jobSignals.keywords.map((value) => `Keyword: ${value}`),
    ]
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return lines.join(". ");
}

export async function generateResumeCopilot(params: ResumeCopilotServiceInput): Promise<ResumeCopilotServiceResult> {
    const profileId = params.profileId?.trim();
    const jobId = params.jobId?.trim();
    if (!profileId) throw new Error("profileId is required");
    if (!jobId) throw new Error("jobId is required");

    const maxBulletsPerExperience = Math.min(3, Math.max(2, params.options?.maxBulletsPerExperience ?? 3));
    const minBulletsPerExperience = Math.min(
        maxBulletsPerExperience,
        Math.max(1, params.options?.minBulletsPerExperience ?? 2),
    );
    const includeDebug = Boolean(params.options?.includeDebug);
    const calibrationContext = params.options?.calibrationContext;
    const canonicalOnlyMode = envEnabled(process.env.ENABLE_RESUME_TAILORING_CANONICAL_ONLY, true);
    const legacyFallbackEnabled = !canonicalOnlyMode;

    const [careerGraph, jobSignals, jobRow] = await Promise.all([
        loadCareerGraph(profileId),
        loadJobSignals(jobId),
        createServerSupabaseClient()
            .from("jobs")
            .select("description")
            .eq("id", jobId)
            .single(),
    ]);

    if (jobRow.error && jobRow.error.code !== "PGRST116") {
        throw new Error(`Failed to load job description for jobId=${jobId}: ${jobRow.error.message}`);
    }

    const effectiveJobSignals = mergeCalibrationIntoJobSignals({
        jobSignals,
        confirmedStrengthAreas: calibrationContext?.confirmed_strength_areas ?? [],
        positioningHints: calibrationContext?.positioning_hints ?? [],
    });

    if (!careerGraph.career) {
        const jobAnalysis = buildJobCopilotAnalysis({
            matchScore: 0,
            scoreConfidence: "low",
            jobProfileQuality: "empty",
            weakJobSignals: true,
            matchedCapabilities: [],
            keyGaps: [],
            evidenceHighlights: [],
            jdTitle: effectiveJobSignals.target_title,
            jdRoleFamily: effectiveJobSignals.role_family,
            candidateTitles: [],
        });
        return {
            resume: {
                summary: null,
                experience: [],
                job_analysis: jobAnalysis,
            },
            job_analysis: jobAnalysis,
            tailoring_result: {
                job_analysis: jobAnalysis,
            },
            ...(includeDebug ? {
                debug: {
                    metadata: {
                        profile_id: profileId,
                        career_id: null,
                        job_id: jobId,
                        total_evidence_loaded: 0,
                        total_evidence_in_pool: 0,
                        total_evidence_ranked: 0,
                        total_evidence_selected: 0,
                        selected_experience_count: 0,
                        empty_reason: "no_career_memory",
                        evidence_pool_fallback_used: false,
                        pool_source_counts: {},
                        matched_capabilities_in_summary: [],
                        dropped_for_length: 0,
                        dropped_for_validation: 0,
                        dropped_for_duplicate: 0,
                    },
                    job_signals: effectiveJobSignals,
                    experiences: [],
                },
            } : {}),
        };
    }

    const targetRole = effectiveJobSignals.target_title?.trim() || effectiveJobSignals.role_family?.trim() || null;
    const jobDescription = typeof jobRow.data?.description === "string" && jobRow.data.description.trim().length >= 40
        ? jobRow.data.description.trim()
        : buildFallbackJobDescription(effectiveJobSignals);
    const capabilityMatch = jobDescription.length >= 40
        ? await getCapabilityMatchV1({
            careerId: careerGraph.career.id,
            jobDescription,
            topSignalsLimit: 4,
        })
        : null;

    // Legacy compatibility path is explicit and disabled in canonical-only mode.
    const roleFit = legacyFallbackEnabled && targetRole ? getRoleFit(careerGraph, targetRole) : null;
    const careerSignals = legacyFallbackEnabled
        ? getCareerSignals(careerGraph, targetRole ? [targetRole] : undefined)
        : null;
    const evidencePool = buildResumeEvidencePool({
        intelligence: {
            careerGraph,
            capabilityMatch,
            careerSignals,
            roleFit,
        },
        topCapabilitiesLimit: 5,
        includeLegacyFallback: legacyFallbackEnabled,
    });

    const rankedEvidence = rankResumeEvidence({
        intelligence: {
            careerGraph,
            capabilityMatch,
            careerSignals,
            roleFit,
        },
        evidencePool: evidencePool.entries,
        jobSignals: effectiveJobSignals,
        useLegacyScoring: legacyFallbackEnabled,
    });

    const selectedEvidence = selectCoverageAwareBullets({
        rankedEvidence,
        jobSignals: effectiveJobSignals,
        maxBulletsPerExperience,
        minBulletsPerExperience,
    });

    const summary = buildGroundedResumeSummary({
        selectedEvidence,
        jobSignals: effectiveJobSignals,
        capabilityMatch,
    });

    const emptyReason = (() => {
        if (careerGraph.evidencePieces.length === 0) return "no_evidence_loaded";
        if (evidencePool.entries.length === 0) return "empty_evidence_pool";
        if (rankedEvidence.length === 0) return "zero_ranked_evidence";
        if (selectedEvidence.length === 0) return "selector_filtered_all";
        return null;
    })();

    const jobAnalysis = buildJobCopilotAnalysis({
        matchScore: capabilityMatch ? Number((capabilityMatch.overall_match_score * 100).toFixed(2)) : 0,
        scoreConfidence: capabilityMatch?.score_confidence ?? "low",
        jobProfileQuality: capabilityMatch?.job_profile_quality ?? "empty",
        weakJobSignals: (capabilityMatch?.job_profile_quality === "sparse")
            || (capabilityMatch?.job_profile_quality === "empty")
            || Boolean(emptyReason),
        matchedCapabilities: capabilityMatch
            ? capabilityMatch.matched_strengths.map((item) => item.display_name)
            : summary.matchedCapabilities,
        keyGaps: capabilityMatch
            ? capabilityMatch.gaps
                .filter((item) => item.importance === "critical" || item.importance === "important")
                .map((item) => item.display_name)
            : [],
        evidenceHighlights: selectedEvidence.slice(0, 4).map((entry) => ({
            evidencePieceId: entry.evidence.id,
            label: entry.matchedSignals[0] ?? entry.evidence.raw_text,
            score: entry.score.total_score,
        })),
        jdTitle: effectiveJobSignals.target_title,
        jdRoleFamily: effectiveJobSignals.role_family,
        candidateTitles: careerGraph.experiences.map((experience) => experience.title),
    });

    const output = buildResumeCopilotOutput({
        profileId,
        careerId: careerGraph.career.id,
        jobSignals: effectiveJobSignals,
        selectedEvidence,
        summary: summary.summary,
        matchedCapabilitiesInSummary: summary.matchedCapabilities,
        summaryDebug: summary.summary_debug,
        totalEvidenceLoaded: careerGraph.evidencePieces.length,
        totalEvidenceInPool: evidencePool.entries.length,
        totalEvidenceRanked: rankedEvidence.length,
        emptyReason,
        evidencePoolFallbackUsed: evidencePool.fallbackUsed,
        poolSourceCounts: evidencePool.poolSourceCounts,
        intelligenceContext: {
            careerGraph,
            capabilityMatch,
            careerSignals,
            roleFit,
        },
        canonicalOnlyMode,
        legacyFallbackEnabled,
        includeDebug,
        jobAnalysis,
    });

    console.log("resume-copilot service completed", {
        profileId,
        careerId: careerGraph.career.id,
        jobId,
        targetRole,
        capabilityMatchScore: capabilityMatch ? Number((capabilityMatch.overall_match_score * 100).toFixed(2)) : null,
        roleFitScore: roleFit?.fitScore ?? null,
        canonicalOnlyMode,
        legacyFallbackEnabled,
        evidenceLoaded: careerGraph.evidencePieces.length,
        evidenceInPool: evidencePool.entries.length,
        evidenceRanked: rankedEvidence.length,
        evidenceSelected: selectedEvidence.length,
        experiencesSelected: output.resume.experience.length,
        evidencePoolFallbackUsed: evidencePool.fallbackUsed,
        emptyReason,
        jobSignalsStats: {
            target_title: effectiveJobSignals.target_title,
            role_family: effectiveJobSignals.role_family,
            required_skills: effectiveJobSignals.required_skills.length,
            preferred_skills: effectiveJobSignals.preferred_skills.length,
            responsibilities: effectiveJobSignals.responsibilities.length,
            keywords: effectiveJobSignals.keywords.length,
            domains: effectiveJobSignals.domains.length,
        },
    });

    const typedResume: ResumeCopilotServiceResult["resume"] = {
        ...output.resume,
        job_analysis: jobAnalysis,
    };

    return {
        ...output,
        resume: typedResume,
        job_analysis: jobAnalysis,
        tailoring_result: {
            job_analysis: jobAnalysis,
            ...(jobAnalysis.tailoring_decision.allowed ? {
                tailored_resume_artifact: {
                    format: "text/plain",
                    download_url: "/api/job-copilot/extension/download-resume",
                },
            } : {}),
        },
    };
}
