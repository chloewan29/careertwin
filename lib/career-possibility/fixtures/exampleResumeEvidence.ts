import {
  RESUME_EVIDENCE_SCHEMA_VERSION,
  validateResumeEvidenceBundle,
  type ProvenancedField,
  type ResumeEvidenceBundle,
} from "../resume-evidence-contract";

const sourced = <T>(value: T, sourceSpanIds: string[]): ProvenancedField<T> => ({
  value,
  provenance: "user_provided",
  sourceSpanIds,
  method: "manual",
  reviewStatus: "confirmed",
});

const normalised = <T>(value: T, sourceSpanIds: string[]): ProvenancedField<T> => ({
  value,
  provenance: "normalised",
  sourceSpanIds,
  method: "deterministic",
  methodVersion: "example-normaliser/1",
  reviewStatus: "confirmed",
});

/** Fictional reviewed paste fixture; no person or employer is real. */
export const exampleResumeEvidence: ResumeEvidenceBundle = {
  schemaVersion: RESUME_EVIDENCE_SCHEMA_VERSION,
  id: "example-resume-evidence-bundle",
  sourceDocuments: [{ id: "document-1", sourceType: "resume_paste", mediaType: "text/plain" }],
  sourceSpans: [
    { id: "span-1", documentId: "document-1", sourceType: "resume_paste", section: "Experience", employmentRecordId: "employment-1", bulletIndex: 0, startOffset: 0, endOffset: 87, originalText: "Northstar Co — Operations Analyst\nReduced weekly reporting time by 30% through automation." },
    { id: "span-2", documentId: "document-1", sourceType: "resume_paste", section: "Experience", employmentRecordId: "employment-1", bulletIndex: 1, startOffset: 88, endOffset: 166, originalText: "Coordinated sales and service teams to introduce a shared planning cadence." },
    { id: "span-3", documentId: "document-1", sourceType: "resume_paste", section: "Experience", employmentRecordId: "employment-2", bulletIndex: 0, startOffset: 167, endOffset: 257, originalText: "Harbour Studio — Insights Coordinator\nBuilt a reusable customer feedback taxonomy." },
    { id: "span-4", documentId: "document-1", sourceType: "resume_paste", section: "Experience", employmentRecordId: "employment-2", bulletIndex: 1, startOffset: 258, endOffset: 326, originalText: "Prepared internal notes about a legacy archive migration." },
  ],
  employmentRecords: [
    { id: "employment-1", employerName: sourced("Northstar Co", ["span-1"]), roleTitle: sourced("Operations Analyst", ["span-1"]), sourceSpanIds: ["span-1", "span-2"], reviewStatus: "confirmed", warnings: [] },
    { id: "employment-2", employerName: sourced("Harbour Studio", ["span-3"]), roleTitle: sourced("Insights Coordinator", ["span-3"]), sourceSpanIds: ["span-3", "span-4"], reviewStatus: "edited", warnings: ["Dates were not stated in the pasted résumé."] },
  ],
  evidenceRecords: [
    { id: "evidence-1", employmentRecordId: "employment-1", sourceSpanIds: ["span-1"], sourceText: "Reduced weekly reporting time by 30% through automation.", displayText: normalised("Automated weekly reporting and reduced cycle time by 30%.", ["span-1"]), action: sourced("Automated weekly reporting", ["span-1"]), outcome: sourced({ text: "Reduced weekly reporting time by 30%.", kind: "quantitative" }, ["span-1"]), reviewStatus: "confirmed", processingStatus: "normalised", extractionMethod: "deterministic", warnings: [] },
    { id: "evidence-2", employmentRecordId: "employment-1", sourceSpanIds: ["span-2"], sourceText: "Coordinated sales and service teams to introduce a shared planning cadence.", action: sourced("Coordinated sales and service teams", ["span-2"]), context: sourced("Introduced a shared planning cadence", ["span-2"]), outcome: sourced({ text: "Introduced a shared planning cadence.", kind: "qualitative" }, ["span-2"]), reviewStatus: "confirmed", processingStatus: "source_provided", extractionMethod: "manual", warnings: [] },
    { id: "evidence-3", employmentRecordId: "employment-2", sourceSpanIds: ["span-3"], sourceText: "Built a reusable customer feedback taxonomy.", action: sourced("Built a reusable customer feedback taxonomy", ["span-3"]), outcome: normalised({ text: "", kind: "not_stated" }, ["span-3"]), reviewStatus: "confirmed", processingStatus: "normalised", extractionMethod: "deterministic", warnings: ["No outcome was stated in the source text."] },
    { id: "evidence-4", employmentRecordId: "employment-2", sourceSpanIds: ["span-4"], sourceText: "Prepared internal notes about a legacy archive migration.", reviewStatus: "rejected", processingStatus: "unsupported", extractionMethod: "manual", warnings: ["Retained for audit, but not mapped to a capability."] },
  ],
  capabilityMappings: [
    { id: "mapping-1", evidenceId: "evidence-1", capabilityId: "automation", relationship: "direct_evidence", method: "deterministic", rationale: "The source explicitly describes automation.", sourceSpanIds: ["span-1"], reviewStatus: "confirmed" },
    { id: "mapping-2", evidenceId: "evidence-2", capabilityId: "stakeholder-coordination", relationship: "transferable_signal", method: "user", sourceSpanIds: ["span-2"], reviewStatus: "confirmed" },
    { id: "mapping-3", evidenceId: "evidence-3", capabilityId: "customer-insight", relationship: "transferable_signal", method: "model", rationale: "A feedback taxonomy may support insight synthesis.", sourceSpanIds: ["span-3"], reviewStatus: "unreviewed", modelMetadata: { provider: "example-provider", model: "example-model", runId: "fixture-run-1" } },
    { id: "mapping-4", evidenceId: "evidence-2", capabilityId: "people-leadership", relationship: "possible", method: "model", sourceSpanIds: ["span-2"], reviewStatus: "rejected", modelMetadata: { runId: "fixture-run-1" } },
    { id: "mapping-5", evidenceId: "evidence-3", proposedLabel: "Feedback taxonomy design", relationship: "possible", method: "model", sourceSpanIds: ["span-3"], reviewStatus: "unreviewed", alternatives: [{ capabilityId: "customer-insight" }], modelMetadata: { runId: "fixture-run-1" } },
  ],
  interpretations: [
    { id: "interpretation-1", evidenceId: "evidence-2", kind: "transferability", text: "The coordination example may transfer to cross-functional operating work.", provenance: "model_inferred", sourceSpanIds: ["span-2"], reviewStatus: "unreviewed", method: "model", methodVersion: "example-model/1" },
  ],
};

export const exampleResumeEvidenceValidation = validateResumeEvidenceBundle(exampleResumeEvidence);
