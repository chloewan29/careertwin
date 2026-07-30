import assert from "node:assert/strict";
import {
  buildSharedCareerIngestionBundleFromResumeReview,
  type BuildBrowserResumeSharedIngestionInput,
} from "../../lib/career-possibility/browser-resume-shared-ingestion-adapter";
import { RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION, type ResumeEvidenceReviewDecision, type ResumeEvidenceReviewSession } from "../../lib/career-possibility/resume-evidence-review-contract";
import { applyResumeEvidenceReviewDecisions } from "../../lib/career-possibility/resume-evidence-review-apply";
import { extractResumeEvidenceFromText } from "../../lib/career-possibility/resume-evidence-text-extractor";
import type { ResumeEvidenceBundle } from "../../lib/career-possibility/resume-evidence-contract";

const canonicalResumeText = [
  "WORK EXPERIENCE",
  "Example Company Ltd - Operations Manager | Jan 2020 - Present",
  "- Reduced processing time by 30% through workflow redesign.",
  "- Coordinated a cross-functional launch across three teams.",
].join("\n");
const registryVersion = "career-map-capabilities/1";
const capabilityDefinitions = [
  { id: "capability:automation", label: "Automation" },
  { id: "capability:coordination", label: "Coordination" },
];

const extracted = extractResumeEvidenceFromText({
  text: canonicalResumeText,
  documentId: "intake:fixture:document",
  bundleId: "intake:fixture:bundle",
  extractionRunId: "intake:fixture:run",
  parserVersion: "text-parser/1",
  normalisationVersion: "line-normaliser/1",
});
assert.equal(extracted.ok, true, extracted.ok ? undefined : JSON.stringify(extracted.issues));
if (!extracted.ok) throw new Error("Expected real text extraction to succeed.");
assert.equal(extracted.bundle.employmentRecords.length, 1);
assert.equal(extracted.bundle.evidenceRecords.length >= 2, true);
assert.equal(extracted.bundle.evidenceRecords.every((record) => record.employmentRecordId === extracted.bundle.employmentRecords[0].id), true);

const makeSession = (decisions: ResumeEvidenceReviewDecision[] = []): ResumeEvidenceReviewSession => ({
  schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  id: "review:fixture:session",
  sourceBundleId: extracted.bundle.id,
  sourceSchemaVersion: extracted.bundle.schemaVersion,
  capabilityDefinitionVersion: registryVersion,
  status: decisions.length === 0 ? "not_started" : "in_progress",
  decisions,
  warnings: [],
});

function reviewed(session: ResumeEvidenceReviewSession): ResumeEvidenceBundle {
  const result = applyResumeEvidenceReviewDecisions({
    bundle: extracted.bundle,
    session,
    capabilityDefinitions,
    capabilityDefinitionVersion: registryVersion,
  });
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("Expected review replay to succeed.");
  return result.reviewedBundle;
}

const baseInput = (session = makeSession(), reviewedEvidenceBundle = reviewed(session)): BuildBrowserResumeSharedIngestionInput => ({
  canonicalResumeText,
  resumeEvidenceBundle: extracted.bundle,
  reviewedEvidenceBundle,
  reviewSession: session,
  extractionRevision: "career-extraction-revision:fixture-1",
  bundleId: "career-shared-bundle:fixture-1",
  documentOccurrenceId: "primary-resume-paste",
  subjectBinding: { status: "anonymous", anonymousSubjectId: "career-anonymous-subject:fixture-1", authenticatedSubjectId: null },
  capabilityRegistryVersion: registryVersion,
});

const admit = async (input: BuildBrowserResumeSharedIngestionInput = baseInput()) => {
  const result = await buildSharedCareerIngestionBundleFromResumeReview(input);
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("Expected adapter admission.");
  return result;
};
const reject = async (input: BuildBrowserResumeSharedIngestionInput, code: string) => {
  const result = await buildSharedCareerIngestionBundleFromResumeReview(input);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error(`Expected ${code}.`);
  assert.equal(result.issues.some((item) => item.code === code), true, JSON.stringify(result.issues));
};

async function main() {
const empty = await admit();
assert.equal(empty.bundle.schemaVersion, "1.1.0");
assert.equal(empty.bundle.identityModelVersion, "1.0.0");
assert.equal(empty.bundle.sourceSet.length, 1);
assert.equal(empty.bundle.employmentRecords.length, 1);
assert.equal(empty.bundle.evidenceRecords.length >= 2, true);
assert.equal(empty.bundle.evidenceRecords.every((record) => empty.bundle.employmentRecords.some((employment) => employment.employmentRecordId === record.employmentRecordId)), true);
assert.equal(empty.bundle.reviewState.decisions.length, 0);
assert.deepEqual(empty.bundle.materializationState, { status: "not_materialized", materializationRevision: null, materializerVersion: null });

const evidenceOne = extracted.bundle.evidenceRecords[0];
const evidenceTwo = extracted.bundle.evidenceRecords[1];
const confirm: ResumeEvidenceReviewDecision = { id: "review:decision:1", sequence: 1, actor: "user", targetType: "evidence_record", targetId: evidenceOne.id, action: "confirm", expectedReviewStatus: "unreviewed" };
const confirmSession = makeSession([confirm]);
const confirmed = await admit(baseInput(confirmSession, reviewed(confirmSession)));
assert.equal(confirmed.bundle.reviewState.decisions[0].action, "confirm");
assert.equal(confirmed.reviewRevision === empty.reviewRevision, false);
assert.equal(confirmed.sourceRevision, empty.sourceRevision);
assert.equal(confirmed.manifestRevision, empty.manifestRevision);

const rejectDecision: ResumeEvidenceReviewDecision = { id: "review:decision:reject", sequence: 1, actor: "user", targetType: "evidence_record", targetId: evidenceOne.id, action: "reject", expectedReviewStatus: "unreviewed" };
const restoreDecision: ResumeEvidenceReviewDecision = { id: "review:decision:restore", sequence: 2, actor: "user", priorDecisionId: rejectDecision.id, targetType: "evidence_record", targetId: evidenceOne.id, action: "restore", expectedReviewStatus: "rejected" };
const restoreSession = makeSession([rejectDecision, restoreDecision]);
const restored = await admit(baseInput(restoreSession, reviewed(restoreSession)));
assert.deepEqual(restored.bundle.reviewState.decisions.map((decision) => decision.action), ["reject", "restore"]);
assert.equal(restored.bundle.reviewState.decisions[1].priorDecisionId, restored.bundle.reviewState.decisions[0].decisionId);

const createMapping: ResumeEvidenceReviewDecision = {
  id: "review:decision:create", sequence: 2, actor: "user", targetType: "evidence_capability_mapping", action: "create",
  targetEvidenceId: evidenceOne.id, newMappingId: "review:mapping:created", capabilityId: "capability:automation", relationship: "direct_evidence",
  sourceSpanIds: [...evidenceOne.sourceSpanIds], expectedEvidenceReviewStatus: "confirmed", expectedMappingState: "absent",
};
const createSession = makeSession([confirm, createMapping]);
const createdBundle = reviewed(createSession);
const created = await admit(baseInput(createSession, createdBundle));
assert.equal(created.bundle.capabilityProposals.length, 1);
assert.equal(created.bundle.canonicalMappings.length, 1);
assert.equal(created.bundle.reviewState.decisions[1].action, "create_mapping");
assert.equal(created.bundle.canonicalMappings[0].mappingId.includes("review:mapping:created"), false);

const remap: ResumeEvidenceReviewDecision = {
  id: "review:decision:remap", sequence: 3, actor: "user", priorDecisionId: createMapping.id, targetType: "capability_mapping",
  targetId: createMapping.newMappingId, action: "remap", newMappingId: "review:mapping:remapped", capabilityId: "capability:coordination",
  relationship: "transferable_signal", sourceSpanIds: [...evidenceOne.sourceSpanIds], expectedReviewStatus: "edited",
};
const remapSession = makeSession([confirm, createMapping, remap]);
const remapped = await admit(baseInput(remapSession, reviewed(remapSession)));
assert.equal(remapped.bundle.canonicalMappings.length, 2);
assert.equal(remapped.bundle.canonicalMappings[1].supersedesMappingId, remapped.bundle.canonicalMappings[0].mappingId);
assert.equal(remapped.bundle.reviewState.decisions[2].action, "remap");

const edit: ResumeEvidenceReviewDecision = {
  id: "review:decision:edit", sequence: 1, actor: "user", targetType: "evidence_field", targetId: evidenceOne.id,
  field: "action", action: "edit", value: "Reduced processing time", sourceSpanIds: [...evidenceOne.sourceSpanIds],
};
const editSession = makeSession([edit]);
await reject(baseInput(editSession, reviewed(editSession)), "missing_semantic_payload_revision");
const edited = await admit({ ...baseInput(editSession, reviewed(editSession)), semanticPayloadRevisions: { [edit.id]: "semantic-payload:edit-1" } });
assert.equal(edited.bundle.reviewState.decisions[0].action, "edit");

const unorderedSession = makeSession([
  { id: "review:decision:2", sequence: 2, actor: "user", targetType: "evidence_record", targetId: evidenceTwo.id, action: "confirm", expectedReviewStatus: "unreviewed" },
  confirm,
]);
const ordered = await admit(baseInput(unorderedSession, reviewed(unorderedSession)));
assert.deepEqual(ordered.bundle.reviewState.decisions.map((decision) => decision.sequence), [1, 2]);

const unknownEvidenceSession = makeSession([{ ...confirm, targetId: "intake:unknown:evidence" }]);
await reject(baseInput(unknownEvidenceSession, extracted.bundle), "unknown_evidence_reference");
const unknownEmploymentSession = makeSession([{ id: "review:unknown:employment", sequence: 1, actor: "user", targetType: "employment_field", targetId: "intake:unknown:employment", field: "roleTitle", action: "confirm" }]);
await reject(baseInput(unknownEmploymentSession, extracted.bundle), "unknown_employment_reference");
const unknownInterpretationSession = makeSession([{ id: "review:unknown:interpretation", sequence: 1, actor: "user", targetType: "interpretation", targetId: "intake:unknown:interpretation", action: "confirm" }]);
await reject(baseInput(unknownInterpretationSession, extracted.bundle), "unknown_interpretation_reference");
const unknownMappingSession = makeSession([{ id: "review:unknown:mapping", sequence: 1, actor: "user", targetType: "capability_mapping", targetId: "intake:unknown:mapping", action: "confirm" }]);
await reject(baseInput(unknownMappingSession, extracted.bundle), "unknown_mapping_reference");

const invalidLocatorBundle = structuredClone(extracted.bundle);
invalidLocatorBundle.sourceSpans.find((span) => span.id === evidenceOne.sourceSpanIds[0])!.endOffset = canonicalResumeText.length + 1;
await reject({ ...baseInput(), resumeEvidenceBundle: invalidLocatorBundle }, "invalid_source_locator");

const duplicateBundle = structuredClone(extracted.bundle);
duplicateBundle.evidenceRecords.push({ ...structuredClone(duplicateBundle.evidenceRecords[0]), id: "evidence:intake:duplicate" });
await reject({ ...baseInput(), resumeEvidenceBundle: duplicateBundle, reviewedEvidenceBundle: duplicateBundle }, "duplicate_evidence_translation");

const repeat = await admit();
assert.deepEqual(repeat, empty);
assert.equal(JSON.stringify(repeat), JSON.stringify(empty));
const otherSubject = await admit({ ...baseInput(), subjectBinding: { status: "anonymous", anonymousSubjectId: "career-anonymous-subject:fixture-2", authenticatedSubjectId: null } });
assert.equal(otherSubject.sourceRevision, empty.sourceRevision);
assert.equal(otherSubject.manifestRevision, empty.manifestRevision);
assert.equal(otherSubject.reviewRevision, empty.reviewRevision);
assert.notDeepEqual(otherSubject.bundle.subjectBinding, empty.bundle.subjectBinding);

const serialized = JSON.stringify(remapped.bundle);
assert.deepEqual(JSON.parse(serialized), remapped.bundle);
assert.equal(serialized.includes(canonicalResumeText), false);
assert.equal(serialized.includes("intake:fixture"), false);
assert.equal(serialized.includes("review:fixture"), false);
assert.equal(serialized.includes("CandidateBaseline"), false);
assert.equal(Object.isFrozen(remapped.bundle), true);
assert.equal(Object.isFrozen(remapped.bundle.evidenceRecords), true);

console.log("browser-resume-shared-ingestion-adapter.test passed");
}

void main();
