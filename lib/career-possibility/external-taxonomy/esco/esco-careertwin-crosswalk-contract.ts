export type EscoCrosswalkClassification =
  | "direct_transferable_fit"
  | "multi_capability_fit"
  | "task_specific_no_map"
  | "tool_specific_no_map"
  | "domain_knowledge_no_map"
  | "credential_or_compliance_knowledge_no_map"
  | "ontology_gap"
  | "ambiguous";

export type EscoCrosswalkConfidence = "high" | "medium" | "low";

export type EscoCareerTwinCrosswalkDecision = Readonly<{
  escoSkillUri: string;
  classification: EscoCrosswalkClassification;
  capabilityIds: readonly string[]; // CareerTwin canonical capability IDs
  confidence: EscoCrosswalkConfidence;
  rationaleCode?: string;
}>;

export type EscoCrosswalkManifest = Readonly<{
  sourceClassification: string;
  escoVersion: string;
  careerTwinCapabilityContractVersion: string;
  careerTwinCapabilityCount: number;
  generationMethodVersion: string;
  providerIdentifier: string;
  generationDate: string;
  decisionCount: number;
  classificationDistribution: Record<EscoCrosswalkClassification, number>;
  contentSha256: string;
  sourceEscoSkillSnapshotSha256: string;
  attribution: string;
}>;
