import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE,
  type CareerCapabilityStructuredInferenceEvidence,
} from "../../lib/career-possibility/career-capability-structured-inference-contract";
import { validateCareerCapabilityStructuredInferenceResponse } from "../../lib/career-possibility/career-capability-structured-inference-validator";

const definitions = canonicalCapabilityLibrary.capabilities;
const eligibleEvidence: readonly CareerCapabilityStructuredInferenceEvidence[] = Object.freeze([
  Object.freeze({ evidenceId: "evidence:one", evidenceText: "Designed a measurement framework for campaign decisions." }),
  Object.freeze({ evidenceId: "evidence:two", evidenceText: "Synthesised research findings into recommendations." }),
]);
const assessment = (
  capabilityId: string,
  supportAssessment: "directly_supported" | "transferable_support" = "directly_supported",
  groundingRationale = "The atomic evidence explicitly demonstrates this capability.",
) => ({ capabilityId, supportAssessment, groundingRationale });
const response = (results: unknown[]) => ({
  contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  results,
});
const validate = (rawResponse: unknown) => validateCareerCapabilityStructuredInferenceResponse({
  response: rawResponse,
  eligibleEvidence,
  canonicalCapabilities: definitions,
});
const issueCodes = (result: ReturnType<typeof validate>) => [
  ...result.responseIssues.map((item) => item.code),
  ...result.rejectedEvidenceResults.flatMap((item) => item.issues.map((entry) => entry.code)),
];

function main() {
  const validKnown = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [assessment("measurement-design")] }]));
  assert.equal(validKnown.validEvidenceResults.length, 1);
  assert.equal(validKnown.rejectedEvidenceResults.length, 0);
  assert.equal(validKnown.validEvidenceResults[0].capabilityAssessments[0].capabilityId, "measurement-design");

  const zero = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [] }]));
  assert.equal(zero.validEvidenceResults.length, 1);
  assert.deepEqual(zero.validEvidenceResults[0].capabilityAssessments, []);

  const unknownCapability = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [assessment("invented-capability")] }]));
  assert.deepEqual(issueCodes(unknownCapability), ["unknown_capability"]);
  assert.equal(unknownCapability.validEvidenceResults.length, 0);
  assert.equal(canonicalCapabilityLibrary.capabilities.some((item) => item.id === "invented-capability"), false);

  const unknownEvidence = validate(response([{ evidenceId: "evidence:manufactured", capabilityAssessments: [] }]));
  assert.deepEqual(issueCodes(unknownEvidence), ["unknown_evidence"]);

  const blankRationale = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [assessment("measurement-design", "directly_supported", "  ")] }]));
  assert.deepEqual(issueCodes(blankRationale), ["blank_grounding_rationale"]);

  const malformedResponse = validate({ results: "not-an-array" });
  assert.deepEqual(issueCodes(malformedResponse), ["invalid_contract_version", "invalid_response"]);
  const malformedResult = validate(response(["not-an-object"]));
  assert.deepEqual(issueCodes(malformedResult), ["malformed_evidence_result"]);

  const duplicateEvidenceResult = validate(response([
    { evidenceId: "evidence:one", capabilityAssessments: [] },
    { evidenceId: "evidence:one", capabilityAssessments: [] },
  ]));
  assert.equal(duplicateEvidenceResult.validEvidenceResults.length, 0);
  assert.deepEqual(issueCodes(duplicateEvidenceResult), ["duplicate_evidence_result", "duplicate_evidence_result"]);

  const duplicateCapability = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [
    assessment("measurement-design"),
    assessment("measurement-design"),
  ] }]));
  assert.deepEqual(issueCodes(duplicateCapability), ["duplicate_capability_assessment"]);

  const conflictingSupport = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [
    assessment("measurement-design", "directly_supported"),
    assessment("measurement-design", "transferable_support"),
  ] }]));
  assert.deepEqual(issueCodes(conflictingSupport), ["conflicting_support_assessment"]);

  assert.equal(MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE, 3);
  for (const count of [1, 2, 3]) {
    const capabilityIds = ["forecasting", "insight-synthesis", "measurement-design"].slice(0, count);
    const fanOut = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: capabilityIds.map((id) => assessment(id)) }]));
    assert.equal(fanOut.validEvidenceResults.length, 1, `${count} assessments should be valid`);
  }

  const fourAssessments = ["forecasting", "insight-synthesis", "measurement-design", "research-design"].map((id) => assessment(id));
  const excessiveFanOut = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: fourAssessments }]));
  assert.deepEqual(issueCodes(excessiveFanOut), ["fan_out_exceeded"]);
  assert.equal(excessiveFanOut.validEvidenceResults.length, 0);
  assert.equal(excessiveFanOut.rejectedEvidenceResults[0].issues.length, 1);

  const mixedBatch = validate(response([
    { evidenceId: "evidence:one", capabilityAssessments: fourAssessments },
    { evidenceId: "evidence:two", capabilityAssessments: [assessment("insight-synthesis")] },
  ]));
  assert.equal(mixedBatch.rejectedEvidenceResults.length, 1);
  assert.equal(mixedBatch.rejectedEvidenceResults[0].evidenceId, "evidence:one");
  assert.equal(mixedBatch.validEvidenceResults.length, 1);
  assert.equal(mixedBatch.validEvidenceResults[0].evidenceId, "evidence:two");
  assert.equal(mixedBatch.validEvidenceResults[0].capabilityAssessments.length, 1);

  const invalidSupport = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [{
    capabilityId: "measurement-design",
    supportAssessment: "probably_supported",
    groundingRationale: "Invalid support vocabulary must fail closed.",
  }] }]));
  assert.deepEqual(issueCodes(invalidSupport), ["invalid_support_assessment"]);

  const numericConfidence = validate(response([{ evidenceId: "evidence:one", capabilityAssessments: [{
    ...assessment("measurement-design"),
    confidence: 0.95,
  }] }]));
  assert.deepEqual(issueCodes(numericConfidence), ["unexpected_field"]);

  const rawResponse = response([{ evidenceId: "evidence:one", capabilityAssessments: [assessment("measurement-design")] }]);
  const rawSnapshot = JSON.stringify(rawResponse);
  const unrelatedState = Object.freeze({ capabilities: Object.freeze(["existing-state"]) });
  const isolated = validate(rawResponse);
  assert.equal(JSON.stringify(rawResponse), rawSnapshot);
  assert.deepEqual(unrelatedState.capabilities, ["existing-state"]);
  assert.notEqual(isolated.validEvidenceResults[0], rawResponse.results[0]);
  assert.equal(Object.isFrozen(isolated.validEvidenceResults[0]), true);
  assert.equal(Object.isFrozen(isolated.validEvidenceResults[0].capabilityAssessments), true);

  const contractSource = readFileSync(new URL("../../lib/career-possibility/career-capability-structured-inference-contract.ts", import.meta.url), "utf8");
  const validatorSource = readFileSync(new URL("../../lib/career-possibility/career-capability-structured-inference-validator.ts", import.meta.url), "utf8");
  assert.doesNotMatch(contractSource, /deterministicSignal|roleId|jobId|employer|roleTitle|fitScore|gapScore|confidence/);
  assert.doesNotMatch(validatorSource, /materializeProvisionalCareerMap|writeLocalCareerMapState|localStorage|indexedDB|supabase/);

  console.log("career capability structured inference validator tests passed");
}

main();
