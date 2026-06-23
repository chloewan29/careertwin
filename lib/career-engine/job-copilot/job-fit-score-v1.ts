import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import type { CapabilityMatchStatus } from "@/lib/career-engine/matching/capability-match-v1";
import type { DomainOntologySpecializationAudit } from "@/lib/career-engine/job-copilot/domain-ontology-audit";
import { getSpecializationSignalConfig } from "@/lib/career-engine/job-copilot/domain-ontology-config";

export type JobFitScoreBucket =
    | "Strong Match"
    | "Good Match"
    | "Partial Match"
    | "Weak Match";

export type JobFitScoreStrongMatchLayer =
    | "none"
    | "pre_strong"
    | "user_confirmation_boost"
    | "auto_strong";

export type JobFitScoreStrongMatchSignal = {
    layer: JobFitScoreStrongMatchLayer;
    score_boost: number;
    base_total_score: number;
    base_bucket: JobFitScoreBucket;
    ui_signal: string | null;
    explanation: string | null;
    conditions: {
        specialization_strong_band: boolean;
        capability_threshold_met: boolean;
        evidence_threshold_met: boolean;
        fallback_used: boolean;
        requirement_overlap_met: boolean;
        matched_signal_count_met: boolean;
        specialization_relevant_confirmation: boolean;
        effective_capability_score?: number;
        effective_evidence_score?: number;
        effective_requirement_overlap_count?: number;
        effective_matched_signal_count?: number;
        confirmation_bridge_applied?: boolean;
        confirmation_resolved_cluster_count?: number;
        confirmation_resolved_critical_count?: number;
        confirmation_driven_prestrong_eligible?: boolean;
    };
};

export type JobFitScore = {
    total_score: number;
    bucket: JobFitScoreBucket;
    breakdown: {
        specialization_fit: number;
        capability_match: number;
        evidence_strength: number;
    };
    strong_match?: JobFitScoreStrongMatchSignal;
};

export type JobFitScoreDebug = {
    specialization_fit_inputs: {
        top_specialization: string | null;
        canonical_signals_used: string[];
        matched_signal_count: number;
        relevant_requirement_count: number;
        weighted_support_ratio: number;
        calibrated_band: "weak" | "moderate" | "strong";
        strong_band_guardrails: {
            eligible: boolean;
            capability_score: number;
            capability_floor: number;
            evidence_score: number;
            evidence_floor: number;
            required_signal_count: number;
            required_requirement_overlap: number;
            failed_reasons: string[];
        };
        fallback_used: boolean;
        fallback_reason: string | null;
    };
    capability_match_inputs: {
        total_requirements: number;
        status_counts: {
            strong: number;
            partial: number;
            weak: number;
            missing: number;
        };
        weighted_support_ratio: number;
    };
    evidence_strength_inputs: {
        contributing_requirements: number;
        weighted_ownership_score: number;
        weighted_evidence_score: number;
        weighted_quality_ratio: number;
    };
    final_bucket_decision: {
        total_score: number;
        bucket: JobFitScoreBucket;
        thresholds: {
            strong_match_min: number;
            good_match_min: number;
            partial_match_min: number;
        };
    };
};

export type JobFitScoreResult = {
    score: JobFitScore;
    debug: JobFitScoreDebug;
};

const IMPORTANCE_WEIGHT: Record<"critical" | "important" | "supporting", number> = {
    critical: 1,
    important: 0.7,
    supporting: 0.4,
};

const CAPABILITY_STATUS_FACTOR: Record<CapabilityMatchStatus, number> = {
    strong: 1,
    partial: 0.55,
    weak: 0.25,
    missing: 0,
};

const EVIDENCE_STATUS_FACTOR: Record<CapabilityMatchStatus, number> = {
    strong: 1,
    partial: 0.85,
    weak: 0.7,
    missing: 0,
};

const STRONG_SPECIALIZATION_MIN_SIGNALS = 3;
const STRONG_SPECIALIZATION_MIN_OVERLAP_REQUIREMENTS = 2;
const STRONG_SPECIALIZATION_MIN_RATIO = 0.52;
const STRONG_SPECIALIZATION_CAPABILITY_FLOOR = 21;
const STRONG_SPECIALIZATION_EVIDENCE_FLOOR = 11.5;
const ADJACENT_NEAR_STRONG_RATIO_FLOOR = 0.46;
const ADJACENT_NEAR_STRONG_SPECIALIZATION_BONUS = 3;

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function roundScore(value: number): number {
    return Number(value.toFixed(1));
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function countSignalMatches(corpus: string, signals: string[]): number {
    const normalizedCorpus = normalizeText(corpus);
    if (!normalizedCorpus) return 0;
    return signals.reduce((count, signal) => {
        const normalizedSignal = normalizeText(signal);
        if (!normalizedSignal) return count;
        return normalizedCorpus.includes(normalizedSignal) ? count + 1 : count;
    }, 0);
}

function toBucket(score: number): JobFitScoreBucket {
    if (score >= 75) return "Strong Match";
    if (score >= 60) return "Good Match";
    if (score >= 45) return "Partial Match";
    return "Weak Match";
}

function calibrateSpecializationFitScore(params: {
    ratio: number;
    matchedSignalCount: number;
    relevantRequirementCount: number;
    fallbackUsed: boolean;
    capabilityMatchScore: number;
    evidenceStrengthScore: number;
}): {
    score: number;
    band: "weak" | "moderate" | "strong";
    strongBandGuardrails: JobFitScoreDebug["specialization_fit_inputs"]["strong_band_guardrails"];
} {
    const ratio = clamp(params.ratio);
    const signalCount = Math.max(0, params.matchedSignalCount);
    const relevantCount = Math.max(0, params.relevantRequirementCount);
    const capabilityScore = roundScore(params.capabilityMatchScore);
    const evidenceScore = roundScore(params.evidenceStrengthScore);
    const strongGuardrailFailures: string[] = [];

    if (params.fallbackUsed) strongGuardrailFailures.push("fallback_used");
    if (signalCount < STRONG_SPECIALIZATION_MIN_SIGNALS) strongGuardrailFailures.push("insufficient_canonical_signal_hits");
    if (relevantCount < STRONG_SPECIALIZATION_MIN_OVERLAP_REQUIREMENTS) strongGuardrailFailures.push("insufficient_requirement_overlap");
    if (ratio < STRONG_SPECIALIZATION_MIN_RATIO) strongGuardrailFailures.push("insufficient_specialization_alignment_ratio");
    if (capabilityScore < STRONG_SPECIALIZATION_CAPABILITY_FLOOR) strongGuardrailFailures.push("capability_support_below_floor");
    if (evidenceScore < STRONG_SPECIALIZATION_EVIDENCE_FLOOR) strongGuardrailFailures.push("evidence_support_below_floor");
    const strongGuardrails = {
        eligible: strongGuardrailFailures.length === 0,
        capability_score: capabilityScore,
        capability_floor: STRONG_SPECIALIZATION_CAPABILITY_FLOOR,
        evidence_score: evidenceScore,
        evidence_floor: STRONG_SPECIALIZATION_EVIDENCE_FLOOR,
        required_signal_count: STRONG_SPECIALIZATION_MIN_SIGNALS,
        required_requirement_overlap: STRONG_SPECIALIZATION_MIN_OVERLAP_REQUIREMENTS,
        failed_reasons: strongGuardrailFailures,
    };
    const failedCapabilityOrEvidenceFloor = strongGuardrailFailures.includes("capability_support_below_floor")
        || strongGuardrailFailures.includes("evidence_support_below_floor");

    if (params.fallbackUsed) {
        const fallbackScore = roundScore(clamp(6 + (ratio * 20), 0, 26));
        return {
            score: fallbackScore,
            band: fallbackScore >= 22 ? "moderate" : "weak",
            strongBandGuardrails: strongGuardrails,
        };
    }

    if (strongGuardrails.eligible) {
        const ratioStrength = clamp((ratio - 0.52) / 0.48);
        const evidenceDensity = clamp((signalCount + relevantCount) / 8);
        const strongScore = roundScore(34 + ((ratioStrength * 0.7) + (evidenceDensity * 0.3)) * 6);
        return {
            score: clamp(strongScore, 34, 40),
            band: "strong",
            strongBandGuardrails: strongGuardrails,
        };
    }

    const moderateGate = signalCount >= 2 && relevantCount >= 1 && ratio >= 0.32;
    if (moderateGate) {
        const ratioStrength = clamp((ratio - 0.32) / 0.4);
        const evidenceDensity = clamp((signalCount + relevantCount) / 6);
        const moderateScore = roundScore(22 + ((ratioStrength * 0.75) + (evidenceDensity * 0.25)) * 11);
        const nearStrongAdjacencyOnlyRatioMiss = !params.fallbackUsed
            && strongGuardrailFailures.length === 1
            && strongGuardrailFailures[0] === "insufficient_specialization_alignment_ratio"
            && signalCount >= STRONG_SPECIALIZATION_MIN_SIGNALS
            && relevantCount >= STRONG_SPECIALIZATION_MIN_OVERLAP_REQUIREMENTS
            && ratio >= ADJACENT_NEAR_STRONG_RATIO_FLOOR
            && capabilityScore >= STRONG_SPECIALIZATION_CAPABILITY_FLOOR
            && evidenceScore >= STRONG_SPECIALIZATION_EVIDENCE_FLOOR;
        const moderateMax = failedCapabilityOrEvidenceFloor ? 28 : 33;
        const nearStrongBonus = nearStrongAdjacencyOnlyRatioMiss
            ? ADJACENT_NEAR_STRONG_SPECIALIZATION_BONUS
            : 0;
        return {
            score: clamp(moderateScore + nearStrongBonus, 22, moderateMax),
            band: "moderate",
            strongBandGuardrails: strongGuardrails,
        };
    }

    const weakStrength = clamp(ratio / 0.32);
    const signalGuard = signalCount <= 0 ? 0.55 : signalCount === 1 ? 0.8 : 1;
    const weakScore = roundScore(21 * weakStrength * signalGuard);
    return {
        score: clamp(weakScore, 0, 21),
        band: "weak",
        strongBandGuardrails: strongGuardrails,
    };
}

function computeCapabilityCoverageRaw(match: CapabilityMatchV2Result): {
    ratio: number;
    counts: { strong: number; partial: number; weak: number; missing: number };
    totalRequirements: number;
} {
    const statusCounts = { strong: 0, partial: 0, weak: 0, missing: 0 };
    let weightedSupport = 0;
    let weightedPossible = 0;

    for (const row of match.audit.requirement_to_candidate_match_breakdown) {
        statusCounts[row.match_status] += 1;
        const importance = IMPORTANCE_WEIGHT[row.importance];
        weightedPossible += importance;
        weightedSupport += importance * CAPABILITY_STATUS_FACTOR[row.match_status];
    }

    return {
        ratio: weightedPossible > 0 ? clamp(weightedSupport / weightedPossible) : 0,
        counts: statusCounts,
        totalRequirements: match.audit.requirement_to_candidate_match_breakdown.length,
    };
}

function computeSpecializationFit(params: {
    match: CapabilityMatchV2Result;
    ontologyAudit: DomainOntologySpecializationAudit;
    capabilityCoverageRaw: number;
    capabilityMatchScore: number;
    evidenceStrengthScore: number;
}): {
    score: number;
    debug: JobFitScoreDebug["specialization_fit_inputs"];
} {
    const topSpecialization = params.ontologyAudit.top_specializations[0] ?? null;
    if (!topSpecialization) {
        return {
            score: 0,
            debug: {
                top_specialization: null,
                canonical_signals_used: [],
                matched_signal_count: 0,
                relevant_requirement_count: 0,
                weighted_support_ratio: 0,
                calibrated_band: "weak",
                strong_band_guardrails: {
                    eligible: false,
                    capability_score: roundScore(params.capabilityMatchScore),
                    capability_floor: STRONG_SPECIALIZATION_CAPABILITY_FLOOR,
                    evidence_score: roundScore(params.evidenceStrengthScore),
                    evidence_floor: STRONG_SPECIALIZATION_EVIDENCE_FLOOR,
                    required_signal_count: STRONG_SPECIALIZATION_MIN_SIGNALS,
                    required_requirement_overlap: STRONG_SPECIALIZATION_MIN_OVERLAP_REQUIREMENTS,
                    failed_reasons: ["no_top_specialization"],
                },
                fallback_used: true,
                fallback_reason: "no_top_specialization",
            },
        };
    }

    const topVote = params.ontologyAudit.specialization_votes
        .find((vote) => vote.specialization === topSpecialization.specialization);
    const matchedCanonicalSignals = (topVote?.matched_canonical_signals ?? [])
        .map((item) => item.signal);
    const canonicalSignals = getSpecializationSignalConfig(topSpecialization.specialization).canonical_signals;
    const signalsUsed = Array.from(
        new Set(
            matchedCanonicalSignals.length > 0
                ? matchedCanonicalSignals
                : canonicalSignals,
        ),
    ).slice(0, 6);

    const clusterById = new Map(
        params.match.audit.requirement_clusters.map((cluster) => [cluster.cluster_id, cluster]),
    );

    let weightedSupport = 0;
    let weightedPossible = 0;
    let matchedSignalCount = 0;
    let relevantRequirementCount = 0;

    for (const row of params.match.audit.requirement_to_candidate_match_breakdown) {
        const cluster = clusterById.get(row.cluster_id);
        const corpus = [
            row.display_name,
            ...row.supporting_capabilities,
            ...(cluster?.matched_terms ?? []),
            ...(cluster?.domain_modifiers ?? []),
            ...(cluster?.methods ?? []),
        ].join(" ");
        const signalMatches = countSignalMatches(corpus, signalsUsed);
        if (signalMatches <= 0) continue;

        const signalStrength = Math.min(signalMatches, 2) / 2;
        const importance = IMPORTANCE_WEIGHT[row.importance];
        const possible = importance * signalStrength;
        weightedPossible += possible;
        weightedSupport += possible * CAPABILITY_STATUS_FACTOR[row.match_status];
        matchedSignalCount += signalMatches;
        relevantRequirementCount += 1;
    }

    let fallbackUsed = false;
    let fallbackReason: string | null = null;
    let ratio = 0;
    if (weightedPossible > 0) {
        ratio = clamp(weightedSupport / weightedPossible);
    } else {
        // Fallback keeps specialization score stable when explicit overlap is sparse.
        const specializationSignalStrength = clamp((topSpecialization.total_score ?? 0) / 8);
        ratio = clamp((specializationSignalStrength * 0.45) + (params.capabilityCoverageRaw * 0.55));
        fallbackUsed = true;
        fallbackReason = "no_requirement_overlap_with_specialization_signals";
    }

    const calibrated = calibrateSpecializationFitScore({
        ratio,
        matchedSignalCount,
        relevantRequirementCount,
        fallbackUsed,
        capabilityMatchScore: params.capabilityMatchScore,
        evidenceStrengthScore: params.evidenceStrengthScore,
    });

    return {
        score: calibrated.score,
        debug: {
            top_specialization: topSpecialization.specialization,
            canonical_signals_used: signalsUsed.slice(0, 3),
            matched_signal_count: matchedSignalCount,
            relevant_requirement_count: relevantRequirementCount,
            weighted_support_ratio: roundScore(ratio),
            calibrated_band: calibrated.band,
            strong_band_guardrails: calibrated.strongBandGuardrails,
            fallback_used: fallbackUsed,
            fallback_reason: fallbackReason,
        },
    };
}

function computeEvidenceStrength(match: CapabilityMatchV2Result): {
    score: number;
    debug: JobFitScoreDebug["evidence_strength_inputs"];
} {
    let weightedQuality = 0;
    let weightedOwnership = 0;
    let weightedEvidence = 0;
    let weightedPossible = 0;
    let contributing = 0;

    for (const row of match.audit.requirement_to_candidate_match_breakdown) {
        if (row.match_status === "missing") continue;
        const importance = IMPORTANCE_WEIGHT[row.importance];
        const statusWeight = EVIDENCE_STATUS_FACTOR[row.match_status];
        const rowWeight = importance * statusWeight;
        if (rowWeight <= 0) continue;
        const ownership = clamp(row.ownership_scope_score);
        const evidence = clamp(row.evidence_score);
        const quality = clamp((ownership * 0.55) + (evidence * 0.45));
        weightedPossible += rowWeight;
        weightedQuality += rowWeight * quality;
        weightedOwnership += rowWeight * ownership;
        weightedEvidence += rowWeight * evidence;
        contributing += 1;
    }

    const ratio = weightedPossible > 0 ? clamp(weightedQuality / weightedPossible) : 0;
    return {
        score: roundScore(ratio * 20),
        debug: {
            contributing_requirements: contributing,
            weighted_ownership_score: roundScore(weightedPossible > 0 ? weightedOwnership / weightedPossible : 0),
            weighted_evidence_score: roundScore(weightedPossible > 0 ? weightedEvidence / weightedPossible : 0),
            weighted_quality_ratio: roundScore(ratio),
        },
    };
}

export function buildJobFitScoreV1(params: {
    capabilityMatch: CapabilityMatchV2Result;
    ontologyAudit: DomainOntologySpecializationAudit;
}): JobFitScoreResult {
    const capabilityCoverage = computeCapabilityCoverageRaw(params.capabilityMatch);
    const capabilityMatchScore = roundScore(capabilityCoverage.ratio * 40);
    const evidenceStrength = computeEvidenceStrength(params.capabilityMatch);
    const specializationFit = computeSpecializationFit({
        match: params.capabilityMatch,
        ontologyAudit: params.ontologyAudit,
        capabilityCoverageRaw: capabilityCoverage.ratio,
        capabilityMatchScore,
        evidenceStrengthScore: evidenceStrength.score,
    });
    const totalScore = roundScore(
        specializationFit.score + capabilityMatchScore + evidenceStrength.score,
    );
    const bucket = toBucket(totalScore);

    return {
        score: {
            total_score: totalScore,
            bucket,
            breakdown: {
                specialization_fit: specializationFit.score,
                capability_match: capabilityMatchScore,
                evidence_strength: evidenceStrength.score,
            },
        },
        debug: {
            specialization_fit_inputs: specializationFit.debug,
            capability_match_inputs: {
                total_requirements: capabilityCoverage.totalRequirements,
                status_counts: capabilityCoverage.counts,
                weighted_support_ratio: roundScore(capabilityCoverage.ratio),
            },
            evidence_strength_inputs: evidenceStrength.debug,
            final_bucket_decision: {
                total_score: totalScore,
                bucket,
                thresholds: {
                    strong_match_min: 75,
                    good_match_min: 60,
                    partial_match_min: 45,
                },
            },
        },
    };
}
