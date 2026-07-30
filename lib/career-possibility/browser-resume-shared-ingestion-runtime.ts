import {
  buildSharedCareerIngestionBundleFromResumeReview,
  type BrowserResumeSharedIngestionIssue,
  type BuildBrowserResumeSharedIngestionInput,
} from "./browser-resume-shared-ingestion-adapter";
import {
  CAREER_SOURCE_NORMALISATION_VERSION,
  buildCareerSourceRevision,
} from "./career-source-revision";
import type { ResumeEvidenceBundle, ResumeSourceSpan } from "./resume-evidence-contract";
import type { ResumeEvidenceExtractionMetadata } from "./resume-evidence-extraction-contract";
import type { ResumeEvidenceReviewSession } from "./resume-evidence-review-contract";
import type { CareerSubjectBinding, SharedCareerIngestionBundle } from "./shared-career-ingestion-bundle-contract";

export const BROWSER_RESUME_EXTRACTION_REVISION_SCHEMA_VERSION = "1.0.0" as const;
export const BROWSER_RESUME_EXTRACTION_STRUCTURE_VERSION = "1.0.0" as const;
export const PRIMARY_RESUME_DOCUMENT_OCCURRENCE_ID = "primary-resume-paste" as const;

export type BrowserResumeRuntimeIdentity = {
  readonly bundleId: string;
  readonly subjectBinding: CareerSubjectBinding;
  readonly documentOccurrenceId: typeof PRIMARY_RESUME_DOCUMENT_OCCURRENCE_ID;
};

export type SharedBundleRuntimeState =
  | { readonly status: "idle" }
  | { readonly status: "building" }
  | {
      readonly status: "ready";
      readonly bundle: SharedCareerIngestionBundle;
      readonly sourceRevision: string;
      readonly manifestRevision: string;
      readonly reviewRevision: string;
    }
  | {
      readonly status: "failed";
      readonly issues: readonly BrowserResumeSharedIngestionIssue[];
    };

export type BuildBrowserResumeSharedIngestionRuntimeInput = {
  readonly canonicalResumeText: string;
  readonly extractedBundle: ResumeEvidenceBundle;
  readonly extractionMetadata: ResumeEvidenceExtractionMetadata;
  readonly reviewedEvidenceBundle: ResumeEvidenceBundle;
  readonly reviewSession: ResumeEvidenceReviewSession;
  readonly capabilityRegistryVersion: string;
  readonly identity: BrowserResumeRuntimeIdentity;
  readonly semanticPayloadRevisions?: BuildBrowserResumeSharedIngestionInput["semanticPayloadRevisions"];
};

type StructuralLocator = {
  readonly startOffset: number | null;
  readonly endOffset: number | null;
  readonly pageNumber: number | null;
  readonly section: string | null;
};

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function structuralLocator(span: ResumeSourceSpan | undefined): StructuralLocator {
  return {
    startOffset: span?.startOffset ?? null,
    endOffset: span?.endOffset ?? null,
    pageNumber: span?.pageNumber ?? null,
    section: span?.section ?? null,
  };
}

function compareLocators(left: StructuralLocator, right: StructuralLocator): number {
  return (left.startOffset ?? -1) - (right.startOffset ?? -1)
    || (left.endOffset ?? -1) - (right.endOffset ?? -1)
    || (left.pageNumber ?? -1) - (right.pageNumber ?? -1)
    || (left.section ?? "").localeCompare(right.section ?? "");
}

async function sha256(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
  const digest = await subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

export function createBrowserResumeRuntimeIdentity(
  randomUUID: () => string = () => globalThis.crypto.randomUUID(),
): BrowserResumeRuntimeIdentity {
  const bundleUuid = randomUUID().toLowerCase();
  const subjectUuid = randomUUID().toLowerCase();
  return Object.freeze({
    bundleId: `career-shared-bundle:browser:${bundleUuid}`,
    subjectBinding: Object.freeze({
      status: "anonymous" as const,
      anonymousSubjectId: `career-anonymous-subject:browser:${subjectUuid}`,
      authenticatedSubjectId: null,
    }),
    documentOccurrenceId: PRIMARY_RESUME_DOCUMENT_OCCURRENCE_ID,
  });
}

export async function buildBrowserResumeExtractionRevision(input: {
  readonly sourceRevision: string;
  readonly bundle: ResumeEvidenceBundle;
  readonly metadata: ResumeEvidenceExtractionMetadata;
}): Promise<string> {
  const employment = input.bundle.employmentRecords.map((record) => ({
    localId: record.id,
    locator: structuralLocator(input.bundle.sourceSpans.find((span) => span.id === record.sourceSpanIds[0])),
  })).sort((left, right) => compareLocators(left.locator, right.locator));
  const employmentOrdinal = new Map(employment.map((record, index) => [record.localId, index]));
  const evidence = input.bundle.evidenceRecords.map((record) => ({
    employmentOrdinal: employmentOrdinal.get(record.employmentRecordId) ?? null,
    locator: structuralLocator(input.bundle.sourceSpans.find((span) => span.id === record.sourceSpanIds[0])),
  })).sort((left, right) => left.employmentOrdinal === right.employmentOrdinal
    ? compareLocators(left.locator, right.locator)
    : (left.employmentOrdinal ?? -1) - (right.employmentOrdinal ?? -1));
  const manifest = JSON.stringify({
    schemaVersion: BROWSER_RESUME_EXTRACTION_REVISION_SCHEMA_VERSION,
    structureVersion: BROWSER_RESUME_EXTRACTION_STRUCTURE_VERSION,
    sourceRevision: input.sourceRevision,
    extractionSchemaVersion: input.bundle.schemaVersion,
    parserName: input.metadata.parserName,
    parserVersion: input.metadata.parserVersion,
    normalisationVersion: input.metadata.normalisationVersion,
    employment: employment.map((record) => record.locator),
    evidence,
  });
  return `career-extraction-revision:schema-${BROWSER_RESUME_EXTRACTION_REVISION_SCHEMA_VERSION}:structure-${BROWSER_RESUME_EXTRACTION_STRUCTURE_VERSION}:sha256:${await sha256(manifest)}`;
}

export async function buildBrowserResumeSharedIngestionRuntime(
  input: BuildBrowserResumeSharedIngestionRuntimeInput,
): Promise<SharedBundleRuntimeState> {
  try {
    const source = await buildCareerSourceRevision({
      sourceDocuments: [{ canonicalText: input.canonicalResumeText }],
      normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION,
    });
    const extractionRevision = await buildBrowserResumeExtractionRevision({
      sourceRevision: source.sourceRevision,
      bundle: input.extractedBundle,
      metadata: input.extractionMetadata,
    });
    const result = await buildSharedCareerIngestionBundleFromResumeReview({
      canonicalResumeText: input.canonicalResumeText,
      resumeEvidenceBundle: input.extractedBundle,
      reviewedEvidenceBundle: input.reviewedEvidenceBundle,
      reviewSession: input.reviewSession,
      extractionRevision,
      bundleId: input.identity.bundleId,
      documentOccurrenceId: input.identity.documentOccurrenceId,
      subjectBinding: input.identity.subjectBinding,
      capabilityRegistryVersion: input.capabilityRegistryVersion,
      ...(input.semanticPayloadRevisions ? { semanticPayloadRevisions: input.semanticPayloadRevisions } : {}),
    });
    if (!result.ok) return Object.freeze({ status: "failed", issues: result.issues });
    return Object.freeze({
      status: "ready",
      bundle: result.bundle,
      sourceRevision: result.sourceRevision,
      manifestRevision: result.manifestRevision,
      reviewRevision: result.reviewRevision,
    });
  } catch {
    return Object.freeze({
      status: "failed",
      issues: Object.freeze([Object.freeze({
        code: "source_revision_failed" as const,
        path: "runtime",
        message: "Career evidence bundle preparation failed before admission.",
      })]),
    });
  }
}
