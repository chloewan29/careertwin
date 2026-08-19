import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const customerInsightsLead: GenericRoleArchetype = freezeRole({
  roleFamilyId: "customer-insights-lead",
  canonicalTitle: "Customer Insights Lead",
  aliases: ["Consumer Insights Lead"],
  searchTitles: ["Voice of Customer Lead", "Customer Research Manager"],
  domain: "customer-insights",
  primaryMandate: "Own the customer-understanding agenda and turn customer evidence into strategic action.",
  primaryOwnership: ["customer insight agenda", "customer research and evidence synthesis", "customer-centred decision influence"],
  identityDefiningCapabilities: [
    capability("research-design", "must", "Owned research designed around a consequential customer question."),
    capability("insight-synthesis", "must", "Integrated customer evidence into a decision-ready point of view."),
    capability("customer-segmentation", "must", "Used meaningful customer groups to change strategy or experience decisions."),
  ],
  coreEnablers: [
    capability("audience-insight", "should", "Connected behavioural or attitudinal evidence to customer choices."),
    capability("strategic-analysis", "should", "Translated customer evidence into strategic implications."),
  ],
  supportingCapabilities: [
    capability("cross-functional-delivery", "should", "Worked across functions to embed customer evidence in delivery."),
  ],
  differentiators: [
    capability("customer-adoption", "differentiator", "Connected insight-led change to customer adoption or behaviour.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("customer-agenda", "research-design", "owned_outcome", "Set a customer-learning agenda and commissioned or led appropriate research."),
    expectation("customer-synthesis", "insight-synthesis", "stakeholder_scope", "Synthesised multiple customer signals into a recommendation used by decision makers."),
    expectation("customer-change", "customer-adoption", "commercial_impact", "Demonstrated a customer-centred change and observable response."),
  ],
});
