import type { DomainSpecialization } from "@/lib/career-engine/job-copilot/domain-ontology-config";

// Specialization explanation templates are presentation-only and deterministic.
export type ExplanationSpecialization =
    | "marketing_measurement"
    | "product_analytics"
    | "people_analytics"
    | "analytics_consulting"
    | "financial_planning_analysis"
    | "bi_reporting"
    | "data_platform"
    | "sales_operations"
    | "business_operations"
    | "customer_analytics";

export type SpecializationExplanationTemplate = {
    why_fit_template: string;
    risk_template: string;
    calibration_questions: readonly [string, string, string];
};

export const SPECIALIZATION_EXPLANATION_MAP: Record<
ExplanationSpecialization,
SpecializationExplanationTemplate
> = {
    marketing_measurement: {
        why_fit_template: "This role centers on marketing measurement decisions, and your strongest evidence in {strength_1} aligns with that operating context.",
        risk_template: "The main risk is proving direct ownership of measurement choices such as attribution, incrementality, or media effectiveness in {risk_1}.",
        calibration_questions: [
            "Have you directly owned attribution, incrementality, or MMM analysis end to end?",
            "Have your measurement outputs directly changed media budget or channel strategy decisions?",
            "Have you partnered with marketing stakeholders to action campaign measurement insights?",
        ],
    },
    product_analytics: {
        why_fit_template: "This role leans on product analytics judgment, and your background in {strength_1} maps to product decision support.",
        risk_template: "The key risk is demonstrating clear ownership depth in product analytics and experimentation decisions around {risk_1}.",
        calibration_questions: [
            "Have you directly owned product analytics or experimentation programs end to end?",
            "Have your insights changed roadmap, feature, or growth decisions?",
            "Have you worked closely with product and engineering to implement analytics recommendations?",
        ],
    },
    people_analytics: {
        why_fit_template: "This role is people analytics-heavy, and your evidence in {strength_1} is relevant to workforce and talent decisions.",
        risk_template: "The core risk is showing direct people analytics ownership beyond reporting, especially in {risk_1}.",
        calibration_questions: [
            "Have you directly owned people analytics workstreams such as attrition, workforce planning, or talent analytics?",
            "Have your analyses influenced HR or leadership decisions on hiring, retention, or org design?",
            "Have you partnered with HR leaders to operationalize employee-data insights?",
        ],
    },
    analytics_consulting: {
        why_fit_template: "This role depends on analytics consulting delivery, and your experience in {strength_1} supports advisory-style execution.",
        risk_template: "The main risk is proving sustained client-facing analytics ownership, especially where {risk_1} is expected.",
        calibration_questions: [
            "Have you led analytics consulting engagements from diagnosis through recommendation delivery?",
            "Have you presented analytics narratives directly to client or executive stakeholders?",
            "Have your recommendations led to measurable business or operating outcomes?",
        ],
    },
    financial_planning_analysis: {
        why_fit_template: "This role aligns with FP&A-style planning and performance work, and your strength in {strength_1} supports that scope.",
        risk_template: "The risk is whether your background shows direct FP&A ownership in forecasting, variance, and planning decisions tied to {risk_1}.",
        calibration_questions: [
            "Have you directly owned FP&A planning cycles such as budgeting, forecasting, and variance analysis?",
            "Have your analyses influenced investment, spend, or performance management decisions?",
            "Have you partnered with commercial or functional leaders to drive planning actions?",
        ],
    },
    bi_reporting: {
        why_fit_template: "This role is centered on BI/reporting delivery, and your evidence in {strength_1} aligns with recurring KPI and dashboard execution.",
        risk_template: "The main risk is proving production-level ownership depth of reporting systems where {risk_1} matters.",
        calibration_questions: [
            "Have you directly owned recurring KPI reporting or dashboard delivery in production?",
            "Have you defined reporting logic or metric governance used by decision makers?",
            "Have you maintained report quality and reliability across stakeholder teams?",
        ],
    },
    data_platform: {
        why_fit_template: "This role is data-platform oriented, and your strongest evidence in {strength_1} aligns with platform reliability and enablement work.",
        risk_template: "The key risk is proving architecture-level platform ownership rather than analytics consumption support in {risk_1}.",
        calibration_questions: [
            "Have you directly owned data platform architecture or roadmap decisions?",
            "Have you led platform reliability, governance, or enablement improvements at scale?",
            "Have you partnered with engineering teams to deliver platform capabilities used by many users?",
        ],
    },
    sales_operations: {
        why_fit_template: "This role is sales-operations specific, and your experience in {strength_1} maps to revenue process and pipeline governance work.",
        risk_template: "The risk is demonstrating direct sales operations ownership beyond reporting, especially around {risk_1}.",
        calibration_questions: [
            "Have you directly owned sales operations processes such as pipeline governance or territory planning?",
            "Have your analyses changed go-to-market execution or sales process decisions?",
            "Have you partnered with sales leadership to improve forecast quality or CRM discipline?",
        ],
    },
    business_operations: {
        why_fit_template: "This role is business-operations focused, and your strongest evidence in {strength_1} aligns with operating cadence and coordination needs.",
        risk_template: "The key risk is proving direct ownership of cross-functional operating mechanisms where {risk_1} is critical.",
        calibration_questions: [
            "Have you directly owned business operations rhythms such as operating reviews or planning cadences?",
            "Have you coordinated cross-functional execution to deliver measurable operational improvements?",
            "Have you built governance mechanisms that improved accountability and delivery outcomes?",
        ],
    },
    customer_analytics: {
        why_fit_template: "This role emphasizes customer analytics, and your evidence in {strength_1} aligns with customer behavior and lifecycle decision support.",
        risk_template: "The main risk is proving direct customer analytics ownership that informs growth, retention, or lifecycle decisions in {risk_1}.",
        calibration_questions: [
            "Have you directly owned customer analytics work such as segmentation, lifecycle, or retention analysis?",
            "Have your insights changed customer strategy, targeting, or lifecycle decisions?",
            "Have you partnered with commercial or marketing teams to operationalize customer insights?",
        ],
    },
} as const;

const SPECIALIZATION_EXPLANATION_ALIAS_MAP: Record<string, ExplanationSpecialization> = {
    "fp&a": "financial_planning_analysis",
    fpa: "financial_planning_analysis",
    financial_planning_analysis: "financial_planning_analysis",
    audience_analytics: "customer_analytics",
    ecommerce_analytics: "customer_analytics",
    consumer_insights: "customer_analytics",
    customer_analytics: "customer_analytics",
};

export function resolveExplanationSpecialization(
    specialization: string | DomainSpecialization | null | undefined,
): ExplanationSpecialization | null {
    if (!specialization) return null;
    const mapped = SPECIALIZATION_EXPLANATION_ALIAS_MAP[specialization];
    if (mapped) return mapped;
    if (specialization in SPECIALIZATION_EXPLANATION_MAP) {
        return specialization as ExplanationSpecialization;
    }
    return null;
}

export function getSpecializationExplanationTemplate(
    specialization: string | DomainSpecialization | null | undefined,
): SpecializationExplanationTemplate | null {
    const resolved = resolveExplanationSpecialization(specialization);
    if (!resolved) return null;
    return SPECIALIZATION_EXPLANATION_MAP[resolved];
}

export function formatSpecializationTemplate(
    template: string,
    context: {
        specializationLabel: string;
        strength_1: string;
        risk_1: string;
    },
): string {
    return template
        .replace(/\{specialization\}/g, context.specializationLabel)
        .replace(/\{strength_1\}/g, context.strength_1)
        .replace(/\{risk_1\}/g, context.risk_1);
}

export function toSpecializationLabel(specialization: string | null | undefined): string {
    if (!specialization) return "this specialization";
    return specialization.replace(/_/g, " ");
}
