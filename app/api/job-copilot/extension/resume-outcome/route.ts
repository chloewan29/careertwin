import { NextRequest, NextResponse } from "next/server";
import {
    RESUME_OUTCOME_EVENT_NAMES,
    ResumeOutcomeTelemetryUnavailableError,
    writeResumeCopilotOutcomeEvent,
} from "@/lib/career-engine/job-copilot/backend/resume-outcome-events";

type ResumeOutcomeRequestBody = {
    profileId?: unknown;
    eventName?: unknown;
    jobId?: unknown;
    jobSnapshotId?: unknown;
    interactionId?: unknown;
    jobMatchId?: unknown;
    resumeGenerationInstanceId?: unknown;
    payload?: unknown;
    feedback?: unknown;
};

type ResumeOutcomeRequestFeedback = {
    credible: "yes" | "somewhat" | "no";
    relevant: "yes" | "somewhat" | "no";
    useToApply: "yes" | "maybe" | "no";
    note: string | null;
};

type ResumeOutcomeEventName = (typeof RESUME_OUTCOME_EVENT_NAMES)[number];

const RESUME_OUTCOME_EVENT_NAME_SET = new Set<string>(RESUME_OUTCOME_EVENT_NAMES);

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeFeedback(value: unknown): ResumeOutcomeRequestFeedback | null {
    if (!isPlainObject(value)) return null;
    const credible = value.credible;
    const relevant = value.relevant;
    const useToApply = value.useToApply;
    if (
        (credible !== "yes" && credible !== "somewhat" && credible !== "no")
        || (relevant !== "yes" && relevant !== "somewhat" && relevant !== "no")
        || (useToApply !== "yes" && useToApply !== "maybe" && useToApply !== "no")
    ) {
        return null;
    }
    return {
        credible,
        relevant,
        useToApply,
        note: typeof value.note === "string" ? value.note : null,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as ResumeOutcomeRequestBody;
        const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
        if (!profileId) {
            return NextResponse.json({ error: "profileId is required", code: "missing_profile_id" }, { status: 400 });
        }

        const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
        if (!RESUME_OUTCOME_EVENT_NAME_SET.has(eventName)) {
            return NextResponse.json({ error: "Invalid eventName", code: "invalid_event_name" }, { status: 400 });
        }

        const feedback = normalizeFeedback(body.feedback);
        if (eventName === "resume_copilot_feedback_submitted" && !feedback) {
            return NextResponse.json({ error: "Valid feedback payload is required", code: "missing_feedback_payload" }, { status: 400 });
        }

        const payload = isPlainObject(body.payload) ? body.payload : {};
        const result = await writeResumeCopilotOutcomeEvent({
            profileId,
            eventName: eventName as ResumeOutcomeEventName,
            eventSource: "extension_sidepanel",
            jobId: typeof body.jobId === "string" ? body.jobId.trim() : null,
            jobSnapshotId: typeof body.jobSnapshotId === "number" ? body.jobSnapshotId : null,
            interactionId: typeof body.interactionId === "number" ? body.interactionId : null,
            jobMatchId: typeof body.jobMatchId === "string" ? body.jobMatchId.trim() : null,
            resumeGenerationInstanceId: typeof body.resumeGenerationInstanceId === "string"
                ? body.resumeGenerationInstanceId.trim()
                : null,
            payload,
            feedback,
        });

        return NextResponse.json({
            success: true,
            ok: true,
            telemetry_recorded: true,
            eventId: result.eventId,
            jobMatchId: result.jobMatchId,
        });
    } catch (error) {
        if (error instanceof ResumeOutcomeTelemetryUnavailableError) {
            console.warn("job-copilot extension resume outcome telemetry unavailable:", error.message);
            return NextResponse.json({
                success: true,
                ok: true,
                telemetry_recorded: false,
                telemetry_warning: "resume_outcome_events_unavailable",
            });
        }
        console.error("job-copilot extension resume outcome error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error", code: "internal_error" },
            { status: 500 },
        );
    }
}
