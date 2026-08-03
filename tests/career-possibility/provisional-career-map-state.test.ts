import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { validateAnyLocalCareerMapState, validateProvisionalLocalCareerMapState, type ProvisionalLocalCareerMapEvidence } from "../../lib/career-possibility/local-career-map-state";
import { LOCAL_CAREER_MAP_STORAGE_KEY, clearLocalCareerMapState, readLocalCareerMapState, writeLocalCareerMapState } from "../../lib/career-possibility/local-career-map-storage";
import { buildPersonalCareerMapPresentation } from "../../lib/career-possibility/local-career-map-presentation-adapter";
import { materializeProvisionalCareerMap, PROVISIONAL_CAREER_MAP_MATERIALIZER_VERSION } from "../../lib/career-possibility/provisional-career-map-materializer";
import { mapProvisionalResumeEvidence } from "../../lib/career-possibility/provisional-resume-capability-mapper";
import { provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";
import { buildPersonalTargetRoleComparison } from "../../lib/career-possibility/personal-target-role-comparison";
import { canonicalCapabilityGovernanceLibrary } from "../../lib/career-possibility/canonical-capability-governance-decisions";
import type { RoleCapabilityProfile } from "../../lib/career-possibility/role-capability-library";

async function main() {
const definitions = canonicalCapabilityLibrary.capabilities;
const definitionVersion = canonicalCapabilityLibrary.contentVersion;
const evidence = (id: string, action: string, locatorId = `${id}-locator`): ProvisionalLocalCareerMapEvidence => Object.freeze({ evidenceId: id, sourceExcerpt: `${action} for a bounded synthetic fixture.`, sourceLocator: Object.freeze({ locatorId, startOffset: 10, endOffset: 50 }), signals: Object.freeze([{ field: "action" as const, value: action }]), reviewStatus: "unreviewed" as const, extractionVersion: "resume-evidence-extractor/1.0.0" });
const directEvidence = evidence("e-direct", "designed_research");
const transferableEvidence = evidence("e-transferable", "supported_research_delivery");
const unsupportedEvidence = evidence("e-unsupported", "operated_uncovered_activity");
const map = (item: ProvisionalLocalCareerMapEvidence) => mapProvisionalResumeEvidence({ evidence: item, policy: provisionalResumeMappingPolicy, capabilityDefinitions: definitions, capabilityDefinitionVersion: definitionVersion });
const direct = await map(directEvidence); const transferable = await map(transferableEvidence); const unsupported = await map(unsupportedEvidence);
assert.equal(direct.status, "auto_admitted"); assert.equal(transferable.status, "auto_admitted"); assert.equal(unsupported.status, "unsupported");

const baseInput = { sourceMetadata: { fileName: "synthetic.pdf", mediaType: "application/pdf", byteSize: 1024, sourceRevision: "source-revision/1" }, evidence: [directEvidence, transferableEvidence, unsupportedEvidence], mappingResults: [direct, transferable, unsupported], capabilityDefinitions: definitions, versions: { evidenceExtractionVersion: "resume-evidence-extractor/1.0.0", mappingPolicyVersion: provisionalResumeMappingPolicy.policyVersion, capabilityDefinitionVersion: definitionVersion }, createdAt: "2026-08-04T00:00:00Z", updatedAt: "2026-08-04T00:00:00Z" } as const;
const built = await materializeProvisionalCareerMap(baseInput);
assert.equal(built.ok, true); if (!built.ok) throw new Error(built.issues[0].message);
const state = built.state;
assert.equal(state.schemaVersion, "2.0.0"); assert.equal(state.source, "provisional_resume"); assert.equal(state.mapTrustStatus, "provisional");
assert.equal(state.materialization.revision, 1); assert.equal("predecessorMaterializationId" in state.materialization, false); assert.equal(state.versions.materializerVersion, PROVISIONAL_CAREER_MAP_MATERIALIZER_VERSION);
assert.equal(state.evidence.every((item) => item.reviewStatus === "unreviewed"), true); assert.equal(state.mappings.every((item) => item.reviewStatus === "unreviewed" && item.admissionStatus === "auto_admitted"), true);
assert.equal(state.unresolvedEvidence.length, 1); assert.equal(state.unresolvedEvidence[0].reason, "no_canonical_rule");
assert.equal(state.capabilities.length, 1); assert.deepEqual(state.capabilities[0].directEvidenceIds, ["e-direct"]); assert.deepEqual(state.capabilities[0].transferableEvidenceIds, ["e-transferable"]); assert.equal(state.capabilities[0].provisionalEvidenceCount, 2); assert.equal(state.capabilities[0].reviewedEvidenceCount, 0);
assert.equal(validateProvisionalLocalCareerMapState(state, definitions).ok, true); assert.equal(validateAnyLocalCareerMapState(state, definitions).ok, true);
const serialized = JSON.stringify(state); assert.equal(/fullResume|rawText|binary|arrayBuffer|score|strength|proficiency|fit|readiness|suitability/i.test(serialized), false);
assert.equal(validateProvisionalLocalCareerMapState({ ...state, schemaVersion: "3.0.0" }, definitions).ok, false);
assert.equal(validateProvisionalLocalCareerMapState({ ...state, mappings: [{ ...state.mappings[0], evidenceId: "missing" }] }, definitions).ok, false);
assert.equal(validateProvisionalLocalCareerMapState({ ...state, mappings: [{ ...state.mappings[0], capabilityId: "unknown" }] }, definitions).ok, false);
assert.equal(validateProvisionalLocalCareerMapState({ ...state, mappings: [{ ...state.mappings[0], relationship: "possible" }] }, definitions).ok, false);
assert.equal(validateProvisionalLocalCareerMapState({ ...state, mappings: [{ ...state.mappings[0], reviewStatus: "confirmed" }] }, definitions).ok, false);

const repeated = await materializeProvisionalCareerMap({ ...baseInput, createdAt: "later", updatedAt: "later" }); assert.equal(repeated.ok, true); if (!repeated.ok) throw new Error(); assert.equal(repeated.state.materialization.materializationId, state.materialization.materializationId);
const versionChanged = await materializeProvisionalCareerMap({ ...baseInput, versions: { ...baseInput.versions, evidenceExtractionVersion: "resume-evidence-extractor/2.0.0" } }); assert.equal(versionChanged.ok, true); if (!versionChanged.ok) throw new Error(); assert.notEqual(versionChanged.state.materialization.materializationId, state.materialization.materializationId);
const noMappings = await materializeProvisionalCareerMap({ ...baseInput, mappingResults: [unsupported] }); assert.deepEqual(noMappings.ok && noMappings.state, false); if (noMappings.ok) throw new Error(); assert.equal(noMappings.code, "no_unambiguous_mappings");

const data = new Map<string, string>(); let writes = 0; const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { writes += 1; data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
assert.deepEqual(writeLocalCareerMapState(state, definitions, storage), { ok: true }); assert.equal(writes, 1); assert.equal(readLocalCareerMapState(definitions, definitionVersion, storage).status, "loaded"); assert.equal(LOCAL_CAREER_MAP_STORAGE_KEY, "careertwin.local-career-map.v1");
const beforeInvalid = data.get(LOCAL_CAREER_MAP_STORAGE_KEY); assert.equal(writeLocalCareerMapState({ ...state, capabilities: [] }, definitions, storage).ok, false); assert.equal(writes, 1); assert.equal(data.get(LOCAL_CAREER_MAP_STORAGE_KEY), beforeInvalid);
const failingStorage = { ...storage, setItem: () => { throw new Error("quota"); } }; assert.equal(writeLocalCareerMapState(state, definitions, failingStorage).ok, false); assert.equal(data.get(LOCAL_CAREER_MAP_STORAGE_KEY), beforeInvalid);
assert.deepEqual(clearLocalCareerMapState(storage), { ok: true });

const presentation = buildPersonalCareerMapPresentation({ localState: state, canonicalDefinitions: definitions }); assert.equal(presentation.ok, true); if (!presentation.ok) throw new Error(); assert.equal(presentation.presentation.mapTrustStatus, "provisional"); assert.equal(presentation.presentation.unresolvedEvidenceCount, 1); assert.equal(presentation.presentation.reviewedEvidenceCount, 0); assert.equal(presentation.presentation.provisionalEvidenceCount, 2);
const role: RoleCapabilityProfile = { roleFamilyId: "synthetic", canonicalTitle: "Synthetic Role", aliases: [], searchTitles: [], domain: "synthetic", seniorityBand: "manager", description: "Synthetic.", mustHaveCapabilities: [{ capabilityId: "research-design", label: "Research Design", importance: "must", minimumProofLevel: "demonstrated", expectedEvidence: "Show research design proof." }, { capabilityId: "forecasting", label: "Forecasting", importance: "must", minimumProofLevel: "demonstrated", expectedEvidence: "Show forecasting proof." }], shouldHaveCapabilities: [], differentiatingCapabilities: [], evidenceRequirements: [], commonGrowthAreas: [], adjacentFromCapabilities: [], relatedRoleFamilies: [], sourceNotes: [], version: "1.0.0" };
const comparison = buildPersonalTargetRoleComparison({ localCareerMapState: state, targetRoleProfile: role, canonicalCapabilityLibrary, governanceDecisions: canonicalCapabilityGovernanceLibrary, definitionVersion }); assert.equal(comparison.ok, true); if (!comparison.ok) throw new Error(); assert.equal(comparison.comparison.mapTrustStatus, "provisional"); assert.equal(comparison.comparison.missingMeaning, "Not evidenced in your current CV-derived map."); assert.equal(comparison.comparison.requirements[0].outcome, "directly_demonstrated"); assert.equal(comparison.comparison.requirements[0].evidence.some((item) => item.relationship === "transferable_signal"), true); assert.equal(comparison.comparison.requirements[1].outcome, "evidence_not_yet_shown"); assert.equal(comparison.comparison.nextProofToBuild?.capabilityId, "forecasting");
assert.equal(comparison.comparison.nextProofToBuild?.reason, "Must-have requirement not evidenced in your current CV-derived map.");

const moduleSources = ["local-career-map-state.ts", "local-career-map-storage.ts", "local-career-map-presentation-adapter.ts", "provisional-career-map-materializer.ts", "personal-target-role-comparison.ts"].map((name) => readFileSync(join(process.cwd(), "lib/career-possibility", name), "utf8")).join("\n");
assert.doesNotMatch(moduleSources, /\bfetch\s*\(|supabase|openai|anthropic|embedding/i);
console.log("provisional career map state tests passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
