import type {
    TailoringPlanSelectedEvidenceItem,
    TailoringPlanSelectionDebugItem,
    RoleContextProfile,
} from "@/lib/career-engine/copilot/resume-copilot/resume-tailoring-plan";
import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";

type AxisName = keyof RoleContextProfile;

type ParsedRoleContext = {
    axis: AxisName;
    key: string;
};

type RequirementSupportCandidate = {
    cluster_id: string;
    display_name: string;
    importance: "critical" | "important" | "supporting";
    match_status: "strong" | "partial" | "weak" | "missing";
    fit_score: number;
    fit_weighted_contribution: number;
    context_alignment: number;
    is_broad_transferable: boolean;
    context_labels: string[];
    supporting_evidence_ids: string[];
    supporting_capabilities: string[];
    ownership_confidence: "strong" | "moderate" | "light" | "none";
    domain_anchor_score: number;
    domain_priority_adjustment: number;
    role_family_anchor_score: number;
    role_family_priority_adjustment: number;
    severity_score: number;
    shape_support_profile: Readonly<{
        cluster_id: string;
        evidence_support: ShapeSupportProfileEntry[];
        support_score: number;
    }>;
    shape_support_score: number;
};

type ShapeSupportReasonSignal =
    | "direct_matched_capability"
    | "matched_requirement_cluster"
    | "matched_terms"
    | "methods_tooling"
    | "stakeholder_enablement"
    | "domain_modifier"
    | "token_overlap_fallback";

type ShapeSupportStrength = "strong" | "medium" | "weak";

type ShapeSupportProfileEntry = Readonly<{
    evidence_id: string;
    support_score: number;
    support_strength: ShapeSupportStrength;
    reason_signals: ShapeSupportReasonSignal[];
    reason_text: string[];
    exact_cluster_match: boolean;
    matched_terms: string[];
}>;

export type AuthoritativeWhyYouCard = {
    evidence_id: string;
    headline: string;
    proof_summary: string;
    role_relevance: string;
    source_requirement: {
        requirement_id?: string;
        requirement_label?: string;
        buying_point?: string;
    };
    slot_target_debug?: {
        slot?: "slot0" | "slot1";
        assigned_buying_point?: string;
        raw_slot_target_key?: string | null;
        mapped_requirement_id_key?: string | null;
        target_mapping_status?: "mapped" | "unmapped" | "mismatch";
        raw_target_qualified_proof_available?: boolean;
        mapped_target_qualified_proof_available?: boolean;
        role_conditioned_target_qualified_proof_available?: boolean;
        no_proof_omission_used_raw_target_fallback?: boolean;
        no_proof_omission_blocked_by_role_conditioned_target_proof?: boolean;
        qualified_proof_available_for_mapped_target?: boolean;
        fill_path?: string;
        no_proof_gap?: boolean;
        no_proof_routing?: Array<"biggest_risk" | "quick_check" | "role_adds">;
        selected_evidence_id?: string | null;
        omission_reason?: string;
        omitted_requirement_claim_guard_applied?: boolean;
        blocked_overclaim_requirement_key?: string | null;
        original_card_source_requirement?: string | null;
        final_card_source_requirement?: string | null;
        claim_downscoped?: boolean;
        secondary_card_overclaim_blocked?: boolean;
    };
    evidence_classification: "role_native" | "mixed" | "broad_transferable";
    display_priority: number;
};

export type AuthoritativeWhyYouSlotDiagnosticsItem = {
    card_emitted: boolean;
    selected_evidence_id: string | null;
    assigned_buying_point: string | null;
    raw_slot_target_key: string | null;
    mapped_requirement_id_key: string | null;
    target_mapping_status: "mapped" | "unmapped" | "mismatch" | null;
    raw_target_qualified_proof_available: boolean | null;
    mapped_target_qualified_proof_available: boolean | null;
    role_conditioned_target_qualified_proof_available: boolean | null;
    no_proof_omission_blocked_by_role_conditioned_target_proof: boolean | null;
    no_proof_gap: boolean;
    omission_reason: string | null;
    fill_path: string | null;
    no_proof_routing: Array<"biggest_risk" | "quick_check" | "role_adds">;
};

export type AuthoritativeWhyYouSlotDiagnostics = {
    slot0: AuthoritativeWhyYouSlotDiagnosticsItem;
    slot1: AuthoritativeWhyYouSlotDiagnosticsItem;
};

export type AuthoritativeWhyYouSelection = {
    cards: AuthoritativeWhyYouCard[];
    why_you_slot_diagnostics: AuthoritativeWhyYouSlotDiagnostics;
};

type RoleConditionedMatchBase =
    | NonNullable<TailoringPlanSelectedEvidenceItem["role_conditioned_matches"]>[number]
    | NonNullable<TailoringPlanSelectionDebugItem["role_conditioned_matches"]>[number];

type RoleConditionedMatchRuntimeMetadata = {
    match_tier?: "direct" | "adjacent" | "transferable";
    coverage_strength?: "high" | "medium" | "low" | "none";
    coverage_eligible?: boolean;
};

function readRoleConditionedMatchRuntimeMetadata(
    match: RoleConditionedMatchBase,
): RoleConditionedMatchRuntimeMetadata {
    const candidate = match as RoleConditionedMatchRuntimeMetadata;
    return {
        match_tier: candidate.match_tier,
        coverage_strength: candidate.coverage_strength,
        coverage_eligible: candidate.coverage_eligible,
    };
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_/]+/g, " ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSuppressionCluster(value: string): string {
    return normalizeText(value.replace(/[_-]+/g, " ")).replace(/\s+/g, "_");
}

function toSuppressionClusterFamily(value: string): string {
    const cluster = normalizeSuppressionCluster(value);
    if (!cluster) return "";
    if (cluster.includes("marketing_science_measurement") || cluster.includes("digital_advertising_agency")) {
        return "marketing_measurement";
    }
    if (cluster.includes("product_management_roadmap_discovery") || cluster.includes("product_analytics_experimentation")) {
        return "product_management";
    }
    if (cluster.includes("business_analysis_requirements_process")) return "business_analysis";
    if (cluster.includes("it_implementation_rollout_delivery") || cluster.includes("transformation_enablement")) {
        return "implementation_transformation";
    }
    if (cluster.includes("program_management_governance")) return "program_management";
    if (cluster.includes("strategy_consulting_advisory")) return "consulting_advisory";
    if (cluster.includes("customer_cx_insights")) return "crm_lifecycle";
    if (cluster.includes("commercial_strategy_planning") || cluster.includes("commercial_analytics")) {
        return "commercial_strategy";
    }
    if (cluster.includes("pricing_revenue")) return "pricing_revenue";
    if (cluster.includes("insight_generation_reporting") || cluster.includes("analytics_translation_storytelling")) {
        return "analytics_translation";
    }
    return cluster;
}

function dedupe(values: string[], limit: number): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))).slice(0, limit);
}

function parseRoleContextLabel(label: string): ParsedRoleContext | null {
    const text = String(label || "").trim();
    const divider = text.indexOf(":");
    if (divider <= 0) return null;
    const axis = text.slice(0, divider) as AxisName;
    const key = text.slice(divider + 1).trim();
    if (!key) return null;
    if (axis !== "functional_domains" && axis !== "work_modes" && axis !== "decision_contexts" && axis !== "specialized_contexts") {
        return null;
    }
    return { axis, key };
}

function contextLabel(value: string): string {
    return value.replace(/_/g, " ").trim();
}

const WHY_FIT_GENERIC_PHRASES = new Set([
    "analytics",
    "strategy",
    "strategic analytics",
    "strategy and analytics",
    "decision support",
    "strategic decision support",
    "commercial analytics",
    "stakeholder influence",
    "stakeholder leadership",
    "transformation",
    "data and analytics leadership",
    "cross functional embedding stakeholder leadership",
]);

const WHY_FIT_GENERIC_TOKENS = new Set([
    "analytics",
    "analytic",
    "strategy",
    "strategic",
    "decision",
    "support",
    "stakeholder",
    "stakeholders",
    "commercial",
    "transformation",
    "leadership",
    "business",
    "partner",
    "context",
    "aligned",
    "execution",
    "environment",
    "environments",
    "insight",
    "insights",
    "data",
    "role",
]);

const WHY_FIT_CONNECTOR_TOKENS = new Set([
    "and",
    "or",
    "for",
    "with",
    "from",
    "into",
    "across",
    "the",
    "this",
    "that",
    "your",
    "their",
    "our",
    "to",
    "of",
    "in",
    "on",
    "by",
]);

function normalizeRoleContextPhrase(value: string): string {
    const raw = contextLabel(String(value ?? "").trim())
        .replace(/\s+/g, " ")
        .replace(/^[,:;\-\s]+|[,:;\-\s]+$/g, "");
    if (!raw) return "";
    const parsed = parseRoleContextLabel(raw);
    return parsed ? contextLabel(parsed.key) : raw;
}

function truncatePhraseWords(value: string, maxWords = 9): string {
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return value;
    return words.slice(0, maxWords).join(" ");
}

function toPhraseTokens(value: string): string[] {
    return normalizeText(value)
        .split(" ")
        .filter((token) => token.length >= 2 && !WHY_FIT_CONNECTOR_TOKENS.has(token));
}

function isGenericWhyFitPhrase(value: string): boolean {
    const normalized = normalizeText(value);
    if (!normalized) return true;
    if (WHY_FIT_GENERIC_PHRASES.has(normalized)) return true;
    const tokens = toPhraseTokens(value);
    if (tokens.length === 0) return true;
    const nonGenericCount = tokens.filter((token) => !WHY_FIT_GENERIC_TOKENS.has(token)).length;
    if (nonGenericCount === 0) return true;
    if (tokens.length <= 2 && nonGenericCount === 0) return true;
    return false;
}

function summarizeEvidenceProof(value: string): string {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    const firstSentence = normalized.split(/[.!?]+/)[0]?.trim() ?? "";
    if (firstSentence.length >= 28) {
        return firstSentence.length <= 180 ? firstSentence : `${firstSentence.slice(0, 177).trimEnd()}...`;
    }
    return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177).trimEnd()}...`;
}

function firstNonEmptyText(values: Array<string | null | undefined>): string {
    for (const value of values) {
        const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
        if (normalized) return normalized;
    }
    return "";
}

function containsTaxonomyOrDebugMarker(value: string): boolean {
    const normalized = String(value ?? "").trim();
    if (!normalized) return false;
    if (
        /\b(functional[_\s-]*domains?|work[_\s-]*modes?|decision[_\s-]*contexts?|speciali[sz]ed[_\s-]*contexts?)\s*:/i.test(normalized)
    ) {
        return true;
    }
    if (/\b(context[_\s-]*token|sub[_\s-]*context|source_resume_bullet|capability_strength_enrichment)\b/i.test(normalized)) {
        return true;
    }
    if (/\bcluster:[a-z0-9_:-]+\b/i.test(normalized)) return true;
    if (/^[a-z0-9_:-]+$/i.test(normalized) && /_/.test(normalized)) return true;
    return false;
}

function sanitizeWhyYouHeadlineCandidate(value: string): string {
    let normalized = normalizeRoleContextPhrase(value)
        .replace(/\s+/g, " ")
        .replace(/^[,:;\-\s]+|[,:;\-\s]+$/g, "")
        .trim();
    if (!normalized) return "";
    if (containsTaxonomyOrDebugMarker(normalized)) {
        normalized = normalized
            .replace(/\b(functional[_\s-]*domains?|work[_\s-]*modes?|decision[_\s-]*contexts?|speciali[sz]ed[_\s-]*contexts?)\s*:\s*/gi, "")
            .replace(/\b(context[_\s-]*token|sub[_\s-]*context)\b/gi, "")
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .replace(/^[,:;\-\s]+|[,:;\-\s]+$/g, "")
            .trim();
    }
    if (!normalized || containsTaxonomyOrDebugMarker(normalized)) return "";
    return normalized;
}

function toUserFacingHeadlineCase(value: string): string {
    const cleaned = String(value ?? "")
        .replace(/[.;:,\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!cleaned) return "";
    if (cleaned.length === 1) return cleaned.toUpperCase();
    return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

const WHY_YOU_HEADLINE_LEAD_VERB =
    /^(drove|led|pioneered|built|launched|implemented|delivered|owned|identified|created|developed|optimized|managed|designed|executed|established|spearheaded|orchestrated|transformed|improved)\b[:\-\s]*/i;

function extractEvidenceSpecificHeadlineCandidates(value: string): string[] {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return [];
    const segments = normalized
        .split(/(?:[.!?]+|[;]+|\s+[—–-]\s+)/)
        .map((item) => item.trim())
        .filter(Boolean);

    const candidates: string[] = [];
    const push = (raw: string): void => {
        const strippedLeadVerb = raw.replace(WHY_YOU_HEADLINE_LEAD_VERB, "").replace(/^to\s+/i, "").trim();
        const cleaned = sanitizeWhyYouHeadlineCandidate(strippedLeadVerb);
        if (!cleaned) return;
        const tokens = toPhraseTokens(cleaned);
        if (tokens.length < 3) return;
        const nonGenericCount = tokens.filter((token) => !WHY_FIT_GENERIC_TOKENS.has(token)).length;
        if (nonGenericCount === 0) return;
        candidates.push(toUserFacingHeadlineCase(truncatePhraseWords(cleaned, 12)));
    };

    push(normalized);
    for (const segment of segments) push(segment);
    return dedupe(candidates, 5);
}

function headlineSemanticKey(value: string): string {
    return normalizeText(value)
        .replace(/\b(and|or|for|with|from|into|across|the|this|that|your|their|our|to|of|in|on|by|role|requirement|evidence)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isSpecificEnoughHeadline(value: string): boolean {
    const cleaned = sanitizeWhyYouHeadlineCandidate(value);
    if (!cleaned) return false;
    const tokens = toPhraseTokens(cleaned);
    if (tokens.length < 2) return false;
    const nonGenericCount = tokens.filter((token) => !WHY_FIT_GENERIC_TOKENS.has(token)).length;
    if (nonGenericCount >= 2) return true;
    return !isGenericWhyFitPhrase(cleaned) && cleaned.length >= 18;
}

function toRequirementPriorityWeight(value: "critical" | "important" | "supporting"): number {
    if (value === "critical") return 2;
    if (value === "important") return 1;
    return 0;
}

function toMatchStrengthWeight(value: "strong" | "partial" | "weak" | "missing"): number {
    if (value === "strong") return 2;
    if (value === "partial") return 1;
    if (value === "weak") return 0.4;
    return 0;
}

function firstSpecificPhrase(values: string[]): string {
    for (const value of values) {
        const normalized = normalizeRoleContextPhrase(value);
        if (!normalized) continue;
        if (isGenericWhyFitPhrase(normalized)) continue;
        return truncatePhraseWords(normalized, 10);
    }
    return "";
}

function classifyEvidenceCard(params: {
    candidate?: RequirementSupportCandidate | null;
    evidence: TailoringPlanSelectedEvidenceItem;
}): "role_native" | "mixed" | "broad_transferable" {
    const candidate = params.candidate ?? null;
    if (candidate && !candidate.is_broad_transferable) return "role_native";
    if ((params.evidence.matched_requirement_clusters?.length ?? 0) > 0 || candidate) return "mixed";
    return "broad_transferable";
}

export function buildAuthoritativeWhyYouCards(params: {
    capabilityMatch: CapabilityMatchV2Result;
    selectedEvidence: TailoringPlanSelectedEvidenceItem[];
    selectionDebugRows?: TailoringPlanSelectionDebugItem[] | null;
    supportCandidates?: RequirementSupportCandidate[] | null;
    primaryAxisKey?: string | null;
    primaryFrameKey?: string | null;
    primaryRoleFamily?: string | null;
    mustProveRequirements?: Array<{
        requirement_id: string;
        requirement_label: string;
        proof_dimension?: string;
        strength_needed?: "strong" | "moderate" | "light";
    }> | null;
    evidenceSourceById?: Record<string, {
        title?: string | null;
        description?: string | null;
        raw_text?: string | null;
    }>;
    limit?: number;
}): AuthoritativeWhyYouSelection {
    const framePrimaryFamilyHints = (frameKeyRaw: string): string[] => {
        const frameKey = normalizeSuppressionCluster(frameKeyRaw);
        if (frameKey === "technical_data_platform_builder") {
            return ["implementation_transformation", "program_management", "business_analysis", "technical_data_platform_builder"];
        }
        if (frameKey === "policy_public_insights") {
            return ["program_management", "policy_public_insights"];
        }
        if (frameKey === "consulting_advisory") {
            return ["consulting_advisory", "commercial_strategy"];
        }
        if (frameKey === "strategy_business_partner") {
            return ["analytics_translation", "commercial_strategy", "pricing_revenue", "crm_lifecycle", "marketing_measurement"];
        }
        if (frameKey === "specialist_ic") {
            return [];
        }
        return [];
    };
    const primaryLaneSemanticHints = (value: string): string[] => {
        const normalized = normalizeText(value);
        if (!normalized) return [];
        const hints = new Set<string>();
        if (/\b(conversion|cro|experimentation|experiment|testing|funnel|growth|lifecycle|retention)\b/.test(normalized)) {
            hints.add("crm_lifecycle");
            hints.add("commercial_strategy");
            hints.add("product_management");
            hints.add("marketing_measurement");
        }
        if (/\b(marketing|campaign|media|advertising|attribution|incrementality)\b/.test(normalized)) {
            hints.add("marketing_measurement");
            hints.add("commercial_strategy");
        }
        if (/\b(platform|engineering|architecture|integration|data management|pipelines)\b/.test(normalized)) {
            hints.add("implementation_transformation");
            hints.add("technical_data_platform_builder");
        }
        if (/\b(analytics|insight|reporting)\b/.test(normalized)) {
            hints.add("analytics_translation");
        }
        return Array.from(hints);
    };
    const primaryLaneCorpus = normalizeText(`${params.primaryAxisKey ?? ""} ${params.primaryRoleFamily ?? ""}`);
    const GENERIC_LANE_FAMILIES = new Set([
        "commercial_strategy",
        "analytics_translation",
        "commercial_analytics",
        "decision_support",
        "stakeholder_embedding",
    ]);
    const semanticLaneHints = (value: string): Set<string> => new Set(primaryLaneSemanticHints(value));
    const requirementSemanticHints = (value: string): Set<string> => {
        const normalized = normalizeText(value);
        if (!normalized) return new Set();
        const hints = new Set<string>();
        const add = (items: string[]) => items.forEach((item) => hints.add(item));

        if (/\b(conversion|cro|experimentation|experiment|testing|funnel|growth|lifecycle|retention|crm)\b/.test(normalized)) {
            add(["crm_lifecycle", "marketing_measurement", "product_management", "commercial_strategy"]);
        }
        if (/\b(marketing|campaign|media|advertising|attribution|incrementality|mmm|marketing ops|marketing operations)\b/.test(normalized)) {
            add(["marketing_measurement", "commercial_strategy"]);
        }
        if (/\b(platform|engineering|architecture|integration|data management|pipeline|governance|compliance|risk)\b/.test(normalized)) {
            add(["implementation_transformation", "technical_data_platform_builder", "program_management", "business_analysis"]);
        }
        if (/\b(analytics|insight|reporting|bi|dashboard)\b/.test(normalized)) {
            add(["analytics_translation", "commercial_analytics"]);
        }
        if (/\b(strategy|commercial planning|pricing|revenue|profitability|scenario)\b/.test(normalized)) {
            add(["commercial_strategy", "pricing_revenue"]);
        }
        if (/\b(customer|cx|consumer|member|research)\b/.test(normalized)) {
            add(["customer_cx_insights"]);
        }
        if (/\b(consulting|advisory|client)\b/.test(normalized)) {
            add(["consulting_advisory"]);
        }
        if (/\b(policy|regulatory|regulation|public sector|government)\b/.test(normalized)) {
            add(["policy_public_insights"]);
        }
        return hints;
    };
    const primaryLaneSemanticHintSet = semanticLaneHints(`${params.primaryAxisKey ?? ""} ${params.primaryRoleFamily ?? ""}`);
    const mustProveRequirementPrimaryLaneCompatible = (params: {
        requirementLabel: string;
        proofDimension: string;
    }): boolean => {
        if (!enforcePrimarySlotFamily) return true;
        const requirementCorpus = normalizeText(`${params.requirementLabel} ${params.proofDimension}`);
        if (!requirementCorpus) return false;
        const requirementHintSet = requirementSemanticHints(requirementCorpus);
        const primaryHintSet = new Set<string>([
            ...Array.from(primaryFamilyHints),
            ...Array.from(primaryLaneSemanticHintSet),
        ]);
        if (requirementHintSet.size > 0) {
            const overlap = Array.from(requirementHintSet).some((hint) => primaryHintSet.has(hint));
            if (!overlap) {
                const hasSpecificRequirementHint = Array.from(requirementHintSet).some((hint) => !GENERIC_LANE_FAMILIES.has(hint));
                if (hasSpecificRequirementHint) {
                    return false;
                }
            }
        }
        const roleHasMarketingOrGrowth = /\b(marketing|campaign|funnel|lifecycle|retention|cro|conversion|growth|experimentation)\b/.test(primaryLaneCorpus);
        const roleIsTechnicalPlatform = /\b(platform|engineering|architecture|data platform|data management|pipeline|regulated|governance|risk|compliance)\b/.test(primaryLaneCorpus);
        const requirementLooksMarketingGrowth = /\b(marketing|campaign|funnel|lifecycle|retention|cro|conversion|growth|experimentation|advertising)\b/.test(requirementCorpus);
        if (roleIsTechnicalPlatform && requirementLooksMarketingGrowth && !roleHasMarketingOrGrowth) {
            return false;
        }
        return true;
    };
    const roleFamilyPrimaryHints = (roleFamilyRaw: string): string[] => {
        const roleFamily = normalizeText(roleFamilyRaw);
        if (!roleFamily) return [];
        if (/\b(platform|data engineering|engineering|data management|architecture|pipeline|integration)\b/.test(roleFamily)) {
            return ["implementation_transformation", "program_management", "business_analysis", "technical_data_platform_builder"];
        }
        if (/\b(policy|regulatory|regulation|public sector|government|governance|compliance|risk)\b/.test(roleFamily)) {
            return ["program_management", "policy_public_insights"];
        }
        if (/\b(consulting|advisory|strategy)\b/.test(roleFamily)) {
            return ["consulting_advisory", "commercial_strategy"];
        }
        if (/\b(analytics|insight|reporting)\b/.test(roleFamily)) {
            return ["analytics_translation", "commercial_strategy", "pricing_revenue", "crm_lifecycle", "marketing_measurement"];
        }
        return [];
    };
    const primaryClusterHints = new Set(
        dedupe([
            normalizeSuppressionCluster(params.primaryAxisKey ?? ""),
            normalizeSuppressionCluster(params.primaryRoleFamily ?? ""),
        ].filter(Boolean), 8),
    );
    const primaryFamilyHints = new Set(
        dedupe([
            ...Array.from(primaryClusterHints)
                .map((value) => toSuppressionClusterFamily(value))
                .filter(Boolean),
            ...framePrimaryFamilyHints(params.primaryFrameKey ?? ""),
            ...roleFamilyPrimaryHints(params.primaryRoleFamily ?? ""),
            ...primaryLaneSemanticHints(`${params.primaryAxisKey ?? ""} ${params.primaryRoleFamily ?? ""}`),
        ].filter(Boolean), 10),
    );
    const enforcePrimarySlotFamily = primaryClusterHints.size > 0 || primaryFamilyHints.size > 0;
    const limit = Math.max(1, Math.min(6, params.limit ?? 3));
    const selectionDebugByEvidenceId = new Map(
        (params.selectionDebugRows ?? []).map((row) => [row.evidence_id, row] as const),
    );
    const supportCandidates = params.supportCandidates ?? [];
    const requirementClusterById = new Map(
        params.capabilityMatch.audit.requirement_clusters.map((cluster) => [normalizeSuppressionCluster(cluster.cluster_id), cluster] as const),
    );
    const mustProveById = new Map(
        (params.mustProveRequirements ?? [])
            .map((item) => [normalizeSuppressionCluster(item.requirement_id), item] as const)
            .filter((entry) => entry[0].length > 0),
    );
    const requirementPriorityById = new Map<string, number>();
    (params.mustProveRequirements ?? []).forEach((item, index) => {
        const key = normalizeSuppressionCluster(item.requirement_id);
        if (!key || requirementPriorityById.has(key)) return;
        requirementPriorityById.set(key, index);
    });
    const buyingPointStrengthRank = (value: "high" | "medium" | "low" | undefined): number => {
        if (value === "high") return 3;
        if (value === "medium") return 2;
        if (value === "low") return 1;
        return 0;
    };
    const buyingPointSourceRank = (value: string | undefined): number => {
        if (value === "requirement_overlap") return 4;
        if (value === "hybrid") return 3;
        if (value === "role_context_bridge") return 2;
        if (value === "cluster_bridge") return 1;
        return 0;
    };
    const resolveMustProveRequirementForEvidence = (params: {
        evidence: TailoringPlanSelectedEvidenceItem;
        selectionDebugRow: TailoringPlanSelectionDebugItem | null;
    }): {
        requirement_id: string;
        requirement_label: string;
        proof_dimension: string;
        priority: number;
        coverage_strength: "high" | "medium" | "low" | "none";
        coverage_eligible: boolean;
        match_tier: "direct" | "adjacent" | "transferable";
        match_source: string;
        explicit_role_conditioned_match: boolean;
    } | null => {
        const mergedMatches = dedupe([
            ...(params.evidence.role_conditioned_matches ?? []).map((item) => JSON.stringify(item)),
            ...((params.selectionDebugRow?.role_conditioned_matches ?? []).map((item) => JSON.stringify(item))),
        ], 30).map((entry) => {
            try {
                return JSON.parse(entry) as {
                    buying_point_id?: string;
                    buying_point_label?: string;
                    buying_point_priority?: number;
                    strength?: "high" | "medium" | "low";
                    source?: string;
                    coverage_strength?: "high" | "medium" | "low" | "none";
                    match_tier?: "direct" | "adjacent" | "transferable";
                    anchor_required?: boolean;
                    anchor_matched?: boolean;
                };
            } catch {
                return null;
            }
        }).filter((entry): entry is {
            buying_point_id?: string;
            buying_point_label?: string;
            buying_point_priority?: number;
            strength?: "high" | "medium" | "low";
            source?: string;
            coverage_strength?: "high" | "medium" | "low" | "none";
            match_tier?: "direct" | "adjacent" | "transferable";
            anchor_required?: boolean;
            anchor_matched?: boolean;
        } => Boolean(entry));
        if (mergedMatches.length === 0) return null;

        const ranked = mergedMatches
            .map((match) => {
                const idKey = normalizeSuppressionCluster(match.buying_point_id ?? match.buying_point_label ?? "");
                if (!idKey) return null;
                const mustProve = mustProveById.get(idKey);
                if (!mustProve) return null;
                const requirementLabel = normalizeRoleContextPhrase(mustProve.requirement_label || match.buying_point_label || "");
                const proofDimension = normalizeRoleContextPhrase(mustProve.proof_dimension ?? "");
                if (!mustProveRequirementPrimaryLaneCompatible({
                    requirementLabel,
                    proofDimension,
                })) {
                    return null;
                }
                return {
                    requirement_id: idKey,
                    requirement_label: requirementLabel,
                    proof_dimension: proofDimension,
                    priority: requirementPriorityById.get(idKey) ?? 999,
                    buying_point_priority: Number.isFinite(match.buying_point_priority ?? NaN)
                        ? Number(match.buying_point_priority)
                        : 999,
                    strength_rank: buyingPointStrengthRank(match.strength),
                    source_rank: buyingPointSourceRank(match.source),
                    coverage_strength: match.coverage_strength ?? null,
                    match_tier: match.match_tier ?? null,
                    anchor_required: Boolean(match.anchor_required),
                    anchor_matched: Boolean(match.anchor_matched),
                    source: match.source ?? "",
                };
            })
            .filter((entry): entry is {
                requirement_id: string;
                requirement_label: string;
                proof_dimension: string;
                priority: number;
                buying_point_priority: number;
                strength_rank: number;
                source_rank: number;
                coverage_strength: "high" | "medium" | "low" | "none" | null;
                match_tier: "direct" | "adjacent" | "transferable" | null;
                anchor_required: boolean;
                anchor_matched: boolean;
                source: string;
            } => Boolean(entry))
            .sort((left, right) => {
                if (left.priority !== right.priority) return left.priority - right.priority;
                if (right.strength_rank !== left.strength_rank) return right.strength_rank - left.strength_rank;
                if (left.buying_point_priority !== right.buying_point_priority) return left.buying_point_priority - right.buying_point_priority;
                if (right.source_rank !== left.source_rank) return right.source_rank - left.source_rank;
                return left.requirement_id.localeCompare(right.requirement_id);
            });
        const strongerAttachmentByRequirementId = new Set(
            ranked
                .filter((entry) => (
                    entry.coverage_strength !== "none"
                    || entry.match_tier === "direct"
                    || (entry.anchor_required && entry.anchor_matched)
                ))
                .map((entry) => entry.requirement_id),
        );
        const bridgeOnlyWeakPriorityOne = (entry: {
            priority: number;
            coverage_strength: "high" | "medium" | "low" | "none" | null;
            match_tier: "direct" | "adjacent" | "transferable" | null;
            anchor_required: boolean;
            source: string;
            requirement_id: string;
        }): boolean => (
            entry.priority <= 1
            && entry.match_tier === "adjacent"
            && entry.coverage_strength === "none"
            && !entry.anchor_required
            && (entry.source === "cluster_bridge" || entry.source === "role_context_bridge" || entry.source === "hybrid")
            && !strongerAttachmentByRequirementId.has(entry.requirement_id)
        );
        const attachmentFiltered = ranked.filter((entry) => !bridgeOnlyWeakPriorityOne(entry));
        const filteredBest = attachmentFiltered[0] ?? null;
        const rankedBest = ranked[0] ?? null;
        const topPriority = rankedBest?.priority ?? 999;
        const filteredPriority = filteredBest?.priority ?? 999;
        const hasTopPriorityInRanked = ranked.some((entry) => entry.priority === topPriority);
        const hasTopPriorityAfterFilter = attachmentFiltered.some((entry) => entry.priority === topPriority);
        const needsPriorityConsistencyFallback = Boolean(
            filteredBest
            && rankedBest
            && filteredPriority > topPriority
            && hasTopPriorityInRanked
            && !hasTopPriorityAfterFilter,
        );
        const priorityConsistentFallback = needsPriorityConsistencyFallback
            ? ranked.find((entry) => entry.priority === topPriority) ?? null
            : null;
        const best = priorityConsistentFallback ?? filteredBest ?? rankedBest;
        if (!best) return null;
        const coverageStrength = (best.coverage_strength ?? "none");
        const matchTier = (best.match_tier ?? "adjacent");
        const coverageEligible = (
            coverageStrength === "high"
            || coverageStrength === "medium"
            || matchTier === "direct"
        );
        return {
            requirement_id: best.requirement_id,
            requirement_label: best.requirement_label || mustProveById.get(best.requirement_id)?.requirement_label || "",
            proof_dimension: best.proof_dimension,
            priority: best.priority,
            coverage_strength: coverageStrength,
            coverage_eligible: coverageEligible,
            match_tier: matchTier,
            match_source: best.source,
            explicit_role_conditioned_match: true,
        };
    };
    const primaryLaneAlignmentScore = (clusterIdRaw: string): number => {
        if (!enforcePrimarySlotFamily) return 0;
        const clusterId = normalizeSuppressionCluster(clusterIdRaw);
        if (!clusterId) return 0;
        let score = 0;
        if (primaryClusterHints.has(clusterId)) score += 2.5;
        const clusterFamily = toSuppressionClusterFamily(clusterId);
        if (clusterFamily && primaryFamilyHints.has(clusterFamily)) score += 1.2;
        if (BROAD_TRANSFERABLE_CLUSTER_HINTS.has(clusterId)) score -= 0.35;
        return Number(score.toFixed(4));
    };
    const SLOT1_GENERIC_FALLBACK_FAMILIES = new Set(["business_analysis", "implementation_transformation"]);
    const resolvePrimaryLaneRequirement = (clusterIds: string[], preferredOrder: string[]): {
        cluster_id: string;
        score: number;
    } | null => {
        if (!enforcePrimarySlotFamily) return null;
        const uniqueClusterIds = dedupe(
            clusterIds.map((clusterId) => normalizeSuppressionCluster(clusterId)).filter(Boolean),
            16,
        );
        if (uniqueClusterIds.length === 0) return null;
        const preferredIndex = new Map(
            preferredOrder.map((clusterId, index) => [normalizeSuppressionCluster(clusterId), index] as const),
        );
        const ranked = uniqueClusterIds
            .map((clusterId) => ({
                cluster_id: clusterId,
                score: primaryLaneAlignmentScore(clusterId),
                preferred_rank: preferredIndex.get(clusterId) ?? 99,
            }))
            .filter((item) => item.score > 0)
            .sort((left, right) => {
                if (right.score !== left.score) return right.score - left.score;
                if (left.preferred_rank !== right.preferred_rank) return left.preferred_rank - right.preferred_rank;
                return left.cluster_id.localeCompare(right.cluster_id);
            });
        return ranked[0] ?? null;
    };
    const isPrimaryAlignedCard = (clusterIds: string[]): boolean => {
        if (!enforcePrimarySlotFamily) return false;
        return resolvePrimaryLaneRequirement(clusterIds, clusterIds) !== null;
    };
    const leadershipStoryMode = (params.mustProveRequirements ?? []).some((item) => {
        const label = normalizeRoleContextPhrase(item.requirement_label ?? "").toLowerCase();
        const proofDimension = normalizeRoleContextPhrase(item.proof_dimension ?? "").toLowerCase();
        const merged = `${label} ${proofDimension}`.trim();
        if (!merged) return false;
        return /\b(build|lead|leadership|head|centralized|function|operating model|multi brand|multi-brand|stakeholder|commercial outcomes|research|consumer|member|subscription)\b/.test(merged);
    });

    const rankedCards: Array<{
        card: AuthoritativeWhyYouCard;
        rankScore: number;
        requirementPriority: number;
        requirementIdKey: string;
        rawMustProveRequirementIdKey: string;
        roleConditionedTargetKeys: string[];
        qualifiedRoleConditionedTargetKeys: string[];
        directStrongRoleConditionedTargetKeys: string[];
        translationHeavy: boolean;
        primaryAligned: boolean;
        primaryLaneViable: boolean;
        mustProveAligned: boolean;
        coverageStrength: "high" | "medium" | "low" | "none";
        coverageEligible: boolean;
        matchTier: "direct" | "adjacent" | "transferable";
        matchSource: string;
        explicitRoleConditionedMatch: boolean;
    }> = [];
    const usedHeadlineKeys = new Set<string>();
    const evaluationWindow = Math.max(limit, Math.min(6, params.selectedEvidence.length));
    for (const evidence of params.selectedEvidence.slice(0, evaluationWindow)) {
        const evidenceId = String(evidence.evidence_id ?? "").trim();
        if (!evidenceId) continue;
        const matchedRequirementClusters = dedupe(
            (evidence.matched_requirement_clusters ?? []).map((item) => String(item ?? "").trim()).filter(Boolean),
            8,
        );
        const normalizedMatchedRequirementClusters = dedupe(
            matchedRequirementClusters.map((clusterId) => normalizeSuppressionCluster(clusterId)).filter(Boolean),
            8,
        );
        const candidatePool = supportCandidates.filter((candidate) => candidate.supporting_evidence_ids.includes(evidenceId));
        const selectedCandidate = candidatePool.sort((left, right) => {
            const leftClusterMatch = normalizedMatchedRequirementClusters.includes(normalizeSuppressionCluster(left.cluster_id)) ? 1 : 0;
            const rightClusterMatch = normalizedMatchedRequirementClusters.includes(normalizeSuppressionCluster(right.cluster_id)) ? 1 : 0;
            if (rightClusterMatch !== leftClusterMatch) return rightClusterMatch - leftClusterMatch;
            const leftNativeBoost = left.is_broad_transferable ? 0 : 1;
            const rightNativeBoost = right.is_broad_transferable ? 0 : 1;
            if (rightNativeBoost !== leftNativeBoost) return rightNativeBoost - leftNativeBoost;
            const leftScore = toRequirementPriorityWeight(left.importance) + toMatchStrengthWeight(left.match_status);
            const rightScore = toRequirementPriorityWeight(right.importance) + toMatchStrengthWeight(right.match_status);
            if (rightScore !== leftScore) return rightScore - leftScore;
            if (right.shape_support_score !== left.shape_support_score) return right.shape_support_score - left.shape_support_score;
            return left.cluster_id.localeCompare(right.cluster_id);
        })[0] ?? null;
        const debugRow = selectionDebugByEvidenceId.get(evidenceId) ?? null;
        const mustProveRequirementForEvidence = resolveMustProveRequirementForEvidence({
            evidence,
            selectionDebugRow: debugRow,
        });

        const roleAlignedClusterIds = dedupe([
            ...normalizedMatchedRequirementClusters,
            normalizeSuppressionCluster(selectedCandidate?.cluster_id ?? ""),
            ...candidatePool.map((candidate) => normalizeSuppressionCluster(candidate.cluster_id)),
        ].filter(Boolean), 16);
        const primaryLaneRequirement = resolvePrimaryLaneRequirement(roleAlignedClusterIds, normalizedMatchedRequirementClusters);
        const fallbackRequirementId = normalizedMatchedRequirementClusters[0]
            || normalizeSuppressionCluster(selectedCandidate?.cluster_id ?? "")
            || "";
        const fallbackFamily = toSuppressionClusterFamily(fallbackRequirementId);
        const primaryLaneFamily = primaryLaneRequirement
            ? toSuppressionClusterFamily(primaryLaneRequirement.cluster_id)
            : "";
        const shouldPromotePrimaryLaneRequirement = Boolean(
            primaryLaneRequirement
            && primaryLaneRequirement.score >= 1
            && primaryLaneRequirement.cluster_id !== fallbackRequirementId
            && SLOT1_GENERIC_FALLBACK_FAMILIES.has(fallbackFamily)
            && !SLOT1_GENERIC_FALLBACK_FAMILIES.has(primaryLaneFamily),
        );
        const clusterResolvedRequirementId = shouldPromotePrimaryLaneRequirement
            ? primaryLaneRequirement?.cluster_id ?? fallbackRequirementId
            : fallbackRequirementId;
        const selectedRequirementId = mustProveRequirementForEvidence?.requirement_id
            ?? clusterResolvedRequirementId;
        const selectedRequirementKey = normalizeSuppressionCluster(selectedRequirementId);
        const mustProveRequirementLabel = mustProveRequirementForEvidence?.requirement_label ?? "";
        const selectedRequirementLabel = String(
            mustProveRequirementLabel
            || mustProveById.get(selectedRequirementKey)?.requirement_label
            || requirementClusterById.get(selectedRequirementKey)?.display_name
            || selectedCandidate?.display_name
            || "",
        ).replace(/\s+/g, " ").trim();
        const requirementPriority = mustProveRequirementForEvidence?.priority
            ?? requirementPriorityById.get(selectedRequirementKey)
            ?? 999;
        const requirementCoverageStrength = mustProveRequirementForEvidence?.coverage_strength ?? "none";
        const requirementCoverageEligible = Boolean(mustProveRequirementForEvidence?.coverage_eligible);
        const requirementMatchTier = mustProveRequirementForEvidence?.match_tier ?? "adjacent";
        const requirementMatchSource = mustProveRequirementForEvidence?.match_source ?? "";
        const rawMustProveRequirementIdKey = normalizeSuppressionCluster(
            mustProveRequirementForEvidence?.requirement_id ?? "",
        );
        const explicitRoleConditionedMatch = Boolean(
            mustProveRequirementForEvidence?.explicit_role_conditioned_match,
        );
        const mergedRoleConditionedMatches = [
            ...(evidence.role_conditioned_matches ?? []),
            ...(debugRow?.role_conditioned_matches ?? []),
        ];
        const qualifiedRoleConditionedTargetKeys = dedupe(
            mergedRoleConditionedMatches.flatMap((match) => {
                const targetKey = normalizeSuppressionCluster(
                    match.buying_point_id ?? match.buying_point_label ?? "",
                );
                if (!targetKey) return [];
                const runtimeMetadata = readRoleConditionedMatchRuntimeMetadata(match);
                const matchTier = runtimeMetadata.match_tier ?? "adjacent";
                const isDirectMatchTier = matchTier === "direct";
                const coverageStrength = runtimeMetadata.coverage_strength ?? "none";
                const coverageEligible = (
                    Boolean(runtimeMetadata.coverage_eligible)
                    || coverageStrength === "high"
                    || coverageStrength === "medium"
                    || isDirectMatchTier
                );
                const qualified = (
                    coverageEligible
                    || coverageStrength !== "none"
                    || isDirectMatchTier
                );
                return qualified ? [targetKey] : [];
            }),
            16,
        );
        const directStrongRoleConditionedTargetKeys = dedupe(
            mergedRoleConditionedMatches.flatMap((match) => {
                const targetKey = normalizeSuppressionCluster(
                    match.buying_point_id ?? match.buying_point_label ?? "",
                );
                if (!targetKey) return [];
                const runtimeMetadata = readRoleConditionedMatchRuntimeMetadata(match);
                const matchTier = runtimeMetadata.match_tier ?? "adjacent";
                const isDirectMatchTier = matchTier === "direct";
                const coverageStrength = runtimeMetadata.coverage_strength ?? "none";
                const coverageEligible = (
                    Boolean(runtimeMetadata.coverage_eligible)
                    || coverageStrength === "high"
                    || coverageStrength === "medium"
                    || isDirectMatchTier
                );
                const directOrStrong = (
                    isDirectMatchTier
                    || coverageStrength === "high"
                    || coverageStrength === "medium"
                );
                return (directOrStrong && coverageEligible && coverageStrength !== "none") ? [targetKey] : [];
            }),
            16,
        );
        const roleConditionedTargetKeys = dedupe(
            [
                ...(evidence.role_conditioned_matches ?? []).map((item) =>
                    normalizeSuppressionCluster(item.buying_point_id ?? item.buying_point_label ?? ""),
                ),
                ...((debugRow?.role_conditioned_matches ?? []).map((item) =>
                    normalizeSuppressionCluster(item.buying_point_id ?? item.buying_point_label ?? ""),
                )),
            ].filter(Boolean),
            16,
        );
        const requirementProofDimension = normalizeRoleContextPhrase(
            String(
                mustProveRequirementForEvidence?.proof_dimension
                || mustProveById.get(selectedRequirementKey)?.proof_dimension
                || "",
            ),
        );
        const evidenceSource = params.evidenceSourceById?.[evidenceId];
        const evidenceSourceText = firstNonEmptyText([
            evidenceSource?.title ?? "",
            evidenceSource?.description ?? "",
            evidenceSource?.raw_text ?? "",
        ]);

        const evidenceHeadlineCandidates = extractEvidenceSpecificHeadlineCandidates(evidenceSourceText);
        const requirementHeadlineCandidate = isSpecificEnoughHeadline(selectedRequirementLabel)
            ? toUserFacingHeadlineCase(sanitizeWhyYouHeadlineCandidate(selectedRequirementLabel))
            : "";
        const supportHeadlineCandidates = dedupe([
            sanitizeWhyYouHeadlineCandidate(selectedCandidate?.display_name ?? ""),
            ...(debugRow?.supporting_focus_areas ?? []).map((item) => sanitizeWhyYouHeadlineCandidate(item)),
            ...(evidence.matched_capabilities ?? []).map((item) => sanitizeWhyYouHeadlineCandidate(item)),
            ...(evidence.emphasis_tags ?? []).map((item) => sanitizeWhyYouHeadlineCandidate(item)),
            sanitizeWhyYouHeadlineCandidate(evidence.primary_context_token ?? ""),
            ...(evidence.matched_role_contexts ?? []).map((item) => sanitizeWhyYouHeadlineCandidate(normalizeRoleContextPhrase(item))),
            ...(selectedCandidate?.context_labels ?? []).map((item) => sanitizeWhyYouHeadlineCandidate(item)),
        ]
            .filter((item) => Boolean(item))
            .filter((item) => isSpecificEnoughHeadline(item)), 10)
            .map((item) => toUserFacingHeadlineCase(item));

        const headlineCandidates = dedupe([
            ...evidenceHeadlineCandidates,
            requirementHeadlineCandidate,
            ...supportHeadlineCandidates,
        ], 16);

        let headline = headlineCandidates[0] || "Role-relevant evidence";
        let headlineKey = headlineSemanticKey(headline) || normalizeText(headline);
        if (usedHeadlineKeys.has(headlineKey)) {
            const alternate = headlineCandidates.find((candidate) => {
                const candidateKey = headlineSemanticKey(candidate) || normalizeText(candidate);
                return Boolean(candidateKey) && !usedHeadlineKeys.has(candidateKey);
            });
            if (alternate) {
                headline = alternate;
                headlineKey = headlineSemanticKey(headline) || normalizeText(headline);
            }
        }
        if (headlineKey) usedHeadlineKeys.add(headlineKey);

        const proofSummary = summarizeEvidenceProof(evidenceSourceText)
            || `Proven delivery in ${headline.toLowerCase()}.`;

        const buyingPoint = selectedRequirementLabel || headline;
        const selectedRequirementLower = selectedRequirementLabel.toLowerCase();
        const contextSpecificPhrase = firstSpecificPhrase(
            selectedCandidate?.context_labels?.map((item) => normalizeRoleContextPhrase(item)).filter(Boolean) ?? [],
        );
        const roleRelevance = selectedRequirementLabel
            ? requirementProofDimension
                ? `Supports ${selectedRequirementLower} by showing ${requirementProofDimension.toLowerCase()}.`
                : /\b(build|lead|leadership|head|centralized|function|operating model)\b/.test(selectedRequirementLower)
                    ? `Direct proof for ${selectedRequirementLower} in a function-owning context.`
                    : `Direct proof for ${selectedRequirementLower} in this role context.`
            : contextSpecificPhrase
                ? `Supports this role's ${contextSpecificPhrase.toLowerCase()} emphasis.`
                : "Direct role-relevant proof for this hiring case.";

        const evidenceClassification = classifyEvidenceCard({
            candidate: selectedCandidate,
            evidence,
        });
        const primaryAligned = isPrimaryAlignedCard(roleAlignedClusterIds);
        const primaryLaneViable = (primaryLaneRequirement?.score ?? 0) >= 1;
        const mustProveAligned = Boolean(mustProveRequirementForEvidence);
        const semanticCardText = [
            headline,
            proofSummary,
            roleRelevance,
            selectedRequirementLabel,
            requirementProofDimension,
        ].join(" ").toLowerCase();
        const translationHeavy = /\b(analytics translation|insight storytelling|storytelling)\b/.test(semanticCardText);
        const leadershipCue = leadershipStoryMode
            && /\b(build|lead|leadership|centralized|function|operating model|multi brand|multi-brand|stakeholder|commercial outcomes|research|consumer|member|subscription)\b/.test(semanticCardText);
        const priorityScore = requirementPriority < 999 ? Math.max(0, 4 - requirementPriority) : 0;
        const candidateMatchScore = selectedCandidate
            ? toRequirementPriorityWeight(selectedCandidate.importance) + toMatchStrengthWeight(selectedCandidate.match_status)
            : 0;
        const ownershipScore = evidence.ownership_level === "owned"
            ? 1.1
            : evidence.ownership_level === "led"
                ? 0.7
                : 0.2;
        const relevanceScore = Math.max(0, Math.min(100, Number(evidence.relevance_score ?? 0))) / 30;
        const classificationScore = evidenceClassification === "role_native"
            ? 1
            : evidenceClassification === "mixed"
                ? 0.45
                : 0;
        let rankScore = (priorityScore * 1.6) + candidateMatchScore + ownershipScore + relevanceScore + classificationScore;
        if (mustProveAligned) rankScore += 0.95;
        if (leadershipCue) rankScore += 1.2;
        if (leadershipStoryMode && translationHeavy) rankScore -= 0.45;
        if ((evidence.matched_requirement_clusters?.length ?? 0) > 0) rankScore += 0.35;

        rankedCards.push({
            card: {
                evidence_id: evidenceId,
                headline,
                proof_summary: proofSummary,
                role_relevance: roleRelevance,
                source_requirement: {
                    requirement_id: selectedRequirementId || undefined,
                    requirement_label: selectedRequirementLabel || undefined,
                    buying_point: buyingPoint || undefined,
                },
                evidence_classification: evidenceClassification,
                display_priority: 0,
            },
            rankScore: Number(rankScore.toFixed(4)),
            requirementPriority,
            requirementIdKey: selectedRequirementKey,
            rawMustProveRequirementIdKey,
            roleConditionedTargetKeys,
            qualifiedRoleConditionedTargetKeys,
            directStrongRoleConditionedTargetKeys,
            translationHeavy,
            primaryAligned,
            primaryLaneViable,
            mustProveAligned,
            coverageStrength: requirementCoverageStrength,
            coverageEligible: requirementCoverageEligible,
            matchTier: requirementMatchTier,
            matchSource: requirementMatchSource,
            explicitRoleConditionedMatch,
        });
    }
    const sorted = rankedCards.sort((left, right) => {
        if (right.rankScore !== left.rankScore) return right.rankScore - left.rankScore;
        if (left.requirementPriority !== right.requirementPriority) return left.requirementPriority - right.requirementPriority;
        return left.card.headline.localeCompare(right.card.headline);
    });

    const selected: typeof sorted = [];
    const usedRequirementIds = new Set<string>();
    const isCoverageQualityPreferred = (item: (typeof sorted)[number]): boolean => (
        item.coverageEligible
        || item.coverageStrength !== "none"
        || item.matchTier === "direct"
    );
    const isActiveLaneAligned = (item: (typeof sorted)[number], activeRequirementId: string): boolean => (
        Boolean(activeRequirementId) && item.requirementIdKey === activeRequirementId
    );
    const laneViabilityScore = (item: (typeof sorted)[number]): number => {
        let score = 0;
        if (item.mustProveAligned) score += 2;
        if (item.primaryLaneViable) score += 2;
        if (item.primaryAligned) score += 1;
        return score;
    };
    const isControlSafeCoveragePreferred = (
        item: (typeof sorted)[number],
        activeRequirementId: string,
    ): boolean => (
        isCoverageQualityPreferred(item)
        && isActiveLaneAligned(item, activeRequirementId)
        && item.mustProveAligned
        && item.explicitRoleConditionedMatch
        && item.matchSource !== "evidence_text"
    );
    const isWeakAdjacentNoCoverage = (item: (typeof sorted)[number]): boolean => (
        item.matchTier === "adjacent"
        && item.coverageStrength === "none"
        && !item.coverageEligible
    );
    const isDirectOrStrongSupportingProof = (item: (typeof sorted)[number]): boolean => (
        item.coverageEligible
        || item.coverageStrength !== "none"
        || item.matchTier === "direct"
    );
    const slotTargets = (params.mustProveRequirements ?? [])
        .map((item) => ({
            requirementIdKey: normalizeSuppressionCluster(item.requirement_id),
            requirementLabel: normalizeRoleContextPhrase(item.requirement_label ?? ""),
        }))
        .filter((item) => item.requirementIdKey.length > 0)
        .slice(0, limit);
    type SlotTargetMappingProvenance =
        | "direct_slot_target"
        | "explicit_complementary_target"
        | "slot0_inherited_alias"
        | "generic_role_conditioned_alias"
        | "raw_must_prove_alias"
        | "fallback_alias"
        | "unmapped";
    const mapSlotTargetToCandidateRequirementKey = (rawTargetKey: string, slotIndex: number): {
        mappedRequirementIdKey: string | null;
        targetMappingStatus: "mapped" | "unmapped" | "mismatch";
        mappingProvenance: SlotTargetMappingProvenance;
    } => {
        if (!rawTargetKey) {
            return {
                mappedRequirementIdKey: null,
                targetMappingStatus: "unmapped",
                mappingProvenance: "unmapped",
            };
        }
        const direct = sorted.find((item) => item.requirementIdKey === rawTargetKey);
        if (direct) {
            return {
                mappedRequirementIdKey: rawTargetKey,
                targetMappingStatus: "mapped",
                mappingProvenance: "direct_slot_target",
            };
        }

        // Owner A guard: block non-slot-specific alias remapping for no-proof decisions.
        const fallbackAlias = sorted.find((item) => item.rawMustProveRequirementIdKey === rawTargetKey) ?? null;
        if (fallbackAlias?.requirementIdKey) {
            const slot0Target = slotTargets[0]?.requirementIdKey ?? "";
            const isSlot0Inherited = Boolean(slotIndex > 0 && fallbackAlias.requirementIdKey === slot0Target);
            return {
                mappedRequirementIdKey: null,
                targetMappingStatus: "unmapped",
                mappingProvenance: isSlot0Inherited ? "slot0_inherited_alias" : "raw_must_prove_alias",
            };
        }

        const roleConditionedAlias = sorted.find((item) => item.roleConditionedTargetKeys.includes(rawTargetKey)) ?? null;
        if (roleConditionedAlias?.requirementIdKey) {
            const slot0Target = slotTargets[0]?.requirementIdKey ?? "";
            const isSlot0Inherited = Boolean(slotIndex > 0 && roleConditionedAlias.requirementIdKey === slot0Target);
            return {
                mappedRequirementIdKey: null,
                targetMappingStatus: "unmapped",
                mappingProvenance: isSlot0Inherited ? "slot0_inherited_alias" : "generic_role_conditioned_alias",
            };
        }

        return {
            mappedRequirementIdKey: null,
            targetMappingStatus: "unmapped",
            mappingProvenance: "unmapped",
        };
    };
    const slotTargetMapping = slotTargets.map((target, slotIndex) => {
        const mapped = mapSlotTargetToCandidateRequirementKey(target.requirementIdKey, slotIndex);
        const rawTargetQualifiedProofAvailable = Boolean(
            target.requirementIdKey
            && sorted.some((item) =>
                (
                    (item.requirementIdKey === target.requirementIdKey && isDirectOrStrongSupportingProof(item))
                    || item.qualifiedRoleConditionedTargetKeys.includes(target.requirementIdKey)
                ),
            ),
        );
        const qualifiedProofAvailableForMappedTarget = Boolean(
            mapped.mappedRequirementIdKey
            && sorted.some((item) =>
                item.requirementIdKey === mapped.mappedRequirementIdKey && isDirectOrStrongSupportingProof(item),
            ),
        );
        const roleConditionedTargetQualifiedProofAvailable = Boolean(
            target.requirementIdKey
            && sorted.some((item) => item.qualifiedRoleConditionedTargetKeys.includes(target.requirementIdKey)),
        );
        return {
            slotIndex,
            assignedBuyingPoint: target.requirementLabel || target.requirementIdKey,
            rawSlotTargetKey: target.requirementIdKey,
            mappedRequirementIdKey: mapped.mappedRequirementIdKey,
            targetMappingStatus: mapped.targetMappingStatus,
            mappingProvenance: mapped.mappingProvenance,
            rawTargetQualifiedProofAvailable,
            mappedTargetQualifiedProofAvailable: qualifiedProofAvailableForMappedTarget,
            roleConditionedTargetQualifiedProofAvailable,
            qualifiedProofAvailableForMappedTarget,
        };
    });
    const slotFillDebugByIndex = new Map<number, {
        slot: "slot0" | "slot1";
        assignedBuyingPoint: string | null;
        rawSlotTargetKey: string | null;
        mappedRequirementIdKey: string | null;
        targetMappingStatus: "mapped" | "unmapped" | "mismatch";
        mappingProvenance: SlotTargetMappingProvenance;
        rawTargetQualifiedProofAvailable: boolean;
        mappedTargetQualifiedProofAvailable: boolean;
        roleConditionedTargetQualifiedProofAvailable: boolean;
        noProofOmissionBlockedByRoleConditionedTargetProof: boolean;
        qualifiedProofAvailableForMappedTarget: boolean;
        noProofOmissionUsedRawTargetFallback: boolean;
        fillPath: string;
        noProofGap: boolean;
        noProofOmittedThisSlot: boolean;
        continuedAfterPriorSlotOmission: boolean;
        noProofRouting: Array<"biggest_risk" | "quick_check" | "role_adds">;
        selectedEvidenceId: string | null;
        omissionReason?: string;
        omitted_requirement_claim_guard_applied?: boolean;
        blocked_overclaim_requirement_key?: string | null;
        original_card_source_requirement?: string | null;
        final_card_source_requirement?: string | null;
        claim_downscoped?: boolean;
        secondary_card_overclaim_blocked?: boolean;
    }>();
    const noProofOmittedSlotIndexes = new Set<number>();
    const rawTargetFallbackUsedSlotIndexes = new Set<number>();
    const roleConditionedNoProofOverrideSlotIndexes = new Set<number>();
    const nextTargetSlotIndex = (): number => selected.length + noProofOmittedSlotIndexes.size;
    const resolveSlotMapping = (slotIndex: number) => slotTargetMapping[slotIndex] ?? null;
    const markSlotOmittedForNoProof = (slotIndex: number, omissionReason: string): void => {
        if (slotIndex < 0 || slotIndex >= limit) return;
        if (noProofOmittedSlotIndexes.has(slotIndex)) return;
        noProofOmittedSlotIndexes.add(slotIndex);
        const mapping = resolveSlotMapping(slotIndex);
        slotFillDebugByIndex.set(slotIndex, {
            slot: slotIndex === 0 ? "slot0" : "slot1",
            assignedBuyingPoint: mapping?.assignedBuyingPoint ?? null,
            rawSlotTargetKey: mapping?.rawSlotTargetKey ?? null,
            mappedRequirementIdKey: mapping?.mappedRequirementIdKey ?? null,
            targetMappingStatus: mapping?.targetMappingStatus ?? "unmapped",
            mappingProvenance: mapping?.mappingProvenance ?? "unmapped",
            rawTargetQualifiedProofAvailable: Boolean(mapping?.rawTargetQualifiedProofAvailable),
            mappedTargetQualifiedProofAvailable: Boolean(mapping?.mappedTargetQualifiedProofAvailable),
            roleConditionedTargetQualifiedProofAvailable: Boolean(mapping?.roleConditionedTargetQualifiedProofAvailable),
            noProofOmissionBlockedByRoleConditionedTargetProof: roleConditionedNoProofOverrideSlotIndexes.has(slotIndex),
            qualifiedProofAvailableForMappedTarget: Boolean(mapping?.qualifiedProofAvailableForMappedTarget),
            noProofOmissionUsedRawTargetFallback: rawTargetFallbackUsedSlotIndexes.has(slotIndex),
            fillPath: "omitted_no_proof_gap",
            noProofGap: true,
            noProofOmittedThisSlot: true,
            continuedAfterPriorSlotOmission: noProofOmittedSlotIndexes.size > 1,
            noProofRouting: ["biggest_risk", "quick_check", "role_adds"],
            selectedEvidenceId: null,
            omissionReason,
        });
    };
    const shouldOmitSlotForNoProof = (slotIndex: number): boolean => {
        if (slotIndex < 0 || slotIndex >= limit) return false;
        if (noProofOmittedSlotIndexes.has(slotIndex)) return true;
        const mapping = resolveSlotMapping(slotIndex);
        if (!mapping) return false;
        const hasRoleConditionedProofForRawTarget = Boolean(
            mapping.rawSlotTargetKey
            && mapping.roleConditionedTargetQualifiedProofAvailable,
        );
        const canUseRoleConditionedRawTargetOverride = Boolean(
            slotIndex > 0 || mapping.mappedRequirementIdKey,
        );
        const hasAllowedRoleConditionedRawTargetProof = Boolean(
            hasRoleConditionedProofForRawTarget && canUseRoleConditionedRawTargetOverride,
        );
        const canUseSlot1RawTargetFallback = Boolean(
            mapping.rawSlotTargetKey
            && slotIndex > 0
            && !mapping.mappedRequirementIdKey
            && mapping.rawTargetQualifiedProofAvailable,
        );
        if (hasAllowedRoleConditionedRawTargetProof || canUseSlot1RawTargetFallback) {
            if (canUseSlot1RawTargetFallback) {
                rawTargetFallbackUsedSlotIndexes.add(slotIndex);
            } else {
                rawTargetFallbackUsedSlotIndexes.delete(slotIndex);
            }
            if (hasAllowedRoleConditionedRawTargetProof) {
                roleConditionedNoProofOverrideSlotIndexes.add(slotIndex);
            } else {
                roleConditionedNoProofOverrideSlotIndexes.delete(slotIndex);
            }
            return false;
        }
        rawTargetFallbackUsedSlotIndexes.delete(slotIndex);
        roleConditionedNoProofOverrideSlotIndexes.delete(slotIndex);
        if (!mapping.mappedRequirementIdKey) {
            markSlotOmittedForNoProof(slotIndex, "unmapped_slot_target");
            return true;
        }
        if (!mapping.qualifiedProofAvailableForMappedTarget) {
            markSlotOmittedForNoProof(slotIndex, "no_qualified_proof_for_mapped_target");
            return true;
        }
        return false;
    };
    const resolveEffectiveSlotRequirementId = (slotIndex: number): string => {
        const mapping = resolveSlotMapping(slotIndex);
        if (!mapping) return "";
        if (mapping.mappedRequirementIdKey) return mapping.mappedRequirementIdKey;
        if (
            rawTargetFallbackUsedSlotIndexes.has(slotIndex)
            && mapping.rawTargetQualifiedProofAvailable
        ) {
            return mapping.rawSlotTargetKey ?? "";
        }
        return "";
    };
    const isRawTargetFallbackSlot = (slotIndex: number): boolean => {
        const mapping = resolveSlotMapping(slotIndex);
        return Boolean(
            mapping
            && !mapping.mappedRequirementIdKey
            && rawTargetFallbackUsedSlotIndexes.has(slotIndex)
            && mapping.rawTargetQualifiedProofAvailable,
        );
    };
    const matchesSlotRequirement = (
        item: (typeof sorted)[number],
        slotIndex: number,
        slotRequirementId: string,
    ): boolean => {
        if (!slotRequirementId) return true;
        const fallbackSlot = isRawTargetFallbackSlot(slotIndex);
        if (item.requirementIdKey === slotRequirementId) {
            if (!fallbackSlot) return true;
            return isDirectOrStrongSupportingProof(item);
        }
        if (
            fallbackSlot
            && item.qualifiedRoleConditionedTargetKeys.includes(slotRequirementId)
        ) {
            return true;
        }
        return false;
    };
    const recordSlotSelection = (slotIndex: number, item: (typeof sorted)[number], fillPath: string): void => {
        const mapping = resolveSlotMapping(slotIndex);
        slotFillDebugByIndex.set(slotIndex, {
            slot: slotIndex === 0 ? "slot0" : "slot1",
            assignedBuyingPoint: mapping?.assignedBuyingPoint ?? null,
            rawSlotTargetKey: mapping?.rawSlotTargetKey ?? null,
            mappedRequirementIdKey: mapping?.mappedRequirementIdKey ?? null,
            targetMappingStatus: mapping?.targetMappingStatus ?? "unmapped",
            mappingProvenance: mapping?.mappingProvenance ?? "unmapped",
            rawTargetQualifiedProofAvailable: Boolean(mapping?.rawTargetQualifiedProofAvailable),
            mappedTargetQualifiedProofAvailable: Boolean(mapping?.mappedTargetQualifiedProofAvailable),
            roleConditionedTargetQualifiedProofAvailable: Boolean(mapping?.roleConditionedTargetQualifiedProofAvailable),
            noProofOmissionBlockedByRoleConditionedTargetProof: roleConditionedNoProofOverrideSlotIndexes.has(slotIndex),
            qualifiedProofAvailableForMappedTarget: Boolean(mapping?.qualifiedProofAvailableForMappedTarget),
            noProofOmissionUsedRawTargetFallback: rawTargetFallbackUsedSlotIndexes.has(slotIndex),
            fillPath,
            noProofGap: false,
            noProofOmittedThisSlot: false,
            continuedAfterPriorSlotOmission: noProofOmittedSlotIndexes.size > 0,
            noProofRouting: [],
            selectedEvidenceId: item.card.evidence_id,
        });
    };
    const canSelectCard = (item: (typeof sorted)[number]): boolean => {
        const requirementId = normalizeSuppressionCluster(item.card.source_requirement.requirement_id ?? "");
        if (requirementId && usedRequirementIds.has(requirementId) && sorted.length > limit) return false;
        const translationAlreadySelected = selected.some((entry) => entry.translationHeavy);
        if (leadershipStoryMode && item.translationHeavy && translationAlreadySelected && sorted.length > limit) return false;
        return true;
    };
    if (sorted.length > 0) {
        const resolveBaselineFirstSlotCandidate = (): (typeof sorted)[number] | null => (
            sorted.find((item) => item.mustProveAligned && item.primaryLaneViable && canSelectCard(item))
            ?? sorted.find((item) => item.mustProveAligned && canSelectCard(item))
            ?? (enforcePrimarySlotFamily
                ? sorted.find((item) => item.primaryAligned && item.primaryLaneViable && canSelectCard(item))
                : null)
            ?? (enforcePrimarySlotFamily
                ? sorted.find((item) => item.primaryAligned && canSelectCard(item))
                : null)
            ?? sorted.find((item) => canSelectCard(item))
            ?? sorted[0]
            ?? null
        );
        const coverageQualityFirstSlot = (() => {
            const baselineFirstSlot = resolveBaselineFirstSlotCandidate();
            const activeRequirementId = baselineFirstSlot?.requirementIdKey ?? "";
            if (!activeRequirementId) return null;
            const activeLaneCandidates = sorted.filter((item) => item.requirementIdKey === activeRequirementId);
            const hasControlSafeCoveragePreferred = activeLaneCandidates.some((item) =>
                isControlSafeCoveragePreferred(item, activeRequirementId),
            );
            if (!hasControlSafeCoveragePreferred) return null;
            const firstCoveredDirect = activeLaneCandidates.find((item) =>
                isControlSafeCoveragePreferred(item, activeRequirementId)
                && canSelectCard(item),
            ) ?? null;
            if (firstCoveredDirect) {
                const firstCoveredDirectLaneScore = laneViabilityScore(firstCoveredDirect);
                const strongerLaneCompetitor = activeLaneCandidates.find((item) => (
                    item !== firstCoveredDirect
                    && canSelectCard(item)
                    && item.mustProveAligned
                    && (item.primaryLaneViable || item.primaryAligned)
                    && !isWeakAdjacentNoCoverage(item)
                    && laneViabilityScore(item) > firstCoveredDirectLaneScore
                )) ?? null;
                if (strongerLaneCompetitor) return strongerLaneCompetitor;
                return firstCoveredDirect;
            }
            const reordered = [...sorted].sort((left, right) => {
                const leftInActiveLane = left.requirementIdKey === activeRequirementId;
                const rightInActiveLane = right.requirementIdKey === activeRequirementId;
                if (leftInActiveLane && rightInActiveLane) {
                    const leftWeak = isWeakAdjacentNoCoverage(left);
                    const rightWeak = isWeakAdjacentNoCoverage(right);
                    if (leftWeak !== rightWeak) return leftWeak ? 1 : -1;
                }
                return 0;
            });
            return reordered.find((item) => item.mustProveAligned && canSelectCard(item))
                ?? reordered.find((item) => canSelectCard(item))
                ?? null;
        })();
        const firstSlotSearchOrder = (() => {
            const baselineFirstSlot = resolveBaselineFirstSlotCandidate();
            const activeRequirementId = baselineFirstSlot?.requirementIdKey ?? "";
            if (!activeRequirementId) return sorted;
            const activeLaneCandidates = sorted.filter((item) => item.requirementIdKey === activeRequirementId);
            const hasControlSafeCoveragePreferred = activeLaneCandidates.some((item) =>
                isControlSafeCoveragePreferred(item, activeRequirementId),
            );
            if (!hasControlSafeCoveragePreferred) return sorted;
            return [...sorted].sort((left, right) => {
                const leftInActiveLane = left.requirementIdKey === activeRequirementId;
                const rightInActiveLane = right.requirementIdKey === activeRequirementId;
                if (leftInActiveLane && rightInActiveLane) {
                    const leftWeak = isWeakAdjacentNoCoverage(left);
                    const rightWeak = isWeakAdjacentNoCoverage(right);
                    if (leftWeak !== rightWeak) return leftWeak ? 1 : -1;
                }
                return 0;
            });
        })();
        const firstSlotPreferred = coverageQualityFirstSlot
            ?? firstSlotSearchOrder.find((item) => item.mustProveAligned && item.primaryLaneViable && canSelectCard(item))
            ?? firstSlotSearchOrder.find((item) => item.mustProveAligned && canSelectCard(item))
            ?? (enforcePrimarySlotFamily
                ? firstSlotSearchOrder.find((item) => item.primaryAligned && item.primaryLaneViable && canSelectCard(item))
                : null)
            ?? (enforcePrimarySlotFamily
                ? firstSlotSearchOrder.find((item) => item.primaryAligned && canSelectCard(item))
                : null);
        const slotIndex = nextTargetSlotIndex();
        const shouldOmitFirstSlot = shouldOmitSlotForNoProof(slotIndex);
        const slotRequirementId = resolveEffectiveSlotRequirementId(slotIndex);
        const firstSlotCandidate = firstSlotPreferred;
        const firstSlotRequirementMatchRequired = Boolean(
            firstSlotCandidate
            && slotRequirementId
            && isRawTargetFallbackSlot(slotIndex),
        );
        if (
            firstSlotCandidate
            && !shouldOmitFirstSlot
            && (
                !firstSlotRequirementMatchRequired
                || matchesSlotRequirement(firstSlotCandidate, slotIndex, slotRequirementId)
            )
        ) {
            selected.push(firstSlotCandidate);
            const requirementId = normalizeSuppressionCluster(firstSlotCandidate.card.source_requirement.requirement_id ?? "");
            if (requirementId) usedRequirementIds.add(requirementId);
            recordSlotSelection(
                slotIndex,
                firstSlotCandidate,
                isDirectOrStrongSupportingProof(firstSlotCandidate) ? "qualified_proof_pool" : "adjacent_contextual_fallback",
            );
        }
    }
    for (const item of sorted) {
        while (selected.length + noProofOmittedSlotIndexes.size < limit && shouldOmitSlotForNoProof(nextTargetSlotIndex())) {
            // Keep slot positions stable for no-proof routing. Continue to evaluate later slots.
        }
        if (selected.length + noProofOmittedSlotIndexes.size >= limit) break;
        if (selected.includes(item)) continue;
        if (!canSelectCard(item)) continue;
        const slotIndex = nextTargetSlotIndex();
        const slotMapping = resolveSlotMapping(slotIndex);
        const slotRequirementId = resolveEffectiveSlotRequirementId(slotIndex);
        if (slotRequirementId && !matchesSlotRequirement(item, slotIndex, slotRequirementId)) continue;
        if (
            slotRequirementId
            && slotMapping?.qualifiedProofAvailableForMappedTarget
            && isWeakAdjacentNoCoverage(item)
            && item.requirementIdKey !== slotRequirementId
        ) {
            continue;
        }
        selected.push(item);
        const requirementId = normalizeSuppressionCluster(item.card.source_requirement.requirement_id ?? "");
        if (requirementId) usedRequirementIds.add(requirementId);
        recordSlotSelection(
            slotIndex,
            item,
            isDirectOrStrongSupportingProof(item) ? "qualified_proof_pool" : "adjacent_contextual_fallback",
        );
    }
    if (selected.length + noProofOmittedSlotIndexes.size < Math.min(limit, sorted.length)) {
        for (const item of sorted) {
            if (selected.length + noProofOmittedSlotIndexes.size >= limit) break;
            if (selected.includes(item)) continue;
            const slotIndex = nextTargetSlotIndex();
            if (shouldOmitSlotForNoProof(slotIndex)) {
                continue;
            }
            const slotMapping = resolveSlotMapping(slotIndex);
            const slotRequirementId = resolveEffectiveSlotRequirementId(slotIndex);
            if (slotRequirementId && !matchesSlotRequirement(item, slotIndex, slotRequirementId)) continue;
            if (
                slotRequirementId
                && slotMapping?.qualifiedProofAvailableForMappedTarget
                && isWeakAdjacentNoCoverage(item)
                && item.requirementIdKey !== slotRequirementId
            ) {
                continue;
            }
            selected.push(item);
            recordSlotSelection(
                slotIndex,
                item,
                isDirectOrStrongSupportingProof(item) ? "dedupe_backfill" : "adjacent_contextual_fallback",
            );
            if (selected.length >= limit) break;
        }
    }

    const omittedNoProofRequirementKeys = new Set<string>();
    for (const slotDebug of slotFillDebugByIndex.values()) {
        if (!slotDebug.noProofGap) continue;
        if (!slotDebug.mappedRequirementIdKey) continue;
        if (
            slotDebug.omissionReason === "no_qualified_proof_for_mapped_target"
            || slotDebug.omissionReason === "unmapped_slot_target"
        ) {
            omittedNoProofRequirementKeys.add(slotDebug.mappedRequirementIdKey);
        }
    }
    const requirementLabelByKey = (requirementIdKey: string): string => {
        const normalizedKey = normalizeSuppressionCluster(requirementIdKey);
        if (!normalizedKey) return "";
        return normalizeRoleContextPhrase(
            mustProveById.get(normalizedKey)?.requirement_label
            || requirementClusterById.get(normalizedKey)?.display_name
            || "",
        );
    };
    const roleRelevanceSeen = new Set<string>();
    const cards = selected.slice(0, limit).map((item, index) => {
        const normalizedRelevance = normalizeText(item.card.role_relevance);
        let roleRelevance = item.card.role_relevance;
        if (normalizedRelevance && roleRelevanceSeen.has(normalizedRelevance)) {
            const headlineContext = sanitizeWhyYouHeadlineCandidate(item.card.headline).toLowerCase();
            roleRelevance = headlineContext
                ? `Adds complementary proof through ${headlineContext}.`
                : "Adds complementary role-relevant proof for this hiring case.";
        }
        if (normalizedRelevance) roleRelevanceSeen.add(normalizedRelevance);
        const resolvedSlotIndex = Array.from(slotFillDebugByIndex.entries())
            .find((entry) => entry[1].selectedEvidenceId === item.card.evidence_id)?.[0] ?? index;
        const slotDebug = slotFillDebugByIndex.get(resolvedSlotIndex);
        const originalSourceRequirementKey = normalizeSuppressionCluster(
            item.card.source_requirement.requirement_id ?? "",
        );
        let finalSourceRequirementKey = originalSourceRequirementKey;
        let sourceRequirement = item.card.source_requirement;
        let slotTargetDebug = slotDebug ? { ...slotDebug } : undefined;
        const blockedOmittedRequirementClaim = Boolean(
            originalSourceRequirementKey
            && omittedNoProofRequirementKeys.has(originalSourceRequirementKey)
            && !(slotDebug?.noProofGap ?? false),
        );
        if (blockedOmittedRequirementClaim) {
            const mappedRequirementKey = normalizeSuppressionCluster(slotDebug?.mappedRequirementIdKey ?? "");
            const rawRequirementKey = normalizeSuppressionCluster(slotDebug?.rawSlotTargetKey ?? "");
            const scopedRequirementKey = (
                (mappedRequirementKey && !omittedNoProofRequirementKeys.has(mappedRequirementKey) && mappedRequirementKey)
                || (rawRequirementKey && !omittedNoProofRequirementKeys.has(rawRequirementKey) && rawRequirementKey)
                || ""
            );
            finalSourceRequirementKey = scopedRequirementKey;
            if (scopedRequirementKey) {
                const scopedRequirementLabel = requirementLabelByKey(scopedRequirementKey) || slotDebug?.assignedBuyingPoint || "";
                sourceRequirement = {
                    requirement_id: scopedRequirementKey,
                    requirement_label: scopedRequirementLabel || undefined,
                    buying_point: scopedRequirementLabel || undefined,
                };
                if (scopedRequirementLabel) {
                    roleRelevance = `Supports ${scopedRequirementLabel.toLowerCase()} through adjacent contextual evidence.`;
                } else {
                    roleRelevance = "Adds complementary role-relevant proof without asserting omitted requirement coverage.";
                }
            } else {
                sourceRequirement = {
                    requirement_id: undefined,
                    requirement_label: undefined,
                    buying_point: slotDebug?.assignedBuyingPoint ?? undefined,
                };
                roleRelevance = "Adds complementary role-relevant proof without asserting omitted requirement coverage.";
            }
            if (slotTargetDebug) {
                slotTargetDebug = {
                    ...slotTargetDebug,
                    omitted_requirement_claim_guard_applied: true,
                    blocked_overclaim_requirement_key: originalSourceRequirementKey,
                    original_card_source_requirement: originalSourceRequirementKey || null,
                    final_card_source_requirement: finalSourceRequirementKey || null,
                    claim_downscoped: true,
                    secondary_card_overclaim_blocked: true,
                };
            }
        }
        return {
            ...item.card,
            source_requirement: sourceRequirement,
            slot_target_debug: slotTargetDebug,
            role_relevance: roleRelevance,
            display_priority: index + 1,
        };
    });
    const toSlotDiagnosticsItem = (slotIndex: number): AuthoritativeWhyYouSlotDiagnosticsItem => {
        const slotDebug = slotFillDebugByIndex.get(slotIndex) ?? null;
        const slotMapping = resolveSlotMapping(slotIndex);
        const selectedEvidenceId = slotDebug?.selectedEvidenceId ?? null;
        return {
            card_emitted: Boolean(selectedEvidenceId),
            selected_evidence_id: selectedEvidenceId,
            assigned_buying_point: slotDebug?.assignedBuyingPoint
                ?? slotMapping?.assignedBuyingPoint
                ?? null,
            raw_slot_target_key: slotDebug?.rawSlotTargetKey
                ?? slotMapping?.rawSlotTargetKey
                ?? null,
            mapped_requirement_id_key: slotDebug?.mappedRequirementIdKey
                ?? slotMapping?.mappedRequirementIdKey
                ?? null,
            target_mapping_status: slotDebug?.targetMappingStatus
                ?? slotMapping?.targetMappingStatus
                ?? null,
            raw_target_qualified_proof_available: slotDebug?.rawTargetQualifiedProofAvailable
                ?? slotMapping?.rawTargetQualifiedProofAvailable
                ?? null,
            mapped_target_qualified_proof_available: slotDebug?.mappedTargetQualifiedProofAvailable
                ?? slotMapping?.mappedTargetQualifiedProofAvailable
                ?? null,
            role_conditioned_target_qualified_proof_available: slotDebug?.roleConditionedTargetQualifiedProofAvailable
                ?? slotMapping?.roleConditionedTargetQualifiedProofAvailable
                ?? null,
            no_proof_omission_blocked_by_role_conditioned_target_proof: slotDebug?.noProofOmissionBlockedByRoleConditionedTargetProof
                ?? roleConditionedNoProofOverrideSlotIndexes.has(slotIndex),
            no_proof_gap: Boolean(slotDebug?.noProofGap),
            omission_reason: slotDebug?.omissionReason ?? null,
            fill_path: slotDebug?.fillPath ?? null,
            no_proof_routing: slotDebug?.noProofRouting ?? [],
        };
    };
    return {
        cards,
        why_you_slot_diagnostics: {
            slot0: toSlotDiagnosticsItem(0),
            slot1: toSlotDiagnosticsItem(1),
        },
    };
}

const BROAD_TRANSFERABLE_CLUSTER_HINTS = new Set([
    "stakeholder_embedding",
    "analytics_translation_storytelling",
    "insight_generation_reporting",
    "commercial_analytics",
    "decision_support",
]);
