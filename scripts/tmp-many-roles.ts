
import { buildPersonalGenericRoleAlignment } from "../lib/career-possibility/personal-generic-role-alignment-adapter";
import { canonicalCapabilityLibrary } from "../lib/career-possibility/canonical-capability-library";

const capabilities = canonicalCapabilityLibrary.capabilities.map(c => ({
  mappingId: "map-" + c.id,
  evidenceId: "ev-1",
  capabilityId: c.id,
  relationship: "direct_evidence" as const,
  method: "model" as const
}));

const result = buildPersonalGenericRoleAlignment({
  personalState: {
    schemaVersion: "1.0.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    capabilities: capabilities.map(c => ({
      capabilityId: c.capabilityId,
      capabilityLabel: "cap",
      family: "fam",
      mappings: [c]
    }))
  }
});

if (result.ok) {
  console.log("admitted: " + result.result.admittedRoles.length);
} else {
  console.log("error", result.issues);
}

