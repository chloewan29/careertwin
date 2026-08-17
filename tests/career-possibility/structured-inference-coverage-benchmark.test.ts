import assert from "node:assert/strict";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import { CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, CAREER_CAPABILITY_STRUCTURED_INFERENCE_VALIDATOR_VERSION } from "../../lib/career-possibility/career-capability-structured-inference-contract";
import { evaluateStructuredInferenceCoverage, STRUCTURED_INFERENCE_COVERAGE_BENCHMARK_VERSION, structuredInferenceCoverageFixtures } from "./fixtures/structured-inference-coverage-benchmark";

const canonicalIds = new Set(canonicalCapabilityLibrary.capabilities.map((item) => item.id));
const fixtureIds = new Set<string>();
const representedFamilies = new Set<string>();
const difficultyCounts = new Map<string, number>();
const archetypeCounts = new Map<string, number>();
for (const fixture of structuredInferenceCoverageFixtures) {
  assert.ok(!fixtureIds.has(fixture.fixtureId), `duplicate fixture ${fixture.fixtureId}`);
  fixtureIds.add(fixture.fixtureId);
  const required = new Set(fixture.requiredCanonicalCapabilityIds);
  const optional = new Set(fixture.allowedOptionalCanonicalCapabilityIds);
  for (const id of [...required, ...optional, ...fixture.forbiddenCanonicalCapabilityIds]) assert.ok(canonicalIds.has(id), `${fixture.fixtureId}: unknown ${id}`);
  for (const id of optional) assert.ok(!required.has(id), `${fixture.fixtureId}: required/optional overlap ${id}`);
  for (const id of fixture.forbiddenCanonicalCapabilityIds) assert.ok(!required.has(id) && !optional.has(id), `${fixture.fixtureId}: allowed/forbidden overlap ${id}`);
  assert.equal(fixture.zeroProposalExpected, required.size === 0);
  assert.equal(fixture.multiCapabilityExpected, required.size > 1);
  difficultyCounts.set(fixture.difficultyLevel, (difficultyCounts.get(fixture.difficultyLevel) ?? 0) + 1);
  archetypeCounts.set(fixture.primaryFailureClass, (archetypeCounts.get(fixture.primaryFailureClass) ?? 0) + 1);
  if (fixture.difficultyLevel === "LEVEL_3_OVERSHADOWED") {
    assert.ok(fixture.requiredCapabilityRationales, `${fixture.fixtureId}: Level 3 rationale map required`);
    assert.deepEqual(Object.keys(fixture.requiredCapabilityRationales ?? {}).sort(), [...required].sort(), `${fixture.fixtureId}: rationale keys must equal required IDs`);
    for (const rationale of Object.values(fixture.requiredCapabilityRationales ?? {})) assert.ok(rationale.trim().length >= 40, `${fixture.fixtureId}: rationale is not independently defensible`);
  }
  for (const id of required) representedFamilies.add(canonicalCapabilityLibrary.capabilities.find((item) => item.id === id)!.family);
}
assert.deepEqual([...representedFamilies].sort(), canonicalCapabilityFamilyLibrary.families.map((item) => item.label).sort());
assert.ok((difficultyCounts.get("LEVEL_1_EXPLICIT") ?? 0) >= 5);
assert.ok((difficultyCounts.get("LEVEL_2_IMPLICIT_CLEAR") ?? 0) >= 10);
assert.ok((difficultyCounts.get("LEVEL_3_OVERSHADOWED") ?? 0) >= 10);
assert.ok((archetypeCounts.get("dominant_dimension_overshadowing") ?? 0) >= 6);
assert.ok((archetypeCounts.get("adversarial_keyword_trap") ?? 0) >= 6);
assert.equal(STRUCTURED_INFERENCE_COVERAGE_BENCHMARK_VERSION, "structured-inference-coverage-benchmark/2.1.0");

const ratifiedDispositions = [
  ["l2-analyst-workspace", "analytics-governance"],
  ["l2-university-joint-programme", "commercial-partnerships"],
  ["adv-transformation-context", "service-performance"],
] as const;
for (const [fixtureId, capabilityId] of ratifiedDispositions) {
  const ratified = structuredInferenceCoverageFixtures.find((item) => item.fixtureId === fixtureId);
  assert.ok(ratified, `missing ratified fixture ${fixtureId}`);
  assert.equal(ratified.allowedOptionalCanonicalCapabilityIds.includes(capabilityId), false, `${fixtureId}: ${capabilityId} must not remain optional`);
  assert.equal(ratified.forbiddenCanonicalCapabilityIds.includes(capabilityId), true, `${fixtureId}: ${capabilityId} must be forbidden`);
}

const response = Object.freeze({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, results: Object.freeze([
  Object.freeze({ evidenceId: "l1-demand-forecast", capabilityAssessments: Object.freeze([{ capabilityId: "forecasting", supportAssessment: "directly_supported" as const, groundingRationale: "Synthetic test rationale." }]) }),
  Object.freeze({ evidenceId: "adv-control-compliance", capabilityAssessments: Object.freeze([]) }),
]) });
const validation = Object.freeze({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, validatorVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_VALIDATOR_VERSION, validEvidenceResults: response.results, rejectedEvidenceResults: Object.freeze([]), responseIssues: Object.freeze([]) });
const evaluated = evaluateStructuredInferenceCoverage({ fixtures: structuredInferenceCoverageFixtures, response, validation, canonicalCapabilities: canonicalCapabilityLibrary.capabilities });
assert.ok(evaluated.metrics.requiredRecall > 0 && evaluated.metrics.requiredRecall < 1);
assert.equal(evaluated.metrics.evidenceLinkValidity, 1);
assert.equal(evaluated.metrics.unknownCanonicalIdCount, 0);
assert.equal(evaluated.metrics.duplicateMappingCount, 0);
assert.ok(evaluated.metrics.requiredRecallByDifficulty.LEVEL_1_EXPLICIT > 0);
assert.equal(evaluated.metrics.requiredRecallByDifficulty.LEVEL_3_OVERSHADOWED, 0);
assert.equal(evaluated.fixtureResults.find((item) => item.fixtureId === "l1-demand-forecast")?.missingRequiredIds.length, 0);
console.log("structured inference coverage benchmark tests passed");
