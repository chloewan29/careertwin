import { ParsedResume } from "./parsing/resume-parser";

export interface CareerProfile {
    current_title: string;
    years_experience: number;
    seniority_level: string;
    industry: string;
    summary: string;
}

export function buildCareerProfile(
    resumeText: string,
    parsedResume: ParsedResume,
    extractedSkills: string[]
): CareerProfile {

    const yearsExp = parsedResume.years_experience ?? 0;
    // Determine seniority level based on years of experience
    let seniority_level = "Entry Level";
    if (yearsExp >= 10) {
        seniority_level = "Staff/Principal";
    } else if (yearsExp >= 7) {
        seniority_level = "Senior";
    } else if (yearsExp >= 3) {
        seniority_level = "Mid-Level";
    } else if (yearsExp > 0) {
        seniority_level = "Junior";
    }

    return {
        current_title: parsedResume.current_title ?? "",
        years_experience: yearsExp,
        seniority_level,
        industry: parsedResume.industry ?? "",
        summary: parsedResume.summary ?? "",
    };
}
