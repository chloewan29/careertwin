import { canonicalCapabilityLibrary, type CanonicalCapabilityLibrary } from "./canonical-capability-library";
import { type CapabilityImportance, type MinimumProofLevel, type RoleCapabilityProfile, type RoleCapabilityRequirement, type RoleEvidenceProofType, ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION } from "./role-capability-library";
import { roleKnowledgeRegistry } from "./role-knowledge/role-registry";
import { type GenericRoleArchetype, type ArchetypeCapability, type ArchetypeEvidenceExpectation, type GenericRoleArchetypeIssue, type GenericRoleArchetypeValidation, GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION, GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION } from "./role-knowledge/role-profile";

export { 
  GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION, 
  GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION, 
  type ArchetypeCapability, 
  type ArchetypeEvidenceExpectation, 
  type GenericRoleArchetype, 
  type GenericRoleArchetypeIssue, 
  type GenericRoleArchetypeValidation 
};

export const representativeGenericRoleArchetypes = roleKnowledgeRegistry.roles;

export function validateGenericRoleArchetypes(archetypes: readonly GenericRoleArchetype[], canonicalLibrary: CanonicalCapabilityLibrary): GenericRoleArchetypeValidation {
  const issues: GenericRoleArchetypeIssue[] = []; const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const canonical = new Map(canonicalLibrary.capabilities.map((item) => [item.id, item])); const roleIds = new Set<string>();
  archetypes.forEach((role, roleIndex) => { const root = `archetypes[${roleIndex}]`;
    if (role.schemaVersion !== GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION) add("unsupported_schema_version", `${root}.schemaVersion`, "Unsupported archetype schema version.");
    if (!/^\d+\.\d+\.\d+$/.test(role.contentVersion)) add("invalid_content_version", `${root}.contentVersion`, "Invalid archetype content version.");
    if (roleIds.has(role.roleFamilyId)) add("duplicate_role_id", `${root}.roleFamilyId`, "Role ID is duplicated."); roleIds.add(role.roleFamilyId);
    if (!role.canonicalTitle.trim()) add("blank_title", `${root}.canonicalTitle`, "Canonical title is required."); if (!role.primaryMandate.trim()) add("blank_primary_mandate", `${root}.primaryMandate`, "Primary mandate is required.");
    if (!role.primaryOwnership.length) add("missing_primary_ownership", `${root}.primaryOwnership`, "Primary ownership is required.");
    if (new Set(role.primaryOwnership.map((item) => item.trim().toLowerCase())).size !== role.primaryOwnership.length) add("duplicate_primary_ownership", `${root}.primaryOwnership`, "Primary ownership items must be unique.");
    if (/\b(company|job description|jd)\b/i.test(JSON.stringify(role))) add("company_or_jd_specific_text", root, "Archetype text must remain company and JD independent.");
    const sections = [["identityDefiningCapabilities", role.identityDefiningCapabilities], ["coreEnablers", role.coreEnablers], ["supportingCapabilities", role.supportingCapabilities], ["differentiators", role.differentiators]] as const;
    if (!role.identityDefiningCapabilities.length) add("missing_identity_capability", `${root}.identityDefiningCapabilities`, "Identity-defining capabilities are required."); if (!role.coreEnablers.length) add("missing_core_enabler", `${root}.coreEnablers`, "Core enablers are required."); if (!role.differentiators.length) add("missing_differentiator", `${root}.differentiators`, "A differentiator is required.");
    const seen = new Set<string>(); sections.forEach(([name, values]) => values.forEach((item, index) => { const path = `${root}.${name}[${index}]`; const definition = canonical.get(item.capabilityId);
      if (seen.has(item.capabilityId)) add("duplicate_structural_capability", `${path}.capabilityId`, "Capabilities may appear in only one structural section."); seen.add(item.capabilityId);
      if (!definition) add("unknown_canonical_capability", `${path}.capabilityId`, "Capability is not admitted to the canonical registry."); else { if (item.label !== definition.label) add("canonical_label_mismatch", `${path}.label`, "Capability label differs from the registry."); if (item.canonicalFamily !== definition.family) add("canonical_family_mismatch", `${path}.canonicalFamily`, "Capability family differs from the registry."); }
      const expected = name === "identityDefiningCapabilities" ? ["must"] : name === "coreEnablers" ? ["must", "should"] : name === "supportingCapabilities" ? ["should"] : ["differentiator"];
      if (!expected.includes(item.importance)) add("incompatible_importance", `${path}.importance`, `${name} has incompatible importance ${item.importance}.`); if (!new Set(["must", "should", "differentiator"]).has(item.importance)) add("invalid_importance", `${path}.importance`, "Invalid capability importance.");
    }));
    if (!role.evidenceExpectations.length) add("missing_evidence_expectation", `${root}.evidenceExpectations`, "Evidence expectations are required."); const evidenceIds = new Set<string>();
    role.evidenceExpectations.forEach((item, index) => { const path = `${root}.evidenceExpectations[${index}]`; if (evidenceIds.has(item.id)) add("duplicate_evidence_expectation_id", `${path}.id`, "Evidence expectation ID is duplicated."); evidenceIds.add(item.id); if (!seen.has(item.capabilityId)) add("evidence_capability_not_structural", `${path}.capabilityId`, "Evidence expectation must reference a structural capability."); if (!item.description.trim()) add("blank_evidence_expectation", `${path}.description`, "Evidence expectation description is required."); });
  });
  issues.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code)); return issues.length ? { ok: false, issues } : { ok: true, archetypes };
}

function legacyRequirement(item: ArchetypeCapability): RoleCapabilityRequirement { const { canonicalFamily: _family, ...requirement } = item; void _family; return Object.freeze({ ...requirement }); }
export function projectGenericRoleArchetypeToProfile(role: GenericRoleArchetype): RoleCapabilityProfile {
  const all = [...role.identityDefiningCapabilities, ...role.coreEnablers, ...role.supportingCapabilities, ...role.differentiators]; const byImportance = (importance: CapabilityImportance) => Object.freeze(all.filter((item) => item.importance === importance).map(legacyRequirement));
  const growthArea = Object.freeze({ id: `${role.roleFamilyId}-proof-depth`, label: "Role-specific proof depth", type: "missing_proof" as const, whyItMatters: `Observable proof strengthens credible progression into ${role.canonicalTitle}.`, proofToBuild: role.evidenceExpectations[0].description, priority: "medium" as const, relatedCapabilityIds: Object.freeze([role.evidenceExpectations[0].capabilityId]) });
  return Object.freeze({ roleFamilyId: role.roleFamilyId, canonicalTitle: role.canonicalTitle, aliases: Object.freeze([...role.aliases]), searchTitles: Object.freeze([...role.searchTitles]), domain: role.domain, seniorityBand: "manager", description: role.primaryMandate, mustHaveCapabilities: byImportance("must"), shouldHaveCapabilities: byImportance("should"), differentiatingCapabilities: byImportance("differentiator"), evidenceRequirements: Object.freeze(role.evidenceExpectations.map((item) => Object.freeze({ capabilityId: item.capabilityId, proofType: item.proofType, description: item.description }))), commonGrowthAreas: Object.freeze([growthArea]), adjacentFromCapabilities: Object.freeze(all.map((item) => item.capabilityId)), relatedRoleFamilies: Object.freeze([]), sourceNotes: Object.freeze(["Deliberately authored generic role archetype; company and JD independent."]), version: ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION }) as unknown as RoleCapabilityProfile;
}

const validation = validateGenericRoleArchetypes(representativeGenericRoleArchetypes, canonicalCapabilityLibrary); if (!validation.ok) throw new Error(`Invalid representative archetypes: ${validation.issues.map((item) => `${item.path}:${item.code}`).join(", ")}`);
export const representativeGenericRoleProfiles = Object.freeze(representativeGenericRoleArchetypes.map(projectGenericRoleArchetypeToProfile));
