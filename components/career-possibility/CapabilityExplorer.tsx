"use client";

import { useState, type ReactNode } from "react";
import type { CareerCapabilityExplorerResult } from "./mockCareerPossibility";

type Point = { x: number; y: number };

const corePosition: Point = { x: 39, y: 48 };
const capabilityPositions: Point[] = [
  { x: 18, y: 20 },
  { x: 41, y: 17 },
  { x: 61, y: 31 },
  { x: 59, y: 64 },
  { x: 38, y: 77 },
  { x: 17, y: 60 },
];
const pathPositions: Point[] = [
  { x: 86, y: 19 },
  { x: 86, y: 38 },
  { x: 86, y: 57 },
  { x: 86, y: 76 },
];

const RAIL_START_X = 73;
const PATH_CARD_LEFT_X = 75;
const CONNECTOR_END_X = PATH_CARD_LEFT_X - 1;
const CAPABILITY_RIGHT_EDGE_OFFSET_X = 8;
const CONNECTOR_CORRIDOR_X = 70;
const TOP_CONNECTOR_CORRIDOR_Y = 7;
const BOTTOM_CONNECTOR_CORRIDOR_Y = 89;
const GAP_COLUMN_X = 64;
const GAP_VERTICAL_SPACING = 10;

const toSvgPoint = ({ x, y }: Point) => ({ x: x * 10, y: y * 6.4 });

function connectionPath(from: Point, targetY: number) {
  const start = toSvgPoint({ x: from.x + CAPABILITY_RIGHT_EDGE_OFFSET_X, y: from.y });
  const end = toSvgPoint({ x: CONNECTOR_END_X, y: targetY });
  const corridorY = from.x < 50
    ? (from.y < corePosition.y ? TOP_CONNECTOR_CORRIDOR_Y : BOTTOM_CONNECTOR_CORRIDOR_Y)
    : from.y;
  const corridor = toSvgPoint({ x: CONNECTOR_CORRIDOR_X, y: corridorY });
  return `M ${start.x} ${start.y} C ${start.x + 24} ${start.y}, ${start.x + 36} ${corridor.y}, ${corridor.x} ${corridor.y} Q ${end.x - 24} ${corridor.y}, ${end.x} ${end.y}`;
}

export function CapabilityExplorer({ result }: { result: CareerCapabilityExplorerResult }) {
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [expandedGrowthAreaId, setExpandedGrowthAreaId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const orderedPaths = [...result.adjacentRoles].sort((a, b) => a.rank - b.rank || b.fitScore - a.fitScore);
  const selectedCapability = result.capabilities.find((capability) => capability.id === selectedCapabilityId) ?? null;
  const selectedPath = orderedPaths.find((path) => path.id === selectedPathId) ?? null;
  const selectedCapabilityIndex = selectedCapability
    ? result.capabilities.findIndex((capability) => capability.id === selectedCapability.id)
    : -1;
  const selectedPathIndex = selectedPath ? orderedPaths.findIndex((path) => path.id === selectedPath.id) : -1;
  const selectedCapabilityPosition = selectedCapabilityIndex >= 0 ? capabilityPositions[selectedCapabilityIndex] : null;
  const selectedPathPosition = selectedPathIndex >= 0 ? pathPositions[selectedPathIndex] : null;
  const relatedPaths = selectedCapability
    ? orderedPaths.filter((path) => path.capabilityIds.includes(selectedCapability.id)).slice(0, 3)
    : [];
  const relevantEvidence = selectedPath
    ? result.experiences.filter((experience) => experience.roleIds.includes(selectedPath.id)).slice(0, 2)
    : selectedCapability
      ? result.experiences.filter((experience) => experience.capabilityIds.includes(selectedCapability.id)).slice(0, 2)
      : [];
  const visibleGrowthAreas = selectedPath?.growthAreas.slice(0, 3) ?? [];
  const expandedGrowthArea = visibleGrowthAreas.find((growthArea) => growthArea.id === expandedGrowthAreaId) ?? null;
  const selectedEvidence = relevantEvidence.find((experience) => experience.id === selectedEvidenceId) ?? null;

  function clearSecondaryDisclosures() {
    setExpandedGrowthAreaId(null);
    setSelectedEvidenceId(null);
  }

  function clearPathAndSecondary() {
    setSelectedPathId(null);
    clearSecondaryDisclosures();
  }

  function clearSelection() {
    setSelectedCapabilityId(null);
    clearPathAndSecondary();
  }

  function selectCapability(capabilityId: string) {
    clearPathAndSecondary();
    setSelectedCapabilityId((current) => current === capabilityId ? null : capabilityId);
  }

  function selectPath(pathId: string) {
    setSelectedCapabilityId(null);
    clearSecondaryDisclosures();
    setSelectedPathId((current) => current === pathId ? null : pathId);
  }

  function toggleGrowthArea(growthAreaId: string) {
    setSelectedEvidenceId(null);
    setExpandedGrowthAreaId((current) => current === growthAreaId ? null : growthAreaId);
  }

  function toggleEvidence(evidenceId: string) {
    setExpandedGrowthAreaId(null);
    setSelectedEvidenceId((current) => current === evidenceId ? null : evidenceId);
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-cyan-100/10 bg-[#07101c]/90 shadow-[0_30px_140px_rgba(6,182,212,0.08)] backdrop-blur" aria-labelledby="network-heading">
      <header className="flex flex-col justify-between gap-3 border-b border-cyan-100/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Career capability network</p>
          <h2 id="network-heading" className="mt-1 text-lg font-semibold text-slate-100">Capabilities into future directions</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider">
          <span className="text-teal-300"><span aria-hidden="true">●</span> Evidence-backed</span>
          <span className="text-blue-300"><span aria-hidden="true">●</span> Transferable</span>
          <span className="text-amber-300"><span aria-hidden="true">◆</span> Proof to build</span>
          {(selectedCapability || selectedPath) && <button type="button" onClick={clearSelection} className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition-colors hover:border-cyan-200/30 hover:text-cyan-100">Clear selection</button>}
        </div>
      </header>

      <div className="md:hidden">
        <div className="border-b border-white/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Explore a capability</p>
          <div className="mt-3 flex flex-wrap gap-2">{result.capabilities.map((capability) => {
            const isSelected = capability.id === selectedCapability?.id;
            return <button key={capability.id} type="button" onClick={() => selectCapability(capability.id)} aria-pressed={isSelected} className={`rounded-full border px-3 py-2 text-xs transition-colors ${isSelected ? "border-cyan-200 bg-cyan-300 text-[#061018]" : "border-white/10 bg-white/[0.03] text-slate-300"}`}>{capability.label}</button>;
          })}</div>
        </div>
        <div className="border-b border-white/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Future Paths</p>
          <div className="mt-3 grid gap-2">{orderedPaths.map((path) => {
            const isSelected = path.id === selectedPath?.id;
            const isRelated = Boolean(selectedCapability?.id && path.capabilityIds.includes(selectedCapability.id));
            return <button key={path.id} type="button" onClick={() => selectPath(path.id)} aria-pressed={isSelected} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${isSelected || isRelated ? "border-cyan-200/40 bg-cyan-300/[0.09]" : selectedCapability ? "border-white/[0.06] bg-white/[0.02] opacity-45" : "border-blue-200/15 bg-blue-300/[0.035]"}`}><span><span className="block text-[9px] uppercase tracking-wider text-blue-300">{path.fitLabel}</span><span className="mt-0.5 block text-xs font-medium text-slate-100">{path.roleFamily}</span></span><span className="text-xs text-cyan-200">#{path.rank}</span></button>;
          })}</div>
        </div>
        <MobileDetail result={result} selectedCapability={selectedCapability} selectedPath={selectedPath} evidence={relevantEvidence} growthAreas={visibleGrowthAreas} expandedGrowthAreaId={expandedGrowthAreaId} selectedEvidenceId={selectedEvidenceId} onToggleGrowthArea={toggleGrowthArea} onToggleEvidence={toggleEvidence} />
      </div>

      <div className="relative hidden h-[640px] overflow-hidden bg-[radial-gradient(circle_at_39%_48%,rgba(34,211,238,0.11),rgba(7,16,28,0.3)_30%,rgba(4,8,16,0.94)_76%)] md:block">
        <div style={{ left: `${RAIL_START_X}%` }} className="absolute bottom-0 right-0 top-0 border-l border-blue-200/[0.08] bg-blue-400/[0.025]" />
        <div className="absolute right-[2.5%] top-5 z-20 w-[23%]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300">Future Paths</p>
          <p className="mt-1 text-xs text-slate-500">Ranked directions from demonstrated signals</p>
        </div>
        <svg viewBox="0 0 1000 640" preserveAspectRatio="none" className="absolute inset-0 z-0 h-full w-full" aria-hidden="true">
          <defs>
            <marker id="line-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="#67e8f9" fillOpacity=".75" /></marker>
          </defs>
          {selectedCapabilityPosition && relatedPaths.map((path) => {
            const pathIndex = orderedPaths.findIndex((candidate) => candidate.id === path.id);
            const pathPosition = pathIndex >= 0 ? pathPositions[pathIndex] : null;
            return pathPosition ? <path key={path.id} d={connectionPath(selectedCapabilityPosition, pathPosition.y)} fill="none" stroke="#67e8f9" strokeOpacity=".55" strokeWidth="1.5" markerEnd="url(#line-arrow)" /> : null;
          })}
          {selectedPath && selectedPathPosition && result.capabilities.map((capability, index) => {
            const position = capabilityPositions[index];
            if (!position) return null;
            const backed = selectedPath.capabilityIds.includes(capability.id);
            const partial = selectedPath.partialCapabilityIds.includes(capability.id);
            if (!backed && !partial) return null;
            return <path key={capability.id} d={connectionPath(position, selectedPathPosition.y)} fill="none" stroke={backed ? "#5eead4" : "#60a5fa"} strokeOpacity={backed ? ".58" : ".45"} strokeWidth={backed ? "1.6" : "1.25"} strokeDasharray={partial ? "4 6" : undefined} />;
          })}
        </svg>

        <div style={{ left: `${corePosition.x}%`, top: `${corePosition.y}%` }} className="absolute z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-100/35 bg-[#0a202c]/95 text-center shadow-[0_0_42px_rgba(34,211,238,0.16)]">
          <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Your career</span>
          <span className="mt-1 text-sm font-semibold text-slate-100">Experience Core</span>
        </div>

        {result.capabilities.map((capability, index) => {
          const position = capabilityPositions[index];
          if (!position) return null;
          const isSelected = capability.id === selectedCapability?.id;
          const isBacked = Boolean(selectedPath?.capabilityIds.includes(capability.id));
          const isPartial = Boolean(selectedPath?.partialCapabilityIds.includes(capability.id));
          const isInactive = Boolean(selectedCapability && !isSelected) || Boolean(selectedPath && !isBacked && !isPartial);
          const semanticLabel = isBacked ? "Evidence-backed" : isPartial ? "Transferable signal" : `${capability.strength}% example signal`;
          return <button key={capability.id} type="button" onClick={() => selectCapability(capability.id)} aria-pressed={isSelected} aria-label={`${capability.label}, ${semanticLabel}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} className={`absolute z-20 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 motion-reduce:transition-none ${isSelected ? "border-cyan-100/65 bg-[#12313b] text-white shadow-[0_0_30px_rgba(34,211,238,0.25)]" : isBacked ? "border-teal-200/50 bg-[#12312f] text-white shadow-[0_0_25px_rgba(45,212,191,0.14)]" : isPartial ? "border-blue-300/45 bg-[#142943] text-blue-50" : isInactive ? "border-white/[0.07] bg-[#0b1826] text-slate-500 opacity-35" : "border-cyan-100/15 bg-[#0b1826] text-slate-300 hover:border-cyan-200/30"}`}>
            <span className="block text-xs font-semibold leading-4">{capability.label}</span>
            <span className={`mt-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wider ${isBacked ? "text-teal-300" : isPartial ? "text-blue-300" : "text-cyan-200/70"}`}><span className={`h-1.5 w-1.5 rounded-full ${isBacked ? "bg-teal-300" : isPartial ? "bg-blue-300" : "bg-cyan-300/70"}`} />{semanticLabel}</span>
          </button>;
        })}

        {orderedPaths.map((path, index) => {
          const position = pathPositions[index];
          if (!position) return null;
          const isSelected = path.id === selectedPath?.id;
          const related = Boolean(selectedCapability && path.capabilityIds.includes(selectedCapability.id));
          const dimmed = Boolean(selectedCapability && !related) || Boolean(selectedPath && !isSelected);
          const defaultOpacity = Math.max(.45, 1 - index * .16);
          return <button key={path.id} type="button" onClick={() => selectPath(path.id)} aria-pressed={isSelected} style={{ left: `${position.x}%`, top: `${position.y}%`, opacity: selectedCapability || selectedPath ? undefined : defaultOpacity }} className={`absolute z-30 w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-r-full rounded-l-xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 motion-reduce:transition-none ${isSelected || related ? "border-cyan-200/45 bg-[#102b37] shadow-[0_0_24px_rgba(56,189,248,0.14)]" : dimmed ? "border-white/[0.06] bg-[#09131f] opacity-25" : "border-blue-200/15 bg-[#0b1725] hover:border-blue-200/30"}`}>
            <span className="flex items-center justify-between gap-2"><span className="text-[9px] font-semibold uppercase tracking-wider text-blue-300">#{path.rank} · {path.fitLabel}</span><span aria-hidden="true" className="text-cyan-300">→</span></span>
            <span className="mt-1 block text-xs font-semibold leading-4 text-slate-100">{path.roleFamily}</span>
            {isSelected && <span className="mt-1 block text-[9px] leading-3 text-slate-400">Role Gap Lens active</span>}
          </button>;
        })}

        {(selectedCapability || selectedPath) && <div className="absolute bottom-5 left-[4%] z-30 w-[63%] rounded-2xl border border-violet-200/10 bg-[#07111e]/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3"><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300">Supporting evidence</p><p className="text-[9px] text-slate-500">Mock proof signals</p></div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{relevantEvidence.map((experience) => {
            const isSelected = experience.id === selectedEvidence?.id;
            const contentId = `desktop-evidence-detail-${experience.id}`;
            return <button key={experience.id} type="button" onClick={() => toggleEvidence(experience.id)} aria-expanded={isSelected} aria-controls={contentId} aria-label={`${isSelected ? "Hide" : "Show"} example evidence detail for ${experience.evidenceText}`} className={`rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 motion-reduce:transition-none ${isSelected ? "border-violet-200/40 bg-violet-300/[0.1]" : "border-violet-200/10 bg-violet-300/[0.035] hover:border-violet-200/25"}`}><span className="block text-[11px] leading-4 text-slate-200">{experience.evidenceText}</span><span className="mt-1 flex items-center justify-between gap-2 text-[9px] text-slate-500"><span>{experience.company} · {experience.role}</span><span aria-hidden="true" className="shrink-0 text-violet-300/70">{isSelected ? "Hide −" : "Detail +"}</span></span></button>;
          })}</div>
        </div>}

        {selectedPath && selectedPathPosition && visibleGrowthAreas.map((growthArea, index) => {
          const y = selectedPathPosition.y + (index - (visibleGrowthAreas.length - 1) / 2) * GAP_VERTICAL_SPACING;
          const isExpanded = growthArea.id === expandedGrowthArea?.id;
          const contentId = `desktop-proof-action-${growthArea.id}`;
          return <button key={growthArea.id} type="button" onClick={() => toggleGrowthArea(growthArea.id)} aria-expanded={isExpanded} aria-controls={contentId} aria-label={`${isExpanded ? "Hide" : "Show"} example proof to build for ${growthArea.label}`} style={{ left: `${GAP_COLUMN_X}%`, top: `${y}%` }} className={`absolute z-40 w-32 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-[#2a2113] px-2.5 py-2 text-left shadow-[0_0_18px_rgba(251,191,36,0.08)] transition-[border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 motion-reduce:transition-none ${isExpanded ? "border-amber-200/70 bg-[#352817]" : "border-amber-300/35 hover:border-amber-200/60"}`}><span className="block text-[8px] font-semibold uppercase tracking-wider text-amber-300"><span aria-hidden="true">◆</span> Proof to build</span><span className="mt-1 block text-[10px] leading-3 text-amber-50">{growthArea.label}</span><span aria-hidden="true" className="mt-1 block text-[9px] text-amber-200/70">{isExpanded ? "Hide idea −" : "Show idea +"}</span></button>;
        })}

        {expandedGrowthArea && <article id={`desktop-proof-action-${expandedGrowthArea.id}`} className="absolute left-[3%] top-[26%] z-30 max-h-40 w-[27%] overflow-y-auto rounded-2xl border border-amber-300/25 bg-[#17150f]/95 p-3.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300">Example proof to build</p>
          <p className="mt-2 text-xs leading-5 text-amber-50">{expandedGrowthArea.proofToBuild.trim() || "Example proof idea not available in this preview."}</p>
          {expandedGrowthArea.reason.trim() && <div className="mt-2 border-t border-amber-200/10 pt-2"><p className="text-[9px] font-semibold uppercase tracking-wider text-amber-200/70">Why it matters</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{expandedGrowthArea.reason}</p></div>}
        </article>}

        {selectedEvidence && <div id={`desktop-evidence-detail-${selectedEvidence.id}`} className="absolute left-[3%] top-[26%] z-30 max-h-40 w-[30%] overflow-y-auto rounded-2xl border border-violet-300/25 bg-[#13121d]/95 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
          <EvidenceDetail experience={selectedEvidence} result={result} />
        </div>}
      </div>
    </section>
  );
}

type MobileDetailProps = {
  result: CareerCapabilityExplorerResult;
  selectedCapability: CareerCapabilityExplorerResult["capabilities"][number] | null;
  selectedPath: CareerCapabilityExplorerResult["adjacentRoles"][number] | null;
  evidence: CareerCapabilityExplorerResult["experiences"];
  growthAreas: CareerCapabilityExplorerResult["adjacentRoles"][number]["growthAreas"];
  expandedGrowthAreaId: string | null;
  selectedEvidenceId: string | null;
  onToggleGrowthArea: (growthAreaId: string) => void;
  onToggleEvidence: (evidenceId: string) => void;
};

function MobileDetail({ result, selectedCapability, selectedPath, evidence, growthAreas, expandedGrowthAreaId, selectedEvidenceId, onToggleGrowthArea, onToggleEvidence }: MobileDetailProps) {
  if (!selectedCapability && !selectedPath) return <div className="p-5 text-sm leading-6 text-slate-400">Select a capability to trace supported directions, or choose a Future Path to open its Role Gap Lens.</div>;
  return <div className="p-4">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">{selectedPath ? "Role Gap Lens" : "Capability focus"}</p>
    <h3 className="mt-1 text-lg font-semibold text-slate-100">{selectedPath?.roleFamily ?? selectedCapability?.label}</h3>
    {selectedPath ? <div className="mt-4 grid gap-3">
      <SemanticGroup label="Evidence-backed strengths" tone="teal" ids={selectedPath.capabilityIds} result={result} />
      <SemanticGroup label="Transferable signals" tone="blue" ids={selectedPath.partialCapabilityIds} result={result} />
      <div><p className="text-[10px] uppercase tracking-wider text-amber-300">Proof to build</p><div className="mt-2 grid gap-2">{growthAreas.map((area) => {
        const isExpanded = area.id === expandedGrowthAreaId;
        const contentId = `mobile-proof-action-${area.id}`;
        return <div key={area.id} className="min-w-0"><button type="button" onClick={() => onToggleGrowthArea(area.id)} aria-expanded={isExpanded} aria-controls={contentId} aria-label={`${isExpanded ? "Hide" : "Show"} example proof to build for ${area.label}`} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs text-amber-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 motion-reduce:transition-none ${isExpanded ? "border-amber-200/55 bg-amber-300/[0.12]" : "border-amber-300/30 bg-amber-300/[0.07]"}`}><span><span aria-hidden="true">◆</span> {area.label}</span><span aria-hidden="true" className="shrink-0 text-amber-200/70">{isExpanded ? "−" : "+"}</span></button>{isExpanded && <div id={contentId} className="mt-1.5 rounded-lg border border-amber-200/15 bg-amber-300/[0.04] px-3 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-amber-300">Example proof to build</p><p className="mt-1.5 break-words text-xs leading-5 text-amber-50">{area.proofToBuild.trim() || "Example proof idea not available in this preview."}</p>{area.reason.trim() && <div className="mt-2 border-t border-amber-200/10 pt-2"><p className="text-[9px] font-semibold uppercase tracking-wider text-amber-200/70">Why it matters</p><p className="mt-1 break-words text-[11px] leading-4 text-slate-400">{area.reason}</p></div>}</div>}</div>;
      })}</div></div>
    </div> : <div className="mt-3 flex flex-wrap gap-2">{selectedCapability?.subCapabilities.map((sub) => <span key={sub.id} className="rounded-full border border-blue-300/15 bg-blue-300/[0.06] px-2.5 py-1.5 text-xs text-blue-100">{sub.label}</span>)}</div>}
    <div className="mt-5"><p className="text-[10px] uppercase tracking-wider text-violet-300">Supporting evidence</p><div className="mt-2 grid gap-2">{evidence.map((experience) => {
      const isSelected = experience.id === selectedEvidenceId;
      const contentId = `mobile-evidence-detail-${experience.id}`;
      return <div key={experience.id} className="min-w-0"><button type="button" onClick={() => onToggleEvidence(experience.id)} aria-expanded={isSelected} aria-controls={contentId} aria-label={`${isSelected ? "Hide" : "Show"} example evidence detail for ${experience.evidenceText}`} className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 motion-reduce:transition-none ${isSelected ? "border-violet-200/40 bg-violet-300/[0.1]" : "border-violet-200/10 bg-violet-300/[0.035]"}`}><span className="block text-xs leading-5 text-slate-200">{experience.evidenceText}</span><span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500"><span>{experience.company} · {experience.role}</span><span aria-hidden="true" className="shrink-0 text-violet-300/70">{isSelected ? "Hide −" : "Detail +"}</span></span></button>{isSelected && <div id={contentId} className="mt-1.5 rounded-xl border border-violet-200/15 bg-violet-300/[0.035] p-3"><EvidenceDetail experience={experience} result={result} /></div>}</div>;
    })}</div></div>
  </div>;
}

function EvidenceDetail({ experience, result }: { experience: CareerCapabilityExplorerResult["experiences"][number]; result: CareerCapabilityExplorerResult }) {
  const capabilityLabels = experience.capabilityIds
    .map((id) => result.capabilities.find((capability) => capability.id === id)?.label)
    .filter((label) => label !== undefined);
  const pathLabels = experience.roleIds
    .map((id) => result.adjacentRoles.find((path) => path.id === id)?.roleFamily)
    .filter((label) => label !== undefined);
  return <div className="min-w-0 text-left">
    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-300">Example evidence detail</p>
    {experience.evidenceText.trim() && <DetailSection label="Action or achievement"><p>{experience.evidenceText}</p></DetailSection>}
    {experience.context.trim() && <DetailSection label="Context"><p>{experience.context}</p></DetailSection>}
    {experience.outcome.trim() && <DetailSection label="Outcome"><p>{experience.outcome}</p></DetailSection>}
    {capabilityLabels.length > 0 && <DetailSection label="Capabilities demonstrated"><div className="flex flex-wrap gap-1.5">{capabilityLabels.map((label) => <span key={label} className="rounded-full border border-teal-300/20 bg-teal-300/[0.06] px-2 py-1 text-[9px] text-teal-100">{label}</span>)}</div></DetailSection>}
    {pathLabels.length > 0 && <DetailSection label="Future Paths supported"><div className="flex flex-wrap gap-1.5">{pathLabels.map((label) => <span key={label} className="rounded-full border border-blue-300/20 bg-blue-300/[0.06] px-2 py-1 text-[9px] text-blue-100">{label}</span>)}</div></DetailSection>}
    {experience.transferabilityExplanation.trim() && <DetailSection label="Why this transfers"><p>{experience.transferabilityExplanation}</p></DetailSection>}
    <DetailSection label="Mock relevance signal"><p className="capitalize">{experience.relevance}</p></DetailSection>
  </div>;
}

function DetailSection({ label, children }: { label: string; children: ReactNode }) {
  return <section className="mt-2 border-t border-violet-200/10 pt-2"><h4 className="text-[8px] font-semibold uppercase tracking-wider text-violet-200/65">{label}</h4><div className="mt-1 break-words text-[10px] leading-4 text-slate-300">{children}</div></section>;
}

function SemanticGroup({ label, tone, ids, result }: { label: string; tone: "teal" | "blue"; ids: string[]; result: CareerCapabilityExplorerResult }) {
  const visibleCapabilities = ids.map((id) => result.capabilities.find((capability) => capability.id === id)).filter((capability) => capability !== undefined);
  const classes = tone === "teal" ? "border-teal-300/25 bg-teal-300/[0.08] text-teal-100" : "border-blue-300/25 bg-blue-300/[0.08] text-blue-100";
  return <div><p className={`text-[10px] uppercase tracking-wider ${tone === "teal" ? "text-teal-300" : "text-blue-300"}`}>{label}</p><div className="mt-2 flex flex-wrap gap-2">{visibleCapabilities.map((capability) => <span key={capability.id} className={`rounded-full border px-2.5 py-1.5 text-xs ${classes}`}><span aria-hidden="true">●</span> {capability.label}</span>)}</div></div>;
}
