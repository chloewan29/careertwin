import type { Capability, CareerGraph, EvidencePiece, EvidenceSignal } from "../memory/career-graph-loader";

export type EvidencePieceSignalTrace = {
    evidencePiece: EvidencePiece | null;
    signals: EvidenceSignal[];
};

export type CapabilitySignalTrace = {
    capability: Capability | null;
    signals: EvidenceSignal[];
    evidencePieces: EvidencePiece[];
};

function normalizeName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveCapability(careerGraph: CareerGraph, capabilityIdOrName: string): Capability | null {
    const byId = careerGraph.capabilities.find((capability) => capability.id === capabilityIdOrName);
    if (byId) return byId;
    const normalized = normalizeName(capabilityIdOrName);
    return careerGraph.capabilities.find((capability) =>
        normalizeName(capability.name) === normalized
        || normalizeName(capability.normalized_name) === normalized
        || normalizeName(capability.canonical_name ?? "") === normalized,
    ) ?? null;
}

export function traceEvidencePieceToSignals(careerGraph: CareerGraph, evidencePieceId: string): EvidencePieceSignalTrace {
    return {
        evidencePiece: careerGraph.evidencePieces.find((piece) => piece.id === evidencePieceId) ?? null,
        signals: careerGraph.signalsByEvidencePiece?.[evidencePieceId] ?? [],
    };
}

export function traceCapabilityToSignalsAndEvidence(careerGraph: CareerGraph, capabilityIdOrName: string): CapabilitySignalTrace {
    const capability = resolveCapability(careerGraph, capabilityIdOrName);
    if (!capability) {
        return {
            capability: null,
            signals: [],
            evidencePieces: [],
        };
    }

    return {
        capability,
        signals: careerGraph.signalsByCapability?.[capability.id] ?? [],
        evidencePieces: careerGraph.evidenceByCapabilityViaSignals?.[capability.id] ?? [],
    };
}
