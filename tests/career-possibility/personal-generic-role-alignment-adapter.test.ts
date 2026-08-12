import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { buildPersonalGenericRoleAlignment } from "../../lib/career-possibility/personal-generic-role-alignment-adapter";
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
  assert.equal(built.ok, true);
  assert.equal(JSON.stringify(state), before, "adapter must not mutate personal state");
  if (!built.ok) throw new Error(built.issues[0]?.message ?? "Alignment failed");
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

// Case C — all four governed MVP roles are evaluated and returned.
assert.equal(result.alignment.roles.length, 4);
assert.deepEqual(
  [...result.alignment.roles.map((role) => role.roleId)].sort(),
  [
    "analytics-manager",
    "customer-insights-lead",
    "data-product-manager",
    "marketing-analytics-lead",
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

console.log("personal generic role alignment adapter tests passed");
