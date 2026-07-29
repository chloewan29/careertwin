import {
  validateCanonicalCapabilityLibrary,
  type CanonicalCapabilityLibrary,
  type CanonicalCapabilityLibraryIssue,
} from "./canonical-capability-library";

export const CANONICAL_CAPABILITY_FAMILY_LIBRARY_SCHEMA_VERSION = "1.0.0" as const;
export const CANONICAL_CAPABILITY_FAMILY_LIBRARY_CONTENT_VERSION = "1.0.0" as const;

export type CanonicalCapabilityFamily = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
};

export type CanonicalCapabilityFamilyLibrary = {
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly families: readonly CanonicalCapabilityFamily[];
};

export type CanonicalCapabilityFamilyLibraryIssueCode =
  | "invalid_schema_version"
  | "invalid_content_version"
  | "empty_family_library"
  | "invalid_family_id"
  | "invalid_family_label"
  | "invalid_family_description"
  | "duplicate_family_id"
  | "duplicate_family_label"
  | "noncanonical_order";

export type CanonicalCapabilityFamilyLibraryIssue = {
  readonly code: CanonicalCapabilityFamilyLibraryIssueCode;
  readonly path: string;
  readonly message: string;
};

export type CanonicalCapabilityFamilyLibraryValidationResult =
  | { readonly ok: true; readonly library: CanonicalCapabilityFamilyLibrary }
  | { readonly ok: false; readonly issues: readonly CanonicalCapabilityFamilyLibraryIssue[] };

export type CanonicalCapabilityFamilyLibraryVersionTransitionIssue = {
  readonly code:
    | "invalid_previous_library"
    | "invalid_next_library"
    | "content_changed_without_version_change"
    | "content_unchanged_with_version_change";
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
};

export type CanonicalCapabilityFamilyLibraryVersionTransitionResult =
  | { readonly ok: true; readonly warnings: readonly CanonicalCapabilityFamilyLibraryVersionTransitionIssue[] }
  | { readonly ok: false; readonly issues: readonly CanonicalCapabilityFamilyLibraryVersionTransitionIssue[] };

export type CanonicalCapabilityFamilyMembership = {
  readonly capabilityId: string;
  readonly capabilityLabel: string;
  readonly familyId: string;
  readonly familyLabel: string;
};

export type CanonicalCapabilityFamilyMembershipIssueCode =
  | "invalid_capability_library"
  | "invalid_family_library"
  | "unknown_capability_family";

export type CanonicalCapabilityFamilyMembershipIssue = {
  readonly code: CanonicalCapabilityFamilyMembershipIssueCode;
  readonly path: string;
  readonly message: string;
  readonly sourceIssues?: readonly (
    | CanonicalCapabilityLibraryIssue
    | CanonicalCapabilityFamilyLibraryIssue
  )[];
};

export type CanonicalCapabilityFamilyMembershipValidationResult =
  | { readonly ok: true; readonly memberships: readonly CanonicalCapabilityFamilyMembership[] }
  | { readonly ok: false; readonly issues: readonly CanonicalCapabilityFamilyMembershipIssue[] };

const familyIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const compareText = (left: string, right: string) => left.localeCompare(right, "en");
const canonicalText = (value: string) => value.length > 0 && value === value.trim();

function compareFamilies(left: CanonicalCapabilityFamily, right: CanonicalCapabilityFamily) {
  return compareText(left.label, right.label) || compareText(left.id, right.id);
}

function familyIssue(
  code: CanonicalCapabilityFamilyLibraryIssueCode,
  path: string,
  message: string,
): CanonicalCapabilityFamilyLibraryIssue {
  return { code, path, message };
}

/** Stable structural content only; the explicit content version remains authoritative. */
export function serializeCanonicalCapabilityFamilyLibraryContent(
  library: CanonicalCapabilityFamilyLibrary,
) {
  return JSON.stringify(
    library.families.map(({ id, label, description }) => ({ id, label, description })),
  );
}

export function validateCanonicalCapabilityFamilyLibrary(
  library: CanonicalCapabilityFamilyLibrary,
): CanonicalCapabilityFamilyLibraryValidationResult {
  const issues: CanonicalCapabilityFamilyLibraryIssue[] = [];

  if (library.schemaVersion !== CANONICAL_CAPABILITY_FAMILY_LIBRARY_SCHEMA_VERSION) {
    issues.push(
      familyIssue(
        "invalid_schema_version",
        "schemaVersion",
        `Unsupported canonical capability family library schema version ${library.schemaVersion}.`,
      ),
    );
  }
  if (!versionPattern.test(library.contentVersion)) {
    issues.push(
      familyIssue(
        "invalid_content_version",
        "contentVersion",
        `Canonical capability family content version ${library.contentVersion || "<empty>"} is invalid.`,
      ),
    );
  }
  if (library.families.length === 0) {
    issues.push(
      familyIssue(
        "empty_family_library",
        "families",
        "Canonical capability family library must contain at least one family.",
      ),
    );
  }

  const ids = new Set<string>();
  const labels = new Set<string>();
  library.families.forEach((family, index) => {
    const path = `families[${index}]`;
    if (!canonicalText(family.id) || !familyIdPattern.test(family.id)) {
      issues.push(
        familyIssue(
          "invalid_family_id",
          `${path}.id`,
          `Canonical capability family ID ${family.id || "<empty>"} is invalid.`,
        ),
      );
    }
    if (!canonicalText(family.label)) {
      issues.push(
        familyIssue(
          "invalid_family_label",
          `${path}.label`,
          `Canonical capability family label for ${family.id || "<empty>"} is invalid.`,
        ),
      );
    }
    if (!canonicalText(family.description)) {
      issues.push(
        familyIssue(
          "invalid_family_description",
          `${path}.description`,
          `Canonical capability family description for ${family.id || "<empty>"} is invalid.`,
        ),
      );
    }
    if (ids.has(family.id)) {
      issues.push(
        familyIssue(
          "duplicate_family_id",
          `${path}.id`,
          `Canonical capability family ID ${family.id} is duplicated.`,
        ),
      );
    }
    if (labels.has(family.label)) {
      issues.push(
        familyIssue(
          "duplicate_family_label",
          `${path}.label`,
          `Canonical capability family label ${family.label} is duplicated.`,
        ),
      );
    }
    ids.add(family.id);
    labels.add(family.label);
    if (index > 0 && compareFamilies(library.families[index - 1], family) > 0) {
      issues.push(
        familyIssue(
          "noncanonical_order",
          path,
          `Canonical capability family ${family.id || "<empty>"} is out of order.`,
        ),
      );
    }
  });

  issues.sort(
    (left, right) =>
      compareText(left.path, right.path) ||
      compareText(left.code, right.code) ||
      compareText(left.message, right.message),
  );
  return issues.length > 0 ? { ok: false, issues } : { ok: true, library };
}

export function validateCanonicalCapabilityFamilyLibraryVersionTransition(
  previous: CanonicalCapabilityFamilyLibrary,
  next: CanonicalCapabilityFamilyLibrary,
): CanonicalCapabilityFamilyLibraryVersionTransitionResult {
  const previousValidation = validateCanonicalCapabilityFamilyLibrary(previous);
  const nextValidation = validateCanonicalCapabilityFamilyLibrary(next);
  const invalid: CanonicalCapabilityFamilyLibraryVersionTransitionIssue[] = [];

  if (!previousValidation.ok) {
    invalid.push({
      code: "invalid_previous_library",
      severity: "error",
      path: "previous",
      message: `Previous canonical capability family library is invalid: ${JSON.stringify(previousValidation.issues)}.`,
    });
  }
  if (!nextValidation.ok) {
    invalid.push({
      code: "invalid_next_library",
      severity: "error",
      path: "next",
      message: `Next canonical capability family library is invalid: ${JSON.stringify(nextValidation.issues)}.`,
    });
  }
  if (invalid.length > 0) return { ok: false, issues: invalid };

  const contentChanged =
    serializeCanonicalCapabilityFamilyLibraryContent(previous) !==
    serializeCanonicalCapabilityFamilyLibraryContent(next);
  const versionChanged = previous.contentVersion !== next.contentVersion;
  if (contentChanged && !versionChanged) {
    return {
      ok: false,
      issues: [{
        code: "content_changed_without_version_change",
        severity: "error",
        path: "contentVersion",
        message: "Canonical capability family content changed without a content-version change.",
      }],
    };
  }
  if (!contentChanged && versionChanged) {
    return {
      ok: true,
      warnings: [{
        code: "content_unchanged_with_version_change",
        severity: "warning",
        path: "contentVersion",
        message: "Canonical capability family content version changed without a structural content change.",
      }],
    };
  }
  return { ok: true, warnings: [] };
}

export function validateCanonicalCapabilityFamilyMembership(input: {
  readonly capabilityLibrary: CanonicalCapabilityLibrary;
  readonly familyLibrary: CanonicalCapabilityFamilyLibrary;
}): CanonicalCapabilityFamilyMembershipValidationResult {
  const familyValidation = validateCanonicalCapabilityFamilyLibrary(input.familyLibrary);
  const capabilityValidation = validateCanonicalCapabilityLibrary(input.capabilityLibrary);
  const issues: CanonicalCapabilityFamilyMembershipIssue[] = [];

  if (!familyValidation.ok) {
    issues.push({
      code: "invalid_family_library",
      path: "familyLibrary",
      message: `Canonical capability family library is invalid: ${JSON.stringify(familyValidation.issues)}.`,
      sourceIssues: familyValidation.issues,
    });
  }
  if (!capabilityValidation.ok) {
    issues.push({
      code: "invalid_capability_library",
      path: "capabilityLibrary",
      message: `Canonical capability library is invalid: ${JSON.stringify(capabilityValidation.issues)}.`,
      sourceIssues: capabilityValidation.issues,
    });
  }
  if (issues.length > 0) return { ok: false, issues };

  const familyByLabel = new Map(
    input.familyLibrary.families.map((family) => [family.label, family] as const),
  );
  const memberships: CanonicalCapabilityFamilyMembership[] = [];
  [...input.capabilityLibrary.capabilities]
    .sort((left, right) => compareText(left.id, right.id))
    .forEach((capability) => {
      const family = familyByLabel.get(capability.family);
      if (!family) {
        issues.push({
          code: "unknown_capability_family",
          path: `capabilityLibrary.capabilities[${capability.id}].family`,
          message: `Canonical capability ${capability.id} references unknown family label ${capability.family}.`,
        });
        return;
      }
      memberships.push({
        capabilityId: capability.id,
        capabilityLabel: capability.label,
        familyId: family.id,
        familyLabel: family.label,
      });
    });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, memberships };
}

const seedFamilies = [
  {
    id: "analytics-insight",
    label: "Analytics & Insight",
    description: "Measurement, analysis, modelling, research methods, and synthesis used to generate evidence and insight.",
  },
  {
    id: "commercial",
    label: "Commercial",
    description: "Revenue, value, negotiation, selling, and commercial relationship capabilities.",
  },
  {
    id: "communication-collaboration",
    label: "Communication & Collaboration",
    description: "Narrative, influence, partnering, engagement, and cross-functional alignment capabilities.",
  },
  {
    id: "customer-market",
    label: "Customer & Market",
    description: "Capabilities for understanding customer, audience, and market behaviour and needs.",
  },
  {
    id: "data-technology",
    label: "Data & Technology",
    description: "Reusable technology application, architecture, automation, systems, and tooling-enablement capabilities.",
  },
  {
    id: "governance-risk",
    label: "Governance & Risk",
    description: "Decision rights, controls, compliance, risk, assurance, and formal oversight capabilities.",
  },
  {
    id: "leadership",
    label: "Leadership",
    description: "Capabilities for leading people, teams, or accountable organisational direction.",
  },
  {
    id: "learning-development",
    label: "Learning & Development",
    description: "Learning design, educational delivery, capability development, and learning-outcome capabilities.",
  },
  {
    id: "operations-delivery",
    label: "Operations & Delivery",
    description: "Capabilities for planning, coordinating, delivering, operating, and improving services or work.",
  },
  {
    id: "people-organisation",
    label: "People & Organisation",
    description: "Workforce, organisation design, employee relations, talent, and people-system capabilities.",
  },
  {
    id: "product",
    label: "Product",
    description: "Product discovery, decision systems, operating cadence, and product-specific capability development.",
  },
  {
    id: "strategy-transformation",
    label: "Strategy & Transformation",
    description: "Direction-setting, prioritisation, operating-model change, and planned transformation capabilities.",
  },
].map((family) => Object.freeze(family)) as readonly CanonicalCapabilityFamily[];

/** Governed capability families only; these are not role domains or presentation categories. */
export const canonicalCapabilityFamilyLibrary: CanonicalCapabilityFamilyLibrary = Object.freeze({
  schemaVersion: CANONICAL_CAPABILITY_FAMILY_LIBRARY_SCHEMA_VERSION,
  contentVersion: CANONICAL_CAPABILITY_FAMILY_LIBRARY_CONTENT_VERSION,
  families: Object.freeze(seedFamilies),
});
