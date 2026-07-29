import { strict as assert } from "node:assert";
import {
  CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION,
  CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  canonicalCapabilityLibrary,
  serializeCanonicalCapabilityLibraryContent,
  validateCanonicalCapabilityLibrary,
  validateCanonicalCapabilityLibraryVersionTransition,
  type CanonicalCapabilityLibrary,
} from "../../lib/career-possibility/canonical-capability-library";
import { exampleResumeEvidence } from "../../lib/career-possibility/fixtures/exampleResumeEvidence";
import type { CareerMapCapabilityDefinition } from "../../lib/career-possibility/reviewed-resume-evidence-map-adapter";
import { applyResumeEvidenceReviewDecisions } from "../../lib/career-possibility/resume-evidence-review-apply";
import { RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION, type ResumeEvidenceReviewSession } from "../../lib/career-possibility/resume-evidence-review-contract";

const clone = (library: CanonicalCapabilityLibrary): CanonicalCapabilityLibrary => structuredClone(library);
const validLibrary = (capabilities: CanonicalCapabilityLibrary["capabilities"], contentVersion = "2.0.0"): CanonicalCapabilityLibrary => ({
  schemaVersion: CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  contentVersion,
  capabilities,
});
const expectValidationIssue = (library: CanonicalCapabilityLibrary, code: string) => {
  const result = validateCanonicalCapabilityLibrary(library);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some((item) => item.code === code), JSON.stringify(result.issues));
};
const expectTransitionFailure = (previous: CanonicalCapabilityLibrary, next: CanonicalCapabilityLibrary) => {
  const result = validateCanonicalCapabilityLibraryVersionTransition(previous, next);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0].code, "content_changed_without_version_change");
};

assert.equal(CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION, "1.0.0");
assert.equal(CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION, "1.0.0");
assert.equal(canonicalCapabilityLibrary.capabilities.length > 0, true);
const exportedValidation = validateCanonicalCapabilityLibrary(canonicalCapabilityLibrary);
assert.equal(exportedValidation.ok, true, exportedValidation.ok ? undefined : JSON.stringify(exportedValidation.issues));
assert.equal(Object.isFrozen(canonicalCapabilityLibrary), true);
assert.equal(Object.isFrozen(canonicalCapabilityLibrary.capabilities), true);

const people = canonicalCapabilityLibrary.capabilities.filter((item) => item.id === "people-leadership");
assert.equal(people.length, 1);
assert.deepEqual(people[0], { id: "people-leadership", label: "People Leadership", family: "Leadership" });
assert.equal(canonicalCapabilityLibrary.capabilities.some((item) => item.label === "Engineering People Leadership"), false);
assert.equal(canonicalCapabilityLibrary.capabilities.some((item) => item.id === "engineering-people-leadership"), false);

expectValidationIssue(validLibrary([]), "empty_capability_library");
expectValidationIssue(validLibrary([{ id: "Bad ID", label: "Valid", family: "Family" }]), "invalid_capability_id");
expectValidationIssue(validLibrary([{ id: " bad", label: "Valid", family: "Family" }]), "invalid_capability_id");
expectValidationIssue(validLibrary([{ id: "valid", label: "", family: "Family" }]), "invalid_capability_label");
expectValidationIssue(validLibrary([{ id: "valid", label: " Label", family: "Family" }]), "invalid_capability_label");
expectValidationIssue(validLibrary([{ id: "valid", label: "Label", family: "" }]), "invalid_capability_family");
expectValidationIssue(validLibrary([{ id: "valid", label: "Label", family: " Family" }]), "invalid_capability_family");
expectValidationIssue(validLibrary([
  { id: "duplicate", label: "First", family: "Family" },
  { id: "duplicate", label: "Second", family: "Family" },
]), "duplicate_capability_id");
expectValidationIssue(validLibrary([
  { id: "first", label: "Duplicate", family: "Family" },
  { id: "second", label: "Duplicate", family: "Family" },
]), "duplicate_capability_label");
expectValidationIssue(validLibrary([
  { id: "zeta", label: "Zeta", family: "Zulu" },
  { id: "alpha", label: "Alpha", family: "Alpha" },
]), "noncanonical_order");
expectValidationIssue({ ...clone(canonicalCapabilityLibrary), schemaVersion: "2.0.0" }, "invalid_schema_version");
expectValidationIssue({ ...clone(canonicalCapabilityLibrary), contentVersion: "release-one" }, "invalid_content_version");

const mutable = clone(canonicalCapabilityLibrary);
const before = JSON.stringify(mutable);
const validationA = validateCanonicalCapabilityLibrary(mutable);
const validationB = validateCanonicalCapabilityLibrary(mutable);
assert.deepEqual(validationA, validationB);
assert.equal(JSON.stringify(mutable), before);
assert.deepEqual(JSON.parse(JSON.stringify(canonicalCapabilityLibrary)), canonicalCapabilityLibrary);
assert.equal(serializeCanonicalCapabilityLibraryContent(mutable), serializeCanonicalCapabilityLibraryContent(mutable));

const previous = validLibrary([
  { id: "alpha", label: "Alpha", family: "Family" },
  { id: "beta", label: "Beta", family: "Family" },
]);
expectTransitionFailure(previous, validLibrary([
  { id: "alpha", label: "Alpha renamed", family: "Family" },
  { id: "beta", label: "Beta", family: "Family" },
]));
expectTransitionFailure(previous, validLibrary([
  { id: "alpha", label: "Alpha", family: "Changed family" },
  { id: "beta", label: "Beta", family: "Family" },
]));
expectTransitionFailure(previous, validLibrary([
  { id: "alpha", label: "Alpha", family: "Family" },
  { id: "beta", label: "Beta", family: "Family" },
  { id: "gamma", label: "Gamma", family: "Family" },
]));
expectTransitionFailure(previous, validLibrary([{ id: "alpha", label: "Alpha", family: "Family" }]));

const changedWithVersion = validateCanonicalCapabilityLibraryVersionTransition(previous, validLibrary([
  { id: "alpha", label: "Alpha renamed", family: "Family" },
  { id: "beta", label: "Beta", family: "Family" },
], "2.1.0"));
assert.deepEqual(changedWithVersion, { ok: true, warnings: [] });
const unchangedWithVersion = validateCanonicalCapabilityLibraryVersionTransition(previous, { ...previous, contentVersion: "2.1.0" });
assert.equal(unchangedWithVersion.ok, true);
if (unchangedWithVersion.ok) assert.equal(unchangedWithVersion.warnings[0].code, "content_unchanged_with_version_change");
const transitionBefore = JSON.stringify([previous, unchangedWithVersion]);
assert.deepEqual(
  validateCanonicalCapabilityLibraryVersionTransition(previous, { ...previous, contentVersion: "2.1.0" }),
  unchangedWithVersion,
);
assert.equal(JSON.stringify([previous, unchangedWithVersion]), transitionBefore);

const issueOrderLibrary = validLibrary([
  { id: "bad id", label: " Duplicate", family: " Family" },
  { id: "bad id", label: " Duplicate", family: " Family" },
]);
assert.deepEqual(validateCanonicalCapabilityLibrary(issueOrderLibrary), validateCanonicalCapabilityLibrary(issueOrderLibrary));

const definitions: readonly CareerMapCapabilityDefinition[] = canonicalCapabilityLibrary.capabilities;
const bundle = structuredClone(exampleResumeEvidence);
bundle.capabilityMappings = [];
const definitionVersion = `canonical-capability-library/${canonicalCapabilityLibrary.contentVersion}`;
const session: ResumeEvidenceReviewSession = {
  schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  id: "canonical-library-compatibility",
  sourceBundleId: bundle.id,
  sourceSchemaVersion: bundle.schemaVersion,
  capabilityDefinitionVersion: definitionVersion,
  status: "not_started",
  decisions: [{
    id: "review:canonical-library-compatibility:decision:1",
    sequence: 1,
    actor: "user",
    targetType: "evidence_capability_mapping",
    action: "create",
    targetEvidenceId: "evidence-3",
    newMappingId: "review:canonical-library-compatibility:mapping:1",
    capabilityId: "people-leadership",
    relationship: "direct_evidence",
    sourceSpanIds: ["span-3"],
    expectedEvidenceReviewStatus: "confirmed",
    expectedMappingState: "absent",
  }],
  warnings: [],
};
const compatible = applyResumeEvidenceReviewDecisions({ bundle, session, capabilityDefinitions: definitions, capabilityDefinitionVersion: definitionVersion });
assert.equal(compatible.ok, true, compatible.ok ? undefined : JSON.stringify(compatible.issues));

console.log("canonical-capability-library.test passed");
