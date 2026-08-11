import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  CONFLICT_ARTIFACT_DIRECTORY,
  scanCapabilityConflicts,
  scanCurrentSourceCensus,
  type ScannerCapabilityInput,
} from "../../scripts/career-possibility/source-census-conflict-detector";
import { compileCurrentCapabilitySourceCensus } from "../../scripts/career-possibility/source-census-compiler";

const families = ["analytics", "commercial"];

function capability(overrides: Partial<ScannerCapabilityInput> = {}): ScannerCapabilityInput {
  return {
    capabilityId: "forecasting",
    capabilityName: "Forecasting",
    family: "analytics",
    sourceSufficiency: "MODERATE",
    generationRoute: "AUTO_GENERATION_CANDIDATE",
    richArchetypeUsageCount: 1,
    seededUsageCount: 1,
    nonBoilerplateExpectedEvidenceCount: 1,
    mappingClueCount: 0,
    evidenceSignalClueCount: 0,
    ...overrides,
  };
}

test("duplicate IDs produce ID_DUPLICATE", () => {
  const report = scanCapabilityConflicts(
    [capability(), capability({ capabilityName: "Forecasting Operations" })],
    families,
  );
  assert.equal(report.scannerSummary.conflictSignalCounts.ID_DUPLICATE, 2);
  assert.equal(report.wave2DispositionSummary.conflictReviewHoldCandidates.includes("forecasting"), true);
});

test("similar normalised names produce NAME_NEAR_DUPLICATE and cross-family review", () => {
  const report = scanCapabilityConflicts(
    [
      capability({ capabilityId: "data-strategy", capabilityName: "Data-Strategy" }),
      capability({
        capabilityId: "commercial-data-strategy",
        capabilityName: "  data strategy  ",
        family: "commercial",
      }),
    ],
    families,
  );
  assert.equal(report.scannerSummary.conflictSignalCounts.NAME_NEAR_DUPLICATE, 2);
  assert.equal(report.scannerSummary.conflictSignalCounts.FAMILY_ALIGNMENT_REVIEW, 2);
});

test("invalid family reference produces FAMILY_REFERENCE_INVALID", () => {
  const report = scanCapabilityConflicts([capability({ family: "not-canonical" })], families);
  assert.equal(report.scannerSummary.conflictSignalCounts.FAMILY_REFERENCE_INVALID, 1);
  assert.deepEqual(report.wave2DispositionSummary.conflictReviewHoldCandidates, ["forecasting"]);
});

test("insufficient enrichment-required capability remains targeted review hold", () => {
  const report = scanCapabilityConflicts(
    [
      capability({
        sourceSufficiency: "INSUFFICIENT",
        generationRoute: "ONTOLOGY_ENRICHMENT_REQUIRED",
        richArchetypeUsageCount: 0,
        seededUsageCount: 1,
        nonBoilerplateExpectedEvidenceCount: 0,
      }),
    ],
    families,
  );
  assert.equal(report.scannerSummary.conflictSignalCounts.EVIDENCE_INSUFFICIENCY_HOLD, 1);
  assert.deepEqual(report.wave2DispositionSummary.targetedReviewHoldCandidates, ["forecasting"]);
  assert.deepEqual(report.wave2DispositionSummary.lowRiskReviewCandidates, []);
});

test("scanner output serialises as valid JSON", () => {
  const report = scanCapabilityConflicts([capability()], families);
  assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
});

test("missing display labels never fall back to capability IDs", () => {
  const report = scanCapabilityConflicts(
    [capability({ capabilityName: undefined, label: undefined })],
    families,
  );
  assert.equal(report.capabilityConflictSignals[0].capabilityName, "");
  assert.equal(report.scannerSummary.conflictSignalCounts.NAME_NEAR_DUPLICATE, 0);
});

test("scanner write boundary is artifacts-only and contains no ontology or Role Knowledge write", () => {
  assert.equal(CONFLICT_ARTIFACT_DIRECTORY, "artifacts/career-possibility");
  const source = readFileSync(
    "scripts/career-possibility/source-census-conflict-detector.ts",
    "utf8",
  );
  assert.equal(/writeFileSync\([^)]*(?:lib\/career-possibility|roleCapabilityProfiles|canonical-capability)/i.test(source), false);
  assert.equal(/renameSync|unlinkSync|rmSync|appendFileSync/.test(source), false);
});

test("scanner runs against current compiler JSON contract", () => {
  const census = compileCurrentCapabilitySourceCensus();
  const report = scanCurrentSourceCensus("2026-08-11T00:00:00.000Z");
  const censusById = new Map(census.capabilities.map((capability) => [capability.capabilityId, capability]));
  const expectedEvidenceInsufficiencyCount = census.capabilities.filter(
    (capability) =>
      capability.sourceSufficiency === "INSUFFICIENT" ||
      capability.generationRoute === "ONTOLOGY_ENRICHMENT_REQUIRED",
  ).length;

  assert.equal(report.scannerSummary.capabilityCount, census.canonicalCapabilityCount);
  assert.equal(
    report.scannerSummary.conflictSignalCounts.EVIDENCE_INSUFFICIENCY_HOLD,
    expectedEvidenceInsufficiencyCount,
  );
  report.capabilityConflictSignals.forEach((capability) => {
    const current = censusById.get(capability.capabilityId);
    assert.ok(current, `Scanner emitted unknown capability ${capability.capabilityId}`);
    assert.equal(capability.currentSufficiency, current.sourceSufficiency);
    assert.equal(capability.currentRouting, current.generationRoute);
    assert.equal(
      capability.signals.some((signal) => signal.type === "EVIDENCE_INSUFFICIENCY_HOLD"),
      current.sourceSufficiency === "INSUFFICIENT" ||
        current.generationRoute === "ONTOLOGY_ENRICHMENT_REQUIRED",
    );
  });
  assert.equal(report.scannerSummary.conflictDetectionScope, "STRUCTURAL_PREFLIGHT_ONLY");
  assert.equal(report.scannerSummary.semanticSimilarity, "NOT_EVALUATED");
  assert.equal(report.scannerSummary.semanticDrift, "NOT_EVALUATED");
  assert.equal(
    report.capabilityConflictSignals.find((capability) => capability.capabilityId === "forecasting")
      ?.capabilityName,
    "Forecasting",
  );
  assert.equal(
    report.capabilityConflictSignals.every(
      (capability) => capability.capabilityName !== capability.capabilityId,
    ),
    true,
  );
  assert.equal(report.readOnlyBoundary, true);
  assert.equal(report.recommendedNextMode, "PLANNING / SOURCE_CENSUS_WAVE2_REPLAN_WITH_CONFLICT_SIGNALS");
});
