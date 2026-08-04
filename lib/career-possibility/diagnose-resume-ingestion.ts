import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";
import { extractResumeEvidenceFromText } from "./resume-evidence-text-extractor";
import { bridgeEvidenceToProvisionalSignals } from "./provisional-evidence-signal-bridge";
import { provisionalEvidenceSignalPolicy } from "./provisional-evidence-signal-policy";
import { mapProvisionalResumeEvidence } from "./provisional-resume-capability-mapper";
import { provisionalResumeMappingPolicy } from "./provisional-resume-mapping-policy";
import { buildProvisionalCareerMapFromText } from "./build-provisional-career-map-from-text";

const bullet = /^\s*[-*•‣▪◦]\s+|^\s*\d+[.)]\s+/;
const dateRange = /\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current)\b/i;
const section = /^(?:experience|work experience|professional experience|employment history|education|skills|summary|profile|projects|certifications?)$/i;
const actions = /\b(?:built|created|developed|implemented|delivered|launched|drove|led|owned|managed|partnered|collaborated|aligned|coordinated|analysed|analyzed|assessed|evaluated|identified|synthesised|synthesized|translated|recommended|influenced|improved|optimised|optimized|streamlined|standardised|standardized|transformed|scaled|governed|enabled|automated|established|designed|supported|redesigned)\b/i;
const outcomes = /(?:\b\d+(?:\.\d+)?%?\b|\b(?:increased|reduced|improved|saved|grew|accelerated|resulted|yielded)\b)/i;
const ownership = /\b(?:owned|led|managed|drove|established|governed)\b/i;

export type ResumeIngestionDiagnostic = Readonly<{
  textQuality: Readonly<{ characterCount: number; nonEmptyLineCount: number; replacementCharacterCount: number; controlCharacterCount: number; veryShortLineRatio: number; singleWordLineRatio: number; hyphenatedLineBreakCount: number; suspectedColumnOrderDiscontinuities: number; duplicateLineCount: number; headerFooterRepetitionCount: number; dateFragmentCount: number; bulletMarkerCount: number }>;
  structure: Readonly<{ recognisedSectionCount: number; employmentSectionDetected: boolean; employmentRecordCount: number; candidateStatementCount: number; orphanLineCount: number; unassignedLineCount: number; multiLineBulletReconstructionCount: number; dateRangeCount: number; titleCompanyBoundaryCount: number }>;
  evidence: Readonly<{ count: number; validLocatorCount: number; actionBearingCount: number; outcomeBearingCount: number; ownershipBearingCount: number; structurallyRejectedCount: number; averageBoundedExcerptLength: number }>;
  signals: Readonly<{ structuredCount: number; unresolvedCount: number; unsupportedCount: number; matchedRuleIds: readonly string[]; unresolvedReasonCounts: Readonly<Record<string, number>>; unsupportedReasonCounts: Readonly<Record<string, number>>; signalTokenFrequency: Readonly<Record<string, number>> }>;
  mappings: Readonly<{ autoAdmittedCount: number; unresolvedCount: number; unsupportedCount: number; capabilityIds: readonly string[]; relationshipCounts: Readonly<Record<string, number>>; multipleCandidateCount: number; relationshipConflictCount: number; noCanonicalRuleCount: number }>;
  materialization: Readonly<{ success: boolean; capabilityCount: number; directEvidenceCount: number; transferableEvidenceCount: number; unresolvedRetainedCount: number; unexpectedlyLostEvidenceCount: number; failureCode?: string }>;
  funnel: Readonly<{ extractedCharacters: number; candidateStatements: number; evidenceRecords: number; structuredSignals: number; autoAdmittedMappings: number; materializedCapabilities: number; evidencePerCandidate: number; structuredPerEvidence: number; admittedPerEvidence: number; admittedPerStructured: number }>;
}>;

const ratio = (top: number, bottom: number) => bottom ? Number((top / bottom).toFixed(3)) : 0;
const bump = (record: Record<string, number>, key: string) => { record[key] = (record[key] ?? 0) + 1; };

/** Audit-only aggregate diagnostics. Source text and excerpts never leave this function. */
export async function diagnoseResumeIngestion(input: { extractedText: string; capabilityDefinitions: readonly CareerMapCapabilityDefinition[]; capabilityDefinitionVersion: string }): Promise<ResumeIngestionDiagnostic> {
  const text = input.extractedText.replace(/\r\n?/g, "\n");
  const lines = text.split("\n"); const nonEmpty = lines.map((value) => value.trim()).filter(Boolean);
  const frequencies = new Map<string, number>(); nonEmpty.forEach((value) => frequencies.set(value, (frequencies.get(value) ?? 0) + 1));
  const bulletIndexes = lines.flatMap((value, index) => bullet.test(value) ? [index] : []);
  const multiLine = bulletIndexes.filter((index) => { const next = lines[index + 1] ?? ""; return Boolean(next.trim()) && !bullet.test(next) && !section.test(next.trim()) && !dateRange.test(next); }).length;
  const extracted = extractResumeEvidenceFromText({ text, documentId: "diagnostic-document", bundleId: "diagnostic-bundle", extractionRunId: "diagnostic-run", parserVersion: "diagnostic/1", normalisationVersion: "diagnostic/1" });
  const records = extracted.ok ? extracted.bundle.evidenceRecords : [];
  const signalReasons: Record<string, number> = {}; const unsupportedReasons: Record<string, number> = {}; const tokens: Record<string, number> = {}; const relationships: Record<string, number> = {};
  const matchedRuleIds = new Set<string>(); const capabilityIds = new Set<string>();
  let structuredCount = 0, signalUnresolved = 0, signalUnsupported = 0, admitted = 0, mappingUnresolved = 0, mappingUnsupported = 0, multiple = 0, conflicts = 0, noRule = 0;
  for (const record of records) {
    const bridged = await bridgeEvidenceToProvisionalSignals({ evidence: record, sourceSpans: extracted.ok ? extracted.bundle.sourceSpans : [] }, provisionalEvidenceSignalPolicy);
    if (bridged.status === "structured") {
      structuredCount += 1; bridged.evidence.matchedSignalRuleIds.forEach((id) => matchedRuleIds.add(id)); bridged.evidence.signals.forEach((value) => bump(tokens, `${value.field}:${value.value}`));
      const mapped = await mapProvisionalResumeEvidence({ evidence: bridged.evidence, policy: provisionalResumeMappingPolicy, capabilityDefinitions: input.capabilityDefinitions, capabilityDefinitionVersion: input.capabilityDefinitionVersion });
      if (mapped.status === "auto_admitted") { admitted += 1; capabilityIds.add(mapped.mapping.capabilityId); bump(relationships, mapped.mapping.relationship); }
      else { if (mapped.status === "unsupported") mappingUnsupported += 1; else mappingUnresolved += 1; bump(mapped.unresolved.reason === "multiple_candidates" ? signalReasons : unsupportedReasons, mapped.unresolved.reason); if (mapped.unresolved.reason === "multiple_candidates") multiple += 1; if (mapped.unresolved.reason === "relationship_conflict") conflicts += 1; if (mapped.unresolved.reason === "no_canonical_rule") noRule += 1; }
    } else {
      if (bridged.status === "unsupported") signalUnsupported += 1; else signalUnresolved += 1;
      bump(bridged.status === "unsupported" ? unsupportedReasons : signalReasons, bridged.unresolved.reason);
      bridged.unresolved.matchedSignalRuleIds.forEach((id) => matchedRuleIds.add(id));
    }
  }
  const built = await buildProvisionalCareerMapFromText({ extractedText: text, sourceMetadata: { fileName: "redacted", mediaType: "text/plain", byteSize: new TextEncoder().encode(text).byteLength, sourceRevision: "diagnostic-source-revision" }, identity: { documentId: "diagnostic-build-document", bundleId: "diagnostic-build-bundle", extractionRunId: "diagnostic-build-run" }, versions: { evidenceParserVersion: "diagnostic/1", evidenceNormalisationVersion: "diagnostic/1", capabilityDefinitionVersion: input.capabilityDefinitionVersion }, capabilityDefinitions: input.capabilityDefinitions, createdAt: "diagnostic", updatedAt: "diagnostic" });
  const capabilityCount = built.status === "success" ? built.state.capabilities.length : 0;
  const direct = built.status === "success" ? built.state.capabilities.reduce((sum, value) => sum + value.directEvidenceIds.length, 0) : 0;
  const transferable = built.status === "success" ? built.state.capabilities.reduce((sum, value) => sum + value.transferableEvidenceIds.length, 0) : 0;
  const candidates = Math.max(records.length, bulletIndexes.length || (nonEmpty.length ? 1 : 0));
  return Object.freeze({
    textQuality: Object.freeze({ characterCount: text.length, nonEmptyLineCount: nonEmpty.length, replacementCharacterCount: (text.match(/�/g) ?? []).length, controlCharacterCount: (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) ?? []).length, veryShortLineRatio: ratio(nonEmpty.filter((value) => value.length < 12).length, nonEmpty.length), singleWordLineRatio: ratio(nonEmpty.filter((value) => /^\S+$/.test(value)).length, nonEmpty.length), hyphenatedLineBreakCount: (text.match(/[A-Za-z]-\n[a-z]/g) ?? []).length, suspectedColumnOrderDiscontinuities: lines.filter((value, index) => dateRange.test(value) && index > 0 && section.test((lines[index - 1] ?? "").trim())).length, duplicateLineCount: [...frequencies.values()].reduce((sum, value) => sum + Math.max(0, value - 1), 0), headerFooterRepetitionCount: [...frequencies].filter(([value, count]) => count > 1 && (value.length < 40 || /^\d+$/.test(value))).reduce((sum, [, count]) => sum + count - 1, 0), dateFragmentCount: (text.match(/\b(?:19|20)\d{2}\b/g) ?? []).length, bulletMarkerCount: bulletIndexes.length }),
    structure: Object.freeze({ recognisedSectionCount: nonEmpty.filter((value) => section.test(value)).length, employmentSectionDetected: nonEmpty.some((value) => /^(?:experience|work experience|professional experience|employment history)$/i.test(value)), employmentRecordCount: extracted.ok ? extracted.bundle.employmentRecords.length : 0, candidateStatementCount: candidates, orphanLineCount: extracted.ok ? Math.max(0, nonEmpty.length - records.length - extracted.bundle.employmentRecords.length - nonEmpty.filter((value) => section.test(value)).length) : nonEmpty.length, unassignedLineCount: extracted.ok && extracted.bundle.employmentRecords.length === 0 ? nonEmpty.length : 0, multiLineBulletReconstructionCount: multiLine, dateRangeCount: lines.filter((value) => dateRange.test(value)).length, titleCompanyBoundaryCount: extracted.ok ? extracted.bundle.employmentRecords.filter((value) => value.employerName || value.roleTitle).length : 0 }),
    evidence: Object.freeze({ count: records.length, validLocatorCount: records.filter((value) => value.sourceSpanIds.length > 0).length, actionBearingCount: records.filter((value) => actions.test(value.sourceText)).length, outcomeBearingCount: records.filter((value) => outcomes.test(value.sourceText)).length, ownershipBearingCount: records.filter((value) => ownership.test(value.sourceText)).length, structurallyRejectedCount: extracted.ok ? 0 : extracted.issues.filter((value) => value.severity === "error").length, averageBoundedExcerptLength: records.length ? Math.round(records.reduce((sum, value) => sum + Math.min(value.sourceText.length, 160), 0) / records.length) : 0 }),
    signals: Object.freeze({ structuredCount, unresolvedCount: signalUnresolved, unsupportedCount: signalUnsupported, matchedRuleIds: Object.freeze([...matchedRuleIds].sort()), unresolvedReasonCounts: Object.freeze(signalReasons), unsupportedReasonCounts: Object.freeze(unsupportedReasons), signalTokenFrequency: Object.freeze(tokens) }),
    mappings: Object.freeze({ autoAdmittedCount: admitted, unresolvedCount: mappingUnresolved, unsupportedCount: mappingUnsupported, capabilityIds: Object.freeze([...capabilityIds].sort()), relationshipCounts: Object.freeze(relationships), multipleCandidateCount: multiple, relationshipConflictCount: conflicts, noCanonicalRuleCount: noRule }),
    materialization: Object.freeze({ success: built.status === "success", capabilityCount, directEvidenceCount: direct, transferableEvidenceCount: transferable, unresolvedRetainedCount: built.status === "success" ? built.state.unresolvedEvidence.length : built.audit?.unresolvedCount ?? 0, unexpectedlyLostEvidenceCount: built.audit?.unexpectedlyLostEvidenceCount ?? 0, ...(built.status === "failure" ? { failureCode: built.code } : {}) }),
    funnel: Object.freeze({ extractedCharacters: text.length, candidateStatements: candidates, evidenceRecords: records.length, structuredSignals: structuredCount, autoAdmittedMappings: admitted, materializedCapabilities: capabilityCount, evidencePerCandidate: ratio(records.length, candidates), structuredPerEvidence: ratio(structuredCount, records.length), admittedPerEvidence: ratio(admitted, records.length), admittedPerStructured: ratio(admitted, structuredCount) }),
  });
}
