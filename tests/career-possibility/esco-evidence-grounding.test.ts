import { describe, it, expect, beforeAll } from "vitest";
import { ensureIndexes, searchSkillsByLabel } from "../../lib/career-possibility/external-taxonomy/esco/esco-index";
import { retrieveEscoSkillCandidates, processEvidenceGrounding } from "../../lib/career-possibility/external-taxonomy/esco/esco-evidence-grounding";
import type { EscoEvidenceGroundingProvider } from "../../lib/career-possibility/external-taxonomy/esco/esco-evidence-grounding-contract";

describe("ESCO Evidence Grounding", () => {
  beforeAll(() => {
    ensureIndexes();
  });

  it("retrieves candidates for evidence text", () => {
    const evidenceText = "Led a 12-month cross-functional migration program, sequenced delivery across five teams and resolved milestone dependencies.";
    const candidates = retrieveEscoSkillCandidates(evidenceText);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("processes and materializes ownership correctly via a mock provider", async () => {
    const mockProvider: EscoEvidenceGroundingProvider = {
      groundEvidence: async (req) => {
        // Return a deterministic mock mapping using the first candidate found
        const c = req.candidateSkills[0];
        return {
          contractVersion: "mock",
          results: [
            {
              evidenceId: "ev-1",
              mappings: [
                {
                  skillUri: c.skillUri,
                  confidence: "high",
                  groundingBasis: "direct",
                  rationale: "mock"
                }
              ]
            }
          ]
        };
      }
    };

    const evidenceItems = [
      { evidenceId: "ev-1", evidenceText: "manage software development" }
    ];

    const { rawGroundings, ownedSkills } = await processEvidenceGrounding(evidenceItems, { provider: mockProvider });
    expect(rawGroundings.length).toBe(1);
    expect(rawGroundings[0].unresolved).toBe(false);
    expect(ownedSkills.length).toBe(1);
    expect(ownedSkills[0].evidenceIds).toContain("ev-1");
  });

  it("rejects unknown URIs", async () => {
    const mockProvider: EscoEvidenceGroundingProvider = {
      groundEvidence: async (req) => {
        return {
          contractVersion: "mock",
          results: [
            {
              evidenceId: "ev-1",
              mappings: [
                {
                  skillUri: "http://unknown-uri",
                  confidence: "high",
                  groundingBasis: "direct",
                  rationale: "mock"
                }
              ]
            }
          ]
        };
      }
    };

    const evidenceItems = [
      { evidenceId: "ev-1", evidenceText: "manage software development" }
    ];

    const { rawGroundings, ownedSkills } = await processEvidenceGrounding(evidenceItems, { provider: mockProvider });
    expect(rawGroundings[0].mappings.length).toBe(0); // Validated away
    expect(rawGroundings[0].unresolved).toBe(true);
    expect(ownedSkills.length).toBe(0);
  });

  it("aggregates multiple evidence supporting the same skill", async () => {
    const mockProvider: EscoEvidenceGroundingProvider = {
      groundEvidence: async (req) => {
        // Return the same URI for both
        const knownSkill = searchSkillsByLabel("develop")[0];
        return {
          contractVersion: "mock",
          results: [
            {
              evidenceId: "ev-1",
              mappings: [
                {
                  skillUri: knownSkill.uri,
                  confidence: "high",
                  groundingBasis: "direct",
                  rationale: "mock"
                }
              ]
            },
            {
              evidenceId: "ev-2",
              mappings: [
                {
                  skillUri: knownSkill.uri,
                  confidence: "high",
                  groundingBasis: "direct",
                  rationale: "mock"
                }
              ]
            }
          ]
        };
      }
    };

    const evidenceItems = [
      { evidenceId: "ev-1", evidenceText: "one" },
      { evidenceId: "ev-2", evidenceText: "two" }
    ];

    const { ownedSkills } = await processEvidenceGrounding(evidenceItems, { provider: mockProvider });
    expect(ownedSkills.length).toBe(1); // deduplicated
    expect(ownedSkills[0].evidenceIds.length).toBe(2);
    expect(ownedSkills[0].evidenceIds).toEqual(["ev-1", "ev-2"]);
  });
});
