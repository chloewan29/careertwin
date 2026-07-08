import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PROFILE_ID = "8ec2c318-dbd0-42e2-acc7-10a103284b53";
const TARGET_SNAPSHOT = 3186;

async function run() {
    const { data: origSnap, error: err1 } = await supabase
        .from("job_snapshots")
        .select("*")
        .eq("job_snapshot_id", TARGET_SNAPSHOT)
        .single();
    
    if (err1) {
        console.error("Failed to fetch target snapshot:", err1);
        return;
    }

    const jobUrl = origSnap.job_url;

    // 2. Find ALL snapshots for this URL
    const { data: allSnaps, error: err2 } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id, job_url, content_hash, extracted_at")
        .eq("job_url", jobUrl);

    if (err2 || !allSnaps) {
        console.error("Failed to fetch related snapshots:", err2);
        return;
    }

    // 3. Find ALL interactions for these snapshots
    const snapIds = allSnaps.map((s: any) => s.job_snapshot_id);
    const { data: allInteractions, error: err3 } = await supabase
        .from("user_job_interactions")
        .select("interaction_id, job_snapshot_id, match_score, verdict, first_seen_at, last_seen_at, pipeline_updated_at")
        .eq("profile_id", PROFILE_ID)
        .in("job_snapshot_id", snapIds)
        .order("last_seen_at", { ascending: false });

    if (err3 || !allInteractions) {
        console.error("Failed to fetch interactions:", err3);
        return;
    }

    // 4. Trace the website score selection logic (Ledger + Interview)
    const latestScoreByUrl = new Map<string, any>();
    for (const row of allInteractions) {
        const snap = allSnaps.find((s: any) => s.job_snapshot_id === row.job_snapshot_id);
        const url = snap?.job_url?.trim()?.toLowerCase();
        if (!url) continue;
        const existing = latestScoreByUrl.get(url);
        if (!existing || (row.last_seen_at && (!existing.last_seen_at || row.last_seen_at > existing.last_seen_at))) {
            latestScoreByUrl.set(url, { match_score: row.match_score, last_seen_at: row.last_seen_at, source_snapshot: row.job_snapshot_id });
        }
    }

    const result = {
        targetJobUrl: jobUrl,
        snapshots: allSnaps.map((s: any) => ({
            snapshot_id: s.job_snapshot_id,
            url_match: s.job_url === jobUrl ? "EXACT" : "MISMATCH",
            content_hash: s.content_hash?.substring(0, 10) + "...",
            extracted_at: s.extracted_at
        })),
        interactions: allInteractions.map((i: any) => ({
            interaction_id: i.interaction_id,
            snapshot_id: i.job_snapshot_id,
            match_score: i.match_score,
            verdict: i.verdict,
            last_seen_at: i.last_seen_at,
            pipeline_updated_at: i.pipeline_updated_at
        })),
        websiteSelection: Array.from(latestScoreByUrl.entries()).map(([k, v]: any) => ({
            url: k,
            score: v.match_score,
            source_snapshot: v.source_snapshot
        }))
    };
    
    fs.writeFileSync('artifacts/evidence.json', JSON.stringify(result, null, 2));
}

run().catch(console.error);
