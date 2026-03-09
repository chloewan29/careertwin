import { matchRoles } from './lib/career-engine/role-matcher';
import { parseJobDescription } from './lib/career-engine/jd-parser';
import { prioritizeGaps } from './lib/career-engine/gap-prioritizer';
import { simulateGapResolution } from './lib/career-engine/career-simulator';
import { normalizeSkills } from './lib/career-engine/skill-normalizer';

const jdText = `
Software Engineer
About Acme
Required Skills
- Strong SQL Proficiency
- Data Analysis
- Leadership
`;

const jd = parseJobDescription(jdText);
console.log("JD Required Skills:", jd.required_skills.map(s => s.normalized));

// simulate input with different casing/aliases
const profile = {
    current_title: "Software Engineer",
    years_experience: 5,
    skills: normalizeSkills(["sql", "data analytics", "team management"]).map(s => s.normalized)
};

const match = matchRoles(profile, jd);
const gaps = prioritizeGaps(profile, jd, match);
const sim = simulateGapResolution(profile, jd, match, gaps);

console.log("\nProfile Skills:", profile.skills);
console.log("Missing Skills:", match.missing_skills);
console.log("Simulated Improvements:");
console.dir(sim.improvements, { depth: null });
