import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const strategyManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "strategy-manager",
  canonicalTitle: "Strategy Manager",
  aliases: [],
  searchTitles: [],
  domain: "strategy",
  primaryMandate: "Formulate enterprise/business strategy and strategic choices.",
  primaryOwnership: ["Strategic planning", "market strategy", "scenario modelling"],
  identityDefiningCapabilities: [
    capability("strategic-analysis", "must", "Conducted deep strategic and market analysis."),
    capability("market-strategy", "must", "Formulated go-to-market or growth strategies."),
  ],
  coreEnablers: [
    capability("scenario-modelling", "should", "Built complex scenario models."),
    capability("operating-strategy", "should", "Aligned operating model to strategy."),
  ],
  supportingCapabilities: [],
  differentiators: [
    capability("partner-strategy", "differentiator", "Defined strategic partnerships and alliances.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("strategic-direction", "strategic-analysis", "commercial_impact", "Set strategic direction based on evidence."),
    expectation("market-planning", "market-strategy", "commercial_impact", "Drove market strategy choices."),
  ],
});
