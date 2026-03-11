import type {
    Capability,
    CareerGraph,
    EvidencePiece,
} from "../memory/career-graph-loader";

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

function buildCapabilityScaleSummary(careerGraph: CareerGraph, capabilityId: string): {
    dominant_team_scope: string;
    max_team_scope_seen: string;
    dominant_business_scope: string;
    max_business_scope_seen: string;
    dominant_impact_scope: string;
    scale_confidence: "low" | "medium" | "high";
} {
    const evidence = careerGraph.evidenceByCapability[capabilityId] ?? [];
    const teamOrder = ["unknown", "self", "small_team", "squad", "cross_functional", "department", "enterprise"];
    const businessOrder = ["unknown", "local", "portfolio", "business_unit", "enterprise", "external_clients"];
    const impactOrder = ["unknown", "operational", "commercial", "strategic"];

    const teamValues: string[] = [];
    const businessValues: string[] = [];
    const impactValues: string[] = [];

    for (const piece of evidence) {
        const scale = (piece.inferred_scale ?? {}) as Record<string, unknown>;
        const team = typeof scale.team_scope === "string" ? scale.team_scope : "unknown";
        const business = typeof scale.business_scope === "string" ? scale.business_scope : "unknown";
        const impact = typeof scale.impact_scope === "string" ? scale.impact_scope : "unknown";

        if (team !== "unknown") teamValues.push(team);
        if (business !== "unknown") businessValues.push(business);
        if (impact !== "unknown") impactValues.push(impact);
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

    return {
        dominant_team_scope: dominantValue(teamValues),
        max_team_scope_seen: maxTeam,
        dominant_business_scope: dominantValue(businessValues),
        max_business_scope_seen: maxBusiness,
        dominant_impact_scope: dominantValue(impactValues),
        scale_confidence,
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
