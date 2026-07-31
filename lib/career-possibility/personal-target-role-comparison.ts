import { validateLocalCareerMapState, type LocalCareerMapState } from "./local-career-map-state";
import type { CanonicalCapabilityLibrary } from "./canonical-capability-library";
import type { CanonicalCapabilityGovernanceLibrary } from "./canonical-capability-governance-decisions";
import type { RoleCapabilityProfile } from "./role-capability-library";

export const PERSONAL_TARGET_ROLE_COMPARISON_VERSION = "1.0.0" as const;
export type RequirementOutcome = "directly_demonstrated" | "transferable_signal" | "evidence_not_yet_shown" | "governance_deferred" | "governance_excluded";
export type NextProofToBuild = {
  readonly capabilityId: string;
  readonly capabilityLabel: string;
  readonly importance: "must" | "should" | "differentiator";
  readonly expectedEvidence: string;
  readonly reason: string;
};
export type PersonalTargetRoleComparison = {
  readonly version: typeof PERSONAL_TARGET_ROLE_COMPARISON_VERSION;
  readonly role: { readonly roleId: string; readonly title: string; readonly domain: string };
  readonly summary: Readonly<Record<RequirementOutcome | "unknown", number>> & { readonly totalRequirements: number };
  readonly nextProofToBuild?: NextProofToBuild;
  readonly requirements: readonly {
    readonly capabilityId: string;
    readonly roleLabel: string;
    readonly importance: "must" | "should" | "differentiator";
    readonly outcome: RequirementOutcome;
    readonly canonicalLabel?: string;
    readonly family?: string;
    readonly governanceReason?: string;
    readonly expectedEvidence?: string;
    readonly evidence: readonly { readonly mappingId: string; readonly evidenceId: string; readonly text: string; readonly relationship: "direct_evidence" | "transferable_signal" }[];
  }[];
};

export function buildPersonalTargetRoleComparison(input: { localCareerMapState: LocalCareerMapState; targetRoleProfile: RoleCapabilityProfile; canonicalCapabilityLibrary: CanonicalCapabilityLibrary; governanceDecisions: CanonicalCapabilityGovernanceLibrary; definitionVersion: string }): { ok: true; comparison: PersonalTargetRoleComparison } | { ok: false; issues: readonly { code: string; path: string; message: string }[] } {
  const definitions = input.canonicalCapabilityLibrary.capabilities.map((item) => ({ id: item.id, label: item.label, family: item.family }));
  const valid = validateLocalCareerMapState(input.localCareerMapState, definitions);
  if (!valid.ok) return valid;
  if (input.localCareerMapState.definitionVersion !== input.definitionVersion) return { ok: false, issues: [{ code: "definition_version_mismatch", path: "definitionVersion", message: "Personal map definition version does not match." }] };

  const roleRequirements = [...input.targetRoleProfile.mustHaveCapabilities, ...input.targetRoleProfile.shouldHaveCapabilities, ...input.targetRoleProfile.differentiatingCapabilities];
  const seen = new Set<string>();
  const canonical = new Map(input.canonicalCapabilityLibrary.capabilities.map((item) => [item.id, item]));
  const governance = new Map(input.governanceDecisions.decisions.map((item) => [item.capabilityId, item]));
  const personal = new Map(input.localCareerMapState.capabilities.map((item) => [item.capabilityId, item]));
  const requirements: PersonalTargetRoleComparison["requirements"][number][] = [];

  for (const [index, requirement] of roleRequirements.entries()) {
    if (seen.has(requirement.capabilityId)) return { ok: false, issues: [{ code: "duplicate_requirement", path: `requirements[${index}]`, message: "Role requirement is duplicated." }] };
    seen.add(requirement.capabilityId);
    const definition = canonical.get(requirement.capabilityId);
    if (definition) {
      const mappings = personal.get(requirement.capabilityId)?.mappings ?? [];
      const direct = mappings.some((mapping) => mapping.relationship === "direct_evidence");
      const outcome: RequirementOutcome = direct ? "directly_demonstrated" : mappings.length ? "transferable_signal" : "evidence_not_yet_shown";
      const expectedEvidence = outcome === "evidence_not_yet_shown" && requirement.expectedEvidence?.trim() ? requirement.expectedEvidence : "";
      requirements.push(Object.freeze({
        capabilityId: requirement.capabilityId,
        roleLabel: requirement.label,
        importance: requirement.importance,
        outcome,
        canonicalLabel: definition.label,
        family: definition.family,
        ...(expectedEvidence ? { expectedEvidence } : {}),
        evidence: Object.freeze(mappings.map((mapping) => Object.freeze({ mappingId: mapping.mappingId, evidenceId: mapping.evidenceId, text: mapping.sourceText, relationship: mapping.relationship }))),
      }));
      continue;
    }

    const decision = governance.get(requirement.capabilityId);
    if (!decision || decision.outcome === "admit") return { ok: false, issues: [{ code: "unknown_requirement", path: `requirements[${index}].capabilityId`, message: `Unknown requirement ${requirement.capabilityId}.` }] };
    requirements.push(Object.freeze({ capabilityId: requirement.capabilityId, roleLabel: requirement.label, importance: requirement.importance, outcome: decision.outcome === "defer" ? "governance_deferred" : "governance_excluded", governanceReason: decision.reason, evidence: Object.freeze([]) }));
  }

  const count = (outcome: RequirementOutcome) => requirements.filter((requirement) => requirement.outcome === outcome).length;
  const importanceOrder: readonly NextProofToBuild["importance"][] = ["must", "should", "differentiator"];
  const nextRequirement = importanceOrder
    .map((importance) => requirements.find((requirement) => requirement.importance === importance && requirement.outcome === "evidence_not_yet_shown" && Boolean(requirement.expectedEvidence?.trim())))
    .find((requirement) => requirement !== undefined);
  const reasonByImportance: Readonly<Record<NextProofToBuild["importance"], string>> = {
    must: "Must-have requirement with no reviewed evidence yet.",
    should: "Supporting requirement with no reviewed evidence yet.",
    differentiator: "Differentiating requirement with no reviewed evidence yet.",
  };
  const nextProofToBuild = nextRequirement?.expectedEvidence ? Object.freeze({
    capabilityId: nextRequirement.capabilityId,
    capabilityLabel: nextRequirement.canonicalLabel ?? nextRequirement.roleLabel,
    importance: nextRequirement.importance,
    expectedEvidence: nextRequirement.expectedEvidence,
    reason: reasonByImportance[nextRequirement.importance],
  }) : undefined;
  return { ok: true, comparison: Object.freeze({
    version: PERSONAL_TARGET_ROLE_COMPARISON_VERSION,
    role: Object.freeze({ roleId: input.targetRoleProfile.roleFamilyId, title: input.targetRoleProfile.canonicalTitle, domain: input.targetRoleProfile.domain }),
    summary: Object.freeze({ totalRequirements: requirements.length, directly_demonstrated: count("directly_demonstrated"), transferable_signal: count("transferable_signal"), evidence_not_yet_shown: count("evidence_not_yet_shown"), governance_deferred: count("governance_deferred"), governance_excluded: count("governance_excluded"), unknown: 0 }),
    ...(nextProofToBuild ? { nextProofToBuild } : {}),
    requirements: Object.freeze(requirements),
  }) };
}
