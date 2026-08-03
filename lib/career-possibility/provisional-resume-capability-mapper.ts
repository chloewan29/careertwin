import type { CanonicalCapabilityDefinition } from "./canonical-capability-library";
import {
  PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION,
  type ProvisionalAutoAdmittedMapping,
  type ProvisionalMappingEvidence,
  type ProvisionalMappingPolicy,
  type ProvisionalMappingRelationship,
  type ProvisionalMappingResult,
  type ProvisionalMappingRule,
  type ProvisionalMappingValidationIssue,
  type ProvisionalUnresolvedMapping,
  type ProvisionalUnresolvedReason,
} from "./provisional-resume-mapping-contract";

const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const relationship = (value: unknown): value is ProvisionalMappingRelationship => value === "direct_evidence" || value === "transferable_signal";
const signalFields = new Set(["action", "context", "outcome", "ownership", "scope"]);
const signalKey = (value: { field: string; value: string }) => `${value.field}:${value.value}`;

export function validateProvisionalMappingPolicy(policy: ProvisionalMappingPolicy, definitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]): readonly ProvisionalMappingValidationIssue[] {
  const issues: ProvisionalMappingValidationIssue[] = [];
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

export function validateProvisionalAutoAdmittedMapping(value: ProvisionalAutoAdmittedMapping, definitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]): readonly ProvisionalMappingValidationIssue[] {
  const issues: ProvisionalMappingValidationIssue[] = [];
  const capabilityIds = new Set(definitions.map((item) => item.id));
  if (!nonBlank(value?.mappingId) || !nonBlank(value?.evidenceId)) issues.push({ code: "invalid_mapping", path: "identity", message: "Mapping and evidence identities are required." });
  if (!capabilityIds.has(value?.capabilityId)) issues.push({ code: "unknown_capability", path: "capabilityId", message: "Mapping references an unknown canonical capability." });
  if (!relationship(value?.relationship)) issues.push({ code: "invalid_mapping", path: "relationship", message: "Mapping relationship is invalid." });
  if (value?.reviewStatus !== "unreviewed" || value?.admissionStatus !== "auto_admitted" || value?.method !== "authored_deterministic") issues.push({ code: "review_status_promoted", path: "status", message: "Automatic mappings must remain unreviewed and deterministically auto-admitted." });
  if (!nonBlank(value?.matchedRuleId) || !nonBlank(value?.explanation) || !nonBlank(value?.mappingPolicyVersion) || !nonBlank(value?.capabilityDefinitionVersion)) issues.push({ code: "invalid_mapping", path: "provenance", message: "Mapping explanation and version provenance are required." });
  return Object.freeze(issues);
}

export function validateProvisionalUnresolvedMapping(value: ProvisionalUnresolvedMapping, definitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]): readonly ProvisionalMappingValidationIssue[] {
  const issues: ProvisionalMappingValidationIssue[] = [];
  const capabilityIds = new Set(definitions.map((item) => item.id));
  if (!nonBlank(value?.evidenceId) || !nonBlank(value?.sourceExcerpt) || !nonBlank(value?.sourceLocator?.locatorId)) issues.push({ code: "invalid_unresolved_mapping", path: "identity", message: "Unresolved evidence identity and source reference are required." });
  if (value?.reviewStatus !== "unreviewed" || value?.admissionStatus !== "unresolved") issues.push({ code: "review_status_promoted", path: "status", message: "Unresolved automatic evidence must remain unreviewed." });
  if (!nonBlank(value?.reason) || !nonBlank(value?.explanation) || !nonBlank(value?.mappingPolicyVersion) || !nonBlank(value?.capabilityDefinitionVersion)) issues.push({ code: "invalid_unresolved_mapping", path: "provenance", message: "Unresolved reason, explanation, and versions are required." });
  value?.candidateCapabilityIds?.forEach((id, index) => { if (!capabilityIds.has(id)) issues.push({ code: "unknown_capability", path: `candidateCapabilityIds[${index}]`, message: "Unresolved candidate references an unknown capability." }); });
  return Object.freeze(issues);
}

function validEvidence(value: ProvisionalMappingEvidence): boolean {
  return Boolean(value && nonBlank(value.evidenceId) && nonBlank(value.sourceExcerpt) && nonBlank(value.sourceLocator?.locatorId) && Number.isSafeInteger(value.sourceLocator.startOffset) && value.sourceLocator.startOffset >= 0 && Number.isSafeInteger(value.sourceLocator.endOffset) && value.sourceLocator.endOffset > value.sourceLocator.startOffset && Array.isArray(value.signals) && value.signals.every((item) => signalFields.has(item.field) && nonBlank(item.value)));
}

function matches(rule: ProvisionalMappingRule, evidence: ProvisionalMappingEvidence): boolean {
  const available = new Set(evidence.signals.map(signalKey));
  return rule.requiredSignals.every((item) => available.has(signalKey(item))) && !rule.excludedSignals.some((item) => available.has(signalKey(item)));
}

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function mappingId(evidenceId: string, capabilityId: string, mappingRelationship: ProvisionalMappingRelationship, policyVersion: string, definitionVersion: string): Promise<string> {
  const digest = await sha256(JSON.stringify({ evidenceId, capabilityId, relationship: mappingRelationship, mappingPolicyVersion: policyVersion, capabilityDefinitionVersion: definitionVersion }));
  return `provisional-mapping:${PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION}:sha256:${digest}`;
}

function unresolved(evidence: ProvisionalMappingEvidence, policyVersion: string, definitionVersion: string, reason: ProvisionalUnresolvedReason, rules: readonly ProvisionalMappingRule[], explanation: string, status: "unresolved" | "unsupported"): ProvisionalMappingResult {
  const locator = evidence?.sourceLocator ?? { locatorId: "invalid-locator", startOffset: 0, endOffset: 1 };
  const value: ProvisionalUnresolvedMapping = Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, evidenceId: evidence?.evidenceId || "invalid-evidence", sourceExcerpt: evidence?.sourceExcerpt || "Unavailable evidence excerpt", sourceLocator: Object.freeze({ ...locator }), reviewStatus: "unreviewed", admissionStatus: "unresolved", reason, candidateCapabilityIds: Object.freeze([...new Set(rules.map((item) => item.capabilityId))].sort()), candidateRelationships: Object.freeze([...new Set(rules.map((item) => item.relationship))].sort()), matchingRuleIds: Object.freeze(rules.map((item) => item.ruleId).sort()), explanation, mappingPolicyVersion: policyVersion, capabilityDefinitionVersion: definitionVersion });
  return Object.freeze(status === "unsupported" ? { status, unresolved: value } : { status, unresolved: value });
}

export async function mapProvisionalResumeEvidence(input: { evidence: ProvisionalMappingEvidence; policy: ProvisionalMappingPolicy; capabilityDefinitions: readonly Pick<CanonicalCapabilityDefinition, "id">[]; capabilityDefinitionVersion: string }): Promise<ProvisionalMappingResult> {
  const { evidence, policy, capabilityDefinitions, capabilityDefinitionVersion } = input;
  try {
    if (!validEvidence(evidence) || !nonBlank(capabilityDefinitionVersion)) return unresolved(evidence, policy?.policyVersion ?? "invalid-policy", capabilityDefinitionVersion || "invalid-definition-version", "invalid_evidence", [], "Evidence structure or version is invalid.", "unresolved");
    const policyIssues = validateProvisionalMappingPolicy(policy, capabilityDefinitions);
    if (policyIssues.length > 0) return unresolved(evidence, policy?.policyVersion ?? "invalid-policy", capabilityDefinitionVersion, "invalid_policy", [], policyIssues[0].message, "unresolved");
    const matched = policy.rules.filter((rule) => matches(rule, evidence));
    if (matched.length === 0) return unresolved(evidence, policy.policyVersion, capabilityDefinitionVersion, "no_canonical_rule", [], "No authored canonical mapping rule covers this evidence.", "unsupported");
    const capabilities = new Set(matched.map((item) => item.capabilityId));
    if (capabilities.size > 1) return unresolved(evidence, policy.policyVersion, capabilityDefinitionVersion, "multiple_candidates", matched, "Multiple authored canonical capability rules match; no candidate was selected.", "unresolved");
    const relationships = new Set(matched.map((item) => item.relationship));
    if (relationships.size > 1) return unresolved(evidence, policy.policyVersion, capabilityDefinitionVersion, "relationship_conflict", matched, "Competing authored relationships match; no relationship was selected.", "unresolved");
    if (matched.length > 1) return unresolved(evidence, policy.policyVersion, capabilityDefinitionVersion, "multiple_candidates", matched, "Multiple authored rules match; no rule was ranked.", "unresolved");
    const rule = matched[0];
    const mapping: ProvisionalAutoAdmittedMapping = Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, mappingId: await mappingId(evidence.evidenceId, rule.capabilityId, rule.relationship, policy.policyVersion, capabilityDefinitionVersion), evidenceId: evidence.evidenceId, capabilityId: rule.capabilityId, relationship: rule.relationship, reviewStatus: "unreviewed", admissionStatus: "auto_admitted", method: "authored_deterministic", matchedRuleId: rule.ruleId, explanation: rule.explanation, mappingPolicyVersion: policy.policyVersion, capabilityDefinitionVersion });
    if (validateProvisionalAutoAdmittedMapping(mapping, capabilityDefinitions).length > 0) return unresolved(evidence, policy.policyVersion, capabilityDefinitionVersion, "invalid_policy", matched, "The admitted mapping failed contract validation.", "unresolved");
    return Object.freeze({ status: "auto_admitted", mapping });
  } catch {
    return unresolved(evidence, policy?.policyVersion ?? "invalid-policy", capabilityDefinitionVersion || "invalid-definition-version", "unexpected_mapping_failure", [], "Mapping could not be completed deterministically.", "unresolved");
  }
}
