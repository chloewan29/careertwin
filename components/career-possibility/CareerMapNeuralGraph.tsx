"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import type { CareerMapForceGraphHandle } from "./CareerMapForceGraph";
import type {
  CareerMapGraphProjection,
  CapabilityFamilyGraphNode,
  CapabilityGraphNode,
  EvidenceGraphNode,
  RoleGraphNode,
  RoleRequirementGraphNode,
} from "@/lib/career-possibility/career-map-graph-projection";
import {
  buildCareerGraphFocusSet,
  buildCareerGraphVisualModel,
  type CareerGraphVisualLink,
  type CareerGraphVisualNode,
  type CareerGraphVisualNodeType,
} from "@/lib/career-possibility/career-graph-visual-adapter";

const CareerMapForceGraph = dynamic(
  () => import("./CareerMapForceGraph").then((module) => module.CareerMapForceGraph),
  { ssr: false },
);

export type CareerMapNeuralGraphProps = {
  readonly projection: CareerMapGraphProjection;
};

type RenderNode = NodeObject<CareerGraphVisualNode> & {
  seedX: number;
  seedY: number;
  clusterId?: string;
};
type RenderLink = LinkObject<CareerGraphVisualNode, CareerGraphVisualLink>;

const palette: Record<CareerGraphVisualNodeType, string> = {
  YOU: "#eaffff",
  FAMILY: "#55d6d0",
  CAPABILITY: "#94e7b7",
  EVIDENCE: "#a78bfa",
  ROLE: "#ffb46d",
  ROLE_ONLY_CAPABILITY: "#8a99aa",
};

const nodeRadius: Record<CareerGraphVisualNodeType, number> = {
  YOU: 17,
  FAMILY: 10,
  CAPABILITY: 6.2,
  EVIDENCE: 2.4,
  ROLE: 10.5,
  ROLE_ONLY_CAPABILITY: 4.2,
};

const normallyLabelled = new Set<CareerGraphVisualNodeType>([
  "YOU",
  "FAMILY",
  "ROLE",
]);

function stableUnit(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function pointAt(angle: number, radius: number) {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function seedCareerGraphNodes(
  nodes: readonly CareerGraphVisualNode[],
): RenderNode[] {
  const seeded = nodes.map((node) => ({
    ...node,
    seedX: 0,
    seedY: 0,
    clusterId: node.familyId ?? node.familyIds?.[0],
  })) as RenderNode[];
  const byId = new Map(seeded.map((node) => [node.id, node]));
  const families = seeded.filter((node) => node.nodeType === "FAMILY");
  const roles = seeded.filter((node) => node.nodeType === "ROLE");

  const familyAngle = new Map<string, number>();

  seeded.forEach((node) => {
    if (node.nodeType === "YOU") {
      node.x = 0;
      node.y = 0;
      node.fx = 0;
      node.fy = 0;
      return;
    }
    if (node.nodeType === "FAMILY") {
      const index = families.indexOf(node);
      const angle = -1.45
        + (Math.PI * 2 * index) / Math.max(families.length, 1)
        + (stableUnit(`family-angle:${node.id}`) - 0.5) * 0.55;
      const radius = 142 + stableUnit(`family-radius:${node.id}`) * 50;
      const point = pointAt(angle, radius);
      familyAngle.set(node.id, angle);
      node.x = point.x;
      node.y = point.y;
      node.seedX = point.x;
      node.seedY = point.y;
      return;
    }
    if (node.nodeType === "ROLE") {
      const index = roles.indexOf(node);
      const rank = node.proximityRank ?? index;
      const radius = 420 + rank * 18 + stableUnit(`role-radius:${node.id}`) * 14;
      const angle = 0.08
        + (Math.PI * 2 * index) / Math.max(roles.length, 1)
        + (stableUnit(`role-angle:${node.id}`) - 0.5) * 0.9;
      const point = pointAt(angle, radius);
      node.x = point.x;
      node.y = point.y;
      node.seedX = point.x;
      node.seedY = point.y;
    }
  });

  seeded
    .filter((node) => node.nodeType === "CAPABILITY")
    .forEach((node) => {
      const parent = byId.get(node.parentIds?.[0] ?? "");
      const baseAngle = familyAngle.get(node.familyId ?? "")
        ?? (parent ? Math.atan2(parent.y ?? 0, parent.x ?? 1) : stableUnit(node.id) * Math.PI * 2);
      const spread = (stableUnit(`capability:${node.id}`) - 0.5) * 1.05;
      const distance = 82 + stableUnit(`capability-radius:${node.id}`) * 34;
      const point = pointAt(baseAngle + spread, distance);
      node.x = (parent?.x ?? 0) + point.x;
      node.y = (parent?.y ?? 0) + point.y;
      node.seedX = node.x;
      node.seedY = node.y;
    });

  seeded
    .filter((node) => node.nodeType === "EVIDENCE")
    .forEach((node) => {
      const parents = (node.parentIds ?? []).map((id) => byId.get(id)).filter(Boolean) as RenderNode[];
      const parentX = parents.reduce((total, parent) => total + (parent.x ?? 0), 0) / Math.max(parents.length, 1);
      const parentY = parents.reduce((total, parent) => total + (parent.y ?? 0), 0) / Math.max(parents.length, 1);
      const baseAngle = familyAngle.get(node.familyId ?? "") ?? Math.atan2(parentY, parentX || 1);
      const spread = (stableUnit(`evidence:${node.id}`) - 0.5) * 0.9;
      const distance = 58 + stableUnit(`evidence-radius:${node.id}`) * 38;
      const point = pointAt(baseAngle + spread, distance);
      node.x = parentX + point.x;
      node.y = parentY + point.y;
      node.seedX = node.x;
      node.seedY = node.y;
    });

  seeded
    .filter((node) => node.nodeType === "ROLE_ONLY_CAPABILITY")
    .forEach((node) => {
      const parents = (node.parentIds ?? []).map((id) => byId.get(id)).filter(Boolean) as RenderNode[];
      const parent = parents[0];
      const baseAngle = parent ? Math.atan2(parent.y ?? 0, parent.x ?? 1) : stableUnit(node.id) * Math.PI * 2;
      const point = pointAt(baseAngle + (stableUnit(node.id) - 0.5) * 0.95, 68);
      node.x = (parent?.x ?? 0) + point.x;
      node.y = (parent?.y ?? 0) + point.y;
      node.seedX = node.x;
      node.seedY = node.y;
    });

  return seeded;
}

function endpointId(endpoint: unknown): string {
  if (typeof endpoint === "object" && endpoint !== null && "id" in endpoint) {
    return String(endpoint.id);
  }
  return String(endpoint);
}

function projectionNodeType(nodeType: CareerGraphVisualNodeType): string {
  if (nodeType === "YOU") return "user";
  if (nodeType === "FAMILY") return "capability_family";
  if (nodeType === "ROLE_ONLY_CAPABILITY") return "role_requirement";
  return nodeType.toLowerCase();
}

function typeName(nodeType: CareerGraphVisualNodeType): string {
  if (nodeType === "YOU") return "Career core";
  if (nodeType === "ROLE_ONLY_CAPABILITY") return "Capability beyond your current evidence";
  return nodeType.charAt(0) + nodeType.slice(1).toLowerCase();
}

function nodeLabel(node: CareerGraphVisualNode): string {
  return node.label ?? (node.nodeType === "EVIDENCE" ? "Evidence" : node.semanticId);
}

function concreteEvidenceExcerpt(text: string, maximumLength = 156): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const sentenceEnd = normalized.search(/[.!?](?:\s|$)/);
  if (sentenceEnd >= 36 && sentenceEnd + 1 <= maximumLength) {
    return normalized.slice(0, sentenceEnd + 1);
  }
  if (normalized.length <= maximumLength) return normalized;
  const clipped = normalized.slice(0, maximumLength - 1);
  const lastWordBoundary = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, Math.max(lastWordBoundary, maximumLength - 24)).trimEnd()}…`;
}

function splitCanvasLabel(label: string, compact = false): readonly string[] {
  const singleLineLimit = compact ? 13 : 18;
  if (label.length <= singleLineLimit) return [label];
  const words = label.split(" ");
  const first: string[] = [];
  const second: string[] = [];
  for (const word of words) {
    const destination = first.join(" ").length < (compact ? 9 : 13) ? first : second;
    destination.push(word);
  }
  return second.length > 0 ? [first.join(" "), second.join(" ")] : [label];
}

function SelectedNodeDetail({
  projection,
  selected,
  onSelect,
}: {
  projection: CareerMapGraphProjection;
  selected: CareerGraphVisualNode | null;
  onSelect: (id: string) => void;
}) {
  const families = projection.nodes.filter(
    (node): node is CapabilityFamilyGraphNode => node.type === "capability_family",
  );
  const capabilities = projection.nodes.filter(
    (node): node is CapabilityGraphNode => node.type === "capability",
  );
  const evidence = projection.nodes.filter(
    (node): node is EvidenceGraphNode => node.type === "evidence",
  );
  const roles = projection.nodes.filter(
    (node): node is RoleGraphNode => node.type === "role",
  );
  const requirements = projection.nodes.filter(
    (node): node is RoleRequirementGraphNode => node.type === "role_requirement",
  );

  if (!selected) {
    return null;
  }

  if (selected.nodeType === "FAMILY") {
    const family = families.find((item) => item.id === selected.semanticId);
    const familyCapabilities = capabilities.filter((item) => item.familyId === selected.semanticId);
    return (
      <div className="py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Capability family</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-cyan-50">{family?.label}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {familyCapabilities.map((capability) => (
            <button key={capability.id} type="button" onClick={() => onSelect(capability.id)} className="min-h-11 rounded-full border border-emerald-200/20 px-4 text-sm text-emerald-50 transition-colors hover:border-emerald-200/50 hover:bg-emerald-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              {capability.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (selected.nodeType === "CAPABILITY") {
    const capability = capabilities.find((item) => item.id === selected.semanticId);
    const family = families.find((item) => item.id === capability?.familyId);
    const supportingEvidence = evidence.filter((item) => capability?.evidenceIds.includes(item.id));
    return (
      <div className="py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{family?.label ?? "Capability"}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-cyan-50">{capability?.label}</h3>
        <p className="mt-2 text-sm text-cyan-50/65">{supportingEvidence.length} supporting evidence {supportingEvidence.length === 1 ? "signal" : "signals"}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {supportingEvidence.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelect(item.id)} className="min-h-11 rounded-xl bg-white/[0.045] px-4 py-3 text-left text-sm text-cyan-50/80 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              {item.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (selected.nodeType === "EVIDENCE") {
    const item = evidence.find((node) => node.id === selected.semanticId);
    return (
      <div className="max-w-3xl py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Evidence detail</p>
        <p className="mt-3 text-base leading-7 text-cyan-50/90">{item?.text}</p>
        <p className="mt-3 text-sm text-violet-100/65">{item?.relationship === "direct_evidence" ? "Direct evidence" : "Transferable signal"}</p>
      </div>
    );
  }

  if (selected.nodeType === "ROLE") {
    const role = roles.find((item) => item.id === selected.semanticId);
    const roleRequirements = requirements.filter((item) => item.roleId === selected.semanticId);
    const owned = roleRequirements.filter((item) => item.requirementState !== "evidence_not_yet_shown");
    const beyond = roleRequirements.filter((item) => item.requirementState === "evidence_not_yet_shown");
    return (
      <div className="py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">Future role · path {typeof role?.proximityRank === "number" ? role.proximityRank + 1 : ""}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-cyan-50">{role?.title}</h3>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-emerald-200">What you already bring</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {owned.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.capabilityId)} className="min-h-11 rounded-full bg-emerald-200/10 px-4 text-sm text-emerald-50 hover:bg-emerald-200/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{item.capabilityLabel}</button>)}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">What this role requires beyond you</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {beyond.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.capabilityId)} className="min-h-11 rounded-full border border-dashed border-slate-300/30 px-4 text-sm text-slate-100 hover:border-slate-200/60 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{item.capabilityLabel}</button>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const relatedRoles = roles.filter((role) => selected.roleIds?.includes(role.id));
  return (
    <div className="py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Beyond your current evidence</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-cyan-50">{selected.label}</h3>
      <p className="mt-3 text-sm text-cyan-50/65">Required by {relatedRoles.map((role) => role.title).join(", ")}.</p>
    </div>
  );
}

export function CareerMapNeuralGraph({ projection }: CareerMapNeuralGraphProps) {
  const visualModel = useMemo(() => buildCareerGraphVisualModel(projection), [projection]);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const graphData = useMemo(
    () => {
      void layoutRevision;
      return {
        nodes: seedCareerGraphNodes(visualModel.nodes),
        links: visualModel.links.map((link) => ({ ...link })) as RenderLink[],
      };
    },
    [visualModel, layoutRevision],
  );
  const graphRef = useRef<CareerMapForceGraphHandle | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  const focusId = hoveredId ?? selectedId;
  const focusSet = useMemo(
    () => buildCareerGraphFocusSet(visualModel, focusId),
    [visualModel, focusId],
  );
  const selectedNode = visualModel.nodes.find((node) => node.id === selectedId) ?? null;
  const hoveredNode = visualModel.nodes.find((node) => node.id === hoveredId) ?? null;
  const evidenceTextById = useMemo(
    () => new Map(
      projection.nodes
        .filter((node): node is EvidenceGraphNode => node.type === "evidence")
        .map((node) => [node.id, concreteEvidenceExcerpt(node.text)] as const),
    ),
    [projection],
  );
  const hoveredEvidenceText = hoveredNode?.nodeType === "EVIDENCE"
    ? evidenceTextById.get(hoveredNode.semanticId)
    : undefined;
  const hasRole = visualModel.nodes.some((node) => node.nodeType === "ROLE");
  const connectGraph = useCallback((instance: CareerMapForceGraphHandle | null) => {
    graphRef.current = instance;
    if (instance) setEngineReady(true);
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setDimensions({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(520, Math.floor(entry.contentRect.height)),
      });
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const layoutScale = dimensions.width < 600 ? 0.72 : 1;
    const horizontalScale = dimensions.width >= 900 ? 1.28 : 1;
    const verticalScale = dimensions.width >= 900 ? 0.82 : 1;

    const charge = graph.d3Force("charge") as
      | { strength: (value: (node: RenderNode) => number) => unknown }
      | undefined;
    charge?.strength((node) => {
      if (node.nodeType === "YOU") return -340;
      if (node.nodeType === "ROLE") return -180;
      if (node.nodeType === "FAMILY") return -130;
      if (node.nodeType === "EVIDENCE") return -24;
      if (node.nodeType === "ROLE_ONLY_CAPABILITY") return -42;
      return -76;
    });

    const linkForce = graph.d3Force("link") as
      | {
          distance: (value: (link: RenderLink) => number) => unknown;
          strength: (value: (link: RenderLink) => number) => unknown;
        }
      | undefined;
    linkForce
      ?.distance((link) => {
        if (link.linkType === "USER_FAMILY") return 155 * layoutScale;
        if (link.linkType === "FAMILY_CAPABILITY") return 104 * layoutScale;
        if (link.linkType === "CAPABILITY_EVIDENCE") return 72 * layoutScale;
        if (link.linkType === "ROLE_OWNED_CAPABILITY") return 340 * layoutScale;
        if (link.linkType === "ROLE_ONLY_CAPABILITY") return 72 * layoutScale;
        return 96 * layoutScale;
      });
    linkForce
      ?.strength((link) => {
        if (link.linkType === "CAPABILITY_EVIDENCE") return 0.38;
        if (link.linkType === "ROLE_ONLY_CAPABILITY") return 0.62;
        if (link.linkType === "ROLE_OWNED_CAPABILITY") return 0.012;
        return 0.42;
      });

    let forceNodes: RenderNode[] = [];
    const semanticForce = (alpha: number) => {
      for (const node of forceNodes) {
        if (node.nodeType === "YOU") continue;
        const attraction = node.nodeType === "ROLE"
          ? 0.76
          : node.nodeType === "FAMILY"
            ? 0.44
            : node.nodeType === "ROLE_ONLY_CAPABILITY"
              ? 0.36
              : node.nodeType === "CAPABILITY"
                ? 0.32
                : 0.42;
        node.vx = (node.vx ?? 0) + (node.seedX * layoutScale * horizontalScale - (node.x ?? 0)) * attraction * alpha;
        node.vy = (node.vy ?? 0) + (node.seedY * layoutScale * verticalScale - (node.y ?? 0)) * attraction * alpha;
      }

      for (let leftIndex = 0; leftIndex < forceNodes.length; leftIndex += 1) {
        const left = forceNodes[leftIndex]!;
        for (let rightIndex = leftIndex + 1; rightIndex < forceNodes.length; rightIndex += 1) {
          const right = forceNodes[rightIndex]!;
          const dx = (right.x ?? 0) - (left.x ?? 0);
          const dy = (right.y ?? 0) - (left.y ?? 0);
          const distance = Math.max(0.01, Math.hypot(dx, dy));
          const differentClusters = left.clusterId && right.clusterId && left.clusterId !== right.clusterId;
          const minimum = nodeRadius[left.nodeType] + nodeRadius[right.nodeType]
            + (left.nodeType === "ROLE" || right.nodeType === "ROLE" ? 34 : 16)
            + (differentClusters ? 12 : 0);
          if (distance >= minimum) continue;
          const pressure = ((minimum - distance) / distance) * 0.22 * alpha;
          const pushX = dx * pressure;
          const pushY = dy * pressure;
          if (left.nodeType !== "YOU") {
            left.vx = (left.vx ?? 0) - pushX;
            left.vy = (left.vy ?? 0) - pushY;
          }
          if (right.nodeType !== "YOU") {
            right.vx = (right.vx ?? 0) + pushX;
            right.vy = (right.vy ?? 0) + pushY;
          }
        }
      }
    };
    semanticForce.initialize = (nodes: NodeObject<CareerGraphVisualNode>[]) => {
      forceNodes = nodes as RenderNode[];
    };
    graph.d3Force("career-semantic-bias", semanticForce);
    graph.d3ReheatSimulation();

    return () => {
      graph.d3Force("career-semantic-bias", null);
    };
  }, [dimensions.width, engineReady, graphData]);

  const hoverNode = useCallback((node: NodeObject<CareerGraphVisualNode> | null) => {
    if (!node) {
      setHoveredId(null);
      setHoverPosition(null);
      return;
    }
    setHoveredId(String(node.id));
    let position = { x: dimensions.width / 2, y: dimensions.height / 2 };
    try {
      if (node.x !== undefined && node.y !== undefined && graphRef.current?.graph2ScreenCoords) {
        position = graphRef.current.graph2ScreenCoords(node.x, node.y);
      }
    } catch {
      // The DOM navigator still gets a stable in-field position if the engine is between frames.
    }
    setHoverPosition({
      x: Math.min(Math.max(position.x, 160), Math.max(160, dimensions.width - 160)),
      y: Math.min(Math.max(position.y, 110), dimensions.height - 24),
    });
  }, [dimensions.height, dimensions.width]);

  const selectNode = useCallback((id: string) => {
    setSelectedId((current) => current === id ? null : id);
    const node = graphData.nodes.find((candidate) => candidate.id === id);
    if (node?.x !== undefined && node.y !== undefined) {
      graphRef.current?.centerAt(node.x, node.y, 420);
      if ((graphRef.current?.zoom() ?? 1) < 1.35) graphRef.current?.zoom(1.35, 420);
    }
  }, [graphData.nodes]);

  const resetGraph = useCallback(() => {
    setSelectedId(null);
    setHoveredId(null);
    setSettled(false);
    setLayoutRevision((revision) => revision + 1);
  }, []);

  const drawNode = useCallback((
    node: NodeObject<CareerGraphVisualNode>,
    context: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const active = !focusSet || focusSet.has(node.id as string);
    const radius = nodeRadius[node.nodeType];
    const selected = node.id === selectedId;
    const hovered = node.id === hoveredId;
    context.save();
    context.globalAlpha = active ? 1 : 0.12;
    context.shadowColor = selected || hovered ? palette[node.nodeType] : "transparent";
    context.shadowBlur = selected || hovered ? 16 : 0;
    context.beginPath();
    context.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
    if (node.nodeType === "ROLE_ONLY_CAPABILITY" || (node.nodeType === "EVIDENCE" && node.relationship === "transferable_signal")) {
      context.strokeStyle = palette[node.nodeType];
      context.lineWidth = node.nodeType === "ROLE_ONLY_CAPABILITY" ? 1.5 : 1.1;
      context.stroke();
    } else {
      context.fillStyle = palette[node.nodeType];
      context.fill();
    }

    if (node.nodeType === "YOU" || node.nodeType === "ROLE" || selected) {
      context.beginPath();
      context.arc(node.x ?? 0, node.y ?? 0, radius + (node.nodeType === "YOU" ? 7 : 4.5), 0, Math.PI * 2);
      context.strokeStyle = `${palette[node.nodeType]}66`;
      context.lineWidth = node.nodeType === "YOU" ? 2.2 : 1.4;
      context.stroke();
    }

    const compact = dimensions.width < 600;
    const showLabel = normallyLabelled.has(node.nodeType)
      || selected
      || hovered
      || (node.nodeType === "CAPABILITY" && globalScale > 2.15)
      || (node.nodeType === "ROLE_ONLY_CAPABILITY" && globalScale > 3.2);
    if (showLabel && node.label) {
      const screenFontSize = compact ? 9.5 : node.nodeType === "YOU" ? 13 : node.nodeType === "FAMILY" || node.nodeType === "ROLE" ? 11 : 9.5;
      const fontSize = screenFontSize / globalScale;
      context.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      const outward = !compact && (node.nodeType === "FAMILY" || node.nodeType === "ROLE");
      const rightSide = (node.x ?? 0) >= 0;
      context.textAlign = outward ? rightSide ? "left" : "right" : "center";
      context.textBaseline = outward ? "middle" : "top";
      context.fillStyle = active ? "#e7f7f6" : "#53686a";
      const labelLines = splitCanvasLabel(node.label, compact);
      labelLines.forEach((line, index) => {
        const labelX = (node.x ?? 0) + (outward ? (rightSide ? radius + 7 : -radius - 7) : 0);
        const labelY = outward
          ? (node.y ?? 0) + (index - (labelLines.length - 1) / 2) * (fontSize + 2)
          : (node.y ?? 0) + radius + 6 + index * (fontSize + 2);
        context.fillText(line, labelX, labelY);
      });
    }
    context.restore();
  }, [dimensions.width, focusSet, hoveredId, selectedId]);

  const paintPointerArea = useCallback((
    node: NodeObject<CareerGraphVisualNode>,
    color: string,
    context: CanvasRenderingContext2D,
  ) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(node.x ?? 0, node.y ?? 0, Math.max(7, nodeRadius[node.nodeType]), 0, Math.PI * 2);
    context.fill();
  }, []);

  return (
    <section
      aria-label="Interactive Career Map capability universe"
      className="flex h-full min-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-2xl bg-[#061012] text-cyan-50 shadow-[0_36px_110px_-58px_rgba(45,212,191,0.55)]"
      data-graph-node-count={visualModel.nodes.length}
      data-graph-link-count={visualModel.links.length}
      data-graph-status={settled ? "settled" : "forming"}
    >
      <div
        ref={fieldRef}
        role="application"
        aria-label="Career Map graph. Pan and zoom the field, or use Browse map for keyboard navigation."
        className="relative min-h-[620px] flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(20,91,88,0.18),transparent_48%),linear-gradient(180deg,#071416_0%,#061012_100%)] sm:min-h-[680px]"
      >
        <CareerMapForceGraph
          ref={connectGraph}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={paintPointerArea}
          nodeLabel={(node) => node.nodeType === "EVIDENCE"
            ? evidenceTextById.get(node.semanticId) ?? "Evidence"
            : nodeLabel(node)}
          linkColor={(link) => {
            const source = endpointId(link.source);
            const target = endpointId(link.target);
            const active = !focusSet || (focusSet.has(source) && focusSet.has(target));
            if (!active) return "rgba(116,148,148,0.025)";
            if (link.linkType === "ROLE_OWNED_CAPABILITY") return "rgba(255,180,109,0.34)";
            if (link.linkType === "ROLE_ONLY_CAPABILITY") return "rgba(148,163,184,0.32)";
            if (link.linkType === "CAPABILITY_EVIDENCE") return "rgba(167,139,250,0.25)";
            return "rgba(105,220,204,0.22)";
          }}
          linkLineDash={(link) => link.linkType === "ROLE_ONLY_CAPABILITY" || link.requirementState === "transferable_signal" ? [4, 4] : null}
          linkWidth={(link) => link.linkType.startsWith("ROLE_") ? 1.15 : 0.72}
          onNodeHover={hoverNode}
          onNodeClick={(node) => selectNode(String(node.id))}
          onBackgroundClick={() => setSelectedId(null)}
          onNodeDragEnd={(node) => {
            if (node.nodeType === "YOU") return;
            node.fx = node.x;
            node.fy = node.y;
          }}
          onZoom={({ k }) => setZoom(k)}
          onEngineStop={() => {
            setSettled(true);
            graphRef.current?.zoomToFit(700, dimensions.width < 600 ? 20 : 52);
          }}
          enableNodeDrag
          enablePanInteraction
          enableZoomInteraction
          minZoom={0.3}
          maxZoom={7}
          cooldownTicks={190}
          cooldownTime={5200}
          d3AlphaDecay={0.028}
          d3VelocityDecay={0.34}
        />

        <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
          <span className="hidden items-center gap-2 rounded-full bg-[#071214]/90 px-3 py-2 text-xs text-cyan-50/65 sm:flex" aria-live="polite">
            <i className={`h-2 w-2 rounded-full ${settled ? "bg-teal-300" : "animate-pulse bg-orange-300"}`} aria-hidden="true" />
            {settled ? "Map settled" : "Map forming"}
          </span>
          <button type="button" onClick={resetGraph} className="min-h-11 rounded-full bg-[#071214]/90 px-4 text-sm font-medium text-cyan-50 transition-colors hover:bg-[#102426] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            Reset view
          </button>
        </div>

        <details className="group absolute left-3 top-3 z-30 sm:left-4 sm:top-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full bg-[#071214]/90 px-4 text-sm font-medium text-cyan-50/80 transition-colors hover:bg-[#102426] hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Browse map</summary>
          <div className="absolute left-0 top-12 grid max-h-[min(70vh,34rem)] w-[min(22rem,calc(100vw-2rem))] gap-5 overflow-y-auto rounded-xl bg-[#081517] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.48)] sm:grid-cols-2 sm:w-[34rem]">
            {(["FAMILY", "CAPABILITY", "ROLE", "EVIDENCE", "ROLE_ONLY_CAPABILITY"] as const).map((nodeType) => {
              const nodes = visualModel.nodes.filter((node) => node.nodeType === nodeType);
              if (nodes.length === 0) return null;
              return (
                <div key={nodeType}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/45">{typeName(nodeType)}</p>
                  <div className="mt-2 grid gap-1">
                    {nodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => selectNode(node.id)}
                        onFocus={() => hoverNode(graphData.nodes.find((candidate) => candidate.id === node.id) ?? null)}
                        onBlur={() => hoverNode(null)}
                        aria-pressed={selectedId === node.id}
                        data-node-type={projectionNodeType(node.nodeType)}
                        data-node-id={node.id}
                        data-requirement-state={node.nodeType === "ROLE_ONLY_CAPABILITY" ? node.requirementStates?.[0] : undefined}
                        className="min-h-11 rounded-lg px-3 py-2 text-left text-sm text-cyan-50/75 transition-colors hover:bg-white/[0.06] hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 aria-pressed:bg-cyan-100/10 aria-pressed:text-cyan-50"
                      >
                        {node.nodeType === "EVIDENCE"
                          ? evidenceTextById.get(node.semanticId) ?? "Evidence"
                          : nodeLabel(node)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        {hoveredEvidenceText && hoverPosition && (
          <div
            className="pointer-events-none absolute z-20 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-[calc(100%+0.875rem)] rounded-xl bg-[#121425] px-4 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.5)]"
            style={{ left: hoverPosition.x, top: hoverPosition.y }}
            role="status"
          >
            <p className="text-xs font-medium leading-5 text-violet-100">{hoveredEvidenceText}</p>
            <p className="mt-1 text-[11px] text-violet-200/55">Supporting experience</p>
          </div>
        )}

        {selectedNode && (
          <div className="absolute bottom-4 left-4 z-20 max-h-[42%] w-[min(44rem,calc(100%-2rem))] overflow-y-auto rounded-xl bg-[#081517]/95 px-4 shadow-[0_18px_55px_rgba(0,0,0,0.5)] sm:left-5 sm:px-5">
            <SelectedNodeDetail projection={projection} selected={selectedNode} onSelect={selectNode} />
          </div>
        )}

        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/30 px-3 py-1.5 text-xs tabular-nums text-cyan-50/55">{Math.round(zoom * 100)}%</span>
        <span className="sr-only">Accessible graph navigator is available from Browse map.</span>
      </div>
      <span className="sr-only">{hasRole ? "Future role paths are available in this map." : "No future role paths are available."}</span>
    </section>
  );
}
