import assert from "node:assert/strict";
import { buildPersonalTargetRoleComparison } from "../../lib/career-possibility/personal-target-role-comparison";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityGovernanceLibrary } from "../../lib/career-possibility/canonical-capability-governance-decisions";
import type { LocalCareerMapState } from "../../lib/career-possibility/local-career-map-state";
import type { CapabilityImportance, RoleCapabilityProfile, RoleCapabilityRequirement } from "../../lib/career-possibility/role-capability-library";

const definitionVersion = "defs/1";
const canonicalById = new Map(canonicalCapabilityLibrary.capabilities.map((item) => [item.id, item]));
const requirement = (capabilityId: string, importance: CapabilityImportance, expectedEvidence = `Show authored proof for ${capabilityId}.`): RoleCapabilityRequirement => ({ capabilityId, label: canonicalById.get(capabilityId)?.label ?? capabilityId, importance, expectedEvidence, minimumProofLevel: "demonstrated" });
const role = (must: RoleCapabilityRequirement[], should: RoleCapabilityRequirement[], differentiators: RoleCapabilityRequirement[]): RoleCapabilityProfile => ({ roleFamilyId: "test-role", canonicalTitle: "Test Role", aliases: [], searchTitles: [], domain: "test", seniorityBand: "manager", description: "Test role.", mustHaveCapabilities: must, shouldHaveCapabilities: should, differentiatingCapabilities: differentiators, evidenceRequirements: [], commonGrowthAreas: [], adjacentFromCapabilities: [], relatedRoleFamilies: [], sourceNotes: [], version: "1.0.0" });
const state = (supported: readonly { id: string; relationship: "direct_evidence" | "transferable_signal" }[]): LocalCareerMapState => { const present = supported.length ? supported : [{ id: "forecasting", relationship: "direct_evidence" as const }]; return { schemaVersion: "1.0.0", definitionVersion, source: "reviewed_resume", importedAt: "x", updatedAt: "x", capabilities: present.map(({ id, relationship }, index) => { const definition = canonicalById.get(id)!; return { capabilityId: id, capabilityLabel: definition.label, family: definition.family, mappings: [{ mappingId: `m${index}`, evidenceId: `e${index}`, relationship, sourceText: `Evidence ${index}`, sourceStart: 0, sourceEnd: 10, provisional: true }] }; }) }; };
const build = (targetRoleProfile: RoleCapabilityProfile, localCareerMapState = state([])) => buildPersonalTargetRoleComparison({ localCareerMapState, targetRoleProfile, canonicalCapabilityLibrary, governanceDecisions: canonicalCapabilityGovernanceLibrary, definitionVersion });

const rankedRole = role(
  [requirement("research-design", "must", "First must guidance."), requirement("customer-segmentation", "must", "Second must guidance.")],
  [requirement("strategic-analysis", "should", "Should guidance.")],
  [requirement("benefits-realisation", "differentiator", "Differentiator guidance.")],
);
const rankedBefore = structuredClone(rankedRole);
const ranked = build(rankedRole);
assert.equal(ranked.ok, true);
if (!ranked.ok) throw new Error();
assert.deepEqual(ranked.comparison.nextProofToBuild, { capabilityId: "research-design", capabilityLabel: "Research Design", importance: "must", expectedEvidence: "First must guidance.", reason: "Must-have requirement with no reviewed evidence yet." });
assert.deepEqual(ranked.comparison.requirements.map((item) => item.capabilityId), ["research-design", "customer-segmentation", "strategic-analysis", "benefits-realisation"]);
assert.deepEqual(ranked.comparison.requirements.map((item) => item.outcome), ["evidence_not_yet_shown", "evidence_not_yet_shown", "evidence_not_yet_shown", "evidence_not_yet_shown"]);

const shouldWins = build(rankedRole, state([{ id: "research-design", relationship: "direct_evidence" }, { id: "customer-segmentation", relationship: "direct_evidence" }]));
assert.equal(shouldWins.ok, true);
if (!shouldWins.ok) throw new Error();
assert.equal(shouldWins.comparison.nextProofToBuild?.capabilityId, "strategic-analysis");
assert.equal(shouldWins.comparison.nextProofToBuild?.reason, "Supporting requirement with no reviewed evidence yet.");

const differentiatorWins = build(rankedRole, state([{ id: "research-design", relationship: "direct_evidence" }, { id: "customer-segmentation", relationship: "direct_evidence" }, { id: "strategic-analysis", relationship: "transferable_signal" }]));
assert.equal(differentiatorWins.ok, true);
if (!differentiatorWins.ok) throw new Error();
assert.equal(differentiatorWins.comparison.nextProofToBuild?.capabilityId, "benefits-realisation");
assert.equal(differentiatorWins.comparison.nextProofToBuild?.reason, "Differentiating requirement with no reviewed evidence yet.");

const blankThenEligible = structuredClone(rankedRole);
blankThenEligible.mustHaveCapabilities[0].expectedEvidence = "   ";
delete (blankThenEligible.mustHaveCapabilities[1] as Partial<RoleCapabilityRequirement>).expectedEvidence;
const skipUnguided = build(blankThenEligible);
assert.equal(skipUnguided.ok, true);
if (!skipUnguided.ok) throw new Error();
assert.equal(skipUnguided.comparison.nextProofToBuild?.capabilityId, "strategic-analysis");
assert.equal("expectedEvidence" in skipUnguided.comparison.requirements[0], false);
assert.equal("expectedEvidence" in skipUnguided.comparison.requirements[1], false);

const noCandidate = build(rankedRole, state([{ id: "research-design", relationship: "direct_evidence" }, { id: "customer-segmentation", relationship: "transferable_signal" }, { id: "strategic-analysis", relationship: "direct_evidence" }, { id: "benefits-realisation", relationship: "transferable_signal" }]));
assert.equal(noCandidate.ok, true);
if (!noCandidate.ok) throw new Error();
assert.equal("nextProofToBuild" in noCandidate.comparison, false);
assert.deepEqual(noCandidate.comparison.requirements.map((item) => item.outcome), ["directly_demonstrated", "transferable_signal", "directly_demonstrated", "transferable_signal"]);

const governedRole = role([requirement("analytics-leadership", "must"), requirement("matter-management", "must"), requirement("research-design", "must", "Actionable guidance.")], [], []);
const governed = build(governedRole);
assert.equal(governed.ok, true);
if (!governed.ok) throw new Error();
assert.equal(governed.comparison.requirements[0].outcome, "governance_deferred");
assert.equal(governed.comparison.requirements[1].outcome, "governance_excluded");
assert.equal(governed.comparison.nextProofToBuild?.capabilityId, "research-design");
assert.equal(governed.comparison.requirements.slice(0, 2).every((item) => !("expectedEvidence" in item)), true);

assert.deepEqual(rankedRole, rankedBefore);
assert.deepEqual(build(rankedRole), ranked);
assert.equal(Object.isFrozen(ranked.comparison), true);
assert.equal(Object.isFrozen(ranked.comparison.nextProofToBuild), true);
assert.equal(Object.isFrozen(ranked.comparison.requirements), true);
assert.equal(ranked.comparison.requirements.every(Object.isFrozen), true);
assert.equal(ranked.comparison.requirements.every((item) => Object.isFrozen(item.evidence)), true);
assert.deepEqual(JSON.parse(JSON.stringify(ranked.comparison)), ranked.comparison);
const serialized = JSON.stringify(ranked.comparison);
assert.equal(/"(?:score|fit|suitability|readiness|jobDescription|matchV2)"/i.test(serialized), false);
assert.equal(ranked.comparison.requirements[0].expectedEvidence, "First must guidance.");

console.log("personal target role comparison tests passed");
