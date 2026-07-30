import type {
  AlignmentSection,
  GenericCareerPathAlignmentResult,
  MatchedAlignmentCapability,
  SectionAlignment,
} from "./generic-career-path-alignment";

export const PERSONAL_GENERIC_PATH_PRESENTATION_SCHEMA_VERSION = "1.0.0" as const;

export type PersonalGenericPathEvidence = {
  readonly candidateCapabilityId: string;
  readonly canonicalCapabilityId: string;
  readonly canonicalLabel: string;
  readonly canonicalFamily: string;
  readonly evidenceSignalId: string;
  readonly evidencePieceId: string;
  readonly text: string;
  readonly ownership: string | null;
  readonly scope: string | null;
  readonly impact: string | null;
};

export type PersonalGenericPathSection = {
  readonly totalCapabilities: number;
  readonly evidencedCapabilities: number;
  readonly evidenceSignalCount: number;
  readonly evidence: readonly PersonalGenericPathEvidence[];
};

export type PersonalGenericPathCard = {
  readonly roleId: string;
  readonly title: string;
  readonly primaryMandate: string;
  readonly primaryOwnership: readonly string[];
  readonly directionOrder: number;
  readonly calibrated: true;
  readonly summary: string;
  readonly identityDefining: PersonalGenericPathSection;
  readonly coreEnablers: PersonalGenericPathSection;
  readonly supporting: PersonalGenericPathSection;
  readonly differentiators: PersonalGenericPathSection;
  readonly missingEvidenceCapabilities: readonly {
    readonly canonicalCapabilityId: string;
    readonly canonicalLabel: string;
    readonly section: AlignmentSection;
    readonly wording: "Evidence not represented in the current candidate baseline";
  }[];
};

export type PersonalGenericPathPresentation = {
  readonly schemaVersion: typeof PERSONAL_GENERIC_PATH_PRESENTATION_SCHEMA_VERSION;
  readonly paths: readonly PersonalGenericPathCard[];
  readonly unresolvedCapabilities: readonly {
    readonly candidateCapabilityId: string;
    readonly displayName: string;
    readonly reason: "No explicit admitted canonical identity mapping";
  }[];
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

function presentEvidence(capability: MatchedAlignmentCapability): PersonalGenericPathEvidence[] {
  return capability.supportingEvidence.map((evidence) => ({
    candidateCapabilityId: capability.candidateCapabilityId,
    canonicalCapabilityId: capability.canonicalCapabilityId,
    canonicalLabel: capability.canonicalLabel,
    canonicalFamily: capability.canonicalFamily,
    evidenceSignalId: evidence.evidenceSignalId,
    evidencePieceId: evidence.evidencePieceId,
    text: evidence.text,
    ownership: evidence.ownership,
    scope: evidence.scope,
    impact: evidence.impact,
  }));
}

function presentSection(
  summary: SectionAlignment,
  section: AlignmentSection,
  matchedCapabilities: readonly MatchedAlignmentCapability[],
): PersonalGenericPathSection {
  return {
    totalCapabilities: summary.totalCapabilities,
    evidencedCapabilities: summary.evidencedCapabilities,
    evidenceSignalCount: summary.evidenceSignalCount,
    evidence: matchedCapabilities.filter((capability) => capability.section === section).flatMap(presentEvidence),
  };
}

export function buildPersonalGenericPathPresentation(
  alignment: GenericCareerPathAlignmentResult,
): PersonalGenericPathPresentation {
  if (alignment.schemaVersion !== "1.0.0" || alignment.modelVersion !== "1.0.0") {
    throw new Error("Unsupported generic Career Path alignment version.");
  }

  return deepFreeze({
    schemaVersion: PERSONAL_GENERIC_PATH_PRESENTATION_SCHEMA_VERSION,
    paths: alignment.roles.map((role, index) => ({
      roleId: role.roleId,
      title: role.title,
      primaryMandate: role.primaryMandate,
      primaryOwnership: [...role.primaryOwnership],
      directionOrder: index + 1,
      calibrated: role.calibrated,
      summary: role.explanation,
      identityDefining: presentSection(role.identityDefining, "identity_defining", role.matchedCapabilities),
      coreEnablers: presentSection(role.coreEnablers, "core_enabler", role.matchedCapabilities),
      supporting: presentSection(role.supporting, "supporting", role.matchedCapabilities),
      differentiators: presentSection(role.differentiators, "differentiator", role.matchedCapabilities),
      missingEvidenceCapabilities: role.missingEvidenceCapabilities.map((capability) => ({ ...capability })),
    })),
    unresolvedCapabilities: alignment.unresolvedCandidateCapabilities.map((capability) => ({
      candidateCapabilityId: capability.candidateCapabilityId,
      displayName: capability.displayName,
      reason: capability.reason,
    })),
  });
}
