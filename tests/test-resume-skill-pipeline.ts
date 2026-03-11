import assert from "node:assert/strict";
import { extractSkills } from "../lib/career-engine/parsing/skill-extractor";
import { parseResumeText } from "../lib/career-engine/parsing/resume-parser";
import { normalizeSkill } from "../lib/career-engine/parsing/skill-normalizer";

const leadershipResumeText = [
    "Led and develop high-performing team of 6 analytics professionals with oversight of 22 across business units.",
    "Built analytics capability framework and standards and influenced senior stakeholders.",
    "Created a proactive strategic partnership with senior leaders.",
].join("\n");

const extracted = extractSkills(leadershipResumeText);
console.log("Extracted skills/capabilities:", extracted);

for (const capability of [
    "Leadership",
    "People Management",
    "Team Leadership",
    "Capability Building",
    "Stakeholder Influence",
    "Strategic Partnership",
]) {
    assert.ok(extracted.includes(capability), `Expected extracted capabilities to include "${capability}".`);
}

const parsed = parseResumeText([
    "Skills",
    "GoogleBigQuery, AIGovernance, Alterix",
].join("\n"));

console.log("Parsed skills section skills:", parsed.skills);
assert.ok(parsed.skills.includes("Google BigQuery"), "Expected GoogleBigQuery to stay as one skill token.");
assert.ok(parsed.skills.includes("AI Governance"), "Expected AIGovernance to be split to AI Governance.");

assert.equal(normalizeSkill("Alterix").normalized, "Alteryx");
assert.equal(normalizeSkill("GoogleBigQuery").normalized, "Google BigQuery");
assert.equal(normalizeSkill("ai governance").normalized, "AI Governance");

console.log("Resume skill pipeline test passed.");
