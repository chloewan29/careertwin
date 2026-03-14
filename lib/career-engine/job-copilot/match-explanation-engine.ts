import type {
    JobAnalysisConfidence,
    JobAnalysisEvidenceHighlight,
    JobAnalysisFitLevel,
    JobAnalysisProfileQuality,
    JobAnalysisRisk,
    MatchExplanation,
    MatchExplanationItem,
} from "@/lib/career-engine/job-copilot/job-analysis";

const GENERIC_CAPABILITY_KEYS = new Set([
    "communication",
    "leadership",
    "teamwork",
    "problem solving",
    "stakeholder management",
    "stakeholder engagement",
    "project management",
    "strategy",
]);

const STOPWORDS = new Set([
    "the", "and", "for", "with", "from", "into", "across", "that", "this", "your", "you", "our", "their",
    "was", "were", "are", "is", "of", "to", "in", "on", "by", "as", "at", "or", "an", "a", "role", "focus",
    "experience", "work", "background", "team", "teams",
]);

const ACTION_VERBS = new Set([
    "led", "built", "owned", "delivered", "managed", "drove", "presented", "improved", "created", "designed",
    "launched", "optimized", "translated", "implemented", "developed", "executed",
]);

type CapabilityCategory =
    | "analytics"
    | "stakeholder"
    | "strategy"
    | "experimentation"
    | "customer_insight"
    | "general";

type BuildMatchExplanationParams = {
    matchScore: number;
    fitLevel: JobAnalysisFitLevel;
    topMatchedCapabilities: string[];
    keyGaps: string[];
    atsRisks: JobAnalysisRisk[];
    evidenceHighlights: JobAnalysisEvidenceHighlight[];
    jobProfileQuality: JobAnalysisProfileQuality;
    scoreConfidence: JobAnalysisConfidence;
    interpretationNote?: string;
    jdTitle?: string | null;
    jdRoleFamily?: string | null;
    requiredSkills?: string[];
    responsibilities?: string[];
};

type RankedStrength = {
    title: string;
    score: number;
    evidenceLabel: string | null;
};

function dedupeStrings(values: string[]): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    );
}

function toVerdictLabel(matchScore: number, fitLevel: JobAnalysisFitLevel): MatchExplanation["verdict_label"] {
    if (matchScore >= 85) return "Excellent Match";
    if (fitLevel === "strong" || matchScore >= 75) return "Strong Match";
    if (fitLevel === "moderate" || matchScore >= 50) return "Moderate Match";
    if (fitLevel === "stretch" || matchScore >= 42) return "Stretch";
    return "Low Match";
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function enforceMaxWords(sentence: string, maxWords: number): string {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return sentence.trim();
    const trimmed = words.slice(0, maxWords).join(" ").replace(/[;,:]$/, "");
    return `${trimmed}.`;
}

function classifyCapability(capability: string): CapabilityCategory {
    const value = capability.toLowerCase();
    if (/\b(analytics|analysis|measurement|reporting|dashboard|bi|data)\b/.test(value)) return "analytics";
    if (/\b(stakeholder|cross[- ]functional|collaboration|influence|storytelling)\b/.test(value)) return "stakeholder";
    if (/\b(strategy|strategic|roadmap|planning|optimization)\b/.test(value)) return "strategy";
    if (/\b(experiment|testing|ab test|a\/b|hypothesis)\b/.test(value)) return "experimentation";
    if (/\b(customer|user|consumer|insight|voice)\b/.test(value)) return "customer_insight";
    return "general";
}

function deriveJobTheme(params: BuildMatchExplanationParams): string | null {
    const corpus = [
        params.jdTitle ?? "",
        params.jdRoleFamily ?? "",
        ...(params.requiredSkills ?? []),
        ...(params.responsibilities ?? []),
    ].join(" ").toLowerCase();

    if (/\b(marketing|campaign|media|brand|attribution|measurement|performance)\b/.test(corpus)) {
        return "marketing measurement";
    }
    if (/\b(product|experiment|ab test|a\/b|funnel|activation|retention)\b/.test(corpus)) {
        return "product experimentation";
    }
    if (/\b(insight|reporting|dashboard|bi|analytics|analysis|storytelling)\b/.test(corpus)) {
        return "insight generation";
    }
    if (/\b(commercial|revenue|growth|pricing|profit|roi)\b/.test(corpus)) {
        return "commercial analytics";
    }
    return null;
}

function getRoleFocusPhrase(params: BuildMatchExplanationParams): string {
    const firstRequiredSkill = (params.requiredSkills ?? []).find((item) => item.trim().length > 0)?.trim();
    if (firstRequiredSkill) return firstRequiredSkill;

    const firstResponsibility = (params.responsibilities ?? []).find((item) => item.trim().length > 0)?.trim();
    if (firstResponsibility) {
        return firstResponsibility.split(/[,:;()-]/)[0]?.trim() || "role priorities";
    }

    if (params.jdRoleFamily?.trim()) return params.jdRoleFamily.trim();
    if (params.jdTitle?.trim()) return params.jdTitle.trim();
    return "role priorities";
}

function truncatePhrase(value: string, maxWords: number): string {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return value.trim();
    return `${words.slice(0, maxWords).join(" ").trim()}...`;
}

function findBestEvidenceLabel(capability: string, evidenceLabels: string[]): string | null {
    const capTokens = new Set(tokenize(capability));
    if (capTokens.size === 0) return evidenceLabels[0] ?? null;

    let bestLabel: string | null = null;
    let bestOverlap = -1;
    for (const label of evidenceLabels) {
        const overlap = tokenize(label).filter((token) => capTokens.has(token)).length;
        if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestLabel = label;
        }
    }
    return bestLabel;
}

function buildRankedStrengths(params: BuildMatchExplanationParams): RankedStrength[] {
    const capabilities = dedupeStrings(params.topMatchedCapabilities);
    const evidenceLabels = params.evidenceHighlights
        .map((item) => item.label.trim())
        .filter((item) => item.length > 0);
    const roleTokens = new Set(
        tokenize([
            params.jdTitle ?? "",
            params.jdRoleFamily ?? "",
            ...(params.requiredSkills ?? []),
            ...(params.responsibilities ?? []),
        ].join(" ")),
    );

    return capabilities
        .map((capability, index) => {
            const capabilityTokens = tokenize(capability);
            const roleOverlap = capabilityTokens.filter((token) => roleTokens.has(token)).length;
            const evidenceLabel = findBestEvidenceLabel(capability, evidenceLabels);
            const evidenceOverlap = evidenceLabel
                ? tokenize(evidenceLabel).filter((token) => capabilityTokens.includes(token)).length
                : 0;
            const genericPenalty = GENERIC_CAPABILITY_KEYS.has(capability.toLowerCase()) ? 2 : 0;
            const specificity = Math.min(3, Math.max(1, capabilityTokens.length));
            const score = (roleOverlap * 4) + (Math.min(2, evidenceOverlap) * 2) + specificity - genericPenalty - (index * 0.01);

            return {
                title: capability,
                score,
                evidenceLabel: evidenceLabel ?? null,
            };
        })
        .sort((a, b) => b.score - a.score);
}

function buildFallbackEvidencePhrase(category: CapabilityCategory, capabilityTitle: string): string {
    if (category === "analytics") return "your analytics background";
    if (category === "stakeholder") return "your stakeholder collaboration background";
    if (category === "strategy") return "your strategy background";
    if (category === "experimentation") return "your experimentation background";
    if (category === "customer_insight") return "your customer insight background";
    return `your ${capabilityTitle.toLowerCase()} background`;
}

function extractEvidencePhrase(params: {
    evidenceLabel: string | null;
    category: CapabilityCategory;
    capabilityTitle: string;
}): string {
    const label = params.evidenceLabel?.trim();
    if (!label) {
        return buildFallbackEvidencePhrase(params.category, params.capabilityTitle);
    }

    const lower = label.toLowerCase();
    if (/\bcampaign\b/.test(lower) && /\b(analytics|measurement|performance)\b/.test(lower)) {
        return "campaign analytics experience";
    }
    if (/\bproduct\b/.test(lower) && /\b(experiment|testing|ab)\b/.test(lower)) {
        return "product experimentation experience";
    }
    if (/\b(stakeholder|cross[- ]functional|presented|executive)\b/.test(lower)) {
        return "stakeholder insight delivery experience";
    }
    if (/\b(strategy|roadmap|planning|optimization)\b/.test(lower)) {
        return "strategy planning experience";
    }
    if (/\b(customer|user|consumer|insight)\b/.test(lower)) {
        return "customer insight experience";
    }

    const candidateTokens = tokenize(label).filter((token) => !ACTION_VERBS.has(token));
    const phrase = candidateTokens.slice(0, 2).join(" ").trim();
    if (phrase.length > 0) {
        return `${phrase} experience`;
    }
    return buildFallbackEvidencePhrase(params.category, params.capabilityTitle);
}

function buildStrengthExplanation(params: {
    title: string;
    evidenceLabel: string | null;
    jobTheme: string | null;
}): string {
    const category = classifyCapability(params.title);
    const evidencePhrase = extractEvidencePhrase({
        evidenceLabel: params.evidenceLabel,
        category,
        capabilityTitle: params.title,
    });

    if (!params.jobTheme) {
        return enforceMaxWords(
            `Your experience in ${params.title.toLowerCase()} aligns with the responsibilities described in the role.`,
            20,
        );
    }

    if (category === "stakeholder") {
        return enforceMaxWords(`${evidencePhrase} supports the role's cross-functional focus in ${params.jobTheme}.`, 20);
    }
    if (category === "strategy") {
        return enforceMaxWords(`${evidencePhrase} matches the role's planning focus within ${params.jobTheme}.`, 20);
    }
    if (category === "experimentation") {
        return enforceMaxWords(`${evidencePhrase} aligns with the role's experimentation focus in ${params.jobTheme}.`, 20);
    }
    if (category === "customer_insight") {
        return enforceMaxWords(`${evidencePhrase} supports the role's focus on ${params.jobTheme} and customer insight.`, 20);
    }

    return enforceMaxWords(`${evidencePhrase} aligns with the role's focus on ${params.jobTheme}.`, 20);
}

function normalizeRiskReasoning(value: string): string {
    return value
        .replace(/\byou are missing\b/gi, "this appears less visible")
        .replace(/\bmissing\b/gi, "less visible")
        .replace(/\byou lack\b/gi, "this is less prominent")
        .replace(/\s+/g, " ")
        .trim();
}

function buildRiskItems(params: BuildMatchExplanationParams): MatchExplanationItem[] {
    const risks: MatchExplanationItem[] = [];
    const seen = new Set<string>();

    const addRisk = (item: MatchExplanationItem | null) => {
        if (!item || risks.length >= 2) return;
        const key = item.title.trim().toLowerCase();
        if (!item.title.trim() || !item.explanation.trim() || seen.has(key)) return;
        seen.add(key);
        risks.push(item);
    };

    for (const gap of dedupeStrings(params.keyGaps)) {
        addRisk({
            title: gap,
            explanation: `This role places more weight on ${gap.toLowerCase()}, so clearer examples in your background may strengthen your application positioning.`,
        });
    }

    for (const risk of params.atsRisks) {
        const title = risk.type === "title_mismatch"
            ? "Title alignment clarity"
            : "Role alignment signal";
        const raw = (risk.reasoning ?? risk.message ?? "").trim();
        if (!raw) continue;
        addRisk({
            title,
            explanation: normalizeRiskReasoning(raw),
        });
    }

    if (params.jobProfileQuality === "sparse" || params.jobProfileQuality === "empty") {
        addRisk({
            title: "Signal confidence",
            explanation: "Job signals on this page are limited, so validating role-specific examples in your CV may reduce ambiguity.",
        });
    } else if (params.scoreConfidence === "low") {
        addRisk({
            title: "Match confidence",
            explanation: "Current confidence is low, so clearer role-specific evidence may improve how strongly your fit comes through.",
        });
    }

    return risks.slice(0, 2);
}

function ensureSummaryLength(sentence: string): string {
    const cleaned = sentence.replace(/\s+/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);

    if (words.length > 25) {
        return `${words.slice(0, 25).join(" ").replace(/[;,:]$/, "")}.`;
    }
    if (words.length < 15) {
        return `${cleaned} for this role's core priorities.`;
    }
    return cleaned;
}

function buildSummary(params: {
    strengths: MatchExplanationItem[];
    roleFocus: string;
    jobProfileQuality: JobAnalysisProfileQuality;
    interpretationNote?: string;
}): string {
    const first = params.strengths[0]?.title.toLowerCase();
    const second = params.strengths[1]?.title.toLowerCase();
    const focus = truncatePhrase(params.roleFocus, 5).toLowerCase();

    if (first && second) {
        if (params.jobProfileQuality === "sparse" || params.jobProfileQuality === "empty") {
            return ensureSummaryLength(`Current job signals are limited, but your ${first} and ${second} still align with this role's ${focus} priorities.`);
        }
        return ensureSummaryLength(`Your ${first} and ${second} align with this role's ${focus} priorities, supported by evidence-backed examples from your background.`);
    }

    if (first) {
        return ensureSummaryLength(`Your ${first} aligns with this role's ${focus} priorities, with evidence suggesting practical readiness for the core responsibilities.`);
    }

    if (params.interpretationNote && params.interpretationNote.trim().length > 0) {
        return ensureSummaryLength(`${truncatePhrase(params.interpretationNote, 12)} Clearer role-specific evidence may improve confidence before applying.`);
    }

    return ensureSummaryLength("Your profile shows partial alignment with this role, and clearer role-specific evidence would improve confidence before applying.");
}

export function buildMatchExplanation(params: BuildMatchExplanationParams): MatchExplanation {
    const roleFocus = getRoleFocusPhrase(params);
    const jobTheme = deriveJobTheme(params);
    const rankedStrengths = buildRankedStrengths(params).slice(0, 3);
    const strengths: MatchExplanationItem[] = rankedStrengths.map((item) => ({
        title: item.title,
        explanation: buildStrengthExplanation({
            title: item.title,
            evidenceLabel: item.evidenceLabel,
            jobTheme,
        }),
    }));

    return {
        verdict_label: toVerdictLabel(params.matchScore, params.fitLevel),
        score: Math.round(params.matchScore),
        summary: buildSummary({
            strengths,
            roleFocus,
            jobProfileQuality: params.jobProfileQuality,
            interpretationNote: params.interpretationNote,
        }),
        strengths: strengths.slice(0, 3),
        risks: buildRiskItems(params),
    };
}
