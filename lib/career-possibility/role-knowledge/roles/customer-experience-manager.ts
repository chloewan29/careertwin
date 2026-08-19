import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const customerExperienceManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "customer-experience-manager",
  canonicalTitle: "Customer Experience Manager",
  aliases: [],
  searchTitles: [],
  domain: "customer",
  primaryMandate: "Uncover customer needs and improve the end-to-end journey.",
  primaryOwnership: ["customer insights","journey mapping","CX measurement"],
  identityDefiningCapabilities: [
    capability("audience-insight", "must", "Systematically uncovered customer needs."),
    capability("process-improvement", "must", "Fixed broken customer journeys."),
  ],
  coreEnablers: [
    capability("measurement-design", "must", "Designed CX telemetry like NPS or CSAT."),
    capability("cross-functional-delivery", "should", "Fixed cross-silo customer issues."),
  ],
  supportingCapabilities: [

  ],
  differentiators: [
    capability("change-leadership", "differentiator", "Drove adoption of customer-centric culture.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("cx-insights", "audience-insight", "domain_expertise", "Mapped customer journeys and needs."),
    expectation("cx-improvement", "process-improvement", "delivery", "Improved the customer experience."),
  ],
});
