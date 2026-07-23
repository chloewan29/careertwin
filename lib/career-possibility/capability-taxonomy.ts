export const CAREER_TAXONOMY_VERSION = "career-taxonomy/1.0.0" as const;

export const UNIVERSAL_CAPABILITY_FAMILIES = [
  "Analytical Thinking",
  "Communication & Storytelling",
  "Stakeholder Influence",
  "Execution & Delivery",
  "Leadership & Coaching",
  "Strategy & Prioritisation",
  "Customer / User Understanding",
  "Commercial Thinking",
  "Process & Operations",
  "Technology / Systems",
  "Risk / Governance",
  "Creativity / Content",
  "Research / Learning",
] as const;

export const CAREER_DOMAINS = [
  "Analytics / Data",
  "HR / People",
  "Finance",
  "Sales",
  "Marketing",
  "Product",
  "Engineering",
  "Operations",
  "Customer Success",
  "Project / Program",
  "Education",
  "Healthcare",
  "Legal",
  "General Management",
  "Founder / Small Business",
] as const;

export type UniversalCapabilityFamily = (typeof UNIVERSAL_CAPABILITY_FAMILIES)[number];
export type CareerDomain = (typeof CAREER_DOMAINS)[number];
export type TransferabilityLevel = "domain_specific" | "cross_domain" | "universal";

export type CapabilityConfidenceRules = {
  minimumDistinctEvidence: number;
  preferredEvidenceSignals: string[];
  downgradeWhen: string[];
  notes?: string;
};

export type CapabilityDefinition = {
  id: string;
  label: string;
  universalFamily: UniversalCapabilityFamily;
  domain: CareerDomain;
  description: string;
  exampleSignals: string[];
  exampleEvidencePatterns: string[];
  relatedRoleFamilies: string[];
  transferabilityLevel: TransferabilityLevel;
  confidenceRules: CapabilityConfidenceRules;
  taxonomyVersion: typeof CAREER_TAXONOMY_VERSION;
};

export type InferredCapability = {
  capabilityId: string;
  label: string;
  universalFamily: UniversalCapabilityFamily;
  domain: CareerDomain;
  strength: number;
  confidence: number;
  evidenceIds: string[];
  transferabilityLevel: TransferabilityLevel;
  taxonomyVersion: typeof CAREER_TAXONOMY_VERSION;
};

export type TaxonomyValidationIssue = {
  path: string;
  message: string;
};

export function validateCapabilityDefinitions(definitions: CapabilityDefinition[]): TaxonomyValidationIssue[] {
  const issues: TaxonomyValidationIssue[] = [];
  const ids = new Set<string>();

  definitions.forEach((definition, index) => {
    const path = `capabilities[${index}]`;
    if (!definition.id.trim()) issues.push({ path: `${path}.id`, message: "Capability id is required." });
    if (ids.has(definition.id)) issues.push({ path: `${path}.id`, message: `Duplicate capability id: ${definition.id}` });
    ids.add(definition.id);
    if (!definition.label.trim()) issues.push({ path: `${path}.label`, message: "Capability label is required." });
    if (definition.taxonomyVersion !== CAREER_TAXONOMY_VERSION) issues.push({ path: `${path}.taxonomyVersion`, message: "Taxonomy version mismatch." });
    if (definition.exampleSignals.length === 0) issues.push({ path: `${path}.exampleSignals`, message: "At least one signal is required." });
    if (definition.exampleEvidencePatterns.length === 0) issues.push({ path: `${path}.exampleEvidencePatterns`, message: "At least one evidence pattern is required." });
    if (definition.relatedRoleFamilies.length === 0) issues.push({ path: `${path}.relatedRoleFamilies`, message: "At least one related role family is required." });
    if (definition.confidenceRules.minimumDistinctEvidence < 1) issues.push({ path: `${path}.confidenceRules.minimumDistinctEvidence`, message: "Evidence minimum must be at least one." });
  });

  return issues;
}
