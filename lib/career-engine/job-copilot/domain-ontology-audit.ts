import type { JobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import {
    DOMAIN_ONTOLOGY_SKELETON,
    SPECIALIZATION_SIGNAL_MAP,
    type DomainFamily,
    type DomainType,
    type FirstPassDomainSpecialization,
} from "@/lib/career-engine/job-copilot/domain-ontology-config";

type SignalMatchDetail = {
    signal: string;
    hits: number;
    contribution: number;
};

type OntologyAuditCorpora = {
    title_corpus: string;
    body_corpus: string;
    cluster_corpus: string;
    joined_corpus: string;
};

export type SpecializationSignalVoteAudit = {
    specialization: FirstPassDomainSpecialization;
    family: DomainFamily;
    domain_type: DomainType;
    matched_canonical_signals: SignalMatchDetail[];
    matched_anti_signals: SignalMatchDetail[];
    matched_common_tools: SignalMatchDetail[];
    canonical_signal_score: number;
    anti_signal_penalty: number;
    tool_support_score: number;
    total_score: number;
};

export type FamilyVoteAggregationAudit = {
    family: DomainFamily;
    domain_type: DomainType;
    specialization_scores: Array<{
        specialization: FirstPassDomainSpecialization;
        score: number;
    }>;
    total_score: number;
};

export type DomainOntologySpecializationAudit = {
    corpora: OntologyAuditCorpora;
    specialization_votes: SpecializationSignalVoteAudit[];
    family_aggregation: FamilyVoteAggregationAudit[];
    top_specializations: Array<{
        specialization: FirstPassDomainSpecialization;
        family: DomainFamily;
        domain_type: DomainType;
        total_score: number;
    }>;
    vertical_horizontal_watch: {
        detector_winning_family: string | null;
        detector_winning_family_type: DomainType | null;
        top_vertical_specialization: {
            specialization: FirstPassDomainSpecialization;
            family: DomainFamily;
            score: number;
        } | null;
        top_horizontal_family: {
            family: DomainFamily;
            score: number;
        } | null;
        vertical_signal_present: boolean;
        vertical_signal_beaten_by_horizontal_winner: boolean;
    };
};

const ONTOLOGY_AUDIT_WEIGHTS = {
    canonical: 1.3,
    anti: 0.45,
    tool: 0.14,
    repeat_bonus: 0.2,
};

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countSignalHits(corpus: string, signal: string): number {
    const normalizedSignal = normalizeText(signal);
    if (!normalizedSignal) return 0;
    const tokenAware = escapeRegex(normalizedSignal).replace(/\s+/g, "\\s+");
    const pattern = new RegExp(`(?:^|\\b)${tokenAware}(?:\\b|$)`, "g");
    let count = 0;
    while (pattern.exec(corpus)) {
        count += 1;
    }
    return count;
}

function scoreSignalSet(params: {
    corpus: string;
    signals: string[];
    weight: number;
}): {
    score: number;
    matches: SignalMatchDetail[];
} {
    let score = 0;
    const matches: SignalMatchDetail[] = [];
    for (const signal of params.signals) {
        const hits = countSignalHits(params.corpus, signal);
        if (hits <= 0) continue;
        let contribution = hits * params.weight;
        if (hits > 1) {
            contribution += (hits - 1) * ONTOLOGY_AUDIT_WEIGHTS.repeat_bonus;
        }
        const rounded = Number(contribution.toFixed(4));
        score += rounded;
        matches.push({
            signal,
            hits,
            contribution: rounded,
        });
    }
    return {
        score: Number(score.toFixed(4)),
        matches: matches.sort((left, right) => right.contribution - left.contribution),
    };
}

function buildCorpora(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
}): OntologyAuditCorpora {
    const title_corpus = normalizeText([
        params.jobTitle,
        params.parsedSignals.target_title ?? "",
        params.parsedSignals.role_family ?? "",
    ].join(" "));
    const body_corpus = normalizeText([
        ...params.parsedSignals.required_skills,
        ...params.parsedSignals.preferred_skills,
        ...params.parsedSignals.responsibilities,
        ...params.parsedSignals.domains,
        ...params.parsedSignals.keywords,
    ].join(" "));
    const cluster_corpus = normalizeText(
        params.matchResult
            ? params.matchResult.audit.requirement_clusters
                .slice(0, 14)
                .map((cluster) => [
                    cluster.display_name,
                    ...cluster.methods,
                    ...cluster.domain_modifiers,
                    ...cluster.matched_terms,
                ].join(" "))
                .join(" ")
            : "",
    );
    return {
        title_corpus,
        body_corpus,
        cluster_corpus,
        joined_corpus: normalizeText(`${title_corpus} ${body_corpus} ${cluster_corpus}`),
    };
}

function toDomainType(family: DomainFamily): DomainType {
    return DOMAIN_ONTOLOGY_SKELETON[family].type;
}

export function buildDomainOntologySpecializationAudit(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
    detectorWinningFamily?: string | null;
}): DomainOntologySpecializationAudit {
    const corpora = buildCorpora(params);
    const specializationVotes = (Object.entries(SPECIALIZATION_SIGNAL_MAP) as Array<
        [FirstPassDomainSpecialization, (typeof SPECIALIZATION_SIGNAL_MAP)[FirstPassDomainSpecialization]]
    >)
        .map(([specialization, config]) => {
            const canonical = scoreSignalSet({
                corpus: corpora.joined_corpus,
                signals: config.canonical_signals,
                weight: ONTOLOGY_AUDIT_WEIGHTS.canonical,
            });
            const anti = scoreSignalSet({
                corpus: corpora.joined_corpus,
                signals: config.anti_signals,
                weight: ONTOLOGY_AUDIT_WEIGHTS.anti,
            });
            const tools = scoreSignalSet({
                corpus: corpora.joined_corpus,
                signals: config.common_tools,
                weight: ONTOLOGY_AUDIT_WEIGHTS.tool,
            });
            const total_score = Number(
                (canonical.score - anti.score + tools.score).toFixed(4),
            );
            return {
                specialization,
                family: config.family,
                domain_type: toDomainType(config.family),
                matched_canonical_signals: canonical.matches,
                matched_anti_signals: anti.matches,
                matched_common_tools: tools.matches,
                canonical_signal_score: canonical.score,
                anti_signal_penalty: anti.score,
                tool_support_score: tools.score,
                total_score,
            } satisfies SpecializationSignalVoteAudit;
        })
        .sort((left, right) => right.total_score - left.total_score);

    const familyAggregation = (Object.keys(DOMAIN_ONTOLOGY_SKELETON) as DomainFamily[])
        .map((family) => {
            const specialization_scores = specializationVotes
                .filter((item) => item.family === family)
                .map((item) => ({
                    specialization: item.specialization,
                    score: item.total_score,
                }))
                .sort((left, right) => right.score - left.score);
            const total_score = Number(
                specialization_scores.reduce((sum, item) => sum + item.score, 0).toFixed(4),
            );
            return {
                family,
                domain_type: toDomainType(family),
                specialization_scores,
                total_score,
            } satisfies FamilyVoteAggregationAudit;
        })
        .sort((left, right) => right.total_score - left.total_score);

    const topSpecializations = specializationVotes
        .filter((item) => item.total_score > 0)
        .slice(0, 8)
        .map((item) => ({
            specialization: item.specialization,
            family: item.family,
            domain_type: item.domain_type,
            total_score: item.total_score,
        }));

    const topVertical = specializationVotes.find((item) => item.domain_type === "vertical" && item.total_score > 0);
    const topHorizontalFamily = familyAggregation.find((family) => family.domain_type === "horizontal" && family.total_score > 0);
    const winningFamilyType = params.detectorWinningFamily
        && (Object.keys(DOMAIN_ONTOLOGY_SKELETON) as string[]).includes(params.detectorWinningFamily)
        ? toDomainType(params.detectorWinningFamily as DomainFamily)
        : null;
    const vertical_signal_beaten_by_horizontal_winner = Boolean(
        topVertical
        && params.detectorWinningFamily
        && winningFamilyType === "horizontal"
        && topVertical.family !== params.detectorWinningFamily,
    );

    return {
        corpora,
        specialization_votes: specializationVotes.filter((item) => (
            item.matched_canonical_signals.length > 0
            || item.matched_anti_signals.length > 0
            || item.matched_common_tools.length > 0
        )),
        family_aggregation: familyAggregation,
        top_specializations: topSpecializations,
        vertical_horizontal_watch: {
            detector_winning_family: params.detectorWinningFamily ?? null,
            detector_winning_family_type: winningFamilyType,
            top_vertical_specialization: topVertical
                ? {
                    specialization: topVertical.specialization,
                    family: topVertical.family,
                    score: topVertical.total_score,
                }
                : null,
            top_horizontal_family: topHorizontalFamily
                ? {
                    family: topHorizontalFamily.family,
                    score: topHorizontalFamily.total_score,
                }
                : null,
            vertical_signal_present: Boolean(topVertical),
            vertical_signal_beaten_by_horizontal_winner,
        },
    };
}
