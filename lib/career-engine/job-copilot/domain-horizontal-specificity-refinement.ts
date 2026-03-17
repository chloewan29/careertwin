import type {
    DomainFamily as OntologyDomainFamily,
    FirstPassDomainSpecialization,
} from "@/lib/career-engine/job-copilot/domain-ontology-config";
import type {
    FamilyVoteAggregationAudit,
    SpecializationSignalVoteAudit,
} from "@/lib/career-engine/job-copilot/domain-ontology-audit";

type TopSpecializationAudit = {
    specialization: FirstPassDomainSpecialization;
    family: OntologyDomainFamily;
    total_score: number;
};

export type HorizontalSpecificityRefinementConfig = {
    minimumTopSpecializationScore: number;
    minimumTargetVsDataFamilyRatio: number;
    minimumCanonicalMatches: number;
    minimumCanonicalToToolScoreRatio: number;
};

export type HorizontalSpecificityRefinementResult = {
    original_winner: string | null;
    refined_winner: OntologyDomainFamily | null;
    refinement_applied: boolean;
    refinement_reason: string;
    top_specialization: FirstPassDomainSpecialization | null;
    top_specialization_score: number;
    target_family: OntologyDomainFamily | null;
    target_family_score: number;
    data_family_score: number;
    canonical_signal_match_count: number;
    tool_hit_count: number;
};

const IN_SCOPE_TARGET_FAMILIES = new Set<OntologyDomainFamily>([
    "sales",
    "technology_platform",
]);

export const HORIZONTAL_SPECIFICITY_REFINEMENT_CONFIG: HorizontalSpecificityRefinementConfig = {
    minimumTopSpecializationScore: 3,
    minimumTargetVsDataFamilyRatio: 0.75,
    minimumCanonicalMatches: 2,
    minimumCanonicalToToolScoreRatio: 1.1,
};

function readFamilyScore(
    aggregation: FamilyVoteAggregationAudit[],
    family: OntologyDomainFamily,
): number {
    return aggregation.find((item) => item.family === family)?.total_score ?? 0;
}

export function applyHorizontalSpecificityRefinement(params: {
    current_winner_family: string | null;
    ontology_specialization_votes: SpecializationSignalVoteAudit[];
    ontology_family_aggregation: FamilyVoteAggregationAudit[];
    ontology_top_specializations: TopSpecializationAudit[];
    config?: Partial<HorizontalSpecificityRefinementConfig>;
}): HorizontalSpecificityRefinementResult {
    const config = {
        ...HORIZONTAL_SPECIFICITY_REFINEMENT_CONFIG,
        ...(params.config ?? {}),
    };
    const originalWinner = params.current_winner_family ?? null;
    const topSpecialization = params.ontology_top_specializations[0] ?? null;

    if (!originalWinner) {
        return {
            original_winner: null,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "no_original_winner",
            top_specialization: topSpecialization?.specialization ?? null,
            top_specialization_score: topSpecialization?.total_score ?? 0,
            target_family: topSpecialization?.family ?? null,
            target_family_score: 0,
            data_family_score: 0,
            canonical_signal_match_count: 0,
            tool_hit_count: 0,
        };
    }

    if (originalWinner !== "data") {
        return {
            original_winner: originalWinner,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "original_winner_not_data",
            top_specialization: topSpecialization?.specialization ?? null,
            top_specialization_score: topSpecialization?.total_score ?? 0,
            target_family: topSpecialization?.family ?? null,
            target_family_score: 0,
            data_family_score: 0,
            canonical_signal_match_count: 0,
            tool_hit_count: 0,
        };
    }

    if (!topSpecialization) {
        return {
            original_winner: originalWinner,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "no_top_specialization",
            top_specialization: null,
            top_specialization_score: 0,
            target_family: null,
            target_family_score: 0,
            data_family_score: readFamilyScore(params.ontology_family_aggregation, "data"),
            canonical_signal_match_count: 0,
            tool_hit_count: 0,
        };
    }

    if (!IN_SCOPE_TARGET_FAMILIES.has(topSpecialization.family)) {
        return {
            original_winner: originalWinner,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "top_specialization_family_out_of_scope",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            target_family: topSpecialization.family,
            target_family_score: readFamilyScore(params.ontology_family_aggregation, topSpecialization.family),
            data_family_score: readFamilyScore(params.ontology_family_aggregation, "data"),
            canonical_signal_match_count: 0,
            tool_hit_count: 0,
        };
    }

    const vote = params.ontology_specialization_votes
        .find((item) => item.specialization === topSpecialization.specialization);
    const canonicalMatchCount = (vote?.matched_canonical_signals ?? [])
        .reduce((sum, item) => sum + item.hits, 0);
    const toolHitCount = (vote?.matched_common_tools ?? []).reduce((sum, item) => sum + item.hits, 0);
    const canonicalSignalScore = vote?.canonical_signal_score ?? 0;
    const toolSupportScore = vote?.tool_support_score ?? 0;
    const dataFamilyScore = readFamilyScore(params.ontology_family_aggregation, "data");
    const targetFamilyScore = readFamilyScore(params.ontology_family_aggregation, topSpecialization.family);

    if (topSpecialization.total_score < config.minimumTopSpecializationScore) {
        return {
            original_winner: originalWinner,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "top_specialization_score_too_low",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            target_family: topSpecialization.family,
            target_family_score: targetFamilyScore,
            data_family_score: dataFamilyScore,
            canonical_signal_match_count: canonicalMatchCount,
            tool_hit_count: toolHitCount,
        };
    }

    if (canonicalMatchCount < config.minimumCanonicalMatches) {
        return {
            original_winner: originalWinner,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "insufficient_canonical_signal_support",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            target_family: topSpecialization.family,
            target_family_score: targetFamilyScore,
            data_family_score: dataFamilyScore,
            canonical_signal_match_count: canonicalMatchCount,
            tool_hit_count: toolHitCount,
        };
    }

    const canonicalDominatesTools = canonicalSignalScore >= (toolSupportScore * config.minimumCanonicalToToolScoreRatio);
    if (!canonicalDominatesTools) {
        return {
            original_winner: originalWinner,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "tool_dominant_signal_not_allowed",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            target_family: topSpecialization.family,
            target_family_score: targetFamilyScore,
            data_family_score: dataFamilyScore,
            canonical_signal_match_count: canonicalMatchCount,
            tool_hit_count: toolHitCount,
        };
    }

    const targetHasSupport = dataFamilyScore <= 0
        ? targetFamilyScore > 0
        : targetFamilyScore >= (dataFamilyScore * config.minimumTargetVsDataFamilyRatio);
    if (!targetHasSupport) {
        return {
            original_winner: originalWinner,
            refined_winner: null,
            refinement_applied: false,
            refinement_reason: "target_family_support_too_low",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            target_family: topSpecialization.family,
            target_family_score: targetFamilyScore,
            data_family_score: dataFamilyScore,
            canonical_signal_match_count: canonicalMatchCount,
            tool_hit_count: toolHitCount,
        };
    }

    return {
        original_winner: originalWinner,
        refined_winner: topSpecialization.family,
        refinement_applied: true,
        refinement_reason: "horizontal_specificity_override",
        top_specialization: topSpecialization.specialization,
        top_specialization_score: topSpecialization.total_score,
        target_family: topSpecialization.family,
        target_family_score: targetFamilyScore,
        data_family_score: dataFamilyScore,
        canonical_signal_match_count: canonicalMatchCount,
        tool_hit_count: toolHitCount,
    };
}
