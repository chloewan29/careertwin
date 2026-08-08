/**
 * Tests for career-map-graph-projection.ts
 *
 * Covers:
 *  A. Personal capability family grouping
 *  B. Evidence grounding
 *  C. No fabricated personal capability
 *  D. Role demonstrated requirement
 *  E. Transferable requirement
 *  F. Unsupported role requirement — unsupported-requirement invariant
 *  G. No provenance dependency
 *  H. Role is optional
 *
 * Uses only committed evidence fields: evidenceId, text, relationship,
 * sourceStart, sourceEnd. No employer / roleTitle referenced.
 *
 * Uses real canonicalCapabilityFamilyLibrary as the family authority.
 * Constructs PersonalCareerMapPresentation and PersonalTargetRoleComparison
 * directly as plain typed objects — no ingestion pipeline invoked.
 */

import assert from "node:assert/strict";
import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import {
  buildCareerMapGraphProjection,
  CAREER_MAP_GRAPH_PROJECTION_VERSION,
  groupPersonalCapabilitiesByFamily,
  type CapabilityFamilyGraphNode,
  type CapabilityGraphNode,
  type CareerMapGraphProjection,
  type EvidenceGraphNode,
  type RoleGraphNode,
  type RoleRequirementGraphNode,
} from "../../lib/career-possibility/career-map-graph-projection";
import type { PersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";
import { PERSONAL_TARGET_ROLE_COMPARISON_VERSION, type PersonalTargetRoleComparison } from "../../lib/career-possibility/personal-target-role-comparison";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Constructs a minimal committed-safe evidence item. No employer or roleTitle. */
function makeEvidence(
  id: string,
  evidenceId: string,
  text: string,
  relationship: "direct_evidence" | "transferable_signal",
  startOffset = 0,
): PersonalCareerMapPresentation["capabilities"][number]["evidence"][number] {
  return Object.freeze({
    id,
    evidenceId,
    text,
    relationship,
    sourceStart: startOffset,
    sourceEnd: startOffset + text.length,
    provisional: true as const,
  });
}

/** Constructs a minimal PersonalCareerMapPresentation from a capabilities array. */
function makePresentation(
  capabilities: PersonalCareerMapPresentation["capabilities"],
): PersonalCareerMapPresentation {
  const evidenceCount = capabilities.reduce((sum, c) => sum + c.evidence.length, 0);
  return Object.freeze({
    mode: "personal" as const,
    status: "provisional" as const,
    mapTrustStatus: "provisional" as const,
    unresolvedEvidenceCount: 0,
    reviewedEvidenceCount: 0,
    provisionalEvidenceCount: evidenceCount,
    capabilities: Object.freeze(capabilities),
    futurePaths: Object.freeze({ available: false as const, reason: "Career Map personal mode." }),
    roleLens: Object.freeze({ available: false as const, reason: "Career Map personal mode." }),
  });
}

/** Constructs a minimal PersonalTargetRoleComparison as a plain typed object. */
function makeComparison(
  roleId: string,
  roleTitle: string,
  requirements: PersonalTargetRoleComparison["requirements"],
): PersonalTargetRoleComparison {
  const count = (outcome: string) => requirements.filter((r) => r.outcome === outcome).length;
  return Object.freeze({
    version: PERSONAL_TARGET_ROLE_COMPARISON_VERSION,
    role: Object.freeze({ roleId, title: roleTitle, domain: "general" }),
    mapTrustStatus: "provisional" as const,
    missingMeaning: "Not evidenced in your current CV-derived map." as const,
    summary: Object.freeze({
      totalRequirements: requirements.length,
      directly_demonstrated: count("directly_demonstrated"),
      transferable_signal: count("transferable_signal"),
      evidence_not_yet_shown: count("evidence_not_yet_shown"),
      governance_deferred: count("governance_deferred"),
      governance_excluded: count("governance_excluded"),
      unknown: 0,
    }),
    requirements: Object.freeze(requirements),
  });
}

/** Returns all graph nodes of a given type. */
function nodesOfType<T extends CareerMapGraphProjection["nodes"][number]["type"]>(
  projection: CareerMapGraphProjection,
  type: T,
): readonly Extract<CareerMapGraphProjection["nodes"][number], { type: T }>[] {
  return projection.nodes.filter((n): n is Extract<CareerMapGraphProjection["nodes"][number], { type: T }> => n.type === type);
}

// ---------------------------------------------------------------------------
// Test A — Personal capability family grouping
// ---------------------------------------------------------------------------

async function testA_familyGrouping() {
  // Both capabilities are in "Analytics & Insight"
  const presentation = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [makeEvidence("mapping-1", "evidence-1", "Synthesized research findings.", "direct_evidence")],
    }),
    Object.freeze({
      id: "research-design",
      label: "Research Design",
      family: "Analytics & Insight",
      evidence: [makeEvidence("mapping-2", "evidence-2", "Designed a research methodology.", "direct_evidence")],
    }),
  ]);

  const groups = groupPersonalCapabilitiesByFamily(presentation, canonicalCapabilityFamilyLibrary);

  // Only one family group should be emitted (Analytics & Insight)
  assert.equal(groups.length, 1, "A: expected exactly 1 family group");
  assert.equal(groups[0].familyId, "analytics-insight", "A: family ID must be analytics-insight");
  assert.equal(groups[0].familyLabel, "Analytics & Insight", "A: family label must match");

  // Both capability IDs are preserved
  const capabilityIds = groups[0].capabilities.map((c) => c.id);
  assert.ok(capabilityIds.includes("insight-synthesis"), "A: insight-synthesis must be in group");
  assert.ok(capabilityIds.includes("research-design"), "A: research-design must be in group");
  assert.equal(capabilityIds.length, 2, "A: group must have exactly 2 capabilities");

  console.log("  A. Personal capability family grouping — PASSED");
}

// ---------------------------------------------------------------------------
// Test B — Evidence grounding
// ---------------------------------------------------------------------------

async function testB_evidenceGrounding() {
  // One capability with 2 distinct evidence items
  const presentation = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [
        makeEvidence("mapping-1", "evidence-alpha", "Synthesized findings into recommendations.", "direct_evidence"),
        makeEvidence("mapping-2", "evidence-beta", "Translated analysis into a business case.", "direct_evidence"),
      ],
    }),
  ]);

  const projection = buildCareerMapGraphProjection({ presentation, familyLibrary: canonicalCapabilityFamilyLibrary });

  // Capability node must reference both evidence IDs
  const capNodes = nodesOfType(projection, "capability") as readonly CapabilityGraphNode[];
  assert.equal(capNodes.length, 1, "B: expected 1 capability node");
  const capNode = capNodes[0];
  assert.ok(capNode.evidenceIds.includes("evidence-alpha"), "B: evidence-alpha must be in evidenceIds");
  assert.ok(capNode.evidenceIds.includes("evidence-beta"), "B: evidence-beta must be in evidenceIds");
  assert.equal(capNode.evidenceIds.length, 2, "B: exactly 2 evidence IDs on capability node");

  // Two evidence nodes must be emitted
  const evNodes = nodesOfType(projection, "evidence") as readonly EvidenceGraphNode[];
  assert.equal(evNodes.length, 2, "B: expected 2 evidence nodes");
  const evIds = evNodes.map((e) => e.id);
  assert.ok(evIds.includes("evidence-alpha"), "B: evidence-alpha node missing");
  assert.ok(evIds.includes("evidence-beta"), "B: evidence-beta node missing");

  // Test: one evidence supports two capabilities
  const presentation2 = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [makeEvidence("mapping-3", "evidence-shared", "Synthesized and delivered cross-team analysis.", "direct_evidence")],
    }),
    Object.freeze({
      id: "measurement-design",
      label: "Measurement Design",
      family: "Analytics & Insight",
      evidence: [makeEvidence("mapping-4", "evidence-shared", "Synthesized and delivered cross-team analysis.", "direct_evidence")],
    }),
  ]);

  const projection2 = buildCareerMapGraphProjection({ presentation: presentation2, familyLibrary: canonicalCapabilityFamilyLibrary });
  const sharedEvNode = (nodesOfType(projection2, "evidence") as readonly EvidenceGraphNode[]).find((e) => e.id === "evidence-shared");
  assert.ok(sharedEvNode, "B: shared evidence node must exist");
  assert.ok(sharedEvNode.capabilityIds.includes("insight-synthesis"), "B: shared evidence must reference insight-synthesis");
  assert.ok(sharedEvNode.capabilityIds.includes("measurement-design"), "B: shared evidence must reference measurement-design");

  console.log("  B. Evidence grounding — PASSED");
}

// ---------------------------------------------------------------------------
// Test C — No fabricated personal capability
// ---------------------------------------------------------------------------

async function testC_noFabricatedCapability() {
  // Only insight-synthesis is in the presentation
  const presentation = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [makeEvidence("mapping-1", "evidence-1", "Synthesized findings.", "direct_evidence")],
    }),
  ]);

  const projection = buildCareerMapGraphProjection({ presentation, familyLibrary: canonicalCapabilityFamilyLibrary });
  const capNodes = nodesOfType(projection, "capability") as readonly CapabilityGraphNode[];

  // Only insight-synthesis should appear
  assert.equal(capNodes.length, 1, "C: expected exactly 1 capability node");
  assert.equal(capNodes[0].id, "insight-synthesis", "C: capability node must be insight-synthesis");

  // research-design must NOT appear even though it is in the same family
  const researchNode = capNodes.find((n) => n.id === "research-design");
  assert.equal(researchNode, undefined, "C: research-design must NOT be fabricated into personal nodes");

  console.log("  C. No fabricated personal capability — PASSED");
}

// ---------------------------------------------------------------------------
// Test D — Role demonstrated requirement
// ---------------------------------------------------------------------------

async function testD_roleDirectlyDemonstrated() {
  const presentation = makePresentation([
    Object.freeze({
      id: "cross-functional-delivery",
      label: "Cross-functional Delivery",
      family: "Operations & Delivery",
      evidence: [makeEvidence("mapping-1", "evidence-1", "Led a cross-functional delivery program.", "direct_evidence")],
    }),
  ]);

  const comparison = makeComparison("operations-archetype", "Operations Manager", [
    Object.freeze({
      capabilityId: "cross-functional-delivery",
      roleLabel: "Cross-functional Delivery",
      canonicalLabel: "Cross-functional Delivery",
      importance: "must" as const,
      outcome: "directly_demonstrated" as const,
      evidence: Object.freeze([
        Object.freeze({ mappingId: "mapping-1", evidenceId: "evidence-1", text: "Led a cross-functional delivery program.", relationship: "direct_evidence" as const }),
      ]),
    }),
  ]);

  const projection = buildCareerMapGraphProjection({
    presentation,
    familyLibrary: canonicalCapabilityFamilyLibrary,
    role: { roleProfile: { roleFamilyId: "operations-archetype", canonicalTitle: "Operations Manager", domain: "operations" } as never, comparison },
  });

  // Role requirement node must have directly_demonstrated state
  const reqNodes = nodesOfType(projection, "role_requirement") as readonly RoleRequirementGraphNode[];
  assert.equal(reqNodes.length, 1, "D: expected 1 role requirement node");
  assert.equal(reqNodes[0].requirementState, "directly_demonstrated", "D: requirement state must be directly_demonstrated");
  assert.equal(reqNodes[0].capabilityId, "cross-functional-delivery", "D: requirement must reference cross-functional-delivery");

  // Personal capability node for cross-functional-delivery must still exist
  const capNodes = nodesOfType(projection, "capability") as readonly CapabilityGraphNode[];
  const personalNode = capNodes.find((n) => n.id === "cross-functional-delivery");
  assert.ok(personalNode, "D: personal capability node must still exist after role is added");

  console.log("  D. Role demonstrated requirement — PASSED");
}

// ---------------------------------------------------------------------------
// Test E — Transferable requirement
// ---------------------------------------------------------------------------

async function testE_transferableRequirement() {
  const presentation = makePresentation([
    Object.freeze({
      id: "process-improvement",
      label: "Process Improvement",
      family: "Operations & Delivery",
      evidence: [makeEvidence("mapping-1", "evidence-1", "Redesigned the operating process.", "transferable_signal")],
    }),
  ]);

  const comparison = makeComparison("ops-archetype-2", "Senior Operations Lead", [
    Object.freeze({
      capabilityId: "process-improvement",
      roleLabel: "Process Improvement",
      canonicalLabel: "Process Improvement",
      importance: "should" as const,
      outcome: "transferable_signal" as const,
      evidence: Object.freeze([
        Object.freeze({ mappingId: "mapping-1", evidenceId: "evidence-1", text: "Redesigned the operating process.", relationship: "transferable_signal" as const }),
      ]),
    }),
  ]);

  const projection = buildCareerMapGraphProjection({
    presentation,
    familyLibrary: canonicalCapabilityFamilyLibrary,
    role: { roleProfile: { roleFamilyId: "ops-archetype-2", canonicalTitle: "Senior Operations Lead", domain: "operations" } as never, comparison },
  });

  const reqNodes = nodesOfType(projection, "role_requirement") as readonly RoleRequirementGraphNode[];
  assert.equal(reqNodes.length, 1, "E: expected 1 role requirement node");
  assert.equal(reqNodes[0].requirementState, "transferable_signal", "E: requirement state must be transferable_signal");
  // The projection must not convert transferable_signal into direct_evidence
  assert.notEqual(reqNodes[0].requirementState, "directly_demonstrated", "E: transferable must not be promoted to directly_demonstrated");

  console.log("  E. Transferable requirement — PASSED");
}

// ---------------------------------------------------------------------------
// Test F — Unsupported role requirement (critical invariant)
// ---------------------------------------------------------------------------

async function testF_unsupportedRequirementInvariant() {
  // The user has insight-synthesis but NOT measurement-design
  const presentation = makePresentation([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: [makeEvidence("mapping-1", "evidence-1", "Synthesized research findings.", "direct_evidence")],
    }),
  ]);

  // Comparison says measurement-design is evidence_not_yet_shown
  const comparison = makeComparison("analytics-archetype", "Analytics Lead", [
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
    role: { roleProfile: { roleFamilyId: "analytics-archetype", canonicalTitle: "Analytics Lead", domain: "analytics" } as never, comparison },
  });

  // Role requirement node must exist with evidence_not_yet_shown
  const reqNodes = nodesOfType(projection, "role_requirement") as readonly RoleRequirementGraphNode[];
  assert.equal(reqNodes.length, 1, "F: expected 1 role requirement node");
  assert.equal(reqNodes[0].requirementState, "evidence_not_yet_shown", "F: requirement state must be evidence_not_yet_shown");
  assert.equal(reqNodes[0].capabilityId, "measurement-design", "F: requirement must reference measurement-design");

  // CRITICAL INVARIANT: measurement-design must NOT appear as a personal capability node
  const capNodes = nodesOfType(projection, "capability") as readonly CapabilityGraphNode[];
  const fabricatedNode = capNodes.find((n) => n.id === "measurement-design");
  assert.equal(fabricatedNode, undefined, "F: measurement-design must NOT be fabricated into personal capability nodes");

  // CRITICAL INVARIANT: no user_has_family or family_contains_capability edge must reference measurement-design
  const fabricatedEdge = projection.edges.find(
    (e) => (e.type === "user_has_family" || e.type === "family_contains_capability") && e.toId === "measurement-design",
  );
  assert.equal(fabricatedEdge, undefined, "F: no personal graph edge must fabricate measurement-design");

  // The personal graph must only contain insight-synthesis
  assert.equal(capNodes.length, 1, "F: only 1 personal capability node (insight-synthesis) must exist");
  assert.equal(capNodes[0].id, "insight-synthesis", "F: personal capability node must be insight-synthesis");

  console.log("  F. Unsupported role requirement invariant — PASSED");
}

// ---------------------------------------------------------------------------
// Test G — No provenance dependency
// ---------------------------------------------------------------------------

async function testG_noProvenanceDependency() {
  // Evidence items constructed from committed fields only — no employer, no roleTitle.
  const presentation = makePresentation([
    Object.freeze({
      id: "strategic-analysis",
      label: "Strategic Analysis",
      family: "Strategy & Transformation",
      evidence: [
        // Only committed fields: id, evidenceId, text, relationship, sourceStart, sourceEnd, provisional
        makeEvidence("mapping-provenance-test", "evidence-no-provenance", "Developed an analytical case for a strategic decision.", "direct_evidence", 42),
      ],
    }),
  ]);

  // Must not throw, must produce a valid projection without any provenance fields
  const projection = buildCareerMapGraphProjection({ presentation, familyLibrary: canonicalCapabilityFamilyLibrary });

  assert.equal(projection.version, CAREER_MAP_GRAPH_PROJECTION_VERSION, "G: projection version must match");

  const evNodes = nodesOfType(projection, "evidence") as readonly EvidenceGraphNode[];
  assert.equal(evNodes.length, 1, "G: 1 evidence node must be emitted");
  assert.equal(evNodes[0].id, "evidence-no-provenance", "G: evidence node ID must match");
  assert.equal(evNodes[0].text, "Developed an analytical case for a strategic decision.", "G: evidence text must come from committed field");

  // Confirm no employer / roleTitle properties on evidence node
  const evNode = evNodes[0] as Record<string, unknown>;
  assert.equal("employer" in evNode, false, "G: evidence node must not carry employer (HOLD-only field)");
  assert.equal("roleTitle" in evNode, false, "G: evidence node must not carry roleTitle (HOLD-only field)");

  console.log("  G. No provenance dependency — PASSED");
}

// ---------------------------------------------------------------------------
// Test H — Role is optional
// ---------------------------------------------------------------------------

async function testH_roleIsOptional() {
  const presentation = makePresentation([
    Object.freeze({
      id: "people-leadership",
      label: "People Leadership",
      family: "Leadership",
      evidence: [makeEvidence("mapping-1", "evidence-1", "Led and mentored analysts.", "direct_evidence")],
    }),
  ]);

  // No role input
  const projection = buildCareerMapGraphProjection({ presentation, familyLibrary: canonicalCapabilityFamilyLibrary });

  // No role nodes
  const roleNodes = nodesOfType(projection, "role") as readonly RoleGraphNode[];
  assert.equal(roleNodes.length, 0, "H: no role nodes when role is omitted");

  // No role_requirement nodes
  const reqNodes = nodesOfType(projection, "role_requirement") as readonly RoleRequirementGraphNode[];
  assert.equal(reqNodes.length, 0, "H: no role_requirement nodes when role is omitted");

  // Personal capability graph is intact
  const capNodes = nodesOfType(projection, "capability") as readonly CapabilityGraphNode[];
  assert.equal(capNodes.length, 1, "H: personal capability node must be present without role");
  assert.equal(capNodes[0].id, "people-leadership", "H: people-leadership must be the personal capability node");

  // Family node is present
  const familyNodes = nodesOfType(projection, "capability_family") as readonly CapabilityFamilyGraphNode[];
  assert.equal(familyNodes.length, 1, "H: 1 family node must be present");
  assert.equal(familyNodes[0].id, "leadership", "H: family node id must be leadership");

  console.log("  H. Role is optional — PASSED");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("career-map-graph-projection.test.ts");
  await testA_familyGrouping();
  await testB_evidenceGrounding();
  await testC_noFabricatedCapability();
  await testD_roleDirectlyDemonstrated();
  await testE_transferableRequirement();
  await testF_unsupportedRequirementInvariant();
  await testG_noProvenanceDependency();
  await testH_roleIsOptional();
  console.log("All career-map-graph-projection tests passed.");
}

main().catch((error) => { process.exitCode = 1; throw error; });
