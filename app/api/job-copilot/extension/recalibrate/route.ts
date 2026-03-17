import { NextRequest, NextResponse } from "next/server";
import { recalculateFitAfterCalibration } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import type { JobCopilotRecalibrateInput } from "@/lib/career-engine/job-copilot/backend/job-copilot-types";

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Partial<JobCopilotRecalibrateInput> & {
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

        return NextResponse.json(result);
    } catch (error) {
        console.error("job-copilot extension recalibrate error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error", code: "internal_error" },
            { status: 500 },
        );
    }
}
