import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const salesDirector: GenericRoleArchetype = freezeRole({
  roleFamilyId: "sales-director",
  canonicalTitle: "Sales Director",
  aliases: [],
  searchTitles: [],
  domain: "commercial",
  primaryMandate: "Lead the sales organization and govern revenue strategy.",
  primaryOwnership: ["Sales strategy", "sales organization leadership", "revenue ownership"],
  identityDefiningCapabilities: [
    capability("commercial-leadership", "must", "Led the commercial function and revenue strategy."),
    capability("business-ownership", "must", "Owned the holistic P&L and business outcomes."),
  ],
  coreEnablers: [
    capability("market-strategy", "should", "Set market targeting and expansion strategies."),
    capability("pipeline-management", "should", "Governed the sales pipeline at scale."),
  ],
  supportingCapabilities: [],
  differentiators: [
    capability("people-leadership", "differentiator", "Built and led high-performing sales teams.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("sales-leadership", "commercial-leadership", "commercial_impact", "Led commercial teams to revenue targets."),
    expectation("revenue-ownership", "business-ownership", "commercial_impact", "Owned overall sales performance."),
  ],
});
