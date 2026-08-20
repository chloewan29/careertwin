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

type ExpectedShape = "true_broad_native" | "fallback_broad_risk";

type WinnerBucketType =
    | "role_native_functional"
    | "operating_mode"
    | "governance_process"
    | "delivery_posture"
    | "business_abstraction"
    | "proof_posture"
    | "broad_leadership_native";

type Args = {
    profileId: string;
    outPath: string;
    sampleSize: number;
    trueBroadCount: number;
    fallbackCount: number;
};

const EXCLUDED_SNAPSHOT_IDS = new Set([5661, 5666, 5668, 5670]);

const LEADERSHIP_TITLE_RE = /\b(head|director|chief|vp|vice president|general manager|gm)\b/i;
const BROAD_SCOPE_KEYWORDS = [
    "enterprise",
    "organization",
    "organisation",
    "portfolio",
    "function-wide",
    "cross-functional",
    "across business",
    "across the business",
    "operating model",
    "executive leadership",
    "org-wide",
    "multi-domain",
    "multi function",
];
const ACCOUNTABILITY_KEYWORDS = [
    "accountable",
    "own",
    "ownership",
    "responsible for",
    "decision rights",
    "set strategy",
    "define standards",
    "lead function",
];
const NARROW_CENTER_KEYWORDS = [
    "fp&a",
    "financial planning",
    "forecasting",
    "financial model",
    "sales intelligence",
    "sales operations",
    "revenue operations",
    "consumer insights",
    "customer insights",
    "digital journey",
    "customer journey",
    "product analytics",
    "growth analytics",
    "commercial insights",
    "retention",
    "acquisition",
    "conversion",
    "experimentation",
    "pricing",
];
const DOMAIN_GROUPS: Array<{ id: string; cues: string[] }> = [
    { id: "finance", cues: ["finance", "financial", "fp&a", "pricing", "budget"] },
    { id: "sales", cues: ["sales", "revenue", "gtm"] },
    { id: "customer", cues: ["customer", "consumer", "journey", "retention", "acquisition"] },
    { id: "product", cues: ["product", "roadmap", "feature"] },
    { id: "data_analytics", cues: ["analytics", "insights", "data", "bi", "reporting"] },
    { id: "operations", cues: ["operations", "process", "delivery", "implementation"] },
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
        outPath: readArg("--out") ?? "artifacts/true-broad-vs-fallback-audit.json",
        sampleSize: Number(readArg("--sampleSize") ?? 800),
        trueBroadCount: Number(readArg("--trueBroadCount") ?? 6),
        fallbackCount: Number(readArg("--fallbackCount") ?? 8),
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

function countKeywordHits(corpus: string, keywords: string[]): number {
    const normalized = normalizeText(corpus);
    return keywords.reduce((count, keyword) => count + (normalized.includes(normalizeText(keyword)) ? 1 : 0), 0);
}

function countDistinctDomainHits(corpus: string): number {
    const normalized = normalizeText(corpus);
    let hitCount = 0;
    for (const group of DOMAIN_GROUPS) {
        if (group.cues.some((cue) => normalized.includes(cue))) hitCount += 1;
    }
    return hitCount;
}

function classifyWinnerBucket(primaryFamily: string): WinnerBucketType {
    const family = normalizeText(primaryFamily).replace(/[\s-]+/g, "_");
    if (!family) return "business_abstraction";
    if (family.includes("broad_functional_leadership") || family.includes("functional_leadership")) return "broad_leadership_native";
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
        family.includes("financial_planning_analysis")
        || family.includes("sales_intelligence_operations")
        || family.includes("customer_cx_insights")
        || family.includes("customer_insights_analytics")
        || family.includes("product_analytics_experimentation")
        || family.includes("marketing_science_measurement")
    ) {
        return "role_native_functional";
    }
    return "role_native_functional";
}

function isBroadBucket(bucket: WinnerBucketType): boolean {
    return bucket !== "role_native_functional";
}

function loadPoolCandidateScore(snapshot: SnapshotRow): {
    leadershipTitle: boolean;
    broadScopeHits: number;
    accountabilityHits: number;
    narrowHits: number;
    domainHits: number;
} {
    const title = normalizeText(snapshot.job_title);
    const jd = normalizeText(snapshot.job_description_raw);
    const corpus = `${title} ${jd}`;
    return {
        leadershipTitle: LEADERSHIP_TITLE_RE.test(title),
        broadScopeHits: countKeywordHits(corpus, BROAD_SCOPE_KEYWORDS),
        accountabilityHits: countKeywordHits(corpus, ACCOUNTABILITY_KEYWORDS),
        narrowHits: countKeywordHits(corpus, NARROW_CENTER_KEYWORDS),
        domainHits: countDistinctDomainHits(corpus),
    };
}

function selectCohorts(pool: SnapshotRow[], args: Args): Array<{ snapshot: SnapshotRow; expectedShape: ExpectedShape }> {
    const trueBroadCandidates = pool
        .filter((row) => !EXCLUDED_SNAPSHOT_IDS.has(row.job_snapshot_id))
        .filter((row) => (row.job_description_raw ?? "").trim().length >= 450)
        .map((row) => {
            const score = loadPoolCandidateScore(row);
            const broadScore = (score.leadershipTitle ? 2.4 : 0)
                + (score.broadScopeHits * 1.3)
                + (score.accountabilityHits * 1.2)
                + (Math.max(0, score.domainHits - 1) * 0.7)
                - (score.narrowHits * 0.9);
            return { row, score, broadScore };
        })
        .filter((entry) => entry.score.leadershipTitle && entry.broadScore >= 3.6)
        .sort((left, right) => right.broadScore - left.broadScore);

    const fallbackCandidates = pool
        .filter((row) => !EXCLUDED_SNAPSHOT_IDS.has(row.job_snapshot_id))
        .filter((row) => (row.job_description_raw ?? "").trim().length >= 450)
        .map((row) => {
            const score = loadPoolCandidateScore(row);
            const fallbackScore = (score.narrowHits * 1.8) + (score.domainHits * 0.4) - (score.broadScopeHits * 0.2);
            return { row, score, fallbackScore };
        })
        .filter((entry) => entry.score.narrowHits >= 2)
        .sort((left, right) => right.fallbackScore - left.fallbackScore);

    const selected: Array<{ snapshot: SnapshotRow; expectedShape: ExpectedShape }> = [];
    const used = new Set<number>();

    for (const entry of trueBroadCandidates) {
        if (selected.filter((item) => item.expectedShape === "true_broad_native").length >= args.trueBroadCount) break;
        if (used.has(entry.row.job_snapshot_id)) continue;
        used.add(entry.row.job_snapshot_id);
        selected.push({ snapshot: entry.row, expectedShape: "true_broad_native" });
    }
    for (const entry of fallbackCandidates) {
        if (selected.filter((item) => item.expectedShape === "fallback_broad_risk").length >= args.fallbackCount) break;
        if (used.has(entry.row.job_snapshot_id)) continue;
        used.add(entry.row.job_snapshot_id);
        selected.push({ snapshot: entry.row, expectedShape: "fallback_broad_risk" });
    }
    return selected;
}

function narrowCandidateExists(params: {
    nativeCandidates: Array<{ cluster_id: string; reason: string; confidence: number }>;
    summaryCorpus: string;
}): boolean {
    const narrowKeywordHit = countKeywordHits(params.summaryCorpus, NARROW_CENTER_KEYWORDS);
    const candidateHit = params.nativeCandidates.some((candidate) => {
        if (candidate.confidence < 0.65) return false;
        const bucket = classifyWinnerBucket(candidate.cluster_id);
        if (bucket === "role_native_functional") return true;
        const corpus = `${candidate.cluster_id} ${candidate.reason}`;
        return countKeywordHits(corpus, NARROW_CENTER_KEYWORDS) >= 1;
    });
    return candidateHit || narrowKeywordHit >= 2;
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
    const cohort = selectCohorts(pool, args);

    const caseTable: Array<Record<string, unknown>> = [];
    for (const entry of cohort) {
        const snapshot = entry.snapshot;
        const title = snapshot.job_title ?? `Snapshot ${snapshot.job_snapshot_id}`;
        const jd = snapshot.job_description_raw ?? "";
        const scopeScore = loadPoolCandidateScore(snapshot);
        const output = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: snapshot.source_platform,
            jobUrl: snapshot.job_url ?? `https://true-broad-audit.local/snapshot/${snapshot.job_snapshot_id}`,
            jobTitle: title,
            company: snapshot.company ?? null,
            location: snapshot.location ?? null,
            jobDescription: jd,
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
        const summaryCorpus = [
            title,
            roleStructure?.main_role ?? "",
            roleStructure?.main_role_summary ?? "",
            skeleton?.core_ownership ?? "",
            skeleton?.primary_subject_kind ?? "",
            ...(skeleton?.secondary_subject_kinds ?? []),
        ].join(" ");
        const narrowExists = narrowCandidateExists({ nativeCandidates, summaryCorpus });
        const broadSelected = isBroadBucket(winnerBucket);

        const broadCorrect = entry.expectedShape === "true_broad_native"
            ? (broadSelected && !narrowExists && scopeScore.leadershipTitle && scopeScore.broadScopeHits >= 2 && scopeScore.accountabilityHits >= 1)
            : !broadSelected;
        const broadCorrectness = broadCorrect
            ? "broad_correct_or_not_selected"
            : "broad_incorrect_fallback";
        const whyBroadVerdict = broadCorrect
            ? "Broad primary aligns with high-scope leadership and no dominant narrow center."
            : "Broad primary selected despite dominant narrow-center evidence or missing true-broad scope evidence.";

        caseTable.push({
            snapshot_id: snapshot.job_snapshot_id,
            source_platform: snapshot.source_platform,
            job_title: snapshot.job_title,
            company: snapshot.company,
            expected_shape: entry.expectedShape,
            selected_primary_family: selectedPrimaryFamily || null,
            winner_bucket_type: winnerBucket,
            narrow_role_native_center_existed: narrowExists ? "yes" : "no",
            broad_correctness: broadCorrectness,
            why_broad_correct_or_incorrect: whyBroadVerdict,
            scope_signals: {
                leadership_title_signal: scopeScore.leadershipTitle,
                broad_scope_hits: scopeScore.broadScopeHits,
                accountability_hits: scopeScore.accountabilityHits,
                domain_span_count: scopeScore.domainHits,
                narrow_center_hits: scopeScore.narrowHits,
            },
            layer1_trace: {
                role_shape: roleShape,
                primary_resolution_diagnostics: primaryResolutionDiagnostics,
                ownership_skeleton_primary: skeleton?.primary_job_skeleton ?? null,
                ownership_primary_subject_kind: skeleton?.primary_subject_kind ?? null,
                role_structure_primary_family: roleStructure?.primary_role_family ?? null,
                role_structure_native_candidates: nativeCandidates.slice(0, 5),
                role_structure_bridge_candidates: (roleStructure?.bridge_like_candidates ?? []).slice(0, 5),
            },
        });
    }

    const trueBroadCases = caseTable.filter((row) => row.expected_shape === "true_broad_native");
    const fallbackCases = caseTable.filter((row) => row.expected_shape === "fallback_broad_risk");
    const broadIncorrectCases = caseTable.filter((row) => row.broad_correctness === "broad_incorrect_fallback");

    const summarizeSignals = (rows: Array<Record<string, unknown>>) => {
        const avg = (selector: (row: Record<string, unknown>) => number): number => {
            if (rows.length === 0) return 0;
            const total = rows.reduce((sum, row) => sum + selector(row), 0);
            return Number((total / rows.length).toFixed(2));
        };
        return {
            average_broad_scope_hits: avg((row) => Number((row.scope_signals as Record<string, unknown>).broad_scope_hits ?? 0)),
            average_accountability_hits: avg((row) => Number((row.scope_signals as Record<string, unknown>).accountability_hits ?? 0)),
            average_domain_span_count: avg((row) => Number((row.scope_signals as Record<string, unknown>).domain_span_count ?? 0)),
            average_narrow_center_hits: avg((row) => Number((row.scope_signals as Record<string, unknown>).narrow_center_hits ?? 0)),
            leadership_title_ratio: Number((rows.filter((row) => Boolean((row.scope_signals as Record<string, unknown>).leadership_title_signal)).length / Math.max(1, rows.length)).toFixed(2)),
        };
    };

    const bucketCounts = new Map<WinnerBucketType, number>();
    for (const row of caseTable) {
        const bucket = row.winner_bucket_type as WinnerBucketType;
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
    }

    const payload = {
        generated_at: new Date().toISOString(),
        profile_id: args.profileId,
        selection: {
            sample_size: args.sampleSize,
            true_broad_target: args.trueBroadCount,
            fallback_target: args.fallbackCount,
            selected_case_count: caseTable.length,
            excluded_snapshot_ids: Array.from(EXCLUDED_SNAPSHOT_IDS),
        },
        shape_signal_comparison: {
            true_broad_signal_summary: summarizeSignals(trueBroadCases),
            fallback_signal_summary: summarizeSignals(fallbackCases),
        },
        derived_criteria: {
            true_broad_native_indicators: [
                "leadership_title_signal=true",
                "broad_scope_hits >= 2",
                "accountability_hits >= 1",
                "domain_span_count >= 3",
                "narrow_role_native_center_existed = no",
            ],
            fallback_broad_indicators: [
                "narrow_center_hits >= 2 OR narrow_role_native_center_existed = yes",
                "winner_bucket_type in {proof_posture, business_abstraction, delivery_posture, operating_mode}",
                "broad primary selected without meeting true-broad-native indicators",
            ],
        },
        bucket_validity_observation: [...bucketCounts.entries()]
            .map(([bucket_type, frequency]) => ({ bucket_type, frequency }))
            .sort((left, right) => right.frequency - left.frequency),
        case_table: caseTable,
        summary: {
            true_broad_cases: trueBroadCases.length,
            fallback_cases: fallbackCases.length,
            broad_incorrect_fallback_cases: broadIncorrectCases.length,
            broad_incorrect_with_narrow_upstream: broadIncorrectCases.filter((row) => row.narrow_role_native_center_existed === "yes").length,
        },
    };

    const out = toAbsolutePath(args.outPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        out,
        selected_case_count: caseTable.length,
        broad_incorrect_fallback_cases: payload.summary.broad_incorrect_fallback_cases,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-true-broad-vs-fallback-audit] failed", error);
    process.exit(1);
});
