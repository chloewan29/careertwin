import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildProofBuildingAction, PROOF_BUILDING_ACTION_AUTHORITY_VERSION, PROOF_BUILDING_ACTION_COPY_VERSION } from "../../lib/career-possibility/proof-building-action";

const input = { capabilityId: "research-design", capabilityLabel: "Research Design", importance: "must", expectedEvidence: "Owned research designed around a consequential customer question.", reason: "Must-have requirement with no reviewed evidence yet." } as const;
const before = structuredClone(input);
const available = buildProofBuildingAction(input);
assert.equal(available.status, "available");
if (available.status !== "available") throw new Error();
assert.equal(available.category, "find_existing_proof");
assert.deepEqual([available.capabilityId, available.capabilityLabel, available.importance, available.expectedEvidence], [input.capabilityId, input.capabilityLabel, input.importance, input.expectedEvidence]);
assert.deepEqual(available.copy, { source: "career_twin_platform", version: PROOF_BUILDING_ACTION_COPY_VERSION, heading: "Next action", instruction: "Look through your past work for an example that demonstrates this proof.", uncertainty: "Career Map does not know whether that experience exists." });
assert.deepEqual(available.provenance, { source: "next_proof_to_build", capabilityId: input.capabilityId, actionAuthorityVersion: PROOF_BUILDING_ACTION_AUTHORITY_VERSION });
assert.deepEqual(input, before); assert.deepEqual(buildProofBuildingAction(input), available);
assert.equal(Object.isFrozen(available), true); assert.equal(Object.isFrozen(available.copy), true); assert.equal(Object.isFrozen(available.provenance), true);
assert.deepEqual(JSON.parse(JSON.stringify(available)), available);
assert.equal(available.copy.instruction.includes(input.expectedEvidence), false);

const cases: readonly [unknown, string][] = [
  [undefined, "missing_next_proof"], [null, "missing_next_proof"], ["bad", "invalid_input"], [[], "invalid_input"],
  [{ ...input, capabilityId: "" }, "blank_capability_id"], [{ ...input, capabilityId: "   " }, "blank_capability_id"],
  [{ ...input, capabilityLabel: "" }, "blank_capability_label"], [{ ...input, capabilityLabel: "   " }, "blank_capability_label"],
  [{ ...input, expectedEvidence: "" }, "blank_expected_evidence"], [{ ...input, expectedEvidence: "   " }, "blank_expected_evidence"],
  [{ ...input, importance: "critical" }, "unsupported_importance"], [{ ...input, capabilityId: 1 }, "invalid_input"],
];
for (const [value, reason] of cases) {
  const result = buildProofBuildingAction(value); assert.equal(result.status, "unavailable"); assert.equal(result.category, "no_action_available");
  if (result.status !== "unavailable") throw new Error(); assert.equal(result.reason, reason); assert.equal(Object.isFrozen(result), true); assert.equal(Object.isFrozen(result.provenance), true); assert.deepEqual(JSON.parse(JSON.stringify(result)), result); assert.deepEqual(buildProofBuildingAction(value), result);
}

const serialized = JSON.stringify([available, ...cases.map(([value]) => buildProofBuildingAction(value))]);
assert.equal(/strengthen_existing_proof|build_new_proof|capture_future_proof|project|course|certification|networking|employer|timeline/i.test(serialized), false);
assert.equal(/"(?:score|fit|readiness|suitability|jobDescription|matchV2)"/i.test(serialized), false);
const componentSource = readFileSync("components/career-possibility/TargetRoleCapabilityComparison.tsx", "utf8");
assert.equal(componentSource.includes("buildProofBuildingAction"), true); assert.equal(componentSource.includes('proofAction.status === "available"'), true); assert.equal(componentSource.includes("proofAction.copy.heading"), true); assert.equal(componentSource.includes("proofAction.copy.instruction"), true); assert.equal(componentSource.includes("proofAction.copy.uncertainty"), true);
assert.equal(componentSource.match(/Review evidence already in your Career Map/g)?.length, 1); assert.equal(componentSource.match(/href="#personal-explorer-heading"/g)?.length, 1); assert.equal(/proofAction\.status === "available"[\s\S]*href="#personal-explorer-heading"/.test(componentSource), true); assert.equal(/<a[^>]*(?:onClick|scrollIntoView)/i.test(componentSource), false); assert.equal(/related evidence|matching evidence|closest evidence|recommended evidence/i.test(componentSource), false);
const personalExplorerSource = readFileSync("components/career-possibility/PersonalCapabilityExplorer.tsx", "utf8");
assert.equal(personalExplorerSource.match(/id="personal-explorer-heading"/g)?.length, 1); assert.equal(/id="personal-explorer-heading" tabIndex=\{-1\}/.test(personalExplorerSource), true); assert.equal(/filter\(|\.sort\(|autoFocus|scrollIntoView/.test(personalExplorerSource), false);
assert.equal(personalExplorerSource.includes("Continue to Role Lens"), false); assert.equal(personalExplorerSource.includes('href="#target-role-heading"'), false); assert.equal(/<a[^>]*(?:onClick|scrollIntoView)/i.test(personalExplorerSource), false);
assert.equal(componentSource.match(/id="target-role-heading"/g)?.length, 1); assert.equal(/id="target-role-heading" tabIndex=\{-1\}/.test(componentSource), true);
assert.equal(/strengthen_existing_proof|build_new_proof|capture_future_proof/.test(componentSource), false);
console.log("proof building action tests passed");
