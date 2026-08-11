import type { CanonicalCapabilityDefinition } from "./canonical-capability-library";
import { inferCanonicalPersonalCapability, inferCanonicalPersonalCapabilities, validateCanonicalInferencePolicy } from "./canonical-personal-capability-inference";
import type { CanonicalPluralCapabilityInferenceResult } from "./canonical-personal-capability-inference-contract";
import type { CanonicalInferenceEvidence } from "./canonical-personal-capability-inference-contract";
import {
  PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION,
  type ProvisionalAutoAdmittedMapping,
  type ProvisionalMappingEvidence,
  type ProvisionalMappingPolicy,
  type ProvisionalMappingResult,
  type ProvisionalMappingValidationIssue,
  type ProvisionalUnresolvedMapping,
} from "./provisional-resume-mapping-contract";

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const relationship = (value: unknown): value is ProvisionalAutoAdmittedMapping["relationship"] => value === "direct_evidence" || value === "transferable_signal";

export function validateProvisionalMappingPolicy(policy: ProvisionalMappingPolicy, definitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]): readonly ProvisionalMappingValidationIssue[] {
  return validateCanonicalInferencePolicy(policy, definitions);
}

export function validateProvisionalAutoAdmittedMapping(value: ProvisionalAutoAdmittedMapping, definitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]): readonly ProvisionalMappingValidationIssue[] {
  const issues: ProvisionalMappingValidationIssue[] = [];
  const capabilityIds = new Set(definitions.map((item) => item.id));
  if (!nonBlank(value?.mappingId) || !nonBlank(value?.evidenceId)) issues.push({ code: "invalid_mapping", path: "identity", message: "Mapping and evidence identities are required." });
  if (!capabilityIds.has(value?.capabilityId)) issues.push({ code: "unknown_capability", path: "capabilityId", message: "Mapping references an unknown canonical capability." });
  if (!relationship(value?.relationship)) issues.push({ code: "invalid_mapping", path: "relationship", message: "Mapping relationship is invalid." });
  if (value?.reviewStatus !== "unreviewed" || value?.admissionStatus !== "auto_admitted") issues.push({ code: "review_status_promoted", path: "status", message: "Automatic mappings must remain unreviewed and auto-admitted." });
  if (value?.method === "authored_deterministic") {
    if (!nonBlank(value.matchedRuleId)) issues.push({ code: "invalid_mapping", path: "matchedRuleId", message: "Deterministic mappings require a real matched rule ID." });
  } else if (value?.method === "structured_inference") {
    if ("matchedRuleId" in value) issues.push({ code: "invalid_mapping", path: "matchedRuleId", message: "Structured inference mappings must not contain a matched rule ID." });
  } else {
    issues.push({ code: "invalid_mapping", path: "method", message: "Mapping method is invalid." });
  }
  if (!nonBlank(value?.explanation) || !nonBlank(value?.mappingPolicyVersion) || !nonBlank(value?.capabilityDefinitionVersion)) issues.push({ code: "invalid_mapping", path: "provenance", message: "Mapping explanation and version provenance are required." });
  return Object.freeze(issues);
}

export function validateProvisionalUnresolvedMapping(value: ProvisionalUnresolvedMapping, definitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]): readonly ProvisionalMappingValidationIssue[] {
  const issues: ProvisionalMappingValidationIssue[] = [];
  const capabilityIds = new Set(definitions.map((item) => item.id));
  if (!nonBlank(value?.evidenceId) || !nonBlank(value?.sourceExcerpt) || !nonBlank(value?.sourceLocator?.locatorId)) issues.push({ code: "invalid_unresolved_mapping", path: "identity", message: "Unresolved evidence identity and source reference are required." });
  if (value?.reviewStatus !== "unreviewed" || value?.admissionStatus !== "unresolved") issues.push({ code: "review_status_promoted", path: "status", message: "Unresolved automatic evidence must remain unreviewed." });
  if (!nonBlank(value?.reason) || !nonBlank(value?.explanation) || !nonBlank(value?.mappingPolicyVersion) || !nonBlank(value?.capabilityDefinitionVersion)) issues.push({ code: "invalid_unresolved_mapping", path: "provenance", message: "Unresolved reason, explanation, and versions are required." });
  value?.candidateCapabilityIds?.forEach((id, index) => { if (!capabilityIds.has(id)) issues.push({ code: "unknown_capability", path: `candidateCapabilityIds[${index}]`, message: "Unresolved candidate references an unknown capability." }); });
  return Object.freeze(issues);
}

export async function mapProvisionalResumeEvidence(input: { evidence: ProvisionalMappingEvidence; policy: ProvisionalMappingPolicy; capabilityDefinitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]; capabilityDefinitionVersion: string }): Promise<ProvisionalMappingResult> {
  const canonicalEvidence: CanonicalInferenceEvidence = Object.freeze({ evidenceId: input.evidence?.evidenceId, sourceExcerpt: input.evidence?.sourceExcerpt, sourceLocator: input.evidence?.sourceLocator, sourceRevision: null, signals: input.evidence?.signals });
  const result = await inferCanonicalPersonalCapability({ evidence: canonicalEvidence, policy: input.policy, capabilityDefinitions: input.capabilityDefinitions, capabilityRegistryVersion: input.capabilityDefinitionVersion });
  if (result.disposition === "admitted") {
    const proposal = result.proposal;
    return Object.freeze({ status: "auto_admitted", mapping: Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, mappingId: proposal.proposalId, evidenceId: proposal.evidenceId, capabilityId: proposal.capabilityId, relationship: proposal.relationship, reviewStatus: "unreviewed", admissionStatus: "auto_admitted", method: proposal.method, matchedRuleId: proposal.matchedRuleId, explanation: proposal.explanation, mappingPolicyVersion: proposal.inferencePolicyVersion, capabilityDefinitionVersion: proposal.capabilityRegistryVersion }) });
  }
  const unresolved = result.unresolved;
  const legacy: ProvisionalUnresolvedMapping = Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, evidenceId: unresolved.evidenceId, sourceExcerpt: unresolved.sourceExcerpt, sourceLocator: unresolved.sourceLocator, reviewStatus: "unreviewed", admissionStatus: "unresolved", reason: unresolved.reason, candidateCapabilityIds: unresolved.candidateCapabilityIds, candidateRelationships: unresolved.candidateRelationships, matchingRuleIds: unresolved.matchingRuleIds, explanation: unresolved.explanation, mappingPolicyVersion: unresolved.inferencePolicyVersion, capabilityDefinitionVersion: unresolved.capabilityRegistryVersion });
  return Object.freeze(result.disposition === "unsupported" ? { status: "unsupported", unresolved: legacy } : { status: "unresolved", unresolved: legacy });
}

export function projectPluralCanonicalInferenceToProvisionalMappingResults(result: CanonicalPluralCapabilityInferenceResult, evidence: ProvisionalMappingEvidence): readonly ProvisionalMappingResult[] {
  const admitted = result.admittedProposals.map((proposal): ProvisionalMappingResult => Object.freeze({ status: "auto_admitted", mapping: Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, mappingId: proposal.proposalId, evidenceId: proposal.evidenceId, capabilityId: proposal.capabilityId, relationship: proposal.relationship, reviewStatus: "unreviewed", admissionStatus: "auto_admitted", method: proposal.method, matchedRuleId: proposal.matchedRuleId, explanation: proposal.explanation, mappingPolicyVersion: proposal.inferencePolicyVersion, capabilityDefinitionVersion: proposal.capabilityRegistryVersion }) }));
  const unresolved = result.unresolved.map((item): ProvisionalMappingResult => Object.freeze({ status: "unresolved", unresolved: Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, evidenceId: item.evidenceId, sourceExcerpt: evidence.sourceExcerpt, sourceLocator: evidence.sourceLocator, reviewStatus: "unreviewed", admissionStatus: "unresolved", reason: item.reason, candidateCapabilityIds: Object.freeze(item.capabilityId ? [item.capabilityId] : []), candidateRelationships: item.candidateRelationships, matchingRuleIds: item.matchingRuleIds, explanation: item.explanation, mappingPolicyVersion: item.inferencePolicyVersion, capabilityDefinitionVersion: item.capabilityRegistryVersion }) }));
  const unsupported = result.unsupportedResidue.map((): ProvisionalMappingResult => Object.freeze({ status: "unsupported", unresolved: Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, evidenceId: evidence.evidenceId, sourceExcerpt: evidence.sourceExcerpt, sourceLocator: evidence.sourceLocator, reviewStatus: "unreviewed", admissionStatus: "unresolved", reason: "no_canonical_rule", candidateCapabilityIds: Object.freeze([]), candidateRelationships: Object.freeze([]), matchingRuleIds: Object.freeze([]), explanation: "No authored canonical mapping rule covers this evidence.", mappingPolicyVersion: result.inferencePolicyVersion, capabilityDefinitionVersion: result.capabilityRegistryVersion }) }));
  return Object.freeze([...admitted, ...unresolved, ...unsupported]);
}

export async function mapProvisionalResumeEvidencePlural(input: { evidence: ProvisionalMappingEvidence; policy: ProvisionalMappingPolicy; capabilityDefinitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]; capabilityDefinitionVersion: string }): Promise<readonly ProvisionalMappingResult[]> {
  const canonicalEvidence: CanonicalInferenceEvidence = Object.freeze({ evidenceId: input.evidence?.evidenceId, sourceExcerpt: input.evidence?.sourceExcerpt, sourceLocator: input.evidence?.sourceLocator, sourceRevision: null, signals: input.evidence?.signals });
  const result = await inferCanonicalPersonalCapabilities({ evidence: canonicalEvidence, policy: input.policy, capabilityDefinitions: input.capabilityDefinitions, capabilityRegistryVersion: input.capabilityDefinitionVersion });
  return projectPluralCanonicalInferenceToProvisionalMappingResults(result, input.evidence);
}
