import {
  CAREER_MAP_GRAPH_PROJECTION_VERSION,
  type CareerMapGraphProjection,
} from "../../../lib/career-possibility/career-map-graph-projection";

/**
 * Anonymized Sparse Profile Fixture
 * 
 * Shape:
 * - 1 YOU node
 * - 1 capability_family
 * - 1 personal capability
 * - 1 evidence
 * - 4 future roles
 * - 2 owned role_requirements
 * - 24 missing role_requirements
 */
export const sparseProfileProjectionFixture: CareerMapGraphProjection = Object.freeze({
  version: CAREER_MAP_GRAPH_PROJECTION_VERSION,
  nodes: Object.freeze([
    { type: "user", id: "user" },
    { type: "capability_family", id: "family:f1", label: "Core Foundation", capabilityIds: ["cap:c1"] },
    { type: "capability", id: "cap:c1", label: "Single Personal Cap", familyId: "family:f1", evidenceIds: ["ev:e1"] },
    { type: "evidence", id: "ev:e1", text: "I did one thing", relationship: "direct_evidence", capabilityIds: ["cap:c1"] },
    
    // Roles
    { type: "role", id: "role:r1", title: "Role 1", proximityRank: 0 },
    { type: "role", id: "role:r2", title: "Role 2", proximityRank: 1 },
    { type: "role", id: "role:r3", title: "Role 3", proximityRank: 2 },
    { type: "role", id: "role:r4", title: "Role 4", proximityRank: 3 },
    
    // Owned requirements
    { type: "role_requirement", id: "req:r1:c1", roleId: "role:r1", capabilityId: "cap:c1", capabilityLabel: "Single Personal Cap", requirementState: "directly_demonstrated" },
    { type: "role_requirement", id: "req:r2:c1", roleId: "role:r2", capabilityId: "cap:c1", capabilityLabel: "Single Personal Cap", requirementState: "transferable_signal" },
    
    // Gap requirements (6 per role)
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requirement", id: `req:r1:gap${i}`, roleId: "role:r1", capabilityId: `cap:r1:gap${i}`, capabilityLabel: `Gap R1 ${i}`, requirementState: "evidence_not_yet_shown" } as const)),
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requirement", id: `req:r2:gap${i}`, roleId: "role:r2", capabilityId: `cap:r2:gap${i}`, capabilityLabel: `Gap R2 ${i}`, requirementState: "evidence_not_yet_shown" } as const)),
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requirement", id: `req:r3:gap${i}`, roleId: "role:r3", capabilityId: `cap:r3:gap${i}`, capabilityLabel: `Gap R3 ${i}`, requirementState: "evidence_not_yet_shown" } as const)),
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requirement", id: `req:r4:gap${i}`, roleId: "role:r4", capabilityId: `cap:r4:gap${i}`, capabilityLabel: `Gap R4 ${i}`, requirementState: "evidence_not_yet_shown" } as const)),
  ]),
  edges: Object.freeze([
    { type: "user_has_family", fromId: "user", toId: "family:f1" },
    { type: "family_contains_capability", fromId: "family:f1", toId: "cap:c1" },
    { type: "capability_supported_by_evidence", fromId: "cap:c1", toId: "ev:e1" },
    
    { type: "role_requires_capability", fromId: "role:r1", toId: "req:r1:c1" },
    { type: "role_requires_capability", fromId: "role:r2", toId: "req:r2:c1" },
    
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requires_capability", fromId: "role:r1", toId: `req:r1:gap${i}` } as const)),
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requires_capability", fromId: "role:r2", toId: `req:r2:gap${i}` } as const)),
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requires_capability", fromId: "role:r3", toId: `req:r3:gap${i}` } as const)),
    ...Array.from({ length: 6 }).map((_, i) => ({ type: "role_requires_capability", fromId: "role:r4", toId: `req:r4:gap${i}` } as const)),
  ]),
});
