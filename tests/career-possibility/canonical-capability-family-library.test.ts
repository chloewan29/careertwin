import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  canonicalCapabilityLibrary,
  type CanonicalCapabilityLibrary,
} from "../../lib/career-possibility/canonical-capability-library";
import {
  CANONICAL_CAPABILITY_FAMILY_LIBRARY_CONTENT_VERSION,
  CANONICAL_CAPABILITY_FAMILY_LIBRARY_SCHEMA_VERSION,
  canonicalCapabilityFamilyLibrary,
  serializeCanonicalCapabilityFamilyLibraryContent,
  validateCanonicalCapabilityFamilyLibrary,
  validateCanonicalCapabilityFamilyLibraryVersionTransition,
  validateCanonicalCapabilityFamilyMembership,
  type CanonicalCapabilityFamily,
  type CanonicalCapabilityFamilyLibrary,
} from "../../lib/career-possibility/canonical-capability-family-library";

const expectedFamilies = [
  ["analytics-insight", "Analytics & Insight", "Measurement, analysis, modelling, research methods, and synthesis used to generate evidence and insight."],
  ["commercial", "Commercial", "Revenue, value, negotiation, selling, and commercial relationship capabilities."],
  ["communication-collaboration", "Communication & Collaboration", "Narrative, influence, partnering, engagement, and cross-functional alignment capabilities."],
  ["customer-market", "Customer & Market", "Capabilities for understanding customer, audience, and market behaviour and needs."],
  ["data-technology", "Data & Technology", "Reusable technology application, architecture, automation, systems, and tooling-enablement capabilities."],
  ["governance-risk", "Governance & Risk", "Decision rights, controls, compliance, risk, assurance, and formal oversight capabilities."],
  ["leadership", "Leadership", "Capabilities for leading people, teams, or accountable organisational direction."],
  ["learning-development", "Learning & Development", "Learning design, educational delivery, capability development, and learning-outcome capabilities."],
  ["operations-delivery", "Operations & Delivery", "Capabilities for planning, coordinating, delivering, operating, and improving services or work."],
  ["people-organisation", "People & Organisation", "Workforce, organisation design, employee relations, talent, and people-system capabilities."],
  ["product", "Product", "Product discovery, decision systems, operating cadence, and product-specific capability development."],
  ["strategy-transformation", "Strategy & Transformation", "Direction-setting, prioritisation, operating-model change, and planned transformation capabilities."],
] as const;

const cloneFamilyLibrary = (
  library: CanonicalCapabilityFamilyLibrary,
): CanonicalCapabilityFamilyLibrary => structuredClone(library);
const familyLibrary = (
  families: readonly CanonicalCapabilityFamily[],
  contentVersion = "2.0.0",
): CanonicalCapabilityFamilyLibrary => ({
  schemaVersion: CANONICAL_CAPABILITY_FAMILY_LIBRARY_SCHEMA_VERSION,
  contentVersion,
  families,
});
const capabilityLibrary = (
  family: string,
  id = "synthetic-capability",
  label = "Synthetic Capability",
): CanonicalCapabilityLibrary => ({
  schemaVersion: CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  contentVersion: "2.0.0",
  capabilities: [{ id, label, family }],
});
const expectFamilyIssue = (
  library: CanonicalCapabilityFamilyLibrary,
  code: string,
) => {
  const result = validateCanonicalCapabilityFamilyLibrary(library);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((issue) => issue.code === code), JSON.stringify(result.issues));
  }
};
const expectTransitionFailure = (
  previous: CanonicalCapabilityFamilyLibrary,
  next: CanonicalCapabilityFamilyLibrary,
) => {
  const result = validateCanonicalCapabilityFamilyLibraryVersionTransition(previous, next);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.issues[0].code, "content_changed_without_version_change");
  }
};
const expectMembershipIssue = (family: string, code = "unknown_capability_family") => {
  const result = validateCanonicalCapabilityFamilyMembership({
    capabilityLibrary: capabilityLibrary(family),
    familyLibrary: canonicalCapabilityFamilyLibrary,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, code);
};

assert.equal(CANONICAL_CAPABILITY_FAMILY_LIBRARY_SCHEMA_VERSION, "1.0.0");
assert.equal(CANONICAL_CAPABILITY_FAMILY_LIBRARY_CONTENT_VERSION, "1.0.0");
assert.equal(canonicalCapabilityFamilyLibrary.families.length, 12);
assert.deepEqual(
  canonicalCapabilityFamilyLibrary.families.map(({ id, label, description }) => [id, label, description]),
  expectedFamilies,
);

const exportedValidation = validateCanonicalCapabilityFamilyLibrary(
  canonicalCapabilityFamilyLibrary,
);
assert.equal(
  exportedValidation.ok,
  true,
  exportedValidation.ok ? undefined : JSON.stringify(exportedValidation.issues),
);
assert.equal(Object.isFrozen(canonicalCapabilityFamilyLibrary), true);
assert.equal(Object.isFrozen(canonicalCapabilityFamilyLibrary.families), true);
assert.equal(
  canonicalCapabilityFamilyLibrary.families.every((family) => Object.isFrozen(family)),
  true,
);

const leadership = canonicalCapabilityFamilyLibrary.families.filter(
  (family) => family.id === "leadership",
);
assert.equal(leadership.length, 1);
assert.equal(leadership[0].label, "Leadership");
assert.equal(
  canonicalCapabilityFamilyLibrary.families.every((family) =>
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(family.id)),
  true,
);
assert.equal(
  canonicalCapabilityFamilyLibrary.families.every(
    (family) =>
      family.label.length > 0 &&
      family.label === family.label.trim() &&
      family.description.length > 0 &&
      family.description === family.description.trim(),
  ),
  true,
);
const canonicalOrder = [...canonicalCapabilityFamilyLibrary.families].sort(
  (left, right) =>
    left.label.localeCompare(right.label, "en") || left.id.localeCompare(right.id, "en"),
);
assert.deepEqual(canonicalCapabilityFamilyLibrary.families, canonicalOrder);

const base = canonicalCapabilityFamilyLibrary.families[0];
expectFamilyIssue(familyLibrary([]), "empty_family_library");
expectFamilyIssue(familyLibrary([{ ...base, id: "Bad ID" }]), "invalid_family_id");
expectFamilyIssue(familyLibrary([{ ...base, id: " analytics-insight" }]), "invalid_family_id");
expectFamilyIssue(familyLibrary([{ ...base, label: "" }]), "invalid_family_label");
expectFamilyIssue(familyLibrary([{ ...base, label: " Analytics & Insight" }]), "invalid_family_label");
expectFamilyIssue(familyLibrary([{ ...base, description: "" }]), "invalid_family_description");
expectFamilyIssue(familyLibrary([{ ...base, description: " Description" }]), "invalid_family_description");
expectFamilyIssue(familyLibrary([base, { ...base, label: "Second" }]), "duplicate_family_id");
expectFamilyIssue(
  familyLibrary([base, { ...base, id: "second-family" }]),
  "duplicate_family_label",
);
expectFamilyIssue(
  familyLibrary([canonicalCapabilityFamilyLibrary.families[1], base]),
  "noncanonical_order",
);
expectFamilyIssue(
  { ...cloneFamilyLibrary(canonicalCapabilityFamilyLibrary), schemaVersion: "2.0.0" },
  "invalid_schema_version",
);
expectFamilyIssue(
  { ...cloneFamilyLibrary(canonicalCapabilityFamilyLibrary), contentVersion: "release-one" },
  "invalid_content_version",
);

const mutableFamilyLibrary = cloneFamilyLibrary(canonicalCapabilityFamilyLibrary);
const mutableFamilyBefore = JSON.stringify(mutableFamilyLibrary);
const familyValidationA = validateCanonicalCapabilityFamilyLibrary(mutableFamilyLibrary);
const familyValidationB = validateCanonicalCapabilityFamilyLibrary(mutableFamilyLibrary);
assert.deepEqual(familyValidationA, familyValidationB);
assert.equal(JSON.stringify(mutableFamilyLibrary), mutableFamilyBefore);
assert.deepEqual(JSON.parse(JSON.stringify(familyValidationA)), familyValidationA);
assert.equal(
  serializeCanonicalCapabilityFamilyLibraryContent(mutableFamilyLibrary),
  serializeCanonicalCapabilityFamilyLibraryContent(mutableFamilyLibrary),
);

const transitionPrevious = familyLibrary([
  { id: "alpha", label: "Alpha", description: "Alpha description." },
  { id: "beta", label: "Beta", description: "Beta description." },
]);
expectTransitionFailure(
  transitionPrevious,
  familyLibrary([
    { id: "alpha", label: "Alpha", description: "Changed description." },
    { id: "beta", label: "Beta", description: "Beta description." },
  ]),
);
expectTransitionFailure(
  transitionPrevious,
  familyLibrary([
    { id: "alpha", label: "Alpha changed", description: "Alpha description." },
    { id: "beta", label: "Beta", description: "Beta description." },
  ]),
);
expectTransitionFailure(
  transitionPrevious,
  familyLibrary([
    { id: "alpha-changed", label: "Alpha", description: "Alpha description." },
    { id: "beta", label: "Beta", description: "Beta description." },
  ]),
);
expectTransitionFailure(
  transitionPrevious,
  familyLibrary([
    ...transitionPrevious.families,
    { id: "gamma", label: "Gamma", description: "Gamma description." },
  ]),
);
expectTransitionFailure(
  transitionPrevious,
  familyLibrary([transitionPrevious.families[0]]),
);
const changedWithVersion = validateCanonicalCapabilityFamilyLibraryVersionTransition(
  transitionPrevious,
  familyLibrary(
    [{ id: "alpha", label: "Alpha", description: "Changed description." }, transitionPrevious.families[1]],
    "2.1.0",
  ),
);
assert.deepEqual(changedWithVersion, { ok: true, warnings: [] });
const unchangedWithVersion = validateCanonicalCapabilityFamilyLibraryVersionTransition(
  transitionPrevious,
  { ...transitionPrevious, contentVersion: "2.1.0" },
);
assert.equal(unchangedWithVersion.ok, true);
if (unchangedWithVersion.ok) {
  assert.equal(unchangedWithVersion.warnings[0].code, "content_unchanged_with_version_change");
}
const transitionBefore = JSON.stringify([transitionPrevious, unchangedWithVersion]);
assert.deepEqual(
  validateCanonicalCapabilityFamilyLibraryVersionTransition(
    transitionPrevious,
    { ...transitionPrevious, contentVersion: "2.1.0" },
  ),
  unchangedWithVersion,
);
assert.equal(JSON.stringify([transitionPrevious, unchangedWithVersion]), transitionBefore);
assert.deepEqual(JSON.parse(JSON.stringify(unchangedWithVersion)), unchangedWithVersion);

const membershipInput = {
  capabilityLibrary: structuredClone(canonicalCapabilityLibrary),
  familyLibrary: cloneFamilyLibrary(canonicalCapabilityFamilyLibrary),
};
const membershipBefore = JSON.stringify(membershipInput);
const membershipA = validateCanonicalCapabilityFamilyMembership(membershipInput);
const membershipB = validateCanonicalCapabilityFamilyMembership(membershipInput);
assert.deepEqual(membershipA, membershipB);
assert.equal(JSON.stringify(membershipInput), membershipBefore);
assert.deepEqual(JSON.parse(JSON.stringify(membershipA)), membershipA);
assert.deepEqual(membershipA, {
  ok: true,
  memberships: [{
    capabilityId: "people-leadership",
    capabilityLabel: "People Leadership",
    familyId: "leadership",
    familyLabel: "Leadership",
  }],
});

expectMembershipIssue("Operations");
expectMembershipIssue("leadership");
expectMembershipIssue("Operations & Deliver");
expectMembershipIssue("LEADERSHIP");
expectMembershipIssue(" Leadership", "invalid_capability_library");
expectMembershipIssue("Leadership ", "invalid_capability_library");

const invalidCapabilityResult = validateCanonicalCapabilityFamilyMembership({
  capabilityLibrary: capabilityLibrary("Leadership", "Bad ID"),
  familyLibrary: canonicalCapabilityFamilyLibrary,
});
assert.equal(invalidCapabilityResult.ok, false);
if (!invalidCapabilityResult.ok) {
  assert.equal(invalidCapabilityResult.issues[0].code, "invalid_capability_library");
  assert.equal(invalidCapabilityResult.issues[0].sourceIssues?.[0].code, "invalid_capability_id");
}
const invalidFamilyResult = validateCanonicalCapabilityFamilyMembership({
  capabilityLibrary: canonicalCapabilityLibrary,
  familyLibrary: familyLibrary([]),
});
assert.equal(invalidFamilyResult.ok, false);
if (!invalidFamilyResult.ok) {
  assert.equal(invalidFamilyResult.issues[0].code, "invalid_family_library");
  assert.equal(invalidFamilyResult.issues[0].sourceIssues?.[0].code, "empty_family_library");
}

const orderedMembershipResult = validateCanonicalCapabilityFamilyMembership({
  capabilityLibrary: {
    schemaVersion: CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
    contentVersion: "2.0.0",
    capabilities: [
      { id: "zeta", label: "Zeta", family: "Leadership" },
      { id: "alpha", label: "Alpha", family: "Leadership" },
    ].sort((left, right) =>
      left.family.localeCompare(right.family, "en") ||
      left.label.localeCompare(right.label, "en") ||
      left.id.localeCompare(right.id, "en")),
  },
  familyLibrary: canonicalCapabilityFamilyLibrary,
});
assert.equal(orderedMembershipResult.ok, true);
if (orderedMembershipResult.ok) {
  assert.deepEqual(
    orderedMembershipResult.memberships.map((membership) => membership.capabilityId),
    ["alpha", "zeta"],
  );
  assert.equal(orderedMembershipResult.memberships.every((membership) => "familyId" in membership), true);
}

const productionSource = readFileSync(
  "lib/career-possibility/canonical-capability-family-library.ts",
  "utf8",
);
assert.equal(productionSource.includes("role-capability-library"), false);
assert.equal(productionSource.includes("roleCapabilityProfiles"), false);
assert.equal(productionSource.includes("canonicalCapabilityLibrary,"), false);
assert.equal(productionSource.includes("canonicalCapabilityFamilyLibrary,"), false);
assert.equal(/(?:Date|Math\.random|console\.|process\.|window\.|document\.)/.test(productionSource), false);
assert.equal(/(?:react|next\/|app\/career-map|components\/)/.test(productionSource), false);
assert.equal(
  canonicalCapabilityLibrary.capabilities.some((capability) =>
    /(?:salesforce|workday|tableau|power bi|aws|azure)/i.test(capability.label)),
  false,
);

console.log("canonical-capability-family-library.test passed");
