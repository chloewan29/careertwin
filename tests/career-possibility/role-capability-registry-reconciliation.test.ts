import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  canonicalCapabilityLibrary,
  type CanonicalCapabilityDefinition,
  type CanonicalCapabilityLibrary,
} from "../../lib/career-possibility/canonical-capability-library";
import {
  ROLE_CAPABILITY_REGISTRY_RECONCILIATION_VERSION,
  reconcileRoleCapabilityProfilesWithCanonicalLibrary,
  type RoleCapabilityRegistryReconciliationResult,
} from "../../lib/career-possibility/role-capability-registry-reconciliation";
import {
  ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION,
  type RoleCapabilityProfile,
  type RoleCapabilityRequirement,
} from "../../lib/career-possibility/role-capability-library";
import { roleCapabilityProfiles } from "../../lib/career-possibility/fixtures/roleCapabilityProfiles";
import type { CareerMapCapabilityDefinition } from "../../lib/career-possibility/reviewed-resume-evidence-map-adapter";

const requirement = (capabilityId: string, label: string): RoleCapabilityRequirement => ({
  capabilityId,
  label,
  importance: "must",
  expectedEvidence: `Contextual evidence for ${label}.`,
  minimumProofLevel: "demonstrated",
});

const profile = (
  roleFamilyId: string,
  domain: string,
  requirements: readonly RoleCapabilityRequirement[],
  version = ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION,
): RoleCapabilityProfile => ({
  roleFamilyId,
  canonicalTitle: `${roleFamilyId} title`,
  aliases: [],
  searchTitles: [],
  domain,
  seniorityBand: "manager",
  description: `Context for ${roleFamilyId}.`,
  mustHaveCapabilities: [...requirements],
  shouldHaveCapabilities: [],
  differentiatingCapabilities: [],
  evidenceRequirements: [],
  commonGrowthAreas: [],
  adjacentFromCapabilities: [],
  relatedRoleFamilies: [],
  sourceNotes: [],
  version,
});

const library = (
  capabilities: readonly CanonicalCapabilityDefinition[],
  contentVersion = "2.0.0",
  schemaVersion = CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
): CanonicalCapabilityLibrary => ({ schemaVersion, contentVersion, capabilities });

const completeLibrary = () => library([
  { id: "leadership", label: "Leadership", family: "Leadership" },
  { id: "planning", label: "Planning", family: "Strategy" },
]);

const completeProfiles = () => [
  profile("engineering", "engineering", [requirement("leadership", "Engineering Leadership")]),
  profile("operations", "operations", [requirement("leadership", "Leadership"), requirement("planning", "Planning")]),
];

const reconcile = (
  profiles: readonly RoleCapabilityProfile[] = completeProfiles(),
  canonicalLibrary: CanonicalCapabilityLibrary = completeLibrary(),
) => reconcileRoleCapabilityProfilesWithCanonicalLibrary({ profiles, canonicalLibrary });

const expectIssue = (result: RoleCapabilityRegistryReconciliationResult, code: string) => {
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((item) => item.code === code), JSON.stringify(result.issues));
};

const warningCount = (result: RoleCapabilityRegistryReconciliationResult, code: string) =>
  result.warnings.filter((item) => item.code === code).length;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

assert.equal(ROLE_CAPABILITY_REGISTRY_RECONCILIATION_VERSION, "1.0.0");

const emptyProfiles = reconcile([], completeLibrary());
expectIssue(emptyProfiles, "empty_profile_set");
assert.equal(emptyProfiles.coverage.sourceProfileCount, 0);
assert.equal(emptyProfiles.coverage.complete, false);

const invalidRegistry = reconcile(completeProfiles(), library([
  { id: "bad id", label: "Bad", family: "Family" },
]));
expectIssue(invalidRegistry, "invalid_canonical_library");
assert.equal(invalidRegistry.resolvedReferences.length, 0);
assert.equal("definitions" in invalidRegistry, false);

const emptyRegistry = reconcile(completeProfiles(), library([]));
expectIssue(emptyRegistry, "invalid_canonical_library");

const missingVersion = reconcile([{ ...completeProfiles()[0], version: "" }], completeLibrary());
expectIssue(missingVersion, "invalid_profile_schema_version");
const mixedVersions = reconcile([
  completeProfiles()[0],
  { ...completeProfiles()[1], version: "2.0.0" },
], completeLibrary());
expectIssue(mixedVersions, "mixed_profile_schema_versions");
const unsupportedVersion = reconcile([{ ...completeProfiles()[0], version: "2.0.0" }], completeLibrary());
expectIssue(unsupportedVersion, "invalid_profile_schema_version");

const clean = reconcile();
assert.equal(clean.ok, true, clean.ok ? undefined : JSON.stringify(clean.issues));
assert.equal(clean.coverage.complete, true);
assert.deepEqual(clean.coverage, {
  sourceProfileCount: 2,
  sourceRequirementReferenceCount: 3,
  uniqueRequirementIdCount: 2,
  matchedRequirementReferenceCount: 3,
  matchedUniqueRequirementIdCount: 2,
  unresolvedRequirementReferenceCount: 0,
  unresolvedUniqueRequirementIdCount: 0,
  registryCapabilityCount: 2,
  unreferencedRegistryCapabilityCount: 0,
  referenceCoverageRatio: 1,
  uniqueIdCoverageRatio: 1,
  complete: true,
});
assert.equal("definitions" in clean, false);
assert.equal(clean.resolvedReferences.length, 3);
const engineeringLeadership = clean.resolvedReferences.find((item) => item.profileId === "engineering");
assert.ok(engineeringLeadership);
assert.deepEqual({
  id: engineeringLeadership.capabilityId,
  contextualLabel: engineeringLeadership.contextualLabel,
  canonicalLabel: engineeringLeadership.canonicalLabel,
  canonicalFamily: engineeringLeadership.canonicalFamily,
  domain: engineeringLeadership.profileDomain,
  labelMatchesCanonical: engineeringLeadership.labelMatchesCanonical,
}, {
  id: "leadership",
  contextualLabel: "Engineering Leadership",
  canonicalLabel: "Leadership",
  canonicalFamily: "Leadership",
  domain: "engineering",
  labelMatchesCanonical: false,
});
assert.equal(warningCount(clean, "role_requirement_label_differs_from_canonical"), 1);
const exactLeadership = clean.resolvedReferences.find((item) => item.profileId === "operations" && item.capabilityId === "leadership");
assert.equal(exactLeadership?.labelMatchesCanonical, true);
assert.equal(clean.warnings.some((item) => item.code === "capability_family_conflict"), false);

const unknownProfiles = [
  profile("alpha", "one", [requirement("missing", "Missing A")]),
  profile("beta", "two", [requirement("missing", "Missing B"), requirement("other-missing", "Other")]),
];
const unknown = reconcile(unknownProfiles, library([{ id: "known", label: "Known", family: "Family" }]));
expectIssue(unknown, "unknown_canonical_capability");
assert.equal(unknown.coverage.complete, false);
assert.equal(unknown.coverage.unresolvedRequirementReferenceCount, 3);
assert.equal(unknown.coverage.unresolvedUniqueRequirementIdCount, 2);
assert.equal("definitions" in unknown, false);
if (!unknown.ok) {
  const unknownIssues = unknown.issues.filter((item) => item.code === "unknown_canonical_capability");
  assert.equal(unknownIssues.length, 2);
  assert.deepEqual(unknownIssues.map((item) => item.capabilityId), ["missing", "other-missing"]);
  assert.equal(unknownIssues[0].references?.length, 2);
  assert.deepEqual(unknownIssues[0].references?.map((item) => item.profileId), ["alpha", "beta"]);
}

const orphan = reconcile(
  [profile("known-role", "domain", [requirement("known", "Known")])],
  library([
    { id: "orphan", label: "Orphan", family: "Family" },
    { id: "known", label: "Known", family: "Family" },
  ].sort((left, right) => left.label.localeCompare(right.label, "en"))),
);
assert.equal(orphan.ok, true);
assert.equal(orphan.coverage.unreferencedRegistryCapabilityCount, 1);
assert.equal(warningCount(orphan, "canonical_capability_unreferenced"), 1);

const duplicateRequirement = requirement("leadership", "Leadership");
const duplicates = reconcile(
  [profile("duplicate-role", "domain", [duplicateRequirement, { ...duplicateRequirement }])],
  library([{ id: "leadership", label: "Leadership", family: "Leadership" }]),
);
assert.equal(duplicates.ok, true);
assert.equal(duplicates.coverage.sourceRequirementReferenceCount, 2);
assert.equal(duplicates.coverage.matchedRequirementReferenceCount, 2);
assert.equal(duplicates.coverage.uniqueRequirementIdCount, 1);
assert.equal(warningCount(duplicates, "duplicate_requirement_reference"), 1);
assert.equal(duplicates.resolvedReferences.length, 2);

const invalidId = reconcile(
  [profile("invalid-id", "domain", [requirement("bad id", "Bad")])],
  library([{ id: "known", label: "Known", family: "Family" }]),
);
expectIssue(invalidId, "invalid_requirement_capability_id");
const invalidLabel = reconcile(
  [profile("invalid-label", "domain", [requirement("known", " ")])],
  library([{ id: "known", label: "Known", family: "Family" }]),
);
expectIssue(invalidLabel, "invalid_requirement_label");

const expectedVersion = "role-capability-reconciliation/registry-schema-1.0.0/registry-content-2.0.0/profile-schema-1.0.0/adapter-1.0.0";
assert.equal(clean.reconciliationVersion, expectedVersion);
const contentChanged = reconcile(completeProfiles(), library(completeLibrary().capabilities, "2.1.0"));
assert.notEqual(contentChanged.reconciliationVersion, clean.reconciliationVersion);
assert.ok(contentChanged.reconciliationVersion.includes("registry-content-2.1.0"));
const profileContentChanged = completeProfiles().map((item) => ({ ...item, description: `${item.description} Changed content.` }));
assert.equal(reconcile(profileContentChanged).reconciliationVersion, clean.reconciliationVersion);
const invalidRegistrySchema = reconcile(completeProfiles(), library(completeLibrary().capabilities, "2.0.0", "2.0.0"));
expectIssue(invalidRegistrySchema, "invalid_canonical_library");
assert.equal(invalidRegistrySchema.reconciliationVersion, "role-capability-reconciliation/unresolved/adapter-1.0.0");

const reversedProfiles = reconcile([...completeProfiles()].reverse());
assert.deepEqual(reversedProfiles, clean);
const reversedRequirements = completeProfiles().map((item) => ({
  ...item,
  mustHaveCapabilities: [...item.mustHaveCapabilities].reverse(),
  shouldHaveCapabilities: [...item.shouldHaveCapabilities].reverse(),
  differentiatingCapabilities: [...item.differentiatingCapabilities].reverse(),
}));
assert.deepEqual(reconcile(reversedRequirements), clean);
assert.equal(JSON.stringify(reconcile()), JSON.stringify(clean));
assert.deepEqual(JSON.parse(JSON.stringify(clean)), clean);

const frozenProfiles = deepFreeze(structuredClone(completeProfiles()));
const frozenLibrary = deepFreeze(structuredClone(completeLibrary()));
const frozenBefore = JSON.stringify([frozenProfiles, frozenLibrary]);
assert.deepEqual(reconcile(frozenProfiles, frozenLibrary), clean);
assert.equal(JSON.stringify([frozenProfiles, frozenLibrary]), frozenBefore);

const currentFixtureBefore = JSON.stringify(roleCapabilityProfiles);
const canonicalBefore = JSON.stringify(canonicalCapabilityLibrary);
const currentFixture = reconcile(roleCapabilityProfiles, canonicalCapabilityLibrary);
assert.equal(currentFixture.ok, false);
assert.deepEqual(currentFixture.coverage, {
  sourceProfileCount: 20,
  sourceRequirementReferenceCount: 80,
  uniqueRequirementIdCount: 79,
  matchedRequirementReferenceCount: 26,
  matchedUniqueRequirementIdCount: 25,
  unresolvedRequirementReferenceCount: 54,
  unresolvedUniqueRequirementIdCount: 54,
  registryCapabilityCount: 25,
  unreferencedRegistryCapabilityCount: 0,
  referenceCoverageRatio: 26 / 80,
  uniqueIdCoverageRatio: 25 / 79,
  complete: false,
});
assert.equal(currentFixture.resolvedReferences.length, 26);
const newlyAdmittedIds = [
  "account-growth",
  "audience-insight",
  "commercial-negotiation",
  "commercial-partnerships",
  "consultative-selling",
  "cross-functional-delivery",
  "customer-adoption",
  "customer-segmentation",
  "dependency-management",
  "employee-relations",
  "forecasting",
  "insight-synthesis",
  "market-strategy",
  "measurement-design",
  "operating-model",
  "operating-rhythm",
  "organisation-design",
  "process-improvement",
  "product-cadence",
  "product-insights",
  "regulatory-compliance",
  "research-design",
  "scenario-modelling",
  "variance-analysis",
] as const;
assert.deepEqual(
  [...new Set(currentFixture.resolvedReferences
    .map((item) => item.capabilityId)
    .filter((id) => id !== "people-leadership"))].sort(),
  [...newlyAdmittedIds].sort(),
);
assert.ok(currentFixture.resolvedReferences
  .filter((item) => item.capabilityId !== "people-leadership")
  .every((item) => item.contextualLabel === item.canonicalLabel && item.labelMatchesCanonical));
const currentEngineering = currentFixture.resolvedReferences.find((item) => item.profileId === "engineering-manager");
assert.deepEqual({
  contextualLabel: currentEngineering?.contextualLabel,
  profileDomain: currentEngineering?.profileDomain,
  labelMatchesCanonical: currentEngineering?.labelMatchesCanonical,
}, {
  contextualLabel: "Engineering People Leadership",
  profileDomain: "engineering",
  labelMatchesCanonical: false,
});
assert.equal(warningCount(currentFixture, "role_requirement_label_differs_from_canonical"), 1);
assert.equal(currentFixture.warnings.some((item) => item.code === "canonical_capability_unreferenced"), false);
assert.equal(JSON.stringify(currentFixture).includes("capability_family_conflict"), false);
assert.equal("definitions" in currentFixture, false);
assert.equal(JSON.stringify(roleCapabilityProfiles), currentFixtureBefore);
assert.equal(JSON.stringify(canonicalCapabilityLibrary), canonicalBefore);

const mappingCompatible: readonly CareerMapCapabilityDefinition[] = currentFixture.resolvedReferences
  .filter((item, index, values) => values.findIndex((candidate) => candidate.capabilityId === item.capabilityId) === index)
  .map((item) => ({ id: item.capabilityId, label: item.canonicalLabel, family: item.canonicalFamily }));
assert.equal(mappingCompatible.length, 25);
assert.deepEqual(
  mappingCompatible.find((item) => item.id === "people-leadership"),
  { id: "people-leadership", label: "People Leadership", family: "Leadership" },
);
assert.ok(mappingCompatible.every((item) =>
  canonicalCapabilityLibrary.capabilities.some((capability) =>
    capability.id === item.id && capability.label === item.label && capability.family === item.family)));

const source = readFileSync("lib/career-possibility/role-capability-registry-reconciliation.ts", "utf8");
assert.equal(source.includes("fixtures/roleCapabilityProfiles"), false);
assert.equal(source.includes("canonicalCapabilityLibrary,"), false);
assert.equal(source.includes("console."), false);
assert.equal(source.includes("Date("), false);
assert.equal(source.includes("Math.random"), false);

console.log("role-capability-registry-reconciliation.test passed");
