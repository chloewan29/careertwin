import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { createClient } from "@supabase/supabase-js";
import mammoth from "mammoth";
import { createHash, randomUUID } from "node:crypto";
import type {
    AtomicEvidenceMaterialization,
    AtomicEvidenceReload,
    AtomicEvidenceRepository,
} from "@/lib/career-engine/evidence/atomic-evidence-ingestion";

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
    let atomicEvidenceSummary: {
        roleCount: number;
        sourceUnitCount: number;
        evidenceCount: number;
        unknownFateCount: number;
        duplicateEvidenceIdCount: number;
        crossRoleAttributionCount: number;
        reloadMatches: boolean;
        idempotentReplay: boolean;
    } | null = null;
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

        // 1. Establish an immutable source revision before storage or parsing.
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const sourceRevisionSha256 = createHash("sha256").update(buffer).digest("hex");
        const { data: existingResumeRevision, error: existingResumeRevisionError } = await supabase
            .from("resumes")
            .select("id, profile_id, file_name, file_url, raw_text, parsed_json, content_sha256, materialization_status")
            .eq("profile_id", profileId)
            .eq("content_sha256", sourceRevisionSha256)
            .maybeSingle();
        if (existingResumeRevisionError) {
            throw new Error(`Resume source revision lookup failed: ${existingResumeRevisionError.message}`);
        }

        let publicUrl = existingResumeRevision?.file_url as string | undefined;
        if (!existingResumeRevision) {
            const storagePath = `${profileId}/${sourceRevisionSha256}-${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from("resumes")
                .upload(storagePath, buffer, {
                    contentType: file.type,
                    upsert: true,
                });

            if (uploadError) {
                console.error("Storage upload error:", uploadError);
                return NextResponse.json(
                    { error: `Upload failed: ${uploadError.message}` },
                    { status: 500 }
                );
            }

            const publicUrlResult = supabase.storage.from("resumes").getPublicUrl(storagePath);
            publicUrl = publicUrlResult.data.publicUrl;
        }

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

        // 4b. Reserve a stable candidate identity. The resume row itself is
        // persisted only inside publish_atomic_career_memory.
        const parsedJsonWithNarrative = parsedResume ? { ...parsedResume, narrative: profileNarrative } : null;
        const resume = existingResumeRevision ?? {
            id: randomUUID(),
            profile_id: profileId,
            file_name: fileName,
            file_url: publicUrl ?? null,
            raw_text: rawText,
            parsed_json: parsedJsonWithNarrative,
            content_sha256: sourceRevisionSha256,
            materialization_status: null,
        };

        // 5. Resolve publication ownership. Candidate profile fields are written
        // inside publish_atomic_career_memory with the rest of the publication.
        // Null out summary if it looks like a date, location, or company line (not a real summary)
        const summaryIsWeak = !parsedResume?.summary
            || parsedResume.summary.length < 30
            || /^\d{4}|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(parsedResume.summary)
            || /,\s+[A-Z][a-z]/.test(parsedResume.summary) && parsedResume.summary.split(" ").length < 5;

        const { data: publicationProfile, error: profileError } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("id", profileId)
            .single();

        let userId = publicationProfile?.user_id as string | null;
        console.log("[Materialize][Gate] profile ownership result", {
            data: publicationProfile,
            error: serializeSupabaseError(profileError),
            hasUserId: Boolean(userId),
        });
        recordDebug("materialize.gate", publicationProfile, serializeSupabaseError(profileError));

        if (profileError) {
            console.error("Profile ownership load error:", profileError);
            throw new Error(`Profile ownership load failed before materialization: ${profileError.message}`);
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

            const careerUpsertPayload = {
                user_id: userId,
                headline: parsedResume?.current_title ?? null,
                summary: summaryIsWeak ? null : parsedResume?.summary ?? null,
                total_years_experience: parsedResume?.years_experience ?? null,
            };

            let careerId: string;
            let expectedPreviousActiveResumeId: string | null = null;
            let currentActiveResumeId: string | null = null;
            const { data: existingCareers, error: careerLoadError } = await supabase
                .from("careers")
                .select("id, active_resume_id")
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
                currentActiveResumeId = (existingCareers[0].active_resume_id as string | null) ?? null;
                expectedPreviousActiveResumeId = currentActiveResumeId;
                if (resume.materialization_status === "completed" && currentActiveResumeId === resume.id) {
                    const storedExpected = (resume.parsed_json as Record<string, unknown> | null)?._career_memory_publication;
                    if (storedExpected && typeof storedExpected === "object") {
                        const value = (storedExpected as Record<string, unknown>).expected_previous_active_resume_id;
                        expectedPreviousActiveResumeId = typeof value === "string" ? value : null;
                    }
                }
            } else {
                careerId = randomUUID();
            }

            const {
                ATOMIC_EVIDENCE_CONTRACT_VERSION,
                buildAtomicEvidenceSourceUnit,
                ingestCanonicalAtomicEvidence,
            } = await import("@/lib/career-engine/evidence/atomic-evidence-ingestion");
            const { atomicEvidenceGeminiProvider } = await import("@/lib/career-engine/evidence/atomic-evidence-gemini-provider");
            const { extractResumeEvidenceFromText } = await import("@/lib/career-possibility/resume-evidence-text-extractor");
            const extraction = extractResumeEvidenceFromText({
                text: rawText,
                documentId: `resume-document:${sourceRevisionSha256}`,
                bundleId: `resume-bundle:${sourceRevisionSha256}`,
                extractionRunId: `resume-extraction:${sourceRevisionSha256}`,
                parserVersion: "career-twin-text-resume-extractor/1.1.0",
                normalisationVersion: "canonical-lf/1.0.0",
            });
            if (!extraction.ok) {
                throw new Error(`Validated resume role/source-unit extraction failed with ${extraction.issues.length} issue(s)`);
            }
            const atomicRoles = extraction.bundle.employmentRecords.map((record, index) => {
                const roleRef = `ROLE_${String(index + 1).padStart(2, "0")}`;
                return {
                    roleRef,
                    company: record.employerName?.value ?? roleRef,
                    title: record.roleTitle?.value ?? roleRef,
                    dateRange: [record.startDate?.value, record.endDate?.value].filter(Boolean).join(" - ") || roleRef,
                    sortOrder: index,
                };
            });
            const roleRefByEmploymentId = new Map(extraction.bundle.employmentRecords.map((record, index) => [record.id, atomicRoles[index].roleRef]));
            const atomicSourceUnits = extraction.bundle.evidenceRecords.flatMap((record, index) => {
                const roleRef = roleRefByEmploymentId.get(record.employmentRecordId);
                if (!roleRef) return [];
                return [buildAtomicEvidenceSourceUnit({
                    sourceUnitRef: `SOURCE_${String(index + 1).padStart(3, "0")}`,
                    roleRef,
                    sourceUnitOrdinal: index,
                    sourceText: record.sourceText,
                })];
            });

            let preparedMaterialization: AtomicEvidenceMaterialization | null = null;
            const atomicRepository: AtomicEvidenceRepository = {
                async loadBySourceRevision({ careerId: reloadCareerId, sourceRevisionSha256: revision }): Promise<AtomicEvidenceReload | null> {
                    if (preparedMaterialization) return preparedMaterialization;
                    const [experienceResult, sourceUnitResult, evidenceResult] = await Promise.all([
                        supabase.from("experiences")
                            .select("id, company, title, date_range, sort_order, source_role_ref, source_revision_sha256, materialization_version")
                            .eq("career_id", reloadCareerId)
                            .eq("source_revision_sha256", revision)
                            .order("sort_order", { ascending: true }),
                        supabase.from("career_source_units")
                            .select("id, resume_id, experience_id, source_revision_sha256, source_role_ref, source_unit_ref, source_unit_ordinal, source_unit_sha256, source_text, fate, provider, model, provider_version, validation_errors")
                            .eq("career_id", reloadCareerId)
                            .eq("source_revision_sha256", revision)
                            .order("source_unit_ordinal", { ascending: true }),
                        supabase.from("evidence_pieces")
                            .select("id, experience_id, source_unit_id, source_revision_sha256, source_role_ref, source_unit_ref, source_quote, source_span_start, source_span_end, atomic_index, atomic_statement, context, action, outcome, source_supported_metrics, extraction_confidence, provider, provider_model, provider_version, review_status")
                            .eq("career_id", reloadCareerId)
                            .eq("source_revision_sha256", revision)
                            .order("source_unit_ref", { ascending: true })
                            .order("atomic_index", { ascending: true }),
                    ]);
                    if (experienceResult.error) throw new Error(`Atomic experience reload failed: ${experienceResult.error.message}`);
                    if (sourceUnitResult.error) throw new Error(`Atomic source-unit reload failed: ${sourceUnitResult.error.message}`);
                    if (evidenceResult.error) throw new Error(`Atomic evidence reload failed: ${evidenceResult.error.message}`);
                    if (!sourceUnitResult.data || sourceUnitResult.data.length === 0) return null;
                    const reloadedExperiences = (experienceResult.data ?? []).map((row) => ({
                        id: row.id,
                        roleRef: row.source_role_ref,
                        company: row.company,
                        title: row.title,
                        dateRange: row.date_range,
                        sortOrder: row.sort_order,
                        sourceRevisionSha256: row.source_revision_sha256,
                        materializationVersion: row.materialization_version,
                    }));
                    const reloadedSourceUnits = sourceUnitResult.data.map((row) => ({
                        id: row.id,
                        experienceId: row.experience_id,
                        roleRef: row.source_role_ref,
                        sourceUnitRef: row.source_unit_ref,
                        sourceUnitOrdinal: row.source_unit_ordinal,
                        sourceText: row.source_text,
                        sourceUnitSha256: row.source_unit_sha256,
                        sourceRevisionSha256: row.source_revision_sha256,
                        fate: row.fate,
                        provider: row.provider,
                        model: row.model,
                        providerVersion: row.provider_version,
                        validationErrors: Array.isArray(row.validation_errors) ? row.validation_errors.filter((item): item is string => typeof item === "string") : [],
                    }));
                    const reloadedEvidence = (evidenceResult.data ?? []).map((row) => ({
                        id: row.id,
                        experienceId: row.experience_id,
                        sourceUnitId: row.source_unit_id,
                        sourceRevisionSha256: row.source_revision_sha256,
                        roleRef: row.source_role_ref,
                        sourceUnitRef: row.source_unit_ref,
                        sourceQuote: row.source_quote,
                        sourceSpanStart: row.source_span_start,
                        sourceSpanEnd: row.source_span_end,
                        atomicIndex: row.atomic_index,
                        atomicStatement: row.atomic_statement,
                        context: row.context,
                        action: row.action,
                        outcome: row.outcome,
                        sourceSupportedMetrics: Array.isArray(row.source_supported_metrics) ? row.source_supported_metrics.filter((item): item is string => typeof item === "string") : [],
                        extractionConfidence: Number(row.extraction_confidence),
                        provider: row.provider,
                        model: row.provider_model,
                        providerVersion: row.provider_version,
                        reviewStatus: row.review_status,
                    }));
                    const reload = {
                        careerId: reloadCareerId,
                        resumeId: sourceUnitResult.data[0].resume_id,
                        sourceRevisionSha256: revision,
                        experiences: reloadedExperiences as AtomicEvidenceReload["experiences"],
                        sourceUnits: reloadedSourceUnits as AtomicEvidenceReload["sourceUnits"],
                        evidence: reloadedEvidence as AtomicEvidenceReload["evidence"],
                    };
                    const retryableFailure = reload.sourceUnits.some((unit) => unit.fate === "PROVIDER_FAILURE");
                    const committedReplay = resume.materialization_status === "completed"
                        && currentActiveResumeId === resume.id;
                    return retryableFailure || committedReplay ? reload : null;
                },
                async persist(materialization: AtomicEvidenceMaterialization): Promise<void> {
                    preparedMaterialization = materialization;
                },
            };

            const atomicIngestion = await ingestCanonicalAtomicEvidence({
                contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
                careerId,
                resumeId: resume.id,
                sourceRevisionSha256,
                roles: atomicRoles,
                sourceUnits: atomicSourceUnits,
            }, {
                provider: atomicEvidenceGeminiProvider,
                repository: atomicRepository,
            });
            recordDebug("atomic_evidence.reconciliation", atomicIngestion.reconciliation, null);
            const atomicHardFailure = atomicIngestion.materialization.sourceUnits.some(
                (unit) => unit.fate === "PROVIDER_FAILURE" || unit.fate === "VALIDATION_REJECTED",
            );
            const {
                buildAtomicCareerMemoryPublication,
                publishAtomicCareerMemory,
            } = await import("@/lib/career-engine/evidence/transactional-career-memory-publication");
            const publicationPayload = buildAtomicCareerMemoryPublication({
                materialization: atomicIngestion.materialization,
                expectedPreviousActiveResumeId,
                profile: {
                    id: profileId,
                    user_id: userId,
                    current_title: parsedResume?.current_title ?? null,
                    years_experience: parsedResume?.years_experience ?? null,
                    seniority_level: careerProfile.seniority_level ?? null,
                    industry: parsedResume?.industry ?? null,
                    summary: summaryIsWeak ? null : parsedResume?.summary ?? null,
                    companies: parsedResume?.companies ?? [],
                    capabilities: parsedResume?.capabilities ?? [],
                    capability_evidence: capabilityEvidenceMap,
                    ...(parsedResume?.full_name ? { display_name: parsedResume.full_name } : {}),
                },
                resume: {
                    id: resume.id,
                    user_id: userId,
                    profile_id: profileId,
                    file_name: (resume.file_name as string | null) ?? fileName,
                    file_url: (resume.file_url as string | null) ?? publicUrl ?? null,
                    raw_text: rawText,
                    parsed_json: parsedJsonWithNarrative,
                    content_sha256: sourceRevisionSha256,
                },
                career: {
                    id: careerId,
                    ...careerUpsertPayload,
                },
                hasBusinessContext,
            });
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!serviceRoleKey) {
                throw new Error("Transactional publication requires SUPABASE_SERVICE_ROLE_KEY");
            }
            const publicationClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
            const publicationResult = await publishAtomicCareerMemory(publicationClient, publicationPayload);
            recordDebug("atomic_evidence.publication", {
                outcome: publicationResult.outcome,
                fingerprint: publicationResult.fingerprint,
                counts: publicationResult.counts,
            }, null);
            atomicEvidenceSummary = {
                ...atomicIngestion.reconciliation,
                idempotentReplay: publicationResult.outcome === "COMPLETE_REPLAY",
            };
            if (atomicHardFailure || publicationResult.outcome === "NEEDS_REVIEW") {
                throw new Error("Atomic evidence materialization was persisted for review but was not admitted downstream");
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
            atomicEvidence: atomicEvidenceSummary,
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
