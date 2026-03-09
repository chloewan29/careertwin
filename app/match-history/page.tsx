"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getStoredProfileId } from "@/lib/db/profile";

interface GapItem {
    skill: string | null;
    type: string;
    priority: "critical" | "important" | "nice-to-have";
    gap_description: string;
    action: string;
}

interface MatchHistoryEntry {
    id: string;
    created_at: string;
    target_title: string | null;
    target_company: string | null;
    match_score: number;
    matched_skills: string[];
    missing_skills: string[];
    gap_analysis: {
        priority_gaps: GapItem[];
        summary: string;
    } | null;
    action_plan: {
        actions_7d: string[];
        actions_30d: string[];
        actions_90d: string[];
    } | null;
}

function scoreColor(score: number): string {
    if (score >= 75) return "text-cyan-400";
    if (score >= 55) return "text-primary-light";
    if (score >= 35) return "text-amber-400";
    return "text-red-400";
}

function scoreLabel(score: number): string {
    if (score >= 78) return "Strong match";
    if (score >= 58) return "Moderate match";
    if (score >= 38) return "Partial match";
    return "Low match";
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
    });
}

const PRIORITY_BADGE: Record<GapItem["priority"], string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    important: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    "nice-to-have": "bg-primary/10 text-primary-light border-primary/20",
};

function HistoryCard({ entry }: { entry: MatchHistoryEntry }) {
    const [expanded, setExpanded] = useState(false);
    const priorityGaps = entry.gap_analysis?.priority_gaps ?? [];

    return (
        <Card className="space-y-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="font-semibold truncate text-base">
                        {entry.target_title ?? "Untitled Role"}
                    </p>
                    {entry.target_company && (
                        <p className="text-xs text-muted truncate">{entry.target_company}</p>
                    )}
                    <p className="text-xs text-muted/60 mt-0.5">{formatDate(entry.created_at)}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                    <p className={`text-3xl font-bold ${scoreColor(entry.match_score)}`}>
                        {entry.match_score}
                        <span className="text-sm font-normal text-muted ml-0.5">/100</span>
                    </p>
                    <p className={`text-xs font-medium ${scoreColor(entry.match_score)}`}>
                        {scoreLabel(entry.match_score)}
                    </p>
                </div>
            </div>

            {/* Skill chips */}
            <div className="flex flex-wrap gap-1.5">
                {entry.matched_skills.slice(0, 5).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        ✓ {s}
                    </span>
                ))}
                {entry.missing_skills.slice(0, 4).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        ✗ {s}
                    </span>
                ))}
                {(entry.matched_skills.length + entry.missing_skills.length) > 9 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-light text-muted border border-border">
                        +{entry.matched_skills.length + entry.missing_skills.length - 9} more
                    </span>
                )}
            </div>

            {/* Expand toggle */}
            {(priorityGaps.length > 0 || entry.action_plan) && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
                >
                    {expanded ? "▲ Hide details" : "▼ Show gaps & actions"}
                </button>
            )}

            {expanded && (
                <div className="space-y-4 pt-1 border-t border-border">
                    {/* Priority gaps */}
                    {priorityGaps.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Priority Gaps</p>
                            <div className="space-y-2">
                                {priorityGaps.slice(0, 3).map((gap, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${PRIORITY_BADGE[gap.priority]}`}>
                                            {gap.priority}
                                        </span>
                                        <p className="text-xs text-foreground/70 leading-relaxed">{gap.gap_description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 7-day actions */}
                    {(entry.action_plan?.actions_7d?.length ?? 0) > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">This Week</p>
                            <ul className="space-y-1.5">
                                {(entry.action_plan?.actions_7d ?? []).slice(0, 3).map((a, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-foreground/70 leading-relaxed">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center font-bold mt-0.5 text-[10px]">{i + 1}</span>
                                        <span>{a}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default function MatchHistoryPage() {
    const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const profileId = getStoredProfileId();
                if (!profileId) { setLoading(false); return; }

                const res = await fetch(`/api/match-history?profileId=${profileId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setHistory(data.history ?? []);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load history");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            Match{" "}
                            <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                                History
                            </span>
                        </h1>
                        <p className="text-muted">Your last 5 job analyses.</p>
                    </div>
                    <Link href="/match">
                        <Button size="sm" variant="secondary">Analyze a Job →</Button>
                    </Link>
                </div>

                {error && (
                    <Card className="border-red-500/30 mb-6">
                        <p className="text-sm text-red-400">{error}</p>
                    </Card>
                )}

                {!error && history.length === 0 && (
                    <Card className="text-center py-12">
                        <p className="font-semibold mb-2">No analyses yet</p>
                        <p className="text-sm text-muted mb-6">Paste a job description on the Match page to get started.</p>
                        <Link href="/match">
                            <Button>Analyze a Job</Button>
                        </Link>
                    </Card>
                )}

                <div className="space-y-4">
                    {history.map(entry => (
                        <HistoryCard key={entry.id} entry={entry} />
                    ))}
                </div>
            </div>
        </div>
    );
}
