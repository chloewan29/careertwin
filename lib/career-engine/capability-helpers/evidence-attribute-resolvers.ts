import type { EvidencePiece } from "../memory/career-graph-loader";

export const ORG_SCOPE_VALUES = ["team", "department", "cross_functional", "enterprise"] as const;
export const STAKEHOLDER_SCOPE_VALUES = ["internal", "cross_team", "executive", "external"] as const;
export const LEADERSHIP_SCOPE_VALUES = ["individual_contribution", "technical_lead", "team_lead", "program_lead", "org_lead"] as const;
export const DELIVERY_LEVEL_VALUES = ["task", "project", "product", "program", "platform"] as const;
export const IMPACT_SCALE_VALUES = ["small", "medium", "large", "enterprise"] as const;
export const IMPACT_TYPE_VALUES = ["revenue", "cost", "operational", "strategic"] as const;
export const CONFIDENCE_LEVEL_VALUES = ["low", "medium", "high"] as const;

export type OrgScope = typeof ORG_SCOPE_VALUES[number];
export type StakeholderScope = typeof STAKEHOLDER_SCOPE_VALUES[number];
export type LeadershipScope = typeof LEADERSHIP_SCOPE_VALUES[number];
export type DeliveryLevel = typeof DELIVERY_LEVEL_VALUES[number];
export type ImpactScale = typeof IMPACT_SCALE_VALUES[number];
export type ImpactType = typeof IMPACT_TYPE_VALUES[number];
export type ConfidenceLevel = typeof CONFIDENCE_LEVEL_VALUES[number];

export function normalizeEnumLikeValue(input: unknown): string | null {
    if (typeof input !== "string") return null;
    const normalized = input
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    return normalized.length > 0 ? normalized : null;
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
    return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function getLegacyContainer(raw: unknown): Record<string, unknown> | null {
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
}

function pickNormalized(container: Record<string, unknown> | null, keys: string[]): string | null {
    if (!container) return null;
    for (const key of keys) {
        const value = normalizeEnumLikeValue(container[key]);
        if (value) return value;
    }
    return null;
}

function inferredScopeToken(piece: EvidencePiece): string | null {
    const direct = normalizeEnumLikeValue(piece.inferred_scope);
    if (direct) return direct;
    const container = getLegacyContainer(piece.inferred_scope);
    return pickNormalized(container, [
        "org_scope",
        "org_span",
        "scope",
        "stakeholder_scope",
        "stakeholder_span",
        "leadership_scope",
        "leadership_level",
        "delivery_level",
        "delivery_span",
    ]);
}

function inferredScaleToken(piece: EvidencePiece): string | null {
    const direct = normalizeEnumLikeValue(piece.inferred_scale);
    if (direct) return direct;
    const container = getLegacyContainer(piece.inferred_scale);
    return pickNormalized(container, [
        "impact_scale",
        "scale",
        "size",
        "magnitude",
        "impact_type",
    ]);
}

const ORG_SCOPE_FROM_LEGACY: Record<string, OrgScope> = {
    team: "team",
    department: "department",
    cross_functional: "cross_functional",
    enterprise: "enterprise",
    org: "enterprise",
    organization: "enterprise",
    organisation: "enterprise",
    company: "enterprise",
    business_unit: "department",
    bu: "department",
};

const IMPACT_SCALE_FROM_LEGACY: Record<string, ImpactScale> = {
    small: "small",
    medium: "medium",
    large: "large",
    enterprise: "enterprise",
    org: "enterprise",
    organization: "enterprise",
    organisation: "enterprise",
    company: "enterprise",
    company_wide: "enterprise",
    portfolio: "large",
    platform: "large",
    program: "large",
};

const STAKEHOLDER_SCOPE_FROM_LEGACY: Record<string, StakeholderScope> = {
    internal: "internal",
    cross_team: "cross_team",
    executive: "executive",
    exec: "executive",
    external: "external",
    client: "external",
    vendor: "external",
    partner: "external",
};

const LEADERSHIP_SCOPE_FROM_LEGACY: Record<string, LeadershipScope> = {
    individual_contribution: "individual_contribution",
    ic: "individual_contribution",
    technical_lead: "technical_lead",
    team_lead: "team_lead",
    program_lead: "program_lead",
    org_lead: "org_lead",
    people_manager: "team_lead",
    manager: "team_lead",
    program_manager: "program_lead",
    head_of: "org_lead",
    director: "org_lead",
};

const DELIVERY_LEVEL_FROM_LEGACY: Record<string, DeliveryLevel> = {
    task: "task",
    project: "project",
    product: "product",
    program: "program",
    platform: "platform",
};

const IMPACT_TYPE_FROM_LEGACY: Record<string, ImpactType> = {
    revenue: "revenue",
    cost: "cost",
    operational: "operational",
    strategic: "strategic",
};

export function resolveOrgScope(piece: EvidencePiece): OrgScope | null {
    if (isOneOf(piece.org_scope, ORG_SCOPE_VALUES)) return piece.org_scope;

    const token = inferredScopeToken(piece);
    if (!token) return null;
    return ORG_SCOPE_FROM_LEGACY[token] ?? null;
}

export function resolveStakeholderScope(piece: EvidencePiece): StakeholderScope | null {
    if (isOneOf(piece.stakeholder_scope, STAKEHOLDER_SCOPE_VALUES)) return piece.stakeholder_scope;

    const token = inferredScopeToken(piece);
    if (!token) return null;
    return STAKEHOLDER_SCOPE_FROM_LEGACY[token] ?? null;
}

export function resolveLeadershipScope(piece: EvidencePiece): LeadershipScope | null {
    if (isOneOf(piece.leadership_scope, LEADERSHIP_SCOPE_VALUES)) return piece.leadership_scope;

    const token = inferredScopeToken(piece);
    if (!token) return null;
    return LEADERSHIP_SCOPE_FROM_LEGACY[token] ?? null;
}

export function resolveDeliveryLevel(piece: EvidencePiece): DeliveryLevel | null {
    if (isOneOf(piece.delivery_level, DELIVERY_LEVEL_VALUES)) return piece.delivery_level;

    const fromScope = inferredScopeToken(piece);
    if (fromScope && DELIVERY_LEVEL_FROM_LEGACY[fromScope]) return DELIVERY_LEVEL_FROM_LEGACY[fromScope];

    const fromScale = inferredScaleToken(piece);
    if (fromScale && DELIVERY_LEVEL_FROM_LEGACY[fromScale]) return DELIVERY_LEVEL_FROM_LEGACY[fromScale];

    return null;
}

export function resolveImpactScale(piece: EvidencePiece): ImpactScale | null {
    if (isOneOf(piece.impact_scale, IMPACT_SCALE_VALUES)) return piece.impact_scale;

    const token = inferredScaleToken(piece);
    if (!token) return null;
    return IMPACT_SCALE_FROM_LEGACY[token] ?? null;
}

export function resolveImpactType(piece: EvidencePiece): ImpactType | null {
    if (isOneOf(piece.impact_type, IMPACT_TYPE_VALUES)) return piece.impact_type;

    const fromScope = inferredScopeToken(piece);
    if (fromScope && IMPACT_TYPE_FROM_LEGACY[fromScope]) return IMPACT_TYPE_FROM_LEGACY[fromScope];

    const fromScale = inferredScaleToken(piece);
    if (fromScale && IMPACT_TYPE_FROM_LEGACY[fromScale]) return IMPACT_TYPE_FROM_LEGACY[fromScale];

    return null;
}

export function resolveEvidenceConfidenceLevel(piece: EvidencePiece): ConfidenceLevel | null {
    if (isOneOf(piece.confidence_level, CONFIDENCE_LEVEL_VALUES)) return piece.confidence_level;

    const raw = piece.confidence as unknown;
    if (typeof raw === "number" && Number.isFinite(raw)) {
        if (raw >= 0.8) return "high";
        if (raw >= 0.5) return "medium";
        return "low";
    }

    const asString = normalizeEnumLikeValue(raw);
    if (asString === "high" || asString === "medium" || asString === "low") return asString;
    return null;
}

