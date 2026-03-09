import type { ProfileInput, RoleMatchResult } from "../matching/role-matcher";
import type { ParsedJobDescription } from "./jd-parser";
import type { GapReport, GapItem } from "../scoring/gap-prioritizer";
import { matchRoles } from "../matching/role-matcher";
import { prioritizeGaps } from "../scoring/gap-prioritizer";
import { normalizeSkill } from "../parsing/skill-normalizer";

export interface SimulatedImprovement {
    added_skill_or_capability: string;
    gap_type: GapItem["type"];
    score_before: number;
    score_after: number;
    score_delta: number;
    new_match_label: string;
    explanation: string;
}

export interface SimulationResult {
    baseline_score: number;
    improvements: SimulatedImprovement[];
    best_case_score: number;        // score if all top-3 gaps were resolved
}

function resolveGap(
    profile: ProfileInput,
    gap: GapItem,
    jd: ParsedJobDescription
): ProfileInput {
    if (gap.type === "skill" && gap.skill) {
        // Add the skill to the profile if not already present (case-insensitive exact match)
        const profileNorm = profile.skills.map(s => s.toLowerCase().trim());
        const gapNorm = gap.skill.toLowerCase().trim();

        const alreadyHas = profileNorm.includes(gapNorm);
        return alreadyHas
            ? profile
            : { ...profile, skills: [...profile.skills, gap.skill] };
    }

    if (gap.type === "seniority") {
        // Simulate gaining enough experience to meet JD requirement
        const targetYears = jd.years_required ?? (profile.years_experience ?? 0) + 2;
        return { ...profile, years_experience: Math.max(profile.years_experience ?? 0, targetYears) };
    }

    if (gap.type === "title") {
        // Simulate aligning title by adopting the JD target title
        return { ...profile, current_title: jd.target_title ?? profile.current_title };
    }

    if (gap.type === "experience") {
        // Simulate adding the top 2 missing required skills as a proxy for broader experience
        const profileNorm = profile.skills.map(s => s.toLowerCase().trim());
        const topMissing = jd.required_skills
            .filter(s => !profileNorm.includes(s.normalized.toLowerCase().trim()))
            .slice(0, 2)
            .map(s => s.normalized);
        return { ...profile, skills: [...profile.skills, ...topMissing] };
    }

    return profile;
}

export function simulateGapResolution(
    profile: ProfileInput,
    jd: ParsedJobDescription,
    match: RoleMatchResult,
    gaps: GapReport
): SimulationResult {
    const baseline_score = match.match_score;

    // Only simulate gaps that are critical or important
    const candidateGaps = [
        ...gaps.priority_gaps.filter(g => g.priority !== "nice-to-have"),
        ...gaps.quick_wins.filter(g => g.type === "skill" && g.skill),
    ].filter((g, i, arr) => {
        // Deduplicate by skill+type key
        const key = g.skill ?? g.type;
        return arr.findIndex(x => (x.skill ?? x.type) === key) === i;
    });

    const improvements: SimulatedImprovement[] = [];

    for (const gap of candidateGaps) {
        const simulatedProfile = resolveGap(profile, gap, jd);

        // Discard if the resolution didn't actually change the profile (e.g., skill already existed)
        if (simulatedProfile === profile || JSON.stringify(simulatedProfile) === JSON.stringify(profile)) {
            continue;
        }

        // Re-run match with simulated profile
        const newMatch = matchRoles(simulatedProfile, jd);
        const delta = newMatch.match_score - baseline_score;

        // Skip if no meaningful improvement
        if (delta <= 0) continue;

        const label = gap.skill ?? gap.type;
        let explanation = "";

        if (gap.type === "skill" && gap.skill) {
            explanation = `Adding ${gap.skill} to your profile unlocks ${newMatch.matched_skills.length - match.matched_skills.length} additional required skill match(es), improving your coverage score.`;
        } else if (gap.type === "seniority") {
            explanation = `Meeting the experience requirement shifts your experience score from ${Math.round(match.experience_score)} to ${Math.round(newMatch.experience_score)}, lifting overall fit.`;
        } else if (gap.type === "title") {
            explanation = `Aligning your title with "${jd.target_title}" resolves the title gap, adding to your role alignment score.`;
        } else {
            explanation = `Resolving this experience gap by demonstrating required skills more explicitly could raise your match score significantly.`;
        }

        improvements.push({
            added_skill_or_capability: label,
            gap_type: gap.type,
            score_before: baseline_score,
            score_after: newMatch.match_score,
            score_delta: delta,
            new_match_label: newMatch.match_label,
            explanation,
        });
    }

    // Sort by delta descending, return top 3
    improvements.sort((a, b) => b.score_delta - a.score_delta);
    const top3 = improvements.slice(0, 3);

    // Compute best-case: apply all top-3 gaps cumulatively
    let cumulativeProfile = profile;
    for (const imp of top3) {
        const gap = candidateGaps.find(g => (g.skill ?? g.type) === imp.added_skill_or_capability);
        if (gap) cumulativeProfile = resolveGap(cumulativeProfile, gap, jd);
    }
    const bestCaseMatch = matchRoles(cumulativeProfile, jd);
    const best_case_score = bestCaseMatch.match_score;

    return {
        baseline_score,
        improvements: top3,
        best_case_score,
    };
}
