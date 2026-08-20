import type { EscoLocalCareerMapState } from "./local-career-map-state";
import type { 
  CareerMapGraphProjection, 
  CareerMapGraphNode, 
  CareerMapGraphEdge, 
  RoleRequirementGraphNode 
} from "./career-map-graph-projection";
import { buildEscoPresentationGraph, type VisualMapNode, type VisualMapEdge } from "./external-taxonomy/esco/esco-career-graph";
import { CAREER_MAP_GRAPH_PROJECTION_VERSION } from "./career-map-graph-projection";

export function buildEscoCareerMapPresentation(state: EscoLocalCareerMapState): CareerMapGraphProjection {
  // Convert state to ESCO-specific presentation graph
  const ownedSkills = state.ownedSkills.map(s => ({ skillUri: s.skillUri, evidenceIds: s.evidenceIds }));
  const escoGraph = buildEscoPresentationGraph(ownedSkills, undefined, 6); // Max 6 roles as default

  const nodes: CareerMapGraphNode[] = [];
  const edges: CareerMapGraphEdge[] = [];

  // Map ESCO graph to CareerMapGraphProjection
  for (const node of escoGraph.nodes) {
    if (node.type === "YOU") {
      nodes.push(Object.freeze({ type: "user", id: "user" }));
    } else if (node.type === "ESCO_SKILL") {
      const stateSkill = state.ownedSkills.find(s => s.skillUri === node.id);
      const evidenceIds = stateSkill?.evidenceIds ?? [];
      
      nodes.push(Object.freeze({
        type: "capability",
        id: node.id,
        label: node.label,
        familyId: "user",
        evidenceIds: Object.freeze([...evidenceIds])
      }));
      edges.push(Object.freeze({ type: "user_owns_capability", fromId: "user", toId: node.id }));
      
      for (const evId of evidenceIds) {
        edges.push(Object.freeze({ type: "capability_supported_by_evidence", fromId: node.id, toId: evId }));
      }
    } else if (node.type === "FUTURE_ROLE") {
      nodes.push(Object.freeze({
        type: "role",
        id: node.id,
        title: node.label,
        proximityRank: 0
      }));
    }
    // Gaps handled in edges
  }

  // Evidence nodes
  for (const ev of state.evidence) {
    const capabilityIds = state.ownedSkills.filter(s => s.evidenceIds.includes(ev.evidenceId)).map(s => s.skillUri);
    nodes.push(Object.freeze({
      type: "evidence",
      id: ev.evidenceId,
      text: ev.sourceExcerpt,
      relationship: "direct_evidence",
      capabilityIds: Object.freeze(capabilityIds)
    }));
  }

  // Map Edges & Requirements
  for (const edge of escoGraph.edges) {
    if (edge.source === "YOU") {
      // Handled implicitly
    } else if (edge.type === "solid" || edge.type === "dashed") {
      const reqId = `role_req:${edge.target}:${edge.source}`;
      // In escoGraph, source is skillUri, target is roleUri
      const skillNode = escoGraph.nodes.find(n => n.id === edge.source);
      
      const reqNode: RoleRequirementGraphNode = {
        type: "role_requirement",
        id: reqId,
        roleId: edge.target,
        capabilityId: edge.source,
        capabilityLabel: skillNode?.label ?? "",
        requirementState: edge.type === "solid" ? "directly_demonstrated" : "evidence_not_yet_shown"
      };
      
      nodes.push(Object.freeze(reqNode));
      edges.push(Object.freeze({
        type: "role_requires_capability",
        fromId: edge.target,
        toId: reqId
      }));
    }
  }

  return Object.freeze({
    version: CAREER_MAP_GRAPH_PROJECTION_VERSION,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges)
  });
}
