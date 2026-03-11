import assert from "node:assert/strict";
import { parseJobDescription } from "../lib/career-engine/parsing/jd-parser";
import { detectLeadershipSignalGroups, matchRoles } from "../lib/career-engine/matching/role-matcher";

const resumeLines = [
    "Led and develop high-performing team of 6 analytics professionals with oversight of 22 across business units, fostering commercial thinking and accountability for measurable business impact rather than just delivery",
    "Built analytics capability framework and standards covering insight quality, stakeholder storytelling, and commercial acumen-enabling team to progress from reactive reporting to proactive strategic partnership with senior leaders",
];

const resumeText = resumeLines.join("\n");

const matchedLeadershipGroups = detectLeadershipSignalGroups(resumeText);
console.log("Matched leadership signal groups:", matchedLeadershipGroups);

assert.ok(matchedLeadershipGroups.includes("people_management"), "Expected people_management leadership group to match.");
assert.ok(matchedLeadershipGroups.includes("capability_building"), "Expected capability_building leadership group to match.");
assert.ok(matchedLeadershipGroups.includes("strategic_leadership"), "Expected strategic_leadership group to match.");

const jd = parseJobDescription([
    "Head of Analytics",
    "Required Skills:",
    "- Leadership",
    "Minimum 8 years of experience",
].join("\n"));

const match = matchRoles(
    {
        current_title: "Analytics Manager",
        years_experience: 9,
        skills: [],
        resume_text: resumeText,
    },
    jd
);

const leadershipGap = (match.gap_classification ?? []).find(g => g.skill.toLowerCase() === "leadership");
console.log("Leadership classification:", leadershipGap);

assert.ok(leadershipGap, "Expected leadership classification to exist.");
assert.equal(leadershipGap.status, "matched", "Expected leadership to classify as matched from resume evidence.");

console.log("Leadership detection test passed.");
