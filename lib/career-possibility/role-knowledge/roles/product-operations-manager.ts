import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const productOperationsManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "product-operations-manager",
  canonicalTitle: "Product Operations Manager",
  aliases: [],
  searchTitles: [],
  domain: "product",
  primaryMandate: "Set product operating rhythm and scale delivery tools/processes.",
  primaryOwnership: ["product operating cadence","tooling","cross-functional alignment"],
  identityDefiningCapabilities: [
    capability("product-cadence", "must", "Established a repeatable product-management cycle."),
    capability("process-improvement", "must", "Simplified product workflows."),
  ],
  coreEnablers: [
    capability("tooling-enablement", "must", "Administered product tools and systems."),
    capability("cross-functional-delivery", "should", "Coordinated launches across functions."),
  ],
  supportingCapabilities: [

  ],
  differentiators: [
    capability("operating-model", "differentiator", "Designed product organizational structure.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("product-rhythm", "product-cadence", "governance", "Ran the product management cycle."),
    expectation("ops-improvement", "process-improvement", "delivery", "Fixed product workflows."),
  ],
});
