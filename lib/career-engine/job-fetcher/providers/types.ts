export type JobFetchStatus = "ok" | "no_results" | "source_blocked" | "error";

export type NormalizedJob = {
    title: string;
    company: string | null;
    location?: string | null;
    jobDescription: string;
    jobUrl: string;
};

export type JobProviderFetchResult = {
    provider: string;
    status: JobFetchStatus;
    jobs: NormalizedJob[];
    responseStatus?: number | null;
    error?: string | null;
};

export interface JobProvider {
    name: string;
    fetchJobs(query: string, location: string): Promise<JobProviderFetchResult>;
}
