import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_VALIDATOR_VERSION,
  MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE,
  type CareerCapabilityAssessment,
  type CareerCapabilityStructuredInferenceValidationIssue,
  type CareerCapabilityStructuredInferenceValidationIssueCode,
  type CareerCapabilityStructuredInferenceValidationResult,
  type RejectedCareerCapabilityEvidenceResult,
  type ValidateCareerCapabilityStructuredInferenceInput,
  type ValidatedCareerCapabilityEvidenceResult,
} from "./career-capability-structured-inference-contract";

const responseKeys = new Set(["contractVersion", "results"]);
const evidenceResultKeys = new Set(["evidenceId", "capabilityAssessments"]);
const assessmentKeys = new Set(["capabilityId", "supportAssessment", "groundingRationale"]);
const supportAssessments = new Set(["directly_supported", "transferable_support"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(
  code: CareerCapabilityStructuredInferenceValidationIssueCode,
  path: string,
  message: string,
): CareerCapabilityStructuredInferenceValidationIssue {
  return Object.freeze({ code, path, message });
}

function unexpectedFieldIssues(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
): CareerCapabilityStructuredInferenceValidationIssue[] {
  return Object.keys(value)
    .filter((key) => !allowedKeys.has(key))
    .sort()
    .map((key) => issue("unexpected_field", `${path}.${key}`, `Unexpected field ${key}.`));
}

function resultEnvelope(
  validEvidenceResults: readonly ValidatedCareerCapabilityEvidenceResult[],
  rejectedEvidenceResults: readonly RejectedCareerCapabilityEvidenceResult[],
  responseIssues: readonly CareerCapabilityStructuredInferenceValidationIssue[],
): CareerCapabilityStructuredInferenceValidationResult {
  return Object.freeze({
    contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
    validatorVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_VALIDATOR_VERSION,
    validEvidenceResults: Object.freeze([...validEvidenceResults]),
    rejectedEvidenceResults: Object.freeze([...rejectedEvidenceResults]),
    responseIssues: Object.freeze([...responseIssues]),
  });
}

function responseFailure(
  issues: readonly CareerCapabilityStructuredInferenceValidationIssue[],
): CareerCapabilityStructuredInferenceValidationResult {
  return resultEnvelope([], [], issues);
}

export function validateCareerCapabilityStructuredInferenceResponse(
  input: ValidateCareerCapabilityStructuredInferenceInput,
): CareerCapabilityStructuredInferenceValidationResult {
  if (!isRecord(input.response)) {
    return responseFailure([issue("invalid_response", "$", "Response must be an object.")]);
  }

  const responseIssues = unexpectedFieldIssues(input.response, responseKeys, "$");
  if (input.response.contractVersion !== CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION) {
    responseIssues.push(issue("invalid_contract_version", "$.contractVersion", `Expected contract version ${CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION}.`));
  }
  if (!Array.isArray(input.response.results)) {
    responseIssues.push(issue("invalid_response", "$.results", "Results must be an array."));
  }
  if (responseIssues.length > 0 || !Array.isArray(input.response.results)) {
    return responseFailure(responseIssues);
  }

  const eligibleEvidenceIds = new Set(input.eligibleEvidence.map((item) => item.evidenceId));
  const canonicalCapabilityIds = new Set(input.canonicalCapabilities.map((item) => item.id));
  const duplicateEvidenceIds = new Set<string>();
  const evidenceResultCounts = new Map<string, number>();

  for (const value of input.response.results) {
    if (!isRecord(value) || typeof value.evidenceId !== "string" || value.evidenceId.trim().length === 0) continue;
    evidenceResultCounts.set(value.evidenceId, (evidenceResultCounts.get(value.evidenceId) ?? 0) + 1);
  }
  for (const [evidenceId, count] of evidenceResultCounts) {
    if (count > 1) duplicateEvidenceIds.add(evidenceId);
  }

  const validEvidenceResults: ValidatedCareerCapabilityEvidenceResult[] = [];
  const rejectedEvidenceResults: RejectedCareerCapabilityEvidenceResult[] = [];

  input.response.results.forEach((value, resultIndex) => {
    const path = `$.results[${resultIndex}]`;
    const issues: CareerCapabilityStructuredInferenceValidationIssue[] = [];
    let evidenceId: string | null = null;

    if (!isRecord(value)) {
      issues.push(issue("malformed_evidence_result", path, "Evidence result must be an object."));
    } else {
      issues.push(...unexpectedFieldIssues(value, evidenceResultKeys, path));
      if (typeof value.evidenceId !== "string" || value.evidenceId.trim().length === 0) {
        issues.push(issue("invalid_evidence_id", `${path}.evidenceId`, "Evidence ID must be a nonblank string."));
      } else {
        evidenceId = value.evidenceId;
        if (!eligibleEvidenceIds.has(evidenceId)) {
          issues.push(issue("unknown_evidence", `${path}.evidenceId`, `Evidence ID ${evidenceId} is not in the eligible evidence set.`));
        }
        if (duplicateEvidenceIds.has(evidenceId)) {
          issues.push(issue("duplicate_evidence_result", `${path}.evidenceId`, `Evidence ID ${evidenceId} appears in more than one result.`));
        }
      }

      if (!Array.isArray(value.capabilityAssessments)) {
        issues.push(issue("malformed_evidence_result", `${path}.capabilityAssessments`, "Capability assessments must be an array."));
      } else if (value.capabilityAssessments.length > MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE) {
        issues.push(issue("fan_out_exceeded", `${path}.capabilityAssessments`, `An evidence result may contain at most ${MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE} capability assessments.`));
      } else {
        const seenSupportByCapability = new Map<string, string>();
        const validatedAssessments: CareerCapabilityAssessment[] = [];

        value.capabilityAssessments.forEach((assessment, assessmentIndex) => {
          const assessmentPath = `${path}.capabilityAssessments[${assessmentIndex}]`;
          if (!isRecord(assessment)) {
            issues.push(issue("malformed_capability_assessment", assessmentPath, "Capability assessment must be an object."));
            return;
          }

          issues.push(...unexpectedFieldIssues(assessment, assessmentKeys, assessmentPath));
          const capabilityId = assessment.capabilityId;
          const supportAssessment = assessment.supportAssessment;
          const groundingRationale = assessment.groundingRationale;

          if (typeof capabilityId !== "string" || capabilityId.trim().length === 0) {
            issues.push(issue("malformed_capability_assessment", `${assessmentPath}.capabilityId`, "Capability ID must be a nonblank string."));
          } else {
            if (!canonicalCapabilityIds.has(capabilityId)) {
              issues.push(issue("unknown_capability", `${assessmentPath}.capabilityId`, `Capability ID ${capabilityId} is not in the canonical capability library.`));
            }
            const previousSupport = seenSupportByCapability.get(capabilityId);
            if (previousSupport !== undefined) {
              issues.push(issue(
                previousSupport === supportAssessment ? "duplicate_capability_assessment" : "conflicting_support_assessment",
                `${assessmentPath}.capabilityId`,
                previousSupport === supportAssessment
                  ? `Capability ID ${capabilityId} appears more than once for this evidence result.`
                  : `Capability ID ${capabilityId} has conflicting support assessments for this evidence result.`,
              ));
            } else if (typeof supportAssessment === "string") {
              seenSupportByCapability.set(capabilityId, supportAssessment);
            }
          }

          if (typeof supportAssessment !== "string" || !supportAssessments.has(supportAssessment)) {
            issues.push(issue("invalid_support_assessment", `${assessmentPath}.supportAssessment`, "Support assessment must be directly_supported or transferable_support."));
          }
          if (typeof groundingRationale !== "string" || groundingRationale.trim().length === 0) {
            issues.push(issue("blank_grounding_rationale", `${assessmentPath}.groundingRationale`, "Grounding rationale must be a nonblank string."));
          }

          if (
            typeof capabilityId === "string"
            && canonicalCapabilityIds.has(capabilityId)
            && typeof supportAssessment === "string"
            && supportAssessments.has(supportAssessment)
            && typeof groundingRationale === "string"
            && groundingRationale.trim().length > 0
          ) {
            validatedAssessments.push(Object.freeze({
              capabilityId,
              supportAssessment: supportAssessment as CareerCapabilityAssessment["supportAssessment"],
              groundingRationale,
            }));
          }
        });

        if (issues.length === 0 && evidenceId !== null) {
          validEvidenceResults.push(Object.freeze({
            evidenceId,
            capabilityAssessments: Object.freeze(validatedAssessments),
          }));
        }
      }
    }

    if (issues.length > 0) {
      rejectedEvidenceResults.push(Object.freeze({
        resultIndex,
        evidenceId,
        issues: Object.freeze(issues),
      }));
    }
  });

  return resultEnvelope(validEvidenceResults, rejectedEvidenceResults, []);
}
