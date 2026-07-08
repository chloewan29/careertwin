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

const CASE_SET = ["job-01", "job-03", "job-14", "job-18"] as const;

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
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-residual-routing-audit.${new Date()
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

async function runCase(params: { profileId: string; job: Fixture["jobs"][number] }) {
  const input = {
    profileId: params.profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-routing.local/${params.job.id}`,
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
  const bandChanged = String(baseRec.band ?? "") !== String(postRec.band ?? "");
  const ctaChanged = String(baseSel?.recommendation?.cta_state ?? "") !== String(postSel?.recommendation?.cta_state ?? "");
  const riskGapChanged =
    normalize(baseSel?.contract_risk_interview?.primary_gap ?? "") !== normalize(postSel?.contract_risk_interview?.primary_gap ?? "");
  const riskHypothesisChanged =
    JSON.stringify(normalizeList(baseSel?.contract_risk_interview?.risk_hypothesis)) !==
    JSON.stringify(normalizeList(postSel?.contract_risk_interview?.risk_hypothesis));

  const confidenceChanged = Math.abs(scoreDelta) > 0 || bandChanged;
  const riskSurfaceChanged = riskGapChanged || riskHypothesisChanged;

  return {
    case_id: params.job.id,
    sent_answers_count: answers.length,
    answered_count: Number(postResponse?.calibrationState?.answeredCount ?? 0),
    replay_recalibrated: Boolean(postResponse?.calibrationState?.recalibrated ?? false),
    deltas: {
      score_delta: scoreDelta,
      band_changed: bandChanged,
      cta_changed: ctaChanged,
      risk_primary_gap_changed: riskGapChanged,
      risk_hypothesis_changed: riskHypothesisChanged,
      confidence_changed: confidenceChanged,
      risk_surface_changed: riskSurfaceChanged,
      decision_impact_multisurface: confidenceChanged && (ctaChanged || riskSurfaceChanged),
    },
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);

  const rows: Array<Record<string, any>> = [];
  for (const caseId of CASE_SET) {
    const job = fixture.jobs.find((item) => item.id === caseId);
    if (!job) throw new Error(`Missing fixture case ${caseId}`);
    rows.push(await runCase({ profileId: args.profileId, job }));
  }

  const total = rows.length;
  const confidenceChangedCount = rows.filter((r) => Boolean(r?.deltas?.confidence_changed)).length;
  const ctaChangedCount = rows.filter((r) => Boolean(r?.deltas?.cta_changed)).length;
  const riskSurfaceChangedCount = rows.filter((r) => Boolean(r?.deltas?.risk_surface_changed)).length;
  const multiSurfaceCount = rows.filter((r) => Boolean(r?.deltas?.decision_impact_multisurface)).length;

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_residual_routing_audit",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    first_drift_point:
      confidenceChangedCount > 0 && ctaChangedCount === 0 && riskSurfaceChangedCount === 0
        ? "stage_post_calibration_decision_impact_stops_at_confidence_only"
        : "stage_post_calibration_decision_impact_mixed_or_unstable",
    first_writable_fault: {
      status:
        confidenceChangedCount > 0 && ctaChangedCount === 0 && riskSurfaceChangedCount === 0
          ? "best_current_candidate"
          : "not_isolated",
      label:
        confidenceChangedCount > 0 && ctaChangedCount === 0 && riskSurfaceChangedCount === 0
          ? "answer_to_risk_consequence_materialization_not_wired_after_confidence_update"
          : "decision_impact_residual_not_yet_isolated",
      surface:
        confidenceChangedCount > 0 && ctaChangedCount === 0 && riskSurfaceChangedCount === 0
          ? [
              "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4554-4562",
              "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4818-4831",
            ]
          : ["lib/career-engine/job-copilot/backend/job-copilot-service.ts:4486-4860"],
    },
    residual_summary: {
      confidence_changed_rate: `${confidenceChangedCount}/${total}`,
      cta_changed_rate: `${ctaChangedCount}/${total}`,
      risk_surface_changed_rate: `${riskSurfaceChangedCount}/${total}`,
      multi_surface_decision_impact_rate: `${multiSurfaceCount}/${total}`,
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker:
      confidenceChangedCount > 0 && ctaChangedCount === 0 && riskSurfaceChangedCount === 0
        ? "Need one targeted audit to prove this residual owner is stable across owner+guard slice before admission."
        : "Residual routing signal remains mixed; stable first writable owner not yet isolated.",
    recommended_next_step:
      confidenceChangedCount > 0 && ctaChangedCount === 0 && riskSurfaceChangedCount === 0
        ? "Run one bounded owner+guard micro-isolation audit on post-confidence risk/consequence materialization surface only."
        : "Run one bounded decomposition audit to separate confidence-only vs multi-surface residual families.",
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
        confidence_changed_rate: result.residual_summary.confidence_changed_rate,
        cta_changed_rate: result.residual_summary.cta_changed_rate,
        risk_surface_changed_rate: result.residual_summary.risk_surface_changed_rate,
        multi_surface_decision_impact_rate: result.residual_summary.multi_surface_decision_impact_rate,
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
