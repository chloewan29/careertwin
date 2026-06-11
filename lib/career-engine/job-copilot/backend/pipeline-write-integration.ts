import { createServerSupabaseClient } from "@/lib/db/supabase/server";

export async function writeAppliedPipelineAction(params: {
    profileId: string;
    jobTitle: string;
    company: string | null;
    jobUrl: string | null;
    sourcePlatform: "linkedin" | "seek" | null;
    location: string | null;
    jobDescriptionSnapshot: string | null;
    matchScore: number | null;
    verdict: "strong_fit" | "possible_fit" | "stretch" | "low_fit" | null;
    selectedEvidenceIds: string[];
}) {
    const supabase = createServerSupabaseClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", params.profileId)
        .single();

    if (!profile?.id) {
        throw new Error("Profile not found");
    }

    // user_job_actions is compatibility-only and can lag newer optional telemetry columns.
    const { error: actionError } = await supabase
        .from("user_job_actions")
        .insert({
            user_id: profile.user_id ?? null,
            profile_id: profile.id,
            job_url: params.jobUrl,
            job_title: params.jobTitle,
            company: params.company,
            action: "applied",
        });

    if (actionError) {
        throw new Error(`Failed to record applied action: ${actionError.message}`);
    }
}
