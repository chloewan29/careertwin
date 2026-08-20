import { describe, it, expect, beforeAll } from "vitest";
import { buildEscoCareerMapPresentation } from "../../lib/career-possibility/esco-career-map-presentation-adapter";
import { ensureIndexes } from "../../lib/career-possibility/external-taxonomy/esco/esco-index";

import { getOccupations, getSkillsForOccupation } from "../../lib/career-possibility/external-taxonomy/esco/esco-index";

describe("ESCO Career Map Presentation Adapter", () => {
  let realSkillUri = "";

  beforeAll(() => {
    ensureIndexes();
    const allOccs = getOccupations();
    const targetOcc = allOccs.find(o => o.preferredLabel.toLowerCase().includes("software developer")) || allOccs[0];
    const skills = getSkillsForOccupation(targetOcc.uri);
    realSkillUri = skills[0].skill.uri;
  });

  const mockEvidence = [
    { evidenceId: "ev-1", sourceExcerpt: "Did react stuff" },
    { evidenceId: "ev-2", sourceExcerpt: "Built APIs" },
  ];

  const getMockState = () => ({
    version: "2.0.0" as const,
    ownedSkills: [
      { skillUri: realSkillUri, evidenceIds: ["ev-1", "ev-2"] },
    ],
    evidence: mockEvidence,
  });

  it("owned skill retains evidence IDs and counts", () => {
    const projection = buildEscoCareerMapPresentation(getMockState());
    const capability = projection.nodes.find(n => n.id === realSkillUri);
    
    expect(capability).toBeDefined();
    expect(capability?.type).toBe("capability");
    if (capability?.type === "capability") {
      expect(capability.evidenceIds).toEqual(["ev-1", "ev-2"]);
    }
  });

  it("exact skill→evidence provenance is maintained", () => {
    const projection = buildEscoCareerMapPresentation(getMockState());
    const edges = projection.edges.filter(e => e.type === "capability_supported_by_evidence");
    
    expect(edges).toHaveLength(2);
    expect(edges.find(e => e.toId === "ev-1")?.fromId).toBe(realSkillUri);
    expect(edges.find(e => e.toId === "ev-2")?.fromId).toBe(realSkillUri);
  });

  it("no false family_contains_capability edge from YOU", () => {
    const projection = buildEscoCareerMapPresentation(getMockState());
    const familyEdgesFromUser = projection.edges.filter(e => e.type === "family_contains_capability" && e.fromId === "user");
    expect(familyEdgesFromUser).toHaveLength(0);

    const ownsEdgesFromUser = projection.edges.filter(e => e.type === "user_owns_capability" && e.fromId === "user");
    expect(ownsEdgesFromUser).toHaveLength(1);
    expect(ownsEdgesFromUser[0].toId).toBe(realSkillUri);
  });

  it("hierarchy group not emitted as owned peer", () => {
    const projection = buildEscoCareerMapPresentation(getMockState());
    const familyNodes = projection.nodes.filter(n => n.type === "capability_family");
    expect(familyNodes).toHaveLength(0); // Dummy families were removed
  });
});
