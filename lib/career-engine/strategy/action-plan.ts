import type { ProfileInput } from "../matching/role-matcher";
import type { ParsedJobDescription } from "../parsing/jd-parser";
import type { RoleMatchResult } from "../matching/role-matcher";
import type { GapReport, GapItem } from "../scoring/gap-prioritizer";
import type { CareerStrategy } from "./career-strategy";

export interface ActionPlan {
    actions_7d: string[];    // immediate, low-effort wins
    actions_30d: string[];   // medium-effort improvements
    actions_90d: string[];   // longer-term investments
}

// Skills that can realistically be picked up within 7 days
const QUICK_SKILLS = new Set([
    "Git", "Scrum", "Agile", "Kanban", "Jira", "Confluence", "Notion",
    "Google Analytics", "Google Tag Manager", "Google Sheets", "Microsoft Excel",
    "Asana", "Trello", "Postman", "Slack", "Presentation Skills",
    "Stakeholder Management", "Email Marketing", "Social Media", "LinkedIn Ads",
]);

// Skills that take a few weeks — courses, tutorials, small projects
const MEDIUM_SKILLS = new Set([
    "SQL", "Python", "TypeScript", "React", "Node.js", "Docker", "CI/CD",
    "AWS", "Power BI", "Tableau", "Google Ads", "Facebook Ads", "DV360",
    "SEO", "SEM", "HubSpot", "Salesforce", "Content Strategy", "Figma",
    "Data Analysis", "Google Analytics 4", "Looker Studio",
]);

function topN(arr: string[], n: number): string[] {
    return arr.filter(Boolean).slice(0, n);
}

function skillGaps(gaps: GapItem[]): GapItem[] {
    return gaps.filter(g => g.type === "skill" && g.skill);
}

export function buildActionPlan(
    profile: ProfileInput,
    jd: ParsedJobDescription,
    match: RoleMatchResult,
    gapReport: GapReport,
    strategy: CareerStrategy
): ActionPlan {
    const actions_7d: string[] = [];
    const actions_30d: string[] = [];
    const actions_90d: string[] = [];

    const allGaps = [
        ...gapReport.priority_gaps,
        ...gapReport.quick_wins,
        ...gapReport.stretch_gaps,
    ];
    const skillGapItems = skillGaps(allGaps);

    // --- 7-day actions: quick resume tweaks + easy skills ---

    // Quick résumé tailoring is always first priority
    if (jd.target_title) {
        actions_7d.push(
            `Update your resume headline to mirror the target role: "${jd.target_title}". This takes < 30 minutes and immediately improves keyword matching.`
        );
    } else {
        actions_7d.push(
            `Tailor your resume summary to reflect the language in this job description — copy exact phrases where relevant.`
        );
    }

    // Quick-win skills (learnable in a week)
    const quickSkill = gapReport.quick_wins.find(g => g.skill && QUICK_SKILLS.has(g.skill));
    if (quickSkill?.skill) {
        actions_7d.push(
            `Set up and complete a free introductory course or tutorial for ${quickSkill.skill} — this is typically achievable in 2–5 hours.`
        );
    }

    // Apply / connect while resume is fresh
    if (jd.company) {
        actions_7d.push(
            `Connect on LinkedIn with 2–3 people at ${jd.company} in similar roles. Visibility before applying significantly improves response rates.`
        );
    } else {
        actions_7d.push(
            `Identify 3 people in this field or target company on LinkedIn and send personalised connection requests this week.`
        );
    }

    // --- 30-day actions: skill building + resume evidence ---

    // First strategy resume improvement
    if (strategy.resume_improvements.length > 0) {
        actions_30d.push(
            `Action resume improvement: ${strategy.resume_improvements[0]}`
        );
    }

    // Medium-effort skills
    const mediumSkill = skillGapItems.find(g => g.skill && MEDIUM_SKILLS.has(g.skill));
    if (mediumSkill?.skill) {
        actions_30d.push(
            `Complete a structured online course for ${mediumSkill.skill} (e.g. Coursera, LinkedIn Learning, or YouTube). Document what you build in a public repo or portfolio.`
        );
    }

    // Experience gap — try to bridge
    if (match.experience_score < 80 && jd.years_required) {
        actions_30d.push(
            `Identify 1–2 projects or responsibilities from past roles that more directly align with this role's requirements. Reframe those bullet points to emphasise relevant outcomes.`
        );
    } else if (strategy.positioning_suggestions.length > 0) {
        actions_30d.push(
            `Implement positioning: ${strategy.positioning_suggestions[0]}`
        );
    }

    // --- 90-day actions: domain depth + portfolio + credentialing ---

    // Critical skill gap — longer investment
    const criticalSkill = gapReport.priority_gaps.find(
        g => g.priority === "critical" && g.type === "skill" && g.skill
    );
    if (criticalSkill?.skill) {
        const skillName = criticalSkill.skill;
        const isMedium = MEDIUM_SKILLS.has(skillName);
        actions_90d.push(
            isMedium
                ? `Build a portfolio project that demonstrates ${skillName} end-to-end. A working example beats a resume line every time.`
                : `Pursue a certification or structured program in ${skillName} — plan for 4–12 weeks of committed study.`
        );
    }

    // Title / domain gap — networking + positioning
    if (match.title_gap && jd.normalized_title?.function) {
        actions_90d.push(
            `Spend 90 days deliberately building your ${jd.normalized_title.function} presence: attend 2 events, publish 1 LinkedIn article on the topic, and engage with industry accounts weekly.`
        );
    } else if (strategy.next_best_actions.length > 0) {
        actions_90d.push(strategy.next_best_actions[strategy.next_best_actions.length - 1]);
    }

    // Long-term credentialing or domain shift
    const stretchSkill = skillGaps(gapReport.stretch_gaps)[0];
    if (stretchSkill?.skill) {
        actions_90d.push(
            `Develop familiarity with ${stretchSkill.skill} over 90 days to broaden your competitive edge for future applications.`
        );
    } else if (jd.required_skills.length > 0) {
        const deepenSkill = jd.required_skills[0].normalized;
        actions_90d.push(
            `Deepen your expertise in ${deepenSkill} — aim to go from competent to confident by working on a non-trivial real-world project.`
        );
    }

    return {
        actions_7d: topN(actions_7d, 3),
        actions_30d: topN(actions_30d, 3),
        actions_90d: topN(actions_90d, 3),
    };
}
