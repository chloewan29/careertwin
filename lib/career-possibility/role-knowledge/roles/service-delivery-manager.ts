import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const serviceDeliveryManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "service-delivery-manager",
  canonicalTitle: "Service Delivery Manager",
  aliases: [],
  searchTitles: [],
  domain: "operations",
  primaryMandate: "Ensure reliable delivery of services against agreed standards.",
  primaryOwnership: ["service performance","incident resolution","vendor operations"],
  identityDefiningCapabilities: [
    capability("service-performance", "must", "Owned SLA outcomes and service quality."),
    capability("cross-functional-delivery", "must", "Coordinated incident resolution across teams."),
  ],
  coreEnablers: [
    capability("operating-control", "must", "Enforced service quality and compliance."),
    capability("ecosystem-operations", "should", "Managed external vendor support."),
  ],
  supportingCapabilities: [
    capability("process-improvement", "should", "Drove continual service improvement."),
  ],
  differentiators: [
    capability("operating-rhythm", "differentiator", "Ran executive service reviews.", "governance"),
  ],
  evidenceExpectations: [
    expectation("sla-management", "service-performance", "owned_outcome", "Owned service performance and SLAs."),
    expectation("incident-management", "cross-functional-delivery", "delivery", "Delivered cross-team resolutions."),
  ],
});
