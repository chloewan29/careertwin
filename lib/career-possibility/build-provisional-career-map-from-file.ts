import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";
import { CAREER_SOURCE_NORMALISATION_VERSION, buildCareerSourceRevision } from "./career-source-revision";
import { RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION } from "./resume-evidence-extraction-contract";
import { extractLocalResumeFile, type LocalResumeParserDependencies } from "./local-resume-file-extractor";
import { buildProvisionalCareerMapFromText } from "./build-provisional-career-map-from-text";
import type { ProvisionalLocalCareerMapState } from "./local-career-map-state";

export type ProvisionalCareerMapFileBuildFailureCode = "unsupported_file" | "file_too_large" | "password_protected_pdf" | "scanned_or_image_only_pdf" | "malformed_file" | "empty_extracted_text" | "evidence_extraction_failed" | "no_unambiguous_mappings" | "materialization_failed" | "unexpected_failure";
export type ProvisionalCareerMapFileBuildResult = Readonly<{ status: "success"; state: ProvisionalLocalCareerMapState }> | Readonly<{ status: "failure"; code: ProvisionalCareerMapFileBuildFailureCode }>;
type BrowserFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;

const extractionFailure: Record<string, ProvisionalCareerMapFileBuildFailureCode> = {
  unsupported_file_type: "unsupported_file", empty_file: "empty_extracted_text", file_too_large: "file_too_large", password_protected_pdf: "password_protected_pdf", scanned_or_image_only_pdf: "scanned_or_image_only_pdf", malformed_pdf: "malformed_file", malformed_docx: "malformed_file", empty_extracted_text: "empty_extracted_text", parser_unavailable: "unexpected_failure", unexpected_extraction_failure: "unexpected_failure",
};

export async function buildProvisionalCareerMapFromFile(input: { file: BrowserFile; capabilityDefinitions: readonly CareerMapCapabilityDefinition[]; capabilityDefinitionVersion: string; createdAt: string; updatedAt: string; onStage?: (stage: "reading" | "building") => void; parserDependencies?: LocalResumeParserDependencies }): Promise<ProvisionalCareerMapFileBuildResult> {
  try {
    input.onStage?.("reading");
    const extracted = await extractLocalResumeFile(input.file, input.parserDependencies);
    if (extracted.status === "failure") return Object.freeze({ status: "failure", code: extractionFailure[extracted.code] ?? "unexpected_failure" });
    input.onStage?.("building");
    const revision = await buildCareerSourceRevision({ sourceDocuments: [{ canonicalText: extracted.text }], normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION });
    const built = await buildProvisionalCareerMapFromText({ extractedText: extracted.text, sourceMetadata: { fileName: extracted.fileName, mediaType: extracted.mediaType, byteSize: extracted.byteSize, sourceRevision: revision.sourceRevision }, identity: { documentId: `document:${revision.sourceRevision}`, bundleId: `bundle:${revision.sourceRevision}`, extractionRunId: `run:${revision.sourceRevision}` }, versions: { evidenceParserVersion: RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION, evidenceNormalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION, capabilityDefinitionVersion: input.capabilityDefinitionVersion }, capabilityDefinitions: input.capabilityDefinitions, createdAt: input.createdAt, updatedAt: input.updatedAt });
    if (built.status === "success") return Object.freeze({ status: "success", state: built.state });
    const code: ProvisionalCareerMapFileBuildFailureCode = built.code === "no_unambiguous_mappings" || built.code === "no_structurally_valid_evidence" ? "no_unambiguous_mappings" : built.code === "evidence_extraction_failed" || built.code === "invalid_extracted_text" ? "evidence_extraction_failed" : built.code === "materialization_validation_failed" ? "materialization_failed" : "unexpected_failure";
    return Object.freeze({ status: "failure", code });
  } catch {
    return Object.freeze({ status: "failure", code: "unexpected_failure" });
  }
}
