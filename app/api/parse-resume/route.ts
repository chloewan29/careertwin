import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import mammoth from "mammoth";

function memoryGroupKey(company: string | null | undefined, role: string | null | undefined, dateRange: string | null | undefined): string {
    return `${company ?? ""}||${role ?? ""}||${dateRange ?? ""}`;
}

function normalizeCapabilityName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function serializeSupabaseError(error: unknown): { message?: string; code?: string; details?: string; hint?: string } | null {
    if (!error || typeof error !== "object") return null;
    const candidate = error as { message?: string; code?: string; details?: string; hint?: string };
    return {
        message: candidate.message,
        code: candidate.code,
        details: candidate.details,
        hint: candidate.hint,
    };
}

async function evidencePiecesHasBusinessContext(supabase: ReturnType<typeof createServerSupabaseClient>): Promise<boolean> {
    const { error } = await supabase
        .from("evidence_pieces")
        .select("business_context")
        .limit(1);
    if (!error) return true;
    if (error.code === "42703" || /column .*business_context.* does not exist/i.test(error.message)) return false;
    throw new Error(`Failed probing evidence_pieces.business_context: ${error.message}`);
}

export async function POST(request: NextRequest) {
    const materializationDebug: Array<{ step: string; data: unknown; error: unknown }> = [];
    let materializationReached = false;
    const debugMode = request.nextUrl.searchParams.get("debug") === "1";
    const recordDebug = (step: string, data: unknown, error: unknown): void => {
        const entry = { step, data, error };
        materializationDebug.push(entry);
        console.log(`[ParseResume][Debug][${step}]`, entry);
    };

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const profileId = formData.get("profileId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!profileId) {
            return NextResponse.json(
                { error: "No profile ID provided" },
                { status: 400 }
            );
        }

        const fileName = file.name;
        const extension = fileName.split(".").pop()?.toLowerCase();

        if (!extension || !["pdf", "docx"].includes(extension)) {
            return NextResponse.json(
                { error: "Only PDF and DOCX files are supported" },
                { status: 400 }
            );
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: "File size must be under 10MB" },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        const projectRef = (() => {
            try {
                return new URL(supabaseUrl).host.split(".")[0] ?? null;
            } catch {
                return null;
            }
        })();
        const anonPrefix = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").slice(0, 12);
        console.log("[ParseResume][SupabaseEnv]", {
            projectRef,
            supabaseUrl,
            anonKeyPrefix: anonPrefix,
            profileId,
            fileName,
        });
        recordDebug("supabase.env", {
            projectRef,
            supabaseUrl,
            anonKeyPrefix: anonPrefix,
            profileId,
            fileName,
        }, null);

        // 1. Upload file to Supabase Storage
        const storagePath = `${profileId}/${Date.now()}-${fileName}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json(
                { error: `Upload failed: ${uploadError.message}` },
                { status: 500 }
            );
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from("resumes").getPublicUrl(storagePath);

        // 2. Extract text from the file
        let rawText = "";

        if (extension === "pdf") {
            try {
                const pdfParseModule = await import("pdf-parse");
                const { pathToFileURL } = await import("node:url");
                const { join } = await import("node:path");
                const PDFParseCtor = pdfParseModule.PDFParse as (new (params: { data: Buffer }) => {
                    getText: () => Promise<{ text?: string }>;
                    destroy: () => Promise<void>;
                }) & {
                    setWorker?: (workerSrc: string) => void;
                };
                const workerPath = join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
                PDFParseCtor.setWorker?.(pathToFileURL(workerPath).href);
                const parser = new PDFParseCtor({ data: buffer });
                const parsedPdf = await parser.getText();
                await parser.destroy();
                rawText = (parsedPdf?.text ?? "")
                    .replace(/\t+/g, "\n")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();
                console.log("[ParseResume][PDF] Extracted raw text length:", rawText.length);
                recordDebug("pdf.extract", { rawTextLength: rawText.length }, null);
            } catch (pdfError) {
                const serialized = serializeSupabaseError(pdfError) ?? {
                    message: pdfError instanceof Error ? pdfError.message : String(pdfError),
                };
                console.error("[ParseResume][PDF] Extraction failed:", serialized);
                recordDebug("pdf.extract", null, serialized);
                throw new Error(`PDF extraction failed: ${serialized.message ?? "unknown error"}`);
            }
        } else if (extension === "docx") {
            const result = await mammoth.extractRawText({ buffer });
            rawText = result.value;
        }

        // 3. Process with Career Engine
        console.log("1. Raw text exists:", !!rawText && rawText.length > 0);
        const { parseResumeText } = await import("@/lib/career-engine/parsing/resume-parser");
        const { extractSkills } = await import("@/lib/career-engine/parsing/skill-extractor");
        const { buildCareerProfile } = await import("@/lib/career-engine/profile/profile-builder");

        let parsedResume;
        try {
            console.log("2. parseResumeText is called");
            parsedResume = parseResumeText(rawText);
            console.log("3. parseResumeText return value:", parsedResume);
            console.log("[ParseResume][Parsed] experience_entries count:", parsedResume?.experience_entries?.length ?? 0);
            recordDebug("parse.resume", { experienceEntriesCount: parsedResume?.experience_entries?.length ?? 0 }, null);
        } catch (error: unknown) {
            const message = error instanceof Error ? (error.stack ?? error.message) : error;
            console.error("4. parser error stack:", message);
            throw error;
        }

        const extractedSkills = extractSkills(rawText);
        if (parsedResume && (!parsedResume.skills || parsedResume.skills.length === 0)) {
            parsedResume.skills = extractedSkills;
        }
        const { inferCapabilities, debugCapabilityInference } = await import("@/lib/career-engine/capability/capability-inference");
        const capabilityInferenceInput = {
            current_title: parsedResume?.current_title ?? null,
            summary: parsedResume?.summary ?? null,
            experience_entries: (parsedResume?.experience_entries ?? []).map((entry) => ({
                title: entry.title,
                company: entry.company,
                date_range: entry.date_range,
                description: entry.description ?? null,
                highlights: entry.highlights ?? [],
            })),
            resume_text: rawText,
        };
        const capabilityDebug = debugCapabilityInference(capabilityInferenceInput);
        const capabilityInference = inferCapabilities(capabilityInferenceInput);
        parsedResume.capabilities = capabilityInference.capabilities;
        const capabilityEvidenceMap = capabilityInference.evidence_map;

        // Temporary debug logging for capability inference diagnostics.
        console.log("=== Capability Inference Debug ===");
        console.log("Capability Inference Input:", capabilityDebug.input_summary);
        console.log(
            "Capability Phrase Group Matches:",
            capabilityDebug.capability_debug.map((item) => ({
                capability: item.capability,
                inferred: item.inferred,
                strong_matches_count: item.strong_matches.length,
                supporting_matches_count: item.supporting_matches.length,
                strong_matches: item.strong_matches,
                supporting_matches: item.supporting_matches,
            }))
        );
        console.log("Inferred Capabilities:", parsedResume.capabilities);
        console.log("Capability Evidence Map:", capabilityEvidenceMap);
        console.log("==================================");

        const careerProfile = buildCareerProfile(rawText, parsedResume, extractedSkills);

        // 4a. Generate profile narrative
        const { buildProfileNarrative } = await import("@/lib/career-engine/profile/profile-narrative");
        const profileNarrative = buildProfileNarrative(
            {
                current_title: parsedResume.current_title,
                years_experience: parsedResume.years_experience,
                skills: parsedResume.skills,
            },
            parsedResume,
            { matched_evidence: [], missing_evidence: [] }
        );

        // 4b. Save resume record to database
        const parsedJsonWithNarrative = parsedResume ? { ...parsedResume, narrative: profileNarrative } : null;
        const { data: resume, error: dbError } = await supabase
            .from("resumes")
            .insert({
                profile_id: profileId,
                file_name: fileName,
                file_url: publicUrl,
                raw_text: rawText,
                ...(parsedJsonWithNarrative ? { parsed_json: parsedJsonWithNarrative } : {})
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database insert error:", dbError);
            return NextResponse.json(
                { error: `Failed to save resume: ${dbError.message}` },
                { status: 500 }
            );
        }

        // 5. Save structured profile data
        // Null out summary if it looks like a date, location, or company line (not a real summary)
        const summaryIsWeak = !parsedResume?.summary
            || parsedResume.summary.length < 30
            || /^\d{4}|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(parsedResume.summary)
            || /,\s+[A-Z][a-z]/.test(parsedResume.summary) && parsedResume.summary.split(" ").length < 5;

        const { data: updatedProfile, error: profileError } = await supabase
            .from("profiles")
            .update({
                current_title: parsedResume?.current_title ?? null,
                years_experience: parsedResume?.years_experience ?? null,
                seniority_level: careerProfile.seniority_level ?? null,
                industry: parsedResume?.industry ?? null,
                summary: summaryIsWeak ? null : parsedResume!.summary,
                companies: parsedResume?.companies ?? [],
                capabilities: parsedResume?.capabilities ?? [],
                capability_evidence: capabilityEvidenceMap,
                // Save parsed name; only overwrites if present — preserves existing user-set name
                ...(parsedResume?.full_name ? { display_name: parsedResume.full_name } : {}),
            })
            .eq("id", profileId)
            .select("user_id")
            .single();

        let userId = updatedProfile?.user_id as string | null;
        console.log("[Materialize][Gate] profile update result", {
            data: updatedProfile,
            error: serializeSupabaseError(profileError),
            hasUserId: Boolean(userId),
        });
        recordDebug("materialize.gate", updatedProfile, serializeSupabaseError(profileError));

        if (profileError) {
            console.error("Profile update error:", profileError);
            throw new Error(`Profile update failed before materialization: ${profileError.message}`);
        }

        if (!userId) {
            const { data: backfilledProfile, error: backfillError } = await supabase
                .from("profiles")
                .update({ user_id: profileId })
                .eq("id", profileId)
                .select("user_id")
                .single();
            console.log("[Materialize][Gate] profile user_id backfill", {
                data: backfilledProfile,
                error: serializeSupabaseError(backfillError),
            });
            recordDebug("materialize.gate.user_id_backfill", backfilledProfile, serializeSupabaseError(backfillError));

            if (backfillError) {
                throw new Error(`Materialization blocked: failed to backfill profiles.user_id: ${backfillError.message}`);
            }
            userId = (backfilledProfile?.user_id as string | null) ?? null;
            if (!userId) {
                throw new Error("Materialization blocked: profiles.user_id remains null after backfill.");
            }
        }

        // 5b. Materialize CareerTwin memory tables as downstream derived data.
        {
            materializationReached = true;
            console.log("[Materialize][Start]", { reached: true, profileId, userId });
            recordDebug("materialize.start", { reached: true, profileId, userId }, null);
            const hasBusinessContext = await evidencePiecesHasBusinessContext(supabase);
            recordDebug("evidence_pieces.schema.business_context", { exists: hasBusinessContext }, null);
            const { buildEvidencePieces } = await import("@/lib/career-engine/evidence/evidence-pieces");
            const { deriveStructuredEvidenceFields } = await import("@/lib/career-engine/evidence/structured-evidence");
            const { extractEvidenceSignalsFromPieces } = await import("@/lib/career-engine/evidence/evidence-signals");
            const { inferCapabilities } = await import("@/lib/career-engine/capability/capability-inference");

            const careerUpsertPayload = {
                user_id: userId,
                headline: parsedResume?.current_title ?? null,
                summary: summaryIsWeak ? null : parsedResume?.summary ?? null,
                total_years_experience: parsedResume?.years_experience ?? null,
            };

            let careerId: string | null = null;
            const { data: existingCareers, error: careerLoadError } = await supabase
                .from("careers")
                .select("id")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1);
            console.log("[Materialize][careers.select]", {
                data: existingCareers,
                error: serializeSupabaseError(careerLoadError),
            });
            recordDebug("careers.select", existingCareers, serializeSupabaseError(careerLoadError));

            if (careerLoadError) {
                throw new Error(`careers select failed: ${careerLoadError.message}`);
            } else if (existingCareers && existingCareers.length > 0) {
                careerId = existingCareers[0].id as string;
                const { data: careerUpdateData, error: careerUpdateError } = await supabase
                    .from("careers")
                    .update(careerUpsertPayload)
                    .eq("id", careerId)
                    .select("id, user_id, headline, summary, total_years_experience");
                console.log("[Materialize][careers.update]", {
                    data: careerUpdateData,
                    error: serializeSupabaseError(careerUpdateError),
                });
                recordDebug("careers.update", careerUpdateData, serializeSupabaseError(careerUpdateError));
                if (careerUpdateError) {
                    throw new Error(`careers update failed: ${careerUpdateError.message}`);
                }
            } else {
                const { data: createdCareer, error: careerCreateError } = await supabase
                    .from("careers")
                    .insert(careerUpsertPayload)
                    .select("id, user_id, headline, summary, total_years_experience")
                    .single();
                console.log("[Materialize][careers.insert]", {
                    data: createdCareer,
                    error: serializeSupabaseError(careerCreateError),
                });
                recordDebug("careers.insert", createdCareer, serializeSupabaseError(careerCreateError));
                if (careerCreateError) {
                    throw new Error(`careers insert failed: ${careerCreateError.message}`);
                } else {
                    careerId = createdCareer?.id ?? null;
                }
            }

            if (!careerId) {
                throw new Error("Materialization failed: careerId is null after careers write.");
            }

            // Rebuild derived memory for this career from latest uploaded resume/profile.
            // Delete capabilities first (links cascade), then experiences (evidence links cascade via evidence rows).
            const { data: wipeCapabilitiesData, error: wipeCapabilitiesError } = await supabase
                .from("capabilities")
                .delete()
                .eq("career_id", careerId)
                .select("id, normalized_name");
            console.log("[Materialize][capabilities.delete]", {
                data: wipeCapabilitiesData,
                error: serializeSupabaseError(wipeCapabilitiesError),
            });
            recordDebug("capabilities.delete", wipeCapabilitiesData, serializeSupabaseError(wipeCapabilitiesError));
            if (wipeCapabilitiesError) {
                throw new Error(`capabilities delete failed: ${wipeCapabilitiesError.message}`);
            }

            const { data: wipeExperiencesData, error: wipeExperiencesError } = await supabase
                .from("experiences")
                .delete()
                .eq("career_id", careerId)
                .select("id, company, title, date_range");
            console.log("[Materialize][experiences.delete]", {
                data: wipeExperiencesData,
                error: serializeSupabaseError(wipeExperiencesError),
            });
            recordDebug("experiences.delete", wipeExperiencesData, serializeSupabaseError(wipeExperiencesError));
            if (wipeExperiencesError) {
                throw new Error(`experiences delete failed: ${wipeExperiencesError.message}`);
            }

            const experienceInput = (parsedResume?.experience_entries ?? [])
                .map((entry, index) => ({
                    company: entry.company,
                    title: entry.title,
                    date_range: entry.date_range,
                    summary: entry.description ?? null,
                    sort_order: index,
                }))
                .filter((entry) => Boolean(entry.company && entry.title && entry.date_range));

            let insertedExperiences: Array<{ id: string; company: string; title: string; date_range: string }> = [];
            if (experienceInput.length > 0) {
                const { data: experienceRows, error: experienceInsertError } = await supabase
                    .from("experiences")
                    .insert(
                        experienceInput.map((entry) => ({
                            career_id: careerId,
                            company: entry.company,
                            title: entry.title,
                            date_range: entry.date_range,
                            summary: entry.summary,
                            source_type: "resume",
                            sort_order: entry.sort_order,
                        }))
                    )
                    .select("id, company, title, date_range");
                console.log("[Materialize][experiences.insert]", {
                    data: experienceRows,
                    error: serializeSupabaseError(experienceInsertError),
                });
                recordDebug("experiences.insert", experienceRows, serializeSupabaseError(experienceInsertError));

                if (experienceInsertError) {
                    throw new Error(`experiences insert failed: ${experienceInsertError.message}`);
                } else {
                    insertedExperiences = (experienceRows ?? []) as Array<{ id: string; company: string; title: string; date_range: string }>;
                    console.log("[Materialize][experiences.insert.count]", insertedExperiences.length);
                    recordDebug("experiences.insert.count", { count: insertedExperiences.length }, null);
                }
            } else {
                console.log("[Materialize][experiences.insert]", { data: [], error: null, skipped: true });
                recordDebug("experiences.insert", { skipped: true, data: [] }, null);
                console.log("[Materialize][experiences.insert.count]", 0);
                recordDebug("experiences.insert.count", { count: 0 }, null);
            }

            const experienceIdByGroup = new Map<string, string>();
            for (const row of insertedExperiences) {
                const key = memoryGroupKey(row.company, row.title, row.date_range);
                if (!experienceIdByGroup.has(key)) {
                    experienceIdByGroup.set(key, row.id);
                }
            }

            recordDebug(
                "parsed.resume.highlights",
                (parsedResume?.experience_entries ?? []).slice(0, 5).map((entry) => ({
                    company: entry.company,
                    title: entry.title,
                    date_range: entry.date_range,
                    highlights_count: (entry.highlights ?? []).length,
                    highlights_preview: (entry.highlights ?? []).slice(0, 3),
                })),
                null
            );

            const evidencePieces = buildEvidencePieces(parsedResume);
            recordDebug(
                "evidence.build.output",
                {
                    totalPieces: evidencePieces.length,
                    firstFive: evidencePieces.slice(0, 5).map((piece) => ({
                        id: piece.id,
                        source: piece.source,
                        source_type: piece.source,
                        sourceType: piece.source,
                        raw_text: piece.raw_text,
                        company: piece.company,
                        role: piece.role,
                        date_range: piece.date_range,
                    })),
                },
                null
            );

            const evidenceFilterCondition = "piece.source === 'highlight' || piece.source === 'description_fallback'";
            recordDebug("evidence.filter.condition", { condition: evidenceFilterCondition }, null);
            const bulletEvidencePieces = evidencePieces.filter(
                (piece) => piece.source === "highlight" || piece.source === "description_fallback"
            );
            recordDebug(
                "evidence.filter.output",
                {
                    totalPiecesAfterFilter: bulletEvidencePieces.length,
                    firstFive: bulletEvidencePieces.slice(0, 5).map((piece) => ({
                        id: piece.id,
                        source: piece.source,
                        raw_text: piece.raw_text,
                        company: piece.company,
                        role: piece.role,
                        date_range: piece.date_range,
                    })),
                },
                null
            );

            const evidenceInsertRows = bulletEvidencePieces
                .map((piece, index) => {
                    const group = memoryGroupKey(piece.company, piece.role, piece.date_range);
                    const experienceId = experienceIdByGroup.get(group);
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
            recordDebug(
                "evidence_pieces.insert.payload",
                { count: evidenceInsertRows.length, firstFive: evidenceInsertRows.slice(0, 5) },
                null
            );

            let insertedEvidenceRows: Array<{
                id: string;
                raw_text: string;
                company: string;
                role: string;
                date_range: string;
                source_type: string;
                business_context?: string | null;
                inferred_scale: Record<string, unknown> | null;
            }> = [];
            if (evidenceInsertRows.length > 0) {
                const evidenceSelectColumns = hasBusinessContext
                    ? "id, raw_text, company, role, date_range, source_type, business_context, inferred_scale"
                    : "id, raw_text, company, role, date_range, source_type, inferred_scale";
                const { data: evidenceRows, error: evidenceInsertError } = await supabase
                    .from("evidence_pieces")
                    .insert(evidenceInsertRows)
                    .select(evidenceSelectColumns);
                console.log("[Materialize][evidence_pieces.insert]", {
                    data: evidenceRows,
                    error: serializeSupabaseError(evidenceInsertError),
                });
                recordDebug("evidence_pieces.insert", evidenceRows, serializeSupabaseError(evidenceInsertError));

                if (evidenceInsertError) {
                    throw new Error(`evidence_pieces insert failed: ${evidenceInsertError.message}`);
                } else {
                    insertedEvidenceRows = (evidenceRows ?? []) as Array<{
                        id: string;
                        raw_text: string;
                        company: string;
                        role: string;
                        date_range: string;
                        source_type: string;
                        business_context?: string | null;
                        inferred_scale: Record<string, unknown> | null;
                    }>;
                    console.log("[Materialize][evidence_pieces.insert.count]", insertedEvidenceRows.length);
                    recordDebug("evidence_pieces.insert.count", { count: insertedEvidenceRows.length }, null);
                }
            } else {
                console.log("[Materialize][evidence_pieces.insert]", { data: [], error: null, skipped: true });
                recordDebug("evidence_pieces.insert", { skipped: true, data: [] }, null);
                console.log("[Materialize][evidence_pieces.insert.count]", 0);
                recordDebug("evidence_pieces.insert.count", { count: 0 }, null);
            }

            const signalInsertRows = extractEvidenceSignalsFromPieces(
                insertedEvidenceRows.map((row) => ({
                    id: row.id,
                    career_id: careerId,
                    raw_text: row.raw_text,
                }))
            );
            recordDebug(
                "evidence_signals.insert.payload",
                { count: signalInsertRows.length, firstFive: signalInsertRows.slice(0, 5) },
                null
            );

            let insertedSignalRows: Array<{
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
            }> = [];
            if (signalInsertRows.length > 0) {
                const { data: signalRows, error: signalInsertError } = await supabase
                    .from("evidence_signals")
                    .insert(signalInsertRows)
                    .select("id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, capability_hints, team_signal, impact_signal, confidence_score");
                console.log("[Materialize][evidence_signals.insert]", {
                    data: signalRows,
                    error: serializeSupabaseError(signalInsertError),
                });
                recordDebug("evidence_signals.insert", signalRows, serializeSupabaseError(signalInsertError));

                if (signalInsertError) {
                    throw new Error(`evidence_signals insert failed: ${signalInsertError.message}`);
                } else {
                    insertedSignalRows = ((signalRows ?? []) as Array<{
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
                    }>).map((row) => ({
                        ...row,
                        stakeholder_scope: Array.isArray(row.stakeholder_scope) ? row.stakeholder_scope.filter((v): v is string => typeof v === "string") : [],
                        tool_signals: Array.isArray(row.tool_signals) ? row.tool_signals.filter((v): v is string => typeof v === "string") : [],
                        capability_hints: Array.isArray(row.capability_hints) ? row.capability_hints.filter((v): v is string => typeof v === "string") : [],
                    }));
                }
            } else {
                console.log("[Materialize][evidence_signals.insert]", { data: [], error: null, skipped: true });
                recordDebug("evidence_signals.insert", { skipped: true, data: [] }, null);
            }

            recordDebug(
                "capability.inference.input",
                {
                    source: "persisted_evidence_signals",
                    persistedEvidenceCount: insertedEvidenceRows.length,
                    persistedSignalCount: insertedSignalRows.length,
                    fallbackToProfileData: false,
                },
                null
            );

            const memoryCapabilityInference = insertedSignalRows.length > 0
                ? inferCapabilities({
                    evidence_signals: insertedSignalRows.map((signal) => ({
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
                })
                : { capabilities: [], evidence_map: [] };

            let insertedCapabilities: Array<{ id: string; name: string; normalized_name: string }> = [];
            if (memoryCapabilityInference.capabilities.length > 0) {
                const capabilityRows = memoryCapabilityInference.capabilities.map((name) => ({
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
                    evidence_count: 0,
                    supporting_evidence_ids: [],
                    context_domains: [],
                    scale_summary: null,
                    confidence_level: "low" as const,
                }));

                const { data: capabilityData, error: capabilityInsertError } = await supabase
                    .from("capabilities")
                    .upsert(capabilityRows, { onConflict: "career_id,normalized_name" })
                    .select("id, name, normalized_name");
                console.log("[Materialize][capabilities.upsert]", {
                    data: capabilityData,
                    error: serializeSupabaseError(capabilityInsertError),
                });
                recordDebug("capabilities.upsert", capabilityData, serializeSupabaseError(capabilityInsertError));

                if (capabilityInsertError) {
                    throw new Error(`capabilities upsert failed: ${capabilityInsertError.message}`);
                } else {
                    insertedCapabilities = (capabilityData ?? []) as Array<{ id: string; name: string; normalized_name: string }>;
                }
            } else {
                console.log("[Materialize][capabilities.upsert]", { data: [], error: null, skipped: true });
                recordDebug("capabilities.upsert", { skipped: true, data: [] }, null);
            }

            if (insertedCapabilities.length > 0 && insertedSignalRows.length > 0) {
                const capabilityIdByName = new Map<string, string>();
                for (const capability of insertedCapabilities) {
                    capabilityIdByName.set(normalizeCapabilityName(capability.name), capability.id);
                }

                const signalById = new Map(insertedSignalRows.map((signal) => [signal.id, signal]));
                const evidenceById = new Map(insertedEvidenceRows.map((evidence) => [evidence.id, evidence]));

                // canonical traceability path for runtime capability inference.
                const signalLinkRows: Array<{
                    capability_id: string;
                    evidence_signal_id: string;
                    contribution_weight: number;
                    rationale: string;
                }> = [];
                // legacy compatibility-only mirror for direct capability -> evidence links.
                // do not use for new runtime paths.
                const legacyEvidenceLinkRows: Array<{ capability_id: string; evidence_piece_id: string; link_strength: number }> = [];
                const seenSignalLinks = new Set<string>();
                const seenLegacyLinks = new Set<string>();

                for (const capabilityEvidence of memoryCapabilityInference.evidence_map) {
                    const capabilityId = capabilityIdByName.get(normalizeCapabilityName(capabilityEvidence.capability));
                    if (!capabilityId) continue;

                    const evidenceSignalIds = capabilityEvidence.evidence_signal_ids ?? [];
                    for (const signalId of evidenceSignalIds) {
                        const signal = signalById.get(signalId);
                        if (!signal) continue;

                        const dedupeSignalKey = `${capabilityId}::${signal.id}`;
                        if (!seenSignalLinks.has(dedupeSignalKey)) {
                            seenSignalLinks.add(dedupeSignalKey);
                            signalLinkRows.push({
                                capability_id: capabilityId,
                                evidence_signal_id: signal.id,
                                contribution_weight: signal.confidence_score ?? 0.5,
                                rationale: "Inferred from structured evidence signal.",
                            });
                        }

                        const dedupeLegacyKey = `${capabilityId}::${signal.evidence_piece_id}`;
                        if (!seenLegacyLinks.has(dedupeLegacyKey)) {
                            seenLegacyLinks.add(dedupeLegacyKey);
                            legacyEvidenceLinkRows.push({
                                capability_id: capabilityId,
                                evidence_piece_id: signal.evidence_piece_id,
                                link_strength: 1,
                            });
                        }
                    }
                }

                if (signalLinkRows.length > 0) {
                    // canonical write path.
                    const { data: signalLinkData, error: signalLinkInsertError } = await supabase
                        .from("capability_signal_links")
                        .upsert(signalLinkRows, { onConflict: "capability_id,evidence_signal_id" })
                        .select("capability_id, evidence_signal_id, contribution_weight");
                    console.log("[Materialize][capability_signal_links.upsert]", {
                        data: signalLinkData,
                        error: serializeSupabaseError(signalLinkInsertError),
                    });
                    recordDebug("capability_signal_links.upsert", signalLinkData, serializeSupabaseError(signalLinkInsertError));
                    if (signalLinkInsertError) {
                        throw new Error(`capability_signal_links upsert failed: ${signalLinkInsertError.message}`);
                    }
                } else {
                    console.log("[Materialize][capability_signal_links.upsert]", { data: [], error: null, skipped: true });
                    recordDebug("capability_signal_links.upsert", { skipped: true, data: [] }, null);
                }

                if (legacyEvidenceLinkRows.length > 0) {
                    // legacy compatibility-only write path.
                    const { data: legacyLinkData, error: legacyLinkInsertError } = await supabase
                        .from("capability_evidence_links")
                        .upsert(legacyEvidenceLinkRows, { onConflict: "capability_id,evidence_piece_id" })
                        .select("capability_id, evidence_piece_id, link_strength");
                    console.log("[Materialize][capability_evidence_links.upsert]", {
                        data: legacyLinkData,
                        error: serializeSupabaseError(legacyLinkInsertError),
                    });
                    recordDebug("capability_evidence_links.upsert", legacyLinkData, serializeSupabaseError(legacyLinkInsertError));
                    if (legacyLinkInsertError) {
                        throw new Error(`capability_evidence_links upsert failed: ${legacyLinkInsertError.message}`);
                    }
                } else {
                    console.log("[Materialize][capability_evidence_links.upsert]", { data: [], error: null, skipped: true });
                    recordDebug("capability_evidence_links.upsert", { skipped: true, data: [] }, null);
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
                            .filter((value): value is string => Boolean(value && value.trim().length > 0))
                    ));

                    const confidenceScore = supportingSignals.length > 0
                        ? Number((supportingSignals.reduce((sum, signal) => sum + (signal.confidence_score ?? 0.5), 0) / supportingSignals.length).toFixed(4))
                        : 0.5;

                    const dominant = (values: string[]): string => {
                        if (values.length === 0) return "unknown";
                        const counts = new Map<string, number>();
                        for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
                        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
                    };

                    const scopeSummary = dominant(
                        supportingSignals
                            .map((signal) => signal.scope_level ?? "")
                            .filter((value) => value.length > 0)
                    );
                    const ownershipSummary = dominant(
                        supportingSignals
                            .map((signal) => signal.ownership_level ?? "")
                            .filter((value) => value.length > 0)
                    );
                    const impactSummary = dominant(
                        supportingSignals
                            .map((signal) => signal.impact_signal ?? "")
                            .filter((value) => value.length > 0)
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

                    const { error: capabilityAggregateError } = await supabase
                        .from("capabilities")
                        .update({
                            canonical_name: normalizeCapabilityName(capability.name),
                            display_name: capability.name,
                            scope_summary: scopeSummary === "unknown" ? null : scopeSummary,
                            ownership_summary: ownershipSummary === "unknown" ? null : ownershipSummary,
                            impact_summary: impactSummary === "unknown" ? null : impactSummary,
                            confidence_score: confidenceScore,
                            evidence_signal_count: supportingSignalIds.length,
                            confidence: confidenceScore,
                            evidence_count: supportingEvidenceIds.length,
                            supporting_evidence_ids: supportingEvidenceIds,
                            context_domains: contextDomains,
                            scale_summary: scaleSummary,
                            confidence_level: confidenceLevel,
                        })
                        .eq("id", capability.id);

                    if (capabilityAggregateError) {
                        throw new Error(`capabilities aggregate update failed: ${capabilityAggregateError.message}`);
                    }
                }
            } else {
                console.log("[Materialize][capability_signal_links.upsert]", { data: [], error: null, skipped: true });
                recordDebug("capability_signal_links.upsert", { skipped: true, data: [] }, null);
                console.log("[Materialize][capability_evidence_links.upsert]", { data: [], error: null, skipped: true });
                recordDebug("capability_evidence_links.upsert", { skipped: true, data: [] }, null);
            }
        }

        // 6. Save skills
        const approvedCapabilityTags = new Set([
            "Leadership",
            "People Management",
            "Team Leadership",
            "Capability Building",
            "Stakeholder Influence",
            "Strategic Partnership",
        ]);

        const parsedSkills = parsedResume?.skills?.length ? parsedResume.skills : [];
        const approvedExtractedCapabilityTags = extractedSkills.filter((s) => approvedCapabilityTags.has(s));
        const rawFinalSkills = [...parsedSkills, ...approvedExtractedCapabilityTags];
        const { normalizeSkills } = await import("@/lib/career-engine/parsing/skill-normalizer");
        const finalSkills = normalizeSkills(rawFinalSkills).map(s => s.normalized);

        console.log("=== Skills Save Pipeline Debug ===");
        console.log("Raw Extracted Skills (from raw resume text regex extractor):", extractedSkills);
        console.log("Saved parsed_json.skills:", parsedJsonWithNarrative?.skills || []);
        console.log("Approved Capability Tags Merged:", approvedExtractedCapabilityTags);
        console.log("Normalized Skills to Save:", finalSkills);
        console.log("Saved user_skills:", finalSkills);
        console.log("==================================");

        if (userId) {
            // Replace previous user skill links with the latest resume-derived set.
            await supabase
                .from("user_skills")
                .delete()
                .eq("user_id", userId);
        }

        for (const skill of finalSkills) {
            // Upsert skill
            const { data: skillRecord, error: skillError } = await supabase
                .from("skills")
                .upsert({ name: skill }, { onConflict: "name" })
                .select()
                .single();

            if (!skillError && skillRecord && userId) {
                // Link skill to actual user
                await supabase
                    .from("user_skills")
                    .upsert(
                        {
                            user_id: userId,
                            skill_id: skillRecord.id,
                            proficiency: "Proficient"
                        },
                        { onConflict: "user_id, skill_id" }
                    );
            }
        }

        return NextResponse.json({
            success: true,
            ...(debugMode ? {
                debug: {
                    materializationReached,
                    materializationSteps: materializationDebug,
                },
            } : {}),
            resume: {
                id: resume.id,
                file_name: resume.file_name,
                file_url: resume.file_url,
                text_length: rawText.length,
                text_preview: rawText.slice(0, 500),
                parsedData: parsedResume ? {
                    full_name: parsedResume.full_name,
                    current_title: parsedResume.current_title,
                    years_experience: parsedResume.years_experience,
                    skills: parsedResume.skills,
                    capabilities: parsedResume.capabilities,
                    capability_evidence: capabilityEvidenceMap,
                    companies: parsedResume.companies,
                    education: parsedResume.education,
                    summary: parsedResume.summary
                } : null
            },
        });
    } catch (err) {
        console.error("Upload API error:", err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            {
                error: "Internal server error",
                debug: {
                    message,
                    materializationReached,
                    materializationSteps: materializationDebug,
                },
            },
            { status: 500 }
        );
    }
}
