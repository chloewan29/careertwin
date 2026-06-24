import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getCapabilityMatchV1 } from "@/lib/career-engine/matching/capability-match-v1";
import {
    getCapabilityMatchV2,
    type MatchReplayVariantSummary,
    type MatchVariantConfig,
    type MatchVariantName,
} from "@/lib/career-engine/matching/capability-match-v2";

type ReplayArgs = {
    profileId: string | null;
    careerId: string | null;
    interactionId: number | null;
    jobSnapshotId: number | null;
    jobTitle: string | null;
    company: string | null;
    jobDescriptionFile: string | null;
    outFile: string | null;
};

type ResolvedCase = {
    profileId: string;
    careerId: string;
    jobTitle: string;
    company: string | null;
    jobDescription: string;
    jobSnapshotId: number | null;
    interactionId: number | null;
};

type SnapshotRow = {
    job_snapshot_id: number;
    job_title: string | null;
    company: string | null;
    job_description_raw: string | null;
};

function loadEnvLocal(): void {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function configureCalibrationSafeEnrichmentCache(): void {
    if (!process.env.CAREERTWIN_JD_ENRICHMENT_CACHE_ENABLED) {
        process.env.CAREERTWIN_JD_ENRICHMENT_CACHE_ENABLED = "1";
    }
    const cacheFile = process.env.CAREERTWIN_JD_ENRICHMENT_CACHE_FILE
        || path.join(process.cwd(), "artifacts", "jd-enrichment-cache.json");
    process.env.CAREERTWIN_JD_ENRICHMENT_CACHE_FILE = cacheFile;
    if (!process.env.CAREERTWIN_DETERMINISTIC_JD_ENRICHMENT) {
        process.env.CAREERTWIN_DETERMINISTIC_JD_ENRICHMENT = fs.existsSync(cacheFile) ? "1" : "0";
    }
}

function parseArgs(): ReplayArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    const interactionId = Number.parseInt(readArg("--interactionId") ?? "", 10);
    const jobSnapshotId = Number.parseInt(readArg("--jobSnapshotId") ?? "", 10);
    return {
        profileId: readArg("--profileId"),
        careerId: readArg("--careerId"),
        interactionId: Number.isFinite(interactionId) ? interactionId : null,
        jobSnapshotId: Number.isFinite(jobSnapshotId) ? jobSnapshotId : null,
        jobTitle: readArg("--jobTitle"),
        company: readArg("--company"),
        jobDescriptionFile: readArg("--jobDescriptionFile"),
        outFile: readArg("--out"),
    };
}

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return createClient(url, key);
}

async function resolveProfileAndCareer(args: ReplayArgs): Promise<{ profileId: string; careerId: string }> {
    const supabase = getSupabaseClient();

    if (args.careerId) {
        const { data, error } = await supabase
            .from("careers")
            .select("id, user_id")
            .eq("id", args.careerId)
            .single();
        if (error || !data?.id || !data?.user_id) {
            throw new Error(`Failed to resolve career ${args.careerId}: ${error?.message ?? "not found"}`);
        }
        return { profileId: data.user_id as string, careerId: data.id as string };
    }

    if (args.profileId) {
        const { data, error } = await supabase
            .from("careers")
            .select("id, user_id")
            .eq("user_id", args.profileId)
            .order("created_at", { ascending: false })
            .limit(1);
        if (error || !data?.[0]?.id || !data?.[0]?.user_id) {
            throw new Error(`Failed to resolve latest career for profile ${args.profileId}: ${error?.message ?? "not found"}`);
        }
        return { profileId: data[0].user_id as string, careerId: data[0].id as string };
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);
    if (error || !data?.[0]?.id) {
        throw new Error(`Failed to auto-resolve profile: ${error?.message ?? "not found"}`);
    }
    return resolveProfileAndCareer({ ...args, profileId: data[0].id as string });
}

async function resolveSnapshotByInteraction(interactionId: number): Promise<{
    profileId: string;
    snapshot: SnapshotRow;
}> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("user_job_interactions")
        .select("interaction_id, profile_id, job_snapshot_id")
        .eq("interaction_id", interactionId)
        .single();
    if (error || !data?.job_snapshot_id || !data?.profile_id) {
        throw new Error(`Failed to resolve interaction ${interactionId}: ${error?.message ?? "not found"}`);
    }
    const { data: snapshot, error: snapshotError } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id, job_title, company, job_description_raw")
        .eq("job_snapshot_id", data.job_snapshot_id)
        .single();
    if (snapshotError || !snapshot?.job_snapshot_id) {
        throw new Error(`Failed to load job snapshot ${data.job_snapshot_id}: ${snapshotError?.message ?? "not found"}`);
    }
    return {
        profileId: data.profile_id as string,
        snapshot: snapshot as SnapshotRow,
    };
}

async function resolveSnapshot(args: ReplayArgs): Promise<SnapshotRow> {
    const supabase = getSupabaseClient();

    if (args.jobSnapshotId) {
        const { data, error } = await supabase
            .from("job_snapshots")
            .select("job_snapshot_id, job_title, company, job_description_raw")
            .eq("job_snapshot_id", args.jobSnapshotId)
            .single();
        if (error || !data?.job_snapshot_id) {
            throw new Error(`Failed to load job snapshot ${args.jobSnapshotId}: ${error?.message ?? "not found"}`);
        }
        return data as SnapshotRow;
    }

    if (args.jobTitle) {
        let query = supabase
            .from("job_snapshots")
            .select("job_snapshot_id, job_title, company, job_description_raw")
            .ilike("job_title", `%${args.jobTitle}%`)
            .order("extracted_at", { ascending: false })
            .limit(10);
        if (args.company) {
            query = query.ilike("company", `%${args.company}%`);
        }
        const { data, error } = await query;
        if (error || !data?.[0]?.job_snapshot_id) {
            throw new Error(`Failed to resolve snapshot by title/company: ${error?.message ?? "not found"}`);
        }
        return data[0] as SnapshotRow;
    }

    const { data, error } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id, job_title, company, job_description_raw")
        .or("job_title.ilike.%Analytics Manager%,company.ilike.%Publicis%")
        .order("extracted_at", { ascending: false })
        .limit(1);
    if (error || !data?.[0]?.job_snapshot_id) {
        throw new Error(`Failed to auto-resolve Publicis Analytics Manager snapshot: ${error?.message ?? "not found"}`);
    }
    return data[0] as SnapshotRow;
}

async function resolveCase(args: ReplayArgs): Promise<ResolvedCase> {
    if (args.jobDescriptionFile) {
        const { profileId, careerId } = await resolveProfileAndCareer(args);
        const absolute = path.isAbsolute(args.jobDescriptionFile)
            ? args.jobDescriptionFile
            : path.join(process.cwd(), args.jobDescriptionFile);
        const jobDescription = fs.readFileSync(absolute, "utf8");
        return {
            profileId,
            careerId,
            jobTitle: args.jobTitle ?? "Ad hoc replay job",
            company: args.company ?? null,
            jobDescription,
            jobSnapshotId: null,
            interactionId: args.interactionId,
        };
    }

    if (args.interactionId) {
        const interactionResolved = await resolveSnapshotByInteraction(args.interactionId);
        const resolvedCareer = await resolveProfileAndCareer({ ...args, profileId: interactionResolved.profileId });
        return {
            profileId: interactionResolved.profileId,
            careerId: resolvedCareer.careerId,
            jobTitle: interactionResolved.snapshot.job_title ?? args.jobTitle ?? "Untitled job",
            company: interactionResolved.snapshot.company ?? args.company ?? null,
            jobDescription: interactionResolved.snapshot.job_description_raw ?? "",
            jobSnapshotId: interactionResolved.snapshot.job_snapshot_id,
            interactionId: args.interactionId,
        };
    }

    const { profileId, careerId } = await resolveProfileAndCareer(args);
    const snapshot = await resolveSnapshot(args);
    return {
        profileId,
        careerId,
        jobTitle: snapshot.job_title ?? args.jobTitle ?? "Untitled job",
        company: snapshot.company ?? args.company ?? null,
        jobDescription: snapshot.job_description_raw ?? "",
        jobSnapshotId: snapshot.job_snapshot_id,
        interactionId: args.interactionId,
    };
}

function toHumanBucketFromV1(score: number): "high_fit" | "medium_fit" | "low_fit" {
    if (score >= 0.62) return "high_fit";
    if (score >= 0.38) return "medium_fit";
    return "low_fit";
}

function summarizeVariant(variantName: MatchVariantName, result: Awaited<ReturnType<typeof getCapabilityMatchV2>>): MatchReplayVariantSummary {
    return {
        variant_name: variantName,
        final_score: Number((result.overall_match_score * 100).toFixed(2)),
        fit_bucket: result.fit_bucket,
        top_positive_factors: result.audit.positive_contributors.slice(0, 3).map((item) => item.label),
        top_negative_factors: result.audit.negative_contributors.slice(0, 3).map((item) => item.label),
        summary_diagnosis: result.audit.final_bucket_reasoning,
    };
}

async function run(): Promise<void> {
    loadEnvLocal();
    configureCalibrationSafeEnrichmentCache();
    const args = parseArgs();
    const resolvedCase = await resolveCase(args);
    if (!resolvedCase.jobDescription || resolvedCase.jobDescription.trim().length < 40) {
        throw new Error("Resolved case has no usable job description.");
    }

    const baseline = await getCapabilityMatchV1({
        careerId: resolvedCase.careerId,
        jobDescription: resolvedCase.jobDescription,
        topSignalsLimit: 4,
    });
    const improved = await getCapabilityMatchV2({
        careerId: resolvedCase.careerId,
        profileId: resolvedCase.profileId,
        jobDescription: resolvedCase.jobDescription,
        jobTitleHint: resolvedCase.jobTitle,
        topSignalsLimit: 4,
    });

    const variants: Array<{ name: MatchVariantName; config: MatchVariantConfig }> = [
        { name: "without_title_mismatch_penalty", config: { title_prior_penalty_weight: 0, variant_name: "without_title_mismatch_penalty" } },
        { name: "reduced_title_prior_weight", config: { title_prior_penalty_weight: 0.35, variant_name: "reduced_title_prior_weight" } },
        { name: "without_ats_penalty_injection", config: { inject_ats_penalty: false, variant_name: "without_ats_penalty_injection" } },
        { name: "richer_requirement_clustering", config: { richer_requirement_clustering: true, variant_name: "richer_requirement_clustering" } },
        { name: "capability_transfer_matching_enabled", config: { capability_transfer_matching: true, variant_name: "capability_transfer_matching_enabled" } },
        { name: "literal_keyword_overlap_reduced", config: { literal_keyword_weight: 0.35, variant_name: "literal_keyword_overlap_reduced" } },
        { name: "evidence_scope_ownership_weight_increased", config: { ownership_scope_weight_multiplier: 1.35, variant_name: "evidence_scope_ownership_weight_increased" } },
    ];

    const variantResults = [];
    for (const variant of variants) {
        const result = await getCapabilityMatchV2({
            careerId: resolvedCase.careerId,
            profileId: resolvedCase.profileId,
            jobDescription: resolvedCase.jobDescription,
            jobTitleHint: resolvedCase.jobTitle,
            topSignalsLimit: 4,
            variant: variant.config,
        });
        variantResults.push(summarizeVariant(variant.name, result));
    }

    const output = {
        replay_case: {
            profile_id: resolvedCase.profileId,
            career_id: resolvedCase.careerId,
            job_snapshot_id: resolvedCase.jobSnapshotId,
            interaction_id: resolvedCase.interactionId,
            job_title: resolvedCase.jobTitle,
            company: resolvedCase.company,
        },
        before_after: {
            baseline_v1: {
                model: baseline.model,
                final_score: Number((baseline.overall_match_score * 100).toFixed(2)),
                fit_bucket: toHumanBucketFromV1(baseline.overall_match_score),
                top_strengths: baseline.matched_strengths.slice(0, 4).map((item) => item.display_name),
                top_gaps: baseline.gaps.slice(0, 4).map((item) => item.display_name),
            },
            improved_v2: {
                model: improved.model,
                final_score: Number((improved.overall_match_score * 100).toFixed(2)),
                fit_bucket: improved.fit_bucket,
                top_positive_factors: improved.audit.positive_contributors.slice(0, 4).map((item) => item.label),
                top_negative_factors: improved.audit.negative_contributors.slice(0, 4).map((item) => item.label),
            },
        },
        comparison_table: [
            summarizeVariant("default", improved),
            ...variantResults,
        ],
        audit: improved.audit,
    };

    const serialized = JSON.stringify(output, null, 2);
    if (args.outFile) {
        const absolute = path.isAbsolute(args.outFile) ? args.outFile : path.join(process.cwd(), args.outFile);
        fs.writeFileSync(absolute, serialized, "utf8");
    }
    console.log(serialized);
}

run().catch((error) => {
    console.error("[replay-match-audit] Failed", error);
    process.exit(1);
});
