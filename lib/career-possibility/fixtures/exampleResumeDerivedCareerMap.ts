import {
  CAREER_CAPABILITY_MAP_SCHEMA_VERSION,
  type CareerCapabilityMapPresentation,
  validateCareerCapabilityMapPresentation,
} from "../career-capability-map-contract";

const sourceField = (text: string, sourceSpanIds: string[]) => ({
  text,
  provenance: "user_provided" as const,
  reviewStatus: "confirmed" as const,
  sourceSpanIds,
});

export const exampleResumeDerivedCareerMap: CareerCapabilityMapPresentation = {
  schemaVersion: CAREER_CAPABILITY_MAP_SCHEMA_VERSION,
  id: "career-map-fictional-resume-001",
  mode: "resume-derived",
  analysisStatus: "review_required",
  source: {
    sourceBundleId: "resume-evidence-fictional-001",
    sourceSchemaVersion: "1.0.0",
    mappingVersion: "example-mapping-policy-1",
  },
  capabilities: [
    {
      id: "cap-stakeholder-alignment",
      label: "Stakeholder alignment",
      family: "Collaboration",
      subCapabilities: [{ id: "sub-facilitation", label: "Facilitation" }],
      evidenceBasis: { directEvidenceCount: 1, transferableEvidenceCount: 0, distinctEvidenceCount: 1, distinctEmploymentCount: 1, sourceSpanCount: 1, reviewRequiredCount: 0, coverage: "single_source" },
      supportingEvidenceIds: ["evidence-workshop"],
      provenance: "deterministically_derived",
      reviewStatus: "confirmed",
    },
    {
      id: "cap-clear-communication",
      label: "Clear communication",
      family: "Communication",
      subCapabilities: [{ id: "sub-executive-briefing", label: "Executive briefing" }],
      evidenceBasis: { directEvidenceCount: 0, transferableEvidenceCount: 1, distinctEvidenceCount: 1, distinctEmploymentCount: 1, sourceSpanCount: 1, reviewRequiredCount: 1, coverage: "single_source" },
      supportingEvidenceIds: ["evidence-briefing"],
      provenance: "model_inferred",
      reviewStatus: "edited",
    },
  ],
  evidenceCards: [
    {
      id: "evidence-workshop",
      employmentRecordId: "employment-cooperative",
      employer: sourceField("Harbour Community Cooperative", ["span-workshop"]),
      roleTitle: sourceField("Operations Coordinator", ["span-workshop"]),
      sourceText: "Facilitated a planning workshop for six service teams and documented the agreed delivery sequence.",
      action: sourceField("Facilitated a planning workshop and documented the agreed delivery sequence.", ["span-workshop"]),
      outcome: { status: "stated", kind: "qualitative", field: sourceField("Six service teams agreed a shared delivery sequence.", ["span-workshop"]) },
      capabilitySignals: [{ capabilityId: "cap-stakeholder-alignment", type: "evidence_backed", mappingMethod: "deterministic", reviewStatus: "confirmed", active: true, sourceSpanIds: ["span-workshop"] }],
      interpretationIds: [],
      sourceSpanIds: ["span-workshop"],
      active: true,
    },
    {
      id: "evidence-briefing",
      employmentRecordId: "employment-cooperative",
      employer: sourceField("Harbour Community Cooperative", ["span-briefing"]),
      roleTitle: sourceField("Operations Coordinator", ["span-briefing"]),
      sourceText: "Prepared weekly briefing notes that translated delivery risks for non-technical committee members.",
      displayText: { text: "Prepared weekly briefing notes explaining delivery risks to non-technical committee members.", provenance: "normalised", reviewStatus: "confirmed", sourceSpanIds: ["span-briefing"] },
      outcome: { status: "not_stated" },
      capabilitySignals: [
        { capabilityId: "cap-clear-communication", type: "transferable", mappingMethod: "user", reviewStatus: "edited", active: true, sourceSpanIds: ["span-briefing"] },
        { proposedLabel: "Strategic forecasting", type: "possible", mappingMethod: "model", reviewStatus: "rejected", active: false, sourceSpanIds: ["span-briefing"] },
      ],
      interpretationIds: ["interpretation-briefing-transfer"],
      sourceSpanIds: ["span-briefing"],
      active: true,
    },
    {
      id: "evidence-triage",
      sourceText: "Reviewed incoming requests and grouped them for the weekly planning meeting.",
      outcome: { status: "absent" },
      capabilitySignals: [
        { capabilityId: "cap-stakeholder-alignment", type: "review_required", mappingMethod: "model", reviewStatus: "unreviewed", active: false, sourceSpanIds: ["span-triage"] },
        { proposedLabel: "Request triage", type: "unmapped", mappingMethod: "model", reviewStatus: "unreviewed", active: false, sourceSpanIds: ["span-triage"] },
      ],
      interpretationIds: [],
      sourceSpanIds: ["span-triage"],
      active: true,
    },
    {
      id: "evidence-rejected-draft",
      sourceText: "Drafted a possible claim that the reviewer rejected as unsupported.",
      outcome: { status: "absent" },
      capabilitySignals: [],
      interpretationIds: [],
      sourceSpanIds: ["span-rejected"],
      active: false,
    },
  ],
  interpretations: [
    {
      id: "interpretation-briefing-transfer",
      evidenceId: "evidence-briefing",
      kind: "transferability",
      text: "This communication pattern may transfer to other cross-functional settings.",
      provenance: "model_inferred",
      reviewStatus: "unreviewed",
      sourceSpanIds: ["span-briefing"],
      active: true,
    },
  ],
  futureDirections: [],
  reviewSummary: {
    activeEvidenceCount: 3,
    inactiveEvidenceCount: 1,
    confirmedDirectMappingCount: 1,
    confirmedTransferableMappingCount: 1,
    reviewRequiredMappingCount: 1,
    rejectedMappingCount: 1,
    unmappedEvidenceCount: 1,
    proposedCapabilityCount: 2,
  },
  featureAvailability: {
    capabilityNetwork: { available: true, status: "provisional" },
    evidenceCards: { available: true, status: "provisional" },
    evidenceDetail: { available: true, status: "provisional" },
    futureDirections: { available: false, reason: "paths_unavailable", message: "No production-safe direction policy has been applied." },
    roleGapLens: { available: false, reason: "paths_unavailable" },
    proofToBuild: { available: false, reason: "paths_unavailable" },
    pathComparison: { available: false, reason: "paths_unavailable" },
    transferableIdentity: { available: false, reason: "review_required", message: "The transferability interpretation still requires review." },
  },
  issues: [
    { code: "outcome_not_stated", path: "evidenceCards[1].outcome", message: "Outcome not stated in the source evidence.", severity: "info" },
    { code: "mapping_review_required", path: "evidenceCards[2].capabilitySignals[0]", message: "A proposed mapping remains excluded from active capability truth until review.", severity: "warning" },
  ],
};

export const exampleResumeDerivedCareerMapValidation =
  validateCareerCapabilityMapPresentation(exampleResumeDerivedCareerMap);
