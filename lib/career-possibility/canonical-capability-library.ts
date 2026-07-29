export const CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION = "1.0.0" as const;
export const CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION = "1.2.0" as const;

export type CanonicalCapabilityDefinition = {
  readonly id: string;
  readonly label: string;
  readonly family: string;
};

export type CanonicalCapabilityLibrary = {
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly capabilities: readonly CanonicalCapabilityDefinition[];
};

export type CanonicalCapabilityLibraryIssueCode =
  | "invalid_schema_version"
  | "invalid_content_version"
  | "empty_capability_library"
  | "invalid_capability_id"
  | "invalid_capability_label"
  | "invalid_capability_family"
  | "duplicate_capability_id"
  | "duplicate_capability_label"
  | "noncanonical_order";

export type CanonicalCapabilityLibraryIssue = {
  code: CanonicalCapabilityLibraryIssueCode;
  path: string;
  message: string;
};

export type CanonicalCapabilityLibraryValidationResult =
  | { ok: true; library: CanonicalCapabilityLibrary }
  | { ok: false; issues: readonly CanonicalCapabilityLibraryIssue[] };

export type CanonicalCapabilityLibraryVersionTransitionIssue = {
  code:
    | "invalid_previous_library"
    | "invalid_next_library"
    | "content_changed_without_version_change"
    | "content_unchanged_with_version_change";
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type CanonicalCapabilityLibraryVersionTransitionResult =
  | { ok: true; warnings: readonly CanonicalCapabilityLibraryVersionTransitionIssue[] }
  | { ok: false; issues: readonly CanonicalCapabilityLibraryVersionTransitionIssue[] };

const capabilityIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const compareText = (left: string, right: string) => left.localeCompare(right, "en");
const canonicalText = (value: string) => value.length > 0 && value === value.trim();

function compareCapabilities(left: CanonicalCapabilityDefinition, right: CanonicalCapabilityDefinition) {
  return compareText(left.family, right.family) || compareText(left.label, right.label) || compareText(left.id, right.id);
}

function validationIssue(
  code: CanonicalCapabilityLibraryIssueCode,
  path: string,
  message: string,
): CanonicalCapabilityLibraryIssue {
  return { code, path, message };
}

/** Stable structural content only; the explicit content version remains authoritative. */
export function serializeCanonicalCapabilityLibraryContent(library: CanonicalCapabilityLibrary) {
  return JSON.stringify(library.capabilities.map(({ id, label, family }) => ({ id, label, family })));
}

export function validateCanonicalCapabilityLibrary(
  library: CanonicalCapabilityLibrary,
): CanonicalCapabilityLibraryValidationResult {
  const issues: CanonicalCapabilityLibraryIssue[] = [];
  if (library.schemaVersion !== CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION) {
    issues.push(validationIssue("invalid_schema_version", "schemaVersion", `Unsupported canonical capability library schema version ${library.schemaVersion}.`));
  }
  if (!versionPattern.test(library.contentVersion)) {
    issues.push(validationIssue("invalid_content_version", "contentVersion", `Canonical capability content version ${library.contentVersion || "<empty>"} is invalid.`));
  }
  if (library.capabilities.length === 0) {
    issues.push(validationIssue("empty_capability_library", "capabilities", "Canonical capability library must contain at least one definition."));
  }

  const ids = new Set<string>();
  const labels = new Set<string>();
  library.capabilities.forEach((capability, index) => {
    const path = `capabilities[${index}]`;
    if (!canonicalText(capability.id) || !capabilityIdPattern.test(capability.id)) {
      issues.push(validationIssue("invalid_capability_id", `${path}.id`, `Canonical capability ID ${capability.id || "<empty>"} is invalid.`));
    }
    if (!canonicalText(capability.label)) {
      issues.push(validationIssue("invalid_capability_label", `${path}.label`, `Canonical capability label for ${capability.id || "<empty>"} is invalid.`));
    }
    if (!canonicalText(capability.family)) {
      issues.push(validationIssue("invalid_capability_family", `${path}.family`, `Canonical capability family for ${capability.id || "<empty>"} is invalid.`));
    }
    if (ids.has(capability.id)) issues.push(validationIssue("duplicate_capability_id", `${path}.id`, `Canonical capability ID ${capability.id} is duplicated.`));
    if (labels.has(capability.label)) issues.push(validationIssue("duplicate_capability_label", `${path}.label`, `Canonical capability label ${capability.label} is duplicated.`));
    ids.add(capability.id);
    labels.add(capability.label);
    if (index > 0 && compareCapabilities(library.capabilities[index - 1], capability) > 0) {
      issues.push(validationIssue("noncanonical_order", path, `Canonical capability ${capability.id || "<empty>"} is out of order.`));
    }
  });

  issues.sort((left, right) => compareText(left.path, right.path) || compareText(left.code, right.code) || compareText(left.message, right.message));
  return issues.length > 0 ? { ok: false, issues } : { ok: true, library };
}

export function validateCanonicalCapabilityLibraryVersionTransition(
  previous: CanonicalCapabilityLibrary,
  next: CanonicalCapabilityLibrary,
): CanonicalCapabilityLibraryVersionTransitionResult {
  const previousValidation = validateCanonicalCapabilityLibrary(previous);
  const nextValidation = validateCanonicalCapabilityLibrary(next);
  const invalid: CanonicalCapabilityLibraryVersionTransitionIssue[] = [];
  if (!previousValidation.ok) invalid.push({ code: "invalid_previous_library", severity: "error", path: "previous", message: "Previous canonical capability library is invalid." });
  if (!nextValidation.ok) invalid.push({ code: "invalid_next_library", severity: "error", path: "next", message: "Next canonical capability library is invalid." });
  if (invalid.length > 0) return { ok: false, issues: invalid };

  const contentChanged = serializeCanonicalCapabilityLibraryContent(previous) !== serializeCanonicalCapabilityLibraryContent(next);
  const versionChanged = previous.contentVersion !== next.contentVersion;
  if (contentChanged && !versionChanged) return { ok: false, issues: [{ code: "content_changed_without_version_change", severity: "error", path: "contentVersion", message: "Canonical capability content changed without a content-version change." }] };
  if (!contentChanged && versionChanged) return { ok: true, warnings: [{ code: "content_unchanged_with_version_change", severity: "warning", path: "contentVersion", message: "Canonical capability content version changed without a structural content change." }] };
  return { ok: true, warnings: [] };
}

const seedCapabilities = [
  { id: "forecasting", label: "Forecasting", family: "Analytics & Insight" },
  { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight" },
  { id: "marketing-effectiveness", label: "Marketing Effectiveness", family: "Analytics & Insight" },
  { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight" },
  { id: "research-design", label: "Research Design", family: "Analytics & Insight" },
  { id: "scenario-modelling", label: "Scenario Modelling", family: "Analytics & Insight" },
  { id: "variance-analysis", label: "Variance Analysis", family: "Analytics & Insight" },
  { id: "account-growth", label: "Account Growth", family: "Commercial" },
  { id: "commercial-negotiation", label: "Commercial Negotiation", family: "Commercial" },
  { id: "commercial-partnerships", label: "Commercial Partnerships", family: "Commercial" },
  { id: "consultative-selling", label: "Consultative Selling", family: "Commercial" },
  { id: "pipeline-management", label: "Pipeline Management", family: "Commercial" },
  { id: "education-partnerships", label: "Education Partnerships", family: "Communication & Collaboration" },
  { id: "audience-insight", label: "Audience Insight", family: "Customer & Market" },
  { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market" },
  { id: "customer-segmentation", label: "Customer Segmentation", family: "Customer & Market" },
  { id: "legal-technology", label: "Legal Technology", family: "Data & Technology" },
  { id: "tooling-enablement", label: "Tooling Enablement", family: "Data & Technology" },
  { id: "analytics-governance", label: "Analytics Governance", family: "Governance & Risk" },
  { id: "architecture-governance", label: "Architecture Governance", family: "Governance & Risk" },
  { id: "investment-governance", label: "Investment Governance", family: "Governance & Risk" },
  { id: "operating-control", label: "Operating Control", family: "Governance & Risk" },
  { id: "policy-governance", label: "Policy Governance", family: "Governance & Risk" },
  { id: "regulatory-compliance", label: "Regulatory Compliance", family: "Governance & Risk" },
  { id: "risk-controls", label: "Risk and Controls", family: "Governance & Risk" },
  { id: "business-ownership", label: "Business Ownership", family: "Leadership" },
  { id: "commercial-leadership", label: "Commercial Leadership", family: "Leadership" },
  { id: "people-leadership", label: "People Leadership", family: "Leadership" },
  { id: "education-delivery", label: "Education Delivery", family: "Learning & Development" },
  { id: "cross-functional-delivery", label: "Cross-functional Delivery", family: "Operations & Delivery" },
  { id: "dependency-management", label: "Dependency Management", family: "Operations & Delivery" },
  { id: "ecosystem-operations", label: "Ecosystem Operations", family: "Operations & Delivery" },
  { id: "operating-rhythm", label: "Operating Rhythm", family: "Operations & Delivery" },
  { id: "process-improvement", label: "Process Improvement", family: "Operations & Delivery" },
  { id: "service-performance", label: "Service Performance", family: "Operations & Delivery" },
  { id: "employee-relations", label: "Employee Relations", family: "People & Organisation" },
  { id: "hr-systems", label: "HR Systems", family: "People & Organisation" },
  { id: "organisation-design", label: "Organisation Design", family: "People & Organisation" },
  { id: "people-process", label: "People Process Design", family: "People & Organisation" },
  { id: "talent-planning", label: "Talent Planning", family: "People & Organisation" },
  { id: "workforce-advisory", label: "Workforce Advisory", family: "People & Organisation" },
  { id: "product-insights", label: "Product Insights", family: "Product" },
  { id: "product-cadence", label: "Product Operating Cadence", family: "Product" },
  { id: "roadmap-governance", label: "Roadmap Governance", family: "Product" },
  { id: "benefits-realisation", label: "Benefits Realisation", family: "Strategy & Transformation" },
  { id: "change-leadership", label: "Change Leadership", family: "Strategy & Transformation" },
  { id: "market-strategy", label: "Market Strategy", family: "Strategy & Transformation" },
  { id: "operating-model", label: "Operating Model Design", family: "Strategy & Transformation" },
  { id: "operating-strategy", label: "Operating Strategy", family: "Strategy & Transformation" },
  { id: "partner-strategy", label: "Partner Strategy", family: "Strategy & Transformation" },
  { id: "strategic-analysis", label: "Strategic Analysis", family: "Strategy & Transformation" },
].map((capability) => Object.freeze(capability)) as readonly CanonicalCapabilityDefinition[];

/** Admitted seed identities only; this is not a complete external capability taxonomy. */
export const canonicalCapabilityLibrary: CanonicalCapabilityLibrary = Object.freeze({
  schemaVersion: CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  contentVersion: CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION,
  capabilities: Object.freeze(seedCapabilities),
});
