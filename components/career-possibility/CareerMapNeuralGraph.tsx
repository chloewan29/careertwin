"use client";
import React from "react";

/**
 * CareerMapNeuralGraph — Slice 1 visual renderer.
 *
 * Accepts a CareerMapGraphProjection as its sole semantic input.
 * Owns all layout geometry locally. No coordinates in the projection.
 *
 * Invariants (Slice 1):
 * - Does NOT read localStorage.
 * - Does NOT import any Job Copilot, fitScore, rank, or JD module.
 * - Does NOT import employer / roleTitle provenance.
 * - Does NOT import CapabilityExplorer or career-map-explorer-view-model.
 * - Unsupported role requirements never appear as personal capability nodes.
 * - Families and their canonical capabilities remain visible as two presentation layers.
 * - Capabilities are progressive: evidence is revealed only on capability selection.
 * - Layout is fully computed from projection node count — no fixed-six geometry.
 */

import { useMemo, useState } from "react";
import type {
  CareerMapGraphProjection,
  CapabilityFamilyGraphNode,
  CapabilityGraphNode,
  EvidenceGraphNode,
  RoleGraphNode,
  RoleRequirementGraphNode,
} from "@/lib/career-possibility/career-map-graph-projection";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type CareerMapNeuralGraphProps = {
  /** The graph projection — the sole semantic input to this renderer. */
  readonly projection: CareerMapGraphProjection;
};

// ---------------------------------------------------------------------------
// Layout constants — local to this renderer
// ---------------------------------------------------------------------------

/** SVG viewBox dimensions */
const VB_W = 1000;
const VB_H = 620;

/** Center of the "You" node in SVG units */
const CX = 400;
const CY = 310;

/** Radii for each ring */
const FAMILY_RING_R = 165;
const CAPABILITY_RING_R = 260;
const EVIDENCE_RING_OFFSET = 68;

/** Role requirement orbit and rank-derived role radii. */
const ROLE_REQ_RING_R = 72;
const ROLE_BASE_RADIUS = 420;
const ROLE_RADIUS_STEP = 30;
const ROLE_ANGLES = [57, 78, 97, 119] as const;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function radialPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function familyAngles(count: number): number[] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => (360 / count) * i);
}

function positionStyle(point: { x: number; y: number }): React.CSSProperties {
  return {
    left: `${(point.x / VB_W) * 100}%`,
    top: `${(point.y / VB_H) * 100}%`,
    transform: "translate(-50%,-50%)",
  };
}

function evidenceOffsetPositions(
  capX: number,
  capY: number,
  count: number,
  capAngle: number,
): { x: number; y: number }[] {
  if (count === 0) return [];
  if (count === 1) return [radialPoint(capX, capY, EVIDENCE_RING_OFFSET, capAngle)];
  const spread = Math.min(45, 70 / count);
  const start = capAngle - ((count - 1) / 2) * spread;
  return Array.from({ length: count }, (_, i) =>
    radialPoint(capX, capY, EVIDENCE_RING_OFFSET, start + i * spread),
  );
}

export function rolePosition(role: RoleGraphNode, roleIndex: number): { x: number; y: number; radius: number } {
  const proximityRank = role.proximityRank ?? roleIndex;
  const radius = ROLE_BASE_RADIUS + proximityRank * ROLE_RADIUS_STEP;
  const angle = ROLE_ANGLES[roleIndex % ROLE_ANGLES.length] ?? 90;
  return { ...radialPoint(CX, CY, radius, angle), radius };
}

function roleReqPositions(roleX: number, roleY: number, count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = ((360 / count) * i - 90) * (Math.PI / 180);
    return { x: roleX + ROLE_REQ_RING_R * Math.cos(angle), y: roleY + ROLE_REQ_RING_R * Math.sin(angle) };
  });
}

// ---------------------------------------------------------------------------
// Node type helpers
// ---------------------------------------------------------------------------

function nodesByType<T extends CareerMapGraphProjection["nodes"][number]["type"]>(
  projection: CareerMapGraphProjection,
  type: T,
): Extract<CareerMapGraphProjection["nodes"][number], { type: T }>[] {
  return projection.nodes.filter(
    (n): n is Extract<CareerMapGraphProjection["nodes"][number], { type: T }> => n.type === type,
  );
}

// ---------------------------------------------------------------------------
// Requirement state colours / labels
// ---------------------------------------------------------------------------

const reqStateConfig = {
  directly_demonstrated: {
    stroke: "#5eead4",
    fill: "#0e2e2b",
    textColor: "#5eead4",
    edgeStroke: "#5eead4",
    edgeDash: undefined as string | undefined,
    badge: "Direct",
  },
  transferable_signal: {
    stroke: "#60a5fa",
    fill: "#0e1e36",
    textColor: "#60a5fa",
    edgeStroke: "#60a5fa",
    edgeDash: "6 4",
    badge: "Transferable",
  },
  evidence_not_yet_shown: {
    stroke: "#94a3b8",
    fill: "transparent",
    textColor: "#94a3b8",
    edgeStroke: "#94a3b8",
    edgeDash: "3 6",
    badge: "Not yet shown",
  },
} as const;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CareerMapNeuralGraph({ projection }: CareerMapNeuralGraphProps) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // --- Derived node lists ------------------------------------------------
  const familyNodes = useMemo(() => nodesByType(projection, "capability_family") as CapabilityFamilyGraphNode[], [projection]);
  const capabilityNodes = useMemo(() => nodesByType(projection, "capability") as CapabilityGraphNode[], [projection]);
  const evidenceNodes = useMemo(() => nodesByType(projection, "evidence") as EvidenceGraphNode[], [projection]);
  const roleNodes = useMemo(() => nodesByType(projection, "role") as RoleGraphNode[], [projection]);
  const requirementNodes = useMemo(() => nodesByType(projection, "role_requirement") as RoleRequirementGraphNode[], [projection]);

  const selectedRole = roleNodes.find((role) => role.id === selectedRoleId) ?? null;
  const selectedRoleRequirements = useMemo(
    () => requirementNodes.filter((requirement) => requirement.roleId === selectedRoleId),
    [requirementNodes, selectedRoleId],
  );
  const rolePositions = useMemo(
    () => new Map(roleNodes.map((role, index) => [role.id, rolePosition(role, index)])),
    [roleNodes],
  );

  // --- Computed positions ------------------------------------------------
  const angles = useMemo(() => familyAngles(familyNodes.length), [familyNodes.length]);

  const familyPositions = useMemo(
    () =>
      familyNodes.map((_, i) => {
        const a = angles[i]!;
        return radialPoint(CX, CY, FAMILY_RING_R, a);
      }),
    [familyNodes, angles],
  );

  // --- Visibility logic (presentation-only) -----------------------------
  //
  // All personal capabilities remain visible so the initial map reads
  // You -> family -> specific capability. Selection changes emphasis and
  // evidence disclosure only; it never changes semantic membership.
  //
  // This is presentation-only — no semantic state is mutated.

  const roleReferencedCapabilityIds = useMemo<Set<string>>(() => {
    if (!selectedRole) return new Set();
    const ids = new Set<string>();
    for (const req of selectedRoleRequirements) {
      if (req.requirementState !== "evidence_not_yet_shown") {
        ids.add(req.capabilityId);
      }
    }
    return ids;
  }, [selectedRole, selectedRoleRequirements]);

  const selectedFamilyCapabilityIds = useMemo<Set<string>>(() => {
    if (!selectedFamilyId) return new Set();
    const fam = familyNodes.find((f) => f.id === selectedFamilyId);
    return new Set(fam?.capabilityIds ?? []);
  }, [selectedFamilyId, familyNodes]);

  const visibleCapabilityIds = useMemo<Set<string>>(() => {
    return new Set(capabilityNodes.map((capability) => capability.id));
  }, [capabilityNodes]);

  const visibleCapabilities = useMemo(
    () => capabilityNodes.filter((c) => visibleCapabilityIds.has(c.id)),
    [capabilityNodes, visibleCapabilityIds],
  );

  // Evidence visible only when capability selected
  const visibleEvidenceIds = useMemo<Set<string>>(() => {
    if (!selectedCapabilityId) return new Set();
    const cap = capabilityNodes.find((c) => c.id === selectedCapabilityId);
    return new Set(cap?.evidenceIds ?? []);
  }, [selectedCapabilityId, capabilityNodes]);

  const visibleEvidence = useMemo(
    () => evidenceNodes.filter((e) => visibleEvidenceIds.has(e.id)),
    [evidenceNodes, visibleEvidenceIds],
  );

  // --- Capability positions (placed around their owning family) ----------
  const capabilityPositions = useMemo<Map<string, { x: number; y: number }>>(() => {
    const map = new Map<string, { x: number; y: number }>();
    const orderedCapabilities = familyNodes.flatMap((family) =>
      capabilityNodes.filter((capability) => capability.familyId === family.id),
    );
    orderedCapabilities.forEach((capability, index) => {
      map.set(capability.id, radialPoint(CX, CY, CAPABILITY_RING_R, (360 / orderedCapabilities.length) * index));
    });
    return map;
  }, [familyNodes, capabilityNodes]);

  // --- Evidence positions (placed around the selected capability) --------
  const evidencePositions = useMemo<Map<string, { x: number; y: number }>>(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (!selectedCapabilityId) return map;
    const capPos = capabilityPositions.get(selectedCapabilityId);
    if (!capPos) return map;
    // Compute angle from center to capability for outward extension
    const dx = capPos.x - CX;
    const dy = capPos.y - CY;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI + 90;
    const positions = evidenceOffsetPositions(capPos.x, capPos.y, visibleEvidence.length, angleDeg);
    visibleEvidence.forEach((e, i) => {
      if (positions[i]) map.set(e.id, positions[i]!);
    });
    return map;
  }, [selectedCapabilityId, capabilityPositions, visibleEvidence]);

  // --- Role requirement positions ----------------------------------------
  const reqPositions = useMemo<Map<string, { x: number; y: number }>>(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (!selectedRole) return map;
    const selectedRolePosition = rolePositions.get(selectedRole.id);
    if (!selectedRolePosition) return map;
    const positions = roleReqPositions(selectedRolePosition.x, selectedRolePosition.y, selectedRoleRequirements.length);
    selectedRoleRequirements.forEach((req, i) => {
      if (positions[i]) map.set(req.id, positions[i]!);
    });
    return map;
  }, [selectedRole, selectedRoleRequirements, rolePositions]);

  // --- Event handlers ---------------------------------------------------
  function selectFamily(id: string) {
    setSelectedCapabilityId(null);
    setSelectedFamilyId((current) => (current === id ? null : id));
  }

  function selectCapability(id: string) {
    setSelectedCapabilityId((current) => (current === id ? null : id));
  }

  function toggleRole(roleId: string) {
    setSelectedRoleId((current) => (current === roleId ? null : roleId));
    setSelectedCapabilityId(null);
  }

  // --- SVG edge helpers -------------------------------------------------
  function line(x1: number, y1: number, x2: number, y2: number, stroke: string, opacity: number, dash?: string) {
    return (
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={stroke}
        strokeOpacity={opacity}
        strokeWidth={1.4}
        strokeDasharray={dash}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasRole = roleNodes.length > 0;

  return (
    <section
      aria-label="Career Map neural graph"
      className="overflow-hidden rounded-[2rem] border border-cyan-100/10 bg-[#07101c]/90 shadow-[0_30px_140px_rgba(6,182,212,0.08)] backdrop-blur"
    >
      <header className="flex flex-col justify-between gap-3 border-b border-cyan-100/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Career capability network</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">Your evidence map</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider">
          <span className="text-teal-300"><span aria-hidden="true">●</span> Direct evidence</span>
          <span className="text-blue-300"><span aria-hidden="true">◑</span> Transferable</span>
          <span className="text-slate-400"><span aria-hidden="true">○</span> Not yet shown</span>
        </div>
      </header>

      {/* ── Desktop SVG graph ─────────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden md:block" style={{ height: VB_H }}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Center → family edges */}
          {familyNodes.map((fam, fi) => {
            const fp = familyPositions[fi]!;
            return <line key={`edge-user-${fam.id}`} x1={CX} y1={CY} x2={fp.x} y2={fp.y} stroke="#67e8f9" strokeOpacity={0.18} strokeWidth={1.2} />;
          })}

          {/* Family → capability edges */}
          {visibleCapabilities.map((cap) => {
            const fp = familyPositions[familyNodes.findIndex((f) => f.id === cap.familyId)]!;
            const cp = capabilityPositions.get(cap.id);
            if (!fp || !cp) return null;
            return <line key={`edge-fam-cap-${cap.id}`} x1={fp.x} y1={fp.y} x2={cp.x} y2={cp.y} stroke="#67e8f9" strokeOpacity={0.28} strokeWidth={1.2} />;
          })}

          {/* Capability → evidence edges */}
          {visibleEvidence.map((ev) => {
            const cp = capabilityPositions.get(selectedCapabilityId ?? "");
            const ep = evidencePositions.get(ev.id);
            if (!cp || !ep) return null;
            const isTransferable = ev.relationship === "transferable_signal";
            return line(cp.x, cp.y, ep.x, ep.y, isTransferable ? "#60a5fa" : "#5eead4", 0.5, isTransferable ? "5 4" : undefined);
          })}

          {/* Role → requirement edges + requirement → personal capability bridges */}
          {selectedRole &&
            selectedRoleRequirements.map((req) => {
              const rp = reqPositions.get(req.id);
              if (!rp) return null;
              const cfg = reqStateConfig[req.requirementState];
              const cp = req.requirementState !== "evidence_not_yet_shown"
                ? capabilityPositions.get(req.capabilityId)
                : undefined;
              const showBridge = cp !== undefined && visibleCapabilityIds.has(req.capabilityId);
              return (
                <React.Fragment key={`edges-req-${req.id}`}>
                  <line x1={rolePositions.get(selectedRole.id)?.x} y1={rolePositions.get(selectedRole.id)?.y} x2={rp.x} y2={rp.y} stroke={cfg.edgeStroke} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray={cfg.edgeDash} />
                  {showBridge && cp && (
                    <line x1={rp.x} y1={rp.y} x2={cp.x} y2={cp.y} stroke={cfg.edgeStroke} strokeOpacity={0.35} strokeWidth={1.1} strokeDasharray={cfg.edgeDash} />
                  )}
                </React.Fragment>
              );
            })
          }
        </svg>

        {/* ── You node ──────────────────────────────────────────────── */}
        <div
          style={positionStyle({ x: CX, y: CY })}
          className="absolute z-10 flex h-28 w-28 flex-col items-center justify-center rounded-full border border-cyan-100/35 bg-[#0a202c]/95 text-center shadow-[0_0_42px_rgba(34,211,238,0.16)]"
          aria-label="You — your experience core"
          data-node-type="user"
          data-node-id="user"
        >
          <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Your career</span>
          <span className="mt-1 text-sm font-semibold text-slate-100">You</span>
        </div>

        {/* ── Family nodes ──────────────────────────────────────────── */}
        {familyNodes.map((fam, fi) => {
          const fp = familyPositions[fi]!;
          const isSelected = fam.id === selectedFamilyId;
          return (
            <button
              key={fam.id}
              type="button"
              onClick={() => selectFamily(fam.id)}
              aria-pressed={isSelected}
              aria-label={`${fam.label} capability family${isSelected ? " — selected" : ""}`}
              data-node-type="capability_family"
              data-node-id={fam.id}
              style={positionStyle(fp)}
              className={`absolute z-20 w-36 rounded-2xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                isSelected
                  ? "border-cyan-200/70 bg-[#0e2832] shadow-[0_0_28px_rgba(34,211,238,0.22)]"
                  : "border-cyan-100/20 bg-[#0b1826] text-slate-300 hover:border-cyan-200/35"
              }`}
            >
              <span className="block text-[8px] font-semibold uppercase tracking-wider text-cyan-300/70">Family</span>
              <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-100">{fam.label}</span>
              <span className="mt-1 block text-[9px] text-cyan-200/60">{fam.capabilityIds.length} {fam.capabilityIds.length === 1 ? "capability" : "capabilities"}</span>
            </button>
          );
        })}

        {/* ── Visible personal capability nodes ─────────────────────── */}
        {visibleCapabilities.map((cap) => {
          const cp = capabilityPositions.get(cap.id);
          if (!cp) return null;
          const isSelected = cap.id === selectedCapabilityId;
          const isRoleReferenced = roleReferencedCapabilityIds.has(cap.id);
          const reqForCap = selectedRoleRequirements.find((r) => r.capabilityId === cap.id);
          const reqState = reqForCap?.requirementState;
          const roleHighlight = Boolean(selectedRole && isRoleReferenced && reqState && reqState !== "evidence_not_yet_shown");
          return (
            <button
              key={cap.id}
              type="button"
              onClick={() => selectCapability(cap.id)}
              aria-pressed={isSelected}
              aria-label={`${cap.label} capability${isSelected ? " — selected" : ""}${roleHighlight ? `, ${reqState === "directly_demonstrated" ? "directly demonstrated" : "transferable signal"} for role` : ""}`}
              data-node-type="capability"
              data-node-id={cap.id}
              data-family-id={cap.familyId}
              style={positionStyle(cp)}
              className={`absolute z-30 w-28 rounded-2xl border px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                isSelected
                  ? "border-cyan-100/65 bg-[#12313b] text-white shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                  : reqState === "directly_demonstrated" && selectedRole
                  ? "border-teal-200/55 bg-[#0e2e2b] text-white shadow-[0_0_16px_rgba(94,234,212,0.12)]"
                  : reqState === "transferable_signal" && selectedRole
                  ? "border-blue-300/45 bg-[#0e1e36] text-blue-50"
                  : "border-cyan-100/18 bg-[#0b1826] text-slate-300 hover:border-cyan-200/30"
              }`}
            >
              <span className="block text-[8px] uppercase tracking-wider text-cyan-300/60">{cap.familyId.replace(/-/g, " ")}</span>
              <span className="block text-xs font-semibold leading-4 text-slate-100">{cap.label}</span>
              <span className={`mt-1 flex items-center gap-1 text-[9px] uppercase tracking-wider ${
                reqState === "directly_demonstrated" && selectedRole ? "text-teal-300" :
                reqState === "transferable_signal" && selectedRole ? "text-blue-300" :
                "text-cyan-200/60"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  reqState === "directly_demonstrated" && selectedRole ? "bg-teal-300" :
                  reqState === "transferable_signal" && selectedRole ? "bg-blue-300" :
                  "bg-cyan-300/50"
                }`} />
                {cap.evidenceIds.length} {cap.evidenceIds.length === 1 ? "evidence" : "evidence items"}
              </span>
            </button>
          );
        })}

        {/* ── Evidence nodes ────────────────────────────────────────── */}
        {visibleEvidence.map((ev) => {
          const ep = evidencePositions.get(ev.id);
          if (!ep) return null;
          const isTransferable = ev.relationship === "transferable_signal";
          return (
            <div
              key={ev.id}
              data-node-type="evidence"
              data-node-id={ev.id}
              style={positionStyle(ep)}
              className={`absolute z-40 w-40 rounded-xl border px-3 py-2 text-left ${
                isTransferable
                  ? "border-blue-300/35 bg-[#0e1e36] text-blue-50"
                  : "border-violet-300/35 bg-[#13121d]/95 text-slate-100"
              }`}
            >
              <span className={`block text-[8px] font-semibold uppercase tracking-wider ${isTransferable ? "text-blue-300" : "text-violet-300"}`}>
                {isTransferable ? "Transferable signal" : "Direct evidence"}
              </span>
              <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-slate-200">{ev.text}</p>
            </div>
          );
        })}

        {/* ── Role node ─────────────────────────────────────────────── */}
        {hasRole && roleNodes.map((role, index) => {
          const position = rolePositions.get(role.id);
          if (!position) return null;
          const isSelected = role.id === selectedRoleId;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => toggleRole(role.id)}
              aria-pressed={isSelected}
              aria-label={`${role.title} role — ${isSelected ? "hide" : "show"} requirements`}
              data-node-type="role"
              data-node-id={role.id}
              data-proximity-rank={role.proximityRank ?? index}
              data-display-radius={position.radius}
              style={positionStyle(position)}
              className={`absolute z-20 w-36 rounded-2xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                isSelected
                  ? "border-cyan-200/45 bg-[#102b37] shadow-[0_0_24px_rgba(56,189,248,0.14)]"
                  : "border-blue-200/20 bg-[#0b1725] hover:border-blue-200/35"
              }`}
            >
              <span className="block text-[8px] font-semibold uppercase tracking-wider text-blue-300">Generic role</span>
              <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-slate-100">{role.title}</span>
            </button>
          );
        })}

        {/* ── Role requirement nodes ─────────────────────────────────── */}
        {selectedRole && selectedRoleRequirements.map((req) => {
          const rp = reqPositions.get(req.id);
          if (!rp) return null;
          const cfg = reqStateConfig[req.requirementState];
          const isUnsupported = req.requirementState === "evidence_not_yet_shown";
          return (
            <div
              key={req.id}
              data-node-type="role_requirement"
              data-node-id={req.id}
              data-requirement-state={req.requirementState}
              style={{
                ...positionStyle(rp),
                border: `1px solid ${cfg.stroke}`,
                background: isUnsupported ? "transparent" : cfg.fill,
              }}
              className="absolute z-30 w-32 rounded-xl px-2.5 py-2 text-left"
            >
              <span className="block text-[8px] font-semibold uppercase tracking-wider" style={{ color: cfg.textColor }}>{cfg.badge}</span>
              <span className="mt-0.5 block text-[10px] font-medium leading-3 text-slate-200">{req.capabilityLabel}</span>
              <span className="mt-1 block text-[8px] uppercase tracking-wider text-slate-500">{req.importance}</span>
            </div>
          );
        })}
      </div>

      {/* ── Mobile list fallback ───────────────────────────────────── */}
      <div className="border-t border-white/[0.06] md:hidden">
        <div className="p-4">
          <div
            className="mb-4 rounded-2xl border border-cyan-100/25 bg-[#0a202c] px-4 py-3 text-center"
            aria-label="You — your experience core"
            data-node-type="user"
            data-node-id="user"
          >
            <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Your career</span>
            <span className="mt-1 block text-sm font-semibold text-slate-100">You</span>
            <span className="mt-1 block text-[10px] text-slate-400">Your evidence-backed capability areas</span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Explore a capability family</p>
          <div className="mt-3 grid gap-2">
            {familyNodes.map((fam) => {
              const isSelected = fam.id === selectedFamilyId;
              const familyCapabilities = capabilityNodes.filter((capability) => capability.familyId === fam.id);
              return (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => selectFamily(fam.id)}
                  aria-pressed={isSelected}
                  data-node-type="capability_family"
                  data-node-id={fam.id}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                    isSelected ? "border-cyan-200 bg-cyan-300 text-[#061018]" : "border-white/10 bg-white/[0.03] text-slate-300"
                  }`}
                >
                  <span className="block font-medium">{fam.label}</span>
                  <span className="mt-0.5 block text-[10px] opacity-70">{fam.capabilityIds.length} {fam.capabilityIds.length === 1 ? "capability" : "capabilities"}</span>
                  <span className="mt-1.5 block text-[10px] leading-4 opacity-80">
                    {familyCapabilities.map((capability) => capability.label).join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedFamilyId && visibleCapabilities.filter((c) => selectedFamilyCapabilityIds.has(c.id)).length > 0 && (
          <div className="border-t border-white/[0.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Capabilities in this family</p>
            <div className="mt-3 grid gap-2">
              {visibleCapabilities
                .filter((c) => selectedFamilyCapabilityIds.has(c.id))
                .map((cap) => {
                  const isSelected = cap.id === selectedCapabilityId;
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => selectCapability(cap.id)}
                      aria-pressed={isSelected}
                      data-node-type="capability"
                      data-node-id={cap.id}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                        isSelected ? "border-cyan-200/60 bg-[#12313b] text-white" : "border-white/10 bg-white/[0.03] text-slate-300"
                      }`}
                    >
                      <span className="block font-medium">{cap.label}</span>
                      <span className="mt-0.5 block text-[10px] opacity-70">{cap.evidenceIds.length} supporting {cap.evidenceIds.length === 1 ? "item" : "items"}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {selectedCapabilityId && visibleEvidence.length > 0 && (
          <div className="border-t border-white/[0.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Supporting evidence</p>
            <div className="mt-3 grid gap-2">
              {visibleEvidence.map((ev) => {
                const isTransferable = ev.relationship === "transferable_signal";
                return (
                  <div
                    key={ev.id}
                    data-node-type="evidence"
                    data-node-id={ev.id}
                    className={`rounded-xl border px-3 py-2.5 text-xs ${
                      isTransferable ? "border-blue-300/30 bg-blue-300/[0.04]" : "border-violet-300/25 bg-violet-300/[0.04]"
                    }`}
                  >
                    <span className={`block text-[9px] font-semibold uppercase tracking-wider ${isTransferable ? "text-blue-300" : "text-violet-300"}`}>
                      {isTransferable ? "Transferable" : "Direct evidence"}
                    </span>
                    <p className="mt-1 leading-5 text-slate-200">{ev.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasRole && (
          <div className="border-t border-white/[0.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Generic roles</p>
            <div className="mt-2 grid gap-2">
              {roleNodes.map((role, index) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    aria-pressed={isSelected}
                    data-node-type="role"
                    data-node-id={role.id}
                    data-proximity-rank={role.proximityRank ?? index}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected ? "border-cyan-200/40 bg-[#102b37]" : "border-blue-200/20 bg-blue-300/[0.035]"
                    }`}
                  >
                    <span className="block font-semibold text-slate-100">{role.title}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-400">{isSelected ? "Tap to hide requirements" : "Tap to see requirements"}</span>
                  </button>
                );
              })}
            </div>
            {selectedRole && selectedRoleRequirements.length > 0 && (
              <div className="mt-3 grid gap-2">
                {selectedRoleRequirements.map((req) => {
                  const cfg = reqStateConfig[req.requirementState];
                  return (
                    <div
                      key={req.id}
                      data-node-type="role_requirement"
                      data-node-id={req.id}
                      data-requirement-state={req.requirementState}
                      className="rounded-xl border px-3 py-2 text-xs"
                      style={{ borderColor: cfg.stroke, background: req.requirementState === "evidence_not_yet_shown" ? "transparent" : cfg.fill }}
                    >
                      <span className="block text-[9px] font-semibold uppercase tracking-wider" style={{ color: cfg.textColor }}>{cfg.badge}</span>
                      <span className="mt-0.5 block font-medium text-slate-100">{req.capabilityLabel}</span>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-500">{req.importance}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hint footer */}
      <div className="border-t border-white/[0.06] px-5 py-3 text-[10px] text-slate-600">
        Select a family to explore capabilities · Select a capability to reveal evidence · Select the role to see requirement context
      </div>
    </section>
  );
}
