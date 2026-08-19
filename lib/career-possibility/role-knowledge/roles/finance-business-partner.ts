import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const financeBusinessPartner: GenericRoleArchetype = freezeRole({
  roleFamilyId: "finance-business-partner",
  canonicalTitle: "Finance Business Partner",
  aliases: [],
  searchTitles: [],
  domain: "finance",
  primaryMandate: "Provide commercial advice and financial analysis to business units.",
  primaryOwnership: ["business unit financials","commercial advice","variance reporting"],
  identityDefiningCapabilities: [
    capability("variance-analysis", "must", "Explained financial actuals vs plan."),
    capability("strategic-analysis", "must", "Provided commercial and strategic advice."),
  ],
  coreEnablers: [
    capability("insight-synthesis", "must", "Translated financial data into narrative."),
    capability("forecasting", "must", "Ran rolling business unit forecasts."),
  ],
  supportingCapabilities: [
  ],
  differentiators: [
    capability("benefits-realisation", "differentiator", "Tracked business case ROI.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("variance", "variance-analysis", "domain_expertise", "Explained financial variances."),
    expectation("advisory", "strategic-analysis", "stakeholder_scope", "Advised business leaders."),
  ],
});
