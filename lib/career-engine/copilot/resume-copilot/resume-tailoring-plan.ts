export type RoleContextProfile = {
    functional_domains: Record<string, number>;
    work_modes: Record<string, number>;
    decision_contexts: Record<string, number>;
    specialized_contexts: Record<string, number>;
};

export type TailoringPlanRequirementCluster = {
    cluster_id: string;
    display_name: string;
    importance: "critical" | "important" | "supporting";
    optionality: "core" | "optional";
    reasoning?: string;
};

export type TailoringPlanCapabilityRankingItem = {
    capability_id: string;
    importance: "critical" | "important" | "supporting";
    score: number;
};

export type TailoringPlanSelectedEvidenceItem = {
    evidence_id: string;
    matched_capabilities: string[];
    matched_requirement_clusters?: string[];
    relevance_score: number;
    strength: number;
    confirmed: boolean;
    ownership_level: "owned" | "led" | "contributed";
    emphasis_tags: string[];
    role_context_alignment?: number;
    matched_role_contexts?: string[];
    sub_context_tokens?: string[];
    primary_context_token?: string | null;
    role_conditioned_matches?: Array<{
        buying_point_id?: string;
        buying_point_label: string;
        buying_point_priority?: number;
        proof_meaning?: string;
        strength: "high" | "medium" | "low";
        source: "requirement_overlap" | "cluster_bridge" | "role_context_bridge" | "evidence_text" | "hybrid";
    }>;
    selected_reason?: string;
    suppressed_reason?: string;
};

export type TailoringPlanSelectionDebugItem = {
    evidence_id: string;
    base_score: number;
    role_context_alignment: number;
    final_score: number;
    selected?: boolean;
    primary_reason?: string;
    supporting_focus_areas?: string[];
    impact_assessment?: "high" | "medium" | "low";
    diversity_reason?: string | null;
    exclusion_reason_if_applicable?: string | null;
    role_context_affinity?: number;
    context_signal_strength?: number;
    genericity_score?: number;
    specialization_signal_strength?: number;
    impact_signal_strength?: number;
    source_reason?: string;
    matched_role_contexts: string[];
    sub_context_tokens?: string[];
    primary_context_token?: string | null;
    role_conditioned_matches?: Array<{
        buying_point_id?: string;
        buying_point_label: string;
        buying_point_priority?: number;
        proof_meaning?: string;
        strength: "high" | "medium" | "low";
        source: "requirement_overlap" | "cluster_bridge" | "role_context_bridge" | "evidence_text" | "hybrid";
    }>;
    specificity_bonus?: number;
    broad_penalty?: number;
    dominant_context_mismatch_penalty?: number;
    reuse_penalty?: number;
    reuse_penalty_reason?: string | null;
    selected_reason?: string | null;
    suppressed_reason?: string | null;
};

export type SelectionSnapshot = {
    selected_evidence: TailoringPlanSelectedEvidenceItem[];
    role_context_profile: RoleContextProfile;
};

export type TailoringPlan = {
    job_id: string;
    role_context_profile?: RoleContextProfile;
    requirement_clusters: TailoringPlanRequirementCluster[];
    capability_ranking: TailoringPlanCapabilityRankingItem[];
    selected_evidence: TailoringPlanSelectedEvidenceItem[];
    selection_debug?: {
        job_role_context_profile: RoleContextProfile;
        snapshot_id?: string;
        selected_evidence_ids?: string[];
        pool_size?: number;
        selection_stage?: "final" | "provisional";
        dominant_context_tokens?: string[];
        dominant_context_distribution?: Array<{
            token: string;
            weight: number;
        }>;
        token_diversity_score?: number;
        context_token_entropy?: number;
        domain_bias_indicator?: number;
        cluster_context_debug?: Array<{
            cluster_id: string;
            display_name: string;
            role_context_affinity: Partial<RoleContextProfile>;
            role_context_alignment: number;
            is_broad_transferable: boolean;
            sub_context_tokens?: string[];
            selection_influence: number;
            suppressed_by_context_guard: boolean;
        }>;
        guiding_pool_debug?: {
            role_context_profile: RoleContextProfile;
            total_candidates: number;
            candidates: Array<{
                evidence_id: string;
                matched_requirement_clusters: string[];
                matched_capabilities: string[];
                matched_role_contexts: string[];
                role_context_affinity: number;
                context_signal_strength: number;
                genericity_score: number;
                specialization_signal_strength: number;
                impact_signal_strength?: number;
                primary_context_token?: string;
                sub_context_tokens?: string[];
                decision_context_tokens?: string[];
                work_mode_tokens?: string[];
                functional_domain_tokens?: string[];
                context_separation_score?: number;
                context_redundancy_reason?: string;
                role_conditioned_matches?: Array<{
                    buying_point_id?: string;
                    buying_point_label: string;
                    buying_point_priority?: number;
                    proof_meaning?: string;
                    strength: "high" | "medium" | "low";
                    source: "requirement_overlap" | "cluster_bridge" | "role_context_bridge" | "evidence_text" | "hybrid";
                }>;
                source_reason: string;
            }>;
            cluster_contribution_summary?: Array<{
                cluster_id: string;
                contributed_candidate_count: number;
                distinct_neighborhood_count: number;
                broad_contribution_count: number;
                context_defining_contribution_count: number;
                fallback_contribution_count: number;
            }>;
            candidate_contribution_debug?: Array<{
                evidence_id: string;
                neighborhood_key: string;
                contribution_traces: Array<{
                    cluster_id: string;
                    contribution_type: "primary" | "broad" | "context_defining" | "fallback";
                    contribution_strength: number;
                }>;
                contribution_redundancy_reason?: string;
            }>;
            pool_composition_summary: {
                broad_count: number;
                broad_generic_count?: number;
                context_aligned_count: number;
                context_distinct_count?: number;
                context_redundant_count?: number;
                cluster_contribution_overlap?: number;
                weak_support_count?: number;
                backfill_candidate_count: number;
            };
        };
        selection_summary?: {
            selected_count: number;
            covered_focus_areas: string[];
            excluded_as_weak_count: number;
            excluded_as_redundant_count: number;
            experience_distribution: Array<{
                experience_id: string;
                selected_count: number;
            }>;
            cluster_distribution: Array<{
                cluster_id: string;
                selected_count: number;
            }>;
            stable_tiebreak_applied?: boolean;
            candidate_order_hash?: string;
            selected_ids_hash?: string;
            selected_ids_recomputed?: boolean;
        };
        selected_evidence: TailoringPlanSelectionDebugItem[];
        selected_evidence_debug?: TailoringPlanSelectionDebugItem[];
    };
    limits: {
        max_experiences: number;
        max_bullets_per_experience: number;
    };
};

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberRecord(value: unknown): value is Record<string, number> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.values(value as Record<string, unknown>).every((entry) =>
        typeof entry === "number" && Number.isFinite(entry) && entry >= 0,
    );
}

export function isRoleContextProfile(value: unknown): value is RoleContextProfile {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const candidate = value as RoleContextProfile;
    return isNumberRecord(candidate.functional_domains)
        && isNumberRecord(candidate.work_modes)
        && isNumberRecord(candidate.decision_contexts)
        && isNumberRecord(candidate.specialized_contexts);
}

function isRoleConditionedMatches(value: unknown): boolean {
    if (value === undefined) return true;
    if (!Array.isArray(value)) return false;
    return value.every((item) =>
        item
        && typeof item === "object"
        && typeof item.buying_point_label === "string"
        && (item.buying_point_id === undefined || typeof item.buying_point_id === "string")
        && (item.buying_point_priority === undefined || typeof item.buying_point_priority === "number")
        && (item.proof_meaning === undefined || typeof item.proof_meaning === "string")
        && (item.strength === "high" || item.strength === "medium" || item.strength === "low")
        && (item.source === "requirement_overlap"
            || item.source === "cluster_bridge"
            || item.source === "role_context_bridge"
            || item.source === "evidence_text"
            || item.source === "hybrid"),
    );
}

export function isTailoringPlan(value: unknown): value is TailoringPlan {
    if (!value || typeof value !== "object") return false;
    const candidate = value as TailoringPlan;
    if (typeof candidate.job_id !== "string" || candidate.job_id.trim().length === 0) return false;
    if (candidate.role_context_profile !== undefined && !isRoleContextProfile(candidate.role_context_profile)) return false;
    if (!Array.isArray(candidate.requirement_clusters)) return false;
    if (!Array.isArray(candidate.capability_ranking)) return false;
    if (!Array.isArray(candidate.selected_evidence)) return false;
    if (!candidate.limits || typeof candidate.limits !== "object") return false;
    if (typeof candidate.limits.max_experiences !== "number" || !Number.isFinite(candidate.limits.max_experiences)) return false;
    if (typeof candidate.limits.max_bullets_per_experience !== "number" || !Number.isFinite(candidate.limits.max_bullets_per_experience)) return false;

    const validRequirements = candidate.requirement_clusters.every((item) =>
        item
        && typeof item.cluster_id === "string"
        && typeof item.display_name === "string"
        && (item.importance === "critical" || item.importance === "important" || item.importance === "supporting")
        && (item.optionality === "core" || item.optionality === "optional")
        && (item.reasoning === undefined || typeof item.reasoning === "string"),
    );
    if (!validRequirements) return false;

    const validCapabilities = candidate.capability_ranking.every((item) =>
        item
        && typeof item.capability_id === "string"
        && (item.importance === "critical" || item.importance === "important" || item.importance === "supporting")
        && typeof item.score === "number"
        && Number.isFinite(item.score),
    );
    if (!validCapabilities) return false;

    const validSelectedEvidence = candidate.selected_evidence.every((item) =>
        item
        && typeof item.evidence_id === "string"
        && isStringArray(item.matched_capabilities)
        && (item.matched_requirement_clusters === undefined || isStringArray(item.matched_requirement_clusters))
        && typeof item.relevance_score === "number"
        && Number.isFinite(item.relevance_score)
        && typeof item.strength === "number"
        && Number.isFinite(item.strength)
        && typeof item.confirmed === "boolean"
        && (item.ownership_level === "owned" || item.ownership_level === "led" || item.ownership_level === "contributed")
        && isStringArray(item.emphasis_tags)
        && (item.role_context_alignment === undefined
            || (typeof item.role_context_alignment === "number" && Number.isFinite(item.role_context_alignment)))
        && (item.matched_role_contexts === undefined || isStringArray(item.matched_role_contexts))
        && (item.sub_context_tokens === undefined || isStringArray(item.sub_context_tokens))
        && (item.primary_context_token === undefined || item.primary_context_token === null || typeof item.primary_context_token === "string")
        && isRoleConditionedMatches(item.role_conditioned_matches)
        && (item.selected_reason === undefined || typeof item.selected_reason === "string")
        && (item.suppressed_reason === undefined || typeof item.suppressed_reason === "string"),
    );
    if (!validSelectedEvidence) return false;

    if (candidate.selection_debug !== undefined) {
        const debug = candidate.selection_debug;
        if (!debug || typeof debug !== "object") return false;
        if (!isRoleContextProfile(debug.job_role_context_profile)) return false;
        if (debug.snapshot_id !== undefined && typeof debug.snapshot_id !== "string") return false;
        if (debug.selected_evidence_ids !== undefined && !isStringArray(debug.selected_evidence_ids)) return false;
        if (debug.pool_size !== undefined && (typeof debug.pool_size !== "number" || !Number.isFinite(debug.pool_size))) return false;
        if (debug.selection_stage !== undefined && debug.selection_stage !== "final" && debug.selection_stage !== "provisional") return false;
        if (debug.dominant_context_tokens !== undefined && !isStringArray(debug.dominant_context_tokens)) return false;
        if (debug.selected_evidence_debug !== undefined && !Array.isArray(debug.selected_evidence_debug)) return false;
        if (!Array.isArray(debug.selected_evidence)) return false;
    }

    return true;
}
