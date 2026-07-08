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
  ownerCaseA: string;
  ownerCaseB: string;
  guardCase: string;
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
    ownerCaseA: readArg("--ownerA") ?? "job-01",
    ownerCaseB: readArg("--ownerB") ?? "job-03",
    guardCase: readArg("--guard") ?? "job-18",
    outPath:
      readArg("--out") ??
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-cta-shift-micro-isolation-audit.${new Date()
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

function mapInterviewCta(
  value: unknown,
): "ready_apply" | "confirm_first" | "deprioritize" | null {
  const normalized = normalize(value);
  if (normalized === "apply") return "ready_apply";
  if (normalized === "calibrate") return "confirm_first";
  if (normalized === "hold") return "confirm_first";
  if (normalized === "deprioritize") return "deprioritize";
  return null;
}

function deriveFallbackCta(params: {
  band: string;
  required: boolean;
  unansweredCount: number;
}): "ready_apply" | "confirm_first" | "deprioritize" {
  if (params.band === "weak") return "deprioritize";
  if (params.required && params.unansweredCount > 0) return "confirm_first";
  return "ready_apply";
}

function deriveFinalCta(
  fallback: "ready_apply" | "confirm_first" | "deprioritize",
  interview: "ready_apply" | "confirm_first" | "deprioritize" | null,
): "ready_apply" | "confirm_first" | "deprioritize" {
  const severity: Record<"ready_apply" | "confirm_first" | "deprioritize", number> = {
    ready_apply: 0,
    confirm_first: 1,
    deprioritize: 2,
  };
  if (interview && severity[interview] > severity[fallback]) return interview;
  return fallback;
}

async function runCase(params: {
  profileId: string;
  job: Fixture["jobs"][number];
  role: "owner" | "guard";
}) {
  const input = {
    profileId: params.profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-cta-shift.local/${params.job.id}`,
    jobTitle: params.job.title,
    company: params.job.company ?? null,
    location: null,
    jobDescription: params.job.job_description,
    topEvidenceLimit: 4,
  };

  const base = await recalculateFitAfterCalibration({ ...input, calibrationAnswers: [] });
  const baseResponse = (base.response ?? {}) as Record<string, any>;
  const baseQuestions = Array.isArray(baseResponse.calibrationQuestions)
    ? baseResponse.calibrationQuestions.filter((item: any) => item && typeof item.id === "string").slice(0, 2)
    : [];
  const answers = baseQuestions.map((question: any, index: number) => ({
    questionId: String(question.id),
    answer: (index % 2 === 0 ? "yes" : "no") as "yes" | "no",
  }));

  const post = await recalculateFitAfterCalibration({ ...input, calibrationAnswers: answers });
  const postResponse = (post.response ?? {}) as Record<string, any>;

  const baseSel = (baseResponse?.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
  const postSel = (postResponse?.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
  const baseRec = (baseResponse?.applyRecommendation ?? {}) as Record<string, any>;
  const postRec = (postResponse?.applyRecommendation ?? {}) as Record<string, any>;

  const baseScore = Number(baseRec.score ?? 0);
  const postScore = Number(postRec.score ?? 0);
  const baseBand = normalize(baseRec.band ?? "");
  const postBand = normalize(postRec.band ?? "");
  const confidenceChanged = baseScore !== postScore || baseBand !== postBand;

  const ctaBefore = normalize(baseSel?.recommendation?.cta_state ?? "");
  const ctaAfter = normalize(postSel?.recommendation?.cta_state ?? "");
  const ctaChanged = ctaBefore !== ctaAfter;

  const riskPrimaryGapChanged =
    normalize(baseSel?.contract_risk_interview?.primary_gap ?? "") !==
    normalize(postSel?.contract_risk_interview?.primary_gap ?? "");
  const riskHypothesisChanged =
    JSON.stringify(normalizeList(baseSel?.contract_risk_interview?.risk_hypothesis)) !==
    JSON.stringify(normalizeList(postSel?.contract_risk_interview?.risk_hypothesis));
  const riskSurfaceChanged = riskPrimaryGapChanged || riskHypothesisChanged;

  const baseUnansweredCount = Array.isArray(baseResponse.calibrationQuestions)
    ? baseResponse.calibrationQuestions.filter((item: any) => item?.answer !== "yes" && item?.answer !== "no").length
    : 0;
  const postUnansweredCount = Array.isArray(postResponse.calibrationQuestions)
    ? postResponse.calibrationQuestions.filter((item: any) => item?.answer !== "yes" && item?.answer !== "no").length
    : 0;
  const baseRequired = Boolean(baseResponse?.calibrationState?.required);
  const postRequired = Boolean(postResponse?.calibrationState?.required);

  const interviewCtaBefore = mapInterviewCta(baseSel?.contract_risk_interview?.recommendation_cta_state);
  const interviewCtaAfter = mapInterviewCta(postSel?.contract_risk_interview?.recommendation_cta_state);

  const fallbackCtaBefore = deriveFallbackCta({
    band: baseBand,
    required: baseRequired,
    unansweredCount: baseUnansweredCount,
  });
  const fallbackCtaAfter = deriveFallbackCta({
    band: postBand,
    required: postRequired,
    unansweredCount: postUnansweredCount,
  });
  const derivedFinalCtaBefore = deriveFinalCta(fallbackCtaBefore, interviewCtaBefore);
  const derivedFinalCtaAfter = deriveFinalCta(fallbackCtaAfter, interviewCtaAfter);

  const ctaShiftFamilySignal = ctaChanged && !confidenceChanged && !riskSurfaceChanged;
  const fallbackGateDrivenSignal = ctaShiftFamilySignal
    && !interviewCtaBefore
    && !interviewCtaAfter
    && fallbackCtaBefore !== fallbackCtaAfter
    && derivedFinalCtaBefore === fallbackCtaBefore
    && derivedFinalCtaAfter === fallbackCtaAfter;

  return {
    case_id: params.job.id,
    role: params.role,
    sent_answers_count: answers.length,
    answered_count: Number(postResponse?.calibrationState?.answeredCount ?? 0),
    replay_recalibrated: Boolean(postResponse?.calibrationState?.recalibrated ?? false),
    deltas: {
      score_delta: postScore - baseScore,
      band_before: baseBand || null,
      band_after: postBand || null,
      confidence_changed: confidenceChanged,
      cta_before: ctaBefore || null,
      cta_after: ctaAfter || null,
      cta_changed: ctaChanged,
      risk_primary_gap_changed: riskPrimaryGapChanged,
      risk_hypothesis_changed: riskHypothesisChanged,
      risk_surface_changed: riskSurfaceChanged,
    },
    cta_path_probe: {
      unanswered_before: baseUnansweredCount,
      unanswered_after: postUnansweredCount,
      required_before: baseRequired,
      required_after: postRequired,
      interview_cta_before: interviewCtaBefore,
      interview_cta_after: interviewCtaAfter,
      fallback_cta_before: fallbackCtaBefore,
      fallback_cta_after: fallbackCtaAfter,
      derived_final_cta_before: derivedFinalCtaBefore,
      derived_final_cta_after: derivedFinalCtaAfter,
      cta_shift_family_signal: ctaShiftFamilySignal,
      fallback_gate_driven_signal: fallbackGateDrivenSignal,
    },
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);

  const specs: Array<{ id: string; role: "owner" | "guard" }> = [
    { id: args.ownerCaseA, role: "owner" },
    { id: args.ownerCaseB, role: "owner" },
    { id: args.guardCase, role: "guard" },
  ];

  const rows: Array<Record<string, any>> = [];
  for (const spec of specs) {
    const job = fixture.jobs.find((item) => item.id === spec.id);
    if (!job) throw new Error(`Missing fixture case ${spec.id}`);
    rows.push(await runCase({ profileId: args.profileId, job, role: spec.role }));
  }

  const owners = rows.filter((row) => row.role === "owner");
  const guards = rows.filter((row) => row.role === "guard");

  const ownerCtaShiftRate = `${owners.filter((row) => Boolean(row?.cta_path_probe?.cta_shift_family_signal)).length}/${owners.length}`;
  const ownerFallbackDrivenRate = `${owners.filter((row) => Boolean(row?.cta_path_probe?.fallback_gate_driven_signal)).length}/${owners.length}`;
  const guardCtaShiftRate = `${guards.filter((row) => Boolean(row?.cta_path_probe?.cta_shift_family_signal)).length}/${guards.length}`;
  const guardFallbackDrivenRate = `${guards.filter((row) => Boolean(row?.cta_path_probe?.fallback_gate_driven_signal)).length}/${guards.length}`;

  const narrowed =
    owners.length > 0
    && owners.every((row) => Boolean(row?.cta_path_probe?.fallback_gate_driven_signal))
    && guards.every((row) => !Boolean(row?.cta_path_probe?.fallback_gate_driven_signal));

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_owner_guard_micro_isolation_audit",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    first_drift_point: narrowed
      ? "stage_post_calibration_cta_shift_fallback_gate_without_confidence_or_risk_update"
      : "stage_post_calibration_decision_impact_mixed_or_unstable",
    first_writable_fault: {
      status: narrowed ? "best_candidate_narrowed" : "not_isolated",
      label: narrowed
        ? "cta_fallback_unanswered_gate_drives_shift_without_confidence_or_risk_update"
        : "decision_impact_residual_not_yet_isolated",
      surface: narrowed
        ? [
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4711-4715",
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4800-4802",
          ]
        : ["lib/career-engine/job-copilot/backend/job-copilot-service.ts:4486-4860"],
    },
    micro_isolation_summary: {
      owners: [args.ownerCaseA, args.ownerCaseB],
      guard: args.guardCase,
      owner_cta_shift_rate: ownerCtaShiftRate,
      owner_fallback_gate_driven_rate: ownerFallbackDrivenRate,
      guard_cta_shift_rate: guardCtaShiftRate,
      guard_fallback_gate_driven_rate: guardFallbackDrivenRate,
      owner_isolation_quality_improved: narrowed,
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker: narrowed
      ? "Candidate is narrowed on CTA-shift family but still needs one bounded admission review to formalize allowed files/change type/guardrails."
      : "CTA-shift owner/guard pattern is not yet stable enough to isolate a single writable micro-surface.",
    recommended_next_step: narrowed
      ? "Run one bounded admission review on CTA fallback gate candidate only."
      : "Run one more bounded CTA-shift micro-isolation pass with same owner+guard design.",
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
        owner_cta_shift_rate: result.micro_isolation_summary.owner_cta_shift_rate,
        owner_fallback_gate_driven_rate: result.micro_isolation_summary.owner_fallback_gate_driven_rate,
        guard_cta_shift_rate: result.micro_isolation_summary.guard_cta_shift_rate,
        guard_fallback_gate_driven_rate: result.micro_isolation_summary.guard_fallback_gate_driven_rate,
        first_drift_point: result.first_drift_point,
        first_writable_candidate: result.first_writable_fault.label,
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
