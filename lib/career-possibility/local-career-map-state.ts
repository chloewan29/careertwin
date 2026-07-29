import type { ResumeEvidenceBundle } from "./resume-evidence-contract";
import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";

export const LOCAL_CAREER_MAP_SCHEMA_VERSION = "1.0.0" as const;
export type LocalCareerMapMapping = { readonly mappingId: string; readonly evidenceId: string; readonly relationship: "direct_evidence" | "transferable_signal"; readonly sourceText: string; readonly sourceStart: number; readonly sourceEnd: number; readonly provisional: true };
export type LocalCareerMapCapability = { readonly capabilityId: string; readonly capabilityLabel: string; readonly family: string; readonly mappings: readonly LocalCareerMapMapping[] };
export type LocalCareerMapState = { readonly schemaVersion: typeof LOCAL_CAREER_MAP_SCHEMA_VERSION; readonly definitionVersion: string; readonly source: "reviewed_resume"; readonly importedAt: string; readonly updatedAt: string; readonly capabilities: readonly LocalCareerMapCapability[] };
export type LocalCareerMapIssue = { readonly code: string; readonly path: string; readonly message: string };

export function buildLocalCareerMapState(input: { bundle: ResumeEvidenceBundle; definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; importedAt: string; updatedAt: string }): { ok: true; state: LocalCareerMapState } | { ok: false; issues: readonly LocalCareerMapIssue[] } {
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
  const state: LocalCareerMapState = Object.freeze({ schemaVersion: LOCAL_CAREER_MAP_SCHEMA_VERSION, definitionVersion: input.definitionVersion, source: "reviewed_resume", importedAt: input.importedAt, updatedAt: input.updatedAt, capabilities: Object.freeze(capabilities) });
  const validation = validateLocalCareerMapState(state, input.definitions);
  return validation.ok ? { ok: true, state } : validation;
}

export function validateLocalCareerMapState(value: unknown, definitions: readonly CareerMapCapabilityDefinition[]): { ok: true; state: LocalCareerMapState } | { ok: false; issues: readonly LocalCareerMapIssue[] } {
  const issues: LocalCareerMapIssue[] = []; const state = value as LocalCareerMapState; const byId = new Map(definitions.map((item) => [item.id, item]));
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
