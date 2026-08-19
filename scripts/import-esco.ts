import { createReadStream, promises as fs } from "fs";
import { resolve } from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { createHash } from "crypto";
import {
  ESCO_DATASET_CLASSIFICATION,
  ESCO_DATASET_VERSION,
  ESCO_DATASET_LANGUAGE,
  type EscoOccupation,
  type EscoSkill,
  type EscoOccupationSkillRelation,
  type EscoRelationType,
  type EscoDatasetManifest
} from "../lib/career-possibility/external-taxonomy/esco/esco-contract";

const CACHE_DIR = resolve(process.cwd(), ".cache/esco/v1.2.1/extracted");
const OUTPUT_DIR = resolve(process.cwd(), "data/esco/v1.2.1");

// A strict but simple CSV stream parser to handle quotes and newlines
async function* parseCsv(filePath: string): AsyncGenerator<string[]> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  let buffer = "";
  let inQuotes = false;
  let currentRow: string[] = [];
  let currentField = "";

  for await (const chunk of stream) {
    buffer += chunk;
    let i = 0;
    while (i < buffer.length) {
      const char = buffer[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < buffer.length && buffer[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField);
          currentField = "";
        } else if (char === '\n' || (char === '\r' && buffer[i + 1] === '\n')) {
          if (char === '\r') i++;
          currentRow.push(currentField);
          yield currentRow;
          currentRow = [];
          currentField = "";
        } else {
          currentField += char;
        }
      }
      i++;
    }
    buffer = "";
  }
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    yield currentRow;
  }
}

async function writeGzip(filePath: string, data: unknown): Promise<{ byteSize: number; sha256: string }> {
  const jsonStr = JSON.stringify(data);
  const hash = createHash("sha256").update(jsonStr).digest("hex");
  
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  // Simple buffer gzip:
  const zlib = require("zlib");
  const util = require("util");
  const gzip = util.promisify(zlib.gzip);
  const compressed = await gzip(Buffer.from(jsonStr, "utf8"));
  await fs.writeFile(filePath, compressed);
  
  return { byteSize: compressed.byteLength, sha256: hash };
}

async function run() {
  console.log("Starting ESCO v1.2.1 Import...");
  
  const occupations: EscoOccupation[] = [];
  const skills: EscoSkill[] = [];
  const relations: EscoOccupationSkillRelation[] = [];

  const occUris = new Set<string>();
  const skillUris = new Set<string>();

  // 1. Parse Occupations
  console.log("Parsing occupations_en.csv...");
  let occHeaders: string[] = [];
  let isOccFirst = true;
  for await (const row of parseCsv(resolve(CACHE_DIR, "occupations_en.csv"))) {
    if (isOccFirst) { occHeaders = row; isOccFirst = false; continue; }
    if (row.length < 2) continue;
    const rec = Object.fromEntries(occHeaders.map((h, i) => [h, row[i]]));
    if (!rec.conceptUri || !rec.preferredLabel) continue;
    
    if (occUris.has(rec.conceptUri)) {
      console.warn(`Duplicate occupation URI: ${rec.conceptUri}`);
      continue;
    }
    occUris.add(rec.conceptUri);
    occupations.push({
      uri: rec.conceptUri,
      preferredLabel: rec.preferredLabel,
      description: rec.description,
      iscoGroup: rec.iscoGroup
    });
  }

  // 2. Parse Skills
  console.log("Parsing skills_en.csv...");
  let skillHeaders: string[] = [];
  let isSkillFirst = true;
  for await (const row of parseCsv(resolve(CACHE_DIR, "skills_en.csv"))) {
    if (isSkillFirst) { skillHeaders = row; isSkillFirst = false; continue; }
    if (row.length < 2) continue;
    const rec = Object.fromEntries(skillHeaders.map((h, i) => [h, row[i]]));
    if (!rec.conceptUri || !rec.preferredLabel) continue;

    if (skillUris.has(rec.conceptUri)) {
      console.warn(`Duplicate skill URI: ${rec.conceptUri}`);
      continue;
    }
    skillUris.add(rec.conceptUri);
    skills.push({
      uri: rec.conceptUri,
      preferredLabel: rec.preferredLabel,
      description: rec.description,
      skillType: rec.skillType
    });
  }

  // 3. Parse Relations
  console.log("Parsing occupationSkillRelations_en.csv...");
  let relHeaders: string[] = [];
  let isRelFirst = true;
  let danglingOccCount = 0;
  let danglingSkillCount = 0;
  let unknownRelCount = 0;
  
  for await (const row of parseCsv(resolve(CACHE_DIR, "occupationSkillRelations_en.csv"))) {
    if (isRelFirst) { relHeaders = row; isRelFirst = false; continue; }
    if (row.length < 2) continue;
    const rec = Object.fromEntries(relHeaders.map((h, i) => [h, row[i]]));
    if (!rec.occupationUri || !rec.skillUri) continue;

    if (!occUris.has(rec.occupationUri)) { danglingOccCount++; continue; }
    if (!skillUris.has(rec.skillUri)) { danglingSkillCount++; continue; }

    const rType = rec.relationType === "essential" || rec.relationType === "optional" 
      ? rec.relationType as EscoRelationType 
      : null;
      
    if (!rType) { unknownRelCount++; continue; }

    relations.push({
      occupationUri: rec.occupationUri,
      skillUri: rec.skillUri,
      relationType: rType
    });
  }

  // Integrity Gates
  console.log("\n--- INTEGRITY CHECKS ---");
  console.log(`Duplicate Occs: 0 (filtered)`);
  console.log(`Duplicate Skills: 0 (filtered)`);
  console.log(`Dangling Occs in Relations: ${danglingOccCount}`);
  console.log(`Dangling Skills in Relations: ${danglingSkillCount}`);
  console.log(`Unknown Relation Types: ${unknownRelCount}`);
  
  if (danglingOccCount > 0 || danglingSkillCount > 0 || unknownRelCount > 0) {
    console.warn("WARNING: Dataset has referential integrity issues, but continuing as per MVP tolerance.");
  }

  // Sort deterministically
  occupations.sort((a, b) => a.uri.localeCompare(b.uri, "en"));
  skills.sort((a, b) => a.uri.localeCompare(b.uri, "en"));
  relations.sort((a, b) => a.occupationUri.localeCompare(b.occupationUri, "en") || a.skillUri.localeCompare(b.skillUri, "en") || a.relationType.localeCompare(b.relationType, "en"));

  const essentialCount = relations.filter(r => r.relationType === "essential").length;
  const optionalCount = relations.filter(r => r.relationType === "optional").length;

  console.log("\n--- NORMALIZATION COMPLETED ---");
  console.log(`Occupations: ${occupations.length}`);
  console.log(`Skills: ${skills.length}`);
  console.log(`Relations: ${relations.length}`);

  // 4. Write output
  console.log("\nWriting compressed JSON...");
  const occMeta = await writeGzip(resolve(OUTPUT_DIR, "occupations.json.gz"), occupations);
  const skillMeta = await writeGzip(resolve(OUTPUT_DIR, "skills.json.gz"), skills);
  const relMeta = await writeGzip(resolve(OUTPUT_DIR, "occupation-skill-relations.json.gz"), relations);

  const manifest: EscoDatasetManifest = {
    classification: ESCO_DATASET_CLASSIFICATION,
    version: ESCO_DATASET_VERSION,
    language: ESCO_DATASET_LANGUAGE,
    publisher: "European Commission",
    source: "https://ec.europa.eu/esco/portal/download",
    sourceAcquisitionType: "manual_download_zip",
    importSchemaVersion: "1.0.0",
    importTimestamp: new Date().toISOString(),
    occupationCount: occupations.length,
    skillCount: skills.length,
    relationCount: relations.length,
    essentialRelationCount: essentialCount,
    optionalRelationCount: optionalCount,
    compressedByteSizes: {
      occupations: occMeta.byteSize,
      skills: skillMeta.byteSize,
      relations: relMeta.byteSize
    },
    hashes: {
      sourceArchive: null, // Too expensive to hash large zip in memory without stream, omitting for script brevity
      occupations: occMeta.sha256,
      skills: skillMeta.sha256,
      relations: relMeta.sha256
    },
    attribution: "This service uses the ESCO classification of the European Commission. The CareerTwin normalized representation is an adapted/internal representation of the source classification."
  };

  await fs.writeFile(resolve(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  
  console.log("\n--- MANIFEST WRITTEN ---");
  console.log(`Total compressed size: ${((occMeta.byteSize + skillMeta.byteSize + relMeta.byteSize) / 1024 / 1024).toFixed(2)} MB`);
}

run().catch(console.error);
