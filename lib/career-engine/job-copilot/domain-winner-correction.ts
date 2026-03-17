import type {
    DomainFamily as OntologyDomainFamily,
    DomainType,
    FirstPassDomainSpecialization,
} from "@/lib/career-engine/job-copilot/domain-ontology-config";
import type {
    FamilyVoteAggregationAudit,
    SpecializationSignalVoteAudit,
} from "@/lib/career-engine/job-copilot/domain-ontology-audit";

type TopSpecializationAudit = {
    specialization: FirstPassDomainSpecialization;
    family: OntologyDomainFamily;
    domain_type: DomainType;
    total_score: number;
};

export type DomainWinnerCorrectionConfig = {
    minimumTopSpecializationScore: number;
    minimumVerticalVsHorizontalRatio: number;
    minimumCanonicalMatches: number;
};

export type DomainWinnerCorrectionResult = {
    original_winner: string | null;
    corrected_winner: OntologyDomainFamily | null;
    correction_applied: boolean;
    correction_reason: string;
    top_specialization: FirstPassDomainSpecialization | null;
    top_specialization_score: number;
    vertical_family_score: number;
    horizontal_family_score: number;
};

const HORIZONTAL_WINNER_FAMILIES = new Set([
    "data",
    "operations",
    "technology_platform",
    "sales",
    "customer_success",
    "engineering",
]);

const WINNER_TO_ONTOLOGY_FAMILY: Record<string, OntologyDomainFamily | null> = {
    marketing: "marketing",
    product: "product",
    data: "data",
    consulting: "consulting",
    operations: "operations",
    engineering: "technology_platform",
    technology_platform: "technology_platform",
    sales: "sales",
    customer_success: "customer_success",
    business: "finance",
    domain_specialist: null,
};

export const DOMAIN_WINNER_CORRECTION_CONFIG: DomainWinnerCorrectionConfig = {
    minimumTopSpecializationScore: 3,
    minimumVerticalVsHorizontalRatio: 0.75,
    minimumCanonicalMatches: 2,
};

function toOntologyWinnerFamily(winner: string | null): OntologyDomainFamily | null {
    if (!winner) return null;
    return WINNER_TO_ONTOLOGY_FAMILY[winner] ?? null;
}

function readFamilyScore(
    aggregation: FamilyVoteAggregationAudit[],
    family: OntologyDomainFamily | null,
): number {
    if (!family) return 0;
    return aggregation.find((item) => item.family === family)?.total_score ?? 0;
}

export function applyDomainWinnerCorrection(params: {
    current_winner_family: string | null;
    ontology_specialization_votes: SpecializationSignalVoteAudit[];
    ontology_family_aggregation: FamilyVoteAggregationAudit[];
    ontology_top_specializations: TopSpecializationAudit[];
    config?: Partial<DomainWinnerCorrectionConfig>;
}): DomainWinnerCorrectionResult {
    const config = {
        ...DOMAIN_WINNER_CORRECTION_CONFIG,
        ...(params.config ?? {}),
    };
    const originalWinner = params.current_winner_family ?? null;
    const topSpecialization = params.ontology_top_specializations[0] ?? null;

    if (!originalWinner) {
        return {
            original_winner: null,
            corrected_winner: null,
            correction_applied: false,
            correction_reason: "no_original_winner",
            top_specialization: topSpecialization?.specialization ?? null,
            top_specialization_score: topSpecialization?.total_score ?? 0,
            vertical_family_score: 0,
            horizontal_family_score: 0,
        };
    }

    if (!HORIZONTAL_WINNER_FAMILIES.has(originalWinner)) {
        return {
            original_winner: originalWinner,
            corrected_winner: null,
            correction_applied: false,
            correction_reason: "original_winner_not_horizontal",
            top_specialization: topSpecialization?.specialization ?? null,
            top_specialization_score: topSpecialization?.total_score ?? 0,
            vertical_family_score: 0,
            horizontal_family_score: 0,
        };
    }

    if (!topSpecialization || topSpecialization.domain_type !== "vertical") {
        return {
            original_winner: originalWinner,
            corrected_winner: null,
            correction_applied: false,
            correction_reason: "no_vertical_top_specialization",
            top_specialization: topSpecialization?.specialization ?? null,
            top_specialization_score: topSpecialization?.total_score ?? 0,
            vertical_family_score: 0,
            horizontal_family_score: 0,
        };
    }

    if (topSpecialization.total_score < config.minimumTopSpecializationScore) {
        return {
            original_winner: originalWinner,
            corrected_winner: null,
            correction_applied: false,
            correction_reason: "vertical_specialization_score_too_low",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            vertical_family_score: 0,
            horizontal_family_score: 0,
        };
    }

    const topSpecializationVote = params.ontology_specialization_votes
        .find((item) => item.specialization === topSpecialization.specialization);
    const canonicalMatches = topSpecializationVote?.matched_canonical_signals.length ?? 0;
    if (canonicalMatches < config.minimumCanonicalMatches) {
        return {
            original_winner: originalWinner,
            corrected_winner: null,
            correction_applied: false,
            correction_reason: "insufficient_vertical_canonical_matches",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            vertical_family_score: 0,
            horizontal_family_score: 0,
        };
    }

    const horizontalWinnerFamily = toOntologyWinnerFamily(originalWinner);
    const horizontalFamilyScore = readFamilyScore(
        params.ontology_family_aggregation,
        horizontalWinnerFamily,
    );
    const verticalFamilyScore = readFamilyScore(
        params.ontology_family_aggregation,
        topSpecialization.family,
    );

    if (horizontalFamilyScore <= 0) {
        return {
            original_winner: originalWinner,
            corrected_winner: null,
            correction_applied: false,
            correction_reason: "missing_horizontal_family_score",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            vertical_family_score: verticalFamilyScore,
            horizontal_family_score: horizontalFamilyScore,
        };
    }

    if (verticalFamilyScore < (horizontalFamilyScore * config.minimumVerticalVsHorizontalRatio)) {
        return {
            original_winner: originalWinner,
            corrected_winner: null,
            correction_applied: false,
            correction_reason: "vertical_family_not_close_enough",
            top_specialization: topSpecialization.specialization,
            top_specialization_score: topSpecialization.total_score,
            vertical_family_score: verticalFamilyScore,
            horizontal_family_score: horizontalFamilyScore,
        };
    }

    return {
        original_winner: originalWinner,
        corrected_winner: topSpecialization.family,
        correction_applied: true,
        correction_reason: "specialization_vertical_override",
        top_specialization: topSpecialization.specialization,
        top_specialization_score: topSpecialization.total_score,
        vertical_family_score: verticalFamilyScore,
        horizontal_family_score: horizontalFamilyScore,
    };
}
