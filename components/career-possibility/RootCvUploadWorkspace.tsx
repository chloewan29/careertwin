"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CareerMapCapabilityDefinition } from "@/lib/career-possibility/reviewed-resume-evidence-map-adapter";
import { buildProvisionalCareerMapFromFile, type ProvisionalCareerMapFileBuildFailureCode } from "@/lib/career-possibility/build-provisional-career-map-from-file";
import { createCareerCapabilityStructuredInferenceApiProducer } from "@/lib/career-possibility/career-capability-structured-inference-api-producer";
import { readLocalCareerMapState, writeLocalCareerMapState } from "@/lib/career-possibility/local-career-map-storage";

const structuredInferenceProducer = createCareerCapabilityStructuredInferenceApiProducer();

const errors: Record<ProvisionalCareerMapFileBuildFailureCode | "storage_failed", string> = {
  unsupported_file: "Upload a PDF or DOCX file.", file_too_large: "Your CV must be 5 MB or smaller.", password_protected_pdf: "This PDF is password protected and cannot be read.", scanned_or_image_only_pdf: "This PDF does not contain readable text. Upload a text-based PDF or DOCX.", malformed_file: "We could not read this CV. Try another PDF or DOCX.", empty_extracted_text: "We could not read this CV. Try another PDF or DOCX.", evidence_extraction_failed: "We could not read this CV. Try another PDF or DOCX.", no_unambiguous_mappings: "We could not generate reliable capability relationships from this CV. Try a clearer or more detailed CV.", materialization_failed: "We could not generate reliable capability relationships from this CV. Try a clearer or more detailed CV.", unexpected_failure: "We could not read this CV. Try another PDF or DOCX.", storage_failed: "Your Career Map could not be saved in this browser. Your previous Career Map has not been changed.",
};

export function RootCvUploadWorkspace({ capabilityDefinitions, capabilityDefinitionVersion }: { capabilityDefinitions: readonly CareerMapCapabilityDefinition[]; capabilityDefinitionVersion: string }) {
  const router = useRouter(); const inputRef = useRef<HTMLInputElement>(null); const errorRef = useRef<HTMLParagraphElement>(null);
  const [stage, setStage] = useState<"idle" | "reading" | "building">("idle"); const [error, setError] = useState("");
  const [existing, setExisting] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExisting(["loaded", "incompatible_version"].includes(readLocalCareerMapState(capabilityDefinitions, capabilityDefinitionVersion).status));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [capabilityDefinitions, capabilityDefinitionVersion]);
  async function selected(file: File | undefined) {
    if (!file || stage !== "idle") return; setError("");
    const timestamp = new Date().toISOString();
    const built = await buildProvisionalCareerMapFromFile({ file, capabilityDefinitions, capabilityDefinitionVersion, structuredInferenceProducer, createdAt: timestamp, updatedAt: timestamp, onStage: setStage });
    if (built.status === "failure") { setStage("idle"); setError(errors[built.code]); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    const written = writeLocalCareerMapState(built.state, capabilityDefinitions);
    if (!written.ok) { setStage("idle"); setError(errors.storage_failed); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    router.push("/career-map");
  }
  const busy = stage !== "idle";
  return <section aria-labelledby="upload-heading" aria-describedby={error ? "cv-upload-error" : undefined} className="rounded-2xl bg-[#0b1522] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-8">
    <h2 id="upload-heading" className="text-2xl font-semibold tracking-[-0.02em] text-white">Upload your CV</h2>
    <p className="mt-2 text-sm text-cyan-50/65">PDF or DOCX · up to 5 MB</p>
    {existing && <p className="mt-5 text-sm leading-6 text-amber-100/80">Uploading another CV will replace the Career Map stored in this browser.</p>}
    <label className={`mt-7 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-cyan-200 ${busy ? "cursor-wait opacity-60" : ""}`}>
      <span>{busy ? "Processing…" : "Upload CV"}</span><input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void selected(file); }} className="sr-only" />
    </label>
    <div aria-live="polite" aria-atomic="true" className="mt-4 min-h-6 text-sm text-cyan-100/75">{stage === "reading" ? "Reading your CV..." : stage === "building" ? "Building your Career Map..." : ""}</div>
    {error && <p ref={errorRef} id="cv-upload-error" tabIndex={-1} role="alert" className="mt-2 rounded-xl bg-red-950/45 px-4 py-3 text-sm leading-6 text-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200">{error}</p>}
    <p className="mt-5 text-xs leading-5 text-cyan-50/45">Selected professional evidence is processed through CareerTwin&apos;s server and an AI provider to infer capabilities.</p>
  </section>;
}
