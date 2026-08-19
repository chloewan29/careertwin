/**
 * generic-role-admission.ts
 *
 * POST-MVP TASK N1 — ROLE RECOMMENDATION ADMISSION GATE
 *
 * Determines whether an aligned generic role candidate has sufficient
 * substantive personal evidence to be recommended as a Career Map future role.
 *
 * This module owns recommendation eligibility only. It does not:
 * - rerank candidates
 * - change role requirement definitions
 * - calculate a fit score or confidence percentage
 * - own graph projection
 *
 * SUBSTANTIVE SECTIONS: identity_defining, core_enabler, supporting.
 * DIFFERENTIATOR matches do NOT count toward substantive support.
 *
 * ADMISSION RULES (both must be true):
 *   Rule 1: substantiveMatchCount >= SUBSTANTIVE_MATCH_MINIMUM (2)
 *   Rule 2: at least one substantive match comes from identity_defining or core_enabler
 *
 * A differentiator-only profile is always rejected regardless of count.
 */

import type { AlignmentSection, GenericRoleCanonicalOwnershipAlignment } from "./generic-career-path-alignment";

export const GENERIC_ROLE_ADMISSION_VERSION = "generic-role-admission/1.0.0" as const;

/** Minimum total substantive matches required for admission. */
export const SUBSTANTIVE_MATCH_MINIMUM = 2 as const;

/**
 * The sections that count as substantive support for recommendation eligibility.
 * Differentiator matches are intentionally excluded.
 */
const SUBSTANTIVE_SECTIONS = new Set<AlignmentSection>(["identity_defining", "core_enabler", "supporting"]);

export type RoleAdmissionReason =
  | "admitted"
  | "insufficient_substantive_support"
  | "no_identity_or_core_support";

export type RoleAdmissionResult = {
  /** Whether the role passes the recommendation admission gate. */
  readonly admitted: boolean;
  /** Count of matched capabilities from identity_defining, core_enabler, or supporting sections. */
  readonly substantiveMatchCount: number;
  /** Whether at least one substantive match comes from identity_defining or core_enabler. */
  readonly hasIdentityOrCoreMatch: boolean;
  /** Deterministic reason code. */
  readonly reason: RoleAdmissionReason;
};

/**
 * Evaluates whether a single aligned role candidate should be admitted for recommendation.
 *
 * Does not inspect evidence text. Operates entirely on section labels already
 * computed by the alignment pipeline.
 */
export function evaluateGenericRoleAdmission(
  role: Pick<GenericRoleCanonicalOwnershipAlignment, "matchedCapabilities">,
): RoleAdmissionResult {
  let substantiveMatchCount = 0;
  let hasIdentityOrCoreMatch = false;

  for (const capability of role.matchedCapabilities) {
    if (!SUBSTANTIVE_SECTIONS.has(capability.section)) continue;
    substantiveMatchCount += 1;
    if (capability.section === "identity_defining" || capability.section === "core_enabler") {
      hasIdentityOrCoreMatch = true;
    }
  }

  if (substantiveMatchCount < SUBSTANTIVE_MATCH_MINIMUM) {
    return Object.freeze({
      admitted: false,
      substantiveMatchCount,
      hasIdentityOrCoreMatch,
      reason: "insufficient_substantive_support",
    });
  }

  if (!hasIdentityOrCoreMatch) {
    return Object.freeze({
      admitted: false,
      substantiveMatchCount,
      hasIdentityOrCoreMatch,
      reason: "no_identity_or_core_support",
    });
  }

  return Object.freeze({
    admitted: true,
    substantiveMatchCount,
    hasIdentityOrCoreMatch,
    reason: "admitted",
  });
}

/**
 * Applies the admission gate to a list of already-ranked role alignment results.
 *
 * Preserves the relative order of admitted candidates from the upstream sort.
 * Downstream presentation rank (proximityRank) is assigned by the projection
 * layer against the returned list, so ranks will be contiguous starting from 0.
 *
 * Returns an empty array when no candidate meets the admission policy.
 */
export function filterAdmittedRoles<T extends Pick<GenericRoleCanonicalOwnershipAlignment, "matchedCapabilities">>(
  rankedRoles: readonly T[],
): readonly T[] {
  return Object.freeze(rankedRoles.filter((role) => evaluateGenericRoleAdmission(role).admitted));
}
