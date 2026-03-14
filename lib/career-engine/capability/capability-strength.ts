import { createServerSupabaseClient } from "@/lib/db/supabase/server";

const CURRENT_YEAR = new Date().getUTCFullYear();

export const CAPABILITY_STRENGTH_WEIGHTS = {
    ownership: {
        owner: 1.25,
        lead: 1.2,
        driver: 1.1,
        contributor: 0.9,
        unknown: 0.85,
    },
    scope: {
        enterprise: 1.25,
        market: 1.2,
        function: 1.15,
        team: 1.0,
        project: 0.92,
        task: 0.85,
        unknown: 0.85,
    },
    impact: {
        revenue: 1.2,
        strategic: 1.15,
        cost: 1.1,
        operational: 1.0,
        unknown: 0.9,
    },
    recency: {
        very_recent: 1.0,
        recent: 0.96,
        established: 0.9,
        mature: 0.82,
        older: 0.75,
        unknown: 0.88,
    },
    diminishingSignalDecay: 0.15,
    normalizationScale: 6,
} as const;

type CapabilityRow = {
    id: string;
    career_id: string;
    name: string;
    canonical_name: string | null;
    display_name: string | null;
    confidence_score: number | null;
    confidence: number | null;
};

type CapabilitySignalLinkRow = {
    capability_id: string;
    evidence_signal_id: string;
    contribution_weight: number | null;
};

type EvidenceSignalRow = {
    id: string;
    evidence_piece_id: string;
    action: string | null;
    domain: string | null;
    initiative_type: string | null;
    scope_level: string | null;
    ownership_level: string | null;
    stakeholder_scope: unknown;
    tool_signals: unknown;
    impact_signal: string | null;
    confidence_score: number | null;
};

type EvidencePieceRow = {
    id: string;
    experience_id: string;
    raw_text: string;
};

type ExperienceRow = {
    id: string;
    date_range: string | null;
    sort_order: number | null;
};

export type CapabilityStrengthSupportingSignal = {
    evidence_signal_id: string;
    evidence_piece_id: string;
    contribution_score: number;
    raw_signal_strength: number;
    action: string | null;
    scope_level: string | null;
    ownership_level: string | null;
    impact_signal: string | null;
    confidence_score: number | null;
    link_contribution_weight: number | null;
    evidence_raw_text: string;
};

export type CapabilityStrengthProfileItem = {
    capability_id: string;
    canonical_name: string;
    display_name: string;
    strength_score: number;
    weighted_signal_score: number;
    signal_count: number;
    top_supporting_signals: CapabilityStrengthSupportingSignal[];
};

type CapabilityStrengthOptions = {
    topSignalsLimit?: number;
};

type TargetedCalibrationCapability = {
    canonical_name: "analytics automation" | "bi / data platform transformation" | "cross-functional stakeholder leadership";
    display_name: string;
    uplift_factor: number;
    latent_blend_factor: number;
    selector: (signal: EvidenceSignalRow) => boolean;
};

const TARGETED_CALIBRATION_CAPABILITIES: TargetedCalibrationCapability[] = [
    {
        canonical_name: "analytics automation",
        display_name: "Analytics Automation",
        uplift_factor: 1.2,
        latent_blend_factor: 0.85,
        selector: (signal) => {
            const initiative = (signal.initiative_type ?? "").toLowerCase();
            const action = (signal.action ?? "").toLowerCase();
            const tools = toStringArray(signal.tool_signals).map((tool) => tool.toLowerCase());
            const domain = (signal.domain ?? "").toLowerCase();
            const hasAutomationIntent = initiative === "automation"
                || /\b(automate|automation|workflow|pipeline|ai-powered|llm)\b/i.test(action);
            const hasAnalyticsTooling = tools.some((tool) => [
                "python", "sql", "bigquery", "power bi", "llm", "ai", "machine learning", "data pipeline",
            ].includes(tool))
                || /\b(analytics|engineering)\b/i.test(domain);
            return hasAutomationIntent && hasAnalyticsTooling;
        },
    },
    {
        canonical_name: "bi / data platform transformation",
        display_name: "BI / Data Platform Transformation",
        uplift_factor: 1.15,
        latent_blend_factor: 0.65,
        selector: (signal) => {
            const initiative = (signal.initiative_type ?? "").toLowerCase();
            const action = (signal.action ?? "").toLowerCase();
            const tools = toStringArray(signal.tool_signals).map((tool) => tool.toLowerCase());
            return (
                initiative === "transformation"
                || initiative === "capability_uplift"
                || /\b(transform|moderni[sz]e|migrat|deploy|implemented)\b/i.test(action)
            )
                && tools.some((tool) => [
                    "power bi", "tableau", "looker", "sql", "bigquery", "dbt", "snowflake",
                ].includes(tool));
        },
    },
    {
        canonical_name: "cross-functional stakeholder leadership",
        display_name: "Cross-Functional Stakeholder Leadership",
        uplift_factor: 1.12,
        latent_blend_factor: 0.6,
        selector: (signal) => {
            const stakeholders = toStringArray(signal.stakeholder_scope).map((value) => value.toLowerCase());
            const action = (signal.action ?? "").toLowerCase();
            const ownership = (signal.ownership_level ?? "").toLowerCase();
            const hasCrossFunctionalStakeholders = stakeholders.includes("cross_functional")
                || stakeholders.includes("executive");
            const hasLeadershipVerb = /\b(led|drove|aligned|coordinated|managed)\b/i.test(action);
            const hasLeadershipOwnership = ownership === "lead" || ownership === "driver" || ownership === "owner";
            return hasCrossFunctionalStakeholders && (hasLeadershipVerb || hasLeadershipOwnership);
        },
    },
];

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}

function confidenceModifier(
    signalConfidence: number | null,
    linkContribution: number | null,
    capabilityConfidence: number | null,
): number {
    const values = [signalConfidence, linkContribution, capabilityConfidence]
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        .map((value) => clamp(value));

    if (values.length === 0) return 1;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    // Secondary modifier only (0.9..1.1)
    return 0.9 + (avg * 0.2);
}

function parseExperienceEndYear(dateRange: string | null): number | null {
    if (!dateRange) return null;
    const lowered = dateRange.toLowerCase();
    if (/\b(present|current|now|ongoing)\b/.test(lowered)) return CURRENT_YEAR;

    const yearMatches = dateRange.match(/\b(19|20)\d{2}\b/g);
    if (!yearMatches || yearMatches.length === 0) return null;
    const parsed = yearMatches
        .map((year) => Number.parseInt(year, 10))
        .filter((year) => Number.isFinite(year) && year >= 1900 && year <= CURRENT_YEAR + 1);
    if (parsed.length === 0) return null;
    return parsed[parsed.length - 1];
}

function recencyWeightFromEndYear(endYear: number | null): number {
    if (!endYear) return CAPABILITY_STRENGTH_WEIGHTS.recency.unknown;
    const yearsSince = CURRENT_YEAR - endYear;
    if (yearsSince <= 1) return CAPABILITY_STRENGTH_WEIGHTS.recency.very_recent;
    if (yearsSince <= 3) return CAPABILITY_STRENGTH_WEIGHTS.recency.recent;
    if (yearsSince <= 6) return CAPABILITY_STRENGTH_WEIGHTS.recency.established;
    if (yearsSince <= 10) return CAPABILITY_STRENGTH_WEIGHTS.recency.mature;
    return CAPABILITY_STRENGTH_WEIGHTS.recency.older;
}

function ownershipWeight(value: string | null): number {
    const key = (value ?? "unknown").toLowerCase() as keyof typeof CAPABILITY_STRENGTH_WEIGHTS.ownership;
    return CAPABILITY_STRENGTH_WEIGHTS.ownership[key] ?? CAPABILITY_STRENGTH_WEIGHTS.ownership.unknown;
}

function scopeWeight(value: string | null): number {
    const key = (value ?? "unknown").toLowerCase() as keyof typeof CAPABILITY_STRENGTH_WEIGHTS.scope;
    return CAPABILITY_STRENGTH_WEIGHTS.scope[key] ?? CAPABILITY_STRENGTH_WEIGHTS.scope.unknown;
}

function impactWeight(value: string | null): number {
    const key = (value ?? "unknown").toLowerCase() as keyof typeof CAPABILITY_STRENGTH_WEIGHTS.impact;
    return CAPABILITY_STRENGTH_WEIGHTS.impact[key] ?? CAPABILITY_STRENGTH_WEIGHTS.impact.unknown;
}

function normalizeStrengthScore(weightedSignalScore: number): number {
    // Stable 0-1 transform with diminishing gains at higher support.
    const scale = CAPABILITY_STRENGTH_WEIGHTS.normalizationScale;
    const normalized = 1 - Math.exp(-(weightedSignalScore / scale));
    return clamp(normalized);
}

function computeRawSignalStrength(input: {
    signal: EvidenceSignalRow;
    experienceDateRange: string | null;
    capabilityConfidence: number | null;
    linkContributionWeight: number | null;
}): number {
    const ownWeight = ownershipWeight(input.signal.ownership_level);
    const scWeight = scopeWeight(input.signal.scope_level);
    const impWeight = impactWeight(input.signal.impact_signal);
    const recWeight = recencyWeightFromEndYear(parseExperienceEndYear(input.experienceDateRange));
    const confModifier = confidenceModifier(
        input.signal.confidence_score,
        input.linkContributionWeight,
        input.capabilityConfidence,
    );
    return 1 * ownWeight * scWeight * impWeight * recWeight * confModifier;
}

export async function getCapabilityStrengthProfile(
    careerId: string,
    options: CapabilityStrengthOptions = {},
): Promise<CapabilityStrengthProfileItem[]> {
    const topSignalsLimit = Math.max(1, options.topSignalsLimit ?? 3);
    if (!careerId || careerId.trim().length === 0) {
        throw new Error("careerId is required");
    }

    const supabase = createServerSupabaseClient();

    const { data: capabilitiesRaw, error: capabilitiesError } = await supabase
        .from("capabilities")
        .select("id, career_id, name, canonical_name, display_name, confidence_score, confidence")
        .eq("career_id", careerId);
    if (capabilitiesError) {
        throw new Error(`Failed to load capabilities for strength model: ${capabilitiesError.message}`);
    }

    const capabilities = (capabilitiesRaw ?? []) as CapabilityRow[];
    if (capabilities.length === 0) return [];

    const capabilityIds = capabilities.map((capability) => capability.id);
    const { data: linksRaw, error: linksError } = await supabase
        .from("capability_signal_links")
        .select("capability_id, evidence_signal_id, contribution_weight")
        .in("capability_id", capabilityIds);
    if (linksError) {
        throw new Error(`Failed to load capability_signal_links for strength model: ${linksError.message}`);
    }
    const links = (linksRaw ?? []) as CapabilitySignalLinkRow[];

    const signalIds = Array.from(new Set(links.map((link) => link.evidence_signal_id)));
    const linkedSignalsResponse = signalIds.length > 0
        ? await supabase
            .from("evidence_signals")
            .select("id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, impact_signal, confidence_score")
            .in("id", signalIds)
        : { data: [], error: null };

    if (linkedSignalsResponse.error) {
        throw new Error(`Failed to load evidence_signals for strength model: ${linkedSignalsResponse.error.message}`);
    }
    const linkedEvidenceSignals = (linkedSignalsResponse.data ?? []) as EvidenceSignalRow[];
    const allSignalsResponse = await supabase
        .from("evidence_signals")
        .select("id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, impact_signal, confidence_score")
        .eq("career_id", careerId);
    if (allSignalsResponse.error) {
        throw new Error(`Failed to load career evidence_signals for strength calibration: ${allSignalsResponse.error.message}`);
    }
    const allEvidenceSignals = (allSignalsResponse.data ?? []) as EvidenceSignalRow[];
    const linkedSignalIdSet = new Set(linkedEvidenceSignals.map((signal) => signal.id));
    const signalById = new Map<string, EvidenceSignalRow>(
        allEvidenceSignals.map((signal) => [signal.id, signal]),
    );

    const evidencePieceIds = Array.from(new Set(
        allEvidenceSignals.map((signal) => signal.evidence_piece_id),
    ));
    const pieces = evidencePieceIds.length > 0
        ? await supabase
            .from("evidence_pieces")
            .select("id, experience_id, raw_text")
            .in("id", evidencePieceIds)
        : { data: [], error: null };
    if (pieces.error) {
        throw new Error(`Failed to load evidence_pieces for strength model: ${pieces.error.message}`);
    }
    const evidencePieces = (pieces.data ?? []) as EvidencePieceRow[];
    const pieceById = new Map<string, EvidencePieceRow>(
        evidencePieces.map((piece) => [piece.id, piece]),
    );

    const experienceIds = Array.from(new Set(
        evidencePieces.map((piece) => piece.experience_id).filter(Boolean),
    ));
    const experiences = experienceIds.length > 0
        ? await supabase
            .from("experiences")
            .select("id, date_range, sort_order")
            .in("id", experienceIds)
        : { data: [], error: null };
    if (experiences.error) {
        throw new Error(`Failed to load experiences for strength model: ${experiences.error.message}`);
    }
    const experienceRows = (experiences.data ?? []) as ExperienceRow[];
    const experienceById = new Map<string, ExperienceRow>(
        experienceRows.map((experience) => [experience.id, experience]),
    );

    const linksByCapability = new Map<string, CapabilitySignalLinkRow[]>();
    for (const link of links) {
        const bucket = linksByCapability.get(link.capability_id) ?? [];
        bucket.push(link);
        linksByCapability.set(link.capability_id, bucket);
    }

    const profile: CapabilityStrengthProfileItem[] = [];
    for (const capability of capabilities) {
        const capabilityLinks = linksByCapability.get(capability.id) ?? [];
        const scoredSignals: CapabilityStrengthSupportingSignal[] = [];

        for (const link of capabilityLinks) {
            const signal = signalById.get(link.evidence_signal_id);
            if (!signal) continue;
            const evidencePiece = pieceById.get(signal.evidence_piece_id);
            const experience = evidencePiece ? experienceById.get(evidencePiece.experience_id) : undefined;
            const rawStrength = computeRawSignalStrength({
                signal,
                experienceDateRange: experience?.date_range ?? null,
                capabilityConfidence: capability.confidence_score ?? capability.confidence ?? null,
                linkContributionWeight: link.contribution_weight,
            });

            scoredSignals.push({
                evidence_signal_id: signal.id,
                evidence_piece_id: signal.evidence_piece_id,
                contribution_score: rawStrength,
                raw_signal_strength: rawStrength,
                action: signal.action,
                scope_level: signal.scope_level,
                ownership_level: signal.ownership_level,
                impact_signal: signal.impact_signal,
                confidence_score: signal.confidence_score,
                link_contribution_weight: link.contribution_weight,
                evidence_raw_text: evidencePiece?.raw_text ?? "",
            });
        }

        const sortedByStrength = scoredSignals
            .slice()
            .sort((a, b) => b.raw_signal_strength - a.raw_signal_strength);

        const weightedSignalScore = sortedByStrength.reduce((sum, signal, index) => {
            const attenuation = 1 / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index));
            const attenuated = signal.raw_signal_strength * attenuation;
            signal.contribution_score = attenuated;
            return sum + attenuated;
        }, 0);

        let adjustedWeightedSignalScore = weightedSignalScore;
        // v1.1 targeted uplift for rare, high-value platform/automation/leadership evidence.
        const canonicalName = (capability.canonical_name ?? capability.name).toLowerCase().trim();
        const calibrationConfig = TARGETED_CALIBRATION_CAPABILITIES.find(
            (entry) => entry.canonical_name === canonicalName,
        );
        if (calibrationConfig && sortedByStrength.length > 0) {
            const topStrength = sortedByStrength[0].raw_signal_strength;
            const sparseHighValue = sortedByStrength.length <= 2 && topStrength >= 1.15;
            if (sparseHighValue) {
                adjustedWeightedSignalScore *= calibrationConfig.uplift_factor;
            }
        }

        const strengthScore = normalizeStrengthScore(adjustedWeightedSignalScore);
        profile.push({
            capability_id: capability.id,
            canonical_name: canonicalName,
            display_name: capability.display_name ?? capability.name,
            strength_score: round(strengthScore, 4),
            weighted_signal_score: round(adjustedWeightedSignalScore, 4),
            signal_count: sortedByStrength.length,
            top_supporting_signals: sortedByStrength
                .slice(0, topSignalsLimit)
                .map((signal) => ({
                    ...signal,
                    contribution_score: round(signal.contribution_score, 4),
                    raw_signal_strength: round(signal.raw_signal_strength, 4),
                })),
        });
    }

    const existingByCanonical = new Map(profile.map((item) => [item.canonical_name.toLowerCase(), item]));
    for (const calibration of TARGETED_CALIBRATION_CAPABILITIES) {
        const matchedSignals = allEvidenceSignals.filter((signal) => calibration.selector(signal));
        if (matchedSignals.length === 0) continue;

        const scored = matchedSignals
            .map((signal) => {
                const piece = pieceById.get(signal.evidence_piece_id);
                const experience = piece ? experienceById.get(piece.experience_id) : undefined;
                const rawStrength = computeRawSignalStrength({
                    signal,
                    experienceDateRange: experience?.date_range ?? null,
                    capabilityConfidence: null,
                    linkContributionWeight: null,
                });
                return {
                    signal,
                    rawStrength,
                    evidence_raw_text: piece?.raw_text ?? "",
                };
            })
            .sort((a, b) => b.rawStrength - a.rawStrength);
        const latentScore = scored.reduce((sum, item, index) => {
            const attenuation = 1 / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index));
            return sum + (item.rawStrength * attenuation);
        }, 0);

        const existing = existingByCanonical.get(calibration.canonical_name);
        if (existing) {
            const unlinkedLatentScore = scored
                .filter((item) => !linkedSignalIdSet.has(item.signal.id))
                .reduce((sum, item, index) => {
                    const attenuation = 1 / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index));
                    return sum + (item.rawStrength * attenuation);
                }, 0);
            const blendedScore = existing.weighted_signal_score + (unlinkedLatentScore * calibration.latent_blend_factor * 0.35);
            existing.weighted_signal_score = round(blendedScore, 4);
            existing.strength_score = round(normalizeStrengthScore(blendedScore), 4);
            if (existing.top_supporting_signals.length < topSignalsLimit) {
                const topLatentSignals = scored.slice(0, topSignalsLimit - existing.top_supporting_signals.length);
                for (const item of topLatentSignals) {
                    if (existing.top_supporting_signals.some((signal) => signal.evidence_signal_id === item.signal.id)) continue;
                    existing.top_supporting_signals.push({
                        evidence_signal_id: item.signal.id,
                        evidence_piece_id: item.signal.evidence_piece_id,
                        contribution_score: round(item.rawStrength, 4),
                        raw_signal_strength: round(item.rawStrength, 4),
                        action: item.signal.action,
                        scope_level: item.signal.scope_level,
                        ownership_level: item.signal.ownership_level,
                        impact_signal: item.signal.impact_signal,
                        confidence_score: item.signal.confidence_score,
                        link_contribution_weight: null,
                        evidence_raw_text: item.evidence_raw_text,
                    });
                }
            }
            continue;
        }

        // Backfill missing targeted capability when strong latent support exists.
        if (latentScore < 1.0) continue;
        const weightedSignalScore = latentScore * calibration.latent_blend_factor;
        const backfilledTopSignals = scored.slice(0, topSignalsLimit).map((item) => ({
            evidence_signal_id: item.signal.id,
            evidence_piece_id: item.signal.evidence_piece_id,
            contribution_score: round(item.rawStrength, 4),
            raw_signal_strength: round(item.rawStrength, 4),
            action: item.signal.action,
            scope_level: item.signal.scope_level,
            ownership_level: item.signal.ownership_level,
            impact_signal: item.signal.impact_signal,
            confidence_score: item.signal.confidence_score,
            link_contribution_weight: null,
            evidence_raw_text: item.evidence_raw_text,
        }));
        const backfilled: CapabilityStrengthProfileItem = {
            capability_id: `inferred:${careerId}:${calibration.canonical_name}`,
            canonical_name: calibration.canonical_name,
            display_name: calibration.display_name,
            strength_score: round(normalizeStrengthScore(weightedSignalScore), 4),
            weighted_signal_score: round(weightedSignalScore, 4),
            signal_count: scored.length,
            top_supporting_signals: backfilledTopSignals,
        };
        profile.push(backfilled);
        existingByCanonical.set(calibration.canonical_name, backfilled);
    }

    return profile
        .sort((a, b) => {
            if (b.strength_score !== a.strength_score) return b.strength_score - a.strength_score;
            if (b.weighted_signal_score !== a.weighted_signal_score) return b.weighted_signal_score - a.weighted_signal_score;
            return b.signal_count - a.signal_count;
        });
}
