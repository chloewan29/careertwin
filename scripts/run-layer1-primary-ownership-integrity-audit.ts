import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type SnapshotRow = {
    job_snapshot_id: number;
    source_platform: "linkedin" | "seek";
    job_url: string | null;
    job_title: string | null;
    company: string | null;
    location: string | null;
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

function arg(name: string): string | null {
    const args = process.argv.slice(2);
    const idx = args.indexOf(name);
    return idx === -1 ? null : args[idx + 1] ?? null;
}

function parseSnapshotIds(input: string): number[] {
    return Array.from(new Set(
        input
            .split(",")
            .map((item) => Number(item.trim()))
            .filter((item) => Number.isFinite(item)),
    )).map((item) => Math.trunc(item));
}

async function loadSnapshots(snapshotIds: number[]): Promise<Map<number, SnapshotRow>> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const supabase = createClient(url, key);
    const { data, error } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
        .in("job_snapshot_id", snapshotIds);
    if (error) throw new Error(`Failed to load snapshots: ${error.message}`);
    const map = new Map<number, SnapshotRow>();
    (data ?? []).forEach((row) => map.set(Number(row.job_snapshot_id), row as SnapshotRow));
    return map;
}

async function run(): Promise<void> {
    loadEnvLocal();
    const profileId = arg("--profileId") ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53";
    const outArg = arg("--out") ?? "artifacts/layer1-primary-ownership-integrity-after.json";
    const outPath = path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg);
    const snapshotIds = parseSnapshotIds(
        arg("--snapshots") ?? "4112,3150,4211,4221,310,5661,5666,5668,5670",
    );
    const scaIds = new Set([4112, 3150, 4211, 4221, 310]);

    const snapshots = await loadSnapshots(snapshotIds);
    const rows: Array<Record<string, unknown>> = [];
    const modeDist = new Map<string, number>();
    let legacySeedUsedCount = 0;
    let cueFallbackPrimaryCount = 0;
    let missingCandidateCount = 0;

    for (const snapshotId of snapshotIds) {
        const snapshot = snapshots.get(snapshotId);
        if (!snapshot) {
            rows.push({
                snapshot_id: snapshotId,
                status: "missing_snapshot",
            });
            continue;
        }
        const result = await analyzeJobForCopilot({
            profileId,
            source: snapshot.source_platform,
            jobUrl: snapshot.job_url ?? `https://layer1-ownership-audit.local/${snapshotId}`,
            jobTitle: snapshot.job_title ?? `Snapshot ${snapshotId}`,
            company: snapshot.company ?? null,
            location: snapshot.location ?? null,
            jobDescription: snapshot.job_description_raw ?? "",
            topEvidenceLimit: 4,
        });

        const diagnostics: any = result.response?.diagnostics ?? {};
        const roleStructure: any = diagnostics.jd_role_structure_contract ?? null;
        const rd: any = roleStructure?.primary_resolution_diagnostics ?? null;
        const candidatePresent = Boolean(rd?.candidate_present);
        const finalMode = String(rd?.final_primary_resolution_mode ?? "");
        const legacyPrimarySeedUsed = Boolean(rd?.legacy_primary_seed_used);
        const cueFallbackUsedForPrimary = Boolean(rd?.cue_fallback_used_for_primary);

        if (!candidatePresent) missingCandidateCount += 1;
        if (legacyPrimarySeedUsed) legacySeedUsedCount += 1;
        if (cueFallbackUsedForPrimary) cueFallbackPrimaryCount += 1;
        modeDist.set(finalMode || "unknown", (modeDist.get(finalMode || "unknown") ?? 0) + 1);

        rows.push({
            snapshot_id: snapshotId,
            source_platform: snapshot.source_platform,
            job_title: snapshot.job_title,
            sc_a_case: scaIds.has(snapshotId),
            contract_status: diagnostics.jd_role_structure_contract_status ?? null,
            candidate_present: candidatePresent,
            candidate_authoritative_source: rd?.candidate_authoritative_source ?? null,
            legacy_primary_seed_seen: Boolean(rd?.legacy_primary_seed_seen),
            legacy_primary_seed_used: legacyPrimarySeedUsed,
            cue_fallback_invoked: Boolean(rd?.cue_fallback_invoked),
            cue_fallback_used_for_primary: cueFallbackUsedForPrimary,
            selected_candidate_source: rd?.selected_candidate_source ?? null,
            primary_before_shape_gate: rd?.primary_family_before_shape_gate ?? null,
            primary_after_shape_gate: rd?.primary_family_after_shape_gate ?? null,
            primary_candidate_canonicalization_status: rd?.primary_candidate_canonicalization_status ?? null,
            explicit_rejection_reason: rd?.explicit_rejection_reason ?? null,
            proposed_native_family: rd?.proposed_native_family ?? null,
            used_provisional_native_primary: Boolean(rd?.used_provisional_native_primary),
            provisional_acceptance_reason: rd?.provisional_acceptance_reason ?? null,
            provisional_acceptance_block_reason: rd?.provisional_acceptance_block_reason ?? null,
            final_primary_resolution_mode: finalMode || null,
        });
    }

    const scaRows = rows.filter((row) => row.sc_a_case === true);
    const scaNullHole = scaRows.filter((row) => !row.primary_after_shape_gate).length;
    const scaProvisionalUsed = scaRows.filter((row) => row.used_provisional_native_primary === true).length;
    const scaModeDist = new Map<string, number>();
    scaRows.forEach((row) => {
        const mode = String(row.final_primary_resolution_mode ?? "unknown");
        scaModeDist.set(mode, (scaModeDist.get(mode) ?? 0) + 1);
    });

    const payload = {
        generated_at: new Date().toISOString(),
        profile_id: profileId,
        snapshot_ids: snapshotIds,
        summary: {
            total_cases: rows.length,
            dual_authority_ingestion_gone: legacySeedUsedCount === 0,
            candidate_not_required_path_gone: rows
                .filter((row) => row.candidate_present === false)
                .every((row) =>
                    row.final_primary_resolution_mode === "subject_contract_invalid"
                    && !row.primary_after_shape_gate),
            cue_fallback_can_author_primary: cueFallbackPrimaryCount > 0,
            missing_candidate_count: missingCandidateCount,
            legacy_primary_seed_used_count: legacySeedUsedCount,
            cue_fallback_used_for_primary_count: cueFallbackPrimaryCount,
            final_primary_resolution_mode_distribution: Array.from(modeDist.entries())
                .map(([mode, count]) => ({ mode, count }))
                .sort((a, b) => b.count - a.count),
        },
        sc_a_validation: {
            snapshot_ids: [4112, 3150, 4211, 4221, 310],
            total_cases: scaRows.length,
            null_hole_count: scaNullHole,
            provisional_native_primary_count: scaProvisionalUsed,
            hard_invalid_count: scaRows.filter((row) => row.final_primary_resolution_mode === "subject_contract_invalid").length,
            mode_distribution: Array.from(scaModeDist.entries())
                .map(([mode, count]) => ({ mode, count }))
                .sort((a, b) => b.count - a.count),
        },
        cases: rows,
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        out: outPath,
        case_count: rows.length,
        sc_a_count: scaRows.length,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-layer1-primary-ownership-integrity-audit] failed", error);
    process.exit(1);
});
