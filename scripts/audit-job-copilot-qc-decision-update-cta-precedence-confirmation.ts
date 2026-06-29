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

const CASE_SET = [
  { id: "job-03", role: "owner" as const },
  { id: "job-14", role: "guard" as const },
];

type Args = {
  profileId: string;
  fixturePath: string;
  outPath: string;
};

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
    outPath:
      readArg("--out") ??
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-cta-precedence-confirmation.${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`,
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readFixture(fixturePath: string): Fixture {
  const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

function mapRiskOverride(state: string | null): "ready_apply" | "confirm_first" | "deprioritize" | null {
  if (!state) return null;
  if (state === "apply") return "ready_apply";
  if (state === "calibrate" || state === "hold") return "confirm_first";
  if (state === "deprioritize") return "deprioritize";
  return null;
}

async function runCase(profileId: string, job: Fixture["jobs"][number], role: "owner" | "guard") {
  const input = {
    profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-precedence.local/${job.id}`,
    jobTitle: job.title,
    company: job.company ?? null,
    location: null,
    jobDescription: job.job_description,
    topEvidenceLimit: 4,
  };

  const baseline = await recalculateFitAfterCalibration({ ...input, calibrationAnswers: [] });
  const baseResp = (baseline.response ?? {}) as Record<string, any>;
  const baseQuestions = Array.isArray(baseResp.calibrationQuestions)
    ? baseResp.calibrationQuestions.filter((q: any) => q && typeof q.id === "string").slice(0, 2)
    : [];
  const answers = baseQuestions.map((question: any, index: number) => ({
    questionId: String(question.id),
    answer: (index % 2 === 0 ? "yes" : "no") as "yes" | "no",
  }));

  const replay = await recalculateFitAfterCalibration({ ...input, calibrationAnswers: answers });
  const replayResp = (replay.response ?? {}) as Record<string, any>;

  const sel = (replayResp?.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
  const recommendation = (sel?.recommendation ?? {}) as Record<string, any>;
  const riskInterview = (sel?.contract_risk_interview ?? {}) as Record<string, any>;

  const band = String(recommendation.band ?? replayResp?.applyRecommendation?.band ?? "");
  const finalCta = String(recommendation.cta_state ?? "");
  const riskOverrideState = String(riskInterview.recommendation_cta_state ?? "") || null;
  const expectedFromRiskOverride = mapRiskOverride(riskOverrideState);

  const weakBand = band === "weak";
  const weakFallbackExpected = weakBand ? "deprioritize" : null;
  const weakBandShortCircuit = weakBand && finalCta !== "deprioritize";

  const overrideMatch = expectedFromRiskOverride !== null && finalCta === expectedFromRiskOverride;
  const contradiction = expectedFromRiskOverride !== null && finalCta !== expectedFromRiskOverride;

  return {
    case_id: job.id,
    case_role: role,
    sent_answers_count: answers.length,
    post_answered_count: Number(replayResp?.calibrationState?.answeredCount ?? 0),
    replay_recalibrated: Boolean(replayResp?.calibrationState?.recalibrated ?? false),
    single_path_replay: true,
    decision_contract: {
      band,
      final_cta_state: finalCta || null,
      risk_interview_cta_state: riskOverrideState,
      expected_from_risk_override: expectedFromRiskOverride,
      weak_band_fallback_expected: weakFallbackExpected,
      weak_band_short_circuit: weakBandShortCircuit,
      override_match: overrideMatch,
      contradiction,
    },
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);

  const rows: Array<Record<string, any>> = [];
  for (const c of CASE_SET) {
    const job = fixture.jobs.find((j) => j.id === c.id);
    if (!job) throw new Error(`Missing fixture case ${c.id}`);
    rows.push(await runCase(args.profileId, job, c.role));
  }

  const contradictions = rows.filter((r) => Boolean(r?.decision_contract?.contradiction));
  const weakShortCircuitCount = rows.filter((r) => Boolean(r?.decision_contract?.weak_band_short_circuit)).length;
  const overrideMatchCount = rows.filter((r) => Boolean(r?.decision_contract?.override_match)).length;

  const stablePrecedence = contradictions.length === 0 && weakShortCircuitCount >= 1 && overrideMatchCount >= 1;

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_confirmation_trace",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    single_path_control: {
      baseline_path: "recalculateFitAfterCalibration_with_empty_answers",
      replay_path: "recalculateFitAfterCalibration_with_answer_payload",
      mixed_replay_paths_used: false,
      analyze_wrapper_used_for_replay: false,
    },
    first_drift_point: "stage_decision_output_contract_cta_override_precedence",
    first_writable_fault: {
      status: stablePrecedence ? "stable_candidate_confirmed" : "candidate_not_yet_stable",
      label: "risk_interview_cta_override_short_circuits_band_cta_coupling",
      surface: ["lib/career-engine/job-copilot/backend/job-copilot-service.ts:4765-4774"],
    },
    confirmation_summary: {
      stable_precedence_reproduced: stablePrecedence,
      override_match_rate: `${overrideMatchCount}/${rows.length}`,
      weak_band_short_circuit_rate: `${weakShortCircuitCount}/${rows.length}`,
      contradiction_rate: `${contradictions.length}/${rows.length}`,
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker: stablePrecedence
      ? "Precedence owner is now stable at micro-surface level, but this step is confirmation-trace only; run one bounded admission review to formalize repair scope and guardrails."
      : "Need one additional bounded trace because precedence stability is not yet consistent across owner+guard cases.",
    recommended_next_step: stablePrecedence
      ? "Run one bounded admission review for DECISION-UPDATE line to formalize in-scope repair boundary around cta override precedence surface only."
      : "Run one more bounded confirmation trace under the same single-path controls.",
    governance: {
      memory_sync_required: false,
      memory_sync_targets: [],
    },
    case_diagnostics: rows,
  };

  const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        outPath,
        stable_precedence_reproduced: result.confirmation_summary.stable_precedence_reproduced,
        override_match_rate: result.confirmation_summary.override_match_rate,
        weak_band_short_circuit_rate: result.confirmation_summary.weak_band_short_circuit_rate,
        contradiction_rate: result.confirmation_summary.contradiction_rate,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
