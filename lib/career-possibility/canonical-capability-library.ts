export const CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION = "1.0.0" as const;
export const CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION = "1.0.0" as const;

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
  Object.freeze({ id: "people-leadership", label: "People Leadership", family: "Leadership" }),
] as const satisfies readonly CanonicalCapabilityDefinition[];

/** Admitted seed identities only; this is not a complete external capability taxonomy. */
export const canonicalCapabilityLibrary: CanonicalCapabilityLibrary = Object.freeze({
  schemaVersion: CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  contentVersion: CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION,
  capabilities: Object.freeze(seedCapabilities),
});
