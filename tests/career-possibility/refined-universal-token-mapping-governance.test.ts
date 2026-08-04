import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { inferCanonicalPersonalCapabilities } from "../../lib/career-possibility/canonical-personal-capability-inference";
import { mapProvisionalResumeEvidencePlural } from "../../lib/career-possibility/provisional-resume-capability-mapper";
import { provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";
import { PROVISIONAL_EVIDENCE_SIGNAL_POLICY_VERSION, provisionalEvidenceSignalPolicy } from "../../lib/career-possibility/provisional-evidence-signal-policy";

const decisions = {
  framed_business_problem: "DEFER_SIGNAL_EVIDENCE_STANDARD",
  advised_decision_maker: "DEFER_SIGNAL_EVIDENCE_STANDARD",
  owned_product_or_service: "DEFER_ONTOLOGY_GAP",
  managed_requirements: "DEFER_ONTOLOGY_GAP",
  prioritised_delivery: "DEFER_SIGNAL_EVIDENCE_STANDARD",
  governed_delivery_quality: "DEFER_ONTOLOGY_GAP",
  investigated_anomaly: "DEFER_SIGNAL_EVIDENCE_STANDARD",
  diagnosed_root_cause: "DEFER_ONTOLOGY_GAP",
  isolated_meaningful_pattern: "DEFER_SIGNAL_EVIDENCE_STANDARD",
  built_reusable_tooling: "ADMIT_TRANSFERABLE_MAPPING",
  automated_recurring_workflow: "DEFER_CANONICAL_DEFINITION",
  standardised_workflow: "DEFER_CANONICAL_DEFINITION",
  enabled_platform_adoption: "DEFER_SIGNAL_EVIDENCE_STANDARD",
  designed_ai_assisted_workflow: "DEFER_SIGNAL_EVIDENCE_STANDARD",
} as const;

const evidence = (id: string, values: readonly string[]) => ({
  evidenceId: id,
  sourceExcerpt: "Privacy-safe mapping fixture.",
  sourceLocator: { locatorId: `locator:${id}`, startOffset: 0, endOffset: 10 },
  signals: values.map((value) => ({ field: "action" as const, value })),
});

async function main() {
  assert.equal(Object.keys(decisions).length, 14);
  assert.equal(provisionalResumeMappingPolicy.policyVersion, "provisional-resume-mapping-policy/1.3.0");
  assert.equal(provisionalResumeMappingPolicy.rules.length, 11);
  assert.equal(PROVISIONAL_EVIDENCE_SIGNAL_POLICY_VERSION, "provisional-evidence-signal-policy/1.4.0");
  assert.equal(provisionalEvidenceSignalPolicy.rules.length, 48);

  for (const [token, decision] of Object.entries(decisions)) {
    const results = await mapProvisionalResumeEvidencePlural({
      evidence: evidence(`governance:${token}`, [token]),
      policy: provisionalResumeMappingPolicy,
      capabilityDefinitions: canonicalCapabilityLibrary.capabilities,
      capabilityDefinitionVersion: canonicalCapabilityLibrary.contentVersion,
    });
    if (decision === "ADMIT_TRANSFERABLE_MAPPING") {
      assert.equal(results.length, 1);
      assert.equal(results[0].status, "auto_admitted");
      if (results[0].status === "auto_admitted") {
        assert.equal(results[0].mapping.capabilityId, "tooling-enablement");
        assert.equal(results[0].mapping.relationship, "transferable_signal");
        assert.equal(results[0].mapping.reviewStatus, "unreviewed");
      }
    } else {
      assert.equal(results.length, 1);
      assert.equal(results[0].status, "unsupported");
      if (results[0].status === "unsupported") assert.equal(results[0].unresolved.reason, "no_canonical_rule");
    }
  }

  const two = await mapProvisionalResumeEvidencePlural({ evidence: evidence("plural:two", ["built_reusable_tooling", "designed_research"]), policy: provisionalResumeMappingPolicy, capabilityDefinitions: canonicalCapabilityLibrary.capabilities, capabilityDefinitionVersion: canonicalCapabilityLibrary.contentVersion });
  assert.deepEqual(two.filter((item) => item.status === "auto_admitted").map((item) => item.mapping.capabilityId), ["research-design", "tooling-enablement"]);
  const three = await mapProvisionalResumeEvidencePlural({ evidence: evidence("plural:three", ["built_reusable_tooling", "designed_research", "performed_strategic_analysis"]), policy: provisionalResumeMappingPolicy, capabilityDefinitions: canonicalCapabilityLibrary.capabilities, capabilityDefinitionVersion: canonicalCapabilityLibrary.contentVersion });
  assert.deepEqual(three.filter((item) => item.status === "auto_admitted").map((item) => item.mapping.capabilityId), ["research-design", "strategic-analysis", "tooling-enablement"]);

  const reusable = { field: "action" as const, value: "built_reusable_tooling" };
  const coalesced = await inferCanonicalPersonalCapabilities({ evidence: { ...evidence("coalesce", []), sourceRevision: null, signals: [reusable] }, policy: { policyVersion: "fixture/1.0.0", coverage: "bounded_non_exhaustive", rules: [
    { ruleId: "a", ruleVersion: "1.0.0", capabilityId: "tooling-enablement", relationship: "transferable_signal", requiredSignals: [reusable], excludedSignals: [], explanation: "a" },
    { ruleId: "b", ruleVersion: "1.0.0", capabilityId: "tooling-enablement", relationship: "transferable_signal", requiredSignals: [reusable], excludedSignals: [], explanation: "b" },
  ] }, capabilityDefinitions: canonicalCapabilityLibrary.capabilities, capabilityRegistryVersion: canonicalCapabilityLibrary.contentVersion });
  assert.equal(coalesced.admittedProposals.length, 1);
  assert.deepEqual(coalesced.admittedProposals[0].matchingRuleIds, ["a", "b"]);

  const source = readFileSync("lib/career-possibility/provisional-resume-mapping-policy.ts", "utf8");
  assert.doesNotMatch(source, /owned_product_or_service.*business-ownership|managed_requirements.*(?:roadmap-governance|product-cadence)|enabled_platform_adoption.*customer-adoption|designed_ai_assisted_workflow.*tooling-enablement/);
  assert.equal(canonicalCapabilityLibrary.capabilities.some((item) => item.id === "product-ownership"), false);
  console.log("refined universal token mapping governance tests passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
