import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { debugDomainAnchorDetection } from "@/lib/career-engine/job-copilot/domain-family-detector";
import { buildDomainOntologySpecializationAudit } from "@/lib/career-engine/job-copilot/domain-ontology-audit";
import { buildJobFitScoreV1, type JobFitScoreBucket } from "@/lib/career-engine/job-copilot/job-fit-score-v1";
import { getCapabilityMatchV2 } from "@/lib/career-engine/matching/capability-match-v2";
import {
    loadEnvLocal,
    readFixture,
    resolveFixtureJob,
    resolveProfileAndCareer,
    type Fixture,
} from "@/scripts/human-alignment-benchmark";

type ScriptArgs = {
    profileId: string | null;
    careerId: string | null;
    fixturePath: string;
    outJsonPath: string;
    outMarkdownPath: string;
    limit: number | null;
};

type ScoreDistribution = {
    "0-20": number;
    "20-40": number;
    "40-60": number;
    "60-80": number;
    "80-100": number;
};

type BucketDistribution = Record<JobFitScoreBucket, number>;

type AuditCaseRow = {
    job_id: string;
    job_title: string;
    company: string | null;
    domain_family: string;
    top_specialization: string | null;
    total_score: number;
    bucket: JobFitScoreBucket;
    breakdown: {
        specialization_fit: number;
        capability_match: number;
        evidence_strength: number;
    };
};

type AlignmentRow = {
    specialization: string;
    case_count: number;
    average_score: number;
    min_score: number;
    max_score: number;
    bucket_distribution: BucketDistribution;
};

type FlaggedCase = {
    job_id: string;
    domain_family: string;
    top_specialization: string | null;
    total_score: number;
    bucket: JobFitScoreBucket;
    specialization_fit: number;
    capability_match: number;
    evidence_strength: number;
};

type CalibrationAuditOutput = {
    generated_at: string;
    fixture_path: string;
    profile_id: string;
    career_id: string;
    total_cases_analyzed: number;
    average_score: number;
    median_score: number;
    score_distribution: ScoreDistribution;
    bucket_distribution: BucketDistribution;
    specialization_score_alignment: AlignmentRow[];
    flagged_cases: {
        potential_under_scoring: FlaggedCase[];
        potential_over_scoring: FlaggedCase[];
    };
    key_findings: string[];
    cases: AuditCaseRow[];
};

const DEFAULT_FIXTURE = "scripts/fixtures/human-alignment-benchmark.seed.json";
const DEFAULT_OUT_JSON = "artifacts/job-fit-score-calibration.json";
const DEFAULT_OUT_MD = "artifacts/job-fit-score-calibration.md";

function parseArgs(): ScriptArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    const limitRaw = readArg("--limit");
    const limit = limitRaw ? Number(limitRaw) : null;
    return {
        profileId: readArg("--profileId"),
        careerId: readArg("--careerId"),
        fixturePath: readArg("--fixture") ?? DEFAULT_FIXTURE,
        outJsonPath: readArg("--out") ?? DEFAULT_OUT_JSON,
        outMarkdownPath: readArg("--markdownOut") ?? DEFAULT_OUT_MD,
        limit: Number.isFinite(limit) && (limit as number) > 0 ? Math.floor(limit as number) : null,
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeMarkdown(filePath: string, content: string): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, "utf8");
}

function round(value: number, digits = 1): number {
    return Number(value.toFixed(digits));
}

function computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return round((sorted[mid - 1] + sorted[mid]) / 2, 1);
    }
    return round(sorted[mid], 1);
}

function toScoreDistribution(rows: AuditCaseRow[]): ScoreDistribution {
    const distribution: ScoreDistribution = {
        "0-20": 0,
        "20-40": 0,
        "40-60": 0,
        "60-80": 0,
        "80-100": 0,
    };
    for (const row of rows) {
        const score = row.total_score;
        if (score < 20) distribution["0-20"] += 1;
        else if (score < 40) distribution["20-40"] += 1;
        else if (score < 60) distribution["40-60"] += 1;
        else if (score < 80) distribution["60-80"] += 1;
        else distribution["80-100"] += 1;
    }
    return distribution;
}

function toBucketDistribution(rows: AuditCaseRow[]): BucketDistribution {
    const distribution: BucketDistribution = {
        "Strong Match": 0,
        "Good Match": 0,
        "Partial Match": 0,
        "Weak Match": 0,
    };
    for (const row of rows) {
        distribution[row.bucket] += 1;
    }
    return distribution;
}

function toSpecializationAlignment(rows: AuditCaseRow[]): AlignmentRow[] {
    const grouped = new Map<string, AuditCaseRow[]>();
    for (const row of rows) {
        const key = row.top_specialization ?? "unknown";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)?.push(row);
    }
    return Array.from(grouped.entries())
        .map(([specialization, groupRows]) => {
            const scoreValues = groupRows.map((item) => item.total_score);
            const bucketDistribution = toBucketDistribution(groupRows);
            return {
                specialization,
                case_count: groupRows.length,
                average_score: round(scoreValues.reduce((sum, value) => sum + value, 0) / Math.max(1, scoreValues.length), 1),
                min_score: round(Math.min(...scoreValues), 1),
                max_score: round(Math.max(...scoreValues), 1),
                bucket_distribution: bucketDistribution,
            };
        })
        .sort((left, right) => right.case_count - left.case_count || right.average_score - left.average_score);
}

function toFlaggedCases(rows: AuditCaseRow[]): {
    potential_under_scoring: FlaggedCase[];
    potential_over_scoring: FlaggedCase[];
} {
    const toFlag = (row: AuditCaseRow): FlaggedCase => ({
        job_id: row.job_id,
        domain_family: row.domain_family,
        top_specialization: row.top_specialization,
        total_score: row.total_score,
        bucket: row.bucket,
        specialization_fit: row.breakdown.specialization_fit,
        capability_match: row.breakdown.capability_match,
        evidence_strength: row.breakdown.evidence_strength,
    });
    return {
        potential_under_scoring: rows
            .filter((row) => row.breakdown.specialization_fit >= 30 && row.total_score < 70)
            .map(toFlag),
        potential_over_scoring: rows
            .filter((row) => row.breakdown.specialization_fit < 10 && row.total_score > 60)
            .map(toFlag),
    };
}

function toKeyFindings(params: {
    totalCases: number;
    averageScore: number;
    medianScore: number;
    scoreDistribution: ScoreDistribution;
    bucketDistribution: BucketDistribution;
    flagged: { potential_under_scoring: FlaggedCase[]; potential_over_scoring: FlaggedCase[] };
}): string[] {
    const findings: string[] = [];
    const bins = Object.entries(params.scoreDistribution) as Array<[keyof ScoreDistribution, number]>;
    const dominantBin = bins.sort((a, b) => b[1] - a[1])[0];
    findings.push(`Most cases are concentrated in ${dominantBin[0]} (${dominantBin[1]}/${params.totalCases}).`);
    if (params.bucketDistribution["Strong Match"] <= Math.floor(params.totalCases * 0.1)) {
        findings.push("Strong Match bucket is rarely triggered in current benchmark mix.");
    }
    if (params.averageScore >= 50 && params.averageScore <= 65) {
        findings.push(`Average score (${params.averageScore}) sits in the Partial Match range.`);
    }
    findings.push(`Median score is ${params.medianScore}.`);
    findings.push(`Potential under-scoring flags: ${params.flagged.potential_under_scoring.length}.`);
    findings.push(`Potential over-scoring flags: ${params.flagged.potential_over_scoring.length}.`);
    return findings;
}

function toMarkdown(output: CalibrationAuditOutput): string {
    const scoreDistRows = [
        ["0-20", output.score_distribution["0-20"]],
        ["20-40", output.score_distribution["20-40"]],
        ["40-60", output.score_distribution["40-60"]],
        ["60-80", output.score_distribution["60-80"]],
        ["80-100", output.score_distribution["80-100"]],
    ];
    const bucketDistRows = [
        ["Strong Match", output.bucket_distribution["Strong Match"]],
        ["Good Match", output.bucket_distribution["Good Match"]],
        ["Partial Match", output.bucket_distribution["Partial Match"]],
        ["Weak Match", output.bucket_distribution["Weak Match"]],
    ];
    const specializationRows = output.specialization_score_alignment
        .map((row) => `| ${row.specialization} | ${row.case_count} | ${row.average_score} | ${row.min_score} | ${row.max_score} | S:${row.bucket_distribution["Strong Match"]}, G:${row.bucket_distribution["Good Match"]}, P:${row.bucket_distribution["Partial Match"]}, W:${row.bucket_distribution["Weak Match"]} |`)
        .join("\n");
    const toFlagRows = (rows: FlaggedCase[]): string => {
        if (rows.length === 0) return "_none_";
        return [
            "| job_id | domain_family | top_specialization | total | bucket | specialization_fit | capability_match | evidence_strength |",
            "| --- | --- | --- | ---: | --- | ---: | ---: | ---: |",
            ...rows.map((row) => `| ${row.job_id} | ${row.domain_family} | ${row.top_specialization ?? "unknown"} | ${row.total_score} | ${row.bucket} | ${row.specialization_fit} | ${row.capability_match} | ${row.evidence_strength} |`),
        ].join("\n");
    };

    return [
        "# Job Fit Score Calibration Audit",
        "",
        "## Summary",
        `- Total cases analyzed: ${output.total_cases_analyzed}`,
        `- Average score: ${output.average_score}`,
        `- Median score: ${output.median_score}`,
        "",
        "## Score Distribution",
        "| Range | Count |",
        "| --- | ---: |",
        ...scoreDistRows.map(([range, count]) => `| ${range} | ${count} |`),
        "",
        "## Bucket Distribution",
        "| Bucket | Count |",
        "| --- | ---: |",
        ...bucketDistRows.map(([bucket, count]) => `| ${bucket} | ${count} |`),
        "",
        "## Specialization vs Score Alignment",
        "| Specialization | Cases | Avg Score | Min | Max | Bucket Distribution |",
        "| --- | ---: | ---: | ---: | ---: | --- |",
        specializationRows || "_none_",
        "",
        "## Key Findings",
        ...output.key_findings.map((item) => `- ${item}`),
        "",
        "## Flagged Cases",
        "### potential_under_scoring",
        toFlagRows(output.flagged_cases.potential_under_scoring),
        "",
        "### potential_over_scoring",
        toFlagRows(output.flagged_cases.potential_over_scoring),
        "",
    ].join("\n");
}

async function runAudit(args: ScriptArgs): Promise<CalibrationAuditOutput> {
    loadEnvLocal();
    const fixture = readFixture(args.fixturePath) as Fixture;
    const { profileId, careerId } = await resolveProfileAndCareer(args.profileId, args.careerId);
    const selectedJobs = args.limit ? fixture.jobs.slice(0, args.limit) : fixture.jobs;

    const rows: AuditCaseRow[] = [];
    for (const job of selectedJobs) {
        const resolvedJob = await resolveFixtureJob(job);
        const normalizedDescription = typeof resolvedJob.job_description === "string"
            ? resolvedJob.job_description.trim()
            : "";
        if (normalizedDescription.length < 40) {
            throw new Error(`[${resolvedJob.id}] job description too short for audit (${normalizedDescription.length} chars)`);
        }
        const parsedSignals = buildJobSignalsFromRawJd({
            rawJd: normalizedDescription,
            fallbackTitle: resolvedJob.resolved_title,
        });
        const domainAudit = debugDomainAnchorDetection({
            jobTitle: resolvedJob.resolved_title,
            parsedSignals,
        });
        let capabilityMatch;
        try {
            capabilityMatch = await getCapabilityMatchV2({
                profileId,
                careerId,
                jobTitleHint: resolvedJob.resolved_title,
                jobDescription: normalizedDescription,
            });
        } catch (error) {
            throw new Error(`[${resolvedJob.id}] ${error instanceof Error ? error.message : String(error)}`);
        }
        const ontologyAudit = buildDomainOntologySpecializationAudit({
            jobTitle: resolvedJob.resolved_title,
            parsedSignals,
            matchResult: capabilityMatch,
            detectorWinningFamily: domainAudit.chosenWinnerFamily,
        });
        const fitScore = buildJobFitScoreV1({
            capabilityMatch,
            ontologyAudit,
        });
        const topSpecialization = ontologyAudit.top_specializations[0] ?? null;
        const domainFamily = ontologyAudit.family_aggregation[0]?.family
            ?? topSpecialization?.family
            ?? "unknown";

        rows.push({
            job_id: resolvedJob.id,
            job_title: resolvedJob.resolved_title,
            company: resolvedJob.resolved_company,
            domain_family: domainFamily,
            top_specialization: topSpecialization?.specialization ?? null,
            total_score: fitScore.score.total_score,
            bucket: fitScore.score.bucket,
            breakdown: {
                specialization_fit: fitScore.score.breakdown.specialization_fit,
                capability_match: fitScore.score.breakdown.capability_match,
                evidence_strength: fitScore.score.breakdown.evidence_strength,
            },
        });
    }

    const scoreValues = rows.map((item) => item.total_score);
    const averageScore = round(scoreValues.reduce((sum, value) => sum + value, 0) / Math.max(1, scoreValues.length), 1);
    const medianScore = computeMedian(scoreValues);
    const scoreDistribution = toScoreDistribution(rows);
    const bucketDistribution = toBucketDistribution(rows);
    const flagged = toFlaggedCases(rows);
    const keyFindings = toKeyFindings({
        totalCases: rows.length,
        averageScore,
        medianScore,
        scoreDistribution,
        bucketDistribution,
        flagged,
    });

    return {
        generated_at: new Date().toISOString(),
        fixture_path: args.fixturePath,
        profile_id: profileId,
        career_id: careerId,
        total_cases_analyzed: rows.length,
        average_score: averageScore,
        median_score: medianScore,
        score_distribution: scoreDistribution,
        bucket_distribution: bucketDistribution,
        specialization_score_alignment: toSpecializationAlignment(rows),
        flagged_cases: flagged,
        key_findings: keyFindings,
        cases: rows,
    };
}

async function main(): Promise<void> {
    const args = parseArgs();
    const output = await runAudit(args);
    writeJson(args.outJsonPath, output);
    writeMarkdown(args.outMarkdownPath, toMarkdown(output));

    // eslint-disable-next-line no-console
    console.log(`Total cases: ${output.total_cases_analyzed}`);
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log("Score distribution:");
    // eslint-disable-next-line no-console
    console.log(`0-20: ${output.score_distribution["0-20"]}`);
    // eslint-disable-next-line no-console
    console.log(`20-40: ${output.score_distribution["20-40"]}`);
    // eslint-disable-next-line no-console
    console.log(`40-60: ${output.score_distribution["40-60"]}`);
    // eslint-disable-next-line no-console
    console.log(`60-80: ${output.score_distribution["60-80"]}`);
    // eslint-disable-next-line no-console
    console.log(`80-100: ${output.score_distribution["80-100"]}`);
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log("Bucket distribution:");
    // eslint-disable-next-line no-console
    console.log(`Strong: ${output.bucket_distribution["Strong Match"]}`);
    // eslint-disable-next-line no-console
    console.log(`Good: ${output.bucket_distribution["Good Match"]}`);
    // eslint-disable-next-line no-console
    console.log(`Partial: ${output.bucket_distribution["Partial Match"]}`);
    // eslint-disable-next-line no-console
    console.log(`Weak: ${output.bucket_distribution["Weak Match"]}`);
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log(`Potential under-scoring cases: ${output.flagged_cases.potential_under_scoring.length}`);
    // eslint-disable-next-line no-console
    console.log(`Potential over-scoring cases: ${output.flagged_cases.potential_over_scoring.length}`);
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        status: "ok",
        out_json: args.outJsonPath,
        out_markdown: args.outMarkdownPath,
    }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    main().catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[run-job-fit-score-calibration-audit] failed:", error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
