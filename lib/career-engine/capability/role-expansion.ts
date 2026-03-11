export type ProbabilityBand = "high" | "medium" | "low";
export type ExpandedRoleCategory = "best_fit" | "safe_stretch" | "long_shot";

export type ExpandedRole = {
    role: string;
    category: ExpandedRoleCategory;
    probability_band: ProbabilityBand;
    why_credible: string[];
    positioning_advice: string[];
};

export type RoleExpansionInput = {
    capabilities: string[];
    current_title: string | null;
};

type RoleRule = {
    role: string;
    anyOf?: string[];
    allOf?: string[];
    reasons: string[];
    advice: string[];
};

type Candidate = {
    role: string;
    matchedCapabilities: string[];
    matchedRuleCount: number;
    reasons: Set<string>;
    advice: Set<string>;
};

const ADJACENT_FAMILY: Record<string, string[]> = {
    analytics: ["data", "bi", "program", "strategy", "transformation"],
    data: ["analytics", "bi", "program"],
    bi: ["analytics", "data", "transformation"],
    program: ["transformation", "strategy", "analytics"],
    strategy: ["program", "analytics", "transformation"],
    transformation: ["program", "strategy", "analytics", "bi"],
    other: [],
};

const ROLE_RULES: RoleRule[] = [
    {
        role: "Analytics Manager",
        anyOf: ["Commercial Analytics", "People Leadership"],
        reasons: [
            "Commercial Analytics supports analytics decision ownership.",
            "People Leadership supports team leadership responsibilities.",
        ],
        advice: [
            "Emphasize measurable business impact from analytics work.",
            "Highlight ownership of team outcomes and priorities.",
        ],
    },
    {
        role: "Insights Manager",
        anyOf: ["Commercial Analytics", "Stakeholder Strategy"],
        reasons: [
            "Commercial Analytics aligns with insight-led decisions.",
            "Stakeholder Strategy supports influencing senior partners.",
        ],
        advice: [
            "Show how insights changed commercial decisions.",
            "Highlight stakeholder storytelling and executive influence.",
        ],
    },
    {
        role: "Program Manager",
        allOf: ["Program Leadership", "Change Management"],
        anyOf: ["Program Leadership"],
        reasons: [
            "Program Leadership maps to multi-stream delivery ownership.",
            "Change Management supports rollout and adoption outcomes.",
        ],
        advice: [
            "Frame achievements as end-to-end program ownership.",
            "Highlight sequencing, governance, and delivery outcomes.",
        ],
    },
    {
        role: "Transformation Lead",
        allOf: ["Program Leadership", "Change Management"],
        anyOf: ["Enterprise Transformation"],
        reasons: [
            "Enterprise Transformation aligns with transformation mandate.",
            "Program + change capabilities support transformation execution.",
        ],
        advice: [
            "Frame work as transformation leadership, not task delivery.",
            "Emphasize cross-business impact and change adoption.",
        ],
    },
    {
        role: "Strategy Manager",
        allOf: ["Stakeholder Strategy", "Strategic Planning"],
        reasons: [
            "Stakeholder Strategy supports strategic influence.",
            "Strategic Planning supports roadmap and priority setting.",
        ],
        advice: [
            "Emphasize strategy ownership and planning cadence.",
            "Highlight executive alignment and decision framing.",
        ],
    },
    {
        role: "BI Lead",
        anyOf: ["BI / Data Platform Transformation", "People Leadership"],
        reasons: [
            "BI / Data Platform Transformation directly fits BI leadership.",
            "People Leadership supports BI team and delivery leadership.",
        ],
        advice: [
            "Highlight BI transformation outcomes and standards uplift.",
            "Show platform adoption and business impact metrics.",
        ],
    },
    {
        role: "Data Product Manager",
        anyOf: ["BI / Data Platform Transformation", "Stakeholder Strategy", "Strategic Planning"],
        reasons: [
            "BI / Data Platform Transformation supports data-product ownership.",
            "Stakeholder Strategy supports cross-functional prioritization.",
        ],
        advice: [
            "Position platform work as roadmap and prioritization ownership.",
            "Show trade-off decisions and stakeholder alignment outcomes.",
        ],
    },
];

const ROLE_FAMILY_BY_KEYWORD: Array<{ family: string; patterns: RegExp[] }> = [
    { family: "analytics", patterns: [/\banalytics\b/i, /\binsights?\b/i] },
    { family: "data", patterns: [/\bdata\b/i, /\bproduct\b/i] },
    { family: "bi", patterns: [/\bbi\b/i, /\bbusiness intelligence\b/i] },
    { family: "program", patterns: [/\bprogram\b/i, /\bprogramme\b/i] },
    { family: "strategy", patterns: [/\bstrategy\b/i, /\bstrategic\b/i] },
    { family: "transformation", patterns: [/\btransform/i, /\bchange\b/i] },
];

function detectFamily(text: string | null): string {
    if (!text) return "other";
    for (const entry of ROLE_FAMILY_BY_KEYWORD) {
        if (entry.patterns.some((pattern) => pattern.test(text))) return entry.family;
    }
    return "other";
}

function isAdjacentFamily(a: string, b: string): boolean {
    return (ADJACENT_FAMILY[a] ?? []).includes(b);
}

function titleAlignmentScore(currentFamily: string, roleFamily: string): number {
    if (currentFamily === roleFamily) return 2;
    if (isAdjacentFamily(currentFamily, roleFamily)) return 1;
    return 0;
}

function categoryFromScore(currentFamily: string, roleFamily: string, capabilityScore: number): ExpandedRoleCategory {
    if (currentFamily === roleFamily && capabilityScore >= 2) return "best_fit";
    if ((isAdjacentFamily(currentFamily, roleFamily) && capabilityScore >= 2) || capabilityScore >= 3) {
        return "safe_stretch";
    }
    return "long_shot";
}

function probabilityBandFromCategory(category: ExpandedRoleCategory): ProbabilityBand {
    if (category === "best_fit") return "high";
    if (category === "safe_stretch") return "medium";
    return "low";
}

function addReasonAndAdvice(candidate: Candidate, rule: RoleRule): void {
    for (const reason of rule.reasons) candidate.reasons.add(reason);
    for (const advice of rule.advice) candidate.advice.add(advice);
}

function applyRule(rule: RoleRule, capabilitySet: Set<string>, candidates: Map<string, Candidate>): void {
    const matchedAll = rule.allOf ? rule.allOf.every((cap) => capabilitySet.has(cap)) : true;
    const matchedAnyCaps = (rule.anyOf ?? []).filter((cap) => capabilitySet.has(cap));
    const matchedAny = rule.anyOf ? matchedAnyCaps.length > 0 : false;

    if (!matchedAll && !matchedAny) return;
    if (rule.allOf && !matchedAll) return;
    if (rule.anyOf && !matchedAny && !rule.allOf) return;

    const matchedCapabilities = [
        ...(rule.allOf ?? []),
        ...matchedAnyCaps,
    ].filter((value, index, arr) => arr.indexOf(value) === index);

    const existing = candidates.get(rule.role) ?? {
        role: rule.role,
        matchedCapabilities: [],
        matchedRuleCount: 0,
        reasons: new Set<string>(),
        advice: new Set<string>(),
    };

    existing.matchedCapabilities = [
        ...existing.matchedCapabilities,
        ...matchedCapabilities,
    ].filter((value, index, arr) => arr.indexOf(value) === index);
    existing.matchedRuleCount += 1;
    addReasonAndAdvice(existing, rule);
    candidates.set(rule.role, existing);
}

function bandRank(band: ProbabilityBand): number {
    if (band === "high") return 3;
    if (band === "medium") return 2;
    return 1;
}

export function expandRolesFromCapabilities(input: RoleExpansionInput): ExpandedRole[] {
    const capabilities = input.capabilities ?? [];
    const capabilitySet = new Set(capabilities);
    const candidates = new Map<string, Candidate>();

    for (const rule of ROLE_RULES) {
        applyRule(rule, capabilitySet, candidates);
    }

    const currentFamily = detectFamily(input.current_title);

    const expanded = Array.from(candidates.values())
        .map((candidate) => {
            const roleFamily = detectFamily(candidate.role);
            const capabilityScore = candidate.matchedCapabilities.length + candidate.matchedRuleCount;
            const alignment = titleAlignmentScore(currentFamily, roleFamily);
            const category = categoryFromScore(currentFamily, roleFamily, capabilityScore);
            const probability_band = probabilityBandFromCategory(category);
            const strength = capabilityScore + alignment;
            return {
                role: candidate.role,
                category,
                probability_band,
                why_credible: Array.from(candidate.reasons).slice(0, 3),
                positioning_advice: Array.from(candidate.advice).slice(0, 3),
                __strength: strength,
            };
        })
        .sort((a, b) => {
            const bandDiff = bandRank(b.probability_band) - bandRank(a.probability_band);
            if (bandDiff !== 0) return bandDiff;
            return b.__strength - a.__strength;
        });

    const limits: Record<ExpandedRoleCategory, number> = {
        best_fit: 3,
        safe_stretch: 3,
        long_shot: 2,
    };
    const counts: Record<ExpandedRoleCategory, number> = {
        best_fit: 0,
        safe_stretch: 0,
        long_shot: 0,
    };

    const result: ExpandedRole[] = [];
    for (const role of expanded) {
        if (counts[role.category] >= limits[role.category]) continue;
        counts[role.category] += 1;
        result.push({
            role: role.role,
            category: role.category,
            probability_band: role.probability_band,
            why_credible: role.why_credible,
            positioning_advice: role.positioning_advice,
        });
    }

    return result;
}
