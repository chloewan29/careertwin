"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const skill_extractor_1 = require("../lib/career-engine/parsing/skill-extractor");
const resume_parser_1 = require("../lib/career-engine/parsing/resume-parser");
const skill_normalizer_1 = require("../lib/career-engine/parsing/skill-normalizer");
const leadershipResumeText = [
    "Led and develop high-performing team of 6 analytics professionals with oversight of 22 across business units.",
    "Built analytics capability framework and standards and influenced senior stakeholders.",
    "Created a proactive strategic partnership with senior leaders.",
].join("\n");
const extracted = (0, skill_extractor_1.extractSkills)(leadershipResumeText);
console.log("Extracted skills/capabilities:", extracted);
for (const capability of [
    "Leadership",
    "People Management",
    "Team Leadership",
    "Capability Building",
    "Stakeholder Influence",
    "Strategic Partnership",
]) {
    strict_1.default.ok(extracted.includes(capability), `Expected extracted capabilities to include "${capability}".`);
}
const parsed = (0, resume_parser_1.parseResumeText)([
    "Skills",
    "GoogleBigQuery, AIGovernance, Alterix",
].join("\n"));
console.log("Parsed skills section skills:", parsed.skills);
strict_1.default.ok(parsed.skills.includes("Google BigQuery"), "Expected GoogleBigQuery to stay as one skill token.");
strict_1.default.ok(parsed.skills.includes("AI Governance"), "Expected AIGovernance to be split to AI Governance.");
strict_1.default.equal((0, skill_normalizer_1.normalizeSkill)("Alterix").normalized, "Alteryx");
strict_1.default.equal((0, skill_normalizer_1.normalizeSkill)("GoogleBigQuery").normalized, "Google BigQuery");
strict_1.default.equal((0, skill_normalizer_1.normalizeSkill)("ai governance").normalized, "AI Governance");
console.log("Resume skill pipeline test passed.");
