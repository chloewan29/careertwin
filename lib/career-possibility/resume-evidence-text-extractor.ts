import {
  RESUME_EVIDENCE_SCHEMA_VERSION,
  validateResumeEvidenceBundle,
  type ResumeEvidenceBundle,
  type ResumeEmploymentRecord,
  type ResumeEvidenceRecord,
  type ProvenancedField,
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

type Candidate = { startOffset: number; endOffset: number; text: string; bullet: boolean; composed?: boolean };
type EmploymentBoundary = {
  startOffset: number;
  contentStartOffset: number;
  endOffset: number;
  evidenceEligible: boolean;
  employer?: string;
  roleTitle?: string;
  startDate?: string;
  endDate?: string;
};

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

function isStructuralBoundaryLine(text: string): boolean {
  const value = text.trim();
  if (!value) return true;
  if (isHeadingLike(value) || workHistoryHeading.test(value) || dateRange.test(value)) return true;
  if (/^(.+?)\s+[-â€“â€”]\s+(.+?)(?:\s*[|,]\s*(.+))?$/.test(value)) return true;
  return /^.+?\s*[|,]\s*.+?(?:19|20)\d{2}\s*[-â€“â€”]/.test(value);
}

const standaloneProseStart = /^(?:responsible|accountable|reporting|role|summary|profile|overview|key responsibilities|selected achievements)\b/i;
const continuationCue = /(?:[,â€“â€”\-/:([]|\b(?:and|or|with|across|through|using|including|into|for|to|of|the|a|an))\s*$/i;

function canContinueBullet(currentText: string, nextLine: string): boolean {
  const next = nextLine.trim();
  if (!next || isBulletLine(nextLine) || isStructuralBoundaryLine(next) || standaloneProseStart.test(next)) return false;
  const current = currentText.trimEnd();
  if (/[.!?;]\s*$/.test(current)) return false;
  return continuationCue.test(current) || /^\p{Ll}/u.test(next);
}

function stableCandidateFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const workHistoryHeading = /^(?:work|professional|career|employment)\s+(?:experience|history)$|^experience$/i;
/** Non-employment sections must not inherit employment provenance; they get their own provenance-free boundary. */
const nonEmploymentSectionHeading = /^(?:education|skills|key skills|technical skills|core skills|qualifications?|certifications|certificates|projects|awards|honors|honours|languages|interests|volunteering|volunteer|publications|activities|leadership|affiliations|memberships|references)$/i;
const dateRange = /\b((?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2})\s*[-–—]\s*((?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2}|present|current)\b/i;
const companySuffix = /\b(?:inc\.?|llc|ltd\.?|limited|corp\.?|corporation|company|co\.?|group|plc|pty\.?\s+ltd\.?)$/i;

function sourced(value: string, sourceSpanId: string, methodVersion: string): ProvenancedField<string> {
  return { value, provenance: "user_provided", sourceSpanIds: [sourceSpanId], method: "deterministic", methodVersion, reviewStatus: "unreviewed" };
}

function sourceLines(text: string) {
  const lines: Array<{ start: number; end: number; text: string }> = [];
  let start = 0;
  for (let index = 0; index <= text.length; index += 1) {
    if (index === text.length || text[index] === "\n") {
      lines.push({ start, end: index, text: text.slice(start, index) });
      start = index + 1;
    }
  }
  return lines;
}

function sectionHeadingCandidate(value: string): string {
  return value.trimStart().replace(/^[^\p{L}\p{N}]+/u, "").trimStart();
}

/** Conservative structural boundaries only; values are copied from explicit headings. */
function employmentBoundaries(text: string): EmploymentBoundary[] {
  const lines = sourceLines(text);
  const boundaries: Array<Omit<EmploymentBoundary, "endOffset">> = [];
  const hasEligibleBoundaryFrom = (startOffset: number) => boundaries.some((boundary) => boundary.evidenceEligible && boundary.startOffset >= startOffset);
  let workSectionStart: number | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const value = line.text.trim();
    if (!value) continue;
    if (workHistoryHeading.test(value)) {
      workSectionStart = line.end < text.length ? line.end + 1 : line.end;
      continue;
    }
    if (nonEmploymentSectionHeading.test(sectionHeadingCandidate(value))) {
      if (workSectionStart !== undefined && !hasEligibleBoundaryFrom(workSectionStart)) {
        boundaries.push({ startOffset: workSectionStart, contentStartOffset: workSectionStart, evidenceEligible: true });
      }
      boundaries.push({ startOffset: line.start, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: false });
      workSectionStart = undefined;
      continue;
    }
    const combined = /^(.+?)\s+[-–—]\s+(.+?)(?:\s*[|,]\s*(.+))?$/.exec(value);
    if (combined && (dateRange.test(combined[3] ?? "") || companySuffix.test(combined[1]))) {
      const dates = dateRange.exec(combined[3] ?? "");
      boundaries.push({ startOffset: line.start, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: true, employer: combined[1].trim(), roleTitle: combined[2].trim(), ...(dates ? { startDate: dates[1], endDate: dates[2] } : {}) });
      continue;
    }
    const roleWithDates = /^(.+?)\s*[|,]\s*(.+)$/.exec(value);
    const dates = dateRange.exec(roleWithDates?.[2] ?? "");
    if (roleWithDates && dates) {
      const previous = lines[index - 1];
      const previousValue = previous?.text.trim() ?? "";
      const explicitEmployer = previousValue && companySuffix.test(previousValue) && !workHistoryHeading.test(previousValue) ? previous : undefined;
      boundaries.push({ startOffset: explicitEmployer?.start ?? line.start, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: true, ...(explicitEmployer ? { employer: previousValue } : {}), roleTitle: roleWithDates[1].trim(), startDate: dates[1], endDate: dates[2] });
    }
  }
  if (workSectionStart !== undefined && !hasEligibleBoundaryFrom(workSectionStart)) boundaries.push({ startOffset: workSectionStart, contentStartOffset: workSectionStart, evidenceEligible: true });
  return boundaries.map((boundary, index) => ({ ...boundary, endOffset: boundaries[index + 1]?.startOffset ?? text.length })).filter((boundary) => boundary.endOffset > boundary.contentStartOffset);
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
  let bulletCandidate: Candidate | undefined;
  let paragraphStart: number | undefined;
  let paragraphEnd: number | undefined;
  const flushBullet = () => {
    if (!bulletCandidate) return;
    candidates.push(bulletCandidate);
    bulletCandidate = undefined;
  };
  const flushParagraph = () => {
    if (paragraphStart === undefined || paragraphEnd === undefined) return;
    const value = text.slice(paragraphStart, paragraphEnd);
    if (hasEvidenceContent(value)) candidates.push({ startOffset: paragraphStart, endOffset: paragraphEnd, text: value, bullet: false });
    paragraphStart = undefined;
    paragraphEnd = undefined;
  };

  lines.forEach((line) => {
    if (!line.text.trim()) {
      flushBullet();
      flushParagraph();
      return;
    }
    if (isBulletLine(line.text)) {
      flushBullet();
      flushParagraph();
      if (hasEvidenceContent(line.text)) bulletCandidate = { startOffset: line.start, endOffset: line.end, text: line.text, bullet: true };
      return;
    }
    if (bulletCandidate) {
      if (canContinueBullet(bulletCandidate.text, line.text)) {
        bulletCandidate = { ...bulletCandidate, endOffset: line.end, text: text.slice(bulletCandidate.startOffset, line.end), composed: true };
        return;
      }
      flushBullet();
    }
    paragraphStart ??= line.start;
    paragraphEnd = line.end;
  });
  flushBullet();
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

  const boundaries = employmentBoundaries(canonicalText);
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
  const employmentRecords: ResumeEmploymentRecord[] = [];
  const evidenceRecords: ResumeEvidenceRecord[] = [];
  const warnings: ResumeEvidenceExtractionIssue[] = [];
  const seenCandidateText = new Map<string, number>();
  let bulletIndex = 0;

  for (const boundary of boundaries) {
    if (!boundary.evidenceEligible) continue;
    const employmentId = `employment:${input.bundleId}:${boundary.startOffset}`;
    const employmentSpanId = `span:${input.documentId}:employment:${boundary.startOffset}`;
    if (!reserveId(employmentId) || !reserveId(employmentSpanId)) return { ok: false, issues: [issue("duplicate_generated_id", "error", "employmentRecords", "A deterministic employment identity collided with another identity.")] };
    const employmentText = canonicalText.slice(boundary.startOffset, boundary.endOffset);
    sourceSpans.push({ id: employmentSpanId, documentId: input.documentId, sourceType: "resume_paste", employmentRecordId: employmentId, startOffset: boundary.startOffset, endOffset: boundary.endOffset, originalText: employmentText });
    employmentRecords.push({
      id: employmentId,
      ...(boundary.employer ? { employerName: sourced(boundary.employer, employmentSpanId, input.parserVersion) } : {}),
      ...(boundary.roleTitle ? { roleTitle: sourced(boundary.roleTitle, employmentSpanId, input.parserVersion) } : {}),
      ...(boundary.startDate ? { startDate: sourced(boundary.startDate, employmentSpanId, input.parserVersion) } : {}),
      ...(boundary.endDate ? { endDate: sourced(boundary.endDate, employmentSpanId, input.parserVersion) } : {}),
      sourceSpanIds: [employmentSpanId],
      reviewStatus: "unreviewed",
      warnings: [],
    });
    const localCandidates = segmentCandidates(canonicalText.slice(boundary.contentStartOffset, boundary.endOffset)).map((candidate) => ({ ...candidate, startOffset: candidate.startOffset + boundary.contentStartOffset, endOffset: candidate.endOffset + boundary.contentStartOffset }));
    for (const candidate of localCandidates) {
      const index = evidenceRecords.length;
      const sequence = index + 1;
      const spanId = `span:${input.documentId}:${sequence}`;
      const evidenceId = candidate.composed
        ? `evidence:${input.bundleId}:${sequence}:${candidate.startOffset}-${candidate.endOffset}:${stableCandidateFingerprint(candidate.text)}`
        : `evidence:${input.bundleId}:${sequence}`;
      if (!reserveId(spanId) || !reserveId(evidenceId)) return { ok: false, issues: [issue("duplicate_generated_id", "error", `evidenceRecords[${index}]`, "A deterministic child ID collided with another identity.")] };
      if (canonicalText.slice(candidate.startOffset, candidate.endOffset) !== candidate.text) return { ok: false, issues: [issue("source_span_generation_failed", "error", `sourceSpans[${sequence}]`, "A deterministic source span could not be reproduced from canonical text.")] };
      sourceSpans.push({ id: spanId, documentId: input.documentId, sourceType: "resume_paste", employmentRecordId: employmentId, ...(candidate.bullet ? { bulletIndex: bulletIndex++ } : {}), startOffset: candidate.startOffset, endOffset: candidate.endOffset, originalText: candidate.text });
      evidenceRecords.push({ id: evidenceId, employmentRecordId: employmentId, sourceSpanIds: [spanId], sourceText: candidate.text, reviewStatus: "unreviewed", processingStatus: "source_provided", extractionMethod: "deterministic", warnings: [] });
      if (isHeadingLike(candidate.text)) warnings.push(issue("ambiguous_segmentation", "warning", `evidenceRecords[${index}]`, "A short uppercase candidate may require segmentation review."));
      const previous = seenCandidateText.get(candidate.text);
      if (previous !== undefined) warnings.push(issue("duplicate_evidence_candidate", "warning", `evidenceRecords[${index}]`, "An exact candidate is repeated elsewhere in the source and was retained separately."));
      else seenCandidateText.set(candidate.text, index);
    }
  }

  if (boundaries.length === 0) {
    segmentCandidates(canonicalText).forEach((_, index) => warnings.push(issue("unassigned_evidence_candidate", "warning", `evidenceRecords[${index}]`, "Evidence could not be assigned to a source-provenanced employment context.")));
  }

  if (evidenceRecords.length === 0) warnings.push(issue("no_evidence_candidates", "warning", "evidenceRecords", "No safe evidence candidates were produced; intake review must not be initialized."));

  const bundle: ResumeEvidenceBundle = {
    schemaVersion: RESUME_EVIDENCE_SCHEMA_VERSION,
    id: input.bundleId,
    sourceDocuments: [{ id: input.documentId, sourceType: "resume_paste" }],
    sourceSpans,
    employmentRecords,
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
