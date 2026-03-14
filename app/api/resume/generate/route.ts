import { NextRequest, NextResponse } from "next/server";
import { generateResumeCopilot } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-service";
import type { ResumeCopilotPublicOutput } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";

type RequestBody = {
    profileId?: string;
    profile_id?: string;
    jobId?: string;
    job_id?: string;
    debug?: boolean;
};

type GenerateResumeCopilotFn = typeof generateResumeCopilot;

function isValidResumeOutput(value: unknown): value is ResumeCopilotPublicOutput {
    if (!value || typeof value !== "object") return false;
    const candidate = value as ResumeCopilotPublicOutput;
    if (candidate.summary !== null && typeof candidate.summary !== "string") return false;
    if (!Array.isArray(candidate.experience)) return false;
    return candidate.experience.every((item) =>
        typeof item.company === "string"
        && typeof item.role === "string"
        && typeof item.date_range === "string"
        && Array.isArray(item.bullets),
    );
}

export function createResumeGeneratePostHandler(
    generateResume: GenerateResumeCopilotFn = generateResumeCopilot,
) {
    return async function POST(request: NextRequest) {
        try {
            const body = (await request.json()) as RequestBody;
            const profileId = body.profileId?.trim() ?? body.profile_id?.trim();
            const jobId = body.jobId?.trim() ?? body.job_id?.trim();

            if (!profileId) {
                return NextResponse.json({ error: "profileId is required" }, { status: 400 });
            }
            if (!jobId) {
                return NextResponse.json({ error: "jobId is required" }, { status: 400 });
            }

            const result = await generateResume({
                profileId,
                jobId,
                options: {
                    includeDebug: Boolean(body.debug),
                },
            });

            if (!isValidResumeOutput(result.resume)) {
                return NextResponse.json({ error: "Invalid Resume Copilot output shape" }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                resume: result.resume,
                job_analysis: result.job_analysis ?? result.resume.job_analysis ?? null,
                tailoring_result: result.tailoring_result ?? null,
                ...(body.debug ? { debug: result.debug } : {}),
            });
        } catch (error) {
            console.error("resume-copilot route error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Internal server error" },
                { status: 500 },
            );
        }
    };
}

export const POST = createResumeGeneratePostHandler();
