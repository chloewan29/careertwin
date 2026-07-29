import {
  validateCanonicalCapabilityLibrary,
  type CanonicalCapabilityLibrary,
} from "./canonical-capability-library";
import {
  validateCanonicalCapabilityFamilyLibrary,
  validateCanonicalCapabilityFamilyMembership,
  type CanonicalCapabilityFamilyLibrary,
} from "./canonical-capability-family-library";
import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";

export const CANONICAL_CAPABILITY_DEFINITION_ADAPTER_VERSION = "1.0.0" as const;

export type CanonicalCapabilityDefinitionAdapterIssue = {
  readonly code:
    | "invalid_capability_library"
    | "invalid_family_library"
    | "invalid_family_membership";
  readonly path: string;
  readonly message: string;
};

export type CanonicalCapabilityDefinitionAdapterResult =
  | {
      readonly ok: true;
      readonly definitions: readonly CareerMapCapabilityDefinition[];
      readonly definitionVersion: string;
    }
  | {
      readonly ok: false;
      readonly issues: readonly CanonicalCapabilityDefinitionAdapterIssue[];
    };

export function buildCareerMapCapabilityDefinitionsFromCanonicalLibrary(input: {
  readonly capabilityLibrary: CanonicalCapabilityLibrary;
  readonly familyLibrary: CanonicalCapabilityFamilyLibrary;
}): CanonicalCapabilityDefinitionAdapterResult {
  const capabilityValidation = validateCanonicalCapabilityLibrary(
    input.capabilityLibrary,
  );
  if (!capabilityValidation.ok) {
    return {
      ok: false,
      issues: capabilityValidation.issues.map((item) => ({
        code: "invalid_capability_library",
        path: item.path,
        message: `${item.code}: ${item.message}`,
      })),
    };
  }
  const familyValidation = validateCanonicalCapabilityFamilyLibrary(
    input.familyLibrary,
  );
  if (!familyValidation.ok) {
    return {
      ok: false,
      issues: familyValidation.issues.map((item) => ({
        code: "invalid_family_library",
        path: item.path,
        message: `${item.code}: ${item.message}`,
      })),
    };
  }
  const membership = validateCanonicalCapabilityFamilyMembership(input);
  if (!membership.ok) {
    return {
      ok: false,
      issues: membership.issues.map((item) => ({
        code: "invalid_family_membership",
        path: item.path,
        message: `${item.code}: ${item.message}`,
      })),
    };
  }
  const familyByCapability = new Map(
    membership.memberships.map((item) => [item.capabilityId, item.familyLabel]),
  );
  const definitions = input.capabilityLibrary.capabilities.map(
    ({ id, label }) =>
      Object.freeze({ id, label, family: familyByCapability.get(id)! }),
  );
  return {
    ok: true,
    definitions: Object.freeze(definitions),
    definitionVersion: `career-map-capability-definitions/capability-schema-${input.capabilityLibrary.schemaVersion}/capability-content-${input.capabilityLibrary.contentVersion}/family-schema-${input.familyLibrary.schemaVersion}/family-content-${input.familyLibrary.contentVersion}/adapter-${CANONICAL_CAPABILITY_DEFINITION_ADAPTER_VERSION}`,
  };
}
