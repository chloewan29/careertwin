import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildEvidencePieces } from "@/lib/career-engine/evidence/evidence-pieces";
import { extractEvidenceSignalsFromPieces } from "@/lib/career-engine/evidence/evidence-signals";
import { deriveStructuredEvidenceFields } from "@/lib/career-engine/evidence/structured-evidence";
import { parseResumeText } from "@/lib/career-engine/parsing/resume-parser";
import type { ParsedResume } from "@/lib/career-engine/parsing/resume-parser";

type Nullable<T> = T | null;

function memoryGroupKey(company: Nullable<string>, role: Nullable<string>, dateRange: Nullable<string>): string {
    return `${company ?? ""}||${role ?? ""}||${dateRange ?? ""}`;
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

function parseArgs(): { profileId: string | null; careerId: string | null; reparse: boolean } {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        profileId: readArg("--profileId"),
        careerId: readArg("--careerId"),
        reparse: args.includes("--reparse"),
    };
}

async function evidencePiecesHasBusinessContext(supabase: ReturnType<typeof createClient>): Promise<boolean> {
    const { error } = await supabase
        .from("evidence_pieces")
        .select("business_context")
        .limit(1);
    if (!error) return true;
    if (error.code === "42703" || /column .*business_context.* does not exist/i.test(error.message)) return false;
    throw new Error(`Failed probing evidence_pieces.business_context: ${error.message}`);
}

async function run(): Promise<void> {
    loadEnvLocal();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase credentials in environment.");
    }

    const { profileId: profileIdArg, careerId: careerIdArg, reparse } = parseArgs();
    if (!profileIdArg && !careerIdArg) {
        throw new Error("Usage: tsx scripts/rematerialize-evidence-pieces.ts --profileId <id> OR --careerId <id> [--reparse]");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const hasBusinessContext = await evidencePiecesHasBusinessContext(supabase);

    let careerId: string;
    let profileId: string;

    if (careerIdArg) {
        const { data: career, error } = await supabase
            .from("careers")
            .select("id, user_id")
            .eq("id", careerIdArg)
            .single();
        if (error) throw new Error(`Failed to load career ${careerIdArg}: ${error.message}`);
        careerId = career.id;
        profileId = career.user_id;
    } else {
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, user_id")
            .eq("id", profileIdArg)
            .single();
        if (profileError) throw new Error(`Failed to load profile ${profileIdArg}: ${profileError.message}`);
        const userId = profile.user_id ?? profile.id;

        const { data: careers, error: careersError } = await supabase
            .from("careers")
            .select("id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);
        if (careersError) throw new Error(`Failed to load career for profile ${profileIdArg}: ${careersError.message}`);
        if (!careers || careers.length === 0) throw new Error(`No career found for profile ${profileIdArg}`);

        careerId = careers[0].id;
        profileId = profile.id;
    }

    const { data: resumes, error: resumeError } = await supabase
        .from("resumes")
        .select("id, file_name, created_at, raw_text, parsed_json")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1);
    if (resumeError) throw new Error(`Failed to load latest resume for profile ${profileId}: ${resumeError.message}`);
    if (!resumes || resumes.length === 0) throw new Error(`No resumes found for profile ${profileId}`);

    const latestResume = resumes[0];
    const parsedResume = (() => {
        if (reparse) {
            const rawText = (latestResume.raw_text as string | null) ?? "";
            if (!rawText.trim()) {
                throw new Error(`Resume ${latestResume.id} has empty raw_text; cannot reparse.`);
            }
            return parseResumeText(rawText);
        }
        return latestResume.parsed_json as ParsedResume | null;
    })();
    if (!parsedResume || typeof parsedResume !== "object") {
        throw new Error(`Resume ${latestResume.id} has no parsed_json. Use --reparse to parse from raw_text.`);
    }

    const { data: experiences, error: experiencesError } = await supabase
        .from("experiences")
        .select("id, company, title, date_range")
        .eq("career_id", careerId);
    if (experiencesError) throw new Error(`Failed to load experiences for career ${careerId}: ${experiencesError.message}`);

    const experienceIdByGroup = new Map<string, string>();
    for (const row of experiences ?? []) {
        const key = memoryGroupKey(row.company, row.title, row.date_range);
        if (!experienceIdByGroup.has(key)) {
            experienceIdByGroup.set(key, row.id);
        }
    }

    const evidencePieces = buildEvidencePieces(parsedResume);
    const evidenceRows = evidencePieces
        .map((piece, index) => {
            const key = memoryGroupKey(piece.company, piece.role, piece.date_range);
            const experienceId = experienceIdByGroup.get(key);
            if (!experienceId) return null;
            if (!piece.company || !piece.role || !piece.date_range) return null;
            const structured = deriveStructuredEvidenceFields(piece.raw_text, "resume");
            return {
                career_id: careerId,
                experience_id: experienceId,
                company: piece.company,
                role: piece.role,
                date_range: piece.date_range,
                raw_text: piece.raw_text,
                source_type: "resume_bullet" as const,
                summary: structured.summary,
                action: structured.action,
                impact: structured.impact,
                stakeholders: structured.stakeholders,
                tools_methods: structured.tools_methods,
                ...(hasBusinessContext ? { business_context: structured.business_context } : {}),
                inferred_scale: structured.inferred_scale,
                inferred_scope: structured.inferred_scope,
                confidence: structured.confidence,
                missing_fields: structured.missing_fields,
                sort_order: index,
            };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

    const { data: existingEvidence, error: existingEvidenceError } = await supabase
        .from("evidence_pieces")
        .select("id")
        .eq("career_id", careerId);
    if (existingEvidenceError) throw new Error(`Failed to load existing evidence for career ${careerId}: ${existingEvidenceError.message}`);
    const existingEvidenceIds = (existingEvidence ?? []).map((row) => row.id);

    if (existingEvidenceIds.length > 0) {
        const { error: linkDeleteError } = await supabase
            .from("capability_evidence_links")
            .delete()
            .in("evidence_piece_id", existingEvidenceIds);
        if (linkDeleteError) {
            throw new Error(`Failed to delete capability_evidence_links for existing evidence: ${linkDeleteError.message}`);
        }
    }

    const { error: evidenceDeleteError } = await supabase
        .from("evidence_pieces")
        .delete()
        .eq("career_id", careerId);
    if (evidenceDeleteError) throw new Error(`Failed to delete existing evidence for career ${careerId}: ${evidenceDeleteError.message}`);

    let insertedRows: Array<{ id: string; raw_text: string; source_type: string }> = [];
    if (evidenceRows.length > 0) {
        const { data, error } = await supabase
            .from("evidence_pieces")
            .insert(evidenceRows)
            .select("id, raw_text, source_type");
        if (error) throw new Error(`Failed to insert rebuilt evidence_pieces: ${error.message}`);
        insertedRows = data ?? [];
    }

    let insertedSignalRows: Array<{ id: string; evidence_piece_id: string }> = [];
    if (insertedRows.length > 0) {
        const signalRows = extractEvidenceSignalsFromPieces(
            insertedRows.map((row) => ({
                id: row.id,
                career_id: careerId,
                raw_text: row.raw_text,
            }))
        );
        if (signalRows.length > 0) {
            const { data, error } = await supabase
                .from("evidence_signals")
                .insert(signalRows)
                .select("id, evidence_piece_id");
            if (error) throw new Error(`Failed to insert evidence_signals: ${error.message}`);
            insertedSignalRows = data ?? [];
        }
    }

    console.log("[RematerializeEvidence] Done", {
        profileId,
        careerId,
        resumeId: latestResume.id,
        resumeFile: latestResume.file_name,
        source: reparse ? "raw_text_reparse" : "parsed_json",
        parsedExperienceEntries: parsedResume.experience_entries?.length ?? 0,
        generatedEvidencePieces: evidencePieces.length,
        insertedEvidencePieces: insertedRows.length,
        insertedEvidenceSignals: insertedSignalRows.length,
        firstFive: insertedRows.slice(0, 5).map((row) => ({
            id: row.id,
            source_type: row.source_type,
            raw_text_length: row.raw_text.length,
            preview: row.raw_text.slice(0, 120),
        })),
    });
}

run().catch((error) => {
    console.error("[RematerializeEvidence] Failed", error);
    process.exit(1);
});
