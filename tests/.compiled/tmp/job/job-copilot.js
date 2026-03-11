"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJobRecommendations = generateJobRecommendations;
const capability_inference_1 = require("../capability/capability-inference");
const role_expansion_1 = require("../capability/role-expansion");
const seek_fetcher_1 = require("../job-fetcher/seek-fetcher");
const mock_job_source_1 = require("./mock-job-source");
const role_matcher_1 = require("../matching/role-matcher");
const jd_parser_1 = require("../parsing/jd-parser");
const skill_normalizer_1 = require("../parsing/skill-normalizer");
function dedupeKey(jobUrl, title, company) {
    if (jobUrl && jobUrl.trim())
        return `url:${jobUrl.trim().toLowerCase()}`;
    return `title:${title.trim().toLowerCase()}|company:${(company ?? "").trim().toLowerCase()}`;
}
function buildWhyFit(matchScore, matchedSkills, matchLabel) {
    const reasons = [];
    reasons.push(`Match level: ${matchLabel} (${matchScore}).`);
    if (matchedSkills.length > 0) {
        reasons.push(`Matched capabilities/skills: ${matchedSkills.slice(0, 3).join(", ")}.`);
    }
    else {
        reasons.push("General role-family alignment detected.");
    }
    return reasons;
}
function toProfileForMatcher(profile, capabilities) {
    return {
        current_title: profile.current_title,
        years_experience: profile.years_experience ?? null,
        skills: (0, skill_normalizer_1.normalizeSkills)(profile.skills ?? []).map((s) => s.normalized),
        parsed_skills: profile.skills ?? [],
        capabilities,
        resume_text: profile.resume_text ?? "",
    };
}
async function generateJobRecommendations(profile) {
    const capabilityInput = {
        current_title: profile.current_title,
        summary: profile.summary ?? null,
        experience_entries: profile.experience_entries ?? [],
        resume_text: profile.resume_text ?? null,
    };
    const capabilityResult = (0, capability_inference_1.inferCapabilities)(capabilityInput);
    const expandedRoles = (0, role_expansion_1.expandRolesFromCapabilities)({
        capabilities: capabilityResult.capabilities,
        current_title: profile.current_title,
    });
    const targetRoles = expandedRoles.filter((role) => role.category === "best_fit" || role.category === "safe_stretch");
    if (targetRoles.length === 0) {
        return { recommended_jobs: [] };
    }
    const profileForMatcher = toProfileForMatcher(profile, capabilityResult.capabilities);
    const fetchedByRole = await Promise.all(targetRoles.map(async (expandedRole) => {
        const searchResult = await (0, seek_fetcher_1.fetchSeekJobs)(expandedRole.role, profile.location ?? "");
        const useMock = searchResult.status !== "ok" || searchResult.jobs.length === 0;
        const jobs = useMock ? (0, mock_job_source_1.getMockJobsForRole)(expandedRole.role) : searchResult.jobs;
        return {
            expandedRole,
            jobs,
            source: useMock ? "mock" : "live",
        };
    }));
    console.log("job-copilot role source trace:", fetchedByRole.map((batch) => ({
        role: batch.expandedRole.role,
        source: batch.source,
        jobs: batch.jobs.length,
    })));
    const scoredJobs = [];
    for (const roleBatch of fetchedByRole) {
        for (const job of roleBatch.jobs) {
            const parsedJD = (0, jd_parser_1.parseJobDescription)(job.jobDescription);
            const match = (0, role_matcher_1.matchRoles)(profileForMatcher, parsedJD);
            const key = dedupeKey(job.jobUrl, job.title, job.company);
            scoredJobs.push({
                key,
                source_roles: [roleBatch.expandedRole.role],
                source: roleBatch.source,
                job_url: job.jobUrl ?? null,
                job_title: job.title,
                company: job.company,
                job_description: job.jobDescription,
                match_score: match.match_score,
                probability_band: roleBatch.expandedRole.probability_band,
                why_fit: buildWhyFit(match.match_score, match.matched_skills, match.match_label),
                tailored_resume_available: true,
            });
        }
    }
    const deduped = new Map();
    for (const job of scoredJobs) {
        const existing = deduped.get(job.key);
        if (!existing) {
            deduped.set(job.key, job);
            continue;
        }
        const sourceRoles = Array.from(new Set([...existing.source_roles, ...job.source_roles]));
        if (job.match_score > existing.match_score) {
            deduped.set(job.key, {
                ...job,
                source_roles: sourceRoles,
            });
        }
        else {
            deduped.set(job.key, {
                ...existing,
                source_roles: sourceRoles,
            });
        }
    }
    const recommended_jobs = Array.from(deduped.values())
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10)
        .map((job) => ({
        job_url: job.job_url,
        job_title: job.job_title,
        company: job.company,
        job_description: job.job_description,
        source: job.source,
        match_score: job.match_score,
        probability_band: job.probability_band,
        why_fit: job.why_fit,
        tailored_resume_available: job.tailored_resume_available,
    }));
    const liveCount = recommended_jobs.filter((job) => job.source === "live").length;
    const mockCount = recommended_jobs.filter((job) => job.source === "mock").length;
    console.log("job-copilot recommended source summary:", {
        live: liveCount,
        mock: mockCount,
        mode: liveCount > 0 && mockCount > 0 ? "mixed" : (liveCount > 0 ? "live" : "mock"),
        returned: recommended_jobs.length,
    });
    return { recommended_jobs };
}
