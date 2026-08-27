import assert from "node:assert/strict";
import test from "node:test";
import {
    ATOMIC_EVIDENCE_CONTRACT_VERSION,
    ingestCanonicalAtomicEvidence,
    sha256,
    type AtomicEvidenceIngestionRequest,
    type AtomicEvidenceMaterialization,
    type AtomicEvidenceProvider,
    type AtomicEvidenceProviderResponse,
    type AtomicEvidenceReload,
    type AtomicEvidenceRepository,
} from "../../lib/career-engine/evidence/atomic-evidence-ingestion";
import {
    ATOMIC_EVIDENCE_GEMINI_MODEL,
    ATOMIC_EVIDENCE_GEMINI_PROVIDER_VERSION,
    createAtomicEvidenceGeminiProvider,
} from "../../lib/career-engine/evidence/atomic-evidence-gemini-provider";
import {
    SYNTHETIC_ATOMIC_PROVIDER_RESPONSE,
    SYNTHETIC_ATOMIC_ROLES,
    SYNTHETIC_ATOMIC_SOURCE_UNITS,
    SYNTHETIC_SOURCE_REVISION_SHA256,
} from "./fixtures/atomic-evidence-ingestion.synthetic";

function clone<T>(value: T): T {
    return structuredClone(value);
}

class MemoryRepository implements AtomicEvidenceRepository {
    readonly materializations = new Map<string, AtomicEvidenceReload>();
    persistCount = 0;

    private key(careerId: string, sourceRevisionSha256: string): string {
        return `${careerId}::${sourceRevisionSha256}`;
    }

    async loadBySourceRevision(input: { careerId: string; sourceRevisionSha256: string }): Promise<AtomicEvidenceReload | null> {
        return clone(this.materializations.get(this.key(input.careerId, input.sourceRevisionSha256)) ?? null);
    }

    async persist(materialization: AtomicEvidenceMaterialization): Promise<void> {
        this.persistCount += 1;
        this.materializations.set(this.key(materialization.careerId, materialization.sourceRevisionSha256), clone(materialization));
    }
}

function requestFor(sourceRevisionSha256 = SYNTHETIC_SOURCE_REVISION_SHA256): AtomicEvidenceIngestionRequest {
    return {
        contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
        careerId: "00000000-0000-4000-8000-000000000001",
        resumeId: "00000000-0000-4000-8000-000000000002",
        sourceRevisionSha256,
        roles: clone(SYNTHETIC_ATOMIC_ROLES),
        sourceUnits: clone(SYNTHETIC_ATOMIC_SOURCE_UNITS),
    };
}

function providerFor(response: AtomicEvidenceProviderResponse, calls = { count: 0 }): AtomicEvidenceProvider {
    return {
        async atomize() {
            calls.count += 1;
            return clone(response);
        },
    };
}

test("materializes the privacy-safe 6-role / 14-unit / 21-fact topology and reloads it", async () => {
    const repository = new MemoryRepository();
    const result = await ingestCanonicalAtomicEvidence(requestFor(), {
        provider: providerFor(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE),
        repository,
    });

    assert.equal(result.reconciliation.roleCount, 6);
    assert.equal(result.reconciliation.sourceUnitCount, 14);
    assert.equal(result.reconciliation.evidenceCount, 21);
    assert.equal(result.reconciliation.unknownFateCount, 0);
    assert.equal(result.reconciliation.duplicateEvidenceIdCount, 0);
    assert.equal(result.reconciliation.crossRoleAttributionCount, 0);
    assert.equal(result.reconciliation.reloadMatches, true);
    assert.equal(result.materialization.sourceUnits.every((unit) => unit.fate === "ATOMIC_EVIDENCE_CREATED"), true);
    assert.equal(new Set(result.materialization.evidence.map((item) => item.sourceUnitId)).size, 14);
});

test("production provider requests strict JSON and deterministically bounds exact quotes", async () => {
    let capturedInput: Record<string, unknown> | null = null;
    const fixtureUnit = SYNTHETIC_ATOMIC_SOURCE_UNITS[0];
    const fixtureEvidence = SYNTHETIC_ATOMIC_PROVIDER_RESPONSE.units[0].evidence[0];
    const provider = createAtomicEvidenceGeminiProvider(
        (() => async (input: Record<string, unknown>) => {
            capturedInput = input;
            return {
                text: JSON.stringify({
                    units: [{
                        ...SYNTHETIC_ATOMIC_PROVIDER_RESPONSE.units[0],
                        evidence: [{ ...fixtureEvidence, sourceSpanStart: 999, sourceSpanEnd: 1000 }],
                    }],
                }),
            };
        }) as never,
        () => "synthetic-api-key",
    );
    const response = await provider.atomize({
        contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
        sourceRevisionSha256: SYNTHETIC_SOURCE_REVISION_SHA256,
        roles: [SYNTHETIC_ATOMIC_ROLES[0]],
        sourceUnits: [fixtureUnit],
    });
    const expectedStart = fixtureUnit.sourceText.indexOf(fixtureEvidence.sourceQuote);
    assert.equal(response.providerVersion, ATOMIC_EVIDENCE_GEMINI_PROVIDER_VERSION);
    assert.equal(response.model, ATOMIC_EVIDENCE_GEMINI_MODEL);
    assert.equal(response.units[0].evidence[0].sourceSpanStart, expectedStart);
    assert.equal(response.units[0].evidence[0].sourceSpanEnd, expectedStart + fixtureEvidence.sourceQuote.length);
    assert.equal((capturedInput as { config?: { responseMimeType?: string } } | null)?.config?.responseMimeType, "application/json");
    assert.ok((capturedInput as { config?: { responseSchema?: unknown } } | null)?.config?.responseSchema);
});

test("same-revision ingestion is idempotent and preserves evidence identities", async () => {
    const repository = new MemoryRepository();
    const calls = { count: 0 };
    const provider = providerFor(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE, calls);
    const first = await ingestCanonicalAtomicEvidence(requestFor(), { provider, repository });
    const second = await ingestCanonicalAtomicEvidence(requestFor(), { provider, repository });

    assert.equal(first.idempotentReplay, false);
    assert.equal(second.idempotentReplay, true);
    assert.equal(calls.count, 1);
    assert.equal(repository.persistCount, 1);
    assert.deepEqual(second.materialization.evidence.map((item) => item.id), first.materialization.evidence.map((item) => item.id));
    assert.deepEqual(second.materialization.sourceUnits.map((item) => item.id), first.materialization.sourceUnits.map((item) => item.id));
});

test("same-revision reconciliation rejects conflicting deterministic evidence identity and ownership", async () => {
    const repository = new MemoryRepository();
    const request = requestFor();
    const provider = providerFor(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE);
    const first = await ingestCanonicalAtomicEvidence(request, { provider, repository });
    const corrupted = clone(first.materialization);
    corrupted.evidence[0].id = "00000000-0000-4000-8000-999999999999";
    corrupted.evidence[1].sourceUnitId = corrupted.sourceUnits[1].id;
    repository.materializations.set(`${request.careerId}::${request.sourceRevisionSha256}`, corrupted);
    await assert.rejects(
        ingestCanonicalAtomicEvidence(request, { provider, repository }),
        /failed reconciliation/,
    );
});

test("a new source revision creates a distinct versioned materialization", async () => {
    const repository = new MemoryRepository();
    const provider = providerFor(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE);
    const first = await ingestCanonicalAtomicEvidence(requestFor(), { provider, repository });
    const second = await ingestCanonicalAtomicEvidence(requestFor(sha256("synthetic source revision two")), { provider, repository });

    assert.equal(repository.materializations.size, 2);
    assert.notDeepEqual(second.materialization.evidence.map((item) => item.id), first.materialization.evidence.map((item) => item.id));
    assert.notDeepEqual(second.materialization.experiences.map((item) => item.id), first.materialization.experiences.map((item) => item.id));
});

const rejectionCases: Array<{
    name: string;
    expectedCode: string;
    mutate(response: AtomicEvidenceProviderResponse): void;
}> = [
    {
        name: "source quote outside its source unit",
        expectedCode: "SOURCE_QUOTE_NOT_PRESENT",
        mutate(response) { response.units[0].evidence[0].sourceQuote = "invented quote"; },
    },
    {
        name: "cross-role attribution",
        expectedCode: "CROSS_ROLE_ATTRIBUTION",
        mutate(response) { response.units[0].evidence[0].roleRef = "ROLE_02"; },
    },
    {
        name: "invented metric",
        expectedCode: "INVENTED_OR_UNSUPPORTED_METRIC",
        mutate(response) { response.units[0].evidence[0].sourceSupportedMetrics = ["99%"]; },
    },
    {
        name: "empty context",
        expectedCode: "EMPTY_CONTEXT",
        mutate(response) { response.units[0].evidence[0].context = ""; },
    },
    {
        name: "empty action",
        expectedCode: "EMPTY_ACTION",
        mutate(response) { response.units[0].evidence[0].action = ""; },
    },
    {
        name: "tool-only fragment",
        expectedCode: "TOOL_OR_METHOD_ONLY_FRAGMENT",
        mutate(response) {
            response.units[0].evidence[0].action = "used SQL";
            response.units[0].evidence[0].outcome = null;
        },
    },
    {
        name: "detached outcome",
        expectedCode: "OUTCOME_DETACHED_FROM_ACTION",
        mutate(response) { response.units[0].evidence[0].atomicStatement = "Led a service rollout."; },
    },
    {
        name: "duplicate atomic statement",
        expectedCode: "DUPLICATE_ATOMIC_STATEMENT",
        mutate(response) {
            const first = response.units[0].evidence[0];
            const second = response.units[1].evidence[0];
            second.atomicStatement = first.atomicStatement;
        },
    },
];

for (const rejectionCase of rejectionCases) {
    test(`validator rejects ${rejectionCase.name}`, async () => {
        const response = clone(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE);
        rejectionCase.mutate(response);
        const result = await ingestCanonicalAtomicEvidence(requestFor(), {
            provider: providerFor(response),
            repository: new MemoryRepository(),
        });
        const rejectedUnits = result.materialization.sourceUnits.filter((unit) => unit.fate === "VALIDATION_REJECTED");
        assert.ok(rejectedUnits.length > 0);
        assert.equal(rejectedUnits.some((unit) => unit.validationErrors.includes(rejectionCase.expectedCode)), true);
        assert.equal(result.materialization.evidence.some((item) => rejectedUnits.some((unit) => unit.id === item.sourceUnitId)), false);
    });
}

test("provider failure gives every source unit an explicit PROVIDER_FAILURE fate", async () => {
    const repository = new MemoryRepository();
    const result = await ingestCanonicalAtomicEvidence(requestFor(), {
        provider: { async atomize() { throw new Error("synthetic provider failure"); } },
        repository,
    });
    assert.equal(result.materialization.sourceUnits.length, 14);
    assert.equal(result.materialization.sourceUnits.every((unit) => unit.fate === "PROVIDER_FAILURE"), true);
    assert.equal(result.materialization.evidence.length, 0);
});

test("a same-revision retry can replace a persisted provider failure", async () => {
    const repository = new MemoryRepository();
    let calls = 0;
    const provider: AtomicEvidenceProvider = {
        async atomize() {
            calls += 1;
            if (calls === 1) throw new Error("transient synthetic provider failure");
            return clone(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE);
        },
    };
    const first = await ingestCanonicalAtomicEvidence(requestFor(), { provider, repository });
    const second = await ingestCanonicalAtomicEvidence(requestFor(), { provider, repository });
    assert.equal(first.materialization.sourceUnits.every((unit) => unit.fate === "PROVIDER_FAILURE"), true);
    assert.equal(second.materialization.evidence.length, 21);
    assert.equal(second.materialization.sourceUnits.every((unit) => unit.fate === "ATOMIC_EVIDENCE_CREATED"), true);
    assert.equal(calls, 2);
    assert.equal(repository.persistCount, 2);
});

test("VALID_NO_EVIDENCE and AMBIGUOUS fates persist without fabricated evidence", async () => {
    const response = clone(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE);
    response.units[12] = { ...response.units[12], fate: "VALID_NO_EVIDENCE", evidence: [] };
    response.units[13] = { ...response.units[13], fate: "AMBIGUOUS", evidence: [] };
    const result = await ingestCanonicalAtomicEvidence(requestFor(), {
        provider: providerFor(response),
        repository: new MemoryRepository(),
    });
    assert.equal(result.materialization.sourceUnits.find((unit) => unit.sourceUnitRef === "SOURCE_013")?.fate, "VALID_NO_EVIDENCE");
    assert.equal(result.materialization.sourceUnits.find((unit) => unit.sourceUnitRef === "SOURCE_014")?.fate, "AMBIGUOUS");
    assert.equal(result.materialization.evidence.some((item) => item.sourceUnitRef === "SOURCE_013" || item.sourceUnitRef === "SOURCE_014"), false);
});
