import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { normalizeSkills } from "@/lib/career-engine/parsing/skill-normalizer";
import { fetchSeekJobs } from "@/lib/career-engine/job-fetcher/seek-fetcher";
import { rankJobRecommendations } from "@/lib/career-engine/recommendation-engine";
import type { ProfileInput } from "@/lib/career-engine/matching/role-matcher";

// LEGACY ROUTE:
// This in-app job import/ranking endpoint predates extension-driven Job Copilot.
// Keep for backward compatibility/manual use; extension flow is primary.

type RequestBody = {
    profileId?: string;
    query?: string;
    location?: string;
    jobUrls?: string[];
    jobDescriptions?: string[] | Record<string, string>;
    mockJobs?: Array<{
        title?: string | null;
        company?: string | null;
        job_url?: string;
        job_description: string;
    }>;
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

async function fetchJobDescriptionFromUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "CareerTwinBot/1.0 (+job-search-fallback)",
            },
        });
        if (!response.ok) return "";
        const html = await response.text();
        return htmlToText(html).slice(0, 12000);
    } catch {
        return "";
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as RequestBody;
        const profileId = body.profileId;
        const query = body.query?.trim() ?? "";
        const location = body.location?.trim() ?? "";
        const jobUrls = body.jobUrls ?? [];
        const jobDescriptions = body.jobDescriptions;
        const mockJobs = body.mockJobs ?? [];

        console.log("job-search API request body:", {
            profileId: profileId ?? null,
            query: query || null,
            location: location || null,
            jobUrlsCount: jobUrls.length,
            jobDescriptionsType: Array.isArray(jobDescriptions) ? "array" : (jobDescriptions ? "record" : "none"),
            mockJobsCount: mockJobs.length,
        });

        if (!profileId) {
            return NextResponse.json({ error: "profileId is required" }, { status: 400 });
        }
        if (!query && jobUrls.length === 0 && !jobDescriptions && mockJobs.length === 0) {
            return NextResponse.json({
                error: "Provide query or fallback inputs (jobUrls/jobDescriptions/mockJobs)",
            }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profileId)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const { data: userSkills } = await supabase
            .from("user_skills")
            .select("skills(name)")
            .eq("user_id", profile.user_id);

        type UserSkillRow = { skills: { name: string | null } | null };
        const rawSkills: string[] = userSkills
            ? (userSkills as UserSkillRow[])
                .map((us) => us.skills?.name)
                .filter((name): name is string => Boolean(name))
            : [];

        const { data: latestResume } = await supabase
            .from("resumes")
            .select("raw_text, parsed_json")
            .eq("profile_id", profileId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        const rawResumeText: string = latestResume?.raw_text ?? "";
        let parsedResumeJson = latestResume?.parsed_json ?? null;
        if (typeof parsedResumeJson === "string") {
            try {
                parsedResumeJson = JSON.parse(parsedResumeJson);
            } catch {
                parsedResumeJson = null;
            }
        }

        const parsedSkills = parsedResumeJson?.skills || [];
        const profileDirectSkills = profile.skills || [];
        const parsedCapabilities = Array.isArray(parsedResumeJson?.capabilities) ? parsedResumeJson.capabilities : [];
        const profileCapabilities = Array.isArray(profile.capabilities) ? profile.capabilities : [];

        let resolvedSkills: string[] = [];
        if (profileDirectSkills.length > 0) resolvedSkills = profileDirectSkills;
        else if (rawSkills.length > 0) resolvedSkills = rawSkills;
        else if (parsedSkills.length > 0) resolvedSkills = parsedSkills;

        const profileInput: ProfileInput = {
            current_title: profile.current_title ?? null,
            years_experience: profile.years_experience != null ? parseFloat(profile.years_experience) : null,
            skills: normalizeSkills(resolvedSkills).map(s => s.normalized),
            capabilities: profileCapabilities.length > 0 ? profileCapabilities : parsedCapabilities,
            parsed_skills: parsedSkills,
            resume_text: rawResumeText,
        };

        let status: "ok" | "no_results" | "source_blocked" = "ok";
        let source = "seek";

        console.log("job-search API calling fetchSeekJobs:", { query, location });
        const seekResult = query ? await fetchSeekJobs(query, location) : { status: "no_results", jobs: [] };
        console.log("job-search API fetchSeekJobs result:", {
            status: seekResult.status,
            fetchedCount: seekResult.jobs.length,
            sample: seekResult.jobs.slice(0, 2).map(j => ({
                title: j.title,
                company: j.company,
                url: j.jobUrl,
                descriptionLength: j.jobDescription.length,
            })),
        });

        let inputJobs = [...seekResult.jobs];
        status = seekResult.status;

        if (inputJobs.length === 0) {
            const fallbackJobs: Array<{ title: string; company: string | null; jobUrl: string; jobDescription: string }> = [];

            if (Array.isArray(jobDescriptions)) {
                for (let i = 0; i < jobDescriptions.length; i++) {
                    const desc = jobDescriptions[i];
                    if (!desc || desc.trim().length < 30) continue;
                    fallbackJobs.push({
                        title: `Pasted Job ${i + 1}`,
                        company: null,
                        jobUrl: `local://pasted-description/${i + 1}`,
                        jobDescription: desc,
                    });
                }
            } else if (jobDescriptions && typeof jobDescriptions === "object") {
                for (const [url, desc] of Object.entries(jobDescriptions)) {
                    if (!desc || desc.trim().length < 30) continue;
                    fallbackJobs.push({
                        title: "Pasted Job",
                        company: null,
                        jobUrl: url || `local://pasted-description/${fallbackJobs.length + 1}`,
                        jobDescription: desc,
                    });
                }
            }

            if (jobUrls.length > 0) {
                const fetchedFromUrls = await Promise.all(
                    jobUrls.map(async (url, i) => {
                        const desc = await fetchJobDescriptionFromUrl(url);
                        if (desc.length < 30) return null;
                        return {
                            title: `Pasted URL Job ${i + 1}`,
                            company: null,
                            jobUrl: url,
                            jobDescription: desc,
                        };
                    })
                );
                fallbackJobs.push(...fetchedFromUrls.filter((job): job is NonNullable<typeof job> => Boolean(job)));
            }

            if (mockJobs.length > 0) {
                for (let i = 0; i < mockJobs.length; i++) {
                    const mock = mockJobs[i];
                    if (!mock?.job_description || mock.job_description.trim().length < 30) continue;
                    fallbackJobs.push({
                        title: mock.title ?? `Mock Job ${i + 1}`,
                        company: mock.company ?? null,
                        jobUrl: mock.job_url ?? `local://mock-job/${i + 1}`,
                        jobDescription: mock.job_description,
                    });
                }
            }

            if (fallbackJobs.length > 0) {
                inputJobs = fallbackJobs;
                source = "fallback";
                status = "ok";
            }
        }

        const ranked = rankJobRecommendations(
            profileInput,
            inputJobs.map((job) => ({
                url: job.jobUrl,
                jobDescription: job.jobDescription,
            })),
            10
        );

        const jobs = ranked.map((item) => {
            const fetched = inputJobs.find((j) => j.jobUrl === item.job_url);
            return {
                job_url: item.job_url,
                title: item.job_title ?? fetched?.title ?? null,
                company: item.company ?? fetched?.company ?? null,
                job_description: fetched?.jobDescription ?? "",
                career_twin_score: item.career_twin_score,
                recommendation: item.recommendation,
                critical_gaps: item.critical_gaps,
                evidence_gaps: item.evidence_gaps,
                explanation_summary: item.explanation_summary,
            };
        });

        return NextResponse.json({
            status,
            jobs,
            meta: {
                source,
                fetched: inputJobs.length,
                ranked: jobs.length,
            },
        });
    } catch (err) {
        console.error("job-search error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
