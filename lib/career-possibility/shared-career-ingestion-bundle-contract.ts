export const SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION = "1.0.0" as const;
export const SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION = "1.0.0" as const;

export type SharedIngestionProvenanceSource =
  | "browser_ingestion"
  | "server_ingestion"
  | "shared_ingestion"
  | "user_review"
  | "migration"
  | "server_materialization";
export type SharedIngestionActorClass = "user" | "deterministic_parser" | "model" | "system" | "migration";

export type SharedIngestionProvenance = {
  readonly source: SharedIngestionProvenanceSource;
  readonly actorClass: SharedIngestionActorClass;
  readonly version: string;
};

export type CareerSourceDocument = {
  readonly sourceDocumentId: string;
  readonly sourceType: "pasted_text" | "pdf" | "docx" | "structured_import";
  readonly sourceRevision: string;
  readonly ordinal: number;
  readonly characterLength?: number;
  readonly provenance: SharedIngestionProvenance;
};

export type CareerSubjectBinding =
  | { readonly status: "anonymous"; readonly anonymousSubjectId: string; readonly authenticatedSubjectId: null }
  | { readonly status: "claimed"; readonly anonymousSubjectId: string; readonly authenticatedSubjectId: string; readonly claimRevision: string };

export type SharedSourceLocator = {
  readonly locatorId: string;
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly pageNumber?: number;
  readonly section?: string;
};

export type SharedRecordLineage =
  | { readonly kind: "original" }
  | { readonly kind: "successor"; readonly previousRecordId: string; readonly previousSourceRevision: string };

export type SharedEmploymentRecord = {
  readonly employmentRecordId: string;
  readonly sourceDocumentId: string;
  readonly sourceRevision: string;
  readonly sourceLocator: SharedSourceLocator;
  readonly employer?: string;
  readonly roleTitle?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly location?: string;
  readonly lineage: SharedRecordLineage;
  readonly provenance: SharedIngestionProvenance;
};

export type EvidencePredecessorReference =
  | { readonly scope: "bundle"; readonly evidenceId: string }
  | { readonly scope: "prior_revision"; readonly evidenceId: string; readonly sourceRevision: string; readonly bundleId: string };

export type EvidenceLineage =
  | { readonly kind: "original" }
  | { readonly kind: "split" | "merged" | "superseded"; readonly derivedFrom: readonly EvidencePredecessorReference[] };

export type SharedEvidenceOutcome = { readonly text: string; readonly kind: "quantitative" | "qualitative" | "not_stated" };

export type SharedEvidenceRecord = {
  readonly evidenceId: string;
  readonly employmentRecordId: string;
  readonly sourceDocumentId: string;
  readonly sourceRevision: string;
  readonly sourceLocator: SharedSourceLocator;
  readonly sourceExcerptReference: string;
  readonly action?: string;
  readonly context?: string;
  readonly outcome?: SharedEvidenceOutcome;
  readonly lineage: EvidenceLineage;
  readonly provenance: SharedIngestionProvenance;
};

export type SharedCapabilityProposal = {
  readonly proposalId: string;
  readonly evidenceId: string;
  readonly proposalSource: "deterministic_parser" | "model" | "user" | "migration";
  readonly proposalVersion: string;
  readonly proposedCapabilityId?: string;
  readonly provenance: SharedIngestionProvenance;
};

export type SharedCanonicalMapping = {
  readonly mappingId: string;
  readonly proposalId: string;
  readonly evidenceId: string;
  readonly canonicalCapabilityId: string;
  readonly relationship: "direct_evidence" | "transferable_signal";
  readonly mappingVersion: string;
  readonly capabilityRegistryVersion: string;
  readonly historicalRegistryVersion?: true;
  readonly supersedesMappingId?: string;
  readonly provenance: SharedIngestionProvenance;
};

export type SharedReviewDecision = {
  readonly decisionId: string;
  readonly action: "confirm" | "edit_mapping" | "reject" | "restore" | "remap";
  readonly targetType: "evidence" | "proposal" | "mapping";
  readonly targetId: string;
  readonly reviewRevision: string;
  readonly previousDecisionId?: string;
  readonly mappingId?: string;
  readonly capabilityRegistryVersion?: string;
  readonly historicalRegistryVersion?: true;
  readonly provenance: SharedIngestionProvenance;
};

export type SharedReviewState = {
  readonly reviewRevision: string;
  readonly decisions: readonly SharedReviewDecision[];
};

export type SharedMaterializationState =
  | { readonly status: "not_materialized"; readonly materializationRevision: null; readonly materializerVersion: null }
  | { readonly status: "materialized" | "stale"; readonly materializationRevision: string; readonly materializerVersion: string };

export type SharedCareerIngestionBundle = {
  readonly schemaVersion: typeof SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION;
  readonly identityModelVersion: typeof SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION;
  readonly bundleId: string;
  readonly sourceRevision: string;
  readonly previousBundle?: { readonly bundleId: string; readonly sourceRevision: string };
  readonly sourceSet: readonly CareerSourceDocument[];
  readonly subjectBinding: CareerSubjectBinding;
  readonly employmentRecords: readonly SharedEmploymentRecord[];
  readonly evidenceRecords: readonly SharedEvidenceRecord[];
  readonly capabilityProposals: readonly SharedCapabilityProposal[];
  readonly canonicalMappings: readonly SharedCanonicalMapping[];
  readonly reviewState: SharedReviewState;
  readonly materializationState: SharedMaterializationState;
  readonly capabilityRegistryVersion: string;
  readonly provenance: SharedIngestionProvenance;
};

export type SharedCareerIngestionBundleIssue = { readonly code: string; readonly path: string; readonly message: string };
export type BuildSharedCareerIngestionBundleResult =
  | { readonly ok: true; readonly bundle: SharedCareerIngestionBundle }
  | { readonly ok: false; readonly issues: readonly SharedCareerIngestionBundleIssue[] };

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

export function buildSharedCareerIngestionBundle(input: SharedCareerIngestionBundle): BuildSharedCareerIngestionBundleResult {
  const issues: SharedCareerIngestionBundleIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const required = (value: unknown, path: string) => { if (!nonBlank(value)) add("missing_identity", path, "A nonblank identity is required."); };
  const ids = <T>(items: readonly T[], path: string, getId: (item: T) => unknown) => {
    const result = new Set<string>();
    items.forEach((item, index) => {
      const id = getId(item);
      required(id, `${path}[${index}]`);
      if (nonBlank(id)) {
        if (result.has(id)) add("duplicate_identity", `${path}[${index}]`, `Duplicate identity ${id}.`);
        result.add(id);
      }
    });
    return result;
  };
  const provenance = (value: SharedIngestionProvenance | undefined, path: string) => {
    if (!value) return add("missing_provenance", path, "Versioned provenance is required.");
    required(value.version, `${path}.version`);
  };
  const locator = (value: SharedSourceLocator, path: string) => {
    required(value.locatorId, `${path}.locatorId`);
    if (value.startOffset !== undefined && value.startOffset < 0) add("invalid_locator", `${path}.startOffset`, "Start offset must be non-negative.");
    if (value.endOffset !== undefined && (value.startOffset === undefined || value.endOffset <= value.startOffset)) add("invalid_locator", `${path}.endOffset`, "End offset requires a smaller start offset.");
    if (value.pageNumber !== undefined && value.pageNumber < 1) add("invalid_locator", `${path}.pageNumber`, "Page number must be positive.");
  };

  if (input.schemaVersion !== SHARED_CAREER_INGESTION_BUNDLE_SCHEMA_VERSION) add("unsupported_schema_version", "schemaVersion", "Unsupported bundle schema version.");
  if (input.identityModelVersion !== SHARED_CAREER_INGESTION_IDENTITY_MODEL_VERSION) add("unsupported_identity_model_version", "identityModelVersion", "Unsupported identity model version.");
  required(input.bundleId, "bundleId");
  required(input.sourceRevision, "sourceRevision");
  required(input.capabilityRegistryVersion, "capabilityRegistryVersion");
  provenance(input.provenance, "provenance");
  if (input.previousBundle) {
    required(input.previousBundle.bundleId, "previousBundle.bundleId");
    required(input.previousBundle.sourceRevision, "previousBundle.sourceRevision");
    if (input.previousBundle.bundleId === input.bundleId) add("self_successor", "previousBundle.bundleId", "A successor bundle must not reference itself.");
    if (input.previousBundle.sourceRevision === input.sourceRevision) add("unchanged_successor_revision", "previousBundle.sourceRevision", "A successor link requires a changed source revision.");
  }

  if (input.sourceSet.length === 0) add("empty_source_set", "sourceSet", "At least one source document is required.");
  if (input.employmentRecords.length === 0) add("empty_employment_records", "employmentRecords", "At least one employment record is required.");
  if (input.evidenceRecords.length === 0) add("empty_evidence_records", "evidenceRecords", "At least one evidence record is required.");
  const sourceIds = ids(input.sourceSet, "sourceSet", (item) => item.sourceDocumentId);
  const employmentIds = ids(input.employmentRecords, "employmentRecords", (item) => item.employmentRecordId);
  const evidenceIds = ids(input.evidenceRecords, "evidenceRecords", (item) => item.evidenceId);
  const proposalIds = ids(input.capabilityProposals, "capabilityProposals", (item) => item.proposalId);
  const mappingIds = ids(input.canonicalMappings, "canonicalMappings", (item) => item.mappingId);
  const decisionIds = ids(input.reviewState.decisions, "reviewState.decisions", (item) => item.decisionId);

  input.sourceSet.forEach((document, index) => {
    const path = `sourceSet[${index}]`;
    if (document.sourceRevision !== input.sourceRevision) add("source_revision_mismatch", `${path}.sourceRevision`, "Source document revision must match the bundle.");
    if (!Number.isInteger(document.ordinal) || document.ordinal < 0) add("invalid_ordinal", `${path}.ordinal`, "Ordinal must be a non-negative integer and is not an identity.");
    if (document.characterLength !== undefined && document.characterLength < 0) add("invalid_character_length", `${path}.characterLength`, "Character length must be non-negative.");
    provenance(document.provenance, `${path}.provenance`);
  });

  if (input.subjectBinding.status === "anonymous") {
    required(input.subjectBinding.anonymousSubjectId, "subjectBinding.anonymousSubjectId");
    if (input.subjectBinding.authenticatedSubjectId !== null) add("invalid_anonymous_binding", "subjectBinding.authenticatedSubjectId", "Anonymous binding cannot assert authenticated ownership.");
  } else if (input.subjectBinding.status === "claimed") {
    required(input.subjectBinding.anonymousSubjectId, "subjectBinding.anonymousSubjectId");
    required(input.subjectBinding.authenticatedSubjectId, "subjectBinding.authenticatedSubjectId");
    required(input.subjectBinding.claimRevision, "subjectBinding.claimRevision");
  } else add("invalid_subject_status", "subjectBinding.status", "Subject status must be anonymous or claimed.");

  input.employmentRecords.forEach((record, index) => {
    const path = `employmentRecords[${index}]`;
    if (!sourceIds.has(record.sourceDocumentId)) add("unknown_source_document", `${path}.sourceDocumentId`, "Employment record references an unknown source document.");
    if (record.sourceRevision !== input.sourceRevision) add("source_revision_mismatch", `${path}.sourceRevision`, "Employment revision must match the bundle.");
    locator(record.sourceLocator, `${path}.sourceLocator`);
    provenance(record.provenance, `${path}.provenance`);
    if (record.lineage.kind === "successor") {
      required(record.lineage.previousRecordId, `${path}.lineage.previousRecordId`);
      required(record.lineage.previousSourceRevision, `${path}.lineage.previousSourceRevision`);
      if (record.lineage.previousRecordId === record.employmentRecordId && record.lineage.previousSourceRevision === input.sourceRevision) add("self_lineage", `${path}.lineage`, "A record cannot derive from itself in the same revision.");
    }
  });

  const lineageGraph = new Map<string, string[]>();
  input.evidenceRecords.forEach((record, index) => {
    const path = `evidenceRecords[${index}]`;
    if (!sourceIds.has(record.sourceDocumentId)) add("unknown_source_document", `${path}.sourceDocumentId`, "Evidence references an unknown source document.");
    if (!employmentIds.has(record.employmentRecordId)) add("unknown_employment_record", `${path}.employmentRecordId`, "Evidence references an unknown employment record.");
    if (record.sourceRevision !== input.sourceRevision) add("source_revision_mismatch", `${path}.sourceRevision`, "Evidence revision must match the bundle.");
    required(record.sourceExcerptReference, `${path}.sourceExcerptReference`);
    locator(record.sourceLocator, `${path}.sourceLocator`);
    provenance(record.provenance, `${path}.provenance`);
    if (record.lineage.kind !== "original") {
      if (record.lineage.derivedFrom.length === 0) add("missing_predecessor", `${path}.lineage.derivedFrom`, "Derived evidence requires a predecessor.");
      const predecessorKeys = new Set<string>();
      const internal: string[] = [];
      record.lineage.derivedFrom.forEach((reference, referenceIndex) => {
        const referencePath = `${path}.lineage.derivedFrom[${referenceIndex}]`;
        required(reference.evidenceId, `${referencePath}.evidenceId`);
        const key = `${reference.scope}:${reference.evidenceId}:${reference.scope === "prior_revision" ? reference.sourceRevision : ""}`;
        if (predecessorKeys.has(key)) add("duplicate_predecessor", referencePath, "Predecessor references must be unique.");
        predecessorKeys.add(key);
        if (reference.evidenceId === record.evidenceId && reference.scope === "bundle") add("self_lineage", referencePath, "Evidence cannot derive from itself.");
        if (reference.scope === "bundle") {
          if (!evidenceIds.has(reference.evidenceId)) add("unknown_predecessor", referencePath, "Bundle predecessor does not exist.");
          internal.push(reference.evidenceId);
        } else {
          required(reference.sourceRevision, `${referencePath}.sourceRevision`);
          required(reference.bundleId, `${referencePath}.bundleId`);
          if (reference.sourceRevision === input.sourceRevision && reference.bundleId === input.bundleId) add("invalid_external_predecessor", referencePath, "Current-bundle predecessors must use bundle scope.");
        }
      });
      lineageGraph.set(record.evidenceId, internal);
    }
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const circular = (lineageGraph.get(id) ?? []).some(visit);
    visiting.delete(id);
    visited.add(id);
    return circular;
  };
  evidenceIds.forEach((id) => { if (visit(id)) add("circular_lineage", `evidenceRecords.${id}.lineage`, "Evidence lineage must be acyclic."); });

  input.capabilityProposals.forEach((proposal, index) => {
    const path = `capabilityProposals[${index}]`;
    if (!evidenceIds.has(proposal.evidenceId)) add("unknown_evidence", `${path}.evidenceId`, "Proposal references unknown evidence.");
    required(proposal.proposalVersion, `${path}.proposalVersion`);
    provenance(proposal.provenance, `${path}.provenance`);
  });
  input.canonicalMappings.forEach((mapping, index) => {
    const path = `canonicalMappings[${index}]`;
    if (!proposalIds.has(mapping.proposalId)) add("unknown_proposal", `${path}.proposalId`, "Mapping references an unknown proposal.");
    if (!evidenceIds.has(mapping.evidenceId)) add("unknown_evidence", `${path}.evidenceId`, "Mapping references unknown evidence.");
    required(mapping.canonicalCapabilityId, `${path}.canonicalCapabilityId`);
    required(mapping.mappingVersion, `${path}.mappingVersion`);
    required(mapping.capabilityRegistryVersion, `${path}.capabilityRegistryVersion`);
    if (!mapping.historicalRegistryVersion && mapping.capabilityRegistryVersion !== input.capabilityRegistryVersion) add("registry_version_mismatch", `${path}.capabilityRegistryVersion`, "Current mapping must use the bundle registry version.");
    if (mapping.mappingId === mapping.canonicalCapabilityId) add("mapping_identity_collision", `${path}.mappingId`, "Mapping identity must remain separate from canonical identity.");
    if (mapping.supersedesMappingId && !mappingIds.has(mapping.supersedesMappingId)) add("unknown_superseded_mapping", `${path}.supersedesMappingId`, "Superseded mapping must exist in this admitted bundle.");
    provenance(mapping.provenance, `${path}.provenance`);
  });

  required(input.reviewState.reviewRevision, "reviewState.reviewRevision");
  const revisionValues = [input.sourceRevision, input.reviewState.reviewRevision, input.materializationState.materializationRevision].filter(nonBlank);
  if (new Set(revisionValues).size !== revisionValues.length) add("revision_identity_collision", "reviewState.reviewRevision", "Source, review, and materialization revisions must be distinct.");
  input.reviewState.decisions.forEach((decision, index) => {
    const path = `reviewState.decisions[${index}]`;
    if (decision.reviewRevision !== input.reviewState.reviewRevision) add("review_revision_mismatch", `${path}.reviewRevision`, "Decision must belong to the current review revision.");
    const targets = decision.targetType === "evidence" ? evidenceIds : decision.targetType === "proposal" ? proposalIds : mappingIds;
    if (!targets.has(decision.targetId)) add("unknown_review_target", `${path}.targetId`, "Review target is not admitted by the bundle.");
    if (decision.previousDecisionId && !decisionIds.has(decision.previousDecisionId)) add("unknown_previous_decision", `${path}.previousDecisionId`, "Previous decision is unknown.");
    if (decision.mappingId && !mappingIds.has(decision.mappingId)) add("unknown_mapping", `${path}.mappingId`, "Decision mapping is unknown.");
    if ((decision.action === "edit_mapping" || decision.action === "remap") && !decision.mappingId) add("missing_mapping", `${path}.mappingId`, "Mapping-changing review requires a mapping identity.");
    if (decision.capabilityRegistryVersion && !decision.historicalRegistryVersion && decision.capabilityRegistryVersion !== input.capabilityRegistryVersion) add("registry_version_mismatch", `${path}.capabilityRegistryVersion`, "Current review decision must use the bundle registry version.");
    provenance(decision.provenance, `${path}.provenance`);
  });

  if (input.materializationState.status === "not_materialized") {
    if (input.materializationState.materializationRevision !== null || input.materializationState.materializerVersion !== null) add("invalid_materialization_state", "materializationState", "Not-materialized state requires null identities.");
  } else {
    required(input.materializationState.materializationRevision, "materializationState.materializationRevision");
    required(input.materializationState.materializerVersion, "materializationState.materializerVersion");
  }

  if (issues.length > 0) return deepFreeze({ ok: false, issues: issues.map((issue) => ({ ...issue })) });
  const clone = structuredClone(input);
  return deepFreeze({ ok: true, bundle: clone });
}
