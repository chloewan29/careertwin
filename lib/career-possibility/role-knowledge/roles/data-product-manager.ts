import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const dataProductManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "data-product-manager",
  canonicalTitle: "Data Product Manager",
  aliases: ["Data Products Lead"],
  searchTitles: ["Analytics Product Manager", "Data Platform Product Manager"],
  domain: "data-product",
  primaryMandate: "Own reusable data-product outcomes from user discovery through roadmap, adoption, and lifecycle decisions.",
  primaryOwnership: ["data-product outcomes", "user discovery and roadmap priorities", "cross-functional lifecycle and adoption"],
  identityDefiningCapabilities: [
    capability("product-insights", "must", "Used user and product evidence to define a data-product problem."),
    capability("roadmap-governance", "must", "Owned transparent prioritisation and roadmap trade-offs."),
    capability("product-cadence", "must", "Maintained a product operating cadence across discovery, delivery, and learning."),
  ],
  coreEnablers: [
    capability("cross-functional-delivery", "must", "Aligned data, engineering, analytics, and business contributors around outcomes."),
    capability("tooling-enablement", "should", "Enabled reliable use of reusable data capabilities."),
  ],
  supportingCapabilities: [
    capability("analytics-governance", "should", "Applied trust and governance expectations to data-product decisions."),
  ],
  differentiators: [
    capability("customer-adoption", "differentiator", "Demonstrated sustained adoption of a reusable data product.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("data-product-discovery", "product-insights", "domain_expertise", "Used user discovery to define a data-product outcome rather than a delivery output."),
    expectation("roadmap-tradeoffs", "roadmap-governance", "owned_outcome", "Owned roadmap prioritisation with explicit user value and trade-offs."),
    expectation("data-product-adoption", "customer-adoption", "delivery", "Measured adoption and evolved a reusable data capability through its lifecycle."),
  ],
});
