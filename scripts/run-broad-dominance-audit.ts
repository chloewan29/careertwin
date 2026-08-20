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

type RoleArchetype = "narrow_specialist" | "hybrid_role_native" | "broad_leadership";

type WinnerBucketType =
    | "role_native_functional"
    | "operating_mode"
    | "governance_process"
    | "delivery_posture"
    | "business_abstraction"
    | "proof_posture"
    | "broad_leadership_native";

type MechanismType =
    | "Layer 1 broad skeleton promotion"
    | "Layer 1 normalization broadening"
    | "role-native under-read"
    | "primary eligibility too permissive"
    | "proof-driven safe bias"
    | "fallback abstraction promotion"
    | "not_suspicious";

type Args = {
    profileId: string;
    outPath: string;
    sampleSize: number;
    perArchetype: number;
};

const EXCLUDED_SNAPSHOT_IDS = new Set([5661, 5666, 5668, 5670]);

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
        outPath: readArg("--out") ?? "artifacts/broad-dominance-audit.json",
        sampleSize: Number(readArg("--sampleSize") ?? 500),
        perArchetype: Number(readArg("--perArchetype") ?? 4),
    };
}

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return createClient(url, key);
}

function normalizeText(value: unknown): string {
    if (typeof value !== "string") return "";
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s/&-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function hasAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

function classifyRoleArchetype(snapshot: SnapshotRow): RoleArchetype {
    const title = normalizeText(snapshot.job_title);
    const jd = normalizeText(snapshot.job_description_raw);
    const leadershipTitle = hasAny(title, [/\b(head|director|chief|vp|vice president|general manager|gm)\b/]);
    const specialistTitle = hasAny(title, [/\b(analyst|scientist|engineer|specialist|developer|researcher|accountant)\b/]);
    const hybridTitle = hasAny(title, [/\b(manager|lead|principal|consultant|advisor)\b/]);
    const specificDomainCue = hasAny(`${title} ${jd}`, [
        /\b(fp&a|financial planning|sales intelligence|sales operations|consumer insights|customer insights|journey|conversion|retention|experimentation|seo|crm|pricing)\b/,
    ]);

    if (leadershipTitle && !specificDomainCue) return "broad_leadership";
    if (specialistTitle && !leadershipTitle) return "narrow_specialist";
    if (hybridTitle || specificDomainCue) return "hybrid_role_native";
    return "narrow_specialist";
}

function deriveExpectedRoleNativeCenter(snapshot: SnapshotRow, archetype: RoleArchetype): string {
    const title = normalizeText(snapshot.job_title);
    const corpus = `${title} ${normalizeText(snapshot.job_description_raw)}`;
    if (archetype === "broad_leadership") return "broad leadership / cross-functional functional ownership";
    if (/\b(data product engineer|data engineer|bi engineer|analytics engineer)\b/.test(title)) {
        return "data platform / BI product engineering";
    }
    if (/\b(business analyst)\b/.test(title)) {
        return "business analysis / requirements / process design";
    }
    if (/\b(marketing data analyst|marketing analyst)\b/.test(title)) {
        return "marketing analytics / measurement";
    }
    if (/\b(performance strategist)\b/.test(title)) {
        return "performance strategy / conversion optimization";
    }
    if (/\b(energy systems manager)\b/.test(title)) {
        return "energy systems performance and planning";
    }
    if (/\b(manager performance and planning)\b/.test(title)) {
        return "performance and planning management";
    }
    if (/\b(ssis lead)\b/.test(title)) {
        return "data integration engineering / ETL delivery";
    }
    if (/\b(quantitative research)\b/.test(title)) {
        return "quantitative research / strategic insights";
    }
    if (/\b(quality assurance)\b/.test(title)) {
        return "quality assurance / performance standards leadership";
    }
    if (/\b(research director)\b/.test(title)) {
        return "research and insights leadership";
    }
    if (/\b(modelling .* insights .* director|modelling and insights director)\b/.test(title)) {
        return "modelling and insights leadership";
    }
    if (/\b(head of analytical leads)\b/.test(title)) {
        return "analytics leadership / analytical practice ownership";
    }
    if (/\b(fp&a|financial planning|financial model|forecast|budget)\b/.test(corpus)) {
        return "fp&a / planning / forecasting / financial modeling";
    }
    if (/\b(sales intelligence|sales operations|revenue operations|territory planning)\b/.test(corpus)) {
        return "sales intelligence / sales operations planning / forecasting diagnostics";
    }
    if (/\b(digital journey|customer journey|acquisition|retention|conversion|experimentation)\b/.test(corpus)) {
        return "digital journey optimisation / experimentation / conversion improvement";
    }
    if (/\b(consumer insights|customer insights|shopper insights|measurement)\b/.test(corpus)) {
        return "consumer/customer insights leadership / advanced analytics and measurement";
    }
    if (/\b(product analytics|a\/b|ab testing|funnel)\b/.test(corpus)) {
        return "product analytics / experimentation";
    }
    if (/\b(data scientist|analyst|analytics)\b/.test(corpus)) {
        return "specialist analytics and insight delivery";
    }
    return normalizeText(snapshot.job_title) || "role-native specialist function";
}

function expectedTokens(center: string): string[] {
    return center
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 4)
        .slice(0, 10);
}

function classifyWinnerBucket(primaryFamily: string): WinnerBucketType {
    const family = normalizeText(primaryFamily).replace(/[\s-]+/g, "_");
    if (!family) return "business_abstraction";
    if (family.includes("broad_functional_leadership")) return "broad_leadership_native";
    if (
        family.includes("governance")
        || family.includes("risk")
        || family.includes("compliance")
        || family.includes("assurance")
        || family.includes("policy")
        || family.includes("program_management_governance")
        || family.includes("business_analysis_requirements_process")
        || family.includes("governance_standards_methodology")
    ) {
        return "governance_process";
    }
    if (
        family.includes("transformation")
        || family.includes("enablement")
        || family.includes("implementation")
        || family.includes("rollout")
        || family.includes("delivery")
        || family.includes("data_platform_transformation")
    ) {
        return "delivery_posture";
    }
    if (
        family.includes("operating_model")
        || family.includes("standards_methodology")
        || family.includes("ways_of_working")
        || family.includes("operating_mode")
    ) {
        return "operating_mode";
    }
    if (
        family.includes("analytics_translation_storytelling")
        || family.includes("stakeholder_decision_support")
        || family.includes("stakeholder_embedding")
        || family.includes("insight_generation_reporting")
        || family.includes("insight_reporting_analytics")
    ) {
        return "proof_posture";
    }
    if (
        family.includes("commercial_strategy_planning")
        || family.includes("strategy_consulting_advisory")
        || family.includes("business_intelligence_reporting")
        || family.includes("commercial_analytics")
    ) {
        return "business_abstraction";
    }
    if (
        family.includes("customer_cx_insights")
        || family.includes("consumer_insights_analytics")
        || family.includes("customer_insights_analytics")
        || family.includes("product_analytics_experimentation")
        || family.includes("financial_planning_analysis")
        || family.includes("sales_intelligence_operations")
        || family.includes("marketing_science_measurement")
        || family.includes("sales_execution")
        || family.includes("engineering_delivery")
        || family.includes("channel_execution")
        || family.includes("clinical_research_ops")
        || family.includes("administrative_research_ops")
    ) {
        return "role_native_functional";
    }
    return "business_abstraction";
}

function isBroadOrSuspicious(bucket: WinnerBucketType): boolean {
    return bucket !== "role_native_functional" && bucket !== "broad_leadership_native";
}

function includesExpectedRoleNativeCue(corpus: string, expected: string[]): boolean {
    if (!corpus || expected.length === 0) return false;
    const normalized = normalizeText(corpus);
    return expected.some((token) => normalized.includes(token));
}

function classifyMechanism(params: {
    winnerBucket: WinnerBucketType;
    roleNativePresentUpstream: boolean;
    ownershipSkeletonPrimary: string;
    selectedPrimaryFamily: string;
    expectedRoleTokens: string[];
    skeletonSubjectCorpus: string;
    roleStructureCorpus: string;
}): MechanismType {
    if (!isBroadOrSuspicious(params.winnerBucket)) return "not_suspicious";

    const skeletonPrimary = normalizeText(params.ownershipSkeletonPrimary).replace(/[\s-]+/g, "_");
    const skeletonBroad = (
        skeletonPrimary.includes("governance")
        || skeletonPrimary.includes("transformation")
        || skeletonPrimary.includes("broad_functional_leadership")
        || skeletonPrimary.includes("insight_reporting_analytics")
        || skeletonPrimary.includes("strategy_commercial_planning")
    );
    const expectedInSkeleton = includesExpectedRoleNativeCue(params.skeletonSubjectCorpus, params.expectedRoleTokens);
    const expectedInRoleStructure = includesExpectedRoleNativeCue(params.roleStructureCorpus, params.expectedRoleTokens);

    if (params.winnerBucket === "proof_posture" && params.roleNativePresentUpstream) {
        return "proof-driven safe bias";
    }
    if (params.winnerBucket === "business_abstraction" && !params.roleNativePresentUpstream) {
        return "fallback abstraction promotion";
    }
    if (skeletonBroad && params.roleNativePresentUpstream) {
        return "Layer 1 normalization broadening";
    }
    if (skeletonBroad && !params.roleNativePresentUpstream && !expectedInSkeleton) {
        return "Layer 1 broad skeleton promotion";
    }
    if (!params.roleNativePresentUpstream && !expectedInRoleStructure) {
        return "role-native under-read";
    }
    if (params.roleNativePresentUpstream && isBroadOrSuspicious(params.winnerBucket)) {
        return "primary eligibility too permissive";
    }
    return "fallback abstraction promotion";
}

function pickCasesByArchetype(snapshots: SnapshotRow[], archetype: RoleArchetype, limit: number): SnapshotRow[] {
    const picked: SnapshotRow[] = [];
    const seenTitles = new Set<string>();
    for (const row of snapshots) {
        if (picked.length >= limit) break;
        if (EXCLUDED_SNAPSHOT_IDS.has(row.job_snapshot_id)) continue;
        if (!row.job_description_raw || row.job_description_raw.trim().length < 400) continue;
        if (classifyRoleArchetype(row) !== archetype) continue;
        const normalizedTitle = normalizeText(row.job_title);
        if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue;
        seenTitles.add(normalizedTitle);
        picked.push(row);
    }
    return picked;
}

async function loadSnapshotPool(sampleSize: number): Promise<SnapshotRow[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("job_snapshots")
        .select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw")
        .order("job_snapshot_id", { ascending: false })
        .limit(sampleSize);
    if (error) throw new Error(`Failed to load snapshot pool: ${error.message}`);
    return (data ?? []) as SnapshotRow[];
}

function toAbsolutePath(target: string): string {
    return path.isAbsolute(target) ? target : path.join(process.cwd(), target);
}

async function run(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const pool = await loadSnapshotPool(args.sampleSize);

    const selected = [
        ...pickCasesByArchetype(pool, "narrow_specialist", args.perArchetype),
        ...pickCasesByArchetype(pool, "hybrid_role_native", args.perArchetype),
        ...pickCasesByArchetype(pool, "broad_leadership", args.perArchetype),
    ];

    const rows: Array<Record<string, unknown>> = [];
    for (const snapshot of selected) {
        const archetype = classifyRoleArchetype(snapshot);
        const expectedCenter = deriveExpectedRoleNativeCenter(snapshot, archetype);
        const expectedRoleTokens = expectedTokens(expectedCenter);

        const output = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: snapshot.source_platform,
            jobUrl: snapshot.job_url ?? `https://broad-dominance-audit.local/snapshot/${snapshot.job_snapshot_id}`,
            jobTitle: snapshot.job_title ?? `Snapshot ${snapshot.job_snapshot_id}`,
            company: snapshot.company ?? null,
            location: snapshot.location ?? null,
            jobDescription: snapshot.job_description_raw ?? "",
            topEvidenceLimit: 4,
        });

        const diagnostics = output.response.diagnostics;
        const skeleton = diagnostics?.jd_ownership_skeleton_contract;
        const roleStructure = diagnostics?.jd_role_structure_contract;
        const roleShape = roleStructure?.role_shape ?? null;
        const primaryResolutionDiagnostics = roleStructure?.primary_resolution_diagnostics ?? null;
        const selectedPrimaryFamily = roleStructure?.primary_role_family
            ?? skeleton?.primary_job_skeleton
            ?? "";
        const winnerBucket = classifyWinnerBucket(selectedPrimaryFamily);
        const nativeCandidates = roleStructure?.native_subject_candidates ?? [];
        const roleNativePresentUpstream = nativeCandidates.some((candidate) => {
            const bucket = classifyWinnerBucket(candidate.cluster_id);
            if (bucket === "role_native_functional" || bucket === "broad_leadership_native") return true;
            return includesExpectedRoleNativeCue(`${candidate.cluster_id} ${candidate.reason}`, expectedRoleTokens);
        });
        const roleStructureCorpus = [
            roleStructure?.primary_role_family ?? "",
            roleStructure?.main_role ?? "",
            roleStructure?.main_role_summary ?? "",
            ...nativeCandidates.map((candidate) => `${candidate.cluster_id} ${candidate.reason}`),
        ].join(" ");
        const skeletonSubjectCorpus = [
            skeleton?.primary_subject_kind ?? "",
            skeleton?.core_ownership ?? "",
            ...(skeleton?.secondary_subject_kinds ?? []),
        ].join(" ");
        const mechanism = classifyMechanism({
            winnerBucket,
            roleNativePresentUpstream,
            ownershipSkeletonPrimary: skeleton?.primary_job_skeleton ?? "",
            selectedPrimaryFamily,
            expectedRoleTokens,
            skeletonSubjectCorpus,
            roleStructureCorpus,
        });

        const expectedCenterNormalized = normalizeText(expectedCenter);
        const governanceNativeFit = winnerBucket === "governance_process"
            && /\b(governance|risk|compliance|quality assurance|business analysis|requirements|process)\b/.test(expectedCenterNormalized);
        const trueFitOrFallback = (
            winnerBucket === "role_native_functional"
            || (winnerBucket === "broad_leadership_native" && archetype === "broad_leadership")
            || governanceNativeFit
        )
            ? "true_role_native_fit"
            : "broad_fallback_abstraction";

        const whyWinnerWon = (() => {
            if (!isBroadOrSuspicious(winnerBucket)) {
                return "Primary family aligns with role-native or broad-leadership-native center.";
            }
            if (roleNativePresentUpstream) {
                return "Role-native upstream candidate existed, but broad-safe family still remained primary.";
            }
            return "No strong role-native upstream candidate survived; broad-safe family won fallback path.";
        })();

        rows.push({
            snapshot_id: snapshot.job_snapshot_id,
            source_platform: snapshot.source_platform,
            job_title: snapshot.job_title,
            company: snapshot.company,
            archetype,
            expected_role_native_center: expectedCenter,
            selected_primary_family: selectedPrimaryFamily || null,
            winner_bucket_type: winnerBucket,
            role_native_present_upstream: roleNativePresentUpstream ? "yes" : "no",
            why_winner_won: whyWinnerWon,
            true_fit_or_broad_fallback: trueFitOrFallback,
            mechanism,
            layer1_trace: {
                role_shape: roleShape,
                primary_resolution_diagnostics: primaryResolutionDiagnostics,
                ownership_skeleton_primary: skeleton?.primary_job_skeleton ?? null,
                ownership_primary_subject_kind: skeleton?.primary_subject_kind ?? null,
                role_structure_primary_family: roleStructure?.primary_role_family ?? null,
                role_structure_native_candidates: nativeCandidates.slice(0, 5),
                role_structure_bridge_candidates: (roleStructure?.bridge_like_candidates ?? []).slice(0, 5),
                contract_status: {
                    ownership_skeleton_status: diagnostics?.jd_ownership_skeleton_contract_status ?? null,
                    role_structure_status: diagnostics?.jd_role_structure_contract_status ?? null,
                    ownership_skeleton_failure_reason: diagnostics?.jd_ownership_skeleton_contract_failure_reason ?? null,
                    role_structure_failure_reason: diagnostics?.jd_role_structure_contract_failure_reason ?? null,
                },
            },
        });
    }

    const primaryWinnerFrequency = new Map<string, { count: number; bucket: WinnerBucketType; trueFitCount: number; fallbackCount: number }>();
    for (const row of rows) {
        const primary = String(row.selected_primary_family ?? "").trim() || "null_primary_family";
        const bucket = row.winner_bucket_type as WinnerBucketType;
        const isTrueFit = row.true_fit_or_broad_fallback === "true_role_native_fit";
        const current = primaryWinnerFrequency.get(primary);
        if (!current) {
            primaryWinnerFrequency.set(primary, {
                count: 1,
                bucket,
                trueFitCount: isTrueFit ? 1 : 0,
                fallbackCount: isTrueFit ? 0 : 1,
            });
            continue;
        }
        current.count += 1;
        current.trueFitCount += isTrueFit ? 1 : 0;
        current.fallbackCount += isTrueFit ? 0 : 1;
    }

    const dominantPrimaryWinners = [...primaryWinnerFrequency.entries()]
        .map(([primary_family, value]) => ({
            primary_family,
            frequency: value.count,
            bucket_type: value.bucket,
            center_type: value.fallbackCount >= value.trueFitCount
                ? "fallback_safe_abstraction"
                : "true_role_native_center",
        }))
        .sort((left, right) => right.frequency - left.frequency || left.primary_family.localeCompare(right.primary_family));

    const bucketFrequency = new Map<WinnerBucketType, number>();
    for (const row of rows) {
        const bucket = row.winner_bucket_type as WinnerBucketType;
        bucketFrequency.set(bucket, (bucketFrequency.get(bucket) ?? 0) + 1);
    }

    const suspiciousRows = rows.filter((row) => isBroadOrSuspicious(row.winner_bucket_type as WinnerBucketType));
    const suspiciousFallbackWins = rows.filter((row) => row.true_fit_or_broad_fallback === "broad_fallback_abstraction");
    const mechanismFrequency = new Map<MechanismType, number>();
    for (const row of suspiciousRows) {
        const mechanism = row.mechanism as MechanismType;
        mechanismFrequency.set(mechanism, (mechanismFrequency.get(mechanism) ?? 0) + 1);
    }

    const payload = {
        generated_at: new Date().toISOString(),
        profile_id: args.profileId,
        selection: {
            sample_size: args.sampleSize,
            per_archetype_target: args.perArchetype,
            excluded_snapshot_ids: Array.from(EXCLUDED_SNAPSHOT_IDS),
            selected_case_count: rows.length,
        },
        broad_dominance_report: {
            dominant_primary_winners: dominantPrimaryWinners,
            bucket_distribution: [...bucketFrequency.entries()]
                .map(([bucket_type, frequency]) => ({ bucket_type, frequency }))
                .sort((left, right) => right.frequency - left.frequency),
            suspicious_case_count: suspiciousRows.length,
            suspicious_fallback_wins_remaining: suspiciousFallbackWins.length,
            suspicious_fallback_with_role_native_upstream: suspiciousFallbackWins
                .filter((row) => row.role_native_present_upstream === "yes")
                .length,
            suspicious_mechanism_distribution: [...mechanismFrequency.entries()]
                .map(([mechanism, frequency]) => ({ mechanism, frequency }))
                .sort((left, right) => right.frequency - left.frequency),
        },
        case_table: rows,
    };

    const out = toAbsolutePath(args.outPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        out,
        selected_case_count: rows.length,
        suspicious_case_count: suspiciousRows.length,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-broad-dominance-audit] failed", error);
    process.exit(1);
});
