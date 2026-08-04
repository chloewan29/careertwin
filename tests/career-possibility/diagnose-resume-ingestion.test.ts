import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diagnoseResumeIngestion } from "../../lib/career-possibility/diagnose-resume-ingestion";
import { extractLocalResumeFile } from "../../lib/career-possibility/local-resume-file-extractor";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";

const defs = canonicalCapabilityLibrary.capabilities;
const pdfBytes = new TextEncoder().encode("%PDF-synthetic"); const docxBytes = Uint8Array.from([0x50, 0x4b, 3, 4]);
const file = (name: string, type: string, bytes: Uint8Array) => ({ name, type, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
const inspect = (text: string) => diagnoseResumeIngestion({ extractedText: text, capabilityDefinitions: defs, capabilityDefinitionVersion: canonicalCapabilityLibrary.contentVersion });
const mappedText = "EXPERIENCE\nExample Co Ltd\nAnalyst | 2020 - Present\n- Designed a research study.\n- Supported the delivery of research interviews.";
const unsupportedText = "EXPERIENCE\nExample Co Ltd\nAnalyst | 2020 - Present\n- Built a dashboard for weekly reporting.\n- Partnered with commercial teams.";

async function main() {
const pdf = await extractLocalResumeFile(file("cv.pdf", "application/pdf", pdfBytes), { extractPdf: async () => unsupportedText });
const docx = await extractLocalResumeFile(file("cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes), { extractDocx: async () => unsupportedText });
assert.equal(pdf.status, "success"); assert.equal(docx.status, "success");
for (const value of [pdf, docx]) { if (value.status === "success") { const diagnostic = await inspect(value.text); assert.ok(diagnostic.evidence.count > 0); assert.equal(diagnostic.mappings.autoAdmittedCount, 0); assert.equal(diagnostic.materialization.failureCode, "no_unambiguous_mappings"); } }

const scanned = await extractLocalResumeFile(file("scan.pdf", "application/pdf", pdfBytes), { extractPdf: async () => "  " }); assert.equal(scanned.status, "failure"); if (scanned.status === "failure") assert.equal(scanned.code, "scanned_or_image_only_pdf");
const malformed = await extractLocalResumeFile(file("broken.pdf", "application/pdf", pdfBytes), { extractPdf: async () => { throw new Error("broken document"); } }); assert.equal(malformed.status, "failure"); if (malformed.status === "failure") assert.equal(malformed.code, "malformed_pdf");

const twoColumn = await inspect("SKILLS\nAnalytics\nEXPERIENCE\n2020 - Present\nExample Co Ltd\nAnalyst\n- Built reporting.\n2018 - 2020\n- Managed delivery."); assert.ok(twoColumn.textQuality.suspectedColumnOrderDiscontinuities > 0); assert.equal(twoColumn.structure.employmentRecordCount, 1);
const wrapped = await inspect("EXPERIENCE\nExample Co Ltd\nAnalyst | 2020 - Present\n- Designed a research study that informed\n  a commercial decision.\n- Led delivery."); assert.equal(wrapped.structure.multiLineBulletReconstructionCount, 1); assert.equal(wrapped.evidence.count, 3);
const mapped = await inspect(mappedText); assert.equal(mapped.evidence.count, 2); assert.equal(mapped.signals.structuredCount, 2); assert.equal(mapped.signals.unsupportedCount, 0); assert.equal(mapped.mappings.autoAdmittedCount, 2); assert.equal(mapped.materialization.capabilityCount, 1); assert.equal(mapped.materialization.unexpectedlyLostEvidenceCount, 0); assert.equal(mapped.evidence.validLocatorCount, 2);
const unsupported = await inspect(unsupportedText); assert.equal(unsupported.signals.unsupportedCount, 2); assert.equal(unsupported.mappings.autoAdmittedCount, 0);
const ordinaryVerbs = "built created developed implemented delivered launched drove led owned managed partnered collaborated aligned coordinated analysed assessed evaluated identified synthesised translated recommended influenced improved optimised streamlined standardised transformed scaled governed enabled automated established designed".split(" ");
for (const verb of ordinaryVerbs) { const value = await inspect(`EXPERIENCE\nExample Company Ltd — Analyst | 2020 - Present\n- ${verb} analytics strategy.`); assert.equal(value.evidence.count, 1); assert.equal(value.signals.unsupportedCount, 1); }
const crossFunctional = await inspect("EXPERIENCE\nExample Company Ltd — Analyst | 2020 - Present\n- Led a cross-functional delivery program."); assert.equal(crossFunctional.mappings.autoAdmittedCount, 1);
const headerFooter = await inspect("EXPERIENCE\nExample Company Ltd — Analyst | 2020 - Present\n- Designed a research study.\nCareer Profile\n1\nCareer Profile\n2"); assert.equal(headerFooter.textQuality.headerFooterRepetitionCount, 1); assert.equal(headerFooter.evidence.count, 2);

const safe = JSON.stringify({ mapped, unsupported, twoColumn, wrapped, crossFunctional, headerFooter });
assert.doesNotMatch(safe, /@|\+61|Example Co Ltd|Designed a research study|Built a dashboard|ArrayBuffer|Uint8Array|localStorage|supabase|fetch\(|openai|embedding/i);
const source = readFileSync("lib/career-possibility/diagnose-resume-ingestion.ts", "utf8");
assert.doesNotMatch(source, /localStorage|fetch\(|supabase|openai|embedding|components\//i);
console.log("resume ingestion diagnostic tests passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
