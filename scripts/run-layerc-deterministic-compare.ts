import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type BaselineRow = {
  snapshot_id: number;
  job_title?: string | null;
};

type BaselineArtifact = {
  rows?: BaselineRow[];
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

type CaseSurface = {
  first_headline: string;
  why_line: string;
  shared_default_analytics_lead: boolean;
  subject_label: string;
  primary_frame: string;
  primary_axis: string;
  recommendation_state: string;
  why_you_0_generation_reason: string;
  why_you_1_generation_reason: string;
};

type FrozenCase = {
  snapshot_id: number;
  job_title: string;
  source_platform: "linkedin" | "seek";
  payload: Record<string, unknown>;
  frozen_surface: CaseSurface;
};

type FrozenPack = {
  schema_version: string;
  generated_at: string;
  generated_by: string;
  profile_id: string;
  baseline_source: string;
  snapshot_ids: number[];
  required_invariance_fields: string[];
  cases: FrozenCase[];
};

type CompareResult = {
  metric: string;
  schema_version: string;
  generated_at: string;
  generated_by: string;
  compare_source: string;
  frozen_pack_source: string;
  beforeCount: number;
  afterCount: number;
  improvedCases: number[];
  regressedCases: number[];
  subjectLabelChangedCases: number[];
  frameChangedCases: number[];
  primaryAxisChangedCases: number[];
  recommendationStateChangedCases: number[];
  missingInvariantFieldCases: Array<{ snapshot_id: number; missing_before: string[]; missing_after: string[] }>;
  deterministic_compare_stable: boolean;
  rows: Array<Record<string, unknown>>;
};

const DEFAULT_PROFILE = "8ec2c318-dbd0-42e2-acc7-10a103284b53";
const DEFAULT_BASELINE = "artifacts/job-copilot-final-output-audit.2026-04-09.layerc-controlled-ab.json";
const DEFAULT_PACK = "artifacts/job-copilot-final-output-audit.2026-04-09.layerc-frozen-pack.json";
const DEFAULT_OUT = "artifacts/job-copilot-final-output-audit.2026-04-09.layerc-deterministic-compare.current.json";
const REUSE_CONTEXT_MODE = "replay_readonly" as const;
const REQUIRED_INVARIANCE_FIELDS = [
  "subject_label",
  "primary_frame",
  "primary_axis",
  "recommendation_state",
  "why_you_0_generation_reason",
  "why_you_1_generation_reason",
] as const;

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

function arg(name: string): string | null {
  const args = process.argv.slice(2);
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function toAbs(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSharedDefaultAnalyticsLead(headline: string): boolean {
  const text = normalize(headline);
  if (!text) return false;
  return [
    /^advertising analytics\b/,
    /^insight generation reporting leadership\b/,
    /^governance risk and compliance analytics\b/,
    /^bi governance and reporting enablement\b/,
    /^analytics translation\b/,
  ].some((pattern) => pattern.test(text));
}

function createRenderer() {
  (globalThis as Record<string, unknown>).CareerTwinSharedUtils = {
    asArray: (v: unknown) => (Array.isArray(v) ? v : []),
    escapeHtml: (v: unknown) => String(v ?? ""),
  };
  const ctx = vm.createContext(globalThis as unknown as vm.Context);
  for (const file of [
    "extensions/job-copilot/sidepanel/render/render-match-view-model.js",
    "extensions/job-copilot/sidepanel/render/render-match-summary.js",
    "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
    "extensions/job-copilot/sidepanel/render/render-tailored-cv.js",
  ]) {
    const code = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    new vm.Script(code, { filename: file }).runInContext(ctx);
  }
  const g = globalThis as Record<string, any>;
  return {
    toVM: g.CareerTwinRenderMatchViewModel.toMatchPanelViewModel as (data: Record<string, unknown>) => Record<string, any>,
  };
}

function extractGenerationReason(payload: Record<string, unknown>, lineText: string | null, index: number): string {
  const diagnostics = payload.diagnostics && typeof payload.diagnostics === "object" ? payload.diagnostics as Record<string, unknown> : null;
  const insightDebug = diagnostics && diagnostics.insight_debug && typeof diagnostics.insight_debug === "object"
    ? diagnostics.insight_debug as Record<string, unknown>
    : null;
  const whyDebug = Array.isArray(insightDebug?.why_fit_debug) ? insightDebug?.why_fit_debug as Array<Record<string, unknown>> : [];
  if (lineText) {
    const exact = whyDebug.find((row) => asString(row.line_text) === lineText);
    if (exact) return asString(exact.generation_reason);
  }
  return asString(whyDebug[index]?.generation_reason);
}

function extractSurface(payload: Record<string, unknown>, viewModel: Record<string, any>): CaseSurface {
  const matchHeader = viewModel.matchHeader && typeof viewModel.matchHeader === "object"
    ? viewModel.matchHeader as Record<string, any>
    : {};
  const whyItems = Array.isArray(matchHeader.whyFitItems) ? matchHeader.whyFitItems as Array<Record<string, unknown>> : [];
  const firstWhy = whyItems[0] && typeof whyItems[0] === "object" ? whyItems[0] : {};
  const firstHeadline = asString(firstWhy.headline);
  const firstText = asString(firstWhy.text);
  const panelContract = matchHeader.panelJudgmentContract && typeof matchHeader.panelJudgmentContract === "object"
    ? matchHeader.panelJudgmentContract as Record<string, unknown>
    : {};
  const whyFit = Array.isArray(payload.whyFit) ? payload.whyFit as string[] : [];
  const whyLine0 = asString(whyFit[0]) || [firstHeadline, firstText].filter(Boolean).join(" ").trim();
  const whyLine1 = asString(whyFit[1]) || "";

  const subjectLabel = asString(panelContract.proof_alignment_subject_label) || asString(matchHeader.primaryAxisLabel);
  const primaryFrame = asString(panelContract.proof_alignment_subject_family);
  const primaryAxis = asString(matchHeader.primaryAxisKey) || asString(matchHeader.primaryAxisLabel);
  const recommendationState = asString(panelContract.recommendation_action_state)
    || asString(panelContract.recommendation_band)
    || asString(matchHeader.recommendationBand);

  return {
    first_headline: firstHeadline,
    why_line: whyLine0,
    shared_default_analytics_lead: isSharedDefaultAnalyticsLead(firstHeadline),
    subject_label: subjectLabel,
    primary_frame: primaryFrame,
    primary_axis: primaryAxis,
    recommendation_state: recommendationState,
    why_you_0_generation_reason: extractGenerationReason(payload, whyLine0 || null, 0),
    why_you_1_generation_reason: extractGenerationReason(payload, whyLine1 || null, 1),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function buildFrozenPack(params: {
  profileId: string;
  baselinePath: string;
  packPath: string;
}): Promise<FrozenPack> {
  const baseline = readJson<BaselineArtifact>(params.baselinePath);
  const baselineRows = Array.isArray(baseline.rows) ? baseline.rows : [];
  const snapshotIds = baselineRows.map((row) => Number(row.snapshot_id)).filter((v) => Number.isFinite(v));
  if (snapshotIds.length === 0) {
    throw new Error(`No baseline rows found in ${params.baselinePath}`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("job_snapshots")
    .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
    .in("job_snapshot_id", snapshotIds);
  if (error) throw new Error(error.message);
  const snapshots = (data ?? []) as SnapshotRow[];
  const snapshotById = new Map<number, SnapshotRow>(snapshots.map((row) => [row.job_snapshot_id, row]));
  const renderer = createRenderer();
  const cases: FrozenCase[] = [];

  for (const id of snapshotIds) {
    const snap = snapshotById.get(id);
    if (!snap) {
      throw new Error(`Snapshot ${id} missing from job_snapshots query.`);
    }
    const out = await analyzeJobForCopilot({
      profileId: params.profileId,
      source: snap.source_platform,
      jobUrl: snap.job_url ?? `https://layerc-harness.local/${snap.job_snapshot_id}`,
      jobTitle: snap.job_title ?? `Snapshot ${snap.job_snapshot_id}`,
      company: snap.company ?? null,
      location: snap.location ?? null,
      jobDescription: snap.job_description_raw ?? "",
      topEvidenceLimit: 4,
      reuseContextMode: REUSE_CONTEXT_MODE,
    });
    const payload = {
      ...out.response,
      job: {
        jobTitle: out.job.jobTitle,
        jobDescriptionSnapshot: out.job.jobDescriptionSnapshot,
      },
    } as Record<string, unknown>;
    const viewModel = renderer.toVM(payload);
    const frozenSurface = extractSurface(payload, viewModel);
    cases.push({
      snapshot_id: snap.job_snapshot_id,
      job_title: snap.job_title ?? `Snapshot ${snap.job_snapshot_id}`,
      source_platform: snap.source_platform,
      payload,
      frozen_surface: frozenSurface,
    });
  }

  const pack: FrozenPack = {
    schema_version: "layerc_frozen_semantic_pack.v1",
    generated_at: new Date().toISOString(),
    generated_by: "scripts/run-layerc-deterministic-compare.ts",
    profile_id: params.profileId,
    baseline_source: path.relative(process.cwd(), params.baselinePath).replace(/\\/g, "/"),
    snapshot_ids: snapshotIds,
    required_invariance_fields: [...REQUIRED_INVARIANCE_FIELDS],
    cases,
  };
  writeJson(params.packPath, pack);
  return pack;
}

function computeCompareRows(pack: FrozenPack): Omit<CompareResult, "generated_at" | "deterministic_compare_stable"> {
  const renderer = createRenderer();
  const rows: Array<Record<string, unknown>> = [];
  const improvedCases: number[] = [];
  const regressedCases: number[] = [];
  const subjectLabelChangedCases: number[] = [];
  const frameChangedCases: number[] = [];
  const primaryAxisChangedCases: number[] = [];
  const recommendationStateChangedCases: number[] = [];
  const missingInvariantFieldCases: Array<{ snapshot_id: number; missing_before: string[]; missing_after: string[] }> = [];
  let beforeCount = 0;
  let afterCount = 0;

  for (const item of pack.cases) {
    const before = item.frozen_surface;
    const vm = renderer.toVM(item.payload);
    const after = extractSurface(item.payload, vm);
    if (before.shared_default_analytics_lead) beforeCount += 1;
    if (after.shared_default_analytics_lead) afterCount += 1;

    const improved = before.shared_default_analytics_lead && !after.shared_default_analytics_lead;
    const regressed = !before.shared_default_analytics_lead && after.shared_default_analytics_lead;
    if (improved) improvedCases.push(item.snapshot_id);
    if (regressed) regressedCases.push(item.snapshot_id);

    if (before.subject_label !== after.subject_label) subjectLabelChangedCases.push(item.snapshot_id);
    if (before.primary_frame !== after.primary_frame) frameChangedCases.push(item.snapshot_id);
    if (before.primary_axis !== after.primary_axis) primaryAxisChangedCases.push(item.snapshot_id);
    if (before.recommendation_state !== after.recommendation_state) recommendationStateChangedCases.push(item.snapshot_id);

    const missingBefore = REQUIRED_INVARIANCE_FIELDS.filter((key) => !asString((before as Record<string, string>)[key]));
    const missingAfter = REQUIRED_INVARIANCE_FIELDS.filter((key) => !asString((after as Record<string, string>)[key]));
    if (missingBefore.length > 0 || missingAfter.length > 0) {
      missingInvariantFieldCases.push({
        snapshot_id: item.snapshot_id,
        missing_before: missingBefore,
        missing_after: missingAfter,
      });
    }

    rows.push({
      snapshot_id: item.snapshot_id,
      job_title: item.job_title,
      before_first_headline: before.first_headline,
      after_first_headline: after.first_headline,
      before_shared_lead: before.shared_default_analytics_lead,
      after_shared_lead: after.shared_default_analytics_lead,
      improved,
      regressed,
      subject_before: before.subject_label,
      subject_after: after.subject_label,
      frame_before: before.primary_frame,
      frame_after: after.primary_frame,
      primary_axis_before: before.primary_axis,
      primary_axis_after: after.primary_axis,
      recommendation_state_before: before.recommendation_state,
      recommendation_state_after: after.recommendation_state,
      before_why_line: before.why_line,
      after_why_line: after.why_line,
      why_you_0_generation_reason_before: before.why_you_0_generation_reason,
      why_you_0_generation_reason_after: after.why_you_0_generation_reason,
      why_you_1_generation_reason_before: before.why_you_1_generation_reason,
      why_you_1_generation_reason_after: after.why_you_1_generation_reason,
      why_you_0_generation_reason: after.why_you_0_generation_reason,
      why_you_1_generation_reason: after.why_you_1_generation_reason,
      career_verdict_primary_frame_key: after.primary_frame,
      career_verdict_primary_axis_key: after.primary_axis,
      authoritative_recommendation_band: after.recommendation_state,
    });
  }

  return {
    metric: "shared_default_analytics_leading_first_headline",
    schema_version: "layerc_deterministic_compare.v1",
    generated_by: "scripts/run-layerc-deterministic-compare.ts",
    compare_source: "frozen_pack_only",
    frozen_pack_source: "",
    beforeCount,
    afterCount,
    improvedCases,
    regressedCases,
    subjectLabelChangedCases,
    frameChangedCases,
    primaryAxisChangedCases,
    recommendationStateChangedCases,
    missingInvariantFieldCases,
    rows,
  };
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

async function run() {
  loadEnvLocal();
  const mode = (arg("--mode") ?? "both").toLowerCase();
  const profileId = arg("--profileId") ?? DEFAULT_PROFILE;
  const baselinePath = toAbs(arg("--baseline") ?? DEFAULT_BASELINE);
  const packPath = toAbs(arg("--pack") ?? DEFAULT_PACK);
  const outPath = toAbs(arg("--out") ?? DEFAULT_OUT);
  const runDeterminismTwice = hasFlag("--determinismTwice");

  let pack: FrozenPack;
  if (mode === "freeze" || mode === "both") {
    pack = await buildFrozenPack({ profileId, baselinePath, packPath });
  } else {
    pack = readJson<FrozenPack>(packPath);
  }

  if (mode === "freeze") {
    console.log(JSON.stringify({
      mode,
      pack: path.relative(process.cwd(), packPath).replace(/\\/g, "/"),
      cases: pack.cases.length,
      snapshot_ids: pack.snapshot_ids,
    }, null, 2));
    return;
  }

  const first = computeCompareRows(pack);
  first.frozen_pack_source = path.relative(process.cwd(), packPath).replace(/\\/g, "/");
  let deterministicStable = true;
  if (runDeterminismTwice) {
    const second = computeCompareRows(pack);
    second.frozen_pack_source = first.frozen_pack_source;
    deterministicStable = stableStringify(first) === stableStringify(second);
  }

  const result: CompareResult = {
    ...first,
    generated_at: new Date().toISOString(),
    deterministic_compare_stable: deterministicStable,
  };
  writeJson(outPath, result);

  console.log(JSON.stringify({
    mode,
    out: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
    frozen_pack: path.relative(process.cwd(), packPath).replace(/\\/g, "/"),
    beforeCount: result.beforeCount,
    afterCount: result.afterCount,
    improvedCases: result.improvedCases.length,
    regressedCases: result.regressedCases.length,
    subjectLabelChangedCases: result.subjectLabelChangedCases.length,
    recommendationStateChangedCases: result.recommendationStateChangedCases.length,
    missingInvariantFieldCases: result.missingInvariantFieldCases.length,
    deterministic_compare_stable: result.deterministic_compare_stable,
  }, null, 2));
}

run().catch((error) => {
  console.error("[run-layerc-deterministic-compare] failed", error);
  process.exit(1);
});
