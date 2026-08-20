import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type AuditCase = {
    case_id: string;
    snapshot_id: number;
    expected_center: string;
    founder_reported_before_center: string;
};

type SnapshotRow = {
    job_snapshot_id: number;
    source_platform: "linkedin" | "seek";
    job_url: string | null;
    job_title: string | null;
    company: string | null;
    location: string | null;
    job_description_raw: string | null;
};

type Args = {
    profileId: string;
    outPath: string;
};

const CASES: AuditCase[] = [
    {
        case_id: "case_01_crowdstrike_sales_intelligence",
        snapshot_id: 5661,
        expected_center: "sales intelligence / sales operations planning / forecasting diagnostics",
        founder_reported_before_center: "governance, standards, methodology, and assurance",
    },
    {
        case_id: "case_02_x15_digital_journey_optimisation",
        snapshot_id: 5666,
        expected_center: "digital journey optimisation / acquisition-retention optimisation / experimentation",
        founder_reported_before_center: "transformation and enablement delivery",
    },
    {
        case_id: "case_03_consumer_business_insights_leadership",
        snapshot_id: 5668,
        expected_center: "consumer and business insights leadership / advanced analytics and measurement",
        founder_reported_before_center: "governance, standards, methodology, and assurance",
    },
    {
        case_id: "case_04_traild_fpa_manager",
        snapshot_id: 5670,
        expected_center: "fp&a / planning and forecasting / financial modelling / saas performance steering",
        founder_reported_before_center: "governance, standards, methodology, and assurance",
    },
];

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

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        profileId: readArg("--profileId") ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
        outPath: readArg("--out") ?? "artifacts/qc-role-subject-collapse-audit.after.json",
    };
}

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return createClient(url, key);
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_/]+/g, " ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isBroadGovernanceOrTransformation(text: string): boolean {
    const corpus = normalizeText(text);
    if (!corpus) return false;
    const governanceLike = /\b(governance|risk|compliance|assurance|standards|methodology|framework)\b/.test(corpus);
    const transformationLike = /\b(transformation|enablement|operating model|program management|delivery)\b/.test(corpus);
    return governanceLike || transformationLike;
}

function summarizeMismatch(params: {
    afterLabel: string;
    afterKey: string;
    ownerTopClusterId: string;
    ownerTopDisplay: string;
    ownerTopType: string;
    ownerDecisionReason: string;
    ownerBridgeAllowed: boolean | null;
    ownerBestNativeClusterId: string;
    roleStructurePrimaryFamily: string;
}): {
    mismatch_layer: "Layer 1 role reading" | "Layer 2 owner arbitration" | "Layer 3 proof selection" | "Layer 4 output shaping";
    broad_family_winner_reasoning: string;
    narrowest_correction_candidate: string;
} {
    const afterIsBroad = isBroadGovernanceOrTransformation(params.afterLabel);
    const ownerTopIsBroad = isBroadGovernanceOrTransformation([params.ownerTopClusterId, params.ownerTopDisplay].join(" "));
    const ownerBestNativeIsBroad = isBroadGovernanceOrTransformation(params.ownerBestNativeClusterId);
    const layer4LabelOverride = afterIsBroad
        && !ownerTopIsBroad
        && Boolean(params.ownerTopClusterId)
        && normalizeText(params.afterKey) === normalizeText(params.ownerTopClusterId);
    if (layer4LabelOverride) {
        return {
            mismatch_layer: "Layer 4 output shaping",
            broad_family_winner_reasoning: "Late label calibration broadened the headline even though owner arbitration stayed role-native.",
            narrowest_correction_candidate: "Keep role-native owner label authoritative; block broad governance/transformation relabel when native owner is selected.",
        };
    }

    const layer2OwnerPromotion = ownerTopIsBroad
        && Boolean(params.ownerBestNativeClusterId)
        && !ownerBestNativeIsBroad
        && (params.ownerBridgeAllowed === true || params.ownerTopType === "bridge_supporting_owner");
    if (layer2OwnerPromotion) {
        return {
            mismatch_layer: "Layer 2 owner arbitration",
            broad_family_winner_reasoning: `Broad owner cluster won arbitration (${params.ownerDecisionReason || "owner_arbitration"}) over an available narrower native candidate.`,
            narrowest_correction_candidate: "Tighten bridge/operating-mode winner margin when a stronger role-native alternative exists.",
        };
    }

    const layer1BroadRead = isBroadGovernanceOrTransformation(params.roleStructurePrimaryFamily);
    if (layer1BroadRead) {
        return {
            mismatch_layer: "Layer 1 role reading",
            broad_family_winner_reasoning: "JD role-structure primary family already came through as broad governance/transformation.",
            narrowest_correction_candidate: "Narrow role-reading promotion so operating mode/delivery posture cannot outrank core role subject.",
        };
    }

    return {
        mismatch_layer: "Layer 3 proof selection",
        broad_family_winner_reasoning: "Owner selection was not clearly broad, but downstream proof emphasis still surfaced a broad headline.",
        narrowest_correction_candidate: "Constrain proof-headline mapping to remain inside the selected role-native requirement pool.",
    };
}

async function loadSnapshots(snapshotIds: number[]): Promise<Map<number, SnapshotRow>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
        .in("job_snapshot_id", snapshotIds);
    if (error) {
        throw new Error(`Failed to load job snapshots: ${error.message}`);
    }
    const map = new Map<number, SnapshotRow>();
    (data ?? []).forEach((row) => {
        map.set(Number(row.job_snapshot_id), row as SnapshotRow);
    });
    return map;
}

async function run(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const snapshotsById = await loadSnapshots(CASES.map((entry) => entry.snapshot_id));

    const rows: Array<Record<string, unknown>> = [];
    for (const entry of CASES) {
        const snapshot = snapshotsById.get(entry.snapshot_id);
        if (!snapshot) {
            throw new Error(`Snapshot ${entry.snapshot_id} not found for ${entry.case_id}`);
        }
        const analysis = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: snapshot.source_platform,
            jobUrl: snapshot.job_url ?? `https://qc-audit.local/snapshot/${entry.snapshot_id}`,
            jobTitle: snapshot.job_title ?? `Snapshot ${entry.snapshot_id}`,
            company: snapshot.company ?? null,
            location: snapshot.location ?? null,
            jobDescription: snapshot.job_description_raw ?? "",
            topEvidenceLimit: 4,
        });

        const selectionDebug = analysis.response.diagnostics?.selection_debug;
        const authoritative = selectionDebug?.authoritative_selection;
        const ownerDebug = selectionDebug?.owner_arbitration_debug;
        const ownerTop = ownerDebug?.top_candidates?.[0];
        const bestNative = ownerDebug?.best_native_candidate;
        const mismatch = summarizeMismatch({
            afterLabel: authoritative?.primary_axis?.label ?? "",
            afterKey: authoritative?.primary_axis?.key ?? "",
            ownerTopClusterId: ownerTop?.cluster_id ?? "",
            ownerTopDisplay: ownerTop?.display_name ?? "",
            ownerTopType: ownerTop?.owner_type ?? "",
            ownerDecisionReason: ownerDebug?.margin_decision?.decision_reason ?? "",
            ownerBridgeAllowed: typeof ownerDebug?.margin_decision?.bridge_allowed === "boolean"
                ? ownerDebug.margin_decision.bridge_allowed
                : null,
            ownerBestNativeClusterId: bestNative?.cluster_id ?? "",
            roleStructurePrimaryFamily: analysis.response.diagnostics?.jd_role_structure_contract?.primary_role_family ?? "",
        });

        rows.push({
            case_id: entry.case_id,
            snapshot_id: entry.snapshot_id,
            job_title: snapshot.job_title,
            expected_center: entry.expected_center,
            selected_center_before: entry.founder_reported_before_center,
            selected_center_after: authoritative?.primary_axis?.label
                ?? authoritative?.primary_frame?.label
                ?? analysis.response.verdictText,
            current_selected_primary_family: authoritative?.primary_axis?.key ?? null,
            mismatch_layer: mismatch.mismatch_layer,
            broad_family_winner_reasoning: mismatch.broad_family_winner_reasoning,
            narrowest_correction_candidate: mismatch.narrowest_correction_candidate,
            owner_arbitration_debug: {
                margin_decision: ownerDebug?.margin_decision ?? null,
                best_native_candidate: ownerDebug?.best_native_candidate ?? null,
                best_bridge_candidate: ownerDebug?.best_bridge_candidate ?? null,
                top_candidates: (ownerDebug?.top_candidates ?? []).slice(0, 5),
            },
            selection_debug_summary: {
                primary_frame: authoritative?.primary_frame ?? null,
                primary_axis: authoritative?.primary_axis ?? null,
                supporting_axis: authoritative?.supporting_axis ?? null,
            },
        });
    }

    const payload = {
        generated_at: new Date().toISOString(),
        profile_id: args.profileId,
        audited_snapshot_ids: CASES.map((item) => item.snapshot_id),
        cases: rows,
    };
    const absoluteOut = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
    fs.writeFileSync(absoluteOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    console.log(JSON.stringify({
        out: absoluteOut,
        case_count: rows.length,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-qc-role-subject-collapse-audit] failed", error);
    process.exit(1);
});

