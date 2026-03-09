import { normalizeSkill, normalizeSkills, type NormalizedSkill } from "./skill-normalizer";
import { normalizeTitle, type NormalizedTitle } from "./title-normalizer";

export interface ParsedJobDescription {
    target_title: string | null;
    normalized_title: NormalizedTitle | null;
    company: string | null;
    location: string | null;
    required_skills: NormalizedSkill[];
    preferred_skills: NormalizedSkill[];
    years_required: number | null;
    seniority_level: string | null;
    responsibilities: string[];
    raw_text: string;
}

// Section header patterns
const REQUIRED_RE = /^(?:required|must.have|minimum|what\s+you.ll\s+need|you\s+must\s+have|you\s+need|key\s+requirements?|essential\s+(?:skills?|qualifications?|experience)|qualifications?)\s*:?\s*$/i;
const PREFERRED_RE = /^(?:preferred|nice.to.have|bonus|desirable|what\s+would\s+be\s+great|advantageous)\s*:?\s*$/i;
const RESP_RE = /^(?:responsibilities|what\s+you.ll\s+do|the\s+role|your\s+role|key\s+duties|what\s+you\s+will\s+do|role\s+overview|about\s+the\s+role)\s*:?\s*$/i;
const ABOUT_RE = /^(?:about\s+us|about\s+the\s+company|who\s+we\s+are|the\s+company)\s*:?\s*$/i;

const TITLE_KEYWORDS = /engineer|developer|manager|analyst|designer|director|lead|specialist|coordinator|strategist|consultant|executive|officer|planner|buyer|trader|scientist/i;

const KNOWN_SKILLS = [
    // Languages
    "JavaScript", "TypeScript", "Python", "Java", "Go", "Ruby", "Swift", "Kotlin", "C++", "C#", "PHP", "Scala", "HTML", "CSS",
    // Frameworks
    "React", "Vue", "Angular", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring", "FastAPI",
    // Cloud / DevOps
    "AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Git", "GitHub", "GitLab",
    // Data
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "BigQuery", "dbt", "Spark", "Airflow",
    // Analytics
    "Google Analytics", "Google Analytics 4", "Google Tag Manager", "Looker Studio", "Tableau", "Power BI",
    "Microsoft Excel", "Google Sheets",
    // Marketing
    "SEM", "SEO", "PPC", "Paid Search", "Paid Social", "Facebook Ads", "Google Ads", "DV360", "The Trade Desk",
    "Programmatic Advertising", "DSP", "SSP", "DMP", "HubSpot", "Salesforce", "Mailchimp", "Klaviyo", "Marketo",
    "Content Strategy", "Social Media", "Email Marketing", "Affiliate Marketing", "Campaign Management",
    "SEM Campaign Management", "Performance Marketing", "Digital Marketing",
    // Tools
    "Jira", "Confluence", "Figma", "Sketch", "Notion", "Postman", "Swagger", "Tableau", "Asana",
    // Methodology/Soft
    "Agile", "Scrum", "Kanban", "Project Management", "Stakeholder Management", "Communication", "Leadership",
    "Problem Solving", "Critical Thinking", "Storytelling", "Presentation Skills", "Data Analysis",
    "Data-driven", "A/B Testing", "Conversion Rate Optimisation",

    // Equivalencies & Specific Capability Phrases
    "Strong SQL Proficiency",
    "data analytics / behavioral insights",
    "team management", "lead delivery",
    "narrative / visual storytelling",
    "1st & 3rd party data experience", "research / measurement capability",
];

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSkillsFromText(text: string): NormalizedSkill[] {
    const found = KNOWN_SKILLS.filter(sk =>
        new RegExp(`\\b${escapeRe(sk)}\\b`, "i").test(text)
    );
    return normalizeSkills(found);
}

export function parseJobDescription(rawText: string): ParsedJobDescription {
    const result: ParsedJobDescription = {
        target_title: null,
        normalized_title: null,
        company: null,
        location: null,
        required_skills: [],
        preferred_skills: [],
        years_required: null,
        seniority_level: null,
        responsibilities: [],
        raw_text: rawText,
    };

    if (!rawText || rawText.trim().length === 0) return result;

    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    // --- Title: first short line containing a title keyword ---
    for (const line of lines.slice(0, 8)) {
        if (TITLE_KEYWORDS.test(line) && line.length < 90) {
            result.target_title = line.trim();
            result.normalized_title = normalizeTitle(line.trim());
            break;
        }
    }

    // --- Company: "About CompanyName" or "(at|@) Company" ---
    const companyM = rawText.match(/^about\s+(.+)$/im)
        ?? rawText.match(/(?:at|for|@)\s+([A-Z][a-zA-Z0-9& ]{2,40}?)(?:\s*[,.\n]|$)/m);
    if (companyM) {
        const raw = companyM[1].trim();
        // skip if it's a generic phrase
        if (!/the role|the position|this role/i.test(raw)) {
            result.company = raw;
        }
    }

    // --- Location ---
    const locationM = rawText.match(/\b((?:remote|hybrid|on-?site)[^,\n]*|\b[A-Z][a-z]+(?:,\s*[A-Z][a-zA-Z ]{1,20})?)\b(?=\s*$|\s*\||\s*·)/m);
    if (locationM) result.location = locationM[1].trim();

    // --- Years required ---
    const yrsM = rawText.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)/i);
    if (yrsM) result.years_required = parseInt(yrsM[1], 10);

    // --- Seniority ---
    const senMap: Array<[RegExp, string]> = [
        [/\b(junior|jr\.?|entry.level|graduate)\b/i, "junior"],
        [/\b(mid.level|intermediate)\b/i, "mid"],
        [/\b(senior|sr\.?)\b/i, "senior"],
        [/\b(lead|principal|staff)\b/i, "lead"],
        [/\b(manager|head of)\b/i, "manager"],
        [/\b(director)\b/i, "director"],
        [/\b(vp|vice president|chief|c-suite)\b/i, "executive"],
    ];
    for (const [re, level] of senMap) {
        if (re.test(rawText)) { result.seniority_level = level; break; }
    }

    // --- Section-based parsing ---
    type Section = "general" | "required" | "preferred" | "responsibilities" | "about";
    let section: Section = "general";

    const requiredLines: string[] = [];
    const preferredLines: string[] = [];
    const responsibilities: string[] = [];

    for (const line of lines) {
        if (REQUIRED_RE.test(line)) { section = "required"; continue; }
        if (PREFERRED_RE.test(line)) { section = "preferred"; continue; }
        if (RESP_RE.test(line)) { section = "responsibilities"; continue; }
        if (ABOUT_RE.test(line)) { section = "about"; continue; }

        if (section === "required") requiredLines.push(line);
        else if (section === "preferred") preferredLines.push(line);
        else if (section === "responsibilities") {
            const cleaned = line.replace(/^[-•·*]\s*/, "").trim();
            if (cleaned.length > 10) responsibilities.push(cleaned);
        }
    }

    const requiredText = requiredLines.join(" ");
    const preferredText = preferredLines.join(" ");

    result.required_skills = requiredText.trim()
        ? extractSkillsFromText(requiredText)
        : extractSkillsFromText(rawText);

    result.preferred_skills = preferredText.trim()
        ? extractSkillsFromText(preferredText).filter(
            ps => !result.required_skills.some(rs => rs.normalized === ps.normalized)
        )
        : [];

    result.responsibilities = responsibilities.slice(0, 10);

    return result;
}
