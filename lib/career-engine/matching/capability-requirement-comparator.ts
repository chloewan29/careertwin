export type CapabilityAttributeConfidence = "low" | "medium" | "high";

export type CapabilityAttributeSignals = {
    org_scope?: "team" | "department" | "cross_functional" | "enterprise" | null;
    stakeholder_scope?: "internal" | "cross_team" | "executive" | "external" | null;
    leadership_scope?: "individual_contribution" | "technical_lead" | "team_lead" | "program_lead" | "org_lead" | null;
    delivery_level?: "task" | "project" | "product" | "program" | "platform" | null;
    impact_scale?: "small" | "medium" | "large" | "enterprise" | null;
    impact_type?: "revenue" | "cost" | "operational" | "strategic" | null;
    extraction_confidence?: CapabilityAttributeConfidence | null;
};

export type MatchLevel = "strong_match" | "partial_match" | "stretch_match" | "weak_match" | "missing";

export type CapabilityComparisonResult = {
    flat_match: boolean;
    match_level: MatchLevel;
    requirement_signals: CapabilityAttributeSignals;
    candidate_signals: CapabilityAttributeSignals | null;
    reasoning: string;
};

const ORG_ORDER = ["team", "department", "cross_functional", "enterprise"] as const;
const LEADERSHIP_ORDER = ["individual_contribution", "technical_lead", "team_lead", "program_lead", "org_lead"] as const;
const DELIVERY_ORDER = ["task", "project", "product", "program", "platform"] as const;
const IMPACT_SCALE_ORDER = ["small", "medium", "large", "enterprise"] as const;
const STAKEHOLDER_ORDER = ["internal", "cross_team", "executive", "external"] as const;
type StakeholderScope = typeof STAKEHOLDER_ORDER[number];

function compareOrdered(required: string, candidate: string, order: readonly string[]): { score: number; note: string } {
    const req = order.indexOf(required);
    const cand = order.indexOf(candidate);
    if (req < 0 || cand < 0) return { score: 0, note: "signals not comparable" };
    if (required === candidate) return { score: 2, note: "exact alignment" };
    if (cand > req) return { score: 2, note: "candidate exceeds requirement level" };
    if (cand === req - 1) return { score: 1, note: "candidate is one level below requirement" };
    return { score: 0, note: "candidate is materially below requirement" };
}

function compareStakeholder(required: StakeholderScope, candidate: StakeholderScope): { score: number; note: string } {
    if (required === candidate) return { score: 2, note: "exact alignment" };
    if (required === "executive" && candidate === "cross_team") {
        return { score: 1, note: "candidate has cross-team scope but not explicit executive scope" };
    }
    if (required === "cross_team" && candidate === "internal") {
        return { score: 1, note: "candidate has internal scope but not explicit cross-team scope" };
    }
    const req = STAKEHOLDER_ORDER.indexOf(required);
    const cand = STAKEHOLDER_ORDER.indexOf(candidate);
    if (req >= 0 && cand >= 0 && cand > req) {
        return { score: 2, note: "candidate stakeholder span is broader than requirement" };
    }
    return { score: 0, note: "stakeholder scope misaligned" };
}

export function compareCapabilityRequirement(input: {
    flat_match: boolean;
    requirement_signals: CapabilityAttributeSignals;
    candidate_signals: CapabilityAttributeSignals | null;
}): CapabilityComparisonResult {
    if (!input.flat_match) {
        return {
            flat_match: false,
            match_level: "missing",
            requirement_signals: input.requirement_signals,
            candidate_signals: input.candidate_signals,
            reasoning: "Capability is not present in baseline flat matching.",
        };
    }

    const candidate = input.candidate_signals;
    if (!candidate) {
        return {
            flat_match: true,
            match_level: "partial_match",
            requirement_signals: input.requirement_signals,
            candidate_signals: null,
            reasoning: "Flat capability match found; no candidate attribute summary available yet.",
        };
    }

    let comparable = 0;
    let score = 0;
    const notes: string[] = [];

    const checkOrdered = (
        label: string,
        required: string | null | undefined,
        actual: string | null | undefined,
        order: readonly string[],
    ) => {
        if (!required || !actual) return;
        comparable += 1;
        const result = compareOrdered(required, actual, order);
        score += result.score;
        notes.push(`${label}: ${result.note}`);
    };

    checkOrdered("leadership_scope", input.requirement_signals.leadership_scope, candidate.leadership_scope, LEADERSHIP_ORDER);
    checkOrdered("org_scope", input.requirement_signals.org_scope, candidate.org_scope, ORG_ORDER);
    checkOrdered("delivery_level", input.requirement_signals.delivery_level, candidate.delivery_level, DELIVERY_ORDER);
    checkOrdered("impact_scale", input.requirement_signals.impact_scale, candidate.impact_scale, IMPACT_SCALE_ORDER);

    if (input.requirement_signals.stakeholder_scope && candidate.stakeholder_scope) {
        comparable += 1;
        const result = compareStakeholder(input.requirement_signals.stakeholder_scope, candidate.stakeholder_scope);
        score += result.score;
        notes.push(`stakeholder_scope: ${result.note}`);
    }

    if (input.requirement_signals.impact_type && candidate.impact_type) {
        comparable += 1;
        if (input.requirement_signals.impact_type === candidate.impact_type) {
            score += 2;
            notes.push("impact_type: exact alignment");
        } else {
            notes.push("impact_type: misaligned");
        }
    }

    if (comparable === 0) {
        return {
            flat_match: true,
            match_level: "partial_match",
            requirement_signals: input.requirement_signals,
            candidate_signals: candidate,
            reasoning: "Flat capability match found; structured signals are sparse on one or both sides.",
        };
    }

    const ratio = score / (comparable * 2);
    const match_level: MatchLevel =
        ratio >= 0.85
            ? "strong_match"
            : ratio >= 0.6
                ? "partial_match"
                : ratio >= 0.4
                    ? "stretch_match"
                    : "weak_match";

    return {
        flat_match: true,
        match_level,
        requirement_signals: input.requirement_signals,
        candidate_signals: candidate,
        reasoning: notes.join("; "),
    };
}
