/**
 * Focused renderer invariant tests for CareerMapNeuralGraph.
 *
 * Uses only the existing Node test stack (node:assert).
 * No React Testing Library, no jsdom, no new packages.
 *
 * Because the renderer is a React component, click-interaction tests
 * are NOT supported by the current tooling. This limitation is noted
 * explicitly in the test output.
 *
 * These tests instead verify the PROJECTION CONTRACT properties
 * that the renderer depends on — ensuring the renderer's assumptions
 * about the graph data it receives are always true.
 *
 * Test coverage:
 *   A. Default graph includes user + evidenced family nodes + role node
 *   B. Unsupported role requirement is never a personal capability node
 *   C. Node IDs are unique across the full projection
 *   D. No employer / roleTitle required on evidence nodes
 *   E. CareerMapNeuralGraph module imports no localStorage/storage owner
 *   F. CareerMapNeuralGraph module imports no Job Copilot / fitScore owner
 *   G. The selected force graph owns responsive geometry and interaction
 *   H. The adapter supplies the complete default graph field
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import {
  buildCareerMapGraphProjection,
  type CareerMapGraphProjection,
} from "../../lib/career-possibility/career-map-graph-projection";
import type { PersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";
import { PERSONAL_TARGET_ROLE_COMPARISON_VERSION, type PersonalTargetRoleComparison } from "../../lib/career-possibility/personal-target-role-comparison";

// ---------------------------------------------------------------------------
// Fixtures — shared across tests
// ---------------------------------------------------------------------------

function makeEvidence(
  id: string,
  evidenceId: string,
  text: string,
  relationship: "direct_evidence" | "transferable_signal",
): PersonalCareerMapPresentation["capabilities"][number]["evidence"][number] {
  return Object.freeze({
    id,
    evidenceId,
    text,
    relationship,
    sourceStart: 0,
    sourceEnd: text.length,
    provisional: true as const,
  });
}

function makePresentation(
  capabilities: PersonalCareerMapPresentation["capabilities"],
): PersonalCareerMapPresentation {
  return Object.freeze({
    mode: "personal" as const,
    status: "provisional" as const,
    mapTrustStatus: "provisional" as const,
    unresolvedEvidenceCount: 0,
    reviewedEvidenceCount: 0,
    provisionalEvidenceCount: capabilities.reduce((sum, c) => sum + c.evidence.length, 0),
    capabilities: Object.freeze(capabilities),
    futurePaths: Object.freeze({ available: false as const, reason: "neural-graph-test" }),
    roleLens: Object.freeze({ available: false as const, reason: "neural-graph-test" }),
  });
}

function makeComparison(
  roleId: string,
  roleTitle: string,
  requirements: PersonalTargetRoleComparison["requirements"],
): PersonalTargetRoleComparison {
  const count = (outcome: string) => requirements.filter((r) => r.outcome === outcome).length;
  return Object.freeze({
    version: PERSONAL_TARGET_ROLE_COMPARISON_VERSION,
    role: Object.freeze({ roleId, title: roleTitle, domain: "test" }),
    mapTrustStatus: "provisional" as const,
    missingMeaning: "Not evidenced in your current CV-derived map." as const,
    summary: Object.freeze({
      totalRequirements: requirements.length,
      directly_demonstrated: count("directly_demonstrated"),
      transferable_signal: count("transferable_signal"),
      evidence_not_yet_shown: count("evidence_not_yet_shown"),
      governance_deferred: 0,
      governance_excluded: 0,
      unknown: 0,
    }),
    requirements: Object.freeze(requirements),
  });
}

function nodesByType<T extends CareerMapGraphProjection["nodes"][number]["type"]>(
  projection: CareerMapGraphProjection,
  type: T,
): Extract<CareerMapGraphProjection["nodes"][number], { type: T }>[] {
  return projection.nodes.filter(
    (n): n is Extract<CareerMapGraphProjection["nodes"][number], { type: T }> => n.type === type,
  );
}

const RENDERER_SOURCE_PATH = "components/career-possibility/CareerMapNeuralGraph.tsx";

// ---------------------------------------------------------------------------
// Test A — Default graph includes user + family nodes + role node (if role provided)
// ---------------------------------------------------------------------------

async function testA_defaultGraphIncludes() {
  const presentation = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [makeEvidence("m1", "ev1", "Synthesized findings into recommendations.", "direct_evidence")],
    }),
    Object.freeze({
      id: "people-leadership",
      label: "People Leadership",
      family: "Leadership",
      evidence: [makeEvidence("m2", "ev2", "Led a team of six analysts.", "direct_evidence")],
    }),
  ]);

  const comparison = makeComparison("analytics-manager", "Analytics Manager", [
    Object.freeze({
      capabilityId: "measurement-design",
      roleLabel: "Measurement Design",
      canonicalLabel: "Measurement Design",
      importance: "must" as const,
      outcome: "evidence_not_yet_shown" as const,
      evidence: Object.freeze([]),
    }),
  ]);

  const projection = buildCareerMapGraphProjection({
    presentation,
    familyLibrary: canonicalCapabilityFamilyLibrary,
    role: { roleProfile: { roleFamilyId: "analytics-manager", canonicalTitle: "Analytics Manager", domain: "analytics" } as never, comparison },
  });

  // User node must be present
  const userNodes = nodesByType(projection, "user");
  assert.equal(userNodes.length, 1, "A: exactly one user node");
  assert.equal(userNodes[0].id, "user", "A: user node id must be 'user'");

  // Family nodes must be present (2 families from presentation)
  const familyNodes = nodesByType(projection, "capability_family");
  assert.ok(familyNodes.length >= 1, "A: at least one family node");

  // Role node must be present
  const roleNodes = nodesByType(projection, "role");
  assert.equal(roleNodes.length, 1, "A: one role node when role context provided");
  assert.equal(roleNodes[0].id, "analytics-manager", "A: role node id matches roleFamilyId");

  console.log("  A. Default graph includes user + family nodes + role node — PASSED");
}

// ---------------------------------------------------------------------------
// Test B — Unsupported role requirement: role_requirement node exists,
//           personal capability node does NOT exist for that capabilityId
// ---------------------------------------------------------------------------

async function testB_unsupportedRequirementIsNotPersonalCapability() {
  // User has insight-synthesis only
  const presentation = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [makeEvidence("m1", "ev1", "Synthesized research findings.", "direct_evidence")],
    }),
  ]);

  // measurement-design is required by the role but NOT in user's personal set
  const comparison = makeComparison("test-role", "Test Role", [
    Object.freeze({
      capabilityId: "measurement-design",
      roleLabel: "Measurement Design",
      canonicalLabel: "Measurement Design",
      importance: "must" as const,
      outcome: "evidence_not_yet_shown" as const,
      evidence: Object.freeze([]),
    }),
  ]);

  const projection = buildCareerMapGraphProjection({
    presentation,
    familyLibrary: canonicalCapabilityFamilyLibrary,
    role: { roleProfile: { roleFamilyId: "test-role", canonicalTitle: "Test Role", domain: "test" } as never, comparison },
  });

  // role_requirement node must exist for measurement-design
  const reqNodes = nodesByType(projection, "role_requirement");
  const unsupportedReq = reqNodes.find((r) => r.capabilityId === "measurement-design");
  assert.ok(unsupportedReq, "B: role_requirement node must exist for unsupported requirement");
  assert.equal(unsupportedReq.requirementState, "evidence_not_yet_shown", "B: requirementState must be evidence_not_yet_shown");

  // CRITICAL: measurement-design must NOT appear as a personal capability node
  const capNodes = nodesByType(projection, "capability");
  const fabricated = capNodes.find((c) => c.id === "measurement-design");
  assert.equal(fabricated, undefined, "B: measurement-design must NOT be a personal capability node");

  // CRITICAL: user_has_family and family_contains_capability edges must not reference measurement-design
  const badEdge = projection.edges.find(
    (e) => (e.type === "user_has_family" || e.type === "family_contains_capability") && e.toId === "measurement-design",
  );
  assert.equal(badEdge, undefined, "B: no personal graph edge must fabricate measurement-design");

  // Personal capability graph must only contain insight-synthesis
  assert.equal(capNodes.length, 1, "B: only 1 personal capability node");
  assert.equal(capNodes[0].id, "insight-synthesis", "B: only insight-synthesis is personal");

  console.log("  B. Unsupported requirement is not a personal capability — PASSED");
}

// ---------------------------------------------------------------------------
// Test C — Node IDs are unique across the full projection
// ---------------------------------------------------------------------------

async function testC_nodeIdsAreUnique() {
  const presentation = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [
        makeEvidence("m1", "ev1", "Synthesized findings.", "direct_evidence"),
        makeEvidence("m2", "ev2", "Translated analysis.", "transferable_signal"),
      ],
    }),
    Object.freeze({
      id: "strategic-analysis",
      label: "Strategic Analysis",
      family: "Strategy & Transformation",
      evidence: [makeEvidence("m3", "ev3", "Developed strategic analysis.", "direct_evidence")],
    }),
  ]);

  const comparison = makeComparison("analytics-manager", "Analytics Manager", [
    Object.freeze({
      capabilityId: "insight-synthesis",
      roleLabel: "Insight Synthesis",
      canonicalLabel: "Insight Synthesis",
      importance: "must" as const,
      outcome: "directly_demonstrated" as const,
      evidence: Object.freeze([
        Object.freeze({ mappingId: "m1", evidenceId: "ev1", text: "Synthesized findings.", relationship: "direct_evidence" as const }),
      ]),
    }),
    Object.freeze({
      capabilityId: "measurement-design",
      roleLabel: "Measurement Design",
      canonicalLabel: "Measurement Design",
      importance: "must" as const,
      outcome: "evidence_not_yet_shown" as const,
      evidence: Object.freeze([]),
    }),
  ]);

  const projection = buildCareerMapGraphProjection({
    presentation,
    familyLibrary: canonicalCapabilityFamilyLibrary,
    role: { roleProfile: { roleFamilyId: "analytics-manager", canonicalTitle: "Analytics Manager", domain: "analytics" } as never, comparison },
  });

  const ids = projection.nodes.map((n) => n.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, `C: node IDs must be unique — found ${ids.length - uniqueIds.size} duplicate(s)`);

  console.log("  C. Node IDs are unique across projection — PASSED");
}

// ---------------------------------------------------------------------------
// Test D — No employer / roleTitle required on evidence nodes
// ---------------------------------------------------------------------------

async function testD_noProvenanceRequired() {
  // Evidence constructed with committed fields only — no employer, no roleTitle
  const presentation = makePresentation([
    Object.freeze({
      id: "strategic-analysis",
      label: "Strategic Analysis",
      family: "Strategy & Transformation",
      evidence: [makeEvidence("m1", "ev-no-prov", "Developed an evidence-based strategy document.", "direct_evidence")],
    }),
  ]);

  const projection = buildCareerMapGraphProjection({ presentation, familyLibrary: canonicalCapabilityFamilyLibrary });

  const evNodes = nodesByType(projection, "evidence");
  assert.equal(evNodes.length, 1, "D: one evidence node");

  const evNode = evNodes[0] as Record<string, unknown>;
  assert.equal("employer" in evNode, false, "D: evidence node must not carry employer");
  assert.equal("roleTitle" in evNode, false, "D: evidence node must not carry roleTitle");
  assert.ok(evNode["text"], "D: evidence node must carry text");
  assert.ok(evNode["relationship"], "D: evidence node must carry relationship");

  console.log("  D. No employer / roleTitle required on evidence nodes — PASSED");
}

// ---------------------------------------------------------------------------
// Test E — Renderer source imports no localStorage/storage owner
// ---------------------------------------------------------------------------

async function testE_noStorageImport() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  // Check import statements — comments are allowed to mention these terms
  assert.doesNotMatch(source, /from ['"].*local-career-map-storage/, "E: renderer must not import local-career-map-storage");
  assert.doesNotMatch(source, /from ['"].*local-career-map-state['"]/, "E: renderer must not import local-career-map-state");
  // Check direct API calls (not merely documentary comments)
  assert.doesNotMatch(source, /readLocalCareerMapState\s*\(/, "E: renderer must not call readLocalCareerMapState");
  assert.doesNotMatch(source, /writeLocalCareerMapState\s*\(/, "E: renderer must not call writeLocalCareerMapState");
  assert.doesNotMatch(source, /window\.localStorage/, "E: renderer must not access window.localStorage");

  console.log("  E. Renderer imports no localStorage/storage owner — PASSED");
}

// ---------------------------------------------------------------------------
// Test F — Renderer source imports no Job Copilot / fitScore owner
// ---------------------------------------------------------------------------

async function testF_noJobCopilotImport() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  // Check import statements — comments allowed
  assert.doesNotMatch(source, /from ['"].*job-copilot/, "F: renderer must not import job-copilot");
  assert.doesNotMatch(source, /from ['"].*career-map-explorer-view-model/, "F: renderer must not import career-map-explorer-view-model");
  // Check forbidden property/variable references (not in comments)
  assert.doesNotMatch(source, /\.fitScore/, "F: renderer must not reference .fitScore");
  assert.doesNotMatch(source, /\.fitLabel/, "F: renderer must not reference .fitLabel");
  // CapabilityExplorer import check
  assert.doesNotMatch(source, /from ['"].*CapabilityExplorer/, "F: renderer must not import CapabilityExplorer");

  console.log("  F. Renderer imports no Job Copilot / fitScore owner — PASSED");
}

// ---------------------------------------------------------------------------
// Tests G/H — Presentation geometry and initial two-layer visibility
// ---------------------------------------------------------------------------

async function testG_coherentResponsiveCoordinates() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  assert.match(source, /from "react-force-graph-2d"/, "G: selected engine must own graph rendering");
  assert.match(source, /enablePanInteraction/, "G: engine pan interaction must be enabled");
  assert.match(source, /enableZoomInteraction/, "G: engine zoom interaction must be enabled");
  assert.match(source, /enableNodeDrag/, "G: engine drag interaction must be enabled");
  assert.match(source, /ResizeObserver/, "G: graph viewport must respond to container size");
  assert.match(source, /engineReady/, "G: presentation forces must configure after the client engine mounts");
  assert.match(source, /buildCareerGraphTopologySeeds/, "G: role geometry must consume topology-derived presentation seeds");
  assert.doesNotMatch(source, /familyPosition|rolePosition|ROLE_ANGLES|FAMILY_RING_R/, "G: retired radial geometry must not remain active");

  console.log("  G. Force graph owns responsive geometry and interaction — PASSED");
}

async function testH_initialCapabilitiesRemainVisible() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  assert.match(source, /buildCareerGraphVisualModel\(projection\)/, "H: renderer must consume the full visual adapter output");
  assert.match(source, /graphData=\{graphData\}/, "H: the complete graph data must enter the engine");
  assert.match(source, /buildCareerGraphFocusSet/, "H: selection changes emphasis rather than membership");
  assert.match(source, /buildCareerGraphRoleFocusState/, "H: one role click must derive the complete owned/gap focus state");
  assert.match(source, /gap-required-not-owned/, "H: accessible role-gap state must be explicit");
  assert.doesNotMatch(source, /visibleCapabilityIds|visibleEvidenceIds/, "H: selection must not gate node membership");

  console.log("  H. Adapter supplies the complete default graph field — PASSED");
}

// ---------------------------------------------------------------------------
// Test I — Capability-first hierarchy preserves role interaction escalation
// ---------------------------------------------------------------------------

async function testI_capabilityFirstVisualHierarchy() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  assert.match(source, /CAPABILITY: 8\.2,[\s\S]*ROLE: 7\.4,/, "I: personal capabilities must be larger than default future roles");
  assert.match(source, /defaultOwnedLinkAlpha: 0\.2,[\s\S]*selectedOwnedLinkAlpha: 0\.78,/, "I: role links must escalate from quiet default to selected focus");
  assert.match(source, /defaultLinkWidth: 0\.58,[\s\S]*selectedOwnedLinkWidth: 2\.25,[\s\S]*selectedGapLinkWidth: 1\.85,/, "I: Task D selected-role edge strength must remain explicit");
  assert.match(source, /userFamilyLinkWidth: 1\.45,[\s\S]*familyCapabilityLinkWidth: 1\.08,/, "I: the personal capability network must lead default edge hierarchy");
  assert.match(source, /selectedRole[\s\S]*hoveredRole[\s\S]*rolePresentation\.selectedRadiusBoost[\s\S]*rolePresentation\.hoverRadiusBoost/, "I: future roles must have distinct default, hover, and selected presentation states");
  assert.match(source, /node\.nodeType === "CAPABILITY" && !roleOwned[\s\S]*rgba\(148,231,183,0\.42\)/, "I: personal capabilities need a non-colour structural emphasis");
  assert.match(source, /desktopCapabilityLabelZoom: 0\.72,[\s\S]*compactCapabilityLabelZoom: 2\.15,/, "I: compact layouts must retain the collision-safe capability-label threshold");

  console.log("  I. Capability-first hierarchy and role interaction escalation — PASSED");
}

// ---------------------------------------------------------------------------
// Test J — Default Role-Gap Progressive Disclosure
// ---------------------------------------------------------------------------

async function testJ_roleGapProgressiveDisclosure() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  assert.match(source, /if \(!focusSet \|\| \(!focusSet\.has\(id\) && id !== hoveredId\)\) \{\s*return;\s*\}/, "J: gap nodes must abort drawing when unselected");
  assert.match(source, /if \(!focusSet \|\| \(!focusSet\.has\(source\) && !focusSet\.has\(target\)\)\) \{\s*return "rgba\(0,0,0,0\)";\s*\}/, "J: gap links must return transparent color when unselected");
  assert.match(source, /if \(!focusSet \|\| \(!focusSet\.has\(source\) && !focusSet\.has\(target\)\)\) return 0;/, "J: gap links must return 0 width when unselected");

  console.log("  J. Default role-gap progressive disclosure — PASSED");
}

// ---------------------------------------------------------------------------
// Test K — MVP Step 2K Layout Restrictions (Radial Topology & Detail Panel)
// ---------------------------------------------------------------------------

async function testK_step2K_layoutTopologies() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  
  // Semantic depth bands ordered responsively
  assert.match(source, /ownedRadius < evidenceRadius|ownedRadius \+ shortSide/i, "K: evidence nodes placed in a discrete band outside capabilities");
  assert.match(source, /gapRadius = roleRadius \+/i, "K: role gaps placed on the outermost band relative to roles");
  assert.match(source, /Math\.min\(dimensions\.width, dimensions\.height\)/, "K: layout relies on shortSide for responsiveness");
  assert.match(source, /Math\.max\(.*Math\.min\(/, "K: responsive bands are clamped safely");
  
  // Radial force explicitly uses the responsive bands
  assert.match(source, /node\.nodeType === "ROLE"\) \{ targetRadius = roleRadius;/, "K: future roles placed explicitly by semantic depth target");
  assert.match(source, /node\.nodeType === "CAPABILITY"\) \{ targetRadius = ownedRadius;/, "K: owned capabilities placed explicitly by semantic depth target");

  // Capability evidence disclosure (EVIDENCE nodes in focusSet show labels)
  assert.match(source, /node\.nodeType === "EVIDENCE" && !!focusSet && focusSet\.has\(id\)/, "K: focused evidence nodes explicitly render their text labels");

  // Selected-role detail layout not obscuring the graph (moved to side panel)
  assert.doesNotMatch(source, /absolute bottom-4 left-4[\s\S]*?SelectedNodeDetail/, "K: SelectedNodeDetail must not occupy the bottom center to avoid obscuring focused nodes");
  assert.match(source, /absolute right-4 top-16[\s\S]*?SelectedNodeDetail/, "K: SelectedNodeDetail must be placed on the side to provide a graph-safe viewport");

  console.log("  K. Radial depth topology and side-panel presentation — PASSED");
}

// ---------------------------------------------------------------------------
// Test L — MVP Step 2L Polar Topology
// ---------------------------------------------------------------------------

async function testL_step2L_polarTopology() {
  const source = readFileSync(RENDERER_SOURCE_PATH, "utf8");
  assert.match(source, /Math\.atan2\(node\.seedY, node\.seedX\)/, "L: layout uses true polar angular targets seeded by adapter");
  assert.match(source, /const targetX = targetRadius \* Math\.cos\(targetAngle\);/, "L: target X resolves from radius and angle");
  assert.match(source, /const targetY = targetRadius \* Math\.sin\(targetAngle\);/, "L: target Y resolves from radius and angle");
  assert.match(source, /node\.vx \+= dx \* strength \* alpha;/, "L: spring physics pulls nodes organically toward true polar targets");
  assert.doesNotMatch(source, /const parentActive = !!node\.parentIds/, "L: evidence nodes render visibly by default rather than hiding completely");
  console.log("  L. True polar topology and first-class evidence nodes — PASSED");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("career-map-neural-graph.test.ts");
  console.log("  NOTE: click-interaction tests are NOT supported by the current tooling (no jsdom/RTL).");
  console.log("        Testing projection contract invariants and static source constraints instead.");
  await testA_defaultGraphIncludes();
  await testB_unsupportedRequirementIsNotPersonalCapability();
  await testC_nodeIdsAreUnique();
  await testD_noProvenanceRequired();
  await testE_noStorageImport();
  await testF_noJobCopilotImport();
  await testG_coherentResponsiveCoordinates();
  await testH_initialCapabilitiesRemainVisible();
  await testI_capabilityFirstVisualHierarchy();
  await testJ_roleGapProgressiveDisclosure();
  await testK_step2K_layoutTopologies();
  await testL_step2L_polarTopology();
  console.log("All career-map-neural-graph renderer contract tests passed.");
}

main().catch((error) => { process.exitCode = 1; throw error; });
