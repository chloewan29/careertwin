import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const fpaManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "fpa-manager",
  canonicalTitle: "FP&A Manager",
  aliases: [],
  searchTitles: [],
  domain: "finance",
  primaryMandate: "Govern the corporate financial model and investment process.",
  primaryOwnership: ["corporate forecasting","scenario models","budget process"],
  identityDefiningCapabilities: [
    capability("forecasting", "must", "Ran the corporate financial forecast."),
    capability("scenario-modelling", "must", "Built corporate financial models."),
  ],
  coreEnablers: [
    capability("investment-governance", "must", "Managed the capital allocation and budget process."),
    capability("variance-analysis", "must", "Consolidated company-wide financial variance."),
  ],
  supportingCapabilities: [
    capability("operating-rhythm", "should", "Ran the financial calendar."),
  ],
  differentiators: [
    capability("strategic-analysis", "differentiator", "Influenced corporate strategy through analysis.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("corporate-forecast", "forecasting", "owned_outcome", "Owned corporate forecasting."),
    expectation("budgeting", "investment-governance", "governance", "Governed the budget process."),
  ],
});
