import assert from "node:assert/strict";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
} from "../../lib/career-possibility/career-capability-structured-inference-contract";
import { validateCareerCapabilityStructuredInferenceResponse } from "../../lib/career-possibility/career-capability-structured-inference-validator";
import { adaptValidatedStructuredCapabilityMappings, mergeDeterministicAndStructuredMappings } from "../../lib/career-possibility/career-capability-structured-mapping";
import { validateProvisionalLocalCareerMapState, type ProvisionalLocalCareerMapEvidence } from "../../lib/career-possibility/local-career-map-state";
import { materializeProvisionalCareerMap } from "../../lib/career-possibility/provisional-career-map-materializer";
import { mapProvisionalResumeEvidence, validateProvisionalAutoAdmittedMapping } from "../../lib/career-possibility/provisional-resume-capability-mapper";
import { provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";
import type { ProvisionalStructuredAutoAdmittedMapping } from "../../lib/career-possibility/provisional-resume-mapping-contract";

const definitions = canonicalCapabilityLibrary.capabilities;
const definitionVersion = canonicalCapabilityLibrary.contentVersion;
const evidence = (evidenceId: string, action: string): ProvisionalLocalCareerMapEvidence => Object.freeze({
  evidenceId,
  sourceExcerpt: `${action} in a bounded synthetic fixture.`,
  sourceLocator: Object.freeze({ locatorId: `${evidenceId}-locator`, startOffset: 0, endOffset: 42 }),
  signals: Object.freeze([{ field: "action" as const, value: action }]),
  reviewStatus: "unreviewed" as const,
  extractionVersion: "resume-evidence-extractor/1.0.0",
});

async function structured(evidenceId: string, capabilityId: string, supportAssessment: "directly_supported" | "transferable_support") {
  const eligibleEvidence = [{ evidenceId, evidenceText: "Bounded synthetic evidence." }];
  const validation = validateCareerCapabilityStructuredInferenceResponse({
    response: {
      contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
      results: [{ evidenceId, capabilityAssessments: [{ capabilityId, supportAssessment, groundingRationale: "UNIQUE_EPHEMERAL_RATIONALE" }] }],
    },
    eligibleEvidence,
    canonicalCapabilities: definitions,
  });
  assert.equal(validation.responseIssues.length, 0);
  assert.equal(validation.rejectedEvidenceResults.length, 0);
  const mappings = await adaptValidatedStructuredCapabilityMappings({ validation, mappingPolicyVersion: provisionalResumeMappingPolicy.policyVersion, capabilityDefinitionVersion: definitionVersion });
  assert.equal(mappings.length, 1);
  return mappings[0];
}

async function main() {
  const structuredEvidence = evidence("e-structured", "uncovered_activity");
  const structuredOnly = await structured(structuredEvidence.evidenceId, "research-design", "directly_supported");
  assert.equal(structuredOnly.method, "structured_inference");
  assert.equal("matchedRuleId" in structuredOnly, false);
  assert.deepEqual(validateProvisionalAutoAdmittedMapping(structuredOnly, definitions), []);

  const materialized = await materializeProvisionalCareerMap({
    sourceMetadata: { fileName: "synthetic.pdf", mediaType: "application/pdf", byteSize: 100, sourceRevision: "source/structured" },
    evidence: [structuredEvidence],
    mappingResults: [{ status: "auto_admitted", mapping: structuredOnly }],
    capabilityDefinitions: definitions,
    versions: { evidenceExtractionVersion: structuredEvidence.extractionVersion, mappingPolicyVersion: provisionalResumeMappingPolicy.policyVersion, capabilityDefinitionVersion: definitionVersion },
    createdAt: "2026-08-11T00:00:00Z",
    updatedAt: "2026-08-11T00:00:00Z",
  });
  assert.equal(materialized.ok, true);
  if (!materialized.ok) throw new Error(materialized.issues[0]?.message);
  assert.equal(materialized.state.schemaVersion, "2.0.0");
  assert.equal(materialized.state.mappings[0].method, "structured_inference");
  assert.equal(materialized.state.mappings[0].evidenceId, structuredEvidence.evidenceId);
  assert.equal(validateProvisionalLocalCareerMapState(materialized.state, definitions).ok, true);
  assert.doesNotMatch(JSON.stringify(materialized.state), /UNIQUE_EPHEMERAL_RATIONALE|gemini-3\.6-flash|providerResponse/);

  const structuredWithFakeRule = { ...structuredOnly, matchedRuleId: "llm_matched" } as unknown as ProvisionalStructuredAutoAdmittedMapping;
  assert.equal(validateProvisionalAutoAdmittedMapping(structuredWithFakeRule, definitions).some((issue) => issue.path === "matchedRuleId"), true);
  assert.equal(validateProvisionalLocalCareerMapState({ ...materialized.state, mappings: [structuredWithFakeRule] }, definitions).ok, false);

  const deterministicEvidence = evidence("e-deterministic", "designed_research");
  const deterministic = await mapProvisionalResumeEvidence({ evidence: deterministicEvidence, policy: provisionalResumeMappingPolicy, capabilityDefinitions: definitions, capabilityDefinitionVersion: definitionVersion });
  assert.equal(deterministic.status, "auto_admitted");
  if (deterministic.status !== "auto_admitted") throw new Error();
  assert.equal(deterministic.mapping.method, "authored_deterministic");
  assert.equal(typeof deterministic.mapping.matchedRuleId, "string");
  assert.deepEqual(validateProvisionalAutoAdmittedMapping(deterministic.mapping, definitions), []);
  const deterministicWithoutRule = { ...deterministic.mapping, matchedRuleId: "" };
  assert.equal(validateProvisionalAutoAdmittedMapping(deterministicWithoutRule, definitions).some((issue) => issue.path === "matchedRuleId"), true);

  const sameSupport = await structured(deterministic.mapping.evidenceId, deterministic.mapping.capabilityId, "directly_supported");
  const sameMerged = mergeDeterministicAndStructuredMappings({ deterministicResults: [deterministic], structuredMappings: [sameSupport] });
  assert.equal(sameMerged.mappingResults.filter((result) => result.status === "auto_admitted").length, 1);
  assert.equal(sameMerged.mappingResults[0].status === "auto_admitted" && sameMerged.mappingResults[0].mapping.method, "authored_deterministic");
  assert.equal(sameMerged.conflicts.length, 0);

  const directVsTransferable = await structured(deterministic.mapping.evidenceId, deterministic.mapping.capabilityId, "transferable_support");
  const firstConflict = mergeDeterministicAndStructuredMappings({ deterministicResults: [deterministic], structuredMappings: [directVsTransferable] });
  assert.equal(firstConflict.mappingResults[0].status === "auto_admitted" && firstConflict.mappingResults[0].mapping.relationship, "direct_evidence");
  assert.equal(firstConflict.conflicts.length, 1);

  const transferableEvidence = evidence("e-transferable", "supported_research_delivery");
  const transferable = await mapProvisionalResumeEvidence({ evidence: transferableEvidence, policy: provisionalResumeMappingPolicy, capabilityDefinitions: definitions, capabilityDefinitionVersion: definitionVersion });
  assert.equal(transferable.status, "auto_admitted");
  if (transferable.status !== "auto_admitted") throw new Error();
  const transferableVsDirect = await structured(transferable.mapping.evidenceId, transferable.mapping.capabilityId, "directly_supported");
  const reverseConflict = mergeDeterministicAndStructuredMappings({ deterministicResults: [transferable], structuredMappings: [transferableVsDirect] });
  assert.equal(reverseConflict.mappingResults[0].status === "auto_admitted" && reverseConflict.mappingResults[0].mapping.relationship, "transferable_signal");
  assert.equal(reverseConflict.conflicts.length, 1);

  const zeroValidation = validateCareerCapabilityStructuredInferenceResponse({
    response: { contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, results: [{ evidenceId: "e-zero", capabilityAssessments: [] }] },
    eligibleEvidence: [{ evidenceId: "e-zero", evidenceText: "Insufficient evidence." }],
    canonicalCapabilities: definitions,
  });
  assert.equal((await adaptValidatedStructuredCapabilityMappings({ validation: zeroValidation, mappingPolicyVersion: provisionalResumeMappingPolicy.policyVersion, capabilityDefinitionVersion: definitionVersion })).length, 0);

  console.log("career capability structured mapping tests passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
