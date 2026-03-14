import { getCapabilityStrengthProfile, type CapabilityStrengthProfileItem } from "@/lib/career-engine/capability/capability-strength";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import {
    loadCareerGraph,
    type Capability,
    type CareerGraph,
    type EvidencePiece,
    type EvidenceSignal,
} from "@/lib/career-engine/memory/career-graph-loader";
import {
    extractJobCapabilityProfileV1,
    type ExtractedJobCapability,
    type JobCapabilityImportance,
    type JobCapabilityProfileQuality,
    type JobCapabilitySourceTier,
} from "@/lib/career-engine/matching/job-capability-extractor";
import {
    inferCapabilityTransfer,
    type CapabilityTransferInference,
    type CapabilityTransferPattern,
    type CapabilityTransferPatternId,
} from "@/lib/career-engine/matching/capability-transfer-inference";
import {
    getStructuredJobUnderstanding,
    type StructuredJobUnderstanding,
} from "@/lib/career-engine/matching/job-understanding";
import { parseJobDescription } from "@/lib/career-engine/parsing/jd-parser";
import { normalizeTitle } from "@/lib/career-engine/parsing/title-normalizer";
import type {
    CandidateCapabilityForMatch,
    CapabilityMatchItem,
    CapabilityMatchStatus,
} from "@/lib/career-engine/matching/capability-match-v1";

type RequirementLayer = "core_mission" | "core_capability" | "secondary_method" | "domain_context";
type RequirementOptionality = "core" | "optional";
type GapClassification = "aligned" | "blocking_gap" | "stretch_gap" | "differentiator";
export type HumanAlignmentBucket = "high_fit" | "medium_fit" | "low_fit";

type RequirementClusterDefinition = {
    id: string;
    display_name: string;
    layer: RequirementLayer;
    direct_capabilities: string[];
    transfer_capabilities: string[];
    transfer_pattern_ids: CapabilityTransferPatternId[];
    activation_mode?: "standard" | "strict_blocker" | "explicit_signal";
    seed_terms: string[];
    method_terms: string[];
    domain_terms: string[];
    title_terms: string[];
    preferred_role_families?: string[];
    genericity?: "broad" | "balanced" | "specific";
    default_optionality: RequirementOptionality;
    default_importance: JobCapabilityImportance;
};

export type MatchVariantName =
    | "default"
    | "without_title_mismatch_penalty"
    | "reduced_title_prior_weight"
    | "without_ats_penalty_injection"
    | "richer_requirement_clustering"
    | "capability_transfer_matching_enabled"
    | "without_transfer_pattern_aggregation"
    | "literal_keyword_overlap_reduced"
    | "evidence_scope_ownership_weight_increased";

export type MatchVariantConfig = {
    variant_name?: MatchVariantName;
    title_prior_penalty_weight?: number;
    domain_prior_penalty_weight?: number;
    inject_ats_penalty?: boolean;
    richer_requirement_clustering?: boolean;
    capability_transfer_matching?: boolean;
    transfer_pattern_aggregation?: boolean;
    literal_keyword_weight?: number;
    ownership_scope_weight_multiplier?: number;
};

type JobRequirementCluster = {
    cluster_id: string;
    display_name: string;
    layer: RequirementLayer;
    direct_capabilities: string[];
    transfer_capabilities: string[];
    transfer_pattern_ids: string[];
    matched_terms: string[];
    evidence: string[];
    domain_modifiers: string[];
    methods: string[];
    importance: JobCapabilityImportance;
    importance_score: number;
    optionality: RequirementOptionality;
    confidence: number;
    genericity: "broad" | "balanced" | "specific";
    explicit_signal_count: number;
    jd_literal_signal_count: number;
    jd_repeated_signal_units: number;
    jd_section_coverage: number;
    jd_high_weight_signal_units: number;
    role_signal_coherence: number;
    specificity_score: number;
    role_family_alignment: string[];
};

type ParsedJobSummary = {
    target_title: string | null;
    normalized_title: string | null;
    role_family: string | null;
    seniority: string | null;
    company: string | null;
    location: string | null;
    mission_summary: string;
    required_skills: string[];
    preferred_skills: string[];
    responsibilities: string[];
    domains: string[];
};

type CandidateCapabilityAudit = {
    capability_id: string;
    canonical_name: string;
    display_name: string;
    strength_score: number;
    weighted_signal_score: number;
    signal_count: number;
    transferable_tags: string[];
    domain_tags: string[];
    top_supporting_signals: CapabilityStrengthProfileItem["top_supporting_signals"];
    supporting_evidence_piece_ids: string[];
};

type EvidenceCapabilityLink = {
    evidence_piece_id: string;
    evidence_signal_id: string | null;
    capability: string;
    contribution_weight: number;
    reason: string;
};

type RequirementMatchBreakdown = {
    cluster_id: string;
    display_name: string;
    layer: RequirementLayer;
    importance: JobCapabilityImportance;
    optionality: RequirementOptionality;
    direct_score: number;
    transfer_score: number;
    transfer_pattern_score: number;
    evidence_score: number;
    literal_overlap_score: number;
    ownership_scope_score: number;
    final_cluster_score: number;
    weight: number;
    weighted_contribution: number;
    match_status: CapabilityMatchStatus;
    gap_classification: GapClassification;
    supporting_capabilities: string[];
    supporting_patterns: string[];
    supporting_evidence_piece_ids: string[];
    missing_facets: string[];
    reasoning: string;
};

type TransferableCapabilityPatternAudit = CapabilityTransferPattern;

type ScoreComponent = {
    label: string;
    contribution: number;
    reason: string;
};

type CapabilityRankingAudit = {
    cluster_id: string;
    display_name: string;
    base_weighted_contribution: number;
    ranking_score: number;
    specificity_score: number;
    role_alignment_bonus: number;
    repeated_signal_bonus: number;
    literal_signal_bonus: number;
    section_signal_bonus: number;
    role_coherence_bonus: number;
    generic_penalty: number;
    tie_break_score: number;
    genericity: "broad" | "balanced" | "specific";
    jd_literal_signal_count: number;
    jd_repeated_signal_units: number;
    jd_section_coverage: number;
    jd_high_weight_signal_units: number;
    role_signal_coherence: number;
    reason: string;
};

type PriorEffect = {
    match_level: "direct" | "adjacent" | "indirect" | "mismatch";
    penalty: number;
    score: number;
    reason: string;
};

type RawScoreBreakdown = {
    base_requirement_score: number;
    weighted_requirement_score: number;
    core_requirement_score: number;
    secondary_requirement_score: number;
    transfer_match_score: number;
    transfer_pattern_score: number;
    evidence_alignment_score: number;
    literal_overlap_score: number;
    ownership_scope_score: number;
    mission_alignment_bonus: number;
    adjacent_transfer_bonus: number;
    high_fit_readiness_bonus: number;
    positive_bonus: number;
    blocking_gap_penalty: number;
    stretch_gap_penalty: number;
    title_prior_penalty: number;
    domain_prior_penalty: number;
    ats_penalty_injection: number;
    final_score: number;
};

export type CapabilityMatchAuditV2 = {
    raw_job_text: string;
    job_understanding: StructuredJobUnderstanding;
    parsed_job_summary: ParsedJobSummary;
    extracted_requirements: Array<{
        requirement_id: string;
        display_name: string;
        layer: RequirementLayer;
        importance: JobCapabilityImportance;
        optionality: RequirementOptionality;
        canonical_capabilities: string[];
        transfer_capabilities: string[];
        evidence: string[];
        matched_terms: string[];
        confidence: number;
    }>;
    requirement_clusters: JobRequirementCluster[];
    requirement_importance_by_cluster: Array<{
        cluster_id: string;
        display_name: string;
        importance: JobCapabilityImportance;
        importance_score: number;
    }>;
    optional_vs_core_requirements: {
        core: string[];
        optional: string[];
    };
    candidate_capabilities: CandidateCapabilityAudit[];
    capability_transfer_inference: CapabilityTransferInference;
    transferable_capability_patterns: TransferableCapabilityPatternAudit[];
    candidate_evidence_pieces_used: Array<{
        evidence_piece_id: string;
        role: string;
        company: string;
        text: string;
    }>;
    evidence_to_capability_links: EvidenceCapabilityLink[];
    requirement_to_candidate_match_breakdown: RequirementMatchBreakdown[];
    capability_ranking_adjustments: CapabilityRankingAudit[];
    positive_contributors: ScoreComponent[];
    negative_contributors: ScoreComponent[];
    penalties: Array<{
        label: string;
        contribution: number;
        reason: string;
    }>;
    title_prior_effect: PriorEffect;
    domain_prior_effect: PriorEffect;
    raw_score_breakdown: RawScoreBreakdown;
    final_bucket_reasoning: string;
    ats_risk_reasoning: string;
    tailor_recommendation_reasoning: string;
};

export type CapabilityMatchV2Result = {
    model: "job_capability_match_v2";
    career_id: string;
    overall_match_score: number;
    fit_bucket: HumanAlignmentBucket;
    score_confidence: "high" | "medium" | "low";
    job_profile_quality: JobCapabilityProfileQuality;
    job_profile_diagnostics: {
        reasons: string[];
        total_capability_count: number;
        body_derived_count: number;
        title_prior_count: number;
        structured_count: number;
        lexical_fallback_count: number;
        supporting_evidence_units: number;
        used_title_prior: boolean;
    };
    score_breakdown: RawScoreBreakdown & {
        matched_critical_count: number;
        missing_critical_count: number;
        total_job_capability_count: number;
    };
    candidate_capability_profile: CandidateCapabilityForMatch[];
    job_capability_profile: ExtractedJobCapability[];
    matched_strengths: Array<CapabilityMatchItem & { reasoning?: string }>;
    partial_matches: Array<CapabilityMatchItem & { reasoning?: string }>;
    gaps: Array<CapabilityMatchItem & { reasoning?: string }>;
    audit: CapabilityMatchAuditV2;
};

export type MatchReplayVariantSummary = {
    variant_name: MatchVariantName;
    final_score: number;
    fit_bucket: HumanAlignmentBucket;
    top_positive_factors: string[];
    top_negative_factors: string[];
    summary_diagnosis: string;
};

export type CandidateMatchContext = {
    career_id: string;
    candidate_profile: CandidateCapabilityForMatch[];
    candidate_titles: string[];
    candidate_capabilities: Capability[];
    evidence_pieces: EvidencePiece[];
    evidence_signals: EvidenceSignal[];
    evidence_by_capability: Record<string, EvidencePiece[]>;
    signals_by_capability: Record<string, EvidenceSignal[]>;
};

const STOPWORDS = new Set([
    "the", "and", "for", "with", "from", "into", "across", "that", "this", "your", "you", "our", "their",
    "was", "were", "are", "is", "of", "to", "in", "on", "by", "as", "at", "or", "an", "a", "will", "be",
    "through", "using", "used", "have", "has", "had", "can", "should", "role", "team",
]);

const IMPORTANCE_WEIGHT: Record<JobCapabilityImportance, number> = {
    critical: 1,
    important: 0.72,
    supporting: 0.38,
};

const ROLE_FAMILY_PATTERNS: Array<{ family: string; pattern: RegExp }> = [
    { family: "analytics", pattern: /\b(analytics|analyst|insights?|bi|business intelligence|reporting|measurement)\b/i },
    { family: "commercial", pattern: /\b(commercial|revenue|growth|pricing|profitability|category)\b/i },
    { family: "strategy", pattern: /\b(strategy|strategic|planning|roadmap|portfolio)\b/i },
    { family: "customer", pattern: /\b(customer|cx|client|consumer)\b/i },
    { family: "product", pattern: /\b(product|experimentation)\b/i },
    { family: "transformation", pattern: /\b(transformation|change|modernization|operating model|adoption)\b/i },
    { family: "operations", pattern: /\b(operations|operational|process|efficiency|optimization)\b/i },
    { family: "sales", pattern: /\b(sales|account|quota|pipeline|deal)\b/i },
    { family: "marketing", pattern: /\b(marketing|media|campaign|brand)\b/i },
];

const ROLE_FAMILY_ADJACENCY = new Map<string, string[]>([
    ["analytics", ["commercial", "strategy", "customer", "product", "transformation", "marketing"]],
    ["commercial", ["analytics", "strategy", "sales", "customer", "marketing"]],
    ["strategy", ["analytics", "commercial", "transformation", "product"]],
    ["customer", ["analytics", "commercial", "marketing", "product"]],
    ["product", ["analytics", "strategy", "customer"]],
    ["transformation", ["analytics", "strategy", "operations"]],
    ["operations", ["transformation", "analytics", "commercial"]],
    ["marketing", ["analytics", "customer", "commercial"]],
    ["sales", ["commercial", "customer"]],
]);

type UnitSectionType = "responsibility" | "requirement" | "low_priority" | "general";

const RESPONSIBILITY_SECTION_CUE_RE = /\b(responsibilit(?:y|ies)|you will|you ll|what you will do|in this role|drive|lead|own|deliver|manage|build|develop|partner)\b/i;
const REQUIREMENT_SECTION_CUE_RE = /\b(required|requirements?|qualifications?|must have|minimum|you need|you have|experience with|proficien|expertise|skills?)\b/i;
const LOW_PRIORITY_SECTION_CUE_RE = /\b(about us|about the company|who we are|benefits?|perks|culture|equal opportunity|what we offer|our mission)\b/i;

const ROLE_SIGNAL_GROUP_PHRASES: Record<string, string[]> = {
    measurement: ["measurement", "media measurement", "attribution", "incrementality", "lift", "effectiveness", "marketing mix model", "mmm"],
    experimentation: ["experimentation", "experiment", "a b testing", "ab testing", "test and learn", "hypothesis"],
    product_decision: ["product analytics", "roadmap", "feature performance", "product decision", "user behavior", "retention", "activation", "funnel", "cohort"],
    customer_insight: ["customer insights", "cx analytics", "customer journey", "voice of customer", "audience insights", "segmentation", "persona", "behavioral insights"],
    commercial_performance: ["commercial performance", "business performance", "revenue performance", "revenue strategy", "profitability", "pricing", "margin", "forecasting", "growth strategy"],
    reporting_delivery: ["reporting", "reporting cadence", "dashboard", "kpi", "insight delivery", "insight generation", "performance reporting"],
    stakeholder_translation: ["translate data", "translate analysis", "decision support", "business case", "executive stakeholder", "stakeholder communication", "storytelling"],
};

const CLUSTER_SIGNAL_GROUPS = new Map<string, string[]>([
    ["marketing_science_measurement", ["measurement", "experimentation"]],
    ["product_analytics_experimentation", ["product_decision", "experimentation"]],
    ["commercial_strategy_planning", ["commercial_performance"]],
    ["insight_generation_reporting", ["reporting_delivery", "stakeholder_translation"]],
    ["customer_cx_insights", ["customer_insight", "measurement"]],
    ["analytics_translation_storytelling", ["stakeholder_translation", "reporting_delivery"]],
]);

const BLOCKER_CLUSTER_IDS = new Set([
    "sales_execution",
    "channel_execution",
    "engineering_delivery",
    "clinical_research_ops",
    "administrative_research_ops",
]);

const CLUSTER_DEFINITIONS: RequirementClusterDefinition[] = [
    {
        id: "analytics_translation_storytelling",
        display_name: "Analytics Translation & Insight Storytelling",
        layer: "core_mission",
        direct_capabilities: ["commercial analytics", "executive influence & business cases", "strategic planning"],
        transfer_capabilities: ["market & opportunity assessment", "cross-functional stakeholder leadership"],
        transfer_pattern_ids: ["analytics_to_decision_translation", "stakeholder_storytelling_from_analytics", "commercial_customer_analytics"],
        seed_terms: [
            "translate data into business outcomes",
            "translate analysis into",
            "insight storytelling",
            "storytelling",
            "strategic recommendations",
            "decision making",
            "business outcomes",
            "insights",
        ],
        method_terms: ["recommendations", "narrative", "storytelling"],
        domain_terms: ["analytics", "insights", "commercial", "customer", "strategy"],
        title_terms: ["analytics manager", "insights manager", "analytics lead", "insights lead"],
        preferred_role_families: ["analytics", "customer", "strategy", "marketing"],
        genericity: "broad",
        default_optionality: "core",
        default_importance: "critical",
    },
    {
        id: "commercial_analytics",
        display_name: "Commercial Analytics",
        layer: "core_capability",
        direct_capabilities: ["commercial analytics"],
        transfer_capabilities: ["market & opportunity assessment", "strategic planning", "analytics automation"],
        transfer_pattern_ids: ["commercial_customer_analytics", "analytics_to_decision_translation", "strategic_problem_solving_with_analytics"],
        seed_terms: [
            "commercial analytics",
            "commercial performance",
            "growth insights",
            "revenue outcomes",
            "pricing",
            "profitability",
            "performance insights",
            "customer insights",
        ],
        method_terms: ["segmentation", "forecasting", "pricing", "performance"],
        domain_terms: ["commercial", "analytics", "customer", "growth"],
        title_terms: ["analytics manager", "commercial insights", "growth analytics"],
        preferred_role_families: ["analytics", "commercial", "customer", "strategy"],
        genericity: "balanced",
        default_optionality: "core",
        default_importance: "critical",
    },
    {
        id: "stakeholder_embedding",
        display_name: "Cross-Functional Embedding & Stakeholder Leadership",
        layer: "core_capability",
        direct_capabilities: ["cross-functional stakeholder leadership", "executive influence & business cases"],
        transfer_capabilities: ["people leadership", "strategic planning"],
        transfer_pattern_ids: ["stakeholder_storytelling_from_analytics", "cross_functional_analytics_leadership", "analytics_to_decision_translation"],
        seed_terms: [
            "cross-functional",
            "stakeholder",
            "partner with",
            "work with",
            "embed",
            "align stakeholders",
            "senior leadership",
            "executive stakeholders",
        ],
        method_terms: ["presentation", "business case", "governance"],
        domain_terms: ["analytics", "strategy", "commercial"],
        title_terms: ["manager", "lead", "director"],
        preferred_role_families: ["analytics", "commercial", "strategy", "transformation", "marketing"],
        genericity: "broad",
        default_optionality: "core",
        default_importance: "critical",
    },
    {
        id: "people_leadership",
        display_name: "People Leadership",
        layer: "core_capability",
        direct_capabilities: ["people leadership"],
        transfer_capabilities: ["capability uplift & enablement", "cross-functional stakeholder leadership"],
        transfer_pattern_ids: ["cross_functional_analytics_leadership", "analytics_enablement_adoption"],
        activation_mode: "explicit_signal",
        seed_terms: ["lead a team", "manage a team", "coach", "mentor", "team leadership", "people leader", "develop analysts"],
        method_terms: ["develop team", "upskill", "capability uplift"],
        domain_terms: ["analytics"],
        title_terms: ["head of analytics", "team lead", "practice lead"],
        preferred_role_families: ["analytics", "transformation", "operations"],
        genericity: "broad",
        default_optionality: "core",
        default_importance: "important",
    },
    {
        id: "customer_cx_insights",
        display_name: "Customer / CX Insight Generation",
        layer: "core_capability",
        direct_capabilities: ["commercial analytics", "market & opportunity assessment"],
        transfer_capabilities: ["cross-functional stakeholder leadership", "strategic planning"],
        transfer_pattern_ids: ["commercial_customer_analytics", "analytics_to_decision_translation", "stakeholder_storytelling_from_analytics"],
        seed_terms: [
            "customer insights",
            "cx",
            "consumer insights",
            "audience insights",
            "opportunity assessment",
            "market opportunity",
            "segmentation",
        ],
        method_terms: ["measurement", "research", "behavioral insights"],
        domain_terms: ["customer", "commercial", "analytics"],
        title_terms: ["analytics", "insights"],
        preferred_role_families: ["customer", "analytics", "marketing", "commercial"],
        genericity: "specific",
        default_optionality: "optional",
        default_importance: "important",
    },
    {
        id: "product_analytics_experimentation",
        display_name: "Product Analytics / Experimentation Insight",
        layer: "core_capability",
        direct_capabilities: ["commercial analytics", "analytics automation"],
        transfer_capabilities: ["strategic planning", "market & opportunity assessment", "cross-functional stakeholder leadership"],
        transfer_pattern_ids: ["strategic_problem_solving_with_analytics", "analytics_to_decision_translation"],
        activation_mode: "explicit_signal",
        seed_terms: [
            "product analytics",
            "experimentation insights",
            "experiment results",
            "roadmap prioritization",
            "roadmap decisions",
            "feature performance",
            "product growth",
            "user behavior",
        ],
        method_terms: ["experimentation", "a/b testing", "ab testing", "funnel", "retention", "cohort"],
        domain_terms: ["product", "engineering", "roadmap"],
        title_terms: ["product analytics", "product analyst", "product insights"],
        preferred_role_families: ["product", "analytics"],
        genericity: "specific",
        default_optionality: "optional",
        default_importance: "important",
    },
    {
        id: "data_tooling_delivery",
        display_name: "Data Tooling & Analytical Methods",
        layer: "secondary_method",
        direct_capabilities: ["analytics automation", "bi / data platform transformation"],
        transfer_capabilities: ["commercial analytics"],
        transfer_pattern_ids: ["strategic_problem_solving_with_analytics", "transformation_through_data", "analytics_enablement_adoption"],
        seed_terms: ["sql", "python", "power bi", "tableau", "looker", "bigquery", "dashboard", "reporting"],
        method_terms: ["sql", "python", "power bi", "tableau", "looker", "bigquery"],
        domain_terms: ["analytics", "engineering"],
        title_terms: ["analytics", "bi", "insights"],
        preferred_role_families: ["analytics", "product", "transformation"],
        genericity: "specific",
        default_optionality: "optional",
        default_importance: "supporting",
    },
    {
        id: "marketing_science_measurement",
        display_name: "Marketing Science / Media Measurement",
        layer: "core_capability",
        direct_capabilities: ["commercial analytics"],
        transfer_capabilities: ["analytics automation", "market & opportunity assessment", "cross-functional stakeholder leadership"],
        transfer_pattern_ids: ["commercial_customer_analytics", "analytics_to_decision_translation", "strategic_problem_solving_with_analytics"],
        activation_mode: "explicit_signal",
        seed_terms: [
            "marketing science",
            "media analytics",
            "media insights",
            "campaign analytics",
            "audience analytics",
            "media measurement",
            "campaign effectiveness",
            "marketing effectiveness",
        ],
        method_terms: ["measurement", "attribution", "incrementality", "media analytics", "campaign analytics", "experimentation"],
        domain_terms: ["marketing", "media", "campaign", "audience"],
        title_terms: ["marketing science", "media insights", "media analytics"],
        preferred_role_families: ["marketing", "analytics", "customer"],
        genericity: "specific",
        default_optionality: "optional",
        default_importance: "important",
    },
    {
        id: "transformation_enablement",
        display_name: "Transformation / Enablement Through Analytics",
        layer: "core_capability",
        direct_capabilities: [
            "transformation delivery leadership",
            "capability uplift & enablement",
            "change management & adoption",
            "bi / data platform transformation",
            "analytics automation",
        ],
        transfer_capabilities: ["cross-functional stakeholder leadership", "strategic planning"],
        transfer_pattern_ids: ["transformation_through_data", "analytics_enablement_adoption", "cross_functional_analytics_leadership", "strategic_problem_solving_with_analytics"],
        seed_terms: [
            "transformation",
            "enablement",
            "capability uplift",
            "adoption",
            "modernization",
            "improve adoption",
            "change",
        ],
        method_terms: ["training", "playbook", "governance", "standards"],
        domain_terms: ["transformation", "analytics", "operations"],
        title_terms: ["transformation", "analytics", "manager"],
        preferred_role_families: ["transformation", "operations", "analytics"],
        genericity: "specific",
        default_optionality: "optional",
        default_importance: "important",
    },
    {
        id: "insight_generation_reporting",
        display_name: "Insight Generation / Reporting Leadership",
        layer: "core_capability",
        direct_capabilities: ["commercial analytics", "cross-functional stakeholder leadership"],
        transfer_capabilities: ["strategic planning", "executive influence & business cases"],
        transfer_pattern_ids: ["analytics_to_decision_translation", "stakeholder_storytelling_from_analytics", "commercial_customer_analytics"],
        activation_mode: "explicit_signal",
        seed_terms: [
            "data & insights",
            "insight generation",
            "reporting leadership",
            "reporting cadence",
            "insights leadership",
            "insight delivery",
            "insight quality frameworks",
        ],
        method_terms: ["reporting", "dashboard", "insight generation", "insight communication"],
        domain_terms: ["analytics", "insights", "reporting", "campaign", "customer"],
        title_terms: ["data & insights", "insights manager", "insights director"],
        preferred_role_families: ["analytics", "customer", "marketing"],
        genericity: "specific",
        default_optionality: "optional",
        default_importance: "important",
    },
    {
        id: "commercial_strategy_planning",
        display_name: "Commercial Planning / Revenue Strategy",
        layer: "core_capability",
        direct_capabilities: ["strategic planning", "commercial analytics", "market & opportunity assessment"],
        transfer_capabilities: ["executive influence & business cases", "cross-functional stakeholder leadership"],
        transfer_pattern_ids: ["strategic_problem_solving_with_analytics", "analytics_to_decision_translation", "commercial_customer_analytics"],
        activation_mode: "explicit_signal",
        seed_terms: [
            "commercial strategy",
            "revenue strategy",
            "growth strategy",
            "commercial planning",
            "revenue planning",
            "business performance",
            "commercial performance",
            "market expansion",
        ],
        method_terms: ["planning", "forecasting", "prioritization", "business cases", "performance reviews"],
        domain_terms: ["commercial", "revenue", "strategy", "growth"],
        title_terms: ["commercial strategy", "revenue strategy", "strategy director"],
        preferred_role_families: ["commercial", "strategy", "analytics"],
        genericity: "specific",
        default_optionality: "optional",
        default_importance: "important",
    },
    {
        id: "domain_context_agency_marketing",
        display_name: "Domain Context: Agency / Marketing / Client Delivery",
        layer: "domain_context",
        direct_capabilities: ["cross-functional stakeholder leadership", "commercial analytics"],
        transfer_capabilities: ["executive influence & business cases", "strategic planning"],
        transfer_pattern_ids: ["analytics_to_decision_translation", "commercial_customer_analytics", "stakeholder_storytelling_from_analytics"],
        seed_terms: [
            "agency",
            "media",
            "marketing",
            "campaign",
            "client",
            "advertising",
            "publicis",
        ],
        method_terms: ["client delivery", "campaign insights"],
        domain_terms: ["marketing", "customer", "commercial"],
        title_terms: ["marketing", "analytics"],
        preferred_role_families: ["marketing", "analytics", "customer", "commercial"],
        genericity: "balanced",
        default_optionality: "optional",
        default_importance: "supporting",
    },
    {
        id: "sales_execution",
        display_name: "Sales Execution & Quota Ownership",
        layer: "core_mission",
        direct_capabilities: ["executive influence & business cases"],
        transfer_capabilities: ["cross-functional stakeholder leadership"],
        transfer_pattern_ids: [],
        activation_mode: "strict_blocker",
        seed_terms: ["quota", "pipeline", "deal negotiation", "account growth", "client acquisition", "sales execution"],
        method_terms: ["forecast", "territory", "account plan"],
        domain_terms: ["sales", "commercial"],
        title_terms: ["sales director", "account executive", "sales lead"],
        preferred_role_families: ["sales", "commercial"],
        genericity: "specific",
        default_optionality: "core",
        default_importance: "critical",
    },
    {
        id: "channel_execution",
        display_name: "Channel / SEO / Performance Execution",
        layer: "core_mission",
        direct_capabilities: [],
        transfer_capabilities: ["commercial analytics"],
        transfer_pattern_ids: [],
        activation_mode: "strict_blocker",
        seed_terms: ["seo", "sem", "paid search", "performance media", "keyword strategy", "organic search"],
        method_terms: ["channel management", "ad platform", "content optimization"],
        domain_terms: ["marketing"],
        title_terms: ["seo manager", "performance manager", "paid media"],
        preferred_role_families: ["marketing"],
        genericity: "specific",
        default_optionality: "core",
        default_importance: "critical",
    },
    {
        id: "engineering_delivery",
        display_name: "Software / Engineering Delivery Leadership",
        layer: "core_mission",
        direct_capabilities: [],
        transfer_capabilities: ["people leadership"],
        transfer_pattern_ids: [],
        activation_mode: "strict_blocker",
        seed_terms: ["software engineering", "architecture", "reliability", "backend", "frontend", "engineering squad"],
        method_terms: ["sdlc", "technical leadership", "platform engineering"],
        domain_terms: ["engineering"],
        title_terms: ["engineering manager", "software manager", "tech lead"],
        preferred_role_families: [],
        genericity: "specific",
        default_optionality: "core",
        default_importance: "critical",
    },
    {
        id: "clinical_research_ops",
        display_name: "Clinical / Regulated Research Operations",
        layer: "core_mission",
        direct_capabilities: [],
        transfer_capabilities: [],
        transfer_pattern_ids: [],
        activation_mode: "strict_blocker",
        seed_terms: ["clinical", "protocol", "ethics", "trial", "investigator", "compliance", "site scheduling"],
        method_terms: ["audit readiness", "participant recruitment", "regulatory"],
        domain_terms: ["clinical"],
        title_terms: ["clinical research", "research coordinator"],
        preferred_role_families: [],
        genericity: "specific",
        default_optionality: "core",
        default_importance: "critical",
    },
    {
        id: "administrative_research_ops",
        display_name: "Administrative / Research Operations Coordination",
        layer: "core_mission",
        direct_capabilities: [],
        transfer_capabilities: [],
        transfer_pattern_ids: [],
        activation_mode: "strict_blocker",
        seed_terms: ["data entry", "procurement", "documentation", "scheduling", "records", "logistics"],
        method_terms: ["operations coordination", "compliance records"],
        domain_terms: ["operations"],
        title_terms: ["operations coordinator", "research operations"],
        preferred_role_families: ["operations"],
        genericity: "specific",
        default_optionality: "core",
        default_importance: "important",
    },
];

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s/&-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(text: string): string[] {
    return normalizeText(text)
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function splitUnits(text: string): string[] {
    return text
        .split(/\r?\n|(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 18);
}

function classifyUnitSection(input: {
    normalizedUnit: string;
    normalizedResponsibilities: Set<string>;
}): UnitSectionType {
    if (!input.normalizedUnit) return "general";
    if (LOW_PRIORITY_SECTION_CUE_RE.test(input.normalizedUnit)) return "low_priority";
    for (const responsibility of input.normalizedResponsibilities) {
        if (!responsibility) continue;
        if (input.normalizedUnit.includes(responsibility) || responsibility.includes(input.normalizedUnit)) {
            return "responsibility";
        }
    }
    if (RESPONSIBILITY_SECTION_CUE_RE.test(input.normalizedUnit)) return "responsibility";
    if (REQUIREMENT_SECTION_CUE_RE.test(input.normalizedUnit)) return "requirement";
    return "general";
}

function sectionWeight(section: UnitSectionType): number {
    if (section === "responsibility") return 1.28;
    if (section === "requirement") return 1.24;
    if (section === "low_priority") return 0.72;
    return 1;
}

function countNormalizedPhraseHits(normalizedText: string, phrases: string[]): number {
    let count = 0;
    for (const phrase of phrases) {
        const normalizedPhrase = normalizeText(phrase);
        if (normalizedPhrase && normalizedText.includes(normalizedPhrase)) count += 1;
    }
    return count;
}

function detectSignalGroupMentions(normalizedText: string, groups: string[]): {
    hitGroups: string[];
    mentionCount: number;
} {
    const hitGroups: string[] = [];
    let mentionCount = 0;
    for (const group of groups) {
        const phrases = ROLE_SIGNAL_GROUP_PHRASES[group] ?? [];
        const hits = countNormalizedPhraseHits(normalizedText, phrases);
        if (hits <= 0) continue;
        hitGroups.push(group);
        mentionCount += hits;
    }
    return { hitGroups, mentionCount };
}

function compactSnippet(text: string, maxLength = 220): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3)}...`;
}

function maxNumber(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.max(...values);
}

function averageNumber(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferRoleFamilies(value: string | null | undefined): string[] {
    const families = ROLE_FAMILY_PATTERNS
        .filter((entry) => entry.pattern.test(value ?? ""))
        .map((entry) => entry.family);
    return Array.from(new Set(families));
}

function areRoleFamiliesAdjacent(jobFamily: string, candidateFamily: string): boolean {
    return (ROLE_FAMILY_ADJACENCY.get(jobFamily) ?? []).includes(candidateFamily);
}

function capabilityTags(canonicalName: string): string[] {
    const normalized = canonicalName.toLowerCase().trim();
    if (normalized === "commercial analytics") return ["analytics", "commercial", "insights", "translation"];
    if (normalized === "market & opportunity assessment") return ["analytics", "strategy", "customer", "commercial"];
    if (normalized === "strategic planning") return ["strategy", "translation", "planning"];
    if (normalized === "cross-functional stakeholder leadership") return ["stakeholder", "leadership", "embedding"];
    if (normalized === "executive influence & business cases") return ["stakeholder", "executive", "translation"];
    if (normalized === "people leadership") return ["leadership", "enablement"];
    if (normalized === "analytics automation") return ["analytics", "methods", "tooling", "transformation"];
    if (normalized === "bi / data platform transformation") return ["analytics", "tooling", "transformation"];
    if (normalized === "transformation delivery leadership") return ["transformation", "leadership", "embedding"];
    if (normalized === "capability uplift & enablement") return ["enablement", "leadership", "transformation"];
    if (normalized === "change management & adoption") return ["transformation", "enablement"];
    if (normalized === "operational performance optimization") return ["operations", "commercial", "transformation"];
    return tokenize(canonicalName);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(
        values
            .filter((value): value is string => Boolean(value && value.trim()))
            .map((value) => value.trim()),
    ));
}

function buildCandidateContext(params: {
    careerGraph: CareerGraph;
    candidateProfile: CandidateCapabilityForMatch[];
}): CandidateMatchContext {
    return {
        career_id: params.careerGraph.career?.id ?? "unknown-career",
        candidate_profile: params.candidateProfile,
        candidate_titles: params.careerGraph.experiences.map((experience) => experience.title),
        candidate_capabilities: params.careerGraph.capabilities,
        evidence_pieces: params.careerGraph.evidencePieces,
        evidence_signals: params.careerGraph.evidenceSignals ?? [],
        evidence_by_capability: params.careerGraph.evidenceByCapability,
        signals_by_capability: params.careerGraph.signalsByCapability ?? {},
    };
}

function requirementFromFlatCapability(capability: ExtractedJobCapability): JobRequirementCluster {
    return {
        cluster_id: capability.canonical_name,
        display_name: capability.display_name,
        layer: capability.source_tier === "structured" ? "core_capability" : "secondary_method",
        direct_capabilities: [capability.canonical_name],
        transfer_capabilities: [],
        transfer_pattern_ids: [],
        matched_terms: capability.matched_terms,
        evidence: capability.evidence,
        domain_modifiers: [],
        methods: capability.matched_terms,
        importance: capability.importance,
        importance_score: capability.importance === "critical" ? 0.95 : capability.importance === "important" ? 0.72 : 0.4,
        optionality: capability.importance === "supporting" ? "optional" : "core",
        confidence: capability.confidence,
        genericity: "balanced",
        explicit_signal_count: capability.matched_terms.length + capability.evidence.length,
        jd_literal_signal_count: capability.matched_terms.length,
        jd_repeated_signal_units: Math.min(capability.evidence.length, 3),
        jd_section_coverage: capability.evidence.length > 0 ? 1 : 0,
        jd_high_weight_signal_units: 0,
        role_signal_coherence: capability.role_family_basis ? 0.5 : 0,
        specificity_score: round(clamp((capability.matched_terms.length * 0.08) + (capability.evidence.length * 0.12) + (capability.confidence * 0.42))),
        role_family_alignment: capability.role_family_basis ? [capability.role_family_basis] : [],
    };
}

function buildMissionSummary(params: {
    title: string | null;
    clusters: JobRequirementCluster[];
    responsibilities: string[];
}): string {
    const coreNames = params.clusters
        .filter((cluster) => cluster.optionality === "core")
        .sort((a, b) => b.importance_score - a.importance_score)
        .slice(0, 2)
        .map((cluster) => cluster.display_name);
    if (coreNames.length > 0) {
        return `${params.title ?? "Role"} is centered on ${coreNames.join(" and ").toLowerCase()}.`;
    }
    const firstResponsibility = params.responsibilities[0];
    if (firstResponsibility) return compactSnippet(firstResponsibility, 140);
    return `${params.title ?? "Role"} has limited structured mission extraction.`;
}

function buildJobRequirementModel(params: {
    jobDescription: string;
    jobTitleHint?: string | null;
    variant?: MatchVariantConfig;
}): {
    parsed_job_summary: ParsedJobSummary;
    extracted_requirements: CapabilityMatchAuditV2["extracted_requirements"];
    requirement_clusters: JobRequirementCluster[];
    optional_vs_core_requirements: CapabilityMatchAuditV2["optional_vs_core_requirements"];
    flat_profile: ReturnType<typeof extractJobCapabilityProfileV1>;
} {
    // Stage 1: build an inspectable, JD-shaped requirement model.
    const parsed = parseJobDescription(params.jobDescription);
    const title = params.jobTitleHint?.trim() || parsed.target_title || null;
    const titleFamilies = inferRoleFamilies(title);
    const flatProfile = extractJobCapabilityProfileV1({
        jobDescription: params.jobDescription,
        titleHint: title,
    });
    const jobSignals = buildJobSignalsFromRawJd({
        rawJd: params.jobDescription,
        fallbackTitle: title ?? "Role",
    });
    const units = splitUnits(params.jobDescription);
    const corpus = [
        params.jobDescription,
        title ?? "",
        ...parsed.required_skills.map((skill) => skill.normalized),
        ...parsed.preferred_skills.map((skill) => skill.normalized),
        ...parsed.responsibilities,
    ].join(" ");
    const normalizedCorpus = normalizeText(corpus);
    const jobRoleFamilies = Array.from(new Set([
        ...titleFamilies,
        ...inferRoleFamilies(corpus),
        ...inferRoleFamilies(jobSignals.role_family),
    ]));
    const normalizedResponsibilities = new Set(
        parsed.responsibilities
            .map((item) => normalizeText(item))
            .filter((item) => item.length >= 16),
    );

    const clusters = params.variant?.richer_requirement_clustering === false
        ? flatProfile.capabilities.map((capability) => requirementFromFlatCapability(capability))
        : CLUSTER_DEFINITIONS
            .map((definition) => {
                const directHits = flatProfile.capabilities.filter((capability) =>
                    definition.direct_capabilities.includes(capability.canonical_name));
                const transferHits = flatProfile.capabilities.filter((capability) =>
                    definition.transfer_capabilities.includes(capability.canonical_name));
                const matchedTerms = new Set<string>();
                const matchedSignalGroups = new Set<string>();
                const signalRoleFamilies = new Set<string>();
                const sectionCoverage = new Set<"responsibility" | "requirement" | "general">();
                const evidence: string[] = [];
                let repeatedSignalUnits = 0;
                let literalSignalMentions = 0;
                let highWeightSignalUnits = 0;
                const clusterSignalGroups = CLUSTER_SIGNAL_GROUPS.get(definition.id) ?? [];

                for (const term of [...definition.seed_terms, ...definition.method_terms, ...definition.domain_terms, ...definition.title_terms]) {
                    if (normalizedCorpus.includes(normalizeText(term))) matchedTerms.add(term);
                }

                for (const unit of units) {
                    const normalizedUnit = normalizeText(unit);
                    const unitSection = classifyUnitSection({
                        normalizedUnit,
                        normalizedResponsibilities,
                    });
                    const unitWeight = sectionWeight(unitSection);
                    const matchedSeedTerms = definition.seed_terms
                        .filter((term) => normalizedUnit.includes(normalizeText(term)));
                    const matchedMethodTerms = definition.method_terms
                        .filter((term) => normalizedUnit.includes(normalizeText(term)));
                    const groupSignalMatch = detectSignalGroupMentions(normalizedUnit, clusterSignalGroups);
                    const matched = [...matchedSeedTerms, ...matchedMethodTerms, ...definition.domain_terms]
                        .filter((term) => normalizedUnit.includes(normalizeText(term)));
                    if (matched.length === 0 && groupSignalMatch.hitGroups.length === 0) continue;
                    for (const match of matched) matchedTerms.add(match);
                    for (const group of groupSignalMatch.hitGroups) {
                        matchedSignalGroups.add(group);
                        matchedTerms.add(group.replace(/_/g, " "));
                    }
                    evidence.push(compactSnippet(unit));
                    const literalTermsInUnit = matchedSeedTerms.length + matchedMethodTerms.length + groupSignalMatch.mentionCount;
                    if (literalTermsInUnit > 0) {
                        repeatedSignalUnits += unitWeight;
                        literalSignalMentions += literalTermsInUnit * unitWeight;
                        if (unitSection === "responsibility" || unitSection === "requirement") {
                            highWeightSignalUnits += 1;
                        }
                        if (unitSection !== "low_priority") {
                            sectionCoverage.add(unitSection === "general" ? "general" : unitSection);
                        }
                    }
                    for (const family of inferRoleFamilies(normalizedUnit)) {
                        signalRoleFamilies.add(family);
                    }
                }

                const titleHitCount = definition.title_terms.filter((term) =>
                    normalizeText(title ?? "").includes(normalizeText(term))).length;
                const familyHitCount = definition.domain_terms.filter((term) =>
                    titleFamilies.includes(normalizeText(term))).length;
                const roleFamilyHitCount = (definition.preferred_role_families ?? [])
                    .filter((family) => jobRoleFamilies.includes(family)).length;
                const seedHitCount = definition.seed_terms.filter((term) => matchedTerms.has(term)).length;
                const methodHitCount = definition.method_terms.filter((term) => matchedTerms.has(term)).length;
                const literalSignalCount = seedHitCount + methodHitCount + matchedSignalGroups.size;
                const sectionCoverageCount = sectionCoverage.size;
                const preferredFamilies = definition.preferred_role_families ?? [];
                const roleFamilySignalHitCount = preferredFamilies
                    .filter((family) => signalRoleFamilies.has(family)).length;
                const roleSignalCoherence = preferredFamilies.length === 0
                    ? 0
                    : clamp(roleFamilySignalHitCount / Math.max(1, signalRoleFamilies.size || preferredFamilies.length));
                const hasLiteralTrigger = literalSignalCount >= 1;
                const hasRepeatedLiteralTrigger = repeatedSignalUnits >= 2
                    || literalSignalMentions >= 3
                    || literalSignalCount >= 2
                    || sectionCoverageCount >= 2;
                const explicitSignalCount = (directHits.length * 2)
                    + titleHitCount
                    + seedHitCount
                    + methodHitCount
                    + Math.min(3, matchedSignalGroups.size) * 0.8
                    + (sectionCoverageCount >= 2 ? 0.6 : 0)
                    + (highWeightSignalUnits * 0.35);
                const narrowActivationBoost = (definition.genericity ?? "balanced") === "specific"
                    ? Math.min(
                        0.17,
                        (hasLiteralTrigger ? 0.03 : 0)
                        + Math.min(0.04, literalSignalCount * 0.0125)
                        + (hasRepeatedLiteralTrigger ? 0.03 : 0)
                        + Math.min(0.028, Math.max(0, sectionCoverageCount - 1) * 0.014)
                        + Math.min(0.02, highWeightSignalUnits * 0.007)
                        + (roleFamilyHitCount > 0 && hasLiteralTrigger ? 0.015 : 0)
                        + (roleSignalCoherence * 0.02),
                    )
                    : 0;
                const evidenceScore = clamp(
                    (directHits.length * 0.34)
                    + (transferHits.length * 0.12)
                    + (matchedTerms.size * 0.08)
                    + (titleHitCount * 0.12)
                    + (familyHitCount * 0.05)
                    + narrowActivationBoost,
                );
                const activationMode = definition.activation_mode ?? "standard";
                const minEvidenceThreshold = activationMode === "explicit_signal"
                    && (definition.genericity ?? "balanced") === "specific"
                    && hasLiteralTrigger
                    ? 0.15
                    : 0.2;
                if (evidenceScore < minEvidenceThreshold) return null;

                const importanceScore = clamp(
                    (definition.default_importance === "critical" ? 0.7 : definition.default_importance === "important" ? 0.56 : 0.36)
                    + (directHits.some((capability) => capability.importance === "critical") ? 0.18 : 0)
                    + (matchedTerms.size >= 3 ? 0.08 : 0)
                    + (titleHitCount > 0 ? 0.05 : 0),
                );
                const specificityScore = clamp(
                    ((definition.genericity ?? "balanced") === "specific" ? 0.34 : (definition.genericity ?? "balanced") === "broad" ? 0.14 : 0.24)
                    + (seedHitCount * 0.06)
                    + (methodHitCount * 0.05)
                    + (Math.min(evidence.length, 3) * 0.04)
                    + (titleHitCount * 0.08)
                    + (roleFamilyHitCount * 0.08)
                    + (Math.min(0.06, Math.max(0, sectionCoverageCount - 1) * 0.03))
                    + (Math.min(0.05, highWeightSignalUnits * 0.017))
                    + (Math.min(0.05, matchedSignalGroups.size * 0.025))
                    + (roleSignalCoherence * 0.06)
                    + (directHits.length > 0 ? 0.08 : 0),
                );
                const importance: JobCapabilityImportance = importanceScore >= 0.82
                    ? "critical"
                    : importanceScore >= 0.56
                        ? "important"
                        : "supporting";
                if (activationMode === "strict_blocker") {
                    const strictSignalCount = (directHits.length * 2) + (titleHitCount * 2) + seedHitCount + methodHitCount;
                    if (strictSignalCount < 4 || (titleHitCount === 0 && directHits.length === 0 && seedHitCount < 3)) {
                        return null;
                    }
                }
                if (activationMode === "explicit_signal") {
                    const narrowSpecificFallback = (definition.genericity ?? "balanced") === "specific"
                        && hasLiteralTrigger
                        && (
                            hasRepeatedLiteralTrigger
                            || roleFamilyHitCount > 0
                            || roleSignalCoherence >= 0.45
                            || sectionCoverageCount >= 2
                            || titleHitCount > 0
                        );
                    if (explicitSignalCount < 2 && !narrowSpecificFallback) return null;
                }
                const optionality: RequirementOptionality = definition.default_optionality === "core" && importance !== "supporting"
                    ? "core"
                    : evidence.some((snippet) => /\b(preferred|nice to have|bonus|desirable|plus)\b/i.test(snippet))
                        ? "optional"
                        : definition.default_optionality;

                return {
                    cluster_id: definition.id,
                    display_name: definition.display_name,
                    layer: definition.layer,
                    direct_capabilities: definition.direct_capabilities,
                    transfer_capabilities: definition.transfer_capabilities,
                    transfer_pattern_ids: definition.transfer_pattern_ids,
                    matched_terms: Array.from(matchedTerms).slice(0, 8),
                    evidence: Array.from(new Set(evidence)).slice(0, 4),
                    domain_modifiers: definition.domain_terms.slice(0, 4),
                    methods: definition.method_terms.slice(0, 6),
                    importance,
                    importance_score: round(importanceScore, 4),
                    optionality,
                    confidence: round(evidenceScore, 4),
                    genericity: definition.genericity ?? "balanced",
                    explicit_signal_count: explicitSignalCount,
                    jd_literal_signal_count: literalSignalCount,
                    jd_repeated_signal_units: round(repeatedSignalUnits, 4),
                    jd_section_coverage: sectionCoverageCount,
                    jd_high_weight_signal_units: highWeightSignalUnits,
                    role_signal_coherence: round(roleSignalCoherence, 4),
                    specificity_score: round(specificityScore, 4),
                    role_family_alignment: (definition.preferred_role_families ?? []).filter((family) =>
                        jobRoleFamilies.includes(family)),
                } satisfies JobRequirementCluster;
            })
            .filter((cluster): cluster is JobRequirementCluster => cluster !== null)
            .sort((a, b) => {
                if (b.importance_score !== a.importance_score) return b.importance_score - a.importance_score;
                return b.confidence - a.confidence;
            });

    const uniqueClusters = new Map<string, JobRequirementCluster>();
    for (const cluster of clusters) {
        if (!uniqueClusters.has(cluster.cluster_id)) uniqueClusters.set(cluster.cluster_id, cluster);
    }

    const resolvedClusters = Array.from(uniqueClusters.values());
    const missionSummary = buildMissionSummary({
        title,
        clusters: resolvedClusters,
        responsibilities: parsed.responsibilities,
    });
    const parsedJobSummary: ParsedJobSummary = {
        target_title: title,
        normalized_title: title ? normalizeTitle(title).normalized : null,
        role_family: jobSignals.role_family ?? titleFamilies[0] ?? null,
        seniority: parsed.seniority_level ?? jobSignals.seniority ?? null,
        company: parsed.company,
        location: parsed.location,
        mission_summary: missionSummary,
        required_skills: parsed.required_skills.map((skill) => skill.normalized),
        preferred_skills: parsed.preferred_skills.map((skill) => skill.normalized),
        responsibilities: parsed.responsibilities,
        domains: jobSignals.domains,
    };

    return {
        parsed_job_summary: parsedJobSummary,
        extracted_requirements: resolvedClusters.map((cluster) => ({
            requirement_id: cluster.cluster_id,
            display_name: cluster.display_name,
            layer: cluster.layer,
            importance: cluster.importance,
            optionality: cluster.optionality,
            canonical_capabilities: cluster.direct_capabilities,
            transfer_capabilities: cluster.transfer_capabilities,
            evidence: cluster.evidence,
            matched_terms: cluster.matched_terms,
            confidence: cluster.confidence,
        })),
        requirement_clusters: resolvedClusters,
        optional_vs_core_requirements: {
            core: resolvedClusters.filter((cluster) => cluster.optionality === "core").map((cluster) => cluster.display_name),
            optional: resolvedClusters.filter((cluster) => cluster.optionality === "optional").map((cluster) => cluster.display_name),
        },
        flat_profile: flatProfile,
    };
}

function buildCandidateCapabilityAudits(candidateContext: CandidateMatchContext): CandidateCapabilityAudit[] {
    const byCanonical = new Map(
        candidateContext.candidate_profile.map((item) => [normalizeText(item.canonical_name), item]),
    );

    return Array.from(byCanonical.values())
        .map((item) => {
            const supportingEvidencePieceIds = Array.from(new Set(
                item.top_supporting_signals.map((signal) => signal.evidence_piece_id),
            ));
            return {
                capability_id: item.capability_id,
                canonical_name: item.canonical_name,
                display_name: item.display_name,
                strength_score: round(item.strength_score, 4),
                weighted_signal_score: round(item.weighted_signal_score, 4),
                signal_count: item.signal_count,
                transferable_tags: capabilityTags(item.canonical_name),
                domain_tags: capabilityTags(item.canonical_name).filter((tag) =>
                    ["analytics", "commercial", "strategy", "customer", "transformation", "operations", "marketing", "stakeholder"].includes(tag)),
                top_supporting_signals: item.top_supporting_signals,
                supporting_evidence_piece_ids: supportingEvidencePieceIds,
            };
        })
        .sort((a, b) => {
            if (b.strength_score !== a.strength_score) return b.strength_score - a.strength_score;
            return b.weighted_signal_score - a.weighted_signal_score;
        });
}

function scoreTokenOverlap(requiredTerms: string[], candidateText: string): number {
    const requirementTokens = new Set(requiredTerms.flatMap((term) => tokenize(term)));
    if (requirementTokens.size === 0) return 0;
    const candidateTokens = new Set(tokenize(candidateText));
    let overlap = 0;
    for (const token of requirementTokens) {
        if (candidateTokens.has(token)) overlap += 1;
    }
    return clamp(overlap / Math.max(2, requirementTokens.size));
}

function ownershipScopeValue(signal: {
    ownership_level?: string | null;
    stakeholder_scope?: string[] | null;
    scope_level?: string | null;
}): number {
    let score = 0.18;
    const ownership = normalizeText(signal.ownership_level ?? "");
    if (ownership === "lead") score += 0.42;
    else if (ownership === "owner") score += 0.4;
    else if (ownership === "driver") score += 0.28;
    else if (ownership === "contributor") score += 0.1;

    const stakeholders = new Set((signal.stakeholder_scope ?? []).map((value) => normalizeText(value)));
    if (stakeholders.has("executive")) score += 0.2;
    if (stakeholders.has("cross_functional")) score += 0.16;

    const scope = normalizeText(signal.scope_level ?? "");
    if (scope === "enterprise" || scope === "market") score += 0.16;
    else if (scope === "function") score += 0.12;
    else if (scope === "team") score += 0.08;

    return clamp(score);
}

function evidenceSignalMatchesCluster(signal: EvidenceSignal, cluster: JobRequirementCluster): boolean {
    const combined = normalizeText([
        signal.action,
        signal.domain,
        signal.initiative_type,
        signal.scope_level,
        signal.ownership_level,
        ...(signal.stakeholder_scope ?? []),
        ...(signal.tool_signals ?? []),
        ...(signal.capability_hints ?? []),
        signal.team_signal,
        signal.impact_signal,
    ].join(" "));
    return [...cluster.matched_terms, ...cluster.methods, ...cluster.domain_modifiers]
        .some((term) => combined.includes(normalizeText(term)));
}

function gatherEvidenceMatches(params: {
    cluster: JobRequirementCluster;
    candidateContext: CandidateMatchContext;
    directCapabilities: CandidateCapabilityAudit[];
    transferCapabilities: CandidateCapabilityAudit[];
}): {
    evidence_score: number;
    literal_overlap_score: number;
    ownership_scope_score: number;
    evidence_piece_ids: string[];
    evidence_links: EvidenceCapabilityLink[];
} {
    const matchedEvidence = new Map<string, { score: number; piece: EvidencePiece }>();
    const evidenceLinks: EvidenceCapabilityLink[] = [];
    const capabilityAudits = [...params.directCapabilities, ...params.transferCapabilities];
    const evidenceById = new Map(params.candidateContext.evidence_pieces.map((piece) => [piece.id, piece]));

    for (const capability of capabilityAudits) {
        for (const signal of capability.top_supporting_signals) {
            const piece = evidenceById.get(signal.evidence_piece_id);
            if (!piece) continue;
            const overlap = scoreTokenOverlap(
                [...params.cluster.matched_terms, ...params.cluster.methods, ...params.cluster.domain_modifiers],
                `${piece.raw_text} ${signal.action ?? ""} ${(signal.scope_level ?? "")} ${(signal.impact_signal ?? "")}`,
            );
            const ownership = ownershipScopeValue({
                ownership_level: signal.ownership_level,
                stakeholder_scope: [],
                scope_level: signal.scope_level,
            });
            const score = overlap * 0.6 + ownership * 0.4;
            const existing = matchedEvidence.get(piece.id);
            if (!existing || score > existing.score) {
                matchedEvidence.set(piece.id, { score, piece });
            }
            evidenceLinks.push({
                evidence_piece_id: piece.id,
                evidence_signal_id: signal.evidence_signal_id,
                capability: capability.display_name,
                contribution_weight: round(score, 4),
                reason: `Signal-backed support for ${params.cluster.display_name}`,
            });
        }
    }

    for (const signal of params.candidateContext.evidence_signals) {
        if (!evidenceSignalMatchesCluster(signal, params.cluster)) continue;
        const piece = evidenceById.get(signal.evidence_piece_id);
        if (!piece) continue;
        const overlap = scoreTokenOverlap(
            [...params.cluster.matched_terms, ...params.cluster.methods, ...params.cluster.domain_modifiers],
            `${piece.raw_text} ${signal.action ?? ""} ${signal.domain ?? ""} ${(signal.tool_signals ?? []).join(" ")}`,
        );
        const ownership = ownershipScopeValue(signal);
        const score = overlap * 0.52 + ownership * 0.48;
        const existing = matchedEvidence.get(piece.id);
        if (!existing || score > existing.score) {
            matchedEvidence.set(piece.id, { score, piece });
        }
    }

    const ranked = Array.from(matchedEvidence.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
    const evidenceScore = ranked.length > 0
        ? clamp(ranked.reduce((sum, entry) => sum + entry.score, 0) / ranked.length)
        : 0;
    const literalOverlapScore = ranked.length > 0
        ? clamp(ranked.reduce((sum, entry) => sum + scoreTokenOverlap(params.cluster.matched_terms, entry.piece.raw_text), 0) / ranked.length)
        : 0;
    const ownershipScopeScore = ranked.length > 0
        ? clamp(ranked.reduce((sum, entry) => {
            const supportingSignal = params.candidateContext.evidence_signals.find((signal) => signal.evidence_piece_id === entry.piece.id);
            return sum + ownershipScopeValue(supportingSignal ?? {});
        }, 0) / ranked.length)
        : 0;

    return {
        evidence_score: round(evidenceScore, 4),
        literal_overlap_score: round(literalOverlapScore, 4),
        ownership_scope_score: round(ownershipScopeScore, 4),
        evidence_piece_ids: ranked.map((entry) => entry.piece.id),
        evidence_links: evidenceLinks.slice(0, 12),
    };
}

function capabilityMatchStatus(score: number): CapabilityMatchStatus {
    if (score >= 0.78) return "strong";
    if (score >= 0.52) return "partial";
    if (score >= 0.34) return "weak";
    return "missing";
}

function requirementWeights(layer: RequirementLayer): {
    direct: number;
    transfer: number;
    evidence: number;
    literal: number;
    ownership: number;
} {
    if (layer === "core_mission") {
        return { direct: 0.22, transfer: 0.38, evidence: 0.16, literal: 0.03, ownership: 0.21 };
    }
    if (layer === "secondary_method") {
        return { direct: 0.24, transfer: 0.2, evidence: 0.14, literal: 0.24, ownership: 0.18 };
    }
    if (layer === "domain_context") {
        return { direct: 0.2, transfer: 0.28, evidence: 0.18, literal: 0.12, ownership: 0.22 };
    }
    return { direct: 0.22, transfer: 0.36, evidence: 0.12, literal: 0.04, ownership: 0.26 };
}

function resolveConfidence(params: {
    quality: JobCapabilityProfileQuality;
    clusterCount: number;
    supportingEvidenceUnits: number;
}): "high" | "medium" | "low" {
    if (params.quality === "empty" || params.quality === "sparse") return "low";
    if (params.clusterCount < 4 || params.supportingEvidenceUnits < 2) return "medium";
    return params.quality === "strong" ? "high" : "medium";
}

function fitBucketFromScore(score: number): HumanAlignmentBucket {
    if (score >= 0.7) return "high_fit";
    if (score >= 0.47) return "medium_fit";
    return "low_fit";
}

function averageBreakdown(
    breakdowns: RequirementMatchBreakdown[],
    key: "evidence_score" | "transfer_score" | "ownership_scope_score",
): number {
    if (breakdowns.length === 0) return 0;
    return clamp(breakdowns.reduce((sum, item) => sum + item[key], 0) / breakdowns.length);
}

function computeTitlePriorEffect(params: {
    jobTitle: string | null;
    candidateTitles: string[];
    evidenceAlignmentScore: number;
    weight: number;
}): PriorEffect {
    const jobFamilies = inferRoleFamilies(params.jobTitle);
    const jobNormalized = params.jobTitle ? normalizeTitle(params.jobTitle).normalized : "";
    let bestScore = 0;
    let bestReason = "No comparable title signal available.";
    let bestLevel: PriorEffect["match_level"] = "mismatch";

    for (const candidateTitle of params.candidateTitles) {
        const candidateNormalized = normalizeTitle(candidateTitle).normalized;
        if (jobNormalized && normalizeText(candidateNormalized) === normalizeText(jobNormalized)) {
            bestScore = 1;
            bestLevel = "direct";
            bestReason = `Candidate title history includes a direct title match: ${candidateTitle}.`;
            break;
        }
        const candidateFamilies = inferRoleFamilies(candidateTitle);
        if (jobFamilies.some((family) => candidateFamilies.includes(family))) {
            if (bestScore < 0.8) {
                bestScore = 0.8;
                bestLevel = "adjacent";
                bestReason = `Candidate title history is in the same role family as the job (${candidateTitle}).`;
            }
            continue;
        }
        const adjacent = jobFamilies.some((family) =>
            candidateFamilies.some((candidateFamily) => areRoleFamiliesAdjacent(family, candidateFamily)));
        if (adjacent && bestScore < 0.58) {
            bestScore = 0.58;
            bestLevel = "adjacent";
            bestReason = `Candidate title history is adjacent to the job family, but not a direct title match (${candidateTitle}).`;
        } else if (candidateFamilies.length > 0 && bestScore < 0.36) {
            bestScore = 0.36;
            bestLevel = "indirect";
            bestReason = `Candidate title history is indirect relative to the job family (${candidateTitle}).`;
        }
    }

    const softenedScore = params.evidenceAlignmentScore >= 0.58 && bestScore < 0.58
        ? Math.max(bestScore, 0.58)
        : bestScore;
    const penalty = round((1 - softenedScore) * 0.02 * params.weight, 4);
    return {
        match_level: bestLevel,
        penalty,
        score: round(softenedScore, 4),
        reason: bestReason,
    };
}

function computeDomainPriorEffect(params: {
    jobDomains: string[];
    candidateContext: CandidateMatchContext;
    evidenceAlignmentScore: number;
    weight: number;
}): PriorEffect {
    const jobDomainSet = new Set(params.jobDomains.map((domain) => normalizeText(domain)).filter(Boolean));
    const candidateDomains = new Set<string>();
    for (const signal of params.candidateContext.evidence_signals) {
        if (signal.domain) candidateDomains.add(normalizeText(signal.domain));
        for (const family of inferRoleFamilies(signal.action ?? "")) candidateDomains.add(family);
    }
    for (const title of params.candidateContext.candidate_titles) {
        for (const family of inferRoleFamilies(title)) candidateDomains.add(family);
    }

    let score = 0.3;
    let level: PriorEffect["match_level"] = "mismatch";
    let reason = "Candidate domain history has weak direct overlap with the job context.";
    const directOverlap = Array.from(jobDomainSet).filter((domain) => candidateDomains.has(domain));
    if (directOverlap.length > 0) {
        score = 1;
        level = "direct";
        reason = `Candidate evidence already spans the job domain(s): ${directOverlap.join(", ")}.`;
    } else {
        const adjacent = Array.from(jobDomainSet).some((domain) =>
            Array.from(candidateDomains).some((candidateDomain) => areRoleFamiliesAdjacent(domain, candidateDomain)));
        if (adjacent) {
            score = 0.62;
            level = "adjacent";
            reason = "Candidate domain history is adjacent to the job context and should be treated as transferable.";
        } else if (candidateDomains.size > 0) {
            score = 0.42;
            level = "indirect";
            reason = "Candidate domain history is indirect, but not absent.";
        }
    }
    if (params.evidenceAlignmentScore >= 0.62 && score < 0.62) {
        score = 0.62;
        if (level === "mismatch") level = "adjacent";
        reason = "Strong evidence-based alignment softens the domain prior despite imperfect domain labels.";
    }
    const penaltyBase = params.evidenceAlignmentScore >= 0.55 ? 0.015 : 0.045;
    const penalty = round((1 - score) * penaltyBase * params.weight, 4);
    return {
        match_level: level,
        penalty,
        score: round(score, 4),
        reason,
    };
}

function buildAtsRiskReasoning(params: {
    titlePriorEffect: PriorEffect;
    domainPriorEffect: PriorEffect;
    finalScore: number;
}): string {
    if (params.titlePriorEffect.match_level === "direct" || params.titlePriorEffect.match_level === "adjacent") {
        return "ATS title risk is limited because the role family is already present or adjacent in title history.";
    }
    if (params.finalScore >= 0.5) {
        return "ATS risk is narrative-sensitive rather than blocking: evidence alignment is credible, but title history is not a direct match.";
    }
    return "ATS risk is elevated because title history is indirect and evidence alignment is not strong enough to offset that prior.";
}

function buildTailorReasoning(params: {
    finalScore: number;
    titlePriorEffect: PriorEffect;
}): string {
    if (params.finalScore >= 0.6) {
        return "Recommend tailoring: evidence-based alignment is strong enough that a narrative-forward CV should help conversion.";
    }
    if (params.finalScore >= 0.45) {
        return params.titlePriorEffect.match_level === "mismatch" || params.titlePriorEffect.match_level === "indirect"
            ? "Recommend tailoring: the role is credible but narrative-sensitive, so the CV should translate transferable evidence explicitly."
            : "Recommend tailoring with caution: the role is viable but needs stronger emphasis on the highest-signal evidence.";
    }
    return "Do not recommend tailoring yet: evidence-based alignment is too weak relative to the role requirements.";
}

function buildBucketReasoning(params: {
    fitBucket: HumanAlignmentBucket;
    breakdowns: RequirementMatchBreakdown[];
    titlePriorEffect: PriorEffect;
    domainPriorEffect: PriorEffect;
}): string {
    const strongClusters = params.breakdowns.filter((item) => item.match_status === "strong" || item.match_status === "partial");
    const blocking = params.breakdowns.filter((item) => item.gap_classification === "blocking_gap");
    if (params.fitBucket === "high_fit") {
        return `High-fit classification is driven by ${strongClusters.slice(0, 3).map((item) => item.display_name).join(", ")} with priors remaining weak.`;
    }
    if (params.fitBucket === "medium_fit") {
        return `Medium-fit classification reflects credible evidence alignment with ${blocking.length} blocking gap(s); priors are ${params.titlePriorEffect.match_level}/${params.domainPriorEffect.match_level}.`;
    }
    return `Low-fit classification reflects insufficient evidence-based support across ${blocking.length} blocking core requirement(s), not just title/domain priors.`;
}

function toDisplayImportance(importance: JobCapabilityImportance): number {
    if (importance === "critical") return 3;
    if (importance === "important") return 2;
    return 1;
}

function buildCapabilityRankingAudits(params: {
    breakdowns: RequirementMatchBreakdown[];
    requirementClusters: JobRequirementCluster[];
}): Map<string, CapabilityRankingAudit> {
    // Stage 2: deterministic ranking refinements for top capability differentiation.
    const clustersById = new Map(params.requirementClusters.map((cluster) => [cluster.cluster_id, cluster]));
    const strongSpecificCount = params.requirementClusters.filter((cluster) =>
        cluster.genericity === "specific" && cluster.specificity_score >= 0.52 && cluster.confidence >= 0.24).length;
    const specificCoverageRatio = strongSpecificCount / Math.max(1, params.requirementClusters.length);
    const jobHasSpecificShape = strongSpecificCount >= 1 && specificCoverageRatio >= 0.2;
    const ranking = new Map<string, CapabilityRankingAudit>();

    for (const breakdown of params.breakdowns) {
        const cluster = clustersById.get(breakdown.cluster_id);
        if (!cluster) continue;

        const roleAlignmentBonus = round(
            cluster.genericity === "broad"
                ? Math.min(0.03, cluster.role_family_alignment.length * 0.012)
                : Math.min(0.08, cluster.role_family_alignment.length * 0.035),
            4,
        );
        const repeatedSignalBonus = round(
            cluster.genericity === "specific"
                ? Math.min(
                    0.09,
                    (Math.max(0, cluster.explicit_signal_count - 1) * 0.012)
                    + (Math.max(0, cluster.jd_repeated_signal_units - 1) * 0.009),
                )
                : cluster.genericity === "balanced"
                    ? Math.min(0.055, Math.max(0, cluster.explicit_signal_count - 2) * 0.0125)
                    : Math.min(0.038, Math.max(0, cluster.explicit_signal_count - 3) * 0.009),
            4,
        );
        const candidateSupportScore = Math.max(
            breakdown.direct_score,
            breakdown.transfer_score,
            breakdown.transfer_pattern_score,
        );
        const candidateSupportGate = candidateSupportScore >= 0.3
            ? 1
            : candidateSupportScore >= 0.22
                ? 0.65
                : 0.35;
        const literalSignalBonus = round(
            cluster.genericity === "specific"
                ? Math.min(
                    0.085,
                    (
                        (cluster.jd_literal_signal_count > 0 ? 0.02 : 0)
                        + (Math.min(4, cluster.jd_literal_signal_count) * 0.01)
                        + (Math.max(0, cluster.jd_repeated_signal_units - 1) * 0.008)
                    ) * candidateSupportGate,
                )
                : 0,
            4,
        );
        const sectionSignalBonus = round(
            cluster.genericity === "specific"
                ? Math.min(
                    0.055,
                    (
                        (Math.max(0, cluster.jd_section_coverage - 1) * 0.014)
                        + (cluster.jd_high_weight_signal_units * 0.008)
                    ) * candidateSupportGate,
                )
                : 0,
            4,
        );
        const roleCoherenceBonus = round(
            cluster.genericity === "specific"
                ? Math.min(0.048, cluster.role_signal_coherence * 0.045 * candidateSupportGate)
                : Math.min(0.016, cluster.role_signal_coherence * 0.012),
            4,
        );
        const specificityBoost = round(
            Math.min(
                0.16,
                (cluster.specificity_score * 0.12)
                + (cluster.genericity === "specific" ? 0.04 : cluster.genericity === "balanced" ? 0.012 : 0),
            ),
            4,
        );
        const explicitGenericSupport = (cluster.explicit_signal_count * 0.015)
            + (cluster.role_family_alignment.length * 0.008)
            + (breakdown.evidence_score * 0.03)
            + (breakdown.literal_overlap_score * 0.03);
        const broadSignalPenaltyLift = cluster.explicit_signal_count <= 2.4
            ? 0.02
            : cluster.explicit_signal_count <= 3.4
                ? 0.01
                : 0;
        const broadLiteralPenaltyLift = breakdown.literal_overlap_score < 0.3
            ? 0.015
            : breakdown.literal_overlap_score < 0.42
                ? 0.008
                : 0;
        const genericPenalty = round(
            cluster.genericity === "broad" && jobHasSpecificShape
                ? Math.max(
                    0,
                    Math.min(
                        0.2,
                        0.095
                            + (Math.max(0, strongSpecificCount - 1) * 0.018)
                            + broadSignalPenaltyLift
                            + broadLiteralPenaltyLift
                            - explicitGenericSupport,
                    ),
                )
                : 0,
            4,
        );
        const tieBreakScore = round(
            Math.min(
                0.06,
                (cluster.specificity_score * 0.025)
                + (cluster.confidence * 0.015)
                + (cluster.explicit_signal_count * 0.0025)
                + (cluster.jd_literal_signal_count * 0.002)
                + (cluster.jd_section_coverage * 0.002)
                + (breakdown.match_status === "strong" ? 0.008 : breakdown.match_status === "partial" ? 0.004 : 0),
            ),
            4,
        );
        const rankingScore = round(clamp(
            breakdown.weighted_contribution
            + specificityBoost
            + roleAlignmentBonus
            + repeatedSignalBonus
            + literalSignalBonus
            + sectionSignalBonus
            + roleCoherenceBonus
            + tieBreakScore
            - genericPenalty,
        ), 4);

        ranking.set(breakdown.cluster_id, {
            cluster_id: breakdown.cluster_id,
            display_name: breakdown.display_name,
            base_weighted_contribution: round(breakdown.weighted_contribution, 4),
            ranking_score: rankingScore,
            specificity_score: round(cluster.specificity_score, 4),
            role_alignment_bonus: roleAlignmentBonus,
            repeated_signal_bonus: repeatedSignalBonus,
            literal_signal_bonus: literalSignalBonus,
            section_signal_bonus: sectionSignalBonus,
            role_coherence_bonus: roleCoherenceBonus,
            generic_penalty: genericPenalty,
            tie_break_score: tieBreakScore,
            genericity: cluster.genericity,
            jd_literal_signal_count: cluster.jd_literal_signal_count,
            jd_repeated_signal_units: cluster.jd_repeated_signal_units,
            jd_section_coverage: cluster.jd_section_coverage,
            jd_high_weight_signal_units: cluster.jd_high_weight_signal_units,
            role_signal_coherence: cluster.role_signal_coherence,
            reason: cluster.genericity === "broad" && genericPenalty > 0
                ? "Broad cluster dampened because the JD also contains clearer role-shaped signals."
                : cluster.genericity === "specific" && (specificityBoost > 0.06 || repeatedSignalBonus > 0.03 || literalSignalBonus > 0.02 || sectionSignalBonus > 0.02)
                    ? "Specific cluster boosted because literal, repeated, and section-weighted JD signals are coherent."
                    : "Ranking preserves base contribution with a small deterministic specificity tie-break.",
        });
    }

    return ranking;
}

function toCapabilityMatchItem(input: {
    breakdown: RequirementMatchBreakdown;
    candidateScore: number;
    topSupportingSignals: CapabilityStrengthProfileItem["top_supporting_signals"];
    sourceTier: JobCapabilitySourceTier;
    confidence: number;
    rankingScore: number;
    rankingReason?: string;
}): CapabilityMatchItem & { reasoning?: string } {
    return {
        canonical_name: input.breakdown.cluster_id,
        display_name: input.breakdown.display_name,
        importance: input.breakdown.importance,
        source_tier: input.sourceTier,
        job_confidence: input.confidence,
        candidate_strength_score: round(input.candidateScore, 4),
        match_status: input.breakdown.match_status,
        match_score_contribution: round(input.rankingScore, 4),
        job_evidence: input.breakdown.reasoning ? [input.breakdown.reasoning] : [],
        top_supporting_signals: input.topSupportingSignals,
        reasoning: input.rankingReason
            ? `${input.breakdown.reasoning} ${input.rankingReason}`
            : input.breakdown.reasoning,
    };
}

function compareBreakdowns(
    breakdowns: RequirementMatchBreakdown[],
    titlePriorEffect: PriorEffect,
    domainPriorEffect: PriorEffect,
    injectAtsPenalty: boolean,
    transferPatternAggregationEnabled: boolean,
): RawScoreBreakdown {
    const totalWeight = breakdowns.reduce((sum, breakdown) => sum + breakdown.weight, 0);
    const weightedRequirementScore = totalWeight > 0
        ? clamp(breakdowns.reduce((sum, breakdown) => sum + (breakdown.final_cluster_score * breakdown.weight), 0) / totalWeight)
        : 0;
    const coreBreakdowns = breakdowns.filter((breakdown) => breakdown.optionality === "core");
    const secondaryBreakdowns = breakdowns.filter((breakdown) => breakdown.optionality === "optional");
    const average = (values: number[]): number => values.length > 0
        ? clamp(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;
    const coreRequirementScore = average(coreBreakdowns.map((breakdown) => breakdown.final_cluster_score));
    const secondaryRequirementScore = average(secondaryBreakdowns.map((breakdown) => breakdown.final_cluster_score));
    const transferMatchScore = average(breakdowns.map((breakdown) => breakdown.transfer_score));
    const transferPatternScore = average(breakdowns.map((breakdown) => breakdown.transfer_pattern_score));
    const evidenceAlignmentScore = average(breakdowns.map((breakdown) => breakdown.evidence_score));
    const literalOverlapScore = average(breakdowns.map((breakdown) => breakdown.literal_overlap_score));
    const ownershipScopeScore = average(breakdowns.map((breakdown) => breakdown.ownership_scope_score));
    const blockingGapPenalty = round(Math.min(0.08, breakdowns.filter((breakdown) => breakdown.gap_classification === "blocking_gap").length * 0.025), 4);
    const stretchCoreCount = coreBreakdowns.filter((breakdown) => breakdown.gap_classification === "stretch_gap").length;
    const stretchOptionalCount = secondaryBreakdowns.filter((breakdown) => breakdown.gap_classification === "stretch_gap").length;
    const stretchGapPenalty = round(Math.min(0.03, (stretchCoreCount * 0.008) + (stretchOptionalCount * 0.004)), 4);
    const differentiatorBonus = breakdowns.filter((breakdown) => breakdown.gap_classification === "differentiator").length * 0.0125;
    const supportQualityScore = average(coreBreakdowns.map((breakdown) =>
        (breakdown.evidence_score * 0.35)
        + (breakdown.ownership_scope_score * 0.35)
        + (Math.max(breakdown.transfer_pattern_score, breakdown.transfer_score) * 0.3),
    ));
    const resilienceBonus = blockingGapPenalty === 0
        ? Math.min(
            0.05,
            (coreBreakdowns.filter((breakdown) => breakdown.match_status === "partial").length * 0.012)
            + (transferMatchScore >= 0.5 ? 0.016 : 0)
            + (ownershipScopeScore >= 0.65 ? 0.012 : 0),
        )
        : 0;
    const missionAligned = coreBreakdowns.some((breakdown) => breakdown.layer === "core_mission" && breakdown.final_cluster_score >= 0.64);
    const strongCoreCount = coreBreakdowns.filter((breakdown) => breakdown.final_cluster_score >= 0.62).length;
    const strongTransferCoreCount = coreBreakdowns.filter((breakdown) => breakdown.transfer_pattern_score >= 0.6 || breakdown.transfer_score >= 0.6).length;
    const missionAlignmentBonus = transferPatternAggregationEnabled && missionAligned && transferPatternScore >= 0.52 ? 0.018 : 0;
    const adjacentTransferBonus = transferPatternAggregationEnabled && blockingGapPenalty === 0 && strongTransferCoreCount >= 2 ? 0.024 : 0;
    const highFitReadinessBonus = transferPatternAggregationEnabled
        && blockingGapPenalty === 0
        && missionAligned
        && strongCoreCount >= 2
        && supportQualityScore >= 0.56
        ? 0.032
        : 0;
    const positiveBonus = round(Math.min(0.12, differentiatorBonus + resilienceBonus + missionAlignmentBonus + adjacentTransferBonus + highFitReadinessBonus), 4);
    const atsPenalty = injectAtsPenalty && titlePriorEffect.match_level === "mismatch" && weightedRequirementScore < 0.62
        ? 0.015
        : 0;
    const finalScore = clamp(
        weightedRequirementScore
        + positiveBonus
        - blockingGapPenalty
        - stretchGapPenalty
        - titlePriorEffect.penalty
        - domainPriorEffect.penalty
        - atsPenalty,
    );

    return {
        base_requirement_score: round(weightedRequirementScore, 4),
        weighted_requirement_score: round(weightedRequirementScore, 4),
        core_requirement_score: round(coreRequirementScore, 4),
        secondary_requirement_score: round(secondaryRequirementScore, 4),
        transfer_match_score: round(transferMatchScore, 4),
        transfer_pattern_score: round(transferPatternScore, 4),
        evidence_alignment_score: round(evidenceAlignmentScore, 4),
        literal_overlap_score: round(literalOverlapScore, 4),
        ownership_scope_score: round(ownershipScopeScore, 4),
        mission_alignment_bonus: round(missionAlignmentBonus, 4),
        adjacent_transfer_bonus: round(adjacentTransferBonus, 4),
        high_fit_readiness_bonus: round(highFitReadinessBonus, 4),
        positive_bonus: round(positiveBonus, 4),
        blocking_gap_penalty: round(blockingGapPenalty, 4),
        stretch_gap_penalty: round(stretchGapPenalty, 4),
        title_prior_penalty: round(titlePriorEffect.penalty, 4),
        domain_prior_penalty: round(domainPriorEffect.penalty, 4),
        ats_penalty_injection: round(atsPenalty, 4),
        final_score: round(finalScore, 4),
    };
}

function fitBucketFromCalibratedScore(params: {
    score: number;
    breakdowns: RequirementMatchBreakdown[];
    transferPatternAggregationEnabled: boolean;
}): HumanAlignmentBucket {
    const coreBreakdowns = params.breakdowns.filter((breakdown) => breakdown.optionality === "core");
    const missionAligned = coreBreakdowns.some((breakdown) => breakdown.layer === "core_mission" && breakdown.final_cluster_score >= 0.64);
    const strongCoreCount = coreBreakdowns.filter((breakdown) => breakdown.final_cluster_score >= 0.56).length;
    const strongCoreCapabilityCount = coreBreakdowns.filter((breakdown) => breakdown.layer === "core_capability" && breakdown.final_cluster_score >= 0.53).length;
    const strongTransferCount = coreBreakdowns.filter((breakdown) => breakdown.transfer_pattern_score >= 0.56 || breakdown.transfer_score >= 0.6).length;
    const blockingGapCount = coreBreakdowns.filter((breakdown) => breakdown.gap_classification === "blocking_gap").length;
    const coreStretchCount = coreBreakdowns.filter((breakdown) => breakdown.gap_classification === "stretch_gap").length;
    const blockerMismatchCount = coreBreakdowns.filter((breakdown) =>
        BLOCKER_CLUSTER_IDS.has(breakdown.cluster_id) && breakdown.direct_score < 0.45).length;
    const supportQualityScore = averageNumber(coreBreakdowns.map((breakdown) =>
        (breakdown.evidence_score * 0.35)
        + (breakdown.ownership_scope_score * 0.35)
        + (Math.max(breakdown.transfer_pattern_score, breakdown.transfer_score) * 0.3),
    ));
    if (
        params.transferPatternAggregationEnabled
        && params.score >= 0.7
        && missionAligned
        && strongCoreCount >= 2
        && strongCoreCapabilityCount >= 1
        && strongTransferCount >= 2
        && supportQualityScore >= 0.55
        && blockingGapCount === 0
        && blockerMismatchCount === 0
        && coreStretchCount <= 1
    ) {
        return "high_fit";
    }
    if (
        params.score >= 0.78
        && blockingGapCount === 0
        && blockerMismatchCount === 0
    ) {
        return "high_fit";
    }
    if (params.score >= 0.47) return "medium_fit";
    return "low_fit";
}

export async function getCapabilityMatchV2FromContext(params: {
    careerId: string;
    jobDescription: string;
    candidateContext: CandidateMatchContext;
    jobTitleHint?: string | null;
    variant?: MatchVariantConfig;
}): Promise<CapabilityMatchV2Result> {
    const careerId = params.careerId.trim();
    if (!careerId) throw new Error("careerId is required");

    const variant: Required<MatchVariantConfig> = {
        variant_name: params.variant?.variant_name ?? "default",
        title_prior_penalty_weight: params.variant?.title_prior_penalty_weight ?? 1,
        domain_prior_penalty_weight: params.variant?.domain_prior_penalty_weight ?? 1,
        inject_ats_penalty: params.variant?.inject_ats_penalty ?? true,
        richer_requirement_clustering: params.variant?.richer_requirement_clustering ?? true,
        capability_transfer_matching: params.variant?.capability_transfer_matching ?? true,
        transfer_pattern_aggregation: params.variant?.transfer_pattern_aggregation ?? true,
        literal_keyword_weight: params.variant?.literal_keyword_weight ?? 1,
        ownership_scope_weight_multiplier: params.variant?.ownership_scope_weight_multiplier ?? 1,
    };

    const jobUnderstanding = await getStructuredJobUnderstanding({
        rawJobText: params.jobDescription,
        jobTitleHint: params.jobTitleHint,
    });
    const requirementModel = buildJobRequirementModel({
        jobDescription: params.jobDescription,
        jobTitleHint: params.jobTitleHint,
        variant,
    });
    const candidateAudits = buildCandidateCapabilityAudits(params.candidateContext);
    const capabilityTransferInference: CapabilityTransferInference = variant.transfer_pattern_aggregation
        ? inferCapabilityTransfer({
            candidateEvidencePieces: params.candidateContext.evidence_pieces,
            inferredCandidateCapabilities: candidateAudits,
            structuredJobCapabilityClusters: jobUnderstanding.core_capability_clusters,
            candidateEvidenceSignals: params.candidateContext.evidence_signals,
            candidateTitles: params.candidateContext.candidate_titles,
        })
        : {
            transfer_patterns: [],
            diagnostics: {
                candidate_capability_count: candidateAudits.length,
                evidence_piece_count: params.candidateContext.evidence_pieces.length,
                evidence_signal_count: params.candidateContext.evidence_signals.length,
                structured_job_cluster_count: jobUnderstanding.core_capability_clusters.length,
                total_patterns_considered: 0,
            },
        };
    const transferablePatternAudits = capabilityTransferInference.transfer_patterns;
    const evidenceById = new Map(params.candidateContext.evidence_pieces.map((piece) => [piece.id, piece]));
    const byCanonical = new Map(candidateAudits.map((item) => [normalizeText(item.canonical_name), item]));
    const patternsById = new Map(transferablePatternAudits.map((pattern) => [pattern.pattern_id, pattern]));
    const breakdowns: RequirementMatchBreakdown[] = [];
    const evidenceLinks: EvidenceCapabilityLink[] = [];

    for (const cluster of requirementModel.requirement_clusters) {
        const directCapabilities = cluster.direct_capabilities
            .map((name) => byCanonical.get(normalizeText(name)))
            .filter((item): item is CandidateCapabilityAudit => Boolean(item));

        const transferCapabilities = variant.capability_transfer_matching
            ? candidateAudits.filter((capability) => (
                cluster.transfer_capabilities.includes(capability.canonical_name)
                || capability.transferable_tags.some((tag) => cluster.domain_modifiers.includes(tag))
                || capability.transferable_tags.some((tag) => cluster.matched_terms.some((term) => normalizeText(term).includes(tag)))
            ))
            : [];
        const transferPatterns = variant.transfer_pattern_aggregation
            ? cluster.transfer_pattern_ids
                .map((patternId) => patternsById.get(patternId))
                .filter((pattern): pattern is TransferableCapabilityPatternAudit => Boolean(pattern))
            : [];

        const directScore = maxNumber(directCapabilities.map((item) => item.strength_score));
        const transferCapabilityScore = variant.capability_transfer_matching
            ? round(maxNumber(transferCapabilities.map((item) => item.strength_score * (cluster.layer === "core_mission" ? 0.92 : 0.78))), 4)
            : 0;
        const transferPatternScore = variant.transfer_pattern_aggregation
            ? round(maxNumber(transferPatterns.map((pattern) => pattern.aggregate_score * (cluster.layer === "core_mission" ? 0.98 : 0.88))), 4)
            : 0;
        const transferScore = variant.capability_transfer_matching || variant.transfer_pattern_aggregation
            ? round(clamp(
                Math.max(transferCapabilityScore, transferPatternScore)
                + (transferPatterns.filter((pattern) => pattern.aggregate_score >= 0.6).length >= 2 ? 0.04 : 0)
                + (uniqueStrings(transferPatterns.flatMap((pattern) => pattern.supporting_evidence_piece_ids)).length >= 2 ? 0.03 : 0),
            ), 4)
            : 0;
        const evidenceMatch = gatherEvidenceMatches({
            cluster,
            candidateContext: params.candidateContext,
            directCapabilities,
            transferCapabilities,
        });
        evidenceLinks.push(...evidenceMatch.evidence_links);
        const weights = requirementWeights(cluster.layer);
        const literalWeight = weights.literal * variant.literal_keyword_weight;
        const ownershipWeight = weights.ownership * variant.ownership_scope_weight_multiplier;
        const normalizedWeightTotal = weights.direct + weights.transfer + weights.evidence + literalWeight + ownershipWeight;
        const finalClusterScore = clamp(
            (
                (directScore * weights.direct)
                + (transferScore * weights.transfer)
                + (evidenceMatch.evidence_score * weights.evidence)
                + (evidenceMatch.literal_overlap_score * literalWeight)
                + (evidenceMatch.ownership_scope_score * ownershipWeight)
            ) / normalizedWeightTotal,
        );
        const matchStatus = capabilityMatchStatus(finalClusterScore);
        const gapClassification: GapClassification = matchStatus === "strong" && cluster.importance !== "supporting"
            ? "differentiator"
            : matchStatus === "missing" && cluster.optionality === "core"
                ? "blocking_gap"
                : matchStatus === "weak" || (matchStatus === "partial" && cluster.optionality === "core" && finalClusterScore < 0.58)
                    ? "stretch_gap"
                    : "aligned";
        const weight = IMPORTANCE_WEIGHT[cluster.importance] * (cluster.optionality === "core" ? 1 : 0.7);
        const topCapabilities = [...directCapabilities, ...transferCapabilities]
            .sort((a, b) => b.strength_score - a.strength_score)
            .slice(0, 3);
        const missingFacets: string[] = [];
        if (directScore < 0.45 && variant.capability_transfer_matching && transferScore > directScore) {
            missingFacets.push("Direct canonical capability support is lighter than transferable support.");
        }
        if (cluster.methods.length > 0 && evidenceMatch.literal_overlap_score < 0.35) {
            missingFacets.push("Method/tool evidence is present but not strongly explicit.");
        }
        if (evidenceMatch.ownership_scope_score < 0.42 && cluster.optionality === "core") {
            missingFacets.push("Ownership/scope evidence is weaker than ideal for a core requirement.");
        }
        breakdowns.push({
            cluster_id: cluster.cluster_id,
            display_name: cluster.display_name,
            layer: cluster.layer,
            importance: cluster.importance,
            optionality: cluster.optionality,
            direct_score: round(directScore, 4),
            transfer_score: round(transferScore, 4),
            transfer_pattern_score: round(transferPatternScore, 4),
            evidence_score: evidenceMatch.evidence_score,
            literal_overlap_score: evidenceMatch.literal_overlap_score,
            ownership_scope_score: evidenceMatch.ownership_scope_score,
            final_cluster_score: round(finalClusterScore, 4),
            weight: round(weight, 4),
            weighted_contribution: round(finalClusterScore * weight, 4),
            match_status: matchStatus,
            gap_classification: gapClassification,
            supporting_capabilities: topCapabilities.map((item) => item.display_name),
            supporting_patterns: transferPatterns
                .sort((a, b) => b.aggregate_score - a.aggregate_score)
                .slice(0, 3)
                .map((pattern) => pattern.display_name),
            supporting_evidence_piece_ids: uniqueStrings([
                ...evidenceMatch.evidence_piece_ids,
                ...transferPatterns.flatMap((pattern) => pattern.supporting_evidence_piece_ids),
            ]).slice(0, 6),
            missing_facets: missingFacets,
            reasoning: `${cluster.display_name}: direct=${round(directScore, 2)}, transfer=${round(transferScore, 2)}, patterns=${round(transferPatternScore, 2)}, evidence=${round(evidenceMatch.evidence_score, 2)}, ownership=${round(evidenceMatch.ownership_scope_score, 2)}.`,
        });
    }

    const titlePriorEffect = computeTitlePriorEffect({
        jobTitle: requirementModel.parsed_job_summary.target_title,
        candidateTitles: params.candidateContext.candidate_titles,
        evidenceAlignmentScore: averageBreakdown(breakdowns, "evidence_score"),
        weight: variant.title_prior_penalty_weight,
    });
    const domainPriorEffect = computeDomainPriorEffect({
        jobDomains: requirementModel.parsed_job_summary.domains.length > 0
            ? requirementModel.parsed_job_summary.domains
            : requirementModel.requirement_clusters.flatMap((cluster) => cluster.domain_modifiers),
        candidateContext: params.candidateContext,
        evidenceAlignmentScore: averageBreakdown(breakdowns, "evidence_score"),
        weight: variant.domain_prior_penalty_weight,
    });
    const rawScoreBreakdown = compareBreakdowns(
        breakdowns,
        titlePriorEffect,
        domainPriorEffect,
        variant.inject_ats_penalty,
        variant.transfer_pattern_aggregation,
    );
    const fitBucket = fitBucketFromCalibratedScore({
        score: rawScoreBreakdown.final_score,
        breakdowns,
        transferPatternAggregationEnabled: variant.transfer_pattern_aggregation,
    });
    const bucketReasoning = buildBucketReasoning({
        fitBucket,
        breakdowns,
        titlePriorEffect,
        domainPriorEffect,
    });
    const atsRiskReasoning = buildAtsRiskReasoning({
        titlePriorEffect,
        domainPriorEffect,
        finalScore: rawScoreBreakdown.final_score,
    });
    const tailorRecommendationReasoning = buildTailorReasoning({
        finalScore: rawScoreBreakdown.final_score,
        titlePriorEffect,
    });
    const rankingAudits = buildCapabilityRankingAudits({
        breakdowns,
        requirementClusters: requirementModel.requirement_clusters,
    });

    const positiveContributors = breakdowns
        .filter((item) => item.final_cluster_score >= 0.55)
        .sort((a, b) => b.weighted_contribution - a.weighted_contribution)
        .slice(0, 5)
        .map((item) => ({
            label: item.display_name,
            contribution: round(item.weighted_contribution, 4),
            reason: item.reasoning,
        }));
    const negativeContributors = breakdowns
        .filter((item) => item.gap_classification === "blocking_gap" || item.gap_classification === "stretch_gap")
        .sort((a, b) => {
            const aWeight = toDisplayImportance(a.importance) * (1 - a.final_cluster_score);
            const bWeight = toDisplayImportance(b.importance) * (1 - b.final_cluster_score);
            return bWeight - aWeight;
        })
        .slice(0, 5)
        .map((item) => ({
            label: item.display_name,
            contribution: round((1 - item.final_cluster_score) * item.weight, 4),
            reason: item.reasoning,
        }));
    const penalties = [
        { label: "Blocking gap penalty", contribution: rawScoreBreakdown.blocking_gap_penalty, reason: "Core requirements with missing support." },
        { label: "Stretch gap penalty", contribution: rawScoreBreakdown.stretch_gap_penalty, reason: "Partial-but-fragile requirements." },
        { label: "Title prior penalty", contribution: rawScoreBreakdown.title_prior_penalty, reason: titlePriorEffect.reason },
        { label: "Domain prior penalty", contribution: rawScoreBreakdown.domain_prior_penalty, reason: domainPriorEffect.reason },
        { label: "ATS penalty injection", contribution: rawScoreBreakdown.ats_penalty_injection, reason: "Tiny narrative-sensitivity penalty only when title alignment is weak." },
    ].filter((entry) => entry.contribution > 0);

    const supportingEvidenceIds = Array.from(new Set(
        breakdowns.flatMap((item) => item.supporting_evidence_piece_ids),
    ));
    const audit: CapabilityMatchAuditV2 = {
        raw_job_text: params.jobDescription,
        job_understanding: jobUnderstanding,
        parsed_job_summary: requirementModel.parsed_job_summary,
        extracted_requirements: requirementModel.extracted_requirements,
        requirement_clusters: requirementModel.requirement_clusters,
        requirement_importance_by_cluster: requirementModel.requirement_clusters.map((cluster) => ({
            cluster_id: cluster.cluster_id,
            display_name: cluster.display_name,
            importance: cluster.importance,
            importance_score: cluster.importance_score,
        })),
        optional_vs_core_requirements: requirementModel.optional_vs_core_requirements,
        candidate_capabilities: candidateAudits,
        capability_transfer_inference: capabilityTransferInference,
        transferable_capability_patterns: transferablePatternAudits,
        candidate_evidence_pieces_used: supportingEvidenceIds
            .map((id) => evidenceById.get(id))
            .filter((piece): piece is EvidencePiece => Boolean(piece))
            .map((piece) => ({
                evidence_piece_id: piece.id,
                role: piece.role,
                company: piece.company,
                text: compactSnippet(piece.raw_text, 240),
            })),
        evidence_to_capability_links: evidenceLinks.slice(0, 24),
        requirement_to_candidate_match_breakdown: breakdowns,
        capability_ranking_adjustments: Array.from(rankingAudits.values())
            .sort((a, b) => b.ranking_score - a.ranking_score),
        positive_contributors: positiveContributors,
        negative_contributors: negativeContributors,
        penalties,
        title_prior_effect: titlePriorEffect,
        domain_prior_effect: domainPriorEffect,
        raw_score_breakdown: rawScoreBreakdown,
        final_bucket_reasoning: bucketReasoning,
        ats_risk_reasoning: atsRiskReasoning,
        tailor_recommendation_reasoning: tailorRecommendationReasoning,
    };

    const items = breakdowns.map((breakdown) => {
        const topSignals = breakdown.supporting_capabilities
            .map((name) => candidateAudits.find((capability) => capability.display_name === name))
            .filter((capability): capability is CandidateCapabilityAudit => Boolean(capability))
            .flatMap((capability) => capability.top_supporting_signals)
            .slice(0, 4);
        return toCapabilityMatchItem({
            breakdown,
            candidateScore: breakdown.final_cluster_score,
            topSupportingSignals: topSignals,
            sourceTier: requirementModel.flat_profile.capabilities.find((capability) => capability.display_name === breakdown.display_name)?.source_tier ?? "structured",
            confidence: requirementModel.flat_profile.capabilities.find((capability) => capability.display_name === breakdown.display_name)?.confidence ?? 0.6,
            rankingScore: rankingAudits.get(breakdown.cluster_id)?.ranking_score ?? breakdown.weighted_contribution,
            rankingReason: rankingAudits.get(breakdown.cluster_id)?.reason,
        });
    });

    const sortByCapabilityRanking = (
        left: CapabilityMatchItem & { reasoning?: string },
        right: CapabilityMatchItem & { reasoning?: string },
    ): number => {
        if (right.match_score_contribution !== left.match_score_contribution) {
            return right.match_score_contribution - left.match_score_contribution;
        }
        const leftRanking = rankingAudits.get(left.canonical_name);
        const rightRanking = rankingAudits.get(right.canonical_name);
        if ((rightRanking?.literal_signal_bonus ?? 0) !== (leftRanking?.literal_signal_bonus ?? 0)) {
            return (rightRanking?.literal_signal_bonus ?? 0) - (leftRanking?.literal_signal_bonus ?? 0);
        }
        if ((rightRanking?.repeated_signal_bonus ?? 0) !== (leftRanking?.repeated_signal_bonus ?? 0)) {
            return (rightRanking?.repeated_signal_bonus ?? 0) - (leftRanking?.repeated_signal_bonus ?? 0);
        }
        if ((rightRanking?.section_signal_bonus ?? 0) !== (leftRanking?.section_signal_bonus ?? 0)) {
            return (rightRanking?.section_signal_bonus ?? 0) - (leftRanking?.section_signal_bonus ?? 0);
        }
        if ((rightRanking?.role_coherence_bonus ?? 0) !== (leftRanking?.role_coherence_bonus ?? 0)) {
            return (rightRanking?.role_coherence_bonus ?? 0) - (leftRanking?.role_coherence_bonus ?? 0);
        }
        if ((rightRanking?.specificity_score ?? 0) !== (leftRanking?.specificity_score ?? 0)) {
            return (rightRanking?.specificity_score ?? 0) - (leftRanking?.specificity_score ?? 0);
        }
        if ((rightRanking?.generic_penalty ?? 0) !== (leftRanking?.generic_penalty ?? 0)) {
            return (leftRanking?.generic_penalty ?? 0) - (rightRanking?.generic_penalty ?? 0);
        }
        return right.candidate_strength_score - left.candidate_strength_score;
    };

    const matchedStrengths = items
        .filter((item) => item.match_status === "strong")
        .sort(sortByCapabilityRanking);
    const partialMatches = items
        .filter((item) => item.match_status === "partial" || item.match_status === "weak")
        .sort(sortByCapabilityRanking);
    const gaps = items
        .filter((item) => item.match_status === "weak" || item.match_status === "missing")
        .sort((a, b) => {
            if (toDisplayImportance(b.importance) !== toDisplayImportance(a.importance)) {
                return toDisplayImportance(b.importance) - toDisplayImportance(a.importance);
            }
            const aRanking = rankingAudits.get(a.canonical_name);
            const bRanking = rankingAudits.get(b.canonical_name);
            if ((bRanking?.literal_signal_bonus ?? 0) !== (aRanking?.literal_signal_bonus ?? 0)) {
                return (bRanking?.literal_signal_bonus ?? 0) - (aRanking?.literal_signal_bonus ?? 0);
            }
            if ((bRanking?.section_signal_bonus ?? 0) !== (aRanking?.section_signal_bonus ?? 0)) {
                return (bRanking?.section_signal_bonus ?? 0) - (aRanking?.section_signal_bonus ?? 0);
            }
            if ((bRanking?.specificity_score ?? 0) !== (aRanking?.specificity_score ?? 0)) {
                return (bRanking?.specificity_score ?? 0) - (aRanking?.specificity_score ?? 0);
            }
            return a.candidate_strength_score - b.candidate_strength_score;
        });
    const criticalBreakdowns = breakdowns.filter((item) => item.importance === "critical");

    return {
        model: "job_capability_match_v2",
        career_id: careerId,
        overall_match_score: rawScoreBreakdown.final_score,
        fit_bucket: fitBucket,
        score_confidence: resolveConfidence({
            quality: requirementModel.flat_profile.quality,
            clusterCount: breakdowns.length,
            supportingEvidenceUnits: requirementModel.flat_profile.diagnostics.supporting_evidence_units,
        }),
        job_profile_quality: requirementModel.flat_profile.quality,
        job_profile_diagnostics: requirementModel.flat_profile.diagnostics,
        score_breakdown: {
            ...rawScoreBreakdown,
            matched_critical_count: criticalBreakdowns.filter((item) => item.match_status === "strong" || item.match_status === "partial").length,
            missing_critical_count: criticalBreakdowns.filter((item) => item.match_status === "missing").length,
            total_job_capability_count: breakdowns.length,
        },
        candidate_capability_profile: params.candidateContext.candidate_profile,
        job_capability_profile: requirementModel.flat_profile.capabilities,
        matched_strengths: matchedStrengths,
        partial_matches: partialMatches,
        gaps,
        audit,
    };
}

export async function getCapabilityMatchV2(input: {
    careerId: string;
    profileId: string;
    jobDescription: string;
    jobTitleHint?: string | null;
    topSignalsLimit?: number;
    variant?: MatchVariantConfig;
}): Promise<CapabilityMatchV2Result> {
    const careerId = input.careerId.trim();
    const profileId = input.profileId.trim();
    if (!careerId) throw new Error("careerId is required");
    if (!profileId) throw new Error("profileId is required");
    if (!input.jobDescription || input.jobDescription.trim().length < 40) {
        throw new Error("jobDescription must be at least 40 characters");
    }

    const [candidateProfile, careerGraph] = await Promise.all([
        getCapabilityStrengthProfile(careerId, { topSignalsLimit: input.topSignalsLimit ?? 4 }),
        loadCareerGraph(profileId),
    ]);

    return await getCapabilityMatchV2FromContext({
        careerId,
        jobDescription: input.jobDescription,
        candidateContext: buildCandidateContext({
            careerGraph,
            candidateProfile,
        }),
        jobTitleHint: input.jobTitleHint,
        variant: input.variant,
    });
}

export function summarizeVariantComparison(result: CapabilityMatchV2Result): MatchReplayVariantSummary {
    return {
        variant_name: "default",
        final_score: Number((result.overall_match_score * 100).toFixed(2)),
        fit_bucket: result.fit_bucket,
        top_positive_factors: result.audit.positive_contributors.slice(0, 3).map((item) => item.label),
        top_negative_factors: result.audit.negative_contributors.slice(0, 3).map((item) => item.label),
        summary_diagnosis: result.audit.final_bucket_reasoning,
    };
}
