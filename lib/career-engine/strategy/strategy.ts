import { extractSkills } from "../parsing/skill-extractor";

export interface CandidateProfile {
    current_title: string;
    years_experience: number;
    seniority_level: string;
    industry: string;
    skills: string[];
    summary: string;
}

export interface CareerStrategy {
    skills_to_learn: string[];
    experience_to_gain: string;
    resume_changes: string[];
    positioning_suggestions: string[];
}

export function generateCareerStrategy(
    candidateProfile: CandidateProfile,
    targetJobDescription: string
): CareerStrategy {
    const jdSkills = extractSkills(targetJobDescription);
    const candidateSkillsLower = candidateProfile.skills.map((s) => s.toLowerCase());

    // Extracted JD missing skills
    const missingSkills = jdSkills.filter(
        (jdSkill) => !candidateSkillsLower.some((cs) => cs === jdSkill.toLowerCase() || cs.includes(jdSkill.toLowerCase()))
    );

    // Extract required experience from JD
    let requiredYears = 0;
    const expMatch = targetJobDescription.match(/(?:at least|minimum|min)?\s*(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
    if (expMatch) {
        requiredYears = parseInt(expMatch[1], 10);
    }

    // 1. Skills to learn
    const skills_to_learn = missingSkills.slice(0, 5);

    // 2. Experience to gain
    let experience_to_gain = "";
    if (candidateProfile.years_experience < requiredYears) {
        const gap = requiredYears - candidateProfile.years_experience;
        experience_to_gain = `The target role requires ${requiredYears}+ years of experience, but you currently have ${candidateProfile.years_experience}. You need to gain ~${gap} more years of relevant experience. Consider taking on stretch assignments or side projects to accelerate your learning.`;
    } else {
        experience_to_gain = `You already meet or exceed the ${requiredYears}+ years of experience requirement. Focus on demonstrating leadership and impact in your current role.`;
    }

    // 3. Resume changes
    const resume_changes: string[] = [];
    if (candidateProfile.summary.length < 50) {
        resume_changes.push("Expand your professional summary to clearly state your career objective and key achievements.");
    }
    if (missingSkills.length > 0) {
        if (missingSkills.length <= 3) {
            resume_changes.push(`If you have any basic familiarity with ${missingSkills.join(', ')}, ensure they are mentioned in your resume. Otherwise, start a learning project and add it to your portfolio.`);
        } else {
            resume_changes.push(`Your resume is missing several key technical requirements. Tailor your experience bullet points to emphasize any transferable skills or closely related technologies.`);
        }
    }
    resume_changes.push(`Quantify your past achievements (e.g., "Improved performance by X%", "Led a team of Y") to make your experience stand out.`);

    // 4. Positioning suggestions
    const positioning_suggestions: string[] = [];
    const requiredLevel = targetJobDescription.toLowerCase().includes("senior") ? "Senior" :
        targetJobDescription.toLowerCase().includes("lead") ? "Lead" :
            targetJobDescription.toLowerCase().includes("manager") ? "Manager" : "Mid-Level";

    if (candidateProfile.seniority_level !== requiredLevel) {
        positioning_suggestions.push(`Position yourself as a candidate ready to step up into a ${requiredLevel} role by highlighting your proactive problem-solving and mentoring capabilities.`);
    } else {
        positioning_suggestions.push(`Since you are already at the ${requiredLevel} level, focus your narrative on the specific scale and complexity of the problems you've solved.`);
    }

    positioning_suggestions.push(`Leverage your background in ${candidateProfile.industry} to show domain expertise, or frame it as a unique perspective if transitioning to a new industry.`);

    return {
        skills_to_learn,
        experience_to_gain,
        resume_changes,
        positioning_suggestions,
    };
}
