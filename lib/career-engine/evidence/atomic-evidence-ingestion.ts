import { createHash } from "node:crypto";

export const ATOMIC_EVIDENCE_CONTRACT_VERSION = "canonical-atomic-evidence/1.0.0" as const;
export const ATOMIC_EVIDENCE_MATERIALIZATION_VERSION = "career-memory-atomic-materialization/1.0.0" as const;

export type AtomicEvidenceFate =
    | "ATOMIC_EVIDENCE_CREATED"
    | "VALID_NO_EVIDENCE"
    | "AMBIGUOUS"
    | "PROVIDER_FAILURE"
    | "VALIDATION_REJECTED";

export type AtomicEvidenceReviewStatus = "machine_validated" | "needs_review" | "confirmed" | "rejected";

export type AtomicEvidenceRole = {
    roleRef: string;
    company: string;
    title: string;
    dateRange: string;
    sortOrder: number;
};

export type AtomicEvidenceSourceUnit = {
    sourceUnitRef: string;
    roleRef: string;
    sourceUnitOrdinal: number;
    sourceText: string;
    sourceUnitSha256: string;
};

export type AtomicEvidenceProposal = {
    roleRef: string;
    sourceUnitRef: string;
    sourceQuote: string;
    sourceSpanStart: number;
    sourceSpanEnd: number;
    atomicStatement: string;
    context: string;
    action: string;
    outcome: string | null;
    sourceSupportedMetrics: string[];
    extractionConfidence: number;
};

export type AtomicEvidenceProviderUnitResult = {
    roleRef: string;
    sourceUnitRef: string;
    fate: "ATOMIC_EVIDENCE_CREATED" | "VALID_NO_EVIDENCE" | "AMBIGUOUS";
    evidence: AtomicEvidenceProposal[];
};

export type AtomicEvidenceProviderResponse = {
    contractVersion: string;
    provider: string;
    model: string;
    providerVersion: string;
    units: AtomicEvidenceProviderUnitResult[];
};

export type AtomicEvidenceProviderRequest = {
    contractVersion: typeof ATOMIC_EVIDENCE_CONTRACT_VERSION;
    sourceRevisionSha256: string;
    roles: AtomicEvidenceRole[];
    sourceUnits: AtomicEvidenceSourceUnit[];
};

export interface AtomicEvidenceProvider {
    atomize(request: AtomicEvidenceProviderRequest): Promise<AtomicEvidenceProviderResponse>;
}

export type AtomicEvidenceExperienceRow = AtomicEvidenceRole & {
    id: string;
    sourceRevisionSha256: string;
    materializationVersion: typeof ATOMIC_EVIDENCE_MATERIALIZATION_VERSION;
};

export type AtomicEvidenceSourceUnitRow = AtomicEvidenceSourceUnit & {
    id: string;
    experienceId: string;
    sourceRevisionSha256: string;
    fate: AtomicEvidenceFate;
    provider: string;
    model: string;
    providerVersion: string;
    validationErrors: string[];
};

export type AtomicEvidenceRow = AtomicEvidenceProposal & {
    id: string;
    experienceId: string;
    sourceUnitId: string;
    sourceRevisionSha256: string;
    atomicIndex: number;
    provider: string;
    model: string;
    providerVersion: string;
    reviewStatus: AtomicEvidenceReviewStatus;
};

export type AtomicEvidenceMaterialization = {
    contractVersion: typeof ATOMIC_EVIDENCE_CONTRACT_VERSION;
    materializationVersion: typeof ATOMIC_EVIDENCE_MATERIALIZATION_VERSION;
    careerId: string;
    resumeId: string;
    sourceRevisionSha256: string;
    experiences: AtomicEvidenceExperienceRow[];
    sourceUnits: AtomicEvidenceSourceUnitRow[];
    evidence: AtomicEvidenceRow[];
};

export type AtomicEvidenceReload = Pick<AtomicEvidenceMaterialization, "careerId" | "resumeId" | "sourceRevisionSha256" | "experiences" | "sourceUnits" | "evidence">;

export interface AtomicEvidenceRepository {
    loadBySourceRevision(input: { careerId: string; sourceRevisionSha256: string }): Promise<AtomicEvidenceReload | null>;
    persist(materialization: AtomicEvidenceMaterialization): Promise<void>;
}

export type AtomicEvidenceIngestionRequest = AtomicEvidenceProviderRequest & {
    careerId: string;
    resumeId: string;
};

export type AtomicEvidenceReconciliation = {
    roleCount: number;
    sourceUnitCount: number;
    evidenceCount: number;
    unknownFateCount: number;
    duplicateEvidenceIdCount: number;
    crossRoleAttributionCount: number;
    reloadMatches: boolean;
};

export type AtomicEvidenceIngestionResult = {
    materialization: AtomicEvidenceReload;
    reconciliation: AtomicEvidenceReconciliation;
    idempotentReplay: boolean;
};

const STOP_WORDS = new Set([
    "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "through", "to", "with",
    "was", "were", "is", "are", "be", "been", "that", "this", "their", "its", "across", "using", "used",
]);

function normalizeWhitespace(value: string): string {
    return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function sha256(value: string | Uint8Array): string {
    return createHash("sha256").update(value).digest("hex");
}

export function deterministicUuid(namespace: string, ...parts: Array<string | number>): string {
    const hex = sha256([namespace, ...parts].join("\u001f")).slice(0, 32).split("");
    hex[12] = "5";
    hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const joined = hex.join("");
    return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20)}`;
}

export function buildAtomicEvidenceSourceUnit(input: Omit<AtomicEvidenceSourceUnit, "sourceText" | "sourceUnitSha256"> & { sourceText: string }): AtomicEvidenceSourceUnit {
    const sourceText = normalizeWhitespace(input.sourceText);
    return Object.freeze({ ...input, sourceText, sourceUnitSha256: sha256(sourceText) });
}

function normalizedIdentity(value: string): string {
    return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function significantTokens(value: string): string[] {
    return normalizedIdentity(value).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function isGroundedPhrase(value: string, source: string): boolean {
    const tokens = significantTokens(value);
    if (tokens.length === 0) return false;
    const sourceTokens = new Set(significantTokens(source));
    const supported = tokens.filter((token) => sourceTokens.has(token)).length;
    return supported >= 1 && supported / tokens.length >= 0.3;
}

function isToolOnlyFragment(action: string, atomicStatement: string): boolean {
    const normalized = normalizedIdentity(action);
    const bareMethod = /^(?:used|utilized|applied|worked with|proficient in|experienced with)\b/.test(normalized);
    return bareMethod && !isGroundedPhrase(action, atomicStatement);
}

function validateProposal(proposal: AtomicEvidenceProposal, sourceUnit: AtomicEvidenceSourceUnit): string[] {
    const errors: string[] = [];
    if (proposal.roleRef !== sourceUnit.roleRef) errors.push("CROSS_ROLE_ATTRIBUTION");
    if (proposal.sourceUnitRef !== sourceUnit.sourceUnitRef) errors.push("SOURCE_UNIT_REFERENCE_MISMATCH");
    const quote = normalizeWhitespace(proposal.sourceQuote);
    const source = sourceUnit.sourceText;
    if (!quote || !source.includes(quote)) errors.push("SOURCE_QUOTE_NOT_PRESENT");
    if (!Number.isInteger(proposal.sourceSpanStart) || !Number.isInteger(proposal.sourceSpanEnd)
        || proposal.sourceSpanStart < 0 || proposal.sourceSpanEnd <= proposal.sourceSpanStart
        || source.slice(proposal.sourceSpanStart, proposal.sourceSpanEnd) !== quote) {
        errors.push("SOURCE_SPAN_MISMATCH");
    }
    if (!normalizeWhitespace(proposal.atomicStatement)) errors.push("EMPTY_ATOMIC_STATEMENT");
    if (!normalizeWhitespace(proposal.context)) errors.push("EMPTY_CONTEXT");
    if (!normalizeWhitespace(proposal.action)) errors.push("EMPTY_ACTION");
    if (proposal.extractionConfidence < 0 || proposal.extractionConfidence > 1 || !Number.isFinite(proposal.extractionConfidence)) {
        errors.push("INVALID_EXTRACTION_CONFIDENCE");
    }
    if (proposal.atomicStatement && !isGroundedPhrase(proposal.atomicStatement, quote)) errors.push("ATOMIC_STATEMENT_NOT_SOURCE_GROUNDED");
    if (proposal.context && !isGroundedPhrase(proposal.context, quote)) errors.push("CONTEXT_NOT_SOURCE_GROUNDED");
    if (proposal.action && !isGroundedPhrase(proposal.action, quote)) errors.push("ACTION_NOT_SOURCE_GROUNDED");
    if (isToolOnlyFragment(proposal.action, proposal.atomicStatement)) errors.push("TOOL_OR_METHOD_ONLY_FRAGMENT");
    if (proposal.outcome !== null) {
        const outcome = normalizeWhitespace(proposal.outcome);
        if (!outcome || !isGroundedPhrase(outcome, quote)) errors.push("OUTCOME_NOT_SOURCE_GROUNDED");
        if (!isGroundedPhrase(proposal.action, proposal.atomicStatement) || !isGroundedPhrase(outcome, proposal.atomicStatement)) {
            errors.push("OUTCOME_DETACHED_FROM_ACTION");
        }
    }
    for (const metric of proposal.sourceSupportedMetrics) {
        if (!metric.trim() || !quote.includes(metric.trim())) errors.push("INVENTED_OR_UNSUPPORTED_METRIC");
    }
    return Array.from(new Set(errors));
}

function reconciliationFor(materialization: AtomicEvidenceReload, expected?: AtomicEvidenceIngestionRequest): AtomicEvidenceReconciliation {
    const evidenceIds = materialization.evidence.map((item) => item.id);
    const duplicateEvidenceIdCount = evidenceIds.length - new Set(evidenceIds).size;
    const sourceById = new Map(materialization.sourceUnits.map((unit) => [unit.id, unit]));
    const crossRoleAttributionCount = materialization.evidence.filter((item) => sourceById.get(item.sourceUnitId)?.roleRef !== item.roleRef).length;
    const knownFates = new Set<AtomicEvidenceFate>([
        "ATOMIC_EVIDENCE_CREATED", "VALID_NO_EVIDENCE", "AMBIGUOUS", "PROVIDER_FAILURE", "VALIDATION_REJECTED",
    ]);
    const unknownFateCount = materialization.sourceUnits.filter((unit) => !knownFates.has(unit.fate)).length;
    const reloadMatches = !expected || (
        materialization.careerId === expected.careerId
        && materialization.sourceRevisionSha256 === expected.sourceRevisionSha256
        && materialization.experiences.length === expected.roles.length
        && materialization.sourceUnits.length === expected.sourceUnits.length
        && new Set(materialization.sourceUnits.map((unit) => unit.sourceUnitRef)).size === expected.sourceUnits.length
        && duplicateEvidenceIdCount === 0
        && crossRoleAttributionCount === 0
        && unknownFateCount === 0
    );
    return {
        roleCount: materialization.experiences.length,
        sourceUnitCount: materialization.sourceUnits.length,
        evidenceCount: materialization.evidence.length,
        unknownFateCount,
        duplicateEvidenceIdCount,
        crossRoleAttributionCount,
        reloadMatches,
    };
}

function buildMaterialization(request: AtomicEvidenceIngestionRequest, response: AtomicEvidenceProviderResponse): AtomicEvidenceMaterialization {
    if (response.contractVersion !== ATOMIC_EVIDENCE_CONTRACT_VERSION) throw new Error("Atomic evidence provider contract version mismatch");
    if (![response.provider, response.model, response.providerVersion].every((value) => normalizeWhitespace(value).length > 0)) {
        throw new Error("Atomic evidence provider metadata is incomplete");
    }
    const rolesByRef = new Map(request.roles.map((role) => [role.roleRef, role]));
    const unitsByRef = new Map(request.sourceUnits.map((unit) => [unit.sourceUnitRef, unit]));
    const providerUnitsByRef = new Map<string, AtomicEvidenceProviderUnitResult[]>();
    for (const unit of response.units) {
        const bucket = providerUnitsByRef.get(unit.sourceUnitRef) ?? [];
        bucket.push(unit);
        providerUnitsByRef.set(unit.sourceUnitRef, bucket);
    }

    const experiences: AtomicEvidenceExperienceRow[] = request.roles.map((role) => ({
        ...role,
        id: deterministicUuid("experience", request.careerId, request.sourceRevisionSha256, role.roleRef),
        sourceRevisionSha256: request.sourceRevisionSha256,
        materializationVersion: ATOMIC_EVIDENCE_MATERIALIZATION_VERSION,
    }));
    const experienceByRole = new Map(experiences.map((experience) => [experience.roleRef, experience]));
    const seenStatements = new Set<string>();
    const sourceUnits: AtomicEvidenceSourceUnitRow[] = [];
    const evidence: AtomicEvidenceRow[] = [];

    for (const sourceUnit of request.sourceUnits) {
        const experience = experienceByRole.get(sourceUnit.roleRef);
        if (!experience || !rolesByRef.has(sourceUnit.roleRef)) throw new Error(`Unknown role for ${sourceUnit.sourceUnitRef}`);
        const sourceUnitId = deterministicUuid("source-unit", request.careerId, request.sourceRevisionSha256, sourceUnit.sourceUnitRef);
        const providerMatches = providerUnitsByRef.get(sourceUnit.sourceUnitRef) ?? [];
        const validationErrors: string[] = [];
        let fate: AtomicEvidenceFate = "VALIDATION_REJECTED";
        let accepted: AtomicEvidenceProposal[] = [];

        if (providerMatches.length !== 1) {
            validationErrors.push(providerMatches.length === 0 ? "SOURCE_UNIT_RESULT_MISSING" : "SOURCE_UNIT_RESULT_DUPLICATED");
        } else {
            const providerUnit = providerMatches[0];
            if (providerUnit.roleRef !== sourceUnit.roleRef) validationErrors.push("CROSS_ROLE_ATTRIBUTION");
            if (providerUnit.fate === "ATOMIC_EVIDENCE_CREATED") {
                if (providerUnit.evidence.length === 0) validationErrors.push("CREATED_FATE_WITHOUT_EVIDENCE");
                for (const proposal of providerUnit.evidence) {
                    validationErrors.push(...validateProposal(proposal, sourceUnit));
                    const identity = normalizedIdentity(proposal.atomicStatement);
                    if (identity && seenStatements.has(identity)) validationErrors.push("DUPLICATE_ATOMIC_STATEMENT");
                }
                if (validationErrors.length === 0) {
                    fate = "ATOMIC_EVIDENCE_CREATED";
                    accepted = providerUnit.evidence;
                    accepted.forEach((item) => seenStatements.add(normalizedIdentity(item.atomicStatement)));
                }
            } else if (providerUnit.evidence.length > 0) {
                validationErrors.push("NON_CREATED_FATE_WITH_EVIDENCE");
            } else {
                fate = providerUnit.fate;
            }
        }

        sourceUnits.push({
            ...sourceUnit,
            id: sourceUnitId,
            experienceId: experience.id,
            sourceRevisionSha256: request.sourceRevisionSha256,
            fate,
            provider: response.provider,
            model: response.model,
            providerVersion: response.providerVersion,
            validationErrors: Array.from(new Set(validationErrors)),
        });
        accepted.forEach((proposal, atomicIndex) => evidence.push({
            ...proposal,
            id: deterministicUuid("atomic-evidence", request.careerId, request.sourceRevisionSha256, sourceUnit.sourceUnitRef, atomicIndex),
            experienceId: experience.id,
            sourceUnitId,
            sourceRevisionSha256: request.sourceRevisionSha256,
            atomicIndex,
            provider: response.provider,
            model: response.model,
            providerVersion: response.providerVersion,
            reviewStatus: "machine_validated",
        }));
    }

    for (const providerUnit of response.units) {
        if (!unitsByRef.has(providerUnit.sourceUnitRef)) throw new Error(`Provider returned unknown source unit ${providerUnit.sourceUnitRef}`);
    }

    return {
        contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
        materializationVersion: ATOMIC_EVIDENCE_MATERIALIZATION_VERSION,
        careerId: request.careerId,
        resumeId: request.resumeId,
        sourceRevisionSha256: request.sourceRevisionSha256,
        experiences,
        sourceUnits,
        evidence,
    };
}

function providerFailureMaterialization(request: AtomicEvidenceIngestionRequest, error: unknown): AtomicEvidenceMaterialization {
    const message = error instanceof Error ? error.message : "Atomic evidence provider failed";
    const materialization = buildMaterialization(request, {
        contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
        provider: "unavailable",
        model: "unavailable",
        providerVersion: "unavailable",
        units: request.sourceUnits.map((unit) => ({ roleRef: unit.roleRef, sourceUnitRef: unit.sourceUnitRef, fate: "AMBIGUOUS", evidence: [] })),
    });
    for (const unit of materialization.sourceUnits) {
        unit.fate = "PROVIDER_FAILURE";
        unit.validationErrors = [message];
    }
    return materialization;
}

export async function ingestCanonicalAtomicEvidence(
    request: AtomicEvidenceIngestionRequest,
    dependencies: { provider: AtomicEvidenceProvider; repository: AtomicEvidenceRepository },
): Promise<AtomicEvidenceIngestionResult> {
    if (!/^[a-f0-9]{64}$/.test(request.sourceRevisionSha256)) throw new Error("sourceRevisionSha256 must be a lowercase SHA-256 hash");
    if (request.roles.length === 0) throw new Error("At least one validated role is required");
    if (request.sourceUnits.some((unit) => !request.roles.some((role) => role.roleRef === unit.roleRef))) throw new Error("Every source unit must reference a validated role");
    if (new Set(request.roles.map((role) => role.roleRef)).size !== request.roles.length) throw new Error("Duplicate role references are not allowed");
    if (new Set(request.sourceUnits.map((unit) => unit.sourceUnitRef)).size !== request.sourceUnits.length) throw new Error("Duplicate source unit references are not allowed");
    if (request.sourceUnits.some((unit) => unit.sourceUnitSha256 !== sha256(normalizeWhitespace(unit.sourceText)))) throw new Error("Source unit fingerprint mismatch");

    const existing = await dependencies.repository.loadBySourceRevision({ careerId: request.careerId, sourceRevisionSha256: request.sourceRevisionSha256 });
    const retryableProviderFailure = existing?.sourceUnits.some((unit) => unit.fate === "PROVIDER_FAILURE") ?? false;
    if (existing && !retryableProviderFailure) {
        const reconciliation = reconciliationFor(existing, request);
        if (!reconciliation.reloadMatches) throw new Error("Existing atomic evidence materialization failed reconciliation");
        return { materialization: existing, reconciliation, idempotentReplay: true };
    }

    let materialization: AtomicEvidenceMaterialization;
    try {
        const response = await dependencies.provider.atomize({
            contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
            sourceRevisionSha256: request.sourceRevisionSha256,
            roles: request.roles,
            sourceUnits: request.sourceUnits,
        });
        materialization = buildMaterialization(request, response);
    } catch (error) {
        materialization = providerFailureMaterialization(request, error);
    }

    await dependencies.repository.persist(materialization);
    const reloaded = await dependencies.repository.loadBySourceRevision({ careerId: request.careerId, sourceRevisionSha256: request.sourceRevisionSha256 });
    if (!reloaded) throw new Error("Atomic evidence materialization could not be reloaded");
    const reconciliation = reconciliationFor(reloaded, request);
    if (!reconciliation.reloadMatches) throw new Error("Atomic evidence database reload reconciliation failed");
    return { materialization: reloaded, reconciliation, idempotentReplay: false };
}
