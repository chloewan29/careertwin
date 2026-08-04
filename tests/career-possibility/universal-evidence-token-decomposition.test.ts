import assert from "node:assert/strict";
import { bridgeEvidenceToProvisionalSignals } from "../../lib/career-possibility/provisional-evidence-signal-bridge";
import { provisionalEvidenceSignalPolicy } from "../../lib/career-possibility/provisional-evidence-signal-policy";
import type { ProvisionalEvidenceSignalInput, ProvisionalEvidenceSignalToken } from "../../lib/career-possibility/provisional-evidence-signal-contract";
import { mapProvisionalResumeEvidencePlural } from "../../lib/career-possibility/provisional-resume-capability-mapper";
import { provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";

const fixture = (id: string, text: string, offset = 0): ProvisionalEvidenceSignalInput => ({ evidence: { id, employmentRecordId: "employment:synthetic", sourceSpanIds: [`span:${id}`], sourceText: text, reviewStatus: "unreviewed", processingStatus: "source_provided", extractionMethod: "deterministic", warnings: [] }, sourceSpans: [{ id: `span:${id}`, documentId: "document:synthetic", sourceType: "resume_upload", employmentRecordId: "employment:synthetic", startOffset: offset, endOffset: offset + text.length, originalText: text }] });
const bridge = (id: string, text: string, offset = 0) => bridgeEvidenceToProvisionalSignals(fixture(id, text, offset), provisionalEvidenceSignalPolicy);
const tokens = (result: Awaited<ReturnType<typeof bridge>>) => result.status === "structured" ? result.evidence.signals.map((item) => item.value) : [];

async function expectTokens(id: string, text: string, expected: readonly ProvisionalEvidenceSignalToken[]) {
  const result = await bridge(id, text);
  assert.equal(result.status, "structured", id);
  assert.deepEqual(tokens(result), [...expected].sort(), id);
  if (result.status !== "structured") throw new Error(id);
  assert.equal(result.evidence.evidenceId, id);
  assert.equal(result.evidence.sourceLocator.locatorId, `span:${id}`);
  assert.equal(result.evidence.reviewStatus, "unreviewed");
  assert.equal(new Set(result.evidence.signals.map((item) => `${item.field}:${item.value}`)).size, result.evidence.signals.length);
  assert.equal(result.evidence.signalIdentities.length, result.evidence.signals.length);
  assert.equal(new Set(result.evidence.signalIdentities.map((item) => item.signalId)).size, result.evidence.signals.length);
  const mapped = await mapProvisionalResumeEvidencePlural({ evidence: result.evidence, policy: provisionalResumeMappingPolicy, capabilityDefinitions: canonicalCapabilityLibrary.capabilities, capabilityDefinitionVersion: canonicalCapabilityLibrary.contentVersion });
  assert.equal(mapped.every((item) => item.status === "unsupported"), true, `${id}: refined tokens remain unmapped`);
  return result;
}

async function main() {
  const decisions = {
    framed_business_problem: "ADMIT_TOKEN", advised_decision_maker: "ADMIT_TOKEN",
    owned_product_or_service: "ADMIT_TOKEN", managed_requirements: "ADMIT_TOKEN", prioritised_delivery: "ADMIT_TOKEN", governed_delivery_quality: "ADMIT_TOKEN",
    investigated_anomaly: "ADMIT_TOKEN", diagnosed_root_cause: "ADMIT_TOKEN", isolated_meaningful_pattern: "ADMIT_TOKEN",
    built_reusable_tooling: "ADMIT_TOKEN", automated_recurring_workflow: "ADMIT_TOKEN", standardised_workflow: "ADMIT_TOKEN", enabled_platform_adoption: "ADMIT_TOKEN", designed_ai_assisted_workflow: "ADMIT_TOKEN",
  } as const;
  assert.equal(Object.values(decisions).every((value) => value === "ADMIT_TOKEN"), true);
  const retired = ["provided_analytics_business_advice", "owned_analytics_product", "performed_investigative_analysis", "enabled_analytics_workflow"];
  assert.equal(retired.every((token) => !provisionalEvidenceSignalPolicy.vocabulary.includes(token as never)), true);

  await expectTokens("business-framing", "Framed an ambiguous operational problem for evidence and recommendations.", ["framed_business_problem"]);
  await expectTokens("business-advice", "Advised finance leaders using evidence and recommendations.", ["advised_decision_maker"]);
  const product = await expectTokens("product-multiple", "Owned a reporting product, its requirements and delivery quality.", ["governed_delivery_quality", "managed_requirements", "owned_product_or_service"]);
  assert.equal(product.status === "structured" && product.evidence.signals.length, 3);
  await expectTokens("priorities", "Prioritised the product roadmap and delivery sequencing.", ["prioritised_delivery"]);
  await expectTokens("investigation-multiple", "Identified behavioural patterns, anomalies and root causes.", ["diagnosed_root_cause", "investigated_anomaly", "isolated_meaningful_pattern"]);
  await expectTokens("tooling", "Built reusable tooling for finance planning.", ["built_reusable_tooling"]);
  await expectTokens("automation", "Automated a recurring reporting workflow.", ["automated_recurring_workflow"]);
  await expectTokens("standardisation", "Standardised the customer onboarding workflow.", ["standardised_workflow"]);
  await expectTokens("adoption", "Led platform adoption across the organisation.", ["enabled_platform_adoption"]);
  await expectTokens("ai-design", "Designed an AI-assisted evidence workflow.", ["designed_ai_assisted_workflow"]);

  const negatives = [
    ["presented", "Presented findings to leaders."], ["collaborated", "Worked with business leaders."], ["generic-analysis", "Analysed customer data."],
    ["built-dashboard", "Built a dashboard."], ["supported-product", "Supported a data product."], ["product-object", "Product analytics."],
    ["generic-issue", "Resolved an operational issue."], ["risk-mention", "Risk analytics."], ["platform-support", "Supported an analytics platform."],
    ["ai-use", "Used an AI tool for reporting."], ["tools", "Power BI, Python, Tableau"], ["reporting", "Improved reporting."],
  ] as const;
  for (const [id, text] of negatives) assert.equal((await bridge(id, text)).status, "unsupported", id);

  const crossRole = [
    ["business-delivery", "Framed an ambiguous operational problem for evidence and recommendations.", "framed_business_problem"],
    ["product-manager", "Owned a customer service, its requirements and delivery quality.", "owned_product_or_service"],
    ["operations-manager", "Standardised the warehouse delivery workflow.", "standardised_workflow"],
    ["finance-manager", "Advised finance leaders using evidence and recommendations.", "advised_decision_maker"],
    ["hr-partner", "Advised people leaders using evidence and recommendations.", "advised_decision_maker"],
    ["engineering-manager", "Built reusable tooling for release delivery.", "built_reusable_tooling"],
    ["marketing-manager", "Investigated campaign anomalies and risk signals.", "investigated_anomaly"],
    ["analytics-manager", "Designed an AI-assisted reporting workflow.", "designed_ai_assisted_workflow"],
  ] as const;
  for (const [id, text, token] of crossRole) assert.equal(tokens(await bridge(id, text)).includes(token), true, id);

  const repeated = await bridge("deterministic", "Owned a reporting product, its requirements and delivery quality.");
  const repeatedAgain = await bridge("deterministic", "Owned a reporting product, its requirements and delivery quality.");
  assert.deepEqual(repeatedAgain, repeated);
  const semanticChange = await bridge("deterministic", "Owned a reporting product.");
  assert.equal(repeated.status === "structured" && semanticChange.status === "structured" && repeated.evidence.signalIdentity !== semanticChange.evidence.signalIdentity, true);
  const moved = await bridge("deterministic-moved", "Owned a reporting product, its requirements and delivery quality.", 100);
  assert.equal(repeated.status === "structured" && moved.status === "structured" && repeated.evidence.signalIdentity !== moved.evidence.signalIdentity, true);

  console.log("universal evidence token decomposition tests passed");
}

main().catch((error) => { process.exitCode = 1; throw error; });
