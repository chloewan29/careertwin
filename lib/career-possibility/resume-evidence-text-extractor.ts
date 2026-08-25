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

const performedResponsibilityProse = /^(?:(?:responsible|accountable)\s+(?:for|to)|reporting\s+(?:to|into|across|on))\b/i;
const performedActionProse = /^\p{L}+\b[\s\S]*\b(?:and|with|across|through|using|including|into|for|to|of|the|a|an)\b/iu;

function qualifiesAsPerformedProfessionalEvidence(candidate: Candidate): boolean {
  if (!hasEvidenceContent(candidate.text)) return false;
  if (candidate.bullet) return true;
  const firstLine = candidate.text.split("\n", 1)[0].trim();
  if (isStructuralBoundaryLine(firstLine)) return false;
  if (/^(?:summary|profile|overview|introduction)\b/i.test(firstLine)) return false;
  return performedResponsibilityProse.test(firstLine) || performedActionProse.test(firstLine);
}

function isHeadingLike(text: string): boolean {
  const value = text.trim();
  return !value.includes("\n") && value.length <= 80 && /\p{Lu}/u.test(value) && !/\p{Ll}/u.test(value);
}

function isStructuralBoundaryLine(text: string): boolean {
  const value = text.trim();
  if (!value) return true;
  if (isHeadingLike(value) || isProfessionalSectionHeading(value) || isNonEmploymentSectionHeading(value) || dateRange.test(value) || parseDatePeriod(value, true)) return true;
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
const professionalProjectHeading = /^(?:(?:personal|professional|selected|independent)\s+)?projects?(?:\s+(?:experience|portfolio))?$/i;
/** Non-employment sections must not inherit employment provenance; they get their own provenance-free boundary. */
const nonEmploymentSectionHeading = /^(?:education|skills|key skills|technical skills|core skills|qualifications?|certifications|certificates|awards|honors|honours|languages|interests|volunteering|volunteer|publications|activities|leadership|affiliations|memberships|references)$/i;
const monthName = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const datedPoint = `(?:${monthName}\\s+)?(?:19|20)\\d{2}`;
const datedEndPoint = `(?:${datedPoint}|present|current|now)`;
const dateRange = new RegExp(`\\b(${datedPoint})\\s*(?:[-\\u2013\\u2014]|to)\\s*(${datedEndPoint})\\b`, "i");
const tabularDateRange = new RegExp(`^\\s*(${datedPoint})\\s+(?:[^\\s\\d]{1,4}\\s+)?(${datedEndPoint})\\s*$`, "i");
const companySuffix = /\b(?:inc\.?|llc|ltd\.?|limited|corp\.?|corporation|company|co\.?|group|plc|pty\.?\s+ltd\.?)$/i;
const roleTitleKeyword = /\b(?:accountant|administrator|advisor|analyst|architect|consultant|controller|coordinator|developer|director|engineer|executive|head|lead|manager|officer|owner|partner|producer|researcher|scientist|specialist|strategist|supervisor|designer)\b/i;

type ParsedDatePeriod = { startDate: string; endDate: string };
type EmploymentMetadata = Pick<EmploymentBoundary, "employer" | "roleTitle">;

function parseDatePeriod(value: string, allowTabularWhitespace = false): ParsedDatePeriod | undefined {
  const trimmed = value.trim();
  const explicit = dateRange.exec(trimmed);
  if (explicit && explicit.index === 0 && explicit[0].length === trimmed.length) {
    return { startDate: explicit[1], endDate: explicit[2] };
  }
  if (!allowTabularWhitespace) return undefined;
  const tabular = tabularDateRange.exec(trimmed);
  return tabular ? { startDate: tabular[1], endDate: tabular[2] } : undefined;
}

function isProfessionalSectionHeading(value: string): boolean {
  return workHistoryHeading.test(value) || professionalProjectHeading.test(value);
}

function isNonEmploymentSectionHeading(value: string): boolean {
  return nonEmploymentSectionHeading.test(sectionHeadingCandidate(value));
}

function isLikelyRoleTitle(value: string): boolean {
  return roleTitleKeyword.test(value);
}

function orderedEmploymentMetadata(first: string, second: string, defaultOrder: "title_company" | "company_title"): EmploymentMetadata {
  if (companySuffix.test(first) || (isLikelyRoleTitle(second) && !isLikelyRoleTitle(first))) return { employer: first, roleTitle: second };
  if (companySuffix.test(second) || (isLikelyRoleTitle(first) && !isLikelyRoleTitle(second))) return { employer: second, roleTitle: first };
  return defaultOrder === "title_company" ? { roleTitle: first, employer: second } : { employer: first, roleTitle: second };
}

function employmentMetadataFromHeader(value: string, defaultOrder: "title_company" | "company_title" = "title_company"): EmploymentMetadata {
  const parts = value.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2) return orderedEmploymentMetadata(parts[0], parts[1], defaultOrder);
  const dashParts = /^(.+?)\s+[-\u2013\u2014]\s+(.+)$/.exec(value);
  if (dashParts) return orderedEmploymentMetadata(dashParts[1].trim(), dashParts[2].trim(), "company_title");
  return value ? { roleTitle: value } : {};
}


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

function previousNonBlankLine(lines: ReturnType<typeof sourceLines>, beforeIndex: number, ordinal = 1) {
  let remaining = ordinal;
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    if (!lines[index].text.trim()) continue;
    remaining -= 1;
    if (remaining === 0) return lines[index];
  }
  return undefined;
}

function nextNonBlankLine(lines: ReturnType<typeof sourceLines>, afterIndex: number, ordinal = 1) {
  let remaining = ordinal;
  for (let index = afterIndex + 1; index < lines.length; index += 1) {
    if (!lines[index].text.trim()) continue;
    remaining -= 1;
    if (remaining === 0) return { line: lines[index], index };
  }
  return undefined;
}

function isLikelyEmploymentMetadataLine(value: string): boolean {
  const words = value.match(/\p{L}+/gu) ?? [];
  return value.length <= 80
    && words.length > 0
    && words.length <= 10
    && !/[.!?;]/.test(value)
    && !isBulletLine(value)
    && !parseDatePeriod(value, true)
    && !isProfessionalSectionHeading(value)
    && !isNonEmploymentSectionHeading(value)
    && !performedActionProse.test(value)
    && !performedResponsibilityProse.test(value)
    && !/^\p{L}+(?:ed|ing)\b/iu.test(value);
}

/** Conservative structural boundaries only; values are copied from explicit headings. */
function employmentBoundaries(text: string): EmploymentBoundary[] {
  const lines = sourceLines(text);
  const boundaries: Array<Omit<EmploymentBoundary, "endOffset">> = [];
  const hasEligibleBoundaryFrom = (startOffset: number) => boundaries.some((boundary) => boundary.evidenceEligible && boundary.startOffset >= startOffset);
  let workSectionStart: number | undefined;
  let sectionMode: "unscoped" | "professional" | "project" | "non_employment" = "unscoped";
  const closeUnboundedWorkSection = () => {
    if (workSectionStart !== undefined && !hasEligibleBoundaryFrom(workSectionStart)) {
      boundaries.push({ startOffset: workSectionStart, contentStartOffset: workSectionStart, evidenceEligible: true });
    }
    workSectionStart = undefined;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const value = line.text.trim();
    if (!value) continue;
    if (workHistoryHeading.test(value)) {
      workSectionStart = line.end < text.length ? line.end + 1 : line.end;
      sectionMode = "professional";
      continue;
    }
    if (professionalProjectHeading.test(sectionHeadingCandidate(value))) {
      closeUnboundedWorkSection();
      boundaries.push({ startOffset: line.start, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: false });
      sectionMode = "project";
      continue;
    }
    if (isNonEmploymentSectionHeading(value)) {
      closeUnboundedWorkSection();
      boundaries.push({ startOffset: line.start, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: false });
      sectionMode = "non_employment";
      continue;
    }
    if (sectionMode === "non_employment") continue;

    // Tabular format: "Role or employer\tMonth Year [separator] Month Year".
    // A dedicated date cell is structural enough to accept whitespace between
    // date endpoints when document extraction has discarded the visual dash.
    const tabIdx = value.indexOf("\t");
    if (tabIdx > 0) {
      const beforeTab = value.slice(0, tabIdx).trim();
      const afterTab = value.slice(tabIdx + 1).trim();
      const tabDates = parseDatePeriod(afterTab, true);
      if (tabDates && beforeTab && !workHistoryHeading.test(beforeTab) && !nonEmploymentSectionHeading.test(sectionHeadingCandidate(beforeTab))) {
        let contentStart = line.end < text.length ? line.end + 1 : line.end;
        let metadata: EmploymentMetadata = employmentMetadataFromHeader(beforeTab);
        const next = nextNonBlankLine(lines, index);
        if (next && isLikelyEmploymentMetadataLine(next.line.text.trim())) {
          metadata = orderedEmploymentMetadata(beforeTab, next.line.text.trim(), "company_title");
          contentStart = next.line.end < text.length ? next.line.end + 1 : next.line.end;
          index = next.index;
        }
        boundaries.push({ startOffset: line.start, contentStartOffset: contentStart, evidenceEligible: true, ...metadata, ...tabDates });
        continue;
      }
    }

    // Explicit pipe format: TITLE | COMPANY | DATE (or COMPANY | TITLE | DATE).
    const pipeParts = value.split("|").map((part) => part.trim()).filter(Boolean);
    if (pipeParts.length >= 2) {
      const pipeDates = parseDatePeriod(pipeParts.at(-1)!, true);
      if (pipeDates) {
        const headerParts = pipeParts.slice(0, -1);
        let metadata: EmploymentMetadata = headerParts.length >= 2
          ? orderedEmploymentMetadata(headerParts[0], headerParts.slice(1).join(" | "), "title_company")
          : employmentMetadataFromHeader(headerParts[0] ?? "");
        let startOffset = line.start;
        if (!metadata.employer) {
          const previous = previousNonBlankLine(lines, index);
          const previousValue = previous?.text.trim() ?? "";
          if (previous && companySuffix.test(previousValue) && !isProfessionalSectionHeading(previousValue)) {
            metadata = { ...metadata, employer: previousValue };
            startOffset = previous.start;
          }
        }
        boundaries.push({ startOffset, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: true, ...metadata, ...pipeDates });
        continue;
      }
    }

    const combined = /^(.+?)\s+[-\u2013\u2014]\s+(.+?)(?:\s*[|,]\s*(.+))?$/.exec(value);

    // combined[2] is a date range with no third component: "Role – DateRange"
    if (combined && (dateRange.test(combined[3] ?? "") || companySuffix.test(combined[1]) || (dateRange.test(combined[2]) && combined[3] === undefined))) {
      const dates = parseDatePeriod(combined[3] ?? combined[2]);
      const isRoleDateFormat = combined[3] === undefined && Boolean(parseDatePeriod(combined[2]));
      boundaries.push({ startOffset: line.start, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: true, ...(isRoleDateFormat ? { roleTitle: combined[1].trim() } : { employer: combined[1].trim(), roleTitle: combined[2].trim() }), ...(dates ?? {}) });
      continue;
    }
    const roleWithDates = /^(.+?)\s*[|,]\s*(.+)$/.exec(value);
    const dates = parseDatePeriod(roleWithDates?.[2] ?? "");
    if (roleWithDates && dates) {
      let contentStart = line.end < text.length ? line.end + 1 : line.end;
      let startOff = line.start;
      let employer: string | undefined;

      const previous = lines[index - 1];
      const previousValue = previous?.text.trim() ?? "";
      if (previousValue && companySuffix.test(previousValue) && !workHistoryHeading.test(previousValue)) {
        employer = previousValue;
        startOff = previous.start;
      } else {
        const next = nextNonBlankLine(lines, index);
        if (next) {
          const nextVal = next.line.text.trim();
          if (!isBulletLine(nextVal) && !parseDatePeriod(nextVal, true) && !isProfessionalSectionHeading(nextVal) && !isNonEmploymentSectionHeading(nextVal)) {
            if (isLikelyEmploymentMetadataLine(nextVal)) {
              employer = nextVal;
              contentStart = next.line.end < text.length ? next.line.end + 1 : next.line.end;
              index = next.index;
            }
          }
        }
      }
      boundaries.push({ startOffset: startOff, contentStartOffset: contentStart, evidenceEligible: true, ...(employer ? { employer } : {}), roleTitle: roleWithDates[1].trim(), ...dates });
      continue;
    }
    const standaloneDates = parseDatePeriod(value, true);
    if (standaloneDates) {
      const roleLine = previousNonBlankLine(lines, index);
      const roleTitle = roleLine?.text.trim() ?? "";
      if (roleLine && roleTitle && !isBulletLine(roleLine.text) && !isProfessionalSectionHeading(roleTitle) && !isNonEmploymentSectionHeading(roleTitle) && !parseDatePeriod(roleTitle, true)) {
        const employerLine = previousNonBlankLine(lines, index, 2);
        const employer = employerLine?.text.trim() ?? "";
        const hasSecondMetadataLine = employerLine
          && isLikelyEmploymentMetadataLine(employer)
          && !isProfessionalSectionHeading(employer)
          && !isNonEmploymentSectionHeading(employer);
        const metadata = hasSecondMetadataLine
          ? orderedEmploymentMetadata(employer, roleTitle, "company_title")
          : employmentMetadataFromHeader(roleTitle);
        boundaries.push({ startOffset: hasSecondMetadataLine ? employerLine.start : roleLine.start, contentStartOffset: line.end < text.length ? line.end + 1 : line.end, evidenceEligible: true, ...metadata, ...standaloneDates });
      }
    }
  }
  closeUnboundedWorkSection();
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
    for (let candidateIndex = 0; candidateIndex < localCandidates.length; candidateIndex += 1) {
      const candidate = localCandidates[candidateIndex];
      if (!qualifiesAsPerformedProfessionalEvidence(candidate)) {
        warnings.push(issue("ambiguous_segmentation", "info", `employmentRecords[${employmentRecords.length - 1}].contextCandidates[${candidateIndex}]`, "A substantive source unit was retained in its employment source span and classified as non-evidence/context."));
        continue;
      }
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
