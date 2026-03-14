import {
    MAX_BULLET_CHAR_LENGTH,
    MAX_BULLET_WORD_COUNT,
    rewriteBulletWithCompaction,
} from "./resume-rewriter";
import type {
    ResumeCopilotIntelligenceContext,
    RankedResumeEvidence,
    ResumeCopilotDebugOutput,
    ResumeCopilotJobSignals,
    ResumeCopilotPublicOutput,
    ResumeSummaryDebug,
    ResumeCopilotServiceResult,
} from "./resume-copilot-types";

export function buildResumeCopilotOutput(params: {
    profileId: string;
    careerId: string | null;
    jobSignals: ResumeCopilotJobSignals;
    selectedEvidence: RankedResumeEvidence[];
    summary: string | null;
    matchedCapabilitiesInSummary: string[];
    summaryDebug: ResumeSummaryDebug;
    totalEvidenceLoaded: number;
    totalEvidenceInPool: number;
    totalEvidenceRanked: number;
    emptyReason?: string | null;
    evidencePoolFallbackUsed?: boolean;
    poolSourceCounts: Record<string, number>;
    intelligenceContext: ResumeCopilotIntelligenceContext;
    canonicalOnlyMode: boolean;
    legacyFallbackEnabled: boolean;
    includeDebug: boolean;
    jobAnalysis?: ResumeCopilotServiceResult["job_analysis"];
}): { resume: ResumeCopilotPublicOutput; job_analysis?: ResumeCopilotServiceResult["job_analysis"]; debug?: ResumeCopilotDebugOutput } {
    const grouped = new Map<string, RankedResumeEvidence[]>();
    const dropMetrics = {
        dropped_for_length: 0,
        dropped_for_validation: 0,
        dropped_for_duplicate: 0,
    };
    const seenBulletKeys = new Set<string>();

    for (const ranked of params.selectedEvidence) {
        const key = `${ranked.evidence.company}||${ranked.evidence.role}||${ranked.evidence.date_range}`;
        const bucket = grouped.get(key) ?? [];
        bucket.push(ranked);
        grouped.set(key, bucket);
    }

    const processedGroups = Array.from(grouped.values()).map((entries) => {
        const first = entries[0];
        const debugBullets = entries
            .map((entry) => {
                const targetJobCapabilities = params.intelligenceContext.capabilityMatch?.job_capability_profile.map((item) => item.display_name) ?? [];
                const matchedCandidateCapabilities = entry.matchedCapabilitiesDetailed?.map((item) => item.display_name)
                    ?? entry.score.matched_capabilities;
                const supportingSignalActions = (entry.supportingSignalDetails ?? [])
                    .map((signal) => signal.action ?? "")
                    .filter(Boolean);
                const highlightPriorities = [
                    ...matchedCandidateCapabilities,
                    ...(entry.matchedCapabilitiesDetailed ?? [])
                        .filter((item) => item.importance === "critical" || item.importance === "important")
                        .map((item) => item.display_name),
                ];
                const rewritten = rewriteBulletWithCompaction(entry.evidence.raw_text, {
                    targetJobCapabilities,
                    matchedCandidateCapabilities,
                    supportingSignalActions,
                    highlightPriorities,
                });
                return {
                    evidence_piece_id: entry.evidence.id,
                    original_bullet: entry.evidence.raw_text,
                    rewritten_bullet: rewritten.rewrittenBullet,
                    original_length: rewritten.originalLength,
                    rewritten_length: rewritten.rewrittenLength,
                    was_compacted: rewritten.wasCompacted,
                    source_was_paragraph_like: rewritten.sourceWasParagraphLike,
                    score: entry.score.total_score,
                    matched_signals: entry.matchedSignals,
                    matched_capabilities: entry.score.matched_capabilities,
                    matched_capabilities_detailed: entry.matchedCapabilitiesDetailed ?? [],
                    supporting_signal_details: entry.supportingSignalDetails ?? [],
                    pool_sources: entry.poolSources,
                    selection_reason: {
                        canonical_capability_score: entry.score.canonical_capability_score,
                        lexical_tiebreaker_score: entry.score.lexical_tiebreaker_score,
                        matched_capability_count: entry.score.matched_capabilities.length,
                        supporting_signal_count: entry.supportingSignalDetails?.length ?? 0,
                    },
                    rewrite_input: {
                        target_job_capabilities: targetJobCapabilities,
                        matched_candidate_capabilities: matchedCandidateCapabilities,
                        supporting_signal_actions: supportingSignalActions,
                        highlight_priorities: highlightPriorities,
                    },
                    score_breakdown: entry.score,
                };
            })
            .filter((bullet) => {
                const wordCount = bullet.rewritten_bullet.split(" ").filter(Boolean).length;
                const exceedsLength = bullet.rewritten_length > MAX_BULLET_CHAR_LENGTH || wordCount > MAX_BULLET_WORD_COUNT;
                if (exceedsLength) {
                    dropMetrics.dropped_for_length += 1;
                    return false;
                }

                const invalidText = bullet.rewritten_bullet.trim().length < 8;
                if (invalidText) {
                    dropMetrics.dropped_for_validation += 1;
                    return false;
                }

                const dedupeKey = bullet.rewritten_bullet
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                if (!dedupeKey || seenBulletKeys.has(dedupeKey)) {
                    dropMetrics.dropped_for_duplicate += 1;
                    return false;
                }
                seenBulletKeys.add(dedupeKey);
                return true;
            });

        return {
            company: first.evidence.company,
            role: first.evidence.role,
            date_range: first.evidence.date_range,
            bullets: debugBullets,
        };
    }).filter((entry) => entry.bullets.length > 0);

    const experience = processedGroups.map((entry) => ({
        company: entry.company,
        role: entry.role,
        date_range: entry.date_range,
        bullets: entry.bullets.map((bullet) => bullet.rewritten_bullet),
    }));

    const resume: ResumeCopilotPublicOutput = {
        summary: params.summary,
        experience,
        job_analysis: params.jobAnalysis,
    };

    if (!params.includeDebug) {
        return { resume, job_analysis: params.jobAnalysis };
    }

    const legacyFallbackContributed = Object.keys(params.poolSourceCounts).some((source) =>
        source.startsWith("role_fit.") || source.startsWith("career_signals."),
    );

    return {
        resume,
        job_analysis: params.jobAnalysis,
        debug: {
            metadata: {
                profile_id: params.profileId,
                career_id: params.careerId,
                job_id: params.jobSignals.job_id,
                total_evidence_loaded: params.totalEvidenceLoaded,
                total_evidence_in_pool: params.totalEvidenceInPool,
                total_evidence_ranked: params.totalEvidenceRanked,
                total_evidence_selected: params.selectedEvidence.length,
                selected_experience_count: experience.length,
                empty_reason: params.emptyReason ?? null,
                evidence_pool_fallback_used: Boolean(params.evidencePoolFallbackUsed),
                pool_source_counts: params.poolSourceCounts,
                matched_capabilities_in_summary: params.matchedCapabilitiesInSummary,
                canonical_only_mode: params.canonicalOnlyMode,
                legacy_fallback_enabled: params.legacyFallbackEnabled,
                legacy_fallback_contributed: legacyFallbackContributed,
                summary_debug: params.summaryDebug,
                dropped_for_length: dropMetrics.dropped_for_length,
                dropped_for_validation: dropMetrics.dropped_for_validation,
                dropped_for_duplicate: dropMetrics.dropped_for_duplicate,
            },
            job_signals: params.jobSignals,
            experiences: processedGroups,
        },
    };
}
