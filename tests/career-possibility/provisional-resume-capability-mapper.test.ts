import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { inferCanonicalPersonalCapability } from "../../lib/career-possibility/canonical-personal-capability-inference";
import { mapProvisionalResumeEvidence, validateProvisionalAutoAdmittedMapping, validateProvisionalMappingPolicy, validateProvisionalUnresolvedMapping } from "../../lib/career-possibility/provisional-resume-capability-mapper";
import type { ProvisionalMappingEvidence, ProvisionalMappingPolicy, ProvisionalMappingSignalField } from "../../lib/career-possibility/provisional-resume-mapping-contract";
import { PROVISIONAL_RESUME_MAPPING_POLICY_VERSION, provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";

const definitionVersion = "career-map-capability-definitions/test-1.0.0";
const definitions = canonicalCapabilityLibrary.capabilities;
const evidence = (evidenceId: string, signals: Array<{ field: ProvisionalMappingSignalField; value: string }>, offset = 0, extra: Partial<ProvisionalMappingEvidence> = {}): ProvisionalMappingEvidence => ({ evidenceId, sourceExcerpt: "Synthetic evidence excerpt for contract validation.", sourceLocator: { locatorId: `locator:${evidenceId}`, startOffset: offset, endOffset: offset + 12 }, signals, ...extra });
const map = (value: ProvisionalMappingEvidence, policy = provisionalResumeMappingPolicy, version = definitionVersion) => mapProvisionalResumeEvidence({ evidence: value, policy, capabilityDefinitions: definitions, capabilityDefinitionVersion: version });

async function main() {
  const directEvidence = evidence("evidence:direct", [{ field: "action", value: "designed_research" }]);
  const direct = await map(directEvidence);
  assert.equal(direct.status, "auto_admitted");
  if (direct.status !== "auto_admitted") throw new Error("Expected direct admission");
  assert.equal(direct.mapping.capabilityId, "research-design");
  assert.equal(direct.mapping.relationship, "direct_evidence");
  assert.equal(direct.mapping.reviewStatus, "unreviewed");
  assert.equal(direct.mapping.admissionStatus, "auto_admitted");
  assert.notEqual(direct.mapping.admissionStatus, "confirmed");
  assert.equal(direct.mapping.method, "authored_deterministic");
  assert.ok(direct.mapping.explanation);
  assert.deepEqual(validateProvisionalAutoAdmittedMapping(direct.mapping, definitions), []);
  const canonicalDirect = await inferCanonicalPersonalCapability({ evidence: { ...directEvidence, sourceRevision: null }, policy: provisionalResumeMappingPolicy, capabilityDefinitions: definitions, capabilityRegistryVersion: definitionVersion });
  assert.equal(canonicalDirect.disposition, "admitted");
  if (canonicalDirect.disposition === "admitted") {
    assert.equal(canonicalDirect.proposal.proposalId, direct.mapping.mappingId);
    assert.equal(canonicalDirect.proposal.capabilityId, direct.mapping.capabilityId);
    assert.equal(canonicalDirect.proposal.relationship, direct.mapping.relationship);
    assert.equal(canonicalDirect.proposal.matchedRuleId, direct.mapping.matchedRuleId);
    assert.equal("reviewStatus" in canonicalDirect.proposal, false);
  }

  const transferable = await map(evidence("evidence:transferable", [{ field: "action", value: "supported_research_delivery" }]));
  assert.equal(transferable.status, "auto_admitted");
  if (transferable.status === "auto_admitted") assert.equal(transferable.mapping.relationship, "transferable_signal");
  const groupA = [
    ["performed_strategic_analysis", "strategic-analysis"],
    ["synthesised_executive_insight", "insight-synthesis"],
    ["established_analytics_governance", "analytics-governance"],
    ["led_analytics_team", "people-leadership"],
  ] as const;
  for (const [token, capabilityId] of groupA) {
    const result = await map(evidence(`evidence:${token}`, [{ field: "action", value: token }]));
    assert.equal(result.status, "auto_admitted");
    if (result.status === "auto_admitted") { assert.equal(result.mapping.capabilityId, capabilityId); assert.equal(result.mapping.relationship, "direct_evidence"); assert.equal(result.mapping.reviewStatus, "unreviewed"); }
  }
  const duplicateInsight = await map(evidence("evidence:duplicate-insight", [{ field: "action", value: "synthesised_findings" }, { field: "outcome", value: "informed_decision" }, { field: "action", value: "synthesised_executive_insight" }]));
  assert.equal(duplicateInsight.status, "auto_admitted");
  if (duplicateInsight.status === "auto_admitted") assert.equal(duplicateInsight.mapping.capabilityId, "insight-synthesis");

  const repeated = await map(directEvidence);
  assert.deepEqual(repeated, direct);
  const differentEvidence = await map(evidence("evidence:different", [{ field: "action", value: "designed_research" }]));
  assert.equal(differentEvidence.status, "auto_admitted");
  if (differentEvidence.status === "auto_admitted") assert.notEqual(differentEvidence.mapping.mappingId, direct.mapping.mappingId);

  const alternateRelationshipPolicy: ProvisionalMappingPolicy = { ...provisionalResumeMappingPolicy, rules: [{ ...provisionalResumeMappingPolicy.rules[0], relationship: "transferable_signal" }] };
  const alternateRelationship = await map(directEvidence, alternateRelationshipPolicy);
  assert.equal(alternateRelationship.status, "auto_admitted");
  if (alternateRelationship.status === "auto_admitted") assert.notEqual(alternateRelationship.mapping.mappingId, direct.mapping.mappingId);
  const alternatePolicyVersion = await map(directEvidence, { ...provisionalResumeMappingPolicy, policyVersion: "provisional-resume-mapping-policy/1.0.1" });
  assert.equal(alternatePolicyVersion.status, "auto_admitted");
  if (alternatePolicyVersion.status === "auto_admitted") assert.notEqual(alternatePolicyVersion.mapping.mappingId, direct.mapping.mappingId);
  const alternateDefinitions = await map(directEvidence, provisionalResumeMappingPolicy, `${definitionVersion}/next`);
  assert.equal(alternateDefinitions.status, "auto_admitted");
  if (alternateDefinitions.status === "auto_admitted") assert.notEqual(alternateDefinitions.mapping.mappingId, direct.mapping.mappingId);

  const multiple = await map(evidence("evidence:multiple", [{ field: "action", value: "designed_research" }, { field: "action", value: "redesigned_process" }]));
  assert.equal(multiple.status, "unresolved");
  if (multiple.status === "unresolved") { assert.equal(multiple.unresolved.reason, "multiple_candidates"); assert.deepEqual(multiple.unresolved.candidateCapabilityIds, ["process-improvement", "research-design"]); assert.equal("capabilityId" in multiple.unresolved, false); }
  if (multiple.status === "unresolved") assert.deepEqual(validateProvisionalUnresolvedMapping(multiple.unresolved, definitions), []);
  const relationshipConflict = await map(evidence("evidence:relationship", [{ field: "action", value: "designed_research" }, { field: "action", value: "supported_research_delivery" }]));
  assert.equal(relationshipConflict.status, "unresolved");
  if (relationshipConflict.status === "unresolved") assert.equal(relationshipConflict.unresolved.reason, "relationship_conflict");
  const unsupported = await map(evidence("evidence:unsupported", [{ field: "action", value: "wrote_uncovered_material" }]));
  assert.equal(unsupported.status, "unsupported");
  if (unsupported.status === "unsupported") { assert.equal(unsupported.unresolved.reason, "no_canonical_rule"); assert.deepEqual(unsupported.unresolved.candidateCapabilityIds, []); }
  const invalid = await map({ evidenceId: "", sourceExcerpt: "", sourceLocator: { locatorId: "", startOffset: -1, endOffset: 0 }, signals: [] });
  assert.equal(invalid.status, "unresolved");
  if (invalid.status === "unresolved") assert.equal(invalid.unresolved.reason, "invalid_evidence");

  const unknownPolicy: ProvisionalMappingPolicy = { ...provisionalResumeMappingPolicy, rules: [{ ...provisionalResumeMappingPolicy.rules[0], capabilityId: "unknown-capability" }] };
  assert.ok(validateProvisionalMappingPolicy(unknownPolicy, definitions).some((item) => item.code === "unknown_capability"));
  const invalidPolicyResult = await map(directEvidence, unknownPolicy);
  assert.equal(invalidPolicyResult.status, "unresolved");
  if (invalidPolicyResult.status === "unresolved") assert.equal(invalidPolicyResult.unresolved.reason, "invalid_policy");
  const duplicatePolicy: ProvisionalMappingPolicy = { ...provisionalResumeMappingPolicy, rules: [provisionalResumeMappingPolicy.rules[0], provisionalResumeMappingPolicy.rules[0]] };
  assert.ok(validateProvisionalMappingPolicy(duplicatePolicy, definitions).some((item) => item.code === "duplicate_rule_id"));
  const blankExplanation: ProvisionalMappingPolicy = { ...provisionalResumeMappingPolicy, rules: [{ ...provisionalResumeMappingPolicy.rules[0], explanation: "" }] };
  assert.ok(validateProvisionalMappingPolicy(blankExplanation, definitions).some((item) => item.code === "missing_explanation"));

  const titleOnly = await map(evidence("evidence:title", [], 0, { titleSignals: ["Research Director"] }));
  assert.equal(titleOnly.status, "unsupported");
  const toolOnly = await map(evidence("evidence:tool", [], 0, { toolSignals: ["Tableau"] }));
  assert.equal(toolOnly.status, "unsupported");
  const similarA = await map(evidence("evidence:similar-a", [{ field: "action", value: "redesigned_process" }], 10));
  const similarB = await map(evidence("evidence:similar-b", [{ field: "action", value: "redesigned_process" }], 40));
  assert.equal(similarA.status, "auto_admitted"); assert.equal(similarB.status, "auto_admitted");
  if (similarA.status === "auto_admitted" && similarB.status === "auto_admitted") assert.notEqual(similarA.mapping.mappingId, similarB.mapping.mappingId);

  assert.equal(provisionalResumeMappingPolicy.policyVersion, PROVISIONAL_RESUME_MAPPING_POLICY_VERSION);
  assert.equal(PROVISIONAL_RESUME_MAPPING_POLICY_VERSION, "provisional-resume-mapping-policy/1.1.0");
  assert.equal(provisionalResumeMappingPolicy.coverage, "bounded_non_exhaustive");
  assert.equal(provisionalResumeMappingPolicy.rules.length, 9);
  assert.equal(new Set(provisionalResumeMappingPolicy.rules.map((rule) => rule.ruleId)).size, 9);
  assert.deepEqual(validateProvisionalMappingPolicy(provisionalResumeMappingPolicy, definitions), []);
  const mapperSource = readFileSync(new URL("../../lib/career-possibility/provisional-resume-capability-mapper.ts", import.meta.url), "utf8");
  const canonicalSource = readFileSync(new URL("../../lib/career-possibility/canonical-personal-capability-inference.ts", import.meta.url), "utf8");
  const policySource = readFileSync(new URL("../../lib/career-possibility/provisional-resume-mapping-policy.ts", import.meta.url), "utf8");
  assert.doesNotMatch(mapperSource + policySource, /\bfetch\s*\(|supabase|localStorage|indexedDB|confidence|embedding|openai|genai|llm/i);
  assert.doesNotMatch(mapperSource, /local-career-map-state|local-career-map-storage/);
  assert.match(mapperSource, /inferCanonicalPersonalCapability/);
  assert.doesNotMatch(mapperSource, /requiredSignals\.every|policy\.rules\.filter|sha256|multiple_candidates.*matched/);
  assert.doesNotMatch(canonicalSource, /reviewStatus|trustStatus|auto_admitted/);

  console.table([
    { fixture: "direct", rule: direct.mapping.matchedRuleId, result: direct.status, capability: direct.mapping.capabilityId, relationship: direct.mapping.relationship, reason: "" },
    { fixture: "transferable", rule: transferable.status === "auto_admitted" ? transferable.mapping.matchedRuleId : "", result: transferable.status, capability: transferable.status === "auto_admitted" ? transferable.mapping.capabilityId : "", relationship: transferable.status === "auto_admitted" ? transferable.mapping.relationship : "", reason: "" },
    { fixture: "ambiguous", rule: "multiple", result: multiple.status, capability: "", relationship: "", reason: multiple.status === "unresolved" ? multiple.unresolved.reason : "" },
    { fixture: "unsupported", rule: "none", result: unsupported.status, capability: "", relationship: "", reason: unsupported.status === "unsupported" ? unsupported.unresolved.reason : "" },
  ]);
  console.log("provisional resume capability mapper tests passed");
}

main().catch((error) => { process.exitCode = 1; throw error; });
