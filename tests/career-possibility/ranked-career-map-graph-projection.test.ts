import assert from "node:assert/strict";
import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import {
  buildCareerMapGraphProjection,
  type CareerMapGraphProjection,
  type RoleGraphNode,
  type RoleRequirementGraphNode,
} from "../../lib/career-possibility/career-map-graph-projection";
import type {
  AlignmentSection,
  CanonicalCapabilityOwnershipSupport,
  GenericCareerPathOwnershipAlignmentResult,
  GenericRoleCanonicalOwnershipAlignment,
} from "../../lib/career-possibility/generic-career-path-alignment";
import type { PersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";

const directSupport: CanonicalCapabilityOwnershipSupport = Object.freeze({
  mappingId: "mapping:insight",
  evidenceId: "evidence:insight",
  relationship: "direct_evidence",
  method: "structured_inference",
});

const sectionSummary = Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 });

function role(input: {
  readonly roleId: string;
  readonly title: string;
  readonly orderingBasis: readonly number[];
  readonly matched?: readonly {
    readonly id: string;
    readonly label: string;
    readonly family: string;
    readonly section: AlignmentSection;
  }[];
  readonly missing?: readonly {
    readonly id: string;
    readonly label: string;
    readonly section: AlignmentSection;
  }[];
}): GenericRoleCanonicalOwnershipAlignment {
  return Object.freeze({
    roleId: input.roleId,
    title: input.title,
    primaryMandate: `Mandate for ${input.title}.`,
    primaryOwnership: Object.freeze([`Ownership for ${input.title}.`]),
    calibrated: true,
    alignmentBasis: "canonical_capability_ownership",
    identityDefining: sectionSummary,
    coreEnablers: sectionSummary,
    supporting: sectionSummary,
    differentiators: sectionSummary,
    matchedCapabilities: Object.freeze(
      (input.matched ?? []).map((capability) =>
        Object.freeze({
          canonicalCapabilityId: capability.id,
          canonicalLabel: capability.label,
          canonicalFamily: capability.family,
          section: capability.section,
          supports: Object.freeze([directSupport]),
        }),
      ),
    ),
    missingCapabilities: Object.freeze(
      (input.missing ?? []).map((capability) =>
        Object.freeze({
          canonicalCapabilityId: capability.id,
          canonicalLabel: capability.label,
          section: capability.section,
          wording: "Canonical capability not owned in the current personal Career Map state" as const,
        }),
      ),
    ),
    orderingBasis: Object.freeze([...input.orderingBasis]),
    explanation: `Alignment for ${input.title}.`,
  });
}

const insight = Object.freeze({
  id: "insight-synthesis",
  label: "Insight Synthesis",
  family: "Analytics & Insight",
  section: "identity_defining" as const,
});
const missingResearch = Object.freeze({
  id: "research-design",
  label: "Research Design",
  section: "identity_defining" as const,
});

const rankedRoleAlignment: GenericCareerPathOwnershipAlignmentResult = Object.freeze({
  schemaVersion: "1.0.0",
  modelVersion: "canonical-ownership/1.0.0",
  alignmentBasis: "canonical_capability_ownership",
  // Deliberately contradictory orderingBasis values prove projection order is inherited,
  // not recomputed from counts or scores.
  roles: Object.freeze([
    role({ roleId: "role-a", title: "Role A", orderingBasis: [0, 0, 0, 0], matched: [insight], missing: [missingResearch] }),
    role({ roleId: "role-b", title: "Role B", orderingBasis: [9, 9, 9, 9], matched: [insight], missing: [missingResearch] }),
    role({ roleId: "role-c", title: "Role C", orderingBasis: [5, 5, 5, 5], matched: [insight] }),
    role({ roleId: "role-d", title: "Role D", orderingBasis: [1, 1, 1, 1] }),
  ]),
});

const presentation: PersonalCareerMapPresentation = Object.freeze({
  mode: "personal",
  status: "provisional",
  mapTrustStatus: "provisional",
  unresolvedEvidenceCount: 0,
  reviewedEvidenceCount: 0,
  provisionalEvidenceCount: 1,
  capabilities: Object.freeze([
    Object.freeze({
      id: insight.id,
      label: insight.label,
      family: insight.family,
      evidence: Object.freeze([
        Object.freeze({
          id: directSupport.mappingId,
          evidenceId: directSupport.evidenceId,
          text: "Synthesised evidence into a decision-ready recommendation.",
          relationship: "direct_evidence" as const,
          sourceStart: 0,
          sourceEnd: 59,
          provisional: true as const,
        }),
      ]),
    }),
  ]),
  futurePaths: Object.freeze({ available: false, reason: "Career Map personal mode." }),
  roleLens: Object.freeze({ available: false, reason: "Career Map personal mode." }),
});

function nodesOfType<T extends CareerMapGraphProjection["nodes"][number]["type"]>(
  projection: CareerMapGraphProjection,
  type: T,
): readonly Extract<CareerMapGraphProjection["nodes"][number], { type: T }>[] {
  return projection.nodes.filter(
    (node): node is Extract<CareerMapGraphProjection["nodes"][number], { type: T }> =>
      node.type === type,
  );
}

const projection = buildCareerMapGraphProjection({
  presentation,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment,
});

// A/B/G — all four roles, exact upstream order, monotonic presentation-only rank.
const roleNodes = nodesOfType(projection, "role") as readonly RoleGraphNode[];
assert.equal(roleNodes.length, 4);
assert.deepEqual(roleNodes.map((node) => node.id), ["role-a", "role-b", "role-c", "role-d"]);
assert.deepEqual(roleNodes.map((node) => node.proximityRank), [0, 1, 2, 3]);
assert.deepEqual(roleNodes.map((node) => node.orderingBasis), rankedRoleAlignment.roles.map((item) => item.orderingBasis));
assert.equal(roleNodes.some((node) => "fitScore" in node || "radius" in node), false);

// C/E — one personal canonical capability and one evidence relationship survive
// even though three roles require that capability.
const capabilityNodes = nodesOfType(projection, "capability");
assert.equal(capabilityNodes.filter((node) => node.id === insight.id).length, 1);
assert.equal(nodesOfType(projection, "evidence").length, 1);
assert.equal(
  projection.edges.filter(
    (edge) => edge.type === "capability_supported_by_evidence" && edge.toId === directSupport.evidenceId,
  ).length,
  1,
);

const requirementNodes = nodesOfType(projection, "role_requirement") as readonly RoleRequirementGraphNode[];
const sharedOwned = requirementNodes.filter((node) => node.capabilityId === insight.id);
assert.equal(sharedOwned.length, 3);
assert.equal(new Set(sharedOwned.map((node) => node.capabilityId)).size, 1);
assert.equal(sharedOwned.every((node) => node.requirementState === "directly_demonstrated"), true);

// D/F — a shared missing requirement keeps one canonical ID across layout proxies
// and never creates personal ownership or evidence.
const sharedGap = requirementNodes.filter((node) => node.capabilityId === missingResearch.id);
assert.equal(sharedGap.length, 2);
assert.equal(new Set(sharedGap.map((node) => node.capabilityId)).size, 1);
assert.equal(sharedGap.every((node) => node.requirementState === "evidence_not_yet_shown"), true);
assert.equal(capabilityNodes.some((node) => node.id === missingResearch.id), false);
assert.equal(
  projection.edges.some(
    (edge) =>
      (edge.type === "user_has_family" || edge.type === "family_contains_capability") &&
      edge.toId === missingResearch.id,
  ),
  false,
);

// H — same authoritative input yields the same frozen semantic projection.
const repeated = buildCareerMapGraphProjection({
  presentation,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment,
});
assert.deepEqual(repeated, projection);
assert.equal(Object.isFrozen(projection), true);
assert.equal(Object.isFrozen(projection.nodes), true);

// J — presentation grouping changes do not alter role order or canonical role edges.
const emptyPresentation = Object.freeze({ ...presentation, capabilities: Object.freeze([]) });
const withoutPersonalGrouping = buildCareerMapGraphProjection({
  presentation: emptyPresentation,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment,
});
assert.deepEqual(
  nodesOfType(withoutPersonalGrouping, "role"),
  roleNodes,
);
assert.deepEqual(
  nodesOfType(withoutPersonalGrouping, "role_requirement"),
  requirementNodes,
);

console.log("ranked career map graph projection tests passed");
