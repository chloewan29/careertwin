import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const analyticsManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "analytics-manager",
  canonicalTitle: "Analytics Manager",
  aliases: ["Data Analytics Manager"],
  searchTitles: ["Insights Analytics Lead", "Business Intelligence Manager"],
  domain: "analytics",
  primaryMandate: "Set analytics direction and ensure trusted analysis changes business decisions.",
  primaryOwnership: ["analytics priorities", "analytical quality and trusted metrics", "analytics delivery and adoption"],
  identityDefiningCapabilities: [
    capability("measurement-design", "must", "Owned an analytical measurement approach tied to a decision."),
    capability("analytics-governance", "must", "Established trusted definitions, quality controls, or analytical standards."),
  ],
  coreEnablers: [
    capability("insight-synthesis", "must", "Synthesised analysis into a clear decision direction."),
    capability("cross-functional-delivery", "should", "Coordinated analytical delivery across business and technical partners."),
  ],
  supportingCapabilities: [
    capability("strategic-analysis", "should", "Used structured analysis to shape priorities and trade-offs."),
  ],
  differentiators: [
    capability("benefits-realisation", "differentiator", "Demonstrated adoption and measurable value from an analytics programme.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("analytics-direction", "measurement-design", "owned_outcome", "Set analytical priorities and connected measurement to an organisational decision."),
    expectation("trusted-analytics", "analytics-governance", "governance", "Established trusted metrics, review practices, or analytical quality controls."),
    expectation("analytics-adoption", "benefits-realisation", "commercial_impact", "Showed that analytical work was adopted and changed an outcome."),
  ],
});
