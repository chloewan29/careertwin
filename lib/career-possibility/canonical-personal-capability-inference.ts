import type { CanonicalCapabilityDefinition } from "./canonical-capability-library";
import {
  CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION,
  CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION,
  type CanonicalCapabilityScopedInferenceIssue,
  type CanonicalCapabilityInferenceIssue,
  type CanonicalCapabilityInferenceResult,
  type CanonicalCapabilityRelationship,
  type CanonicalInferenceEvidence,
  type CanonicalInferencePolicy,
  type CanonicalInferenceReason,
  type CanonicalInferenceRule,
  type CanonicalPluralCapabilityInferenceResult,
  type CanonicalPluralCapabilityProposal,
  type CanonicalUnsupportedSemanticResidue,
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

async function stableId(prefix: string, value: unknown): Promise<string> {
  return `${prefix}:sha256:${await sha256(JSON.stringify(value))}`;
}

const compare = (left: string, right: string) => left.localeCompare(right, "en");

export async function inferCanonicalPersonalCapabilities(input: { evidence: CanonicalInferenceEvidence; policy: CanonicalInferencePolicy; capabilityDefinitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]; capabilityRegistryVersion: string }): Promise<CanonicalPluralCapabilityInferenceResult> {
  const { evidence, policy, capabilityDefinitions, capabilityRegistryVersion } = input;
  const evidenceId = evidence?.evidenceId || "invalid-evidence";
  const sourceRevision = evidence?.sourceRevision ?? null;
  const base = { contractVersion: CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION, evidenceId, sourceRevision, inferencePolicyVersion: policy?.policyVersion ?? "invalid-policy", capabilityRegistryVersion: capabilityRegistryVersion || "invalid-definition-version" } as const;
  const issue = async (reason: CanonicalCapabilityScopedInferenceIssue["reason"], explanation: string): Promise<CanonicalPluralCapabilityInferenceResult> => Object.freeze({ ...base, admittedProposals: Object.freeze([]), unresolved: Object.freeze([Object.freeze({ contractVersion: CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION, unresolvedId: await stableId(`canonical-inference-unresolved:${CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION}`, { evidenceId, capabilityId: null, reason, policyVersion: policy?.policyVersion ?? "invalid-policy", capabilityRegistryVersion }), evidenceId, capabilityId: null, sourceRevision, reason, candidateRelationships: Object.freeze([]), matchingRuleIds: Object.freeze([]), explanation, inferencePolicyVersion: policy?.policyVersion ?? "invalid-policy", capabilityRegistryVersion: capabilityRegistryVersion || "invalid-definition-version" })]), unsupportedResidue: Object.freeze([]) });
  try {
    if (!validEvidence(evidence) || !nonBlank(capabilityRegistryVersion)) return issue("invalid_evidence", "Evidence structure or version is invalid.");
    const policyIssues = validateCanonicalInferencePolicy(policy, capabilityDefinitions);
    if (policyIssues.length > 0) return issue("invalid_policy", policyIssues[0].message);
    const matched = policy.rules.filter((rule) => matches(rule, evidence));
    if (matched.length === 0) {
      const signalKeys = Object.freeze([...new Set(evidence.signals.map(signalKey))].sort(compare));
      const residue: CanonicalUnsupportedSemanticResidue = Object.freeze({ residueId: await stableId(`canonical-inference-residue:${CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION}`, { evidenceId, signalKeys, policyVersion: policy.policyVersion, capabilityRegistryVersion }), evidenceId, sourceRevision, reason: "no_canonical_rule", signalKeys });
      return Object.freeze({ ...base, admittedProposals: Object.freeze([]), unresolved: Object.freeze([]), unsupportedResidue: Object.freeze([residue]) });
    }
    const grouped = new Map<string, CanonicalInferenceRule[]>();
    for (const rule of matched) grouped.set(rule.capabilityId, [...(grouped.get(rule.capabilityId) ?? []), rule]);
    const admitted: CanonicalPluralCapabilityProposal[] = [];
    const scopedIssues: CanonicalCapabilityScopedInferenceIssue[] = [];
    for (const [capabilityId, rules] of [...grouped].sort(([left], [right]) => compare(left, right))) {
      const orderedRules = [...rules].sort((left, right) => compare(left.relationship, right.relationship) || compare(left.ruleId, right.ruleId));
      const relationships = [...new Set(orderedRules.map((rule) => rule.relationship))].sort(compare);
      if (relationships.length > 1) {
        const reason = "relationship_conflict" as const;
        scopedIssues.push(Object.freeze({ contractVersion: CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION, unresolvedId: await stableId(`canonical-inference-unresolved:${CANONICAL_PERSONAL_CAPABILITY_INFERENCE_PLURAL_CONTRACT_VERSION}`, { evidenceId, capabilityId, reason, relationships, policyVersion: policy.policyVersion, capabilityRegistryVersion }), evidenceId, capabilityId, sourceRevision, reason, candidateRelationships: Object.freeze(relationships), matchingRuleIds: Object.freeze(orderedRules.map((rule) => rule.ruleId)), explanation: "Competing authored relationships match this capability; that capability was not admitted.", inferencePolicyVersion: policy.policyVersion, capabilityRegistryVersion }));
        continue;
      }
      const selected = orderedRules[0];
      const proposal: CanonicalPluralCapabilityProposal = Object.freeze({ contractVersion: CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION, proposalId: await proposalId(evidenceId, capabilityId, selected.relationship, policy.policyVersion, capabilityRegistryVersion), evidenceId, capabilityId, relationship: selected.relationship, method: "authored_deterministic", matchedRuleId: selected.ruleId, matchedRuleVersion: selected.ruleVersion, matchingRuleIds: Object.freeze(orderedRules.map((rule) => rule.ruleId)), explanation: selected.explanation, inferencePolicyVersion: policy.policyVersion, capabilityRegistryVersion });
      admitted.push(proposal);
    }
    return Object.freeze({ ...base, admittedProposals: Object.freeze(admitted.sort((left, right) => compare(left.capabilityId, right.capabilityId) || compare(left.relationship, right.relationship) || compare(left.proposalId, right.proposalId))), unresolved: Object.freeze(scopedIssues.sort((left, right) => compare(left.capabilityId ?? "", right.capabilityId ?? "") || compare(left.reason, right.reason) || compare(left.unresolvedId, right.unresolvedId))), unsupportedResidue: Object.freeze([]) });
  } catch {
    return issue("unexpected_mapping_failure", "Mapping could not be completed deterministically.");
  }
}

function unresolved(evidence: CanonicalInferenceEvidence, policyVersion: string, registryVersion: string, reason: CanonicalInferenceReason, rules: readonly CanonicalInferenceRule[], explanation: string, disposition: "unresolved" | "unsupported"): CanonicalCapabilityInferenceResult {
  const locator = evidence?.sourceLocator ?? { locatorId: "invalid-locator", startOffset: 0, endOffset: 1 };
  const value: CanonicalUnresolvedCapabilityProposal = Object.freeze({ contractVersion: CANONICAL_PERSONAL_CAPABILITY_INFERENCE_CONTRACT_VERSION, evidenceId: evidence?.evidenceId || "invalid-evidence", sourceExcerpt: evidence?.sourceExcerpt || "Unavailable evidence excerpt", sourceLocator: Object.freeze({ ...locator }), sourceRevision: evidence?.sourceRevision ?? null, reason, candidateCapabilityIds: Object.freeze([...new Set(rules.map((item) => item.capabilityId))].sort()), candidateRelationships: Object.freeze([...new Set(rules.map((item) => item.relationship))].sort()), matchingRuleIds: Object.freeze(rules.map((item) => item.ruleId).sort()), explanation, inferencePolicyVersion: policyVersion, capabilityRegistryVersion: registryVersion });
  return Object.freeze(disposition === "unsupported" ? { disposition, unresolved: value } : { disposition, unresolved: value });
}

export async function inferCanonicalPersonalCapability(input: { evidence: CanonicalInferenceEvidence; policy: CanonicalInferencePolicy; capabilityDefinitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]; capabilityRegistryVersion: string }): Promise<CanonicalCapabilityInferenceResult> {
  const plural = await inferCanonicalPersonalCapabilities(input);
  if (plural.unresolved.length > 0) {
    const first = plural.unresolved[0];
    const rules = input.policy?.rules?.filter((rule) => first.matchingRuleIds.includes(rule.ruleId)) ?? [];
    return unresolved(input.evidence, first.inferencePolicyVersion, first.capabilityRegistryVersion, first.reason, rules, first.explanation, "unresolved");
  }
  if (plural.admittedProposals.length === 1 && plural.admittedProposals[0].matchingRuleIds.length === 1) return Object.freeze({ disposition: "admitted", proposal: plural.admittedProposals[0] });
  if (plural.admittedProposals.length === 1) {
    const proposal = plural.admittedProposals[0];
    const rules = input.policy.rules.filter((rule) => proposal.matchingRuleIds.includes(rule.ruleId));
    return unresolved(input.evidence, input.policy.policyVersion, input.capabilityRegistryVersion, "multiple_candidates", rules, "Multiple authored rules match; the legacy singular surface cannot rank them.", "unresolved");
  }
  if (plural.admittedProposals.length > 1) {
    const rules = input.policy.rules.filter((rule) => plural.admittedProposals.some((proposal) => proposal.matchingRuleIds.includes(rule.ruleId)));
    return unresolved(input.evidence, input.policy.policyVersion, input.capabilityRegistryVersion, "multiple_candidates", rules, "Multiple authored canonical capability rules match; the legacy singular surface cannot select one.", "unresolved");
  }
  return unresolved(input.evidence, input.policy?.policyVersion ?? "invalid-policy", input.capabilityRegistryVersion || "invalid-definition-version", "no_canonical_rule", [], "No authored canonical mapping rule covers this evidence.", "unsupported");
}
