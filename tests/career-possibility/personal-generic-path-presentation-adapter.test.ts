import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPersonalGenericPathPresentation,
  PERSONAL_GENERIC_PATH_PRESENTATION_SCHEMA_VERSION,
} from "../../lib/career-possibility/personal-generic-path-presentation-adapter";
import type { GenericCareerPathAlignmentResult } from "../../lib/career-possibility/generic-career-path-alignment";

const roleIds = [
  "data-product-manager",
  "analytics-manager",
  "marketing-analytics-lead",
  "customer-insights-lead",
] as const;

const section = Object.freeze({
  totalCapabilities: 2,
  evidencedCapabilities: 1,
  strengthTotal: 0.8,
  evidenceSignalCount: 1,
});

const alignment: GenericCareerPathAlignmentResult = Object.freeze({
  schemaVersion: "1.0.0",
  modelVersion: "1.0.0",
  roles: Object.freeze(roleIds.map((roleId, index) => Object.freeze({
    roleId,
    title: roleId.replaceAll("-", " "),
    primaryMandate: `Mandate ${index + 1}`,
    primaryOwnership: Object.freeze([`Ownership ${index + 1}`]),
    calibrated: true as const,
    identityDefining: section,
    coreEnablers: section,
    supporting: section,
    differentiators: section,
    matchedCapabilities: Object.freeze([Object.freeze({
      candidateCapabilityId: `candidate-${index + 1}`,
      canonicalCapabilityId: `canonical-${index + 1}`,
      canonicalLabel: `Capability ${index + 1}`,
      canonicalFamily: "Strategy",
      section: "identity_defining" as const,
      strengthScore: 0.8,
      weightedSignalScore: 2.4,
      signalCount: 1,
      supportingEvidence: Object.freeze([Object.freeze({
        evidenceSignalId: `signal-${index + 1}`,
        evidencePieceId: `piece-${index + 1}`,
        text: `Evidence ${index + 1}`,
        ownership: "owner",
        scope: "function",
        impact: "strategic",
      })]),
    })]),
    missingEvidenceCapabilities: Object.freeze([Object.freeze({
      canonicalCapabilityId: `missing-${index + 1}`,
      canonicalLabel: `Missing ${index + 1}`,
      section: "core_enabler" as const,
      wording: "Evidence not represented in the current candidate baseline" as const,
    })]),
    orderingBasis: Object.freeze([4 - index]),
    explanation: `Evidence-backed direction ${index + 1}`,
  }))),
  unresolvedCandidateCapabilities: Object.freeze([Object.freeze({
    candidateCapabilityId: "candidate-unresolved",
    displayName: "Unresolved capability",
    strengthScore: 0.9,
    reason: "No explicit admitted canonical identity mapping" as const,
  })]),
});

const before = JSON.stringify(alignment);
const presentation = buildPersonalGenericPathPresentation(alignment);
assert.equal(JSON.stringify(alignment), before);
assert.equal(presentation.schemaVersion, PERSONAL_GENERIC_PATH_PRESENTATION_SCHEMA_VERSION);
assert.deepEqual(presentation.paths.map((path) => path.roleId), roleIds);
assert.deepEqual(presentation.paths.map((path) => path.directionOrder), [1, 2, 3, 4]);
assert.equal(presentation.paths[0].primaryMandate, "Mandate 1");
assert.deepEqual(presentation.paths[0].primaryOwnership, ["Ownership 1"]);
assert.equal(presentation.paths[0].identityDefining.evidence[0].evidenceSignalId, "signal-1");
assert.equal(presentation.paths[0].coreEnablers.evidence.length, 0);
assert.equal(presentation.paths[0].missingEvidenceCapabilities[0].wording, "Evidence not represented in the current candidate baseline");
assert.equal(presentation.unresolvedCapabilities[0].candidateCapabilityId, "candidate-unresolved");
assert.equal(Object.isFrozen(presentation), true);
assert.equal(Object.isFrozen(presentation.paths), true);
assert.equal(Object.isFrozen(presentation.paths[0].identityDefining.evidence), true);
assert.deepEqual(buildPersonalGenericPathPresentation(alignment), presentation);
assert.deepEqual(JSON.parse(JSON.stringify(presentation)), presentation);

const consumerJson = JSON.stringify(presentation);
assert.equal(/fitScore|strengthScore|weightedSignalScore|percentage|hiring|readiness/i.test(consumerJson), false);
const source = readFileSync("lib/career-possibility/personal-generic-path-presentation-adapter.ts", "utf8");
assert.equal(/\.sort\(|buildCandidateCapabilityBaseline|buildGenericCareerPathAlignment|getCapabilityMatchV2|localStorage|supabase/i.test(source), false);

console.log("personal generic path presentation adapter tests passed");
