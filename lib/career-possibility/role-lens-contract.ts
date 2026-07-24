import type { CapabilityImportance, GrowthAreaType, GrowthPriority, RoleCapabilityProfile } from "./role-capability-library";
import { getRoleCapabilityRequirements } from "./role-capability-library";

export const ROLE_LENS_SCHEMA_VERSION = "1.0.0" as const;

export type SupportedCapabilityItem = { capabilityId: string; label: string; evidenceIds: string[]; strength: "strong" | "moderate"; requirementImportance: CapabilityImportance };
export type TransferableSignalItem = { label: string; relatedCapabilityIds: string[]; evidenceIds: string[]; reason: string; confidence: number };
export type RoleLensGrowthAreaItem = { id: string; label: string; type: GrowthAreaType; reason: string; proofToBuild: string; priority: GrowthPriority; relatedCapabilityIds: string[] };

export type RoleLensResult = {
  roleFamilyId: string;
  roleTitle: string;
  pathCategory: "strong" | "good" | "stretch";
  qualitativeFit: "Strong path" | "Good path" | "Stretch path";
  supportedCapabilities: SupportedCapabilityItem[];
  transferableSignals: TransferableSignalItem[];
  growthAreas: RoleLensGrowthAreaItem[];
  missingProof: string[];
  supportingEvidenceIds: string[];
  confidence: number;
  validationWarnings: string[];
  schemaVersion: string;
};

export type RoleLensValidationIssue = { code: string; message: string };

export function validateRoleLensResult(result: RoleLensResult, profile: RoleCapabilityProfile): RoleLensValidationIssue[] {
  const issues: RoleLensValidationIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  if (!result.schemaVersion || !result.roleFamilyId) add("missing_schema_identity", "Role lens schemaVersion and roleFamilyId are required.");
  if (result.roleFamilyId !== profile.roleFamilyId) add("role_family_mismatch", "Role lens result does not match the supplied role profile.");
  const requirementIds = new Set(getRoleCapabilityRequirements(profile).map((requirement) => requirement.capabilityId));
  const transferableIds = new Set(result.transferableSignals.flatMap((signal) => signal.relatedCapabilityIds));
  for (const capability of result.supportedCapabilities) {
    if (!requirementIds.has(capability.capabilityId) && !transferableIds.has(capability.capabilityId)) add("unknown_capability_reference", `Capability ${capability.capabilityId} is not required or marked transferable.`);
    if (capability.evidenceIds.length === 0) add("supported_capability_missing_evidence", `Supported capability ${capability.capabilityId} requires evidenceIds.`);
  }
  if (result.confidence >= 0.8 && result.supportedCapabilities.filter((item) => item.evidenceIds.length > 0).length < 2) add("unsupported_high_confidence", "High confidence requires at least two evidence-backed capabilities.");
  if (result.confidence < 0 || result.confidence > 1) add("invalid_confidence", "Confidence must be between 0 and 1.");
  if (result.growthAreas.some((area) => /\b(weakness|not qualified|failure)\b/i.test(`${area.label} ${area.reason} ${area.proofToBuild}`))) add("harsh_gap_wording", "Growth areas must use constructive wording.");
  return issues;
}

export const ROLE_LENS_LLM_GUIDANCE = [
  "LLM output must conform to RoleLensResult and pass validateRoleLensResult.",
  "Evidence-backed capabilities require evidenceIds.",
  "High-confidence output requires multiple evidence-backed capabilities.",
  "New capability concepts remain provisional until mapped to the canonical taxonomy.",
] as const;
