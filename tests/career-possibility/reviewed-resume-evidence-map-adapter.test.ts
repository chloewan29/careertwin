import { strict as assert } from "node:assert";
import { validateCareerCapabilityMapPresentation } from "../../lib/career-possibility/career-capability-map-contract";
import { exampleResumeEvidence } from "../../lib/career-possibility/fixtures/exampleResumeEvidence";
import { validateResumeEvidenceBundle } from "../../lib/career-possibility/resume-evidence-contract";
import { applyResumeEvidenceReviewDecisions } from "../../lib/career-possibility/resume-evidence-review-apply";
import {
  RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  type CreateCapabilityMappingReviewDecision,
  type ResumeEvidenceReviewDecision,
  type ResumeEvidenceReviewSession,
} from "../../lib/career-possibility/resume-evidence-review-contract";
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
const capabilityDefinitionVersion = "fixture-capabilities/1";
const createdMapping = (relationship: CreateCapabilityMappingReviewDecision["relationship"] = "direct_evidence"): CreateCapabilityMappingReviewDecision => ({
  id: "create-adapter-mapping",
  sequence: 1,
  actor: "user",
  targetType: "evidence_capability_mapping",
  action: "create",
  targetEvidenceId: "evidence-3",
  newMappingId: "mapping-adapter-created",
  capabilityId: "automation",
  relationship,
  sourceSpanIds: ["span-3"],
  expectedEvidenceReviewStatus: "confirmed",
  expectedMappingState: "absent",
});
const applyCreatedMapping = (decisions: ResumeEvidenceReviewDecision[]) => {
  const bundle = structuredClone(exampleResumeEvidence);
  bundle.capabilityMappings = [];
  const session: ResumeEvidenceReviewSession = {
    schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
    id: "adapter-review-session",
    sourceBundleId: bundle.id,
    sourceSchemaVersion: bundle.schemaVersion,
    capabilityDefinitionVersion,
    status: "not_started",
    decisions,
    warnings: [],
  };
  return applyResumeEvidenceReviewDecisions({ bundle, session, capabilityDefinitions: definitions, capabilityDefinitionVersion });
};
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

for (const [relationship, signalType] of [["direct_evidence", "evidence_backed"], ["transferable_signal", "transferable"]] as const) {
  const reviewed = applyCreatedMapping([createdMapping(relationship)]);
  assert.equal(reviewed.ok, true);
  if (reviewed.ok) {
    const result = adapt(reviewed.reviewedBundle);
    assert.equal(result.ok, true);
    if (result.ok) {
      const signal = result.presentation.evidenceCards.find((item) => item.id === "evidence-3")?.capabilitySignals.find((item) => item.capabilityId === "automation");
      assert.deepEqual([signal?.type, signal?.active, signal?.mappingMethod, signal?.reviewStatus], [signalType, true, "user", "edited"]);
      assert.deepEqual(signal?.sourceSpanIds, ["span-3"]);
      assert.equal(result.presentation.analysisStatus, "provisional");
      assert.equal(validateCareerCapabilityMapPresentation(result.presentation).valid, true);
      assert.equal(JSON.stringify(result.presentation).includes("verified"), false);
    }
  }
}

{
  const create = createdMapping();
  const reject = { id: "reject-adapter-mapping", sequence: 2, actor: "user", targetType: "capability_mapping", targetId: create.newMappingId, action: "reject", expectedReviewStatus: "edited", priorDecisionId: create.id } as const;
  const rejected = applyCreatedMapping([create, reject]);
  assert.equal(rejected.ok, true);
  if (rejected.ok) {
    const result = adapt(rejected.reviewedBundle);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.presentation.evidenceCards.find((item) => item.id === "evidence-3")?.capabilitySignals.find((item) => item.capabilityId === "automation")?.active, false);
  }
  const restored = applyCreatedMapping([create, reject, { id: "restore-adapter-mapping", sequence: 3, actor: "user", targetType: "capability_mapping", targetId: create.newMappingId, action: "restore", expectedReviewStatus: "rejected", priorDecisionId: reject.id }]);
  assert.equal(restored.ok, true);
  if (restored.ok) {
    const result = adapt(restored.reviewedBundle);
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual([result.presentation.evidenceCards.find((item) => item.id === "evidence-3")?.capabilitySignals.find((item) => item.capabilityId === "automation")?.active, result.presentation.analysisStatus], [true, "provisional"]);
  }
  const remapped = applyCreatedMapping([create, { id: "remap-adapter-mapping", sequence: 2, actor: "user", targetType: "capability_mapping", targetId: create.newMappingId, action: "remap", expectedReviewStatus: "edited", priorDecisionId: create.id, newMappingId: "mapping-adapter-remapped", capabilityId: "stakeholder-coordination", relationship: "transferable_signal", sourceSpanIds: ["span-3"] }]);
  assert.equal(remapped.ok, true);
  if (remapped.ok) {
    const result = adapt(remapped.reviewedBundle);
    assert.equal(result.ok, true);
    if (result.ok) {
      const signals = result.presentation.evidenceCards.find((item) => item.id === "evidence-3")?.capabilitySignals ?? [];
      assert.equal(signals.find((item) => item.capabilityId === "automation")?.active, false);
      assert.deepEqual([signals.find((item) => item.capabilityId === "stakeholder-coordination")?.active, signals.find((item) => item.capabilityId === "stakeholder-coordination")?.type], [true, "transferable"]);
      assert.equal(remapped.reviewedBundle.capabilityMappings.find((item) => item.id === create.newMappingId)?.reviewStatus, "rejected");
    }
  }
}

const bundleBefore = JSON.stringify(exampleResumeEvidence);
const definitionsBefore = JSON.stringify(definitions);
adaptReviewedResumeEvidenceToCareerMap({ bundle: exampleResumeEvidence, capabilityDefinitions: definitions });
assert.equal(JSON.stringify(exampleResumeEvidence), bundleBefore);
assert.equal(JSON.stringify(definitions), definitionsBefore);
const deterministicA = adapt();
const deterministicB = adapt();
assert.deepEqual(deterministicA, deterministicB);
assert.deepEqual(JSON.parse(JSON.stringify(presentation)), presentation);

{
  const userAuthored = structuredClone(exampleResumeEvidence);
  userAuthored.interpretations ??= [];
  userAuthored.interpretations.push({
    id: "interpretation-user-1",
    evidenceId: "evidence-2",
    kind: "transferability",
    text: "I use this example to show how I align teams around shared operating practices.",
    provenance: "user_provided",
    sourceSpanIds: [],
    reviewStatus: "edited",
    method: "manual",
  });
  const before = JSON.stringify(userAuthored);
  assert.equal(validateResumeEvidenceBundle(userAuthored).valid, true);
  const first = adapt(userAuthored);
  const second = adapt(userAuthored);
  assert.equal(first.ok, true, first.ok ? undefined : JSON.stringify(first.issues));
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(userAuthored), before, "Adapter must not mutate user-authored interpretation input.");
  if (first.ok) {
    const interpretation = first.presentation.interpretations.find((item) => item.id === "interpretation-user-1");
    assert.equal(interpretation?.provenance, "user_provided");
    assert.equal(interpretation?.reviewStatus, "edited");
    assert.equal(interpretation?.text, userAuthored.interpretations.at(-1)?.text);
    assert.equal(interpretation?.evidenceId, "evidence-2");
    assert.deepEqual(interpretation?.sourceSpanIds, []);
    assert.equal(first.presentation.evidenceCards.find((item) => item.id === "evidence-2")?.sourceText, userAuthored.evidenceRecords[1].sourceText);
    assert.equal(first.presentation.featureAvailability.transferableIdentity.available, false);
    assert.equal(first.presentation.interpretations.find((item) => item.id === "interpretation-1")?.provenance, "model_inferred");
    assert.equal(validateCareerCapabilityMapPresentation(first.presentation).valid, true);
    assert.deepEqual(JSON.parse(JSON.stringify(first.presentation)), first.presentation);
  }
}

console.log("reviewed-resume-evidence-map-adapter.test passed");
