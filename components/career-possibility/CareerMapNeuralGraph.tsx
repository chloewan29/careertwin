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
  buildCareerGraphRoleFocusState,
  buildCareerGraphTopologySeeds,
  buildCareerGraphVisualModel,
  type CareerGraphVisualLink,
  type CareerGraphVisualNode,
  type CareerGraphVisualNodeType,
  type CareerGraphRoleFocusState,
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
  YOU: 18,
  FAMILY: 10,
  CAPABILITY: 8.2,
  EVIDENCE: 2.4,
  ROLE: 7.4,
  ROLE_ONLY_CAPABILITY: 4.2,
};

const rolePresentation = {
  hoverRadiusBoost: 2.3,
  selectedRadiusBoost: 5.4,
  defaultOwnedLinkAlpha: 0.2,
  defaultGapLinkAlpha: 0.08,
  hoverOwnedLinkAlpha: 0.58,
  hoverGapLinkAlpha: 0.52,
  selectedOwnedLinkAlpha: 0.78,
  selectedGapLinkAlpha: 0.68,
  defaultLinkWidth: 0.58,
  hoverOwnedLinkWidth: 1.45,
  hoverGapLinkWidth: 1.3,
  selectedOwnedLinkWidth: 2.25,
  selectedGapLinkWidth: 1.85,
} as const;

const personalNetworkPresentation = {
  userFamilyLinkAlpha: 0.52,
  familyCapabilityLinkAlpha: 0.38,
  userFamilyLinkWidth: 1.45,
  familyCapabilityLinkWidth: 1.08,
  desktopCapabilityLabelZoom: 0.72,
  compactCapabilityLabelZoom: 2.15,
} as const;

const normallyLabelled = new Set<CareerGraphVisualNodeType>([
  "YOU",
  "FAMILY",
  "ROLE",
]);

function seedCareerGraphNodes(
  model: ReturnType<typeof buildCareerGraphVisualModel>,
  nodes: readonly CareerGraphVisualNode[],
): RenderNode[] {
  const topologySeeds = buildCareerGraphTopologySeeds(model);
  const seeded = nodes.map((node) => ({
    ...node,
    seedX: 0,
    seedY: 0,
    clusterId: node.familyId ?? node.familyIds?.[0],
  })) as RenderNode[];
  seeded.forEach((node) => {
    const seed = topologySeeds.get(node.id) ?? { x: 0, y: 0 };
    node.x = seed.x;
    node.y = seed.y;
    node.seedX = seed.x;
    node.seedY = seed.y;
    if (node.nodeType === "YOU") {
      node.fx = 0;
      node.fy = 0;
    }
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
  visualModel,
  selected,
  onSelect,
}: {
  projection: CareerMapGraphProjection;
  visualModel: ReturnType<typeof buildCareerGraphVisualModel>;
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
    const transferable = owned.filter((item) => item.requirementState === "transferable_signal");
    const visualNodeById = new Map(visualModel.nodes.map((node) => [node.id, node]));
    const requirementButton = (item: RoleRequirementGraphNode, kind: "owned" | "gap") => {
      const visual = visualNodeById.get(item.capabilityId);
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.capabilityId)}
          className={kind === "owned"
            ? "min-h-11 rounded-xl bg-emerald-200/10 px-3 py-2 text-left text-sm text-emerald-50 hover:bg-emerald-200/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            : "min-h-11 rounded-xl border border-dashed border-slate-300/35 px-3 py-2 text-left text-sm text-slate-100 hover:border-slate-200/60 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"}
        >
          <span className="block">{item.capabilityLabel}</span>
          {visual?.familyLabel && <span className="mt-0.5 block text-[11px] text-cyan-50/45">{visual.familyLabel}</span>}
        </button>
      );
    };
    return (
      <div className="py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">Future role · path {typeof role?.proximityRank === "number" ? role.proximityRank + 1 : ""}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-cyan-50">{role?.title}</h3>
        <p className="mt-1 text-sm text-cyan-50/60">
          {owned.length} {owned.length === 1 ? "strength" : "strengths"} · {beyond.length} {beyond.length === 1 ? "gap" : "gaps"}
          {transferable.length > 0 ? ` · ${transferable.length} transferable` : ""}
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-emerald-200">You bring</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {owned.map((item) => requirementButton(item, "owned"))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Build next</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {beyond.map((item) => requirementButton(item, "gap"))}
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

  const graphRef = useRef<CareerMapForceGraphHandle | null>(null);
  const focusFrameTimerRef = useRef<number | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const zoomLabelRef = useRef<HTMLSpanElement>(null);
  const frameNodesRef = useRef<NodeObject<CareerGraphVisualNode>[]>([]);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  const selectedNode = visualModel.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedRoleFocus = useMemo(
    () => selectedNode?.nodeType === "ROLE"
      ? buildCareerGraphRoleFocusState(visualModel, selectedNode.id)
      : null,
    [selectedNode, visualModel],
  );
  
  const graphData = useMemo(
    () => {
      void layoutRevision;
      
      const activeNodes = visualModel.nodes.filter(node => {
        if (node.nodeType === "ROLE_ONLY_CAPABILITY") {
          return selectedRoleFocus?.gapCapabilityIds.has(node.id) ?? false;
        }
        return true;
      });
      
      const activeLinks = visualModel.links.filter(link => {
        if (link.linkType === "ROLE_ONLY_CAPABILITY") {
          return selectedRoleFocus?.relevantLinkIds.has(link.id) ?? false;
        }
        return true;
      });
      
      return {
        nodes: seedCareerGraphNodes(visualModel, activeNodes),
        links: activeLinks.map((link) => ({ ...link })) as RenderLink[],
      };
    },
    [visualModel, layoutRevision, selectedRoleFocus],
  );
  const focusId = selectedRoleFocus?.roleId ?? hoveredId ?? selectedId;
  const focusSet = useMemo(
    () => selectedRoleFocus?.focusNodeIds ?? buildCareerGraphFocusSet(visualModel, focusId),
    [visualModel, focusId, selectedRoleFocus],
  );
  const hoveredNode = visualModel.nodes.find((node) => node.id === hoveredId) ?? null;
  const evidenceTextById = useMemo(
    () => new Map(
      projection.nodes
        .filter((node): node is EvidenceGraphNode => node.type === "evidence")
        .map((node) => [node.id, concreteEvidenceExcerpt(node.text)] as const),
    ),
    [projection],
  );
  const firstEvidenceIdByCapabilityId = useMemo(
    () => new Map(
      projection.nodes
        .filter((node): node is CapabilityGraphNode => node.type === "capability" && node.evidenceIds.length > 0)
        .map((node) => [node.id, node.evidenceIds[0]!] as const),
    ),
    [projection],
  );
  const hoveredEvidenceText = hoveredNode?.nodeType === "EVIDENCE"
    ? evidenceTextById.get(hoveredNode.semanticId)
    : hoveredNode?.nodeType === "CAPABILITY"
      ? evidenceTextById.get(firstEvidenceIdByCapabilityId.get(hoveredNode.semanticId) ?? "")
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

  useEffect(() => () => {
    if (focusFrameTimerRef.current !== null) window.clearTimeout(focusFrameTimerRef.current);
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
    const shortSide = Math.min(dimensions.width, dimensions.height);
    const baseScale = dimensions.width < 600 ? 0.85 : 1.0;
    const ownedRadius = Math.max(120, Math.min(180, shortSide * 0.26)) * baseScale;
    const familyRadius = Math.max(170, Math.min(250, shortSide * 0.35)) * baseScale;
    const evidenceRadius = Math.max(190, Math.min(300, ownedRadius + shortSide * 0.20)) * baseScale;
    const roleRadius = Math.max(400, Math.min(600, shortSide * 0.65)) * baseScale;
    const gapRadius = roleRadius + Math.max(110, Math.min(180, shortSide * 0.22)) * baseScale;

    const radial = d3Force.forceRadial<RenderNode>(
      (node) => {
        if (node.nodeType === "FAMILY") return familyRadius;
        if (node.nodeType === "CAPABILITY") return ownedRadius;
        if (node.nodeType === "EVIDENCE") return evidenceRadius;
        if (node.nodeType === "ROLE") return roleRadius;
        if (node.nodeType === "ROLE_ONLY_CAPABILITY") return gapRadius;
        return 0;
      },
      0,
      0,
    ).strength((node) => {
      if (node.nodeType === "FAMILY") return 0.8;
      if (node.nodeType === "CAPABILITY" && (!node.familyId || node.familyId === "user")) return 0.6;
      if (node.nodeType === "EVIDENCE") return 0.6;
      if (node.nodeType === "ROLE") return 0.7;
      if (node.nodeType === "ROLE_ONLY_CAPABILITY") return 0.8;
      return 0;
    });
    graph.d3Force("radial", radial);

    const linkForce = graph.d3Force("link") as
      | {
          distance: (value: (link: RenderLink) => number) => unknown;
          strength: (value: (link: RenderLink) => number) => unknown;
        }
      | undefined;
    linkForce
      ?.distance((link) => {
        if (link.linkType === "USER_FAMILY") return 155 * layoutScale;
        if (link.linkType === "USER_CAPABILITY") return 135 * layoutScale;
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

  const frameRoleFocus = useCallback((roleFocus: CareerGraphRoleFocusState) => {
    graphRef.current?.zoomToFit(
      520,
      dimensions.width < 600 ? 108 : 190,
      (candidate) => roleFocus.focusNodeIds.has(String(candidate.id)),
    );
    if (focusFrameTimerRef.current !== null) window.clearTimeout(focusFrameTimerRef.current);
    focusFrameTimerRef.current = window.setTimeout(() => {
      const graph = graphRef.current;
      const currentZoom = graph?.zoom() ?? 1;
      const maximumFocusZoom = dimensions.width < 600 ? 0.9 : 1.14;
      if (currentZoom > maximumFocusZoom) graph?.zoom(maximumFocusZoom, 260);
      focusFrameTimerRef.current = null;
    }, 560);
  }, [dimensions.width]);

  const selectNode = useCallback((id: string) => {
    const deselecting = selectedId === id;
    setSelectedId(deselecting ? null : id);
    const node = graphData.nodes.find((candidate) => candidate.id === id);
    const roleFocus = !deselecting && node?.nodeType === "ROLE"
      ? buildCareerGraphRoleFocusState(visualModel, id)
      : null;
    if (roleFocus) {
      frameRoleFocus(roleFocus);
      return;
    }
    if (deselecting) {
      graphRef.current?.zoomToFit(520, dimensions.width < 600 ? 20 : 52);
      return;
    }
    if (node?.x !== undefined && node.y !== undefined) {
      graphRef.current?.centerAt(node.x, node.y, 420);
      if ((graphRef.current?.zoom() ?? 1) < 1.35) graphRef.current?.zoom(1.35, 420);
    }
  }, [dimensions.width, frameRoleFocus, graphData.nodes, selectedId, visualModel]);

  const resetGraph = useCallback(() => {
    setSelectedId(null);
    setHoveredId(null);
    setSettled(false);
    setLayoutRevision((revision) => revision + 1);
  }, []);

  const drawNode = useCallback((
    node: NodeObject<CareerGraphVisualNode>,
    context: CanvasRenderingContext2D,
  ) => {
    const id = String(node.id);

    if (node.nodeType === "EVIDENCE") {
      const selfActive = id === hoveredId || id === selectedId;
      const parentActive = !!node.parentIds?.some(pid => pid === hoveredId || pid === selectedId);
      if (!selfActive && !parentActive) {
        return;
      }
    }

    const active = !focusSet ? (node.nodeType !== "ROLE_ONLY_CAPABILITY") : (focusSet.has(id) || id === hoveredId);
    const roleOwned = selectedRoleFocus?.ownedCapabilityIds.has(id) ?? false;
    const roleTransferable = selectedRoleFocus?.transferableCapabilityIds.has(id) ?? false;
    const roleGap = selectedRoleFocus?.gapCapabilityIds.has(id) ?? false;
    const selected = node.id === selectedId;
    const hovered = node.id === hoveredId;
    const selectedRole = node.nodeType === "ROLE" && id === selectedRoleFocus?.roleId;
    const hoveredRole = node.nodeType === "ROLE" && hovered;

    if (node.nodeType === "ROLE_ONLY_CAPABILITY") {
      if (!focusSet || (!focusSet.has(id) && id !== hoveredId)) {
        return;
      }
    }

    const radius = nodeRadius[node.nodeType]
      + (roleOwned || roleGap ? 1.4 : 0)
      + (selectedRole
        ? rolePresentation.selectedRadiusBoost
        : hoveredRole
          ? rolePresentation.hoverRadiusBoost
          : 0);
    context.save();
    context.globalAlpha = active ? 1 : 0.2;
    context.shadowColor = selected || hovered || node.nodeType === "YOU" ? palette[node.nodeType] : "transparent";
    context.shadowBlur = selected ? 22 : hovered ? 16 : node.nodeType === "YOU" ? 10 : 0;
    context.beginPath();
    context.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
    if (roleGap || node.nodeType === "ROLE_ONLY_CAPABILITY" || (node.nodeType === "EVIDENCE" && node.relationship === "transferable_signal")) {
      context.strokeStyle = palette[node.nodeType];
      context.lineWidth = roleGap ? 2.4 : node.nodeType === "ROLE_ONLY_CAPABILITY" ? 1.5 : 1.1;
      if (roleGap) context.setLineDash([3, 2]);
      context.stroke();
      context.setLineDash([]);
    } else {
      context.fillStyle = node.nodeType === "ROLE" && !selectedRole && !hoveredRole
        ? "rgba(255,180,109,0.58)"
        : palette[node.nodeType];
      context.fill();
    }

    if (node.nodeType === "CAPABILITY" && !roleOwned) {
      context.beginPath();
      context.arc(node.x ?? 0, node.y ?? 0, radius + 2.4, 0, Math.PI * 2);
      context.strokeStyle = "rgba(148,231,183,0.42)";
      context.lineWidth = 1.15;
      context.stroke();
    }

    if (roleOwned) {
      context.beginPath();
      context.arc(node.x ?? 0, node.y ?? 0, radius + 3.2, 0, Math.PI * 2);
      context.strokeStyle = roleTransferable ? "rgba(167,139,250,0.9)" : "rgba(148,231,183,0.72)";
      context.lineWidth = roleTransferable ? 1.6 : 1.2;
      if (roleTransferable) context.setLineDash([2.5, 2.5]);
      context.stroke();
      context.setLineDash([]);
    }

    if (node.nodeType === "YOU" || selectedRole || hoveredRole || selected) {
      context.beginPath();
      context.arc(node.x ?? 0, node.y ?? 0, radius + (node.nodeType === "YOU" ? 7 : 4.5), 0, Math.PI * 2);
      context.strokeStyle = node.nodeType === "YOU" ? "rgba(234,255,255,0.52)" : `${palette[node.nodeType]}66`;
      context.lineWidth = node.nodeType === "YOU" ? 2.4 : 1.4;
      context.stroke();
    }

    if (selectedRole) {
      context.beginPath();
      context.arc(node.x ?? 0, node.y ?? 0, radius + 9, 0, Math.PI * 2);
      context.strokeStyle = "rgba(255,180,109,0.48)";
      context.lineWidth = 2.2;
      context.stroke();
    }

    frameNodesRef.current.push(node);
    context.restore();
  }, [focusSet, hoveredId, selectedId, selectedRoleFocus]);

  const onRenderFramePost = useCallback((context: CanvasRenderingContext2D, globalScale: number) => {
    const nodes = frameNodesRef.current;
    frameNodesRef.current = [];
    if (!nodes.length) return;

    const compact = dimensions.width < 600;
    const nodePriorities = new Map<string, number>();

    for (const node of nodes) {
      let p = 100;
      const id = String(node.id);
      const selected = id === selectedId;
      const hovered = id === hoveredId;
      const roleOwned = selectedRoleFocus?.ownedCapabilityIds.has(id) ?? false;
      const roleTransferable = selectedRoleFocus?.transferableCapabilityIds.has(id) ?? false;
      const roleGap = selectedRoleFocus?.gapCapabilityIds.has(id) ?? false;
      const selectedRole = node.nodeType === "ROLE" && id === selectedRoleFocus?.roleId;

      if (node.nodeType === "YOU") p = 1;
      else if (hovered) p = 2;
      else if (selected) p = 3;
      else if (selectedRole) p = 4;
      else if (roleOwned || roleTransferable || roleGap) p = 5;
      else if (node.nodeType === "FAMILY") p = 6;
      else if (node.nodeType === "CAPABILITY") p = 7;
      else if (node.nodeType === "ROLE") p = 8;
      else if (node.nodeType === "ROLE_ONLY_CAPABILITY") p = 9;
      else p = 10;
      
      nodePriorities.set(id, p);
    }

    const sortedNodes = [...nodes].sort((a, b) => {
      const pa = nodePriorities.get(String(a.id)) ?? 100;
      const pb = nodePriorities.get(String(b.id)) ?? 100;
      if (pa !== pb) return pa - pb;
      return String(a.id).localeCompare(String(b.id));
    });

    const occupiedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (const node of sortedNodes) {
      const id = String(node.id);
      const p = nodePriorities.get(id) ?? 100;
      const selected = id === selectedId;
      const hovered = id === hoveredId;
      const roleOwned = selectedRoleFocus?.ownedCapabilityIds.has(id) ?? false;
      const roleGap = selectedRoleFocus?.gapCapabilityIds.has(id) ?? false;
      const selectedRole = node.nodeType === "ROLE" && id === selectedRoleFocus?.roleId;
      const hoveredRole = node.nodeType === "ROLE" && hovered;
      const active = !focusSet ? (node.nodeType !== "ROLE_ONLY_CAPABILITY") : (focusSet.has(id) || id === hoveredId);

      const showCapabilityLabel = node.nodeType === "CAPABILITY"
        && globalScale > (compact
          ? personalNetworkPresentation.compactCapabilityLabelZoom
          : personalNetworkPresentation.desktopCapabilityLabelZoom);
      const showLabel = normallyLabelled.has(node.nodeType)
        || selected
        || hovered
        || roleOwned
        || roleGap
        || showCapabilityLabel
        || (node.nodeType === "EVIDENCE" && !!focusSet && focusSet.has(id))
        || (node.nodeType === "ROLE_ONLY_CAPABILITY" && !!focusSet && focusSet.has(id) && globalScale > 3.2);

      if (!showLabel || !node.label) continue;

      const radius = nodeRadius[node.nodeType]
        + (roleOwned || roleGap ? 1.4 : 0)
        + (selectedRole
          ? rolePresentation.selectedRadiusBoost
          : hoveredRole
            ? rolePresentation.hoverRadiusBoost
            : 0);

      const screenFontSize = compact
        ? node.nodeType === "YOU" ? 11 : node.nodeType === "ROLE" ? 8.5 : 9.5
        : node.nodeType === "YOU" ? 13 : node.nodeType === "FAMILY" ? 11 : node.nodeType === "ROLE" ? selectedRole || hoveredRole ? 11 : 9.5 : 9.5;
      const fontSize = screenFontSize / globalScale;
      const fontWeight = node.nodeType === "ROLE" && !selectedRole && !hoveredRole ? 500 : 600;
      context.font = `${fontWeight} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      
      const outward = (!compact && (node.nodeType === "FAMILY" || node.nodeType === "ROLE"))
        || roleOwned
        || roleGap;
      const rightSide = (node.x ?? 0) >= 0;
      const labelLines = [...splitCanvasLabel(node.label, compact)];
      if (node.nodeType === "CAPABILITY" && node.evidenceCount) {
        labelLines.push(`· ${node.evidenceCount} evidence`);
      }
      
      let textWidth = 0;
      for (const line of labelLines) {
        const w = context.measureText(line).width;
        if (w > textWidth) textWidth = w;
      }
      
      const textHeight = labelLines.length * (fontSize + 2);
      const labelX = (node.x ?? 0) + (outward ? (rightSide ? radius + 7 : -radius - 7) : 0);
      const labelYBase = outward ? (node.y ?? 0) : (node.y ?? 0) + radius + 6;

      let x1, x2, y1, y2;
      if (outward) {
        if (rightSide) {
          x1 = labelX;
          x2 = labelX + textWidth;
        } else {
          x1 = labelX - textWidth;
          x2 = labelX;
        }
        y1 = labelYBase - textHeight / 2;
        y2 = labelYBase + textHeight / 2;
      } else {
        x1 = labelX - textWidth / 2;
        x2 = labelX + textWidth / 2;
        y1 = labelYBase;
        y2 = labelYBase + textHeight;
      }

      const pad = 4 / globalScale;
      x1 -= pad;
      y1 -= pad;
      x2 += pad;
      y2 += pad;

      const alwaysShow = p <= 5;
      const intersect = occupiedBoxes.some(box => x1 < box.x2 && x2 > box.x1 && y1 < box.y2 && y2 > box.y1);
      
      if (alwaysShow || !intersect) {
        occupiedBoxes.push({ x1, y1, x2, y2 });
        
        context.save();
        context.globalAlpha = active ? 1 : 0.2;
        context.textAlign = outward ? rightSide ? "left" : "right" : "center";
        context.textBaseline = outward ? "middle" : "top";
        context.fillStyle = active
          ? node.nodeType === "ROLE" && !selectedRole && !hoveredRole ? "rgba(231,247,246,0.68)" : "#e7f7f6"
          : "#53686a";
        
        labelLines.forEach((line, index) => {
          const drawY = outward
            ? labelYBase + (index - (labelLines.length - 1) / 2) * (fontSize + 2)
            : labelYBase + index * (fontSize + 2);
          context.fillText(line, labelX, drawY);
        });
        context.restore();
      }
    }
  }, [dimensions.width, focusSet, hoveredId, selectedId, selectedRoleFocus]);

  const paintPointerArea = useCallback((
    node: NodeObject<CareerGraphVisualNode>,
    color: string,
    context: CanvasRenderingContext2D,
  ) => {
    const id = String(node.id);
    if (node.nodeType === "ROLE_ONLY_CAPABILITY") {
      if (!focusSet || !focusSet.has(id)) return;
    }
    if (node.nodeType === "EVIDENCE") {
      const selfActive = id === hoveredId || id === selectedId;
      const parentActive = !!node.parentIds?.some(pid => pid === hoveredId || pid === selectedId);
      if (!selfActive && !parentActive) {
        return;
      }
    }
    context.fillStyle = color;
    context.beginPath();
    context.arc(node.x ?? 0, node.y ?? 0, Math.max(7, nodeRadius[node.nodeType]), 0, Math.PI * 2);
    context.fill();
  }, [focusSet, hoveredId, selectedId]);

  const roleFocusStateForNode = useCallback((node: CareerGraphVisualNode) => {
    if (!selectedRoleFocus) return undefined;
    if (node.id === selectedRoleFocus.roleId) return "selected-role";
    if (selectedRoleFocus.gapCapabilityIds.has(node.id)) return "gap-required-not-owned";
    if (selectedRoleFocus.transferableCapabilityIds.has(node.id)) return "transferable-owned";
    if (selectedRoleFocus.ownedCapabilityIds.has(node.id)) return "owned-for-role";
    if (selectedRoleFocus.familyIds.has(node.id)) return "relevant-family";
    if (node.nodeType === "YOU") return "career-context";
    return "unrelated-context";
  }, [selectedRoleFocus]);

  const accessibleNodeLabel = useCallback((node: CareerGraphVisualNode) => {
    const label = node.nodeType === "EVIDENCE"
      ? evidenceTextById.get(node.semanticId) ?? "Evidence"
      : nodeLabel(node);
    const state = roleFocusStateForNode(node);
    if (!state) return label;
    if (state === "selected-role") return `${label}. Selected future role.`;
    if (state === "gap-required-not-owned") return `${label}. Role requirement not yet evidenced; shown as a hollow node.`;
    if (state === "transferable-owned") return `${label}. Transferable capability you already have; shown as a filled node with a dashed ring.`;
    if (state === "owned-for-role") return `${label}. Capability you already have; shown as a filled node.`;
    if (state === "relevant-family") return `${label}. Relevant capability family.`;
    if (state === "career-context") return `${label}. Your Career Map remains in context.`;
    return `${label}. Unrelated Career Map context is de-emphasized.`;
  }, [evidenceTextById, roleFocusStateForNode]);

  return (
    <section
      aria-label="Interactive Career Map capability universe"
      className="flex h-full min-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-2xl bg-[#061012] text-cyan-50 shadow-[0_36px_110px_-58px_rgba(45,212,191,0.55)]"
      data-graph-node-count={visualModel.nodes.length}
      data-graph-link-count={visualModel.links.length}
      data-graph-status={settled ? "settled" : "forming"}
      data-role-focus={selectedRoleFocus?.roleId}
    >
      <div
        ref={fieldRef}
        role="application"
        aria-label={selectedRoleFocus
          ? `Career Map role focus for ${selectedNode?.label}. Filled capabilities are already yours; hollow capabilities are gaps. Pan and zoom the field, or use Browse map for keyboard navigation.`
          : "Career Map graph. Pan and zoom the field, or use Browse map for keyboard navigation."}
        className="relative min-h-[620px] flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(20,91,88,0.18),transparent_48%),linear-gradient(180deg,#071416_0%,#061012_100%)] sm:min-h-[680px]"
      >
        <CareerMapForceGraph
          ref={connectGraph}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={drawNode}
          onRenderFramePost={onRenderFramePost}
          nodePointerAreaPaint={paintPointerArea}
          nodeLabel={(node) => node.nodeType === "EVIDENCE"
            ? evidenceTextById.get(node.semanticId) ?? "Evidence"
            : nodeLabel(node)}
          linkColor={(link) => {
            const source = endpointId(link.source);
            const target = endpointId(link.target);
            if (link.linkType === "CAPABILITY_EVIDENCE") {
              if (source === selectedId || target === selectedId) return "rgba(167,139,250,0.45)";
              if (source === hoveredId || target === hoveredId) return "rgba(167,139,250,0.25)";
              return "rgba(0,0,0,0)";
            }
            const active = !focusSet || (focusSet.has(source) && focusSet.has(target));
            if (!active) return "rgba(116,148,148,0.055)";
            const hoveredRoleLink = !selectedRoleFocus
              && hoveredNode?.nodeType === "ROLE"
              && (source === hoveredNode.id || target === hoveredNode.id);
            if (link.linkType === "ROLE_OWNED_CAPABILITY") {
              const alpha = selectedRoleFocus
                ? rolePresentation.selectedOwnedLinkAlpha
                : hoveredRoleLink
                  ? rolePresentation.hoverOwnedLinkAlpha
                  : rolePresentation.defaultOwnedLinkAlpha;
              return `rgba(255,180,109,${alpha})`;
            }
            if (link.linkType === "ROLE_ONLY_CAPABILITY") {
              if (!focusSet || (!focusSet.has(source) && !focusSet.has(target))) {
                return "rgba(0,0,0,0)";
              }
              const alpha = selectedRoleFocus
                ? rolePresentation.selectedGapLinkAlpha
                : hoveredRoleLink
                  ? rolePresentation.hoverGapLinkAlpha
                  : rolePresentation.defaultGapLinkAlpha;
              return `rgba(203,213,225,${alpha})`;
            }
            if (selectedRoleFocus) return "rgba(105,220,204,0.48)";
            if (link.linkType === "USER_FAMILY") return `rgba(105,220,204,${personalNetworkPresentation.userFamilyLinkAlpha})`;
            return `rgba(105,220,204,${personalNetworkPresentation.familyCapabilityLinkAlpha})`;
          }}
          linkLineDash={(link) => link.linkType === "ROLE_ONLY_CAPABILITY" || link.requirementState === "transferable_signal" ? [4, 4] : null}
          linkWidth={(link) => {
            const source = endpointId(link.source);
            const target = endpointId(link.target);
            if (link.linkType === "CAPABILITY_EVIDENCE") {
              if (source === selectedId || target === selectedId) return 1.2;
              if (source === hoveredId || target === hoveredId) return 0.7;
              return 0;
            }
            const active = !focusSet || (focusSet.has(source) && focusSet.has(target));
            if (!active) return 0.6;
            const hoveredRoleLink = !selectedRoleFocus
              && hoveredNode?.nodeType === "ROLE"
              && (source === hoveredNode.id || target === hoveredNode.id);
            if (link.linkType === "ROLE_OWNED_CAPABILITY") {
              return selectedRoleFocus
                ? rolePresentation.selectedOwnedLinkWidth
                : hoveredRoleLink
                  ? rolePresentation.hoverOwnedLinkWidth
                  : rolePresentation.defaultLinkWidth;
            }
            if (link.linkType === "ROLE_ONLY_CAPABILITY") {
              if (!focusSet || (!focusSet.has(source) && !focusSet.has(target))) return 0;
              return selectedRoleFocus
                ? rolePresentation.selectedGapLinkWidth
                : hoveredRoleLink
                  ? rolePresentation.hoverGapLinkWidth
                  : rolePresentation.defaultLinkWidth;
            }
            if (selectedRoleFocus) return 1.15;
            return link.linkType === "USER_FAMILY"
              ? personalNetworkPresentation.userFamilyLinkWidth
              : link.linkType === "FAMILY_CAPABILITY"
                ? personalNetworkPresentation.familyCapabilityLinkWidth
                : 0.5;
          }}
          onNodeHover={hoverNode}
          onNodeClick={(node) => selectNode(String(node.id))}
          onBackgroundClick={() => setSelectedId(null)}
          onNodeDragEnd={(node) => {
            if (node.nodeType === "YOU") return;
            node.fx = node.x;
            node.fy = node.y;
          }}
          onZoom={({ k }) => {
            if (zoomLabelRef.current) {
              zoomLabelRef.current.textContent = `${Math.round(k * 100)}%`;
            }
          }}
          onEngineStop={() => {
            setSettled(true);
            if (selectedRoleFocus) frameRoleFocus(selectedRoleFocus);
            else graphRef.current?.zoomToFit(700, dimensions.width < 600 ? 20 : 52);
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

        {selectedRoleFocus && (
          <div className="pointer-events-none absolute left-1/2 top-16 z-20 flex w-[min(38rem,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl bg-[#071214]/94 px-4 py-2.5 text-xs text-cyan-50 shadow-[0_10px_30px_rgba(0,0,0,0.3)]" role="status" aria-live="polite">
            <strong className="text-orange-200">{selectedNode?.label}</strong>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-200" aria-hidden="true" />Filled — already yours</span>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-slate-200" aria-hidden="true" />Hollow — build next</span>
          </div>
        )}

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
                        aria-label={accessibleNodeLabel(node)}
                        data-node-type={projectionNodeType(node.nodeType)}
                        data-node-id={node.id}
                        data-role-focus-state={roleFocusStateForNode(node)}
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
          <div className="absolute right-4 top-16 z-20 max-h-[calc(100%-5rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-xl bg-[#081517]/95 px-4 shadow-[0_18px_55px_rgba(0,0,0,0.5)] sm:right-5 sm:px-5">
            <SelectedNodeDetail projection={projection} visualModel={visualModel} selected={selectedNode} onSelect={selectNode} />
          </div>
        )}

        <span ref={zoomLabelRef} className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/30 px-3 py-1.5 text-xs tabular-nums text-cyan-50/55">100%</span>
        <span className="sr-only">Accessible graph navigator is available from Browse map.</span>
      </div>
      <span className="sr-only">{hasRole ? "Future role paths are available in this map." : "No future role paths are available."}</span>
      {selectedRoleFocus && (
        <span className="sr-only" aria-live="polite">
          Role focus for {selectedNode?.label}: {selectedRoleFocus.ownedCapabilityIds.size} capabilities you already have and {selectedRoleFocus.gapCapabilityIds.size} gaps. Evidence is available on demand and is not expanded automatically.
        </span>
      )}
    </section>
  );
}
