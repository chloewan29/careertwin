import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get("profileId");

        if (!profileId) {
            return NextResponse.json({ error: "profileId is required" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        const { data, error } = await supabase
            .from("job_matches")
            .select(`
                id,
                created_at,
                target_title,
                target_company,
                match_score,
                matched_skills,
                missing_skills,
                gap_analysis,
                action_plan
            `)
            .eq("user_id", profileId)
            .order("created_at", { ascending: false })
            .limit(5);

        if (error) {
            console.error("job_matches fetch error:", error);
            return NextResponse.json({ error: "Failed to fetch match history" }, { status: 500 });
        }

        return NextResponse.json({ history: data ?? [] });

    } catch (err) {
        console.error("Match history API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
