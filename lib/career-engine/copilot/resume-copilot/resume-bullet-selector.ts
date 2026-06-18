import type {
    RankedResumeEvidence,
    ResumeCopilotJobSignals,
} from "./resume-tailoring-evidence-foundation-types";

function sortByDeterministicOrder(a: RankedResumeEvidence, b: RankedResumeEvidence): number {
    if (a.experienceOrder !== b.experienceOrder) {
        return a.experienceOrder - b.experienceOrder;
    }
    const sortA = a.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
    const sortB = b.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) return sortA - sortB;
    return a.evidence.id.localeCompare(b.evidence.id);
}

export function selectCoverageAwareBullets(params: {
    rankedEvidence: RankedResumeEvidence[];
    jobSignals: ResumeCopilotJobSignals;
    maxBulletsPerExperience: number;
    minBulletsPerExperience: number;
    maxEvidencePieces?: number;
    minEvidencePieces?: number;
}): RankedResumeEvidence[] {
    const maxBulletsPerExperience = Math.max(1, params.maxBulletsPerExperience);
    const maxEvidencePieces = Math.max(1, params.maxEvidencePieces ?? params.rankedEvidence.length);
    const byPriority = [...params.rankedEvidence]
        .sort((left, right) => {
            if (right.score.total_score !== left.score.total_score) {
                return right.score.total_score - left.score.total_score;
            }
            return sortByDeterministicOrder(left, right);
        });

    const selected: RankedResumeEvidence[] = [];
    const perExperience = new Map<string, number>();
    for (const candidate of byPriority) {
        if (selected.length >= maxEvidencePieces) break;
        const current = perExperience.get(candidate.evidence.experience_id) ?? 0;
        if (current >= maxBulletsPerExperience) continue;
        perExperience.set(candidate.evidence.experience_id, current + 1);
        candidate.score.coverage_novelty_bonus = candidate.score.coverage_novelty_bonus ?? 0;
        selected.push(candidate);
    }

    return selected.sort(sortByDeterministicOrder);
}
