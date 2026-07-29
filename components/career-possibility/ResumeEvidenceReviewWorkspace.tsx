"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ResumeDerivedCapabilityExplorer } from "./ResumeDerivedCapabilityExplorer";
import type { CareerCapabilityMapPresentation } from "../../lib/career-possibility/career-capability-map-contract";
import { validateCareerCapabilityMapPresentation } from "../../lib/career-possibility/career-capability-map-contract";
import type {
  EvidenceReviewStatus,
  ProvenancedField,
  ResumeEvidenceBundle,
  ResumeEvidenceOutcome,
} from "../../lib/career-possibility/resume-evidence-contract";
import { applyResumeEvidenceReviewDecisions } from "../../lib/career-possibility/resume-evidence-review-apply";
import type {
  EvidenceReviewField,
  ResumeEvidenceReviewDecision,
  ResumeEvidenceReviewIssue,
  ResumeEvidenceReviewSession,
} from "../../lib/career-possibility/resume-evidence-review-contract";
import {
  adaptReviewedResumeEvidenceToCareerMap,
  type CareerMapCapabilityDefinition,
} from "../../lib/career-possibility/reviewed-resume-evidence-map-adapter";
import { buildLocalCareerMapState } from "../../lib/career-possibility/local-career-map-state";
import { readLocalCareerMapState, writeLocalCareerMapState } from "../../lib/career-possibility/local-career-map-storage";

type Props = {
  bundle: ResumeEvidenceBundle;
  initialSession: ResumeEvidenceReviewSession;
  capabilityDefinitions: readonly CareerMapCapabilityDefinition[];
  capabilityDefinitionVersion: string;
};
type Draft =
  | {
      kind: "field";
      field: EvidenceReviewField;
      text: string;
      outcomeKind: "qualitative" | "quantitative";
    }
  | {
      kind: "create-mapping";
      capabilityId: string;
      relationship: "direct_evidence" | "transferable_signal" | "";
      rationale: string;
      search: string;
    }
  | {
      kind: "remap";
      mappingId: string;
      capabilityId: string;
      relationship: "direct_evidence" | "transferable_signal" | "";
      rationale: string;
      search: string;
    }
  | { kind: "interpretation"; interpretationId: string; text: string }
  | { kind: "model-confirm"; mappingId: string; acknowledged: boolean };

const reviewLabel: Record<EvidenceReviewStatus, string> = {
  unreviewed: "Unreviewed",
  confirmed: "Confirmed",
  edited: "Edited",
  rejected: "Rejected",
};
const provenanceLabel: Record<ProvenancedField<unknown>["provenance"], string> =
  {
    user_provided: "User-provided",
    normalised: "Normalised",
    deterministically_derived: "Deterministically derived",
    model_inferred: "AI-inferred",
    unverified_suggestion: "Unverified suggestion",
    mock: "Fictional",
  };
const statusCopy = {
  not_started: "No review decisions yet",
  in_progress: "Review in progress — unresolved items remain",
  completed: "Review pass complete — not externally verified",
} as const;

function logicalTarget(decision: ResumeEvidenceReviewDecision) {
  return `${decision.targetType}:${decision.targetId}${"field" in decision ? `:${decision.field}` : ""}`;
}
function fieldText(field: ProvenancedField<string> | undefined) {
  return field?.value ?? "Not present";
}

export function ResumeEvidenceReviewWorkspace({
  bundle,
  initialSession,
  capabilityDefinitions,
  capabilityDefinitionVersion,
}: Props) {
  const [session, setSession] = useState(() => structuredClone(initialSession));
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(
    bundle.evidenceRecords[0]?.id ?? "",
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState("");
  const [blockingIssues, setBlockingIssues] = useState<
    ResumeEvidenceReviewIssue[]
  >([]);
  const [previewPresentation, setPreviewPresentation] =
    useState<CareerCapabilityMapPresentation | null>(null);
  const [previewDecisionCount, setPreviewDecisionCount] = useState<
    number | null
  >(null);
  const [announcement, setAnnouncement] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [applyStatus, setApplyStatus] = useState<"idle" | "saved">("idle");
  const errorRef = useRef<HTMLDivElement>(null);

  const working = useMemo(
    () =>
      applyResumeEvidenceReviewDecisions({
        bundle,
        session,
        capabilityDefinitions,
        capabilityDefinitionVersion,
      }),
    [bundle, session, capabilityDefinitions, capabilityDefinitionVersion],
  );
  const effectiveBundle = working.ok ? working.reviewedBundle : bundle;
  const effectiveSession = working.ok ? working.session : session;
  const selected = effectiveBundle.evidenceRecords.find(
    (item) => item.id === selectedEvidenceId,
  );
  const employment = selected?.employmentRecordId
    ? effectiveBundle.employmentRecords.find(
        (item) => item.id === selected.employmentRecordId,
      )
    : undefined;
  const mappings = effectiveBundle.capabilityMappings.filter(
    (item) => item.evidenceId === selectedEvidenceId,
  );
  const interpretations = (effectiveBundle.interpretations ?? []).filter(
    (item) => item.evidenceId === selectedEvidenceId,
  );
  const previewCurrent =
    Boolean(previewPresentation) &&
    previewDecisionCount === session.decisions.length;
  const canApply = working.ok && effectiveBundle.capabilityMappings.some((item) => (item.reviewStatus === "confirmed" || item.reviewStatus === "edited") && Boolean(item.capabilityId) && item.relationship !== "possible");
  const nextSequence =
    Math.max(0, ...session.decisions.map((item) => item.sequence)) + 1;

  function latestPrior(target: string) {
    return [...session.decisions]
      .sort((a, b) => b.sequence - a.sequence)
      .find((item) => logicalTarget(item) === target)?.id;
  }
  function meta(
    targetType: ResumeEvidenceReviewDecision["targetType"],
    targetId: string,
    status: EvidenceReviewStatus,
    field?: EvidenceReviewField,
  ) {
    const target = `${targetType}:${targetId}${field ? `:${field}` : ""}`;
    const priorDecisionId = latestPrior(target);
    return {
      id: `review:${session.id}:decision:${nextSequence}`,
      sequence: nextSequence,
      actor: "user" as const,
      targetId,
      expectedReviewStatus: status,
      ...(priorDecisionId ? { priorDecisionId } : {}),
    };
  }
  function saveDecision(
    decision: ResumeEvidenceReviewDecision,
    message: string,
  ) {
    const candidate = {
      ...session,
      decisions: [...session.decisions, decision],
    };
    const result = applyResumeEvidenceReviewDecisions({
      bundle,
      session: candidate,
      capabilityDefinitions,
      capabilityDefinitionVersion,
    });
    if (!result.ok) {
      setBlockingIssues(result.issues);
      setAnnouncement("Decision was not saved.");
      queueMicrotask(() => errorRef.current?.focus());
      return false;
    }
    setSession(result.session);
    setBlockingIssues([]);
    setDraft(null);
    setDraftError("");
    setAnnouncement(`${message}. Preview needs update.`);
    return true;
  }
  function statusAction(
    targetType: "evidence_record" | "capability_mapping" | "interpretation",
    targetId: string,
    status: EvidenceReviewStatus,
    action: "confirm" | "reject" | "restore",
    label: string,
  ) {
    const decision: ResumeEvidenceReviewDecision = {
      ...meta(targetType, targetId, status),
      targetType,
      action,
    };
    saveDecision(decision, label);
  }
  function fieldAction(
    field: EvidenceReviewField,
    status: EvidenceReviewStatus,
    action: "confirm" | "reject" | "restore",
  ) {
    if (!selected) return;
    const decision: ResumeEvidenceReviewDecision = {
      ...meta("evidence_field", selected.id, status, field),
      targetType: "evidence_field",
      field,
      action,
    };
    saveDecision(decision, `${action} ${field}`);
  }
  function saveDraft() {
    if (!selected || !draft) return;
    setDraftError("");
    if (draft.kind === "field") {
      if (!draft.text.trim()) {
        setDraftError("Enter review content before saving.");
        return;
      }
      const current = selected[draft.field];
      const status = current?.reviewStatus ?? "unreviewed";
      const sourceSpanIds = current?.sourceSpanIds.length
        ? current.sourceSpanIds
        : selected.sourceSpanIds;
      const decision: ResumeEvidenceReviewDecision =
        draft.field === "outcome"
          ? {
              ...meta("evidence_field", selected.id, status, draft.field),
              targetType: "evidence_field",
              field: "outcome",
              action: "edit",
              value: { text: draft.text.trim(), kind: draft.outcomeKind },
              sourceSpanIds: [...sourceSpanIds],
            }
          : {
              ...meta("evidence_field", selected.id, status, draft.field),
              targetType: "evidence_field",
              field: draft.field,
              action: "edit",
              value: draft.text.trim(),
              sourceSpanIds: [...sourceSpanIds],
            };
      saveDecision(decision, `${draft.field} edit saved`);
      return;
    }
    if (draft.kind === "create-mapping") {
      if (!draft.capabilityId || !draft.relationship) {
        setDraftError("Choose a capability and relationship.");
        return;
      }
      if (
        selected.reviewStatus !== "confirmed" &&
        selected.reviewStatus !== "edited"
      ) {
        setDraftError(
          "Confirm or edit this evidence before creating a mapping.",
        );
        return;
      }
      const decision: ResumeEvidenceReviewDecision = {
        id: `review:${session.id}:decision:${nextSequence}`,
        sequence: nextSequence,
        actor: "user",
        targetType: "evidence_capability_mapping",
        action: "create",
        targetEvidenceId: selected.id,
        newMappingId: `review:${session.id}:mapping:${nextSequence}`,
        capabilityId: draft.capabilityId,
        relationship: draft.relationship,
        sourceSpanIds: [...selected.sourceSpanIds],
        expectedEvidenceReviewStatus: selected.reviewStatus,
        expectedMappingState: "absent",
        ...(draft.rationale.trim()
          ? { rationale: draft.rationale.trim() }
          : {}),
      };
      saveDecision(decision, "Capability mapping created");
      return;
    }
    if (draft.kind === "remap") {
      if (!draft.capabilityId || !draft.relationship) {
        setDraftError("Choose a capability and relationship.");
        return;
      }
      const mapping = mappings.find((item) => item.id === draft.mappingId);
      if (!mapping) return;
      const decision: ResumeEvidenceReviewDecision = {
        ...meta("capability_mapping", mapping.id, mapping.reviewStatus),
        targetType: "capability_mapping",
        action: "remap",
        newMappingId: `review:${session.id}:mapping:${nextSequence}`,
        capabilityId: draft.capabilityId,
        relationship: draft.relationship,
        sourceSpanIds: [...mapping.sourceSpanIds],
        ...(draft.rationale.trim()
          ? { rationale: draft.rationale.trim() }
          : {}),
      };
      saveDecision(decision, "Mapping remapped");
      return;
    }
    if (draft.kind === "interpretation") {
      if (!draft.text.trim()) {
        setDraftError("Enter interpretation text before saving.");
        return;
      }
      const interpretation = interpretations.find(
        (item) => item.id === draft.interpretationId,
      );
      if (!interpretation) return;
      const decision: ResumeEvidenceReviewDecision = {
        ...meta(
          "interpretation",
          interpretation.id,
          interpretation.reviewStatus,
        ),
        targetType: "interpretation",
        action: "edit",
        newInterpretationId: `review:${session.id}:interpretation:${nextSequence}`,
        text: draft.text.trim(),
        sourceSpanIds: [...interpretation.sourceSpanIds],
      };
      saveDecision(decision, "Interpretation replacement saved");
      return;
    }
    if (!draft.acknowledged) {
      setDraftError("Acknowledge that the AI mapping origin is retained.");
      return;
    }
    const mapping = mappings.find((item) => item.id === draft.mappingId);
    if (mapping)
      statusAction(
        "capability_mapping",
        mapping.id,
        mapping.reviewStatus,
        "confirm",
        "AI mapping confirmed",
      );
  }
  function updatePreview() {
    const applied = applyResumeEvidenceReviewDecisions({
      bundle,
      session,
      capabilityDefinitions,
      capabilityDefinitionVersion,
    });
    if (!applied.ok) {
      setBlockingIssues(applied.issues);
      setAnnouncement("Preview could not be updated.");
      return;
    }
    const adapted = adaptReviewedResumeEvidenceToCareerMap({
      bundle: applied.reviewedBundle,
      capabilityDefinitions,
    });
    if (!adapted.ok) {
      setBlockingIssues(adapted.issues.map((item) => ({ ...item })));
      setAnnouncement("Preview could not be updated.");
      return;
    }
    const validation = validateCareerCapabilityMapPresentation(
      adapted.presentation,
    );
    if (!validation.valid) {
      setBlockingIssues(validation.issues.map((item) => ({ ...item })));
      setAnnouncement("Preview could not be updated.");
      return;
    }
    setPreviewPresentation(adapted.presentation);
    setPreviewDecisionCount(session.decisions.length);
    setBlockingIssues([]);
    setAnnouncement("Preview updated.");
  }
  function applyToCareerMap() {
    const applied = applyResumeEvidenceReviewDecisions({ bundle, session, capabilityDefinitions, capabilityDefinitionVersion });
    if (!applied.ok) { setBlockingIssues(applied.issues); return; }
    const existing = readLocalCareerMapState(capabilityDefinitions, capabilityDefinitionVersion);
    if ((existing.status === "loaded" || existing.status === "incompatible_version") && !window.confirm("Replace the existing imported Career Map evidence? This replaces the prior reviewed résumé import stored in this browser.")) return;
    const timestamp = new Date().toISOString();
    const built = buildLocalCareerMapState({ bundle: applied.reviewedBundle, definitions: capabilityDefinitions, definitionVersion: capabilityDefinitionVersion, importedAt: timestamp, updatedAt: timestamp });
    if (!built.ok) { setBlockingIssues(built.issues.map((item) => ({ ...item, severity: "error" as const }))); setAnnouncement("Reviewed evidence could not be applied."); return; }
    const written = writeLocalCareerMapState(built.state, capabilityDefinitions);
    if (!written.ok) { setBlockingIssues([{ code: written.status, path: "localStorage", message: written.message, severity: "error" }]); return; }
    setApplyStatus("saved"); setBlockingIssues([]); setAnnouncement("Reviewed evidence applied to Career Map in this browser.");
  }
  function selectEvidence(id: string) {
    if (draft) {
      setDraftError(
        "Cancel the current draft before selecting different evidence.",
      );
      return;
    }
    setSelectedEvidenceId(id);
    setAnnouncement("Evidence selection changed.");
  }

  return (
    <section className="py-8" aria-labelledby="review-workspace-heading">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#09131f] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            In-memory review session
          </p>
          <h2
            id="review-workspace-heading"
            className="mt-1 text-xl font-semibold"
          >
            {statusCopy[effectiveSession.status]}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 px-3 py-2">
            {session.decisions.length} decisions
          </span>
          <span
            className={`rounded-full border px-3 py-2 ${previewCurrent ? "border-teal-300/25 text-teal-200" : "border-amber-300/25 text-amber-200"}`}
          >
            {!previewPresentation
              ? "Preview not generated yet"
              : previewCurrent
                ? "Preview up to date"
                : "Preview needs update"}
          </span>
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {(blockingIssues.length > 0 || !working.ok) && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-xl border border-red-300/25 bg-red-300/[0.06] p-4 text-sm text-red-100"
        >
          <p className="font-semibold">Review action needs attention</p>
          {(blockingIssues.length
            ? blockingIssues
            : working.ok
              ? []
              : working.issues
          ).map((item) => (
            <p key={`${item.code}:${item.path}`} className="mt-1">
              {item.code}: {item.message}
              {item.code === "stale_review_status"
                ? " Refresh review state before trying again."
                : ""}
            </p>
          ))}
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          aria-labelledby="evidence-queue-heading"
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
        >
          <h3
            id="evidence-queue-heading"
            className="px-2 py-2 text-sm font-semibold"
          >
            Evidence queue
          </h3>
          <ul className="grid gap-2">
            {effectiveBundle.evidenceRecords.map((record) => {
              const job = record.employmentRecordId
                ? effectiveBundle.employmentRecords.find(
                    (item) => item.id === record.employmentRecordId,
                  )
                : undefined;
              const recordMappings = effectiveBundle.capabilityMappings.filter(
                (item) => item.evidenceId === record.id,
              );
              const unresolved = recordMappings.filter(
                (item) => item.reviewStatus === "unreviewed",
              ).length;
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    aria-current={
                      selectedEvidenceId === record.id ? "true" : undefined
                    }
                    onClick={() => selectEvidence(record.id)}
                    className={`min-h-11 w-full rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${selectedEvidenceId === record.id ? "border-cyan-300/40 bg-cyan-300/[0.08]" : "border-white/[0.07] bg-black/10"}`}
                  >
                    <span className="block break-words text-sm text-slate-200">
                      {record.sourceText}
                    </span>
                    <span className="mt-2 block text-[10px] text-slate-500">
                      {job?.employerName?.value ?? "Employer not stated"} ·{" "}
                      {job?.roleTitle?.value ?? "Role not stated"}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
                      <span>{reviewLabel[record.reviewStatus]}</span>
                      <span>{recordMappings.length} mappings</span>
                      <span>{unresolved} unresolved</span>
                      <span>
                        {record.outcome
                          ? record.outcome.value.kind.replace("_", " ")
                          : "outcome absent"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section
          aria-labelledby="evidence-detail-heading"
          className="min-w-0 rounded-2xl border border-white/10 bg-[#08111d] p-4 sm:p-6"
        >
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300">
                    Selected evidence
                  </p>
                  <h3
                    id="evidence-detail-heading"
                    className="mt-1 text-lg font-semibold"
                  >
                    {employment?.roleTitle?.value ?? "Evidence detail"}
                  </h3>
                </div>
                <ActionButtons
                  label="evidence record"
                  status={selected.reviewStatus}
                  onAction={(action) =>
                    statusAction(
                      "evidence_record",
                      selected.id,
                      selected.reviewStatus,
                      action,
                      `${action} evidence record`,
                    )
                  }
                />
              </div>
              <DetailBlock title="Source evidence — read only">
                <p className="break-words text-sm leading-6 text-slate-300">
                  {selected.sourceText}
                </p>
                <Meta>
                  {selected.sourceSpanIds.length} source references ·
                  Résumé-extracted
                </Meta>
              </DetailBlock>
              {(["displayText", "action", "context", "outcome"] as const).map(
                (field) => (
                  <FieldSection
                    key={field}
                    field={field}
                    record={selected}
                    draft={draft}
                    setDraft={setDraft}
                    onAction={fieldAction}
                  />
                ),
              )}
              <DetailBlock title="Capability mappings">
                <div className="grid gap-3">
                  {mappings.length ? (
                    mappings.map((mapping) => {
                      const definition = mapping.capabilityId
                        ? capabilityDefinitions.find(
                            (item) => item.id === mapping.capabilityId,
                          )
                        : undefined;
                      const label =
                        definition?.label ??
                        mapping.capabilityId ??
                        mapping.proposedLabel ??
                        "Unmapped suggestion";
                      return (
                        <article
                          key={mapping.id}
                          className="rounded-xl border border-white/[0.08] p-3"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{label}</p>
                              {definition?.family && (
                                <p className="mt-1 text-xs text-cyan-200">
                                  {definition.family}
                                </p>
                              )}
                              <Meta>
                                {mapping.relationship.replace("_", " ")} ·{" "}
                                {mapping.method === "model"
                                  ? "AI mapping"
                                  : mapping.method === "user"
                                    ? "User-created mapping"
                                    : "Deterministic mapping"}{" "}
                                · {reviewLabel[mapping.reviewStatus]}
                              </Meta>
                            </div>
                            <ActionButtons
                              label="mapping"
                              status={mapping.reviewStatus}
                              hideConfirm={mapping.relationship === "possible"}
                              onAction={(action) =>
                                mapping.method === "model" &&
                                action === "confirm"
                                  ? setDraft({
                                      kind: "model-confirm",
                                      mappingId: mapping.id,
                                      acknowledged: false,
                                    })
                                  : statusAction(
                                      "capability_mapping",
                                      mapping.id,
                                      mapping.reviewStatus,
                                      action,
                                      `${action} mapping`,
                                    )
                              }
                            />
                          </div>
                          {mapping.rationale && (
                            <p className="mt-2 text-xs text-slate-400">
                              {mapping.rationale}
                            </p>
                          )}
                          {mapping.relationship === "possible" && (
                            <p className="mt-2 text-xs text-amber-200">
                              Choose a capability and relationship to remap this
                              suggestion.
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={mapping.reviewStatus === "rejected"}
                            onClick={() =>
                              setDraft({
                                kind: "remap",
                                mappingId: mapping.id,
                                capabilityId: "",
                                relationship: "",
                                rationale: "",
                                search: "",
                              })
                            }
                            className="mt-3 min-h-11 rounded-lg border border-blue-300/20 px-3 text-xs text-blue-200 disabled:opacity-40"
                          >
                            Remap mapping
                          </button>
                        </article>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">No mappings yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={
                    selected.reviewStatus !== "confirmed" &&
                    selected.reviewStatus !== "edited"
                  }
                  onClick={() =>
                    setDraft({
                      kind: "create-mapping",
                      capabilityId: "",
                      relationship: "",
                      rationale: "",
                      search: "",
                    })
                  }
                  className="mt-4 min-h-11 rounded-lg border border-cyan-300/25 px-3 text-sm text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create capability mapping
                </button>
                {selected.reviewStatus !== "confirmed" &&
                  selected.reviewStatus !== "edited" && (
                    <p className="mt-2 text-xs text-amber-200">
                      Confirm or edit the evidence before creating a mapping.
                    </p>
                  )}
              </DetailBlock>
              <DetailBlock title="Interpretations">
                <div className="grid gap-3">
                  {interpretations.length ? (
                    interpretations.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-xl border border-white/[0.08] p-3"
                      >
                        <p className="break-words text-sm text-slate-300">
                          {item.text}
                        </p>
                        <Meta>
                          {item.kind.replace("_", " ")} ·{" "}
                          {item.provenance === "model_inferred"
                            ? "AI-inferred"
                            : item.provenance === "user_provided"
                              ? "User-provided"
                              : "Deterministically derived"}{" "}
                          · {reviewLabel[item.reviewStatus]} ·{" "}
                          {item.sourceSpanIds.length} references
                        </Meta>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ActionButtons
                            label="interpretation"
                            status={item.reviewStatus}
                            onAction={(action) =>
                              statusAction(
                                "interpretation",
                                item.id,
                                item.reviewStatus,
                                action,
                                `${action} interpretation`,
                              )
                            }
                          />
                          <button
                            type="button"
                            disabled={item.reviewStatus === "rejected"}
                            onClick={() =>
                              setDraft({
                                kind: "interpretation",
                                interpretationId: item.id,
                                text: item.text,
                              })
                            }
                            className="min-h-11 rounded-lg border border-violet-300/20 px-3 text-xs text-violet-200 disabled:opacity-40"
                          >
                            Edit interpretation
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No interpretations linked to this evidence.
                    </p>
                  )}
                </div>
              </DetailBlock>
              {draft && (
                <DraftEditor
                  draft={draft}
                  setDraft={setDraft}
                  error={draftError}
                  setError={setDraftError}
                  capabilityDefinitions={capabilityDefinitions}
                  onSave={saveDraft}
                  onCancel={() => {
                    setDraft(null);
                    setDraftError("");
                    setAnnouncement("Draft cancelled.");
                  }}
                />
              )}
              <DetailBlock title="Review history">
                <button
                  type="button"
                  aria-expanded={historyOpen}
                  onClick={() => setHistoryOpen((value) => !value)}
                  className="min-h-11 rounded-lg border border-white/10 px-3 text-sm"
                >
                  {historyOpen ? "Hide review history" : "Show review history"}
                </button>
                {historyOpen && (
                  <ol className="mt-3 grid gap-2">
                    {session.decisions
                      .filter(
                        (item) =>
                          item.targetId === selected.id ||
                          mappings.some(
                            (mapping) => mapping.id === item.targetId,
                          ) ||
                          interpretations.some(
                            (interpretation) =>
                              interpretation.id === item.targetId,
                          ),
                      )
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((item) => (
                        <li
                          key={item.id}
                          className="rounded-lg bg-white/[0.03] p-2 text-xs text-slate-400"
                        >
                          #{item.sequence} · {item.action} ·{" "}
                          {item.targetType.replace("_", " ")} · {item.actor}
                          {item.reason ? ` · ${item.reason}` : ""}
                        </li>
                      ))}
                  </ol>
                )}
              </DetailBlock>
            </>
          ) : (
            <p id="evidence-detail-heading" className="text-slate-400">
              Select evidence to review.
            </p>
          )}
        </section>
      </div>
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Career Map preview</p>
          <p className="mt-1 text-xs text-slate-500">
            Only saved decisions are included. Draft edits remain excluded.
          </p>
        </div>
        <button
          type="button"
          onClick={updatePreview}
          className="min-h-11 rounded-xl bg-cyan-200 px-5 font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Update preview
        </button>
      </div>
      {previewPresentation && (
        <div className="mt-6">
          <ResumeDerivedCapabilityExplorer presentation={previewPresentation} />
        </div>
      )}
      <div className="mt-6 rounded-2xl border border-teal-300/20 bg-teal-300/[0.04] p-4">
        <p className="text-sm font-semibold">Apply reviewed evidence</p><p className="mt-1 text-xs text-slate-400">Stores reviewed canonical mappings and their evidence text in this browser, not the full pasted résumé.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!canApply} onClick={applyToCareerMap} className="min-h-11 rounded-xl bg-teal-200 px-5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Apply reviewed evidence to Career Map</button>{applyStatus === "saved" && <Link href="/career-map" className="min-h-11 rounded-xl border border-teal-300/25 px-5 py-3 text-sm text-teal-200">View Career Map</Link>}</div>
        {!canApply && <p className="mt-2 text-xs text-amber-200">Review evidence and create at least one canonical mapping before applying.</p>}
        {applyStatus === "saved" && <p className="mt-3 text-sm text-teal-200">Applied successfully. Stored only in this browser.</p>}
      </div>
    </section>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-white/[0.07] pt-5">
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Meta({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
      {children}
    </p>
  );
}
function ActionButtons({
  label,
  status,
  onAction,
  hideConfirm = false,
}: {
  label: string;
  status: EvidenceReviewStatus;
  onAction: (action: "confirm" | "reject" | "restore") => void;
  hideConfirm?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "rejected" ? (
        <button
          type="button"
          onClick={() => onAction("restore")}
          className="min-h-11 rounded-lg border border-blue-300/20 px-3 text-xs"
        >
          Restore {label}
        </button>
      ) : (
        <>
          {status === "unreviewed" && !hideConfirm && (
            <button
              type="button"
              onClick={() => onAction("confirm")}
              className="min-h-11 rounded-lg border border-teal-300/20 px-3 text-xs text-teal-200"
            >
              Confirm {label}
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction("reject")}
            className="min-h-11 rounded-lg border border-red-300/15 px-3 text-xs text-red-200"
          >
            Reject {label}
          </button>
        </>
      )}
    </div>
  );
}
function FieldSection({
  field,
  record,
  draft,
  setDraft,
  onAction,
}: {
  field: EvidenceReviewField;
  record: ResumeEvidenceBundle["evidenceRecords"][number];
  draft: Draft | null;
  setDraft: (draft: Draft) => void;
  onAction: (
    field: EvidenceReviewField,
    status: EvidenceReviewStatus,
    action: "confirm" | "reject" | "restore",
  ) => void;
}) {
  const value = record[field];
  const status = value?.reviewStatus ?? "unreviewed";
  const label = field === "displayText" ? "display text" : field;
  const text =
    field === "outcome"
      ? value
        ? (value as ProvenancedField<ResumeEvidenceOutcome>).value.text ||
          "Outcome not stated"
        : "Outcome absent"
      : fieldText(value as ProvenancedField<string> | undefined);
  const provenance = value?.provenance;
  return (
    <DetailBlock
      title={
        field === "displayText"
          ? "Display text"
          : field[0].toUpperCase() + field.slice(1)
      }
    >
      <p className="break-words text-sm text-slate-300">{text}</p>
      <Meta>
        {provenance ? provenanceLabel[provenance] : "Absent"} ·{" "}
        {reviewLabel[status]} · {value?.sourceSpanIds.length ?? 0} references
      </Meta>
      <div className="mt-3 flex flex-wrap gap-2">
        {value && (
          <ActionButtons
            label={label}
            status={status}
            onAction={(action) => onAction(field, status, action)}
          />
        )}
        <button
          type="button"
          disabled={status === "rejected"}
          onClick={() =>
            setDraft({
              kind: "field",
              field,
              text: value
                ? field === "outcome"
                  ? (value as ProvenancedField<ResumeEvidenceOutcome>).value
                      .text
                  : (value as ProvenancedField<string>).value
                : "",
              outcomeKind:
                field === "outcome" &&
                value &&
                (value as ProvenancedField<ResumeEvidenceOutcome>).value
                  .kind !== "not_stated"
                  ? ((value as ProvenancedField<ResumeEvidenceOutcome>).value
                      .kind as "qualitative" | "quantitative")
                  : "qualitative",
            })
          }
          className="min-h-11 rounded-lg border border-violet-300/20 px-3 text-xs text-violet-200 disabled:opacity-40"
        >
          Edit {label}
        </button>
      </div>
      {draft?.kind === "field" && draft.field === field && (
        <p className="mt-2 text-xs text-violet-200">
          Draft open below. Preview remains unchanged.
        </p>
      )}
    </DetailBlock>
  );
}
function DraftEditor({
  draft,
  setDraft,
  error,
  setError,
  capabilityDefinitions,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  error: string;
  setError: (value: string) => void;
  capabilityDefinitions: readonly CareerMapCapabilityDefinition[];
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section
      className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[0.04] p-4"
      aria-labelledby="draft-editor-heading"
    >
      <h4 id="draft-editor-heading" className="font-semibold">
        Unsaved review draft
      </h4>
      {draft.kind === "field" && (
        <>
          <label className="mt-4 block text-xs" htmlFor="draft-field-text">
            {draft.field} review content
          </label>
          <textarea
            id="draft-field-text"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "draft-error" : undefined}
            value={draft.text}
            onChange={(event) => {
              setDraft({ ...draft, text: event.target.value });
              setError("");
            }}
            className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
          />
          {draft.field === "outcome" && (
            <>
              <label className="mt-3 block text-xs" htmlFor="outcome-kind">
                Outcome kind
              </label>
              <select
                id="outcome-kind"
                value={draft.outcomeKind}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    outcomeKind: event.target.value as
                      "qualitative" | "quantitative",
                  })
                }
                className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3"
              >
                <option value="qualitative">Qualitative</option>
                <option value="quantitative">Quantitative</option>
              </select>
              <p className="mt-2 text-xs text-slate-400">
                This outcome will be stored as user-provided review content.
              </p>
            </>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Saved edits become user-provided review content. The original résumé
            evidence remains unchanged.
          </p>
        </>
      )}
      {(draft.kind === "create-mapping" || draft.kind === "remap") && (
        <>
          <label className="mt-4 block text-xs" htmlFor="capability-search">
            Search canonical capabilities
          </label>
          <input
            id="capability-search"
            type="search"
            value={draft.search}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
            placeholder="Search by label or family"
            className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3"
          />
          <label className="mt-3 block text-xs" htmlFor="mapping-capability">
            Canonical capability ({capabilityDefinitions.length} available)
          </label>
          <select
            id="mapping-capability"
            value={draft.capabilityId}
            onChange={(event) => {
              setDraft({ ...draft, capabilityId: event.target.value });
              setError("");
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3"
          >
            <option value="">Choose capability</option>
            {groupDefinitions(capabilityDefinitions, draft.search).map(([family, definitions]) => (
              <optgroup key={family} label={family}>
                {definitions.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.family}</option>)}
              </optgroup>
            ))}
          </select>
          {groupDefinitions(capabilityDefinitions, draft.search).length === 0 && <p className="mt-2 text-xs text-amber-200">No canonical capabilities match this search.</p>}
          <label className="mt-3 block text-xs" htmlFor="mapping-relationship">
            Relationship
          </label>
          <select
            id="mapping-relationship"
            value={draft.relationship}
            onChange={(event) => {
              setDraft({
                ...draft,
                relationship: event.target.value as
                  "" | "direct_evidence" | "transferable_signal",
              });
              setError("");
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3"
          >
            <option value="">Choose relationship</option>
            <option value="direct_evidence">Direct evidence</option>
            <option value="transferable_signal">Transferable signal</option>
          </select>
          <label className="mt-3 block text-xs" htmlFor="mapping-rationale">
            Optional rationale
          </label>
          <textarea
            id="mapping-rationale"
            value={draft.rationale}
            onChange={(event) =>
              setDraft({ ...draft, rationale: event.target.value })
            }
            className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3"
          />
        </>
      )}
      {draft.kind === "interpretation" && (
        <>
          <label className="mt-4 block text-xs" htmlFor="interpretation-text">
            Replacement interpretation
          </label>
          <textarea
            id="interpretation-text"
            value={draft.text}
            onChange={(event) => {
              setDraft({ ...draft, text: event.target.value });
              setError("");
            }}
            className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3"
          />
          <p className="mt-2 text-xs text-slate-400">
            Saving retains the original as rejected and creates a user-provided
            interpretation.
          </p>
        </>
      )}
      {draft.kind === "model-confirm" && (
        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={draft.acknowledged}
            onChange={(event) => {
              setDraft({ ...draft, acknowledged: event.target.checked });
              setError("");
            }}
          />
          I understand this keeps the AI mapping origin.
        </label>
      )}
      {draft.kind === "model-confirm" && (
        <p className="mt-2 text-xs text-slate-400">
          Confirming keeps the AI origin. The current preview policy may still
          keep reviewed AI mappings inactive.
        </p>
      )}
      {error && (
        <p id="draft-error" role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          className="min-h-11 rounded-lg bg-violet-200 px-4 font-semibold text-slate-950"
        >
          Save decision
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-white/10 px-4"
        >
          Cancel draft
        </button>
      </div>
    </section>
  );
}

function groupDefinitions(definitions: readonly CareerMapCapabilityDefinition[], search: string) {
  const query = search.trim().toLocaleLowerCase("en");
  const groups = new Map<string, CareerMapCapabilityDefinition[]>();
  definitions.filter((item) => !query || item.label.toLocaleLowerCase("en").includes(query) || item.family?.toLocaleLowerCase("en").includes(query)).forEach((item) => {
    const family = item.family ?? "Other";
    groups.set(family, [...(groups.get(family) ?? []), item]);
  });
  return [...groups.entries()];
}
