import { extractSkills } from "./skill-extractor";

export interface MatchResult {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    requiredExperience: number | null;
}

export function matchJob(
    profileSkills: string[],
    profileExperienceYears: number,
    jobDescription: string
): MatchResult {
    // Extract skills from JD using the common extractor
    const jdSkills = extractSkills(jobDescription);

    // Normalize skills for comparison
    const candidateSkillsLower = profileSkills.map(s => s.toLowerCase());

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const jdSkill of jdSkills) {
        const jdLower = jdSkill.toLowerCase();
        const isMatched = candidateSkillsLower.some(
            cs => cs === jdLower || cs.includes(jdLower) || jdLower.includes(cs)
        );

        if (isMatched) {
            matchedSkills.push(jdSkill);
        } else {
            missingSkills.push(jdSkill);
        }
    }

    // Extract experience required from JD
    let requiredExperience: number | null = null;
    const expMatch = jobDescription.match(/(?:at least|minimum|min)?\s*(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
    if (expMatch) {
        requiredExperience = parseInt(expMatch[1], 10);
    }

    // Calculate score
    let score = 0;

    if (jdSkills.length > 0) {
        const skillScore = (matchedSkills.length / jdSkills.length) * 70; // Skills worth 70%
        score += skillScore;
    } else {
        score += 35; // Default if no skills found in JD
    }

    const expScore = requiredExperience
        ? (profileExperienceYears >= requiredExperience ? 30 : Math.min(30, (profileExperienceYears / requiredExperience) * 30))
        : 15; // If no exp requirement, default partial credit

    score = Math.round(Math.min(100, score + expScore));

    return {
        score,
        matchedSkills,
        missingSkills,
        requiredExperience
    };
}
