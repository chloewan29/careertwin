export const CAREER_REVIEW_IDENTITY_SCHEMA_VERSION = "1.0.0" as const;
export const CAREER_REVIEW_IDENTITY_MODEL_VERSION = "1.0.0" as const;
export const CAREER_REVIEW_DECISION_ALGORITHM_VERSION = "decision-history-identity-1.0.0" as const;

export type CareerReviewMappingRelationship = "direct_evidence" | "transferable_signal";
export type CareerReviewEmploymentField = "employerName" | "roleTitle" | "startDate" | "endDate" | "location";
export type CareerReviewEvidenceField = "displayText" | "action" | "context" | "outcome";

type DecisionBase = {
  readonly decisionKey: string;
  readonly sequence: number;
  readonly priorDecisionKey?: string;
  /** Descriptive provenance only; excluded from every identity. */
  readonly createdAt?: string;
};

type ReviewAction = "confirm" | "reject" | "restore";
export type CareerReviewDecisionIdentityInput =
  | (DecisionBase & { readonly targetType: "evidence"; readonly targetId: string; readonly action: ReviewAction })
  | (DecisionBase & { readonly targetType: "employment_field"; readonly targetId: string; readonly field: CareerReviewEmploymentField; readonly action: ReviewAction | "edit"; readonly semanticPayloadRevision?: string })
  | (DecisionBase & { readonly targetType: "evidence_field"; readonly targetId: string; readonly field: CareerReviewEvidenceField; readonly action: ReviewAction | "edit"; readonly semanticPayloadRevision?: string })
  | (DecisionBase & { readonly targetType: "interpretation"; readonly targetId: string; readonly action: ReviewAction | "edit"; readonly semanticPayloadRevision?: string })
  | (DecisionBase & { readonly targetType: "mapping"; readonly targetId: string; readonly action: ReviewAction })
  | (DecisionBase & { readonly targetType: "mapping"; readonly targetId: string; readonly action: "remap"; readonly evidenceId: string; readonly canonicalCapabilityId: string; readonly relationship: CareerReviewMappingRelationship })
  | (DecisionBase & { readonly targetType: "evidence"; readonly targetId: string; readonly action: "create_mapping"; readonly canonicalCapabilityId: string; readonly relationship: CareerReviewMappingRelationship });

export type ExistingCareerReviewMappingIdentity = {
  readonly mappingId: string;
  readonly evidenceId: string;
  readonly status?: "active" | "rejected" | "superseded";
  readonly supersedesMappingId?: string;
};

export type BuildCareerReviewDecisionIdentityInput = {
  readonly manifestRevision: string;
  readonly sourceRevision: string;
  readonly capabilityRegistryVersion: string;
  readonly evidenceIds: readonly string[];
  readonly employmentIds: readonly string[];
  readonly interpretationIds: readonly string[];
  readonly existingProposalIds?: readonly string[];
  readonly existingMappings: readonly ExistingCareerReviewMappingIdentity[];
  readonly decisions: readonly CareerReviewDecisionIdentityInput[];
};

export type CareerReviewDecisionTarget =
  | { readonly type: "evidence"; readonly evidenceId: string }
  | { readonly type: "employment_field"; readonly employmentId: string; readonly field: CareerReviewEmploymentField }
  | { readonly type: "evidence_field"; readonly evidenceId: string; readonly field: CareerReviewEvidenceField }
  | { readonly type: "interpretation"; readonly interpretationId: string }
  | { readonly type: "mapping"; readonly mappingId: string };

export type CareerReviewDecisionIdentityRecord = {
  readonly decisionId: string;
  readonly sequence: number;
  readonly action: ReviewAction | "edit" | "create_mapping" | "remap";
  readonly target: CareerReviewDecisionTarget;
  readonly priorDecisionId?: string;
  readonly semanticPayloadRevision?: string;
  readonly proposalId?: string;
  readonly mappingId?: string;
};

export type CareerReviewProposalIdentityRecord = {
  readonly proposalId: string;
  readonly creationDecisionId: string;
  readonly evidenceId: string;
  readonly proposalSource: "user_review";
  readonly canonicalCapabilityId: string;
  readonly relationship: CareerReviewMappingRelationship;
  readonly capabilityRegistryVersion: string;
};

export type CareerReviewMappingIdentityRecord = {
  readonly mappingId: string;
  readonly proposalId: string;
  readonly creationDecisionId: string;
  readonly evidenceId: string;
  readonly canonicalCapabilityId: string;
  readonly relationship: CareerReviewMappingRelationship;
  readonly capabilityRegistryVersion: string;
  readonly supersedesMappingId?: string;
};

export type CareerReviewDecisionIdentityContract = {
  readonly schemaVersion: typeof CAREER_REVIEW_IDENTITY_SCHEMA_VERSION;
  readonly identityModelVersion: typeof CAREER_REVIEW_IDENTITY_MODEL_VERSION;
  readonly algorithmVersion: typeof CAREER_REVIEW_DECISION_ALGORITHM_VERSION;
  readonly manifestRevision: string;
  readonly sourceRevision: string;
  readonly capabilityRegistryVersion: string;
  readonly decisions: readonly CareerReviewDecisionIdentityRecord[];
  readonly proposals: readonly CareerReviewProposalIdentityRecord[];
  readonly mappings: readonly CareerReviewMappingIdentityRecord[];
};

export type CareerReviewDecisionIdentityErrorCode =
  | "missing_manifest_revision" | "missing_source_revision" | "missing_registry_version"
  | "duplicate_decision_sequence" | "duplicate_decision_identity" | "invalid_decision_sequence"
  | "unknown_target_reference" | "extraction_local_identity_rejected" | "unknown_prior_decision"
  | "prior_decision_not_latest" | "invalid_restore" | "invalid_remap" | "missing_proposal_identity"
  | "unknown_mapping_reference" | "duplicate_proposal_identity" | "duplicate_mapping_identity"
  | "self_supersession" | "circular_supersession" | "missing_semantic_payload_revision"
  | "unexpected_semantic_payload_revision" | "unsupported_review_target" | "unsupported_review_action"
  | "invalid_input" | "crypto_unavailable" | "digest_failed";

export class CareerReviewDecisionIdentityError extends Error {
  readonly code: CareerReviewDecisionIdentityErrorCode;
  constructor(code: CareerReviewDecisionIdentityErrorCode, message: string) {
    super(message); this.name = "CareerReviewDecisionIdentityError"; this.code = code;
  }
}

const encoder = new TextEncoder();
const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const fail = (code: CareerReviewDecisionIdentityErrorCode, message: string): never => { throw new CareerReviewDecisionIdentityError(code, message); };
const deepFreeze = <T>(value: T): T => { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value as Record<string, unknown>).forEach(deepFreeze); } return value; };

async function digest(value: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") fail("crypto_unavailable", "Web Crypto SHA-256 is unavailable.");
  try {
    const bytes = encoder.encode(JSON.stringify(value)); const input = new Uint8Array(new ArrayBuffer(bytes.byteLength)); input.set(bytes);
    const result = new Uint8Array(await subtle.digest("SHA-256", input));
    if (result.byteLength !== 32) fail("digest_failed", "SHA-256 returned an invalid digest.");
    return Array.from(result, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    if (error instanceof CareerReviewDecisionIdentityError) throw error;
    return fail("digest_failed", "Review identity calculation failed.");
  }
}

function localIdentity(value: string): boolean {
  return /^(?:intake:|review:|evidence:|employment:|span:|mapping[-:])/i.test(value);
}

function validateStableIds(values: readonly string[], prefix: string, duplicateCode: CareerReviewDecisionIdentityErrorCode): Set<string> {
  if (!Array.isArray(values)) fail("invalid_input", "A shared identity collection is invalid.");
  const result = new Set<string>();
  values.forEach((value) => {
    if (!nonBlank(value)) fail("invalid_input", "A shared identity is invalid.");
    if (localIdentity(value) || !value.startsWith(prefix)) fail("extraction_local_identity_rejected", "A shared identity must use its admitted stable namespace.");
    if (result.has(value)) fail(duplicateCode, "A shared identity is duplicated.");
    result.add(value);
  });
  return result;
}

function targetFor(decision: CareerReviewDecisionIdentityInput): CareerReviewDecisionTarget {
  if (decision.targetType === "evidence") return { type: "evidence", evidenceId: decision.targetId };
  if (decision.targetType === "employment_field") return { type: "employment_field", employmentId: decision.targetId, field: decision.field };
  if (decision.targetType === "evidence_field") return { type: "evidence_field", evidenceId: decision.targetId, field: decision.field };
  if (decision.targetType === "interpretation") return { type: "interpretation", interpretationId: decision.targetId };
  if (decision.targetType === "mapping") return { type: "mapping", mappingId: decision.targetId };
  return fail("unsupported_review_target", "The review target is unsupported.");
}

function targetKey(target: CareerReviewDecisionTarget): string {
  if (target.type === "evidence") return `evidence:${target.evidenceId}`;
  if (target.type === "employment_field") return `employment:${target.employmentId}:${target.field}`;
  if (target.type === "evidence_field") return `evidence-field:${target.evidenceId}:${target.field}`;
  if (target.type === "interpretation") return `interpretation:${target.interpretationId}`;
  return `mapping:${target.mappingId}`;
}

function validateSupersession(mappings: readonly ExistingCareerReviewMappingIdentity[], knownEvidence: Set<string>): Map<string, "active" | "rejected" | "superseded"> {
  if (!Array.isArray(mappings)) fail("invalid_input", "Existing mappings are invalid.");
  const status = new Map<string, "active" | "rejected" | "superseded">(); const graph = new Map<string, string>();
  mappings.forEach((mapping) => {
    if (!nonBlank(mapping.mappingId) || localIdentity(mapping.mappingId) || !mapping.mappingId.startsWith("career-")) fail("extraction_local_identity_rejected", "Existing mappings require stable shared identities.");
    if (status.has(mapping.mappingId)) fail("duplicate_mapping_identity", "An existing mapping identity is duplicated.");
    if (!knownEvidence.has(mapping.evidenceId)) fail("unknown_target_reference", "An existing mapping references unknown evidence.");
    status.set(mapping.mappingId, mapping.status ?? "active");
    if (mapping.supersedesMappingId) { if (mapping.supersedesMappingId === mapping.mappingId) fail("self_supersession", "A mapping cannot supersede itself."); graph.set(mapping.mappingId, mapping.supersedesMappingId); }
  });
  graph.forEach((previous) => { if (!status.has(previous)) fail("unknown_mapping_reference", "A superseded mapping is unknown."); });
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); const previous = graph.get(id); if (previous && visit(previous)) return true; visiting.delete(id); visited.add(id); return false; };
  if ([...status.keys()].some(visit)) fail("circular_supersession", "Mapping supersession must be acyclic.");
  return status;
}

/** Builds stable review-layer identities without creating a review revision. */
export async function buildCareerReviewDecisionIdentityContract(input: BuildCareerReviewDecisionIdentityInput): Promise<CareerReviewDecisionIdentityContract> {
  if (!input || typeof input !== "object") fail("invalid_input", "Review identity input is invalid.");
  if (!nonBlank(input.manifestRevision)) fail("missing_manifest_revision", "Manifest revision is required.");
  if (!nonBlank(input.sourceRevision)) fail("missing_source_revision", "Source revision is required.");
  if (!nonBlank(input.capabilityRegistryVersion)) fail("missing_registry_version", "Capability registry version is required.");
  const evidenceIds = validateStableIds(input.evidenceIds, "career-evidence:", "invalid_input");
  const employmentIds = validateStableIds(input.employmentIds, "career-employment:", "invalid_input");
  const interpretationIds = validateStableIds(input.interpretationIds, "career-interpretation:", "invalid_input");
  const proposalIds = validateStableIds(input.existingProposalIds ?? [], "career-review-proposal:", "duplicate_proposal_identity");
  const mappingStatus = validateSupersession(input.existingMappings, evidenceIds); const mappingIds = new Set(mappingStatus.keys());
  if (!Array.isArray(input.decisions)) fail("invalid_input", "Decision history is invalid.");
  const ordered = [...input.decisions].sort((left, right) => left.sequence - right.sequence);
  const sequenceSet = new Set<number>(); const keySet = new Set<string>();
  ordered.forEach((decision) => {
    if (!decision || !nonBlank(decision.decisionKey)) fail("invalid_input", "A decision key is invalid.");
    if (keySet.has(decision.decisionKey)) fail("duplicate_decision_identity", "A decision key is duplicated."); keySet.add(decision.decisionKey);
    if (!Number.isSafeInteger(decision.sequence) || decision.sequence < 1) fail("invalid_decision_sequence", "Decision sequence must be a positive safe integer.");
    if (sequenceSet.has(decision.sequence)) fail("duplicate_decision_sequence", "Decision sequence is duplicated."); sequenceSet.add(decision.sequence);
  });

  const decisions: CareerReviewDecisionIdentityRecord[] = []; const proposals: CareerReviewProposalIdentityRecord[] = []; const mappings: CareerReviewMappingIdentityRecord[] = [];
  const idByKey = new Map<string, string>(); const latestByTarget = new Map<string, string>(); const logicalStatus = new Map<string, "active" | "rejected" | "superseded">();
  const mappingEvidence = new Map(input.existingMappings.map((mapping) => [mapping.mappingId, mapping.evidenceId]));

  for (const decision of ordered) {
    const target = targetFor(decision); const key = targetKey(target);
    if (target.type === "evidence" || target.type === "evidence_field") { if (!evidenceIds.has(target.evidenceId)) { if (localIdentity(target.evidenceId)) fail("extraction_local_identity_rejected", "Decision targets must use shared evidence identities."); fail("unknown_target_reference", "A decision references unknown evidence."); } }
    else if (target.type === "employment_field") { if (!employmentIds.has(target.employmentId)) { if (localIdentity(target.employmentId)) fail("extraction_local_identity_rejected", "Decision targets must use shared employment identities."); fail("unknown_target_reference", "A decision references unknown employment."); } }
    else if (target.type === "interpretation") { if (!interpretationIds.has(target.interpretationId)) { if (localIdentity(target.interpretationId)) fail("extraction_local_identity_rejected", "Decision targets must use shared interpretation identities."); fail("unknown_target_reference", "A decision references an unknown interpretation."); } }
    else if (!mappingIds.has(target.mappingId)) { if (localIdentity(target.mappingId)) fail("extraction_local_identity_rejected", "Decision targets must use shared mapping identities."); fail("unknown_mapping_reference", "A decision references an unknown mapping."); }

    const latestKey = latestByTarget.get(key);
    if (decision.priorDecisionKey && !idByKey.has(decision.priorDecisionKey)) fail("unknown_prior_decision", "A prior decision is unknown.");
    if (latestKey && decision.priorDecisionKey !== latestKey) fail("prior_decision_not_latest", "A same-target decision must reference the latest prior decision.");
    if (!latestKey && decision.priorDecisionKey) fail("prior_decision_not_latest", "A decision cannot reference a different logical target.");
    const priorDecisionId = decision.priorDecisionKey ? idByKey.get(decision.priorDecisionKey)! : undefined;
    const hasPayload = "semanticPayloadRevision" in decision && decision.semanticPayloadRevision !== undefined;
    if (decision.action === "edit") { if (!hasPayload || !nonBlank(decision.semanticPayloadRevision)) fail("missing_semantic_payload_revision", "A semantic edit requires a payload revision."); }
    else if (hasPayload) fail("unexpected_semantic_payload_revision", "This review action does not accept a semantic payload revision.");
    if (!["confirm", "reject", "restore", "edit", "create_mapping", "remap"].includes(decision.action)) fail("unsupported_review_action", "The review action is unsupported.");

    const currentStatus = target.type === "mapping" ? mappingStatus.get(target.mappingId)! : logicalStatus.get(key) ?? "active";
    if (decision.action === "reject") { if (currentStatus !== "active") fail("unsupported_review_action", "Reject requires an active target."); }
    if (decision.action === "restore") {
      if (currentStatus !== "rejected" || !latestKey) fail("invalid_restore", "Restore requires the latest rejection decision.");
      const latestDecisionId = idByKey.get(latestKey!);
      const latest = decisions.find((item) => item.decisionId === latestDecisionId);
      if (latest?.action !== "reject") fail("invalid_restore", "Restore must compensate for the latest rejection.");
    }
    if ((decision.action === "confirm" || decision.action === "edit") && currentStatus !== "active") fail("unsupported_review_action", "An inactive target cannot receive this action.");
    if (decision.action === "remap" && (target.type !== "mapping" || currentStatus !== "active")) fail("invalid_remap", "Remap requires an active known mapping.");
    if (decision.action === "remap" && mappingEvidence.get(decision.targetId) !== decision.evidenceId) fail("invalid_remap", "Remap must preserve the mapping's shared evidence identity.");

    const semantic = {
      identityModelVersion: CAREER_REVIEW_IDENTITY_MODEL_VERSION, manifestRevision: input.manifestRevision, sourceRevision: input.sourceRevision,
      capabilityRegistryVersion: input.capabilityRegistryVersion, sequence: decision.sequence, action: decision.action, target, priorDecisionId,
      ...(decision.action === "edit" ? { semanticPayloadRevision: decision.semanticPayloadRevision } : {}),
      ...(decision.action === "create_mapping" || decision.action === "remap" ? { evidenceId: decision.action === "create_mapping" ? decision.targetId : decision.evidenceId, canonicalCapabilityId: decision.canonicalCapabilityId, relationship: decision.relationship } : {}),
    };
    const decisionId = `career-review-decision:${CAREER_REVIEW_IDENTITY_MODEL_VERSION}:${await digest(semantic)}`;
    if (decisions.some((item) => item.decisionId === decisionId)) fail("duplicate_decision_identity", "A stable decision identity is duplicated.");
    let proposalId: string | undefined; let mappingId: string | undefined;
    if (decision.action === "create_mapping" || decision.action === "remap") {
      const evidenceId = decision.action === "create_mapping" ? decision.targetId : decision.evidenceId;
      if (!evidenceIds.has(evidenceId)) fail("unknown_target_reference", "Mapping creation references unknown evidence.");
      if (!nonBlank(decision.canonicalCapabilityId) || !["direct_evidence", "transferable_signal"].includes(decision.relationship)) fail("invalid_input", "Mapping identity semantics are invalid.");
      proposalId = `career-review-proposal:${CAREER_REVIEW_IDENTITY_MODEL_VERSION}:${await digest({ identityModelVersion: CAREER_REVIEW_IDENTITY_MODEL_VERSION, manifestRevision: input.manifestRevision, evidenceId, proposalSource: "user_review", canonicalCapabilityId: decision.canonicalCapabilityId, relationship: decision.relationship, capabilityRegistryVersion: input.capabilityRegistryVersion, creationDecisionId: decisionId })}`;
      if (proposalIds.has(proposalId)) fail("duplicate_proposal_identity", "A stable proposal identity is duplicated."); proposalIds.add(proposalId);
      mappingId = `career-review-mapping:${CAREER_REVIEW_IDENTITY_MODEL_VERSION}:${await digest({ identityModelVersion: CAREER_REVIEW_IDENTITY_MODEL_VERSION, manifestRevision: input.manifestRevision, evidenceId, proposalId, canonicalCapabilityId: decision.canonicalCapabilityId, relationship: decision.relationship, capabilityRegistryVersion: input.capabilityRegistryVersion, creationDecisionId: decisionId })}`;
      if (mappingIds.has(mappingId)) fail("duplicate_mapping_identity", "A stable mapping identity is duplicated.");
      const supersedesMappingId = decision.action === "remap" ? decision.targetId : undefined;
      if (supersedesMappingId === mappingId) fail("self_supersession", "A mapping cannot supersede itself.");
      proposals.push(deepFreeze({ proposalId, creationDecisionId: decisionId, evidenceId, proposalSource: "user_review", canonicalCapabilityId: decision.canonicalCapabilityId, relationship: decision.relationship, capabilityRegistryVersion: input.capabilityRegistryVersion }));
      mappings.push(deepFreeze({ mappingId, proposalId, creationDecisionId: decisionId, evidenceId, canonicalCapabilityId: decision.canonicalCapabilityId, relationship: decision.relationship, capabilityRegistryVersion: input.capabilityRegistryVersion, ...(supersedesMappingId ? { supersedesMappingId } : {}) }));
      mappingIds.add(mappingId); mappingStatus.set(mappingId, "active"); mappingEvidence.set(mappingId, evidenceId);
      latestByTarget.set(`mapping:${mappingId}`, decision.decisionKey);
      if (supersedesMappingId) mappingStatus.set(supersedesMappingId, "superseded");
    }
    const record = deepFreeze({ decisionId, sequence: decision.sequence, action: decision.action, target: deepFreeze({ ...target }), ...(priorDecisionId ? { priorDecisionId } : {}), ...(decision.action === "edit" ? { semanticPayloadRevision: decision.semanticPayloadRevision } : {}), ...(proposalId ? { proposalId } : {}), ...(mappingId ? { mappingId } : {}) });
    decisions.push(record); idByKey.set(decision.decisionKey, decisionId); latestByTarget.set(key, decision.decisionKey);
    if (decision.action === "reject") { if (target.type === "mapping") mappingStatus.set(target.mappingId, "rejected"); else logicalStatus.set(key, "rejected"); }
    else if (decision.action === "restore") { if (target.type === "mapping") mappingStatus.set(target.mappingId, "active"); else logicalStatus.set(key, "active"); }
  }

  proposals.sort((a, b) => a.proposalId.localeCompare(b.proposalId)); mappings.sort((a, b) => a.mappingId.localeCompare(b.mappingId));
  return deepFreeze({ schemaVersion: CAREER_REVIEW_IDENTITY_SCHEMA_VERSION, identityModelVersion: CAREER_REVIEW_IDENTITY_MODEL_VERSION, algorithmVersion: CAREER_REVIEW_DECISION_ALGORITHM_VERSION, manifestRevision: input.manifestRevision, sourceRevision: input.sourceRevision, capabilityRegistryVersion: input.capabilityRegistryVersion, decisions, proposals, mappings });
}
