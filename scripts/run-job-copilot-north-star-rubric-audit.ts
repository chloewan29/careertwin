import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type HumanLabel = "high_fit" | "medium_fit" | "low_fit";

type FixtureJob = {
    id: string;
    title: string;
    company?: string | null;
    human_label: HumanLabel;
    human_reasoning_short: string;
    job_description: string;
};

type Fixture = {
    version: string;
    jobs: FixtureJob[];
};

type CaseSelection = {
    case_id: string;
    stratum: "strong_fit" | "plausible_fit" | "weak_fit" | "known_residual";
    rationale: string;
};

type Args = {
    profileId: string;
    fixturePath: string;
    outPath: string;
};

type RubricSurfaceScore = {
    score: 0 | 1 | 2;
    note: string;
};

type RiskScore = RubricSurfaceScore & {
    risk_type: "missing" | "weakly_proven" | "weakly_surfaced" | "untyped";
};

type CaseRubric = {
    career_verdict: RubricSurfaceScore;
    why_you: RubricSurfaceScore;
    biggest_risk: RiskScore;
    quick_checks: RubricSurfaceScore;
    cta: RubricSurfaceScore;
    cross_surface_consistency: RubricSurfaceScore;
    total_score: number;
    weakest_surface: string;
    main_next_question: string;
};

type ScoreScale = {
    0: string;
    1: string;
    2: string;
};

const CASE_SET: CaseSelection[] = [
    {
        case_id: "job-01",
        stratum: "strong_fit",
        rationale: "High-fit analytics leadership baseline with strong buy-case expectation.",
    },
    {
        case_id: "job-08",
        stratum: "strong_fit",
        rationale: "High-fit revenue strategy profile to test non-identical high-fit role shape.",
    },
    {
        case_id: "job-04",
        stratum: "plausible_fit",
        rationale: "Plausible-fit product analytics role with likely one-key-hesitation profile.",
    },
    {
        case_id: "job-10",
        stratum: "plausible_fit",
        rationale: "Plausible-fit analytics enablement role from active residual family context.",
    },
    {
        case_id: "job-14",
        stratum: "weak_fit",
        rationale: "Low-fit domain mismatch case to test calibrated low-confidence posture.",
    },
    {
        case_id: "job-20",
        stratum: "weak_fit",
        rationale: "Low-fit operations-heavy case to test deprioritize-path quality.",
    },
    {
        case_id: "job-03",
        stratum: "known_residual",
        rationale: "Known residual contrast case from active queue history.",
    },
    {
        case_id: "job-18",
        stratum: "known_residual",
        rationale: "Known residual case with role-family tension and prior audit attention.",
    },
];

const SCORE_SCALE: ScoreScale = {
    0: "weak: generic/misaligned/not decision-useful",
    1: "acceptable: partially aligned with notable weakness",
    2: "strong: clearly aligned, grounded, and calibrated",
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

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        profileId: readArg("--profileId") ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        outPath: readArg("--out") ?? "artifacts/job-copilot-north-star-rubric-baseline.2026-04-10.json",
    };
}

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

function stripHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function section(html: string, title: string): string {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`<section[^>]*>[\\s\\S]*?<h2>${escaped}<\\/h2>([\\s\\S]*?)<\\/section>`, "i"));
    return match?.[1] ? stripHtml(match[1]) : "";
}

function createRenderer() {
    (globalThis as Record<string, unknown>).CareerTwinSharedUtils = {
        asArray: (value: unknown) => (Array.isArray(value) ? value : []),
        escapeHtml: (value: unknown) => String(value ?? ""),
    };
    const context = vm.createContext(globalThis as unknown as vm.Context);
    for (const file of [
        "extensions/job-copilot/sidepanel/render/render-match-view-model.js",
        "extensions/job-copilot/sidepanel/render/render-match-summary.js",
        "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
        "extensions/job-copilot/sidepanel/render/render-tailored-cv.js",
    ]) {
        new vm.Script(fs.readFileSync(path.join(process.cwd(), file), "utf8"), { filename: file }).runInContext(context);
    }
    const g = globalThis as Record<string, any>;
    return {
        toVM: g.CareerTwinRenderMatchViewModel.toMatchPanelViewModel as (payload: Record<string, unknown>) => Record<string, unknown>,
        sum: g.CareerTwinRenderMatchSummary.renderMatchSummary as (viewModel: Record<string, unknown>) => string,
        qc: g.CareerTwinRenderQuickChecks.renderQuickChecks as (viewModel: Record<string, unknown>) => string,
        cta: g.CareerTwinRenderTailoredCv.renderTailoredCv as (viewModel: Record<string, unknown>) => string,
    };
}

function normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function mapBandToBucket(band: string | null | undefined): HumanLabel {
    if (band === "strong") return "high_fit";
    if (band === "consider") return "medium_fit";
    return "low_fit";
}

function isAdjacentBucket(left: HumanLabel, right: HumanLabel): boolean {
    return (left === "high_fit" && right === "medium_fit")
        || (left === "medium_fit" && right === "high_fit")
        || (left === "medium_fit" && right === "low_fit")
        || (left === "low_fit" && right === "medium_fit");
}

function detectRiskType(riskText: string): RiskScore["risk_type"] {
    const text = normalizeText(riskText);
    if (!text) return "untyped";
    if (/(still limited|missing|lack|lacking|no direct|not enough|insufficient evidence)/.test(text)) return "missing";
    if (/(not yet proven|weakly proven|unclear|uncertain|needs proof|could be read|may be read)/.test(text)) return "weakly_proven";
    if (/(positioning fix|framing|misread|surface|expressed|story)/.test(text)) return "weakly_surfaced";
    return "untyped";
}

function topTokensFromTitle(title: string): string[] {
    const stop = new Set(["manager", "lead", "director", "senior", "and", "of", "the", "co", "group"]);
    return normalizeText(title)
        .split(" ")
        .filter((token) => token.length >= 4 && !stop.has(token))
        .slice(0, 4);
}

function scoreCareerVerdict(params: {
    humanLabel: HumanLabel;
    modelBand: string | null | undefined;
    verdictText: string;
}): RubricSurfaceScore {
    const modelBucket = mapBandToBucket(params.modelBand);
    const verdictText = params.verdictText.trim();
    if (!verdictText) {
        return { score: 0, note: "Missing Career Verdict text." };
    }
    let score: 0 | 1 | 2 = modelBucket === params.humanLabel ? 2 : isAdjacentBucket(modelBucket, params.humanLabel) ? 1 : 0;
    const normalized = normalizeText(verdictText);
    const genericTaxonomy = /(broad fit|generic fit|skills summary|capability collage|taxonomy)/.test(normalized);
    const overClaim = /(ready to apply|strong apply recommendation)/.test(normalized) && modelBucket === "low_fit";
    if ((genericTaxonomy || overClaim) && score > 0) score = (score - 1) as 0 | 1 | 2;
    return {
        score,
        note: `human=${params.humanLabel}, model=${modelBucket}${genericTaxonomy ? "; generic framing signal" : ""}${overClaim ? "; over-claim signal" : ""}`,
    };
}

function scoreWhyYou(params: {
    whyFit: string[];
    whyDebug: Array<{ line_text: string; supporting_evidence_ids: string[] }>;
}): RubricSurfaceScore {
    const top2 = params.whyFit.slice(0, 2);
    if (top2.length === 0) return { score: 0, note: "No Why You lines present." };
    const groundedCount = top2.filter((line) => {
        const row = params.whyDebug.find((debug) => debug.line_text === line);
        return Boolean(row && Array.isArray(row.supporting_evidence_ids) && row.supporting_evidence_ids.length > 0);
    }).length;
    const collageSignals = top2.filter((line) => {
        const commas = (line.match(/,/g) ?? []).length;
        return commas >= 3 || /(capabilities?|skills?|across multiple)/i.test(line);
    }).length;
    let score: 0 | 1 | 2 = 1;
    if (top2.length >= 2 && groundedCount >= 2 && collageSignals === 0) score = 2;
    if (groundedCount === 0) score = 0;
    return {
        score,
        note: `top2=${top2.length}, grounded=${groundedCount}, collage_signals=${collageSignals}`,
    };
}

function scoreBiggestRisk(riskText: string): RiskScore {
    const text = riskText.trim();
    if (!text) return { score: 0, risk_type: "untyped", note: "No Biggest Risk text present." };
    const riskType = detectRiskType(text);
    const genericWeakness = /(weakness|improve communication|time management|generic gap)/i.test(text);
    let score: 0 | 1 | 2 = 1;
    if (riskType !== "untyped" && !genericWeakness) score = 2;
    if (genericWeakness && riskType === "untyped") score = 0;
    return {
        score,
        risk_type: riskType,
        note: `risk_type=${riskType}${genericWeakness ? "; generic_weakness_signal" : ""}`,
    };
}

function scoreQuickChecks(params: {
    quickChecksText: string;
    quickCheckItems: Array<{ question?: string | null; answer?: string | null }>;
    jobTitle: string;
}): RubricSurfaceScore {
    const unresolved = params.quickCheckItems
        .filter((item) => item && item.answer !== "yes" && item.answer !== "no")
        .map((item) => String(item.question ?? "").trim())
        .filter(Boolean);
    const question = unresolved[0] ?? params.quickChecksText;
    if (!question) return { score: 0, note: "No Quick Check question detected." };
    const normalized = normalizeText(question);
    const words = normalized.split(" ").filter(Boolean);
    const titleTokens = topTokensFromTitle(params.jobTitle);
    const titleOverlap = titleTokens.filter((token) => normalized.includes(token)).length;
    const decisionUtility = /(example|decision|outcome|prove|owned|changed|impact)/.test(normalized);
    const generic = /^do you have /.test(normalized) || /^have you /.test(normalized) || /(leadership work|management work)/.test(normalized);
    let score: 0 | 1 | 2 = 1;
    if (words.length >= 10 && (titleOverlap > 0 || decisionUtility) && !generic) score = 2;
    if (words.length < 6 || generic) score = 0;
    return {
        score,
        note: `question_words=${words.length}, title_overlap=${titleOverlap}, decision_utility=${decisionUtility}, generic=${generic}`,
    };
}

function scoreCta(params: {
    ctaText: string;
    modelBand: string | null | undefined;
    bestPositionLabel: string | null | undefined;
}): RubricSurfaceScore {
    const text = params.ctaText.trim();
    if (!text) return { score: 0, note: "No CTA text present." };
    const normalized = normalizeText(text);
    const band = params.modelBand ?? "weak";
    const readyApply = /ready to apply|generate cv/.test(normalized);
    const confirmFirst = /needs one proof first|confirm one key proof/.test(normalized);
    const deprioritize = /low priority|deprioritize/.test(normalized);
    const hasSpecific = params.bestPositionLabel ? normalizeText(text).includes(normalizeText(params.bestPositionLabel)) : false;
    let alignedState = false;
    if (band === "strong") alignedState = readyApply || confirmFirst;
    if (band === "consider") alignedState = confirmFirst || readyApply;
    if (band === "weak") alignedState = deprioritize || confirmFirst;
    let score: 0 | 1 | 2 = alignedState ? 1 : 0;
    if (alignedState && (hasSpecific || confirmFirst || deprioritize)) score = 2;
    return {
        score,
        note: `band=${band}, ready_apply=${readyApply}, confirm_first=${confirmFirst}, deprioritize=${deprioritize}, specific=${hasSpecific}`,
    };
}

function scoreCrossSurfaceConsistency(params: {
    modelBand: string | null | undefined;
    career: RubricSurfaceScore;
    why: RubricSurfaceScore;
    risk: RiskScore;
    quick: RubricSurfaceScore;
    cta: RubricSurfaceScore;
    ctaText: string;
}): RubricSurfaceScore {
    const normalizedCta = normalizeText(params.ctaText);
    const band = params.modelBand ?? "weak";
    const conflicts: string[] = [];
    if (band === "strong" && /low priority|deprioritize/.test(normalizedCta)) conflicts.push("strong_verdict_vs_deprioritize_cta");
    if (band === "weak" && /ready to apply/.test(normalizedCta)) conflicts.push("weak_verdict_vs_ready_apply_cta");
    if (params.career.score === 2 && params.why.score === 0) conflicts.push("strong_verdict_vs_weak_why");
    if (params.risk.score === 0 && params.quick.score >= 1) conflicts.push("untyped_risk_vs_quickcheck_action");
    if (params.quick.score === 0 && /confirm one key proof|needs one proof first/.test(normalizedCta)) conflicts.push("cta_requires_quickcheck_but_question_weak");
    const score: 0 | 1 | 2 = conflicts.length === 0 ? 2 : conflicts.length === 1 ? 1 : 0;
    return {
        score,
        note: conflicts.length === 0 ? "No major thesis conflicts detected." : `conflicts=${conflicts.join("|")}`,
    };
}

function summarizeWeakestSurface(rubric: CaseRubric): string {
    const pairs: Array<[string, number]> = [
        ["career_verdict", rubric.career_verdict.score],
        ["why_you", rubric.why_you.score],
        ["biggest_risk", rubric.biggest_risk.score],
        ["quick_checks", rubric.quick_checks.score],
        ["cta", rubric.cta.score],
        ["cross_surface_consistency", rubric.cross_surface_consistency.score],
    ];
    pairs.sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]));
    return pairs[0]?.[0] ?? "unknown";
}

function chooseMainNextQuestion(weakestSurface: string): string {
    if (weakestSurface === "career_verdict") {
        return "Which verdict phrasing pattern most improves human-judge alignment without over-claiming?";
    }
    if (weakestSurface === "why_you") {
        return "Where does Why You lose purchase relevance despite having supporting evidence?";
    }
    if (weakestSurface === "biggest_risk") {
        return "Is Biggest Risk being typed as missing/weakly-proven/weakly-surfaced correctly per case?";
    }
    if (weakestSurface === "quick_checks") {
        return "Which quick-check prompts have low decision utility and fail to change verdict posture?";
    }
    if (weakestSurface === "cta") {
        return "Where is CTA not the highest-leverage next action for the same buy-side thesis?";
    }
    return "Where do surfaces disagree on the primary buy-point and confidence posture?";
}

function toRecommendedTargetSurface(weakestSurface: string): string {
    if (weakestSurface === "career_verdict") return "Career Verdict";
    if (weakestSurface === "why_you" || weakestSurface === "biggest_risk") return "Why You / Biggest Risk";
    if (weakestSurface === "quick_checks") return "Quick Checks";
    if (weakestSurface === "cta") return "CTA";
    return "Cross-surface consistency";
}

async function run(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);
    const fixtureById = new Map(fixture.jobs.map((job) => [job.id, job]));
    const selected = CASE_SET.map((item) => {
        const job = fixtureById.get(item.case_id);
        if (!job) throw new Error(`Missing fixture case ${item.case_id}`);
        return { selection: item, job };
    });

    const renderer = createRenderer();
    const cases: Array<Record<string, unknown>> = [];
    const failurePatternCounts = new Map<string, number>();

    for (const entry of selected) {
        const analysis = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: "linkedin",
            jobUrl: `https://north-star-rubric.local/${entry.job.id}`,
            jobTitle: entry.job.title,
            company: entry.job.company ?? null,
            location: null,
            jobDescription: entry.job.job_description,
            topEvidenceLimit: 4,
        });
        const response = analysis.response;
        const diagnostics = response.diagnostics ?? {};
        const whyDebug = diagnostics.insight_debug?.why_fit_debug ?? [];
        const payload = {
            ...response,
            job: {
                jobTitle: analysis.job.jobTitle,
                jobDescriptionSnapshot: analysis.job.jobDescriptionSnapshot,
            },
        };
        const viewModel: any = renderer.toVM(payload);
        const matchHtml = renderer.sum(viewModel);
        const quickHtml = renderer.qc(viewModel);
        const ctaHtml = renderer.cta(viewModel);

        const sidepanel = {
            career_verdict: section(matchHtml, "Career Verdict"),
            why_you: section(matchHtml, "Why You"),
            biggest_risk: section(matchHtml, "Biggest Risk"),
            quick_checks: section(quickHtml, "Confirm One Key Fact"),
            cta: section(ctaHtml, "Recommended Action"),
        };

        const career = scoreCareerVerdict({
            humanLabel: entry.job.human_label,
            modelBand: response.applyRecommendation?.band,
            verdictText: sidepanel.career_verdict || response.verdictText || "",
        });
        const why = scoreWhyYou({
            whyFit: Array.isArray(response.whyFit) ? response.whyFit : [],
            whyDebug,
        });
        const risk = scoreBiggestRisk(sidepanel.biggest_risk || (Array.isArray(response.risks) ? response.risks[0] ?? "" : ""));
        const quick = scoreQuickChecks({
            quickChecksText: sidepanel.quick_checks,
            quickCheckItems: Array.isArray(viewModel?.quickChecks?.items) ? viewModel.quickChecks.items : [],
            jobTitle: entry.job.title,
        });
        const cta = scoreCta({
            ctaText: sidepanel.cta,
            modelBand: response.applyRecommendation?.band,
            bestPositionLabel: viewModel?.matchHeader?.bestPositionLabel ?? null,
        });
        const cross = scoreCrossSurfaceConsistency({
            modelBand: response.applyRecommendation?.band,
            career,
            why,
            risk,
            quick,
            cta,
            ctaText: sidepanel.cta,
        });

        const totalScore = career.score + why.score + risk.score + quick.score + cta.score + cross.score;
        const weakestSurface = summarizeWeakestSurface({
            career_verdict: career,
            why_you: why,
            biggest_risk: risk,
            quick_checks: quick,
            cta,
            cross_surface_consistency: cross,
            total_score: totalScore,
            weakest_surface: "",
            main_next_question: "",
        });
        const rubric: CaseRubric = {
            career_verdict: career,
            why_you: why,
            biggest_risk: risk,
            quick_checks: quick,
            cta,
            cross_surface_consistency: cross,
            total_score: totalScore,
            weakest_surface: weakestSurface,
            main_next_question: chooseMainNextQuestion(weakestSurface),
        };

        const tags: string[] = [];
        if (career.score === 0) tags.push("career_verdict_alignment_or_claim_strength");
        if (why.score <= 1) tags.push("why_you_purchase_relevance_or_grounding");
        if (risk.score <= 1) tags.push("biggest_risk_typing_or_specificity");
        if (quick.score <= 1) tags.push("quick_checks_low_decision_utility");
        if (cta.score <= 1) tags.push("cta_not_high_leverage_or_generic");
        if (cross.score <= 1) tags.push("cross_surface_thesis_mismatch");
        for (const tag of tags) {
            failurePatternCounts.set(tag, (failurePatternCounts.get(tag) ?? 0) + 1);
        }

        cases.push({
            case_id: entry.job.id,
            title: entry.job.title,
            company: entry.job.company ?? null,
            human_label: entry.job.human_label,
            stratum: entry.selection.stratum,
            rationale: entry.selection.rationale,
            model_recommendation_band: response.applyRecommendation?.band ?? null,
            model_recommendation_score: response.applyRecommendation?.score ?? null,
            sidepanel,
            north_star_rubric: rubric,
            failure_tags: tags,
        });
    }

    const surfaceKeys = [
        "career_verdict",
        "why_you",
        "biggest_risk",
        "quick_checks",
        "cta",
        "cross_surface_consistency",
    ] as const;
    const surfaceSummary = surfaceKeys.map((key) => {
        const scores = cases.map((item) => (item.north_star_rubric as CaseRubric)[key].score);
        const avg = scores.reduce((sum, value) => sum + value, 0) / Math.max(1, scores.length);
        const weakCount = scores.filter((value) => value === 0).length;
        return {
            surface: key,
            average_score: Number(avg.toFixed(3)),
            weak_count: weakCount,
        };
    });
    const sortedSurfaceSummary = [...surfaceSummary].sort(
        (left, right) => left.average_score - right.average_score || right.weak_count - left.weak_count || left.surface.localeCompare(right.surface),
    );
    const weakestSurfaceOverall = sortedSurfaceSummary[0]?.surface ?? "unknown";

    const failurePatterns = Array.from(failurePatternCounts.entries())
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((left, right) => right.count - left.count || left.pattern.localeCompare(right.pattern));

    const topPattern = failurePatterns[0];
    const secondPattern = failurePatterns[1];
    const clusteredOwnerShape = topPattern && (!secondPattern || topPattern.count >= secondPattern.count + 2)
        ? "single_surface_owner_cluster"
        : "multi_surface_cluster";

    const recommendedTargetSurface = toRecommendedTargetSurface(weakestSurfaceOverall);
    const recommendedNextActiveLine = `JOB-COPILOT-NS-${recommendedTargetSurface.replace(/[^A-Za-z]+/g, "-").toUpperCase()}`;

    const output = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "substantial audit",
        current_mode: "AUDIT",
        execution_observability: {
            execution_mode: "em_synthesis_over_subagent_outputs",
            dispatched_roles: ["auditor", "verifier", "governor"],
            direct_execution_bypass_reason: null,
        },
        scope_lock: {
            evaluation_only: true,
            explicit_blocked_actions: [
                "no repair",
                "no refactor",
                "no runtime logic changes",
                "no matcher/scoring changes",
                "no wording-only cleanup program",
            ],
        },
        representative_case_set: {
            fixture: args.fixturePath,
            fixture_version: fixture.version,
            case_count: cases.length,
            selection_strategy: "bounded_stratified_sample",
            selection: selected.map((item) => item.selection),
        },
        scoring_scale: SCORE_SCALE,
        cases,
        aggregate: {
            per_surface_summary: sortedSurfaceSummary,
            weakest_surface_overall: weakestSurfaceOverall,
            most_common_failure_patterns: failurePatterns,
            failure_cluster_shape: clusteredOwnerShape,
            recommended_next_active_line: recommendedNextActiveLine,
            recommended_target_surface: recommendedTargetSurface,
            recommended_main_next_question: chooseMainNextQuestion(weakestSurfaceOverall),
        },
        em_decision_contract: {
            failing_layer: "output-quality evaluation layer across buy-side decision surfaces",
            first_drift_point: "weakest rubric surface and recurring failure-pattern cluster in representative case set",
            first_writable_fault: "not isolated in this evaluation-only pass (repair remains blocked)",
            in_scope_correction_area: [
                "audit evaluation only",
                "north star rubric scoring and failure clustering",
            ],
            out_of_scope_areas: [
                "runtime behavior changes",
                "matcher/scoring changes",
                "repair implementation",
                "broad redesign",
            ],
            allowed_files: [
                "diagnosis scripts/artifacts only",
            ],
            proportional_verification_plan: "one bounded representative rubric baseline audit",
            single_main_next_action: "open one diagnosis line for the weakest surface and isolate first writable fault before any repair admission",
            repair_block_posture: "blocked",
        },
        governance: {
            founder_review_required: false,
            automation_should_continue_locally: true,
            artifact_classification: "diagnostic_only",
        },
    };

    const absoluteOut = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
    fs.writeFileSync(absoluteOut, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        out: absoluteOut,
        case_count: cases.length,
        weakest_surface: weakestSurfaceOverall,
        recommended_target_surface: recommendedTargetSurface,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-job-copilot-north-star-rubric-audit] failed", error);
    process.exit(1);
});
