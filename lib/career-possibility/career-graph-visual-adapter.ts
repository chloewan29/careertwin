import type {
  CareerMapGraphProjection,
  RoleRequirementState,
} from "./career-map-graph-projection";

export const CAREER_GRAPH_VISUAL_ADAPTER_VERSION =
  "career-graph-visual-adapter/1.0.0" as const;

export type CareerGraphVisualNodeType =
  | "YOU"
  | "FAMILY"
  | "CAPABILITY"
  | "EVIDENCE"
  | "ROLE"
  | "ROLE_ONLY_CAPABILITY";

export type CareerGraphVisualLinkType =
  | "USER_FAMILY"
  | "FAMILY_CAPABILITY"
  | "CAPABILITY_EVIDENCE"
  | "ROLE_OWNED_CAPABILITY"
  | "ROLE_ONLY_CAPABILITY";

export type CareerGraphVisualNode = {
  readonly id: string;
  readonly semanticId: string;
  readonly nodeType: CareerGraphVisualNodeType;
  readonly label?: string;
  readonly familyId?: string;
  readonly personalOwned: boolean;
  readonly presentationOnly?: true;
  readonly proximityRank?: number;
  readonly evidenceCount?: number;
  readonly relationship?: "direct_evidence" | "transferable_signal";
  readonly requirementStates?: readonly RoleRequirementState[];
  readonly roleIds?: readonly string[];
};

export type CareerGraphVisualLink = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly linkType: CareerGraphVisualLinkType;
  readonly requirementState?: RoleRequirementState;
};

export type CareerGraphVisualModel = {
  readonly version: typeof CAREER_GRAPH_VISUAL_ADAPTER_VERSION;
  readonly nodes: readonly CareerGraphVisualNode[];
  readonly links: readonly CareerGraphVisualLink[];
};

type RequirementAccumulator = {
  label: string;
  roleIds: Set<string>;
  requirementStates: Set<RoleRequirementState>;
};

const nodeTypeByProjectionType = {
  user: "YOU",
  capability_family: "FAMILY",
  capability: "CAPABILITY",
  evidence: "EVIDENCE",
  role: "ROLE",
} as const;

function linkId(
  linkType: CareerGraphVisualLinkType,
  source: string,
  target: string,
): string {
  return `${linkType}:${source}:${target}`;
}

export function buildCareerGraphVisualModel(
  projection: CareerMapGraphProjection,
): CareerGraphVisualModel {
  const personalCapabilityIds = new Set(
    projection.nodes
      .filter((node) => node.type === "capability")
      .map((node) => node.id),
  );
  const visualNodes: CareerGraphVisualNode[] = [];
  const visualLinks: CareerGraphVisualLink[] = [];
  const missingRequirements = new Map<string, RequirementAccumulator>();

  for (const node of projection.nodes) {
    if (node.type === "role_requirement") {
      if (node.requirementState !== "evidence_not_yet_shown") continue;
      if (personalCapabilityIds.has(node.capabilityId)) {
        throw new Error(
          `Projection marks owned capability ${node.capabilityId} as not evidenced.`,
        );
      }
      const existing = missingRequirements.get(node.capabilityId);
      if (existing) {
        existing.roleIds.add(node.roleId);
        existing.requirementStates.add(node.requirementState);
      } else {
        missingRequirements.set(node.capabilityId, {
          label: node.capabilityLabel,
          roleIds: new Set([node.roleId]),
          requirementStates: new Set([node.requirementState]),
        });
      }
      continue;
    }

    if (node.type === "user") {
      visualNodes.push({
        id: node.id,
        semanticId: node.id,
        nodeType: nodeTypeByProjectionType[node.type],
        label: "You",
        personalOwned: true,
      });
      continue;
    }

    if (node.type === "capability_family") {
      visualNodes.push({
        id: node.id,
        semanticId: node.id,
        nodeType: nodeTypeByProjectionType[node.type],
        label: node.label,
        personalOwned: false,
        presentationOnly: true,
      });
      continue;
    }

    if (node.type === "capability") {
      visualNodes.push({
        id: node.id,
        semanticId: node.id,
        nodeType: nodeTypeByProjectionType[node.type],
        label: node.label,
        familyId: node.familyId,
        personalOwned: true,
        evidenceCount: node.evidenceIds.length,
      });
      continue;
    }

    if (node.type === "evidence") {
      visualNodes.push({
        id: node.id,
        semanticId: node.id,
        nodeType: nodeTypeByProjectionType[node.type],
        personalOwned: true,
        relationship: node.relationship,
      });
      continue;
    }

    visualNodes.push({
      id: node.id,
      semanticId: node.id,
      nodeType: nodeTypeByProjectionType[node.type],
      label: node.title,
      personalOwned: false,
      proximityRank: node.proximityRank,
    });
  }

  for (const [capabilityId, requirement] of missingRequirements) {
    visualNodes.push({
      id: capabilityId,
      semanticId: capabilityId,
      nodeType: "ROLE_ONLY_CAPABILITY",
      label: requirement.label,
      personalOwned: false,
      roleIds: Object.freeze([...requirement.roleIds]),
      requirementStates: Object.freeze([...requirement.requirementStates]),
    });
  }

  for (const edge of projection.edges) {
    if (edge.type === "user_has_family") {
      visualLinks.push({
        id: linkId("USER_FAMILY", edge.fromId, edge.toId),
        source: edge.fromId,
        target: edge.toId,
        linkType: "USER_FAMILY",
      });
      continue;
    }
    if (edge.type === "family_contains_capability") {
      visualLinks.push({
        id: linkId("FAMILY_CAPABILITY", edge.fromId, edge.toId),
        source: edge.fromId,
        target: edge.toId,
        linkType: "FAMILY_CAPABILITY",
      });
      continue;
    }
    if (edge.type === "capability_supported_by_evidence") {
      visualLinks.push({
        id: linkId("CAPABILITY_EVIDENCE", edge.fromId, edge.toId),
        source: edge.fromId,
        target: edge.toId,
        linkType: "CAPABILITY_EVIDENCE",
      });
      continue;
    }

    const requirement = projection.nodes.find(
      (node) => node.type === "role_requirement" && node.id === edge.toId,
    );
    if (!requirement || requirement.type !== "role_requirement") {
      throw new Error(`Missing role requirement node ${edge.toId}.`);
    }
    const target = requirement.capabilityId;
    const linkType: CareerGraphVisualLinkType =
      requirement.requirementState === "evidence_not_yet_shown"
        ? "ROLE_ONLY_CAPABILITY"
        : "ROLE_OWNED_CAPABILITY";
    if (linkType === "ROLE_OWNED_CAPABILITY" && !personalCapabilityIds.has(target)) {
      throw new Error(`Projection references absent owned capability ${target}.`);
    }
    visualLinks.push({
      id: linkId(linkType, edge.fromId, target),
      source: edge.fromId,
      target,
      linkType,
      requirementState: requirement.requirementState,
    });
  }

  const nodeIds = new Set(visualNodes.map((node) => node.id));
  if (nodeIds.size !== visualNodes.length) {
    throw new Error("Visual node IDs must be unique across the graph.");
  }
  for (const link of visualLinks) {
    if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) {
      throw new Error(`Visual link ${link.id} references an absent node.`);
    }
  }

  return Object.freeze({
    version: CAREER_GRAPH_VISUAL_ADAPTER_VERSION,
    nodes: Object.freeze(visualNodes.map((node) => Object.freeze(node))),
    links: Object.freeze(visualLinks.map((link) => Object.freeze(link))),
  });
}

export function buildCareerGraphFocusSet(
  model: CareerGraphVisualModel,
  nodeId: string | null,
): ReadonlySet<string> | null {
  if (!nodeId) return null;
  const nodesById = new Map(model.nodes.map((node) => [node.id, node]));
  const selected = nodesById.get(nodeId);
  if (!selected) return null;

  const adjacent = new Map(model.nodes.map((node) => [node.id, new Set([node.id])]));
  for (const link of model.links) {
    adjacent.get(link.source)?.add(link.target);
    adjacent.get(link.target)?.add(link.source);
  }

  const focused = new Set(adjacent.get(nodeId));
  const addAdjacentOfType = (fromId: string, type: CareerGraphVisualNodeType) => {
    for (const id of adjacent.get(fromId) ?? []) {
      if (nodesById.get(id)?.nodeType === type) focused.add(id);
    }
  };

  if (selected.nodeType === "FAMILY") {
    for (const capabilityId of adjacent.get(nodeId) ?? []) {
      if (nodesById.get(capabilityId)?.nodeType === "CAPABILITY") {
        addAdjacentOfType(capabilityId, "EVIDENCE");
      }
    }
  }
  if (selected.nodeType === "CAPABILITY") {
    for (const familyId of adjacent.get(nodeId) ?? []) {
      if (nodesById.get(familyId)?.nodeType === "FAMILY") {
        addAdjacentOfType(familyId, "YOU");
      }
    }
  }
  if (selected.nodeType === "ROLE") {
    for (const capabilityId of adjacent.get(nodeId) ?? []) {
      if (nodesById.get(capabilityId)?.nodeType !== "CAPABILITY") continue;
      for (const familyId of adjacent.get(capabilityId) ?? []) {
        if (nodesById.get(familyId)?.nodeType === "FAMILY") {
          focused.add(familyId);
          addAdjacentOfType(familyId, "YOU");
        }
      }
    }
  }

  return focused;
}
