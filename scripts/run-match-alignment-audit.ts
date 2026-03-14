import fs from "node:fs";
import path from "node:path";
import {
    runHumanAlignmentBenchmark,
    type EvalRow,
} from "@/scripts/human-alignment-benchmark";

type AuditArgs = {
    profileId: string | null;
    careerId: string | null;
    fixturePath: string;
    summaryOut: string;
    detailsOut: string;
};

type MatchAlignmentSummary = {
    fixture_version: string;
    profile_id: string;
    career_id: string;
    total_cases: number;
    bucket_agreement: number;
    over_reject_rate: number;
    over_accept_rate: number;
    avg_score_human_high_fit: number;
    avg_score_human_medium_fit: number;
    avg_score_human_low_fit: number;
};

type MatchAlignmentCaseDetail = {
    case_id: string;
    title: string;
    human_label: EvalRow["human_label"];
    model_score: number;
    model_bucket: EvalRow["model_bucket"];
    agreement: EvalRow["agreement"];
    short_disagreement_reason: string;
    extraction_quality: string | null;
};

function parseArgs(): AuditArgs {
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
        summaryOut: readArg("--summaryOut") ?? "tmp-match-alignment-summary.json",
        detailsOut: readArg("--detailsOut") ?? "tmp-match-alignment-details.json",
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function run(): Promise<void> {
    const args = parseArgs();
    const benchmark = await runHumanAlignmentBenchmark({
        profileId: args.profileId,
        careerId: args.careerId,
        fixturePath: args.fixturePath,
    });

    const summary: MatchAlignmentSummary = {
        fixture_version: benchmark.fixture_version,
        profile_id: benchmark.profile_id,
        career_id: benchmark.career_id,
        total_cases: benchmark.job_count,
        bucket_agreement: benchmark.improved_v2.metrics.bucket_agreement,
        over_reject_rate: benchmark.improved_v2.metrics.over_reject_rate,
        over_accept_rate: benchmark.improved_v2.metrics.over_accept_rate,
        avg_score_human_high_fit: benchmark.improved_v2.metrics.average_score_for_human_high_fit_cases,
        avg_score_human_medium_fit: benchmark.improved_v2.metrics.average_score_for_human_medium_fit_cases,
        avg_score_human_low_fit: benchmark.improved_v2.metrics.average_score_for_human_low_fit_cases,
    };

    const details: MatchAlignmentCaseDetail[] = benchmark.improved_v2.rows.map((row) => ({
        case_id: row.id,
        title: row.title,
        human_label: row.human_label,
        model_score: row.model_score,
        model_bucket: row.model_bucket,
        agreement: row.agreement,
        short_disagreement_reason: row.likely_cause_of_disagreement,
        extraction_quality: row.extraction_quality,
    }));

    writeJson(args.summaryOut, summary);
    writeJson(args.detailsOut, details);

    console.log(JSON.stringify({
        summary_out: args.summaryOut,
        details_out: args.detailsOut,
        total_cases: summary.total_cases,
        bucket_agreement: summary.bucket_agreement,
        over_reject_rate: summary.over_reject_rate,
        over_accept_rate: summary.over_accept_rate,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-match-alignment-audit] Failed", error);
    process.exit(1);
});
