import type { RankedResumeEvidence, ResumeCopilotJobSignals } from "./resume-copilot-types";

function sortByDeterministicOrder(a: RankedResumeEvidence, b: RankedResumeEvidence): number {
    if (b.score.total_score !== a.score.total_score) {
        return b.score.total_score - a.score.total_score;
    }
    if (a.experienceOrder !== b.experienceOrder) {
        return a.experienceOrder - b.experienceOrder;
    }
    const sortA = a.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
    const sortB = b.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) return sortA - sortB;
    if (a.evidence.created_at !== b.evidence.created_at) {
        return a.evidence.created_at.localeCompare(b.evidence.created_at);
    }
    return a.evidence.id.localeCompare(b.evidence.id);
}

function computeNovelSignalCount(
    candidate: RankedResumeEvidence,
    coveredSignals: Set<string>,
): number {
    let count = 0;
    for (const signal of candidate.matchedSignals) {
        if (!coveredSignals.has(signal)) count += 1;
    }
    return count;
}

function pickBestCandidate(
    candidates: RankedResumeEvidence[],
    selectedIds: Set<string>,
    selectedPerExperience: Map<string, number>,
    maxBulletsPerExperience: number,
    coveredSignals: Set<string>,
): RankedResumeEvidence | null {
    let best: RankedResumeEvidence | null = null;
    let bestAdjustedScore = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
        if (selectedIds.has(candidate.evidence.id)) continue;
        const experienceCount = selectedPerExperience.get(candidate.evidence.experience_id) ?? 0;
        if (experienceCount >= maxBulletsPerExperience) continue;

        const novelty = computeNovelSignalCount(candidate, coveredSignals);
        const adjustedScore = candidate.score.total_score + (novelty * 2);
        if (adjustedScore > bestAdjustedScore) {
            bestAdjustedScore = adjustedScore;
            best = candidate;
            continue;
        }
        if (adjustedScore === bestAdjustedScore && best) {
            if (sortByDeterministicOrder(candidate, best) < 0) {
                best = candidate;
            }
        }
    }

    return best;
}

export function selectCoverageAwareBullets(params: {
    rankedEvidence: RankedResumeEvidence[];
    jobSignals: ResumeCopilotJobSignals;
    maxBulletsPerExperience: number;
    minBulletsPerExperience: number;
}): RankedResumeEvidence[] {
    const { rankedEvidence, maxBulletsPerExperience, minBulletsPerExperience } = params;
    const selectedIds = new Set<string>();
    const selectedPerExperience = new Map<string, number>();
    const coveredSignals = new Set<string>();
    const selected: RankedResumeEvidence[] = [];

    const requiredSignals = Array.from(
        new Set([
            ...params.jobSignals.required_skills,
            ...params.jobSignals.responsibilities,
        ]),
    );

    // Pass 1: target coverage of required signals first.
    for (const signal of requiredSignals) {
        const signalCandidates = rankedEvidence.filter((candidate) =>
            candidate.matchedSignals.includes(signal),
        );
        const picked = pickBestCandidate(
            signalCandidates,
            selectedIds,
            selectedPerExperience,
            maxBulletsPerExperience,
            coveredSignals,
        );
        if (!picked) continue;

        const novelty = computeNovelSignalCount(picked, coveredSignals);
        picked.score.coverage_novelty_bonus = novelty * 2;
        picked.score.total_score += picked.score.coverage_novelty_bonus;

        selected.push(picked);
        selectedIds.add(picked.evidence.id);
        selectedPerExperience.set(
            picked.evidence.experience_id,
            (selectedPerExperience.get(picked.evidence.experience_id) ?? 0) + 1,
        );
        picked.matchedSignals.forEach((matchedSignal) => coveredSignals.add(matchedSignal));
    }

    // Pass 2: ensure each represented experience has at least min bullets where possible.
    const rankedByExperience = new Map<string, RankedResumeEvidence[]>();
    for (const candidate of rankedEvidence) {
        const bucket = rankedByExperience.get(candidate.evidence.experience_id) ?? [];
        bucket.push(candidate);
        rankedByExperience.set(candidate.evidence.experience_id, bucket);
    }

    for (const [experienceId, candidates] of rankedByExperience.entries()) {
        while ((selectedPerExperience.get(experienceId) ?? 0) < minBulletsPerExperience) {
            const picked = pickBestCandidate(
                candidates,
                selectedIds,
                selectedPerExperience,
                maxBulletsPerExperience,
                coveredSignals,
            );
            if (!picked) break;

            const novelty = computeNovelSignalCount(picked, coveredSignals);
            picked.score.coverage_novelty_bonus = novelty * 2;
            picked.score.total_score += picked.score.coverage_novelty_bonus;

            selected.push(picked);
            selectedIds.add(picked.evidence.id);
            selectedPerExperience.set(experienceId, (selectedPerExperience.get(experienceId) ?? 0) + 1);
            picked.matchedSignals.forEach((matchedSignal) => coveredSignals.add(matchedSignal));
        }
    }

    // Pass 3: fill remaining high-value bullets with novelty-aware selection.
    while (true) {
        const picked = pickBestCandidate(
            rankedEvidence,
            selectedIds,
            selectedPerExperience,
            maxBulletsPerExperience,
            coveredSignals,
        );
        if (!picked) break;

        const novelty = computeNovelSignalCount(picked, coveredSignals);
        if (picked.score.total_score <= 0 && novelty === 0) break;

        picked.score.coverage_novelty_bonus = novelty * 2;
        picked.score.total_score += picked.score.coverage_novelty_bonus;

        selected.push(picked);
        selectedIds.add(picked.evidence.id);
        selectedPerExperience.set(
            picked.evidence.experience_id,
            (selectedPerExperience.get(picked.evidence.experience_id) ?? 0) + 1,
        );
        picked.matchedSignals.forEach((matchedSignal) => coveredSignals.add(matchedSignal));
    }

    return selected.sort((a, b) => {
        if (a.experienceOrder !== b.experienceOrder) return a.experienceOrder - b.experienceOrder;
        const sortA = a.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
        const sortB = b.evidence.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (sortA !== sortB) return sortA - sortB;
        return b.score.total_score - a.score.total_score;
    });
}
