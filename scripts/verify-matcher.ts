import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getCapabilityMatchV2FromContext, type CandidateMatchContext } from "@/lib/career-engine/matching/capability-match-v2";
import type { CandidateCapabilityForMatch } from "@/lib/career-engine/matching/capability-match-v1";
import type { CapabilityStrengthSupportingSignal } from "@/lib/career-engine/capability/capability-strength";
import type { Capability, EvidencePiece, EvidenceSignal } from "@/lib/career-engine/memory/career-graph-loader";
import { readFixture, type Fixture } from "@/scripts/human-alignment-benchmark";

type VerifyMatcherArgs = {
    fixturePath?: string;
    baselinePath?: string;
    summaryOut?: string | null;
    detailsOut?: string | null;
    diffOut?: string | null;
};

export type MatcherCaseDetail = {
    step_name: "matcher";
    case_id: string;
    pass: boolean;
    failure_reasons: string[];
    title: string;
    human_label: "high_fit" | "medium_fit" | "low_fit";
    model_score: number;
    fit_bucket: "high_fit" | "medium_fit" | "low_fit";
    job_profile_quality: string;
    requirement_cluster_count: number;
    top_match_label: string | null;
    top_3_match_labels: string[];
    expected_bucket_from_baseline: "high_fit" | "medium_fit" | "low_fit" | null;
    expected_top_match_label_from_baseline: string | null;
    top_1_stable_against_baseline: boolean | null;
    expected_top_match_within_top_3: boolean | null;
    high_fit_suppression_flag: boolean;
    low_fit_inflation_flag: boolean;
    output_shape_ok: boolean;
    top_positive_factor: string | null;
    top_negative_factor: string | null;
};

export type MatcherSummary = {
    step_name: "matcher";
    fixture_version: string;
    total_cases: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    top_match_presence_rate: number;
    bucket_agreement: number;
    high_fit_predicted_low_count: number;
    low_fit_predicted_high_count: number;
    high_fit_predicted_not_high_count: number;
    low_fit_predicted_not_low_count: number;
    top_1_stability_rate: number;
    top_3_expected_top_1_coverage: number;
    high_fit_suppression_case_count: number;
    low_fit_inflation_case_count: number;
    high_fit_suppression_case_ids: string[];
    low_fit_inflation_case_ids: string[];
    average_score_high_fit: number;
    average_score_medium_fit: number;
    average_score_low_fit: number;
    high_minus_low_margin: number;
    average_requirement_cluster_count: number;
    fit_bucket_breakdown: {
        high_fit: number;
        medium_fit: number;
        low_fit: number;
    };
    thresholds: {
        min_total_cases: number;
        required_pass_rate: number;
        min_top_match_presence_rate: number;
        min_bucket_agreement: number;
        max_high_fit_predicted_low_count: number;
        max_low_fit_predicted_high_count: number;
        max_high_fit_predicted_not_high_count: number;
        max_low_fit_predicted_not_low_count: number;
        min_top_1_stability_rate: number;
        min_top_3_expected_top_1_coverage: number;
        max_high_fit_suppression_case_count: number;
        max_low_fit_inflation_case_count: number;
        min_high_minus_low_margin: number;
        min_average_score_high_fit: number;
        max_average_score_low_fit: number;
        min_average_requirement_cluster_count: number;
    };
    deterministic_mode_enforced: boolean;
};

type MatcherRegressionBaselineCase = {
    case_id: string;
    expected_score: number;
    expected_bucket: "high_fit" | "medium_fit" | "low_fit";
    expected_top_match_label: string | null;
};

type MatcherRegressionBaseline = {
    version: string;
    fixture_version: string;
    summary: {
        average_score_high_fit: number;
        average_score_medium_fit: number;
        average_score_low_fit: number;
    };
    guardrails: {
        min_average_score_delta: number;
        min_worst_case_score_delta: number;
        max_bucket_degradation_count: number;
        max_top_match_label_change_count: number;
    };
    cases: MatcherRegressionBaselineCase[];
};

export type MatcherRegressionDiff = {
    step_name: "matcher_regression_diff";
    baseline_version: string;
    fixture_version: string;
    pass: boolean;
    summary_delta: {
        average_score_high_fit_delta: number;
        average_score_medium_fit_delta: number;
        average_score_low_fit_delta: number;
        average_score_delta_all_cases: number;
        worst_case_score_delta: number;
        bucket_degradation_count: number;
        top_match_label_change_count: number;
    };
    guardrail_results: {
        min_average_score_delta_ok: boolean;
        min_worst_case_score_delta_ok: boolean;
        max_bucket_degradation_count_ok: boolean;
        max_top_match_label_change_count_ok: boolean;
    };
    case_diffs: Array<{
        case_id: string;
        title: string;
        expected_score: number;
        actual_score: number;
        score_delta: number;
        expected_bucket: "high_fit" | "medium_fit" | "low_fit";
        actual_bucket: "high_fit" | "medium_fit" | "low_fit";
        bucket_changed: boolean;
        bucket_degraded: boolean;
        expected_top_match_label: string | null;
        actual_top_match_label: string | null;
        actual_top_3_match_labels: string[];
        expected_top_match_within_top_3: boolean | null;
        top_match_label_changed: boolean;
        severity: "none" | "warning" | "critical";
        founder_note: string;
    }>;
    founder_readability: {
        matcher_regression_status: "stable" | "regressed";
        highlighted_risks: string[];
        worst_score_drop_cases: Array<{
            case_id: string;
            title: string;
            score_delta: number;
        }>;
    };
};

const VERIFY_CAREER_ID = "verify-career";
const VERIFY_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function parseArgs(): VerifyMatcherArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };

    return {
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        baselinePath: readArg("--baseline") ?? "scripts/fixtures/verify-matcher-baseline.json",
        summaryOut: readArg("--summaryOut"),
        detailsOut: readArg("--detailsOut"),
        diffOut: readArg("--diffOut"),
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function loadBaseline(baselinePath: string): MatcherRegressionBaseline {
    const absolute = path.isAbsolute(baselinePath)
        ? baselinePath
        : path.join(process.cwd(), baselinePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as MatcherRegressionBaseline;
}

function bucketRank(bucket: "high_fit" | "medium_fit" | "low_fit"): number {
    if (bucket === "high_fit") return 3;
    if (bucket === "medium_fit") return 2;
    return 1;
}

function buildSupportingSignal(
    signalId: string,
    evidencePieceId: string,
    action: string,
    scopeLevel: "project" | "team" | "function",
    ownership: "driver" | "owner" | "lead",
    impact: "operational" | "strategic" | "revenue",
    evidenceRawText: string,
): CapabilityStrengthSupportingSignal {
    return {
        evidence_signal_id: signalId,
        evidence_piece_id: evidencePieceId,
        contribution_score: 1,
        raw_signal_strength: 1,
        action,
        scope_level: scopeLevel,
        ownership_level: ownership,
        impact_signal: impact,
        confidence_score: 0.85,
        link_contribution_weight: 0.85,
        evidence_raw_text: evidenceRawText,
    };
}

function buildDeterministicCandidateContext(): CandidateMatchContext {
    const evidencePieces: EvidencePiece[] = [
        {
            id: "ev-1",
            career_id: VERIFY_CAREER_ID,
            experience_id: "exp-1",
            company: "Publicis Groupe ANZ",
            role: "Analytics Manager",
            date_range: "2022-2025",
            raw_text: "Led campaign and customer commercial analytics, translated findings into business recommendations, and influenced cross-functional planning decisions.",
            source_type: "resume_bullet",
            summary: null,
            action: null,
            impact: null,
            stakeholders: null,
            tools_methods: null,
            business_context: null,
            org_scope: null,
            stakeholder_scope: null,
            leadership_scope: null,
            delivery_level: null,
            impact_scale: null,
            impact_type: null,
            confidence_level: null,
            inferred_scale: null,
            inferred_scope: null,
            confidence: null,
            missing_fields: null,
            sort_order: 1,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "ev-2",
            career_id: VERIFY_CAREER_ID,
            experience_id: "exp-1",
            company: "Publicis Groupe ANZ",
            role: "Analytics Manager",
            date_range: "2022-2025",
            raw_text: "Partnered with strategy, client, and media stakeholders to present executive-ready narratives and business cases from analytics outputs.",
            source_type: "resume_bullet",
            summary: null,
            action: null,
            impact: null,
            stakeholders: null,
            tools_methods: null,
            business_context: null,
            org_scope: null,
            stakeholder_scope: null,
            leadership_scope: null,
            delivery_level: null,
            impact_scale: null,
            impact_type: null,
            confidence_level: null,
            inferred_scale: null,
            inferred_scope: null,
            confidence: null,
            missing_fields: null,
            sort_order: 2,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "ev-3",
            career_id: VERIFY_CAREER_ID,
            experience_id: "exp-2",
            company: "Enterprise Services",
            role: "BI Lead",
            date_range: "2019-2022",
            raw_text: "Built SQL and Power BI automation workflows and dashboards to improve reporting reliability and decision cadence.",
            source_type: "resume_bullet",
            summary: null,
            action: null,
            impact: null,
            stakeholders: null,
            tools_methods: null,
            business_context: null,
            org_scope: null,
            stakeholder_scope: null,
            leadership_scope: null,
            delivery_level: null,
            impact_scale: null,
            impact_type: null,
            confidence_level: null,
            inferred_scale: null,
            inferred_scope: null,
            confidence: null,
            missing_fields: null,
            sort_order: 3,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "ev-4",
            career_id: VERIFY_CAREER_ID,
            experience_id: "exp-2",
            company: "Enterprise Services",
            role: "BI Lead",
            date_range: "2019-2022",
            raw_text: "Drove analytics capability uplift, coached analysts, and embedded change adoption practices across operations and product teams.",
            source_type: "resume_bullet",
            summary: null,
            action: null,
            impact: null,
            stakeholders: null,
            tools_methods: null,
            business_context: null,
            org_scope: null,
            stakeholder_scope: null,
            leadership_scope: null,
            delivery_level: null,
            impact_scale: null,
            impact_type: null,
            confidence_level: null,
            inferred_scale: null,
            inferred_scope: null,
            confidence: null,
            missing_fields: null,
            sort_order: 4,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "ev-5",
            career_id: VERIFY_CAREER_ID,
            experience_id: "exp-3",
            company: "Growth Co",
            role: "Commercial Insights Lead",
            date_range: "2016-2019",
            raw_text: "Owned strategic planning and opportunity assessment using customer and commercial data to shape growth priorities.",
            source_type: "resume_bullet",
            summary: null,
            action: null,
            impact: null,
            stakeholders: null,
            tools_methods: null,
            business_context: null,
            org_scope: null,
            stakeholder_scope: null,
            leadership_scope: null,
            delivery_level: null,
            impact_scale: null,
            impact_type: null,
            confidence_level: null,
            inferred_scale: null,
            inferred_scope: null,
            confidence: null,
            missing_fields: null,
            sort_order: 5,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
    ];

    const evidenceSignals: EvidenceSignal[] = [
        {
            id: "sig-1",
            career_id: VERIFY_CAREER_ID,
            evidence_piece_id: "ev-1",
            action: "Led commercial analytics and campaign measurement",
            domain: "analytics",
            initiative_type: "analysis",
            scope_level: "function",
            ownership_level: "lead",
            stakeholder_scope: ["cross_functional", "executive"],
            tool_signals: ["sql", "power bi"],
            capability_hints: ["commercial analytics", "analytics translation"],
            team_signal: null,
            impact_signal: "revenue",
            confidence_score: 0.9,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "sig-2",
            career_id: VERIFY_CAREER_ID,
            evidence_piece_id: "ev-2",
            action: "Presented business cases to strategy and client stakeholders",
            domain: "strategy",
            initiative_type: "planning",
            scope_level: "function",
            ownership_level: "lead",
            stakeholder_scope: ["cross_functional", "executive"],
            tool_signals: ["presentation"],
            capability_hints: ["executive influence", "stakeholder leadership"],
            team_signal: null,
            impact_signal: "strategic",
            confidence_score: 0.88,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "sig-3",
            career_id: VERIFY_CAREER_ID,
            evidence_piece_id: "ev-3",
            action: "Built BI automation and reporting workflows",
            domain: "data platform",
            initiative_type: "automation",
            scope_level: "team",
            ownership_level: "owner",
            stakeholder_scope: ["cross_functional"],
            tool_signals: ["sql", "power bi", "tableau"],
            capability_hints: ["analytics automation", "bi transformation"],
            team_signal: null,
            impact_signal: "operational",
            confidence_score: 0.82,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "sig-4",
            career_id: VERIFY_CAREER_ID,
            evidence_piece_id: "ev-4",
            action: "Led analytics enablement and change adoption",
            domain: "transformation",
            initiative_type: "capability_uplift",
            scope_level: "function",
            ownership_level: "lead",
            stakeholder_scope: ["cross_functional"],
            tool_signals: ["coaching", "training"],
            capability_hints: ["capability uplift", "change management"],
            team_signal: null,
            impact_signal: "operational",
            confidence_score: 0.8,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
        {
            id: "sig-5",
            career_id: VERIFY_CAREER_ID,
            evidence_piece_id: "ev-5",
            action: "Owned strategic planning and opportunity sizing",
            domain: "commercial",
            initiative_type: "planning",
            scope_level: "function",
            ownership_level: "owner",
            stakeholder_scope: ["executive"],
            tool_signals: ["forecasting", "prioritization"],
            capability_hints: ["strategic planning", "opportunity assessment"],
            team_signal: null,
            impact_signal: "revenue",
            confidence_score: 0.84,
            created_at: VERIFY_TIMESTAMP,
            updated_at: VERIFY_TIMESTAMP,
        },
    ];

    const candidateProfile: CandidateCapabilityForMatch[] = [
        {
            capability_id: "cap-1",
            canonical_name: "commercial analytics",
            display_name: "Commercial Analytics",
            strength_score: 0.86,
            weighted_signal_score: 5.2,
            signal_count: 2,
            top_supporting_signals: [
                buildSupportingSignal("sig-1", "ev-1", "Led commercial analytics and campaign measurement", "function", "lead", "revenue", evidencePieces[0].raw_text),
                buildSupportingSignal("sig-5", "ev-5", "Owned strategic planning and opportunity sizing", "function", "owner", "revenue", evidencePieces[4].raw_text),
            ],
        },
        {
            capability_id: "cap-2",
            canonical_name: "executive influence & business cases",
            display_name: "Executive Influence & Business Cases",
            strength_score: 0.81,
            weighted_signal_score: 4.8,
            signal_count: 1,
            top_supporting_signals: [
                buildSupportingSignal("sig-2", "ev-2", "Presented business cases to strategy and client stakeholders", "function", "lead", "strategic", evidencePieces[1].raw_text),
            ],
        },
        {
            capability_id: "cap-3",
            canonical_name: "cross-functional stakeholder leadership",
            display_name: "Cross-Functional Stakeholder Leadership",
            strength_score: 0.84,
            weighted_signal_score: 5.1,
            signal_count: 2,
            top_supporting_signals: [
                buildSupportingSignal("sig-2", "ev-2", "Partnered across strategy, media, and client teams", "function", "lead", "strategic", evidencePieces[1].raw_text),
                buildSupportingSignal("sig-4", "ev-4", "Led analytics enablement across product and operations", "function", "lead", "operational", evidencePieces[3].raw_text),
            ],
        },
        {
            capability_id: "cap-4",
            canonical_name: "analytics automation",
            display_name: "Analytics Automation",
            strength_score: 0.72,
            weighted_signal_score: 3.9,
            signal_count: 1,
            top_supporting_signals: [
                buildSupportingSignal("sig-3", "ev-3", "Built BI automation and reporting workflows", "team", "owner", "operational", evidencePieces[2].raw_text),
            ],
        },
        {
            capability_id: "cap-5",
            canonical_name: "capability uplift & enablement",
            display_name: "Capability Uplift & Enablement",
            strength_score: 0.65,
            weighted_signal_score: 3.1,
            signal_count: 1,
            top_supporting_signals: [
                buildSupportingSignal("sig-4", "ev-4", "Drove analytics capability uplift and change adoption", "function", "lead", "operational", evidencePieces[3].raw_text),
            ],
        },
        {
            capability_id: "cap-6",
            canonical_name: "strategic planning",
            display_name: "Strategic Planning",
            strength_score: 0.74,
            weighted_signal_score: 4.1,
            signal_count: 1,
            top_supporting_signals: [
                buildSupportingSignal("sig-5", "ev-5", "Owned strategic planning and opportunity sizing", "function", "owner", "strategic", evidencePieces[4].raw_text),
            ],
        },
    ];

    const capabilities: Capability[] = candidateProfile.map((item, index) => ({
        id: `capability-${index + 1}`,
        career_id: VERIFY_CAREER_ID,
        name: item.display_name,
        normalized_name: item.canonical_name,
        canonical_name: item.canonical_name,
        display_name: item.display_name,
        confidence: 0.85,
        strength: item.strength_score,
        created_at: VERIFY_TIMESTAMP,
        updated_at: VERIFY_TIMESTAMP,
    }));

    return {
        career_id: VERIFY_CAREER_ID,
        candidate_profile: candidateProfile,
        candidate_titles: ["Analytics Manager", "Commercial Insights Lead", "BI Lead"],
        candidate_capabilities: capabilities,
        evidence_pieces: evidencePieces,
        evidence_signals: evidenceSignals,
        evidence_by_capability: {},
        signals_by_capability: {},
    };
}

function validateSummary(summary: MatcherSummary): void {
    const thresholds = summary.thresholds;

    if (summary.total_cases < thresholds.min_total_cases) {
        throw new Error(`Matcher verification failed: total_cases=${summary.total_cases} < ${thresholds.min_total_cases}.`);
    }
    if (summary.pass_rate < thresholds.required_pass_rate) {
        throw new Error(`Matcher verification failed: pass_rate=${summary.pass_rate} < ${thresholds.required_pass_rate}.`);
    }
    if (summary.top_match_presence_rate < thresholds.min_top_match_presence_rate) {
        throw new Error(
            `Matcher verification failed: top_match_presence_rate=${summary.top_match_presence_rate} < ${thresholds.min_top_match_presence_rate}.`,
        );
    }
    if (summary.bucket_agreement < thresholds.min_bucket_agreement) {
        throw new Error(
            `Matcher verification failed: bucket_agreement=${summary.bucket_agreement} < ${thresholds.min_bucket_agreement}.`,
        );
    }
    if (summary.high_fit_predicted_low_count > thresholds.max_high_fit_predicted_low_count) {
        throw new Error(
            `Matcher verification failed: high_fit_predicted_low_count=${summary.high_fit_predicted_low_count} > ${thresholds.max_high_fit_predicted_low_count}.`,
        );
    }
    if (summary.low_fit_predicted_high_count > thresholds.max_low_fit_predicted_high_count) {
        throw new Error(
            `Matcher verification failed: low_fit_predicted_high_count=${summary.low_fit_predicted_high_count} > ${thresholds.max_low_fit_predicted_high_count}.`,
        );
    }
    if (summary.high_fit_predicted_not_high_count > thresholds.max_high_fit_predicted_not_high_count) {
        throw new Error(
            `Matcher verification failed: high_fit_predicted_not_high_count=${summary.high_fit_predicted_not_high_count} > ${thresholds.max_high_fit_predicted_not_high_count}.`,
        );
    }
    if (summary.low_fit_predicted_not_low_count > thresholds.max_low_fit_predicted_not_low_count) {
        throw new Error(
            `Matcher verification failed: low_fit_predicted_not_low_count=${summary.low_fit_predicted_not_low_count} > ${thresholds.max_low_fit_predicted_not_low_count}.`,
        );
    }
    if (summary.top_1_stability_rate < thresholds.min_top_1_stability_rate) {
        throw new Error(
            `Matcher verification failed: top_1_stability_rate=${summary.top_1_stability_rate} < ${thresholds.min_top_1_stability_rate}.`,
        );
    }
    if (summary.top_3_expected_top_1_coverage < thresholds.min_top_3_expected_top_1_coverage) {
        throw new Error(
            `Matcher verification failed: top_3_expected_top_1_coverage=${summary.top_3_expected_top_1_coverage} < ${thresholds.min_top_3_expected_top_1_coverage}.`,
        );
    }
    if (summary.high_fit_suppression_case_count > thresholds.max_high_fit_suppression_case_count) {
        throw new Error(
            `Matcher verification failed: high_fit_suppression_case_count=${summary.high_fit_suppression_case_count} > ${thresholds.max_high_fit_suppression_case_count}.`,
        );
    }
    if (summary.low_fit_inflation_case_count > thresholds.max_low_fit_inflation_case_count) {
        throw new Error(
            `Matcher verification failed: low_fit_inflation_case_count=${summary.low_fit_inflation_case_count} > ${thresholds.max_low_fit_inflation_case_count}.`,
        );
    }
    if (summary.high_minus_low_margin < thresholds.min_high_minus_low_margin) {
        throw new Error(
            `Matcher verification failed: high_minus_low_margin=${summary.high_minus_low_margin} < ${thresholds.min_high_minus_low_margin}.`,
        );
    }
    if (summary.average_score_high_fit < thresholds.min_average_score_high_fit) {
        throw new Error(
            `Matcher verification failed: average_score_high_fit=${summary.average_score_high_fit} < ${thresholds.min_average_score_high_fit}.`,
        );
    }
    if (summary.average_score_low_fit > thresholds.max_average_score_low_fit) {
        throw new Error(
            `Matcher verification failed: average_score_low_fit=${summary.average_score_low_fit} > ${thresholds.max_average_score_low_fit}.`,
        );
    }
    if (summary.average_requirement_cluster_count < thresholds.min_average_requirement_cluster_count) {
        throw new Error(
            `Matcher verification failed: average_requirement_cluster_count=${summary.average_requirement_cluster_count} < ${thresholds.min_average_requirement_cluster_count}.`,
        );
    }
}

function buildRegressionDiff(input: {
    fixtureVersion: string;
    baseline: MatcherRegressionBaseline;
    summary: MatcherSummary;
    details: MatcherCaseDetail[];
}): MatcherRegressionDiff {
    const detailsByCaseId = new Map(input.details.map((item) => [item.case_id, item]));
    const caseDiffs = input.baseline.cases
        .map((baselineCase) => {
            const actual = detailsByCaseId.get(baselineCase.case_id);
            if (!actual) return null;
            const scoreDelta = Number((actual.model_score - baselineCase.expected_score).toFixed(4));
            const bucketChanged = actual.fit_bucket !== baselineCase.expected_bucket;
            const bucketDegraded = bucketRank(actual.fit_bucket) < bucketRank(baselineCase.expected_bucket);
            const topMatchLabelChanged = (actual.top_match_label ?? null) !== baselineCase.expected_top_match_label;
            const expectedTopMatchWithinTop3 = baselineCase.expected_top_match_label
                ? actual.top_3_match_labels.includes(baselineCase.expected_top_match_label)
                : null;
            const severity: "none" | "warning" | "critical" = bucketDegraded
                ? "critical"
                : topMatchLabelChanged
                    ? "warning"
                    : "none";
            const founderNote = bucketDegraded
                ? "Bucket degraded versus baseline."
                : topMatchLabelChanged
                    ? "Top-1 label changed versus baseline."
                    : "No meaningful regression detected.";
            return {
                case_id: baselineCase.case_id,
                title: actual.title,
                expected_score: baselineCase.expected_score,
                actual_score: actual.model_score,
                score_delta: scoreDelta,
                expected_bucket: baselineCase.expected_bucket,
                actual_bucket: actual.fit_bucket,
                bucket_changed: bucketChanged,
                bucket_degraded: bucketDegraded,
                expected_top_match_label: baselineCase.expected_top_match_label,
                actual_top_match_label: actual.top_match_label ?? null,
                actual_top_3_match_labels: actual.top_3_match_labels,
                expected_top_match_within_top_3: expectedTopMatchWithinTop3,
                top_match_label_changed: topMatchLabelChanged,
                severity,
                founder_note: founderNote,
            };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const allActualScores = caseDiffs.map((item) => item.score_delta);
    const averageScoreDeltaAllCases = Number(average(allActualScores).toFixed(4));
    const worstCaseScoreDelta = allActualScores.length > 0
        ? Number(Math.min(...allActualScores).toFixed(4))
        : 0;
    const bucketDegradationCount = caseDiffs.filter((item) => item.bucket_degraded).length;
    const topMatchLabelChangeCount = caseDiffs.filter((item) => item.top_match_label_changed).length;

    const summaryDelta = {
        average_score_high_fit_delta: Number((input.summary.average_score_high_fit - input.baseline.summary.average_score_high_fit).toFixed(4)),
        average_score_medium_fit_delta: Number((input.summary.average_score_medium_fit - input.baseline.summary.average_score_medium_fit).toFixed(4)),
        average_score_low_fit_delta: Number((input.summary.average_score_low_fit - input.baseline.summary.average_score_low_fit).toFixed(4)),
        average_score_delta_all_cases: averageScoreDeltaAllCases,
        worst_case_score_delta: worstCaseScoreDelta,
        bucket_degradation_count: bucketDegradationCount,
        top_match_label_change_count: topMatchLabelChangeCount,
    };

    const guardrailResults = {
        min_average_score_delta_ok: summaryDelta.average_score_delta_all_cases >= input.baseline.guardrails.min_average_score_delta,
        min_worst_case_score_delta_ok: summaryDelta.worst_case_score_delta >= input.baseline.guardrails.min_worst_case_score_delta,
        max_bucket_degradation_count_ok: summaryDelta.bucket_degradation_count <= input.baseline.guardrails.max_bucket_degradation_count,
        max_top_match_label_change_count_ok: summaryDelta.top_match_label_change_count <= input.baseline.guardrails.max_top_match_label_change_count,
    };

    const highlightedRisks = caseDiffs
        .filter((item) => item.severity !== "none")
        .map((item) => `${item.case_id}:${item.founder_note}`);
    const worstScoreDropCases = [...caseDiffs]
        .sort((a, b) => a.score_delta - b.score_delta)
        .slice(0, 3)
        .map((item) => ({
            case_id: item.case_id,
            title: item.title,
            score_delta: item.score_delta,
        }));

    return {
        step_name: "matcher_regression_diff",
        baseline_version: input.baseline.version,
        fixture_version: input.fixtureVersion,
        pass: Object.values(guardrailResults).every(Boolean),
        summary_delta: summaryDelta,
        guardrail_results: guardrailResults,
        case_diffs: caseDiffs,
        founder_readability: {
            matcher_regression_status: Object.values(guardrailResults).every(Boolean) ? "stable" : "regressed",
            highlighted_risks: highlightedRisks,
            worst_score_drop_cases: worstScoreDropCases,
        },
    };
}

function validateRegressionDiff(diff: MatcherRegressionDiff): void {
    if (!diff.pass) {
        throw new Error(`Matcher regression verification failed: ${JSON.stringify(diff.guardrail_results)}`);
    }
}

function loadFixture(fixturePath: string): Fixture {
    const fixture = readFixture(fixturePath);
    if (!fixture.jobs || fixture.jobs.length === 0) {
        throw new Error("Matcher verification fixture has no jobs.");
    }
    return fixture;
}

export async function runMatcherVerification(
    args: VerifyMatcherArgs = {},
): Promise<{ summary: MatcherSummary; details: MatcherCaseDetail[]; regressionDiff: MatcherRegressionDiff }> {
    const fixturePath = args.fixturePath ?? "scripts/fixtures/human-alignment-benchmark.seed.json";
    const baselinePath = args.baselinePath ?? "scripts/fixtures/verify-matcher-baseline.json";
    const fixture = loadFixture(fixturePath);
    const baseline = loadBaseline(baselinePath);
    const baselineByCaseId = new Map(baseline.cases.map((item) => [item.case_id, item]));
    const candidateContext = buildDeterministicCandidateContext();

    const previousGeminiApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const details: MatcherCaseDetail[] = [];
    try {
        for (const job of fixture.jobs) {
            const jobDescription = job.job_description ?? "";
            if (jobDescription.trim().length < 40) {
                throw new Error(`Fixture case ${job.id} has insufficient job_description text.`);
            }

            const result = await getCapabilityMatchV2FromContext({
                careerId: VERIFY_CAREER_ID,
                candidateContext,
                jobDescription,
                jobTitleHint: job.title,
                variant: {
                    variant_name: "default",
                },
            });

            const score = result.overall_match_score;
            const failureReasons: string[] = [];
            const scoreIsValid = Number.isFinite(score) && score >= 0 && score <= 1;
            if (!scoreIsValid) failureReasons.push("invalid_score");

            const topMatch = result.matched_strengths[0] ?? result.partial_matches[0] ?? null;
            if (!topMatch) failureReasons.push("top_match_missing");
            const top3Matches = [...result.matched_strengths, ...result.partial_matches]
                .map((item) => item.display_name)
                .filter((label, index, all) => Boolean(label) && all.indexOf(label) === index)
                .slice(0, 3);
            const baselineCase = baselineByCaseId.get(job.id) ?? null;
            const expectedTopMatchLabel = baselineCase?.expected_top_match_label ?? null;
            const expectedTopWithinTop3 = expectedTopMatchLabel
                ? top3Matches.includes(expectedTopMatchLabel)
                : null;
            const top1StableAgainstBaseline = expectedTopMatchLabel
                ? (topMatch?.display_name ?? null) === expectedTopMatchLabel
                : null;
            if (expectedTopWithinTop3 === false) {
                failureReasons.push("baseline_top1_missing_from_top3");
            }

            const outputShapeOk = Array.isArray(result.matched_strengths)
                && Array.isArray(result.partial_matches)
                && Array.isArray(result.gaps)
                && Array.isArray(result.audit.requirement_clusters)
                && Number.isFinite(result.score_breakdown.final_score);
            if (!outputShapeOk) failureReasons.push("output_shape_unstable");

            if (result.matched_strengths.length === 0 && result.partial_matches.length === 0) {
                failureReasons.push("empty_match_output");
            }

            const highFitSuppressionFlag = baselineCase?.expected_bucket === "high_fit"
                && (
                    result.fit_bucket !== "high_fit"
                    || score < Math.max(0.6, baselineCase.expected_score - 0.08)
                );
            const lowFitInflationFlag = baselineCase?.expected_bucket === "low_fit"
                && (
                    result.fit_bucket !== "low_fit"
                    || score > Math.min(0.5, baselineCase.expected_score + 0.08)
                );
            if (highFitSuppressionFlag) failureReasons.push("high_fit_suppression_detected");
            if (lowFitInflationFlag) failureReasons.push("low_fit_inflation_detected");

            details.push({
                step_name: "matcher",
                case_id: job.id,
                pass: failureReasons.length === 0,
                failure_reasons: failureReasons,
                title: job.title,
                human_label: job.human_label,
                model_score: Number(score.toFixed(4)),
                fit_bucket: result.fit_bucket,
                job_profile_quality: result.job_profile_quality,
                requirement_cluster_count: result.audit.requirement_clusters.length,
                top_match_label: topMatch?.display_name ?? null,
                top_3_match_labels: top3Matches,
                expected_bucket_from_baseline: baselineCase?.expected_bucket ?? null,
                expected_top_match_label_from_baseline: expectedTopMatchLabel,
                top_1_stable_against_baseline: top1StableAgainstBaseline,
                expected_top_match_within_top_3: expectedTopWithinTop3,
                high_fit_suppression_flag: highFitSuppressionFlag,
                low_fit_inflation_flag: lowFitInflationFlag,
                output_shape_ok: outputShapeOk,
                top_positive_factor: result.audit.positive_contributors[0]?.label ?? null,
                top_negative_factor: result.audit.negative_contributors[0]?.label ?? null,
            });
        }
    } finally {
        if (typeof previousGeminiApiKey === "string") {
            process.env.GEMINI_API_KEY = previousGeminiApiKey;
        }
    }

    const highScores = details.filter((item) => item.human_label === "high_fit").map((item) => item.model_score);
    const mediumScores = details.filter((item) => item.human_label === "medium_fit").map((item) => item.model_score);
    const lowScores = details.filter((item) => item.human_label === "low_fit").map((item) => item.model_score);

    const averageHigh = Number(average(highScores).toFixed(4));
    const averageMedium = Number(average(mediumScores).toFixed(4));
    const averageLow = Number(average(lowScores).toFixed(4));
    const passCount = details.filter((item) => item.pass).length;
    const failCount = details.length - passCount;
    const topMatchPresenceRate = Number((
        details.filter((item) => item.top_match_label !== null).length / Math.max(1, details.length)
    ).toFixed(4));
    const bucketAgreement = Number((
        details.filter((item) => item.fit_bucket === item.human_label).length / Math.max(1, details.length)
    ).toFixed(4));
    const highFitPredictedLowCount = details.filter((item) => item.human_label === "high_fit" && item.fit_bucket === "low_fit").length;
    const lowFitPredictedHighCount = details.filter((item) => item.human_label === "low_fit" && item.fit_bucket === "high_fit").length;
    const highFitPredictedNotHighCount = details.filter((item) => item.expected_bucket_from_baseline === "high_fit" && item.fit_bucket !== "high_fit").length;
    const lowFitPredictedNotLowCount = details.filter((item) => item.expected_bucket_from_baseline === "low_fit" && item.fit_bucket !== "low_fit").length;
    const baselineComparableCount = details.filter((item) => item.top_1_stable_against_baseline !== null).length;
    const top1StableCount = details.filter((item) => item.top_1_stable_against_baseline === true).length;
    const top3CoverageCount = details.filter((item) => item.expected_top_match_within_top_3 === true).length;
    const highFitSuppressionCaseIds = details.filter((item) => item.high_fit_suppression_flag).map((item) => item.case_id);
    const lowFitInflationCaseIds = details.filter((item) => item.low_fit_inflation_flag).map((item) => item.case_id);

    const summary: MatcherSummary = {
        step_name: "matcher",
        fixture_version: fixture.version,
        total_cases: details.length,
        pass_count: passCount,
        fail_count: failCount,
        pass_rate: Number((passCount / Math.max(1, details.length)).toFixed(4)),
        top_match_presence_rate: topMatchPresenceRate,
        bucket_agreement: bucketAgreement,
        high_fit_predicted_low_count: highFitPredictedLowCount,
        low_fit_predicted_high_count: lowFitPredictedHighCount,
        high_fit_predicted_not_high_count: highFitPredictedNotHighCount,
        low_fit_predicted_not_low_count: lowFitPredictedNotLowCount,
        top_1_stability_rate: Number((top1StableCount / Math.max(1, baselineComparableCount)).toFixed(4)),
        top_3_expected_top_1_coverage: Number((top3CoverageCount / Math.max(1, baselineComparableCount)).toFixed(4)),
        high_fit_suppression_case_count: highFitSuppressionCaseIds.length,
        low_fit_inflation_case_count: lowFitInflationCaseIds.length,
        high_fit_suppression_case_ids: highFitSuppressionCaseIds,
        low_fit_inflation_case_ids: lowFitInflationCaseIds,
        average_score_high_fit: averageHigh,
        average_score_medium_fit: averageMedium,
        average_score_low_fit: averageLow,
        high_minus_low_margin: Number((averageHigh - averageLow).toFixed(4)),
        average_requirement_cluster_count: Number(average(details.map((item) => item.requirement_cluster_count)).toFixed(2)),
        fit_bucket_breakdown: {
            high_fit: details.filter((item) => item.fit_bucket === "high_fit").length,
            medium_fit: details.filter((item) => item.fit_bucket === "medium_fit").length,
            low_fit: details.filter((item) => item.fit_bucket === "low_fit").length,
        },
        thresholds: {
            min_total_cases: 1,
            required_pass_rate: 1,
            min_top_match_presence_rate: 1,
            min_bucket_agreement: 0.5,
            max_high_fit_predicted_low_count: 0,
            max_low_fit_predicted_high_count: 1,
            max_high_fit_predicted_not_high_count: 1,
            max_low_fit_predicted_not_low_count: 0,
            min_top_1_stability_rate: 0.9,
            min_top_3_expected_top_1_coverage: 0.95,
            max_high_fit_suppression_case_count: 1,
            max_low_fit_inflation_case_count: 0,
            min_high_minus_low_margin: 0.08,
            min_average_score_high_fit: 0.45,
            max_average_score_low_fit: 0.8,
            min_average_requirement_cluster_count: 2,
        },
        deterministic_mode_enforced: true,
    };

    const regressionDiff = buildRegressionDiff({
        fixtureVersion: fixture.version,
        baseline,
        summary,
        details,
    });

    if (args.summaryOut) writeJson(args.summaryOut, summary);
    if (args.detailsOut) writeJson(args.detailsOut, details);
    if (args.diffOut) writeJson(args.diffOut, regressionDiff);

    validateSummary(summary);
    validateRegressionDiff(regressionDiff);

    return { summary, details, regressionDiff };
}

async function run(): Promise<void> {
    const args = parseArgs();
    const result = await runMatcherVerification(args);
    console.log(JSON.stringify({
        total_cases: result.summary.total_cases,
        pass_count: result.summary.pass_count,
        fail_count: result.summary.fail_count,
        pass_rate: result.summary.pass_rate,
        top_match_presence_rate: result.summary.top_match_presence_rate,
        average_score_high_fit: result.summary.average_score_high_fit,
        average_score_medium_fit: result.summary.average_score_medium_fit,
        average_score_low_fit: result.summary.average_score_low_fit,
        bucket_agreement: result.summary.bucket_agreement,
        high_fit_predicted_low_count: result.summary.high_fit_predicted_low_count,
        low_fit_predicted_high_count: result.summary.low_fit_predicted_high_count,
        high_fit_predicted_not_high_count: result.summary.high_fit_predicted_not_high_count,
        low_fit_predicted_not_low_count: result.summary.low_fit_predicted_not_low_count,
        top_1_stability_rate: result.summary.top_1_stability_rate,
        top_3_expected_top_1_coverage: result.summary.top_3_expected_top_1_coverage,
        high_fit_suppression_case_count: result.summary.high_fit_suppression_case_count,
        low_fit_inflation_case_count: result.summary.low_fit_inflation_case_count,
        high_minus_low_margin: result.summary.high_minus_low_margin,
        regression_diff_pass: result.regressionDiff.pass,
        summary_out: args.summaryOut,
        details_out: args.detailsOut,
        diff_out: args.diffOut,
    }, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    run().catch((error) => {
        console.error("[verify-matcher] Failed", error);
        process.exit(1);
    });
}
