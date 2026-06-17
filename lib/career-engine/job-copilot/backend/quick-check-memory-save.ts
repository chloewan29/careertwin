import { extractEvidenceSignalsFromPiece } from "@/lib/career-engine/evidence/evidence-signals";
import { inferCapabilities } from "@/lib/career-engine/capability/capability-inference";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import type { JobCopilotSaveQuickCheckMemoryInput } from "./job-copilot-types";

type TableSchema = {
    columns: Set<string>;
};

const QUICK_CHECK_CONTEXT_SIGNATURE_REGEX = /context:\s*[\s\S]{0,220}?requirement\s+for\s+/i;

export type QuickCheckMemorySaveResult = {
    evidencePieceId: string;
    duplicateFound: boolean;
    actionTaken: "saved_new" | "skipped_existing";
    message: string;
    metadataUpdated: boolean;
};

function normalizeCapabilityName(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeTitleForDedupe(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toDisplayCapabilityName(value: string): string {
    const normalized = normalizeCapabilityName(value);
    if (normalized === "mmm") return "MMM";
    if (normalized.length === 0) return "";
    return normalized
        .split(" ")
        .map((token) => token[0].toUpperCase() + token.slice(1))
        .join(" ");
}

function dedupeStrings(values: string[]): string[] {
    const out: string[] = [];
    for (const value of values) {
        const normalized = value.trim();
        if (!normalized) continue;
        if (!out.includes(normalized)) out.push(normalized);
    }
    return out;
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function normalizeCapabilityTagSet(values: string[]): Set<string> {
    return new Set(
        values
            .map((value) => normalizeCapabilityName(value))
            .filter(Boolean),
    );
}

function setIntersectionCount(left: Set<string>, right: Set<string>): number {
    let count = 0;
    const iterate = left.size <= right.size ? left : right;
    const target = iterate === left ? right : left;
    for (const value of iterate) {
        if (target.has(value)) count += 1;
    }
    return count;
}

function isSameSet(left: Set<string>, right: Set<string>): boolean {
    if (left.size !== right.size) return false;
    for (const value of left) {
        if (!right.has(value)) return false;
    }
    return true;
}

function hasHighlySimilarCapabilityTags(existingTags: Set<string>, incomingTags: Set<string>): boolean {
    if (existingTags.size === 0 || incomingTags.size === 0) return false;
    if (isSameSet(existingTags, incomingTags)) return true;
    const intersection = setIntersectionCount(existingTags, incomingTags);
    if (intersection < 2) return false;
    const union = existingTags.size + incomingTags.size - intersection;
    if (union <= 0) return false;
    const jaccard = intersection / union;
    return jaccard >= 0.8;
}

function extractRequirementClusterFromInferredScope(inferredScope: unknown): string {
    const record = toObjectRecord(inferredScope);
    if (!record) return "";

    const quickCheck = toObjectRecord(record.quick_check);
    if (quickCheck && typeof quickCheck.requirement_cluster === "string") {
        return normalizeCapabilityName(quickCheck.requirement_cluster);
    }

    const jobContext = toObjectRecord(record.job_context);
    if (jobContext && typeof jobContext.requirement_cluster === "string") {
        return normalizeCapabilityName(jobContext.requirement_cluster);
    }
    return "";
}

function extractCapabilityTagsFromInferredScope(inferredScope: unknown): string[] {
    const record = toObjectRecord(inferredScope);
    if (!record) return [];

    const direct = toStringArray(record.capability_tags);
    if (direct.length > 0) return direct;

    const quickCheck = toObjectRecord(record.quick_check);
    if (quickCheck) {
        const quickCheckTags = toStringArray(quickCheck.capability_tags);
        if (quickCheckTags.length > 0) return quickCheckTags;
    }
    return [];
}

type QuickCheckEvidenceCandidateRow = {
    id: string;
    summary?: string | null;
    action?: string | null;
    raw_text?: string | null;
    source_type?: string | null;
    evidence_source_type?: string | null;
    inferred_scope?: unknown;
};

function isQuickCheckSourceRow(row: QuickCheckEvidenceCandidateRow): boolean {
    if (row.source_type === "quick_check") return true;
    if (row.source_type === "manual" && QUICK_CHECK_CONTEXT_SIGNATURE_REGEX.test((row.raw_text ?? "").toLowerCase())) {
        return true;
    }
    if (typeof row.evidence_source_type === "string" && row.evidence_source_type.trim().length > 0) {
        return row.evidence_source_type.trim() === "quick_check_confirmation";
    }
    const inferredScope = toObjectRecord(row.inferred_scope);
    return Boolean(inferredScope && inferredScope.source === "quick_check_confirmation");
}

async function findExistingQuickCheckDuplicate(params: {
    supabase: ReturnType<typeof createServerSupabaseClient>;
    evidenceSchema: TableSchema;
    careerId: string;
    prompt: JobCopilotSaveQuickCheckMemoryInput["memoryCapturePrompt"];
}): Promise<string | null> {
    const incomingTitle = normalizeTitleForDedupe(params.prompt.title);
    const incomingRequirementCluster = normalizeCapabilityName(params.prompt.requirement_cluster);
    const incomingTags = normalizeCapabilityTagSet(params.prompt.capability_tags);
    if (!incomingTitle || !incomingRequirementCluster || incomingTags.size === 0) {
        return null;
    }

    const candidateColumns = dedupeStrings([
        "id",
        params.evidenceSchema.columns.has("summary") ? "summary" : "",
        params.evidenceSchema.columns.has("action") ? "action" : "",
        params.evidenceSchema.columns.has("raw_text") ? "raw_text" : "",
        params.evidenceSchema.columns.has("source_type") ? "source_type" : "",
        params.evidenceSchema.columns.has("evidence_source_type") ? "evidence_source_type" : "",
        params.evidenceSchema.columns.has("inferred_scope") ? "inferred_scope" : "",
    ]);
    const selectColumns = candidateColumns.length > 0 ? candidateColumns.join(", ") : "id";
    const { data, error } = await params.supabase
        .from("evidence_pieces")
        .select(selectColumns)
        .eq("career_id", params.careerId)
        .order("created_at", { ascending: false })
        .limit(250);
    if (error) {
        throw new Error(`Failed loading existing quick-check evidence for dedupe: ${error.message}`);
    }

    const rows = Array.isArray(data) ? (data as unknown as QuickCheckEvidenceCandidateRow[]) : [];
    for (const row of rows) {
        if (!row?.id) continue;
        if (!isQuickCheckSourceRow(row)) continue;

        const existingRequirementCluster = extractRequirementClusterFromInferredScope(row.inferred_scope);
        if (!existingRequirementCluster || existingRequirementCluster !== incomingRequirementCluster) continue;

        const existingTitle = normalizeTitleForDedupe(
            typeof row.summary === "string" && row.summary.trim().length > 0
                ? row.summary
                : (typeof row.action === "string" && row.action.trim().length > 0
                    ? row.action
                    : (typeof row.raw_text === "string" ? row.raw_text : "")),
        );
        if (!existingTitle || existingTitle !== incomingTitle) continue;

        const existingTags = normalizeCapabilityTagSet(extractCapabilityTagsFromInferredScope(row.inferred_scope));
        if (!hasHighlySimilarCapabilityTags(existingTags, incomingTags)) continue;

        return row.id;
    }

    return null;
}

function toQuickCheckRawText(params: {
    promptDescription: string;
    requirementCluster: string;
    jobTitle: string;
}): string {
    const description = params.promptDescription.trim();
    const roleLabel = params.requirementCluster.trim() || "quick check";
    const title = params.jobTitle.trim() || "this role";
    const contextLine = `Context: ${roleLabel} requirement for ${title}.`;
    const composed = description
        ? `${description}\n${contextLine}`
        : contextLine;
    return composed.trim();
}

function isSourceTypeConstraintViolation(errorMessage: string): boolean {
    const normalized = errorMessage.toLowerCase();
    return normalized.includes("source_type_check")
        || normalized.includes("source_type")
            && normalized.includes("violates check constraint");
}

async function tableHasColumn(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    table: string,
    column: string,
): Promise<boolean> {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (!error) return true;
    if (error.code === "42703" || /column .* does not exist/i.test(error.message)) return false;
    if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) return false;
    throw new Error(`Failed probing ${table}.${column}: ${error.message}`);
}

async function detectTableSchema(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    table: string,
    candidates: string[],
): Promise<TableSchema> {
    const columns = new Set<string>();
    for (const candidate of candidates) {
        if (await tableHasColumn(supabase, table, candidate)) {
            columns.add(candidate);
        }
    }
    return { columns };
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

function normalizePromptStrength(value: number): number {
    if (!Number.isFinite(value)) return 0.6;
    if (value >= 0.72) return 0.72;
    return 0.6;
}

function isGoalSignalPrompt(prompt: JobCopilotSaveQuickCheckMemoryInput["memoryCapturePrompt"]): boolean {
    return prompt.memory_target === "goal_signal"
        || prompt.question_purpose === "goal_direction_confirmation"
        || prompt.source === "quick_check_goal_signal";
}

function normalizeGoalSignalType(value: string | undefined): "target_path" | "avoid_path" | "priority" | "constraint" | "preference" {
    if (value === "target_path" || value === "avoid_path" || value === "priority" || value === "constraint" || value === "preference") {
        return value;
    }
    return "priority";
}

function normalizeGoalSignalStrength(value: string | undefined): "low" | "medium" | "high" {
    if (value === "low" || value === "medium" || value === "high") return value;
    return "medium";
}

function normalizeGoalSignalConfidence(value: string | undefined): "explicit" | "inferred" | "weak_inferred" {
    if (value === "explicit" || value === "inferred" || value === "weak_inferred") return value;
    return "inferred";
}

function normalizeGoalSignalSource(value: string | undefined): "quick_check" | "user_answer" | "saved_role" | "cv_angle_selected" | "manual_profile" {
    if (value === "quick_check" || value === "user_answer" || value === "saved_role" || value === "cv_angle_selected" || value === "manual_profile") {
        return value;
    }
    return "quick_check";
}

function normalizeGoalSignalStatus(value: string | undefined): "active" | "stale" | "rejected" {
    if (value === "active" || value === "stale" || value === "rejected") return value;
    return "active";
}

function validatePrompt(input: JobCopilotSaveQuickCheckMemoryInput): void {
    const prompt = input.memoryCapturePrompt;
    if (!prompt) {
        throw new Error("memoryCapturePrompt is required");
    }
    if (isGoalSignalPrompt(prompt)) {
        const label = prompt.goal_signal?.label?.trim()
            || prompt.title?.trim()
            || prompt.target_area?.trim()
            || "";
        if (!prompt.question_id?.trim()) {
            throw new Error("memoryCapturePrompt.question_id is required");
        }
        if (!label) {
            throw new Error("memoryCapturePrompt goal-signal label is required");
        }
        if (!prompt.description?.trim() && !prompt.goal_signal?.description?.trim()) {
            throw new Error("memoryCapturePrompt goal-signal description is required");
        }
        return;
    }
    if (prompt.source !== "quick_check_confirmation") {
        throw new Error("memoryCapturePrompt.source must be quick_check_confirmation");
    }
    if (prompt.confidence !== "self_declared") {
        throw new Error("memoryCapturePrompt.confidence must be self_declared");
    }
    if (!Number.isFinite(prompt.strength) || prompt.strength < 0.6 || prompt.strength > 0.72) {
        throw new Error("memoryCapturePrompt.strength must be between 0.6 and 0.72");
    }
    if (!prompt.requirement_cluster?.trim()) {
        throw new Error("memoryCapturePrompt.requirement_cluster is required");
    }
    if (!prompt.title?.trim() || !prompt.description?.trim()) {
        throw new Error("memoryCapturePrompt title/description are required");
    }
    if (!Array.isArray(prompt.capability_tags) || prompt.capability_tags.length === 0) {
        throw new Error("memoryCapturePrompt.capability_tags are required");
    }
}

async function saveQuickCheckGoalSignal(input: JobCopilotSaveQuickCheckMemoryInput): Promise<QuickCheckMemorySaveResult> {
    const supabase = createServerSupabaseClient();
    const prompt = input.memoryCapturePrompt;
    const goalSignalInput = prompt.goal_signal ?? null;
    const label = (
        goalSignalInput?.label
        || prompt.title
        || prompt.target_area
    ).trim();
    const description = (
        goalSignalInput?.description
        || prompt.description
    ).trim();
    const signalType = normalizeGoalSignalType(goalSignalInput?.signal_type);
    const strength = normalizeGoalSignalStrength(goalSignalInput?.strength);
    const confidence = normalizeGoalSignalConfidence(goalSignalInput?.confidence ?? prompt.confidence);
    const source = normalizeGoalSignalSource(goalSignalInput?.source);
    const status = normalizeGoalSignalStatus(goalSignalInput?.status);
    const sourceRefId = goalSignalInput?.source_ref_id?.trim() || prompt.question_id.trim();

    const { data: existingRows, error: existingError } = await supabase
        .from("career_goal_signals")
        .select("id, label, status")
        .eq("profile_id", input.profileId.trim())
        .eq("signal_type", signalType)
        .order("updated_at", { ascending: false })
        .limit(50);
    if (existingError) {
        throw new Error(`Failed loading existing goal signals: ${existingError.message}`);
    }
    const normalizedIncomingLabel = normalizeTitleForDedupe(label);
    const existing = (existingRows ?? []).find((row) =>
        normalizeTitleForDedupe(typeof row.label === "string" ? row.label : "") === normalizedIncomingLabel,
    ) as { id: string; status: string } | undefined;

    if (existing?.id) {
        if (existing.status === "active") {
            return {
                evidencePieceId: existing.id,
                duplicateFound: true,
                actionTaken: "skipped_existing",
                message: "This career direction signal is already active.",
                metadataUpdated: false,
            };
        }
        const { error: reviveError } = await supabase
            .from("career_goal_signals")
            .update({
                description: description || null,
                strength,
                confidence,
                source,
                source_ref_id: sourceRefId || null,
                status: "active",
            })
            .eq("id", existing.id);
        if (reviveError) {
            throw new Error(`Failed updating goal signal: ${reviveError.message}`);
        }
        return {
            evidencePieceId: existing.id,
            duplicateFound: true,
            actionTaken: "saved_new",
            message: "Career direction signal updated and re-activated.",
            metadataUpdated: true,
        };
    }

    const { data: insertedRows, error: insertError } = await supabase
        .from("career_goal_signals")
        .insert({
            profile_id: input.profileId.trim(),
            signal_type: signalType,
            label,
            description: description || null,
            strength,
            confidence,
            source,
            source_ref_id: sourceRefId || null,
            status,
        })
        .select("id")
        .limit(1);
    if (insertError || !insertedRows?.[0]?.id) {
        throw new Error(`Failed to insert career goal signal: ${insertError?.message ?? "missing_goal_signal_id"}`);
    }

    return {
        evidencePieceId: insertedRows[0].id as string,
        duplicateFound: false,
        actionTaken: "saved_new",
        message: "Saved as a career direction signal.",
        metadataUpdated: false,
    };
}

async function resolveCareerContext(params: {
    supabase: ReturnType<typeof createServerSupabaseClient>;
    profileId: string;
    fallbackJobTitle: string;
    fallbackCompany: string | null;
}): Promise<{
    careerId: string;
    experienceId: string;
    company: string;
    role: string;
    dateRange: string;
}> {
    const { data: profile, error: profileError } = await params.supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", params.profileId)
        .single();
    if (profileError || !profile?.id) {
        throw new Error("Profile not found");
    }

    const { data: careers, error: careerError } = await params.supabase
        .from("careers")
        .select("id")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1);
    if (careerError || !careers?.[0]?.id) {
        throw new Error("No career memory found");
    }
    const careerId = careers[0].id as string;

    const { data: experiences } = await params.supabase
        .from("experiences")
        .select("id, company, title, date_range, sort_order")
        .eq("career_id", careerId)
        .order("sort_order", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
    const latestExperience = experiences?.[0] ?? null;
    if (latestExperience?.id) {
        return {
            careerId,
            experienceId: latestExperience.id as string,
            company: (latestExperience.company as string) || params.fallbackCompany || "Unknown company",
            role: (latestExperience.title as string) || params.fallbackJobTitle,
            dateRange: (latestExperience.date_range as string) || "Recent",
        };
    }

    const { data: insertedExperienceRows, error: experienceInsertError } = await params.supabase
        .from("experiences")
        .insert({
            career_id: careerId,
            company: params.fallbackCompany || "Career Memory",
            title: params.fallbackJobTitle || "Role",
            date_range: "Recent",
            source_type: "manual",
            sort_order: 0,
        })
        .select("id, company, title, date_range")
        .limit(1);
    if (experienceInsertError || !insertedExperienceRows?.[0]?.id) {
        throw new Error(`Failed to create fallback experience: ${experienceInsertError?.message ?? "missing_experience_id"}`);
    }
    const inserted = insertedExperienceRows[0];
    return {
        careerId,
        experienceId: inserted.id as string,
        company: (inserted.company as string) || params.fallbackCompany || "Career Memory",
        role: (inserted.title as string) || params.fallbackJobTitle,
        dateRange: (inserted.date_range as string) || "Recent",
    };
}

export async function saveQuickCheckMemoryEvidence(input: JobCopilotSaveQuickCheckMemoryInput): Promise<QuickCheckMemorySaveResult> {
    validatePrompt(input);
    const prompt = input.memoryCapturePrompt;
    if (isGoalSignalPrompt(prompt)) {
        return saveQuickCheckGoalSignal(input);
    }
    const promptStrength = normalizePromptStrength(prompt.strength);
    const supabase = createServerSupabaseClient();

    const [evidenceSchema, signalSchema, capabilitySchema, signalLinkSchema, legacyLinkSchema] = await Promise.all([
        detectTableSchema(supabase, "evidence_pieces", [
            "career_id", "experience_id", "company", "role", "date_range", "raw_text", "source_type",
            "evidence_source_type", "summary", "action", "business_context", "confidence", "confidence_level",
            "inferred_scope", "inferred_scale", "missing_fields", "sort_order",
            "memory_status", "evidence_authority_scope",
        ]),
        detectTableSchema(supabase, "evidence_signals", [
            "id", "career_id", "evidence_piece_id", "action", "domain", "initiative_type", "scope_level", "ownership_level",
            "stakeholder_scope", "tool_signals", "capability_hints", "team_signal", "impact_signal", "confidence_score",
        ]),
        detectTableSchema(supabase, "capabilities", [
            "id", "career_id", "name", "normalized_name", "canonical_name", "display_name", "confidence_score",
            "confidence", "confidence_level", "evidence_signal_count", "evidence_count", "supporting_evidence_ids", "context_domains",
        ]),
        detectTableSchema(supabase, "capability_signal_links", [
            "capability_id", "evidence_signal_id", "contribution_weight", "rationale",
        ]),
        detectTableSchema(supabase, "capability_evidence_links", [
            "capability_id", "evidence_piece_id", "link_strength",
        ]),
    ]);

    const context = await resolveCareerContext({
        supabase,
        profileId: input.profileId.trim(),
        fallbackJobTitle: input.jobTitle.trim(),
        fallbackCompany: input.company,
    });

    const existingEvidenceId = await findExistingQuickCheckDuplicate({
        supabase,
        evidenceSchema,
        careerId: context.careerId,
        prompt,
    });
    if (existingEvidenceId) {
        return {
            evidencePieceId: existingEvidenceId,
            duplicateFound: true,
            actionTaken: "skipped_existing",
            message: "This is already saved in your career memory.",
            metadataUpdated: false,
        };
    }

    const baseEvidenceRow = {
        career_id: context.careerId,
        experience_id: context.experienceId,
        company: context.company,
        role: context.role,
        date_range: context.dateRange,
        raw_text: toQuickCheckRawText({
            promptDescription: prompt.description,
            requirementCluster: prompt.requirement_cluster,
            jobTitle: input.jobTitle,
        }),
        source_type: "quick_check",
        evidence_source_type: "quick_check_confirmation",
        memory_status: "candidate",
        evidence_authority_scope: "single_job",
        summary: prompt.title.trim(),
        action: prompt.title.trim(),
        business_context: `Quick check confirmation for ${prompt.requirement_cluster} in ${input.jobTitle}.`,
        confidence: promptStrength,
        confidence_level: "medium",
        inferred_scope: {
            source: "quick_check_confirmation",
            confidence: "self_declared",
            capability_tags: prompt.capability_tags,
            job_context: prompt.job_context,
            quick_check: {
                question_id: prompt.question_id,
                question: prompt.question,
                target_area: prompt.target_area,
                requirement_cluster: prompt.requirement_cluster,
            },
        },
        inferred_scale: {
            strength: promptStrength,
        },
        missing_fields: ["metrics", "project_specifics"],
    } as const;
    const tryInsertEvidence = async (sourceType: "quick_check" | "manual"): Promise<{ evidencePieceId: string; sourceTypeUsed: "quick_check" | "manual"; }> => {
        const evidenceRow = pickObjectColumns(evidenceSchema, {
            ...baseEvidenceRow,
            source_type: sourceType,
        });
        const { data: insertedEvidenceRows, error: insertEvidenceError } = await supabase
            .from("evidence_pieces")
            .insert(evidenceRow)
            .select("id")
            .limit(1);
        if (insertEvidenceError || !insertedEvidenceRows?.[0]?.id) {
            throw new Error(insertEvidenceError?.message ?? "missing_evidence_piece_id");
        }
        return {
            evidencePieceId: insertedEvidenceRows[0].id as string,
            sourceTypeUsed: sourceType,
        };
    };

    let evidencePieceId = "";
    try {
        const insertResult = await tryInsertEvidence("quick_check");
        evidencePieceId = insertResult.evidencePieceId;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "insert_failed");
        if (isSourceTypeConstraintViolation(message) && evidenceSchema.columns.has("source_type")) {
            try {
                const fallbackResult = await tryInsertEvidence("manual");
                evidencePieceId = fallbackResult.evidencePieceId;
            } catch (fallbackError) {
                const fallbackMessage = fallbackError instanceof Error
                    ? fallbackError.message
                    : String(fallbackError ?? "insert_failed");
                throw new Error(`Failed to insert quick-check evidence: ${fallbackMessage}`);
            }
        } else {
            throw new Error(`Failed to insert quick-check evidence: ${message}`);
        }
    }

    const rawSignals = extractEvidenceSignalsFromPiece({
        id: evidencePieceId,
        career_id: context.careerId,
        raw_text: prompt.description,
    });
    const fallbackSignal = rawSignals.length === 0
        ? [{
            career_id: context.careerId,
            evidence_piece_id: evidencePieceId,
            action: "confirmed",
            domain: prompt.job_context.domain,
            initiative_type: "analytics",
            scope_level: "project",
            ownership_level: "owner",
            stakeholder_scope: ["cross_functional"],
            tool_signals: [],
            capability_hints: prompt.capability_tags,
            team_signal: null,
            impact_signal: "strategic",
            confidence_score: promptStrength,
        }]
        : rawSignals;
    const signalInsertRows = fallbackSignal.map((signal) => pickObjectColumns(signalSchema, {
        ...signal,
        domain: signal.domain ?? prompt.job_context.domain,
        capability_hints: dedupeStrings([...(signal.capability_hints ?? []), ...prompt.capability_tags]),
        confidence_score: Math.min(promptStrength, signal.confidence_score ?? promptStrength),
    }));
    const { data: insertedSignalRows, error: insertSignalError } = await supabase
        .from("evidence_signals")
        .insert(signalInsertRows)
        .select("id, evidence_piece_id, action, domain, initiative_type, scope_level, ownership_level, stakeholder_scope, tool_signals, capability_hints, team_signal, impact_signal, confidence_score");
    if (insertSignalError) {
        throw new Error(`Failed to insert quick-check evidence signals: ${insertSignalError.message}`);
    }
    const signals = insertedSignalRows ?? [];
    if (signals.length === 0) {
        throw new Error("No evidence signals persisted for quick-check confirmation");
    }

    const inferred = inferCapabilities({
        evidence_signals: signals.map((signal) => ({
            id: signal.id as string,
            evidence_piece_id: signal.evidence_piece_id as string,
            career_id: context.careerId,
            action: (signal.action as string | null) ?? null,
            domain: (signal.domain as string | null) ?? null,
            initiative_type: (signal.initiative_type as string | null) ?? null,
            scope_level: (signal.scope_level as string | null) ?? null,
            ownership_level: (signal.ownership_level as string | null) ?? null,
            stakeholder_scope: Array.isArray(signal.stakeholder_scope) ? signal.stakeholder_scope as string[] : [],
            tool_signals: Array.isArray(signal.tool_signals) ? signal.tool_signals as string[] : [],
            capability_hints: Array.isArray(signal.capability_hints) ? signal.capability_hints as string[] : [],
            team_signal: (signal.team_signal as string | null) ?? null,
            impact_signal: (signal.impact_signal as string | null) ?? null,
            confidence_score: typeof signal.confidence_score === "number" ? signal.confidence_score : 0.6,
        })),
    });
    const inferredCapabilityNames = dedupeStrings([
        ...inferred.capabilities,
        ...prompt.capability_tags.map((tag) => toDisplayCapabilityName(tag)),
    ]);
    const normalizedNames = inferredCapabilityNames.map((name) => normalizeCapabilityName(name)).filter(Boolean);

    const { data: existingCapabilities } = normalizedNames.length > 0
        ? await supabase
            .from("capabilities")
            .select("id, name, normalized_name")
            .eq("career_id", context.careerId)
            .in("normalized_name", normalizedNames)
        : { data: [] as Array<{ id: string; name: string; normalized_name: string }> };
    const existingByNormalized = new Map<string, { id: string }>(
        (existingCapabilities ?? []).map((row) => [normalizeCapabilityName(row.normalized_name), { id: row.id }]),
    );

    const capabilityInsertRows = inferredCapabilityNames
        .filter((name) => !existingByNormalized.has(normalizeCapabilityName(name)))
        .map((name) => pickObjectColumns(capabilitySchema, {
            career_id: context.careerId,
            name,
            normalized_name: normalizeCapabilityName(name),
            canonical_name: normalizeCapabilityName(name),
            display_name: name,
            confidence_score: 0.6,
            confidence: 0.6,
            confidence_level: "medium",
            evidence_signal_count: 0,
            evidence_count: 0,
            supporting_evidence_ids: [],
            context_domains: prompt.job_context.domain ? [prompt.job_context.domain] : [],
        }));
    if (capabilityInsertRows.length > 0) {
        const { error: insertCapabilityError } = await supabase
            .from("capabilities")
            .insert(capabilityInsertRows);
        if (insertCapabilityError) {
            throw new Error(`Failed to insert quick-check capabilities: ${insertCapabilityError.message}`);
        }
    }

    const { data: linkedCapabilities } = normalizedNames.length > 0
        ? await supabase
            .from("capabilities")
            .select("id, name, normalized_name")
            .eq("career_id", context.careerId)
            .in("normalized_name", normalizedNames)
        : { data: [] as Array<{ id: string; name: string; normalized_name: string }> };
    const capabilityIdByNormalized = new Map<string, string>(
        (linkedCapabilities ?? []).map((row) => [normalizeCapabilityName(row.normalized_name), row.id]),
    );

    const signalById = new Map<string, { evidence_piece_id: string }>(
        signals.map((signal) => [signal.id as string, { evidence_piece_id: signal.evidence_piece_id as string }]),
    );
    const signalLinkRows: Array<{ capability_id: string; evidence_signal_id: string; contribution_weight: number; rationale: string }> = [];
    const legacyLinkRows: Array<{ capability_id: string; evidence_piece_id: string; link_strength: number }> = [];
    const seenSignalLinks = new Set<string>();
    const seenLegacyLinks = new Set<string>();

    for (const capabilityEvidence of inferred.evidence_map) {
        const capabilityId = capabilityIdByNormalized.get(normalizeCapabilityName(capabilityEvidence.capability));
        if (!capabilityId) continue;
        for (const signalId of capabilityEvidence.evidence_signal_ids ?? []) {
            const signal = signalById.get(signalId);
            if (!signal) continue;
            const signalKey = `${capabilityId}::${signalId}`;
            if (!seenSignalLinks.has(signalKey)) {
                seenSignalLinks.add(signalKey);
                signalLinkRows.push({
                    capability_id: capabilityId,
                    evidence_signal_id: signalId,
                    contribution_weight: promptStrength,
                    rationale: "User confirmed via quick check.",
                });
            }
            const legacyKey = `${capabilityId}::${signal.evidence_piece_id}`;
            if (!seenLegacyLinks.has(legacyKey)) {
                seenLegacyLinks.add(legacyKey);
                legacyLinkRows.push({
                    capability_id: capabilityId,
                    evidence_piece_id: signal.evidence_piece_id,
                    link_strength: promptStrength,
                });
            }
        }
    }

    if (signalLinkRows.length === 0) {
        const firstSignalId = signals[0]?.id as string | undefined;
        if (firstSignalId) {
            for (const [normalizedName, capabilityId] of capabilityIdByNormalized.entries()) {
                if (!normalizedName || !capabilityId) continue;
                signalLinkRows.push({
                    capability_id: capabilityId,
                    evidence_signal_id: firstSignalId,
                    contribution_weight: promptStrength,
                    rationale: "User confirmed via quick check.",
                });
                legacyLinkRows.push({
                    capability_id: capabilityId,
                    evidence_piece_id: evidencePieceId,
                    link_strength: promptStrength,
                });
            }
        }
    }

    if (signalLinkRows.length > 0 && signalLinkSchema.columns.has("capability_id") && signalLinkSchema.columns.has("evidence_signal_id")) {
        const { error: signalLinkError } = await supabase
            .from("capability_signal_links")
            .upsert(signalLinkRows.map((row) => pickObjectColumns(signalLinkSchema, row)), {
                onConflict: "capability_id,evidence_signal_id",
            });
        if (signalLinkError) {
            throw new Error(`Failed to upsert capability signal links: ${signalLinkError.message}`);
        }
    }

    if (legacyLinkRows.length > 0 && legacyLinkSchema.columns.has("capability_id") && legacyLinkSchema.columns.has("evidence_piece_id")) {
        await supabase
            .from("capability_evidence_links")
            .upsert(legacyLinkRows.map((row) => pickObjectColumns(legacyLinkSchema, row)), {
                onConflict: "capability_id,evidence_piece_id",
            });
    }

    return {
        evidencePieceId,
        duplicateFound: false,
        actionTaken: "saved_new",
        message: "Saved to your career memory. We'll use this in future role matching and tailored CVs.",
        metadataUpdated: false,
    };
}
