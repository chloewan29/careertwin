import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCareerReviewDecisionIdentityContract,
  CAREER_REVIEW_DECISION_ALGORITHM_VERSION,
  CAREER_REVIEW_IDENTITY_MODEL_VERSION,
  CAREER_REVIEW_IDENTITY_SCHEMA_VERSION,
  CareerReviewDecisionIdentityError,
  type BuildCareerReviewDecisionIdentityInput,
  type CareerReviewDecisionIdentityInput,
} from "../../lib/career-possibility/career-review-decision-identity-contract";

const evidenceA = "career-evidence:1.0.0:evidence-a";
const evidenceB = "career-evidence:1.0.0:evidence-b";
const employmentA = "career-employment:1.0.0:employment-a";
const interpretationA = "career-interpretation:1.0.0:interpretation-a";
const existingMapping = "career-shared-mapping:1.0.0:mapping-a";

const input = (decisions: readonly CareerReviewDecisionIdentityInput[] = []): BuildCareerReviewDecisionIdentityInput => ({
  manifestRevision: "career-source-manifest:1.0.0:manifest-a",
  sourceRevision: "career-source-revision:1.0.0:source-a",
  capabilityRegistryVersion: "career-capability-registry:1.0.0",
  evidenceIds: [evidenceA, evidenceB],
  employmentIds: [employmentA],
  interpretationIds: [interpretationA],
  existingMappings: [{ mappingId: existingMapping, evidenceId: evidenceA }],
  decisions,
});

const confirm = (overrides: Partial<CareerReviewDecisionIdentityInput> = {}): CareerReviewDecisionIdentityInput => ({ decisionKey: "confirm-a", sequence: 1, targetType: "evidence", targetId: evidenceA, action: "confirm", ...overrides } as CareerReviewDecisionIdentityInput);
const reject = (overrides: Partial<CareerReviewDecisionIdentityInput> = {}): CareerReviewDecisionIdentityInput => ({ decisionKey: "reject-a", sequence: 1, targetType: "evidence", targetId: evidenceA, action: "reject", ...overrides } as CareerReviewDecisionIdentityInput);
const createMapping = (overrides: Partial<CareerReviewDecisionIdentityInput> = {}): CareerReviewDecisionIdentityInput => ({ decisionKey: "create-a", sequence: 1, targetType: "evidence", targetId: evidenceA, action: "create_mapping", canonicalCapabilityId: "automation", relationship: "direct_evidence", ...overrides } as CareerReviewDecisionIdentityInput);

async function fails(value: BuildCareerReviewDecisionIdentityInput, code: string, forbidden?: string): Promise<void> {
  try { await buildCareerReviewDecisionIdentityContract(value); assert.fail(`Expected ${code}`); }
  catch (error) { assert.equal(error instanceof CareerReviewDecisionIdentityError, true); assert.equal((error as CareerReviewDecisionIdentityError).code, code); if (forbidden) assert.equal(String((error as Error).message).includes(forbidden), false); }
}

async function main(): Promise<void> {
  const empty = await buildCareerReviewDecisionIdentityContract(input());
  assert.deepEqual(empty.decisions, []); assert.deepEqual(empty.proposals, []); assert.deepEqual(empty.mappings, []);
  assert.equal(empty.schemaVersion, CAREER_REVIEW_IDENTITY_SCHEMA_VERSION); assert.equal(empty.identityModelVersion, CAREER_REVIEW_IDENTITY_MODEL_VERSION); assert.equal(empty.algorithmVersion, CAREER_REVIEW_DECISION_ALGORITHM_VERSION);
  assert.equal("reviewRevision" in empty, false);

  const confirmed = await buildCareerReviewDecisionIdentityContract(input([confirm()]));
  const rejected = await buildCareerReviewDecisionIdentityContract(input([reject()]));
  assert.match(confirmed.decisions[0].decisionId, /^career-review-decision:1\.0\.0:[0-9a-f]{64}$/);
  assert.notEqual(confirmed.decisions[0].decisionId, rejected.decisions[0].decisionId);

  const restored = await buildCareerReviewDecisionIdentityContract(input([
    reject(),
    { decisionKey: "restore-a", sequence: 2, priorDecisionKey: "reject-a", targetType: "evidence", targetId: evidenceA, action: "restore" },
  ]));
  assert.deepEqual(restored.decisions.map((item) => item.action), ["reject", "restore"]);
  assert.notEqual(restored.decisions[0].decisionId, restored.decisions[1].decisionId);
  assert.notDeepEqual(restored, confirmed);

  const independent: CareerReviewDecisionIdentityInput[] = [confirm(), { decisionKey: "confirm-b", sequence: 2, targetType: "evidence", targetId: evidenceB, action: "confirm" }];
  const independentResult = await buildCareerReviewDecisionIdentityContract(input(independent));
  assert.deepEqual(await buildCareerReviewDecisionIdentityContract(input([...independent].reverse())), independentResult);
  const resequenced = [
    { ...independent[0], sequence: 2 },
    { ...independent[1], sequence: 1 },
  ] as CareerReviewDecisionIdentityInput[];
  assert.notDeepEqual(await buildCareerReviewDecisionIdentityContract(input(resequenced)), independentResult);
  await fails(input([confirm(), { ...confirm(), decisionKey: "other" }]), "duplicate_decision_sequence");

  await fails(input([confirm({ targetId: "career-evidence:1.0.0:missing" })]), "unknown_target_reference");
  await fails(input([confirm({ targetId: "evidence:local-1" })]), "extraction_local_identity_rejected");
  await fails(input([confirm({ priorDecisionKey: "missing" })]), "unknown_prior_decision");
  await fails(input([confirm(), { decisionKey: "confirm-b", sequence: 2, priorDecisionKey: "confirm-a", targetType: "evidence", targetId: evidenceB, action: "confirm" }]), "prior_decision_not_latest");
  await fails(input([confirm(), { decisionKey: "reject-a", sequence: 2, targetType: "evidence", targetId: evidenceA, action: "reject" }]), "prior_decision_not_latest");

  const employment = await buildCareerReviewDecisionIdentityContract(input([{ decisionKey: "employment-confirm", sequence: 1, targetType: "employment_field", targetId: employmentA, field: "roleTitle", action: "confirm" }]));
  assert.equal(employment.decisions[0].target.type, "employment_field");
  const interpretation = await buildCareerReviewDecisionIdentityContract(input([{ decisionKey: "interpretation-confirm", sequence: 1, targetType: "interpretation", targetId: interpretationA, action: "confirm" }]));
  assert.equal(interpretation.decisions[0].target.type, "interpretation");

  const created = await buildCareerReviewDecisionIdentityContract(input([createMapping()]));
  assert.equal(created.proposals.length, 1); assert.equal(created.mappings.length, 1);
  assert.match(created.proposals[0].proposalId, /^career-review-proposal:1\.0\.0:[0-9a-f]{64}$/);
  assert.match(created.mappings[0].mappingId, /^career-review-mapping:1\.0\.0:[0-9a-f]{64}$/);
  assert.notEqual(created.proposals[0].proposalId, created.mappings[0].mappingId);
  assert.notEqual(created.proposals[0].proposalId, created.decisions[0].decisionId);
  assert.notEqual(created.mappings[0].mappingId, created.decisions[0].decisionId);
  assert.equal(created.proposals[0].proposalSource, "user_review");

  const remapped = await buildCareerReviewDecisionIdentityContract(input([{ decisionKey: "remap-existing", sequence: 1, targetType: "mapping", targetId: existingMapping, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "stakeholder-coordination", relationship: "transferable_signal" }]));
  assert.equal(remapped.proposals.length, 1); assert.equal(remapped.mappings.length, 1); assert.equal(remapped.mappings[0].supersedesMappingId, existingMapping);
  assert.notEqual(remapped.mappings[0].mappingId, existingMapping);
  await fails(input([{ decisionKey: "remap-wrong-evidence", sequence: 1, targetType: "mapping", targetId: existingMapping, action: "remap", evidenceId: evidenceB, canonicalCapabilityId: "stakeholder-coordination", relationship: "transferable_signal" }]), "invalid_remap");

  const prefix = await buildCareerReviewDecisionIdentityContract(input([createMapping()]));
  const firstMappingId = prefix.mappings[0].mappingId;
  const firstRemapInput = input([
    createMapping(),
    { decisionKey: "remap-one", sequence: 2, priorDecisionKey: "create-a", targetType: "mapping", targetId: firstMappingId, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "stakeholder-coordination", relationship: "transferable_signal" },
  ]);
  const firstRemap = await buildCareerReviewDecisionIdentityContract(firstRemapInput);
  const secondMappingId = firstRemap.mappings.find((item) => item.supersedesMappingId === firstMappingId)!.mappingId;
  const repeated = await buildCareerReviewDecisionIdentityContract(input([
    createMapping(),
    { decisionKey: "remap-one", sequence: 2, priorDecisionKey: "create-a", targetType: "mapping", targetId: firstMappingId, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "stakeholder-coordination", relationship: "transferable_signal" },
    { decisionKey: "remap-two", sequence: 3, priorDecisionKey: "remap-one", targetType: "mapping", targetId: secondMappingId, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "customer-insight", relationship: "direct_evidence" },
  ]));
  assert.equal(repeated.mappings.length, 3); assert.equal(repeated.mappings.filter((item) => item.supersedesMappingId).length, 2);

  await fails({ ...input(), existingMappings: [{ mappingId: existingMapping, evidenceId: evidenceA, supersedesMappingId: existingMapping }] }, "self_supersession");
  const mappingB = "career-shared-mapping:1.0.0:mapping-b";
  await fails({ ...input(), existingMappings: [{ mappingId: existingMapping, evidenceId: evidenceA, supersedesMappingId: mappingB }, { mappingId: mappingB, evidenceId: evidenceA, supersedesMappingId: existingMapping }] }, "circular_supersession");
  await fails(input([{ decisionKey: "remap-missing", sequence: 1, targetType: "mapping", targetId: "career-shared-mapping:1.0.0:missing", action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "automation", relationship: "direct_evidence" }]), "unknown_mapping_reference");
  await fails({ ...input(), existingProposalIds: ["career-review-proposal:1.0.0:p", "career-review-proposal:1.0.0:p"] }, "duplicate_proposal_identity");
  await fails({ ...input(), existingMappings: [{ mappingId: existingMapping, evidenceId: evidenceA }, { mappingId: existingMapping, evidenceId: evidenceA }] }, "duplicate_mapping_identity");

  const registryChanged = { ...input([createMapping()]), capabilityRegistryVersion: "career-capability-registry:2.0.0" };
  assert.notDeepEqual(await buildCareerReviewDecisionIdentityContract(registryChanged), created);
  assert.deepEqual(await buildCareerReviewDecisionIdentityContract(input([confirm({ createdAt: "2099-01-01T00:00:00Z" })])), confirmed);
  assert.deepEqual(await buildCareerReviewDecisionIdentityContract(input([{ ...confirm(), rationale: "PRIVATE RATIONALE" } as CareerReviewDecisionIdentityInput])), confirmed);

  await fails(input([{ decisionKey: "edit", sequence: 1, targetType: "evidence_field", targetId: evidenceA, field: "action", action: "edit" }]), "missing_semantic_payload_revision");
  const edited = await buildCareerReviewDecisionIdentityContract(input([{ decisionKey: "edit", sequence: 1, targetType: "evidence_field", targetId: evidenceA, field: "action", action: "edit", semanticPayloadRevision: "semantic-edit:1" }]));
  const editedAgain = await buildCareerReviewDecisionIdentityContract(input([{ decisionKey: "edit", sequence: 1, targetType: "evidence_field", targetId: evidenceA, field: "action", action: "edit", semanticPayloadRevision: "semantic-edit:2" }]));
  assert.notEqual(edited.decisions[0].decisionId, editedAgain.decisions[0].decisionId);
  await fails(input([{ ...confirm(), semanticPayloadRevision: "unexpected" } as CareerReviewDecisionIdentityInput]), "unexpected_semantic_payload_revision");
  await fails(input([{ ...confirm(), targetType: "unsupported" } as unknown as CareerReviewDecisionIdentityInput]), "unsupported_review_target");
  await fails(input([{ ...confirm(), action: "unsupported" } as unknown as CareerReviewDecisionIdentityInput]), "unsupported_review_action");
  await fails({ ...input(), manifestRevision: "" }, "missing_manifest_revision"); await fails({ ...input(), sourceRevision: "" }, "missing_source_revision"); await fails({ ...input(), capabilityRegistryVersion: "" }, "missing_registry_version");

  const frozenInput = input([createMapping()]); const before = structuredClone(frozenInput); const frozen = await buildCareerReviewDecisionIdentityContract(frozenInput);
  assert.deepEqual(frozenInput, before); assert.equal(Object.isFrozen(frozen), true); assert.equal(Object.isFrozen(frozen.decisions), true); assert.equal(Object.isFrozen(frozen.decisions[0].target), true); assert.equal(Object.isFrozen(frozen.proposals[0]), true); assert.equal(Object.isFrozen(frozen.mappings[0]), true); assert.deepEqual(JSON.parse(JSON.stringify(frozen)), frozen); assert.deepEqual(await buildCareerReviewDecisionIdentityContract(frozenInput), frozen);
  const serialized = JSON.stringify(frozen);
  for (const forbidden of ["reviewRevision", "subjectId", "anonymousSubjectId", "authenticatedSubjectId", "PRIVATE RATIONALE", "rawText", "sourceText", "editedText"]) assert.equal(serialized.includes(forbidden), false);

  const source = await readFile(path.join(process.cwd(), "lib/career-possibility/career-review-decision-identity-contract.ts"), "utf8");
  for (const forbidden of ["node:crypto", "localstorage", "supabase", "fetch(", "resume-evidence-review-apply", "shared-career-ingestion-bundle-contract", "candidate-baseline", "rawtext"]) assert.equal(source.toLowerCase().includes(forbidden), false, `Unexpected dependency: ${forbidden}`);

  const sharedDecisionProjection = { decisionId: created.decisions[0].decisionId, action: "edit_mapping", targetType: "mapping", targetId: created.mappings[0].mappingId };
  const sharedProposalProjection = { proposalId: created.proposals[0].proposalId, evidenceId: created.proposals[0].evidenceId };
  const sharedMappingProjection = { mappingId: created.mappings[0].mappingId, proposalId: created.mappings[0].proposalId, supersedesMappingId: created.mappings[0].supersedesMappingId };
  assert.equal(sharedDecisionProjection.decisionId, created.decisions[0].decisionId); assert.equal(sharedProposalProjection.proposalId, created.proposals[0].proposalId); assert.equal(sharedMappingProjection.mappingId, created.mappings[0].mappingId);
  console.log("career-review-decision-identity-contract.test passed");
}

void main();
