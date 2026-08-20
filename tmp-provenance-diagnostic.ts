import { canonicalCapabilityLibrary } from "./lib/career-possibility/canonical-capability-library";
import { buildProvisionalCareerMapFromText } from "./lib/career-possibility/build-provisional-career-map-from-text";

const definitions = canonicalCapabilityLibrary.capabilities;
const definitionVersion = canonicalCapabilityLibrary.contentVersion;

async function run(label: string, text: string) {
  const result = await buildProvisionalCareerMapFromText({
    extractedText: text,
    sourceMetadata: { fileName: `diag-${label}.pdf`, mediaType: "application/pdf", byteSize: 1024, sourceRevision: `source-revision/${label}` },
    identity: { documentId: `document-${label}`, bundleId: `bundle-${label}`, extractionRunId: `run-${label}` },
    versions: { evidenceParserVersion: "text-parser/1", evidenceNormalisationVersion: "normaliser/1", capabilityDefinitionVersion: definitionVersion },
    capabilityDefinitions: definitions,
    createdAt: "2026-08-04T00:00:00Z",
    updatedAt: "2026-08-04T00:00:00Z",
  });
  console.log(`\n=== ${label} ===`);
  if (result.status !== "success") { console.log("FAILURE:", result.code, result.message); return; }
  result.state.evidence.forEach((e) => {
    console.log(`evidence[${e.evidenceId}] employer=${JSON.stringify(e.employer)} roleTitle=${JSON.stringify(e.roleTitle)} excerpt=${JSON.stringify(e.sourceExcerpt.slice(0, 60))}`);
  });
}

async function main() {
  // Trailing non-employment section (education) after employment.
  await run("trailing-education", "EXPERIENCE\nNorthstar Co — Operations Analyst\n- Designed a research study for customer discovery.\n\nEDUCATION\n- Bachelor of Science in Computer Science.");
  // Mid non-employment section between two employments.
  await run("mid-education", "EXPERIENCE\nNorthstar Co — Operations Analyst\n- Designed a research study for customer discovery.\n\nEDUCATION\n- Bachelor of Science in Computer Science.\n\nAcme Ltd — Product Manager\n- Led a cross-functional delivery program.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
