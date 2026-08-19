import { loadEscoDataset } from "./esco-loader";
import type { EscoOccupation, EscoSkill, EscoOccupationSkillRelation, EscoRelationType } from "./esco-contract";


let indexesBuilt = false;

const occupationByUri = new Map<string, EscoOccupation>();
const skillByUri = new Map<string, EscoSkill>();
const skillsByOccupationUri = new Map<string, Array<{ skill: EscoSkill; relationType: EscoRelationType }>>();
const occupationsBySkillUri = new Map<string, Array<{ occupation: EscoOccupation; relationType: EscoRelationType }>>();

// For simple searching
const occupationsIndex: Array<{ searchStr: string; item: EscoOccupation }> = [];
const skillsIndex: Array<{ searchStr: string; item: EscoSkill }> = [];

export function ensureIndexes() {
  if (indexesBuilt) return;
  const dataset = loadEscoDataset();

  for (const occ of dataset.occupations) {
    occupationByUri.set(occ.uri, occ);
    occupationsIndex.push({
      searchStr: occ.preferredLabel.toLowerCase().trim(),
      item: occ
    });
  }

  for (const skill of dataset.skills) {
    skillByUri.set(skill.uri, skill);
    skillsIndex.push({
      searchStr: skill.preferredLabel.toLowerCase().trim(),
      item: skill
    });
  }

  for (const rel of dataset.relations) {
    const occ = occupationByUri.get(rel.occupationUri);
    const sk = skillByUri.get(rel.skillUri);
    if (occ && sk) {
      if (!skillsByOccupationUri.has(occ.uri)) skillsByOccupationUri.set(occ.uri, []);
      skillsByOccupationUri.get(occ.uri)!.push({ skill: sk, relationType: rel.relationType });

      if (!occupationsBySkillUri.has(sk.uri)) occupationsBySkillUri.set(sk.uri, []);
      occupationsBySkillUri.get(sk.uri)!.push({ occupation: occ, relationType: rel.relationType });
    }
  }

  indexesBuilt = true;
}

export function getOccupationByUri(uri: string): EscoOccupation | undefined {
  ensureIndexes();
  return occupationByUri.get(uri);
}

export function searchOccupationsByLabel(query: string, limit: number = 10): EscoOccupation[] {
  ensureIndexes();
  const q = query.toLowerCase().trim();
  const exact: EscoOccupation[] = [];
  const prefix: EscoOccupation[] = [];
  const substring: EscoOccupation[] = [];

  for (const entry of occupationsIndex) {
    if (entry.searchStr === q) exact.push(entry.item);
    else if (entry.searchStr.startsWith(q)) prefix.push(entry.item);
    else if (entry.searchStr.includes(q)) substring.push(entry.item);
    if (exact.length >= limit) break; // Optimization if we find enough exact
  }

  return [...exact, ...prefix, ...substring].slice(0, limit);
}

export function getSkillByUri(uri: string): EscoSkill | undefined {
  ensureIndexes();
  return skillByUri.get(uri);
}

export function searchSkillsByLabel(query: string, limit: number = 10): EscoSkill[] {
  ensureIndexes();
  const q = query.toLowerCase().trim();
  const exact: EscoSkill[] = [];
  const prefix: EscoSkill[] = [];
  const substring: EscoSkill[] = [];

  for (const entry of skillsIndex) {
    if (entry.searchStr === q) exact.push(entry.item);
    else if (entry.searchStr.startsWith(q)) prefix.push(entry.item);
    else if (entry.searchStr.includes(q)) substring.push(entry.item);
    if (exact.length >= limit) break;
  }

  return [...exact, ...prefix, ...substring].slice(0, limit);
}

export function getSkillsForOccupation(uri: string): Array<{ skill: EscoSkill; relationType: EscoRelationType }> {
  ensureIndexes();
  return skillsByOccupationUri.get(uri) || [];
}

export function getOccupationsForSkill(uri: string): Array<{ occupation: EscoOccupation; relationType: EscoRelationType }> {
  ensureIndexes();
  return occupationsBySkillUri.get(uri) || [];
}

export function getOccupations(): EscoOccupation[] {
  ensureIndexes();
  return Array.from(occupationByUri.values());
}
