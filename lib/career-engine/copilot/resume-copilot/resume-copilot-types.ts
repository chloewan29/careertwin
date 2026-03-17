import type { CareerGraph, EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";
import type { CareerSignals } from "@/lib/career-engine/strategy/career-signals-service";
import type { RoleFitResult } from "@/lib/career-engine/matching/role-fit-service";
import type { CapabilityMatchResult } from "@/lib/career-engine/matching/capability-match-v1";
import type { JobCopilotAnalysis } from "@/lib/career-engine/job-copilot/job-analysis";

export type ResumeCopilotJobSignals = {
    job_id: string;
    target_title: string | null;
    role_family: string | null;
    required_skills: string[];
    preferred_skills: string[];
    responsibilities: string[];
    domains: string[];
    keywords: string[];
};

export type ResumeScoreBreakdown = {
    canonical_capability_score?: number;
    lexical_tiebreaker_score?: number;
    capability_importance_score?: number;
    capability_strength_score?: number;
    signal_quality_score?: number;
    keyword_overlap: number;
    required_skill_overlap: number;
    preferred_skill_overlap: number;
    responsibility_overlap: number;
    role_family_overlap: number;
    domain_overlap: number;
    capability_alignment_bonus: number;
    role_fit_evidence_bonus: number;
    career_signal_highlight_bonus: number;
    capability_match_bonus?: number;
    weak_jd_recency_boost?: number;
    weak_jd_seniority_boost?: number;
    weak_jd_impact_boost?: number;
    weak_jd_ownership_boost?: number;
    weak_jd_specificity_boost?: number;
    coverage_novelty_bonus: number;
    total_score: number;
    matched_required_skills: string[];
    matched_preferred_skills: string[];
    matched_responsibilities: string[];
    matched_keywords: string[];
    matched_domains: string[];
    matched_role_family_terms: string[];
    matched_capabilities: string[];
};

export type RankedResumeEvidence = {
    evidence: EvidencePiece;
    poolSources: string[];
    score: ResumeScoreBreakdown;
    matchedSignals: string[];
    matchedCapabilitiesDetailed?: Array<{
        canonical_name: string;
        display_name: string;
        importance: "critical" | "important" | "supporting";
        candidate_strength_score: number;
        match_status: "strong" | "partial" | "weak" | "missing";
    }>;
    supportingSignalDetails?: Array<{
        evidence_signal_id: string;
        action: string | null;
        ownership_level: string | null;
        scope_level: string | null;
        impact_signal: string | null;
        linked_capabilities: string[];
    }>;
    experienceOrder: number;
};

export type ResumeEvidencePoolEntry = {
    evidence: EvidencePiece;
    poolSources: string[];
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
    rewrite_input?: {
        target_job_capabilities: string[];
        matched_candidate_capabilities: string[];
        supporting_signal_actions: string[];
        highlight_priorities: string[];
    };
    score_breakdown: ResumeScoreBreakdown;
};

export type ResumeDebugExperience = {
    company: string;
    role: string;
    date_range: string;
    bullets: ResumeDebugBullet[];
};

export type ResumeSummaryDebug = {
    weak_jd_mode: boolean;
    source_evidence_ids: string[];
    source_companies: string[];
    source_roles: string[];
    source_themes: string[];
    source_matched_capabilities: string[];
    target_title_used: string | null;
    role_family_used: string | null;
    ranked_experience_order: Array<{
        company: string;
        role: string;
        score: number;
        recency_rank: number;
    }>;
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
        canonical_only_mode?: boolean;
        legacy_fallback_enabled?: boolean;
        legacy_fallback_contributed?: boolean;
        summary_debug?: ResumeSummaryDebug;
        dropped_for_length: number;
        dropped_for_validation: number;
        dropped_for_duplicate: number;
    };
    job_signals: ResumeCopilotJobSignals;
    experiences: ResumeDebugExperience[];
};

export type ResumeCopilotPublicExperience = {
    company: string;
    role: string;
    date_range: string;
    bullets: string[];
};

export type ResumeCopilotPublicOutput = {
    summary: string | null;
    experience: ResumeCopilotPublicExperience[];
    job_analysis?: JobCopilotAnalysis;
};

export type ResumeCopilotServiceOptions = {
    maxBulletsPerExperience?: number;
    minBulletsPerExperience?: number;
    includeDebug?: boolean;
    calibrationContext?: {
        confirmed_strength_areas?: string[];
        positioning_hints?: string[];
    };
};

export type ResumeCopilotServiceInput = {
    profileId: string;
    jobId: string;
    options?: ResumeCopilotServiceOptions;
};

export type ResumeTailoredResumeArtifact = {
    format: "text/plain";
    download_url: string;
};

export type ResumeTailoringResult = {
    job_analysis: JobCopilotAnalysis;
    tailored_resume_artifact?: ResumeTailoredResumeArtifact;
};

export type ResumeCopilotServiceResult = {
    resume: ResumeCopilotPublicOutput;
    job_analysis?: JobCopilotAnalysis;
    tailoring_result?: ResumeTailoringResult;
    debug?: ResumeCopilotDebugOutput;
};

export type ResumeCopilotIntelligenceContext = {
    careerGraph: CareerGraph;
    capabilityMatch?: CapabilityMatchResult | null;
    careerSignals?: CareerSignals | null;
    roleFit?: RoleFitResult | null;
};
