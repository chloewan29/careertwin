import type {
    JobAnalysisRisk,
    JobAnalysisConfidence,
    JobAnalysisEvidenceHighlight,
    JobAnalysisFitLevel,
    JobAnalysisProfileQuality,
    JobAnalysisSystemNotice,
    JobAnalysisTailoringDecision,
    JobCopilotAnalysis,
} from "@/lib/career-engine/job-copilot/job-analysis";
import { evaluateAtsTitleRisk } from "@/lib/career-engine/job-copilot/ats-risk-evaluator";
import { mapCapabilitiesForDisplay } from "@/lib/career-engine/job-copilot/capability-display-map";
import { buildMatchExplanation } from "@/lib/career-engine/job-copilot/match-explanation-engine";

export function getFitLevelFromMatchScore(matchScore: number): JobAnalysisFitLevel {
    if (matchScore >= 75) return "strong";
    if (matchScore >= 50) return "moderate";
    if (matchScore >= 42) return "stretch";
    return "low";
}

export function getTailoringDecisionFromFitLevel(
    fitLevel: JobAnalysisFitLevel,
    reasoning?: string,
): JobAnalysisTailoringDecision {
    if (fitLevel === "strong" || fitLevel === "moderate") {
        return {
            allowed: true,
            status: "ready",
            message: "Tailored CV is ready for this role.",
            reasoning,
        };
    }
    if (fitLevel === "stretch") {
        return {
            allowed: true,
            status: "stretch",
            message: "Tailored CV is available for this role, but it needs a narrative-forward positioning. Review key gaps before applying.",
            reasoning,
        };
    }
    return {
        allowed: false,
        status: "not_recommended",
        message: "Tailored CV is not recommended for this role due to low match.",
        reasoning,
    };
}

export function getTailoringDecisionFromMatchScore(matchScore: number, reasoning?: string): JobAnalysisTailoringDecision {
    return getTailoringDecisionFromFitLevel(getFitLevelFromMatchScore(matchScore), reasoning);
}

function buildInterpretationNote(params: {
    fitLevel: JobAnalysisFitLevel;
    scoreConfidence: JobAnalysisConfidence;
    jobProfileQuality: JobAnalysisProfileQuality;
}): string {
    if (params.fitLevel === "strong" && params.scoreConfidence === "high") {
        return "Strong fit with high confidence from current extracted job signals.";
    }
    if (params.jobProfileQuality === "usable") {
        return "Moderate precision: the job profile is usable but not fully complete.";
    }
    if (params.jobProfileQuality === "sparse") {
        return "Limited-signal interpretation: job extraction is sparse and likely incomplete.";
    }
    if (params.jobProfileQuality === "empty") {
        return "Very limited-signal interpretation: job extraction is effectively empty.";
    }
    return "Deterministic fit interpretation based on current match, confidence, and profile quality.";
}

function buildSystemNotices(params: {
    jobProfileQuality: JobAnalysisProfileQuality;
    weakJobSignals: boolean;
    fitLevel: JobAnalysisFitLevel;
}): JobAnalysisSystemNotice[] {
    const notices: JobAnalysisSystemNotice[] = [];
    if (params.jobProfileQuality === "empty") {
        notices.push({
            code: "empty_extraction",
            level: "critical",
            message: "Job profile extraction is empty; diagnostics are based on very limited signals.",
        });
    } else if (params.jobProfileQuality === "sparse") {
        notices.push({
            code: "sparse_extraction",
            level: "warning",
            message: "Job profile extraction is sparse; capability coverage may be incomplete.",
        });
    }
    if (params.weakJobSignals) {
        notices.push({
            code: "weak_job_signals",
            level: "warning",
            message: "Job description quality is weak, reducing confidence in this analysis.",
        });
    }
    if (params.fitLevel === "stretch") {
        notices.push({
            code: "stretch_fit_caution",
            level: "info",
            message: "This role is a stretch fit; use the tailored CV with caution.",
        });
    }
    return notices;
}

export function buildJobCopilotAnalysis(params: {
    matchScore: number;
    scoreConfidence: JobAnalysisConfidence;
    jobProfileQuality: JobAnalysisProfileQuality;
    weakJobSignals: boolean;
    matchedCapabilities: string[];
    keyGaps: string[];
    evidenceHighlights: JobAnalysisEvidenceHighlight[];
    jdTitle: string | null;
    jdRoleFamily: string | null;
    candidateTitles: string[];
    atsRiskReasoning?: string;
    bucketReasoning?: string;
    tailoringReasoning?: string;
    evidenceAlignmentScore?: number;
    titlePriorPenalty?: number;
    titlePriorReasoning?: string | null;
    requiredSkills?: string[];
    responsibilities?: string[];
}): JobCopilotAnalysis {
    const fitLevel = getFitLevelFromMatchScore(params.matchScore);
    const tailoringDecision = getTailoringDecisionFromFitLevel(fitLevel, params.tailoringReasoning);
    const atsRisk: JobAnalysisRisk = evaluateAtsTitleRisk({
        jdTitle: params.jdTitle,
        jdRoleFamily: params.jdRoleFamily,
        candidateTitles: params.candidateTitles,
        evidenceAlignmentScore: params.evidenceAlignmentScore,
        titlePriorPenalty: params.titlePriorPenalty,
        titlePriorReasoning: params.titlePriorReasoning ?? params.atsRiskReasoning ?? null,
    });
    const topMatchedCapabilities = mapCapabilitiesForDisplay(params.matchedCapabilities, 4);
    const keyGaps = mapCapabilitiesForDisplay(params.keyGaps, 3);
    const evidenceHighlights = params.evidenceHighlights.slice(0, 4);
    const atsRisks = [atsRisk];
    const interpretationNote = buildInterpretationNote({
        fitLevel,
        scoreConfidence: params.scoreConfidence,
        jobProfileQuality: params.jobProfileQuality,
    });

    return {
        match_score: Number(params.matchScore.toFixed(2)),
        fit_level: fitLevel,
        score_confidence: params.scoreConfidence,
        job_profile_quality: params.jobProfileQuality,
        interpretation_note: interpretationNote,
        top_matched_capabilities: topMatchedCapabilities,
        key_gaps: keyGaps,
        evidence_highlights: evidenceHighlights,
        ats_risks: atsRisks,
        system_notices: buildSystemNotices({
            jobProfileQuality: params.jobProfileQuality,
            weakJobSignals: params.weakJobSignals,
            fitLevel,
        }),
        tailoring_decision: tailoringDecision,
        match_explanation: buildMatchExplanation({
            matchScore: params.matchScore,
            fitLevel,
            topMatchedCapabilities,
            keyGaps,
            atsRisks,
            evidenceHighlights,
            jobProfileQuality: params.jobProfileQuality,
            scoreConfidence: params.scoreConfidence,
            interpretationNote,
            jdTitle: params.jdTitle,
            jdRoleFamily: params.jdRoleFamily,
            requiredSkills: params.requiredSkills,
            responsibilities: params.responsibilities,
        }),
        bucket_reasoning: params.bucketReasoning,
    };
}
