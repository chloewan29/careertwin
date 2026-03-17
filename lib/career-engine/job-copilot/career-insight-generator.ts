import type { ApplyRecommendation, JobCalibrationState } from "@/lib/career-engine/job-copilot/job-analysis";
import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import {
    computeDomainAnchorRelevance,
    detectInterpretationLayerForText,
    getInterpretationLayerPriority,
    toDomainFamilyLabel,
} from "@/lib/career-engine/job-copilot/domain-family-detector";
import type { InterpretationLayer } from "@/lib/career-engine/job-copilot/domain-family-config";
import { getClusterConsistencyKey } from "@/lib/career-engine/job-copilot/explanation-consistency";
import {
    formatSpecializationTemplate,
    getSpecializationExplanationTemplate,
    toSpecializationLabel,
} from "@/lib/career-engine/job-copilot/explanation-specialization-config";
import {
    computeRoleIdentityRelevance,
    toRoleIdentityLabel,
    type RoleIdentity,
} from "@/lib/career-engine/job-copilot/role-identity-detector";

type CandidateSupportLevel = "strong" | "partial" | "weak" | "missing";

type RiskRequirementCandidate = {
    sourceRequirementId: string;
    displayName: string;
    jdImportance: "critical" | "important" | "supporting";
    candidateSupportLevel: CandidateSupportLevel;
    jdEvidenceStrength: number;
    isExplicitOrRepeated: boolean;
    isRoleSpecific: boolean;
    isBroadFamily: boolean;
    roleDiscriminationScore: number;
    roleIdentityRelevance: number;
    domainAnchorRelevance: number;
    specializationHintScore: number;
    interpretationLayer: InterpretationLayer;
    interpretationLayerScore: number;
    consistencyKey: string;
    displayReason: string;
};

type InterpretationCandidate = {
    displayName: string;
    priority: number;
    interpretationLayer: InterpretationLayer;
};

export type CareerInsightSelectionAuditCandidate = {
    sourceRequirementId: string;
    displayName: string;
    consistencyKey: string;
    interpretationLayer: InterpretationLayer;
    score: number;
    jdImportance: "critical" | "important" | "supporting";
    candidateSupportLevel?: CandidateSupportLevel;
    domainRelevance: number;
    roleRelevance: number;
    selected: boolean;
    selectionReason: string;
    displayReason: string;
};

type SpecializationExplanationContext = {
    topSpecialization: string | null;
    matchedCanonicalSignals?: string[];
};

const JOB_COPILOT_DEBUG = process.env.CAREERTWIN_JOB_COPILOT_DEBUG === "1";
const DEBUG_PREFIX = "[CareerTwin][job-copilot-debug]";

function normalizeList(values: string[], limit: number): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    ).slice(0, limit);
}

export function formatSignalEvidence(signals: string[]): string {
    const cleanSignals = Array.from(
        new Set(
            signals
                .map((signal) => signal.trim().toLowerCase())
                .filter((signal) => signal.length > 0),
        ),
    ).slice(0, 3);
    if (cleanSignals.length === 0) return "";
    if (cleanSignals.length === 1) return cleanSignals[0];
    if (cleanSignals.length === 2) return `${cleanSignals[0]} and ${cleanSignals[1]}`;
    return `${cleanSignals[0]}, ${cleanSignals[1]}, and ${cleanSignals[2]}`;
}

function buildSpecializationSignalEvidenceBlock(params: {
    specializationContext?: SpecializationExplanationContext;
}): string | null {
    const signals = params.specializationContext?.matchedCanonicalSignals ?? [];
    const formattedSignals = formatSignalEvidence(signals);
    if (!formattedSignals) return null;
    const specializationLabel = toSpecializationLabel(params.specializationContext?.topSpecialization ?? null);
    return `Signals such as ${formattedSignals} suggest the role focuses on ${specializationLabel} outcomes rather than general reporting.`;
}

function normalizeSet(values: string[]): Set<string> {
    return new Set(
        values
            .map((value) => normalizeKey(value))
            .filter((value) => value.length > 0),
    );
}

function normalizeKey(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function logJobCopilotDebug(label: string, payload: unknown): void {
    if (!JOB_COPILOT_DEBUG) return;
    console.debug(DEBUG_PREFIX, label, payload);
}

function toSeverityWeight(level: CandidateSupportLevel): number {
    if (level === "missing") return 3;
    if (level === "weak") return 2;
    if (level === "partial") return 1;
    return 0;
}

function toImportanceWeight(level: "critical" | "important" | "supporting"): number {
    if (level === "critical") return 3;
    if (level === "important") return 2;
    return 1;
}

function toRiskPriority(candidate: RiskRequirementCandidate): number {
    return (toImportanceWeight(candidate.jdImportance) * 2.1)
        + (toSeverityWeight(candidate.candidateSupportLevel) * 1.4)
        + (getInterpretationLayerPriority(candidate.interpretationLayer) * 2.2)
        + candidate.jdEvidenceStrength
        + (candidate.interpretationLayerScore * 1.8)
        + (candidate.domainAnchorRelevance * 1.6)
        + (candidate.specializationHintScore * 1.2)
        + candidate.roleDiscriminationScore
        + (candidate.roleIdentityRelevance * 1.2)
        + (candidate.isRoleSpecific ? 0.4 : 0);
}

function pickTopByInterpretationHierarchy(candidates: InterpretationCandidate[], limit: number): string[] {
    if (candidates.length === 0) return [];
    const byLayer = {
        domain_defining: candidates.filter((item) => item.interpretationLayer === "domain_defining").sort((left, right) => right.priority - left.priority),
        functional_role: candidates.filter((item) => item.interpretationLayer === "functional_role").sort((left, right) => right.priority - left.priority),
        work_mode: candidates.filter((item) => item.interpretationLayer === "work_mode").sort((left, right) => right.priority - left.priority),
        generic: candidates.filter((item) => item.interpretationLayer === "generic").sort((left, right) => right.priority - left.priority),
    };
    const selected: string[] = [];
    if (byLayer.domain_defining.length > 0) {
        selected.push(...byLayer.domain_defining.slice(0, Math.min(2, limit)).map((item) => item.displayName));
        if (selected.length < limit && byLayer.functional_role[0]) {
            selected.push(byLayer.functional_role[0].displayName);
        }
    } else if (byLayer.functional_role.length > 0) {
        selected.push(...byLayer.functional_role.slice(0, Math.min(2, limit)).map((item) => item.displayName));
        if (selected.length < limit && byLayer.work_mode[0]) {
            selected.push(byLayer.work_mode[0].displayName);
        }
    } else if (byLayer.work_mode.length > 0) {
        selected.push(...byLayer.work_mode.slice(0, Math.min(2, limit)).map((item) => item.displayName));
        if (selected.length < limit && byLayer.generic[0]) {
            selected.push(byLayer.generic[0].displayName);
        }
    } else {
        selected.push(...byLayer.generic.slice(0, limit).map((item) => item.displayName));
    }
    if (selected.length < limit) {
        const fallback = [...candidates]
            .sort((left, right) => {
                const layerDelta = getInterpretationLayerPriority(right.interpretationLayer) - getInterpretationLayerPriority(left.interpretationLayer);
                if (layerDelta !== 0) return layerDelta;
                return right.priority - left.priority;
            })
            .map((item) => item.displayName);
        selected.push(...fallback);
    }
    return normalizeList(selected, limit);
}

function computeSpecializationHintScore(input: {
    text: string;
    roleIdentity?: RoleIdentity;
}): number {
    const hints = input.roleIdentity?.domainAnchor.specializationHints ?? [];
    if (hints.length === 0) return 0;
    const normalizedText = normalizeKey(input.text);
    if (!normalizedText) return 0;
    let score = 0;
    for (const hint of hints) {
        if (normalizedText.includes(normalizeKey(hint.replace(/_/g, " ")))) {
            score += 0.6;
            continue;
        }
        const hintTokens = normalizeKey(hint.replace(/_/g, " ")).split(" ").filter(Boolean);
        const matchedTokens = hintTokens.filter((token) => normalizedText.includes(token)).length;
        if (hintTokens.length > 0 && matchedTokens > 0) {
            score += matchedTokens / hintTokens.length;
        }
    }
    return Number(clamp(score / Math.max(1, hints.length), 0, 1).toFixed(4));
}

function computeJdEvidenceStrength(params: {
    literalSignalCount: number;
    repeatedSignalUnits: number;
    sectionCoverage: number;
    highWeightSignalUnits: number;
    literalOverlapScore: number;
}): number {
    const literalStrength = Math.max(
        clamp(params.literalSignalCount / 3),
        clamp(params.literalOverlapScore),
    );
    const repeatedStrength = clamp(params.repeatedSignalUnits / 3);
    const sectionStrength = clamp((params.sectionCoverage - 1) / 2);
    const highWeightStrength = clamp(params.highWeightSignalUnits / 2);
    return Number((
        (literalStrength * 0.38)
        + (repeatedStrength * 0.26)
        + (sectionStrength * 0.18)
        + (highWeightStrength * 0.18)
    ).toFixed(4));
}

function collectRiskRequirementCandidates(params: {
    matchResult: CapabilityMatchV2Result;
    calibration: JobCalibrationState;
    roleIdentity?: RoleIdentity;
}): RiskRequirementCandidate[] {
    const matchResult = params.matchResult;
    const clusterById = new Map(
        matchResult.audit.requirement_clusters.map((cluster) => [cluster.cluster_id, cluster]),
    );
    const rankingById = new Map(
        matchResult.audit.capability_ranking_adjustments.map((item) => [item.cluster_id, item]),
    );
    const confirmedStrengthAreas = normalizeSet(params.calibration.confirmed_strength_areas);
    const confirmedRiskAreas = normalizeSet(params.calibration.confirmed_risk_areas);
    const deduped = new Map<string, RiskRequirementCandidate>();

    for (const breakdown of matchResult.audit.requirement_to_candidate_match_breakdown) {
        const areaKey = normalizeKey(breakdown.display_name);
        let supportLevel = breakdown.match_status as CandidateSupportLevel;
        if (confirmedStrengthAreas.has(areaKey)) {
            supportLevel = "strong";
        } else if (confirmedRiskAreas.has(areaKey)) {
            supportLevel = supportLevel === "missing" ? "missing" : "weak";
        }
        if (supportLevel === "strong") continue;

        const cluster = clusterById.get(breakdown.cluster_id);
        const ranking = rankingById.get(breakdown.cluster_id);
        const literalSignalCount = cluster?.jd_literal_signal_count ?? 0;
        const repeatedSignalUnits = cluster?.jd_repeated_signal_units ?? 0;
        const sectionCoverage = cluster?.jd_section_coverage ?? 0;
        const highWeightSignalUnits = cluster?.jd_high_weight_signal_units ?? 0;
        const jdEvidenceStrength = computeJdEvidenceStrength({
            literalSignalCount,
            repeatedSignalUnits,
            sectionCoverage,
            highWeightSignalUnits,
            literalOverlapScore: breakdown.literal_overlap_score,
        });
        const isExplicitOrRepeated =
            literalSignalCount >= 2
            || breakdown.literal_overlap_score >= 0.58
            || (cluster?.explicit_signal_count ?? 0) >= 1
            || repeatedSignalUnits >= 2
            || sectionCoverage >= 2
            || highWeightSignalUnits >= 1;
        const isBroadFamily = Boolean(ranking?.broad_family || cluster?.genericity === "broad");
        const roleDiscriminationScore = Number((ranking?.role_discrimination_score ?? 0).toFixed(4));
        const roleIdentityRelevance = params.roleIdentity
            ? computeRoleIdentityRelevance({
                text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
                roleIdentity: params.roleIdentity,
            })
            : 0.5;
        const domainAnchorRelevance = params.roleIdentity
            ? computeDomainAnchorRelevance({
                text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
                domainAnchor: params.roleIdentity.domainAnchor,
            })
            : 0;
        const specializationHintScore = computeSpecializationHintScore({
            text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
            roleIdentity: params.roleIdentity,
        });
        const interpretation = detectInterpretationLayerForText({
            text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
            domainAnchor: params.roleIdentity?.domainAnchor,
        });
        const specificityScore = cluster?.specificity_score ?? 0;
        const coherenceScore = cluster?.role_signal_coherence ?? 0;
        const isRoleSpecific =
            interpretation.layer === "domain_defining"
            || roleDiscriminationScore >= 0.52
            || coherenceScore >= 0.5
            || specificityScore >= 0.52
            || roleIdentityRelevance >= 0.56
            || domainAnchorRelevance >= 0.54
            || (!isBroadFamily && literalSignalCount >= 2 && highWeightSignalUnits >= 1);
        const displayReason = [
            isExplicitOrRepeated ? "explicit_or_repeated_jd_signal" : "weak_jd_signal",
            isRoleSpecific ? "role_specific_requirement" : "low_role_specificity",
            isBroadFamily ? "broad_family_detected" : "non_broad_family",
            domainAnchorRelevance >= 0.45 ? "domain_anchor_aligned" : "domain_anchor_weak",
            `interpretation_layer:${interpretation.layer}`,
        ].join("|");
        const candidate: RiskRequirementCandidate = {
            sourceRequirementId: breakdown.cluster_id,
            displayName: breakdown.display_name,
            jdImportance: breakdown.importance,
            candidateSupportLevel: supportLevel,
            jdEvidenceStrength,
            isExplicitOrRepeated,
            isRoleSpecific,
            isBroadFamily,
            roleDiscriminationScore,
            roleIdentityRelevance,
            domainAnchorRelevance,
            specializationHintScore,
            interpretationLayer: interpretation.layer,
            interpretationLayerScore: interpretation.score,
            consistencyKey: getClusterConsistencyKey({
                displayName: breakdown.display_name,
                sourceRequirementId: breakdown.cluster_id,
            }),
            displayReason,
        };

        const dedupeKey = normalizeKey(candidate.displayName);
        const current = deduped.get(dedupeKey);
        if (!current || toRiskPriority(candidate) > toRiskPriority(current)) {
            deduped.set(dedupeKey, candidate);
        }
    }

    return Array.from(deduped.values()).sort((left, right) => toRiskPriority(right) - toRiskPriority(left));
}

export function isDisplayableCareerRisk(requirement: RiskRequirementCandidate): boolean {
    const highImportance = requirement.jdImportance === "critical" || requirement.jdImportance === "important";
    const unresolved = requirement.candidateSupportLevel === "partial"
        || requirement.candidateSupportLevel === "weak"
        || requirement.candidateSupportLevel === "missing";
    const broadButWeak = requirement.isBroadFamily
        && requirement.jdImportance !== "critical"
        && requirement.jdEvidenceStrength < 0.72;
    const roleIdentityTooWeak = requirement.jdImportance !== "critical"
        && requirement.roleIdentityRelevance < 0.34;
    const domainTooWeak = requirement.jdImportance !== "critical"
        && requirement.domainAnchorRelevance < 0.24
        && requirement.specializationHintScore < 0.22;
    const genericTooWeak = requirement.interpretationLayer === "generic"
        && requirement.jdImportance !== "critical";
    return highImportance
        && unresolved
        && requirement.isExplicitOrRepeated
        && requirement.isRoleSpecific
        && !roleIdentityTooWeak
        && !domainTooWeak
        && !genericTooWeak
        && !broadButWeak;
}

function collectRoleAnchoredStrengthCandidates(params: {
    matchResult: CapabilityMatchV2Result;
    calibration: JobCalibrationState;
    roleIdentity?: RoleIdentity;
}): Array<{
    sourceRequirementId: string;
    displayName: string;
    consistencyKey: string;
    priority: number;
    interpretationLayer: InterpretationLayer;
    domainRelevance: number;
    roleRelevance: number;
    jdImportance: "critical" | "important" | "supporting";
    candidateSupportLevel: CandidateSupportLevel;
    displayReason: string;
}> {
    const confirmedStrengthAreas = normalizeSet(params.calibration.confirmed_strength_areas);
    const rankingById = new Map(
        params.matchResult.audit.capability_ranking_adjustments.map((item) => [item.cluster_id, item]),
    );
    const clusterById = new Map(
        params.matchResult.audit.requirement_clusters.map((cluster) => [cluster.cluster_id, cluster]),
    );
    const candidateRows = params.matchResult.audit.requirement_to_candidate_match_breakdown
        .map((breakdown) => {
            const cluster = clusterById.get(breakdown.cluster_id);
            const areaKey = normalizeKey(breakdown.display_name);
            const confirmed = confirmedStrengthAreas.has(areaKey);
            const supportLevel = confirmed
                ? "strong"
                : breakdown.match_status;
            if (supportLevel !== "strong" && supportLevel !== "partial") return null;

            const roleIdentityRelevance = params.roleIdentity
                ? computeRoleIdentityRelevance({
                    text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
                    roleIdentity: params.roleIdentity,
                })
                : 0.5;
            const domainAnchorRelevance = params.roleIdentity
                ? computeDomainAnchorRelevance({
                    text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
                    domainAnchor: params.roleIdentity.domainAnchor,
                })
                : 0;
            const specializationHintScore = computeSpecializationHintScore({
                text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
                roleIdentity: params.roleIdentity,
            });
            const interpretation = detectInterpretationLayerForText({
                text: `${breakdown.display_name} ${(cluster?.methods ?? []).join(" ")} ${(cluster?.domain_modifiers ?? []).join(" ")}`,
                domainAnchor: params.roleIdentity?.domainAnchor,
            });
            const domainSpecificPriority = (domainAnchorRelevance * 1.8) + (specializationHintScore * 1.4);
            const ranking = rankingById.get(breakdown.cluster_id);
            const priority = (getInterpretationLayerPriority(interpretation.layer) * 2.2)
                + (interpretation.score * 1.7)
                + domainSpecificPriority
                + (breakdown.importance === "critical" ? 2.2 : breakdown.importance === "important" ? 1.4 : 0.7)
                + (supportLevel === "strong" ? 0.9 : 0.3)
                + (cluster?.role_signal_coherence ?? 0)
                + (ranking?.role_discrimination_score ?? 0)
                + (roleIdentityRelevance * 1.1)
                + (confirmed ? 0.8 : 0);
            return {
                sourceRequirementId: breakdown.cluster_id,
                displayName: breakdown.display_name,
                consistencyKey: getClusterConsistencyKey({
                    displayName: breakdown.display_name,
                    sourceRequirementId: breakdown.cluster_id,
                }),
                priority,
                interpretationLayer: interpretation.layer,
                domainRelevance: domainAnchorRelevance,
                roleRelevance: roleIdentityRelevance,
                jdImportance: breakdown.importance,
                candidateSupportLevel: supportLevel as CandidateSupportLevel,
                displayReason: `strength_candidate|interpretation_layer:${interpretation.layer}|support_level:${supportLevel}`,
            };
        })
        .filter((item): item is {
            sourceRequirementId: string;
            displayName: string;
            consistencyKey: string;
            priority: number;
            interpretationLayer: InterpretationLayer;
            domainRelevance: number;
            roleRelevance: number;
            jdImportance: "critical" | "important" | "supporting";
            candidateSupportLevel: CandidateSupportLevel;
            displayReason: string;
        } => Boolean(item))
        .sort((left, right) => right.priority - left.priority);
    return candidateRows;
}

function collectRoleAnchoredStrengthAreas(params: {
    matchResult: CapabilityMatchV2Result;
    calibration: JobCalibrationState;
    roleIdentity?: RoleIdentity;
}): string[] {
    const candidates = collectRoleAnchoredStrengthCandidates(params);
    return pickTopByInterpretationHierarchy(
        candidates.map((item) => ({
            displayName: item.displayName,
            priority: item.priority,
            interpretationLayer: item.interpretationLayer,
        })),
        3,
    );
}

function buildRiskAreas(params: {
    matchResult: CapabilityMatchV2Result;
    calibration: JobCalibrationState;
    roleIdentity?: RoleIdentity;
}): {
    riskAreas: string[];
    positioningAreas: string[];
    provenance: Array<{
        sourceRequirementId: string;
        jdEvidenceStrength: number;
        jdImportance: "critical" | "important" | "supporting";
        candidateSupportLevel: CandidateSupportLevel;
        domainAnchorRelevance: number;
        interpretationLayer: InterpretationLayer;
        displayReason: string;
    }>;
} {
    const candidates = collectRiskRequirementCandidates(params);
    const riskCandidates = candidates.filter(isDisplayableCareerRisk);
    const riskAreas = pickTopByInterpretationHierarchy(
        riskCandidates.map((item) => ({
            displayName: item.displayName,
            priority: toRiskPriority(item),
            interpretationLayer: item.interpretationLayer,
        })),
        3,
    );
    const positioningAreas = normalizeList(candidates.map((item) => item.displayName), 4);
    const provenance = riskCandidates.slice(0, 3).map((item) => ({
        sourceRequirementId: item.sourceRequirementId,
            jdEvidenceStrength: item.jdEvidenceStrength,
            jdImportance: item.jdImportance,
            candidateSupportLevel: item.candidateSupportLevel,
            domainAnchorRelevance: item.domainAnchorRelevance,
            interpretationLayer: item.interpretationLayer,
            displayReason: item.displayReason,
        }));
    return { riskAreas, positioningAreas, provenance };
}

function toCareerInsightSummary(params: {
    recommendation: ApplyRecommendation;
    topStrengths: string[];
    topRisks: string[];
    calibration: JobCalibrationState;
    jobTitle: string;
    roleIdentity?: RoleIdentity;
    specializationContext?: SpecializationExplanationContext;
}): string {
    const strength = params.topStrengths[0] ?? "your strongest experience areas";
    const risk = params.topRisks[0] ?? "";
    const score = params.recommendation.score;
    const roleLabel = params.roleIdentity ? toRoleIdentityLabel(params.roleIdentity.primaryRoleType) : "role";
    const domainLabel = params.roleIdentity?.domainAnchor.domainFamily
        ? toDomainFamilyLabel(params.roleIdentity.domainAnchor.domainFamily)
        : null;
    const specializationLabel = params.specializationContext?.topSpecialization
        ? toSpecializationLabel(params.specializationContext.topSpecialization)
        : params.roleIdentity?.domainAnchor.specializationHints[0]
            ? params.roleIdentity.domainAnchor.specializationHints[0].replace(/_/g, " ")
        : null;
    const roleContextLabel = specializationLabel ?? domainLabel ?? roleLabel;
    const calibrationNote = params.calibration.recalibrated
        ? params.calibration.score_delta >= 0
            ? "Your quick checks increased confidence in role fit and strengthened role-specific support."
            : "Your quick checks highlighted role-critical risk areas that need clearer proof."
        : "Answering quick checks can improve confidence in this recommendation.";

    if (params.recommendation.band === "strong") {
        return `Apply Recommendation is ${score}/100 for ${params.jobTitle}. For this ${roleContextLabel} role direction, your strongest evidence is in ${strength}. ${calibrationNote}`;
    }
    if (params.recommendation.band === "consider") {
        const riskClause = risk ? `Main risk to address is ${risk.toLowerCase()}. ` : "";
        return `Apply Recommendation is ${score}/100 for ${params.jobTitle}. You have a viable path if you position ${strength.toLowerCase()} as direct ${roleContextLabel} evidence. ${riskClause}${calibrationNote}`;
    }
    return `Apply Recommendation is ${score}/100 for ${params.jobTitle}. This is currently a stretch for this ${roleContextLabel} direction unless you can show direct evidence in role-critical areas. ${calibrationNote}`;
}

function buildWhyFitLines(topStrengths: string[], confirmedStrengthAreas: string[], roleIdentity?: RoleIdentity): string[] {
    const domainHint = roleIdentity?.domainAnchor.specializationHints[0]
        ? `This JD leans on ${roleIdentity.domainAnchor.specializationHints[0].replace(/_/g, " ")}, and your background shows adjacent proof in that area.`
        : null;
    const lines = [
        ...(domainHint ? [domainHint] : []),
        ...topStrengths.slice(0, 2).map((item) => `Your experience in ${item} aligns with this role's day-to-day priorities.`),
        ...confirmedStrengthAreas.slice(0, 2).map((item) => `You confirmed direct hands-on experience in ${item}, which strengthens recruiter confidence.`),
    ];
    return normalizeList(lines, 3);
}

function toRiskGapWording(candidate: CareerInsightSelectionAuditCandidate): string {
    const area = candidate.displayName;
    const key = candidate.consistencyKey;
    if (key === "marketing_measurement") {
        return "The role appears to expect deeper direct ownership of MMM/attribution decisions, not adjacent support only.";
    }
    if (key === "product_analytics") {
        return "The role may require clearer end-to-end ownership of product measurement and experimentation decisions.";
    }
    if (key === "data_platform_reporting") {
        return "The role likely expects stronger hands-on depth in data platform/reporting ownership and execution scope.";
    }
    if (candidate.candidateSupportLevel === "missing") {
        return `This role likely expects direct ownership depth in ${area}, which is currently weakly evidenced.`;
    }
    if (candidate.candidateSupportLevel === "weak") {
        return `There may be a scope/seniority gap in ${area}; stronger direct examples may be needed.`;
    }
    return `Depth in ${area} may need stronger proof of ownership and decision impact for this role.`;
}

function buildRiskLines(params: {
    selectedRiskCandidates: CareerInsightSelectionAuditCandidate[];
    confirmedRiskAreas: string[];
    specializationRiskTemplate?: string | null;
}): string[] {
    const lines = [
        ...(params.specializationRiskTemplate ? [params.specializationRiskTemplate] : []),
        ...params.selectedRiskCandidates.slice(0, 2).map((candidate) => toRiskGapWording(candidate)),
        ...params.confirmedRiskAreas.slice(0, 2).map((item) => `You marked ${item} as less direct experience, which can lower interview confidence.`),
    ];
    if (lines.length === 0) {
        return [
            "Current JD signals do not show a dominant unresolved core requirement, but role-specific examples are still needed to protect interview confidence.",
        ];
    }
    return normalizeList(lines, 3);
}

function buildPositioningHints(params: {
    topStrengths: string[];
    riskAreas: string[];
    positioningAreas: string[];
    calibration: JobCalibrationState;
    roleIdentity?: RoleIdentity;
}): string[] {
    const hints: string[] = [];
    const leadStrength = params.calibration.confirmed_strength_areas[0] ?? params.topStrengths[0];
    if (leadStrength) {
        hints.push(`Lead your CV and interviews with one concrete outcome in ${leadStrength}.`);
    }

    const secondStrength = params.calibration.confirmed_strength_areas[1] ?? params.topStrengths[1];
    if (secondStrength) {
        hints.push(`Use a second example that shows scope, ownership, and impact in ${secondStrength}.`);
    }

    const leadRisk = params.calibration.confirmed_risk_areas[0] ?? params.riskAreas[0];
    if (leadRisk) {
        hints.push(`Address ${leadRisk} proactively with one transition plan or adjacent example.`);
    }

    const adjacentAngle = params.positioningAreas.find(
        (area) => normalizeKey(area) !== normalizeKey(leadRisk ?? ""),
    );
    if (adjacentAngle) {
        hints.push(`If asked about ${adjacentAngle}, position it as adjacent support and tie it back to this job's core requirements.`);
    }
    if (params.roleIdentity) {
        const roleLabel = toRoleIdentityLabel(params.roleIdentity.primaryRoleType);
        hints.push(`Frame your story around ${roleLabel} outcomes first, then use transferable strengths as supporting proof.`);
        const specializationLabel = params.roleIdentity.domainAnchor.specializationHints[0];
        if (specializationLabel) {
            hints.push(`Use one concrete ${specializationLabel.replace(/_/g, " ")} example to anchor your positioning for this JD.`);
        }
    }

    if (hints.length === 0) {
        hints.push("Keep your positioning specific: role context, action taken, measurable impact.");
    }
    return normalizeList(hints, 3);
}

export function buildCareerInsightSelectionAudit(params: {
    matchResult: CapabilityMatchV2Result;
    calibration: JobCalibrationState;
    roleIdentity?: RoleIdentity;
    maxStrengths?: number;
    maxRisks?: number;
}): {
    selectedWhyFit: string[];
    selectedWhyFitConsistencyKeys: string[];
    selectedRisks: string[];
    selectedRiskConsistencyKeys: string[];
    primaryUncertaintyThemeKey: string | null;
    whyFitCandidates: CareerInsightSelectionAuditCandidate[];
    riskCandidates: CareerInsightSelectionAuditCandidate[];
    higherLayerAvailableButNotSelected: boolean;
} {
    const maxStrengths = Math.max(1, Math.min(5, params.maxStrengths ?? 3));
    const maxRisks = Math.max(1, Math.min(5, params.maxRisks ?? 3));
    const strengthCandidatesRaw = collectRoleAnchoredStrengthCandidates(params);
    const selectedWhyFit = pickTopByInterpretationHierarchy(
        strengthCandidatesRaw.map((item) => ({
            displayName: item.displayName,
            priority: item.priority,
            interpretationLayer: item.interpretationLayer,
        })),
        maxStrengths,
    );
    const selectedWhySet = new Set(selectedWhyFit.map((item) => normalizeKey(item)));
    const selectedWhyFitConsistencyKeys = Array.from(
        new Set(
            strengthCandidatesRaw
                .filter((item) => selectedWhySet.has(normalizeKey(item.displayName)))
                .map((item) => item.consistencyKey),
        ),
    );
    const fitConsistencySet = new Set(selectedWhyFitConsistencyKeys);
    const whyFitCandidates = strengthCandidatesRaw.map((item) => {
        const selected = selectedWhySet.has(normalizeKey(item.displayName));
        return {
            sourceRequirementId: item.sourceRequirementId,
            displayName: item.displayName,
            consistencyKey: item.consistencyKey,
            interpretationLayer: item.interpretationLayer,
            score: Number(item.priority.toFixed(4)),
            jdImportance: item.jdImportance,
            candidateSupportLevel: item.candidateSupportLevel,
            domainRelevance: Number(item.domainRelevance.toFixed(4)),
            roleRelevance: Number(item.roleRelevance.toFixed(4)),
            selected,
            selectionReason: selected
                ? `selected_by_hierarchy:${item.interpretationLayer}`
                : `not_selected_lower_rank:${item.interpretationLayer}`,
            displayReason: item.displayReason,
        } satisfies CareerInsightSelectionAuditCandidate;
    });

    const riskCandidatesRawAll = collectRiskRequirementCandidates(params)
        .filter(isDisplayableCareerRisk);
    const riskCandidatesNonFit = riskCandidatesRawAll
        .filter((item) => !fitConsistencySet.has(item.consistencyKey));
    const selectedRisks = pickTopByInterpretationHierarchy(
        riskCandidatesNonFit.map((item) => ({
            displayName: item.displayName,
            priority: toRiskPriority(item),
            interpretationLayer: item.interpretationLayer,
        })),
        maxRisks,
    );
    const selectedRiskSet = new Set(selectedRisks.map((item) => normalizeKey(item)));
    const selectedRiskConsistencyKeys = Array.from(
        new Set(
            riskCandidatesNonFit
                .filter((item) => selectedRiskSet.has(normalizeKey(item.displayName)))
                .map((item) => item.consistencyKey),
        ),
    );
    const riskCandidates = riskCandidatesRawAll.map((item) => {
        const selected = selectedRiskSet.has(normalizeKey(item.displayName));
        const fitOverlap = fitConsistencySet.has(item.consistencyKey);
        return {
            sourceRequirementId: item.sourceRequirementId,
            displayName: item.displayName,
            consistencyKey: item.consistencyKey,
            interpretationLayer: item.interpretationLayer,
            score: Number(toRiskPriority(item).toFixed(4)),
            jdImportance: item.jdImportance,
            candidateSupportLevel: item.candidateSupportLevel,
            domainRelevance: Number(item.domainAnchorRelevance.toFixed(4)),
            roleRelevance: Number(item.roleIdentityRelevance.toFixed(4)),
            selected,
            selectionReason: fitOverlap
                ? "excluded_fit_overlap"
                : selected
                ? `selected_by_hierarchy:${item.interpretationLayer}`
                : `not_selected_lower_rank:${item.interpretationLayer}`,
            displayReason: item.displayReason,
        } satisfies CareerInsightSelectionAuditCandidate;
    });

    const unresolvedThemeScores = new Map<string, number>();
    for (const candidate of riskCandidatesNonFit) {
        const current = unresolvedThemeScores.get(candidate.consistencyKey) ?? 0;
        unresolvedThemeScores.set(candidate.consistencyKey, current + toRiskPriority(candidate));
    }
    const primaryUncertaintyThemeKey = Array.from(unresolvedThemeScores.entries())
        .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

    const highestSelectedLayer = Math.max(
        ...whyFitCandidates
            .filter((item) => item.selected)
            .map((item) => getInterpretationLayerPriority(item.interpretationLayer)),
        0,
    );
    const higherLayerAvailableButNotSelected = whyFitCandidates.some((item) => {
        return !item.selected && getInterpretationLayerPriority(item.interpretationLayer) > highestSelectedLayer;
    });

    return {
        selectedWhyFit,
        selectedWhyFitConsistencyKeys,
        selectedRisks,
        selectedRiskConsistencyKeys,
        primaryUncertaintyThemeKey,
        whyFitCandidates,
        riskCandidates,
        higherLayerAvailableButNotSelected,
    };
}

export function generateCareerInsightSections(params: {
    recommendation: ApplyRecommendation;
    topStrengths: string[];
    topRisks: string[];
    calibration: JobCalibrationState;
    jobTitle: string;
    matchResult: CapabilityMatchV2Result;
    roleIdentity?: RoleIdentity;
    specializationContext?: SpecializationExplanationContext;
}): {
    careerInsight: string;
    whyFit: string[];
    potentialRisks: string[];
    positioningHints: string[];
} {
    const selectionAudit = buildCareerInsightSelectionAudit({
        matchResult: params.matchResult,
        calibration: params.calibration,
        roleIdentity: params.roleIdentity,
        maxStrengths: 3,
        maxRisks: 3,
    });
    const topStrengths = normalizeList([
        ...selectionAudit.selectedWhyFit,
        ...params.topStrengths,
    ], 3);
    const finalFitConsistencyKeys = new Set(
        topStrengths.map((item) => getClusterConsistencyKey(item)),
    );
    const selectedRiskCandidatesBase = selectionAudit.riskCandidates.filter((item) => item.selected);
    const selectedRiskCandidates = selectedRiskCandidatesBase
        .filter((item) => !finalFitConsistencyKeys.has(item.consistencyKey));
    if (selectedRiskCandidates.length < 3) {
        const backfill = selectionAudit.riskCandidates
            .filter((item) => !item.selected)
            .filter((item) => !finalFitConsistencyKeys.has(item.consistencyKey))
            .filter((item) => !selectedRiskCandidates.some((existing) => existing.consistencyKey === item.consistencyKey))
            .slice(0, 3 - selectedRiskCandidates.length);
        selectedRiskCandidates.push(...backfill);
    }
    const topRisks = normalizeList(selectedRiskCandidates.map((item) => item.displayName), 3);
    const specializationTemplate = getSpecializationExplanationTemplate(
        params.specializationContext?.topSpecialization,
    );
    const specializationLabel = toSpecializationLabel(params.specializationContext?.topSpecialization ?? null);
    const specializationWhyFitTemplate = specializationTemplate
        ? formatSpecializationTemplate(specializationTemplate.why_fit_template, {
            specializationLabel,
            strength_1: topStrengths[0] ?? "your strongest experience areas",
            risk_1: topRisks[0] ?? "role-critical expectations",
        })
        : null;
    const specializationRiskTemplate = specializationTemplate
        ? formatSpecializationTemplate(specializationTemplate.risk_template, {
            specializationLabel,
            strength_1: topStrengths[0] ?? "your strongest experience areas",
            risk_1: topRisks[0] ?? "role-critical expectations",
        })
        : null;
    const specializationSignalEvidenceBlock = buildSpecializationSignalEvidenceBlock({
        specializationContext: params.specializationContext,
    });
    logJobCopilotDebug(
        "risk_provenance",
        selectedRiskCandidates.map((item) => ({
            sourceRequirementId: item.sourceRequirementId,
            consistencyKey: item.consistencyKey,
            candidateSupportLevel: item.candidateSupportLevel,
            selectionReason: item.selectionReason,
            displayReason: item.displayReason,
        })),
    );
    return {
        careerInsight: toCareerInsightSummary({
            recommendation: params.recommendation,
            topStrengths,
            topRisks,
            calibration: params.calibration,
            jobTitle: params.jobTitle,
            roleIdentity: params.roleIdentity,
            specializationContext: params.specializationContext,
        }),
        whyFit: normalizeList(
            [
                ...(specializationWhyFitTemplate ? [specializationWhyFitTemplate] : []),
                ...(specializationSignalEvidenceBlock ? [specializationSignalEvidenceBlock] : []),
                ...buildWhyFitLines(topStrengths, params.calibration.confirmed_strength_areas, params.roleIdentity),
            ],
            3,
        ),
        potentialRisks: buildRiskLines({
            selectedRiskCandidates,
            confirmedRiskAreas: params.calibration.confirmed_risk_areas,
            specializationRiskTemplate,
        }),
        positioningHints: buildPositioningHints({
            topStrengths,
            riskAreas: topRisks,
            positioningAreas: normalizeList(selectionAudit.riskCandidates.map((item) => item.displayName), 4),
            calibration: params.calibration,
            roleIdentity: params.roleIdentity,
        }),
    };
}
