export const CAPABILITY_STRENGTH_WEIGHTS = {
    ownership: { owner: 1.25, lead: 1.2, driver: 1.1, contributor: 0.9, unknown: 0.85 },
    scope: { enterprise: 1.25, market: 1.2, function: 1.15, team: 1.0, project: 0.92, task: 0.85, unknown: 0.85 },
    impact: { revenue: 1.2, strategic: 1.15, cost: 1.1, operational: 1.0, unknown: 0.9 },
    recency: { very_recent: 1.0, recent: 0.96, established: 0.9, mature: 0.82, older: 0.75, unknown: 0.88 },
    diminishingSignalDecay: 0.15,
    normalizationScale: 6,
} as const;

export type CandidateBaselineCapabilityInput = { id: string; career_id: string; name: string; canonical_name: string | null; display_name: string | null; confidence_score: number | null; confidence: number | null };
export type CandidateBaselineCapabilitySignalLinkInput = { capability_id: string; evidence_signal_id: string; contribution_weight: number | null };
export type CandidateBaselineEvidenceSignalInput = { id: string; evidence_piece_id: string; action: string | null; domain: string | null; initiative_type: string | null; scope_level: string | null; ownership_level: string | null; stakeholder_scope: unknown; tool_signals: unknown; impact_signal: string | null; confidence_score: number | null };
export type CandidateBaselineEvidencePieceInput = { id: string; experience_id: string; raw_text: string };
export type CandidateBaselineExperienceInput = { id: string; date_range: string | null; sort_order: number | null };

export type CapabilityStrengthSupportingSignal = {
    evidence_signal_id: string; evidence_piece_id: string; contribution_score: number; raw_signal_strength: number;
    action: string | null; scope_level: string | null; ownership_level: string | null; impact_signal: string | null;
    confidence_score: number | null; link_contribution_weight: number | null; evidence_raw_text: string;
};
export type CapabilityStrengthProfileItem = {
    capability_id: string; canonical_name: string; display_name: string; strength_score: number;
    weighted_signal_score: number; signal_count: number; top_supporting_signals: CapabilityStrengthSupportingSignal[];
};
export type CandidateCapabilityBaselineInput = {
    careerId: string;
    currentYear: number;
    topSignalsLimit?: number;
    capabilities: readonly CandidateBaselineCapabilityInput[];
    capabilitySignalLinks: readonly CandidateBaselineCapabilitySignalLinkInput[];
    evidenceSignals: readonly CandidateBaselineEvidenceSignalInput[];
    evidencePieces: readonly CandidateBaselineEvidencePieceInput[];
    experiences: readonly CandidateBaselineExperienceInput[];
};

type TargetedCalibrationCapability = {
    canonical_name: "analytics automation" | "bi / data platform transformation" | "cross-functional stakeholder leadership";
    display_name: string; uplift_factor: number; latent_blend_factor: number;
    selector: (signal: CandidateBaselineEvidenceSignalInput) => boolean;
};
const toStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const TARGETED_CALIBRATION_CAPABILITIES: TargetedCalibrationCapability[] = [
    { canonical_name: "analytics automation", display_name: "Analytics Automation", uplift_factor: 1.2, latent_blend_factor: 0.85, selector: (signal) => {
        const initiative = (signal.initiative_type ?? "").toLowerCase(); const action = (signal.action ?? "").toLowerCase();
        const tools = toStringArray(signal.tool_signals).map((tool) => tool.toLowerCase()); const domain = (signal.domain ?? "").toLowerCase();
        return (initiative === "automation" || /\b(automate|automation|workflow|pipeline|ai-powered|llm)\b/i.test(action))
            && (tools.some((tool) => ["python", "sql", "bigquery", "power bi", "llm", "ai", "machine learning", "data pipeline"].includes(tool)) || /\b(analytics|engineering)\b/i.test(domain));
    } },
    { canonical_name: "bi / data platform transformation", display_name: "BI / Data Platform Transformation", uplift_factor: 1.15, latent_blend_factor: 0.65, selector: (signal) => {
        const initiative = (signal.initiative_type ?? "").toLowerCase(); const action = (signal.action ?? "").toLowerCase();
        const tools = toStringArray(signal.tool_signals).map((tool) => tool.toLowerCase());
        return (initiative === "transformation" || initiative === "capability_uplift" || /\b(transform|moderni[sz]e|migrat|deploy|implemented)\b/i.test(action))
            && tools.some((tool) => ["power bi", "tableau", "looker", "sql", "bigquery", "dbt", "snowflake"].includes(tool));
    } },
    { canonical_name: "cross-functional stakeholder leadership", display_name: "Cross-Functional Stakeholder Leadership", uplift_factor: 1.12, latent_blend_factor: 0.6, selector: (signal) => {
        const stakeholders = toStringArray(signal.stakeholder_scope).map((value) => value.toLowerCase()); const action = (signal.action ?? "").toLowerCase(); const ownership = (signal.ownership_level ?? "").toLowerCase();
        return (stakeholders.includes("cross_functional") || stakeholders.includes("executive"))
            && (/\b(led|drove|aligned|coordinated|managed)\b/i.test(action) || ownership === "lead" || ownership === "driver" || ownership === "owner");
    } },
];

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const round = (value: number, digits = 4) => Math.round(value * (10 ** digits)) / (10 ** digits);
function confidenceModifier(signalConfidence: number | null, linkContribution: number | null, capabilityConfidence: number | null): number {
    const values = [signalConfidence, linkContribution, capabilityConfidence].filter((value): value is number => typeof value === "number" && Number.isFinite(value)).map((value) => clamp(value));
    return values.length === 0 ? 1 : 0.9 + ((values.reduce((sum, value) => sum + value, 0) / values.length) * 0.2);
}
function parseExperienceEndYear(dateRange: string | null, currentYear: number): number | null {
    if (!dateRange) return null; if (/\b(present|current|now|ongoing)\b/.test(dateRange.toLowerCase())) return currentYear;
    const parsed = (dateRange.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number).filter((year) => Number.isFinite(year) && year >= 1900 && year <= currentYear + 1);
    return parsed.length ? parsed[parsed.length - 1] : null;
}
function recencyWeight(endYear: number | null, currentYear: number): number {
    if (!endYear) return CAPABILITY_STRENGTH_WEIGHTS.recency.unknown; const yearsSince = currentYear - endYear;
    if (yearsSince <= 1) return CAPABILITY_STRENGTH_WEIGHTS.recency.very_recent; if (yearsSince <= 3) return CAPABILITY_STRENGTH_WEIGHTS.recency.recent;
    if (yearsSince <= 6) return CAPABILITY_STRENGTH_WEIGHTS.recency.established; if (yearsSince <= 10) return CAPABILITY_STRENGTH_WEIGHTS.recency.mature;
    return CAPABILITY_STRENGTH_WEIGHTS.recency.older;
}
const factor = <T extends Record<string, number>>(table: T, value: string | null) => table[(value ?? "unknown").toLowerCase() as keyof T] ?? table.unknown;
const normalizeStrengthScore = (weighted: number) => clamp(1 - Math.exp(-(weighted / CAPABILITY_STRENGTH_WEIGHTS.normalizationScale)));
function rawSignalStrength(signal: CandidateBaselineEvidenceSignalInput, dateRange: string | null, capabilityConfidence: number | null, linkWeight: number | null, currentYear: number) {
    return factor(CAPABILITY_STRENGTH_WEIGHTS.ownership, signal.ownership_level) * factor(CAPABILITY_STRENGTH_WEIGHTS.scope, signal.scope_level)
        * factor(CAPABILITY_STRENGTH_WEIGHTS.impact, signal.impact_signal) * recencyWeight(parseExperienceEndYear(dateRange, currentYear), currentYear)
        * confidenceModifier(signal.confidence_score, linkWeight, capabilityConfidence);
}
const freezeSignal = (signal: CapabilityStrengthSupportingSignal) => Object.freeze(signal) as CapabilityStrengthSupportingSignal;
const freezeItem = (item: CapabilityStrengthProfileItem) => Object.freeze({ ...item, top_supporting_signals: Object.freeze(item.top_supporting_signals.map(freezeSignal)) }) as unknown as CapabilityStrengthProfileItem;

export function buildCandidateCapabilityBaseline(input: CandidateCapabilityBaselineInput): CapabilityStrengthProfileItem[] {
    const topSignalsLimit = Math.max(1, input.topSignalsLimit ?? 3);
    const signalsById = new Map(input.evidenceSignals.map((item) => [item.id, item]));
    const piecesById = new Map(input.evidencePieces.map((item) => [item.id, item]));
    const experiencesById = new Map(input.experiences.map((item) => [item.id, item]));
    const linkedSignalIds = new Set(input.capabilitySignalLinks.map((item) => item.evidence_signal_id).filter((id) => signalsById.has(id)));
    const linksByCapability = new Map<string, CandidateBaselineCapabilitySignalLinkInput[]>();
    input.capabilitySignalLinks.forEach((link) => linksByCapability.set(link.capability_id, [...(linksByCapability.get(link.capability_id) ?? []), link]));
    const profile: CapabilityStrengthProfileItem[] = input.capabilities.map((capability) => {
        const scored = (linksByCapability.get(capability.id) ?? []).flatMap((link) => {
            const signal = signalsById.get(link.evidence_signal_id); if (!signal) return [];
            const piece = piecesById.get(signal.evidence_piece_id); const experience = piece ? experiencesById.get(piece.experience_id) : undefined;
            const raw = rawSignalStrength(signal, experience?.date_range ?? null, capability.confidence_score ?? capability.confidence ?? null, link.contribution_weight, input.currentYear);
            return [{ evidence_signal_id: signal.id, evidence_piece_id: signal.evidence_piece_id, contribution_score: raw, raw_signal_strength: raw, action: signal.action, scope_level: signal.scope_level, ownership_level: signal.ownership_level, impact_signal: signal.impact_signal, confidence_score: signal.confidence_score, link_contribution_weight: link.contribution_weight, evidence_raw_text: piece?.raw_text ?? "" }];
        }).sort((a, b) => b.raw_signal_strength - a.raw_signal_strength);
        const weighted = scored.reduce((sum, signal, index) => { signal.contribution_score = signal.raw_signal_strength / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index)); return sum + signal.contribution_score; }, 0);
        const canonicalName = (capability.canonical_name ?? capability.name).toLowerCase().trim(); const calibration = TARGETED_CALIBRATION_CAPABILITIES.find((item) => item.canonical_name === canonicalName);
        const adjusted = calibration && scored.length > 0 && scored.length <= 2 && scored[0].raw_signal_strength >= 1.15 ? weighted * calibration.uplift_factor : weighted;
        return { capability_id: capability.id, canonical_name: canonicalName, display_name: capability.display_name ?? capability.name, strength_score: round(normalizeStrengthScore(adjusted), 4), weighted_signal_score: round(adjusted, 4), signal_count: scored.length, top_supporting_signals: scored.slice(0, topSignalsLimit).map((signal) => ({ ...signal, contribution_score: round(signal.contribution_score, 4), raw_signal_strength: round(signal.raw_signal_strength, 4) })) };
    });
    const existingByCanonical = new Map(profile.map((item) => [item.canonical_name.toLowerCase(), item]));
    for (const calibration of TARGETED_CALIBRATION_CAPABILITIES) {
        const scored = input.evidenceSignals.filter(calibration.selector).map((signal) => {
            const piece = piecesById.get(signal.evidence_piece_id); const experience = piece ? experiencesById.get(piece.experience_id) : undefined;
            return { signal, rawStrength: rawSignalStrength(signal, experience?.date_range ?? null, null, null, input.currentYear), evidence_raw_text: piece?.raw_text ?? "" };
        }).sort((a, b) => b.rawStrength - a.rawStrength);
        if (!scored.length) continue;
        const latentScore = scored.reduce((sum, item, index) => sum + (item.rawStrength / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index))), 0);
        const existing = existingByCanonical.get(calibration.canonical_name);
        if (existing) {
            const unlinked = scored.filter((item) => !linkedSignalIds.has(item.signal.id)).reduce((sum, item, index) => sum + (item.rawStrength / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index))), 0);
            const blended = existing.weighted_signal_score + (unlinked * calibration.latent_blend_factor * 0.35); existing.weighted_signal_score = round(blended, 4); existing.strength_score = round(normalizeStrengthScore(blended), 4);
            if (existing.top_supporting_signals.length < topSignalsLimit) for (const item of scored.slice(0, topSignalsLimit - existing.top_supporting_signals.length)) {
                if (existing.top_supporting_signals.some((signal) => signal.evidence_signal_id === item.signal.id)) continue;
                existing.top_supporting_signals.push({ evidence_signal_id: item.signal.id, evidence_piece_id: item.signal.evidence_piece_id, contribution_score: round(item.rawStrength, 4), raw_signal_strength: round(item.rawStrength, 4), action: item.signal.action, scope_level: item.signal.scope_level, ownership_level: item.signal.ownership_level, impact_signal: item.signal.impact_signal, confidence_score: item.signal.confidence_score, link_contribution_weight: null, evidence_raw_text: item.evidence_raw_text });
            }
        } else if (latentScore >= 1) {
            const weighted = latentScore * calibration.latent_blend_factor;
            const backfilled: CapabilityStrengthProfileItem = { capability_id: `inferred:${input.careerId}:${calibration.canonical_name}`, canonical_name: calibration.canonical_name, display_name: calibration.display_name, strength_score: round(normalizeStrengthScore(weighted), 4), weighted_signal_score: round(weighted, 4), signal_count: scored.length, top_supporting_signals: scored.slice(0, topSignalsLimit).map((item) => ({ evidence_signal_id: item.signal.id, evidence_piece_id: item.signal.evidence_piece_id, contribution_score: round(item.rawStrength, 4), raw_signal_strength: round(item.rawStrength, 4), action: item.signal.action, scope_level: item.signal.scope_level, ownership_level: item.signal.ownership_level, impact_signal: item.signal.impact_signal, confidence_score: item.signal.confidence_score, link_contribution_weight: null, evidence_raw_text: item.evidence_raw_text })) };
            profile.push(backfilled); existingByCanonical.set(calibration.canonical_name, backfilled);
        }
    }
    const sorted = profile.sort((a, b) => b.strength_score - a.strength_score || b.weighted_signal_score - a.weighted_signal_score || b.signal_count - a.signal_count);
    return Object.freeze(sorted.map(freezeItem)) as unknown as CapabilityStrengthProfileItem[];
}
