import {
  RESUME_EVIDENCE_SCHEMA_VERSION,
  validateResumeEvidenceBundle,
  type ResumeEvidenceBundle,
  type ResumeEvidenceRecord,
  type ResumeSourceSpan,
} from "./resume-evidence-contract";
import {
  DEFAULT_TEXT_RESUME_MAX_CHARACTERS,
  TEXT_RESUME_EVIDENCE_PARSER_NAME,
  type ExtractResumeEvidenceFromTextInput,
  type ResumeEvidenceExtractionIssue,
  type ResumeEvidenceExtractionIssueCode,
  type ResumeEvidenceExtractionResult,
} from "./resume-evidence-extraction-contract";

type Candidate = { startOffset: number; endOffset: number; text: string; bullet: boolean };

function issue(
  code: ResumeEvidenceExtractionIssueCode,
  severity: ResumeEvidenceExtractionIssue["severity"],
  path: string,
  message: string,
): ResumeEvidenceExtractionIssue {
  return { code, severity, path, message };
}

function canonicaliseText(text: string): string {
  const normalised = text.replace(/\r\n?/g, "\n");
  return normalised.startsWith("\uFEFF") ? normalised.slice(1) : normalised;
}

function isBulletLine(line: string): boolean {
  return /^\s*[-*•‣▪◦]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line);
}

function hasEvidenceContent(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

function isHeadingLike(text: string): boolean {
  const value = text.trim();
  return !value.includes("\n") && value.length <= 80 && /\p{Lu}/u.test(value) && !/\p{Ll}/u.test(value);
}

/**
 * Segmentation is syntactic, never semantic. Offsets use JavaScript UTF-16 code
 * units with a start-inclusive, end-exclusive range over canonical LF text.
 */
function segmentCandidates(text: string): Candidate[] {
  const lines: Array<{ start: number; end: number; text: string }> = [];
  let start = 0;
  for (let index = 0; index <= text.length; index += 1) {
    if (index === text.length || text[index] === "\n") {
      lines.push({ start, end: index, text: text.slice(start, index) });
      start = index + 1;
    }
  }

  const candidates: Candidate[] = [];
  let paragraphStart: number | undefined;
  let paragraphEnd: number | undefined;
  const flushParagraph = () => {
    if (paragraphStart === undefined || paragraphEnd === undefined) return;
    const value = text.slice(paragraphStart, paragraphEnd);
    if (hasEvidenceContent(value)) candidates.push({ startOffset: paragraphStart, endOffset: paragraphEnd, text: value, bullet: false });
    paragraphStart = undefined;
    paragraphEnd = undefined;
  };

  lines.forEach((line) => {
    if (!line.text.trim()) {
      flushParagraph();
      return;
    }
    if (isBulletLine(line.text)) {
      flushParagraph();
      if (hasEvidenceContent(line.text)) candidates.push({ startOffset: line.start, endOffset: line.end, text: line.text, bullet: true });
      return;
    }
    paragraphStart ??= line.start;
    paragraphEnd = line.end;
  });
  flushParagraph();
  return candidates;
}

/** Produces source-preserving, unreviewed evidence. It creates no capability truth. */
export function extractResumeEvidenceFromText(
  input: ExtractResumeEvidenceFromTextInput,
): ResumeEvidenceExtractionResult {
  const inputIssues: ResumeEvidenceExtractionIssue[] = [];
  const identifiers = [
    ["documentId", input.documentId],
    ["bundleId", input.bundleId],
    ["extractionRunId", input.extractionRunId],
    ["parserVersion", input.parserVersion],
    ["normalisationVersion", input.normalisationVersion],
  ] as const;
  identifiers.forEach(([path, value]) => {
    if (typeof value !== "string" || !value.trim()) inputIssues.push(issue("invalid_identifier", "error", path, "A required caller-supplied identifier or version is invalid."));
  });
  if (input.documentId === input.bundleId || input.documentId === input.extractionRunId || input.bundleId === input.extractionRunId) {
    inputIssues.push(issue("duplicate_generated_id", "error", "identifiers", "Caller-supplied root identities must be distinct."));
  }
  const maxCharacters = input.maxCharacters ?? DEFAULT_TEXT_RESUME_MAX_CHARACTERS;
  if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 1) inputIssues.push(issue("invalid_identifier", "error", "maxCharacters", "The maximum character limit must be a positive safe integer."));
  if (inputIssues.length > 0) return { ok: false, issues: inputIssues };

  const canonicalText = canonicaliseText(input.text);
  if (!canonicalText.trim()) return { ok: false, issues: [issue("empty_input", "error", "text", "Plain-text input must contain non-whitespace content.")] };
  if (canonicalText.length > maxCharacters) return { ok: false, issues: [issue("input_too_large", "error", "text", "Plain-text input exceeds the configured character limit.")] };
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(canonicalText)) {
    return { ok: false, issues: [issue("invalid_control_character", "error", "text", "Plain-text input contains an unsupported control character.")] };
  }

  const candidates = segmentCandidates(canonicalText);
  const documentSpanId = `span:${input.documentId}:document`;
  const generatedIds = new Set<string>([input.documentId, input.bundleId, input.extractionRunId]);
  const reserveId = (id: string) => {
    if (generatedIds.has(id)) return false;
    generatedIds.add(id);
    return true;
  };
  if (!reserveId(documentSpanId)) return { ok: false, issues: [issue("duplicate_generated_id", "error", "sourceSpans[0].id", "A deterministic source-span ID collided with another identity.")] };

  const sourceSpans: ResumeSourceSpan[] = [{
    id: documentSpanId,
    documentId: input.documentId,
    sourceType: "resume_paste",
    startOffset: 0,
    endOffset: canonicalText.length,
    originalText: canonicalText,
  }];
  const evidenceRecords: ResumeEvidenceRecord[] = [];
  const warnings: ResumeEvidenceExtractionIssue[] = [];
  const seenCandidateText = new Map<string, number>();
  let bulletIndex = 0;

  for (const [index, candidate] of candidates.entries()) {
    const sequence = index + 1;
    const spanId = `span:${input.documentId}:${sequence}`;
    const evidenceId = `evidence:${input.bundleId}:${sequence}`;
    if (!reserveId(spanId) || !reserveId(evidenceId)) {
      return { ok: false, issues: [issue("duplicate_generated_id", "error", `evidenceRecords[${index}]`, "A deterministic child ID collided with another identity.")] };
    }
    if (canonicalText.slice(candidate.startOffset, candidate.endOffset) !== candidate.text) {
      return { ok: false, issues: [issue("source_span_generation_failed", "error", `sourceSpans[${sequence}]`, "A deterministic source span could not be reproduced from canonical text.")] };
    }
    sourceSpans.push({
      id: spanId,
      documentId: input.documentId,
      sourceType: "resume_paste",
      ...(candidate.bullet ? { bulletIndex: bulletIndex++ } : {}),
      startOffset: candidate.startOffset,
      endOffset: candidate.endOffset,
      originalText: candidate.text,
    });
    evidenceRecords.push({
      id: evidenceId,
      sourceSpanIds: [spanId],
      sourceText: candidate.text,
      reviewStatus: "unreviewed",
      processingStatus: "source_provided",
      extractionMethod: "deterministic",
      warnings: [],
    });
    if (isHeadingLike(candidate.text)) warnings.push(issue("ambiguous_segmentation", "warning", `evidenceRecords[${index}]`, "A short uppercase candidate may require segmentation review."));
    const previous = seenCandidateText.get(candidate.text);
    if (previous !== undefined) warnings.push(issue("duplicate_evidence_candidate", "warning", `evidenceRecords[${index}]`, "An exact candidate is repeated elsewhere in the source and was retained separately."));
    else seenCandidateText.set(candidate.text, index);
  }

  if (evidenceRecords.length === 0) warnings.push(issue("no_evidence_candidates", "warning", "evidenceRecords", "No safe evidence candidates were produced; intake review must not be initialized."));

  const bundle: ResumeEvidenceBundle = {
    schemaVersion: RESUME_EVIDENCE_SCHEMA_VERSION,
    id: input.bundleId,
    sourceDocuments: [{ id: input.documentId, sourceType: "resume_paste" }],
    sourceSpans,
    employmentRecords: [],
    evidenceRecords,
    capabilityMappings: [],
    interpretations: [],
  };
  const validation = validateResumeEvidenceBundle(bundle);
  if (!validation.valid) {
    const firstError = validation.issues.find((item) => item.severity === "error");
    return { ok: false, issues: [issue("bundle_validation_failed", "error", firstError?.path ?? "bundle", "Canonical bundle validation failed.")] };
  }
  return {
    ok: true,
    bundle,
    metadata: {
      extractionRunId: input.extractionRunId,
      parserName: TEXT_RESUME_EVIDENCE_PARSER_NAME,
      parserVersion: input.parserVersion,
      normalisationVersion: input.normalisationVersion,
    },
    warnings,
  };
}
