import { type GenericRoleArchetype, GENERIC_ROLE_ARCHETYPE_SCHEMA_VERSION, GENERIC_ROLE_ARCHETYPE_CONTENT_VERSION } from "./role-profile";
import { analyticsManager } from "./roles/analytics-manager";
import { customerInsightsLead } from "./roles/customer-insights-lead";
import { marketingAnalyticsLead } from "./roles/marketing-analytics-lead";
import { dataProductManager } from "./roles/data-product-manager";

import { productOperationsManager } from "./roles/product-operations-manager";
import { customerExperienceManager } from "./roles/customer-experience-manager";
import { accountManager } from "./roles/account-manager";
import { businessDevelopmentManager } from "./roles/business-development-manager";
import { serviceDeliveryManager } from "./roles/service-delivery-manager";
import { financeBusinessPartner } from "./roles/finance-business-partner";
import { fpaManager } from "./roles/fpa-manager";
import { engineeringManager } from "./roles/engineering-manager";

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
    productOperationsManager,
    customerExperienceManager,
    accountManager,
    businessDevelopmentManager,
    serviceDeliveryManager,
    financeBusinessPartner,
    fpaManager,
    engineeringManager,
  ]),
});
