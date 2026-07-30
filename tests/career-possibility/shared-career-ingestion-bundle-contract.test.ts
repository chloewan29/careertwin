import assert from "node:assert/strict";
import {
  SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION,
  SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION,
  buildSharedCareerIngestionBundle,
  type SharedCareerIngestionBundle,
} from "../../lib/career-possibility/shared-career-ingestion-bundle-contract";

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
    reviewState: { reviewRevision: "review:revision-a", decisions: [] },
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
const decision = (action: "confirm" | "edit_mapping" | "reject" | "restore" | "remap", targetType: "evidence" | "proposal" | "mapping", targetId: string) => ({
  decisionId: `decision:${action}`, action, targetType, targetId, reviewRevision: "review:revision-a", ...(action === "edit_mapping" || action === "remap" ? { mappingId: "mapping:1", capabilityRegistryVersion: "registry/1" } : {}), provenance: reviewProvenance,
});

assert.equal(SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION, "1.0.0");
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
for (const [action, targetType, targetId] of [
  ["confirm", "proposal", "proposal:1"], ["edit_mapping", "mapping", "mapping:1"], ["reject", "proposal", "proposal:1"], ["restore", "proposal", "proposal:1"], ["remap", "mapping", "mapping:1"],
] as const) {
  const draft = clone();
  draft.reviewState.decisions = [decision(action, targetType, targetId)];
  assert.equal(admitted(draft).reviewState.decisions[0].action, action);
}
rejected((draft) => { draft.reviewState.decisions = [decision("confirm", "evidence", "missing")]; }, "unknown_review_target");
rejected((draft) => { const item = decision("confirm", "proposal", "proposal:1"); draft.reviewState.decisions = [item, item]; }, "duplicate_identity");
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

console.log("shared career ingestion bundle contract tests passed");
