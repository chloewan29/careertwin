import { canonicalCapabilityLibrary, type CanonicalCapabilityLibrary } from "./canonical-capability-library";
import { ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION, type CapabilityImportance, type MinimumProofLevel, type RoleCapabilityProfile, type RoleCapabilityRequirement, type RoleEvidenceProofType } from "./role-capability-library";

export const GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION = "1.0.0" as const;
export const GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION = "1.0.0" as const;

export type ArchetypeCapability = RoleCapabilityRequirement & { readonly canonicalFamily: string };
export type ArchetypeEvidenceExpectation = { readonly id: string; readonly capabilityId: string; readonly proofType: RoleEvidenceProofType; readonly description: string };
export type GenericRoleArchetype = {
  readonly schemaVersion: string; readonly contentVersion: string; readonly roleFamilyId: string; readonly canonicalTitle: string;
  readonly aliases: readonly string[]; readonly searchTitles: readonly string[]; readonly domain: string;
  readonly primaryMandate: string; readonly primaryOwnership: readonly string[];
  readonly identityDefiningCapabilities: readonly ArchetypeCapability[]; readonly coreEnablers: readonly ArchetypeCapability[];
  readonly supportingCapabilities: readonly ArchetypeCapability[]; readonly differentiators: readonly ArchetypeCapability[];
  readonly evidenceExpectations: readonly ArchetypeEvidenceExpectation[];
};
export type GenericRoleArchetypeIssue = { readonly code: string; readonly path: string; readonly message: string };
export type GenericRoleArchetypeValidation = { readonly ok: true; readonly archetypes: readonly GenericRoleArchetype[] } | { readonly ok: false; readonly issues: readonly GenericRoleArchetypeIssue[] };

const canonicalById = new Map(canonicalCapabilityLibrary.capabilities.map((item) => [item.id, item]));
const capability = (id: string, importance: CapabilityImportance, expectedEvidence: string, minimumProofLevel: MinimumProofLevel = "demonstrated"): ArchetypeCapability => {
  const canonical = canonicalById.get(id); if (!canonical) throw new Error(`Unknown authored canonical capability ${id}.`);
  return Object.freeze({ capabilityId: id, label: canonical.label, canonicalFamily: canonical.family, importance, expectedEvidence, minimumProofLevel });
};
const expectation = (id: string, capabilityId: string, proofType: RoleEvidenceProofType, description: string): ArchetypeEvidenceExpectation => Object.freeze({ id, capabilityId, proofType, description });
const freeze = (value: GenericRoleArchetype): GenericRoleArchetype => Object.freeze({ ...value, aliases: Object.freeze([...value.aliases]), searchTitles: Object.freeze([...value.searchTitles]), primaryOwnership: Object.freeze([...value.primaryOwnership]), identityDefiningCapabilities: Object.freeze([...value.identityDefiningCapabilities]), coreEnablers: Object.freeze([...value.coreEnablers]), supportingCapabilities: Object.freeze([...value.supportingCapabilities]), differentiators: Object.freeze([...value.differentiators]), evidenceExpectations: Object.freeze([...value.evidenceExpectations]) });
const base = { schemaVersion: GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION, contentVersion: GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION };

export const representativeGenericRoleArchetypes = Object.freeze([
  freeze({ ...base, roleFamilyId: "analytics-manager", canonicalTitle: "Analytics Manager", aliases: ["Data Analytics Manager"], searchTitles: ["Insights Analytics Lead", "Business Intelligence Manager"], domain: "analytics",
    primaryMandate: "Set analytics direction and ensure trusted analysis changes business decisions.", primaryOwnership: ["analytics priorities", "analytical quality and trusted metrics", "analytics delivery and adoption"],
    identityDefiningCapabilities: [capability("measurement-design", "must", "Owned an analytical measurement approach tied to a decision."), capability("analytics-governance", "must", "Established trusted definitions, quality controls, or analytical standards.")],
    coreEnablers: [capability("insight-synthesis", "must", "Synthesised analysis into a clear decision direction."), capability("cross-functional-delivery", "should", "Coordinated analytical delivery across business and technical partners.")],
    supportingCapabilities: [capability("strategic-analysis", "should", "Used structured analysis to shape priorities and trade-offs.")],
    differentiators: [capability("benefits-realisation", "differentiator", "Demonstrated adoption and measurable value from an analytics programme.", "owned_outcome")],
    evidenceExpectations: [expectation("analytics-direction", "measurement-design", "owned_outcome", "Set analytical priorities and connected measurement to an organisational decision."), expectation("trusted-analytics", "analytics-governance", "governance", "Established trusted metrics, review practices, or analytical quality controls."), expectation("analytics-adoption", "benefits-realisation", "commercial_impact", "Showed that analytical work was adopted and changed an outcome.")] }),
  freeze({ ...base, roleFamilyId: "customer-insights-lead", canonicalTitle: "Customer Insights Lead", aliases: ["Consumer Insights Lead"], searchTitles: ["Voice of Customer Lead", "Customer Research Manager"], domain: "customer-insights",
    primaryMandate: "Own the customer-understanding agenda and turn customer evidence into strategic action.", primaryOwnership: ["customer insight agenda", "customer research and evidence synthesis", "customer-centred decision influence"],
    identityDefiningCapabilities: [capability("research-design", "must", "Owned research designed around a consequential customer question."), capability("insight-synthesis", "must", "Integrated customer evidence into a decision-ready point of view."), capability("customer-segmentation", "must", "Used meaningful customer groups to change strategy or experience decisions.")],
    coreEnablers: [capability("audience-insight", "should", "Connected behavioural or attitudinal evidence to customer choices."), capability("strategic-analysis", "should", "Translated customer evidence into strategic implications.")],
    supportingCapabilities: [capability("cross-functional-delivery", "should", "Worked across functions to embed customer evidence in delivery.")],
    differentiators: [capability("customer-adoption", "differentiator", "Connected insight-led change to customer adoption or behaviour.", "owned_outcome")],
    evidenceExpectations: [expectation("customer-agenda", "research-design", "owned_outcome", "Set a customer-learning agenda and commissioned or led appropriate research."), expectation("customer-synthesis", "insight-synthesis", "stakeholder_scope", "Synthesised multiple customer signals into a recommendation used by decision makers."), expectation("customer-change", "customer-adoption", "commercial_impact", "Demonstrated a customer-centred change and observable response.")] }),
  freeze({ ...base, roleFamilyId: "marketing-analytics-lead", canonicalTitle: "Marketing Analytics Lead", aliases: ["Marketing Measurement Lead"], searchTitles: ["Marketing Science Lead", "Campaign Analytics Lead"], domain: "marketing-analytics",
    primaryMandate: "Own marketing measurement and turn effectiveness evidence into growth and budget decisions.", primaryOwnership: ["marketing measurement strategy", "channel and campaign effectiveness", "optimisation and budget decision support"],
    identityDefiningCapabilities: [capability("marketing-effectiveness", "must", "Owned evaluation of marketing effectiveness and optimisation choices."), capability("measurement-design", "must", "Designed a measurement framework suited to marketing decisions.")],
    coreEnablers: [capability("audience-insight", "should", "Used audience evidence to interpret marketing performance."), capability("strategic-analysis", "must", "Connected marketing evidence to growth or allocation trade-offs.")],
    supportingCapabilities: [capability("analytics-governance", "should", "Maintained trusted marketing metrics and measurement definitions.")],
    differentiators: [capability("investment-governance", "differentiator", "Governed evidence-led allocation across marketing investments.", "owned_outcome")],
    evidenceExpectations: [expectation("measurement-framework", "measurement-design", "governance", "Designed a repeatable framework for campaign, channel, or portfolio measurement."), expectation("effectiveness-decision", "marketing-effectiveness", "owned_outcome", "Used causal, incremental, or comparative evidence to change marketing action."), expectation("allocation-impact", "investment-governance", "budget", "Influenced budget allocation using transparent effectiveness evidence.")] }),
  freeze({ ...base, roleFamilyId: "data-product-manager", canonicalTitle: "Data Product Manager", aliases: ["Data Products Lead"], searchTitles: ["Analytics Product Manager", "Data Platform Product Manager"], domain: "data-product",
    primaryMandate: "Own reusable data-product outcomes from user discovery through roadmap, adoption, and lifecycle decisions.", primaryOwnership: ["data-product outcomes", "user discovery and roadmap priorities", "cross-functional lifecycle and adoption"],
    identityDefiningCapabilities: [capability("product-insights", "must", "Used user and product evidence to define a data-product problem."), capability("roadmap-governance", "must", "Owned transparent prioritisation and roadmap trade-offs."), capability("product-cadence", "must", "Maintained a product operating cadence across discovery, delivery, and learning.")],
    coreEnablers: [capability("cross-functional-delivery", "must", "Aligned data, engineering, analytics, and business contributors around outcomes."), capability("tooling-enablement", "should", "Enabled reliable use of reusable data capabilities.")],
    supportingCapabilities: [capability("analytics-governance", "should", "Applied trust and governance expectations to data-product decisions.")],
    differentiators: [capability("customer-adoption", "differentiator", "Demonstrated sustained adoption of a reusable data product.", "owned_outcome")],
    evidenceExpectations: [expectation("data-product-discovery", "product-insights", "domain_expertise", "Used user discovery to define a data-product outcome rather than a delivery output."), expectation("roadmap-tradeoffs", "roadmap-governance", "owned_outcome", "Owned roadmap prioritisation with explicit user value and trade-offs."), expectation("data-product-adoption", "customer-adoption", "delivery", "Measured adoption and evolved a reusable data capability through its lifecycle.")] }),
]);

export function validateGenericRoleArchetypes(archetypes: readonly GenericRoleArchetype[], canonicalLibrary: CanonicalCapabilityLibrary): GenericRoleArchetypeValidation {
  const issues: GenericRoleArchetypeIssue[] = []; const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const canonical = new Map(canonicalLibrary.capabilities.map((item) => [item.id, item])); const roleIds = new Set<string>();
  archetypes.forEach((role, roleIndex) => { const root = `archetypes[${roleIndex}]`;
    if (role.schemaVersion !== GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION) add("unsupported_schema_version", `${root}.schemaVersion`, "Unsupported archetype schema version.");
    if (!/^\d+\.\d+\.\d+$/.test(role.contentVersion)) add("invalid_content_version", `${root}.contentVersion`, "Invalid archetype content version.");
    if (roleIds.has(role.roleFamilyId)) add("duplicate_role_id", `${root}.roleFamilyId`, "Role ID is duplicated."); roleIds.add(role.roleFamilyId);
    if (!role.canonicalTitle.trim()) add("blank_title", `${root}.canonicalTitle`, "Canonical title is required."); if (!role.primaryMandate.trim()) add("blank_primary_mandate", `${root}.primaryMandate`, "Primary mandate is required.");
    if (!role.primaryOwnership.length) add("missing_primary_ownership", `${root}.primaryOwnership`, "Primary ownership is required.");
    if (new Set(role.primaryOwnership.map((item) => item.trim().toLowerCase())).size !== role.primaryOwnership.length) add("duplicate_primary_ownership", `${root}.primaryOwnership`, "Primary ownership items must be unique.");
    if (/\b(company|job description|jd)\b/i.test(JSON.stringify(role))) add("company_or_jd_specific_text", root, "Archetype text must remain company and JD independent.");
    const sections = [["identityDefiningCapabilities", role.identityDefiningCapabilities], ["coreEnablers", role.coreEnablers], ["supportingCapabilities", role.supportingCapabilities], ["differentiators", role.differentiators]] as const;
    if (!role.identityDefiningCapabilities.length) add("missing_identity_capability", `${root}.identityDefiningCapabilities`, "Identity-defining capabilities are required."); if (!role.coreEnablers.length) add("missing_core_enabler", `${root}.coreEnablers`, "Core enablers are required."); if (!role.differentiators.length) add("missing_differentiator", `${root}.differentiators`, "A differentiator is required.");
    const seen = new Set<string>(); sections.forEach(([name, values]) => values.forEach((item, index) => { const path = `${root}.${name}[${index}]`; const definition = canonical.get(item.capabilityId);
      if (seen.has(item.capabilityId)) add("duplicate_structural_capability", `${path}.capabilityId`, "Capabilities may appear in only one structural section."); seen.add(item.capabilityId);
      if (!definition) add("unknown_canonical_capability", `${path}.capabilityId`, "Capability is not admitted to the canonical registry."); else { if (item.label !== definition.label) add("canonical_label_mismatch", `${path}.label`, "Capability label differs from the registry."); if (item.canonicalFamily !== definition.family) add("canonical_family_mismatch", `${path}.canonicalFamily`, "Capability family differs from the registry."); }
      const expected = name === "identityDefiningCapabilities" ? ["must"] : name === "coreEnablers" ? ["must", "should"] : name === "supportingCapabilities" ? ["should"] : ["differentiator"];
      if (!expected.includes(item.importance)) add("incompatible_importance", `${path}.importance`, `${name} has incompatible importance ${item.importance}.`); if (!new Set(["must", "should", "differentiator"]).has(item.importance)) add("invalid_importance", `${path}.importance`, "Invalid capability importance.");
    }));
    if (!role.evidenceExpectations.length) add("missing_evidence_expectation", `${root}.evidenceExpectations`, "Evidence expectations are required."); const evidenceIds = new Set<string>();
    role.evidenceExpectations.forEach((item, index) => { const path = `${root}.evidenceExpectations[${index}]`; if (evidenceIds.has(item.id)) add("duplicate_evidence_expectation_id", `${path}.id`, "Evidence expectation ID is duplicated."); evidenceIds.add(item.id); if (!seen.has(item.capabilityId)) add("evidence_capability_not_structural", `${path}.capabilityId`, "Evidence expectation must reference a structural capability."); if (!item.description.trim()) add("blank_evidence_expectation", `${path}.description`, "Evidence expectation description is required."); });
  });
  issues.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code)); return issues.length ? { ok: false, issues } : { ok: true, archetypes };
}

function legacyRequirement(item: ArchetypeCapability): RoleCapabilityRequirement { const { canonicalFamily: _family, ...requirement } = item; void _family; return Object.freeze({ ...requirement }); }
export function projectGenericRoleArchetypeToProfile(role: GenericRoleArchetype): RoleCapabilityProfile {
  const all = [...role.identityDefiningCapabilities, ...role.coreEnablers, ...role.supportingCapabilities, ...role.differentiators]; const byImportance = (importance: CapabilityImportance) => Object.freeze(all.filter((item) => item.importance === importance).map(legacyRequirement));
  const growthArea = Object.freeze({ id: `${role.roleFamilyId}-proof-depth`, label: "Role-specific proof depth", type: "missing_proof" as const, whyItMatters: `Observable proof strengthens credible progression into ${role.canonicalTitle}.`, proofToBuild: role.evidenceExpectations[0].description, priority: "medium" as const, relatedCapabilityIds: Object.freeze([role.evidenceExpectations[0].capabilityId]) });
  return Object.freeze({ roleFamilyId: role.roleFamilyId, canonicalTitle: role.canonicalTitle, aliases: Object.freeze([...role.aliases]), searchTitles: Object.freeze([...role.searchTitles]), domain: role.domain, seniorityBand: "manager", description: role.primaryMandate, mustHaveCapabilities: byImportance("must"), shouldHaveCapabilities: byImportance("should"), differentiatingCapabilities: byImportance("differentiator"), evidenceRequirements: Object.freeze(role.evidenceExpectations.map((item) => Object.freeze({ capabilityId: item.capabilityId, proofType: item.proofType, description: item.description }))), commonGrowthAreas: Object.freeze([growthArea]), adjacentFromCapabilities: Object.freeze(all.map((item) => item.capabilityId)), relatedRoleFamilies: Object.freeze([]), sourceNotes: Object.freeze(["Deliberately authored generic role archetype; company and JD independent."]), version: ROLE_CAPABILITY_PROFILE_SCHEMA_VERSION }) as unknown as RoleCapabilityProfile;
}

const validation = validateGenericRoleArchetypes(representativeGenericRoleArchetypes, canonicalCapabilityLibrary); if (!validation.ok) throw new Error(`Invalid representative archetypes: ${validation.issues.map((item) => `${item.path}:${item.code}`).join(", ")}`);
export const representativeGenericRoleProfiles = Object.freeze(representativeGenericRoleArchetypes.map(projectGenericRoleArchetypeToProfile));
