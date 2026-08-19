import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const accountManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "account-manager",
  canonicalTitle: "Account Manager",
  aliases: [],
  searchTitles: [],
  domain: "commercial",
  primaryMandate: "Grow and retain existing client relationships.",
  primaryOwnership: ["account health","renewal pipeline","client growth"],
  identityDefiningCapabilities: [
    capability("account-growth", "must", "Expanded existing commercial relationships."),
    capability("commercial-negotiation", "must", "Executed renewal and pricing negotiations."),
  ],
  coreEnablers: [
    capability("consultative-selling", "should", "Pitched upsells based on client needs."),
    capability("pipeline-management", "must", "Governed the renewal sales funnel."),
  ],
  supportingCapabilities: [

  ],
  differentiators: [
    capability("benefits-realisation", "differentiator", "Tracked and proved client ROI.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("account-retention", "account-growth", "commercial_impact", "Retained and grew accounts."),
    expectation("renewals", "commercial-negotiation", "commercial_impact", "Negotiated renewals."),
  ],
});
