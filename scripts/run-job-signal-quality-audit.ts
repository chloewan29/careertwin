import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getCapabilityMatchV2 } from "@/lib/career-engine/matching/capability-match-v2";
import {
    loadEnvLocal,
    readFixture,
    resolveFixtureJob,
    resolveProfileAndCareer,
    type Fixture,
    type FixtureJob,
} from "@/scripts/human-alignment-benchmark";

type AuditArgs = {
    profileId: string | null;
    careerId: string | null;
    fixturePath: string;
    caseIds: string[] | null;
    summaryOut: string;
    detailsOut: string;
};

export type DerivedSignalQuality = "rich" | "medium" | "sparse";
export type AuditExtractionQuality = "full" | "sparse" | "unknown";

export type JobSignalQualityDetail = {
    case_id: string;
    title: string;
    description_length: number;
    extraction_quality: AuditExtractionQuality;
    matcher_job_profile_quality: string | null;
    role_family: string | null;
    number_of_requirement_clusters: number;
    number_of_core_capability_clusters: number;
    number_of_tools_or_platform_signals: number;
    number_of_domain_signals: number;
    derived_signal_quality: DerivedSignalQuality;
};

export type JobSignalQualitySummary = {
    fixture_version: string;
    profile_id: string;
    career_id: string;
    total_cases: number;
    rich_count: number;
    medium_count: number;
    sparse_count: number;
    sparse_rate: number;
    average_description_length: number;
    average_requirement_cluster_count: number;
    average_capability_cluster_count: number;
    extraction_quality_breakdown: Record<AuditExtractionQuality, number>;
    matcher_job_profile_quality_breakdown: Record<string, number>;
    thresholds: {
        rich: string;
        medium: string;
        sparse: string;
    };
};

function parseArgs(): AuditArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    const caseIdsArg = readArg("--caseIds");
    return {
        profileId: readArg("--profileId"),
        careerId: readArg("--careerId"),
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        caseIds: caseIdsArg
            ? caseIdsArg.split(",").map((value) => value.trim()).filter(Boolean)
            : null,
        summaryOut: readArg("--summaryOut") ?? "tmp-job-signal-quality-summary.json",
        detailsOut: readArg("--detailsOut") ?? "tmp-job-signal-quality-details.json",
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function selectFixtureJobs(fixture: Fixture, caseIds: string[] | null): FixtureJob[] {
    if (!caseIds || caseIds.length === 0) return fixture.jobs;
    const allowed = new Set(caseIds);
    return fixture.jobs.filter((job) => allowed.has(job.id));
}

function normalizeExtractionQuality(value: string | null | undefined): AuditExtractionQuality {
    const normalized = (value ?? "").toLowerCase().trim();
    if (normalized === "strong" || normalized === "usable") return "full";
    if (normalized === "sparse" || normalized === "empty") return "sparse";
    return "unknown";
}

function deriveSignalQuality(input: {
    descriptionLength: number;
    requirementClusterCount: number;
    capabilityClusterCount: number;
}): DerivedSignalQuality {
    if (
        input.descriptionLength >= 1200
        && input.requirementClusterCount >= 5
        && input.capabilityClusterCount >= 3
    ) {
        return "rich";
    }
    if (
        input.descriptionLength < 500
        || input.requirementClusterCount < 3
        || input.capabilityClusterCount < 2
    ) {
        return "sparse";
    }
    return "medium";
}

function averageNumber(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function runJobSignalQualityAudit(args: {
    profileId?: string | null;
    careerId?: string | null;
    fixturePath?: string;
    caseIds?: string[] | null;
    summaryOut?: string | null;
    detailsOut?: string | null;
} = {}): Promise<{ summary: JobSignalQualitySummary; details: JobSignalQualityDetail[] }> {
    loadEnvLocal();
    const fixturePath = args.fixturePath ?? "scripts/fixtures/human-alignment-benchmark.seed.json";
    const summaryOut = args.summaryOut ?? null;
    const detailsOut = args.detailsOut ?? null;
    const { profileId, careerId } = await resolveProfileAndCareer(args.profileId ?? null, args.careerId ?? null);
    const fixture = readFixture(fixturePath);
    const jobs = selectFixtureJobs(fixture, args.caseIds ?? null);
    if (jobs.length === 0) {
        throw new Error("No fixture jobs selected for job signal quality audit.");
    }

    const details: JobSignalQualityDetail[] = [];
    for (const job of jobs) {
        const resolvedJob = await resolveFixtureJob(job);
        if (!resolvedJob.job_description || resolvedJob.job_description.trim().length < 40) {
            throw new Error(`Resolved job ${job.id} has an insufficient job description.`);
        }
        const result = await getCapabilityMatchV2({
            careerId,
            profileId,
            jobDescription: resolvedJob.job_description,
            jobTitleHint: resolvedJob.resolved_title,
            topSignalsLimit: 4,
        });

        const descriptionLength = resolvedJob.job_description.trim().length;
        const requirementClusterCount = result.audit.requirement_clusters.length;
        const capabilityClusterCount = result.audit.job_understanding.core_capability_clusters.length;
        const toolSignalCount = result.audit.job_understanding.secondary_methods.length;
        const domainSignalCount = result.audit.job_understanding.domain_modifiers.length;
        const matcherJobProfileQuality = result.job_profile_quality ?? null;

        details.push({
            case_id: job.id,
            title: resolvedJob.resolved_title,
            description_length: descriptionLength,
            extraction_quality: normalizeExtractionQuality(matcherJobProfileQuality),
            matcher_job_profile_quality: matcherJobProfileQuality,
            role_family: result.audit.parsed_job_summary.role_family,
            number_of_requirement_clusters: requirementClusterCount,
            number_of_core_capability_clusters: capabilityClusterCount,
            number_of_tools_or_platform_signals: toolSignalCount,
            number_of_domain_signals: domainSignalCount,
            derived_signal_quality: deriveSignalQuality({
                descriptionLength,
                requirementClusterCount,
                capabilityClusterCount,
            }),
        });
    }

    const richCount = details.filter((item) => item.derived_signal_quality === "rich").length;
    const mediumCount = details.filter((item) => item.derived_signal_quality === "medium").length;
    const sparseCount = details.filter((item) => item.derived_signal_quality === "sparse").length;
    const extractionQualityBreakdown: Record<AuditExtractionQuality, number> = {
        full: details.filter((item) => item.extraction_quality === "full").length,
        sparse: details.filter((item) => item.extraction_quality === "sparse").length,
        unknown: details.filter((item) => item.extraction_quality === "unknown").length,
    };
    const matcherJobProfileQualityBreakdown = details.reduce<Record<string, number>>((acc, item) => {
        const key = item.matcher_job_profile_quality ?? "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

    const summary: JobSignalQualitySummary = {
        fixture_version: fixture.version,
        profile_id: profileId,
        career_id: careerId,
        total_cases: details.length,
        rich_count: richCount,
        medium_count: mediumCount,
        sparse_count: sparseCount,
        sparse_rate: Number((sparseCount / Math.max(1, details.length)).toFixed(4)),
        average_description_length: Number(averageNumber(details.map((item) => item.description_length)).toFixed(2)),
        average_requirement_cluster_count: Number(averageNumber(details.map((item) => item.number_of_requirement_clusters)).toFixed(2)),
        average_capability_cluster_count: Number(averageNumber(details.map((item) => item.number_of_core_capability_clusters)).toFixed(2)),
        extraction_quality_breakdown: extractionQualityBreakdown,
        matcher_job_profile_quality_breakdown: matcherJobProfileQualityBreakdown,
        thresholds: {
            rich: "description_length >= 1200 AND requirement_clusters >= 5 AND core_capability_clusters >= 3",
            medium: "all cases that are not rich or sparse",
            sparse: "description_length < 500 OR requirement_clusters < 3 OR core_capability_clusters < 2",
        },
    };

    if (summaryOut) writeJson(summaryOut, summary);
    if (detailsOut) writeJson(detailsOut, details);

    return { summary, details };
}

async function run(): Promise<void> {
    const args = parseArgs();
    const result = await runJobSignalQualityAudit(args);
    console.log(JSON.stringify({
        summary_out: args.summaryOut,
        details_out: args.detailsOut,
        total_cases: result.summary.total_cases,
        rich_count: result.summary.rich_count,
        medium_count: result.summary.medium_count,
        sparse_count: result.summary.sparse_count,
        sparse_rate: result.summary.sparse_rate,
    }, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    run().catch((error) => {
        console.error("[run-job-signal-quality-audit] Failed", error);
        process.exit(1);
    });
}
