import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import {
    buildCandidateCapabilityBaseline,
    CAPABILITY_STRENGTH_WEIGHTS,
    type CandidateBaselineCapabilityInput,
    type CandidateBaselineCapabilitySignalLinkInput,
    type CandidateBaselineEvidencePieceInput,
    type CandidateBaselineEvidenceSignalInput,
    type CandidateBaselineExperienceInput,
    type CapabilityStrengthProfileItem,
    type CapabilityStrengthSupportingSignal,
} from "./candidate-baseline";

export { CAPABILITY_STRENGTH_WEIGHTS };
export type { CapabilityStrengthProfileItem, CapabilityStrengthSupportingSignal };

type CapabilityStrengthOptions = { topSignalsLimit?: number };

export async function getCapabilityStrengthProfile(careerId: string, options: CapabilityStrengthOptions = {}): Promise<CapabilityStrengthProfileItem[]> {
    const topSignalsLimit = Math.max(1, options.topSignalsLimit ?? 3);
    if (!careerId || careerId.trim().length === 0) throw new Error("careerId is required");
    const supabase = createServerSupabaseClient();
    const { data: capabilitiesRaw, error: capabilitiesError } = await supabase.from("capabilities").select("id, career_id, name, canonical_name, display_name, confidence_score, confidence").eq("career_id", careerId);
    if (capabilitiesError) throw new Error(`Failed to load capabilities for strength model: ${capabilitiesError.message}`);
    const capabilities = (capabilitiesRaw ?? []) as CandidateBaselineCapabilityInput[];
    if (capabilities.length === 0) return [];
    const capabilityIds = capabilities.map((capability) => capability.id);
    const { data: linksRaw, error: linksError } = await supabase.from("capability_signal_links").select("capability_id, evidence_signal_id, contribution_weight").in("capability_id", capabilityIds);
    if (linksError) throw new Error(`Failed to load capability_signal_links for strength model: ${linksError.message}`);
    const capabilitySignalLinks = (linksRaw ?? []) as CandidateBaselineCapabilitySignalLinkInput[];
    const signalIds = Array.from(new Set(capabilitySignalLinks.map((link) => link.evidence_signal_id)));
    const linkedSignalsResponse = signalIds.length > 0 ? await supabase.from("evidence_signals").select("id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, impact_signal, confidence_score").in("id", signalIds) : { data: [], error: null };
    if (linkedSignalsResponse.error) throw new Error(`Failed to load evidence_signals for strength model: ${linkedSignalsResponse.error.message}`);
    const allSignalsResponse = await supabase.from("evidence_signals").select("id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, impact_signal, confidence_score").eq("career_id", careerId);
    if (allSignalsResponse.error) throw new Error(`Failed to load career evidence_signals for strength calibration: ${allSignalsResponse.error.message}`);
    const evidenceSignals = (allSignalsResponse.data ?? []) as CandidateBaselineEvidenceSignalInput[];
    const evidencePieceIds = Array.from(new Set(evidenceSignals.map((signal) => signal.evidence_piece_id)));
    const pieces = evidencePieceIds.length > 0 ? await supabase.from("evidence_pieces").select("id, experience_id, raw_text").in("id", evidencePieceIds) : { data: [], error: null };
    if (pieces.error) throw new Error(`Failed to load evidence_pieces for strength model: ${pieces.error.message}`);
    const evidencePieces = (pieces.data ?? []) as CandidateBaselineEvidencePieceInput[];
    const experienceIds = Array.from(new Set(evidencePieces.map((piece) => piece.experience_id).filter(Boolean)));
    const experiencesResponse = experienceIds.length > 0 ? await supabase.from("experiences").select("id, date_range, sort_order").in("id", experienceIds) : { data: [], error: null };
    if (experiencesResponse.error) throw new Error(`Failed to load experiences for strength model: ${experiencesResponse.error.message}`);
    return buildCandidateCapabilityBaseline({ careerId, currentYear: new Date().getUTCFullYear(), topSignalsLimit, capabilities, capabilitySignalLinks, evidenceSignals, evidencePieces, experiences: (experiencesResponse.data ?? []) as CandidateBaselineExperienceInput[] });
}
