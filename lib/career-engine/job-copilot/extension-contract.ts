export type JobCopilotSource = "linkedin" | "seek";

export type JobCopilotVerdict = "strong_fit" | "possible_fit" | "stretch" | "low_fit";

export type JobCopilotVerdictLabel = "strong fit" | "possible fit" | "stretch" | "low fit";

export const JOB_COPILOT_RESUME_READY_SCORE = 65;
export const JOB_COPILOT_RESUME_MIN_SCORE = 50;
export const JOB_COPILOT_TOP_EVIDENCE_DEFAULT = 4;
export const JOB_COPILOT_TOP_EVIDENCE_MAX = 6;

const STOPWORDS = new Set([
    "the", "and", "for", "with", "from", "into", "across", "that", "this", "your", "you", "our", "their",
    "was", "were", "are", "is", "of", "to", "in", "on", "by", "as", "at", "or", "an", "a",
]);

const DOMAIN_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: "analytics", pattern: /\b(analytics|insight|bi|dashboard|reporting)\b/i },
    { label: "data platform", pattern: /\b(data platform|data warehouse|bigquery|snowflake|etl|pipeline)\b/i },
    { label: "transformation", pattern: /\b(transformation|change|operating model|modernization)\b/i },
    { label: "strategy", pattern: /\b(strategy|strategic planning|roadmap|planning)\b/i },
    { label: "program delivery", pattern: /\b(program|portfolio|delivery|governance)\b/i },
    { label: "commercial", pattern: /\b(commercial|revenue|growth|margin|profit)\b/i },
];

export function canonicalizeJobUrl(jobUrl: string | null): string {
    const raw = (jobUrl ?? "").trim();
    if (!raw) return "";
    try {
        const parsed = new URL(raw);
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString().replace(/\/+$/, "").toLowerCase();
    } catch {
        return raw.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
    }
}

function normalizeJobTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeCompany(company: string | null): string {
    return (company ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\b(proprietary|pty|ltd|limited|inc|llc|corp|corporation|co|company)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function canonicalJobId(jobUrl: string | null, title: string, company: string | null): string {
    const canonicalUrl = canonicalizeJobUrl(jobUrl);
    if (canonicalUrl) return `url:${canonicalUrl}`;
    return `title_company:${normalizeJobTitle(title)}|${normalizeCompany(company)}`;
}

export function getVerdictFromScore(score: number): JobCopilotVerdict {
    if (score >= 80) return "strong_fit";
    if (score >= 65) return "possible_fit";
    if (score >= 50) return "stretch";
    return "low_fit";
}

export function getVerdictLabel(verdict: JobCopilotVerdict): JobCopilotVerdictLabel {
    if (verdict === "strong_fit") return "strong fit";
    if (verdict === "possible_fit") return "possible fit";
    if (verdict === "stretch") return "stretch";
    return "low fit";
}

export function normalizeTopEvidenceLimit(value: number | undefined): number {
    if (!value || Number.isNaN(value)) return JOB_COPILOT_TOP_EVIDENCE_DEFAULT;
    return Math.max(1, Math.min(JOB_COPILOT_TOP_EVIDENCE_MAX, Math.round(value)));
}

function tokenize(text: string): string[] {
    return (text ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function inferDomainTokensForJd(rawText: string, targetTitle: string | null, roleFamily: string | null): Set<string> {
    const domains = new Set<string>();
    const corpus = [rawText, targetTitle ?? "", roleFamily ?? ""].join(" ");
    for (const domain of DOMAIN_SIGNAL_PATTERNS) {
        if (domain.pattern.test(corpus)) {
            for (const token of tokenize(domain.label)) domains.add(token);
        }
    }
    return domains;
}

export function deriveJobSignalFields(params: {
    rawText: string;
    targetTitle: string | null;
    roleFamily: string | null;
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
}): {
    targetTitle: string | null;
    roleFamily: string | null;
    requiredSkills: string[];
    preferredSkills: string[];
    responsibilities: string[];
    domains: string[];
    keywords: string[];
} {
    const domains = Array.from(inferDomainTokensForJd(params.rawText, params.targetTitle, params.roleFamily));
    const keywords = Array.from(new Set(tokenize(params.rawText))).slice(0, 50);
    return {
        targetTitle: params.targetTitle,
        roleFamily: params.roleFamily,
        requiredSkills: params.requiredSkills,
        preferredSkills: params.preferredSkills,
        responsibilities: params.responsibilities,
        domains,
        keywords,
    };
}

