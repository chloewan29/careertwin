import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { inferCanonicalPersonalCapability, validateCanonicalInferencePolicy } from "../../lib/career-possibility/canonical-personal-capability-inference";
import type { CanonicalInferenceEvidence, CanonicalInferencePolicy, CanonicalSemanticSignal } from "../../lib/career-possibility/canonical-personal-capability-inference-contract";
import { provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";

const registryVersion = "career-map-capability-definitions/test-1.0.0";
const definitions = canonicalCapabilityLibrary.capabilities;
const evidence = (evidenceId: string, signals: CanonicalSemanticSignal[], sourceRevision: string | null = "source:test:1"): CanonicalInferenceEvidence => ({ evidenceId, sourceExcerpt: "Synthetic source-preserving evidence.", sourceLocator: { locatorId: `locator:${evidenceId}`, startOffset: 0, endOffset: 12 }, sourceRevision, signals });
const infer = (item: CanonicalInferenceEvidence, policy: CanonicalInferencePolicy = provisionalResumeMappingPolicy) => inferCanonicalPersonalCapability({ evidence: item, policy, capabilityDefinitions: definitions, capabilityRegistryVersion: registryVersion });

async function main() {
  const cases = [
    ["research", [{ field: "action", value: "designed_research" }], "research-design", "direct_evidence"],
    ["research-support", [{ field: "action", value: "supported_research_delivery" }], "research-design", "transferable_signal"],
    ["insight", [{ field: "action", value: "synthesised_findings" }, { field: "outcome", value: "informed_decision" }], "insight-synthesis", "direct_evidence"],
    ["cross-functional", [{ field: "action", value: "coordinated_cross_functional_delivery" }, { field: "ownership", value: "owned_delivery" }], "cross-functional-delivery", "direct_evidence"],
    ["process", [{ field: "action", value: "redesigned_process" }], "process-improvement", "direct_evidence"],
    ["strategic-analysis", [{ field: "action", value: "performed_strategic_analysis" }], "strategic-analysis", "direct_evidence"],
    ["executive-insight", [{ field: "action", value: "synthesised_executive_insight" }], "insight-synthesis", "direct_evidence"],
    ["analytics-governance", [{ field: "action", value: "established_analytics_governance" }], "analytics-governance", "direct_evidence"],
    ["people-leadership", [{ field: "action", value: "led_analytics_team" }], "people-leadership", "direct_evidence"],
    ["measurement-design", [{ field: "action", value: "designed_measurement_framework" }], "measurement-design", "direct_evidence"],
  ] as const;
  for (const [id, signals, capabilityId, relationship] of cases) {
    const result = await infer(evidence(`evidence:${id}`, [...signals]));
    assert.equal(result.disposition, "admitted");
    if (result.disposition !== "admitted") throw new Error(`Expected ${id} admission`);
    assert.equal(result.proposal.capabilityId, capabilityId);
    assert.equal(result.proposal.relationship, relationship);
    assert.equal(result.proposal.method, "authored_deterministic");
    assert.ok(result.proposal.matchedRuleId);
    assert.equal(result.proposal.matchedRuleVersion, "1.0.0");
    assert.equal("reviewStatus" in result.proposal, false);
    assert.equal("trustStatus" in result.proposal, false);
    assert.equal("confidence" in result.proposal, false);
  }

  const directInput = evidence("evidence:deterministic", [{ field: "action", value: "designed_research" }]);
  assert.deepEqual(await infer(directInput), await infer(directInput));
  const withoutRevision = await infer({ ...directInput, sourceRevision: null });
  assert.equal(withoutRevision.disposition, "admitted");
  const blankRevision = await infer({ ...directInput, sourceRevision: "" });
  assert.equal(blankRevision.disposition, "unresolved");
  if (blankRevision.disposition === "unresolved") assert.equal(blankRevision.unresolved.reason, "invalid_evidence");

  const unsupported = await infer(evidence("evidence:unsupported", [{ field: "scope", value: "cross_functional" }]));
  assert.equal(unsupported.disposition, "unsupported");
  if (unsupported.disposition === "unsupported") assert.equal(unsupported.unresolved.reason, "no_canonical_rule");
  const deferred = ["provided_analytics_business_advice", "owned_analytics_product", "performed_investigative_analysis", "enabled_analytics_workflow"];
  for (const token of deferred) {
    const result = await infer(evidence(`evidence:deferred:${token}`, [{ field: "action", value: token }]));
    assert.equal(result.disposition, "unsupported");
    if (result.disposition === "unsupported") assert.equal(result.unresolved.reason, "no_canonical_rule");
  }
  const duplicateInsight = await infer(evidence("evidence:duplicate-insight", [{ field: "action", value: "synthesised_findings" }, { field: "outcome", value: "informed_decision" }, { field: "action", value: "synthesised_executive_insight" }]));
  assert.equal(duplicateInsight.disposition, "admitted");
  if (duplicateInsight.disposition === "admitted") { assert.equal(duplicateInsight.proposal.capabilityId, "insight-synthesis"); assert.equal(duplicateInsight.proposal.matchedRuleId, "insight-synthesis/direct/synthesised-executive-insight"); }
  const conflict = await infer(evidence("evidence:conflict", [{ field: "action", value: "designed_research" }, { field: "action", value: "supported_research_delivery" }]));
  assert.equal(conflict.disposition, "unresolved");
  if (conflict.disposition === "unresolved") assert.equal(conflict.unresolved.reason, "relationship_conflict");
  const multiple = await infer(evidence("evidence:multiple", [{ field: "action", value: "designed_research" }, { field: "action", value: "redesigned_process" }]));
  assert.equal(multiple.disposition, "unresolved");
  if (multiple.disposition === "unresolved") assert.deepEqual(multiple.unresolved.candidateCapabilityIds, ["process-improvement", "research-design"]);

  const unknownPolicy: CanonicalInferencePolicy = { ...provisionalResumeMappingPolicy, rules: [{ ...provisionalResumeMappingPolicy.rules[0], capabilityId: "Research Design" }] };
  assert.ok(validateCanonicalInferencePolicy(unknownPolicy, definitions).some((issue) => issue.code === "unknown_capability"));
  const unknown = await infer(directInput, unknownPolicy);
  assert.equal(unknown.disposition, "unresolved");
  if (unknown.disposition === "unresolved") assert.equal(unknown.unresolved.reason, "invalid_policy");
  const invalidRelationship = { ...provisionalResumeMappingPolicy, rules: [{ ...provisionalResumeMappingPolicy.rules[0], relationship: "inferred" }] } as unknown as CanonicalInferencePolicy;
  assert.ok(validateCanonicalInferencePolicy(invalidRelationship, definitions).some((issue) => issue.code === "invalid_mapping_policy"));
  const missingProvenance: CanonicalInferencePolicy = { ...provisionalResumeMappingPolicy, rules: [{ ...provisionalResumeMappingPolicy.rules[0], ruleVersion: "" }] };
  assert.ok(validateCanonicalInferencePolicy(missingProvenance, definitions).length > 0);

  const contractSource = readFileSync(new URL("../../lib/career-possibility/canonical-personal-capability-inference-contract.ts", import.meta.url), "utf8");
  const ownerSource = readFileSync(new URL("../../lib/career-possibility/canonical-personal-capability-inference.ts", import.meta.url), "utf8");
  assert.doesNotMatch(contractSource, /reviewStatus|trustStatus|provisional|confirmed|edited|accepted|rejected|jobDescription|roleRequirement|confidenceScore|storageKey|userId|databaseId/);
  assert.doesNotMatch(ownerSource, /localStorage|indexedDB|supabase|job-copilot|match-v2|openai|embedding|fuzzy|confidence/i);
  assert.doesNotMatch(ownerSource, /canonical-capability-library[^";]*label/i);
  assert.match(ownerSource, /validateCanonicalInferencePolicy/);

  console.log("canonical personal capability inference tests passed");
}

main().catch((error) => { process.exitCode = 1; throw error; });
