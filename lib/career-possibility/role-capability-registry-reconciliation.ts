import {
  validateCanonicalCapabilityLibrary,
  type CanonicalCapabilityLibrary,
} from "./canonical-capability-library";
import {
  ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION,
  type CapabilityImportance,
  type RoleCapabilityProfile,
  type RoleCapabilityRequirement,
} from "./role-capability-library";

export const ROLE_CAPABILITY_REGISTRY_RECONCILIATION_VERSION = "1.0.0" as const;

export type RoleCapabilityRequirementCollection =
  | "mustHaveCapabilities"
  | "shouldHaveCapabilities"
  | "differentiatingCapabilities";

export type RoleCapabilityRequirementReference = {
  readonly profileId: string;
  readonly profileDomain: string;
  readonly capabilityId: string;
  readonly contextualLabel: string;
  readonly importance: CapabilityImportance;
  readonly collection: RoleCapabilityRequirementCollection;
  readonly path: string;
};

export type ResolvedRoleCapabilityReference = RoleCapabilityRequirementReference & {
  readonly canonicalLabel: string;
  readonly canonicalFamily: string;
  readonly labelMatchesCanonical: boolean;
};

export type RoleCapabilityRegistryCoverage = {
  readonly sourceProfileCount: number;
  readonly sourceRequirementReferenceCount: number;
  readonly uniqueRequirementIdCount: number;
  readonly matchedRequirementReferenceCount: number;
  readonly matchedUniqueRequirementIdCount: number;
  readonly unresolvedRequirementReferenceCount: number;
  readonly unresolvedUniqueRequirementIdCount: number;
  readonly registryCapabilityCount: number;
  readonly unreferencedRegistryCapabilityCount: number;
  readonly referenceCoverageRatio: number;
  readonly uniqueIdCoverageRatio: number;
  readonly complete: boolean;
};

export type RoleCapabilityRegistryReconciliationIssueCode =
  | "empty_profile_set"
  | "invalid_profile_schema_version"
  | "mixed_profile_schema_versions"
  | "invalid_canonical_library"
  | "unknown_canonical_capability"
  | "role_requirement_label_differs_from_canonical"
  | "canonical_capability_unreferenced"
  | "duplicate_requirement_reference"
  | "invalid_requirement_capability_id"
  | "invalid_requirement_label";

export type RoleCapabilityRegistryReconciliationIssue = {
  readonly code: RoleCapabilityRegistryReconciliationIssueCode;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
  readonly capabilityId?: string;
  readonly references?: readonly RoleCapabilityRequirementReference[];
};

type ReconciliationResultBase = {
  readonly reconciliationVersion: string;
  readonly coverage: RoleCapabilityRegistryCoverage;
  /** Diagnostic references only. Canonical selector definitions remain registry-owned. */
  readonly resolvedReferences: readonly ResolvedRoleCapabilityReference[];
  readonly warnings: readonly RoleCapabilityRegistryReconciliationIssue[];
};

export type RoleCapabilityRegistryReconciliationResult =
  | (ReconciliationResultBase & { readonly ok: true })
  | (ReconciliationResultBase & {
      readonly ok: false;
      readonly issues: readonly RoleCapabilityRegistryReconciliationIssue[];
    });

export type ReconcileRoleCapabilityProfilesInput = {
  readonly profiles: readonly RoleCapabilityProfile[];
  readonly canonicalLibrary: CanonicalCapabilityLibrary;
};

type CollectedReference = RoleCapabilityRequirementReference & {
  readonly requirement: RoleCapabilityRequirement;
};

const compareText = (left: string, right: string) => left.localeCompare(right, "en");
const canonicalText = (value: string) => value.length > 0 && value === value.trim();
const capabilityIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function compareReferences(
  left: RoleCapabilityRequirementReference,
  right: RoleCapabilityRequirementReference,
) {
  return compareText(left.capabilityId, right.capabilityId)
    || compareText(left.profileId, right.profileId)
    || compareText(left.path, right.path)
    || compareText(left.profileDomain, right.profileDomain)
    || compareText(left.contextualLabel, right.contextualLabel)
    || compareText(left.importance, right.importance);
}

function compareIssues(
  left: RoleCapabilityRegistryReconciliationIssue,
  right: RoleCapabilityRegistryReconciliationIssue,
) {
  return compareText(left.path, right.path)
    || compareText(left.code, right.code)
    || compareText(left.message, right.message);
}

function compareWarnings(
  left: RoleCapabilityRegistryReconciliationIssue,
  right: RoleCapabilityRegistryReconciliationIssue,
) {
  const rank = (value: RoleCapabilityRegistryReconciliationIssue) => {
    if (value.code === "role_requirement_label_differs_from_canonical") return 0;
    if (value.code === "duplicate_requirement_reference") return 1;
    if (value.code === "canonical_capability_unreferenced") return 2;
    return 3;
  };
  const leftReference = left.references?.[0];
  const rightReference = right.references?.[0];
  return rank(left) - rank(right)
    || compareText(left.capabilityId ?? "", right.capabilityId ?? "")
    || compareText(leftReference?.profileId ?? "", rightReference?.profileId ?? "")
    || compareText(leftReference?.path ?? left.path, rightReference?.path ?? right.path)
    || compareIssues(left, right);
}

function issue(
  code: RoleCapabilityRegistryReconciliationIssueCode,
  severity: "error" | "warning",
  path: string,
  message: string,
  details: Pick<RoleCapabilityRegistryReconciliationIssue, "capabilityId" | "references"> = {},
): RoleCapabilityRegistryReconciliationIssue {
  return { code, severity, path, message, ...details };
}

function reconciliationVersion(
  canonicalLibrary: CanonicalCapabilityLibrary,
  profileSchemaVersion: string | undefined,
  inputsValid: boolean,
) {
  if (!inputsValid || !profileSchemaVersion) {
    return `role-capability-reconciliation/unresolved/adapter-${ROLE_CAPABILITY_REGISTRY_RECONCILIATION_VERSION}`;
  }
  return [
    "role-capability-reconciliation",
    `registry-schema-${canonicalLibrary.schemaVersion}`,
    `registry-content-${canonicalLibrary.contentVersion}`,
    `profile-schema-${profileSchemaVersion}`,
    `adapter-${ROLE_CAPABILITY_REGISTRY_RECONCILIATION_VERSION}`,
  ].join("/");
}

function sortedRequirements(requirements: readonly RoleCapabilityRequirement[]) {
  return [...requirements].sort((left, right) =>
    compareText(left.capabilityId, right.capabilityId)
    || compareText(left.label, right.label)
    || compareText(left.importance, right.importance)
    || compareText(left.minimumProofLevel, right.minimumProofLevel)
    || compareText(left.expectedEvidence, right.expectedEvidence)
    || compareText(left.notes ?? "", right.notes ?? ""));
}

/** Growth-area links are excluded: they describe suggested gaps, not role capability requirements. */
function collectRequirementReferences(profiles: readonly RoleCapabilityProfile[]): CollectedReference[] {
  const orderedProfiles = [...profiles].sort((left, right) =>
    compareText(left.roleFamilyId, right.roleFamilyId)
    || compareText(left.domain, right.domain)
    || compareText(left.version, right.version));
  return orderedProfiles.flatMap((profile) => {
    const collections: readonly [RoleCapabilityRequirementCollection, readonly RoleCapabilityRequirement[]][] = [
      ["mustHaveCapabilities", profile.mustHaveCapabilities],
      ["shouldHaveCapabilities", profile.shouldHaveCapabilities],
      ["differentiatingCapabilities", profile.differentiatingCapabilities],
    ];
    return collections.flatMap(([collection, requirements]) =>
      sortedRequirements(requirements).map((requirement, index) => ({
        profileId: profile.roleFamilyId,
        profileDomain: profile.domain,
        capabilityId: requirement.capabilityId,
        contextualLabel: requirement.label,
        importance: requirement.importance,
        collection,
        path: `profiles:${profile.roleFamilyId}.${collection}[${index}]`,
        requirement,
      })));
  });
}

function publicReference(reference: CollectedReference): RoleCapabilityRequirementReference {
  return {
    profileId: reference.profileId,
    profileDomain: reference.profileDomain,
    capabilityId: reference.capabilityId,
    contextualLabel: reference.contextualLabel,
    importance: reference.importance,
    collection: reference.collection,
    path: reference.path,
  };
}

function emptyCoverage(
  sourceProfileCount: number,
  sourceRequirementReferenceCount: number,
  uniqueRequirementIdCount: number,
  registryCapabilityCount: number,
): RoleCapabilityRegistryCoverage {
  return {
    sourceProfileCount,
    sourceRequirementReferenceCount,
    uniqueRequirementIdCount,
    matchedRequirementReferenceCount: 0,
    matchedUniqueRequirementIdCount: 0,
    unresolvedRequirementReferenceCount: sourceRequirementReferenceCount,
    unresolvedUniqueRequirementIdCount: uniqueRequirementIdCount,
    registryCapabilityCount,
    unreferencedRegistryCapabilityCount: registryCapabilityCount,
    referenceCoverageRatio: 0,
    uniqueIdCoverageRatio: 0,
    complete: false,
  };
}

/**
 * Validates role requirement references against caller-supplied canonical identity.
 * This function returns diagnostics and coverage, never selector taxonomy definitions.
 */
export function reconcileRoleCapabilityProfilesWithCanonicalLibrary(
  input: ReconcileRoleCapabilityProfilesInput,
): RoleCapabilityRegistryReconciliationResult {
  const references = collectRequirementReferences(input.profiles);
  const uniqueRequirementIds = new Set(references.map((reference) => reference.capabilityId));
  const canonicalValidation = validateCanonicalCapabilityLibrary(input.canonicalLibrary);
  const profileVersions = [...new Set(input.profiles.map((profile) => profile.version))].sort(compareText);
  const profileSchemaVersion = profileVersions.length === 1 ? profileVersions[0] : undefined;
  const profileSchemaValid = profileSchemaVersion === ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION;
  const inputIssues: RoleCapabilityRegistryReconciliationIssue[] = [];

  if (input.profiles.length === 0) {
    inputIssues.push(issue("empty_profile_set", "error", "profiles", "At least one role capability profile is required."));
  }
  if (!canonicalValidation.ok) {
    const summary = canonicalValidation.issues
      .map((item) => `${item.path}:${item.code}`)
      .sort(compareText)
      .join(", ");
    inputIssues.push(issue("invalid_canonical_library", "error", "canonicalLibrary", `Canonical capability library validation failed: ${summary}.`));
  }
  if (profileVersions.length > 1) {
    inputIssues.push(issue("mixed_profile_schema_versions", "error", "profiles.version", `Role capability profiles contain mixed schema versions: ${profileVersions.join(", ")}.`));
  } else if (input.profiles.length > 0 && (!profileSchemaVersion || !canonicalText(profileSchemaVersion) || !profileSchemaValid)) {
    inputIssues.push(issue("invalid_profile_schema_version", "error", "profiles.version", `Role capability profile schema version ${profileSchemaVersion || "<empty>"} is unsupported.`));
  }

  references.forEach((reference) => {
    if (!canonicalText(reference.capabilityId) || !capabilityIdPattern.test(reference.capabilityId)) {
      inputIssues.push(issue("invalid_requirement_capability_id", "error", `${reference.path}.capabilityId`, `Role requirement capability ID ${reference.capabilityId || "<empty>"} is invalid.`));
    }
    if (!canonicalText(reference.contextualLabel)) {
      inputIssues.push(issue("invalid_requirement_label", "error", `${reference.path}.label`, `Contextual role requirement label for ${reference.capabilityId || "<empty>"} is invalid.`));
    }
  });

  const versionsValid = canonicalValidation.ok && profileSchemaValid && input.profiles.length > 0;
  const version = reconciliationVersion(input.canonicalLibrary, profileSchemaVersion, versionsValid);
  if (inputIssues.length > 0) {
    return {
      ok: false,
      reconciliationVersion: version,
      coverage: emptyCoverage(input.profiles.length, references.length, uniqueRequirementIds.size, input.canonicalLibrary.capabilities.length),
      resolvedReferences: [],
      issues: inputIssues.sort(compareIssues),
      warnings: [],
    };
  }

  const canonicalById = new Map(input.canonicalLibrary.capabilities.map((capability) => [capability.id, capability]));
  const resolvedReferences: ResolvedRoleCapabilityReference[] = [];
  const unresolvedById = new Map<string, RoleCapabilityRequirementReference[]>();
  const referencedCanonicalIds = new Set<string>();
  const warnings: RoleCapabilityRegistryReconciliationIssue[] = [];

  references.forEach((collected) => {
    const reference = publicReference(collected);
    const canonical = canonicalById.get(reference.capabilityId);
    if (!canonical) {
      unresolvedById.set(reference.capabilityId, [...(unresolvedById.get(reference.capabilityId) ?? []), reference]);
      return;
    }
    referencedCanonicalIds.add(canonical.id);
    const labelMatchesCanonical = reference.contextualLabel === canonical.label;
    resolvedReferences.push({
      ...reference,
      canonicalLabel: canonical.label,
      canonicalFamily: canonical.family,
      labelMatchesCanonical,
    });
    if (!labelMatchesCanonical) {
      warnings.push(issue(
        "role_requirement_label_differs_from_canonical",
        "warning",
        `${reference.path}.label`,
        `Contextual label ${reference.contextualLabel} for ${reference.profileId}/${canonical.id} differs from canonical label ${canonical.label}.`,
        { capabilityId: canonical.id, references: [reference] },
      ));
    }
  });

  const duplicateGroups = new Map<string, RoleCapabilityRequirementReference[]>();
  references.forEach((collected) => {
    const reference = publicReference(collected);
    const key = [reference.profileId, reference.collection, reference.capabilityId, reference.contextualLabel, reference.importance].join("\u0000");
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), reference]);
  });
  [...duplicateGroups.values()].filter((group) => group.length > 1).forEach((group) => {
    const ordered = [...group].sort(compareReferences);
    warnings.push(issue(
      "duplicate_requirement_reference",
      "warning",
      `capabilities:${ordered[0].capabilityId}.duplicates`,
      `Profile ${ordered[0].profileId} contains ${ordered.length} equivalent contextual references to ${ordered[0].capabilityId}.`,
      { capabilityId: ordered[0].capabilityId, references: ordered },
    ));
  });

  input.canonicalLibrary.capabilities.filter((capability) => !referencedCanonicalIds.has(capability.id)).forEach((capability) => {
    warnings.push(issue(
      "canonical_capability_unreferenced",
      "warning",
      `canonicalLibrary.capabilities:${capability.id}`,
      `Canonical capability ${capability.id} is not referenced by the supplied role profiles.`,
      { capabilityId: capability.id },
    ));
  });

  const unknownIssues = [...unresolvedById.entries()].sort(([left], [right]) => compareText(left, right)).map(([capabilityId, occurrences]) => {
    const ordered = [...occurrences].sort(compareReferences);
    return issue(
      "unknown_canonical_capability",
      "error",
      `capabilities:${capabilityId}`,
      `Canonical capability ${capabilityId} is unknown across ${ordered.length} role requirement reference${ordered.length === 1 ? "" : "s"}.`,
      { capabilityId, references: ordered },
    );
  });

  resolvedReferences.sort(compareReferences);
  warnings.sort(compareWarnings);
  const matchedUniqueIds = new Set(resolvedReferences.map((reference) => reference.capabilityId));
  const unresolvedReferenceCount = [...unresolvedById.values()].reduce((total, occurrences) => total + occurrences.length, 0);
  const coverage: RoleCapabilityRegistryCoverage = {
    sourceProfileCount: input.profiles.length,
    sourceRequirementReferenceCount: references.length,
    uniqueRequirementIdCount: uniqueRequirementIds.size,
    matchedRequirementReferenceCount: resolvedReferences.length,
    matchedUniqueRequirementIdCount: matchedUniqueIds.size,
    unresolvedRequirementReferenceCount: unresolvedReferenceCount,
    unresolvedUniqueRequirementIdCount: unresolvedById.size,
    registryCapabilityCount: input.canonicalLibrary.capabilities.length,
    unreferencedRegistryCapabilityCount: input.canonicalLibrary.capabilities.length - referencedCanonicalIds.size,
    referenceCoverageRatio: references.length === 0 ? 0 : resolvedReferences.length / references.length,
    uniqueIdCoverageRatio: uniqueRequirementIds.size === 0 ? 0 : matchedUniqueIds.size / uniqueRequirementIds.size,
    complete: unresolvedById.size === 0,
  };

  if (!coverage.complete) {
    return {
      ok: false,
      reconciliationVersion: version,
      coverage,
      resolvedReferences,
      issues: unknownIssues,
      warnings,
    };
  }
  return { ok: true, reconciliationVersion: version, coverage, resolvedReferences, warnings };
}
