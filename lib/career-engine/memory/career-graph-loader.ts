import { createServerSupabaseClient } from "@/lib/db/supabase/server";

export type Career = {
    id: string;
    user_id: string;
    headline: string | null;
    summary: string | null;
    total_years_experience: number | null;
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
    source_type: "resume_bullet" | "linkedin" | "manual" | "interview" | "resume" | "imported_doc" | null;
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
    source_type: "resume_bullet" | "linkedin" | "manual" | "interview" | "resume" | "imported_doc" | null;
    summary: string | null;
    action: string | null;
    impact: string | null;
    stakeholders: string[] | null;
    tools_methods: string[] | null;
    business_context: string | null;
    org_scope: "team" | "department" | "cross_functional" | "enterprise" | null;
    stakeholder_scope: "internal" | "cross_team" | "executive" | "external" | null;
    leadership_scope: "individual_contribution" | "technical_lead" | "team_lead" | "program_lead" | "org_lead" | null;
    delivery_level: "task" | "project" | "product" | "program" | "platform" | null;
    impact_scale: "small" | "medium" | "large" | "enterprise" | null;
    impact_type: "revenue" | "cost" | "operational" | "strategic" | null;
    confidence_level: "low" | "medium" | "high" | null;
    inferred_scale: Record<string, unknown> | null;
    inferred_scope: Record<string, unknown> | null;
    confidence: number | null;
    missing_fields: string[] | null;
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

export type CareerGraph = {
    career: Career | null;
    experiences: Experience[];
    evidencePieces: EvidencePiece[];
    evidenceSignals?: EvidenceSignal[];
    capabilities: Capability[];
    capabilityEvidenceLinks: CapabilityEvidenceLink[];
    capabilitySignalLinks?: CapabilitySignalLink[];
    evidenceByExperience: Record<string, EvidencePiece[]>;
    signalsByEvidencePiece?: Record<string, EvidenceSignal[]>;
    signalsByCapability?: Record<string, EvidenceSignal[]>;
    capabilitiesBySignal?: Record<string, Capability[]>;
    capabilitiesByEvidence: Record<string, Capability[]>;
    evidenceByCapability: Record<string, EvidencePiece[]>;
    evidenceByCapabilityViaSignals?: Record<string, EvidencePiece[]>;
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

export async function loadCareerGraph(profileId: string): Promise<CareerGraph> {
    if (!profileId || profileId.trim().length === 0) {
        throw new Error("profileId is required");
    }

    const supabase = createServerSupabaseClient();
    const evidenceSelectExpanded = [
        "id", "experience_id", "career_id", "company", "role", "date_range", "raw_text", "source_type",
        "summary", "action", "impact", "stakeholders", "tools_methods", "business_context",
        "org_scope", "stakeholder_scope", "leadership_scope", "delivery_level", "impact_scale", "impact_type",
        "confidence_level", "inferred_scale", "inferred_scope", "confidence", "missing_fields",
    ].join(", ");
    const evidenceSelectExpandedNoBusinessContext = [
        "id", "experience_id", "career_id", "company", "role", "date_range", "raw_text", "source_type",
        "summary", "action", "impact", "stakeholders", "tools_methods",
        "org_scope", "stakeholder_scope", "leadership_scope", "delivery_level", "impact_scale", "impact_type",
        "confidence_level", "inferred_scale", "inferred_scope", "confidence", "missing_fields",
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
        .select("id, user_id, headline, summary, total_years_experience, created_at, updated_at")
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
            evidenceByExperience: {},
            signalsByEvidencePiece: {},
            signalsByCapability: {},
            capabilitiesBySignal: {},
            capabilitiesByEvidence: {},
            evidenceByCapability: {},
            evidenceByCapabilityViaSignals: {},
        };
    }

    const [experiencesResult, capabilitiesExpandedResult, evidenceExpandedResult, evidenceSignalsResult] = await Promise.all([
        supabase
            .from("experiences")
            .select("id, career_id, company, title, date_range, location, summary, source_type, sort_order, created_at, updated_at")
            .eq("career_id", career.id)
            .order("sort_order", { ascending: true }),
        supabase
            .from("capabilities")
            .select(capabilitySelectExpanded)
            .eq("career_id", career.id)
            .order("created_at", { ascending: true }),
        supabase
            .from("evidence_pieces")
            .select(evidenceSelectExpanded)
            .eq("career_id", career.id)
            .order("id", { ascending: true }),
        supabase
            .from("evidence_signals")
            .select("id, career_id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, capability_hints, team_signal, impact_signal, confidence_score, created_at, updated_at")
            .eq("career_id", career.id)
            .order("created_at", { ascending: true }),
    ]);

    if (experiencesResult.error) {
        throw new Error(`Failed to load experiences for career graph: ${experiencesResult.error.message}`);
    }

    let capabilitiesData: Capability[] = [];
    if (capabilitiesExpandedResult.error) {
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
        const expandedNoBusinessContextResult = await supabase
            .from("evidence_pieces")
            .select(evidenceSelectExpandedNoBusinessContext)
            .eq("career_id", career.id)
            .order("id", { ascending: true });

        if (!expandedNoBusinessContextResult.error) {
            evidenceRows = ((expandedNoBusinessContextResult.data ?? []) as unknown as Array<Omit<EvidencePieceRow, "business_context">>)
                .map((row) => ({
                    ...row,
                    business_context: null,
                }));
        } else {
            const legacyEvidenceResult = await supabase
                .from("evidence_pieces")
                .select(evidenceSelectLegacy)
                .eq("career_id", career.id)
                .order("id", { ascending: true });
            if (legacyEvidenceResult.error) {
                throw new Error(`Failed to load evidence_pieces for career graph: ${legacyEvidenceResult.error.message}`);
            }
            evidenceRows = ((legacyEvidenceResult.data ?? []) as Array<{
                id: string;
                experience_id: string;
                career_id: string;
                raw_text: string;
                source_type: "resume_bullet" | "linkedin" | "manual" | "interview" | "resume" | "imported_doc" | null;
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
                org_scope: null,
                stakeholder_scope: null,
                leadership_scope: null,
                delivery_level: null,
                impact_scale: null,
                impact_type: null,
                confidence_level: null,
                inferred_scale: null,
                inferred_scope: null,
                confidence: null,
                missing_fields: null,
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
            org_scope: row.org_scope ?? null,
            stakeholder_scope: row.stakeholder_scope ?? null,
            leadership_scope: row.leadership_scope ?? null,
            delivery_level: row.delivery_level ?? null,
            impact_scale: row.impact_scale ?? null,
            impact_type: row.impact_type ?? null,
            confidence_level: row.confidence_level ?? null,
            inferred_scale: row.inferred_scale ?? null,
            inferred_scope: row.inferred_scope ?? null,
            confidence: row.confidence ?? null,
            missing_fields: row.missing_fields ?? null,
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
        evidenceByExperience,
        signalsByEvidencePiece,
        signalsByCapability,
        capabilitiesBySignal,
        capabilitiesByEvidence,
        evidenceByCapability,
        evidenceByCapabilityViaSignals,
    };
}
