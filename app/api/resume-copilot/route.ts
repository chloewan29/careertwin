import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import {
    generateTailoredResume,
    type ResumeCopilotOptions,
    type TailoredResume,
} from "@/lib/resumeCopilot/resume-copilot-engine";
import {
    ResumeCopilotRepositoryError,
    SupabaseResumeCopilotRepository,
} from "@/lib/resumeCopilot/supabase-resume-copilot-repository";

type RequestBody = {
    jobId?: string;
    job_id?: string;
    careerId?: string;
    career_id?: string;
    profileId?: string;
    existingSummary?: string | null;
    options?: ResumeCopilotOptions;
};

type ProfileLookupRow = {
    user_id: string | null;
};

class HttpError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = "HttpError";
    }
}

function isValidTailoredResumeShape(value: unknown): value is TailoredResume {
    if (!value || typeof value !== "object") return false;
    const candidate = value as TailoredResume;
    if (typeof candidate.target_job_id !== "string") return false;
    if (!Array.isArray(candidate.experiences)) return false;
    if (!candidate.audit || typeof candidate.audit !== "object") return false;
    if (typeof candidate.audit.total_evidence_loaded !== "number") return false;
    if (typeof candidate.audit.total_evidence_selected !== "number") return false;
    return true;
}

async function resolveCareerId(params: {
    supabase: ReturnType<typeof createServerSupabaseClient>;
    suppliedCareerId?: string;
    profileId?: string;
}): Promise<string> {
    if (params.suppliedCareerId) {
        return params.suppliedCareerId;
    }

    if (!params.profileId) {
        throw new HttpError("Either careerId or profileId is required", 400);
    }

    const { data: profile, error: profileError } = await params.supabase
        .from("profiles")
        .select("user_id")
        .eq("id", params.profileId)
        .single();

    if (profileError || !profile) {
        throw new HttpError(
            `Failed to resolve profile ${params.profileId}: ${profileError?.message ?? "not found"}`,
            404,
        );
    }

    const userId = (profile as ProfileLookupRow).user_id;
    if (!userId) {
        throw new HttpError(`Profile ${params.profileId} has no user_id`, 400);
    }

    const { data: careers, error: careerError } = await params.supabase
        .from("careers")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (careerError) {
        throw new Error(`Failed to load careers for user ${userId}: ${careerError.message}`);
    }

    const careerId = careers?.[0]?.id;
    if (!careerId) {
        throw new HttpError(`No career found for profile ${params.profileId}`, 404);
    }

    return careerId;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as RequestBody;
        const jobId = body.jobId?.trim() ?? body.job_id?.trim();
        const supabase = createServerSupabaseClient();

        if (!jobId) {
            return NextResponse.json({ error: "jobId is required" }, { status: 400 });
        }

        const careerId = await resolveCareerId({
            supabase,
            suppliedCareerId: body.careerId?.trim() ?? body.career_id?.trim(),
            profileId: body.profileId?.trim(),
        });

        console.log("resume-copilot request", {
            jobId,
            careerId,
            profileId: body.profileId ?? null,
        });

        const repository = new SupabaseResumeCopilotRepository(supabase);
        const summary = body.existingSummary ?? (await repository.getCareerSummary(careerId));

        const tailoredResume = await generateTailoredResume({
            repository,
            careerId,
            jobId,
            existingSummary: summary,
            options: body.options,
        });

        if (!isValidTailoredResumeShape(tailoredResume)) {
            throw new HttpError("Invalid TailoredResume payload generated", 500);
        }

        // Guardrail: all bullets must be grounded in evidence_pieces.
        const hasUngroundedBullet = tailoredResume.experiences.some((experience) =>
            experience.bullets.some((bullet) => !bullet.evidence_piece_id)
        );
        if (hasUngroundedBullet) {
            return NextResponse.json(
                { error: "Ungrounded bullet detected. All bullets must map to evidence_pieces." },
                { status: 500 }
            );
        }

        const selectedBulletCount = tailoredResume.experiences.reduce(
            (total, experience) => total + experience.bullets.length,
            0,
        );
        console.log("resume-copilot output summary", {
            jobId,
            careerId,
            experiences: tailoredResume.experiences.length,
            selectedBullets: selectedBulletCount,
            totalEvidenceLoaded: tailoredResume.audit.total_evidence_loaded,
            totalEvidenceRanked: tailoredResume.audit.total_evidence_ranked,
            totalEvidenceSelected: tailoredResume.audit.total_evidence_selected,
        });

        if (tailoredResume.audit.total_evidence_loaded === 0) {
            console.warn("resume-copilot: no evidence_pieces found for career", { careerId, jobId });
        }

        return NextResponse.json({
            success: true,
            tailoredResume,
        });
    } catch (error) {
        console.error("resume-copilot error:", error);
        if (error instanceof ResumeCopilotRepositoryError) {
            const status = error.code === "JOB_SIGNALS_NOT_FOUND" ? 404 : 500;
            return NextResponse.json({ error: error.message }, { status });
        }
        const status = error instanceof HttpError ? error.status : 500;
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}
