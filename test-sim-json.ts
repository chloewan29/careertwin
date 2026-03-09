import { matchRoles } from './lib/career-engine/role-matcher';
import { parseJobDescription } from './lib/career-engine/jd-parser';
import { prioritizeGaps } from './lib/career-engine/gap-prioritizer';
import { simulateGapResolution } from './lib/career-engine/career-simulator';
import { normalizeSkills } from './lib/career-engine/skill-normalizer';
import * as fs from 'fs';

const jdText = `
Software Engineer
About Acme
Required Skills
- SQL
- Tableau
- Power BI
- Data Analysis
- Python
`;

const jd = parseJobDescription(jdText);
const profileSkills = ["SQL", "Tableau", "Power BI", "Data Analysis"];
const normalizedSkills = normalizeSkills(profileSkills);

const profile = {
    current_title: "Software Engineer",
    years_experience: 5,
    skills: normalizedSkills.map(s => s.normalized)
};

const match = matchRoles(profile, jd);
const gaps = prioritizeGaps(profile, jd, match);
const sim = simulateGapResolution(profile, jd, match, gaps);

const output = {
    profileSkills: profile.skills,
    missingSkills: match.missing_skills,
    simulatedImprovements: sim.improvements
};

fs.writeFileSync('sim-output.json', JSON.stringify(output, null, 2));
