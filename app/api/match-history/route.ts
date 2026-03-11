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

        const { data: interactionRows, error: interactionError } = await supabase
            .from("user_job_interactions")
            .select(`
                interaction_id,
                job_snapshot_id,
                first_seen_at,
                last_seen_at,
                match_score,
                verdict,
                selected_evidence_ids,
                pipeline_status,
                pipeline_updated_at
            `)
            .eq("profile_id", profileId)
            .order("pipeline_updated_at", { ascending: false })
            .limit(20);

        if (interactionError) {
            console.error("user_job_interactions fetch error:", interactionError);
            return NextResponse.json({ error: "Failed to fetch match history" }, { status: 500 });
        }

        const snapshotIds = Array.from(
            new Set(
                (interactionRows ?? [])
                    .map((row) => row.job_snapshot_id)
                    .filter((value): value is number => typeof value === "number"),
            ),
        );

        const { data: snapshotRows, error: snapshotError } = snapshotIds.length > 0
            ? await supabase
                .from("job_snapshots")
                .select(`
                    job_snapshot_id,
                    source_platform,
                    job_url,
                    job_title,
                    company,
                    location,
                    job_description_raw
                `)
                .in("job_snapshot_id", snapshotIds)
            : { data: [], error: null };

        if (snapshotError) {
            console.error("job_snapshots fetch error:", snapshotError);
            return NextResponse.json({ error: "Failed to fetch job metadata" }, { status: 500 });
        }

        const snapshotsById = new Map(
            (snapshotRows ?? []).map((row) => [row.job_snapshot_id, row]),
        );

        const history = (interactionRows ?? []).map((row) => {
            const snapshot = snapshotsById.get(row.job_snapshot_id);
            return {
                interactionId: row.interaction_id,
                jobSnapshotId: row.job_snapshot_id,
                pipelineStatus: row.pipeline_status,
                firstSeenAt: row.first_seen_at,
                lastSeenAt: row.last_seen_at,
                pipelineUpdatedAt: row.pipeline_updated_at,
                matchScore: row.match_score,
                verdict: row.verdict,
                selectedEvidenceIds: Array.isArray(row.selected_evidence_ids)
                    ? row.selected_evidence_ids.filter((item): item is string => typeof item === "string")
                    : [],
                sourcePlatform: snapshot?.source_platform ?? null,
                jobUrl: snapshot?.job_url ?? null,
                jobTitle: snapshot?.job_title ?? null,
                company: snapshot?.company ?? null,
                location: snapshot?.location ?? null,
                jobDescriptionSnapshot: snapshot?.job_description_raw ?? null,
            };
        });

        return NextResponse.json({
            history,
            sourceOfTruth: {
                interactions: "user_job_interactions",
                snapshots: "job_snapshots",
            },
        });

    } catch (err) {
        console.error("Match history API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
