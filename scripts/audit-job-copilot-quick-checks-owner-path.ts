import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type FixtureJob = {
    id: string;
    title: string;
    company?: string | null;
    job_description: string;
};

type Fixture = {
    version: string;
    jobs: FixtureJob[];
};

type CaseId = "job-01" | "job-08" | "job-04" | "job-10" | "job-14" | "job-20" | "job-03" | "job-18";

type Args = {
    profileId: string;
    fixturePath: string;
    outPath: string;
};

type CalibrationQuestion = {
    id: string;
    question: string;
    requirement_cluster?: string;
    source_requirement_id?: string;
    target_area?: string;
};

type AnalyzeLike = Record<string, any>;

const CASE_SET: CaseId[] = [
    "job-01",
    "job-08",
    "job-04",
    "job-10",
    "job-14",
    "job-20",
    "job-03",
    "job-18",
];

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
        outPath: readArg("--out") ?? "artifacts/job-copilot-ns-quick-checks-owner-path-diagnosis.2026-04-10.json",
    };
}

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

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenOverlap(left: string, right: string): number {
    const leftTokens = new Set(normalizeText(left).split(" ").filter((token) => token.length >= 4));
    const rightTokens = new Set(normalizeText(right).split(" ").filter((token) => token.length >= 4));
    if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
    let shared = 0;
    for (const token of leftTokens) {
        if (rightTokens.has(token)) shared += 1;
    }
    return shared / Math.max(leftTokens.size, rightTokens.size);
}

function clusterEqual(left: string, right: string): boolean {
    if (!left || !right) return false;
    return normalizeText(left.replace(/[_-]+/g, " ")) === normalizeText(right.replace(/[_-]+/g, " "));
}

function isGenericQuickCheckQuestion(value: string): boolean {
    const text = normalizeText(value);
    if (!text) return true;
    return (
        /have you directly led/.test(text)
        || /rather than only supporting/.test(text)
        || /did you own the recommendation delivery or stakeholder alignment end to end/.test(text)
        || /^have you delivered .* in a similar operating context/.test(text)
        || /^did those recommendations influence priorities action or decision making/.test(text)
        || /^did the results influence budget rollout optimization or strategic decisions/.test(text)
    );
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

function firstRenderedQuestion(html: string): string {
    const match = html.match(/<p class="ctsp-item-label">([\s\S]*?)<\/p>/i);
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
        "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
    ]) {
        new vm.Script(fs.readFileSync(path.join(process.cwd(), file), "utf8"), { filename: file }).runInContext(context);
    }
    const g = globalThis as Record<string, any>;
    return {
        toViewModel: g.CareerTwinRenderMatchViewModel.toMatchPanelViewModel as (payload: AnalyzeLike) => Record<string, unknown>,
        renderQuickChecks: g.CareerTwinRenderQuickChecks.renderQuickChecks as (viewModel: Record<string, unknown>) => string,
    };
}

function toCalibrationQuestions(payload: AnalyzeLike): CalibrationQuestion[] {
    const rows = Array.isArray(payload?.calibrationQuestions) ? payload.calibrationQuestions : [];
    return rows
        .filter((item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.question === "string")
        .map((item) => ({
            id: item.id,
            question: item.question,
            requirement_cluster: item.requirement_cluster ?? item.requirementCluster ?? item.source_requirement_id ?? item.sourceRequirementId,
            source_requirement_id: item.source_requirement_id ?? item.sourceRequirementId,
            target_area: item.target_area ?? item.targetArea,
        }));
}

function firstDriftForCase(params: {
    hasQuestions: boolean;
    suppressedCount: number;
    unresolvedTargetAligned: boolean;
    riskLinked: boolean;
    rawGeneric: boolean;
    renderMutated: boolean;
    answerImpactMeaningful: boolean;
}): string {
    if (!params.hasQuestions && params.suppressedCount > 0) {
        return "stage_question_materialization_suppressed_before_user_prompt";
    }
    if (!params.unresolvedTargetAligned || !params.riskLinked) {
        return "stage_unresolved_buy_point_selection_or_risk_linkage";
    }
    if (params.rawGeneric) {
        return "stage_question_generation_shaping_generic_template";
    }
    if (params.renderMutated) {
        return "stage_downstream_rendering_transformation";
    }
    if (!params.answerImpactMeaningful) {
        return "stage_decision_coupling_weak_after_answer";
    }
    return "no_drift_detected";
}

async function analyzeCase(params: {
    job: FixtureJob;
    profileId: string;
    renderer: ReturnType<typeof createRenderer>;
}) {
    const base = await analyzeJobForCopilot({
        profileId: params.profileId,
        source: "linkedin",
        jobUrl: `https://quick-check-owner-path.local/${params.job.id}`,
        jobTitle: params.job.title,
        company: params.job.company ?? null,
        location: null,
        jobDescription: params.job.job_description,
        topEvidenceLimit: 4,
    });
    const response = base.response ?? {};
    const diagnostics = response.diagnostics ?? {};
    const authoritativeSelection = diagnostics.selection_debug?.authoritative_selection ?? {};
    const questions = toCalibrationQuestions(response);
    const firstQuestion = questions[0] ?? null;
    const payload = {
        ...response,
        job: {
            jobTitle: base.job?.jobTitle,
            jobDescriptionSnapshot: base.job?.jobDescriptionSnapshot,
        },
    };
    const baseViewModel = params.renderer.toViewModel(payload);
    const quickHtml = params.renderer.renderQuickChecks(baseViewModel);
    const quickSectionText = section(quickHtml, "Confirm One Key Fact");
    const renderedFirst = firstRenderedQuestion(quickHtml);

    const primaryGapCluster = String(authoritativeSelection?.primary_gap?.requirement_cluster ?? "");
    const contractPrimaryGap = String(authoritativeSelection?.contract_risk_interview?.primary_gap ?? "");
    const questionCluster = String(firstQuestion?.requirement_cluster ?? firstQuestion?.source_requirement_id ?? "");
    const targetArea = String(firstQuestion?.target_area ?? "");

    const unresolvedTargetAligned = questions.length > 0
        ? (clusterEqual(primaryGapCluster, questionCluster) || tokenOverlap(contractPrimaryGap, targetArea) >= 0.2)
        : false;
    const riskLinked = questions.length > 0
        ? (tokenOverlap(contractPrimaryGap, targetArea) >= 0.2 || clusterEqual(primaryGapCluster, questionCluster))
        : false;

    const rawGeneric = firstQuestion ? isGenericQuickCheckQuestion(firstQuestion.question) : false;
    const renderMutated = firstQuestion
        ? normalizeText(firstQuestion.question) !== normalizeText(renderedFirst)
        : false;
    const renderedGeneric = renderedFirst ? isGenericQuickCheckQuestion(renderedFirst) : false;

    const suppressedCount = Number(response?.calibration?.suppressed_question_count ?? 0);

    let answerImpact = {
        score_delta: 0,
        band_changed: false,
        cta_changed: false,
        risk_changed: false,
        meaningful: false,
    };

    if (questions.length > 0) {
        const yesAnswers = questions.slice(0, 2).map((question) => ({
            question_id: question.id,
            answer: "yes" as const,
        }));
        const withYes = await analyzeJobForCopilot({
            profileId: params.profileId,
            source: "linkedin",
            jobUrl: `https://quick-check-owner-path.local/${params.job.id}`,
            jobTitle: params.job.title,
            company: params.job.company ?? null,
            location: null,
            jobDescription: params.job.job_description,
            topEvidenceLimit: 4,
            calibrationAnswers: yesAnswers,
        });
        const withYesResponse = withYes.response ?? {};
        const withYesAuthoritativeSelection = withYesResponse?.diagnostics?.selection_debug?.authoritative_selection ?? {};
        const scoreBase = Number(response?.applyRecommendation?.score ?? 0);
        const scoreYes = Number(withYesResponse?.applyRecommendation?.score ?? 0);
        const bandBase = String(response?.applyRecommendation?.band ?? "");
        const bandYes = String(withYesResponse?.applyRecommendation?.band ?? "");
        const ctaBase = String(authoritativeSelection?.recommendation?.cta_state ?? "");
        const ctaYes = String(withYesAuthoritativeSelection?.recommendation?.cta_state ?? "");
        const riskBase = String(authoritativeSelection?.contract_risk_interview?.primary_gap ?? "");
        const riskYes = String(withYesAuthoritativeSelection?.contract_risk_interview?.primary_gap ?? "");
        const scoreDelta = scoreYes - scoreBase;
        const bandChanged = bandBase !== bandYes;
        const ctaChanged = ctaBase !== ctaYes;
        const riskChanged = normalizeText(riskBase) !== normalizeText(riskYes);
        const meaningful = Math.abs(scoreDelta) >= 3 || bandChanged || ctaChanged || riskChanged;
        answerImpact = {
            score_delta: scoreDelta,
            band_changed: bandChanged,
            cta_changed: ctaChanged,
            risk_changed: riskChanged,
            meaningful,
        };
    }

    const driftStage = firstDriftForCase({
        hasQuestions: questions.length > 0,
        suppressedCount,
        unresolvedTargetAligned,
        riskLinked,
        rawGeneric,
        renderMutated,
        answerImpactMeaningful: answerImpact.meaningful,
    });

    return {
        case_id: params.job.id,
        title: params.job.title,
        quick_check_presence: {
            question_count: questions.length,
            suppressed_count: suppressedCount,
            rendered_section_present: quickSectionText.length > 0,
        },
        linkage: {
            unresolved_target_aligned: unresolvedTargetAligned,
            risk_linked: riskLinked,
            primary_gap_cluster: primaryGapCluster || null,
            question_cluster: questionCluster || null,
            contract_primary_gap: contractPrimaryGap || null,
            question_target_area: targetArea || null,
        },
        generation: {
            raw_first_question: firstQuestion?.question ?? null,
            raw_generic_template: rawGeneric,
            rendered_first_question: renderedFirst || null,
            rendered_generic_template: renderedGeneric,
            rendering_mutated_question_text: renderMutated,
        },
        answer_impact: answerImpact,
        first_drift_stage: driftStage,
    };
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);
    const renderer = createRenderer();

    const jobs = CASE_SET.map((id) => fixture.jobs.find((job) => job.id === id)).filter(Boolean) as FixtureJob[];
    if (jobs.length !== CASE_SET.length) {
        throw new Error(`Missing fixture jobs for case set. found=${jobs.length} expected=${CASE_SET.length}`);
    }

    const caseResults = [];
    for (const job of jobs) {
        // diagnosis-only trace, one case at a time for deterministic logs.
        caseResults.push(await analyzeCase({ job, profileId: args.profileId, renderer }));
    }

    const total = caseResults.length;
    const unresolvedAlignedCount = caseResults.filter((item) => item.linkage.unresolved_target_aligned).length;
    const riskLinkedCount = caseResults.filter((item) => item.linkage.risk_linked).length;
    const missingPromptCount = caseResults.filter((item) => item.quick_check_presence.question_count === 0).length;
    const suppressedPromptCount = caseResults.filter((item) => item.quick_check_presence.suppressed_count > 0).length;
    const genericQuestionCount = caseResults.filter((item) => item.generation.raw_generic_template).length;
    const renderedMutationCount = caseResults.filter((item) => item.generation.rendering_mutated_question_text).length;
    const meaningfulImpactCount = caseResults.filter((item) => item.answer_impact.meaningful).length;

    const driftCounts = new Map<string, number>();
    for (const item of caseResults) {
        driftCounts.set(item.first_drift_stage, (driftCounts.get(item.first_drift_stage) ?? 0) + 1);
    }
    const dominantDrift = [...driftCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

    const mainOwner = (
        dominantDrift === "stage_question_generation_shaping_generic_template"
        || dominantDrift === "stage_question_materialization_suppressed_before_user_prompt"
    )
        ? "question_generation_shaping"
        : dominantDrift === "stage_unresolved_buy_point_selection_or_risk_linkage"
            ? "unresolved_buy_point_selection_or_risk_linkage"
            : dominantDrift === "stage_downstream_rendering_transformation"
                ? "downstream_rendering"
                : "decision_coupling";

    const firstWritableSurface = mainOwner === "question_generation_shaping"
        ? {
            file: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts",
            anchors: [
                "buildRoleContextQuickChecks",
                "buildProgressiveQuickCheckPair",
                "shouldSuppress suppression-memory gate",
            ],
        }
        : mainOwner === "downstream_rendering"
            ? {
                file: "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
                anchors: [
                    "toRoleShapedQuestion",
                ],
            }
            : mainOwner === "unresolved_buy_point_selection_or_risk_linkage"
                ? {
                    file: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts",
                    anchors: [
                        "buildRoleContextQuickChecks unresolved candidate ranking",
                    ],
                }
                : {
                    file: "lib/career-engine/job-copilot/backend/job-copilot-service.ts",
                    anchors: [
                        "applyCalibrationAnswers / recommendation coupling",
                        "buildAuthoritativeSelectionContract recommendation cta_state fallback",
                    ],
                };

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "diagnosis",
        current_mode: "AUDIT",
        scope_lock: {
            diagnosis_only: true,
            blocked_actions: [
                "no repair",
                "no runtime logic changes",
                "no matcher/scoring changes",
                "no wording cleanup",
                "no broad redesign",
            ],
        },
        line_opened: "JOB-COPILOT-NS-QUICK-CHECKS",
        case_set: CASE_SET,
        findings: {
            unresolved_target_alignment_rate: `${unresolvedAlignedCount}/${total}`,
            risk_linkage_rate: `${riskLinkedCount}/${total}`,
            missing_prompt_rate: `${missingPromptCount}/${total}`,
            suppression_trigger_rate: `${suppressedPromptCount}/${total}`,
            generic_raw_question_rate: `${genericQuestionCount}/${total}`,
            rendering_mutation_rate: `${renderedMutationCount}/${total}`,
            meaningful_answer_impact_rate: `${meaningfulImpactCount}/${total}`,
            dominant_first_drift_stage: dominantDrift,
            dominant_owner_family: mainOwner,
        },
        first_drift_point: dominantDrift,
        first_writable_fault: {
            owner_family: mainOwner,
            writable_surface: firstWritableSurface,
            confidence: "medium",
        },
        repair_admission: {
            allowed: false,
            reason: "diagnosis isolated dominant owner path, but no repair step requested/admitted in this task",
        },
        case_diagnostics: caseResults,
        governance: {
            founder_review_required: false,
            automation_should_continue_locally: true,
            next_mode: "AUDIT",
            single_main_next_action: "Run one narrow micro-fault isolation pass inside the identified first writable surface before repair admission.",
        },
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

    console.log(JSON.stringify({
        outPath,
        dominant_first_drift_stage: result.first_drift_point,
        dominant_owner_family: result.first_writable_fault.owner_family,
        repair_admission_allowed: result.repair_admission.allowed,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
