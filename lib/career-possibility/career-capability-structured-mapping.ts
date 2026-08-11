import type { CareerCapabilityStructuredInferenceValidationResult } from "./career-capability-structured-inference-contract";
import {
  PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION,
  type ProvisionalMappingRelationship,
  type ProvisionalMappingResult,
  type ProvisionalStructuredAutoAdmittedMapping,
} from "./provisional-resume-mapping-contract";

export const CAREER_CAPABILITY_STRUCTURED_MAPPING_ADAPTER_VERSION = "career-capability-structured-mapping/1.0.0" as const;

export type CareerCapabilityStructuredMappingConflict = Readonly<{
  evidenceId: string;
  capabilityId: string;
  deterministicRelationship: ProvisionalMappingRelationship;
  rejectedStructuredRelationship: ProvisionalMappingRelationship;
}>;

const compare = (left: string, right: string) => left.localeCompare(right, "en");
const pairKey = (evidenceId: string, capabilityId: string) => `${evidenceId}\u0000${capabilityId}`;
const relationshipFor = (supportAssessment: "directly_supported" | "transferable_support"): ProvisionalMappingRelationship =>
  supportAssessment === "directly_supported" ? "direct_evidence" : "transferable_signal";

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function adaptValidatedStructuredCapabilityMappings(input: {
  validation: CareerCapabilityStructuredInferenceValidationResult;
  mappingPolicyVersion: string;
  capabilityDefinitionVersion: string;
}): Promise<readonly ProvisionalStructuredAutoAdmittedMapping[]> {
  const mappings: ProvisionalStructuredAutoAdmittedMapping[] = [];
  for (const result of input.validation.validEvidenceResults) {
    for (const assessment of result.capabilityAssessments) {
      const relationship = relationshipFor(assessment.supportAssessment);
      const identity = await sha256(JSON.stringify({
        adapterVersion: CAREER_CAPABILITY_STRUCTURED_MAPPING_ADAPTER_VERSION,
        validatorVersion: input.validation.validatorVersion,
        evidenceId: result.evidenceId,
        capabilityId: assessment.capabilityId,
        relationship,
        capabilityDefinitionVersion: input.capabilityDefinitionVersion,
      }));
      mappings.push(Object.freeze({
        contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION,
        mappingId: `provisional-structured-mapping:1.0.0:sha256:${identity}`,
        evidenceId: result.evidenceId,
        capabilityId: assessment.capabilityId,
        relationship,
        reviewStatus: "unreviewed",
        admissionStatus: "auto_admitted",
        method: "structured_inference",
        explanation: "Admitted from validated structured capability inference.",
        mappingPolicyVersion: input.mappingPolicyVersion,
        capabilityDefinitionVersion: input.capabilityDefinitionVersion,
      }));
    }
  }
  return Object.freeze(mappings.sort((left, right) =>
    compare(left.evidenceId, right.evidenceId)
    || compare(left.capabilityId, right.capabilityId)
    || compare(left.relationship, right.relationship)));
}

export function mergeDeterministicAndStructuredMappings(input: {
  deterministicResults: readonly ProvisionalMappingResult[];
  structuredMappings: readonly ProvisionalStructuredAutoAdmittedMapping[];
}): Readonly<{
  mappingResults: readonly ProvisionalMappingResult[];
  conflicts: readonly CareerCapabilityStructuredMappingConflict[];
}> {
  const deterministicByPair = new Map<string, Extract<ProvisionalMappingResult, { status: "auto_admitted" }>["mapping"]>();
  const deterministicEvidenceIds = new Set<string>();
  for (const result of input.deterministicResults) {
    if (result.status !== "auto_admitted") continue;
    deterministicByPair.set(pairKey(result.mapping.evidenceId, result.mapping.capabilityId), result.mapping);
    deterministicEvidenceIds.add(result.mapping.evidenceId);
  }

  const acceptedStructured: ProvisionalStructuredAutoAdmittedMapping[] = [];
  const acceptedPairs = new Set<string>();
  const conflicts: CareerCapabilityStructuredMappingConflict[] = [];
  for (const mapping of input.structuredMappings) {
    const key = pairKey(mapping.evidenceId, mapping.capabilityId);
    const deterministic = deterministicByPair.get(key);
    if (deterministic) {
      if (deterministic.relationship !== mapping.relationship) {
        conflicts.push(Object.freeze({
          evidenceId: mapping.evidenceId,
          capabilityId: mapping.capabilityId,
          deterministicRelationship: deterministic.relationship,
          rejectedStructuredRelationship: mapping.relationship,
        }));
      }
      continue;
    }
    if (acceptedPairs.has(key)) continue;
    acceptedPairs.add(key);
    acceptedStructured.push(mapping);
  }

  const structuredEvidenceIds = new Set(acceptedStructured.map((mapping) => mapping.evidenceId));
  const retainedDeterministicResults = input.deterministicResults.filter((result) =>
    result.status === "auto_admitted"
    || deterministicEvidenceIds.has(result.unresolved.evidenceId)
    || !structuredEvidenceIds.has(result.unresolved.evidenceId));
  const structuredResults = acceptedStructured.map((mapping): ProvisionalMappingResult =>
    Object.freeze({ status: "auto_admitted", mapping }));

  return Object.freeze({
    mappingResults: Object.freeze([...retainedDeterministicResults, ...structuredResults]),
    conflicts: Object.freeze(conflicts.sort((left, right) =>
      compare(left.evidenceId, right.evidenceId) || compare(left.capabilityId, right.capabilityId))),
  });
}
