import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { debugDomainAnchorDetection } from "@/lib/career-engine/job-copilot/domain-family-detector";
import { buildDomainOntologySpecializationAudit } from "@/lib/career-engine/job-copilot/domain-ontology-audit";
import {
    DOMAIN_ONTOLOGY_SKELETON,
    type DomainFamily,
    type DomainType,
} from "@/lib/career-engine/job-copilot/domain-ontology-config";

type BenchmarkCase = {
    job_case: string;
    title: string;
    expected_family: DomainFamily;
    job_description: string;
};

type BenchmarkResultLabel =
    | "correct"
    | "false_positive_override"
    | "missed_vertical_override"
    | "incorrect_no_override";

type BenchmarkRow = {
    job_case: string;
    original_family: DomainFamily | "unknown";
    corrected_family: DomainFamily | "unknown";
    correction_applied: boolean;
    top_specialization: string | null;
    specialization_score: number;
    vertical_score: number;
    horizontal_score: number;
    expected_family: DomainFamily;
    result_correct: boolean;
    result_label: BenchmarkResultLabel;
};

type BenchmarkSummary = {
    total_cases: number;
    corrections_applied: number;
    correct_classifications: number;
    incorrect_classifications: number;
    potential_false_positives: number;
    missed_vertical_overrides: number;
};

const BENCHMARK_CASES: BenchmarkCase[] = [
    {
        job_case: "marketing_analytics_1",
        title: "Marketing Measurement Manager",
        expected_family: "marketing",
        job_description: "Lead marketing measurement across paid channels including attribution, incrementality testing, campaign analytics, media performance insights and measurement framework design. Partner with growth and media teams to optimize return on ad spend and channel effectiveness while building executive readouts in dashboards.",
    },
    {
        job_case: "marketing_analytics_2",
        title: "Campaign Analytics Lead",
        expected_family: "marketing",
        job_description: "Own campaign analytics for multi-channel programs, evaluate attribution models, run incrementality experiments, and provide channel performance recommendations. Translate campaign outcomes into budget allocation decisions and media optimization plans.",
    },
    {
        job_case: "product_analytics_1",
        title: "Senior Product Analytics Manager",
        expected_family: "product",
        job_description: "Drive product analytics for user behavior, funnel analysis, feature adoption and experimentation readouts. Partner with product management on roadmap decisions, activation improvements and retention strategy through cohort and journey analysis.",
    },
    {
        job_case: "people_analytics_1",
        title: "People Analytics Partner",
        expected_family: "hr_people",
        job_description: "Build people analytics for workforce planning, employee data quality, attrition analysis and talent funnel insights. Deliver HR analytics reporting on engagement, headcount and organizational effectiveness for business leaders.",
    },
    {
        job_case: "analytics_consulting_1",
        title: "Analytics Consulting Manager",
        expected_family: "consulting",
        job_description: "Lead analytics consulting engagements, shape client insight narratives, deliver stakeholder storytelling and analytics transformation roadmaps. Work with client teams to define decision support approaches and value realization plans.",
    },
    {
        job_case: "fpna_1",
        title: "FP&A Manager",
        expected_family: "finance",
        job_description: "Own fp&a planning cycles including budgeting, forecasting, variance analysis and monthly financial performance reviews. Build planning models and partner with commercial leaders on scenario planning and operating forecasts.",
    },
    {
        job_case: "commercial_finance_1",
        title: "Commercial Finance Business Partner",
        expected_family: "finance",
        job_description: "Provide commercial finance support for revenue planning, margin analysis, pricing profitability and performance management. Build financial insights for sales and growth decisions with budget control and forecast discipline.",
    },
    {
        job_case: "bi_reporting_1",
        title: "BI Reporting Analyst",
        expected_family: "data",
        job_description: "Develop dashboard reporting for kpi reporting packs, recurring executive reporting and performance tracking. Use power bi, tableau and sql to automate reports and maintain business intelligence reporting standards.",
    },
    {
        job_case: "data_engineering_1",
        title: "Data Engineer",
        expected_family: "data",
        job_description: "Design and maintain data pipelines, etl workflows, data ingestion jobs and orchestration using airflow and spark. Improve data platform reliability, schema evolution and scalable batch processing for analytics consumers.",
    },
    {
        job_case: "business_operations_1",
        title: "Business Operations Manager",
        expected_family: "operations",
        job_description: "Own operating model execution, cross functional coordination and operational planning cadence. Build performance tracking, run governance forums and improve business operations processes across teams.",
    },
    {
        job_case: "sales_operations_1",
        title: "Sales Operations Lead",
        expected_family: "sales",
        job_description: "Lead sales operations including crm governance, pipeline management, forecasting rhythm and territory planning support. Improve sales process consistency and reporting for go to market execution.",
    },
    {
        job_case: "data_platform_1",
        title: "Director, Data Platform",
        expected_family: "technology_platform",
        job_description: "Define data platform strategy across data infrastructure, platform architecture and data enablement capabilities. Lead shared services for self service data, platform reliability and long-term platform roadmap.",
    },
];

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

function findFamilyScore(
    familyScores: Array<{ family: DomainFamily; total_score: number }>,
    family: DomainFamily | "unknown",
): number {
    if (family === "unknown") return 0;
    return familyScores.find((item) => item.family === family)?.total_score ?? 0;
}

function evaluateRowLabel(params: {
    row: Omit<BenchmarkRow, "result_label">;
}): BenchmarkResultLabel {
    if (params.row.result_correct) return "correct";
    if (params.row.correction_applied) return "false_positive_override";
    const expectedType = toDomainType(params.row.expected_family);
    const originalType = toDomainType(params.row.original_family);
    const correctionMissed = expectedType === "vertical"
        && originalType === "horizontal"
        && params.row.original_family !== params.row.expected_family;
    if (correctionMissed) return "missed_vertical_override";
    return "incorrect_no_override";
}

function runCase(input: BenchmarkCase): BenchmarkRow {
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
    const correctedFamilyFromDetector = toOntologyFamily({
        legacyFamily: domainAudit.chosenWinnerFamily,
        ontologyFamilyBeforeMapping: domainAudit.domainWinnerCorrection.ontology_family_before_mapping,
        mappingReason: domainAudit.domainWinnerCorrection.mapping_reason,
    });
    const correctedFamily = domainAudit.horizontalSpecificityRefinement.refined_winner
        ?? domainAudit.domainWinnerCorrection.corrected_winner
        ?? (correctedFamilyFromDetector === "unknown" ? "unknown" : correctedFamilyFromDetector);
    const topSpecialization = ontologyAudit.top_specializations[0] ?? null;
    const familyScores = ontologyAudit.family_aggregation.map((item) => ({
        family: item.family,
        total_score: item.total_score,
    }));

    const verticalScore = topSpecialization?.domain_type === "vertical"
        ? findFamilyScore(familyScores, topSpecialization.family)
        : 0;
    const horizontalScore = toDomainType(originalFamily) === "horizontal"
        ? findFamilyScore(familyScores, originalFamily)
        : 0;

    const rowWithoutLabel: Omit<BenchmarkRow, "result_label"> = {
        job_case: input.job_case,
        original_family: originalFamily,
        corrected_family: correctedFamily,
        correction_applied: domainAudit.domainWinnerCorrection.correction_applied
            || domainAudit.horizontalSpecificityRefinement.refinement_applied,
        top_specialization: topSpecialization?.specialization ?? null,
        specialization_score: Number((topSpecialization?.total_score ?? 0).toFixed(4)),
        vertical_score: Number(verticalScore.toFixed(4)),
        horizontal_score: Number(horizontalScore.toFixed(4)),
        expected_family: input.expected_family,
        result_correct: correctedFamily === input.expected_family,
    };

    return {
        ...rowWithoutLabel,
        result_label: evaluateRowLabel({
            row: rowWithoutLabel,
        }),
    };
}

function summarize(rows: BenchmarkRow[]): BenchmarkSummary {
    return {
        total_cases: rows.length,
        corrections_applied: rows.filter((item) => item.correction_applied).length,
        correct_classifications: rows.filter((item) => item.result_correct).length,
        incorrect_classifications: rows.filter((item) => !item.result_correct).length,
        potential_false_positives: rows.filter((item) => item.result_label === "false_positive_override").length,
        missed_vertical_overrides: rows.filter((item) => item.result_label === "missed_vertical_override").length,
    };
}

function toMarkdown(rows: BenchmarkRow[], summary: BenchmarkSummary): string {
    const header = [
        "job_case",
        "original_family",
        "corrected_family",
        "correction_applied",
        "top_specialization",
        "specialization_score",
        "vertical_score",
        "horizontal_score",
        "expected_family",
        "result_correct",
        "result_label",
    ];
    const lines: string[] = [];
    lines.push("# Domain Correction Benchmark");
    lines.push("");
    lines.push(`- Total cases: ${summary.total_cases}`);
    lines.push(`- Corrections applied: ${summary.corrections_applied}`);
    lines.push(`- Correct classifications: ${summary.correct_classifications}`);
    lines.push(`- Incorrect classifications: ${summary.incorrect_classifications}`);
    lines.push(`- Potential false positives: ${summary.potential_false_positives}`);
    lines.push(`- Missed vertical overrides: ${summary.missed_vertical_overrides}`);
    lines.push("");
    lines.push(`| ${header.join(" | ")} |`);
    lines.push(`| ${header.map(() => "---").join(" | ")} |`);
    for (const row of rows) {
        lines.push(`| ${[
            row.job_case,
            row.original_family,
            row.corrected_family,
            String(row.correction_applied),
            row.top_specialization ?? "",
            row.specialization_score.toFixed(4),
            row.vertical_score.toFixed(4),
            row.horizontal_score.toFixed(4),
            row.expected_family,
            String(row.result_correct),
            row.result_label,
        ].join(" | ")} |`);
    }
    lines.push("");
    return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
    const rows = BENCHMARK_CASES.map((item) => runCase(item));
    const summary = summarize(rows);
    const output = {
        generated_at: new Date().toISOString(),
        benchmark_jobs: BENCHMARK_CASES.map((item) => ({
            job_case: item.job_case,
            title: item.title,
            expected_family: item.expected_family,
        })),
        rows,
        summary,
    };

    const artifactsDir = path.join(process.cwd(), "artifacts");
    fs.mkdirSync(artifactsDir, { recursive: true });
    const jsonPath = path.join(artifactsDir, "domain-correction-benchmark.json");
    const mdPath = path.join(artifactsDir, "domain-correction-benchmark.md");
    fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    fs.writeFileSync(mdPath, toMarkdown(rows, summary), "utf8");

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        status: "ok",
        json: "artifacts/domain-correction-benchmark.json",
        markdown: "artifacts/domain-correction-benchmark.md",
        total_cases: summary.total_cases,
        corrections_applied: summary.corrections_applied,
        correct_classifications: summary.correct_classifications,
        incorrect_classifications: summary.incorrect_classifications,
        potential_false_positives: summary.potential_false_positives,
        missed_vertical_overrides: summary.missed_vertical_overrides,
    }, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    main().catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[run-domain-correction-benchmark] failed", error);
        process.exitCode = 1;
    });
}
