import type {
  GrowthAreaType,
  GrowthPriority,
  RoleCapabilityProfile,
  RoleCapabilityRequirement,
} from "./role-capability-library";

export type CareerMapGrowthArea = {
  id: string;
  label: string;
  type: GrowthAreaType;
  reason: string;
  proofToBuild: string;
  priority: GrowthPriority;
  relatedCapabilityIds: string[];
  unmappedRelatedCapabilityIds: string[];
};

export type RoleProfileSelection = {
  profiles: RoleCapabilityProfile[];
  missingRoleFamilyIds: string[];
};

export type CareerMapAdapterValidation = {
  warnings: string[];
  issues: string[];
};

export type CareerMapFuturePath = {
  id: string;
  roleFamilyId: string;
  roleFamily: string;
  fitScore: number;
  rank: number;
  category: "Closest Match" | "Adjacent" | "Stretch";
  fitLabel: "Strong path" | "Good path" | "Stretch path";
  explanation: string;
  poweredBy: string[];
  capabilityIds: string[];
  partialCapabilityIds: string[];
  unmappedCapabilityIds: string[];
  growthAreas: CareerMapGrowthArea[];
};

export type CareerMapRoleLens = {
  roleFamilyId: string;
  pathId: string;
  supportedCapabilityIds: string[];
  relatedCapabilityIds: string[];
  partialCapabilityIds: string[];
  unmappedCapabilityIds: string[];
  growthAreas: CareerMapGrowthArea[];
  proofLabels: string[];
};

export type CapabilityIdBridge = Readonly<Record<string, string>>;

export const FRONTEND_CAPABILITY_ID_BRIDGE: CapabilityIdBridge = {
  "change-leadership": "transformation",
  "operating-model": "transformation",
  "cross-functional-delivery": "delivery",
  "benefits-realisation": "delivery",
  "strategic-analysis": "analytics",
  "operating-rhythm": "delivery",
  "executive-narrative": "commercial",
  "commercial-modelling": "commercial",
  "program-planning": "delivery",
  "dependency-management": "delivery",
  "stakeholder-governance": "leadership",
  "risk-controls": "delivery",
  "product-cadence": "delivery",
  "product-insights": "analytics",
  "roadmap-governance": "delivery",
  "tooling-enablement": "transformation",
  "research-design": "customer",
  "insight-synthesis": "analytics",
  "customer-segmentation": "customer",
  "decision-storytelling": "commercial",
  "analytics-leadership": "leadership",
  "measurement-design": "analytics",
  "data-storytelling": "commercial",
  "analytics-governance": "analytics",
};

type AdapterContext = {
  frontendCapabilityIds: ReadonlySet<string>;
  evidenceBackedCapabilityIds: ReadonlySet<string>;
  bridge?: CapabilityIdBridge;
};

type RequirementLinks = {
  relatedCapabilityIds: string[];
  partialCapabilityIds: string[];
  unmappedCapabilityIds: string[];
};

const unique = (values: string[]) => [...new Set(values)];

function resolveCapabilityId(requirement: RoleCapabilityRequirement, context: AdapterContext): string | null {
  const candidate = context.frontendCapabilityIds.has(requirement.capabilityId)
    ? requirement.capabilityId
    : (context.bridge ?? FRONTEND_CAPABILITY_ID_BRIDGE)[requirement.capabilityId];
  return candidate && context.frontendCapabilityIds.has(candidate) ? candidate : null;
}

export function mapRoleRequirementsToCapabilityLinks(
  profile: RoleCapabilityProfile,
  context: AdapterContext,
): RequirementLinks {
  const relatedCapabilityIds: string[] = [];
  const partialCapabilityIds: string[] = [];
  const unmappedCapabilityIds: string[] = [];
  const requirements = [...profile.mustHaveCapabilities, ...profile.shouldHaveCapabilities, ...profile.differentiatingCapabilities];

  for (const requirement of requirements) {
    const mappedId = resolveCapabilityId(requirement, context);
    if (!mappedId) {
      unmappedCapabilityIds.push(requirement.capabilityId);
      continue;
    }
    if (requirement.importance === "must" && context.evidenceBackedCapabilityIds.has(mappedId)) {
      relatedCapabilityIds.push(mappedId);
    } else {
      partialCapabilityIds.push(mappedId);
    }
  }

  const related = unique(relatedCapabilityIds);
  return {
    relatedCapabilityIds: related,
    partialCapabilityIds: unique(partialCapabilityIds).filter((id) => !related.includes(id)),
    unmappedCapabilityIds: unique(unmappedCapabilityIds),
  };
}

export function mapGrowthAreasToGapNodes(profile: RoleCapabilityProfile, context: AdapterContext): CareerMapGrowthArea[] {
  return profile.commonGrowthAreas.map((growthArea) => {
    const mappedRelationships: string[] = [];
    const unmappedRelationships: string[] = [];
    for (const id of growthArea.relatedCapabilityIds) {
      const mapped = (context.bridge ?? FRONTEND_CAPABILITY_ID_BRIDGE)[id] ?? id;
      if (context.frontendCapabilityIds.has(mapped)) mappedRelationships.push(mapped);
      else unmappedRelationships.push(id);
    }
    return {
      id: growthArea.id,
      label: growthArea.label,
      type: growthArea.type,
      reason: growthArea.whyItMatters,
      proofToBuild: growthArea.proofToBuild,
      priority: growthArea.priority,
      relatedCapabilityIds: unique(mappedRelationships),
      unmappedRelatedCapabilityIds: unique(unmappedRelationships),
    };
  });
}

export function selectRoleProfilesById(
  profileById: ReadonlyMap<string, RoleCapabilityProfile>,
  configuredRoleFamilyIds: readonly string[],
): RoleProfileSelection {
  const profiles: RoleCapabilityProfile[] = [];
  const missingRoleFamilyIds: string[] = [];
  for (const roleFamilyId of configuredRoleFamilyIds) {
    const profile = profileById.get(roleFamilyId);
    if (profile) profiles.push(profile);
    else missingRoleFamilyIds.push(roleFamilyId);
  }
  return { profiles, missingRoleFamilyIds };
}

export function buildMockRoleLensForProfile(profile: RoleCapabilityProfile, context: AdapterContext): CareerMapRoleLens {
  const links = mapRoleRequirementsToCapabilityLinks(profile, context);
  return {
    roleFamilyId: profile.roleFamilyId,
    pathId: `path:${profile.roleFamilyId}`,
    supportedCapabilityIds: links.relatedCapabilityIds,
    ...links,
    growthAreas: mapGrowthAreasToGapNodes(profile, context),
    proofLabels: profile.evidenceRequirements.map((requirement) => requirement.description),
  };
}

export function validateRoleLensMapAdapterInput(profiles: RoleCapabilityProfile[], context: AdapterContext): string[] {
  const issues: string[] = [];
  if (context.frontendCapabilityIds.size === 0) issues.push("frontend capability set is empty");
  if (context.evidenceBackedCapabilityIds.size === 0) issues.push("evidence-backed capability set is empty");
  for (const id of context.evidenceBackedCapabilityIds) {
    if (!context.frontendCapabilityIds.has(id)) issues.push(`evidence-backed capability ${id} is not a frontend capability`);
  }
  const roleFamilyIds = new Set<string>();
  for (const profile of profiles) {
    if (roleFamilyIds.has(profile.roleFamilyId)) issues.push(`duplicate role family ${profile.roleFamilyId}`);
    roleFamilyIds.add(profile.roleFamilyId);
  }
  return issues;
}

export function mapRoleProfileToFuturePathNode(
  profile: RoleCapabilityProfile,
  rank: number,
  context: AdapterContext,
): CareerMapFuturePath {
  const lens = buildMockRoleLensForProfile(profile, context);
  const category = rank === 1 ? "Closest Match" : rank <= 3 ? "Adjacent" : "Stretch";
  const fitLabel = category === "Closest Match" ? "Strong path" : category === "Adjacent" ? "Good path" : "Stretch path";
  const mappedRequirements = [...profile.mustHaveCapabilities, ...profile.shouldHaveCapabilities]
    .filter((requirement) => resolveCapabilityId(requirement, context));
  return {
    id: lens.pathId,
    roleFamilyId: profile.roleFamilyId,
    roleFamily: profile.canonicalTitle,
    fitScore: Math.max(40, 100 - rank * 6),
    rank,
    category,
    fitLabel,
    explanation: profile.description,
    poweredBy: mappedRequirements.slice(0, 3).map((requirement) => requirement.label),
    capabilityIds: lens.relatedCapabilityIds,
    partialCapabilityIds: lens.partialCapabilityIds,
    unmappedCapabilityIds: lens.unmappedCapabilityIds,
    growthAreas: mapGrowthAreasToGapNodes(profile, context),
  };
}

export function buildRolePathRailFromProfiles(
  profiles: RoleCapabilityProfile[],
  context: AdapterContext,
): CareerMapFuturePath[] {
  return profiles.map((profile, index) => mapRoleProfileToFuturePathNode(profile, index + 1, context));
}

export function validateCareerMapRolePaths(paths: CareerMapFuturePath[], frontendCapabilityIds: ReadonlySet<string>): string[] {
  return validateCareerMapRolePathsDetailed(paths, frontendCapabilityIds).issues;
}

export function validateCareerMapRolePathsDetailed(
  paths: CareerMapFuturePath[],
  frontendCapabilityIds: ReadonlySet<string>,
  missingConfiguredRoleFamilyIds: readonly string[] = [],
): CareerMapAdapterValidation {
  const warnings: string[] = [];
  const issues: string[] = [];
  for (const roleFamilyId of missingConfiguredRoleFamilyIds) {
    issues.push(`configured demo role family ${roleFamilyId} is missing`);
  }
  const pathIds = new Set<string>();
  for (const path of paths) {
    if (path.id !== `path:${path.roleFamilyId}`) issues.push(`${path.roleFamilyId}: non-deterministic path id`);
    if (pathIds.has(path.id)) issues.push(`${path.roleFamilyId}: duplicate path id`);
    pathIds.add(path.id);
    for (const id of [...path.capabilityIds, ...path.partialCapabilityIds]) {
      if (!frontendCapabilityIds.has(id)) issues.push(`${path.roleFamilyId}: unknown frontend capability ${id}`);
    }
    for (const id of path.partialCapabilityIds) {
      if (path.capabilityIds.includes(id)) issues.push(`${path.roleFamilyId}: capability ${id} is both evidence-backed and partial`);
    }
    for (const id of path.unmappedCapabilityIds) {
      if (path.capabilityIds.includes(id)) issues.push(`${path.roleFamilyId}: unmapped capability ${id} is evidence-backed`);
    }
    if (path.growthAreas.some((area) => !area.id || !area.label || !area.reason || !area.proofToBuild)) {
      issues.push(`${path.roleFamilyId}: incomplete growth area`);
    }
    for (const area of path.growthAreas) {
      for (const id of area.unmappedRelatedCapabilityIds) {
        warnings.push(`${path.roleFamilyId}: growth area ${area.id} retains unmapped capability ${id}`);
      }
    }
  }
  return { warnings, issues };
}
