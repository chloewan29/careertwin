"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreRing } from "@/components/match/ScoreRing";
import { SkillComparison } from "@/components/match/SkillComparison";
import { ExperienceGap } from "@/components/match/ExperienceGap";
import { Suggestions } from "@/components/match/Suggestions";
import { ResumeRewrite } from "@/components/match/ResumeRewrite";
import { getStoredProfileId } from "@/lib/db/profile";
import { useState } from "react";

interface GapItem {
    skill: string | null;
    type: "skill" | "seniority" | "title" | "experience";
    priority: "critical" | "important" | "nice-to-have";
    label: string;
    gap_description: string;
    action: string;
}

interface MatchedEvidence {
    skill: string;
    evidence: string[];
}

interface MissingEvidence {
    skill: string;
    reason: string;
}

export interface MatchAnalysis {
    overallScore: number;
    matchLabel: string;
    matchedSkills: string[];
    missingSkills: string[];
    experienceGap: {
        requiredYears: number | null;
        candidateYears: number;
        meets: boolean;
    };
    titleGap: string | null;
    seniorityGap: string | null;
    priorityGaps: GapItem[];
    gapSummary: string;
    resumeImprovements: string[];
    positioningSuggestions: string[];
    nextBestActions: string[];
    matchedEvidence: MatchedEvidence[];
    missingEvidence: MissingEvidence[];
    actionPlan: {
        actions_7d: string[];
        actions_30d: string[];
        actions_90d: string[];
    } | null;
    careerTwinScore: {
        score: number;
        label: string;
        breakdown: Record<string, { label: string; score: number; weight: number; weighted_score: number; rationale: string }>;
    } | null;
    recommendation?: "apply_now" | "apply_with_tailoring" | "stretch_apply" | "not_recommended";
    whyThisRoleFitsYou?: string[];
    criticalGaps?: string[];
    evidenceGaps?: string[];
    explanationSummary?: string;
    resumeRewrite: {
        roles: Array<{ company: string; original_bullets: string[]; rewritten_bullets: string[]; role_description: string }>;
        summary_suggestion: string;
        resume_document?: {
            header: {
                full_name: string | null;
                current_title: string | null;
                contact: {
                    email: string | null;
                    phone: string | null;
                    linkedin: string | null;
                    address: string | null;
                };
            };
            summary: string | null;
            experience: Array<{
                company: string | null;
                title: string | null;
                date_range: string | null;
                dates?: string | null;
                original_bullets: string[];
                rewritten_bullets: string[];
                bullets?: string[];
            }>;
            education: string[];
            skills?: string[];
        };
    } | null;
    simulation: {
        baseline_score: number;
        best_case_score: number;
        improvements: Array<{
            added_skill_or_capability: string;
            gap_type: string;
            score_before: number;
            score_after: number;
            score_delta: number;
            new_match_label: string;
            explanation: string;
        }>;
    } | null;
}

type AnalysisState = "idle" | "analyzing" | "done" | "error";
type SearchState = "idle" | "searching" | "done" | "error";

interface JobSearchResult {
    job_url: string;
    title: string | null;
    job_title?: string | null;
    company: string | null;
    job_description: string;
    source?: "live" | "fallback_real" | "mock";
    fit_category?: "best_fit" | "safe_stretch" | "long_shot";
    career_twin_score?: number;
    match_score?: number;
    probability_band?: "high" | "medium" | "low";
    why_fit?: string[];
    recommendation?: NonNullable<MatchAnalysis["recommendation"]>;
    explanation_summary?: string;
    is_new?: boolean;
    location?: string | null;
}

const PRIORITY_STYLES: Record<GapItem["priority"], { badge: string; border: string; dot: string }> = {
    critical: {
        badge: "bg-red-500/15 text-red-400 border-red-500/30",
        border: "border-red-500/20",
        dot: "bg-red-400",
    },
    important: {
        badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        border: "border-amber-500/20",
        dot: "bg-amber-400",
    },
    "nice-to-have": {
        badge: "bg-primary/10 text-primary-light border-primary/20",
        border: "border-primary/20",
        dot: "bg-primary-light",
    },
};

const TYPE_LABEL: Record<GapItem["type"], string> = {
    skill: "Skill Gap",
    seniority: "Seniority",
    title: "Title Fit",
    experience: "Experience",
};

const HORIZON_CONFIG = [
    {
        key: "actions_7d" as const,
        label: "This Week",
        sublabel: "7-day actions",
        badgeClass: "bg-green-500/15 text-green-400 border-green-500/30",
        dotClass: "bg-green-400",
        numberClass: "bg-green-500/15 text-green-400",
    },
    {
        key: "actions_30d" as const,
        label: "This Month",
        sublabel: "30-day improvements",
        badgeClass: "bg-primary/10 text-primary-light border-primary/20",
        dotClass: "bg-primary-light",
        numberClass: "bg-primary/15 text-primary-light",
    },
    {
        key: "actions_90d" as const,
        label: "Next 90 Days",
        sublabel: "Longer-term investments",
        badgeClass: "bg-accent/10 text-accent border-accent/20",
        dotClass: "bg-accent",
        numberClass: "bg-accent/15 text-accent",
    },
] as const;

const RECOMMENDATION_LABELS: Record<NonNullable<MatchAnalysis["recommendation"]>, string> = {
    apply_now: "Apply now",
    apply_with_tailoring: "Apply with tailoring",
    stretch_apply: "Stretch apply",
    not_recommended: "Not recommended",
};

const RECOMMENDATION_STYLES: Record<NonNullable<MatchAnalysis["recommendation"]>, string> = {
    apply_now: "bg-green-500/15 text-green-400 border-green-500/30",
    apply_with_tailoring: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    stretch_apply: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    not_recommended: "bg-red-500/15 text-red-400 border-red-500/30",
};

const FIT_CATEGORY_LABELS: Record<NonNullable<JobSearchResult["fit_category"]>, string> = {
    best_fit: "Best fit",
    safe_stretch: "Safe stretch",
    long_shot: "Long shot",
};

const FIT_CATEGORY_STYLES: Record<NonNullable<JobSearchResult["fit_category"]>, string> = {
    best_fit: "bg-green-500/10 text-green-400 border-green-500/30",
    safe_stretch: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    long_shot: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

function scoreMeaning(score: number): string {
    if (score >= 80) return "Strong fit";
    if (score >= 65) return "Good fit";
    if (score >= 45) return "Stretch fit";
    return "Low fit";
}

function buildUserFacingReasons(job: JobSearchResult, title: string, score: number): string[] {
    const reasons: string[] = [];
    const titleLower = title.toLowerCase();

    if (/analytics|insights/.test(titleLower)) {
        reasons.push("Strong fit with analytics leadership background.");
    }
    if (/bi|data platform|data product/.test(titleLower)) {
        reasons.push("Relevant BI / data platform experience.");
    }
    if (/program|transform/.test(titleLower)) {
        reasons.push("Transferable transformation and stakeholder leadership experience.");
    }
    if (/strategy/.test(titleLower)) {
        reasons.push("Evidence of strategic planning and cross-functional influence.");
    }

    if (reasons.length === 0 && score >= 65) {
        reasons.push("Good overall alignment with your career profile.");
    }
    if (reasons.length === 0) {
        reasons.push("Relevant transferable experience for this role path.");
    }

    return reasons.slice(0, 2);
}

function MatchSummaryCard({
    careerTwinScore,
    recommendation,
    explanationSummary,
}: {
    careerTwinScore: MatchAnalysis["careerTwinScore"];
    recommendation: MatchAnalysis["recommendation"];
    explanationSummary?: string;
}) {
    const hasScore = Boolean(careerTwinScore);
    const recommendationKey = recommendation ?? "stretch_apply";
    return (
        <Card>
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="font-semibold">Match Summary</h3>
                    <p className="text-xs text-muted">Overall match decision</p>
                </div>
                {hasScore && (
                    <div className="text-right">
                        <p className="text-3xl font-bold text-primary-light">{careerTwinScore!.score}</p>
                        <p className="text-xs text-muted">{careerTwinScore!.label}</p>
                    </div>
                )}
            </div>
            <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold ${RECOMMENDATION_STYLES[recommendationKey]}`}>
                    {RECOMMENDATION_LABELS[recommendationKey]}
                </span>
            </div>
            {explanationSummary && (
                <p className="text-sm text-foreground/80 leading-relaxed">{explanationSummary}</p>
            )}
        </Card>
    );
}

function WhyFitsCard({ points }: { points: string[] }) {
    if (!points || points.length === 0) return null;
    return (
        <Card>
            <h3 className="font-semibold mb-1">Why this role fits you</h3>
            <p className="text-xs text-muted mb-4">Strength signals from your profile and resume</p>
            <ul className="space-y-2">
                {points.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/80 leading-relaxed">
                        <span className="text-green-400 flex-shrink-0">•</span>
                        <span>{point}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function WhyNotFitCard({ criticalGaps, evidenceGaps }: { criticalGaps: string[]; evidenceGaps: string[] }) {
    if ((criticalGaps?.length ?? 0) === 0 && (evidenceGaps?.length ?? 0) === 0) return null;
    return (
        <Card>
            <h3 className="font-semibold mb-1">Why it may not fit</h3>
            <p className="text-xs text-muted mb-4">Gaps to address before applying</p>

            {criticalGaps.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-semibold text-red-400 mb-2">Critical gaps</p>
                    <ul className="space-y-2">
                        {criticalGaps.map((gap, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/80 leading-relaxed">
                                <span className="text-red-400 flex-shrink-0">•</span>
                                <span>{gap}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {evidenceGaps.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-amber-400 mb-2">Resume proof / positioning gaps</p>
                    <ul className="space-y-2">
                        {evidenceGaps.map((gap, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/80 leading-relaxed">
                                <span className="text-amber-400 flex-shrink-0">•</span>
                                <span>{gap}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}

function ActionPlanCard({ plan }: { plan: { actions_7d: string[]; actions_30d: string[]; actions_90d: string[] } }) {
    return (
        <Card>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                </div>
                <h3 className="font-semibold">Action Plan</h3>
            </div>

            <div className="space-y-6">
                {HORIZON_CONFIG.map(({ key, label, sublabel, badgeClass, numberClass }) => {
                    const items = plan[key];
                    if (!items || items.length === 0) return null;
                    return (
                        <div key={key}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                                    {label}
                                </span>
                                <span className="text-xs text-muted">{sublabel}</span>
                            </div>
                            <ul className="space-y-2.5">
                                {items.map((action, i) => (
                                    <li key={i} className="flex gap-3">
                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${numberClass}`}>
                                            {i + 1}
                                        </span>
                                        <p className="text-sm text-foreground/80 leading-relaxed">{action}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

function MatchedEvidenceCard({ items }: { items: MatchedEvidence[] }) {
    if (items.length === 0) return null;
    return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold">Matched Strengths</h3>
                    <p className="text-xs text-muted">Evidence from your resume</p>
                </div>
            </div>
            <div className="space-y-3">
                {items.map((item) => (
                    <div key={item.skill} className="rounded-xl bg-surface-light/40 border border-green-500/15 p-3">
                        <p className="text-xs font-semibold text-green-400 mb-1.5">{item.skill}</p>
                        <ul className="space-y-1">
                            {item.evidence.map((line, i) => (
                                <li key={i} className="text-xs text-foreground/70 leading-relaxed flex gap-2">
                                    <span className="text-green-400/60 flex-shrink-0 mt-0.5">—</span>
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function MissingEvidenceCard({ items }: { items: MissingEvidence[] }) {
    if (items.length === 0) return null;
    return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold">Missing Evidence</h3>
                    <p className="text-xs text-muted">Skills not evidenced in your resume</p>
                </div>
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.skill} className="rounded-xl bg-surface-light/40 border border-amber-500/15 p-3">
                        <p className="text-xs font-semibold text-amber-400 mb-1">{item.skill}</p>
                        <p className="text-xs text-foreground/70 leading-relaxed">{item.reason}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function PriorityGaps({ gaps, summary }: { gaps: GapItem[]; summary: string }) {
    if (gaps.length === 0) return null;
    return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold">Priority Gaps</h3>
                    <p className="text-xs text-muted">{summary}</p>
                </div>
            </div>

            <div className="space-y-3">
                {gaps.map((gap, i) => {
                    const styles = PRIORITY_STYLES[gap.priority];
                    return (
                        <div key={i} className={`rounded-xl border p-4 ${styles.border} bg-surface-light/40`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                                    {gap.priority}
                                </span>
                                <span className="text-xs text-muted">{TYPE_LABEL[gap.type]}</span>
                                {gap.skill && (
                                    <span className="ml-auto text-xs font-medium text-foreground/70 truncate">{gap.skill}</span>
                                )}
                            </div>
                            <p className="font-semibold text-foreground mb-1">{gap.label}</p>
                            <p className="text-sm text-foreground/80 mb-2 leading-relaxed">{gap.gap_description}</p>
                            <p className="text-xs text-muted leading-relaxed">
                                <span className="text-primary-light font-medium">Action: </span>
                                {gap.action}
                            </p>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

export default function MatchPage() {
    // LEGACY UI: browser extension is now the primary Job Copilot entry point.
    // Keep this page for fallback/manual experiments, but disable legacy daily feed by default.
    const LEGACY_JOB_FEED_UI_ENABLED = false;
    const [jobText, setJobText] = useState("");
    const [jobLinksText, setJobLinksText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchLocation, setSearchLocation] = useState("");
    const [searchState, setSearchState] = useState<SearchState>("idle");
    const [searchResults, setSearchResults] = useState<JobSearchResult[]>([]);
    const [searchError, setSearchError] = useState("");
    const [searchNotice, setSearchNotice] = useState("");
    const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
    const [result, setResult] = useState<MatchAnalysis | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [activeQueryOverride, setActiveQueryOverride] = useState<string | null>(null);
    const [reviewModalJob, setReviewModalJob] = useState<JobSearchResult | null>(null);
    const [reviewModalAnalysis, setReviewModalAnalysis] = useState<MatchAnalysis | null>(null);
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [isApplyingNow, setIsApplyingNow] = useState(false);
    const isDev = process.env.NODE_ENV !== "production";

    function sanitizeTailoredLine(text: string): string {
        return text
            .replace(/\[(?:quantify|example)\s*:[^\]]*\]/gi, "")
            .replace(/\[[a-z][a-z\s_-]{1,40}:[^\]]*\]/gi, "")
            .replace(/\s{2,}/g, " ")
            .replace(/\s+([,.;:!?])/g, "$1")
            .trim();
    }

    function isInstructionalText(text: string): boolean {
        return /\b(quantify achievements?|add metric|add specific achievement|placeholder|example)\b/i.test(text);
    }

    function buildResumeUpdateText(analysis: MatchAnalysis): string {
        const lines: string[] = [];
        const rewrite = analysis.resumeRewrite;
        const resumeDoc = rewrite?.resume_document;

        if (resumeDoc) {
            const nameLine = sanitizeTailoredLine(resumeDoc.header.full_name ?? "");
            const titleLine = sanitizeTailoredLine(resumeDoc.header.current_title ?? "");
            const contactParts = [
                sanitizeTailoredLine(resumeDoc.header.contact.email ?? ""),
                sanitizeTailoredLine(resumeDoc.header.contact.phone ?? ""),
                sanitizeTailoredLine(resumeDoc.header.contact.linkedin ?? ""),
                sanitizeTailoredLine(resumeDoc.header.contact.address ?? ""),
            ].filter((part) => part.length > 0);

            if (nameLine) lines.push(nameLine);
            if (titleLine) lines.push(titleLine);
            if (contactParts.length > 0) lines.push(contactParts.join(" | "));
            if (lines.length > 0) lines.push("");

            if (resumeDoc.summary?.trim()) {
                lines.push("Summary");
                lines.push(sanitizeTailoredLine(resumeDoc.summary));
                lines.push("");
            }

            if ((resumeDoc.experience ?? []).length > 0) {
                lines.push("Experience");
                lines.push("");
                for (const entry of resumeDoc.experience) {
                    const headingParts = [entry.title, entry.company].filter(Boolean);
                    if (headingParts.length > 0) lines.push(sanitizeTailoredLine(headingParts.join(" - ")));
                    if (entry.date_range?.trim()) lines.push(sanitizeTailoredLine(entry.date_range));
                    const bullets = (entry.rewritten_bullets && entry.rewritten_bullets.length > 0)
                        ? entry.rewritten_bullets
                        : (entry.original_bullets ?? []);
                    for (const bullet of bullets) {
                        const cleaned = sanitizeTailoredLine(bullet);
                        if (cleaned && !isInstructionalText(cleaned)) lines.push(`- ${cleaned}`);
                    }
                    lines.push("");
                }
            }

            if ((resumeDoc.education ?? []).length > 0) {
                lines.push("Education");
                for (const item of resumeDoc.education) {
                    const cleaned = sanitizeTailoredLine(item);
                    if (cleaned) lines.push(`- ${cleaned}`);
                }
                lines.push("");
            }

            const achievements = (analysis.resumeImprovements ?? [])
                .map((item) => sanitizeTailoredLine(item))
                .filter((item) => item.length > 0 && !isInstructionalText(item));
            if (achievements.length > 0) {
                lines.push("Key Achievements");
                for (const item of achievements) lines.push(`- ${item}`);
                lines.push("");
            }

            return lines.join("\n").trim();
        }

        if (rewrite?.summary_suggestion) {
            lines.push("Summary");
            lines.push(sanitizeTailoredLine(rewrite.summary_suggestion));
            lines.push("");
        }

        const roles = rewrite?.roles ?? [];
        if (roles.length > 0) {
            lines.push("Experience");
            lines.push("");
        }
        for (const role of roles) {
            lines.push(role.company);
            if (role.role_description?.trim()) {
                const cleanedDescription = sanitizeTailoredLine(role.role_description.trim());
                if (cleanedDescription) lines.push(cleanedDescription);
            }
            for (const bullet of role.rewritten_bullets ?? []) {
                const cleaned = sanitizeTailoredLine(bullet);
                if (cleaned) lines.push(`- ${cleaned}`);
            }
            lines.push("");
        }

        const achievements = (analysis.resumeImprovements ?? [])
            .map((item) => sanitizeTailoredLine(item))
            .filter((item) => item.length > 0);
        if (achievements.length > 0) {
            lines.push("Key Achievements");
            for (const item of achievements) {
                lines.push(`- ${item}`);
            }
            lines.push("");
        }

        if (!rewrite && achievements.length === 0) {
            lines.push("No tailored resume content available yet for this role.");
        }
        return lines.join("\n").trim();
    }

    async function runAnalysis(jobDescription: string): Promise<MatchAnalysis> {
        setAnalysisState("analyzing");
        setErrorMessage("");

        try {
            const profileId = getStoredProfileId();
            if (!profileId) {
                throw new Error("No profile found. Please upload a resume first.");
            }

            const response = await fetch("/api/match-job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription, profileId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Analysis failed");
            }

            setResult(data.analysis);
            setAnalysisState("done");
            return data.analysis as MatchAnalysis;
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
            setAnalysisState("error");
            throw err;
        }
    }

    async function handleAnalyze() {
        if (jobText.length < 50) return;
        await runAnalysis(jobText);
    }

    async function generateReviewAnalysis(jobDescription: string) {
        setReviewModalAnalysis(null);
        setIsReviewLoading(true);
        try {
            setJobText(jobDescription);
            const analysis = await runAnalysis(jobDescription);
            setReviewModalAnalysis(analysis);
        } catch (err) {
            setSearchError(err instanceof Error ? err.message : "Failed to prepare tailored resume.");
            setSearchState("error");
        } finally {
            setIsReviewLoading(false);
        }
    }

    async function openJobReview(job: JobSearchResult) {
        setReviewModalJob(job);
        setReviewModalAnalysis(null);
        await generateReviewAnalysis(job.job_description);
    }

    async function loadJobCopilotRecommendations(queryOverride?: string) {
        if (!LEGACY_JOB_FEED_UI_ENABLED) {
            setSearchResults([]);
            setSearchState("idle");
            setSearchNotice("Legacy in-app job feed has been retired. Use the Job Copilot browser extension on supported job pages.");
            return;
        }

        setSearchState("searching");
        setSearchError("");
        setSearchNotice("");

        try {
            const profileId = getStoredProfileId();
            if (!profileId) {
                throw new Error("No profile found. Please upload a resume first.");
            }

            const response = await fetch("/api/job-copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profileId,
                    query: queryOverride?.trim() || undefined,
                    location: searchLocation.trim() || undefined,
                }),
            });

            const data = await response.json();
            const normalizedQueryOverride = queryOverride?.trim() ? queryOverride.trim() : null;
            setActiveQueryOverride(normalizedQueryOverride);
            console.log("job-copilot request payload:", {
                profileId,
                query: normalizedQueryOverride || undefined,
                location: searchLocation.trim() || undefined,
            });
            console.log("job-copilot response status/meta:", {
                ok: response.ok,
                status: response.status,
                jobsCount: Array.isArray(data?.recommended_jobs) ? data.recommended_jobs.length : null,
            });
            if (!response.ok) {
                throw new Error(data.error || "Job Copilot search failed");
            }

            const copilotJobs: JobSearchResult[] = (data.recommended_jobs ?? []).map((job: {
                job_url?: string | null;
                job_title: string;
                company: string | null;
                job_description: string;
                source?: "live" | "fallback_real" | "mock";
                fit_category?: "best_fit" | "safe_stretch" | "long_shot";
                match_score: number;
                probability_band: "high" | "medium" | "low";
                why_fit: string[];
                is_new?: boolean;
                location?: string | null;
            }) => ({
                job_url: job.job_url ?? `local://copilot/${job.job_title}`,
                title: job.job_title,
                company: job.company,
                job_description: job.job_description,
                location: job.location ?? null,
                source: job.source,
                fit_category: job.fit_category,
                match_score: job.match_score,
                probability_band: job.probability_band,
                why_fit: job.why_fit,
                is_new: job.is_new === true,
            }));

            const liveCount = copilotJobs.filter((job) => job.source === "live").length;
            const fallbackRealCount = copilotJobs.filter((job) => job.source === "fallback_real").length;
            const mockCount = copilotJobs.filter((job) => job.source === "mock").length;
            console.log("job-copilot UI source summary:", {
                live: liveCount,
                fallback_real: fallbackRealCount,
                mock: mockCount,
                mode: liveCount > 0 ? "live" : (fallbackRealCount > 0 ? "fallback_real" : "mock"),
                total: copilotJobs.length,
            });

            setSearchResults(copilotJobs);
            if (copilotJobs.length === 0) {
                setSearchNotice("No recommended jobs found yet. You can still paste job descriptions or job links.");
            }
            setSearchState("done");
        } catch (err) {
            setSearchState("error");
            setSearchError(err instanceof Error ? err.message : "Something went wrong");
        }
    }

    async function recordJobAction(job: JobSearchResult, action: "applied" | "dismissed") {
        const profileId = getStoredProfileId();
        if (!profileId) {
            throw new Error("No profile found. Please upload a resume first.");
        }

        const title = (job.title ?? job.job_title ?? "").trim();
        if (!title) {
            throw new Error("Unable to record action: missing job title.");
        }

        const response = await fetch("/api/job-actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                profileId,
                job_url: job.job_url,
                job_title: title,
                company: job.company,
                action,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to record job action.");
        }
    }

    async function handleJobSearch() {
        await loadJobCopilotRecommendations(searchQuery.trim());
    }

    async function handleRankJobLinks() {
        const jobUrls = jobLinksText
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        if (jobUrls.length === 0) return;

        setSearchState("searching");
        setSearchError("");
        setSearchNotice("");

        try {
            const profileId = getStoredProfileId();
            if (!profileId) {
                throw new Error("No profile found. Please upload a resume first.");
            }

            const response = await fetch("/api/job-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId, jobUrls }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Job import failed");
            }

            setSearchResults(data.jobs ?? []);
            if (data.status === "source_blocked") {
                setSearchNotice("Automatic job import is temporarily unavailable from this source. You can still paste job descriptions or job links.");
            } else if (data.status === "no_results") {
                setSearchNotice("No jobs found from these links yet. You can still paste job descriptions or job links.");
            }
            setSearchState("done");
        } catch (err) {
            setSearchState("error");
            setSearchError(err instanceof Error ? err.message : "Something went wrong");
        }
    }

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                        Job{" "}
                        <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                            Copilot
                        </span>
                    </h1>
                    <p className="text-muted text-lg">
                        Import jobs, rank your best opportunities, and apply faster.
                    </p>
                </div>

                {/* Primary: Job Copilot Search */}
                <Card className="mb-8">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-base font-semibold">Find jobs for me</h2>
                            <p className="text-xs text-muted">Job Copilot automatically expands roles and ranks opportunities from your profile</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="md:col-span-2">
                            <p className="text-sm text-foreground/80">
                                Recommendations load automatically when you open Job Copilot.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="job-location" className="block text-xs font-medium mb-1.5 text-muted">Location (optional)</label>
                            <input
                                id="job-location"
                                type="text"
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                placeholder="e.g. Sydney"
                                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button size="sm" disabled={searchState === "searching"} onClick={() => void loadJobCopilotRecommendations()}>
                            {searchState === "searching" ? "Finding..." : "Refresh recommendations"}
                        </Button>
                    </div>
                    {searchState === "error" && searchError && (
                        <p className="mt-3 text-xs text-red-400">{searchError}</p>
                    )}
                    {searchNotice && (
                        <p className="mt-3 text-xs text-amber-300">{searchNotice}</p>
                    )}
                </Card>

                <details className="rounded-2xl border border-border/70 bg-surface p-4 mb-8">
                    <summary className="cursor-pointer select-none font-semibold text-sm text-foreground/90">
                        Advanced query override (optional)
                    </summary>
                    <p className="text-xs text-muted mt-2 mb-4">
                        Run Job Copilot with a manual role query override.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label htmlFor="job-query" className="block text-xs font-medium mb-1.5 text-muted">Query override</label>
                            <input
                                id="job-query"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="e.g. Analytics Manager, Program Manager"
                                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button size="sm" className="w-full" disabled={!searchQuery.trim() || searchState === "searching"} onClick={handleJobSearch}>
                                {searchState === "searching" ? "Finding..." : "Use query override"}
                            </Button>
                        </div>
                    </div>
                </details>

                {/* Secondary fallback: Paste Job Links */}
                <Card className="mb-8">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-base font-semibold">Paste Job Links</h2>
                            <p className="text-xs text-muted">Secondary fallback, one job link per line</p>
                        </div>
                    </div>
                    <textarea
                        value={jobLinksText}
                        onChange={(e) => setJobLinksText(e.target.value)}
                        placeholder={"https://www.seek.com.au/job/...\nhttps://www.linkedin.com/jobs/view/..."}
                        rows={5}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 resize-none"
                    />
                    <div className="flex justify-end mt-4">
                        <Button size="sm" disabled={!jobLinksText.trim() || searchState === "searching"} onClick={handleRankJobLinks}>
                            {searchState === "searching" ? "Ranking..." : "Rank These Jobs"}
                        </Button>
                    </div>
                </Card>

                {searchResults.length > 0 && (
                    <div className="mb-8 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Top jobs for you this week</h3>
                            <p className="text-xs text-muted">{searchResults.length} results</p>
                        </div>
                        {searchResults.map((job) => {
                            const score = job.match_score ?? job.career_twin_score ?? 0;
                            const title = job.title ?? job.job_title ?? "Untitled role";
                            const fitCategory = job.fit_category ?? "safe_stretch";
                            const userReasons = buildUserFacingReasons(job, title, score);
                            return (
                                <Card key={job.job_url}>
                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                                        <div className="min-w-0 space-y-2">
                                            <p className="font-semibold text-base leading-tight truncate">{title}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-muted truncate">{job.company ?? "Unknown company"}</p>
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${FIT_CATEGORY_STYLES[fitCategory]}`}>
                                                    {FIT_CATEGORY_LABELS[fitCategory]}
                                                </span>
                                                {job.is_new && (
                                                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                        New
                                                    </span>
                                                )}
                                                {isDev && job.source && (
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${job.source === "live"
                                                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                                                        : job.source === "fallback_real"
                                                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                                            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                                        }`}>
                                                        {job.source === "live" ? "Live" : (job.source === "fallback_real" ? "Fallback API" : "Mock")}
                                                    </span>
                                                )}
                                            </div>
                                            <ul className="space-y-1">
                                                {userReasons.map((reason, i) => (
                                                    <li key={i} className="text-xs text-foreground/75 leading-relaxed flex gap-2">
                                                        <span className="text-green-400 flex-shrink-0">•</span>
                                                        <span>{reason}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="text-right flex-shrink-0 rounded-xl border border-border/70 bg-surface-light/40 px-3 py-2 min-w-[120px]">
                                            <p className="text-2xl font-bold text-primary-light">{score}</p>
                                            <p className="text-xs text-muted">Match score</p>
                                            <p className="text-xs text-foreground/70 mt-1">
                                                {scoreMeaning(score)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <Button size="sm" onClick={async () => {
                                            await openJobReview(job);
                                        }}>
                                            Review & Apply
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={async () => {
                                            try {
                                                await recordJobAction(job, "dismissed");
                                                await loadJobCopilotRecommendations(activeQueryOverride ?? undefined);
                                            } catch (err) {
                                                setSearchError(err instanceof Error ? err.message : "Failed to dismiss job.");
                                                setSearchState("error");
                                            }
                                        }}>
                                            Skip
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {reviewModalJob && (
                    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                        <div className="w-full max-w-[96vw] h-[92vh] rounded-2xl border border-border bg-surface p-5 shadow-2xl flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold">Review & Apply</h3>
                                <p className="text-sm text-foreground/80 mt-1">{reviewModalJob.title ?? reviewModalJob.job_title ?? "Untitled role"}</p>
                                <p className="text-xs text-muted">{reviewModalJob.company ?? "Unknown company"} · {reviewModalJob.location?.trim() || "Location unavailable"}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                                <div className="rounded-xl border border-border/70 bg-surface-light/30 p-3 min-h-0 overflow-auto">
                                    <div className="mb-3">
                                        <h4 className="text-sm font-semibold">Job Summary (Provider Description)</h4>
                                        <p className="text-xs text-muted mt-1">{reviewModalJob.title ?? reviewModalJob.job_title ?? "Untitled role"}</p>
                                        <p className="text-xs text-muted">{reviewModalJob.company ?? "Unknown company"}</p>
                                        <p className="text-xs text-muted">{reviewModalJob.location?.trim() || "Location unavailable"}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {reviewModalJob.job_url?.startsWith("http") && (
                                                <a
                                                    href={reviewModalJob.job_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-primary-light underline underline-offset-2"
                                                >
                                                    View full job posting
                                                </a>
                                            )}
                                            {isDev && reviewModalJob.source && (
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${reviewModalJob.source === "live"
                                                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                                                    : reviewModalJob.source === "fallback_real"
                                                        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                                    }`}>
                                                    {reviewModalJob.source === "live" ? "Live" : (reviewModalJob.source === "fallback_real" ? "Fallback API" : "Mock")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm text-foreground/85 leading-relaxed">{reviewModalJob.job_description}</p>
                                </div>

                                <div className="rounded-xl border border-border/70 bg-surface-light/30 p-3 min-h-0 overflow-auto">
                                    <h4 className="text-sm font-semibold mb-2">Tailored Resume Preview</h4>
                                    {isReviewLoading ? (
                                        <p className="text-xs text-muted">Preparing tailored resume...</p>
                                    ) : reviewModalAnalysis?.resumeRewrite?.resume_document ? (
                                        <div className="space-y-4 text-xs text-foreground/85 leading-relaxed">
                                            <section>
                                                {reviewModalAnalysis.resumeRewrite.resume_document.header.full_name && (
                                                    <p className="text-sm font-semibold">{reviewModalAnalysis.resumeRewrite.resume_document.header.full_name}</p>
                                                )}
                                                {reviewModalAnalysis.resumeRewrite.resume_document.header.current_title && (
                                                    <p>{reviewModalAnalysis.resumeRewrite.resume_document.header.current_title}</p>
                                                )}
                                                <p className="text-muted">
                                                    {[
                                                        reviewModalAnalysis.resumeRewrite.resume_document.header.contact.email,
                                                        reviewModalAnalysis.resumeRewrite.resume_document.header.contact.phone,
                                                        reviewModalAnalysis.resumeRewrite.resume_document.header.contact.linkedin,
                                                        reviewModalAnalysis.resumeRewrite.resume_document.header.contact.address,
                                                    ].filter(Boolean).join(" | ")}
                                                </p>
                                            </section>

                                            {reviewModalAnalysis.resumeRewrite.resume_document.summary && (
                                                <section>
                                                    <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Summary</p>
                                                    <p>{reviewModalAnalysis.resumeRewrite.resume_document.summary}</p>
                                                </section>
                                            )}

                                            <section>
                                                <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Experience</p>
                                                <div className="space-y-3">
                                                    {reviewModalAnalysis.resumeRewrite.resume_document.experience.map((entry, i) => (
                                                        <div key={`${entry.company ?? "company"}-${i}`} className="rounded-lg border border-border/40 p-2">
                                                            <p className="font-semibold">{[entry.title, entry.company].filter(Boolean).join(" - ") || "Experience"}</p>
                                                            {(entry.dates ?? entry.date_range) && <p className="text-muted">{entry.dates ?? entry.date_range}</p>}
                                                            <ul className="mt-1 space-y-1">
                                                                {((entry.bullets && entry.bullets.length > 0)
                                                                    ? entry.bullets
                                                                    : (entry.rewritten_bullets.length > 0 ? entry.rewritten_bullets : entry.original_bullets)
                                                                ).map((bullet, j) => (
                                                                    <li key={j} className="flex gap-2">
                                                                        <span className="text-green-400">•</span>
                                                                        <span>{bullet}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            {reviewModalAnalysis.resumeRewrite.resume_document.education.length > 0 && (
                                                <section>
                                                    <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Education</p>
                                                    <ul className="space-y-1">
                                                        {reviewModalAnalysis.resumeRewrite.resume_document.education.map((item, i) => (
                                                            <li key={i} className="flex gap-2">
                                                                <span className="text-green-400">•</span>
                                                                <span>{item}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </section>
                                            )}

                                            {(reviewModalAnalysis.resumeRewrite.resume_document.skills ?? []).length > 0 && (
                                                <section>
                                                    <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Skills</p>
                                                    <p>{(reviewModalAnalysis.resumeRewrite.resume_document.skills ?? []).join(" | ")}</p>
                                                </section>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted">No tailored resume preview available yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-4 border-t border-border/60 pt-4">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={isApplyingNow || isReviewLoading}
                                    onClick={() => {
                                        setReviewModalJob(null);
                                        setReviewModalAnalysis(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isApplyingNow || isReviewLoading}
                                    onClick={async () => {
                                        try {
                                            if (!reviewModalJob) return;
                                            setIsApplyingNow(true);
                                            if (reviewModalJob.job_url?.startsWith("http")) {
                                                window.open(reviewModalJob.job_url, "_blank", "noopener,noreferrer");
                                            }
                                            await recordJobAction(reviewModalJob, "applied");
                                            setReviewModalJob(null);
                                            setReviewModalAnalysis(null);
                                            await loadJobCopilotRecommendations(activeQueryOverride ?? undefined);
                                        } catch (err) {
                                            setSearchError(err instanceof Error ? err.message : "Failed to apply to job.");
                                            setSearchState("error");
                                        } finally {
                                            setIsApplyingNow(false);
                                        }
                                    }}
                                >
                                    {isApplyingNow ? "Applying..." : "Apply Now"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input B: Paste Job Description (Secondary fallback) */}
                <Card className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <label htmlFor="job-description" className="block text-sm font-medium">
                            Paste Job Description
                        </label>
                        <span className="text-xs text-muted">Fallback option</span>
                    </div>
                    <textarea
                        id="job-description"
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        placeholder="Paste the full job description here..."
                        rows={8}
                        disabled={analysisState === "analyzing"}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 resize-none transition-colors disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-muted">
                            {jobText.length > 0 ? `${jobText.length} characters` : "Paste to get started"}
                        </p>
                        <div className="flex gap-3">
                            {analysisState === "done" && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setJobText("");
                                        setResult(null);
                                        setAnalysisState("idle");
                                    }}
                                >
                                    Clear
                                </Button>
                            )}
                            <Button
                                size="sm"
                                disabled={jobText.length < 50 || analysisState === "analyzing"}
                                onClick={handleAnalyze}
                            >
                                {analysisState === "analyzing" ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analyzing...
                                    </span>
                                ) : analysisState === "done" ? (
                                    "Re-analyze"
                                ) : (
                                    "Analyze Match"
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Error */}
                {analysisState === "error" && errorMessage && (
                    <Card className="mb-6 border-red-500/30">
                        <div className="flex items-center gap-3 text-red-400">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <p className="text-sm">{errorMessage}</p>
                        </div>
                    </Card>
                )}

                {/* Results */}
                {analysisState === "done" && result && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Apply Mode (Primary) */}
                        <MatchSummaryCard
                            careerTwinScore={result.careerTwinScore}
                            recommendation={result.recommendation}
                        />

                        <Card>
                            <div className="flex items-center justify-between gap-4 mb-3">
                                <div>
                                    <h3 className="font-semibold">Apply view</h3>
                                    <p className="text-xs text-muted">This role is ready for fast tailoring and submission</p>
                                </div>
                                <span className="text-xs px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary-light font-semibold">
                                    Score {result.careerTwinScore?.score ?? result.overallScore}
                                </span>
                            </div>
                            <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
                                {(result.whyThisRoleFitsYou && result.whyThisRoleFitsYou[0]) || "Strong overall alignment for a near-term application."}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => document.getElementById("resume-rewrite-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                                    Review Resume
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                        const text = buildResumeUpdateText(result);
                                        await navigator.clipboard.writeText(text);
                                    }}
                                >
                                    Copy Resume Updates
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        const text = buildResumeUpdateText(result);
                                        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = "careertwin-resume-updates.txt";
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    Export Resume
                                </Button>
                            </div>
                        </Card>

                        <div id="resume-improvements-section">
                            <Suggestions
                                resumeImprovements={result.resumeImprovements}
                                positioningSuggestions={result.positioningSuggestions}
                                nextBestActions={result.nextBestActions}
                            />
                        </div>

                        <div id="resume-rewrite-section">
                            <ResumeRewrite rewrite={result.resumeRewrite} />
                        </div>

                        {/* Detailed Analysis (Secondary) */}
                        <details className="rounded-2xl border border-border/70 bg-surface p-4">
                            <summary className="cursor-pointer select-none font-semibold text-sm text-foreground/90">
                                Detailed analysis
                            </summary>
                            <p className="text-xs text-muted mt-2 mb-4">
                                Diagnostics, gaps, and longer-term improvement insights.
                            </p>

                            <div className="space-y-6">
                                {result.explanationSummary && (
                                    <Card>
                                        <h3 className="font-semibold mb-1">Explanation</h3>
                                        <p className="text-xs text-muted mb-2">Detailed fit context</p>
                                        <p className="text-sm text-foreground/80 leading-relaxed">{result.explanationSummary}</p>
                                    </Card>
                                )}

                                <WhyFitsCard points={result.whyThisRoleFitsYou ?? []} />

                                <WhyNotFitCard
                                    criticalGaps={result.criticalGaps ?? []}
                                    evidenceGaps={result.evidenceGaps ?? []}
                                />

                                {result.careerTwinScore && (
                                    <Card>
                                        <h3 className="font-semibold mb-1">Dimension scores</h3>
                                        <p className="text-xs text-muted mb-3">Capability and fit scoring breakdown</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {Object.values(result.careerTwinScore.breakdown).map((dim) => (
                                                <div key={dim.label} className="rounded-xl bg-surface-light/40 border border-border p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-xs font-medium text-foreground/80">{dim.label}</p>
                                                        <span className="text-xs font-bold text-primary-light">{dim.score}</span>
                                                    </div>
                                                    <p className="text-xs text-muted leading-relaxed">{dim.rationale}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ScoreRing score={result.overallScore} />
                                    <ExperienceGap
                                        requiredYears={result.experienceGap.requiredYears}
                                        candidateYears={result.experienceGap.candidateYears}
                                        meets={result.experienceGap.meets}
                                    />
                                </div>

                                <SkillComparison
                                    matchedSkills={result.matchedSkills}
                                    missingSkills={result.missingSkills}
                                />

                                <MatchedEvidenceCard items={result.matchedEvidence ?? []} />
                                <MissingEvidenceCard items={result.missingEvidence ?? []} />

                                <PriorityGaps
                                    gaps={result.priorityGaps}
                                    summary={result.gapSummary}
                                />

                                {result.actionPlan && (
                                    <ActionPlanCard plan={result.actionPlan} />
                                )}

                                {result.simulation && result.simulation.improvements.length > 0 && (
                                    <Card>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">Long-Term Simulation</h3>
                                                <p className="text-xs text-muted">
                                                    Current: <span className="text-foreground font-medium">{result.simulation.baseline_score}</span>
                                                    {" -> "}
                                                    Best case: <span className="text-accent font-medium">{result.simulation.best_case_score}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {result.simulation.improvements.map((imp, i) => (
                                                <div key={i} className="rounded-xl bg-surface-light/40 border border-accent/15 p-3">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <p className="text-xs font-semibold text-accent">{imp.added_skill_or_capability}</p>
                                                        <span className="text-xs font-bold text-green-400">+{imp.score_delta} pts {"->"} {imp.score_after}</span>
                                                    </div>
                                                    <p className="text-xs text-foreground/70 leading-relaxed">{imp.explanation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </details>
                    </div>
                )}
                {/* Idle state placeholders */}
                {analysisState === "idle" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {["Match Score", "Skill Gaps", "Action Plan"].map((title) => (
                            <Card key={title} className="text-center py-8">
                                <p className="text-sm font-medium text-muted mb-2">{title}</p>
                                <p className="text-xs text-muted/60">Results appear after analysis</p>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

