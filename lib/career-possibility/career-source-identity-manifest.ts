export const CAREER_SOURCE_IDENTITY_MANIFEST_SCHEMA_VERSION = "1.0.0" as const;
export const CAREER_SOURCE_IDENTITY_MODEL_VERSION = "1.0.0" as const;
export const CAREER_SOURCE_IDENTITY_ALGORITHM_VERSION = "locator-identity-1.0.0" as const;

export type CareerSourceLocator = {
  readonly locatorId: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly pageNumber?: number;
  readonly section?: string;
};

export type CareerSourceManifestPredecessor = {
  readonly manifestRevision: string;
  readonly sourceRevision: string;
  readonly extractionRevision: string;
  readonly bundleId: string;
};

export type CareerRecordPredecessorInput =
  | { readonly scope: "current_manifest"; readonly predecessorRecordKey: string }
  | { readonly scope: "prior_manifest"; readonly predecessorManifestRevision: string; readonly predecessorRecordId: string };

export type CareerRecordLineageInput =
  | { readonly kind: "original" }
  | { readonly kind: "split" | "merged" | "superseded"; readonly predecessors: readonly CareerRecordPredecessorInput[] };

export type CareerRecordPredecessor =
  | { readonly scope: "current_manifest"; readonly predecessorRecordId: string }
  | { readonly scope: "prior_manifest"; readonly predecessorManifestRevision: string; readonly predecessorRecordId: string };

export type CareerRecordLineage =
  | { readonly kind: "original" }
  | { readonly kind: "split" | "merged" | "superseded"; readonly predecessors: readonly CareerRecordPredecessor[] };

export type CareerSourceIdentityManifestInput = {
  readonly sourceRevision: string;
  readonly extractionRevision: string;
  readonly bundleId: string;
  readonly sourceDocuments: readonly {
    readonly recordKey: string;
    readonly occurrenceId: string;
    readonly extractionLocalSourceDocumentId?: string;
    readonly characterLength?: number;
    readonly lineage: CareerRecordLineageInput;
  }[];
  readonly employmentRecords: readonly {
    readonly recordKey: string;
    readonly sourceDocumentOccurrenceId: string;
    readonly locator: CareerSourceLocator;
    readonly extractionLocalEmploymentRecordId?: string;
    readonly lineage: CareerRecordLineageInput;
  }[];
  readonly evidenceRecords: readonly {
    readonly recordKey: string;
    readonly sourceDocumentOccurrenceId: string;
    readonly employmentRecordKey: string;
    readonly locator: CareerSourceLocator;
    readonly extractionLocalEvidenceId?: string;
    readonly lineage: CareerRecordLineageInput;
  }[];
  readonly predecessorManifest: CareerSourceManifestPredecessor | null;
};

export type SourceDocumentIdentityRecord = {
  readonly sharedSourceDocumentId: string;
  readonly sourceRevision: string;
  readonly occurrenceId: string;
  readonly extractionLocalSourceDocumentId?: string;
  readonly characterLength?: number;
  readonly lineage: CareerRecordLineage;
};

export type EmploymentIdentityRecord = {
  readonly sharedEmploymentRecordId: string;
  readonly sharedSourceDocumentId: string;
  readonly sourceRevision: string;
  readonly extractionRevision: string;
  readonly locator: CareerSourceLocator;
  readonly extractionLocalEmploymentRecordId?: string;
  readonly lineage: CareerRecordLineage;
};

export type EvidenceIdentityRecord = {
  readonly sharedEvidenceId: string;
  readonly sharedEmploymentRecordId: string;
  readonly sharedSourceDocumentId: string;
  readonly sourceRevision: string;
  readonly extractionRevision: string;
  readonly locator: CareerSourceLocator;
  readonly extractionLocalEvidenceId?: string;
  readonly lineage: CareerRecordLineage;
};

export type CareerSourceIdentityManifest = {
  readonly schemaVersion: typeof CAREER_SOURCE_IDENTITY_MANIFEST_SCHEMA_VERSION;
  readonly identityModelVersion: typeof CAREER_SOURCE_IDENTITY_MODEL_VERSION;
  readonly algorithmVersion: typeof CAREER_SOURCE_IDENTITY_ALGORITHM_VERSION;
  readonly manifestRevision: string;
  readonly sourceRevision: string;
  readonly extractionRevision: string;
  readonly bundleId: string;
  readonly sourceDocuments: readonly SourceDocumentIdentityRecord[];
  readonly employmentRecords: readonly EmploymentIdentityRecord[];
  readonly evidenceRecords: readonly EvidenceIdentityRecord[];
  readonly predecessorManifest: CareerSourceManifestPredecessor | null;
};

export type CareerSourceIdentityManifestErrorCode =
  | "missing_source_revision" | "missing_extraction_revision" | "missing_bundle_id"
  | "empty_source_documents" | "empty_employment_records" | "empty_evidence_records"
  | "duplicate_source_document_identity" | "duplicate_employment_identity" | "duplicate_evidence_identity"
  | "unknown_source_document_reference" | "unknown_employment_reference" | "invalid_source_locator"
  | "invalid_lineage" | "self_lineage" | "circular_lineage" | "unknown_predecessor_reference"
  | "invalid_predecessor_manifest" | "invalid_input" | "crypto_unavailable" | "digest_failed";

export class CareerSourceIdentityManifestError extends Error {
  readonly code: CareerSourceIdentityManifestErrorCode;
  constructor(code: CareerSourceIdentityManifestErrorCode, message: string) {
    super(message); this.name = "CareerSourceIdentityManifestError"; this.code = code;
  }
}

const encoder = new TextEncoder();
const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const fail = (code: CareerSourceIdentityManifestErrorCode, message: string): never => { throw new CareerSourceIdentityManifestError(code, message); };
const deepFreeze = <T>(value: T): T => { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value as Record<string, unknown>).forEach(deepFreeze); } return value; };

async function digest(value: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") fail("crypto_unavailable", "Web Crypto SHA-256 is unavailable.");
  try {
    const bytes = encoder.encode(JSON.stringify(value));
    const input = new Uint8Array(new ArrayBuffer(bytes.byteLength)); input.set(bytes);
    const result = new Uint8Array(await subtle.digest("SHA-256", input));
    if (result.byteLength !== 32) fail("digest_failed", "SHA-256 returned an invalid digest.");
    return Array.from(result, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    if (error instanceof CareerSourceIdentityManifestError) throw error;
    return fail("digest_failed", "SHA-256 identity calculation failed.");
  }
}

function requiredLookup<K, V>(map: Map<K, V>, key: K, code: CareerSourceIdentityManifestErrorCode, message: string): V {
  const value = map.get(key);
  return value === undefined ? fail(code, message) : value;
}

function validateLocator(locator: CareerSourceLocator, characterLength?: number): void {
  if (!locator || !nonBlank(locator.locatorId) || !Number.isSafeInteger(locator.startOffset) || locator.startOffset < 0 || !Number.isSafeInteger(locator.endOffset) || locator.endOffset <= locator.startOffset || (locator.pageNumber !== undefined && (!Number.isSafeInteger(locator.pageNumber) || locator.pageNumber < 1)) || (locator.section !== undefined && !nonBlank(locator.section)) || (characterLength !== undefined && locator.endOffset > characterLength)) fail("invalid_source_locator", "A bounded source locator is invalid.");
}

function validatePredecessor(value: CareerSourceManifestPredecessor | null, input: CareerSourceIdentityManifestInput): void {
  if (value === null) return;
  if (!value || !nonBlank(value.manifestRevision) || !nonBlank(value.sourceRevision) || !nonBlank(value.extractionRevision) || !nonBlank(value.bundleId)) fail("invalid_predecessor_manifest", "The predecessor manifest reference is invalid.");
  if (value.sourceRevision === input.sourceRevision && value.extractionRevision === input.extractionRevision && value.bundleId === input.bundleId) fail("invalid_predecessor_manifest", "An unchanged manifest cannot be its own successor.");
}

type KeyedLineage = { readonly recordKey: string; readonly lineage: CareerRecordLineageInput };
function validateLineageGraph(records: readonly KeyedLineage[], predecessor: CareerSourceManifestPredecessor | null): void {
  const keys = new Set<string>();
  records.forEach((record) => { if (!nonBlank(record.recordKey) || keys.has(record.recordKey)) fail("invalid_input", "Record keys must be nonblank and unique within their record type."); keys.add(record.recordKey); });
  const graph = new Map<string, string[]>();
  records.forEach((record) => {
    const lineage = record.lineage;
    if (!lineage || !nonBlank(lineage.kind)) fail("invalid_lineage", "Record lineage is invalid.");
    if (lineage.kind === "original") { graph.set(record.recordKey, []); return; }
    if (!Array.isArray(lineage.predecessors) || lineage.predecessors.length === 0 || (lineage.kind === "merged" && lineage.predecessors.length < 2)) fail("invalid_lineage", "Derived record lineage has insufficient predecessors.");
    const signatures = new Set<string>(); const current: string[] = [];
    lineage.predecessors.forEach((reference) => {
      if (reference.scope === "current_manifest") {
        if (!nonBlank(reference.predecessorRecordKey) || !keys.has(reference.predecessorRecordKey)) fail("unknown_predecessor_reference", "A current-manifest predecessor is unknown.");
        if (reference.predecessorRecordKey === record.recordKey) fail("self_lineage", "A record cannot reference itself.");
        current.push(reference.predecessorRecordKey);
        const signature = `current:${reference.predecessorRecordKey}`; if (signatures.has(signature)) fail("invalid_lineage", "Duplicate predecessor references are invalid."); signatures.add(signature);
      } else if (reference.scope === "prior_manifest") {
        if (!predecessor || !nonBlank(reference.predecessorRecordId) || reference.predecessorManifestRevision !== predecessor.manifestRevision) fail("unknown_predecessor_reference", "A prior-manifest predecessor is unknown.");
        const signature = `prior:${reference.predecessorManifestRevision}:${reference.predecessorRecordId}`; if (signatures.has(signature)) fail("invalid_lineage", "Duplicate predecessor references are invalid."); signatures.add(signature);
      } else fail("invalid_lineage", "A predecessor scope is invalid.");
    });
    graph.set(record.recordKey, current);
  });
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (key: string): boolean => { if (visiting.has(key)) return true; if (visited.has(key)) return false; visiting.add(key); if ((graph.get(key) ?? []).some(visit)) return true; visiting.delete(key); visited.add(key); return false; };
  if ([...keys].some(visit)) fail("circular_lineage", "Current-manifest lineage must be acyclic.");
}

function materialiseLineage(lineage: CareerRecordLineageInput, idByKey: Map<string, string>): CareerRecordLineage {
  if (lineage.kind === "original") return deepFreeze({ kind: "original" });
  return deepFreeze({ kind: lineage.kind, predecessors: lineage.predecessors.map((reference) => reference.scope === "current_manifest" ? { scope: "current_manifest" as const, predecessorRecordId: idByKey.get(reference.predecessorRecordKey)! } : { scope: "prior_manifest" as const, predecessorManifestRevision: reference.predecessorManifestRevision, predecessorRecordId: reference.predecessorRecordId }) });
}

/** Builds sensitive internal record identities; none are public or subject identifiers. */
export async function buildCareerSourceIdentityManifest(input: CareerSourceIdentityManifestInput): Promise<CareerSourceIdentityManifest> {
  if (!input || typeof input !== "object") fail("invalid_input", "Manifest input is invalid.");
  if (!nonBlank(input.sourceRevision)) fail("missing_source_revision", "Source revision is required.");
  if (!nonBlank(input.extractionRevision)) fail("missing_extraction_revision", "Extraction revision is required.");
  if (!nonBlank(input.bundleId)) fail("missing_bundle_id", "Bundle ID is required.");
  if (!Array.isArray(input.sourceDocuments) || input.sourceDocuments.length === 0) fail("empty_source_documents", "At least one source document is required.");
  if (!Array.isArray(input.employmentRecords) || input.employmentRecords.length === 0) fail("empty_employment_records", "At least one employment record is required.");
  if (!Array.isArray(input.evidenceRecords) || input.evidenceRecords.length === 0) fail("empty_evidence_records", "At least one evidence record is required.");
  validatePredecessor(input.predecessorManifest, input);
  validateLineageGraph(input.sourceDocuments, input.predecessorManifest); validateLineageGraph(input.employmentRecords, input.predecessorManifest); validateLineageGraph(input.evidenceRecords, input.predecessorManifest);

  const sourceIds = new Map<string, string>(); const sourceByOccurrence = new Map<string, typeof input.sourceDocuments[number]>();
  for (const record of input.sourceDocuments) {
    if (!nonBlank(record.occurrenceId) || sourceByOccurrence.has(record.occurrenceId) || (record.characterLength !== undefined && (!Number.isSafeInteger(record.characterLength) || record.characterLength < 1))) fail("duplicate_source_document_identity", "Source document occurrence identities must be unique and valid.");
    const id = `career-source-document:${CAREER_SOURCE_IDENTITY_MODEL_VERSION}:${await digest({ identityModelVersion: CAREER_SOURCE_IDENTITY_MODEL_VERSION, sourceRevision: input.sourceRevision, occurrenceId: record.occurrenceId })}`;
    if ([...sourceIds.values()].includes(id)) fail("duplicate_source_document_identity", "A shared source-document identity is duplicated."); sourceIds.set(record.recordKey, id); sourceByOccurrence.set(record.occurrenceId, record);
  }

  const employmentIds = new Map<string, string>();
  for (const record of input.employmentRecords) {
    const source = requiredLookup(sourceByOccurrence, record.sourceDocumentOccurrenceId, "unknown_source_document_reference", "An employment record references an unknown source document."); validateLocator(record.locator, source.characterLength);
    const id = `career-employment:${CAREER_SOURCE_IDENTITY_MODEL_VERSION}:${await digest({ identityModelVersion: CAREER_SOURCE_IDENTITY_MODEL_VERSION, sourceRevision: input.sourceRevision, extractionRevision: input.extractionRevision, sharedSourceDocumentId: sourceIds.get(source.recordKey), locator: record.locator })}`;
    if ([...employmentIds.values()].includes(id)) fail("duplicate_employment_identity", "A shared employment identity is duplicated."); employmentIds.set(record.recordKey, id);
  }

  const employmentByKey = new Map(input.employmentRecords.map((record) => [record.recordKey, record])); const evidenceIds = new Map<string, string>();
  for (const record of input.evidenceRecords) {
    const source = requiredLookup(sourceByOccurrence, record.sourceDocumentOccurrenceId, "unknown_source_document_reference", "An evidence record references an unknown source document.");
    const employment = requiredLookup(employmentByKey, record.employmentRecordKey, "unknown_employment_reference", "An evidence record references an unknown employment record.");
    if (employment.sourceDocumentOccurrenceId !== record.sourceDocumentOccurrenceId) fail("unknown_source_document_reference", "Evidence and employment must reference the same source document."); validateLocator(record.locator, source.characterLength);
    if (record.locator.startOffset < employment.locator.startOffset || record.locator.endOffset > employment.locator.endOffset) fail("invalid_source_locator", "Evidence must be bounded by its employment context.");
    const id = `career-evidence:${CAREER_SOURCE_IDENTITY_MODEL_VERSION}:${await digest({ identityModelVersion: CAREER_SOURCE_IDENTITY_MODEL_VERSION, sourceRevision: input.sourceRevision, extractionRevision: input.extractionRevision, sharedSourceDocumentId: sourceIds.get(source.recordKey), sharedEmploymentRecordId: employmentIds.get(record.employmentRecordKey), locator: record.locator })}`;
    if ([...evidenceIds.values()].includes(id)) fail("duplicate_evidence_identity", "A shared evidence identity is duplicated."); evidenceIds.set(record.recordKey, id);
  }

  const sourceDocuments = input.sourceDocuments.map((record) => deepFreeze({ sharedSourceDocumentId: sourceIds.get(record.recordKey)!, sourceRevision: input.sourceRevision, occurrenceId: record.occurrenceId, ...(record.extractionLocalSourceDocumentId ? { extractionLocalSourceDocumentId: record.extractionLocalSourceDocumentId } : {}), ...(record.characterLength !== undefined ? { characterLength: record.characterLength } : {}), lineage: materialiseLineage(record.lineage, sourceIds) })).sort((a, b) => a.sharedSourceDocumentId.localeCompare(b.sharedSourceDocumentId));
  const employmentRecords = input.employmentRecords.map((record) => { const source = sourceByOccurrence.get(record.sourceDocumentOccurrenceId)!; return deepFreeze({ sharedEmploymentRecordId: employmentIds.get(record.recordKey)!, sharedSourceDocumentId: sourceIds.get(source.recordKey)!, sourceRevision: input.sourceRevision, extractionRevision: input.extractionRevision, locator: { ...record.locator }, ...(record.extractionLocalEmploymentRecordId ? { extractionLocalEmploymentRecordId: record.extractionLocalEmploymentRecordId } : {}), lineage: materialiseLineage(record.lineage, employmentIds) }); }).sort((a, b) => a.sharedEmploymentRecordId.localeCompare(b.sharedEmploymentRecordId));
  const evidenceRecords = input.evidenceRecords.map((record) => { const source = sourceByOccurrence.get(record.sourceDocumentOccurrenceId)!; return deepFreeze({ sharedEvidenceId: evidenceIds.get(record.recordKey)!, sharedEmploymentRecordId: employmentIds.get(record.employmentRecordKey)!, sharedSourceDocumentId: sourceIds.get(source.recordKey)!, sourceRevision: input.sourceRevision, extractionRevision: input.extractionRevision, locator: { ...record.locator }, ...(record.extractionLocalEvidenceId ? { extractionLocalEvidenceId: record.extractionLocalEvidenceId } : {}), lineage: materialiseLineage(record.lineage, evidenceIds) }); }).sort((a, b) => a.sharedEvidenceId.localeCompare(b.sharedEvidenceId));
  const predecessorManifest = input.predecessorManifest ? deepFreeze({ ...input.predecessorManifest }) : null;
  const manifestDigest = await digest({ schemaVersion: CAREER_SOURCE_IDENTITY_MANIFEST_SCHEMA_VERSION, identityModelVersion: CAREER_SOURCE_IDENTITY_MODEL_VERSION, algorithmVersion: CAREER_SOURCE_IDENTITY_ALGORITHM_VERSION, sourceRevision: input.sourceRevision, extractionRevision: input.extractionRevision, bundleId: input.bundleId, sourceDocuments, employmentRecords, evidenceRecords, predecessorManifest });
  return deepFreeze({ schemaVersion: CAREER_SOURCE_IDENTITY_MANIFEST_SCHEMA_VERSION, identityModelVersion: CAREER_SOURCE_IDENTITY_MODEL_VERSION, algorithmVersion: CAREER_SOURCE_IDENTITY_ALGORITHM_VERSION, manifestRevision: `career-source-manifest:${CAREER_SOURCE_IDENTITY_MODEL_VERSION}:${manifestDigest}`, sourceRevision: input.sourceRevision, extractionRevision: input.extractionRevision, bundleId: input.bundleId, sourceDocuments, employmentRecords, evidenceRecords, predecessorManifest });
}
