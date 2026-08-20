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

type CaseSpec = { id: string; role: "owner" | "guard" };
const CASES: CaseSpec[] = [
  { id: "job-14", role: "owner" },
  { id: "job-18", role: "owner" },
  { id: "job-03", role: "guard" },
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
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-micro-isolation-confirmation.${new Date()
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

function stableEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function runCase(profileId: string, job: Fixture["jobs"][number], role: "owner" | "guard") {
  const input = {
    profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-micro-isolation.local/${job.id}`,
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

  const confidenceChanged = Number(postRec.score ?? 0) !== Number(baseRec.score ?? 0)
    || String(postRec.band ?? "") !== String(baseRec.band ?? "");

  const surface4554Base = {
    contract_primary_gap: normalize(baseSel?.contract_risk_interview?.primary_gap ?? ""),
    contract_risk_hypothesis: normalizeList(baseSel?.contract_risk_interview?.risk_hypothesis),
    contract_quick_check_focus: normalizeList(baseSel?.contract_risk_interview?.quick_check_focus),
    contract_interview_focus: normalizeList(baseSel?.contract_risk_interview?.interview_focus),
    contract_likely_challenge_areas: normalizeList(baseSel?.contract_risk_interview?.likely_challenge_areas),
    contract_uncertainty_flags: normalizeList(baseSel?.contract_risk_interview?.uncertainty_flags),
  };

  const surface4554Post = {
    contract_primary_gap: normalize(postSel?.contract_risk_interview?.primary_gap ?? ""),
    contract_risk_hypothesis: normalizeList(postSel?.contract_risk_interview?.risk_hypothesis),
    contract_quick_check_focus: normalizeList(postSel?.contract_risk_interview?.quick_check_focus),
    contract_interview_focus: normalizeList(postSel?.contract_risk_interview?.interview_focus),
    contract_likely_challenge_areas: normalizeList(postSel?.contract_risk_interview?.likely_challenge_areas),
    contract_uncertainty_flags: normalizeList(postSel?.contract_risk_interview?.uncertainty_flags),
  };

  const surface4818Base = {
    primary_gap_type: normalize(baseSel?.primary_gap?.gap_type ?? ""),
    primary_gap_label: normalize(baseSel?.primary_gap?.gap_label ?? ""),
    primary_gap_question_text: normalize(baseSel?.primary_gap?.question_text ?? ""),
    quick_check_gap_type: normalize(baseSel?.quick_check?.quick_check_gap_type ?? ""),
    quick_check_focus_line: normalize(baseSel?.quick_check?.focus_line ?? ""),
    quick_check_top_gap: normalize(baseSel?.quick_check?.top_quick_check_gap ?? ""),
  };

  const surface4818Post = {
    primary_gap_type: normalize(postSel?.primary_gap?.gap_type ?? ""),
    primary_gap_label: normalize(postSel?.primary_gap?.gap_label ?? ""),
    primary_gap_question_text: normalize(postSel?.primary_gap?.question_text ?? ""),
    quick_check_gap_type: normalize(postSel?.quick_check?.quick_check_gap_type ?? ""),
    quick_check_focus_line: normalize(postSel?.quick_check?.focus_line ?? ""),
    quick_check_top_gap: normalize(postSel?.quick_check?.top_quick_check_gap ?? ""),
  };

  const surface4554Stable = stableEqual(surface4554Base, surface4554Post);
  const surface4818Stable = stableEqual(surface4818Base, surface4818Post);

  return {
    case_id: job.id,
    case_role: role,
    sent_answers_count: answers.length,
    answered_count: Number(postResponse?.calibrationState?.answeredCount ?? 0),
    replay_recalibrated: Boolean(postResponse?.calibrationState?.recalibrated ?? false),
    confidence_changed: confidenceChanged,
    surface_4554_4562_stable: surface4554Stable,
    surface_4818_4831_stable: surface4818Stable,
    surface_4554_4562_diff: surface4554Stable ? null : { before: surface4554Base, after: surface4554Post },
    surface_4818_4831_diff: surface4818Stable ? null : { before: surface4818Base, after: surface4818Post },
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);

  const rows: Array<Record<string, any>> = [];
  for (const c of CASES) {
    const job = fixture.jobs.find((j) => j.id === c.id);
    if (!job) throw new Error(`Missing fixture case ${c.id}`);
    rows.push(await runCase(args.profileId, job, c.role));
  }

  const owners = rows.filter((r) => r.case_role === "owner");
  const guards = rows.filter((r) => r.case_role === "guard");

  const ownerConfidenceRate = `${owners.filter((r) => r.confidence_changed).length}/${owners.length}`;
  const owner4554StableRate = `${owners.filter((r) => r.surface_4554_4562_stable).length}/${owners.length}`;
  const owner4818StableRate = `${owners.filter((r) => r.surface_4818_4831_stable).length}/${owners.length}`;
  const guard4554StableRate = `${guards.filter((r) => r.surface_4554_4562_stable).length}/${guards.length}`;
  const guard4818StableRate = `${guards.filter((r) => r.surface_4818_4831_stable).length}/${guards.length}`;

  const stableOwnerEvidenceClosed =
    owners.length > 0
    && owners.every((r) => r.confidence_changed && r.surface_4554_4562_stable && r.surface_4818_4831_stable)
    && guards.every((r) => r.surface_4554_4562_stable && r.surface_4818_4831_stable);

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_owner_guard_micro_isolation_confirmation",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    first_drift_point: "stage_post_calibration_decision_impact_stops_at_confidence_only",
    first_writable_fault: {
      status: stableOwnerEvidenceClosed ? "stable_candidate_confirmed" : "candidate_not_yet_stable",
      label: "answer_to_risk_consequence_materialization_not_wired_after_confidence_update",
      surface: [
        "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4554-4562",
        "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4818-4831",
      ],
    },
    confirmation_summary: {
      owner_confidence_changed_rate: ownerConfidenceRate,
      owner_surface_4554_4562_stable_rate: owner4554StableRate,
      owner_surface_4818_4831_stable_rate: owner4818StableRate,
      guard_surface_4554_4562_stable_rate: guard4554StableRate,
      guard_surface_4818_4831_stable_rate: guard4818StableRate,
      stable_owner_evidence_closed: stableOwnerEvidenceClosed,
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker: stableOwnerEvidenceClosed
      ? "Evidence closure for micro-owner is complete; next step is bounded admission review to formalize repair scope/guardrails."
      : "Owner/guard stability not yet fully consistent on the two admitted micro-surfaces.",
    recommended_next_step: stableOwnerEvidenceClosed
      ? "Run one bounded admission review on this confirmed micro-owner surface only."
      : "Run one more bounded confirmation pass on the same owner+guard set and surfaces.",
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
        owner_confidence_changed_rate: result.confirmation_summary.owner_confidence_changed_rate,
        owner_surface_4554_4562_stable_rate: result.confirmation_summary.owner_surface_4554_4562_stable_rate,
        owner_surface_4818_4831_stable_rate: result.confirmation_summary.owner_surface_4818_4831_stable_rate,
        stable_owner_evidence_closed: result.confirmation_summary.stable_owner_evidence_closed,
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
