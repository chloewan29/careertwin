import { createServerSupabaseClient } from "@/lib/db/supabase/server";

export const RESUME_OUTCOME_EVENT_NAMES = [
    "resume_copilot_tailored_cv_generated",
    "resume_copilot_tailored_cv_downloaded",
    "resume_copilot_tailored_cv_regenerated",
    "resume_copilot_tailored_cv_abandoned",
    "resume_copilot_quick_check_answered_pre_generation",
    "resume_copilot_feedback_prompt_shown",
    "resume_copilot_feedback_submitted",
] as const;

export type ResumeOutcomeEventName = (typeof RESUME_OUTCOME_EVENT_NAMES)[number];

export type ResumeOutcomeFeedback = {
    credible: "yes" | "somewhat" | "no";
    relevant: "yes" | "somewhat" | "no";
    useToApply: "yes" | "maybe" | "no";
    note?: string | null;
};

export type WriteResumeOutcomeEventInput = {
    profileId: string;
    eventName: ResumeOutcomeEventName;
    eventSource?: "extension_sidepanel" | "api_download_route";
    jobId?: string | null;
    jobSnapshotId?: number | null;
    interactionId?: number | null;
    jobMatchId?: string | null;
    resumeGenerationInstanceId?: string | null;
    payload?: Record<string, unknown>;
    feedback?: ResumeOutcomeFeedback | null;
};

export class ResumeOutcomeTelemetryUnavailableError extends Error {
    readonly code: string;

    constructor(message: string, code = "resume_outcome_events_unavailable") {
        super(message);
        this.name = "ResumeOutcomeTelemetryUnavailableError";
        this.code = code;
    }
}

function normalizeOptionalString(value: unknown, max = 512): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
}

function toSafePayload(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

async function resolveJobMatchId(params: {
    profileId: string;
    jobId: string | null;
}): Promise<string | null> {
    if (!params.jobId) return null;
    const supabase = createServerSupabaseClient();

    const profileQuery = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", params.profileId)
        .limit(1);
    const userId = profileQuery.data?.[0]?.user_id ?? null;
    if (!userId) return null;

    const careerQuery = await supabase
        .from("careers")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
    const careerId = careerQuery.data?.[0]?.id ?? null;
    if (!careerId) return null;

    const primaryMatchQuery = await supabase
        .from("job_matches")
        .select("id")
        .eq("career_id", careerId)
        .eq("job_id", params.jobId)
        .limit(1);
    if (primaryMatchQuery.error) {
        return null;
    }

    return normalizeOptionalString(primaryMatchQuery.data?.[0]?.id, 80);
}

export async function writeResumeCopilotOutcomeEvent(
    input: WriteResumeOutcomeEventInput,
): Promise<{ eventId: number; jobMatchId: string | null }> {
    const profileId = normalizeOptionalString(input.profileId, 80);
    if (!profileId) {
        throw new Error("profileId is required");
    }

    const jobId = normalizeOptionalString(input.jobId, 120);
    const providedJobMatchId = normalizeOptionalString(input.jobMatchId, 120);
    const resolvedJobMatchId = providedJobMatchId ?? await resolveJobMatchId({
        profileId,
        jobId,
    });

    const feedback = input.feedback ?? null;
    const feedbackNote = feedback ? normalizeOptionalString(feedback.note, 1200) : null;
    const payload = toSafePayload(input.payload);

    const supabase = createServerSupabaseClient();
    const insertQuery = await supabase
        .from("resume_copilot_outcome_events")
        .insert({
            profile_id: profileId,
            event_name: input.eventName,
            event_source: input.eventSource ?? "extension_sidepanel",
            event_version: 1,
            event_timestamp: new Date().toISOString(),
            job_id: jobId,
            job_snapshot_id: input.jobSnapshotId ?? null,
            interaction_id: input.interactionId ?? null,
            job_match_id: resolvedJobMatchId,
            resume_generation_instance_id: normalizeOptionalString(input.resumeGenerationInstanceId, 160),
            feedback_credible: feedback?.credible ?? null,
            feedback_relevant: feedback?.relevant ?? null,
            feedback_use_to_apply: feedback?.useToApply ?? null,
            feedback_note: feedbackNote,
            payload,
        })
        .select("event_id")
        .limit(1);

    if (insertQuery.error || !insertQuery.data?.[0]?.event_id) {
        const errorCode = typeof insertQuery.error?.code === "string" ? insertQuery.error.code : "";
        const errorMessage = String(insertQuery.error?.message || "").toLowerCase();
        const missingTelemetryTable = errorCode === "PGRST205"
            || errorCode === "42P01"
            || errorMessage.includes("schema cache")
            || errorMessage.includes("could not find the table")
            || errorMessage.includes("resume_copilot_outcome_events")
            || errorMessage.includes("relation \"resume_copilot_outcome_events\" does not exist");
        if (missingTelemetryTable) {
            throw new ResumeOutcomeTelemetryUnavailableError(
                `Resume outcome telemetry unavailable: ${insertQuery.error?.message ?? "missing_table"}`,
            );
        }
        throw new Error(`Failed to write resume outcome event: ${insertQuery.error?.message ?? "missing_event_id"}`);
    }

    return {
        eventId: Number(insertQuery.data[0].event_id),
        jobMatchId: resolvedJobMatchId,
    };
}
