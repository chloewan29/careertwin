export const CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION = "1.0.0" as const;

export type CanonicalCapabilityRelationship = "direct_evidence" | "transferable_signal";
export type CanonicalSemanticSignalField = "action" | "context" | "outcome" | "ownership" | "scope";
export type CanonicalSemanticSignal = Readonly<{ field: CanonicalSemanticSignalField; value: string }>;

export type CanonicalInferenceEvidence = Readonly<{
  evidenceId: string;
  sourceExcerpt: string;
  sourceLocator: Readonly<{ locatorId: string; startOffset: number; endOffset: number; pageNumber?: number }>;
  /** Explicitly nullable for compatibility inputs; never fabricated. */
  sourceRevision: string | null;
  signals: readonly CanonicalSemanticSignal[];
}>;

export type CanonicalInferenceRule = Readonly<{
  ruleId: string;
  ruleVersion: string;
  capabilityId: string;
  relationship: CanonicalCapabilityRelationship;
  requiredSignals: readonly CanonicalSemanticSignal[];
  excludedSignals: readonly CanonicalSemanticSignal[];
  explanation: string;
}>;

export type CanonicalInferencePolicy = Readonly<{
  policyVersion: string;
  coverage: "bounded_non_exhaustive";
  rules: readonly CanonicalInferenceRule[];
}>;

export type CanonicalInferenceReason =
  | "multiple_candidates"
  | "relationship_conflict"
  | "invalid_evidence"
  | "invalid_policy"
  | "no_canonical_rule"
  | "unexpected_mapping_failure";

export type CanonicalCapabilityProposal = Readonly<{
  contractVersion: typeof CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION;
  proposalId: string;
  evidenceId: string;
  capabilityId: string;
  relationship: CanonicalCapabilityRelationship;
  method: "authored_deterministic";
  matchedRuleId: string;
  matchedRuleVersion: string;
  explanation: string;
  inferencePolicyVersion: string;
  capabilityRegistryVersion: string;
}>;

export type CanonicalUnresolvedCapabilityProposal = Readonly<{
  contractVersion: typeof CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION;
  evidenceId: string;
  sourceExcerpt: string;
  sourceLocator: CanonicalInferenceEvidence["sourceLocator"];
  sourceRevision: string | null;
  reason: CanonicalInferenceReason;
  candidateCapabilityIds: readonly string[];
  candidateRelationships: readonly CanonicalCapabilityRelationship[];
  matchingRuleIds: readonly string[];
  explanation: string;
  inferencePolicyVersion: string;
  capabilityRegistryVersion: string;
}>;

export type CanonicalCapabilityInferenceResult =
  | Readonly<{ disposition: "admitted"; proposal: CanonicalCapabilityProposal }>
  | Readonly<{ disposition: "unresolved"; unresolved: CanonicalUnresolvedCapabilityProposal }>
  | Readonly<{ disposition: "unsupported"; unresolved: CanonicalUnresolvedCapabilityProposal }>;

export type CanonicalCapabilityInferenceIssue = Readonly<{ code: string; path: string; message: string }>;
