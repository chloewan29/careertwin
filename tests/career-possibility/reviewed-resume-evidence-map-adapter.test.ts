import { strict as assert } from "node:assert";
import { validateCareerCapabilityMapPresentation } from "../../lib/career-possibility/career-capability-map-contract";
import { exampleResumeEvidence } from "../../lib/career-possibility/fixtures/exampleResumeEvidence";
import {
  DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY,
  REVIEWED_RESUME_EVIDENCE_MAP_ADAPTER_VERSION,
  adaptReviewedResumeEvidenceToCareerMap,
  type CareerMapCapabilityDefinition,
} from "../../lib/career-possibility/reviewed-resume-evidence-map-adapter";

const definitions = [
  { id: "automation", label: "Automation", family: "Delivery" },
  { id: "stakeholder-coordination", label: "Stakeholder coordination", family: "Collaboration" },
  { id: "customer-insight", label: "Customer insight", family: "Insight" },
] as const satisfies readonly CareerMapCapabilityDefinition[];
const adapt = (bundle = structuredClone(exampleResumeEvidence), capabilityDefinitions: readonly CareerMapCapabilityDefinition[] = definitions, policy = { ...DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY }) => adaptReviewedResumeEvidenceToCareerMap({ bundle, capabilityDefinitions, policy });
const success = adapt();
assert.equal(success.ok, true, success.ok ? undefined : JSON.stringify(success.issues));
if (!success.ok) throw new Error("Fixture adaptation failed");
const presentation = success.presentation;
assert.equal(validateCareerCapabilityMapPresentation(presentation).valid, true);
assert.equal(presentation.source.mappingVersion, REVIEWED_RESUME_EVIDENCE_MAP_ADAPTER_VERSION);
assert.equal(presentation.analysisStatus, "review_required");
assert.deepEqual(presentation.futureDirections, []);
assert.equal(presentation.profileSummary, undefined);
assert.equal(presentation.featureAvailability.pathComparison.available, false);
assert.equal(presentation.featureAvailability.transferableIdentity.available, false);
assert.equal(presentation.featureAvailability.evidenceDetail.available, true);

const evidence1 = presentation.evidenceCards.find((item) => item.id === "evidence-1")!;
const evidence2 = presentation.evidenceCards.find((item) => item.id === "evidence-2")!;
const evidence3 = presentation.evidenceCards.find((item) => item.id === "evidence-3")!;
const evidence4 = presentation.evidenceCards.find((item) => item.id === "evidence-4")!;
assert.equal(evidence1.active, true);
assert.equal(evidence1.capabilitySignals[0].type, "evidence_backed");
assert.equal(evidence1.capabilitySignals[0].active, true);
assert.equal(evidence2.capabilitySignals[0].type, "transferable");
assert.equal(evidence2.capabilitySignals[0].active, true);
assert.equal(evidence3.capabilitySignals.some((item) => item.type === "review_required" && !item.active), true);
assert.equal(evidence3.capabilitySignals.some((item) => item.type === "unmapped" && !item.active), true);
assert.equal(evidence4.active, false);
assert.equal(presentation.issues.some((item) => item.code === "rejected_mapping_inactive"), true);

{
  const mixed = structuredClone(exampleResumeEvidence);
  mixed.capabilityMappings.push({ id: "mapping-rejected-audit", evidenceId: "evidence-2", capabilityId: "stakeholder-coordination", relationship: "possible", method: "model", sourceSpanIds: ["span-2"], reviewStatus: "rejected" });
  const result = adapt(mixed);
  assert.equal(result.ok, true);
  if (result.ok) {
    const card = result.presentation.evidenceCards.find((item) => item.id === "evidence-2")!;
    assert.equal(card.active, true);
    assert.equal(card.capabilitySignals.some((item) => item.active && item.type === "transferable"), true);
    assert.equal(card.capabilitySignals.some((item) => !item.active && item.type === "possible" && item.reviewStatus === "rejected"), true);
    assert.equal(validateCareerCapabilityMapPresentation(result.presentation).valid, true);
  }
}

{
  const possible = structuredClone(exampleResumeEvidence);
  possible.capabilityMappings.push({ id: "mapping-possible", evidenceId: "evidence-4", capabilityId: "automation", relationship: "possible", method: "user", sourceSpanIds: ["span-4"], reviewStatus: "confirmed" });
  const result = adapt(possible);
  assert.equal(result.ok, true);
  if (result.ok) {
    const signal = result.presentation.evidenceCards.find((item) => item.id === "evidence-4")?.capabilitySignals.find((item) => item.type === "possible");
    assert.equal(signal?.active, false);
    assert.equal(signal?.reviewStatus, "confirmed");
  }
}

{
  const invalid = structuredClone(exampleResumeEvidence);
  invalid.sourceSpans[0].documentId = "missing";
  assert.equal(adapt(invalid).ok, false);
  assert.equal(adapt(invalid).ok ? false : adapt(invalid).issues.some((item) => item.code === "invalid_source_bundle"), true);
}
assert.equal(adapt(undefined, [...definitions, definitions[0]]).ok, false);
assert.equal(adapt(undefined, [{ id: "", label: "Broken" }]).ok, false);
{
  const unknown = structuredClone(exampleResumeEvidence);
  unknown.capabilityMappings[0].capabilityId = "unknown";
  assert.equal(adapt(unknown).ok, false);
}

{
  const edited = structuredClone(exampleResumeEvidence);
  edited.capabilityMappings[0].reviewStatus = "edited";
  edited.evidenceRecords[0].reviewStatus = "edited";
  const result = adapt(edited);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.presentation.evidenceCards[0].capabilitySignals[0].reviewStatus, "edited");
    assert.equal(result.presentation.evidenceCards[0].capabilitySignals[0].active, true);
    assert.equal(result.presentation.capabilities.find((item) => item.id === "automation")?.reviewStatus, "edited");
  }
}
{
  const edited = structuredClone(exampleResumeEvidence);
  edited.capabilityMappings[1].reviewStatus = "edited";
  const result = adapt(edited);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.presentation.evidenceCards.find((item) => item.id === "evidence-2")?.capabilitySignals[0].reviewStatus, "edited");
}

{
  const model = structuredClone(exampleResumeEvidence);
  model.capabilityMappings[2].reviewStatus = "confirmed";
  const excluded = adapt(model);
  assert.equal(excluded.ok, true);
  if (excluded.ok) {
    const signal = excluded.presentation.evidenceCards.find((item) => item.id === "evidence-3")?.capabilitySignals.find((item) => item.capabilityId === "customer-insight");
    assert.equal(signal?.active, false);
    assert.equal(signal?.mappingMethod, "model");
    assert.equal(excluded.presentation.issues.some((item) => item.code === "confirmed_model_mapping_excluded_by_policy"), true);
  }
  const allowed = adapt(model, definitions, { ...DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY, allowConfirmedModelMappings: true });
  assert.equal(allowed.ok, true);
  if (allowed.ok) {
    const signal = allowed.presentation.evidenceCards.find((item) => item.id === "evidence-3")?.capabilitySignals.find((item) => item.capabilityId === "customer-insight");
    assert.equal(signal?.active, true);
    assert.equal(signal?.type, "transferable");
    assert.equal(signal?.mappingMethod, "model");
  }
}

{
  const duplicate = structuredClone(exampleResumeEvidence);
  duplicate.capabilityMappings.push({ ...structuredClone(duplicate.capabilityMappings[0]), id: "mapping-duplicate" });
  const result = adapt(duplicate);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.presentation.reviewSummary.confirmedDirectMappingCount, 1);
    assert.equal(result.presentation.issues.some((item) => item.code === "duplicate_mapping"), true);
  }
}
{
  const conflict = structuredClone(exampleResumeEvidence);
  conflict.capabilityMappings.push({ ...structuredClone(conflict.capabilityMappings[0]), id: "mapping-conflict", relationship: "transferable_signal" });
  const result = adapt(conflict);
  assert.equal(result.ok, true);
  if (result.ok) {
    const signals = result.presentation.evidenceCards[0].capabilitySignals.filter((item) => item.capabilityId === "automation" && item.active);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].type, "evidence_backed");
    assert.equal(result.presentation.issues.some((item) => item.code === "conflicting_mapping_relationship"), true);
  }
}

assert.deepEqual(presentation.reviewSummary, {
  activeEvidenceCount: 3,
  inactiveEvidenceCount: 1,
  confirmedDirectMappingCount: 1,
  confirmedTransferableMappingCount: 1,
  reviewRequiredMappingCount: 1,
  rejectedMappingCount: 1,
  unmappedEvidenceCount: 1,
  proposedCapabilityCount: 1,
});
assert.equal(presentation.capabilities.find((item) => item.id === "automation")?.evidenceBasis.coverage, "single_source");
assert.equal(presentation.capabilities.find((item) => item.id === "customer-insight")?.reviewStatus, "unreviewed");
{
  const omitted = adapt(undefined, definitions, { ...DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY, includeReviewRequiredSignals: false });
  assert.equal(omitted.ok, true);
  if (omitted.ok) assert.equal(omitted.presentation.capabilities.some((item) => item.id === "customer-insight"), false);
}
{
  const reviewedBundle = structuredClone(exampleResumeEvidence);
  reviewedBundle.capabilityMappings = reviewedBundle.capabilityMappings.filter((item) => item.id !== "mapping-3" && item.id !== "mapping-5");
  const result = adapt(reviewedBundle);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.presentation.analysisStatus, "provisional");
}

{
  const multi = structuredClone(exampleResumeEvidence);
  multi.capabilityMappings.push({ id: "mapping-multi", evidenceId: "evidence-2", capabilityId: "automation", relationship: "direct_evidence", method: "user", sourceSpanIds: ["span-1", "span-2"], reviewStatus: "confirmed" });
  const result = adapt(multi);
  assert.equal(result.ok, true);
  if (result.ok) {
    const node = result.presentation.capabilities.find((item) => item.id === "automation")!;
    assert.equal(node.evidenceBasis.distinctEvidenceCount, 2);
    assert.equal(node.evidenceBasis.distinctEmploymentCount, 1);
    assert.equal(node.evidenceBasis.coverage, "multi_evidence");
    assert.equal(node.evidenceBasis.sourceSpanCount, 2);
  }
  multi.capabilityMappings.push({ id: "mapping-context", evidenceId: "evidence-3", capabilityId: "automation", relationship: "direct_evidence", method: "user", sourceSpanIds: ["span-3"], reviewStatus: "confirmed" });
  const context = adapt(multi);
  assert.equal(context.ok, true);
  if (context.ok) assert.equal(context.presentation.capabilities.find((item) => item.id === "automation")?.evidenceBasis.coverage, "multi_context");
}

assert.equal(JSON.stringify(presentation).includes("exampleStrength"), false);
assert.equal(JSON.stringify(presentation).includes("exampleFitScore"), false);
assert.equal(JSON.stringify(presentation).includes("roleIds"), false);
assert.equal(JSON.stringify(presentation).includes("relevance"), false);
const bundleBefore = JSON.stringify(exampleResumeEvidence);
const definitionsBefore = JSON.stringify(definitions);
adaptReviewedResumeEvidenceToCareerMap({ bundle: exampleResumeEvidence, capabilityDefinitions: definitions });
assert.equal(JSON.stringify(exampleResumeEvidence), bundleBefore);
assert.equal(JSON.stringify(definitions), definitionsBefore);
const deterministicA = adapt();
const deterministicB = adapt();
assert.deepEqual(deterministicA, deterministicB);
assert.deepEqual(JSON.parse(JSON.stringify(presentation)), presentation);

console.log("reviewed-resume-evidence-map-adapter.test passed");
