export type EscoHierarchyNode = Readonly<{
  uri: string;
  preferredLabel: string;
  code?: string;
  description?: string;
}>;

export type EscoBroaderRelation = Readonly<{
  conceptUri: string;
  broaderUri: string;
}>;

export type EscoSkillSkillRelation = Readonly<{
  conceptUri: string;
  relatedUri: string;
  relationType: string;
}>;

export type EvidenceBackedEscoSkill = Readonly<{
  skillUri: string;
  evidenceIds: readonly string[];
}>;

export type EscoRoleSemanticProfile = Readonly<{
  occupationUri: string;
  preferredLabel: string;
  essentialSkillUris: readonly string[];
  optionalSkillUris: readonly string[];
}>;
