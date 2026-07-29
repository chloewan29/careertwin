import type { CanonicalCapabilityLibrary } from "./canonical-capability-library";
import type { CanonicalCapabilityGovernanceLibrary, CanonicalCapabilityGovernanceReason } from "./canonical-capability-governance-decisions";
import {
  reconcileRoleCapabilityProfilesWithCanonicalLibrary,
  type RoleCapabilityRequirementReference,
  type RoleCapabilityRegistryCoverage,
  type RoleCapabilityRegistryReconciliationIssue,
} from "./role-capability-registry-reconciliation";
import type { CapabilityImportance, RoleCapabilityProfile } from "./role-capability-library";

export const CANONICAL_CAPABILITY_CANDIDATE_REPORT_GENERATOR_VERSION = "1.0.0" as const;

export type CandidateObservedStatus =
  | "single_label_single_domain"
  | "single_label_cross_domain"
  | "multiple_labels_single_domain"
  | "multiple_labels_cross_domain";

export type CanonicalCapabilityCandidate = {
  readonly capabilityId: string;
  /** Observed review material only; this is not an admitted canonical label. */
  readonly candidateLabel?: string;
  readonly observedLabels: readonly string[];
  readonly observedDomains: readonly string[];
  readonly referencedProfileIds: readonly string[];
  readonly referenceCount: number;
  readonly importanceValues: readonly CapabilityImportance[];
  readonly occurrencePaths: readonly string[];
  readonly crossDomain: boolean;
  readonly status: CandidateObservedStatus;
};

export type CanonicalCapabilityCandidateReportCounts = {
  readonly sourceProfileCount: number;
  readonly sourceRequirementReferenceCount: number;
  readonly sourceUniqueCapabilityIdCount: number;
  readonly alreadyAdmittedUniqueIdCount: number;
  readonly candidateUniqueIdCount: number;
  readonly candidateReferenceCount: number;
  readonly completeCoverage: boolean;
  readonly reviewedDeferredUniqueIdCount: number;
  readonly reviewedExcludedUniqueIdCount: number;
  readonly governanceComplete: boolean;
};

export type ReviewedCanonicalCapabilityOutcome = {
  readonly capabilityId: string;
  readonly reason: CanonicalCapabilityGovernanceReason;
  readonly referenceCount: number;
};

export type CanonicalCapabilityCandidateReportIssueCode =
  | "invalid_reconciliation_result"
  | "unsupported_reconciliation_issue"
  | "malformed_unknown_capability_reference"
  | "candidate_label_shared_across_ids";

export type CanonicalCapabilityCandidateReportIssue = {
  readonly code: CanonicalCapabilityCandidateReportIssueCode;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
  readonly label?: string;
  readonly capabilityIds?: readonly string[];
  readonly sourceIssueCode?: RoleCapabilityRegistryReconciliationIssue["code"];
  readonly sourcePath?: string;
};

export type CanonicalCapabilityCandidateReportResult =
  | {
      readonly ok: true;
      readonly reportVersion: string;
      readonly counts: CanonicalCapabilityCandidateReportCounts;
      readonly candidates: readonly CanonicalCapabilityCandidate[];
      readonly warnings: readonly CanonicalCapabilityCandidateReportIssue[];
      readonly reviewedDeferred: readonly ReviewedCanonicalCapabilityOutcome[];
      readonly reviewedExcluded: readonly ReviewedCanonicalCapabilityOutcome[];
    }
  | {
      readonly ok: false;
      readonly reportVersion: string;
      readonly issues: readonly CanonicalCapabilityCandidateReportIssue[];
    };

export type BuildCanonicalCapabilityCandidateReportInput = {
  readonly profiles: readonly RoleCapabilityProfile[];
  readonly canonicalLibrary: CanonicalCapabilityLibrary;
  readonly governanceLibrary?: CanonicalCapabilityGovernanceLibrary;
};

const compareText = (left: string, right: string) => left.localeCompare(right, "en");
const importanceOrder: readonly CapabilityImportance[] = ["must", "should", "differentiator"];
const unresolvedReportVersion = `role-capability-candidates/unresolved/generator-${CANONICAL_CAPABILITY_CANDIDATE_REPORT_GENERATOR_VERSION}`;

function issue(
  code: CanonicalCapabilityCandidateReportIssueCode,
  severity: "error" | "warning",
  path: string,
  message: string,
  details: Pick<CanonicalCapabilityCandidateReportIssue, "label" | "capabilityIds" | "sourceIssueCode" | "sourcePath"> = {},
): CanonicalCapabilityCandidateReportIssue {
  return { code, severity, path, message, ...details };
}

function buildReportVersion(input: BuildCanonicalCapabilityCandidateReportInput) {
  return [
    "role-capability-candidates",
    `registry-schema-${input.canonicalLibrary.schemaVersion}`,
    `registry-content-${input.canonicalLibrary.contentVersion}`,
    `profile-schema-${input.profiles[0].version}`,
    `generator-${CANONICAL_CAPABILITY_CANDIDATE_REPORT_GENERATOR_VERSION}`,
  ].join("/");
}

function countsFromCoverage(coverage: RoleCapabilityRegistryCoverage): CanonicalCapabilityCandidateReportCounts {
  return {
    sourceProfileCount: coverage.sourceProfileCount,
    sourceRequirementReferenceCount: coverage.sourceRequirementReferenceCount,
    sourceUniqueCapabilityIdCount: coverage.uniqueRequirementIdCount,
    alreadyAdmittedUniqueIdCount: coverage.matchedUniqueRequirementIdCount,
    candidateUniqueIdCount: coverage.unknownUniqueRequirementIdCount,
    candidateReferenceCount: coverage.unknownRequirementReferenceCount,
    completeCoverage: coverage.complete,
    reviewedDeferredUniqueIdCount: coverage.deferredUniqueRequirementIdCount,
    reviewedExcludedUniqueIdCount: coverage.excludedUniqueRequirementIdCount,
    governanceComplete: coverage.governanceComplete,
  };
}

function validReference(reference: RoleCapabilityRequirementReference, capabilityId: string) {
  return reference.capabilityId === capabilityId
    && reference.profileId.length > 0
    && reference.profileDomain.length > 0
    && reference.contextualLabel.length > 0
    && reference.path.length > 0
    && importanceOrder.includes(reference.importance);
}

function observedStatus(labelCount: number, domainCount: number): CandidateObservedStatus {
  if (labelCount === 1) return domainCount === 1 ? "single_label_single_domain" : "single_label_cross_domain";
  return domainCount === 1 ? "multiple_labels_single_domain" : "multiple_labels_cross_domain";
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort(compareText);
}

function candidateFromReferences(
  capabilityId: string,
  references: readonly RoleCapabilityRequirementReference[],
): CanonicalCapabilityCandidate {
  const observedLabels = uniqueSorted(references.map((reference) => reference.contextualLabel));
  const observedDomains = uniqueSorted(references.map((reference) => reference.profileDomain));
  const referencedProfileIds = uniqueSorted(references.map((reference) => reference.profileId));
  const occurrencePaths = uniqueSorted(references.map((reference) => reference.path));
  const seenImportance = new Set(references.map((reference) => reference.importance));
  const importanceValues = importanceOrder.filter((value) => seenImportance.has(value));
  return {
    capabilityId,
    ...(observedLabels.length === 1 ? { candidateLabel: observedLabels[0] } : {}),
    observedLabels,
    observedDomains,
    referencedProfileIds,
    referenceCount: references.length,
    importanceValues,
    occurrencePaths,
    crossDomain: observedDomains.length > 1,
    status: observedStatus(observedLabels.length, observedDomains.length),
  };
}

function sharedLabelWarnings(candidates: readonly CanonicalCapabilityCandidate[]) {
  const idsByLabel = new Map<string, string[]>();
  candidates.forEach((candidate) => candidate.observedLabels.forEach((label) => {
    idsByLabel.set(label, [...(idsByLabel.get(label) ?? []), candidate.capabilityId]);
  }));
  return [...idsByLabel.entries()]
    .map(([label, capabilityIds]) => [label, uniqueSorted(capabilityIds)] as const)
    .filter(([, capabilityIds]) => capabilityIds.length > 1)
    .sort(([left], [right]) => compareText(left, right))
    .map(([label, capabilityIds]) => issue(
      "candidate_label_shared_across_ids",
      "warning",
      `candidateLabels:${label}`,
      `Observed candidate label ${label} is shared by ${capabilityIds.length} unresolved capability IDs.`,
      { label, capabilityIds },
    ));
}

/** Builds noncanonical review material from structured reconciliation diagnostics. */
export function buildCanonicalCapabilityCandidateReport(
  input: BuildCanonicalCapabilityCandidateReportInput,
): CanonicalCapabilityCandidateReportResult {
  const reconciliation = reconcileRoleCapabilityProfilesWithCanonicalLibrary({
    profiles: input.profiles,
    canonicalLibrary: input.canonicalLibrary,
    governanceLibrary: input.governanceLibrary,
  });

  const reviewedOutcomes = (references: typeof reconciliation.deferredReferences) => {
    const byId = new Map<string, { reason: CanonicalCapabilityGovernanceReason; count: number }>();
    references.forEach((reference) => byId.set(reference.capabilityId, {
      reason: reference.reason,
      count: (byId.get(reference.capabilityId)?.count ?? 0) + 1,
    }));
    return [...byId.entries()].sort(([left], [right]) => compareText(left, right)).map(([capabilityId, value]) => ({ capabilityId, reason: value.reason, referenceCount: value.count }));
  };
  const reviewedDeferred = reviewedOutcomes(reconciliation.deferredReferences);
  const reviewedExcluded = reviewedOutcomes(reconciliation.excludedReferences);

  if (!reconciliation.ok) {
    const unsupported = reconciliation.issues.filter((item) => item.code !== "unknown_canonical_capability");
    if (unsupported.length > 0) {
      return {
        ok: false,
        reportVersion: unresolvedReportVersion,
        issues: unsupported.map((item) => issue(
          "unsupported_reconciliation_issue",
          "error",
          `reconciliation:${item.path}`,
          `Candidate report generation cannot consume reconciliation issue ${item.code}.`,
          { sourceIssueCode: item.code, sourcePath: item.path },
        )),
      };
    }
  }

  const reportVersion = buildReportVersion(input);
  const counts = countsFromCoverage(reconciliation.coverage);
  if (reconciliation.ok) {
    if (!counts.completeCoverage || counts.candidateUniqueIdCount !== 0 || counts.candidateReferenceCount !== 0) {
      return {
        ok: false,
        reportVersion,
        issues: [issue("invalid_reconciliation_result", "error", "reconciliation.coverage", "Complete reconciliation returned inconsistent candidate coverage.")],
      };
    }
    return { ok: true, reportVersion, counts, candidates: [], reviewedDeferred, reviewedExcluded, warnings: [] };
  }

  const referencesById = new Map<string, RoleCapabilityRequirementReference[]>();
  for (const sourceIssue of reconciliation.issues) {
    const capabilityId = sourceIssue.capabilityId;
    const references = sourceIssue.references;
    if (!capabilityId || !references || references.length === 0 || references.some((reference) => !validReference(reference, capabilityId))) {
      return {
        ok: false,
        reportVersion,
        issues: [issue(
          "malformed_unknown_capability_reference",
          "error",
          `reconciliation:${sourceIssue.path}`,
          "Unknown canonical capability issue lacks trustworthy structured references.",
          { sourceIssueCode: sourceIssue.code, sourcePath: sourceIssue.path },
        )],
      };
    }
    referencesById.set(capabilityId, [...(referencesById.get(capabilityId) ?? []), ...references]);
  }

  const candidates = [...referencesById.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([capabilityId, references]) => candidateFromReferences(capabilityId, references));
  const candidateReferenceCount = candidates.reduce((total, candidate) => total + candidate.referenceCount, 0);
  const arithmeticValid = candidates.length === counts.candidateUniqueIdCount
    && candidateReferenceCount === counts.candidateReferenceCount
    && counts.alreadyAdmittedUniqueIdCount + counts.candidateUniqueIdCount + counts.reviewedDeferredUniqueIdCount + counts.reviewedExcludedUniqueIdCount === counts.sourceUniqueCapabilityIdCount
    && reconciliation.coverage.matchedRequirementReferenceCount + counts.candidateReferenceCount + reconciliation.coverage.deferredRequirementReferenceCount + reconciliation.coverage.excludedRequirementReferenceCount === counts.sourceRequirementReferenceCount;
  if (!arithmeticValid || counts.completeCoverage) {
    return {
      ok: false,
      reportVersion,
      issues: [issue("invalid_reconciliation_result", "error", "reconciliation.coverage", "Candidate aggregates do not match authoritative reconciliation coverage.")],
    };
  }
  return { ok: true, reportVersion, counts, candidates, reviewedDeferred, reviewedExcluded, warnings: sharedLabelWarnings(candidates) };
}
