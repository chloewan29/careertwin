"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getOrCreateProfile } from "@/lib/db/profile";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

interface UploadResult {
    id: string;
    file_name: string;
    text_length: number;
    text_preview: string;
    parsedData?: {
        full_name: string | null;
        current_title: string | null;
        years_experience: number | null;
        skills: string[];
        companies: string[];
        education: string[];
        summary: string | null;
    } | null;
}

export default function UploadPage() {
    const [dragActive, setDragActive] = useState(false);
    const [uploadState, setUploadState] = useState<UploadState>("idle");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    function handleDrag(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    }

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        const file = files[0];
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["pdf", "docx"].includes(ext)) {
            setErrorMessage("Please upload a PDF or DOCX file.");
            setUploadState("error");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage("File must be under 10MB.");
            setUploadState("error");
            return;
        }
        setSelectedFile(file);
        setErrorMessage("");
        setUploadState("idle");
    }

    async function handleUpload() {
        if (!selectedFile) return;

        setUploadState("uploading");
        setErrorMessage("");

        try {
            const profileId = await getOrCreateProfile();

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("profileId", profileId);

            const response = await fetch("/api/parse-resume", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Upload failed");
            }

            setResult(data.resume);
            setUploadState("success");
        } catch (err) {
            setErrorMessage(
                err instanceof Error ? err.message : "Something went wrong"
            );
            setUploadState("error");
        }
    }

    return (
        <div className="min-h-screen pt-24 px-4 pb-12">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                        Upload Your{" "}
                        <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
                            Resume
                        </span>
                    </h1>
                    <p className="text-muted text-lg">
                        Drop in your PDF or DOCX and we&apos;ll extract your career profile
                        instantly.
                    </p>
                </div>

                {/* Success state */}
                {uploadState === "success" && result ? (
                    <Card className="mb-6">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <svg
                                    className="w-8 h-8 text-green-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold mb-2">
                                Resume Uploaded Successfully!
                            </h2>
                            <p className="text-sm text-muted mb-1">{result.file_name}</p>
                            <p className="text-sm text-muted mb-6">
                                Extracted {result.text_length.toLocaleString()} characters of
                                text
                            </p>

                            {/* Text preview */}
                            <div className="text-left bg-surface rounded-xl p-4 mb-6 max-h-48 overflow-y-auto">
                                <p className="text-xs font-medium text-muted mb-2">
                                    Text Preview
                                </p>
                                <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                                    {result.text_preview}
                                    {result.text_length > 500 && "..."}
                                </p>
                            </div>

                            {/* Parser Debug Output (Developer Facing) */}
                            {process.env.NODE_ENV === "development" && result.parsedData && (
                                <div className="text-left bg-surface/50 border border-border rounded-xl p-4 mb-6">
                                    <details>
                                        <summary className="text-xs font-medium text-muted cursor-pointer hover:text-foreground transition-colors outline-none">
                                            Parser Debug Output
                                        </summary>
                                        <div className="mt-3 overflow-x-auto">
                                            <pre className="text-[11px] leading-relaxed text-muted-foreground font-mono">
                                                {JSON.stringify(result.parsedData, null, 2)}
                                            </pre>
                                        </div>
                                    </details>
                                </div>
                            )}

                            <div className="flex gap-3 justify-center">
                                <Button onClick={() => router.push("/dashboard")}>
                                    View Dashboard
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setUploadState("idle");
                                        setSelectedFile(null);
                                        setResult(null);
                                    }}
                                >
                                    Upload Another
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Drop zone */}
                        <Card className="mb-6">
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragActive(false);
                                    handleFiles(e.dataTransfer.files);
                                }}
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted"
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx"
                                    className="hidden"
                                    onChange={(e) => handleFiles(e.target.files)}
                                />

                                {uploadState === "uploading" ? (
                                    <>
                                        <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <p className="text-muted">
                                            Uploading & parsing your resume...
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className="w-12 h-12 mx-auto mb-4 text-muted"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth={1.5}
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                                            />
                                        </svg>
                                        <p className="text-muted mb-2">
                                            Drag & drop your resume here, or
                                        </p>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Browse Files
                                        </Button>
                                        <p className="text-xs text-muted mt-3">
                                            Supports PDF and DOCX · Max 10MB
                                        </p>
                                    </>
                                )}
                            </div>
                        </Card>

                        {/* Selected file + upload button */}
                        {selectedFile && uploadState !== "uploading" && (
                            <Card className="mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <svg
                                                className="w-5 h-5 text-primary-light"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={1.5}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={handleUpload}>
                                        Upload & Parse
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Error message */}
                        {uploadState === "error" && errorMessage && (
                            <Card className="mb-6 border-red-500/30">
                                <div className="flex items-center gap-3 text-red-400">
                                    <svg
                                        className="w-5 h-5 flex-shrink-0"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                        />
                                    </svg>
                                    <p className="text-sm">{errorMessage}</p>
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
