import { normalizeTitle } from "@/lib/career-engine/parsing/title-normalizer";
import type { JobAnalysisRisk } from "@/lib/career-engine/job-copilot/job-analysis";

function normalize(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function evaluateAtsTitleRisk(params: {
    jdTitle: string | null;
    jdRoleFamily: string | null;
    candidateTitles: string[];
    evidenceAlignmentScore?: number;
    titlePriorPenalty?: number;
    titlePriorReasoning?: string | null;
}): JobAnalysisRisk {
    const jdNormalizedTitle = params.jdTitle ? normalizeTitle(params.jdTitle).normalized : "";
    const jdFamily = normalize(params.jdRoleFamily) || normalize(normalizeTitle(params.jdTitle ?? "").function ?? "");

    const normalizedCandidateTitles = params.candidateTitles
        .map((title) => normalizeTitle(title).normalized)
        .map((title) => normalize(title))
        .filter((title) => title.length > 0);

    const candidateFamilies = params.candidateTitles
        .map((title) => normalize(normalizeTitle(title).function ?? ""))
        .filter((value) => value.length > 0);

    const titleMatch = jdNormalizedTitle.length > 0 && normalizedCandidateTitles.includes(normalize(jdNormalizedTitle));
    const familyMatch = jdFamily.length > 0 && candidateFamilies.includes(jdFamily);

    if (titleMatch || familyMatch) {
        return {
            type: "title_mismatch",
            level: "low",
            message: "Candidate title history is reasonably aligned with this job title/family.",
            reasoning: params.titlePriorReasoning ?? "Direct or same-family title alignment found.",
        };
    }

    if (normalizedCandidateTitles.length === 0) {
        return {
            type: "title_mismatch",
            level: "medium",
            message: "Title alignment could not be confirmed due to limited candidate title history.",
            reasoning: params.titlePriorReasoning ?? "Candidate title history is too limited to validate directly.",
        };
    }

    if ((params.evidenceAlignmentScore ?? 0) >= 0.58) {
        return {
            type: "title_mismatch",
            level: "medium",
            message: "Candidate title history is indirect, but evidence alignment is strong enough that ATS risk is narrative-sensitive rather than blocking.",
            reasoning: params.titlePriorReasoning ?? "Evidence-based alignment softened the title prior.",
        };
    }

    return {
        type: "title_mismatch",
        level: (params.titlePriorPenalty ?? 0) <= 0.02 ? "medium" : "high",
        message: "Candidate title history appears misaligned with this job title/family and may create ATS screening risk.",
        reasoning: params.titlePriorReasoning ?? "Weak title-family alignment without enough evidence-based offset.",
    };
}
