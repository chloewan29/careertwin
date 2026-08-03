import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  extractLocalResumeFile,
  normalizeLocallyExtractedResumeText,
} from "../../lib/career-possibility/local-resume-file-extractor";
import { LOCAL_RESUME_MAX_BYTES } from "../../lib/career-possibility/local-resume-file-extraction-contract";
import { makeSyntheticDocx, makeSyntheticPdf, SYNTHETIC_RESUME_LINES } from "./fixtures/local-resume-synthetic-fixtures";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const asFile = (bytes: Uint8Array, name: string, type = "") => new File([bytes], name, { type });
const expectFailure = async (file: File, codes: readonly string[]) => {
  const result = await extractLocalResumeFile(file);
  assert.equal(result.status, "failure");
  if (result.status === "failure") assert.ok(codes.includes(result.code), `${result.code} was not expected`);
};

async function main() {
const pdfBytes = makeSyntheticPdf();
const docxBytes = await makeSyntheticDocx();
const deterministicPdfParser = async () => SYNTHETIC_RESUME_LINES.join("\r\n");
const deterministicDocxParser = async () => SYNTHETIC_RESUME_LINES.join("\r\n\r\n");

const pdf = await extractLocalResumeFile(asFile(pdfBytes, "resume.pdf", PDF_MIME), { extractPdf: deterministicPdfParser });
assert.equal(pdf.status, "success");
if (pdf.status === "success") {
  assert.equal(pdf.fileType, "pdf");
  SYNTHETIC_RESUME_LINES.forEach((line) => assert.match(pdf.text, new RegExp(line)));
  assert.equal(pdf.extractedCharacterCount, pdf.text.length);
  assert.equal("binary" in pdf, false);
  assert.equal("arrayBuffer" in pdf, false);
}

const docx = await extractLocalResumeFile(asFile(docxBytes, "resume.docx", DOCX_MIME), { extractDocx: deterministicDocxParser });
assert.equal(docx.status, "success");
if (docx.status === "success") {
  assert.equal(docx.fileType, "docx");
  SYNTHETIC_RESUME_LINES.forEach((line) => assert.match(docx.text, new RegExp(line)));
  assert.match(docx.text, /Alex Example\n\nAnalytics Lead/);
}

assert.equal(normalizeLocallyExtractedResumeText(" A\r\n\r\n\r\n B \r C "), "A\n\nB\nC");
await expectFailure(asFile(new TextEncoder().encode("plain"), "resume.txt", "text/plain"), ["unsupported_file_type"]);
await expectFailure(asFile(new Uint8Array([1]), "resume.doc", "application/msword"), ["unsupported_file_type"]);
await expectFailure(asFile(new Uint8Array(), "resume.pdf", PDF_MIME), ["empty_file"]);
await expectFailure({ name: "large.pdf", type: PDF_MIME, size: LOCAL_RESUME_MAX_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(0) } as File, ["file_too_large"]);
const malformedPdf = await extractLocalResumeFile(asFile(new TextEncoder().encode("%PDF-broken"), "broken.pdf", PDF_MIME), { extractPdf: async () => { const error = new Error("Invalid PDF structure"); error.name = "InvalidPDFException"; throw error; } });
assert.equal(malformedPdf.status === "failure" ? malformedPdf.code : "success", "malformed_pdf");
await expectFailure(asFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1]), "broken.docx", DOCX_MIME), ["malformed_docx"]);
await expectFailure(asFile(pdfBytes, "resume.pdf", DOCX_MIME), ["unsupported_file_type"]);
await expectFailure(asFile(docxBytes, "resume.docx", PDF_MIME), ["unsupported_file_type"]);
await expectFailure(asFile(pdfBytes, "renamed.docx", "application/octet-stream"), ["malformed_docx"]);

const genericPdf = await extractLocalResumeFile(asFile(pdfBytes, "resume.pdf"), { extractPdf: deterministicPdfParser });
assert.equal(genericPdf.status, "success");
const genericDocx = await extractLocalResumeFile(asFile(docxBytes, "resume.docx", "application/octet-stream"), { extractDocx: deterministicDocxParser });
assert.equal(genericDocx.status, "success");
const emptyDocx = await extractLocalResumeFile(asFile(docxBytes, "empty.docx", DOCX_MIME), { extractDocx: async () => " \r\n " });
assert.equal(emptyDocx.status === "failure" ? emptyDocx.code : "success", "empty_extracted_text");
const boundedException = await extractLocalResumeFile(asFile(docxBytes, "exception.docx", DOCX_MIME), { extractDocx: async () => { throw new Error("synthetic parser fault"); } });
assert.equal(boundedException.status, "failure");
const passwordError = new Error("Password required");
passwordError.name = "PasswordException";
const protectedPdf = await extractLocalResumeFile(asFile(pdfBytes, "protected.pdf", PDF_MIME), { extractPdf: async () => { throw passwordError; } });
assert.equal(protectedPdf.status === "failure" ? protectedPdf.code : "success", "password_protected_pdf");

const noTextPdf = await extractLocalResumeFile(asFile(makeSyntheticPdf([]), "image-only.pdf", PDF_MIME), { extractPdf: async () => " \n " });
assert.deepEqual(noTextPdf.status === "failure" ? noTextPdf.code : "success", "scanned_or_image_only_pdf");

const repeated = await extractLocalResumeFile(asFile(pdfBytes, "resume.pdf", PDF_MIME), { extractPdf: deterministicPdfParser });
assert.deepEqual(repeated, pdf);

const source = readFileSync(new URL("../../lib/career-possibility/local-resume-file-extractor.ts", import.meta.url), "utf8");
assert.doesNotMatch(source, /\bfetch\s*\(/);
assert.doesNotMatch(source, /localStorage|indexedDB|caches\./);
assert.doesNotMatch(source, /supabase|parse-resume/i);
assert.doesNotMatch(source, /console\./);

console.log("local resume file extractor tests passed");
}

main().catch((error) => {
  process.exitCode = 1;
  throw error;
});
