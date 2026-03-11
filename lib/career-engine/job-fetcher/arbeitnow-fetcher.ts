import type { SeekFetchStatus, SeekJob } from "./seek-fetcher";

export interface ArbeitnowFetchResult {
    status: SeekFetchStatus;
    jobs: SeekJob[];
    responseStatus?: number | null;
}

type ArbeitnowApiJob = {
    title?: string;
    company_name?: string;
    description?: string;
    location?: string;
    tags?: string[];
    job_types?: string[];
    url?: string;
    slug?: string;
};

type ArbeitnowApiResponse = {
    data?: ArbeitnowApiJob[];
};

function textMatchesQuery(text: string, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
    if (tokens.length === 0) return true;
    const haystack = text.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
}

function locationMatches(value: string | undefined, location: string): boolean {
    const loc = location.trim().toLowerCase();
    if (!loc) return true;
    if (!value) return false;
    return value.toLowerCase().includes(loc);
}

function toAbsoluteUrl(job: ArbeitnowApiJob): string {
    if (job.url && job.url.trim()) return job.url.trim();
    if (job.slug && job.slug.trim()) return `https://www.arbeitnow.com/jobs/${job.slug.trim()}`;
    return "";
}

export async function fetchArbeitnowJobs(query: string, location: string): Promise<ArbeitnowFetchResult> {
    const searchUrl = "https://www.arbeitnow.com/api/job-board-api";
    let response: Response;
    try {
        response = await fetch(searchUrl, {
            method: "GET",
            headers: {
                "User-Agent": "CareerTwinBot/1.0 (+job-search-fallback-real)",
                Accept: "application/json",
            },
        });
    } catch (error) {
        console.warn("arbeitnow-fetcher request failed:", error);
        return { status: "source_blocked", jobs: [], responseStatus: null };
    }

    if (!response.ok) {
        console.warn("arbeitnow-fetcher non-ok response:", { status: response.status });
        return {
            status: response.status === 403 ? "source_blocked" : "no_results",
            jobs: [],
            responseStatus: response.status,
        };
    }

    let payload: ArbeitnowApiResponse;
    try {
        payload = (await response.json()) as ArbeitnowApiResponse;
    } catch {
        return { status: "no_results", jobs: [], responseStatus: response.status };
    }

    const rawJobs = Array.isArray(payload.data) ? payload.data : [];
    const mapped = rawJobs
        .map((job) => {
            const title = (job.title ?? "").trim();
            const jobUrl = toAbsoluteUrl(job);
            const description = (job.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (!title || !jobUrl || description.length < 30) return null;

            const queryCorpus = [title, description, ...(job.tags ?? []), ...(job.job_types ?? [])].join(" ");
            if (!textMatchesQuery(queryCorpus, query)) return null;
            if (!locationMatches(job.location, location)) return null;

            return {
                title,
                company: job.company_name?.trim() || null,
                jobDescription: description.slice(0, 12000),
                jobUrl,
            } satisfies SeekJob;
        })
        .filter((job): job is SeekJob => Boolean(job))
        .slice(0, 30);

    if (mapped.length === 0) {
        return { status: "no_results", jobs: [], responseStatus: response.status };
    }
    return { status: "ok", jobs: mapped, responseStatus: response.status };
}
