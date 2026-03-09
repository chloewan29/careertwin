export interface MatchHistoryEntry {
    matched_skills: string[];
    missing_skills: string[];
    gap_analysis: {
        priority_gaps: Array<{
            skill: string | null;
            type: string;
            priority: "critical" | "important" | "nice-to-have";
            gap_description: string;
        }>;
    } | null;
}

export interface RecurringGap {
    skill_or_type: string;         // skill name or gap type label
    frequency: number;             // how many analyses flagged this
    priority: "critical" | "important" | "nice-to-have";
    description: string;
}

export interface RecurringStrength {
    skill: string;
    frequency: number;             // how many analyses matched this
    description: string;
}

export interface RecurringGapReport {
    recurring_gaps: RecurringGap[];
    recurring_strengths: RecurringStrength[];
}

function topN<T>(items: T[], n: number): T[] {
    return items.slice(0, n);
}

export function detectRecurringPatterns(
    history: MatchHistoryEntry[]
): RecurringGapReport {
    if (history.length === 0) {
        return { recurring_gaps: [], recurring_strengths: [] };
    }

    // --- Recurring gaps ---
    // Count how often each skill/gap appears as a gap across analyses
    const gapSkillCount = new Map<string, { count: number; priority: "critical" | "important" | "nice-to-have"; description: string }>();

    for (const entry of history) {
        // Count missing skills
        const seenInEntry = new Set<string>();
        for (const skill of entry.missing_skills) {
            if (!skill || seenInEntry.has(skill)) continue;
            seenInEntry.add(skill);
            const existing = gapSkillCount.get(skill);
            if (existing) {
                existing.count++;
            } else {
                gapSkillCount.set(skill, { count: 1, priority: "important", description: `Missing from ${1} analysis` });
            }
        }

        // Upgrade priority if flagged as critical in gap_analysis
        for (const gap of entry.gap_analysis?.priority_gaps ?? []) {
            const key = gap.skill ?? `[${gap.type}]`;
            if (seenInEntry.has(key)) continue;
            seenInEntry.add(key);
            const existing = gapSkillCount.get(key);
            if (existing) {
                existing.count++;
                // Promote priority if we see a higher-severity instance
                if (gap.priority === "critical") existing.priority = "critical";
                else if (gap.priority === "important" && existing.priority === "nice-to-have") existing.priority = "important";
            } else {
                gapSkillCount.set(key, {
                    count: 1,
                    priority: gap.priority,
                    description: gap.gap_description,
                });
            }
        }
    }

    // Sort: first by frequency desc, then critical > important > nice-to-have
    const PRIORITY_RANK: Record<string, number> = { critical: 0, important: 1, "nice-to-have": 2 };
    const sortedGaps = [...gapSkillCount.entries()]
        .filter(([, v]) => v.count >= 1)
        .sort(([, a], [, b]) => {
            if (b.count !== a.count) return b.count - a.count;
            return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        });

    const recurring_gaps: RecurringGap[] = topN(
        sortedGaps.map(([key, val]) => ({
            skill_or_type: key,
            frequency: val.count,
            priority: val.priority,
            description:
                val.count > 1
                    ? `Flagged as a gap in ${val.count} of your last ${history.length} analyses. ${val.description}`
                    : val.description,
        })),
        3
    );

    // --- Recurring strengths ---
    // Count how often each skill appears as a match across analyses
    const strengthCount = new Map<string, number>();

    for (const entry of history) {
        const seenInEntry = new Set<string>();
        for (const skill of entry.matched_skills) {
            if (!skill || seenInEntry.has(skill)) continue;
            seenInEntry.add(skill);
            strengthCount.set(skill, (strengthCount.get(skill) ?? 0) + 1);
        }
    }

    const sortedStrengths = [...strengthCount.entries()]
        .filter(([, count]) => count >= 1)
        .sort(([, a], [, b]) => b - a);

    const recurring_strengths: RecurringStrength[] = topN(
        sortedStrengths.map(([skill, count]) => ({
            skill,
            frequency: count,
            description:
                count > 1
                    ? `Matched in ${count} of your last ${history.length} analyses — a consistent strength.`
                    : `Matched in 1 analysis — present but not yet consistently evidenced.`,
        })),
        3
    );

    return { recurring_gaps, recurring_strengths };
}
