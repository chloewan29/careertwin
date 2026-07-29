"use client";

import { useMemo, useRef, useState } from "react";
import {
  DEFAULT_TEXT_RESUME_MAX_CHARACTERS,
  type ResumeEvidenceExtractionIssue,
  type ResumeEvidenceExtractionResult,
} from "@/lib/career-possibility/resume-evidence-extraction-contract";
import { extractResumeEvidenceFromText } from "@/lib/career-possibility/resume-evidence-text-extractor";
import { applyResumeEvidenceReviewDecisions } from "@/lib/career-possibility/resume-evidence-review-apply";
import {
  RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  type EvidenceFieldReviewDecision,
  type EvidenceReviewField,
  type EvidenceRecordReviewDecision,
  type ResumeEvidenceReviewDecision,
  type ResumeEvidenceReviewSession,
} from "@/lib/career-possibility/resume-evidence-review-contract";
import type {
  EvidenceReviewStatus,
  ProvenancedField,
  ResumeEvidenceBundle,
  ResumeEvidenceOutcome,
} from "@/lib/career-possibility/resume-evidence-contract";

type ResumeTextIntakeWorkspaceProps = {
  parserVersion: string;
  normalisationVersion: string;
};

type Stage = "paste" | "inspect" | "review";
type FieldDraft = {
  evidenceId: string;
  field: EvidenceReviewField;
  text: string;
  outcomeKind: "" | "qualitative" | "quantitative";
};
type DraftErrors = { text?: string; outcomeKind?: string };

const capabilityDefinitionVersion = "text-intake-evidence-review/1";
const emptyCapabilityDefinitions = [] as const;
const reviewStatusLabel: Record<EvidenceReviewStatus, string> = {
  unreviewed: "Unreviewed",
  confirmed: "Confirmed",
  edited: "Edited",
  rejected: "Rejected",
};

function newSessionId() {
  return crypto.randomUUID();
}

function candidateIndex(path: string) {
  const match = /^evidenceRecords\[(\d+)\]/.exec(path);
  return match ? Number(match[1]) : undefined;
}

function fieldText(field: ProvenancedField<string> | undefined) {
  return field?.value ?? "Not stated";
}

export function ResumeTextIntakeWorkspace({ parserVersion, normalisationVersion }: ResumeTextIntakeWorkspaceProps) {
  const [intakeSessionId, setIntakeSessionId] = useState(newSessionId);
  const [runSequence, setRunSequence] = useState(0);
  const [stage, setStage] = useState<Stage>("paste");
  const [text, setText] = useState("");
  const [extractionResult, setExtractionResult] = useState<ResumeEvidenceExtractionResult | null>(null);
  const [acceptedBundle, setAcceptedBundle] = useState<ResumeEvidenceBundle | null>(null);
  const [reviewSession, setReviewSession] = useState<ResumeEvidenceReviewSession | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<FieldDraft | null>(null);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [workspaceIssues, setWorkspaceIssues] = useState<ResumeEvidenceExtractionIssue[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [announcement, setAnnouncement] = useState("Paste stage ready.");
  const summaryRef = useRef<HTMLDivElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const firstErrorRef = useRef<HTMLDivElement>(null);
  const draftTriggerRef = useRef<HTMLButtonElement | null>(null);
  const reviewDetailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const draftTextRef = useRef<HTMLTextAreaElement | null>(null);
  const outcomeKindRef = useRef<HTMLSelectElement | null>(null);

  const working = useMemo(() => {
    if (!acceptedBundle || !reviewSession) return null;
    return applyResumeEvidenceReviewDecisions({
      bundle: acceptedBundle,
      session: reviewSession,
      capabilityDefinitions: emptyCapabilityDefinitions,
      capabilityDefinitionVersion,
    });
  }, [acceptedBundle, reviewSession]);

  const reviewedBundle = working?.ok ? working.reviewedBundle : acceptedBundle;
  const selectedEvidence = reviewedBundle?.evidenceRecords.find((item) => item.id === selectedEvidenceId) ?? reviewedBundle?.evidenceRecords[0];
  const hasDecisions = Boolean(reviewSession?.decisions.length);

  function extractEvidence() {
    const nextRun = runSequence + 1;
    const result = extractResumeEvidenceFromText({
      text,
      documentId: `intake:${intakeSessionId}:document`,
      bundleId: `intake:${intakeSessionId}:bundle`,
      extractionRunId: `intake:${intakeSessionId}:run:${nextRun}`,
      parserVersion,
      normalisationVersion,
    });
    setRunSequence(nextRun);
    setExtractionResult(result);
    setAcceptedBundle(null);
    setReviewSession(null);
    setFieldDraft(null);
    if (!result.ok) {
      setWorkspaceIssues(result.issues);
      setAnnouncement("Extraction could not start. Review the blocking issue.");
      requestAnimationFrame(() => firstErrorRef.current?.focus());
      return;
    }
    setWorkspaceIssues([]);
    setStage("inspect");
    setAnnouncement("Inspection stage ready.");
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  function continueToReview() {
    if (!extractionResult?.ok || extractionResult.bundle.evidenceRecords.length === 0) return;
    const bundle = extractionResult.bundle;
    const session: ResumeEvidenceReviewSession = {
      schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
      id: `review:${intakeSessionId}`,
      sourceBundleId: bundle.id,
      sourceSchemaVersion: bundle.schemaVersion,
      capabilityDefinitionVersion,
      status: "not_started",
      decisions: [],
      warnings: [],
    };
    const initialized = applyResumeEvidenceReviewDecisions({
      bundle,
      session,
      capabilityDefinitions: emptyCapabilityDefinitions,
      capabilityDefinitionVersion,
    });
    if (!initialized.ok) {
      setReviewError(`${initialized.issues[0].code}: ${initialized.issues[0].message}`);
      return;
    }
    setAcceptedBundle(bundle);
    setReviewSession(initialized.session);
    setSelectedEvidenceId(bundle.evidenceRecords[0].id);
    setReviewError("");
    setStage("review");
    setAnnouncement("Evidence review stage ready.");
    requestAnimationFrame(() => reviewHeadingRef.current?.focus());
  }

  function latestDecisionFor(targetType: ResumeEvidenceReviewDecision["targetType"], targetId: string, field?: EvidenceReviewField) {
    return [...(reviewSession?.decisions ?? [])].reverse().find((decision) =>
      decision.targetType === targetType && decision.targetId === targetId && (field === undefined || ("field" in decision && decision.field === field)),
    );
  }

  function applyDecision(decision: ResumeEvidenceReviewDecision) {
    if (!acceptedBundle || !reviewSession) return false;
    const candidateSession = { ...reviewSession, decisions: [...reviewSession.decisions, decision] };
    const result = applyResumeEvidenceReviewDecisions({
      bundle: acceptedBundle,
      session: candidateSession,
      capabilityDefinitions: emptyCapabilityDefinitions,
      capabilityDefinitionVersion,
    });
    if (!result.ok) {
      setReviewError(`${result.issues[0].code}: ${result.issues[0].message}`);
      return false;
    }
    setReviewSession(result.session);
    setReviewError("");
    setAnnouncement("Review decision saved.");
    return true;
  }

  function decisionBase(targetId: string, targetType: ResumeEvidenceReviewDecision["targetType"], field?: EvidenceReviewField) {
    const prior = latestDecisionFor(targetType, targetId, field);
    return {
      id: `decision:${intakeSessionId}:${(reviewSession?.decisions.length ?? 0) + 1}:${crypto.randomUUID()}`,
      sequence: (reviewSession?.decisions.length ?? 0) + 1,
      actor: "user" as const,
      targetId,
      ...(prior ? { priorDecisionId: prior.id } : {}),
    };
  }

  function reviewEvidence(action: "confirm" | "reject" | "restore") {
    if (!selectedEvidence) return;
    const decision: EvidenceRecordReviewDecision = {
      ...decisionBase(selectedEvidence.id, "evidence_record"),
      targetType: "evidence_record",
      action,
      expectedReviewStatus: selectedEvidence.reviewStatus,
    };
    applyDecision(decision);
  }

  function reviewField(field: EvidenceReviewField, action: "confirm" | "reject" | "restore") {
    if (!selectedEvidence) return;
    const current = selectedEvidence[field];
    if (!current) return;
    const decision: EvidenceFieldReviewDecision = {
      ...decisionBase(selectedEvidence.id, "evidence_field", field),
      targetType: "evidence_field",
      field,
      action,
      expectedReviewStatus: current.reviewStatus,
    };
    applyDecision(decision);
  }

  function saveFieldDraft() {
    if (!selectedEvidence || !fieldDraft) return;
    const errors: DraftErrors = {
      ...(!fieldDraft.text.trim() ? { text: "Enter a value before saving this review decision." } : {}),
      ...(fieldDraft.field === "outcome" && !fieldDraft.outcomeKind ? { outcomeKind: "Choose whether this outcome is qualitative or quantitative." } : {}),
    };
    if (errors.text || errors.outcomeKind) {
      setDraftErrors(errors);
      requestAnimationFrame(() => (errors.text ? draftTextRef.current : outcomeKindRef.current)?.focus());
      return;
    }
    const base = {
      ...decisionBase(selectedEvidence.id, "evidence_field", fieldDraft.field),
      targetType: "evidence_field" as const,
      action: "edit" as const,
      expectedReviewStatus: selectedEvidence[fieldDraft.field]?.reviewStatus,
      sourceSpanIds: [...selectedEvidence.sourceSpanIds],
    };
    const outcomeKind = fieldDraft.outcomeKind;
    let decision: EvidenceFieldReviewDecision;
    if (fieldDraft.field === "outcome") {
      if (!outcomeKind) return;
      decision = { ...base, field: "outcome", value: { text: fieldDraft.text.trim(), kind: outcomeKind } };
    } else {
      decision = { ...base, field: fieldDraft.field, value: fieldDraft.text.trim() };
    }
    if (applyDecision(decision)) closeDraftAndFocus();
  }

  function closeDraftAndFocus() {
    setFieldDraft(null);
    setDraftErrors({});
    requestAnimationFrame(() => {
      const trigger = draftTriggerRef.current;
      (trigger?.isConnected ? trigger : reviewDetailHeadingRef.current)?.focus();
    });
  }

  function openFieldDraft(draft: FieldDraft, trigger: HTMLButtonElement) {
    draftTriggerRef.current = trigger;
    setDraftErrors({});
    setFieldDraft(draft);
  }

  function cancelFieldDraft() {
    closeDraftAndFocus();
    setAnnouncement("Draft cancelled.");
  }

  function startOver() {
    if (hasDecisions && !window.confirm("Start over and discard this in-memory evidence review?")) return;
    setIntakeSessionId(newSessionId());
    setRunSequence(0);
    setStage("paste");
    setText("");
    setExtractionResult(null);
    setAcceptedBundle(null);
    setReviewSession(null);
    setSelectedEvidenceId(null);
    setFieldDraft(null);
    setDraftErrors({});
    setWorkspaceIssues([]);
    setReviewError("");
    setAnnouncement("New paste session ready.");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <section className="mt-8" aria-labelledby="intake-workspace-heading">
      <h2 id="intake-workspace-heading" className="sr-only">Text résumé intake workspace</h2>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <ol aria-label="Intake stages" className="grid gap-2 text-sm sm:grid-cols-3">
        {(["1. Paste text", "2. Inspect extracted evidence", "3. Review evidence"] as const).map((label, index) => {
          const active = ["paste", "inspect", "review"].indexOf(stage) === index;
          return <li key={label} aria-current={active ? "step" : undefined} className={`rounded-xl border px-4 py-3 ${active ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-500"}`}>{label}</li>;
        })}
      </ol>

      <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-[#08111d] p-4 text-sm leading-6 text-slate-300 sm:p-6">
        <p>Résumé text stays in this page. Nothing is uploaded or saved. Refreshing or leaving clears this session.</p>
        <p className="mt-1 text-slate-400">Deterministic segmentation only. No capability claims are created automatically.</p>
      </div>

      {stage === "paste" && <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-6" aria-labelledby="paste-heading">
        <h3 id="paste-heading" className="text-xl font-semibold">Paste plain résumé text</h3>
        <p id="paste-instructions" className="mt-2 text-sm leading-6 text-slate-400">Paste inert plain text, then explicitly extract source-preserving evidence candidates. No analysis runs while you type.</p>
        {workspaceIssues.length > 0 && <div ref={firstErrorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-300/5 p-4 text-sm text-red-100">
          <p className="font-semibold">Extraction could not continue</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{workspaceIssues.map((item) => <li key={`${item.code}:${item.path}`}>{item.code}: {item.message}</li>)}</ul>
        </div>}
        <label htmlFor="resume-text" className="mt-5 block text-sm font-medium">Résumé text</label>
        <textarea
          ref={textareaRef}
          id="resume-text"
          value={text}
          maxLength={DEFAULT_TEXT_RESUME_MAX_CHARACTERS + 1}
          aria-invalid={workspaceIssues.length > 0}
          aria-describedby="paste-instructions resume-character-count"
          onChange={(event) => { setText(event.target.value); setWorkspaceIssues([]); }}
          className="mt-2 min-h-72 w-full rounded-xl border border-white/15 bg-black/20 p-4 text-base leading-7 text-slate-100 outline-none focus-visible:border-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-200/40"
        />
        <div className="mt-2 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row">
          <p id="resume-character-count" aria-live="polite">{text.length.toLocaleString()} / {DEFAULT_TEXT_RESUME_MAX_CHARACTERS.toLocaleString()} characters</p>
          <p>Maximum {DEFAULT_TEXT_RESUME_MAX_CHARACTERS.toLocaleString()} characters</p>
        </div>
        <button type="button" onClick={extractEvidence} className="mt-5 min-h-11 w-full rounded-xl bg-cyan-200 px-5 font-semibold text-slate-950 outline-none hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-white sm:w-auto">Extract evidence</button>
      </section>}

      {stage === "inspect" && extractionResult?.ok && <InspectionStage result={extractionResult} summaryRef={summaryRef} onContinue={continueToReview} onStartOver={startOver} reviewError={reviewError} />}

      {stage === "review" && acceptedBundle && reviewSession && reviewedBundle && <section className="mt-5" aria-labelledby="review-heading">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Evidence review only</p><h3 ref={reviewHeadingRef} tabIndex={-1} id="review-heading" className="mt-2 text-2xl font-semibold outline-none">Review extracted evidence</h3><p className="mt-2 text-sm text-slate-400">{reviewSession.status === "not_started" ? "No review decisions yet" : reviewSession.status === "in_progress" ? "Evidence review in progress" : "Evidence review pass complete"}. Capability mapping has not started.</p></div>
          <button type="button" onClick={startOver} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Start over</button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm text-amber-100"><p className="font-semibold">No capability mappings have been created.</p><p className="mt-1 text-amber-100/70">This preview currently supports evidence review only.</p></div>
        {reviewError && <div role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-300/5 p-4 text-sm text-red-100">{reviewError}</div>}
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section aria-labelledby="evidence-list-heading" className="rounded-2xl border border-white/10 bg-[#08111d] p-4"><h4 id="evidence-list-heading" className="font-semibold">Evidence candidates</h4><ul className="mt-3 grid gap-2">{reviewedBundle.evidenceRecords.map((record, index) => <li key={record.id}><button type="button" onClick={() => { setSelectedEvidenceId(record.id); setFieldDraft(null); setDraftErrors({}); }} aria-pressed={selectedEvidence?.id === record.id} className={`min-h-11 w-full rounded-xl border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${selectedEvidence?.id === record.id ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10"}`}><span className="block text-xs text-slate-500">Candidate {index + 1} · {reviewStatusLabel[record.reviewStatus]}</span><span className="mt-1 block line-clamp-3 text-sm text-slate-200">{record.sourceText}</span></button></li>)}</ul></section>
          {selectedEvidence && <EvidenceDetail record={selectedEvidence} session={reviewSession} draft={fieldDraft} draftErrors={draftErrors} draftTextRef={draftTextRef} outcomeKindRef={outcomeKindRef} detailHeadingRef={reviewDetailHeadingRef} setDraft={setFieldDraft} onOpenDraft={openFieldDraft} onCancelDraft={cancelFieldDraft} onRecordAction={reviewEvidence} onFieldAction={reviewField} onSaveDraft={saveFieldDraft} />}
        </div>
      </section>}
    </section>
  );
}

function InspectionStage({ result, summaryRef, onContinue, onStartOver, reviewError }: { result: Extract<ResumeEvidenceExtractionResult, { ok: true }>; summaryRef: React.RefObject<HTMLDivElement | null>; onContinue: () => void; onStartOver: () => void; reviewError: string }) {
  const zeroEvidence = result.bundle.evidenceRecords.length === 0;
  const warningByCandidate = new Map<number, ResumeEvidenceExtractionIssue[]>();
  result.warnings.forEach((warning) => { const index = candidateIndex(warning.path); if (index !== undefined) warningByCandidate.set(index, [...(warningByCandidate.get(index) ?? []), warning]); });
  const canonicalText = result.bundle.sourceSpans[0]?.originalText ?? "";
  return <section className="mt-5" aria-labelledby="inspection-heading">
    <div ref={summaryRef} tabIndex={-1} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 outline-none sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Canonical segmentation</p><h3 id="inspection-heading" className="mt-2 text-2xl font-semibold">Inspect extracted evidence</h3>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="Characters" value={canonicalText.length.toLocaleString()} /><Summary label="Evidence candidates" value={result.bundle.evidenceRecords.length.toString()} /><Summary label="Warnings" value={result.warnings.length.toString()} /></dl>
      <p className="mt-4 text-xs text-slate-500">{result.metadata.parserName} · parser {result.metadata.parserVersion} · normalisation {result.metadata.normalisationVersion}</p>
    </div>
    {zeroEvidence && <div role="alert" className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/5 p-4 text-amber-100"><p className="font-semibold">No reviewable evidence candidates were found.</p><p className="mt-1 text-sm">Revise the pasted text and extract again.</p></div>}
    <ol aria-label="Extracted evidence candidates" className="mt-4 grid gap-3">{result.bundle.evidenceRecords.map((record, index) => <li key={record.id} className="rounded-2xl border border-white/10 bg-[#08111d] p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Candidate {index + 1}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{record.sourceText}</p>{(warningByCandidate.get(index) ?? []).map((warning) => <p key={warning.code} className="mt-3 rounded-lg border border-amber-200/20 bg-amber-200/5 p-3 text-xs text-amber-100">{warning.code === "ambiguous_segmentation" ? "Segmentation needs review" : "Repeated source text retained separately"}</p>)}</li>)}</ol>
    <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Show canonical full text</summary><pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">{canonicalText}</pre></details>
    {reviewError && <div role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-300/5 p-4 text-sm text-red-100">{reviewError}</div>}
    <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" disabled={zeroEvidence} onClick={onContinue} aria-describedby={zeroEvidence ? "continue-disabled-reason" : undefined} className="min-h-11 rounded-xl bg-cyan-200 px-5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Continue to evidence review</button><button type="button" onClick={onStartOver} className="min-h-11 rounded-xl border border-white/15 px-5">Start over</button></div>
    {zeroEvidence && <p id="continue-disabled-reason" className="mt-2 text-xs text-amber-200">Review cannot start without at least one evidence candidate.</p>}
  </section>;
}

function EvidenceDetail({ record, session, draft, draftErrors, draftTextRef, outcomeKindRef, detailHeadingRef, setDraft, onOpenDraft, onCancelDraft, onRecordAction, onFieldAction, onSaveDraft }: { record: ResumeEvidenceBundle["evidenceRecords"][number]; session: ResumeEvidenceReviewSession; draft: FieldDraft | null; draftErrors: DraftErrors; draftTextRef: React.RefObject<HTMLTextAreaElement | null>; outcomeKindRef: React.RefObject<HTMLSelectElement | null>; detailHeadingRef: React.RefObject<HTMLHeadingElement | null>; setDraft: (draft: FieldDraft | null) => void; onOpenDraft: (draft: FieldDraft, trigger: HTMLButtonElement) => void; onCancelDraft: () => void; onRecordAction: (action: "confirm" | "reject" | "restore") => void; onFieldAction: (field: EvidenceReviewField, action: "confirm" | "reject" | "restore") => void; onSaveDraft: () => void }) {
  const history = session.decisions.filter((decision) => decision.targetId === record.id);
  return <section aria-labelledby="evidence-detail-heading" className="min-w-0 rounded-2xl border border-white/10 bg-[#08111d] p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Selected evidence</p><h4 ref={detailHeadingRef} tabIndex={-1} id="evidence-detail-heading" className="mt-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Evidence detail</h4></div><ReviewActions label="evidence" status={record.reviewStatus} onAction={onRecordAction} /></div>
    <section className="mt-5 border-t border-white/10 pt-5"><h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Verbatim source text</h5><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{record.sourceText}</p></section>
    {(["displayText", "action", "context", "outcome"] as const).map((field) => { const value = record[field]; const text = field === "outcome" ? (value as ProvenancedField<ResumeEvidenceOutcome> | undefined)?.value.text ?? "Not stated" : fieldText(value as ProvenancedField<string> | undefined); const status = value?.reviewStatus ?? "unreviewed"; return <section key={field} className="mt-5 border-t border-white/10 pt-5"><h5 className="text-sm font-semibold">{field === "displayText" ? "Display text" : field[0].toUpperCase() + field.slice(1)}</h5><p className="mt-2 break-words text-sm text-slate-300">{text}</p><p className="mt-1 text-xs text-slate-500">{value ? `${reviewStatusLabel[status]} · ${value.provenance}` : "Absent"}</p><div className="mt-3 flex flex-wrap gap-2">{value && <ReviewActions label={field === "displayText" ? "display text" : field} status={status} onAction={(action) => onFieldAction(field, action)} />}<button type="button" disabled={status === "rejected"} onClick={(event) => onOpenDraft({ evidenceId: record.id, field, text: field === "outcome" ? (value as ProvenancedField<ResumeEvidenceOutcome> | undefined)?.value.text ?? "" : (value as ProvenancedField<string> | undefined)?.value ?? "", outcomeKind: field === "outcome" && value && (value as ProvenancedField<ResumeEvidenceOutcome>).value.kind === "quantitative" ? "quantitative" : "qualitative" }, event.currentTarget)} className="min-h-11 rounded-lg border border-violet-300/25 px-3 text-xs text-violet-200 disabled:opacity-40">Edit {field === "displayText" ? "display text" : field}</button></div></section>; })}
    {draft?.evidenceId === record.id && <section className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/5 p-4" aria-labelledby="field-editor-heading"><h5 id="field-editor-heading" className="font-semibold">Edit {draft.field === "displayText" ? "display text" : draft.field}</h5><label htmlFor="field-edit-text" className="mt-3 block text-xs">User-provided review content</label><textarea ref={draftTextRef} id="field-edit-text" value={draft.text} aria-invalid={Boolean(draftErrors.text)} aria-describedby={draftErrors.text ? "field-edit-help field-edit-error" : "field-edit-help"} onChange={(event) => setDraft({ ...draft, text: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm" /><p id="field-edit-help" className="mt-2 text-xs text-slate-500">The verbatim source bundle remains unchanged.</p>{draftErrors.text && <p id="field-edit-error" className="mt-2 text-sm text-red-200">{draftErrors.text}</p>}{draft.field === "outcome" && <><label htmlFor="outcome-kind" className="mt-3 block text-xs">Outcome kind</label><select ref={outcomeKindRef} id="outcome-kind" value={draft.outcomeKind} aria-invalid={Boolean(draftErrors.outcomeKind)} aria-describedby={draftErrors.outcomeKind ? "outcome-kind-help outcome-kind-error" : "outcome-kind-help"} onChange={(event) => setDraft({ ...draft, outcomeKind: event.target.value as FieldDraft["outcomeKind"] })} className="mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-[#101827] px-3"><option value="">Choose outcome kind</option><option value="qualitative">Qualitative</option><option value="quantitative">Quantitative</option></select><p id="outcome-kind-help" className="mt-2 text-xs text-amber-100">This outcome is user-provided and was not extracted automatically.</p>{draftErrors.outcomeKind && <p id="outcome-kind-error" className="mt-2 text-sm text-red-200">{draftErrors.outcomeKind}</p>}</>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onSaveDraft} className="min-h-11 rounded-lg bg-violet-200 px-4 font-semibold text-slate-950">Save decision</button><button type="button" onClick={onCancelDraft} className="min-h-11 rounded-lg border border-white/15 px-4">Cancel</button></div></section>}
    <details className="mt-5 border-t border-white/10 pt-5"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Review history ({history.length})</summary>{history.length ? <ol className="mt-2 grid gap-2">{history.map((decision) => <li key={decision.id} className="rounded-lg bg-white/[0.03] p-3 text-xs text-slate-400">#{decision.sequence} · {decision.action} · {decision.targetType.replace("_", " ")} · {decision.actor}{decision.reason ? ` · ${decision.reason}` : ""}</li>)}</ol> : <p className="text-sm text-slate-500">No decisions for this evidence yet.</p>}</details>
  </section>;
}

function ReviewActions({ label, status, onAction }: { label: string; status: EvidenceReviewStatus; onAction: (action: "confirm" | "reject" | "restore") => void }) {
  return <div className="flex flex-wrap gap-2">{status === "rejected" ? <button type="button" onClick={() => onAction("restore")} className="min-h-11 rounded-lg border border-blue-300/25 px-3 text-xs text-blue-200">Restore {label}</button> : <>{status === "unreviewed" && <button type="button" onClick={() => onAction("confirm")} className="min-h-11 rounded-lg border border-teal-300/25 px-3 text-xs text-teal-200">Confirm {label}</button>}<button type="button" onClick={() => onAction("reject")} className="min-h-11 rounded-lg border border-red-300/20 px-3 text-xs text-red-200">Reject {label}</button></>}</div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/10 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold text-slate-100">{value}</dd></div>;
}
