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
    raw_text: string;
    source_type: "resume_bullet" | "linkedin" | "manual" | "interview" | "resume" | "imported_doc" | null;
};

export type Capability = {
    id: string;
    career_id: string;
    name: string;
    normalized_name: string;
    confidence: number | null;
    strength: number | null;
    evidence_count?: number | null;
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

export type CareerGraph = {
    career: Career | null;
    experiences: Experience[];
    evidencePieces: EvidencePiece[];
    capabilities: Capability[];
    capabilityEvidenceLinks: CapabilityEvidenceLink[];
    evidenceByExperience: Record<string, EvidencePiece[]>;
    capabilitiesByEvidence: Record<string, Capability[]>;
    evidenceByCapability: Record<string, EvidencePiece[]>;
};

export async function loadCareerGraph(profileId: string): Promise<CareerGraph> {
    if (!profileId || profileId.trim().length === 0) {
        throw new Error("profileId is required");
    }

    const supabase = createServerSupabaseClient();

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
            capabilities: [],
            capabilityEvidenceLinks: [],
            evidenceByExperience: {},
            capabilitiesByEvidence: {},
            evidenceByCapability: {},
        };
    }

    const [{ data: experiences, error: experiencesError }, { data: evidencePieces, error: evidenceError }, { data: capabilities, error: capabilitiesError }] = await Promise.all([
        supabase
            .from("experiences")
            .select("id, career_id, company, title, date_range, location, summary, source_type, sort_order, created_at, updated_at")
            .eq("career_id", career.id)
            .order("sort_order", { ascending: true }),
        supabase
            .from("evidence_pieces")
            .select("id, experience_id, career_id, raw_text, source_type")
            .eq("career_id", career.id)
            .order("id", { ascending: true }),
        supabase
            .from("capabilities")
            .select("id, career_id, name, normalized_name, confidence, strength, created_at, updated_at")
            .eq("career_id", career.id)
            .order("created_at", { ascending: true }),
    ]);

    if (experiencesError) {
        throw new Error(`Failed to load experiences for career graph: ${experiencesError.message}`);
    }
    if (evidenceError) {
        throw new Error(`Failed to load evidence_pieces for career graph: ${evidenceError.message}`);
    }
    if (capabilitiesError) {
        throw new Error(`Failed to load capabilities for career graph: ${capabilitiesError.message}`);
    }

    const capabilityIds = (capabilities ?? []).map((capability) => capability.id);
    const capabilityEvidenceLinks = capabilityIds.length > 0
        ? await supabase
            .from("capability_evidence_links")
            .select("capability_id, evidence_piece_id, link_strength, created_at")
            .in("capability_id", capabilityIds)
        : { data: [], error: null };

    if (capabilityEvidenceLinks.error) {
        throw new Error(`Failed to load capability_evidence_links for career graph: ${capabilityEvidenceLinks.error.message}`);
    }

    const resolvedExperiences = (experiences ?? []) as Experience[];
    const evidenceRows = (evidencePieces ?? []) as EvidencePieceRow[];
    const experiencesById = new Map<string, Experience>(
        resolvedExperiences.map((experience) => [experience.id, experience]),
    );
    const resolvedEvidencePieces: EvidencePiece[] = evidenceRows.map((row, index) => {
        const experience = experiencesById.get(row.experience_id);
        return {
            id: row.id,
            career_id: row.career_id,
            experience_id: row.experience_id,
            company: experience?.company ?? "Unknown company",
            role: experience?.title ?? "Unknown role",
            date_range: experience?.date_range ?? "Unknown date range",
            raw_text: row.raw_text,
            source_type: row.source_type,
            sort_order: index,
            created_at: career.created_at,
            updated_at: career.updated_at,
        };
    });
    const resolvedCapabilities = (capabilities ?? []) as Capability[];
    const resolvedCapabilityEvidenceLinks = (capabilityEvidenceLinks.data ?? []) as CapabilityEvidenceLink[];

    const evidenceByExperience: Record<string, EvidencePiece[]> = {};
    for (const evidence of resolvedEvidencePieces) {
        const key = evidence.experience_id;
        if (!evidenceByExperience[key]) {
            evidenceByExperience[key] = [];
        }
        evidenceByExperience[key].push(evidence);
    }

    const capabilitiesById = new Map<string, Capability>(
        resolvedCapabilities.map((capability) => [capability.id, capability]),
    );
    const evidenceById = new Map<string, EvidencePiece>(
        resolvedEvidencePieces.map((evidence) => [evidence.id, evidence]),
    );

    const capabilitiesByEvidence: Record<string, Capability[]> = {};
    const evidenceByCapability: Record<string, EvidencePiece[]> = {};

    for (const link of resolvedCapabilityEvidenceLinks) {
        const capability = capabilitiesById.get(link.capability_id);
        const evidence = evidenceById.get(link.evidence_piece_id);

        if (!capability || !evidence) {
            continue;
        }

        if (!capabilitiesByEvidence[link.evidence_piece_id]) {
            capabilitiesByEvidence[link.evidence_piece_id] = [];
        }
        capabilitiesByEvidence[link.evidence_piece_id].push(capability);

        if (!evidenceByCapability[link.capability_id]) {
            evidenceByCapability[link.capability_id] = [];
        }
        evidenceByCapability[link.capability_id].push(evidence);
    }

    return {
        career,
        experiences: resolvedExperiences,
        evidencePieces: resolvedEvidencePieces,
        capabilities: resolvedCapabilities,
        capabilityEvidenceLinks: resolvedCapabilityEvidenceLinks,
        evidenceByExperience,
        capabilitiesByEvidence,
        evidenceByCapability,
    };
}
