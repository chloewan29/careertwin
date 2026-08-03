import type { ProvisionalMappingPolicy, ProvisionalMappingRule } from "./provisional-resume-mapping-contract";

export const PROVISIONAL_RESUME_MAPPING_POLICY_VERSION = "provisional-resume-mapping-policy/1.0.0" as const;
const authoredRule = (rule: ProvisionalMappingRule): ProvisionalMappingRule => Object.freeze(rule);

/** Intentionally bounded proof set. Absence of a rule means unsupported, never a guessed match. */
export const provisionalResumeMappingPolicy: ProvisionalMappingPolicy = Object.freeze({
  policyVersion: PROVISIONAL_RESUME_MAPPING_POLICY_VERSION,
  coverage: "bounded_non_exhaustive",
  rules: Object.freeze([
    authoredRule({ ruleId: "research-design/direct/designed-research", ruleVersion: "1.0.0", capabilityId: "research-design", relationship: "direct_evidence", requiredSignals: Object.freeze([{ field: "action", value: "designed_research" }]), excludedSignals: Object.freeze([]), explanation: "The evidence explicitly records designing research." }),
    authoredRule({ ruleId: "research-design/transferable/supported-research", ruleVersion: "1.0.0", capabilityId: "research-design", relationship: "transferable_signal", requiredSignals: Object.freeze([{ field: "action", value: "supported_research_delivery" }]), excludedSignals: Object.freeze([]), explanation: "The evidence records supporting research delivery without claiming research design ownership." }),
    authoredRule({ ruleId: "insight-synthesis/direct/synthesised-findings", ruleVersion: "1.0.0", capabilityId: "insight-synthesis", relationship: "direct_evidence", requiredSignals: Object.freeze([{ field: "action", value: "synthesised_findings" }, { field: "outcome", value: "informed_decision" }]), excludedSignals: Object.freeze([]), explanation: "The evidence explicitly connects synthesised findings to a decision." }),
    authoredRule({ ruleId: "cross-functional-delivery/direct/coordinated-delivery", ruleVersion: "1.0.0", capabilityId: "cross-functional-delivery", relationship: "direct_evidence", requiredSignals: Object.freeze([{ field: "action", value: "coordinated_cross_functional_delivery" }, { field: "ownership", value: "owned_delivery" }]), excludedSignals: Object.freeze([]), explanation: "The evidence explicitly records owned cross-functional delivery." }),
    authoredRule({ ruleId: "process-improvement/direct/redesigned-process", ruleVersion: "1.0.0", capabilityId: "process-improvement", relationship: "direct_evidence", requiredSignals: Object.freeze([{ field: "action", value: "redesigned_process" }]), excludedSignals: Object.freeze([{ field: "context", value: "hypothetical" }]), explanation: "The evidence explicitly records redesigning an operating process." }),
  ]),
});
