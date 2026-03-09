import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { detectRecurringPatterns } from "@/lib/career-engine/recurring-gap-detector";

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
            .select("matched_skills, missing_skills, gap_analysis")
            .eq("user_id", profileId)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) {
            return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
        }

        const report = detectRecurringPatterns(data ?? []);
        return NextResponse.json(report);

    } catch (err) {
        console.error("career-patterns error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
