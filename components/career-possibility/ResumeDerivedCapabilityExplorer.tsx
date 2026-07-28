"use client";

import { useId, useState } from "react";
import type {
  CareerCapabilityMapPresentation,
  CareerMapCapabilityNode,
  CareerMapCapabilitySignal,
  CareerMapEvidenceCard,
  CareerMapEvidenceDisplayField,
} from "../../lib/career-possibility/career-capability-map-contract";

type ResumeDerivedCapabilityExplorerProps = {
  presentation: CareerCapabilityMapPresentation;
};

const statusLabels = {
  review_required: "Review needed",
  provisional: "Provisional map",
  reviewed: "Reviewed evidence map",
} as const;

const reviewLabels = {
  confirmed: "Confirmed",
  edited: "Edited",
  unreviewed: "Review needed",
  rejected: "Rejected",
} as const;

const signalLabels = {
  evidence_backed: "Evidence-backed",
  transferable: "Transferable",
  review_required: "Review needed",
  possible: "Possible mapping",
  unmapped: "Not mapped yet",
} as const;

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function capabilitySemantic(node: CareerMapCapabilityNode) {
  const { directEvidenceCount: direct, transferableEvidenceCount: transferable, reviewRequiredCount: review } = node.evidenceBasis;
  if (direct > 0 && transferable > 0) return "evidence-backed and transferable";
  if (direct > 0) return "evidence-backed";
  if (transferable > 0) return "transferable";
  if (review > 0) return "review needed";
  return "no active evidence";
}

function primarySignal(signals: readonly CareerMapCapabilitySignal[]) {
  const ranks: Record<CareerMapCapabilitySignal["type"], number> = {
    evidence_backed: 0,
    transferable: 1,
    review_required: 2,
    possible: 3,
    unmapped: 4,
  };
  return [...signals].sort((a, b) => {
    const activity = Number(b.active) - Number(a.active);
    return activity || ranks[a.type] - ranks[b.type];
  })[0];
}

function fieldBadge(field: CareerMapEvidenceDisplayField) {
  if (field.reviewStatus === "edited") return "Edited";
  if (field.provenance === "model_inferred") {
    if (field.reviewStatus === "confirmed") return "AI-inferred — reviewed";
    return field.reviewStatus === "rejected" ? "AI-inferred — rejected" : "AI-inferred — review needed";
  }
  if (field.provenance === "normalised") return "Cleaned example evidence";
  return "Example résumé evidence";
}

function outcomeSummary(card: CareerMapEvidenceCard) {
  if (card.outcome.status === "stated") return card.outcome.field.text;
  if (card.outcome.status === "not_stated") return "Outcome not stated";
  return "Outcome absent";
}

export function ResumeDerivedCapabilityExplorer({ presentation }: ResumeDerivedCapabilityExplorerProps) {
  const idPrefix = useId().replace(/:/g, "");
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [showInactiveEvidence, setShowInactiveEvidence] = useState(false);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const capabilityById = new Map(presentation.capabilities.map((capability) => [capability.id, capability]));
  const interpretationById = new Map(presentation.interpretations.map((interpretation) => [interpretation.id, interpretation]));
  const activeEvidence = presentation.evidenceCards.filter((card) => card.active);
  const inactiveEvidence = presentation.evidenceCards.filter((card) => !card.active);
  const visibleEvidence = selectedCapabilityId
    ? activeEvidence.filter((card) => card.capabilitySignals.some((signal) => signal.capabilityId === selectedCapabilityId))
    : activeEvidence;
  const reviewItems = presentation.evidenceCards.flatMap((card) => card.capabilitySignals
    .filter((signal) => signal.type === "review_required" || signal.type === "possible" || signal.type === "unmapped")
    .filter((signal) => signal.reviewStatus !== "rejected")
    .map((signal) => ({ card, signal })));
  const errors = presentation.issues.filter((item) => item.severity === "error");
  const warnings = presentation.issues.filter((item) => item.severity === "warning");
  const infos = presentation.issues.filter((item) => item.severity === "info");
  const directionsUnavailable = !presentation.featureAvailability.futureDirections.available;
  const selectionStatus = selectedCapabilityId
    ? `${capabilityById.get(selectedCapabilityId)?.label ?? "Capability"} selected. ${plural(visibleEvidence.length, "related evidence item")}.`
    : `Showing all ${plural(activeEvidence.length, "active evidence item")}.`;

  function selectCapability(capabilityId: string) {
    setExpandedEvidenceId(null);
    setSelectedCapabilityId((current) => current === capabilityId ? null : capabilityId);
  }

  function clearSelection() {
    setSelectedCapabilityId(null);
    setExpandedEvidenceId(null);
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-cyan-100/10 bg-[#07101c]/90 shadow-[0_30px_140px_rgba(6,182,212,0.08)]" aria-labelledby={`${idPrefix}-network-heading`}>
      <div className="border-b border-cyan-100/[0.08] px-5 py-4 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Résumé-derived capability map</p>
            <h2 id={`${idPrefix}-network-heading`} className="mt-1 text-lg font-semibold text-slate-100">Reviewed evidence and mappings</h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-wider">
            <span className="text-teal-300"><span aria-hidden="true">●</span> Evidence-backed</span>
            <span className="text-blue-300"><span aria-hidden="true">●</span> Transferable</span>
            <span className="text-slate-300"><span aria-hidden="true">○</span> Review needed</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-xs text-slate-300">
          <span className="rounded-full border border-slate-300/15 px-2.5 py-1 font-medium text-slate-100">{statusLabels[presentation.analysisStatus]}</span>
          <span>{plural(presentation.reviewSummary.activeEvidenceCount, "active evidence record")}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{plural(presentation.reviewSummary.reviewRequiredMappingCount, "mapping needs review", "mappings need review")}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{plural(presentation.reviewSummary.proposedCapabilityCount, "unmapped proposal")}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{plural(presentation.reviewSummary.inactiveEvidenceCount, "inactive record")}</span>
          <button type="button" onClick={() => setShowReviewDetails((current) => !current)} aria-expanded={showReviewDetails} aria-controls={`${idPrefix}-review-summary`} className="ml-auto min-h-11 rounded-lg border border-white/10 px-3 text-slate-300 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 motion-reduce:transition-none">{showReviewDetails ? "Hide summary" : "Review summary"}</button>
        </div>
        {showReviewDetails && <ReviewSummary id={`${idPrefix}-review-summary`} presentation={presentation} />}
      </div>

      {errors.length > 0 && <div role="alert" className="border-b border-red-300/20 bg-red-300/[0.06] px-5 py-3 text-sm text-red-100 sm:px-7">{errors.map((item) => <p key={`${item.code}:${item.path}`}>{item.message}</p>)}</div>}
      {warnings.length > 0 && <div className="border-b border-slate-200/10 bg-slate-300/[0.035] px-5 py-3 sm:px-7"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Items needing attention</p><ul className="mt-1.5 grid gap-1 text-xs text-slate-400">{[...new Map(warnings.map((item) => [item.code, item])).values()].map((item) => <li key={item.code}>{item.message}</li>)}</ul></div>}

      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="border-b border-white/[0.06] p-4 sm:p-6 xl:border-b-0 xl:border-r">
          <div className="hidden min-h-[430px] grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] items-center gap-5 rounded-3xl border border-cyan-100/[0.07] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.11),rgba(7,16,28,0.35)_32%,rgba(4,8,16,0.88)_78%)] p-6 md:grid">
            <div className="grid gap-4">{presentation.capabilities.filter((_, index) => index % 2 === 0).map((capability) => <CapabilityButton key={capability.id} capability={capability} selected={capability.id === selectedCapabilityId} onSelect={selectCapability} />)}</div>
            <div className="flex h-36 w-36 flex-col items-center justify-center justify-self-center rounded-full border border-cyan-100/30 bg-[#0a202c]/95 px-3 text-center shadow-[0_0_42px_rgba(34,211,238,0.14)]">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Reviewed capability evidence</span>
              <span className="mt-2 text-xs leading-5 text-slate-300">{plural(presentation.reviewSummary.activeEvidenceCount, "active evidence record")}</span>
            </div>
            <div className="grid gap-4">{presentation.capabilities.filter((_, index) => index % 2 === 1).map((capability) => <CapabilityButton key={capability.id} capability={capability} selected={capability.id === selectedCapabilityId} onSelect={selectCapability} />)}</div>
          </div>

          <div className="md:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Capabilities</p>
            <div className="mt-3 grid gap-3">{presentation.capabilities.map((capability) => <CapabilityButton key={capability.id} capability={capability} selected={capability.id === selectedCapabilityId} onSelect={selectCapability} />)}</div>
          </div>
          <div className="mt-4 flex min-h-11 items-center justify-between gap-3">
            <p className="text-xs text-slate-500" aria-live="polite">{selectionStatus}</p>
            {selectedCapabilityId && <button type="button" onClick={clearSelection} className="min-h-11 shrink-0 rounded-lg border border-white/10 px-3 text-xs text-slate-300 transition-colors hover:border-cyan-200/30 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80">Clear selection</button>}
          </div>
        </div>

        <aside className="min-w-0 p-4 sm:p-6" aria-label="Evidence and review details">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Active evidence</p><h3 className="mt-1 text-base font-semibold text-slate-100">{selectedCapabilityId ? capabilityById.get(selectedCapabilityId)?.label : "All reviewed evidence"}</h3></div>
            <span className="text-xs text-slate-500">{plural(visibleEvidence.length, "item")}</span>
          </div>
          <div className="mt-3 grid gap-3">{visibleEvidence.length > 0 ? visibleEvidence.map((card) => <EvidenceCard key={card.id} card={card} presentation={presentation} capabilityById={capabilityById} interpretationById={interpretationById} expanded={expandedEvidenceId === card.id} onToggle={() => setExpandedEvidenceId((current) => current === card.id ? null : card.id)} idPrefix={idPrefix} />) : <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-slate-500">No active evidence is linked to this capability.</p>}</div>
        </aside>
      </div>

      {reviewItems.length > 0 && <section className="border-t border-white/[0.06] px-5 py-5 sm:px-7" aria-labelledby={`${idPrefix}-review-items-heading`}><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Review queue</p><h3 id={`${idPrefix}-review-items-heading`} className="mt-1 text-base font-semibold text-slate-100">Items needing review</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{reviewItems.map(({ card, signal }) => <div key={`${card.id}:${signal.capabilityId ?? signal.proposedLabel}:${signal.type}`} className="rounded-xl border border-dashed border-slate-300/20 bg-slate-300/[0.025] px-3 py-3"><p className="text-xs font-medium text-slate-200">{signal.capabilityId ? capabilityById.get(signal.capabilityId)?.label ?? signal.capabilityId : signal.proposedLabel}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{signalLabels[signal.type]} · {signal.mappingMethod === "model" ? "AI mapping" : `${signal.mappingMethod} mapping`}</p><p className="mt-1 text-[10px] text-slate-600">Linked to {card.id}</p></div>)}</div></section>}

      {inactiveEvidence.length > 0 && <section className="border-t border-white/[0.06] px-5 py-5 sm:px-7"><button type="button" onClick={() => setShowInactiveEvidence((current) => !current)} aria-expanded={showInactiveEvidence} aria-controls={`${idPrefix}-inactive-evidence`} className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-left text-sm text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/70"><span><span className="font-medium text-slate-200">Inactive and rejected evidence</span><span className="ml-2 text-xs text-slate-500">{inactiveEvidence.length}</span></span><span aria-hidden="true">{showInactiveEvidence ? "−" : "+"}</span></button>{showInactiveEvidence && <div id={`${idPrefix}-inactive-evidence`} className="mt-3 grid gap-3 lg:grid-cols-2">{inactiveEvidence.map((card) => <EvidenceCard key={card.id} card={card} presentation={presentation} capabilityById={capabilityById} interpretationById={interpretationById} expanded={expandedEvidenceId === card.id} onToggle={() => setExpandedEvidenceId((current) => current === card.id ? null : card.id)} idPrefix={idPrefix} inactive />)}</div>}</section>}

      <div className="border-t border-white/[0.06] px-5 py-4 sm:px-7">
        {directionsUnavailable && <p className="rounded-xl border border-blue-200/10 bg-blue-300/[0.025] px-3 py-2.5 text-xs text-slate-400">Career directions are not generated in this preview.</p>}
        {infos.length > 0 && <details className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70">Processing notes ({infos.length})</summary><ul className="pb-2 text-xs leading-5 text-slate-500">{infos.map((item) => <li key={`${item.code}:${item.path}`}>{item.message}</li>)}</ul></details>}
      </div>
    </section>
  );
}

function CapabilityButton({ capability, selected, onSelect }: { capability: CareerMapCapabilityNode; selected: boolean; onSelect: (id: string) => void }) {
  const basis = capability.evidenceBasis;
  const hasDirect = basis.directEvidenceCount > 0;
  const hasTransferable = basis.transferableEvidenceCount > 0;
  const reviewOnly = !hasDirect && !hasTransferable && basis.reviewRequiredCount > 0;
  const accessibleState = capabilitySemantic(capability);
  const activeCount = basis.distinctEvidenceCount;
  return <button type="button" onClick={() => onSelect(capability.id)} aria-pressed={selected} aria-label={`${capability.label}, ${accessibleState}, ${plural(activeCount, "active evidence item")}, ${reviewLabels[capability.reviewStatus]}${basis.reviewRequiredCount ? `, ${plural(basis.reviewRequiredCount, "mapping awaiting review")}` : ""}`} className={`min-h-11 w-full rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 motion-reduce:transition-none ${selected ? "border-cyan-100/60 bg-cyan-300/[0.12] shadow-[0_0_24px_rgba(34,211,238,0.15)]" : reviewOnly ? "border-dashed border-slate-300/25 bg-slate-300/[0.025] hover:border-slate-200/40" : "border-cyan-100/15 bg-[#0b1826] hover:border-cyan-200/30"}`}>
    <span className="flex flex-wrap items-start justify-between gap-2"><span><span className="block text-sm font-semibold text-slate-100">{capability.label}</span>{capability.family && <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-slate-500">{capability.family}</span>}</span>{capability.reviewStatus === "edited" && <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-violet-200">Edited</span>}</span>
    <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider">{hasDirect && <span className="text-teal-300"><span aria-hidden="true">●</span> {plural(basis.directEvidenceCount, "direct item")}</span>}{hasTransferable && <span className="text-blue-300"><span aria-hidden="true">●</span> {plural(basis.transferableEvidenceCount, "transferable item")}</span>}{reviewOnly && <span className="text-slate-400"><span aria-hidden="true">○</span> {plural(basis.reviewRequiredCount, "mapping needs review", "mappings need review")}</span>}</span>
    <span className="mt-2 block text-[10px] leading-4 text-slate-500">{plural(basis.distinctEvidenceCount, "evidence record")} · {plural(basis.distinctEmploymentCount, "employment context")}{basis.coverage ? ` · ${basis.coverage.replaceAll("_", " ")}` : ""}</span>
  </button>;
}

function EvidenceCard({ card, presentation, capabilityById, interpretationById, expanded, onToggle, idPrefix, inactive = false }: { card: CareerMapEvidenceCard; presentation: CareerCapabilityMapPresentation; capabilityById: Map<string, CareerMapCapabilityNode>; interpretationById: Map<string, CareerCapabilityMapPresentation["interpretations"][number]>; expanded: boolean; onToggle: () => void; idPrefix: string; inactive?: boolean }) {
  const signal = primarySignal(card.capabilitySignals);
  const detailId = `${idPrefix}-evidence-${card.id}`;
  const display = card.displayText?.text ?? card.action?.text ?? card.sourceText;
  const badgeField = card.displayText ?? card.action;
  const semantic = inactive ? "Inactive" : signal ? signalLabels[signal.type] : "Not mapped yet";
  return <article className={`min-w-0 rounded-2xl border ${inactive ? "border-white/[0.06] bg-white/[0.015] opacity-80" : signal?.active && signal.type === "evidence_backed" ? "border-teal-300/20 bg-teal-300/[0.035]" : signal?.active && signal.type === "transferable" ? "border-blue-300/20 bg-blue-300/[0.035]" : "border-slate-300/10 bg-slate-300/[0.025]"}`}>
    <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailId} className="min-h-11 w-full rounded-2xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80">
      <span className="flex flex-wrap items-center justify-between gap-2"><span className={`text-[10px] font-semibold uppercase tracking-wider ${inactive ? "text-slate-500" : signal?.active && signal.type === "evidence_backed" ? "text-teal-300" : signal?.active && signal.type === "transferable" ? "text-blue-300" : "text-slate-400"}`}>{semantic}</span>{badgeField && <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-slate-400">{fieldBadge(badgeField)}</span>}</span>
      <span className="mt-2 block break-words text-sm leading-5 text-slate-200">{display}</span>
      {(card.employer || card.roleTitle) && <span className="mt-2 block text-[10px] text-slate-500">{[card.employer?.text, card.roleTitle?.text].filter(Boolean).join(" · ")}</span>}
      <span className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500"><span>{outcomeSummary(card)}</span><span aria-hidden="true" className="shrink-0 text-violet-300/70">{expanded ? "Hide detail −" : "Evidence detail +"}</span></span>
    </button>
    {expanded && <EvidenceDetail id={detailId} card={card} presentation={presentation} capabilityById={capabilityById} interpretationById={interpretationById} />}
  </article>;
}

function EvidenceDetail({ id, card, capabilityById, interpretationById }: { id: string; card: CareerMapEvidenceCard; presentation: CareerCapabilityMapPresentation; capabilityById: Map<string, CareerMapCapabilityNode>; interpretationById: Map<string, CareerCapabilityMapPresentation["interpretations"][number]> }) {
  const interpretations = card.interpretationIds.map((item) => interpretationById.get(item)).filter((item) => item !== undefined);
  const cleanedDiffers = card.displayText && card.displayText.text.trim() !== card.sourceText.trim();
  return <div id={id} className="border-t border-white/[0.06] px-3 pb-4 text-left">
    <DetailSection label="Source evidence"><p>{card.sourceText}</p><FieldMeta label="Example résumé evidence" reviewStatus={card.active ? "Active evidence" : "Inactive evidence"} /></DetailSection>
    {cleanedDiffers && <DetailSection label="Cleaned example evidence"><p>{card.displayText?.text}</p>{card.displayText && <FieldMeta label={fieldBadge(card.displayText)} reviewStatus={reviewLabels[card.displayText.reviewStatus]} />}</DetailSection>}
    {card.action && <DetailSection label="Action"><p>{card.action.text}</p><FieldMeta label={fieldBadge(card.action)} reviewStatus={reviewLabels[card.action.reviewStatus]} /></DetailSection>}
    {card.context && <DetailSection label="Context"><p>{card.context.text}</p><FieldMeta label={fieldBadge(card.context)} reviewStatus={reviewLabels[card.context.reviewStatus]} /></DetailSection>}
    <DetailSection label={card.outcome.status === "stated" ? "Outcome" : outcomeSummary(card)}>{card.outcome.status === "stated" && <><p>{card.outcome.field.text}</p><FieldMeta label={card.outcome.kind === "quantitative" ? "Quantitative" : "Qualitative"} reviewStatus={reviewLabels[card.outcome.field.reviewStatus]} /></>}</DetailSection>
    {card.capabilitySignals.length > 0 && <DetailSection label="Capability mappings"><div className="grid gap-2">{card.capabilitySignals.map((signal, index) => <div key={`${signal.capabilityId ?? signal.proposedLabel}:${signal.type}:${index}`} className={`rounded-lg border px-2.5 py-2 ${signal.active ? "border-white/10 bg-white/[0.025]" : "border-slate-300/10 bg-slate-300/[0.015]"}`}><p className="text-[11px] font-medium text-slate-200">{signal.capabilityId ? capabilityById.get(signal.capabilityId)?.label ?? signal.capabilityId : signal.proposedLabel}</p><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">{signalLabels[signal.type]} · {signal.active ? "Active" : "Inactive"} · {signal.mappingMethod === "model" ? "AI mapping" : `${signal.mappingMethod} mapping`} · {reviewLabels[signal.reviewStatus]}</p></div>)}</div></DetailSection>}
    {interpretations.length > 0 && <DetailSection label="Interpretations"><div className="grid gap-2">{interpretations.map((interpretation) => <div key={interpretation.id} className="rounded-lg border border-violet-300/10 bg-violet-300/[0.025] px-2.5 py-2"><p>{interpretation.text}</p><FieldMeta label={interpretation.provenance === "model_inferred" ? "AI-inferred" : "Derived interpretation"} reviewStatus={`${interpretation.active ? "Active" : "Inactive"} · ${reviewLabels[interpretation.reviewStatus]}`} /></div>)}</div></DetailSection>}
    <DetailSection label="Source references"><p>{plural(card.sourceSpanIds.length, "source reference")}</p>{card.sourceSpanIds.length > 0 && <p className="mt-1 break-all text-[9px] text-slate-600">{card.sourceSpanIds.join(" · ")}</p>}</DetailSection>
    <DetailSection label="Review state"><p>{card.active ? "Active evidence" : "Inactive evidence retained for audit"}</p></DetailSection>
  </div>;
}

function DetailSection({ label, children }: { label: string; children?: React.ReactNode }) {
  return <section className="mt-3 border-t border-white/[0.06] pt-3"><h4 className="text-[9px] font-semibold uppercase tracking-wider text-violet-200/65">{label}</h4>{children && <div className="mt-1.5 break-words text-xs leading-5 text-slate-300">{children}</div>}</section>;
}

function FieldMeta({ label, reviewStatus }: { label: string; reviewStatus: string }) {
  return <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">{label} · {reviewStatus}</p>;
}

function ReviewSummary({ id, presentation }: { id: string; presentation: CareerCapabilityMapPresentation }) {
  const summary = presentation.reviewSummary;
  const rows = [
    ["Active evidence", summary.activeEvidenceCount], ["Inactive evidence", summary.inactiveEvidenceCount],
    ["Confirmed direct mappings", summary.confirmedDirectMappingCount], ["Confirmed transferable mappings", summary.confirmedTransferableMappingCount],
    ["Mappings needing review", summary.reviewRequiredMappingCount], ["Rejected mappings", summary.rejectedMappingCount],
    ["Unmapped evidence", summary.unmappedEvidenceCount], ["Proposed capabilities", summary.proposedCapabilityCount],
  ] as const;
  return <div id={id} className="mt-3 grid gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">{rows.map(([label, value]) => <div key={label} className="bg-[#09131f] px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-200">{value}</p></div>)}</div>;
}
