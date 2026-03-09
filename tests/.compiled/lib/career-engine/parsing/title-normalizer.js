"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTitle = normalizeTitle;
// Ordered by specificity — check longer phrases first
const SENIORITY_PATTERNS = [
    [/\b(chief|c-suite|ceo|cto|cpo|coo|cfo)\b/i, "executive"],
    [/\b(vice president|vp)\b/i, "executive"],
    [/\b(director|head of)\b/i, "director"],
    [/\b(principal|staff)\b/i, "lead"],
    [/\b(lead|senior lead)\b/i, "lead"],
    [/\b(senior|sr\.?)\b/i, "senior"],
    [/\b(manager|mgr)\b/i, "manager"],
    [/\b(mid[-\s]?level|intermediate)\b/i, "mid"],
    [/\b(associate|junior|jr\.?|graduate|graduate|entry.level)\b/i, "junior"],
];
// Title function/domain — ordered by specificity
const FUNCTION_PATTERNS = [
    [/machine\s+learning|ml\s+engineer/i, "Machine Learning"],
    [/data\s+science|data\s+scientist/i, "Data Science"],
    [/data\s+anal(yst|ytics)/i, "Data Analytics"],
    [/data\s+engineer/i, "Data Engineering"],
    [/business\s+anal(yst|ytics)|business\s+intelligence|bi\b/i, "Business Intelligence"],
    [/growth\s+(market(ing|er)|hack)/i, "Growth Marketing"],
    [/performance\s+market/i, "Performance Marketing"],
    [/digital\s+market/i, "Digital Marketing"],
    [/content\s+market/i, "Content Marketing"],
    [/product\s+market/i, "Product Marketing"],
    [/market(ing|er)\b(?!\s+\w*engineer)/i, "Marketing"],
    [/brand\s+(strat|manager|director)/i, "Brand Strategy"],
    [/strategy|strategist/i, "Strategy"],
    [/account\s+manager|client\s+(success|relations)/i, "Account Management"],
    [/sales|business\s+development|biz\s+dev/i, "Sales"],
    [/product\s+(manager|owner|lead)/i, "Product Management"],
    [/program\s+manager|project\s+manager/i, "Program Management"],
    [/devops|site\s+reliability|sre\b/i, "DevOps"],
    [/platform\s+engineer/i, "Platform Engineering"],
    [/infrastructure|infra\b/i, "Infrastructure"],
    [/security|appsec|infosec/i, "Security"],
    [/cloud\s+engineer|cloud\s+architect/i, "Cloud"],
    [/mobile|ios\b|android/i, "Mobile"],
    [/frontend|front.end|front\s+end/i, "Frontend"],
    [/backend|back.end|back\s+end/i, "Backend"],
    [/full.?stack/i, "Full Stack"],
    [/software\s+(engineer|developer|dev)\b/i, "Software Engineering"],
    [/ux|user\s+experience|ui\s+ux|interface\s+design/i, "UX/UI Design"],
    [/graphic|visual\s+design/i, "Graphic Design"],
    [/design(?!er\s)/i, "Design"],
    [/operations|ops\b/i, "Operations"],
    [/finance|financial\s+anal/i, "Finance"],
    [/hr|human\s+resources|people\s+(ops|partner)/i, "Human Resources"],
    [/communic|pr\b|public\s+relat/i, "Communications"],
];
// Canonical title map — exact/near-exact raw titles
const CANONICAL_TITLES = [
    [/digital\s+media\s+strategist/i, "Digital Media Strategist"],
    [/media\s+planner/i, "Media Planner"],
    [/media\s+buyer/i, "Media Buyer"],
    [/campaign\s+manager/i, "Campaign Manager"],
    [/programmatic\s+(trader|analyst|manager)/i, "Programmatic Trader"],
    [/sem\s+(specialist|manager|analyst)/i, "SEM Specialist"],
    [/seo\s+(specialist|manager|analyst)/i, "SEO Specialist"],
    [/paid\s+(search|social)\s*(specialist|manager|analyst)?/i, "Paid Media Specialist"],
    [/social\s+media\s+(manager|specialist|strategist)/i, "Social Media Manager"],
    [/marketing\s+analyst/i, "Marketing Analyst"],
    [/marketing\s+manager/i, "Marketing Manager"],
    [/marketing\s+director/i, "Marketing Director"],
    [/data\s+analyst/i, "Data Analyst"],
    [/business\s+analyst/i, "Business Analyst"],
    [/product\s+analyst/i, "Product Analyst"],
    [/growth\s+analyst/i, "Growth Analyst"],
    [/insights\s+analyst/i, "Insights Analyst"],
    [/revenue\s+analyst/i, "Revenue Analyst"],
    [/strategy\s+analyst/i, "Strategy Analyst"],
    [/brand\s+strategist/i, "Brand Strategist"],
    [/account\s+manager/i, "Account Manager"],
    [/account\s+director/i, "Account Director"],
    [/account\s+executive/i, "Account Executive"],
    [/software\s+engineer/i, "Software Engineer"],
    [/software\s+developer/i, "Software Developer"],
    [/frontend\s+(engineer|developer)/i, "Frontend Engineer"],
    [/backend\s+(engineer|developer)/i, "Backend Engineer"],
    [/full[- ]?stack\s+(engineer|developer)/i, "Full Stack Engineer"],
    [/mobile\s+(engineer|developer)/i, "Mobile Engineer"],
    [/devops\s+engineer/i, "DevOps Engineer"],
    [/cloud\s+engineer/i, "Cloud Engineer"],
    [/data\s+engineer/i, "Data Engineer"],
    [/machine\s+learning\s+engineer/i, "Machine Learning Engineer"],
    [/product\s+manager/i, "Product Manager"],
    [/product\s+owner/i, "Product Owner"],
    [/ux\s+(designer|researcher|lead)/i, "UX Designer"],
    [/ui\s+designer/i, "UI Designer"],
    [/graphic\s+designer/i, "Graphic Designer"],
    [/content\s+(strategist|manager|writer|creator)/i, "Content Strategist"],
    [/copywriter/i, "Copywriter"],
    [/project\s+manager/i, "Project Manager"],
    [/program\s+manager/i, "Program Manager"],
    [/operations\s+manager/i, "Operations Manager"],
    [/finance\s+(manager|analyst)/i, "Finance Manager"],
];
function normalizeTitle(rawTitle) {
    const trimmed = rawTitle.trim();
    // Canonical match
    let normalized = trimmed;
    for (const [pattern, canonical] of CANONICAL_TITLES) {
        if (pattern.test(trimmed)) {
            normalized = canonical;
            break;
        }
    }
    // Seniority
    let level = "unknown";
    for (const [pattern, seniority] of SENIORITY_PATTERNS) {
        if (pattern.test(trimmed)) {
            level = seniority;
            break;
        }
    }
    // Function domain
    let fn = null;
    for (const [pattern, domain] of FUNCTION_PATTERNS) {
        if (pattern.test(trimmed)) {
            fn = domain;
            break;
        }
    }
    return { raw: trimmed, normalized, level, function: fn };
}
