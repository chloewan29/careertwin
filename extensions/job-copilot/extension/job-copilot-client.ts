import type { ExtractedJobDetail } from "./job-detail-extractor";

type ExtensionChromeRuntime = {
    runtime?: {
        sendMessage: (message: unknown) => Promise<unknown>;
    };
};

export type JobCopilotAnalyzeResponse = {
    success: true;
    job: {
        jobId: string;
        canonicalJobId: string;
        jobSnapshotId: number;
        interactionId: number;
        sourcePlatform: "linkedin" | "seek";
        jobUrl: string | null;
        jobTitle: string;
        company: string | null;
        location: string | null;
        jobDescriptionSnapshot: string;
        selectedEvidenceIds: string[];
    };
    response: {
        verdict: "strong_fit" | "possible_fit" | "stretch" | "low_fit";
        matchScore: number;
        verdictText: string;
        applyRecommendation?: {
            score: number;
            band: "strong" | "consider" | "weak";
        };
        careerInsight?: string;
        whyFit?: string[];
        risks?: string[];
        positioningHints?: string[];
        calibrationQuestions?: Array<{
            id: string;
            question: string;
            targetArea: string;
            importance: "critical" | "important" | "supporting";
            answer?: "yes" | "no" | null;
        }>;
        calibrationState?: {
            required: boolean;
            answeredCount: number;
            totalQuestions: number;
            recalibrated: boolean;
            scoreDelta: number;
        };
        matchedCapabilities: string[];
        keyGaps: string[];
        topEvidence: Array<{
            evidencePieceId: string;
            label: string;
            score: number;
        }>;
        job_analysis: {
            confidence: "high" | "medium" | "low";
            job_profile_quality: "strong" | "usable" | "sparse" | "empty";
            interpretation_note: string;
            matched_capabilities: string[];
            key_gaps: string[];
            evidence_highlights: Array<{
                evidencePieceId: string;
                label: string;
                score?: number;
            }>;
            extraction_notices: Array<{
                code: "sparse_extraction" | "empty_extraction" | "weak_job_signals";
                severity: "warning" | "critical";
                message: string;
            }>;
        };
        resume: {
            ready: boolean;
            preview: string | null;
            downloadUrl: string | null;
        };
        scoreExplainability?: {
            model: string;
            capabilityFitScore: number;
            matchedCapabilityCount: number;
            missingCapabilityCount: number;
            supportingEvidenceCount: number;
            roleFitSummary?: string | null;
            evidenceRelevanceScore?: number | null;
            weakJdMode: boolean;
            scoreConfidence: "high" | "medium" | "low";
        };
        diagnostics?: {
            weakJobSignals: boolean;
            fallbackUsed: boolean;
            totalEvidenceConsidered: number;
        };
    };
};

export type JobCopilotDownloadResponse = {
    success: true;
    file_name: string;
    mime_type: "text/plain";
    resume_text: string;
    applied_recorded: true;
    match_score: number;
};

export async function analyzeJobViaExtensionBackground(
    job: ExtractedJobDetail,
): Promise<JobCopilotAnalyzeResponse> {
    const runtime = (globalThis as typeof globalThis & { chrome?: ExtensionChromeRuntime }).chrome?.runtime;
    if (!runtime?.sendMessage) {
        throw new Error("Extension runtime unavailable.");
    }

    const response = await runtime.sendMessage({
        type: "JOB_COPILOT_ANALYZE",
        payload: job,
    }) as { ok?: boolean; data?: JobCopilotAnalyzeResponse; error?: string };

    if (!response?.ok || !response.data) {
        throw new Error(response?.error ?? "Analyze request failed.");
    }
    return response.data;
}

export async function downloadResumeViaExtensionBackground(params: {
    jobId: string;
    jobSnapshotId: number;
    sourcePlatform: "linkedin" | "seek";
    jobTitle: string;
    company: string | null;
    location: string | null;
    jobUrl: string;
    jobDescriptionSnapshot: string;
    matchScore: number;
    verdict: "strong_fit" | "possible_fit" | "stretch" | "low_fit";
    selectedEvidenceIds: string[];
}): Promise<JobCopilotDownloadResponse> {
    const runtime = (globalThis as typeof globalThis & { chrome?: ExtensionChromeRuntime }).chrome?.runtime;
    if (!runtime?.sendMessage) {
        throw new Error("Extension runtime unavailable.");
    }

    const response = await runtime.sendMessage({
        type: "JOB_COPILOT_DOWNLOAD_RESUME",
        payload: params,
    }) as { ok?: boolean; data?: JobCopilotDownloadResponse; error?: string };

    if (!response?.ok || !response.data) {
        throw new Error(response?.error ?? "Resume download failed.");
    }
    return response.data;
}

export async function recalibrateJobViaExtensionBackground(params: {
    questionId: string;
    answer: "yes" | "no";
}): Promise<JobCopilotAnalyzeResponse> {
    const runtime = (globalThis as typeof globalThis & { chrome?: ExtensionChromeRuntime }).chrome?.runtime;
    if (!runtime?.sendMessage) {
        throw new Error("Extension runtime unavailable.");
    }

    const response = await runtime.sendMessage({
        type: "JOB_COPILOT_RECALIBRATE",
        payload: params,
    }) as { ok?: boolean; data?: JobCopilotAnalyzeResponse; error?: string };

    if (!response?.ok || !response.data) {
        throw new Error(response?.error ?? "Recalibration request failed.");
    }
    return response.data;
}
