import type { CanonicalCapabilityLibrary } from "./canonical-capability-library";
import type { CapabilityImportance, RoleCapabilityProfile } from "./role-capability-library";

export const CUSTOM_TARGET_ROLE_SCHEMA_VERSION = "1.0.0" as const;

export type CustomTargetRoleRequirement = {
  readonly requirementId: string;
  readonly capabilityId: string;
  readonly capabilityLabel: string;
  readonly family: string;
  readonly importance: CapabilityImportance;
  readonly sourceText: string;
  readonly sourceStart: number;
  readonly sourceEnd: number;
};

export type CustomTargetRole = {
  readonly schemaVersion: typeof CUSTOM_TARGET_ROLE_SCHEMA_VERSION;
  readonly roleId: string;
  readonly title: string;
  readonly source: "reviewed_job_description";
  readonly requirements: readonly CustomTargetRoleRequirement[];
};

export type CustomTargetRoleIssue = { readonly code: string; readonly path: string; readonly message: string };
export type CustomTargetRoleDraft = Omit<CustomTargetRole, "source"> & { readonly source?: "reviewed_job_description" };

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const importanceValues = new Set(["must", "should", "differentiator"]);

export function findUniqueSourceSpan(jobDescription: string, passage: string): { ok: true; start: number; end: number } | { ok: false; code: "empty_source_text" | "source_not_found" | "ambiguous_source_text" } {
  if (!passage.trim()) return { ok: false, code: "empty_source_text" };
  const start = jobDescription.indexOf(passage);
  if (start < 0) return { ok: false, code: "source_not_found" };
  if (jobDescription.indexOf(passage, start + 1) >= 0) return { ok: false, code: "ambiguous_source_text" };
  return { ok: true, start, end: start + passage.length };
}

export function createCustomTargetRole(input: { readonly draft: CustomTargetRoleDraft; readonly jobDescription: string; readonly canonicalLibrary: CanonicalCapabilityLibrary }): { ok: true; role: CustomTargetRole } | { ok: false; issues: readonly CustomTargetRoleIssue[] } {
  const issues: CustomTargetRoleIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (input.draft.schemaVersion !== CUSTOM_TARGET_ROLE_SCHEMA_VERSION) add("unsupported_schema_version", "schemaVersion", "Custom target-role schema version is unsupported.");
  if (!idPattern.test(input.draft.roleId)) add("invalid_role_id", "roleId", "Role ID must be a lowercase hyphenated identifier.");
  if (!input.draft.title.trim()) add("blank_title", "title", "Role title is required.");
  if (input.draft.requirements.length === 0) add("empty_requirements", "requirements", "At least one reviewed requirement is required.");
  const canonical = new Map(input.canonicalLibrary.capabilities.map((item) => [item.id, item]));
  const requirementIds = new Set<string>();
  const sourceMappings = new Set<string>();
  const capabilityIds = new Set<string>();
  input.draft.requirements.forEach((requirement, index) => {
    const path = `requirements[${index}]`;
    if (!idPattern.test(requirement.requirementId)) add("invalid_requirement_id", `${path}.requirementId`, "Requirement ID is invalid.");
    if (requirementIds.has(requirement.requirementId)) add("duplicate_requirement_id", `${path}.requirementId`, "Requirement ID is duplicated.");
    requirementIds.add(requirement.requirementId);
    const definition = canonical.get(requirement.capabilityId);
    if (!definition) add("unknown_canonical_capability", `${path}.capabilityId`, "Capability is not admitted to the canonical registry.");
    if (definition && requirement.capabilityLabel !== definition.label) add("capability_label_mismatch", `${path}.capabilityLabel`, "Capability label does not match the canonical registry.");
    if (definition && requirement.family !== definition.family) add("capability_family_mismatch", `${path}.family`, "Capability family does not match the canonical registry.");
    if (!importanceValues.has(requirement.importance)) add("invalid_importance", `${path}.importance`, "Requirement importance is invalid.");
    if (!requirement.sourceText.trim()) add("empty_source_text", `${path}.sourceText`, "Reviewed source passage is required.");
    const spanValid = Number.isInteger(requirement.sourceStart) && Number.isInteger(requirement.sourceEnd) && requirement.sourceStart >= 0 && requirement.sourceEnd > requirement.sourceStart && requirement.sourceEnd <= input.jobDescription.length;
    if (!spanValid || input.jobDescription.slice(requirement.sourceStart, requirement.sourceEnd) !== requirement.sourceText) add("invalid_source_span", `${path}.sourceStart`, "Source span must exactly match the pasted job description.");
    const sourceKey = `${requirement.capabilityId}\u0000${requirement.sourceStart}\u0000${requirement.sourceEnd}`;
    if (sourceMappings.has(sourceKey)) add("duplicate_source_mapping", path, "Capability and source passage are duplicated.");
    sourceMappings.add(sourceKey);
    if (capabilityIds.has(requirement.capabilityId)) add("duplicate_capability", `${path}.capabilityId`, "Use one reviewed passage per capability; edit or consolidate before applying.");
    capabilityIds.add(requirement.capabilityId);
  });
  if (issues.length) return { ok: false, issues: Object.freeze(issues) };
  const requirements = input.draft.requirements.map((item) => Object.freeze({ ...item }));
  return { ok: true, role: Object.freeze({ schemaVersion: CUSTOM_TARGET_ROLE_SCHEMA_VERSION, roleId: input.draft.roleId, title: input.draft.title.trim(), source: "reviewed_job_description", requirements: Object.freeze(requirements) }) };
}

export function adaptCustomTargetRoleToProfile(role: CustomTargetRole): RoleCapabilityProfile {
  const requirement = (item: CustomTargetRoleRequirement) => Object.freeze({ capabilityId: item.capabilityId, label: item.capabilityLabel, importance: item.importance, expectedEvidence: item.sourceText, minimumProofLevel: "signal" as const, notes: `Reviewed JD source span ${item.sourceStart}-${item.sourceEnd}` });
  const byImportance = (importance: CapabilityImportance) => role.requirements.filter((item) => item.importance === importance).map(requirement);
  return Object.freeze({ roleFamilyId: role.roleId, canonicalTitle: role.title, aliases: Object.freeze([]), searchTitles: Object.freeze([]), domain: "Reviewed job description", seniorityBand: "mixed", description: "User-reviewed target-role requirements from a pasted job description.", mustHaveCapabilities: Object.freeze(byImportance("must")), shouldHaveCapabilities: Object.freeze(byImportance("should")), differentiatingCapabilities: Object.freeze(byImportance("differentiator")), evidenceRequirements: Object.freeze([]), commonGrowthAreas: Object.freeze([]), adjacentFromCapabilities: Object.freeze([]), relatedRoleFamilies: Object.freeze([]), sourceNotes: Object.freeze(["Session-only reviewed job description"]), version: CUSTOM_TARGET_ROLE_SCHEMA_VERSION }) as unknown as RoleCapabilityProfile;
}
