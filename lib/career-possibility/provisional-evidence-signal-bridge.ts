import type { ProvisionalMappingSignalField } from "./provisional-resume-mapping-contract";
import { PROVISIONAL_EVIDENCE_SIGNAL_CONTRACT_VERSION, type ProvisionalEvidenceSignalInput, type ProvisionalEvidenceSignalMatch, type ProvisionalEvidenceSignalPolicy, type ProvisionalEvidenceSignalResult, type ProvisionalEvidenceSignalRule, type ProvisionalEvidenceSignalToken, type ProvisionalEvidenceSignalUnresolved, type ProvisionalEvidenceSignalUnresolvedReason, type ProvisionalEvidenceSignalValidationIssue, type ProvisionalStructuredEvidence } from "./provisional-evidence-signal-contract";

const fields = new Set(["action", "context", "outcome", "ownership", "scope", "participation"]);
const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const compare = (a: string, b: string) => a.localeCompare(b, "en");
const allowedReasons = new Set(["multiple_action_signals", "ownership_conflict", "scope_conflict", "outcome_conflict", "insufficient_source_context", "invalid_evidence", "invalid_signal_policy", "unexpected_signal_failure", "no_authored_signal_rule"]);

export function validateProvisionalEvidenceSignalRule(rule: ProvisionalEvidenceSignalRule, vocabulary: readonly ProvisionalEvidenceSignalToken[]): readonly ProvisionalEvidenceSignalValidationIssue[] {
  const issues: ProvisionalEvidenceSignalValidationIssue[] = [];
  if (!nonBlank(rule?.ruleId) || !nonBlank(rule?.ruleVersion) || !fields.has(rule?.field) || !nonBlank(rule?.sourcePattern)) issues.push({ code: "invalid_signal_rule", path: "rule", message: "Signal rules require identity, version, field, and source pattern." });
  if (rule?.field !== "participation" && (!rule?.token || !vocabulary.includes(rule.token))) issues.push({ code: "unknown_signal_token", path: "rule.token", message: "Signal rule token is outside the bounded vocabulary." });
  if (rule?.field === "participation" && rule.token !== undefined) issues.push({ code: "invalid_signal_rule", path: "rule.token", message: "Participation guards cannot emit semantic signals." });
  if (!nonBlank(rule?.explanation)) issues.push({ code: "missing_explanation", path: "rule.explanation", message: "Signal rules require a bounded explanation." });
  try { new RegExp(rule?.sourcePattern, "iu"); (rule?.exclusionPatterns ?? []).forEach((pattern) => new RegExp(pattern, "iu")); } catch { issues.push({ code: "invalid_signal_rule", path: "rule.sourcePattern", message: "Signal rule patterns must be valid regular expressions." }); }
  return Object.freeze(issues);
}

export function validateProvisionalEvidenceSignalPolicy(policy: ProvisionalEvidenceSignalPolicy): readonly ProvisionalEvidenceSignalValidationIssue[] {
  const issues: ProvisionalEvidenceSignalValidationIssue[] = [];
  if (!nonBlank(policy?.policyVersion) || policy?.coverage !== "bounded_non_exhaustive" || !Array.isArray(policy?.vocabulary) || policy.vocabulary.length === 0 || !Array.isArray(policy?.rules) || policy.rules.length === 0) issues.push({ code: "invalid_signal_policy", path: "policy", message: "A versioned bounded signal policy is required." });
  const ids = new Set<string>();
  (policy?.rules ?? []).forEach((rule, index) => { if (ids.has(rule.ruleId)) issues.push({ code: "duplicate_rule_id", path: `rules[${index}].ruleId`, message: "Signal rule IDs must be unique." }); ids.add(rule.ruleId); validateProvisionalEvidenceSignalRule(rule, policy.vocabulary).forEach((issue) => issues.push({ ...issue, path: `rules[${index}].${issue.path}` })); });
  return Object.freeze(issues);
}

export function validateProvisionalStructuredEvidence(value: ProvisionalStructuredEvidence, policy: ProvisionalEvidenceSignalPolicy): readonly ProvisionalEvidenceSignalValidationIssue[] {
  const issues: ProvisionalEvidenceSignalValidationIssue[] = [];
  if (value?.signalContractVersion !== PROVISIONAL_EVIDENCE_SIGNAL_CONTRACT_VERSION || !nonBlank(value?.signalIdentity) || !nonBlank(value?.evidenceId) || !nonBlank(value?.sourceExcerpt) || !nonBlank(value?.sourceLocator?.locatorId)) issues.push({ code: "invalid_structured_signal", path: "identity", message: "Structured evidence identity and bounded source provenance are required." });
  if (value?.reviewStatus !== "unreviewed") issues.push({ code: "review_status_promoted", path: "reviewStatus", message: "Bridge evidence must remain unreviewed." });
  if (value?.signalPolicyVersion !== policy.policyVersion || !Array.isArray(value?.signals) || value.signals.length === 0 || value.signals.some((signal) => !fields.has(signal.field) || !policy.vocabulary.includes(signal.value as ProvisionalEvidenceSignalToken))) issues.push({ code: "invalid_structured_signal", path: "signals", message: "Structured signals must use the admitted policy vocabulary." });
  if (!Array.isArray(value?.matchedSignalRuleIds) || value.matchedSignalRuleIds.length === 0 || !Array.isArray(value?.explanations) || value.explanations.some((item) => !nonBlank(item))) issues.push({ code: "invalid_structured_signal", path: "provenance", message: "Structured signals require authored rule provenance and explanations." });
  return Object.freeze(issues);
}

export function validateProvisionalEvidenceSignalUnresolved(value: ProvisionalEvidenceSignalUnresolved): readonly ProvisionalEvidenceSignalValidationIssue[] {
  const issues: ProvisionalEvidenceSignalValidationIssue[] = [];
  if (!nonBlank(value?.evidenceId) || !nonBlank(value?.sourceExcerpt) || !nonBlank(value?.sourceLocator?.locatorId) || !nonBlank(value?.signalPolicyVersion) || !nonBlank(value?.explanation) || !allowedReasons.has(value?.reason)) issues.push({ code: "invalid_unresolved_signal", path: "unresolved", message: "Unresolved signal evidence must remain addressable with bounded provenance." });
  if (value?.reviewStatus !== "unreviewed") issues.push({ code: "review_status_promoted", path: "reviewStatus", message: "Unresolved evidence must remain unreviewed." });
  return Object.freeze(issues);
}

function source(input: ProvisionalEvidenceSignalInput) {
  const evidence = input.evidence;
  const spans = evidence?.sourceSpanIds?.map((id) => input.sourceSpans.find((span) => span.id === id)).filter((span): span is NonNullable<typeof span> => Boolean(span)) ?? [];
  const span = spans[0];
  if (!evidence || evidence.reviewStatus !== "unreviewed" || !nonBlank(evidence.id) || !nonBlank(evidence.sourceText) || !span || !Number.isSafeInteger(span.startOffset) || !Number.isSafeInteger(span.endOffset) || span.startOffset! < 0 || span.endOffset! <= span.startOffset! || span.originalText !== evidence.sourceText) return undefined;
  return { evidence, locator: { locatorId: span.id, startOffset: span.startOffset!, endOffset: span.endOffset!, ...(span.pageNumber ? { pageNumber: span.pageNumber } : {}) } };
}

function matches(text: string, policy: ProvisionalEvidenceSignalPolicy): ProvisionalEvidenceSignalMatch[] {
  return policy.rules.filter((rule) => new RegExp(rule.sourcePattern, "iu").test(text) && !rule.exclusionPatterns.some((pattern) => new RegExp(pattern, "iu").test(text))).map((rule) => ({ rule, ...(rule.field !== "participation" ? { signal: { field: rule.field as ProvisionalMappingSignalField, value: rule.token! } } : {}) }));
}
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function unresolved(input: ProvisionalEvidenceSignalInput, policyVersion: string, reason: ProvisionalEvidenceSignalUnresolvedReason | "no_authored_signal_rule", matched: readonly ProvisionalEvidenceSignalMatch[], explanation: string, status: "unresolved" | "unsupported"): ProvisionalEvidenceSignalResult {
  const span = input.evidence?.sourceSpanIds?.map((id) => input.sourceSpans?.find((item) => item.id === id)).find(Boolean);
  const value: ProvisionalEvidenceSignalUnresolved = Object.freeze({ signalContractVersion: PROVISIONAL_EVIDENCE_SIGNAL_CONTRACT_VERSION, evidenceId: input.evidence?.id || "invalid-evidence", sourceExcerpt: input.evidence?.sourceText || "Invalid evidence source", sourceLocator: Object.freeze({ locatorId: span?.id || "invalid-locator", startOffset: span?.startOffset ?? 0, endOffset: span?.endOffset ?? 1, ...(span?.pageNumber ? { pageNumber: span.pageNumber } : {}) }), reviewStatus: "unreviewed", reason, signalPolicyVersion: policyVersion, matchedSignalRuleIds: Object.freeze(matched.map((item) => item.rule.ruleId).sort(compare)), explanation });
  return Object.freeze(status === "unsupported" ? { status, unresolved: value } : { status, unresolved: value });
}

export async function bridgeEvidenceToProvisionalSignals(input: ProvisionalEvidenceSignalInput, policy: ProvisionalEvidenceSignalPolicy): Promise<ProvisionalEvidenceSignalResult> {
  try {
    const evidenceSource = source(input);
    if (!evidenceSource) return unresolved(input, policy?.policyVersion ?? "invalid-policy", "invalid_evidence", [], "Evidence identity, review status, or source locator is invalid.", "unresolved");
    const policyIssues = validateProvisionalEvidenceSignalPolicy(policy);
    if (policyIssues.length) return unresolved(input, policy?.policyVersion ?? "invalid-policy", "invalid_signal_policy", [], policyIssues[0].message, "unresolved");
    const matched = matches(evidenceSource.evidence.sourceText, policy);
    const emitted = matched.filter((item) => item.signal);
    if (!emitted.length) return unresolved(input, policy.policyVersion, "no_authored_signal_rule", matched, "No authored deterministic signal rule covers this evidence.", "unsupported");
    const byField = new Map<string, Set<string>>(); emitted.forEach((item) => { const values = byField.get(item.signal!.field) ?? new Set<string>(); values.add(item.signal!.value); byField.set(item.signal!.field, values); });
    const conflictField = [...byField].find(([, values]) => values.size > 1)?.[0];
    if (conflictField) { const reason = conflictField === "action" ? "multiple_action_signals" : conflictField === "ownership" ? "ownership_conflict" : conflictField === "scope" ? "scope_conflict" : "outcome_conflict"; return unresolved(input, policy.policyVersion, reason, matched, `Competing authored ${conflictField} signals matched; no signal was selected.`, "unresolved"); }
    if (matched.some((item) => item.rule.field === "participation") && emitted.some((item) => item.rule.field === "ownership")) return unresolved(input, policy.policyVersion, "ownership_conflict", matched, "Ownership and participation language conflict; ownership was not inferred.", "unresolved");
    const signals = emitted.map((item) => item.signal!).sort((a, b) => compare(a.field, b.field) || compare(a.value, b.value));
    const ruleIds = emitted.map((item) => item.rule.ruleId).sort(compare);
    const signalIdentity = `provisional-signal:${PROVISIONAL_EVIDENCE_SIGNAL_CONTRACT_VERSION}:sha256:${await sha256(JSON.stringify({ evidenceId: evidenceSource.evidence.id, locatorId: evidenceSource.locator.locatorId, signalPolicyVersion: policy.policyVersion, matchedRuleIds: ruleIds, signals }))}`;
    const evidence: ProvisionalStructuredEvidence = Object.freeze({ signalContractVersion: PROVISIONAL_EVIDENCE_SIGNAL_CONTRACT_VERSION, signalIdentity, evidenceId: evidenceSource.evidence.id, sourceExcerpt: evidenceSource.evidence.sourceText, sourceLocator: Object.freeze(evidenceSource.locator), reviewStatus: "unreviewed", signals: Object.freeze(signals), signalPolicyVersion: policy.policyVersion, matchedSignalRuleIds: Object.freeze(ruleIds), explanations: Object.freeze(emitted.map((item) => item.rule.explanation)) });
    const issues = validateProvisionalStructuredEvidence(evidence, policy);
    return issues.length ? unresolved(input, policy.policyVersion, "invalid_signal_policy", matched, issues[0].message, "unresolved") : Object.freeze({ status: "structured", evidence });
  } catch {
    return unresolved(input, policy?.policyVersion ?? "invalid-policy", "unexpected_signal_failure", [], "Evidence signals could not be derived deterministically.", "unresolved");
  }
}
