import { type CapabilityImportance, type RoleEvidenceProofType, type MinimumProofLevel } from "../role-capability-library";

export const GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION = "1.0.0" as const;
export const GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION = "1.1.0" as const;

export type ArchetypeCapability = {
  readonly capabilityId: string;
  readonly label: string;
  readonly canonicalFamily: string;
  readonly importance: CapabilityImportance;
  readonly expectedEvidence: string;
  readonly minimumProofLevel: MinimumProofLevel;
};

export type ArchetypeEvidenceExpectation = {
  readonly id: string;
  readonly capabilityId: string;
  readonly proofType: RoleEvidenceProofType;
  readonly description: string;
};

export type GenericRoleArchetype = {
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly roleFamilyId: string;
  readonly canonicalTitle: string;
  readonly aliases: readonly string[];
  readonly searchTitles: readonly string[];
  readonly domain: string;
  readonly primaryMandate: string;
  readonly primaryOwnership: readonly string[];
  readonly identityDefiningCapabilities: readonly ArchetypeCapability[];
  readonly coreEnablers: readonly ArchetypeCapability[];
  readonly supportingCapabilities: readonly ArchetypeCapability[];
  readonly differentiators: readonly ArchetypeCapability[];
  readonly evidenceExpectations: readonly ArchetypeEvidenceExpectation[];
};

export type GenericRoleArchetypeIssue = {
  readonly code: string;
  readonly path: string;
  readonly message: string;
};

export type GenericRoleArchetypeValidation =
  | { readonly ok: true; readonly archetypes: readonly GenericRoleArchetype[] }
  | { readonly ok: false; readonly issues: readonly GenericRoleArchetypeIssue[] };

export const freezeRole = (value: Omit<GenericRoleArchetype, "schemaVersion" | "contentVersion">): GenericRoleArchetype =>
  Object.freeze({
    schemaVersion: GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION,
    contentVersion: GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION,
    ...value,
    aliases: Object.freeze([...value.aliases]),
    searchTitles: Object.freeze([...value.searchTitles]),
    primaryOwnership: Object.freeze([...value.primaryOwnership]),
    identityDefiningCapabilities: Object.freeze([...value.identityDefiningCapabilities]),
    coreEnablers: Object.freeze([...value.coreEnablers]),
    supportingCapabilities: Object.freeze([...value.supportingCapabilities]),
    differentiators: Object.freeze([...value.differentiators]),
    evidenceExpectations: Object.freeze([...value.evidenceExpectations]),
  });
