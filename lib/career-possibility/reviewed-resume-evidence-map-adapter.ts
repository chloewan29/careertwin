import {
  validateResumeEvidenceBundle,
  type EvidenceCapabilityMapping,
  type EvidenceReviewStatus,
  type ProvenancedField,
  type ResumeEvidenceBundle,
  type ResumeEvidenceRecord,
} from "./resume-evidence-contract";
import {
  CAREER_CAPABILITY_MAP_SCHEMA_VERSION,
  validateCareerCapabilityMapPresentation,
  type CareerCapabilityMapIssue,
  type CareerCapabilityMapPresentation,
  type CareerMapCapabilityNode,
  type CareerMapCapabilitySignal,
  type CareerMapEvidenceCard,
  type CareerMapEvidenceDisplayField,
  type CareerMapEvidenceInterpretation,
} from "./career-capability-map-contract";

export const REVIEWED_RESUME_EVIDENCE_MAP_ADAPTER_VERSION = "1.0.0" as const;

export type CareerMapCapabilityDefinition = {
  id: string;
  label: string;
  family?: string;
  subCapabilities?: ReadonlyArray<{ id: string; label: string }>;
};

export type ReviewedEvidenceInclusionPolicy = {
  allowConfirmedModelMappings: boolean;
  includeReviewRequiredSignals: boolean;
  includeInactiveEvidence: boolean;
  includeInactiveMappings: boolean;
  includeReviewedInterpretations: boolean;
};

export const DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY = {
  allowConfirmedModelMappings: false,
  includeReviewRequiredSignals: true,
  includeInactiveEvidence: true,
  includeInactiveMappings: true,
  includeReviewedInterpretations: true,
} as const satisfies ReviewedEvidenceInclusionPolicy;

export type AdaptReviewedResumeEvidenceInput = {
  bundle: ResumeEvidenceBundle;
  capabilityDefinitions: readonly CareerMapCapabilityDefinition[];
  policy?: ReviewedEvidenceInclusionPolicy;
  generatedAt?: string;
};

export type AdaptReviewedResumeEvidenceResult =
  | { ok: true; presentation: CareerCapabilityMapPresentation }
  | { ok: false; issues: CareerCapabilityMapIssue[] };

const reviewed = (status: EvidenceReviewStatus) => status === "confirmed" || status === "edited";
const nonEmpty = (value: string | undefined) => Boolean(value?.trim());
const unique = <T>(values: readonly T[]) => [...new Set(values)];

function issue(code: string, path: string, message: string, severity: CareerCapabilityMapIssue["severity"]): CareerCapabilityMapIssue {
  return { code, path, message, severity };
}

function displayField<T>(field: ProvenancedField<T> | undefined, text: string | undefined): CareerMapEvidenceDisplayField | undefined {
  if (!field || text === undefined) return undefined;
  return { text, provenance: field.provenance, reviewStatus: field.reviewStatus, sourceSpanIds: [...field.sourceSpanIds] };
}

function activeEvidence(record: ResumeEvidenceRecord) {
  return reviewed(record.reviewStatus) && record.processingStatus !== "unsupported";
}

function targetKey(mapping: EvidenceCapabilityMapping) {
  return mapping.capabilityId ? `capability:${mapping.capabilityId}` : `proposed:${mapping.proposedLabel ?? ""}`;
}

function mappingRank(mapping: EvidenceCapabilityMapping, evidenceIsActive: boolean, policy: ReviewedEvidenceInclusionPolicy) {
  const permitted = mapping.method !== "model" || policy.allowConfirmedModelMappings;
  const eligible = reviewed(mapping.reviewStatus) && evidenceIsActive && permitted;
  if (eligible && mapping.relationship === "direct_evidence") return 0;
  if (eligible && mapping.relationship === "transferable_signal") return 1;
  if (mapping.reviewStatus === "unreviewed" && mapping.relationship === "direct_evidence") return 2;
  if (mapping.reviewStatus === "unreviewed" && mapping.relationship === "transferable_signal") return 3;
  if (mapping.relationship === "possible" && mapping.reviewStatus !== "rejected") return 4;
  return 5;
}

function signalFor(
  mapping: EvidenceCapabilityMapping,
  evidenceIsActive: boolean,
  policy: ReviewedEvidenceInclusionPolicy,
): CareerMapCapabilitySignal | undefined {
  const modelExcluded = mapping.method === "model" && reviewed(mapping.reviewStatus) && !policy.allowConfirmedModelMappings;
  const mayActivate = evidenceIsActive && reviewed(mapping.reviewStatus) && !modelExcluded;
  let type: CareerMapCapabilitySignal["type"];
  let active = false;
  if (mapping.proposedLabel) type = "unmapped";
  else if (mapping.relationship === "possible") type = "possible";
  else if (mapping.reviewStatus === "unreviewed") type = "review_required";
  else {
    type = mapping.relationship === "direct_evidence" ? "evidence_backed" : "transferable";
    active = mayActivate && mapping.reviewStatus !== "rejected";
  }
  if (mapping.reviewStatus === "rejected" && !policy.includeInactiveMappings) return undefined;
  if (type === "review_required" && !policy.includeReviewRequiredSignals) return undefined;
  if (!active && type !== "review_required" && mapping.reviewStatus !== "rejected" && modelExcluded && !policy.includeInactiveMappings) return undefined;
  return {
    ...(mapping.capabilityId ? { capabilityId: mapping.capabilityId } : {}),
    ...(mapping.proposedLabel ? { proposedLabel: mapping.proposedLabel } : {}),
    type,
    mappingMethod: mapping.method,
    reviewStatus: mapping.reviewStatus,
    active,
    sourceSpanIds: [...mapping.sourceSpanIds],
  };
}

export function adaptReviewedResumeEvidenceToCareerMap(
  input: AdaptReviewedResumeEvidenceInput,
): AdaptReviewedResumeEvidenceResult {
  const sourceValidation = validateResumeEvidenceBundle(input.bundle);
  const structuralIssues: CareerCapabilityMapIssue[] = sourceValidation.issues.map((item) => issue(
    "invalid_source_bundle",
    item.path,
    `${item.code}: ${item.message}`,
    item.severity,
  ));
  const definitionIds = new Set<string>();
  input.capabilityDefinitions.forEach((definition, index) => {
    if (!nonEmpty(definition.id) || !nonEmpty(definition.label)) structuralIssues.push(issue("invalid_capability_definition", `capabilityDefinitions[${index}]`, "Capability ID and label must be non-empty.", "error"));
    if (definitionIds.has(definition.id)) structuralIssues.push(issue("duplicate_capability_definition", `capabilityDefinitions[${index}].id`, `Duplicate capability definition ${definition.id}.`, "error"));
    definitionIds.add(definition.id);
    const subIds = new Set<string>();
    (definition.subCapabilities ?? []).forEach((sub, subIndex) => {
      if (!nonEmpty(sub.id) || !nonEmpty(sub.label) || subIds.has(sub.id)) structuralIssues.push(issue("invalid_capability_definition", `capabilityDefinitions[${index}].subCapabilities[${subIndex}]`, "Sub-capability IDs and labels must be non-empty and unique.", "error"));
      subIds.add(sub.id);
    });
  });
  input.bundle.capabilityMappings.forEach((mapping, index) => {
    if (mapping.capabilityId && mapping.reviewStatus !== "rejected" && !definitionIds.has(mapping.capabilityId)) structuralIssues.push(issue("unknown_capability", `bundle.capabilityMappings[${index}].capabilityId`, `Unknown capability ${mapping.capabilityId}.`, "error"));
  });
  if (structuralIssues.some((item) => item.severity === "error")) return { ok: false, issues: structuralIssues };

  const policy: ReviewedEvidenceInclusionPolicy = input.policy ?? { ...DEFAULT_REVIEWED_EVIDENCE_INCLUSION_POLICY };
  const issues = [...structuralIssues];
  const employmentById = new Map(input.bundle.employmentRecords.map((record) => [record.id, record]));
  const evidenceById = new Map(input.bundle.evidenceRecords.map((record) => [record.id, record]));
  const mappingsByEvidence = new Map<string, EvidenceCapabilityMapping[]>();
  input.bundle.capabilityMappings.forEach((mapping) => {
    const list = mappingsByEvidence.get(mapping.evidenceId) ?? [];
    list.push(mapping);
    mappingsByEvidence.set(mapping.evidenceId, list);
  });

  type EffectiveMapping = { mapping: EvidenceCapabilityMapping; signal?: CareerMapCapabilitySignal };
  const effectiveByEvidence = new Map<string, EffectiveMapping[]>();
  input.bundle.evidenceRecords.forEach((record, evidenceIndex) => {
    const sourceMappings = mappingsByEvidence.get(record.id) ?? [];
    const groups = new Map<string, EvidenceCapabilityMapping[]>();
    sourceMappings.forEach((mapping) => {
      const key = targetKey(mapping);
      const list = groups.get(key) ?? [];
      list.push(mapping);
      groups.set(key, list);
    });
    const effective: EffectiveMapping[] = [];
    groups.forEach((group) => {
      const sorted = group.map((mapping, index) => ({ mapping, index })).sort((a, b) => mappingRank(a.mapping, activeEvidence(record), policy) - mappingRank(b.mapping, activeEvidence(record), policy) || a.index - b.index);
      const selected = sorted[0].mapping;
      if (group.length > 1) {
        const relationships = new Set(group.map((mapping) => mapping.relationship));
        issues.push(issue(relationships.size > 1 ? "conflicting_mapping_relationship" : "duplicate_mapping", `bundle.capabilityMappings`, `${relationships.size > 1 ? "Conflicting" : "Duplicate"} mappings for ${record.id}/${targetKey(selected)} were resolved deterministically.`, "warning"));
      }
      effective.push({ mapping: selected, signal: signalFor(selected, activeEvidence(record), policy) });
      if (policy.includeInactiveMappings) {
        sorted.slice(1).filter(({ mapping }) => mapping.reviewStatus === "rejected").forEach(({ mapping }) => effective.push({ mapping, signal: signalFor(mapping, activeEvidence(record), policy) }));
      }
    });
    effectiveByEvidence.set(record.id, effective);
    if (record.processingStatus === "unsupported") issues.push(issue("unsupported_evidence_inactive", `bundle.evidenceRecords[${evidenceIndex}]`, "Unsupported evidence remains inactive.", "info"));
    if (!record.outcome) issues.push(issue("outcome_absent", `bundle.evidenceRecords[${evidenceIndex}].outcome`, "Outcome is absent from the source evidence.", "info"));
    else if (record.outcome.value.kind === "not_stated") issues.push(issue("outcome_not_stated", `bundle.evidenceRecords[${evidenceIndex}].outcome`, "Outcome was not stated in the source evidence.", "info"));
    record.warnings.forEach((warning, warningIndex) => issues.push(issue("source_warning", `bundle.evidenceRecords[${evidenceIndex}].warnings[${warningIndex}]`, warning, "info")));
  });

  input.bundle.capabilityMappings.forEach((mapping, mappingIndex) => {
    if (mapping.reviewStatus === "unreviewed" && mapping.relationship !== "possible") issues.push(issue("unreviewed_mapping_inactive", `bundle.capabilityMappings[${mappingIndex}]`, "Unreviewed mapping remains inactive.", "info"));
    if (mapping.reviewStatus === "rejected") issues.push(issue("rejected_mapping_inactive", `bundle.capabilityMappings[${mappingIndex}]`, "Rejected mapping remains inactive and auditable in the source bundle.", "info"));
    if (mapping.proposedLabel && mapping.reviewStatus !== "rejected") issues.push(issue("proposed_capability_unmapped", `bundle.capabilityMappings[${mappingIndex}].proposedLabel`, `Proposed capability ${mapping.proposedLabel} remains unmapped.`, "info"));
    if (mapping.method === "model" && reviewed(mapping.reviewStatus) && !policy.allowConfirmedModelMappings) issues.push(issue("confirmed_model_mapping_excluded_by_policy", `bundle.capabilityMappings[${mappingIndex}]`, "Reviewed model-origin mapping was excluded from active truth by policy.", "warning"));
  });

  const candidateCapabilityIds = new Set<string>();
  effectiveByEvidence.forEach((items) => items.forEach(({ signal }) => {
    if (signal?.capabilityId && definitionIds.has(signal.capabilityId)) candidateCapabilityIds.add(signal.capabilityId);
  }));

  const emittedInterpretations: CareerMapEvidenceInterpretation[] = policy.includeReviewedInterpretations
    ? (input.bundle.interpretations ?? []).map((item) => ({
        id: item.id,
        evidenceId: item.evidenceId,
        kind: item.kind,
        text: item.text,
        provenance: item.provenance,
        reviewStatus: item.reviewStatus,
        sourceSpanIds: [...item.sourceSpanIds],
        active: reviewed(item.reviewStatus) && activeEvidence(evidenceById.get(item.evidenceId)!),
      }))
    : [];
  const interpretationIds = new Set(emittedInterpretations.map((item) => item.id));

  const evidenceCards: CareerMapEvidenceCard[] = [];
  input.bundle.evidenceRecords.forEach((record, evidenceIndex) => {
    const isActive = activeEvidence(record);
    if (!isActive && !policy.includeInactiveEvidence) return;
    const employment = record.employmentRecordId ? employmentById.get(record.employmentRecordId) : undefined;
    if (employment && !employment.employerName) issues.push(issue("missing_employer", `bundle.evidenceRecords[${evidenceIndex}].employmentRecordId`, "Employer is not stated.", "info"));
    if (employment && !employment.roleTitle) issues.push(issue("missing_role_title", `bundle.evidenceRecords[${evidenceIndex}].employmentRecordId`, "Role title is not stated.", "info"));
    const signals = (effectiveByEvidence.get(record.id) ?? []).map((item) => item.signal).filter((item): item is CareerMapCapabilitySignal => Boolean(item)).filter((signal) => !signal.capabilityId || candidateCapabilityIds.has(signal.capabilityId));
    const outcome = !record.outcome
      ? { status: "absent" as const }
      : record.outcome.value.kind === "not_stated"
        ? { status: "not_stated" as const }
        : { status: "stated" as const, kind: record.outcome.value.kind, field: displayField(record.outcome, record.outcome.value.text)! };
    const employer = displayField(employment?.employerName, employment?.employerName?.value);
    const roleTitle = displayField(employment?.roleTitle, employment?.roleTitle?.value);
    const displayText = displayField(record.displayText, record.displayText?.value);
    const action = displayField(record.action, record.action?.value);
    const context = displayField(record.context, record.context?.value);
    evidenceCards.push({
      id: record.id,
      ...(record.employmentRecordId ? { employmentRecordId: record.employmentRecordId } : {}),
      ...(employer ? { employer } : {}),
      ...(roleTitle ? { roleTitle } : {}),
      sourceText: record.sourceText,
      ...(displayText ? { displayText } : {}),
      ...(action ? { action } : {}),
      ...(context ? { context } : {}),
      outcome,
      capabilitySignals: signals,
      interpretationIds: (input.bundle.interpretations ?? []).filter((item) => item.evidenceId === record.id && interpretationIds.has(item.id)).map((item) => item.id),
      sourceSpanIds: [...record.sourceSpanIds],
      active: isActive,
    });
  });

  const capabilities: CareerMapCapabilityNode[] = input.capabilityDefinitions.filter((definition) => candidateCapabilityIds.has(definition.id)).map((definition) => {
    const cards = evidenceCards.filter((card) => card.capabilitySignals.some((signal) => signal.capabilityId === definition.id));
    const directIds = unique(cards.filter((card) => card.capabilitySignals.some((signal) => signal.capabilityId === definition.id && signal.active && signal.type === "evidence_backed")).map((card) => card.id));
    const transferableIds = unique(cards.filter((card) => !directIds.includes(card.id) && card.capabilitySignals.some((signal) => signal.capabilityId === definition.id && signal.active && signal.type === "transferable")).map((card) => card.id));
    const supportingEvidenceIds = [...directIds, ...transferableIds];
    const supportingCards = supportingEvidenceIds.map((id) => evidenceCards.find((card) => card.id === id)!);
    const employmentIds = unique(supportingCards.map((card) => card.employmentRecordId).filter((id): id is string => Boolean(id)));
    const spanIds = unique(supportingCards.flatMap((card) => [
      ...card.sourceSpanIds,
      ...card.capabilitySignals.filter((signal) => signal.capabilityId === definition.id && signal.active).flatMap((signal) => signal.sourceSpanIds),
    ]));
    const reviewRequiredCount = cards.flatMap((card) => card.capabilitySignals).filter((signal) => signal.capabilityId === definition.id && signal.type === "review_required").length;
    const activeSignals = supportingCards.flatMap((card) => card.capabilitySignals.filter((signal) => signal.capabilityId === definition.id && signal.active));
    const edited = activeSignals.some((signal) => signal.reviewStatus === "edited") || supportingCards.some((card) => evidenceById.get(card.id)?.reviewStatus === "edited");
    const coverage = supportingEvidenceIds.length === 1 ? "single_source" as const : employmentIds.length >= 2 ? "multi_context" as const : supportingEvidenceIds.length >= 2 ? "multi_evidence" as const : undefined;
    return {
      id: definition.id,
      label: definition.label,
      ...(definition.family ? { family: definition.family } : {}),
      subCapabilities: (definition.subCapabilities ?? []).map((item) => ({ ...item })),
      evidenceBasis: {
        directEvidenceCount: directIds.length,
        transferableEvidenceCount: transferableIds.length,
        distinctEvidenceCount: supportingEvidenceIds.length,
        distinctEmploymentCount: employmentIds.length,
        sourceSpanCount: spanIds.length,
        reviewRequiredCount,
        ...(coverage ? { coverage } : {}),
      },
      supportingEvidenceIds,
      provenance: "deterministically_derived" as const,
      reviewStatus: supportingEvidenceIds.length === 0 ? "unreviewed" as const : edited ? "edited" as const : "confirmed" as const,
    };
  });

  const activeCanonicalByEvidence = new Set(evidenceCards.filter((card) => card.capabilitySignals.some((signal) => signal.active && Boolean(signal.capabilityId))).map((card) => card.id));
  evidenceCards.filter((card) => card.active && !activeCanonicalByEvidence.has(card.id)).forEach((card) => issues.push(issue("evidence_without_active_mapping", `evidenceCards.${card.id}`, "Evidence has no active canonical mapping.", "info")));
  const confirmedDirectMappingCount = capabilities.reduce((sum, item) => sum + item.evidenceBasis.directEvidenceCount, 0);
  const confirmedTransferableMappingCount = capabilities.reduce((sum, item) => sum + item.evidenceBasis.transferableEvidenceCount, 0);
  if (capabilities.every((item) => item.evidenceBasis.distinctEvidenceCount === 0)) issues.push(issue("no_active_capabilities", "capabilities", "No active canonical capabilities were produced.", "warning"));
  if (confirmedDirectMappingCount === 0) issues.push(issue("no_confirmed_direct_mappings", "reviewSummary.confirmedDirectMappingCount", "No reviewed direct mappings were active.", "info"));
  if (confirmedTransferableMappingCount === 0) issues.push(issue("no_confirmed_transferable_mappings", "reviewSummary.confirmedTransferableMappingCount", "No reviewed transferable mappings were active.", "info"));
  issues.push(issue("directions_not_generated", "futureDirections", "Future Directions are not generated by this adapter.", "info"));

  const hasReviewRequirement = input.bundle.evidenceRecords.some((record) => record.reviewStatus === "unreviewed") || input.bundle.capabilityMappings.some((mapping) => (mapping.reviewStatus === "unreviewed" && mapping.relationship !== "possible") || (mapping.proposedLabel && mapping.reviewStatus !== "rejected") || (mapping.method === "model" && reviewed(mapping.reviewStatus) && !policy.allowConfirmedModelMappings));
  const source = {
    sourceBundleId: input.bundle.id,
    sourceSchemaVersion: input.bundle.schemaVersion,
    mappingVersion: REVIEWED_RESUME_EVIDENCE_MAP_ADAPTER_VERSION,
    ...(input.generatedAt ? { generatedAt: input.generatedAt } : {}),
  };
  const presentation: CareerCapabilityMapPresentation = {
    schemaVersion: CAREER_CAPABILITY_MAP_SCHEMA_VERSION,
    id: `career-map:${input.bundle.id}:${REVIEWED_RESUME_EVIDENCE_MAP_ADAPTER_VERSION}`,
    mode: "resume-derived",
    analysisStatus: hasReviewRequirement ? "review_required" : "provisional",
    source,
    capabilities,
    evidenceCards,
    interpretations: emittedInterpretations,
    futureDirections: [],
    reviewSummary: {
      activeEvidenceCount: input.bundle.evidenceRecords.filter(activeEvidence).length,
      inactiveEvidenceCount: input.bundle.evidenceRecords.filter((record) => !activeEvidence(record)).length,
      confirmedDirectMappingCount,
      confirmedTransferableMappingCount,
      reviewRequiredMappingCount: capabilities.reduce((sum, item) => sum + item.evidenceBasis.reviewRequiredCount, 0),
      rejectedMappingCount: input.bundle.capabilityMappings.filter((mapping) => mapping.reviewStatus === "rejected").length,
      unmappedEvidenceCount: input.bundle.evidenceRecords.filter((record) => activeEvidence(record) && record.processingStatus !== "unsupported" && !activeCanonicalByEvidence.has(record.id)).length,
      proposedCapabilityCount: new Set(input.bundle.capabilityMappings.filter((mapping) => mapping.proposedLabel && mapping.reviewStatus !== "rejected").map((mapping) => mapping.proposedLabel)).size,
    },
    featureAvailability: {
      capabilityNetwork: capabilities.length > 0 ? { available: true, status: "provisional" } : { available: false, reason: "insufficient_canonical_mappings" },
      evidenceCards: evidenceCards.length > 0 ? { available: true, status: "provisional" } : { available: false, reason: "insufficient_confirmed_evidence" },
      evidenceDetail: evidenceCards.length > 0 && evidenceCards.every((card) => card.sourceSpanIds.length > 0) ? { available: true, status: "provisional" } : { available: false, reason: "review_required" },
      futureDirections: { available: false, reason: "paths_unavailable" },
      roleGapLens: { available: false, reason: "paths_unavailable" },
      proofToBuild: { available: false, reason: "paths_unavailable" },
      pathComparison: { available: false, reason: "paths_unavailable" },
      transferableIdentity: { available: false, reason: "unsupported_in_current_mode" },
    },
    issues,
  };
  const targetValidation = validateCareerCapabilityMapPresentation(presentation);
  if (!targetValidation.valid) return { ok: false, issues: [...issues, ...targetValidation.issues] };
  return { ok: true, presentation };
}
