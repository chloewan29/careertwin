"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CareerMapExplorerViewModel } from "@/lib/career-possibility/career-map-explorer-view-model";

type Point = { x: number; y: number };

const corePosition: Point = { x: 39, y: 48 };
const demoCapabilityPositions: Point[] = [
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

function intersectIds(left: readonly string[], right: readonly string[]) {
  const rightIds = new Set(right);
  return [...new Set(left)].filter((id) => rightIds.has(id));
}

function subtractIds(left: readonly string[], right: readonly string[]) {
  const rightIds = new Set(right);
  return [...new Set(left)].filter((id) => !rightIds.has(id));
}

function personalCapabilityPositions(count: number): Point[] {
  const centre = { x: 44, y: 49 };
  if (count === 1) return [{ x: centre.x, y: 23 }];
  if (count === 2) return [{ x: 20, y: centre.y }, { x: 68, y: centre.y }];
  const radiusX = 27;
  const radiusY = count <= 4 ? 28 : 34;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    return { x: centre.x + Math.cos(angle) * radiusX, y: centre.y + Math.sin(angle) * radiusY };
  });
}

export function CapabilityExplorer({ result, variant = "full" }: { result: CareerMapExplorerViewModel; variant?: "full" | "hero" }) {
  const hero = variant === "hero";
  const personal = result.mode === "personal";
  const compactPersonal = personal && result.capabilities.length <= 4;
  const hasPaths = result.adjacentRoles.length > 0;
  const mapCorePosition = personal ? { x: 44, y: 49 } : corePosition;
  const capabilityPositions = useMemo(() => personal ? personalCapabilityPositions(result.capabilities.length) : demoCapabilityPositions, [personal, result.capabilities.length]);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [expandedGrowthAreaId, setExpandedGrowthAreaId] = useState<string | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [alternativePathId, setAlternativePathId] = useState<string | null>(null);
  const [isChoosingAlternative, setIsChoosingAlternative] = useState(false);
  const [isIdentityLensOpen, setIsIdentityLensOpen] = useState(false);
  const mobileCapabilityHeading = useRef<HTMLHeadingElement>(null);
  const desktopCapabilityHeading = useRef<HTMLHeadingElement>(null);
  const selectedCapabilityTrigger = useRef<HTMLButtonElement | null>(null);
  const orderedPaths = [...result.adjacentRoles].sort((a, b) => a.rank - b.rank || b.fitScore - a.fitScore);
  const selectedCapability = result.capabilities.find((capability) => capability.id === selectedCapabilityId) ?? null;
  useEffect(() => { if (personal && selectedCapability) (window.matchMedia("(min-width: 768px)").matches ? desktopCapabilityHeading : mobileCapabilityHeading).current?.focus(); }, [personal, selectedCapability]);
  const selectedPath = orderedPaths.find((path) => path.id === selectedPathId) ?? null;
  const alternativePath = orderedPaths.find((path) => path.id === alternativePathId && path.id !== selectedPath?.id) ?? null;
  const comparisonActive = Boolean(selectedPath && alternativePath);
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
      ? result.experiences.filter((experience) => experience.capabilityIds.includes(selectedCapability.id)).slice(0, personal ? undefined : 2)
      : [];
  const visibleGrowthAreas = selectedPath?.growthAreas.slice(0, 3) ?? [];
  const expandedGrowthArea = visibleGrowthAreas.find((growthArea) => growthArea.id === expandedGrowthAreaId) ?? null;
  const selectedEvidence = relevantEvidence.find((experience) => experience.id === selectedEvidenceId) ?? null;

  function clearSecondaryDisclosures() {
    setExpandedGrowthAreaId(null);
    setSelectedEvidenceId(null);
  }

  function clearComparison() {
    setAlternativePathId(null);
    setIsChoosingAlternative(false);
  }

  function clearPathAndSecondary() {
    setSelectedPathId(null);
    clearSecondaryDisclosures();
  }

  function clearSelection() {
    setSelectedCapabilityId(null);
    clearPathAndSecondary();
    clearComparison();
    setIsIdentityLensOpen(false);
  }

  function selectCapability(capabilityId: string) {
    clearPathAndSecondary();
    clearComparison();
    setIsIdentityLensOpen(false);
    setSelectedCapabilityId((current) => current === capabilityId ? null : capabilityId);
  }

  function closePersonalCapability() {
    setSelectedCapabilityId(null);
    window.setTimeout(() => selectedCapabilityTrigger.current?.focus(), 0);
  }

  function selectPath(pathId: string) {
    setIsIdentityLensOpen(false);
    if (isChoosingAlternative && selectedPath) {
      if (pathId === selectedPath.id) return;
      clearSecondaryDisclosures();
      setAlternativePathId(pathId);
      setIsChoosingAlternative(false);
      return;
    }
    setSelectedCapabilityId(null);
    clearSecondaryDisclosures();
    clearComparison();
    setSelectedPathId((current) => current === pathId ? null : pathId);
  }

  function toggleGrowthArea(growthAreaId: string) {
    if (comparisonActive) return;
    setIsIdentityLensOpen(false);
    setSelectedEvidenceId(null);
    setExpandedGrowthAreaId((current) => current === growthAreaId ? null : growthAreaId);
  }

  function toggleEvidence(evidenceId: string) {
    if (comparisonActive) return;
    setIsIdentityLensOpen(false);
    setExpandedGrowthAreaId(null);
    setSelectedEvidenceId((current) => current === evidenceId ? null : evidenceId);
  }

  function beginComparison() {
    if (!selectedPath) return;
    setIsIdentityLensOpen(false);
    clearSecondaryDisclosures();
    setIsChoosingAlternative(true);
  }

  function stopComparing() {
    clearSecondaryDisclosures();
    clearComparison();
  }

  function toggleIdentityLens() {
    if (isIdentityLensOpen) return setIsIdentityLensOpen(false);
    clearSecondaryDisclosures();
    clearComparison();
    setIsIdentityLensOpen(true);
  }

  return (
    <section className={`overflow-hidden border border-cyan-100/10 bg-[#07101c]/90 ${hero ? "rounded-2xl shadow-[0_20px_60px_rgba(6,182,212,0.07)]" : "rounded-[2rem] shadow-[0_30px_140px_rgba(6,182,212,0.08)] backdrop-blur"}`} aria-labelledby="network-heading">
      <header className="flex flex-col justify-between gap-3 border-b border-cyan-100/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Career capability network</p>
          <h2 id="network-heading" className="mt-1 text-lg font-semibold text-slate-100">{personal ? "Your experience core" : "Capabilities into future directions"}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider">
          <span className="text-teal-300"><span aria-hidden="true">●</span> {personal ? "Direct evidence" : "Evidence-backed"}</span>
          <span className="text-blue-300"><span aria-hidden="true">●</span> Transferable</span>
          {!personal && <><span className="text-amber-300"><span aria-hidden="true">◆</span> Proof to build</span><button type="button" onClick={toggleIdentityLens} aria-expanded={isIdentityLensOpen} aria-controls={isIdentityLensOpen ? "desktop-identity-lens mobile-identity-lens" : undefined} aria-label={`${isIdentityLensOpen ? "Hide" : "View"} example transferable identity`} className="rounded-full border border-slate-300/15 px-3 py-1.5 text-slate-300 transition-colors hover:border-slate-200/30 hover:text-slate-100 motion-reduce:transition-none">{isIdentityLensOpen ? "Hide example identity" : "View example transferable identity"}</button></>}
          {selectedPath && !comparisonActive && !isChoosingAlternative && <button type="button" onClick={beginComparison} aria-label={`Compare ${selectedPath.roleFamily} with another path`} className="rounded-full border border-blue-300/20 px-3 py-1.5 text-blue-200 transition-colors hover:border-blue-200/40 hover:text-blue-100">Compare another path</button>}
          {selectedPath && isChoosingAlternative && <><span className="text-blue-200" role="status">Choose an alternative path</span><button type="button" onClick={() => setIsChoosingAlternative(false)} className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition-colors hover:border-white/25">Cancel comparison</button></>}
          {comparisonActive && !isChoosingAlternative && <><button type="button" onClick={beginComparison} className="rounded-full border border-blue-300/20 px-3 py-1.5 text-blue-200 transition-colors hover:border-blue-200/40">Replace alternative</button><button type="button" onClick={stopComparing} aria-label="Stop comparing career paths" className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition-colors hover:border-white/25">Stop comparing</button></>}
          {(selectedCapability || selectedPath) && <button type="button" onClick={clearSelection} className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300 transition-colors hover:border-cyan-200/30 hover:text-cyan-100">Clear selection</button>}
        </div>
      </header>

      <div className="md:hidden">
        <div className="border-b border-white/[0.06] p-4">
          {personal && <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-100/20 bg-cyan-300/[0.05] px-3 py-2"><span className="text-[8px] font-semibold uppercase tracking-wider text-cyan-300">Your career</span><span className="text-xs font-semibold text-slate-100">Experience Core</span></div>}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Explore a capability</p>
          <div className="mt-3 flex flex-wrap gap-2">{result.capabilities.map((capability) => {
            const isSelected = capability.id === selectedCapability?.id;
            return <button key={capability.id} type="button" onClick={(event) => { selectedCapabilityTrigger.current = event.currentTarget; selectCapability(capability.id); }} aria-pressed={isSelected} aria-expanded={personal ? isSelected : undefined} aria-controls={personal && isSelected ? `mobile-personal-capability-${capability.id}` : undefined} className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${isSelected ? "border-cyan-200 bg-cyan-300 text-[#061018]" : "border-white/10 bg-white/[0.03] text-slate-300"}`}><span className="block font-medium">{capability.label}</span>{personal && <span className="mt-1 block text-[10px] opacity-70">{capability.supportingExperienceIds.length} supporting {capability.supportingExperienceIds.length === 1 ? "example" : "examples"}</span>}</button>;
          })}</div>
        </div>
        {hasPaths && <div className="border-b border-white/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Future Paths</p>
          <div className="mt-3 grid gap-2">{(hero ? orderedPaths.slice(0, 2) : orderedPaths).map((path) => {
            const isSelected = path.id === selectedPath?.id;
            const isAlternative = path.id === alternativePath?.id;
            const isRelated = Boolean(selectedCapability?.id && path.capabilityIds.includes(selectedCapability.id));
            const accessibleLabel = isChoosingAlternative && !isSelected ? `Use ${path.roleFamily} as alternative path` : `${isSelected ? "Primary path, " : isAlternative ? "Alternative path, " : ""}${path.roleFamily}`;
            return <button key={path.id} type="button" onClick={() => selectPath(path.id)} disabled={isChoosingAlternative && isSelected} aria-pressed={isSelected || isAlternative} aria-label={accessibleLabel} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed ${isSelected || isAlternative || isRelated ? "border-cyan-200/40 bg-cyan-300/[0.09]" : selectedCapability ? "border-white/[0.06] bg-white/[0.02] opacity-45" : "border-blue-200/15 bg-blue-300/[0.035]"}`}><span><span className="block text-[9px] uppercase tracking-wider text-blue-300">{isSelected ? "Primary path" : isAlternative ? "Alternative path" : path.fitLabel}</span><span className="mt-0.5 block text-xs font-medium text-slate-100">{path.roleFamily}</span></span><span className="text-xs text-cyan-200">#{path.rank}</span></button>;
          })}</div>
        </div>}
        {isIdentityLensOpen ? <div id="mobile-identity-lens" className="border-b border-white/[0.06] p-4"><IdentityLens headingId="mobile-identity-heading" result={result} /></div> : <MobileDetail result={result} personal={personal} headingRef={mobileCapabilityHeading} selectedCapability={selectedCapability} selectedPath={selectedPath} alternativePath={alternativePath} evidence={relevantEvidence} growthAreas={visibleGrowthAreas} expandedGrowthAreaId={expandedGrowthAreaId} selectedEvidenceId={selectedEvidenceId} onCloseCapability={closePersonalCapability} onToggleGrowthArea={toggleGrowthArea} onToggleEvidence={toggleEvidence} />}
      </div>

      <div className={`relative hidden overflow-hidden bg-[radial-gradient(circle_at_39%_48%,rgba(34,211,238,0.11),rgba(7,16,28,0.3)_30%,rgba(4,8,16,0.94)_76%)] md:block ${hero ? "h-[440px]" : compactPersonal ? "h-[500px]" : "h-[640px]"}`}>
        {hasPaths && <><div style={{ left: `${RAIL_START_X}%` }} className="absolute bottom-0 right-0 top-0 border-l border-blue-200/[0.08] bg-blue-400/[0.025]" /><div className="absolute right-[2.5%] top-5 z-20 w-[23%]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300">Future Paths</p>
          <p className="mt-1 text-xs text-slate-500">Ranked directions from demonstrated signals</p>
        </div></>}
        <svg viewBox="0 0 1000 640" preserveAspectRatio="none" className="absolute inset-0 z-0 h-full w-full" aria-hidden="true">
          <defs>
            <marker id="line-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="#67e8f9" fillOpacity=".75" /></marker>
          </defs>
          {personal && capabilityPositions.map((position, index) => <line key={result.capabilities[index]?.id} x1={mapCorePosition.x * 10} y1={mapCorePosition.y * 6.4} x2={position.x * 10} y2={position.y * 6.4} stroke="#67e8f9" strokeOpacity=".18" strokeWidth="1.2" />)}
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

        <div style={{ left: `${mapCorePosition.x}%`, top: `${mapCorePosition.y}%` }} className="absolute z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-100/35 bg-[#0a202c]/95 text-center shadow-[0_0_42px_rgba(34,211,238,0.16)]">
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
          const semanticLabel = personal ? `${capability.supportingExperienceIds.length} supporting ${capability.supportingExperienceIds.length === 1 ? "example" : "examples"}` : isBacked ? "Evidence-backed" : isPartial ? "Transferable signal" : `${capability.strength}% example signal`;
          return <button key={capability.id} type="button" onClick={(event) => { selectedCapabilityTrigger.current = event.currentTarget; selectCapability(capability.id); }} aria-pressed={isSelected} aria-expanded={personal ? isSelected : undefined} aria-controls={personal && isSelected ? `desktop-personal-capability-${capability.id}` : undefined} aria-label={`${capability.label}, ${semanticLabel}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} className={`absolute z-20 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 motion-reduce:transition-none ${isSelected ? "border-cyan-100/65 bg-[#12313b] text-white shadow-[0_0_30px_rgba(34,211,238,0.25)]" : isBacked ? "border-teal-200/50 bg-[#12312f] text-white shadow-[0_0_25px_rgba(45,212,191,0.14)]" : isPartial ? "border-blue-300/45 bg-[#142943] text-blue-50" : isInactive ? "border-white/[0.07] bg-[#0b1826] text-slate-500 opacity-35" : "border-cyan-100/15 bg-[#0b1826] text-slate-300 hover:border-cyan-200/30"}`}>
            {personal && <span className="mb-1 block text-[8px] uppercase tracking-wider text-cyan-300/70">{capability.family}</span>}<span className="block text-xs font-semibold leading-4">{capability.label}</span>
            <span className={`mt-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wider ${isBacked ? "text-teal-300" : isPartial ? "text-blue-300" : "text-cyan-200/70"}`}><span className={`h-1.5 w-1.5 rounded-full ${isBacked ? "bg-teal-300" : isPartial ? "bg-blue-300" : "bg-cyan-300/70"}`} />{semanticLabel}</span>
          </button>;
        })}

        {(hero ? orderedPaths.slice(0, 2) : orderedPaths).map((path, index) => {
          const position = pathPositions[index];
          if (!position) return null;
          const isSelected = path.id === selectedPath?.id;
          const isAlternative = path.id === alternativePath?.id;
          const related = Boolean(selectedCapability && path.capabilityIds.includes(selectedCapability.id));
          const dimmed = Boolean(selectedCapability && !related) || Boolean(selectedPath && !isSelected && !isAlternative && !isChoosingAlternative);
          const defaultOpacity = Math.max(.45, 1 - index * .16);
          const accessibleLabel = isChoosingAlternative && !isSelected ? `Use ${path.roleFamily} as alternative path` : `${isSelected ? "Primary path, " : isAlternative ? "Alternative path, " : ""}${path.roleFamily}`;
          return <button key={path.id} type="button" onClick={() => selectPath(path.id)} disabled={isChoosingAlternative && isSelected} aria-pressed={isSelected || isAlternative} aria-label={accessibleLabel} style={{ left: `${position.x}%`, top: `${position.y}%`, opacity: selectedCapability || selectedPath ? undefined : defaultOpacity }} className={`absolute z-30 w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-r-full rounded-l-xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 disabled:cursor-not-allowed motion-reduce:transition-none ${isSelected || isAlternative || related ? "border-cyan-200/45 bg-[#102b37] shadow-[0_0_24px_rgba(56,189,248,0.14)]" : dimmed ? "border-white/[0.06] bg-[#09131f] opacity-25" : "border-blue-200/15 bg-[#0b1725] hover:border-blue-200/30"}`}>
            <span className="flex items-center justify-between gap-2"><span className="text-[9px] font-semibold uppercase tracking-wider text-blue-300">#{path.rank} · {isSelected ? "Primary path" : isAlternative ? "Alternative path" : path.fitLabel}</span><span aria-hidden="true" className="text-cyan-300">→</span></span>
            <span className="mt-1 block text-xs font-semibold leading-4 text-slate-100">{path.roleFamily}</span>
            {isSelected && <span className="mt-1 block text-[9px] leading-3 text-slate-400">Role Gap Lens active</span>}
          </button>;
        })}

        {(selectedCapability || selectedPath) && !comparisonActive && <div id={personal && selectedCapability ? `desktop-personal-capability-${selectedCapability.id}` : undefined} className={`absolute bottom-5 left-[4%] z-30 rounded-2xl border border-violet-200/10 bg-[#07111e]/95 p-3 shadow-2xl backdrop-blur ${personal ? "w-[91%]" : "w-[63%]"}`}>
          <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300">Supporting evidence</p>{personal && selectedCapability && <h3 ref={desktopCapabilityHeading} tabIndex={-1} className="mt-1 text-sm font-semibold text-slate-100 focus-visible:outline-none">{selectedCapability.label}</h3>}</div>{personal ? <button type="button" onClick={closePersonalCapability} className="min-h-11 rounded-lg px-3 text-xs text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Close details</button> : <p className="text-[9px] text-slate-500">Mock proof signals</p>}</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{relevantEvidence.map((experience) => {
            const isSelected = experience.id === selectedEvidence?.id;
            const contentId = `desktop-evidence-detail-${experience.id}`;
            return <button key={experience.id} type="button" onClick={() => toggleEvidence(experience.id)} aria-expanded={isSelected} aria-controls={contentId} aria-label={`${isSelected ? "Hide" : "Show"} evidence detail for ${experience.evidenceText}`} className={`rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 motion-reduce:transition-none ${isSelected ? "border-violet-200/40 bg-violet-300/[0.1]" : "border-violet-200/10 bg-violet-300/[0.035] hover:border-violet-200/25"}`}><span className="block text-[11px] leading-4 text-slate-200">{experience.evidenceText}</span><span className="mt-1 flex items-center justify-between gap-2 text-[9px] text-slate-500"><span>{personal ? relationshipLabel(experience, selectedCapability?.id) : [experience.company, experience.role].filter(Boolean).join(" · ")}</span><span aria-hidden="true" className="shrink-0 text-violet-300/70">{isSelected ? "Hide −" : "Detail +"}</span></span></button>;
          })}</div>
        </div>}

        {selectedPath && selectedPathPosition && !comparisonActive && visibleGrowthAreas.map((growthArea, index) => {
          const y = selectedPathPosition.y + (index - (visibleGrowthAreas.length - 1) / 2) * GAP_VERTICAL_SPACING;
          const isExpanded = growthArea.id === expandedGrowthArea?.id;
          const contentId = `desktop-proof-action-${growthArea.id}`;
          return <button key={growthArea.id} type="button" onClick={() => toggleGrowthArea(growthArea.id)} aria-expanded={isExpanded} aria-controls={contentId} aria-label={`${isExpanded ? "Hide" : "Show"} example proof to build for ${growthArea.label}`} style={{ left: `${GAP_COLUMN_X}%`, top: `${y}%` }} className={`absolute z-40 w-32 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-[#2a2113] px-2.5 py-2 text-left shadow-[0_0_18px_rgba(251,191,36,0.08)] transition-[border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 motion-reduce:transition-none ${isExpanded ? "border-amber-200/70 bg-[#352817]" : "border-amber-300/35 hover:border-amber-200/60"}`}><span className="block text-[8px] font-semibold uppercase tracking-wider text-amber-300"><span aria-hidden="true">◆</span> Proof to build</span><span className="mt-1 block text-[10px] leading-3 text-amber-50">{growthArea.label}</span><span aria-hidden="true" className="mt-1 block text-[9px] text-amber-200/70">{isExpanded ? "Hide idea −" : "Show idea +"}</span></button>;
        })}

        {expandedGrowthArea && !comparisonActive && <article id={`desktop-proof-action-${expandedGrowthArea.id}`} className="absolute left-[3%] top-[26%] z-30 max-h-40 w-[27%] overflow-y-auto rounded-2xl border border-amber-300/25 bg-[#17150f]/95 p-3.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300">Example proof to build</p>
          <p className="mt-2 text-xs leading-5 text-amber-50">{expandedGrowthArea.proofToBuild.trim() || "Example proof idea not available in this preview."}</p>
          {expandedGrowthArea.reason.trim() && <div className="mt-2 border-t border-amber-200/10 pt-2"><p className="text-[9px] font-semibold uppercase tracking-wider text-amber-200/70">Why it matters</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{expandedGrowthArea.reason}</p></div>}
        </article>}

        {selectedEvidence && !comparisonActive && <div id={`desktop-evidence-detail-${selectedEvidence.id}`} className="absolute left-[3%] top-[26%] z-30 max-h-40 w-[30%] overflow-y-auto rounded-2xl border border-violet-300/25 bg-[#13121d]/95 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
          <EvidenceDetail experience={selectedEvidence} result={result} />
        </div>}

      </div>
      {isIdentityLensOpen && <div id="desktop-identity-lens" className="hidden max-h-72 overflow-y-auto border-t border-slate-200/10 bg-[#0b111b]/95 p-4 md:block"><IdentityLens headingId="desktop-identity-heading" result={result} /></div>}
      {selectedPath && alternativePath && <div className="hidden max-h-72 overflow-y-auto border-t border-blue-200/10 bg-[#08131f]/95 p-4 md:block">
        <ComparisonSummary headingId="desktop-comparison-heading" primary={selectedPath} alternative={alternativePath} result={result} />
      </div>}
    </section>
  );
}

type MobileDetailProps = {
  result: CareerMapExplorerViewModel;
  personal: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  selectedCapability: CareerMapExplorerViewModel["capabilities"][number] | null;
  selectedPath: CareerMapExplorerViewModel["adjacentRoles"][number] | null;
  alternativePath: CareerMapExplorerViewModel["adjacentRoles"][number] | null;
  evidence: CareerMapExplorerViewModel["experiences"];
  growthAreas: CareerMapExplorerViewModel["adjacentRoles"][number]["growthAreas"];
  expandedGrowthAreaId: string | null;
  selectedEvidenceId: string | null;
  onCloseCapability: () => void;
  onToggleGrowthArea: (growthAreaId: string) => void;
  onToggleEvidence: (evidenceId: string) => void;
};

function MobileDetail({ result, personal, headingRef, selectedCapability, selectedPath, alternativePath, evidence, growthAreas, expandedGrowthAreaId, selectedEvidenceId, onCloseCapability, onToggleGrowthArea, onToggleEvidence }: MobileDetailProps) {
  if (!selectedCapability && !selectedPath) return <div className="p-5 text-sm leading-6 text-slate-400">{personal ? "Choose a capability to see the CV evidence behind it." : "Select a capability to trace supported directions, or choose a Future Path to open its Role Gap Lens."}</div>;
  if (selectedPath && alternativePath) return <div className="p-4"><ComparisonSummary headingId="mobile-comparison-heading" primary={selectedPath} alternative={alternativePath} result={result} /></div>;
  return <div className="p-4">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">{selectedPath ? "Role Gap Lens" : "Capability focus"}</p>
    <div className="flex items-start justify-between gap-3"><h3 ref={headingRef} tabIndex={personal ? -1 : undefined} id={personal && selectedCapability ? `mobile-personal-capability-${selectedCapability.id}` : undefined} className="mt-1 text-lg font-semibold text-slate-100 focus-visible:outline-none">{selectedPath?.roleFamily ?? selectedCapability?.label}</h3>{personal && selectedCapability && <button type="button" onClick={onCloseCapability} className="min-h-11 rounded-lg px-3 text-xs text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Close details</button>}</div>
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
      return <div key={experience.id} className="min-w-0"><button type="button" onClick={() => onToggleEvidence(experience.id)} aria-expanded={isSelected} aria-controls={contentId} aria-label={`${isSelected ? "Hide" : "Show"} evidence detail for ${experience.evidenceText}`} className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 motion-reduce:transition-none ${isSelected ? "border-violet-200/40 bg-violet-300/[0.1]" : "border-violet-200/10 bg-violet-300/[0.035]"}`}><span className="block text-xs leading-5 text-slate-200">{experience.evidenceText}</span><span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500"><span>{personal ? relationshipLabel(experience, selectedCapability?.id) : [experience.company, experience.role].filter(Boolean).join(" · ")}</span><span aria-hidden="true" className="shrink-0 text-violet-300/70">{isSelected ? "Hide −" : "Detail +"}</span></span></button>{isSelected && <div id={contentId} className="mt-1.5 rounded-xl border border-violet-200/15 bg-violet-300/[0.035] p-3"><EvidenceDetail experience={experience} result={result} /></div>}</div>;
    })}</div></div>
  </div>;
}

type FuturePath = CareerMapExplorerViewModel["adjacentRoles"][number];

function IdentityLens({ headingId, result }: { headingId: string; result: CareerMapExplorerViewModel }) {
  const established = [...result.capabilities].sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0) || result.capabilities.indexOf(a) - result.capabilities.indexOf(b)).slice(0, 3);
  const counts = new Map<string, number>();
  result.experiences.forEach((experience) => experience.capabilityIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
  const recurringIds = new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
  const source = result.experiences.find((experience) => experience.capabilityIds.some((id) => recurringIds.has(id)) && experience.transferabilityExplanation?.trim());
  const pattern = source?.transferabilityExplanation?.trim() || "The example experiences show transferable capability across more than one business context.";
  const directions = [...result.adjacentRoles].sort((a, b) => a.rank - b.rank || b.fitScore - a.fitScore).slice(0, 2);
  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  const proof = result.adjacentRoles.flatMap((path) => path.growthAreas.map((area, index) => ({ area, rank: path.rank, index }))).sort((a, b) => priorityOrder[a.area.priority] - priorityOrder[b.area.priority] || a.rank - b.rank || a.index - b.index)[0]?.area;
  return <section aria-labelledby={headingId} className="min-w-0 text-left"><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Example transferable identity</p><h3 id={headingId} className="mt-1 text-base font-semibold text-slate-100">A pattern beyond job titles</h3><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <IdentityGroup label="Strongest example signals"><div className="flex flex-wrap gap-1.5">{established.map((capability) => <span key={capability.id} className="rounded-full border border-slate-300/15 bg-white/[0.025] px-2 py-1 text-[9px] text-slate-200">{capability.label} · {capability.strength}% example signal</span>)}</div></IdentityGroup>
    <IdentityGroup label="Transferable pattern"><p>{pattern}</p></IdentityGroup>
    <IdentityGroup label="Credible example directions"><div className="grid gap-1.5">{directions.map((path) => <div key={path.id} className="text-[10px] text-slate-200">#{path.rank} · {path.roleFamily} <span className="text-slate-500">— {path.fitLabel}</span></div>)}</div></IdentityGroup>
    <IdentityGroup label="Example proof priority">{proof ? <div className="border-l-2 border-amber-300/35 pl-2"><p className="text-[10px] font-medium text-amber-100">{proof.label}</p><p className="mt-1 text-[9px] leading-4 text-slate-400">{proof.proofToBuild}</p></div> : <p>No example proof priority is available.</p>}</IdentityGroup>
  </div></section>;
}

function IdentityGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><h4 className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">{label}</h4><div className="mt-2 break-words text-[10px] leading-4 text-slate-300">{children}</div></div>;
}

function ComparisonSummary({ headingId, primary, alternative, result }: { headingId: string; primary: FuturePath; alternative: FuturePath; result: CareerMapExplorerViewModel }) {
  const capabilityLabelById = new Map(result.capabilities.map((capability) => [capability.id, capability.label]));
  const labelsFor = (ids: string[]) => ids.map((id) => capabilityLabelById.get(id)).filter((label) => label !== undefined);
  const sharedBacked = labelsFor(intersectIds(primary.capabilityIds, alternative.capabilityIds));
  const primaryBacked = labelsFor(subtractIds(primary.capabilityIds, alternative.capabilityIds));
  const alternativeBacked = labelsFor(subtractIds(alternative.capabilityIds, primary.capabilityIds));
  const sharedPartial = labelsFor(intersectIds(primary.partialCapabilityIds, alternative.partialCapabilityIds));
  const primaryPartial = labelsFor(subtractIds(primary.partialCapabilityIds, alternative.partialCapabilityIds));
  const alternativePartial = labelsFor(subtractIds(alternative.partialCapabilityIds, primary.partialCapabilityIds));
  const primaryGrowthLabels = [...new Set(primary.growthAreas.map((area) => area.label))];
  const alternativeGrowthLabels = [...new Set(alternative.growthAreas.map((area) => area.label))];
  const sharedGrowth = intersectIds(primaryGrowthLabels, alternativeGrowthLabels);
  const primaryGrowth = subtractIds(primaryGrowthLabels, alternativeGrowthLabels);
  const alternativeGrowth = subtractIds(alternativeGrowthLabels, primaryGrowthLabels);
  const evidenceCount = (path: FuturePath) => result.experiences.filter((experience) => experience.roleIds.includes(path.id)).length;
  return <section aria-labelledby={headingId} className="min-w-0 text-left">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-blue-300">Example path comparison</p><h3 id={headingId} className="mt-0.5 text-sm font-semibold text-slate-100">Compare directions</h3></div><p className="text-[8px] uppercase tracking-wider text-slate-500">Mock evidence coverage</p></div>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <PathComparisonHeader label="Primary path" path={primary} evidenceCount={evidenceCount(primary)} />
      <PathComparisonHeader label="Alternative path" path={alternative} evidenceCount={evidenceCount(alternative)} />
    </div>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <ComparisonGroup label="Shared evidence-backed capabilities" tone="teal" items={sharedBacked} empty="No shared mapped evidence-backed capabilities" />
      <ComparisonGroup label="Shared transferable signals" tone="blue" items={sharedPartial} empty="No shared mapped transferable signals" />
      <PathDifferenceGroup label="Primary path only" backed={primaryBacked} partial={primaryPartial} />
      <PathDifferenceGroup label="Alternative path only" backed={alternativeBacked} partial={alternativePartial} />
    </div>
    <div className="mt-2 grid gap-2 sm:grid-cols-3">
      <ComparisonGroup label="Shared proof-building focus" tone="amber" items={sharedGrowth} empty="No exact shared growth-area labels" />
      <ComparisonGroup label="Primary path proof focus" tone="amber" items={primaryGrowth} empty="No path-specific proof labels" />
      <ComparisonGroup label="Alternative path proof focus" tone="amber" items={alternativeGrowth} empty="No path-specific proof labels" />
    </div>
  </section>;
}

function PathComparisonHeader({ label, path, evidenceCount }: { label: string; path: FuturePath; evidenceCount: number }) {
  return <div className="rounded-xl border border-blue-200/10 bg-blue-300/[0.035] px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-wider text-blue-300">{label}</p><p className="mt-0.5 text-[11px] font-semibold text-slate-100">{path.roleFamily}</p><p className="mt-1 text-[9px] text-slate-400">#{path.rank} · {path.fitLabel}</p><p className="mt-0.5 text-[9px] text-slate-500">Supported by {evidenceCount} mock evidence {evidenceCount === 1 ? "item" : "items"}</p></div>;
}

function PathDifferenceGroup({ label, backed, partial }: { label: string; backed: string[]; partial: string[] }) {
  return <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><ComparisonItems label="Evidence-backed" tone="teal" items={backed} /><ComparisonItems label="Transferable" tone="blue" items={partial} /></div>;
}

function ComparisonGroup({ label, tone, items, empty }: { label: string; tone: "teal" | "blue" | "amber"; items: string[]; empty: string }) {
  return <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>{items.length > 0 ? <ComparisonChips tone={tone} items={items} /> : <p className="mt-1 text-[9px] leading-4 text-slate-600">{empty}</p>}</div>;
}

function ComparisonItems({ label, tone, items }: { label: string; tone: "teal" | "blue"; items: string[] }) {
  return <div className="mt-1.5"><p className="text-[8px] text-slate-500">{label}</p>{items.length > 0 ? <ComparisonChips tone={tone} items={items} /> : <p className="mt-1 text-[9px] text-slate-600">None visible on this example path</p>}</div>;
}

function ComparisonChips({ tone, items }: { tone: "teal" | "blue" | "amber"; items: string[] }) {
  const classes = tone === "teal" ? "border-teal-300/20 bg-teal-300/[0.06] text-teal-100" : tone === "blue" ? "border-blue-300/20 bg-blue-300/[0.06] text-blue-100" : "border-amber-300/20 bg-amber-300/[0.06] text-amber-100";
  return <div className="mt-1 flex flex-wrap gap-1">{items.map((item) => <span key={item} className={`rounded-full border px-2 py-0.5 text-[8px] leading-4 ${classes}`}>{item}</span>)}</div>;
}

function relationshipLabel(experience: CareerMapExplorerViewModel["experiences"][number], capabilityId?: string) {
  const relationship = capabilityId ? experience.relationshipByCapabilityId?.[capabilityId] : undefined;
  return relationship === "transferable_signal" ? "Transferable signal" : "Direct evidence";
}

function EvidenceDetail({ experience, result }: { experience: CareerMapExplorerViewModel["experiences"][number]; result: CareerMapExplorerViewModel }) {
  const capabilityLabels = experience.capabilityIds
    .map((id) => result.capabilities.find((capability) => capability.id === id)?.label)
    .filter((label) => label !== undefined);
  const pathLabels = experience.roleIds
    .map((id) => result.adjacentRoles.find((path) => path.id === id)?.roleFamily)
    .filter((label) => label !== undefined);
  return <div className="min-w-0 text-left">
    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-300">{result.mode === "personal" ? "CV evidence detail" : "Example evidence detail"}</p>
    {experience.evidenceText.trim() && <DetailSection label="Action or achievement"><p>{experience.evidenceText}</p></DetailSection>}
    {experience.context?.trim() && <DetailSection label="Context"><p>{experience.context}</p></DetailSection>}
    {experience.outcome?.trim() && <DetailSection label="Outcome"><p>{experience.outcome}</p></DetailSection>}
    {capabilityLabels.length > 0 && <DetailSection label="Capabilities demonstrated"><div className="flex flex-wrap gap-1.5">{capabilityLabels.map((label) => <span key={label} className="rounded-full border border-teal-300/20 bg-teal-300/[0.06] px-2 py-1 text-[9px] text-teal-100">{label}</span>)}</div></DetailSection>}
    {pathLabels.length > 0 && <DetailSection label="Future Paths supported"><div className="flex flex-wrap gap-1.5">{pathLabels.map((label) => <span key={label} className="rounded-full border border-blue-300/20 bg-blue-300/[0.06] px-2 py-1 text-[9px] text-blue-100">{label}</span>)}</div></DetailSection>}
    {experience.transferabilityExplanation?.trim() && <DetailSection label="Why this transfers"><p>{experience.transferabilityExplanation}</p></DetailSection>}
    {result.mode === "personal" ? <><DetailSection label="Evidence relationship"><p>{[...experience.capabilityIds].map((id) => `${result.capabilities.find((capability) => capability.id === id)?.label}: ${relationshipLabel(experience, id)}`).join(" · ")}</p></DetailSection><DetailSection label="Review status"><p>{experience.reviewStatus === "reviewed" ? "Reviewed" : "Not reviewed"}</p></DetailSection>{experience.sourceStart !== undefined && experience.sourceEnd !== undefined && <DetailSection label="Source location"><p>Source span {experience.sourceStart}–{experience.sourceEnd}</p></DetailSection>}</> : experience.relevance && <DetailSection label="Mock relevance signal"><p className="capitalize">{experience.relevance}</p></DetailSection>}
  </div>;
}

function DetailSection({ label, children }: { label: string; children: ReactNode }) {
  return <section className="mt-2 border-t border-violet-200/10 pt-2"><h4 className="text-[8px] font-semibold uppercase tracking-wider text-violet-200/65">{label}</h4><div className="mt-1 break-words text-[10px] leading-4 text-slate-300">{children}</div></section>;
}

function SemanticGroup({ label, tone, ids, result }: { label: string; tone: "teal" | "blue"; ids: readonly string[]; result: CareerMapExplorerViewModel }) {
  const visibleCapabilities = ids.map((id) => result.capabilities.find((capability) => capability.id === id)).filter((capability) => capability !== undefined);
  const classes = tone === "teal" ? "border-teal-300/25 bg-teal-300/[0.08] text-teal-100" : "border-blue-300/25 bg-blue-300/[0.08] text-blue-100";
  return <div><p className={`text-[10px] uppercase tracking-wider ${tone === "teal" ? "text-teal-300" : "text-blue-300"}`}>{label}</p><div className="mt-2 flex flex-wrap gap-2">{visibleCapabilities.map((capability) => <span key={capability.id} className={`rounded-full border px-2.5 py-1.5 text-xs ${classes}`}><span aria-hidden="true">●</span> {capability.label}</span>)}</div></div>;
}
