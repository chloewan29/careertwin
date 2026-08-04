import assert from "node:assert/strict";
import { buildPersonalCareerMapExplorerViewModel } from "../../lib/career-possibility/career-map-explorer-view-model";
import type { PersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";

function presentation(count: number): PersonalCareerMapPresentation {
  return {
    mode: "personal", status: "provisional", mapTrustStatus: "provisional", unresolvedEvidenceCount: 1, reviewedEvidenceCount: 0, provisionalEvidenceCount: count,
    capabilities: Array.from({ length: count }, (_, index) => ({ id: `canonical-${index}`, label: `Capability ${index}`, family: `Family ${index % 3}`, evidence: [{ id: `mapping-${index}`, evidenceId: `evidence-${index}`, text: `Real evidence ${index}`, relationship: index % 2 ? "transferable_signal" : "direct_evidence", sourceStart: index * 10, sourceEnd: index * 10 + 9, provisional: true }] })),
    futurePaths: { available: false, reason: "Unavailable" }, roleLens: { available: false, reason: "Unavailable" },
  };
}

for (const count of [2, 4, 6, 8]) {
  const input = presentation(count);
  const result = buildPersonalCareerMapExplorerViewModel(input);
  assert.equal(result.mode, "personal");
  assert.equal(result.capabilities.length, count);
  assert.deepEqual(result.capabilities.map((item) => item.id), input.capabilities.map((item) => item.id));
  assert.deepEqual(result.capabilities.map((item) => item.label), input.capabilities.map((item) => item.label));
  assert.deepEqual(result.capabilities.map((item) => item.family), input.capabilities.map((item) => item.family));
  assert.deepEqual(result.experiences.map((item) => item.id), input.capabilities.map((item) => item.evidence[0].evidenceId));
  assert.equal(result.experiences[0].relationshipByCapabilityId?.["canonical-0"], "direct_evidence");
  assert.equal(result.experiences[1].relationshipByCapabilityId?.["canonical-1"], "transferable_signal");
  assert.equal(result.experiences.every((item) => item.reviewStatus === "provisional"), true);
  assert.deepEqual(result.adjacentRoles, []);
  assert.equal("growthAreas" in result, false);
  assert.deepEqual(buildPersonalCareerMapExplorerViewModel(input), result);
  assert.equal(Object.isFrozen(result), true);
}

console.log("personal career map skeleton adapter tests passed");
