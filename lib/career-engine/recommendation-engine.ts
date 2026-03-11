import { parseJobDescription } from "./parsing/jd-parser";
import { matchRoles, type ProfileInput } from "./matching/role-matcher";
import { prioritizeGaps } from "./scoring/gap-prioritizer";
import { calculateCareerTwinScore } from "./scoring/career-twin-score";
import { explainMatch } from "./profile/explain-match";

export interface JobRecommendationInput {
    url: string;
    jobDescription: string;
}

export interface JobRecommendation {
    job_url: string;
    job_title: string | null;
    company: string | null;
    career_twin_score: number;
    recommendation: "apply_now" | "apply_with_tailoring" | "stretch_apply" | "not_recommended";
    critical_gaps: string[];
    evidence_gaps: string[];
    explanation_summary: string;
}

export function rankJobRecommendations(
    profile: ProfileInput,
    jobs: JobRecommendationInput[],
    limit = 10
): JobRecommendation[] {
    const scored = jobs.map((job) => {
        const parsedJD = parseJobDescription(job.jobDescription);
        const match = matchRoles(profile, parsedJD);
        const gaps = prioritizeGaps(profile, parsedJD, match);
        const score = calculateCareerTwinScore(profile, match, gaps);
        const explanation = explainMatch({ match, gaps, score });

        return {
            job_url: job.url,
            job_title: parsedJD.target_title,
            company: parsedJD.company,
            career_twin_score: score.career_twin_score,
            recommendation: explanation.recommendation,
            critical_gaps: (gaps.critical_gaps ?? []).map(g => g.label),
            evidence_gaps: (gaps.evidence_gaps ?? [])
                .map(g => g.skill ?? g.label)
                .filter(Boolean),
            explanation_summary: explanation.summary,
        } satisfies JobRecommendation;
    });

    return scored
        .sort((a, b) => b.career_twin_score - a.career_twin_score)
        .slice(0, limit);
}
