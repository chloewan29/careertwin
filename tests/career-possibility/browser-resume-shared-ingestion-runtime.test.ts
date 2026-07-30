import assert from "node:assert/strict";
import {
  PRIMARY_RESUME_DOCUMENT_OCCURRENCE_ID,
  buildBrowserResumeExtractionRevision,
  buildBrowserResumeSharedIngestionRuntime,
  createBrowserResumeRuntimeIdentity,
} from "../../lib/career-possibility/browser-resume-shared-ingestion-runtime";
import { CAREER_SOURCE_NORMALISATION_VERSION, buildCareerSourceRevision } from "../../lib/career-possibility/career-source-revision";
import { RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION, type ResumeEvidenceReviewDecision, type ResumeEvidenceReviewSession } from "../../lib/career-possibility/resume-evidence-review-contract";
import { applyResumeEvidenceReviewDecisions } from "../../lib/career-possibility/resume-evidence-review-apply";
import { extractResumeEvidenceFromText } from "../../lib/career-possibility/resume-evidence-text-extractor";

const resumeText = [
  "WORK EXPERIENCE",
  "Example Company Ltd - Operations Manager | Jan 2020 - Present",
  "- Reduced processing time by 30% through workflow redesign.",
  "- Coordinated a cross-functional launch across three teams.",
].join("\n");
const definitions = [{ id: "capability:automation", label: "Automation" }];
const definitionVersion = "career-map-capabilities/1";

const extraction = extractResumeEvidenceFromText({
  text: resumeText,
  documentId: "intake:runtime:document",
  bundleId: "intake:runtime:bundle",
  extractionRunId: "intake:runtime:run:1",
  parserVersion: "text-parser/1",
  normalisationVersion: "line-normaliser/1",
});
assert.equal(extraction.ok, true, extraction.ok ? undefined : JSON.stringify(extraction.issues));
if (!extraction.ok) throw new Error("Expected extraction success.");

const evidence = extraction.bundle.evidenceRecords[0];
const secondEvidence = extraction.bundle.evidenceRecords[1];
const decisions: ResumeEvidenceReviewDecision[] = [
  { id: "review:runtime:decision:1", sequence: 1, actor: "user", targetType: "evidence_record", targetId: evidence.id, action: "confirm", expectedReviewStatus: "unreviewed" },
  { id: "review:runtime:decision:2", sequence: 2, actor: "user", targetType: "evidence_record", targetId: secondEvidence.id, action: "confirm", expectedReviewStatus: "unreviewed" },
  {
    id: "review:runtime:decision:3", sequence: 3, actor: "user", targetType: "evidence_capability_mapping", action: "create",
    targetEvidenceId: evidence.id, newMappingId: "review:runtime:mapping:1", capabilityId: definitions[0].id,
    relationship: "direct_evidence", sourceSpanIds: [...evidence.sourceSpanIds], expectedEvidenceReviewStatus: "confirmed", expectedMappingState: "absent",
  },
];
const session = (reviewDecisions: ResumeEvidenceReviewDecision[]): ResumeEvidenceReviewSession => ({
  schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  id: "review:runtime:session",
  sourceBundleId: extraction.bundle.id,
  sourceSchemaVersion: extraction.bundle.schemaVersion,
  capabilityDefinitionVersion: definitionVersion,
  status: "in_progress",
  decisions: reviewDecisions,
  warnings: [],
});
const replay = (reviewSession: ResumeEvidenceReviewSession) => {
  const result = applyResumeEvidenceReviewDecisions({ bundle: extraction.bundle, session: reviewSession, capabilityDefinitions: definitions, capabilityDefinitionVersion: definitionVersion });
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("Expected review replay success.");
  return result;
};

async function main() {
  const uuids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
  let uuidCalls = 0;
  const identity = createBrowserResumeRuntimeIdentity(() => uuids[uuidCalls++]);
  assert.equal(uuidCalls, 2);
  assert.equal(identity.documentOccurrenceId, PRIMARY_RESUME_DOCUMENT_OCCURRENCE_ID);
  assert.equal(identity.bundleId.includes(resumeText), false);
  assert.equal(identity.subjectBinding.anonymousSubjectId.includes(resumeText), false);

  const source = await buildCareerSourceRevision({ sourceDocuments: [{ canonicalText: resumeText }], normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION });
  const revisionA = await buildBrowserResumeExtractionRevision({ sourceRevision: source.sourceRevision, bundle: extraction.bundle, metadata: extraction.metadata });
  const revisionB = await buildBrowserResumeExtractionRevision({ sourceRevision: source.sourceRevision, bundle: extraction.bundle, metadata: { ...extraction.metadata, extractionRunId: "intake:unrelated:run:999" } });
  assert.equal(revisionA, revisionB);
  assert.match(revisionA, /^career-extraction-revision:schema-1\.0\.0:structure-1\.0\.0:sha256:[a-f0-9]{64}$/);
  assert.equal(revisionA.includes(resumeText), false);
  assert.equal(revisionA.includes(extraction.metadata.extractionRunId), false);
  const changedLocator = structuredClone(extraction.bundle);
  const evidenceSpan = changedLocator.sourceSpans.find((span) => span.id === evidence.sourceSpanIds[0])!;
  evidenceSpan.startOffset = evidenceSpan.startOffset! + 1;
  const revisionChanged = await buildBrowserResumeExtractionRevision({ sourceRevision: source.sourceRevision, bundle: changedLocator, metadata: extraction.metadata });
  assert.notEqual(revisionChanged, revisionA);

  const completedReview = replay(session(decisions));
  const completedSession = completedReview.session;
  const reviewedBundle = completedReview.reviewedBundle;
  assert.equal(completedSession.status, "completed");
  const originalSession = JSON.stringify(completedSession);
  const runtimeInput = {
    canonicalResumeText: resumeText,
    extractedBundle: extraction.bundle,
    extractionMetadata: extraction.metadata,
    reviewedEvidenceBundle: reviewedBundle,
    reviewSession: completedSession,
    capabilityRegistryVersion: definitionVersion,
    identity,
  };
  const ready = await buildBrowserResumeSharedIngestionRuntime(runtimeInput);
  assert.equal(ready.status, "ready", ready.status === "failed" ? JSON.stringify(ready.issues) : undefined);
  if (ready.status !== "ready") throw new Error("Expected ready runtime state.");
  assert.equal(ready.bundle.schemaVersion, "1.1.0");
  assert.equal(ready.bundle.bundleId, identity.bundleId);
  assert.deepEqual(ready.bundle.subjectBinding, identity.subjectBinding);
  assert.equal(Object.isFrozen(ready.bundle), true);

  const retry = await buildBrowserResumeSharedIngestionRuntime(runtimeInput);
  assert.deepEqual(retry, ready);
  assert.equal(uuidCalls, 2, "Retry must reuse the caller-owned runtime identity.");
  assert.equal(JSON.stringify(completedSession), originalSession, "Runtime failure or success must not mutate review state.");

  const editDecision: ResumeEvidenceReviewDecision = {
    id: "review:runtime:edit", sequence: 1, actor: "user", targetType: "evidence_field", targetId: evidence.id,
    field: "action", action: "edit", value: "Private edited value", sourceSpanIds: [...evidence.sourceSpanIds],
  };
  const editSession = session([editDecision]);
  const editedReview = replay(editSession);
  const failed = await buildBrowserResumeSharedIngestionRuntime({ ...runtimeInput, reviewedEvidenceBundle: editedReview.reviewedBundle, reviewSession: editedReview.session });
  assert.equal(failed.status, "failed");
  if (failed.status !== "failed") throw new Error("Expected failed runtime state.");
  assert.equal(failed.issues.some((issue) => issue.code === "missing_semantic_payload_revision"), true);

  const readyJson = JSON.stringify(ready);
  const failedJson = JSON.stringify(failed);
  for (const privateValue of [resumeText, "Private edited value", "review:runtime:session", "intake:runtime"]) {
    assert.equal(readyJson.includes(privateValue), false);
    assert.equal(failedJson.includes(privateValue), false);
  }
  assert.deepEqual(JSON.parse(readyJson), ready);
  assert.equal("localStorage" in ready, false);
  assert.equal("CandidateBaseline" in ready, false);

  console.log("browser-resume-shared-ingestion-runtime.test passed");
}

void main();
