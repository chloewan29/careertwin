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

type Args = {
    profileId: string;
    fixturePath: string;
    outPath: string;
};

type CaseRow = {
    case_id: string;
    class: "qc_a_primary_missing_prompt" | "contrast_materialized_prompt";
};

const CASES: CaseRow[] = [
    { case_id: "job-08", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-04", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-10", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-20", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-03", class: "contrast_materialized_prompt" },
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
        outPath: readArg("--out") ?? "artifacts/job-copilot-qca-missing-prompt-diagnosis.2026-04-10.json",
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
        "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
    ]) {
        new vm.Script(fs.readFileSync(path.join(process.cwd(), file), "utf8"), { filename: file }).runInContext(context);
    }
    const g = globalThis as Record<string, any>;
    return {
        toViewModel: g.CareerTwinRenderMatchViewModel.toMatchPanelViewModel as (payload: Record<string, any>) => Record<string, any>,
        renderQuickChecks: g.CareerTwinRenderQuickChecks.renderQuickChecks as (viewModel: Record<string, any>) => string,
    };
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);
    const fixtureById = new Map(fixture.jobs.map((job) => [job.id, job]));
    const renderer = createRenderer();

    const rows = [];
    for (const spec of CASES) {
        const job = fixtureById.get(spec.case_id);
        if (!job) throw new Error(`Missing fixture case ${spec.case_id}`);
        const analysis = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: "linkedin",
            jobUrl: `https://qca-diagnosis.local/${job.id}`,
            jobTitle: job.title,
            company: job.company ?? null,
            location: null,
            jobDescription: job.job_description,
            topEvidenceLimit: 4,
        });
        const response = analysis.response ?? {};
        const diagnostics = response.diagnostics ?? {};
        const authoritative = diagnostics.selection_debug?.authoritative_selection ?? {};
        const riskInterview = authoritative.contract_risk_interview ?? {};
        const calibrationQuestions = Array.isArray(response.calibrationQuestions) ? response.calibrationQuestions : [];

        const payload = {
            ...response,
            job: {
                jobTitle: analysis.job?.jobTitle ?? job.title,
                jobDescriptionSnapshot: analysis.job?.jobDescriptionSnapshot ?? job.job_description,
            },
        };
        const viewModel = renderer.toViewModel(payload);
        const quickHtml = renderer.renderQuickChecks(viewModel);
        const quickChecksText = section(quickHtml, "Confirm One Key Fact");

        const contractPrimaryGap = String(riskInterview.primary_gap ?? "");
        const contractCalibrationQuestions = Array.isArray(riskInterview.calibration_questions)
            ? riskInterview.calibration_questions
            : [];
        const contractQuickCheckFocus = Array.isArray(riskInterview.quick_check_focus)
            ? riskInterview.quick_check_focus
            : [];
        const authoritativePrimaryGapCluster = String(authoritative.primary_gap?.requirement_cluster ?? "");
        const authoritativePrimaryQuestion = String(authoritative.primary_gap?.question_text ?? "");

        rows.push({
            case_id: job.id,
            class: spec.class,
            apply_recommendation: response.applyRecommendation ?? null,
            cta_state: authoritative.recommendation?.cta_state ?? null,
            quick_check_materialization: {
                calibration_question_count: calibrationQuestions.length,
                suppressed_question_count: Number(response?.calibration?.suppressed_question_count ?? 0),
                rendered_quick_check_present: quickChecksText.length > 0,
            },
            authoritative_contract: {
                contract_primary_gap_present: contractPrimaryGap.length > 0,
                contract_primary_gap: contractPrimaryGap || null,
                contract_calibration_question_count: contractCalibrationQuestions.length,
                contract_quick_check_focus_count: contractQuickCheckFocus.length,
                authoritative_primary_gap_cluster: authoritativePrimaryGapCluster || null,
                authoritative_primary_question: authoritativePrimaryQuestion || null,
            },
            debug_counts: {
                insight_quick_check_debug_count: Array.isArray(diagnostics?.insight_debug?.quick_check_debug)
                    ? diagnostics.insight_debug.quick_check_debug.length
                    : 0,
            },
        });
    }

    const primary = rows.filter((row) => row.class === "qc_a_primary_missing_prompt");
    const withContractGap = primary.filter((row) => row.authoritative_contract.contract_primary_gap_present).length;
    const withNoQuestions = primary.filter((row) => row.quick_check_materialization.calibration_question_count === 0).length;
    const withNoSuppression = primary.filter((row) => row.quick_check_materialization.suppressed_question_count === 0).length;
    const withNoRenderedSection = primary.filter((row) => !row.quick_check_materialization.rendered_quick_check_present).length;
    const withEmptyAuthoritativeCluster = primary.filter((row) => !row.authoritative_contract.authoritative_primary_gap_cluster).length;
    const withContractCalibrationButNoMaterialization = primary.filter((row) =>
        row.authoritative_contract.contract_calibration_question_count > 0
        && row.quick_check_materialization.calibration_question_count === 0).length;

    const observed = {
        qc_a_primary_case_count: primary.length,
        contract_gap_present_rate: `${withContractGap}/${primary.length}`,
        no_calibration_questions_rate: `${withNoQuestions}/${primary.length}`,
        no_suppression_rate: `${withNoSuppression}/${primary.length}`,
        no_rendered_quick_check_rate: `${withNoRenderedSection}/${primary.length}`,
        empty_authoritative_primary_gap_cluster_rate: `${withEmptyAuthoritativeCluster}/${primary.length}`,
        contract_calibration_present_but_not_materialized_rate: `${withContractCalibrationButNoMaterialization}/${primary.length}`,
    };

    const firstMicroFaultOwner = {
        owner_family: "unresolved_buy_point_selection_failure_with_contract_risk_linkage_fallback_gap",
        owner_candidate_from_prompt: "unresolved buy-point selection failure",
        bounded_rule: "buildRoleContextQuickChecks returns required=false when no unresolved candidate is selected, without a contract-primary-gap materialization fallback.",
        code_anchors: [
            "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4588",
            "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4692",
            "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4707",
        ],
    };

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "diagnosis",
        current_mode: "AUDIT",
        active_line: "JOB-COPILOT-NS-QUICK-CHECKS",
        branch_scope: "QC-A only",
        scope_lock: {
            diagnosis_only: true,
            blocked_actions: [
                "no repair",
                "no QC-B work except minimal contrast",
                "no runtime/matcher/scoring changes",
                "no wording cleanup",
                "no broad redesign",
            ],
        },
        observed,
        inferred: {
            first_drift_point: "QC-A materialization loss occurs before question generation templates, at unresolved candidate selection/materialization gate.",
            first_micro_fault_owner: firstMicroFaultOwner,
            not_first_owner: [
                "Layer 4 rendering (already checked; no materialized question to render in QC-A primary cases)",
                "QC-B generic template branch (parked/tracked)",
            ],
        },
        unproven: [
            "Single parameter-level threshold inside unresolved filters not yet isolated",
            "Whether contract_calibration_questions should always guarantee materialization in all role families",
        ],
        repair_admission: {
            allowed: false,
            reason: "QC-A owner is isolated at micro-surface cluster level, but one tighter subrule isolation pass is still required before repair admission.",
        },
        branch_management: {
            qc_b_status: "parked_tracked_contrast_only",
        },
        cases: rows,
        governance: {
            founder_review_required: false,
            automation_should_continue_locally: true,
            next_mode: "AUDIT",
            single_main_next_action: "Run one narrow QC-A micro-subrule isolation inside buildRoleContextQuickChecks candidate-materialization gate.",
        },
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ outPath, first_micro_fault_owner: firstMicroFaultOwner.owner_candidate_from_prompt }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
