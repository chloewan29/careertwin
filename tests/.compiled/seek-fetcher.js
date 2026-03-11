"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSeekJobs = fetchSeekJobs;
function htmlToText(html) {
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
function toAbsoluteSeekUrl(input) {
    if (!input)
        return "";
    if (input.startsWith("http://") || input.startsWith("https://"))
        return input;
    if (input.startsWith("/"))
        return `https://www.seek.com.au${input}`;
    return `https://www.seek.com.au/${input}`;
}
function walkJson(value, visit) {
    if (!value)
        return;
    if (Array.isArray(value)) {
        for (const item of value)
            walkJson(item, visit);
        return;
    }
    if (typeof value === "object") {
        const node = value;
        visit(node);
        for (const child of Object.values(node)) {
            walkJson(child, visit);
        }
    }
}
function parseSearchJsonCandidates(html) {
    const candidates = [];
    const scripts = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const script of scripts) {
        const raw = script[1]?.trim();
        if (!raw)
            continue;
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            continue;
        }
        walkJson(parsed, (node) => {
            const title = typeof node.title === "string"
                ? node.title
                : typeof node.jobTitle === "string"
                    ? node.jobTitle
                    : null;
            if (!title)
                return;
            const urlRaw = typeof node.jobUrl === "string"
                ? node.jobUrl
                : typeof node.url === "string"
                    ? node.url
                    : typeof node.seoUrl === "string"
                        ? node.seoUrl
                        : typeof node.id === "number" || typeof node.id === "string"
                            ? `/job/${String(node.id)}`
                            : null;
            if (!urlRaw)
                return;
            const company = (typeof node.companyName === "string" && node.companyName)
                || (typeof node.advertiserDescription === "string" && node.advertiserDescription)
                || (typeof node.brand === "string" && node.brand)
                || null;
            const teaser = (typeof node.teaser === "string" && node.teaser)
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
function parseSearchHtmlFallback(html) {
    const candidates = [];
    const links = [...html.matchAll(/<a[^>]+href="([^"]*\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const match of links) {
        const href = toAbsoluteSeekUrl(match[1] ?? "");
        const title = htmlToText(match[2] ?? "").trim();
        if (!href || !title || title.length < 3)
            continue;
        candidates.push({
            title,
            company: null,
            jobUrl: href,
            teaser: "",
        });
    }
    return candidates;
}
async function fetchSeekJobDescription(jobUrl) {
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
        if (ogDesc && ogDesc.length > 40)
            return ogDesc;
        const text = htmlToText(html);
        return text.slice(0, 12000);
    }
    catch {
        return "";
    }
}
async function fetchSeekJobs(query, location) {
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
    const response = await fetch(searchUrl.toString(), {
        method: "GET",
        headers: {
            "User-Agent": "CareerTwinBot/1.0 (+job-search)",
        },
    });
    if (!response.ok) {
        console.warn("seek-fetcher search non-ok response:", { status: response.status });
        return [];
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
    const seen = new Set();
    const unique = combined.filter((c) => {
        if (!c.jobUrl || seen.has(c.jobUrl))
            return false;
        seen.add(c.jobUrl);
        return true;
    }).slice(0, 30);
    console.log("seek-fetcher unique candidates:", {
        combined: combined.length,
        unique: unique.length,
        sample: unique.slice(0, 3).map(c => ({ title: c.title, company: c.company, jobUrl: c.jobUrl })),
    });
    const hydrated = await Promise.all(unique.map(async (candidate) => {
        const fetchedDescription = await fetchSeekJobDescription(candidate.jobUrl);
        const jobDescription = fetchedDescription || candidate.teaser || candidate.title;
        return {
            title: candidate.title,
            company: candidate.company,
            jobDescription,
            jobUrl: candidate.jobUrl,
        };
    }));
    const filtered = hydrated.filter((job) => job.jobDescription.length > 30);
    console.log("seek-fetcher hydrated jobs:", {
        hydrated: hydrated.length,
        filtered: filtered.length,
    });
    return filtered;
}
