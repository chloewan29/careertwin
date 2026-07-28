import {
  validateResumeEvidenceBundle,
  type EvidenceReviewStatus,
  type ProvenancedField,
  type ResumeEvidenceBundle,
  type ResumeEvidenceInterpretation,
  type ResumeEvidenceOutcome,
} from "./resume-evidence-contract";
import {
  RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  type ApplyResumeEvidenceReviewInput,
  type ApplyResumeEvidenceReviewResult,
  type EvidenceFieldReviewDecision,
  type EmploymentFieldReviewDecision,
  type ResumeEvidenceReviewDecision,
  type ResumeEvidenceReviewIssue,
} from "./resume-evidence-review-contract";

const nonEmpty = (value: string | undefined) => Boolean(value?.trim());

function issue(code: string, path: string, message: string, severity: ResumeEvidenceReviewIssue["severity"] = "error"): ResumeEvidenceReviewIssue {
  return { code, path, message, severity };
}

function logicalTarget(decision: ResumeEvidenceReviewDecision) {
  const field = "field" in decision ? `:${decision.field}` : "";
  return `${decision.targetType}:${decision.targetId}${field}`;
}

function nextStatus(current: EvidenceReviewStatus, action: "confirm" | "edit" | "reject" | "restore", path: string): EvidenceReviewStatus | ResumeEvidenceReviewIssue {
  if (action === "restore") return current === "rejected" ? "unreviewed" : issue("invalid_state_transition", path, "Restore requires a rejected target.");
  if (current === "rejected") return issue("decision_against_rejected_target", path, "Rejected target requires restore before another review action.");
  if (action === "confirm") {
    if (current === "edited") return issue("invalid_state_transition", path, "Edited content cannot be rewritten as confirmed.");
    return "confirmed";
  }
  if (action === "edit") return "edited";
  return "rejected";
}

function userField<T>(value: T, sourceSpanIds: string[]): ProvenancedField<T> {
  return { value, provenance: "user_provided", sourceSpanIds: [...sourceSpanIds], method: "manual", reviewStatus: "edited" };
}

function validateBase(input: ApplyResumeEvidenceReviewInput): ResumeEvidenceReviewIssue[] {
  const issues: ResumeEvidenceReviewIssue[] = [];
  const source = validateResumeEvidenceBundle(input.bundle);
  source.issues.filter((item) => item.severity === "error").forEach((item) => issues.push(issue("invalid_source_bundle", item.path, `Source bundle validation failed at ${item.path}.`)));
  const session = input.session;
  if (session.schemaVersion !== RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION || !nonEmpty(session.id) || !nonEmpty(session.sourceBundleId) || !nonEmpty(session.sourceSchemaVersion) || !nonEmpty(session.capabilityDefinitionVersion) || !Array.isArray(session.decisions) || !Array.isArray(session.warnings)) {
    issues.push(issue("invalid_review_session", "session", "Review session structure or required identifiers are invalid."));
  }
  if (session.sourceBundleId !== input.bundle.id) issues.push(issue("source_bundle_mismatch", "session.sourceBundleId", `Session source bundle ${session.sourceBundleId} does not match bundle ${input.bundle.id}.`));
  if (session.sourceSchemaVersion !== input.bundle.schemaVersion) issues.push(issue("source_schema_mismatch", "session.sourceSchemaVersion", `Session source schema ${session.sourceSchemaVersion} does not match bundle schema ${input.bundle.schemaVersion}.`));
  if (!nonEmpty(input.capabilityDefinitionVersion) || session.capabilityDefinitionVersion !== input.capabilityDefinitionVersion) issues.push(issue("capability_definition_version_mismatch", "capabilityDefinitionVersion", "Capability definition versions do not match."));

  const capabilityIds = new Set<string>();
  input.capabilityDefinitions.forEach((definition, index) => {
    if (!nonEmpty(definition.id) || !nonEmpty(definition.label)) issues.push(issue("invalid_capability_definition", `capabilityDefinitions[${index}]`, "Capability definition ID and label must be non-empty."));
    if (capabilityIds.has(definition.id)) issues.push(issue("duplicate_capability_definition", `capabilityDefinitions[${index}].id`, `Duplicate capability definition ${definition.id}.`));
    capabilityIds.add(definition.id);
  });

  const decisionIds = new Set<string>();
  const sequences = new Set<number>();
  const generatedIds = new Set<string>([
    ...input.bundle.capabilityMappings.map((item) => item.id),
    ...(input.bundle.interpretations ?? []).map((item) => item.id),
  ]);
  session.decisions.forEach((decision, index) => {
    const path = `session.decisions[${index}]`;
    if (!nonEmpty(decision.id) || !nonEmpty(decision.targetId) || decision.actor !== "user") issues.push(issue("invalid_review_session", path, "Decision ID, target ID, and actor are invalid."));
    if (decisionIds.has(decision.id)) issues.push(issue("duplicate_decision_id", `${path}.id`, `Duplicate decision ID ${decision.id}.`));
    decisionIds.add(decision.id);
    if (!Number.isInteger(decision.sequence) || decision.sequence < 1) issues.push(issue("invalid_review_session", `${path}.sequence`, "Decision sequence must be a positive integer."));
    else if (sequences.has(decision.sequence)) issues.push(issue("duplicate_decision_sequence", `${path}.sequence`, `Duplicate decision sequence ${decision.sequence}.`));
    sequences.add(decision.sequence);
    if (decision.targetType === "employment_field") {
      if (!["employerName", "roleTitle", "startDate", "endDate", "location"].includes(decision.field)) issues.push(issue("unsupported_target_field", `${path}.field`, "Employment review field is unsupported."));
      if (!["confirm", "edit", "reject", "restore"].includes(decision.action)) issues.push(issue("unsupported_action", `${path}.action`, "Employment review action is unsupported."));
    } else if (decision.targetType === "evidence_field") {
      if (!["displayText", "action", "context", "outcome"].includes(decision.field)) issues.push(issue("unsupported_target_field", `${path}.field`, "Evidence review field is unsupported."));
      if (!["confirm", "edit", "reject", "restore"].includes(decision.action)) issues.push(issue("unsupported_action", `${path}.action`, "Evidence field review action is unsupported."));
    } else if (decision.targetType === "evidence_record") {
      if (!["confirm", "reject", "restore"].includes(decision.action)) issues.push(issue("unsupported_action", `${path}.action`, "Evidence record review action is unsupported."));
    } else if (decision.targetType === "capability_mapping") {
      if (!["confirm", "reject", "restore", "remap"].includes(decision.action)) issues.push(issue("unsupported_action", `${path}.action`, "Capability mapping review action is unsupported."));
    } else if (decision.targetType === "interpretation") {
      if (!["confirm", "edit", "reject", "restore"].includes(decision.action)) issues.push(issue("unsupported_action", `${path}.action`, "Interpretation review action is unsupported."));
    } else {
      issues.push(issue("invalid_review_session", `${path}.targetType`, "Decision target type is unsupported."));
    }
    if (decision.targetType === "capability_mapping" && decision.action === "remap") {
      if (!nonEmpty(decision.newMappingId)) issues.push(issue("invalid_review_session", `${path}.newMappingId`, "Generated mapping ID must be non-empty."));
      else if (generatedIds.has(decision.newMappingId)) issues.push(issue("duplicate_generated_entity_id", `${path}.newMappingId`, `Generated entity ID ${decision.newMappingId} already exists.`));
      generatedIds.add(decision.newMappingId);
      if (!capabilityIds.has(decision.capabilityId)) issues.push(issue("unknown_capability", `${path}.capabilityId`, `Unknown capability ${decision.capabilityId}.`));
    }
    if (decision.targetType === "interpretation" && decision.action === "edit") {
      if (!nonEmpty(decision.newInterpretationId)) issues.push(issue("invalid_review_session", `${path}.newInterpretationId`, "Generated interpretation ID must be non-empty."));
      else if (generatedIds.has(decision.newInterpretationId)) issues.push(issue("duplicate_generated_entity_id", `${path}.newInterpretationId`, `Generated entity ID ${decision.newInterpretationId} already exists.`));
      generatedIds.add(decision.newInterpretationId);
    }
  });
  return issues;
}

function fieldDecision<T>(field: ProvenancedField<T> | undefined, decision: EmploymentFieldReviewDecision | EvidenceFieldReviewDecision, path: string): ProvenancedField<T> | ResumeEvidenceReviewIssue {
  if (decision.action === "edit") return issue("unsupported_action", path, "Typed edit payload does not match target field.");
  if (!field) return issue("unknown_target", path, `Review field ${decision.field} does not exist.`);
  const status = nextStatus(field.reviewStatus, decision.action, path);
  if (typeof status !== "string") return status;
  return { ...field, sourceSpanIds: [...field.sourceSpanIds], reviewStatus: status };
}

function applyEmploymentDecision(bundle: ResumeEvidenceBundle, decision: EmploymentFieldReviewDecision, path: string): ResumeEvidenceReviewIssue | undefined {
  const record = bundle.employmentRecords.find((item) => item.id === decision.targetId);
  if (!record) return issue("unknown_target", path, `Unknown employment target ${decision.targetId}.`);
  const current = record[decision.field];
  if (decision.expectedReviewStatus && current?.reviewStatus !== decision.expectedReviewStatus) return issue("stale_review_status", path, `Employment field ${decision.field} no longer has the expected review status.`);
  if (decision.action === "edit") {
    if (!nonEmpty(decision.value) || decision.sourceSpanIds.length === 0) return issue("unsupported_target_field", path, `Employment field ${decision.field} edit is invalid.`);
    record[decision.field] = userField(decision.value, decision.sourceSpanIds);
    return;
  }
  const result = fieldDecision(current, decision, path);
  if ("code" in result) return result;
  record[decision.field] = result;
}

function applyEvidenceFieldDecision(bundle: ResumeEvidenceBundle, decision: EvidenceFieldReviewDecision, path: string): ResumeEvidenceReviewIssue | undefined {
  const record = bundle.evidenceRecords.find((item) => item.id === decision.targetId);
  if (!record) return issue("unknown_target", path, `Unknown evidence target ${decision.targetId}.`);
  const current = record[decision.field];
  if (decision.expectedReviewStatus && current?.reviewStatus !== decision.expectedReviewStatus) return issue("stale_review_status", path, `Evidence field ${decision.field} no longer has the expected review status.`);
  if (decision.action === "edit") {
    if (decision.sourceSpanIds.length === 0) return issue(decision.field === "outcome" ? "invalid_outcome" : "unsupported_target_field", path, `Evidence field ${decision.field} edit requires source context.`);
    if (decision.field === "outcome") {
      const value = decision.value as ResumeEvidenceOutcome;
      if (!nonEmpty(value.text) || (value.kind !== "quantitative" && value.kind !== "qualitative")) return issue("invalid_outcome", path, "Outcome edit requires non-empty stated text and a valid kind.");
      record.outcome = userField(value, decision.sourceSpanIds);
    } else {
      const value = decision.value as string;
      if (!nonEmpty(value)) return issue("unsupported_target_field", path, `Evidence field ${decision.field} edit requires a non-empty value.`);
      record[decision.field] = userField(value, decision.sourceSpanIds);
    }
    return;
  }
  if (decision.field === "outcome") {
    const result = fieldDecision<ResumeEvidenceOutcome>(record.outcome, decision, path);
    if ("code" in result) return result;
    record.outcome = result;
  } else {
    const result = fieldDecision<string>(record[decision.field], decision, path);
    if ("code" in result) return result;
    record[decision.field] = result;
  }
}

/** Applies decisions to a clone; the extraction bundle and decision history remain immutable. */
export function applyResumeEvidenceReviewDecisions(input: ApplyResumeEvidenceReviewInput): ApplyResumeEvidenceReviewResult {
  const structuralIssues = validateBase(input);
  if (structuralIssues.length > 0) return { ok: false, issues: structuralIssues };

  const bundle = structuredClone(input.bundle);
  const ordered = [...input.session.decisions].sort((a, b) => a.sequence - b.sequence);
  const applied = new Map<string, ResumeEvidenceReviewDecision>();
  const latestByTarget = new Map<string, string>();

  for (const decision of ordered) {
    const path = `decision:${decision.id}`;
    const target = logicalTarget(decision);
    const latest = latestByTarget.get(target);
    if (latest && decision.priorDecisionId !== latest) return { ok: false, issues: [issue("conflicting_decisions", path, `Decision ${decision.id} must reference prior decision ${latest}.`)] };
    if (decision.priorDecisionId) {
      const prior = applied.get(decision.priorDecisionId);
      if (!prior || logicalTarget(prior) !== target) return { ok: false, issues: [issue("invalid_prior_decision", path, `Decision ${decision.id} has an invalid prior decision reference.`)] };
    }

    let failure: ResumeEvidenceReviewIssue | undefined;
    if (decision.targetType === "employment_field") failure = applyEmploymentDecision(bundle, decision, path);
    else if (decision.targetType === "evidence_field") failure = applyEvidenceFieldDecision(bundle, decision, path);
    else if (decision.targetType === "evidence_record") {
      const record = bundle.evidenceRecords.find((item) => item.id === decision.targetId);
      if (!record) failure = issue("unknown_target", path, `Unknown evidence target ${decision.targetId}.`);
      else if (decision.expectedReviewStatus && record.reviewStatus !== decision.expectedReviewStatus) failure = issue("stale_review_status", path, `Evidence target ${decision.targetId} no longer has the expected review status.`);
      else {
        const status = nextStatus(record.reviewStatus, decision.action, path);
        if (typeof status === "string") record.reviewStatus = status; else failure = status;
      }
    } else if (decision.targetType === "capability_mapping") {
      const mapping = bundle.capabilityMappings.find((item) => item.id === decision.targetId);
      if (!mapping) failure = issue("unknown_target", path, `Unknown mapping target ${decision.targetId}.`);
      else if (decision.expectedReviewStatus && mapping.reviewStatus !== decision.expectedReviewStatus) failure = issue("stale_review_status", path, `Mapping target ${decision.targetId} no longer has the expected review status.`);
      else if (decision.action === "remap") {
        const status = nextStatus(mapping.reviewStatus, "reject", path);
        if (typeof status !== "string") failure = status;
        else {
          mapping.reviewStatus = status;
          bundle.capabilityMappings.push({ id: decision.newMappingId, evidenceId: mapping.evidenceId, capabilityId: decision.capabilityId, relationship: decision.relationship, method: "user", ...(decision.rationale ? { rationale: decision.rationale } : {}), sourceSpanIds: [...decision.sourceSpanIds], reviewStatus: "edited" });
        }
      } else {
        const status = nextStatus(mapping.reviewStatus, decision.action, path);
        if (typeof status === "string") mapping.reviewStatus = status; else failure = status;
      }
    } else {
      const interpretations = bundle.interpretations ?? (bundle.interpretations = []);
      const interpretation = interpretations.find((item) => item.id === decision.targetId);
      if (!interpretation) failure = issue("unknown_target", path, `Unknown interpretation target ${decision.targetId}.`);
      else if (decision.expectedReviewStatus && interpretation.reviewStatus !== decision.expectedReviewStatus) failure = issue("stale_review_status", path, `Interpretation target ${decision.targetId} no longer has the expected review status.`);
      else if (decision.action === "edit") {
        if (!nonEmpty(decision.text)) failure = issue("unsupported_target_field", path, "Interpretation edit requires non-empty text.");
        else {
          const status = nextStatus(interpretation.reviewStatus, "reject", path);
          if (typeof status !== "string") failure = status;
          else {
            interpretation.reviewStatus = status;
            const replacement: ResumeEvidenceInterpretation = { id: decision.newInterpretationId, evidenceId: interpretation.evidenceId, kind: interpretation.kind, text: decision.text, provenance: "user_provided", sourceSpanIds: [...decision.sourceSpanIds], reviewStatus: "edited", method: "manual" };
            interpretations.push(replacement);
          }
        }
      } else {
        const status = nextStatus(interpretation.reviewStatus, decision.action, path);
        if (typeof status === "string") interpretation.reviewStatus = status; else failure = status;
      }
    }
    if (failure) return { ok: false, issues: [failure] };
    applied.set(decision.id, decision);
    latestByTarget.set(target, decision.id);
  }

  const validation = validateResumeEvidenceBundle(bundle);
  const errors = validation.issues.filter((item) => item.severity === "error");
  if (errors.length > 0) return { ok: false, issues: errors.map((item) => issue("reviewed_bundle_invalid", item.path, `Reviewed bundle validation failed at ${item.path}.`)) };

  const unresolved = bundle.evidenceRecords.some((item) => item.reviewStatus === "unreviewed") || bundle.capabilityMappings.some((item) => item.reviewStatus === "unreviewed") || (bundle.interpretations ?? []).some((item) => item.reviewStatus === "unreviewed");
  const status = ordered.length === 0 ? "not_started" : unresolved ? "in_progress" : "completed";
  const warnings: ResumeEvidenceReviewIssue[] = [];
  if (unresolved) warnings.push(issue("unreviewed_items_remaining", "session.status", "Reviewable items remain unreviewed.", "warning"));
  if (input.session.status !== status) warnings.push(issue("session_status_incomplete", "session.status", `Session status was derived as ${status}.`, "info"));
  const session = structuredClone(input.session);
  session.decisions = structuredClone(ordered);
  session.status = status;
  return { ok: true, reviewedBundle: bundle, session, warnings };
}
