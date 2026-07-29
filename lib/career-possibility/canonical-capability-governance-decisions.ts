import type { CanonicalCapabilityLibrary } from "./canonical-capability-library";

export const CANONICAL_CAPABILITY_GOVERNANCE_SCHEMA_VERSION = "1.0.0" as const;
export const CANONICAL_CAPABILITY_GOVERNANCE_CONTENT_VERSION = "1.0.0" as const;

export type CanonicalCapabilityGovernanceReason =
  | "identity_overlap"
  | "role_specific_wording"
  | "family_ambiguity"
  | "requires_schema_redesign"
  | "role_responsibility_not_capability"
  | "tool_or_platform_specific"
  | "output_or_process_label"
  | "noncanonical_source_identity";

export type CanonicalCapabilityGovernanceDecision =
  | { readonly capabilityId: string; readonly outcome: "admit" }
  | { readonly capabilityId: string; readonly outcome: "defer"; readonly reason: CanonicalCapabilityGovernanceReason }
  | { readonly capabilityId: string; readonly outcome: "exclude"; readonly reason: CanonicalCapabilityGovernanceReason };

export type CanonicalCapabilityGovernanceLibrary = {
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly decisions: readonly CanonicalCapabilityGovernanceDecision[];
};

export type CanonicalCapabilityGovernanceIssue = {
  readonly code: "invalid_schema_version" | "invalid_content_version" | "invalid_capability_id" | "invalid_outcome" | "invalid_reason" | "duplicate_decision_id" | "missing_candidate_decision" | "decision_for_non_candidate" | "admit_missing_registry_entry" | "noncanonical_decision_in_registry";
  readonly path: string;
  readonly message: string;
};

export type CanonicalCapabilityGovernanceValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly CanonicalCapabilityGovernanceIssue[] };

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const outcomes = new Set(["admit", "defer", "exclude"]);
const reasons = new Set<CanonicalCapabilityGovernanceReason>(["identity_overlap", "role_specific_wording", "family_ambiguity", "requires_schema_redesign", "role_responsibility_not_capability", "tool_or_platform_specific", "output_or_process_label", "noncanonical_source_identity"]);
const compareText = (left: string, right: string) => left.localeCompare(right, "en");

export function validateCanonicalCapabilityGovernance(input: {
  readonly library: CanonicalCapabilityGovernanceLibrary;
  readonly reviewedCandidateIds: readonly string[];
  readonly canonicalLibrary: CanonicalCapabilityLibrary;
}): CanonicalCapabilityGovernanceValidationResult {
  const issues: CanonicalCapabilityGovernanceIssue[] = [];
  const add = (code: CanonicalCapabilityGovernanceIssue["code"], path: string, message: string) => issues.push({ code, path, message });
  if (input.library.schemaVersion !== CANONICAL_CAPABILITY_GOVERNANCE_SCHEMA_VERSION) add("invalid_schema_version", "schemaVersion", "Unsupported governance schema version.");
  if (!versionPattern.test(input.library.contentVersion)) add("invalid_content_version", "contentVersion", "Invalid governance content version.");
  const candidateIds = new Set(input.reviewedCandidateIds);
  const registryIds = new Set(input.canonicalLibrary.capabilities.map((item) => item.id));
  const seen = new Set<string>();
  input.library.decisions.forEach((decision, index) => {
    const path = `decisions[${index}]`;
    if (!idPattern.test(decision.capabilityId)) add("invalid_capability_id", `${path}.capabilityId`, "Invalid governance capability ID.");
    if (!outcomes.has(decision.outcome)) add("invalid_outcome", `${path}.outcome`, "Invalid governance outcome.");
    if (decision.outcome !== "admit" && !reasons.has(decision.reason)) add("invalid_reason", `${path}.reason`, "Invalid governance reason.");
    if (seen.has(decision.capabilityId)) add("duplicate_decision_id", `${path}.capabilityId`, `Duplicate decision for ${decision.capabilityId}.`);
    if (!candidateIds.has(decision.capabilityId)) add("decision_for_non_candidate", `${path}.capabilityId`, `Decision ${decision.capabilityId} is not in the reviewed candidate set.`);
    if (decision.outcome === "admit" && !registryIds.has(decision.capabilityId)) add("admit_missing_registry_entry", path, `Admitted decision ${decision.capabilityId} has no registry entry.`);
    if (decision.outcome !== "admit" && registryIds.has(decision.capabilityId)) add("noncanonical_decision_in_registry", path, `${decision.capabilityId} must remain outside the registry.`);
    seen.add(decision.capabilityId);
  });
  input.reviewedCandidateIds.forEach((id) => { if (!seen.has(id)) add("missing_candidate_decision", `candidates:${id}`, `Candidate ${id} lacks a governance decision.`); });
  issues.sort((a, b) => compareText(a.path, b.path) || compareText(a.code, b.code));
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

const admitIds = ["analytics-governance", "architecture-governance", "benefits-realisation", "business-ownership", "change-leadership", "commercial-leadership", "ecosystem-operations", "education-delivery", "education-partnerships", "hr-systems", "investment-governance", "legal-technology", "marketing-effectiveness", "operating-control", "operating-strategy", "partner-strategy", "people-process", "pipeline-management", "policy-governance", "risk-controls", "roadmap-governance", "service-performance", "strategic-analysis", "talent-planning", "tooling-enablement", "workforce-advisory"] as const;
const deferDecisions = [
  ["analytics-leadership", "family_ambiguity"], ["technical-leadership", "family_ambiguity"],
  ["value-realisation", "identity_overlap"], ["campaign-planning", "identity_overlap"], ["financial-planning", "identity_overlap"], ["gtm-planning", "identity_overlap"], ["program-planning", "identity_overlap"], ["resource-planning", "identity_overlap"],
  ["data-storytelling", "identity_overlap"], ["decision-storytelling", "identity_overlap"], ["executive-narrative", "identity_overlap"], ["executive-reporting", "identity_overlap"], ["commercial-analysis", "identity_overlap"], ["commercial-modelling", "identity_overlap"],
  ["business-partnering", "role_specific_wording"], ["clinical-delivery", "role_specific_wording"], ["engineering-delivery", "role_specific_wording"], ["executive-engagement", "role_specific_wording"], ["learner-outcomes", "role_specific_wording"], ["learning-design", "role_specific_wording"], ["legal-workflow", "role_specific_wording"], ["quality-oversight", "role_specific_wording"], ["renewal-risk", "role_specific_wording"], ["service-operations", "role_specific_wording"], ["site-management", "role_specific_wording"], ["vendor-governance", "role_specific_wording"],
  ["stakeholder-governance", "family_ambiguity"],
] as const;

const decisions: readonly CanonicalCapabilityGovernanceDecision[] = [
  ...admitIds.map((capabilityId) => Object.freeze({ capabilityId, outcome: "admit" as const })),
  ...deferDecisions.map(([capabilityId, reason]) => Object.freeze({ capabilityId, outcome: "defer" as const, reason })),
  Object.freeze({ capabilityId: "matter-management", outcome: "exclude" as const, reason: "role_responsibility_not_capability" as const }),
].sort((a, b) => compareText(a.capabilityId, b.capabilityId));

export const canonicalCapabilityGovernanceLibrary: CanonicalCapabilityGovernanceLibrary = Object.freeze({
  schemaVersion: CANONICAL_CAPABILITY_GOVERNANCE_SCHEMA_VERSION,
  contentVersion: CANONICAL_CAPABILITY_GOVERNANCE_CONTENT_VERSION,
  decisions: Object.freeze(decisions),
});
