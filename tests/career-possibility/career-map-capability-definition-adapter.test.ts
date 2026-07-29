import { strict as assert } from "node:assert";
import {
  CAREER_MAP_CAPABILITY_DEFINITION_ADAPTER_VERSION,
  adaptRoleCapabilityProfilesToCareerMapDefinitions,
} from "../../lib/career-possibility/career-map-capability-definition-adapter";
import { exampleResumeEvidence } from "../../lib/career-possibility/fixtures/exampleResumeEvidence";
import { roleCapabilityProfiles } from "../../lib/career-possibility/fixtures/roleCapabilityProfiles";
import type { RoleCapabilityProfile, RoleCapabilityRequirement } from "../../lib/career-possibility/role-capability-library";
import { applyResumeEvidenceReviewDecisions } from "../../lib/career-possibility/resume-evidence-review-apply";
import { RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION, type ResumeEvidenceReviewSession } from "../../lib/career-possibility/resume-evidence-review-contract";

const requirement = (capabilityId: string, label: string): RoleCapabilityRequirement => ({
  capabilityId,
  label,
  importance: "must",
  expectedEvidence: "Static taxonomy test requirement.",
  minimumProofLevel: "demonstrated",
});

const profile = (roleFamilyId: string, domain: string, requirements: RoleCapabilityRequirement[], version = "2.0.0"): RoleCapabilityProfile => ({
  roleFamilyId,
  canonicalTitle: roleFamilyId,
  aliases: [],
  searchTitles: [],
  domain,
  seniorityBand: "manager",
  description: "Static taxonomy adapter test profile.",
  mustHaveCapabilities: requirements,
  shouldHaveCapabilities: [],
  differentiatingCapabilities: [],
  evidenceRequirements: [],
  commonGrowthAreas: [],
  adjacentFromCapabilities: [],
  relatedRoleFamilies: [],
  sourceNotes: [],
  version,
});

const cleanProfiles = () => [
  profile("operations-role", "Operations", [requirement("delivery", "Delivery"), requirement("automation", "Automation")]),
  profile("automation-role", "Operations", [requirement("automation", "Automation")]),
  profile("insight-role", "Insight", [requirement("research", "Research")]),
];

const expectIssue = (profiles: readonly RoleCapabilityProfile[], code: string) => {
  const result = adaptRoleCapabilityProfilesToCareerMapDefinitions(profiles);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((item) => item.code === code), JSON.stringify(result.issues));
  assert.equal("definitions" in result, false);
  return result;
};

assert.equal(CAREER_MAP_CAPABILITY_DEFINITION_ADAPTER_VERSION, "1.0.0");
expectIssue([], "empty_profile_set");

const clean = adaptRoleCapabilityProfilesToCareerMapDefinitions(cleanProfiles());
assert.equal(clean.ok, true);
if (!clean.ok) throw new Error(JSON.stringify(clean.issues));
assert.equal(clean.definitionVersion, "role-capability-definitions/2.0.0/adapter-1.0.0");
assert.deepEqual(clean.definitions, [
  { id: "research", label: "Research", family: "Insight" },
  { id: "automation", label: "Automation", family: "Operations" },
  { id: "delivery", label: "Delivery", family: "Operations" },
]);
assert.deepEqual([clean.sourceProfileCount, clean.sourceCapabilityReferenceCount, clean.uniqueCapabilityCount, clean.warnings.length], [3, 4, 3, 0]);
assert.deepEqual(JSON.parse(JSON.stringify(clean)), clean);

const changedVersion = adaptRoleCapabilityProfilesToCareerMapDefinitions(cleanProfiles().map((item) => ({ ...item, version: "2.1.0" })));
assert.equal(changedVersion.ok, true);
if (changedVersion.ok) assert.notEqual(changedVersion.definitionVersion, clean.definitionVersion);
expectIssue([cleanProfiles()[0], { ...cleanProfiles()[1], version: "3.0.0" }], "profile_version_mismatch");

expectIssue([
  profile("one", "Operations", [requirement("shared", "Shared")]),
  profile("two", "Operations", [requirement("shared", "Different")]),
], "capability_identity_conflict");
expectIssue([
  profile("one", "Operations", [requirement("shared", "Shared")]),
  profile("two", "Engineering", [requirement("shared", "Shared")]),
], "capability_family_conflict");
const combinedConflict = expectIssue([
  profile("one", "Operations", [requirement("shared", "Shared")]),
  profile("two", "Engineering", [requirement("shared", "Different")]),
], "capability_identity_conflict");
if (!combinedConflict.ok) assert.ok(combinedConflict.issues.some((item) => item.code === "capability_family_conflict"));
expectIssue([
  profile("one", "Operations", [requirement("one", "Shared")]),
  profile("two", "Operations", [requirement("two", "Shared")]),
], "capability_label_conflict");

expectIssue([profile("invalid-id", "Operations", [requirement(" ", "Label")])], "invalid_capability_id");
expectIssue([profile("invalid-label", "Operations", [requirement("capability", " ")])], "invalid_capability_label");
expectIssue([profile("invalid-family", " ", [requirement("capability", "Label")])], "invalid_capability_family");

const originalProfiles = cleanProfiles();
const before = JSON.stringify(originalProfiles);
const deterministicA = adaptRoleCapabilityProfilesToCareerMapDefinitions(originalProfiles);
const deterministicB = adaptRoleCapabilityProfilesToCareerMapDefinitions(originalProfiles);
assert.deepEqual(deterministicA, deterministicB);
assert.equal(JSON.stringify(deterministicA), JSON.stringify(deterministicB));
assert.equal(JSON.stringify(originalProfiles), before);
assert.deepEqual(deterministicA, adaptRoleCapabilityProfilesToCareerMapDefinitions([...originalProfiles].reverse()));
const reversedRequirements = originalProfiles.map((item) => ({
  ...item,
  mustHaveCapabilities: [...item.mustHaveCapabilities].reverse(),
  shouldHaveCapabilities: [...item.shouldHaveCapabilities].reverse(),
  differentiatingCapabilities: [...item.differentiatingCapabilities].reverse(),
}));
assert.deepEqual(deterministicA, adaptRoleCapabilityProfilesToCareerMapDefinitions(reversedRequirements));

const issueOrderA = adaptRoleCapabilityProfilesToCareerMapDefinitions([
  profile("bad-b", " ", [requirement("same", "Second")]),
  profile("bad-a", "Family", [requirement("same", "First"), requirement(" ", " ")]),
]);
const issueOrderB = adaptRoleCapabilityProfilesToCareerMapDefinitions([
  profile("bad-a", "Family", [requirement(" ", " "), requirement("same", "First")]),
  profile("bad-b", " ", [requirement("same", "Second")]),
]);
assert.deepEqual(issueOrderA, issueOrderB);

const fixtureResult = adaptRoleCapabilityProfilesToCareerMapDefinitions(roleCapabilityProfiles);
assert.equal(fixtureResult.ok, false);
if (!fixtureResult.ok) {
  const peopleIssues = fixtureResult.issues.filter((item) => item.message.includes("people-leadership"));
  assert.ok(peopleIssues.some((item) => item.code === "capability_identity_conflict"));
  assert.ok(peopleIssues.some((item) => item.code === "capability_family_conflict"));
  assert.equal(JSON.stringify(fixtureResult).includes("Engineering People Leadership"), false);
  assert.equal(JSON.stringify(fixtureResult).includes('"definitions"'), false);
}

const bundle = structuredClone(exampleResumeEvidence);
bundle.capabilityMappings = [];
const session: ResumeEvidenceReviewSession = {
  schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  id: "taxonomy-compatibility",
  sourceBundleId: bundle.id,
  sourceSchemaVersion: bundle.schemaVersion,
  capabilityDefinitionVersion: clean.definitionVersion,
  status: "not_started",
  decisions: [{
    id: "review:taxonomy-compatibility:decision:1",
    sequence: 1,
    actor: "user",
    targetType: "evidence_capability_mapping",
    action: "create",
    targetEvidenceId: "evidence-3",
    newMappingId: "review:taxonomy-compatibility:mapping:1",
    capabilityId: "automation",
    relationship: "direct_evidence",
    sourceSpanIds: ["span-3"],
    expectedEvidenceReviewStatus: "confirmed",
    expectedMappingState: "absent",
  }],
  warnings: [],
};
const compatible = applyResumeEvidenceReviewDecisions({
  bundle,
  session,
  capabilityDefinitions: clean.definitions,
  capabilityDefinitionVersion: clean.definitionVersion,
});
assert.equal(compatible.ok, true, compatible.ok ? undefined : JSON.stringify(compatible.issues));

console.log("career-map-capability-definition-adapter.test passed");
