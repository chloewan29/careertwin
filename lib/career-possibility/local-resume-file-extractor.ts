import {
  LOCAL_RESUME_MAX_BYTES,
  type LocalResumeFileExtractionFailure,
  type LocalResumeFileExtractionFailureCode,
  type LocalResumeFileExtractionResult,
  type SupportedResumeFileType,
} from "./local-resume-file-extraction-contract";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const GENERIC_MIMES = new Set(["", "application/octet-stream"]);

type BrowserFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;
export type LocalResumeParserDependencies = Readonly<{
  extractPdf?: (buffer: ArrayBuffer) => Promise<string>;
  extractDocx?: (buffer: ArrayBuffer) => Promise<string>;
}>;

function failure(fileName: string, code: LocalResumeFileExtractionFailureCode): LocalResumeFileExtractionFailure {
  const messages: Record<LocalResumeFileExtractionFailureCode, string> = {
    unsupported_file_type: "Choose a PDF or DOCX file whose type matches its filename.",
    empty_file: "This file is empty.",
    file_too_large: "Choose a PDF or DOCX file smaller than 5 MB.",
    password_protected_pdf: "Password-protected PDFs cannot be read.",
    scanned_or_image_only_pdf: "This PDF has no readable text. Scanned PDFs are not supported.",
    malformed_pdf: "This PDF could not be read.",
    malformed_docx: "This DOCX file could not be read.",
    empty_extracted_text: "This document does not contain readable résumé text.",
    parser_unavailable: "Local document reading is unavailable in this browser.",
    unexpected_extraction_failure: "The document could not be read locally.",
  };
  return Object.freeze({ status: "failure", code, fileName, userMessage: messages[code] });
}

function classify(file: BrowserFile): SupportedResumeFileType | undefined {
  const extension = /\.([^.]+)$/.exec(file.name.trim())?.[1].toLowerCase();
  if (extension === "pdf" && (file.type === PDF_MIME || GENERIC_MIMES.has(file.type))) return "pdf";
  if (extension === "docx" && (file.type === DOCX_MIME || GENERIC_MIMES.has(file.type))) return "docx";
  return undefined;
}

function hasSignature(bytes: Uint8Array, fileType: SupportedResumeFileType): boolean {
  if (fileType === "pdf") return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
}

export function normalizeLocallyExtractedResumeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function meaningful(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function classifyParserFailure(fileName: string, fileType: SupportedResumeFileType, error: unknown) {
  const name = errorName(error);
  const message = errorMessage(error);
  if (fileType === "pdf" && (name === "PasswordException" || /password/i.test(message))) {
    return failure(fileName, "password_protected_pdf");
  }
  if (/module|import|parser|worker/i.test(message) && /unavailable|cannot find|failed to fetch|loading/i.test(message)) {
    return failure(fileName, "parser_unavailable");
  }
  return failure(fileName, fileType === "pdf" ? "malformed_pdf" : "malformed_docx");
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const pdfModule = await import("pdf-parse");
  pdfModule.PDFParse.setWorker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString());
  const parser = new pdfModule.PDFParse({ data: new Uint8Array(buffer) });
  try {
    return ((await parser.getText()).text ?? "").replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "");
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const docxModule = await import("mammoth");
  const mammoth = "default" in docxModule ? docxModule.default : docxModule;
  return (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
}

/** Browser-only boundary: reads the supplied File and neither persists nor transmits it. */
export async function extractLocalResumeFile(file: BrowserFile, dependencies: LocalResumeParserDependencies = {}): Promise<LocalResumeFileExtractionResult> {
  const fileName = file.name || "Selected file";
  const fileType = classify(file);
  if (!fileType) return failure(fileName, "unsupported_file_type");
  if (file.size === 0) return failure(fileName, "empty_file");
  if (file.size > LOCAL_RESUME_MAX_BYTES) return failure(fileName, "file_too_large");

  let buffer: ArrayBuffer | undefined;
  try {
    buffer = await file.arrayBuffer();
    if (buffer.byteLength === 0) return failure(fileName, "empty_file");
    if (!hasSignature(new Uint8Array(buffer), fileType)) {
      return failure(fileName, fileType === "pdf" ? "malformed_pdf" : "malformed_docx");
    }
    const rawText = fileType === "pdf"
      ? await (dependencies.extractPdf ?? extractPdf)(buffer)
      : await (dependencies.extractDocx ?? extractDocx)(buffer);
    const text = normalizeLocallyExtractedResumeText(rawText);
    if (!meaningful(text)) {
      return failure(fileName, fileType === "pdf" ? "scanned_or_image_only_pdf" : "empty_extracted_text");
    }
    return Object.freeze({
      status: "success",
      fileType,
      fileName,
      mediaType: file.type || (fileType === "pdf" ? PDF_MIME : DOCX_MIME),
      byteSize: file.size,
      text,
      extractedCharacterCount: text.length,
    });
  } catch (error) {
    return classifyParserFailure(fileName, fileType, error);
  } finally {
    buffer = undefined;
  }
}
