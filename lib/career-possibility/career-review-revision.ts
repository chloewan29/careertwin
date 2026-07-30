import {
  CAREER_REVIEW_DECISION_ALGORITHM_VERSION,
  CAREER_REVIEW_IDENTITY_MODEL_VERSION,
  CAREER_REVIEW_IDENTITY_SCHEMA_VERSION,
  type CareerReviewDecisionIdentityContract,
} from "./career-review-decision-identity-contract";

export const CAREER_REVIEW_REVISION_SCHEMA_VERSION = "1.0.0" as const;
export const CAREER_REVIEW_HISTORY_MODEL_VERSION = "1.0.0" as const;
export const CAREER_REVIEW_REVISION_ALGORITHM_VERSION = "history-sha256-1.0.0" as const;

const REVISION_PREFIX = `career-review-revision:schema-${CAREER_REVIEW_REVISION_SCHEMA_VERSION}:history-${CAREER_REVIEW_HISTORY_MODEL_VERSION}:sha256:`;
const REVISION_PATTERN = /^career-review-revision:schema-1\.0\.0:history-1\.0\.0:sha256:[0-9a-f]{64}$/;

export type BuildCareerReviewRevisionInput = {
  readonly manifestRevision: string;
  readonly sourceRevision: string;
  readonly capabilityRegistryVersion: string;
  readonly reviewIdentityContract: CareerReviewDecisionIdentityContract;
  readonly priorReviewRevision: string | null;
};

export type CareerReviewRevisionResult = {
  readonly schemaVersion: typeof CAREER_REVIEW_REVISION_SCHEMA_VERSION;
  readonly historyModelVersion: typeof CAREER_REVIEW_HISTORY_MODEL_VERSION;
  readonly algorithmVersion: typeof CAREER_REVIEW_REVISION_ALGORITHM_VERSION;
  readonly algorithm: "SHA-256";
  readonly reviewRevision: string;
  readonly manifestRevision: string;
  readonly sourceRevision: string;
  readonly capabilityRegistryVersion: string;
  readonly priorReviewRevision: string | null;
  readonly decisionCount: number;
  readonly proposalCount: number;
  readonly mappingCount: number;
};

export type CareerReviewRevisionErrorCode =
  | "missing_manifest_revision"
  | "missing_source_revision"
  | "missing_registry_version"
  | "invalid_review_identity_contract"
  | "unsupported_review_identity_version"
  | "duplicate_decision_sequence"
  | "duplicate_decision_identity"
  | "invalid_decision_sequence"
  | "duplicate_proposal_identity"
  | "duplicate_mapping_identity"
  | "unknown_superseded_mapping"
  | "self_supersession"
  | "circular_supersession"
  | "invalid_prior_review_revision"
  | "unchanged_review_successor"
  | "invalid_input"
  | "crypto_unavailable"
  | "digest_failed";

export class CareerReviewRevisionError extends Error {
  readonly code: CareerReviewRevisionErrorCode;

  constructor(code: CareerReviewRevisionErrorCode, message: string) {
    super(message);
    this.name = "CareerReviewRevisionError";
    this.code = code;
  }
}

type CanonicalHistory = {
  readonly reviewIdentitySchemaVersion: string;
  readonly reviewIdentityModelVersion: string;
  readonly reviewIdentityAlgorithmVersion: string;
  readonly decisions: readonly { readonly sequence: number; readonly decisionId: string }[];
  readonly proposals: readonly { readonly proposalId: string }[];
  readonly mappings: readonly { readonly mappingId: string; readonly supersedesMappingId: string | null }[];
};

const encoder = new TextEncoder();
const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const fail = (code: CareerReviewRevisionErrorCode, message: string): never => {
  throw new CareerReviewRevisionError(code, message);
};
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

async function digest(value: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") fail("crypto_unavailable", "Web Crypto SHA-256 is unavailable.");
  try {
    const bytes = encoder.encode(JSON.stringify(value));
    const input = new Uint8Array(new ArrayBuffer(bytes.byteLength));
    input.set(bytes);
    const result = new Uint8Array(await subtle.digest("SHA-256", input));
    if (result.byteLength !== 32) fail("digest_failed", "SHA-256 returned an invalid digest.");
    return Array.from(result, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    if (error instanceof CareerReviewRevisionError) throw error;
    return fail("digest_failed", "Review revision calculation failed.");
  }
}

function canonicalize(contract: CareerReviewDecisionIdentityContract): CanonicalHistory {
  if (!contract || typeof contract !== "object" || !Array.isArray(contract.decisions) || !Array.isArray(contract.proposals) || !Array.isArray(contract.mappings)) {
    return fail("invalid_review_identity_contract", "The review identity contract is invalid.");
  }
  if (
    contract.schemaVersion !== CAREER_REVIEW_IDENTITY_SCHEMA_VERSION
    || contract.identityModelVersion !== CAREER_REVIEW_IDENTITY_MODEL_VERSION
    || contract.algorithmVersion !== CAREER_REVIEW_DECISION_ALGORITHM_VERSION
  ) {
    return fail("unsupported_review_identity_version", "The review identity contract version is unsupported.");
  }

  const decisionSequences = new Set<number>();
  const decisionIds = new Set<string>();
  const decisions = [...contract.decisions].map((decision) => {
    if (!decision || !Number.isSafeInteger(decision.sequence) || decision.sequence < 1) fail("invalid_decision_sequence", "Decision sequence must be a positive safe integer.");
    if (!nonBlank(decision.decisionId)) fail("invalid_review_identity_contract", "A decision identity is invalid.");
    if (decisionSequences.has(decision.sequence)) fail("duplicate_decision_sequence", "Decision sequence is duplicated.");
    if (decisionIds.has(decision.decisionId)) fail("duplicate_decision_identity", "Decision identity is duplicated.");
    decisionSequences.add(decision.sequence);
    decisionIds.add(decision.decisionId);
    return { sequence: decision.sequence, decisionId: decision.decisionId };
  }).sort((left, right) => left.sequence - right.sequence);

  const proposalIds = new Set<string>();
  const proposals = [...contract.proposals].map((proposal) => {
    if (!proposal || !nonBlank(proposal.proposalId)) fail("invalid_review_identity_contract", "A proposal identity is invalid.");
    if (proposalIds.has(proposal.proposalId)) fail("duplicate_proposal_identity", "Proposal identity is duplicated.");
    proposalIds.add(proposal.proposalId);
    return { proposalId: proposal.proposalId };
  }).sort((left, right) => left.proposalId.localeCompare(right.proposalId));

  const mappingIds = new Set<string>();
  const mappings = [...contract.mappings].map((mapping) => {
    if (!mapping || !nonBlank(mapping.mappingId)) fail("invalid_review_identity_contract", "A mapping identity is invalid.");
    if (mappingIds.has(mapping.mappingId)) fail("duplicate_mapping_identity", "Mapping identity is duplicated.");
    mappingIds.add(mapping.mappingId);
    return { mappingId: mapping.mappingId, supersedesMappingId: mapping.supersedesMappingId ?? null };
  }).sort((left, right) => left.mappingId.localeCompare(right.mappingId));

  const externalMappingIds = new Set(
    contract.decisions
      .filter((decision) => decision.target?.type === "mapping")
      .map((decision) => decision.target.type === "mapping" ? decision.target.mappingId : ""),
  );
  const graph = new Map<string, string>();
  mappings.forEach((mapping) => {
    if (!mapping.supersedesMappingId) return;
    if (mapping.supersedesMappingId === mapping.mappingId) fail("self_supersession", "A mapping cannot supersede itself.");
    if (!mappingIds.has(mapping.supersedesMappingId) && !externalMappingIds.has(mapping.supersedesMappingId)) {
      fail("unknown_superseded_mapping", "A superseded mapping is unknown.");
    }
    if (mappingIds.has(mapping.supersedesMappingId)) graph.set(mapping.mappingId, mapping.supersedesMappingId);
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (mappingId: string): boolean => {
    if (visiting.has(mappingId)) return true;
    if (visited.has(mappingId)) return false;
    visiting.add(mappingId);
    const predecessor = graph.get(mappingId);
    if (predecessor && visit(predecessor)) return true;
    visiting.delete(mappingId);
    visited.add(mappingId);
    return false;
  };
  if ([...mappingIds].some(visit)) fail("circular_supersession", "Mapping supersession must be acyclic.");

  return {
    reviewIdentitySchemaVersion: contract.schemaVersion,
    reviewIdentityModelVersion: contract.identityModelVersion,
    reviewIdentityAlgorithmVersion: contract.algorithmVersion,
    decisions,
    proposals,
    mappings,
  };
}

async function revisionFor(input: BuildCareerReviewRevisionInput, history: CanonicalHistory, priorReviewRevision: string | null): Promise<string> {
  const hash = await digest({
    schemaVersion: CAREER_REVIEW_REVISION_SCHEMA_VERSION,
    historyModelVersion: CAREER_REVIEW_HISTORY_MODEL_VERSION,
    algorithmVersion: CAREER_REVIEW_REVISION_ALGORITHM_VERSION,
    manifestRevision: input.manifestRevision,
    sourceRevision: input.sourceRevision,
    capabilityRegistryVersion: input.capabilityRegistryVersion,
    reviewIdentityContract: history,
    priorReviewRevision,
  });
  return `${REVISION_PREFIX}${hash}`;
}

/**
 * Builds a private reconciliation revision for stable review identity history.
 * A party already possessing the same manifest, registry, history, and lineage may confirm equality.
 */
export async function buildCareerReviewRevision(input: BuildCareerReviewRevisionInput): Promise<CareerReviewRevisionResult> {
  if (!input || typeof input !== "object") fail("invalid_input", "Review revision input is invalid.");
  if (!nonBlank(input.manifestRevision)) fail("missing_manifest_revision", "Manifest revision is required.");
  if (!nonBlank(input.sourceRevision)) fail("missing_source_revision", "Source revision is required.");
  if (!nonBlank(input.capabilityRegistryVersion)) fail("missing_registry_version", "Capability registry version is required.");
  if (input.priorReviewRevision !== null && (!nonBlank(input.priorReviewRevision) || !REVISION_PATTERN.test(input.priorReviewRevision))) {
    fail("invalid_prior_review_revision", "The prior review revision is invalid.");
  }
  const contract = input.reviewIdentityContract;
  if (
    !contract
    || contract.manifestRevision !== input.manifestRevision
    || contract.sourceRevision !== input.sourceRevision
    || contract.capabilityRegistryVersion !== input.capabilityRegistryVersion
  ) {
    fail("invalid_review_identity_contract", "The review identity contract does not match revision ownership.");
  }

  const history = canonicalize(contract);
  const initialRevision = await revisionFor(input, history, null);
  if (input.priorReviewRevision === initialRevision) {
    fail("unchanged_review_successor", "Unchanged review history cannot manufacture a successor revision.");
  }
  const reviewRevision = input.priorReviewRevision === null
    ? initialRevision
    : await revisionFor(input, history, input.priorReviewRevision);
  if (reviewRevision === input.priorReviewRevision) fail("unchanged_review_successor", "A review revision cannot succeed itself.");

  return deepFreeze({
    schemaVersion: CAREER_REVIEW_REVISION_SCHEMA_VERSION,
    historyModelVersion: CAREER_REVIEW_HISTORY_MODEL_VERSION,
    algorithmVersion: CAREER_REVIEW_REVISION_ALGORITHM_VERSION,
    algorithm: "SHA-256",
    reviewRevision,
    manifestRevision: input.manifestRevision,
    sourceRevision: input.sourceRevision,
    capabilityRegistryVersion: input.capabilityRegistryVersion,
    priorReviewRevision: input.priorReviewRevision,
    decisionCount: history.decisions.length,
    proposalCount: history.proposals.length,
    mappingCount: history.mappings.length,
  });
}
