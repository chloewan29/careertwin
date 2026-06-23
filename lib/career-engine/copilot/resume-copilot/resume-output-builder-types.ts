import type {
    RankedResumeEvidence,
    ResumeCopilotIntelligenceContext,
    ResumeCopilotJobSignals,
} from "./resume-tailoring-evidence-foundation-types";
import type { ResumeSummaryDebug } from "./resume-summary-builder-types";

export type TailoredCvFormatContract = {
    sectionOrder: ["contact", "professional_summary", "core_skills", "professional_experience", "education"];
    experienceCoverage: {
        preserveReverseChronology: boolean;
        maxBulletsPerExperience: number;
    };
    styleRules: {
        summaryStyle: "grounded_paragraph";
        coreSkillsStyle: "grouped_capability_line";
        bulletStyle: "natural_specific";
    };
};

export type ResumeCopilotPublicHeader = {
    full_name: string;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    linkedin_url?: string | null;
};

export type ResumeCopilotPublicExperience = {
    company: string;
    role: string;
    date_range: string;
    bullets: string[];
};

export type ResumeCopilotPublicOutput = {
    header?: ResumeCopilotPublicHeader;
    summary: string | null;
    core_skills?: string[];
    experience: ResumeCopilotPublicExperience[];
    education?: string[];
    job_analysis?: unknown;
};

export type ResumeDebugBullet = {
    evidence_piece_id: string;
    original_bullet: string;
    rewritten_bullet: string;
    original_length: number;
    rewritten_length: number;
    was_compacted: boolean;
    source_was_paragraph_like: boolean;
    score: number;
    matched_signals: string[];
    matched_capabilities?: string[];
    matched_capabilities_detailed?: RankedResumeEvidence["matchedCapabilitiesDetailed"];
    supporting_signal_details?: RankedResumeEvidence["supportingSignalDetails"];
    pool_sources: string[];
    selection_reason?: {
        canonical_capability_score?: number;
        lexical_tiebreaker_score?: number;
        matched_capability_count: number;
        supporting_signal_count: number;
    };
    score_breakdown: RankedResumeEvidence["score"];
};

export type ResumeDebugExperience = {
    company: string;
    role: string;
    date_range: string;
    bullets: ResumeDebugBullet[];
};

export type ResumeCopilotDebugOutput = {
    metadata: {
        profile_id: string;
        career_id: string | null;
        job_id: string;
        total_evidence_loaded: number;
        total_evidence_in_pool: number;
        total_evidence_ranked: number;
        total_evidence_selected: number;
        selected_experience_count: number;
        empty_reason?: string | null;
        evidence_pool_fallback_used?: boolean;
        pool_source_counts: Record<string, number>;
        matched_capabilities_in_summary: string[];
        canonical_only_mode: boolean;
        legacy_fallback_enabled: boolean;
        legacy_fallback_contributed: boolean;
        summary_debug: ResumeSummaryDebug;
        dropped_for_length: number;
        dropped_for_validation: number;
        dropped_for_duplicate: number;
        tailored_cv_format_contract_applied: boolean;
        summary_style_contract_applied: boolean;
        core_skills_style_contract_applied: boolean;
        education_section_included: boolean;
        selected_evidence_ids_unchanged: boolean;
    };
    job_signals: ResumeCopilotJobSignals;
    experiences: ResumeDebugExperience[];
};

export type ResumeOutputBuilderParams = {
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
    jobAnalysis?: unknown;
    profileHeader?: ResumeCopilotPublicHeader;
    educationEntries?: string[];
};

export type ResumeOutputBuilderResult = {
    resume: ResumeCopilotPublicOutput;
    job_analysis?: unknown;
    debug?: ResumeCopilotDebugOutput;
};
