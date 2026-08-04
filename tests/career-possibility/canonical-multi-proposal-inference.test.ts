import assert from "node:assert/strict";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { inferCanonicalPersonalCapabilities, inferCanonicalPersonalCapability } from "../../lib/career-possibility/canonical-personal-capability-inference";
import { CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION, type CanonicalInferencePolicy, type CanonicalSemanticSignal } from "../../lib/career-possibility/canonical-personal-capability-inference-contract";
import { materializeProvisionalCareerMap } from "../../lib/career-possibility/provisional-career-map-materializer";
import { mapProvisionalResumeEvidencePlural } from "../../lib/career-possibility/provisional-resume-capability-mapper";

const definitions = canonicalCapabilityLibrary.capabilities;
const registryVersion = canonicalCapabilityLibrary.contentVersion;
const signal = (field: CanonicalSemanticSignal["field"], value: string): CanonicalSemanticSignal => ({ field, value });
const evidence = (signals: readonly CanonicalSemanticSignal[], evidenceId = "evidence:shared") => ({ evidenceId, sourceExcerpt: "Privacy-safe plural inference fixture.", sourceLocator: { locatorId: `locator:${evidenceId}`, startOffset: 0, endOffset: 12 }, sourceRevision: "source:1", signals });
const rule = (ruleId: string, capabilityId: string, relationship: "direct_evidence" | "transferable_signal", requiredSignals: readonly CanonicalSemanticSignal[]) => ({ ruleId, ruleVersion: "1.0.0", capabilityId, relationship, requiredSignals, excludedSignals: [], explanation: `Authored ${capabilityId} fixture.` });
const policy = (rules: CanonicalInferencePolicy["rules"]): CanonicalInferencePolicy => ({ policyVersion: "plural-audit/1.0.0", coverage: "bounded_non_exhaustive", rules });
const infer = (signals: readonly CanonicalSemanticSignal[], rules: CanonicalInferencePolicy["rules"]) => inferCanonicalPersonalCapabilities({ evidence: evidence(signals), policy: policy(rules), capabilityDefinitions: definitions, capabilityRegistryVersion: registryVersion });

async function main() {
  const a = signal("action", "a"); const b = signal("ownership", "b"); const c = signal("outcome", "c");
  const oneRule = rule("rule:a", "research-design", "direct_evidence", [a]);
  const twoRule = rule("rule:b", "process-improvement", "direct_evidence", [b]);
  const threeRule = rule("rule:c", "insight-synthesis", "transferable_signal", [c]);

  const unsupported = await infer([signal("context", "uncovered")], [oneRule]);
  assert.equal(unsupported.contractVersion, CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION);
  assert.deepEqual([unsupported.admittedProposals.length, unsupported.unresolved.length, unsupported.unsupportedResidue.length], [0, 0, 1]);

  const one = await infer([a], [oneRule]);
  assert.deepEqual([one.admittedProposals.length, one.unresolved.length], [1, 0]);
  const two = await infer([a, b], [twoRule, oneRule]);
  assert.deepEqual(two.admittedProposals.map((item) => item.capabilityId), ["process-improvement", "research-design"]);
  const three = await infer([a, b, c], [threeRule, oneRule, twoRule]);
  assert.deepEqual(three.admittedProposals.map((item) => item.capabilityId), ["insight-synthesis", "process-improvement", "research-design"]);
  const reordered = await infer([c, b, a], [twoRule, threeRule, oneRule]);
  assert.deepEqual(reordered, three);
  assert.equal(new Set(three.admittedProposals.map((item) => item.proposalId)).size, 3);
  assert.equal(three.admittedProposals.every((item) => item.evidenceId === "evidence:shared"), true);

  const duplicate = await infer([a], [oneRule, rule("rule:a-duplicate", "research-design", "direct_evidence", [a])]);
  assert.equal(duplicate.admittedProposals.length, 1);
  assert.deepEqual(duplicate.admittedProposals[0].matchingRuleIds, ["rule:a", "rule:a-duplicate"]);
  const conflictRule = rule("rule:a-transferable", "research-design", "transferable_signal", [a]);
  const conflict = await infer([a], [oneRule, conflictRule]);
  assert.deepEqual([conflict.admittedProposals.length, conflict.unresolved.length, conflict.unresolved[0].reason], [0, 1, "relationship_conflict"]);
  assert.ok(conflict.unresolved[0].unresolvedId);
  assert.deepEqual(conflict, await infer([a], [conflictRule, oneRule]));
  const mixed = await infer([a, b], [oneRule, conflictRule, twoRule]);
  assert.deepEqual(mixed.admittedProposals.map((item) => item.capabilityId), ["process-improvement"]);
  assert.deepEqual(mixed.unresolved.map((item) => item.capabilityId), ["research-design"]);

  const validWithUnmatched = await infer([a, signal("context", "unmatched")], [oneRule]);
  assert.deepEqual([validWithUnmatched.admittedProposals.length, validWithUnmatched.unsupportedResidue.length], [1, 0]);
  const legacyOne = await inferCanonicalPersonalCapability({ evidence: evidence([a]), policy: policy([oneRule]), capabilityDefinitions: definitions, capabilityRegistryVersion: registryVersion });
  assert.equal(legacyOne.disposition, "admitted");
  const legacyMany = await inferCanonicalPersonalCapability({ evidence: evidence([a, b]), policy: policy([oneRule, twoRule]), capabilityDefinitions: definitions, capabilityRegistryVersion: registryVersion });
  assert.equal(legacyMany.disposition, "unresolved");
  if (legacyMany.disposition === "unresolved") assert.equal(legacyMany.unresolved.reason, "multiple_candidates");
  const legacyDuplicate = await inferCanonicalPersonalCapability({ evidence: evidence([a]), policy: policy([oneRule, rule("rule:a-duplicate", "research-design", "direct_evidence", [a])]), capabilityDefinitions: definitions, capabilityRegistryVersion: registryVersion });
  assert.equal(legacyDuplicate.disposition, "unresolved");
  if (legacyDuplicate.disposition === "unresolved") assert.equal(legacyDuplicate.unresolved.reason, "multiple_candidates");

  const projected = await mapProvisionalResumeEvidencePlural({ evidence: { ...evidence([a, b, c]), signals: [a, b, c] }, policy: policy([oneRule, twoRule, threeRule]), capabilityDefinitions: definitions, capabilityDefinitionVersion: registryVersion });
  assert.equal(projected.filter((item) => item.status === "auto_admitted").length, 3);
  assert.equal(projected.every((item) => item.status !== "auto_admitted" || item.mapping.reviewStatus === "unreviewed"), true);
  const materialized = await materializeProvisionalCareerMap({ sourceMetadata: { fileName: "redacted", mediaType: "text/plain", byteSize: 10, sourceRevision: "source:1" }, evidence: [{ ...evidence([a, b, c]), reviewStatus: "unreviewed", extractionVersion: "fixture/1" }], mappingResults: projected, capabilityDefinitions: definitions, versions: { evidenceExtractionVersion: "fixture/1", mappingPolicyVersion: "plural-audit/1.0.0", capabilityDefinitionVersion: registryVersion }, createdAt: "fixture", updatedAt: "fixture" });
  assert.equal(materialized.ok, true, materialized.ok ? undefined : JSON.stringify(materialized));
  if (materialized.ok) {
    assert.equal(materialized.state.capabilities.length, 3);
    assert.equal(materialized.state.capabilities.every((item) => item.provisionalEvidenceCount === 1), true);
    assert.equal(new Set(materialized.state.capabilities.flatMap((item) => [...item.directEvidenceIds, ...item.transferableEvidenceIds])).size, 1);
  }

  console.table([
    { scenario: "one", admitted: one.admittedProposals.length, unresolved: one.unresolved.length },
    { scenario: "duplicate", admitted: duplicate.admittedProposals.length, unresolved: duplicate.unresolved.length },
    { scenario: "two", admitted: two.admittedProposals.length, unresolved: two.unresolved.length },
    { scenario: "three", admitted: three.admittedProposals.length, unresolved: three.unresolved.length },
    { scenario: "conflict", admitted: conflict.admittedProposals.length, unresolved: conflict.unresolved.length },
    { scenario: "valid-plus-conflict", admitted: mixed.admittedProposals.length, unresolved: mixed.unresolved.length },
  ]);
  console.log("canonical multi-proposal inference tests passed");
}

main().catch((error) => { process.exitCode = 1; throw error; });
