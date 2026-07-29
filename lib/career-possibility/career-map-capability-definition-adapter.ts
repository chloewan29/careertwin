import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";
import type { RoleCapabilityProfile, RoleCapabilityRequirement } from "./role-capability-library";

export const CAREER_MAP_CAPABILITY_DEFINITION_ADAPTER_VERSION = "1.0.0" as const;

export type CareerMapCapabilityDefinitionAdapterIssueCode =
  | "empty_profile_set"
  | "profile_version_mismatch"
  | "invalid_capability_id"
  | "invalid_capability_label"
  | "invalid_capability_family"
  | "capability_identity_conflict"
  | "capability_family_conflict"
  | "capability_label_conflict"
  | "duplicate_definition_id"
  | "definition_validation_failed";

export type CareerMapCapabilityDefinitionAdapterIssue = {
  code: CareerMapCapabilityDefinitionAdapterIssueCode;
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type CareerMapCapabilityDefinitionAdapterResult =
  | {
      ok: true;
      definitionVersion: string;
      definitions: readonly CareerMapCapabilityDefinition[];
      sourceProfileCount: number;
      sourceCapabilityReferenceCount: number;
      uniqueCapabilityCount: number;
      warnings: readonly CareerMapCapabilityDefinitionAdapterIssue[];
    }
  | { ok: false; issues: readonly CareerMapCapabilityDefinitionAdapterIssue[] };

type RequirementSource = {
  profileId: string;
  family: string;
  collection: "mustHaveCapabilities" | "shouldHaveCapabilities" | "differentiatingCapabilities";
  requirement: RoleCapabilityRequirement;
};

type CapabilityIdentity = { id: string; label: string; family: string };

const compareText = (left: string, right: string) => left.localeCompare(right, "en");
const isCanonicalText = (value: string) => value.length > 0 && value === value.trim();

function issue(
  code: CareerMapCapabilityDefinitionAdapterIssueCode,
  path: string,
  message: string,
): CareerMapCapabilityDefinitionAdapterIssue {
  return { code, severity: "error", path, message };
}

function requirementSources(profiles: readonly RoleCapabilityProfile[]): RequirementSource[] {
  return profiles.flatMap((profile) => ([
    ["mustHaveCapabilities", profile.mustHaveCapabilities],
    ["shouldHaveCapabilities", profile.shouldHaveCapabilities],
    ["differentiatingCapabilities", profile.differentiatingCapabilities],
  ] as const).flatMap(([collection, requirements]) => requirements.map((requirement) => ({
    profileId: profile.roleFamilyId,
    family: profile.domain,
    collection,
    requirement,
  })))).sort((left, right) =>
    compareText(left.profileId, right.profileId)
    || compareText(left.collection, right.collection)
    || compareText(left.requirement.capabilityId, right.requirement.capabilityId)
    || compareText(left.requirement.label, right.requirement.label)
    || compareText(left.family, right.family));
}

function validateDefinitions(definitions: readonly CareerMapCapabilityDefinition[]) {
  const issues: CareerMapCapabilityDefinitionAdapterIssue[] = [];
  const ids = new Set<string>();
  definitions.forEach((definition) => {
    const path = `definitions:${definition.id}`;
    if (!isCanonicalText(definition.id) || !isCanonicalText(definition.label) || !definition.family || !isCanonicalText(definition.family)) {
      issues.push(issue("definition_validation_failed", path, `Capability definition ${definition.id || "<empty>"} is structurally invalid.`));
    }
    if (ids.has(definition.id)) issues.push(issue("duplicate_definition_id", path, `Capability definition ID ${definition.id} is duplicated.`));
    ids.add(definition.id);
  });
  return issues;
}

/** Converts role requirements into a fail-closed, deterministic definition set. */
export function adaptRoleCapabilityProfilesToCareerMapDefinitions(
  profiles: readonly RoleCapabilityProfile[],
): CareerMapCapabilityDefinitionAdapterResult {
  if (profiles.length === 0) return { ok: false, issues: [issue("empty_profile_set", "profiles", "At least one role capability profile is required.")] };

  const issues: CareerMapCapabilityDefinitionAdapterIssue[] = [];
  const orderedProfiles = [...profiles].sort((left, right) =>
    compareText(left.roleFamilyId, right.roleFamilyId)
    || compareText(left.version, right.version)
    || compareText(left.domain, right.domain));
  const versions = [...new Set(orderedProfiles.map((profile) => profile.version))].sort(compareText);
  if (versions.some((version) => !isCanonicalText(version)) || versions.length !== 1) {
    issues.push(issue("profile_version_mismatch", "profiles.version", `Role capability profile versions must resolve to one non-empty value; found ${versions.length}.`));
  }

  const sources = requirementSources(orderedProfiles);
  const identitiesById = new Map<string, CapabilityIdentity[]>();
  sources.forEach((source, index) => {
    const { capabilityId: id, label } = source.requirement;
    const path = `profiles:${source.profileId}.${source.collection}[${index}]`;
    if (!isCanonicalText(id)) issues.push(issue("invalid_capability_id", `${path}.capabilityId`, `Capability ID in profile ${source.profileId || "<empty>"} must be non-empty and trimmed.`));
    if (!isCanonicalText(label)) issues.push(issue("invalid_capability_label", `${path}.label`, `Capability label for ${id || "<empty>"} must be non-empty and trimmed.`));
    if (!isCanonicalText(source.family)) issues.push(issue("invalid_capability_family", `profiles:${source.profileId}.domain`, `Capability family for profile ${source.profileId || "<empty>"} must be non-empty and trimmed.`));
    if (!isCanonicalText(id) || !isCanonicalText(label) || !isCanonicalText(source.family)) return;
    const identities = identitiesById.get(id) ?? [];
    identities.push({ id, label, family: source.family });
    identitiesById.set(id, identities);
  });

  const definitions: CareerMapCapabilityDefinition[] = [];
  [...identitiesById.entries()].sort(([left], [right]) => compareText(left, right)).forEach(([id, occurrences]) => {
    const labels = [...new Set(occurrences.map((item) => item.label))].sort(compareText);
    const families = [...new Set(occurrences.map((item) => item.family))].sort(compareText);
    if (labels.length > 1) issues.push(issue("capability_identity_conflict", `capabilities:${id}.label`, `Capability ${id} has ${labels.length} conflicting labels.`));
    if (families.length > 1) issues.push(issue("capability_family_conflict", `capabilities:${id}.family`, `Capability ${id} has ${families.length} conflicting families.`));
    if (labels.length === 1 && families.length === 1) definitions.push({ id, label: labels[0], family: families[0] });
  });

  const idsByLabel = new Map<string, string[]>();
  definitions.forEach((definition) => idsByLabel.set(definition.label, [...(idsByLabel.get(definition.label) ?? []), definition.id]));
  [...idsByLabel.entries()].sort(([left], [right]) => compareText(left, right)).forEach(([label, ids]) => {
    const uniqueIds = [...new Set(ids)].sort(compareText);
    if (uniqueIds.length > 1) issues.push(issue("capability_label_conflict", `labels:${label}`, `Capability label ${label} is shared by ${uniqueIds.length} IDs.`));
  });

  definitions.sort((left, right) =>
    compareText(left.family ?? "", right.family ?? "")
    || compareText(left.label, right.label)
    || compareText(left.id, right.id));
  issues.push(...validateDefinitions(definitions));
  issues.sort((left, right) => compareText(left.path, right.path) || compareText(left.code, right.code) || compareText(left.message, right.message));
  if (issues.length > 0) return { ok: false, issues };

  const sourceVersion = versions[0];
  return {
    ok: true,
    definitionVersion: `role-capability-definitions/${sourceVersion}/adapter-${CAREER_MAP_CAPABILITY_DEFINITION_ADAPTER_VERSION}`,
    definitions,
    sourceProfileCount: profiles.length,
    sourceCapabilityReferenceCount: sources.length,
    uniqueCapabilityCount: definitions.length,
    warnings: [],
  };
}
