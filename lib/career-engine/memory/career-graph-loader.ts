import { createServerSupabaseClient } from "@/lib/db/supabase/server";

export type Career = {
    id: string;
    user_id: string;
    headline: string | null;
    summary: string | null;
    total_years_experience: number | null;
    active_resume_id?: string | null;
    created_at: string;
    updated_at: string;
};

export type Experience = {
    id: string;
    career_id: string;
    company: string;
    title: string;
    date_range: string;
    location: string | null;
    summary: string | null;
    source_type: "resume" | "linkedin" | "manual" | null;
    sort_order: number | null;
    resume_id?: string | null;
    source_revision_sha256?: string | null;
    source_role_ref?: string | null;
    materialization_version?: string | null;
    created_at: string;
    updated_at: string;
};

export type EvidencePiece = {
    id: string;
    career_id: string;
    experience_id: string;
    company: string;
    role: string;
    date_range: string;
    raw_text: string;
    source_type: "resume_bullet" | "linkedin" | "manual" | "interview" | "resume" | "imported_doc" | "quick_check" | null;
    summary?: string | null;
    action?: string | null;
    impact?: string | null;
    stakeholders?: string[] | null;
    tools_methods?: string[] | null;
    business_context?: string | null;
    org_scope?: "team" | "department" | "cross_functional" | "enterprise" | null;
    stakeholder_scope?: "internal" | "cross_team" | "executive" | "external" | null;
    leadership_scope?: "individual_contribution" | "technical_lead" | "team_lead" | "program_lead" | "org_lead" | null;
    delivery_level?: "task" | "project" | "product" | "program" | "platform" | null;
    impact_scale?: "small" | "medium" | "large" | "enterprise" | null;
    impact_type?: "revenue" | "cost" | "operational" | "strategic" | null;
    confidence_level?: "low" | "medium" | "high" | null;
    inferred_scale?: Record<string, unknown> | null;
    inferred_scope?: Record<string, unknown> | null;
    confidence?: number | null;
    missing_fields?: string[] | null;
    memory_status?: "candidate" | "confirmed" | "promoted" | "deprecated" | null;
    evidence_authority_scope?: "single_job" | "role_family" | "global_user" | null;
    resume_id?: string | null;
    source_revision_sha256?: string | null;
    source_role_ref?: string | null;
    source_unit_id?: string | null;
    source_unit_ref?: string | null;
    source_unit_sha256?: string | null;
    source_quote?: string | null;
    source_span_start?: number | null;
    source_span_end?: number | null;
    atomic_index?: number | null;
    atomic_statement?: string | null;
    context?: string | null;
    outcome?: string | null;
    source_supported_metrics?: string[] | null;
    extraction_confidence?: number | null;
    provider?: string | null;
    provider_model?: string | null;
    provider_version?: string | null;
    review_status?: "machine_validated" | "needs_review" | "confirmed" | "rejected" | null;
    sort_order: number | null;
    created_at: string;
    updated_at: string;
};

type EvidencePieceRow = {
    id: string;
    experience_id: string;
    career_id: string;
    company: string | null;
    role: string | null;
    date_range: string | null;
    raw_text: string;
    source_type: "resume_bullet" | "linkedin" | "manual" | "interview" | "resume" | "imported_doc" | "quick_check" | null;
    summary: string | null;
    action: string | null;
    impact: string | null;
    stakeholders: string[] | null;
    tools_methods: string[] | null;
    business_context: string | null;
    impact_type: "revenue" | "cost" | "operational" | "strategic" | null;
    inferred_scale: Record<string, unknown> | null;
    inferred_scope: Record<string, unknown> | null;
    confidence: number | null;
    missing_fields: string[] | null;
    resume_id: string | null;
    source_revision_sha256: string | null;
    source_role_ref: string | null;
    source_unit_id: string | null;
    source_unit_ref: string | null;
    source_unit_sha256: string | null;
    source_quote: string | null;
    source_span_start: number | null;
    source_span_end: number | null;
    atomic_index: number | null;
    atomic_statement: string | null;
    context: string | null;
    outcome: string | null;
    source_supported_metrics: unknown;
    extraction_confidence: number | null;
    provider: string | null;
    provider_model: string | null;
    provider_version: string | null;
    review_status: "machine_validated" | "needs_review" | "confirmed" | "rejected" | null;
};

export type EvidenceSignal = {
    id: string;
    career_id: string;
    evidence_piece_id: string;
    action: string | null;
    domain: string | null;
    initiative_type: string | null;
    scope_level: "task" | "project" | "team" | "function" | "enterprise" | "market" | null;
    ownership_level: "contributor" | "driver" | "owner" | "lead" | null;
    stakeholder_scope: string[];
    tool_signals: string[];
    capability_hints: string[];
    team_signal: string | null;
    impact_signal: string | null;
    confidence_score: number | null;
    created_at: string;
    updated_at: string;
};

type EvidenceSignalRow = {
    id: string;
    career_id: string;
    evidence_piece_id: string;
    action: string | null;
    domain: string | null;
    initiative_type: string | null;
    scope_level: "task" | "project" | "team" | "function" | "enterprise" | "market" | null;
    ownership_level: "contributor" | "driver" | "owner" | "lead" | null;
    stakeholder_scope: unknown;
    tool_signals: unknown;
    capability_hints: unknown;
    team_signal: string | null;
    impact_signal: string | null;
    confidence_score: number | null;
    created_at: string;
    updated_at: string;
};

export type Capability = {
    id: string;
    career_id: string;
    name: string;
    normalized_name: string;
    canonical_name?: string | null;
    display_name?: string | null;
    scope_summary?: string | null;
    ownership_summary?: string | null;
    impact_summary?: string | null;
    confidence: number | null;
    confidence_score?: number | null;
    strength: number | null;
    evidence_count?: number | null;
    evidence_signal_count?: number | null;
    supporting_evidence_ids?: string[] | null;
    context_domains?: string[] | null;
    scale_summary?: Record<string, unknown> | null;
    confidence_level?: "low" | "medium" | "high" | null;
    created_at: string;
    updated_at: string;
};

export type CapabilityEvidenceLink = {
    capability_id: string;
    evidence_piece_id: string;
    link_strength: number | null;
    created_at: string;
};

export type CapabilitySignalLink = {
    id: string;
    capability_id: string;
    evidence_signal_id: string;
    contribution_weight: number | null;
    rationale: string | null;
    created_at: string;
};

export type CareerGoalSignal = {
    id: string;
    profile_id: string;
    signal_type: "target_path" | "avoid_path" | "priority" | "constraint" | "preference";
    label: string;
    description: string | null;
    strength: "low" | "medium" | "high";
    confidence: "explicit" | "inferred" | "weak_inferred";
    source: "quick_check" | "user_answer" | "saved_role" | "cv_angle_selected" | "manual_profile";
    source_ref_id: string | null;
    status: "active" | "stale" | "rejected";
    created_at: string;
    updated_at: string;
};

type CareerGoalSignalRow = {
    id: string;
    profile_id: string;
    signal_type: string;
    label: string | null;
    description: string | null;
    strength: string | null;
    confidence: string | null;
    source: string | null;
    source_ref_id: string | null;
    status: string | null;
    created_at: string;
    updated_at: string;
};

export type CareerGraph = {
    career: Career | null;
    experiences: Experience[];
    evidencePieces: EvidencePiece[];
    evidenceSignals?: EvidenceSignal[];
    capabilities: Capability[];
    capabilityEvidenceLinks: CapabilityEvidenceLink[];
    capabilitySignalLinks?: CapabilitySignalLink[];
    careerGoalSignals?: CareerGoalSignal[];
    evidenceByExperience: Record<string, EvidencePiece[]>;
    signalsByEvidencePiece?: Record<string, EvidenceSignal[]>;
    signalsByCapability?: Record<string, EvidenceSignal[]>;
    capabilitiesBySignal?: Record<string, Capability[]>;
    capabilitiesByEvidence: Record<string, Capability[]>;
    evidenceByCapability: Record<string, EvidencePiece[]>;
    evidenceByCapabilityViaSignals?: Record<string, EvidencePiece[]>;
};

export type CareerGraphSchemaMode = "canonical" | "legacy_compatibility";

export const DEFAULT_CAREER_GRAPH_SCHEMA_MODE: CareerGraphSchemaMode = "canonical";

export type LoadCareerGraphOptions = {
    schemaMode?: CareerGraphSchemaMode;
};

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}

function pushUniqueById<T extends { id: string }>(record: Record<string, T[]>, key: string, item: T): void {
    const bucket = record[key] ?? [];
    if (!bucket.some((entry) => entry.id === item.id)) {
        bucket.push(item);
    }
    record[key] = bucket;
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const maybeError = error as { code?: string; message?: string };
    return maybeError.code === "42P01" || maybeError.code === "PGRST205" || /relation .* does not exist/i.test(maybeError.message ?? "");
}

export async function loadWithStablePublicationToken<T>(
    readToken: () => Promise<string>,
    loadOnce: () => Promise<T>,
    maxAttempts = 3,
): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const before = await readToken();
        const value = await loadOnce();
        const after = await readToken();
        if (before === after) return value;
    }
    throw new Error("Career graph publication changed during every bounded read attempt");
}

async function readCareerGraphPublicationToken(profileId: string): Promise<string> {
    const supabase = createServerSupabaseClient();
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", profileId)
        .single();
    if (profileError) throw new Error(`Failed to load profile publication token: ${profileError.message}`);
    const userId = profile?.user_id ?? profileId;
    const { data: careers, error: careerError } = await supabase
        .from("careers")
        .select("id, active_resume_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
    if (careerError) throw new Error(`Failed to load career publication token: ${careerError.message}`);
    const career = careers?.[0];
    if (!career) return `${userId}:no-career`;
    if (!career.active_resume_id) return `${career.id}:no-active-resume`;
    const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .select("id, content_sha256, materialization_status, materialized_at")
        .eq("id", career.active_resume_id)
        .single();
    if (resumeError) throw new Error(`Failed to load resume publication token: ${resumeError.message}`);
    return [career.id, resume.id, resume.content_sha256, resume.materialization_status, resume.materialized_at].join(":");
}

async function loadCareerGraphOnce(profileId: string, options: LoadCareerGraphOptions = {}): Promise<CareerGraph> {
    if (!profileId || profileId.trim().length === 0) {
        throw new Error("profileId is required");
    }

    const supabase = createServerSupabaseClient();
    const schemaMode = options.schemaMode ?? DEFAULT_CAREER_GRAPH_SCHEMA_MODE;
    const evidenceSelectExpanded = [
        "id", "experience_id", "career_id", "company", "role", "date_range", "raw_text", "source_type",
        "summary", "action", "impact", "stakeholders", "tools_methods", "business_context",
        "impact_type", "inferred_scale", "inferred_scope", "confidence", "missing_fields",
        "resume_id", "source_revision_sha256", "source_role_ref",
        "source_unit_id", "source_unit_ref", "source_unit_sha256", "source_quote", "source_span_start", "source_span_end",
        "atomic_index", "atomic_statement", "context", "outcome", "source_supported_metrics", "extraction_confidence",
        "provider", "provider_model", "provider_version", "review_status",
    ].join(", ");
    const evidenceSelectExpandedNoBusinessContext = [
        "id", "experience_id", "career_id", "company", "role", "date_range", "raw_text", "source_type",
        "summary", "action", "impact", "stakeholders", "tools_methods",
        "impact_type", "inferred_scale", "inferred_scope", "confidence", "missing_fields",
        "resume_id", "source_revision_sha256", "source_role_ref",
        "source_unit_id", "source_unit_ref", "source_unit_sha256", "source_quote", "source_span_start", "source_span_end",
        "atomic_index", "atomic_statement", "context", "outcome", "source_supported_metrics", "extraction_confidence",
        "provider", "provider_model", "provider_version", "review_status",
    ].join(", ");
    const evidenceSelectLegacy = "id, experience_id, career_id, raw_text, source_type";

    const capabilitySelectExpanded = [
        "id", "career_id", "name", "normalized_name", "canonical_name", "display_name", "scope_summary",
        "ownership_summary", "impact_summary", "confidence", "confidence_score", "strength",
        "evidence_count", "evidence_signal_count", "supporting_evidence_ids", "context_domains",
        "scale_summary", "confidence_level", "created_at", "updated_at",
    ].join(", ");
    const capabilitySelectLegacy = "id, career_id, name, normalized_name, confidence, strength, created_at, updated_at";

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", profileId)
        .single();

    if (profileError) {
        throw new Error(`Failed to load profile for career graph: ${profileError.message}`);
    }

    const userId = profile?.user_id ?? profileId;
    const { data: careers, error: careerError } = await supabase
        .from("careers")
        .select("id, user_id, headline, summary, total_years_experience, active_resume_id, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (careerError) {
        throw new Error(`Failed to load career for career graph: ${careerError.message}`);
    }

    const career = careers?.[0] ?? null;
    if (!career) {
        return {
            career: null,
            experiences: [],
            evidencePieces: [],
            evidenceSignals: [],
            capabilities: [],
            capabilityEvidenceLinks: [],
            capabilitySignalLinks: [],
            careerGoalSignals: [],
            evidenceByExperience: {},
            signalsByEvidencePiece: {},
            signalsByCapability: {},
            capabilitiesBySignal: {},
            capabilitiesByEvidence: {},
            evidenceByCapability: {},
            evidenceByCapabilityViaSignals: {},
        };
    }

    const experienceQuery = supabase
            .from("experiences")
            .select("id, career_id, company, title, date_range, location, summary, source_type, sort_order, resume_id, source_revision_sha256, source_role_ref, materialization_version, created_at, updated_at")
            .eq("career_id", career.id);
    const activeExperienceQuery = career.active_resume_id
        ? experienceQuery.eq("resume_id", career.active_resume_id)
        : experienceQuery;
    const evidenceQuery = supabase
            .from("evidence_pieces")
            .select(evidenceSelectExpanded)
            .eq("career_id", career.id);
    const activeEvidenceQuery = career.active_resume_id
        ? evidenceQuery.eq("resume_id", career.active_resume_id)
        : evidenceQuery;

    const [experiencesResult, capabilitiesExpandedResult, evidenceExpandedResult, evidenceSignalsResult, careerGoalSignalsResult] = await Promise.all([
        activeExperienceQuery.order("sort_order", { ascending: true }),
        supabase
            .from("capabilities")
            .select(capabilitySelectExpanded)
            .eq("career_id", career.id)
            .order("created_at", { ascending: true }),
        activeEvidenceQuery.order("id", { ascending: true }),
        supabase
            .from("evidence_signals")
            .select("id, career_id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, capability_hints, team_signal, impact_signal, confidence_score, created_at, updated_at")
            .eq("career_id", career.id)
            .order("created_at", { ascending: true }),
        supabase
            .from("career_goal_signals")
            .select("id, profile_id, signal_type, label, description, strength, confidence, source, source_ref_id, status, created_at, updated_at")
            .eq("profile_id", profile.id)
            .order("updated_at", { ascending: false }),
    ]);

    if (experiencesResult.error) {
        throw new Error(`Failed to load experiences for career graph: ${experiencesResult.error.message}`);
    }

    let capabilitiesData: Capability[] = [];
    if (capabilitiesExpandedResult.error) {
        if (schemaMode === "canonical") {
            throw new Error(`Canonical capabilities query failed: ${capabilitiesExpandedResult.error.message}`);
        }
        const capabilitiesLegacyResult = await supabase
            .from("capabilities")
            .select(capabilitySelectLegacy)
            .eq("career_id", career.id)
            .order("created_at", { ascending: true });
        if (capabilitiesLegacyResult.error) {
            throw new Error(`Failed to load capabilities for career graph: ${capabilitiesLegacyResult.error.message}`);
        }
        capabilitiesData = (capabilitiesLegacyResult.data ?? []) as unknown as Capability[];
    } else {
        capabilitiesData = (capabilitiesExpandedResult.data ?? []) as unknown as Capability[];
    }

    let evidenceRows: EvidencePieceRow[] = [];
    if (evidenceExpandedResult.error) {
        if (schemaMode === "canonical") {
            throw new Error(`Canonical evidence_pieces query failed: ${evidenceExpandedResult.error.message}`);
        }
        const expandedNoBusinessContextQuery = supabase
            .from("evidence_pieces")
            .select(evidenceSelectExpandedNoBusinessContext)
            .eq("career_id", career.id);
        const expandedNoBusinessContextResult = await (career.active_resume_id
            ? expandedNoBusinessContextQuery.eq("resume_id", career.active_resume_id)
            : expandedNoBusinessContextQuery).order("id", { ascending: true });

        if (!expandedNoBusinessContextResult.error) {
            evidenceRows = ((expandedNoBusinessContextResult.data ?? []) as unknown as Array<Omit<EvidencePieceRow, "business_context">>)
                .map((row) => ({
                    ...row,
                    business_context: null,
                }));
        } else {
            const legacyEvidenceQuery = supabase
                .from("evidence_pieces")
                .select(evidenceSelectLegacy)
                .eq("career_id", career.id);
            const legacyEvidenceResult = await (career.active_resume_id
                ? legacyEvidenceQuery.eq("resume_id", career.active_resume_id)
                : legacyEvidenceQuery).order("id", { ascending: true });
            if (legacyEvidenceResult.error) {
                throw new Error(`Failed to load evidence_pieces for career graph: ${legacyEvidenceResult.error.message}`);
            }
            evidenceRows = ((legacyEvidenceResult.data ?? []) as Array<{
                id: string;
                experience_id: string;
                career_id: string;
                raw_text: string;
                source_type: "resume_bullet" | "linkedin" | "manual" | "interview" | "resume" | "imported_doc" | "quick_check" | null;
            }>).map((row) => ({
                ...row,
                company: null,
                role: null,
                date_range: null,
                summary: null,
                action: null,
                impact: null,
                stakeholders: null,
                tools_methods: null,
                business_context: null,
                impact_type: null,
                inferred_scale: null,
                inferred_scope: null,
                confidence: null,
                missing_fields: null,
                resume_id: null,
                source_revision_sha256: null,
                source_role_ref: null,
                source_unit_id: null,
                source_unit_ref: null,
                source_unit_sha256: null,
                source_quote: null,
                source_span_start: null,
                source_span_end: null,
                atomic_index: null,
                atomic_statement: null,
                context: null,
                outcome: null,
                source_supported_metrics: [],
                extraction_confidence: null,
                provider: null,
                provider_model: null,
                provider_version: null,
                review_status: null,
            }));
        }
    } else {
        evidenceRows = (evidenceExpandedResult.data ?? []) as unknown as EvidencePieceRow[];
    }

    let evidenceSignalRows: EvidenceSignalRow[] = [];
    if (!evidenceSignalsResult.error) {
        evidenceSignalRows = (evidenceSignalsResult.data ?? []) as EvidenceSignalRow[];
    } else if (!isMissingRelationError(evidenceSignalsResult.error)) {
        throw new Error(`Failed to load evidence_signals for career graph: ${evidenceSignalsResult.error.message}`);
    }
    if (career.active_resume_id) {
        const activeEvidenceIds = new Set(evidenceRows.map((row) => row.id));
        evidenceSignalRows = evidenceSignalRows.filter((row) => activeEvidenceIds.has(row.evidence_piece_id));
    }

    let careerGoalSignalRows: CareerGoalSignalRow[] = [];
    if (!careerGoalSignalsResult.error) {
        careerGoalSignalRows = (careerGoalSignalsResult.data ?? []) as CareerGoalSignalRow[];
    } else if (!isMissingRelationError(careerGoalSignalsResult.error)) {
        throw new Error(`Failed to load career_goal_signals for career graph: ${careerGoalSignalsResult.error.message}`);
    }

    const capabilityIds = capabilitiesData.map((capability) => capability.id);
    // canonical capability traceability: capability_signal_links.
    // capability_evidence_links is legacy compatibility-only.
    const [capabilitySignalLinksResult, capabilityEvidenceLinksResult] = await Promise.all([
        capabilityIds.length > 0
            ? supabase
                .from("capability_signal_links")
                .select("id, capability_id, evidence_signal_id, contribution_weight, rationale, created_at")
                .in("capability_id", capabilityIds)
            : Promise.resolve({ data: [], error: null }),
        capabilityIds.length > 0
            ? supabase
                .from("capability_evidence_links")
                .select("capability_id, evidence_piece_id, link_strength, created_at")
                .in("capability_id", capabilityIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    let resolvedCapabilitySignalLinks: CapabilitySignalLink[] = [];
    if (!capabilitySignalLinksResult.error) {
        resolvedCapabilitySignalLinks = (capabilitySignalLinksResult.data ?? []) as CapabilitySignalLink[];
    } else if (!isMissingRelationError(capabilitySignalLinksResult.error)) {
        throw new Error(`Failed to load capability_signal_links for career graph: ${capabilitySignalLinksResult.error.message}`);
    }

    let resolvedCapabilityEvidenceLinks: CapabilityEvidenceLink[] = [];
    if (!capabilityEvidenceLinksResult.error) {
        resolvedCapabilityEvidenceLinks = (capabilityEvidenceLinksResult.data ?? []) as CapabilityEvidenceLink[];
    } else if (!isMissingRelationError(capabilityEvidenceLinksResult.error)) {
        throw new Error(`Failed to load capability_evidence_links for career graph: ${capabilityEvidenceLinksResult.error.message}`);
    }

    const resolvedExperiences = (experiencesResult.data ?? []) as Experience[];
    const experiencesById = new Map<string, Experience>(resolvedExperiences.map((experience) => [experience.id, experience]));

    const resolvedEvidencePieces: EvidencePiece[] = evidenceRows.map((row, index) => {
        const experience = experiencesById.get(row.experience_id);
        return {
            id: row.id,
            career_id: row.career_id,
            experience_id: row.experience_id,
            company: row.company ?? experience?.company ?? "Unknown company",
            role: row.role ?? experience?.title ?? "Unknown role",
            date_range: row.date_range ?? experience?.date_range ?? "Unknown date range",
            raw_text: row.raw_text,
            source_type: row.source_type,
            summary: row.summary ?? null,
            action: row.action ?? null,
            impact: row.impact ?? null,
            stakeholders: row.stakeholders ?? null,
            tools_methods: row.tools_methods ?? null,
            business_context: row.business_context ?? null,
            impact_type: row.impact_type ?? null,
            inferred_scale: row.inferred_scale ?? null,
            inferred_scope: row.inferred_scope ?? null,
            confidence: row.confidence ?? null,
            missing_fields: row.missing_fields ?? null,
            resume_id: row.resume_id,
            source_revision_sha256: row.source_revision_sha256,
            source_role_ref: row.source_role_ref,
            source_unit_id: row.source_unit_id,
            source_unit_ref: row.source_unit_ref,
            source_unit_sha256: row.source_unit_sha256,
            source_quote: row.source_quote,
            source_span_start: row.source_span_start,
            source_span_end: row.source_span_end,
            atomic_index: row.atomic_index,
            atomic_statement: row.atomic_statement,
            context: row.context,
            outcome: row.outcome,
            source_supported_metrics: toStringArray(row.source_supported_metrics),
            extraction_confidence: row.extraction_confidence,
            provider: row.provider,
            provider_model: row.provider_model,
            provider_version: row.provider_version,
            review_status: row.review_status,
            sort_order: index,
            created_at: career.created_at,
            updated_at: career.updated_at,
        };
    });

    const resolvedEvidenceSignals: EvidenceSignal[] = evidenceSignalRows.map((row) => ({
        id: row.id,
        career_id: row.career_id,
        evidence_piece_id: row.evidence_piece_id,
        action: row.action,
        domain: row.domain,
        initiative_type: row.initiative_type,
        scope_level: row.scope_level,
        ownership_level: row.ownership_level,
        stakeholder_scope: toStringArray(row.stakeholder_scope),
        tool_signals: toStringArray(row.tool_signals),
        capability_hints: toStringArray(row.capability_hints),
        team_signal: row.team_signal,
        impact_signal: row.impact_signal,
        confidence_score: row.confidence_score,
        created_at: row.created_at,
            updated_at: row.updated_at,
    }));

    const resolveGoalSignalType = (value: string): CareerGoalSignal["signal_type"] => {
        if (value === "target_path" || value === "avoid_path" || value === "priority" || value === "constraint" || value === "preference") {
            return value;
        }
        return "priority";
    };
    const resolveGoalSignalStrength = (value: string | null): CareerGoalSignal["strength"] => {
        if (value === "low" || value === "medium" || value === "high") return value;
        return "medium";
    };
    const resolveGoalSignalConfidence = (value: string | null): CareerGoalSignal["confidence"] => {
        if (value === "explicit" || value === "inferred" || value === "weak_inferred") return value;
        return "inferred";
    };
    const resolveGoalSignalSource = (value: string | null): CareerGoalSignal["source"] => {
        if (value === "quick_check" || value === "user_answer" || value === "saved_role" || value === "cv_angle_selected" || value === "manual_profile") {
            return value;
        }
        return "manual_profile";
    };
    const resolveGoalSignalStatus = (value: string | null): CareerGoalSignal["status"] => {
        if (value === "active" || value === "stale" || value === "rejected") return value;
        return "active";
    };
    const resolvedCareerGoalSignals: CareerGoalSignal[] = careerGoalSignalRows
        .map((row) => {
            const label = row.label?.trim() ?? "";
            if (!label) return null;
            return {
                id: row.id,
                profile_id: row.profile_id,
                signal_type: resolveGoalSignalType(row.signal_type),
                label,
                description: row.description,
                strength: resolveGoalSignalStrength(row.strength),
                confidence: resolveGoalSignalConfidence(row.confidence),
                source: resolveGoalSignalSource(row.source),
                source_ref_id: row.source_ref_id,
                status: resolveGoalSignalStatus(row.status),
                created_at: row.created_at,
                updated_at: row.updated_at,
            } satisfies CareerGoalSignal;
        })
        .filter((row): row is CareerGoalSignal => row !== null);

    const resolvedCapabilities = capabilitiesData;
    const evidenceByExperience: Record<string, EvidencePiece[]> = {};
    for (const evidence of resolvedEvidencePieces) {
        const key = evidence.experience_id;
        if (!evidenceByExperience[key]) evidenceByExperience[key] = [];
        evidenceByExperience[key].push(evidence);
    }

    const signalsByEvidencePiece: Record<string, EvidenceSignal[]> = {};
    for (const signal of resolvedEvidenceSignals) {
        const key = signal.evidence_piece_id;
        if (!signalsByEvidencePiece[key]) signalsByEvidencePiece[key] = [];
        signalsByEvidencePiece[key].push(signal);
    }

    const capabilitiesById = new Map<string, Capability>(resolvedCapabilities.map((capability) => [capability.id, capability]));
    const evidenceById = new Map<string, EvidencePiece>(resolvedEvidencePieces.map((evidence) => [evidence.id, evidence]));
    const signalsById = new Map<string, EvidenceSignal>(resolvedEvidenceSignals.map((signal) => [signal.id, signal]));

    const signalsByCapability: Record<string, EvidenceSignal[]> = {};
    const capabilitiesBySignal: Record<string, Capability[]> = {};
    const evidenceByCapabilityViaSignals: Record<string, EvidencePiece[]> = {};
    const capabilitiesByEvidence: Record<string, Capability[]> = {};
    const evidenceByCapability: Record<string, EvidencePiece[]> = {};

    for (const link of resolvedCapabilitySignalLinks) {
        const capability = capabilitiesById.get(link.capability_id);
        const signal = signalsById.get(link.evidence_signal_id);
        if (!capability || !signal) continue;

        pushUniqueById(signalsByCapability, capability.id, signal);
        pushUniqueById(capabilitiesBySignal, signal.id, capability);

        const evidence = evidenceById.get(signal.evidence_piece_id);
        if (evidence) {
            pushUniqueById(evidenceByCapabilityViaSignals, capability.id, evidence);
            pushUniqueById(evidenceByCapability, capability.id, evidence);
            pushUniqueById(capabilitiesByEvidence, evidence.id, capability);
        }
    }

    // legacy compatibility-only merge for direct capability -> evidence links.
    for (const legacyLink of resolvedCapabilityEvidenceLinks) {
        const capability = capabilitiesById.get(legacyLink.capability_id);
        const evidence = evidenceById.get(legacyLink.evidence_piece_id);
        if (!capability || !evidence) continue;
        pushUniqueById(capabilitiesByEvidence, evidence.id, capability);
        pushUniqueById(evidenceByCapability, capability.id, evidence);
    }

    return {
        career,
        experiences: resolvedExperiences,
        evidencePieces: resolvedEvidencePieces,
        evidenceSignals: resolvedEvidenceSignals,
        capabilities: resolvedCapabilities,
        capabilityEvidenceLinks: resolvedCapabilityEvidenceLinks,
        capabilitySignalLinks: resolvedCapabilitySignalLinks,
        careerGoalSignals: resolvedCareerGoalSignals,
        evidenceByExperience,
        signalsByEvidencePiece,
        signalsByCapability,
        capabilitiesBySignal,
        capabilitiesByEvidence,
        evidenceByCapability,
        evidenceByCapabilityViaSignals,
    };
}

export async function loadCareerGraph(profileId: string, options: LoadCareerGraphOptions = {}): Promise<CareerGraph> {
    if (!profileId || profileId.trim().length === 0) throw new Error("profileId is required");
    return loadWithStablePublicationToken(
        () => readCareerGraphPublicationToken(profileId),
        () => loadCareerGraphOnce(profileId, options),
    );
}
