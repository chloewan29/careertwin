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
assert.match(rendererSource, /data-node-type=["']capability_family["']/);
assert.match(rendererSource, /data-node-type=["']capability["']/);

// REQUIRED REGRESSION — FOUR ROLES
assert.match(rendererSource, /data-node-type=["']role["']/);
assert.match(rendererSource, /hasRole && roleNodes\.map\(/);

// REQUIRED REGRESSION — SHARED IDENTITY & ROLE-ONLY GAP
assert.match(rendererSource, /data-node-type=["']role_requirement["']/);
assert.match(rendererSource, /data-requirement-state=\{req\.requirementState\}/);

// REQUIRED REGRESSION — FORBIDDEN UX
assert.doesNotMatch(rendererSource, />[^<]*\bfit\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\bstrength\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\bhigh\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\badjacent\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\bstretch\b[^<]*</i);

console.log("Unified Career Map surface tests passed");
