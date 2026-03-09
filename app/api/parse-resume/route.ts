import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const profileId = formData.get("profileId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!profileId) {
            return NextResponse.json(
                { error: "No profile ID provided" },
                { status: 400 }
            );
        }

        const fileName = file.name;
        const extension = fileName.split(".").pop()?.toLowerCase();

        if (!extension || !["pdf", "docx"].includes(extension)) {
            return NextResponse.json(
                { error: "Only PDF and DOCX files are supported" },
                { status: 400 }
            );
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: "File size must be under 10MB" },
                { status: 400 }
            );
        }

        const supabase = createServerSupabaseClient();

        // 1. Upload file to Supabase Storage
        const storagePath = `${profileId}/${Date.now()}-${fileName}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json(
                { error: `Upload failed: ${uploadError.message}` },
                { status: 500 }
            );
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from("resumes").getPublicUrl(storagePath);

        // 2. Extract text from the file
        let rawText = "";

        if (extension === "pdf") {
            rawText = "PDF parsing temporarily disabled";
        } else if (extension === "docx") {
            const result = await mammoth.extractRawText({ buffer });
            rawText = result.value;
        }

        // 3. Process with Career Engine
        console.log("1. Raw text exists:", !!rawText && rawText.length > 0);
        const { parseResumeText } = await import("@/lib/career-engine/parsing/resume-parser");
        const { extractSkills } = await import("@/lib/career-engine/parsing/skill-extractor");
        const { buildCareerProfile } = await import("@/lib/career-engine/profile-builder");

        let parsedResume;
        try {
            console.log("2. parseResumeText is called");
            parsedResume = parseResumeText(rawText);
            console.log("3. parseResumeText return value:", parsedResume);
        } catch (error: any) {
            console.error("4. parser error stack:", error?.stack || error);
            throw error;
        }

        const extractedSkills = extractSkills(rawText);
        if (parsedResume && (!parsedResume.skills || parsedResume.skills.length === 0)) {
            parsedResume.skills = extractedSkills;
        }

        const careerProfile = buildCareerProfile(rawText, parsedResume, extractedSkills);

        // 4a. Generate profile narrative
        const { buildProfileNarrative } = await import("@/lib/career-engine/profile/profile-narrative");
        const profileNarrative = buildProfileNarrative(
            {
                current_title: parsedResume.current_title,
                years_experience: parsedResume.years_experience,
                skills: parsedResume.skills,
            },
            parsedResume,
            { matched_evidence: [], missing_evidence: [] }
        );

        // 4b. Save resume record to database
        const parsedJsonWithNarrative = parsedResume ? { ...parsedResume, narrative: profileNarrative } : null;
        const { data: resume, error: dbError } = await supabase
            .from("resumes")
            .insert({
                profile_id: profileId,
                file_name: fileName,
                file_url: publicUrl,
                raw_text: rawText,
                ...(parsedJsonWithNarrative ? { parsed_json: parsedJsonWithNarrative } : {})
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database insert error:", dbError);
            return NextResponse.json(
                { error: `Failed to save resume: ${dbError.message}` },
                { status: 500 }
            );
        }

        // 5. Save structured profile data
        // Null out summary if it looks like a date, location, or company line (not a real summary)
        const summaryIsWeak = !parsedResume?.summary
            || parsedResume.summary.length < 30
            || /^\d{4}|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(parsedResume.summary)
            || /,\s+[A-Z][a-z]/.test(parsedResume.summary) && parsedResume.summary.split(" ").length < 5;

        const { data: updatedProfile, error: profileError } = await supabase
            .from("profiles")
            .update({
                current_title: parsedResume?.current_title ?? null,
                years_experience: parsedResume?.years_experience ?? null,
                seniority_level: careerProfile.seniority_level ?? null,
                industry: parsedResume?.industry ?? null,
                summary: summaryIsWeak ? null : parsedResume!.summary,
                companies: parsedResume?.companies ?? [],
                // Save parsed name; only overwrites if present — preserves existing user-set name
                ...(parsedResume?.full_name ? { display_name: parsedResume.full_name } : {}),
            })
            .eq("id", profileId)
            .select("user_id")
            .single();

        const userId = updatedProfile?.user_id;

        if (profileError) {
            console.error("Profile update error:", profileError);
        }

        // 6. Save skills
        const finalSkills = parsedResume?.skills?.length ? parsedResume.skills : extractedSkills;

        console.log("=== Skills Save Pipeline Debug ===");
        console.log("Raw Extracted Skills:", extractedSkills);
        console.log("Saved parsed_json.skills:", parsedJsonWithNarrative?.skills || []);
        console.log("Saved user_skills:", finalSkills);
        console.log("==================================");

        for (const skill of finalSkills) {
            // Upsert skill
            const { data: skillRecord, error: skillError } = await supabase
                .from("skills")
                .upsert({ name: skill }, { onConflict: "name" })
                .select()
                .single();

            if (!skillError && skillRecord && userId) {
                // Link skill to actual user
                await supabase
                    .from("user_skills")
                    .upsert(
                        {
                            user_id: userId,
                            skill_id: skillRecord.id,
                            proficiency: "Proficient"
                        },
                        { onConflict: "user_id, skill_id" }
                    );
            }
        }

        return NextResponse.json({
            success: true,
            resume: {
                id: resume.id,
                file_name: resume.file_name,
                file_url: resume.file_url,
                text_length: rawText.length,
                text_preview: rawText.slice(0, 500),
                parsedData: parsedResume ? {
                    full_name: parsedResume.full_name,
                    current_title: parsedResume.current_title,
                    years_experience: parsedResume.years_experience,
                    skills: parsedResume.skills,
                    companies: parsedResume.companies,
                    education: parsedResume.education,
                    summary: parsedResume.summary
                } : null
            },
        });
    } catch (err) {
        console.error("Upload API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
