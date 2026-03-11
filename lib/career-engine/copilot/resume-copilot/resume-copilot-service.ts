import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { getRoleFit } from "@/lib/career-engine/matching/role-fit-service";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";
import { getCareerSignals } from "@/lib/career-engine/strategy/career-signals-service";
import { selectCoverageAwareBullets } from "./resume-bullet-selector";
import { buildResumeEvidencePool } from "./resume-evidence-pool";
import { rankResumeEvidence } from "./resume-evidence-ranker";
import { buildResumeCopilotOutput } from "./resume-output-builder";
import { buildGroundedResumeSummary } from "./resume-summary-builder";
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

    const [careerGraph, jobSignals] = await Promise.all([
        loadCareerGraph(profileId),
        loadJobSignals(jobId),
    ]);

    if (!careerGraph.career) {
        return {
            resume: {
                summary: null,
                experience: [],
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
                    job_signals: jobSignals,
                    experiences: [],
                },
            } : {}),
        };
    }

    const targetRole = jobSignals.target_title?.trim() || jobSignals.role_family?.trim() || null;
    const roleFit = targetRole ? getRoleFit(careerGraph, targetRole) : null;
    const careerSignals = getCareerSignals(careerGraph, targetRole ? [targetRole] : undefined);
    const evidencePool = buildResumeEvidencePool({
        intelligence: {
            careerGraph,
            careerSignals,
            roleFit,
        },
        topCapabilitiesLimit: 5,
    });

    const rankedEvidence = rankResumeEvidence({
        intelligence: {
            careerGraph,
            careerSignals,
            roleFit,
        },
        evidencePool: evidencePool.entries,
        jobSignals,
    });

    const selectedEvidence = selectCoverageAwareBullets({
        rankedEvidence,
        jobSignals,
        maxBulletsPerExperience,
        minBulletsPerExperience,
    });

    const summary = buildGroundedResumeSummary({
        selectedEvidence,
        jobSignals,
    });

    const emptyReason = (() => {
        if (careerGraph.evidencePieces.length === 0) return "no_evidence_loaded";
        if (evidencePool.entries.length === 0) return "empty_evidence_pool";
        if (rankedEvidence.length === 0) return "zero_ranked_evidence";
        if (selectedEvidence.length === 0) return "selector_filtered_all";
        return null;
    })();

    const output = buildResumeCopilotOutput({
        profileId,
        careerId: careerGraph.career.id,
        jobSignals,
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
        includeDebug,
    });

    console.log("resume-copilot service completed", {
        profileId,
        careerId: careerGraph.career.id,
        jobId,
        targetRole,
        roleFitScore: roleFit?.fitScore ?? null,
        evidenceLoaded: careerGraph.evidencePieces.length,
        evidenceInPool: evidencePool.entries.length,
        evidenceRanked: rankedEvidence.length,
        evidenceSelected: selectedEvidence.length,
        experiencesSelected: output.resume.experience.length,
        evidencePoolFallbackUsed: evidencePool.fallbackUsed,
        emptyReason,
        jobSignalsStats: {
            target_title: jobSignals.target_title,
            role_family: jobSignals.role_family,
            required_skills: jobSignals.required_skills.length,
            preferred_skills: jobSignals.preferred_skills.length,
            responsibilities: jobSignals.responsibilities.length,
            keywords: jobSignals.keywords.length,
            domains: jobSignals.domains.length,
        },
    });

    return output;
}
