import type { CanonicalCapabilityDefinition } from "./canonical-capability-library";
import {
  CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION,
  type CanonicalCapabilityInferenceIssue,
  type CanonicalCapabilityInferenceResult,
  type CanonicalCapabilityProposal,
  type CanonicalCapabilityRelationship,
  type CanonicalInferenceEvidence,
  type CanonicalInferencePolicy,
  type CanonicalInferenceReason,
  type CanonicalInferenceRule,
  type CanonicalUnresolvedCapabilityProposal,
} from "./canonical-personal-capability-inference-contract";

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const relationship = (value: unknown): value is CanonicalCapabilityRelationship => value === "direct_evidence" || value === "transferable_signal";
const signalFields = new Set(["action", "context", "outcome", "ownership", "scope"]);
const signalKey = (value: { field: string; value: string }) => `${value.field}:${value.value}`;

export function validateCanonicalInferencePolicy(policy: CanonicalInferencePolicy, definitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]): readonly CanonicalCapabilityInferenceIssue[] {
  const issues: CanonicalCapabilityInferenceIssue[] = [];
  const capabilityIds = new Set(definitions.map((item) => item.id));
  const ruleIds = new Set<string>();
  if (!nonBlank(policy?.policyVersion) || policy?.coverage !== "bounded_non_exhaustive" || !Array.isArray(policy?.rules) || policy.rules.length === 0) issues.push({ code: "invalid_mapping_policy", path: "policy", message: "A versioned, bounded authored mapping policy is required." });
  (policy?.rules ?? []).forEach((rule, index) => {
    const path = `rules[${index}]`;
    if (!nonBlank(rule.ruleId) || ruleIds.has(rule.ruleId)) issues.push({ code: "duplicate_rule_id", path: `${path}.ruleId`, message: "Authored rule IDs must be nonblank and unique." });
    ruleIds.add(rule.ruleId);
    if (!nonBlank(rule.ruleVersion)) issues.push({ code: "invalid_mapping_policy", path: `${path}.ruleVersion`, message: "Authored rule version is required." });
    if (!capabilityIds.has(rule.capabilityId)) issues.push({ code: "unknown_capability", path: `${path}.capabilityId`, message: "Authored rule references an unknown canonical capability." });
    if (!relationship(rule.relationship)) issues.push({ code: "invalid_mapping_policy", path: `${path}.relationship`, message: "Authored rule relationship is invalid." });
    if (!nonBlank(rule.explanation)) issues.push({ code: "missing_explanation", path: `${path}.explanation`, message: "Authored rule explanation is required." });
    if (!Array.isArray(rule.requiredSignals) || rule.requiredSignals.length === 0 || rule.requiredSignals.some((item) => !signalFields.has(item.field) || !nonBlank(item.value))) issues.push({ code: "invalid_mapping_policy", path: `${path}.requiredSignals`, message: "Authored rules require structured evidence signals." });
  });
  return Object.freeze(issues);
}

function validEvidence(value: CanonicalInferenceEvidence): boolean {
  return Boolean(value && nonBlank(value.evidenceId) && nonBlank(value.sourceExcerpt) && nonBlank(value.sourceLocator?.locatorId) && Number.isSafeInteger(value.sourceLocator.startOffset) && value.sourceLocator.startOffset >= 0 && Number.isSafeInteger(value.sourceLocator.endOffset) && value.sourceLocator.endOffset > value.sourceLocator.startOffset && (value.sourceRevision === null || nonBlank(value.sourceRevision)) && Array.isArray(value.signals) && value.signals.every((item) => signalFields.has(item.field) && nonBlank(item.value)));
}

function matches(rule: CanonicalInferenceRule, evidence: CanonicalInferenceEvidence): boolean {
  const available = new Set(evidence.signals.map(signalKey));
  return rule.requiredSignals.every((item) => available.has(signalKey(item))) && !rule.excludedSignals.some((item) => available.has(signalKey(item)));
}

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function proposalId(evidenceId: string, capabilityId: string, proposalRelationship: CanonicalCapabilityRelationship, policyVersion: string, registryVersion: string): Promise<string> {
  const digest = await sha256(JSON.stringify({ evidenceId, capabilityId, relationship: proposalRelationship, mappingPolicyVersion: policyVersion, capabilityDefinitionVersion: registryVersion }));
  // Compatibility identity is authoritative; the legacy prefix must remain stable.
  return `provisional-mapping:${CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION}:sha256:${digest}`;
}

function unresolved(evidence: CanonicalInferenceEvidence, policyVersion: string, registryVersion: string, reason: CanonicalInferenceReason, rules: readonly CanonicalInferenceRule[], explanation: string, disposition: "unresolved" | "unsupported"): CanonicalCapabilityInferenceResult {
  const locator = evidence?.sourceLocator ?? { locatorId: "invalid-locator", startOffset: 0, endOffset: 1 };
  const value: CanonicalUnresolvedCapabilityProposal = Object.freeze({ contractVersion: CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION, evidenceId: evidence?.evidenceId || "invalid-evidence", sourceExcerpt: evidence?.sourceExcerpt || "Unavailable evidence excerpt", sourceLocator: Object.freeze({ ...locator }), sourceRevision: evidence?.sourceRevision ?? null, reason, candidateCapabilityIds: Object.freeze([...new Set(rules.map((item) => item.capabilityId))].sort()), candidateRelationships: Object.freeze([...new Set(rules.map((item) => item.relationship))].sort()), matchingRuleIds: Object.freeze(rules.map((item) => item.ruleId).sort()), explanation, inferencePolicyVersion: policyVersion, capabilityRegistryVersion: registryVersion });
  return Object.freeze(disposition === "unsupported" ? { disposition, unresolved: value } : { disposition, unresolved: value });
}

export async function inferCanonicalPersonalCapability(input: { evidence: CanonicalInferenceEvidence; policy: CanonicalInferencePolicy; capabilityDefinitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]; capabilityRegistryVersion: string }): Promise<CanonicalCapabilityInferenceResult> {
  const { evidence, policy, capabilityDefinitions, capabilityRegistryVersion } = input;
  try {
    if (!validEvidence(evidence) || !nonBlank(capabilityRegistryVersion)) return unresolved(evidence, policy?.policyVersion ?? "invalid-policy", capabilityRegistryVersion || "invalid-definition-version", "invalid_evidence", [], "Evidence structure or version is invalid.", "unresolved");
    const policyIssues = validateCanonicalInferencePolicy(policy, capabilityDefinitions);
    if (policyIssues.length > 0) return unresolved(evidence, policy?.policyVersion ?? "invalid-policy", capabilityRegistryVersion, "invalid_policy", [], policyIssues[0].message, "unresolved");
    const matched = policy.rules.filter((rule) => matches(rule, evidence));
    if (matched.length === 0) return unresolved(evidence, policy.policyVersion, capabilityRegistryVersion, "no_canonical_rule", [], "No authored canonical mapping rule covers this evidence.", "unsupported");
    const capabilities = new Set(matched.map((item) => item.capabilityId));
    if (capabilities.size > 1) return unresolved(evidence, policy.policyVersion, capabilityRegistryVersion, "multiple_candidates", matched, "Multiple authored canonical capability rules match; no candidate was selected.", "unresolved");
    const relationships = new Set(matched.map((item) => item.relationship));
    if (relationships.size > 1) return unresolved(evidence, policy.policyVersion, capabilityRegistryVersion, "relationship_conflict", matched, "Competing authored relationships match; no relationship was selected.", "unresolved");
    if (matched.length > 1) return unresolved(evidence, policy.policyVersion, capabilityRegistryVersion, "multiple_candidates", matched, "Multiple authored rules match; no rule was ranked.", "unresolved");
    const rule = matched[0];
    const proposal: CanonicalCapabilityProposal = Object.freeze({ contractVersion: CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION, proposalId: await proposalId(evidence.evidenceId, rule.capabilityId, rule.relationship, policy.policyVersion, capabilityRegistryVersion), evidenceId: evidence.evidenceId, capabilityId: rule.capabilityId, relationship: rule.relationship, method: "authored_deterministic", matchedRuleId: rule.ruleId, matchedRuleVersion: rule.ruleVersion, explanation: rule.explanation, inferencePolicyVersion: policy.policyVersion, capabilityRegistryVersion });
    return Object.freeze({ disposition: "admitted", proposal });
  } catch {
    return unresolved(evidence, policy?.policyVersion ?? "invalid-policy", capabilityRegistryVersion || "invalid-definition-version", "unexpected_mapping_failure", [], "Mapping could not be completed deterministically.", "unresolved");
  }
}
