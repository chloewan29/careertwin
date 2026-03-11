import type { SupportedJobSource } from "./job-page-detector";

const MIN_DESCRIPTION_LENGTH = 180;

export type ExtractedJobDetail = {
    jobTitle: string | null;
    company: string | null;
    location: string | null;
    jobDescription: string | null;
    jobUrl: string;
    sourcePlatform: "linkedin" | "seek";
    extractedAt: string;
    extractionDiagnostics?: {
        titleFound: boolean;
        companyFound: boolean;
        locationFound: boolean;
        descriptionFound: boolean;
        descriptionLength: number;
        weakExtraction: boolean;
    };
};

export type JobExtractionState = "ready" | "weak_extraction" | "unsupported";

export type JobExtractionResult =
    | { state: "unsupported"; reason: string; detail: null }
    | { state: "weak_extraction"; reason: string; detail: ExtractedJobDetail }
    | { state: "ready"; reason: "ok"; detail: ExtractedJobDetail };

type PlatformSelectorConfig = {
    title: string[];
    company: string[];
    location: string[];
    description: string[];
};

const SELECTORS_BY_PLATFORM: Record<SupportedJobSource, PlatformSelectorConfig> = {
    linkedin: {
        title: [
            "h1.job-details-jobs-unified-top-card__job-title",
            "h1.top-card-layout__title",
            "h1.t-24",
        ],
        company: [
            ".job-details-jobs-unified-top-card__company-name a",
            ".job-details-jobs-unified-top-card__company-name",
            "a.topcard__org-name-link",
        ],
        location: [
            ".job-details-jobs-unified-top-card__primary-description-container",
            ".job-details-jobs-unified-top-card__bullet",
            ".topcard__flavor--bullet",
        ],
        // Keep this targeted to main description containers and avoid full-page scraping.
        description: [
            ".jobs-description__container .jobs-description-content__text",
            ".jobs-description-content__text",
            ".show-more-less-html__markup",
            ".jobs-box__html-content",
        ],
    },
    seek: {
        title: [
            "[data-automation='job-detail-title']",
            "h1",
        ],
        company: [
            "[data-automation='advertiser-name']",
            "a[data-automation='company-link']",
        ],
        location: [
            "[data-automation='job-detail-location']",
            "[data-automation='job-detail-work-type']",
        ],
        description: [
            "[data-automation='jobAdDetails']",
            "[data-automation='jobDescription']",
        ],
    },
};

function normalizeWhitespace(value: string): string {
    return value
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

function cleanLabelPrefix(value: string): string {
    return value
        .replace(/^\s*(location|located in|company|about the role)\s*:\s*/i, "")
        .replace(/^\s*job\s+description\s*$/i, "")
        .trim();
}

function firstTextFromSelectors(selectors: string[]): string | null {
    for (const selector of selectors) {
        const node = document.querySelector(selector);
        const raw = node?.textContent ?? "";
        const text = cleanLabelPrefix(normalizeWhitespace(raw));
        if (text) return text;
    }
    return null;
}

function descriptionTextFromSelectors(selectors: string[]): string | null {
    for (const selector of selectors) {
        const nodes = Array.from(document.querySelectorAll(selector));
        if (nodes.length === 0) continue;

        const chunks: string[] = [];
        for (const node of nodes) {
            const text = cleanLabelPrefix(normalizeWhitespace(node.textContent ?? ""));
            if (text && !chunks.includes(text)) chunks.push(text);
        }
        if (chunks.length > 0) return chunks.join("\n\n");
    }
    return null;
}

function isWeakExtraction(detail: ExtractedJobDetail): boolean {
    const titleMissing = !detail.jobTitle;
    const companyMissing = !detail.company;
    const descriptionLength = detail.jobDescription?.length ?? 0;
    const descriptionMissingOrShort = !detail.jobDescription || descriptionLength < MIN_DESCRIPTION_LENGTH;

    return descriptionMissingOrShort || (titleMissing && companyMissing);
}

function buildDiagnostics(detail: Omit<ExtractedJobDetail, "extractionDiagnostics">) {
    const descriptionLength = detail.jobDescription?.length ?? 0;
    const weakExtraction = isWeakExtraction(detail as ExtractedJobDetail);

    return {
        titleFound: Boolean(detail.jobTitle),
        companyFound: Boolean(detail.company),
        locationFound: Boolean(detail.location),
        descriptionFound: Boolean(detail.jobDescription),
        descriptionLength,
        weakExtraction,
    };
}

export function extractJobDetail(sourcePlatform: SupportedJobSource, jobUrl = window.location.href): ExtractedJobDetail {
    const selectors = SELECTORS_BY_PLATFORM[sourcePlatform];
    const base = {
        jobTitle: firstTextFromSelectors(selectors.title),
        company: firstTextFromSelectors(selectors.company),
        location: firstTextFromSelectors(selectors.location),
        jobDescription: descriptionTextFromSelectors(selectors.description),
        jobUrl,
        sourcePlatform,
        extractedAt: new Date().toISOString(),
    };

    return {
        ...base,
        extractionDiagnostics: buildDiagnostics(base),
    };
}

export function toJobExtractionResult(params: {
    isSupported: boolean;
    platform: SupportedJobSource | "unknown";
    jobUrl?: string;
}): JobExtractionResult {
    if (!params.isSupported || params.platform === "unknown") {
        return {
            state: "unsupported",
            reason: "This page is not supported yet",
            detail: null,
        };
    }

    const detail = extractJobDetail(params.platform, params.jobUrl);
    const weak = detail.extractionDiagnostics?.weakExtraction ?? true;
    if (weak) {
        return {
            state: "weak_extraction",
            reason: "We couldn't read this job clearly",
            detail,
        };
    }

    return {
        state: "ready",
        reason: "ok",
        detail,
    };
}

