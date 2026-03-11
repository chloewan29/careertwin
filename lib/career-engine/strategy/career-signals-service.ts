import { getEvidenceForCapability, getTopCapabilitiesForCareer, type RankedCapability } from "../capability/capability-graph";
import { expandRolesFromCapabilities } from "../capability/role-expansion";
import { getRoleFits, type RoleFitResult } from "../matching/role-fit-service";
import type { CareerGraph, EvidencePiece } from "../memory/career-graph-loader";

export type CareerSignals = {
    topCapabilities: RankedCapability[];
    bestFitRoles: RoleFitResult[];
    keyGaps: string[];
    evidenceHighlights: EvidencePiece[];
};

const DEFAULT_TOP_CAPABILITIES_LIMIT = 5;
const DEFAULT_BEST_FIT_ROLES_LIMIT = 5;
const DEFAULT_KEY_GAPS_LIMIT = 8;
const DEFAULT_EVIDENCE_HIGHLIGHTS_LIMIT = 8;

function normalizeText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const value of values) {
        const cleaned = value.trim();
        const key = normalizeText(cleaned);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(cleaned);
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

function resolveTargetRoles(careerGraph: CareerGraph, targetRoles?: string[]): string[] {
    const provided = dedupeStrings(targetRoles ?? []);
    if (provided.length > 0) return provided;

    const capabilityNames = careerGraph.capabilities.map((capability) => capability.name);
    const expanded = expandRolesFromCapabilities({
        capabilities: capabilityNames,
        current_title: null,
    });

    return dedupeStrings(expanded.map((role) => role.role));
}

function compareEvidence(a: EvidencePiece, b: EvidencePiece): number {
    const sortOrderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const sortOrderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;

    if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
    return a.id.localeCompare(b.id);
}

function deriveKeyGaps(bestFitRoles: RoleFitResult[]): string[] {
    const gapCounts = new Map<string, { label: string; count: number }>();

    for (const role of bestFitRoles) {
        for (const gap of role.missingCapabilities) {
            const key = normalizeText(gap);
            if (!key) continue;
            const existing = gapCounts.get(key);
            if (!existing) {
                gapCounts.set(key, { label: gap, count: 1 });
            } else {
                existing.count += 1;
            }
        }
    }

    return Array.from(gapCounts.values())
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.label.localeCompare(b.label);
        })
        .slice(0, DEFAULT_KEY_GAPS_LIMIT)
        .map((entry) => entry.label);
}

function deriveEvidenceHighlights(
    careerGraph: CareerGraph,
    topCapabilities: RankedCapability[],
): EvidencePiece[] {
    const collected: EvidencePiece[] = [];

    for (const ranked of topCapabilities) {
        const evidence = getEvidenceForCapability(careerGraph, ranked.capability.id)
            .sort(compareEvidence);
        collected.push(...evidence);
    }

    return dedupeById(collected).slice(0, DEFAULT_EVIDENCE_HIGHLIGHTS_LIMIT);
}

export function getCareerSignals(
    careerGraph: CareerGraph,
    targetRoles?: string[],
): CareerSignals {
    const topCapabilities = getTopCapabilitiesForCareer(careerGraph, DEFAULT_TOP_CAPABILITIES_LIMIT);
    const resolvedTargetRoles = resolveTargetRoles(careerGraph, targetRoles);

    const bestFitRoles = getRoleFits(careerGraph, resolvedTargetRoles)
        .sort((a, b) => {
            if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
            return a.targetRole.localeCompare(b.targetRole);
        })
        .slice(0, DEFAULT_BEST_FIT_ROLES_LIMIT);

    return {
        topCapabilities,
        bestFitRoles,
        keyGaps: deriveKeyGaps(bestFitRoles),
        evidenceHighlights: deriveEvidenceHighlights(careerGraph, topCapabilities),
    };
}

