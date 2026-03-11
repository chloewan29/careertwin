import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import { normalizeSkills } from "@/lib/career-engine/parsing/skill-normalizer";
import { rankJobRecommendations } from "@/lib/career-engine/recommendation-engine";
import type { ProfileInput } from "@/lib/career-engine/matching/role-matcher";

// LEGACY ROUTE:
// Old URL-based recommendation endpoint retained for compatibility.
// Extension-driven job detail analysis is now the active Job Copilot workflow.

type RequestBody = {
    profileId?: string;
    jobUrls?: string[];
    jobDescriptions?: Record<string, string>;
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

async function fetchJobDescriptionFromUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "CareerTwinBot/1.0 (+job-recommendations)",
            },
        });
        if (!response.ok) return null;
        const html = await response.text();
        return htmlToText(html);
    } catch (error) {
        console.warn("Failed to fetch job URL:", url, error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as RequestBody;
        const profileId = body.profileId;
        const jobUrls = body.jobUrls ?? [];
        const jobDescriptions = body.jobDescriptions ?? {};

        if (!profileId) {
            return NextResponse.json({ error: "profileId is required" }, { status: 400 });
        }

        if (!Array.isArray(jobUrls) || jobUrls.length === 0) {
            return NextResponse.json({ error: "jobUrls must be a non-empty array" }, { status: 400 });
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
        if (profileDirectSkills.length > 0) {
            resolvedSkills = profileDirectSkills;
        } else if (rawSkills.length > 0) {
            resolvedSkills = rawSkills;
        } else if (parsedSkills.length > 0) {
            resolvedSkills = parsedSkills;
        }

        const profileInput: ProfileInput = {
            current_title: profile.current_title ?? null,
            years_experience: profile.years_experience != null ? parseFloat(profile.years_experience) : null,
            skills: normalizeSkills(resolvedSkills).map(s => s.normalized),
            capabilities: profileCapabilities.length > 0 ? profileCapabilities : parsedCapabilities,
            parsed_skills: parsedSkills,
            resume_text: rawResumeText,
        };

        const jobs = await Promise.all(
            jobUrls.map(async (url) => {
                const inlineDescription = jobDescriptions[url];
                const fetchedDescription = inlineDescription || await fetchJobDescriptionFromUrl(url);
                return {
                    url,
                    jobDescription: fetchedDescription,
                };
            })
        );

        const validJobs = jobs
            .filter((j): j is { url: string; jobDescription: string } => Boolean(j.jobDescription && j.jobDescription.length > 50));

        if (validJobs.length === 0) {
            return NextResponse.json(
                { error: "No valid job descriptions could be parsed from provided URLs" },
                { status: 400 }
            );
        }

        const recommendations = rankJobRecommendations(profileInput, validJobs, 10);

        return NextResponse.json({
            recommendations,
            meta: {
                requested: jobUrls.length,
                parsed: validJobs.length,
                returned: recommendations.length,
            },
        });
    } catch (err) {
        console.error("job-recommendations error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
