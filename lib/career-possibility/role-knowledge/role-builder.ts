import { canonicalCapabilityLibrary } from "../canonical-capability-library";
import { type CapabilityImportance, type MinimumProofLevel, type RoleEvidenceProofType } from "../role-capability-library";
import { type ArchetypeCapability, type ArchetypeEvidenceExpectation } from "./role-profile";

const canonicalById = new Map(canonicalCapabilityLibrary.capabilities.map((item) => [item.id, item]));

export const buildCapability = (
  id: string,
  importance: CapabilityImportance,
  expectedEvidence: string,
  minimumProofLevel: MinimumProofLevel = "demonstrated"
): ArchetypeCapability => {
  const canonical = canonicalById.get(id);
  if (!canonical) throw new Error(`Unknown authored canonical capability ${id}.`);
  return Object.freeze({
    capabilityId: id,
    label: canonical.label,
    canonicalFamily: canonical.family,
    importance,
    expectedEvidence,
    minimumProofLevel,
  });
};

export const buildExpectation = (
  id: string,
  capabilityId: string,
  proofType: RoleEvidenceProofType,
  description: string
): ArchetypeEvidenceExpectation =>
  Object.freeze({ id, capabilityId, proofType, description });
