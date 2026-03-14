import { getEvidenceForCapability } from "../capability/capability-graph";
import { getCapabilitySummary } from "../capability/capability-graph";
import { expandRolesFromCapabilities } from "../capability/role-expansion";
import {
    compareCapabilityRequirement,
    type CapabilityAttributeConfidence,
    type CapabilityAttributeSignals,
    type MatchLevel,
} from "./capability-requirement-comparator";
import type {
    Capability,
    CareerGraph,
    EvidencePiece,
} from "../memory/career-graph-loader";

export type JobCapabilityRequirement = {
    capability: string;
    org_scope?: "team" | "department" | "cross_functional" | "enterprise" | null;
    stakeholder_scope?: "internal" | "cross_team" | "executive" | "external" | null;
    leadership_scope?: "individual_contribution" | "technical_lead" | "team_lead" | "program_lead" | "org_lead" | null;
    delivery_level?: "task" | "project" | "product" | "program" | "platform" | null;
    impact_scale?: "small" | "medium" | "large" | "enterprise" | null;
    impact_type?: "revenue" | "cost" | "operational" | "strategic" | null;
    extraction_confidence?: CapabilityAttributeConfidence | null;
};

export type CapabilityComparison = {
    capability: string;
    flat_match: boolean;
    match_level: MatchLevel;
    requirement_signals: CapabilityAttributeSignals;
    candidate_signals: CapabilityAttributeSignals | null;
    reasoning: string;
};

export type AttributeAlignmentDiagnostics = {
    strong_match_count: number;
    partial_match_count: number;
    stretch_match_count: number;
    weak_match_count: number;
    missing_count: number;
    compared_capability_count: number;
    structured_signal_coverage: number;
    top_attribute_strengths: string[];
    top_attribute_gaps: string[];
};

export type RoleFitResult = {
    targetRole: string;
    fitScore: number;
    matchedCapabilities: Capability[];
    missingCapabilities: string[];
    supportingEvidence: EvidencePiece[];
    fitSummary: string;
    capabilityComparisons?: CapabilityComparison[];
    attributeAlignmentScore?: number | null;
    attributeAlignmentSummary?: string | null;
    attributeAlignmentDiagnostics?: AttributeAlignmentDiagnostics | null;
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

function pickFirstMatch(text: string, checks: Array<[RegExp, string]>): string | null {
    for (const [pattern, value] of checks) {
        if (pattern.test(text)) return value;
    }
    return null;
}

function inferRequirementSignals(requirementCapability: string, targetRole: string): CapabilityAttributeSignals {
    const text = `${targetRole} ${requirementCapability}`.toLowerCase();

    const org_scope = pickFirstMatch(text, [
        [/\b(cross-functional|cross functional)\b/i, "cross_functional"],
        [/\b(department|business unit|bu)\b/i, "department"],
        [/\b(enterprise|organization|organisation|company[- ]?wide|company)\b/i, "enterprise"],
        [/\bteam\b/i, "team"],
    ]) as JobCapabilityRequirement["org_scope"];

    const stakeholder_scope = pickFirstMatch(text, [
        [/\b(executive|exec|c-suite|c suite)\b/i, "executive"],
        [/\b(cross-team|cross team)\b/i, "cross_team"],
        [/\b(internal)\b/i, "internal"],
        [/\b(external|client|vendor|partner)\b/i, "external"],
    ]) as JobCapabilityRequirement["stakeholder_scope"];

    const leadership_scope = pickFirstMatch(text, [
        [/\b(org[_ -]?lead|head of|director)\b/i, "org_lead"],
        [/\b(program[_ -]?lead|program manager)\b/i, "program_lead"],
        [/\b(team[_ -]?lead|people manager|manager)\b/i, "team_lead"],
        [/\b(technical[_ -]?lead)\b/i, "technical_lead"],
        [/\b(individual[_ -]?contribution|individual contributor|ic)\b/i, "individual_contribution"],
    ]) as JobCapabilityRequirement["leadership_scope"];

    const delivery_level = pickFirstMatch(text, [
        [/\bplatform\b/i, "platform"],
        [/\bprogram\b/i, "program"],
        [/\bproduct\b/i, "product"],
        [/\bproject\b/i, "project"],
        [/\btask\b/i, "task"],
    ]) as JobCapabilityRequirement["delivery_level"];

    const impact_scale = pickFirstMatch(text, [
        [/\b(enterprise|organization|organisation|company[- ]?wide|company)\b/i, "enterprise"],
        [/\blarge\b/i, "large"],
        [/\bmedium\b/i, "medium"],
        [/\bsmall\b/i, "small"],
    ]) as JobCapabilityRequirement["impact_scale"];

    const impact_type = pickFirstMatch(text, [
        [/\brevenue\b/i, "revenue"],
        [/\bcost\b/i, "cost"],
        [/\boperational\b/i, "operational"],
        [/\bstrategic\b/i, "strategic"],
    ]) as JobCapabilityRequirement["impact_type"];

    const extractedSignals = [
        org_scope,
        stakeholder_scope,
        leadership_scope,
        delivery_level,
        impact_scale,
        impact_type,
    ].filter(Boolean).length;

    const extraction_confidence: CapabilityAttributeConfidence | null = extractedSignals >= 3
        ? "high"
        : extractedSignals >= 1
            ? "medium"
            : null;

    return {
        org_scope,
        stakeholder_scope,
        leadership_scope,
        delivery_level,
        impact_scale,
        impact_type,
        extraction_confidence,
    };
}

function discoverRoleRequirementSpecs(targetRole: string): JobCapabilityRequirement[] {
    return discoverRoleRequirements(targetRole).map((capability) => ({
        capability,
        ...inferRequirementSignals(capability, targetRole),
    }));
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

function countStructuredSignals(signals: CapabilityAttributeSignals | null): number {
    if (!signals) return 0;
    let count = 0;
    if (signals.org_scope) count += 1;
    if (signals.stakeholder_scope) count += 1;
    if (signals.leadership_scope) count += 1;
    if (signals.delivery_level) count += 1;
    if (signals.impact_scale) count += 1;
    if (signals.impact_type) count += 1;
    return count;
}

function toReadableLevel(level: MatchLevel): string {
    return level.replace(/_/g, " ");
}

function compactReasoning(reasoning: string): string {
    const first = reasoning.split(";")[0]?.trim() ?? "";
    return first.length > 0 ? first : "alignment details limited";
}

function buildAlignmentDiagnostics(comparisons: CapabilityComparison[]): AttributeAlignmentDiagnostics {
    const diagnostics: AttributeAlignmentDiagnostics = {
        strong_match_count: 0,
        partial_match_count: 0,
        stretch_match_count: 0,
        weak_match_count: 0,
        missing_count: 0,
        compared_capability_count: comparisons.length,
        structured_signal_coverage: 0,
        top_attribute_strengths: [],
        top_attribute_gaps: [],
    };

    let structuredComparableCount = 0;
    const strengths: string[] = [];
    const gaps: string[] = [];

    for (const comparison of comparisons) {
        if (comparison.match_level === "strong_match") diagnostics.strong_match_count += 1;
        else if (comparison.match_level === "partial_match") diagnostics.partial_match_count += 1;
        else if (comparison.match_level === "stretch_match") diagnostics.stretch_match_count += 1;
        else if (comparison.match_level === "weak_match") diagnostics.weak_match_count += 1;
        else diagnostics.missing_count += 1;

        const reqStructured = countStructuredSignals(comparison.requirement_signals);
        const candStructured = countStructuredSignals(comparison.candidate_signals);
        if (reqStructured > 0 && candStructured > 0) {
            structuredComparableCount += 1;
        }

        if (comparison.match_level === "strong_match" || comparison.match_level === "partial_match") {
            strengths.push(`${comparison.capability}: ${toReadableLevel(comparison.match_level)} (${compactReasoning(comparison.reasoning)})`);
        }
        if (comparison.match_level === "stretch_match" || comparison.match_level === "weak_match" || comparison.match_level === "missing") {
            gaps.push(`${comparison.capability}: ${toReadableLevel(comparison.match_level)} (${compactReasoning(comparison.reasoning)})`);
        }
    }

    diagnostics.structured_signal_coverage = diagnostics.compared_capability_count > 0
        ? Math.round((structuredComparableCount / diagnostics.compared_capability_count) * 100)
        : 0;
    diagnostics.top_attribute_strengths = strengths.slice(0, 3);
    diagnostics.top_attribute_gaps = gaps.slice(0, 3);

    return diagnostics;
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
    const requiredSpecs = discoverRoleRequirementSpecs(cleanedTargetRole);
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

    const capabilitySummary = getCapabilitySummary(careerGraph);
    const capabilityComparisons: CapabilityComparison[] = requiredSpecs
        .map((requirement) => {
            const matchedCapability = findCapabilityByName(careerGraph, requirement.capability);
            const candidateSummary = matchedCapability
                ? capabilitySummary.capabilityScaleSummary[matchedCapability.id]
                : null;

            const candidateSignals: CapabilityAttributeSignals | null = candidateSummary
                ? {
                    org_scope: candidateSummary.max_scope_seen ?? candidateSummary.dominant_scope ?? null,
                    stakeholder_scope: candidateSummary.stakeholder_span ?? null,
                    leadership_scope: candidateSummary.leadership_span ?? null,
                    delivery_level: candidateSummary.dominant_delivery_level ?? null,
                    impact_scale: candidateSummary.impact_scale_max ?? null,
                    impact_type: candidateSummary.dominant_impact_type ?? null,
                    extraction_confidence: candidateSummary.aggregation_confidence ?? null,
                }
                : null;

            const compared = compareCapabilityRequirement({
                flat_match: Boolean(matchedCapability),
                requirement_signals: {
                    org_scope: requirement.org_scope ?? null,
                    stakeholder_scope: requirement.stakeholder_scope ?? null,
                    leadership_scope: requirement.leadership_scope ?? null,
                    delivery_level: requirement.delivery_level ?? null,
                    impact_scale: requirement.impact_scale ?? null,
                    impact_type: requirement.impact_type ?? null,
                    extraction_confidence: requirement.extraction_confidence ?? null,
                },
                candidate_signals: candidateSignals,
            });

            return {
                capability: requirement.capability,
                ...compared,
            };
        })
        .sort((a, b) => a.capability.localeCompare(b.capability));

    const weightedLevels = capabilityComparisons.map((comparison) => {
        switch (comparison.match_level) {
        case "strong_match":
            return 1;
        case "partial_match":
            return 0.75;
        case "stretch_match":
            return 0.45;
        case "weak_match":
            return 0.2;
        case "missing":
        default:
            return 0;
        }
    });
    let weightedLevelTotal = 0;
    for (const value of weightedLevels) {
        weightedLevelTotal += value;
    }
    const attributeAlignmentScore = weightedLevels.length > 0
        ? Math.round((weightedLevelTotal / weightedLevels.length) * 100)
        : null;
    const comparedCount = capabilityComparisons.filter((comparison) => comparison.flat_match).length;
    const attributeAlignmentSummary = capabilityComparisons.length > 0
        ? `Attribute-aware comparisons generated for ${comparedCount}/${capabilityComparisons.length} required capabilities.`
        : null;
    const attributeAlignmentDiagnostics = capabilityComparisons.length > 0
        ? buildAlignmentDiagnostics(capabilityComparisons)
        : null;

    return {
        targetRole: cleanedTargetRole,
        fitScore,
        matchedCapabilities,
        missingCapabilities,
        supportingEvidence,
        capabilityComparisons,
        attributeAlignmentScore,
        attributeAlignmentSummary,
        attributeAlignmentDiagnostics,
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
