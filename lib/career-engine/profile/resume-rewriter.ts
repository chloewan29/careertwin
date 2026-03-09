import type { ParsedResume } from "../parsing/resume-parser";
import type { ParsedJobDescription } from "./jd-parser";
import type { GapReport } from "../scoring/gap-prioritizer";

export interface RewrittenRole {
    company: string;
    original_bullets: string[];
    rewritten_bullets: string[];
    role_description: string;
}

export interface ResumeRewriteResult {
    roles: RewrittenRole[];
    summary_suggestion: string;
}

// Strong action verbs grouped by outcome type
const IMPACT_VERBS = ["Drove", "Delivered", "Generated", "Grew", "Increased", "Reduced", "Accelerated", "Achieved"];
const LEADERSHIP_VERBS = ["Led", "Managed", "Directed", "Oversaw", "Mentored", "Championed", "Spearheaded"];
const COMMERCIAL_VERBS = ["Secured", "Negotiated", "Converted", "Expanded", "Optimised", "Scaled", "Built"];
const ANALYTICAL_VERBS = ["Analysed", "Identified", "Diagnosed", "Synthesised", "Evaluated", "Quantified"];

function pickVerb(bullet: string, index: number): string {
    const lower = bullet.toLowerCase();
    if (/manag|lead|team|report|mentor|direct/.test(lower)) return LEADERSHIP_VERBS[index % LEADERSHIP_VERBS.length];
    if (/sale|revenue|budget|cost|contract|client/.test(lower)) return COMMERCIAL_VERBS[index % COMMERCIAL_VERBS.length];
    if (/analys|data|report|insight|track|measure/.test(lower)) return ANALYTICAL_VERBS[index % ANALYTICAL_VERBS.length];
    return IMPACT_VERBS[index % IMPACT_VERBS.length];
}

// Phrases that should be removed as too generic
const WEAK_OPENERS = [
    /^responsible for\s+/i,
    /^worked on\s+/i,
    /^helped\s+/i,
    /^assisted\s+with\s+/i,
    /^involved in\s+/i,
    /^part of\s+/i,
    /^duties included\s+/i,
    /^tasks included\s+/i,
    /^role included\s+/i,
];

function stripWeakOpener(text: string): string {
    for (const re of WEAK_OPENERS) {
        text = text.replace(re, "");
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function hasMetric(text: string): boolean {
    return /\d+%|\d+x|\$[\d,]+|\d[\d,]+ /.test(text);
}

function injectMetricSuggestion(bullet: string): string {
    if (hasMetric(bullet)) return bullet;
    // Append a placeholder prompt to quantify — keeps it deterministic without hallucinating
    if (/increase|grow|improv|boost|rais/.test(bullet.toLowerCase())) {
        return `${bullet} [quantify: e.g. by X% over Y months]`;
    }
    if (/reduc|decreas|cut|lower|sav/.test(bullet.toLowerCase())) {
        return `${bullet} [quantify: e.g. saving $X or reducing by X%]`;
    }
    if (/lead|manag|team/.test(bullet.toLowerCase())) {
        return `${bullet} [quantify: e.g. team of N or across N markets]`;
    }
    return bullet;
}

// Inject required keywords from JD into a bullet where semantically plausible
function injectKeyword(bullet: string, jdSkills: string[]): string {
    const lower = bullet.toLowerCase();
    for (const skill of jdSkills) {
        if (lower.includes(skill.toLowerCase())) return bullet; // already present
    }
    // Only inject if bullet is about tooling/data/analysis — safe insertion contexts
    if (/tool|platform|system|data|report|analyt|campaign/.test(lower) && jdSkills.length > 0) {
        const kw = jdSkills[0];
        return `${bullet} (utilising ${kw})`;
    }
    return bullet;
}

function rewriteBullet(
    raw: string,
    index: number,
    jdRequiredSkills: string[]
): string {
    let line = raw.trim();
    if (line.length < 10) return line;

    // Strip bullet/dash prefixes
    line = line.replace(/^[-•*]\s*/, "");

    // Strip weak openers
    line = stripWeakOpener(line);

    // Replace opening verb if sentence doesn't start with a strong one
    const startsStrongVerb = /^[A-Z][a-z]+ed\b|^[A-Z][a-z]+d\b/.test(line);
    if (!startsStrongVerb) {
        const verb = pickVerb(line, index);
        // Lowercase the first word and prepend verb
        line = `${verb} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
    }

    // Inject metric suggestion if no number present
    line = injectMetricSuggestion(line);

    // Inject JD keyword if opportunity exists and skill is missing
    line = injectKeyword(line, jdRequiredSkills);

    // Ensure ends with a period
    if (!/[.!?]$/.test(line)) line += ".";

    return line;
}

function buildRoleDescription(
    company: string,
    rewrittenBullets: string[],
    jdFunction: string | null
): string {
    const domainHint = jdFunction ? ` with a focus on ${jdFunction}` : "";
    const outcomeHint = rewrittenBullets.length > 0
        ? ` Key contributions included ${rewrittenBullets[0].replace(/\.$/, "").toLowerCase()}.`
        : "";
    return `Delivered measurable outcomes as part of the team at ${company}${domainHint}.${outcomeHint}`;
}

function buildSummary(
    resume: ParsedResume,
    jd: ParsedJobDescription,
    gaps: GapReport
): string {
    const title = resume.current_title ?? jd.target_title ?? "professional";
    const years = resume.years_experience != null ? `${resume.years_experience}+ year` : "Experienced";
    const domain = jd.normalized_title?.function ?? null;
    const topRequired = jd.required_skills.slice(0, 3).map(s => s.normalized);
    const criticalGapSkills = gaps.priority_gaps
        .filter(g => g.priority === "critical" && g.skill)
        .map(g => g.skill as string)
        .slice(0, 2);

    const skillPhrase = topRequired.length > 0
        ? `specialising in ${topRequired.join(", ")}`
        : "";
    const domainPhrase = domain ? `within the ${domain} space` : "";

    // We only mention developing skills if there's actually a critical gap
    const progressPhrase = criticalGapSkills.length > 0
        ? ` Actively expanding expertise in ${criticalGapSkills.join(" and ")} to broaden competency.`
        : "";

    return `${years} ${title} ${skillPhrase}${domainPhrase ? ` ${domainPhrase}` : ""}, with a track record of delivering commercial outcomes through data-driven decision making and cross-functional collaboration.${progressPhrase}`.trim();
}

// Extract rough bullet lines from a block of text about a company
function extractBulletsForCompany(company: string, rawText: string): string[] {
    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 15);

    // Find region near company name
    const idx = lines.findIndex(l => l.toLowerCase().includes(company.toLowerCase().split(",")[0].toLowerCase()));
    if (idx === -1) return [];

    const region = lines.slice(idx + 1, idx + 12);
    // Return lines that look like bullet points or responsibility descriptions
    return region
        .filter(l => /^[-•*]|^[A-Z][a-z]/.test(l) && l.length > 20)
        .slice(0, 5);
}

export function rewriteResume(
    resume: ParsedResume,
    jd: ParsedJobDescription,
    gaps: GapReport,
    rawResumeText: string
): ResumeRewriteResult {
    // Only suggest injecting skills that are ACTUALLY missing based on the gap report
    const missingSkillNames = gaps.priority_gaps
        .filter(g => g.type === "skill" && g.skill)
        .map(g => g.skill as string);
    const quickWinNames = gaps.quick_wins
        .filter(g => g.type === "skill" && g.skill)
        .map(g => g.skill as string);

    const missingSkills = Array.from(new Set([...missingSkillNames, ...quickWinNames]));

    const jdFunction = jd.normalized_title?.function ?? null;

    const roles: RewrittenRole[] = resume.companies.slice(0, 3).map(company => {
        const original_bullets = extractBulletsForCompany(company, rawResumeText);

        const rewritten_bullets = original_bullets.length > 0
            ? original_bullets.map((b, i) => rewriteBullet(b, i, missingSkills))
            : [
                `${IMPACT_VERBS[0]} key ${jdFunction ?? "marketing"} initiatives that contributed to measurable business outcomes. [add specific achievement]`,
                `${LEADERSHIP_VERBS[1]} cross-functional stakeholders to deliver on ${missingSkills[0] ?? "campaign"} objectives. [quantify scope]`,
                `${COMMERCIAL_VERBS[2]} opportunities to improve performance through data and insight. [add metric]`,
            ];

        const role_description = buildRoleDescription(company, rewritten_bullets, jdFunction);

        return { company, original_bullets, rewritten_bullets, role_description };
    });

    const summary_suggestion = buildSummary(resume, jd, gaps);

    return { roles, summary_suggestion };
}
