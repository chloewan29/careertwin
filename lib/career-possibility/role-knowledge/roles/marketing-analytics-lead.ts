import { freezeRole, type GenericRoleArchetype } from "../role-profile";
import { buildCapability as capability, buildExpectation as expectation } from "../role-builder";

export const marketingAnalyticsLead: GenericRoleArchetype = freezeRole({
  roleFamilyId: "marketing-analytics-lead",
  canonicalTitle: "Marketing Analytics Lead",
  aliases: ["Marketing Measurement Lead"],
  searchTitles: ["Marketing Science Lead", "Campaign Analytics Lead"],
  domain: "marketing-analytics",
  primaryMandate: "Own marketing measurement and turn effectiveness evidence into growth and budget decisions.",
  primaryOwnership: ["marketing measurement strategy", "channel and campaign effectiveness", "optimisation and budget decision support"],
  identityDefiningCapabilities: [
    capability("marketing-effectiveness", "must", "Owned evaluation of marketing effectiveness and optimisation choices."),
    capability("measurement-design", "must", "Designed a measurement framework suited to marketing decisions."),
  ],
  coreEnablers: [
    capability("audience-insight", "should", "Used audience evidence to interpret marketing performance."),
    capability("strategic-analysis", "must", "Connected marketing evidence to growth or allocation trade-offs."),
  ],
  supportingCapabilities: [
    capability("analytics-governance", "should", "Maintained trusted marketing metrics and measurement definitions."),
  ],
  differentiators: [
    capability("investment-governance", "differentiator", "Governed evidence-led allocation across marketing investments.", "owned_outcome"),
  ],
  evidenceExpectations: [
    expectation("measurement-framework", "measurement-design", "governance", "Designed a repeatable framework for campaign, channel, or portfolio measurement."),
    expectation("effectiveness-decision", "marketing-effectiveness", "owned_outcome", "Used causal, incremental, or comparative evidence to change marketing action."),
    expectation("allocation-impact", "investment-governance", "budget", "Influenced budget allocation using transparent effectiveness evidence."),
  ],
});
