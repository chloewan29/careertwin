import type { JobCalibrationState } from "@/lib/career-engine/job-copilot/job-analysis";
import type { JobFitScore, JobFitScoreDebug, JobFitScoreStrongMatchSignal } from "@/lib/career-engine/job-copilot/job-fit-score-v1";

const PRE_STRONG_MIN_TOTAL_SCORE = 67;
const PRE_STRONG_CAPABILITY_MIN = 24;
const AUTO_STRONG_CAPABILITY_MIN = 26;
const AUTO_STRONG_EVIDENCE_MIN = 12;
const STRONG_LIKE_CAPABILITY_MIN = 21.5;
const STRONG_LIKE_EVIDENCE_MIN = 11.5;
const AUTO_STRONG_MIN_REQUIREMENT_OVERLAP = 2;
const AUTO_STRONG_MIN_MATCHED_SIGNALS = 3;
const USER_CONFIRMATION_SCORE_BOOST = 6;

function clamp(value: number, min = 0, max = 100): number {
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

function toSpecializationTokens(value: string | null): string[] {
    if (!value) return [];
    return normalizeText(value.replace(/_/g, " "))
        .split(" ")
        .filter((token) => token.length >= 3);
}

function isSpecializationRelevantQuestion(params: {
    questionId: string;
    question: string;
    targetArea: string;
    topSpecialization: string | null;
}): boolean {
    if (params.questionId.startsWith("cal_spec_")) return true;
    const specializationTokens = toSpecializationTokens(params.topSpecialization);
    if (specializationTokens.length === 0) return false;
    const corpus = normalizeText(`${params.targetArea} ${params.question}`);
    if (!corpus) return false;
    const matchedTokens = specializationTokens.filter((token) => corpus.includes(token)).length;
    const minRequired = Math.min(2, specializationTokens.length);
    return matchedTokens >= minRequired;
}

function hasSpecializationRelevantConfirmation(params: {
    calibration: JobCalibrationState;
    topSpecialization: string | null;
}): boolean {
    for (const question of params.calibration.questions) {
        if (question.answer !== "yes") continue;
        if (isSpecializationRelevantQuestion({
            questionId: question.id,
            question: question.question,
            targetArea: question.target_area,
            topSpecialization: params.topSpecialization,
        })) {
            return true;
        }
    }
    return false;
}

export type ConfirmationRescoreBridge = {
    confirmation_records?: Array<{
        question_id: string;
        question: string;
        target_area: string;
        matched_cluster_ids: string[];
        matched_cluster_labels: string[];
        capability_tags: string[];
        title: string;
        description: string;
    }>;
    resolved_cluster_ids: string[];
    resolved_critical_cluster_ids: string[];
    ownership_confirmation: boolean;
    decision_impact_confirmation: boolean;
    measurement_confirmation: boolean;
    capability_score_boost: number;
    evidence_score_boost: number;
    requirement_overlap_credit: number;
    matched_signal_credit: number;
    specialization_confirmation: boolean;
};

export function applyStrongMatchEscalation(params: {
    baseScore: JobFitScore;
    baseDebug: JobFitScoreDebug;
    calibration: JobCalibrationState;
    topSpecialization: string | null;
    confirmationBridge?: ConfirmationRescoreBridge;
    strongLikeSignals?: {
        domainAlignmentStrong: boolean;
        roleSpecificAlignmentStrong: boolean;
        broadSupportingAlignmentStrong: boolean;
        criticalGateClear: boolean;
    };
}): {
    score: JobFitScore;
    signal: JobFitScoreStrongMatchSignal;
} {
    const baseScore = params.baseScore;
    const debugInputs = params.baseDebug.specialization_fit_inputs;

    const specializationStrongBand = debugInputs.calibrated_band === "strong";
    const fallbackUsed = Boolean(debugInputs.fallback_used);
    const confirmationBridge = params.confirmationBridge;
    const effectiveRequirementOverlap = debugInputs.relevant_requirement_count + (confirmationBridge?.requirement_overlap_credit ?? 0);
    const effectiveMatchedSignalCount = debugInputs.matched_signal_count + (confirmationBridge?.matched_signal_credit ?? 0);
    const effectiveCapabilityScore = clamp(baseScore.breakdown.capability_match + (confirmationBridge?.capability_score_boost ?? 0));
    const effectiveEvidenceScore = clamp(baseScore.breakdown.evidence_strength + (confirmationBridge?.evidence_score_boost ?? 0));
    const requirementOverlapMet = effectiveRequirementOverlap >= AUTO_STRONG_MIN_REQUIREMENT_OVERLAP;
    const matchedSignalCountMet = effectiveMatchedSignalCount >= AUTO_STRONG_MIN_MATCHED_SIGNALS;
    const capabilityThresholdMet = effectiveCapabilityScore >= PRE_STRONG_CAPABILITY_MIN;
    const evidenceThresholdMet = effectiveEvidenceScore >= AUTO_STRONG_EVIDENCE_MIN;
    const specializationConfirmationFromQuestion = hasSpecializationRelevantConfirmation({
        calibration: params.calibration,
        topSpecialization: params.topSpecialization,
    });
    const specializationConfirmation = specializationConfirmationFromQuestion
        || confirmationBridge?.specialization_confirmation === true;
    const confirmationDrivenPreStrongEligible = baseScore.bucket === "Good Match"
        && baseScore.total_score >= (PRE_STRONG_MIN_TOTAL_SCORE - 2)
        && !fallbackUsed
        && requirementOverlapMet
        && matchedSignalCountMet
        && effectiveCapabilityScore >= STRONG_LIKE_CAPABILITY_MIN
        && effectiveEvidenceScore >= STRONG_LIKE_EVIDENCE_MIN
        && confirmationBridge?.specialization_confirmation === true
        && confirmationBridge?.ownership_confirmation === true
        && confirmationBridge?.decision_impact_confirmation === true;

    const autoStrongEligible = baseScore.bucket === "Good Match"
        && specializationStrongBand
        && !fallbackUsed
        && requirementOverlapMet
        && matchedSignalCountMet
        && effectiveCapabilityScore >= AUTO_STRONG_CAPABILITY_MIN
        && evidenceThresholdMet;
    const strongLikeEscalationEligible = baseScore.bucket === "Good Match"
        && baseScore.total_score >= PRE_STRONG_MIN_TOTAL_SCORE
        && specializationStrongBand
        && !fallbackUsed
        && requirementOverlapMet
        && matchedSignalCountMet
        && effectiveCapabilityScore >= STRONG_LIKE_CAPABILITY_MIN
        && effectiveEvidenceScore >= STRONG_LIKE_EVIDENCE_MIN
        && params.strongLikeSignals?.domainAlignmentStrong === true
        && params.strongLikeSignals?.roleSpecificAlignmentStrong === true
        && params.strongLikeSignals?.broadSupportingAlignmentStrong === true
        && params.strongLikeSignals?.criticalGateClear === true;

    const preStrongEligible = baseScore.bucket === "Good Match"
        && baseScore.total_score >= PRE_STRONG_MIN_TOTAL_SCORE
        && specializationStrongBand
        && !fallbackUsed
        && requirementOverlapMet
        && capabilityThresholdMet;

    let layer: JobFitScoreStrongMatchSignal["layer"] = "none";
    let bucket = baseScore.bucket;
    let totalScore = baseScore.total_score;
    let uiSignal: string | null = null;
    let explanation: string | null = null;

    if (autoStrongEligible || strongLikeEscalationEligible) {
        layer = "auto_strong";
        bucket = "Strong Match";
        totalScore = roundScore(Math.max(totalScore, 75));
        uiSignal = null;
        explanation = "Your specialization and evidence already indicate this role is a strong match.";
    } else if ((preStrongEligible || confirmationDrivenPreStrongEligible) && specializationConfirmation) {
        layer = "user_confirmation_boost";
        bucket = "Strong Match";
        totalScore = roundScore(clamp(Math.max(totalScore + USER_CONFIRMATION_SCORE_BOOST, 75), 0, 82));
        uiSignal = null;
        explanation = "Based on your confirmed experience, this role is a strong match.";
    } else if (preStrongEligible || confirmationDrivenPreStrongEligible) {
        layer = "pre_strong";
        bucket = "Good Match";
        totalScore = baseScore.total_score;
        uiSignal = "You're very close to a strong match.";
        explanation = null;
    }

    const scoreBoost = roundScore(totalScore - baseScore.total_score);
    const signal: JobFitScoreStrongMatchSignal = {
        layer,
        score_boost: scoreBoost,
        base_total_score: baseScore.total_score,
        base_bucket: baseScore.bucket,
        ui_signal: uiSignal,
        explanation,
        conditions: {
            specialization_strong_band: specializationStrongBand,
            capability_threshold_met: capabilityThresholdMet,
            evidence_threshold_met: evidenceThresholdMet,
            fallback_used: fallbackUsed,
            requirement_overlap_met: requirementOverlapMet,
            matched_signal_count_met: matchedSignalCountMet,
            specialization_relevant_confirmation: specializationConfirmation,
            effective_capability_score: roundScore(effectiveCapabilityScore),
            effective_evidence_score: roundScore(effectiveEvidenceScore),
            effective_requirement_overlap_count: roundScore(effectiveRequirementOverlap),
            effective_matched_signal_count: roundScore(effectiveMatchedSignalCount),
            confirmation_bridge_applied: Boolean(confirmationBridge),
            confirmation_resolved_cluster_count: confirmationBridge?.resolved_cluster_ids.length ?? 0,
            confirmation_resolved_critical_count: confirmationBridge?.resolved_critical_cluster_ids.length ?? 0,
            confirmation_driven_prestrong_eligible: confirmationDrivenPreStrongEligible,
        },
    };

    return {
        score: {
            ...baseScore,
            total_score: totalScore,
            bucket,
            strong_match: signal,
        },
        signal,
    };
}
