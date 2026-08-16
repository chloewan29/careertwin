import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceSource = readFileSync("components/career-possibility/LocalCareerMapWorkspace.tsx", "utf8");
const rendererSource = readFileSync("components/career-possibility/CareerMapNeuralGraph.tsx", "utf8");
const pageSource = readFileSync("app/career-map/page.tsx", "utf8");

// REQUIRED REGRESSION — SINGLE SURFACE
assert.doesNotMatch(workspaceSource, /Career Map.*tab/i);
assert.doesNotMatch(workspaceSource, /Neural Graph.*tab/i);
assert.doesNotMatch(workspaceSource, /Role Lens.*tab/i);
assert.doesNotMatch(workspaceSource, /activeView/);

// REQUIRED REGRESSION — HERO SURFACE
assert.equal((workspaceSource.match(/<h1/g) ?? []).length >= 1, true);
assert.doesNotMatch(pageSource, /<header|<footer|CareerTwin home/);
assert.doesNotMatch(rendererSource, /Career capability universe|Your experience, connected/i);
assert.doesNotMatch(rendererSource, /Select a family, capability, evidence signal/);
assert.match(rendererSource, /Browse map/);
assert.match(rendererSource, /Accessible graph navigator is available from Browse map/);
assert.match(rendererSource, /min-h-\[calc\(100dvh-8\.5rem\)\]/);

// REQUIRED REGRESSION — CONCRETE EVIDENCE INTERACTION
assert.match(rendererSource, /evidenceTextById\.get\(node\.semanticId\)/);
assert.match(rendererSource, /Supporting experience/);
assert.doesNotMatch(rendererSource, /Evidence signal/i);

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
assert.doesNotMatch(rendererSource, /strength(?:Score|Label)|readinessScore/i);
assert.doesNotMatch(rendererSource, />[^<]*\bhigh\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\badjacent\b[^<]*</i);
assert.doesNotMatch(rendererSource, />[^<]*\bstretch\b[^<]*</i);

console.log("Unified Career Map surface tests passed");
