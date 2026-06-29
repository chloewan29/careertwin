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

const CASE_SET = ["job-03", "job-14"] as const;

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
        outPath: readArg("--out") ?? `artifacts/job-copilot-ns-quick-checks-generic-answer-linkage-downstream-trace-audit.${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
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

async function runCase(params: {
    profileId: string;
    job: Fixture["jobs"][number];
}): Promise<Record<string, unknown>> {
    const input = {
        profileId: params.profileId,
        source: "linkedin" as const,
        jobUrl: `https://qc-generic-answer-linkage-trace.local/${params.job.id}`,
        jobTitle: params.job.title,
        company: params.job.company ?? null,
        location: null,
        jobDescription: params.job.job_description,
        topEvidenceLimit: 4,
    };

    const base = await recalculateFitAfterCalibration({
        ...input,
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
        ...input,
        calibrationAnswers: answers,
    });
    const postResponse = (post.response ?? {}) as Record<string, any>;

    const baseSel = (baseResponse?.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
    const postSel = (postResponse?.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
    const baseRec = (baseResponse?.applyRecommendation ?? {}) as Record<string, any>;
    const postRec = (postResponse?.applyRecommendation ?? {}) as Record<string, any>;
    const baseCal = (baseResponse?.calibrationState ?? {}) as Record<string, any>;
    const postCal = (postResponse?.calibrationState ?? {}) as Record<string, any>;

    const baseScore = Number(baseRec.score ?? 0);
    const postScore = Number(postRec.score ?? 0);
    const baseBand = String(baseRec.band ?? "");
    const postBand = String(postRec.band ?? "");
    const scoreDelta = postScore - baseScore;
    const bandChanged = baseBand !== postBand;
    const ctaBefore = String(baseSel?.recommendation?.cta_state ?? "");
    const ctaAfter = String(postSel?.recommendation?.cta_state ?? "");
    const ctaChanged = ctaBefore !== ctaAfter;
    const riskBefore = normalize(baseSel?.contract_risk_interview?.primary_gap ?? "");
    const riskAfter = normalize(postSel?.contract_risk_interview?.primary_gap ?? "");
    const riskChanged = riskBefore !== riskAfter;
    const riskCtaHintBefore = String(baseSel?.contract_risk_interview?.recommendation_cta_state ?? "");
    const riskCtaHintAfter = String(postSel?.contract_risk_interview?.recommendation_cta_state ?? "");
    const riskHintChanged = riskCtaHintBefore !== riskCtaHintAfter;

    const answeredCount = Number(postCal.answeredCount ?? 0);
    const recalibrated = Boolean(postCal.recalibrated ?? false);
    const ingestionConsistent = answers.length > 0 && answeredCount >= answers.length && recalibrated;

    return {
        case_id: params.job.id,
        sent_answers_count: answers.length,
        ingestion_consistent: ingestionConsistent,
        post_answered_count: answeredCount,
        post_score_delta_from_calibration_state: Number(postCal.scoreDelta ?? 0),
        pre_post: {
            score_before: baseScore,
            score_after: postScore,
            score_delta: scoreDelta,
            band_before: baseBand || null,
            band_after: postBand || null,
            band_changed: bandChanged,
            cta_before: ctaBefore || null,
            cta_after: ctaAfter || null,
            cta_changed: ctaChanged,
            risk_primary_gap_changed: riskChanged,
            risk_interview_cta_hint_changed: riskHintChanged,
        },
        drift_signals: {
            decision_band_threshold_cross: bandChanged && Math.abs(scoreDelta) > 0,
            cta_inherited_from_band_shift: ctaChanged && bandChanged && !riskHintChanged,
            risk_surface_static: !riskChanged,
        },
    };
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);

    const rows: Array<Record<string, unknown>> = [];
    for (const caseId of CASE_SET) {
        const job = fixture.jobs.find((item) => item.id === caseId);
        if (!job) throw new Error(`Missing fixture case ${caseId}`);
        rows.push(await runCase({ profileId: args.profileId, job }));
    }

    const ownerCase = rows.find((row) => String(row.case_id) === "job-03") as Record<string, any> | undefined;
    const ownerDrift = ownerCase?.drift_signals ?? {};
    const firstDrift = ownerDrift?.decision_band_threshold_cross
        ? "stage_decision_band_threshold_shaping_after_recalibration"
        : "stage_downstream_decision_update_surface_unstable";

    const firstWritableCandidate = ownerDrift?.decision_band_threshold_cross
        ? {
            label: "decision_band_threshold_coupling_before_cta_fallback",
            surface: [
                "lib/career-engine/job-copilot/fit-calibration-engine.ts:898-905",
                "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4762-4774",
            ],
        }
        : {
            label: "downstream_decision_update_surface_unstable",
            surface: [
                "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4486-4847",
            ],
        };

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "bounded_downstream_trace",
        current_mode: "AUDIT",
        line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-ANSWER-LINKAGE",
        single_path_control: {
            baseline_path: "recalculateFitAfterCalibration_with_empty_answers",
            replay_path: "recalculateFitAfterCalibration_with_answer_payload",
            mixed_replay_paths_used: false,
            analyze_wrapper_used_for_replay: false,
        },
        first_drift_point: firstDrift,
        first_writable_fault: {
            status: ownerDrift?.decision_band_threshold_cross ? "candidate_narrowed" : "not_isolated",
            ...firstWritableCandidate,
        },
        repair_admission_allowed: false,
        minimal_remaining_blocker: ownerDrift?.decision_band_threshold_cross
            ? "Need bounded admission review to confirm this threshold-coupling surface is the stable first writable residual owner across the active residual slice."
            : "Owner-case downstream drift remains unstable; first writable surface not yet narrow enough.",
        governance: {
            memory_sync_required: false,
            memory_sync_targets: [],
        },
        case_traces: rows,
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        outPath,
        first_drift_point: result.first_drift_point,
        first_writable_candidate: result.first_writable_fault.label,
        repair_admission_allowed: result.repair_admission_allowed,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
