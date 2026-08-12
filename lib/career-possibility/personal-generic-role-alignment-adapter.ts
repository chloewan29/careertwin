import { canonicalCapabilityLibrary } from "./canonical-capability-library";
import {
  buildGenericCareerPathAlignment,
  type CanonicalCapabilityOwnership,
  type GenericCareerPathOwnershipAlignmentResult,
} from "./generic-career-path-alignment";
import { representativeGenericRoleArchetypes } from "./generic-role-archetype";
import {
  validateProvisionalLocalCareerMapState,
  type ProvisionalLocalCareerMapState,
} from "./local-career-map-state";

export const PERSONAL_GENERIC_ROLE_ALIGNMENT_ADAPTER_VERSION =
  "personal-generic-role-alignment-adapter/1.0.0" as const;

export type PersonalGenericRoleAlignment = {
  readonly version: typeof PERSONAL_GENERIC_ROLE_ALIGNMENT_ADAPTER_VERSION;
  readonly semanticSource: "provisional_local_career_map_state";
  readonly personalCapabilities: readonly CanonicalCapabilityOwnership[];
  readonly alignment: GenericCareerPathOwnershipAlignmentResult;
};

export type PersonalGenericRoleAlignmentResult =
  | { readonly ok: true; readonly result: PersonalGenericRoleAlignment }
  | {
      readonly ok: false;
      readonly issues: readonly { readonly code: string; readonly path: string; readonly message: string }[];
    };

const compare = (left: string, right: string) => left.localeCompare(right, "en");

export function buildPersonalGenericRoleAlignment(input: {
  readonly personalState: ProvisionalLocalCareerMapState;
}): PersonalGenericRoleAlignmentResult {
  const validation = validateProvisionalLocalCareerMapState(
    input.personalState,
    canonicalCapabilityLibrary.capabilities,
  );
  if (!validation.ok) return validation;

  const supportsByCapability = new Map<
    string,
    CanonicalCapabilityOwnership["supports"][number][]
  >();
  for (const mapping of input.personalState.mappings) {
    const supports = supportsByCapability.get(mapping.capabilityId) ?? [];
    supports.push(
      Object.freeze({
        mappingId: mapping.mappingId,
        evidenceId: mapping.evidenceId,
        relationship: mapping.relationship,
        method: mapping.method,
      }),
    );
    supportsByCapability.set(mapping.capabilityId, supports);
  }

  const personalCapabilities = Object.freeze(
    [...supportsByCapability]
      .map(([canonicalCapabilityId, supports]): CanonicalCapabilityOwnership =>
        Object.freeze({
          canonicalCapabilityId,
          supports: Object.freeze(
            supports.sort(
              (left, right) =>
                compare(left.evidenceId, right.evidenceId) ||
                compare(left.relationship, right.relationship) ||
                compare(left.mappingId, right.mappingId),
            ),
          ),
        }),
      )
      .sort((left, right) => compare(left.canonicalCapabilityId, right.canonicalCapabilityId)),
  );

  const alignment = buildGenericCareerPathAlignment({
    canonicalCapabilityOwnership: personalCapabilities,
    genericRoleArchetypes: representativeGenericRoleArchetypes,
    canonicalDefinitions: canonicalCapabilityLibrary.capabilities,
  });

  return {
    ok: true,
    result: Object.freeze({
      version: PERSONAL_GENERIC_ROLE_ALIGNMENT_ADAPTER_VERSION,
      semanticSource: "provisional_local_career_map_state",
      personalCapabilities,
      alignment,
    }),
  };
}
