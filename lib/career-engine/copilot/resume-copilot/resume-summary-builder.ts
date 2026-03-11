import type { RankedResumeEvidence, ResumeSummaryDebug } from "./resume-copilot-types";

export type ResumeSummaryEvidenceItem = {
    evidence_piece_id: string;
    company: string;
    role: string;
    date_range: string;
    rewritten_bullet: string;
    original_bullet: string;
    score: number;
    matched_signals?: string[];
    matched_capabilities?: string[];
};

function normalizeText(input: string): string {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s/+&-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractRecencyScore(dateRange: string): number {
    const matches = dateRange.match(/\b(19|20)\d{2}\b/g) ?? [];
    if (matches.length === 0) return 0;
    return Math.max(...matches.map((value) => Number.parseInt(value, 10)));
}

function roleFamilyToDisplay(roleFamily: string | null | undefined): string | null {
    const value = (roleFamily ?? "").trim();
    if (!value) return null;
    return value
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function cleanRoleTitle(raw: string): string {
    return raw
        .replace(/\|.*$/g, "")
        .replace(/\s*,\s*[^,|]+$/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function cleanCompanyName(raw: string): string {
    return raw
        .replace(/\|.*$/g, "")
        .replace(/\s*,\s*[^,|]+$/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function buildRoleDescriptor(params: {
    targetTitle: string | null | undefined;
    roleFamily: string | null | undefined;
    fallbackRole: string | undefined;
}): string {
    const target = cleanRoleTitle((params.targetTitle ?? "").trim());
    const family = roleFamilyToDisplay(params.roleFamily);
    const fallback = cleanRoleTitle(params.fallbackRole ?? "");
    const base = target || family || fallback;
    const normalized = normalizeText(base);

    const hasAnalytics = /\banalytics?\b/.test(normalized);
    const hasProduct = /\bproduct\b/.test(normalized);
    const hasCommercial = /\bcommercial|revenue|growth|monetization\b/.test(normalized);

    if (hasCommercial && hasAnalytics && hasProduct) return "Commercial analytics and product leader";
    if (hasCommercial && hasAnalytics) return "Commercial analytics leader";
    if (hasAnalytics && hasProduct) return "Analytics and product leader";
    if (hasAnalytics) return "Analytics leader";
    if (hasProduct) return "Product and analytics leader";

    if (base) {
        const functionalCore = base
            .replace(/\b(manager|lead|director|head|principal|owner|specialist)\b/gi, "")
            .replace(/[|/]+/g, " ")
            .replace(/\s*&\s*/g, " and ")
            .replace(/\s{2,}/g, " ")
            .trim();
        return `${functionalCore || "Professional"} leader`
            .replace(/\s{2,}/g, " ")
            .replace(/^\w/, (char) => char.toUpperCase());
    }
    return "Analytics leader";
}

function sentenceCase(value: string): string {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return cleaned;
    const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function joinList(values: string[]): string {
    if (values.length <= 1) return values[0] ?? "";
    if (values.length === 2) return `${values[0]} and ${values[1]}`;
    return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

const THEME_RULES: Array<{ label: string; tokens: string[] }> = [
    { label: "revenue opportunity identification", tokens: ["revenue", "growth", "monetization"] },
    { label: "executive decision support", tokens: ["executive", "decision", "reporting", "dashboard", "insight", "insights"] },
    { label: "analytics automation", tokens: ["automation", "ai", "llm", "pipeline"] },
    { label: "product roadmap leadership", tokens: ["roadmap", "product owner", "lifecycle"] },
    { label: "stakeholder leadership", tokens: ["stakeholder", "advisor", "cross-functional"] },
    { label: "team leadership", tokens: ["leadership", "team", "capability"] },
    { label: "bi transformation", tokens: ["power bi", "semantic layer", "governance"] },
];

function extractThemes(params: {
    topEvidence: ResumeSummaryEvidenceItem[];
    matchedCapabilities: string[];
}): string[] {
    const evidenceCorpus = params.topEvidence.map((item) =>
        normalizeText(`${item.rewritten_bullet} ${item.original_bullet}`),
    );
    const capabilityCorpus = normalizeText(params.matchedCapabilities.join(" "));

    const scoredThemes = THEME_RULES
        .map((rule, index) => {
            const tokenMatchesInEvidence = evidenceCorpus.reduce((count, block) => (
                count + Number(rule.tokens.some((token) => block.includes(normalizeText(token))))
            ), 0);
            const tokenMatchInCapabilities = Number(
                rule.tokens.some((token) => capabilityCorpus.includes(normalizeText(token))),
            );
            return {
                label: rule.label,
                score: (tokenMatchesInEvidence * 3) + tokenMatchInCapabilities,
                index,
            };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.index - b.index;
        })
        .map((item) => item.label);

    if (scoredThemes.length > 0) return unique(scoredThemes).slice(0, 5);
    return unique(params.matchedCapabilities.map((capability) => capability.toLowerCase())).slice(0, 3);
}

function normalizeCapabilityPhrase(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

const CONCRETE_THEME_PREFERENCE = [
    "revenue opportunity identification",
    "executive decision support",
    "analytics automation",
    "product roadmap leadership",
    "stakeholder leadership",
];

function prioritizeConcreteThemes(themes: string[]): string[] {
    const set = new Set(themes);
    const preferred = CONCRETE_THEME_PREFERENCE.filter((theme) => set.has(theme));
    const remaining = themes.filter((theme) => !preferred.includes(theme));
    return [...preferred, ...remaining];
}

function titleSeniorityScore(role: string): number {
    const normalized = normalizeText(role);
    if (/\b(head|director|principal|lead|manager|owner)\b/.test(normalized)) return 3;
    if (/\b(junior|assistant|coordinator|intern|office manager|administrator)\b/.test(normalized)) return -3;
    return 0;
}

function rankExperiences(selectedEvidence: ResumeSummaryEvidenceItem[]): Array<{
    key: string;
    company: string;
    role: string;
    date_range: string;
    score: number;
    recency_rank: number;
    items: ResumeSummaryEvidenceItem[];
}> {
    const grouped = new Map<string, {
        company: string;
        role: string;
        date_range: string;
        topEvidenceScore: number;
        recencyScore: number;
        seniorityScore: number;
        items: ResumeSummaryEvidenceItem[];
    }>();

    for (const item of selectedEvidence) {
        const key = `${item.company}||${item.role}||${item.date_range}`;
        const existing = grouped.get(key);
        const recency = extractRecencyScore(item.date_range);
        if (!existing) {
            grouped.set(key, {
                company: item.company,
                role: item.role,
                date_range: item.date_range,
                topEvidenceScore: item.score,
                recencyScore: recency,
                seniorityScore: titleSeniorityScore(item.role),
                items: [item],
            });
            continue;
        }

        existing.topEvidenceScore = Math.max(existing.topEvidenceScore, item.score);
        existing.recencyScore = Math.max(existing.recencyScore, recency);
        existing.items.push(item);
    }

    const ranked = Array.from(grouped.entries())
        .map(([key, value]) => ({
            key,
            ...value,
            score: value.topEvidenceScore + (value.recencyScore * 0.05) + value.seniorityScore,
        }))
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.recencyScore !== a.recencyScore) return b.recencyScore - a.recencyScore;
            return a.company.localeCompare(b.company);
        });

    return ranked.map((item, index) => ({
        key: item.key,
        company: item.company,
        role: item.role,
        date_range: item.date_range,
        score: item.score,
        recency_rank: index + 1,
        items: item.items,
    }));
}

function toSummaryInput(selectedEvidence: RankedResumeEvidence[]): ResumeSummaryEvidenceItem[] {
    return selectedEvidence
        .map((item) => ({
            evidence_piece_id: item.evidence.id,
            company: item.evidence.company,
            role: item.evidence.role,
            date_range: item.evidence.date_range,
            rewritten_bullet: item.evidence.raw_text,
            original_bullet: item.evidence.raw_text,
            score: item.score.total_score,
            matched_signals: item.matchedSignals,
            matched_capabilities: item.score.matched_capabilities,
        }))
        .filter((item) => item.score > 0 && item.rewritten_bullet.trim().length > 0);
}

export function buildResumeSummary(params: {
    selectedEvidence: Array<{
        evidence_piece_id: string;
        company: string;
        role: string;
        date_range: string;
        rewritten_bullet: string;
        original_bullet: string;
        score: number;
        matched_signals?: string[];
        matched_capabilities?: string[];
    }>;
    matchedCapabilities: string[];
    targetTitle?: string | null;
    roleFamily?: string | null;
    weakJdModeOverride?: boolean;
}): { summary: string | null; summary_debug: ResumeSummaryDebug } {
    const cleanedSelected = params.selectedEvidence.filter((item) =>
        item.rewritten_bullet.trim().length > 0
        && item.original_bullet.trim().length > 0
        && item.score > 0,
    );

    const matchedCapabilities = unique([
        ...params.matchedCapabilities,
        ...cleanedSelected.flatMap((item) => item.matched_capabilities ?? []),
    ]);

    const weakJdMode = params.weakJdModeOverride ?? (
        !(params.targetTitle ?? "").trim()
        && !(params.roleFamily ?? "").trim()
        && matchedCapabilities.length === 0
    );

    if (cleanedSelected.length === 0) {
        return {
            summary: null,
            summary_debug: {
                weak_jd_mode: weakJdMode,
                source_evidence_ids: [],
                source_companies: [],
                source_roles: [],
                source_themes: [],
                source_matched_capabilities: matchedCapabilities,
                target_title_used: params.targetTitle ?? null,
                role_family_used: params.roleFamily ?? null,
                ranked_experience_order: [],
            },
        };
    }

    const rankedExperiences = rankExperiences(cleanedSelected);
    const topExperienceGroups = rankedExperiences.slice(0, 2);
    const topEvidence = topExperienceGroups
        .flatMap((group) => group.items)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const recencyA = extractRecencyScore(a.date_range);
            const recencyB = extractRecencyScore(b.date_range);
            if (recencyB !== recencyA) return recencyB - recencyA;
            return a.evidence_piece_id.localeCompare(b.evidence_piece_id);
        })
        .slice(0, 5);

    const themes = extractThemes({
        topEvidence,
        matchedCapabilities,
    });

    const sourceCompanies = unique(topExperienceGroups.map((group) => cleanCompanyName(group.company))).slice(0, 2);
    const sourceRoles = unique(topExperienceGroups.map((group) => group.role)).slice(0, 2);

    const targetTitleUsed = (params.targetTitle ?? "").trim() || null;
    const roleFamilyUsed = (params.roleFamily ?? "").trim() || null;
    const roleDescriptor = buildRoleDescriptor({
        targetTitle: targetTitleUsed,
        roleFamily: roleFamilyUsed,
        fallbackRole: sourceRoles[0],
    });

    const orderedThemes = prioritizeConcreteThemes(themes);
    const sentence2Themes = orderedThemes.slice(0, 3);
    const capabilityPhrases = unique(matchedCapabilities.map(normalizeCapabilityPhrase)).slice(0, 3);
    const profileThemeCandidates = unique([
        ...capabilityPhrases,
        ...orderedThemes,
    ]);
    const sentence1Themes = profileThemeCandidates
        .filter((theme) => !sentence2Themes.includes(theme))
        .slice(0, 2);

    const sentence1 = sentenceCase(
        sentence1Themes.length > 0
            ? `${roleDescriptor} with strengths in ${joinList(sentence1Themes)}`
            : `${roleDescriptor} with strength in strategic analytics leadership`,
    );
    const sentence2 = sentenceCase(
        sentence2Themes.length > 0
            ? `Recent work across ${joinList(sourceCompanies)} includes ${joinList(sentence2Themes)}`
            : capabilityPhrases.length > 0
                ? `Recent work across ${joinList(sourceCompanies)} includes ${joinList(capabilityPhrases.slice(0, 2))}`
                : `Recent work across ${joinList(sourceCompanies)} includes analytics delivery and stakeholder collaboration`,
    );

    return {
        summary: [sentence1, sentence2].filter(Boolean).slice(0, 2).join(" "),
        summary_debug: {
            weak_jd_mode: weakJdMode,
            source_evidence_ids: topEvidence.map((item) => item.evidence_piece_id),
            source_companies: sourceCompanies,
            source_roles: sourceRoles,
            source_themes: themes,
            source_matched_capabilities: matchedCapabilities,
            target_title_used: targetTitleUsed,
            role_family_used: roleFamilyUsed,
            ranked_experience_order: rankedExperiences.map((item) => ({
                company: item.company,
                role: item.role,
                score: Number(item.score.toFixed(2)),
                recency_rank: item.recency_rank,
            })),
        },
    };
}

export function buildGroundedResumeSummary(params: {
    selectedEvidence: RankedResumeEvidence[];
    jobSignals: {
        target_title: string | null;
        role_family: string | null;
        required_skills?: string[];
        responsibilities?: string[];
    };
}): { summary: string | null; matchedCapabilities: string[]; summary_debug: ResumeSummaryDebug } {
    const selected = toSummaryInput(params.selectedEvidence);
    const matchedCapabilities = unique(
        params.selectedEvidence.flatMap((item) => item.score.matched_capabilities),
    );

    const weakJdMode = !(params.jobSignals.target_title ?? "").trim()
        && !(params.jobSignals.role_family ?? "").trim()
        && (params.jobSignals.required_skills?.length ?? 0) === 0
        && (params.jobSignals.responsibilities?.length ?? 0) === 0
        && matchedCapabilities.length === 0;

    const result = buildResumeSummary({
        selectedEvidence: selected,
        matchedCapabilities,
        targetTitle: params.jobSignals.target_title,
        roleFamily: params.jobSignals.role_family,
        weakJdModeOverride: weakJdMode,
    });

    return {
        summary: result.summary,
        matchedCapabilities,
        summary_debug: result.summary_debug,
    };
}
