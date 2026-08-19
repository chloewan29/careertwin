import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { buildPersonalGenericRoleAlignment } from "../../lib/career-possibility/personal-generic-role-alignment-adapter";
import { buildGenericCareerPathAlignment } from "../../lib/career-possibility/generic-career-path-alignment";
import { filterAdmittedRoles } from "../../lib/career-possibility/generic-role-admission";
import { roleKnowledgeRegistry } from "../../lib/career-possibility/role-knowledge/role-registry";
import {
  PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION,
  type ProvisionalLocalCareerMapEvidence,
  type ProvisionalLocalCareerMapState,
} from "../../lib/career-possibility/local-career-map-state";
import {
  PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION,
  type ProvisionalAutoAdmittedMapping,
  type ProvisionalMappingMethod,
  type ProvisionalMappingRelationship,
} from "../../lib/career-possibility/provisional-resume-mapping-contract";

type MappingSeed = {
  readonly capabilityId: string;
  readonly evidenceId: string;
  readonly relationship: ProvisionalMappingRelationship;
  readonly method: ProvisionalMappingMethod;
};

const timestamp = "2026-08-12T00:00:00.000Z";
const capabilityDefinitionVersion = "task3b-test-definitions/1.0.0";
const mappingPolicyVersion = "task3b-test-mapping/1.0.0";

function buildState(seeds: readonly MappingSeed[]): ProvisionalLocalCareerMapState {
  const evidenceIds = [...new Set(seeds.map((seed) => seed.evidenceId))].sort();
  const evidence: ProvisionalLocalCareerMapEvidence[] = evidenceIds.map((evidenceId, index) => ({
    evidenceId,
    sourceExcerpt: `Performed professional work for ${evidenceId}.`,
    sourceLocator: {
      locatorId: `locator:${evidenceId}`,
      startOffset: index * 50,
      endOffset: index * 50 + 40,
    },
    signals: [],
    reviewStatus: "unreviewed",
    extractionVersion: "task3b-test-extraction/1.0.0",
  }));

  const mappings: ProvisionalAutoAdmittedMapping[] = seeds.map((seed, index) => {
    const base = {
      contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION,
      mappingId: `mapping:${index}:${seed.evidenceId}:${seed.capabilityId}`,
      evidenceId: seed.evidenceId,
      capabilityId: seed.capabilityId,
      relationship: seed.relationship,
      reviewStatus: "unreviewed" as const,
      admissionStatus: "auto_admitted" as const,
      explanation: `Admitted ${seed.capabilityId} from ${seed.evidenceId}.`,
      mappingPolicyVersion,
      capabilityDefinitionVersion,
    };
    return seed.method === "authored_deterministic"
      ? {
          ...base,
          method: "authored_deterministic" as const,
          matchedRuleId: `rule:${seed.capabilityId}`,
        }
      : { ...base, method: "structured_inference" as const };
  });

  const capabilityIds = [...new Set(seeds.map((seed) => seed.capabilityId))].sort();
  const capabilities = capabilityIds.map((capabilityId) => {
    const ownedMappings = mappings.filter((mapping) => mapping.capabilityId === capabilityId);
    const directEvidenceIds = [
      ...new Set(
        ownedMappings
          .filter((mapping) => mapping.relationship === "direct_evidence")
          .map((mapping) => mapping.evidenceId),
      ),
    ].sort();
    const transferableEvidenceIds = [
      ...new Set(
        ownedMappings
          .filter((mapping) => mapping.relationship === "transferable_signal")
          .map((mapping) => mapping.evidenceId),
      ),
    ].sort();
    return {
      capabilityId,
      directEvidenceIds,
      transferableEvidenceIds,
      provisionalEvidenceCount: new Set([...directEvidenceIds, ...transferableEvidenceIds]).size,
      reviewedEvidenceCount: 0 as const,
      mapTrustStatus: "provisional" as const,
    };
  });

  return {
    schemaVersion: PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION,
    source: "provisional_resume",
    mapTrustStatus: "provisional",
    sourceMetadata: {
      fileName: "task3b-test.pdf",
      mediaType: "application/pdf",
      byteSize: 1024,
      sourceRevision: "source:task3b-test",
    },
    versions: {
      evidenceExtractionVersion: "task3b-test-extraction/1.0.0",
      mappingPolicyVersion,
      capabilityDefinitionVersion,
      materializerVersion: "task3b-test-materializer/1.0.0",
    },
    materialization: {
      materializationId: "materialization:task3b-test",
      revision: 1,
    },
    evidence,
    mappings,
    capabilities,
    unresolvedEvidence: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function requireAlignment(state: ProvisionalLocalCareerMapState) {
  const before = JSON.stringify(state);
  const built = buildPersonalGenericRoleAlignment({ personalState: state });
  if (!built.ok) throw new Error(built.issues[0]?.message ?? "Alignment failed");
  assert.equal(built.ok, true);
  assert.equal(JSON.stringify(state), before, "adapter must not mutate personal state");
  return built.result;
}

const state = buildState([
  {
    capabilityId: "insight-synthesis",
    evidenceId: "evidence-structured",
    relationship: "direct_evidence",
    method: "structured_inference",
  },
  {
    capabilityId: "analytics-governance",
    evidenceId: "evidence-deterministic",
    relationship: "direct_evidence",
    method: "authored_deterministic",
  },
  {
    capabilityId: "analytics-governance",
    evidenceId: "evidence-transferable",
    relationship: "transferable_signal",
    method: "structured_inference",
  },
]);

// Case A — real-state shape, with no fabricated legacy strength/signal fields.
const result = requireAlignment(state);
assert.equal(result.semanticSource, "provisional_local_career_map_state");
assert.equal(result.alignment.alignmentBasis, "canonical_capability_ownership");
assert.equal(result.personalCapabilities.length, 2);
for (const capability of result.personalCapabilities) {
  assert.equal("strengthScore" in capability, false);
  assert.equal("weightedSignalScore" in capability, false);
  assert.equal("signalCount" in capability, false);
  assert.equal("supportingEvidence" in capability, false);
}
assert.equal(/strengthScore|weightedSignalScore|signalCount/.test(JSON.stringify(result)), false);

// Case B — multiple evidence relationships remain one semantic capability ownership.
const analyticsGovernance = result.personalCapabilities.find(
  (capability) => capability.canonicalCapabilityId === "analytics-governance",
);
assert.ok(analyticsGovernance);
assert.equal(analyticsGovernance.supports.length, 2);
assert.equal(
  result.alignment.roles.find((role) => role.roleId === "analytics-manager")?.identityDefining
    .evidencedCapabilities,
  1,
);
for (const role of result.alignment.roles) {
  assert.equal(
    role.matchedCapabilities.filter(
      (capability) => capability.canonicalCapabilityId === "analytics-governance",
    ).length,
    role.matchedCapabilities.some(
      (capability) => capability.canonicalCapabilityId === "analytics-governance",
    )
      ? 1
      : 0,
  );
}

// Case C — all 12 governed roles are evaluated and returned.
assert.equal(result.alignment.roles.length, 12);
assert.deepEqual(
  [...result.alignment.roles.map((role) => role.roleId)].sort(),
  [
    "account-manager",
    "analytics-manager",
    "business-development-manager",
    "customer-experience-manager",
    "customer-insights-lead",
    "data-product-manager",
    "engineering-manager",
    "finance-business-partner",
    "fpa-manager",
    "marketing-analytics-lead",
    "product-operations-manager",
    "service-delivery-manager",
  ].sort(),
);

// Case D — existing identity/core/support/differentiator priority controls ordering.
const importanceResult = requireAlignment(
  buildState([
    {
      capabilityId: "insight-synthesis",
      evidenceId: "evidence-importance",
      relationship: "direct_evidence",
      method: "structured_inference",
    },
  ]),
);
assert.equal(importanceResult.alignment.roles[0].roleId, "customer-insights-lead");
assert.deepEqual(importanceResult.alignment.roles[0].orderingBasis, [1, 0, 0, 0]);

// Cases E/F — structured-only and deterministic admissions both establish ownership.
assert.equal(
  result.personalCapabilities
    .find((capability) => capability.canonicalCapabilityId === "insight-synthesis")
    ?.supports[0]?.method,
  "structured_inference",
);
assert.equal(
  analyticsGovernance.supports.some((support) => support.method === "authored_deterministic"),
  true,
);

// Case G — direct and transferable support are preserved without numeric weighting.
assert.deepEqual(
  analyticsGovernance.supports.map((support) => support.relationship).sort(),
  ["direct_evidence", "transferable_signal"],
);
assert.equal(
  result.alignment.roles.some((role) =>
    role.matchedCapabilities.some(
      (capability) =>
        capability.canonicalCapabilityId === "analytics-governance" &&
        capability.supports.some((support) => support.relationship === "transferable_signal"),
    ),
  ),
  true,
);

// Case H — a role-only requirement cannot create personal ownership.
assert.equal(
  result.personalCapabilities.some(
    (capability) => capability.canonicalCapabilityId === "research-design",
  ),
  false,
);
const customerInsights = result.alignment.roles.find(
  (role) => role.roleId === "customer-insights-lead",
);
assert.ok(customerInsights);
assert.equal(
  customerInsights.missingCapabilities.some(
    (capability) => capability.canonicalCapabilityId === "research-design",
  ),
  true,
);

// Case I — presentation families/grouping are not an alignment input or import.
const adapterSource = readFileSync(
  "lib/career-possibility/personal-generic-role-alignment-adapter.ts",
  "utf8",
);
assert.equal(/buildPersonalCareerMapPresentation|groupPersonalCapabilitiesByFamily/.test(adapterSource), false);

// Case J — identical state and role library produce identical order and ordering basis.
const repeated = requireAlignment(state);
assert.deepEqual(
  repeated.alignment.roles.map((role) => ({
    roleId: role.roleId,
    orderingBasis: role.orderingBasis,
  })),
  result.alignment.roles.map((role) => ({
    roleId: role.roleId,
    orderingBasis: role.orderingBasis,
  })),
);

// Canonical identity must be literal registry identity throughout the output.
const canonicalIds = new Set(canonicalCapabilityLibrary.capabilities.map((capability) => capability.id));
assert.equal(
  result.alignment.roles.every((role) =>
    [...role.matchedCapabilities, ...role.missingCapabilities].every((capability) =>
      canonicalIds.has(capability.canonicalCapabilityId),
    ),
  ),
  true,
);

// Case K — N1 admission gate & >4 ADMITTED FIXTURE
const manyCapabilitiesState = buildState([
  { capabilityId: "insight-synthesis", evidenceId: "ev1", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "analytics-governance", evidenceId: "ev2", relationship: "direct_evidence", method: "authored_deterministic" },
  { capabilityId: "forecasting", evidenceId: "ev3", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "variance-analysis", evidenceId: "ev4", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "strategic-analysis", evidenceId: "ev5", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "account-growth", evidenceId: "ev6", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "commercial-negotiation", evidenceId: "ev7", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "research-design", evidenceId: "ev8", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "customer-segmentation", evidenceId: "ev9", relationship: "direct_evidence", method: "structured_inference" },
]);
const manyAdmittedResult = requireAlignment(manyCapabilitiesState);
assert.equal(manyAdmittedResult.admittedRoles.length > 4, true, "Must have >4 admitted roles for this test");
assert.equal(manyAdmittedResult.recommendedRoles.length, 4, "Must cap recommended roles to 4");
assert.deepEqual(
  manyAdmittedResult.recommendedRoles.map(r => r.roleId),
  manyAdmittedResult.admittedRoles.slice(0, 4).map(r => r.roleId)
);

// Case L — <=4 ADMITTED FIXTURE
const fewCapabilitiesState = buildState([
  { capabilityId: "insight-synthesis", evidenceId: "ev1", relationship: "direct_evidence", method: "structured_inference" },
  { capabilityId: "analytics-governance", evidenceId: "ev2", relationship: "direct_evidence", method: "authored_deterministic" },
]);
const fewAdmittedResult = requireAlignment(fewCapabilitiesState);
assert.equal(fewAdmittedResult.admittedRoles.length > 0 && fewAdmittedResult.admittedRoles.length <= 4, true, "Must have 1-4 admitted roles for this test");
assert.equal(fewAdmittedResult.recommendedRoles.length, fewAdmittedResult.admittedRoles.length);
assert.deepEqual(
  fewAdmittedResult.recommendedRoles.map(r => r.roleId),
  fewAdmittedResult.admittedRoles.map(r => r.roleId)
);

// Case M — REGISTRY-ORDER INDEPENDENCE (Pure-function experiment)
const reversedRoles = [...roleKnowledgeRegistry.roles].reverse();
const forwardAlignment = buildGenericCareerPathAlignment({
  canonicalCapabilityOwnership: manyAdmittedResult.personalCapabilities,
  genericRoleArchetypes: roleKnowledgeRegistry.roles,
  canonicalDefinitions: canonicalCapabilityLibrary.capabilities,
});
const reversedAlignment = buildGenericCareerPathAlignment({
  canonicalCapabilityOwnership: manyAdmittedResult.personalCapabilities,
  genericRoleArchetypes: reversedRoles,
  canonicalDefinitions: canonicalCapabilityLibrary.capabilities,
});
const forwardAdmitted = filterAdmittedRoles(forwardAlignment.roles);
const reversedAdmitted = filterAdmittedRoles(reversedAlignment.roles);
assert.deepEqual(
  forwardAdmitted.map(r => r.roleId),
  reversedAdmitted.map(r => r.roleId),
  "Changing input role order does NOT change authoritative role order"
);

// Case N — TIE-BREAK DETERMINISM
const emptyState = buildState([
  { capabilityId: "legal-technology", evidenceId: "ev-tie", relationship: "direct_evidence", method: "structured_inference" },
]);
const emptyResult = requireAlignment(emptyState);
const sortedRoleIds = [...emptyResult.alignment.roles].map(r => r.roleId);
const expectedSorted = [...sortedRoleIds].sort((a, b) => {
  const roleA = roleKnowledgeRegistry.roles.find(r => r.roleFamilyId === a)!;
  const roleB = roleKnowledgeRegistry.roles.find(r => r.roleFamilyId === b)!;
  const titleCmp = roleA.canonicalTitle.localeCompare(roleB.canonicalTitle, "en");
  return titleCmp !== 0 ? titleCmp : a.localeCompare(b, "en");
});
assert.deepEqual(sortedRoleIds, expectedSorted, "Tie-break must follow title then roleId");

console.log("personal generic role alignment adapter tests passed");

