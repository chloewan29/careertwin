import type { ProfileInput, RoleMatchResult } from "./role-matcher";
import type { ParsedJobDescription } from "./jd-parser";
import type { GapReport, GapItem } from "./gap-prioritizer";

export interface CareerStrategy {
    resume_improvements: string[];      // top 3 resume-level changes
    positioning_suggestions: string[];  // top 3 how to frame yourself
    skills_to_build: string[];          // top 3 ranked skills to acquire
    next_best_actions: string[];        // top 3 concrete next steps
}

function topN<T>(arr: T[], n: number): T[] {
    return arr.slice(0, n);
}

function skillGaps(gaps: GapItem[]): GapItem[] {
    return gaps.filter(g => g.type === "skill" && g.skill);
}

export function buildCareerStrategy(
    profile: ProfileInput,
    jd: ParsedJobDescription,
    match: RoleMatchResult,
    gapReport: GapReport
): CareerStrategy {
    const allGaps = [
        ...gapReport.priority_gaps,
        ...gapReport.quick_wins,
        ...gapReport.stretch_gaps,
    ];

    // --- Resume improvements ---
    const resumeImprovements: string[] = [];

    // Low skill score: quantify impact in bullet points
    if (match.skill_score < 60) {
        resumeImprovements.push(
            `Add ${jd.required_skills.slice(0, 3).map(s => s.normalized).join(", ")} explicitly to your skills section and bullet points to match the job's requirements.`
        );
    }

    // Seniority gap: add scope/ownership language
    if (match.seniority_gap) {
        resumeImprovements.push(
            `Use ownership language in your bullet points (e.g. "Led", "Owned", "Drove") to signal the seniority level expected for this role.`
        );
    }

    // Title gap: lead with the target role's language
    if (match.title_gap && jd.target_title) {
        resumeImprovements.push(
            `Open your resume summary with a headline that mirrors the target title: "${jd.target_title}".`
        );
    }

    // Missing matched skills from JD
    if (match.matched_skills.length > 0 && match.skill_score < 80) {
        resumeImprovements.push(
            `Ensure your matched skills (${match.matched_skills.slice(0, 3).join(", ")}) appear prominently — don't bury them.`
        );
    }

    // Low overall match — recommend tailoring
    if (match.match_score < 50) {
        resumeImprovements.push(
            `Tailor this resume specifically for this application. Reflect the job description's exact language and keywords.`
        );
    }

    // Generic always-useful tip if few suggestions
    if (resumeImprovements.length < 2) {
        resumeImprovements.push(
            `Quantify achievements in your experience section with metrics (e.g. "Increased conversion rate by 18%").`
        );
    }

    // --- Positioning suggestions ---
    const positioningSuggestions: string[] = [];

    if (jd.normalized_title?.function) {
        positioningSuggestions.push(
            `Position yourself as a ${jd.normalized_title.function} professional by leading with your most relevant experience in that domain.`
        );
    }

    if (match.extra_skills.length >= 3) {
        positioningSuggestions.push(
            `Highlight your breadth with transferable skills (${match.extra_skills.slice(0, 3).join(", ")}) that add value beyond the core requirements.`
        );
    }

    if (jd.seniority_level) {
        positioningSuggestions.push(
            `Frame your experience at the ${jd.seniority_level} level by emphasizing decisions you owned and outcomes you drove.`
        );
    }

    if (match.title_gap) {
        positioningSuggestions.push(
            `Emphasise cross-functional experience to show you can operate effectively in the target role's domain.`
        );
    }

    if (positioningSuggestions.length < 2) {
        positioningSuggestions.push(
            `Write a concise, targeted professional summary that directly addresses what this employer is looking for.`
        );
    }

    // --- Skills to build ---
    const skillsToBuild: string[] = [];

    // Critical skill gaps first
    const criticalSkills = skillGaps(gapReport.priority_gaps)
        .filter(g => g.priority === "critical")
        .map(g => g.skill as string);

    // Then quick wins
    const quickSkills = gapReport.quick_wins
        .map(g => g.skill as string)
        .filter(s => !criticalSkills.includes(s));

    // Then preferred
    const niceSkills = skillGaps(gapReport.stretch_gaps)
        .map(g => g.skill as string)
        .filter(s => !criticalSkills.includes(s) && !quickSkills.includes(s));

    const orderedSkills = [...criticalSkills, ...quickSkills, ...niceSkills];

    for (const skill of orderedSkills) {
        if (skillsToBuild.length >= 3) break;
        skillsToBuild.push(skill);
    }

    // Fallback if no gaps identified
    if (skillsToBuild.length === 0 && jd.preferred_skills.length > 0) {
        skillsToBuild.push(...jd.preferred_skills.slice(0, 3).map(s => s.normalized));
    }

    // --- Next best actions ---
    const nextActions: string[] = [];

    // Quick wins are highest ROI first action
    if (gapReport.quick_wins.length > 0) {
        const qw = gapReport.quick_wins[0];
        nextActions.push(qw.action);
    }

    // Critical skill action
    const firstCritical = gapReport.priority_gaps.find(g => g.priority === "critical");
    if (firstCritical && firstCritical.action && firstCritical !== gapReport.quick_wins[0]) {
        nextActions.push(firstCritical.action);
    }

    // If strong title gap — networking action
    if (match.title_gap) {
        nextActions.push(
            `Connect with professionals in ${jd.normalized_title?.function ?? "this field"} on LinkedIn to understand role expectations and get visibility.`
        );
    }

    // Low score — portfolio action
    if (match.match_score < 55 && skillsToBuild.length > 0) {
        nextActions.push(
            `Build a portfolio project demonstrating ${skillsToBuild[0]} to provide concrete evidence of your capability.`
        );
    }

    // Always: tailored application
    if (nextActions.length < 3) {
        nextActions.push(
            `Customise your resume for this specific role by mirroring the job description's key phrases before applying.`
        );
    }

    if (nextActions.length < 3) {
        nextActions.push(
            `Request an informational interview with someone at ${jd.company ?? "the company"} to learn more about the team and role expectations.`
        );
    }

    return {
        resume_improvements: topN(resumeImprovements, 3),
        positioning_suggestions: topN(positioningSuggestions, 3),
        skills_to_build: topN(skillsToBuild, 3),
        next_best_actions: topN(nextActions, 3),
    };
}
