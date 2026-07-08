import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { getCapabilityMatchV2 } from "@/lib/career-engine/matching/capability-match-v2";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";
import { buildTailoringPlanForCv } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import type { TailoringPlanSelectionDebugItem } from "@/lib/career-engine/copilot/resume-copilot/resume-tailoring-plan";
import type { ConfirmationRescoreBridge } from "@/lib/career-engine/job-copilot/strong-match-escalation";

type FixtureJob = {
  id: string;
  title: string;
  company?: string | null;
  job_description: string;
};

type Fixture = {
  version: string;
  jobs: FixtureJob[];
};

type ScriptArgs = {
  profileId: string;
  fixturePath: string;
  stageTracePath: string;
  selectorTracePath: string;
  outPath: string;
  caseIds: string[];
};

type EvidencePiece = {
  id: string;
  experience_id: string;
  raw_text?: string | null;
  source_type?: string | null;
  inferred_scope?: unknown;
};

const QUICK_CHECK_CONTEXT_SIGNATURE_REGEX = /context:\s*[\s\S]{0,220}?requirement\s+for\s+/i;

const A1_SUPPRESSION_REASONS = new Set([
  "selection_limits_exceeded",
  "manual_quick_check_cap_reached",
  "manual_quick_check_not_context_aligned",
  "manual_quick_check_low_alignment",
  "manual_quick_check_low_specificity",
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

function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const readArg = (name: string): string | null => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };
  return {
    profileId: readArg("--profileId") ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
    fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
    stageTracePath: readArg("--stageTrace")
      ?? "artifacts/tailored-cv-behavior-audit-role-family.p0-027-pre-rewriter-composition-stage-trace.2026-04-10.json",
    selectorTracePath: readArg("--selectorTrace")
      ?? "artifacts/tailored-cv-behavior-audit-role-family.p0-027-branchA-selector-cluster-internal-trace.2026-04-10.json",
    outPath: readArg("--out")
      ?? "artifacts/tailored-cv-behavior-audit-role-family.p0-027-branchA-A1-suppression-owner-judgment.2026-04-10.json",
    caseIds: (readArg("--caseIds") ?? "job-10,job-18").split(",").map((v) => v.trim()).filter(Boolean),
  };
}

function readJson<T>(filePath: string): T {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(absolute, "utf8")) as T;
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveConfirmedFromEvidence(piece: EvidencePiece): boolean {
  const inferredScope = toObjectRecord(piece.inferred_scope);
  if (!inferredScope) return false;
  if (inferredScope.source === "quick_check_confirmation") return true;
  const quickCheck = toObjectRecord(inferredScope.quick_check);
  return Boolean(quickCheck?.question_id);
}

function resolveLegacyQuickCheckSuppressionRecord(piece: EvidencePiece): Record<string, unknown> | null {
  const inferredScope = toObjectRecord(piece.inferred_scope);
  const legacy = inferredScope ? toObjectRecord(inferredScope.legacy_quick_check) : null;
  return legacy;
}

function isManualQuickCheckEvidencePiece(piece: EvidencePiece): boolean {
  const rawText = typeof piece.raw_text === "string" ? piece.raw_text : "";
  const hasLegacyContextSignature = QUICK_CHECK_CONTEXT_SIGNATURE_REGEX.test(rawText);
  const inferredScope = toObjectRecord(piece.inferred_scope);
  const quickCheckScope = inferredScope && (
    inferredScope.source === "quick_check_confirmation"
    || Boolean(toObjectRecord(inferredScope.quick_check)?.question_id)
  );
  if (!quickCheckScope && !hasLegacyContextSignature) return false;
  if (piece.source_type === "manual") return true;
  return hasLegacyContextSignature || resolveConfirmedFromEvidence(piece) || Boolean(resolveLegacyQuickCheckSuppressionRecord(piece));
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key);
}

async function resolveCareerId(profileId: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("careers")
    .select("id")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.[0]?.id) {
    throw new Error(`Failed to resolve career for profile ${profileId}: ${error?.message ?? "not found"}`);
  }
  return data[0].id as string;
}

async function ensureDebugJob(fixtureJob: FixtureJob): Promise<string> {
  const supabase = getSupabaseClient();
  const externalSource = "debug_p0_027_a1_owner_trace";
  const externalId = `fixture:${fixtureJob.id}`;
  const { data: upserted, error: upsertError } = await supabase
    .from("jobs")
    .upsert(
      {
        external_source: externalSource,
        external_id: externalId,
        title: fixtureJob.title,
        company: fixtureJob.company ?? "Validation Fixture",
        location: null,
        description: fixtureJob.job_description,
        job_url: null,
      },
      { onConflict: "external_source,external_id" },
    )
    .select("id")
    .limit(1);
  if (upsertError || !upserted?.[0]?.id) {
    throw new Error(`Failed to upsert debug job ${fixtureJob.id}: ${upsertError?.message ?? "missing id"}`);
  }
  const jobId = upserted[0].id as string;

  const signals = buildJobSignalsFromRawJd({
    rawJd: fixtureJob.job_description,
    fallbackTitle: fixtureJob.title,
  });
  const { error: signalError } = await supabase
    .from("job_signals")
    .upsert(
      {
        job_id: jobId,
        target_title: signals.target_title,
        role_family: signals.role_family,
        seniority: signals.seniority,
        required_skills: signals.required_skills,
        preferred_skills: signals.preferred_skills,
        responsibilities: signals.responsibilities,
        domains: signals.domains,
        keywords: signals.keywords,
      },
      { onConflict: "job_id" },
    );
  if (signalError) {
    throw new Error(`Failed to upsert job_signals for ${fixtureJob.id}: ${signalError.message}`);
  }

  return jobId;
}

function deriveContrastAnchors(stageTracePath: string): string[] {
  const stageTrace = readJson<Record<string, unknown>>(stageTracePath);
  const caseReports = Array.isArray(stageTrace.case_reports) ? stageTrace.case_reports as Array<Record<string, unknown>> : [];
  const contrast = caseReports.find((entry) => entry.case_id === "job-03");
  if (!contrast) return [];
  const stage1 = Array.isArray(contrast.stage1_lead_experience_selected_evidence)
    ? contrast.stage1_lead_experience_selected_evidence as Array<Record<string, unknown>>
    : [];
  return stage1
    .filter((item) => item.classification === "non_shared" && typeof item.evidence_id === "string")
    .map((item) => item.evidence_id as string);
}

function deriveSelectorTraceAnchors(selectorTracePath: string): string[] {
  const selectorTrace = readJson<Record<string, unknown>>(selectorTracePath);
  const ids = Array.isArray(selectorTrace.non_shared_anchor_ids)
    ? selectorTrace.non_shared_anchor_ids.filter((item): item is string => typeof item === "string")
    : [];
  return ids;
}

function toMicroOwner(params: {
  reason: string | null;
  selectionLimitSubtype: string | null;
}): string | null {
  const reason = params.reason;
  if (!reason) return null;
  if (reason === "selection_limits_exceeded") {
    const subtype = params.selectionLimitSubtype ?? "unresolved_selection_limit_subtype";
    return `selection_limit_accounting.${subtype}`;
  }
  if (reason === "manual_quick_check_not_context_aligned") {
    return "manual_quick_check_reservation.context_alignment_guard";
  }
  if (reason === "manual_quick_check_cap_reached") {
    return "manual_quick_check_reservation.cap_guard";
  }
  if (reason === "manual_quick_check_low_alignment") {
    return "manual_quick_check_reservation.alignment_floor_guard";
  }
  if (reason === "manual_quick_check_low_specificity") {
    return "manual_quick_check_reservation.specificity_floor_guard";
  }
  return null;
}

async function run(): Promise<void> {
  loadEnvLocal();
  process.env.ENABLE_RESUME_TAILORING_CANONICAL_ONLY = "1";

  const args = parseArgs();
  const fixture = readJson<Fixture>(args.fixturePath);
  const fixtureById = new Map(fixture.jobs.map((job) => [job.id, job]));
  const selectedJobs = args.caseIds.map((id) => fixtureById.get(id)).filter(Boolean) as FixtureJob[];
  if (selectedJobs.length !== args.caseIds.length) {
    const found = new Set(selectedJobs.map((job) => job.id));
    const missing = args.caseIds.filter((id) => !found.has(id));
    throw new Error(`Missing fixture case ids: ${missing.join(", ")}`);
  }

  const contrastAnchors = Array.from(new Set([
    ...deriveContrastAnchors(args.stageTracePath),
    ...deriveSelectorTraceAnchors(args.selectorTracePath),
  ]));
  if (contrastAnchors.length === 0) {
    throw new Error("No non-shared contrast anchors resolved from stage trace");
  }

  const careerId = await resolveCareerId(args.profileId);
  const careerGraph: any = await loadCareerGraph(args.profileId);
  const evidenceById = new Map<string, EvidencePiece>();
  const evidencePieces = Array.isArray(careerGraph.evidencePieces) ? careerGraph.evidencePieces as EvidencePiece[] : [];
  for (const piece of evidencePieces) {
    evidenceById.set(piece.id, piece);
  }

  const noConfirmationBridge: ConfirmationRescoreBridge = {
    resolved_cluster_ids: [],
    resolved_critical_cluster_ids: [],
    ownership_confirmation: false,
    decision_impact_confirmation: false,
    measurement_confirmation: false,
    capability_score_boost: 0,
    evidence_score_boost: 0,
    requirement_overlap_credit: 0,
    matched_signal_credit: 0,
    specialization_confirmation: false,
  };

  const caseAnalyses: Array<Record<string, unknown>> = [];

  for (const fixtureJob of selectedJobs) {
    const jobId = await ensureDebugJob(fixtureJob);
    const capabilityMatch = await getCapabilityMatchV2({
      careerId,
      profileId: args.profileId,
      jobDescription: fixtureJob.job_description,
      jobTitleHint: fixtureJob.title,
      topSignalsLimit: 4,
    });

    const plan = buildTailoringPlanForCv({
      jobId,
      capabilityMatch,
      careerGraph,
      jdRoleStructureContract: null,
      confirmationBridge: noConfirmationBridge,
      confirmedStrengthAreas: [],
      positioningHints: [],
    });

    const debugRows = (plan.selection_debug?.selected_evidence_debug ?? plan.selection_debug?.selected_evidence ?? []) as TailoringPlanSelectionDebugItem[];
    const selectedExperienceDistribution = new Map<string, number>();
    for (const item of plan.selection_debug?.selection_summary?.experience_distribution ?? []) {
      selectedExperienceDistribution.set(item.experience_id, item.selected_count);
    }

    const anchorRows = contrastAnchors.map((anchorId) => {
      const row = debugRows.find((item) => item.evidence_id === anchorId);
      const reason = row?.suppressed_reason ?? null;
      const evidence = evidenceById.get(anchorId) ?? null;
      const experienceId = evidence?.experience_id ?? null;
      const selectedCountForExperience = experienceId ? (selectedExperienceDistribution.get(experienceId) ?? 0) : 0;
      const experienceInSelectedSet = experienceId ? selectedExperienceDistribution.has(experienceId) : false;

      let selectionLimitSubtype: string | null = null;
      if (reason === "selection_limits_exceeded") {
        if (experienceId && selectedCountForExperience >= plan.limits.max_bullets_per_experience) {
          selectionLimitSubtype = "per_experience_bullet_cap";
        } else if (experienceId && !experienceInSelectedSet && selectedExperienceDistribution.size >= plan.limits.max_experiences) {
          selectionLimitSubtype = "experience_slot_cap";
        } else {
          selectionLimitSubtype = "unresolved_selection_limit_subtype";
        }
      }

      const inScopeA1 = Boolean(reason && A1_SUPPRESSION_REASONS.has(reason));
      const microOwner = inScopeA1 ? toMicroOwner({ reason, selectionLimitSubtype }) : null;

      return {
        anchor_evidence_id: anchorId,
        selected: row?.selected ?? null,
        selected_reason: row?.selected_reason ?? null,
        suppressed_reason: reason,
        in_scope_a1: inScopeA1,
        micro_owner: microOwner,
        selection_limit_subtype: selectionLimitSubtype,
        evidence_experience_id: experienceId,
        selected_count_for_experience: selectedCountForExperience,
        selected_experience_count: selectedExperienceDistribution.size,
        limits: {
          max_experiences: plan.limits.max_experiences,
          max_bullets_per_experience: plan.limits.max_bullets_per_experience,
        },
        is_manual_quick_check_evidence: evidence ? isManualQuickCheckEvidencePiece(evidence) : null,
        source_type: evidence?.source_type ?? null,
      };
    });

    const firstA1AnchorLoss = anchorRows.find((row) => row.in_scope_a1) ?? null;

    caseAnalyses.push({
      fixture_job_id: fixtureJob.id,
      job_id: jobId,
      anchor_rows: anchorRows,
      first_a1_anchor_loss: firstA1AnchorLoss,
    });
  }

  const firstOwners = caseAnalyses
    .map((entry) => (entry.first_a1_anchor_loss as { micro_owner?: string | null } | null)?.micro_owner ?? null)
    .filter((value): value is string => Boolean(value));
  const uniqueOwners = Array.from(new Set(firstOwners));
  const firstOwnerStable = uniqueOwners.length === 1 && firstOwners.length === caseAnalyses.length;

  const output = {
    generated_at: new Date().toISOString(),
    decision_label: "AUDIT",
    current_task_type: "diagnosis",
    current_mode: "AUDIT",
    active_line: "QUEUE-P0-027",
    active_branch: "Branch A1",
    contrast_branches: {
      A2: "tracked_only_not_reopened",
      BranchB: "tracked_contrast_not_reopened",
    },
    terminology_classification: "consumer / output-path issue",
    execution_observability: {
      execution_mode: "direct_execution_with_bypass_reason",
      dispatched_roles: [],
      bypass_reason_category: "no_matching_subagent",
      bypass_reason_detail: "Subagent dispatch tool unavailable in this harness context for this run; bounded diagnosis executed directly with artifact trace.",
    },
    contrast_anchor_ids: contrastAnchors,
    a1_scope_reasons: Array.from(A1_SUPPRESSION_REASONS),
    per_case: caseAnalyses,
    a1_micro_owner_stability: {
      first_owner_candidates: uniqueOwners,
      first_owner_stable: firstOwnerStable,
      interpretation: firstOwnerStable
        ? "single_micro_owner"
        : "split_micro_owner_family_inside_A1",
    },
    repair_admission_a1_only: {
      allowed: false,
      reason: firstOwnerStable
        ? "blocked_pending additional guard safety confirmation"
        : "blocked because first A1 micro-owner is split across cases (no single stable subrule owner).",
    },
    governance: {
      founder_review_required: false,
      automation_can_continue_locally: true,
      next_action: "Continue A1 in AUDIT with one additional bounded subrule-isolation pass; keep A2 parked/tracked.",
    },
  };

  const absoluteOut = path.isAbsolute(args.outPath)
    ? args.outPath
    : path.join(process.cwd(), args.outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(absoluteOut);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
