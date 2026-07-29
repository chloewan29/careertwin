import assert from "node:assert/strict";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import { buildCareerMapCapabilityDefinitionsFromCanonicalLibrary } from "../../lib/career-possibility/canonical-capability-definition-adapter";

const build = () => buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: canonicalCapabilityLibrary, familyLibrary: canonicalCapabilityFamilyLibrary });
const result = build();
assert.equal(result.ok, true);
if (!result.ok) throw new Error(JSON.stringify(result.issues));
assert.equal(result.definitions.length, 51);
assert.deepEqual(result.definitions.map(({ id }) => id), canonicalCapabilityLibrary.capabilities.map(({ id }) => id));
assert.deepEqual(result.definitions.map(({ label }) => label), canonicalCapabilityLibrary.capabilities.map(({ label }) => label));
assert.equal(result.definitions.filter(({ id }) => id === "people-leadership").length, 1);
assert.deepEqual(result.definitions.find(({ id }) => id === "people-leadership"), { id: "people-leadership", label: "People Leadership", family: "Leadership" });
assert.equal(result.definitions.some(({ id }) => id === "matter-management"), false);
assert.match(result.definitionVersion, /capability-schema-1\.0\.0\/capability-content-1\.2\.0\/family-schema-1\.0\.0\/family-content-1\.0\.0\/adapter-1\.0\.0$/);
assert.deepEqual(build(), result);
assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
assert.equal(Object.isFrozen(result.definitions), true);

const changedCapabilityVersion = buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: { ...canonicalCapabilityLibrary, contentVersion: "9.9.9" }, familyLibrary: canonicalCapabilityFamilyLibrary });
assert.equal(changedCapabilityVersion.ok && changedCapabilityVersion.definitionVersion !== result.definitionVersion, true);
const changedFamilyVersion = buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: canonicalCapabilityLibrary, familyLibrary: { ...canonicalCapabilityFamilyLibrary, contentVersion: "9.9.9" } });
assert.equal(changedFamilyVersion.ok && changedFamilyVersion.definitionVersion !== result.definitionVersion, true);
assert.equal(buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: { ...canonicalCapabilityLibrary, schemaVersion: "9.0.0" }, familyLibrary: canonicalCapabilityFamilyLibrary }).ok, false);
assert.equal(buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: canonicalCapabilityLibrary, familyLibrary: { ...canonicalCapabilityFamilyLibrary, schemaVersion: "9.0.0" } }).ok, false);
const invalidMembership = { ...canonicalCapabilityLibrary, capabilities: [{ id: "unknown-family-capability", label: "Unknown Family Capability", family: "Unknown family" }] };
const invalidMembershipResult = buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: invalidMembership, familyLibrary: canonicalCapabilityFamilyLibrary });
assert.equal(invalidMembershipResult.ok, false);
if (!invalidMembershipResult.ok) assert.equal(invalidMembershipResult.issues[0].code, "invalid_family_membership");

console.log("canonical capability definition adapter tests passed");
