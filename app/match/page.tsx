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
    resumeRewrite: {
        roles: Array<{ company: string; original_bullets: string[]; rewritten_bullets: string[]; role_description: string }>;
        summary_suggestion: string;
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
    const [jobText, setJobText] = useState("");
    const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
    const [result, setResult] = useState<MatchAnalysis | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleAnalyze() {
        if (jobText.length < 50) return;

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
                body: JSON.stringify({ jobDescription: jobText, profileId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Analysis failed");
            }

            setResult(data.analysis);
            setAnalysisState("done");
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
            setAnalysisState("error");
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
                            Match
                        </span>
                    </h1>
                    <p className="text-muted text-lg">
                        Paste a job description to see how you stack up.
                    </p>
                </div>

                {/* Job description input */}
                <Card className="mb-8">
                    <label htmlFor="job-description" className="block text-sm font-medium mb-3">
                        Job Description
                    </label>
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
                        {/* Score + Experience */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ScoreRing score={result.overallScore} />
                            <ExperienceGap
                                requiredYears={result.experienceGap.requiredYears}
                                candidateYears={result.experienceGap.candidateYears}
                                meets={result.experienceGap.meets}
                            />
                        </div>

                        {/* Skill comparison */}
                        <SkillComparison
                            matchedSkills={result.matchedSkills}
                            missingSkills={result.missingSkills}
                        />

                        {/* Matched strengths evidence */}
                        <MatchedEvidenceCard items={result.matchedEvidence ?? []} />

                        {/* Missing evidence */}
                        <MissingEvidenceCard items={result.missingEvidence ?? []} />

                        {/* Priority gaps */}
                        <PriorityGaps
                            gaps={result.priorityGaps}
                            summary={result.gapSummary}
                        />

                        {/* Career action plan */}
                        <Suggestions
                            resumeImprovements={result.resumeImprovements}
                            positioningSuggestions={result.positioningSuggestions}
                            nextBestActions={result.nextBestActions}
                        />

                        {/* Action plan */}
                        {result.actionPlan && (
                            <ActionPlanCard plan={result.actionPlan} />
                        )}

                        {/* Career Twin Score */}
                        {result.careerTwinScore && (
                            <Card>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Career Twin Score</h3>
                                        <p className="text-xs text-muted">How ready your profile is for this role</p>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <p className="text-3xl font-bold text-primary-light">{result.careerTwinScore.score}</p>
                                        <p className="text-xs text-muted">{result.careerTwinScore.label}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.values(result.careerTwinScore.breakdown).map((dim) => (
                                        <div key={dim.label} className="rounded-xl bg-surface-light/40 border border-border p-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-xs font-medium text-foreground/80">{dim.label}</p>
                                                <span className="text-xs font-bold text-primary-light">{dim.score}</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                                                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${dim.score}%` }} />
                                            </div>
                                            <p className="text-xs text-muted mt-1.5 leading-relaxed">{dim.rationale}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Resume Rewrite */}
                        <ResumeRewrite rewrite={result.resumeRewrite} />

                        {/* Career Simulation */}
                        {result.simulation && result.simulation.improvements.length > 0 && (
                            <Card>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Career Simulation</h3>
                                        <p className="text-xs text-muted">
                                            Current: <span className="text-foreground font-medium">{result.simulation.baseline_score}</span>
                                            {" → "}
                                            Best case: <span className="text-accent font-medium">{result.simulation.best_case_score}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {result.simulation.improvements.map((imp, i) => (
                                        <div key={i} className="rounded-xl bg-surface-light/40 border border-accent/15 p-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="text-xs font-semibold text-accent">{imp.added_skill_or_capability}</p>
                                                <span className="text-xs font-bold text-green-400">+{imp.score_delta} pts → {imp.score_after}</span>
                                            </div>
                                            <p className="text-xs text-foreground/70 leading-relaxed">{imp.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
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
