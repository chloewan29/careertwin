import type { CanonicalCapabilityDefinition } from "./canonical-capability-library";
import type { ResumeEvidenceRecord } from "./resume-evidence-contract";

export const CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION = "1.0.0" as const;
export const CAREER_CAPABILITY_STRUCTURED_INFERENCE_VALIDATOR_VERSION = "1.0.0" as const;
export const MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE = 3 as const;

export type CareerCapabilitySupportAssessment = "directly_supported" | "transferable_support";

/** A provider receives only eligible atomic evidence identity and content. */
export type CareerCapabilityStructuredInferenceEvidence = Readonly<{
  evidenceId: ResumeEvidenceRecord["id"];
  evidenceText: ResumeEvidenceRecord["sourceText"];
}>;

export type CareerCapabilityStructuredInferenceRequest = Readonly<{
  contractVersion: typeof CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION;
  eligibleEvidence: readonly CareerCapabilityStructuredInferenceEvidence[];
  canonicalCapabilities: readonly CanonicalCapabilityDefinition[];
  capabilityRegistryVersion: string;
}>;

export type CareerCapabilityAssessment = Readonly<{
  capabilityId: string;
  supportAssessment: CareerCapabilitySupportAssessment;
  groundingRationale: string;
}>;

export type CareerCapabilityEvidenceResult = Readonly<{
  evidenceId: string;
  capabilityAssessments: readonly CareerCapabilityAssessment[];
}>;

export type CareerCapabilityStructuredInferenceResponse = Readonly<{
  contractVersion: typeof CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION;
  results: readonly CareerCapabilityEvidenceResult[];
}>;

/** Provider adapters are replaceable producers; their output still requires deterministic validation. */
export interface CareerCapabilityStructuredInferenceProducer {
  produce(
    request: CareerCapabilityStructuredInferenceRequest,
  ): Promise<CareerCapabilityStructuredInferenceResponse>;
}

export type CareerCapabilityStructuredInferenceValidationIssueCode =
  | "invalid_response"
  | "invalid_contract_version"
  | "unexpected_field"
  | "malformed_evidence_result"
  | "invalid_evidence_id"
  | "unknown_evidence"
  | "duplicate_evidence_result"
  | "fan_out_exceeded"
  | "malformed_capability_assessment"
  | "unknown_capability"
  | "invalid_support_assessment"
  | "blank_grounding_rationale"
  | "duplicate_capability_assessment"
  | "conflicting_support_assessment";

export type CareerCapabilityStructuredInferenceValidationIssue = Readonly<{
  code: CareerCapabilityStructuredInferenceValidationIssueCode;
  path: string;
  message: string;
}>;

export type ValidatedCareerCapabilityEvidenceResult = Readonly<{
  evidenceId: string;
  capabilityAssessments: readonly CareerCapabilityAssessment[];
}>;

export type RejectedCareerCapabilityEvidenceResult = Readonly<{
  resultIndex: number;
  evidenceId: string | null;
  issues: readonly CareerCapabilityStructuredInferenceValidationIssue[];
}>;

export type CareerCapabilityStructuredInferenceValidationResult = Readonly<{
  contractVersion: typeof CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION;
  validatorVersion: typeof CAREER_CAPABILITY_STRUCTURED_INFERENCE_VALIDATOR_VERSION;
  validEvidenceResults: readonly ValidatedCareerCapabilityEvidenceResult[];
  rejectedEvidenceResults: readonly RejectedCareerCapabilityEvidenceResult[];
  responseIssues: readonly CareerCapabilityStructuredInferenceValidationIssue[];
}>;

export type ValidateCareerCapabilityStructuredInferenceInput = Readonly<{
  response: unknown;
  eligibleEvidence: readonly CareerCapabilityStructuredInferenceEvidence[];
  canonicalCapabilities: readonly CanonicalCapabilityDefinition[];
}>;
