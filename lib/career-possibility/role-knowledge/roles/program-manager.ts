import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const programManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "program-manager",
  canonicalTitle: "Program Manager",
  aliases: [],
  searchTitles: [],
  domain: "program-management",
  primaryMandate: "Own multi-workstream program outcomes and dependency management.",
  primaryOwnership: ["Program delivery", "dependency resolution", "benefits realization"],
  identityDefiningCapabilities: [
    capability("cross-functional-delivery", "must", "Delivered cross-functional programs."),
    capability("dependency-management", "must", "Resolved complex dependencies across workstreams."),
  ],
  coreEnablers: [
    capability("operating-rhythm", "should", "Governed program cadence."),
    capability("benefits-realisation", "should", "Tracked and delivered business value."),
  ],
  supportingCapabilities: [],
  differentiators: [
    capability("change-leadership", "differentiator", "Drove organisational change adoption.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("program-delivery", "cross-functional-delivery", "delivery", "Delivered complex multi-workstream programs."),
    expectation("dependency-resolution", "dependency-management", "delivery", "Managed critical path dependencies."),
  ],
});
