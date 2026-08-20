import { validateAnyLocalCareerMapState, type LocalCareerMapState, type LocalCareerMapStateV1, type ProvisionalLocalCareerMapState } from "./local-career-map-state";
import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";

export const LOCAL_CAREER_MAP_PRESENTATION_ADAPTER_VERSION = "1.0.0" as const;
export type PersonalCareerMapPresentation = {
  readonly mode: "personal";
  readonly status: "provisional";
  readonly mapTrustStatus: "reviewed" | "provisional";
  readonly unresolvedEvidenceCount: number;
  readonly reviewedEvidenceCount: number;
  readonly provisionalEvidenceCount: number;
  readonly capabilities: readonly { readonly id: string; readonly label: string; readonly family: string; readonly evidence: readonly { readonly id: string; readonly evidenceId: string; readonly text: string; readonly relationship: "direct_evidence" | "transferable_signal"; readonly sourceStart: number; readonly sourceEnd: number; readonly provisional: true; readonly employer?: string; readonly roleTitle?: string }[] }[];
  readonly futurePaths: { readonly available: false; readonly reason: string };
  readonly roleLens: { readonly available: false; readonly reason: string };
};

export function buildPersonalCareerMapPresentation(input: { localState: LocalCareerMapState; canonicalDefinitions: readonly CareerMapCapabilityDefinition[] }): { ok: true; presentation: PersonalCareerMapPresentation } | { ok: false; issues: readonly { code: string; path: string; message: string }[] } {
  const validation = validateAnyLocalCareerMapState(input.localState, input.canonicalDefinitions);
  if (!validation.ok) return validation;
  const definitions = new Map(input.canonicalDefinitions.map((item) => [item.id, item]));
  let capabilities: PersonalCareerMapPresentation["capabilities"];
  let mapTrustStatus: PersonalCareerMapPresentation["mapTrustStatus"];
  let unresolvedEvidenceCount: number;
  let reviewedEvidenceCount: number;
  let provisionalEvidenceCount: number;

  const state = input.localState as LocalCareerMapStateV1 | ProvisionalLocalCareerMapState;
  if (state.schemaVersion === "1.0.0") {
    capabilities = Object.freeze(state.capabilities.map((item) => Object.freeze({ id: item.capabilityId, label: item.capabilityLabel, family: item.family, evidence: Object.freeze(item.mappings.map((mapping) => Object.freeze({ id: mapping.mappingId, evidenceId: mapping.evidenceId, text: mapping.sourceText, relationship: mapping.relationship, sourceStart: mapping.sourceStart, sourceEnd: mapping.sourceEnd, provisional: true as const }))) })));
    mapTrustStatus = "reviewed";
    unresolvedEvidenceCount = 0;
    reviewedEvidenceCount = new Set(state.capabilities.flatMap((item) => item.mappings.map((mapping) => mapping.evidenceId))).size;
    provisionalEvidenceCount = 0;
  } else {
    const provisionalState = state as ProvisionalLocalCareerMapState;
    const evidence = new Map(provisionalState.evidence.map((item) => [item.evidenceId, item]));
    capabilities = Object.freeze(provisionalState.capabilities.map((item) => {
      const definition = definitions.get(item.capabilityId)!;
      const active = provisionalState.mappings.filter((mapping) => mapping.capabilityId === item.capabilityId);
      return Object.freeze({ id: item.capabilityId, label: definition.label, family: definition.family ?? "", evidence: Object.freeze(active.map((mapping) => { const record = evidence.get(mapping.evidenceId)!; return Object.freeze({ id: mapping.mappingId, evidenceId: mapping.evidenceId, text: record.sourceExcerpt, relationship: mapping.relationship, sourceStart: record.sourceLocator.startOffset, sourceEnd: record.sourceLocator.endOffset, provisional: true as const, ...(record.employer ? { employer: record.employer } : {}), ...(record.roleTitle ? { roleTitle: record.roleTitle } : {}) }); })) });
    }));
    mapTrustStatus = "provisional";
    unresolvedEvidenceCount = provisionalState.unresolvedEvidence.length;
    reviewedEvidenceCount = provisionalState.capabilities.reduce((sum, item) => sum + item.reviewedEvidenceCount, 0);
    provisionalEvidenceCount = provisionalState.capabilities.reduce((sum, item) => sum + item.provisionalEvidenceCount, 0);
  }
  return { ok: true, presentation: Object.freeze({ mode: "personal", status: "provisional", mapTrustStatus, unresolvedEvidenceCount, reviewedEvidenceCount, provisionalEvidenceCount, capabilities, futurePaths: Object.freeze({ available: false as const, reason: "Future-path recommendations are not available from résumé evidence alone." }), roleLens: Object.freeze({ available: false as const, reason: "Role Lens requires additional role-fit evidence and is unavailable in personal résumé mode." }) }) };
}
