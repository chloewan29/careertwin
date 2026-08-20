import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type Score = 0 | 1 | 2;
type Verdict = "GREEN" | "YELLOW" | "RED";
type Overall = "PASS" | "WATCH" | "FAIL";

type BenchmarkSlot = {
  expected_evidence_id?: string;
  expected_evidence_id_status?: "intentional_no_proof_gap";
};

type BenchmarkCase = {
  case_id: string;
  human_verdict: {
    why_you: {
      slot0: BenchmarkSlot;
      slot1: BenchmarkSlot;
    };
    career_verdict: {
      hiring_focus: string;
      for_you: string;
      must_not_say: string[];
    };
    biggest_risk: {
      expected_risk_type: "missing" | "weakly_proven";
    };
    quick_checks: {
      expected_question_intent: string;
    };
    what_this_role_adds: {
      expected_angle: string;
    };
    cta: {
      expected_angle: string;
    };
    cross_surface: {
      expected_thesis: string;
    };
  };
};

type BenchmarkFixture = {
  cases: BenchmarkCase[];
};

type SnapshotRow = {
  job_snapshot_id: number;
  source_platform: "linkedin" | "seek";
  job_url: string | null;
  job_title: string | null;
  company: string | null;
  location: string | null;
  job_description_raw: string | null;
};

type SmokeCase = {
  case: string;
  snapshot_id: number;
  interaction_id: number;
  slot0: string | null;
  slot1: string | null;
  debug?: {
    selected_ids_hash?: string;
  };
};

type PrevCaseRow = {
  case: string;
  career_verdict: Score;
  why_you_slot0: Score;
  why_you_slot1: Score;
  biggest_risk: Score;
  quick_checks: Score;
  role_adds: Score;
  cta: Score;
  cross_surface: Score;
  total_score: number;
  verdict: Verdict;
};

type PrevArtifact = {
  overall_green_yellow_red: { green: number; yellow: number; red: number };
  surface_scores: {
    career_verdict_avg: number;
    why_you_avg: number;
    biggest_risk_avg: number;
    quick_checks_avg: number;
    role_adds_avg: number;
    cta_avg: number;
    cross_surface_avg: number;
  };
  case_table: PrevCaseRow[];
  repeated_issue_patterns?: Array<{ pattern: string; count: number }>;
  hard_guardrail_failures?: Array<{ case: string; rule: string; details: string }>;
};

type CaseAudit = {
  case: string;
  previous_total: number;
  current_total: number;
  previous_verdict: Verdict;
  current_verdict: Verdict;
  quick_checks_score: Score;
  role_adds_score: Score;
  hard_guardrail_ok: boolean;
  new_regression: boolean;
  notes: string;
  scores: {
    career_verdict: Score;
    why_you_slot0: Score;
    why_you_slot1: Score;
    biggest_risk: Score;
    quick_checks: Score;
    role_adds: Score;
    cta: Score;
    cross_surface: Score;
  };
};

const PROFILE_ID = "8ec2c318-dbd0-42e2-acc7-10a103284b53";
const BENCHMARK_PATH = "docs/verification/fixtures/job-copilot-human-verdict-benchmark.json";
const SMOKE_PATH = "artifacts/job-copilot-final-replay-readonly-6case-smoke-test.2026-05-06T00-56-27-218Z.json";
const PREVIOUS_QA_PATH = "artifacts/job-copilot-full-sidepanel-human-verdict-qa-audit.2026-05-06T01-18-25-204Z.json";
const CASE_IDS = ["15454", "15089", "14609", "13260", "12941", "12879"];
const KNOWN_HOLD_RESIDUALS = new Set(["14609:slot1", "12941:slot1", "12879:slot0", "12879:slot1"]);

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
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readArg(name: string): string | null {
  const args = process.argv.slice(2);
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] ?? null;
}

function toAbs(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
}

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  const stop = new Set(["the", "and", "for", "with", "that", "this", "your", "you", "role", "into", "from", "will", "not"]);
  return normalize(value).split(" ").filter((token) => token.length >= 4 && !stop.has(token));
}

function overlapRatio(expected: string, actual: string): number {
  const a = new Set(tokenize(expected));
  const b = new Set(tokenize(actual));
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const token of a) if (b.has(token)) hit += 1;
  return hit / a.size;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function section(html: string, title: string): string {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<section[^>]*>[\\s\\S]*?<h2>${escaped}<\\/h2>([\\s\\S]*?)<\\/section>`, "i"));
  return match?.[1] ? stripHtml(match[1]) : "";
}

function parseQuestionTexts(quickHtml: string): string[] {
  const matches = Array.from(quickHtml.matchAll(/<p class="ctsp-item-label">([\s\S]*?)<\/p>/g));
  return matches.map((match) => stripHtml(match[1] ?? "")).filter(Boolean).slice(0, 2);
}

function parseRoleAddsChipPairs(summaryHtml: string): Array<{ title: string; desc: string }> {
  const blockMatch = summaryHtml.match(/<section class="ctsp-card ctsp-card-role-adds">([\s\S]*?)<\/section>/i);
  if (!blockMatch) return [];
  const items = Array.from(blockMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/gi));
  return items.map((item) => {
    const title = stripHtml((item[1] ?? "").match(/<p class="ctsp-item-label">([\s\S]*?)<\/p>/i)?.[1] ?? "");
    const desc = stripHtml((item[1] ?? "").match(/<p class="ctsp-note ctsp-note-wrap">([\s\S]*?)<\/p>/i)?.[1] ?? "");
    return { title, desc };
  }).filter((item) => item.title && item.desc);
}

function isYesNoQuestion(question: string): boolean {
  const raw = String(question ?? "").trim().replace(/\s+/g, " ");
  return /[?]$/.test(raw) && /^(have|has|did|was|were|is|are)\b/i.test(raw);
}

function meaningfulTokens(value: string): string[] {
  const stop = new Set([
    "have", "has", "did", "was", "were", "is", "are", "you", "your", "this", "that", "with", "from", "into",
    "role", "context", "analysis", "decision", "outcome", "work", "final", "change", "changed", "measurable",
  ]);
  return normalize(value).split(" ").filter((token) => token.length >= 4 && !stop.has(token));
}

function classifyRiskType(text: string): "missing" | "weakly_proven" | "other" {
  const t = normalize(text);
  if (!t) return "other";
  if (/(missing|no direct|not proven|insufficient|still limited)/.test(t)) return "missing";
  if (/(weak|partial|uncertain|not yet|limited)/.test(t)) return "weakly_proven";
  return "other";
}

function scoreCareer(expected: BenchmarkCase["human_verdict"]["career_verdict"], text: string): Score {
  if (!text.trim()) return 0;
  const overlap = (overlapRatio(expected.hiring_focus, text) + overlapRatio(expected.for_you, text)) / 2;
  let score: Score = overlap >= 0.18 ? 2 : overlap >= 0.08 ? 1 : 0;
  const textNorm = normalize(text);
  for (const banned of expected.must_not_say) {
    if (overlapRatio(banned, textNorm) >= 0.18 && score > 0) score = (score - 1) as Score;
  }
  return score;
}

function scoreSlot(caseId: string, slot: "slot0" | "slot1", expected: BenchmarkSlot, actualEmitted: boolean, selectedId: string | null, noProofGap: boolean): Score {
  const knownResidual = KNOWN_HOLD_RESIDUALS.has(`${caseId}:${slot}`);
  if (expected.expected_evidence_id_status === "intentional_no_proof_gap") return !actualEmitted && noProofGap ? 2 : 0;
  if (!actualEmitted) return knownResidual ? 1 : 0;
  if (expected.expected_evidence_id && selectedId === expected.expected_evidence_id) return 2;
  return knownResidual ? 1 : 0;
}

function scoreRisk(expectedType: "missing" | "weakly_proven", text: string): Score {
  const actual = classifyRiskType(text);
  if (expectedType === "missing") return actual === "missing" ? 2 : actual === "weakly_proven" ? 1 : 0;
  return actual === "missing" || actual === "weakly_proven" ? 2 : 0;
}

function scoreCta(expectedAngle: string, ctaText: string, hasIntentionalNoProofGap: boolean): Score {
  if (!ctaText.trim()) return 0;
  if (hasIntentionalNoProofGap && /(ready apply|apply confidently|strong apply|clear fit)/.test(normalize(ctaText))) return 0;
  const overlap = overlapRatio(expectedAngle, ctaText);
  return overlap >= 0.14 ? 2 : overlap >= 0.06 ? 1 : 0;
}

function scoreCross(verdictText: string, riskText: string, ctaText: string, slotScores: [Score, Score]): Score {
  const ctaNorm = normalize(ctaText);
  const riskNorm = normalize(riskText);
  const verdictNorm = normalize(verdictText);
  const contradictions = [
    /low priority|deprioritize/.test(ctaNorm) && /good fit|apply with/.test(verdictNorm),
    /ready apply|apply confidently/.test(ctaNorm) && /(missing|limited|not proven|weak)/.test(riskNorm),
    slotScores[0] === 0 || slotScores[1] === 0,
  ].filter(Boolean).length;
  return contradictions >= 2 ? 0 : contradictions === 1 ? 1 : 2;
}

function createRenderer() {
  (globalThis as Record<string, unknown>).CareerTwinSharedUtils = {
    asArray: (value: unknown) => (Array.isArray(value) ? value : []),
    escapeHtml: (value: unknown) => String(value ?? ""),
  };
  const context = vm.createContext(globalThis as unknown as vm.Context);
  for (const file of [
    "extensions/job-copilot/sidepanel/render/render-match-view-model.js",
    "extensions/job-copilot/sidepanel/render/render-match-summary.js",
    "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
    "extensions/job-copilot/sidepanel/render/render-tailored-cv.js",
  ]) {
    new vm.Script(fs.readFileSync(path.join(process.cwd(), file), "utf8"), { filename: file }).runInContext(context);
  }
  const g = globalThis as Record<string, any>;
  return {
    toVM: g.CareerTwinRenderMatchViewModel.toMatchPanelViewModel as (payload: Record<string, unknown>) => Record<string, unknown>,
    sum: g.CareerTwinRenderMatchSummary.renderMatchSummary as (viewModel: Record<string, unknown>) => string,
    qc: g.CareerTwinRenderQuickChecks.renderQuickChecks as (viewModel: Record<string, unknown>) => string,
    cta: g.CareerTwinRenderTailoredCv.renderTailoredCv as (viewModel: Record<string, unknown>) => string,
  };
}

async function run(): Promise<void> {
  loadEnvLocal();
  const outArg = readArg("--out");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = toAbs(outArg ?? `artifacts/job-copilot-post-polish-full-sidepanel-qa-smoke.${stamp}.json`);

  const previous = readJson<PrevArtifact>(toAbs(PREVIOUS_QA_PATH));
  const benchmark = readJson<BenchmarkFixture>(toAbs(BENCHMARK_PATH));
  const smoke = readJson<{ cases: SmokeCase[] }>(toAbs(SMOKE_PATH));
  const prevByCase = new Map(previous.case_table.map((row) => [row.case, row]));
  const benchmarkByCase = new Map(benchmark.cases.map((row) => [row.case_id, row]));
  const smokeByCase = new Map(smoke.cases.map((row) => [String(row.case), row]));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  const supabase = createClient(supabaseUrl, supabaseKey);
  const renderer = createRenderer();

  const snapshotIds = CASE_IDS.map((caseId) => smokeByCase.get(caseId)?.snapshot_id).filter((id): id is number => typeof id === "number");
  const { data: snapshots, error: snapshotError } = await supabase
    .from("job_snapshots")
    .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
    .in("job_snapshot_id", snapshotIds);
  if (snapshotError) throw new Error(snapshotError.message);
  const snapshotById = new Map<number, SnapshotRow>(((snapshots ?? []) as SnapshotRow[]).map((row) => [row.job_snapshot_id, row]));

  const caseRows: CaseAudit[] = [];
  const hardGuardrailFailures: Array<{ case: string; rule: string; details: string }> = [];
  const newRegressions: string[] = [];
  const issuePatternCounts = new Map<string, number>();

  let replayReadonlyEnforcedAll = true;
  let frozenContractAppliedAll = true;
  let selectedIdsRecomputedAny = false;

  for (const caseId of CASE_IDS) {
    const prev = prevByCase.get(caseId);
    const bm = benchmarkByCase.get(caseId);
    const smokeCase = smokeByCase.get(caseId);
    if (!prev || !bm || !smokeCase) throw new Error(`Missing dependencies for case ${caseId}`);
    const snapshot = snapshotById.get(smokeCase.snapshot_id);
    if (!snapshot) throw new Error(`Missing snapshot ${smokeCase.snapshot_id}`);

    const output = await analyzeJobForCopilot({
      profileId: PROFILE_ID,
      source: snapshot.source_platform,
      jobUrl: snapshot.job_url,
      jobTitle: snapshot.job_title ?? caseId,
      company: snapshot.company,
      location: snapshot.location,
      jobDescription: snapshot.job_description_raw ?? "",
      topEvidenceLimit: 4,
      reuseContextMode: "replay_readonly",
      jobSnapshotId: smokeCase.snapshot_id,
      interactionId: smokeCase.interaction_id,
    });

    const diagnostics: any = output.response.diagnostics ?? {};
    const selectionDebug: any = diagnostics.selection_debug ?? {};
    const selectionSummary: any = selectionDebug.selection_summary ?? {};
    const authoritativeSelection: any = selectionDebug.authoritative_selection ?? {};
    const slotDiag: any = authoritativeSelection.why_you_slot_diagnostics ?? {};
    const slot0Selected = slotDiag?.slot0?.selected_evidence_id ? String(slotDiag.slot0.selected_evidence_id) : null;
    const slot1Selected = slotDiag?.slot1?.selected_evidence_id ? String(slotDiag.slot1.selected_evidence_id) : null;
    const slot0Emitted = Boolean(slotDiag?.slot0?.card_emitted);
    const slot1Emitted = Boolean(slotDiag?.slot1?.card_emitted);
    const slot0NoProof = Boolean(slotDiag?.slot0?.no_proof_gap);
    const slot1NoProof = Boolean(slotDiag?.slot1?.no_proof_gap);

    const replayMode = String(selectionSummary.reuse_context_mode ?? "");
    const frozenApplied = Boolean(selectionSummary.replay_frozen_contract_applied);
    const expectedHash = smokeCase.debug?.selected_ids_hash ? String(smokeCase.debug.selected_ids_hash) : null;
    const actualHash = selectionSummary.selected_ids_hash ? String(selectionSummary.selected_ids_hash) : null;
    const recomputed = Boolean(expectedHash && actualHash && expectedHash !== actualHash);

    replayReadonlyEnforcedAll = replayReadonlyEnforcedAll && replayMode === "replay_readonly";
    frozenContractAppliedAll = frozenContractAppliedAll && frozenApplied;
    selectedIdsRecomputedAny = selectedIdsRecomputedAny || recomputed;

    const payload = {
      ...output.response,
      job: {
        jobTitle: output.job.jobTitle,
        jobDescriptionSnapshot: output.job.jobDescriptionSnapshot,
      },
    };
    const viewModel: any = renderer.toVM(payload);
    const summaryHtml = renderer.sum(viewModel);
    const quickHtml = renderer.qc(viewModel);
    const ctaHtml = renderer.cta(viewModel);

    const careerText = section(summaryHtml, "Career Verdict");
    const whyText = section(summaryHtml, "Why You");
    const riskText = section(summaryHtml, "Biggest Risk");
    const roleAddsText = section(summaryHtml, "What This Role Adds");
    const quickText = section(quickHtml, "Quick Checks");
    const ctaText = section(ctaHtml, "Recommended Action");

    const questions = parseQuestionTexts(quickHtml);
    const gapText = String(viewModel?.quickChecks?.topQuickCheckGap ?? viewModel?.quickChecks?.primaryGapLabel ?? "");
    const gapTokens = meaningfulTokens(gapText);
    const yesNo = questions.length === 2 && questions.every((q) => isYesNoQuestion(q));
    const q0Tokens = meaningfulTokens(questions[0] ?? "");
    const q1Tokens = meaningfulTokens(questions[1] ?? "");
    const sharedTokens = q0Tokens.filter((token) => q1Tokens.includes(token));
    const sharedWithGap = sharedTokens.filter((token) => gapTokens.includes(token));
    const sameGap = questions.length === 2 && (sharedWithGap.length >= 1 || sharedTokens.length >= 2 || gapTokens.length === 0);
    const quickGeneric = questions.some((q) => /^(do you have|can you tell us|tell us|describe|explain)\b/i.test(q))
      || /why it matters|what to include/.test(normalize(quickText));
    const quickSpecific = yesNo && sameGap && !quickGeneric && questions.length === 2;
    const quickIntent = overlapRatio(bm.human_verdict.quick_checks.expected_question_intent, quickText);
    const quickScore: Score = quickSpecific && quickIntent >= 0.06 ? 2 : yesNo && questions.length === 2 ? 1 : 0;

    const roleAddsChips = parseRoleAddsChipPairs(summaryHtml);
    const roleAddsCount = roleAddsChips.length;
    const roleAddsGeneric = /grow your leadership|grow your skills|broader experience|generic growth/.test(normalize(roleAddsText));
    const roleAddsOverclaim = (caseId === "15454" && /already proven.*financial crime|clear proof.*financial crime/.test(normalize(roleAddsText)))
      || (caseId === "13260" && /already proven.*experiment|clear proof.*experiment/.test(normalize(roleAddsText)));
    const roleAddsIntent = overlapRatio(bm.human_verdict.what_this_role_adds.expected_angle, roleAddsText);
    const roleAddsScore: Score = roleAddsCount >= 2 && roleAddsCount <= 3 && !roleAddsGeneric && !roleAddsOverclaim && roleAddsIntent >= 0.06
      ? 2
      : roleAddsCount >= 2 && roleAddsCount <= 3 && !roleAddsOverclaim
        ? 1
        : 0;

    const careerScore = scoreCareer(bm.human_verdict.career_verdict, careerText);
    const slot0Score = scoreSlot(caseId, "slot0", bm.human_verdict.why_you.slot0, slot0Emitted, slot0Selected, slot0NoProof);
    const slot1Score = scoreSlot(caseId, "slot1", bm.human_verdict.why_you.slot1, slot1Emitted, slot1Selected, slot1NoProof);
    const riskScore = scoreRisk(bm.human_verdict.biggest_risk.expected_risk_type, riskText);
    const ctaScore = scoreCta(
      bm.human_verdict.cta.expected_angle,
      ctaText,
      bm.human_verdict.why_you.slot0.expected_evidence_id_status === "intentional_no_proof_gap"
        || bm.human_verdict.why_you.slot1.expected_evidence_id_status === "intentional_no_proof_gap",
    );
    const crossScore = scoreCross(careerText, riskText, ctaText, [slot0Score, slot1Score]);

    const scores = {
      career_verdict: careerScore,
      why_you_slot0: slot0Score,
      why_you_slot1: slot1Score,
      biggest_risk: riskScore,
      quick_checks: quickScore,
      role_adds: roleAddsScore,
      cta: ctaScore,
      cross_surface: crossScore,
    };

    const currentTotal = Object.values(scores).reduce((sum, v) => sum + v, 0);

    if (caseId === "15454" && slot1Emitted) {
      hardGuardrailFailures.push({ case: caseId, rule: "15454 slot1 intentional no-proof gap filled", details: slot1Selected ?? "null" });
    }
    if (caseId === "13260" && slot0Emitted) {
      hardGuardrailFailures.push({ case: caseId, rule: "13260 slot0 intentional no-proof gap filled", details: slot0Selected ?? "null" });
    }
    if ((bm.human_verdict.why_you.slot0.expected_evidence_id_status === "intentional_no_proof_gap"
      || bm.human_verdict.why_you.slot1.expected_evidence_id_status === "intentional_no_proof_gap")
      && /(ready apply|apply confidently|strong apply|clear fit)/.test(normalize(ctaText))) {
      hardGuardrailFailures.push({ case: caseId, rule: "CTA claims proof for intentional no-proof gaps", details: ctaText });
    }
    if (/proven financial crime|direct financial crime|proven cro experimentation|direct cro experimentation/.test(normalize(`${careerText} ${whyText} ${riskText} ${ctaText}`))) {
      hardGuardrailFailures.push({ case: caseId, rule: "Unsupported financial-crime/CRO experimentation proof claim", details: `${careerText} | ${whyText}` });
    }
    if (replayMode !== "replay_readonly") {
      hardGuardrailFailures.push({ case: caseId, rule: "replay_readonly is not used", details: replayMode || "missing" });
    }
    if (!frozenApplied) {
      hardGuardrailFailures.push({ case: caseId, rule: "frozen contract is not applied", details: "selection_summary.replay_frozen_contract_applied=false" });
    }
    if (recomputed) {
      hardGuardrailFailures.push({ case: caseId, rule: "selected IDs are recomputed", details: `expected_hash=${expectedHash} actual_hash=${actualHash}` });
    }

    let verdict: Verdict;
    const caseHardFail = hardGuardrailFailures.some((item) => item.case === caseId);
    if (caseHardFail || currentTotal <= 7) verdict = "RED";
    else if (currentTotal >= 13) verdict = "GREEN";
    else verdict = "YELLOW";

    const regressedSurfaces: string[] = [];
    const compareSurfaces: Array<keyof PrevCaseRow> = ["career_verdict", "why_you_slot0", "why_you_slot1", "biggest_risk", "cta", "cross_surface"];
    for (const key of compareSurfaces) {
      const previousValue = prev[key] as number;
      const currentValue = scores[key as keyof typeof scores] as number;
      if (currentValue < previousValue) {
        if ((key === "why_you_slot0" && KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot0`)) || (key === "why_you_slot1" && KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot1`))) {
          continue;
        }
        regressedSurfaces.push(String(key));
      }
    }
    const verdictWorsened = (prev.verdict === "GREEN" && verdict !== "GREEN") || (prev.verdict === "YELLOW" && verdict === "RED");
    const newRegression = regressedSurfaces.length > 0 || verdictWorsened || caseHardFail;
    if (newRegression) newRegressions.push(`${caseId}: ${regressedSurfaces.join(", ") || "verdict/guardrail regression"}`);

    const anyNoProofGap = slot0NoProof || slot1NoProof;
    const crossSurfacePattern =
      crossScore === 2
        ? "no_issue"
        : crossScore === 0
          ? "cross_surface_hard_contradiction"
          : KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot0`) || KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot1`)
            ? "cross_surface_known_hold_residual"
            : anyNoProofGap
              ? "cross_surface_gap_routing_watch"
              : "cross_surface_soft_story_drift";

    const patterns = [
      quickScore < 2 ? "quick_check_generic" : "no_issue",
      roleAddsScore < 2 ? "role_adds_too_generic" : "no_issue",
      (slot0Score < 2 || slot1Score < 2) ? "benchmark_hold_residual" : "no_issue",
      crossSurfacePattern,
    ].filter((pattern) => pattern !== "no_issue");
    for (const pattern of patterns) issuePatternCounts.set(pattern, (issuePatternCounts.get(pattern) ?? 0) + 1);

    const notes = [
      `quick_checks=${questions.length}`,
      `role_adds=${roleAddsCount}`,
      `slot0_expected=${smokeCase.slot0 ?? "null"}`,
      `slot0_actual=${slot0Selected ?? "null"}`,
      `slot1_expected=${smokeCase.slot1 ?? "null"}`,
      `slot1_actual=${slot1Selected ?? "null"}`,
      `replay=${replayMode || "missing"}`,
      `frozen=${frozenApplied}`,
    ].join("; ");

    caseRows.push({
      case: caseId,
      previous_total: prev.total_score,
      current_total: currentTotal,
      previous_verdict: prev.verdict,
      current_verdict: verdict,
      quick_checks_score: quickScore,
      role_adds_score: roleAddsScore,
      hard_guardrail_ok: !caseHardFail,
      new_regression: newRegression,
      notes,
      scores,
    });
  }

  const currentCounts = {
    green: caseRows.filter((row) => row.current_verdict === "GREEN").length,
    yellow: caseRows.filter((row) => row.current_verdict === "YELLOW").length,
    red: caseRows.filter((row) => row.current_verdict === "RED").length,
  };
  const avg = (values: number[]) => Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(3));
  const currentSurfaceAverages = {
    career_verdict_avg: avg(caseRows.map((row) => row.scores.career_verdict)),
    why_you_avg: avg(caseRows.map((row) => (row.scores.why_you_slot0 + row.scores.why_you_slot1) / 2)),
    biggest_risk_avg: avg(caseRows.map((row) => row.scores.biggest_risk)),
    quick_checks_avg: avg(caseRows.map((row) => row.scores.quick_checks)),
    role_adds_avg: avg(caseRows.map((row) => row.scores.role_adds)),
    cta_avg: avg(caseRows.map((row) => row.scores.cta)),
    cross_surface_avg: avg(caseRows.map((row) => row.scores.cross_surface)),
  };

  const repeatedIssuePatterns = Array.from(issuePatternCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([pattern, count]) => ({ pattern, count }));

  const quickImproved = currentSurfaceAverages.quick_checks_avg >= 1.5 && previous.surface_scores.quick_checks_avg === 0;
  const roleAddsImproved = currentSurfaceAverages.role_adds_avg >= 1.5 && previous.surface_scores.role_adds_avg === 0;
  const hardFailsAny = hardGuardrailFailures.length > 0;
  const newRedCases = caseRows.some((row) => row.current_verdict === "RED" && row.previous_verdict !== "RED");
  const noMaterialRegression = newRegressions.length === 0;

  let overallResult: Overall;
  if (!replayReadonlyEnforcedAll || !frozenContractAppliedAll || selectedIdsRecomputedAny || hardFailsAny || newRedCases || !quickImproved || !roleAddsImproved) {
    overallResult = "FAIL";
  } else if (quickImproved && roleAddsImproved && !hardFailsAny && (currentCounts.yellow >= 1 || Array.from(KNOWN_HOLD_RESIDUALS).length > 0)) {
    overallResult = "WATCH";
  } else {
    overallResult = "PASS";
  }

  const output = {
    decision_label: "AUDIT",
    mode: "POST_POLISH_SMOKE",
    overall_result: overallResult,
    replay_readonly_enforced_all: replayReadonlyEnforcedAll,
    frozen_contract_applied_all: frozenContractAppliedAll,
    selected_ids_recomputed_any: selectedIdsRecomputedAny,
    cases: caseRows,
    case_table: caseRows.map((row) => ({
      case: row.case,
      previous_total: row.previous_total,
      current_total: row.current_total,
      previous_verdict: row.previous_verdict,
      current_verdict: row.current_verdict,
      quick_checks_score: row.quick_checks_score,
      role_adds_score: row.role_adds_score,
      hard_guardrail_ok: row.hard_guardrail_ok,
      new_regression: row.new_regression,
      notes: row.notes,
    })),
    surface_table: [
      { surface: "career_verdict", previous_avg: previous.surface_scores.career_verdict_avg, current_avg: currentSurfaceAverages.career_verdict_avg, improved: currentSurfaceAverages.career_verdict_avg > previous.surface_scores.career_verdict_avg, regressed: currentSurfaceAverages.career_verdict_avg < previous.surface_scores.career_verdict_avg, notes: "" },
      { surface: "why_you", previous_avg: previous.surface_scores.why_you_avg, current_avg: currentSurfaceAverages.why_you_avg, improved: currentSurfaceAverages.why_you_avg > previous.surface_scores.why_you_avg, regressed: currentSurfaceAverages.why_you_avg < previous.surface_scores.why_you_avg, notes: "known HOLD residuals may persist" },
      { surface: "biggest_risk", previous_avg: previous.surface_scores.biggest_risk_avg, current_avg: currentSurfaceAverages.biggest_risk_avg, improved: currentSurfaceAverages.biggest_risk_avg > previous.surface_scores.biggest_risk_avg, regressed: currentSurfaceAverages.biggest_risk_avg < previous.surface_scores.biggest_risk_avg, notes: "" },
      { surface: "quick_checks", previous_avg: previous.surface_scores.quick_checks_avg, current_avg: currentSurfaceAverages.quick_checks_avg, improved: currentSurfaceAverages.quick_checks_avg > previous.surface_scores.quick_checks_avg, regressed: currentSurfaceAverages.quick_checks_avg < previous.surface_scores.quick_checks_avg, notes: "post-polish primary focus" },
      { surface: "role_adds", previous_avg: previous.surface_scores.role_adds_avg, current_avg: currentSurfaceAverages.role_adds_avg, improved: currentSurfaceAverages.role_adds_avg > previous.surface_scores.role_adds_avg, regressed: currentSurfaceAverages.role_adds_avg < previous.surface_scores.role_adds_avg, notes: "post-polish primary focus" },
      { surface: "cta", previous_avg: previous.surface_scores.cta_avg, current_avg: currentSurfaceAverages.cta_avg, improved: currentSurfaceAverages.cta_avg > previous.surface_scores.cta_avg, regressed: currentSurfaceAverages.cta_avg < previous.surface_scores.cta_avg, notes: "" },
      { surface: "cross_surface", previous_avg: previous.surface_scores.cross_surface_avg, current_avg: currentSurfaceAverages.cross_surface_avg, improved: currentSurfaceAverages.cross_surface_avg > previous.surface_scores.cross_surface_avg, regressed: currentSurfaceAverages.cross_surface_avg < previous.surface_scores.cross_surface_avg, notes: "" },
    ],
    before_after: {
      previous_green_yellow_red: previous.overall_green_yellow_red,
      current_green_yellow_red: currentCounts,
      quick_checks_avg_before: previous.surface_scores.quick_checks_avg,
      quick_checks_avg_after: currentSurfaceAverages.quick_checks_avg,
      role_adds_avg_before: previous.surface_scores.role_adds_avg,
      role_adds_avg_after: currentSurfaceAverages.role_adds_avg,
    },
    hard_guardrail_failures: hardGuardrailFailures,
    repeated_issue_patterns: repeatedIssuePatterns,
    new_regressions: newRegressions,
    known_hold_residuals: Array.from(KNOWN_HOLD_RESIDUALS),
    repair_admission_recommended: false,
    recommended_next_action: overallResult === "FAIL"
      ? "HOLD: treat this smoke as invalid/regressed and continue watch mode without reopening Why You deep repair."
      : "HOLD/WATCH: keep post-polish sidepanel state, continue replay_readonly monitoring, and route next work to CV tailoring or sidepanel UX polish.",
    metadata: {
      generated_at: new Date().toISOString(),
      previous_artifact: PREVIOUS_QA_PATH,
      smoke_source: SMOKE_PATH,
      benchmark_source: BENCHMARK_PATH,
      case_ids: CASE_IDS,
    },
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    out: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
    overall_result: output.overall_result,
    replay_readonly_enforced_all: output.replay_readonly_enforced_all,
    frozen_contract_applied_all: output.frozen_contract_applied_all,
    selected_ids_recomputed_any: output.selected_ids_recomputed_any,
    before_after: output.before_after,
    hard_guardrail_failures: output.hard_guardrail_failures.length,
    new_regressions: output.new_regressions.length,
  }, null, 2));
}

run().catch((error) => {
  console.error("[run-job-copilot-post-polish-full-sidepanel-qa-smoke] failed", error);
  process.exit(1);
});
