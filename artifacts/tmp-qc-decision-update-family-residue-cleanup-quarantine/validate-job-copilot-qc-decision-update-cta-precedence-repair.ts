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

const CTA_SEVERITY: Record<"ready_apply" | "confirm_first" | "deprioritize", number> = {
  ready_apply: 0,
  confirm_first: 1,
  deprioritize: 2,
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
      `artifacts/job-copilot-ns-quick-checks-generic-decision-update-repair-validation.${new Date()
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

function stricterCta(
  fallbackCta: "ready_apply" | "confirm_first" | "deprioritize",
  riskOverride: "ready_apply" | "confirm_first" | "deprioritize" | null,
): "ready_apply" | "confirm_first" | "deprioritize" {
  if (!riskOverride) return fallbackCta;
  return CTA_SEVERITY[riskOverride] > CTA_SEVERITY[fallbackCta] ? riskOverride : fallbackCta;
}

async function runCase(profileId: string, job: Fixture["jobs"][number], role: "owner" | "guard") {
  const input = {
    profileId,
    source: "linkedin" as const,
    jobUrl: `https://qc-decision-update-repair.local/${job.id}`,
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

  const band = String(recommendation.band ?? replayResp?.applyRecommendation?.band ?? "") as "strong" | "consider" | "weak" | "";
  const finalCta = String(recommendation.cta_state ?? "") as "ready_apply" | "confirm_first" | "deprioritize" | "";
  const riskOverrideState = String(riskInterview.recommendation_cta_state ?? "") || null;
  const mappedRiskOverride = mapRiskOverride(riskOverrideState);
  const fallbackCta: "ready_apply" | "confirm_first" | "deprioritize" = band === "weak" ? "deprioritize" : "ready_apply";
  const expectedCta = stricterCta(fallbackCta, mappedRiskOverride);

  const answeredCount = Number(replayResp?.calibrationState?.answeredCount ?? 0);
  const replayRecalibrated = Boolean(replayResp?.calibrationState?.recalibrated ?? false);

  return {
    case_id: job.id,
    case_role: role,
    sent_answers_count: answers.length,
    answered_count: answeredCount,
    replay_recalibrated: replayRecalibrated,
    band,
    final_cta_state: finalCta || null,
    mapped_risk_override: mappedRiskOverride,
    fallback_cta_expected: fallbackCta,
    expected_cta_from_precedence_rule: expectedCta,
    precedence_rule_match: finalCta === expectedCta,
    weak_band_ready_apply_violation: band === "weak" && finalCta === "ready_apply",
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

  const precedenceMatchCount = rows.filter((r) => Boolean(r.precedence_rule_match)).length;
  const weakBandViolationCount = rows.filter((r) => Boolean(r.weak_band_ready_apply_violation)).length;

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "REPAIR_VALIDATION",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    repaired_fault: "risk_interview_cta_override_short_circuits_band_cta_coupling",
    single_path_control: {
      baseline_path: "recalculateFitAfterCalibration_with_empty_answers",
      replay_path: "recalculateFitAfterCalibration_with_answer_payload",
      mixed_replay_paths_used: false,
      analyze_wrapper_used_for_replay: false,
    },
    summary: {
      precedence_rule_match_rate: `${precedenceMatchCount}/${rows.length}`,
      weak_band_ready_apply_violation_rate: `${weakBandViolationCount}/${rows.length}`,
      validation_passed: precedenceMatchCount === rows.length && weakBandViolationCount === 0,
    },
    cases: rows,
  };

  const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outPath,
        precedence_rule_match_rate: result.summary.precedence_rule_match_rate,
        weak_band_ready_apply_violation_rate: result.summary.weak_band_ready_apply_violation_rate,
        validation_passed: result.summary.validation_passed,
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
