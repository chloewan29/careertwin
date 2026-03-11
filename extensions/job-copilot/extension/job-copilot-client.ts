import type { ExtractedJobDetail } from "./job-detail-extractor";

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
        matchedCapabilities: string[];
        keyGaps: string[];
        topEvidence: Array<{
            evidencePieceId: string;
            label: string;
            score: number;
        }>;
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
    const response = await chrome.runtime.sendMessage({
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
    const response = await chrome.runtime.sendMessage({
        type: "JOB_COPILOT_DOWNLOAD_RESUME",
        payload: params,
    }) as { ok?: boolean; data?: JobCopilotDownloadResponse; error?: string };

    if (!response?.ok || !response.data) {
        throw new Error(response?.error ?? "Resume download failed.");
    }
    return response.data;
}
