import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const engineeringManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "engineering-manager",
  canonicalTitle: "Engineering Manager",
  aliases: [],
  searchTitles: [],
  domain: "engineering",
  primaryMandate: "Lead engineering teams and govern technical delivery.",
  primaryOwnership: ["engineering team leadership","technical standards","software delivery"],
  identityDefiningCapabilities: [
    capability("people-leadership", "must", "Managed and developed engineers."),
    capability("architecture-governance", "must", "Governed technical architecture and standards."),
  ],
  coreEnablers: [
    capability("cross-functional-delivery", "must", "Delivered software across teams."),
    capability("operating-control", "must", "Enforced code quality and security standards."),
  ],
  supportingCapabilities: [
    capability("dependency-management", "should", "Managed critical path technical dependencies."),
  ],
  differentiators: [
    capability("business-ownership", "differentiator", "Took accountability for commercial outcomes of engineering.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("team-leadership", "people-leadership", "people_leadership", "Led engineering teams."),
    expectation("technical-governance", "architecture-governance", "governance", "Governed technical standards."),
  ],
});
