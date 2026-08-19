import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const riskManager: GenericRoleArchetype = freezeRole({
  roleFamilyId: "risk-manager",
  canonicalTitle: "Risk Manager",
  aliases: [],
  searchTitles: [],
  domain: "risk-and-governance",
  primaryMandate: "Govern enterprise/operational risk and ensure regulatory compliance.",
  primaryOwnership: ["Risk controls", "regulatory compliance", "policy governance"],
  identityDefiningCapabilities: [
    capability("risk-controls", "must", "Implemented and monitored risk controls."),
    capability("regulatory-compliance", "must", "Ensured adherence to regulatory frameworks."),
  ],
  coreEnablers: [
    capability("policy-governance", "should", "Governed internal policies and standards."),
    capability("operating-control", "should", "Maintained operating control environments."),
  ],
  supportingCapabilities: [],
  differentiators: [
    capability("process-improvement", "differentiator", "Drove systemic process improvements to mitigate risk.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("control-environment", "risk-controls", "stakeholder_scope", "Operated enterprise risk frameworks."),
    expectation("compliance-assurance", "regulatory-compliance", "stakeholder_scope", "Managed regulatory obligations."),
  ],
});
