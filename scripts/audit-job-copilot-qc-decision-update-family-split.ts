import fs from "node:fs";
import path from "node:path";

type RoutingCase = {
  case_id: string;
  deltas?: {
    confidence_changed?: boolean;
    cta_changed?: boolean;
    risk_surface_changed?: boolean;
    score_delta?: number;
    band_changed?: boolean;
    risk_hypothesis_changed?: boolean;
    risk_primary_gap_changed?: boolean;
  };
};

type RoutingArtifact = {
  line?: string;
  decision_label?: string;
  first_drift_point?: string;
  first_writable_fault?: {
    label?: string;
    surface?: string[];
  };
  case_diagnostics?: RoutingCase[];
};

type Args = {
  inputPath: string;
  outPath: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const readArg = (name: string): string | null => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };

  const inputPath =
    readArg("--input") ??
    "artifacts/job-copilot-ns-quick-checks-generic-decision-update-residual-routing-audit.2026-04-13T23-42-16-059Z.json";

  const outPath =
    readArg("--out") ??
    `artifacts/job-copilot-ns-quick-checks-generic-decision-update-family-split-audit.${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;

  return { inputPath, outPath };
}

function readJson<T>(target: string): T {
  const absolute = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
  return JSON.parse(fs.readFileSync(absolute, "utf8")) as T;
}

function uniqueIds(rows: RoutingCase[]): string[] {
  return Array.from(new Set(rows.map((row) => row.case_id)));
}

function safeBool(value: unknown): boolean {
  return value === true;
}

function scoreSlicePriority(params: {
  ownerCount: number;
  guardCount: number;
  structuralSignalCount: number;
}): number {
  return params.ownerCount * 3 + params.guardCount * 2 + params.structuralSignalCount;
}

function main() {
  const args = parseArgs();
  const source = readJson<RoutingArtifact>(args.inputPath);
  const rows = Array.isArray(source.case_diagnostics) ? source.case_diagnostics : [];

  const confidenceOnlyOwners = rows.filter((row) => {
    const d = row.deltas ?? {};
    return safeBool(d.confidence_changed) && !safeBool(d.cta_changed) && !safeBool(d.risk_surface_changed);
  });

  const ctaShiftOwners = rows.filter((row) => {
    const d = row.deltas ?? {};
    return !safeBool(d.confidence_changed) && safeBool(d.cta_changed) && !safeBool(d.risk_surface_changed);
  });

  const multiSurfaceOwners = rows.filter((row) => {
    const d = row.deltas ?? {};
    return safeBool(d.confidence_changed) && (safeBool(d.cta_changed) || safeBool(d.risk_surface_changed));
  });

  const neutralGuards = rows.filter((row) => {
    const d = row.deltas ?? {};
    return !safeBool(d.confidence_changed) && !safeBool(d.cta_changed) && !safeBool(d.risk_surface_changed);
  });

  const confidencePriorityScore = scoreSlicePriority({
    ownerCount: confidenceOnlyOwners.length,
    guardCount: neutralGuards.length,
    structuralSignalCount: confidenceOnlyOwners.filter((row) => safeBool(row?.deltas?.band_changed)).length,
  });

  const ctaShiftPriorityScore = scoreSlicePriority({
    ownerCount: ctaShiftOwners.length,
    guardCount: neutralGuards.length,
    structuralSignalCount: ctaShiftOwners.filter((row) => (row?.deltas?.score_delta ?? 0) !== 0).length,
  });

  const multiSurfacePriorityScore = scoreSlicePriority({
    ownerCount: multiSurfaceOwners.length,
    guardCount: neutralGuards.length,
    structuralSignalCount: multiSurfaceOwners.filter(
      (row) => safeBool(row?.deltas?.risk_hypothesis_changed) || safeBool(row?.deltas?.risk_primary_gap_changed),
    ).length,
  });

  const sliceScores = [
    { name: "confidence_only_family", score: confidencePriorityScore },
    { name: "cta_shift_family", score: ctaShiftPriorityScore },
    { name: "multi_surface_family", score: multiSurfacePriorityScore },
  ];
  sliceScores.sort((left, right) => right.score - left.score);
  const isolationPrioritySlice = sliceScores[0]?.name ?? "confidence_only_family";

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_owner_guard_family_split_audit",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    source_artifact: path.isAbsolute(args.inputPath) ? args.inputPath : path.join(process.cwd(), args.inputPath),
    first_drift_point: "stage_post_calibration_decision_impact_mixed_or_unstable",
    first_writable_fault: {
      status: "not_isolated",
      label: "decision_impact_residual_not_yet_isolated",
      surface: ["lib/career-engine/job-copilot/backend/job-copilot-service.ts:4486-4860"],
    },
    family_split_result: {
      confidence_only_family: {
        owner_cases: uniqueIds(confidenceOnlyOwners),
        guard_cases: uniqueIds(neutralGuards),
        owner_count: confidenceOnlyOwners.length,
        guard_count: neutralGuards.length,
      },
      cta_shift_family: {
        owner_cases: uniqueIds(ctaShiftOwners),
        guard_cases: uniqueIds(neutralGuards),
        owner_count: ctaShiftOwners.length,
        guard_count: neutralGuards.length,
      },
      multi_surface_family: {
        owner_cases: uniqueIds(multiSurfaceOwners),
        guard_cases: uniqueIds(neutralGuards),
        owner_count: multiSurfaceOwners.length,
        guard_count: neutralGuards.length,
      },
      unsplit_or_other_cases: uniqueIds(
        rows.filter(
          (row) =>
            !confidenceOnlyOwners.some((c) => c.case_id === row.case_id) &&
            !ctaShiftOwners.some((c) => c.case_id === row.case_id) &&
            !multiSurfaceOwners.some((c) => c.case_id === row.case_id) &&
            !neutralGuards.some((c) => c.case_id === row.case_id),
        ),
      ),
    },
    owner_isolation_priority: {
      selected_slice: isolationPrioritySlice,
      confidence_only_priority_score: confidencePriorityScore,
      cta_shift_priority_score: ctaShiftPriorityScore,
      multi_surface_priority_score: multiSurfacePriorityScore,
      rationale:
        isolationPrioritySlice === "multi_surface_family"
          ? "Multi-surface slice preserves a stronger structural signal beyond confidence movement, so it has higher owner-isolation leverage."
          : isolationPrioritySlice === "cta_shift_family"
            ? "CTA-shift family currently has the strongest owner concentration in this bounded set and should be narrowed first."
          : "Confidence-only slice currently has better owner/guard separation and should be narrowed first.",
    },
    repair_admission_allowed: false,
    minimal_remaining_blocker:
      ctaShiftOwners.length >= 2
        ? "CTA-shift family has owner concentration, but first writable micro-surface inside CTA update path is still not isolated."
        : "Family split is explicit, but owner evidence remains too thin for stable first writable micro-owner closure.",
    recommended_next_step:
      isolationPrioritySlice === "multi_surface_family"
        ? "Run one bounded owner+guard micro-isolation audit on the multi-surface family (risk/consequence path) without reopening kept repairs."
        : isolationPrioritySlice === "cta_shift_family"
          ? "Run one bounded owner+guard micro-isolation audit on CTA-shift family (CTA update path) without reopening kept repairs."
        : "Run one bounded owner+guard micro-isolation audit on the confidence-only family without reopening kept repairs.",
    governance: {
      memory_sync_required: false,
      memory_sync_targets: [],
    },
  };

  const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outPath,
        confidence_only_owner_cases: result.family_split_result.confidence_only_family.owner_cases,
        cta_shift_owner_cases: result.family_split_result.cta_shift_family.owner_cases,
        multi_surface_owner_cases: result.family_split_result.multi_surface_family.owner_cases,
        selected_slice: result.owner_isolation_priority.selected_slice,
        repair_admission_allowed: result.repair_admission_allowed,
      },
      null,
      2,
    ),
  );
}

main();
