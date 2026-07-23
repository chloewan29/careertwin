import type { CareerDomain, UniversalCapabilityFamily } from "./capability-taxonomy";

export const ROLE_ROADMAP_VERSION = "role-roadmap/1.0.0" as const;

export type RoleRoadmapCategory = "closest" | "adjacent" | "stretch";

export type RoleGapDefinition = {
  label: string;
  type: "missing_proof" | "capability_gap" | "domain_gap" | "scope_gap";
  description: string;
};

export type CredibilityRule = {
  description: string;
  minimumCapabilityMatches: number;
  requiredEvidenceCount: number;
  acceptableCapabilityIds: string[];
};

export type RoleEvidenceRequirement = {
  label: string;
  description: string;
  minimumCount: number;
  preferredSignals: string[];
};

export type RoleFamilyDefinition = {
  roleFamilyId: string;
  roleFamilyLabel: string;
  domain: CareerDomain;
  requiredCapabilities: string[];
  supportingCapabilityFamilies: UniversalCapabilityFamily[];
  commonSearchTitles: string[];
  commonGaps: RoleGapDefinition[];
  credibilityRules: CredibilityRule[];
  evidenceRequirements: RoleEvidenceRequirement[];
  roadmapVersion: typeof ROLE_ROADMAP_VERSION;
};

export type RolePossibility = {
  roleFamilyId: string;
  roleFamilyLabel: string;
  domain: CareerDomain;
  category: RoleRoadmapCategory;
  fitScore: number;
  confidenceScore: number;
  credibilitySummary: string;
  supportingCapabilityIds: string[];
  supportingEvidenceIds: string[];
  gaps: RoleGapDefinition[];
  commonSearchTitles: string[];
  roadmapVersion: typeof ROLE_ROADMAP_VERSION;
};

export function validateRoleRoadmap(
  roles: RoleFamilyDefinition[],
  knownCapabilityIds?: ReadonlySet<string>,
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  roles.forEach((role, index) => {
    if (!role.roleFamilyId.trim()) issues.push(`roles[${index}].roleFamilyId is required`);
    if (ids.has(role.roleFamilyId)) issues.push(`roles[${index}].roleFamilyId is duplicated`);
    ids.add(role.roleFamilyId);
    if (role.requiredCapabilities.length === 0) issues.push(`roles[${index}] requires capability references`);
    if (new Set(role.requiredCapabilities).size !== role.requiredCapabilities.length) issues.push(`roles[${index}] has duplicate capability references`);
    if (knownCapabilityIds) {
      for (const capabilityId of role.requiredCapabilities) {
        if (!knownCapabilityIds.has(capabilityId)) issues.push(`roles[${index}] references unknown capability ${capabilityId}`);
      }
    }
    if (role.commonSearchTitles.length === 0) issues.push(`roles[${index}] requires search titles`);
    if (role.credibilityRules.length === 0) issues.push(`roles[${index}] requires credibility rules`);
    role.credibilityRules.forEach((rule, ruleIndex) => {
      if (rule.minimumCapabilityMatches < 1) issues.push(`roles[${index}].credibilityRules[${ruleIndex}] minimum must be at least one`);
      if (rule.minimumCapabilityMatches > new Set(rule.acceptableCapabilityIds).size) issues.push(`roles[${index}].credibilityRules[${ruleIndex}] is unsatisfiable`);
      if (rule.requiredEvidenceCount < 1) issues.push(`roles[${index}].credibilityRules[${ruleIndex}] evidence count must be at least one`);
      if (knownCapabilityIds) {
        for (const capabilityId of rule.acceptableCapabilityIds) {
          if (!knownCapabilityIds.has(capabilityId)) issues.push(`roles[${index}].credibilityRules[${ruleIndex}] references unknown capability ${capabilityId}`);
        }
      }
    });
    if (role.evidenceRequirements.length === 0) issues.push(`roles[${index}] requires evidence requirements`);
  });
  return issues;
}
