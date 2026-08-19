import { readFileSync } from "fs";
import { resolve } from "path";
import { gunzipSync } from "zlib";
import type { 
  EscoOccupation, 
  EscoSkill, 
  EscoOccupationSkillRelation, 
  EscoDatasetManifest 
} from "./esco-contract";

// Ensure this file is only used server-side


const DATA_DIR = resolve(process.cwd(), "data/esco/v1.2.1");

export type EscoDataset = {
  manifest: EscoDatasetManifest;
  occupations: EscoOccupation[];
  skills: EscoSkill[];
  relations: EscoOccupationSkillRelation[];
};

let cachedDataset: EscoDataset | null = null;

export function loadEscoDataset(): EscoDataset {
  if (cachedDataset) {
    return cachedDataset;
  }

  const manifestStr = readFileSync(resolve(DATA_DIR, "manifest.json"), "utf8");
  const manifest = JSON.parse(manifestStr) as EscoDatasetManifest;

  const occCompressed = readFileSync(resolve(DATA_DIR, "occupations.json.gz"));
  const occupations = JSON.parse(gunzipSync(occCompressed).toString("utf8")) as EscoOccupation[];

  const skillCompressed = readFileSync(resolve(DATA_DIR, "skills.json.gz"));
  const skills = JSON.parse(gunzipSync(skillCompressed).toString("utf8")) as EscoSkill[];

  const relCompressed = readFileSync(resolve(DATA_DIR, "occupation-skill-relations.json.gz"));
  const relations = JSON.parse(gunzipSync(relCompressed).toString("utf8")) as EscoOccupationSkillRelation[];

  cachedDataset = {
    manifest,
    occupations,
    skills,
    relations,
  };

  return cachedDataset;
}
