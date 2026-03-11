"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getStoredProfileId } from "@/lib/db/profile";

type PipelineStatus = "viewed" | "applied" | "interview";
type Verdict = "strong_fit" | "possible_fit" | "stretch" | "low_fit" | null;

interface MatchHistoryEntry {
    interactionId: number;
    jobSnapshotId: number;
    pipelineStatus: PipelineStatus;
    firstSeenAt: string;
    lastSeenAt: string;
    pipelineUpdatedAt: string;
    matchScore: number | null;
    verdict: Verdict;
    selectedEvidenceIds: string[];
    sourcePlatform: "linkedin" | "seek" | null;
    jobUrl: string | null;
    jobTitle: string | null;
    company: string | null;
    location: string | null;
    jobDescriptionSnapshot: string | null;
}

function formatDateTime(iso: string | null): string {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function verdictText(verdict: Verdict): string {
    if (verdict === "strong_fit") return "Strong fit";
    if (verdict === "possible_fit") return "Possible fit";
    if (verdict === "stretch") return "Stretch";
    if (verdict === "low_fit") return "Low fit";
    return "-";
}

function statusBadgeClass(status: PipelineStatus): string {
    if (status === "applied") return "bg-green-500/15 text-green-400 border-green-500/30";
    if (status === "interview") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    return "bg-surface-light text-muted border-border";
}

function sourceBadgeLabel(source: "linkedin" | "seek" | null): string {
    if (source === "linkedin") return "LinkedIn";
    if (source === "seek") return "Seek";
    return "Unknown source";
}

function HistoryCard({ entry }: { entry: MatchHistoryEntry }) {
    return (
        <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="font-semibold truncate text-base">
                        {entry.jobTitle ?? "Untitled role"}
                    </p>
                    <p className="text-xs text-muted truncate">
                        {entry.company ?? "Unknown company"}
                        {entry.location ? ` | ${entry.location}` : ""}
                    </p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-primary-light">
                        {typeof entry.matchScore === "number" ? `${entry.matchScore}%` : "-"}
                    </p>
                    <p className="text-xs text-muted">{verdictText(entry.verdict)}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadgeClass(entry.pipelineStatus)}`}>
                    {entry.pipelineStatus}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full border bg-surface-light text-muted border-border">
                    {sourceBadgeLabel(entry.sourcePlatform)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full border bg-surface-light text-muted border-border">
                    Evidence {entry.selectedEvidenceIds.length}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted">
                <p>Last seen: {formatDateTime(entry.lastSeenAt)}</p>
                <p>Pipeline updated: {formatDateTime(entry.pipelineUpdatedAt)}</p>
            </div>

            {entry.jobUrl && (
                <a
                    href={entry.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-primary-light hover:underline"
                >
                    Open job page
                </a>
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
                if (!profileId) {
                    setLoading(false);
                    return;
                }

                const res = await fetch(`/api/match-history?profileId=${profileId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Failed to load history");
                setHistory(Array.isArray(data.history) ? data.history : []);
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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Pipeline History</h1>
                    <p className="text-muted">Viewed and applied jobs from Job Copilot extension activity.</p>
                </div>

                {error && (
                    <Card className="border-red-500/30 mb-6">
                        <p className="text-sm text-red-400">{error}</p>
                    </Card>
                )}

                {!error && history.length === 0 && (
                    <Card className="text-center py-12">
                        <p className="font-semibold mb-2">No pipeline activity yet</p>
                        <p className="text-sm text-muted">
                            Open a supported job detail page in the Job Copilot extension to start tracking.
                        </p>
                    </Card>
                )}

                <div className="space-y-4">
                    {history.map((entry) => (
                        <HistoryCard key={entry.interactionId} entry={entry} />
                    ))}
                </div>
            </div>
        </div>
    );
}
