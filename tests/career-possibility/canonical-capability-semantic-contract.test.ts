import assert from "node:assert/strict";
import {
  canonicalCapabilityLibrary,
  serializeCanonicalCapabilitySemanticContext,
  validateCanonicalCapabilityLibrary,
} from "../../lib/career-possibility/canonical-capability-library";
import { MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE } from "../../lib/career-possibility/career-capability-structured-inference-contract";
import { roleCapabilityProfiles } from "../../lib/career-possibility/fixtures/roleCapabilityProfiles";
import {
  STRUCTURED_INFERENCE_COVERAGE_BENCHMARK_VERSION,
  structuredInferenceCoverageFixtures,
} from "./fixtures/structured-inference-coverage-benchmark";

const capabilities = canonicalCapabilityLibrary.capabilities;
const canonicalIds = new Set(capabilities.map((capability) => capability.id));
assert.equal(capabilities.length, 51);
assert.equal(canonicalIds.size, 51);
assert.equal(validateCanonicalCapabilityLibrary(canonicalCapabilityLibrary).ok, true);

let distinctionCount = 0;
for (const capability of capabilities) {
  const contract = capability.semanticContract;
  assert.ok(contract, `${capability.id}: semantic contract is required`);
  assert.ok(contract.definition.trim().length > 0, `${capability.id}: definition is required`);
  assert.ok(contract.positiveEvidence.length >= 2 && contract.positiveEvidence.length <= 4, `${capability.id}: positive evidence must be concise`);
  assert.ok(contract.notSufficient.length >= 2 && contract.notSufficient.length <= 4, `${capability.id}: exclusions must be concise`);
  assert.ok(contract.distinctions.length >= 1, `${capability.id}: at least one meaningful neighbour is required`);
  assert.equal(new Set(contract.positiveEvidence).size, contract.positiveEvidence.length, `${capability.id}: duplicate positive evidence`);
  assert.equal(new Set(contract.notSufficient).size, contract.notSufficient.length, `${capability.id}: duplicate exclusion`);
  const neighbours = contract.distinctions.map((distinction) => distinction.capabilityId);
  assert.equal(new Set(neighbours).size, neighbours.length, `${capability.id}: duplicate neighbour`);
  for (const distinction of contract.distinctions) {
    assert.ok(canonicalIds.has(distinction.capabilityId), `${capability.id}: unknown neighbour ${distinction.capabilityId}`);
    assert.notEqual(distinction.capabilityId, capability.id, `${capability.id}: self distinction`);
    assert.ok(distinction.boundary.trim().length > 0, `${capability.id}: blank distinction boundary`);
  }
  distinctionCount += contract.distinctions.length;
  const evidenceGroundedText = [contract.definition, ...contract.positiveEvidence].join(" ");
  assert.doesNotMatch(evidenceGroundedText, /\b(?:job title|employer|qualification|career seniority|target role|founder identity)\b/i, `${capability.id}: contract requires forbidden contextual inference`);
  assert.doesNotMatch(JSON.stringify(contract), /\b(?:TBD|other relevant evidence|appropriate experience)\b/i, `${capability.id}: placeholder semantics`);
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.positiveEvidence), true);
  assert.equal(Object.isFrozen(contract.notSufficient), true);
  assert.equal(Object.isFrozen(contract.distinctions), true);
  assert.equal(contract.distinctions.every(Object.isFrozen), true);
}
assert.equal(capabilities.filter((capability) => (capability.semanticContract?.distinctions.length ?? 0) > 0).length, 51);
assert.ok(distinctionCount >= 75, `expected broad neighbour coverage, received ${distinctionCount}`);

const byId = new Map(capabilities.map((capability) => [capability.id, capability] as const));
const exclusions = (id: string) => byId.get(id)!.semanticContract!.notSufficient.join(" ");
assert.match(exclusions("analytics-governance"), /workspace/i);
assert.match(exclusions("analytics-governance"), /without standards, controls, definitions, quality, access, or decision rules/i);
assert.match(exclusions("commercial-partnerships"), /collaboration/i);
assert.match(exclusions("commercial-partnerships"), /without commercial value/i);
assert.match(exclusions("service-performance"), /transformation/i);
assert.match(exclusions("service-performance"), /without service-outcome responsibility/i);

const hasBoundary = (left: string, right: string) => byId.get(left)!.semanticContract!.distinctions.some((item) => item.capabilityId === right)
  || byId.get(right)!.semanticContract!.distinctions.some((item) => item.capabilityId === left);
const potentialDuplicatePairs = [
  ["operating-control", "risk-controls"],
  ["product-cadence", "operating-rhythm"],
  ["commercial-partnerships", "partner-strategy"],
] as const;
for (const [left, right] of potentialDuplicatePairs) assert.equal(hasBoundary(left, right), true, `${left}/${right}: duplicate-risk boundary missing`);

const crossFamilyAmbiguityPairs = [
  ["insight-synthesis", "strategic-analysis"],
  ["measurement-design", "investment-governance"],
  ["commercial-partnerships", "partner-strategy"],
  ["education-partnerships", "commercial-partnerships"],
  ["tooling-enablement", "change-leadership"],
  ["cross-functional-delivery", "change-leadership"],
  ["business-ownership", "operating-strategy"],
  ["operating-model", "organisation-design"],
  ["product-cadence", "operating-rhythm"],
  ["benefits-realisation", "service-performance"],
  ["customer-adoption", "tooling-enablement"],
  ["audience-insight", "product-insights"],
] as const;
for (const [left, right] of crossFamilyAmbiguityPairs) assert.equal(hasBoundary(left, right), true, `${left}/${right}: cross-family boundary missing`);

const roleCapabilityIds = new Set(roleCapabilityProfiles.flatMap((role) => [
  ...role.mustHaveCapabilities,
  ...role.shouldHaveCapabilities,
  ...role.differentiatingCapabilities,
].map((requirement) => requirement.capabilityId)));
assert.deepEqual(capabilities.filter((capability) => !roleCapabilityIds.has(capability.id)).map((capability) => capability.id), []);

assert.equal(STRUCTURED_INFERENCE_COVERAGE_BENCHMARK_VERSION, "structured-inference-coverage-benchmark/2.1.0");
assert.deepEqual({
  required: structuredInferenceCoverageFixtures.reduce((total, fixture) => total + fixture.requiredCanonicalCapabilityIds.length, 0),
  optional: structuredInferenceCoverageFixtures.reduce((total, fixture) => total + fixture.allowedOptionalCanonicalCapabilityIds.length, 0),
  forbidden: structuredInferenceCoverageFixtures.reduce((total, fixture) => total + fixture.forbiddenCanonicalCapabilityIds.length, 0),
}, { required: 42, optional: 26, forbidden: 89 });
assert.equal(MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE, 3);

const serialized = serializeCanonicalCapabilitySemanticContext(canonicalCapabilityLibrary);
const sizes = capabilities.map((capability) => JSON.stringify({ id: capability.id, label: capability.label, family: capability.family, ...capability.semanticContract }).length);
assert.equal(JSON.parse(serialized).length, 51);
assert.ok(serialized.length > 4_458);
assert.ok(Math.max(...sizes) < 2_000, "individual semantic contracts must remain compact");

const invalid = structuredClone(canonicalCapabilityLibrary) as unknown as {
  schemaVersion: string;
  contentVersion: string;
  capabilities: Array<{
    id: string;
    label: string;
    family: string;
    semanticContract: {
      definition: string;
      positiveEvidence: string[];
      notSufficient: string[];
      distinctions: Array<{ capabilityId: string; boundary: string }>;
    };
  }>;
};
invalid.capabilities[0].semanticContract!.distinctions[0].capabilityId = "unknown-capability";
assert.equal(validateCanonicalCapabilityLibrary(invalid).ok, false);

console.log(JSON.stringify({
  message: "canonical capability semantic contract tests passed",
  capabilities: capabilities.length,
  distinctionCount,
  serializedCharacters: serialized.length,
  approximateTokens: Math.ceil(serialized.length / 4),
  averageContractCharacters: Math.round(sizes.reduce((total, size) => total + size, 0) / sizes.length),
  minimumContractCharacters: Math.min(...sizes),
  maximumContractCharacters: Math.max(...sizes),
}));
