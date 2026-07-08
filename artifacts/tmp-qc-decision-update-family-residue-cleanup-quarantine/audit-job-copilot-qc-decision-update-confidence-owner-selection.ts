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
  anchorOwnerId: string;
  guardId: string;
  candidatePool: string[];
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const readArg = (name: string): string | null => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };
  const candidatePoolArg = readArg("--candidatePool");
  const parsedPool = (candidatePoolArg ?? "job-01,job-03,job-19")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    profileId: readArg("--profileId") ?? process.env.JC_PROFILE_ID ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
    fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
    outPath:
      readArg("--out") ??
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-confidence-owner-selection-audit.${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`,
    anchorOwnerId: readArg("--anchorOwner") ?? "job-14",
    guardId: readArg("--guard") ?? "job-18",
    candidatePool: parsedPool,
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

async function evaluateCase(params: {
  profileId: string;
  job: Fixture["jobs"][number];
}) {
  const input = {
    profileId: params.profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-confidence-owner-selection.local/${params.job.id}`,
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
  const bandChanged = normalize(baseRec.band ?? "") !== normalize(postRec.band ?? "");
  const confidenceChanged = scoreDelta !== 0 || bandChanged;
  const ctaChanged =
    normalize(baseSel?.recommendation?.cta_state ?? "") !== normalize(postSel?.recommendation?.cta_state ?? "");
  const riskPrimaryGapChanged =
    normalize(baseSel?.contract_risk_interview?.primary_gap ?? "") !==
    normalize(postSel?.contract_risk_interview?.primary_gap ?? "");
  const riskHypothesisChanged =
    JSON.stringify(normalizeList(baseSel?.contract_risk_interview?.risk_hypothesis)) !==
    JSON.stringify(normalizeList(postSel?.contract_risk_interview?.risk_hypothesis));
  const riskSurfaceChanged = riskPrimaryGapChanged || riskHypothesisChanged;
  const confidenceOnlySignal = confidenceChanged && !ctaChanged && !riskSurfaceChanged;

  return {
    case_id: params.job.id,
    score_delta: scoreDelta,
    confidence_changed: confidenceChanged,
    cta_changed: ctaChanged,
    risk_surface_changed: riskSurfaceChanged,
    confidence_only_signal: confidenceOnlySignal,
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);

  const candidateIds = args.candidatePool.filter((id) => id !== args.anchorOwnerId && id !== args.guardId);
  const diagnostics: Array<Record<string, any>> = [];
  for (const id of candidateIds) {
    const job = fixture.jobs.find((item) => item.id === id);
    if (!job) continue;
    diagnostics.push(await evaluateCase({ profileId: args.profileId, job }));
  }

  const eligible = diagnostics.filter((row) => row.confidence_only_signal);
  eligible.sort((a, b) => {
    const delta = Math.abs(Number(b.score_delta ?? 0)) - Math.abs(Number(a.score_delta ?? 0));
    if (delta !== 0) return delta;
    return String(a.case_id).localeCompare(String(b.case_id));
  });
  const selected = eligible[0] ?? null;

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_confidence_only_owner_candidate_selection_audit",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    selection_context: {
      anchor_owner: args.anchorOwnerId,
      fixed_guard: args.guardId,
      candidate_pool: candidateIds,
      evaluated_count: diagnostics.length,
    },
    selected_second_owner_candidate: selected?.case_id ?? null,
    selected_candidate_confidence_only_signal: Boolean(selected?.confidence_only_signal),
    first_drift_point: "stage_post_calibration_decision_impact_stops_at_confidence_only",
    first_writable_fault: {
      status: selected ? "best_candidate_narrowed" : "not_isolated",
      label: selected
        ? "answer_to_risk_consequence_materialization_not_wired_after_confidence_update"
        : "decision_impact_residual_not_yet_isolated",
      surface: selected
        ? [
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4554-4562",
            "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4818-4831",
          ]
        : ["lib/career-engine/job-copilot/backend/job-copilot-service.ts:4486-4860"],
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker: selected
      ? "Second owner candidate selected; cross-owner closure still requires owner+guard replay confirmation."
      : "No second owner in bounded pool showed confidence-only signal.",
    recommended_next_step: selected
      ? `Run one bounded owner+guard micro-isolation replay with owner ${selected.case_id} and guard ${args.guardId}.`
      : "Run one additional bounded confidence-only owner selection pass with a minimally adjusted candidate pool.",
    governance: {
      memory_sync_required: false,
      memory_sync_targets: [],
    },
    candidate_diagnostics: diagnostics,
  };

  const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        outPath,
        selected_second_owner_candidate: result.selected_second_owner_candidate,
        selected_candidate_confidence_only_signal: result.selected_candidate_confidence_only_signal,
        evaluated_count: result.selection_context.evaluated_count,
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
