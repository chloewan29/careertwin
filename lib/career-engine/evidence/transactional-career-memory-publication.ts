import type { SupabaseClient } from "@supabase/supabase-js";
import { inferCapabilities } from "@/lib/career-engine/capability/capability-inference";
import { extractEvidenceSignalsFromPieces } from "@/lib/career-engine/evidence/evidence-signals";
import { deriveStructuredEvidenceFields } from "@/lib/career-engine/evidence/structured-evidence";
import {
    deterministicUuid,
    type AtomicEvidenceReload,
} from "@/lib/career-engine/evidence/atomic-evidence-ingestion";

export const ATOMIC_CAREER_MEMORY_PUBLICATION_VERSION = "atomic-career-memory-publication/1.0.0";

export type AtomicCareerMemoryPublicationOutcome = "PUBLISHED" | "COMPLETE_REPLAY" | "NEEDS_REVIEW";

export type AtomicCareerMemoryPublicationResult = {
    outcome: AtomicCareerMemoryPublicationOutcome;
    career_id: string;
    resume_id: string;
    revision: string;
    active_resume_id: string | null;
    fingerprint: string;
    counts: {
        experiences: number;
        source_units: number;
        evidence: number;
        signals: number;
        capabilities: number;
        capability_evidence_links: number;
        capability_signal_links: number;
    };
};

type PublicationProfile = {
    id: string;
    user_id: string;
    current_title: string | null;
    years_experience: number | null;
    seniority_level: string | null;
    industry: string | null;
    summary: string | null;
    companies: unknown[];
    capabilities: string[];
    capability_evidence: unknown;
    display_name?: string;
};

type PublicationResume = {
    id: string;
    user_id: string;
    profile_id: string;
    file_name: string;
    file_url: string | null;
    raw_text: string;
    parsed_json: unknown;
    content_sha256: string;
};

type PublicationCareer = {
    id: string;
    user_id: string;
    headline: string | null;
    summary: string | null;
    total_years_experience: number | null;
};

export type AtomicCareerMemoryPublicationPayload = {
    publication_version: typeof ATOMIC_CAREER_MEMORY_PUBLICATION_VERSION;
    expected_previous_active_resume_id: string | null;
    profile: PublicationProfile;
    resume: PublicationResume;
    career: PublicationCareer;
    revision: string;
    materialization_status: "completed" | "needs_review";
    experiences: Array<Record<string, unknown>>;
    source_units: Array<Record<string, unknown>>;
    evidence: Array<Record<string, unknown>>;
    signals: Array<Record<string, unknown>>;
    capabilities: Array<Record<string, unknown>>;
    capability_evidence_links: Array<Record<string, unknown>>;
    capability_signal_links: Array<Record<string, unknown>>;
};

function normalizeCapabilityName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function dominant(values: string[]): string | null {
    if (values.length === 0) return null;
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

export function buildAtomicCareerMemoryPublication(input: {
    materialization: AtomicEvidenceReload;
    expectedPreviousActiveResumeId: string | null;
    profile: PublicationProfile;
    resume: PublicationResume;
    career: PublicationCareer;
    hasBusinessContext: boolean;
}): AtomicCareerMemoryPublicationPayload {
    const { materialization } = input;
    const hasHardFailure = materialization.sourceUnits.some(
        (unit) => unit.fate === "PROVIDER_FAILURE" || unit.fate === "VALIDATION_REJECTED",
    );
    const roleByRef = new Map(materialization.experiences.map((experience) => [experience.roleRef, experience]));
    const sourceUnitOrdinalById = new Map(materialization.sourceUnits.map((unit) => [unit.id, unit.sourceUnitOrdinal]));

    const experiences = materialization.experiences.map((experience) => ({
        id: experience.id,
        career_id: materialization.careerId,
        resume_id: materialization.resumeId,
        company: experience.company,
        title: experience.title,
        date_range: experience.dateRange,
        summary: null,
        source_type: "resume",
        sort_order: experience.sortOrder,
        source_revision_sha256: experience.sourceRevisionSha256,
        source_role_ref: experience.roleRef,
        materialization_version: experience.materializationVersion,
    }));
    const sourceUnits = materialization.sourceUnits.map((unit) => ({
        id: unit.id,
        career_id: materialization.careerId,
        resume_id: materialization.resumeId,
        experience_id: unit.experienceId,
        source_revision_sha256: unit.sourceRevisionSha256,
        source_role_ref: unit.roleRef,
        source_unit_ref: unit.sourceUnitRef,
        source_unit_ordinal: unit.sourceUnitOrdinal,
        source_unit_sha256: unit.sourceUnitSha256,
        source_text: unit.sourceText,
        fate: unit.fate,
        provider: unit.provider,
        model: unit.model,
        provider_version: unit.providerVersion,
        validation_errors: unit.validationErrors,
    }));
    const evidence = materialization.evidence.map((item) => {
        const role = roleByRef.get(item.roleRef);
        if (!role) throw new Error(`Atomic evidence role ${item.roleRef} is unavailable`);
        const structured = deriveStructuredEvidenceFields(item.atomicStatement, "resume");
        return {
            id: item.id,
            career_id: materialization.careerId,
            resume_id: materialization.resumeId,
            experience_id: item.experienceId,
            company: role.company,
            role: role.title,
            date_range: role.dateRange,
            raw_text: item.atomicStatement,
            source_type: "resume_bullet",
            evidence_source_type: "resume",
            summary: item.atomicStatement,
            action: item.action,
            impact: item.outcome,
            stakeholders: structured.stakeholders,
            tools_methods: structured.tools_methods,
            ...(input.hasBusinessContext ? { business_context: item.context } : {}),
            inferred_scale: structured.inferred_scale,
            inferred_scope: structured.inferred_scope,
            confidence: item.extractionConfidence,
            missing_fields: structured.missing_fields,
            sort_order: (sourceUnitOrdinalById.get(item.sourceUnitId) ?? 0) * 10 + item.atomicIndex,
            source_revision_sha256: item.sourceRevisionSha256,
            source_role_ref: item.roleRef,
            source_unit_id: item.sourceUnitId,
            source_unit_ref: item.sourceUnitRef,
            source_unit_sha256: materialization.sourceUnits.find((unit) => unit.id === item.sourceUnitId)?.sourceUnitSha256,
            source_quote: item.sourceQuote,
            source_span_start: item.sourceSpanStart,
            source_span_end: item.sourceSpanEnd,
            atomic_index: item.atomicIndex,
            atomic_statement: item.atomicStatement,
            context: item.context,
            outcome: item.outcome,
            source_supported_metrics: item.sourceSupportedMetrics,
            extraction_confidence: item.extractionConfidence,
            provider: item.provider,
            provider_model: item.model,
            provider_version: item.providerVersion,
            review_status: item.reviewStatus,
        };
    });

    const signalRows = hasHardFailure ? [] : extractEvidenceSignalsFromPieces(evidence.map((row) => ({
        id: row.id,
        career_id: materialization.careerId,
        raw_text: row.raw_text,
    }))).map((signal, index) => ({
        id: deterministicUuid("evidence-signal", materialization.careerId, materialization.sourceRevisionSha256, signal.evidence_piece_id, index),
        ...signal,
    }));
    const inference = signalRows.length > 0 ? inferCapabilities({ evidence_signals: signalRows }) : { capabilities: [], evidence_map: [] };
    const signalById = new Map(signalRows.map((signal) => [signal.id, signal]));
    const evidenceById = new Map(evidence.map((row) => [row.id, row]));
    const capabilityIdByName = new Map<string, string>();
    for (const name of inference.capabilities) {
        const normalized = normalizeCapabilityName(name);
        capabilityIdByName.set(normalized, deterministicUuid("capability", materialization.careerId, materialization.sourceRevisionSha256, normalized));
    }

    const capabilitySignalLinks: Array<Record<string, unknown>> = [];
    const capabilityEvidenceLinks: Array<Record<string, unknown>> = [];
    const seenSignalLinks = new Set<string>();
    const seenEvidenceLinks = new Set<string>();
    for (const mapping of inference.evidence_map) {
        const capabilityId = capabilityIdByName.get(normalizeCapabilityName(mapping.capability));
        if (!capabilityId) continue;
        for (const signalId of mapping.evidence_signal_ids ?? []) {
            const signal = signalById.get(signalId);
            if (!signal) continue;
            const signalKey = `${capabilityId}::${signal.id}`;
            if (!seenSignalLinks.has(signalKey)) {
                seenSignalLinks.add(signalKey);
                capabilitySignalLinks.push({
                    id: deterministicUuid("capability-signal-link", capabilityId, signal.id),
                    capability_id: capabilityId,
                    evidence_signal_id: signal.id,
                    contribution_weight: signal.confidence_score ?? 0.5,
                    rationale: "Inferred from structured evidence signal.",
                });
            }
            const evidenceKey = `${capabilityId}::${signal.evidence_piece_id}`;
            if (!seenEvidenceLinks.has(evidenceKey)) {
                seenEvidenceLinks.add(evidenceKey);
                capabilityEvidenceLinks.push({ capability_id: capabilityId, evidence_piece_id: signal.evidence_piece_id, link_strength: 1 });
            }
        }
    }

    const signalIdsByCapability = new Map<string, string[]>();
    for (const row of capabilitySignalLinks) {
        const capabilityId = String(row.capability_id);
        const bucket = signalIdsByCapability.get(capabilityId) ?? [];
        bucket.push(String(row.evidence_signal_id));
        signalIdsByCapability.set(capabilityId, bucket);
    }
    const capabilities = inference.capabilities.map((name) => {
        const normalized = normalizeCapabilityName(name);
        const id = capabilityIdByName.get(normalized)!;
        const signalIds = Array.from(new Set(signalIdsByCapability.get(id) ?? [])).sort();
        const supportingSignals = signalIds.map((signalId) => signalById.get(signalId)).filter((row): row is NonNullable<typeof row> => Boolean(row));
        const supportingEvidenceIds = Array.from(new Set(supportingSignals.map((row) => row.evidence_piece_id))).sort();
        const supportingEvidence = supportingEvidenceIds.map((evidenceId) => evidenceById.get(evidenceId)).filter((row): row is NonNullable<typeof row> => Boolean(row));
        const confidenceScore = supportingSignals.length > 0
            ? Number((supportingSignals.reduce((sum, row) => sum + (row.confidence_score ?? 0.5), 0) / supportingSignals.length).toFixed(4))
            : 0.5;
        const confidenceLevel = confidenceScore >= 0.75 ? "high" : confidenceScore >= 0.5 ? "medium" : "low";
        const contextDomains = Array.from(new Set(supportingSignals.map((row) => row.domain).filter((value): value is string => Boolean(value)))).sort();
        const teamValues = supportingEvidence.map((row) => row.inferred_scale as Record<string, unknown>).map((scale) => String(scale?.team_scope ?? "")).filter(Boolean);
        const businessValues = supportingEvidence.map((row) => row.inferred_scale as Record<string, unknown>).map((scale) => String(scale?.business_scope ?? "")).filter(Boolean);
        const impactValues = supportingEvidence.map((row) => row.inferred_scale as Record<string, unknown>).map((scale) => String(scale?.impact_scope ?? "")).filter(Boolean);
        return {
            id,
            career_id: materialization.careerId,
            name,
            normalized_name: normalized,
            canonical_name: normalized,
            display_name: name,
            scope_summary: dominant(supportingSignals.map((row) => row.scope_level ?? "").filter(Boolean)),
            ownership_summary: dominant(supportingSignals.map((row) => row.ownership_level ?? "").filter(Boolean)),
            impact_summary: dominant(supportingSignals.map((row) => row.impact_signal ?? "").filter(Boolean)),
            confidence: confidenceScore,
            confidence_score: confidenceScore,
            evidence_count: supportingEvidenceIds.length,
            evidence_signal_count: signalIds.length,
            supporting_evidence_ids: supportingEvidenceIds,
            context_domains: contextDomains,
            scale_summary: {
                dominant_team_scope: dominant(teamValues) ?? "unknown",
                max_team_scope_seen: dominant(teamValues) ?? "unknown",
                dominant_business_scope: dominant(businessValues) ?? "unknown",
                max_business_scope_seen: dominant(businessValues) ?? "unknown",
                dominant_impact_scope: dominant(impactValues) ?? "unknown",
                scale_confidence: confidenceLevel,
            },
            confidence_level: confidenceLevel,
        };
    });

    return {
        publication_version: ATOMIC_CAREER_MEMORY_PUBLICATION_VERSION,
        expected_previous_active_resume_id: input.expectedPreviousActiveResumeId,
        profile: input.profile,
        resume: input.resume,
        career: input.career,
        revision: materialization.sourceRevisionSha256,
        materialization_status: hasHardFailure ? "needs_review" : "completed",
        experiences,
        source_units: sourceUnits,
        evidence,
        signals: signalRows,
        capabilities: hasHardFailure ? [] : capabilities,
        capability_evidence_links: hasHardFailure ? [] : capabilityEvidenceLinks,
        capability_signal_links: hasHardFailure ? [] : capabilitySignalLinks,
    };
}

export async function publishAtomicCareerMemory(
    client: Pick<SupabaseClient, "rpc">,
    payload: AtomicCareerMemoryPublicationPayload,
): Promise<AtomicCareerMemoryPublicationResult> {
    const { data, error } = await client.rpc("publish_atomic_career_memory", { p_payload: payload });
    if (error) throw new Error(`Transactional career memory publication failed: ${error.message}`);
    if (!data || typeof data !== "object") throw new Error("Transactional career memory publication returned an invalid result");
    const result = data as Partial<AtomicCareerMemoryPublicationResult>;
    const expectedCounts = publicationCounts(payload);
    const acceptedOutcome = result.outcome === "PUBLISHED"
        || result.outcome === "COMPLETE_REPLAY"
        || result.outcome === "NEEDS_REVIEW";
    const countsMatch = result.counts
        && Object.entries(expectedCounts).every(([key, value]) => result.counts?.[key as keyof typeof expectedCounts] === value);
    const expectedActiveResumeId = payload.materialization_status === "completed"
        ? payload.resume.id
        : payload.expected_previous_active_resume_id;
    if (!acceptedOutcome
        || result.career_id !== payload.career.id
        || result.resume_id !== payload.resume.id
        || result.revision !== payload.revision
        || result.active_resume_id !== expectedActiveResumeId
        || typeof result.fingerprint !== "string"
        || !/^[a-f0-9]{64}$/.test(result.fingerprint)
        || !countsMatch) {
        throw new Error("Transactional career memory publication returned a mismatched result");
    }
    return result as AtomicCareerMemoryPublicationResult;
}

export function publicationCounts(payload: AtomicCareerMemoryPublicationPayload): AtomicCareerMemoryPublicationResult["counts"] {
    return {
        experiences: payload.experiences.length,
        source_units: payload.source_units.length,
        evidence: payload.evidence.length,
        signals: payload.signals.length,
        capabilities: payload.capabilities.length,
        capability_evidence_links: payload.capability_evidence_links.length,
        capability_signal_links: payload.capability_signal_links.length,
    };
}
