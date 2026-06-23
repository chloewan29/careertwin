import type {
    RankedResumeEvidence,
    ResumeCopilotDebugOutput,
    ResumeCopilotPublicOutput,
    ResumeOutputBuilderParams,
    ResumeOutputBuilderResult,
    TailoredCvFormatContract,
} from "./resume-output-builder-types";

const MAX_BULLET_CHAR_LENGTH = 220;
const MAX_BULLET_WORD_COUNT = 32;
const MAX_BULLETS_PER_EXPERIENCE = 4;
const MAX_CORE_SKILLS = 7;

const TAILORED_CV_FORMAT_CONTRACT: TailoredCvFormatContract = {
    sectionOrder: ["contact", "professional_summary", "core_skills", "professional_experience", "education"],
    experienceCoverage: {
        preserveReverseChronology: true,
        maxBulletsPerExperience: MAX_BULLETS_PER_EXPERIENCE,
    },
    styleRules: {
        summaryStyle: "grounded_paragraph",
        coreSkillsStyle: "grouped_capability_line",
        bulletStyle: "natural_specific",
    },
};

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function sentenceCase(value: string): string {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return "";
    const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function trimBullet(value: string): { text: string; wasCompacted: boolean; sourceWasParagraphLike: boolean } {
    const normalized = value.replace(/\s+/g, " ").trim();
    const tokens = normalized.split(" ").filter(Boolean);
    const sourceWasParagraphLike = normalized.length > MAX_BULLET_CHAR_LENGTH || tokens.length > MAX_BULLET_WORD_COUNT;
    let compacted = normalized;
    if (tokens.length > MAX_BULLET_WORD_COUNT) {
        compacted = tokens.slice(0, MAX_BULLET_WORD_COUNT).join(" ");
    }
    if (compacted.length > MAX_BULLET_CHAR_LENGTH) {
        compacted = compacted.slice(0, MAX_BULLET_CHAR_LENGTH).trim();
        if (compacted.includes(" ")) {
            compacted = compacted.slice(0, compacted.lastIndexOf(" ")).trim();
        }
    }
    const cleaned = sentenceCase(compacted.replace(/[;:,.\-]+$/g, ""));
    return {
        text: cleaned,
        wasCompacted: cleaned !== sentenceCase(normalized.replace(/[;:,.\-]+$/g, "")),
        sourceWasParagraphLike,
    };
}

function experienceKey(params: { company: string; role: string }): string {
    return `${normalizeText(params.company)}||${normalizeText(params.role)}`;
}

function buildExperienceRankMap(params: ResumeOutputBuilderParams): Map<string, number> {
    return new Map(
        (params.summaryDebug.ranked_experience_order ?? []).map((item, index) => [
            experienceKey({ company: item.company, role: item.role }),
            index,
        ]),
    );
}

function buildCoreSkills(params: ResumeOutputBuilderParams): string[] {
    const fromSummary = params.matchedCapabilitiesInSummary ?? [];
    const fromEvidence = params.selectedEvidence.flatMap((entry) => entry.score.matched_capabilities ?? []);
    return dedupe([...fromSummary, ...fromEvidence]).slice(0, MAX_CORE_SKILLS);
}

function sanitizeSummary(summary: string | null): string | null {
    const cleaned = (summary ?? "").replace(/\s+/g, " ").trim();
    return cleaned.length > 0 ? cleaned : null;
}

export function buildResumeCopilotOutput(params: ResumeOutputBuilderParams): ResumeOutputBuilderResult {
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

    const experienceRankMap = buildExperienceRankMap(params);

    const processedGroups = Array.from(grouped.values()).map((entries) => {
        const first = entries[0];
        const debugBullets = entries
            .slice()
            .sort((left, right) => right.score.total_score - left.score.total_score)
            .map((entry) => {
                const rewritten = trimBullet(entry.evidence.raw_text);
                return {
                    evidence_piece_id: entry.evidence.id,
                    original_bullet: entry.evidence.raw_text,
                    rewritten_bullet: rewritten.text,
                    original_length: entry.evidence.raw_text.length,
                    rewritten_length: rewritten.text.length,
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
            })
            .slice(0, MAX_BULLETS_PER_EXPERIENCE);

        return {
            company: first.evidence.company,
            role: first.evidence.role,
            date_range: first.evidence.date_range,
            bullets: debugBullets,
        };
    })
        .filter((entry) => entry.bullets.length > 0)
        .sort((left, right) => {
            const leftRank = experienceRankMap.get(experienceKey({ company: left.company, role: left.role })) ?? Number.MAX_SAFE_INTEGER;
            const rightRank = experienceRankMap.get(experienceKey({ company: right.company, role: right.role })) ?? Number.MAX_SAFE_INTEGER;
            if (leftRank !== rightRank) return leftRank - rightRank;
            return left.company.localeCompare(right.company);
        });

    const experience = processedGroups.map((entry) => ({
        company: entry.company,
        role: entry.role,
        date_range: entry.date_range,
        bullets: entry.bullets.map((bullet) => bullet.rewritten_bullet),
    }));

    const coreSkills = buildCoreSkills(params);
    const education = dedupe(params.educationEntries ?? []);
    const resume: ResumeCopilotPublicOutput = {
        ...(params.profileHeader ? { header: params.profileHeader } : {}),
        summary: sanitizeSummary(params.summary),
        ...(coreSkills.length > 0 ? { core_skills: coreSkills } : {}),
        experience,
        ...(education.length > 0 ? { education } : {}),
        ...(typeof params.jobAnalysis !== "undefined" ? { job_analysis: params.jobAnalysis } : {}),
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
                tailored_cv_format_contract_applied: true,
                summary_style_contract_applied: resume.summary !== null,
                core_skills_style_contract_applied: coreSkills.length > 0,
                education_section_included: education.length > 0,
                selected_evidence_ids_unchanged: true,
            },
            job_signals: params.jobSignals,
            experiences: processedGroups,
        },
    };
}
