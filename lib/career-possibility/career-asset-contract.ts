import { CAREER_TAXONOMY_VERSION, type CareerDomain, type InferredCapability, type UniversalCapabilityFamily } from "./capability-taxonomy";
import { ROLE_ROADMAP_VERSION, type RolePossibility } from "./role-roadmap";

export const CAREER_ASSET_CONTRACT_VERSION = "career-asset/1.0.0" as const;

export type CareerAssetStatus = "draft" | "processing" | "ready" | "partial" | "failed";

export type CareerAssetOwner = {
  profileId?: string;
  userId?: string;
  sessionId?: string;
  ownershipMode: "authenticated" | "anonymous_session" | "fixture";
};

export type CareerAssetSource = {
  type: "resume_upload" | "resume_paste" | "linkedin_import" | "manual";
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageObjectRef?: string;
  rawTextRef?: string;
  importedAt: string;
};

export type CareerProfileSnapshot = {
  displayName?: string;
  headline?: string;
  currentTitle?: string;
  summary: string;
  yearsExperience?: number;
  primaryDomains: CareerDomain[];
};

export type CareerAssetExperience = {
  id: string;
  persistedExperienceId?: string;
  company: string;
  role: string;
  dateRange?: string;
  summary?: string;
};

export type CareerAssetEvidence = {
  id: string;
  persistedEvidencePieceId?: string;
  experienceId?: string;
  text: string;
  sourceType: "resume" | "project" | "education" | "manual" | "imported_doc";
  signals: string[];
};

export type CapabilityEvidenceLink = {
  capabilityId: string;
  evidenceId: string;
  persistedCapabilityId?: string;
  persistedEvidenceSignalId?: string;
  contributionWeight?: number;
  rationale?: string;
};

export type CareerAsset = {
  contractVersion: typeof CAREER_ASSET_CONTRACT_VERSION;
  assetId: string;
  owner: CareerAssetOwner;
  persistedRefs: {
    resumeId?: string;
    profileId?: string;
    careerId?: string;
  };
  source: CareerAssetSource;
  profile: CareerProfileSnapshot;
  experiences: CareerAssetExperience[];
  education: Array<{ id: string; institution: string; qualification?: string; dateRange?: string }>;
  projects: Array<{ id: string; label: string; summary: string; evidenceIds: string[] }>;
  skills: string[];
  evidence: CareerAssetEvidence[];
  capabilities: InferredCapability[];
  capabilityEvidenceLinks: CapabilityEvidenceLink[];
  universalCapabilityFamilies: UniversalCapabilityFamily[];
  rolePossibilities: RolePossibility[];
  versions: {
    analysisVersion: string;
    taxonomyVersion: string;
    roleRoadmapVersion: string;
    parserVersion: string;
  };
  status: CareerAssetStatus;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
};

export function validateCareerAsset(asset: CareerAsset): string[] {
  const issues: string[] = [];
  const experienceIds = new Set<string>();
  const educationIds = new Set<string>();
  const projectIds = new Set<string>();
  const seenEvidenceIds = new Set<string>();
  const seenCapabilityIds = new Set<string>();
  const seenRoleIds = new Set<string>();
  const seenLinkIds = new Set<string>();
  const evidenceIds = new Set(asset.evidence.map((item) => item.id));
  const capabilityIds = new Set(asset.capabilities.map((item) => item.capabilityId));

  if (!asset.assetId.trim()) issues.push("assetId is required");
  if (!asset.owner.profileId && !asset.owner.userId && !asset.owner.sessionId) issues.push("owner requires a profileId, userId, or sessionId");
  if (!asset.source.rawTextRef && !asset.source.storageObjectRef) issues.push("source requires a rawTextRef or storageObjectRef");
  if (asset.versions.taxonomyVersion !== CAREER_TAXONOMY_VERSION) issues.push("taxonomy version does not align with the capability contract");
  if (asset.versions.roleRoadmapVersion !== ROLE_ROADMAP_VERSION) issues.push("role roadmap version does not align with the role contract");
  if (!asset.versions.analysisVersion.trim()) issues.push("analysis version is required");
  if (!asset.versions.parserVersion.trim()) issues.push("parser version is required");
  for (const experience of asset.experiences) {
    if (experienceIds.has(experience.id)) issues.push(`duplicate experience id ${experience.id}`);
    experienceIds.add(experience.id);
  }
  for (const education of asset.education) {
    if (educationIds.has(education.id)) issues.push(`duplicate education id ${education.id}`);
    educationIds.add(education.id);
  }
  for (const project of asset.projects) {
    if (projectIds.has(project.id)) issues.push(`duplicate project id ${project.id}`);
    projectIds.add(project.id);
    for (const evidenceId of project.evidenceIds) if (!evidenceIds.has(evidenceId)) issues.push(`project ${project.id} references unknown evidence ${evidenceId}`);
  }
  for (const evidence of asset.evidence) {
    if (seenEvidenceIds.has(evidence.id)) issues.push(`duplicate evidence id ${evidence.id}`);
    seenEvidenceIds.add(evidence.id);
    if (evidence.experienceId && !experienceIds.has(evidence.experienceId)) issues.push(`evidence ${evidence.id} references unknown experience ${evidence.experienceId}`);
  }
  for (const capability of asset.capabilities) {
    if (seenCapabilityIds.has(capability.capabilityId)) issues.push(`duplicate capability id ${capability.capabilityId}`);
    seenCapabilityIds.add(capability.capabilityId);
    if (capability.strength < 0 || capability.strength > 100) issues.push(`capability ${capability.capabilityId} strength must be between 0 and 100`);
    if (capability.confidence < 0 || capability.confidence > 1) issues.push(`capability ${capability.capabilityId} confidence must be between 0 and 1`);
    if (capability.taxonomyVersion !== CAREER_TAXONOMY_VERSION) issues.push(`capability ${capability.capabilityId} taxonomy version mismatch`);
    if (capability.evidenceIds.length === 0) issues.push(`capability ${capability.capabilityId} has no evidence`);
    for (const evidenceId of capability.evidenceIds) if (!evidenceIds.has(evidenceId)) issues.push(`capability ${capability.capabilityId} references unknown evidence ${evidenceId}`);
  }
  for (const link of asset.capabilityEvidenceLinks) {
    const linkId = `${link.capabilityId}::${link.evidenceId}`;
    if (seenLinkIds.has(linkId)) issues.push(`duplicate capability evidence link ${linkId}`);
    seenLinkIds.add(linkId);
    if (!capabilityIds.has(link.capabilityId)) issues.push(`link references unknown capability ${link.capabilityId}`);
    if (!evidenceIds.has(link.evidenceId)) issues.push(`link references unknown evidence ${link.evidenceId}`);
    if (link.contributionWeight !== undefined && (link.contributionWeight < 0 || link.contributionWeight > 1)) issues.push(`link ${linkId} contribution weight must be between 0 and 1`);
  }
  for (const role of asset.rolePossibilities) {
    if (seenRoleIds.has(role.roleFamilyId)) issues.push(`duplicate role possibility id ${role.roleFamilyId}`);
    seenRoleIds.add(role.roleFamilyId);
    if (role.fitScore < 0 || role.fitScore > 100) issues.push(`role ${role.roleFamilyId} fit score must be between 0 and 100`);
    if (role.confidenceScore < 0 || role.confidenceScore > 1) issues.push(`role ${role.roleFamilyId} confidence score must be between 0 and 1`);
    if (role.roadmapVersion !== ROLE_ROADMAP_VERSION) issues.push(`role ${role.roleFamilyId} roadmap version mismatch`);
    for (const capabilityId of role.supportingCapabilityIds) if (!capabilityIds.has(capabilityId)) issues.push(`role ${role.roleFamilyId} references unknown capability ${capabilityId}`);
    for (const evidenceId of role.supportingEvidenceIds) if (!evidenceIds.has(evidenceId)) issues.push(`role ${role.roleFamilyId} references unknown evidence ${evidenceId}`);
  }
  return issues;
}
