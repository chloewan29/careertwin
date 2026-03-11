export type EvidenceSourceType = "resume" | "interview" | "manual" | "imported_doc";

export type EvidenceTeamScope =
    | "unknown"
    | "self"
    | "small_team"
    | "squad"
    | "cross_functional"
    | "department"
    | "enterprise";

export type EvidenceBusinessScope =
    | "unknown"
    | "local"
    | "portfolio"
    | "business_unit"
    | "enterprise"
    | "external_clients";

export type EvidenceCustomerScope =
    | "unknown"
    | "small_segment"
    | "multi_segment"
    | "national"
    | "mass_market";

export type EvidenceImpactScope =
    | "unknown"
    | "operational"
    | "commercial"
    | "strategic";

export type EvidenceInferredScale = {
    team_scope: EvidenceTeamScope;
    business_scope: EvidenceBusinessScope;
    customer_scope: EvidenceCustomerScope;
    impact_scope: EvidenceImpactScope;
};

export type EvidenceGeographyScope = "unknown" | "single_market" | "multi_region" | "national" | "global";
export type EvidenceOrgSpan = "unknown" | "single_team" | "multi_team" | "cross_functional" | "enterprise";
export type EvidenceDeliverySpan = "unknown" | "task" | "project" | "product" | "program" | "platform";

export type EvidenceInferredScope = {
    geography: EvidenceGeographyScope;
    org_span: EvidenceOrgSpan;
    delivery_span: EvidenceDeliverySpan;
};

export type StructuredEvidenceFields = {
    source_type: EvidenceSourceType;
    summary: string | null;
    action: string | null;
    impact: string | null;
    stakeholders: string[];
    tools_methods: string[];
    business_context: string | null;
    inferred_scale: EvidenceInferredScale | null;
    inferred_scope: EvidenceInferredScope | null;
    confidence: number;
    missing_fields: string[];
};

const ACTION_VERB_RE = /^(led|built|created|developed|implemented|drove|managed|owned|designed|launched|pioneered|conducted|generated|presented|established|delivered|architected|streamlined|optimized|improved|reduced|increased)\b/i;
const IMPACT_SIGNAL_RE = /\b(\$?\d+(?:\.\d+)?\s*(?:m|k|million|billion|%)|reduced|increased|improved|grew|growth|saved|revenue|cost|margin|nps|uplift|optimized|opportunity)\b/i;
const STAKEHOLDER_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
    { key: "executives", pattern: /\b(executive|senior leadership|leadership team|vp|c-suite)\b/i },
    { key: "customers", pattern: /\b(customer|client|consumer|agency|advertiser)\b/i },
    { key: "cross-functional teams", pattern: /\b(cross-functional|multiple business units|go-to-market|product and engineering)\b/i },
    { key: "analytics teams", pattern: /\b(analyst|analytics team|data team|bi team)\b/i },
];

const TOOL_PATTERNS: RegExp[] = [
    /\b(sql|python|r|javascript|power bi|tableau|bigquery|excel|ga4|google analytics|adwords api|looker|snowflake|dbt|llm|claude)\b/i,
    /\b(moscow|agile|scrum|kanban|a\/b testing|semantic layer)\b/i,
];

const BUSINESS_CONTEXT_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
    { key: "streaming media", pattern: /\b(streaming|media|subscription)\b/i },
    { key: "telecommunications", pattern: /\b(telecommunications|telco)\b/i },
    { key: "programmatic advertising", pattern: /\b(programmatic|dsp|ssp|ad-tech|advertising)\b/i },
    { key: "nps and customer experience", pattern: /\b(nps|customer experience|cx)\b/i },
    { key: "revenue and commercial performance", pattern: /\b(revenue|commercial|margin|profit|growth)\b/i },
];

function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function firstSentence(text: string): string {
    const normalized = normalizeWhitespace(text);
    const [sentence] = normalized.split(/(?<=[.!?])\s+/);
    return (sentence ?? normalized).trim();
}

function compact(text: string, max = 160): string {
    const normalized = normalizeWhitespace(text);
    if (normalized.length <= max) return normalized;
    const sliced = normalized.slice(0, max);
    const cut = sliced.lastIndexOf(" ");
    return `${(cut > 40 ? sliced.slice(0, cut) : sliced).trim()}...`;
}

function detectStakeholders(text: string): string[] {
    const found: string[] = [];
    for (const item of STAKEHOLDER_PATTERNS) {
        if (item.pattern.test(text)) found.push(item.key);
    }
    return Array.from(new Set(found));
}

function detectToolsMethods(text: string): string[] {
    const lowered = text.toLowerCase();
    const found = new Set<string>();
    const candidates = [
        "sql", "python", "r", "javascript", "power bi", "tableau", "bigquery", "excel",
        "google analytics", "adwords api", "llm", "claude", "agile", "scrum", "kanban", "moscow", "semantic layer",
    ];
    for (const candidate of candidates) {
        if (lowered.includes(candidate)) found.add(candidate);
    }
    for (const pattern of TOOL_PATTERNS) {
        const match = lowered.match(pattern);
        if (match?.[0]) found.add(match[0].toLowerCase());
    }
    return Array.from(found);
}

function detectBusinessContext(text: string): string | null {
    for (const item of BUSINESS_CONTEXT_PATTERNS) {
        if (item.pattern.test(text)) return item.key;
    }
    return null;
}

function inferScale(text: string): EvidenceInferredScale {
    const lowered = text.toLowerCase();
    const team_scope: EvidenceTeamScope = /\bteam of \d+\b/.test(lowered)
        ? "small_team"
        : /\bcross-functional\b/.test(lowered)
            ? "cross_functional"
            : /\benterprise-wide|company-wide\b/.test(lowered)
                ? "enterprise"
                : /\bteam\b/.test(lowered)
                    ? "squad"
                    : "unknown";

    const business_scope: EvidenceBusinessScope = /\benterprise-wide|company-wide\b/.test(lowered)
        ? "enterprise"
        : /\bportfolio\b/.test(lowered)
            ? "portfolio"
            : /\bbusiness unit\b/.test(lowered)
                ? "business_unit"
                : /\bclient|agency|advertiser\b/.test(lowered)
                    ? "external_clients"
                    : "unknown";

    const customer_scope: EvidenceCustomerScope = /\bnational\b/.test(lowered)
        ? "national"
        : /\bsegment|cohort|multi-segment\b/.test(lowered)
            ? "multi_segment"
            : /\bcustomer|consumer\b/.test(lowered)
                ? "small_segment"
                : "unknown";

    const impact_scope: EvidenceImpactScope = /\brevenue|margin|cost|profit|commercial|opportunity\b/.test(lowered)
        ? "commercial"
        : /\bstrategy|roadmap|prioritization|executive\b/.test(lowered)
            ? "strategic"
            : /\breporting|process|cycle time|automation|operational\b/.test(lowered)
                ? "operational"
                : "unknown";

    return { team_scope, business_scope, customer_scope, impact_scope };
}

function inferScope(text: string): EvidenceInferredScope {
    const lowered = text.toLowerCase();
    const geography: EvidenceGeographyScope = /\bglobal\b/.test(lowered)
        ? "global"
        : /\bnational\b/.test(lowered)
            ? "national"
            : /\bregion|state|anz|multi-region\b/.test(lowered)
                ? "multi_region"
                : "unknown";

    const org_span: EvidenceOrgSpan = /\benterprise-wide|company-wide\b/.test(lowered)
        ? "enterprise"
        : /\bcross-functional\b/.test(lowered)
            ? "cross_functional"
            : /\bmultiple teams|across teams|business units\b/.test(lowered)
                ? "multi_team"
                : /\bteam\b/.test(lowered)
                    ? "single_team"
                    : "unknown";

    const delivery_span: EvidenceDeliverySpan = /\bplatform\b/.test(lowered)
        ? "platform"
        : /\bprogram\b/.test(lowered)
            ? "program"
            : /\bproduct\b/.test(lowered)
                ? "product"
                : /\bproject\b/.test(lowered)
                    ? "project"
                    : "unknown";

    return { geography, org_span, delivery_span };
}

function hasKnownScale(scale: EvidenceInferredScale): boolean {
    return scale.team_scope !== "unknown"
        || scale.business_scope !== "unknown"
        || scale.customer_scope !== "unknown"
        || scale.impact_scope !== "unknown";
}

function hasKnownScope(scope: EvidenceInferredScope): boolean {
    return scope.geography !== "unknown"
        || scope.org_span !== "unknown"
        || scope.delivery_span !== "unknown";
}

// Resume ingestion creates a conservative initial graph. Missing action/impact/stakeholder/scale
// should be enriched later via interview or user confirmation.
export function deriveStructuredEvidenceFields(rawText: string, sourceType: EvidenceSourceType = "resume"): StructuredEvidenceFields {
    const normalized = normalizeWhitespace(rawText);
    const summary = normalized ? compact(firstSentence(normalized), 140) : null;
    const action = ACTION_VERB_RE.test(normalized) ? compact(firstSentence(normalized), 180) : null;
    const impact = IMPACT_SIGNAL_RE.test(normalized)
        ? compact(firstSentence(normalized.match(/[^.!?]*(?:\$?\d|reduced|increased|improved|growth|revenue|cost|margin|nps)[^.!?]*/i)?.[0] ?? normalized), 180)
        : null;
    const stakeholders = detectStakeholders(normalized);
    const tools_methods = detectToolsMethods(normalized);
    const business_context = detectBusinessContext(normalized);

    const inferred_scale = inferScale(normalized);
    const inferred_scope = inferScope(normalized);

    const missing_fields: string[] = [];
    if (!action) missing_fields.push("action");
    if (!impact) missing_fields.push("impact");
    if (stakeholders.length === 0) missing_fields.push("stakeholders");
    if (tools_methods.length === 0) missing_fields.push("tools_methods");
    if (!business_context) missing_fields.push("business_context");
    if (!hasKnownScale(inferred_scale)) missing_fields.push("scale");
    if (!hasKnownScope(inferred_scope)) missing_fields.push("scope");

    const presentSignals = 7 - missing_fields.length;
    const confidence = Math.max(0.2, Math.min(0.95, 0.25 + (presentSignals * 0.1)));

    return {
        source_type: sourceType,
        summary,
        action,
        impact,
        stakeholders,
        tools_methods,
        business_context,
        inferred_scale,
        inferred_scope,
        confidence: Number(confidence.toFixed(2)),
        missing_fields,
    };
}
