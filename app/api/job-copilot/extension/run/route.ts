import { NextRequest, NextResponse } from "next/server";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type RunRequestBody = {
    profileId?: string;
    extractedJob?: {
        jobTitle?: string | null;
        company?: string | null;
        location?: string | null;
        jobDescription?: string | null;
        jobUrl?: string;
        sourcePlatform?: "linkedin" | "seek";
    };
    topEvidenceLimit?: number;
};

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as RunRequestBody;
        const profileId = body.profileId?.trim();
        const extracted = body.extractedJob;

        if (!profileId) {
            return NextResponse.json({ error: "profileId is required", code: "missing_profile_id" }, { status: 400 });
        }
        if (!extracted?.sourcePlatform || !["linkedin", "seek"].includes(extracted.sourcePlatform)) {
            return NextResponse.json({ error: "sourcePlatform is required", code: "invalid_source" }, { status: 400 });
        }
        if (!extracted.jobTitle?.trim()) {
            return NextResponse.json({ error: "jobTitle is required", code: "missing_job_title" }, { status: 400 });
        }
        if (!extracted.jobDescription?.trim() || extracted.jobDescription.trim().length < 120) {
            return NextResponse.json({ error: "jobDescription is too short", code: "job_description_too_short" }, { status: 400 });
        }

        const result = await analyzeJobForCopilot({
            profileId,
            source: extracted.sourcePlatform,
            jobUrl: extracted.jobUrl?.trim() ?? null,
            jobTitle: extracted.jobTitle.trim(),
            company: extracted.company?.trim() ?? null,
            location: extracted.location?.trim() ?? null,
            jobDescription: extracted.jobDescription.trim(),
            topEvidenceLimit: body.topEvidenceLimit,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("job-copilot extension run error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error", code: "internal_error" },
            { status: 500 },
        );
    }
}

