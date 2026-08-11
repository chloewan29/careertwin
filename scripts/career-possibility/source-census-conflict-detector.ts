import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { canonicalCapabilityFamilyLibrary } from "../../lib/career-possibility/canonical-capability-family-library";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { compileCurrentCapabilitySourceCensus } from "./source-census-compiler";

export const SOURCE_COMPILER_COMMIT = "3a0b4c35a7de84aeb8b93dbeba8b83e17b859669";
export const SOURCE_PLANNING_ARTIFACT =
  "artifacts/career-possibility/source-census-wave2-planning.2026-08-11T12-30-18-541+10-00.json";
export const CONFLICT_ARTIFACT_DIRECTORY = "artifacts/career-possibility";

export type ConflictSignalType =
  | "ID_DUPLICATE"
  | "NAME_NEAR_DUPLICATE"
  | "FAMILY_REFERENCE_INVALID"
  | "FAMILY_ALIGNMENT_REVIEW"
  | "EVIDENCE_INSUFFICIENCY_HOLD"
  | "ROUTING_CONTRADICTION_REVIEW"
  | "NO_CONFLICT_SIGNAL";

export type PlanningDisposition =
  | "LOW_RISK_REVIEW_CANDIDATE"
  | "TARGETED_REVIEW_HOLD"
  | "CONFLICT_REVIEW_HOLD";

export interface ScannerCapabilityInput {
  capabilityId?: unknown;
  capabilityName?: unknown;
  label?: unknown;
  family?: unknown;
  canonicalFamilyId?: unknown;
  sourceSufficiency?: unknown;
  generationRoute?: unknown;
  richArchetypeUsageCount?: unknown;
  seededUsageCount?: unknown;
  nonBoilerplateExpectedEvidenceCount?: unknown;
  mappingClueCount?: unknown;
  evidenceSignalClueCount?: unknown;
}

export interface ConflictSignal {
  type: ConflictSignalType;
  severity: "INFO" | "REVIEW" | "BLOCKING";
  message: string;
  evidence: Record<string, unknown>;
}

export interface CapabilityConflictResult {
  capabilityId: string;
  capabilityName: string;
  canonicalFamilyId: string;
  currentSufficiency: string;
  currentRouting: string;
  signals: ConflictSignal[];
  recommendedPlanningDisposition: PlanningDisposition;
}

const blockingSignalTypes = new Set<ConflictSignalType>([
  "ID_DUPLICATE",
  "NAME_NEAR_DUPLICATE",
  "FAMILY_REFERENCE_INVALID",
  "ROUTING_CONTRADICTION_REVIEW",
]);

const expectedRouteBySufficiency: Record<string, string> = {
  STRONG: "AUTO_GENERATION_CANDIDATE",
  MODERATE: "AUTO_GENERATION_CANDIDATE",
  WEAK: "TARGETED_REVIEW_CANDIDATE",
  INSUFFICIENT: "ONTOLOGY_ENRICHMENT_REQUIRED",
};

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function normaliseCapabilityName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasEnoughEvidenceForLowRisk(capability: ScannerCapabilityInput): boolean {
  const sufficiency = asString(capability.sourceSufficiency);
  const routing = asString(capability.generationRoute);
  const evidenceCount =
    numberOrZero(capability.richArchetypeUsageCount) +
    numberOrZero(capability.seededUsageCount) +
    numberOrZero(capability.nonBoilerplateExpectedEvidenceCount) +
    numberOrZero(capability.mappingClueCount) +
    numberOrZero(capability.evidenceSignalClueCount);

  return (
    (sufficiency === "STRONG" || sufficiency === "MODERATE") &&
    routing === "AUTO_GENERATION_CANDIDATE" &&
    evidenceCount > 0
  );
}

export function scanCapabilityConflicts(
  rawCapabilities: ScannerCapabilityInput[],
  canonicalFamilyIds: Iterable<string>,
  generatedAt = new Date().toISOString(),
) {
  const familyIds = new Set(Array.from(canonicalFamilyIds, (value) => value.trim()).filter(Boolean));
  const prepared = rawCapabilities.map((capability, index) => {
    const capabilityId = asString(capability.capabilityId);
    const capabilityName = asString(capability.capabilityName) || asString(capability.label);
    const canonicalFamilyId =
      asString(capability.canonicalFamilyId) || asString(capability.family);
    return {
      raw: capability,
      index,
      capabilityId,
      capabilityName,
      canonicalFamilyId,
      currentSufficiency: asString(capability.sourceSufficiency),
      currentRouting: asString(capability.generationRoute),
      normalisedName: normaliseCapabilityName(capabilityName),
    };
  });

  const indexesById = new Map<string, number[]>();
  const indexesByName = new Map<string, number[]>();
  for (const item of prepared) {
    if (item.capabilityId) {
      indexesById.set(item.capabilityId, [...(indexesById.get(item.capabilityId) ?? []), item.index]);
    }
    if (item.normalisedName) {
      indexesByName.set(item.normalisedName, [
        ...(indexesByName.get(item.normalisedName) ?? []),
        item.index,
      ]);
    }
  }

  const capabilityConflictSignals: CapabilityConflictResult[] = prepared.map((item) => {
    const signals: ConflictSignal[] = [];
    const duplicateIndexes = indexesById.get(item.capabilityId) ?? [];
    if (!item.capabilityId || duplicateIndexes.length > 1) {
      signals.push({
        type: "ID_DUPLICATE",
        severity: "BLOCKING",
        message: item.capabilityId
          ? `Canonical capability ID '${item.capabilityId}' appears ${duplicateIndexes.length} times.`
          : "Canonical capability ID is missing.",
        evidence: { capabilityId: item.capabilityId, occurrenceCount: duplicateIndexes.length },
      });
    }

    const sameNameIndexes = indexesByName.get(item.normalisedName) ?? [];
    const otherNameMatches = sameNameIndexes.filter((index) => index !== item.index);
    if (item.normalisedName && otherNameMatches.length > 0) {
      const matches = otherNameMatches.map((index) => prepared[index]);
      signals.push({
        type: "NAME_NEAR_DUPLICATE",
        severity: "BLOCKING",
        message: `Capability name normalises to '${item.normalisedName}', matching another capability.`,
        evidence: {
          normalisedName: item.normalisedName,
          matchingCapabilityIds: matches.map((match) => match.capabilityId),
        },
      });

      const crossFamilyMatches = matches.filter(
        (match) => match.canonicalFamilyId !== item.canonicalFamilyId,
      );
      if (crossFamilyMatches.length > 0) {
        signals.push({
          type: "FAMILY_ALIGNMENT_REVIEW",
          severity: "REVIEW",
          message: "A normalised-name match crosses canonical family references.",
          evidence: {
            currentFamilyId: item.canonicalFamilyId,
            matchingCapabilities: crossFamilyMatches.map((match) => ({
              capabilityId: match.capabilityId,
              canonicalFamilyId: match.canonicalFamilyId,
            })),
          },
        });
      }
    }

    if (!item.canonicalFamilyId || !familyIds.has(item.canonicalFamilyId)) {
      signals.push({
        type: "FAMILY_REFERENCE_INVALID",
        severity: "BLOCKING",
        message: item.canonicalFamilyId
          ? `Canonical family reference '${item.canonicalFamilyId}' is not in the supplied family inventory.`
          : "Canonical family reference is missing.",
        evidence: { canonicalFamilyId: item.canonicalFamilyId },
      });
    }

    const expectedRoute = expectedRouteBySufficiency[item.currentSufficiency];
    const sameIdStates = duplicateIndexes.map((index) => prepared[index]);
    const stateContradiction = sameIdStates.some(
      (match) =>
        match.currentSufficiency !== item.currentSufficiency ||
        match.currentRouting !== item.currentRouting,
    );
    if (!expectedRoute || expectedRoute !== item.currentRouting || stateContradiction) {
      signals.push({
        type: "ROUTING_CONTRADICTION_REVIEW",
        severity: "BLOCKING",
        message: stateContradiction
          ? "Duplicate capability records contain contradictory sufficiency or routing states."
          : "Capability sufficiency and routing do not match the compiler's deterministic routing contract.",
        evidence: {
          currentSufficiency: item.currentSufficiency,
          currentRouting: item.currentRouting,
          expectedRouting: expectedRoute ?? null,
          duplicateStates: sameIdStates.map((match) => ({
            sourceSufficiency: match.currentSufficiency,
            generationRoute: match.currentRouting,
          })),
        },
      });
    }

    const evidenceInsufficient =
      item.currentSufficiency === "INSUFFICIENT" ||
      item.currentRouting === "ONTOLOGY_ENRICHMENT_REQUIRED";
    if (evidenceInsufficient) {
      signals.push({
        type: "EVIDENCE_INSUFFICIENCY_HOLD",
        severity: "REVIEW",
        message: "Current evidence is insufficient for low-risk enrichment classification.",
        evidence: {
          currentSufficiency: item.currentSufficiency,
          currentRouting: item.currentRouting,
        },
      });
    }

    const hasBlockingSignal = signals.some((signal) => blockingSignalTypes.has(signal.type));
    let recommendedPlanningDisposition: PlanningDisposition = "TARGETED_REVIEW_HOLD";
    if (hasBlockingSignal) {
      recommendedPlanningDisposition = "CONFLICT_REVIEW_HOLD";
    } else if (!evidenceInsufficient && hasEnoughEvidenceForLowRisk(item.raw)) {
      recommendedPlanningDisposition = "LOW_RISK_REVIEW_CANDIDATE";
    }

    if (signals.length === 0) {
      signals.push({
        type: "NO_CONFLICT_SIGNAL",
        severity: "INFO",
        message: "No deterministic conflict signal was found; this does not authorize enrichment.",
        evidence: {
          familyReferenceValid: true,
          evidenceDetailAvailable: hasEnoughEvidenceForLowRisk(item.raw),
        },
      });
    }

    return {
      capabilityId: item.capabilityId,
      capabilityName: item.capabilityName,
      canonicalFamilyId: item.canonicalFamilyId,
      currentSufficiency: item.currentSufficiency,
      currentRouting: item.currentRouting,
      signals,
      recommendedPlanningDisposition,
    };
  });

  const signalTypes: ConflictSignalType[] = [
    "ID_DUPLICATE",
    "NAME_NEAR_DUPLICATE",
    "FAMILY_REFERENCE_INVALID",
    "FAMILY_ALIGNMENT_REVIEW",
    "EVIDENCE_INSUFFICIENCY_HOLD",
    "ROUTING_CONTRADICTION_REVIEW",
    "NO_CONFLICT_SIGNAL",
  ];
  const conflictSignalCounts = Object.fromEntries(
    signalTypes.map((type) => [
      type,
      capabilityConflictSignals.reduce(
        (count, capability) =>
          count + capability.signals.filter((signal) => signal.type === type).length,
        0,
      ),
    ]),
  );
  const dispositionIds = (disposition: PlanningDisposition) =>
    Array.from(
      new Set(
        capabilityConflictSignals
          .filter((capability) => capability.recommendedPlanningDisposition === disposition)
          .map((capability) => capability.capabilityId),
      ),
    );

  return {
    decisionLabel: "SOURCE_CENSUS_CONFLICT_DETECTION_SCANNER_READY",
    mode: "PLANNING / SOURCE_CENSUS_CONFLICT_DETECTION_SCANNER_BOUNDARY",
    generatedAt,
    readOnlyBoundary: true,
    sourceCompilerCommit: SOURCE_COMPILER_COMMIT,
    sourcePlanningArtifact: SOURCE_PLANNING_ARTIFACT,
    scannerSummary: {
      capabilityCount: capabilityConflictSignals.length,
      conflictSignalCounts,
      hasBlockingConflictSignals: capabilityConflictSignals.some((capability) =>
        capability.signals.some((signal) => blockingSignalTypes.has(signal.type)),
      ),
      semanticDriftStatus: "DETERMINISTIC_SCANNER_ONLY",
      conflictDetectionStatus: "READ_ONLY_DETERMINISTIC_SCANNER",
      conflictDetectionScope: "STRUCTURAL_PREFLIGHT_ONLY",
      semanticSimilarity: "NOT_EVALUATED",
      semanticDrift: "NOT_EVALUATED",
    },
    capabilityConflictSignals,
    wave2DispositionSummary: {
      lowRiskReviewCandidates: dispositionIds("LOW_RISK_REVIEW_CANDIDATE"),
      targetedReviewHoldCandidates: dispositionIds("TARGETED_REVIEW_HOLD"),
      conflictReviewHoldCandidates: dispositionIds("CONFLICT_REVIEW_HOLD"),
    },
    limitations: [
      "This scanner is deterministic and read-only.",
      "It does not evaluate full semantic drift.",
      "It does not authorize ontology writes.",
      "It does not use embeddings, LLMs, or human semantic judgment.",
      "Canonical display labels are read from the existing canonical capability library; no secondary name owner is created.",
      "If a canonical display label is unavailable, label-level duplicate detection is not evaluated for that record; capability IDs are never substituted as names.",
      "Exact equality after conservative name normalisation is the only near-duplicate threshold; broader semantic similarity remains untested.",
      "Absence of an explicit structural signal does not establish semantic conflict clearance.",
    ],
    nonGoalsConfirmed: {
      ontologyModified: false,
      roleKnowledgeModified: false,
      productionAppModified: false,
      semanticPolicyModified: false,
      packageFilesModified: false,
      holdModified: false,
    },
    recommendedNextMode: "PLANNING / SOURCE_CENSUS_WAVE2_REPLAN_WITH_CONFLICT_SIGNALS",
  };
}

export function scanCurrentSourceCensus(generatedAt = new Date().toISOString()) {
  const census = compileCurrentCapabilitySourceCensus();
  const familyIdByLabel = new Map(
    canonicalCapabilityFamilyLibrary.families.map((family) => [family.label, family.id]),
  );
  const capabilityLabelById = new Map(
    canonicalCapabilityLibrary.capabilities.map((capability) => [capability.id, capability.label]),
  );
  const capabilitiesWithCanonicalFamilyIds = census.capabilities.map((capability) => ({
    ...capability,
    capabilityName: capabilityLabelById.get(capability.capabilityId),
    family: familyIdByLabel.get(capability.family) ?? capability.family,
  }));
  return scanCapabilityConflicts(
    capabilitiesWithCanonicalFamilyIds,
    canonicalCapabilityFamilyLibrary.families.map((family) => family.id),
    generatedAt,
  );
}

export function writeConflictDetectionArtifact(report: ReturnType<typeof scanCurrentSourceCensus>) {
  mkdirSync(CONFLICT_ARTIFACT_DIRECTORY, { recursive: true });
  const timestamp = report.generatedAt.replace(/[:.]/g, "-");
  const artifactPath = join(
    CONFLICT_ARTIFACT_DIRECTORY,
    `source-census-conflict-detection.${timestamp}.json`,
  );
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return artifactPath.replace(/\\/g, "/");
}

if (require.main === module) {
  const report = scanCurrentSourceCensus();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const artifactPath = writeConflictDetectionArtifact(report);
    console.log("SOURCE_CENSUS_CONFLICT_DETECTION_SCANNER_READY");
    console.log(`Capabilities scanned: ${report.scannerSummary.capabilityCount}`);
    console.log(`Blocking conflict signals: ${report.scannerSummary.hasBlockingConflictSignals}`);
    console.log(`Artifact: ${artifactPath}`);
  }
}
