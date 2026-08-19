import { type GenericRoleArchetype, GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION, GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION } from "./role-profile";
import { analyticsManager } from "./roles/analytics-manager";
import { customerInsightsLead } from "./roles/customer-insights-lead";
import { marketingAnalyticsLead } from "./roles/marketing-analytics-lead";
import { dataProductManager } from "./roles/data-product-manager";

export type RoleKnowledgeRegistry = {
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly roles: readonly GenericRoleArchetype[];
};

export const roleKnowledgeRegistry: RoleKnowledgeRegistry = Object.freeze({
  schemaVersion: GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION,
  contentVersion: GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION,
  roles: Object.freeze([
    analyticsManager,
    customerInsightsLead,
    marketingAnalyticsLead,
    dataProductManager,
  ]),
});
