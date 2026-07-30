import {
  CAREER_SOURCE_NORMALISATION_VERSION,
  buildCareerSourceRevision,
} from "./career-source-revision";
import {
  buildCareerSourceIdentityManifest,
  type CareerSourceIdentityManifest,
  type CareerSourceManifestPredecessor,
  type CareerSourceLocator,
} from "./career-source-identity-manifest";
import {
  buildCareerReviewDecisionIdentityContract,
  type CareerReviewDecisionIdentityContract,
  type CareerReviewDecisionIdentityInput,
  type ExistingCareerReviewMappingIdentity,
} from "./career-review-decision-identity-contract";
import { buildCareerReviewRevision } from "./career-review-revision";
import {
  SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION,
  SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION,
  buildSharedCareerIngestionBundle,
  type CareerSubjectBinding,
  type SharedCanonicalMapping,
  type SharedCapabilityProposal,
  type SharedCareerIngestionBundle,
  type SharedIngestionProvenance,
  type SharedReviewDecision,
  type SharedReviewTarget,
} from "./shared-career-ingestion-bundle-contract";
import {
  validateResumeEvidenceBundle,
  type ResumeEvidenceBundle,
  type ResumeSourceSpan,
} from "./resume-evidence-contract";
import type {
  ResumeEvidenceReviewDecision,
  ResumeEvidenceReviewSession,
} from "./resume-evidence-review-contract";

export const BROWSER_RESUME_SHARED_INGESTION_ADAPTER_VERSION = "1.0.0" as const;
export const BROWSER_RESUME_PROPOSAL_PROJECTION_VERSION = "browser-resume-proposal-projection-1.0.0" as const;
export const BROWSER_RESUME_MAPPING_PROJECTION_VERSION = "browser-resume-mapping-projection-1.0.0" as const;

export type BrowserResumeSharedIngestionIssueCode =
  | "invalid_input"
  | "missing_canonical_resume_text"
  | "missing_bundle_id"
  | "missing_extraction_revision"
  | "missing_document_occurrence_id"
  | "missing_subject_binding"
  | "missing_registry_version"
  | "source_revision_failed"
  | "extraction_translation_failed"
  | "document_translation_failed"
  | "employment_translation_failed"
  | "evidence_translation_failed"
  | "unknown_document_reference"
  | "unknown_employment_reference"
  | "unknown_evidence_reference"
  | "unknown_interpretation_reference"
  | "unknown_mapping_reference"
  | "duplicate_document_translation"
  | "duplicate_employment_translation"
  | "duplicate_evidence_translation"
  | "invalid_source_locator"
  | "missing_semantic_payload_revision"
  | "unsupported_review_decision"
  | "source_manifest_failed"
  | "review_identity_failed"
  | "review_revision_failed"
  | "shared_bundle_validation_failed";

export type BrowserResumeSharedIngestionIssue = {
  readonly code: BrowserResumeSharedIngestionIssueCode;
  readonly path: string;
  readonly message: string;
};

export type BuildBrowserResumeSharedIngestionInput = {
  readonly canonicalResumeText: string;
  readonly resumeEvidenceBundle: ResumeEvidenceBundle;
  readonly reviewedEvidenceBundle: ResumeEvidenceBundle;
  readonly reviewSession: ResumeEvidenceReviewSession;
  readonly extractionRevision: string;
  readonly bundleId: string;
  readonly documentOccurrenceId: string;
  readonly subjectBinding: CareerSubjectBinding;
  readonly capabilityRegistryVersion: string;
  readonly semanticPayloadRevisions?: Readonly<Record<string, string>>;
  readonly interpretationIdentityTranslations?: Readonly<Record<string, string>>;
  readonly existingMappingTranslations?: Readonly<Record<string, string>>;
  readonly previousBundle?: SharedCareerIngestionBundle["previousBundle"] | null;
  readonly predecessorManifest?: CareerSourceManifestPredecessor | null;
  readonly priorReviewRevision?: string | null;
};

export type BrowserResumeSharedIngestionAdapterResult =
  | {
      readonly ok: true;
      readonly bundle: SharedCareerIngestionBundle;
      readonly sourceRevision: string;
      readonly manifestRevision: string;
      readonly reviewRevision: string;
    }
  | { readonly ok: false; readonly issues: readonly BrowserResumeSharedIngestionIssue[] };

const browserProvenance: SharedIngestionProvenance = Object.freeze({
  source: "browser_ingestion",
  actorClass: "deterministic_parser",
  version: BROWSER_RESUME_SHARED_INGESTION_ADAPTER_VERSION,
});
const sharedProvenance: SharedIngestionProvenance = Object.freeze({
  source: "shared_ingestion",
  actorClass: "system",
  version: BROWSER_RESUME_SHARED_INGESTION_ADAPTER_VERSION,
});
const reviewProvenance: SharedIngestionProvenance = Object.freeze({
  source: "user_review",
  actorClass: "user",
  version: BROWSER_RESUME_SHARED_INGESTION_ADAPTER_VERSION,
});

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const issue = (code: BrowserResumeSharedIngestionIssueCode, path: string, message: string): BrowserResumeSharedIngestionIssue => ({ code, path, message });
const failure = (...issues: BrowserResumeSharedIngestionIssue[]): BrowserResumeSharedIngestionAdapterResult => Object.freeze({ ok: false, issues: Object.freeze(issues.map((item) => Object.freeze(item))) });

function locatorFor(
  span: ResumeSourceSpan | undefined,
  documentId: string,
  documentLength: number,
  locatorId: string,
): CareerSourceLocator | BrowserResumeSharedIngestionIssue {
  if (
    !span
    || span.documentId !== documentId
    || !Number.isSafeInteger(span.startOffset)
    || !Number.isSafeInteger(span.endOffset)
    || span.startOffset! < 0
    || span.endOffset! <= span.startOffset!
    || span.endOffset! > documentLength
  ) {
    return issue("invalid_source_locator", "sourceSpans", "A source locator is missing, unbounded, or inconsistent with the canonical document.");
  }
  return {
    locatorId,
    startOffset: span.startOffset!,
    endOffset: span.endOffset!,
    ...(span.pageNumber !== undefined ? { pageNumber: span.pageNumber } : {}),
    ...(span.section ? { section: span.section } : {}),
  };
}

function semanticPayloadRevision(input: BuildBrowserResumeSharedIngestionInput, decision: ResumeEvidenceReviewDecision): string | undefined {
  return input.semanticPayloadRevisions?.[decision.id] ?? input.semanticPayloadRevisions?.[String(decision.sequence)];
}

function reviewedField<T>(field: { value: T } | undefined): T | undefined {
  return field?.value;
}

function targetKey(target: CareerReviewDecisionIdentityInput): string {
  if (target.targetType === "evidence") return `evidence:${target.targetId}`;
  if (target.targetType === "employment_field") return `employment:${target.targetId}:${target.field}`;
  if (target.targetType === "evidence_field") return `evidence-field:${target.targetId}:${target.field}`;
  if (target.targetType === "interpretation") return `interpretation:${target.targetId}`;
  return `mapping:${target.targetId}`;
}

function sharedTarget(target: CareerReviewDecisionIdentityContract["decisions"][number]["target"]): SharedReviewTarget {
  if (target.type === "evidence") return { type: "evidence", evidenceId: target.evidenceId };
  if (target.type === "employment_field") return { type: "employment_field", employmentRecordId: target.employmentId, field: target.field };
  if (target.type === "evidence_field") return { type: "evidence_field", evidenceId: target.evidenceId, field: target.field };
  if (target.type === "interpretation") return { type: "interpretation", interpretationId: target.interpretationId };
  return { type: "mapping", mappingId: target.mappingId };
}

export async function buildSharedCareerIngestionBundleFromResumeReview(
  input: BuildBrowserResumeSharedIngestionInput,
): Promise<BrowserResumeSharedIngestionAdapterResult> {
  if (!input || typeof input !== "object") return failure(issue("invalid_input", "input", "Adapter input is invalid."));
  if (!nonBlank(input.canonicalResumeText)) return failure(issue("missing_canonical_resume_text", "canonicalResumeText", "Canonical résumé text is required."));
  if (!nonBlank(input.bundleId) || /^(?:intake|review):/i.test(input.bundleId)) return failure(issue("missing_bundle_id", "bundleId", "A caller-owned stable bundle lineage ID is required."));
  if (!nonBlank(input.extractionRevision)) return failure(issue("missing_extraction_revision", "extractionRevision", "An admitted extraction revision is required."));
  if (!nonBlank(input.documentOccurrenceId)) return failure(issue("missing_document_occurrence_id", "documentOccurrenceId", "A caller-owned document occurrence ID is required."));
  if (!input.subjectBinding || typeof input.subjectBinding !== "object") return failure(issue("missing_subject_binding", "subjectBinding", "A caller-owned subject binding is required."));
  if (!nonBlank(input.capabilityRegistryVersion)) return failure(issue("missing_registry_version", "capabilityRegistryVersion", "A capability registry version is required."));
  if (!input.resumeEvidenceBundle || !input.reviewedEvidenceBundle || !input.reviewSession) return failure(issue("invalid_input", "input", "Extraction and review inputs are required."));

  const sourceValidation = validateResumeEvidenceBundle(input.resumeEvidenceBundle);
  const reviewedValidation = validateResumeEvidenceBundle(input.reviewedEvidenceBundle);
  if (!sourceValidation.valid || !reviewedValidation.valid) return failure(issue("extraction_translation_failed", "resumeEvidenceBundle", "The résumé evidence bundle is not valid for translation."));
  if (
    input.resumeEvidenceBundle.sourceDocuments.length !== 1
    || input.reviewSession.sourceBundleId !== input.resumeEvidenceBundle.id
    || input.reviewSession.capabilityDefinitionVersion !== input.capabilityRegistryVersion
  ) return failure(issue("invalid_input", "reviewSession", "The minimum adapter path requires one matching source bundle and registry version."));

  const sourceDocument = input.resumeEvidenceBundle.sourceDocuments[0];
  const documentSpans = input.resumeEvidenceBundle.sourceSpans.filter((span) => span.documentId === sourceDocument.id);
  const fullSpan = documentSpans.find((span) => span.startOffset === 0 && span.endOffset === input.canonicalResumeText.length);
  if (!fullSpan || fullSpan.originalText !== input.canonicalResumeText) return failure(issue("document_translation_failed", "canonicalResumeText", "Canonical text does not match the full source-document span."));

  let sourceRevisionResult;
  try {
    sourceRevisionResult = await buildCareerSourceRevision({
      sourceDocuments: [{ canonicalText: input.canonicalResumeText }],
      normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION,
    });
  } catch {
    return failure(issue("source_revision_failed", "canonicalResumeText", "Source revision production failed."));
  }

  const employmentInputs: Array<{
    recordKey: string;
    sourceDocumentOccurrenceId: string;
    locator: CareerSourceLocator;
    extractionLocalEmploymentRecordId: string;
    lineage: { readonly kind: "original" };
  }> = [];
  const evidenceInputs: Array<{
    recordKey: string;
    sourceDocumentOccurrenceId: string;
    employmentRecordKey: string;
    locator: CareerSourceLocator;
    extractionLocalEvidenceId: string;
    lineage: { readonly kind: "original" };
  }> = [];
  const employmentLocatorKeys = new Set<string>();
  for (const record of input.resumeEvidenceBundle.employmentRecords) {
    const span = record.sourceSpanIds.length === 1 ? input.resumeEvidenceBundle.sourceSpans.find((item) => item.id === record.sourceSpanIds[0]) : undefined;
    const locator = locatorFor(span, sourceDocument.id, input.canonicalResumeText.length, `locator:${input.documentOccurrenceId}:employment:${span?.startOffset ?? "invalid"}:${span?.endOffset ?? "invalid"}`);
    if ("code" in locator) return failure(locator);
    const signature = `${locator.startOffset}:${locator.endOffset}`;
    if (employmentLocatorKeys.has(signature)) return failure(issue("duplicate_employment_translation", "employmentRecords", "Employment records cannot share the same authoritative locator."));
    employmentLocatorKeys.add(signature);
    employmentInputs.push({ recordKey: record.id, sourceDocumentOccurrenceId: input.documentOccurrenceId, locator, extractionLocalEmploymentRecordId: record.id, lineage: { kind: "original" } });
  }
  const employmentLocalIds = new Set(input.resumeEvidenceBundle.employmentRecords.map((record) => record.id));
  const evidenceLocatorKeys = new Set<string>();
  for (const record of input.resumeEvidenceBundle.evidenceRecords) {
    if (!employmentLocalIds.has(record.employmentRecordId)) return failure(issue("unknown_employment_reference", "evidenceRecords", "Evidence references unknown employment."));
    const span = record.sourceSpanIds.length === 1 ? input.resumeEvidenceBundle.sourceSpans.find((item) => item.id === record.sourceSpanIds[0]) : undefined;
    const locator = locatorFor(span, sourceDocument.id, input.canonicalResumeText.length, `locator:${input.documentOccurrenceId}:evidence:${span?.startOffset ?? "invalid"}:${span?.endOffset ?? "invalid"}`);
    if ("code" in locator) return failure(locator);
    const employmentLocator = employmentInputs.find((item) => item.recordKey === record.employmentRecordId)?.locator;
    if (!employmentLocator || locator.startOffset < employmentLocator.startOffset || locator.endOffset > employmentLocator.endOffset) return failure(issue("invalid_source_locator", "evidenceRecords", "Evidence locator is outside its employment context."));
    const signature = `${locator.startOffset}:${locator.endOffset}:${record.employmentRecordId}`;
    if (evidenceLocatorKeys.has(signature)) return failure(issue("duplicate_evidence_translation", "evidenceRecords", "Evidence records cannot share the same authoritative locator and employment context."));
    evidenceLocatorKeys.add(signature);
    evidenceInputs.push({ recordKey: record.id, sourceDocumentOccurrenceId: input.documentOccurrenceId, employmentRecordKey: record.employmentRecordId, locator, extractionLocalEvidenceId: record.id, lineage: { kind: "original" } });
  }

  let manifest: CareerSourceIdentityManifest;
  try {
    manifest = await buildCareerSourceIdentityManifest({
      sourceRevision: sourceRevisionResult.sourceRevision,
      extractionRevision: input.extractionRevision,
      bundleId: input.bundleId,
      sourceDocuments: [{ recordKey: sourceDocument.id, occurrenceId: input.documentOccurrenceId, extractionLocalSourceDocumentId: sourceDocument.id, characterLength: input.canonicalResumeText.length, lineage: { kind: "original" } }],
      employmentRecords: employmentInputs,
      evidenceRecords: evidenceInputs,
      predecessorManifest: input.predecessorManifest ?? null,
    });
  } catch {
    return failure(issue("source_manifest_failed", "sourceIdentityManifest", "Source identity manifest production failed."));
  }

  const documentMap = new Map(manifest.sourceDocuments.map((record) => [record.extractionLocalSourceDocumentId!, record.sharedSourceDocumentId]));
  const employmentMap = new Map(manifest.employmentRecords.map((record) => [record.extractionLocalEmploymentRecordId!, record.sharedEmploymentRecordId]));
  const evidenceMap = new Map(manifest.evidenceRecords.map((record) => [record.extractionLocalEvidenceId!, record.sharedEvidenceId]));
  if (documentMap.size !== 1) return failure(issue("duplicate_document_translation", "sourceDocuments", "Source-document translation is ambiguous."));
  if (employmentMap.size !== input.resumeEvidenceBundle.employmentRecords.length) return failure(issue("duplicate_employment_translation", "employmentRecords", "Employment translation is ambiguous."));
  if (evidenceMap.size !== input.resumeEvidenceBundle.evidenceRecords.length) return failure(issue("duplicate_evidence_translation", "evidenceRecords", "Evidence translation is ambiguous."));

  const interpretationTranslations = input.interpretationIdentityTranslations ?? {};
  const interpretationIds = Object.values(interpretationTranslations);
  if (new Set(interpretationIds).size !== interpretationIds.length) return failure(issue("unknown_interpretation_reference", "interpretationIdentityTranslations", "Interpretation translations must be one-to-one."));
  const knownLocalInterpretations = new Set((input.resumeEvidenceBundle.interpretations ?? []).map((item) => item.id));
  if (Object.keys(interpretationTranslations).some((id) => !knownLocalInterpretations.has(id))) return failure(issue("unknown_interpretation_reference", "interpretationIdentityTranslations", "Interpretation translation references an unknown local interpretation."));

  const existingMappingTranslations = input.existingMappingTranslations ?? {};
  const existingMappings: ExistingCareerReviewMappingIdentity[] = [];
  for (const mapping of input.resumeEvidenceBundle.capabilityMappings) {
    const stableMappingId = existingMappingTranslations[mapping.id];
    if (!stableMappingId) continue;
    const stableEvidenceId = evidenceMap.get(mapping.evidenceId);
    if (!stableEvidenceId) return failure(issue("unknown_evidence_reference", "existingMappingTranslations", "Existing mapping references unknown evidence."));
    existingMappings.push({ mappingId: stableMappingId, evidenceId: stableEvidenceId, status: mapping.reviewStatus === "rejected" ? "rejected" : "active" });
  }

  const orderedBrowserDecisions = [...input.reviewSession.decisions].sort((left, right) => left.sequence - right.sequence);
  const stableInputs: CareerReviewDecisionIdentityInput[] = [];
  const mappingMap = new Map(Object.entries(existingMappingTranslations));
  const latestByTarget = new Map<string, string>();
  let reviewIdentity: CareerReviewDecisionIdentityContract | undefined;

  for (const decision of orderedBrowserDecisions) {
    let translated: CareerReviewDecisionIdentityInput;
    const base = {
      decisionKey: decision.id,
      sequence: decision.sequence,
      ...(decision.priorDecisionId ? { priorDecisionKey: decision.priorDecisionId } : {}),
    };
    if (decision.targetType === "evidence_record") {
      const targetId = evidenceMap.get(decision.targetId);
      if (!targetId) return failure(issue("unknown_evidence_reference", "reviewSession.decisions", "Review decision references unknown evidence."));
      translated = { ...base, targetType: "evidence", targetId, action: decision.action };
    } else if (decision.targetType === "employment_field") {
      const targetId = employmentMap.get(decision.targetId);
      if (!targetId) return failure(issue("unknown_employment_reference", "reviewSession.decisions", "Review decision references unknown employment."));
      if (decision.action === "edit") {
        const payload = semanticPayloadRevision(input, decision);
        if (!nonBlank(payload)) return failure(issue("missing_semantic_payload_revision", "semanticPayloadRevisions", "An edit decision requires a caller-supplied semantic payload revision."));
        translated = { ...base, targetType: "employment_field", targetId, field: decision.field, action: "edit", semanticPayloadRevision: payload };
      } else translated = { ...base, targetType: "employment_field", targetId, field: decision.field, action: decision.action };
    } else if (decision.targetType === "evidence_field") {
      const targetId = evidenceMap.get(decision.targetId);
      if (!targetId) return failure(issue("unknown_evidence_reference", "reviewSession.decisions", "Review decision references unknown evidence."));
      if (decision.action === "edit") {
        const payload = semanticPayloadRevision(input, decision);
        if (!nonBlank(payload)) return failure(issue("missing_semantic_payload_revision", "semanticPayloadRevisions", "An edit decision requires a caller-supplied semantic payload revision."));
        translated = { ...base, targetType: "evidence_field", targetId, field: decision.field, action: "edit", semanticPayloadRevision: payload };
      } else translated = { ...base, targetType: "evidence_field", targetId, field: decision.field, action: decision.action };
    } else if (decision.targetType === "interpretation") {
      const targetId = interpretationTranslations[decision.targetId];
      if (!targetId) return failure(issue("unknown_interpretation_reference", "reviewSession.decisions", "Review decision requires an explicit stable interpretation translation."));
      if (decision.action === "edit") {
        const payload = semanticPayloadRevision(input, decision);
        if (!nonBlank(payload)) return failure(issue("missing_semantic_payload_revision", "semanticPayloadRevisions", "An edit decision requires a caller-supplied semantic payload revision."));
        translated = { ...base, targetType: "interpretation", targetId, action: "edit", semanticPayloadRevision: payload };
      } else translated = { ...base, targetType: "interpretation", targetId, action: decision.action };
    } else if (decision.targetType === "evidence_capability_mapping") {
      const targetId = evidenceMap.get(decision.targetEvidenceId);
      if (!targetId) return failure(issue("unknown_evidence_reference", "reviewSession.decisions", "Mapping creation references unknown evidence."));
      const latestEvidenceDecision = latestByTarget.get(`evidence:${targetId}`);
      translated = { ...base, ...(latestEvidenceDecision ? { priorDecisionKey: latestEvidenceDecision } : {}), targetType: "evidence", targetId, action: "create_mapping", canonicalCapabilityId: decision.capabilityId, relationship: decision.relationship };
    } else if (decision.targetType === "capability_mapping") {
      const targetId = mappingMap.get(decision.targetId);
      if (!targetId) return failure(issue("unknown_mapping_reference", "reviewSession.decisions", "Mapping decision references an unknown or untranslated mapping."));
      if (decision.action === "remap") {
        const evidenceId = evidenceMap.get(input.reviewedEvidenceBundle.capabilityMappings.find((item) => item.id === decision.targetId)?.evidenceId ?? "");
        if (!evidenceId) return failure(issue("unknown_evidence_reference", "reviewSession.decisions", "Remap evidence could not be translated."));
        translated = { ...base, targetType: "mapping", targetId, action: "remap", evidenceId, canonicalCapabilityId: decision.capabilityId, relationship: decision.relationship };
      } else translated = { ...base, targetType: "mapping", targetId, action: decision.action };
    } else return failure(issue("unsupported_review_decision", "reviewSession.decisions", "A review decision cannot be translated losslessly."));

    stableInputs.push(translated);
    try {
      reviewIdentity = await buildCareerReviewDecisionIdentityContract({
        manifestRevision: manifest.manifestRevision,
        sourceRevision: sourceRevisionResult.sourceRevision,
        capabilityRegistryVersion: input.capabilityRegistryVersion,
        evidenceIds: [...evidenceMap.values()],
        employmentIds: [...employmentMap.values()],
        interpretationIds,
        existingMappings,
        decisions: stableInputs,
      });
    } catch {
      return failure(issue("review_identity_failed", "reviewSession.decisions", "Stable review identity production failed."));
    }
    if (decision.targetType === "evidence_capability_mapping" || (decision.targetType === "capability_mapping" && decision.action === "remap")) {
      const stableDecision = reviewIdentity.decisions.find((item) => item.sequence === decision.sequence);
      if (!stableDecision?.mappingId) return failure(issue("review_identity_failed", "reviewSession.decisions", "A mapping decision did not produce a stable mapping identity."));
      mappingMap.set(decision.newMappingId, stableDecision.mappingId);
    }
    latestByTarget.set(targetKey(translated), decision.id);
  }

  if (!reviewIdentity) {
    try {
      reviewIdentity = await buildCareerReviewDecisionIdentityContract({
        manifestRevision: manifest.manifestRevision,
        sourceRevision: sourceRevisionResult.sourceRevision,
        capabilityRegistryVersion: input.capabilityRegistryVersion,
        evidenceIds: [...evidenceMap.values()], employmentIds: [...employmentMap.values()], interpretationIds, existingMappings, decisions: [],
      });
    } catch {
      return failure(issue("review_identity_failed", "reviewSession", "Stable empty review identity production failed."));
    }
  }

  let reviewRevisionResult;
  try {
    reviewRevisionResult = await buildCareerReviewRevision({
      manifestRevision: manifest.manifestRevision,
      sourceRevision: sourceRevisionResult.sourceRevision,
      capabilityRegistryVersion: input.capabilityRegistryVersion,
      reviewIdentityContract: reviewIdentity,
      priorReviewRevision: input.priorReviewRevision ?? null,
    });
  } catch {
    return failure(issue("review_revision_failed", "reviewRevision", "Review revision production failed."));
  }

  const proposals: SharedCapabilityProposal[] = reviewIdentity.proposals.map((proposal) => ({
    proposalId: proposal.proposalId,
    evidenceId: proposal.evidenceId,
    proposalSource: "user",
    proposalVersion: BROWSER_RESUME_PROPOSAL_PROJECTION_VERSION,
    proposedCapabilityId: proposal.canonicalCapabilityId,
    provenance: reviewProvenance,
  }));
  const mappings: SharedCanonicalMapping[] = reviewIdentity.mappings.map((mapping) => ({
    mappingId: mapping.mappingId,
    proposalId: mapping.proposalId,
    evidenceId: mapping.evidenceId,
    canonicalCapabilityId: mapping.canonicalCapabilityId,
    relationship: mapping.relationship,
    mappingVersion: BROWSER_RESUME_MAPPING_PROJECTION_VERSION,
    capabilityRegistryVersion: mapping.capabilityRegistryVersion,
    ...(mapping.supersedesMappingId ? { supersedesMappingId: mapping.supersedesMappingId } : {}),
    provenance: reviewProvenance,
  }));

  const browserDecisionBySequence = new Map(orderedBrowserDecisions.map((decision) => [decision.sequence, decision]));
  const sharedDecisions: SharedReviewDecision[] = reviewIdentity.decisions.map((decision) => {
    const browserDecision = browserDecisionBySequence.get(decision.sequence)!;
    const common = { decisionId: decision.decisionId, sequence: decision.sequence, target: sharedTarget(decision.target), reviewRevision: reviewRevisionResult.reviewRevision, ...(decision.priorDecisionId ? { priorDecisionId: decision.priorDecisionId } : {}), provenance: reviewProvenance };
    if (decision.action === "edit") return { ...common, action: "edit", target: common.target as Extract<SharedReviewTarget, { type: "employment_field" | "evidence_field" | "interpretation" }>, semanticPayloadRevision: decision.semanticPayloadRevision! };
    if (decision.action === "create_mapping" || decision.action === "remap") {
      const mapping = mappings.find((item) => item.mappingId === decision.mappingId)!;
      return { ...common, action: decision.action, target: common.target as never, proposalId: decision.proposalId!, mappingId: decision.mappingId!, canonicalCapabilityId: mapping.canonicalCapabilityId, relationship: mapping.relationship, capabilityRegistryVersion: mapping.capabilityRegistryVersion } as SharedReviewDecision;
    }
    void browserDecision;
    return { ...common, action: decision.action };
  });

  const reviewedEmployment = new Map(input.reviewedEvidenceBundle.employmentRecords.map((record) => [record.id, record]));
  const reviewedEvidence = new Map(input.reviewedEvidenceBundle.evidenceRecords.map((record) => [record.id, record]));
  const sourceDocumentId = documentMap.get(sourceDocument.id)!;
  const candidate: SharedCareerIngestionBundle = {
    schemaVersion: SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION,
    identityModelVersion: SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION,
    bundleId: input.bundleId,
    sourceRevision: sourceRevisionResult.sourceRevision,
    ...(input.previousBundle ? { previousBundle: input.previousBundle } : {}),
    sourceSet: [{ sourceDocumentId, sourceType: "pasted_text", sourceRevision: sourceRevisionResult.sourceRevision, ordinal: 0, characterLength: input.canonicalResumeText.length, provenance: browserProvenance }],
    subjectBinding: input.subjectBinding,
    employmentRecords: manifest.employmentRecords.map((identity) => {
      const localId = identity.extractionLocalEmploymentRecordId!;
      const record = reviewedEmployment.get(localId)!;
      return { employmentRecordId: identity.sharedEmploymentRecordId, sourceDocumentId: identity.sharedSourceDocumentId, sourceRevision: sourceRevisionResult.sourceRevision, sourceLocator: identity.locator, ...(reviewedField(record.employerName) ? { employer: reviewedField(record.employerName) } : {}), ...(reviewedField(record.roleTitle) ? { roleTitle: reviewedField(record.roleTitle) } : {}), ...(reviewedField(record.startDate) ? { startDate: reviewedField(record.startDate) } : {}), ...(reviewedField(record.endDate) ? { endDate: reviewedField(record.endDate) } : {}), ...(reviewedField(record.location) ? { location: reviewedField(record.location) } : {}), lineage: { kind: "original" }, provenance: browserProvenance };
    }),
    evidenceRecords: manifest.evidenceRecords.map((identity) => {
      const localId = identity.extractionLocalEvidenceId!;
      const record = reviewedEvidence.get(localId)!;
      return { evidenceId: identity.sharedEvidenceId, employmentRecordId: identity.sharedEmploymentRecordId, sourceDocumentId: identity.sharedSourceDocumentId, sourceRevision: sourceRevisionResult.sourceRevision, sourceLocator: identity.locator, sourceExcerptReference: `source-excerpt:${identity.sharedEvidenceId}:${identity.locator.locatorId}`, ...(reviewedField(record.action) ? { action: reviewedField(record.action) } : {}), ...(reviewedField(record.context) ? { context: reviewedField(record.context) } : {}), ...(reviewedField(record.outcome) ? { outcome: reviewedField(record.outcome) } : {}), lineage: { kind: "original" }, provenance: browserProvenance };
    }),
    capabilityProposals: proposals,
    canonicalMappings: mappings,
    reviewState: {
      reviewRevision: reviewRevisionResult.reviewRevision,
      interpretations: Object.entries(interpretationTranslations).map(([localId, interpretationId]) => ({ interpretationId, evidenceId: evidenceMap.get((input.resumeEvidenceBundle.interpretations ?? []).find((item) => item.id === localId)!.evidenceId)! })),
      decisions: sharedDecisions,
    },
    materializationState: { status: "not_materialized", materializationRevision: null, materializerVersion: null },
    capabilityRegistryVersion: input.capabilityRegistryVersion,
    provenance: sharedProvenance,
  };

  const admitted = buildSharedCareerIngestionBundle(candidate);
  if (!admitted.ok) return failure(issue("shared_bundle_validation_failed", "sharedBundle", `Shared bundle validation failed with ${admitted.issues.length} structural issue(s).`));
  return Object.freeze({ ok: true, bundle: admitted.bundle, sourceRevision: sourceRevisionResult.sourceRevision, manifestRevision: manifest.manifestRevision, reviewRevision: reviewRevisionResult.reviewRevision });
}
