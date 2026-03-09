import { parseJobDescription } from './lib/career-engine/jd-parser';
import { matchRoles } from './lib/career-engine/role-matcher';

const jdText = `
Software Engineer
About Acme
Required Skills
- Strong SQL Proficiency
- data analytics / behavioral insights
- leadership
- narrative / visual storytelling
- research / measurement capability
`;

const jd = parseJobDescription(jdText);
console.log("JD Required Skills:", jd.required_skills.map(s => s.normalized));

const profile = {
    current_title: "Software Engineer",
    years_experience: 5,
    skills: ["SQL", "Data Analysis", "team management", "lead delivery", "storytelling", "presentation", "1st & 3rd party data experience"]
};

const match = matchRoles(profile, jd);
console.log("Missing Skills:", match.missing_skills);
