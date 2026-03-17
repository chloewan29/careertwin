import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import type {
    ApplyRecommendation,
    CalibrationAnswerValue,
    JobCalibrationAnswer,
    JobCalibrationQuestion,
    JobCalibrationState,
} from "@/lib/career-engine/job-copilot/job-analysis";
import {
    computeDomainAnchorRelevance,
    detectInterpretationLayerForText,
    getInterpretationLayerPriority,
} from "@/lib/career-engine/job-copilot/domain-family-detector";
import type { InterpretationLayer } from "@/lib/career-engine/job-copilot/domain-family-config";
import {
    computeRoleIdentityRelevance,
    toRoleIdentityLabel,
    type RoleIdentity,
} from "@/lib/career-engine/job-copilot/role-identity-detector";
import { getClusterConsistencyKey, normalizeConsistencyText } from "@/lib/career-engine/job-copilot/explanation-consistency";
import {
    getSpecializationExplanationTemplate,
    resolveExplanationSpecialization,
    toSpecializationLabel,
} from "@/lib/career-engine/job-copilot/explanation-specialization-config";

type CalibrationQuestionCandidate = {
    source_requirement_id: string;
    canonical_name: string;
    display_name: string;
    importance: "critical" | "important" | "supporting";
    match_status: "strong" | "partial" | "weak" | "missing";
    source: "gap" | "partial";
    jd_evidence_strength: number;
    jd_explicit_or_repeated: boolean;
    role_specific: boolean;
    broad_family: boolean;
    role_identity_relevance: number;
    domain_anchor_relevance: number;
    specialization_hint_score: number;
    interpretation_layer: InterpretationLayer;
    interpretation_layer_score: number;
    consistency_key: string;
    display_reason: string;
};

type QuestionAngle =
    | "ownership"
    | "decision_impact"
    | "stakeholder_context"
    | "specialization_depth";

type CalibrationQuestionDraft = {
    questionId: string;
    question: string;
    semanticKey: string;
    angle: QuestionAngle;
    consistencyKey: string;
    targetArea: string;
    sourceRequirementId: string;
    interpretationLayer: InterpretationLayer;
    importance: "critical" | "important" | "supporting";
    candidateSupportLevel: "partial" | "weak" | "missing";
    domainRelevance: number;
    roleRelevance: number;
    score: number;
    selectionReason: string;
    displayReason: string;
};

export type ExplanationConsistencyContext = {
    excludedConsistencyKeys?: string[];
    preferredUncertaintyKey?: string | null;
};

type SpecializationExplanationContext = {
    topSpecialization: string | null;
};

export type CalibrationQuestionSelectionAuditCandidate = {
    sourceRequirementId: string;
    questionId: string;
    targetArea: string;
    angle: QuestionAngle;
    consistencyKey: string;
    interpretationLayer: InterpretationLayer;
    score: number;
    jdImportance: "critical" | "important" | "supporting";
    candidateSupportLevel: "strong" | "partial" | "weak" | "missing";
    domainRelevance: number;
    roleRelevance: number;
    selected: boolean;
    selectionReason: string;
    displayReason: string;
};

const JOB_COPILOT_DEBUG = process.env.CAREERTWIN_JOB_COPILOT_DEBUG === "1";
const DEBUG_PREFIX = "[CareerTwin][job-copilot-debug]";

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function normalizeText(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toQuestionId(name: string, angle?: QuestionAngle): string {
    const slug = normalizeText(`${name} ${angle ?? ""}`).replace(/\s+/g, "_").slice(0, 72);
    return `cal_${slug || "role_focus"}`;
}

function toQuestionSemanticKey(question: string): string {
    return normalizeText(question)
        .replace(/\b(have|you|directly|led|owned|with|on|the|a|an|or|and|to|of|in|for|this|that|role|work|setting)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toUnresolvedSupportLevel(status: CalibrationQuestionCandidate["match_status"]): "partial" | "weak" | "missing" {
    if (status === "missing" || status === "weak" || status === "partial") {
        return status;
    }
    return "partial";
}

function normalizeKey(value: string): string {
    return normalizeText(value);
}

function toImportanceWeight(importance: "critical" | "important" | "supporting"): number {
    if (importance === "critical") return 6;
    if (importance === "important") return 4;
    return 2;
}

function toSeverityWeight(status: CalibrationQuestionCandidate["match_status"]): number {
    if (status === "missing") return 3;
    if (status === "weak") return 2;
    if (status === "partial") return 1;
    return 0;
}

function logJobCopilotDebug(label: string, payload: unknown): void {
    if (!JOB_COPILOT_DEBUG) return;
    console.debug(DEBUG_PREFIX, label, payload);
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

function toQuestionPriority(candidate: CalibrationQuestionCandidate): number {
    return (toImportanceWeight(candidate.importance) * 1.8)
        + (toSeverityWeight(candidate.match_status) * 1.2)
        + (getInterpretationLayerPriority(candidate.interpretation_layer) * 2.1)
        + (candidate.interpretation_layer_score * 1.8)
        + candidate.jd_evidence_strength
        + (candidate.domain_anchor_relevance * 1.8)
        + (candidate.specialization_hint_score * 1.3)
        + (candidate.role_identity_relevance * 1.1)
        + (candidate.role_specific ? 0.4 : 0)
        + (candidate.source === "gap" ? 0.3 : 0);
}

function toQuestionAnswerability(candidate: CalibrationQuestionCandidate): number {
    const explicitScore = candidate.jd_explicit_or_repeated ? 1 : 0.55;
    const layerScore = candidate.interpretation_layer === "domain_defining"
        ? 1
        : candidate.interpretation_layer === "functional_role"
            ? 0.82
            : candidate.interpretation_layer === "work_mode"
                ? 0.68
                : 0.45;
    const roleScore = candidate.role_specific ? 1 : 0.62;
    return Number(clamp((explicitScore * 0.45) + (layerScore * 0.3) + (roleScore * 0.25), 0, 1).toFixed(4));
}

function toExpectedCalibrationImpact(candidate: CalibrationQuestionCandidate): number {
    const uncertainty = candidate.match_status === "missing"
        ? 1
        : candidate.match_status === "weak"
            ? 0.86
            : 0.68;
    const importance = candidate.importance === "critical"
        ? 1
        : candidate.importance === "important"
            ? 0.8
            : 0.5;
    return Number(clamp((uncertainty * 0.56) + (importance * 0.44), 0, 1).toFixed(4));
}

function toQuestionValue(candidate: CalibrationQuestionCandidate): number {
    return (toQuestionPriority(candidate) * 1.15)
        + (toExpectedCalibrationImpact(candidate) * 4.2)
        + (toQuestionAnswerability(candidate) * 3.3);
}

function rankThemeKeys(params: {
    candidates: CalibrationQuestionCandidate[];
    consistencyContext?: ExplanationConsistencyContext;
}): string[] {
    const weighted = new Map<string, number>();
    for (const candidate of params.candidates) {
        const score = weighted.get(candidate.consistency_key) ?? 0;
        weighted.set(candidate.consistency_key, score + toQuestionValue(candidate));
    }
    const preferred = params.consistencyContext?.preferredUncertaintyKey
        ? normalizeConsistencyText(params.consistencyContext.preferredUncertaintyKey)
        : "";
    const ranked = Array.from(weighted.entries()).sort((left, right) => right[1] - left[1]);
    if (preferred && ranked.some(([key]) => key === preferred)) {
        return [preferred, ...ranked.filter(([key]) => key !== preferred).map(([key]) => key)];
    }
    return ranked.map(([key]) => key);
}

function filterCandidatesByConsistency(params: {
    candidates: CalibrationQuestionCandidate[];
    consistencyContext?: ExplanationConsistencyContext;
}): CalibrationQuestionCandidate[] {
    const excludedKeys = new Set(
        (params.consistencyContext?.excludedConsistencyKeys ?? [])
            .map((item) => normalizeConsistencyText(item))
            .filter((item) => item.length > 0),
    );
    if (excludedKeys.size === 0) return params.candidates;
    return params.candidates.filter((candidate) => !excludedKeys.has(candidate.consistency_key));
}

function resolvePrimaryUncertaintyKey(params: {
    candidates: CalibrationQuestionCandidate[];
    consistencyContext?: ExplanationConsistencyContext;
}): string | null {
    return rankThemeKeys(params)[0] ?? null;
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
        const normalizedHint = normalizeKey(hint.replace(/_/g, " "));
        if (!normalizedHint) continue;
        if (normalizedText.includes(normalizedHint)) {
            score += 0.7;
            continue;
        }
        const hintTokens = normalizedHint.split(" ").filter(Boolean);
        if (hintTokens.length === 0) continue;
        const matchedTokens = hintTokens.filter((token) => normalizedText.includes(token)).length;
        if (matchedTokens > 0) {
            score += matchedTokens / hintTokens.length;
        }
    }
    return Number(clamp(score / Math.max(1, hints.length), 0, 1).toFixed(4));
}

export function isQuestionEligibleForCurrentJD(requirement: CalibrationQuestionCandidate): boolean {
    const highImportance = requirement.importance === "critical" || requirement.importance === "important";
    const unresolved = requirement.match_status === "partial"
        || requirement.match_status === "weak"
        || requirement.match_status === "missing";
    const explicitOrNearExplicit = requirement.jd_explicit_or_repeated || requirement.jd_evidence_strength >= 0.5;
    const materiallyMovesConfidence = requirement.importance === "critical"
        || requirement.match_status === "missing"
        || requirement.match_status === "weak"
        || requirement.jd_evidence_strength >= 0.62;
    const broadButWeak = requirement.broad_family
        && requirement.importance !== "critical"
        && requirement.jd_evidence_strength < 0.72;
    const roleIdentityTooWeak = requirement.importance !== "critical"
        && requirement.role_identity_relevance < 0.34;
    const domainTooWeak = requirement.importance !== "critical"
        && requirement.domain_anchor_relevance < 0.24
        && requirement.specialization_hint_score < 0.22;
    const genericLayerTooWeak = requirement.interpretation_layer === "generic"
        && requirement.importance !== "critical";
    return highImportance
        && unresolved
        && explicitOrNearExplicit
        && requirement.role_specific
        && materiallyMovesConfidence
        && !roleIdentityTooWeak
        && !domainTooWeak
        && !genericLayerTooWeak
        && !broadButWeak;
}

function computeAngleWeight(params: {
    candidate: CalibrationQuestionCandidate;
    angle: QuestionAngle;
    roleIdentity?: RoleIdentity;
}): number {
    const normalized = normalizeText(params.candidate.display_name);
    const domainFamily = params.roleIdentity?.domainAnchor.domainFamily;
    const marketingMeasurement = /\b(marketing|campaign|media|measurement|attribution|incrementality|mmm)\b/.test(normalized);
    const productExperimentation = /\b(product|experiment|experimentation|feature|retention|activation)\b/.test(normalized);
    const platformData = /\b(data platform|bi|reporting|pipeline|warehouse|semantic|migration)\b/.test(normalized);
    const stakeholder = /\b(stakeholder|client|cross functional|executive|alignment)\b/.test(normalized);

    if (params.angle === "ownership") return 1.35;
    if (params.angle === "decision_impact") {
        if (marketingMeasurement || productExperimentation || /\b(commercial|revenue|growth|pricing|profit)\b/.test(normalized)) {
            return 1.22;
        }
        return 1.02;
    }
    if (params.angle === "stakeholder_context") {
        if (stakeholder || domainFamily === "consulting") return 1.16;
        if (domainFamily === "marketing" || domainFamily === "product") return 1.08;
        return 0.78;
    }
    if (params.angle === "specialization_depth") {
        if (marketingMeasurement || productExperimentation || platformData) return 1.24;
        if (params.candidate.interpretation_layer === "domain_defining") return 1.08;
        return 0.72;
    }
    return 1;
}

function selectQuestionAngles(params: {
    candidate: CalibrationQuestionCandidate;
    roleIdentity?: RoleIdentity;
}): QuestionAngle[] {
    const normalized = normalizeText(params.candidate.display_name);
    const domainFamily = params.roleIdentity?.domainAnchor.domainFamily;
    const hasStakeholder = /\b(stakeholder|client|cross functional|executive|alignment|partner)\b/.test(normalized);
    const hasSpecialization =
        params.candidate.interpretation_layer !== "work_mode"
        || params.candidate.domain_anchor_relevance >= 0.4
        || /\b(mmm|attribution|incrementality|measurement|experiment|reporting|bi|platform|migration|governance)\b/.test(normalized);

    const angles: QuestionAngle[] = ["ownership", "decision_impact"];
    if (hasSpecialization) {
        angles.push("specialization_depth");
    }
    if (hasStakeholder || domainFamily === "marketing" || domainFamily === "product" || domainFamily === "consulting") {
        angles.push("stakeholder_context");
    }
    return Array.from(new Set(angles))
        .sort((left, right) => {
            return computeAngleWeight({
                candidate: params.candidate,
                angle: right,
                roleIdentity: params.roleIdentity,
            }) - computeAngleWeight({
                candidate: params.candidate,
                angle: left,
                roleIdentity: params.roleIdentity,
            });
        })
        .slice(0, 3);
}

function toQuestionText(params: {
    area: string;
    angle: QuestionAngle;
    roleIdentity?: RoleIdentity;
}): string {
    const normalized = normalizeText(params.area);
    const domainFamily = params.roleIdentity?.domainAnchor.domainFamily;
    const topSpecialization = params.roleIdentity?.domainAnchor.specializationHints[0] ?? null;
    const hasMarketingSignal = /\b(marketing|campaign|media|measurement|attribution|incrementality|mmm)\b/.test(normalized);
    const hasProductSignal = /\b(product|feature|retention|activation|experiment|experimentation)\b/.test(normalized);
    const hasDataSignal = /\b(data platform|pipeline|warehouse|bi|reporting|semantic|migration)\b/.test(normalized);
    const hasConsultingSignal = /\b(client|advisory|consulting|transformation)\b/.test(normalized);
    const genericAnalyticsArea = /\b(analytics|analysis|insight|reporting|measurement)\b/.test(normalized);
    const isMarketing = hasMarketingSignal;
    const isProduct = hasProductSignal;
    const isData = hasDataSignal;
    const isConsulting = hasConsultingSignal;

    if (params.angle === "ownership") {
        if (isMarketing) {
            return "Have you directly owned MMM, attribution, or campaign measurement analysis end to end?";
        }
        if (isProduct) {
            return "Have you directly owned product analytics or experimentation decisions end to end?";
        }
        if (isData) {
            return "Have you directly owned BI, reporting, or data platform delivery decisions end to end?";
        }
        if (isConsulting) {
            return "Have you directly owned client advisory workstreams from diagnosis through recommendation delivery?";
        }
        return `Have you directly owned ${params.area.toLowerCase()} end to end with clear accountability?`;
    }

    if (params.angle === "decision_impact") {
        if (isMarketing) {
            return "Have you used analytics to influence campaign investment or optimization decisions?";
        }
        if (!isMarketing && domainFamily === "marketing" && genericAnalyticsArea) {
            return "Have you used reporting insights to influence campaign investment or optimization decisions?";
        }
        if (isProduct) {
            return "Have you used analytics to influence roadmap, experiment, or product growth decisions?";
        }
        if (!isProduct && domainFamily === "product" && genericAnalyticsArea) {
            return "Have you used reporting insights to influence roadmap or experimentation decisions?";
        }
        if (/\b(commercial|revenue|growth|pricing|profit)\b/.test(normalized)) {
            return "Have you directly influenced commercial or revenue decisions using analytics?";
        }
        return `Have you used ${params.area.toLowerCase()} work to directly influence business decisions?`;
    }

    if (params.angle === "stakeholder_context") {
        if (isMarketing) {
            return "Have you partnered directly with marketing stakeholders on campaign effectiveness or measurement decisions?";
        }
        if (!isMarketing && domainFamily === "marketing" && genericAnalyticsArea) {
            return "Have you partnered directly with marketing stakeholders to turn reporting insights into campaign decisions?";
        }
        if (isProduct) {
            return "Have you partnered directly with product and engineering stakeholders on analytics decisions?";
        }
        if (!isProduct && domainFamily === "product" && genericAnalyticsArea) {
            return "Have you partnered directly with product and engineering stakeholders to turn insights into product decisions?";
        }
        if (isConsulting) {
            return "Have you worked directly with client stakeholders to align analytics-driven recommendations?";
        }
        if (domainFamily === "consulting") {
            return "Have you worked directly with client stakeholders to align analytics-driven recommendations?";
        }
        return `Have you worked directly with senior stakeholders on ${params.area.toLowerCase()} decisions?`;
    }

    if (topSpecialization === "legal") {
        return "Have you delivered this work directly inside legal workflows with legal stakeholders?";
    }
    if (isMarketing) {
        return "Have you owned MMM, attribution, or incrementality analysis in a live campaign environment?";
    }
    if (!isMarketing && domainFamily === "marketing" && genericAnalyticsArea) {
        return "Have you owned campaign measurement reporting that informed MMM or attribution decisions?";
    }
    if (isProduct) {
        return "Have you owned experiment measurement design or product analytics frameworks in production?";
    }
    if (!isProduct && domainFamily === "product" && genericAnalyticsArea) {
        return "Have you owned product analytics reporting that informed experimentation decisions in production?";
    }
    if (isData) {
        return "Have you led BI/reporting or data platform changes in production across multiple teams?";
    }
    return `Have you delivered hands-on ${params.area.toLowerCase()} work in a live business context?`;
}

function buildQuestionDraftsForCandidate(params: {
    candidate: CalibrationQuestionCandidate;
    roleIdentity?: RoleIdentity;
    primaryThemeKey: string | null;
}): CalibrationQuestionDraft[] {
    const candidateValue = toQuestionValue(params.candidate);
    const angles = selectQuestionAngles({
        candidate: params.candidate,
        roleIdentity: params.roleIdentity,
    });
    return angles.map((angle) => {
        const question = toQuestionText({
            area: params.candidate.display_name,
            angle,
            roleIdentity: params.roleIdentity,
        });
        const angleWeight = computeAngleWeight({
            candidate: params.candidate,
            angle,
            roleIdentity: params.roleIdentity,
        });
        const primaryThemeBonus = params.primaryThemeKey && params.candidate.consistency_key === params.primaryThemeKey
            ? 1.4
            : 0;
        return {
            questionId: toQuestionId(params.candidate.consistency_key, angle),
            question,
            semanticKey: toQuestionSemanticKey(question),
            angle,
            consistencyKey: params.candidate.consistency_key,
            targetArea: params.candidate.display_name,
            sourceRequirementId: params.candidate.source_requirement_id,
            interpretationLayer: params.candidate.interpretation_layer,
            importance: params.candidate.importance,
            candidateSupportLevel: toUnresolvedSupportLevel(params.candidate.match_status),
            domainRelevance: params.candidate.domain_anchor_relevance,
            roleRelevance: params.candidate.role_identity_relevance,
            score: Number((candidateValue + (angleWeight * 2.1) + primaryThemeBonus).toFixed(4)),
            selectionReason: params.primaryThemeKey && params.candidate.consistency_key === params.primaryThemeKey
                ? `primary_theme:${angle}`
                : `secondary_theme:${angle}`,
            displayReason: `${params.candidate.display_reason}|question_angle:${angle}|answerability:${toQuestionAnswerability(params.candidate).toFixed(3)}|impact:${toExpectedCalibrationImpact(params.candidate).toFixed(3)}`,
        } satisfies CalibrationQuestionDraft;
    });
}

function buildQuestionDraftPool(params: {
    candidates: CalibrationQuestionCandidate[];
    roleIdentity?: RoleIdentity;
    primaryThemeKey: string | null;
}): CalibrationQuestionDraft[] {
    const deduped = new Map<string, CalibrationQuestionDraft>();
    for (const candidate of params.candidates) {
        for (const draft of buildQuestionDraftsForCandidate({
            candidate,
            roleIdentity: params.roleIdentity,
            primaryThemeKey: params.primaryThemeKey,
        })) {
            const existing = deduped.get(draft.questionId);
            if (!existing || draft.score > existing.score) {
                deduped.set(draft.questionId, draft);
            }
        }
    }
    return Array.from(deduped.values()).sort((left, right) => right.score - left.score);
}

function selectQuestionDrafts(params: {
    drafts: CalibrationQuestionDraft[];
    answerById: Map<string, CalibrationAnswerValue>;
    maxQuestions: number;
    primaryThemeKey: string | null;
    rankedThemeKeys: string[];
}): CalibrationQuestionDraft[] {
    const selected: CalibrationQuestionDraft[] = [];
    const selectedIds = new Set<string>();
    const selectedSemantic = new Set<string>();
    const targetPrimaryCount = Math.min(2, params.maxQuestions);
    const isPrimary = (draft: CalibrationQuestionDraft): boolean => {
        return Boolean(params.primaryThemeKey) && draft.consistencyKey === params.primaryThemeKey;
    };
    const addDraft = (draft: CalibrationQuestionDraft): void => {
        if (selected.length >= params.maxQuestions) return;
        if (selectedIds.has(draft.questionId)) return;
        if (draft.semanticKey && selectedSemantic.has(draft.semanticKey)) return;
        selected.push(draft);
        selectedIds.add(draft.questionId);
        if (draft.semanticKey) selectedSemantic.add(draft.semanticKey);
    };
    const answered = params.drafts
        .filter((draft) => params.answerById.has(draft.questionId))
        .sort((left, right) => right.score - left.score);
    const unanswered = params.drafts
        .filter((draft) => !params.answerById.has(draft.questionId))
        .sort((left, right) => right.score - left.score);

    for (const draft of answered.filter(isPrimary)) addDraft(draft);
    for (const draft of unanswered.filter(isPrimary)) addDraft(draft);

    if (selected.filter(isPrimary).length < targetPrimaryCount) {
        for (const draft of [...answered, ...unanswered].filter(isPrimary)) {
            addDraft(draft);
            if (selected.filter(isPrimary).length >= targetPrimaryCount) break;
        }
    }

    if (selected.length < params.maxQuestions) {
        for (const themeKey of params.rankedThemeKeys.filter((key) => key !== params.primaryThemeKey)) {
            const themed = [...answered, ...unanswered].filter((draft) => draft.consistencyKey === themeKey);
            const beforeCount = selected.length;
            for (const draft of themed) {
                addDraft(draft);
                if (selected.length >= params.maxQuestions) break;
            }
            if (selected.length >= params.maxQuestions) break;
            if (selected.length > beforeCount) break;
        }
    }

    if (selected.length < params.maxQuestions) {
        for (const draft of [...answered, ...unanswered]) {
            addDraft(draft);
            if (selected.length >= params.maxQuestions) break;
        }
    }

    return selected
        .sort((left, right) => {
            const leftPrimary = isPrimary(left) ? 1 : 0;
            const rightPrimary = isPrimary(right) ? 1 : 0;
            if (rightPrimary !== leftPrimary) return rightPrimary - leftPrimary;
            const leftAnswered = params.answerById.has(left.questionId) ? 1 : 0;
            const rightAnswered = params.answerById.has(right.questionId) ? 1 : 0;
            if (rightAnswered !== leftAnswered) return rightAnswered - leftAnswered;
            return right.score - left.score;
        })
        .slice(0, params.maxQuestions);
}

export function buildApplyRecommendation(score: number): ApplyRecommendation {
    const normalizedScore = Math.round(clamp(score, 0, 100));
    const band: ApplyRecommendation["band"] = normalizedScore >= 80
        ? "strong"
        : normalizedScore >= 60
            ? "consider"
            : "weak";
    return {
        score: normalizedScore,
        band,
    };
}

function collectQuestionCandidates(params: {
    matchResult: CapabilityMatchV2Result;
    roleIdentity?: RoleIdentity;
}): CalibrationQuestionCandidate[] {
    const matchResult = params.matchResult;
    const clusterById = new Map(
        matchResult.audit.requirement_clusters.map((cluster) => [cluster.cluster_id, cluster]),
    );
    const rankingById = new Map(
        matchResult.audit.capability_ranking_adjustments.map((item) => [item.cluster_id, item]),
    );
    const candidates: CalibrationQuestionCandidate[] = [];
    for (const breakdown of matchResult.audit.requirement_to_candidate_match_breakdown) {
        if (breakdown.importance !== "critical" && breakdown.importance !== "important") continue;
        if (breakdown.match_status !== "partial" && breakdown.match_status !== "weak" && breakdown.match_status !== "missing") {
            continue;
        }

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
        const jdExplicitOrRepeated =
            literalSignalCount >= 2
            || breakdown.literal_overlap_score >= 0.52
            || (cluster?.explicit_signal_count ?? 0) >= 1
            || repeatedSignalUnits >= 2
            || sectionCoverage >= 2
            || highWeightSignalUnits >= 1;
        const broadFamily = Boolean(ranking?.broad_family || cluster?.genericity === "broad");
        const roleSpecific =
            (ranking?.role_discrimination_score ?? 0) >= 0.5
            || (cluster?.role_signal_coherence ?? 0) >= 0.48
            || (cluster?.specificity_score ?? 0) >= 0.5
            || (!broadFamily && literalSignalCount >= 2);

        const source = breakdown.match_status === "missing" || breakdown.match_status === "weak"
            ? "gap"
            : "partial";
        const displayReason = [
            jdExplicitOrRepeated ? "explicit_or_repeated_jd_signal" : "weak_jd_signal",
            roleSpecific ? "role_specific_requirement" : "low_role_specificity",
            broadFamily ? "broad_family_detected" : "non_broad_family",
        ].join("|");
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

        candidates.push({
            source_requirement_id: breakdown.cluster_id,
            canonical_name: breakdown.cluster_id,
            display_name: breakdown.display_name,
            importance: breakdown.importance,
            match_status: breakdown.match_status,
            source,
            jd_evidence_strength: jdEvidenceStrength,
            jd_explicit_or_repeated: jdExplicitOrRepeated,
            role_specific: roleSpecific,
            broad_family: broadFamily,
            role_identity_relevance: roleIdentityRelevance,
            domain_anchor_relevance: domainAnchorRelevance,
            specialization_hint_score: specializationHintScore,
            interpretation_layer: interpretation.layer,
            interpretation_layer_score: interpretation.score,
            consistency_key: getClusterConsistencyKey({
                displayName: breakdown.display_name,
                sourceRequirementId: breakdown.cluster_id,
            }),
            display_reason: `${displayReason}|interpretation_layer:${interpretation.layer}`,
        });
    }

    const deduped = new Map<string, CalibrationQuestionCandidate>();
    for (const candidate of candidates) {
        const key = normalizeKey(candidate.display_name);
        const existing = deduped.get(key);
        if (!existing) {
            deduped.set(key, candidate);
            continue;
        }
        const existingScore = toQuestionPriority(existing);
        const nextScore = toQuestionPriority(candidate);
        if (nextScore > existingScore) {
            deduped.set(key, candidate);
        }
    }
    return Array.from(deduped.values())
        .filter(isQuestionEligibleForCurrentJD)
        .sort((left, right) => {
            const leftPriority = toQuestionPriority(left);
            const rightPriority = toQuestionPriority(right);
            if (rightPriority !== leftPriority) return rightPriority - leftPriority;
            return left.display_name.localeCompare(right.display_name);
        });
}

export function buildCalibrationQuestions(params: {
    matchResult: CapabilityMatchV2Result;
    existingAnswers?: JobCalibrationAnswer[];
    roleIdentity?: RoleIdentity;
    specializationContext?: SpecializationExplanationContext;
    maxQuestions?: number;
    consistencyContext?: ExplanationConsistencyContext;
}): {
    required: boolean;
    questions: JobCalibrationQuestion[];
} {
    const maxQuestions = clamp(params.maxQuestions ?? 3, 0, 3);
    const existingAnswers = normalizeAnswers(params.existingAnswers ?? []);
    const answerById = new Map(existingAnswers.map((item) => [item.question_id, item.answer]));
    const specializationQuestions = buildSpecializationCalibrationQuestions({
        specializationContext: params.specializationContext,
        answerById,
        maxQuestions,
    });
    if (specializationQuestions.length > 0) {
        return {
            required: true,
            questions: specializationQuestions,
        };
    }
    const rawCandidates = collectQuestionCandidates({
        matchResult: params.matchResult,
        roleIdentity: params.roleIdentity,
    });
    const candidates = filterCandidatesByConsistency({
        candidates: rawCandidates,
        consistencyContext: params.consistencyContext,
    });
    if (candidates.length === 0 || maxQuestions === 0) {
        return { required: false, questions: [] };
    }

    const confidenceResolved = params.matchResult.score_confidence === "high"
        && params.matchResult.score_breakdown.missing_critical_count === 0
        && params.matchResult.overall_match_score >= 0.8;
    if (confidenceResolved) {
        return { required: false, questions: [] };
    }

    const primaryUncertaintyKey = resolvePrimaryUncertaintyKey({
        candidates,
        consistencyContext: params.consistencyContext,
    });
    const rankedThemeKeys = rankThemeKeys({
        candidates,
        consistencyContext: params.consistencyContext,
    });
    const draftPool = buildQuestionDraftPool({
        candidates,
        roleIdentity: params.roleIdentity,
        primaryThemeKey: primaryUncertaintyKey,
    });
    const selectedDrafts = selectQuestionDrafts({
        drafts: draftPool,
        answerById,
        maxQuestions,
        primaryThemeKey: primaryUncertaintyKey,
        rankedThemeKeys,
    });
    const questions = selectedDrafts.map((draft) => {
        return {
            id: draft.questionId,
            question: draft.question,
            target_area: draft.targetArea,
            importance: draft.importance,
            answer: answerById.get(draft.questionId) ?? null,
        };
    });

    logJobCopilotDebug(
        "calibration_question_provenance",
        selectedDrafts.map((draft) => ({
            sourceRequirementId: draft.sourceRequirementId,
            consistencyKey: draft.consistencyKey,
            jdImportance: draft.importance,
            candidateSupportLevel: draft.candidateSupportLevel,
            interpretationLayer: draft.interpretationLayer,
            roleIdentityRelevance: draft.roleRelevance,
            roleIdentity: params.roleIdentity ? toRoleIdentityLabel(params.roleIdentity.primaryRoleType) : null,
            questionId: draft.questionId,
            question: draft.question,
            questionAngle: draft.angle,
            primaryUncertaintyThemeKey: primaryUncertaintyKey,
            selectionReason: draft.selectionReason,
            displayReason: draft.displayReason,
        })),
    );

    return {
        required: questions.length > 0,
        questions,
    };
}

export function buildCalibrationQuestionSelectionAudit(params: {
    matchResult: CapabilityMatchV2Result;
    existingAnswers?: JobCalibrationAnswer[];
    roleIdentity?: RoleIdentity;
    specializationContext?: SpecializationExplanationContext;
    maxQuestions?: number;
    consistencyContext?: ExplanationConsistencyContext;
}): {
    selectedQuestionIds: string[];
    selectedTargetAreas: string[];
    primaryUncertaintyThemeKey: string | null;
    candidates: CalibrationQuestionSelectionAuditCandidate[];
} {
    const maxQuestions = clamp(params.maxQuestions ?? 3, 0, 3);
    const existingAnswers = normalizeAnswers(params.existingAnswers ?? []);
    const specializationSelectionAudit = buildSpecializationCalibrationSelectionAudit({
        specializationContext: params.specializationContext,
        maxQuestions,
    });
    if (specializationSelectionAudit) {
        return specializationSelectionAudit;
    }
    const answerById = new Map(existingAnswers.map((item) => [item.question_id, item.answer]));
    const rawCandidates = collectQuestionCandidates({
        matchResult: params.matchResult,
        roleIdentity: params.roleIdentity,
    });
    const candidates = filterCandidatesByConsistency({
        candidates: rawCandidates,
        consistencyContext: params.consistencyContext,
    });
    if (candidates.length === 0 || maxQuestions === 0) {
        return {
            selectedQuestionIds: [],
            selectedTargetAreas: [],
            primaryUncertaintyThemeKey: null,
            candidates: [],
        };
    }
    const primaryUncertaintyThemeKey = resolvePrimaryUncertaintyKey({
        candidates,
        consistencyContext: params.consistencyContext,
    });
    const rankedThemeKeys = rankThemeKeys({
        candidates,
        consistencyContext: params.consistencyContext,
    });
    const draftPool = buildQuestionDraftPool({
        candidates,
        roleIdentity: params.roleIdentity,
        primaryThemeKey: primaryUncertaintyThemeKey,
    });
    const selectedDrafts = selectQuestionDrafts({
        drafts: draftPool,
        answerById,
        maxQuestions,
        primaryThemeKey: primaryUncertaintyThemeKey,
        rankedThemeKeys,
    });
    const selectedIdSet = new Set(selectedDrafts.map((draft) => draft.questionId));
    return {
        selectedQuestionIds: Array.from(selectedIdSet),
        selectedTargetAreas: selectedDrafts.map((draft) => draft.targetArea),
        primaryUncertaintyThemeKey,
        candidates: draftPool.map((draft) => {
            const questionId = draft.questionId;
            const selected = selectedIdSet.has(questionId);
            return {
                sourceRequirementId: draft.sourceRequirementId,
                questionId,
                targetArea: draft.targetArea,
                angle: draft.angle,
                consistencyKey: draft.consistencyKey,
                interpretationLayer: draft.interpretationLayer,
                score: draft.score,
                jdImportance: draft.importance,
                candidateSupportLevel: draft.candidateSupportLevel,
                domainRelevance: Number(draft.domainRelevance.toFixed(4)),
                roleRelevance: Number(draft.roleRelevance.toFixed(4)),
                selected,
                selectionReason: selected ? draft.selectionReason : `not_selected:${draft.selectionReason}`,
                displayReason: draft.displayReason,
            };
        }),
    };
}

function normalizeAnswers(answers: JobCalibrationAnswer[]): JobCalibrationAnswer[] {
    const byId = new Map<string, CalibrationAnswerValue>();
    for (const item of answers) {
        if (!item?.question_id) continue;
        if (item.answer !== "yes" && item.answer !== "no") continue;
        byId.set(item.question_id, item.answer);
    }
    return Array.from(byId.entries()).map(([question_id, answer]) => ({ question_id, answer }));
}

function buildSpecializationCalibrationQuestions(params: {
    specializationContext?: SpecializationExplanationContext;
    answerById: Map<string, CalibrationAnswerValue>;
    maxQuestions: number;
}): JobCalibrationQuestion[] {
    const resolvedSpecialization = resolveExplanationSpecialization(params.specializationContext?.topSpecialization);
    if (!resolvedSpecialization) return [];
    const template = getSpecializationExplanationTemplate(resolvedSpecialization);
    if (!template) return [];
    const selectedQuestions = template.calibration_questions.slice(0, params.maxQuestions);
    const targetArea = toSpecializationLabel(resolvedSpecialization);
    const importanceByIndex: JobCalibrationQuestion["importance"][] = ["critical", "important", "important"];
    return selectedQuestions.map((question, index) => {
        const id = `cal_spec_${resolvedSpecialization}_${index + 1}`;
        return {
            id,
            question,
            target_area: targetArea,
            importance: importanceByIndex[index] ?? "important",
            answer: params.answerById.get(id) ?? null,
        };
    });
}

function buildSpecializationCalibrationSelectionAudit(params: {
    specializationContext?: SpecializationExplanationContext;
    maxQuestions: number;
}): {
    selectedQuestionIds: string[];
    selectedTargetAreas: string[];
    primaryUncertaintyThemeKey: string | null;
    candidates: CalibrationQuestionSelectionAuditCandidate[];
} | null {
    const resolvedSpecialization = resolveExplanationSpecialization(params.specializationContext?.topSpecialization);
    if (!resolvedSpecialization) return null;
    const template = getSpecializationExplanationTemplate(resolvedSpecialization);
    if (!template) return null;
    const targetArea = toSpecializationLabel(resolvedSpecialization);
    const selectedQuestions = template.calibration_questions.slice(0, params.maxQuestions);
    return {
        selectedQuestionIds: selectedQuestions.map((_, index) => `cal_spec_${resolvedSpecialization}_${index + 1}`),
        selectedTargetAreas: selectedQuestions.map(() => targetArea),
        primaryUncertaintyThemeKey: resolvedSpecialization,
        candidates: selectedQuestions.map((_, index) => {
            const questionId = `cal_spec_${resolvedSpecialization}_${index + 1}`;
            return {
                sourceRequirementId: `specialization:${resolvedSpecialization}`,
                questionId,
                targetArea,
                angle: "specialization_depth",
                consistencyKey: resolvedSpecialization,
                interpretationLayer: "domain_defining",
                score: Number((100 - index).toFixed(4)),
                jdImportance: index === 0 ? "critical" : "important",
                candidateSupportLevel: "partial",
                domainRelevance: 1,
                roleRelevance: 1,
                selected: true,
                selectionReason: "selected_by_specialization_template",
                displayReason: "specialization_template_question",
            };
        }),
    };
}

export function applyCalibrationAnswers(params: {
    baseScore: number;
    questions: JobCalibrationQuestion[];
    answers: JobCalibrationAnswer[];
}): {
    applyRecommendation: ApplyRecommendation;
    calibration: JobCalibrationState;
} {
    const normalizedAnswers = normalizeAnswers(params.answers);
    const answerById = new Map(normalizedAnswers.map((item) => [item.question_id, item.answer]));
    const questions = params.questions.map((question) => ({
        ...question,
        answer: answerById.get(question.id) ?? null,
    }));

    let scoreDelta = 0;
    const confirmedStrengthAreas: string[] = [];
    const confirmedRiskAreas: string[] = [];
    for (const question of questions) {
        const answer = question.answer;
        if (!answer) continue;
        const weight = toImportanceWeight(question.importance);
        if (answer === "yes") {
            scoreDelta += weight * 0.9;
            confirmedStrengthAreas.push(question.target_area);
        } else {
            scoreDelta -= weight * 1.1;
            confirmedRiskAreas.push(question.target_area);
        }
    }

    const calibratedScore = clamp(params.baseScore + scoreDelta, 0, 100);
    const answeredCount = normalizedAnswers.length;
    return {
        applyRecommendation: buildApplyRecommendation(calibratedScore),
        calibration: {
            required: questions.length > 0,
            questions,
            answers: normalizedAnswers,
            answered_count: answeredCount,
            total_questions: questions.length,
            recalibrated: answeredCount > 0,
            score_delta: Number(scoreDelta.toFixed(2)),
            confirmed_strength_areas: Array.from(new Set(confirmedStrengthAreas)),
            confirmed_risk_areas: Array.from(new Set(confirmedRiskAreas)),
        },
    };
}
