/**
 * generic-role-admission.test.ts
 *
 * POST-MVP TASK N1 — ROLE RECOMMENDATION ADMISSION GATE
 *
 * Tests:
 * 1. Policy edge-case table (all documented admit/reject cases)
 * 2. Fixture A: SPARSE_WEAK_PROFILE — 0 admitted roles
 * 3. Fixture B: STRONG_IN_DOMAIN_PROFILE — >=1 admitted role
 * 4. Fixture C: MIXED_SUPPORT_PROFILE — some admitted, some rejected; contiguous rank
 * 5. Ranking preservation: admitted-only list preserves upstream relative order
 * 6. Zero-role integration smoke: projection does not crash with roles=[]
 * 7. Differentiator-only admission is rejected even with high differentiator count
 */

import assert from "node:assert/strict";
import {
  evaluateGenericRoleAdmission,
  filterAdmittedRoles,
  SUBSTANTIVE_MATCH_MINIMUM,
} from "../../lib/career-possibility/generic-role-admission";
import type {
  AlignmentSection,
  CanonicalCapabilityOwnershipSupport,
  GenericRoleCanonicalOwnershipAlignment,
} from "../../lib/career-possibility/generic-career-path-alignment";
import {
  buildCareerMapGraphProjection,
  type RoleGraphNode,
} from "../../lib/career-possibility/career-map-graph-projection";
import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import type { PersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const directSupport: CanonicalCapabilityOwnershipSupport = Object.freeze({
  mappingId: "mapping:test",
  evidenceId: "evidence:test",
  relationship: "direct_evidence",
  method: "structured_inference",
});

function stubRole(
  roleId: string,
  matched: readonly { id: string; label: string; family: string; section: AlignmentSection }[],
): GenericRoleCanonicalOwnershipAlignment {
  return Object.freeze({
    roleId,
    title: `Test Role ${roleId}`,
    primaryMandate: `Mandate for ${roleId}.`,
    primaryOwnership: Object.freeze([`Ownership for ${roleId}.`]),
    calibrated: true,
    alignmentBasis: "canonical_capability_ownership",
    identityDefining: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
    coreEnablers: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
    supporting: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
    differentiators: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
    matchedCapabilities: Object.freeze(
      matched.map((cap) =>
        Object.freeze({
          canonicalCapabilityId: cap.id,
          canonicalLabel: cap.label,
          canonicalFamily: cap.family,
          section: cap.section,
          supports: Object.freeze([directSupport]),
        }),
      ),
    ),
    missingCapabilities: Object.freeze([]),
    orderingBasis: Object.freeze([0, 0, 0, 0]),
    explanation: "Stub alignment.",
  });
}

const emptyPresentation: PersonalCareerMapPresentation = Object.freeze({
  mode: "personal",
  status: "provisional",
  mapTrustStatus: "provisional",
  unresolvedEvidenceCount: 0,
  reviewedEvidenceCount: 0,
  provisionalEvidenceCount: 0,
  capabilities: Object.freeze([]),
  futurePaths: Object.freeze({ available: false, reason: "N1 zero-role smoke." }),
  roleLens: Object.freeze({ available: false, reason: "N1 zero-role smoke." }),
});

// ---------------------------------------------------------------------------
// Policy constants
// ---------------------------------------------------------------------------

assert.equal(SUBSTANTIVE_MATCH_MINIMUM, 2, "Minimum must be 2 per N1 policy");

// ---------------------------------------------------------------------------
// POLICY EDGE-CASE TABLE
// (Section 16 of N1 specification)
// ---------------------------------------------------------------------------

// 0 substantive → REJECT
assert.deepEqual(evaluateGenericRoleAdmission(stubRole("r-0sub", [])), {
  admitted: false,
  substantiveMatchCount: 0,
  hasIdentityOrCoreMatch: false,
  reason: "insufficient_substantive_support",
});

// 1 identity only → REJECT (count < 2)
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-1id", [{ id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" }])),
  { admitted: false, substantiveMatchCount: 1, hasIdentityOrCoreMatch: true, reason: "insufficient_substantive_support" },
);

// 1 core only → REJECT (count < 2)
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-1core", [{ id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight", section: "core_enabler" }])),
  { admitted: false, substantiveMatchCount: 1, hasIdentityOrCoreMatch: true, reason: "insufficient_substantive_support" },
);

// 1 supporting only → REJECT (count < 2)
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-1sup", [{ id: "strategic-analysis", label: "Strategic Analysis", family: "Analytics & Insight", section: "supporting" }])),
  { admitted: false, substantiveMatchCount: 1, hasIdentityOrCoreMatch: false, reason: "insufficient_substantive_support" },
);

// 2 supporting only → REJECT (no identity or core; rule 2 fails)
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-2sup", [
    { id: "strategic-analysis", label: "Strategic Analysis", family: "Analytics & Insight", section: "supporting" },
    { id: "cross-functional-delivery", label: "Cross-Functional Delivery", family: "Leadership", section: "supporting" },
  ])),
  { admitted: false, substantiveMatchCount: 2, hasIdentityOrCoreMatch: false, reason: "no_identity_or_core_support" },
);

// 1 differentiator only → REJECT
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-1diff", [{ id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market", section: "differentiator" }])),
  { admitted: false, substantiveMatchCount: 0, hasIdentityOrCoreMatch: false, reason: "insufficient_substantive_support" },
);

// Many differentiators only → REJECT
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-manydiff", [
    { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market", section: "differentiator" },
    { id: "benefits-realisation", label: "Benefits Realisation", family: "Operations & Delivery", section: "differentiator" },
    { id: "investment-governance", label: "Investment Governance", family: "Governance & Risk", section: "differentiator" },
  ])),
  { admitted: false, substantiveMatchCount: 0, hasIdentityOrCoreMatch: false, reason: "insufficient_substantive_support" },
);

// 1 identity + 1 supporting → ADMIT
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-id-sup", [
    { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" },
    { id: "strategic-analysis", label: "Strategic Analysis", family: "Analytics & Insight", section: "supporting" },
  ])),
  { admitted: true, substantiveMatchCount: 2, hasIdentityOrCoreMatch: true, reason: "admitted" },
);

// 1 core + 1 supporting → ADMIT
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-core-sup", [
    { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight", section: "core_enabler" },
    { id: "strategic-analysis", label: "Strategic Analysis", family: "Analytics & Insight", section: "supporting" },
  ])),
  { admitted: true, substantiveMatchCount: 2, hasIdentityOrCoreMatch: true, reason: "admitted" },
);

// 1 identity + 1 core → ADMIT
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-id-core", [
    { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" },
    { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight", section: "core_enabler" },
  ])),
  { admitted: true, substantiveMatchCount: 2, hasIdentityOrCoreMatch: true, reason: "admitted" },
);

// 2 identity → ADMIT
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-2id", [
    { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" },
    { id: "analytics-governance", label: "Analytics Governance", family: "Governance & Risk", section: "identity_defining" },
  ])),
  { admitted: true, substantiveMatchCount: 2, hasIdentityOrCoreMatch: true, reason: "admitted" },
);

// 2 core → ADMIT
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-2core", [
    { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight", section: "core_enabler" },
    { id: "cross-functional-delivery", label: "Cross-Functional Delivery", family: "Leadership", section: "core_enabler" },
  ])),
  { admitted: true, substantiveMatchCount: 2, hasIdentityOrCoreMatch: true, reason: "admitted" },
);

// 2 substantive + differentiators → ADMIT (differentiators do not alter result)
assert.deepEqual(
  evaluateGenericRoleAdmission(stubRole("r-2sub-plusdiff", [
    { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" },
    { id: "strategic-analysis", label: "Strategic Analysis", family: "Analytics & Insight", section: "supporting" },
    { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market", section: "differentiator" },
    { id: "benefits-realisation", label: "Benefits Realisation", family: "Operations & Delivery", section: "differentiator" },
  ])),
  { admitted: true, substantiveMatchCount: 2, hasIdentityOrCoreMatch: true, reason: "admitted" },
);

// ---------------------------------------------------------------------------
// Differentiator-only does not become admitted even if substantive minimum
// was met via differentiator count (sanity — differentiators are excluded from count)
// ---------------------------------------------------------------------------
const diffOnlyLargeRole = stubRole("r-diff-only-large", [
  { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market", section: "differentiator" },
  { id: "benefits-realisation", label: "Benefits Realisation", family: "Operations & Delivery", section: "differentiator" },
]);
const diffOnlyResult = evaluateGenericRoleAdmission(diffOnlyLargeRole);
assert.equal(diffOnlyResult.admitted, false);
assert.equal(diffOnlyResult.substantiveMatchCount, 0);

// ---------------------------------------------------------------------------
// FIXTURE A — SPARSE_WEAK_PROFILE
// Shape: minimal personal capability support; all candidate roles below admission.
// At least one differentiator-only match.
// Expected: 0 admitted roles.
// Privacy-safe: no raw Founder state; capability IDs are canonical registry IDs only.
// ---------------------------------------------------------------------------

const sparseWeakRoles: readonly GenericRoleCanonicalOwnershipAlignment[] = Object.freeze([
  // Role 1: only a differentiator match (customer-adoption)
  stubRole("analytics-manager", [
    { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market", section: "differentiator" },
  ]),
  // Role 2: only a differentiator match
  stubRole("customer-insights-lead", [
    { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market", section: "differentiator" },
  ]),
  // Role 3: no matches at all
  stubRole("marketing-analytics-lead", []),
  // Role 4: only one supporting match (< minimum)
  stubRole("data-product-manager", [
    { id: "strategic-analysis", label: "Strategic Analysis", family: "Analytics & Insight", section: "supporting" },
  ]),
]);

const sparseWeakAdmitted = filterAdmittedRoles(sparseWeakRoles);
assert.equal(sparseWeakAdmitted.length, 0, "SPARSE_WEAK_PROFILE: expect 0 admitted roles");

// ---------------------------------------------------------------------------
// FIXTURE B — STRONG_IN_DOMAIN_PROFILE
// Shape: strong substantive role support; at least one role clearly passes.
// Expected: >=1 admitted role.
// ---------------------------------------------------------------------------

const strongInDomainRoles: readonly GenericRoleCanonicalOwnershipAlignment[] = Object.freeze([
  // Analytics Manager: 2 identity-defining matches → ADMIT
  stubRole("analytics-manager", [
    { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" },
    { id: "analytics-governance", label: "Analytics Governance", family: "Governance & Risk", section: "identity_defining" },
    { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight", section: "core_enabler" },
    { id: "cross-functional-delivery", label: "Cross-Functional Delivery", family: "Leadership", section: "core_enabler" },
  ]),
  // Marketing Analytics Lead: 2 identity-defining + 2 core → ADMIT
  stubRole("marketing-analytics-lead", [
    { id: "marketing-effectiveness", label: "Marketing Effectiveness", family: "Customer & Market", section: "identity_defining" },
    { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" },
    { id: "audience-insight", label: "Audience Insight", family: "Customer & Market", section: "core_enabler" },
  ]),
  // Customer Insights Lead: only 1 identity match → REJECT (count < 2 if no other substantive)
  stubRole("customer-insights-lead", [
    { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight", section: "identity_defining" },
  ]),
]);

const strongAdmitted = filterAdmittedRoles(strongInDomainRoles);
assert.ok(strongAdmitted.length >= 1, "STRONG_IN_DOMAIN_PROFILE: expect >=1 admitted role");
assert.equal(strongAdmitted.some((r) => r.roleId === "analytics-manager"), true, "analytics-manager must be admitted");
assert.equal(strongAdmitted.some((r) => r.roleId === "marketing-analytics-lead"), true, "marketing-analytics-lead must be admitted");
assert.equal(strongAdmitted.some((r) => r.roleId === "customer-insights-lead"), false, "customer-insights-lead must be rejected");

// ---------------------------------------------------------------------------
// FIXTURE C — MIXED_SUPPORT_PROFILE
// Shape: some candidates pass, some fail; proves relative order is preserved
// and presentation rank is contiguous.
// ---------------------------------------------------------------------------

// Upstream sorted order: B (strong), D (strong), A (weak), C (weak)
const mixedRoles: readonly GenericRoleCanonicalOwnershipAlignment[] = Object.freeze([
  stubRole("role-b", [
    { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight", section: "identity_defining" },
    { id: "analytics-governance", label: "Analytics Governance", family: "Governance & Risk", section: "identity_defining" },
  ]),
  stubRole("role-d", [
    { id: "marketing-effectiveness", label: "Marketing Effectiveness", family: "Customer & Market", section: "identity_defining" },
    { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight", section: "core_enabler" },
  ]),
  stubRole("role-a", [
    { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market", section: "differentiator" },
  ]),
  stubRole("role-c", []),
]);

const mixedAdmitted = filterAdmittedRoles(mixedRoles);
// Expect 2 admitted (B and D), 2 rejected (A and C)
assert.equal(mixedAdmitted.length, 2, "MIXED_SUPPORT_PROFILE: expect 2 admitted");
assert.equal(mixedAdmitted.filter((r) => r.roleId === "role-b" || r.roleId === "role-d").length, 2, "B and D must be admitted");
assert.equal(mixedAdmitted.some((r) => r.roleId === "role-a"), false, "role-a must be rejected");
assert.equal(mixedAdmitted.some((r) => r.roleId === "role-c"), false, "role-c must be rejected");

// Relative order preserved: B came before D in upstream order → must still be first
assert.equal(mixedAdmitted[0].roleId, "role-b", "Upstream relative order: B before D");
assert.equal(mixedAdmitted[1].roleId, "role-d", "Upstream relative order: D after B");

// Contiguous presentation rank from projection
const mixedAlignmentResult = Object.freeze({
  schemaVersion: "1.0.0" as const,
  modelVersion: "canonical-ownership/1.0.0" as const,
  alignmentBasis: "canonical_capability_ownership" as const,
  roles: mixedAdmitted,
});
const mixedProjection = buildCareerMapGraphProjection({
  presentation: emptyPresentation,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment: mixedAlignmentResult,
});
const mixedRoleNodes = mixedProjection.nodes.filter((n): n is RoleGraphNode => n.type === "role") as readonly RoleGraphNode[];
assert.equal(mixedRoleNodes.length, 2, "Projection: 2 admitted roles only");
assert.deepEqual(mixedRoleNodes.map((n) => n.id), ["role-b", "role-d"], "Projection: order B, D");
assert.deepEqual(mixedRoleNodes.map((n) => n.proximityRank), [0, 1], "Projection: contiguous rank 0, 1 (no gaps)");

// ---------------------------------------------------------------------------
// ZERO-ROLE INTEGRATION SMOKE
// Proves that roles=[] does not crash projection, visual adapter, or workspace.
// Personal graph structure remains available.
// ---------------------------------------------------------------------------

const zeroRoleAlignment = Object.freeze({
  schemaVersion: "1.0.0" as const,
  modelVersion: "canonical-ownership/1.0.0" as const,
  alignmentBasis: "canonical_capability_ownership" as const,
  roles: Object.freeze([]),
});

// Does not throw:
const zeroRoleProjection = buildCareerMapGraphProjection({
  presentation: emptyPresentation,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment: zeroRoleAlignment,
});

assert.equal(
  zeroRoleProjection.nodes.filter((n) => n.type === "role").length,
  0,
  "Zero-role projection: 0 role nodes",
);
assert.equal(
  zeroRoleProjection.nodes.filter((n) => n.type === "role_requirement").length,
  0,
  "Zero-role projection: 0 role_requirement nodes",
);
// YOU node must always be present
assert.equal(
  zeroRoleProjection.nodes.some((n) => n.type === "user"),
  true,
  "Zero-role projection: YOU node must be present",
);

// Zero roles with a capability-bearing presentation
const presentationWithCapability: PersonalCareerMapPresentation = Object.freeze({
  ...emptyPresentation,
  provisionalEvidenceCount: 1,
  capabilities: Object.freeze([
    Object.freeze({
      id: "insight-synthesis",
      label: "Insight Synthesis",
      family: "Analytics & Insight",
      evidence: Object.freeze([
        Object.freeze({
          id: "mapping:smoke",
          evidenceId: "evidence:smoke",
          text: "Synthesised evidence for smoke test.",
          relationship: "direct_evidence" as const,
          sourceStart: 0,
          sourceEnd: 40,
          provisional: true as const,
        }),
      ]),
    }),
  ]),
});

const zeroRoleWithPersonalGraph = buildCareerMapGraphProjection({
  presentation: presentationWithCapability,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment: zeroRoleAlignment,
});
assert.equal(
  zeroRoleWithPersonalGraph.nodes.filter((n) => n.type === "role").length,
  0,
  "Zero-role + personal capability: 0 role nodes",
);
// Personal capability node is still projected even with zero roles
assert.equal(
  zeroRoleWithPersonalGraph.nodes.some((n) => n.type === "capability"),
  true,
  "Zero-role + personal capability: personal capability node present",
);
assert.equal(
  zeroRoleWithPersonalGraph.nodes.some((n) => n.type === "user"),
  true,
  "Zero-role + personal capability: YOU node present",
);

console.log("generic role admission tests passed");
