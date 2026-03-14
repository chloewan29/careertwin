export type MatchBenchmarkLabel = "strong_fit" | "medium_fit" | "weak_fit";

export type MatchLabelThresholds = {
    strong_fit_min: number;
    medium_fit_min: number;
};

export const DEFAULT_MATCH_LABEL_THRESHOLDS: MatchLabelThresholds = {
    strong_fit_min: 0.62,
    medium_fit_min: 0.38,
};

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

export function normalizeThresholds(input: MatchLabelThresholds): MatchLabelThresholds {
    const strong = clamp(input.strong_fit_min);
    const medium = clamp(input.medium_fit_min);
    if (medium >= strong) {
        throw new Error(`Invalid thresholds: medium_fit_min (${medium}) must be < strong_fit_min (${strong})`);
    }
    return {
        strong_fit_min: strong,
        medium_fit_min: medium,
    };
}

export function classifyMatchLabel(score: number, thresholds: MatchLabelThresholds): MatchBenchmarkLabel {
    const boundedScore = clamp(score);
    const normalized = normalizeThresholds(thresholds);
    if (boundedScore >= normalized.strong_fit_min) return "strong_fit";
    if (boundedScore >= normalized.medium_fit_min) return "medium_fit";
    return "weak_fit";
}

