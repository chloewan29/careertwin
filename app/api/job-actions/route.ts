import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";

// LEGACY COMPAT ROUTE:
// This endpoint writes action events to user_job_actions for compatibility/audit only.
// Primary product read model is user_job_interactions + job_snapshots.

type RequestBody = {
    profileId?: string;
    job_url?: string | null;
    job_title?: string;
    company?: string | null;
    action?: "saved" | "applied" | "dismissed";
};

export async function POST(request: NextRequest) {
    try {
        // Kept intentionally as a write-only compatibility path.
        const body = (await request.json()) as RequestBody;
        const profileId = body.profileId;
        const action = body.action;
        const jobTitle = body.job_title?.trim();

        if (!profileId) {
            return NextResponse.json({ error: "profileId is required" }, { status: 400 });
        }
        if (!action || !["saved", "applied", "dismissed"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
        if (!jobTitle) {
            return NextResponse.json({ error: "job_title is required" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("id, user_id")
            .eq("id", profileId)
            .single();

        if (!profile?.id) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const { error } = await supabase
            .from("user_job_actions")
            .insert({
                user_id: profile.user_id ?? null,
                profile_id: profile.id,
                job_url: body.job_url ?? null,
                job_title: jobTitle,
                company: body.company ?? null,
                action,
            });

        if (error) {
            console.error("job-actions insert error:", error);
            return NextResponse.json({ error: "Failed to record job action" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("job-actions API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
