import { ensureIndexes, searchOccupationsByLabel, getSkillsForOccupation } from "../lib/career-possibility/external-taxonomy/esco/esco-index";
import { performance } from "perf_hooks";

function run() {
  const startHeap = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  
  ensureIndexes();
  
  const t1 = performance.now();
  const endHeap = process.memoryUsage().heapUsed;
  const heapDeltaMb = (endHeap - startHeap) / 1024 / 1024;
  
  const t2 = performance.now();
  const firstLookup = searchOccupationsByLabel("software developer");
  const t3 = performance.now();
  const subsequentLookup = searchOccupationsByLabel("account manager");
  const t4 = performance.now();
  const skillsLookup = firstLookup.length > 0 ? getSkillsForOccupation(firstLookup[0].uri) : [];
  const t5 = performance.now();

  console.log(`Cold load time: ${(t1 - t0).toFixed(2)} ms`);
  console.log(`Heap delta: ${heapDeltaMb.toFixed(2)} MB`);
  console.log(`First occupation lookup time: ${(t3 - t2).toFixed(2)} ms`);
  console.log(`Subsequent lookup time: ${(t4 - t3).toFixed(2)} ms`);
  console.log(`Occupation->skills lookup time: ${(t5 - t4).toFixed(2)} ms`);

  // Cross Domain Proof
  const domains = [
    { name: "FINANCE", q: "financial analyst" },
    { name: "HR / PEOPLE", q: "human resources manager" },
    { name: "ENGINEERING / TECHNOLOGY", q: "software developer" },
    { name: "OPERATIONS / SERVICE", q: "operations manager" },
    { name: "SALES / COMMERCIAL", q: "sales manager" },
    { name: "ANALYTICS / DATA", q: "data scientist" }
  ];

  console.log("\n--- CROSS DOMAIN PROOF ---");
  for (const d of domains) {
    const res = searchOccupationsByLabel(d.q);
    if (res.length > 0) {
      const occ = res[0];
      const skills = getSkillsForOccupation(occ.uri);
      const essential = skills.filter(s => s.relationType === "essential").length;
      const optional = skills.filter(s => s.relationType === "optional").length;
      console.log(`Domain: ${d.name}`);
      console.log(`  URI: ${occ.uri}`);
      console.log(`  Label: ${occ.preferredLabel}`);
      console.log(`  Essential Skills: ${essential}`);
      console.log(`  Optional Skills: ${optional}`);
    } else {
      console.log(`Domain: ${d.name} -> NO MATCH FOUND`);
    }
  }

  // Current Roles Comparison (Heuristic)
  const currentRoles = [
    "account manager",
    "analytics manager",
    "business development manager",
    "customer experience manager",
    "customer insights lead",
    "data product manager",
    "engineering manager",
    "finance business partner",
    "fpa manager",
    "hr business partner",
    "marketing analytics lead",
    "product operations manager",
    "program manager",
    "risk manager",
    "sales director",
    "service delivery manager",
    "strategy manager"
  ];

  console.log("\n--- ROLE COMPARISON ---");
  let direct = 0;
  let near = 0;
  let archetype = 0;
  let noMatch = 0;

  for (const r of currentRoles) {
    const res = searchOccupationsByLabel(r);
    const match = res[0];
    let classification = "NO_CLEAR_MATCH";
    if (match) {
      if (match.preferredLabel.toLowerCase() === r) classification = "DIRECT_ESCO_MATCH";
      else if (match.preferredLabel.toLowerCase().includes(r)) classification = "NEAR_ESCO_MATCH";
      else classification = "CAREERTWIN_PRESENTATION_ARCHETYPE";
    }
    
    if (classification === "DIRECT_ESCO_MATCH") direct++;
    else if (classification === "NEAR_ESCO_MATCH") near++;
    else if (classification === "CAREERTWIN_PRESENTATION_ARCHETYPE") archetype++;
    else noMatch++;

    console.log(`Role: ${r} -> ${classification} (${match ? match.preferredLabel : 'N/A'})`);
  }

  console.log(`\nComparison Summary: Direct=${direct}, Near=${near}, Archetype=${archetype}, NoMatch=${noMatch}`);
}

run();
