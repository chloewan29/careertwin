export type JobCapabilityImportance = "critical" | "important" | "supporting";
export type JobCapabilitySourceTier = "structured" | "lexical_fallback" | "title_prior";
export type JobCapabilityProfileQuality = "strong" | "usable" | "sparse" | "empty";

export type ExtractedJobCapability = {
    canonical_name: string;
    display_name: string;
    importance: JobCapabilityImportance;
    evidence: string[];
    confidence: number;
    source_tier: JobCapabilitySourceTier;
    matched_terms: string[];
    matched_snippets: string[];
    role_family_basis: string | null;
};

type CapabilityPattern = {
    canonical_name: string;
    display_name: string;
    patterns: RegExp[];
};

type LexicalBucket = {
    canonical_name: string;
    display_name: string;
    terms: string[];
};

type JobCapabilityExtractionResult = {
    capabilities: ExtractedJobCapability[];
    quality: JobCapabilityProfileQuality;
    diagnostics: {
        reasons: string[];
        total_capability_count: number;
        body_derived_count: number;
        title_prior_count: number;
        structured_count: number;
        lexical_fallback_count: number;
        supporting_evidence_units: number;
        used_title_prior: boolean;
    };
};

const TAXONOMY_V1_PATTERNS: CapabilityPattern[] = [
    {
        canonical_name: "people leadership",
        display_name: "People Leadership",
        patterns: [/\b(lead|manage|mentor|coach)\b.{0,35}\b(team|analysts?|staff|people)\b/i, /\b(headcount|people leader|team leadership)\b/i],
    },
    {
        canonical_name: "executive influence & business cases",
        display_name: "Executive Influence & Business Cases",
        patterns: [/\b(business case|board paper|investment case|secure approval|exec(utive)? alignment)\b/i, /\b(c-suite|senior leadership)\b.{0,30}\b(present|influence|drive)\b/i],
    },
    {
        canonical_name: "cross-functional stakeholder leadership",
        display_name: "Cross-Functional Stakeholder Leadership",
        patterns: [/\b(cross-functional|cross functional|stakeholder management|partner(ing)? with)\b/i, /\b(work(ing)? with)\b.{0,30}\b(product|sales|marketing|finance|operations|engineering)\b/i],
    },
    {
        canonical_name: "strategic planning",
        display_name: "Strategic Planning",
        patterns: [/\b(strategy|strategic planning|roadmap|long-term plan|annual planning)\b/i, /\b(prioritization|portfolio strategy)\b/i],
    },
    {
        canonical_name: "market & opportunity assessment",
        display_name: "Market & Opportunity Assessment",
        patterns: [/\b(market analysis|market opportunity|opportunity assessment|competitive landscape|sizing)\b/i, /\b(segmentation|addressable market|go-to-market)\b/i],
    },
    {
        canonical_name: "commercial analytics",
        display_name: "Commercial Analytics",
        patterns: [/\b(commercial analytics|revenue analytics|pricing analytics|profitability|margin)\b/i, /\b(customer insights?)\b.{0,30}\b(revenue|growth|commercial)\b/i],
    },
    {
        canonical_name: "bi / data platform transformation",
        display_name: "BI / Data Platform Transformation",
        patterns: [/\b(power bi|tableau|looker|data platform|bi platform|semantic layer)\b/i, /\b(transform|moderni[sz]e|migrat(e|ion))\b.{0,35}\b(data|bi|reporting)\b/i],
    },
    {
        canonical_name: "analytics automation",
        display_name: "Analytics Automation",
        patterns: [/\b(analytics automation|automated insights?|ai-powered analytics|ml-powered analytics)\b/i, /\b(llm|machine learning|python|sql|bigquery)\b.{0,35}\b(automate|automation)\b/i],
    },
    {
        canonical_name: "capability uplift & enablement",
        display_name: "Capability Uplift & Enablement",
        patterns: [/\b(enablement|capability uplift|training|upskill|coaching program|playbook)\b/i, /\b(build(ing)? capability|capability build)\b/i],
    },
    {
        canonical_name: "transformation delivery leadership",
        display_name: "Transformation Delivery Leadership",
        patterns: [/\b(lead|drive|own)\b.{0,35}\b(transformation|program delivery|change initiative)\b/i, /\b(program management|delivery leadership)\b/i],
    },
    {
        canonical_name: "operational performance optimization",
        display_name: "Operational Performance Optimization",
        patterns: [/\b(operational excellence|process improvement|efficiency|optimization|optimi[sz]ation)\b/i, /\b(reduce(d)?|improv(e|ed))\b.{0,35}\b(cycle time|cost|throughput|productivity)\b/i],
    },
    {
        canonical_name: "change management & adoption",
        display_name: "Change Management & Adoption",
        patterns: [/\b(change management|adoption strategy|rollout|behavior change|user adoption)\b/i, /\b(enable adoption|adoption plan)\b/i],
    },
];

const LEXICAL_FALLBACK_BUCKETS: LexicalBucket[] = [
    {
        canonical_name: "strategic planning",
        display_name: "Strategic Planning",
        terms: [
            "commercial strategy",
            "growth strategy",
            "go-to-market",
            "gtm",
            "strategic planning",
            "roadmap",
            "market expansion",
            "business opportunity",
            "operating cadence",
            "operating rhythm",
        ],
    },
    {
        canonical_name: "market & opportunity assessment",
        display_name: "Market & Opportunity Assessment",
        terms: [
            "market opportunity",
            "opportunity assessment",
            "market expansion",
            "customer strategy",
            "client strategy",
            "category growth",
            "market sizing",
            "segmentation",
            "go-to-market",
            "gtm",
        ],
    },
    {
        canonical_name: "commercial analytics",
        display_name: "Commercial Analytics",
        terms: [
            "commercial performance",
            "revenue growth",
            "quota",
            "pipeline",
            "target achievement",
            "deal support",
            "monetization",
            "account growth",
            "sales enablement",
            "revenue ownership",
        ],
    },
    {
        canonical_name: "people leadership",
        display_name: "People Leadership",
        terms: [
            "people leadership",
            "team development",
            "coaching",
            "mentoring",
            "lead regional sales teams",
            "lead teams",
            "build team capability",
        ],
    },
    {
        canonical_name: "cross-functional stakeholder leadership",
        display_name: "Cross-Functional Stakeholder Leadership",
        terms: [
            "executive engagement",
            "senior stakeholder management",
            "cross-functional leadership",
            "influence without authority",
            "steering committee",
            "governance",
            "partner with marketing",
            "partner with finance",
            "account management",
            "customer relationship",
        ],
    },
    {
        canonical_name: "executive influence & business cases",
        display_name: "Executive Influence & Business Cases",
        terms: [
            "executive engagement",
            "executive stakeholder",
            "business case",
            "board",
            "steering committee",
            "influence",
            "commercial performance",
            "revenue ownership",
            "quota ownership",
            "deal negotiation",
        ],
    },
    {
        canonical_name: "transformation delivery leadership",
        display_name: "Transformation Delivery Leadership",
        terms: [
            "business transformation",
            "transformation program",
            "delivery governance",
            "implementation",
            "mobilisation",
            "mobilization",
            "operating model",
            "program delivery",
            "change leadership",
        ],
    },
    {
        canonical_name: "change management & adoption",
        display_name: "Change Management & Adoption",
        terms: [
            "change adoption",
            "change management",
            "enablement",
            "adoption",
            "capability uplift",
            "team enablement",
            "readiness",
        ],
    },
    {
        canonical_name: "operational performance optimization",
        display_name: "Operational Performance Optimization",
        terms: [
            "process redesign",
            "continuous improvement",
            "automation",
            "operational efficiency",
            "operating model",
            "delivery efficiency",
            "operational performance",
        ],
    },
    {
        canonical_name: "capability uplift & enablement",
        display_name: "Capability Uplift & Enablement",
        terms: [
            "capability uplift",
            "enablement",
            "coaching",
            "mentoring",
            "team development",
            "training",
            "playbook",
        ],
    },
];

const TITLE_PRIOR_MAP: Array<{ pattern: RegExp; capabilities: string[]; role_family_basis: string }> = [
    {
        pattern: /\b(enterprise sales|sales director|sales leader|account director|account sales lead|business development)\b/i,
        role_family_basis: "sales",
        capabilities: [
            "executive influence & business cases",
            "cross-functional stakeholder leadership",
            "people leadership",
            "commercial analytics",
            "strategic planning",
        ],
    },
    {
        pattern: /\b(commercial insights|insights lead|commercial lead|revenue strategy)\b/i,
        role_family_basis: "commercial_insights",
        capabilities: [
            "commercial analytics",
            "market & opportunity assessment",
            "strategic planning",
            "cross-functional stakeholder leadership",
        ],
    },
    {
        pattern: /\b(transformation|program lead|program manager|change lead)\b/i,
        role_family_basis: "transformation",
        capabilities: [
            "transformation delivery leadership",
            "change management & adoption",
            "cross-functional stakeholder leadership",
            "capability uplift & enablement",
        ],
    },
    {
        pattern: /\b(operations|operational|operating model)\b/i,
        role_family_basis: "operations",
        capabilities: [
            "operational performance optimization",
            "transformation delivery leadership",
            "cross-functional stakeholder leadership",
        ],
    },
];

const CAPABILITY_LOOKUP = new Map(
    TAXONOMY_V1_PATTERNS.map((item) => [item.canonical_name, item]),
);

const CRITICAL_MARKERS = /\b(must|required|essential|minimum|proven|demonstrated|non-negotiable)\b/i;
const SUPPORTING_MARKERS = /\b(preferred|nice to have|bonus|desirable|plus)\b/i;
const AUTOMATION_INTENT_MARKERS = /\b(automation|automated|pipeline|workflow automation|automated reporting|automated insights|ai agents?)\b/i;
const ANALYTICS_TOOL_MARKERS = /\b(python|sql|bigquery|power bi|ml|machine learning|ai|llm|data pipeline)\b/i;

const CROSS_FUNCTIONAL_LEADERSHIP_PATTERNS = [
    /\blead\b.{0,20}\bcross-functional\b/i,
    /\balign\b.{0,20}\bstakeholders?\b/i,
    /\bdrive\b.{0,20}\balignment\b/i,
    /\bcoordinate\b.{0,20}\bacross teams?\b/i,
    /\bmanage\b.{0,20}\bcross-functional initiatives?\b/i,
];

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function compactSnippet(text: string, maxLength = 220): string {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength) return collapsed;
    return `${collapsed.slice(0, maxLength - 3)}...`;
}

function splitEvidenceUnits(jobDescription: string): string[] {
    return jobDescription
        .split(/\r?\n|(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 20);
}

function classifyImportance(evidenceUnits: string[]): JobCapabilityImportance {
    const hasCritical = evidenceUnits.some((unit) => CRITICAL_MARKERS.test(unit));
    if (hasCritical) return "critical";

    const hasSupportingOnly = evidenceUnits.every((unit) => SUPPORTING_MARKERS.test(unit));
    if (hasSupportingOnly) return "supporting";
    return "important";
}

function extractStructuredCapabilities(units: string[]): ExtractedJobCapability[] {
    if (units.length === 0) return [];

    const hasAutomationIntent = units.some((unit) => AUTOMATION_INTENT_MARKERS.test(unit));
    const hasAnalyticsToolingContext = units.some((unit) => ANALYTICS_TOOL_MARKERS.test(unit));
    const extracted: ExtractedJobCapability[] = [];

    for (const capability of TAXONOMY_V1_PATTERNS) {
        const matchedUnits: string[] = [];
        let matchScore = 0;

        for (const unit of units) {
            let localScore = 0;
            if (capability.canonical_name === "analytics automation") {
                if (!hasAutomationIntent || !hasAnalyticsToolingContext) continue;
                const hasIntentInUnit = AUTOMATION_INTENT_MARKERS.test(unit);
                const hasContextInUnit = ANALYTICS_TOOL_MARKERS.test(unit);
                if (hasIntentInUnit && hasContextInUnit) {
                    localScore += 2;
                } else if (hasIntentInUnit || hasContextInUnit) {
                    localScore += 1;
                }
            } else if (capability.canonical_name === "cross-functional stakeholder leadership") {
                const hasLeadershipAlignmentVerb = CROSS_FUNCTIONAL_LEADERSHIP_PATTERNS.some((pattern) => pattern.test(unit));
                if (hasLeadershipAlignmentVerb) {
                    localScore += 1;
                }
                for (const pattern of capability.patterns) {
                    if (pattern.test(unit)) localScore += 1;
                }
            } else {
                for (const pattern of capability.patterns) {
                    if (pattern.test(unit)) {
                        localScore += 1;
                    }
                }
            }
            if (localScore === 0) continue;

            matchedUnits.push(compactSnippet(unit));
            matchScore += localScore;
            if (CRITICAL_MARKERS.test(unit)) matchScore += 0.6;
            if (SUPPORTING_MARKERS.test(unit)) matchScore -= 0.25;
        }

        if (matchedUnits.length === 0) continue;
        const uniqueEvidence = Array.from(new Set(matchedUnits)).slice(0, 3);
        const confidence = clamp((matchScore / (capability.patterns.length * 2.5)));

        extracted.push({
            canonical_name: capability.canonical_name,
            display_name: capability.display_name,
            importance: classifyImportance(uniqueEvidence),
            evidence: uniqueEvidence,
            confidence: round(confidence, 4),
            source_tier: "structured",
            matched_terms: [],
            matched_snippets: uniqueEvidence,
            role_family_basis: null,
        });
    }

    return extracted;
}

function normalizeForSearch(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s/&-]/g, " ").replace(/\s+/g, " ").trim();
}

function lexicalFallback(params: {
    units: string[];
    existingCanonical: Set<string>;
}): ExtractedJobCapability[] {
    const extracted: ExtractedJobCapability[] = [];
    for (const bucket of LEXICAL_FALLBACK_BUCKETS) {
        if (params.existingCanonical.has(bucket.canonical_name)) continue;
        const matchedTerms = new Set<string>();
        const matchedUnits: string[] = [];

        for (const unit of params.units) {
            const normalizedUnit = normalizeForSearch(unit);
            const termsForUnit = bucket.terms.filter((term) => normalizedUnit.includes(normalizeForSearch(term)));
            if (termsForUnit.length === 0) continue;
            for (const term of termsForUnit) matchedTerms.add(term);
            matchedUnits.push(compactSnippet(unit));
        }

        if (matchedTerms.size === 0) continue;
        const uniqueEvidence = Array.from(new Set(matchedUnits)).slice(0, 3);
        const confidence = clamp(0.28 + (matchedTerms.size * 0.08) + (uniqueEvidence.length * 0.06), 0, 0.8);

        extracted.push({
            canonical_name: bucket.canonical_name,
            display_name: bucket.display_name,
            importance: classifyImportance(uniqueEvidence),
            evidence: uniqueEvidence,
            confidence: round(confidence, 4),
            source_tier: "lexical_fallback",
            matched_terms: Array.from(matchedTerms).slice(0, 6),
            matched_snippets: uniqueEvidence,
            role_family_basis: null,
        });
    }

    return extracted;
}

function detectLikelyTitle(jobDescription: string): string | null {
    const lines = jobDescription
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    for (const line of lines.slice(0, 4)) {
        if (line.length < 90 && /\b(manager|director|lead|head|chief|sales|commercial|insights|transformation|program)\b/i.test(line)) {
            return line.replace(/\.$/, "");
        }
    }
    const sentence = jobDescription.split(/[.!?]/)[0]?.trim() ?? "";
    return sentence.length > 10 && sentence.length < 100 ? sentence : null;
}

function titlePriorFallback(params: {
    titleHint: string | null;
    units: string[];
    existingCanonical: Set<string>;
}): ExtractedJobCapability[] {
    const title = params.titleHint?.trim();
    if (!title) return [];
    const extracted: ExtractedJobCapability[] = [];

    const matchedPrior = TITLE_PRIOR_MAP.find((entry) => entry.pattern.test(title));
    if (!matchedPrior) return [];

    const hasLeadershipMarker = /\b(director|head|lead|manager|vp|chief)\b/i.test(title);
    const capabilities = matchedPrior.capabilities.filter((capability) => (
        hasLeadershipMarker || capability !== "people leadership"
    ));
    const topSnippet = params.units.find((unit) => normalizeForSearch(unit).includes(normalizeForSearch(title)))
        ?? params.units[0]
        ?? title;
    const evidence = [compactSnippet(topSnippet), compactSnippet(`Title prior inferred from role: ${title}`)];

    for (const capabilityName of capabilities) {
        if (params.existingCanonical.has(capabilityName)) continue;
        const capability = CAPABILITY_LOOKUP.get(capabilityName);
        if (!capability) continue;
        extracted.push({
            canonical_name: capability.canonical_name,
            display_name: capability.display_name,
            importance: "supporting",
            evidence,
            confidence: 0.26,
            source_tier: "title_prior",
            matched_terms: [title],
            matched_snippets: evidence,
            role_family_basis: matchedPrior.role_family_basis,
        });
    }

    return extracted;
}

function classifyProfileQuality(params: {
    capabilities: ExtractedJobCapability[];
}): JobCapabilityExtractionResult["diagnostics"] & { quality: JobCapabilityProfileQuality } {
    const total = params.capabilities.length;
    const structured = params.capabilities.filter((item) => item.source_tier === "structured").length;
    const lexical = params.capabilities.filter((item) => item.source_tier === "lexical_fallback").length;
    const titlePrior = params.capabilities.filter((item) => item.source_tier === "title_prior").length;
    const bodyDerived = structured + lexical;
    const supportingEvidenceUnits = new Set(
        params.capabilities
            .flatMap((item) => item.source_tier === "title_prior" ? [] : item.matched_snippets),
    ).size;
    const reasons: string[] = [];

    let quality: JobCapabilityProfileQuality = "strong";
    if (total === 0) {
        quality = "empty";
        reasons.push("No capabilities extracted from JD text or title prior.");
    } else if (total <= 2) {
        quality = "sparse";
        reasons.push("Too few capabilities extracted for reliable job grounding.");
    } else if (bodyDerived === 0) {
        quality = "sparse";
        reasons.push("Capabilities are derived only from title prior.");
    } else if (supportingEvidenceUnits <= 1) {
        quality = "sparse";
        reasons.push("Too little supporting evidence from JD body text.");
    } else if (titlePrior > bodyDerived) {
        quality = "sparse";
        reasons.push("Extraction depends mostly on title prior instead of JD body text.");
    } else if (total >= 5 && bodyDerived >= 4 && supportingEvidenceUnits >= 3) {
        quality = "strong";
    } else {
        quality = "usable";
        reasons.push("Partial JD grounding detected; profile is usable but not comprehensive.");
    }

    return {
        quality,
        reasons,
        total_capability_count: total,
        body_derived_count: bodyDerived,
        title_prior_count: titlePrior,
        structured_count: structured,
        lexical_fallback_count: lexical,
        supporting_evidence_units: supportingEvidenceUnits,
        used_title_prior: titlePrior > 0,
    };
}

function sortCapabilities(capabilities: ExtractedJobCapability[]): ExtractedJobCapability[] {
    return capabilities.sort((a, b) => {
        const importanceWeight = (value: JobCapabilityImportance): number => {
            if (value === "critical") return 3;
            if (value === "important") return 2;
            return 1;
        };
        const tierWeight = (value: JobCapabilitySourceTier): number => {
            if (value === "structured") return 3;
            if (value === "lexical_fallback") return 2;
            return 1;
        };
        const importanceDelta = importanceWeight(b.importance) - importanceWeight(a.importance);
        if (importanceDelta !== 0) return importanceDelta;
        const tierDelta = tierWeight(b.source_tier) - tierWeight(a.source_tier);
        if (tierDelta !== 0) return tierDelta;
        return b.confidence - a.confidence;
    });
}

export function extractJobCapabilityProfileV1(input: {
    jobDescription: string;
    titleHint?: string | null;
}): JobCapabilityExtractionResult {
    const units = splitEvidenceUnits(input.jobDescription);
    if (units.length === 0) {
        return {
            capabilities: [],
            quality: "empty",
            diagnostics: {
                reasons: ["JD text has no usable evidence units."],
                total_capability_count: 0,
                body_derived_count: 0,
                title_prior_count: 0,
                structured_count: 0,
                lexical_fallback_count: 0,
                supporting_evidence_units: 0,
                used_title_prior: false,
            },
        };
    }

    const structured = extractStructuredCapabilities(units);
    const existing = new Set(structured.map((item) => item.canonical_name));

    let lexical: ExtractedJobCapability[] = [];
    if (structured.length === 0 || structured.length <= 2) {
        lexical = lexicalFallback({
            units,
            existingCanonical: existing,
        });
        for (const item of lexical) existing.add(item.canonical_name);
    }

    let titlePrior: ExtractedJobCapability[] = [];
    const titleForPrior = input.titleHint ?? detectLikelyTitle(input.jobDescription);
    if ((structured.length + lexical.length) <= 2) {
        titlePrior = titlePriorFallback({
            titleHint: titleForPrior,
            units,
            existingCanonical: existing,
        });
    }

    const capabilities = sortCapabilities([...structured, ...lexical, ...titlePrior]);
    const classified = classifyProfileQuality({ capabilities });
    return {
        capabilities,
        quality: classified.quality,
        diagnostics: {
            reasons: classified.reasons,
            total_capability_count: classified.total_capability_count,
            body_derived_count: classified.body_derived_count,
            title_prior_count: classified.title_prior_count,
            structured_count: classified.structured_count,
            lexical_fallback_count: classified.lexical_fallback_count,
            supporting_evidence_units: classified.supporting_evidence_units,
            used_title_prior: classified.used_title_prior,
        },
    };
}

export function extractJobCapabilitiesV1(jobDescription: string): ExtractedJobCapability[] {
    return extractJobCapabilityProfileV1({ jobDescription }).capabilities;
}

export function deriveJobProfileQualityV1(jobDescription: string): {
    quality: JobCapabilityProfileQuality;
    diagnostics: JobCapabilityExtractionResult["diagnostics"];
} {
    const result = extractJobCapabilityProfileV1({ jobDescription });
    return {
        quality: result.quality,
        diagnostics: result.diagnostics,
    };
}
