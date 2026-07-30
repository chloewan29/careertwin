import assert from "node:assert/strict";
import { buildPersonalTargetRoleComparison } from "../../lib/career-possibility/personal-target-role-comparison";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityGovernanceLibrary } from "../../lib/career-possibility/canonical-capability-governance-decisions";
import { roleCapabilityProfileById } from "../../lib/career-possibility/fixtures/roleCapabilityProfiles";
import type { LocalCareerMapState } from "../../lib/career-possibility/local-career-map-state";
import type { RoleCapabilityProfile } from "../../lib/career-possibility/role-capability-library";

const version = "defs/1";
const state: LocalCareerMapState = { schemaVersion: "1.0.0", definitionVersion: version, source: "reviewed_resume", importedAt: "x", updatedAt: "x", capabilities: [
  { capabilityId: "forecasting", capabilityLabel: "Forecasting", family: "Analytics & Insight", mappings: [{ mappingId: "m1", evidenceId: "e1", relationship: "direct_evidence", sourceText: "Forecast evidence", sourceStart: 0, sourceEnd: 17, provisional: true }] },
  { capabilityId: "variance-analysis", capabilityLabel: "Variance Analysis", family: "Analytics & Insight", mappings: [{ mappingId: "m2", evidenceId: "e2", relationship: "transferable_signal", sourceText: "Variance evidence", sourceStart: 0, sourceEnd: 17, provisional: true }] },
] };
const build = (role: RoleCapabilityProfile) => buildPersonalTargetRoleComparison({ localCareerMapState: state, targetRoleProfile: role, canonicalCapabilityLibrary, governanceDecisions: canonicalCapabilityGovernanceLibrary, definitionVersion: version });

const role = structuredClone(roleCapabilityProfileById.get("fpa-manager")!);
role.shouldHaveCapabilities.push({ capabilityId: "strategic-analysis", label: "Strategic Analysis", importance: "should", expectedEvidence: "Show a decision shaped by structured strategic analysis.", minimumProofLevel: "demonstrated" });
const inputBefore = structuredClone({ state, role });
const fpa = build(role);
assert.equal(fpa.ok, true);
if (!fpa.ok) throw new Error();
assert.deepEqual(fpa.comparison.requirements.map((item) => item.capabilityId), ["forecasting", "financial-planning", "variance-analysis", "executive-reporting", "strategic-analysis"]);
assert.deepEqual(fpa.comparison.requirements.map((item) => item.outcome), ["directly_demonstrated", "governance_deferred", "transferable_signal", "governance_deferred", "evidence_not_yet_shown"]);
assert.equal(fpa.comparison.requirements[4].expectedEvidence, "Show a decision shaped by structured strategic analysis.");
assert.equal("expectedEvidence" in fpa.comparison.requirements[0], false);
assert.equal("expectedEvidence" in fpa.comparison.requirements[2], false);
assert.equal("expectedEvidence" in fpa.comparison.requirements[1], false);
assert.equal(fpa.comparison.requirements[0].evidence[0].text, "Forecast evidence");
assert.equal(fpa.comparison.requirements[2].evidence[0].relationship, "transferable_signal");

const noGuidanceRole = structuredClone(role);
noGuidanceRole.shouldHaveCapabilities[2].expectedEvidence = "   ";
const noGuidance = build(noGuidanceRole);
assert.equal(noGuidance.ok, true);
if (!noGuidance.ok) throw new Error();
assert.equal("expectedEvidence" in noGuidance.comparison.requirements[4], false);

const legal = build(structuredClone(roleCapabilityProfileById.get("legal-operations-manager")!));
assert.equal(legal.ok, true);
if (!legal.ok) throw new Error();
assert.equal(legal.comparison.requirements.some((item) => item.outcome === "governance_excluded"), true);
assert.equal(legal.comparison.requirements.filter((item) => item.outcome === "governance_excluded").every((item) => !("expectedEvidence" in item)), true);
assert.deepEqual({ state, role }, inputBefore);
assert.deepEqual(build(role), fpa);
assert.equal(Object.isFrozen(fpa.comparison), true);
assert.equal(Object.isFrozen(fpa.comparison.requirements), true);
assert.equal(fpa.comparison.requirements.every(Object.isFrozen), true);
assert.equal(fpa.comparison.requirements.every((item) => Object.isFrozen(item.evidence)), true);
assert.deepEqual(JSON.parse(JSON.stringify(fpa.comparison)), fpa.comparison);
assert.equal("score" in fpa.comparison, false);
assert.equal("suitability" in fpa.comparison, false);
assert.equal("matchV2" in fpa.comparison, false);
assert.equal("jobDescription" in fpa.comparison, false);

const unknownRole = structuredClone(roleCapabilityProfileById.get("fpa-manager")!);
unknownRole.mustHaveCapabilities[0].capabilityId = "unknown-id";
assert.equal(build(unknownRole).ok, false);
console.log("personal target role comparison tests passed");
