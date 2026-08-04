import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { mapProvisionalResumeEvidence } from "../../lib/career-possibility/provisional-resume-capability-mapper";
import { provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";

const decisions = {
  designed_measurement_framework: "ADMIT_DIRECT_MAPPING",
  provided_analytics_business_advice: "DEFER_CANONICAL_CAPABILITY_EXPANSION",
  owned_analytics_product: "DEFER_CANONICAL_CAPABILITY_EXPANSION",
  performed_investigative_analysis: "DEFER_CANONICAL_CAPABILITY_EXPANSION",
  enabled_analytics_workflow: "REFINE_TOKEN_BEFORE_MAPPING",
} as const;

const destinations = new Map<string, string>([["designed_measurement_framework", "measurement-design"]]);
async function main() {
  for (const [token, decision] of Object.entries(decisions)) {
    const result = await mapProvisionalResumeEvidence({ evidence: { evidenceId: `governance:${token}`, sourceExcerpt: "Privacy-safe governance fixture.", sourceLocator: { locatorId: `locator:${token}`, startOffset: 0, endOffset: 10 }, signals: [{ field: "action", value: token }] }, policy: provisionalResumeMappingPolicy, capabilityDefinitions: canonicalCapabilityLibrary.capabilities, capabilityDefinitionVersion: canonicalCapabilityLibrary.contentVersion });
    const destination = destinations.get(token);
    if (destination) {
      assert.equal(decision, "ADMIT_DIRECT_MAPPING"); assert.equal(result.status, "auto_admitted");
      if (result.status === "auto_admitted") { assert.equal(result.mapping.capabilityId, destination); assert.equal(result.mapping.relationship, "direct_evidence"); assert.equal(result.mapping.reviewStatus, "unreviewed"); }
    } else {
      assert.notEqual(decision, "ADMIT_DIRECT_MAPPING"); assert.equal(result.status, "unsupported");
      if (result.status === "unsupported") assert.equal(result.unresolved.reason, "no_canonical_rule");
    }
  }

  assert.equal(canonicalCapabilityLibrary.capabilities.some((item) => item.id === "measurement-design"), true);
  assert.equal(provisionalResumeMappingPolicy.rules.some((rule) => rule.capabilityId === "research-design" && rule.requiredSignals.some((signal) => signal.value === "designed_measurement_framework")), false);
  const policySource = readFileSync("lib/career-possibility/provisional-resume-mapping-policy.ts", "utf8");
  assert.doesNotMatch(policySource, /closest|fallback|provided_analytics_business_advice.*(?:insight-synthesis|strategic-analysis)|owned_analytics_product.*(?:product-insights|business-ownership)|performed_investigative_analysis.*strategic-analysis|enabled_analytics_workflow.*(?:tooling-enablement|process-improvement)/s);
  console.log("deferred founder signal governance tests passed");
}
main().catch((error) => { process.exitCode = 1; throw error; });
