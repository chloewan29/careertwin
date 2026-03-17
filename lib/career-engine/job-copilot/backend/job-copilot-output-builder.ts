import type { ResumeCopilotDebugOutput, ResumeCopilotPublicOutput } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import type { JobCopilotAnalysis } from "@/lib/career-engine/job-copilot/job-analysis";
import {
    getVerdictFromScore,
    normalizeTopEvidenceLimit,
} from "@/lib/career-engine/job-copilot/extension-contract";
import type { JobCopilotAnalyzeOutput, JobCopilotTopEvidenceItem, JobCopilotResponse } from "./job-copilot-types";

function dedupe(values: string[]): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    );
}

export function buildWhyYouMatch(params: {
    matchStrengthCapabilities: string[];
    profileTopCapabilities: string[];
}): string[] {
    return dedupe([
        ...params.matchStrengthCapabilities,
        ...params.profileTopCapabilities,
    ]).slice(0, 4);
}

export function buildKeyGaps(params: {
    matchGapCapabilities: string[];
    profileKeyGaps: string[];
}): string[] {
    return dedupe([
        ...params.matchGapCapabilities,
        ...params.profileKeyGaps,
    ]).slice(0, 3);
}

export function extractTopEvidenceFromResumeDebug(
    debugOutput: ResumeCopilotDebugOutput | undefined,
    limitInput: number | undefined,
): JobCopilotTopEvidenceItem[] {
    if (!debugOutput) return [];
    const limit = normalizeTopEvidenceLimit(limitInput);
    const flattened: JobCopilotTopEvidenceItem[] = [];

    for (const experience of debugOutput.experiences) {
        for (const bullet of experience.bullets) {
            flattened.push({
                evidencePieceId: bullet.evidence_piece_id,
                label: bullet.matched_signals[0] ?? bullet.original_bullet,
                score: bullet.score,
            });
        }
    }

    return flattened
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, limit);
}

export function toSafeFilename(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

export function buildResumeTextFile(params: {
    roleTitle: string;
    company: string;
    resume: ResumeCopilotPublicOutput;
}): string {
    const lines: string[] = [];
    lines.push(`Tailored Resume for ${params.roleTitle} @ ${params.company}`);
    lines.push("");
    if (params.resume.summary) {
        lines.push("Summary");
        lines.push(params.resume.summary);
        lines.push("");
    }
    lines.push("Experience");
    lines.push("");
    for (const entry of params.resume.experience) {
        lines.push(`${entry.role} | ${entry.company} | ${entry.date_range}`);
        for (const bullet of entry.bullets) {
            lines.push(`- ${bullet}`);
        }
        lines.push("");
    }
    return lines.join("\n").trim();
}

export function buildJobCopilotAnalyzeOutput(params: {
    job: JobCopilotAnalyzeOutput["job"];
    matchScore: number;
    applyRecommendation: JobCopilotResponse["applyRecommendation"];
    careerInsight: string;
    whyFit: string[];
    risks: string[];
    positioningHints: string[];
    calibrationQuestions: JobCopilotResponse["calibrationQuestions"];
    calibrationState: JobCopilotResponse["calibrationState"];
    scoreExplainability: NonNullable<JobCopilotResponse["scoreExplainability"]>;
    diagnostics: NonNullable<JobCopilotResponse["diagnostics"]>;
    jobFitScore: JobCopilotResponse["jobFitScore"];
    jobFitScoreDebug: JobCopilotResponse["jobFitScoreDebug"];
    whyYouMatch: string[];
    keyGaps: string[];
    topEvidence: JobCopilotTopEvidenceItem[];
    jobAnalysis: JobCopilotAnalysis;
    resumePreview: ResumeCopilotPublicOutput | null;
}): JobCopilotAnalyzeOutput {
    const verdict = getVerdictFromScore(params.matchScore);
    const resumeReady = params.jobAnalysis.tailoring_decision.allowed;
    const verdictText = params.applyRecommendation.band === "strong"
        ? "You are likely ready to apply for this role"
        : params.applyRecommendation.band === "consider"
            ? "This role is worth considering with focused positioning"
            : "This role is currently a weak apply recommendation";
    const previewText = params.resumePreview?.summary ?? null;

    return {
        success: true,
        job: params.job,
        response: {
            verdict,
            matchScore: params.matchScore,
            verdictText,
            applyRecommendation: params.applyRecommendation,
            careerInsight: params.careerInsight,
            whyFit: params.whyFit,
            risks: params.risks,
            positioningHints: params.positioningHints,
            calibrationQuestions: params.calibrationQuestions,
            calibrationState: params.calibrationState,
            matchedCapabilities: params.whyYouMatch.slice(0, 4),
            keyGaps: params.keyGaps.slice(0, 3),
            topEvidence: params.topEvidence,
            job_analysis: params.jobAnalysis,
            resume: {
                ready: resumeReady,
                preview: previewText,
                downloadUrl: resumeReady
                    ? "/api/job-copilot/extension/download-resume"
                    : null,
            },
            scoreExplainability: params.scoreExplainability,
            diagnostics: params.diagnostics,
            jobFitScore: params.jobFitScore,
            jobFitScoreDebug: params.jobFitScoreDebug,
        },
    };
}
