import assert from "node:assert/strict";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { buildProvisionalCareerMapFromText } from "../../lib/career-possibility/build-provisional-career-map-from-text";
import { buildPersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";
import { buildPersonalCareerMapExplorerViewModel } from "../../lib/career-possibility/career-map-explorer-view-model";
import { validateProvisionalLocalCareerMapState, type ProvisionalLocalCareerMapState } from "../../lib/career-possibility/local-career-map-state";

import { readLocalCareerMapState, writeLocalCareerMapState } from "../../lib/career-possibility/local-career-map-storage";


const definitions = canonicalCapabilityLibrary.capabilities;
const definitionVersion = canonicalCapabilityLibrary.contentVersion;
const base = (text: string, suffix = "a") => ({ extractedText: text, sourceMetadata: { fileName: `synthetic-${suffix}.pdf`, mediaType: "application/pdf", byteSize: 1024, sourceRevision: `source-revision/${suffix}` }, identity: { documentId: `document-${suffix}`, bundleId: `bundle-${suffix}`, extractionRunId: `run-${suffix}` }, versions: { evidenceParserVersion: "text-parser/1", evidenceNormalisationVersion: "normaliser/1", capabilityDefinitionVersion: definitionVersion }, capabilityDefinitions: definitions, createdAt: "2026-08-04T00:00:00Z", updatedAt: "2026-08-04T00:00:00Z" } as const);

async function main() {
  const built = await buildProvisionalCareerMapFromText(base("EXPERIENCE\nNorthstar Co — Operations Analyst\n- Designed a research study for customer discovery.", "chain"));
  assert.equal(built.status, "success"); if (built.status !== "success") throw new Error(built.message);
  const presentation = buildPersonalCareerMapPresentation({ localState: built.state, canonicalDefinitions: definitions });
  assert.equal(presentation.ok, true); if (!presentation.ok) throw new Error();
  const evidence = presentation.presentation.capabilities[0].evidence[0];
  assert.equal(evidence.employer, "Northstar Co"); assert.equal(evidence.roleTitle, "Operations Analyst");
  const viewModel = buildPersonalCareerMapExplorerViewModel(presentation.presentation);
  assert.equal(viewModel.mode, "personal");
  const experience = viewModel.experiences[0];
  assert.equal(experience.company, "Northstar Co"); assert.equal(experience.role, "Operations Analyst");
  assert.equal(experience.evidenceText.includes("Designed a research study"), true);
  assert.equal(experience.capabilityIds.includes("research-design"), true);
  assert.equal(experience.relationshipByCapabilityId?.["research-design"], "direct_evidence");
  assert.equal(experience.reviewStatus, "provisional");
  assert.equal(experience.sourceStart !== undefined && experience.sourceEnd !== undefined, true);

  // Point 4: a non-employment section (education) must not inherit stale employment provenance.
  const withEducation = await buildProvisionalCareerMapFromText(base("EXPERIENCE\nNorthstar Co — Operations Analyst\n- Designed a research study for customer discovery.\n\nEDUCATION\n- Bachelor of Science in Computer Science.", "education"));
  assert.equal(withEducation.status, "success"); if (withEducation.status !== "success") throw new Error(withEducation.message);
  const educationEvidence = withEducation.state.evidence.find((item) => item.sourceExcerpt.includes("Bachelor of Science"));
  assert.ok(educationEvidence, "education evidence should be present");
  assert.equal(educationEvidence.employer, undefined, "education evidence must not inherit employment employer");
  assert.equal(educationEvidence.roleTitle, undefined, "education evidence must not inherit employment role title");
  const employmentEvidence = withEducation.state.evidence.find((item) => item.sourceExcerpt.includes("Designed a research study"));
  assert.ok(employmentEvidence, "employment evidence should be present");
  assert.equal(employmentEvidence.employer, "Northstar Co");
  assert.equal(employmentEvidence.roleTitle, "Operations Analyst");

  // Point 8: an old schema-2 state without provenance fields remains valid and readable.
  const provisionalState = built.state as ProvisionalLocalCareerMapState;
  const legacyEvidence = provisionalState.evidence.map((item) => { const { employer: _employer, roleTitle: _roleTitle, ...rest } = item; return rest; });
  const legacyState: unknown = { ...provisionalState, evidence: legacyEvidence };
  const legacyValidation = validateProvisionalLocalCareerMapState(legacyState, definitions);
  assert.equal(legacyValidation.ok, true, "legacy state without provenance must remain valid");



  // Point 9: localStorage round-trip preserves provenance.
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
  assert.deepEqual(writeLocalCareerMapState(provisionalState, definitions, storage), { ok: true });

  const loaded = readLocalCareerMapState(definitions, definitionVersion, storage);
  assert.equal(loaded.status, "loaded"); if (loaded.status !== "loaded") throw new Error();
  assert.equal(loaded.state.schemaVersion, "2.0.0");
  const loadedProvisional = loaded.state as ProvisionalLocalCareerMapState;
  const loadedEvidence = loadedProvisional.evidence.find((item) => item.sourceExcerpt.includes("Designed a research study"));
  if (!loadedEvidence) throw new Error("loaded evidence should be present");
  assert.equal(loadedEvidence.employer, "Northstar Co");
  assert.equal(loadedEvidence.roleTitle, "Operations Analyst");



  console.log("career map provenance chain tests passed");
}


main().catch((error) => { process.exitCode = 1; throw error; });
