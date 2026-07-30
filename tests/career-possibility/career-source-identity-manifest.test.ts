import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCareerSourceIdentityManifest,
  CAREER_SOURCE_IDENTITY_ALGORITHM_VERSION,
  CAREER_SOURCE_IDENTITY_MANIFEST_SCHEMA_VERSION,
  CAREER_SOURCE_IDENTITY_MODEL_VERSION,
  CareerSourceIdentityManifestError,
  type CareerSourceIdentityManifestInput,
  type CareerRecordLineageInput,
} from "../../lib/career-possibility/career-source-identity-manifest";

const original = (): CareerRecordLineageInput => ({ kind: "original" });
const locator = (locatorId: string, startOffset: number, endOffset: number) => ({ locatorId, startOffset, endOffset });
const validInput = (): CareerSourceIdentityManifestInput => ({
  sourceRevision: "career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:source",
  extractionRevision: "extraction:parser-1:normaliser-1:structure-a",
  bundleId: "bundle:opaque-a",
  sourceDocuments: [
    { recordKey: "doc-a", occurrenceId: "occurrence-a", extractionLocalSourceDocumentId: "local-doc-a", characterLength: 500, lineage: original() },
    { recordKey: "doc-b", occurrenceId: "occurrence-b", extractionLocalSourceDocumentId: "local-doc-b", characterLength: 300, lineage: original() },
  ],
  employmentRecords: [
    { recordKey: "job-a", sourceDocumentOccurrenceId: "occurrence-a", locator: locator("employment-a", 10, 200), extractionLocalEmploymentRecordId: "local-job-a", lineage: original() },
    { recordKey: "job-b", sourceDocumentOccurrenceId: "occurrence-b", locator: locator("employment-b", 20, 250), extractionLocalEmploymentRecordId: "local-job-b", lineage: original() },
  ],
  evidenceRecords: [
    { recordKey: "evidence-a", sourceDocumentOccurrenceId: "occurrence-a", employmentRecordKey: "job-a", locator: locator("evidence-a", 30, 80), extractionLocalEvidenceId: "local-evidence-a", lineage: original() },
    { recordKey: "evidence-b", sourceDocumentOccurrenceId: "occurrence-b", employmentRecordKey: "job-b", locator: locator("evidence-b", 50, 100), extractionLocalEvidenceId: "local-evidence-b", lineage: original() },
  ],
  predecessorManifest: null,
});
const clone = (): CareerSourceIdentityManifestInput => structuredClone(validInput());

async function rejected(change: (value: CareerSourceIdentityManifestInput) => void, code: string): Promise<void> {
  const value = clone(); change(value);
  try { await buildCareerSourceIdentityManifest(value); assert.fail(`Expected ${code}`); }
  catch (error) { assert.equal(error instanceof CareerSourceIdentityManifestError, true); assert.equal((error as CareerSourceIdentityManifestError).code, code); }
}

async function main(): Promise<void> {
  const built = await buildCareerSourceIdentityManifest(validInput());
  assert.equal(built.schemaVersion, CAREER_SOURCE_IDENTITY_MANIFEST_SCHEMA_VERSION);
  assert.equal(built.identityModelVersion, CAREER_SOURCE_IDENTITY_MODEL_VERSION);
  assert.equal(built.algorithmVersion, CAREER_SOURCE_IDENTITY_ALGORITHM_VERSION);
  assert.match(built.manifestRevision, /^career-source-manifest:1\.0\.0:[0-9a-f]{64}$/);
  assert.equal(built.sourceDocuments.every((record) => /^career-source-document:1\.0\.0:[0-9a-f]{64}$/.test(record.sharedSourceDocumentId)), true);
  assert.equal(built.employmentRecords.every((record) => /^career-employment:1\.0\.0:[0-9a-f]{64}$/.test(record.sharedEmploymentRecordId)), true);
  assert.equal(built.evidenceRecords.every((record) => /^career-evidence:1\.0\.0:[0-9a-f]{64}$/.test(record.sharedEvidenceId)), true);

  await rejected((value) => { (value as { sourceRevision: string }).sourceRevision = ""; }, "missing_source_revision");
  await rejected((value) => { (value as { extractionRevision: string }).extractionRevision = ""; }, "missing_extraction_revision");
  await rejected((value) => { (value as { bundleId: string }).bundleId = ""; }, "missing_bundle_id");
  await rejected((value) => { (value as { sourceDocuments: unknown[] }).sourceDocuments = []; }, "empty_source_documents");
  await rejected((value) => { (value as { employmentRecords: unknown[] }).employmentRecords = []; }, "empty_employment_records");
  await rejected((value) => { (value as { evidenceRecords: unknown[] }).evidenceRecords = []; }, "empty_evidence_records");

  assert.deepEqual(await buildCareerSourceIdentityManifest(validInput()), built);
  const reordered = clone();
  (reordered.sourceDocuments as unknown[]).reverse(); (reordered.employmentRecords as unknown[]).reverse(); (reordered.evidenceRecords as unknown[]).reverse();
  assert.deepEqual(await buildCareerSourceIdentityManifest(reordered), built);

  assert.notEqual(built.sourceDocuments[0].sharedSourceDocumentId, built.sourceDocuments[1].sharedSourceDocumentId);
  await rejected((value) => { (value.sourceDocuments[1] as { occurrenceId: string }).occurrenceId = value.sourceDocuments[0].occurrenceId; }, "duplicate_source_document_identity");
  await rejected((value) => { value.employmentRecords.push({ ...value.employmentRecords[0], recordKey: "job-copy" }); }, "duplicate_employment_identity");
  await rejected((value) => { value.evidenceRecords.push({ ...value.evidenceRecords[0], recordKey: "evidence-copy" }); }, "duplicate_evidence_identity");
  await rejected((value) => { (value.employmentRecords[0] as { sourceDocumentOccurrenceId: string }).sourceDocumentOccurrenceId = "missing"; }, "unknown_source_document_reference");
  await rejected((value) => { (value.evidenceRecords[0] as { sourceDocumentOccurrenceId: string }).sourceDocumentOccurrenceId = "missing"; }, "unknown_source_document_reference");
  await rejected((value) => { (value.evidenceRecords[0] as { employmentRecordKey: string }).employmentRecordKey = "missing"; }, "unknown_employment_reference");
  await rejected((value) => { (value.evidenceRecords[0].locator as { endOffset: number }).endOffset = 10; }, "invalid_source_locator");
  await rejected((value) => { (value.evidenceRecords[0].locator as { startOffset: number }).startOffset = 0; }, "invalid_source_locator");

  const changedLocalIds = clone();
  (changedLocalIds.sourceDocuments[0] as { extractionLocalSourceDocumentId: string }).extractionLocalSourceDocumentId = "renamed-local-doc";
  (changedLocalIds.employmentRecords[0] as { extractionLocalEmploymentRecordId: string }).extractionLocalEmploymentRecordId = "renamed-local-job";
  (changedLocalIds.evidenceRecords[0] as { extractionLocalEvidenceId: string }).extractionLocalEvidenceId = "renamed-local-evidence";
  const changedLocal = await buildCareerSourceIdentityManifest(changedLocalIds);
  assert.deepEqual(changedLocal.sourceDocuments.map((record) => record.sharedSourceDocumentId), built.sourceDocuments.map((record) => record.sharedSourceDocumentId));
  assert.deepEqual(changedLocal.employmentRecords.map((record) => record.sharedEmploymentRecordId), built.employmentRecords.map((record) => record.sharedEmploymentRecordId));
  assert.deepEqual(changedLocal.evidenceRecords.map((record) => record.sharedEvidenceId), built.evidenceRecords.map((record) => record.sharedEvidenceId));

  const lineageInput = clone();
  lineageInput.employmentRecords.push({ recordKey: "job-split", sourceDocumentOccurrenceId: "occurrence-a", locator: locator("employment-split", 210, 300), lineage: { kind: "split", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "job-a" }] } });
  lineageInput.employmentRecords.push({ recordKey: "job-merged", sourceDocumentOccurrenceId: "occurrence-a", locator: locator("employment-merged", 310, 400), lineage: { kind: "merged", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "job-a" }, { scope: "current_manifest", predecessorRecordKey: "job-split" }] } });
  lineageInput.evidenceRecords.push({ recordKey: "evidence-split", sourceDocumentOccurrenceId: "occurrence-a", employmentRecordKey: "job-split", locator: locator("evidence-split", 220, 240), lineage: { kind: "split", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "evidence-a" }] } });
  lineageInput.evidenceRecords.push({ recordKey: "evidence-merged", sourceDocumentOccurrenceId: "occurrence-a", employmentRecordKey: "job-merged", locator: locator("evidence-merged", 320, 350), lineage: { kind: "merged", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "evidence-a" }, { scope: "current_manifest", predecessorRecordKey: "evidence-split" }] } });
  lineageInput.evidenceRecords.push({ recordKey: "evidence-superseded", sourceDocumentOccurrenceId: "occurrence-a", employmentRecordKey: "job-merged", locator: locator("evidence-superseded", 360, 380), lineage: { kind: "superseded", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "evidence-merged" }] } });
  const lineaged = await buildCareerSourceIdentityManifest(lineageInput);
  assert.equal(lineaged.employmentRecords.some((record) => record.lineage.kind === "split"), true);
  assert.equal(lineaged.employmentRecords.some((record) => record.lineage.kind === "merged"), true);
  assert.equal(lineaged.evidenceRecords.some((record) => record.lineage.kind === "split"), true);
  assert.equal(lineaged.evidenceRecords.some((record) => record.lineage.kind === "merged"), true);
  assert.equal(lineaged.evidenceRecords.some((record) => record.lineage.kind === "superseded"), true);

  await rejected((value) => { (value.evidenceRecords[0] as { lineage: CareerRecordLineageInput }).lineage = { kind: "split", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "evidence-a" }] }; }, "self_lineage");
  await rejected((value) => { (value.evidenceRecords[0] as { lineage: CareerRecordLineageInput }).lineage = { kind: "split", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "evidence-b" }, { scope: "current_manifest", predecessorRecordKey: "evidence-b" }] }; }, "invalid_lineage");
  await rejected((value) => { (value.evidenceRecords[0] as { lineage: CareerRecordLineageInput }).lineage = { kind: "split", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "missing" }] }; }, "unknown_predecessor_reference");
  await rejected((value) => { (value.evidenceRecords[0] as { lineage: CareerRecordLineageInput }).lineage = { kind: "split", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "evidence-b" }] }; (value.evidenceRecords[1] as { lineage: CareerRecordLineageInput }).lineage = { kind: "split", predecessors: [{ scope: "current_manifest", predecessorRecordKey: "evidence-a" }] }; }, "circular_lineage");

  const prior = clone();
  (prior as { predecessorManifest: NonNullable<CareerSourceIdentityManifestInput["predecessorManifest"]> }).predecessorManifest = { manifestRevision: "career-source-manifest:prior", sourceRevision: "source:prior", extractionRevision: "extraction:prior", bundleId: "bundle:prior" };
  (prior.evidenceRecords[0] as { lineage: CareerRecordLineageInput }).lineage = { kind: "superseded", predecessors: [{ scope: "prior_manifest", predecessorManifestRevision: "career-source-manifest:prior", predecessorRecordId: "career-evidence:prior" }] };
  assert.equal((await buildCareerSourceIdentityManifest(prior)).predecessorManifest?.manifestRevision, "career-source-manifest:prior");
  await rejected((value) => { (value as { predecessorManifest: unknown }).predecessorManifest = { manifestRevision: "" }; }, "invalid_predecessor_manifest");

  const sourceChanged = clone(); (sourceChanged as { sourceRevision: string }).sourceRevision = "source:changed";
  const sourceChangedResult = await buildCareerSourceIdentityManifest(sourceChanged);
  assert.notDeepEqual(sourceChangedResult.sourceDocuments.map((record) => record.sharedSourceDocumentId), built.sourceDocuments.map((record) => record.sharedSourceDocumentId));
  assert.notDeepEqual(sourceChangedResult.employmentRecords.map((record) => record.sharedEmploymentRecordId), built.employmentRecords.map((record) => record.sharedEmploymentRecordId));
  const extractionChanged = clone(); (extractionChanged as { extractionRevision: string }).extractionRevision = "extraction:parser-2:normaliser-1:structure-b";
  const extractionChangedResult = await buildCareerSourceIdentityManifest(extractionChanged);
  assert.deepEqual(extractionChangedResult.sourceDocuments.map((record) => record.sharedSourceDocumentId), built.sourceDocuments.map((record) => record.sharedSourceDocumentId));
  assert.notDeepEqual(extractionChangedResult.employmentRecords.map((record) => record.sharedEmploymentRecordId), built.employmentRecords.map((record) => record.sharedEmploymentRecordId));
  assert.notDeepEqual(extractionChangedResult.evidenceRecords.map((record) => record.sharedEvidenceId), built.evidenceRecords.map((record) => record.sharedEvidenceId));
  assert.equal(extractionChangedResult.sourceRevision, built.sourceRevision);

  const privateText = "Private Candidate private@example.com Secret Employer";
  assert.equal(JSON.stringify(built).includes(privateText), false);
  for (const forbiddenKey of ["proposalId", "mappingId", "reviewRevision", "subjectId", "anonymousSubjectId", "authenticatedSubjectId", "rawText", "employer", "roleTitle", "sourceText"]) assert.equal(JSON.stringify(built).includes(forbiddenKey), false);

  const immutable = validInput(); const before = structuredClone(immutable); const result = await buildCareerSourceIdentityManifest(immutable);
  assert.deepEqual(immutable, before); assert.equal(Object.isFrozen(result), true); assert.equal(Object.isFrozen(result.sourceDocuments), true); assert.equal(Object.isFrozen(result.employmentRecords[0].locator), true); assert.equal(Object.isFrozen(result.evidenceRecords[0].lineage), true); assert.deepEqual(JSON.parse(JSON.stringify(result)), result); assert.deepEqual(await buildCareerSourceIdentityManifest(immutable), result);

  const source = await readFile(path.join(process.cwd(), "lib/career-possibility/career-source-identity-manifest.ts"), "utf8");
  for (const forbidden of ["node:crypto", "localstorage", "supabase", "fetch(", "resume-evidence-text-extractor", "shared-career-ingestion-bundle-contract", "candidate-baseline", "auth/"]) assert.equal(source.toLowerCase().includes(forbidden), false, `Unexpected dependency: ${forbidden}`);
  console.log("career-source-identity-manifest.test passed");
}

void main();
