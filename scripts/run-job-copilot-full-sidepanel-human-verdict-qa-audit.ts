import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type RiskType = "missing" | "weakly_proven" | "weakly_surfaced" | "untyped";
type Score = 0 | 1 | 2;
type Severity = "low" | "medium" | "high";
type Owner = "layer1" | "layer2" | "layer3" | "layer4" | "benchmark" | "harness";
type Verdict = "GREEN" | "YELLOW" | "RED";

type BenchmarkSlot = {
  expected_evidence_id?: string;
  expected_evidence_id_status?: "intentional_no_proof_gap";
  buying_point: string;
  human_reason: string;
};

type BenchmarkCase = {
  case_id: string;
  role_summary: string;
  human_verdict: {
    career_verdict: {
      hiring_focus: string;
      for_you: string;
      must_not_say: string[];
    };
    why_you: {
      slot0: BenchmarkSlot;
      slot1: BenchmarkSlot;
    };
    biggest_risk: {
      expected_risk_type: "missing" | "weakly_proven";
      human_reason: string;
    };
    quick_checks: {
      expected_question_intent: string;
      human_reason: string;
    };
    what_this_role_adds: {
      expected_angle: string;
      human_reason: string;
    };
    cta: {
      expected_angle: string;
      human_reason: string;
    };
    cross_surface: {
      expected_thesis: string;
      human_reason: string;
    };
  };
};

type BenchmarkFixture = {
  version: number;
  description: string;
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

type InteractionRow = {
  interaction_id: number;
  selected_evidence_ids: unknown;
};

type SmokeCase = {
  case: string;
  snapshot_id: number;
  interaction_id: number;
  debug?: {
    selected_ids_hash?: string;
  };
};

type HardGuardrailFailure = {
  case: string;
  rule: string;
  details: string;
};

type CaseIssue = {
  case: string;
  surface: string;
  expected_human_verdict: string;
  current_output_summary: string;
  score: Score;
  issue_pattern:
    | "wrong_evidence"
    | "overclaims_no_proof_gap"
    | "generic_leadership_evidence_promoted"
    | "slot_omitted_vs_expected_id"
    | "risk_not_buying_point_specific"
    | "quick_check_generic"
    | "role_adds_too_generic"
    | "cta_overclaims"
    | "cross_surface_hard_contradiction"
    | "cross_surface_soft_story_drift"
    | "cross_surface_gap_routing_watch"
    | "cross_surface_known_hold_residual"
    | "cross_surface_labeling_watch"
    | "renderer_wording_issue"
    | "benchmark_hold_residual"
    | "no_issue";
  severity: Severity;
  recommended_owner: Owner;
};

type CaseScores = {
  career_verdict: Score;
  why_you_slot0: Score;
  why_you_slot1: Score;
  biggest_risk: Score;
  quick_checks: Score;
  role_adds: Score;
  cta: Score;
  cross_surface: Score;
};

type CaseSummaryRow = {
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
  weakest_surface: string;
  main_issue: string;
};

type SurfaceTexts = {
  career_verdict: string;
  why_you: string;
  biggest_risk: string;
  what_this_role_adds: string;
  quick_checks: string;
  cta: string;
};

type WhySlotAudit = {
  slot: "slot0" | "slot1";
  card_emitted: boolean;
  selected_evidence_id: string | null;
  proof_summary: string;
  headline: string;
  assigned_buying_point: string | null;
  no_proof_gap: boolean;
  omission_reason: string | null;
  no_proof_routing: string[];
};

type CaseAudit = {
  case: string;
  snapshot_id: number;
  interaction_id: number;
  replay_readonly: boolean;
  frozen_contract_applied: boolean;
  selected_ids_recomputed: boolean;
  selected_ids_hash_expected: string | null;
  selected_ids_hash_actual: string | null;
  selected_ids_expected: string[];
  selected_ids_actual: string[];
  surfaces: SurfaceTexts;
  why_you_slots: {
    slot0: WhySlotAudit;
    slot1: WhySlotAudit;
  };
  scores: CaseScores;
  issue_patterns: string[];
  total_score: number;
  verdict: Verdict;
  weakest_surface: string;
  main_issue: string;
};

const DEFAULT_PROFILE_ID = "8ec2c318-dbd0-42e2-acc7-10a103284b53";
const BENCHMARK_PATH = "docs/verification/fixtures/job-copilot-human-verdict-benchmark.json";
const SMOKE_PATH = "artifacts/job-copilot-final-replay-readonly-6case-smoke-test.2026-05-06T00-56-27-218Z.json";
const KNOWN_HOLD_RESIDUALS = new Set<string>([
  "14609:slot1",
  "12941:slot1",
  "12879:slot0",
  "12879:slot1",
]);

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

function readArg(name: string): string | null {
  const args = process.argv.slice(2);
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] ?? null;
}

function toAbs(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as T;
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "your",
    "you",
    "are",
    "from",
    "into",
    "role",
    "about",
    "have",
    "has",
    "will",
    "not",
    "but",
    "can",
  ]);
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 4 && !stop.has(token));
}

function overlapRatio(expected: string, actual: string): number {
  const expectedTokens = new Set(tokenize(expected));
  const actualTokens = new Set(tokenize(actual));
  if (expectedTokens.size === 0 || actualTokens.size === 0) return 0;
  let match = 0;
  for (const token of expectedTokens) {
    if (actualTokens.has(token)) match += 1;
  }
  return match / expectedTokens.size;
}

function classifyRiskType(text: string): RiskType {
  const t = normalize(text);
  if (!t) return "untyped";
  if (/(missing|no direct|not proven|insufficient|still limited)/.test(t)) return "missing";
  if (/(weak|partial|uncertain|not yet|calibrat|limited)/.test(t)) return "weakly_proven";
  if (/(framing|positioning|surface|wording)/.test(t)) return "weakly_surfaced";
  return "untyped";
}

function parseSelectedEvidenceIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
    } catch {
      return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }
  return [];
}

function arraysEqualAsSets(left: string[], right: string[]): boolean {
  const a = Array.from(new Set(left)).sort();
  const b = Array.from(new Set(right)).sort();
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
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

function scoreCareerVerdict(expected: BenchmarkCase["human_verdict"]["career_verdict"], actualText: string): Score {
  if (!actualText.trim()) return 0;
  const focusOverlap = overlapRatio(expected.hiring_focus, actualText);
  const forYouOverlap = overlapRatio(expected.for_you, actualText);
  const overlap = (focusOverlap + forYouOverlap) / 2;
  let score: Score = overlap >= 0.18 ? 2 : overlap >= 0.08 ? 1 : 0;
  const actualNorm = normalize(actualText);
  if (/generic|leadership only|broad fit/.test(actualNorm) && score > 0) score = (score - 1) as Score;
  for (const banned of expected.must_not_say) {
    if (overlapRatio(banned, actualText) >= 0.18 && score > 0) {
      score = (score - 1) as Score;
    }
  }
  return score;
}

function scoreSlot(
  caseId: string,
  slot: "slot0" | "slot1",
  expected: BenchmarkSlot,
  actual: WhySlotAudit,
): { score: Score; issue: CaseIssue } {
  const expectedSummary = `${expected.buying_point}: ${expected.human_reason}`;
  const actualSummary = actual.card_emitted
    ? `emitted ${actual.selected_evidence_id ?? "null"} (${actual.headline || actual.proof_summary || "no copy"})`
    : `omitted (${actual.omission_reason ?? "no_reason"})`;

  const knownResidual = KNOWN_HOLD_RESIDUALS.has(`${caseId}:${slot}`);
  if (expected.expected_evidence_id_status === "intentional_no_proof_gap") {
    if (actual.card_emitted) {
      return {
        score: 0,
        issue: {
          case: caseId,
          surface: `Why You ${slot}`,
          expected_human_verdict: expectedSummary,
          current_output_summary: actualSummary,
          score: 0,
          issue_pattern: "overclaims_no_proof_gap",
          severity: "high",
          recommended_owner: "layer3",
        },
      };
    }
    const score: Score = actual.no_proof_gap ? 2 : 1;
    return {
      score,
      issue: {
        case: caseId,
        surface: `Why You ${slot}`,
        expected_human_verdict: expectedSummary,
        current_output_summary: actualSummary,
        score,
        issue_pattern: score === 2 ? "no_issue" : "renderer_wording_issue",
        severity: score === 2 ? "low" : "medium",
        recommended_owner: score === 2 ? "benchmark" : "layer4",
      },
    };
  }

  const expectedId = expected.expected_evidence_id ?? null;
  if (!actual.card_emitted) {
    const score: Score = knownResidual ? 1 : 0;
    return {
      score,
      issue: {
        case: caseId,
        surface: `Why You ${slot}`,
        expected_human_verdict: expectedSummary,
        current_output_summary: actualSummary,
        score,
        issue_pattern: knownResidual ? "benchmark_hold_residual" : "slot_omitted_vs_expected_id",
        severity: knownResidual ? "medium" : "high",
        recommended_owner: knownResidual ? "benchmark" : "layer3",
      },
    };
  }

  if (expectedId && actual.selected_evidence_id === expectedId) {
    return {
      score: 2,
      issue: {
        case: caseId,
        surface: `Why You ${slot}`,
        expected_human_verdict: expectedSummary,
        current_output_summary: actualSummary,
        score: 2,
        issue_pattern: "no_issue",
        severity: "low",
        recommended_owner: "benchmark",
      },
    };
  }

  const score: Score = knownResidual ? 1 : 0;
  return {
    score,
    issue: {
      case: caseId,
      surface: `Why You ${slot}`,
      expected_human_verdict: expectedSummary,
      current_output_summary: actualSummary,
      score,
      issue_pattern: knownResidual ? "benchmark_hold_residual" : "wrong_evidence",
      severity: knownResidual ? "medium" : "high",
      recommended_owner: knownResidual ? "benchmark" : "layer3",
    },
  };
}

function scoreBiggestRisk(expected: BenchmarkCase["human_verdict"]["biggest_risk"], actualText: string): { score: Score; issuePattern: CaseIssue["issue_pattern"] } {
  if (!actualText.trim()) return { score: 0, issuePattern: "risk_not_buying_point_specific" };
  const riskType = classifyRiskType(actualText);
  if (expected.expected_risk_type === "missing") {
    if (riskType === "missing") return { score: 2, issuePattern: "no_issue" };
    if (riskType === "weakly_proven") return { score: 1, issuePattern: "risk_not_buying_point_specific" };
    return { score: 0, issuePattern: "risk_not_buying_point_specific" };
  }
  if (riskType === "weakly_proven" || riskType === "missing") return { score: 2, issuePattern: "no_issue" };
  if (riskType === "weakly_surfaced") return { score: 1, issuePattern: "risk_not_buying_point_specific" };
  return { score: 0, issuePattern: "risk_not_buying_point_specific" };
}

function scoreIntent(expectedText: string, actualText: string): Score {
  if (!actualText.trim()) return 0;
  const overlap = overlapRatio(expectedText, actualText);
  if (overlap >= 0.14) return 2;
  if (overlap >= 0.06) return 1;
  return 0;
}

function scoreCta(expectedText: string, actualText: string, hasIntentionalNoProofGap: boolean): { score: Score; overclaim: boolean } {
  if (!actualText.trim()) return { score: 0, overclaim: false };
  const normalized = normalize(actualText);
  const overclaim = hasIntentionalNoProofGap && /(ready apply|apply confidently|strong apply|clear fit)/.test(normalized);
  if (overclaim) return { score: 0, overclaim: true };
  const overlap = overlapRatio(expectedText, actualText);
  if (overlap >= 0.14) return { score: 2, overclaim: false };
  if (overlap >= 0.06) return { score: 1, overclaim: false };
  return { score: 0, overclaim: false };
}

function weakestSurface(scores: CaseScores): string {
  const pairs: Array<[string, number]> = [
    ["career_verdict", scores.career_verdict],
    ["why_you_slot0", scores.why_you_slot0],
    ["why_you_slot1", scores.why_you_slot1],
    ["biggest_risk", scores.biggest_risk],
    ["quick_checks", scores.quick_checks],
    ["role_adds", scores.role_adds],
    ["cta", scores.cta],
    ["cross_surface", scores.cross_surface],
  ];
  pairs.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  return pairs[0]?.[0] ?? "unknown";
}

function surfaceAverages(cases: CaseAudit[]) {
  const avg = (values: number[]) => Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(3));
  return {
    career_verdict_avg: avg(cases.map((item) => item.scores.career_verdict)),
    why_you_avg: avg(cases.map((item) => (item.scores.why_you_slot0 + item.scores.why_you_slot1) / 2)),
    biggest_risk_avg: avg(cases.map((item) => item.scores.biggest_risk)),
    quick_checks_avg: avg(cases.map((item) => item.scores.quick_checks)),
    role_adds_avg: avg(cases.map((item) => item.scores.role_adds)),
    cta_avg: avg(cases.map((item) => item.scores.cta)),
    cross_surface_avg: avg(cases.map((item) => item.scores.cross_surface)),
  };
}

async function run(): Promise<void> {
  loadEnvLocal();
  const outArg = readArg("--out");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = toAbs(outArg ?? `artifacts/job-copilot-full-sidepanel-human-verdict-qa-audit.${stamp}.json`);

  const benchmark = readJson<BenchmarkFixture>(toAbs(BENCHMARK_PATH));
  const smoke = readJson<{ cases: SmokeCase[] }>(toAbs(SMOKE_PATH));
  const smokeCases = smoke.cases;
  const selectedCaseIds = ["15454", "15089", "14609", "13260", "12941", "12879"];
  const caseMap = new Map(benchmark.cases.map((item) => [item.case_id, item]));
  const smokeMap = new Map(smokeCases.map((item) => [String(item.case), item]));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const renderer = createRenderer();

  const snapshotIds = selectedCaseIds.map((caseId) => {
    const smokeCase = smokeMap.get(caseId);
    if (!smokeCase) throw new Error(`Missing smoke mapping for case ${caseId}`);
    return smokeCase.snapshot_id;
  });
  const interactionIds = selectedCaseIds.map((caseId) => {
    const smokeCase = smokeMap.get(caseId);
    if (!smokeCase) throw new Error(`Missing interaction mapping for case ${caseId}`);
    return smokeCase.interaction_id;
  });

  const { data: snapshotRows, error: snapshotError } = await supabase
    .from("job_snapshots")
    .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
    .in("job_snapshot_id", snapshotIds);
  if (snapshotError) throw new Error(snapshotError.message);
  const snapshotById = new Map<number, SnapshotRow>(((snapshotRows ?? []) as SnapshotRow[]).map((row) => [row.job_snapshot_id, row]));

  const { data: interactionRows, error: interactionError } = await supabase
    .from("user_job_interactions")
    .select("interaction_id,selected_evidence_ids")
    .in("interaction_id", interactionIds);
  if (interactionError) throw new Error(interactionError.message);
  const interactionById = new Map<number, InteractionRow>(((interactionRows ?? []) as InteractionRow[]).map((row) => [row.interaction_id, row]));

  const hardGuardrailFailures: HardGuardrailFailure[] = [];
  const caseAudits: CaseAudit[] = [];
  const issues: CaseIssue[] = [];

  for (const caseId of selectedCaseIds) {
    const benchmarkCase = caseMap.get(caseId);
    if (!benchmarkCase) throw new Error(`Missing benchmark case ${caseId}`);
    const smokeCase = smokeMap.get(caseId);
    if (!smokeCase) throw new Error(`Missing smoke case ${caseId}`);
    const snapshot = snapshotById.get(smokeCase.snapshot_id);
    if (!snapshot) throw new Error(`Missing snapshot ${smokeCase.snapshot_id}`);
    const interaction = interactionById.get(smokeCase.interaction_id);
    if (!interaction) throw new Error(`Missing interaction ${smokeCase.interaction_id}`);

    const expectedSelectedIds = parseSelectedEvidenceIds(interaction.selected_evidence_ids);
    const output = await analyzeJobForCopilot({
      profileId: DEFAULT_PROFILE_ID,
      source: snapshot.source_platform,
      jobUrl: snapshot.job_url,
      jobTitle: snapshot.job_title ?? benchmarkCase.role_summary,
      company: snapshot.company,
      location: snapshot.location,
      jobDescription: snapshot.job_description_raw ?? "",
      topEvidenceLimit: 4,
      reuseContextMode: "replay_readonly",
      jobSnapshotId: snapshot.job_snapshot_id,
      interactionId: smokeCase.interaction_id,
    });

    const diagnostics = output.response.diagnostics ?? {};
    const selectionDebug = diagnostics.selection_debug ?? {};
    const selectionSummary = selectionDebug.selection_summary ?? {};
    const authoritativeSelection = selectionDebug.authoritative_selection ?? {};
    const whyCards = Array.isArray(authoritativeSelection.why_you_cards) ? authoritativeSelection.why_you_cards : [];
    const slotDiagnostics = authoritativeSelection.why_you_slot_diagnostics ?? {};
    const slot0DiagRaw = slotDiagnostics.slot0 ?? {};
    const slot1DiagRaw = slotDiagnostics.slot1 ?? {};
    const slot0Card = whyCards[0] ?? null;
    const slot1Card = whyCards[1] ?? null;
    const replayMode = String(selectionSummary.reuse_context_mode ?? "");
    const frozenApplied = Boolean(selectionSummary.replay_frozen_contract_applied);
    const selectedActual = (output.job.selectedEvidenceIds ?? []).map((id) => String(id));
    const expectedSelectedHash = smokeCase.debug?.selected_ids_hash ? String(smokeCase.debug.selected_ids_hash) : null;
    const actualSelectedHash = selectionSummary.selected_ids_hash ? String(selectionSummary.selected_ids_hash) : null;
    const selectedRecomputed = expectedSelectedHash && actualSelectedHash
      ? expectedSelectedHash !== actualSelectedHash
      : !arraysEqualAsSets(expectedSelectedIds, selectedActual);

    const payload = {
      ...output.response,
      job: {
        jobTitle: output.job.jobTitle,
        jobDescriptionSnapshot: output.job.jobDescriptionSnapshot,
      },
    };
    const viewModel: any = renderer.toVM(payload);
    const matchHtml = renderer.sum(viewModel);
    const quickHtml = renderer.qc(viewModel);
    const ctaHtml = renderer.cta(viewModel);
    const surfaces: SurfaceTexts = {
      career_verdict: section(matchHtml, "Career Verdict"),
      why_you: section(matchHtml, "Why You"),
      biggest_risk: section(matchHtml, "Biggest Risk"),
      what_this_role_adds: section(matchHtml, "What This Role Adds"),
      quick_checks: section(quickHtml, "Confirm One Key Fact"),
      cta: section(ctaHtml, "Recommended Action"),
    };

    const slot0: WhySlotAudit = {
      slot: "slot0",
      card_emitted: Boolean(slot0DiagRaw.card_emitted),
      selected_evidence_id: slot0DiagRaw.selected_evidence_id ? String(slot0DiagRaw.selected_evidence_id) : null,
      proof_summary: slot0Card?.proof_summary ? String(slot0Card.proof_summary) : "",
      headline: slot0Card?.headline ? String(slot0Card.headline) : "",
      assigned_buying_point: slot0DiagRaw.assigned_buying_point ? String(slot0DiagRaw.assigned_buying_point) : null,
      no_proof_gap: Boolean(slot0DiagRaw.no_proof_gap),
      omission_reason: slot0DiagRaw.omission_reason ? String(slot0DiagRaw.omission_reason) : null,
      no_proof_routing: Array.isArray(slot0DiagRaw.no_proof_routing) ? slot0DiagRaw.no_proof_routing.map((item: unknown) => String(item)) : [],
    };
    const slot1: WhySlotAudit = {
      slot: "slot1",
      card_emitted: Boolean(slot1DiagRaw.card_emitted),
      selected_evidence_id: slot1DiagRaw.selected_evidence_id ? String(slot1DiagRaw.selected_evidence_id) : null,
      proof_summary: slot1Card?.proof_summary ? String(slot1Card.proof_summary) : "",
      headline: slot1Card?.headline ? String(slot1Card.headline) : "",
      assigned_buying_point: slot1DiagRaw.assigned_buying_point ? String(slot1DiagRaw.assigned_buying_point) : null,
      no_proof_gap: Boolean(slot1DiagRaw.no_proof_gap),
      omission_reason: slot1DiagRaw.omission_reason ? String(slot1DiagRaw.omission_reason) : null,
      no_proof_routing: Array.isArray(slot1DiagRaw.no_proof_routing) ? slot1DiagRaw.no_proof_routing.map((item: unknown) => String(item)) : [],
    };

    const hasIntentionalNoProofSlot =
      benchmarkCase.human_verdict.why_you.slot0.expected_evidence_id_status === "intentional_no_proof_gap"
      || benchmarkCase.human_verdict.why_you.slot1.expected_evidence_id_status === "intentional_no_proof_gap";

    const careerScore = scoreCareerVerdict(benchmarkCase.human_verdict.career_verdict, surfaces.career_verdict);
    const slot0Eval = scoreSlot(caseId, "slot0", benchmarkCase.human_verdict.why_you.slot0, slot0);
    const slot1Eval = scoreSlot(caseId, "slot1", benchmarkCase.human_verdict.why_you.slot1, slot1);
    const riskEval = scoreBiggestRisk(benchmarkCase.human_verdict.biggest_risk, surfaces.biggest_risk);
    const quickScore = scoreIntent(benchmarkCase.human_verdict.quick_checks.expected_question_intent, surfaces.quick_checks);
    const roleAddsScore = scoreIntent(benchmarkCase.human_verdict.what_this_role_adds.expected_angle, surfaces.what_this_role_adds);
    const ctaEval = scoreCta(benchmarkCase.human_verdict.cta.expected_angle, surfaces.cta, hasIntentionalNoProofSlot);

    const contradictionSignals: string[] = [];
    const ctaNorm = normalize(surfaces.cta);
    const riskNorm = normalize(surfaces.biggest_risk);
    const verdictNorm = normalize(surfaces.career_verdict);
    if (/low priority|deprioritize/.test(ctaNorm) && /good fit|apply with/.test(verdictNorm)) contradictionSignals.push("verdict_cta_tension");
    if (/ready apply|apply confidently/.test(ctaNorm) && /(missing|limited|not proven|weak)/.test(riskNorm)) contradictionSignals.push("risk_cta_tension");
    if (slot0Eval.score === 0 || slot1Eval.score === 0) contradictionSignals.push("why_slot_misalignment");
    const crossSurfaceScore: Score = contradictionSignals.length >= 2 ? 0 : contradictionSignals.length === 1 ? 1 : 2;

    if (caseId === "15454" && benchmarkCase.human_verdict.why_you.slot1.expected_evidence_id_status === "intentional_no_proof_gap" && slot1.card_emitted) {
      hardGuardrailFailures.push({
        case: caseId,
        rule: "15454 slot1 intentional no-proof gap filled",
        details: `slot1 selected evidence ${slot1.selected_evidence_id ?? "null"}`,
      });
    }
    if (caseId === "13260" && benchmarkCase.human_verdict.why_you.slot0.expected_evidence_id_status === "intentional_no_proof_gap" && slot0.card_emitted) {
      hardGuardrailFailures.push({
        case: caseId,
        rule: "13260 slot0 intentional no-proof gap filled",
        details: `slot0 selected evidence ${slot0.selected_evidence_id ?? "null"}`,
      });
    }
    if (ctaEval.overclaim) {
      hardGuardrailFailures.push({
        case: caseId,
        rule: "CTA claims proof for intentional no-proof gap",
        details: surfaces.cta,
      });
    }
    if ((caseId === "15454" || caseId === "13260") && /proven financial crime|direct financial crime|proven cro experimentation|direct cro experimentation/.test(normalize(`${surfaces.why_you} ${surfaces.career_verdict} ${surfaces.biggest_risk} ${surfaces.cta}`))) {
      hardGuardrailFailures.push({
        case: caseId,
        rule: "Unsupported financial-crime/CRO experimentation proof claim",
        details: `${surfaces.why_you} | ${surfaces.career_verdict}`,
      });
    }
    if (replayMode !== "replay_readonly") {
      hardGuardrailFailures.push({
        case: caseId,
        rule: "replay_readonly not used",
        details: `reuse_context_mode=${replayMode || "missing"}`,
      });
    }
    if (!frozenApplied) {
      hardGuardrailFailures.push({
        case: caseId,
        rule: "frozen contract not applied",
        details: "selection_summary.replay_frozen_contract_applied=false",
      });
    }
    if (selectedRecomputed) {
      hardGuardrailFailures.push({
        case: caseId,
        rule: "selected IDs recomputed",
        details: expectedSelectedHash && actualSelectedHash
          ? `expected_hash=${expectedSelectedHash} actual_hash=${actualSelectedHash}`
          : `expected_ids=${expectedSelectedIds.join(",")} actual_ids=${selectedActual.join(",")}`,
      });
    }

    const scores: CaseScores = {
      career_verdict: careerScore,
      why_you_slot0: slot0Eval.score,
      why_you_slot1: slot1Eval.score,
      biggest_risk: riskEval.score,
      quick_checks: quickScore,
      role_adds: roleAddsScore,
      cta: ctaEval.score,
      cross_surface: crossSurfaceScore,
    };
    const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const caseHardFailures = hardGuardrailFailures.filter((item) => item.case === caseId);
    let verdict: Verdict;
    if (caseHardFailures.length > 0) {
      verdict = "RED";
    } else if (totalScore >= 13) {
      verdict = "GREEN";
    } else if (totalScore <= 7) {
      verdict = "RED";
    } else {
      verdict = "YELLOW";
    }

    const weakest = weakestSurface(scores);
    const issuePatterns = new Set<string>();
    const crossIssuePattern: CaseIssue["issue_pattern"] =
      crossSurfaceScore === 2
        ? "no_issue"
        : crossSurfaceScore === 0
          ? "cross_surface_hard_contradiction"
          : KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot0`) || KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot1`)
            ? "cross_surface_known_hold_residual"
            : slot0.no_proof_gap || slot1.no_proof_gap
              ? "cross_surface_gap_routing_watch"
              : contradictionSignals.length === 1
                ? "cross_surface_soft_story_drift"
                : "cross_surface_labeling_watch";

    const mainIssue = slot0Eval.issue.issue_pattern !== "no_issue"
      ? slot0Eval.issue.issue_pattern
      : slot1Eval.issue.issue_pattern !== "no_issue"
        ? slot1Eval.issue.issue_pattern
        : riskEval.issuePattern !== "no_issue"
          ? riskEval.issuePattern
          : quickScore === 0
            ? "quick_check_generic"
            : roleAddsScore === 0
              ? "role_adds_too_generic"
              : ctaEval.score === 0
                ? "cta_overclaims"
                : crossSurfaceScore === 0
                  ? "cross_surface_hard_contradiction"
                  : "no_issue";
    issuePatterns.add(mainIssue);

    issues.push(slot0Eval.issue);
    issues.push(slot1Eval.issue);
    issues.push({
      case: caseId,
      surface: "Career Verdict",
      expected_human_verdict: `${benchmarkCase.human_verdict.career_verdict.hiring_focus} | ${benchmarkCase.human_verdict.career_verdict.for_you}`,
      current_output_summary: surfaces.career_verdict || "(empty)",
      score: careerScore,
      issue_pattern: careerScore === 2 ? "no_issue" : "renderer_wording_issue",
      severity: careerScore === 0 ? "high" : careerScore === 1 ? "medium" : "low",
      recommended_owner: "layer4",
    });
    issues.push({
      case: caseId,
      surface: "Biggest Risk",
      expected_human_verdict: `${benchmarkCase.human_verdict.biggest_risk.expected_risk_type}: ${benchmarkCase.human_verdict.biggest_risk.human_reason}`,
      current_output_summary: surfaces.biggest_risk || "(empty)",
      score: riskEval.score,
      issue_pattern: riskEval.issuePattern,
      severity: riskEval.score === 0 ? "high" : riskEval.score === 1 ? "medium" : "low",
      recommended_owner: riskEval.score === 2 ? "benchmark" : "layer4",
    });
    issues.push({
      case: caseId,
      surface: "Quick Checks",
      expected_human_verdict: benchmarkCase.human_verdict.quick_checks.expected_question_intent,
      current_output_summary: surfaces.quick_checks || "(empty)",
      score: quickScore,
      issue_pattern: quickScore === 2 ? "no_issue" : "quick_check_generic",
      severity: quickScore === 0 ? "high" : "medium",
      recommended_owner: "layer4",
    });
    issues.push({
      case: caseId,
      surface: "What This Role Adds",
      expected_human_verdict: benchmarkCase.human_verdict.what_this_role_adds.expected_angle,
      current_output_summary: surfaces.what_this_role_adds || "(empty)",
      score: roleAddsScore,
      issue_pattern: roleAddsScore === 2 ? "no_issue" : "role_adds_too_generic",
      severity: roleAddsScore === 0 ? "high" : "medium",
      recommended_owner: "layer4",
    });
    issues.push({
      case: caseId,
      surface: "CTA",
      expected_human_verdict: benchmarkCase.human_verdict.cta.expected_angle,
      current_output_summary: surfaces.cta || "(empty)",
      score: ctaEval.score,
      issue_pattern: ctaEval.overclaim ? "cta_overclaims" : ctaEval.score === 2 ? "no_issue" : "cta_overclaims",
      severity: ctaEval.score === 0 ? "high" : "medium",
      recommended_owner: ctaEval.overclaim ? "layer3" : "layer4",
    });
    issues.push({
      case: caseId,
      surface: "Cross-surface consistency",
      expected_human_verdict: benchmarkCase.human_verdict.cross_surface.expected_thesis,
      current_output_summary: contradictionSignals.length > 0 ? contradictionSignals.join(", ") : "coherent",
      score: crossSurfaceScore,
      issue_pattern: crossIssuePattern,
      severity: crossSurfaceScore === 0 ? "high" : "medium",
      recommended_owner: "layer4",
    });

    const caseAudit: CaseAudit = {
      case: caseId,
      snapshot_id: smokeCase.snapshot_id,
      interaction_id: smokeCase.interaction_id,
      replay_readonly: replayMode === "replay_readonly",
      frozen_contract_applied: frozenApplied,
      selected_ids_recomputed: selectedRecomputed,
      selected_ids_hash_expected: expectedSelectedHash,
      selected_ids_hash_actual: actualSelectedHash,
      selected_ids_expected: expectedSelectedIds,
      selected_ids_actual: selectedActual,
      surfaces,
      why_you_slots: { slot0, slot1 },
      scores,
      issue_patterns: Array.from(issuePatterns),
      total_score: totalScore,
      verdict,
      weakest_surface: weakest,
      main_issue: mainIssue,
    };
    caseAudits.push(caseAudit);
  }

  const repeatedIssuePatterns = Array.from(
    issues.reduce<Map<string, number>>((acc, issue) => {
      if (issue.issue_pattern === "no_issue") return acc;
      acc.set(issue.issue_pattern, (acc.get(issue.issue_pattern) ?? 0) + 1);
      return acc;
    }, new Map()),
  )
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([pattern, count]) => ({ pattern, count }));

  const scoresAvg = surfaceAverages(caseAudits);
  const weakestSurfaceOverall = Object.entries(scoresAvg)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "unknown";
  const overall = {
    green: caseAudits.filter((item) => item.verdict === "GREEN").length,
    yellow: caseAudits.filter((item) => item.verdict === "YELLOW").length,
    red: caseAudits.filter((item) => item.verdict === "RED").length,
  };

  const caseTable: CaseSummaryRow[] = caseAudits.map((item) => ({
    case: item.case,
    career_verdict: item.scores.career_verdict,
    why_you_slot0: item.scores.why_you_slot0,
    why_you_slot1: item.scores.why_you_slot1,
    biggest_risk: item.scores.biggest_risk,
    quick_checks: item.scores.quick_checks,
    role_adds: item.scores.role_adds,
    cta: item.scores.cta,
    cross_surface: item.scores.cross_surface,
    total_score: item.total_score,
    verdict: item.verdict,
    weakest_surface: item.weakest_surface,
    main_issue: item.main_issue,
  }));

  const repairAdmissionRecommended = false;
  const exactNextTarget = null;
  const recommendedNextAction = "HOLD: keep replay_readonly baseline, treat this as full-sidepanel QA watch evidence, and route next work to product polish/benchmark review (no Why You deep-repair reopen).";

  const output = {
    decision_label: "AUDIT",
    mode: "FULL_SIDEPANEL_QA_AUDIT",
    replay_readonly_enforced_all: caseAudits.every((item) => item.replay_readonly),
    frozen_contract_applied_all: caseAudits.every((item) => item.frozen_contract_applied),
    selected_ids_recomputed_any: caseAudits.some((item) => item.selected_ids_recomputed),
    cases: caseAudits,
    case_table: caseTable,
    detailed_issue_table: issues,
    overall_green_yellow_red: overall,
    surface_scores: scoresAvg,
    hard_guardrail_failures: hardGuardrailFailures,
    repeated_issue_patterns: repeatedIssuePatterns,
    weakest_surface: weakestSurfaceOverall,
    repair_admission_recommended: repairAdmissionRecommended,
    exact_next_target_if_any: exactNextTarget,
    recommended_next_action: recommendedNextAction,
    metadata: {
      benchmark_fixture: BENCHMARK_PATH,
      smoke_source: SMOKE_PATH,
      generated_at: new Date().toISOString(),
      profile_id: DEFAULT_PROFILE_ID,
      case_ids: selectedCaseIds,
    },
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    out: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
    case_count: caseAudits.length,
    replay_readonly_enforced_all: output.replay_readonly_enforced_all,
    frozen_contract_applied_all: output.frozen_contract_applied_all,
    selected_ids_recomputed_any: output.selected_ids_recomputed_any,
    overall_green_yellow_red: overall,
    weakest_surface: weakestSurfaceOverall,
    hard_guardrail_failures: hardGuardrailFailures.length,
    repeated_issue_patterns: repeatedIssuePatterns,
    repair_admission_recommended: repairAdmissionRecommended,
  }, null, 2));
}

run().catch((error) => {
  console.error("[run-job-copilot-full-sidepanel-human-verdict-qa-audit] failed", error);
  process.exit(1);
});
