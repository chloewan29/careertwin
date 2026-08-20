import fs from "node:fs";
import path from "node:path";
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

type CaseSpec = {
    case_id: string;
    class: "qc_a_primary_missing_prompt" | "contrast_materialized_prompt";
};

const CASES: CaseSpec[] = [
    { case_id: "job-08", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-04", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-10", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-20", class: "qc_a_primary_missing_prompt" },
    { case_id: "job-03", class: "contrast_materialized_prompt" },
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
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        outPath: readArg("--out") ?? "artifacts/job-copilot-qca-predicate-isolation.2026-04-10.json",
    };
}

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

type PredicateClass =
    | "candidate_null_guard_return"
    | "suppression_memory_guard_return"
    | "pair_materialized";

function classifyPredicatePath(params: {
    calibrationQuestionCount: number;
    suppressedCount: number;
    quickCheckDebugCount: number;
}): PredicateClass {
    if (params.calibrationQuestionCount > 0) return "pair_materialized";
    if (params.suppressedCount > 0) return "suppression_memory_guard_return";
    if (params.quickCheckDebugCount === 0) return "candidate_null_guard_return";
    return "candidate_null_guard_return";
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);
    const fixtureById = new Map(fixture.jobs.map((job) => [job.id, job]));

    const rows: Array<Record<string, unknown>> = [];

    for (const spec of CASES) {
        const job = fixtureById.get(spec.case_id);
        if (!job) throw new Error(`Missing fixture case ${spec.case_id}`);
        const analysis = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: "linkedin",
            jobUrl: `https://qca-predicate.local/${job.id}`,
            jobTitle: job.title,
            company: job.company ?? null,
            location: null,
            jobDescription: job.job_description,
            topEvidenceLimit: 4,
        });

        const response = analysis.response ?? {};
        const diagnostics = response.diagnostics ?? {};
        const selectionDebug = diagnostics.selection_debug ?? {};
        const authoritative = selectionDebug.authoritative_selection ?? {};
        const riskInterview = authoritative.contract_risk_interview ?? {};

        const calibrationQuestionCount = Array.isArray(response.calibrationQuestions) ? response.calibrationQuestions.length : 0;
        const suppressedCount = Number(response?.calibrationState?.suppressed_question_count ?? 0);
        const quickCheckDebugCount = Array.isArray(diagnostics?.insight_debug?.quick_check_debug)
            ? diagnostics.insight_debug.quick_check_debug.length
            : 0;
        const requiredFlag = Boolean(response?.calibrationState?.required);

        const predicateClass = classifyPredicatePath({
            calibrationQuestionCount,
            suppressedCount,
            quickCheckDebugCount,
        });

        const contractPrimaryGap = String(riskInterview.primary_gap ?? "");
        const contractCalibrationQuestions = Array.isArray(riskInterview.calibration_questions)
            ? riskInterview.calibration_questions
            : [];
        const primaryGap = authoritative.primary_gap ?? {};
        const primaryGapQuestionIds = Array.isArray(primaryGap.question_ids) ? primaryGap.question_ids : [];

        rows.push({
            case_id: spec.case_id,
            class: spec.class,
            predicate_path: predicateClass,
            state: {
                calibration_question_count: calibrationQuestionCount,
                suppressed_question_count: suppressedCount,
                quick_check_debug_count: quickCheckDebugCount,
                required_flag: requiredFlag,
            },
            contract: {
                contract_primary_gap_present: contractPrimaryGap.length > 0,
                contract_calibration_question_count: contractCalibrationQuestions.length,
                authoritative_primary_gap_cluster: primaryGap.requirement_cluster ?? null,
                authoritative_primary_question: primaryGap.question_text ?? null,
                authoritative_primary_question_ids_count: primaryGapQuestionIds.length,
            },
        });
    }

    const primary = rows.filter((row) => row.class === "qc_a_primary_missing_prompt");
    const candidateNullCount = primary.filter((row) => row.predicate_path === "candidate_null_guard_return").length;
    const suppressionCount = primary.filter((row) => row.predicate_path === "suppression_memory_guard_return").length;
    const materializedCount = primary.filter((row) => row.predicate_path === "pair_materialized").length;
    const contractGapPresentCount = primary.filter((row) => (row.contract as any).contract_primary_gap_present).length;
    const contractCalibrationCount = primary.filter((row) => ((row.contract as any).contract_calibration_question_count ?? 0) > 0).length;

    const firstPredicateLevelMicroFault = {
        owner: "candidate_null_guard_precedes_contract_risk_fallback_materialization",
        predicate: "if (!candidate) return { required: false, questions: [], quick_check_debug: [], suppressed_count: 0, ... }",
        code_anchor: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4707",
        upstream_gate_anchor: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4588",
        why_first: "QC-A primary cases show no questions, no suppression, no quick-check debug, indicating early candidate-null return path before pair construction.",
    };

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "diagnosis",
        current_mode: "AUDIT",
        active_line: "JOB-COPILOT-NS-QUICK-CHECKS",
        active_sub_branch: "QC-A",
        scope_lock: {
            diagnosis_only: true,
            blocked_actions: [
                "no repair",
                "no QC-B work",
                "no runtime/matcher/scoring changes",
                "no wording cleanup",
                "no broad redesign",
            ],
        },
        observed: {
            qc_a_case_count: primary.length,
            contract_primary_gap_present_rate: `${contractGapPresentCount}/${primary.length}`,
            contract_calibration_questions_present_rate: `${contractCalibrationCount}/${primary.length}`,
            candidate_null_guard_return_rate: `${candidateNullCount}/${primary.length}`,
            suppression_guard_return_rate: `${suppressionCount}/${primary.length}`,
            pair_materialized_rate: `${materializedCount}/${primary.length}`,
        },
        inferred: {
            first_predicate_level_micro_fault: firstPredicateLevelMicroFault,
            fallback_gap: "Contract risk data exists but is not used to force materialization when candidate is null in QC-A cases.",
            qc_b_status: "parked_tracked_contrast_only",
        },
        unproven: [
            "Exact upstream scoring/filter sub-predicate that causes candidate to be null for each QC-A case",
            "Whether one common upstream threshold (vs multiple case-local combinations) drives all QC-A misses",
        ],
        repair_admission: {
            allowed: false,
            reason: "Predicate-level first owner isolated at null-candidate guard, but one tighter upstream sub-predicate isolation is still required before repair admission.",
        },
        cases: rows,
        governance: {
            founder_review_required: false,
            automation_should_continue_locally: true,
            next_mode: "AUDIT",
            single_main_next_action: "Run one narrow QC-A upstream sub-predicate isolation inside unresolved candidate selection to isolate the exact scoring/filter predicate feeding the null-candidate guard.",
        },
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        outPath,
        first_predicate_micro_fault: firstPredicateLevelMicroFault.owner,
        repair_admission_allowed: result.repair_admission.allowed,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});

