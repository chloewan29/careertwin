"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRoles = matchRoles;
const skill_normalizer_1 = require("../parsing/skill-normalizer");
const title_normalizer_1 = require("../parsing/title-normalizer");
const SENIORITY_RANK = {
    junior: 1,
    mid: 2,
    senior: 3,
    lead: 4,
    manager: 5,
    director: 6,
    executive: 7,
    unknown: 0,
};
const TITLE_SCORE_WEIGHTS = {
    role_family_match: 0.5,
    seniority_match: 0.3,
    title_token_similarity: 0.2,
};
const OVERALL_SCORE_WEIGHTS = {
    title: 0.15,
    skills: 0.35,
    seniority: 0.2,
    domain: 0.1,
    leadership: 0.1,
    communication: 0.1,
};
const ADJACENT_FUNCTIONS = {
    "Product Management": ["Program Management", "Strategy", "Operations"],
    "Program Management": ["Product Management", "Operations"],
    "Software Engineering": ["Backend", "Frontend", "Full Stack", "Platform Engineering"],
    "Backend": ["Software Engineering", "Full Stack", "Platform Engineering"],
    "Frontend": ["Software Engineering", "Full Stack", "UX/UI Design"],
    "Full Stack": ["Software Engineering", "Backend", "Frontend"],
    "Data Science": ["Data Analytics", "Data Engineering", "Business Intelligence"],
    "Data Analytics": ["Data Science", "Business Intelligence", "Performance Marketing"],
    "Business Intelligence": ["Data Analytics", "Data Science"],
    "Marketing": ["Digital Marketing", "Performance Marketing", "Growth Marketing", "Product Marketing"],
    "Digital Marketing": ["Marketing", "Performance Marketing", "Growth Marketing"],
    "Performance Marketing": ["Digital Marketing", "Marketing", "Growth Marketing"],
    "Growth Marketing": ["Marketing", "Digital Marketing", "Performance Marketing", "Product Marketing"],
    "Product Marketing": ["Marketing", "Growth Marketing", "Brand Strategy"],
    "Communications": ["Marketing", "Account Management"],
    "Account Management": ["Sales", "Communications"],
    "Operations": ["Program Management", "Strategy", "Product Management"],
};
const ADJACENT_SKILLS = {
    "Google Analytics": ["Google Analytics 4", "Google Tag Manager", "Data Analysis"],
    "Google Analytics 4": ["Google Analytics", "Google Tag Manager", "Data Analysis"],
    "Communication": ["Stakeholder Management", "Presentation Skills", "Storytelling"],
    "Leadership": ["Stakeholder Management", "Project Management"],
    "Project Management": ["Program Management", "Stakeholder Management", "Leadership"],
    "Data Analysis": ["Research & Measurement", "SQL", "Google Analytics"],
    "SEM": ["Google Ads", "Paid Search", "SEM Campaign Management"],
    "Paid Search": ["SEM", "Google Ads"],
    "SEO": ["Content Strategy", "Digital Marketing"],
    "Campaign Management": ["SEM Campaign Management", "Project Management"],
};
const LEADERSHIP_SIGNAL_GROUPS = {
    people_management: ["managed a team", "managing a team", "team management", "people management", "line managed"],
    ownership: ["ownership", "owned", "accountable for", "responsible for"],
    delivery: ["leading delivery", "led delivery", "led initiative", "led project", "drove execution"],
    mentoring: ["mentored", "coached", "developed team members"],
    cross_functional: ["cross-functional leadership", "cross-functional delivery", "cross-functional partnership"],
};
const COMMUNICATION_SIGNAL_GROUPS = {
    stakeholders: ["stakeholder management", "stakeholder collaboration", "stakeholder engagement"],
    presentations: ["presentation", "presented", "workshop", "facilitated workshop"],
    enablement: ["enablement", "training", "trained teams", "documentation"],
    collaboration: ["cross-functional collaboration", "cross-functional partnership", "aligned stakeholders"],
    storytelling: ["storytelling", "narrative", "visual storytelling"],
};
const WEAK_LEADERSHIP_SIGNALS = [
    "led",
    "supported leadership",
    "ownership of tasks",
    "contributed to delivery",
    "assisted with team coordination",
];
const WEAK_COMMUNICATION_SIGNALS = [
    "communicated",
    "collaborated",
    "worked with stakeholders",
    "shared updates",
    "participated in meetings",
];
function norm(s) {
    return s.toLowerCase().trim();
}
function clamp(n, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Math.round(n)));
}
function skillSetNorm(skills) {
    return new Set(skills.map(s => norm(s.normalized)));
}
function tokenizeTitle(title) {
    return norm(title)
        .split(/[^a-z0-9+.#]+/i)
        .filter(Boolean);
}
function tokenOverlapScore(a, b) {
    const aTokens = new Set(tokenizeTitle(a));
    const bTokens = tokenizeTitle(b);
    if (bTokens.length === 0)
        return 0;
    const overlap = bTokens.filter(token => aTokens.has(token)).length;
    return clamp((overlap / bTokens.length) * 100);
}
function hasAdjacentFunction(a, b) {
    if (!a || !b)
        return false;
    return (ADJACENT_FUNCTIONS[a] ?? []).includes(b) || (ADJACENT_FUNCTIONS[b] ?? []).includes(a);
}
function roleFamilyScore(profileFunction, jdFunction) {
    if (profileFunction && jdFunction) {
        if (norm(profileFunction) === norm(jdFunction))
            return 100;
        if (hasAdjacentFunction(profileFunction, jdFunction))
            return 70;
        return 15;
    }
    return 50;
}
function seniorityAlignmentScore(profileLevel, jdLevel) {
    const profileRank = profileLevel ? (SENIORITY_RANK[profileLevel] ?? 0) : 0;
    const jdRank = jdLevel ? (SENIORITY_RANK[jdLevel] ?? 0) : 0;
    if (profileRank === 0 || jdRank === 0)
        return 50;
    const diff = Math.abs(profileRank - jdRank);
    if (diff === 0)
        return 100;
    if (diff === 1)
        return 75;
    if (diff === 2)
        return 45;
    return 15;
}
function countSignalGroups(text, groups) {
    return Object.values(groups).filter(signals => signals.some(signal => text.includes(signal))).length;
}
function hasWeakSignal(text, signals) {
    return signals.some(signal => {
        if (signal.includes(" "))
            return text.includes(signal);
        return new RegExp(`\\b${signal}\\b`, "i").test(text);
    });
}
function scoreSignalGroups(groupCount, weakEvidence) {
    if (groupCount >= 3)
        return 90;
    if (groupCount === 2)
        return 75;
    if (groupCount === 1)
        return 55;
    if (weakEvidence)
        return 35;
    return 10;
}
function getEvidenceStrength(skill, profileSkillSet, resumeText) {
    const normalized = (0, skill_normalizer_1.normalizeSkill)(skill).normalized;
    const skillNorm = norm(normalized);
    const adjacent = (ADJACENT_SKILLS[normalized] ?? []).map(norm);
    const resumeLower = resumeText.toLowerCase();
    if (profileSkillSet.has(skillNorm)) {
        return { strong: true, moderate: false, weak: false, reason: `Exact skill match for ${normalized}.` };
    }
    if (adjacent.some(adj => profileSkillSet.has(adj))) {
        return { strong: false, moderate: true, weak: false, reason: `Adjacent experience found for ${normalized}.` };
    }
    if (skillNorm === "leadership") {
        const groups = countSignalGroups(resumeLower, LEADERSHIP_SIGNAL_GROUPS);
        if (groups >= 2)
            return { strong: true, moderate: false, weak: false, reason: "Strong leadership evidence found in resume text." };
        if (groups === 1)
            return { strong: false, moderate: false, weak: true, reason: "Some leadership evidence found, but it is limited." };
    }
    if (skillNorm === "communication") {
        const groups = countSignalGroups(resumeLower, COMMUNICATION_SIGNAL_GROUPS);
        if (groups >= 2)
            return { strong: true, moderate: false, weak: false, reason: "Strong communication evidence found in resume text." };
        if (groups === 1)
            return { strong: false, moderate: false, weak: true, reason: "Some communication evidence found, but it is limited." };
    }
    const exactMention = new RegExp(`\\b${skillNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(resumeText);
    if (exactMention) {
        return { strong: false, moderate: false, weak: true, reason: `${normalized} is mentioned in the resume text, but not strongly evidenced.` };
    }
    return { strong: false, moderate: false, weak: false, reason: `No clear evidence found for ${normalized}.` };
}
function classifySkill(skill, profileSkillSet, resumeText) {
    const normalized = (0, skill_normalizer_1.normalizeSkill)(skill).normalized;
    const evidence = getEvidenceStrength(normalized, profileSkillSet, resumeText);
    if (evidence.strong) {
        return { skill: normalized, status: "matched", reason: evidence.reason };
    }
    if (evidence.moderate) {
        return { skill: normalized, status: "partial", reason: evidence.reason };
    }
    if (evidence.weak) {
        return { skill: normalized, status: "evidence_gap", reason: evidence.reason };
    }
    return { skill: normalized, status: "true_gap", reason: evidence.reason };
}
function buildRecommendation(hardFilterResult, criticalGaps, evidenceGaps, overallScore) {
    if (hardFilterResult === "fail") {
        return "Core role alignment is weak. Prioritize closer role-family targets or close the major capability gaps before applying.";
    }
    if (criticalGaps.length > 0) {
        return `Focus first on closing these true gaps: ${criticalGaps.slice(0, 3).join(", ")}.`;
    }
    if (evidenceGaps.length > 0) {
        return `Your profile may fit better than the resume shows. Strengthen evidence for ${evidenceGaps.slice(0, 3).join(", ")}.`;
    }
    if (overallScore >= 80) {
        return "Strong fit overall. Tailor the resume toward the target role and highlight the most relevant strengths.";
    }
    return "Moderate fit overall. Improve the clearest weak dimensions and tighten role-specific evidence.";
}
function matchRoles(profile, jd) {
    const effectiveSkills = profile.skills.some(skill => skill.trim().length > 0)
        ? profile.skills
        : (profile.parsed_skills ?? []);
    const profileSkillsNorm = (0, skill_normalizer_1.normalizeSkills)(effectiveSkills);
    const profileSkillSet = skillSetNorm(profileSkillsNorm);
    const rawResumeText = profile.resume_text ?? "";
    const requiredClassifications = jd.required_skills.map(skill => classifySkill(skill.normalized, profileSkillSet, rawResumeText));
    const preferredClassifications = jd.preferred_skills.map(skill => classifySkill(skill.normalized, profileSkillSet, rawResumeText));
    const matched = requiredClassifications.filter(item => item.status === "matched");
    const partial = requiredClassifications.filter(item => item.status === "partial");
    const evidenceGapItems = requiredClassifications.filter(item => item.status === "evidence_gap");
    const trueGapItems = requiredClassifications.filter(item => item.status === "true_gap");
    const requiredPoints = matched.length + (partial.length * 0.5);
    const requiredCoverage = jd.required_skills.length > 0
        ? requiredPoints / jd.required_skills.length
        : (profileSkillsNorm.length > 0 ? 0.5 : 0);
    const preferredMatched = preferredClassifications.filter(item => item.status === "matched").length;
    const preferredPartial = preferredClassifications.filter(item => item.status === "partial").length;
    const preferredBonus = Math.min((preferredMatched * 0.05) + (preferredPartial * 0.025), 0.1);
    const trueGapPenalty = Math.min(trueGapItems.length * 0.08, 0.25);
    const skills_score = clamp((requiredCoverage + preferredBonus - trueGapPenalty) * 100);
    const requiredSet = skillSetNorm(jd.required_skills);
    const preferredSet = skillSetNorm(jd.preferred_skills);
    const allJdSet = new Set([...requiredSet, ...preferredSet]);
    const extra = profileSkillsNorm.filter(s => !allJdSet.has(norm(s.normalized)));
    const profileTitleNorm = profile.current_title ? (0, title_normalizer_1.normalizeTitle)(profile.current_title) : null;
    const jdTitleNorm = jd.normalized_title;
    const role_family_match = roleFamilyScore(profileTitleNorm?.function ?? null, jdTitleNorm?.function ?? null);
    const title_seniority_match = seniorityAlignmentScore(profileTitleNorm?.level ?? null, jdTitleNorm?.level ?? jd.seniority_level ?? null);
    const title_token_similarity = profileTitleNorm && jdTitleNorm
        ? tokenOverlapScore(profileTitleNorm.normalized, jdTitleNorm.normalized)
        : 50;
    const title_breakdown = {
        role_family_match,
        seniority_match: title_seniority_match,
        title_token_similarity,
    };
    const title_score = clamp((role_family_match * TITLE_SCORE_WEIGHTS.role_family_match) +
        (title_seniority_match * TITLE_SCORE_WEIGHTS.seniority_match) +
        (title_token_similarity * TITLE_SCORE_WEIGHTS.title_token_similarity));
    let title_gap = null;
    if (role_family_match <= 20 && profileTitleNorm && jdTitleNorm) {
        title_gap = `Your title (${profileTitleNorm.normalized}) is in ${profileTitleNorm.function ?? "a different domain"}, but the role targets ${jdTitleNorm.function ?? "another function"}.`;
    }
    else if (title_score < 50 && profileTitleNorm && jdTitleNorm) {
        title_gap = `Title mismatch: your title is "${profileTitleNorm.normalized}", the role is "${jdTitleNorm.normalized}".`;
    }
    const profileRank = profileTitleNorm ? (SENIORITY_RANK[profileTitleNorm.level] ?? 0) : 0;
    const jdRank = jd.seniority_level ? (SENIORITY_RANK[jd.seniority_level] ?? 0) : 0;
    const resumeYears = profile.years_experience ?? 0;
    const jdYears = jd.years_required ?? 0;
    let yearsScore = 60;
    if (jdYears > 0) {
        const diff = jdYears - resumeYears;
        if (diff <= 0)
            yearsScore = 100;
        else if (diff <= 1)
            yearsScore = 85;
        else if (diff <= 2)
            yearsScore = 65;
        else if (diff <= 3)
            yearsScore = 45;
        else
            yearsScore = 20;
    }
    let levelScore = 60;
    if (jdRank > 0) {
        const rankDiff = Math.abs(jdRank - profileRank);
        if (rankDiff === 0)
            levelScore = 100;
        else if (rankDiff === 1)
            levelScore = 75;
        else if (rankDiff === 2)
            levelScore = 45;
        else
            levelScore = 15;
    }
    let seniority_score = 60;
    if (jdYears > 0 && jdRank > 0) {
        seniority_score = clamp((yearsScore * 0.7) + (levelScore * 0.3));
    }
    else if (jdYears > 0) {
        seniority_score = yearsScore;
    }
    else if (jdRank > 0) {
        seniority_score = levelScore;
    }
    let seniority_gap = null;
    if (jdRank > 0 && profileRank > 0 && jdRank !== profileRank) {
        if (jdRank > profileRank) {
            seniority_gap = `This role targets ${jd.seniority_level} level. Your profile appears to be ${profileTitleNorm?.level ?? "unknown"}.`;
        }
        else {
            seniority_gap = `You may be overqualified — role is ${jd.seniority_level}, but your profile is ${profileTitleNorm?.level ?? "unknown"}.`;
        }
    }
    else if (jdYears > 0 && resumeYears < jdYears) {
        seniority_gap = `Role requires ${jdYears}+ years experience; your profile shows ~${resumeYears} years.`;
    }
    const domain_score = (() => {
        if (role_family_match === 100)
            return 100;
        if (role_family_match === 70)
            return 70;
        if (!profileTitleNorm?.function || !jdTitleNorm?.function)
            return 50;
        return 20;
    })();
    const resumeLower = rawResumeText.toLowerCase();
    const leadershipGroups = countSignalGroups(resumeLower, LEADERSHIP_SIGNAL_GROUPS);
    const communicationGroups = countSignalGroups(resumeLower, COMMUNICATION_SIGNAL_GROUPS);
    const leadershipWeakEvidence = leadershipGroups === 0 && hasWeakSignal(resumeLower, WEAK_LEADERSHIP_SIGNALS);
    const communicationWeakEvidence = communicationGroups === 0 && hasWeakSignal(resumeLower, WEAK_COMMUNICATION_SIGNALS);
    const leadershipScore = scoreSignalGroups(leadershipGroups, leadershipWeakEvidence);
    const communicationScore = scoreSignalGroups(communicationGroups, communicationWeakEvidence);
    const dimension_scores = {
        title: title_score,
        skills: skills_score,
        seniority: seniority_score,
        domain: domain_score,
        leadership: leadershipScore,
        communication: communicationScore,
    };
    const hard_filter_result = (() => {
        if (role_family_match <= 20 && jd.required_skills.length > 0 && trueGapItems.length >= Math.ceil(jd.required_skills.length / 2)) {
            return "fail";
        }
        if (seniority_score <= 45 || trueGapItems.length >= 2) {
            return "soft_fail";
        }
        return "pass";
    })();
    const match_score = clamp((dimension_scores.title * OVERALL_SCORE_WEIGHTS.title) +
        (dimension_scores.skills * OVERALL_SCORE_WEIGHTS.skills) +
        (dimension_scores.seniority * OVERALL_SCORE_WEIGHTS.seniority) +
        (dimension_scores.domain * OVERALL_SCORE_WEIGHTS.domain) +
        (dimension_scores.leadership * OVERALL_SCORE_WEIGHTS.leadership) +
        (dimension_scores.communication * OVERALL_SCORE_WEIGHTS.communication));
    const match_label = match_score >= 80 ? "Strong match" :
        match_score >= 65 ? "Moderate match" :
            match_score >= 45 ? "Partial match" :
                "Low match";
    const gap_classification = requiredClassifications;
    const matched_skills = gap_classification
        .filter(item => item.status === "matched")
        .map(item => item.skill);
    const missing_skills = gap_classification
        .filter(item => item.status === "evidence_gap" || item.status === "true_gap")
        .map(item => item.skill);
    const evidence_gaps = evidenceGapItems.map(item => item.skill);
    const critical_gaps = trueGapItems.map(item => item.skill);
    const strengths = [
        ...matched_skills,
        ...(leadershipScore >= 75 ? ["Leadership"] : []),
        ...(communicationScore >= 75 ? ["Communication"] : []),
    ].filter((value, index, items) => items.indexOf(value) === index);
    return {
        match_score,
        skill_score: dimension_scores.skills,
        title_score: dimension_scores.title,
        experience_score: dimension_scores.seniority,
        matched_skills,
        missing_skills,
        extra_skills: extra.map(s => s.normalized),
        title_gap,
        seniority_gap,
        match_label,
        hard_filter_result,
        dimension_scores,
        title_breakdown,
        gap_classification,
        critical_gaps,
        evidence_gaps,
        strengths,
        recommendation: buildRecommendation(hard_filter_result, critical_gaps, evidence_gaps, match_score),
    };
}
