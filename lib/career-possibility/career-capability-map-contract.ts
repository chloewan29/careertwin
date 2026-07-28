import type {
  EvidenceProvenanceCategory,
  EvidenceReviewStatus,
} from "./resume-evidence-contract";

export const CAREER_CAPABILITY_MAP_SCHEMA_VERSION = "1.0.0" as const;

export type CareerCapabilityMapMode = "example" | "resume-derived";
export type CareerCapabilityMapAnalysisStatus = "review_required" | "provisional" | "reviewed";
export type PresentationClaimProvenance = EvidenceProvenanceCategory;

export type CareerCapabilityMapSourceMetadata = {
  sourceBundleId?: string;
  sourceSchemaVersion?: string;
  mappingVersion?: string;
  generatedAt?: string;
};

export type CareerCapabilityMapIssueSeverity = "error" | "warning" | "info";
export type CareerCapabilityMapIssue = {
  code: string;
  path: string;
  message: string;
  severity: CareerCapabilityMapIssueSeverity;
};

export type CareerMapFeatureUnavailableReason =
  | "example_only"
  | "review_required"
  | "insufficient_confirmed_evidence"
  | "insufficient_canonical_mappings"
  | "paths_unavailable"
  | "interpretation_unavailable"
  | "unsupported_in_current_mode";

export type CareerMapFeatureState =
  | { available: true; status?: "ready" | "provisional" }
  | { available: false; reason: CareerMapFeatureUnavailableReason; message?: string };

/** Availability is data, so consumers never infer production readiness from a rendered control. */
export type CareerCapabilityMapFeatureAvailability = {
  capabilityNetwork: CareerMapFeatureState;
  evidenceCards: CareerMapFeatureState;
  evidenceDetail: CareerMapFeatureState;
  futureDirections: CareerMapFeatureState;
  roleGapLens: CareerMapFeatureState;
  proofToBuild: CareerMapFeatureState;
  pathComparison: CareerMapFeatureState;
  transferableIdentity: CareerMapFeatureState;
};

export type CareerMapCapabilityEvidenceCoverage = "single_source" | "multi_evidence" | "multi_context";
export type CareerMapCapabilityEvidenceBasis = {
  directEvidenceCount: number;
  transferableEvidenceCount: number;
  distinctEvidenceCount: number;
  distinctEmploymentCount: number;
  sourceSpanCount: number;
  reviewRequiredCount: number;
  coverage?: CareerMapCapabilityEvidenceCoverage;
};

export type CareerMapCapabilityNode = {
  id: string;
  label: string;
  family?: string;
  subCapabilities: Array<{ id: string; label: string }>;
  evidenceBasis: CareerMapCapabilityEvidenceBasis;
  supportingEvidenceIds: string[];
  provenance: PresentationClaimProvenance;
  reviewStatus: EvidenceReviewStatus;
  /** Percentages are retained solely for an explicitly labelled example presentation. */
  exampleStrength?: number;
};

/** Review-required, possible, and unmapped signals remain visible without becoming active truth. */
export type CareerMapCapabilitySignalType =
  | "evidence_backed"
  | "transferable"
  | "review_required"
  | "possible"
  | "unmapped";

export type CareerMapEvidenceDisplayField = {
  text: string;
  provenance: PresentationClaimProvenance;
  reviewStatus: EvidenceReviewStatus;
  sourceSpanIds: string[];
};

export type CareerMapEvidenceOutcome =
  | { status: "stated"; kind: "quantitative" | "qualitative"; field: CareerMapEvidenceDisplayField }
  | { status: "not_stated" }
  | { status: "absent" };

export type CareerMapCapabilitySignal = {
  capabilityId?: string;
  proposedLabel?: string;
  type: CareerMapCapabilitySignalType;
  mappingMethod: "deterministic" | "model" | "user";
  reviewStatus: EvidenceReviewStatus;
  sourceSpanIds: string[];
};

export type CareerMapEvidenceCard = {
  id: string;
  employmentRecordId?: string;
  employer?: CareerMapEvidenceDisplayField;
  roleTitle?: CareerMapEvidenceDisplayField;
  sourceText: string;
  displayText?: CareerMapEvidenceDisplayField;
  action?: CareerMapEvidenceDisplayField;
  context?: CareerMapEvidenceDisplayField;
  outcome: CareerMapEvidenceOutcome;
  capabilitySignals: CareerMapCapabilitySignal[];
  interpretationIds: string[];
  sourceSpanIds: string[];
  active: boolean;
};

export type CareerMapEvidenceInterpretation = {
  id: string;
  evidenceId: string;
  kind: "transferability" | "context_inference" | "outcome_inference";
  text: string;
  provenance: "deterministically_derived" | "model_inferred" | "mock";
  reviewStatus: EvidenceReviewStatus;
  sourceSpanIds: string[];
  active: boolean;
};

export type CareerCapabilityMapReviewSummary = {
  activeEvidenceCount: number;
  inactiveEvidenceCount: number;
  confirmedDirectMappingCount: number;
  confirmedTransferableMappingCount: number;
  reviewRequiredMappingCount: number;
  rejectedMappingCount: number;
  unmappedEvidenceCount: number;
  proposedCapabilityCount: number;
};

export type CareerMapGrowthSuggestion = {
  id: string;
  label: string;
  reason?: string;
  proofToBuild?: string;
  relatedCapabilityIds: string[];
  /** Suggestions must never masquerade as resume facts or personal requirements. */
  provenance: "unverified_suggestion" | "mock";
  priority?: "high" | "medium" | "low";
};

export type CareerMapDirectionStatus = "provisional" | "reviewed";
export type CareerMapFutureDirection = {
  id: string;
  roleFamilyId: string;
  roleFamily: string;
  status: CareerMapDirectionStatus;
  explanation: string;
  evidenceBackedCapabilityIds: string[];
  transferableCapabilityIds: string[];
  missingCapabilityIds: string[];
  supportingEvidenceCount: number;
  supportingEmploymentCount?: number;
  rank?: number;
  category?: "closest_match" | "adjacent" | "stretch";
  qualitativeFitLabel?: string;
  /** Numeric fit is only a mock presentation aid, never calibrated resume-derived quality. */
  exampleFitScore?: number;
  growthAreas: CareerMapGrowthSuggestion[];
};

export type CareerMapInterpretiveSummary = {
  text: string;
  provenance: "deterministically_derived" | "model_inferred" | "mock";
  reviewStatus: EvidenceReviewStatus;
};

/** Directions may be empty: missing resume evidence never proves a person lacks a capability. */
export type CareerCapabilityMapPresentation = {
  schemaVersion: typeof CAREER_CAPABILITY_MAP_SCHEMA_VERSION;
  id: string;
  mode: CareerCapabilityMapMode;
  analysisStatus: CareerCapabilityMapAnalysisStatus;
  source: CareerCapabilityMapSourceMetadata;
  profileSummary?: CareerMapInterpretiveSummary;
  capabilities: CareerMapCapabilityNode[];
  evidenceCards: CareerMapEvidenceCard[];
  interpretations: CareerMapEvidenceInterpretation[];
  futureDirections: CareerMapFutureDirection[];
  reviewSummary: CareerCapabilityMapReviewSummary;
  featureAvailability: CareerCapabilityMapFeatureAvailability;
  issues: CareerCapabilityMapIssue[];
};

export type CareerCapabilityMapValidationResult = {
  valid: boolean;
  issues: CareerCapabilityMapIssue[];
};

const reviewed = (status: EvidenceReviewStatus) => status === "confirmed" || status === "edited";
const nonEmpty = (value: string | undefined) => Boolean(value?.trim());
const truthTypes = new Set<CareerMapCapabilitySignalType>(["evidence_backed", "transferable"]);

export function isFeatureAvailable(feature: CareerMapFeatureState): boolean {
  return feature.available;
}

function hasConfirmedSignal(
  node: CareerMapCapabilityNode,
  evidenceCards: readonly CareerMapEvidenceCard[],
  type: "evidence_backed" | "transferable",
): boolean {
  return evidenceCards.some((card) =>
    card.active &&
    card.capabilitySignals.some((signal) =>
      signal.capabilityId === node.id && signal.type === type && signal.reviewStatus === "confirmed",
    ),
  );
}

export function canDisplayCapabilityAsEvidenceBacked(
  node: CareerMapCapabilityNode,
  evidenceCards: readonly CareerMapEvidenceCard[],
): boolean {
  return node.reviewStatus !== "rejected" && hasConfirmedSignal(node, evidenceCards, "evidence_backed");
}

export function canDisplayCapabilityAsTransferable(
  node: CareerMapCapabilityNode,
  evidenceCards: readonly CareerMapEvidenceCard[],
): boolean {
  return node.reviewStatus !== "rejected" && hasConfirmedSignal(node, evidenceCards, "transferable");
}

export function validateCareerCapabilityMapPresentation(
  presentation: CareerCapabilityMapPresentation,
): CareerCapabilityMapValidationResult {
  const issues: CareerCapabilityMapIssue[] = [];
  const add = (code: string, path: string, message: string, severity: CareerCapabilityMapIssueSeverity = "error") => {
    issues.push({ code, path, message, severity });
  };
  const checkUnique = <T extends { id: string }>(items: readonly T[], path: string) => {
    const ids = new Set<string>();
    items.forEach((item, index) => {
      if (!nonEmpty(item.id)) add("empty_id", `${path}[${index}].id`, "ID must be non-empty.");
      else if (ids.has(item.id)) add("duplicate_id", `${path}[${index}].id`, `Duplicate ID ${item.id}.`);
      ids.add(item.id);
    });
    return ids;
  };
  const checkStrings = (values: readonly string[], path: string, required = false) => {
    if (required && values.length === 0) add("missing_reference", path, "At least one reference is required.");
    values.forEach((value, index) => {
      if (!nonEmpty(value)) add("empty_reference", `${path}[${index}]`, "Reference IDs must be non-empty.");
    });
    if (new Set(values).size !== values.length) add("duplicate_reference", path, "Reference IDs must be unique.");
  };
  const checkCount = (value: number, path: string) => {
    if (!Number.isInteger(value) || value < 0) add("invalid_count", path, "Count must be a non-negative integer.");
  };
  const checkProvenance = (provenance: PresentationClaimProvenance, path: string) => {
    if (presentation.mode === "resume-derived" && provenance === "mock") add("mock_provenance", path, "Mock provenance is forbidden in resume-derived mode.");
  };
  const checkField = (field: CareerMapEvidenceDisplayField | undefined, path: string) => {
    if (!field) return;
    if (!nonEmpty(field.text)) add("empty_text", `${path}.text`, "Display text must be non-empty.");
    checkProvenance(field.provenance, `${path}.provenance`);
    checkStrings(field.sourceSpanIds, `${path}.sourceSpanIds`, field.provenance !== "mock");
    if (field.reviewStatus === "rejected") add("rejected_display_field", `${path}.reviewStatus`, "Rejected fields cannot be displayed as active facts.");
  };

  if (presentation.schemaVersion !== CAREER_CAPABILITY_MAP_SCHEMA_VERSION) add("schema_version", "schemaVersion", "Unsupported schema version.");
  if (!nonEmpty(presentation.id)) add("empty_presentation_id", "id", "Presentation ID must be non-empty.");
  if (presentation.mode === "resume-derived") {
    if (!nonEmpty(presentation.source.sourceBundleId)) add("missing_source_bundle", "source.sourceBundleId", "Resume-derived mode requires a source bundle ID.");
    if (!nonEmpty(presentation.source.sourceSchemaVersion)) add("missing_source_schema", "source.sourceSchemaVersion", "Resume-derived mode requires a source schema version.");
  }
  if (presentation.mode === "example" && (presentation.source.sourceBundleId || presentation.source.sourceSchemaVersion)) {
    add("example_resume_source", "source", "Example mode must not claim resume source identity.");
  }

  const capabilityIds = checkUnique(presentation.capabilities, "capabilities");
  const evidenceIds = checkUnique(presentation.evidenceCards, "evidenceCards");
  const interpretationIds = checkUnique(presentation.interpretations, "interpretations");
  checkUnique(presentation.futureDirections, "futureDirections");

  presentation.capabilities.forEach((node, index) => {
    const path = `capabilities[${index}]`;
    if (!nonEmpty(node.label)) add("empty_label", `${path}.label`, "Capability label must be non-empty.");
    checkProvenance(node.provenance, `${path}.provenance`);
    if (node.reviewStatus === "rejected") add("rejected_active_node", `${path}.reviewStatus`, "Rejected capability nodes cannot be active.");
    if (presentation.mode === "resume-derived" && node.exampleStrength !== undefined) add("resume_example_strength", `${path}.exampleStrength`, "Resume-derived capabilities cannot carry example strength.");
    if (node.exampleStrength !== undefined && (!Number.isFinite(node.exampleStrength) || node.exampleStrength < 0 || node.exampleStrength > 100)) add("invalid_example_strength", `${path}.exampleStrength`, "Example strength must be between 0 and 100.");
    checkStrings(node.supportingEvidenceIds, `${path}.supportingEvidenceIds`);
    node.supportingEvidenceIds.forEach((id, refIndex) => {
      if (!evidenceIds.has(id)) add("unknown_evidence", `${path}.supportingEvidenceIds[${refIndex}]`, `Unknown evidence ${id}.`);
    });
    node.subCapabilities.forEach((sub, subIndex) => {
      if (!nonEmpty(sub.id) || !nonEmpty(sub.label)) add("invalid_sub_capability", `${path}.subCapabilities[${subIndex}]`, "Sub-capability ID and label must be non-empty.");
    });
    const basis = node.evidenceBasis;
    Object.entries(basis).forEach(([key, value]) => { if (key !== "coverage") checkCount(value as number, `${path}.evidenceBasis.${key}`); });
    if (basis.distinctEvidenceCount > node.supportingEvidenceIds.length) add("evidence_count_mismatch", `${path}.evidenceBasis.distinctEvidenceCount`, "Distinct evidence count cannot exceed supporting evidence IDs.");
    if (basis.directEvidenceCount + basis.transferableEvidenceCount > basis.distinctEvidenceCount) add("signal_count_mismatch", `${path}.evidenceBasis`, "Direct and transferable counts cannot exceed distinct active evidence.");
    if (basis.distinctEvidenceCount === 0 && (basis.directEvidenceCount > 0 || basis.transferableEvidenceCount > 0)) add("empty_evidence_truth", `${path}.evidenceBasis`, "An empty evidence basis cannot carry active truth counts.");
    if (basis.directEvidenceCount > 0 && !canDisplayCapabilityAsEvidenceBacked(node, presentation.evidenceCards)) add("missing_direct_signal", path, "Direct evidence count requires an active confirmed direct signal.");
    if (basis.transferableEvidenceCount > 0 && !canDisplayCapabilityAsTransferable(node, presentation.evidenceCards)) add("missing_transferable_signal", path, "Transferable evidence count requires an active confirmed transferable signal.");
    if (basis.distinctEvidenceCount > 0 && !reviewed(node.reviewStatus)) add("unreviewed_active_node", `${path}.reviewStatus`, "Active evidence nodes must have a reviewed status.");
  });

  presentation.evidenceCards.forEach((card, index) => {
    const path = `evidenceCards[${index}]`;
    if (!nonEmpty(card.sourceText)) add("empty_source_text", `${path}.sourceText`, "Source text must be non-empty.");
    checkStrings(card.sourceSpanIds, `${path}.sourceSpanIds`, true);
    checkField(card.employer, `${path}.employer`); checkField(card.roleTitle, `${path}.roleTitle`);
    checkField(card.displayText, `${path}.displayText`); checkField(card.action, `${path}.action`); checkField(card.context, `${path}.context`);
    if (card.outcome.status === "stated") checkField(card.outcome.field, `${path}.outcome.field`);
    card.interpretationIds.forEach((id, refIndex) => {
      if (!interpretationIds.has(id)) add("unknown_interpretation", `${path}.interpretationIds[${refIndex}]`, `Unknown interpretation ${id}.`);
    });
    card.capabilitySignals.forEach((signal, signalIndex) => {
      const signalPath = `${path}.capabilitySignals[${signalIndex}]`;
      const hasCapability = nonEmpty(signal.capabilityId), hasProposal = nonEmpty(signal.proposedLabel);
      if (hasCapability === hasProposal) add("signal_target", signalPath, "Exactly one canonical capability ID or proposed label is required.");
      if (signal.capabilityId && !capabilityIds.has(signal.capabilityId)) add("unknown_capability", `${signalPath}.capabilityId`, `Unknown capability ${signal.capabilityId}.`);
      checkStrings(signal.sourceSpanIds, `${signalPath}.sourceSpanIds`, true);
      if (signal.reviewStatus === "unreviewed" && truthTypes.has(signal.type)) add("unreviewed_active_truth", `${signalPath}.type`, "Unreviewed signals cannot be evidence-backed or transferable.");
      if (truthTypes.has(signal.type) && signal.reviewStatus !== "confirmed") add("unconfirmed_active_truth", `${signalPath}.reviewStatus`, "Active truth signals require confirmed review.");
      if (signal.proposedLabel && truthTypes.has(signal.type)) add("proposed_active_truth", `${signalPath}.type`, "Proposed labels cannot be evidence-backed or transferable.");
      if (signal.reviewStatus === "rejected" && truthTypes.has(signal.type)) add("rejected_active_truth", `${signalPath}.type`, "Rejected signals cannot be active truth.");
      if (signal.type === "review_required" && signal.reviewStatus !== "unreviewed") add("review_state_mismatch", `${signalPath}.reviewStatus`, "Review-required signals must remain unreviewed.");
    });
    if (card.active && card.capabilitySignals.some((signal) => signal.reviewStatus === "rejected")) add("active_rejected_evidence", `${path}.active`, "Evidence with rejected mappings cannot be active.");
  });

  presentation.interpretations.forEach((interpretation, index) => {
    const path = `interpretations[${index}]`;
    if (!evidenceIds.has(interpretation.evidenceId)) add("unknown_evidence", `${path}.evidenceId`, `Unknown evidence ${interpretation.evidenceId}.`);
    if (!nonEmpty(interpretation.text)) add("empty_interpretation", `${path}.text`, "Interpretation text must be non-empty.");
    if (presentation.mode === "resume-derived" && interpretation.provenance === "mock") add("mock_provenance", `${path}.provenance`, "Mock provenance is forbidden in resume-derived mode.");
    checkStrings(interpretation.sourceSpanIds, `${path}.sourceSpanIds`, true);
    if (interpretation.active && interpretation.reviewStatus === "rejected") add("active_rejected_interpretation", `${path}.active`, "Rejected interpretations cannot be active.");
  });

  presentation.futureDirections.forEach((direction, index) => {
    const path = `futureDirections[${index}]`;
    if (!nonEmpty(direction.roleFamilyId) || !nonEmpty(direction.roleFamily) || !nonEmpty(direction.explanation)) add("invalid_direction_text", path, "Direction family and explanation must be non-empty.");
    checkCount(direction.supportingEvidenceCount, `${path}.supportingEvidenceCount`);
    if (direction.supportingEmploymentCount !== undefined) checkCount(direction.supportingEmploymentCount, `${path}.supportingEmploymentCount`);
    if (presentation.mode === "resume-derived" && direction.exampleFitScore !== undefined) add("resume_example_fit", `${path}.exampleFitScore`, "Resume-derived directions cannot carry example fit scores.");
    if (direction.exampleFitScore !== undefined && (!Number.isFinite(direction.exampleFitScore) || direction.exampleFitScore < 0 || direction.exampleFitScore > 100)) add("invalid_example_fit", `${path}.exampleFitScore`, "Example fit score must be between 0 and 100.");
    if (direction.rank !== undefined && (!Number.isInteger(direction.rank) || direction.rank < 1)) add("invalid_rank", `${path}.rank`, "Direction rank must be a positive integer.");
    if (direction.status === "reviewed" && (direction.qualitativeFitLabel || direction.rank) && presentation.analysisStatus !== "reviewed") add("reviewed_direction_state", path, "Reviewed ordering or fit labels require reviewed analysis.");
    (["evidenceBackedCapabilityIds", "transferableCapabilityIds", "missingCapabilityIds"] as const).forEach((key) => {
      checkStrings(direction[key], `${path}.${key}`);
      direction[key].forEach((id, refIndex) => { if (!capabilityIds.has(id)) add("unknown_capability", `${path}.${key}[${refIndex}]`, `Unknown capability ${id}.`); });
    });
    direction.evidenceBackedCapabilityIds.forEach((id) => {
      const node = presentation.capabilities.find((item) => item.id === id);
      if (node && !canDisplayCapabilityAsEvidenceBacked(node, presentation.evidenceCards)) add("direction_unbacked_capability", `${path}.evidenceBackedCapabilityIds`, `Capability ${id} lacks confirmed direct evidence.`);
    });
    direction.transferableCapabilityIds.forEach((id) => {
      const node = presentation.capabilities.find((item) => item.id === id);
      if (node && !canDisplayCapabilityAsTransferable(node, presentation.evidenceCards)) add("direction_unbacked_transfer", `${path}.transferableCapabilityIds`, `Capability ${id} lacks confirmed transferable evidence.`);
    });
    direction.growthAreas.forEach((growth, growthIndex) => {
      const growthPath = `${path}.growthAreas[${growthIndex}]`;
      if (!nonEmpty(growth.id) || !nonEmpty(growth.label)) add("invalid_growth_suggestion", growthPath, "Growth suggestion ID and label must be non-empty.");
      if (presentation.mode === "resume-derived" && growth.provenance === "mock") add("mock_provenance", `${growthPath}.provenance`, "Mock suggestions are forbidden in resume-derived mode.");
      growth.relatedCapabilityIds.forEach((id, refIndex) => { if (!capabilityIds.has(id)) add("unknown_capability", `${growthPath}.relatedCapabilityIds[${refIndex}]`, `Unknown capability ${id}.`); });
    });
  });

  Object.entries(presentation.reviewSummary).forEach(([key, value]) => checkCount(value, `reviewSummary.${key}`));
  if (presentation.profileSummary) {
    if (!nonEmpty(presentation.profileSummary.text)) add("empty_summary", "profileSummary.text", "Profile summary must be non-empty.");
    if (presentation.mode === "resume-derived" && presentation.profileSummary.provenance === "mock") add("mock_provenance", "profileSummary.provenance", "Mock provenance is forbidden in resume-derived mode.");
  }

  const features = presentation.featureAvailability;
  if (features.futureDirections.available && presentation.futureDirections.length === 0) add("directions_missing", "featureAvailability.futureDirections", "Future Directions require at least one direction.");
  if (features.roleGapLens.available && !features.futureDirections.available) add("role_gap_dependency", "featureAvailability.roleGapLens", "Role Gap Lens requires Future Directions.");
  if (features.pathComparison.available && (!features.futureDirections.available || presentation.futureDirections.length < 2)) add("path_comparison_dependency", "featureAvailability.pathComparison", "Path Comparison requires at least two available directions.");
  const eligibleInterpretation = presentation.interpretations.some((item) => item.active && item.kind === "transferability" && reviewed(item.reviewStatus));
  if (features.transferableIdentity.available && !eligibleInterpretation) add("identity_interpretation_dependency", "featureAvailability.transferableIdentity", "Transferable Identity requires an active reviewed transferability interpretation.");
  if (presentation.mode === "resume-derived" && features.evidenceDetail.available && features.evidenceDetail.status !== "provisional") {
    const missingProvenance = presentation.evidenceCards.some((card) => card.sourceSpanIds.length === 0);
    if (missingProvenance) add("evidence_detail_provenance", "featureAvailability.evidenceDetail", "Evidence Detail without complete provenance must remain provisional or unavailable.");
  }

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}
