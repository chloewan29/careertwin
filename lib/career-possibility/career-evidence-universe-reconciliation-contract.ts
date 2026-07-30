export const CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION = "1.0.0" as const;
export const CAREER_EVIDENCE_RECONCILIATION_MODEL_VERSION = "1.0.0" as const;

export type ReconciliationProvenanceSource =
  | "shared_ingestion"
  | "server_materialization"
  | "user_confirmed_link"
  | "migration";

export type ReconciliationProvenance = {
  readonly source: ReconciliationProvenanceSource;
  readonly version: string;
};

export type ServerCareerEvidenceUniverse = {
  readonly schemaVersion: "1.0.0";
  readonly opaqueSubjectId: string | null;
  readonly sourceRevision: string | null;
  readonly careerRevision: string | null;
  readonly capabilityRegistryVersion: string | null;
  readonly evidenceReferences: readonly {
    readonly evidencePieceId: string;
    readonly evidenceSignalIds: readonly string[];
  }[];
  readonly capabilityReferences: readonly {
    readonly serverCapabilityId: string;
  }[];
};

export type LocalReviewedEvidenceUniverse = {
  readonly schemaVersion: "1.0.0";
  readonly opaqueSubjectId: string | null;
  readonly intakeSessionId: string | null;
  readonly sourceRevision: string | null;
  readonly capabilityRegistryVersion: string | null;
  readonly evidenceReferences: readonly {
    readonly localEvidenceId: string;
  }[];
  readonly canonicalMappings: readonly {
    readonly mappingId: string;
    readonly localEvidenceId: string;
    readonly canonicalCapabilityId: string;
    readonly provenance: ReconciliationProvenance;
  }[];
};

export type EvidenceCorrespondence = {
  readonly correspondenceId: string;
  readonly serverEvidencePieceId: string;
  readonly serverEvidenceSignalIds: readonly string[];
  readonly localEvidenceId: string;
  readonly sourceRevision: string;
  readonly provenance: ReconciliationProvenance;
};

export type CapabilityCorrespondence = {
  readonly correspondenceId: string;
  readonly serverCapabilityId: string;
  readonly canonicalCapabilityId: string;
  readonly localMappingId: string;
  readonly provenance: ReconciliationProvenance;
};

export type ReconciliationReasonCode =
  | "missing_server_subject"
  | "missing_local_subject"
  | "subject_mismatch"
  | "missing_server_revision"
  | "missing_local_revision"
  | "source_revision_mismatch"
  | "missing_evidence_identity"
  | "partial_evidence_correspondence"
  | "ambiguous_evidence_correspondence"
  | "canonical_mapping_missing"
  | "canonical_mapping_mismatch"
  | "capability_registry_version_mismatch"
  | "unsupported_schema_version"
  | "invalid_input";

export type ReconciliationReason = {
  readonly code: ReconciliationReasonCode;
  readonly path: string;
  readonly message: string;
};

export type CareerEvidenceUniverseReconciliationResult =
  | {
      readonly status: "reconciled";
      readonly schemaVersion: typeof CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION;
      readonly modelVersion: typeof CAREER_EVIDENCE_RECONCILIATION_MODEL_VERSION;
      readonly classification: "subject_verified_revision_verified_evidence_verified";
      readonly opaqueSubjectId: string;
      readonly serverSourceRevision: string;
      readonly localSourceRevision: string;
      readonly capabilityRegistryVersion: string;
      readonly evidenceCorrespondences: readonly EvidenceCorrespondence[];
      readonly capabilityCorrespondences: readonly CapabilityCorrespondence[];
    }
  | {
      readonly status: "unreconciled";
      readonly schemaVersion: typeof CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION;
      readonly modelVersion: typeof CAREER_EVIDENCE_RECONCILIATION_MODEL_VERSION;
      readonly classification:
        | "identity_missing"
        | "subject_mismatch"
        | "subject_verified_revision_mismatch"
        | "subject_verified_partial_evidence"
        | "invalid";
      readonly reasons: readonly ReconciliationReason[];
    };

export type ReconcileCareerEvidenceUniversesInput = {
  readonly serverUniverse: ServerCareerEvidenceUniverse;
  readonly localUniverse: LocalReviewedEvidenceUniverse;
  readonly evidenceCorrespondences: readonly EvidenceCorrespondence[];
  readonly capabilityCorrespondences: readonly CapabilityCorrespondence[];
};

const provenanceSources = new Set<ReconciliationProvenanceSource>([
  "shared_ingestion",
  "server_materialization",
  "user_confirmed_link",
  "migration",
]);

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const add = (reasons: ReconciliationReason[], code: ReconciliationReasonCode, path: string, message: string) => {
  if (!reasons.some((reason) => reason.code === code && reason.path === path)) reasons.push({ code, path, message });
};
const duplicates = (values: readonly string[]) => values.filter((value, index) => values.indexOf(value) !== index);
const sameSet = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

function validProvenance(value: ReconciliationProvenance | undefined) {
  return Boolean(value && provenanceSources.has(value.source) && nonBlank(value.version));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

export function reconcileCareerEvidenceUniverses(
  input: ReconcileCareerEvidenceUniversesInput,
): CareerEvidenceUniverseReconciliationResult {
  const reasons: ReconciliationReason[] = [];
  const server = input?.serverUniverse;
  const local = input?.localUniverse;
  if (!server || !local || !Array.isArray(input.evidenceCorrespondences) || !Array.isArray(input.capabilityCorrespondences)) {
    return deepFreeze({
      status: "unreconciled",
      schemaVersion: CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION,
      modelVersion: CAREER_EVIDENCE_RECONCILIATION_MODEL_VERSION,
      classification: "invalid",
      reasons: [{ code: "invalid_input", path: "input", message: "Both evidence universes and correspondence arrays are required." }],
    });
  }

  if (server.schemaVersion !== CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION) add(reasons, "unsupported_schema_version", "serverUniverse.schemaVersion", "Server universe schema version is unsupported.");
  if (local.schemaVersion !== CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION) add(reasons, "unsupported_schema_version", "localUniverse.schemaVersion", "Local universe schema version is unsupported.");
  if (!nonBlank(server.opaqueSubjectId)) add(reasons, "missing_server_subject", "serverUniverse.opaqueSubjectId", "Server subject identity is required.");
  if (!nonBlank(local.opaqueSubjectId)) add(reasons, "missing_local_subject", "localUniverse.opaqueSubjectId", "Local subject identity is required.");
  if (nonBlank(server.opaqueSubjectId) && nonBlank(local.opaqueSubjectId) && server.opaqueSubjectId !== local.opaqueSubjectId) add(reasons, "subject_mismatch", "opaqueSubjectId", "Server and local subject identities differ.");
  if (!nonBlank(server.sourceRevision)) add(reasons, "missing_server_revision", "serverUniverse.sourceRevision", "A deterministic server source revision is required.");
  if (!nonBlank(local.sourceRevision)) add(reasons, "missing_local_revision", "localUniverse.sourceRevision", "A deterministic local source revision is required.");
  if (nonBlank(server.sourceRevision) && nonBlank(local.sourceRevision) && server.sourceRevision !== local.sourceRevision) add(reasons, "source_revision_mismatch", "sourceRevision", "Server and local source revisions differ.");
  if (!nonBlank(server.careerRevision)) add(reasons, "invalid_input", "serverUniverse.careerRevision", "Server career revision is required.");
  if (!nonBlank(local.intakeSessionId)) add(reasons, "invalid_input", "localUniverse.intakeSessionId", "Local intake session identity is required.");
  if (!nonBlank(server.capabilityRegistryVersion) || !nonBlank(local.capabilityRegistryVersion)) add(reasons, "invalid_input", "capabilityRegistryVersion", "Both capability registry versions are required.");
  if (nonBlank(server.capabilityRegistryVersion) && nonBlank(local.capabilityRegistryVersion) && server.capabilityRegistryVersion !== local.capabilityRegistryVersion) add(reasons, "capability_registry_version_mismatch", "capabilityRegistryVersion", "Capability registry versions differ.");

  const serverEvidenceIds = server.evidenceReferences.map((item) => item.evidencePieceId);
  const localEvidenceIds = local.evidenceReferences.map((item) => item.localEvidenceId);
  const serverCapabilityIds = server.capabilityReferences.map((item) => item.serverCapabilityId);
  const localMappingIds = local.canonicalMappings.map((item) => item.mappingId);
  const correspondenceIds = [...input.evidenceCorrespondences, ...input.capabilityCorrespondences].map((item) => item.correspondenceId);
  for (const [path, values] of [["serverUniverse.evidenceReferences", serverEvidenceIds], ["localUniverse.evidenceReferences", localEvidenceIds], ["serverUniverse.capabilityReferences", serverCapabilityIds], ["localUniverse.canonicalMappings", localMappingIds], ["correspondences", correspondenceIds]] as const) {
    if (values.some((value) => !nonBlank(value)) || duplicates(values).length) add(reasons, "invalid_input", path, "Identifiers must be non-blank and unique.");
  }

  server.evidenceReferences.forEach((reference, index) => {
    if (reference.evidenceSignalIds.some((id) => !nonBlank(id)) || duplicates(reference.evidenceSignalIds).length) add(reasons, "invalid_input", `serverUniverse.evidenceReferences[${index}].evidenceSignalIds`, "Signal identifiers must be non-blank and unique.");
  });
  local.canonicalMappings.forEach((mapping, index) => {
    if (!localEvidenceIds.includes(mapping.localEvidenceId) || !nonBlank(mapping.canonicalCapabilityId) || !validProvenance(mapping.provenance)) add(reasons, "invalid_input", `localUniverse.canonicalMappings[${index}]`, "Local canonical mapping identity and provenance must be explicit and valid.");
  });

  const mappedServerEvidence = new Set<string>();
  const mappedLocalEvidence = new Set<string>();
  input.evidenceCorrespondences.forEach((correspondence, index) => {
    const path = `evidenceCorrespondences[${index}]`;
    if (!validProvenance(correspondence.provenance)) add(reasons, "invalid_input", `${path}.provenance`, "Evidence correspondence provenance is required.");
    if (!serverEvidenceIds.includes(correspondence.serverEvidencePieceId) || !localEvidenceIds.includes(correspondence.localEvidenceId)) add(reasons, "invalid_input", path, "Evidence correspondence references unknown evidence identity.");
    if (mappedServerEvidence.has(correspondence.serverEvidencePieceId) || mappedLocalEvidence.has(correspondence.localEvidenceId)) add(reasons, "ambiguous_evidence_correspondence", path, "Evidence correspondence must be one-to-one.");
    mappedServerEvidence.add(correspondence.serverEvidencePieceId); mappedLocalEvidence.add(correspondence.localEvidenceId);
    const reference = server.evidenceReferences.find((item) => item.evidencePieceId === correspondence.serverEvidencePieceId);
    if (reference && !sameSet(reference.evidenceSignalIds, correspondence.serverEvidenceSignalIds)) add(reasons, "missing_evidence_identity", `${path}.serverEvidenceSignalIds`, "Correspondence must include the complete server signal identity set.");
    if (correspondence.sourceRevision !== server.sourceRevision || correspondence.sourceRevision !== local.sourceRevision) add(reasons, "source_revision_mismatch", `${path}.sourceRevision`, "Evidence correspondence revision must match both universes.");
  });
  if (serverEvidenceIds.length === 0 || localEvidenceIds.length === 0 || input.evidenceCorrespondences.length === 0) add(reasons, "missing_evidence_identity", "evidenceCorrespondences", "Non-empty explicit evidence identity is required.");
  else if (mappedServerEvidence.size !== serverEvidenceIds.length || mappedLocalEvidence.size !== localEvidenceIds.length) add(reasons, "partial_evidence_correspondence", "evidenceCorrespondences", "Every server and local evidence item must participate in full-universe correspondence.");

  const mappedServerCapabilities = new Set<string>();
  const mappedLocalMappings = new Set<string>();
  input.capabilityCorrespondences.forEach((correspondence, index) => {
    const path = `capabilityCorrespondences[${index}]`;
    if (!validProvenance(correspondence.provenance)) add(reasons, "invalid_input", `${path}.provenance`, "Capability correspondence provenance is required.");
    const localMapping = local.canonicalMappings.find((item) => item.mappingId === correspondence.localMappingId);
    if (!serverCapabilityIds.includes(correspondence.serverCapabilityId) || !localMapping) add(reasons, "invalid_input", path, "Capability correspondence references unknown capability identity.");
    if (mappedServerCapabilities.has(correspondence.serverCapabilityId)) add(reasons, "canonical_mapping_mismatch", path, "A server capability cannot have contradictory canonical mappings.");
    if (mappedLocalMappings.has(correspondence.localMappingId)) add(reasons, "canonical_mapping_mismatch", path, "A local canonical mapping cannot map multiple server capabilities.");
    mappedServerCapabilities.add(correspondence.serverCapabilityId); mappedLocalMappings.add(correspondence.localMappingId);
    if (localMapping && localMapping.canonicalCapabilityId !== correspondence.canonicalCapabilityId) add(reasons, "canonical_mapping_mismatch", `${path}.canonicalCapabilityId`, "Canonical capability identity differs from the explicit local mapping.");
  });
  if (serverCapabilityIds.length === 0 || localMappingIds.length === 0 || input.capabilityCorrespondences.length === 0) add(reasons, "canonical_mapping_missing", "capabilityCorrespondences", "Non-empty explicit capability identity is required.");
  else if (mappedServerCapabilities.size !== serverCapabilityIds.length || mappedLocalMappings.size !== localMappingIds.length) add(reasons, "canonical_mapping_missing", "capabilityCorrespondences", "Every server capability and local canonical mapping must participate in correspondence.");

  if (reasons.length) {
    const codes = new Set(reasons.map((reason) => reason.code));
    const classification = codes.has("subject_mismatch") ? "subject_mismatch"
      : codes.has("missing_server_subject") || codes.has("missing_local_subject") ? "identity_missing"
        : codes.has("source_revision_mismatch") || codes.has("missing_server_revision") || codes.has("missing_local_revision") ? "subject_verified_revision_mismatch"
          : codes.has("partial_evidence_correspondence") || codes.has("missing_evidence_identity") ? "subject_verified_partial_evidence"
            : "invalid";
    return deepFreeze({ status: "unreconciled", schemaVersion: CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION, modelVersion: CAREER_EVIDENCE_RECONCILIATION_MODEL_VERSION, classification, reasons });
  }

  return deepFreeze({
    status: "reconciled",
    schemaVersion: CAREER_EVIDENCE_RECONCILIATION_SCHEMA_VERSION,
    modelVersion: CAREER_EVIDENCE_RECONCILIATION_MODEL_VERSION,
    classification: "subject_verified_revision_verified_evidence_verified",
    opaqueSubjectId: server.opaqueSubjectId!,
    serverSourceRevision: server.sourceRevision!,
    localSourceRevision: local.sourceRevision!,
    capabilityRegistryVersion: server.capabilityRegistryVersion!,
    evidenceCorrespondences: input.evidenceCorrespondences.map((item) => ({ ...item, serverEvidenceSignalIds: [...item.serverEvidenceSignalIds], provenance: { ...item.provenance } })),
    capabilityCorrespondences: input.capabilityCorrespondences.map((item) => ({ ...item, provenance: { ...item.provenance } })),
  });
}
