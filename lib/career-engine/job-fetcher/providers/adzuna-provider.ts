import type { JobProvider, JobProviderFetchResult, NormalizedJob } from "./types";

type AdzunaResultItem = {
    title?: string;
    description?: string;
    redirect_url?: string;
    company?: { display_name?: string | null } | null;
    location?: { display_name?: string | null } | null;
};

type AdzunaSearchResponse = {
    results?: AdzunaResultItem[];
};

function normalizeAdzunaJob(item: AdzunaResultItem): NormalizedJob | null {
    const title = (item.title ?? "").trim();
    const jobUrl = (item.redirect_url ?? "").trim();
    const description = (item.description ?? "").trim();
    if (!title || !jobUrl || description.length < 20) return null;
    return {
        title,
        company: item.company?.display_name?.trim() || null,
        location: item.location?.display_name?.trim() || null,
        jobDescription: description,
        jobUrl,
    };
}

export const adzunaProvider: JobProvider = {
    name: "adzuna",
    async fetchJobs(query: string, location: string): Promise<JobProviderFetchResult> {
        const appId = process.env.ADZUNA_APP_ID?.trim();
        const appKey = process.env.ADZUNA_APP_KEY?.trim();
        const country = (process.env.ADZUNA_COUNTRY ?? "au").trim();
        const resultsPerPage = Number.parseInt(process.env.ADZUNA_RESULTS_PER_PAGE ?? "20", 10);

        if (!appId || !appKey) {
            return {
                provider: "adzuna",
                status: "error",
                jobs: [],
                responseStatus: null,
                error: "missing_adzuna_credentials",
            };
        }

        const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
        url.searchParams.set("app_id", appId);
        url.searchParams.set("app_key", appKey);
        url.searchParams.set("results_per_page", String(Number.isFinite(resultsPerPage) ? resultsPerPage : 20));
        url.searchParams.set("what", query);
        if (location.trim()) {
            url.searchParams.set("where", location.trim());
        }

        let response: Response;
        try {
            response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "User-Agent": "CareerTwinBot/1.0 (+job-copilot-adzuna)",
                },
            });
        } catch (error) {
            return {
                provider: "adzuna",
                status: "source_blocked",
                jobs: [],
                responseStatus: null,
                error: error instanceof Error ? error.message : "network_error",
            };
        }

        if (!response.ok) {
            return {
                provider: "adzuna",
                status: response.status === 403 ? "source_blocked" : "no_results",
                jobs: [],
                responseStatus: response.status,
                error: `http_${response.status}`,
            };
        }

        let data: AdzunaSearchResponse;
        try {
            data = (await response.json()) as AdzunaSearchResponse;
        } catch {
            return {
                provider: "adzuna",
                status: "error",
                jobs: [],
                responseStatus: response.status,
                error: "invalid_json",
            };
        }

        const jobs = (Array.isArray(data.results) ? data.results : [])
            .map(normalizeAdzunaJob)
            .filter((job): job is NormalizedJob => Boolean(job));

        const rawSample = Array.isArray(data.results) && data.results.length > 0 ? data.results[0] : null;
        console.log("adzuna provider raw job sample:", rawSample ? {
            title: rawSample.title ?? null,
            company: rawSample.company?.display_name ?? null,
            location: rawSample.location?.display_name ?? null,
            redirect_url: rawSample.redirect_url ?? null,
            description_length: (rawSample.description ?? "").length,
            description_preview: (rawSample.description ?? "").slice(0, 300),
        } : null);
        console.log("adzuna provider normalized jobs:", {
            count: jobs.length,
            first: jobs[0] ? {
                title: jobs[0].title,
                company: jobs[0].company,
                location: jobs[0].location ?? null,
                jobUrl: jobs[0].jobUrl,
                jobDescriptionLength: jobs[0].jobDescription.length,
            } : null,
        });

        return {
            provider: "adzuna",
            status: jobs.length > 0 ? "ok" : "no_results",
            jobs,
            responseStatus: response.status,
            error: null,
        };
    },
};
