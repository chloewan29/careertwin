import { matchRoles } from './lib/career-engine/role-matcher';
import { parseJobDescription } from './lib/career-engine/jd-parser';
import { normalizeSkills } from './lib/career-engine/skill-normalizer';

const jdText = `
Software Engineer
About Acme
Required Skills
- SQL
- Tableau
- Power BI
- Data Analysis
`;

const jd = parseJobDescription(jdText);
console.log("JD Required Skills:", jd.required_skills.map(s => s.normalized));

// simulate input exactly like the route.ts
const profileSkills = ["SQL", "Tableau", "Power BI", "Data Analysis"];
const normalizedSkills = normalizeSkills(profileSkills);

const profile = {
    current_title: "Software Engineer",
    years_experience: 5,
    skills: [], // simulate empty primary skills
    parsed_skills: ["SQL", "Tableau", "Power BI", "Data Analysis"] // simulate populated fallback
};

const match = matchRoles(profile, jd);
console.log("\nEffective Profile Skills:", profile.skills.length > 0 ? profile.skills : profile.parsed_skills);
console.log("Missing Skills:", match.missing_skills);
