import type { ProfileInput } from "./role-matcher";

export interface RecommendedRole {
    role_name: string;
    rationale: string;
}

export interface RoleRecommendations {
    best_fit_roles: RecommendedRole[];   // high overlap with current profile
    bridge_roles: RecommendedRole[];     // 1–2 skill gaps away; achievable with short-term effort
    stretch_roles: RecommendedRole[];    // longer leap; requires sustained development
}

interface MatchSummary {
    match_score: number;
    matched_skills: string[];
    missing_skills: string[];
    target_title?: string | null;
}

// Role catalogue: domain → seniority variants with required skill signals
const ROLE_CATALOGUE: Array<{
    role_name: string;
    domain: string;
    seniority: "junior" | "mid" | "senior" | "lead";
    required_signals: string[];       // skills that strongly signal fit
    domain_signals: string[];         // broader domain membership signals
}> = [
        // Analytics
        { role_name: "Digital Analyst", domain: "analytics", seniority: "mid", required_signals: ["Google Analytics", "SQL", "Tableau"], domain_signals: ["data", "analytics", "reporting"] },
        { role_name: "Senior Digital Analyst", domain: "analytics", seniority: "senior", required_signals: ["Google Analytics 4", "SQL", "Power BI"], domain_signals: ["analytics", "insights"] },
        { role_name: "Data Analyst", domain: "data", seniority: "mid", required_signals: ["SQL", "Python", "Tableau"], domain_signals: ["data", "analytics"] },
        { role_name: "Business Intelligence Analyst", domain: "data", seniority: "mid", required_signals: ["Power BI", "SQL", "Tableau"], domain_signals: ["data", "reporting"] },
        { role_name: "Marketing Analyst", domain: "marketing", seniority: "mid", required_signals: ["Google Analytics", "SEM", "Google Ads"], domain_signals: ["marketing", "analytics"] },

        // Marketing
        { role_name: "Paid Search Manager", domain: "marketing", seniority: "mid", required_signals: ["SEM", "Google Ads", "PPC"], domain_signals: ["paid search", "SEM"] },
        { role_name: "Performance Marketing Manager", domain: "marketing", seniority: "senior", required_signals: ["SEM", "Facebook Ads", "Google Ads"], domain_signals: ["performance", "paid"] },
        { role_name: "Programmatic Manager", domain: "marketing", seniority: "mid", required_signals: ["DV360", "The Trade Desk", "Programmatic Advertising"], domain_signals: ["programmatic", "DSP"] },
        { role_name: "Digital Marketing Specialist", domain: "marketing", seniority: "mid", required_signals: ["Google Ads", "SEO", "Google Analytics"], domain_signals: ["digital marketing"] },
        { role_name: "Growth Marketing Manager", domain: "marketing", seniority: "senior", required_signals: ["SEM", "Facebook Ads", "Google Analytics 4"], domain_signals: ["growth", "acquisition"] },
        { role_name: "Head of Performance Marketing", domain: "marketing", seniority: "lead", required_signals: ["SEM", "Facebook Ads", "Google Ads"], domain_signals: ["performance", "leadership"] },

        // Strategy / Consulting
        { role_name: "Strategy Analyst", domain: "strategy", seniority: "mid", required_signals: ["Stakeholder Management", "Data Analysis", "Presentation Skills"], domain_signals: ["strategy", "insights"] },
        { role_name: "Strategy Manager", domain: "strategy", seniority: "senior", required_signals: ["Stakeholder Management", "Leadership", "Data Analysis"], domain_signals: ["strategy"] },
        { role_name: "Management Consultant", domain: "consulting", seniority: "senior", required_signals: ["Stakeholder Management", "Data Analysis", "Leadership"], domain_signals: ["consulting", "strategy"] },

        // Product / Tech
        { role_name: "Product Analyst", domain: "product", seniority: "mid", required_signals: ["SQL", "Google Analytics", "Agile"], domain_signals: ["product", "analytics"] },
        { role_name: "Data Engineer", domain: "data", seniority: "mid", required_signals: ["Python", "SQL", "AWS"], domain_signals: ["data", "engineering"] },
        { role_name: "Marketing Technology Manager", domain: "marketing", seniority: "senior", required_signals: ["HubSpot", "Salesforce", "Google Tag Manager"], domain_signals: ["martech", "CRM"] },
        { role_name: "SEO Manager", domain: "marketing", seniority: "mid", required_signals: ["SEO", "Google Analytics", "Content Strategy"], domain_signals: ["SEO", "organic"] },
    ];

const SENIORITY_YEARS: Record<string, number> = {
    junior: 0,
    mid: 2,
    senior: 5,
    lead: 8,
};

function skillOverlap(profileSkills: string[], required: string[]): number {
    const ps = new Set(profileSkills.map(s => s.toLowerCase()));
    return required.filter(r => ps.has(r.toLowerCase())).length;
}

function domainMatch(profileSkills: string[], domainSignals: string[]): boolean {
    const ps = new Set(profileSkills.map(s => s.toLowerCase()));
    return domainSignals.some(d => ps.has(d.toLowerCase()) || [...ps].some(p => p.includes(d.toLowerCase())));
}

function recentlyTargeted(roleName: string, history: MatchSummary[]): boolean {
    return history.some(h => h.target_title?.toLowerCase().includes(roleName.toLowerCase().split(" ")[0]));
}

export function recommendRoles(
    profile: ProfileInput,
    matchHistory: MatchSummary[]
): RoleRecommendations {
    const years = profile.years_experience ?? 0;
    const skills = profile.skills;

    // Score each role in catalogue
    const scored = ROLE_CATALOGUE.map(role => {
        const overlap = skillOverlap(skills, role.required_signals);
        const maxOverlap = role.required_signals.length;
        const overlapRatio = maxOverlap > 0 ? overlap / maxOverlap : 0;
        const seniorityYears = SENIORITY_YEARS[role.seniority];
        const yearsFit = years >= seniorityYears;
        const domain = domainMatch(skills, role.domain_signals);
        const targeted = recentlyTargeted(role.role_name, matchHistory);

        // Composite score: skill overlap is primary signal
        const score = (overlapRatio * 60)
            + (yearsFit ? 20 : 0)
            + (domain ? 15 : 0)
            + (targeted ? 5 : 0);

        return { role, score, overlap, maxOverlap, yearsFit };
    });

    // Sort by score desc
    scored.sort((a, b) => b.score - a.score);

    // Best fit: score >= 60, 2+ required signals matched
    const bestFitItems = scored
        .filter(s => s.score >= 60 && s.overlap >= 2)
        .slice(0, 3);

    // Bridge: score 30–59, or 1 required signal + domain match — reachable with short effort
    const bestFitNames = new Set(bestFitItems.map(s => s.role.role_name));
    const bridgeItems = scored
        .filter(s => !bestFitNames.has(s.role.role_name) && s.score >= 30 && s.score < 60)
        .slice(0, 3);

    // Stretch: score < 30 but domain match — longer-term aspiration
    const bridgeNames = new Set(bridgeItems.map(s => s.role.role_name));
    const stretchItems = scored
        .filter(s => !bestFitNames.has(s.role.role_name) && !bridgeNames.has(s.role.role_name) && s.score >= 10 && s.role.seniority !== "junior")
        .slice(0, 3);

    function toRecommended(
        s: typeof scored[0],
        bucket: "best" | "bridge" | "stretch"
    ): RecommendedRole {
        const missing = s.role.required_signals
            .filter(r => !skills.map(sk => sk.toLowerCase()).includes(r.toLowerCase()))
            .slice(0, 2);
        const matched = s.role.required_signals
            .filter(r => skills.map(sk => sk.toLowerCase()).includes(r.toLowerCase()))
            .slice(0, 2);

        let rationale = "";
        if (bucket === "best") {
            rationale = matched.length > 0
                ? `Strong alignment — your ${matched.join(" and ")} experience maps directly to this role's core requirements.`
                : `Your profile signals strong fit based on domain and experience level.`;
        } else if (bucket === "bridge") {
            rationale = missing.length > 0
                ? `${s.overlap}/${s.maxOverlap} required skills matched. Build ${missing.join(" and ")} to close the gap.`
                : `Good domain alignment. Bridging ${s.maxOverlap - s.overlap} skill area(s) makes this achievable.`;
        } else {
            rationale = missing.length > 0
                ? `A longer-term aspiration. Requires developing ${missing.join(", ")} and deeper ${s.role.domain} domain experience.`
                : `High-growth path. Focused investment in ${s.role.domain} over 6–12 months makes this reachable.`;
        }

        return { role_name: s.role.role_name, rationale };
    }

    return {
        best_fit_roles: bestFitItems.map(s => toRecommended(s, "best")),
        bridge_roles: bridgeItems.map(s => toRecommended(s, "bridge")),
        stretch_roles: stretchItems.map(s => toRecommended(s, "stretch")),
    };
}
