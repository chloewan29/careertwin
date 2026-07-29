import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  canonicalCapabilityLibrary,
  type CanonicalCapabilityDefinition,
  type CanonicalCapabilityLibrary,
} from "../../lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityGovernanceLibrary, type CanonicalCapabilityGovernanceLibrary } from "../../lib/career-possibility/canonical-capability-governance-decisions";
import {
  CANONICAL_CAPABILITY_CANDIDATE_REPORT_GENERATOR_VERSION,
  buildCanonicalCapabilityCandidateReport,
  type CanonicalCapabilityCandidateReportResult,
} from "../../lib/career-possibility/canonical-capability-candidate-report";
import {
  ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION,
  type CapabilityImportance,
  type RoleCapabilityProfile,
  type RoleCapabilityRequirement,
} from "../../lib/career-possibility/role-capability-library";
import { roleCapabilityProfiles } from "../../lib/career-possibility/fixtures/roleCapabilityProfiles";

const requirement = (
  capabilityId: string,
  label: string,
  importance: CapabilityImportance = "must",
): RoleCapabilityRequirement => ({
  capabilityId,
  label,
  importance,
  expectedEvidence: `Long proof text for ${label} must not enter candidate output.`,
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
  description: `Private-to-domain description for ${roleFamilyId}.`,
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

const admittedLibrary = (contentVersion = "2.0.0") => library([
  { id: "admitted", label: "Admitted", family: "Established Family" },
], contentVersion);

const build = (
  profiles: readonly RoleCapabilityProfile[],
  canonicalLibrary: CanonicalCapabilityLibrary = admittedLibrary(),
  governanceLibrary?: CanonicalCapabilityGovernanceLibrary,
) => buildCanonicalCapabilityCandidateReport({ profiles, canonicalLibrary, governanceLibrary });

const expectFailure = (result: CanonicalCapabilityCandidateReportResult, sourceCode: string) => {
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((item) => item.sourceIssueCode === sourceCode), JSON.stringify(result.issues));
    assert.equal("candidates" in result, false);
  }
};

const candidate = (result: CanonicalCapabilityCandidateReportResult, capabilityId: string) => {
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  const item = result.candidates.find((value) => value.capabilityId === capabilityId);
  assert.ok(item, `Missing candidate ${capabilityId}`);
  return item;
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

assert.equal(CANONICAL_CAPABILITY_CANDIDATE_REPORT_GENERATOR_VERSION, "1.0.0");

expectFailure(build([profile("bad-registry", "domain", [requirement("unknown", "Unknown")])], library([
  { id: "bad id", label: "Bad", family: "Family" },
])), "invalid_canonical_library");
expectFailure(build([profile("empty-registry", "domain", [requirement("unknown", "Unknown")])], library([])), "invalid_canonical_library");
expectFailure(build([{ ...profile("missing-version", "domain", [requirement("unknown", "Unknown")]), version: "" }]), "invalid_profile_schema_version");
expectFailure(build([
  profile("version-one", "domain", [requirement("unknown-one", "Unknown One")]),
  profile("version-two", "domain", [requirement("unknown-two", "Unknown Two")], "2.0.0"),
]), "mixed_profile_schema_versions");
expectFailure(build([profile("invalid-id", "domain", [requirement("bad id", "Bad")])]), "invalid_requirement_capability_id");
expectFailure(build([profile("invalid-label", "domain", [requirement("unknown", " ")])]), "invalid_requirement_label");

const complete = build(
  [profile("complete", "context-domain", [requirement("admitted", "Contextual Admitted")])],
  admittedLibrary(),
);
assert.equal(complete.ok, true);
if (!complete.ok) throw new Error(JSON.stringify(complete.issues));
assert.deepEqual(complete.candidates, []);
assert.deepEqual(complete.warnings, []);
assert.deepEqual(complete.counts, {
  sourceProfileCount: 1,
  sourceRequirementReferenceCount: 1,
  sourceUniqueCapabilityIdCount: 1,
  alreadyAdmittedUniqueIdCount: 1,
  candidateUniqueIdCount: 0,
  candidateReferenceCount: 0,
  completeCoverage: true,
  reviewedDeferredUniqueIdCount: 0,
  reviewedExcludedUniqueIdCount: 0,
  governanceComplete: true,
});
assert.deepEqual(complete.reviewedDeferred, []);
assert.deepEqual(complete.reviewedExcluded, []);

const one = build([profile("one", "domain", [requirement("unknown", "Unknown")])]);
assert.equal(one.ok, true);
const oneCandidate = candidate(one, "unknown");
assert.deepEqual(oneCandidate, {
  capabilityId: "unknown",
  candidateLabel: "Unknown",
  observedLabels: ["Unknown"],
  observedDomains: ["domain"],
  referencedProfileIds: ["one"],
  referenceCount: 1,
  importanceValues: ["must"],
  occurrencePaths: ["profiles:one.mustHaveCapabilities[0]"],
  crossDomain: false,
  status: "single_label_single_domain",
});
assert.equal("family" in oneCandidate, false);
assert.equal("definitions" in one, false);
assert.equal("registryEntries" in one, false);

const sameLabelDomain = build([
  profile("zeta", "same-domain", [requirement("shared-id", "Shared Label", "differentiator")]),
  profile("alpha", "same-domain", [
    requirement("shared-id", "Shared Label", "should"),
    requirement("shared-id", "Shared Label", "must"),
  ]),
]);
const sameLabelDomainCandidate = candidate(sameLabelDomain, "shared-id");
assert.deepEqual(sameLabelDomainCandidate.observedLabels, ["Shared Label"]);
assert.deepEqual(sameLabelDomainCandidate.observedDomains, ["same-domain"]);
assert.deepEqual(sameLabelDomainCandidate.referencedProfileIds, ["alpha", "zeta"]);
assert.deepEqual(sameLabelDomainCandidate.importanceValues, ["must", "should", "differentiator"]);
assert.deepEqual(sameLabelDomainCandidate.occurrencePaths, [
  "profiles:alpha.mustHaveCapabilities[0]",
  "profiles:alpha.mustHaveCapabilities[1]",
  "profiles:zeta.mustHaveCapabilities[0]",
]);
assert.equal(sameLabelDomainCandidate.referenceCount, 3);
assert.equal(sameLabelDomainCandidate.status, "single_label_single_domain");

const crossDomain = build([
  profile("engineering", "engineering", [requirement("cross-domain", "Cross Domain")]),
  profile("operations", "operations", [requirement("cross-domain", "Cross Domain")]),
]);
const crossDomainCandidate = candidate(crossDomain, "cross-domain");
assert.deepEqual(crossDomainCandidate.observedDomains, ["engineering", "operations"]);
assert.equal(crossDomainCandidate.crossDomain, true);
assert.equal(crossDomainCandidate.status, "single_label_cross_domain");

const multipleLabels = build([
  profile("alpha", "one-domain", [requirement("multi-label", "Alpha Label")]),
  profile("beta", "one-domain", [requirement("multi-label", "Beta Label")]),
]);
const multipleLabelsCandidate = candidate(multipleLabels, "multi-label");
assert.deepEqual(multipleLabelsCandidate.observedLabels, ["Alpha Label", "Beta Label"]);
assert.equal("candidateLabel" in multipleLabelsCandidate, false);
assert.equal(multipleLabelsCandidate.crossDomain, false);
assert.equal(multipleLabelsCandidate.status, "multiple_labels_single_domain");

const multipleBoth = build([
  profile("alpha", "alpha-domain", [requirement("multi-both", "Alpha Label")]),
  profile("beta", "beta-domain", [requirement("multi-both", "Beta Label")]),
]);
const multipleBothCandidate = candidate(multipleBoth, "multi-both");
assert.equal("candidateLabel" in multipleBothCandidate, false);
assert.equal(multipleBothCandidate.crossDomain, true);
assert.equal(multipleBothCandidate.status, "multiple_labels_cross_domain");

const sharedLabel = build([profile("shared", "domain", [
  requirement("first-id", "Same Label"),
  requirement("second-id", "Same Label"),
])]);
assert.equal(sharedLabel.ok, true);
if (!sharedLabel.ok) throw new Error(JSON.stringify(sharedLabel.issues));
assert.deepEqual(sharedLabel.candidates.map((item) => item.capabilityId), ["first-id", "second-id"]);
assert.equal(sharedLabel.warnings.length, 1);
assert.deepEqual(sharedLabel.warnings[0], {
  code: "candidate_label_shared_across_ids",
  severity: "warning",
  path: "candidateLabels:Same Label",
  message: "Observed candidate label Same Label is shared by 2 unresolved capability IDs.",
  label: "Same Label",
  capabilityIds: ["first-id", "second-id"],
});

const nearDuplicates = build([profile("near", "domain", [
  requirement("plan", "Plan"),
  requirement("planning", "Planning"),
])]);
assert.equal(nearDuplicates.ok, true);
if (nearDuplicates.ok) assert.deepEqual(nearDuplicates.candidates.map((item) => item.capabilityId), ["plan", "planning"]);

const versionProfiles = [profile("version", "domain", [requirement("unknown", "Unknown")])];
const versionA = build(versionProfiles, admittedLibrary("2.0.0"));
const expectedVersion = "role-capability-candidates/registry-schema-1.0.0/registry-content-2.0.0/profile-schema-1.0.0/generator-1.0.0";
assert.equal(versionA.ok, true);
if (versionA.ok) assert.equal(versionA.reportVersion, expectedVersion);
const versionB = build(versionProfiles, admittedLibrary("2.1.0"));
assert.notEqual(versionB.ok ? versionB.reportVersion : "", versionA.ok ? versionA.reportVersion : "");
const changedProfileContent = versionProfiles.map((item) => ({ ...item, description: "Changed role description." }));
const contentOnly = build(changedProfileContent, admittedLibrary("2.0.0"));
assert.equal(contentOnly.ok ? contentOnly.reportVersion : "", versionA.ok ? versionA.reportVersion : "");

const orderProfiles = [
  profile("zeta", "zeta-domain", [requirement("zeta-id", "Zeta"), requirement("alpha-id", "Alpha")]),
  profile("alpha", "alpha-domain", [requirement("shared-id", "Shared")]),
];
const orderA = build(orderProfiles);
const orderB = build([...orderProfiles].reverse().map((item) => ({
  ...item,
  mustHaveCapabilities: [...item.mustHaveCapabilities].reverse(),
  shouldHaveCapabilities: [...item.shouldHaveCapabilities].reverse(),
  differentiatingCapabilities: [...item.differentiatingCapabilities].reverse(),
})));
assert.deepEqual(orderB, orderA);
assert.equal(JSON.stringify(build(orderProfiles)), JSON.stringify(orderA));
assert.deepEqual(JSON.parse(JSON.stringify(orderA)), orderA);
if (orderA.ok) assert.deepEqual(orderA.candidates.map((item) => item.capabilityId), ["alpha-id", "shared-id", "zeta-id"]);

const frozenProfiles = deepFreeze(structuredClone(orderProfiles));
const frozenLibrary = deepFreeze(structuredClone(admittedLibrary()));
const frozenBefore = JSON.stringify([frozenProfiles, frozenLibrary]);
assert.deepEqual(build(frozenProfiles, frozenLibrary), orderA);
assert.equal(JSON.stringify([frozenProfiles, frozenLibrary]), frozenBefore);

const fixtureBefore = JSON.stringify(roleCapabilityProfiles);
const registryBefore = JSON.stringify(canonicalCapabilityLibrary);
const fixtureResult = build(roleCapabilityProfiles, canonicalCapabilityLibrary, canonicalCapabilityGovernanceLibrary);
assert.equal(fixtureResult.ok, true, fixtureResult.ok ? undefined : JSON.stringify(fixtureResult.issues));
if (!fixtureResult.ok) throw new Error(JSON.stringify(fixtureResult.issues));
assert.deepEqual(fixtureResult.counts, {
  sourceProfileCount: 20,
  sourceRequirementReferenceCount: 80,
  sourceUniqueCapabilityIdCount: 79,
  alreadyAdmittedUniqueIdCount: 51,
  candidateUniqueIdCount: 0,
  candidateReferenceCount: 0,
  completeCoverage: false,
  reviewedDeferredUniqueIdCount: 27,
  reviewedExcludedUniqueIdCount: 1,
  governanceComplete: true,
});
assert.equal(fixtureResult.candidates.length, 0);
assert.equal(fixtureResult.candidates.some((item) => item.capabilityId === "people-leadership"), false);
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
assert.ok(newlyAdmittedIds.every((id) =>
  fixtureResult.candidates.every((candidateItem) => candidateItem.capabilityId !== id)));
const deferredIds = [
  "analytics-leadership",
  "technical-leadership",
  "value-realisation",
  "financial-planning",
  "program-planning",
  "campaign-planning",
  "gtm-planning",
  "resource-planning",
  "data-storytelling",
  "decision-storytelling",
  "executive-narrative",
  "executive-reporting",
  "commercial-analysis",
  "commercial-modelling",
  "business-partnering",
  "executive-engagement",
  "learner-outcomes",
  "learning-design",
  "quality-oversight",
  "renewal-risk",
  "service-operations",
  "site-management",
  "vendor-governance",
] as const;
assert.ok(deferredIds.every((id) =>
  fixtureResult.reviewedDeferred.some((item) => item.capabilityId === id)));
assert.deepEqual(fixtureResult.reviewedExcluded, [{
  capabilityId: "matter-management",
  reason: "role_responsibility_not_capability",
  referenceCount: 1,
}]);
assert.ok(fixtureResult.candidates.every((item) =>
  item.referenceCount === 1
  && item.observedLabels.length === 1
  && item.observedDomains.length === 1
  && item.candidateLabel === item.observedLabels[0]
  && item.crossDomain === false
  && item.status === "single_label_single_domain"
  && !("family" in item)));
assert.deepEqual(fixtureResult.candidates.map((item) => item.capabilityId), [...fixtureResult.candidates.map((item) => item.capabilityId)].sort());
assert.equal(fixtureResult.warnings.some((item) => item.code === "candidate_label_shared_across_ids"), false);
assert.equal(JSON.stringify(fixtureResult).includes("Long proof text"), false);
assert.equal(JSON.stringify(fixtureResult).includes("Private-to-domain description"), false);
assert.equal(JSON.stringify(roleCapabilityProfiles), fixtureBefore);
assert.equal(JSON.stringify(canonicalCapabilityLibrary), registryBefore);

const source = readFileSync("lib/career-possibility/canonical-capability-candidate-report.ts", "utf8");
assert.equal(source.includes("fixtures/roleCapabilityProfiles"), false);
assert.equal(source.includes("canonicalCapabilityLibrary,"), false);
assert.equal(source.includes("mustHaveCapabilities"), false);
assert.equal(source.includes("shouldHaveCapabilities"), false);
assert.equal(source.includes("differentiatingCapabilities"), false);
assert.equal(source.includes("sourceIssue.message"), false);
assert.equal((source.match(/reconcileRoleCapabilityProfilesWithCanonicalLibrary\(\{/g) ?? []).length, 1);
assert.equal(source.includes("console."), false);
assert.equal(source.includes("Date("), false);
assert.equal(source.includes("Math.random"), false);
assert.equal(source.includes("process.env"), false);

console.log("canonical-capability-candidate-report.test passed");
