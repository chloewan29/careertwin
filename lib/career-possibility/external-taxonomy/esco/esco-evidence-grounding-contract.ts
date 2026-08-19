export type EscoEvidenceGroundingMapping = {
  skillUri: string;
  confidence: "high" | "medium" | "low";
  groundingBasis: "direct" | "strong_semantic_support";
  rationale?: string;
};

export type EscoEvidenceGrounding = {
  evidenceId: string;
  mappings: EscoEvidenceGroundingMapping[];
  unresolved?: boolean;
};

export type EvidenceBackedEscoSkill = {
  skillUri: string;
  evidenceIds: string[];
};

export type EscoCandidateRetrievalResult = {
  skillUri: string;
  preferredLabel: string;
  description?: string;
};

export type EscoEvidenceGroundingRequest = {
  eligibleEvidence: { evidenceId: string; evidenceText: string }[];
  candidateSkills: EscoCandidateRetrievalResult[];
};

export type EscoEvidenceGroundingResponse = {
  contractVersion: string;
  results: EscoEvidenceGrounding[];
};

export interface EscoEvidenceGroundingProvider {
  groundEvidence(request: EscoEvidenceGroundingRequest): Promise<EscoEvidenceGroundingResponse>;
}
