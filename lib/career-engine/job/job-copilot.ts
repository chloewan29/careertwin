import { inferCapabilities, type CapabilityInferenceInput } from "../capability/capability-inference";
import { expandRolesFromCapabilities, type ExpandedRoleCategory, type ProbabilityBand } from "../capability/role-expansion";
import { fetchJobsFromProviders, getJobProviders } from "../job-fetcher/providers";
import { getMockJobsForRole } from "./mock-job-source";
import { matchRoles, type ProfileInput } from "../matching/role-matcher";
import { parseJobDescription } from "../parsing/jd-parser";
import { normalizeSkills } from "../parsing/skill-normalizer";

// LEGACY MODULE:
// This provider-driven recommendation flow was the old Job Copilot feed path.
// The active workflow now starts from the browser extension (job detail pages viewed by user).
// Keep this module for compatibility until full removal is validated.

export type JobCopilotProfileInput = {
    current_title: string | null;
    query_override?: string | null;
    summary?: string | null;
    years_experience?: number | null;
    skills: string[];
    experience_entries?: Array<{
        title?: string | null;
        company?: string | null;
        date_range?: string | null;
        description?: string | null;
        highlights?: string[] | null;
    }>;
    resume_text?: string | null;
    location?: string | null;
};

export type RecommendedJob = {
    job_url: string | null;
    job_title: string;
    company: string | null;
    location?: string | null;
    job_description: string;
    source: "live" | "mock";
    fit_category: ExpandedRoleCategory;
    match_score: number;
    probability_band: ProbabilityBand;
    why_fit: string[];
    tailored_resume_available: boolean;
};

export type JobCopilotRoleSearchStats = {
    role: string;
    fit_category: ExpandedRoleCategory;
    source: "live" | "mock";
    provider: string | null;
    provider_status: "ok" | "no_results" | "source_blocked" | "error" | null;
    provider_response_status: number | null;
    provider_jobs_returned: number;
    provider_attempts: Array<{
        provider: string;
        status: "ok" | "no_results" | "source_blocked" | "error";
        responseStatus: number | null;
        jobsReturned: number;
        error: string | null;
    }>;
    query_variants_tried: string[];
    selected_query_variant: string | null;
    final_jobs_used: number;
    fallback_trigger_reason: string | null;
};

export type JobCopilotRecommendationResult = {
    recommended_jobs: RecommendedJob[];
    meta: {
        roles_searched: number;
        jobs_fetched_per_role: JobCopilotRoleSearchStats[];
        source_summary: {
            live: number;
            mock: number;
            mode: "live" | "mock" | "mixed";
        };
    };
};

type RecommendedJobInternal = RecommendedJob & {
    canonical_job_id: string;
    source_roles: string[];
    source_fit_categories: ExpandedRoleCategory[];
    source: "live" | "mock";
};

const ROLE_QUERY_VARIANTS: Record<string, string[]> = {
    "data product manager": [
        "Data Product Manager",
        "Data Platform Product Manager",
        "Analytics Product Manager",
        "Product Manager Data",
    ],
    "bi lead": [
        "BI Lead",
        "Business Intelligence Lead",
        "BI Manager",
        "Analytics Lead",
    ],
};

function canonicalizeJobUrl(jobUrl: string | null): string {
    const raw = (jobUrl ?? "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw);
        parsed.search = "";
        parsed.hash = "";
        const canonical = parsed.toString().replace(/\/+$/, "");
        return canonical.toLowerCase();
    } catch {
        return raw.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
    }
}

function normalizeJobTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeCompany(company: string | null): string {
    return (company ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\b(proprietary|pty|ltd|limited|inc|llc|corp|corporation|co|company)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenizeNormalized(text: string): string[] {
    return text
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);
}

function tokenOverlapScore(a: string, b: string): number {
    const setA = new Set(tokenizeNormalized(a));
    const setB = new Set(tokenizeNormalized(b));
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }
    return intersection / Math.min(setA.size, setB.size);
}

function normalizeDescription(description: string): string {
    return description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function areLikelyFuzzyDuplicates(a: RecommendedJobInternal, b: RecommendedJobInternal): boolean {
    const normalizedTitleA = normalizeJobTitle(a.job_title);
    const normalizedTitleB = normalizeJobTitle(b.job_title);
    const titleSimilar = normalizedTitleA === normalizedTitleB
        || tokenOverlapScore(normalizedTitleA, normalizedTitleB) >= 0.9;
    if (!titleSimilar) return false;

    const normalizedCompanyA = normalizeCompany(a.company);
    const normalizedCompanyB = normalizeCompany(b.company);
    const companySimilar = normalizedCompanyA === normalizedCompanyB
        || tokenOverlapScore(normalizedCompanyA, normalizedCompanyB) >= 0.8;
    if (!companySimilar) return false;

    const normalizedDescA = normalizeDescription(a.job_description);
    const normalizedDescB = normalizeDescription(b.job_description);
    const descriptionOverlap = tokenOverlapScore(normalizedDescA, normalizedDescB);
    return descriptionOverlap >= 0.85;
}

function dedupeKey(jobUrl: string | null, title: string, company: string | null): string {
    const canonicalUrl = canonicalizeJobUrl(jobUrl);
    if (canonicalUrl) return `url:${canonicalUrl}`;
    return `title_company:${normalizeJobTitle(title)}|${normalizeCompany(company)}`;
}

function pickBetterCompanyName(current: string | null, candidate: string | null): string | null {
    const currentTrimmed = current?.trim() ?? "";
    const candidateTrimmed = candidate?.trim() ?? "";
    if (!currentTrimmed) return candidateTrimmed || null;
    if (!candidateTrimmed) return currentTrimmed || null;

    // Prefer value with punctuation/casing richness (often closer to original brand format).
    const currentRichness = (/[A-Z]/.test(currentTrimmed) ? 1 : 0) + (/[&.,]/.test(currentTrimmed) ? 1 : 0);
    const candidateRichness = (/[A-Z]/.test(candidateTrimmed) ? 1 : 0) + (/[&.,]/.test(candidateTrimmed) ? 1 : 0);
    if (candidateRichness > currentRichness) return candidateTrimmed;
    if (currentRichness > candidateRichness) return currentTrimmed;

    // Tie-breaker: keep longer non-noisy display name.
    return candidateTrimmed.length > currentTrimmed.length ? candidateTrimmed : currentTrimmed;
}

function buildWhyFit(matchScore: number, matchedSkills: string[], matchLabel: string): string[] {
    const reasons: string[] = [];
    reasons.push(`Match level: ${matchLabel} (${matchScore}).`);
    if (matchedSkills.length > 0) {
        reasons.push(`Matched capabilities/skills: ${matchedSkills.slice(0, 3).join(", ")}.`);
    } else {
        reasons.push("General role-family alignment detected.");
    }
    return reasons;
}

function toProfileForMatcher(profile: JobCopilotProfileInput, capabilities: string[]): ProfileInput {
    return {
        current_title: profile.current_title,
        years_experience: profile.years_experience ?? null,
        skills: normalizeSkills(profile.skills ?? []).map((s) => s.normalized),
        parsed_skills: profile.skills ?? [],
        capabilities,
        resume_text: profile.resume_text ?? "",
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRoleQueryVariants(role: string): string[] {
    const normalized = role.trim().toLowerCase();
    const variants = ROLE_QUERY_VARIANTS[normalized];
    if (!variants || variants.length === 0) return [role];
    const ordered = [role, ...variants];
    return Array.from(new Set(ordered.map((entry) => entry.trim()).filter((entry) => entry.length > 0)));
}

const SENIORITY_ORDER = [
    "Analyst",
    "Senior Analyst",
    "Lead",
    "Manager",
    "Senior Manager",
    "Head",
    "Director",
    "VP",
] as const;

type SeniorityLevel = typeof SENIORITY_ORDER[number];

function detectSeniority(title: string | null | undefined): SeniorityLevel | null {
    const value = (title ?? "").toLowerCase();
    if (!value) return null;

    if (/\b(vp|vice president)\b/.test(value)) return "VP";
    if (/\bdirector\b/.test(value)) return "Director";
    if (/\bhead\b/.test(value)) return "Head";
    if (/\bsenior manager\b/.test(value)) return "Senior Manager";
    if (/\bmanager\b/.test(value)) return "Manager";
    if (/\blead\b/.test(value)) return "Lead";
    if (/\b(senior analyst|sr analyst)\b/.test(value)) return "Senior Analyst";
    if (/\b(analyst|junior analyst|jr analyst)\b/.test(value)) return "Analyst";
    return null;
}

function seniorityIndex(level: SeniorityLevel | null): number {
    if (!level) return -1;
    return SENIORITY_ORDER.indexOf(level);
}

function inferUserSeniority(profile: JobCopilotProfileInput): SeniorityLevel | null {
    const candidates: Array<string | null | undefined> = [profile.current_title];
    for (const entry of profile.experience_entries ?? []) {
        candidates.push(entry.title);
    }

    let best: SeniorityLevel | null = null;
    let bestIndex = -1;
    for (const candidate of candidates) {
        const detected = detectSeniority(candidate);
        const idx = seniorityIndex(detected);
        if (idx > bestIndex) {
            best = detected;
            bestIndex = idx;
        }
    }
    return best;
}

export async function generateJobRecommendations(
    profile: JobCopilotProfileInput
): Promise<JobCopilotRecommendationResult> {
    const capabilityInput: CapabilityInferenceInput = {
        current_title: profile.current_title,
        summary: profile.summary ?? null,
        experience_entries: profile.experience_entries ?? [],
        resume_text: profile.resume_text ?? null,
    };
    const capabilityResult = inferCapabilities(capabilityInput);
    const expandedRoles = expandRolesFromCapabilities({
        capabilities: capabilityResult.capabilities,
        current_title: profile.current_title,
    });

    const targetRoles = expandedRoles.filter(
        (role) => role.category === "best_fit" || role.category === "safe_stretch"
    );
    const queryOverride = profile.query_override?.trim() ?? "";
    const searchTargets: Array<{ role: string; probability_band: ProbabilityBand; fit_category: ExpandedRoleCategory }> = queryOverride
        ? [{ role: queryOverride, probability_band: "medium", fit_category: "safe_stretch" }]
        : targetRoles.map((role) => ({
            role: role.role,
            probability_band: role.probability_band,
            fit_category: role.category,
        }));

    if (searchTargets.length === 0) {
        return {
            recommended_jobs: [],
            meta: {
                roles_searched: 0,
                jobs_fetched_per_role: [],
                source_summary: {
                    live: 0,
                    mock: 0,
                    mode: "mock",
                },
            },
        };
    }

    const profileForMatcher = toProfileForMatcher(profile, capabilityResult.capabilities);
    const providerNames = getJobProviders().map((provider) => provider.name);

    const roleDelayMs = Math.max(0, Number.parseInt(process.env.JOB_PROVIDER_ROLE_DELAY_MS ?? "250", 10) || 0);
    const variantDelayMs = Math.max(0, Number.parseInt(process.env.JOB_PROVIDER_VARIANT_DELAY_MS ?? "400", 10) || 0);
    const fetchedByRole: Array<{
        role: string;
        probability_band: ProbabilityBand;
        fit_category: ExpandedRoleCategory;
        jobs: Array<{ title: string; company: string | null; location?: string | null; jobDescription: string; jobUrl: string }>;
        source: "live" | "mock";
        provider: string | null;
        provider_status: "ok" | "no_results" | "source_blocked" | "error" | null;
        provider_response_status: number | null;
        provider_jobs_returned: number;
        provider_attempts: JobCopilotRoleSearchStats["provider_attempts"];
        query_variants_tried: string[];
        selected_query_variant: string | null;
        fallback_trigger_reason: string | null;
    }> = [];

    for (let i = 0; i < searchTargets.length; i += 1) {
        const target = searchTargets[i];
        if (i > 0 && roleDelayMs > 0) {
            await sleep(roleDelayMs);
        }

        const queryVariants = getRoleQueryVariants(target.role);
        const allAttempts: JobCopilotRoleSearchStats["provider_attempts"] = [];
        let selectedProviderResult: Awaited<ReturnType<typeof fetchJobsFromProviders>>["selected"] = null;
        let selectedVariant: string | null = null;

        for (let variantIndex = 0; variantIndex < queryVariants.length; variantIndex += 1) {
            const variantQuery = queryVariants[variantIndex];
            console.log("job-copilot provider fetch start:", {
                providers: providerNames,
                role: target.role,
                query_variant: variantQuery,
                location: profile.location ?? "",
            });
            const providerResolution = await fetchJobsFromProviders(variantQuery, profile.location ?? "");

            for (const attempt of providerResolution.attempts) {
                allAttempts.push({
                    ...attempt,
                    error: attempt.error ? `${attempt.error};query=${variantQuery}` : `query=${variantQuery}`,
                });
                console.log("job-copilot provider fetch result:", {
                    provider: attempt.provider,
                    role: target.role,
                    query_variant: variantQuery,
                    status: attempt.status,
                    responseStatus: attempt.responseStatus,
                    jobsReturned: attempt.jobsReturned,
                    error: attempt.error,
                });
            }

            if (providerResolution.selected) {
                selectedProviderResult = providerResolution.selected;
                selectedVariant = variantQuery;
                console.log("job-copilot query variant selected:", {
                    role: target.role,
                    selected_query_variant: variantQuery,
                    provider: providerResolution.selected.provider,
                    jobs_returned: providerResolution.selected.jobs.length,
                });
                break;
            }

            if (variantIndex < queryVariants.length - 1 && variantDelayMs > 0) {
                await sleep(variantDelayMs);
            }
        }

        const providerResult = selectedProviderResult;
        const useMock = !providerResult;
        const jobs = providerResult ? providerResult.jobs : getMockJobsForRole(target.role);
        const fallbackTriggerReason = useMock
            ? (allAttempts.length > 0
                ? `providers_exhausted:${allAttempts.map((attempt) => `${attempt.provider}:${attempt.status}${attempt.responseStatus != null ? `(${attempt.responseStatus})` : ""}`).join("|")}`
                : "no_providers_configured")
            : null;

        fetchedByRole.push({
            role: target.role,
            probability_band: target.probability_band,
            fit_category: target.fit_category,
            jobs,
            source: useMock ? "mock" : "live",
            provider: providerResult?.provider ?? null,
            provider_status: providerResult?.status ?? null,
            provider_response_status: providerResult?.responseStatus ?? null,
            provider_jobs_returned: providerResult?.jobs.length ?? 0,
            provider_attempts: allAttempts,
            query_variants_tried: queryVariants,
            selected_query_variant: selectedVariant,
            fallback_trigger_reason: fallbackTriggerReason,
        });
    }
    console.log("job-copilot role source trace:", fetchedByRole.map((batch) => ({
        role: batch.role,
        source: batch.source,
        jobs: batch.jobs.length,
    })));
    const jobsFetchedPerRole: JobCopilotRoleSearchStats[] = fetchedByRole.map((batch) => ({
        role: batch.role,
        fit_category: batch.fit_category,
        source: batch.source,
        provider: batch.provider,
        provider_status: batch.provider_status,
        provider_response_status: batch.provider_response_status,
        provider_jobs_returned: batch.provider_jobs_returned,
        provider_attempts: batch.provider_attempts,
        query_variants_tried: batch.query_variants_tried,
        selected_query_variant: batch.selected_query_variant,
        final_jobs_used: batch.jobs.length,
        fallback_trigger_reason: batch.fallback_trigger_reason,
    }));

    const scoredJobs: RecommendedJobInternal[] = [];
    for (const roleBatch of fetchedByRole) {
        for (const job of roleBatch.jobs) {
            const parsedJD = parseJobDescription(job.jobDescription);
            const match = matchRoles(profileForMatcher, parsedJD);
            const key = dedupeKey(job.jobUrl, job.title, job.company);
            if (!key) continue;
            scoredJobs.push({
                canonical_job_id: key,
                source_roles: [roleBatch.role],
                source_fit_categories: [roleBatch.fit_category],
                source: roleBatch.source,
                job_url: job.jobUrl ?? null,
                job_title: job.title,
                company: job.company,
                location: job.location ?? null,
                job_description: job.jobDescription,
                match_score: match.match_score,
                fit_category: roleBatch.fit_category,
                probability_band: roleBatch.probability_band,
                why_fit: buildWhyFit(match.match_score, match.matched_skills, match.match_label),
                tailored_resume_available: true,
            });
        }
    }

    const deduped = new Map<string, RecommendedJobInternal>();
    const mergedCanonicalDuplicates: Array<{
        canonical_job_id: string;
        kept_title: string;
        merged_title: string;
        kept_score: number;
        merged_score: number;
    }> = [];

    for (const job of scoredJobs) {
        const existing = deduped.get(job.canonical_job_id);
        if (!existing) {
            deduped.set(job.canonical_job_id, job);
            continue;
        }

        const sourceRoles = Array.from(new Set([...existing.source_roles, ...job.source_roles]));
        const sourceFitCategories = Array.from(new Set([...existing.source_fit_categories, ...job.source_fit_categories]));
        if (job.match_score > existing.match_score) {
            mergedCanonicalDuplicates.push({
                canonical_job_id: job.canonical_job_id,
                kept_title: job.job_title,
                merged_title: existing.job_title,
                kept_score: job.match_score,
                merged_score: existing.match_score,
            });
            deduped.set(job.canonical_job_id, {
                ...job,
                source_roles: sourceRoles,
                source_fit_categories: sourceFitCategories,
                company: pickBetterCompanyName(job.company, existing.company),
            });
        } else {
            mergedCanonicalDuplicates.push({
                canonical_job_id: job.canonical_job_id,
                kept_title: existing.job_title,
                merged_title: job.job_title,
                kept_score: existing.match_score,
                merged_score: job.match_score,
            });
            deduped.set(job.canonical_job_id, {
                ...existing,
                source_roles: sourceRoles,
                source_fit_categories: sourceFitCategories,
                company: pickBetterCompanyName(existing.company, job.company),
            });
        }
    }

    const canonicalDedupedJobs = Array.from(deduped.values());
    const fuzzyMerged: RecommendedJobInternal[] = [];
    const mergedFuzzyDuplicates: Array<{
        kept_title: string;
        merged_title: string;
        kept_score: number;
        merged_score: number;
    }> = [];

    for (const candidate of canonicalDedupedJobs) {
        const existingIdx = fuzzyMerged.findIndex((job) => areLikelyFuzzyDuplicates(job, candidate));
        if (existingIdx < 0) {
            fuzzyMerged.push(candidate);
            continue;
        }

        const existing = fuzzyMerged[existingIdx];
        const sourceRoles = Array.from(new Set([...existing.source_roles, ...candidate.source_roles]));
        const sourceFitCategories = Array.from(new Set([...existing.source_fit_categories, ...candidate.source_fit_categories]));

        if (candidate.match_score > existing.match_score) {
            mergedFuzzyDuplicates.push({
                kept_title: candidate.job_title,
                merged_title: existing.job_title,
                kept_score: candidate.match_score,
                merged_score: existing.match_score,
            });
            fuzzyMerged[existingIdx] = {
                ...candidate,
                source_roles: sourceRoles,
                source_fit_categories: sourceFitCategories,
                company: pickBetterCompanyName(candidate.company, existing.company),
            };
        } else {
            mergedFuzzyDuplicates.push({
                kept_title: existing.job_title,
                merged_title: candidate.job_title,
                kept_score: existing.match_score,
                merged_score: candidate.match_score,
            });
            fuzzyMerged[existingIdx] = {
                ...existing,
                source_roles: sourceRoles,
                source_fit_categories: sourceFitCategories,
                company: pickBetterCompanyName(existing.company, candidate.company),
            };
        }
    }

    console.log("job-copilot dedupe summary:", {
        jobs_before_dedupe: scoredJobs.length,
        canonical_duplicates_merged: mergedCanonicalDuplicates.length,
        fuzzy_duplicates_merged: mergedFuzzyDuplicates.length,
        final_job_count: fuzzyMerged.length,
        canonical_merged: mergedCanonicalDuplicates.slice(0, 25),
        fuzzy_merged: mergedFuzzyDuplicates.slice(0, 25),
    });

    const userSeniority = inferUserSeniority(profile);
    console.log("job-copilot seniority guardrail user_seniority:", {
        user_seniority: userSeniority,
    });

    const seniorityFilteredJobs = fuzzyMerged.filter((job) => {
        const jobSeniority = detectSeniority(job.job_title);
        const userIdx = seniorityIndex(userSeniority);
        const jobIdx = seniorityIndex(jobSeniority);
        const excluded = userIdx >= 0 && jobIdx >= 0 && (userIdx - jobIdx) >= 2;

        if (excluded) {
            console.log("job-copilot seniority guardrail exclusion:", {
                user_seniority: userSeniority,
                job_title: job.job_title,
                job_seniority: jobSeniority,
                excluded_due_to_seniority: true,
            });
        }
        return !excluded;
    });

    const recommended_jobs = seniorityFilteredJobs
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10)
        .map((job) => ({
            job_url: job.job_url,
            job_title: job.job_title,
            company: job.company,
            location: job.location ?? null,
            job_description: job.job_description,
            source: job.source,
            match_score: job.match_score,
            fit_category: job.fit_category,
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
    const sourceSummary = {
        live: liveCount,
        mock: mockCount,
        mode: (liveCount > 0 && mockCount > 0 ? "mixed" : (liveCount > 0 ? "live" : "mock")) as "live" | "mock" | "mixed",
    };

    return {
        recommended_jobs,
        meta: {
            roles_searched: searchTargets.length,
            jobs_fetched_per_role: jobsFetchedPerRole,
            source_summary: sourceSummary,
        },
    };
}
