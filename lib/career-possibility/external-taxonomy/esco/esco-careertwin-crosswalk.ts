import { readFileSync } from "fs";
import { resolve } from "path";
import { gunzipSync } from "zlib";
import type { EscoCareerTwinCrosswalkDecision, EscoCrosswalkManifest } from "./esco-careertwin-crosswalk-contract";

const DATA_DIR = resolve(process.cwd(), "data/esco/v1.2.1");

let indexesBuilt = false;
let crosswalkManifest: EscoCrosswalkManifest | null = null;
const decisionBySkillUri = new Map<string, EscoCareerTwinCrosswalkDecision>();
const skillsByCapabilityId = new Map<string, string[]>();

export function ensureCrosswalkIndexes() {
  if (indexesBuilt) return;
  
  const manifestStr = readFileSync(resolve(DATA_DIR, "crosswalk-manifest.json"), "utf8");
  crosswalkManifest = JSON.parse(manifestStr) as EscoCrosswalkManifest;
  
  const crosswalkGz = readFileSync(resolve(DATA_DIR, "career-twin-capability-crosswalk.json.gz"));
  const decisions = JSON.parse(gunzipSync(crosswalkGz).toString("utf8")) as EscoCareerTwinCrosswalkDecision[];
  
  for (const d of decisions) {
    decisionBySkillUri.set(d.escoSkillUri, d);
    for (const capId of d.capabilityIds) {
      if (!skillsByCapabilityId.has(capId)) skillsByCapabilityId.set(capId, []);
      skillsByCapabilityId.get(capId)!.push(d.escoSkillUri);
    }
  }
  
  indexesBuilt = true;
}

export function getCrosswalkDecisionForSkill(skillUri: string): EscoCareerTwinCrosswalkDecision | undefined {
  ensureCrosswalkIndexes();
  return decisionBySkillUri.get(skillUri);
}

export function getCareerTwinCapabilitiesForEscoSkill(skillUri: string): readonly string[] {
  ensureCrosswalkIndexes();
  const decision = decisionBySkillUri.get(skillUri);
  return decision?.capabilityIds || [];
}

export function getEscoSkillsForCareerTwinCapability(capabilityId: string): readonly string[] {
  ensureCrosswalkIndexes();
  return skillsByCapabilityId.get(capabilityId) || [];
}

export function getCrosswalkManifest(): EscoCrosswalkManifest {
  ensureCrosswalkIndexes();
  return crosswalkManifest!;
}
