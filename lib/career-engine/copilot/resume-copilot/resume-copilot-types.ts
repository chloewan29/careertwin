import type { CareerGraph, EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";
import type { CareerSignals } from "@/lib/career-engine/strategy/career-signals-service";
import type { RoleFitResult } from "@/lib/career-engine/matching/role-fit-service";

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
    keyword_overlap: number;
    required_skill_overlap: number;
    preferred_skill_overlap: number;
    responsibility_overlap: number;
    role_family_overlap: number;
    domain_overlap: number;
    capability_alignment_bonus: number;
    role_fit_evidence_bonus: number;
    career_signal_highlight_bonus: number;
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
    pool_sources: string[];
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
};

export type ResumeCopilotServiceOptions = {
    maxBulletsPerExperience?: number;
    minBulletsPerExperience?: number;
    includeDebug?: boolean;
};

export type ResumeCopilotServiceInput = {
    profileId: string;
    jobId: string;
    options?: ResumeCopilotServiceOptions;
};

export type ResumeCopilotServiceResult = {
    resume: ResumeCopilotPublicOutput;
    debug?: ResumeCopilotDebugOutput;
};

export type ResumeCopilotIntelligenceContext = {
    careerGraph: CareerGraph;
    careerSignals: CareerSignals;
    roleFit: RoleFitResult | null;
};
