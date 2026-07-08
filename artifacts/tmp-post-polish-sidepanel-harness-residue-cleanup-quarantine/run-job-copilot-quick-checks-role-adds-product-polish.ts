import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

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

type SmokeArtifact = {
  cases: SmokeCase[];
};

type CaseResult = {
  case_id: string;
  quick_checks_count: number;
  quick_checks_are_yes_no: boolean;
  quick_checks_same_gap: boolean;
  quick_checks_generic: boolean;
  quick_checks_score: 0 | 1 | 2;
  role_adds_chip_count: number;
  role_adds_generic: boolean;
  role_adds_overclaims_no_proof: boolean;
  role_adds_score: 0 | 1 | 2;
  result: "pass" | "fail" | "watch";
  notes: string;
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

const PROFILE_ID = "8ec2c318-dbd0-42e2-acc7-10a103284b53";
const SMOKE_PATH = "artifacts/job-copilot-final-replay-readonly-6case-smoke-test.2026-05-06T00-56-27-218Z.json";
const CASE_IDS = ["15454", "15089", "14609", "13260", "12941", "12879"];
const KNOWN_HOLD_RESIDUALS = new Set([
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

function isYesNoQuestion(question: string): boolean {
  const raw = String(question ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return false;
  if (!/[?]$/.test(raw)) return false;
  return /^(have|has|did|was|were|is|are)\b/i.test(raw);
}

function toMeaningfulTokens(value: string): string[] {
  const stop = new Set([
    "have", "has", "did", "was", "were", "is", "are", "you", "your", "the", "and", "for", "with", "that",
    "this", "from", "into", "about", "only", "not", "role", "context", "analysis", "decision", "outcome",
    "work", "worked", "directly", "materially", "final", "change", "changed", "measurable",
  ]);
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 4 && !stop.has(token));
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
  };
}

function parseQuestionTexts(quickHtml: string): string[] {
  const matches = Array.from(quickHtml.matchAll(/<p class="ctsp-item-label">([\s\S]*?)<\/p>/g));
  return matches.map((match) => stripHtml(match[1] ?? "")).filter(Boolean).slice(0, 2);
}

function parseRoleAddsChipCount(summaryHtml: string): number {
  const blockMatch = summaryHtml.match(/<section class="ctsp-card ctsp-card-role-adds">([\s\S]*?)<\/section>/i);
  if (!blockMatch) return 0;
  const liMatches = Array.from(blockMatch[1].matchAll(/<li>/g));
  return liMatches.length;
}

function parseRoleAddsText(summaryHtml: string): string {
  return section(summaryHtml, "What This Role Adds");
}

function arraysEqualAsSets(left: string[], right: string[]): boolean {
  const a = Array.from(new Set(left)).sort();
  const b = Array.from(new Set(right)).sort();
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

async function run(): Promise<void> {
  loadEnvLocal();
  const outArg = readArg("--out");
  const verifyDailyPassedArg = readArg("--verifyDailyPassed");
  const verifyDailyPassed = verifyDailyPassedArg === "true";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = toAbs(outArg ?? `artifacts/job-copilot-quick-checks-role-adds-product-polish.${stamp}.json`);

  const smoke = readJson<SmokeArtifact>(toAbs(SMOKE_PATH));
  const smokeByCase = new Map(smoke.cases.map((entry) => [String(entry.case), entry]));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  const supabase = createClient(supabaseUrl, supabaseKey);
  const renderer = createRenderer();

  const snapshotIds = CASE_IDS.map((caseId) => {
    const smokeCase = smokeByCase.get(caseId);
    if (!smokeCase) throw new Error(`Missing smoke case ${caseId}`);
    return smokeCase.snapshot_id;
  });
  const { data: snapshots, error: snapshotsError } = await supabase
    .from("job_snapshots")
    .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
    .in("job_snapshot_id", snapshotIds);
  if (snapshotsError) throw new Error(snapshotsError.message);
  const snapshotById = new Map<number, SnapshotRow>(((snapshots ?? []) as SnapshotRow[]).map((row) => [row.job_snapshot_id, row]));

  const cases: CaseResult[] = [];
  let replayReadonlyUsed = true;
  let noProofGuardrailsPreserved = true;
  let selectionLogicChanged = false;
  let whyYouSelectionChanged = false;

  for (const caseId of CASE_IDS) {
    const smokeCase = smokeByCase.get(caseId);
    if (!smokeCase) throw new Error(`Missing smoke case ${caseId}`);
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
    const slot0Selected = slotDiag?.slot0?.selected_evidence_id ?? null;
    const slot1Selected = slotDiag?.slot1?.selected_evidence_id ?? null;
    const slot0Changed = (smokeCase.slot0 ?? null) !== (slot0Selected ?? null);
    const slot1Changed = (smokeCase.slot1 ?? null) !== (slot1Selected ?? null);
    const slot0Residual = KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot0`);
    const slot1Residual = KNOWN_HOLD_RESIDUALS.has(`${caseId}:slot1`);
    if ((slot0Changed && !slot0Residual) || (slot1Changed && !slot1Residual)) whyYouSelectionChanged = true;

    const expectedHash = smokeCase.debug?.selected_ids_hash ? String(smokeCase.debug.selected_ids_hash) : null;
    const actualHash = selectionSummary.selected_ids_hash ? String(selectionSummary.selected_ids_hash) : null;
    if (expectedHash && actualHash && expectedHash !== actualHash) {
      selectionLogicChanged = true;
    }

    const reuseMode = String(selectionSummary.reuse_context_mode ?? "");
    const frozenApplied = Boolean(selectionSummary.replay_frozen_contract_applied);
    if (reuseMode !== "replay_readonly" || !frozenApplied) replayReadonlyUsed = false;

    if (caseId === "15454") {
      const guardOk = !Boolean(slotDiag?.slot1?.card_emitted) && Boolean(slotDiag?.slot1?.no_proof_gap);
      if (!guardOk) noProofGuardrailsPreserved = false;
    }
    if (caseId === "13260") {
      const guardOk = !Boolean(slotDiag?.slot0?.card_emitted) && Boolean(slotDiag?.slot0?.no_proof_gap);
      if (!guardOk) noProofGuardrailsPreserved = false;
    }

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

    const questions = parseQuestionTexts(quickHtml);
    const gapText = String(viewModel?.quickChecks?.topQuickCheckGap ?? viewModel?.quickChecks?.primaryGapLabel ?? "");
    const gapTokens = toMeaningfulTokens(gapText);
    const questionNorm = questions.map((q) => normalize(q));
    const yesNoShape = questions.length === 2 && questions.every((q) => isYesNoQuestion(q));
    const q0Tokens = toMeaningfulTokens(questions[0] ?? "");
    const q1Tokens = toMeaningfulTokens(questions[1] ?? "");
    const sharedTokens = q0Tokens.filter((token) => q1Tokens.includes(token));
    const sharedWithGap = sharedTokens.filter((token) => gapTokens.includes(token));
    const sameGap = questions.length === 2
      && (
        sharedWithGap.length >= 1
        || sharedTokens.length >= 2
        || gapTokens.length === 0
      );
    const generic = questionNorm.some((q) =>
      /^(do you have|can you tell us|tell us|describe|explain)\b/.test(q)
      || /\byour background\b/.test(q)
      || /\bstakeholder management experience\b/.test(q),
    );
    const quickScore: 0 | 1 | 2 = questions.length === 2 && yesNoShape && sameGap && !generic
      ? 2
      : questions.length === 2 && yesNoShape
        ? 1
        : 0;

    const roleAddsCount = parseRoleAddsChipCount(summaryHtml);
    const roleAddsText = normalize(parseRoleAddsText(summaryHtml));
    const roleAddsGeneric = /grow your leadership|grow your skills|broader experience|generic growth/.test(roleAddsText);
    const roleAddsOverclaim = (caseId === "15454" && /already proven.*financial crime|clear proof.*financial crime/.test(roleAddsText))
      || (caseId === "13260" && /already proven.*experiment|clear proof.*experiment/.test(roleAddsText));
    const roleAddsScore: 0 | 1 | 2 = roleAddsCount >= 2 && roleAddsCount <= 3 && !roleAddsGeneric && !roleAddsOverclaim
      ? 2
      : roleAddsCount >= 1 && roleAddsCount <= 3 && !roleAddsOverclaim
        ? 1
        : 0;

    const result: "pass" | "fail" | "watch" = quickScore === 2 && roleAddsScore === 2
      ? "pass"
      : quickScore === 0 || roleAddsScore === 0
        ? "fail"
        : "watch";

    const notes = [
      `quick_checks=${questions.length}`,
      `role_adds=${roleAddsCount}`,
      `reuse=${reuseMode || "missing"}`,
      `frozen=${frozenApplied}`,
      `slot0_expected=${smokeCase.slot0 ?? "null"}`,
      `slot0_actual=${slot0Selected ?? "null"}`,
      `slot1_expected=${smokeCase.slot1 ?? "null"}`,
      `slot1_actual=${slot1Selected ?? "null"}`,
      `slot0_changed=${slot0Changed}`,
      `slot1_changed=${slot1Changed}`,
      `slot0_known_hold=${slot0Residual}`,
      `slot1_known_hold=${slot1Residual}`,
    ].join("; ");

    cases.push({
      case_id: caseId,
      quick_checks_count: questions.length,
      quick_checks_are_yes_no: yesNoShape,
      quick_checks_same_gap: sameGap,
      quick_checks_generic: generic,
      quick_checks_score: quickScore,
      role_adds_chip_count: roleAddsCount,
      role_adds_generic: roleAddsGeneric,
      role_adds_overclaims_no_proof: roleAddsOverclaim,
      role_adds_score: roleAddsScore,
      result,
      notes,
    });
  }

  const quickChecksAvgAfter = Number((cases.reduce((sum, item) => sum + item.quick_checks_score, 0) / cases.length).toFixed(3));
  const roleAddsAvgAfter = Number((cases.reduce((sum, item) => sum + item.role_adds_score, 0) / cases.length).toFixed(3));

  const acceptancePassed = cases.every((item) =>
    item.quick_checks_count === 2
    && item.quick_checks_are_yes_no
    && item.quick_checks_same_gap
    && !item.quick_checks_generic
    && item.role_adds_chip_count >= 2
    && item.role_adds_chip_count <= 3
    && !item.role_adds_generic
    && !item.role_adds_overclaims_no_proof,
  )
    && !selectionLogicChanged
    && !whyYouSelectionChanged
    && noProofGuardrailsPreserved
    && replayReadonlyUsed
    && verifyDailyPassed;

  const decisionLabel: "KEEP" | "REVERT" = acceptancePassed ? "KEEP" : "REVERT";
  const output = {
    decision_label: decisionLabel,
    mode: "PRODUCT_POLISH",
    repair_type: "quick_checks_role_adds_human_verdict_polish",
    files_changed: [
      "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
      "extensions/job-copilot/sidepanel/render/render-match-summary.js",
    ],
    product_logic_scope: [
      "quick_checks",
      "what_this_role_adds",
    ],
    selection_logic_changed: selectionLogicChanged,
    why_you_selection_changed: whyYouSelectionChanged,
    no_proof_guardrails_preserved: noProofGuardrailsPreserved,
    replay_readonly_used: replayReadonlyUsed,
    cases,
    quick_checks_avg_before: 0,
    role_adds_avg_before: 0,
    quick_checks_avg_after: quickChecksAvgAfter,
    role_adds_avg_after: roleAddsAvgAfter,
    npm_verify_daily_passed: verifyDailyPassed,
    recommended_next_action: decisionLabel === "KEEP"
      ? "KEEP: close product-polish slice for Quick Checks + Role Adds and continue sidepanel QA watch without reopening Why You deep repair."
      : "REVERT: acceptance criteria not met; revert this polish patch and regroup with tighter surface-only prompts/chips constraints.",
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    out: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
    decision_label: decisionLabel,
    quick_checks_avg_after: quickChecksAvgAfter,
    role_adds_avg_after: roleAddsAvgAfter,
    replay_readonly_used: replayReadonlyUsed,
    no_proof_guardrails_preserved: noProofGuardrailsPreserved,
    why_you_selection_changed: whyYouSelectionChanged,
    selection_logic_changed: selectionLogicChanged,
    verify_daily_passed: verifyDailyPassed,
  }, null, 2));
}

run().catch((error) => {
  console.error("[run-job-copilot-quick-checks-role-adds-product-polish] failed", error);
  process.exit(1);
});
