import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { debugDomainAnchorDetection } from "@/lib/career-engine/job-copilot/domain-family-detector";
import {
    buildDomainOntologySpecializationAudit,
    type FamilyVoteAggregationAudit,
    type SpecializationSignalVoteAudit,
} from "@/lib/career-engine/job-copilot/domain-ontology-audit";
import {
    DOMAIN_ONTOLOGY_SKELETON,
    type DomainFamily,
    type DomainType,
} from "@/lib/career-engine/job-copilot/domain-ontology-config";
import { DOMAIN_WINNER_CORRECTION_CONFIG } from "@/lib/career-engine/job-copilot/domain-winner-correction";

type TriageCase = {
    case_name: string;
    title: string;
    expected_family: DomainFamily;
    job_description: string;
};

type RootCause =
    | "weak_signal_coverage"
    | "legacy_family_mapping_gap"
    | "horizontal_family_score_domination"
    | "correction_threshold_too_strict"
    | "specialization_not_detected"
    | "unknown_detector_family";

type RecommendedFixCategory =
    | "add specialization signals"
    | "adjust ontology family mapping"
    | "adjust correction threshold"
    | "adjust family aggregation logic";

type SpecializationBreakdown = {
    specialization: string;
    family: DomainFamily;
    canonical_signal_hits: number;
    anti_signal_hits: number;
    tool_hits: number;
    specialization_score: number;
};

type CaseTriage = {
    case_name: string;
    expected_family: DomainFamily;
    detector_outputs: {
        original_winner_family: DomainFamily | "unknown";
        corrected_winner_family: DomainFamily | "unknown";
        correction_applied: boolean;
        correction_reason: string;
    };
    top_specializations: SpecializationBreakdown[];
    family_aggregation_scores: Record<string, number>;
    vertical_family_scores: Record<string, number>;
    horizontal_family_scores: Record<string, number>;
    matched_canonical_signals_by_specialization: Record<string, string[]>;
    matched_anti_signals_by_specialization: Record<string, string[]>;
    matched_common_tools_by_specialization: Record<string, string[]>;
    correction_conditions: {
        condition_1_original_horizontal: boolean;
        condition_2_top_specialization_vertical: boolean;
        condition_3_specialization_score_threshold: boolean;
        condition_4_vertical_vs_horizontal_score_ratio: boolean;
        condition_5_min_canonical_signals: boolean;
    };
    scores_for_conditions: {
        top_specialization_score: number;
        vertical_family_score: number;
        horizontal_family_score: number;
        vertical_horizontal_ratio: number;
        canonical_signal_match_count: number;
    };
    root_cause: RootCause;
    explanation: string;
    recommended_fix_category: RecommendedFixCategory;
};

type TriageOutput = {
    generated_at: string;
    cases_analyzed: number;
    cases: CaseTriage[];
    summary: {
        root_cause_counts: Record<RootCause, number>;
    };
};

const LEGACY_TO_ONTOLOGY_FAMILY: Record<string, DomainFamily | "unknown"> = {
    marketing: "marketing",
    product: "product",
    data: "data",
    engineering: "technology_platform",
    consulting: "consulting",
    operations: "operations",
    business: "finance",
    domain_specialist: "unknown",
};

const HORIZONTAL_FAMILIES = new Set<DomainFamily>([
    "data",
    "operations",
    "technology_platform",
    "sales",
    "customer_success",
]);

const FAILING_CASES: TriageCase[] = [
    {
        case_name: "people_analytics_1",
        title: "People Analytics Partner",
        expected_family: "hr_people",
        job_description: "Build people analytics for workforce planning, employee data quality, attrition analysis and talent funnel insights. Deliver HR analytics reporting on engagement, headcount and organizational effectiveness for business leaders.",
    },
    {
        case_name: "sales_operations_1",
        title: "Sales Operations Lead",
        expected_family: "sales",
        job_description: "Lead sales operations including crm governance, pipeline management, forecasting rhythm and territory planning support. Improve sales process consistency and reporting for go to market execution.",
    },
    {
        case_name: "data_platform_1",
        title: "Director, Data Platform",
        expected_family: "technology_platform",
        job_description: "Define data platform strategy across data infrastructure, platform architecture and data enablement capabilities. Lead shared services for self service data, platform reliability and long-term platform roadmap.",
    },
];

function toOntologyFamily(params: {
    legacyFamily: string | null;
    ontologyFamilyBeforeMapping?: DomainFamily | null;
    mappingReason?: string | null;
}): DomainFamily | "unknown" {
    const input = params.legacyFamily;
    if (!input) return "unknown";
    const mapped = LEGACY_TO_ONTOLOGY_FAMILY[input] ?? "unknown";
    if (
        mapped === "unknown"
        && params.ontologyFamilyBeforeMapping
        && params.mappingReason === "strong_top_specialization_mapping"
    ) {
        return params.ontologyFamilyBeforeMapping;
    }
    return mapped;
}

function toDomainType(family: DomainFamily | "unknown"): DomainType | "unknown" {
    if (family === "unknown") return "unknown";
    return DOMAIN_ONTOLOGY_SKELETON[family].type;
}

function sumHits(items: Array<{ hits: number }>): number {
    return items.reduce((sum, item) => sum + item.hits, 0);
}

function toSignalTokens(items: Array<{ signal: string; hits: number }>): string[] {
    return items.map((item) => `${item.signal} (${item.hits})`);
}

function scoreMapByType(
    familyAggregation: FamilyVoteAggregationAudit[],
): {
    all: Record<string, number>;
    vertical: Record<string, number>;
    horizontal: Record<string, number>;
} {
    const all: Record<string, number> = {};
    const vertical: Record<string, number> = {};
    const horizontal: Record<string, number> = {};
    for (const family of familyAggregation) {
        all[family.family] = Number(family.total_score.toFixed(4));
        if (family.domain_type === "vertical") {
            vertical[family.family] = Number(family.total_score.toFixed(4));
        } else {
            horizontal[family.family] = Number(family.total_score.toFixed(4));
        }
    }
    return { all, vertical, horizontal };
}

function findFamilyScore(
    familyAggregation: FamilyVoteAggregationAudit[],
    family: DomainFamily | "unknown",
): number {
    if (family === "unknown") return 0;
    return familyAggregation.find((entry) => entry.family === family)?.total_score ?? 0;
}

function classifyRootCause(params: {
    expectedFamily: DomainFamily;
    originalFamily: DomainFamily | "unknown";
    topSpecialization: SpecializationSignalVoteAudit | null;
    conditions: CaseTriage["correction_conditions"];
    scores: CaseTriage["scores_for_conditions"];
}): {
    root_cause: RootCause;
    explanation: string;
    recommended_fix_category: RecommendedFixCategory;
} {
    if (params.originalFamily === "unknown") {
        return {
            root_cause: "unknown_detector_family",
            explanation: "Detector winner mapped to unknown, so correction gate did not run as a horizontal->vertical transition.",
            recommended_fix_category: "adjust ontology family mapping",
        };
    }

    if (!params.topSpecialization) {
        return {
            root_cause: "specialization_not_detected",
            explanation: "No specialization vote surfaced in ontology audit, so correction lacked a vertical candidate anchor.",
            recommended_fix_category: "add specialization signals",
        };
    }

    if (!params.conditions.condition_2_top_specialization_vertical) {
        return {
            root_cause: "horizontal_family_score_domination",
            explanation: "Top specialization stayed in a horizontal family, so no vertical override candidate was available.",
            recommended_fix_category: "adjust family aggregation logic",
        };
    }

    if (!params.conditions.condition_3_specialization_score_threshold && params.scores.top_specialization_score > 1.8) {
        return {
            root_cause: "correction_threshold_too_strict",
            explanation: "Vertical specialization was detected but score sat below configured override threshold.",
            recommended_fix_category: "adjust correction threshold",
        };
    }

    if (!params.conditions.condition_5_min_canonical_signals) {
        return {
            root_cause: "weak_signal_coverage",
            explanation: "Too few canonical signals matched for the top specialization to satisfy correction safety gates.",
            recommended_fix_category: "add specialization signals",
        };
    }

    if (!params.conditions.condition_4_vertical_vs_horizontal_score_ratio) {
        return {
            root_cause: "horizontal_family_score_domination",
            explanation: "Vertical family evidence exists but remains too weak versus the horizontal winner score ratio gate.",
            recommended_fix_category: "adjust family aggregation logic",
        };
    }

    return {
        root_cause: "legacy_family_mapping_gap",
        explanation: "Correction gates were mostly satisfied but final family mapping did not land on expected ontology family.",
        recommended_fix_category: "adjust ontology family mapping",
    };
}

function runCase(input: TriageCase): CaseTriage {
    const parsedSignals = buildJobSignalsFromRawJd({
        rawJd: input.job_description,
        fallbackTitle: input.title,
    });
    const domainAudit = debugDomainAnchorDetection({
        jobTitle: input.title,
        parsedSignals,
    });
    const ontologyAudit = buildDomainOntologySpecializationAudit({
        jobTitle: input.title,
        parsedSignals,
        detectorWinningFamily: domainAudit.chosenWinnerFamily,
    });

    const originalFamily = toOntologyFamily({
        legacyFamily: domainAudit.preCorrectionWinnerFamily,
        ontologyFamilyBeforeMapping: domainAudit.domainWinnerCorrection.ontology_family_before_mapping,
        mappingReason: domainAudit.domainWinnerCorrection.mapping_reason,
    });
    const correctedFamily = domainAudit.domainWinnerCorrection.corrected_winner
        ?? toOntologyFamily({
            legacyFamily: domainAudit.chosenWinnerFamily,
            ontologyFamilyBeforeMapping: domainAudit.domainWinnerCorrection.ontology_family_before_mapping,
            mappingReason: domainAudit.domainWinnerCorrection.mapping_reason,
        });
    const topSpecializationVote = ontologyAudit.specialization_votes[0] ?? null;
    const topSpecializations = ontologyAudit.specialization_votes
        .slice(0, 5)
        .map((item) => ({
            specialization: item.specialization,
            family: item.family,
            canonical_signal_hits: sumHits(item.matched_canonical_signals),
            anti_signal_hits: sumHits(item.matched_anti_signals),
            tool_hits: sumHits(item.matched_common_tools),
            specialization_score: Number(item.total_score.toFixed(4)),
        }));
    const signalMaps = {
        canonical: Object.fromEntries(
            ontologyAudit.specialization_votes
                .slice(0, 5)
                .map((item) => [item.specialization, toSignalTokens(item.matched_canonical_signals)]),
        ),
        anti: Object.fromEntries(
            ontologyAudit.specialization_votes
                .slice(0, 5)
                .map((item) => [item.specialization, toSignalTokens(item.matched_anti_signals)]),
        ),
        tools: Object.fromEntries(
            ontologyAudit.specialization_votes
                .slice(0, 5)
                .map((item) => [item.specialization, toSignalTokens(item.matched_common_tools)]),
        ),
    };
    const scoreMaps = scoreMapByType(ontologyAudit.family_aggregation);
    const horizontalFamilyScore = findFamilyScore(ontologyAudit.family_aggregation, originalFamily);
    const verticalFamilyScore = topSpecializationVote?.domain_type === "vertical"
        ? findFamilyScore(ontologyAudit.family_aggregation, topSpecializationVote.family)
        : 0;
    const verticalHorizontalRatio = horizontalFamilyScore > 0
        ? verticalFamilyScore / horizontalFamilyScore
        : 0;
    const canonicalCount = topSpecializationVote
        ? topSpecializationVote.matched_canonical_signals.length
        : 0;

    const conditions = {
        condition_1_original_horizontal: originalFamily !== "unknown" && HORIZONTAL_FAMILIES.has(originalFamily),
        condition_2_top_specialization_vertical: topSpecializationVote?.domain_type === "vertical",
        condition_3_specialization_score_threshold: (topSpecializationVote?.total_score ?? 0) >= DOMAIN_WINNER_CORRECTION_CONFIG.minimumTopSpecializationScore,
        condition_4_vertical_vs_horizontal_score_ratio: horizontalFamilyScore > 0
            ? verticalFamilyScore >= (horizontalFamilyScore * DOMAIN_WINNER_CORRECTION_CONFIG.minimumVerticalVsHorizontalRatio)
            : false,
        condition_5_min_canonical_signals: canonicalCount >= DOMAIN_WINNER_CORRECTION_CONFIG.minimumCanonicalMatches,
    };

    const scores = {
        top_specialization_score: Number((topSpecializationVote?.total_score ?? 0).toFixed(4)),
        vertical_family_score: Number(verticalFamilyScore.toFixed(4)),
        horizontal_family_score: Number(horizontalFamilyScore.toFixed(4)),
        vertical_horizontal_ratio: Number(verticalHorizontalRatio.toFixed(4)),
        canonical_signal_match_count: canonicalCount,
    };

    const rootCause = classifyRootCause({
        expectedFamily: input.expected_family,
        originalFamily,
        topSpecialization: topSpecializationVote,
        conditions,
        scores,
    });

    return {
        case_name: input.case_name,
        expected_family: input.expected_family,
        detector_outputs: {
            original_winner_family: originalFamily,
            corrected_winner_family: correctedFamily,
            correction_applied: domainAudit.domainWinnerCorrection.correction_applied,
            correction_reason: domainAudit.domainWinnerCorrection.correction_reason,
        },
        top_specializations: topSpecializations,
        family_aggregation_scores: scoreMaps.all,
        vertical_family_scores: scoreMaps.vertical,
        horizontal_family_scores: scoreMaps.horizontal,
        matched_canonical_signals_by_specialization: signalMaps.canonical,
        matched_anti_signals_by_specialization: signalMaps.anti,
        matched_common_tools_by_specialization: signalMaps.tools,
        correction_conditions: conditions,
        scores_for_conditions: scores,
        root_cause: rootCause.root_cause,
        explanation: rootCause.explanation,
        recommended_fix_category: rootCause.recommended_fix_category,
    };
}

function toMarkdown(cases: CaseTriage[]): string {
    const lines: string[] = [];
    lines.push("# Domain Failure Triage");
    lines.push("");
    lines.push(`Cases analyzed: ${cases.length}`);
    lines.push("");
    for (const item of cases) {
        lines.push(`## CASE: ${item.case_name}`);
        lines.push("");
        lines.push(`- expected_family: ${item.expected_family}`);
        lines.push(`- original_family: ${item.detector_outputs.original_winner_family}`);
        lines.push(`- corrected_family: ${item.detector_outputs.corrected_winner_family}`);
        lines.push(`- correction_applied: ${String(item.detector_outputs.correction_applied)}`);
        lines.push(`- correction_reason: ${item.detector_outputs.correction_reason}`);
        lines.push("");
        lines.push("Top Specializations");
        item.top_specializations.forEach((specialization, index) => {
            lines.push(`${index + 1}. ${specialization.specialization} (${specialization.family}) score=${specialization.specialization_score}`);
            lines.push(`canonical_hits=${specialization.canonical_signal_hits}, anti_hits=${specialization.anti_signal_hits}, tool_hits=${specialization.tool_hits}`);
        });
        lines.push("");
        lines.push("Family Aggregation");
        for (const [family, score] of Object.entries(item.family_aggregation_scores)) {
            lines.push(`- ${family}: ${score}`);
        }
        lines.push("");
        lines.push("Correction Conditions");
        lines.push(`- original_horizontal: ${String(item.correction_conditions.condition_1_original_horizontal)}`);
        lines.push(`- top_specialization_vertical: ${String(item.correction_conditions.condition_2_top_specialization_vertical)}`);
        lines.push(`- specialization_score_threshold: ${String(item.correction_conditions.condition_3_specialization_score_threshold)}`);
        lines.push(`- vertical_vs_horizontal_score_ratio: ${String(item.correction_conditions.condition_4_vertical_vs_horizontal_score_ratio)}`);
        lines.push(`- min_canonical_signals: ${String(item.correction_conditions.condition_5_min_canonical_signals)}`);
        lines.push("");
        lines.push("Root Cause");
        lines.push(`- ${item.root_cause}`);
        lines.push(`- Explanation: ${item.explanation}`);
        lines.push(`- Recommended fix category: ${item.recommended_fix_category}`);
        lines.push("");
    }
    return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
    const triageCases = FAILING_CASES.map((item) => runCase(item));
    const output: TriageOutput = {
        generated_at: new Date().toISOString(),
        cases_analyzed: triageCases.length,
        cases: triageCases,
        summary: {
            root_cause_counts: {
                weak_signal_coverage: triageCases.filter((item) => item.root_cause === "weak_signal_coverage").length,
                legacy_family_mapping_gap: triageCases.filter((item) => item.root_cause === "legacy_family_mapping_gap").length,
                horizontal_family_score_domination: triageCases.filter((item) => item.root_cause === "horizontal_family_score_domination").length,
                correction_threshold_too_strict: triageCases.filter((item) => item.root_cause === "correction_threshold_too_strict").length,
                specialization_not_detected: triageCases.filter((item) => item.root_cause === "specialization_not_detected").length,
                unknown_detector_family: triageCases.filter((item) => item.root_cause === "unknown_detector_family").length,
            },
        },
    };

    const artifactsDir = path.join(process.cwd(), "artifacts");
    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.writeFileSync(
        path.join(artifactsDir, "domain-failure-triage.json"),
        `${JSON.stringify(output, null, 2)}\n`,
        "utf8",
    );
    fs.writeFileSync(
        path.join(artifactsDir, "domain-failure-triage.md"),
        toMarkdown(triageCases),
        "utf8",
    );

    // eslint-disable-next-line no-console
    console.log(`Cases analyzed: ${triageCases.length}`);
    for (const item of triageCases) {
        // eslint-disable-next-line no-console
        console.log(`${item.case_name} -> root cause: ${item.root_cause}`);
    }
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    main().catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[run-domain-failure-triage] failed", error);
        process.exitCode = 1;
    });
}
