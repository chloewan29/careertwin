export const LOCAL_RESUME_MAX_BYTES = 5 * 1024 * 1024;

export type SupportedResumeFileType = "pdf" | "docx";

export type LocalResumeFileExtractionFailureCode =
  | "unsupported_file_type"
  | "empty_file"
  | "file_too_large"
  | "password_protected_pdf"
  | "scanned_or_image_only_pdf"
  | "malformed_pdf"
  | "malformed_docx"
  | "empty_extracted_text"
  | "parser_unavailable"
  | "unexpected_extraction_failure";

export type LocalResumeFileExtractionSuccess = Readonly<{
  status: "success";
  fileType: SupportedResumeFileType;
  fileName: string;
  mediaType: string;
  byteSize: number;
  text: string;
  extractedCharacterCount: number;
}>;

export type LocalResumeFileExtractionFailure = Readonly<{
  status: "failure";
  code: LocalResumeFileExtractionFailureCode;
  fileName: string;
  userMessage: string;
}>;

export type LocalResumeFileExtractionResult =
  | LocalResumeFileExtractionSuccess
  | LocalResumeFileExtractionFailure;
