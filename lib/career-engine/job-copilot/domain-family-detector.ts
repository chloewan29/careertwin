import type { JobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import type { DomainFamily as OntologyDomainFamily } from "@/lib/career-engine/job-copilot/domain-ontology-config";
import {
    buildDomainOntologySpecializationAudit,
    type DomainOntologySpecializationAudit,
} from "@/lib/career-engine/job-copilot/domain-ontology-audit";
import {
    applyDomainWinnerCorrection,
    type DomainWinnerCorrectionResult,
} from "@/lib/career-engine/job-copilot/domain-winner-correction";
import {
    applyHorizontalSpecificityRefinement,
    type HorizontalSpecificityRefinementResult,
} from "@/lib/career-engine/job-copilot/domain-horizontal-specificity-refinement";
import {
    DOMAIN_FAMILY_REGISTRY,
    DOMAIN_FAMILY_SCORE_THRESHOLD,
    DOMAIN_SIGNAL_WEIGHTS,
    FUNCTIONAL_ROLE_SIGNALS,
    GENERIC_ROLE_LANGUAGE_SIGNALS,
    GENERIC_TRANSFERABLE_SIGNALS,
    INTERPRETATION_LAYER_PRIORITY,
    SPECIALIZATION_SCORE_THRESHOLD,
    WORK_MODE_SIGNALS,
    type DomainAnchor,
    type DomainFamily,
    type DomainFamilyConfig,
    type InterpretationLayer,
    type SpecializationConfig,
} from "@/lib/career-engine/job-copilot/domain-family-config";

type DetectorCorpora = {
    titleCorpus: string;
    bodyCorpus: string;
    clusterCorpus: string;
    joinedCorpus: string;
};

type SpecializationScore = {
    key: string;
    interpretationLayer: InterpretationLayer;
    score: number;
    strongHits: number;
    methodHits: number;
    toolHits: number;
    supportHits: number;
    evidence: string[];
};

type FamilyScore = {
    family: Exclude<DomainFamily, null>;
    score: number;
    domainEvidenceStrength: number;
    specializationScores: SpecializationScore[];
    evidence: string[];
};

type InterpretationLayerScore = {
    layer: InterpretationLayer;
    score: number;
    evidence: string[];
};

type VerticalDomainFamily =
    | "marketing"
    | "product"
    | "finance"
    | "healthcare"
    | "retail"
    | "supply_chain"
    | "consulting"
    | "data_platform"
    | "ai_ml"
    | "cybersecurity"
    | "legal"
    | "hr_people"
    | "real_estate"
    | "energy"
    | "media";

type VerticalSpecializationScore = {
    family: VerticalDomainFamily;
    score: number;
    strongHits: number;
    supportHits: number;
    toolHits: number;
    evidence: string[];
};

type DomainOverrideResult = {
    winningFamily: VerticalDomainFamily | Exclude<DomainFamily, null> | null;
    overrideApplied: boolean;
    overrideReason: string | null;
};

type VerticalOverrideRule = {
    family: VerticalDomainFamily;
    strongSignals: string[];
    supportSignals: string[];
    toolSignals: string[];
};

type OntologyToLegacyMappingResolution = {
    ontology_family_before_mapping: OntologyDomainFamily | null;
    mapped_legacy_family: Exclude<DomainFamily, null> | null;
    mapping_reason: string;
    mapping_confidence_basis: string;
};

type DetectorDomainWinnerCorrectionDebug = DomainWinnerCorrectionResult & {
    corrected_winner_applied: Exclude<DomainFamily, null> | null;
    ontology_family_before_mapping: OntologyDomainFamily | null;
    mapped_legacy_family: Exclude<DomainFamily, null> | null;
    mapping_reason: string;
    mapping_confidence_basis: string;
};

type DetectorHorizontalSpecificityRefinementDebug = HorizontalSpecificityRefinementResult & {
    refined_winner_applied_legacy: Exclude<DomainFamily, null> | null;
};

export type DomainFamilyScoreBreakdown = {
    family: Exclude<DomainFamily, null>;
    score: number;
    domainEvidenceStrength: number;
    specializationScores: Array<{
        key: string;
        interpretationLayer: InterpretationLayer;
        score: number;
        strongHits: number;
        methodHits: number;
        toolHits: number;
        supportHits: number;
        evidence: string[];
    }>;
};

export type DomainAnchorDetectionDebug = {
    corpora: DetectorCorpora;
    familyScoreBreakdown: DomainFamilyScoreBreakdown[];
    tieBreakTrace: string[];
    initialWinnerFamily: Exclude<DomainFamily, null> | null;
    preCorrectionWinnerFamily: Exclude<DomainFamily, null> | null;
    chosenWinnerFamily: Exclude<DomainFamily, null> | null;
    runnerUpFamily: Exclude<DomainFamily, null> | null;
    chosenSpecializationHints: string[];
    dominantLayerScores: InterpretationLayerScore[];
    overrideApplied: boolean;
    overrideReason: string | null;
    overrideWinningFamily: string | null;
    verticalSpecializationScores: VerticalSpecializationScore[];
    domainWinnerCorrection: DetectorDomainWinnerCorrectionDebug;
    horizontalSpecificityRefinement: DetectorHorizontalSpecificityRefinementDebug;
};

const VERTICAL_OVERRIDE_SIGNAL_THRESHOLD = 2.7;
const VERTICAL_OVERRIDE_DOMINANCE_DELTA = 0.4;
const ONTOLOGY_MAPPING_MIN_SPECIALIZATION_SCORE = 3;
const ONTOLOGY_MAPPING_MIN_CANONICAL_MATCHES = 2;
const GENERIC_DATA_BI_KEYS = new Set(["bi_reporting"]);
const GENERIC_TOOL_TOKENS = new Set([
    "sql",
    "tableau",
    "power bi",
    "looker",
    "excel",
    "dashboard",
    "reporting",
    "bi",
]);

const VERTICAL_OVERRIDE_RULES: VerticalOverrideRule[] = [
    {
        family: "marketing",
        strongSignals: ["marketing", "media measurement", "mmm", "incrementality", "attribution", "campaign analytics"],
        supportSignals: ["martech", "brand", "channel mix"],
        toolSignals: ["google ads", "sa360", "dv360", "meta ads"],
    },
    {
        family: "product",
        strongSignals: ["product management", "product analytics", "feature adoption", "retention", "experimentation"],
        supportSignals: ["roadmap", "user behavior", "north star"],
        toolSignals: ["amplitude", "mixpanel"],
    },
    {
        family: "finance",
        strongSignals: ["fp&a", "financial services", "banking", "capital markets", "insurance", "regulatory reporting"],
        supportSignals: ["forecasting", "p&l", "risk controls"],
        toolSignals: ["anaplan", "sap"],
    },
    {
        family: "healthcare",
        strongSignals: ["healthcare", "clinical workflow", "patient", "medical", "hospital"],
        supportSignals: ["care pathway", "clinical operations"],
        toolSignals: ["epic", "cerner"],
    },
    {
        family: "retail",
        strongSignals: ["retail", "merchandising", "store operations", "category management", "omnichannel"],
        supportSignals: ["basket analysis", "promotion planning"],
        toolSignals: ["nielsen", "iri"],
    },
    {
        family: "supply_chain",
        strongSignals: ["supply chain", "procurement", "logistics", "inventory", "demand planning"],
        supportSignals: ["network optimization", "fulfillment"],
        toolSignals: ["blue yonder", "manhattan"],
    },
    {
        family: "consulting",
        strongSignals: ["consulting", "advisory", "client delivery", "engagement"],
        supportSignals: ["workshops", "transformation advisory"],
        toolSignals: ["powerpoint"],
    },
    {
        family: "data_platform",
        strongSignals: ["data platform", "data warehouse", "semantic layer", "etl", "data modeling"],
        supportSignals: ["platform migration", "governance"],
        toolSignals: ["snowflake", "databricks", "bigquery", "dbt"],
    },
    {
        family: "ai_ml",
        strongSignals: ["machine learning", "mlops", "model lifecycle", "ai transformation", "feature store"],
        supportSignals: ["model deployment", "inference pipeline"],
        toolSignals: ["sagemaker", "vertex ai", "azure ml", "mlflow"],
    },
    {
        family: "cybersecurity",
        strongSignals: ["cybersecurity", "security operations", "threat detection", "zero trust", "iam"],
        supportSignals: ["incident response", "security controls"],
        toolSignals: ["splunk", "crowdstrike", "sentinel"],
    },
    {
        family: "legal",
        strongSignals: ["legal workflows", "law firm", "legal operations", "contract review", "regulatory"],
        supportSignals: ["policy", "compliance"],
        toolSignals: ["relativity"],
    },
    {
        family: "hr_people",
        strongSignals: ["human resources", "people analytics", "talent acquisition", "workforce planning"],
        supportSignals: ["employee lifecycle", "org design"],
        toolSignals: ["workday", "successfactors"],
    },
    {
        family: "real_estate",
        strongSignals: ["real estate", "property", "asset management", "leasing", "portfolio occupancy"],
        supportSignals: ["property operations", "site selection"],
        toolSignals: ["yardi", "argus"],
    },
    {
        family: "energy",
        strongSignals: ["energy", "utilities", "grid", "power generation", "renewables"],
        supportSignals: ["trading", "asset optimization"],
        toolSignals: ["ge predix"],
    },
    {
        family: "media",
        strongSignals: ["media", "adtech", "programmatic", "audience measurement", "content analytics"],
        supportSignals: ["publisher", "broadcast"],
        toolSignals: ["dsp", "ad manager"],
    },
];

const ONTOLOGY_TO_LEGACY_FAMILY_MAP: Record<OntologyDomainFamily, Exclude<DomainFamily, null>> = {
    marketing: "marketing",
    product: "product",
    data: "data",
    finance: "business",
    consulting: "consulting",
    sales: "operations",
    operations: "operations",
    supply_chain: "operations",
    customer_success: "operations",
    hr_people: "domain_specialist",
    legal: "domain_specialist",
    healthcare: "domain_specialist",
    retail_commerce: "domain_specialist",
    media_content: "domain_specialist",
    energy_industrial: "domain_specialist",
    technology_platform: "engineering",
};

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countSignalHits(params: {
    corpus: string;
    signal: string;
}): number {
    const normalizedSignal = normalizeText(params.signal);
    if (!normalizedSignal) return 0;
    const tokenAware = escapeRegex(normalizedSignal).replace(/\s+/g, "\\s+");
    const pattern = new RegExp(`(?:^|\\b)${tokenAware}(?:\\b|$)`, "g");
    let count = 0;
    while (pattern.exec(params.corpus)) {
        count += 1;
    }
    return count;
}

function toSignalScore(params: {
    corpus: string;
    signals: string[];
    weight: number;
    label: "strong" | "method" | "tool" | "support";
}): {
    score: number;
    hits: number;
    evidence: string[];
} {
    let score = 0;
    let hits = 0;
    const evidence: string[] = [];
    for (const signal of params.signals) {
        const signalHits = countSignalHits({
            corpus: params.corpus,
            signal,
        });
        if (signalHits === 0) continue;
        hits += signalHits;
        score += signalHits * params.weight;
        if (signalHits > 1) {
            score += (signalHits - 1) * DOMAIN_SIGNAL_WEIGHTS.repeatBonus;
        }
        if (evidence.length < 8) {
            evidence.push(`${params.label}:${signal}:${signalHits}`);
        }
    }
    return {
        score: Number(score.toFixed(4)),
        hits,
        evidence,
    };
}

function scoreVerticalOverrideRule(params: {
    corpus: string;
    rule: VerticalOverrideRule;
}): VerticalSpecializationScore {
    const strong = toSignalScore({
        corpus: params.corpus,
        signals: params.rule.strongSignals,
        weight: 1.6,
        label: "strong",
    });
    const support = toSignalScore({
        corpus: params.corpus,
        signals: params.rule.supportSignals,
        weight: 1.1,
        label: "support",
    });
    const tool = toSignalScore({
        corpus: params.corpus,
        signals: params.rule.toolSignals,
        weight: 0.15,
        label: "tool",
    });
    const score = Number((strong.score + support.score + tool.score).toFixed(4));
    return {
        family: params.rule.family,
        score,
        strongHits: strong.hits,
        supportHits: support.hits,
        toolHits: tool.hits,
        evidence: [...strong.evidence, ...support.evidence, ...tool.evidence].slice(0, 10),
    };
}

function scoreVerticalOverrideFamilies(corpus: string): VerticalSpecializationScore[] {
    return VERTICAL_OVERRIDE_RULES
        .map((rule) => scoreVerticalOverrideRule({
            corpus,
            rule,
        }))
        .sort((left, right) => right.score - left.score);
}

function mapVerticalToDomainFamily(vertical: VerticalDomainFamily): Exclude<DomainFamily, null> {
    if (vertical === "marketing" || vertical === "media") return "marketing";
    if (vertical === "product") return "product";
    if (vertical === "consulting") return "consulting";
    if (vertical === "supply_chain") return "operations";
    if (vertical === "data_platform") return "data";
    if (vertical === "ai_ml" || vertical === "cybersecurity") return "engineering";
    if (vertical === "finance") return "business";
    return "domain_specialist";
}

function mapOntologyFamilyToDomainFamily(family: OntologyDomainFamily): Exclude<DomainFamily, null> {
    return ONTOLOGY_TO_LEGACY_FAMILY_MAP[family] ?? "domain_specialist";
}

function resolveOntologyToLegacyMapping(params: {
    ontologySpecializationAudit: DomainOntologySpecializationAudit;
}): OntologyToLegacyMappingResolution {
    const topSpecialization = params.ontologySpecializationAudit.top_specializations[0];
    if (!topSpecialization) {
        return {
            ontology_family_before_mapping: null,
            mapped_legacy_family: null,
            mapping_reason: "no_top_specialization",
            mapping_confidence_basis: "no_specialization_signal",
        };
    }
    const mappedLegacyFamily = mapOntologyFamilyToDomainFamily(topSpecialization.family);
    const vote = params.ontologySpecializationAudit.specialization_votes
        .find((item) => item.specialization === topSpecialization.specialization);
    const canonicalMatches = vote?.matched_canonical_signals.length ?? 0;
    const strong = topSpecialization.total_score >= ONTOLOGY_MAPPING_MIN_SPECIALIZATION_SCORE
        && canonicalMatches >= ONTOLOGY_MAPPING_MIN_CANONICAL_MATCHES;
    return {
        ontology_family_before_mapping: topSpecialization.family,
        mapped_legacy_family: mappedLegacyFamily,
        mapping_reason: strong
            ? "strong_top_specialization_mapping"
            : "low_confidence_top_specialization_mapping",
        mapping_confidence_basis: `score=${topSpecialization.total_score.toFixed(4)};canonical_matches=${canonicalMatches};thresholds(score>=${ONTOLOGY_MAPPING_MIN_SPECIALIZATION_SCORE},canonical>=${ONTOLOGY_MAPPING_MIN_CANONICAL_MATCHES})`,
    };
}

function genericToolOnlySignal(specialization: VerticalSpecializationScore): boolean {
    if (specialization.strongHits + specialization.supportHits > 0) return false;
    const toolEvidence = specialization.evidence
        .filter((entry) => entry.startsWith("tool:"))
        .map((entry) => entry.split(":")[1]?.trim())
        .filter((token): token is string => Boolean(token));
    if (toolEvidence.length === 0) return false;
    return toolEvidence.every((token) => GENERIC_TOOL_TOKENS.has(normalizeText(token)));
}

function scoreSpecialization(params: {
    corpus: string;
    specialization: SpecializationConfig;
}): SpecializationScore {
    const strong = toSignalScore({
        corpus: params.corpus,
        signals: params.specialization.strongSignals,
        weight: DOMAIN_SIGNAL_WEIGHTS.strong,
        label: "strong",
    });
    const method = toSignalScore({
        corpus: params.corpus,
        signals: params.specialization.methodSignals ?? [],
        weight: DOMAIN_SIGNAL_WEIGHTS.method,
        label: "method",
    });
    const tool = toSignalScore({
        corpus: params.corpus,
        signals: params.specialization.toolSignals ?? [],
        weight: DOMAIN_SIGNAL_WEIGHTS.tool,
        label: "tool",
    });
    const support = toSignalScore({
        corpus: params.corpus,
        signals: params.specialization.supportSignals ?? [],
        weight: DOMAIN_SIGNAL_WEIGHTS.support,
        label: "support",
    });
    const score = strong.score + method.score + tool.score + support.score;
    return {
        key: params.specialization.key,
        interpretationLayer: params.specialization.interpretationLayer,
        score: Number(score.toFixed(4)),
        strongHits: strong.hits,
        methodHits: method.hits,
        toolHits: tool.hits,
        supportHits: support.hits,
        evidence: [
            ...strong.evidence,
            ...method.evidence,
            ...tool.evidence,
            ...support.evidence,
        ].slice(0, 10),
    };
}

function scoreFamily(params: {
    corpus: string;
    familyConfig: DomainFamilyConfig;
}): FamilyScore {
    const specializationScores = params.familyConfig.specializations
        .map((specialization) => scoreSpecialization({
            corpus: params.corpus,
            specialization,
        }))
        .sort((left, right) => right.score - left.score);
    const strongest = specializationScores[0];
    const second = specializationScores[1];
    const score = (strongest?.score ?? 0) + ((second?.score ?? 0) * 0.42);
    const domainEvidenceStrength = ((strongest?.strongHits ?? 0) * 1.2)
        + ((strongest?.methodHits ?? 0) * 1.1)
        + ((strongest?.toolHits ?? 0) * 0.9)
        + ((second?.strongHits ?? 0) * 0.4);
    const evidence = specializationScores
        .slice(0, 2)
        .flatMap((item) => item.evidence.map((entry) => `${params.familyConfig.family}/${item.key}/${entry}`))
        .slice(0, 12);
    return {
        family: params.familyConfig.family,
        score: Number(score.toFixed(4)),
        domainEvidenceStrength: Number(domainEvidenceStrength.toFixed(4)),
        specializationScores,
        evidence,
    };
}

function buildCorpora(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
}): DetectorCorpora {
    const titleCorpus = normalizeText([
        params.jobTitle,
        params.parsedSignals.target_title ?? "",
        params.parsedSignals.role_family ?? "",
    ].join(" "));
    const bodyCorpus = normalizeText([
        ...params.parsedSignals.required_skills,
        ...params.parsedSignals.preferred_skills,
        ...params.parsedSignals.responsibilities,
        ...params.parsedSignals.domains,
        ...params.parsedSignals.keywords,
    ].join(" "));
    const clusterCorpus = normalizeText(
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
        titleCorpus,
        bodyCorpus,
        clusterCorpus,
        joinedCorpus: normalizeText(`${titleCorpus} ${bodyCorpus} ${clusterCorpus}`),
    };
}

function countGenericRoleLanguageHits(corpus: string): number {
    return GENERIC_ROLE_LANGUAGE_SIGNALS.reduce((sum, signal) => {
        return sum + countSignalHits({
            corpus,
            signal,
        });
    }, 0);
}

function chooseWinningFamily(
    familyScores: FamilyScore[],
    corpus: string,
    tieBreakTrace?: string[],
): FamilyScore | null {
    if (familyScores.length === 0) return null;
    const ranked = [...familyScores].sort((left, right) => right.score - left.score);
    let winner = ranked[0];
    const runnerUp = ranked[1];
    if (tieBreakTrace && winner) {
        tieBreakTrace.push(`initial_winner:${winner.family}:score=${winner.score}`);
    }

    if (
        winner.family === "consulting"
        && runnerUp
        && runnerUp.family !== "consulting"
        && runnerUp.score >= winner.score - 0.9
        && runnerUp.domainEvidenceStrength >= winner.domainEvidenceStrength + 0.7
    ) {
        if (tieBreakTrace) {
            tieBreakTrace.push(
                `override_consulting_to_substantive:${winner.family}->${runnerUp.family}:runner_up_domain_strength=${runnerUp.domainEvidenceStrength}`,
            );
        }
        winner = runnerUp;
    }

    const domainSpecialist = ranked.find((item) => item.family === "domain_specialist");
    if (
        domainSpecialist
        && domainSpecialist.score >= DOMAIN_FAMILY_SCORE_THRESHOLD
        && domainSpecialist.domainEvidenceStrength >= 2.2
        && domainSpecialist.score >= winner.score - 0.55
    ) {
        if (tieBreakTrace) {
            tieBreakTrace.push(
                `override_to_domain_specialist:from=${winner.family}:candidate_score=${domainSpecialist.score}:candidate_domain_strength=${domainSpecialist.domainEvidenceStrength}`,
            );
        }
        winner = domainSpecialist;
    }

    const genericHits = countGenericRoleLanguageHits(corpus);
    if (
        runnerUp
        && winner.score >= DOMAIN_FAMILY_SCORE_THRESHOLD
        && winner.domainEvidenceStrength < 1.2
        && genericHits >= 3
        && runnerUp.domainEvidenceStrength >= winner.domainEvidenceStrength + 0.8
        && runnerUp.score >= winner.score - 0.8
    ) {
        if (tieBreakTrace) {
            tieBreakTrace.push(
                `override_generic_role_bias:${winner.family}->${runnerUp.family}:generic_hits=${genericHits}`,
            );
        }
        winner = runnerUp;
    }
    if (tieBreakTrace && winner) {
        tieBreakTrace.push(`final_winner:${winner.family}:score=${winner.score}`);
    }
    return winner;
}

export function applyDomainOverridePriority(
    familyScores: Array<{
        family: Exclude<DomainFamily, null>;
        score: number;
        specializationScores: Array<{ key: string; score: number }>;
    }>,
    specializationScores: Array<{
        family: VerticalDomainFamily;
        score: number;
        strongHits: number;
        supportHits: number;
        toolHits: number;
        evidence: string[];
    }>,
): DomainOverrideResult {
    const rankedFamilyScores = [...familyScores].sort((left, right) => right.score - left.score);
    const baseWinner = rankedFamilyScores[0];
    if (!baseWinner) {
        return {
            winningFamily: null,
            overrideApplied: false,
            overrideReason: "no_family_scores",
        };
    }

    const rankedVerticalScores = [...specializationScores]
        .sort((left, right) => right.score - left.score);
    const topVertical = rankedVerticalScores[0];
    const secondVertical = rankedVerticalScores[1];
    if (!topVertical) {
        return {
            winningFamily: baseWinner.family,
            overrideApplied: false,
            overrideReason: "no_vertical_signal_candidates",
        };
    }

    if (genericToolOnlySignal(topVertical)) {
        return {
            winningFamily: baseWinner.family,
            overrideApplied: false,
            overrideReason: "tools_only_signal_not_allowed",
        };
    }

    const topVerticalDominanceScore = topVertical.score + (topVertical.strongHits * 0.5) + (topVertical.supportHits * 0.25);
    const secondVerticalDominanceScore = secondVertical
        ? secondVertical.score + (secondVertical.strongHits * 0.5) + (secondVertical.supportHits * 0.25)
        : 0;
    const verticalStrongEnough = topVerticalDominanceScore >= VERTICAL_OVERRIDE_SIGNAL_THRESHOLD;
    const verticalDominant = topVerticalDominanceScore >= (secondVerticalDominanceScore + VERTICAL_OVERRIDE_DOMINANCE_DELTA);
    const baseWinnerHasGenericDataBias = baseWinner.family === "data"
        && baseWinner.specializationScores.some((specialization) => GENERIC_DATA_BI_KEYS.has(specialization.key));
    const mappedFamily = mapVerticalToDomainFamily(topVertical.family);

    if (verticalStrongEnough && verticalDominant && (baseWinnerHasGenericDataBias || mappedFamily !== baseWinner.family)) {
        return {
            winningFamily: topVertical.family,
            overrideApplied: true,
            overrideReason: `vertical_signal_override:${topVertical.family}:dominance=${topVerticalDominanceScore.toFixed(3)}`,
        };
    }

    return {
        winningFamily: baseWinner.family,
        overrideApplied: false,
        overrideReason: "base_family_retained",
    };
}

function toConfidence(params: {
    score: number;
    margin: number;
    domainEvidenceStrength: number;
}): number {
    return Number(clamp(
        0.28
        + Math.min(0.42, params.score * 0.065)
        + Math.min(0.18, params.margin * 0.16)
        + Math.min(0.12, params.domainEvidenceStrength * 0.05),
        0.18,
        0.96,
    ).toFixed(4));
}

function selectSpecializationHints(winner: FamilyScore): string[] {
    const selected = winner.specializationScores
        .filter((item) => item.score >= SPECIALIZATION_SCORE_THRESHOLD)
        .slice(0, 2)
        .map((item) => item.key);
    if (selected.length > 0) return selected;
    const fallback = winner.specializationScores[0];
    if (fallback && fallback.score >= SPECIALIZATION_SCORE_THRESHOLD * 0.65) {
        return [fallback.key];
    }
    return [];
}

function toLayerSignalScore(params: {
    corpus: string;
    layer: InterpretationLayer;
    signals: string[];
    weight: number;
}): InterpretationLayerScore {
    const scored = toSignalScore({
        corpus: params.corpus,
        signals: params.signals,
        weight: params.weight,
        label: "support",
    });
    return {
        layer: params.layer,
        score: scored.score,
        evidence: scored.evidence.map((entry) => `${params.layer}/${entry}`),
    };
}

function toDominantLayers(params: {
    corpora: DetectorCorpora;
    winner: FamilyScore | null;
}): InterpretationLayerScore[] {
    const layerScores: InterpretationLayerScore[] = [];
    if (params.winner) {
        const domainScore = params.winner.specializationScores
            .filter((item) => item.interpretationLayer === "domain_defining")
            .slice(0, 2)
            .reduce((sum, item) => sum + item.score, 0);
        layerScores.push({
            layer: "domain_defining",
            score: Number(domainScore.toFixed(4)),
            evidence: params.winner.evidence.slice(0, 8),
        });
    }
    layerScores.push(
        toLayerSignalScore({
            corpus: params.corpora.joinedCorpus,
            layer: "functional_role",
            signals: FUNCTIONAL_ROLE_SIGNALS,
            weight: 1.45,
        }),
        toLayerSignalScore({
            corpus: params.corpora.joinedCorpus,
            layer: "work_mode",
            signals: WORK_MODE_SIGNALS,
            weight: 1.1,
        }),
        toLayerSignalScore({
            corpus: params.corpora.joinedCorpus,
            layer: "generic",
            signals: GENERIC_TRANSFERABLE_SIGNALS,
            weight: 0.85,
        }),
    );
    const sorted = layerScores.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return INTERPRETATION_LAYER_PRIORITY[right.layer] - INTERPRETATION_LAYER_PRIORITY[left.layer];
    });
    const thresholds: Record<InterpretationLayer, number> = {
        domain_defining: 1.2,
        functional_role: 1.05,
        work_mode: 0.9,
        generic: 0.75,
    };
    const selected = sorted.filter((item) => item.score >= thresholds[item.layer]).slice(0, 3);
    if (selected.length > 0) return selected;
    return sorted.slice(0, 1);
}

function collectAnchorSpecializationSignals(domainAnchor: DomainAnchor): string[] {
    if (!domainAnchor.domainFamily) return [];
    const familyConfig = getDomainFamilyConfig(domainAnchor.domainFamily);
    if (!familyConfig) return [];
    const specializationSet = new Set(domainAnchor.specializationHints);
    const selected = specializationSet.size > 0
        ? familyConfig.specializations.filter((item) => specializationSet.has(item.key))
        : familyConfig.specializations;
    return Array.from(
        new Set(
            selected.flatMap((specialization) => [
                ...specialization.strongSignals,
                ...(specialization.methodSignals ?? []),
                ...(specialization.toolSignals ?? []),
                ...(specialization.supportSignals ?? []),
            ]),
        ),
    );
}

export function getDomainFamilyConfig(family: DomainFamily): DomainFamilyConfig | null {
    if (!family) return null;
    return DOMAIN_FAMILY_REGISTRY.find((item) => item.family === family) ?? null;
}

function buildDomainAnchorDetection(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
}): {
    anchor: DomainAnchor;
    debug: DomainAnchorDetectionDebug;
} {
    const corpora = buildCorpora(params);
    const familyScores = DOMAIN_FAMILY_REGISTRY
        .map((familyConfig) => scoreFamily({
            corpus: corpora.joinedCorpus,
            familyConfig,
        }))
        .sort((left, right) => right.score - left.score);
    const tieBreakTrace: string[] = [];
    const baseWinner = chooseWinningFamily(familyScores, corpora.joinedCorpus, tieBreakTrace);
    const verticalSpecializationScores = scoreVerticalOverrideFamilies(corpora.joinedCorpus);
    const domainOverride = applyDomainOverridePriority(
        familyScores.map((item) => ({
            family: item.family,
            score: item.score,
            specializationScores: item.specializationScores.map((specialization) => ({
                key: specialization.key,
                score: specialization.score,
            })),
        })),
        verticalSpecializationScores,
    );
    let winner = baseWinner;
    if (domainOverride.overrideApplied) {
        const mappedFamily = mapVerticalToDomainFamily(domainOverride.winningFamily as VerticalDomainFamily);
        const overridden = familyScores.find((item) => item.family === mappedFamily);
        if (overridden) {
            winner = overridden;
            tieBreakTrace.push(`domain_override_applied:${domainOverride.overrideReason ?? "unknown"}`);
        } else {
            tieBreakTrace.push(`domain_override_candidate_not_mapped:${String(domainOverride.winningFamily)}`);
        }
    } else if (domainOverride.overrideReason) {
        tieBreakTrace.push(`domain_override_skipped:${domainOverride.overrideReason}`);
    }
    const preCorrectionWinnerFamily = winner?.family ?? null;
    const ontologySpecializationAudit = buildDomainOntologySpecializationAudit({
        jobTitle: params.jobTitle,
        parsedSignals: params.parsedSignals,
        matchResult: params.matchResult,
        detectorWinningFamily: preCorrectionWinnerFamily,
    });
    const ontologyToLegacyMapping = resolveOntologyToLegacyMapping({
        ontologySpecializationAudit,
    });
    tieBreakTrace.push(
        `ontology_legacy_mapping:${ontologyToLegacyMapping.mapping_reason}:ontology=${ontologyToLegacyMapping.ontology_family_before_mapping ?? "none"}:legacy=${ontologyToLegacyMapping.mapped_legacy_family ?? "none"}`,
    );
    const domainWinnerCorrection = applyDomainWinnerCorrection({
        current_winner_family: preCorrectionWinnerFamily,
        ontology_specialization_votes: ontologySpecializationAudit.specialization_votes,
        ontology_family_aggregation: ontologySpecializationAudit.family_aggregation,
        ontology_top_specializations: ontologySpecializationAudit.top_specializations,
    });
    let correctedWinnerApplied: Exclude<DomainFamily, null> | null = preCorrectionWinnerFamily;
    if (domainWinnerCorrection.correction_applied && domainWinnerCorrection.corrected_winner) {
        const mappedFamily = mapOntologyFamilyToDomainFamily(domainWinnerCorrection.corrected_winner);
        const correctedFamilyScore = familyScores.find((item) => item.family === mappedFamily);
        if (correctedFamilyScore) {
            winner = correctedFamilyScore;
            correctedWinnerApplied = correctedFamilyScore.family;
            tieBreakTrace.push(
                `domain_winner_correction_applied:${domainWinnerCorrection.correction_reason}:${String(preCorrectionWinnerFamily)}->${correctedFamilyScore.family}:${domainWinnerCorrection.top_specialization ?? "none"}`,
            );
        } else {
            tieBreakTrace.push(`domain_winner_correction_candidate_not_scored:${mappedFamily}`);
        }
    } else {
        tieBreakTrace.push(`domain_winner_correction_skipped:${domainWinnerCorrection.correction_reason}`);
    }
    const horizontalSpecificityRefinement = applyHorizontalSpecificityRefinement({
        current_winner_family: correctedWinnerApplied,
        ontology_specialization_votes: ontologySpecializationAudit.specialization_votes,
        ontology_family_aggregation: ontologySpecializationAudit.family_aggregation,
        ontology_top_specializations: ontologySpecializationAudit.top_specializations,
    });
    let refinedWinnerAppliedLegacy: Exclude<DomainFamily, null> | null = correctedWinnerApplied;
    if (horizontalSpecificityRefinement.refinement_applied && horizontalSpecificityRefinement.refined_winner) {
        const mappedFamily = mapOntologyFamilyToDomainFamily(horizontalSpecificityRefinement.refined_winner);
        const refinedFamilyScore = familyScores.find((item) => item.family === mappedFamily);
        if (refinedFamilyScore) {
            winner = refinedFamilyScore;
            refinedWinnerAppliedLegacy = refinedFamilyScore.family;
            tieBreakTrace.push(
                `horizontal_specificity_refinement_applied:${horizontalSpecificityRefinement.refinement_reason}:${String(correctedWinnerApplied)}->${refinedFamilyScore.family}:${horizontalSpecificityRefinement.top_specialization ?? "none"}`,
            );
        } else {
            tieBreakTrace.push(`horizontal_specificity_refinement_candidate_not_scored:${mappedFamily}`);
        }
    } else {
        tieBreakTrace.push(`horizontal_specificity_refinement_skipped:${horizontalSpecificityRefinement.refinement_reason}`);
    }
    const dominantLayerScores = toDominantLayers({
        corpora,
        winner,
    });
    const initialWinner = familyScores[0]?.family ?? null;
    const runnerUp = familyScores.find((item) => item.family !== (winner?.family ?? null))?.family ?? null;
    const chosenSpecializationHints = winner ? selectSpecializationHints(winner) : [];
    const debug: DomainAnchorDetectionDebug = {
        corpora,
        familyScoreBreakdown: familyScores.map((family) => ({
            family: family.family,
            score: family.score,
            domainEvidenceStrength: family.domainEvidenceStrength,
            specializationScores: family.specializationScores.map((specialization) => ({
                key: specialization.key,
                interpretationLayer: specialization.interpretationLayer,
                score: specialization.score,
                strongHits: specialization.strongHits,
                methodHits: specialization.methodHits,
                toolHits: specialization.toolHits,
                supportHits: specialization.supportHits,
                evidence: specialization.evidence,
            })),
        })),
        tieBreakTrace,
        initialWinnerFamily: initialWinner,
        preCorrectionWinnerFamily,
        chosenWinnerFamily: winner?.family ?? null,
        runnerUpFamily: runnerUp,
        chosenSpecializationHints,
        dominantLayerScores,
        overrideApplied: domainOverride.overrideApplied,
        overrideReason: domainOverride.overrideReason,
        overrideWinningFamily: domainOverride.winningFamily,
        verticalSpecializationScores,
        domainWinnerCorrection: {
            ...domainWinnerCorrection,
            corrected_winner_applied: correctedWinnerApplied,
            ontology_family_before_mapping: ontologyToLegacyMapping.ontology_family_before_mapping,
            mapped_legacy_family: ontologyToLegacyMapping.mapped_legacy_family,
            mapping_reason: ontologyToLegacyMapping.mapping_reason,
            mapping_confidence_basis: ontologyToLegacyMapping.mapping_confidence_basis,
        },
        horizontalSpecificityRefinement: {
            ...horizontalSpecificityRefinement,
            refined_winner_applied_legacy: refinedWinnerAppliedLegacy,
        },
    };
    if (!winner || winner.score < DOMAIN_FAMILY_SCORE_THRESHOLD) {
        return {
            anchor: {
                domainFamily: null,
                specializationHints: [],
                dominantLayers: dominantLayerScores.map((item) => item.layer),
                confidence: 0,
                evidence: dominantLayerScores.flatMap((item) => item.evidence).slice(0, 10),
            },
            debug,
        };
    }
    const runnerUpScore = familyScores.find((item) => item.family !== winner.family)?.score ?? 0;
    return {
        anchor: {
            domainFamily: winner.family,
            specializationHints: chosenSpecializationHints,
            dominantLayers: dominantLayerScores.map((item) => item.layer),
            confidence: toConfidence({
                score: winner.score,
                margin: winner.score - runnerUpScore,
                domainEvidenceStrength: winner.domainEvidenceStrength,
            }),
            evidence: winner.evidence,
        },
        debug,
    };
}

export function detectDomainAnchor(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
}): DomainAnchor {
    return buildDomainAnchorDetection(params).anchor;
}

export function debugDomainAnchorDetection(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
}): DomainAnchorDetectionDebug {
    return buildDomainAnchorDetection(params).debug;
}

export function getInterpretationLayerPriority(layer: InterpretationLayer): number {
    return INTERPRETATION_LAYER_PRIORITY[layer];
}

export function detectInterpretationLayerForText(input: {
    text: string;
    domainAnchor?: DomainAnchor;
}): {
    layer: InterpretationLayer;
    score: number;
    evidence: string[];
} {
    const normalized = normalizeText(input.text);
    if (!normalized) {
        return {
            layer: "generic",
            score: 0,
            evidence: [],
        };
    }
    const domainAnchor = input.domainAnchor;
    const domainRelevance = domainAnchor
        ? computeDomainAnchorRelevance({
            text: normalized,
            domainAnchor,
        })
        : 0;
    const domainSignals = domainAnchor
        ? collectAnchorSpecializationSignals(domainAnchor)
        : [];
    const domainSignalScore = domainSignals.length > 0
        ? toSignalScore({
            corpus: normalized,
            signals: domainSignals,
            weight: 1.2,
            label: "strong",
        })
        : { score: 0, hits: 0, evidence: [] };
    const domainLayerScore: InterpretationLayerScore = {
        layer: "domain_defining",
        score: Number(((domainRelevance * 2.4) + (domainSignalScore.score * 0.55)).toFixed(4)),
        evidence: domainSignalScore.evidence.slice(0, 6).map((item) => `domain_defining/${item}`),
    };
    const functionalLayerScore = toLayerSignalScore({
        corpus: normalized,
        layer: "functional_role",
        signals: FUNCTIONAL_ROLE_SIGNALS,
        weight: 1.2,
    });
    const workModeLayerScore = toLayerSignalScore({
        corpus: normalized,
        layer: "work_mode",
        signals: WORK_MODE_SIGNALS,
        weight: 1,
    });
    const genericLayerScore = toLayerSignalScore({
        corpus: normalized,
        layer: "generic",
        signals: GENERIC_TRANSFERABLE_SIGNALS,
        weight: 0.82,
    });
    const ranked = [
        domainLayerScore,
        functionalLayerScore,
        workModeLayerScore,
        genericLayerScore,
    ].sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return INTERPRETATION_LAYER_PRIORITY[right.layer] - INTERPRETATION_LAYER_PRIORITY[left.layer];
    });
    const best = ranked[0];
    return {
        layer: best.layer,
        score: Number(clamp(best.score / 3.2, 0, 1).toFixed(4)),
        evidence: best.evidence.slice(0, 5),
    };
}

export function computeDomainAnchorRelevance(input: {
    text: string;
    domainAnchor: DomainAnchor;
}): number {
    if (!input.domainAnchor.domainFamily) return 0;
    const normalized = normalizeText(input.text);
    if (!normalized) return 0;
    const familyConfig = getDomainFamilyConfig(input.domainAnchor.domainFamily);
    if (!familyConfig) return 0;

    const specializationSet = new Set(input.domainAnchor.specializationHints);
    const specializations = specializationSet.size > 0
        ? familyConfig.specializations.filter((item) => specializationSet.has(item.key))
        : familyConfig.specializations;
    let relevance = 0;
    for (const specialization of specializations) {
        const strongHits = toSignalScore({
            corpus: normalized,
            signals: specialization.strongSignals,
            weight: 1,
            label: "strong",
        }).hits;
        const methodHits = toSignalScore({
            corpus: normalized,
            signals: specialization.methodSignals ?? [],
            weight: 1,
            label: "method",
        }).hits;
        const toolHits = toSignalScore({
            corpus: normalized,
            signals: specialization.toolSignals ?? [],
            weight: 1,
            label: "tool",
        }).hits;
        const supportHits = toSignalScore({
            corpus: normalized,
            signals: specialization.supportSignals ?? [],
            weight: 1,
            label: "support",
        }).hits;
        relevance = Math.max(
            relevance,
            (strongHits * 0.36) + (methodHits * 0.32) + (toolHits * 0.2) + (supportHits * 0.12),
        );
    }
    const anchored = relevance * (0.62 + (input.domainAnchor.confidence * 0.38));
    return Number(clamp(anchored / 2.6, 0, 1).toFixed(4));
}

export function toDomainFamilyLabel(domainFamily: DomainFamily): string {
    if (!domainFamily) return "general";
    if (domainFamily === "domain_specialist") return "domain specialist";
    return domainFamily.replace(/_/g, " ");
}
