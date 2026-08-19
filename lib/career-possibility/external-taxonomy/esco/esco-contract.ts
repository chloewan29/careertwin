export const ESCO_DATASET_CLASSIFICATION = "ESCO" as const;
export const ESCO_DATASET_VERSION = "v1.2.1" as const;
export const ESCO_DATASET_LANGUAGE = "en" as const;

export type EscoOccupation = Readonly<{
  uri: string;
  preferredLabel: string;
  description?: string;
  iscoGroup?: string;
}>;

export type EscoSkill = Readonly<{
  uri: string;
  preferredLabel: string;
  description?: string;
  skillType?: string;
}>;

export type EscoRelationType = "essential" | "optional";

export type EscoOccupationSkillRelation = Readonly<{
  occupationUri: string;
  skillUri: string;
  relationType: EscoRelationType;
}>;

export type EscoDatasetManifest = Readonly<{
  classification: typeof ESCO_DATASET_CLASSIFICATION;
  version: typeof ESCO_DATASET_VERSION;
  language: typeof ESCO_DATASET_LANGUAGE;
  publisher: string;
  source: string;
  sourceAcquisitionType: string;
  importSchemaVersion: string;
  importTimestamp: string;
  occupationCount: number;
  skillCount: number;
  relationCount: number;
  essentialRelationCount: number;
  optionalRelationCount: number;
  compressedByteSizes: Readonly<{
    occupations: number;
    skills: number;
    relations: number;
  }>;
  hashes: Readonly<{
    sourceArchive: string | null;
    occupations: string;
    skills: string;
    relations: string;
  }>;
  attribution: string;
}>;
