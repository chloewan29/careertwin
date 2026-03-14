import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { getCapabilityMatchV1 } from "@/lib/career-engine/matching/capability-match-v1";
import {
    getCapabilityMatchV2,
    type CapabilityMatchV2Result,
    type HumanAlignmentBucket,
} from "@/lib/career-engine/matching/capability-match-v2";

type HumanLabel = HumanAlignmentBucket;

export type FixtureJobSource =
    | { type: "inline"; job_description: string }
    | { type: "file"; job_description_file: string }
    | { type: "snapshot"; job_snapshot_id: number }
    | { type: "interaction"; interaction_id: number }
    | { type: "lookup"; job_title: string; company?: string | null };

export type FixtureJob = {
    id: string;
    title: string;
    company?: string | null;
    human_label: HumanLabel;
    human_reasoning_short: string;
    source?: FixtureJobSource;
    job_description?: string;
};

export type Fixture = {
    version: string;
    jobs: FixtureJob[];
};

export type ResolvedFixtureJob = FixtureJob & {
    resolved_title: string;
    resolved_company: string | null;
    resolved_source: string;
    job_description: string;
};

export type EvalRow = {
    id: string;
    title: string;
    human_label: HumanLabel;
    human_reasoning_short: string;
    resolved_source: string;
    model_score: number;
    model_bucket: HumanLabel;
    agreement: "agree" | "disagree";
    likely_cause_of_disagreement: string;
    extraction_quality: string | null;
    top_transfer_patterns: string[];
    mapped_target_clusters: string[];
};

export type HumanAlignmentBenchmarkMetrics = {
    bucket_agreement: number;
    over_reject_rate: number;
    over_accept_rate: number;
    average_score_for_human_high_fit_cases: number;
    average_score_for_human_medium_fit_cases: number;
    average_score_for_human_low_fit_cases: number;
};

export type HumanAlignmentBenchmarkOutput = {
    fixture_version: string;
    profile_id: string;
    career_id: string;
    job_count: number;
    baseline_v1: {
        metrics: HumanAlignmentBenchmarkMetrics;
        rows: EvalRow[];
    };
    before_v2: {
        variant: string;
        metrics: HumanAlignmentBenchmarkMetrics;
        rows: EvalRow[];
    };
    improved_v2: {
        metrics: HumanAlignmentBenchmarkMetrics;
        rows: EvalRow[];
    };
    promoted_cases: Array<{
        id: string;
        title: string;
        human_label: HumanLabel;
        before_bucket: HumanLabel;
        after_bucket: HumanLabel;
        score_delta: number;
        why: string;
    }>;
    guardrails: {
        before_v2_over_reject_rate: number;
        improved_v2_over_reject_rate: number;
        before_v2_over_accept_rate: number;
        improved_v2_over_accept_rate: number;
        over_reject_non_regression: boolean;
        over_accept_non_regression: boolean;
    };
};

type SnapshotRow = {
    job_snapshot_id: number;
    job_title: string | null;
    company: string | null;
    job_description_raw: string | null;
};

export function loadEnvLocal(): void {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function parseArgs(): {
    profileId: string | null;
    careerId: string | null;
    fixturePath: string;
    outFile: string | null;
} {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        profileId: readArg("--profileId"),
        careerId: readArg("--careerId"),
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        outFile: readArg("--out"),
    };
}

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return createClient(url, key);
}

export async function resolveProfileAndCareer(profileId: string | null, careerId: string | null): Promise<{ profileId: string; careerId: string }> {
    const supabase = getSupabaseClient();

    if (careerId) {
        const { data, error } = await supabase
            .from("careers")
            .select("id, user_id")
            .eq("id", careerId)
            .single();
        if (error || !data?.id || !data?.user_id) {
            throw new Error(`Failed to resolve career ${careerId}: ${error?.message ?? "not found"}`);
        }
        return { profileId: data.user_id as string, careerId: data.id as string };
    }

    if (profileId) {
        const { data, error } = await supabase
            .from("careers")
            .select("id, user_id")
            .eq("user_id", profileId)
            .order("created_at", { ascending: false })
            .limit(1);
        if (error || !data?.[0]?.id || !data?.[0]?.user_id) {
            throw new Error(`Failed to resolve latest career for profile ${profileId}: ${error?.message ?? "not found"}`);
        }
        return { profileId: data[0].user_id as string, careerId: data[0].id as string };
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);
    if (error || !data?.[0]?.id) {
        throw new Error(`Failed to auto-resolve profile: ${error?.message ?? "not found"}`);
    }
    return resolveProfileAndCareer(data[0].id as string, null);
}

export function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

function selectFixtureJobs(fixture: Fixture, caseIds: string[] | null): FixtureJob[] {
    if (!caseIds || caseIds.length === 0) return fixture.jobs;
    const allowed = new Set(caseIds);
    return fixture.jobs.filter((job) => allowed.has(job.id));
}

async function resolveSnapshotById(jobSnapshotId: number): Promise<SnapshotRow> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id, job_title, company, job_description_raw")
        .eq("job_snapshot_id", jobSnapshotId)
        .single();
    if (error || !data?.job_snapshot_id) {
        throw new Error(`Failed to load job snapshot ${jobSnapshotId}: ${error?.message ?? "not found"}`);
    }
    return data as SnapshotRow;
}

async function resolveSnapshotByInteraction(interactionId: number): Promise<SnapshotRow> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("user_job_interactions")
        .select("job_snapshot_id")
        .eq("interaction_id", interactionId)
        .single();
    if (error || !data?.job_snapshot_id) {
        throw new Error(`Failed to resolve interaction ${interactionId}: ${error?.message ?? "not found"}`);
    }
    return resolveSnapshotById(data.job_snapshot_id as number);
}

async function resolveSnapshotByLookup(jobTitle: string, company?: string | null): Promise<SnapshotRow> {
    const supabase = getSupabaseClient();
    let query = supabase
        .from("job_snapshots")
        .select("job_snapshot_id, job_title, company, job_description_raw")
        .ilike("job_title", `%${jobTitle}%`)
        .order("extracted_at", { ascending: false })
        .limit(10);
    if (company) {
        query = query.ilike("company", `%${company}%`);
    }
    const { data, error } = await query;
    if (error || !data?.[0]?.job_snapshot_id) {
        throw new Error(`Failed to resolve snapshot for ${jobTitle}: ${error?.message ?? "not found"}`);
    }
    return data[0] as SnapshotRow;
}

export async function resolveFixtureJob(job: FixtureJob): Promise<ResolvedFixtureJob> {
    const source = job.source ?? (job.job_description ? { type: "inline", job_description: job.job_description } satisfies FixtureJobSource : null);
    if (!source) {
        throw new Error(`Fixture job ${job.id} is missing source/job_description.`);
    }

    if (source.type === "inline") {
        return {
            ...job,
            resolved_title: job.title,
            resolved_company: job.company ?? null,
            resolved_source: "inline",
            job_description: source.job_description,
        };
    }

    if (source.type === "file") {
        const absolute = path.isAbsolute(source.job_description_file)
            ? source.job_description_file
            : path.join(process.cwd(), source.job_description_file);
        return {
            ...job,
            resolved_title: job.title,
            resolved_company: job.company ?? null,
            resolved_source: `file:${source.job_description_file}`,
            job_description: fs.readFileSync(absolute, "utf8"),
        };
    }

    const snapshot = source.type === "snapshot"
        ? await resolveSnapshotById(source.job_snapshot_id)
        : source.type === "interaction"
            ? await resolveSnapshotByInteraction(source.interaction_id)
            : await resolveSnapshotByLookup(source.job_title, source.company ?? job.company ?? null);

    return {
        ...job,
        resolved_title: snapshot.job_title ?? job.title,
        resolved_company: snapshot.company ?? job.company ?? null,
        resolved_source: source.type === "snapshot"
            ? `snapshot:${source.job_snapshot_id}`
            : source.type === "interaction"
                ? `interaction:${source.interaction_id}`
                : `lookup:${source.job_title}`,
        job_description: snapshot.job_description_raw ?? "",
    };
}

function v1Bucket(score: number): HumanLabel {
    if (score >= 0.62) return "high_fit";
    if (score >= 0.38) return "medium_fit";
    return "low_fit";
}

function summarizeMetrics(rows: EvalRow[]): HumanAlignmentBenchmarkMetrics {
    const bucketAgreement = rows.length > 0
        ? rows.filter((row) => row.agreement === "agree").length / rows.length
        : 0;
    const overRejectRate = rows.filter((row) => row.human_label === "high_fit" && row.model_bucket === "low_fit").length / Math.max(1, rows.length);
    const overAcceptRate = rows.filter((row) => row.human_label === "low_fit" && row.model_bucket === "high_fit").length / Math.max(1, rows.length);
    const averageScoreFor = (label: HumanLabel): number => {
        const matching = rows.filter((row) => row.human_label === label);
        if (matching.length === 0) return 0;
        return matching.reduce((sum, row) => sum + row.model_score, 0) / matching.length;
    };
    return {
        bucket_agreement: Number(bucketAgreement.toFixed(4)),
        over_reject_rate: Number(overRejectRate.toFixed(4)),
        over_accept_rate: Number(overAcceptRate.toFixed(4)),
        average_score_for_human_high_fit_cases: Number(averageScoreFor("high_fit").toFixed(2)),
        average_score_for_human_medium_fit_cases: Number(averageScoreFor("medium_fit").toFixed(2)),
        average_score_for_human_low_fit_cases: Number(averageScoreFor("low_fit").toFixed(2)),
    };
}

function inferDisagreementCause(params: {
    humanLabel: HumanLabel;
    modelBucket: HumanLabel;
    v1Gaps?: string[];
    v2Reasons?: string[];
    penaltyReasons?: string[];
}): string {
    if (params.humanLabel === params.modelBucket) return "Aligned with human label.";
    if (params.humanLabel === "high_fit" && params.modelBucket === "low_fit") {
        return params.v2Reasons?.[0] ?? params.v1Gaps?.[0] ?? "Over-reject driven by under-recognized transferable evidence.";
    }
    if (params.humanLabel === "low_fit" && params.modelBucket === "high_fit") {
        return "Over-accept driven by insufficient blocking-gap enforcement.";
    }
    return params.penaltyReasons?.[0] ?? params.v2Reasons?.[0] ?? "Boundary disagreement near threshold.";
}

function toEvalRow(params: {
    job: ResolvedFixtureJob;
    score: number;
    bucket: HumanLabel;
    disagreementCause: string;
    extractionQuality?: string | null;
    topTransferPatterns?: string[];
    mappedTargetClusters?: string[];
}): EvalRow {
    return {
        id: params.job.id,
        title: params.job.resolved_title,
        human_label: params.job.human_label,
        human_reasoning_short: params.job.human_reasoning_short,
        resolved_source: params.job.resolved_source,
        model_score: Number((params.score * 100).toFixed(2)),
        model_bucket: params.bucket,
        agreement: params.bucket === params.job.human_label ? "agree" : "disagree",
        likely_cause_of_disagreement: params.disagreementCause,
        extraction_quality: params.extractionQuality ?? null,
        top_transfer_patterns: params.topTransferPatterns ?? [],
        mapped_target_clusters: params.mappedTargetClusters ?? [],
    };
}

function summarizePromotionExamples(params: {
    beforeRows: EvalRow[];
    afterRows: EvalRow[];
    improvedResultsById: Map<string, CapabilityMatchV2Result>;
}): Array<{
    id: string;
    title: string;
    human_label: HumanLabel;
    before_bucket: HumanLabel;
    after_bucket: HumanLabel;
    score_delta: number;
    why: string;
}> {
    return params.afterRows
        .map((afterRow) => {
            const beforeRow = params.beforeRows.find((row) => row.id === afterRow.id);
            const improved = params.improvedResultsById.get(afterRow.id);
            if (!beforeRow || !improved) return null;
            if (beforeRow.model_bucket !== "medium_fit" || afterRow.model_bucket !== "high_fit") return null;
            return {
                id: afterRow.id,
                title: afterRow.title,
                human_label: afterRow.human_label,
                before_bucket: beforeRow.model_bucket,
                after_bucket: afterRow.model_bucket,
                score_delta: Number((afterRow.model_score - beforeRow.model_score).toFixed(2)),
                why: [
                    improved.audit.positive_contributors[0]?.label,
                    ...improved.audit.capability_transfer_inference.transfer_patterns
                        .slice(0, 2)
                        .map((pattern) => pattern.display_name),
                    ...improved.audit.requirement_to_candidate_match_breakdown
                        .flatMap((item) => item.supporting_patterns)
                        .filter(Boolean),
                ].filter(Boolean).slice(0, 3).join("; "),
            };
        })
        .filter((item): item is {
            id: string;
            title: string;
            human_label: HumanLabel;
            before_bucket: HumanLabel;
            after_bucket: HumanLabel;
            score_delta: number;
            why: string;
        } => Boolean(item));
}

export async function runHumanAlignmentBenchmark(args: {
    profileId?: string | null;
    careerId?: string | null;
    fixturePath?: string;
    caseIds?: string[] | null;
    outFile?: string | null;
} = {}): Promise<HumanAlignmentBenchmarkOutput> {
    loadEnvLocal();
    const fixturePath = args.fixturePath ?? "scripts/fixtures/human-alignment-benchmark.seed.json";
    const outFile = args.outFile ?? null;
    const { profileId, careerId } = await resolveProfileAndCareer(args.profileId ?? null, args.careerId ?? null);
    const fixture = readFixture(fixturePath);
    const jobs = selectFixtureJobs(fixture, args.caseIds ?? null);
    if (!jobs || jobs.length === 0) {
        throw new Error("Fixture has no jobs.");
    }

    const baselineRows: EvalRow[] = [];
    const beforeV2Rows: EvalRow[] = [];
    const improvedRows: EvalRow[] = [];
    const improvedResultsById = new Map<string, CapabilityMatchV2Result>();

    for (const job of jobs) {
        const resolvedJob = await resolveFixtureJob(job);
        if (!resolvedJob.job_description || resolvedJob.job_description.trim().length < 40) {
            throw new Error(`Resolved job ${job.id} has an insufficient job description.`);
        }

        const baseline = await getCapabilityMatchV1({
            careerId,
            jobDescription: resolvedJob.job_description,
            topSignalsLimit: 4,
        });
        const beforeV2 = await getCapabilityMatchV2({
            careerId,
            profileId,
            jobDescription: resolvedJob.job_description,
            jobTitleHint: resolvedJob.resolved_title,
            topSignalsLimit: 4,
            variant: {
                variant_name: "without_transfer_pattern_aggregation",
                transfer_pattern_aggregation: false,
            },
        });
        const improved = await getCapabilityMatchV2({
            careerId,
            profileId,
            jobDescription: resolvedJob.job_description,
            jobTitleHint: resolvedJob.resolved_title,
            topSignalsLimit: 4,
        });

        const baselineBucket = v1Bucket(baseline.overall_match_score);
        baselineRows.push(toEvalRow({
            job: resolvedJob,
            score: baseline.overall_match_score,
            bucket: baselineBucket,
            disagreementCause: inferDisagreementCause({
                humanLabel: resolvedJob.human_label,
                modelBucket: baselineBucket,
                v1Gaps: baseline.gaps.slice(0, 3).map((item) => item.display_name),
            }),
            extractionQuality: null,
            topTransferPatterns: [],
            mappedTargetClusters: [],
        }));

        beforeV2Rows.push(toEvalRow({
            job: resolvedJob,
            score: beforeV2.overall_match_score,
            bucket: beforeV2.fit_bucket,
            disagreementCause: inferDisagreementCause({
                humanLabel: resolvedJob.human_label,
                modelBucket: beforeV2.fit_bucket,
                v2Reasons: beforeV2.audit.negative_contributors.slice(0, 3).map((item) => item.reason),
                penaltyReasons: beforeV2.audit.penalties.map((item) => item.reason),
            }),
            extractionQuality: beforeV2.job_profile_quality,
            topTransferPatterns: beforeV2.audit.capability_transfer_inference.transfer_patterns
                .slice(0, 3)
                .map((pattern) => pattern.display_name),
            mappedTargetClusters: Array.from(new Set(
                beforeV2.audit.capability_transfer_inference.transfer_patterns
                    .flatMap((pattern) => pattern.mapped_target_clusters),
            )).slice(0, 4),
        }));

        improvedRows.push(toEvalRow({
            job: resolvedJob,
            score: improved.overall_match_score,
            bucket: improved.fit_bucket,
            disagreementCause: inferDisagreementCause({
                humanLabel: resolvedJob.human_label,
                modelBucket: improved.fit_bucket,
                v2Reasons: improved.audit.negative_contributors.slice(0, 3).map((item) => item.reason),
                penaltyReasons: improved.audit.penalties.map((item) => item.reason),
            }),
            extractionQuality: improved.job_profile_quality,
            topTransferPatterns: improved.audit.capability_transfer_inference.transfer_patterns
                .slice(0, 3)
                .map((pattern) => pattern.display_name),
            mappedTargetClusters: Array.from(new Set(
                improved.audit.capability_transfer_inference.transfer_patterns
                    .flatMap((pattern) => pattern.mapped_target_clusters),
            )).slice(0, 4),
        }));

        improvedResultsById.set(job.id, improved);
    }

    const baselineMetrics = summarizeMetrics(baselineRows);
    const beforeV2Metrics = summarizeMetrics(beforeV2Rows);
    const improvedMetrics = summarizeMetrics(improvedRows);

    const output: HumanAlignmentBenchmarkOutput = {
        fixture_version: fixture.version,
        profile_id: profileId,
        career_id: careerId,
        job_count: jobs.length,
        baseline_v1: {
            metrics: baselineMetrics,
            rows: baselineRows,
        },
        before_v2: {
            variant: "without_transfer_pattern_aggregation",
            metrics: beforeV2Metrics,
            rows: beforeV2Rows,
        },
        improved_v2: {
            metrics: improvedMetrics,
            rows: improvedRows,
        },
        promoted_cases: summarizePromotionExamples({
            beforeRows: beforeV2Rows,
            afterRows: improvedRows,
            improvedResultsById,
        }),
        guardrails: {
            before_v2_over_reject_rate: beforeV2Metrics.over_reject_rate,
            improved_v2_over_reject_rate: improvedMetrics.over_reject_rate,
            before_v2_over_accept_rate: beforeV2Metrics.over_accept_rate,
            improved_v2_over_accept_rate: improvedMetrics.over_accept_rate,
            over_reject_non_regression: improvedMetrics.over_reject_rate <= beforeV2Metrics.over_reject_rate,
            over_accept_non_regression: improvedMetrics.over_accept_rate <= beforeV2Metrics.over_accept_rate,
        },
    };

    const serialized = JSON.stringify(output, null, 2);
    if (outFile) {
        const absolute = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile);
        fs.writeFileSync(absolute, serialized, "utf8");
    }
    return output;
}

async function run(): Promise<void> {
    const args = parseArgs();
    const output = await runHumanAlignmentBenchmark(args);
    console.log(JSON.stringify(output, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    run().catch((error) => {
        console.error("[human-alignment-benchmark] Failed", error);
        process.exit(1);
    });
}
