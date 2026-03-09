"use client";

import { useState } from "react";

export default function ParseDebugPage() {
    const [rawText, setRawText] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleParse = async () => {
        if (!rawText.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            // Just simulate a file by passing raw text as a Blob
            const file = new File([rawText], "debug_resume.txt", { type: "text/plain" });
            formData.append("resume", file);

            const res = await fetch("/api/parse-resume", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.statusText}`);
            }

            const data = await res.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-12 px-4 space-y-8 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Parser Debug</h1>
                <p className="text-muted-foreground">Test the unadulterated parsing engine.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Column */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">1. Raw Text</h2>
                    <textarea
                        className="w-full h-[600px] p-4 border rounded-md font-mono text-sm bg-muted/50 focus:bg-background focus:ring-1 focus:outline-none"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="Paste raw resume text here to bypass extraction and test purely the parsing logic..."
                    />
                    <button
                        onClick={handleParse}
                        disabled={loading || !rawText.trim()}
                        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? "Parsing..." : "Parse Raw Text"}
                    </button>
                    {error && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Output Column */}
                <div className="space-y-4 h-[700px] overflow-y-auto border rounded-xl p-6 bg-card">
                    <h2 className="text-lg font-semibold border-b pb-2">2. Parsed Output</h2>

                    {!result && !loading && (
                        <p className="text-muted-foreground text-sm italic">Run parser to see results...</p>
                    )}

                    {loading && (
                        <p className="text-muted-foreground text-sm animate-pulse">Running career engine...</p>
                    )}

                    {result?.parsed && (
                        <div className="space-y-6">
                            {/* Normalized Identity */}
                            <div className="space-y-2">
                                <h3 className="font-medium text-sm text-primary uppercase tracking-wider">Normalized Identity</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-3 rounded-md border">
                                    <div className="font-medium">Name:</div><div className="truncate">{result.parsed.full_name || "null"}</div>
                                    <div className="font-medium">Current Title:</div><div className="truncate text-green-600 dark:text-green-400 font-medium">{result.parsed.current_title || "null"}</div>
                                    <div className="font-medium">Industry:</div><div className="truncate">{result.parsed.industry || "null"}</div>
                                    <div className="font-medium">Experience (yrs):</div><div>{result.parsed.years_experience ?? "null"}</div>
                                </div>
                            </div>

                            {/* Experience Entries */}
                            {result.parsed.experience_entries && result.parsed.experience_entries.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-medium text-sm text-primary uppercase tracking-wider">
                                        Parsed Experience ({result.parsed.experience_entries.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {result.parsed.experience_entries.map((exp: any, i: number) => (
                                            <div key={i} className="border rounded-md hover:border-primary/50 transition-colors">
                                                <div className="bg-muted px-3 py-2 border-b flex justify-between items-center">
                                                    <span className="font-medium text-sm">Entry #{i + 1}</span>
                                                    <span className="text-xs bg-background border px-2 py-0.5 rounded-full text-muted-foreground font-mono">
                                                        conf: {exp.confidence?.overall ?? "?"}
                                                    </span>
                                                </div>
                                                <div className="p-3 text-sm grid grid-cols-12 gap-y-2">
                                                    {/* Normalized Output vs Raw Input representation */}
                                                    <div className="col-span-4 font-medium text-muted-foreground border-r pr-2 my-auto">Title</div>
                                                    <div className="col-span-8 pl-2">
                                                        <div className={`font-medium ${exp.title ? 'text-foreground' : 'text-muted-foreground/50'}`}>{exp.title || "(null)"}</div>
                                                        <div className="text-xs text-muted-foreground">conf: {exp.confidence?.title ?? "?"}</div>
                                                    </div>

                                                    <div className="col-span-4 font-medium text-muted-foreground border-r pr-2 my-auto border-t pt-2">Company</div>
                                                    <div className="col-span-8 pl-2 border-t pt-2">
                                                        <div className={exp.company ? 'text-foreground' : 'text-muted-foreground/50'}>{exp.company || "(null)"}</div>
                                                        <div className="text-xs text-muted-foreground">conf: {exp.confidence?.company ?? "?"}</div>
                                                    </div>

                                                    <div className="col-span-4 font-medium text-muted-foreground border-r pr-2 my-auto border-t pt-2">Date Range</div>
                                                    <div className="col-span-8 pl-2 border-t pt-2">
                                                        <div className="font-mono text-xs">{exp.date_range || "(none)"}</div>
                                                        <div className="text-xs text-muted-foreground">conf: {exp.confidence?.date ?? "?"}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Raw dump */}
                            <div className="space-y-2">
                                <h3 className="font-medium text-sm text-primary uppercase tracking-wider mt-6">Full Raw JSON</h3>
                                <pre className="p-4 bg-muted text-xs font-mono rounded-md overflow-x-auto border">
                                    {JSON.stringify(result.parsed, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
