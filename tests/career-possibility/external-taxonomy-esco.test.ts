import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  ensureIndexes,
  getOccupationByUri,
  searchOccupationsByLabel,
  getSkillByUri,
  searchSkillsByLabel,
  getSkillsForOccupation,
  getOccupationsForSkill
} from "../../lib/career-possibility/external-taxonomy/esco/esco-index";
import { ESCO_PROVENANCE } from "../../lib/career-possibility/external-taxonomy/esco/esco-provenance";

describe("ESCO Occupational Knowledge Foundation", () => {
  beforeAll(() => {
    ensureIndexes();
  });

  it("exposes expected provenance", () => {
    expect(ESCO_PROVENANCE.version).toBe("v1.2.1");
    expect(ESCO_PROVENANCE.classification).toBe("ESCO");
  });

  it("can load the manifest", () => {
    const DATA_DIR = resolve(process.cwd(), "data/esco/v1.2.1");
    const manifestStr = readFileSync(resolve(DATA_DIR, "manifest.json"), "utf8");
    const manifest = JSON.parse(manifestStr);
    expect(manifest.version).toBe("v1.2.1");
    expect(manifest.occupationCount).toBeGreaterThan(1000);
    expect(manifest.skillCount).toBeGreaterThan(10000);
  });

  it("can lookup occupation by URI and search by label", () => {
    // E.g., a data scientist or software developer
    const results = searchOccupationsByLabel("software developer");
    expect(results.length).toBeGreaterThan(0);
    
    const occ = results[0];
    const found = getOccupationByUri(occ.uri);
    expect(found).toBeDefined();
    expect(found?.uri).toBe(occ.uri);
  });

  it("can lookup skill by URI and search by label", () => {
    const results = searchSkillsByLabel("programming");
    expect(results.length).toBeGreaterThan(0);
    
    const skill = results[0];
    const found = getSkillByUri(skill.uri);
    expect(found).toBeDefined();
    expect(found?.uri).toBe(skill.uri);
  });

  it("can resolve relations in both directions", () => {
    const results = searchOccupationsByLabel("data scientist");
    if (results.length === 0) return;
    
    const occ = results[0];
    const skills = getSkillsForOccupation(occ.uri);
    expect(skills.length).toBeGreaterThan(0);
    
    // Pick first skill and trace back
    const firstSkill = skills[0].skill;
    const occs = getOccupationsForSkill(firstSkill.uri);
    expect(occs.some(o => o.occupation.uri === occ.uri)).toBe(true);
    
    // Ensure relation type is present
    expect(["essential", "optional"]).toContain(skills[0].relationType);
  });
});
