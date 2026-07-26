import { roleCapabilityProfileById } from "../../lib/career-possibility/fixtures/roleCapabilityProfiles";
import { buildRolePathRailFromProfiles, selectRoleProfilesById, validateCareerMapRolePathsDetailed, type CareerMapFuturePath } from "../../lib/career-possibility/role-lens-map-adapter";

export type CapabilityNode = {
  id: string;
  label: string;
  strength: number;
  family: "analytics" | "transformation" | "leadership" | "commercial" | "delivery" | "customer";
  subCapabilities: Array<{ id: string; label: string; strength?: number }>;
  supportingExperienceIds: string[];
  adjacentRoleIds: string[];
};

export type SupportingExperience = {
  id: string;
  company: string;
  role: string;
  evidenceText: string;
  relevance: "high" | "strong" | "medium";
  capabilityIds: string[];
  roleIds: string[];
};

export type AdjacentRole = CareerMapFuturePath;

export type CareerCapabilityExplorerResult = {
  profileSummary: string;
  defaultCapabilityId: string;
  capabilities: CapabilityNode[];
  experiences: SupportingExperience[];
  adjacentRoles: AdjacentRole[];
};

const capabilities: CapabilityNode[] = [
    { id: "analytics", label: "Analytics & Insights", strength: 91, family: "analytics", subCapabilities: [{ id: "analysis", label: "Decision Analytics", strength: 93 }, { id: "measurement", label: "Measurement Design", strength: 88 }, { id: "insight", label: "Insight Synthesis", strength: 90 }], supportingExperienceIds: ["optus", "amobee", "microsoft"], adjacentRoleIds: ["path:customer-insights-lead", "path:strategy-operations-manager"] },
    { id: "transformation", label: "Transformation", strength: 92, family: "transformation", subCapabilities: [{ id: "change", label: "Change Management", strength: 92 }, { id: "cross-functional", label: "Cross-functional Delivery", strength: 90 }, { id: "governance", label: "Governance Design", strength: 86 }, { id: "operating-model", label: "Operating Model", strength: 84 }], supportingExperienceIds: ["optus", "amobee", "microsoft"], adjacentRoleIds: ["path:transformation-manager"] },
    { id: "leadership", label: "Stakeholder Leadership", strength: 88, family: "leadership", subCapabilities: [{ id: "influence", label: "Executive Influence" }, { id: "alignment", label: "Cross-team Alignment" }, { id: "facilitation", label: "Decision Facilitation" }], supportingExperienceIds: ["optus", "microsoft"], adjacentRoleIds: ["path:program-manager"] },
    { id: "commercial", label: "Commercial Storytelling", strength: 84, family: "commercial", subCapabilities: [{ id: "narrative", label: "Data Narrative" }, { id: "recommendations", label: "Strategic Recommendations" }, { id: "value", label: "Value Articulation" }], supportingExperienceIds: ["amobee", "microsoft"], adjacentRoleIds: ["path:strategy-operations-manager", "path:customer-insights-lead"] },
    { id: "delivery", label: "Delivery & Governance", strength: 86, family: "delivery", subCapabilities: [{ id: "roadmaps", label: "Roadmap Delivery" }, { id: "controls", label: "Governance Controls" }, { id: "cadence", label: "Operating Cadence" }], supportingExperienceIds: ["optus", "amobee"], adjacentRoleIds: ["path:transformation-manager", "path:program-manager"] },
    { id: "customer", label: "Customer Strategy", strength: 80, family: "customer", subCapabilities: [{ id: "journeys", label: "Journey Insight" }, { id: "segmentation", label: "Customer Segmentation" }, { id: "experience", label: "Experience Strategy" }], supportingExperienceIds: ["optus", "microsoft"], adjacentRoleIds: ["path:customer-insights-lead"] },
];

const experiences: SupportingExperience[] = [
    { id: "optus", company: "Optus", role: "Analytics Lead", evidenceText: "Led self-serve analytics adoption across cross-functional teams.", relevance: "high", capabilityIds: ["analytics", "transformation", "leadership", "delivery", "customer"], roleIds: ["path:transformation-manager", "path:strategy-operations-manager", "path:customer-insights-lead", "path:program-manager"] },
    { id: "amobee", company: "Amobee", role: "Sr Product Analytics", evidenceText: "Built scalable measurement frameworks and commercial insights.", relevance: "strong", capabilityIds: ["analytics", "transformation", "commercial", "delivery"], roleIds: ["path:transformation-manager", "path:strategy-operations-manager", "path:customer-insights-lead"] },
    { id: "microsoft", company: "Microsoft Ads", role: "Insights", evidenceText: "Drove client-facing storytelling and strategic recommendations.", relevance: "strong", capabilityIds: ["analytics", "transformation", "leadership", "commercial", "customer"], roleIds: ["path:strategy-operations-manager", "path:customer-insights-lead", "path:program-manager"] },
];

const demoRoleFamilyIds = ["transformation-manager", "strategy-operations-manager", "customer-insights-lead", "program-manager"];
const demoProfileSelection = selectRoleProfilesById(roleCapabilityProfileById, demoRoleFamilyIds);
const frontendCapabilityIds = new Set(capabilities.map((capability) => capability.id));
const evidenceBackedCapabilityIds = new Set(experiences.flatMap((experience) => experience.capabilityIds));
const adjacentRoles = buildRolePathRailFromProfiles(demoProfileSelection.profiles, { frontendCapabilityIds, evidenceBackedCapabilityIds });

export const mockCareerPossibilityAdapterValidation = validateCareerMapRolePathsDetailed(
  adjacentRoles,
  frontendCapabilityIds,
  demoProfileSelection.missingRoleFamilyIds,
);

export const mockCareerPossibility: CareerCapabilityExplorerResult = {
  profileSummary: "Your experience consistently connects data, change, and commercial decisions. Explore each capability to see the evidence behind it and the roles it can unlock.",
  defaultCapabilityId: "transformation",
  capabilities,
  experiences,
  adjacentRoles,
};
