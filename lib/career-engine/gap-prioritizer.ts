import type { ParsedJobDescription } from "./jd-parser";
import type { RoleMatchResult, ProfileInput } from "./role-matcher";

export type GapPriority = "critical" | "important" | "nice-to-have";

export interface GapItem {
    skill: string | null;          // null for non-skill gaps (title, seniority)
    type: "skill" | "seniority" | "title" | "experience";
    priority: GapPriority;
    label: string;                 // Short label, e.g. "Missing React Experience", "Seniority Mismatch"
    gap_description: string;       // Slightly longer explanation
    action: string;
}

export interface GapReport {
    priority_gaps: GapItem[];      // top 3, ordered critical → important
    quick_wins: GapItem[];         // low-effort improvements
    stretch_gaps: GapItem[];       // nice-to-have / longer-term
    summary: string;
}

// Skills considered high-demand baseline across most industries
const HIGH_DEMAND_SKILLS = new Set([
    "Python", "SQL", "JavaScript", "TypeScript", "React", "Node.js", "AWS",
    "Docker", "Kubernetes", "Git", "CI/CD", "Agile", "Scrum", "Machine Learning",
    "Data Analysis", "Google Analytics", "Google Analytics 4", "Tableau", "Power BI",
    "SEM", "SEO", "Google Ads", "HubSpot", "Salesforce", "Communication", "Leadership",
]);

// Skills that can realistically be acquired quickly (< 4 weeks of focused effort)
const QUICK_LEARN_SKILLS = new Set([
    "Git", "Scrum", "Agile", "Kanban", "Jira", "Confluence", "Postman",
    "Google Analytics", "Google Tag Manager", "Google Sheets", "Microsoft Excel",
    "Asana", "Notion", "Slack", "Trello", "LinkedIn Ads", "Social Media",
    "Email Marketing", "Stakeholder Management", "Presentation Skills",
]);

const PRIORITY_ORDER: Record<GapPriority, number> = { critical: 0, important: 1, "nice-to-have": 2 };

function skillGapItem(
    skill: string,
    isRequired: boolean,
    isHighDemand: boolean
): GapItem {
    const isQuick = QUICK_LEARN_SKILLS.has(skill);
    let priority: GapPriority;

    if (isRequired && isHighDemand) priority = "critical";
    else if (isRequired) priority = "important";
    else priority = "nice-to-have";

    return {
        skill,
        type: "skill",
        priority,
        label: isRequired ? `Missing ${skill} Experience` : `Preferred ${skill} Experience`,
        gap_description: isRequired
            ? `Required for this role.`
            : `Preferred skill that strengthens your application.`,
        action: isQuick
            ? `Add ${skill} through a short course or hands-on project and add it to your profile.`
            : `Build ${skill} experience through a project, certification, or on-the-job opportunity.`,
    };
}

export function prioritizeGaps(
    profile: ProfileInput,
    jd: ParsedJobDescription,
    match: RoleMatchResult
): GapReport {
    const allGaps: GapItem[] = [];

    // --- 1. Required skill gaps ---
    const requiredSkillNames = new Set(jd.required_skills.map(s => s.normalized));
    for (const skill of match.missing_skills) {
        const isHighDemand = HIGH_DEMAND_SKILLS.has(skill);
        const isRequired = requiredSkillNames.has(skill);
        allGaps.push(skillGapItem(skill, isRequired, isHighDemand));
    }

    // --- 2. Preferred skill gaps (add as nice-to-have) ---
    const missingSet = new Set(match.missing_skills);
    for (const ps of jd.preferred_skills) {
        if (!missingSet.has(ps.normalized)) continue; // already covered or matched
        const isHighDemand = HIGH_DEMAND_SKILLS.has(ps.normalized);
        allGaps.push(skillGapItem(ps.normalized, false, isHighDemand));
    }

    // --- 3. Seniority gap ---
    if (match.seniority_gap) {
        const jdYears = jd.years_required ?? 0;
        const resumeYears = profile.years_experience ?? 0;
        const yearsDiff = jdYears - resumeYears;
        const priority: GapPriority = yearsDiff >= 3 ? "critical" : "important";
        allGaps.push({
            skill: null,
            type: "seniority",
            priority,
            label: "Seniority Level Mismatch",
            gap_description: match.seniority_gap,
            action: jdYears > resumeYears
                ? `Aim for roles that match your current experience level, or focus on gaining the remaining ~${yearsDiff} year(s) of experience.`
                : `Highlight leadership and ownership examples in your resume to bridge the seniority gap.`,
        });
    }

    // --- 4. Title/domain gap ---
    if (match.title_gap) {
        allGaps.push({
            skill: null,
            type: "title",
            priority: "important",
            label: "Title / Domain Misalignment",
            gap_description: match.title_gap,
            action: `Reframe your resume and LinkedIn title to better align with the target role's domain. Highlight transferable experience explicitly.`,
        });
    }

    // --- 5. Experience evidence gap (skills present in JD but likely not evidenced in resume summary) ---
    // Detect if resume has < 30% of required skills — signal of broader evidence gap
    if (match.skill_score < 30 && jd.required_skills.length > 3) {
        allGaps.push({
            skill: null,
            type: "experience",
            priority: "critical",
            label: "Low Experience Evidence",
            gap_description: "Your resume covers fewer than 30% of the required skills.",
            action: "Consider whether this role aligns with your current trajectory, or build targeted portfolio work to demonstrate the required competencies.",
        });
    }

    // --- Sort all gaps: critical first, then important, then nice-to-have ---
    allGaps.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    // Deduplicate by gap_description
    const seen = new Set<string>();
    const deduped = allGaps.filter(g => {
        const key = g.skill ?? g.gap_description;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const priority_gaps = deduped.filter(g => g.priority !== "nice-to-have").slice(0, 3);

    const quick_wins = deduped.filter(g =>
        g.type === "skill" && g.skill && QUICK_LEARN_SKILLS.has(g.skill)
    ).slice(0, 5);

    const stretch_gaps = deduped.filter(g => g.priority === "nice-to-have").slice(0, 5);

    const criticalCount = priority_gaps.filter(g => g.priority === "critical").length;
    const summary = criticalCount >= 2
        ? `${criticalCount} critical gaps found. Focus on closing these before applying.`
        : criticalCount === 1
            ? "1 critical gap found. Address it alongside quick wins to strengthen your application."
            : priority_gaps.length > 0
                ? "No critical gaps, but important improvements can meaningfully boost your match score."
                : "Your profile is well-aligned. Focus on preferred skills and presentation polish.";

    return { priority_gaps, quick_wins, stretch_gaps, summary };
}
