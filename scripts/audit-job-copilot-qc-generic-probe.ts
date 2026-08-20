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

const CASE_SET = ["job-01", "job-14", "job-03", "job-18"] as const;

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
        outPath: readArg("--out") ?? `artifacts/job-copilot-ns-quick-checks-generic-probe-audit.${new Date().toISOString().replace(/[:]/g, "-")}.json`,
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

function normalize(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isTemplateLike(text: string): boolean {
    const v = normalize(text);
    return (
        /^have you directly led /.test(v)
        || /rather than only supporting it/.test(v)
        || /^did you own the recommendation delivery or stakeholder alignment for .* end to end$/.test(v)
        || /^have you delivered .* in a similar operating context$/.test(v)
        || /^did those .* recommendations influence priorities action or decision making$/.test(v)
    );
}

function skeletonize(text: string, buyPoint: string): string {
    const bp = buyPoint.trim();
    if (!bp) return normalize(text);
    const escaped = bp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return normalize(text.replace(new RegExp(escaped, "gi"), "{{buy_point}}"));
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);

    const rows = [];

    for (const caseId of CASE_SET) {
        const job = fixture.jobs.find((item) => item.id === caseId);
        if (!job) throw new Error(`Missing fixture case ${caseId}`);

        const base = await analyzeJobForCopilot({
            profileId: args.profileId,
            source: "linkedin",
            jobUrl: `https://qc-generic-probe.local/${caseId}`,
            jobTitle: job.title,
            company: job.company ?? null,
            location: null,
            jobDescription: job.job_description,
            topEvidenceLimit: 4,
        });

        const response = (base.response ?? {}) as Record<string, any>;
        const diagnostics = (response.diagnostics ?? {}) as Record<string, any>;
        const insightDebug = (diagnostics.insight_debug ?? {}) as Record<string, any>;
        const selectionDebug = (diagnostics.selection_debug ?? {}) as Record<string, any>;
        const authoritative = (selectionDebug.authoritative_selection ?? {}) as Record<string, any>;
        const riskInterview = (authoritative.contract_risk_interview ?? {}) as Record<string, any>;

        const qs = Array.isArray(response.calibrationQuestions) ? response.calibrationQuestions : [];
        const q1 = qs[0] ?? null;
        const q2 = qs[1] ?? null;
        const quickDebug = Array.isArray(insightDebug.quick_check_debug) ? insightDebug.quick_check_debug : [];
        const dbg0 = quickDebug[0] ?? null;

        const q1Text = typeof q1?.question === "string" ? q1.question : "";
        const q2Text = typeof q2?.question === "string" ? q2.question : "";
        const buyPointPayload = typeof dbg0?.buy_point_payload_text === "string" ? dbg0.buy_point_payload_text : "";
        const q1Skeleton = skeletonize(q1Text, buyPointPayload);
        const q2Skeleton = skeletonize(q2Text, buyPointPayload);

        let answerImpactMeaningful = false;
        if (qs.length > 0) {
            const answers = qs.slice(0, 2).map((q: any) => ({
                question_id: q.id as string,
                answer: "yes" as const,
            }));
            const replay = await analyzeJobForCopilot({
                profileId: args.profileId,
                source: "linkedin",
                jobUrl: `https://qc-generic-probe.local/${caseId}`,
                jobTitle: job.title,
                company: job.company ?? null,
                location: null,
                jobDescription: job.job_description,
                topEvidenceLimit: 4,
                calibrationAnswers: answers,
            });
            const baseRecommendation = response.applyRecommendation ?? {};
            const replayResponse = (replay.response ?? {}) as Record<string, any>;
            const replayRecommendation = replayResponse.applyRecommendation ?? {};
            const baseSelection = (response.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
            const replaySelection = (replayResponse.diagnostics?.selection_debug?.authoritative_selection ?? {}) as Record<string, any>;
            const baseRisk = normalize(String(baseSelection?.contract_risk_interview?.primary_gap ?? ""));
            const replayRisk = normalize(String(replaySelection?.contract_risk_interview?.primary_gap ?? ""));

            const scoreDelta = Number(replayRecommendation?.score ?? 0) - Number(baseRecommendation?.score ?? 0);
            const bandChanged = String(baseRecommendation?.band ?? "") !== String(replayRecommendation?.band ?? "");
            const ctaChanged = String(baseSelection?.recommendation?.cta_state ?? "") !== String(replaySelection?.recommendation?.cta_state ?? "");
            const riskChanged = baseRisk !== replayRisk;
            answerImpactMeaningful = Math.abs(scoreDelta) >= 3 || bandChanged || ctaChanged || riskChanged;
        }

        rows.push({
            case_id: caseId,
            question_materialized: qs.length > 0,
            template_like: isTemplateLike(q1Text),
            meaningful_answer_impact: answerImpactMeaningful,
            contract_primary_gap: typeof riskInterview.primary_gap === "string" ? riskInterview.primary_gap : null,
            contract_quick_check_focus: Array.isArray(riskInterview.quick_check_focus)
                ? riskInterview.quick_check_focus.filter((v: unknown) => typeof v === "string")
                : [],
            probe_debug: dbg0 ? {
                selected_gap_type: dbg0.selected_gap_type ?? null,
                decision_axis_source: dbg0.decision_axis_source ?? null,
                buy_point_payload_source: dbg0.buy_point_payload_source ?? null,
                buy_point_payload_text: dbg0.buy_point_payload_text ?? null,
                primary_gap_text_snapshot: dbg0.primary_gap_text_snapshot ?? null,
                quick_check_focus_snapshot: Array.isArray(dbg0.quick_check_focus_snapshot) ? dbg0.quick_check_focus_snapshot : [],
                expected_answer_consequence_targets: Array.isArray(dbg0.expected_answer_consequence_targets) ? dbg0.expected_answer_consequence_targets : [],
            } : null,
            question_skeleton: {
                q1: q1Skeleton,
                q2: q2Skeleton,
            },
        });
    }

    const total = rows.length;
    const templateLikeCount = rows.filter((row) => row.template_like).length;
    const meaningfulImpactCount = rows.filter((row) => row.meaningful_answer_impact).length;
    const probePresentCount = rows.filter((row) => row.probe_debug !== null).length;
    const contractGapPresentCount = rows.filter((row) => Boolean(row.contract_primary_gap)).length;
    const snapshotPrimaryGapPresentCount = rows.filter((row) => Boolean(row.probe_debug?.primary_gap_text_snapshot)).length;
    const snapshotFocusPresentCount = rows.filter((row) => (row.probe_debug?.quick_check_focus_snapshot ?? []).length > 0).length;
    const sameQ1SkeletonCount = new Set(rows.map((row) => row.question_skeleton.q1)).size;
    const sameQ2SkeletonCount = new Set(rows.map((row) => row.question_skeleton.q2)).size;

    const callContractLossSupportCount = rows.filter((row) =>
        Boolean(row.contract_primary_gap)
        && !row.probe_debug?.primary_gap_text_snapshot
        && (row.probe_debug?.quick_check_focus_snapshot ?? []).length === 0,
    ).length;

    const scaffoldOverReuseSupport = sameQ1SkeletonCount <= 2 && sameQ2SkeletonCount <= 2;
    const leadingCandidate = callContractLossSupportCount >= 3
        ? "pair_call_contract_information_loss"
        : scaffoldOverReuseSupport
            ? "template_scaffold_over_reuse"
            : "mixed_family_not_yet_isolatable";

    const leadingStatus =
        leadingCandidate === "pair_call_contract_information_loss"
            ? (callContractLossSupportCount === total ? "strengthened" : "unchanged")
            : leadingCandidate === "template_scaffold_over_reuse"
                ? "weakened"
                : "unchanged";

    const firstWritableStatus =
        leadingCandidate === "pair_call_contract_information_loss" && callContractLossSupportCount === total
            ? "micro_owner_isolated_pair_call_contract_information_loss"
            : "mixed_family_not_yet_isolatable";

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "diagnosis",
        current_mode: "AUDIT",
        line: "JOB-COPILOT-NS-QUICK-CHECKS-GENERIC",
        first_drift_point: "stage_question_generation_shaping_low_decision_utility",
        first_writable_fault: {
            status: firstWritableStatus,
            owner: leadingCandidate,
            file: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts",
            anchors: [
                "buildProgressiveQuickCheckPair:3987-4051",
                "buildRoleContextQuickChecks call contract:4813-4834",
            ],
        },
        probe_summary: {
            generic_subset_size: total,
            probe_debug_present_rate: `${probePresentCount}/${total}`,
            template_like_rate: `${templateLikeCount}/${total}`,
            meaningful_answer_impact_rate: `${meaningfulImpactCount}/${total}`,
            contract_primary_gap_present_rate: `${contractGapPresentCount}/${total}`,
            primary_gap_snapshot_present_rate: `${snapshotPrimaryGapPresentCount}/${total}`,
            quick_check_focus_snapshot_present_rate: `${snapshotFocusPresentCount}/${total}`,
            q1_skeleton_unique_count: sameQ1SkeletonCount,
            q2_skeleton_unique_count: sameQ2SkeletonCount,
            call_contract_loss_support_rate: `${callContractLossSupportCount}/${total}`,
        },
        leading_candidate_status: leadingStatus,
        repair_admission_allowed: false,
        observed_vs_inferred: {
            observed: [
                `probe fields emitted in ${probePresentCount}/${total} cases`,
                `contract primary_gap present in ${contractGapPresentCount}/${total}, but boundary primary_gap snapshot present in ${snapshotPrimaryGapPresentCount}/${total}`,
                `quick_check_focus snapshot present in ${snapshotFocusPresentCount}/${total} cases`,
                `template-like questions remain ${templateLikeCount}/${total}, meaningful answer impact ${meaningfulImpactCount}/${total}`,
            ],
            inferred: [
                leadingCandidate === "pair_call_contract_information_loss"
                    ? "pair boundary is under-informed relative to contract risk payload, supporting call-contract information loss as leading micro-owner"
                    : "template scaffold over-reuse remains dominant or mixed",
            ],
            unproven: [
                "admission-quality causal proof still requires one more bounded pass after potential admission-review routing",
            ],
        },
        governance: {
            memory_sync_required: false,
            memory_sync_targets: [],
        },
        case_diagnostics: rows,
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        outPath,
        leading_candidate: leadingCandidate,
        leading_candidate_status: leadingStatus,
        first_writable_status: firstWritableStatus,
        repair_admission_allowed: false,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});

