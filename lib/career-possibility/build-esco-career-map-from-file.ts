import { extractLocalResumeFile, type LocalResumeParserDependencies } from "./local-resume-file-extractor";
import { extractResumeEvidenceFromText } from "./resume-evidence-text-extractor";
import { RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION } from "./resume-evidence-extraction-contract";
import { CAREER_SOURCE_NORMALISATION_VERSION, buildCareerSourceRevision } from "./career-source-revision";
import { processEvidenceGrounding } from "./external-taxonomy/esco/esco-evidence-grounding";
import { escoEvidenceGroundingGeminiProvider } from "./external-taxonomy/esco/esco-evidence-grounding-gemini-provider";
import type { EscoLocalCareerMapState } from "./local-career-map-state";

export type EscoCareerMapFileBuildFailureCode = 
  | "unsupported_file" 
  | "file_too_large" 
  | "password_protected_pdf" 
  | "scanned_or_image_only_pdf" 
  | "malformed_file" 
  | "empty_extracted_text" 
  | "evidence_extraction_failed" 
  | "unexpected_failure";

export type EscoCareerMapFileBuildResult = 
  | Readonly<{ status: "success"; state: EscoLocalCareerMapState }> 
  | Readonly<{ status: "failure"; code: EscoCareerMapFileBuildFailureCode }>;

type BrowserFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;

const extractionFailure: Record<string, EscoCareerMapFileBuildFailureCode> = {
  unsupported_file_type: "unsupported_file", 
  empty_file: "empty_extracted_text", 
  file_too_large: "file_too_large", 
  password_protected_pdf: "password_protected_pdf", 
  scanned_or_image_only_pdf: "scanned_or_image_only_pdf", 
  malformed_pdf: "malformed_file", 
  malformed_docx: "malformed_file", 
  empty_extracted_text: "empty_extracted_text", 
  parser_unavailable: "unexpected_failure", 
  unexpected_extraction_failure: "unexpected_failure",
};

export async function buildEscoCareerMapFromFile(input: { 
  file: BrowserFile; 
  onStage?: (stage: "reading" | "building") => void; 
  parserDependencies?: LocalResumeParserDependencies 
}): Promise<EscoCareerMapFileBuildResult> {
  try {
    input.onStage?.("reading");
    const extracted = await extractLocalResumeFile(input.file, input.parserDependencies);
    if (extracted.status === "failure") return Object.freeze({ status: "failure", code: extractionFailure[extracted.code] ?? "unexpected_failure" });
    
    input.onStage?.("building");
    const revision = await buildCareerSourceRevision({ sourceDocuments: [{ canonicalText: extracted.text }], normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION });
    
    if (typeof extracted.text !== "string" || !extracted.text.trim()) {
      return Object.freeze({ status: "failure", code: "empty_extracted_text" });
    }
    
    const evidenceExtracted = extractResumeEvidenceFromText({ 
      text: extracted.text, 
      documentId: `document:${revision.sourceRevision}`, 
      bundleId: `bundle:${revision.sourceRevision}`, 
      extractionRunId: `run:${revision.sourceRevision}`, 
      parserVersion: RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION, 
      normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION 
    });
    
    if (!evidenceExtracted.ok) return Object.freeze({ status: "failure", code: "evidence_extraction_failed" });
    if (evidenceExtracted.bundle.evidenceRecords.length === 0) return Object.freeze({ status: "failure", code: "empty_extracted_text" });

    const eligibleEvidence = evidenceExtracted.bundle.evidenceRecords.map(record => ({
      evidenceId: record.id,
      evidenceText: record.sourceText,
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

    return Object.freeze({ status: "success", state });
  } catch (err) {
    return Object.freeze({ status: "failure", code: "unexpected_failure" });
  }
}
