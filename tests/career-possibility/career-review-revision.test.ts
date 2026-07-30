import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildCareerReviewDecisionIdentityContract,
  type BuildCareerReviewDecisionIdentityInput,
  type CareerReviewDecisionIdentityContract,
  type CareerReviewDecisionIdentityInput,
} from "../../lib/career-possibility/career-review-decision-identity-contract";
import {
  buildCareerReviewRevision,
  CAREER_REVIEW_HISTORY_MODEL_VERSION,
  CAREER_REVIEW_REVISION_ALGORITHM_VERSION,
  CAREER_REVIEW_REVISION_SCHEMA_VERSION,
  CareerReviewRevisionError,
  type BuildCareerReviewRevisionInput,
} from "../../lib/career-possibility/career-review-revision";

const manifestRevision = "career-source-manifest:1.0.0:manifest-a";
const sourceRevision = "career-source-revision:1.0.0:source-a";
const registryVersion = "career-capability-registry:1.0.0";
const evidenceA = "career-evidence:1.0.0:evidence-a";
const evidenceB = "career-evidence:1.0.0:evidence-b";
const existingMapping = "career-shared-mapping:1.0.0:mapping-a";

const identityInput = (decisions: readonly CareerReviewDecisionIdentityInput[] = []): BuildCareerReviewDecisionIdentityInput => ({
  manifestRevision,
  sourceRevision,
  capabilityRegistryVersion: registryVersion,
  evidenceIds: [evidenceA, evidenceB],
  employmentIds: [],
  interpretationIds: [],
  existingMappings: [{ mappingId: existingMapping, evidenceId: evidenceA }],
  decisions,
});

const confirm = (key: string, sequence: number, evidenceId = evidenceA): CareerReviewDecisionIdentityInput => ({
  decisionKey: key,
  sequence,
  targetType: "evidence",
  targetId: evidenceId,
  action: "confirm",
});

const revisionInput = (reviewIdentityContract: CareerReviewDecisionIdentityContract, overrides: Partial<BuildCareerReviewRevisionInput> = {}): BuildCareerReviewRevisionInput => ({
  manifestRevision,
  sourceRevision,
  capabilityRegistryVersion: registryVersion,
  reviewIdentityContract,
  priorReviewRevision: null,
  ...overrides,
});

const cloneContract = (value: CareerReviewDecisionIdentityContract): CareerReviewDecisionIdentityContract => structuredClone(value);

async function fails(input: BuildCareerReviewRevisionInput, code: string, forbidden?: string): Promise<void> {
  try {
    await buildCareerReviewRevision(input);
    assert.fail(`Expected ${code}`);
  } catch (error) {
    assert.equal(error instanceof CareerReviewRevisionError, true);
    assert.equal((error as CareerReviewRevisionError).code, code);
    if (forbidden) assert.equal(String((error as Error).message).includes(forbidden), false);
  }
}

async function main(): Promise<void> {
  const emptyContract = await buildCareerReviewDecisionIdentityContract(identityInput());
  const empty = await buildCareerReviewRevision(revisionInput(emptyContract));
  assert.equal(empty.schemaVersion, CAREER_REVIEW_REVISION_SCHEMA_VERSION);
  assert.equal(empty.historyModelVersion, CAREER_REVIEW_HISTORY_MODEL_VERSION);
  assert.equal(empty.algorithmVersion, CAREER_REVIEW_REVISION_ALGORITHM_VERSION);
  assert.equal(empty.algorithm, "SHA-256");
  assert.match(empty.reviewRevision, /^career-review-revision:schema-1\.0\.0:history-1\.0\.0:sha256:[0-9a-f]{64}$/);
  assert.deepEqual([empty.decisionCount, empty.proposalCount, empty.mappingCount], [0, 0, 0]);
  assert.equal(empty.priorReviewRevision, null);
  assert.deepEqual(await buildCareerReviewRevision(revisionInput(emptyContract)), empty);

  const differentManifestContract = { ...emptyContract, manifestRevision: "career-source-manifest:1.0.0:manifest-b" } as CareerReviewDecisionIdentityContract;
  const differentManifest = await buildCareerReviewRevision(revisionInput(differentManifestContract, { manifestRevision: differentManifestContract.manifestRevision }));
  assert.notEqual(differentManifest.reviewRevision, empty.reviewRevision);
  const differentRegistryContract = { ...emptyContract, capabilityRegistryVersion: "career-capability-registry:2.0.0" } as CareerReviewDecisionIdentityContract;
  const differentRegistry = await buildCareerReviewRevision(revisionInput(differentRegistryContract, { capabilityRegistryVersion: differentRegistryContract.capabilityRegistryVersion }));
  assert.notEqual(differentRegistry.reviewRevision, empty.reviewRevision);
  const differentSourceContract = { ...emptyContract, sourceRevision: "career-source-revision:1.0.0:source-b" } as CareerReviewDecisionIdentityContract;
  const differentSource = await buildCareerReviewRevision(revisionInput(differentSourceContract, { sourceRevision: differentSourceContract.sourceRevision }));
  assert.notEqual(differentSource.reviewRevision, empty.reviewRevision);

  const oneContract = await buildCareerReviewDecisionIdentityContract(identityInput([confirm("confirm-a", 1)]));
  const one = await buildCareerReviewRevision(revisionInput(oneContract));
  assert.notEqual(one.reviewRevision, empty.reviewRevision);
  const twoContract = await buildCareerReviewDecisionIdentityContract(identityInput([confirm("confirm-a", 1), confirm("confirm-b", 2, evidenceB)]));
  const two = await buildCareerReviewRevision(revisionInput(twoContract));
  assert.notEqual(two.reviewRevision, one.reviewRevision);
  const reversedContract = { ...twoContract, decisions: [...twoContract.decisions].reverse() } as CareerReviewDecisionIdentityContract;
  assert.deepEqual(await buildCareerReviewRevision(revisionInput(reversedContract)), two);
  const resequenced = cloneContract(twoContract);
  (resequenced.decisions[0] as { sequence: number }).sequence = 2;
  (resequenced.decisions[1] as { sequence: number }).sequence = 1;
  assert.notEqual((await buildCareerReviewRevision(revisionInput(resequenced))).reviewRevision, two.reviewRevision);
  const changedId = cloneContract(oneContract);
  (changedId.decisions[0] as { decisionId: string }).decisionId = "career-review-decision:1.0.0:changed";
  assert.notEqual((await buildCareerReviewRevision(revisionInput(changedId))).reviewRevision, one.reviewRevision);

  const restoredContract = await buildCareerReviewDecisionIdentityContract(identityInput([
    { decisionKey: "reject-a", sequence: 1, targetType: "evidence", targetId: evidenceA, action: "reject" },
    { decisionKey: "restore-a", sequence: 2, priorDecisionKey: "reject-a", targetType: "evidence", targetId: evidenceA, action: "restore" },
  ]));
  assert.notEqual((await buildCareerReviewRevision(revisionInput(restoredContract))).reviewRevision, one.reviewRevision);

  const mappedContract = await buildCareerReviewDecisionIdentityContract(identityInput([
    { decisionKey: "map-a", sequence: 1, targetType: "evidence", targetId: evidenceA, action: "create_mapping", canonicalCapabilityId: "automation", relationship: "direct_evidence" },
  ]));
  const mapped = await buildCareerReviewRevision(revisionInput(mappedContract));
  const reorderedCollections = {
    ...mappedContract,
    proposals: [...mappedContract.proposals].reverse(),
    mappings: [...mappedContract.mappings].reverse(),
  } as CareerReviewDecisionIdentityContract;
  assert.deepEqual(await buildCareerReviewRevision(revisionInput(reorderedCollections)), mapped);
  const noProposal = { ...mappedContract, proposals: [] } as unknown as CareerReviewDecisionIdentityContract;
  const noMapping = { ...mappedContract, mappings: [] } as unknown as CareerReviewDecisionIdentityContract;
  assert.notEqual((await buildCareerReviewRevision(revisionInput(noProposal))).reviewRevision, mapped.reviewRevision);
  assert.notEqual((await buildCareerReviewRevision(revisionInput(noMapping))).reviewRevision, mapped.reviewRevision);

  const remappedContract = await buildCareerReviewDecisionIdentityContract(identityInput([
    { decisionKey: "remap-a", sequence: 1, targetType: "mapping", targetId: existingMapping, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "automation", relationship: "direct_evidence" },
  ]));
  const remapped = await buildCareerReviewRevision(revisionInput(remappedContract));
  const changedSupersession = cloneContract(remappedContract);
  delete (changedSupersession.mappings[0] as { supersedesMappingId?: string }).supersedesMappingId;
  assert.notEqual((await buildCareerReviewRevision(revisionInput(changedSupersession))).reviewRevision, remapped.reviewRevision);

  const initialMapping = mappedContract.mappings[0].mappingId;
  const firstRemapContract = await buildCareerReviewDecisionIdentityContract(identityInput([
    { decisionKey: "map-a", sequence: 1, targetType: "evidence", targetId: evidenceA, action: "create_mapping", canonicalCapabilityId: "automation", relationship: "direct_evidence" },
    { decisionKey: "remap-a", sequence: 2, priorDecisionKey: "map-a", targetType: "mapping", targetId: initialMapping, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "coordination", relationship: "transferable_signal" },
  ]));
  const secondMapping = firstRemapContract.mappings.find((item) => item.supersedesMappingId === initialMapping)!.mappingId;
  const chainContract = await buildCareerReviewDecisionIdentityContract(identityInput([
    { decisionKey: "map-a", sequence: 1, targetType: "evidence", targetId: evidenceA, action: "create_mapping", canonicalCapabilityId: "automation", relationship: "direct_evidence" },
    { decisionKey: "remap-a", sequence: 2, priorDecisionKey: "map-a", targetType: "mapping", targetId: initialMapping, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "coordination", relationship: "transferable_signal" },
    { decisionKey: "remap-b", sequence: 3, priorDecisionKey: "remap-a", targetType: "mapping", targetId: secondMapping, action: "remap", evidenceId: evidenceA, canonicalCapabilityId: "insight", relationship: "direct_evidence" },
  ]));
  const chain = await buildCareerReviewRevision(revisionInput(chainContract));
  assert.deepEqual(await buildCareerReviewRevision(revisionInput(chainContract)), chain);
  assert.equal(chain.mappingCount, 3);

  await fails(revisionInput({ ...emptyContract, schemaVersion: "2.0.0" } as unknown as CareerReviewDecisionIdentityContract), "unsupported_review_identity_version");
  await fails(revisionInput({ ...emptyContract, decisions: [{ ...oneContract.decisions[0], sequence: 0 }] } as CareerReviewDecisionIdentityContract), "invalid_decision_sequence");
  await fails(revisionInput({ ...emptyContract, decisions: [oneContract.decisions[0], { ...oneContract.decisions[0], decisionId: "other" }] } as CareerReviewDecisionIdentityContract), "duplicate_decision_sequence");
  await fails(revisionInput({ ...emptyContract, decisions: [oneContract.decisions[0], { ...oneContract.decisions[0], sequence: 2 }] } as CareerReviewDecisionIdentityContract), "duplicate_decision_identity");
  await fails(revisionInput({ ...mappedContract, proposals: [mappedContract.proposals[0], mappedContract.proposals[0]] } as CareerReviewDecisionIdentityContract), "duplicate_proposal_identity");
  await fails(revisionInput({ ...mappedContract, mappings: [mappedContract.mappings[0], mappedContract.mappings[0]] } as CareerReviewDecisionIdentityContract), "duplicate_mapping_identity");

  const unknownSupersession = cloneContract(mappedContract);
  (unknownSupersession.mappings[0] as { supersedesMappingId?: string }).supersedesMappingId = "career-review-mapping:1.0.0:missing";
  await fails(revisionInput(unknownSupersession), "unknown_superseded_mapping");
  const selfSupersession = cloneContract(mappedContract);
  (selfSupersession.mappings[0] as { supersedesMappingId?: string }).supersedesMappingId = selfSupersession.mappings[0].mappingId;
  await fails(revisionInput(selfSupersession), "self_supersession");
  const circular = cloneContract(firstRemapContract);
  const circularChild = circular.mappings.find((mapping) => mapping.supersedesMappingId)!;
  const circularParent = circular.mappings.find((mapping) => mapping.mappingId === circularChild.supersedesMappingId)!;
  (circularParent as { supersedesMappingId?: string }).supersedesMappingId = circularChild.mappingId;
  await fails(revisionInput(circular), "circular_supersession");

  await fails(revisionInput(emptyContract, { priorReviewRevision: "review:invalid" }), "invalid_prior_review_revision");
  await fails(revisionInput(emptyContract, { priorReviewRevision: empty.reviewRevision }), "unchanged_review_successor");
  const successor = await buildCareerReviewRevision(revisionInput(oneContract, { priorReviewRevision: empty.reviewRevision }));
  assert.equal(successor.priorReviewRevision, empty.reviewRevision);
  const branchA = await buildCareerReviewRevision(revisionInput(oneContract, { priorReviewRevision: empty.reviewRevision }));
  const branchB = await buildCareerReviewRevision(revisionInput(twoContract, { priorReviewRevision: empty.reviewRevision }));
  assert.notEqual(branchA.reviewRevision, branchB.reviewRevision);

  const immutableInput = revisionInput(mappedContract);
  const before = structuredClone(immutableInput);
  const immutable = await buildCareerReviewRevision(immutableInput);
  assert.deepEqual(immutableInput, before);
  assert.equal(Object.isFrozen(immutable), true);
  assert.deepEqual(JSON.parse(JSON.stringify(immutable)), immutable);
  const sharedProjection = { reviewState: { reviewRevision: immutable.reviewRevision, decisions: [] } };
  assert.equal(sharedProjection.reviewState.reviewRevision, immutable.reviewRevision);
  const serialized = JSON.stringify(immutable);
  for (const forbidden of ["rawText", "sourceText", "editedText", "rationale", "createdAt", "sessionId", "subjectId", "PRIVATE"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  await fails({ ...revisionInput(emptyContract), manifestRevision: "PRIVATE RAW TEXT" }, "invalid_review_identity_contract", "PRIVATE RAW TEXT");

  const source = await readFile(path.join(process.cwd(), "lib/career-possibility/career-review-revision.ts"), "utf8");
  for (const forbidden of ["node:crypto", "localstorage", "supabase", "fetch(", "shared-career-ingestion-bundle-contract", "candidate-baseline", "rawtext", "subjectid", "sessionid", "rationale"]) {
    assert.equal(source.toLowerCase().includes(forbidden), false, `Unexpected dependency: ${forbidden}`);
  }

  console.log("career-review-revision.test passed");
}

void main();
