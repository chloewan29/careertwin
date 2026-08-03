import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";
import { PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION, validateProvisionalLocalCareerMapState, type LocalCareerMapIssue, type ProvisionalLocalCareerMapEvidence, type ProvisionalLocalCareerMapState } from "./local-career-map-state";
import type { ProvisionalMappingResult } from "./provisional-resume-mapping-contract";

export const PROVISIONAL_CAREER_MAP_MATERIALIZER_VERSION = "provisional-career-map-materializer/1.0.0" as const;
type Result = { ok: true; state: ProvisionalLocalCareerMapState } | { ok: false; code: "invalid_input" | "no_unambiguous_mappings" | "unexpected_materialization_failure"; issues: readonly LocalCareerMapIssue[] };
const compare = (a: string, b: string) => a.localeCompare(b, "en");
async function hash(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function materializeProvisionalCareerMap(input: {
  sourceMetadata: ProvisionalLocalCareerMapState["sourceMetadata"];
  evidence: readonly ProvisionalLocalCareerMapEvidence[];
  mappingResults: readonly ProvisionalMappingResult[];
  capabilityDefinitions: readonly CareerMapCapabilityDefinition[];
  versions: Omit<ProvisionalLocalCareerMapState["versions"], "materializerVersion">;
  createdAt: string;
  updatedAt: string;
}): Promise<Result> {
  try {
    const mappings = input.mappingResults.flatMap((result) => result.status === "auto_admitted" ? [result.mapping] : []).sort((a, b) => compare(a.capabilityId, b.capabilityId) || compare(a.relationship, b.relationship) || compare(a.mappingId, b.mappingId));
    const unresolvedEvidence = input.mappingResults.flatMap((result) => result.status === "auto_admitted" ? [] : [result.unresolved]).sort((a, b) => compare(a.evidenceId, b.evidenceId));
    if (mappings.length === 0) return { ok: false, code: "no_unambiguous_mappings", issues: [{ code: "no_unambiguous_mappings", path: "mappingResults", message: "No unambiguous provisional mappings were available." }] };
    const grouped = new Map<string, typeof mappings>();
    mappings.forEach((mapping) => grouped.set(mapping.capabilityId, [...(grouped.get(mapping.capabilityId) ?? []), mapping]));
    const capabilities = [...grouped].sort(([a], [b]) => compare(a, b)).map(([capabilityId, items]) => {
      const directEvidenceIds = [...new Set(items.filter((item) => item.relationship === "direct_evidence").map((item) => item.evidenceId))].sort(compare);
      const transferableEvidenceIds = [...new Set(items.filter((item) => item.relationship === "transferable_signal").map((item) => item.evidenceId))].sort(compare);
      return Object.freeze({ capabilityId, directEvidenceIds: Object.freeze(directEvidenceIds), transferableEvidenceIds: Object.freeze(transferableEvidenceIds), provisionalEvidenceCount: new Set([...directEvidenceIds, ...transferableEvidenceIds]).size, reviewedEvidenceCount: 0 as const, mapTrustStatus: "provisional" as const });
    });
    const capabilityVersions = [...new Set(mappings.map((item) => item.capabilityDefinitionVersion))].sort(compare);
    const materializationId = `provisional-materialization:1.0.0:sha256:${await hash(JSON.stringify({ sourceRevision: input.sourceMetadata.sourceRevision, evidenceExtractionVersion: input.versions.evidenceExtractionVersion, mappingPolicyVersion: input.versions.mappingPolicyVersion, capabilityDefinitionVersions: capabilityVersions, materializerVersion: PROVISIONAL_CAREER_MAP_MATERIALIZER_VERSION, mappingIds: mappings.map((item) => item.mappingId).sort(compare) }))}`;
    const state: ProvisionalLocalCareerMapState = Object.freeze({ schemaVersion: PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION, source: "provisional_resume", mapTrustStatus: "provisional", sourceMetadata: Object.freeze({ ...input.sourceMetadata }), versions: Object.freeze({ ...input.versions, materializerVersion: PROVISIONAL_CAREER_MAP_MATERIALIZER_VERSION }), materialization: Object.freeze({ materializationId, revision: 1 as const }), evidence: Object.freeze(input.evidence.map((item) => Object.freeze({ ...item, sourceLocator: Object.freeze({ ...item.sourceLocator }), signals: Object.freeze(item.signals.map((signal) => Object.freeze({ ...signal }))) })).sort((a, b) => compare(a.evidenceId, b.evidenceId))), mappings: Object.freeze(mappings), capabilities: Object.freeze(capabilities), unresolvedEvidence: Object.freeze(unresolvedEvidence), createdAt: input.createdAt, updatedAt: input.updatedAt });
    const validation = validateProvisionalLocalCareerMapState(state, input.capabilityDefinitions);
    return validation.ok ? { ok: true, state } : { ok: false, code: validation.issues.some((item) => item.code === "no_unambiguous_mappings" || item.code === "empty_capabilities") ? "no_unambiguous_mappings" : "invalid_input", issues: validation.issues };
  } catch {
    return { ok: false, code: "unexpected_materialization_failure", issues: [{ code: "unexpected_materialization_failure", path: "materialization", message: "Provisional Career Map materialization failed safely." }] };
  }
}
