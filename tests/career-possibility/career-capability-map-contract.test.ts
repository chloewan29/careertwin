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
  assert.ok(codes(value).includes("active_signal_requires_reviewed_status"));
}

{
  const value = cloneFixture();
  value.evidenceCards[1].capabilitySignals[1].active = true;
  assert.ok(codes(value).includes("rejected_signal_must_be_inactive"));
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

const addUserInterpretation = (value: CareerCapabilityMapPresentation, reviewStatus: "unreviewed" | "confirmed" | "edited" | "rejected", active: boolean, sourceSpanIds: string[] = []) => {
  value.interpretations.push({ id: `user-interpretation-${reviewStatus}-${active}`, evidenceId: value.evidenceCards[0].id, kind: "transferability", text: "A user-authored interpretation.", provenance: "user_provided", reviewStatus, sourceSpanIds, active });
};

{
  const value = cloneFixture();
  addUserInterpretation(value, "unreviewed", false);
  assert.equal(validateCareerCapabilityMapPresentation(value).valid, true, "Inactive user interpretations may remain drafts without source spans.");
  assert.equal(value.featureAvailability.transferableIdentity.available, false);
}

for (const reviewStatus of ["edited", "confirmed"] as const) {
  const value = cloneFixture();
  addUserInterpretation(value, reviewStatus, true);
  assert.equal(validateCareerCapabilityMapPresentation(value).valid, true, `Active ${reviewStatus} user interpretation should validate in résumé-derived mode.`);
  assert.equal(value.featureAvailability.transferableIdentity.available, false, "Eligible interpretation data must not automatically enable a feature.");
}

{
  const value = cloneFixture();
  addUserInterpretation(value, "unreviewed", true, ["span-workshop"]);
  assert.ok(codes(value).includes("active_interpretation_requires_reviewed_status"));
}

{
  const value = cloneFixture();
  addUserInterpretation(value, "rejected", true, ["span-workshop"]);
  assert.ok(codes(value).includes("active_rejected_interpretation"));
}

{
  const value = cloneFixture();
  assert.equal(value.interpretations.some((item) => item.provenance === "model_inferred"), true);
  value.interpretations.push({ id: "deterministic-interpretation", evidenceId: value.evidenceCards[0].id, kind: "context_inference", text: "A deterministic interpretation.", provenance: "deterministically_derived", reviewStatus: "confirmed", sourceSpanIds: ["span-workshop"], active: true });
  assert.equal(validateCareerCapabilityMapPresentation(value).valid, true, "Existing model and deterministic interpretation behavior remains valid.");
}

{
  const value = cloneFixture();
  value.interpretations.push({ id: "mock-interpretation", evidenceId: value.evidenceCards[0].id, kind: "context_inference", text: "A mock interpretation.", provenance: "mock", reviewStatus: "confirmed", sourceSpanIds: ["span-workshop"], active: true });
  assert.ok(codes(value).includes("mock_provenance"), "Mock interpretation provenance remains forbidden in résumé-derived mode.");
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
  const value = cloneFixture();
  assert.equal(validateCareerCapabilityMapPresentation(value).valid, true, "An active card may retain an inactive rejected signal.");
  assert.equal(canDisplayCapabilityAsTransferable(value.capabilities[1], value.evidenceCards), true, "Rejected audit state must not contaminate valid truth.");
}

{
  const value = cloneFixture();
  value.capabilities[0].reviewStatus = "edited";
  value.evidenceCards[0].capabilitySignals[0].reviewStatus = "edited";
  assert.equal(validateCareerCapabilityMapPresentation(value).valid, true);
  assert.equal(canDisplayCapabilityAsEvidenceBacked(value.capabilities[0], value.evidenceCards), true);
}

assert.equal(canDisplayCapabilityAsTransferable(transferableNode, exampleResumeDerivedCareerMap.evidenceCards), true, "Edited transferable truth remains active.");

{
  const value = cloneFixture();
  value.capabilities[1].reviewStatus = "confirmed";
  value.evidenceCards[1].capabilitySignals[0].reviewStatus = "confirmed";
  assert.equal(validateCareerCapabilityMapPresentation(value).valid, true);
  assert.equal(canDisplayCapabilityAsTransferable(value.capabilities[1], value.evidenceCards), true);
}

{
  const value = cloneFixture();
  value.evidenceCards[0].capabilitySignals[0].active = false;
  assert.equal(canDisplayCapabilityAsEvidenceBacked(value.capabilities[0], value.evidenceCards), false);
  assert.ok(codes(value).includes("missing_direct_signal"));
}

{
  const value = cloneFixture();
  value.evidenceCards[1].capabilitySignals[0].active = false;
  assert.equal(canDisplayCapabilityAsTransferable(value.capabilities[1], value.evidenceCards), false);
  assert.ok(codes(value).includes("missing_transferable_signal"));
}

{
  const value = cloneFixture();
  value.evidenceCards[2].capabilitySignals[0].active = true;
  assert.ok(codes(value).includes("review_required_signal_must_be_inactive"));
}

{
  const value = cloneFixture();
  value.evidenceCards[1].capabilitySignals[1].reviewStatus = "confirmed";
  value.evidenceCards[1].capabilitySignals[1].active = true;
  assert.ok(codes(value).includes("possible_signal_must_be_inactive"));
}

{
  const value = cloneFixture();
  value.evidenceCards[2].capabilitySignals[1].active = true;
  assert.ok(codes(value).includes("unmapped_signal_must_be_inactive"));
}

{
  const value = cloneFixture();
  value.evidenceCards[0].active = false;
  assert.ok(codes(value).includes("active_signal_requires_active_evidence"));
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
