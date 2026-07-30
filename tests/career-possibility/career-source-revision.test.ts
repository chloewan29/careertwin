import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCareerSourceRevision,
  CAREER_SOURCE_NORMALISATION_VERSION,
  CAREER_SOURCE_REVISION_ALGORITHM_VERSION,
  CAREER_SOURCE_REVISION_SCHEMA_VERSION,
  CareerSourceRevisionError,
  type CareerSourceRevisionInput,
} from "../../lib/career-possibility/career-source-revision";

const input = (...canonicalTexts: string[]): CareerSourceRevisionInput => ({
  sourceDocuments: canonicalTexts.map((canonicalText) => ({ canonicalText })),
  normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION,
});

const revision = async (...canonicalTexts: string[]) =>
  (await buildCareerSourceRevision(input(...canonicalTexts))).sourceRevision;

async function rejectsWithCode(value: unknown, code: string, forbiddenText?: string): Promise<void> {
  try {
    await buildCareerSourceRevision(value as CareerSourceRevisionInput);
    assert.fail(`Expected ${code}`);
  } catch (error) {
    assert.equal(error instanceof CareerSourceRevisionError, true);
    assert.equal((error as CareerSourceRevisionError).code, code);
    if (forbiddenText) assert.equal(String((error as Error).message).includes(forbiddenText), false);
  }
}

async function main(): Promise<void> {
const one = await buildCareerSourceRevision(input("Built a confidential reporting workflow."));
assert.equal(one.schemaVersion, CAREER_SOURCE_REVISION_SCHEMA_VERSION);
assert.equal(one.normalisationVersion, CAREER_SOURCE_NORMALISATION_VERSION);
assert.equal(one.algorithmVersion, CAREER_SOURCE_REVISION_ALGORITHM_VERSION);
assert.equal(one.algorithm, "SHA-256");
assert.equal(one.documentCount, 1);
assert.match(one.sourceRevision, /^career-source-revision:schema-1\.0\.0:normalisation-lf-bom-1\.0\.0:sha256:[0-9a-f]{64}$/);

assert.deepEqual(await buildCareerSourceRevision(input("Same source")), await buildCareerSourceRevision(input("Same source")));
assert.equal(await revision("Line one\r\nLine two"), await revision("Line one\nLine two"));
assert.equal(await revision("Line one\rLine two"), await revision("Line one\nLine two"));
assert.equal(await revision("\uFEFFLine one"), await revision("Line one"));
assert.notEqual(await revision("Line one"), await revision("Line one\n"));
assert.notEqual(await revision("Line one\nLine two"), await revision("Line one\n\nLine two"));
assert.notEqual(await revision("Words separated"), await revision("Words\tseparated"));
assert.notEqual(await revision("Trailing whitespace"), await revision("Trailing whitespace "));
assert.notEqual(await revision("caf\u00E9"), await revision("cafe\u0301"));

assert.equal(await revision("Document A", "Document B"), await revision("Document B", "Document A"));
assert.notEqual(await revision("Document A"), await revision("Document A", "Document A"));
assert.notEqual(await revision("Document A"), await revision("Document A", "Document B"));
assert.notEqual(await revision("Document A", "Document B"), await revision("Document A"));
assert.notEqual(await revision("Document A", "Document B"), await revision("Document A", "Document C"));

const metadataA = {
  sourceDocuments: [{ canonicalText: "Same content", filename: "resume-a.txt", sourceType: "pasted_text" }],
  normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION,
};
const metadataB = {
  sourceDocuments: [{ canonicalText: "Same content", filename: "resume-b.pdf", sourceType: "pdf" }],
  normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION,
};
assert.equal(
  await buildCareerSourceRevision(metadataA).then((result) => result.sourceRevision),
  await buildCareerSourceRevision(metadataB).then((result) => result.sourceRevision),
);

await rejectsWithCode(input(), "empty_source_set");
await rejectsWithCode(input(" \t\r\n"), "empty_source_document");
await rejectsWithCode(
  { sourceDocuments: [{ canonicalText: "Private source" }], normalisationVersion: "unsupported" },
  "unsupported_normalisation_version",
  "Private source",
);
await rejectsWithCode({ sourceDocuments: [{ canonicalText: 42 }], normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION }, "invalid_input");

const privateText = "Private Candidate private@example.com +61 400 123 456";
const privateResult = await buildCareerSourceRevision(input(privateText));
assert.equal(JSON.stringify(privateResult).includes(privateText), false);
assert.equal(JSON.stringify(privateResult).includes("private@example.com"), false);

const immutableInput = input("Immutable source", "Second source");
const immutableBefore = structuredClone(immutableInput);
Object.freeze(immutableInput.sourceDocuments[0]);
Object.freeze(immutableInput.sourceDocuments[1]);
Object.freeze(immutableInput.sourceDocuments);
Object.freeze(immutableInput);
const immutableResult = await buildCareerSourceRevision(immutableInput);
assert.deepEqual(immutableInput, immutableBefore);
assert.equal(Object.isFrozen(immutableResult), true);
assert.deepEqual(JSON.parse(JSON.stringify(immutableResult)), immutableResult);
assert.deepEqual(await buildCareerSourceRevision(immutableInput), immutableResult);

const sourceText = await readFile(path.join(process.cwd(), "lib/career-possibility/career-source-revision.ts"), "utf8");
for (const forbidden of ["node:crypto", "localStorage", "supabase", "shared-career-ingestion", "candidate-baseline", "resume-evidence-text-extractor"]) {
  assert.equal(sourceText.toLowerCase().includes(forbidden), false, `Unexpected dependency: ${forbidden}`);
}

console.log("career-source-revision.test passed");
}

void main();
