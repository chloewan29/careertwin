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

export type AdjacentRole = {
  id: string;
  roleFamily: string;
  fitScore: number;
  category: "Closest Match" | "Adjacent" | "Stretch";
  explanation: string;
  poweredBy: string[];
  capabilityIds: string[];
};

export type CareerCapabilityExplorerResult = {
  profileSummary: string;
  defaultCapabilityId: string;
  capabilities: CapabilityNode[];
  experiences: SupportingExperience[];
  adjacentRoles: AdjacentRole[];
};

export const mockCareerPossibility: CareerCapabilityExplorerResult = {
  profileSummary: "Your experience consistently connects data, change, and commercial decisions. Explore each capability to see the evidence behind it and the roles it can unlock.",
  defaultCapabilityId: "transformation",
  capabilities: [
    { id: "analytics", label: "Analytics & Insights", strength: 91, family: "analytics", subCapabilities: [{ id: "analysis", label: "Decision Analytics", strength: 93 }, { id: "measurement", label: "Measurement Design", strength: 88 }, { id: "insight", label: "Insight Synthesis", strength: 90 }], supportingExperienceIds: ["optus", "amobee", "microsoft"], adjacentRoleIds: ["insights", "strategy"] },
    { id: "transformation", label: "Transformation", strength: 92, family: "transformation", subCapabilities: [{ id: "change", label: "Change Management", strength: 92 }, { id: "cross-functional", label: "Cross-functional Delivery", strength: 90 }, { id: "governance", label: "Governance Design", strength: 86 }, { id: "operating-model", label: "Operating Model", strength: 84 }], supportingExperienceIds: ["optus", "amobee", "microsoft"], adjacentRoleIds: ["transformation-role", "strategy", "program"] },
    { id: "leadership", label: "Stakeholder Leadership", strength: 88, family: "leadership", subCapabilities: [{ id: "influence", label: "Executive Influence" }, { id: "alignment", label: "Cross-team Alignment" }, { id: "facilitation", label: "Decision Facilitation" }], supportingExperienceIds: ["optus", "microsoft"], adjacentRoleIds: ["transformation-role", "program", "insights"] },
    { id: "commercial", label: "Commercial Storytelling", strength: 84, family: "commercial", subCapabilities: [{ id: "narrative", label: "Data Narrative" }, { id: "recommendations", label: "Strategic Recommendations" }, { id: "value", label: "Value Articulation" }], supportingExperienceIds: ["amobee", "microsoft"], adjacentRoleIds: ["strategy", "insights"] },
    { id: "delivery", label: "Delivery & Governance", strength: 86, family: "delivery", subCapabilities: [{ id: "roadmaps", label: "Roadmap Delivery" }, { id: "controls", label: "Governance Controls" }, { id: "cadence", label: "Operating Cadence" }], supportingExperienceIds: ["optus", "amobee"], adjacentRoleIds: ["transformation-role", "program"] },
    { id: "customer", label: "Customer Strategy", strength: 80, family: "customer", subCapabilities: [{ id: "journeys", label: "Journey Insight" }, { id: "segmentation", label: "Customer Segmentation" }, { id: "experience", label: "Experience Strategy" }], supportingExperienceIds: ["optus", "microsoft"], adjacentRoleIds: ["insights", "strategy"] },
  ],
  experiences: [
    { id: "optus", company: "Optus", role: "Analytics Lead", evidenceText: "Led self-serve analytics adoption across cross-functional teams.", relevance: "high", capabilityIds: ["analytics", "transformation", "leadership", "delivery", "customer"], roleIds: ["transformation-role", "strategy", "insights", "program"] },
    { id: "amobee", company: "Amobee", role: "Sr Product Analytics", evidenceText: "Built scalable measurement frameworks and commercial insights.", relevance: "strong", capabilityIds: ["analytics", "transformation", "commercial", "delivery"], roleIds: ["transformation-role", "strategy", "insights"] },
    { id: "microsoft", company: "Microsoft Ads", role: "Insights", evidenceText: "Drove client-facing storytelling and strategic recommendations.", relevance: "strong", capabilityIds: ["analytics", "transformation", "leadership", "commercial", "customer"], roleIds: ["strategy", "insights", "program"] },
  ],
  adjacentRoles: [
    { id: "transformation-role", roleFamily: "Transformation Manager", fitScore: 92, category: "Closest Match", explanation: "Powered by change leadership + cross-functional delivery.", poweredBy: ["Change leadership", "Cross-functional delivery"], capabilityIds: ["transformation", "leadership", "delivery"] },
    { id: "strategy", roleFamily: "Strategy & Ops Manager", fitScore: 86, category: "Adjacent", explanation: "Leverage your analytical thinking and operational mindset.", poweredBy: ["Analytics", "Commercial storytelling", "Operating model"], capabilityIds: ["analytics", "transformation", "commercial", "delivery", "customer"] },
    { id: "insights", roleFamily: "Customer Insights Lead", fitScore: 78, category: "Adjacent", explanation: "Strong alignment with customer understanding and data storytelling.", poweredBy: ["Customer strategy", "Insight synthesis"], capabilityIds: ["analytics", "leadership", "commercial", "customer"] },
    { id: "program", roleFamily: "Program Manager", fitScore: 68, category: "Stretch", explanation: "Build on delivery and stakeholder management expertise.", poweredBy: ["Delivery", "Stakeholder leadership"], capabilityIds: ["transformation", "leadership", "delivery"] },
  ],
};
