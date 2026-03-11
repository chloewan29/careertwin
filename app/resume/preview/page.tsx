"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ResumeOutput = {
    summary: string | null;
    experience: Array<{
        company: string;
        role: string;
        date_range: string;
        bullets: string[];
    }>;
};

type DebugOutput = {
    metadata: {
        profile_id: string;
        career_id: string | null;
        job_id: string;
        total_evidence_loaded: number;
        total_evidence_in_pool: number;
        total_evidence_ranked: number;
        total_evidence_selected: number;
        selected_experience_count: number;
        pool_source_counts: Record<string, number>;
        matched_capabilities_in_summary: string[];
        dropped_for_length: number;
        dropped_for_validation: number;
        dropped_for_duplicate: number;
    };
    experiences: Array<{
        company: string;
        role: string;
        date_range: string;
        bullets: Array<{
            evidence_piece_id: string;
            original_bullet: string;
            rewritten_bullet: string;
            original_length: number;
            rewritten_length: number;
            was_compacted: boolean;
            source_was_paragraph_like: boolean;
            score: number;
            matched_signals: string[];
            pool_sources: string[];
            score_breakdown: Record<string, unknown>;
        }>;
    }>;
};

type ApiResponse = {
    success?: boolean;
    resume?: ResumeOutput;
    debug?: DebugOutput;
    error?: string;
};

export default function ResumePreviewPage() {
    const [profileId, setProfileId] = useState("");
    const [jobId, setJobId] = useState("");
    const [debugEnabled, setDebugEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasAttempted, setHasAttempted] = useState(false);
    const [resume, setResume] = useState<ResumeOutput | null>(null);
    const [debug, setDebug] = useState<DebugOutput | null>(null);

    async function handleGenerate() {
        setHasAttempted(true);
        setLoading(true);
        setError(null);
        setResume(null);
        setDebug(null);

        try {
            const response = await fetch("/api/resume/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profile_id: profileId.trim(),
                    job_id: jobId.trim(),
                    debug: debugEnabled,
                }),
            });

            const data = (await response.json()) as ApiResponse;
            if (!response.ok || !data.resume) {
                throw new Error(data.error ?? "Failed to generate tailored resume");
            }

            setResume(data.resume);
            setDebug(data.debug ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <h1 className="text-2xl font-semibold mb-2">Resume Copilot Preview</h1>
                    <p className="text-sm text-muted mb-6">Generate and preview a tailored resume from evidence pieces.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="profile_id" className="block text-xs font-medium text-muted mb-1">profileId</label>
                            <input
                                id="profile_id"
                                value={profileId}
                                onChange={(e) => setProfileId(e.target.value)}
                                placeholder="Enter profile UUID"
                                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="job_id" className="block text-xs font-medium text-muted mb-1">jobId</label>
                            <input
                                id="job_id"
                                value={jobId}
                                onChange={(e) => setJobId(e.target.value)}
                                placeholder="Enter job UUID"
                                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <label className="inline-flex items-center gap-2 mb-4 text-sm">
                        <input
                            type="checkbox"
                            checked={debugEnabled}
                            onChange={(e) => setDebugEnabled(e.target.checked)}
                        />
                        <span>debug</span>
                    </label>

                    <div>
                        <Button
                            onClick={handleGenerate}
                            disabled={loading || !profileId.trim() || !jobId.trim()}
                        >
                            {loading ? "Generating..." : "Generate Resume"}
                        </Button>
                    </div>

                    {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
                </Card>

                {!loading && !hasAttempted && (
                    <Card>
                        <p className="text-sm text-muted">Enter profileId and jobId, then click Generate Resume.</p>
                    </Card>
                )}

                {loading && (
                    <Card>
                        <p className="text-sm text-muted">Generating tailored resume...</p>
                    </Card>
                )}

                {!loading && !error && hasAttempted && resume && resume.experience.length === 0 && (
                    <Card>
                        <p className="text-sm text-muted">No resume output was generated for this input.</p>
                    </Card>
                )}

                {resume && resume.experience.length > 0 && (
                    <>
                        <Card>
                            <h2 className="text-xl font-semibold mb-2">Summary</h2>
                            <p className="text-sm text-foreground/80 leading-relaxed">{resume.summary ?? "(No summary)"}</p>
                        </Card>

                        {resume.experience.map((experience, i) => (
                            <Card key={`${experience.company}-${experience.role}-${i}`}>
                                <div className="mb-4">
                                    <h3 className="font-semibold">{experience.role}</h3>
                                    <p className="text-sm text-foreground/80">{experience.company}</p>
                                    <p className="text-xs text-muted">{experience.date_range}</p>
                                </div>

                                <ul className="space-y-3">
                                    {experience.bullets.map((bullet, bulletIndex) => (
                                        <li key={`${experience.company}-${experience.role}-${bulletIndex}`}>
                                            <p className="text-sm leading-relaxed">- {bullet}</p>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        ))}

                        {debugEnabled && debug && (
                            <Card>
                                <h2 className="text-lg font-semibold mb-3">Debug</h2>
                                <pre className="text-xs bg-surface border border-border rounded-lg p-3 overflow-x-auto mb-4">
                                    {JSON.stringify(debug.metadata, null, 2)}
                                </pre>

                                <div className="space-y-4">
                                    {debug.experiences.map((experience, expIndex) => (
                                        <div key={`${experience.company}-${experience.role}-${expIndex}`} className="border border-border rounded-lg p-3">
                                            <p className="text-sm font-semibold">{experience.role} @ {experience.company}</p>
                                            <p className="text-xs text-muted mb-3">{experience.date_range}</p>

                                            <div className="space-y-3">
                                                {experience.bullets.map((bullet) => (
                                                    <div key={bullet.evidence_piece_id} className="bg-surface border border-border rounded-md p-3">
                                                        <p className="text-xs"><span className="font-semibold">evidence_piece_id:</span> {bullet.evidence_piece_id}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">original_bullet:</span> {bullet.original_bullet}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">rewritten_bullet:</span> {bullet.rewritten_bullet}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">original_length:</span> {bullet.original_length}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">rewritten_length:</span> {bullet.rewritten_length}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">was_compacted:</span> {String(bullet.was_compacted)}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">source_was_paragraph_like:</span> {String(bullet.source_was_paragraph_like)}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">score:</span> {bullet.score}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">matched_signals:</span> {bullet.matched_signals.join(", ") || "(none)"}</p>
                                                        <p className="text-xs mt-1"><span className="font-semibold">pool_sources:</span> {bullet.pool_sources.join(", ") || "(none)"}</p>
                                                        <pre className="text-xs mt-2 bg-surface-light border border-border rounded p-2 overflow-x-auto">
                                                            {JSON.stringify(bullet.score_breakdown, null, 2)}
                                                        </pre>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
