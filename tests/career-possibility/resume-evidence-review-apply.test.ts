import { strict as assert } from "node:assert";
import { validateCareerCapabilityMapPresentation } from "../../lib/career-possibility/career-capability-map-contract";
import { exampleResumeEvidence } from "../../lib/career-possibility/fixtures/exampleResumeEvidence";
import { applyResumeEvidenceReviewDecisions } from "../../lib/career-possibility/resume-evidence-review-apply";
import {
  RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  type ApplyResumeEvidenceReviewInput,
  type CreateCapabilityMappingReviewDecision,
  type ResumeEvidenceReviewDecision,
  type ResumeEvidenceReviewSession,
} from "../../lib/career-possibility/resume-evidence-review-contract";
import { validateResumeEvidenceBundle } from "../../lib/career-possibility/resume-evidence-contract";
import {
  DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY,
  adaptReviewedResumeEvidenceToCareerMap,
  type CareerMapCapabilityDefinition,
} from "../../lib/career-possibility/reviewed-resume-evidence-map-adapter";

const capabilityDefinitionVersion = "fixture-capabilities/1";
const capabilityDefinitions = [
  { id: "automation", label: "Automation", family: "Delivery" },
  { id: "stakeholder-coordination", label: "Stakeholder coordination", family: "Collaboration" },
  { id: "customer-insight", label: "Customer insight", family: "Insight" },
] as const satisfies readonly CareerMapCapabilityDefinition[];

const session = (decisions: ResumeEvidenceReviewDecision[] = [], status: ResumeEvidenceReviewSession["status"] = decisions.length ? "in_progress" : "not_started"): ResumeEvidenceReviewSession => ({
  schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  id: "review-session-1",
  sourceBundleId: exampleResumeEvidence.id,
  sourceSchemaVersion: exampleResumeEvidence.schemaVersion,
  capabilityDefinitionVersion,
  status,
  decisions,
  warnings: [],
});

const input = (decisions: ResumeEvidenceReviewDecision[] = []): ApplyResumeEvidenceReviewInput => ({
  bundle: structuredClone(exampleResumeEvidence),
  session: session(decisions),
  capabilityDefinitions: structuredClone(capabilityDefinitions),
  capabilityDefinitionVersion,
});

const apply = (decisions: ResumeEvidenceReviewDecision[] = []) => applyResumeEvidenceReviewDecisions(input(decisions));
const createMappingDecision = (overrides: Partial<CreateCapabilityMappingReviewDecision> = {}): CreateCapabilityMappingReviewDecision => ({
  id: "create-mapping",
  sequence: 1,
  actor: "user",
  targetType: "evidence_capability_mapping",
  action: "create",
  targetEvidenceId: "evidence-3",
  newMappingId: "mapping-user-created",
  capabilityId: "automation",
  relationship: "direct_evidence",
  sourceSpanIds: ["span-3"],
  expectedEvidenceReviewStatus: "confirmed",
  expectedMappingState: "absent",
  ...overrides,
});
const applyTo = (value: ApplyResumeEvidenceReviewInput, decisions: ResumeEvidenceReviewDecision[]) => {
  value.session = session(decisions);
  return applyResumeEvidenceReviewDecisions(value);
};
const expectFailure = (value: ReturnType<typeof apply>, code: string) => {
  assert.equal(value.ok, false);
  if (!value.ok) assert.ok(value.issues.some((item) => item.code === code), JSON.stringify(value.issues));
};
const mappingDecision = (id: string, sequence: number, targetId: string, action: "confirm" | "reject" | "restore", extra: Partial<ResumeEvidenceReviewDecision> = {}): ResumeEvidenceReviewDecision => ({ id, sequence, actor: "user", targetType: "capability_mapping", targetId, action, ...extra } as ResumeEvidenceReviewDecision);
const interpretationDecision = (id: string, sequence: number, action: "confirm" | "reject" | "restore", extra: Partial<ResumeEvidenceReviewDecision> = {}): ResumeEvidenceReviewDecision => ({ id, sequence, actor: "user", targetType: "interpretation", targetId: "interpretation-1", action, ...extra } as ResumeEvidenceReviewDecision);

{
  const source = input();
  const beforeBundle = JSON.stringify(source.bundle);
  const beforeSession = JSON.stringify(source.session);
  const beforeDefinitions = JSON.stringify(source.capabilityDefinitions);
  const result = applyResumeEvidenceReviewDecisions(source);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.reviewedBundle, source.bundle);
    assert.notEqual(result.reviewedBundle, source.bundle);
    assert.equal(result.session.status, "not_started");
  }
  assert.equal(JSON.stringify(source.bundle), beforeBundle);
  assert.equal(JSON.stringify(source.session), beforeSession);
  assert.equal(JSON.stringify(source.capabilityDefinitions), beforeDefinitions);
}

{
  const decisions = [
    mappingDecision("confirm-mapping", 2, "mapping-3", "confirm"),
    { id: "confirm-evidence", sequence: 1, actor: "user", targetType: "evidence_record", targetId: "evidence-3", action: "confirm" } as const,
  ];
  const result = apply([...decisions].reverse());
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.reviewedBundle.capabilityMappings.find((item) => item.id === "mapping-3")?.reviewStatus, "confirmed");
  assert.deepEqual(result, apply(decisions));
}

{
  const duplicate = mappingDecision("same", 1, "mapping-3", "confirm");
  expectFailure(apply([duplicate, { ...duplicate, sequence: 2 }]), "duplicate_decision_id");
  expectFailure(apply([duplicate, { ...duplicate, id: "other" }]), "duplicate_decision_sequence");
}

{
  const value = input();
  value.session.sourceBundleId = "wrong-bundle";
  expectFailure(applyResumeEvidenceReviewDecisions(value), "source_bundle_mismatch");
  value.session.sourceBundleId = value.bundle.id;
  value.session.sourceSchemaVersion = "0.0.0";
  expectFailure(applyResumeEvidenceReviewDecisions(value), "source_schema_mismatch");
  value.session.sourceSchemaVersion = value.bundle.schemaVersion;
  value.capabilityDefinitionVersion = "other-version";
  expectFailure(applyResumeEvidenceReviewDecisions(value), "capability_definition_version_mismatch");
}

{
  const value = input();
  value.capabilityDefinitions = [{ id: "", label: "Broken" }];
  expectFailure(applyResumeEvidenceReviewDecisions(value), "invalid_capability_definition");
  value.capabilityDefinitions = [capabilityDefinitions[0], capabilityDefinitions[0]];
  expectFailure(applyResumeEvidenceReviewDecisions(value), "duplicate_capability_definition");
}

expectFailure(apply([{ id: "unknown", sequence: 1, actor: "user", targetType: "evidence_record", targetId: "missing", action: "confirm" }]), "unknown_target");
expectFailure(apply([{ id: "bad-field", sequence: 1, actor: "user", targetType: "evidence_field", targetId: "evidence-1", field: "sourceText", action: "edit", value: "No", sourceSpanIds: ["span-1"] } as unknown as ResumeEvidenceReviewDecision]), "unsupported_target_field");
expectFailure(apply([{ id: "bad-action", sequence: 1, actor: "user", targetType: "evidence_record", targetId: "evidence-1", action: "edit" } as unknown as ResumeEvidenceReviewDecision]), "unsupported_action");
expectFailure(apply([mappingDecision("stale", 1, "mapping-3", "confirm", { expectedReviewStatus: "confirmed" })]), "stale_review_status");
expectFailure(apply([mappingDecision("prior", 1, "mapping-3", "confirm", { priorDecisionId: "missing" })]), "invalid_prior_decision");

{
  const result = apply([mappingDecision("confirm", 1, "mapping-3", "confirm")]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const mapping = result.reviewedBundle.capabilityMappings.find((item) => item.id === "mapping-3");
    assert.equal(mapping?.reviewStatus, "confirmed");
    assert.equal(mapping?.method, "model");
    assert.equal(mapping?.modelMetadata?.runId, "fixture-run-1");
  }
}

{
  const rejected = apply([mappingDecision("reject", 1, "mapping-3", "reject")]);
  assert.equal(rejected.ok, true);
  if (rejected.ok) assert.equal(rejected.reviewedBundle.capabilityMappings.length, exampleResumeEvidence.capabilityMappings.length);
  expectFailure(apply([mappingDecision("reject", 1, "mapping-3", "reject"), mappingDecision("confirm", 2, "mapping-3", "confirm", { priorDecisionId: "reject" })]), "decision_against_rejected_target");
  const restored = apply([
    mappingDecision("reject", 1, "mapping-3", "reject"),
    mappingDecision("restore", 2, "mapping-3", "restore", { priorDecisionId: "reject" }),
    mappingDecision("confirm", 3, "mapping-3", "confirm", { priorDecisionId: "restore" }),
  ]);
  assert.equal(restored.ok, true);
  if (restored.ok) assert.equal(restored.reviewedBundle.capabilityMappings.find((item) => item.id === "mapping-3")?.reviewStatus, "confirmed");
}

expectFailure(apply([
  { id: "remap-edited", sequence: 1, actor: "user", targetType: "capability_mapping", targetId: "mapping-3", action: "remap", newMappingId: "mapping-edited", capabilityId: "automation", relationship: "direct_evidence", sourceSpanIds: ["span-3"] },
  mappingDecision("confirm-edited", 2, "mapping-edited", "confirm"),
]), "invalid_state_transition");

{
  const result = apply([{ id: "employment-edit", sequence: 1, actor: "user", targetType: "employment_field", targetId: "employment-1", field: "roleTitle", action: "edit", value: "Operations Lead", sourceSpanIds: ["span-1"] }]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const field = result.reviewedBundle.employmentRecords[0].roleTitle;
    assert.deepEqual([field?.provenance, field?.method, field?.reviewStatus], ["user_provided", "manual", "edited"]);
  }
}

for (const [field, value] of [["displayText", "User display text"], ["action", "User action"], ["context", "User context"]] as const) {
  const result = apply([{ id: `edit-${field}`, sequence: 1, actor: "user", targetType: "evidence_field", targetId: "evidence-1", field, action: "edit", value, sourceSpanIds: ["span-1"] }]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const record = result.reviewedBundle.evidenceRecords[0];
    const edited = record[field];
    assert.equal(record.sourceText, exampleResumeEvidence.evidenceRecords[0].sourceText);
    assert.deepEqual([edited?.provenance, edited?.method, edited?.reviewStatus], ["user_provided", "manual", "edited"]);
  }
}

{
  const evidenceField = (
    id: string,
    sequence: number,
    field: "action" | "context",
    action: "confirm" | "edit" | "reject" | "restore",
    expectedReviewStatus: "unreviewed" | "confirmed" | "edited" | "rejected",
    priorDecisionId?: string,
  ): ResumeEvidenceReviewDecision => ({
    id,
    sequence,
    actor: "user",
    targetType: "evidence_field",
    targetId: "evidence-1",
    field,
    action,
    expectedReviewStatus,
    ...(priorDecisionId ? { priorDecisionId } : {}),
    ...(action === "edit" ? { value: `${field} replacement ${sequence}`, sourceSpanIds: ["span-1"] } : {}),
  } as ResumeEvidenceReviewDecision);

  const absent = apply([evidenceField("absent-edit", 1, "context", "edit", "unreviewed")]);
  assert.equal(absent.ok, true);
  if (absent.ok) assert.deepEqual([absent.reviewedBundle.evidenceRecords[0].context?.value, absent.reviewedBundle.evidenceRecords[0].context?.reviewStatus], ["context replacement 1", "edited"]);

  const populated = apply([evidenceField("populated-edit", 1, "action", "edit", "confirmed")]);
  assert.equal(populated.ok, true);
  if (populated.ok) assert.equal(populated.reviewedBundle.evidenceRecords[0].action?.reviewStatus, "edited");

  const confirmedThenEdited = apply([
    evidenceField("field-confirm", 1, "action", "confirm", "confirmed"),
    evidenceField("field-edit-after-confirm", 2, "action", "edit", "confirmed", "field-confirm"),
  ]);
  assert.equal(confirmedThenEdited.ok, true);

  const editedTwice = apply([
    evidenceField("field-edit-1", 1, "action", "edit", "confirmed"),
    evidenceField("field-edit-2", 2, "action", "edit", "edited", "field-edit-1"),
  ]);
  assert.equal(editedTwice.ok, true);
  if (editedTwice.ok) assert.equal(editedTwice.reviewedBundle.evidenceRecords[0].action?.value, "action replacement 2");

  expectFailure(apply([
    evidenceField("field-reject", 1, "action", "reject", "confirmed"),
    evidenceField("field-edit-rejected", 2, "action", "edit", "rejected", "field-reject"),
  ]), "decision_against_rejected_target");

  const restoredThenEdited = apply([
    evidenceField("field-reject", 1, "action", "reject", "confirmed"),
    evidenceField("field-restore", 2, "action", "restore", "rejected", "field-reject"),
    evidenceField("field-edit-restored", 3, "action", "edit", "unreviewed", "field-restore"),
  ]);
  assert.equal(restoredThenEdited.ok, true);

  expectFailure(apply([
    evidenceField("field-edit-1", 1, "action", "edit", "confirmed"),
    evidenceField("field-edit-2", 2, "action", "edit", "edited", "field-edit-1"),
    evidenceField("field-edit-stale", 3, "action", "edit", "edited", "field-edit-1"),
  ]), "conflicting_decisions");
  expectFailure(apply([evidenceField("field-edit-unknown-prior", 1, "action", "edit", "confirmed", "missing")]), "invalid_prior_decision");
  expectFailure(apply([
    evidenceField("other-target", 1, "context", "edit", "unreviewed"),
    evidenceField("field-edit-cross-target", 2, "action", "edit", "confirmed", "other-target"),
  ]), "invalid_prior_decision");
  expectFailure(apply([{ ...evidenceField("unknown-evidence-field", 1, "action", "edit", "unreviewed"), targetId: "missing-evidence" }]), "unknown_target");
  expectFailure(apply([{ ...evidenceField("unsupported-evidence-field", 1, "action", "edit", "unreviewed"), field: "sourceText" } as unknown as ResumeEvidenceReviewDecision]), "unsupported_target_field");

  expectFailure(apply([
    { id: "parent-reject", sequence: 1, actor: "user", targetType: "evidence_record", targetId: "evidence-1", action: "reject", expectedReviewStatus: "confirmed" },
    { id: "parent-confirm", sequence: 2, actor: "user", targetType: "evidence_record", targetId: "evidence-1", action: "confirm", expectedReviewStatus: "rejected", priorDecisionId: "parent-reject" },
  ]), "decision_against_rejected_target");
}

for (const targetId of ["evidence-3", "evidence-4"] as const) {
  const result = apply([{ id: `outcome-${targetId}`, sequence: 1, actor: "user", targetType: "evidence_field", targetId, field: "outcome", action: "edit", value: { text: "Improved the workflow.", kind: "qualitative" }, sourceSpanIds: [targetId === "evidence-3" ? "span-3" : "span-4"] }]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const outcome = result.reviewedBundle.evidenceRecords.find((item) => item.id === targetId)?.outcome;
    assert.deepEqual([outcome?.provenance, outcome?.method, outcome?.reviewStatus, outcome?.value.kind], ["user_provided", "manual", "edited", "qualitative"]);
  }
}

{
  const changed = apply([{ id: "outcome-kind", sequence: 1, actor: "user", targetType: "evidence_field", targetId: "evidence-1", field: "outcome", action: "edit", value: { text: "Reduced time by 40%.", kind: "quantitative" }, sourceSpanIds: ["span-1"] }]);
  assert.equal(changed.ok, true);
  if (changed.ok) assert.equal(changed.reviewedBundle.evidenceRecords[0].outcome?.value.kind, "quantitative");
  expectFailure(apply([{ id: "bad-outcome", sequence: 1, actor: "user", targetType: "evidence_field", targetId: "evidence-1", field: "outcome", action: "edit", value: { text: "", kind: "quantitative" }, sourceSpanIds: ["span-1"] }]), "invalid_outcome");
}

{
  const source = input();
  const modelBefore = structuredClone(source.bundle.capabilityMappings.find((item) => item.id === "mapping-3"));
  source.session = session([{ id: "remap", sequence: 1, actor: "user", targetType: "capability_mapping", targetId: "mapping-3", action: "remap", newMappingId: "mapping-user-remap", capabilityId: "automation", relationship: "direct_evidence", sourceSpanIds: ["span-3"], rationale: "User-selected relationship" }]);
  const result = applyResumeEvidenceReviewDecisions(source);
  assert.equal(result.ok, true);
  if (result.ok) {
    const original = result.reviewedBundle.capabilityMappings.find((item) => item.id === "mapping-3");
    const replacement = result.reviewedBundle.capabilityMappings.find((item) => item.id === "mapping-user-remap");
    assert.equal(original?.reviewStatus, "rejected");
    assert.deepEqual(original?.modelMetadata, modelBefore?.modelMetadata);
    assert.deepEqual([replacement?.method, replacement?.reviewStatus, replacement?.relationship], ["user", "edited", "direct_evidence"]);
  }
  const unknown = structuredClone(source);
  const remap = unknown.session.decisions[0];
  if (remap.targetType === "capability_mapping" && remap.action === "remap") remap.capabilityId = "missing-capability";
  expectFailure(applyResumeEvidenceReviewDecisions(unknown), "unknown_capability");
  const collision = structuredClone(source);
  const collisionDecision = collision.session.decisions[0];
  if (collisionDecision.targetType === "capability_mapping" && collisionDecision.action === "remap") collisionDecision.newMappingId = "mapping-1";
  expectFailure(applyResumeEvidenceReviewDecisions(collision), "duplicate_generated_entity_id");
}

{
  const confirmed = apply([interpretationDecision("confirm-i", 1, "confirm")]);
  assert.equal(confirmed.ok, true);
  if (confirmed.ok) assert.deepEqual([confirmed.reviewedBundle.interpretations?.[0].provenance, confirmed.reviewedBundle.interpretations?.[0].reviewStatus], ["model_inferred", "confirmed"]);
  const rejected = apply([interpretationDecision("reject-i", 1, "reject")]);
  assert.equal(rejected.ok, true);
  if (rejected.ok) assert.equal(rejected.reviewedBundle.interpretations?.length, 1);
  const restored = apply([interpretationDecision("reject-i", 1, "reject"), interpretationDecision("restore-i", 2, "restore", { priorDecisionId: "reject-i" })]);
  assert.equal(restored.ok, true);
  if (restored.ok) assert.equal(restored.reviewedBundle.interpretations?.[0].reviewStatus, "unreviewed");
}

{
  const decision = { id: "edit-i", sequence: 1, actor: "user", targetType: "interpretation", targetId: "interpretation-1", action: "edit", newInterpretationId: "interpretation-user", text: "I use this as evidence of cross-functional operating work.", sourceSpanIds: [] } as const;
  const result = apply([decision]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const original = result.reviewedBundle.interpretations?.find((item) => item.id === "interpretation-1");
    const replacement = result.reviewedBundle.interpretations?.find((item) => item.id === "interpretation-user");
    assert.equal(original?.reviewStatus, "rejected");
    assert.deepEqual([replacement?.provenance, replacement?.reviewStatus, replacement?.kind, replacement?.evidenceId], ["user_provided", "edited", original?.kind, original?.evidenceId]);
    assert.deepEqual(result.reviewedBundle.evidenceRecords, exampleResumeEvidence.evidenceRecords);
  }
  expectFailure(apply([{ ...decision, newInterpretationId: "interpretation-1" }]), "duplicate_generated_entity_id");
}

expectFailure(apply([mappingDecision("reject", 1, "mapping-3", "reject"), mappingDecision("restore", 2, "mapping-3", "restore")]), "conflicting_decisions");

{
  const partial = apply([mappingDecision("confirm", 1, "mapping-3", "confirm")]);
  assert.equal(partial.ok, true);
  if (partial.ok) {
    assert.equal(validateResumeEvidenceBundle(partial.reviewedBundle).valid, true);
    const adapted = adaptReviewedResumeEvidenceToCareerMap({ bundle: partial.reviewedBundle, capabilityDefinitions, policy: { ...DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY } });
    assert.equal(adapted.ok, true);
    if (adapted.ok) {
      assert.equal(adapted.presentation.analysisStatus, "review_required");
      assert.equal(validateCareerCapabilityMapPresentation(adapted.presentation).valid, true);
    }
  }
  const complete = apply([
    mappingDecision("reject-m3", 1, "mapping-3", "reject"),
    mappingDecision("reject-m5", 2, "mapping-5", "reject"),
    interpretationDecision("reject-i", 3, "reject"),
  ]);
  assert.equal(complete.ok, true);
  if (complete.ok) {
    assert.equal(complete.session.status, "completed");
    const adapted = adaptReviewedResumeEvidenceToCareerMap({ bundle: complete.reviewedBundle, capabilityDefinitions });
    assert.equal(adapted.ok, true);
    if (adapted.ok) assert.equal(adapted.presentation.analysisStatus, "provisional");
  }
}

{
  const edited = apply([{ id: "edit-i", sequence: 1, actor: "user", targetType: "interpretation", targetId: "interpretation-1", action: "edit", newInterpretationId: "interpretation-user", text: "A user-authored transferability interpretation.", sourceSpanIds: [] }]);
  assert.equal(edited.ok, true);
  if (edited.ok) {
    const adapted = adaptReviewedResumeEvidenceToCareerMap({ bundle: edited.reviewedBundle, capabilityDefinitions });
    assert.equal(adapted.ok, true);
    if (adapted.ok) assert.equal(adapted.presentation.interpretations.find((item) => item.id === "interpretation-user")?.provenance, "user_provided");
  }
}

{
  const first = apply([mappingDecision("confirm", 1, "mapping-3", "confirm")]);
  const second = apply([mappingDecision("confirm", 1, "mapping-3", "confirm", { createdAt: "2099-01-01T00:00:00Z" })]);
  if (first.ok && second.ok) {
    const withoutTimestamp = structuredClone(second);
    delete withoutTimestamp.session.decisions[0].createdAt;
    assert.deepEqual(first, withoutTimestamp);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
}

{
  const bad = input();
  bad.session.sourceBundleId = "sensitive-check";
  const result = applyResumeEvidenceReviewDecisions(bad);
  assert.equal(result.ok, false);
  if (!result.ok) {
    const messages = result.issues.map((item) => item.message).join(" ");
    const sensitive = [
      ...exampleResumeEvidence.sourceSpans.map((item) => item.originalText),
      ...exampleResumeEvidence.evidenceRecords.map((item) => item.sourceText),
      ...exampleResumeEvidence.evidenceRecords.flatMap((item) => [item.displayText?.value, item.action?.value, item.context?.value, item.outcome?.value.text]).filter((item): item is string => Boolean(item)),
      ...exampleResumeEvidence.employmentRecords.flatMap((item) => [item.employerName?.value, item.roleTitle?.value]).filter((item): item is string => Boolean(item)),
      ...(exampleResumeEvidence.interpretations ?? []).map((item) => item.text),
    ];
    sensitive.forEach((text) => assert.equal(messages.includes(text), false));
  }
}

{
  const source = input();
  source.bundle.capabilityMappings = [];
  const decision = createMappingDecision({ rationale: "User-selected evidence relationship" });
  source.session = session([decision]);
  const before = JSON.stringify(source);
  const result = applyResumeEvidenceReviewDecisions(source);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.reviewedBundle.capabilityMappings, [{
      id: "mapping-user-created",
      evidenceId: "evidence-3",
      capabilityId: "automation",
      relationship: "direct_evidence",
      method: "user",
      rationale: "User-selected evidence relationship",
      sourceSpanIds: ["span-3"],
      reviewStatus: "edited",
    }]);
    assert.equal("modelMetadata" in result.reviewedBundle.capabilityMappings[0], false);
    assert.equal(validateResumeEvidenceBundle(result.reviewedBundle).valid, true);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  }
  assert.equal(JSON.stringify(source), before);
}

{
  const source = input();
  source.bundle.capabilityMappings = [];
  source.bundle.evidenceRecords.find((item) => item.id === "evidence-3")!.reviewStatus = "edited";
  const result = applyTo(source, [createMappingDecision({ relationship: "transferable_signal", expectedEvidenceReviewStatus: "edited" })]);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual([result.reviewedBundle.capabilityMappings[0].relationship, result.reviewedBundle.capabilityMappings[0].method, result.reviewedBundle.capabilityMappings[0].reviewStatus], ["transferable_signal", "user", "edited"]);
}

for (const [status, code] of [["unreviewed", "evidence_unreviewed"], ["rejected", "evidence_rejected"]] as const) {
  const source = input();
  source.bundle.capabilityMappings = [];
  source.bundle.evidenceRecords.find((item) => item.id === "evidence-3")!.reviewStatus = status;
  const result = applyTo(source, [createMappingDecision()]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, code);
}
{
  const source = input();
  source.bundle.capabilityMappings = [];
  const evidence = source.bundle.evidenceRecords.find((item) => item.id === "evidence-3")!;
  evidence.processingStatus = "unsupported";
  const result = applyTo(source, [createMappingDecision()]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, "unsupported_evidence");
}

for (const [decision, code] of [
  [createMappingDecision({ targetEvidenceId: "missing-evidence" }), "unknown_target"],
  [createMappingDecision({ capabilityId: "missing-capability" }), "unknown_capability"],
  [createMappingDecision({ relationship: "possible" as "direct_evidence" }), "invalid_mapping_relationship"],
  [createMappingDecision({ sourceSpanIds: [] }), "source_span_not_linked_to_evidence"],
  [createMappingDecision({ sourceSpanIds: ["missing-span"] }), "source_span_not_linked_to_evidence"],
  [createMappingDecision({ sourceSpanIds: ["span-2"] }), "source_span_not_linked_to_evidence"],
  [createMappingDecision({ expectedEvidenceReviewStatus: "edited" }), "stale_review_status"],
  [createMappingDecision({ expectedMappingState: "present" as "absent" }), "stale_mapping_state"],
] as const) {
  const source = input();
  source.bundle.capabilityMappings = [];
  const result = applyTo(source, [decision]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((item) => item.code === code), JSON.stringify(result.issues));
}

{
  const source = input();
  const existing = createMappingDecision({ capabilityId: "customer-insight" });
  let result = applyTo(source, [existing]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, "mapping_target_exists");
  source.bundle.capabilityMappings.find((item) => item.id === "mapping-3")!.reviewStatus = "rejected";
  result = applyTo(source, [existing]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, "mapping_target_exists");
}

{
  const source = input();
  source.bundle.capabilityMappings = [];
  const decisions = [
    createMappingDecision({ id: "create-second", sequence: 2, newMappingId: "mapping-second", capabilityId: "stakeholder-coordination" }),
    createMappingDecision({ id: "create-first", sequence: 1, newMappingId: "mapping-first", capabilityId: "automation" }),
    createMappingDecision({ id: "create-other-evidence", sequence: 3, targetEvidenceId: "evidence-2", newMappingId: "mapping-other-evidence", capabilityId: "automation", sourceSpanIds: ["span-2"] }),
  ];
  const result = applyTo(source, decisions);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.reviewedBundle.capabilityMappings.map((item) => item.id), ["mapping-first", "mapping-second", "mapping-other-evidence"]);
  const reordered = input();
  reordered.bundle.capabilityMappings = [];
  assert.deepEqual(result, applyTo(reordered, [...decisions].reverse()));
}

{
  const source = input();
  const originalMappingIds = source.bundle.capabilityMappings.map((item) => item.id);
  const result = applyTo(source, [createMappingDecision()]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.reviewedBundle.capabilityMappings.map((item) => item.id), [...originalMappingIds, "mapping-user-created"]);
  }
}

{
  const source = input();
  source.bundle.capabilityMappings = [];
  const decisions: ResumeEvidenceReviewDecision[] = [
    createMappingDecision(),
    { id: "reject-created", sequence: 2, actor: "user", targetType: "capability_mapping", targetId: "mapping-user-created", action: "reject", expectedReviewStatus: "edited", priorDecisionId: "create-mapping" },
    { id: "restore-created", sequence: 3, actor: "user", targetType: "capability_mapping", targetId: "mapping-user-created", action: "restore", expectedReviewStatus: "rejected", priorDecisionId: "reject-created" },
  ];
  const restored = applyTo(source, decisions);
  assert.equal(restored.ok, true);
  if (restored.ok) assert.deepEqual([restored.reviewedBundle.capabilityMappings[0].reviewStatus, restored.reviewedBundle.capabilityMappings[0].method], ["edited", "user"]);
  const rejectedSource = input();
  rejectedSource.bundle.capabilityMappings = [];
  const rejected = applyTo(rejectedSource, decisions.slice(0, 2));
  assert.equal(rejected.ok, true);
  if (rejected.ok) assert.deepEqual([rejected.reviewedBundle.capabilityMappings.length, rejected.reviewedBundle.capabilityMappings[0].reviewStatus], [1, "rejected"]);
  const remapSource = input();
  remapSource.bundle.capabilityMappings = [];
  const remapped = applyTo(remapSource, [
    createMappingDecision(),
    { id: "remap-created", sequence: 2, actor: "user", targetType: "capability_mapping", targetId: "mapping-user-created", action: "remap", expectedReviewStatus: "edited", priorDecisionId: "create-mapping", newMappingId: "mapping-user-remapped", capabilityId: "stakeholder-coordination", relationship: "transferable_signal", sourceSpanIds: ["span-3"] },
  ]);
  assert.equal(remapped.ok, true);
  if (remapped.ok) assert.deepEqual(remapped.reviewedBundle.capabilityMappings.map((item) => [item.id, item.reviewStatus, item.method]), [["mapping-user-created", "rejected", "user"], ["mapping-user-remapped", "edited", "user"]]);
}

{
  const source = input();
  source.bundle.capabilityMappings = [];
  const duplicateId = applyTo(source, [createMappingDecision({ newMappingId: "interpretation-1" })]);
  assert.equal(duplicateId.ok, false);
  if (!duplicateId.ok) assert.equal(duplicateId.issues[0].code, "duplicate_generated_entity_id");
  const mappingCollision = input();
  const collision = applyTo(mappingCollision, [createMappingDecision({ newMappingId: "mapping-1" })]);
  assert.equal(collision.ok, false);
  if (!collision.ok) assert.equal(collision.issues[0].code, "duplicate_generated_entity_id");
  const invalidPriorSource = input();
  invalidPriorSource.bundle.capabilityMappings = [];
  const invalidPrior = applyTo(invalidPriorSource, [createMappingDecision({ priorDecisionId: "missing" })]);
  assert.equal(invalidPrior.ok, false);
  if (!invalidPrior.ok) assert.equal(invalidPrior.issues[0].code, "invalid_prior_decision");
}

{
  const source = input();
  source.bundle.capabilityMappings = [];
  const decisions = [
    createMappingDecision({ id: "create-a", sequence: 1, newMappingId: "mapping-a" }),
    createMappingDecision({ id: "create-b", sequence: 2, newMappingId: "mapping-b", relationship: "transferable_signal" }),
  ];
  const result = applyTo(source, decisions);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, "stale_mapping_state");
  assert.equal(source.bundle.capabilityMappings.length, 0);
}

{
  const sourceA = input();
  sourceA.bundle.capabilityMappings = [];
  const sourceB = structuredClone(sourceA);
  const first = applyTo(sourceA, [createMappingDecision()]);
  const second = applyTo(sourceB, [createMappingDecision({ createdAt: "2099-01-01T00:00:00Z" })]);
  if (first.ok && second.ok) {
    delete second.session.decisions[0].createdAt;
    assert.deepEqual(first, second);
  }
}

{
  const source = input();
  source.bundle.capabilityMappings = [];
  source.bundle.evidenceRecords[2].sourceText = "DISTINCTIVE PRIVATE RESUME CONTENT";
  const result = applyTo(source, [createMappingDecision({ sourceSpanIds: ["span-2"], rationale: "PRIVATE RATIONALE" })]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    const messages = result.issues.map((item) => item.message).join(" ");
    assert.equal(messages.includes("DISTINCTIVE PRIVATE RESUME CONTENT"), false);
    assert.equal(messages.includes("PRIVATE RATIONALE"), false);
  }
}

console.log("resume-evidence-review-apply.test passed");
