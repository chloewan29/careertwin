import assert from "node:assert/strict";
import {
  SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION,
  SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION,
  buildSharedCareerIngestionBundle,
  type SharedCareerIngestionBundle,
  type SharedReviewDecision,
} from "../../lib/career-possibility/shared-career-ingestion-bundle-contract";
import { buildCareerReviewDecisionIdentityContract } from "../../lib/career-possibility/career-review-decision-identity-contract";

const provenance = { source: "shared_ingestion" as const, actorClass: "deterministic_parser" as const, version: "parser/1" };
const reviewProvenance = { source: "user_review" as const, actorClass: "user" as const, version: "review/1" };

function validBundle(): SharedCareerIngestionBundle {
  return {
    schemaVersion: SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION,
    identityModelVersion: SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION,
    bundleId: "bundle:source-a",
    sourceRevision: "source:revision-a",
    sourceSet: [{ sourceDocumentId: "document:1", sourceType: "pasted_text", sourceRevision: "source:revision-a", ordinal: 0, characterLength: 240, provenance }],
    subjectBinding: { status: "anonymous", anonymousSubjectId: "anonymous:1", authenticatedSubjectId: null },
    employmentRecords: [{ employmentRecordId: "employment:1", sourceDocumentId: "document:1", sourceRevision: "source:revision-a", sourceLocator: { locatorId: "locator:employment:1", startOffset: 0, endOffset: 100 }, employer: "Example employer", roleTitle: "Example role", lineage: { kind: "original" }, provenance }],
    evidenceRecords: [{ evidenceId: "evidence:1", employmentRecordId: "employment:1", sourceDocumentId: "document:1", sourceRevision: "source:revision-a", sourceLocator: { locatorId: "locator:evidence:1", startOffset: 20, endOffset: 80 }, sourceExcerptReference: "excerpt:1", action: "Improved a process", lineage: { kind: "original" }, provenance }],
    capabilityProposals: [{ proposalId: "proposal:1", evidenceId: "evidence:1", proposalSource: "deterministic_parser", proposalVersion: "proposal/1", proposedCapabilityId: "capability:operations", provenance }],
    canonicalMappings: [{ mappingId: "mapping:1", proposalId: "proposal:1", evidenceId: "evidence:1", canonicalCapabilityId: "capability:operations", relationship: "direct_evidence", mappingVersion: "mapping/1", capabilityRegistryVersion: "registry/1", provenance: reviewProvenance }],
    reviewState: { reviewRevision: "review:revision-a", interpretations: [{ interpretationId: "interpretation:1", evidenceId: "evidence:1" }], decisions: [] },
    materializationState: { status: "not_materialized", materializationRevision: null, materializerVersion: null },
    capabilityRegistryVersion: "registry/1",
    provenance,
  };
}

const clone = () => structuredClone(validBundle()) as SharedCareerIngestionBundle;
const admitted = (bundle: SharedCareerIngestionBundle = validBundle()) => {
  const result = buildSharedCareerIngestionBundle(bundle);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("Expected admission.");
  return result.bundle;
};
// Invalid-shape tests intentionally cross the static contract boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rejected = (mutate: (draft: Record<string, any>) => void, code: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draft = structuredClone(validBundle()) as unknown as Record<string, any>;
  mutate(draft);
  const result = buildSharedCareerIngestionBundle(draft as SharedCareerIngestionBundle);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error(`Expected ${code}.`);
  assert.equal(result.issues.some((issue) => issue.code === code), true, JSON.stringify(result.issues));
};
const evidenceTarget = { type: "evidence" as const, evidenceId: "evidence:1" };
const employmentTarget = { type: "employment_field" as const, employmentRecordId: "employment:1", field: "roleTitle" as const };
const evidenceFieldTarget = { type: "evidence_field" as const, evidenceId: "evidence:1", field: "action" as const };
const interpretationTarget = { type: "interpretation" as const, interpretationId: "interpretation:1" };
const mappingTarget = { type: "mapping" as const, mappingId: "mapping:1" };
const decision = (action: "confirm" | "reject" | "restore", target = evidenceTarget, sequence = 1, priorDecisionId?: string) => ({
  decisionId: `decision:${sequence}:${action}`,
  sequence,
  action,
  target,
  reviewRevision: "review:revision-a",
  ...(priorDecisionId ? { priorDecisionId } : {}),
  provenance: reviewProvenance,
});

assert.equal(SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION, "1.1.0");
assert.equal(SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION, "1.0.0");
const anonymous = admitted();
const claimedDraft = clone();
claimedDraft.subjectBinding = { status: "claimed", anonymousSubjectId: "anonymous:1", authenticatedSubjectId: "subject:1", claimRevision: "claim:1" };
assert.equal(admitted(claimedDraft).sourceRevision, anonymous.sourceRevision);
rejected((draft) => { draft.bundleId = ""; }, "missing_identity");
rejected((draft) => { draft.sourceRevision = ""; }, "missing_identity");
rejected((draft) => { draft.sourceSet = []; }, "empty_source_set");
rejected((draft) => { draft.employmentRecords = []; }, "empty_employment_records");
rejected((draft) => { draft.evidenceRecords = []; }, "empty_evidence_records");
rejected((draft) => { draft.sourceSet.push(draft.sourceSet[0]); }, "duplicate_identity");
rejected((draft) => { draft.employmentRecords.push(draft.employmentRecords[0]); }, "duplicate_identity");
rejected((draft) => { draft.evidenceRecords.push(draft.evidenceRecords[0]); }, "duplicate_identity");
rejected((draft) => { draft.employmentRecords[0].sourceDocumentId = "missing"; }, "unknown_source_document");
rejected((draft) => { draft.evidenceRecords[0].employmentRecordId = "missing"; }, "unknown_employment_record");

const displayChange = clone();
displayChange.employmentRecords[0] = { ...displayChange.employmentRecords[0], employer: "Changed display employer" };
assert.equal(admitted(displayChange).evidenceRecords[0].evidenceId, anonymous.evidenceRecords[0].evidenceId);
const reordered = clone();
reordered.sourceSet[0] = { ...reordered.sourceSet[0], ordinal: 9 };
assert.equal(admitted(reordered).evidenceRecords[0].evidenceId, "evidence:1");
assert.equal(admitted().evidenceRecords[0].lineage.kind, "original");

const split = clone();
split.evidenceRecords.push({ ...split.evidenceRecords[0], evidenceId: "evidence:2", sourceExcerptReference: "excerpt:2", lineage: { kind: "split", derivedFrom: [{ scope: "bundle", evidenceId: "evidence:1" }] } });
assert.equal(admitted(split).evidenceRecords[1].lineage.kind, "split");
const merged = structuredClone(split);
merged.evidenceRecords.push({ ...merged.evidenceRecords[0], evidenceId: "evidence:3", sourceExcerptReference: "excerpt:3", lineage: { kind: "merged", derivedFrom: [{ scope: "bundle", evidenceId: "evidence:1" }, { scope: "bundle", evidenceId: "evidence:2" }] } });
assert.equal(admitted(merged).evidenceRecords[2].lineage.kind, "merged");
rejected((draft) => { draft.evidenceRecords[0].lineage = { kind: "split", derivedFrom: [{ scope: "bundle", evidenceId: "evidence:1" }] }; }, "self_lineage");
rejected((draft) => {
  draft.evidenceRecords.push({ ...draft.evidenceRecords[0], evidenceId: "evidence:2", lineage: { kind: "split", derivedFrom: [{ scope: "bundle", evidenceId: "evidence:1" }] } });
  draft.evidenceRecords[0].lineage = { kind: "split", derivedFrom: [{ scope: "bundle", evidenceId: "evidence:2" }] };
}, "circular_lineage");
rejected((draft) => { draft.evidenceRecords[0].lineage = { kind: "split", derivedFrom: [{ scope: "bundle", evidenceId: "missing" }] }; }, "unknown_predecessor");
const prior = clone();
prior.evidenceRecords[0].lineage = { kind: "superseded", derivedFrom: [{ scope: "prior_revision", evidenceId: "old:evidence", sourceRevision: "source:old", bundleId: "bundle:old" }] };
assert.equal(admitted(prior).evidenceRecords[0].lineage.kind, "superseded");

assert.equal(admitted().reviewState.decisions.length, 0);
for (const target of [evidenceTarget, employmentTarget, evidenceFieldTarget, interpretationTarget, mappingTarget] as const) {
  const draft = clone();
  draft.reviewState.decisions = [decision("confirm", target)];
  assert.deepEqual(admitted(draft).reviewState.decisions[0].target, target);
}
for (const target of [evidenceTarget, employmentTarget, evidenceFieldTarget, interpretationTarget, mappingTarget] as const) {
  const draft = clone();
  draft.reviewState.decisions = [decision("reject", target, 1), decision("restore", target, 2, "decision:1:reject")];
  assert.deepEqual(admitted(draft).reviewState.decisions.map((item) => item.action), ["reject", "restore"]);
}

for (const target of [employmentTarget, evidenceFieldTarget, interpretationTarget] as const) {
  const draft = clone();
  draft.reviewState.decisions = [{ decisionId: `decision:edit:${target.type}`, sequence: 1, action: "edit", target, reviewRevision: "review:revision-a", semanticPayloadRevision: "semantic-payload:1", provenance: reviewProvenance }];
  const admittedDecision = admitted(draft).reviewState.decisions[0];
  assert.equal(admittedDecision.action, "edit");
  assert.deepEqual(admittedDecision.target, target);
}

const creation = clone();
creation.reviewState.decisions = [{
  decisionId: "decision:create-mapping", sequence: 1, action: "create_mapping", target: evidenceTarget,
  reviewRevision: "review:revision-a", proposalId: "proposal:1", mappingId: "mapping:1",
  canonicalCapabilityId: "capability:operations", relationship: "direct_evidence", capabilityRegistryVersion: "registry/1", provenance: reviewProvenance,
}];
assert.equal(admitted(creation).reviewState.decisions[0].action, "create_mapping");

function addRemap(bundle: SharedCareerIngestionBundle, suffix: string, oldMappingId: string, evidenceId = "evidence:1") {
  const proposalId = `proposal:${suffix}`;
  const mappingId = `mapping:${suffix}`;
  (bundle.capabilityProposals as Array<SharedCareerIngestionBundle["capabilityProposals"][number]>).push({ proposalId, evidenceId, proposalSource: "user", proposalVersion: "proposal/1", proposedCapabilityId: `capability:${suffix}`, provenance: reviewProvenance });
  (bundle.canonicalMappings as Array<SharedCareerIngestionBundle["canonicalMappings"][number]>).push({ mappingId, proposalId, evidenceId, canonicalCapabilityId: `capability:${suffix}`, relationship: "transferable_signal", mappingVersion: "mapping/1", capabilityRegistryVersion: "registry/1", supersedesMappingId: oldMappingId, provenance: reviewProvenance });
  return { proposalId, mappingId, canonicalCapabilityId: `capability:${suffix}` };
}

const remap = clone();
const remapOne = addRemap(remap, "coordination", "mapping:1");
remap.reviewState.decisions = [{
  decisionId: "decision:remap:1", sequence: 1, action: "remap", target: mappingTarget,
  reviewRevision: "review:revision-a", ...remapOne, relationship: "transferable_signal", capabilityRegistryVersion: "registry/1", provenance: reviewProvenance,
}];
assert.equal(admitted(remap).canonicalMappings[1].supersedesMappingId, "mapping:1");

const repeatedRemap = structuredClone(remap);
const remapTwo = addRemap(repeatedRemap, "insight", remapOne.mappingId);
repeatedRemap.reviewState.decisions = [
  remap.reviewState.decisions[0],
  { decisionId: "decision:remap:2", sequence: 2, action: "remap", target: { type: "mapping", mappingId: remapOne.mappingId }, reviewRevision: "review:revision-a", priorDecisionId: "decision:remap:1", ...remapTwo, relationship: "transferable_signal", capabilityRegistryVersion: "registry/1", provenance: reviewProvenance },
];
assert.equal(admitted(repeatedRemap).canonicalMappings.length, 3);

rejected((draft) => { draft.reviewState.decisions = [decision("confirm", { type: "employment_field", employmentRecordId: "missing", field: "roleTitle" })]; }, "unknown_employment_reference");
rejected((draft) => { draft.reviewState.decisions = [decision("confirm", { type: "evidence", evidenceId: "missing" })]; }, "unknown_evidence_reference");
rejected((draft) => { draft.reviewState.decisions = [decision("confirm", { type: "interpretation", interpretationId: "missing" })]; }, "unknown_interpretation_reference");
rejected((draft) => { draft.reviewState.decisions = [decision("confirm", { type: "mapping", mappingId: "missing" })]; }, "unknown_mapping_reference");
rejected((draft) => { draft.reviewState.decisions = [{ ...decision("confirm"), target: { type: "unsupported", targetId: "x" } }]; }, "unsupported_review_target");
rejected((draft) => { draft.reviewState.decisions = [{ ...decision("confirm"), action: "unsupported" }]; }, "unsupported_review_action");
rejected((draft) => { draft.reviewState.decisions = [{ ...decision("confirm"), action: "edit" }]; }, "invalid_review_action_target");
rejected((draft) => { draft.reviewState.decisions = [{ decisionId: "decision:edit", sequence: 1, action: "edit", target: evidenceFieldTarget, reviewRevision: "review:revision-a", provenance: reviewProvenance }]; }, "missing_semantic_payload_revision");
rejected((draft) => { draft.reviewState.decisions = [{ ...decision("confirm"), semanticPayloadRevision: "unexpected" }]; }, "unexpected_semantic_payload_revision");
rejected((draft) => { const item = decision("confirm"); draft.reviewState.decisions = [item, { ...item, sequence: 2 }]; }, "duplicate_review_decision_id");
rejected((draft) => { draft.reviewState.decisions = [decision("confirm"), { ...decision("reject"), decisionId: "decision:other" }]; }, "duplicate_review_decision_sequence");
rejected((draft) => { draft.reviewState.decisions = [{ ...decision("confirm"), sequence: 0 }]; }, "invalid_review_decision_sequence");
rejected((draft) => { draft.reviewState.decisions = [{ ...decision("confirm"), priorDecisionId: "missing" }]; }, "unknown_prior_decision");
rejected((draft) => { draft.reviewState.decisions = [decision("confirm"), { ...decision("confirm", mappingTarget, 2, "decision:1:confirm"), decisionId: "decision:mismatch" }]; }, "prior_decision_target_mismatch");
rejected((draft) => { draft.reviewState.decisions = [decision("confirm"), decision("reject", evidenceTarget, 2, "decision:1:confirm"), decision("confirm", evidenceTarget, 3, "decision:1:confirm")]; }, "prior_decision_not_latest");
rejected((draft) => { draft.reviewState.decisions = [decision("confirm"), decision("restore", evidenceTarget, 2, "decision:1:confirm")]; }, "invalid_restore");

rejected((draft) => { draft.reviewState.decisions = [{ ...creation.reviewState.decisions[0], proposalId: "missing" }]; }, "unknown_proposal_reference");
rejected((draft) => { draft.reviewState.decisions = [{ ...creation.reviewState.decisions[0], mappingId: "missing" }]; }, "unknown_mapping_reference");
rejected((draft) => { draft.reviewState.decisions = [{ ...creation.reviewState.decisions[0], canonicalCapabilityId: "capability:wrong" }]; }, "invalid_mapping_creation");
rejected((draft) => {
  const created = addRemap(draft as SharedCareerIngestionBundle, "wrong", "mapping:1", "evidence:1");
  draft.reviewState.decisions = [{ decisionId: "decision:remap", sequence: 1, action: "remap", target: mappingTarget, reviewRevision: "review:revision-a", ...created, relationship: "transferable_signal", capabilityRegistryVersion: "registry/1", provenance: reviewProvenance }];
  draft.canonicalMappings.at(-1).supersedesMappingId = undefined;
}, "invalid_remap");
rejected((draft) => { draft.canonicalMappings[0].supersedesMappingId = "mapping:1"; }, "self_supersession");
rejected((draft) => {
  const first = addRemap(draft as SharedCareerIngestionBundle, "cycle", "mapping:1");
  draft.canonicalMappings[0].supersedesMappingId = first.mappingId;
}, "circular_supersession");

const order = clone();
order.reviewState.decisions = [decision("confirm", mappingTarget, 2), decision("confirm", evidenceTarget, 1)];
assert.deepEqual(admitted(order).reviewState.decisions.map((item) => item.sequence), [1, 2]);
rejected((draft) => { draft.canonicalMappings[0].mappingId = "capability:operations"; }, "mapping_identity_collision");
rejected((draft) => { draft.canonicalMappings[0].capabilityRegistryVersion = "registry/old"; }, "registry_version_mismatch");
rejected((draft) => { draft.subjectBinding = { status: "claimed", anonymousSubjectId: "anonymous:1", authenticatedSubjectId: "", claimRevision: "" }; }, "missing_identity");

assert.equal(admitted().materializationState.status, "not_materialized");
const materialized = clone();
materialized.materializationState = { status: "materialized", materializationRevision: "materialization:1", materializerVersion: "materializer/1" };
assert.equal(admitted(materialized).materializationState.status, "materialized");
rejected((draft) => { draft.materializationState = { status: "materialized", materializationRevision: "", materializerVersion: null }; }, "missing_identity");
rejected((draft) => { draft.reviewState.reviewRevision = draft.sourceRevision; }, "revision_identity_collision");
rejected((draft) => { draft.materializationState = { status: "materialized", materializationRevision: draft.reviewState.reviewRevision, materializerVersion: "v1" }; }, "revision_identity_collision");

const successor = clone();
successor.bundleId = "bundle:source-b";
successor.sourceRevision = "source:revision-b";
successor.previousBundle = { bundleId: "bundle:source-a", sourceRevision: "source:revision-a" };
successor.sourceSet = successor.sourceSet.map((item) => ({ ...item, sourceRevision: successor.sourceRevision }));
successor.employmentRecords = successor.employmentRecords.map((item) => ({ ...item, sourceRevision: successor.sourceRevision }));
successor.evidenceRecords = successor.evidenceRecords.map((item) => ({ ...item, sourceRevision: successor.sourceRevision }));
assert.equal(admitted(successor).previousBundle?.sourceRevision, "source:revision-a");
rejected((draft) => { draft.previousBundle = { bundleId: "bundle:old", sourceRevision: draft.sourceRevision }; }, "unchanged_successor_revision");

const sourceInput = clone();
const before = structuredClone(sourceInput);
const output = admitted(sourceInput);
assert.deepEqual(sourceInput, before);
assert.notEqual(output, sourceInput);
assert.equal(Object.isFrozen(output), true);
assert.equal(Object.isFrozen(output.sourceSet), true);
assert.equal(Object.isFrozen(output.sourceSet[0].provenance), true);
assert.equal(Object.isFrozen(output.evidenceRecords[0].sourceLocator), true);
assert.equal(Object.isFrozen(output.reviewState.decisions), true);
const frozenDecisionDraft = clone();
frozenDecisionDraft.reviewState.decisions = [decision("confirm")];
const frozenDecisionOutput = admitted(frozenDecisionDraft);
assert.equal(Object.isFrozen(frozenDecisionOutput.reviewState.decisions[0]), true);
assert.equal(Object.isFrozen(frozenDecisionOutput.reviewState.decisions[0].target), true);
assert.equal(Object.isFrozen(output.materializationState), true);
assert.deepEqual(JSON.parse(JSON.stringify(output)), output);
assert.deepEqual(buildSharedCareerIngestionBundle(validBundle()), buildSharedCareerIngestionBundle(validBundle()));
assert.equal("rawText" in output.sourceSet[0], false);
assert.equal("ownership" in output.evidenceRecords[0], false);
assert.equal("scope" in output.evidenceRecords[0], false);
assert.equal("impactSignal" in output.evidenceRecords[0], false);
assert.equal("strengthScore" in output, false);

// Structural projection evidence: both universes can retain the same subject, revision, evidence and registry identities.
const localProjection = { opaqueSubjectId: output.subjectBinding.anonymousSubjectId, intakeSessionId: output.bundleId, sourceRevision: output.sourceRevision, capabilityRegistryVersion: output.capabilityRegistryVersion, evidenceIds: output.evidenceRecords.map((item) => item.evidenceId), mappingIds: output.canonicalMappings.map((item) => item.mappingId) };
const serverProjectionSeed = { opaqueSubjectId: output.subjectBinding.anonymousSubjectId, sourceRevision: output.sourceRevision, evidenceIds: output.evidenceRecords.map((item) => item.evidenceId), capabilityRegistryVersion: output.capabilityRegistryVersion };
assert.equal(localProjection.opaqueSubjectId, serverProjectionSeed.opaqueSubjectId);
assert.equal(localProjection.sourceRevision, serverProjectionSeed.sourceRevision);
assert.deepEqual(localProjection.evidenceIds, serverProjectionSeed.evidenceIds);

async function proveStableIdentityProjection(): Promise<void> {
  const stableEvidence = "career-evidence:1.0.0:evidence-a";
  const stableEmployment = "career-employment:1.0.0:employment-a";
  const stableInterpretation = "career-interpretation:1.0.0:interpretation-a";
  const stableExistingMapping = "career-shared-mapping:1.0.0:mapping-a";
  const base = {
    manifestRevision: "career-source-manifest:1.0.0:manifest-a",
    sourceRevision: "career-source-revision:1.0.0:source-a",
    capabilityRegistryVersion: "registry/1",
    evidenceIds: [stableEvidence],
    employmentIds: [stableEmployment],
    interpretationIds: [stableInterpretation],
    existingMappings: [{ mappingId: stableExistingMapping, evidenceId: stableEvidence }],
  };
  const prefix = await buildCareerReviewDecisionIdentityContract({
    ...base,
    decisions: [
      { decisionKey: "confirm", sequence: 1, targetType: "evidence", targetId: stableEvidence, action: "confirm" },
      { decisionKey: "employment-edit", sequence: 2, targetType: "employment_field", targetId: stableEmployment, field: "roleTitle", action: "edit", semanticPayloadRevision: "semantic:employment" },
      { decisionKey: "evidence-reject", sequence: 3, targetType: "evidence_field", targetId: stableEvidence, field: "action", action: "reject" },
      { decisionKey: "interpretation-reject", sequence: 4, targetType: "interpretation", targetId: stableInterpretation, action: "reject" },
      { decisionKey: "interpretation-restore", sequence: 5, priorDecisionKey: "interpretation-reject", targetType: "interpretation", targetId: stableInterpretation, action: "restore" },
      { decisionKey: "create", sequence: 6, priorDecisionKey: "confirm", targetType: "evidence", targetId: stableEvidence, action: "create_mapping", canonicalCapabilityId: "capability:operations", relationship: "direct_evidence" },
    ],
  });
  const createdMappingId = prefix.mappings[0].mappingId;
  const stable = await buildCareerReviewDecisionIdentityContract({
    ...base,
    decisions: [
      { decisionKey: "confirm", sequence: 1, targetType: "evidence", targetId: stableEvidence, action: "confirm" },
      { decisionKey: "employment-edit", sequence: 2, targetType: "employment_field", targetId: stableEmployment, field: "roleTitle", action: "edit", semanticPayloadRevision: "semantic:employment" },
      { decisionKey: "evidence-reject", sequence: 3, targetType: "evidence_field", targetId: stableEvidence, field: "action", action: "reject" },
      { decisionKey: "interpretation-reject", sequence: 4, targetType: "interpretation", targetId: stableInterpretation, action: "reject" },
      { decisionKey: "interpretation-restore", sequence: 5, priorDecisionKey: "interpretation-reject", targetType: "interpretation", targetId: stableInterpretation, action: "restore" },
      { decisionKey: "create", sequence: 6, priorDecisionKey: "confirm", targetType: "evidence", targetId: stableEvidence, action: "create_mapping", canonicalCapabilityId: "capability:operations", relationship: "direct_evidence" },
      { decisionKey: "remap", sequence: 7, priorDecisionKey: "create", targetType: "mapping", targetId: createdMappingId, action: "remap", evidenceId: stableEvidence, canonicalCapabilityId: "capability:coordination", relationship: "transferable_signal" },
    ],
  });

  const bySequence = new Map(stable.decisions.map((item) => [item.sequence, item]));
  const projected: SharedReviewDecision[] = [
    { decisionId: bySequence.get(1)!.decisionId, sequence: 1, action: "confirm", target: { type: "evidence", evidenceId: stableEvidence }, reviewRevision: "review:revision", provenance: reviewProvenance },
    { decisionId: bySequence.get(2)!.decisionId, sequence: 2, action: "edit", target: { type: "employment_field", employmentRecordId: stableEmployment, field: "roleTitle" }, reviewRevision: "review:revision", semanticPayloadRevision: bySequence.get(2)!.semanticPayloadRevision!, provenance: reviewProvenance },
    { decisionId: bySequence.get(3)!.decisionId, sequence: 3, action: "reject", target: { type: "evidence_field", evidenceId: stableEvidence, field: "action" }, reviewRevision: "review:revision", provenance: reviewProvenance },
    { decisionId: bySequence.get(5)!.decisionId, sequence: 5, action: "restore", target: { type: "interpretation", interpretationId: stableInterpretation }, reviewRevision: "review:revision", priorDecisionId: bySequence.get(5)!.priorDecisionId, provenance: reviewProvenance },
    { decisionId: bySequence.get(6)!.decisionId, sequence: 6, action: "create_mapping", target: { type: "evidence", evidenceId: stableEvidence }, reviewRevision: "review:revision", proposalId: bySequence.get(6)!.proposalId!, mappingId: bySequence.get(6)!.mappingId!, canonicalCapabilityId: stable.mappings.find((item) => item.mappingId === bySequence.get(6)!.mappingId)!.canonicalCapabilityId, relationship: "direct_evidence", capabilityRegistryVersion: "registry/1", provenance: reviewProvenance },
    { decisionId: bySequence.get(7)!.decisionId, sequence: 7, action: "remap", target: { type: "mapping", mappingId: createdMappingId }, reviewRevision: "review:revision", proposalId: bySequence.get(7)!.proposalId!, mappingId: bySequence.get(7)!.mappingId!, canonicalCapabilityId: "capability:coordination", relationship: "transferable_signal", capabilityRegistryVersion: "registry/1", provenance: reviewProvenance },
  ];
  assert.deepEqual(projected.map((item) => item.action), ["confirm", "edit", "reject", "restore", "create_mapping", "remap"]);
  assert.equal("value" in projected[1], false);
  assert.equal("rationale" in projected[1], false);
}

void proveStableIdentityProjection().then(() => console.log("shared career ingestion bundle contract tests passed"));
