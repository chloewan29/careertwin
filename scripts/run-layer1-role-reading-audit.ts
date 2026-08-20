import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";

type AuditCase = {
    case_id: string;
    snapshot_id: number;
    expected_center: string;
    expected_tokens: string[];
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
    runLabel: string;
};

const CASES: AuditCase[] = [
    {
        case_id: "case_01_crowdstrike_sales_intelligence",
        snapshot_id: 5661,
        expected_center: "sales intelligence / sales operations planning / forecasting diagnostics",
        expected_tokens: ["sales intelligence", "sales operations", "forecast", "gtm", "revenue operations"],
    },
    {
        case_id: "case_02_x15_digital_journey_optimisation",
        snapshot_id: 5666,
        expected_center: "digital journey optimisation / experimentation / conversion improvement",
        expected_tokens: ["digital journey", "optimisation", "optimization", "experimentation", "conversion", "acquisition", "retention"],
    },
    {
        case_id: "case_03_consumer_business_insights_leadership",
        snapshot_id: 5668,
        expected_center: "consumer/business insights leadership / advanced analytics and measurement",
        expected_tokens: ["consumer insights", "business insights", "measurement", "analytics", "agency", "insights"],
    },
    {
        case_id: "case_04_traild_fpa_manager",
        snapshot_id: 5670,
        expected_center: "fp&a / planning / forecasting / financial modeling",
        expected_tokens: ["fp&a", "financial planning", "forecast", "financial model", "saas", "pricing"],
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
        outPath: readArg("--out") ?? "artifacts/layer1-role-reading-audit.before.json",
        runLabel: readArg("--label") ?? "before",
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

function textIncludesExpected(text: string, expectedTokens: string[]): boolean {
    const corpus = normalizeText(text);
    if (!corpus) return false;
    return expectedTokens.some((token) => corpus.includes(normalizeText(token)));
}

function isOperatingModeGovernanceProcessFamily(text: string): boolean {
    const corpus = normalizeText(text);
    if (!corpus) return false;
    const governanceLike = /\b(governance|risk|compliance|assurance|standards|methodology|framework)\b/.test(corpus);
    const processLike = /\b(process|requirements|business analysis|cadence|operating model|ways of working)\b/.test(corpus);
    const transformationLike = /\b(transformation|enablement|rollout|implementation|delivery)\b/.test(corpus);
    return governanceLike || processLike || transformationLike;
}

async function loadSnapshots(snapshotIds: number[]): Promise<Map<number, SnapshotRow>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
        .in("job_snapshot_id", snapshotIds);
    if (error) throw new Error(`Failed to load job snapshots: ${error.message}`);
    const map = new Map<number, SnapshotRow>();
    (data ?? []).forEach((row) => map.set(Number(row.job_snapshot_id), row as SnapshotRow));
    return map;
}

function pickLayer1ActualCenter(data: {
    skeletonPrimary: string;
    skeletonPrimarySubject: string;
    rolePrimaryFamily: string;
    topNativeCluster: string;
    topNativeReason: string;
}): string {
    if (data.rolePrimaryFamily) return data.rolePrimaryFamily;
    if (data.topNativeCluster) return data.topNativeCluster;
    if (data.skeletonPrimarySubject) return data.skeletonPrimarySubject;
    return data.skeletonPrimary;
}

function determineDriftPath(params: {
    expectedTokens: string[];
    skeletonPrimary: string;
    skeletonPrimarySubject: string;
    skeletonCoreOwnership: string;
    rolePrimaryFamily: string;
    topNativeCluster: string;
    topNativeReason: string;
}): {
    drift_path: string;
    drift_reason: string;
    correction_candidate: string;
} {
    const skeletonText = [
        params.skeletonPrimary,
        params.skeletonPrimarySubject,
        params.skeletonCoreOwnership,
    ].join(" ");
    const roleText = [
        params.rolePrimaryFamily,
        params.topNativeCluster,
        params.topNativeReason,
    ].join(" ");
    const expectedInSkeleton = textIncludesExpected(skeletonText, params.expectedTokens);
    const expectedInRole = textIncludesExpected(roleText, params.expectedTokens);
    const skeletonBroad = isOperatingModeGovernanceProcessFamily(skeletonText);
    const roleBroad = isOperatingModeGovernanceProcessFamily(roleText);

    if (skeletonBroad && !expectedInSkeleton) {
        return {
            drift_path: "ownership_skeleton_output",
            drift_reason: "Primary ownership skeleton is broad posture-like before role-native subject is preserved.",
            correction_candidate: "Constrain skeleton primary eligibility: operating-mode/governance/process/transformation cannot be primary when stronger role-native subject cues exist.",
        };
    }
    if (!expectedInRole && roleBroad) {
        return {
            drift_path: "role_structure_mapping",
            drift_reason: "Role-structure primary family/candidates remain broad and do not retain expected role-native subject.",
            correction_candidate: "Tighten role-structure primary family selection to prefer role-native function over operating mode/delivery posture.",
        };
    }
    if (expectedInRole && isOperatingModeGovernanceProcessFamily(params.rolePrimaryFamily)) {
        return {
            drift_path: "family_normalization",
            drift_reason: "Expected role-native cues are present but normalized into a broader family at Layer 1.",
            correction_candidate: "Prevent early broad family normalization when role-native candidates are present with comparable confidence.",
        };
    }
    return {
        drift_path: "role_reading_fallback",
        drift_reason: "Layer 1 fallback path favored a broad/intermediate family over a narrow subject cue set.",
        correction_candidate: "Add deterministic Layer 1 fallback guard to keep broad posture families as supporting context only.",
    };
}

async function run(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const snapshots = await loadSnapshots(CASES.map((entry) => entry.snapshot_id));

    const rows: Array<Record<string, unknown>> = [];
    for (const auditCase of CASES) {
        const snapshot = snapshots.get(auditCase.snapshot_id);
        if (!snapshot) throw new Error(`Missing snapshot ${auditCase.snapshot_id}`);

        const output = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: snapshot.source_platform,
            jobUrl: snapshot.job_url ?? `https://layer1-audit.local/snapshot/${snapshot.job_snapshot_id}`,
            jobTitle: snapshot.job_title ?? `Snapshot ${snapshot.job_snapshot_id}`,
            company: snapshot.company ?? null,
            location: snapshot.location ?? null,
            jobDescription: snapshot.job_description_raw ?? "",
            topEvidenceLimit: 4,
        });

        const diagnostics = output.response.diagnostics;
        const skeleton = diagnostics?.jd_ownership_skeleton_contract;
        const roleStructure = diagnostics?.jd_role_structure_contract;
        const skeletonStatus = diagnostics?.jd_ownership_skeleton_contract_status ?? null;
        const skeletonFailureReason = diagnostics?.jd_ownership_skeleton_contract_failure_reason ?? null;
        const roleStructureStatus = diagnostics?.jd_role_structure_contract_status ?? null;
        const roleStructureFailureReason = diagnostics?.jd_role_structure_contract_failure_reason ?? null;
        const jdSignals = buildJobSignalsFromRawJd({
            rawJd: snapshot.job_description_raw ?? "",
            fallbackTitle: snapshot.job_title ?? `Snapshot ${snapshot.job_snapshot_id}`,
        });
        const topNative = roleStructure?.native_subject_candidates?.[0];
        const topBridge = roleStructure?.bridge_like_candidates?.[0];
        const layer1ActualCenter = pickLayer1ActualCenter({
            skeletonPrimary: skeleton?.primary_job_skeleton ?? "",
            skeletonPrimarySubject: skeleton?.primary_subject_kind ?? "",
            rolePrimaryFamily: roleStructure?.primary_role_family ?? "",
            topNativeCluster: topNative?.cluster_id ?? "",
            topNativeReason: topNative?.reason ?? "",
        });
        const drift = determineDriftPath({
            expectedTokens: auditCase.expected_tokens,
            skeletonPrimary: skeleton?.primary_job_skeleton ?? "",
            skeletonPrimarySubject: skeleton?.primary_subject_kind ?? "",
            skeletonCoreOwnership: skeleton?.core_ownership ?? "",
            rolePrimaryFamily: roleStructure?.primary_role_family ?? "",
            topNativeCluster: topNative?.cluster_id ?? "",
            topNativeReason: topNative?.reason ?? "",
        });

        rows.push({
            case_id: auditCase.case_id,
            snapshot_id: auditCase.snapshot_id,
            expected_center: auditCase.expected_center,
            layer1_actual_center: layer1ActualCenter,
            drift_path: drift.drift_path,
            drift_reason: drift.drift_reason,
            correction_candidate: drift.correction_candidate,
            layer1_trace: {
                contract_status: {
                    ownership_skeleton_status: skeletonStatus,
                    ownership_skeleton_failure_reason: skeletonFailureReason,
                    role_structure_status: roleStructureStatus,
                    role_structure_failure_reason: roleStructureFailureReason,
                },
                jd_role_signals: {
                    target_title: jdSignals.target_title ?? null,
                    role_family: jdSignals.role_family ?? null,
                    required_skills: jdSignals.required_skills.slice(0, 10),
                    responsibilities: jdSignals.responsibilities.slice(0, 10),
                },
                ownership_skeleton: skeleton
                    ? {
                        primary_job_skeleton: skeleton.primary_job_skeleton,
                        supporting_job_skeletons: skeleton.supporting_job_skeletons,
                        core_ownership: skeleton.core_ownership,
                        primary_subject_kind: skeleton.primary_subject_kind,
                        secondary_subject_kinds: skeleton.secondary_subject_kinds,
                        reason_codes: skeleton.reason_codes,
                        confidence: skeleton.confidence,
                    }
                    : null,
                role_structure: roleStructure
                    ? {
                        role_shape: roleStructure.role_shape,
                        primary_resolution_diagnostics: roleStructure.primary_resolution_diagnostics ?? null,
                        primary_role_family: roleStructure.primary_role_family,
                        secondary_role_families: roleStructure.secondary_role_families,
                        native_subject_candidates: roleStructure.native_subject_candidates.slice(0, 5),
                        bridge_like_candidates: roleStructure.bridge_like_candidates.slice(0, 5),
                        priority_structures: roleStructure.priority_structures.slice(0, 8),
                        reason_codes: roleStructure.reason_codes,
                        confidence: roleStructure.confidence,
                    }
                    : null,
                top_layer1_candidates: {
                    top_native_candidate: topNative ?? null,
                    top_bridge_candidate: topBridge ?? null,
                },
            },
        });
    }

    const payload = {
        generated_at: new Date().toISOString(),
        label: args.runLabel,
        profile_id: args.profileId,
        snapshot_ids: CASES.map((entry) => entry.snapshot_id),
        cases: rows,
    };
    const absoluteOut = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
    fs.writeFileSync(absoluteOut, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        out: absoluteOut,
        label: args.runLabel,
        case_count: rows.length,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-layer1-role-reading-audit] failed", error);
    process.exit(1);
});
