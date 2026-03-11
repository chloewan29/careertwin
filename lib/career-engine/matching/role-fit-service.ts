import { getEvidenceForCapability } from "../capability/capability-graph";
import { expandRolesFromCapabilities } from "../capability/role-expansion";
import type {
    Capability,
    CareerGraph,
    EvidencePiece,
} from "../memory/career-graph-loader";

export type RoleFitResult = {
    targetRole: string;
    fitScore: number;
    matchedCapabilities: Capability[];
    missingCapabilities: string[];
    supportingEvidence: EvidencePiece[];
    fitSummary: string;
};

const CORE_CAPABILITY_CATALOG = [
    "People Leadership",
    "Program Leadership",
    "Enterprise Transformation",
    "Stakeholder Strategy",
    "Commercial Analytics",
    "BI / Data Platform Transformation",
    "Strategic Planning",
    "Change Management",
] as const;

function normalizeText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const value of values) {
        const key = normalizeText(value);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(value.trim());
    }

    return deduped;
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

function normalizeStrength(strength: number | null): number {
    if (typeof strength !== "number" || Number.isNaN(strength)) return 0;
    if (strength <= 0) return 0;
    if (strength <= 1) return strength;
    if (strength <= 100) return strength / 100;
    return 1;
}

function isTargetRolePresent(capabilities: string[], targetRole: string): boolean {
    const normalizedTargetRole = normalizeText(targetRole);
    const expanded = expandRolesFromCapabilities({
        capabilities,
        current_title: null,
    });

    return expanded.some((entry) => normalizeText(entry.role) === normalizedTargetRole);
}

function discoverRoleRequirements(targetRole: string): string[] {
    const required = new Set<string>();
    const catalog = [...CORE_CAPABILITY_CATALOG];

    // Probe single and pair combinations to infer which capabilities unlock a target role.
    for (let i = 0; i < catalog.length; i += 1) {
        const single = [catalog[i]];
        if (isTargetRolePresent(single, targetRole)) {
            required.add(catalog[i]);
        }

        for (let j = i + 1; j < catalog.length; j += 1) {
            const pair = [catalog[i], catalog[j]];
            if (isTargetRolePresent(pair, targetRole)) {
                required.add(catalog[i]);
                required.add(catalog[j]);
            }
        }
    }

    return Array.from(required).sort((a, b) => a.localeCompare(b));
}

function findCapabilityByName(careerGraph: CareerGraph, capabilityName: string): Capability | null {
    const normalizedNeedle = normalizeText(capabilityName);
    return careerGraph.capabilities.find((capability) =>
        normalizeText(capability.name) === normalizedNeedle
        || normalizeText(capability.normalized_name) === normalizedNeedle,
    ) ?? null;
}

function buildFitSummary(input: {
    targetRole: string;
    matchedCount: number;
    totalRequired: number;
    evidenceCount: number;
    missingCapabilities: string[];
    fitScore: number;
}): string {
    if (input.totalRequired === 0) {
        return `No deterministic capability map is available for ${input.targetRole} yet; fit score defaults to ${input.fitScore}.`;
    }

    const missingPart = input.missingCapabilities.length > 0
        ? ` Missing capabilities: ${input.missingCapabilities.join(", ")}.`
        : " No core capability gaps identified.";

    return `Matched ${input.matchedCount}/${input.totalRequired} role capabilities with ${input.evidenceCount} supporting evidence items.${missingPart} Fit score: ${input.fitScore}/100.`;
}

export function getRoleFit(
    careerGraph: CareerGraph,
    targetRole: string,
): RoleFitResult {
    const cleanedTargetRole = targetRole.trim();
    if (!cleanedTargetRole) {
        return {
            targetRole,
            fitScore: 0,
            matchedCapabilities: [],
            missingCapabilities: [],
            supportingEvidence: [],
            fitSummary: "Target role is empty; fit score defaults to 0.",
        };
    }

    const requiredCapabilities = discoverRoleRequirements(cleanedTargetRole);
    const matchedCapabilities = requiredCapabilities
        .map((requiredCapability) => findCapabilityByName(careerGraph, requiredCapability))
        .filter((capability): capability is Capability => capability !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

    const missingCapabilities = requiredCapabilities
        .filter((requiredCapability) =>
            !matchedCapabilities.some((capability) =>
                normalizeText(capability.name) === normalizeText(requiredCapability)
                || normalizeText(capability.normalized_name) === normalizeText(requiredCapability),
            ))
        .sort((a, b) => a.localeCompare(b));

    const supportingEvidence = dedupeById(
        matchedCapabilities
            .flatMap((capability) => getEvidenceForCapability(careerGraph, capability.id)),
    ).sort((a, b) => a.id.localeCompare(b.id));

    const totalRequired = requiredCapabilities.length;
    const matchedCount = matchedCapabilities.length;
    const evidenceCount = supportingEvidence.length;
    const averageStrength = matchedCount > 0
        ? matchedCapabilities.reduce((sum, capability) => sum + normalizeStrength(capability.strength), 0) / matchedCount
        : 0;

    const capabilityCoverage = totalRequired > 0 ? matchedCount / totalRequired : 0;
    const evidenceScore = totalRequired > 0 ? Math.min(1, evidenceCount / totalRequired) : 0;
    const fitScore = Math.max(
        0,
        Math.min(
            100,
            Math.round((capabilityCoverage * 70) + (evidenceScore * 20) + (averageStrength * 10)),
        ),
    );

    return {
        targetRole: cleanedTargetRole,
        fitScore,
        matchedCapabilities,
        missingCapabilities,
        supportingEvidence,
        fitSummary: buildFitSummary({
            targetRole: cleanedTargetRole,
            matchedCount,
            totalRequired,
            evidenceCount,
            missingCapabilities,
            fitScore,
        }),
    };
}

export function getRoleFits(
    careerGraph: CareerGraph,
    targetRoles: string[],
): RoleFitResult[] {
    return dedupeStrings(targetRoles).map((targetRole) => getRoleFit(careerGraph, targetRole));
}

