import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { getCapabilityMatchV2 } from "@/lib/career-engine/matching/capability-match-v2";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";
import { buildTailoringPlanForCv } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import type { ConfirmationRescoreBridge } from "@/lib/career-engine/job-copilot/strong-match-escalation";
import type { TailoringPlan } from "@/lib/career-engine/copilot/resume-copilot/resume-tailoring-plan";

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

type ScriptArgs = {
    profileId: string;
    fixturePath: string;
    caseIds: string[];
    stageTracePath: string;
    outPath: string;
};

type DebugRow = {
    evidence_id?: string;
    selected?: boolean;
    selected_reason?: string | null;
    suppressed_reason?: string | null;
};

type GuidingCandidate = {
    evidence_id?: string;
    source_reason?: string;
};

const ORDERING_SUPPRESSION_REASONS = new Set([
    "not_selected_after_ranking",
    "reuse_penalty_tiebreak_suppressed",
]);

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

function parseArgs(): ScriptArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        profileId: readArg("--profileId") ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        caseIds: (readArg("--caseIds") ?? "job-10,job-18,job-03").split(",").map((v) => v.trim()).filter(Boolean),
        stageTracePath: readArg("--stageTrace")
            ?? "artifacts/tailored-cv-behavior-audit-role-family.p0-027-pre-rewriter-composition-stage-trace.2026-04-10.json",
        outPath: readArg("--out")
            ?? "artifacts/tailored-cv-behavior-audit-role-family.p0-027-branchA-selector-cluster-internal-trace.2026-04-10.json",
    };
}

function readJson<T>(filePath: string): T {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as T;
}

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return createClient(url, key);
}

async function resolveCareerId(profileId: string): Promise<string> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("careers")
        .select("id")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1);
    if (error || !data?.[0]?.id) {
        throw new Error(`Failed to resolve career for profile ${profileId}: ${error?.message ?? "not found"}`);
    }
    return data[0].id as string;
}

async function ensureDebugJob(params: { fixtureJob: FixtureJob }): Promise<string> {
    const supabase = getSupabaseClient();
    const externalSource = "debug_p0_027_selector_trace";
    const externalId = `fixture:${params.fixtureJob.id}`;
    const { data: upserted, error: upsertError } = await supabase
        .from("jobs")
        .upsert(
            {
                external_source: externalSource,
                external_id: externalId,
                title: params.fixtureJob.title,
                company: params.fixtureJob.company ?? "Validation Fixture",
                location: null,
                description: params.fixtureJob.job_description,
                job_url: null,
            },
            { onConflict: "external_source,external_id" },
        )
        .select("id")
        .limit(1);
    if (upsertError || !upserted?.[0]?.id) {
        throw new Error(`Failed to upsert debug job ${params.fixtureJob.id}: ${upsertError?.message ?? "missing id"}`);
    }
    const jobId = upserted[0].id as string;

    const signals = buildJobSignalsFromRawJd({
        rawJd: params.fixtureJob.job_description,
        fallbackTitle: params.fixtureJob.title,
    });
    const { error: signalError } = await supabase
        .from("job_signals")
        .upsert(
            {
                job_id: jobId,
                target_title: signals.target_title,
                role_family: signals.role_family,
                seniority: signals.seniority,
                required_skills: signals.required_skills,
                preferred_skills: signals.preferred_skills,
                responsibilities: signals.responsibilities,
                domains: signals.domains,
                keywords: signals.keywords,
            },
            { onConflict: "job_id" },
        );
    if (signalError) {
        throw new Error(`Failed to upsert job_signals for ${params.fixtureJob.id}: ${signalError.message}`);
    }

    return jobId;
}

function toStageTraceNonSharedAnchorIds(stageTrace: unknown): string[] {
    const obj = (stageTrace ?? {}) as Record<string, unknown>;
    const reports = Array.isArray(obj.case_reports) ? obj.case_reports as Array<Record<string, unknown>> : [];
    const contrast = reports.find((item) => item.case_id === "job-03");
    if (!contrast) return [];
    const stage1 = Array.isArray(contrast.stage1_lead_experience_selected_evidence)
        ? contrast.stage1_lead_experience_selected_evidence as Array<Record<string, unknown>>
        : [];
    return stage1
        .filter((item) => item.classification === "non_shared" && typeof item.evidence_id === "string")
        .map((item) => item.evidence_id as string);
}

function classifyLossForAnchor(params: {
    anchorEvidenceId: string;
    guidingCandidates: GuidingCandidate[];
    selectionDebugRows: DebugRow[];
}): {
    classification: "guiding_evidence_pool_construction" | "selector_filtering_suppression" | "selector_ordering_winner_selection" | "selected_or_not_lost";
    suppressed_reason: string | null;
    selected_reason: string | null;
} {
    const inGuidingPool = params.guidingCandidates.some((candidate) => candidate.evidence_id === params.anchorEvidenceId);
    if (!inGuidingPool) {
        return {
            classification: "guiding_evidence_pool_construction",
            suppressed_reason: null,
            selected_reason: null,
        };
    }

    const row = params.selectionDebugRows.find((item) => item.evidence_id === params.anchorEvidenceId);
    if (!row) {
        return {
            classification: "selector_filtering_suppression",
            suppressed_reason: "missing_selection_debug_row",
            selected_reason: null,
        };
    }

    if (row.selected) {
        return {
            classification: "selected_or_not_lost",
            suppressed_reason: null,
            selected_reason: row.selected_reason ?? null,
        };
    }

    const suppressedReason = row.suppressed_reason ?? null;
    if (suppressedReason && ORDERING_SUPPRESSION_REASONS.has(suppressedReason)) {
        return {
            classification: "selector_ordering_winner_selection",
            suppressed_reason: suppressedReason,
            selected_reason: row.selected_reason ?? null,
        };
    }
    return {
        classification: "selector_filtering_suppression",
        suppressed_reason: suppressedReason,
        selected_reason: row.selected_reason ?? null,
    };
}

async function run(): Promise<void> {
    loadEnvLocal();
    process.env.ENABLE_RESUME_TAILORING_CANONICAL_ONLY = "1";

    const args = parseArgs();
    const fixture = readJson<Fixture>(args.fixturePath);
    const caseById = new Map(fixture.jobs.map((job) => [job.id, job]));
    const selectedFixtureJobs = args.caseIds.map((id) => caseById.get(id)).filter(Boolean) as FixtureJob[];
    if (selectedFixtureJobs.length !== args.caseIds.length) {
        const foundIds = new Set(selectedFixtureJobs.map((item) => item.id));
        const missing = args.caseIds.filter((id) => !foundIds.has(id));
        throw new Error(`Missing fixture case ids: ${missing.join(", ")}`);
    }

    const stageTrace = readJson<Record<string, unknown>>(args.stageTracePath);
    const anchorIdsFromStageTrace = toStageTraceNonSharedAnchorIds(stageTrace);

    const careerId = await resolveCareerId(args.profileId);
    const careerGraph = await loadCareerGraph(args.profileId);
    const noConfirmationBridge: ConfirmationRescoreBridge = {
        resolved_cluster_ids: [],
        resolved_critical_cluster_ids: [],
        ownership_confirmation: false,
        decision_impact_confirmation: false,
        measurement_confirmation: false,
        capability_score_boost: 0,
        evidence_score_boost: 0,
        requirement_overlap_credit: 0,
        matched_signal_credit: 0,
        specialization_confirmation: false,
    };

    const perCase: Array<Record<string, unknown>> = [];
    const selectedIdsByCase = new Map<string, Set<string>>();

    for (const fixtureJob of selectedFixtureJobs) {
        const jobId = await ensureDebugJob({ fixtureJob });
        const capabilityMatch = await getCapabilityMatchV2({
            careerId,
            profileId: args.profileId,
            jobDescription: fixtureJob.job_description,
            jobTitleHint: fixtureJob.title,
            topSignalsLimit: 4,
        });

        const plan: TailoringPlan = buildTailoringPlanForCv({
            jobId,
            capabilityMatch,
            careerGraph,
            jdRoleStructureContract: null,
            confirmationBridge: noConfirmationBridge,
            confirmedStrengthAreas: [],
            positioningHints: [],
        });

        const selectionDebugRows = (plan.selection_debug?.selected_evidence_debug ?? plan.selection_debug?.selected_evidence ?? []) as DebugRow[];
        const guidingCandidates = (plan.selection_debug?.guiding_pool_debug?.candidates ?? []) as GuidingCandidate[];
        const selectedEvidenceIds = plan.selected_evidence.map((item) => item.evidence_id);
        selectedIdsByCase.set(fixtureJob.id, new Set(selectedEvidenceIds));

        perCase.push({
            fixture_job_id: fixtureJob.id,
            job_id: jobId,
            job_title: fixtureJob.title,
            selected_evidence_ids: selectedEvidenceIds,
            guiding_pool_candidate_ids: guidingCandidates
                .map((candidate) => candidate.evidence_id)
                .filter((value): value is string => typeof value === "string"),
            selection_debug_rows: selectionDebugRows,
        });
    }

    const branchAIds = ["job-10", "job-18"];
    const contrastId = "job-03";
    const derivedAnchorIds = (() => {
        const contrastSet = selectedIdsByCase.get(contrastId) ?? new Set<string>();
        const branchASet = new Set<string>();
        for (const id of branchAIds) {
            for (const evidenceId of selectedIdsByCase.get(id) ?? new Set<string>()) {
                branchASet.add(evidenceId);
            }
        }
        return Array.from(contrastSet).filter((id) => !branchASet.has(id));
    })();
    const nonSharedAnchorIds = Array.from(new Set([
        ...anchorIdsFromStageTrace,
        ...derivedAnchorIds,
    ]));

    const branchAAnalysis = branchAIds.map((caseId) => {
        const caseRow = perCase.find((item) => item.fixture_job_id === caseId) as Record<string, unknown> | undefined;
        if (!caseRow) {
            return {
                fixture_job_id: caseId,
                first_candidate_level_loss_stage: "missing_case_row",
                anchor_traces: [],
            };
        }
        const guidingCandidates = ((caseRow.guiding_pool_candidate_ids ?? []) as string[]).map((id) => ({ evidence_id: id })) as GuidingCandidate[];
        const selectionDebugRows = (caseRow.selection_debug_rows ?? []) as DebugRow[];
        const anchorTraces = nonSharedAnchorIds.map((anchorEvidenceId) => {
            const trace = classifyLossForAnchor({
                anchorEvidenceId,
                guidingCandidates,
                selectionDebugRows,
            });
            return {
                anchor_evidence_id: anchorEvidenceId,
                ...trace,
            };
        });
        const firstCandidateLevelLossStage = anchorTraces.some((item) => item.classification === "guiding_evidence_pool_construction")
            ? "guiding_evidence_pool_construction"
            : anchorTraces.some((item) => item.classification === "selector_filtering_suppression")
                ? "selector_filtering_suppression"
                : anchorTraces.some((item) => item.classification === "selector_ordering_winner_selection")
                    ? "selector_ordering_winner_selection"
                    : "not_observed";
        return {
            fixture_job_id: caseId,
            first_candidate_level_loss_stage: firstCandidateLevelLossStage,
            anchor_traces: anchorTraces,
        };
    });

    const output = {
        generated_at: new Date().toISOString(),
        task_type: "diagnosis",
        mode: "AUDIT",
        active_line: "QUEUE-P0-027",
        branch_scope: {
            active_branch: "Branch A",
            branch_a_cases: branchAIds,
            contrast_only_case: contrastId,
        },
        sources: {
            fixture: args.fixturePath,
            stage_trace: args.stageTracePath,
            selector_cluster_file: "lib/career-engine/job-copilot/backend/job-copilot-service.ts",
        },
        selector_cluster: {
            buildGuidingEvidencePool_line_anchor: 1177,
            selectEvidenceForScenario_line_anchor: 2765,
        },
        non_shared_anchor_ids: nonSharedAnchorIds,
        per_case: perCase,
        branch_a_internal_trace: branchAAnalysis,
    };

    const absoluteOut = path.isAbsolute(args.outPath)
        ? args.outPath
        : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
    fs.writeFileSync(absoluteOut, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(absoluteOut);
}

run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});

