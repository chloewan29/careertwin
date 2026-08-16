import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import { buildCareerMapGraphProjection, type RoleGraphNode } from "../../lib/career-possibility/career-map-graph-projection";
import type { GenericCareerPathOwnershipAlignmentResult } from "../../lib/career-possibility/generic-career-path-alignment";
import type { PersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";
import { buildPersonalGenericRoleAlignment } from "../../lib/career-possibility/personal-generic-role-alignment-adapter";
import {
  PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION,
  type ProvisionalLocalCareerMapState,
} from "../../lib/career-possibility/local-career-map-state";
import { PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION } from "../../lib/career-possibility/provisional-resume-mapping-contract";

const workspaceSource = readFileSync(
  "components/career-possibility/LocalCareerMapWorkspace.tsx",
  "utf8",
);
const rendererSource = readFileSync(
  "components/career-possibility/CareerMapNeuralGraph.tsx",
  "utf8",
);

// Active route: real personal state enters Task 3B, then Task 3C projection.
assert.match(workspaceSource, /buildPersonalGenericRoleAlignment\(\{ personalState: result\.state \}\)/);
assert.match(workspaceSource, /rankedRoleAlignment: graphAlignment\.result\.alignment/);
assert.doesNotMatch(workspaceSource, /roleFamilyId === ["']analytics-manager["']/);
assert.doesNotMatch(workspaceSource, /buildPersonalTargetRoleComparison/);

// Renderer remains a projection consumer and has no singular role path or UI ranking.
assert.doesNotMatch(rendererSource, /roleNodes\[0\]/);
assert.match(rendererSource, /buildCareerGraphVisualModel\(projection\)/);
assert.match(rendererSource, /roleRequirements = requirements\.filter\(\(item\) => item\.roleId === selected\.semanticId\)/);
assert.doesNotMatch(rendererSource, /\.sort\(|matchedCapabilities|Math\.random/);
assert.doesNotMatch(rendererSource, /from ["'][^"']*(job-copilot|candidate-baseline|generic-career-path-alignment)[^"']*["']/i);

const roles = [
  ["role-a", "Role A", 0],
  ["role-b", "Role B", 1],
  ["role-c", "Role C", 2],
  ["role-d", "Role D", 3],
] as const;

const alignment: GenericCareerPathOwnershipAlignmentResult = Object.freeze({
  schemaVersion: "1.0.0",
  modelVersion: "canonical-ownership/1.0.0",
  alignmentBasis: "canonical_capability_ownership",
  roles: Object.freeze(
    roles.map(([roleId, title, rank]) =>
      Object.freeze({
        roleId,
        title,
        primaryMandate: `Mandate ${rank}`,
        primaryOwnership: Object.freeze([`Ownership ${rank}`]),
        calibrated: true as const,
        alignmentBasis: "canonical_capability_ownership" as const,
        identityDefining: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
        coreEnablers: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
        supporting: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
        differentiators: Object.freeze({ totalCapabilities: 0, evidencedCapabilities: 0 }),
        matchedCapabilities: Object.freeze([]),
        missingCapabilities: Object.freeze([]),
        // Deliberately unrelated values: renderer/projection may not re-sort them.
        orderingBasis: Object.freeze([3 - rank]),
        explanation: `Alignment ${rank}`,
      }),
    ),
  ),
});

const presentation: PersonalCareerMapPresentation = Object.freeze({
  mode: "personal",
  status: "provisional",
  mapTrustStatus: "provisional",
  unresolvedEvidenceCount: 0,
  reviewedEvidenceCount: 0,
  provisionalEvidenceCount: 0,
  capabilities: Object.freeze([]),
  futurePaths: Object.freeze({ available: false, reason: "Career Map personal mode." }),
  roleLens: Object.freeze({ available: false, reason: "Career Map personal mode." }),
});

const projection = buildCareerMapGraphProjection({
  presentation,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment: alignment,
});
const projectedRoles = projection.nodes.filter(
  (node): node is RoleGraphNode => node.type === "role",
);

assert.equal(projectedRoles.length, 4);
assert.deepEqual(projectedRoles.map((role) => role.id), roles.map(([roleId]) => roleId));
assert.deepEqual(projectedRoles.map((role) => role.proximityRank), [0, 1, 2, 3]);

// The renderer's deterministic seed carries upstream order without reranking.
const displayRadii = projectedRoles.map(
  (role, index) => 455 + (role.proximityRank ?? index) * 28,
);
assert.deepEqual(displayRadii, [455, 483, 511, 539]);
assert.equal(displayRadii.every((radius, index) => index === 0 || displayRadii[index - 1] < radius), true);
assert.match(rendererSource, /455 \+ \(node\.proximityRank \?\? index\) \* 28/);

// Desktop Canvas and the mobile-accessible navigator consume one visual model.
assert.match(rendererSource, /visualModel\.nodes\.filter\(\(node\) => node\.nodeType === nodeType\)/);
assert.match(rendererSource, /Accessible graph navigator/);

// Production-equivalent smoke: valid local v2 state -> Task 3B -> Task 3C -> renderer contract.
const localState: ProvisionalLocalCareerMapState = {
  schemaVersion: PROVISIONAL_LOCAL_CAREER_MAP_SCHEMA_VERSION,
  source: "provisional_resume",
  mapTrustStatus: "provisional",
  sourceMetadata: {
    fileName: "task3d-smoke.pdf",
    mediaType: "application/pdf",
    byteSize: 512,
    sourceRevision: "source:task3d-smoke",
  },
  versions: {
    evidenceExtractionVersion: "task3d-smoke-extraction/1.0.0",
    mappingPolicyVersion: "task3d-smoke-mapping/1.0.0",
    capabilityDefinitionVersion: "task3d-smoke-definitions/1.0.0",
    materializerVersion: "task3d-smoke-materializer/1.0.0",
  },
  materialization: { materializationId: "materialization:task3d-smoke", revision: 1 },
  evidence: [
    {
      evidenceId: "evidence:insight",
      sourceExcerpt: "Synthesised customer evidence into a decision-ready recommendation.",
      sourceLocator: { locatorId: "locator:insight", startOffset: 0, endOffset: 65 },
      signals: [],
      reviewStatus: "unreviewed",
      extractionVersion: "task3d-smoke-extraction/1.0.0",
    },
  ],
  mappings: [
    {
      contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION,
      mappingId: "mapping:insight",
      evidenceId: "evidence:insight",
      capabilityId: "insight-synthesis",
      relationship: "direct_evidence",
      method: "structured_inference",
      reviewStatus: "unreviewed",
      admissionStatus: "auto_admitted",
      explanation: "Validated structured mapping for route smoke.",
      mappingPolicyVersion: "task3d-smoke-mapping/1.0.0",
      capabilityDefinitionVersion: "task3d-smoke-definitions/1.0.0",
    },
  ],
  capabilities: [
    {
      capabilityId: "insight-synthesis",
      directEvidenceIds: ["evidence:insight"],
      transferableEvidenceIds: [],
      provisionalEvidenceCount: 1,
      reviewedEvidenceCount: 0,
      mapTrustStatus: "provisional",
    },
  ],
  unresolvedEvidence: [],
  createdAt: "2026-08-12T00:00:00.000Z",
  updatedAt: "2026-08-12T00:00:00.000Z",
};
const routeAlignment = buildPersonalGenericRoleAlignment({ personalState: localState });
assert.equal(routeAlignment.ok, true);
if (!routeAlignment.ok) throw new Error(routeAlignment.issues[0]?.message ?? "Route alignment failed");
const routeProjection = buildCareerMapGraphProjection({
  presentation,
  familyLibrary: canonicalCapabilityFamilyLibrary,
  rankedRoleAlignment: routeAlignment.result.alignment,
});
assert.equal(routeProjection.nodes.filter((node) => node.type === "role").length, 4);

console.log("active multi-role Career Map renderer tests passed");
