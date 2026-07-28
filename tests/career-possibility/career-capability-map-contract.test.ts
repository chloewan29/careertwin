import { strict as assert } from "node:assert";
import {
  canDisplayCapabilityAsEvidenceBacked,
  canDisplayCapabilityAsTransferable,
  validateCareerCapabilityMapPresentation,
  type CareerCapabilityMapPresentation,
} from "../../lib/career-possibility/career-capability-map-contract";
import {
  exampleResumeDerivedCareerMap,
  exampleResumeDerivedCareerMapValidation,
} from "../../lib/career-possibility/fixtures/exampleResumeDerivedCareerMap";

const cloneFixture = (): CareerCapabilityMapPresentation => structuredClone(exampleResumeDerivedCareerMap);
const codes = (value: CareerCapabilityMapPresentation) => validateCareerCapabilityMapPresentation(value).issues.map((issue) => issue.code);

assert.equal(exampleResumeDerivedCareerMapValidation.valid, true, JSON.stringify(exampleResumeDerivedCareerMapValidation.issues));

{
  const value = cloneFixture();
  value.capabilities[0].exampleStrength = 80;
  assert.ok(codes(value).includes("resume_example_strength"));
}

{
  const value = cloneFixture();
  value.futureDirections.push({ id: "direction-1", roleFamilyId: "role-1", roleFamily: "Service operations", status: "provisional", explanation: "A fictional direction.", evidenceBackedCapabilityIds: ["cap-stakeholder-alignment"], transferableCapabilityIds: [], missingCapabilityIds: [], supportingEvidenceCount: 1, exampleFitScore: 75, growthAreas: [] });
  assert.ok(codes(value).includes("resume_example_fit"));
}

{
  const value = cloneFixture();
  value.capabilities[0].provenance = "mock";
  assert.ok(codes(value).includes("mock_provenance"));
}

{
  const value = cloneFixture();
  delete value.source.sourceBundleId;
  assert.ok(codes(value).includes("missing_source_bundle"));
}

{
  const value = cloneFixture();
  value.evidenceCards[0].capabilitySignals[0].reviewStatus = "unreviewed";
  assert.ok(codes(value).includes("unreviewed_active_truth"));
}

{
  const value = cloneFixture();
  value.evidenceCards[3].active = true;
  assert.ok(codes(value).includes("active_rejected_evidence"));
}

{
  const value = cloneFixture();
  value.evidenceCards[2].capabilitySignals[1].type = "evidence_backed";
  assert.ok(codes(value).includes("proposed_active_truth"));
}

{
  const value = cloneFixture();
  value.featureAvailability.pathComparison = { available: true, status: "provisional" };
  assert.ok(codes(value).includes("path_comparison_dependency"));
}

{
  const value = cloneFixture();
  value.featureAvailability.transferableIdentity = { available: true, status: "provisional" };
  assert.ok(codes(value).includes("identity_interpretation_dependency"));
}

const directNode = exampleResumeDerivedCareerMap.capabilities[0];
const transferableNode = exampleResumeDerivedCareerMap.capabilities[1];
assert.equal(canDisplayCapabilityAsEvidenceBacked(directNode, exampleResumeDerivedCareerMap.evidenceCards), true);
assert.equal(canDisplayCapabilityAsEvidenceBacked(transferableNode, exampleResumeDerivedCareerMap.evidenceCards), false);
assert.equal(canDisplayCapabilityAsTransferable(transferableNode, exampleResumeDerivedCareerMap.evidenceCards), true);

{
  const value = cloneFixture();
  value.evidenceCards[0].capabilitySignals[0].reviewStatus = "unreviewed";
  value.evidenceCards[0].capabilitySignals[0].mappingMethod = "model";
  assert.equal(canDisplayCapabilityAsEvidenceBacked(value.capabilities[0], value.evidenceCards), false);
}

{
  const before = JSON.stringify(exampleResumeDerivedCareerMap);
  validateCareerCapabilityMapPresentation(exampleResumeDerivedCareerMap);
  assert.equal(JSON.stringify(exampleResumeDerivedCareerMap), before, "Validation must not mutate input.");
}

{
  const roundTrip = JSON.parse(JSON.stringify(exampleResumeDerivedCareerMap)) as CareerCapabilityMapPresentation;
  assert.deepEqual(roundTrip, exampleResumeDerivedCareerMap);
  assert.equal(validateCareerCapabilityMapPresentation(roundTrip).valid, true);
}

console.log("career-capability-map-contract.test passed");
