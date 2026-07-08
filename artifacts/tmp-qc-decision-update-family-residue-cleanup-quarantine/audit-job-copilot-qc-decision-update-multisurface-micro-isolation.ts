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

type CaseSpec = {
  id: string;
  role: "owner" | "guard";
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
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-multisurface-micro-isolation-audit.${new Date()
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

function listChanged(before: string[], after: string[]): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

async function runCase(profileId: string, job: Fixture["jobs"][number], role: "owner" | "guard") {
  const input = {
    profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-multisurface-micro.local/${job.id}`,
    jobTitle: job.title,
    company: job.company ?? null,
    location: null,
    jobDescription: job.job_description,
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
  const baseBand = normalize(baseRec.band ?? "");
  const postBand = normalize(postRec.band ?? "");
  const scoreDelta = Number(postRec.score ?? 0) - Number(baseRec.score ?? 0);
  const confidenceChanged = scoreDelta !== 0 || baseBand !== postBand;

  const ctaBefore = normalize(baseSel?.recommendation?.cta_state ?? "");
  const ctaAfter = normalize(postSel?.recommendation?.cta_state ?? "");
  const ctaChanged = ctaBefore !== ctaAfter;

  const riskBefore = {
    primary_gap: normalize(baseSel?.contract_risk_interview?.primary_gap ?? ""),
    risk_hypothesis: normalizeList(baseSel?.contract_risk_interview?.risk_hypothesis),
    quick_check_focus: normalizeList(baseSel?.contract_risk_interview?.quick_check_focus),
    likely_challenge_areas: normalizeList(baseSel?.contract_risk_interview?.likely_challenge_areas),
  };
  const riskAfter = {
    primary_gap: normalize(postSel?.contract_risk_interview?.primary_gap ?? ""),
    risk_hypothesis: normalizeList(postSel?.contract_risk_interview?.risk_hypothesis),
    quick_check_focus: normalizeList(postSel?.contract_risk_interview?.quick_check_focus),
    likely_challenge_areas: normalizeList(postSel?.contract_risk_interview?.likely_challenge_areas),
  };

  const riskPrimaryGapChanged = riskBefore.primary_gap !== riskAfter.primary_gap;
  const riskHypothesisChanged = listChanged(riskBefore.risk_hypothesis, riskAfter.risk_hypothesis);
  const riskQuickFocusChanged = listChanged(riskBefore.quick_check_focus, riskAfter.quick_check_focus);
  const riskChallengeAreasChanged = listChanged(riskBefore.likely_challenge_areas, riskAfter.likely_challenge_areas);
  const riskSurfaceChanged = riskPrimaryGapChanged || riskHypothesisChanged || riskQuickFocusChanged || riskChallengeAreasChanged;

  const postQuestions = Array.isArray(postResponse.calibrationQuestions)
    ? postResponse.calibrationQuestions
    : [];
  const answeredNoLead = postQuestions.find((item: any) => item?.answer === "no") ?? null;
  const answeredNoTarget = normalize(answeredNoLead?.target_area ?? answeredNoLead?.question ?? "");
  const answeredNoQuestion = normalize(answeredNoLead?.question ?? "");
  const answeredNoPresent = Boolean(answeredNoLead && (answeredNoTarget || answeredNoQuestion));
  const weakBandPostCalibration = postBand === "weak";

  const multiSurfaceSignal = confidenceChanged && riskSurfaceChanged && !ctaChanged;
  const answeredNoInjectionPattern =
    weakBandPostCalibration
    && answeredNoPresent
    && (riskHypothesisChanged || riskQuickFocusChanged || riskChallengeAreasChanged);

  return {
    case_id: job.id,
    role,
    sent_answers_count: answers.length,
    answered_count: Number(postResponse?.calibrationState?.answeredCount ?? 0),
    replay_recalibrated: Boolean(postResponse?.calibrationState?.recalibrated ?? false),
    deltas: {
      score_delta: scoreDelta,
      band_before: baseBand || null,
      band_after: postBand || null,
      confidence_changed: confidenceChanged,
      cta_changed: ctaChanged,
      risk_primary_gap_changed: riskPrimaryGapChanged,
      risk_hypothesis_changed: riskHypothesisChanged,
      risk_quick_focus_changed: riskQuickFocusChanged,
      risk_challenge_areas_changed: riskChallengeAreasChanged,
      risk_surface_changed: riskSurfaceChanged,
      multi_surface_signal: multiSurfaceSignal,
    },
    injection_probe: {
      weak_band_post_calibration: weakBandPostCalibration,
      answered_no_present: answeredNoPresent,
      answered_no_target: answeredNoTarget || null,
      answered_no_question: answeredNoQuestion || null,
      answered_no_injection_pattern: answeredNoInjectionPattern,
    },
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);
  const cases: CaseSpec[] = [
    { id: args.ownerCaseId, role: "owner" },
    { id: args.guardCaseId, role: "guard" },
  ];

  const rows: Array<Record<string, any>> = [];
  for (const spec of cases) {
    const job = fixture.jobs.find((item) => item.id === spec.id);
    if (!job) throw new Error(`Missing fixture case ${spec.id}`);
    rows.push(await runCase(args.profileId, job, spec.role));
  }

  const owner = rows.find((row) => row.role === "owner") ?? null;
  const guard = rows.find((row) => row.role === "guard") ?? null;

  const ownerPatternHit = Boolean(
    owner?.deltas?.multi_surface_signal
    && owner?.injection_probe?.answered_no_injection_pattern,
  );
  const guardPatternClear = Boolean(
    !guard?.deltas?.multi_surface_signal
    && !guard?.injection_probe?.answered_no_injection_pattern,
  );
  const narrowed = ownerPatternHit && guardPatternClear;

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_owner_guard_micro_isolation_audit",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    first_drift_point: "stage_post_calibration_decision_impact_mixed_or_unstable",
    first_writable_fault: {
      status: narrowed ? "best_candidate_narrowed" : "not_isolated",
      label: narrowed
        ? "weak_band_answered_no_contract_risk_injection_drives_multisurface_delta"
        : "decision_impact_residual_not_yet_isolated",
      surface: narrowed
        ? [
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4557-4562",
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4575-4589",
          ]
        : ["lib/career-engine/job-copilot/backend/job-copilot-service.ts:4486-4860"],
    },
    micro_isolation_summary: {
      requested_owner_case: args.ownerCaseId,
      requested_guard_case: args.guardCaseId,
      owner_case: owner?.case_id ?? null,
      guard_case: guard?.case_id ?? null,
      owner_multisurface_signal: Boolean(owner?.deltas?.multi_surface_signal),
      guard_multisurface_signal: Boolean(guard?.deltas?.multi_surface_signal),
      owner_injection_pattern: Boolean(owner?.injection_probe?.answered_no_injection_pattern),
      guard_injection_pattern: Boolean(guard?.injection_probe?.answered_no_injection_pattern),
      owner_band: owner?.deltas?.band_after ?? null,
      guard_band: guard?.deltas?.band_after ?? null,
      owner_isolation_quality_improved: narrowed,
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker: narrowed
      ? "Candidate is narrowed on one owner+guard pair but still lacks cross-owner stability closure on the multi-surface family."
      : "Owner/guard split does not yet produce a stable micro-owner pattern on the multi-surface slice.",
    recommended_next_step: narrowed
      ? "Run one bounded admission review for this narrowed multi-surface candidate with explicit allowed files/guardrails, or require one additional owner confirmation if policy demands >1 owner."
      : "Run one more bounded owner+guard micro-isolation pass on multi-surface slice before admission review.",
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
        owner_case: result.micro_isolation_summary.owner_case,
        guard_case: result.micro_isolation_summary.guard_case,
        owner_multisurface_signal: result.micro_isolation_summary.owner_multisurface_signal,
        guard_multisurface_signal: result.micro_isolation_summary.guard_multisurface_signal,
        narrowed_candidate: result.first_writable_fault.label,
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
