const COMMON_SKILLS = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP",
    "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQL", "NoSQL",
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform", "CI/CD",
    "Machine Learning", "Data Science", "AI", "TensorFlow", "PyTorch", "Pandas",
    "Git", "GitHub", "GitLab", "Agile", "Scrum", "Jira", "Figma",
    "HTML", "CSS", "Sass", "Tailwind CSS", "GraphQL", "REST", "API Design",
    "Linux", "Unix", "Bash", "Shell Scripting"
];

export function extractSkills(text: string): string[] {
    if (!text) return [];

    const extractedSkills = new Set<string>();

    // Use a simple word-boundary regex for each known skill
    for (const skill of COMMON_SKILLS) {
        // Escape special characters in skill name for regex
        const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');

        if (regex.test(text)) {
            extractedSkills.add(skill);
        }
    }

    return Array.from(extractedSkills);
}
