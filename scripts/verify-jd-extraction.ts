import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseJobDescription } from "@/lib/career-engine/parsing/jd-parser";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { getStructuredJobUnderstanding } from "@/lib/career-engine/matching/job-understanding";
import { extractJobCapabilityProfileV1 } from "@/lib/career-engine/matching/job-capability-extractor";

type VerifyJdExtractionArgs = {
    fixturePath?: string;
    summaryOut?: string | null;
    detailsOut?: string | null;
};

type JdVerifyFixtureCase = {
    id: string;
    title_hint: string;
    job_description: string;
    expected: {
        company_required: boolean;
        min_responsibilities: number;
        min_requirements: number;
        min_critical_requirements: number;
        min_required_skills?: number;
        min_core_capability_clusters?: number;
        min_business_outcomes?: number;
    };
};

type JdVerifyFixture = {
    version: string;
    cases: JdVerifyFixtureCase[];
};

export type JdExtractionCaseDetail = {
    step_name: "jd_extraction";
    case_id: string;
    pass: boolean;
    failure_reasons: string[];
    extracted_title: string | null;
    extracted_company: string | null;
    responsibilities_count: number;
    requirements_count: number;
    critical_requirements_count: number;
    required_skills_count: number;
    core_capability_clusters_count: number;
    business_outcomes_count: number;
    output_quality: string;
    quality_score: number;
    founder_readable_status: "strong" | "usable_with_warnings" | "failed";
    weak_fields: string[];
    quality_checks: Array<{
        check_id: string;
        severity: "critical" | "warning";
        pass: boolean;
        observed: string | number | boolean;
        expected: string | number | boolean;
    }>;
    output_snapshot: {
        target_title: string | null;
        company: string | null;
        mission_summary: string;
        role_family: string | null;
        required_skills: string[];
        responsibilities: string[];
        critical_requirement_labels: string[];
    };
};

export type JdExtractionSummary = {
    step_name: "jd_extraction";
    fixture_version: string;
    total_cases: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    average_requirements_count: number;
    average_critical_requirements_count: number;
    average_quality_score: number;
    weak_field_case_count: number;
    warning_case_count: number;
    missing_or_weak_field_counts: Record<string, number>;
    thresholds: {
        min_total_cases: number;
        required_pass_rate: number;
        min_average_quality_score: number;
    };
    deterministic_mode_enforced: boolean;
};

function parseArgs(): VerifyJdExtractionArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };

    return {
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/verify-jd-extraction.fixture.json",
        summaryOut: readArg("--summaryOut"),
        detailsOut: readArg("--detailsOut"),
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(part: number, total: number): number {
    if (total <= 0) return 0;
    return part / total;
}

function loadFixture(fixturePath: string): JdVerifyFixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    const fixture = JSON.parse(fs.readFileSync(absolute, "utf8")) as JdVerifyFixture;
    if (!fixture.cases || fixture.cases.length === 0) {
        throw new Error("JD extraction verification fixture has no cases.");
    }
    return fixture;
}

function validateSummary(summary: JdExtractionSummary): void {
    if (summary.total_cases < summary.thresholds.min_total_cases) {
        throw new Error(
            `JD extraction verification failed: total_cases=${summary.total_cases} < ${summary.thresholds.min_total_cases}.`,
        );
    }
    if (summary.pass_rate < summary.thresholds.required_pass_rate) {
        throw new Error(
            `JD extraction verification failed: pass_rate=${summary.pass_rate} < ${summary.thresholds.required_pass_rate}.`,
        );
    }
    if (summary.average_quality_score < summary.thresholds.min_average_quality_score) {
        throw new Error(
            `JD extraction verification failed: average_quality_score=${summary.average_quality_score} < ${summary.thresholds.min_average_quality_score}.`,
        );
    }
}

export async function runJdExtractionVerification(
    args: VerifyJdExtractionArgs = {},
): Promise<{ summary: JdExtractionSummary; details: JdExtractionCaseDetail[] }> {
    const fixturePath = args.fixturePath ?? "scripts/fixtures/verify-jd-extraction.fixture.json";
    const fixture = loadFixture(fixturePath);

    const previousGeminiApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const details: JdExtractionCaseDetail[] = [];
    try {
        for (const fixtureCase of fixture.cases) {
            const rawJd = fixtureCase.job_description.trim();
            if (rawJd.length < 40) {
                throw new Error(`Fixture case ${fixtureCase.id} has insufficient job_description text.`);
            }

            const parsed = parseJobDescription(rawJd);
            const signals = buildJobSignalsFromRawJd({
                rawJd,
                fallbackTitle: fixtureCase.title_hint,
            });
            const structured = await getStructuredJobUnderstanding({
                rawJobText: rawJd,
                jobTitleHint: fixtureCase.title_hint,
            });
            const requirementProfile = extractJobCapabilityProfileV1({
                jobDescription: rawJd,
                titleHint: fixtureCase.title_hint,
            });

            const criticalRequirements = requirementProfile.capabilities
                .filter((capability) => capability.importance === "critical");
            const failureReasons: string[] = [];

            const extractedTitle = (signals.target_title ?? parsed.target_title ?? "").trim() || null;
            const extractedCompany = (parsed.company ?? "").trim() || null;
            const responsibilitiesCount = signals.responsibilities.length;
            const requirementsCount = requirementProfile.capabilities.length;
            const criticalRequirementsCount = criticalRequirements.length;
            const requiredSkillsCount = signals.required_skills.length;
            const coreCapabilityClustersCount = structured.core_capability_clusters.length;
            const businessOutcomesCount = structured.business_outcomes.length;

            const qualityChecks: JdExtractionCaseDetail["quality_checks"] = [];
            const pushCheck = (
                checkId: string,
                severity: "critical" | "warning",
                pass: boolean,
                observed: string | number | boolean,
                expected: string | number | boolean,
                failureReason: string,
            ): void => {
                qualityChecks.push({
                    check_id: checkId,
                    severity,
                    pass,
                    observed,
                    expected,
                });
                if (!pass && severity === "critical") {
                    failureReasons.push(failureReason);
                }
            };

            pushCheck("title_exists", "critical", Boolean(extractedTitle), Boolean(extractedTitle), true, "title_missing");
            pushCheck(
                "company_exists_when_required",
                "critical",
                fixtureCase.expected.company_required ? Boolean(extractedCompany) : true,
                extractedCompany ?? false,
                fixtureCase.expected.company_required ? true : "not_required",
                "company_missing",
            );
            pushCheck(
                "responsibilities_not_sparse",
                "critical",
                responsibilitiesCount >= fixtureCase.expected.min_responsibilities,
                responsibilitiesCount,
                `>=${fixtureCase.expected.min_responsibilities}`,
                "responsibilities_too_sparse",
            );
            pushCheck(
                "requirements_not_sparse",
                "critical",
                requirementsCount >= fixtureCase.expected.min_requirements,
                requirementsCount,
                `>=${fixtureCase.expected.min_requirements}`,
                "requirements_too_sparse",
            );
            pushCheck(
                "critical_requirements_present",
                "critical",
                criticalRequirementsCount >= fixtureCase.expected.min_critical_requirements,
                criticalRequirementsCount,
                `>=${fixtureCase.expected.min_critical_requirements}`,
                "critical_requirements_missing",
            );
            pushCheck(
                "required_skills_present",
                "warning",
                requiredSkillsCount >= (fixtureCase.expected.min_required_skills ?? 1),
                requiredSkillsCount,
                `>=${fixtureCase.expected.min_required_skills ?? 1}`,
                "required_skills_missing",
            );
            pushCheck(
                "core_capability_clusters_present",
                "warning",
                coreCapabilityClustersCount >= (fixtureCase.expected.min_core_capability_clusters ?? 1),
                coreCapabilityClustersCount,
                `>=${fixtureCase.expected.min_core_capability_clusters ?? 1}`,
                "core_capability_clusters_missing",
            );
            pushCheck(
                "business_outcomes_present",
                "warning",
                businessOutcomesCount >= (fixtureCase.expected.min_business_outcomes ?? 1),
                businessOutcomesCount,
                `>=${fixtureCase.expected.min_business_outcomes ?? 1}`,
                "business_outcomes_missing",
            );
            pushCheck(
                "output_not_structurally_empty",
                "critical",
                requirementProfile.quality !== "empty",
                requirementProfile.quality,
                "not empty",
                "structurally_empty_output",
            );
            pushCheck(
                "output_not_structurally_degraded",
                "critical",
                !(
                    requiredSkillsCount === 0
                    && requirementsCount === 0
                    && coreCapabilityClustersCount === 0
                ),
                `${requiredSkillsCount}/${requirementsCount}/${coreCapabilityClustersCount}`,
                "non-zero in at least one core signal",
                "structurally_degraded_output",
            );
            pushCheck(
                "mission_summary_present",
                "warning",
                Boolean(structured.core_mission.summary.trim()),
                structured.core_mission.summary.trim().length,
                ">0",
                "mission_summary_missing",
            );

            const passedChecks = qualityChecks.filter((item) => item.pass).length;
            const qualityScore = Number(ratio(passedChecks, qualityChecks.length).toFixed(4));
            const weakFields = qualityChecks.filter((item) => !item.pass).map((item) => item.check_id);
            const founderReadableStatus: JdExtractionCaseDetail["founder_readable_status"] = failureReasons.length > 0
                ? "failed"
                : weakFields.length > 0
                    ? "usable_with_warnings"
                    : "strong";

            details.push({
                step_name: "jd_extraction",
                case_id: fixtureCase.id,
                pass: failureReasons.length === 0,
                failure_reasons: failureReasons,
                extracted_title: extractedTitle,
                extracted_company: extractedCompany,
                responsibilities_count: responsibilitiesCount,
                requirements_count: requirementsCount,
                critical_requirements_count: criticalRequirementsCount,
                required_skills_count: requiredSkillsCount,
                core_capability_clusters_count: coreCapabilityClustersCount,
                business_outcomes_count: businessOutcomesCount,
                output_quality: requirementProfile.quality,
                quality_score: qualityScore,
                founder_readable_status: founderReadableStatus,
                weak_fields: weakFields,
                quality_checks: qualityChecks,
                output_snapshot: {
                    target_title: extractedTitle,
                    company: extractedCompany,
                    mission_summary: structured.core_mission.summary,
                    role_family: signals.role_family ?? null,
                    required_skills: signals.required_skills.slice(0, 8),
                    responsibilities: signals.responsibilities.slice(0, 4),
                    critical_requirement_labels: criticalRequirements.map((item) => item.display_name).slice(0, 6),
                },
            });
        }
    } finally {
        if (typeof previousGeminiApiKey === "string") {
            process.env.GEMINI_API_KEY = previousGeminiApiKey;
        }
    }

    const passCount = details.filter((detail) => detail.pass).length;
    const failCount = details.length - passCount;
    const warningCaseCount = details.filter((detail) => detail.weak_fields.length > 0).length;
    const missingOrWeakFieldCounts = details.reduce<Record<string, number>>((acc, detail) => {
        for (const field of detail.weak_fields) {
            acc[field] = (acc[field] ?? 0) + 1;
        }
        return acc;
    }, {});
    const summary: JdExtractionSummary = {
        step_name: "jd_extraction",
        fixture_version: fixture.version,
        total_cases: details.length,
        pass_count: passCount,
        fail_count: failCount,
        pass_rate: Number((passCount / Math.max(1, details.length)).toFixed(4)),
        average_requirements_count: Number(average(details.map((detail) => detail.requirements_count)).toFixed(2)),
        average_critical_requirements_count: Number(average(details.map((detail) => detail.critical_requirements_count)).toFixed(2)),
        average_quality_score: Number(average(details.map((detail) => detail.quality_score)).toFixed(4)),
        weak_field_case_count: warningCaseCount,
        warning_case_count: warningCaseCount,
        missing_or_weak_field_counts: missingOrWeakFieldCounts,
        thresholds: {
            min_total_cases: 1,
            required_pass_rate: 1,
            min_average_quality_score: 0.75,
        },
        deterministic_mode_enforced: true,
    };

    if (args.summaryOut) writeJson(args.summaryOut, summary);
    if (args.detailsOut) writeJson(args.detailsOut, details);

    validateSummary(summary);

    return { summary, details };
}

async function run(): Promise<void> {
    const args = parseArgs();
    const result = await runJdExtractionVerification(args);
    console.log(JSON.stringify({
        total_cases: result.summary.total_cases,
        pass_count: result.summary.pass_count,
        fail_count: result.summary.fail_count,
        pass_rate: result.summary.pass_rate,
        summary_out: args.summaryOut,
        details_out: args.detailsOut,
    }, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    run().catch((error) => {
        console.error("[verify-jd-extraction] Failed", error);
        process.exit(1);
    });
}
