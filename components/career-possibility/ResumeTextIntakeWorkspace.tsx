"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ResumeEvidenceReviewWorkspace } from "./ResumeEvidenceReviewWorkspace";
import {
  DEFAULT_TEXT_RESUME_MAX_CHARACTERS,
  type ResumeEvidenceExtractionIssue,
  type ResumeEvidenceExtractionResult,
} from "@/lib/career-possibility/resume-evidence-extraction-contract";
import { extractResumeEvidenceFromText } from "@/lib/career-possibility/resume-evidence-text-extractor";
import {
  RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  type ResumeEvidenceReviewSession,
} from "@/lib/career-possibility/resume-evidence-review-contract";
import type { CareerMapCapabilityDefinition } from "@/lib/career-possibility/reviewed-resume-evidence-map-adapter";
import {
  buildBrowserResumeSharedIngestionRuntime,
  createBrowserResumeRuntimeIdentity,
  type BrowserResumeRuntimeIdentity,
  type SharedBundleRuntimeState,
} from "@/lib/career-possibility/browser-resume-shared-ingestion-runtime";
import { readLocalCareerMapState } from "@/lib/career-possibility/local-career-map-storage";

type Props = {
  parserVersion: string;
  normalisationVersion: string;
  capabilityDefinitions: readonly CareerMapCapabilityDefinition[];
  capabilityDefinitionVersion: string;
  entryMode?: "standalone" | "root";
  navigateToCareerMapOnApply?: boolean;
};
type Stage = "paste" | "inspect" | "review";

function newSessionId() {
  return crypto.randomUUID();
}
function candidateIndex(path: string) {
  const match = /^evidenceRecords\[(\d+)\]/.exec(path);
  return match ? Number(match[1]) : undefined;
}

export function ResumeTextIntakeWorkspace({
  parserVersion,
  normalisationVersion,
  capabilityDefinitions,
  capabilityDefinitionVersion,
  entryMode = "standalone",
  navigateToCareerMapOnApply = false,
}: Props) {
  const router = useRouter();
  const [intakeSessionId, setIntakeSessionId] = useState(newSessionId);
  const [runSequence, setRunSequence] = useState(0);
  const [stage, setStage] = useState<Stage>("paste");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ResumeEvidenceExtractionResult | null>(
    null,
  );
  const [reviewSession, setReviewSession] =
    useState<ResumeEvidenceReviewSession | null>(null);
  const [issues, setIssues] = useState<ResumeEvidenceExtractionIssue[]>([]);
  const [sharedBundleState, setSharedBundleState] =
    useState<SharedBundleRuntimeState>({ status: "idle" });
  const runtimeIdentityRef = useRef<BrowserResumeRuntimeIdentity | null>(null);
  const [announcement, setAnnouncement] = useState("Paste stage ready.");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [hasExistingCareerMap, setHasExistingCareerMap] = useState(false);

  useEffect(() => {
    const existing = readLocalCareerMapState(capabilityDefinitions, capabilityDefinitionVersion);
    setHasExistingCareerMap(existing.status === "loaded" || existing.status === "incompatible_version");
  }, [capabilityDefinitions, capabilityDefinitionVersion]);

  function extractEvidence() {
    runtimeIdentityRef.current ??= createBrowserResumeRuntimeIdentity();
    const nextRun = runSequence + 1;
    const extracted = extractResumeEvidenceFromText({
      text,
      documentId: `intake:${intakeSessionId}:document`,
      bundleId: `intake:${intakeSessionId}:bundle`,
      extractionRunId: `intake:${intakeSessionId}:run:${nextRun}`,
      parserVersion,
      normalisationVersion,
    });
    setRunSequence(nextRun);
    setResult(extracted);
    setReviewSession(null);
    setSharedBundleState({ status: "idle" });
    if (!extracted.ok) {
      setIssues(extracted.issues);
      setAnnouncement("Extraction could not start.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setIssues([]);
    setStage("inspect");
    setAnnouncement("Inspection stage ready.");
    requestAnimationFrame(() => summaryRef.current?.focus());
  }
  function continueToReview() {
    if (!result?.ok || result.bundle.evidenceRecords.length === 0) return;
    setReviewSession({
      schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
      id: `review:${intakeSessionId}`,
      sourceBundleId: result.bundle.id,
      sourceSchemaVersion: result.bundle.schemaVersion,
      capabilityDefinitionVersion,
      status: "not_started",
      decisions: [],
      warnings: [],
    });
    setStage("review");
    setAnnouncement("Evidence and capability review ready.");
  }
  function startOver() {
    runtimeIdentityRef.current = null;
    setIntakeSessionId(newSessionId());
    setRunSequence(0);
    setStage("paste");
    setText("");
    setResult(null);
    setReviewSession(null);
    setIssues([]);
    setSharedBundleState({ status: "idle" });
    setAnnouncement("New paste session ready.");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }
  async function completeReview({
    reviewedEvidenceBundle,
    reviewSession: completedSession,
  }: {
    reviewedEvidenceBundle: Parameters<typeof buildBrowserResumeSharedIngestionRuntime>[0]["reviewedEvidenceBundle"];
    reviewSession: ResumeEvidenceReviewSession;
  }) {
    if (!result?.ok) return false;
    const identity = runtimeIdentityRef.current ?? createBrowserResumeRuntimeIdentity();
    runtimeIdentityRef.current = identity;
    setSharedBundleState({ status: "building" });
    const nextState = await buildBrowserResumeSharedIngestionRuntime({
      canonicalResumeText: result.bundle.sourceSpans[0]?.originalText ?? "",
      extractedBundle: result.bundle,
      extractionMetadata: result.metadata,
      reviewedEvidenceBundle,
      reviewSession: completedSession,
      capabilityRegistryVersion: capabilityDefinitionVersion,
      identity,
    });
    setSharedBundleState(nextState);
    return nextState.status === "ready";
  }

  return (
    <section className={entryMode === "root" ? "mt-6" : "mt-8"} aria-labelledby="intake-workspace-heading">
      <h2 id="intake-workspace-heading" className="sr-only">
        Text résumé intake workspace
      </h2>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {entryMode === "root" && hasExistingCareerMap && (
        <div className="mb-5 rounded-xl border border-teal-300/20 bg-teal-300/[0.05] p-4 text-sm text-teal-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-teal-100">You already have a Career Map</p>
              <p className="mt-1 text-xs leading-5 text-teal-100/70">You can return to it now. Applying a different reviewed résumé below will replace its current evidence.</p>
            </div>
            <Link href="/career-map" className="min-h-11 shrink-0 rounded-lg border border-teal-300/25 px-4 py-3 text-center text-sm text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200">View current Career Map</Link>
          </div>
        </div>
      )}
      <ol
        aria-label="Intake stages"
        className="grid gap-2 text-sm sm:grid-cols-3"
      >
        {[
          "1. Paste text",
          "2. Inspect extracted evidence",
          "3. Review and map",
        ].map((label, index) => {
          const active =
            ["paste", "inspect", "review"].indexOf(stage) === index;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={`rounded-xl border px-4 py-3 ${active ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-500"}`}
            >
              {label}
            </li>
          );
        })}
      </ol>
      <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-[#08111d] p-4 text-sm leading-6 text-slate-300 sm:p-6">
        <p>
          Résumé text stays in this page. Nothing is uploaded or saved.
          Refreshing or leaving clears this session.
        </p>
        <p className="mt-1 text-slate-400">
          Deterministic extraction only. You explicitly review evidence and
          create every capability mapping.
        </p>
      </div>
      {stage === "paste" && (
        <section
          className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-6"
          aria-labelledby="paste-heading"
        >
          <h3 id="paste-heading" className="text-xl font-semibold">
            Paste plain résumé text
          </h3>
          <p
            id="paste-instructions"
            className="mt-2 text-sm leading-6 text-slate-400"
          >
            Paste inert plain text, then explicitly extract source-preserving
            evidence candidates. No analysis runs while you type.
          </p>
          {issues.length > 0 && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="mt-4 rounded-xl border border-red-300/25 bg-red-300/5 p-4 text-sm text-red-100"
            >
              <p className="font-semibold">Extraction could not continue</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.map((item) => (
                  <li key={`${item.code}:${item.path}`}>
                    {item.code}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <label
            htmlFor="resume-text"
            className="mt-5 block text-sm font-medium"
          >
            Résumé text
          </label>
          <textarea
            ref={textareaRef}
            id="resume-text"
            value={text}
            maxLength={DEFAULT_TEXT_RESUME_MAX_CHARACTERS + 1}
            aria-invalid={issues.length > 0}
            aria-describedby="paste-instructions resume-character-count"
            onChange={(event) => {
              setText(event.target.value);
              setIssues([]);
            }}
            className="mt-2 min-h-72 w-full rounded-xl border border-white/15 bg-black/20 p-4 text-base leading-7 text-slate-100 outline-none focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-200/40"
          />
          <div className="mt-2 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row">
            <p id="resume-character-count" aria-live="polite">
              {text.length.toLocaleString()} /{" "}
              {DEFAULT_TEXT_RESUME_MAX_CHARACTERS.toLocaleString()} characters
            </p>
            <p>
              Maximum {DEFAULT_TEXT_RESUME_MAX_CHARACTERS.toLocaleString()}{" "}
              characters
            </p>
          </div>
          <button
            type="button"
            onClick={extractEvidence}
            className="mt-5 min-h-11 w-full rounded-xl bg-cyan-200 px-5 font-semibold text-slate-950 focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
          >
            Extract evidence
          </button>
        </section>
      )}
      {stage === "inspect" && result?.ok && (
        <InspectionStage
          result={result}
          summaryRef={summaryRef}
          onContinue={continueToReview}
          onStartOver={startOver}
        />
      )}
      {stage === "review" && result?.ok && reviewSession && (
        <>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={startOver}
              className="min-h-11 rounded-xl border border-white/15 px-4 text-sm focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              Start over
            </button>
          </div>
          <ResumeEvidenceReviewWorkspace
            bundle={result.bundle}
            initialSession={reviewSession}
            capabilityDefinitions={capabilityDefinitions}
            capabilityDefinitionVersion={capabilityDefinitionVersion}
            onReviewComplete={completeReview}
            onApplied={navigateToCareerMapOnApply ? () => router.push("/career-map") : undefined}
          />
          {sharedBundleState.status === "building" && (
            <p role="status" className="mt-4 text-sm text-cyan-200">
              Preparing career evidence bundle…
            </p>
          )}
          {sharedBundleState.status === "ready" && (
            <p role="status" className="mt-4 text-sm text-teal-200">
              Career evidence bundle ready · {sharedBundleState.bundle.evidenceRecords.length.toLocaleString()} evidence records · {sharedBundleState.bundle.employmentRecords.length.toLocaleString()} employment records
            </p>
          )}
          {sharedBundleState.status === "failed" && (
            <div role="alert" className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/5 p-4 text-sm text-amber-100">
              <p className="font-semibold">Career evidence bundle could not be prepared.</p>
              <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-xs">
                {sharedBundleState.issues.map((item) => (
                  <li key={`${item.code}:${item.path}`}>{item.code}: {item.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">Your review is unchanged. Apply again to retry.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function InspectionStage({
  result,
  summaryRef,
  onContinue,
  onStartOver,
}: {
  result: Extract<ResumeEvidenceExtractionResult, { ok: true }>;
  summaryRef: React.RefObject<HTMLDivElement | null>;
  onContinue: () => void;
  onStartOver: () => void;
}) {
  const zeroEvidence = result.bundle.evidenceRecords.length === 0;
  const warningByCandidate = new Map<number, ResumeEvidenceExtractionIssue[]>();
  result.warnings.forEach((warning) => {
    const index = candidateIndex(warning.path);
    if (index !== undefined)
      warningByCandidate.set(index, [
        ...(warningByCandidate.get(index) ?? []),
        warning,
      ]);
  });
  const canonicalText = result.bundle.sourceSpans[0]?.originalText ?? "";
  return (
    <section className="mt-5" aria-labelledby="inspection-heading">
      <div
        ref={summaryRef}
        tabIndex={-1}
        className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 outline-none sm:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Canonical segmentation
        </p>
        <h3 id="inspection-heading" className="mt-2 text-2xl font-semibold">
          Inspect extracted evidence
        </h3>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <Summary
            label="Characters"
            value={canonicalText.length.toLocaleString()}
          />
          <Summary
            label="Evidence candidates"
            value={result.bundle.evidenceRecords.length.toString()}
          />
          <Summary label="Warnings" value={result.warnings.length.toString()} />
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          {result.metadata.parserName} · parser {result.metadata.parserVersion}{" "}
          · normalisation {result.metadata.normalisationVersion}
        </p>
      </div>
      {zeroEvidence && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/5 p-4 text-amber-100"
        >
          No reviewable evidence candidates were found.
        </div>
      )}
      <ol
        aria-label="Extracted evidence candidates"
        className="mt-4 grid gap-3"
      >
        {result.bundle.evidenceRecords.map((record, index) => (
          <li
            key={record.id}
            className="rounded-2xl border border-white/10 bg-[#08111d] p-4 sm:p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Candidate {index + 1}
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
              {record.sourceText}
            </p>
            {(warningByCandidate.get(index) ?? []).map((warning) => (
              <p key={warning.code} className="mt-3 text-xs text-amber-100">
                {warning.code === "ambiguous_segmentation"
                  ? "Segmentation needs review"
                  : "Repeated source text retained separately"}
              </p>
            ))}
          </li>
        ))}
      </ol>
      <details className="mt-4 rounded-xl border border-white/10 p-4">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Show canonical full text
        </summary>
        <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
          {canonicalText}
        </pre>
      </details>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={zeroEvidence}
          onClick={onContinue}
          className="min-h-11 rounded-xl bg-cyan-200 px-5 font-semibold text-slate-950 disabled:opacity-40"
        >
          Continue to review and mapping
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="min-h-11 rounded-xl border border-white/15 px-5"
        >
          Start over
        </button>
      </div>
    </section>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-100">{value}</dd>
    </div>
  );
}
