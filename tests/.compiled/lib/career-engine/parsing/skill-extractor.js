"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSkills = extractSkills;
const COMMON_SKILLS = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP",
    "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQL", "NoSQL",
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform", "CI/CD",
    "Machine Learning", "Data Science", "AI", "TensorFlow", "PyTorch", "Pandas",
    "Alteryx", "Google BigQuery", "AI Governance",
    "Git", "GitHub", "GitLab", "Agile", "Scrum", "Jira", "Figma",
    "HTML", "CSS", "Sass", "Tailwind CSS", "GraphQL", "REST", "API Design",
    "Linux", "Unix", "Bash", "Shell Scripting"
];
const LEADERSHIP_CAPABILITY_PATTERNS = {
    Leadership: [
        "leadership",
        "led",
        "leading",
        "owned",
        "ownership",
    ],
    "People Management": [
        "people management",
        "managed team",
        "managing team",
        "line managed",
        "oversight of",
    ],
    "Team Leadership": [
        "team leadership",
        "led team",
        "high-performing team",
        "developed team",
        "coached team",
        "mentored team",
    ],
    "Capability Building": [
        "capability building",
        "build capability",
        "built capability",
        "capability framework",
        "establish framework",
        "established framework",
        "framework and standards",
        "build function",
        "built function",
    ],
    "Stakeholder Influence": [
        "stakeholder influence",
        "stakeholder management",
        "influenced stakeholders",
        "executive stakeholders",
        "senior stakeholders",
    ],
    "Strategic Partnership": [
        "strategic partnership",
        "strategic partner",
        "business partnership",
        "partnered with leadership",
        "senior leaders",
    ],
};
function extractSkills(text) {
    if (!text)
        return [];
    const extractedSkills = new Set();
    const lower = text.toLowerCase();
    // Use a simple word-boundary regex for each known skill
    for (const skill of COMMON_SKILLS) {
        // Escape special characters in skill name for regex
        const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
        if (regex.test(text)) {
            extractedSkills.add(skill);
        }
    }
    // Deterministic capability extraction from full resume text.
    for (const [capability, patterns] of Object.entries(LEADERSHIP_CAPABILITY_PATTERNS)) {
        if (patterns.some(pattern => lower.includes(pattern))) {
            extractedSkills.add(capability);
        }
    }
    return Array.from(extractedSkills);
}
