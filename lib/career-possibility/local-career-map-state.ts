import type { ResumeEvidenceBundle } from "./resume-evidence-contract";
import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";
import type { ProvisionalAutoAdmittedMapping, ProvisionalMappingEvidence, ProvisionalUnresolvedMapping } from "./provisional-resume-mapping-contract";

export const LOCAL_CAREER_MAP_SCHEMA_VERSION = "1.0.0" as const;
export const PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION = "2.0.0" as const;
export type LocalCareerMapMapping = { readonly mappingId: string; readonly evidenceId: string; readonly relationship: "direct_evidence" | "transferable_signal"; readonly sourceText: string; readonly sourceStart: number; readonly sourceEnd: number; readonly provisional: true };
export type LocalCareerMapCapability = { readonly capabilityId: string; readonly capabilityLabel: string; readonly family: string; readonly mappings: readonly LocalCareerMapMapping[] };
export type LocalCareerMapStateV1 = { readonly schemaVersion: typeof LOCAL_CAREER_MAP_SCHEMA_VERSION; readonly definitionVersion: string; readonly source: "reviewed_resume"; readonly importedAt: string; readonly updatedAt: string; readonly capabilities: readonly LocalCareerMapCapability[] };
export type ProvisionalLocalCareerMapEvidence = ProvisionalMappingEvidence & Readonly<{ reviewStatus: "unreviewed"; extractionVersion: string; predecessorEvidenceId?: string; successorEvidenceId?: string }>;
export type ProvisionalLocalCareerMapCapability = Readonly<{ capabilityId: string; directEvidenceIds: readonly string[]; transferableEvidenceIds: readonly string[]; provisionalEvidenceCount: number; reviewedEvidenceCount: 0; mapTrustStatus: "provisional" }>;
export type ProvisionalLocalCareerMapState = Readonly<{
  schemaVersion: typeof PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION;
  source: "provisional_resume";
  mapTrustStatus: "provisional";
  sourceMetadata: Readonly<{ fileName: string; mediaType: string; byteSize: number; sourceRevision: string }>;
  versions: Readonly<{ evidenceExtractionVersion: string; mappingPolicyVersion: string; capabilityDefinitionVersion: string; materializerVersion: string }>;
  materialization: Readonly<{ materializationId: string; revision: 1; predecessorMaterializationId?: never }>;
  evidence: readonly ProvisionalLocalCareerMapEvidence[];
  mappings: readonly ProvisionalAutoAdmittedMapping[];
  capabilities: readonly ProvisionalLocalCareerMapCapability[];
  unresolvedEvidence: readonly ProvisionalUnresolvedMapping[];
  createdAt: string;
  updatedAt: string;
}>;
export const ESCO_LOCAL_CAREER_MAP_SCHEMA_VERSION = "esco/1.0.0" as const;
export type EscoLocalCareerMapEvidence = Readonly<{ evidenceId: string; sourceExcerpt: string; }>;
export type EscoLocalCareerMapSkill = Readonly<{ skillUri: string; evidenceIds: readonly string[]; }>;
export type EscoLocalCareerMapState = Readonly<{
  schemaVersion: typeof ESCO_LOCAL_CAREER_MAP_SCHEMA_VERSION;
  source: "esco_grounding";
  evidence: readonly EscoLocalCareerMapEvidence[];
  ownedSkills: readonly EscoLocalCareerMapSkill[];
}>;
export type LocalCareerMapState = LocalCareerMapStateV1 | ProvisionalLocalCareerMapState | EscoLocalCareerMapState;
export type AnyLocalCareerMapState = LocalCareerMapState;
export type LocalCareerMapIssue = { readonly code: string; readonly path: string; readonly message: string };

export function buildLocalCareerMapState(input: { bundle: ResumeEvidenceBundle; definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; importedAt: string; updatedAt: string }): { ok: true; state: LocalCareerMapStateV1 } | { ok: false; issues: readonly LocalCareerMapIssue[] } {
  const definitions = new Map(input.definitions.map((item) => [item.id, item]));
  const evidence = new Map(input.bundle.evidenceRecords.map((item) => [item.id, item]));
  const spans = new Map(input.bundle.sourceSpans.map((item) => [item.id, item]));
  const grouped = new Map<string, LocalCareerMapMapping[]>();
  input.bundle.capabilityMappings.filter((item) => (item.reviewStatus === "confirmed" || item.reviewStatus === "edited") && item.capabilityId && item.relationship !== "possible").forEach((mapping) => {
    const record = evidence.get(mapping.evidenceId); const span = mapping.sourceSpanIds.map((id) => spans.get(id)).find(Boolean); if (!record || !span || !mapping.capabilityId) return;
    const list = grouped.get(mapping.capabilityId) ?? [];
    list.push(Object.freeze({ mappingId: mapping.id, evidenceId: mapping.evidenceId, relationship: mapping.relationship as "direct_evidence" | "transferable_signal", sourceText: record.sourceText, sourceStart: 0, sourceEnd: record.sourceText.length, provisional: true as const })); grouped.set(mapping.capabilityId, list);
  });
  const capabilities = [...grouped].map(([capabilityId, mappings]) => { const definition = definitions.get(capabilityId); return definition ? Object.freeze({ capabilityId, capabilityLabel: definition.label, family: definition.family ?? "", mappings: Object.freeze(mappings) }) : null; }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const state: LocalCareerMapStateV1 = Object.freeze({ schemaVersion: LOCAL_CAREER_MAP_SCHEMA_VERSION, definitionVersion: input.definitionVersion, source: "reviewed_resume", importedAt: input.importedAt, updatedAt: input.updatedAt, capabilities: Object.freeze(capabilities) });
  const validation = validateLocalCareerMapState(state, input.definitions);
  return validation.ok ? { ok: true, state } : validation;
}

function validateV1(value: unknown, definitions: readonly CareerMapCapabilityDefinition[]): { ok: true; state: LocalCareerMapStateV1 } | { ok: false; issues: readonly LocalCareerMapIssue[] } {
  const issues: LocalCareerMapIssue[] = []; const state = value as LocalCareerMapStateV1; const byId = new Map(definitions.map((item) => [item.id, item]));
  if (!state || typeof state !== "object") return { ok: false, issues: [{ code: "invalid_state", path: "state", message: "Saved state must be an object." }] };
  if (state.schemaVersion !== LOCAL_CAREER_MAP_SCHEMA_VERSION) issues.push({ code: "unsupported_schema_version", path: "schemaVersion", message: "Unsupported local Career Map schema version." });
  if (!state.definitionVersion) issues.push({ code: "missing_definition_version", path: "definitionVersion", message: "Capability definition version is required." });
  if (state.source !== "reviewed_resume") issues.push({ code: "invalid_source", path: "source", message: "Saved state source is invalid." });
  if (!Array.isArray(state.capabilities) || state.capabilities.length === 0) issues.push({ code: "empty_capabilities", path: "capabilities", message: "At least one reviewed capability is required." });
  const capabilityIds = new Set<string>(); const mappingIds = new Set<string>(); const targets = new Set<string>();
  (state.capabilities ?? []).forEach((capability, ci) => { const definition = byId.get(capability.capabilityId); if (capabilityIds.has(capability.capabilityId)) issues.push({ code: "duplicate_capability", path: `capabilities[${ci}]`, message: "Capability is duplicated." }); capabilityIds.add(capability.capabilityId); if (!definition) issues.push({ code: "unknown_capability", path: `capabilities[${ci}].capabilityId`, message: "Capability is not canonical." }); else if (definition.label !== capability.capabilityLabel || (definition.family ?? "") !== capability.family) issues.push({ code: "definition_mismatch", path: `capabilities[${ci}]`, message: "Capability label or family does not match current definitions." });
    capability.mappings?.forEach((mapping, mi) => { const path = `capabilities[${ci}].mappings[${mi}]`; if (mappingIds.has(mapping.mappingId)) issues.push({ code: "duplicate_mapping_id", path, message: "Mapping ID is duplicated." }); mappingIds.add(mapping.mappingId); const target = `${mapping.evidenceId}:${capability.capabilityId}`; if (targets.has(target)) issues.push({ code: "duplicate_evidence_capability", path, message: "Evidence/capability mapping is duplicated." }); targets.add(target); if (!mapping.sourceText || !Number.isInteger(mapping.sourceStart) || !Number.isInteger(mapping.sourceEnd) || mapping.sourceStart < 0 || mapping.sourceEnd <= mapping.sourceStart || mapping.sourceEnd > mapping.sourceText.length) issues.push({ code: "invalid_source_span", path, message: "Mapping source span is invalid." }); if (!(["direct_evidence", "transferable_signal"] as const).includes(mapping.relationship)) issues.push({ code: "invalid_relationship", path, message: "Mapping relationship is invalid." }); if (mapping.provisional !== true) issues.push({ code: "invalid_provisional_state", path, message: "Imported mappings must remain provisional." }); }); });
  return issues.length ? { ok: false, issues } : { ok: true, state };
}

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const relationship = (value: unknown) => value === "direct_evidence" || value === "transferable_signal";
const unresolvedReasons = new Set(["multiple_candidates", "relationship_conflict", "no_canonical_rule", "invalid_evidence", "invalid_policy", "unexpected_mapping_failure"]);

export function validateProvisionalLocalCareerMapState(value: unknown, definitions: readonly CareerMapCapabilityDefinition[]): { ok: true; state: ProvisionalLocalCareerMapState } | { ok: false; issues: readonly LocalCareerMapIssue[] } {
  const issues: LocalCareerMapIssue[] = [];
  const state = value as ProvisionalLocalCareerMapState;
  if (!state || typeof state !== "object") return { ok: false, issues: [{ code: "invalid_state", path: "state", message: "Saved state must be an object." }] };
  if (state.schemaVersion !== PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION) issues.push({ code: "unsupported_schema_version", path: "schemaVersion", message: "Unsupported local Career Map schema version." });
  if (state.source !== "provisional_resume") issues.push({ code: "invalid_source", path: "source", message: "Provisional state source is invalid." });
  if (state.mapTrustStatus !== "provisional") issues.push({ code: "invalid_map_trust", path: "mapTrustStatus", message: "Provisional state must retain provisional trust." });
  if (!nonBlank(state.sourceMetadata?.fileName) || !nonBlank(state.sourceMetadata?.mediaType) || !Number.isSafeInteger(state.sourceMetadata?.byteSize) || state.sourceMetadata.byteSize <= 0 || !nonBlank(state.sourceMetadata?.sourceRevision)) issues.push({ code: "invalid_source_metadata", path: "sourceMetadata", message: "Minimal source metadata is invalid." });
  if (!nonBlank(state.versions?.evidenceExtractionVersion) || !nonBlank(state.versions?.mappingPolicyVersion) || !nonBlank(state.versions?.capabilityDefinitionVersion) || !nonBlank(state.versions?.materializerVersion)) issues.push({ code: "invalid_versions", path: "versions", message: "All materialization versions are required." });
  if (!nonBlank(state.materialization?.materializationId) || state.materialization?.revision !== 1 || "predecessorMaterializationId" in (state.materialization ?? {})) issues.push({ code: "invalid_materialization", path: "materialization", message: "Initial provisional materialization must be a new lineage root at revision 1." });
  if (!nonBlank(state.createdAt) || !nonBlank(state.updatedAt)) issues.push({ code: "invalid_timestamps", path: "createdAt", message: "State timestamps are required." });
  if (!Array.isArray(state.evidence) || state.evidence.length === 0) issues.push({ code: "empty_evidence", path: "evidence", message: "Structured provisional evidence is required." });
  if (!Array.isArray(state.mappings) || state.mappings.length === 0) issues.push({ code: "no_unambiguous_mappings", path: "mappings", message: "At least one unambiguous mapping is required." });
  if (!Array.isArray(state.capabilities) || state.capabilities.length === 0) issues.push({ code: "empty_capabilities", path: "capabilities", message: "At least one provisional capability is required." });
  if (!Array.isArray(state.unresolvedEvidence)) issues.push({ code: "invalid_unresolved", path: "unresolvedEvidence", message: "Unresolved evidence must be a collection." });
  const definitionIds = new Set(definitions.map((item) => item.id));
  const evidenceIds = new Set<string>();
  (state.evidence ?? []).forEach((item, index) => {
    const path = `evidence[${index}]`;
    if (!nonBlank(item.evidenceId) || evidenceIds.has(item.evidenceId)) issues.push({ code: "invalid_evidence", path: `${path}.evidenceId`, message: "Evidence IDs must be nonblank and unique." });
    evidenceIds.add(item.evidenceId);
    if (item.reviewStatus !== "unreviewed" || !nonBlank(item.sourceExcerpt) || !nonBlank(item.sourceLocator?.locatorId) || !nonBlank(item.extractionVersion)) issues.push({ code: "invalid_evidence", path, message: "Provisional evidence must remain unreviewed and retain bounded provenance." });
    if (item.employer !== undefined && !nonBlank(item.employer)) issues.push({ code: "invalid_evidence", path: `${path}.employer`, message: "Employer provenance must be a nonblank string when present." });
    if (item.roleTitle !== undefined && !nonBlank(item.roleTitle)) issues.push({ code: "invalid_evidence", path: `${path}.roleTitle`, message: "Role-title provenance must be a nonblank string when present." });
  });
  const mappingIds = new Set<string>();
  (state.mappings ?? []).forEach((item, index) => {
    const path = `mappings[${index}]`;
    if (!nonBlank(item.mappingId) || mappingIds.has(item.mappingId)) issues.push({ code: "invalid_mapping", path: `${path}.mappingId`, message: "Mapping IDs must be nonblank and unique." });
    mappingIds.add(item.mappingId);
    if (!evidenceIds.has(item.evidenceId)) issues.push({ code: "cross_reference_mismatch", path: `${path}.evidenceId`, message: "Mapping evidence reference is missing." });
    if (!definitionIds.has(item.capabilityId)) issues.push({ code: "unknown_capability", path: `${path}.capabilityId`, message: "Mapping capability is not canonical." });
    if (!relationship(item.relationship)) issues.push({ code: "invalid_relationship", path: `${path}.relationship`, message: "Mapping relationship is invalid." });
    if (item.reviewStatus !== "unreviewed" || item.admissionStatus !== "auto_admitted") issues.push({ code: "invalid_admission_status", path, message: "Automatic mappings must remain unreviewed and auto-admitted." });
    if (item.method === "authored_deterministic") {
      if (!nonBlank(item.matchedRuleId)) issues.push({ code: "invalid_mapping_provenance", path: `${path}.matchedRuleId`, message: "Deterministic mappings require a real matched rule ID." });
    } else if (item.method === "structured_inference") {
      if ("matchedRuleId" in item) issues.push({ code: "invalid_mapping_provenance", path: `${path}.matchedRuleId`, message: "Structured inference mappings must not contain a matched rule ID." });
    } else {
      issues.push({ code: "invalid_mapping_provenance", path: `${path}.method`, message: "Mapping method is invalid." });
    }
    if (!nonBlank(item.explanation)) issues.push({ code: "invalid_mapping_provenance", path: `${path}.explanation`, message: "Mapping explanation is required." });
    if (item.mappingPolicyVersion !== state.versions?.mappingPolicyVersion || item.capabilityDefinitionVersion !== state.versions?.capabilityDefinitionVersion) issues.push({ code: "version_mismatch", path, message: "Mapping versions must match state versions." });
  });
  const capabilityIds = new Set<string>();
  (state.capabilities ?? []).forEach((item, index) => {
    const path = `capabilities[${index}]`;
    if (!definitionIds.has(item.capabilityId)) issues.push({ code: "unknown_capability", path: `${path}.capabilityId`, message: "Capability is not canonical." });
    if (capabilityIds.has(item.capabilityId)) issues.push({ code: "duplicate_capability", path, message: "Capability is duplicated." });
    capabilityIds.add(item.capabilityId);
    const direct = item.directEvidenceIds ?? []; const transferable = item.transferableEvidenceIds ?? [];
    if (item.mapTrustStatus !== "provisional" || item.reviewedEvidenceCount !== 0 || item.provisionalEvidenceCount !== new Set([...direct, ...transferable]).size) issues.push({ code: "invalid_capability_counts", path, message: "Provisional and reviewed counts are inconsistent." });
    [...direct, ...transferable].forEach((id) => { if (!evidenceIds.has(id)) issues.push({ code: "cross_reference_mismatch", path, message: "Capability evidence reference is missing." }); });
    if (direct.some((id) => transferable.includes(id))) issues.push({ code: "relationship_conflict", path, message: "Evidence cannot be both direct and transferable for one capability." });
    const actual = (state.mappings ?? []).filter((mapping) => mapping.capabilityId === item.capabilityId);
    if (direct.some((id) => !actual.some((mapping) => mapping.evidenceId === id && mapping.relationship === "direct_evidence")) || transferable.some((id) => !actual.some((mapping) => mapping.evidenceId === id && mapping.relationship === "transferable_signal"))) issues.push({ code: "cross_reference_mismatch", path, message: "Capability references do not match active mappings." });
  });
  (state.unresolvedEvidence ?? []).forEach((item, index) => {
    const path = `unresolvedEvidence[${index}]`;
    if (!evidenceIds.has(item.evidenceId) || item.reviewStatus !== "unreviewed" || item.admissionStatus !== "unresolved" || !unresolvedReasons.has(item.reason)) issues.push({ code: "invalid_unresolved", path, message: "Unresolved evidence is invalid or not addressable." });
    if (item.candidateCapabilityIds.some((id) => !definitionIds.has(id))) issues.push({ code: "unknown_capability", path, message: "Unresolved candidate is not canonical." });
    if ((state.mappings ?? []).some((mapping) => mapping.evidenceId === item.evidenceId)) issues.push({ code: "unresolved_mapping_active", path, message: "Unresolved evidence cannot also be active." });
  });
  return issues.length ? { ok: false, issues: Object.freeze(issues) } : { ok: true, state };
}

export function validateAnyLocalCareerMapState(value: unknown, definitions: readonly CareerMapCapabilityDefinition[]): { ok: true; state: AnyLocalCareerMapState } | { ok: false; issues: readonly LocalCareerMapIssue[] } {
  const schemaVersion = (value as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (schemaVersion === LOCAL_CAREER_MAP_SCHEMA_VERSION) return validateV1(value, definitions);
  if (schemaVersion === PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION) return validateProvisionalLocalCareerMapState(value, definitions);
  if (schemaVersion === ESCO_LOCAL_CAREER_MAP_SCHEMA_VERSION) return validateEscoLocalCareerMapState(value);
  return { ok: false, issues: [{ code: "unsupported_schema_version", path: "schemaVersion", message: "Unsupported local Career Map schema version." }] };
}

export function validateEscoLocalCareerMapState(value: unknown): { ok: true; state: EscoLocalCareerMapState } | { ok: false; issues: readonly LocalCareerMapIssue[] } {
  const state = value as EscoLocalCareerMapState;
  const issues: LocalCareerMapIssue[] = [];
  if (!state || typeof state !== "object") return { ok: false, issues: [{ code: "invalid_state", path: "state", message: "Saved state must be an object." }] };
  if (state.schemaVersion !== ESCO_LOCAL_CAREER_MAP_SCHEMA_VERSION) issues.push({ code: "unsupported_schema_version", path: "schemaVersion", message: "Unsupported local Career Map schema version." });
  if (state.source !== "esco_grounding") issues.push({ code: "invalid_source", path: "source", message: "ESCO state source is invalid." });
  return issues.length ? { ok: false, issues: Object.freeze(issues) } : { ok: true, state };
}

export const validateLocalCareerMapState = validateV1;
