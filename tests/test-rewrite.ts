import { matchRoles } from './lib/career-engine/role-matcher';
import { parseJobDescription } from './lib/career-engine/jd-parser';
import { prioritizeGaps } from './lib/career-engine/gap-prioritizer';
import { normalizeSkills } from './lib/career-engine/skill-normalizer';
import { rewriteResume } from './lib/career-engine/resume-rewriter';

const jdText = `
Software Engineer
About Acme
Required Skills
- SQL
- Tableau
- Power BI
- Data Analysis
- Python
- AWS
- Docker
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

const parsedResume = {
    full_name: "Test User",
    current_title: "Data Analyst",
    years_experience: 5,
    industry: "Tech",
    skills: profile.skills,
    companies: ["Company A"],
    education: [],
    summary: "A data dude.",
    contact: { email: "", phone: "", linkedin: "", address: "" },
    parse_quality: "high" as const,
    missing_fields: []
};
const rawText = "Worked at Company A\n- Did some sql queries to move data around\n- Made dashboards for people to see";

const rewrite = rewriteResume(parsedResume, jd, gaps, rawText);

console.log("\n--- Rewrite Output ---");
console.log("Summary Suggestion:");
console.log(rewrite.summary_suggestion);
console.log("\nRole Rewrites:");
console.dir(rewrite.roles, { depth: null });
