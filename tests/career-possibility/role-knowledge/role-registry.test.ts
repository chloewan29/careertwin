import { expect, test } from "vitest";
import { roleKnowledgeRegistry } from "../../../lib/career-possibility/role-knowledge/role-registry";
import { canonicalCapabilityLibrary } from "../../../lib/career-possibility/canonical-capability-library";
import { validateGenericRoleArchetypes, representativeGenericRoleArchetypes } from "../../../lib/career-possibility/generic-role-archetype";
import * as crypto from "crypto";

test("registry foundation", () => {
  // registry schema/content version present
  expect(roleKnowledgeRegistry.schemaVersion).toBe("1.0.0");
  expect(roleKnowledgeRegistry.contentVersion).toBe("1.1.0");

  // registry contains exactly current 12 roles
  expect(roleKnowledgeRegistry.roles.length).toBe(12);
  const roleIds = roleKnowledgeRegistry.roles.map(r => r.roleFamilyId).sort();
  expect(roleIds).toEqual([
    "account-manager",
    "analytics-manager",
    "business-development-manager",
    "customer-experience-manager",
    "customer-insights-lead",
    "data-product-manager",
    "engineering-manager",
    "finance-business-partner",
    "fpa-manager",
    "marketing-analytics-lead",
    "product-operations-manager",
    "service-delivery-manager"
  ]);
});

test("registry roles pass full semantic integrity validation", () => {
  const validation = validateGenericRoleArchetypes(roleKnowledgeRegistry.roles, canonicalCapabilityLibrary);
  expect(validation.ok, validation.ok === false ? JSON.stringify(validation.issues) : "").toBe(true);
});

test("legacy representative array is reference-equal to registry roles", () => {
  expect(representativeGenericRoleArchetypes).toStrictEqual(roleKnowledgeRegistry.roles);
});

test("post-migration semantic fingerprint is correct", () => {
  const data = roleKnowledgeRegistry.roles.map(r => ({
    roleFamilyId: r.roleFamilyId,
    canonicalTitle: r.canonicalTitle,
    domain: r.domain,
    identityDefiningCapabilities: r.identityDefiningCapabilities.map(c => ({ id: c.capabilityId, imp: c.importance })).sort((a,b) => a.id.localeCompare(b.id)),
    coreEnablers: r.coreEnablers.map(c => ({ id: c.capabilityId, imp: c.importance })).sort((a,b) => a.id.localeCompare(b.id)),
    supportingCapabilities: r.supportingCapabilities.map(c => ({ id: c.capabilityId, imp: c.importance })).sort((a,b) => a.id.localeCompare(b.id)),
    differentiators: r.differentiators.map(c => ({ id: c.capabilityId, imp: c.importance })).sort((a,b) => a.id.localeCompare(b.id)),
  })).sort((a,b) => a.roleFamilyId.localeCompare(b.roleFamilyId));
  
  const json = JSON.stringify(data);
  const hash = crypto.createHash("sha256").update(json).digest("hex").toUpperCase();
  expect(hash).toBe("73E06D21F729082E71EDAC407C6479954C703CE26FB0E7A1750F12209C67D831");
});
