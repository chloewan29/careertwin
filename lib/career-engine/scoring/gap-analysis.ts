import { MatchResult } from "../matching/job-matcher";

export interface GapAnalysis {
    meetsExperience: boolean;
    suggestions: string[];
}

export function analyzeGap(
    matchResult: MatchResult,
    profileExperienceYears: number
): GapAnalysis {
    const suggestions: string[] = [];
    const { matchedSkills, missingSkills, requiredExperience, score } = matchResult;

    const meetsExperience = requiredExperience === null || profileExperienceYears >= requiredExperience;

    // Add suggestions based on missing skills
    if (missingSkills.length > 0) {
        const topMissing = missingSkills.slice(0, 3);
        suggestions.push(`Focus on learning ${topMissing.join(", ")} as these are key missing requirements.`);
    }

    // Add suggestions based on experience gap
    if (requiredExperience && !meetsExperience) {
        suggestions.push(`The role asks for ${requiredExperience}+ years of experience. You currently have ${profileExperienceYears} years. Consider highlighting independent projects or open-source work to bridge the gap.`);
    }

    // High match reward / low match warning
    if (score >= 80) {
        suggestions.push(`You are a great fit! Tailor your resume to prominently feature your experience with ${matchedSkills.slice(0, 3).join(", ")}.`);
    } else if (score < 50 && matchedSkills.length < missingSkills.length) {
        suggestions.push(`Your profile matches less than half the requirements. Building a portfolio project using the missing skills could improve your chances.`);
    }

    // Default suggestion
    if (suggestions.length === 0) {
        suggestions.push(`Review the job description details and ensure your resume metrics align with the responsibilities.`);
    }

    return {
        meetsExperience,
        suggestions
    };
}
