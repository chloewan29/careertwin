import type { EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";
import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";

export type RoleContextProfile = {
    functional_domains: Record<string, number>;
    work_modes: Record<string, number>;
    decision_contexts: Record<string, number>;
    specialized_contexts: Record<string, number>;
};

export type RoleContextJobSignals = {
    target_title: string | null;
    role_family: string | null;
    required_skills: string[];
    preferred_skills: string[];
    responsibilities: string[];
    domains: string[];
    keywords: string[];
};

export type RoleContextRequirementCluster = CapabilityMatchV2Result["audit"]["requirement_clusters"][number];

export type RequirementClusterContext = {
    role_context_affinity: Partial<RoleContextProfile>;
    is_broad_transferable: boolean;
    alignment: number;
    sub_context_tokens?: string[];
};

export type EvidenceRoleContextGraphInput = {
    capability_tags?: string[];
    linked_capabilities?: string[];
    graph_relationship_tags?: string[];
    requirement_cluster_tags?: string[];
};

export type RoleContextAffinityResult = {
    alignment: number;
    matched_role_contexts: string[];
    evidence_context_profile: RoleContextProfile;
    sub_context_tokens: string[];
    primary_context_token: string | null;
    specificity_bonus: number;
    broad_penalty: number;
    dominant_context_mismatch_penalty: number;
    context_signal_strength: number;
    genericity_score: number;
    specialization_signal_strength: number;
    impact_signal_strength: number;
    source_reason: string;
};

export type EvidenceContextSignals = {
    evidence_sub_context_tokens: string[];
    action_object_sub_context_tokens: string[];
    structured_signal_values: string[];
    source_reason_tags: string[];
    context_signal_strength: number;
    specialization_signal_strength: number;
    genericity_score: number;
    impact_signal_strength: number;
};

export type CandidateContextSignature = {
    primary_context_token?: string;
    sub_context_tokens: string[];
    decision_context_tokens: string[];
    work_mode_tokens: string[];
    functional_domain_tokens: string[];
    context_separation_score: number;
    adjacent_context_penalty: number;
};

export type RoleContextBiasDiagnostics = {
    dominant_context_distribution: Array<{
        token: string;
        weight: number;
    }>;
    token_diversity_score: number;
    context_token_entropy: number;
    domain_bias_indicator: number;
};

type AxisName = keyof RoleContextProfile;
type MutableRoleContextProfile = {
    functional_domains: Map<string, number>;
    work_modes: Map<string, number>;
    decision_contexts: Map<string, number>;
    specialized_contexts: Map<string, number>;
};

type AxisMatchResult = {
    score: number;
    matched_keys: string[];
    matched_profile: Record<string, number>;
};

const CONTEXT_STOPWORDS = new Set([
    "and",
    "the",
    "for",
    "with",
    "from",
    "into",
    "through",
    "across",
    "using",
    "used",
    "role",
    "team",
    "work",
    "ability",
    "experience",
    "strong",
    "excellent",
    "including",
    "will",
    "have",
    "has",
    "our",
    "your",
    "their",
]);

const ACTION_HINT_TOKENS = new Set([
    "build",
    "create",
    "deliver",
    "design",
    "develop",
    "drive",
    "enable",
    "execute",
    "improve",
    "lead",
    "manage",
    "operate",
    "optimize",
    "own",
    "plan",
    "run",
    "scale",
    "support",
    "transform",
]);

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_/]+/g, " ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(value: string, minTokenLength = 3): string[] {
    return normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= minTokenLength && !CONTEXT_STOPWORDS.has(token));
}

function normalizeSubContextToken(value: string): string {
    return tokenize(value, 3)
        .slice(0, 5)
        .join("_");
}

function tokenStructuralBroadness(token: string): number {
    const parts = token.split("_").filter(Boolean);
    if (parts.length === 0) return 1;
    const averagePartLength = parts.reduce((sum, part) => sum + part.length, 0) / parts.length;
    const shortPartShare = parts.filter((part) => part.length <= 4).length / parts.length;
    const uniquePartShare = new Set(parts).size / parts.length;
    const singleTokenPenalty = parts.length === 1
        ? 0.45
        : (parts.length === 2 ? 0.18 : 0);
    const lexicalDepthPenalty = averagePartLength < 5 ? 0.18 : 0;
    return clamp01(
        singleTokenPenalty
        + (shortPartShare * 0.34)
        + ((1 - uniquePartShare) * 0.24)
        + lexicalDepthPenalty,
    );
}

function isActionLikeToken(token: string): boolean {
    if (!token) return false;
    if (ACTION_HINT_TOKENS.has(token)) return true;
    return /(ing|ed|ize|ise|ate|ify)$/i.test(token);
}

function extractStructuralContextPairs(source: string): string[] {
    const normalized = normalizeText(source);
    if (!normalized) return [];
    const words = normalized.split(" ").filter((word) => word.length >= 3 && !CONTEXT_STOPWORDS.has(word));
    if (words.length < 2) return [];
    const pairs = new Set<string>();
    for (let index = 0; index < words.length - 1; index += 1) {
        const current = words[index];
        const next = words[index + 1];
        if (!next) continue;
        if (isActionLikeToken(current)) {
            const candidate = normalizeSubContextToken(`${current} ${next}`);
            if (isMeaningfulSubContextToken(candidate)) pairs.add(candidate);
            continue;
        }
        if (index < words.length - 2) {
            const third = words[index + 2];
            if (!third) continue;
            const candidate = normalizeSubContextToken(`${current} ${next} ${third}`);
            if (isMeaningfulSubContextToken(candidate)) pairs.add(candidate);
        }
    }
    return Array.from(pairs).slice(0, 10);
}

function isMeaningfulSubContextToken(token: string): boolean {
    if (!token) return false;
    const parts = token.split("_").filter(Boolean);
    if (parts.length < 2) return false;
    if (parts.some((part) => part.length < 3 || CONTEXT_STOPWORDS.has(part))) return false;
    return new Set(parts).size >= 2;
}

function isBroadGenericSubContextToken(token: string): boolean {
    return tokenStructuralBroadness(token) >= 0.62;
}

function isLowSignalContextToken(token: string): boolean {
    if (!token) return true;
    return /^(source|skill|capability|tool|requirement|signal)_/.test(token);
}

function subContextTokenSpecificity(token: string): number {
    const parts = token.split("_").filter(Boolean);
    if (parts.length === 0) return 0.65;
    const averagePartLength = parts.reduce((sum, part) => sum + part.length, 0) / parts.length;
    const multiTokenBoost = 1 + (Math.max(0, parts.length - 1) * 0.15);
    const lexicalDepthBoost = 1 + Math.min(0.3, averagePartLength * 0.03);
    const broadnessPenalty = 1 - (tokenStructuralBroadness(token) * 0.45);
    return Number((multiTokenBoost * lexicalDepthBoost * broadnessPenalty).toFixed(4));
}

function addSubContextCandidates(bucket: Map<string, number>, source: string, weight: number): void {
    if (weight <= 0) return;
    const tokens = tokenize(source, 3).slice(0, 14);
    if (tokens.length < 2) return;

    for (let n = 2; n <= 4; n += 1) {
        for (let index = 0; index <= (tokens.length - n); index += 1) {
            const phrase = tokens.slice(index, index + n);
            const candidate = normalizeSubContextToken(phrase.join(" "));
            if (!isMeaningfulSubContextToken(candidate)) continue;
            const compoundBoost = 1 + ((n - 2) * 0.18);
            const actionObjectBoost = isActionLikeToken(phrase[0]) ? 1.22 : 1;
            bucket.set(
                candidate,
                (bucket.get(candidate) ?? 0) + (weight * compoundBoost * actionObjectBoost),
            );
        }
    }

    const fullPhraseToken = normalizeSubContextToken(tokens.join(" "));
    if (isMeaningfulSubContextToken(fullPhraseToken)) {
        bucket.set(fullPhraseToken, (bucket.get(fullPhraseToken) ?? 0) + (weight * 0.55));
    }

    for (const pairToken of extractStructuralContextPairs(source)) {
        bucket.set(pairToken, (bucket.get(pairToken) ?? 0) + (weight * 1.06));
    }
}

function extractSubContextTokens(params: {
    values: Array<string | null | undefined>;
    weightedValues?: Array<{ value: string | null | undefined; weight: number }>;
    maxTokens?: number;
}): string[] {
    const bucket = new Map<string, number>();
    for (const value of params.values) {
        if (!value) continue;
        addSubContextCandidates(bucket, value, 1);
    }
    for (const weighted of params.weightedValues ?? []) {
        if (!weighted.value) continue;
        addSubContextCandidates(bucket, weighted.value, weighted.weight);
    }
    return Array.from(bucket.entries())
        .filter(([, weight]) => weight > 0)
        .sort((left, right) => {
            const weightedLeft = left[1] * subContextTokenSpecificity(left[0]);
            const weightedRight = right[1] * subContextTokenSpecificity(right[0]);
            if (weightedRight !== weightedLeft) return weightedRight - weightedLeft;
            return left[0].localeCompare(right[0]);
        })
        .map(([token]) => token)
        .slice(0, Math.max(1, params.maxTokens ?? 18));
}

function addWeightedSubContextValues(target: Map<string, number>, subContextTokens: string[], weight: number): void {
    addWeightedValues(
        target,
        subContextTokens.map((token) => token.replace(/_/g, " ")),
        weight,
    );
}

function addWeightedValues(target: Map<string, number>, values: string[], weight: number): void {
    if (weight <= 0) return;
    for (const value of values) {
        const normalizedValue = normalizeText(value);
        if (normalizedValue.length < 3) continue;
        target.set(normalizedValue, (target.get(normalizedValue) ?? 0) + weight);
        const tokens = tokenize(normalizedValue, 4).slice(0, 4);
        for (const token of tokens) {
            target.set(token, (target.get(token) ?? 0) + (weight * 0.42));
        }
    }
}

function toAxisRecord(bucket: Map<string, number>, maxEntries = 48): Record<string, number> {
    const sorted = Array.from(bucket.entries())
        .filter((entry) => entry[1] > 0)
        .sort((left, right) => {
            if (right[1] !== left[1]) return right[1] - left[1];
            return left[0].localeCompare(right[0]);
        })
        .slice(0, maxEntries);
    if (sorted.length === 0) return {};
    const hasStructuredTokens = sorted.some(([key]) => key.includes(" "));
    const filtered = hasStructuredTokens
        ? sorted.filter(([key]) => key.includes(" ") || !isBroadGenericSubContextToken(normalizeSubContextToken(key)))
        : sorted;
    const reweighted = filtered.map(([key, rawWeight]) => {
        const structuralKey = normalizeSubContextToken(key);
        const specificity = Math.max(0.62, subContextTokenSpecificity(structuralKey));
        const dampened = Math.pow(rawWeight, 0.82);
        return [key, dampened * specificity] as const;
    });
    const maxWeight = reweighted[0]?.[1] ?? 0;
    if (maxWeight <= 0) return {};
    return Object.fromEntries(
        reweighted.map(([key, adjustedWeight]) => [key, Number((adjustedWeight / maxWeight).toFixed(4))]),
    );
}

function buildEmptyProfile(): MutableRoleContextProfile {
    return {
        functional_domains: new Map<string, number>(),
        work_modes: new Map<string, number>(),
        decision_contexts: new Map<string, number>(),
        specialized_contexts: new Map<string, number>(),
    };
}

function clusterImportanceWeight(importance: "critical" | "important" | "supporting"): number {
    if (importance === "critical") return 1.2;
    if (importance === "important") return 1;
    return 0.7;
}

function clusterSpecificityWeight(genericity: "broad" | "balanced" | "specific"): number {
    if (genericity === "specific") return 1.15;
    if (genericity === "balanced") return 1;
    return 0.82;
}

function normalizedProfile(input: MutableRoleContextProfile): RoleContextProfile {
    return {
        functional_domains: toAxisRecord(input.functional_domains),
        work_modes: toAxisRecord(input.work_modes),
        decision_contexts: toAxisRecord(input.decision_contexts),
        specialized_contexts: toAxisRecord(input.specialized_contexts),
    };
}

function termMatchesCorpus(term: string, corpusText: string, corpusTokens: Set<string>): boolean {
    if (!term) return false;
    if (corpusText.includes(term)) return true;
    const termTokens = tokenize(term, 4);
    if (termTokens.length === 0) return false;
    const tokenHits = termTokens.reduce((hits, token) => hits + Number(corpusTokens.has(token)), 0);
    const requiredHits = Math.max(1, Math.ceil(termTokens.length * 0.75));
    return tokenHits >= requiredHits;
}

function axisMatches(params: {
    axisProfile: Record<string, number>;
    corpusValues: string[];
}): AxisMatchResult {
    const entries = Object.entries(params.axisProfile);
    if (entries.length === 0) {
        return {
            score: 0,
            matched_keys: [],
            matched_profile: {},
        };
    }
    const corpusText = normalizeText(params.corpusValues.join(" "));
    const corpusTokens = new Set(tokenize(corpusText, 3));
    let totalWeight = 0;
    let matchedWeight = 0;
    const matched: Array<{ key: string; weight: number }> = [];
    const matchedProfile: Record<string, number> = {};
    for (const [key, weight] of entries) {
        totalWeight += weight;
        if (!termMatchesCorpus(key, corpusText, corpusTokens)) continue;
        matchedWeight += weight;
        matched.push({ key, weight });
        matchedProfile[key] = weight;
    }
    matched.sort((left, right) => {
        if (right.weight !== left.weight) return right.weight - left.weight;
        return left.key.localeCompare(right.key);
    });
    return {
        score: totalWeight > 0 ? Number((matchedWeight / totalWeight).toFixed(4)) : 0,
        matched_keys: matched.map((item) => item.key),
        matched_profile: matchedProfile,
    };
}

function profileSignalWeight(profile: RoleContextProfile): number {
    return Object.values(profile.functional_domains).reduce((sum, value) => sum + value, 0)
        + Object.values(profile.work_modes).reduce((sum, value) => sum + value, 0)
        + Object.values(profile.decision_contexts).reduce((sum, value) => sum + value, 0)
        + Object.values(profile.specialized_contexts).reduce((sum, value) => sum + value, 0);
}

function normalizedEntropyFromWeights(weights: number[]): number {
    const positive = weights.filter((value) => value > 0);
    if (positive.length <= 1) return 0;
    const total = positive.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return 0;
    const probabilities = positive.map((value) => value / total);
    const entropy = probabilities.reduce((sum, probability) => (
        probability > 0
            ? (sum - (probability * Math.log2(probability)))
            : sum
    ), 0);
    const maxEntropy = Math.log2(probabilities.length);
    if (maxEntropy <= 0) return 0;
    return Number((entropy / maxEntropy).toFixed(4));
}

function topAxisEntries(axisProfile: Record<string, number>, maxEntries = 24): Array<[string, number]> {
    return Object.entries(axisProfile)
        .sort((left, right) => {
            if (right[1] !== left[1]) return right[1] - left[1];
            return left[0].localeCompare(right[0]);
        })
        .slice(0, maxEntries);
}

function contextTermSpecificityWeight(term: string): number {
    const tokens = tokenize(term, 3);
    if (tokens.length >= 3) return 1.22;
    if (tokens.length === 2) return 1.12;
    if (tokens.length === 1) return 0.94;
    return 1;
}

function toSubContextTokenFromRoleContextLabel(label: string): string {
    const divider = label.indexOf(":");
    const raw = divider >= 0 ? label.slice(divider + 1) : label;
    return normalizeSubContextToken(raw);
}

function toDominantContextCandidates(roleContextProfile: RoleContextProfile, maxPerAxis = 18): Array<{ token: string; weight: number }> {
    const collectAxis = (axis: Record<string, number>, axisWeight: number): Array<{ token: string; weight: number }> =>
        topAxisEntries(axis, maxPerAxis)
            .map(([label, score]) => {
                const token = normalizeSubContextToken(label);
                if (!token) return null;
                const specificity = subContextTokenSpecificity(token);
                const genericPenalty = isBroadGenericSubContextToken(token) ? 0.72 : 1;
                return {
                    token,
                    weight: score * axisWeight * specificity * genericPenalty,
                };
            })
            .filter((entry): entry is { token: string; weight: number } => Boolean(entry && entry.weight > 0));

    return [
        ...collectAxis(roleContextProfile.functional_domains, 0.95),
        ...collectAxis(roleContextProfile.work_modes, 1),
        ...collectAxis(roleContextProfile.decision_contexts, 1.08),
        ...collectAxis(roleContextProfile.specialized_contexts, 1.14),
    ];
}

export function getDominantRoleContextTokens(
    roleContextProfile: RoleContextProfile,
    maxTokens = 10,
): string[] {
    const aggregated = new Map<string, number>();
    for (const candidate of toDominantContextCandidates(roleContextProfile, 20)) {
        aggregated.set(candidate.token, (aggregated.get(candidate.token) ?? 0) + candidate.weight);
    }
    const pool = Array.from(aggregated.entries())
        .sort((left, right) => {
            if (right[1] !== left[1]) return right[1] - left[1];
            return left[0].localeCompare(right[0]);
        });
    const filtered = pool.filter(([token]) => !isBroadGenericSubContextToken(token));
    const selectedPool = filtered.length > 0 ? filtered : pool;
    return selectedPool
        .map(([token]) => token)
        .slice(0, Math.max(1, maxTokens));
}

export function computeRoleContextPrimaryToken(
    roleContextProfile: RoleContextProfile,
): string | null {
    return getDominantRoleContextTokens(roleContextProfile, 1)[0] ?? null;
}

export function computeRoleContextSubTokens(
    roleContextProfile: RoleContextProfile,
    maxTokens = 12,
): string[] {
    return getDominantRoleContextTokens(roleContextProfile, maxTokens);
}

export function computeRoleContextBiasDiagnostics(
    roleContextProfile: RoleContextProfile,
    maxTokens = 12,
): RoleContextBiasDiagnostics {
    const aggregated = new Map<string, number>();
    for (const candidate of toDominantContextCandidates(roleContextProfile, 24)) {
        aggregated.set(candidate.token, (aggregated.get(candidate.token) ?? 0) + candidate.weight);
    }
    const ranked = Array.from(aggregated.entries())
        .filter(([, value]) => value > 0)
        .sort((left, right) => {
            if (right[1] !== left[1]) return right[1] - left[1];
            return left[0].localeCompare(right[0]);
        })
        .slice(0, Math.max(1, maxTokens));
    const totalWeight = ranked.reduce((sum, [, value]) => sum + value, 0);
    const dominantDistribution = ranked.map(([token, value]) => ({
        token,
        weight: totalWeight > 0 ? Number((value / totalWeight).toFixed(4)) : 0,
    }));
    const entropy = normalizedEntropyFromWeights(dominantDistribution.map((entry) => entry.weight));
    const diversity = (() => {
        if (dominantDistribution.length <= 1) return 0;
        const squaredSum = dominantDistribution.reduce(
            (sum, entry) => sum + (entry.weight * entry.weight),
            0,
        );
        const denominator = 1 - (1 / dominantDistribution.length);
        if (denominator <= 0) return 0;
        return Number(clamp01((1 - squaredSum) / denominator).toFixed(4));
    })();
    const axisTotals = [
        Object.values(roleContextProfile.functional_domains).reduce((sum, value) => sum + value, 0),
        Object.values(roleContextProfile.work_modes).reduce((sum, value) => sum + value, 0),
        Object.values(roleContextProfile.decision_contexts).reduce((sum, value) => sum + value, 0),
        Object.values(roleContextProfile.specialized_contexts).reduce((sum, value) => sum + value, 0),
    ];
    const axisTotalSum = axisTotals.reduce((sum, value) => sum + value, 0);
    const axisConcentration = axisTotalSum > 0
        ? Math.max(...axisTotals.map((value) => value / axisTotalSum))
        : 1;
    const domainBiasIndicator = Number(clamp01(
        ((1 - diversity) * 0.42)
        + ((1 - entropy) * 0.36)
        + (Math.max(0, axisConcentration - 0.42) * 0.52),
    ).toFixed(4));

    return {
        dominant_context_distribution: dominantDistribution,
        token_diversity_score: diversity,
        context_token_entropy: entropy,
        domain_bias_indicator: domainBiasIndicator,
    };
}

function selectPrimaryContextToken(params: {
    subContextTokens: string[];
    dominantRoleContextTokens: string[];
    matchedRoleContexts: string[];
}): string | null {
    const signalRichSubContexts = params.subContextTokens
        .filter((token) => !isLowSignalContextToken(token));
    const dominantSet = new Set(params.dominantRoleContextTokens);
    const matchedRoleContextTokens = params.matchedRoleContexts
        .map((label) => toSubContextTokenFromRoleContextLabel(label));
    const overlappingDominant = signalRichSubContexts.find((token) => dominantSet.has(token))
        ?? params.subContextTokens.find((token) => dominantSet.has(token));
    if (overlappingDominant) return overlappingDominant;
    const overlappingMatchedRoleContext = signalRichSubContexts.find((token) => matchedRoleContextTokens.includes(token))
        ?? params.subContextTokens.find((token) => matchedRoleContextTokens.includes(token));
    if (overlappingMatchedRoleContext) return overlappingMatchedRoleContext;
    const firstSpecific = signalRichSubContexts.find((token) => !isBroadGenericSubContextToken(token))
        ?? params.subContextTokens.find((token) => !isBroadGenericSubContextToken(token));
    if (firstSpecific) return firstSpecific;
    const firstSignalRich = signalRichSubContexts[0];
    if (firstSignalRich) return firstSignalRich;
    return params.subContextTokens[0] ?? null;
}

function profileSimilarity(params: {
    roleContextProfile: RoleContextProfile;
    projectedContextProfile: RoleContextProfile;
}): number {
    const roleWeight = profileSignalWeight(params.roleContextProfile);
    if (roleWeight <= 0) return 1;
    const similarityAcrossAxis = (roleAxis: Record<string, number>, projectedAxis: Record<string, number>): {
        shared: number;
        total: number;
    } => {
        let shared = 0;
        let total = 0;
        for (const [key, roleWeightValue] of topAxisEntries(roleAxis, 24)) {
            const specificityWeight = contextTermSpecificityWeight(key);
            const weightedRole = roleWeightValue * specificityWeight;
            total += weightedRole;
            const projectedWeightValue = projectedAxis[key] ?? 0;
            if (projectedWeightValue <= 0) continue;
            shared += Math.min(roleWeightValue, projectedWeightValue) * specificityWeight;
        }
        return { shared, total };
    };
    const functional = similarityAcrossAxis(
        params.roleContextProfile.functional_domains,
        params.projectedContextProfile.functional_domains,
    );
    const work = similarityAcrossAxis(
        params.roleContextProfile.work_modes,
        params.projectedContextProfile.work_modes,
    );
    const decision = similarityAcrossAxis(
        params.roleContextProfile.decision_contexts,
        params.projectedContextProfile.decision_contexts,
    );
    const specialized = similarityAcrossAxis(
        params.roleContextProfile.specialized_contexts,
        params.projectedContextProfile.specialized_contexts,
    );
    const totalRoleWeight = functional.total + work.total + decision.total + specialized.total;
    if (totalRoleWeight <= 0) return 1;
    const sharedWeight = functional.shared + work.shared + decision.shared + specialized.shared;
    const baseSimilarity = sharedWeight / totalRoleWeight;
    const roleSpecificDominant = getDominantRoleContextTokens(params.roleContextProfile, 12)
        .filter((token) => !isBroadGenericSubContextToken(token));
    const projectedSpecificDominant = new Set(
        getDominantRoleContextTokens(params.projectedContextProfile, 12)
            .filter((token) => !isBroadGenericSubContextToken(token)),
    );
    const overlapCount = roleSpecificDominant
        .filter((token) => projectedSpecificDominant.has(token))
        .length;
    const overlapRatio = roleSpecificDominant.length > 0
        ? overlapCount / roleSpecificDominant.length
        : 1;
    const mismatchPenalty = roleSpecificDominant.length >= 2
        ? Math.min(0.28, Math.max(0, 1 - overlapRatio) * 0.24)
        : 0;
    return Number(clamp01(baseSimilarity * (1 - mismatchPenalty)).toFixed(4));
}

function toMatchedRoleContexts(matches: {
    functional_domains: string[];
    work_modes: string[];
    decision_contexts: string[];
    specialized_contexts: string[];
}, profile: RoleContextProfile, evidenceProfile: RoleContextProfile, maxEntries = 16): string[] {
    const weighted: Array<{ label: string; weight: number }> = [];
    const collect = (axis: AxisName, values: string[]) => {
        const axisProfile = profile[axis];
        const evidenceAxis = evidenceProfile[axis];
        for (const value of values) {
            const overlapWeight = Math.min(axisProfile[value] ?? 0, evidenceAxis[value] ?? 0);
            weighted.push({
                label: `${axis}:${value}`,
                weight: overlapWeight * contextTermSpecificityWeight(value),
            });
        }
    };
    collect("functional_domains", matches.functional_domains);
    collect("work_modes", matches.work_modes);
    collect("decision_contexts", matches.decision_contexts);
    collect("specialized_contexts", matches.specialized_contexts);
    return weighted
        .sort((left, right) => {
            if (right.weight !== left.weight) return right.weight - left.weight;
            return left.label.localeCompare(right.label);
        })
        .map((item) => item.label)
        .slice(0, maxEntries);
}

function toPartialRoleContextProfile(params: {
    functional: AxisMatchResult;
    work: AxisMatchResult;
    decision: AxisMatchResult;
    specialized: AxisMatchResult;
}): Partial<RoleContextProfile> {
    const output: Partial<RoleContextProfile> = {};
    if (Object.keys(params.functional.matched_profile).length > 0) {
        output.functional_domains = params.functional.matched_profile;
    }
    if (Object.keys(params.work.matched_profile).length > 0) {
        output.work_modes = params.work.matched_profile;
    }
    if (Object.keys(params.decision.matched_profile).length > 0) {
        output.decision_contexts = params.decision.matched_profile;
    }
    if (Object.keys(params.specialized.matched_profile).length > 0) {
        output.specialized_contexts = params.specialized.matched_profile;
    }
    return output;
}

function clusterSignalDensityBoost(cluster: RoleContextRequirementCluster): number {
    const repeatedSignalBoost = Math.min(cluster.jd_repeated_signal_units, 4) * 0.06;
    const sectionCoverageBoost = Math.min(cluster.jd_section_coverage, 4) * 0.05;
    const highWeightPhraseBoost = Math.min(cluster.jd_high_weight_signal_units, 4) * 0.08;
    const literalSignalBoost = Math.min(cluster.jd_literal_signal_count, 4) * 0.03;
    return 1 + repeatedSignalBoost + sectionCoverageBoost + highWeightPhraseBoost + literalSignalBoost;
}

function buildClusterAxisMatches(
    cluster: RoleContextRequirementCluster,
    roleContextProfile: RoleContextProfile,
): {
    functional: AxisMatchResult;
    work: AxisMatchResult;
    decision: AxisMatchResult;
    specialized: AxisMatchResult;
} {
    const functional = axisMatches({
        axisProfile: roleContextProfile.functional_domains,
        corpusValues: [
            cluster.display_name,
            ...cluster.direct_capabilities,
            ...cluster.transfer_capabilities,
            ...cluster.domain_modifiers,
            ...cluster.role_family_alignment,
        ],
    });
    const work = axisMatches({
        axisProfile: roleContextProfile.work_modes,
        corpusValues: [
            cluster.display_name,
            ...cluster.methods,
            ...cluster.evidence,
        ],
    });
    const decision = axisMatches({
        axisProfile: roleContextProfile.decision_contexts,
        corpusValues: [
            cluster.display_name,
            ...cluster.matched_terms,
            ...cluster.evidence,
        ],
    });
    const specialized = axisMatches({
        axisProfile: roleContextProfile.specialized_contexts,
        corpusValues: [
            cluster.display_name,
            ...cluster.domain_modifiers,
            ...cluster.methods,
            ...cluster.matched_terms,
            ...cluster.evidence,
        ],
    });
    return { functional, work, decision, specialized };
}

function deriveClusterSubContextTokens(cluster: RoleContextRequirementCluster): string[] {
    return extractSubContextTokens({
        values: [
            cluster.display_name,
            ...cluster.domain_modifiers,
            ...cluster.methods,
            ...cluster.matched_terms,
            ...cluster.evidence,
            ...cluster.direct_capabilities,
            ...cluster.transfer_capabilities,
            ...cluster.role_family_alignment,
        ],
        weightedValues: [
            { value: cluster.display_name, weight: 1.1 },
            ...cluster.domain_modifiers.map((value) => ({ value, weight: 1.05 })),
            ...cluster.methods.map((value) => ({ value, weight: 1.02 })),
            ...cluster.matched_terms.map((value) => ({ value, weight: 0.95 })),
            ...cluster.evidence.map((value) => ({ value, weight: 0.92 })),
        ],
        maxTokens: 16,
    });
}

export function detectRoleContextProfile(
    jobSignals: RoleContextJobSignals,
    requirementClusters: RoleContextRequirementCluster[],
): RoleContextProfile {
    const profile = buildEmptyProfile();
    const jdSubContextTokens = extractSubContextTokens({
        values: [
            jobSignals.target_title,
            jobSignals.role_family,
            ...jobSignals.required_skills,
            ...jobSignals.preferred_skills,
            ...jobSignals.responsibilities,
            ...jobSignals.domains,
            ...jobSignals.keywords,
        ],
        weightedValues: [
            ...jobSignals.required_skills.map((value) => ({ value, weight: 1.2 })),
            ...jobSignals.responsibilities.map((value) => ({ value, weight: 1.14 })),
            ...jobSignals.keywords.map((value) => ({ value, weight: 0.94 })),
            ...jobSignals.domains.map((value) => ({ value, weight: 1.08 })),
        ],
        maxTokens: 24,
    });

    // Title is retained as weak prior, while JD body and cluster signals dominate.
    addWeightedValues(profile.functional_domains, [jobSignals.target_title ?? "", jobSignals.role_family ?? ""], 0.35);
    addWeightedValues(profile.functional_domains, jobSignals.required_skills, 1.2);
    addWeightedValues(profile.functional_domains, jobSignals.preferred_skills, 0.75);
    addWeightedValues(profile.functional_domains, jobSignals.domains, 1.3);

    addWeightedValues(profile.work_modes, jobSignals.responsibilities, 1.18);
    addWeightedValues(profile.work_modes, jobSignals.required_skills, 0.45);
    addWeightedValues(profile.work_modes, jobSignals.keywords, 0.45);

    addWeightedValues(profile.decision_contexts, [jobSignals.target_title ?? ""], 0.32);
    addWeightedValues(profile.decision_contexts, jobSignals.responsibilities, 1);
    addWeightedValues(profile.decision_contexts, jobSignals.keywords, 1.05);

    addWeightedValues(profile.specialized_contexts, jobSignals.required_skills, 1.02);
    addWeightedValues(profile.specialized_contexts, jobSignals.preferred_skills, 0.74);
    addWeightedValues(profile.specialized_contexts, jobSignals.domains, 0.8);
    addWeightedValues(profile.specialized_contexts, jobSignals.keywords, 0.75);
    addWeightedSubContextValues(profile.specialized_contexts, jdSubContextTokens, 1.18);
    addWeightedSubContextValues(profile.decision_contexts, jdSubContextTokens, 0.82);
    addWeightedSubContextValues(profile.work_modes, jdSubContextTokens, 0.66);

    for (const cluster of requirementClusters) {
        const clusterWeight = clusterImportanceWeight(cluster.importance)
            * (0.72 + (cluster.confidence * 0.65))
            * clusterSpecificityWeight(cluster.genericity)
            * clusterSignalDensityBoost(cluster);
        const clusterSubContextTokens = deriveClusterSubContextTokens(cluster);

        addWeightedValues(profile.functional_domains, [
            cluster.display_name,
            ...cluster.direct_capabilities,
            ...cluster.transfer_capabilities,
            ...cluster.domain_modifiers,
            ...cluster.role_family_alignment,
        ], 0.92 * clusterWeight);

        addWeightedValues(profile.work_modes, [
            cluster.display_name,
            ...cluster.methods,
            ...cluster.evidence,
            ...cluster.matched_terms,
        ], 0.9 * clusterWeight);

        addWeightedValues(profile.decision_contexts, [
            cluster.display_name,
            ...cluster.matched_terms,
            ...cluster.evidence,
        ], 0.92 * clusterWeight);

        addWeightedValues(profile.specialized_contexts, [
            cluster.display_name,
            ...cluster.methods,
            ...cluster.domain_modifiers,
            ...cluster.matched_terms,
        ], 1.02 * clusterWeight);
        addWeightedSubContextValues(profile.specialized_contexts, clusterSubContextTokens, 1.14 * clusterWeight);
        addWeightedSubContextValues(profile.decision_contexts, clusterSubContextTokens, 0.88 * clusterWeight);
        addWeightedSubContextValues(profile.work_modes, clusterSubContextTokens, 0.76 * clusterWeight);
    }

    return normalizedProfile(profile);
}

export function computeRequirementClusterContext(
    cluster: RoleContextRequirementCluster,
    roleContextProfile: RoleContextProfile,
): RequirementClusterContext {
    const matches = buildClusterAxisMatches(cluster, roleContextProfile);
    const subContextTokens = deriveClusterSubContextTokens(cluster);
    const specificSubContextCount = subContextTokens.filter((token) => !isBroadGenericSubContextToken(token)).length;
    const weights = {
        functional_domains: Object.keys(roleContextProfile.functional_domains).length > 0 ? 0.3 : 0,
        work_modes: Object.keys(roleContextProfile.work_modes).length > 0 ? 0.2 : 0,
        decision_contexts: Object.keys(roleContextProfile.decision_contexts).length > 0 ? 0.24 : 0,
        specialized_contexts: Object.keys(roleContextProfile.specialized_contexts).length > 0 ? 0.26 : 0,
    };
    const totalWeight = weights.functional_domains + weights.work_modes + weights.decision_contexts + weights.specialized_contexts;
    const weighted = totalWeight > 0
        ? (matches.functional.score * weights.functional_domains)
            + (matches.work.score * weights.work_modes)
            + (matches.decision.score * weights.decision_contexts)
            + (matches.specialized.score * weights.specialized_contexts)
        : 1;
    const alignment = Number((weighted / Math.max(totalWeight, 1)).toFixed(4));
    const broadByGenericity = cluster.genericity === "broad";
    const contextSpecificByAlignment = alignment >= 0.58 || specificSubContextCount >= 2;
    return {
        role_context_affinity: toPartialRoleContextProfile(matches),
        is_broad_transferable: (broadByGenericity && !contextSpecificByAlignment)
            || (alignment < 0.3 && cluster.importance !== "critical"),
        alignment,
        sub_context_tokens: subContextTokens.slice(0, 12),
    };
}

export function computeClusterRoleContextAffinity(
    cluster: RoleContextRequirementCluster,
    roleContextProfile: RoleContextProfile,
): number {
    return computeRequirementClusterContext(cluster, roleContextProfile).alignment;
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function normalizeSourceTypeLabel(value: EvidencePiece["source_type"]): string {
    const normalized = normalizeText(value ?? "");
    if (!normalized) return "source_unknown";
    return `source_${normalized.replace(/\s+/g, "_")}`;
}

function extractInferredScopeTags(evidence: EvidencePiece): string[] {
    const inferredScope = toObjectRecord(evidence.inferred_scope);
    if (!inferredScope) return [];
    const tags: string[] = [];
    const collectField = (field: string, prefix: string) => {
        const value = inferredScope[field];
        if (typeof value !== "string") return;
        const normalized = normalizeSubContextToken(value);
        if (!normalized) return;
        tags.push(`${prefix}_${normalized}`);
    };
    collectField("ownership_level", "ownership");
    collectField("scope_level", "scope");
    collectField("initiative_type", "initiative");
    collectField("domain", "domain");
    collectField("team_signal", "team");
    collectField("impact_signal", "impact");
    return tags;
}

function resolveEvidenceConfidenceScore(evidence: EvidencePiece): number {
    if (typeof evidence.confidence === "number" && Number.isFinite(evidence.confidence)) {
        return clamp01(evidence.confidence);
    }
    if (evidence.confidence_level === "high") return 0.82;
    if (evidence.confidence_level === "medium") return 0.62;
    if (evidence.confidence_level === "low") return 0.42;
    return 0.55;
}

function resolveEvidenceOwnershipScore(evidence: EvidencePiece): number {
    const inferredScope = toObjectRecord(evidence.inferred_scope);
    const ownership = typeof inferredScope?.ownership_level === "string"
        ? normalizeText(inferredScope.ownership_level)
        : "";
    if (ownership.includes("owner") || ownership.includes("lead")) return 0.9;
    if (ownership.includes("driver")) return 0.76;
    if (ownership.includes("support") || ownership.includes("contribut")) return 0.52;
    if (evidence.leadership_scope === "org_lead" || evidence.leadership_scope === "program_lead") return 0.84;
    if (evidence.leadership_scope === "team_lead" || evidence.leadership_scope === "technical_lead") return 0.76;
    if (evidence.leadership_scope === "individual_contribution") return 0.58;
    return 0.58;
}

function resolveEvidenceImpactScaleScore(evidence: EvidencePiece): number {
    if (evidence.impact_scale === "enterprise") return 0.92;
    if (evidence.impact_scale === "large") return 0.78;
    if (evidence.impact_scale === "medium") return 0.62;
    if (evidence.impact_scale === "small") return 0.46;
    if (evidence.impact_type === "strategic" || evidence.impact_type === "revenue") return 0.7;
    if (evidence.impact_type === "operational" || evidence.impact_type === "cost") return 0.62;
    return 0.56;
}

export function computeEvidenceGenericity(params: {
    broad_share: number;
    specific_sub_context_count: number;
    graph_signal_count: number;
    impact_signal_strength: number;
}): number {
    return Number(clamp01(
        (params.broad_share * 0.64)
        + (params.specific_sub_context_count === 0 ? 0.18 : 0)
        + (params.graph_signal_count <= 2 ? 0.1 : 0)
        + (params.impact_signal_strength < 0.45 ? 0.08 : 0),
    ).toFixed(4));
}

export function computeEvidenceSpecializationStrength(params: {
    specific_sub_context_count: number;
    requirement_cluster_count: number;
    linked_capability_count: number;
    action_object_pair_count: number;
    impact_signal_strength: number;
}): number {
    return clamp01(
        (Math.min(12, params.specific_sub_context_count) * 0.06)
        + (Math.min(8, params.requirement_cluster_count) * 0.05)
        + (Math.min(8, params.linked_capability_count) * 0.045)
        + (Math.min(8, params.action_object_pair_count) * 0.03)
        + (params.impact_signal_strength * 0.12),
    );
}

function computeEvidenceImpactSignalStrength(params: {
    evidence: EvidencePiece;
    inferred_scope_tags: string[];
    structured_signal_values: string[];
    action_object_pair_count: number;
}): number {
    const hasImpactNarrative = Boolean(params.evidence.impact && params.evidence.impact.trim().length >= 12);
    const inferredScope = toObjectRecord(params.evidence.inferred_scope);
    const confirmedByQuickCheck = inferredScope?.source === "quick_check_confirmation";
    const impactTaggedSignals = params.structured_signal_values
        .filter((value) => normalizeText(value).includes("impact") || normalizeText(value).includes("outcome"))
        .length;
    return clamp01(
        (resolveEvidenceImpactScaleScore(params.evidence) * 0.42)
        + (resolveEvidenceOwnershipScore(params.evidence) * 0.26)
        + (resolveEvidenceConfidenceScore(params.evidence) * 0.18)
        + (hasImpactNarrative ? 0.1 : 0)
        + (confirmedByQuickCheck ? 0.08 : 0)
        + (Math.min(6, impactTaggedSignals) * 0.01)
        + (Math.min(4, params.action_object_pair_count) * 0.015)
        + (Math.min(4, params.inferred_scope_tags.length) * 0.01),
    );
}

export function computeEvidenceContextSignals(
    evidence: EvidencePiece,
    capabilityGraph: EvidenceRoleContextGraphInput = {},
): EvidenceContextSignals {
    const linkedCapabilities = capabilityGraph.linked_capabilities ?? [];
    const capabilityTags = capabilityGraph.capability_tags ?? [];
    const graphRelationshipTags = capabilityGraph.graph_relationship_tags ?? [];
    const requirementClusterTags = Array.from(
        new Set((capabilityGraph.requirement_cluster_tags ?? []).map((value) => String(value || "").trim()).filter(Boolean)),
    ).slice(0, 8);
    const sourceTypeTag = normalizeSourceTypeLabel(evidence.source_type);
    const inferredScopeTags = extractInferredScopeTags(evidence);
    const structuredSignalValues = Array.from(new Set([
        evidence.action ?? "",
        evidence.impact ?? "",
        evidence.business_context ?? "",
        ...(evidence.stakeholders ?? []),
        ...(evidence.tools_methods ?? []),
        ...graphRelationshipTags,
        ...requirementClusterTags,
        ...linkedCapabilities,
        ...capabilityTags,
        ...inferredScopeTags,
        sourceTypeTag,
    ].filter(Boolean)));
    const evidenceLexicalCorpus = [
        evidence.raw_text,
        evidence.summary ?? "",
        evidence.action ?? "",
        evidence.impact ?? "",
        evidence.business_context ?? "",
        evidence.role,
        evidence.company,
    ];
    const evidenceSubContextTokens = extractSubContextTokens({
        values: [
            ...evidenceLexicalCorpus,
            ...structuredSignalValues,
        ],
        weightedValues: [
            { value: evidence.action ?? null, weight: 1.24 },
            { value: evidence.summary ?? null, weight: 1.08 },
            { value: evidence.business_context ?? null, weight: 1.14 },
            ...requirementClusterTags.map((value) => ({ value, weight: 0.82 })),
            ...graphRelationshipTags.map((value) => ({ value, weight: 1.08 })),
            ...linkedCapabilities.map((value) => ({ value, weight: 1.05 })),
            ...capabilityTags.map((value) => ({ value, weight: 1.04 })),
            ...inferredScopeTags.map((value) => ({ value, weight: 1.12 })),
            { value: sourceTypeTag, weight: 0.92 },
        ],
        maxTokens: 20,
    });
    const actionObjectSubContextTokens = extractStructuralContextPairs([
        evidence.action ?? "",
        evidence.summary ?? "",
        evidence.raw_text,
        evidence.business_context ?? "",
        ...graphRelationshipTags,
        ...inferredScopeTags,
    ].join(" "));
    const specificSubContexts = evidenceSubContextTokens.filter((token) => !isBroadGenericSubContextToken(token));
    const broadSubContexts = evidenceSubContextTokens.filter((token) => isBroadGenericSubContextToken(token));
    const graphSignalCount = linkedCapabilities.length + capabilityTags.length + graphRelationshipTags.length + requirementClusterTags.length;
    const structuredSignalCount = structuredSignalValues.length + inferredScopeTags.length;
    const impactSignalStrength = computeEvidenceImpactSignalStrength({
        evidence,
        inferred_scope_tags: inferredScopeTags,
        structured_signal_values: structuredSignalValues,
        action_object_pair_count: actionObjectSubContextTokens.length,
    });
    const contextSignalStrength = clamp01(
        (Math.min(16, graphSignalCount) * 0.035)
        + (Math.min(20, structuredSignalCount) * 0.02)
        + (Math.min(12, actionObjectSubContextTokens.length) * 0.035)
        + (impactSignalStrength * 0.12),
    );
    const specializationSignalStrength = computeEvidenceSpecializationStrength({
        specific_sub_context_count: specificSubContexts.length,
        requirement_cluster_count: requirementClusterTags.length,
        linked_capability_count: linkedCapabilities.length,
        action_object_pair_count: actionObjectSubContextTokens.length,
        impact_signal_strength: impactSignalStrength,
    });
    const broadShare = evidenceSubContextTokens.length > 0
        ? broadSubContexts.length / evidenceSubContextTokens.length
        : 1;
    const genericityScore = computeEvidenceGenericity({
        broad_share: broadShare,
        specific_sub_context_count: specificSubContexts.length,
        graph_signal_count: graphSignalCount,
        impact_signal_strength: impactSignalStrength,
    });
    const sourceReasonTags = Array.from(new Set([
        graphSignalCount > 0 ? "graph_linked_context" : "",
        requirementClusterTags.length > 0 ? "requirement_cluster_trace" : "",
        inferredScopeTags.length > 0 ? "inferred_scope_trace" : "",
        actionObjectSubContextTokens.length > 0 ? "action_object_context" : "",
        impactSignalStrength >= 0.6 ? "impact_signal_trace" : "",
        sourceTypeTag,
    ].filter(Boolean)));

    return {
        evidence_sub_context_tokens: evidenceSubContextTokens,
        action_object_sub_context_tokens: actionObjectSubContextTokens,
        structured_signal_values: structuredSignalValues,
        source_reason_tags: sourceReasonTags,
        context_signal_strength: Number(contextSignalStrength.toFixed(4)),
        specialization_signal_strength: Number(specializationSignalStrength.toFixed(4)),
        genericity_score: genericityScore,
        impact_signal_strength: Number(impactSignalStrength.toFixed(4)),
    };
}

export function computeEvidenceContextAffinity(
    evidence: EvidencePiece,
    roleContextProfile: RoleContextProfile,
    capabilityGraph: EvidenceRoleContextGraphInput = {},
): RoleContextAffinityResult {
    return computeEvidenceRoleContextAffinity(evidence, roleContextProfile, capabilityGraph);
}

export function computeAdjacentContextPenalty(params: {
    role_primary_context_token: string | null;
    role_sub_context_tokens: string[];
    evidence_primary_context_token: string | null;
    evidence_sub_context_tokens: string[];
    broad_penalty: number;
    genericity_score: number;
    dominant_context_mismatch_penalty: number;
}): number {
    const roleSpecificTokens = params.role_sub_context_tokens
        .filter((token) => !isBroadGenericSubContextToken(token));
    const evidenceSpecificTokens = params.evidence_sub_context_tokens
        .filter((token) => !isBroadGenericSubContextToken(token));
    const roleSpecificTokenSet = new Set(roleSpecificTokens);
    const specificOverlapCount = evidenceSpecificTokens
        .filter((token) => roleSpecificTokenSet.has(token))
        .length;
    const specificCoverage = roleSpecificTokens.length > 0
        ? specificOverlapCount / roleSpecificTokens.length
        : 0;
    const primaryMatch = Boolean(
        params.role_primary_context_token
        && params.evidence_primary_context_token
        && params.role_primary_context_token === params.evidence_primary_context_token,
    );
    const primaryMismatch = Boolean(
        params.role_primary_context_token
        && params.evidence_primary_context_token
        && params.role_primary_context_token !== params.evidence_primary_context_token,
    );
    const lowSignalPrimary = Boolean(
        params.evidence_primary_context_token
        && isLowSignalContextToken(params.evidence_primary_context_token),
    );
    const broadOnlyEvidence = evidenceSpecificTokens.length === 0;
    const penalty = (
        ((1 - specificCoverage) * 0.18)
        + (primaryMismatch ? 0.08 : 0)
        + (broadOnlyEvidence ? 0.06 : 0)
        + (params.broad_penalty * 0.18)
        + (params.genericity_score * 0.14)
        + (params.dominant_context_mismatch_penalty * 0.22)
        + (lowSignalPrimary ? 0.09 : 0)
        - (primaryMatch ? 0.08 : 0)
    );
    return Number(clamp01(penalty).toFixed(4));
}

export function computeContextSeparationScore(params: {
    alignment: number;
    specialization_signal_strength: number;
    context_signal_strength: number;
    impact_signal_strength: number;
    specificity_bonus: number;
    dominant_specific_overlap_count: number;
    evidence_specific_token_count: number;
    primary_context_match: boolean;
    adjacent_context_penalty: number;
}): number {
    const distinctBoost = Math.min(
        0.3,
        (params.dominant_specific_overlap_count * 0.09)
        + (Math.min(8, params.evidence_specific_token_count) * 0.014)
        + (params.primary_context_match ? 0.08 : 0),
    );
    const base = (
        (params.alignment * 0.42)
        + (params.specialization_signal_strength * 0.2)
        + (params.context_signal_strength * 0.14)
        + (params.impact_signal_strength * 0.12)
        + (params.specificity_bonus * 0.22)
    );
    return Number(clamp01(
        base
        + distinctBoost
        - params.adjacent_context_penalty,
    ).toFixed(4));
}

function topAxisContextTokens(
    axis: Record<string, number>,
    maxTokens: number,
    minWeight = 0.14,
): string[] {
    return topAxisEntries(axis, 24)
        .filter(([, weight]) => weight >= minWeight)
        .map(([label]) => normalizeSubContextToken(label))
        .filter(Boolean)
        .slice(0, Math.max(1, maxTokens));
}

export function computeEvidenceContextSignature(params: {
    evidence: EvidencePiece;
    roleContextProfile: RoleContextProfile;
    capabilityGraph?: EvidenceRoleContextGraphInput;
}): CandidateContextSignature {
    const rolePrimaryContextToken = computeRoleContextPrimaryToken(params.roleContextProfile);
    const roleSubContextTokens = computeRoleContextSubTokens(params.roleContextProfile, 12);
    const affinity = computeEvidenceRoleContextAffinity(
        params.evidence,
        params.roleContextProfile,
        params.capabilityGraph ?? {},
    );
    const evidenceSpecificTokens = affinity.sub_context_tokens
        .filter((token) => !isBroadGenericSubContextToken(token));
    const dominantSpecificRoleTokens = roleSubContextTokens
        .filter((token) => !isBroadGenericSubContextToken(token));
    const dominantSpecificRoleTokenSet = new Set(dominantSpecificRoleTokens);
    const dominantSpecificOverlapCount = evidenceSpecificTokens
        .filter((token) => dominantSpecificRoleTokenSet.has(token))
        .length;
    const primaryContextMatch = Boolean(
        rolePrimaryContextToken
        && affinity.primary_context_token
        && rolePrimaryContextToken === affinity.primary_context_token,
    );
    const adjacentContextPenalty = computeAdjacentContextPenalty({
        role_primary_context_token: rolePrimaryContextToken,
        role_sub_context_tokens: roleSubContextTokens,
        evidence_primary_context_token: affinity.primary_context_token,
        evidence_sub_context_tokens: affinity.sub_context_tokens,
        broad_penalty: affinity.broad_penalty,
        genericity_score: affinity.genericity_score,
        dominant_context_mismatch_penalty: affinity.dominant_context_mismatch_penalty,
    });
    const contextSeparationScore = computeContextSeparationScore({
        alignment: affinity.alignment,
        specialization_signal_strength: affinity.specialization_signal_strength,
        context_signal_strength: affinity.context_signal_strength,
        impact_signal_strength: affinity.impact_signal_strength,
        specificity_bonus: affinity.specificity_bonus,
        dominant_specific_overlap_count: dominantSpecificOverlapCount,
        evidence_specific_token_count: evidenceSpecificTokens.length,
        primary_context_match: primaryContextMatch,
        adjacent_context_penalty: adjacentContextPenalty,
    });
    const profile = affinity.evidence_context_profile;

    return {
        primary_context_token: affinity.primary_context_token ?? undefined,
        sub_context_tokens: affinity.sub_context_tokens.slice(0, 12),
        decision_context_tokens: topAxisContextTokens(profile.decision_contexts, 8),
        work_mode_tokens: topAxisContextTokens(profile.work_modes, 8),
        functional_domain_tokens: topAxisContextTokens(profile.functional_domains, 8),
        context_separation_score: contextSeparationScore,
        adjacent_context_penalty: adjacentContextPenalty,
    };
}

export function computeEvidenceRoleContextProfile(
    evidence: EvidencePiece,
    capabilityGraph: EvidenceRoleContextGraphInput = {},
): RoleContextProfile {
    const profile = buildEmptyProfile();
    const linkedCapabilities = capabilityGraph.linked_capabilities ?? [];
    const capabilityTags = capabilityGraph.capability_tags ?? [];
    const graphRelationshipTags = capabilityGraph.graph_relationship_tags ?? [];
    const requirementClusterTags = Array.from(
        new Set((capabilityGraph.requirement_cluster_tags ?? []).map((value) => String(value || "").trim()).filter(Boolean)),
    ).slice(0, 8);
    const signals = computeEvidenceContextSignals(evidence, capabilityGraph);
    const evidenceLexicalCorpus = [
        evidence.raw_text,
        evidence.summary ?? "",
        evidence.action ?? "",
        evidence.impact ?? "",
        evidence.business_context ?? "",
        evidence.role,
        evidence.company,
        ...(evidence.stakeholders ?? []),
        ...(evidence.tools_methods ?? []),
    ];
    const evidenceSubContextTokens = signals.evidence_sub_context_tokens;
    const actionObjectSubContextTokens = signals.action_object_sub_context_tokens;

    addWeightedValues(profile.functional_domains, linkedCapabilities, 0.92);
    addWeightedValues(profile.functional_domains, capabilityTags, 0.72);
    addWeightedValues(profile.functional_domains, signals.structured_signal_values, 0.88);
    addWeightedSubContextValues(profile.functional_domains, evidenceSubContextTokens, 0.58);
    addWeightedSubContextValues(profile.functional_domains, actionObjectSubContextTokens, 0.92);

    addWeightedValues(profile.work_modes, graphRelationshipTags, 0.95);
    addWeightedValues(profile.work_modes, capabilityTags, 0.44);
    addWeightedValues(profile.work_modes, signals.structured_signal_values, 0.84);

    addWeightedValues(profile.decision_contexts, graphRelationshipTags, 0.9);
    addWeightedValues(profile.decision_contexts, linkedCapabilities, 0.4);
    addWeightedValues(profile.decision_contexts, signals.structured_signal_values, 0.92);

    addWeightedValues(profile.specialized_contexts, capabilityTags, 0.82);
    addWeightedValues(profile.specialized_contexts, linkedCapabilities, 0.68);
    addWeightedValues(profile.specialized_contexts, requirementClusterTags, 0.64);
    addWeightedValues(profile.specialized_contexts, signals.structured_signal_values, 0.86);
    addWeightedSubContextValues(profile.specialized_contexts, evidenceSubContextTokens, 1.16);
    addWeightedSubContextValues(profile.specialized_contexts, actionObjectSubContextTokens, 1.08);
    addWeightedSubContextValues(profile.decision_contexts, evidenceSubContextTokens, 0.86);
    addWeightedSubContextValues(profile.decision_contexts, actionObjectSubContextTokens, 0.94);
    addWeightedSubContextValues(profile.work_modes, evidenceSubContextTokens, 0.74);
    addWeightedSubContextValues(profile.work_modes, actionObjectSubContextTokens, 1);

    const hasStructuredSignals = linkedCapabilities.length > 0
        || capabilityTags.length > 0
        || graphRelationshipTags.length > 0
        || requirementClusterTags.length > 0
        || signals.structured_signal_values.length > 0;
    const lexicalWeight = hasStructuredSignals ? 0.58 : 0.96;
    addWeightedValues(profile.functional_domains, evidenceLexicalCorpus, lexicalWeight * 0.7);
    addWeightedValues(profile.work_modes, evidenceLexicalCorpus, lexicalWeight * 0.92);
    addWeightedValues(profile.decision_contexts, evidenceLexicalCorpus, lexicalWeight * 0.84);
    addWeightedValues(profile.specialized_contexts, evidenceLexicalCorpus, lexicalWeight * 0.78);

    return normalizedProfile(profile);
}

export function computeEvidenceRoleContextAffinity(
    evidence: EvidencePiece,
    roleContextProfile: RoleContextProfile,
    capabilityGraph: EvidenceRoleContextGraphInput = {},
): RoleContextAffinityResult {
    const evidenceContextProfile = computeEvidenceRoleContextProfile(evidence, capabilityGraph);
    const evidenceSignals = computeEvidenceContextSignals(evidence, capabilityGraph);
    const baseAlignment = profileSimilarity({
        roleContextProfile,
        projectedContextProfile: evidenceContextProfile,
    });
    const dominantRoleContextTokens = getDominantRoleContextTokens(roleContextProfile, 10);
    const evidenceSubContextTokens = evidenceSignals.evidence_sub_context_tokens;

    const overlapMatches = {
        functional_domains: Object.keys(evidenceContextProfile.functional_domains)
            .filter((key) => roleContextProfile.functional_domains[key] !== undefined),
        work_modes: Object.keys(evidenceContextProfile.work_modes)
            .filter((key) => roleContextProfile.work_modes[key] !== undefined),
        decision_contexts: Object.keys(evidenceContextProfile.decision_contexts)
            .filter((key) => roleContextProfile.decision_contexts[key] !== undefined),
        specialized_contexts: Object.keys(evidenceContextProfile.specialized_contexts)
            .filter((key) => roleContextProfile.specialized_contexts[key] !== undefined),
    };
    const matchedRoleContexts = toMatchedRoleContexts(overlapMatches, roleContextProfile, evidenceContextProfile);
    const matchedRoleContextTokens = matchedRoleContexts
        .map((label) => toSubContextTokenFromRoleContextLabel(label))
        .filter(Boolean);
    const matchedSubContextTokens = evidenceSubContextTokens.filter((token) => matchedRoleContextTokens.includes(token));
    const dominantMatchedTokens = evidenceSubContextTokens
        .filter((token) => dominantRoleContextTokens.includes(token));
    const specificMatches = matchedSubContextTokens
        .filter((token) => !isBroadGenericSubContextToken(token));
    const specificMatchStrength = specificMatches.reduce(
        (sum, token) => sum + subContextTokenSpecificity(token),
        0,
    );
    const specializationSignalStrength = clamp01(
        (Math.min(10, specificMatchStrength) * 0.08)
        + (Math.min(6, dominantMatchedTokens.length) * 0.05)
        + (evidenceSignals.specialization_signal_strength * 0.42)
        + (evidenceSignals.impact_signal_strength * 0.08),
    );
    const specificityBonus = Math.min(
        0.42,
        (specificMatchStrength * 0.045)
        + (dominantMatchedTokens.length * 0.07),
    );
    const broadMatchedCount = matchedSubContextTokens.filter((token) => isBroadGenericSubContextToken(token)).length;
    const matchedCount = matchedSubContextTokens.length;
    const broadShare = matchedCount > 0 ? (broadMatchedCount / matchedCount) : 1;
    const matchedTokenEntropy = normalizedEntropyFromWeights(
        matchedSubContextTokens.map((token) => subContextTokenSpecificity(token)),
    );
    const broadPenalty = Math.min(
        0.38,
        (broadShare >= 0.72 ? 0.18 : 0)
        + (specificMatches.length === 0 && matchedCount > 0 ? 0.12 : 0)
        + (baseAlignment < 0.2 && broadShare > 0.5 ? 0.08 : 0)
        + (specificMatches.length === 0 && matchedTokenEntropy < 0.45 ? 0.05 : 0),
    );
    const dominantSpecificRoleTokens = dominantRoleContextTokens
        .filter((token) => !isBroadGenericSubContextToken(token));
    const dominantSpecificOverlapCount = dominantSpecificRoleTokens
        .filter((token) => evidenceSubContextTokens.includes(token))
        .length;
    const dominantSpecificMismatchRatio = dominantSpecificRoleTokens.length > 0
        ? 1 - (dominantSpecificOverlapCount / dominantSpecificRoleTokens.length)
        : 0;
    const dominant_context_mismatch_penalty = Math.min(
        0.3,
        (dominantRoleContextTokens.length >= 2 && dominantMatchedTokens.length === 0 ? 0.1 : 0)
        + (dominantSpecificRoleTokens.length >= 2 ? dominantSpecificMismatchRatio * 0.18 : 0),
    );
    const genericityScore = Number(clamp01(
        (evidenceSignals.genericity_score * 0.62)
        + (broadShare * 0.38),
    ).toFixed(4));
    const contextSignalStrength = evidenceSignals.context_signal_strength;
    const impactSignalStrength = evidenceSignals.impact_signal_strength;
    const adjustedAlignment = clamp01(
        baseAlignment
        * (1 + specificityBonus)
        * (1 - broadPenalty)
        * (1 - dominant_context_mismatch_penalty)
        * (0.92 + (impactSignalStrength * 0.18)),
    );
    const primaryContextToken = selectPrimaryContextToken({
        subContextTokens: evidenceSubContextTokens,
        dominantRoleContextTokens,
        matchedRoleContexts,
    });

    return {
        alignment: Number(adjustedAlignment.toFixed(4)),
        matched_role_contexts: matchedRoleContexts,
        evidence_context_profile: evidenceContextProfile,
        sub_context_tokens: evidenceSubContextTokens.slice(0, 12),
        primary_context_token: primaryContextToken,
        specificity_bonus: Number(specificityBonus.toFixed(4)),
        broad_penalty: Number(broadPenalty.toFixed(4)),
        dominant_context_mismatch_penalty: Number(dominant_context_mismatch_penalty.toFixed(4)),
        context_signal_strength: Number(contextSignalStrength.toFixed(4)),
        genericity_score: genericityScore,
        specialization_signal_strength: Number(specializationSignalStrength.toFixed(4)),
        impact_signal_strength: Number(impactSignalStrength.toFixed(4)),
        source_reason: evidenceSignals.source_reason_tags.slice(0, 4).join("|"),
    };
}

export function getStrongRoleContextSignals(
    roleContextProfile: RoleContextProfile,
    threshold = 0.72,
): string[] {
    const entries: Array<{ key: string; weight: number }> = [];
    const collect = (axis: AxisName) => {
        for (const [key, value] of Object.entries(roleContextProfile[axis])) {
            if (value < threshold) continue;
            entries.push({
                key: `${axis}:${key}`,
                weight: value,
            });
        }
    };
    collect("functional_domains");
    collect("work_modes");
    collect("decision_contexts");
    collect("specialized_contexts");
    return entries
        .sort((left, right) => {
            if (right.weight !== left.weight) return right.weight - left.weight;
            return left.key.localeCompare(right.key);
        })
        .map((entry) => entry.key)
        .slice(0, 12);
}
