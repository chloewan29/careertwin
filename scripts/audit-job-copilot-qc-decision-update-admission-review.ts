import fs from "node:fs";
import path from "node:path";

type MicroIsolationArtifact = {
  first_drift_point?: string;
  first_writable_fault?: {
    label?: string;
    status?: string;
    surface?: string[];
  };
  micro_isolation_summary?: {
    owner_case?: string | null;
    guard_case?: string | null;
    owner_multisurface_signal?: boolean;
    guard_multisurface_signal?: boolean;
    owner_injection_pattern?: boolean;
    guard_injection_pattern?: boolean;
    owner_isolation_quality_improved?: boolean;
  };
  case_diagnostics?: Array<{
    case_id?: string;
    role?: "owner" | "guard";
    deltas?: {
      multi_surface_signal?: boolean;
    };
  }>;
};

type Args = {
  inputPaths: string[];
  outPath: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const readArg = (name: string): string | null => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };

  const inputsRaw =
    readArg("--inputs") ??
    [
      "artifacts/job-copilot-ns-quick-checks-generic-decision-update-multisurface-micro-isolation-audit.2026-04-13T23-57-26-359Z.json",
      "artifacts/job-copilot-ns-quick-checks-generic-decision-update-multisurface-micro-isolation-audit.2026-04-14T01-10-34-832Z.json",
    ].join(",");

  const outPath =
    readArg("--out") ??
    `artifacts/job-copilot-ns-quick-checks-generic-decision-update-admission-review.${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;

  const inputPaths = inputsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return { inputPaths, outPath };
}

function readJson<T>(target: string): T {
  const absolute = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
  return JSON.parse(fs.readFileSync(absolute, "utf8")) as T;
}

function main() {
  const args = parseArgs();
  const sources = args.inputPaths.map((value) => readJson<MicroIsolationArtifact>(value));
  const rows = sources.flatMap((source) => (Array.isArray(source.case_diagnostics) ? source.case_diagnostics : []));

  const ownerRows = rows.filter((row) => row.role === "owner");
  const ownerMultiRows = ownerRows.filter((row) => row?.deltas?.multi_surface_signal === true);
  const guardRows = rows.filter((row) => row.role === "guard");
  const guardCleanRows = guardRows.filter((row) => row?.deltas?.multi_surface_signal !== true);
  const ownerMultiCaseIds = Array.from(
    new Set(
      ownerMultiRows
        .map((row) => String(row.case_id ?? ""))
        .filter(Boolean),
    ),
  );
  const guardCaseIds = Array.from(
    new Set(
      guardRows
        .map((row) => String(row.case_id ?? ""))
        .filter(Boolean),
    ),
  );

  const narrowedCandidateReady = sources.every(
    (source) =>
      source?.micro_isolation_summary?.owner_isolation_quality_improved === true
      && source?.micro_isolation_summary?.owner_multisurface_signal === true
      && source?.micro_isolation_summary?.guard_multisurface_signal === false,
  );

  const crossOwnerEvidenceSufficient = ownerMultiCaseIds.length >= 2;
  const guardExclusionHolds = guardRows.length > 0 && guardCleanRows.length === guardRows.length;

  const repairAdmissionAllowed = narrowedCandidateReady && crossOwnerEvidenceSufficient && guardExclusionHolds;

  const allowedFiles = ["lib/career-engine/job-copilot/backend/job-copilot-service.ts"];
  const allowedChangeType =
    "narrow contract risk/consequence materialization update limited to answered-no weak-band injection path";
  const forbiddenScope = [
    "reopen kept CTA precedence repair surface",
    "reopen kept post-confidence materialization repair surface",
    "broader decision logic redesign",
    "matcher/runtime/scoring changes",
    "cross-layer contract redesign",
  ];
  const localGuardrails = [
    "stay within candidate lines 4557-4562 and 4575-4589",
    "preserve CTA precedence behavior",
    "owner+guard replay required",
    "default local verify remains npm run verify:daily",
  ];

  const result = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "bounded_admission_review",
    current_mode: "AUDIT",
    line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC-DECISION-UPDATE",
    first_drift_point:
      sources[0]?.first_drift_point
      ?? "stage_post_calibration_decision_impact_mixed_or_unstable",
    first_writable_fault: {
      label: sources[0]?.first_writable_fault?.label ?? "decision_impact_residual_not_yet_isolated",
      status: sources[0]?.first_writable_fault?.status ?? "not_isolated",
      surface:
        sources[0]?.first_writable_fault?.surface ??
        [
          "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4557-4562",
          "lib/career-engine/job-copilot/backend/job-copilot-service.ts:4575-4589",
        ],
    },
    admission_assessment: {
      owner_multi_surface_case_count: ownerMultiCaseIds.length,
      owner_case_count: ownerRows.length,
      guard_case_count: guardRows.length,
      guard_clean_count: guardCleanRows.length,
      narrowed_candidate_ready: narrowedCandidateReady,
      owner_multi_surface_case_ids: ownerMultiCaseIds,
      guard_case_ids: guardCaseIds,
      cross_owner_evidence_sufficient: crossOwnerEvidenceSufficient,
      guard_exclusion_holds: guardExclusionHolds,
      allowed_files_if_admitted: allowedFiles,
      allowed_change_type_if_admitted: allowedChangeType,
      forbidden_scope_if_admitted: forbiddenScope,
      local_guardrails_if_admitted: localGuardrails,
    },
    repair_admission_allowed: repairAdmissionAllowed,
    minimal_remaining_blocker: repairAdmissionAllowed
      ? "none"
      : "Cross-owner evidence and guard exclusion are not both closed yet for this mixed-family residual.",
    recommended_next_step: repairAdmissionAllowed
      ? "Transition to one bounded REPAIR on admitted micro-surface with declared guardrails."
      : "Run one bounded owner-expansion confirmation audit to seek stable cross-owner closure while keeping the same candidate surface and guard set.",
    governance: {
      memory_sync_required: false,
      memory_sync_targets: [],
    },
    source_artifacts: args.inputPaths.map((value) => (path.isAbsolute(value) ? value : path.join(process.cwd(), value))),
  };

  const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outPath,
        repair_admission_allowed: result.repair_admission_allowed,
        cross_owner_evidence_sufficient: result.admission_assessment.cross_owner_evidence_sufficient,
        owner_multi_surface_case_count: result.admission_assessment.owner_multi_surface_case_count,
        minimal_remaining_blocker: result.minimal_remaining_blocker,
      },
      null,
      2,
    ),
  );
}

main();
