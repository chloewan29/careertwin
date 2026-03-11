import type { JobProvider, JobProviderFetchResult } from "./types";
import { adzunaProvider } from "./adzuna-provider";

const PROVIDERS: Record<string, JobProvider> = {
    adzuna: adzunaProvider,
    // Future sources plug in here:
    // seek_api: seekApiProvider,
    // saved_jobs_import: savedJobsProvider,
    // email_alert_import: emailAlertProvider,
};

function parseProviderOrder(raw: string | undefined): string[] {
    if (!raw?.trim()) return ["adzuna"];
    return raw
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0);
}

export function getJobProviders(): JobProvider[] {
    const orderedNames = parseProviderOrder(process.env.JOB_PROVIDER_ORDER);
    const providers = orderedNames
        .map((name) => PROVIDERS[name])
        .filter((provider): provider is JobProvider => Boolean(provider));
    return providers.length > 0 ? providers : [adzunaProvider];
}

export type ProviderAttempt = {
    provider: string;
    status: JobProviderFetchResult["status"];
    responseStatus: number | null;
    jobsReturned: number;
    error: string | null;
};

export async function fetchJobsFromProviders(
    query: string,
    location: string
): Promise<{ selected: JobProviderFetchResult | null; attempts: ProviderAttempt[] }> {
    const providers = getJobProviders();
    const attempts: ProviderAttempt[] = [];

    for (const provider of providers) {
        const result = await provider.fetchJobs(query, location);
        attempts.push({
            provider: result.provider,
            status: result.status,
            responseStatus: result.responseStatus ?? null,
            jobsReturned: result.jobs.length,
            error: result.error ?? null,
        });

        if (result.status === "ok" && result.jobs.length > 0) {
            return { selected: result, attempts };
        }
    }

    return { selected: null, attempts };
}
