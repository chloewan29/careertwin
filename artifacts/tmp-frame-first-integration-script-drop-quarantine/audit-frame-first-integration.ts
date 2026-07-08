import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import type {
    TailoringPlan,
    SelectionSnapshot,
} from "@/lib/career-engine/copilot/resume-copilot/resume-tailoring-plan";
import {
    buildRoleContextInsightSections,
    buildRoleContextQuickChecks,
    resolveRoleFrameArbitration,
} from "@/lib/career-engine/job-copilot/backend/insight-layer-role-context";
import { detectRoleContextProfile } from "@/lib/career-engine/job-copilot/backend/role-context-profile";
import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import type { JobCalibrationState } from "@/lib/career-engine/job-copilot/job-analysis";

type FixtureCluster = {
    cluster_id: string;
    display_name: string;
    importance: "critical" | "important" | "supporting";
    match_status: "strong" | "partial" | "weak" | "missing";
    confidence: number;
    genericity: "broad" | "specialized";
    direct_capabilities: string[];
    transfer_capabilities: string[];
    methods: string[];
    domain_modifiers: string[];
    matched_terms: string[];
    evidence: string[];
    role_family_alignment: string[];
};

type FixtureCase = {
    id: string;
    title: string;
    role_family: string;
    required_skills: string[];
    preferred_skills: string[];
    responsibilities: string[];
    domains: string[];
    keywords: string[];
    clusters: FixtureCluster[];
};

type FixtureFile = {
    version: string;
    cases: FixtureCase[];
};

function readArg(name: string): string | null {
    const args = process.argv.slice(2);
    const index = args.indexOf(name);
    if (index === -1) return null;
    return args[index + 1] ?? null;
}

function asBool(value: string | null): boolean {
    if (!value) return false;
    return value.trim().toLowerCase() === "true";
}

function readFixture(filePath: string): FixtureFile {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as FixtureFile;
}

function emptyCalibrationState(): JobCalibrationState {
    return {
        required: false,
        questions: [],
        answers: [],
        answered_count: 0,
        total_questions: 0,
        recalibrated: false,
        score_delta: 0,
        confirmed_strength_areas: [],
        confirmed_risk_areas: [],
    };
}

function toCapabilityMatch(fixtureCase: FixtureCase): CapabilityMatchV2Result {
    const parsedSummary = {
        target_title: fixtureCase.title,
        role_family: fixtureCase.role_family,
        required_skills: fixtureCase.required_skills,
        preferred_skills: fixtureCase.preferred_skills,
        responsibilities: fixtureCase.responsibilities,
        domains: fixtureCase.domains,
        keywords: fixtureCase.keywords,
    };
    const requirementClusters = fixtureCase.clusters.map((cluster) => ({ ...cluster }));
    const breakdown = fixtureCase.clusters.map((cluster) => ({
        cluster_id: cluster.cluster_id,
        display_name: cluster.display_name,
        importance: cluster.importance,
        match_status: cluster.match_status,
    }));
    return {
        audit: {
            parsed_job_summary: parsedSummary,
            requirement_clusters: requirementClusters,
            requirement_to_candidate_match_breakdown: breakdown,
        },
    } as unknown as CapabilityMatchV2Result;
}

function createSidepanelViewModel(payload: Record<string, unknown>) {
    (globalThis as Record<string, unknown>).CareerTwinSharedUtils = {
        asArray(value: unknown) {
            return Array.isArray(value) ? value : [];
        },
        escapeHtml(value: unknown) {
            return String(value ?? "");
        },
    };
    const vmSource = fs.readFileSync(
        path.join(process.cwd(), "extensions/job-copilot/sidepanel/render/render-match-view-model.js"),
        "utf8",
    );
    const vmContext = vm.createContext(globalThis as unknown as vm.Context);
    new vm.Script(vmSource, { filename: "render-match-view-model.js" }).runInContext(vmContext);
    const renderer = (globalThis as Record<string, any>).CareerTwinRenderMatchViewModel;
    if (!renderer || typeof renderer.toMatchPanelViewModel !== "function") {
        throw new Error("CareerTwinRenderMatchViewModel.toMatchPanelViewModel unavailable");
    }
    return renderer.toMatchPanelViewModel(payload);
}

async function run(): Promise<void> {
    const fixturePath = readArg("--fixture") ?? "scripts/fixtures/role-frame-regression.seed.json";
    const caseId = readArg("--caseId") ?? "broad_data_leadership";
    const forceNoUnresolved = asBool(readArg("--forceNoUnresolved"));
    const forceAllStrong = asBool(readArg("--forceAllStrong"));
    const outPathArg = readArg("--out") ?? "artifacts/frame-first-integration-audit.json";
    const fixture = readFixture(fixturePath);
    const targetCase = fixture.cases.find((item) => item.id === caseId);
    if (!targetCase) {
        throw new Error(`Case '${caseId}' not found in fixture '${fixturePath}'`);
    }
    const caseRow: FixtureCase = forceNoUnresolved
        ? {
            ...targetCase,
            clusters: targetCase.clusters.map((cluster) => ({
                ...cluster,
                match_status: cluster.match_status === "weak" || cluster.match_status === "missing"
                    ? "strong"
                    : cluster.match_status,
            })),
        }
        : targetCase;
    const normalizedCaseRow: FixtureCase = forceAllStrong
        ? {
            ...caseRow,
            clusters: caseRow.clusters.map((cluster) => ({
                ...cluster,
                match_status: "strong",
            })),
        }
        : caseRow;

    const capabilityMatch = toCapabilityMatch(normalizedCaseRow);
    const roleContextProfile = detectRoleContextProfile(
        {
            target_title: normalizedCaseRow.title,
            role_family: normalizedCaseRow.role_family,
            required_skills: normalizedCaseRow.required_skills,
            preferred_skills: normalizedCaseRow.preferred_skills,
            responsibilities: normalizedCaseRow.responsibilities,
            domains: normalizedCaseRow.domains,
            keywords: normalizedCaseRow.keywords,
        },
        capabilityMatch.audit.requirement_clusters,
    );

    const roleFrame = resolveRoleFrameArbitration({
        capabilityMatch,
        roleContextProfile,
        selectedEvidence: [],
    });
    const insight = buildRoleContextInsightSections({
        capabilityMatch,
        roleContextProfile,
        tailoringPlan: {
            selected_evidence: [],
        } as unknown as TailoringPlan,
        calibration: emptyCalibrationState(),
    });
    const quickChecks = buildRoleContextQuickChecks({
        capabilityMatch,
        selectionSnapshot: {
            role_context_profile: roleContextProfile,
            selected_evidence: [],
        } as unknown as SelectionSnapshot,
        existingAnswers: [],
        maxQuestions: 2,
    });

    const payload = {
        matchScore: 76,
        applyRecommendation: {
            score: 76,
            band: "consider",
        },
        calibrationQuestions: quickChecks.questions.map((question) => ({
            id: question.id,
            question: question.question,
            targetArea: question.target_area,
            importance: question.importance,
            answer: question.answer ?? null,
            sourceRequirementId: question.source_requirement_id ?? null,
            requirementCluster: question.requirement_cluster ?? null,
            quickCheckGapType: question.quick_check_gap_type ?? null,
        })),
        diagnostics: {
            insight_debug: {
                why_fit_debug: insight.why_fit_debug,
                risk_debug: insight.risk_debug,
                quick_check_debug: quickChecks.quick_check_debug,
            },
        },
        job: {
            jobTitle: normalizedCaseRow.title,
            jobDescriptionSnapshot: [
                ...normalizedCaseRow.responsibilities,
                ...normalizedCaseRow.required_skills,
                ...normalizedCaseRow.domains,
                ...normalizedCaseRow.keywords,
            ].join(" "),
        },
        job_analysis: {
            match_score: 76,
            apply_recommendation: {
                score: 76,
                band: "consider",
            },
            why_fit: insight.whyFit,
            potential_risks: insight.potentialRisks,
            key_gaps: [],
            calibration: {
                required: quickChecks.required,
                questions: quickChecks.questions,
                answers: [],
            },
        },
    };
    const viewModel = createSidepanelViewModel(payload);
    const output = {
        generated_at: new Date().toISOString(),
        fixture_version: fixture.version,
        case_id: caseId,
        force_no_unresolved: forceNoUnresolved,
        force_all_strong: forceAllStrong,
        backend: {
            runtime_primary_frame: roleFrame.primary_frame,
            runtime_supporting_emphases: roleFrame.supporting_emphases,
            why_fit: insight.whyFit,
            potential_risks: insight.potentialRisks,
            quick_checks_required: quickChecks.required,
            quick_checks_count: quickChecks.questions.length,
            quick_checks: quickChecks.questions.map((item) => ({
                id: item.id,
                question: item.question,
                target_area: item.target_area,
                requirement_cluster: item.requirement_cluster,
                quick_check_gap_type: item.quick_check_gap_type,
            })),
        },
        sidepanel: {
            best_angle: viewModel?.matchHeader?.bestPositionLabel ?? null,
            positioning_summary: viewModel?.matchHeader?.positioningSummary ?? null,
            why_fit_items: Array.isArray(viewModel?.matchHeader?.whyFitItems)
                ? viewModel.matchHeader.whyFitItems
                : [],
            quick_check_top_gap: viewModel?.quickChecks?.topQuickCheckGap ?? null,
            quick_check_items_count: Array.isArray(viewModel?.quickChecks?.items)
                ? viewModel.quickChecks.items.length
                : 0,
            quick_check_items: Array.isArray(viewModel?.quickChecks?.items)
                ? viewModel.quickChecks.items
                : [],
        },
    };

    const outPath = path.isAbsolute(outPathArg) ? outPathArg : path.join(process.cwd(), outPathArg);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        out: outPath,
        case_id: caseId,
        force_no_unresolved: forceNoUnresolved,
        force_all_strong: forceAllStrong,
        backend_primary_frame: output.backend.runtime_primary_frame.key,
        backend_quick_checks_count: output.backend.quick_checks_count,
        sidepanel_best_angle: output.sidepanel.best_angle,
        sidepanel_quick_check_items_count: output.sidepanel.quick_check_items_count,
    }, null, 2));
}

run().catch((error) => {
    console.error("[audit-frame-first-integration] failed", error);
    process.exit(1);
});
