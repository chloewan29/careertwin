import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { gzipSync } from "zlib";

const CACHE_DIR = resolve(process.cwd(), ".cache/esco/v1.2.1/extracted");
const DATA_DIR = resolve(process.cwd(), "data/esco/v1.2.1");

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headerLine = lines[0];
  // naive split for header assuming no commas in header names
  const headers = headerLine.split(",");
  
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row: Record<string, string> = {};
    // Regex to split by comma, ignoring commas inside quotes
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!matches) continue;
    
    for (let j = 0; j < headers.length; j++) {
      if (matches[j]) {
        let val = matches[j];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        row[headers[j]] = val;
      }
    }
    result.push(row);
  }
  return result;
}

function processNodeFile(filename: string, outname: string) {
  const content = readFileSync(resolve(CACHE_DIR, filename), "utf8");
  const records = parseCSV(content);
  const nodes = records.map((r: any) => ({
    uri: r.conceptUri || r.conceptTypeUri || r.uri,
    preferredLabel: r.preferredLabel,
    code: r.code,
    description: r.description
  })).filter((n: any) => n.uri);
  
  const gzipped = gzipSync(JSON.stringify(nodes));
  writeFileSync(resolve(DATA_DIR, outname), gzipped);
  return nodes.length;
}

function processRelationFile(filename: string, outname: string) {
  const content = readFileSync(resolve(CACHE_DIR, filename), "utf8");
  const records = parseCSV(content);
  const relations = records.map((r: any) => ({
    conceptUri: r.conceptUri,
    broaderUri: r.broaderUri
  })).filter((n: any) => n.conceptUri && n.broaderUri);
  
  const gzipped = gzipSync(JSON.stringify(relations));
  writeFileSync(resolve(DATA_DIR, outname), gzipped);
  return relations.length;
}

function processSkillSkillRelationFile(filename: string, outname: string) {
  const content = readFileSync(resolve(CACHE_DIR, filename), "utf8");
  const records = parseCSV(content);
  const relations = records.map((r: any) => ({
    conceptUri: r.conceptUri,
    relatedUri: r.relatedUri,
    relationType: r.relationType
  })).filter((n: any) => n.conceptUri && n.relatedUri);
  
  const gzipped = gzipSync(JSON.stringify(relations));
  writeFileSync(resolve(DATA_DIR, outname), gzipped);
  return relations.length;
}

function run() {
  console.log("Importing ESCO graph structure...");
  
  const sgCount = processNodeFile("skillGroups_en.csv", "skill-groups.json.gz");
  console.log(`Imported ${sgCount} skill groups.`);
  
  const brSkillCount = processRelationFile("broaderRelationsSkillPillar_en.csv", "broader-skill-relations.json.gz");
  console.log(`Imported ${brSkillCount} broader skill relations.`);
  
  const iscoCount = processNodeFile("ISCOGroups_en.csv", "isco-groups.json.gz");
  console.log(`Imported ${iscoCount} ISCO groups.`);
  
  const brOccCount = processRelationFile("broaderRelationsOccPillar_en.csv", "broader-occ-relations.json.gz");
  console.log(`Imported ${brOccCount} broader occ relations.`);
  
  const ssCount = processSkillSkillRelationFile("skillSkillRelations_en.csv", "skill-skill-relations.json.gz");
  console.log(`Imported ${ssCount} skill-skill relations.`);
  
  console.log("Import complete.");
}

run();
