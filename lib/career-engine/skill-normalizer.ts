export interface NormalizedSkill {
    raw: string;
    normalized: string;
    category: "language" | "framework" | "platform" | "tool" | "soft" | "methodology" | "analytics" | "marketing" | "data" | "other";
}

// Alias → canonical name (lowercase alias keys)
export const SKILL_ALIASES: Record<string, string> = {
    // Languages
    "js": "JavaScript", "javascript": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "py": "Python", "python": "Python",
    "golang": "Go", "go": "Go",
    "c++": "C++", "cpp": "C++",
    "c#": "C#", "csharp": "C#",

    // Frameworks
    "node": "Node.js", "nodejs": "Node.js", "node.js": "Node.js",
    "reactjs": "React", "react.js": "React", "react": "React",
    "vuejs": "Vue.js", "vue": "Vue.js", "vue.js": "Vue.js",
    "angularjs": "Angular", "angular": "Angular",
    "nextjs": "Next.js", "next.js": "Next.js",
    "nuxtjs": "Nuxt.js", "nuxt": "Nuxt.js",
    "express": "Express.js", "expressjs": "Express.js",
    "fastapi": "FastAPI",
    "django": "Django", "flask": "Flask", "spring": "Spring Boot",

    // Cloud / Platforms
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "Google Cloud", "google cloud platform": "Google Cloud",
    "azure": "Microsoft Azure", "ms azure": "Microsoft Azure",
    "k8s": "Kubernetes", "kubernetes": "Kubernetes",
    "docker": "Docker",
    "terraform": "Terraform",
    "ci/cd": "CI/CD", "cicd": "CI/CD",

    // Databases
    "pg": "PostgreSQL", "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
    "mysql": "MySQL", "mongo": "MongoDB", "mongodb": "MongoDB",
    "redis": "Redis", "elasticsearch": "Elasticsearch",

    // Tools
    "git": "Git", "github": "GitHub", "gitlab": "GitLab",
    "jira": "Jira", "confluence": "Confluence", "notion": "Notion",
    "figma": "Figma", "sketch": "Sketch",
    "postman": "Postman", "swagger": "Swagger",
    "vs code": "VS Code", "vscode": "VS Code",

    // Analytics & Data
    "ga": "Google Analytics", "ga4": "Google Analytics 4", "google analytics": "Google Analytics",
    "google analytics 4": "Google Analytics 4",
    "gtm": "Google Tag Manager", "google tag manager": "Google Tag Manager",
    "looker studio": "Looker Studio", "data studio": "Looker Studio",
    "tableau": "Tableau",
    "power bi": "Power BI", "powerbi": "Power BI",
    "excel": "Microsoft Excel", "microsoft excel": "Microsoft Excel",
    "google sheets": "Google Sheets",
    "sql": "SQL", "bigquery": "BigQuery", "strong sql proficiency": "SQL", "sql proficiency": "SQL",
    "dbt": "dbt", "airflow": "Apache Airflow",
    "spark": "Apache Spark",
    "data analysis": "Data Analysis", "data analytics": "Data Analysis", "behavioral insights": "Data Analysis", "data analytics / behavioral insights": "Data Analysis",
    "1st & 3rd party data experience": "Research & Measurement", "research / measurement capability": "Research & Measurement", "measurement capability": "Research & Measurement", "research": "Research & Measurement",

    // Marketing / Advertising
    "sem": "SEM", "search engine marketing": "SEM",
    "seo": "SEO", "search engine optimisation": "SEO", "search engine optimization": "SEO",
    "ppc": "PPC", "paid search": "Paid Search",
    "paid social": "Paid Social",
    "facebook ads": "Facebook Ads", "meta ads": "Facebook Ads",
    "google ads": "Google Ads", "adwords": "Google Ads",
    "dv360": "DV360", "display & video 360": "DV360",
    "the trade desk": "The Trade Desk", "ttd": "The Trade Desk",
    "programmatic": "Programmatic Advertising",
    "dsp": "DSP", "ssp": "SSP", "dmp": "DMP",
    "hubspot": "HubSpot", "salesforce": "Salesforce",
    "mailchimp": "Mailchimp", "klaviyo": "Klaviyo",
    "marketo": "Marketo",
    "content strategy": "Content Strategy",
    "social media": "Social Media",
    "influencer marketing": "Influencer Marketing",
    "email marketing": "Email Marketing",
    "affiliate marketing": "Affiliate Marketing",

    // Soft / Methodology
    "agile": "Agile", "scrum": "Scrum", "kanban": "Kanban",
    "waterfall": "Waterfall",
    "communication": "Communication", "leadership": "Leadership", "team management": "Leadership", "lead delivery": "Leadership", "team building": "Leadership",
    "problem solving": "Problem Solving", "critical thinking": "Critical Thinking",
    "storytelling": "Storytelling", "presentation": "Presentation Skills", "narrative / visual storytelling": "Storytelling", "visual storytelling": "Storytelling", "presentation skills": "Presentation Skills",
    "stakeholder management": "Stakeholder Management",
    "project management": "Project Management",
    "campaign management": "Campaign Management",
    "sem campaign management": "SEM Campaign Management",
};

const CATEGORY_MAP: Record<string, NormalizedSkill["category"]> = {
    // Languages
    JavaScript: "language", TypeScript: "language", Python: "language",
    Java: "language", "C++": "language", "C#": "language", Go: "language",
    Ruby: "language", Swift: "language", Kotlin: "language", Rust: "language",
    PHP: "language", Scala: "language", HTML: "language", CSS: "language",

    // Frameworks
    React: "framework", "Vue.js": "framework", Angular: "framework",
    "Next.js": "framework", "Nuxt.js": "framework", "Express.js": "framework",
    Django: "framework", Flask: "framework", "Spring Boot": "framework",
    FastAPI: "framework",

    // Platforms
    AWS: "platform", "Google Cloud": "platform", "Microsoft Azure": "platform",
    Kubernetes: "platform", Docker: "platform", Terraform: "platform",
    "CI/CD": "platform", GitHub: "platform", GitLab: "platform",

    // Tools
    Git: "tool", Jira: "tool", Figma: "tool", Sketch: "tool",
    Postman: "tool", Confluence: "tool", Notion: "tool",
    "VS Code": "tool", Swagger: "tool",

    // Analytics / Data
    "Google Analytics": "analytics", "Google Analytics 4": "analytics",
    "Google Tag Manager": "analytics", "Looker Studio": "analytics",
    Tableau: "analytics", "Power BI": "analytics", "Microsoft Excel": "analytics",
    "Google Sheets": "analytics", SQL: "data", MySQL: "data",
    PostgreSQL: "data", MongoDB: "data", Redis: "data",
    Elasticsearch: "data", BigQuery: "data", "dbt": "data",
    "Apache Airflow": "data", "Apache Spark": "data",
    "Data Analysis": "analytics", "Research & Measurement": "analytics",

    // Marketing
    SEM: "marketing", SEO: "marketing", PPC: "marketing",
    "Paid Search": "marketing", "Paid Social": "marketing",
    "Facebook Ads": "marketing", "Google Ads": "marketing",
    DV360: "marketing", "The Trade Desk": "marketing",
    "Programmatic Advertising": "marketing",
    DSP: "marketing", SSP: "marketing", DMP: "marketing",
    HubSpot: "marketing", Salesforce: "marketing", Mailchimp: "marketing",
    Klaviyo: "marketing", Marketo: "marketing",
    "Content Strategy": "marketing", "Social Media": "marketing",
    "Influencer Marketing": "marketing", "Email Marketing": "marketing",
    "Affiliate Marketing": "marketing", "Campaign Management": "marketing",
    "SEM Campaign Management": "marketing",

    // Soft / Methodology
    Agile: "methodology", Scrum: "methodology", Kanban: "methodology",
    Waterfall: "methodology", "Project Management": "methodology",
    Communication: "soft", Leadership: "soft", "Problem Solving": "soft",
    "Critical Thinking": "soft", Storytelling: "soft",
    "Presentation Skills": "soft", "Stakeholder Management": "soft",
};

export function normalizeSkill(rawSkill: string): NormalizedSkill {
    const trimmed = rawSkill.trim();
    const lower = trimmed.toLowerCase();
    const canonical = SKILL_ALIASES[lower] ?? trimmed;
    const category = CATEGORY_MAP[canonical] ?? "other";
    return { raw: trimmed, normalized: canonical, category };
}

export function normalizeSkills(rawSkills: string[]): NormalizedSkill[] {
    const seen = new Set<string>();
    const result: NormalizedSkill[] = [];
    for (const raw of rawSkills) {
        const ns = normalizeSkill(raw);
        const key = ns.normalized.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(ns);
        }
    }
    return result;
}
