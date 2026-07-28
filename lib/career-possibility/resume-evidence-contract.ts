export const RESUME_EVIDENCE_SCHEMA_VERSION = "1.0.0" as const;

export type EvidenceProvenanceCategory = "user_provided" | "normalised" | "deterministically_derived" | "model_inferred" | "unverified_suggestion" | "mock";
export type EvidenceReviewStatus = "unreviewed" | "confirmed" | "edited" | "rejected";
export type EvidenceProcessingStatus = "source_provided" | "normalised" | "inferred" | "unsupported";
export type EvidenceExtractionMethod = "manual" | "deterministic" | "model";
export type ResumeSourceType = "resume_paste" | "resume_upload" | "manual";

export type ResumeSourceDocument = {
  id: string;
  sourceType: ResumeSourceType;
  originalFileName?: string;
  mediaType?: string;
  contentHash?: string;
  createdAt?: string;
};

export type ResumeSourceSpan = {
  id: string;
  documentId: string;
  sourceType: ResumeSourceType;
  pageNumber?: number;
  section?: string;
  employmentRecordId?: string;
  bulletIndex?: number;
  startOffset?: number;
  endOffset?: number;
  originalText: string;
};

/** Source facts keep their spans; interpretations remain visibly separate. */
export type ProvenancedField<T> = {
  value: T;
  provenance: EvidenceProvenanceCategory;
  sourceSpanIds: string[];
  method: EvidenceExtractionMethod;
  methodVersion?: string;
  reviewStatus: EvidenceReviewStatus;
};

export type ResumeEmploymentRecord = {
  id: string;
  employerName?: ProvenancedField<string>;
  roleTitle?: ProvenancedField<string>;
  startDate?: ProvenancedField<string>;
  endDate?: ProvenancedField<string>;
  location?: ProvenancedField<string>;
  sourceSpanIds: string[];
  reviewStatus: EvidenceReviewStatus;
  warnings: string[];
};

export type ResumeEvidenceOutcome = { text: string; kind: "quantitative" | "qualitative" | "not_stated" };

/** Capability and role identifiers are intentionally absent from normalised evidence. */
export type ResumeEvidenceRecord = {
  id: string;
  employmentRecordId?: string;
  sourceSpanIds: string[];
  sourceText: string;
  displayText?: ProvenancedField<string>;
  action?: ProvenancedField<string>;
  context?: ProvenancedField<string>;
  outcome?: ProvenancedField<ResumeEvidenceOutcome>;
  reviewStatus: EvidenceReviewStatus;
  processingStatus: EvidenceProcessingStatus;
  extractionMethod: EvidenceExtractionMethod;
  warnings: string[];
};

export type EvidenceCapabilityRelationship = "direct_evidence" | "transferable_signal" | "possible";
export type EvidenceCapabilityMappingMethod = "deterministic" | "model" | "user";
export type ResumeEvidenceInterpretationProvenance = "user_provided" | "model_inferred" | "deterministically_derived" | "mock";

/** Mappings are auditable relationships, not properties of source evidence. */
export type EvidenceCapabilityMapping = {
  id: string;
  evidenceId: string;
  capabilityId?: string;
  proposedLabel?: string;
  relationship: EvidenceCapabilityRelationship;
  method: EvidenceCapabilityMappingMethod;
  rationale?: string;
  sourceSpanIds: string[];
  reviewStatus: EvidenceReviewStatus;
  alternatives?: Array<{ capabilityId: string; rationale?: string }>;
  /** Optional diagnostics only; never user-facing evidence quality. */
  modelMetadata?: { provider?: string; model?: string; runId?: string; methodVersion?: string };
};

export type ResumeEvidenceInterpretation = {
  id: string;
  evidenceId: string;
  kind: "transferability" | "context_inference" | "outcome_inference";
  text: string;
  /** User-provided text remains an interpretation; optional spans are contextual references, not verbatim provenance. */
  provenance: ResumeEvidenceInterpretationProvenance;
  sourceSpanIds: string[];
  reviewStatus: EvidenceReviewStatus;
  method: EvidenceExtractionMethod;
  methodVersion?: string;
};

/** Future Path relationships are derived later and do not belong in this source contract. */
export type ResumeEvidenceBundle = {
  schemaVersion: typeof RESUME_EVIDENCE_SCHEMA_VERSION;
  id: string;
  sourceDocuments: ResumeSourceDocument[];
  sourceSpans: ResumeSourceSpan[];
  employmentRecords: ResumeEmploymentRecord[];
  evidenceRecords: ResumeEvidenceRecord[];
  capabilityMappings: EvidenceCapabilityMapping[];
  interpretations?: ResumeEvidenceInterpretation[];
};

export type ResumeEvidenceValidationIssue = { code: string; path: string; message: string; severity: "error" | "warning" };
export type ResumeEvidenceValidationResult = { valid: boolean; issues: ResumeEvidenceValidationIssue[] };

const sourcedProvenance = new Set<EvidenceProvenanceCategory>(["user_provided", "normalised"]);
const nonEmpty = (value: string | undefined) => Boolean(value?.trim());

export function isReviewedEvidence(evidence: ResumeEvidenceRecord) {
  return evidence.reviewStatus === "confirmed" || evidence.reviewStatus === "edited";
}

export function isConfirmedCapabilityMapping(mapping: EvidenceCapabilityMapping) {
  return mapping.reviewStatus === "confirmed";
}

export function canRenderAsEvidenceBacked(mapping: EvidenceCapabilityMapping, evidence: ResumeEvidenceRecord) {
  return mapping.relationship === "direct_evidence" && isConfirmedCapabilityMapping(mapping) && isReviewedEvidence(evidence) && evidence.processingStatus !== "unsupported";
}

export function validateResumeEvidenceBundle(bundle: ResumeEvidenceBundle): ResumeEvidenceValidationResult {
  const issues: ResumeEvidenceValidationIssue[] = [];
  const add = (code: string, path: string, message: string, severity: "error" | "warning" = "error") => issues.push({ code, path, message, severity });
  const uniqueIds = <T extends { id: string }>(items: T[], path: string) => {
    const ids = new Set<string>();
    items.forEach((item, index) => {
      if (!nonEmpty(item.id)) add("empty_id", `${path}[${index}].id`, "ID must be non-empty.");
      else if (ids.has(item.id)) add("duplicate_id", `${path}[${index}].id`, `Duplicate ID ${item.id}.`);
      ids.add(item.id);
    });
    return ids;
  };
  if (bundle.schemaVersion !== RESUME_EVIDENCE_SCHEMA_VERSION) add("schema_version", "schemaVersion", "Unsupported schema version.");
  if (!nonEmpty(bundle.id)) add("empty_bundle_id", "id", "Bundle ID must be non-empty.");
  const documentIds = uniqueIds(bundle.sourceDocuments, "sourceDocuments");
  const spanIds = uniqueIds(bundle.sourceSpans, "sourceSpans");
  const employmentIds = uniqueIds(bundle.employmentRecords, "employmentRecords");
  const evidenceIds = uniqueIds(bundle.evidenceRecords, "evidenceRecords");
  uniqueIds(bundle.capabilityMappings, "capabilityMappings");
  uniqueIds(bundle.interpretations ?? [], "interpretations");
  const documentById = new Map(bundle.sourceDocuments.map((item) => [item.id, item]));
  const checkSpanRefs = (ids: string[], path: string, required = false) => {
    if (required && ids.length === 0) add("missing_source_span", path, "At least one source span is required.");
    ids.forEach((id, index) => { if (!spanIds.has(id)) add("unknown_source_span", `${path}[${index}]`, `Unknown source span ${id}.`); });
  };
  const checkField = <T>(field: ProvenancedField<T> | undefined, path: string) => {
    if (!field) return;
    checkSpanRefs(field.sourceSpanIds, `${path}.sourceSpanIds`, sourcedProvenance.has(field.provenance));
    if (typeof field.value === "string" && !nonEmpty(field.value)) add("empty_field", `${path}.value`, "Field value must be non-empty.");
    if (field.provenance === "model_inferred" && field.reviewStatus === "confirmed" && field.method !== "model") add("inference_method", `${path}.method`, "Model-inferred fields must preserve model method.");
    if (field.provenance === "unverified_suggestion" && field.reviewStatus === "confirmed") add("confirmed_suggestion", `${path}.reviewStatus`, "An unverified suggestion cannot become a sourced fact.", "warning");
  };
  bundle.sourceSpans.forEach((span, index) => {
    const path = `sourceSpans[${index}]`;
    const document = documentById.get(span.documentId);
    if (!documentIds.has(span.documentId)) add("unknown_document", `${path}.documentId`, `Unknown document ${span.documentId}.`);
    if (document && document.sourceType !== span.sourceType) add("source_type_mismatch", `${path}.sourceType`, "Span source type must match its document.");
    if (span.pageNumber !== undefined && span.pageNumber < 1) add("invalid_page", `${path}.pageNumber`, "Page number must be positive.");
    if (span.startOffset !== undefined && span.startOffset < 0) add("invalid_start_offset", `${path}.startOffset`, "Start offset must be non-negative.");
    if (span.startOffset !== undefined && span.endOffset !== undefined && span.endOffset <= span.startOffset) add("invalid_offset_range", `${path}.endOffset`, "End offset must be greater than start offset.");
    if (!nonEmpty(span.originalText)) add("empty_source_text", `${path}.originalText`, "Original text must be non-empty.");
  });
  bundle.employmentRecords.forEach((record, index) => {
    const path = `employmentRecords[${index}]`;
    checkSpanRefs(record.sourceSpanIds, `${path}.sourceSpanIds`, true);
    checkField(record.employerName, `${path}.employerName`); checkField(record.roleTitle, `${path}.roleTitle`);
    checkField(record.startDate, `${path}.startDate`); checkField(record.endDate, `${path}.endDate`); checkField(record.location, `${path}.location`);
  });
  bundle.evidenceRecords.forEach((record, index) => {
    const path = `evidenceRecords[${index}]`;
    if (record.employmentRecordId && !employmentIds.has(record.employmentRecordId)) add("unknown_employment", `${path}.employmentRecordId`, `Unknown employment ${record.employmentRecordId}.`);
    checkSpanRefs(record.sourceSpanIds, `${path}.sourceSpanIds`, true);
    if (!nonEmpty(record.sourceText)) add("empty_evidence_source", `${path}.sourceText`, "Evidence source text must be non-empty.");
    checkField(record.displayText, `${path}.displayText`); checkField(record.action, `${path}.action`); checkField(record.context, `${path}.context`); checkField(record.outcome, `${path}.outcome`);
    const outcome = record.outcome?.value;
    if (outcome && outcome.kind !== "not_stated" && !nonEmpty(outcome.text)) add("empty_outcome", `${path}.outcome.value.text`, "Stated outcomes require text.");
    if (outcome?.kind === "not_stated" && nonEmpty(outcome.text)) add("invented_not_stated_outcome", `${path}.outcome.value.text`, "A not-stated outcome must not contain impact text.");
  });
  bundle.capabilityMappings.forEach((mapping, index) => {
    const path = `capabilityMappings[${index}]`;
    if (!evidenceIds.has(mapping.evidenceId)) add("unknown_evidence", `${path}.evidenceId`, `Unknown evidence ${mapping.evidenceId}.`);
    checkSpanRefs(mapping.sourceSpanIds, `${path}.sourceSpanIds`, true);
    const hasId = nonEmpty(mapping.capabilityId), hasLabel = nonEmpty(mapping.proposedLabel);
    if (hasId === hasLabel) add("mapping_target", path, "Exactly one capabilityId or proposedLabel is required.");
    if (mapping.relationship === "possible" && mapping.reviewStatus === "confirmed") add("confirmed_possible", `${path}.reviewStatus`, "A possible mapping cannot be confirmed as direct evidence.", "warning");
    if (mapping.method === "model" && !mapping.modelMetadata?.model && !mapping.modelMetadata?.runId) add("missing_model_metadata", `${path}.modelMetadata`, "Model mapping should retain model or run metadata.", "warning");
    if (mapping.method === "model" && mapping.relationship === "direct_evidence" && mapping.reviewStatus === "unreviewed") add("unreviewed_model_direct", path, "Unreviewed model mapping cannot render as direct evidence.", "warning");
    const alternatives = mapping.alternatives?.map((item) => item.capabilityId) ?? [];
    alternatives.forEach((id, alternativeIndex) => { if (!nonEmpty(id)) add("empty_alternative", `${path}.alternatives[${alternativeIndex}].capabilityId`, "Alternative capability ID must be non-empty."); });
    if (new Set(alternatives).size !== alternatives.length) add("duplicate_alternative", `${path}.alternatives`, "Alternative capability IDs must be unique.");
  });
  (bundle.interpretations ?? []).forEach((interpretation, index) => {
    const path = `interpretations[${index}]`;
    if (!evidenceIds.has(interpretation.evidenceId)) add("unknown_evidence", `${path}.evidenceId`, `Unknown evidence ${interpretation.evidenceId}.`);
    checkSpanRefs(interpretation.sourceSpanIds, `${path}.sourceSpanIds`, interpretation.provenance === "deterministically_derived");
    if (!nonEmpty(interpretation.text)) add("empty_interpretation", `${path}.text`, "Interpretation text must be non-empty.");
    if (interpretation.provenance === "model_inferred" && interpretation.method !== "model") add("interpretation_method", `${path}.method`, "Model inference must preserve model method.");
  });
  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}
