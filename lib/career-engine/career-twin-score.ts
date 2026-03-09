import type { ProfileInput, RoleMatchResult } from "./role-matcher";
import type { GapReport } from "./gap-prioritizer";

export interface ScoreDimension {
    label: string;
    score: number;          // 0–100 for this dimension
    weight: number;         // contribution weight, e.g. 0.35
    weighted_score: number; // score * weight, rounded
    rationale: string;
}

export interface CareerTwinScoreResult {
    career_twin_score: number;    // 0–100 overall
    breakdown: {
        skill_coverage: ScoreDimension;
        experience_depth: ScoreDimension;
        role_alignment: ScoreDimension;
        career_progression: ScoreDimension;
    };
    label: string;               // "Developing" | "Emerging" | "Established" | "Advanced" | "Expert"
}

function clamp(n: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, Math.round(n)));
}

function scoreLabel(score: number): string {
    if (score >= 85) return "Expert";
    if (score >= 70) return "Advanced";
    if (score >= 55) return "Established";
    if (score >= 35) return "Emerging";
    return "Developing";
}

// --- Dimension: Skill Coverage (35%) ---
// Measures breadth and relevance of skills relative to the job's requirements
function skillCoverageScore(
    profile: ProfileInput,
    match: RoleMatchResult,
    gaps: GapReport
): ScoreDimension {
    const totalRequired = match.matched_skills.length + match.missing_skills.length;
    const coverageRatio = totalRequired > 0
        ? match.matched_skills.length / totalRequired
        : profile.skills.length > 0 ? 0.5 : 0;

    // Penalise for critical gaps
    const criticalGapPenalty = gaps.priority_gaps.filter(g => g.priority === "critical").length * 8;

    // Bonus for breadth: having extra relevant skills beyond required
    const extraBonus = Math.min(match.extra_skills.length * 3, 15);

    const raw = (coverageRatio * 80) + extraBonus - criticalGapPenalty;
    const score = clamp(raw);

    let rationale = "";
    if (score >= 75) rationale = `Strong skill coverage — ${match.matched_skills.length} of ${totalRequired} required skills matched with additional transferable skills.`;
    else if (score >= 50) rationale = `Moderate coverage — ${match.matched_skills.length} of ${totalRequired} required skills matched. ${gaps.priority_gaps.length > 0 ? "Some critical gaps remain." : ""}`;
    else rationale = `Skill coverage needs development — ${match.missing_skills.length} required skills are missing.`;

    return {
        label: "Skill Coverage",
        score,
        weight: 0.35,
        weighted_score: Math.round(score * 0.35),
        rationale,
    };
}

// --- Dimension: Experience Depth (25%) ---
// Measures years of experience relative to role expectations
function experienceDepthScore(
    profile: ProfileInput,
    match: RoleMatchResult
): ScoreDimension {
    const years = profile.years_experience ?? 0;

    // Absolute depth score: plateaus at 10+ years → 100
    const absoluteScore = years >= 10 ? 100
        : years >= 7 ? 85
            : years >= 5 ? 70
                : years >= 3 ? 55
                    : years >= 1 ? 38
                        : 15;

    // Blend with match's experience_score for JD-relative context
    const blended = (absoluteScore * 0.5) + (match.experience_score * 0.5);
    const score = clamp(blended);

    let rationale = "";
    if (years >= 7) rationale = `${years} years of professional experience demonstrates strong career depth.`;
    else if (years >= 3) rationale = `${years} years of experience — solid foundation, with room to deepen domain expertise.`;
    else if (years > 0) rationale = `${years} year(s) of experience — early-career profile. Experience depth will grow with time.`;
    else rationale = `Years of experience not detected. Ensure your resume includes dated work history.`;

    return {
        label: "Experience Depth",
        score,
        weight: 0.25,
        weighted_score: Math.round(score * 0.25),
        rationale,
    };
}

// --- Dimension: Role Alignment (25%) ---
// Measures how well the overall match score and title/function align
function roleAlignmentScore(
    match: RoleMatchResult,
    gaps: GapReport
): ScoreDimension {
    // Start from match score as base signal
    let raw = match.match_score;

    // Penalise title/seniority gaps
    if (match.title_gap) raw -= 10;
    if (match.seniority_gap) raw -= 8;

    // Penalise important gaps that reduce alignment
    const importantGaps = gaps.priority_gaps.filter(g => g.priority === "important").length;
    raw -= importantGaps * 4;

    const score = clamp(raw);

    let rationale = "";
    if (!match.title_gap && !match.seniority_gap && score >= 65) {
        rationale = "Strong alignment — role function and seniority level closely match your profile.";
    } else if (match.title_gap && !match.seniority_gap) {
        rationale = `Role function gap detected: ${match.title_gap} Consider tailoring your resume to better reflect this role's domain.`;
    } else if (match.seniority_gap) {
        rationale = `Seniority gap: ${match.seniority_gap}`;
    } else {
        rationale = `Partial alignment — closing ${importantGaps} important gap(s) will significantly improve fit.`;
    }

    return {
        label: "Role Alignment",
        score,
        weight: 0.25,
        weighted_score: Math.round(score * 0.25),
        rationale,
    };
}

// --- Dimension: Career Progression (15%) ---
// Heuristic: inferred from years, skill portfolio breadth, and gap trajectory
function careerProgressionScore(
    profile: ProfileInput,
    gaps: GapReport
): ScoreDimension {
    const years = profile.years_experience ?? 0;
    const skillCount = profile.skills.length;

    // Year-based progression floor
    const yearScore = years >= 10 ? 90
        : years >= 7 ? 78
            : years >= 5 ? 65
                : years >= 3 ? 50
                    : years >= 1 ? 35
                        : 15;

    // Skill breadth bonus (capped): wide skill portfolio signals versatility
    const breadthBonus = Math.min(skillCount * 2, 20);

    // Gap penalty: quick wins still open = room to improve easily
    const quickWinPenalty = gaps.quick_wins.length * 3;

    const raw = (yearScore * 0.7) + (breadthBonus * 0.3) - quickWinPenalty;
    const score = clamp(raw);

    let rationale = "";
    if (score >= 75) rationale = `Strong progression profile — ${years} years with a broad skill set across ${skillCount} areas.`;
    else if (score >= 50) rationale = `${years} years of experience with ${skillCount} skills — progressing steadily. ${gaps.quick_wins.length > 0 ? "Closing quick wins will accelerate growth." : ""}`;
    else rationale = `Early-stage career profile. Build consistent experience and expand your skill portfolio to accelerate progression.`;

    return {
        label: "Career Progression",
        score,
        weight: 0.15,
        weighted_score: Math.round(score * 0.15),
        rationale,
    };
}

// --- Main export ---
export function calculateCareerTwinScore(
    profile: ProfileInput,
    match: RoleMatchResult,
    gaps: GapReport
): CareerTwinScoreResult {
    const skill_coverage = skillCoverageScore(profile, match, gaps);
    const experience_depth = experienceDepthScore(profile, match);
    const role_alignment = roleAlignmentScore(match, gaps);
    const career_progression = careerProgressionScore(profile, gaps);

    const career_twin_score = clamp(
        skill_coverage.weighted_score
        + experience_depth.weighted_score
        + role_alignment.weighted_score
        + career_progression.weighted_score
    );

    return {
        career_twin_score,
        breakdown: { skill_coverage, experience_depth, role_alignment, career_progression },
        label: scoreLabel(career_twin_score),
    };
}
