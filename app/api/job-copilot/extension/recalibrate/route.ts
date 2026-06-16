import { NextRequest, NextResponse } from "next/server";
import { recalculateFitAfterCalibration } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import type { JobCopilotRecalibrateInput } from "@/lib/career-engine/job-copilot/backend/job-copilot-types";

export async function POST(request: NextRequest) {
    const routeStartedAtMs = Date.now();
    try {
        const body = (await request.json()) as Partial<JobCopilotRecalibrateInput> & {
            requestId?: number;
            calibrationRequestId?: string;
            calibrationRequestTimestamp?: string;
            jobSnapshotId?: number;
            interactionId?: number;
            sourcePlatform?: "linkedin" | "seek";
            extractedJob?: {
                jobTitle?: string | null;
                company?: string | null;
                location?: string | null;
                jobDescription?: string | null;
                jobUrl?: string | null;
                sourcePlatform?: "linkedin" | "seek";
            };
            calibrationAnswers?: Array<{
                questionId?: string;
                answer?: "yes" | "no";
            }>;
        };
        const requestId = typeof body.requestId === "number" ? body.requestId : null;
        const calibrationRequestId = typeof body.calibrationRequestId === "string"
            ? body.calibrationRequestId.trim()
            : "";
        const jobSnapshotId = Number.isFinite(body.jobSnapshotId) ? body.jobSnapshotId : null;
        const interactionId = Number.isFinite(body.interactionId) ? body.interactionId : null;
        console.debug("[CareerTwin][recalibrate-route] request_received", {
            requestId,
            calibrationRequestId: calibrationRequestId || null,
            timestamp: new Date().toISOString(),
            jobSnapshotId,
            interactionId,
        });

        const source = body.source ?? body.sourcePlatform ?? body.extractedJob?.sourcePlatform;
        const jobTitle = body.jobTitle ?? body.extractedJob?.jobTitle ?? null;
        const company = body.company ?? body.extractedJob?.company ?? null;
        const location = body.location ?? body.extractedJob?.location ?? null;
        const jobDescription = body.jobDescription ?? body.extractedJob?.jobDescription ?? null;
        const jobUrl = body.jobUrl ?? body.extractedJob?.jobUrl ?? null;
        const calibrationAnswers = Array.isArray(body.calibrationAnswers)
            ? body.calibrationAnswers
                .filter((item): item is { questionId: string; answer: "yes" | "no" } =>
                    Boolean(item?.questionId?.trim()) && (item?.answer === "yes" || item?.answer === "no"))
                .map((item) => ({
                    questionId: item.questionId.trim(),
                    answer: item.answer,
                }))
            : [];
        if (!body.profileId?.trim()) {
            return NextResponse.json({ error: "profileId is required", code: "missing_profile_id" }, { status: 400 });
        }
        if (!source || (source !== "linkedin" && source !== "seek")) {
            return NextResponse.json({ error: "source must be linkedin|seek", code: "invalid_source" }, { status: 400 });
        }
        if (!jobTitle?.trim()) {
            return NextResponse.json({ error: "jobTitle is required", code: "missing_job_title" }, { status: 400 });
        }
        if (!jobDescription?.trim() || jobDescription.trim().length < 120) {
            return NextResponse.json({ error: "jobDescription is too short", code: "job_description_too_short" }, { status: 400 });
        }

        console.debug("[CareerTwin][recalibrate-route] recalibration_start", {
            requestId,
            calibrationRequestId: calibrationRequestId || null,
            timestamp: new Date().toISOString(),
        });
        const result = await recalculateFitAfterCalibration({
            profileId: body.profileId.trim(),
            source,
            jobUrl: jobUrl?.trim() ?? null,
            jobTitle: jobTitle.trim(),
            company: company?.trim() ?? null,
            location: location?.trim() ?? null,
            jobDescription: jobDescription.trim(),
            calibrationAnswers,
            topEvidenceLimit: body.topEvidenceLimit,
        });
        const calibration = result
            && result.response
            && result.response.job_analysis
            && result.response.job_analysis.calibration
            ? result.response.job_analysis.calibration
            : null;
        const memoryCapturePromptPresent = Boolean(calibration && calibration.memory_capture_prompt);
        const durationMs = Math.max(0, Date.now() - routeStartedAtMs);
        console.debug("[CareerTwin][recalibrate-route] recalibration_end", {
            requestId,
            calibrationRequestId: calibrationRequestId || null,
            timestamp: new Date().toISOString(),
            durationMs,
            memoryCapturePromptPresent,
        });
        console.debug("[CareerTwin][recalibrate-route] response_sent", {
            requestId,
            calibrationRequestId: calibrationRequestId || null,
            timestamp: new Date().toISOString(),
            status: 200,
            durationMs,
            memoryCapturePromptPresent,
        });

        return NextResponse.json(
            result,
            {
                headers: {
                    "x-careertwin-request-id": typeof requestId === "number" ? String(requestId) : "",
                    "x-careertwin-calibration-request-id": calibrationRequestId || "",
                    "x-careertwin-duration-ms": String(durationMs),
                },
            },
        );
    } catch (error) {
        console.error("job-copilot extension recalibrate error:", error);
        console.debug("[CareerTwin][recalibrate-route] response_sent", {
            timestamp: new Date().toISOString(),
            status: 500,
            durationMs: Math.max(0, Date.now() - routeStartedAtMs),
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error", code: "internal_error" },
            { status: 500 },
        );
    }
}
