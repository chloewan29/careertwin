import type { RoleMatchResult } from "../matching/role-matcher";
import type { GapReport } from "../scoring/gap-prioritizer";
import type { CareerTwinScoreResult as CareerTwinScore } from "../scoring/career-twin-score";

export interface MatchExplanation {
    why_this_role_fits_you: string[];
    why_this_role_may_not_fit: string[];
    what_to_fix_in_your_resume: string[];
    summary: string;
    recommendation: "apply_now" | "apply_with_tailoring" | "stretch_apply" | "not_recommended";
}

function topN<T>(items: T[], n: number): T[] {
    return items.slice(0, n);
}

function unique(items: string[]): string[] {
    return [...new Set(items)];
}

function recommendationFrom(
    career_twin_score: number,
    critical_gaps: Array<{ label: string }>
): MatchExplanation["recommendation"] {
    if (career_twin_score >= 80 && critical_gaps.length === 0) {
        return "apply_now";
    }
    if (career_twin_score >= 65 && critical_gaps.length <= 1) {
        return "apply_with_tailoring";
    }
    if (career_twin_score >= 45) {
        return "stretch_apply";
    }
    return "not_recommended";
}

export function explainMatch(params: {
    match: RoleMatchResult;
    gaps: GapReport;
    score: CareerTwinScore;
}): MatchExplanation {
    const { match, gaps, score } = params;

    const dimensionScores = match.dimension_scores;
    const criticalGaps = gaps.critical_gaps ?? [];
    const evidenceGaps = gaps.evidence_gaps ?? [];
    const matchedSkills = match.matched_skills ?? [];
    const missingSkills = match.missing_skills ?? [];

    const whyFits: string[] = [];
    const whyNotFit: string[] = [];
    const resumeFixes: string[] = [];

    if ((dimensionScores?.skills ?? 0) >= 70) {
        whyFits.push("Your skills align well with the role requirements.");
    }
    if ((dimensionScores?.title ?? 0) >= 70) {
        whyFits.push("Your current role family/title aligns with the target role.");
    }
    if ((dimensionScores?.seniority ?? 0) >= 70) {
        whyFits.push("Your seniority level is close to what the role expects.");
    }
    if ((dimensionScores?.domain ?? 0) >= 70) {
        whyFits.push("Your domain background looks relevant for this role.");
    }
    if ((dimensionScores?.leadership ?? 0) >= 70) {
        whyFits.push("You show strong leadership signals for this role.");
    }
    if ((dimensionScores?.communication ?? 0) >= 70) {
        whyFits.push("You show strong communication and stakeholder signals.");
    }
    if (matchedSkills.length > 0) {
        whyFits.push(`Key matched skills: ${topN(matchedSkills, 4).join(", ")}.`);
    }

    if (criticalGaps.length > 0) {
        for (const gap of topN(criticalGaps, 3)) {
            whyNotFit.push(gap.label);
        }
    }
    if (match.title_gap) {
        whyNotFit.push(match.title_gap);
    }
    if (match.seniority_gap) {
        whyNotFit.push(match.seniority_gap);
    }

    const evidenceGapSkills = topN(
        evidenceGaps
            .map(g => g.skill)
            .filter((s): s is string => Boolean(s)),
        4
    );

    for (const skill of evidenceGapSkills) {
        resumeFixes.push(`Add one recent bullet proving ${skill} with ownership and measurable impact.`);
    }

    if (resumeFixes.length === 0 && missingSkills.length > 0) {
        resumeFixes.push(`Prioritize clearer proof for ${topN(missingSkills, 3).join(", ")} in your latest role bullets.`);
    }
    if (resumeFixes.length === 0) {
        resumeFixes.push("Tailor your summary and top achievements to mirror the job's required skills.");
    }

    const recommendation = recommendationFrom(score.career_twin_score, criticalGaps);

    const finalWhyFits = unique(topN(whyFits, 5));
    const finalWhyNotFit = unique(topN(whyNotFit, 5));
    const finalResumeFixes = unique(topN(resumeFixes, 5));

    const summary = `${score.label} fit (${score.career_twin_score}/100). ${gaps.summary}`;

    return {
        why_this_role_fits_you: finalWhyFits,
        why_this_role_may_not_fit: finalWhyNotFit,
        what_to_fix_in_your_resume: finalResumeFixes,
        summary,
        recommendation,
    };
}
