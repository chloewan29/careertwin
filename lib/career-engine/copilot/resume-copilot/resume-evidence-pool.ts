import { getEvidenceForCapability, getTopCapabilitiesForCareer } from "@/lib/career-engine/capability/capability-graph";
import type { ResumeCopilotIntelligenceContext, ResumeEvidencePoolEntry } from "./resume-copilot-types";

function dedupePoolEntries(entries: ResumeEvidencePoolEntry[]): ResumeEvidencePoolEntry[] {
    const byId = new Map<string, ResumeEvidencePoolEntry>();
    for (const entry of entries) {
        const existing = byId.get(entry.evidence.id);
        if (!existing) {
            byId.set(entry.evidence.id, {
                evidence: entry.evidence,
                poolSources: Array.from(new Set(entry.poolSources)),
            });
            continue;
        }

        existing.poolSources = Array.from(new Set([...existing.poolSources, ...entry.poolSources]));
    }
    return Array.from(byId.values());
}

export function buildResumeEvidencePool(params: {
    intelligence: ResumeCopilotIntelligenceContext;
    topCapabilitiesLimit?: number;
    includeLegacyFallback?: boolean;
}): {
    entries: ResumeEvidencePoolEntry[];
    poolSourceCounts: Record<string, number>;
    fallbackUsed: boolean;
} {
    const topCapabilitiesLimit = Math.max(1, params.topCapabilitiesLimit ?? 5);
    const includeLegacyFallback = params.includeLegacyFallback ?? true;
    const entries: ResumeEvidencePoolEntry[] = [];
    const evidenceById = new Map(
        params.intelligence.careerGraph.evidencePieces.map((evidence) => [evidence.id, evidence]),
    );

    const capabilityMatch = params.intelligence.capabilityMatch;
    if (capabilityMatch) {
        const prioritizedMatchItems = [
            ...capabilityMatch.matched_strengths,
            ...capabilityMatch.partial_matches,
        ];
        for (const item of prioritizedMatchItems) {
            const sourcePrefix = item.match_status === "strong" ? "capability_match.strong" : "capability_match.partial";
            for (const supportingSignal of item.top_supporting_signals) {
                const evidence = evidenceById.get(supportingSignal.evidence_piece_id);
                if (!evidence) continue;
                entries.push({
                    evidence,
                    poolSources: [
                        `${sourcePrefix}:${item.canonical_name}`,
                        `capability_signal:${supportingSignal.evidence_signal_id}`,
                    ],
                });
            }
        }
    }

    if (includeLegacyFallback) {
        for (const evidence of params.intelligence.roleFit?.supportingEvidence ?? []) {
            entries.push({ evidence, poolSources: ["role_fit.supportingEvidence"] });
        }

        for (const evidence of params.intelligence.careerSignals?.evidenceHighlights ?? []) {
            entries.push({ evidence, poolSources: ["career_signals.evidenceHighlights"] });
        }
    }

    const topCapabilities = getTopCapabilitiesForCareer(
        params.intelligence.careerGraph,
        topCapabilitiesLimit,
    );
    for (const rankedCapability of topCapabilities) {
        const capabilityEvidence = getEvidenceForCapability(
            params.intelligence.careerGraph,
            rankedCapability.capability.id,
        );
        for (const evidence of capabilityEvidence) {
            entries.push({
                evidence,
                poolSources: [`top_capability:${rankedCapability.capability.normalized_name}`],
            });
        }
    }

    let deduped = dedupePoolEntries(entries);
    let fallbackUsed = false;

    if (deduped.length === 0) {
        // Deterministic fallback ordering from persisted career graph memory.
        deduped = params.intelligence.careerGraph.evidencePieces.map((evidence) => ({
            evidence,
            poolSources: ["fallback:careerGraph.evidencePieces"],
        }));
        fallbackUsed = deduped.length > 0;
    }

    const poolSourceCounts: Record<string, number> = {};
    for (const entry of deduped) {
        for (const source of entry.poolSources) {
            poolSourceCounts[source] = (poolSourceCounts[source] ?? 0) + 1;
        }
    }

    return {
        entries: deduped,
        poolSourceCounts,
        fallbackUsed,
    };
}
