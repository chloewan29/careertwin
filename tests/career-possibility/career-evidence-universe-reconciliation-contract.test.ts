import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  reconcileCareerEvidenceUniverses,
  type ReconcileCareerEvidenceUniversesInput,
  type ReconciliationReasonCode,
} from "../../lib/career-possibility/career-evidence-universe-reconciliation-contract";

const provenance = Object.freeze({ source: "shared_ingestion" as const, version: "ingestion/1" });
const validInput = (): ReconcileCareerEvidenceUniversesInput => ({
  serverUniverse: {
    schemaVersion: "1.0.0", opaqueSubjectId: "subject-1", sourceRevision: "sha256:source-1", careerRevision: "career-revision-1", capabilityRegistryVersion: "registry-1",
    evidenceReferences: [{ evidencePieceId: "server-evidence-1", evidenceSignalIds: ["server-signal-1"] }], capabilityReferences: [{ serverCapabilityId: "server-capability-1" }],
  },
  localUniverse: {
    schemaVersion: "1.0.0", opaqueSubjectId: "subject-1", intakeSessionId: "intake-1", sourceRevision: "sha256:source-1", capabilityRegistryVersion: "registry-1",
    evidenceReferences: [{ localEvidenceId: "local-evidence-1" }], canonicalMappings: [{ mappingId: "local-mapping-1", localEvidenceId: "local-evidence-1", canonicalCapabilityId: "analytics-governance", provenance }],
  },
  evidenceCorrespondences: [{ correspondenceId: "evidence-link-1", serverEvidencePieceId: "server-evidence-1", serverEvidenceSignalIds: ["server-signal-1"], localEvidenceId: "local-evidence-1", sourceRevision: "sha256:source-1", provenance }],
  capabilityCorrespondences: [{ correspondenceId: "capability-link-1", serverCapabilityId: "server-capability-1", canonicalCapabilityId: "analytics-governance", localMappingId: "local-mapping-1", provenance }],
});
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const reasons = (input: ReconcileCareerEvidenceUniversesInput) => { const result = reconcileCareerEvidenceUniverses(input); assert.equal(result.status, "unreconciled"); return new Set(result.status === "unreconciled" ? result.reasons.map((reason) => reason.code) : []); };
const has = (input: ReconcileCareerEvidenceUniversesInput, code: ReconciliationReasonCode) => assert.equal(reasons(input).has(code), true, `expected ${code}`);

const input = validInput(); const before = JSON.stringify(input); const reconciled = reconcileCareerEvidenceUniverses(input);
assert.equal(reconciled.status, "reconciled"); assert.equal(JSON.stringify(input), before); assert.equal(Object.isFrozen(reconciled), true);
if (reconciled.status === "reconciled") { assert.equal(Object.isFrozen(reconciled.evidenceCorrespondences), true); assert.equal(Object.isFrozen(reconciled.evidenceCorrespondences[0].provenance), true); assert.equal(reconciled.opaqueSubjectId, "subject-1"); }
assert.deepEqual(reconcileCareerEvidenceUniverses(input), reconciled); assert.deepEqual(JSON.parse(JSON.stringify(reconciled)), reconciled);

let changed = clone(validInput()); changed.localUniverse.opaqueSubjectId = "subject-2"; has(changed, "subject_mismatch");
changed = clone(validInput()); changed.serverUniverse.opaqueSubjectId = null; has(changed, "missing_server_subject");
changed = clone(validInput()); changed.localUniverse.opaqueSubjectId = null; has(changed, "missing_local_subject");
changed = clone(validInput()); changed.serverUniverse.sourceRevision = null; has(changed, "missing_server_revision");
changed = clone(validInput()); changed.localUniverse.sourceRevision = null; has(changed, "missing_local_revision");
changed = clone(validInput()); changed.localUniverse.sourceRevision = "sha256:different"; has(changed, "source_revision_mismatch");

changed = clone(validInput()); changed.evidenceCorrespondences = []; has(changed, "missing_evidence_identity");
changed = clone(validInput()); changed.serverUniverse.evidenceReferences = [...changed.serverUniverse.evidenceReferences, { evidencePieceId: "server-evidence-2", evidenceSignalIds: [] }]; has(changed, "partial_evidence_correspondence");
changed = clone(validInput()); changed.localUniverse.evidenceReferences = [...changed.localUniverse.evidenceReferences, { localEvidenceId: "local-evidence-2" }]; changed.evidenceCorrespondences = [...changed.evidenceCorrespondences, { ...changed.evidenceCorrespondences[0], correspondenceId: "evidence-link-2", serverEvidencePieceId: "server-evidence-1", localEvidenceId: "local-evidence-2" }]; has(changed, "ambiguous_evidence_correspondence");
changed = clone(validInput()); changed.evidenceCorrespondences[0].serverEvidencePieceId = "unknown"; has(changed, "invalid_input");
changed = clone(validInput()); changed.evidenceCorrespondences[0].provenance.version = ""; has(changed, "invalid_input");

changed = clone(validInput()); changed.capabilityCorrespondences[0].canonicalCapabilityId = "same-display-label-is-insufficient"; has(changed, "canonical_mapping_mismatch");
changed = clone(validInput()); changed.capabilityCorrespondences = []; has(changed, "canonical_mapping_missing");
changed = clone(validInput()); changed.serverUniverse.capabilityReferences = []; changed.localUniverse.canonicalMappings = []; changed.capabilityCorrespondences = []; has(changed, "canonical_mapping_missing");
changed = clone(validInput()); changed.localUniverse.capabilityRegistryVersion = "registry-2"; has(changed, "capability_registry_version_mismatch");
changed = clone(validInput()); (changed.serverUniverse as { schemaVersion: string }).schemaVersion = "2.0.0"; has(changed, "unsupported_schema_version");
changed = clone(validInput()); changed.serverUniverse.evidenceReferences = [...changed.serverUniverse.evidenceReferences, clone(changed.serverUniverse.evidenceReferences[0])]; has(changed, "invalid_input");
changed = clone(validInput()); changed.evidenceCorrespondences = [...changed.evidenceCorrespondences, clone(changed.evidenceCorrespondences[0])]; has(changed, "invalid_input");
changed = clone(validInput()); changed.serverUniverse.capabilityReferences = [...changed.serverUniverse.capabilityReferences, { serverCapabilityId: "server-capability-2" }]; changed.capabilityCorrespondences = [...changed.capabilityCorrespondences, { ...changed.capabilityCorrespondences[0], correspondenceId: "capability-link-2", serverCapabilityId: "server-capability-2", canonicalCapabilityId: "different-canonical" }]; has(changed, "canonical_mapping_mismatch");
changed = clone(validInput()); changed.serverUniverse.evidenceReferences = []; changed.localUniverse.evidenceReferences = []; changed.evidenceCorrespondences = []; has(changed, "missing_evidence_identity");

const source = readFileSync("lib/career-possibility/career-evidence-universe-reconciliation-contract.ts", "utf8");
assert.equal(/rawText|resumeText|evidence_raw_text|supabase|localStorage|fetch\(|createServer|buildCandidateCapabilityBaseline|buildGenericCareerPathAlignment|React/i.test(source), false);
assert.equal(/displayName|canonical_name|\.toLowerCase\(\)|hash|crypto/i.test(source), false);
console.log("career evidence universe reconciliation contract tests passed");
