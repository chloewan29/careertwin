import type { ResumeEvidenceBundle } from "./resume-evidence-contract";

export const RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION = "1.1.0" as const;
export const TEXT_RESUME_EVIDENCE_PARSER_NAME = "career-twin-text-resume-extractor" as const;
export const DEFAULT_TEXT_RESUME_MAX_CHARACTERS = 200_000;

export type ResumeEvidenceExtractionIssueSeverity = "error" | "warning" | "info";

export type ResumeEvidenceExtractionIssueCode =
  | "empty_input"
  | "input_too_large"
  | "invalid_control_character"
  | "invalid_identifier"
  | "duplicate_generated_id"
  | "source_span_generation_failed"
  | "no_evidence_candidates"
  | "ambiguous_segmentation"
  | "duplicate_evidence_candidate"
  | "unassigned_evidence_candidate"
  | "bundle_validation_failed";

export type ResumeEvidenceExtractionIssue = {
  code: ResumeEvidenceExtractionIssueCode;
  severity: ResumeEvidenceExtractionIssueSeverity;
  path: string;
  /** Messages identify structure only and must never contain resume content. */
  message: string;
};

export type ResumeEvidenceExtractionMetadata = {
  extractionRunId: string;
  parserName: typeof TEXT_RESUME_EVIDENCE_PARSER_NAME;
  parserVersion: string;
  normalisationVersion: string;
};

export type ExtractResumeEvidenceFromTextInput = {
  /** Untrusted source data. The extractor never interprets this as an instruction. */
  text: string;
  documentId: string;
  bundleId: string;
  extractionRunId: string;
  parserVersion: string;
  normalisationVersion: string;
  maxCharacters?: number;
};

export type ResumeEvidenceExtractionResult =
  | {
      ok: true;
      bundle: ResumeEvidenceBundle;
      metadata: ResumeEvidenceExtractionMetadata;
      warnings: ResumeEvidenceExtractionIssue[];
    }
  | { ok: false; issues: ResumeEvidenceExtractionIssue[] };
