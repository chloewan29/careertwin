import type { ProvisionalEvidenceSignalPolicy, ProvisionalEvidenceSignalRule } from "./provisional-evidence-signal-contract";

export const PROVISIONAL_EVIDENCE_SIGNAL_POLICY_VERSION = "provisional-evidence-signal-policy/1.0.0" as const;
const rule = (value: ProvisionalEvidenceSignalRule) => Object.freeze(value);

/** Bounded lexical rules only. This is not a general résumé NLP or capability classifier. */
export const provisionalEvidenceSignalPolicy: ProvisionalEvidenceSignalPolicy = Object.freeze({
  policyVersion: PROVISIONAL_EVIDENCE_SIGNAL_POLICY_VERSION,
  coverage: "bounded_non_exhaustive",
  vocabulary: Object.freeze(["designed_research", "supported_research_delivery", "synthesised_findings", "informed_decision", "coordinated_cross_functional_delivery", "owned_delivery", "redesigned_process", "cross_functional", "hypothetical"] as const),
  rules: Object.freeze([
    rule({ ruleId: "signal/action/designed-research", ruleVersion: "1.0.0", field: "action", token: "designed_research", sourcePattern: "\\b(?:designed|developed)\\s+(?:a\\s+|the\\s+)?(?:research|research study|research programme|research program)\\b", exclusionPatterns: ["\\bsupported\\b", "\\bassisted\\b"], explanation: "Explicit source language records designing research." }),
    rule({ ruleId: "signal/action/supported-research", ruleVersion: "1.0.0", field: "action", token: "supported_research_delivery", sourcePattern: "\\b(?:supported|assisted|contributed to)\\s+(?:the\\s+)?(?:delivery of\\s+)?research\\b", exclusionPatterns: [], explanation: "Explicit participation language records support for research delivery without ownership." }),
    rule({ ruleId: "signal/action/synthesised-findings", ruleVersion: "1.0.0", field: "action", token: "synthesised_findings", sourcePattern: "\\bsynthesi[sz]ed\\s+(?:research\\s+|customer\\s+|study\\s+)?(?:findings|insights|evidence)\\b", exclusionPatterns: [], explanation: "Explicit source language records synthesising findings." }),
    rule({ ruleId: "signal/outcome/informed-decision", ruleVersion: "1.0.0", field: "outcome", token: "informed_decision", sourcePattern: "\\b(?:to|that|which)\\s+(?:inform(?:ed)?|enabl(?:e|ed)|support(?:ed)?)\\s+(?:a\\s+|the\\s+)?(?:decision|decisions|decision-making)\\b", exclusionPatterns: ["\\bplanned to\\b", "\\bintended to\\b"], explanation: "Explicit causal language connects the evidence to a decision." }),
    rule({ ruleId: "signal/action/coordinated-cross-functional", ruleVersion: "1.0.0", field: "action", token: "coordinated_cross_functional_delivery", sourcePattern: "\\b(?:coordinated|led|managed)\\s+(?:a\\s+|the\\s+)?cross[- ]functional\\s+(?:delivery|initiative|project|programme|program|team)\\b", exclusionPatterns: ["\\bsupported\\b", "\\bassisted\\b"], explanation: "Explicit source language records coordinating cross-functional delivery." }),
    rule({ ruleId: "signal/ownership/owned-delivery", ruleVersion: "1.0.0", field: "ownership", token: "owned_delivery", sourcePattern: "\\b(?:owned|led|managed|was responsible for)\\s+(?:a\\s+|the\\s+)?(?:cross[- ]functional\\s+)?(?:delivery|initiative|project|programme|program|team)\\b", exclusionPatterns: [], explanation: "Explicit ownership language records delivery ownership." }),
    rule({ ruleId: "signal/action/redesigned-process", ruleVersion: "1.0.0", field: "action", token: "redesigned_process", sourcePattern: "\\b(?:redesigned|re-engineered|reengineered|overhauled)\\s+(?:a\\s+|the\\s+)?(?:process|workflow|operating process)\\b", exclusionPatterns: ["\\bproposed\\b", "\\bwould\\b"], explanation: "Explicit source language records redesigning a process." }),
    rule({ ruleId: "signal/scope/cross-functional", ruleVersion: "1.0.0", field: "scope", token: "cross_functional", sourcePattern: "\\bcross[- ]functional\\b", exclusionPatterns: [], explanation: "The source explicitly states cross-functional scope." }),
    rule({ ruleId: "signal/context/hypothetical", ruleVersion: "1.0.0", field: "context", token: "hypothetical", sourcePattern: "\\b(?:proposed|would|could|planned to|intended to)\\b", exclusionPatterns: [], explanation: "The source explicitly frames the activity as hypothetical or intended." }),
    rule({ ruleId: "signal/participation/non-owner", ruleVersion: "1.0.0", field: "participation", sourcePattern: "\\b(?:supported|assisted|contributed to|partnered on)\\b", exclusionPatterns: [], explanation: "Participation language is retained as a guard and never promoted to ownership." }),
  ]),
});
