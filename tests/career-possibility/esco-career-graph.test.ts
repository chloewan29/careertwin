import { describe, it, expect, beforeAll } from "vitest";
import { ensureIndexes, getSkillsForOccupation, getOccupations } from "../../lib/career-possibility/external-taxonomy/esco/esco-index";
import { getRelevantEscoOccupationCandidates, buildEscoPresentationGraph } from "../../lib/career-possibility/external-taxonomy/esco/esco-career-graph";

describe("ESCO Career Graph Core & Presentation Adapter", () => {
  beforeAll(() => {
    ensureIndexes();
  });

  it("excludes occupations with zero overlap", () => {
    // Pick an ESCO skill, e.g., something from software developer
    const allOccs = getOccupations();
    const targetOcc = allOccs.find(o => o.preferredLabel.toLowerCase().includes("software developer")) || allOccs[0];
    const skills = getSkillsForOccupation(targetOcc.uri);
    
    // Own exactly one skill from it
    const owned = [skills[0].skill.uri];
    const candidates = getRelevantEscoOccupationCandidates({ ownedSkillUris: owned });
    
    expect(candidates.length).toBeGreaterThan(0);
    // Unrelated occs must not be in this list
    const unrelated = candidates.find(c => c.totalOwned === 0);
    expect(unrelated).toBeUndefined();
  });

  it("builds a visual presentation graph with correct bounded nodes and edges", () => {
    const allOccs = getOccupations();
    const targetOcc = allOccs.find(o => o.preferredLabel.toLowerCase().includes("software developer")) || allOccs[0];
    const skills = getSkillsForOccupation(targetOcc.uri);
    
    const syntheticOwned = [
      { skillUri: skills[0].skill.uri, evidenceIds: ["ev-1"] },
      { skillUri: skills[1].skill.uri, evidenceIds: ["ev-2"] }
    ];

    // First get candidates to know what will actually be admitted
    const candidates = getRelevantEscoOccupationCandidates({ ownedSkillUris: syntheticOwned.map(s => s.skillUri) });
    const selectedUri = candidates[0].uri;

    const graph = buildEscoPresentationGraph(syntheticOwned, selectedUri, 3);
    
    // YOU node must exist
    expect(graph.nodes.find(n => n.id === "YOU")).toBeDefined();
    
    // Owned skills must exist and be connected to YOU
    expect(graph.nodes.find(n => n.id === skills[0].skill.uri)).toBeDefined();
    expect(graph.edges.find(e => e.source === "YOU" && e.target === skills[0].skill.uri)).toBeDefined();

    // The selected role gap nodes must exist, but unowned skills for UNSELECTED roles must not.
    const gapEdges = graph.edges.filter(e => e.type === "dashed");
    expect(gapEdges.length).toBeGreaterThan(0); // Should be many gaps for a typical ESCO role
    expect(gapEdges[0].target).toBe(selectedUri); // Dashed edges go to selected role

    // No YOU -> gap edge
    for (const e of gapEdges) {
      const reverse = graph.edges.find(r => r.source === "YOU" && r.target === e.source);
      expect(reverse).toBeUndefined(); // YOU does not own a gap
    }
  });

  it("restricts visible role count", () => {
    const syntheticOwned = [{ skillUri: getOccupations()[0].uri, evidenceIds: [] }]; // bogus URI for safety test
    const graph = buildEscoPresentationGraph(syntheticOwned, undefined, 2);
    const roles = graph.nodes.filter(n => n.type === "FUTURE_ROLE");
    expect(roles.length).toBeLessThanOrEqual(2);
  });
});
