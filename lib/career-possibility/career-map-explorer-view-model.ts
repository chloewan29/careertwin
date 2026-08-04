import type { CareerMapFuturePath } from "./role-lens-map-adapter";
import type { PersonalCareerMapPresentation } from "./local-career-map-presentation-adapter";

export type CareerMapExplorerCapability = {
  readonly id: string;
  readonly label: string;
  readonly family: string;
  readonly strength?: number;
  readonly subCapabilities: readonly { readonly id: string; readonly label: string; readonly strength?: number }[];
  readonly supportingExperienceIds: readonly string[];
  readonly adjacentRoleIds: readonly string[];
};

export type CareerMapExplorerExperience = {
  readonly id: string;
  readonly company?: string;
  readonly role?: string;
  readonly evidenceText: string;
  readonly relevance?: "high" | "strong" | "medium";
  readonly capabilityIds: readonly string[];
  readonly roleIds: readonly string[];
  readonly context?: string;
  readonly outcome?: string;
  readonly transferabilityExplanation?: string;
  readonly relationshipByCapabilityId?: Readonly<Record<string, "direct_evidence" | "transferable_signal">>;
  readonly reviewStatus?: "reviewed" | "provisional";
  readonly sourceStart?: number;
  readonly sourceEnd?: number;
};

export type CareerMapExplorerViewModel = {
  readonly mode: "example" | "personal";
  readonly profileSummary: string;
  readonly capabilities: readonly CareerMapExplorerCapability[];
  readonly experiences: readonly CareerMapExplorerExperience[];
  readonly adjacentRoles: readonly CareerMapFuturePath[];
};

export function buildPersonalCareerMapExplorerViewModel(presentation: PersonalCareerMapPresentation): CareerMapExplorerViewModel {
  const experiences = new Map<string, CareerMapExplorerExperience>();
  for (const capability of presentation.capabilities) for (const evidence of capability.evidence) {
    const current = experiences.get(evidence.evidenceId);
    const capabilityIds = current ? [...new Set([...current.capabilityIds, capability.id])] : [capability.id];
    experiences.set(evidence.evidenceId, Object.freeze({
      id: evidence.evidenceId,
      evidenceText: evidence.text,
      capabilityIds: Object.freeze(capabilityIds),
      roleIds: Object.freeze([]),
      relationshipByCapabilityId: Object.freeze({ ...current?.relationshipByCapabilityId, [capability.id]: evidence.relationship }),
      reviewStatus: presentation.mapTrustStatus,
      sourceStart: evidence.sourceStart,
      sourceEnd: evidence.sourceEnd,
    }));
  }
  return Object.freeze({
    mode: "personal",
    profileSummary: "Capabilities supported by evidence in your CV.",
    capabilities: Object.freeze(presentation.capabilities.map((capability) => Object.freeze({ id: capability.id, label: capability.label, family: capability.family, subCapabilities: Object.freeze([]), supportingExperienceIds: Object.freeze([...new Set(capability.evidence.map((evidence) => evidence.evidenceId))]), adjacentRoleIds: Object.freeze([]) }))),
    experiences: Object.freeze([...experiences.values()]),
    adjacentRoles: Object.freeze([]),
  });
}
