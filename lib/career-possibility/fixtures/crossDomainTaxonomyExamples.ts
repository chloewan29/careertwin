import { CAREER_TAXONOMY_VERSION, type CapabilityDefinition, type CareerDomain, type UniversalCapabilityFamily } from "../capability-taxonomy";
import { ROLE_ROADMAP_VERSION, type RoleFamilyDefinition } from "../role-roadmap";

const confidence = (notes: string) => ({
  minimumDistinctEvidence: 2,
  preferredEvidenceSignals: ["clear action", "named context", "observable outcome"],
  downgradeWhen: ["title-only inference", "generic responsibility without outcome"],
  notes,
});

const capability = (id: string, label: string, universalFamily: UniversalCapabilityFamily, domain: CareerDomain, roles: string[]): CapabilityDefinition => ({
  id,
  label,
  universalFamily,
  domain,
  description: `${label} demonstrated through domain-relevant decisions and outcomes.`,
  exampleSignals: ["owned a defined outcome", "adapted judgment to domain constraints"],
  exampleEvidencePatterns: ["action + scope + result", "problem + decision + outcome"],
  relatedRoleFamilies: roles,
  transferabilityLevel: universalFamily === "Technology / Systems" ? "cross_domain" : "domain_specific",
  confidenceRules: confidence(`Require evidence appropriate to ${domain}; do not infer from title alone.`),
  taxonomyVersion: CAREER_TAXONOMY_VERSION,
});

export const crossDomainCapabilityDefinitions: CapabilityDefinition[] = [
  capability("data.insight-synthesis", "Insight Synthesis", "Analytical Thinking", "Analytics / Data", ["analytics-lead", "insights-partner"]),
  capability("people.workforce-partnering", "Workforce Partnering", "Stakeholder Influence", "HR / People", ["people-partner", "workforce-strategy"]),
  capability("finance.planning-analysis", "Financial Planning & Analysis", "Commercial Thinking", "Finance", ["fpa", "commercial-finance"]),
  capability("sales.strategic-account-growth", "Strategic Account Growth", "Customer / User Understanding", "Sales", ["strategic-accounts", "revenue-growth"]),
  capability("sales.value-storytelling", "Commercial Value Storytelling", "Communication & Storytelling", "Sales", ["strategic-accounts", "revenue-growth"]),
  capability("marketing.integrated-campaign", "Integrated Campaign Strategy", "Creativity / Content", "Marketing", ["marketing-lead", "brand-strategy"]),
  capability("product.discovery-prioritisation", "Product Discovery & Prioritisation", "Strategy & Prioritisation", "Product", ["product-management", "product-operations"]),
  capability("engineering.system-design", "System Design", "Technology / Systems", "Engineering", ["engineering-lead", "solutions-architecture"]),
  capability("operations.service-optimisation", "Service Operations Optimisation", "Process & Operations", "Operations", ["operations-management", "continuous-improvement"]),
  capability("success.adoption-retention", "Customer Adoption & Retention", "Customer / User Understanding", "Customer Success", ["customer-success-lead", "customer-growth"]),
  capability("program.cross-functional-delivery", "Cross-functional Program Delivery", "Execution & Delivery", "Project / Program", ["program-management", "transformation"]),
  capability("education.learning-design", "Learning Design", "Research / Learning", "Education", ["learning-design", "education-programs"]),
  capability("healthcare.care-coordination", "Care Coordination", "Risk / Governance", "Healthcare", ["clinical-operations", "care-programs"]),
  capability("legal.advisory-risk", "Legal Advisory & Risk Interpretation", "Risk / Governance", "Legal", ["legal-counsel", "compliance-advisory"]),
  capability("management.business-unit-leadership", "Business Unit Leadership", "Leadership & Coaching", "General Management", ["general-management", "operations-director"]),
  capability("founder.venture-building", "Venture Building", "Commercial Thinking", "Founder / Small Business", ["founder-operator", "small-business-management"]),
];

const role = (roleFamilyId: string, roleFamilyLabel: string, domain: CareerDomain, requiredCapabilities: string[], titles: string[]): RoleFamilyDefinition => ({
  roleFamilyId,
  roleFamilyLabel,
  domain,
  requiredCapabilities,
  supportingCapabilityFamilies: ["Execution & Delivery", "Stakeholder Influence"],
  commonSearchTitles: titles,
  commonGaps: [{ label: "Role-level scope", type: "missing_proof", description: "Confirm ownership at the scope expected by this role." }],
  credibilityRules: [{ description: "At least one domain capability plus two pieces of transferable outcome evidence.", minimumCapabilityMatches: 1, requiredEvidenceCount: 2, acceptableCapabilityIds: requiredCapabilities }],
  evidenceRequirements: [{ label: "Outcome evidence", description: "A concrete action with an observable result.", minimumCount: 2, preferredSignals: ["ownership", "scope", "impact"] }],
  roadmapVersion: ROLE_ROADMAP_VERSION,
});

export const crossDomainRoleFamilies: RoleFamilyDefinition[] = [
  role("analytics-lead", "Analytics & Insights Leadership", "Analytics / Data", ["data.insight-synthesis"], ["Analytics Lead", "Insights Manager"]),
  role("people-partner", "People & Culture Business Partnering", "HR / People", ["people.workforce-partnering"], ["HR Business Partner", "People Partner"]),
  role("fpa", "Financial Planning & Analysis", "Finance", ["finance.planning-analysis"], ["FP&A Manager", "Finance Business Partner"]),
  role("strategic-accounts", "Strategic Accounts & Partnerships", "Sales", ["sales.strategic-account-growth"], ["Strategic Account Director", "Partnerships Lead"]),
  role("marketing-lead", "Integrated Marketing Leadership", "Marketing", ["marketing.integrated-campaign"], ["Marketing Manager", "Integrated Marketing Lead"]),
  role("product-management", "Product Management", "Product", ["product.discovery-prioritisation"], ["Product Manager", "Product Operations Lead"]),
  role("engineering-lead", "Engineering Leadership", "Engineering", ["engineering.system-design"], ["Engineering Manager", "Technical Lead"]),
  role("operations-management", "Operations Management", "Operations", ["operations.service-optimisation"], ["Operations Manager", "Service Operations Lead"]),
  role("customer-success-lead", "Customer Success Leadership", "Customer Success", ["success.adoption-retention"], ["Customer Success Manager", "Customer Growth Lead"]),
  role("program-management", "Project & Program Management", "Project / Program", ["program.cross-functional-delivery"], ["Program Manager", "Senior Project Manager"]),
  role("clinical-operations", "Clinical & Care Operations", "Healthcare", ["healthcare.care-coordination"], ["Clinical Operations Manager", "Care Program Lead"]),
  role("learning-design", "Learning & Education Design", "Education", ["education.learning-design"], ["Learning Designer", "Education Program Manager"]),
  role("legal-counsel", "Legal Advisory", "Legal", ["legal.advisory-risk"], ["Legal Counsel", "Risk & Compliance Advisor"]),
  role("general-management", "General Management", "General Management", ["management.business-unit-leadership"], ["General Manager", "Business Unit Director"]),
];
