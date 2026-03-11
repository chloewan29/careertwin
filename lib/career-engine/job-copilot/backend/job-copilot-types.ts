import type { ResumeCopilotPublicOutput } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import type { JobCopilotSource, JobCopilotVerdict } from "@/lib/career-engine/job-copilot/extension-contract";

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

export type JobCopilotTopEvidenceItem = { evidencePieceId: string; label: string; score?: number };

export type JobCopilotResumePreview = Pick<ResumeCopilotPublicOutput, "summary" | "experience">;

export type JobCopilotResponse = {
    verdict: JobCopilotVerdict;
    matchScore: number;
    verdictText: string;
    matchedCapabilities: string[];
    keyGaps: string[];
    topEvidence: JobCopilotTopEvidenceItem[];
    resume: {
        ready: boolean;
        preview: string | null;
        downloadUrl: string | null;
    };
    scoreExplainability?: {
        model: "role_fit_v1";
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
};

export type JobCopilotDownloadOutput = {
    success: true;
    file_name: string;
    mime_type: "text/plain";
    resume_text: string;
    applied_recorded: true;
    match_score: number;
};
