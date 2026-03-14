import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";

type EvidencePieceRow = {
    id: string;
    raw_text: string;
    created_at: string;
};

type EvidenceSignalRow = {
    id: string;
    evidence_piece_id: string;
    action: string | null;
    domain: string | null;
    initiative_type: string | null;
    scope_level: string | null;
    ownership_level: string | null;
    stakeholder_scope: unknown;
    tool_signals: unknown;
    capability_hints: unknown;
    team_signal: string | null;
    impact_signal: string | null;
    confidence_score: number | null;
    created_at: string;
};

type CapabilitySignalLinkRow = {
    capability_id: string;
    evidence_signal_id: string;
    contribution_weight: number | null;
    rationale: string | null;
};

type CapabilityRow = {
    id: string;
    name: string;
    canonical_name: string | null;
    display_name: string | null;
    confidence_score: number | null;
};

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { code?: string; message?: string };
    return candidate.code === "42P01" || candidate.code === "PGRST205" || /relation .* does not exist/i.test(candidate.message ?? "");
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const careerId = searchParams.get("careerId")?.trim();
        const limitParam = Number.parseInt(searchParams.get("limit") ?? "10", 10);
        const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 10;

        if (!careerId) {
            return NextResponse.json({ error: "careerId is required" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        const { data: evidenceRowsRaw, error: evidenceError } = await supabase
            .from("evidence_pieces")
            .select("id, raw_text, created_at")
            .eq("career_id", careerId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (evidenceError) {
            return NextResponse.json(
                { error: `Failed to load evidence_pieces: ${evidenceError.message}` },
                { status: 500 },
            );
        }

        const evidenceRows = (evidenceRowsRaw ?? []) as unknown as EvidencePieceRow[];
        if (evidenceRows.length === 0) {
            return NextResponse.json({
                career_id: careerId,
                sample_size: 0,
                limit,
                samples: [],
            });
        }

        const evidencePieceIds = evidenceRows.map((row) => row.id);
        const { data: signalRowsRaw, error: signalError } = await supabase
            .from("evidence_signals")
            .select("id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, capability_hints, team_signal, impact_signal, confidence_score, created_at")
            .in("evidence_piece_id", evidencePieceIds)
            .order("created_at", { ascending: true });

        if (signalError) {
            if (isMissingRelationError(signalError)) {
                return NextResponse.json(
                    { error: "evidence_signals table is missing. Apply latest migrations first." },
                    { status: 500 },
                );
            }
            return NextResponse.json(
                { error: `Failed to load evidence_signals: ${signalError.message}` },
                { status: 500 },
            );
        }

        const signalRows = (signalRowsRaw ?? []) as unknown as EvidenceSignalRow[];
        const signalIds = signalRows.map((row) => row.id);

        let linkRows: CapabilitySignalLinkRow[] = [];
        if (signalIds.length > 0) {
            const { data: linkRowsRaw, error: linkError } = await supabase
                .from("capability_signal_links")
                .select("capability_id, evidence_signal_id, contribution_weight, rationale")
                .in("evidence_signal_id", signalIds);

            if (linkError) {
                if (isMissingRelationError(linkError)) {
                    return NextResponse.json(
                        { error: "capability_signal_links table is missing. Apply latest migrations first." },
                        { status: 500 },
                    );
                }
                return NextResponse.json(
                    { error: `Failed to load capability_signal_links: ${linkError.message}` },
                    { status: 500 },
                );
            }

            linkRows = (linkRowsRaw ?? []) as unknown as CapabilitySignalLinkRow[];
        }

        const capabilityIds = Array.from(new Set(linkRows.map((row) => row.capability_id)));
        let capabilityRows: CapabilityRow[] = [];
        if (capabilityIds.length > 0) {
            const { data: capabilityRowsRaw, error: capabilityError } = await supabase
                .from("capabilities")
                .select("id, name, canonical_name, display_name, confidence_score")
                .in("id", capabilityIds);

            if (capabilityError) {
                return NextResponse.json(
                    { error: `Failed to load capabilities: ${capabilityError.message}` },
                    { status: 500 },
                );
            }
            capabilityRows = (capabilityRowsRaw ?? []) as unknown as CapabilityRow[];
        }

        const signalsByEvidencePiece = new Map<string, EvidenceSignalRow[]>();
        for (const signal of signalRows) {
            const bucket = signalsByEvidencePiece.get(signal.evidence_piece_id) ?? [];
            bucket.push(signal);
            signalsByEvidencePiece.set(signal.evidence_piece_id, bucket);
        }

        const linksBySignal = new Map<string, CapabilitySignalLinkRow[]>();
        for (const link of linkRows) {
            const bucket = linksBySignal.get(link.evidence_signal_id) ?? [];
            bucket.push(link);
            linksBySignal.set(link.evidence_signal_id, bucket);
        }

        const capabilitiesById = new Map<string, CapabilityRow>(
            capabilityRows.map((capability) => [capability.id, capability]),
        );

        const samples = evidenceRows.map((piece) => {
            const extractedSignals = (signalsByEvidencePiece.get(piece.id) ?? []).map((signal) => ({
                id: signal.id,
                action: signal.action,
                domain: signal.domain,
                initiative_type: signal.initiative_type,
                scope_level: signal.scope_level,
                ownership_level: signal.ownership_level,
                stakeholder_scope: toStringArray(signal.stakeholder_scope),
                tool_signals: toStringArray(signal.tool_signals),
                capability_hints: toStringArray(signal.capability_hints),
                team_signal: signal.team_signal,
                impact_signal: signal.impact_signal,
                confidence_score: signal.confidence_score,
            }));

            const traceabilityChain = extractedSignals.flatMap((signal) => {
                const links = linksBySignal.get(signal.id) ?? [];
                return links.map((link) => {
                    const capability = capabilitiesById.get(link.capability_id);
                    return {
                        capability: {
                            id: link.capability_id,
                            name: capability?.name ?? null,
                            canonical_name: capability?.canonical_name ?? null,
                            display_name: capability?.display_name ?? null,
                            confidence_score: capability?.confidence_score ?? null,
                        },
                        signal: {
                            id: signal.id,
                            scope_level: signal.scope_level,
                            ownership_level: signal.ownership_level,
                            impact_signal: signal.impact_signal,
                        },
                        evidence_piece: {
                            id: piece.id,
                        },
                        link: {
                            contribution_weight: link.contribution_weight,
                            rationale: link.rationale,
                        },
                        path: `${capability?.name ?? link.capability_id} -> ${signal.id} -> ${piece.id}`,
                    };
                });
            });

            const inferredCapabilities = Array.from(
                new Map(
                    traceabilityChain.map((item) => [
                        item.capability.id,
                        item.capability,
                    ]),
                ).values(),
            );

            return {
                evidence_piece: {
                    id: piece.id,
                    raw_text: piece.raw_text,
                },
                extracted_evidence_signals: extractedSignals,
                inferred_capabilities: inferredCapabilities,
                traceability_chain: traceabilityChain,
            };
        });

        return NextResponse.json({
            career_id: careerId,
            sample_size: samples.length,
            limit,
            samples,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 });
    }
}
