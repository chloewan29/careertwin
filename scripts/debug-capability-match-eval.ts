import fs from "node:fs";
import path from "node:path";
import { getCapabilityMatchV1 } from "@/lib/career-engine/matching/capability-match-v1";
import {
    classifyMatchLabel,
    DEFAULT_MATCH_LABEL_THRESHOLDS,
    type MatchBenchmarkLabel,
    type MatchLabelThresholds,
} from "@/lib/career-engine/matching/match-label-thresholds";

type BenchmarkLabel = MatchBenchmarkLabel;

type EvaluationFixtureJob = {
    id: string;
    title: string;
    benchmark_label: BenchmarkLabel;
    job_description: string;
    expected_capabilities?: string[];
};

type EvaluationFixture = {
    version: string;
    taxonomy_mode: string;
    jobs: EvaluationFixtureJob[];
};

type EvalRow = {
    id: string;
    title: string;
    benchmark_label: BenchmarkLabel;
    predicted_label: BenchmarkLabel;
    score: number;
    critical_capabilities: string[];
    major_strengths: string[];
    major_gaps: string[];
    extracted_capability_count: number;
    expected_capability_recall?: number;
};

type PerJobComputation = {
    job: EvaluationFixtureJob;
    result: Awaited<ReturnType<typeof getCapabilityMatchV1>>;
};

type ThresholdCalibrationResult = {
    thresholds: MatchLabelThresholds;
    alignment_rate: number;
    aligned_jobs: number;
    total_jobs: number;
    misaligned_jobs: Array<{
        id: string;
        benchmark: BenchmarkLabel;
        predicted: BenchmarkLabel;
        score: number;
    }>;
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

function parseArgs(): {
    careerId: string | null;
    fixturePath: string;
    topSignals: number;
    strongThreshold?: number;
    mediumThreshold?: number;
} {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    const topSignalsValue = Number.parseInt(readArg("--topSignals") ?? "3", 10);
    const strongThresholdValue = Number.parseFloat(readArg("--strongThreshold") ?? "");
    const mediumThresholdValue = Number.parseFloat(readArg("--mediumThreshold") ?? "");
    return {
        careerId: readArg("--careerId"),
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/capability-match-eval-jobs.v1.json",
        topSignals: Number.isFinite(topSignalsValue) ? Math.max(1, Math.min(8, topSignalsValue)) : 3,
        strongThreshold: Number.isFinite(strongThresholdValue) ? strongThresholdValue : undefined,
        mediumThreshold: Number.isFinite(mediumThresholdValue) ? mediumThresholdValue : undefined,
    };
}

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function toSet(values: string[] | undefined): Set<string> {
    return new Set((values ?? []).map((value) => value.toLowerCase().trim()));
}

function readFixture(filePath: string): EvaluationFixture {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    return JSON.parse(content) as EvaluationFixture;
}

function increment(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function alignmentRate(rows: EvalRow[]): number {
    if (rows.length === 0) return 0;
    const aligned = rows.filter((row) => row.benchmark_label === row.predicted_label).length;
    return round(aligned / rows.length);
}

function buildThresholdGrid(): MatchLabelThresholds[] {
    const strongCandidates = [0.5, 0.55, 0.6, 0.62, 0.65];
    const mediumCandidates = [0.25, 0.3, 0.35, 0.38, 0.4, 0.45];
    const out: MatchLabelThresholds[] = [];
    for (const strong of strongCandidates) {
        for (const medium of mediumCandidates) {
            if (medium >= strong) continue;
            out.push({ strong_fit_min: strong, medium_fit_min: medium });
        }
    }
    return out;
}

function evaluateThresholds(
    computedJobs: PerJobComputation[],
    thresholds: MatchLabelThresholds,
): ThresholdCalibrationResult {
    let aligned = 0;
    const misaligned: ThresholdCalibrationResult["misaligned_jobs"] = [];

    for (const entry of computedJobs) {
        const predicted = classifyMatchLabel(entry.result.overall_match_score, thresholds);
        const benchmark = entry.job.benchmark_label;
        if (predicted === benchmark) {
            aligned += 1;
            continue;
        }
        misaligned.push({
            id: entry.job.id,
            benchmark,
            predicted,
            score: entry.result.overall_match_score,
        });
    }

    return {
        thresholds,
        alignment_rate: round(aligned / computedJobs.length),
        aligned_jobs: aligned,
        total_jobs: computedJobs.length,
        misaligned_jobs: misaligned,
    };
}

function chooseBestThreshold(
    results: ThresholdCalibrationResult[],
): ThresholdCalibrationResult {
    return results
        .slice()
        .sort((a, b) => {
            if (b.alignment_rate !== a.alignment_rate) return b.alignment_rate - a.alignment_rate;
            if (a.thresholds.strong_fit_min !== b.thresholds.strong_fit_min) {
                return a.thresholds.strong_fit_min - b.thresholds.strong_fit_min;
            }
            return a.thresholds.medium_fit_min - b.thresholds.medium_fit_min;
        })[0];
}

function classifySuppressionCause(params: {
    weakOrMissingCriticalCount: number;
    weakOrMissingCount: number;
    hasLowStrengthOnRequired: boolean;
    hasCrossFunctionalOnlyGap: boolean;
}): Array<"a" | "b" | "c" | "d"> {
    const causes: Array<"a" | "b" | "c" | "d"> = [];
    if (params.hasCrossFunctionalOnlyGap) causes.push("a");
    if (params.hasLowStrengthOnRequired) causes.push("b");
    if (params.weakOrMissingCriticalCount > 0) causes.push("c");
    if (params.weakOrMissingCount >= 2 && !causes.includes("b")) causes.push("d");
    return causes;
}

async function run(): Promise<void> {
    loadEnvLocal();
    const { careerId, fixturePath, topSignals, strongThreshold, mediumThreshold } = parseArgs();
    if (!careerId) {
        throw new Error("Usage: tsx scripts/debug-capability-match-eval.ts --careerId <id> [--fixture <path>] [--topSignals <n>] [--strongThreshold <n>] [--mediumThreshold <n>]");
    }

    const fixture = readFixture(fixturePath);
    if (!Array.isArray(fixture.jobs) || fixture.jobs.length === 0) {
        throw new Error("Fixture has no jobs.");
    }

    const computedJobs: PerJobComputation[] = [];
    for (const job of fixture.jobs) {
        const result = await getCapabilityMatchV1({
            careerId,
            jobDescription: job.job_description,
            topSignalsLimit: topSignals,
        });
        computedJobs.push({ job, result });
    }

    const thresholdGrid = buildThresholdGrid();
    const calibrationResults = thresholdGrid.map((thresholds) => evaluateThresholds(computedJobs, thresholds));
    const bestFromGrid = chooseBestThreshold(calibrationResults);

    const activeThresholds: MatchLabelThresholds = (typeof strongThreshold === "number" && typeof mediumThreshold === "number")
        ? { strong_fit_min: strongThreshold, medium_fit_min: mediumThreshold }
        : bestFromGrid.thresholds;

    const rows: EvalRow[] = [];
    const jobDiagnostics: Array<{
        id: string;
        title: string;
        benchmark_label: BenchmarkLabel;
        predicted_label: BenchmarkLabel;
        overall_match_score: number;
        score_breakdown: unknown;
        extracted_job_capability_profile: unknown;
        candidate_capability_profile: unknown;
        matched_strengths: unknown;
        partial_matches: unknown;
        gaps: unknown;
    }> = [];

    const criticalExtractionFrequency = new Map<string, number>();
    const missingCapabilityFrequency = new Map<string, number>();
    const extractedCapabilityFrequency = new Map<string, number>();
    const expectedCoverageStats: number[] = [];

    for (const { job, result } of computedJobs) {
        const score = result.overall_match_score;
        const prediction = classifyMatchLabel(score, activeThresholds);
        const extracted = result.job_capability_profile.map((capability) => capability.canonical_name);
        const critical = result.job_capability_profile
            .filter((capability) => capability.importance === "critical")
            .map((capability) => capability.canonical_name);

        for (const capability of extracted) increment(extractedCapabilityFrequency, capability);
        for (const capability of critical) increment(criticalExtractionFrequency, capability);
        for (const gap of result.gaps) increment(missingCapabilityFrequency, gap.canonical_name);

        const strengths = result.matched_strengths
            .concat(result.partial_matches.filter((item) => item.match_status === "partial"))
            .sort((a, b) => b.candidate_strength_score - a.candidate_strength_score)
            .slice(0, 3)
            .map((item) => item.display_name);
        const majorGaps = result.gaps
            .slice()
            .sort((a, b) => {
                const weight = (importance: "critical" | "important" | "supporting"): number => {
                    if (importance === "critical") return 3;
                    if (importance === "important") return 2;
                    return 1;
                };
                return weight(b.importance) - weight(a.importance);
            })
            .slice(0, 3)
            .map((item) => item.display_name);

        let expectedRecall: number | undefined;
        if (job.expected_capabilities && job.expected_capabilities.length > 0) {
            const expected = toSet(job.expected_capabilities);
            const extractedSet = toSet(extracted);
            let covered = 0;
            for (const capability of expected) {
                if (extractedSet.has(capability)) covered += 1;
            }
            expectedRecall = round(covered / expected.size);
            expectedCoverageStats.push(expectedRecall);
        }

        rows.push({
            id: job.id,
            title: job.title,
            benchmark_label: job.benchmark_label,
            predicted_label: prediction,
            score,
            critical_capabilities: critical,
            major_strengths: strengths,
            major_gaps: majorGaps,
            extracted_capability_count: extracted.length,
            expected_capability_recall: expectedRecall,
        });

        jobDiagnostics.push({
            id: job.id,
            title: job.title,
            benchmark_label: job.benchmark_label,
            predicted_label: prediction,
            overall_match_score: result.overall_match_score,
            score_breakdown: result.score_breakdown,
            extracted_job_capability_profile: result.job_capability_profile,
            candidate_capability_profile: result.candidate_capability_profile,
            matched_strengths: result.matched_strengths,
            partial_matches: result.partial_matches,
            gaps: result.gaps,
        });
    }

    const ranked = rows.slice().sort((a, b) => b.score - a.score);
    const scores = rows.map((row) => row.score);
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const meanScore = scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
    const scoreRange = maxScore - minScore;

    const capabilityCountThreshold = Math.ceil(rows.length * 0.6);
    const overTriggered = Array.from(extractedCapabilityFrequency.entries())
        .filter(([, count]) => count >= capabilityCountThreshold)
        .sort((a, b) => b[1] - a[1])
        .map(([capability, count]) => ({ capability, count }));

    const underTriggered = Array.from(extractedCapabilityFrequency.entries())
        .filter(([, count]) => count === 1)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([capability]) => capability);

    const avgExpectedCoverage = expectedCoverageStats.length > 0
        ? round(expectedCoverageStats.reduce((sum, value) => sum + value, 0) / expectedCoverageStats.length)
        : null;

    const diagnostics = {
        score_distribution: {
            min: round(minScore),
            max: round(maxScore),
            mean: round(meanScore),
            range: round(scoreRange),
            spread_assessment: scoreRange < 0.2
                ? "compressed"
                : scoreRange > 0.65
                    ? "harsh"
                    : "usable",
        },
        label_alignment: {
            benchmark_alignment_rate: alignmentRate(rows),
            total_jobs: rows.length,
            aligned_jobs: rows.filter((row) => row.benchmark_label === row.predicted_label).length,
            misaligned_jobs: rows.filter((row) => row.benchmark_label !== row.predicted_label).map((row) => ({
                id: row.id,
                benchmark: row.benchmark_label,
                predicted: row.predicted_label,
                score: row.score,
            })),
        },
        critical_extraction_frequency: Array.from(criticalExtractionFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([capability, count]) => ({ capability, count })),
        missing_capability_frequency: Array.from(missingCapabilityFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([capability, count]) => ({ capability, count })),
        over_triggered_capabilities: overTriggered,
        under_triggered_capabilities: underTriggered,
        expected_capability_coverage: avgExpectedCoverage,
    };

    const targetedJobs = new Set(["job-01-analytics-strategy-manager", "job-02-commercial-insights-lead"]);
    const targeted_error_analysis = jobDiagnostics
        .filter((job) => targetedJobs.has(job.id))
        .map((job) => {
            const extracted = (job.extracted_job_capability_profile as Array<{
                canonical_name: string;
                display_name: string;
                importance: "critical" | "important" | "supporting";
            }>);
            const candidate = (job.candidate_capability_profile as Array<{
                canonical_name: string;
                display_name: string;
                strength_score: number;
            }>);
            const candidateByCanonical = new Map(candidate.map((item) => [item.canonical_name.toLowerCase(), item]));

            const mapped = extracted.map((capability) => {
                const found = candidateByCanonical.get(capability.canonical_name.toLowerCase());
                return {
                    capability: capability.display_name,
                    canonical_name: capability.canonical_name,
                    importance: capability.importance,
                    candidate_strength_score: found?.strength_score ?? 0,
                    status: (found?.strength_score ?? 0) >= 0.35
                        ? "covered_or_partial"
                        : (found?.strength_score ?? 0) >= 0.2
                            ? "weak"
                            : "missing",
                };
            });

            const weakOrMissing = mapped.filter((item) => item.status === "weak" || item.status === "missing");
            const weakOrMissingCritical = weakOrMissing.filter((item) => item.importance === "critical");
            const hasLowStrengthOnRequired = weakOrMissingCritical.length > 0;
            const hasCrossFunctionalOnlyGap = weakOrMissing.some((item) => item.canonical_name === "cross-functional stakeholder leadership");

            return {
                id: job.id,
                title: job.title,
                benchmark_label: job.benchmark_label,
                predicted_label: job.predicted_label,
                overall_match_score: job.overall_match_score,
                extracted_job_capabilities: extracted,
                candidate_capability_strengths_for_extracted: mapped,
                suppressing_weak_or_missing_capabilities: weakOrMissing,
                diagnosis_category: classifySuppressionCause({
                    weakOrMissingCriticalCount: weakOrMissingCritical.length,
                    weakOrMissingCount: weakOrMissing.length,
                    hasLowStrengthOnRequired,
                    hasCrossFunctionalOnlyGap,
                }),
            };
        });

    console.log(JSON.stringify({
        model: "job_capability_match_eval_v1",
        fixture_version: fixture.version,
        career_id: careerId,
        job_count: rows.length,
        label_thresholds: {
            default: DEFAULT_MATCH_LABEL_THRESHOLDS,
            active: activeThresholds,
            grid_tested: calibrationResults.map((result) => ({
                thresholds: result.thresholds,
                alignment_rate: result.alignment_rate,
                aligned_jobs: result.aligned_jobs,
            })),
            best_from_grid: bestFromGrid,
        },
        ranked_jobs: ranked,
        diagnostics,
        jobs: jobDiagnostics,
        targeted_error_analysis,
    }, null, 2));
}

run().catch((error) => {
    console.error("[debug-capability-match-eval] Failed", error);
    process.exit(1);
});
