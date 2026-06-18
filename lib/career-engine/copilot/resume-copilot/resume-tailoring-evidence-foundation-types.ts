import type { CareerGraph, EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";
import type { CareerSignals } from "@/lib/career-engine/strategy/career-signals-service";
import type { RoleFitResult } from "@/lib/career-engine/matching/role-fit-service";
import type { CapabilityMatchResult } from "@/lib/career-engine/matching/capability-match-v1";

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
    evidence_strength_score?: number;
    ownership_signal_bonus?: number;
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

export type ResumeCopilotIntelligenceContext = {
    careerGraph: CareerGraph;
    capabilityMatch?: CapabilityMatchResult | null;
    careerSignals?: CareerSignals | null;
    roleFit?: RoleFitResult | null;
};
