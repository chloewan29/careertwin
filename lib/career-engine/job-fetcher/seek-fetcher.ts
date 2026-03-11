export interface SeekJob {
    title: string;
    company: string | null;
    jobDescription: string;
    jobUrl: string;
}

export type SeekFetchStatus = "ok" | "no_results" | "source_blocked";

export interface SeekFetchResult {
    status: SeekFetchStatus;
    jobs: SeekJob[];
    responseStatus?: number | null;
}

type SeekJobCandidate = {
    title: string;
    company: string | null;
    jobUrl: string;
    teaser: string;
};

function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, "\"")
        .replace(/\s+/g, " ")
        .trim();
}

function toAbsoluteSeekUrl(input: string): string {
    if (!input) return "";
    if (input.startsWith("http://") || input.startsWith("https://")) return input;
    if (input.startsWith("/")) return `https://www.seek.com.au${input}`;
    return `https://www.seek.com.au/${input}`;
}

function walkJson(value: unknown, visit: (node: Record<string, unknown>) => void): void {
    if (!value) return;
    if (Array.isArray(value)) {
        for (const item of value) walkJson(item, visit);
        return;
    }
    if (typeof value === "object") {
        const node = value as Record<string, unknown>;
        visit(node);
        for (const child of Object.values(node)) {
            walkJson(child, visit);
        }
    }
}

function parseSearchJsonCandidates(html: string): SeekJobCandidate[] {
    const candidates: SeekJobCandidate[] = [];
    const scripts = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)];

    for (const script of scripts) {
        const raw = script[1]?.trim();
        if (!raw) continue;
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            continue;
        }

        walkJson(parsed, (node) => {
            const title = typeof node.title === "string"
                ? node.title
                : typeof node.jobTitle === "string"
                    ? node.jobTitle
                    : null;
            if (!title) return;

            const urlRaw = typeof node.jobUrl === "string"
                ? node.jobUrl
                : typeof node.url === "string"
                    ? node.url
                    : typeof node.seoUrl === "string"
                        ? node.seoUrl
                        : typeof node.id === "number" || typeof node.id === "string"
                            ? `/job/${String(node.id)}`
                            : null;
            if (!urlRaw) return;

            const company =
                (typeof node.companyName === "string" && node.companyName)
                || (typeof node.advertiserDescription === "string" && node.advertiserDescription)
                || (typeof node.brand === "string" && node.brand)
                || null;

            const teaser =
                (typeof node.teaser === "string" && node.teaser)
                || (typeof node.shortDescription === "string" && node.shortDescription)
                || (typeof node.classification === "string" && node.classification)
                || "";

            candidates.push({
                title,
                company,
                jobUrl: toAbsoluteSeekUrl(urlRaw),
                teaser,
            });
        });
    }

    return candidates;
}

function parseSearchHtmlFallback(html: string): SeekJobCandidate[] {
    const candidates: SeekJobCandidate[] = [];
    const links = [...html.matchAll(/<a[^>]+href="([^"]*\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

    for (const match of links) {
        const href = toAbsoluteSeekUrl(match[1] ?? "");
        const title = htmlToText(match[2] ?? "").trim();
        if (!href || !title || title.length < 3) continue;
        candidates.push({
            title,
            company: null,
            jobUrl: href,
            teaser: "",
        });
    }

    return candidates;
}

async function fetchSeekJobDescription(jobUrl: string): Promise<string> {
    try {
        console.log("seek-fetcher fetching job detail:", { jobUrl });
        const response = await fetch(jobUrl, {
            method: "GET",
            headers: {
                "User-Agent": "CareerTwinBot/1.0 (+job-search)",
            },
        });
        if (!response.ok) {
            console.warn("seek-fetcher job detail non-ok response:", { jobUrl, status: response.status });
            return "";
        }

        const html = await response.text();
        const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1];
        if (ogDesc && ogDesc.length > 40) return ogDesc;

        const text = htmlToText(html);
        return text.slice(0, 12000);
    } catch {
        return "";
    }
}

export async function fetchSeekJobs(query: string, location: string): Promise<SeekFetchResult> {
    const searchUrl = new URL("https://www.seek.com.au/jobs");
    searchUrl.searchParams.set("keywords", query);
    if (location?.trim()) {
        searchUrl.searchParams.set("where", location.trim());
    }

    console.log("seek-fetcher search request:", {
        query,
        location: location || null,
        url: searchUrl.toString(),
    });

    let response: Response;
    try {
        response = await fetch(searchUrl.toString(), {
            method: "GET",
            headers: {
                "User-Agent": "CareerTwinBot/1.0 (+job-search)",
            },
        });
    } catch (error) {
        console.warn("seek-fetcher search request failed:", error);
        return { status: "source_blocked", jobs: [], responseStatus: null };
    }

    if (!response.ok) {
        console.warn("seek-fetcher search non-ok response:", { status: response.status });
        return {
            status: response.status === 403 ? "source_blocked" : "no_results",
            jobs: [],
            responseStatus: response.status,
        };
    }

    const html = await response.text();
    console.log("seek-fetcher raw search response snapshot:", {
        status: response.status,
        htmlLength: html.length,
        htmlPreview: html.slice(0, 500),
    });
    const parsedCandidates = parseSearchJsonCandidates(html);
    const fallbackCandidates = parsedCandidates.length > 0 ? [] : parseSearchHtmlFallback(html);
    console.log("seek-fetcher parsed candidates:", {
        jsonCandidates: parsedCandidates.length,
        fallbackCandidates: fallbackCandidates.length,
    });
    const combined = [...parsedCandidates, ...fallbackCandidates];

    const seen = new Set<string>();
    const unique = combined.filter((c) => {
        if (!c.jobUrl || seen.has(c.jobUrl)) return false;
        seen.add(c.jobUrl);
        return true;
    }).slice(0, 30);
    console.log("seek-fetcher unique candidates:", {
        combined: combined.length,
        unique: unique.length,
        sample: unique.slice(0, 3).map(c => ({ title: c.title, company: c.company, jobUrl: c.jobUrl })),
    });

    const hydrated = await Promise.all(
        unique.map(async (candidate) => {
            const fetchedDescription = await fetchSeekJobDescription(candidate.jobUrl);
            const teaser = candidate.teaser?.trim() ?? "";
            const jobDescription = fetchedDescription || teaser || `Role overview: ${candidate.title}.`;
            return {
                title: candidate.title,
                company: candidate.company,
                jobDescription,
                jobUrl: candidate.jobUrl,
            } satisfies SeekJob;
        })
    );
    const filtered = hydrated.filter((job) => job.jobDescription.trim().length > 10);
    console.log("seek-fetcher hydrated jobs:", {
        hydrated: hydrated.length,
        filtered: filtered.length,
    });
    if (filtered.length === 0) {
        return { status: "no_results", jobs: [], responseStatus: response.status };
    }
    return { status: "ok", jobs: filtered, responseStatus: response.status };
}
