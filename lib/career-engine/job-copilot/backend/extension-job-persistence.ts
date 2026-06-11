import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobCopilotSource, JobCopilotVerdict } from "@/lib/career-engine/job-copilot/extension-contract";

function normalizeDescription(input: string): string {
    return input
        .replace(/\u00a0/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function computeContentHash(params: {
    sourcePlatform: JobCopilotSource;
    jobUrl: string | null;
    normalizedDescription: string;
}): string {
    return crypto
        .createHash("sha256")
        .update([params.sourcePlatform, params.jobUrl ?? "", params.normalizedDescription].join("|"))
        .digest("hex");
}

function deriveExtractionQuality(params: {
    jobTitle: string | null;
    company: string | null;
    normalizedDescription: string;
}): "strong" | "weak" {
    const normalizedLower = params.normalizedDescription.toLowerCase();
    const teaserMarkers = [
        "be an early applicant",
        "posted on",
        "hours ago",
        "days ago",
        "company alumni work here",
        "people clicked apply",
        "easy apply",
        "reposted",
    ];
    const teaserMarkerHits = teaserMarkers.reduce((count, marker) => (
        normalizedLower.includes(marker) ? count + 1 : count
    ), 0);
    const descriptionWeak = params.normalizedDescription.length < 200
        || (params.normalizedDescription.length < 420 && teaserMarkerHits > 0);
    const titleAndCompanyMissing = !params.jobTitle && !params.company;
    return descriptionWeak || titleAndCompanyMissing ? "weak" : "strong";
}

function normalizeInteractionMatchScore(matchScore: number): number {
    // user_job_interactions.match_score is INTEGER, so normalize right before persistence.
    return Math.round(matchScore);
}

async function getExistingInteraction(
    supabase: SupabaseClient,
    profileId: string,
    jobSnapshotId: number,
) {
    const { data } = await supabase
        .from("user_job_interactions")
        .select("interaction_id, pipeline_status")
        .eq("profile_id", profileId)
        .eq("job_snapshot_id", jobSnapshotId)
        .limit(1);
    return data?.[0] ?? null;
}

export async function persistExtensionViewedJob(params: {
    supabase: SupabaseClient;
    profileId: string;
    sourcePlatform: JobCopilotSource;
    jobUrl: string | null;
    jobTitle: string;
    company: string | null;
    location: string | null;
    jobDescriptionRaw: string;
    jobSignalsJson: Record<string, unknown>;
    matchScore: number;
    verdict: JobCopilotVerdict;
    selectedEvidenceIds: string[];
    resumeGenerated: boolean;
}) {
    const normalizedMatchScore = normalizeInteractionMatchScore(params.matchScore);
    const normalizedDescription = normalizeDescription(params.jobDescriptionRaw);
    const contentHash = computeContentHash({
        sourcePlatform: params.sourcePlatform,
        jobUrl: params.jobUrl,
        normalizedDescription,
    });
    const extractionQuality = deriveExtractionQuality({
        jobTitle: params.jobTitle ?? null,
        company: params.company,
        normalizedDescription,
    });

    const { data: snapshotRows, error: snapshotError } = await params.supabase
        .from("job_snapshots")
        .upsert(
            {
                source_platform: params.sourcePlatform,
                job_url: params.jobUrl,
                job_title: params.jobTitle,
                company: params.company,
                location: params.location,
                job_description_raw: params.jobDescriptionRaw,
                job_description_normalized: normalizedDescription,
                extracted_at: new Date().toISOString(),
                extraction_quality: extractionQuality,
                content_hash: contentHash,
                job_signals_json: params.jobSignalsJson,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "source_platform,content_hash" },
        )
        .select("job_snapshot_id")
        .limit(1);

    if (snapshotError || !snapshotRows?.[0]?.job_snapshot_id) {
        throw new Error(`Failed to persist job snapshot: ${snapshotError?.message ?? "missing_job_snapshot_id"}`);
    }

    const jobSnapshotId = Number(snapshotRows[0].job_snapshot_id);
    const existing = await getExistingInteraction(params.supabase, params.profileId, jobSnapshotId);
    const preservedStatus = existing?.pipeline_status === "applied" || existing?.pipeline_status === "interview"
        ? existing.pipeline_status
        : "viewed";

    if (existing) {
        const { error: updateError } = await params.supabase
            .from("user_job_interactions")
            .update({
                last_seen_at: new Date().toISOString(),
                source: "extension",
                match_score: normalizedMatchScore,
                verdict: params.verdict,
                selected_evidence_ids: params.selectedEvidenceIds,
                resume_generated: params.resumeGenerated,
                pipeline_status: preservedStatus,
                pipeline_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("interaction_id", existing.interaction_id);
        if (updateError) throw new Error(`Failed to update job interaction: ${updateError.message}`);
        return { jobSnapshotId, interactionId: Number(existing.interaction_id), extractionQuality };
    }

    const { data: insertedRows, error: insertError } = await params.supabase
        .from("user_job_interactions")
        .insert({
            profile_id: params.profileId,
            job_snapshot_id: jobSnapshotId,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            source: "extension",
            match_score: normalizedMatchScore,
            verdict: params.verdict,
            selected_evidence_ids: params.selectedEvidenceIds,
            resume_generated: params.resumeGenerated,
            pipeline_status: "viewed",
            pipeline_updated_at: new Date().toISOString(),
        })
        .select("interaction_id")
        .limit(1);
    if (insertError || !insertedRows?.[0]?.interaction_id) {
        throw new Error(`Failed to create job interaction: ${insertError?.message ?? "missing_interaction_id"}`);
    }
    return {
        jobSnapshotId,
        interactionId: Number(insertedRows[0].interaction_id),
        extractionQuality,
    };
}

export async function markInteractionApplied(params: {
    supabase: SupabaseClient;
    profileId: string;
    jobSnapshotId: number | null;
    matchScore: number;
    verdict: JobCopilotVerdict | null;
    selectedEvidenceIds: string[];
    resumeGenerated: boolean;
}) {
    if (!params.jobSnapshotId) return;
    const normalizedMatchScore = normalizeInteractionMatchScore(params.matchScore);

    const existing = await getExistingInteraction(params.supabase, params.profileId, params.jobSnapshotId);
    if (!existing) {
        await params.supabase
            .from("user_job_interactions")
            .insert({
                profile_id: params.profileId,
                job_snapshot_id: params.jobSnapshotId,
                first_seen_at: new Date().toISOString(),
                last_seen_at: new Date().toISOString(),
                source: "extension",
                match_score: normalizedMatchScore,
                verdict: params.verdict,
                selected_evidence_ids: params.selectedEvidenceIds,
                resume_generated: params.resumeGenerated,
                resume_downloaded_at: new Date().toISOString(),
                pipeline_status: "applied",
                pipeline_updated_at: new Date().toISOString(),
            });
        return;
    }

    await params.supabase
        .from("user_job_interactions")
        .update({
            last_seen_at: new Date().toISOString(),
            match_score: normalizedMatchScore,
            verdict: params.verdict,
            selected_evidence_ids: params.selectedEvidenceIds,
            resume_generated: params.resumeGenerated,
            resume_downloaded_at: new Date().toISOString(),
            pipeline_status: "applied",
            pipeline_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("interaction_id", existing.interaction_id);
}
