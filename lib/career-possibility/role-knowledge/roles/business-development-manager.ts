import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const businessDevelopmentManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "business-development-manager",
  canonicalTitle: "Business Development Manager",
  aliases: [],
  searchTitles: [],
  domain: "commercial",
  primaryMandate: "Acquire new business and drive market expansion.",
  primaryOwnership: ["new business pipeline","market targeting","deal closure"],
  identityDefiningCapabilities: [
    capability("pipeline-management", "must", "Governed the prospect sales funnel."),
    capability("market-strategy", "must", "Defined territory or prospect targeting strategy."),
  ],
  coreEnablers: [
    capability("consultative-selling", "must", "Uncovered needs and matched solutions to win deals."),
    capability("commercial-negotiation", "must", "Closed new business agreements."),
  ],
  supportingCapabilities: [
    capability("forecasting", "should", "Forecasted sales performance."),
  ],
  differentiators: [
    capability("commercial-partnerships", "differentiator", "Built channel or alliance partnerships.", "commercial_impact"),
  ],
  evidenceExpectations: [
    expectation("new-business", "pipeline-management", "commercial_impact", "Managed new business pipeline."),
    expectation("closing", "commercial-negotiation", "commercial_impact", "Negotiated and closed deals."),
  ],
});
