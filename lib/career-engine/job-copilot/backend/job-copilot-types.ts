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

export type JobCopilotDownloadOutput = {
    success: true;
    file_name: string;
    mime_type: "text/plain";
    resume_text: string;
    applied_recorded: true;
    match_score: number;
};
