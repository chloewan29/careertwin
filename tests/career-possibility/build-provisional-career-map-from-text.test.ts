import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { buildProvisionalCareerMapFromText } from "../../lib/career-possibility/build-provisional-career-map-from-text";
import { validateProvisionalLocalCareerMapState } from "../../lib/career-possibility/local-career-map-state";

const definitions = canonicalCapabilityLibrary.capabilities;
const definitionVersion = canonicalCapabilityLibrary.contentVersion;
const base = (text: string, suffix = "a", parserVersion = "text-parser/1") => ({ extractedText: text, sourceMetadata: { fileName: `synthetic-${suffix}.pdf`, mediaType: "application/pdf", byteSize: 1024, sourceRevision: `source-revision/${suffix}` }, identity: { documentId: `document-${suffix}`, bundleId: `bundle-${suffix}`, extractionRunId: `run-${suffix}` }, versions: { evidenceParserVersion: parserVersion, evidenceNormalisationVersion: "normaliser/1", capabilityDefinitionVersion: definitionVersion }, capabilityDefinitions: definitions, createdAt: "2026-08-04T00:00:00Z", updatedAt: "2026-08-04T00:00:00Z" } as const);
const run = (text: string, suffix?: string, parserVersion?: string) => buildProvisionalCareerMapFromText(base(text, suffix, parserVersion));
const work = (bullets: readonly string[]) => `EXPERIENCE\n${bullets.map((item) => `- ${item}`).join("\n")}`;
const capabilityIdsFor = (state: { mappings: readonly { evidenceId: string; capabilityId: string }[] }, evidenceId: string) => state.mappings.filter((m) => m.evidenceId === evidenceId).map((m) => m.capabilityId).sort();
const relationshipFor = (state: { mappings: readonly { evidenceId: string; capabilityId: string; relationship: string }[] }, evidenceId: string, capabilityId: string) => state.mappings.find((m) => m.evidenceId === evidenceId && m.capabilityId === capabilityId)?.relationship;

async function main() {
  const direct = await run(work(["Designed a research study for customer discovery."]), "direct"); assert.equal(direct.status, "success"); if (direct.status !== "success") throw new Error(direct.message);
  assert.equal(direct.state.schemaVersion, "2.0.0"); assert.equal(direct.state.source, "provisional_resume"); assert.equal(direct.state.mapTrustStatus, "provisional"); assert.equal(validateProvisionalLocalCareerMapState(direct.state, definitions).ok, true);
  assert.equal(direct.state.evidence.every((item) => item.reviewStatus === "unreviewed"), true); assert.equal(direct.state.mappings.every((item) => item.reviewStatus === "unreviewed" && item.admissionStatus === "auto_admitted"), true); assert.equal(direct.state.mappings[0].relationship, "direct_evidence"); assert.equal(direct.state.capabilities[0].capabilityId, "research-design");
  assert.equal(direct.state.evidence[0].evidenceId, direct.state.mappings[0].evidenceId); assert.equal(direct.state.evidence[0].sourceLocator.locatorId.startsWith("span:document-direct:"), true); assert.equal(typeof (direct.state.evidence[0] as unknown as { signalIdentity?: string }).signalIdentity, "string"); assert.equal(direct.state.mappings[0].mappingId.length > 20, true);

  const provenanced = await run("EXPERIENCE\nNorthstar Co — Operations Analyst\n- Designed a research study for customer discovery.", "provenanced"); assert.equal(provenanced.status, "success"); if (provenanced.status !== "success") throw new Error(provenanced.message);
  assert.equal(provenanced.state.evidence[0].employer, "Northstar Co"); assert.equal(provenanced.state.evidence[0].roleTitle, "Operations Analyst"); assert.equal(validateProvisionalLocalCareerMapState(provenanced.state, definitions).ok, true);
  assert.equal(provenanced.state.capabilities[0].capabilityId, "research-design"); assert.equal(provenanced.state.mappings[0].relationship, "direct_evidence");
  assert.equal(JSON.stringify(provenanced.state).includes('"employer":"Northstar Co"'), true); assert.equal(JSON.stringify(provenanced.state).includes('"roleTitle":"Operations Analyst"'), true);
  const noProvenance = await run(work(["Designed a research study for customer discovery."]), "direct"); assert.equal(noProvenance.status, "success"); if (noProvenance.status !== "success") throw new Error(); assert.equal(noProvenance.state.evidence[0].employer, undefined); assert.equal(noProvenance.state.evidence[0].roleTitle, undefined);

  // Two distinct employment records produce distinct provenance; multiple bullets retain the same provenance; context resets safely.
  const multi = await run("EXPERIENCE\nNorthstar Co — Operations Analyst\n- Designed a research study for customer discovery.\n- Synthesized findings to inform a decision.\n\nAcme Ltd — Product Manager\n- Led a cross-functional delivery program.\n- Redesigned the operating process.", "multi"); assert.equal(multi.status, "success"); if (multi.status !== "success") throw new Error(multi.message);
  const northstar = multi.state.evidence.filter((item) => item.employer === "Northstar Co"); const acme = multi.state.evidence.filter((item) => item.employer === "Acme Ltd");
  assert.equal(northstar.length, 2); assert.equal(acme.length, 2);
  assert.equal(northstar.every((item) => item.roleTitle === "Operations Analyst"), true); assert.equal(acme.every((item) => item.roleTitle === "Product Manager"), true);
  assert.deepEqual(northstar.flatMap((item) => capabilityIdsFor(multi.state, item.evidenceId)).sort(), ["insight-synthesis", "research-design"]); assert.deepEqual(acme.flatMap((item) => capabilityIdsFor(multi.state, item.evidenceId)).sort(), ["cross-functional-delivery", "process-improvement"]);
  assert.equal(northstar.every((item) => relationshipFor(multi.state, item.evidenceId, capabilityIdsFor(multi.state, item.evidenceId)[0]) === "direct_evidence"), true);
  assert.equal(JSON.stringify(multi.state).includes('"employer":"Northstar Co"'), true); assert.equal(JSON.stringify(multi.state).includes('"employer":"Acme Ltd"'), true);

  // Missing employer/title remains valid and does not inherit stale prior values.
  const missingEmployer = await run("EXPERIENCE\nOperations Analyst | 2020 - 2023\n- Designed a research study for customer discovery.", "missing-employer"); assert.equal(missingEmployer.status, "success"); if (missingEmployer.status !== "success") throw new Error(); assert.equal(missingEmployer.state.evidence[0].employer, undefined); assert.equal(missingEmployer.state.evidence[0].roleTitle, "Operations Analyst");
  const missingBoth = await run("EXPERIENCE\n- Designed a research study for customer discovery.", "missing-both"); assert.equal(missingBoth.status, "success"); if (missingBoth.status !== "success") throw new Error(); assert.equal(missingBoth.state.evidence[0].employer, undefined); assert.equal(missingBoth.state.evidence[0].roleTitle, undefined);
  // A later employment with a missing employer must not inherit the prior employment's employer.
  const noStaleInherit = await run("EXPERIENCE\nNorthstar Co — Operations Analyst\n- Designed a research study for customer discovery.\n\nOperations Analyst | 2020 - 2023\n- Synthesized findings to inform a decision.", "no-stale-inherit"); assert.equal(noStaleInherit.status, "success"); if (noStaleInherit.status !== "success") throw new Error(); const staleSecond = noStaleInherit.state.evidence.filter((item) => item.roleTitle === "Operations Analyst" && item.employer === undefined); assert.equal(staleSecond.length, 1); assert.equal(noStaleInherit.state.evidence.filter((item) => item.employer === "Northstar Co").length, 1);

  // Capability IDs and relationship types are identical with and without provenance.
  assert.deepEqual(provenanced.state.capabilities.map((item) => item.capabilityId), noProvenance.state.capabilities.map((item) => item.capabilityId));
  assert.deepEqual(provenanced.state.mappings.map((item) => ({ capabilityId: item.capabilityId, relationship: item.relationship })), noProvenance.state.mappings.map((item) => ({ capabilityId: item.capabilityId, relationship: item.relationship })));
  assert.equal(JSON.stringify(provenanced.state).includes('"employer"'), true); assert.equal(JSON.stringify(noProvenance.state).includes('"employer"'), false);
  assert.equal(JSON.stringify(provenanced.state).includes('"roleTitle"'), true); assert.equal(JSON.stringify(noProvenance.state).includes('"roleTitle"'), false);

  const mixed = await run(work(["Designed a research study.", "Synthesized findings to inform a decision.", "Led a cross-functional delivery program.", "Redesigned the operating process."]), "mixed"); assert.equal(mixed.status, "success"); if (mixed.status !== "success") throw new Error(); assert.deepEqual(mixed.state.capabilities.map((item) => item.capabilityId), ["cross-functional-delivery", "insight-synthesis", "process-improvement", "research-design"]); assert.equal(mixed.audit.evidenceCount, 4); assert.equal(mixed.audit.autoAdmittedCount, 4);
  const transferable = await run(work(["Supported the delivery of research interviews."]), "transferable"); assert.equal(transferable.status, "success"); if (transferable.status !== "success") throw new Error(); assert.equal(transferable.state.mappings[0].relationship, "transferable_signal"); assert.equal(transferable.state.capabilities[0].directEvidenceIds.length, 0); assert.equal(transferable.state.capabilities[0].transferableEvidenceIds.length, 1);
  const mixedUnsupported = await run(work(["Designed a research study.", "Prepared weekly notes."]), "mixed-unsupported"); assert.equal(mixedUnsupported.status, "success"); if (mixedUnsupported.status !== "success") throw new Error(); assert.equal(mixedUnsupported.audit.unsupportedCount, 1); assert.equal(mixedUnsupported.state.unresolvedEvidence.length, 1); assert.equal(mixedUnsupported.state.unresolvedEvidence[0].reason, "no_canonical_rule"); assert.equal(mixedUnsupported.state.capabilities.length, 1);
  const mixedAmbiguous = await run(work(["Designed a research study.", "Designed research and redesigned the operating process."]), "mixed-ambiguous"); assert.equal(mixedAmbiguous.status, "success"); if (mixedAmbiguous.status !== "success") throw new Error(); assert.equal(mixedAmbiguous.audit.unresolvedCount, 1); assert.equal(mixedAmbiguous.state.unresolvedEvidence.length, 1); assert.match(mixedAmbiguous.state.unresolvedEvidence[0].explanation, /multiple_action_signals/); assert.equal(mixedAmbiguous.state.capabilities.length, 1);

  const unsupported = await run(work(["Prepared weekly notes."]), "unsupported"); assert.equal(unsupported.status, "failure"); if (unsupported.status === "failure") assert.equal(unsupported.code, "no_unambiguous_mappings");
  const ambiguous = await run(work(["Designed research and redesigned the operating process."]), "ambiguous"); assert.equal(ambiguous.status, "failure"); if (ambiguous.status === "failure") assert.equal(ambiguous.code, "no_unambiguous_mappings");
  const titleOnly = await run(work(["Senior Research Director"]), "title"); assert.equal(titleOnly.status, "failure"); if (titleOnly.status === "failure") assert.equal(titleOnly.code, "no_unambiguous_mappings");
  const toolOnly = await run(work(["Tableau, Power BI, SQL"]), "tool"); assert.equal(toolOnly.status, "failure"); if (toolOnly.status === "failure") assert.equal(toolOnly.code, "no_unambiguous_mappings");
  const empty = await run("   ", "empty"); assert.equal(empty.status, "failure"); if (empty.status === "failure") assert.equal(empty.code, "invalid_extracted_text");
  const noEvidence = await run("Résumé summary without a work-history evidence boundary.", "no-evidence"); assert.equal(noEvidence.status, "failure"); if (noEvidence.status === "failure") assert.equal(noEvidence.code, "no_structurally_valid_evidence");

  const successResults = [direct, provenanced, noProvenance, multi, missingEmployer, missingBoth, mixed, transferable, mixedUnsupported, mixedAmbiguous];
  for (const result of successResults) if (result.status === "success") {
    assert.equal(result.audit.unexpectedlyLostEvidenceCount, 0);
    assert.equal(result.audit.evidenceCount, result.audit.structuredCount + result.audit.unresolvedCount + result.audit.unsupportedCount);
    assert.equal(result.state.evidence.length, result.audit.evidenceCount);
    result.state.mappings.forEach((mapping) => assert.equal(result.state.evidence.some((item) => item.evidenceId === mapping.evidenceId), true));
    result.state.capabilities.forEach((capability) => [...capability.directEvidenceIds, ...capability.transferableEvidenceIds].forEach((id) => assert.equal(result.state.evidence.some((item) => item.evidenceId === id), true)));
    result.state.unresolvedEvidence.forEach((item) => assert.equal(result.state.evidence.some((evidence) => evidence.evidenceId === item.evidenceId), true));
  }
  const repeat = await run(work(["Designed a research study for customer discovery."]), "direct"); assert.deepEqual(repeat, direct);
  const versionChanged = await run(work(["Designed a research study for customer discovery."]), "direct", "text-parser/2"); assert.equal(versionChanged.status, "success"); if (versionChanged.status === "success") assert.notEqual(versionChanged.state.materialization.materializationId, direct.state.materialization.materializationId);
  const serialized = JSON.stringify([direct, mixed, transferable, mixedUnsupported, mixedAmbiguous]); assert.doesNotMatch(serialized, /"(?:confidence|score|fit|readiness|suitability)"/i); assert.equal(serialized.includes('"reviewStatus":"confirmed"'), false);
  const source = readFileSync(new URL("../../lib/career-possibility/build-provisional-career-map-from-text.ts", import.meta.url), "utf8"); assert.doesNotMatch(source, /\bfetch\s*\(|supabase|localStorage|sessionStorage|indexedDB|openai|anthropic|embedding|confidence|react|next\//i); assert.doesNotMatch(source, /local-career-map-storage|local-resume-file-extractor/);

  const rows = [["direct", direct], ["provenanced", provenanced], ["multi", multi], ["mixed", mixed], ["transferable", transferable], ["mixed admitted + unsupported", mixedUnsupported], ["mixed admitted + ambiguous", mixedAmbiguous], ["all unsupported", unsupported], ["all ambiguous", ambiguous], ["title only", titleOnly], ["tool only", toolOnly]] as const;
  console.table(rows.map(([fixture, result]) => ({ fixture, evidence: result.audit?.evidenceCount ?? 0, structured: result.audit?.structuredCount ?? 0, unresolved: result.audit?.unresolvedCount ?? 0, unsupported: result.audit?.unsupportedCount ?? 0, autoAdmitted: result.audit?.autoAdmittedCount ?? 0, capabilities: result.status === "success" ? result.state.capabilities.map((item) => item.capabilityId).join(", ") : "", result: result.status === "success" ? "success" : result.code })));
  console.log("build provisional career map from text tests passed");
}

main().catch((error) => { process.exitCode = 1; throw error; });
