export type JobAnalysisFitLevel = "strong" | "moderate" | "stretch" | "low";
export type JobAnalysisConfidence = "high" | "medium" | "low";
export type JobAnalysisProfileQuality = "strong" | "usable" | "sparse" | "empty";
export type ApplyRecommendationBand = "strong" | "consider" | "weak";
export type CalibrationAnswerValue = "yes" | "no";

export type ApplyRecommendation = {
    score: number;
    band: ApplyRecommendationBand;
};

export type JobCalibrationQuestion = {
    id: string;
    question: string;
    target_area: string;
    importance: "critical" | "important" | "supporting";
    answer?: CalibrationAnswerValue | null;
};

export type JobCalibrationAnswer = {
    question_id: string;
    answer: CalibrationAnswerValue;
};

export type JobCalibrationState = {
    required: boolean;
    questions: JobCalibrationQuestion[];
    answers: JobCalibrationAnswer[];
    answered_count: number;
    total_questions: number;
    recalibrated: boolean;
    score_delta: number;
    confirmed_strength_areas: string[];
    confirmed_risk_areas: string[];
};

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
    apply_recommendation?: ApplyRecommendation;
    career_insight?: string;
    why_fit?: string[];
    potential_risks?: string[];
    positioning_hints?: string[];
    calibration?: JobCalibrationState;
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
