import { NextRequest, NextResponse } from "next/server";
import { downloadTailoredResumeAndMarkApplied } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import type { JobCopilotDownloadInput } from "@/lib/career-engine/job-copilot/backend/job-copilot-types";

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Partial<JobCopilotDownloadInput>;
        if (!body.profileId?.trim()) {
            return NextResponse.json({ error: "profileId is required", code: "missing_profile_id" }, { status: 400 });
        }
        if (!body.jobId?.trim()) {
            return NextResponse.json({ error: "jobId is required", code: "missing_job_id" }, { status: 400 });
        }

        const result = await downloadTailoredResumeAndMarkApplied({
            profileId: body.profileId.trim(),
            jobId: body.jobId.trim(),
            jobSnapshotId: body.jobSnapshotId ?? null,
            jobTitle: body.jobTitle?.trim() ?? null,
            company: body.company?.trim() ?? null,
            jobUrl: body.jobUrl?.trim() ?? null,
            sourcePlatform: body.sourcePlatform ?? null,
            location: body.location?.trim() ?? null,
            jobDescriptionSnapshot: body.jobDescriptionSnapshot?.trim() ?? null,
            matchScore: body.matchScore ?? null,
            verdict: body.verdict ?? null,
            selectedEvidenceIds: Array.isArray(body.selectedEvidenceIds)
                ? body.selectedEvidenceIds.filter((item): item is string => typeof item === "string")
                : [],
        });

        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        const lower = message.toLowerCase();
        const code = lower.includes("low fit")
            ? "low_fit_no_resume"
            : lower.includes("profile not found")
                ? "profile_not_found"
                : lower.includes("run analyze before downloading resume")
                    ? "job_match_not_found"
                    : lower.includes("no career memory found")
                        ? "career_not_found"
                        : "internal_error";
        const status = code === "profile_not_found"
            ? 404
            : code === "job_match_not_found" || code === "career_not_found"
                ? 409
                : code === "low_fit_no_resume"
                    ? 400
                    : 500;

        console.error("job-copilot extension download error:", error);
        return NextResponse.json({ error: message, code }, { status });
    }
}
