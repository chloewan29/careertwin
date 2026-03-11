"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const jd_parser_1 = require("../lib/career-engine/parsing/jd-parser");
const role_matcher_1 = require("../lib/career-engine/matching/role-matcher");
const resumeLines = [
    "Led and develop high-performing team of 6 analytics professionals with oversight of 22 across business units, fostering commercial thinking and accountability for measurable business impact rather than just delivery",
    "Built analytics capability framework and standards covering insight quality, stakeholder storytelling, and commercial acumen-enabling team to progress from reactive reporting to proactive strategic partnership with senior leaders",
];
const resumeText = resumeLines.join("\n");
const matchedLeadershipGroups = (0, role_matcher_1.detectLeadershipSignalGroups)(resumeText);
console.log("Matched leadership signal groups:", matchedLeadershipGroups);
strict_1.default.ok(matchedLeadershipGroups.includes("people_management"), "Expected people_management leadership group to match.");
strict_1.default.ok(matchedLeadershipGroups.includes("capability_building"), "Expected capability_building leadership group to match.");
strict_1.default.ok(matchedLeadershipGroups.includes("strategic_leadership"), "Expected strategic_leadership group to match.");
const jd = (0, jd_parser_1.parseJobDescription)([
    "Head of Analytics",
    "Required Skills:",
    "- Leadership",
    "Minimum 8 years of experience",
].join("\n"));
const match = (0, role_matcher_1.matchRoles)({
    current_title: "Analytics Manager",
    years_experience: 9,
    skills: [],
    resume_text: resumeText,
}, jd);
const leadershipGap = (match.gap_classification ?? []).find(g => g.skill.toLowerCase() === "leadership");
console.log("Leadership classification:", leadershipGap);
strict_1.default.ok(leadershipGap, "Expected leadership classification to exist.");
strict_1.default.equal(leadershipGap.status, "matched", "Expected leadership to classify as matched from resume evidence.");
console.log("Leadership detection test passed.");
