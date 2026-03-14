import type {
    Capability,
    CareerGraph,
    EvidencePiece,
} from "../memory/career-graph-loader";
import {
    DELIVERY_LEVEL_VALUES,
    IMPACT_SCALE_VALUES,
    ORG_SCOPE_VALUES,
    STAKEHOLDER_SCOPE_VALUES,
    resolveDeliveryLevel,
    resolveImpactScale,
    resolveImpactType,
    resolveLeadershipScope,
    resolveOrgScope,
    resolveStakeholderScope,
    type DeliveryLevel,
    type ImpactScale,
    type ImpactType,
    type LeadershipScope,
    type OrgScope,
    type StakeholderScope,
} from "../capability-helpers/evidence-attribute-resolvers";

export type CapabilityGraph = CareerGraph;

export type RankedCapability = {
    capability: Capability;
    evidenceCount: number;
};

export type CapabilitySummary = {
    totalCapabilities: number;
    topCapabilities: RankedCapability[];
    capabilityToEvidenceCount: Record<string, number>;
    capabilityScaleSummary: Record<string, {
        dominant_team_scope: string;
        max_team_scope_seen: string;
        dominant_business_scope: string;
        max_business_scope_seen: string;
        dominant_impact_scope: string;
        scale_confidence: "low" | "medium" | "high";
        max_scope_seen: "team" | "department" | "cross_functional" | "enterprise" | null;
        dominant_scope: "team" | "department" | "cross_functional" | "enterprise" | null;
        dominant_delivery_level: "task" | "project" | "product" | "program" | "platform" | null;
        stakeholder_span: "internal" | "cross_team" | "executive" | "external" | null;
        leadership_span: "individual_contribution" | "technical_lead" | "team_lead" | "program_lead" | "org_lead" | null;
        impact_scale_max: "small" | "medium" | "large" | "enterprise" | null;
        dominant_impact_type: "revenue" | "cost" | "operational" | "strategic" | null;
        aggregation_confidence: "low" | "medium" | "high" | null;
    }>;
};

function normalizeCapabilityKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    const deduped: T[] = [];

    for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        deduped.push(item);
    }

    return deduped;
}

function getCapabilityEvidenceCount(careerGraph: CareerGraph, capabilityId: string): number {
    return (careerGraph.evidenceByCapability[capabilityId] ?? []).length;
}

function rankScope(value: string, order: string[]): number {
    const idx = order.indexOf(value);
    return idx >= 0 ? idx : 0;
}

function dominantValue(values: string[]): string {
    if (values.length === 0) return "unknown";
    const counts = new Map<string, number>();
    for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function rankByOrder(value: string, order: readonly string[]): number {
    const idx = order.indexOf(value);
    return idx >= 0 ? idx : -1;
}

function chooseDominantOrdered<T extends string>(values: T[], order: readonly T[]): T | null {
    if (values.length === 0) return null;
    const counts = new Map<T, number>();
    for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const ordered = [...counts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        const aRank = rankByOrder(a[0], order);
        const bRank = rankByOrder(b[0], order);
        if (bRank !== aRank) return bRank - aRank;
        return a[0].localeCompare(b[0]);
    });
    return ordered[0]?.[0] ?? null;
}

function chooseMaxOrdered<T extends string>(values: T[], order: readonly T[]): T | null {
    if (values.length === 0) return null;
    return values
        .slice()
        .sort((a, b) => {
            const aRank = rankByOrder(a, order);
            const bRank = rankByOrder(b, order);
            if (bRank !== aRank) return bRank - aRank;
            return a.localeCompare(b);
        })[0] ?? null;
}

function isCanonicalValue(value: unknown, allowed: readonly string[]): boolean {
    return typeof value === "string" && allowed.includes(value);
}

const ORG_SCOPE_ORDER = ORG_SCOPE_VALUES;
const DELIVERY_LEVEL_ORDER = DELIVERY_LEVEL_VALUES;
const STAKEHOLDER_SCOPE_ORDER = STAKEHOLDER_SCOPE_VALUES;
const LEADERSHIP_SCOPE_ORDER = ["individual_contribution", "technical_lead", "team_lead", "program_lead", "org_lead"] as const;
const IMPACT_SCALE_ORDER = IMPACT_SCALE_VALUES;
const IMPACT_TYPE_ORDER = ["cost", "operational", "revenue", "strategic"] as const;

function buildCapabilityScaleSummary(careerGraph: CareerGraph, capabilityId: string): {
    dominant_team_scope: string;
    max_team_scope_seen: string;
    dominant_business_scope: string;
    max_business_scope_seen: string;
    dominant_impact_scope: string;
    scale_confidence: "low" | "medium" | "high";
    max_scope_seen: OrgScope | null;
    dominant_scope: OrgScope | null;
    dominant_delivery_level: DeliveryLevel | null;
    stakeholder_span: StakeholderScope | null;
    leadership_span: LeadershipScope | null;
    impact_scale_max: ImpactScale | null;
    dominant_impact_type: ImpactType | null;
    aggregation_confidence: "low" | "medium" | "high" | null;
} {
    const evidence = careerGraph.evidenceByCapability[capabilityId] ?? [];
    const teamOrder = ["unknown", "self", "small_team", "squad", "cross_functional", "department", "enterprise"];
    const businessOrder = ["unknown", "local", "portfolio", "business_unit", "enterprise", "external_clients"];
    const impactOrder = ["unknown", "operational", "commercial", "strategic"];

    const teamValues: string[] = [];
    const businessValues: string[] = [];
    const impactValues: string[] = [];
    const orgScopeValues: OrgScope[] = [];
    const deliveryValues: DeliveryLevel[] = [];
    const stakeholderValues: StakeholderScope[] = [];
    const leadershipValues: LeadershipScope[] = [];
    const impactScaleValues: ImpactScale[] = [];
    const impactTypeValues: ImpactType[] = [];
    let canonicalSignalCount = 0;
    let fallbackSignalCount = 0;

    for (const piece of evidence) {
        const scale = (piece.inferred_scale ?? {}) as Record<string, unknown>;
        const team = typeof scale.team_scope === "string" ? scale.team_scope : "unknown";
        const business = typeof scale.business_scope === "string" ? scale.business_scope : "unknown";
        const impact = typeof scale.impact_scope === "string" ? scale.impact_scope : "unknown";

        if (team !== "unknown") teamValues.push(team);
        if (business !== "unknown") businessValues.push(business);
        if (impact !== "unknown") impactValues.push(impact);

        const resolvedOrg = resolveOrgScope(piece);
        if (resolvedOrg) {
            orgScopeValues.push(resolvedOrg);
            if (isCanonicalValue(piece.org_scope, ORG_SCOPE_VALUES)) canonicalSignalCount += 1;
            else fallbackSignalCount += 1;
        }

        const resolvedDelivery = resolveDeliveryLevel(piece);
        if (resolvedDelivery) {
            deliveryValues.push(resolvedDelivery);
            if (isCanonicalValue(piece.delivery_level, DELIVERY_LEVEL_VALUES)) canonicalSignalCount += 1;
            else fallbackSignalCount += 1;
        }

        const resolvedStakeholder = resolveStakeholderScope(piece);
        if (resolvedStakeholder) {
            stakeholderValues.push(resolvedStakeholder);
            if (isCanonicalValue(piece.stakeholder_scope, STAKEHOLDER_SCOPE_VALUES)) canonicalSignalCount += 1;
            else fallbackSignalCount += 1;
        }

        const resolvedLeadership = resolveLeadershipScope(piece);
        if (resolvedLeadership) {
            leadershipValues.push(resolvedLeadership);
            if (isCanonicalValue(piece.leadership_scope, LEADERSHIP_SCOPE_ORDER)) canonicalSignalCount += 1;
            else fallbackSignalCount += 1;
        }

        const resolvedImpactScale = resolveImpactScale(piece);
        if (resolvedImpactScale) {
            impactScaleValues.push(resolvedImpactScale);
            if (isCanonicalValue(piece.impact_scale, IMPACT_SCALE_VALUES)) canonicalSignalCount += 1;
            else fallbackSignalCount += 1;
        }

        const resolvedImpactType = resolveImpactType(piece);
        if (resolvedImpactType) {
            impactTypeValues.push(resolvedImpactType);
            if (isCanonicalValue(piece.impact_type, IMPACT_TYPE_ORDER)) canonicalSignalCount += 1;
            else fallbackSignalCount += 1;
        }
    }

    const maxTeam = teamValues.length > 0
        ? teamValues.slice().sort((a, b) => rankScope(b, teamOrder) - rankScope(a, teamOrder))[0]
        : "unknown";
    const maxBusiness = businessValues.length > 0
        ? businessValues.slice().sort((a, b) => rankScope(b, businessOrder) - rankScope(a, businessOrder))[0]
        : "unknown";

    const nonUnknownSignals = teamValues.length + businessValues.length + impactValues.length;
    const evidenceCount = evidence.length;
    const scale_confidence: "low" | "medium" | "high" = nonUnknownSignals >= 5 && evidenceCount >= 3
        ? "high"
        : nonUnknownSignals >= 2
            ? "medium"
            : "low";

    const keyFieldSlotCount = evidenceCount * 5;
    const filledKeySlots =
        orgScopeValues.length
        + leadershipValues.length
        + deliveryValues.length
        + stakeholderValues.length
        + impactScaleValues.length;
    const keyCoverageRatio = keyFieldSlotCount > 0 ? filledKeySlots / keyFieldSlotCount : 0;
    const canonicalCoverageRatio = evidenceCount > 0 ? canonicalSignalCount / (evidenceCount * 6) : 0;
    const fallbackCoverageRatio = evidenceCount > 0 ? fallbackSignalCount / (evidenceCount * 6) : 0;

    const consistencyScores: number[] = [];
    const addConsistency = <T extends string>(values: T[]) => {
        if (values.length === 0) return;
        const counts = new Map<T, number>();
        for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
        const maxCount = Math.max(...Array.from(counts.values()));
        consistencyScores.push(maxCount / values.length);
    };
    addConsistency(orgScopeValues);
    addConsistency(leadershipValues);
    addConsistency(deliveryValues);
    addConsistency(stakeholderValues);
    addConsistency(impactScaleValues);
    const consistency = consistencyScores.length > 0
        ? consistencyScores.reduce((sum, value) => sum + value, 0) / consistencyScores.length
        : 0;

    let aggregation_confidence: "low" | "medium" | "high" | null = null;
    if (filledKeySlots > 0) {
        aggregation_confidence =
            evidenceCount >= 3 && keyCoverageRatio >= 0.5 && consistency >= 0.6
                ? "high"
                : evidenceCount >= 2 && (keyCoverageRatio >= 0.2 || canonicalCoverageRatio >= 0.2 || (canonicalCoverageRatio + fallbackCoverageRatio) >= 0.35)
                    ? "medium"
                    : "low";
    }

    return {
        dominant_team_scope: dominantValue(teamValues),
        max_team_scope_seen: maxTeam,
        dominant_business_scope: dominantValue(businessValues),
        max_business_scope_seen: maxBusiness,
        dominant_impact_scope: dominantValue(impactValues),
        scale_confidence,
        max_scope_seen: chooseMaxOrdered(orgScopeValues, ORG_SCOPE_ORDER),
        dominant_scope: chooseDominantOrdered(orgScopeValues, ORG_SCOPE_ORDER),
        dominant_delivery_level: chooseDominantOrdered(deliveryValues, DELIVERY_LEVEL_ORDER),
        stakeholder_span: chooseMaxOrdered(stakeholderValues, STAKEHOLDER_SCOPE_ORDER),
        leadership_span: chooseMaxOrdered(leadershipValues, LEADERSHIP_SCOPE_ORDER),
        impact_scale_max: chooseMaxOrdered(impactScaleValues, IMPACT_SCALE_ORDER),
        dominant_impact_type: chooseDominantOrdered(impactTypeValues, IMPACT_TYPE_ORDER),
        aggregation_confidence,
    };
}

function resolveCapability(
    careerGraph: CareerGraph,
    capabilityIdOrName: string,
): Capability | null {
    const cleaned = capabilityIdOrName.trim();
    if (!cleaned) return null;

    const byId = careerGraph.capabilities.find((capability) => capability.id === cleaned);
    if (byId) return byId;

    const normalizedInput = normalizeCapabilityKey(cleaned);
    return careerGraph.capabilities.find((capability) =>
        normalizeCapabilityKey(capability.normalized_name) === normalizedInput
        || normalizeCapabilityKey(capability.name) === normalizedInput,
    ) ?? null;
}

export function getCapabilitiesForExperience(
    careerGraph: CareerGraph,
    experienceId: string,
): Capability[] {
    const evidence = careerGraph.evidenceByExperience[experienceId] ?? [];
    const capabilities = evidence.flatMap((piece) => careerGraph.capabilitiesByEvidence[piece.id] ?? []);
    return dedupeById(capabilities);
}

export function getEvidenceForCapability(
    careerGraph: CareerGraph,
    capabilityIdOrName: string,
): EvidencePiece[] {
    const capability = resolveCapability(careerGraph, capabilityIdOrName);
    if (!capability) return [];

    const evidence = careerGraph.evidenceByCapability[capability.id] ?? [];
    return dedupeById(evidence);
}

export function getTopCapabilitiesForCareer(
    careerGraph: CareerGraph,
    limit = 10,
): RankedCapability[] {
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 10;

    return careerGraph.capabilities
        .map((capability) => ({
            capability,
            evidenceCount: getCapabilityEvidenceCount(careerGraph, capability.id),
        }))
        .sort((a, b) => {
            if (b.evidenceCount !== a.evidenceCount) {
                return b.evidenceCount - a.evidenceCount;
            }

            const aStrength = a.capability.strength ?? Number.NEGATIVE_INFINITY;
            const bStrength = b.capability.strength ?? Number.NEGATIVE_INFINITY;
            if (bStrength !== aStrength) {
                return bStrength - aStrength;
            }

            return a.capability.name.localeCompare(b.capability.name);
        })
        .slice(0, safeLimit);
}

export function getCapabilitySummary(careerGraph: CareerGraph): CapabilitySummary {
    const capabilityToEvidenceCount: Record<string, number> = {};
    const capabilityScaleSummary: Record<string, {
        dominant_team_scope: string;
        max_team_scope_seen: string;
        dominant_business_scope: string;
        max_business_scope_seen: string;
        dominant_impact_scope: string;
        scale_confidence: "low" | "medium" | "high";
        max_scope_seen: OrgScope | null;
        dominant_scope: OrgScope | null;
        dominant_delivery_level: DeliveryLevel | null;
        stakeholder_span: StakeholderScope | null;
        leadership_span: LeadershipScope | null;
        impact_scale_max: ImpactScale | null;
        dominant_impact_type: ImpactType | null;
        aggregation_confidence: "low" | "medium" | "high" | null;
    }> = {};

    for (const capability of careerGraph.capabilities) {
        capabilityToEvidenceCount[capability.id] = getCapabilityEvidenceCount(careerGraph, capability.id);
        capabilityScaleSummary[capability.id] = buildCapabilityScaleSummary(careerGraph, capability.id);
    }

    return {
        totalCapabilities: careerGraph.capabilities.length,
        topCapabilities: getTopCapabilitiesForCareer(careerGraph, 5),
        capabilityToEvidenceCount,
        capabilityScaleSummary,
    };
}
