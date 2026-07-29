import { strict as assert } from "node:assert";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import {
  CANONICAL_CAPABILITY_GOVERNANCE_CONTENT_VERSION,
  CANONICAL_CAPABILITY_GOVERNANCE_SCHEMA_VERSION,
  canonicalCapabilityGovernanceLibrary,
  validateCanonicalCapabilityGovernance,
  type CanonicalCapabilityGovernanceLibrary,
} from "../../lib/career-possibility/canonical-capability-governance-decisions";

const reviewedCandidateIds = [
  "analytics-governance", "analytics-leadership", "architecture-governance", "benefits-realisation", "business-ownership", "business-partnering", "campaign-planning", "change-leadership", "clinical-delivery", "commercial-analysis", "commercial-leadership", "commercial-modelling", "data-storytelling", "decision-storytelling", "ecosystem-operations", "education-delivery", "education-partnerships", "engineering-delivery", "executive-engagement", "executive-narrative", "executive-reporting", "financial-planning", "gtm-planning", "hr-systems", "investment-governance", "learner-outcomes", "learning-design", "legal-technology", "legal-workflow", "marketing-effectiveness", "matter-management", "operating-control", "operating-strategy", "partner-strategy", "people-process", "pipeline-management", "policy-governance", "program-planning", "quality-oversight", "renewal-risk", "resource-planning", "risk-controls", "roadmap-governance", "service-operations", "service-performance", "site-management", "stakeholder-governance", "strategic-analysis", "talent-planning", "technical-leadership", "tooling-enablement", "value-realisation", "vendor-governance", "workforce-advisory",
] as const;

assert.equal(CANONICAL_CAPABILITY_GOVERNANCE_SCHEMA_VERSION, "1.0.0");
assert.equal(CANONICAL_CAPABILITY_GOVERNANCE_CONTENT_VERSION, "1.0.0");
assert.equal(canonicalCapabilityGovernanceLibrary.decisions.length, 54);
assert.equal(Object.isFrozen(canonicalCapabilityGovernanceLibrary), true);
assert.equal(Object.isFrozen(canonicalCapabilityGovernanceLibrary.decisions), true);
assert.equal(canonicalCapabilityGovernanceLibrary.decisions.every(Object.isFrozen), true);
assert.deepEqual(
  canonicalCapabilityGovernanceLibrary.decisions.map((item) => item.capabilityId),
  [...reviewedCandidateIds].sort((a, b) => a.localeCompare(b, "en")),
);
assert.equal(new Set(canonicalCapabilityGovernanceLibrary.decisions.map((item) => item.capabilityId)).size, 54);
assert.deepEqual(
  Object.fromEntries(["admit", "defer", "exclude"].map((outcome) => [outcome, canonicalCapabilityGovernanceLibrary.decisions.filter((item) => item.outcome === outcome).length])),
  { admit: 26, defer: 27, exclude: 1 },
);

const validation = validateCanonicalCapabilityGovernance({
  library: canonicalCapabilityGovernanceLibrary,
  reviewedCandidateIds,
  canonicalLibrary: canonicalCapabilityLibrary,
});
assert.deepEqual(validation, { ok: true });
assert.deepEqual(validateCanonicalCapabilityGovernance({ library: canonicalCapabilityGovernanceLibrary, reviewedCandidateIds, canonicalLibrary: canonicalCapabilityLibrary }), validation);
assert.deepEqual(JSON.parse(JSON.stringify(validation)), validation);

const invalid = (library: CanonicalCapabilityGovernanceLibrary, candidateIds = reviewedCandidateIds) =>
  validateCanonicalCapabilityGovernance({ library, reviewedCandidateIds: candidateIds, canonicalLibrary: canonicalCapabilityLibrary });
const duplicate = structuredClone(canonicalCapabilityGovernanceLibrary);
duplicate.decisions = [...duplicate.decisions, duplicate.decisions[0]];
const duplicateResult = invalid(duplicate);
assert.equal(duplicateResult.ok, false);
if (!duplicateResult.ok) assert.ok(duplicateResult.issues.some((item) => item.code === "duplicate_decision_id"));
const missingResult = invalid({ ...structuredClone(canonicalCapabilityGovernanceLibrary), decisions: canonicalCapabilityGovernanceLibrary.decisions.slice(1) });
assert.equal(missingResult.ok, false);
if (!missingResult.ok) assert.ok(missingResult.issues.some((item) => item.code === "missing_candidate_decision"));
const extraResult = invalid(canonicalCapabilityGovernanceLibrary, [...reviewedCandidateIds, "nonexistent-candidate"]);
assert.equal(extraResult.ok, false);
if (!extraResult.ok) assert.ok(extraResult.issues.some((item) => item.code === "missing_candidate_decision"));

console.log("canonical-capability-governance-decisions.test passed");
