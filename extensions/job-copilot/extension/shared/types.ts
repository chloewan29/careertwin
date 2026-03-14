export type JobAnalysisFitLevel = "strong" | "moderate" | "stretch" | "low";
export type JobAnalysisConfidence = "high" | "medium" | "low";
export type JobAnalysisProfileQuality = "strong" | "usable" | "sparse" | "empty";

export type JobAnalysisEvidenceHighlight = {
    evidencePieceId: string;
    label: string;
    score?: number;
};

export type JobAnalysisRisk = {
    type: "title_mismatch";
    level: "low" | "medium" | "high";
    message: string;
    reasoning?: string;
};

export type JobAnalysisSystemNotice = {
    code: "weak_job_signals" | "sparse_extraction" | "empty_extraction" | "stretch_fit_caution";
    level: "info" | "warning" | "critical";
    message: string;
};

export type JobAnalysisTailoringDecision = {
    allowed: boolean;
    status: "ready" | "stretch" | "not_recommended";
    message: string;
    reasoning?: string;
};

export type MatchExplanationItem = {
    title: string;
    explanation: string;
};

export type MatchExplanation = {
    verdict_label: "Excellent Match" | "Strong Match" | "Moderate Match" | "Stretch" | "Low Match";
    score: number;
    summary: string;
    strengths: MatchExplanationItem[];
    risks: MatchExplanationItem[];
};

export type JobCopilotAnalysis = {
    match_score: number;
    fit_level: JobAnalysisFitLevel;
    score_confidence: JobAnalysisConfidence;
    job_profile_quality: JobAnalysisProfileQuality;
    interpretation_note: string;
    top_matched_capabilities: string[];
    key_gaps: string[];
    evidence_highlights: JobAnalysisEvidenceHighlight[];
    ats_risks: JobAnalysisRisk[];
    system_notices: JobAnalysisSystemNotice[];
    tailoring_decision: JobAnalysisTailoringDecision;
    match_explanation?: MatchExplanation;
    bucket_reasoning?: string;
};

export type ResumeTailoredResumeArtifact = {
    format: "text/plain";
    download_url: string;
};

export type ResumeTailoringResult = {
    job_analysis: JobCopilotAnalysis;
    tailored_resume_artifact?: ResumeTailoredResumeArtifact;
};
