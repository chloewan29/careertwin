export const CAREER_SOURCE_REVISION_SCHEMA_VERSION = "1.0.0" as const;
export const CAREER_SOURCE_NORMALISATION_VERSION = "normalisation-lf-bom-1.0.0" as const;
export const CAREER_SOURCE_REVISION_ALGORITHM_VERSION = "sha256-1.0.0" as const;

export type CareerSourceRevisionInput = {
  readonly sourceDocuments: readonly {
    readonly canonicalText: string;
  }[];
  readonly normalisationVersion: typeof CAREER_SOURCE_NORMALISATION_VERSION;
};

export type CareerSourceRevisionResult = {
  readonly schemaVersion: typeof CAREER_SOURCE_REVISION_SCHEMA_VERSION;
  readonly normalisationVersion: typeof CAREER_SOURCE_NORMALISATION_VERSION;
  readonly algorithmVersion: typeof CAREER_SOURCE_REVISION_ALGORITHM_VERSION;
  readonly algorithm: "SHA-256";
  readonly sourceRevision: string;
  readonly documentCount: number;
};

export type CareerSourceRevisionErrorCode =
  | "empty_source_set"
  | "empty_source_document"
  | "unsupported_normalisation_version"
  | "crypto_unavailable"
  | "digest_failed"
  | "invalid_input";

export class CareerSourceRevisionError extends Error {
  readonly code: CareerSourceRevisionErrorCode;

  constructor(code: CareerSourceRevisionErrorCode, message: string) {
    super(message);
    this.name = "CareerSourceRevisionError";
    this.code = code;
  }
}

type DocumentDigestRecord = {
  readonly digest: string;
  readonly byteLength: number;
};

const encoder = new TextEncoder();

function canonicaliseSourceText(text: string): string {
  const withoutLeadingBom = text.startsWith("\uFEFF") ? text.slice(1) : text;
  return withoutLeadingBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function bytesToLowercaseHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function webCryptoDigest(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    throw new CareerSourceRevisionError("crypto_unavailable", "Web Crypto SHA-256 is unavailable.");
  }
  return subtle;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  let digest: ArrayBuffer;
  try {
    const digestInput = new Uint8Array(new ArrayBuffer(bytes.byteLength));
    digestInput.set(bytes);
    digest = await webCryptoDigest().digest("SHA-256", digestInput);
  } catch (error) {
    if (error instanceof CareerSourceRevisionError) throw error;
    throw new CareerSourceRevisionError("digest_failed", "SHA-256 revision calculation failed.");
  }

  const digestBytes = new Uint8Array(digest);
  if (digestBytes.byteLength !== 32) {
    throw new CareerSourceRevisionError("digest_failed", "SHA-256 returned an invalid digest.");
  }
  return bytesToLowercaseHex(digestBytes);
}

/**
 * Builds sensitive internal identity metadata for source reconciliation.
 * A deterministic revision can reveal equality to a party that already has the
 * same source text; it is not an opaque bundle, session, subject, or public ID.
 */
export async function buildCareerSourceRevision(
  input: CareerSourceRevisionInput,
): Promise<CareerSourceRevisionResult> {
  if (!input || typeof input !== "object" || !Array.isArray(input.sourceDocuments)) {
    throw new CareerSourceRevisionError("invalid_input", "Source revision input is invalid.");
  }
  if (input.normalisationVersion !== CAREER_SOURCE_NORMALISATION_VERSION) {
    throw new CareerSourceRevisionError(
      "unsupported_normalisation_version",
      "Source normalisation policy version is unsupported.",
    );
  }
  if (input.sourceDocuments.length === 0) {
    throw new CareerSourceRevisionError("empty_source_set", "At least one source document is required.");
  }

  const records: DocumentDigestRecord[] = [];
  for (const document of input.sourceDocuments) {
    if (!document || typeof document !== "object" || typeof document.canonicalText !== "string") {
      throw new CareerSourceRevisionError("invalid_input", "A source document is invalid.");
    }
    const canonicalText = canonicaliseSourceText(document.canonicalText);
    if (canonicalText.trim().length === 0) {
      throw new CareerSourceRevisionError("empty_source_document", "A source document is empty.");
    }
    const bytes = encoder.encode(canonicalText);
    records.push(Object.freeze({ digest: await sha256(bytes), byteLength: bytes.byteLength }));
  }

  records.sort((left, right) => left.digest.localeCompare(right.digest) || left.byteLength - right.byteLength);
  const manifest = JSON.stringify({
    schemaVersion: CAREER_SOURCE_REVISION_SCHEMA_VERSION,
    normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION,
    algorithmVersion: CAREER_SOURCE_REVISION_ALGORITHM_VERSION,
    documentCount: records.length,
    documents: records,
  });
  const sourceSetDigest = await sha256(encoder.encode(manifest));

  return Object.freeze({
    schemaVersion: CAREER_SOURCE_REVISION_SCHEMA_VERSION,
    normalisationVersion: CAREER_SOURCE_NORMALISATION_VERSION,
    algorithmVersion: CAREER_SOURCE_REVISION_ALGORITHM_VERSION,
    algorithm: "SHA-256",
    sourceRevision: `career-source-revision:schema-${CAREER_SOURCE_REVISION_SCHEMA_VERSION}:${CAREER_SOURCE_NORMALISATION_VERSION}:sha256:${sourceSetDigest}`,
    documentCount: records.length,
  });
}
