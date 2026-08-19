import { getOccupationByUri, getSkillsForOccupation, getOccupations } from "./esco-index";
import { getCrosswalkDecisionForSkill } from "./esco-careertwin-crosswalk";

export type EscoRoleCapabilityProjection = Readonly<{
  occupationUri: string;
  occupationLabel: string;
  capabilities: readonly EscoProjectedCapability[];
}>;

export type EscoProjectedCapability = Readonly<{
  capabilityId: string;
  essentialSupportCount: number;
  optionalSupportCount: number;
  essentialSkillUris: readonly string[];
  optionalSkillUris: readonly string[];
  supportClass: "essential_backed" | "optional_only";
}>;

// Cache map
const projectionCache = new Map<string, EscoRoleCapabilityProjection>();

export function getRoleCapabilityProjection(occupationUri: string): EscoRoleCapabilityProjection | undefined {
  if (projectionCache.has(occupationUri)) {
    return projectionCache.get(occupationUri);
  }

  const occ = getOccupationByUri(occupationUri);
  if (!occ) return undefined;

  const skills = getSkillsForOccupation(occupationUri);
  
  // Aggregate by capability ID
  const capMap = new Map<string, {
    essential: Set<string>;
    optional: Set<string>;
  }>();

  for (const rel of skills) {
    const dec = getCrosswalkDecisionForSkill(rel.skill.uri);
    if (!dec || dec.capabilityIds.length === 0) continue;

    for (const capId of dec.capabilityIds) {
      if (!capMap.has(capId)) {
        capMap.set(capId, { essential: new Set(), optional: new Set() });
      }
      if (rel.relationType === "essential") {
        capMap.get(capId)!.essential.add(rel.skill.uri);
      } else {
        capMap.get(capId)!.optional.add(rel.skill.uri);
      }
    }
  }

  const capabilities: EscoProjectedCapability[] = [];
  for (const [capId, support] of capMap.entries()) {
    const essentialUris = Array.from(support.essential).sort();
    const optionalUris = Array.from(support.optional).sort();
    const essentialSupportCount = essentialUris.length;
    const optionalSupportCount = optionalUris.length;
    
    capabilities.push({
      capabilityId: capId,
      essentialSupportCount,
      optionalSupportCount,
      essentialSkillUris: essentialUris,
      optionalSkillUris: optionalUris,
      supportClass: essentialSupportCount > 0 ? "essential_backed" : "optional_only"
    });
  }

  // Deterministic diagnostic ordering
  capabilities.sort((a, b) => {
    // 1. essential_backed first
    if (a.supportClass === "essential_backed" && b.supportClass === "optional_only") return -1;
    if (a.supportClass === "optional_only" && b.supportClass === "essential_backed") return 1;
    
    // 2. greater essential support count
    if (b.essentialSupportCount !== a.essentialSupportCount) return b.essentialSupportCount - a.essentialSupportCount;
    
    // 3. greater optional support count
    if (b.optionalSupportCount !== a.optionalSupportCount) return b.optionalSupportCount - a.optionalSupportCount;
    
    // 4. alphabetical ID
    return a.capabilityId.localeCompare(b.capabilityId, "en");
  });

  const proj: EscoRoleCapabilityProjection = {
    occupationUri: occupationUri,
    occupationLabel: occ.preferredLabel,
    capabilities
  };

  projectionCache.set(occupationUri, proj);
  return proj;
}

export function getProjectedCapabilitiesForOccupation(occupationUri: string): readonly EscoProjectedCapability[] {
  const proj = getRoleCapabilityProjection(occupationUri);
  return proj?.capabilities || [];
}

// Server tooling only
export function getEscoOccupationsForCareerTwinCapability(capabilityId: string): readonly string[] {
  const allOccs = getOccupations();
  const res: string[] = [];
  for (const occ of allOccs) {
    const proj = getRoleCapabilityProjection(occ.uri);
    if (proj?.capabilities.some(c => c.capabilityId === capabilityId)) {
      res.push(occ.uri);
    }
  }
  return res.sort();
}

export function projectAllEscoOccupations(): readonly EscoRoleCapabilityProjection[] {
  const occs = getOccupations();
  return occs.map(o => getRoleCapabilityProjection(o.uri)!).sort((a,b) => a.occupationUri.localeCompare(b.occupationUri, "en"));
}
