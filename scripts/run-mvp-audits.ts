import fs from "node:fs";
import path from "node:path";
import { runHumanAlignmentBenchmark } from "@/scripts/human-alignment-benchmark";
import { runCapabilityDifferentiationAudit } from "@/scripts/run-capability-differentiation-audit";
import { runJobSignalQualityAudit } from "@/scripts/run-job-signal-quality-audit";

type AuditArgs = {
    profileId: string | null;
    careerId: string | null;
    fixturePath: string;
    caseIds: string[] | null;
    outFile: string;
};

type CombinedMvpAuditSummary = {
    alignment: {
        total_cases: number;
        bucket_agreement: number;
        over_reject_rate: number;
        over_accept_rate: number;
        avg_score_human_high_fit: number;
        avg_score_human_medium_fit: number;
        avg_score_human_low_fit: number;
    };
    differentiation: {
        total_cases: number;
        average_top5_overlap: number;
        max_top5_overlap: number;
        min_top5_overlap: number;
        number_of_pairs_above_0_8_overlap: number;
        number_of_pairs_below_0_4_overlap: number;
    };
    signal_quality: {
        total_cases: number;
        rich_count: number;
        medium_count: number;
        sparse_count: number;
        sparse_rate: number;
        average_description_length: number;
        average_requirement_cluster_count: number;
        average_capability_cluster_count: number;
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
        outFile: readArg("--out") ?? "tmp-mvp-audit-summary.json",
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function run(): Promise<void> {
    const args = parseArgs();

    const [alignmentBenchmark, differentiationAudit, signalQualityAudit] = await Promise.all([
        runHumanAlignmentBenchmark({
            profileId: args.profileId,
            careerId: args.careerId,
            fixturePath: args.fixturePath,
            caseIds: args.caseIds,
        }),
        runCapabilityDifferentiationAudit({
            profileId: args.profileId,
            careerId: args.careerId,
            fixturePath: args.fixturePath,
            caseIds: args.caseIds,
        }),
        runJobSignalQualityAudit({
            profileId: args.profileId,
            careerId: args.careerId,
            fixturePath: args.fixturePath,
            caseIds: args.caseIds,
        }),
    ]);

    const combinedSummary: CombinedMvpAuditSummary = {
        alignment: {
            total_cases: alignmentBenchmark.job_count,
            bucket_agreement: alignmentBenchmark.improved_v2.metrics.bucket_agreement,
            over_reject_rate: alignmentBenchmark.improved_v2.metrics.over_reject_rate,
            over_accept_rate: alignmentBenchmark.improved_v2.metrics.over_accept_rate,
            avg_score_human_high_fit: alignmentBenchmark.improved_v2.metrics.average_score_for_human_high_fit_cases,
            avg_score_human_medium_fit: alignmentBenchmark.improved_v2.metrics.average_score_for_human_medium_fit_cases,
            avg_score_human_low_fit: alignmentBenchmark.improved_v2.metrics.average_score_for_human_low_fit_cases,
        },
        differentiation: {
            total_cases: differentiationAudit.summary.total_cases,
            average_top5_overlap: differentiationAudit.summary.average_top5_overlap,
            max_top5_overlap: differentiationAudit.summary.max_top5_overlap,
            min_top5_overlap: differentiationAudit.summary.min_top5_overlap,
            number_of_pairs_above_0_8_overlap: differentiationAudit.summary.number_of_pairs_above_0_8_overlap,
            number_of_pairs_below_0_4_overlap: differentiationAudit.summary.number_of_pairs_below_0_4_overlap,
        },
        signal_quality: {
            total_cases: signalQualityAudit.summary.total_cases,
            rich_count: signalQualityAudit.summary.rich_count,
            medium_count: signalQualityAudit.summary.medium_count,
            sparse_count: signalQualityAudit.summary.sparse_count,
            sparse_rate: signalQualityAudit.summary.sparse_rate,
            average_description_length: signalQualityAudit.summary.average_description_length,
            average_requirement_cluster_count: signalQualityAudit.summary.average_requirement_cluster_count,
            average_capability_cluster_count: signalQualityAudit.summary.average_capability_cluster_count,
        },
    };

    writeJson(args.outFile, combinedSummary);

    console.log(JSON.stringify({
        alignment: {
            bucket_agreement: combinedSummary.alignment.bucket_agreement,
            over_reject_rate: combinedSummary.alignment.over_reject_rate,
        },
        differentiation: {
            average_top5_overlap: combinedSummary.differentiation.average_top5_overlap,
            "number_of_pairs_above_0.8_overlap": combinedSummary.differentiation.number_of_pairs_above_0_8_overlap,
        },
        signal_quality: {
            sparse_rate: combinedSummary.signal_quality.sparse_rate,
        },
        out_file: args.outFile,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-mvp-audits] Failed", error);
    process.exit(1);
});
