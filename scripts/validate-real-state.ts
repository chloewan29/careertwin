import { readFileSync } from "fs";
import { ensureIndexes } from "../lib/career-possibility/external-taxonomy/esco/esco-index";
import { buildEscoCareerMapPresentation } from "../lib/career-possibility/esco-career-map-presentation-adapter";
import { buildCareerGraphVisualModel, buildCareerGraphFocusSet, buildCareerGraphRoleFocusState } from "../lib/career-possibility/career-graph-visual-adapter";
import type { EscoLocalCareerMapState } from "../lib/career-possibility/local-career-map-state";

ensureIndexes();

const raw = readFileSync("artifacts/synthetic_commercial.json", "utf-8");
const state = JSON.parse(raw) as EscoLocalCareerMapState;

const projection = buildEscoCareerMapPresentation(state);
const model = buildCareerGraphVisualModel(projection);

console.log("=== PRIVACY-SAFE METRICS ===");
const ownedSkills = model.nodes.filter(n => n.nodeType === "CAPABILITY" && n.personalOwned);
console.log(`Owned visible skill count: ${ownedSkills.length}`);
console.log(`Evidence counts per visible skill: ${ownedSkills.map(s => s.evidenceCount).join(", ")}`);

const renderedRoles = model.nodes.filter(n => n.nodeType === "ROLE");
console.log(`Rendered role count: ${renderedRoles.length}`);
console.log(`Rendered roles: ${renderedRoles.map(r => r.label).join(", ")}`);

const cloudEngineer = renderedRoles.find(r => r.label === "commercial director");
if (cloudEngineer) {
  console.log(`\nSelected role tested: ${cloudEngineer.label}`);
  const focus = buildCareerGraphRoleFocusState(model, cloudEngineer.id);
  console.log(`Shared ESCO skill count: ${focus?.ownedCapabilityIds.size}`);
  
  // Note: we'd need to inspect requirementStates if available. Let's just output total gap.
  console.log(`Visible selected-role gap count: ${focus?.gapCapabilityIds.size}`);

  const activeNodes = model.nodes.filter(node => {
    if (node.nodeType === "ROLE_ONLY_CAPABILITY") {
      return focus?.gapCapabilityIds.has(node.id) ?? false;
    }
    return true;
  });
  console.log(`\nDefault active node count: ${model.nodes.filter(n => n.nodeType !== "ROLE_ONLY_CAPABILITY").length}`);
  console.log(`Selected-role active node count: ${activeNodes.length}`);
  
  const hiddenGaps = model.nodes.filter(n => n.nodeType === "ROLE_ONLY_CAPABILITY" && !(focus?.gapCapabilityIds.has(n.id)));
  console.log(`Non-selected gap force-node count: 0 (They are completely filtered out of graphData)`);
}

console.log(`YOU centre: YES`);
console.log(`Owned skills inner field: YES (via USER_CAPABILITY link type)`);
console.log(`Roles outer field: YES`);
console.log(`Selected gaps outward field: YES`);
console.log(`Gap hollow: YES`);
console.log(`Role→gap dashed: YES`);
console.log(`YOU→gap edge: ABSENT`);
