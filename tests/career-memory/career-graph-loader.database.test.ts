import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
    DEFAULT_CAREER_GRAPH_SCHEMA_MODE,
    loadCareerGraph,
} from "../../lib/career-engine/memory/career-graph-loader";

const url = process.env.CAREERTWIN_TEST_SUPABASE_URL;
const anonKey = process.env.CAREERTWIN_TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.CAREERTWIN_TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasDatabase = Boolean(url && anonKey && serviceRoleKey);

test("canonical career graph reload uses the expanded B0 -> R0 -> atomic contract", { skip: !hasDatabase }, async () => {
    assert.equal(DEFAULT_CAREER_GRAPH_SCHEMA_MODE, "canonical");

    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

    const admin = createClient(url!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const ids = {
        user: "10000000-0000-4000-8000-000000000001",
        profile: "10000000-0000-4000-8000-000000000002",
        activeResume: "10000000-0000-4000-8000-000000000003",
        priorResume: "10000000-0000-4000-8000-000000000004",
        career: "10000000-0000-4000-8000-000000000005",
        activeExperience: "10000000-0000-4000-8000-000000000006",
        priorExperience: "10000000-0000-4000-8000-000000000007",
        sourceUnit: "10000000-0000-4000-8000-000000000008",
        activeEvidence: "10000000-0000-4000-8000-000000000009",
        priorEvidence: "10000000-0000-4000-8000-000000000010",
        activeSignal: "10000000-0000-4000-8000-000000000011",
        priorSignal: "10000000-0000-4000-8000-000000000012",
    } as const;

    const expectWrite = async (operation: PromiseLike<{ error: { message: string } | null }>, label: string) => {
        const { error } = await operation;
        assert.equal(error, null, `${label}: ${error?.message ?? "unknown database error"}`);
    };

    try {
        await expectWrite(admin.from("users").upsert({ id: ids.user }), "insert user");
        await expectWrite(admin.from("profiles").upsert({ id: ids.profile, user_id: ids.user }), "insert profile");
        await expectWrite(admin.from("resumes").upsert([
            { id: ids.activeResume, user_id: ids.user, profile_id: ids.profile, content_sha256: "a".repeat(64) },
            { id: ids.priorResume, user_id: ids.user, profile_id: ids.profile, content_sha256: "b".repeat(64) },
        ]), "insert resume revisions");
        await expectWrite(admin.from("careers").upsert({
            id: ids.career,
            user_id: ids.user,
            active_resume_id: ids.activeResume,
            headline: "Synthetic canonical graph",
        }), "insert career");
        await expectWrite(admin.from("experiences").upsert([
            {
                id: ids.activeExperience,
                career_id: ids.career,
                resume_id: ids.activeResume,
                company: "Synthetic Organization",
                title: "Synthetic Role",
                date_range: "Synthetic Period",
                source_type: "resume",
                source_revision_sha256: "a".repeat(64),
                source_role_ref: "ROLE_01",
                materialization_version: "atomic-evidence-materialization/1.0.0",
                sort_order: 0,
            },
            {
                id: ids.priorExperience,
                career_id: ids.career,
                resume_id: ids.priorResume,
                company: "Prior Synthetic Organization",
                title: "Prior Synthetic Role",
                date_range: "Prior Synthetic Period",
                source_type: "resume",
                source_revision_sha256: "b".repeat(64),
                source_role_ref: "ROLE_01",
                materialization_version: "atomic-evidence-materialization/1.0.0",
                sort_order: 0,
            },
        ]), "insert experiences");
        await expectWrite(admin.from("career_source_units").upsert({
            id: ids.sourceUnit,
            career_id: ids.career,
            resume_id: ids.activeResume,
            experience_id: ids.activeExperience,
            source_revision_sha256: "a".repeat(64),
            source_role_ref: "ROLE_01",
            source_unit_ref: "SOURCE_001",
            source_unit_ordinal: 0,
            source_unit_sha256: "c".repeat(64),
            source_text: "Synthetic source unit",
            fate: "ATOMIC_EVIDENCE_CREATED",
            provider: "synthetic-provider",
            model: "synthetic-model",
            provider_version: "synthetic-provider/1.0.0",
        }), "insert source unit");
        await expectWrite(admin.from("evidence_pieces").upsert([
            {
                id: ids.activeEvidence,
                career_id: ids.career,
                experience_id: ids.activeExperience,
                resume_id: ids.activeResume,
                company: "Synthetic Organization",
                role: "Synthetic Role",
                date_range: "Synthetic Period",
                raw_text: "Delivered a synthetic canonical outcome.",
                source_type: "resume_bullet",
                evidence_source_type: "resume",
                summary: "Synthetic summary",
                action: "Delivered a synthetic change",
                impact: "Improved a synthetic outcome",
                stakeholders: ["synthetic stakeholder"],
                tools_methods: ["synthetic method"],
                business_context: "Synthetic context",
                inferred_scale: { impact_scale: "medium" },
                inferred_scope: { delivery_level: "project" },
                confidence: 0.91,
                missing_fields: [],
                source_revision_sha256: "a".repeat(64),
                source_role_ref: "ROLE_01",
                source_unit_id: ids.sourceUnit,
                source_unit_ref: "SOURCE_001",
                source_unit_sha256: "c".repeat(64),
                source_quote: "Delivered a synthetic canonical outcome.",
                source_span_start: 0,
                source_span_end: 40,
                atomic_index: 0,
                atomic_statement: "Delivered a synthetic canonical outcome.",
                context: "Synthetic context",
                outcome: "Improved a synthetic outcome",
                source_supported_metrics: [],
                extraction_confidence: 0.91,
                provider: "synthetic-provider",
                provider_model: "synthetic-model",
                provider_version: "synthetic-provider/1.0.0",
                review_status: "machine_validated",
            },
            {
                id: ids.priorEvidence,
                career_id: ids.career,
                experience_id: ids.priorExperience,
                resume_id: ids.priorResume,
                company: "Prior Synthetic Organization",
                role: "Prior Synthetic Role",
                date_range: "Prior Synthetic Period",
                raw_text: "Prior revision evidence",
                source_type: "resume_bullet",
                evidence_source_type: "resume",
                source_supported_metrics: [],
                source_revision_sha256: "b".repeat(64),
                source_role_ref: "ROLE_01",
            },
        ]), "insert evidence revisions");
        await expectWrite(admin.from("evidence_signals").upsert([
            {
                id: ids.activeSignal,
                career_id: ids.career,
                evidence_piece_id: ids.activeEvidence,
                action: "delivered",
                scope_level: "project",
                ownership_level: "owner",
                stakeholder_scope: ["cross_functional"],
                tool_signals: ["synthetic method"],
                capability_hints: ["synthetic delivery"],
                confidence_score: 0.9,
            },
            {
                id: ids.priorSignal,
                career_id: ids.career,
                evidence_piece_id: ids.priorEvidence,
                action: "prior",
                stakeholder_scope: [],
                tool_signals: [],
                capability_hints: [],
            },
        ]), "insert evidence signals");

        const graph = await loadCareerGraph(ids.profile);
        assert.equal(graph.career?.active_resume_id, ids.activeResume);
        assert.deepEqual(graph.experiences.map((row) => row.id), [ids.activeExperience]);
        assert.deepEqual(graph.evidencePieces.map((row) => row.id), [ids.activeEvidence]);
        assert.deepEqual(graph.evidenceSignals?.map((row) => row.id), [ids.activeSignal]);

        const evidence = graph.evidencePieces[0];
        assert.equal(evidence.resume_id, ids.activeResume);
        assert.equal(evidence.source_unit_id, ids.sourceUnit);
        assert.equal(evidence.source_unit_ref, "SOURCE_001");
        assert.equal(evidence.atomic_index, 0);
        assert.equal(evidence.atomic_statement, "Delivered a synthetic canonical outcome.");
        assert.equal(evidence.context, "Synthetic context");
        assert.equal(evidence.action, "Delivered a synthetic change");
        assert.equal(evidence.outcome, "Improved a synthetic outcome");
        assert.equal(evidence.confidence, 0.91);
        assert.equal(evidence.extraction_confidence, 0.91);
        assert.deepEqual(evidence.inferred_scale, { impact_scale: "medium" });
        assert.deepEqual(evidence.inferred_scope, { delivery_level: "project" });
        assert.deepEqual(evidence.missing_fields, []);

        for (const unsupported of [
            "org_scope", "stakeholder_scope", "leadership_scope", "delivery_level",
            "impact_scale", "confidence_level", "memory_status", "evidence_authority_scope",
        ]) {
            assert.equal(Object.hasOwn(evidence, unsupported), false, `${unsupported} must not be fabricated during reload`);
        }
    } finally {
        await admin.from("careers").delete().eq("id", ids.career);
        await admin.from("resumes").delete().in("id", [ids.activeResume, ids.priorResume]);
        await admin.from("profiles").delete().eq("id", ids.profile);
        await admin.from("users").delete().eq("id", ids.user);
    }
});
