import { getOccupationByUri, getSkillByUri, getSkillsForOccupation, getOccupationsForSkill } from "./esco-index";
import type { EvidenceBackedEscoSkill } from "./esco-career-graph-contract";

// We import the existing CareerMap interfaces as generic structures
export type VisualMapNode = {
  id: string;
  label: string;
  type: "YOU" | "ESCO_SKILL" | "FUTURE_ROLE" | "ROLE_GAP";
  status: "owned" | "missing" | "shared" | "active";
};

export type VisualMapEdge = {
  source: string;
  target: string;
  type: "solid" | "dashed" | "none";
};

export type PresentationGraph = {
  nodes: VisualMapNode[];
  edges: VisualMapEdge[];
};

export function getRelevantEscoOccupationCandidates(params: { ownedSkillUris: string[] }) {
  const { ownedSkillUris } = params;
  if (ownedSkillUris.length === 0) return [];

  const candidateMap = new Map<string, {
    uri: string;
    label: string;
    ownedEssential: number;
    ownedOptional: number;
    totalOwned: number;
  }>();

  for (const skillUri of ownedSkillUris) {
    const occs = getOccupationsForSkill(skillUri);
    for (const rel of occs) {
      const occUri = rel.occupation.uri;
      if (!candidateMap.has(occUri)) {
        candidateMap.set(occUri, {
          uri: occUri,
          label: rel.occupation.preferredLabel,
          ownedEssential: 0,
          ownedOptional: 0,
          totalOwned: 0
        });
      }
      const c = candidateMap.get(occUri)!;
      c.totalOwned++;
      if (rel.relationType === "essential") c.ownedEssential++;
      else c.ownedOptional++;
    }
  }

  // Zero overlap exclusion is inherently enforced by only finding occupations through owned skills.

  // Deterministic candidate retrieval sort
  const candidates = Array.from(candidateMap.values());
  candidates.sort((a, b) => {
    // 1. Has owned ESSENTIAL overlap
    const aHasEss = a.ownedEssential > 0 ? 1 : 0;
    const bHasEss = b.ownedEssential > 0 ? 1 : 0;
    if (aHasEss !== bHasEss) return bHasEss - aHasEss;
    
    // 2. Greater owned essential overlap count
    if (a.ownedEssential !== b.ownedEssential) return b.ownedEssential - a.ownedEssential;

    // 3. Greater total owned overlap
    if (a.totalOwned !== b.totalOwned) return b.totalOwned - a.totalOwned;

    // 4. Stable tie-break
    return a.uri.localeCompare(b.uri, "en");
  });

  return candidates;
}

export function buildEscoPresentationGraph(
  ownedSkills: EvidenceBackedEscoSkill[],
  selectedRoleUri?: string,
  maxRoles: number = 6
): PresentationGraph {
  const nodes: Map<string, VisualMapNode> = new Map();
  const edges: VisualMapEdge[] = [];

  // 1. YOU Node (Centre)
  nodes.set("YOU", { id: "YOU", label: "You", type: "YOU", status: "active" });

  const ownedUris = new Set(ownedSkills.map(s => s.skillUri));

  // 2. Add owned skills
  for (const s of ownedSkills) {
    const skillData = getSkillByUri(s.skillUri);
    if (!skillData) continue;
    
    nodes.set(s.skillUri, {
      id: s.skillUri,
      label: skillData.preferredLabel,
      type: "ESCO_SKILL",
      status: "owned"
    });
    
    edges.push({ source: "YOU", target: s.skillUri, type: "solid" });
  }

  // 3. Get candidates & admit up to maxRoles
  const candidates = getRelevantEscoOccupationCandidates({ ownedSkillUris: Array.from(ownedUris) });
  const admittedRoles = candidates.slice(0, maxRoles);

  // 4. Add roles and shared edges
  for (const role of admittedRoles) {
    const isSelected = role.uri === selectedRoleUri;
    
    nodes.set(role.uri, {
      id: role.uri,
      label: role.label,
      type: "FUTURE_ROLE",
      status: isSelected ? "active" : "missing"
    });

    const roleSkills = getSkillsForOccupation(role.uri);
    
    // Sort role skills by importance to pick the best gaps
    const sortedSkills = [...roleSkills].sort((a, b) => {
      if (a.relationType === "essential" && b.relationType !== "essential") return -1;
      if (a.relationType !== "essential" && b.relationType === "essential") return 1;
      return a.skill.preferredLabel.localeCompare(b.skill.preferredLabel);
    });

    let gapCount = 0;
    const MAX_GAPS = 12;

    for (const rs of sortedSkills) {
      if (ownedUris.has(rs.skill.uri)) {
        // Shared node 
        const node = nodes.get(rs.skill.uri)!;
        node.status = "shared";
        edges.push({ source: rs.skill.uri, target: role.uri, type: "solid" });
      } else {
        if (gapCount >= MAX_GAPS) continue;
        gapCount++;
        
        // Gap node
        if (!nodes.has(rs.skill.uri)) {
           nodes.set(rs.skill.uri, {
             id: rs.skill.uri,
             label: rs.skill.preferredLabel,
             type: "ROLE_GAP",
             status: "missing"
           });
        }
        // Dashed edge from gap to role
        edges.push({ source: rs.skill.uri, target: role.uri, type: "dashed" });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}
