import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceSource = readFileSync("components/career-possibility/LocalCareerMapWorkspace.tsx", "utf8");
const rendererSource = readFileSync("components/career-possibility/CareerMapNeuralGraph.tsx", "utf8");

// REQUIRED REGRESSION — SINGLE SURFACE
assert.doesNotMatch(workspaceSource, /Career Map.*tab/i);
assert.doesNotMatch(workspaceSource, /Neural Graph.*tab/i);
assert.doesNotMatch(workspaceSource, /Role Lens.*tab/i);
assert.doesNotMatch(workspaceSource, /activeView/);

// REQUIRED REGRESSION — TWO LAYERS
// Family node exists and is visual only
assert.match(rendererSource, /nodeType === "FAMILY"/);
assert.match(rendererSource, /nodeType === "CAPABILITY"/);
assert.match(rendererSource, /data-node-type=\{projectionNodeType\(node\.nodeType\)\}/);

// REQUIRED REGRESSION — FOUR ROLES
assert.match(rendererSource, /nodeType === "ROLE"/);
assert.match(rendererSource, /buildCareerGraphVisualModel\(projection\)/);

// REQUIRED REGRESSION — SHARED IDENTITY & ROLE-ONLY GAP
assert.match(rendererSource, /ROLE_ONLY_CAPABILITY/);
assert.match(rendererSource, /data-requirement-state=\{node\.nodeType === "ROLE_ONLY_CAPABILITY"/);

// REQUIRED REGRESSION — FORBIDDEN UX
assert.doesNotMatch(rendererSource, />[^<]*\bfit\b[^<]*</i);
assert.doesNotMatch(rendererSource, /["'`]strength["'`]/i);
assert.doesNotMatch(rendererSource, />[^<]*\bhigh\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\badjacent\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\bstretch\b[^<]*</i);

console.log("Unified Career Map surface tests passed");
