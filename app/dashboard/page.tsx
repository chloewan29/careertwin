"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getStoredProfileId } from "@/lib/db/profile";

interface DashboardProfileData {
    name: string | null;
    current_title: string | null;
    seniority_level: string | null;
    industry: string | null;
    years_experience: number | null;
    summary: string | null;
    skills: string[];
}

interface ProfileNarrative {
    headline: string;
    strengths_summary: string;
    positioning_statement: string;
}

interface RecurringGap {
    skill_or_type: string;
    frequency: number;
    priority: "critical" | "important" | "nice-to-have";
    description: string;
}

interface RecurringStrength {
    skill: string;
    frequency: number;
    description: string;
}

export default function DashboardPage() {
    const [profileData, setProfileData] = useState<DashboardProfileData | null>(null);
    const [narrative, setNarrative] = useState<ProfileNarrative | null>(null);
    const [careerPatterns, setCareerPatterns] = useState<{ recurring_gaps: RecurringGap[]; recurring_strengths: RecurringStrength[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const profileId = getStoredProfileId();

                if (profileId) {
                    const { getSupabase } = await import("@/lib/db/supabase/client");
                    const supabase = getSupabase();

                    // Get user info (mocking name if not in users table yet, or getting from profile)
                    // But in MVP, our getStoredProfileId creates a profile with id, we added user_id later
                    // Let's query the `profiles` table to see what it has
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", profileId)
                        .single();

                    if (profile) {
                        // Fetch skills
                        const { data: userSkills } = await supabase
                            .from("user_skills")
                            .select("skills(name)")
                            .eq("user_id", profileId);

                        const skillsList = userSkills
                            ? userSkills.map((us: any) => us.skills?.name).filter(Boolean)
                            : [];

                        setProfileData({
                            name: profile.display_name || null,
                            current_title: profile.current_title || null,
                            seniority_level: profile.seniority_level || null,
                            industry: profile.industry || null,
                            years_experience: profile.years_experience != null ? parseFloat(profile.years_experience) : null,
                            summary: profile.summary || null,
                            skills: skillsList
                        });

                        // Fetch narrative + fallback name/title from latest resume parsed_json
                        const { data: latestResume } = await supabase
                            .from("resumes")
                            .select("parsed_json")
                            .eq("profile_id", profileId)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .single();

                        const parsedJson = latestResume?.parsed_json ?? null;

                        // Prefer profile row values; fall back to parsed resume fields
                        const resolvedName = profile.display_name || parsedJson?.full_name || null;
                        const resolvedTitle = profile.current_title || parsedJson?.current_title || null;
                        const resolvedSkills = skillsList.length > 0 ? skillsList : (parsedJson?.skills || []);

                        setProfileData(prev => prev ? {
                            ...prev,
                            name: resolvedName,
                            current_title: resolvedTitle,
                            skills: resolvedSkills,
                        } : prev);

                        // Backfill: persist full_name into profiles.display_name for future loads
                        if (!profile.display_name && parsedJson?.full_name) {
                            supabase
                                .from("profiles")
                                .update({ display_name: parsedJson.full_name })
                                .eq("id", profileId)
                                .then(({ error }) => {
                                    if (error) console.warn("display_name backfill error:", error);
                                });
                        }

                        if (parsedJson?.narrative) {
                            setNarrative(parsedJson.narrative);
                        }

                        // Fetch career patterns
                        const patternsRes = await fetch(`/api/career-patterns?profileId=${profileId}`);
                        if (patternsRes.ok) {
                            const patternsData = await patternsRes.json();
                            if ((patternsData.recurring_gaps?.length ?? 0) > 0 || (patternsData.recurring_strengths?.length ?? 0) > 0) {
                                setCareerPatterns(patternsData);
                            }
                        }
                        setLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.error("Dashboard error:", err);
            }

            setLoading(false);
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 px-4 pb-12 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen pt-24 px-4 pb-12">
                <div className="max-w-md mx-auto text-center">
                    <h1 className="text-2xl font-bold mb-4">No Career Profile Yet</h1>
                    <p className="text-muted mb-6">Upload a resume to automatically generate your career profile.</p>
                    <Link href="/upload">
                        <Button>Upload Resume</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                            Career{" "}
                            <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                                Dashboard
                            </span>
                        </h1>
                        <p className="text-muted">Your structured career profile at a glance.</p>
                    </div>
                    <Link href="/match">
                        <Button size="sm" variant="secondary">
                            Match a Job →
                        </Button>
                    </Link>
                </div>

                <div className="space-y-6">
                    {/* Header Card */}
                    <Card className="relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary-light" />
                        <div className="flex items-start gap-5 pt-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                {profileData.name ? profileData.name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-2xl font-bold truncate">{profileData.name ?? "—"}</h2>
                                <p className="text-primary-light font-medium truncate mb-4">{profileData.current_title ?? <span className="text-muted italic">Title not detected</span>}</p>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-surface-light rounded-xl p-4 mt-2">
                                    <div>
                                        <p className="text-xs text-muted mb-1">Seniority Level</p>
                                        <p className="font-semibold text-sm">{profileData.seniority_level ?? <span className="text-muted italic">—</span>}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted mb-1">Experience</p>
                                        <p className="font-semibold text-sm">{profileData.years_experience != null ? `${profileData.years_experience} Years` : <span className="text-muted italic">—</span>}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted mb-1">Industry</p>
                                        <p className="font-semibold text-sm">{profileData.industry ?? <span className="text-muted italic">—</span>}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Narrative Card */}
                    {narrative && (
                        <Card className="relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary-light to-primary" />
                            <div className="pt-3 space-y-4">
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Headline</p>
                                    <p className="font-semibold text-foreground">{narrative.headline}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Strengths Summary</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{narrative.strengths_summary}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Positioning Statement</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed italic">{narrative.positioning_statement}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Summary Card */}
                    <Card>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Career Summary
                        </h3>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                            {profileData.summary ?? <span className="text-muted italic">No career summary detected. Try uploading a more detailed resume.</span>}
                        </p>
                    </Card>

                    {/* Skills Card */}
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                </svg>
                                Core Skills
                            </h3>
                            <span className="ml-auto text-xs text-muted bg-surface-light px-2 py-1 rounded-full">
                                {profileData.skills.length}
                            </span>
                        </div>

                        {profileData.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {profileData.skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20 transition-colors"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted">No skills detected. Try uploading a more detailed resume.</p>
                        )}
                    </Card>

                    {/* Career Pattern Insights */}
                    {careerPatterns && (
                        <Card>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                </svg>
                                Career Pattern Insights
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Recurring gaps */}
                                {careerPatterns.recurring_gaps.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recurring Gaps</p>
                                        <div className="space-y-2">
                                            {careerPatterns.recurring_gaps.map((gap, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${gap.priority === "critical" ? "bg-red-500/15 text-red-400 border-red-500/30"
                                                        : gap.priority === "important" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                                            : "bg-primary/10 text-primary-light border-primary/20"
                                                        }`}>{gap.frequency}×</span>
                                                    <div>
                                                        <p className="text-xs font-medium text-foreground/90">{gap.skill_or_type}</p>
                                                        <p className="text-xs text-muted leading-relaxed">{gap.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recurring strengths */}
                                {careerPatterns.recurring_strengths.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recurring Strengths</p>
                                        <div className="space-y-2">
                                            {careerPatterns.recurring_strengths.map((s, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 bg-green-500/15 text-green-400 border-green-500/30">
                                                        {s.frequency}×
                                                    </span>
                                                    <div>
                                                        <p className="text-xs font-medium text-foreground/90">{s.skill}</p>
                                                        <p className="text-xs text-muted leading-relaxed">{s.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
