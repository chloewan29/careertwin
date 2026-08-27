import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    ATOMIC_EVIDENCE_CONTRACT_VERSION,
    ingestCanonicalAtomicEvidence,
    type AtomicEvidenceReload,
    type AtomicEvidenceRepository,
} from "../../lib/career-engine/evidence/atomic-evidence-ingestion";
import {
    buildAtomicCareerMemoryPublication,
    publicationCounts,
    publishAtomicCareerMemory,
} from "../../lib/career-engine/evidence/transactional-career-memory-publication";
import { loadWithStablePublicationToken } from "../../lib/career-engine/memory/career-graph-loader";
import {
    SYNTHETIC_ATOMIC_PROVIDER_RESPONSE,
    SYNTHETIC_ATOMIC_ROLES,
    SYNTHETIC_ATOMIC_SOURCE_UNITS,
    SYNTHETIC_SOURCE_REVISION_SHA256,
} from "./fixtures/atomic-evidence-ingestion.synthetic";

async function materialization(): Promise<AtomicEvidenceReload> {
    let stored: AtomicEvidenceReload | null = null;
    const repository: AtomicEvidenceRepository = {
        async loadBySourceRevision() { return stored; },
        async persist(value) { stored = structuredClone(value); },
    };
    return (await ingestCanonicalAtomicEvidence({
        contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
        careerId: "30000000-0000-4000-8000-000000000001",
        resumeId: "30000000-0000-4000-8000-000000000002",
        sourceRevisionSha256: SYNTHETIC_SOURCE_REVISION_SHA256,
        roles: structuredClone(SYNTHETIC_ATOMIC_ROLES),
        sourceUnits: structuredClone(SYNTHETIC_ATOMIC_SOURCE_UNITS),
    }, {
        provider: { async atomize() { return structuredClone(SYNTHETIC_ATOMIC_PROVIDER_RESPONSE); } },
        repository,
    })).materialization;
}

test("publication payload has deterministic, closed canonical and derived identity sets", async () => {
    const atomic = await materialization();
    const input = {
        materialization: atomic,
        expectedPreviousActiveResumeId: "30000000-0000-4000-8000-000000000099",
        profile: {
            id: "30000000-0000-4000-8000-000000000003",
            user_id: "30000000-0000-4000-8000-000000000004",
            current_title: "Synthetic leader",
            years_experience: 12,
            seniority_level: "senior",
            industry: "synthetic",
            summary: "Synthetic publication test profile",
            companies: [],
            capabilities: [],
            capability_evidence: {},
        },
        resume: {
            id: atomic.resumeId,
            user_id: "30000000-0000-4000-8000-000000000004",
            profile_id: "30000000-0000-4000-8000-000000000003",
            file_name: "synthetic.pdf",
            file_url: null,
            raw_text: "synthetic",
            parsed_json: {},
            content_sha256: atomic.sourceRevisionSha256,
        },
        career: {
            id: atomic.careerId,
            user_id: "30000000-0000-4000-8000-000000000004",
            headline: "Synthetic leader",
            summary: "Synthetic publication test profile",
            total_years_experience: 12,
        },
        hasBusinessContext: true,
    } as const;
    const first = buildAtomicCareerMemoryPublication(input);
    const second = buildAtomicCareerMemoryPublication(input);
    assert.deepEqual(second, first);
    assert.equal(first.experiences.length, 6);
    assert.equal(first.source_units.length, 14);
    assert.equal(first.evidence.length, 21);
    assert.equal(new Set(first.signals.map((row) => row.id)).size, first.signals.length);
    assert.equal(new Set(first.capabilities.map((row) => row.id)).size, first.capabilities.length);
    const evidenceIds = new Set(first.evidence.map((row) => row.id));
    const signalIds = new Set(first.signals.map((row) => row.id));
    const capabilityIds = new Set(first.capabilities.map((row) => row.id));
    assert.equal(first.signals.every((row) => evidenceIds.has(row.evidence_piece_id)), true);
    assert.equal(first.capability_evidence_links.every((row) => capabilityIds.has(row.capability_id) && evidenceIds.has(row.evidence_piece_id)), true);
    assert.equal(first.capability_signal_links.every((row) => capabilityIds.has(row.capability_id) && signalIds.has(row.evidence_signal_id)), true);
});

test("publication client makes exactly one RPC call and preserves outcomes", async () => {
    const atomic = await materialization();
    const payload = buildAtomicCareerMemoryPublication({
        materialization: atomic,
        expectedPreviousActiveResumeId: null,
        profile: { id: "30000000-0000-4000-8000-000000000003", user_id: "30000000-0000-4000-8000-000000000004", current_title: null, years_experience: null, seniority_level: null, industry: null, summary: null, companies: [], capabilities: [], capability_evidence: {} },
        resume: { id: atomic.resumeId, user_id: "30000000-0000-4000-8000-000000000004", profile_id: "30000000-0000-4000-8000-000000000003", file_name: "synthetic.pdf", file_url: null, raw_text: "synthetic", parsed_json: {}, content_sha256: atomic.sourceRevisionSha256 },
        career: { id: atomic.careerId, user_id: "30000000-0000-4000-8000-000000000004", headline: null, summary: null, total_years_experience: null },
        hasBusinessContext: true,
    });
    const calls: unknown[] = [];
    const result = await publishAtomicCareerMemory({
        async rpc(name: string, args: unknown) {
            calls.push({ name, args });
            return { data: { outcome: "PUBLISHED", career_id: atomic.careerId, resume_id: atomic.resumeId, revision: atomic.sourceRevisionSha256, active_resume_id: atomic.resumeId, fingerprint: "f".repeat(64), counts: publicationCounts(payload) }, error: null } as never;
        },
    } as never, payload);
    assert.equal(calls.length, 1);
    assert.equal((calls[0] as { name: string }).name, "publish_atomic_career_memory");
    assert.equal(result.outcome, "PUBLISHED");
});

test("unknown post-commit response loss retries as COMPLETE_REPLAY without another publication shape", async () => {
    const atomic = await materialization();
    const payload = buildAtomicCareerMemoryPublication({
        materialization: atomic,
        expectedPreviousActiveResumeId: null,
        profile: { id: "30000000-0000-4000-8000-000000000003", user_id: "30000000-0000-4000-8000-000000000004", current_title: null, years_experience: null, seniority_level: null, industry: null, summary: null, companies: [], capabilities: [], capability_evidence: {} },
        resume: { id: atomic.resumeId, user_id: "30000000-0000-4000-8000-000000000004", profile_id: "30000000-0000-4000-8000-000000000003", file_name: "synthetic.pdf", file_url: null, raw_text: "synthetic", parsed_json: {}, content_sha256: atomic.sourceRevisionSha256 },
        career: { id: atomic.careerId, user_id: "30000000-0000-4000-8000-000000000004", headline: null, summary: null, total_years_experience: null },
        hasBusinessContext: true,
    });
    let calls = 0;
    const client = {
        async rpc() {
            calls += 1;
            if (calls === 1) return { data: null, error: { message: "connection lost after unknown commit outcome" } } as never;
            return { data: { outcome: "COMPLETE_REPLAY", career_id: atomic.careerId, resume_id: atomic.resumeId, revision: atomic.sourceRevisionSha256, active_resume_id: atomic.resumeId, fingerprint: "f".repeat(64), counts: publicationCounts(payload) }, error: null } as never;
        },
    };
    await assert.rejects(publishAtomicCareerMemory(client as never, payload), /connection lost/);
    const retry = await publishAtomicCareerMemory(client as never, payload);
    assert.equal(retry.outcome, "COMPLETE_REPLAY");
    assert.equal(calls, 2);
});

test("publication boundary fails closed for database conflicts, validation errors, and ambiguous results", async () => {
    const atomic = await materialization();
    const payload = buildAtomicCareerMemoryPublication({
        materialization: atomic,
        expectedPreviousActiveResumeId: null,
        profile: { id: "30000000-0000-4000-8000-000000000003", user_id: "30000000-0000-4000-8000-000000000004", current_title: null, years_experience: null, seniority_level: null, industry: null, summary: null, companies: [], capabilities: [], capability_evidence: {} },
        resume: { id: atomic.resumeId, user_id: "30000000-0000-4000-8000-000000000004", profile_id: "30000000-0000-4000-8000-000000000003", file_name: "synthetic.pdf", file_url: null, raw_text: "synthetic", parsed_json: {}, content_sha256: atomic.sourceRevisionSha256 },
        career: { id: atomic.careerId, user_id: "30000000-0000-4000-8000-000000000004", headline: null, summary: null, total_years_experience: null },
        hasBusinessContext: true,
    });
    for (const message of ["CTPUB_STALE_WRITER", "CTPUB_INVALID_PAYLOAD", "connection reset before commit"]) {
        await assert.rejects(
            publishAtomicCareerMemory({ async rpc() { return { data: null, error: { message } } as never; } } as never, payload),
            new RegExp(message),
        );
    }
    await assert.rejects(
        publishAtomicCareerMemory({
            async rpc() {
                return { data: { outcome: "PUBLISHED", career_id: atomic.careerId, resume_id: atomic.resumeId, revision: atomic.sourceRevisionSha256, active_resume_id: atomic.resumeId, fingerprint: "f".repeat(64), counts: { experiences: 0 } }, error: null } as never;
            },
        } as never, payload),
        /mismatched result/,
    );
});

test("reader guard retries a changed token, succeeds when stable, and fails closed on repeated instability", async () => {
    const tokens = ["A", "B", "B", "B"];
    let loads = 0;
    const value = await loadWithStablePublicationToken(async () => tokens.shift()!, async () => ++loads);
    assert.equal(value, 2);
    assert.equal(loads, 2);

    let token = 0;
    await assert.rejects(
        loadWithStablePublicationToken(async () => String(token++), async () => "mixed", 3),
        /changed during every bounded read attempt/,
    );
});

test("provider-failure materialization remains review-only and cannot replace derived state", async () => {
    let stored: AtomicEvidenceReload | null = null;
    const result = await ingestCanonicalAtomicEvidence({
        contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
        careerId: "30000000-0000-4000-8000-000000000001",
        resumeId: "30000000-0000-4000-8000-000000000002",
        sourceRevisionSha256: SYNTHETIC_SOURCE_REVISION_SHA256,
        roles: structuredClone(SYNTHETIC_ATOMIC_ROLES),
        sourceUnits: structuredClone(SYNTHETIC_ATOMIC_SOURCE_UNITS),
    }, {
        provider: { async atomize() { throw new Error("synthetic provider outage"); } },
        repository: { async loadBySourceRevision() { return stored; }, async persist(value) { stored = structuredClone(value); } },
    });
    const payload = buildAtomicCareerMemoryPublication({
        materialization: result.materialization,
        expectedPreviousActiveResumeId: "30000000-0000-4000-8000-000000000099",
        profile: { id: "30000000-0000-4000-8000-000000000003", user_id: "30000000-0000-4000-8000-000000000004", current_title: null, years_experience: null, seniority_level: null, industry: null, summary: null, companies: [], capabilities: [], capability_evidence: {} },
        resume: { id: result.materialization.resumeId, user_id: "30000000-0000-4000-8000-000000000004", profile_id: "30000000-0000-4000-8000-000000000003", file_name: "synthetic.pdf", file_url: null, raw_text: "synthetic", parsed_json: {}, content_sha256: result.materialization.sourceRevisionSha256 },
        career: { id: result.materialization.careerId, user_id: "30000000-0000-4000-8000-000000000004", headline: null, summary: null, total_years_experience: null },
        hasBusinessContext: true,
    });
    assert.equal(payload.materialization_status, "needs_review");
    assert.equal(payload.signals.length, 0);
    assert.equal(payload.capabilities.length, 0);
    assert.equal(payload.capability_evidence_links.length, 0);
    assert.equal(payload.capability_signal_links.length, 0);
});

test("route contains one transactional publication boundary and no direct derived-state mutation", async () => {
    const route = await readFile(new URL("../../app/api/parse-resume/route.ts", import.meta.url), "utf8");
    assert.equal((route.match(/publishAtomicCareerMemory\(/g) ?? []).length, 1);
    for (const table of ["capabilities", "evidence_signals", "capability_evidence_links", "capability_signal_links"]) {
        assert.equal(route.includes(`.from(\"${table}\")`), false, `${table} must be published only inside the RPC`);
    }
    assert.equal(route.includes(".update({ active_resume_id"), false);
    assert.equal(route.includes("materialization_status: \"completed\""), false);
    assert.match(route, /idempotentReplay: publicationResult\.outcome === "COMPLETE_REPLAY"/);
    assert.match(route, /success: true,[\s\S]*atomicEvidence: atomicEvidenceSummary,[\s\S]*resume: \{/);
});

test("every root column written by the publication RPC is covered by the replay ownership manifest", async () => {
    const migration = await readFile(new URL(
        "../../supabase/migrations/20260827100000_add_transactional_career_memory_publication.sql",
        import.meta.url,
    ), "utf8");

    const insertColumns = (table: string): string[] => {
        const match = migration.match(new RegExp(`INSERT INTO public\\.${table} \\(([\\s\\S]*?)\\)\\s*(?:VALUES|SELECT)`));
        assert.ok(match, `missing ${table} insert`);
        return match[1].split(",").map((value) => value.trim()).filter(Boolean);
    };
    const updateColumns = (table: string): string[] => {
        const blocks = [...migration.matchAll(new RegExp(`UPDATE public\\.${table} SET([\\s\\S]*?)(?:WHERE|;\\n)`, "g"))];
        return blocks.flatMap((match) => [...match[1].matchAll(/(?:^|,)\s*([a-z_][a-z0-9_]*)\s*=/gm)]
            .map((column) => column[1]));
    };
    const uniqueSorted = (values: string[]) => [...new Set(values)].sort();

    assert.deepEqual(uniqueSorted([...insertColumns("careers"), ...updateColumns("careers")]), [
        "active_resume_id", "headline", "id", "summary", "total_years_experience", "user_id",
    ]);
    assert.deepEqual(uniqueSorted(updateColumns("profiles")), [
        "capabilities", "capability_evidence", "companies", "current_title", "display_name",
        "industry", "seniority_level", "summary", "years_experience",
    ]);
    assert.deepEqual(uniqueSorted([...insertColumns("resumes"), ...updateColumns("resumes")]), [
        "content_sha256", "file_name", "file_url", "id", "materialization_status",
        "materialization_version", "materialized_at", "parsed_json", "profile_id", "raw_text", "user_id",
    ]);

    for (const token of [
        "v_expected_profile_root", "v_actual_profile_root", "profile root mismatch",
        "v_expected_resume_root", "v_actual_resume_root", "resume root mismatch",
        "v_expected_career_root", "v_actual_career_root", "career root mismatch",
        "v_expected_publication_metadata", "v_actual_publication_metadata",
        "reserved publication metadata mismatch", "materialization_status = 'completed'",
        "materialized_at IS NOT NULL", "active_resume_id = v_resume_id",
    ]) {
        assert.equal(migration.includes(token), true, `missing replay ownership coverage: ${token}`);
    }
    for (const reservedKey of ["version", "fingerprint", "counts", "expected_previous_active_resume_id"]) {
        assert.match(migration, new RegExp(`'${reservedKey}'`));
    }
    assert.match(migration, /created_at\/updated_at and the exact materialized_at timestamp are server-managed/);
    assert.match(migration, /Unassigned legacy columns are independently mutable/);
    assert.match(migration, /display_name is conditionally[\s\S]*publication-owned/);
});
