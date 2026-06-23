import type { ResumeCopilotJobSignals } from "./resume-tailoring-evidence-foundation-types";
import type { ResumeSummaryDebug } from "./resume-summary-builder-types";
import type {
    ResumeCopilotDebugOutput,
    ResumeCopilotPublicOutput,
} from "./resume-output-builder-types";

export type ResumeCopilotServiceStatus =
    | "ready"
    | "empty"
    | "no_career_memory"
    | "tailoring_plan_no_resolved_evidence";

export type ResumeCopilotServiceInput = {
    profileId: string;
    jobId: string;
    options?: {
        includeDebug?: boolean;
        rewriteBullets?: boolean;
        overallMatchScore?: number;
    };
};

export type ResumeCopilotServiceDebug = {
    status: ResumeCopilotServiceStatus;
    empty_reason?: string | null;
    job_signals?: ResumeCopilotJobSignals;
    summary_debug?: ResumeSummaryDebug;
};

export type ResumeCopilotServiceOutput = {
    resume: ResumeCopilotPublicOutput;
    job_analysis?: unknown;
    debug?: ResumeCopilotDebugOutput;
};
