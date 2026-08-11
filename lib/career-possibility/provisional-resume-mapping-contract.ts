import type { EvidenceCapabilityRelationship, EvidenceReviewStatus } from "./resume-evidence-contract";

export const PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION = "1.0.0" as const;
export type ProvisionalMappingRelationship = Exclude<EvidenceCapabilityRelationship, "possible">;
export type ProvisionalMappingAdmissionStatus = "auto_admitted" | "unresolved" | "user_confirmed" | "user_edited" | "rejected";
export type ProvisionalMappingMethod = "authored_deterministic" | "structured_inference";
export type ProvisionalMappingSignalField = "action" | "context" | "outcome" | "ownership" | "scope";
export type ProvisionalUnresolvedReason = "multiple_candidates" | "relationship_conflict" | "invalid_evidence" | "invalid_policy" | "no_canonical_rule" | "unexpected_mapping_failure";

export type ProvisionalEvidenceSignal = Readonly<{ field: ProvisionalMappingSignalField; value: string }>;
export type ProvisionalMappingEvidence = Readonly<{
  evidenceId: string;
  sourceExcerpt: string;
  sourceLocator: Readonly<{ locatorId: string; startOffset: number; endOffset: number; pageNumber?: number }>;
  signals: readonly ProvisionalEvidenceSignal[];
  titleSignals?: readonly string[];
  toolSignals?: readonly string[];
}>;

type ProvisionalAutoAdmittedMappingBase = Readonly<{
  contractVersion: typeof PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION;
  mappingId: string;
  evidenceId: string;
  capabilityId: string;
  relationship: ProvisionalMappingRelationship;
  reviewStatus: Extract<EvidenceReviewStatus, "unreviewed">;
  admissionStatus: Extract<ProvisionalMappingAdmissionStatus, "auto_admitted">;
  explanation: string;
  mappingPolicyVersion: string;
  capabilityDefinitionVersion: string;
}>;

export type ProvisionalDeterministicAutoAdmittedMapping = ProvisionalAutoAdmittedMappingBase & Readonly<{
  method: Extract<ProvisionalMappingMethod, "authored_deterministic">;
  matchedRuleId: string;
}>;

export type ProvisionalStructuredAutoAdmittedMapping = ProvisionalAutoAdmittedMappingBase & Readonly<{
  method: Extract<ProvisionalMappingMethod, "structured_inference">;
  matchedRuleId?: never;
}>;

export type ProvisionalAutoAdmittedMapping =
  | ProvisionalDeterministicAutoAdmittedMapping
  | ProvisionalStructuredAutoAdmittedMapping;

export type ProvisionalUnresolvedMapping = Readonly<{
  contractVersion: typeof PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION;
  evidenceId: string;
  sourceExcerpt: string;
  sourceLocator: ProvisionalMappingEvidence["sourceLocator"];
  reviewStatus: Extract<EvidenceReviewStatus, "unreviewed">;
  admissionStatus: Extract<ProvisionalMappingAdmissionStatus, "unresolved">;
  reason: ProvisionalUnresolvedReason;
  candidateCapabilityIds: readonly string[];
  candidateRelationships: readonly ProvisionalMappingRelationship[];
  matchingRuleIds: readonly string[];
  explanation: string;
  mappingPolicyVersion: string;
  capabilityDefinitionVersion: string;
}>;

export type ProvisionalMappingResult =
  | Readonly<{ status: "auto_admitted"; mapping: ProvisionalAutoAdmittedMapping }>
  | Readonly<{ status: "unresolved"; unresolved: ProvisionalUnresolvedMapping }>
  | Readonly<{ status: "unsupported"; unresolved: ProvisionalUnresolvedMapping }>;

export type ProvisionalMappingRule = Readonly<{
  ruleId: string;
  ruleVersion: string;
  capabilityId: string;
  relationship: ProvisionalMappingRelationship;
  requiredSignals: readonly ProvisionalEvidenceSignal[];
  excludedSignals: readonly ProvisionalEvidenceSignal[];
  explanation: string;
}>;

export type ProvisionalMappingPolicy = Readonly<{
  policyVersion: string;
  coverage: "bounded_non_exhaustive";
  rules: readonly ProvisionalMappingRule[];
}>;

export type ProvisionalMappingValidationIssue = Readonly<{ code: string; path: string; message: string }>;
