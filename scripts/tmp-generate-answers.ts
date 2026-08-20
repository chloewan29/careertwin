import * as fs from 'fs';
import { extractResumeEvidenceFromText } from '../lib/career-possibility/resume-evidence-text-extractor';
import { RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION } from '../lib/career-possibility/resume-evidence-extraction-contract';
import { CAREER_SOURCE_NORMALISATION_VERSION, buildCareerSourceRevision } from '../lib/career-possibility/career-source-revision';
import { escoEvidenceGroundingGeminiProvider } from '../lib/career-possibility/external-taxonomy/esco/esco-evidence-grounding-gemini-provider';
import { processEvidenceGrounding } from '../lib/career-possibility/external-taxonomy/esco/esco-evidence-grounding';
import { buildEscoCareerMapPresentation } from '../lib/career-possibility/esco-career-map-presentation-adapter';
import type { EscoLocalCareerMapState } from '../lib/career-possibility/local-career-map-state';
import mammoth from 'mammoth';

async function runProfile(filename: string) {
  const buffer = fs.readFileSync(filename);
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;

  const sourceRevision = await buildCareerSourceRevision({
    sourceDocuments: [{ canonicalText: rawText }],
    normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION
  });

  const evidenceExtracted = extractResumeEvidenceFromText({
    text: rawText,
    documentId: `document:${sourceRevision.sourceRevision}`,
    bundleId: `bundle:${sourceRevision.sourceRevision}`,
    extractionRunId: `run:${sourceRevision.sourceRevision}`,
    parserVersion: RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION,
    normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION
  });

  if (!evidenceExtracted.ok) throw new Error("Extract failed");
  const eligibleEvidence = evidenceExtracted.bundle.evidenceRecords.map(r => ({
    evidenceId: r.id,
    evidenceText: r.sourceText,
  }));

  const grounding = await processEvidenceGrounding(eligibleEvidence, {
    provider: escoEvidenceGroundingGeminiProvider
  });

  const state: EscoLocalCareerMapState = {
    schemaVersion: "esco/1.0.0",
    source: "esco_grounding",
    evidence: evidenceExtracted.bundle.evidenceRecords.map(r => ({
      evidenceId: r.id,
      sourceExcerpt: r.sourceText
    })),
    ownedSkills: grounding.ownedSkills.map(s => ({
      skillUri: s.skillUri,
      evidenceIds: s.evidenceIds
    }))
  };

  const presentation = await buildEscoCareerMapPresentation(state);
  
  return {
    evidenceCount: state.evidence.length,
    ownedSkillsCount: state.ownedSkills.length,
    candidateRolesCount: presentation.candidateRolesCount || presentation.nodes.filter(n => n.type === 'role' || n.type === 'future_role').length, // approximation
    visibleRoles: presentation.nodes.filter(n => n.type === 'role' || n.type === 'future_role').map(n => n.label),
    nodesCount: presentation.nodes.length,
    edgesCount: presentation.edges.length,
  };
}

async function main() {
  const commercial = await runProfile('synthetic_commercial.docx');
  console.log('COMMERCIAL', JSON.stringify(commercial));
  const technical = await runProfile('synthetic_technical.docx');
  console.log('TECHNICAL', JSON.stringify(technical));
  const people = await runProfile('synthetic_people.docx');
  console.log('PEOPLE', JSON.stringify(people));
}

main().catch(console.error);
