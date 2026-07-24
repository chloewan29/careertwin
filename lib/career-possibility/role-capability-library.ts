export const ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION = "1.0.0" as const;

export type CapabilityImportance = "must" | "should" | "differentiator";
export type MinimumProofLevel = "signal" | "demonstrated" | "owned_outcome";
export type RoleEvidenceProofType = "owned_outcome" | "stakeholder_scope" | "budget" | "people_leadership" | "delivery" | "domain_expertise" | "governance" | "commercial_impact" | "technical_depth";
export type GrowthAreaType = "capability_gap" | "missing_proof" | "scope_gap" | "domain_gap";
export type GrowthPriority = "high" | "medium" | "low";

export type RoleCapabilityRequirement = {
  capabilityId: string;
  label: string;
  importance: CapabilityImportance;
  expectedEvidence: string;
  minimumProofLevel: MinimumProofLevel;
  notes?: string;
};

export type RoleEvidenceRequirement = {
  capabilityId: string;
  proofType: RoleEvidenceProofType;
  description: string;
};

export type RoleGrowthArea = {
  id: string;
  label: string;
  type: GrowthAreaType;
  whyItMatters: string;
  proofToBuild: string;
  priority: GrowthPriority;
  relatedCapabilityIds: string[];
};

export type RoleCapabilityProfile = {
  roleFamilyId: string;
  canonicalTitle: string;
  aliases: string[];
  searchTitles: string[];
  domain: string;
  seniorityBand: "individual_contributor" | "manager" | "senior_manager" | "executive" | "mixed";
  description: string;
  mustHaveCapabilities: RoleCapabilityRequirement[];
  shouldHaveCapabilities: RoleCapabilityRequirement[];
  differentiatingCapabilities: RoleCapabilityRequirement[];
  evidenceRequirements: RoleEvidenceRequirement[];
  commonGrowthAreas: RoleGrowthArea[];
  adjacentFromCapabilities: string[];
  relatedRoleFamilies: string[];
  sourceNotes: string[];
  version: string;
};

export type RoleLibraryValidationIssue = { code: string; message: string; roleFamilyId?: string };

const allowedImportance = new Set<CapabilityImportance>(["must", "should", "differentiator"]);
const allowedPriority = new Set<GrowthPriority>(["high", "medium", "low"]);
const harshGapWording = /\b(weakness|not qualified|failure)\b/i;

export function getRoleCapabilityRequirements(profile: RoleCapabilityProfile): RoleCapabilityRequirement[] {
  return [...profile.mustHaveCapabilities, ...profile.shouldHaveCapabilities, ...profile.differentiatingCapabilities];
}

export function validateRoleCapabilityProfile(profile: RoleCapabilityProfile): RoleLibraryValidationIssue[] {
  const issues: RoleLibraryValidationIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message, roleFamilyId: profile.roleFamilyId || undefined });
  if (!profile.roleFamilyId || !profile.version) add("missing_schema_identity", "Role family id and version are required.");
  const titles = [...profile.aliases, ...profile.searchTitles].map((title) => title.trim().toLowerCase());
  if (new Set(titles).size !== titles.length) add("duplicate_alias", "Aliases and search titles must be unique within a role profile.");
  const requirements = getRoleCapabilityRequirements(profile);
  if (requirements.length === 0) add("empty_capability_requirements", "At least one capability requirement is required.");
  for (const requirement of requirements) {
    if (!requirement.capabilityId || !requirement.label) add("capability_reference_missing_label", "Capability references require both id and label.");
    if (!allowedImportance.has(requirement.importance)) add("invalid_importance", `Invalid importance for ${requirement.capabilityId}.`);
  }
  if (profile.evidenceRequirements.length === 0) add("missing_evidence_requirements", "At least one evidence requirement is required.");
  if (profile.commonGrowthAreas.length === 0) add("missing_growth_areas", "At least one constructive growth area is required.");
  for (const growthArea of profile.commonGrowthAreas) {
    if (!allowedPriority.has(growthArea.priority)) add("invalid_priority", `Invalid priority for ${growthArea.id}.`);
    if (!growthArea.proofToBuild.trim()) add("growth_area_missing_proof", `${growthArea.id} requires proofToBuild.`);
    if (harshGapWording.test(`${growthArea.label} ${growthArea.whyItMatters} ${growthArea.proofToBuild}`)) add("harsh_gap_wording", `${growthArea.id} uses prohibited negative wording.`);
  }
  return issues;
}

export function validateRoleCapabilityLibrary(profiles: RoleCapabilityProfile[]): RoleLibraryValidationIssue[] {
  const issues = profiles.flatMap(validateRoleCapabilityProfile);
  const seen = new Set<string>();
  for (const profile of profiles) {
    if (seen.has(profile.roleFamilyId)) issues.push({ code: "duplicate_role_family_id", message: `Duplicate roleFamilyId: ${profile.roleFamilyId}`, roleFamilyId: profile.roleFamilyId });
    seen.add(profile.roleFamilyId);
  }
  return issues;
}

export const ROLE_CAPABILITY_LLM_GUIDANCE = {
  permittedUses: ["enrich role descriptions", "map a target title to roleFamilyId", "suggest missing proof", "explain transferability"],
  requiredOutput: "RoleLensResult",
  safeguards: [
    "Validate every LLM output before use.",
    "Do not create unsupported high-confidence claims.",
    "Do not mark a capability evidence-backed without evidenceIds.",
    "Treat LLM-created capabilities as provisional until mapped to the capability taxonomy.",
  ],
} as const;
