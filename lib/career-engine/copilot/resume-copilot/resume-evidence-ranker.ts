import { getCapabilitiesForExperience } from "@/lib/career-engine/capability/capability-graph";
import type {
    RankedResumeEvidence,
    ResumeEvidencePoolEntry,
    ResumeCopilotIntelligenceContext,
    ResumeCopilotJobSignals,
    ResumeScoreBreakdown,
} from "./resume-copilot-types";

const STOPWORDS = new Set([
    "a", "an", "and", "the", "or", "for", "to", "of", "in", "on", "with", "by", "at", "from",
    "into", "across", "through", "over", "under", "about", "as", "is", "are", "was", "were",
    "be", "been", "being", "that", "this", "these", "those", "it", "its", "their", "his", "her",
    "our", "my", "your", "you", "we", "they", "he", "she", "i", "will", "can", "could", "should",
]);

const ROLE_FAMILY_SYNONYMS: Record<string, string[]> = {
    analytics: ["analytics", "analyst", "analysis", "insights", "reporting", "bi"],
    product: ["product", "roadmap", "feature", "backlog", "discovery"],
    strategy: ["strategy", "strategic", "planning", "transformation"],
    program: ["program", "programme", "pmo", "governance", "delivery"],
    marketing: ["marketing", "campaign", "media", "customer"],
    data: ["data", "sql", "model", "pipeline", "warehouse"],
};

const WEAK_JD_GENERIC_KEYWORDS = new Set([
    "data",
    "insights",
    "analysis",
    "using",
    "led",
    "campaign",
    "marketing",
]);

const SENIORITY_HIGH = ["head", "director", "principal", "lead", "manager", "owner"];
const SENIORITY_LOW = ["junior", "assistant", "coordinator", "intern", "office manager", "administrator"];

function normalizeText(input: string): string {
    return input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9\s/+&-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(input: string): string[] {
    return normalizeText(input)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function overlapTerms(haystackTokens: string[], signalTokens: string[]): string[] {
    const haystack = new Set(haystackTokens);
    return Array.from(new Set(signalTokens.filter((token) => haystack.has(token))));
}

function overlapPhrases(rawText: string, phrases: string[]): string[] {
    const text = normalizeText(rawText);
    return phrases.filter((phrase) => {
        const normalized = normalizeText(phrase);
        if (!normalized) return false;
        if (text.includes(normalized)) return true;

        const phraseTokens = tokenize(normalized);
        const textTokens = new Set(tokenize(text));
        return phraseTokens.length > 1 && phraseTokens.every((token) => textTokens.has(token));
    });
}

function roleFamilyCandidates(roleFamily: string | null): string[] {
    if (!roleFamily) return [];
    const normalized = normalizeText(roleFamily);
    return Array.from(new Set([normalized, ...(ROLE_FAMILY_SYNONYMS[normalized] ?? [])]));
}

function matchRoleFamily(roleFamily: string | null, rawText: string, roleText: string): string[] {
    const candidates = roleFamilyCandidates(roleFamily);
    if (candidates.length === 0) return [];

    const fullText = `${normalizeText(rawText)} ${normalizeText(roleText)}`;
    return candidates.filter((candidate) => fullText.includes(candidate));
}

function compareRankedEvidence(a: RankedResumeEvidence, b: RankedResumeEvidence): number {
    if (b.score.total_score !== a.score.total_score) {
        return b.score.total_score - a.score.total_score;
    }
    if (a.experienceOrder !== b.experienceOrder) {
        return a.experienceOrder - b.experienceOrder;
    }

    const sortA = a.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
    const sortB = b.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) return sortA - sortB;

    if (a.evidence.created_at !== b.evidence.created_at) {
        return a.evidence.created_at.localeCompare(b.evidence.created_at);
    }
    return a.evidence.id.localeCompare(b.evidence.id);
}

function extractRecencyScore(dateRange: string): number {
    const matches = dateRange.match(/\b(19|20)\d{2}\b/g) ?? [];
    if (matches.length === 0) return 0;
    return Math.max(...matches.map((value) => Number.parseInt(value, 10)));
}

function weakJdMode(params: {
    jobSignals: ResumeCopilotJobSignals;
    intelligence: ResumeCopilotIntelligenceContext;
}): boolean {
    const noTitle = !(params.jobSignals.target_title ?? "").trim();
    const noRoleFamily = !(params.jobSignals.role_family ?? "").trim();
    const noRequiredSkills = params.jobSignals.required_skills.length === 0;
    const noResponsibilities = params.jobSignals.responsibilities.length === 0;
    const noMatchedCapabilities = (params.intelligence.roleFit?.matchedCapabilities.length ?? 0) === 0;
    return noTitle && noRoleFamily && noRequiredSkills && noResponsibilities && noMatchedCapabilities;
}

function hasAny(text: string, phrases: string[]): boolean {
    return phrases.some((phrase) => text.includes(phrase));
}

function weakJdBoosts(params: {
    evidenceText: string;
    roleText: string;
    dateRange: string;
}): {
    weak_jd_recency_boost: number;
    weak_jd_seniority_boost: number;
    weak_jd_impact_boost: number;
    weak_jd_ownership_boost: number;
    weak_jd_specificity_boost: number;
} {
    const normalizedEvidence = normalizeText(params.evidenceText);
    const normalizedRole = normalizeText(params.roleText);
    const recency = extractRecencyScore(params.dateRange);
    const recencyYear = recency > 0 ? recency : 2000;
    const recencyBoost = Math.max(0, Math.min(4, (recencyYear - 2019) * 0.5));

    const seniorityHigh = hasAny(normalizedRole, SENIORITY_HIGH);
    const seniorityLow = hasAny(normalizedRole, SENIORITY_LOW);
    const seniorityBoost = seniorityHigh ? 3 : (seniorityLow ? -2 : 0);

    const impactBoost = /\$|\b(k|m|b|million|billion|%|percent|revenue|growth|reduced|improved|increase)\b/i.test(params.evidenceText)
        ? 2
        : 0;

    const ownershipBoost = /\b(own|owned|ownership|transformation|strategy|strategic|automation|leadership|roadmap)\b/i.test(params.evidenceText)
        ? 2
        : 0;

    const specificityBoost = (() => {
        const tokens = tokenize(normalizedEvidence);
        const longTokens = new Set(tokens.filter((token) => token.length >= 6));
        const toolHint = /\b(power bi|sql|python|pipeline|semantic layer|governance|product)\b/i.test(params.evidenceText) ? 1 : 0;
        return Math.min(2, (longTokens.size >= 8 ? 1 : 0) + toolHint);
    })();

    return {
        weak_jd_recency_boost: recencyBoost,
        weak_jd_seniority_boost: seniorityBoost,
        weak_jd_impact_boost: impactBoost,
        weak_jd_ownership_boost: ownershipBoost,
        weak_jd_specificity_boost: specificityBoost,
    };
}

export function rankResumeEvidence(params: {
    intelligence: ResumeCopilotIntelligenceContext;
    evidencePool: ResumeEvidencePoolEntry[];
    jobSignals: ResumeCopilotJobSignals;
}): RankedResumeEvidence[] {
    const { intelligence, jobSignals } = params;
    const isWeakJd = weakJdMode({ intelligence, jobSignals });
    const experienceOrder = new Map<string, number>();
    intelligence.careerGraph.experiences.forEach((experience, index) => {
        experienceOrder.set(experience.id, experience.sort_order ?? index);
    });

    const roleFitEvidenceIds = new Set(intelligence.roleFit?.supportingEvidence.map((evidence) => evidence.id) ?? []);
    const signalHighlightIds = new Set(intelligence.careerSignals.evidenceHighlights.map((evidence) => evidence.id));

    return params.evidencePool
        .map((poolEntry) => {
            const evidence = poolEntry.evidence;
            const rawText = evidence.raw_text;
            const roleText = evidence.role ?? "";
            const rawTokens = tokenize(rawText);
            const requiredSkillMatches = overlapPhrases(rawText, jobSignals.required_skills);
            const preferredSkillMatches = overlapPhrases(rawText, jobSignals.preferred_skills);
            const responsibilityMatches = overlapPhrases(rawText, jobSignals.responsibilities);
            const rawKeywordMatches = overlapTerms(rawTokens, jobSignals.keywords.flatMap((keyword) => tokenize(keyword)));
            const keywordMatches = isWeakJd
                ? rawKeywordMatches.filter((keyword) => !WEAK_JD_GENERIC_KEYWORDS.has(keyword))
                : rawKeywordMatches;
            const domainMatches = overlapTerms(rawTokens, jobSignals.domains.flatMap((domain) => tokenize(domain)));
            const roleFamilyMatches = matchRoleFamily(jobSignals.role_family, rawText, roleText);

            const capabilitiesForExperience = getCapabilitiesForExperience(
                intelligence.careerGraph,
                evidence.experience_id,
            );
            const matchedCapabilities = capabilitiesForExperience
                .filter((capability) => {
                    const capabilityTokens = tokenize(capability.name);
                    const requiredSkillTokens = new Set(jobSignals.required_skills.flatMap((skill) => tokenize(skill)));
                    const roleFamilyTokens = new Set(tokenize(jobSignals.role_family ?? ""));
                    return capabilityTokens.some((token) => requiredSkillTokens.has(token) || roleFamilyTokens.has(token));
                })
                .map((capability) => capability.name);

            const capabilityAlignmentBonus = matchedCapabilities.length > 0 ? 2 : 0;
            const roleFitEvidenceBonus = roleFitEvidenceIds.has(evidence.id) ? 2 : 0;
            const careerSignalHighlightBonus = signalHighlightIds.has(evidence.id) ? 1 : 0;
            const weakBoosts = isWeakJd
                ? weakJdBoosts({
                    evidenceText: rawText,
                    roleText,
                    dateRange: evidence.date_range,
                })
                : {
                    weak_jd_recency_boost: 0,
                    weak_jd_seniority_boost: 0,
                    weak_jd_impact_boost: 0,
                    weak_jd_ownership_boost: 0,
                    weak_jd_specificity_boost: 0,
                };

            const breakdown: ResumeScoreBreakdown = {
                keyword_overlap: keywordMatches.length * (isWeakJd ? 0.25 : 1),
                required_skill_overlap: requiredSkillMatches.length * 4,
                preferred_skill_overlap: preferredSkillMatches.length * 2,
                responsibility_overlap: responsibilityMatches.length * 3,
                role_family_overlap: roleFamilyMatches.length * 2,
                domain_overlap: domainMatches.length * 2,
                capability_alignment_bonus: capabilityAlignmentBonus,
                role_fit_evidence_bonus: roleFitEvidenceBonus,
                career_signal_highlight_bonus: careerSignalHighlightBonus,
                weak_jd_recency_boost: weakBoosts.weak_jd_recency_boost,
                weak_jd_seniority_boost: weakBoosts.weak_jd_seniority_boost,
                weak_jd_impact_boost: weakBoosts.weak_jd_impact_boost,
                weak_jd_ownership_boost: weakBoosts.weak_jd_ownership_boost,
                weak_jd_specificity_boost: weakBoosts.weak_jd_specificity_boost,
                coverage_novelty_bonus: 0,
                total_score: 0,
                matched_required_skills: requiredSkillMatches,
                matched_preferred_skills: preferredSkillMatches,
                matched_responsibilities: responsibilityMatches,
                matched_keywords: keywordMatches,
                matched_domains: domainMatches,
                matched_role_family_terms: roleFamilyMatches,
                matched_capabilities: matchedCapabilities,
            };

            breakdown.total_score =
                breakdown.keyword_overlap +
                breakdown.required_skill_overlap +
                breakdown.preferred_skill_overlap +
                breakdown.responsibility_overlap +
                breakdown.role_family_overlap +
                breakdown.domain_overlap +
                breakdown.capability_alignment_bonus +
                breakdown.role_fit_evidence_bonus +
                breakdown.career_signal_highlight_bonus +
                (breakdown.weak_jd_recency_boost ?? 0) +
                (breakdown.weak_jd_seniority_boost ?? 0) +
                (breakdown.weak_jd_impact_boost ?? 0) +
                (breakdown.weak_jd_ownership_boost ?? 0) +
                (breakdown.weak_jd_specificity_boost ?? 0);

            const matchedSignals = Array.from(
                new Set([
                    ...requiredSkillMatches,
                    ...responsibilityMatches,
                    ...preferredSkillMatches,
                    ...roleFamilyMatches,
                    ...domainMatches,
                    ...matchedCapabilities,
                ]),
            );

            return {
                evidence,
                poolSources: poolEntry.poolSources,
                score: breakdown,
                matchedSignals,
                experienceOrder: experienceOrder.get(evidence.experience_id) ?? Number.MAX_SAFE_INTEGER,
            };
        })
        .filter((ranked) => ranked.score.total_score > 0)
        .sort(compareRankedEvidence);
}
