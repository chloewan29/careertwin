import type { ProfileInput } from "../matching/role-matcher";
import type { ParsedResume } from "../parsing/resume-parser";
import type { EvidenceMap } from "../matching/evidence-mapper";

export interface ProfileNarrative {
    headline: string;
    strengths_summary: string;
    positioning_statement: string;
}

function titleCase(s: string): string {
    return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

// Pick top N skills by category priority: domain-specific before generic
const CATEGORY_PRIORITY = ["marketing", "analytics", "data", "framework", "language", "platform", "tool", "methodology", "soft", "other"];

function pickTopSkills(skills: string[], max: number): string[] {
    // Filter out generic one-word soft skills for headline use
    return skills.filter(s => s.length > 2).slice(0, max);
}

// Month names — must not appear as company names
const MONTH_NAMES = new Set([
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]);

// Section labels that can leak into the companies array
const LABEL_RE = /^(roles?\s+and\s+responsibilities|accomplishments?|responsibilities|achievements?|duties|overview|present|current|ongoing|to\s+date)/i;

// Validates a company string is a plausible organisation name
function filterCompanies(raw: string[]): string[] {
    return raw.filter(c => {
        const lower = c.toLowerCase().trim();
        if (MONTH_NAMES.has(lower)) return false;        // month name
        if (LABEL_RE.test(lower)) return false;           // section label
        if (/^\d{4}$/.test(c.trim())) return false;       // bare year
        if (c.trim().length < 2) return false;            // too short
        if (!/[A-Z]/.test(c)) return false;               // no uppercase = not a proper name
        return true;
    });
}

// Returns true only when the title string looks like a real role title
const TITLE_KEYWORD_RE = /\b(engineer|developer|manager|director|lead|analyst|designer|architect|scientist|consultant|officer|vp|vice president|specialist|coordinator|executive|intern|strategist|planner|advisor|associate|producer|editor|writer)\b/i;
function isConfidentTitle(t: string | null): boolean {
    if (!t) return false;
    if (t.length < 4 || t.length > 100) return false;
    // Reject if it looks like a company+location line without a role keyword
    if (!TITLE_KEYWORD_RE.test(t)) return false;
    return true;
}

function experiencePhrase(years: number | null): string {
    if (!years || years <= 0) return "";
    if (years === 1) return "1 year of professional experience";
    if (years < 3) return `${years} years of experience`;
    if (years < 5) return `${years} years of hands-on experience`;
    if (years < 10) return `${years} years of industry experience`;
    return `${years}+ years of senior experience`;
}

function companyPhrase(companies: string[]): string {
    if (companies.length < 3) return ""; // Require at least 3 confident companies before namedropping
    return `including ${companies[0]} and ${companies[1]}`;
}

export function buildProfileNarrative(
    profile: ProfileInput,
    resume: ParsedResume,
    evidenceMap: EvidenceMap
): ProfileNarrative {
    // Validate title confidence — only use if it contains a recognised role keyword
    const rawTitle = profile.current_title ?? resume.current_title ?? null;
    const title = isConfidentTitle(rawTitle) ? rawTitle : null;

    const years = profile.years_experience ?? resume.years_experience ?? null;
    const topSkills = pickTopSkills(profile.skills.length > 0 ? profile.skills : resume.skills, 3);

    // Filter companies to only confident organisation names
    const companies = filterCompanies(resume.companies ?? []);
    // Drop industry inference as it's often low confidence
    const industry = null;

    // --- Headline ---
    // Pattern: "[Title] specialising in [Skill1], [Skill2] & [Skill3]"
    // or if no title: "[Skill1] & [Skill2] professional"
    let headline = "";
    if (title && topSkills.length >= 2) {
        headline = `${title} specialising in ${topSkills.slice(0, 2).join(" & ")}`;
        if (topSkills.length >= 3) headline += ` and ${topSkills[2]}`;
    } else if (title) {
        headline = title;
    } else if (topSkills.length >= 2) {
        headline = `${topSkills[0]} & ${topSkills[1]} Professional`;
    } else if (topSkills.length === 1) {
        headline = `${topSkills[0]} Specialist`;
    } else {
        headline = "Career Professional";
    }

    // --- Strengths summary ---
    // Sentence 1: experience + evidence breadth
    // Sentence 2: industries/companies or skill depth
    const expPhrase = experiencePhrase(years);
    const matchedCount = evidenceMap.matched_evidence.length;
    const compPhrase = companyPhrase(companies);

    let s1 = "";
    let s2 = "";

    if (expPhrase && matchedCount > 0) {
        s1 = `A results-driven professional with ${expPhrase} and demonstrated capability across ${matchedCount} in-demand skill area${matchedCount !== 1 ? "s" : ""}.`;
    } else if (expPhrase) {
        s1 = `A skilled professional with ${expPhrase}.`;
    } else if (matchedCount > 0) {
        s1 = `A practitioner with demonstrated capability across ${matchedCount} in-demand skill area${matchedCount !== 1 ? "s" : ""}.`;
    } else {
        s1 = `A motivated professional with a strong foundation in ${topSkills.slice(0, 2).join(" and ") || "their field"}.`;
    }

    if (compPhrase) {
        s2 = `Proven track record across leading organisations ${compPhrase}.`;
    } else if (topSkills.length >= 3) {
        s2 = `Core strengths span ${topSkills.slice(0, 3).join(", ")}.`;
    } else {
        s2 = `Combines analytical thinking with practical execution to drive measurable outcomes.`;
    }

    const strengths_summary = `${s1} ${s2}`.trim();

    // --- Positioning statement ---
    // Market-facing, 1 sentence: "[Title/descriptor] who [delivers what] for [context]"
    const descriptor = title ? `${title}` : (topSkills[0] ? `${topSkills[0]} specialist` : "experienced professional");
    const deliverable = topSkills.length >= 2
        ? `leverages expertise in ${topSkills.slice(0, 2).join(" and ")} to drive measurable results`
        : "delivers high-impact work across fast-paced environments";
    const context = companies.length > 0
        ? `at the enterprise level`
        : "across high-growth organisations";

    const positioning_statement = `A ${descriptor} who ${deliverable} ${context}.`;

    return {
        headline,
        strengths_summary,
        positioning_statement,
    };
}
