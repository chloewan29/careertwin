import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getCapabilityMatchV2 } from "@/lib/career-engine/matching/capability-match-v2";
import { normalizeTitle } from "@/lib/career-engine/parsing/title-normalizer";
import {
    loadEnvLocal,
    readFixture,
    resolveFixtureJob,
    resolveProfileAndCareer,
    type Fixture,
    type FixtureJob,
} from "@/scripts/human-alignment-benchmark";

type AuditArgs = {
    profileId: string | null;
    careerId: string | null;
    fixturePath: string;
    caseIds: string[] | null;
    summaryOut: string;
    detailsOut: string;
};

export type CaseCapabilitySummary = {
    case_id: string;
    title: string;
    model_bucket: "high_fit" | "medium_fit" | "low_fit";
    extraction_quality: string | null;
    top_5_matched_capabilities: string[];
    top_5_capability_scores: number[];
};

export type PairwiseOverlap = {
    case_id_a: string;
    title_a: string;
    case_id_b: string;
    title_b: string;
    overlap_rate: number;
};

export type SuspiciousSimilarityPair = PairwiseOverlap & {
    reason: string;
};

export type DifferentiationSummary = {
    fixture_version: string;
    profile_id: string;
    career_id: string;
    total_cases: number;
    average_top5_overlap: number;
    max_top5_overlap: number;
    min_top5_overlap: number;
    number_of_pairs_above_0_8_overlap: number;
    number_of_pairs_below_0_4_overlap: number;
    suspicious_similarity: SuspiciousSimilarityPair[];
};

export type DifferentiationDetails = {
    fixture_version: string;
    profile_id: string;
    career_id: string;
    cases: CaseCapabilitySummary[];
    pairwise_overlap: PairwiseOverlap[];
};

const TITLE_STOPWORDS = new Set([
    "senior",
    "lead",
    "manager",
    "director",
    "head",
    "principal",
    "specialist",
    "consultant",
    "associate",
    "data",
]);

function parseArgs(): AuditArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };

    const caseIdsArg = readArg("--caseIds");
    return {
        profileId: readArg("--profileId"),
        careerId: readArg("--careerId"),
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        caseIds: caseIdsArg
            ? caseIdsArg.split(",").map((value) => value.trim()).filter(Boolean)
            : null,
        summaryOut: readArg("--summaryOut") ?? "tmp-capability-differentiation-summary.json",
        detailsOut: readArg("--detailsOut") ?? "tmp-capability-differentiation-details.json",
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function selectFixtureJobs(fixture: Fixture, caseIds: string[] | null): FixtureJob[] {
    if (!caseIds || caseIds.length === 0) return fixture.jobs;
    const allowed = new Set(caseIds);
    return fixture.jobs.filter((job) => allowed.has(job.id));
}

function topMatchedCapabilities(result: Awaited<ReturnType<typeof getCapabilityMatchV2>>): {
    capabilities: string[];
    scores: number[];
} {
    const ranked = [...result.matched_strengths, ...result.partial_matches]
        .sort((a, b) => b.match_score_contribution - a.match_score_contribution);
    const unique = new Map<string, number>();
    for (const item of ranked) {
        if (!unique.has(item.display_name)) {
            unique.set(item.display_name, Number((item.match_score_contribution * 100).toFixed(2)));
        }
        if (unique.size >= 5) break;
    }
    return {
        capabilities: Array.from(unique.keys()),
        scores: Array.from(unique.values()),
    };
}

function overlapRate(caseA: CaseCapabilitySummary, caseB: CaseCapabilitySummary): number {
    const setA = new Set(caseA.top_5_matched_capabilities);
    const intersectionCount = caseB.top_5_matched_capabilities.filter((value) => setA.has(value)).length;
    return Number((intersectionCount / 5).toFixed(4));
}

function titleContentTokens(title: string): string[] {
    const normalized = normalizeTitle(title).normalized.toLowerCase();
    return normalized
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !TITLE_STOPWORDS.has(token));
}

function materiallyDifferentTitles(titleA: string, titleB: string): boolean {
    const tokensA = new Set(titleContentTokens(titleA));
    const tokensB = new Set(titleContentTokens(titleB));
    if (tokensA.size === 0 || tokensB.size === 0) {
        return normalizeTitle(titleA).normalized !== normalizeTitle(titleB).normalized;
    }
    let overlap = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) overlap += 1;
    }
    const denominator = Math.max(tokensA.size, tokensB.size);
    return (overlap / denominator) < 0.4;
}

export async function runCapabilityDifferentiationAudit(args: {
    profileId?: string | null;
    careerId?: string | null;
    fixturePath?: string;
    caseIds?: string[] | null;
    summaryOut?: string | null;
    detailsOut?: string | null;
} = {}): Promise<{ summary: DifferentiationSummary; details: DifferentiationDetails }> {
    loadEnvLocal();
    const fixturePath = args.fixturePath ?? "scripts/fixtures/human-alignment-benchmark.seed.json";
    const summaryOut = args.summaryOut ?? null;
    const detailsOut = args.detailsOut ?? null;
    const { profileId, careerId } = await resolveProfileAndCareer(args.profileId ?? null, args.careerId ?? null);
    const fixture = readFixture(fixturePath);
    const jobs = selectFixtureJobs(fixture, args.caseIds ?? null);
    if (jobs.length === 0) {
        throw new Error("No fixture jobs selected for differentiation audit.");
    }

    const cases: CaseCapabilitySummary[] = [];
    for (const job of jobs) {
        const resolvedJob = await resolveFixtureJob(job);
        if (!resolvedJob.job_description || resolvedJob.job_description.trim().length < 40) {
            throw new Error(`Resolved job ${job.id} has an insufficient job description.`);
        }
        const result = await getCapabilityMatchV2({
            careerId,
            profileId,
            jobDescription: resolvedJob.job_description,
            jobTitleHint: resolvedJob.resolved_title,
            topSignalsLimit: 4,
        });
        const topFive = topMatchedCapabilities(result);
        cases.push({
            case_id: job.id,
            title: resolvedJob.resolved_title,
            model_bucket: result.fit_bucket,
            extraction_quality: result.job_profile_quality,
            top_5_matched_capabilities: topFive.capabilities,
            top_5_capability_scores: topFive.scores,
        });
    }

    const pairwiseOverlap: PairwiseOverlap[] = [];
    for (let i = 0; i < cases.length; i += 1) {
        for (let j = i + 1; j < cases.length; j += 1) {
            pairwiseOverlap.push({
                case_id_a: cases[i].case_id,
                title_a: cases[i].title,
                case_id_b: cases[j].case_id,
                title_b: cases[j].title,
                overlap_rate: overlapRate(cases[i], cases[j]),
            });
        }
    }

    const overlapValues = pairwiseOverlap.map((pair) => pair.overlap_rate);
    const averageTop5Overlap = overlapValues.length > 0
        ? Number((overlapValues.reduce((sum, value) => sum + value, 0) / overlapValues.length).toFixed(4))
        : 0;
    const maxTop5Overlap = overlapValues.length > 0 ? Math.max(...overlapValues) : 0;
    const minTop5Overlap = overlapValues.length > 0 ? Math.min(...overlapValues) : 0;
    const suspiciousSimilarity = pairwiseOverlap
        .filter((pair) => pair.overlap_rate >= 0.8 && materiallyDifferentTitles(pair.title_a, pair.title_b))
        .map((pair) => ({
            ...pair,
            reason: "Top-5 capability overlap is very high despite materially different title wording.",
        }))
        .sort((a, b) => b.overlap_rate - a.overlap_rate);

    const summary: DifferentiationSummary = {
        fixture_version: fixture.version,
        profile_id: profileId,
        career_id: careerId,
        total_cases: cases.length,
        average_top5_overlap: averageTop5Overlap,
        max_top5_overlap: Number(maxTop5Overlap.toFixed(4)),
        min_top5_overlap: Number(minTop5Overlap.toFixed(4)),
        number_of_pairs_above_0_8_overlap: pairwiseOverlap.filter((pair) => pair.overlap_rate >= 0.8).length,
        number_of_pairs_below_0_4_overlap: pairwiseOverlap.filter((pair) => pair.overlap_rate < 0.4).length,
        suspicious_similarity: suspiciousSimilarity,
    };

    const details: DifferentiationDetails = {
        fixture_version: fixture.version,
        profile_id: profileId,
        career_id: careerId,
        cases,
        pairwise_overlap: pairwiseOverlap
            .sort((a, b) => {
                if (b.overlap_rate !== a.overlap_rate) return b.overlap_rate - a.overlap_rate;
                return `${a.case_id_a}-${a.case_id_b}`.localeCompare(`${b.case_id_a}-${b.case_id_b}`);
            }),
    };

    if (summaryOut) writeJson(summaryOut, summary);
    if (detailsOut) writeJson(detailsOut, details);

    return { summary, details };
}

async function run(): Promise<void> {
    const args = parseArgs();
    const result = await runCapabilityDifferentiationAudit(args);
    console.log(JSON.stringify({
        summary_out: args.summaryOut,
        details_out: args.detailsOut,
        total_cases: result.summary.total_cases,
        average_top5_overlap: result.summary.average_top5_overlap,
        max_top5_overlap: result.summary.max_top5_overlap,
        min_top5_overlap: result.summary.min_top5_overlap,
    }, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    run().catch((error) => {
        console.error("[run-capability-differentiation-audit] Failed", error);
        process.exit(1);
    });
}
