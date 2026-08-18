import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAREER_MAP_GRAPH_PROJECTION_VERSION,
  type CareerMapGraphProjection,
} from "../../lib/career-possibility/career-map-graph-projection";
import {
  buildCareerGraphFocusSet,
  buildCareerGraphRoleFocusState,
  buildCareerGraphTopologySeeds,
  buildCareerGraphVisualModel,
} from "../../lib/career-possibility/career-graph-visual-adapter";

const projection: CareerMapGraphProjection = {
  version: CAREER_MAP_GRAPH_PROJECTION_VERSION,
  nodes: [
    { type: "user", id: "user" },
    { type: "capability_family", id: "family-a", label: "Family A", capabilityIds: ["cap-a", "cap-b"] },
    { type: "capability", id: "cap-a", label: "Capability A", familyId: "family-a", evidenceIds: ["ev-shared"] },
    { type: "capability", id: "cap-b", label: "Capability B", familyId: "family-a", evidenceIds: ["ev-shared"] },
    { type: "evidence", id: "ev-shared", text: "Private evidence must stay out of graph labels.", relationship: "direct_evidence", capabilityIds: ["cap-a", "cap-b"] },
    { type: "role", id: "role-1", title: "Role One", proximityRank: 0 },
    { type: "role", id: "role-2", title: "Role Two", proximityRank: 1 },
    { type: "role", id: "role-3", title: "Role Three", proximityRank: 2 },
    { type: "role", id: "role-4", title: "Role Four", proximityRank: 3 },
    { type: "role_requirement", id: "req:1:a", roleId: "role-1", capabilityId: "cap-a", capabilityLabel: "Capability A", requirementState: "directly_demonstrated" },
    { type: "role_requirement", id: "req:1:gap", roleId: "role-1", capabilityId: "measurement-design", capabilityLabel: "Measurement Design", requirementState: "evidence_not_yet_shown" },
    { type: "role_requirement", id: "req:2:gap", roleId: "role-2", capabilityId: "measurement-design", capabilityLabel: "Measurement Design", requirementState: "evidence_not_yet_shown" },
  ],
  edges: [
    { type: "user_has_family", fromId: "user", toId: "family-a" },
    { type: "family_contains_capability", fromId: "family-a", toId: "cap-a" },
    { type: "family_contains_capability", fromId: "family-a", toId: "cap-b" },
    { type: "capability_supported_by_evidence", fromId: "cap-a", toId: "ev-shared" },
    { type: "capability_supported_by_evidence", fromId: "cap-b", toId: "ev-shared" },
    { type: "role_requires_capability", fromId: "role-1", toId: "req:1:a" },
    { type: "role_requires_capability", fromId: "role-1", toId: "req:1:gap" },
    { type: "role_requires_capability", fromId: "role-2", toId: "req:2:gap" },
  ],
};

const model = buildCareerGraphVisualModel(projection);
const nodesOf = (nodeType: string) => model.nodes.filter((node) => node.nodeType === nodeType);
const linksOf = (linkType: string) => model.links.filter((link) => link.linkType === linkType);

assert.equal(nodesOf("YOU").length, 1);
assert.equal(nodesOf("FAMILY").length, 1);
assert.equal(nodesOf("FAMILY")[0]?.presentationOnly, true);
assert.equal(nodesOf("FAMILY")[0]?.personalOwned, false);
assert.deepEqual(nodesOf("FAMILY")[0]?.parentIds, ["user"]);

assert.deepEqual(nodesOf("CAPABILITY").map((node) => node.id), ["cap-a", "cap-b"]);
assert.deepEqual(nodesOf("CAPABILITY")[0]?.familyIds, ["family-a"]);
assert.deepEqual(nodesOf("CAPABILITY")[0]?.parentIds, ["family-a"]);
assert.equal(nodesOf("EVIDENCE").length, 1);
assert.equal(nodesOf("EVIDENCE")[0]?.label, undefined);
assert.deepEqual(nodesOf("EVIDENCE")[0]?.familyIds, ["family-a"]);
assert.deepEqual(nodesOf("EVIDENCE")[0]?.parentIds, ["cap-a", "cap-b"]);
assert.equal(linksOf("CAPABILITY_EVIDENCE").length, 2);

assert.deepEqual(nodesOf("ROLE").map((node) => node.proximityRank), [0, 1, 2, 3]);
assert.equal(nodesOf("ROLE_ONLY_CAPABILITY").length, 1);
assert.equal(nodesOf("ROLE_ONLY_CAPABILITY")[0]?.id, "measurement-design");
assert.equal(nodesOf("ROLE_ONLY_CAPABILITY")[0]?.personalOwned, false);
assert.equal(nodesOf("ROLE_ONLY_CAPABILITY")[0]?.familyLabel, "Analytics & Insight");
assert.deepEqual(nodesOf("ROLE_ONLY_CAPABILITY")[0]?.roleIds, ["role-1", "role-2"]);
assert.deepEqual(nodesOf("ROLE_ONLY_CAPABILITY")[0]?.parentIds, ["role-1", "role-2"]);
assert.equal(linksOf("ROLE_ONLY_CAPABILITY").length, 2);

assert.equal(model.nodes.filter((node) => node.semanticId === "cap-a").length, 1);
assert.equal(model.nodes.some((node) => node.label?.includes("Private evidence")), false);

const familyFocus = buildCareerGraphFocusSet(model, "family-a");
assert.deepEqual(familyFocus, new Set(["family-a", "user", "cap-a", "cap-b", "ev-shared"]));
const capabilityFocus = buildCareerGraphFocusSet(model, "cap-a");
assert.deepEqual(capabilityFocus, new Set(["cap-a", "family-a", "ev-shared", "role-1", "user"]));
const roleFocus = buildCareerGraphFocusSet(model, "role-1");
assert.deepEqual(roleFocus, new Set(["role-1", "user", "cap-a", "measurement-design", "family-a"]));

const roleFocusState = buildCareerGraphRoleFocusState(model, "role-1");
assert.ok(roleFocusState);
assert.deepEqual(roleFocusState.ownedCapabilityIds, new Set(["cap-a"]));
assert.deepEqual(roleFocusState.gapCapabilityIds, new Set(["measurement-design"]));
assert.equal(roleFocusState.focusNodeIds.has("ev-shared"), false, "role focus must not expand evidence");
assert.equal(model.nodes.some((node) => !roleFocusState.focusNodeIds.has(node.id)), true, "unrelated context remains in the model");

const topologySeeds = buildCareerGraphTopologySeeds(model);
const roleOneSeed = topologySeeds.get("role-1");
const roleTwoSeed = topologySeeds.get("role-2");
const gapSeed = topologySeeds.get("measurement-design");
assert.ok(roleOneSeed && roleTwoSeed && gapSeed);
const angularDistance = (left: number, right: number) => Math.abs(Math.atan2(Math.sin(left - right), Math.cos(left - right)));
const roleOneAngle = Math.atan2(roleOneSeed.y, roleOneSeed.x);
const roleTwoAngle = Math.atan2(roleTwoSeed.y, roleTwoSeed.x);
const gapAngle = Math.atan2(gapSeed.y, gapSeed.x);
assert.ok(angularDistance(roleTwoAngle, gapAngle) < 0.5, "role sector follows its connected capability topology");
assert.ok(angularDistance(roleOneAngle, roleTwoAngle) < 1.2, "local collision handling must not invert roles into even global spacing");
assert.ok(Math.hypot(roleOneSeed.x, roleOneSeed.y) < Math.hypot(roleTwoSeed.x, roleTwoSeed.y), "proximityRank remains a radius-only input");

// Task H assertions: Outward geometry for gap capabilities
const roleOneRadius = Math.hypot(roleOneSeed.x, roleOneSeed.y);
const roleTwoRadius = Math.hypot(roleTwoSeed.x, roleTwoSeed.y);
const gapRadius = Math.hypot(gapSeed.x, gapSeed.y);

// For multi-role gap, it should be placed outside the max role radius
assert.ok(gapRadius > Math.max(roleOneRadius, roleTwoRadius) + 100, "Gap capability is placed in the outward domain beyond the roles");
assert.ok(gapRadius > roleOneRadius, "U -> R1 < U -> G distance ordering");
assert.ok(gapRadius > roleTwoRadius, "U -> R2 < U -> G distance ordering");

// Outward projection check for role 1
const d1 = { x: roleOneSeed.x / roleOneRadius, y: roleOneSeed.y / roleOneRadius };
const gapRel1 = { x: gapSeed.x - roleOneSeed.x, y: gapSeed.y - roleOneSeed.y };
const proj1 = gapRel1.x * d1.x + gapRel1.y * d1.y;
assert.ok(proj1 > 50, "Gap has positive meaningful visual margin projected outwardly from role 1");

const rendererSource = readFileSync("components/career-possibility/CareerMapNeuralGraph.tsx", "utf8");
const engineBoundarySource = readFileSync("components/career-possibility/CareerMapForceGraph.tsx", "utf8");
assert.doesNotMatch(rendererSource, /\.fitScore|\.fitLabel/);
assert.match(rendererSource, /dynamic\([\s\S]*CareerMapForceGraph[\s\S]*ssr: false/);
assert.match(engineBoundarySource, /import ForceGraph2D from "react-force-graph-2d"/);
assert.match(engineBoundarySource, /<ForceGraph2D/);
assert.doesNotMatch(engineBoundarySource, /career-map-graph-projection|localStorage|fitScore/);

console.log("Career graph visual adapter tests passed");
