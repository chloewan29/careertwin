/**
 * Career Map graph projection — pure presentation layer.
 *
 * This module is EPHEMERAL and PRESENTATION-ONLY.
 * It derives a typed graph model from existing authoritative owners:
 *
 *   - PersonalCareerMapPresentation (capability + evidence state)
 *   - CanonicalCapabilityFamilyLibrary (family authority)
 *   - PersonalTargetRoleComparison (role-requirement state)
 *
 * Invariants:
 * - Does NOT persist any state.
 * - Does NOT become a semantic authority.
 * - Does NOT recompute capability inference.
 * - Does NOT read from localStorage.
 * - Does NOT reference employer / roleTitle (HOLD-only provenance).
 * - Does NOT introduce fit scores, strength fields, or ranking semantics.
 * - Does NOT fabricate personal capabilities from role requirements.
 */

import type { CanonicalCapabilityFamilyLibrary } from "./canonical-capability-family-library";
import type { PersonalCareerMapPresentation } from "./local-career-map-presentation-adapter";
import type { PersonalTargetRoleComparison, RequirementOutcome } from "./personal-target-role-comparison";
import type { RoleCapabilityProfile } from "./role-capability-library";

export const CAREER_MAP_GRAPH_PROJECTION_VERSION = "career-map-graph-projection/1.0.0" as const;

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

export type UserGraphNode = {
  readonly type: "user";
  readonly id: "user";
};

export type CapabilityFamilyGraphNode = {
  readonly type: "capability_family";
  readonly id: string;
  readonly label: string;
  /** Personal capability IDs admitted into this family. */
  readonly capabilityIds: readonly string[];
};

export type CapabilityGraphNode = {
  readonly type: "capability";
  readonly id: string;
  readonly label: string;
  readonly familyId: string;
  /** Evidence IDs that support this personal capability. */
  readonly evidenceIds: readonly string[];
};

export type EvidenceGraphNode = {
  readonly type: "evidence";
  readonly id: string;
  readonly text: string;
  /**
   * The strongest relationship this evidence has across all capabilities it supports.
   * If any mapping is direct_evidence, the node carries direct_evidence.
   */
  readonly relationship: "direct_evidence" | "transferable_signal";
  /** Personal capability IDs this evidence supports. */
  readonly capabilityIds: readonly string[];
};

export type RoleGraphNode = {
  readonly type: "role";
  readonly id: string;
  readonly title: string;
  readonly domain: string;
};

/** The three role-requirement states the graph projection exposes. */
export type RoleRequirementState =
  | "directly_demonstrated"
  | "transferable_signal"
  | "evidence_not_yet_shown";

export type RoleRequirementGraphNode = {
  readonly type: "role_requirement";
  /** Deterministic: `role_req:${roleId}:${capabilityId}` */
  readonly id: string;
  readonly roleId: string;
  readonly capabilityId: string;
  readonly capabilityLabel: string;
  readonly importance: "must" | "should" | "differentiator";
  /** Role-context state only — never a claim about the user's personal capability set. */
  readonly requirementState: RoleRequirementState;
};

export type CareerMapGraphNode =
  | UserGraphNode
  | CapabilityFamilyGraphNode
  | CapabilityGraphNode
  | EvidenceGraphNode
  | RoleGraphNode
  | RoleRequirementGraphNode;

// ---------------------------------------------------------------------------
// Edge types
// ---------------------------------------------------------------------------

export type CareerMapGraphEdgeType =
  | "user_has_family"
  | "family_contains_capability"
  | "capability_supported_by_evidence"
  | "role_requires_capability";

export type CareerMapGraphEdge = {
  readonly type: CareerMapGraphEdgeType;
  readonly fromId: string;
  readonly toId: string;
};

// ---------------------------------------------------------------------------
// Projection output
// ---------------------------------------------------------------------------

export type CareerMapGraphProjection = {
  readonly version: typeof CAREER_MAP_GRAPH_PROJECTION_VERSION;
  readonly nodes: readonly CareerMapGraphNode[];
  readonly edges: readonly CareerMapGraphEdge[];
};

// ---------------------------------------------------------------------------
// Intermediate grouping type
// ---------------------------------------------------------------------------

export type PersonalFamilyGroup = {
  readonly familyId: string;
  readonly familyLabel: string;
  readonly capabilities: readonly {
    readonly id: string;
    readonly label: string;
    readonly evidenceIds: readonly string[];
  }[];
};

// ---------------------------------------------------------------------------
// Role input type
// ---------------------------------------------------------------------------

export type CareerMapRoleInput = {
  readonly roleProfile: RoleCapabilityProfile;
  /**
   * Pre-computed comparison result from buildPersonalTargetRoleComparison().
   * The projection reads requirement states from here — it does not recompute them.
   */
  readonly comparison: PersonalTargetRoleComparison;
};

// ---------------------------------------------------------------------------
// groupPersonalCapabilitiesByFamily
// ---------------------------------------------------------------------------

/**
 * Groups the user's admitted personal capabilities by their canonical family.
 *
 * Only families with at least one admitted personal capability are emitted.
 * Capabilities whose family string does not match any canonical family are silently
 * excluded — they are not fabricated into an unknown group.
 */
export function groupPersonalCapabilitiesByFamily(
  presentation: PersonalCareerMapPresentation,
  familyLibrary: CanonicalCapabilityFamilyLibrary,
): readonly PersonalFamilyGroup[] {
  // Build a lookup from family label (as stored on each capability) to canonical family.
  const familyByLabel = new Map(
    familyLibrary.families.map((f) => [f.label, f] as const),
  );

  // Accumulate capabilities grouped by canonical family ID.
  const grouped = new Map<
    string,
    { familyId: string; familyLabel: string; capabilities: { id: string; label: string; evidenceIds: string[] }[] }
  >();

  for (const capability of presentation.capabilities) {
    const family = familyByLabel.get(capability.family);
    if (!family) continue; // unmatched family — silently skip, never fabricate

    if (!grouped.has(family.id)) {
      grouped.set(family.id, { familyId: family.id, familyLabel: family.label, capabilities: [] });
    }
    const group = grouped.get(family.id)!;

    // Deduplicate evidence IDs per capability.
    const evidenceIds = [...new Set(capability.evidence.map((e) => e.evidenceId))];
    group.capabilities.push({ id: capability.id, label: capability.label, evidenceIds });
  }

  return Object.freeze(
    [...grouped.values()].map((group) =>
      Object.freeze({
        familyId: group.familyId,
        familyLabel: group.familyLabel,
        capabilities: Object.freeze(
          group.capabilities.map((cap) =>
            Object.freeze({ id: cap.id, label: cap.label, evidenceIds: Object.freeze([...cap.evidenceIds]) }),
          ),
        ),
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// MVP requirement-state guard
// ---------------------------------------------------------------------------

const mvpStates: ReadonlySet<RoleRequirementState> = new Set([
  "directly_demonstrated",
  "transferable_signal",
  "evidence_not_yet_shown",
]);

function isMvpRequirementState(outcome: RequirementOutcome): outcome is RoleRequirementState {
  return mvpStates.has(outcome as RoleRequirementState);
}

// ---------------------------------------------------------------------------
// buildCareerMapGraphProjection
// ---------------------------------------------------------------------------

/**
 * Builds a typed, ephemeral graph projection from existing semantic owners.
 *
 * Without a role, the projection contains only the personal evidence-derived graph.
 * With one role, it additionally contains role nodes and per-requirement state nodes.
 *
 * Invariant: a role requirement for a capability absent from the user's personal set
 * is represented as a RoleRequirementGraphNode with requirementState "evidence_not_yet_shown".
 * It is NEVER added to personal CapabilityGraphNode or CapabilityFamilyGraphNode lists.
 */
export function buildCareerMapGraphProjection(input: {
  readonly presentation: PersonalCareerMapPresentation;
  readonly familyLibrary: CanonicalCapabilityFamilyLibrary;
  readonly role?: CareerMapRoleInput;
}): CareerMapGraphProjection {
  const nodes: CareerMapGraphNode[] = [];
  const edges: CareerMapGraphEdge[] = [];

  // --- User node -----------------------------------------------------------
  nodes.push(Object.freeze<UserGraphNode>({ type: "user", id: "user" }));

  // --- Family grouping (personal evidence-derived graph only) --------------
  const families = groupPersonalCapabilitiesByFamily(input.presentation, input.familyLibrary);

  // Build a deduplicated evidence map across all capabilities.
  // relationship preference: direct_evidence > transferable_signal.
  const evidenceAccumulator = new Map<
    string,
    { text: string; relationship: "direct_evidence" | "transferable_signal"; capabilityIds: string[] }
  >();

  for (const capability of input.presentation.capabilities) {
    for (const ev of capability.evidence) {
      const existing = evidenceAccumulator.get(ev.evidenceId);
      if (existing) {
        // Upgrade relationship to direct_evidence if a stronger mapping exists.
        if (ev.relationship === "direct_evidence") existing.relationship = "direct_evidence";
        if (!existing.capabilityIds.includes(capability.id)) {
          existing.capabilityIds.push(capability.id);
        }
      } else {
        evidenceAccumulator.set(ev.evidenceId, {
          text: ev.text,
          relationship: ev.relationship,
          capabilityIds: [capability.id],
        });
      }
    }
  }

  // --- Family and capability nodes -----------------------------------------
  for (const family of families) {
    const familyCapabilityIds = family.capabilities.map((c) => c.id);

    nodes.push(Object.freeze<CapabilityFamilyGraphNode>({
      type: "capability_family",
      id: family.familyId,
      label: family.familyLabel,
      capabilityIds: Object.freeze(familyCapabilityIds),
    }));
    edges.push(Object.freeze<CareerMapGraphEdge>({ type: "user_has_family", fromId: "user", toId: family.familyId }));

    for (const cap of family.capabilities) {
      nodes.push(Object.freeze<CapabilityGraphNode>({
        type: "capability",
        id: cap.id,
        label: cap.label,
        familyId: family.familyId,
        evidenceIds: Object.freeze([...cap.evidenceIds]),
      }));
      edges.push(Object.freeze<CareerMapGraphEdge>({ type: "family_contains_capability", fromId: family.familyId, toId: cap.id }));

      for (const evidenceId of cap.evidenceIds) {
        edges.push(Object.freeze<CareerMapGraphEdge>({ type: "capability_supported_by_evidence", fromId: cap.id, toId: evidenceId }));
      }
    }
  }

  // --- Evidence nodes (deduplicated across all capabilities) ---------------
  for (const [evidenceId, ev] of evidenceAccumulator) {
    nodes.push(Object.freeze<EvidenceGraphNode>({
      type: "evidence",
      id: evidenceId,
      text: ev.text,
      relationship: ev.relationship,
      capabilityIds: Object.freeze([...ev.capabilityIds]),
    }));
  }

  // --- Role nodes (optional) -----------------------------------------------
  if (input.role) {
    const { roleProfile, comparison } = input.role;
    const roleId = roleProfile.roleFamilyId;

    nodes.push(Object.freeze<RoleGraphNode>({
      type: "role",
      id: roleId,
      title: roleProfile.canonicalTitle,
      domain: roleProfile.domain,
    }));

    for (const requirement of comparison.requirements) {
      // Only emit nodes for the three MVP requirement states.
      // governance_deferred and governance_excluded are excluded from the graph.
      if (!isMvpRequirementState(requirement.outcome)) continue;

      const reqId = `role_req:${roleId}:${requirement.capabilityId}`;
      nodes.push(Object.freeze<RoleRequirementGraphNode>({
        type: "role_requirement",
        id: reqId,
        roleId,
        capabilityId: requirement.capabilityId,
        capabilityLabel: requirement.canonicalLabel ?? requirement.roleLabel,
        importance: requirement.importance,
        requirementState: requirement.outcome,
      }));
      edges.push(Object.freeze<CareerMapGraphEdge>({ type: "role_requires_capability", fromId: roleId, toId: reqId }));
    }
  }

  return Object.freeze({
    version: CAREER_MAP_GRAPH_PROJECTION_VERSION,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}
