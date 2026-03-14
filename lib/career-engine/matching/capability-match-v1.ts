import { getCapabilityStrengthProfile, type CapabilityStrengthProfileItem } from "@/lib/career-engine/capability/capability-strength";
import {
    extractJobCapabilityProfileV1,
    type ExtractedJobCapability,
    type JobCapabilityImportance,
    type JobCapabilityProfileQuality,
    type JobCapabilitySourceTier,
} from "@/lib/career-engine/matching/job-capability-extractor";

export type CapabilityMatchStatus = "strong" | "partial" | "weak" | "missing";

export type CapabilityMatchItem = {
    canonical_name: string;
    display_name: string;
    importance: JobCapabilityImportance;
    source_tier: JobCapabilitySourceTier;
    job_confidence: number;
    candidate_strength_score: number;
    match_status: CapabilityMatchStatus;
    match_score_contribution: number;
    job_evidence: string[];
    top_supporting_signals: CapabilityStrengthProfileItem["top_supporting_signals"];
};

export type CapabilityMatchResult = {
    model: "job_capability_match_v1";
    career_id: string;
    overall_match_score: number;
    score_confidence: "high" | "medium" | "low";
    job_profile_quality: JobCapabilityProfileQuality;
    job_profile_diagnostics: {
        reasons: string[];
        total_capability_count: number;
        body_derived_count: number;
        title_prior_count: number;
        structured_count: number;
        lexical_fallback_count: number;
        supporting_evidence_units: number;
        used_title_prior: boolean;
    };
    score_breakdown: {
        weighted_coverage_score: number;
        critical_gap_penalty: number;
        matched_critical_count: number;
        missing_critical_count: number;
        total_job_capability_count: number;
    };
    candidate_capability_profile: CapabilityStrengthProfileItem[];
    job_capability_profile: ExtractedJobCapability[];
    matched_strengths: CapabilityMatchItem[];
    partial_matches: CapabilityMatchItem[];
    gaps: CapabilityMatchItem[];
};

export type CandidateCapabilityForMatch = Pick<
    CapabilityStrengthProfileItem,
    "capability_id" | "canonical_name" | "display_name" | "strength_score" | "weighted_signal_score" | "signal_count" | "top_supporting_signals"
>;

const IMPORTANCE_WEIGHT: Record<JobCapabilityImportance, number> = {
    critical: 1.0,
    important: 0.65,
    supporting: 0.35,
};

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function strengthToMatchFactor(strength: number): number {
    if (strength >= 0.75) return 1.0;
    if (strength >= 0.55) return 0.8;
    if (strength >= 0.35) return 0.55;
    if (strength >= 0.2) return 0.3;
    return 0;
}

function matchStatus(strength: number): CapabilityMatchStatus {
    if (strength >= 0.75) return "strong";
    if (strength >= 0.35) return "partial";
    if (strength >= 0.2) return "weak";
    return "missing";
}

function calculateCriticalGapPenalty(missingCriticalCount: number, totalCriticalCount: number): number {
    if (totalCriticalCount === 0) return 0;
    const missingRatio = missingCriticalCount / totalCriticalCount;
    // Max 22-point penalty when all critical capabilities are truly missing.
    return 0.22 * missingRatio;
}

function classifyScoreConfidence(input: {
    quality: JobCapabilityProfileQuality;
    totalJobCapabilities: number;
    supportingEvidenceUnits: number;
}): "high" | "medium" | "low" {
    if (input.quality === "empty" || input.quality === "sparse") return "low";
    if (input.quality === "usable") return input.totalJobCapabilities >= 4 && input.supportingEvidenceUnits >= 2 ? "medium" : "low";
    return input.totalJobCapabilities >= 5 && input.supportingEvidenceUnits >= 3 ? "high" : "medium";
}

export async function getCapabilityMatchV1(input: {
    careerId: string;
    jobDescription: string;
    topSignalsLimit?: number;
}): Promise<CapabilityMatchResult> {
    const careerId = input.careerId.trim();
    if (!careerId) throw new Error("careerId is required");
    if (!input.jobDescription || input.jobDescription.trim().length < 40) {
        throw new Error("jobDescription must be at least 40 characters");
    }

    const candidateProfile = await getCapabilityStrengthProfile(careerId, {
        topSignalsLimit: input.topSignalsLimit ?? 3,
    });
    return getCapabilityMatchV1FromProfile({
        careerId,
        candidateProfile,
        jobDescription: input.jobDescription,
    });
}

export function getCapabilityMatchV1FromProfile(input: {
    careerId: string;
    candidateProfile: CandidateCapabilityForMatch[];
    jobDescription: string;
}): CapabilityMatchResult {
    const careerId = input.careerId.trim();
    if (!careerId) throw new Error("careerId is required");
    if (!input.jobDescription || input.jobDescription.trim().length < 40) {
        throw new Error("jobDescription must be at least 40 characters");
    }

    const candidateProfile = input.candidateProfile;
    const extraction = extractJobCapabilityProfileV1({
        jobDescription: input.jobDescription,
    });
    const jobProfile = extraction.capabilities;

    const candidateByCanonical = new Map(
        candidateProfile.map((item) => [item.canonical_name.toLowerCase(), item]),
    );

    const evaluations: CapabilityMatchItem[] = jobProfile.map((jobCapability) => {
        const candidate = candidateByCanonical.get(jobCapability.canonical_name.toLowerCase());
        const strength = clamp(candidate?.strength_score ?? 0);
        const factor = strengthToMatchFactor(strength);
        const weighted = factor * IMPORTANCE_WEIGHT[jobCapability.importance];

        return {
            canonical_name: jobCapability.canonical_name,
            display_name: jobCapability.display_name,
            importance: jobCapability.importance,
            source_tier: jobCapability.source_tier,
            job_confidence: jobCapability.confidence,
            candidate_strength_score: round(strength, 4),
            match_status: matchStatus(strength),
            match_score_contribution: round(weighted, 4),
            job_evidence: jobCapability.evidence,
            top_supporting_signals: candidate?.top_supporting_signals ?? [],
        };
    });

    const totalWeight = evaluations.reduce((sum, item) => sum + IMPORTANCE_WEIGHT[item.importance], 0);
    const coveredWeight = evaluations.reduce((sum, item) => sum + item.match_score_contribution, 0);
    const weightedCoverageScore = totalWeight > 0 ? clamp(coveredWeight / totalWeight) : 0;

    const criticalItems = evaluations.filter((item) => item.importance === "critical");
    const matchedCriticalCount = criticalItems.filter((item) => item.match_status === "strong" || item.match_status === "partial").length;
    // Only penalize critical capabilities when support is truly missing (< 0.20).
    // Weak critical support (0.20-0.35) is tracked as a gap but does not incur penalty.
    const missingCriticalCount = criticalItems.filter((item) => item.candidate_strength_score < 0.2).length;
    const penalty = calculateCriticalGapPenalty(missingCriticalCount, criticalItems.length);

    const overall = clamp(weightedCoverageScore * (1 - penalty));

    const matchedStrengths = evaluations.filter((item) => item.match_status === "strong");
    const partialMatches = evaluations.filter((item) => item.match_status === "partial" || item.match_status === "weak");
    const gaps = evaluations.filter((item) => item.match_status === "missing" || item.match_status === "weak");
    const scoreConfidence = classifyScoreConfidence({
        quality: extraction.quality,
        totalJobCapabilities: evaluations.length,
        supportingEvidenceUnits: extraction.diagnostics.supporting_evidence_units,
    });

    return {
        model: "job_capability_match_v1",
        career_id: careerId,
        overall_match_score: round(overall, 4),
        score_confidence: scoreConfidence,
        job_profile_quality: extraction.quality,
        job_profile_diagnostics: extraction.diagnostics,
        score_breakdown: {
            weighted_coverage_score: round(weightedCoverageScore, 4),
            critical_gap_penalty: round(penalty, 4),
            matched_critical_count: matchedCriticalCount,
            missing_critical_count: missingCriticalCount,
            total_job_capability_count: evaluations.length,
        },
        candidate_capability_profile: candidateProfile,
        job_capability_profile: jobProfile,
        matched_strengths: matchedStrengths,
        partial_matches: partialMatches,
        gaps,
    };
}
