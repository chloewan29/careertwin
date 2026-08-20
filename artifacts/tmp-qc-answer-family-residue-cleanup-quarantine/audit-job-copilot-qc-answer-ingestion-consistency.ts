import fs from "node:fs";
import path from "node:path";
import { analyzeJobForCopilot, recalculateFitAfterCalibration } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type Fixture = {
    jobs: Array<{
        id: string;
        title: string;
        company?: string | null;
        job_description: string;
    }>;
};

type Args = {
    profileId: string;
    fixturePath: string;
    outPath: string;
};

const CASE_SET = ["job-01", "job-14", "job-03", "job-18"] as const;

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        profileId: readArg("--profileId") ?? process.env.JC_PROFILE_ID ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        outPath: readArg("--out") ?? `artifacts/job-copilot-ns-quick-checks-generic-answer-linkage-ingestion-consistency-audit.${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    };
}

function loadEnvLocal(): void {
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

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);

    const rows: Array<Record<string, unknown>> = [];

    for (const caseId of CASE_SET) {
        const job = fixture.jobs.find((item) => item.id === caseId);
        if (!job) throw new Error(`Missing fixture case ${caseId}`);

        const baseInput = {
            profileId: args.profileId,
            source: "linkedin" as const,
            jobUrl: `https://qc-generic-answer-linkage.local/${caseId}`,
            jobTitle: job.title,
            company: job.company ?? null,
            location: null,
            jobDescription: job.job_description,
            topEvidenceLimit: 4,
        };

        const base = await analyzeJobForCopilot(baseInput);
        const baseResponse = (base.response ?? {}) as Record<string, any>;
        const baseQuestions = Array.isArray(baseResponse.calibrationQuestions)
            ? baseResponse.calibrationQuestions.filter((q: any) => q && typeof q.id === "string").slice(0, 2)
            : [];

        const answers = baseQuestions.map((question: any, index: number) => ({
            questionId: String(question.id),
            answer: (index % 2 === 0 ? "yes" : "no") as "yes" | "no",
        }));

        const replay = await recalculateFitAfterCalibration({
            ...baseInput,
            calibrationAnswers: answers,
        });

        const replayResponse = (replay.response ?? {}) as Record<string, any>;
        const replayQuestions = Array.isArray(replayResponse.calibrationQuestions) ? replayResponse.calibrationQuestions : [];
        const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]));
        const matchedReplayQuestions = replayQuestions.filter((q: any) => answerMap.has(String(q?.id ?? "")));
        const matchedNonNullAnswers = matchedReplayQuestions.filter((q: any) => q?.answer === "yes" || q?.answer === "no");
        const answerParityMismatches = matchedReplayQuestions
            .filter((q: any) => (q?.answer === "yes" || q?.answer === "no") && answerMap.get(String(q.id)) !== q.answer)
            .map((q: any) => ({
                questionId: String(q.id),
                sent: answerMap.get(String(q.id)) ?? null,
                replay: q.answer ?? null,
            }));
        const calibrationState = (replayResponse.calibrationState ?? {}) as Record<string, any>;
        const answeredCount = Number(calibrationState.answeredCount ?? 0);
        const recalibrated = Boolean(calibrationState.recalibrated ?? false);
        const scoreDelta = Number(calibrationState.scoreDelta ?? 0);

        const ingestionConsistent =
            answers.length > 0
            && matchedNonNullAnswers.length === answers.length
            && answerParityMismatches.length === 0
            && answeredCount >= answers.length
            && recalibrated;

        rows.push({
            case_id: caseId,
            sent_answers_count: answers.length,
            sent_question_ids: answers.map((item) => item.questionId),
            replay_answered_count: answeredCount,
            replay_recalibrated: recalibrated,
            replay_score_delta: scoreDelta,
            matched_replay_questions_count: matchedReplayQuestions.length,
            matched_non_null_answers_count: matchedNonNullAnswers.length,
            answer_parity_mismatches: answerParityMismatches,
            replay_question_answers: matchedReplayQuestions.map((q: any) => ({ id: String(q.id), answer: q.answer ?? null })),
            ingestion_consistent: ingestionConsistent,
            decision_update_prereq_consistent:
                answers.length > 0
                && matchedNonNullAnswers.length === answers.length
                && answeredCount > 0,
        });
    }

    const total = rows.length;
    const sentPositiveCount = rows.filter((row) => Number(row.sent_answers_count) > 0).length;
    const answeredPositiveCount = rows.filter((row) => Number(row.replay_answered_count) > 0).length;
    const nonNullReplayCount = rows.filter((row) => Number(row.matched_non_null_answers_count) === Number(row.sent_answers_count)).length;
    const ingestionConsistentCount = rows.filter((row) => Boolean(row.ingestion_consistent)).length;
    const prereqConsistentCount = rows.filter((row) => Boolean(row.decision_update_prereq_consistent)).length;
    const candidateStrengthened = ingestionConsistentCount === total && total > 0;

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "bounded_ingestion_consistency_audit",
        current_mode: "AUDIT",
        line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-ANSWER-LINKAGE",
        first_drift_point: "stage_calibration_answer_ingestion_bypass_before_decision_update",
        first_writable_fault: {
            status: candidateStrengthened ? "isolated_candidate_strengthened" : "candidate_not_yet_isolated",
            label: "quick_check_answer_replay_entrypoint_drops_calibration_answers",
            surface: [
                "lib/career-engine/job-copilot/backend/job-copilot-service.ts:6826-6830",
                "scripts/audit-job-copilot-qc-generic-probe.ts:132-142",
                "scripts/audit-job-copilot-quick-checks-owner-path.ts:267-277",
            ],
        },
        answer_aware_path_control: {
            replay_path: "recalculateFitAfterCalibration_only",
            mixed_replay_paths_used: false,
            answer_aware_entrypoints: [
                "lib/career-engine/job-copilot/backend/job-copilot-service.ts:6834-6839",
                "app/api/job-copilot/extension/recalibrate/route.ts:65-76",
            ],
        },
        ingestion_consistency_summary: {
            sent_answers_positive_rate: `${sentPositiveCount}/${total}`,
            replay_answered_count_positive_rate: `${answeredPositiveCount}/${total}`,
            replay_non_null_answer_parity_rate: `${nonNullReplayCount}/${total}`,
            ingestion_consistent_rate: `${ingestionConsistentCount}/${total}`,
            decision_update_prereq_consistent_rate: `${prereqConsistentCount}/${total}`,
        },
        candidate_status: candidateStrengthened ? "strengthened" : "unchanged",
        repair_admission_allowed: false,
        minimal_remaining_blocker: candidateStrengthened
            ? "Need one bounded residual-impact pass (same answer-aware path) to prove confidence/risk/cta/recommendation movement ownership before admission."
            : "Ingestion consistency did not stabilize under answer-aware path; owner may be deeper than replay entrypoint wrapper.",
        governance: {
            memory_sync_required: false,
            memory_sync_targets: [],
        },
        case_diagnostics: rows,
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

    console.log(JSON.stringify({
        outPath,
        ingestion_consistent_rate: result.ingestion_consistency_summary.ingestion_consistent_rate,
        candidate_status: result.candidate_status,
        repair_admission_allowed: result.repair_admission_allowed,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
