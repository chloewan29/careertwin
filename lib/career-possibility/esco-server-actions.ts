"use server";

import { processEvidenceGrounding } from "./external-taxonomy/esco/esco-evidence-grounding";
import { escoEvidenceGroundingGeminiProvider } from "./external-taxonomy/esco/esco-evidence-grounding-gemini-provider";
import { buildEscoCareerMapPresentation } from "./esco-career-map-presentation-adapter";
import type { EscoLocalCareerMapState } from "./local-career-map-state";

import { extractResumeEvidenceFromText } from "./resume-evidence-text-extractor";
import { RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION } from "./resume-evidence-extraction-contract";
import { CAREER_SOURCE_NORMALISATION_VERSION, buildCareerSourceRevision } from "./career-source-revision";
import type { EscoCareerMapFileBuildFailureCode } from "./build-esco-career-map-from-file";

export async function groundEscoEvidenceAction(eligibleEvidence: Array<{ evidenceId: string; evidenceText: string }>) {
  const grounding = await processEvidenceGrounding(eligibleEvidence, {
    provider: escoEvidenceGroundingGeminiProvider
  });
  return grounding;
}

export async function buildEscoCareerMapFromServerAction(formData: FormData): Promise<{ status: "success"; state: EscoLocalCareerMapState } | { status: "failure"; code: EscoCareerMapFileBuildFailureCode }> {
  const file = formData.get("file") as File | null;
  if (!file) return { status: "failure", code: "unsupported_file" };

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "pdf" && extension !== "docx") return { status: "failure", code: "unsupported_file" };
  if (file.size > 5 * 1024 * 1024) return { status: "failure", code: "file_too_large" };

  let rawText = "";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (extension === "pdf") {
    try {
      const pdfParseModule = await import("pdf-parse");
      const { pathToFileURL } = await import("node:url");
      const { join } = await import("node:path");
      const PDFParseCtor = pdfParseModule.PDFParse as any;
      const workerPath = join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs");
      PDFParseCtor.setWorker?.(pathToFileURL(workerPath).href);
      const parser = new PDFParseCtor({ data: buffer });
      const parsedPdf = await parser.getText();
      await parser.destroy();
      rawText = (parsedPdf?.text ?? "").replace(/\t+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    } catch (err: any) {
      if (err.message?.includes("Password") || err.name === "PasswordException") return { status: "failure", code: "password_protected_pdf" };
      return { status: "failure", code: "unexpected_failure" };
    }
  } else if (extension === "docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } catch {
      return { status: "failure", code: "unexpected_failure" };
    }
  }

  if (!rawText || rawText.trim().length === 0) return { status: "failure", code: "empty_extracted_text" };

  let sourceRevision;
  try {
    sourceRevision = await buildCareerSourceRevision({
      sourceDocuments: [{ canonicalText: rawText }],
      normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION
    });
  } catch {
    return { status: "failure", code: "evidence_extraction_failed" };
  }

  const evidenceExtracted = extractResumeEvidenceFromText({
    text: rawText,
    documentId: `document:${sourceRevision.sourceRevision}`,
    bundleId: `bundle:${sourceRevision.sourceRevision}`,
    extractionRunId: `run:${sourceRevision.sourceRevision}`,
    parserVersion: RESUME_EVIDENCE_EXTRACTION_SCHEMA_VERSION,
    normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION
  });
  if (!evidenceExtracted.ok) return { status: "failure", code: "evidence_extraction_failed" };

  const eligibleEvidence = evidenceExtracted.bundle.evidenceRecords.map(record => ({
    evidenceId: record.id,
    evidenceText: record.sourceText,
  }));

  const grounding = await groundEscoEvidenceAction(eligibleEvidence);

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

  return { status: "success", state };
}

export async function getEscoPresentationGraphAction(state: EscoLocalCareerMapState) {
  return buildEscoCareerMapPresentation(state);
}
