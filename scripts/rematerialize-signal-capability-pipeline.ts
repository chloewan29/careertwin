import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractEvidenceSignalsFromPieces } from "@/lib/career-engine/evidence/evidence-signals";
import { inferCapabilities } from "@/lib/career-engine/capability/capability-inference";

function normalizeCapabilityName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function loadEnvLocal(): void {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function parseArgs(): { careerId: string | null } {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        careerId: readArg("--careerId"),
    };
}

function dominant(values: string[]): string {
    if (values.length === 0) return "unknown";
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

type SupabaseClient = ReturnType<typeof createClient>;

type TableSchema = {
    table: string;
    columns: Set<string>;
};

async function tableExists(supabase: SupabaseClient, table: string): Promise<boolean> {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (!error) return true;
    if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) return false;
    throw new Error(`Failed probing table ${table}: ${error.message}`);
}

async function tableHasColumn(supabase: SupabaseClient, table: string, column: string): Promise<boolean> {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (!error) return true;
    if (error.code === "42703" || /column .* does not exist/i.test(error.message)) return false;
    if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) return false;
    throw new Error(`Failed probing ${table}.${column}: ${error.message}`);
}

async function detectTableSchema(supabase: SupabaseClient, table: string, candidates: string[]): Promise<TableSchema> {
    const exists = await tableExists(supabase, table);
    if (!exists) return { table, columns: new Set<string>() };

    const columns = new Set<string>();
    for (const candidate of candidates) {
        if (await tableHasColumn(supabase, table, candidate)) {
            columns.add(candidate);
        }
    }
    return { table, columns };
}

function pickColumns(schema: TableSchema, requested: string[]): string[] {
    return requested.filter((column) => schema.columns.has(column));
}

function pickObjectColumns<T extends Record<string, unknown>>(schema: TableSchema, source: T): Partial<T> {
    const out: Partial<T> = {};
    for (const [key, value] of Object.entries(source)) {
        if (schema.columns.has(key)) {
            out[key as keyof T] = value as T[keyof T];
        }
    }
    return out;
}

async function run(): Promise<void> {
    loadEnvLocal();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase credentials in environment.");
    }

    const { careerId } = parseArgs();
    if (!careerId) {
        throw new Error("Usage: tsx scripts/rematerialize-signal-capability-pipeline.ts --careerId <id>");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const evidencePiecesSchema = await detectTableSchema(supabase, "evidence_pieces", [
        "id", "career_id", "raw_text", "sort_order", "created_at", "inferred_scale",
    ]);
    const capabilitiesSchema = await detectTableSchema(supabase, "capabilities", [
        "id", "career_id", "name", "normalized_name", "canonical_name", "display_name",
        "scope_summary", "ownership_summary", "impact_summary", "confidence_score",
        "confidence", "evidence_signal_count", "evidence_count", "supporting_evidence_ids",
        "context_domains", "scale_summary", "confidence_level", "updated_at",
    ]);
    const evidenceSignalsSchema = await detectTableSchema(supabase, "evidence_signals", [
        "id", "career_id", "evidence_piece_id", "action", "domain", "initiative_type",
        "scope_level", "ownership_level", "stakeholder_scope", "tool_signals",
        "capability_hints", "team_signal", "impact_signal", "confidence_score",
    ]);
    const capabilitySignalLinksSchema = await detectTableSchema(supabase, "capability_signal_links", [
        "id", "capability_id", "evidence_signal_id", "contribution_weight", "rationale", "created_at",
    ]);
    const careersSchema = await detectTableSchema(supabase, "careers", ["id", "user_id", "created_at", "updated_at"]);
    const experiencesSchema = await detectTableSchema(supabase, "experiences", ["id", "career_id", "company", "title", "date_range"]);

    console.log("[RematerializeSignalCapabilityPipeline] Schema audit", {
        evidence_pieces: Array.from(evidencePiecesSchema.columns),
        capabilities: Array.from(capabilitiesSchema.columns),
        evidence_signals: Array.from(evidenceSignalsSchema.columns),
        capability_signal_links: Array.from(capabilitySignalLinksSchema.columns),
        careers: Array.from(careersSchema.columns),
        experiences: Array.from(experiencesSchema.columns),
    });

    const requiredEvidencePieceColumns = ["id", "career_id", "raw_text"];
    const missingEvidenceRequired = requiredEvidencePieceColumns.filter((column) => !evidencePiecesSchema.columns.has(column));
    if (missingEvidenceRequired.length > 0) {
        throw new Error(`evidence_pieces missing required columns: ${missingEvidenceRequired.join(", ")}`);
    }

    const requiredCapabilityColumns = ["career_id", "name", "normalized_name"];
    const missingCapabilityRequired = requiredCapabilityColumns.filter((column) => !capabilitiesSchema.columns.has(column));
    if (missingCapabilityRequired.length > 0) {
        throw new Error(`capabilities missing required columns: ${missingCapabilityRequired.join(", ")}`);
    }

    const requiredEvidenceSignalColumns = ["career_id", "evidence_piece_id"];
    const missingEvidenceSignalRequired = requiredEvidenceSignalColumns.filter((column) => !evidenceSignalsSchema.columns.has(column));
    if (missingEvidenceSignalRequired.length > 0) {
        throw new Error(`evidence_signals missing required columns: ${missingEvidenceSignalRequired.join(", ")}`);
    }

    const requiredCapabilitySignalLinkColumns = ["capability_id", "evidence_signal_id"];
    const missingCapabilitySignalLinkRequired = requiredCapabilitySignalLinkColumns.filter((column) => !capabilitySignalLinksSchema.columns.has(column));
    if (missingCapabilitySignalLinkRequired.length > 0) {
        throw new Error(`capability_signal_links missing required columns: ${missingCapabilitySignalLinkRequired.join(", ")}`);
    }

    const { data: career, error: careerError } = await supabase
        .from("careers")
        .select("id")
        .eq("id", careerId)
        .single();
    if (careerError || !career) {
        throw new Error(`Career not found: ${careerError?.message ?? careerId}`);
    }

    const evidenceSelectColumns = pickColumns(evidencePiecesSchema, ["id", "career_id", "raw_text", "inferred_scale"]).join(", ");
    let evidenceQuery = supabase
        .from("evidence_pieces")
        .select(evidenceSelectColumns)
        .eq("career_id", careerId);
    if (evidencePiecesSchema.columns.has("sort_order")) {
        evidenceQuery = evidenceQuery.order("sort_order", { ascending: true });
    } else if (evidencePiecesSchema.columns.has("created_at")) {
        evidenceQuery = evidenceQuery.order("created_at", { ascending: true });
    } else {
        evidenceQuery = evidenceQuery.order("id", { ascending: true });
    }
    const { data: evidenceRowsRaw, error: evidenceError } = await evidenceQuery;
    if (evidenceError) throw new Error(`Failed to load evidence_pieces: ${evidenceError.message}`);
    const evidenceRows = (evidenceRowsRaw ?? []) as Array<{
        id: string;
        career_id: string;
        raw_text: string;
        inferred_scale: Record<string, unknown> | null;
    }>;
    if (evidenceRows.length === 0) {
        throw new Error(`No evidence_pieces found for career ${careerId}`);
    }

    const { data: existingCapabilities, error: existingCapabilitiesError } = await supabase
        .from("capabilities")
        .select("id")
        .eq("career_id", careerId);
    if (existingCapabilitiesError) {
        throw new Error(`Failed to load existing capabilities: ${existingCapabilitiesError.message}`);
    }
    const capabilityIds = (existingCapabilities ?? []).map((row) => row.id);

    if (capabilityIds.length > 0) {
        const { error: deleteSignalLinksError } = await supabase
            .from("capability_signal_links")
            .delete()
            .in("capability_id", capabilityIds);
        if (deleteSignalLinksError) {
            throw new Error(`Failed to delete capability_signal_links: ${deleteSignalLinksError.message}`);
        }

        const { error: deleteLegacyLinksError } = await supabase
            .from("capability_evidence_links")
            .delete()
            .in("capability_id", capabilityIds);
        if (deleteLegacyLinksError) {
            throw new Error(`Failed to delete capability_evidence_links: ${deleteLegacyLinksError.message}`);
        }
    }

    const { error: deleteCapabilitiesError } = await supabase
        .from("capabilities")
        .delete()
        .eq("career_id", careerId);
    if (deleteCapabilitiesError) {
        throw new Error(`Failed to delete capabilities: ${deleteCapabilitiesError.message}`);
    }

    const { error: deleteSignalsError } = await supabase
        .from("evidence_signals")
        .delete()
        .eq("career_id", careerId);
    if (deleteSignalsError) {
        throw new Error(`Failed to delete evidence_signals: ${deleteSignalsError.message}`);
    }

    const signalInsertRowsRaw = extractEvidenceSignalsFromPieces(
        evidenceRows.map((row) => ({
            id: row.id,
            career_id: row.career_id,
            raw_text: row.raw_text,
        }))
    );
    const signalInsertRows = signalInsertRowsRaw.map((row) =>
        pickObjectColumns(evidenceSignalsSchema, row)
    );

    const signalSelectColumns = pickColumns(evidenceSignalsSchema, [
        "id", "evidence_piece_id", "action", "domain", "initiative_type", "scope_level",
        "ownership_level", "stakeholder_scope", "tool_signals", "capability_hints",
        "team_signal", "impact_signal", "confidence_score",
    ]).join(", ");
    const { data: insertedSignalsRaw, error: insertSignalsError } = await supabase
        .from("evidence_signals")
        .insert(signalInsertRows)
        .select(signalSelectColumns);
    if (insertSignalsError) {
        throw new Error(`Failed to insert evidence_signals: ${insertSignalsError.message}`);
    }
    const insertedSignals = (insertedSignalsRaw ?? []) as Array<{
        id: string;
        evidence_piece_id: string;
        action: string | null;
        domain: string | null;
        initiative_type: string | null;
        scope_level: string | null;
        ownership_level: string | null;
        stakeholder_scope: string[];
        tool_signals: string[];
        capability_hints: string[];
        team_signal: string | null;
        impact_signal: string | null;
        confidence_score: number | null;
    }>;

    const capabilityInference = inferCapabilities({
        evidence_signals: insertedSignals.map((signal) => ({
            id: signal.id,
            evidence_piece_id: signal.evidence_piece_id,
            career_id: careerId,
            action: signal.action,
            domain: signal.domain,
            initiative_type: signal.initiative_type,
            scope_level: signal.scope_level,
            ownership_level: signal.ownership_level,
            stakeholder_scope: signal.stakeholder_scope,
            tool_signals: signal.tool_signals,
            capability_hints: signal.capability_hints,
            team_signal: signal.team_signal,
            impact_signal: signal.impact_signal,
            confidence_score: signal.confidence_score,
        })),
    });

    let insertedCapabilities: Array<{ id: string; name: string; normalized_name: string }> = [];
    if (capabilityInference.capabilities.length > 0) {
        const capabilityRows = capabilityInference.capabilities.map((name) => pickObjectColumns(capabilitiesSchema, {
            career_id: careerId,
            name,
            normalized_name: normalizeCapabilityName(name),
            canonical_name: normalizeCapabilityName(name),
            display_name: name,
            scope_summary: null as string | null,
            ownership_summary: null as string | null,
            impact_summary: null as string | null,
            confidence_score: 0.5,
            evidence_signal_count: 0,
            confidence: 0.5,
            evidence_count: 0,
            supporting_evidence_ids: [] as string[],
            context_domains: [] as string[],
            scale_summary: null as Record<string, unknown> | null,
            confidence_level: "low" as const,
        }));

        const { data, error } = await supabase
            .from("capabilities")
            .upsert(capabilityRows, { onConflict: "career_id,normalized_name" })
            .select("id, name, normalized_name");
        if (error) throw new Error(`Failed to upsert capabilities: ${error.message}`);
        insertedCapabilities = (data ?? []) as Array<{ id: string; name: string; normalized_name: string }>;
    }

    const capabilityIdByName = new Map<string, string>();
    for (const capability of insertedCapabilities) {
        capabilityIdByName.set(normalizeCapabilityName(capability.name), capability.id);
    }

    const signalById = new Map(insertedSignals.map((signal) => [signal.id, signal]));
    const evidenceById = new Map(evidenceRows.map((evidence) => [evidence.id, evidence]));

    const signalLinkRows: Array<{
        capability_id: string;
        evidence_signal_id: string;
        contribution_weight: number;
        rationale: string;
    }> = [];
    const legacyEvidenceLinkRows: Array<{ capability_id: string; evidence_piece_id: string; link_strength: number }> = [];
    const seenSignalLinks = new Set<string>();
    const seenLegacyLinks = new Set<string>();

    for (const capabilityEvidence of capabilityInference.evidence_map) {
        const capabilityId = capabilityIdByName.get(normalizeCapabilityName(capabilityEvidence.capability));
        if (!capabilityId) continue;

        for (const signalId of capabilityEvidence.evidence_signal_ids ?? []) {
            const signal = signalById.get(signalId);
            if (!signal) continue;

            const signalKey = `${capabilityId}::${signal.id}`;
            if (!seenSignalLinks.has(signalKey)) {
                seenSignalLinks.add(signalKey);
                signalLinkRows.push(pickObjectColumns(capabilitySignalLinksSchema, {
                    capability_id: capabilityId,
                    evidence_signal_id: signal.id,
                    contribution_weight: signal.confidence_score ?? 0.5,
                    rationale: "Rematerialized from evidence signal.",
                }) as {
                    capability_id: string;
                    evidence_signal_id: string;
                    contribution_weight: number;
                    rationale: string;
                });
            }

            const legacyKey = `${capabilityId}::${signal.evidence_piece_id}`;
            if (!seenLegacyLinks.has(legacyKey)) {
                seenLegacyLinks.add(legacyKey);
                legacyEvidenceLinkRows.push({
                    capability_id: capabilityId,
                    evidence_piece_id: signal.evidence_piece_id,
                    link_strength: 1,
                });
            }
        }
    }

    if (signalLinkRows.length > 0) {
        const { error } = await supabase
            .from("capability_signal_links")
            .upsert(signalLinkRows, { onConflict: "capability_id,evidence_signal_id" });
        if (error) throw new Error(`Failed to upsert capability_signal_links: ${error.message}`);
    }

    if (legacyEvidenceLinkRows.length > 0) {
        const { error } = await supabase
            .from("capability_evidence_links")
            .upsert(legacyEvidenceLinkRows, { onConflict: "capability_id,evidence_piece_id" });
        if (error) throw new Error(`Failed to upsert capability_evidence_links: ${error.message}`);
    }

    const signalIdsByCapability = new Map<string, string[]>();
    for (const row of signalLinkRows) {
        const bucket = signalIdsByCapability.get(row.capability_id) ?? [];
        bucket.push(row.evidence_signal_id);
        signalIdsByCapability.set(row.capability_id, bucket);
    }

    for (const capability of insertedCapabilities) {
        const supportingSignalIds = Array.from(new Set(signalIdsByCapability.get(capability.id) ?? []));
        const supportingSignals = supportingSignalIds
            .map((id) => signalById.get(id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row));
        const supportingEvidenceIds = Array.from(new Set(supportingSignals.map((signal) => signal.evidence_piece_id)));
        const supportingEvidence = supportingEvidenceIds
            .map((id) => evidenceById.get(id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row));

        const contextDomains = Array.from(new Set(
            supportingSignals
                .map((signal) => signal.domain)
                .filter((value): value is string => Boolean(value && value.trim().length > 0)),
        ));

        const confidenceScore = supportingSignals.length > 0
            ? Number((supportingSignals.reduce((sum, signal) => sum + (signal.confidence_score ?? 0.5), 0) / supportingSignals.length).toFixed(4))
            : 0.5;

        const scopeSummary = dominant(
            supportingSignals
                .map((signal) => signal.scope_level ?? "")
                .filter((value) => value.length > 0),
        );
        const ownershipSummary = dominant(
            supportingSignals
                .map((signal) => signal.ownership_level ?? "")
                .filter((value) => value.length > 0),
        );
        const impactSummary = dominant(
            supportingSignals
                .map((signal) => signal.impact_signal ?? "")
                .filter((value) => value.length > 0),
        );

        const confidenceLevel = confidenceScore >= 0.75
            ? "high"
            : confidenceScore >= 0.5
                ? "medium"
                : "low";

        const teamValues = supportingEvidence
            .map((row) => (row.inferred_scale ?? {}) as Record<string, unknown>)
            .map((scale) => (typeof scale.team_scope === "string" ? scale.team_scope : "unknown"))
            .filter((value) => value !== "unknown");
        const businessValues = supportingEvidence
            .map((row) => (row.inferred_scale ?? {}) as Record<string, unknown>)
            .map((scale) => (typeof scale.business_scope === "string" ? scale.business_scope : "unknown"))
            .filter((value) => value !== "unknown");
        const impactValues = supportingEvidence
            .map((row) => (row.inferred_scale ?? {}) as Record<string, unknown>)
            .map((scale) => (typeof scale.impact_scope === "string" ? scale.impact_scope : "unknown"))
            .filter((value) => value !== "unknown");

        const scaleSummary = {
            dominant_team_scope: dominant(teamValues),
            max_team_scope_seen: dominant(teamValues),
            dominant_business_scope: dominant(businessValues),
            max_business_scope_seen: dominant(businessValues),
            dominant_impact_scope: dominant(impactValues),
            scale_confidence: confidenceLevel,
        };

        const capabilityUpdatePayload = pickObjectColumns(capabilitiesSchema, {
            canonical_name: normalizeCapabilityName(capability.name),
            display_name: capability.name,
            scope_summary: scopeSummary === "unknown" ? null : scopeSummary,
            ownership_summary: ownershipSummary === "unknown" ? null : ownershipSummary,
            impact_summary: impactSummary === "unknown" ? null : impactSummary,
            confidence_score: confidenceScore,
            confidence: confidenceScore,
            evidence_signal_count: supportingSignalIds.length,
            evidence_count: supportingEvidenceIds.length,
            supporting_evidence_ids: supportingEvidenceIds,
            context_domains: contextDomains,
            scale_summary: scaleSummary,
            confidence_level: confidenceLevel,
        });

        const { error } = await supabase
            .from("capabilities")
            .update(capabilityUpdatePayload)
            .eq("id", capability.id);
        if (error) throw new Error(`Failed to update capability aggregates for ${capability.id}: ${error.message}`);
    }

    console.log("[RematerializeSignalCapabilityPipeline] Done", {
        careerId,
        evidencePieceCount: evidenceRows.length,
        insertedEvidenceSignalCount: insertedSignals.length,
        inferredCapabilityCount: capabilityInference.capabilities.length,
        insertedCapabilityCount: insertedCapabilities.length,
        insertedCapabilitySignalLinkCount: signalLinkRows.length,
        insertedLegacyCapabilityEvidenceLinkCount: legacyEvidenceLinkRows.length,
    });
}

run().catch((error) => {
    console.error("[RematerializeSignalCapabilityPipeline] Failed", error);
    process.exit(1);
});
