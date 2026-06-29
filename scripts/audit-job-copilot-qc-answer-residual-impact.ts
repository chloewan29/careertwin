import fs from "node:fs";
import path from "node:path";
import { recalculateFitAfterCalibration } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

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
        outPath: readArg("--out") ?? `artifacts/job-copilot-ns-quick-checks-generic-answer-linkage-residual-impact-audit.${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
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

function normalize(value: unknown): string {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => normalize(item)).filter(Boolean);
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);

    const rows: Array<Record<string, unknown>> = [];

    for (const caseId of CASE_SET) {
        const job = fixture.jobs.find((item) => item.id === caseId);
        if (!job) throw new Error(`Missing fixture case ${caseId}`);

        const controlledInput = {
            profileId: args.profileId,
            source: "linkedin" as const,
            jobUrl: `https://qc-generic-answer-linkage.local/${caseId}`,
            jobTitle: job.title,
            company: job.company ?? null,
            location: null,
            jobDescription: job.job_description,
            topEvidenceLimit: 4,
        };

        // Single-path baseline: still uses answer-aware recalibration entrypoint with empty answers.
        const base = await recalculateFitAfterCalibration({
            ...controlledInput,
            calibrationAnswers: [],
        });
        const baseResponse = (base.response ?? {}) as Record<string, any>;
        const baseQuestions = Array.isArray(baseResponse.calibrationQuestions)
            ? baseResponse.calibrationQuestions.filter((q: any) => q && typeof q.id === "string").slice(0, 2)
            : [];
        const answers = baseQuestions.map((question: any, index: number) => ({
            questionId: String(question.id),
            answer: (index % 2 === 0 ? "yes" : "no") as "yes" | "no",
        }));

        const post = await recalculateFitAfterCalibration({
            ...controlledInput,
            calibrationAnswers: answers,
        });
        const postResponse = (post.response ?? {}) as Record<string, any>;

        const baseSelection = (baseResponse?.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
        const postSelection = (postResponse?.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;

        const baseScore = Number(baseResponse?.applyRecommendation?.score ?? 0);
        const postScore = Number(postResponse?.applyRecommendation?.score ?? 0);
        const scoreDelta = postScore - baseScore;
        const baseBand = String(baseResponse?.applyRecommendation?.band ?? "");
        const postBand = String(postResponse?.applyRecommendation?.band ?? "");
        const bandChanged = baseBand !== postBand;
        const verdictChanged = String(baseResponse?.verdict ?? "") !== String(postResponse?.verdict ?? "");
        const ctaChanged = String(baseSelection?.recommendation?.cta_state ?? "") !== String(postSelection?.recommendation?.cta_state ?? "");
        const riskPrimaryGapChanged =
            normalize(baseSelection?.contract_risk_interview?.primary_gap ?? "") !== normalize(postSelection?.contract_risk_interview?.primary_gap ?? "");
        const riskHypothesisChanged = JSON.stringify(normalizeList(baseSelection?.contract_risk_interview?.risk_hypothesis))
            !== JSON.stringify(normalizeList(postSelection?.contract_risk_interview?.risk_hypothesis));

        const confidenceSignalChanged = Math.abs(scoreDelta) > 0 || bandChanged;
        const structuralDecisionChange = verdictChanged || ctaChanged || riskPrimaryGapChanged || riskHypothesisChanged;
        const anyDecisionImpact = confidenceSignalChanged || structuralDecisionChange;

        const postQuestions = Array.isArray(postResponse.calibrationQuestions) ? postResponse.calibrationQuestions : [];
        const answerMap = new Map(answers.map((item) => [item.questionId, item.answer]));
        const matchedPostQuestions = postQuestions.filter((q: any) => answerMap.has(String(q?.id ?? "")));
        const matchedNonNullAnswers = matchedPostQuestions.filter((q: any) => q?.answer === "yes" || q?.answer === "no");
        const answerParityMismatches = matchedPostQuestions
            .filter((q: any) => (q?.answer === "yes" || q?.answer === "no") && answerMap.get(String(q.id)) !== q.answer)
            .map((q: any) => ({
                questionId: String(q.id),
                sent: answerMap.get(String(q.id)) ?? null,
                post: q.answer ?? null,
            }));

        const postCalibration = (postResponse.calibrationState ?? {}) as Record<string, any>;
        const answeredCount = Number(postCalibration.answeredCount ?? 0);
        const recalibrated = Boolean(postCalibration.recalibrated ?? false);
        const ingestionConsistent =
            answers.length > 0
            && answeredCount >= answers.length
            && matchedNonNullAnswers.length === answers.length
            && answerParityMismatches.length === 0
            && recalibrated;

        rows.push({
            case_id: caseId,
            sent_answers_count: answers.length,
            replay_answered_count: answeredCount,
            replay_recalibrated: recalibrated,
            replay_question_answers: matchedPostQuestions.map((q: any) => ({ id: String(q.id), answer: q.answer ?? null })),
            answer_parity_mismatches: answerParityMismatches,
            ingestion_consistent: ingestionConsistent,
            decision_update_prereq_consistent: answers.length > 0 && answeredCount > 0 && matchedNonNullAnswers.length === answers.length,
            pre_post_delta: {
                base_score: baseScore,
                post_score: postScore,
                score_delta: scoreDelta,
                base_band: baseBand || null,
                post_band: postBand || null,
                band_changed: bandChanged,
                verdict_changed: verdictChanged,
                cta_changed: ctaChanged,
                risk_primary_gap_changed: riskPrimaryGapChanged,
                risk_hypothesis_changed: riskHypothesisChanged,
                confidence_signal_changed: confidenceSignalChanged,
                structural_decision_change: structuralDecisionChange,
                any_decision_impact: anyDecisionImpact,
            },
        });
    }

    const total = rows.length;
    const ingestionConsistentCount = rows.filter((row) => Boolean(row.ingestion_consistent)).length;
    const anyImpactCount = rows.filter((row) => Boolean((row.pre_post_delta as Record<string, unknown>)?.any_decision_impact)).length;
    const structuralImpactCount = rows.filter((row) => Boolean((row.pre_post_delta as Record<string, unknown>)?.structural_decision_change)).length;
    const confidenceImpactCount = rows.filter((row) => Boolean((row.pre_post_delta as Record<string, unknown>)?.confidence_signal_changed)).length;
    const scoreMovedCount = rows.filter((row) => Number((row.pre_post_delta as Record<string, unknown>)?.score_delta ?? 0) !== 0).length;

    const candidateStrengthened = ingestionConsistentCount === total && anyImpactCount > 0;

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "bounded_residual_impact_audit",
        current_mode: "AUDIT",
        line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-ANSWER-LINKAGE",
        first_drift_point: "stage_calibration_answer_ingestion_bypass_before_decision_update",
        first_writable_fault: {
            status: candidateStrengthened ? "candidate_strengthened_with_single_path_impact_evidence" : "candidate_not_yet_isolated",
            label: "quick_check_answer_replay_entrypoint_drops_calibration_answers",
            surface: [
                "lib/career-engine/job-copilot/backend/job-copilot-service.ts:6826-6830",
                "scripts/audit-job-copilot-qc-generic-probe.ts:132-142",
                "scripts/audit-job-copilot-quick-checks-owner-path.ts:267-277",
            ],
        },
        single_path_control: {
            baseline_path: "recalculateFitAfterCalibration_with_empty_answers",
            replay_path: "recalculateFitAfterCalibration_with_answer_payload",
            mixed_replay_paths_used: false,
            analyze_wrapper_used_for_replay: false,
        },
        residual_impact_summary: {
            ingestion_consistent_rate: `${ingestionConsistentCount}/${total}`,
            any_decision_impact_rate: `${anyImpactCount}/${total}`,
            confidence_signal_changed_rate: `${confidenceImpactCount}/${total}`,
            structural_decision_change_rate: `${structuralImpactCount}/${total}`,
            score_moved_rate: `${scoreMovedCount}/${total}`,
        },
        candidate_status: candidateStrengthened ? "strengthened" : "unchanged",
        repair_admission_allowed: false,
        minimal_remaining_blocker: candidateStrengthened
            ? "Need a bounded admission review to decide whether remaining residual belongs to downstream consequence-shaping/decision-update surface (structural impact remains limited)."
            : "Single-path impact evidence is insufficient to separate replay-entrypoint owner from deeper downstream consequence-shaping owners.",
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
        ingestion_consistent_rate: result.residual_impact_summary.ingestion_consistent_rate,
        any_decision_impact_rate: result.residual_impact_summary.any_decision_impact_rate,
        structural_decision_change_rate: result.residual_impact_summary.structural_decision_change_rate,
        candidate_status: result.candidate_status,
        repair_admission_allowed: result.repair_admission_allowed,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
