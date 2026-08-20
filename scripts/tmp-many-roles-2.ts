
import { buildGenericCareerPathAlignment } from "../lib/career-possibility/generic-career-path-alignment";
import { filterAdmittedRoles } from "../lib/career-possibility/generic-role-admission";
import { roleKnowledgeRegistry } from "../lib/career-possibility/role-knowledge/role-registry";
import { canonicalCapabilityLibrary } from "../lib/career-possibility/canonical-capability-library";

const personalCapabilities = canonicalCapabilityLibrary.capabilities.map(c => ({
  canonicalCapabilityId: c.id,
  supports: [{ mappingId: "map", evidenceId: "ev", relationship: "direct_evidence" as const, method: "model" as const }]
}));

const alignment = buildGenericCareerPathAlignment({
  canonicalCapabilityOwnership: personalCapabilities,
  genericRoleArchetypes: roleKnowledgeRegistry.roles,
  canonicalDefinitions: canonicalCapabilityLibrary.capabilities,
});

const admitted = filterAdmittedRoles(alignment.roles);

console.log("admitted: " + admitted.length);

