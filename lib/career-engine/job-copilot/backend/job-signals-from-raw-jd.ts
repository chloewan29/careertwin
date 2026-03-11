import { parseJobDescription } from "@/lib/career-engine/parsing/jd-parser";
import { normalizeTitle } from "@/lib/career-engine/parsing/title-normalizer";
import { deriveJobSignalFields } from "@/lib/career-engine/job-copilot/extension-contract";

export type JobSignalsFromRawJd = {
    target_title: string | null;
    role_family: string | null;
    seniority: string | null;
    required_skills: string[];
    preferred_skills: string[];
    responsibilities: string[];
    domains: string[];
    keywords: string[];
};

export function buildJobSignalsFromRawJd(params: {
    rawJd: string;
    fallbackTitle: string;
}): JobSignalsFromRawJd {
    const parsedJd = parseJobDescription(params.rawJd);
    const normalizedTitle = normalizeTitle(parsedJd.target_title ?? params.fallbackTitle);

    const derived = deriveJobSignalFields({
        rawText: parsedJd.raw_text,
        targetTitle: parsedJd.target_title ?? params.fallbackTitle,
        roleFamily: parsedJd.normalized_title?.function ?? normalizedTitle?.function ?? null,
        requiredSkills: parsedJd.required_skills.map((skill) => skill.normalized),
        preferredSkills: parsedJd.preferred_skills.map((skill) => skill.normalized),
        responsibilities: parsedJd.responsibilities,
    });

    return {
        target_title: derived.targetTitle,
        role_family: derived.roleFamily,
        seniority: parsedJd.seniority_level ?? null,
        required_skills: derived.requiredSkills,
        preferred_skills: derived.preferredSkills,
        responsibilities: derived.responsibilities,
        domains: derived.domains,
        keywords: derived.keywords,
    };
}

