import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const hrBusinessPartner: GenericRoleArchetype = freezeRole({
  roleFamilyId: "hr-business-partner",
  canonicalTitle: "HR Business Partner",
  aliases: [],
  searchTitles: [],
  domain: "people-and-hr",
  primaryMandate: "Provide strategic people advice and align workforce with business strategy.",
  primaryOwnership: ["Workforce strategy", "employee relations", "talent planning"],
  identityDefiningCapabilities: [
    capability("workforce-advisory", "must", "Advised leadership on workforce needs."),
    capability("employee-relations", "must", "Managed employee relations and culture."),
  ],
  coreEnablers: [
    capability("talent-planning", "should", "Governed talent and succession planning."),
    capability("people-process", "should", "Implemented HR processes and rhythms."),
  ],
  supportingCapabilities: [],
  differentiators: [
    capability("organisation-design", "differentiator", "Led structural operating model and organisation design changes.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("workforce-alignment", "workforce-advisory", "stakeholder_scope", "Aligned workforce to strategic goals."),
    expectation("employee-culture", "employee-relations", "stakeholder_scope", "Navigated complex employee relations."),
  ],
});
