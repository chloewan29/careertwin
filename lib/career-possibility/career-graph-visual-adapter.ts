import type {
  CareerMapGraphProjection,
  RoleRequirementState,
} from "./career-map-graph-projection";
import { canonicalCapabilityLibrary } from "./canonical-capability-library";
import { canonicalCapabilityFamilyLibrary } from "./canonical-capability-family-library";

export const CAREER_GRAPH_VISUAL_ADAPTER_VERSION =
  "career-graph-visual-adapter/1.2.0" as const;

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
  | "ROLE_ONLY_CAPABILITY"
  | "USER_CAPABILITY";

export type CareerGraphVisualNode = {
  readonly id: string;
  readonly semanticId: string;
  readonly nodeType: CareerGraphVisualNodeType;
  readonly label?: string;
  readonly familyId?: string;
  readonly familyLabel?: string;
  readonly familyIds?: readonly string[];
  readonly parentIds?: readonly string[];
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
  readonly requirementImportance?: "must" | "should" | "differentiator";
};

export type CareerGraphVisualModel = {
  readonly version: typeof CAREER_GRAPH_VISUAL_ADAPTER_VERSION;
  readonly nodes: readonly CareerGraphVisualNode[];
  readonly links: readonly CareerGraphVisualLink[];
};

export type CareerGraphSeedPosition = {
  readonly x: number;
  readonly y: number;
  readonly familyId?: string;
  readonly roleTopologyAngle?: number;
};

export type CareerGraphRoleFocusState = {
  readonly roleId: string;
  readonly focusNodeIds: ReadonlySet<string>;
  readonly ownedCapabilityIds: ReadonlySet<string>;
  readonly transferableCapabilityIds: ReadonlySet<string>;
  readonly gapCapabilityIds: ReadonlySet<string>;
  readonly familyIds: ReadonlySet<string>;
  readonly relevantLinkIds: ReadonlySet<string>;
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

const canonicalFamilyIdByLabel = new Map(
  canonicalCapabilityFamilyLibrary.families.map((family) => [family.label, family.id] as const),
);
const canonicalFamilyByCapabilityId = new Map(
  canonicalCapabilityLibrary.capabilities.map((capability) => [
    capability.id,
    {
      id: canonicalFamilyIdByLabel.get(capability.family),
      label: capability.family,
    },
  ] as const),
);

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

function circularDistance(left: number, right: number): number {
  return Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)));
}

function segmentDistanceFromOrigin(
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;
  const progress = denominator === 0
    ? 0
    : Math.max(0, Math.min(1, -(start.x * dx + start.y * dy) / denominator));
  return Math.hypot(start.x + progress * dx, start.y + progress * dy);
}

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
  const capabilityFamilyById = new Map(
    projection.nodes
      .filter((node) => node.type === "capability")
      .map((node) => [node.id, node.familyId] as const),
  );
  const familyLabelById = new Map(
    projection.nodes
      .filter((node) => node.type === "capability_family")
      .map((node) => [node.id, node.label] as const),
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
        parentIds: Object.freeze(["user"]),
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
        familyLabel: familyLabelById.get(node.familyId),
        familyIds: Object.freeze([node.familyId]),
        parentIds: Object.freeze([node.familyId]),
        personalOwned: true,
        evidenceCount: node.evidenceIds.length,
      });
      continue;
    }

    if (node.type === "evidence") {
      const familyIds = [...new Set(
        node.capabilityIds
          .map((capabilityId) => capabilityFamilyById.get(capabilityId))
          .filter((familyId): familyId is string => Boolean(familyId)),
      )];
      visualNodes.push({
        id: node.id,
        semanticId: node.id,
        nodeType: nodeTypeByProjectionType[node.type],
        label: node.text,
        personalOwned: true,
        relationship: node.relationship,
        familyId: familyIds[0],
        familyIds: Object.freeze(familyIds),
        parentIds: Object.freeze([...node.capabilityIds]),
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
      familyId: canonicalFamilyByCapabilityId.get(capabilityId)?.id,
      familyLabel: canonicalFamilyByCapabilityId.get(capabilityId)?.label,
      familyIds: canonicalFamilyByCapabilityId.get(capabilityId)?.id
        ? Object.freeze([canonicalFamilyByCapabilityId.get(capabilityId)!.id!])
        : undefined,
      personalOwned: false,
      roleIds: Object.freeze([...requirement.roleIds]),
      parentIds: Object.freeze([...requirement.roleIds]),
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
    if (edge.type === "user_owns_capability") {
      visualLinks.push({
        id: linkId("USER_CAPABILITY", edge.fromId, edge.toId),
        source: edge.fromId,
        target: edge.toId,
        linkType: "USER_CAPABILITY",
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
      requirementImportance: requirement.importance,
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

export function buildCareerGraphTopologySeeds(
  model: CareerGraphVisualModel,
): ReadonlyMap<string, CareerGraphSeedPosition> {
  const seeds = new Map<string, CareerGraphSeedPosition>();
  const families = model.nodes.filter((node) => node.nodeType === "FAMILY");
  const roles = model.nodes.filter((node) => node.nodeType === "ROLE");
  const familyAngles = new Map<string, number>();

  for (const [index, node] of families.entries()) {
    const angle = -1.45
      + (Math.PI * 2 * index) / Math.max(families.length, 1)
      + (stableUnit(`family-angle:${node.id}`) - 0.5) * 0.55;
    const point = pointAt(angle, 142 + stableUnit(`family-radius:${node.id}`) * 50);
    familyAngles.set(node.id, angle);
    seeds.set(node.id, { ...point, familyId: node.id });
  }

  const userCapabilities = model.nodes.filter((n) => n.nodeType === "CAPABILITY" && (n.familyId === "user" || !n.familyId));
  const userCapAngles = new Map<string, number>();
  userCapabilities.forEach((node, index) => {
    userCapAngles.set(node.id, -Math.PI + (Math.PI * 2 * index) / Math.max(userCapabilities.length, 1));
  });

  const familyAngleFor = (familyId: string | undefined, nodeId: string) => {
    if (familyId && familyAngles.has(familyId)) return familyAngles.get(familyId)!;
    if (userCapAngles.has(nodeId)) return userCapAngles.get(nodeId)!;
    if (familyId) return -Math.PI + stableUnit(`gap-family-angle:${familyId}`) * Math.PI * 2;
    return -Math.PI + stableUnit(`unclassified-capability-angle:${nodeId}`) * Math.PI * 2;
  };

  for (const node of model.nodes.filter((candidate) => candidate.nodeType === "CAPABILITY")) {
    const parent = seeds.get(node.parentIds?.[0] ?? "");
    const baseAngle = familyAngleFor(node.familyId, node.id);
    const offset = pointAt(
      baseAngle + (stableUnit(`capability:${node.id}`) - 0.5) * 1.05,
      82 + stableUnit(`capability-radius:${node.id}`) * 34,
    );
    seeds.set(node.id, {
      x: (parent?.x ?? 0) + offset.x,
      y: (parent?.y ?? 0) + offset.y,
      familyId: node.familyId,
    });
  }

  const gapNodesByFamily = new Map<string, CareerGraphVisualNode[]>();
  for (const node of model.nodes.filter((candidate) => candidate.nodeType === "ROLE_ONLY_CAPABILITY")) {
    const familyKey = node.familyId ?? `unclassified:${node.id}`;
    const siblings = gapNodesByFamily.get(familyKey) ?? [];
    siblings.push(node);
    gapNodesByFamily.set(familyKey, siblings);
  }
  for (const siblings of gapNodesByFamily.values()) {
    for (const [index, node] of siblings.entries()) {
      const familyAngle = familyAngleFor(node.familyId, node.id);
      const siblingOffset = (index - (siblings.length - 1) / 2) * 0.38;
      const radius = 238
        + (index % 2 === 0 ? -10 : 14)
        + (stableUnit(`gap-radius:${node.id}`) - 0.5) * 22;
      const point = pointAt(
        familyAngle + siblingOffset + (stableUnit(`gap-capability:${node.id}`) - 0.5) * 0.08,
        radius,
      );
      seeds.set(node.id, { ...point, familyId: node.familyId });
    }
  }

  const placedRoleAngles: number[] = [];
  for (const [index, node] of roles.entries()) {
    const connected = model.links
      .filter((link) => link.source === node.id && link.linkType.startsWith("ROLE_"))
      .map((link) => ({
        position: seeds.get(link.target),
        weight: link.requirementImportance === "must"
          ? 1.35
          : link.requirementImportance === "differentiator"
            ? 1.15
            : 1,
      }))
      .filter((entry): entry is { position: CareerGraphSeedPosition; weight: number } => Boolean(entry.position));
    const vector = connected.reduce((total, entry) => {
      const magnitude = Math.max(1, Math.hypot(entry.position.x, entry.position.y));
      return {
        x: total.x + (entry.position.x / magnitude) * entry.weight,
        y: total.y + (entry.position.y / magnitude) * entry.weight,
      };
    }, { x: 0, y: 0 });
    let angle = Math.hypot(vector.x, vector.y) > 0.18
      ? Math.atan2(vector.y, vector.x)
      : -Math.PI + stableUnit(`distributed-role-angle:${node.id}`) * Math.PI * 2;
    const rank = node.proximityRank ?? index;
    const radius = 420 + rank * 18 + stableUnit(`role-radius:${node.id}`) * 14;
    const topologyAngle = angle;
    const localCandidates = [-0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24];
    angle = localCandidates.reduce((bestAngle, offset) => {
      const candidateAngle = topologyAngle + offset;
      const candidate = pointAt(candidateAngle, radius);
      const centralCrossings = connected.filter(
        (entry) => segmentDistanceFromOrigin(candidate, entry.position) < 95,
      ).length;
      const averageLength = connected.reduce(
        (total, entry) => total + Math.hypot(candidate.x - entry.position.x, candidate.y - entry.position.y),
        0,
      ) / Math.max(connected.length, 1);
      const score = centralCrossings * 1000 + Math.abs(offset) * 90 + averageLength / 20;
      const best = pointAt(bestAngle, radius);
      const bestOffset = circularDistance(bestAngle, topologyAngle);
      const bestCrossings = connected.filter(
        (entry) => segmentDistanceFromOrigin(best, entry.position) < 95,
      ).length;
      const bestAverageLength = connected.reduce(
        (total, entry) => total + Math.hypot(best.x - entry.position.x, best.y - entry.position.y),
        0,
      ) / Math.max(connected.length, 1);
      const bestScore = bestCrossings * 1000 + bestOffset * 90 + bestAverageLength / 20;
      return score < bestScore ? candidateAngle : bestAngle;
    }, topologyAngle);
    const localDirection = stableUnit(`role-local-collision:${node.id}`) >= 0.5 ? 1 : -1;
    for (let attempt = 0; attempt < roles.length; attempt += 1) {
      const nearest = placedRoleAngles.reduce(
        (distance, placed) => Math.min(distance, circularDistance(angle, placed)),
        Number.POSITIVE_INFINITY,
      );
      if (nearest >= 0.24) break;
      angle += localDirection * Math.min(0.12, 0.24 - nearest + 0.025);
    }
    placedRoleAngles.push(angle);
    seeds.set(node.id, {
      ...pointAt(angle, radius),
      roleTopologyAngle: angle,
    });
  }

  const gapNodesByRoles = new Map<string, CareerGraphVisualNode[]>();
  for (const node of model.nodes.filter((candidate) => candidate.nodeType === "ROLE_ONLY_CAPABILITY")) {
    const rolesKey = [...(node.roleIds ?? [])].sort().join(",");
    const siblings = gapNodesByRoles.get(rolesKey) ?? [];
    siblings.push(node);
    gapNodesByRoles.set(rolesKey, siblings);
  }

  for (const siblings of gapNodesByRoles.values()) {
    for (const [index, node] of siblings.entries()) {
      const connectedRoles = (node.roleIds ?? [])
        .map((id) => seeds.get(id))
        .filter((position): position is CareerGraphSeedPosition => Boolean(position));

      if (connectedRoles.length === 0) continue;

      const vector = connectedRoles.reduce((total, role) => {
        const magnitude = Math.max(1, Math.hypot(role.x, role.y));
        return {
          x: total.x + (role.x / magnitude),
          y: total.y + (role.y / magnitude),
        };
      }, { x: 0, y: 0 });

      const baseAngle = Math.hypot(vector.x, vector.y) > 0.1
        ? Math.atan2(vector.y, vector.x)
        : (connectedRoles[0]?.roleTopologyAngle ?? -Math.PI);

      const maxRoleRadius = Math.max(...connectedRoles.map((role) => Math.hypot(role.x, role.y)));
      const siblingOffset = (index - (siblings.length - 1) / 2) * 0.18;
      const angle = baseAngle + siblingOffset + (stableUnit(`gap-outward:${node.id}`) - 0.5) * 0.08;
      const radius = maxRoleRadius + 140 + (index % 2 === 0 ? 0 : 22) + (stableUnit(`gap-radius-outward:${node.id}`) - 0.5) * 24;
      
      const point = pointAt(angle, radius);
      seeds.set(node.id, { ...point, familyId: node.familyId });
    }
  }

  for (const node of model.nodes.filter((candidate) => candidate.nodeType === "EVIDENCE")) {
    const parents = (node.parentIds ?? [])
      .map((id) => seeds.get(id))
      .filter((position): position is CareerGraphSeedPosition => Boolean(position));
    const parentX = parents.reduce((total, parent) => total + parent.x, 0) / Math.max(parents.length, 1);
    const parentY = parents.reduce((total, parent) => total + parent.y, 0) / Math.max(parents.length, 1);
    const baseAngle = familyAngleFor(node.familyId, node.id);
    const offset = pointAt(
      baseAngle + (stableUnit(`evidence:${node.id}`) - 0.5) * 0.9,
      58 + stableUnit(`evidence-radius:${node.id}`) * 38,
    );
    seeds.set(node.id, {
      x: parentX + offset.x,
      y: parentY + offset.y,
      familyId: node.familyId,
    });
  }

  const you = model.nodes.find((node) => node.nodeType === "YOU");
  if (you) seeds.set(you.id, { x: 0, y: 0 });
  return seeds;
}

export function buildCareerGraphRoleFocusState(
  model: CareerGraphVisualModel,
  roleId: string,
): CareerGraphRoleFocusState | null {
  if (!model.nodes.some((node) => node.id === roleId && node.nodeType === "ROLE")) return null;
  const nodesById = new Map(model.nodes.map((node) => [node.id, node]));
  const ownedCapabilityIds = new Set<string>();
  const transferableCapabilityIds = new Set<string>();
  const gapCapabilityIds = new Set<string>();
  const familyIds = new Set<string>();
  const relevantLinkIds = new Set<string>();

  for (const link of model.links) {
    if (link.source !== roleId || !link.linkType.startsWith("ROLE_")) continue;
    relevantLinkIds.add(link.id);
    if (link.linkType === "ROLE_ONLY_CAPABILITY") gapCapabilityIds.add(link.target);
    else ownedCapabilityIds.add(link.target);
    if (link.requirementState === "transferable_signal") transferableCapabilityIds.add(link.target);
    for (const familyId of nodesById.get(link.target)?.familyIds ?? []) familyIds.add(familyId);
  }

  const focusNodeIds = new Set<string>([
    roleId,
    "user",
    ...ownedCapabilityIds,
    ...gapCapabilityIds,
  ]);
  for (const familyId of familyIds) {
    if (nodesById.get(familyId)?.nodeType === "FAMILY") focusNodeIds.add(familyId);
  }
  for (const link of model.links) {
    if (focusNodeIds.has(link.source) && focusNodeIds.has(link.target)) relevantLinkIds.add(link.id);
  }

  return {
    roleId,
    focusNodeIds,
    ownedCapabilityIds,
    transferableCapabilityIds,
    gapCapabilityIds,
    familyIds,
    relevantLinkIds,
  };
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
    return buildCareerGraphRoleFocusState(model, nodeId)?.focusNodeIds ?? focused;
  }

  return focused;
}
