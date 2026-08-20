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
  ownerCaseId: string;
  guardCaseId: string;
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
    ownerCaseId: readArg("--ownerCase") ?? "job-14",
    guardCaseId: readArg("--guardCase") ?? "job-18",
    outPath:
      readArg("--out") ??
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-confidence-only-micro-isolation-audit.${new Date()
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

async function runCase(params: {
  profileId: string;
  job: Fixture["jobs"][number];
  role: "owner" | "guard";
}) {
  const input = {
    profileId: params.profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-confidence-only.local/${params.job.id}`,
    jobTitle: params.job.title,
    company: params.job.company ?? null,
    location: null,
    jobDescription: params.job.job_description,
    topEvidenceLimit: 4,
  };

  const base = await recalculateFitAfterCalibration({ ...input, calibrationAnswers: [] });
  const baseResponse = (base.response ?? {}) as Record<string, any>;
  const baseQuestions = Array.isArray(baseResponse.calibrationQuestions)
    ? baseResponse.calibrationQuestions.filter((q: any) => q && typeof q.id === "string").slice(0, 2)
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

  const scoreDelta = Number(postRec.score ?? 0) - Number(baseRec.score ?? 0);
  const bandBefore = normalize(baseRec.band ?? "");
  const bandAfter = normalize(postRec.band ?? "");
  const confidenceChanged = scoreDelta !== 0 || bandBefore !== bandAfter;

  const ctaChanged =
    normalize(baseSel?.recommendation?.cta_state ?? "") !== normalize(postSel?.recommendation?.cta_state ?? "");

  const riskPrimaryGapChanged =
    normalize(baseSel?.contract_risk_interview?.primary_gap ?? "") !==
    normalize(postSel?.contract_risk_interview?.primary_gap ?? "");
  const riskHypothesisChanged =
    JSON.stringify(normalizeList(baseSel?.contract_risk_interview?.risk_hypothesis)) !==
    JSON.stringify(normalizeList(postSel?.contract_risk_interview?.risk_hypothesis));
  const riskQuickFocusChanged =
    JSON.stringify(normalizeList(baseSel?.contract_risk_interview?.quick_check_focus)) !==
    JSON.stringify(normalizeList(postSel?.contract_risk_interview?.quick_check_focus));
  const riskSurfaceChanged = riskPrimaryGapChanged || riskHypothesisChanged || riskQuickFocusChanged;

  const confidenceOnlySignal = confidenceChanged && !ctaChanged && !riskSurfaceChanged;

  const surface4554Probe = {
    primary_gap_before: normalize(baseSel?.contract_risk_interview?.primary_gap ?? ""),
    primary_gap_after: normalize(postSel?.contract_risk_interview?.primary_gap ?? ""),
    risk_hypothesis_before: normalizeList(baseSel?.contract_risk_interview?.risk_hypothesis),
    risk_hypothesis_after: normalizeList(postSel?.contract_risk_interview?.risk_hypothesis),
    quick_check_focus_before: normalizeList(baseSel?.contract_risk_interview?.quick_check_focus),
    quick_check_focus_after: normalizeList(postSel?.contract_risk_interview?.quick_check_focus),
  };
  const surface4818Probe = {
    gap_type_before: normalize(baseSel?.primary_gap?.gap_type ?? ""),
    gap_type_after: normalize(postSel?.primary_gap?.gap_type ?? ""),
    gap_label_before: normalize(baseSel?.primary_gap?.gap_label ?? ""),
    gap_label_after: normalize(postSel?.primary_gap?.gap_label ?? ""),
    focus_line_before: normalize(baseSel?.quick_check?.focus_line ?? ""),
    focus_line_after: normalize(postSel?.quick_check?.focus_line ?? ""),
  };

  return {
    case_id: params.job.id,
    role: params.role,
    sent_answers_count: answers.length,
    answered_count: Number(postResponse?.calibrationState?.answeredCount ?? 0),
    replay_recalibrated: Boolean(postResponse?.calibrationState?.recalibrated ?? false),
    deltas: {
      score_delta: scoreDelta,
      band_before: bandBefore || null,
      band_after: bandAfter || null,
      confidence_changed: confidenceChanged,
      cta_changed: ctaChanged,
      risk_primary_gap_changed: riskPrimaryGapChanged,
      risk_hypothesis_changed: riskHypothesisChanged,
      risk_quick_focus_changed: riskQuickFocusChanged,
      risk_surface_changed: riskSurfaceChanged,
      confidence_only_signal: confidenceOnlySignal,
    },
    surface_probe: {
      surface_4554_4562: surface4554Probe,
      surface_4818_4831: surface4818Probe,
    },
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);

  const specs: Array<{ id: string; role: "owner" | "guard" }> = [
    { id: args.ownerCaseId, role: "owner" },
    { id: args.guardCaseId, role: "guard" },
  ];

  const rows: Array<Record<string, any>> = [];
  for (const spec of specs) {
    const job = fixture.jobs.find((item) => item.id === spec.id);
    if (!job) throw new Error(`Missing fixture case ${spec.id}`);
    rows.push(await runCase({ profileId: args.profileId, job, role: spec.role }));
  }

  const owner = rows.find((row) => row.role === "owner");
  const guard = rows.find((row) => row.role === "guard");
  const narrowed = Boolean(owner?.deltas?.confidence_only_signal) && !Boolean(guard?.deltas?.confidence_only_signal);

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_owner_guard_micro_isolation_audit",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    first_drift_point: narrowed
      ? "stage_post_calibration_decision_impact_stops_at_confidence_only"
      : "stage_post_calibration_decision_impact_mixed_or_unstable",
    first_writable_fault: {
      status: narrowed ? "best_candidate_narrowed" : "not_isolated",
      label: narrowed
        ? "answer_to_risk_consequence_materialization_not_wired_after_confidence_update"
        : "decision_impact_residual_not_yet_isolated",
      surface: narrowed
        ? [
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4554-4562",
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4818-4831",
          ]
        : ["lib/career-engine/job-copilot/backend/job-copilot-service.ts:4486-4860"],
    },
    micro_isolation_summary: {
      owner_case: args.ownerCaseId,
      guard_case: args.guardCaseId,
      owner_confidence_only_signal: Boolean(owner?.deltas?.confidence_only_signal),
      guard_confidence_only_signal: Boolean(guard?.deltas?.confidence_only_signal),
      owner_isolation_quality_improved: narrowed,
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker: narrowed
      ? "Confidence-only owner is narrowed on one owner+guard pair, but cross-owner closure for this family is still unproven."
      : "Confidence-only owner/guard split is not yet stable enough to isolate a single writable micro-surface.",
    recommended_next_step: narrowed
      ? "Run one bounded confidence-only owner-candidate selection pass to establish cross-owner closure before admission review."
      : "Run one additional bounded confidence-only micro-isolation pass with a second owner candidate.",
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
        owner_case: args.ownerCaseId,
        guard_case: args.guardCaseId,
        owner_confidence_only_signal: result.micro_isolation_summary.owner_confidence_only_signal,
        guard_confidence_only_signal: result.micro_isolation_summary.guard_confidence_only_signal,
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
