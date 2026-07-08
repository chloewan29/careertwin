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
  exclude: string[];
  include: string[] | null;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const readArg = (name: string): string | null => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };
  const excludeRaw = readArg("--exclude") ?? "job-03,job-14,job-18";
  const includeRaw = readArg("--include");
  return {
    profileId: readArg("--profileId") ?? process.env.JC_PROFILE_ID ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
    fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
    outPath:
      readArg("--out") ??
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-weak-band-owner-selection.${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`,
    exclude: excludeRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    include: includeRaw
      ? includeRaw
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : null,
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

async function evaluateCase(profileId: string, job: Fixture["jobs"][number]) {
  const input = {
    profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-owner-selection.local/${job.id}`,
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

  const candidateHit = weakBandPostCalibration && multiSurfaceSignal && answeredNoInjectionPattern;
  const strengthScore =
    (confidenceChanged ? 1 : 0) +
    (riskHypothesisChanged ? 1 : 0) +
    (riskQuickFocusChanged ? 1 : 0) +
    (riskChallengeAreasChanged ? 1 : 0) +
    (riskPrimaryGapChanged ? 1 : 0);

  return {
    case_id: job.id,
    sent_answers_count: answers.length,
    answered_count: Number(postResponse?.calibrationState?.answeredCount ?? 0),
    replay_recalibrated: Boolean(postResponse?.calibrationState?.recalibrated ?? false),
    band_after: postBand || null,
    score_delta: scoreDelta,
    confidence_changed: confidenceChanged,
    cta_changed: ctaChanged,
    risk_surface_changed: riskSurfaceChanged,
    risk_hypothesis_changed: riskHypothesisChanged,
    risk_quick_focus_changed: riskQuickFocusChanged,
    risk_challenge_areas_changed: riskChallengeAreasChanged,
    weak_band_post_calibration: weakBandPostCalibration,
    multi_surface_signal: multiSurfaceSignal,
    answered_no_injection_pattern: answeredNoInjectionPattern,
    candidate_hit: candidateHit,
    candidate_strength_score: strengthScore,
  };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const fixture = readFixture(args.fixturePath);
  const excluded = new Set(args.exclude);
  const included = args.include ? new Set(args.include) : null;
  const consideredJobs = fixture.jobs.filter((job) => {
    if (excluded.has(job.id)) return false;
    if (included && !included.has(job.id)) return false;
    return true;
  });
  const rows: Array<Record<string, any>> = [];
  for (const job of consideredJobs) {
    rows.push(await evaluateCase(args.profileId, job));
  }

  const hits = rows
    .filter((row) => row.candidate_hit === true)
    .sort((a, b) => {
      if (Number(b.candidate_strength_score) !== Number(a.candidate_strength_score)) {
        return Number(b.candidate_strength_score) - Number(a.candidate_strength_score);
      }
      return Number(b.score_delta) - Number(a.score_delta);
    });

  const selectedSecondOwnerCandidate = hits.length > 0 ? String(hits[0].case_id) : null;

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_weak_band_owner_candidate_selection_audit",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    exclusion_set: Array.from(excluded),
    inclusion_set: included ? Array.from(included) : null,
    selection_summary: {
      total_fixture_cases: fixture.jobs.length,
      considered_case_count: consideredJobs.length,
      weak_band_case_count: rows.filter((row) => row.weak_band_post_calibration).length,
      multi_surface_case_count: rows.filter((row) => row.multi_surface_signal).length,
      candidate_hit_count: hits.length,
      selected_second_owner_candidate: selectedSecondOwnerCandidate,
    },
    candidates_ranked: hits.map((row) => ({
      case_id: row.case_id,
      band_after: row.band_after,
      score_delta: row.score_delta,
      candidate_strength_score: row.candidate_strength_score,
    })),
    recommended_next_step: selectedSecondOwnerCandidate
      ? `Run bounded owner+guard micro-isolation with owner=${selectedSecondOwnerCandidate} and guard=job-18 using unchanged probe.`
      : "No valid second weak-band multi-surface owner found in this pass; run one regroup/line-value judgment for this owner family.",
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
        considered_case_count: result.selection_summary.considered_case_count,
        candidate_hit_count: result.selection_summary.candidate_hit_count,
        selected_second_owner_candidate: result.selection_summary.selected_second_owner_candidate,
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
