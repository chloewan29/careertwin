import type { ProfileInput, RoleMatchResult } from "../matching/role-matcher";
import type { GapReport } from "./gap-prioritizer";

export interface ScoreDimension {
    label: string;
    score: number;          // 0-100 for this dimension
    weight: number;         // contribution weight, e.g. 0.35
    weighted_score: number; // score * weight, rounded
    rationale: string;
}

export interface CareerTwinScoreResult {
    career_twin_score: number;    // 0-100 overall
    breakdown: {
        skill_coverage: ScoreDimension;
        experience_depth: ScoreDimension;
        role_alignment: ScoreDimension;
        career_progression: ScoreDimension;
    };
    dimension_breakdown?: {
        title: ScoreDimension;
        skills: ScoreDimension;
        seniority: ScoreDimension;
        domain: ScoreDimension;
        leadership: ScoreDimension;
        communication: ScoreDimension;
    };
    label: string;               // "Developing" | "Emerging" | "Established" | "Advanced" | "Expert"
}

const WEIGHTS = {
    title: 0.15,
    skills: 0.35,
    seniority: 0.2,
    domain: 0.1,
    leadership: 0.1,
    communication: 0.1,
} as const;

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

function weighted(score: number, weight: number): number {
    return Math.round(score * weight);
}

function makeDimension(
    label: string,
    score: number,
    weight: number,
    rationale: string
): ScoreDimension {
    const normalizedScore = clamp(score);
    return {
        label,
        score: normalizedScore,
        weight,
        weighted_score: weighted(normalizedScore, weight),
        rationale,
    };
}

function inferLeadershipScore(
    match: RoleMatchResult,
    profile: ProfileInput,
    gaps: GapReport
): number {
    if (match.strengths?.some(s => s.toLowerCase() === "leadership")) return 85;
    if (gaps.evidence_gaps?.some(g => (g.skill ?? "").toLowerCase() === "leadership")) return 45;
    if ((profile.years_experience ?? 0) >= 7) return 60;
    return 35;
}

function inferCommunicationScore(
    match: RoleMatchResult,
    profile: ProfileInput,
    gaps: GapReport
): number {
    if (match.strengths?.some(s => s.toLowerCase() === "communication")) return 85;
    if (gaps.evidence_gaps?.some(g => (g.skill ?? "").toLowerCase() === "communication")) return 45;
    if ((profile.years_experience ?? 0) >= 5) return 60;
    return 35;
}

function inferDomainScore(match: RoleMatchResult): number {
    if (match.dimension_scores?.domain != null) return clamp(match.dimension_scores.domain);
    if (!match.title_gap) return 75;
    if (match.hard_filter_result === "fail") return 25;
    return 45;
}

function buildSixDimensions(
    profile: ProfileInput,
    match: RoleMatchResult,
    gaps: GapReport
): NonNullable<CareerTwinScoreResult["dimension_breakdown"]> {
    const title = clamp(match.dimension_scores?.title ?? match.title_score ?? 50);
    const skills = clamp(match.dimension_scores?.skills ?? match.skill_score ?? 50);
    const seniority = clamp(match.dimension_scores?.seniority ?? match.experience_score ?? 50);
    const domain = inferDomainScore(match);
    const leadership = clamp(match.dimension_scores?.leadership ?? inferLeadershipScore(match, profile, gaps));
    const communication = clamp(match.dimension_scores?.communication ?? inferCommunicationScore(match, profile, gaps));

    return {
        title: makeDimension(
            "Title",
            title,
            WEIGHTS.title,
            match.title_gap ? match.title_gap : "Title family and level align with the role."
        ),
        skills: makeDimension(
            "Skills",
            skills,
            WEIGHTS.skills,
            `${match.matched_skills.length} matched vs ${match.missing_skills.length} not-clearly-met required skills.`
        ),
        seniority: makeDimension(
            "Seniority",
            seniority,
            WEIGHTS.seniority,
            match.seniority_gap ? match.seniority_gap : "Seniority fit is aligned for this role."
        ),
        domain: makeDimension(
            "Domain",
            domain,
            WEIGHTS.domain,
            match.title_gap ? "Some domain transfer is needed for this role." : "Domain alignment looks strong."
        ),
        leadership: makeDimension(
            "Leadership",
            leadership,
            WEIGHTS.leadership,
            leadership >= 70 ? "Leadership evidence is clear in the profile." : "Leadership evidence is present but could be more explicit."
        ),
        communication: makeDimension(
            "Communication",
            communication,
            WEIGHTS.communication,
            communication >= 70 ? "Communication and stakeholder evidence is clear." : "Communication evidence can be made more explicit for this role."
        ),
    };
}

export function calculateCareerTwinScore(
    profile: ProfileInput,
    match: RoleMatchResult,
    gaps: GapReport
): CareerTwinScoreResult {
    const dimension_breakdown = buildSixDimensions(profile, match, gaps);

    // Explicit six-dimension weighted roll-up (total = 100).
    const career_twin_score = clamp(
        dimension_breakdown.title.weighted_score
        + dimension_breakdown.skills.weighted_score
        + dimension_breakdown.seniority.weighted_score
        + dimension_breakdown.domain.weighted_score
        + dimension_breakdown.leadership.weighted_score
        + dimension_breakdown.communication.weighted_score
    );

    // Backward-compatible legacy breakdown shape:
    // skill_coverage -> skills
    // experience_depth -> seniority
    // role_alignment -> title + domain aggregate (0.25 total)
    // career_progression -> leadership + communication aggregate (0.20 total)
    const roleAlignmentScore = clamp(
        (
            (dimension_breakdown.title.score * WEIGHTS.title) +
            (dimension_breakdown.domain.score * WEIGHTS.domain)
        ) / (WEIGHTS.title + WEIGHTS.domain)
    );

    const careerProgressionScore = clamp(
        (
            (dimension_breakdown.leadership.score * WEIGHTS.leadership) +
            (dimension_breakdown.communication.score * WEIGHTS.communication)
        ) / (WEIGHTS.leadership + WEIGHTS.communication)
    );

    const skill_coverage = makeDimension(
        "Skill Coverage",
        dimension_breakdown.skills.score,
        WEIGHTS.skills,
        dimension_breakdown.skills.rationale
    );

    const experience_depth = makeDimension(
        "Experience Depth",
        dimension_breakdown.seniority.score,
        WEIGHTS.seniority,
        dimension_breakdown.seniority.rationale
    );

    const role_alignment = makeDimension(
        "Role Alignment",
        roleAlignmentScore,
        WEIGHTS.title + WEIGHTS.domain,
        `Title/domain alignment combined from title (${dimension_breakdown.title.score}) and domain (${dimension_breakdown.domain.score}) scores.`
    );

    const career_progression = makeDimension(
        "Career Progression",
        careerProgressionScore,
        WEIGHTS.leadership + WEIGHTS.communication,
        `Progression signal combined from leadership (${dimension_breakdown.leadership.score}) and communication (${dimension_breakdown.communication.score}) scores.`
    );

    return {
        career_twin_score,
        breakdown: { skill_coverage, experience_depth, role_alignment, career_progression },
        dimension_breakdown,
        label: scoreLabel(career_twin_score),
    };
}
