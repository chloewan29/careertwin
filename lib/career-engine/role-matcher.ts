import { normalizeSkills, type NormalizedSkill } from "./skill-normalizer";
import { normalizeTitle } from "./title-normalizer";
import type { ParsedJobDescription } from "./jd-parser";

export interface ProfileInput {
    current_title: string | null;
    years_experience: number | null;
    skills: string[];
    parsed_skills?: string[];
    resume_text?: string;
}

export interface RoleMatchResult {
    match_score: number;            // 0–100 overall weighted score
    skill_score: number;            // 0–100
    title_score: number;            // 0–100
    experience_score: number;       // 0–100
    matched_skills: string[];       // canonical names
    missing_skills: string[];       // required skills not in profile
    extra_skills: string[];         // profile skills not in JD
    title_gap: string | null;       // null if titles align, otherwise description of gap
    seniority_gap: string | null;   // null if seniority aligns, otherwise description
    match_label: "Strong match" | "Moderate match" | "Partial match" | "Low match";
}

function norm(s: string): string {
    return s.toLowerCase().trim();
}

function skillSetNorm(skills: NormalizedSkill[]): Set<string> {
    return new Set(skills.map(s => norm(s.normalized)));
}

const SENIORITY_RANK: Record<string, number> = {
    junior: 1, mid: 2, senior: 3, lead: 4, manager: 5, director: 6, executive: 7, unknown: 0,
};

export function matchRoles(
    profile: ProfileInput,
    jd: ParsedJobDescription
): RoleMatchResult {
    // --- Normalize profile skills ---
    // Fall back to parsed_skills if the primary skills array is empty or purely whitespace
    const effectiveSkills = profile.skills.length > 0
        ? profile.skills
        : (profile.parsed_skills ?? []);

    const profileSkillsNorm = normalizeSkills(effectiveSkills);
    const profileSkillSet = skillSetNorm(profileSkillsNorm);

    // --- Required skills matching ---
    const requiredSet = skillSetNorm(jd.required_skills);
    const preferredSet = skillSetNorm(jd.preferred_skills);
    const allJdSet = new Set([...requiredSet, ...preferredSet]);

    // --- Deterministic Evidence Mapping for Soft Skills ---
    // If we have raw resume text, scan for explicit proxy signals to map broader capabilities
    if (profile.resume_text) {
        const text = profile.resume_text.toLowerCase();

        const leadershipSignals = [
            "managing a team", "managed a team", "leading delivery", "led delivery",
            "ownership", "cross-functional partnership", "cross-functional delivery", "team management"
        ];

        const communicationSignals = [
            "stakeholder management", "stakeholder collaboration", "presentation",
            "storytelling", "process uplift", "enablement"
        ];

        // Inject Leadership if evidence signals are found and it's a target skill
        if (leadershipSignals.some(sig => text.includes(sig))) {
            const leadershipTarget = jd.required_skills.find(s => norm(s.normalized) === "leadership")
                || jd.preferred_skills.find(s => norm(s.normalized) === "leadership");
            if (leadershipTarget) {
                profileSkillSet.add(norm(leadershipTarget.normalized));
            }
        }

        // Inject Communication if evidence signals are found and it's a target skill
        if (communicationSignals.some(sig => text.includes(sig))) {
            const commsTarget = jd.required_skills.find(s => norm(s.normalized) === "communication")
                || jd.preferred_skills.find(s => norm(s.normalized) === "communication");
            if (commsTarget) {
                profileSkillSet.add(norm(commsTarget.normalized));
            }
        }
    }

    const matched = jd.required_skills.filter(s => profileSkillSet.has(norm(s.normalized)));
    const missing = jd.required_skills.filter(s => !profileSkillSet.has(norm(s.normalized)));
    const extra = profileSkillsNorm.filter(s => !allJdSet.has(norm(s.normalized)));

    const skill_score = jd.required_skills.length > 0
        ? Math.round((matched.length / jd.required_skills.length) * 100)
        : 50;

    // Boost: each matched preferred skill adds up to 5 pts (capped)
    const preferredMatched = jd.preferred_skills.filter(s => profileSkillSet.has(norm(s.normalized))).length;
    const preferredBoost = Math.min(10, preferredMatched * 2);
    const adjusted_skill_score = Math.min(100, skill_score + preferredBoost);

    // --- Title matching ---
    const profileTitleNorm = profile.current_title ? normalizeTitle(profile.current_title) : null;
    const jdTitleNorm = jd.normalized_title;

    let title_score = 50;
    let title_gap: string | null = null;

    if (profileTitleNorm && jdTitleNorm) {
        // Function match
        const fnMatch = profileTitleNorm.function && jdTitleNorm.function
            && norm(profileTitleNorm.function) === norm(jdTitleNorm.function);
        // Keyword overlap on normalized titles
        const profileWords = new Set(norm(profileTitleNorm.normalized).split(""));
        const jdWords = norm(jdTitleNorm.normalized).split("");
        const wordOverlap = jdWords.filter(w => profileWords.has(w)).length / Math.max(jdWords.length, 1);

        title_score = fnMatch ? Math.min(100, 70 + Math.round(wordOverlap * 30)) : Math.round(wordOverlap * 60);

        if (!fnMatch && jdTitleNorm.function) {
            title_gap = `Your title (${profileTitleNorm.normalized}) is in ${profileTitleNorm.function ?? "a different domain"}, but the role targets ${jdTitleNorm.function}.`;
        } else if (title_score < 50) {
            title_gap = `Title mismatch: your title is "${profileTitleNorm.normalized}", the role is "${jdTitleNorm.normalized}".`;
        }
    }

    // --- Seniority matching ---
    let experience_score = 50;
    let seniority_gap: string | null = null;

    const profileRank = profileTitleNorm ? (SENIORITY_RANK[profileTitleNorm.level] ?? 0) : 0;
    const jdRank = jd.seniority_level ? (SENIORITY_RANK[jd.seniority_level] ?? 0) : 0;
    const resumeYears = profile.years_experience ?? 0;
    const jdYears = jd.years_required ?? 0;

    if (jdYears > 0) {
        if (resumeYears >= jdYears) {
            experience_score = 100;
        } else if (resumeYears >= jdYears - 1) {
            // Within 1 year — close enough
            experience_score = 85;
        } else {
            experience_score = Math.max(10, Math.round((resumeYears / jdYears) * 100));
        }
    } else if (jdRank > 0) {
        const rankDiff = jdRank - profileRank;
        if (rankDiff <= 0) experience_score = 100;
        else if (rankDiff === 1) experience_score = 70;
        else experience_score = Math.max(10, 100 - rankDiff * 25);
    }

    if (jdRank > 0 && profileRank > 0 && jdRank !== profileRank) {
        const jdLevel = jd.seniority_level ?? "unknown";
        const profileLevel = profileTitleNorm?.level ?? "unknown";
        if (jdRank > profileRank) {
            seniority_gap = `This role targets ${jdLevel} level. Your profile appears to be ${profileLevel}.`;
        } else {
            seniority_gap = `You may be overqualified — role is ${jdLevel}, but your profile is ${profileLevel}.`;
        }
    } else if (jdYears > 0 && resumeYears > 0 && resumeYears < jdYears) {
        seniority_gap = `Role requires ${jdYears}+ years experience; your profile shows ~${resumeYears} years.`;
    }

    // --- Weighted overall score ---
    // Skills: 60%, experience: 25%, title function: 15%
    const match_score = Math.round(
        adjusted_skill_score * 0.6 +
        experience_score * 0.25 +
        title_score * 0.15
    );

    const match_label: RoleMatchResult["match_label"] =
        match_score >= 78 ? "Strong match" :
            match_score >= 58 ? "Moderate match" :
                match_score >= 38 ? "Partial match" :
                    "Low match";

    return {
        match_score,
        skill_score: adjusted_skill_score,
        title_score,
        experience_score,
        matched_skills: matched.map(s => s.normalized),
        missing_skills: missing.map(s => s.normalized),
        extra_skills: extra.map(s => s.normalized),
        title_gap,
        seniority_gap,
        match_label,
    };
}
