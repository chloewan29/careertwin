import type { ResumeCopilotPublicOutput } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import type { JobCopilotSource, JobCopilotVerdict } from "@/lib/career-engine/job-copilot/extension-contract";
import type { JobCopilotAnalysis } from "@/lib/career-engine/job-copilot/job-analysis";
import type { JobFitScore, JobFitScoreDebug } from "@/lib/career-engine/job-copilot/job-fit-score-v1";

export type JobCopilotAnalyzeInput = {
    profileId: string;
    source: JobCopilotSource;
    jobUrl: string | null;
    jobTitle: string;
    company: string | null;
    location: string | null;
    jobDescription: string;
    topEvidenceLimit?: number;
};

export type JobCopilotCalibrationAnswerInput = {
    questionId: string;
    answer: "yes" | "no";
};

export type JobCopilotRecalibrateInput = JobCopilotAnalyzeInput & {
    calibrationAnswers: JobCopilotCalibrationAnswerInput[];
};

export type JobCopilotTopEvidenceItem = { evidencePieceId: string; label: string; score?: number };

export type JobCopilotResumePreview = Pick<ResumeCopilotPublicOutput, "summary" | "experience">;

export type JobCopilotApplyRecommendation = {
    score: number;
    band: "strong" | "consider" | "weak";
};

export type JobCopilotResponse = {
    verdict: JobCopilotVerdict;
    matchScore: number;
    verdictText: string;
    applyRecommendation: JobCopilotApplyRecommendation;
    careerInsight: string;
    whyFit: string[];
    risks: string[];
    positioningHints: string[];
    calibrationQuestions: Array<{
        id: string;
        question: string;
        targetArea: string;
        importance: "critical" | "important" | "supporting";
        answer?: "yes" | "no" | null;
    }>;
    calibrationState: {
        required: boolean;
        answeredCount: number;
        totalQuestions: number;
        recalibrated: boolean;
        scoreDelta: number;
    };
    matchedCapabilities: string[];
    keyGaps: string[];
    topEvidence: JobCopilotTopEvidenceItem[];
    job_analysis: JobCopilotAnalysis;
    resume: {
        ready: boolean;
        preview: string | null;
        downloadUrl: string | null;
    };
    scoreExplainability?: {
        model: "job_capability_match_v1" | "job_capability_match_v2";
        capabilityFitScore: number;
        matchedCapabilityCount: number;
        missingCapabilityCount: number;
        supportingEvidenceCount: number;
        weightedCoverageScore: number;
        criticalGapPenalty: number;
        matchedCriticalCount: number;
        missingCriticalCount: number;
        totalJobCapabilityCount: number;
        evidenceRelevanceScore?: number | null;
        weakJdMode: boolean;
        scoreConfidence: "high" | "medium" | "low";
        jobProfileQuality?: "strong" | "usable" | "sparse" | "empty";
        jobProfileQualityReasons?: string[];
        titlePriorUsed?: boolean;
        transferMatchScore?: number;
        evidenceAlignmentScore?: number;
        titlePriorPenalty?: number;
        domainPriorPenalty?: number;
        bucketReasoning?: string;
    };
    diagnostics?: {
        weakJobSignals: boolean;
        fallbackUsed: boolean;
        totalEvidenceConsidered: number;
    };
    jobFitScore: JobFitScore;
    jobFitScoreDebug: JobFitScoreDebug;
};

export type JobCopilotAnalyzeOutput = {
    success: true;
    job: {
        jobId: string;
        canonicalJobId: string;
        jobSnapshotId: number;
        interactionId: number;
        sourcePlatform: JobCopilotSource;
        jobUrl: string | null;
        jobTitle: string;
        company: string | null;
        location: string | null;
        jobDescriptionSnapshot: string;
        selectedEvidenceIds: string[];
    };
    response: JobCopilotResponse;
};

export type JobCopilotDownloadInput = {
    profileId: string;
    jobId: string;
    export_format?: "txt" | "docx";
    jobSnapshotId?: number | null;
    jobTitle?: string | null;
    company?: string | null;
    jobUrl?: string | null;
    sourcePlatform?: JobCopilotSource | null;
    location?: string | null;
    jobDescriptionSnapshot?: string | null;
    matchScore?: number | null;
    verdict?: JobCopilotVerdict | null;
    selectedEvidenceIds?: string[];
    calibrationAnswers?: JobCopilotCalibrationAnswerInput[];
    confirmedStrengthAreas?: string[];
    positioningHints?: string[];
};

export type JobCopilotDownloadDiagnostics = {
    docx_export_requested: boolean;
    docx_export_enabled: boolean;
    docx_export_generated: boolean;
    docx_export_failed: boolean;
    docx_export_failure_reason: string | null;
    docx_export_mime_type: string | null;
    docx_export_file_name: string | null;
    docx_export_source_safe_to_download: boolean;
    docx_export_source_section_count: number;
    docx_export_source_role_count: number;
    docx_content_equivalence_checked: boolean;
    docx_content_equivalence_passed: boolean;
    docx_content_equivalence_failures: string[];
    docx_text_extraction_method: string | null;
    txt_export_unchanged: boolean;
};

export type JobCopilotDownloadOutput =
    | {
        success: true;
        export_format: "txt";
        file_name: string;
        mime_type: "text/plain";
        resume_text: string;
        applied_recorded: true;
        match_score: number;
        diagnostics?: JobCopilotDownloadDiagnostics;
    }
    | {
        success: true;
        export_format: "docx";
        file_name: string;
        mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        file_base64: string;
        applied_recorded: true;
        match_score: number;
        diagnostics: JobCopilotDownloadDiagnostics;
    };

export type JobCopilotQuickCheckGoalSignal = {
    label?: string | null;
    description?: string | null;
    signal_type?: "target_path" | "avoid_path" | "priority" | "constraint" | "preference";
    strength?: "low" | "medium" | "high";
    confidence?: "explicit" | "inferred" | "weak_inferred";
    source?: "quick_check" | "user_answer" | "saved_role" | "cv_angle_selected" | "manual_profile";
    status?: "active" | "stale" | "rejected";
    source_ref_id?: string | null;
};

export type JobCopilotQuickCheckMemoryCapturePrompt = {
    question_id: string;
    question: string;
    target_area: string;
    requirement_cluster: string;
    title: string;
    description: string;
    capability_tags: string[];
    source: "quick_check_confirmation" | "quick_check_goal_signal";
    confidence: "self_declared" | "explicit" | "inferred" | "weak_inferred";
    strength: number;
    question_purpose?: "evidence_confirmation" | "goal_direction_confirmation";
    memory_target?: "evidence" | "goal_signal";
    job_context: {
        domain: string | null;
        role_family?: string | null;
        requirement_cluster?: string | null;
    };
    goal_signal?: JobCopilotQuickCheckGoalSignal | null;
};

export type JobCopilotSaveQuickCheckMemoryInput = {
    profileId: string;
    source: JobCopilotSource;
    jobTitle: string;
    company: string | null;
    location: string | null;
    jobUrl: string | null;
    jobDescription: string;
    memoryCapturePrompt: JobCopilotQuickCheckMemoryCapturePrompt;
};

export type JobCopilotSaveQuickCheckMemoryOutput = {
    success: true;
    evidencePieceId: string;
    duplicateFound: boolean;
    actionTaken: "saved_new" | "skipped_existing";
    message: string;
    metadataUpdated: boolean;
};
