import fs from "node:fs";
import path from "node:path";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type Fixture = {
    jobs: Array<{
        id: string;
        title: string;
        company?: string | null;
        job_description: string;
    }>;
};

type Args = {
    profileId: string;
    fixturePath: string;
    outPath: string;
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
        outPath: readArg("--out") ?? "artifacts/job-copilot-qca-upstream-subpredicate-isolation.2026-04-10.json",
    };
}

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

async function analyzeCase(params: {
    profileId: string;
    fixture: Fixture;
    caseId: string;
    className: "primary_missing_prompt" | "contrast_materialized";
}) {
    const job = params.fixture.jobs.find((item) => item.id === params.caseId);
    if (!job) throw new Error(`Missing fixture case ${params.caseId}`);
    const analysis = await analyzeJobForCopilot({
        profileId: params.profileId,
        source: "linkedin",
        jobUrl: `https://qca-subpredicate.local/${job.id}`,
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
    const primaryGap = authoritative.primary_gap ?? {};
    const contractRiskInterview = authoritative.contract_risk_interview ?? {};

    const calibrationQuestionCount = Array.isArray(response.calibrationQuestions) ? response.calibrationQuestions.length : 0;
    const quickCheckDebugCount = Array.isArray(diagnostics?.insight_debug?.quick_check_debug)
        ? diagnostics.insight_debug.quick_check_debug.length
        : 0;
    const suppressedQuestionCount = Number(response?.job_analysis?.calibration?.suppressed_question_count ?? 0);
    const requiredFlag = Boolean(response?.job_analysis?.calibration?.required);

    const firstPredicate = calibrationQuestionCount > 0
        ? "pair_materialized"
        : suppressedQuestionCount > 0
            ? "suppression_memory_guard_return"
            : "candidate_null_guard_return";

    return {
        case_id: params.caseId,
        class: params.className,
        observed: {
            contract_primary_gap_present: Boolean(contractRiskInterview?.primary_gap),
            contract_calibration_questions_present: Array.isArray(contractRiskInterview?.calibration_questions)
                && contractRiskInterview.calibration_questions.length > 0,
            calibration_question_count: calibrationQuestionCount,
            quick_check_debug_count: quickCheckDebugCount,
            suppressed_question_count: suppressedQuestionCount,
            required_flag: requiredFlag,
            authoritative_primary_gap_cluster: primaryGap.requirement_cluster ?? null,
            authoritative_primary_gap_question_ids_count: Array.isArray(primaryGap.question_ids) ? primaryGap.question_ids.length : 0,
        },
        first_predicate_path: firstPredicate,
    };
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);

    const primary = await analyzeCase({
        profileId: args.profileId,
        fixture,
        caseId: "job-08",
        className: "primary_missing_prompt",
    });
    const contrast = await analyzeCase({
        profileId: args.profileId,
        fixture,
        caseId: "job-03",
        className: "contrast_materialized",
    });

    const firstMicroFault = primary.first_predicate_path === "suppression_memory_guard_return"
        ? {
            owner: "suppression_memory_guard_preempts_materialization",
            predicate: "shouldSuppress(...) => true",
            code_anchor: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4780",
            sub_predicates: [
                "memory.source === quick_check_confirmation",
                "memory.confidence === self_declared",
                "memory.strength >= 0.6",
                "clustersAligned(memory.requirement_cluster, candidate.cluster_id)",
                "tagOverlap(memory.capability_tags, capabilityTags) > 0",
            ],
        }
        : {
            owner: "candidate_null_guard_precedes_materialization",
            predicate: "if (!candidate) return required:false",
            code_anchor: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4707",
            sub_predicates: [
                "selectedShape/frame/preferred/unresolved candidate chains all empty",
            ],
        };

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "diagnosis",
        current_mode: "AUDIT",
        active_line: "JOB-COPILOT-NS-QUICK-CHECKS",
        active_sub_branch: "QC-A",
        case_packet: {
            primary: "job-08",
            contrast: "job-03",
        },
        one_main_finding: firstMicroFault,
        one_unresolved_competing_hypothesis: "Unresolved candidate-null path may still occur in other QC-A cases, but this primary pass shows suppression-memory guard as first predicate owner.",
        one_next_question_or_gate_decision: "Gate decision: keep repair blocked; next audit should isolate which suppression-memory sub-predicate (cluster align vs tag overlap) is over-firing for QC-A primary cases.",
        repair_admission_allowed: false,
        cases: [primary, contrast],
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ outPath, repair_admission_allowed: false, owner: firstMicroFault.owner }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});

