import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";
import type { ExtractResumeEvidenceFromTextInput } from "./resume-evidence-extraction-contract";
import { extractResumeEvidenceFromText } from "./resume-evidence-text-extractor";
import { bridgeEvidenceToProvisionalSignals } from "./provisional-evidence-signal-bridge";
import { provisionalEvidenceSignalPolicy } from "./provisional-evidence-signal-policy";
import { mapProvisionalResumeEvidencePlural } from "./provisional-resume-capability-mapper";
import { PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, type ProvisionalMappingResult, type ProvisionalUnresolvedMapping } from "./provisional-resume-mapping-contract";
import { provisionalResumeMappingPolicy } from "./provisional-resume-mapping-policy";
import { materializeProvisionalCareerMap } from "./provisional-career-map-materializer";
import type { ProvisionalLocalCareerMapEvidence, ProvisionalLocalCareerMapState } from "./local-career-map-state";
import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  type CareerCapabilityStructuredInferenceProducer,
  type CareerCapabilityStructuredInferenceValidationResult,
} from "./career-capability-structured-inference-contract";
import { validateCareerCapabilityStructuredInferenceResponse } from "./career-capability-structured-inference-validator";
import { adaptValidatedStructuredCapabilityMappings, mergeDeterministicAndStructuredMappings } from "./career-capability-structured-mapping";

export const PROVISIONAL_CAREER_MAP_TEXT_BUILD_VERSION = "provisional-career-map-text-build/1.0.0" as const;
export type ProvisionalCareerMapTextBuildFailureCode = "invalid_extracted_text" | "evidence_extraction_failed" | "no_structurally_valid_evidence" | "no_unambiguous_mappings" | "materialization_validation_failed" | "unexpected_failure";
export type ProvisionalCareerMapTextBuildAudit = Readonly<{ evidenceCount: number; structuredCount: number; unresolvedCount: number; unsupportedCount: number; autoAdmittedCount: number; capabilityCount: number; unexpectedlyLostEvidenceCount: 0 }>;
export type ProvisionalCareerMapTextBuildResult = Readonly<{ status: "success"; state: ProvisionalLocalCareerMapState; audit: ProvisionalCareerMapTextBuildAudit }> | Readonly<{ status: "failure"; code: ProvisionalCareerMapTextBuildFailureCode; message: string; audit?: ProvisionalCareerMapTextBuildAudit }>;

type Input = Readonly<{
  extractedText: string;
  sourceMetadata: ProvisionalLocalCareerMapState["sourceMetadata"];
  identity: Pick<ExtractResumeEvidenceFromTextInput, "documentId" | "bundleId" | "extractionRunId">;
  versions: Readonly<{ evidenceParserVersion: string; evidenceNormalisationVersion: string; capabilityDefinitionVersion: string }>;
  capabilityDefinitions: readonly CareerMapCapabilityDefinition[];
  structuredInferenceProducer?: CareerCapabilityStructuredInferenceProducer;
  createdAt: string;
  updatedAt: string;
}>;

const fail = (code: ProvisionalCareerMapTextBuildFailureCode, message: string, audit?: ProvisionalCareerMapTextBuildAudit): ProvisionalCareerMapTextBuildResult => Object.freeze({ status: "failure", code, message, ...(audit ? { audit } : {}) });
const audit = (evidenceCount: number, structuredCount: number, unresolvedCount: number, unsupportedCount: number, autoAdmittedCount: number, capabilityCount: number): ProvisionalCareerMapTextBuildAudit => Object.freeze({ evidenceCount, structuredCount, unresolvedCount, unsupportedCount, autoAdmittedCount, capabilityCount, unexpectedlyLostEvidenceCount: 0 as const });

function inactiveMappingResult(input: { evidenceId: string; sourceExcerpt: string; sourceLocator: ProvisionalUnresolvedMapping["sourceLocator"]; status: "unresolved" | "unsupported"; explanation: string; matchingRuleIds: readonly string[]; capabilityDefinitionVersion: string }): ProvisionalMappingResult {
  const unresolved: ProvisionalUnresolvedMapping = Object.freeze({ contractVersion: PROVISIONAL_RESUME_MAPPING_CONTRACT_VERSION, evidenceId: input.evidenceId, sourceExcerpt: input.sourceExcerpt, sourceLocator: Object.freeze({ ...input.sourceLocator }), reviewStatus: "unreviewed", admissionStatus: "unresolved", reason: input.status === "unsupported" ? "no_canonical_rule" : "invalid_evidence", candidateCapabilityIds: Object.freeze([]), candidateRelationships: Object.freeze([]), matchingRuleIds: Object.freeze([...input.matchingRuleIds]), explanation: input.explanation, mappingPolicyVersion: provisionalResumeMappingPolicy.policyVersion, capabilityDefinitionVersion: input.capabilityDefinitionVersion });
  return Object.freeze(input.status === "unsupported" ? { status: "unsupported" as const, unresolved } : { status: "unresolved" as const, unresolved });
}

export async function buildProvisionalCareerMapFromText(input: Input): Promise<ProvisionalCareerMapTextBuildResult> {
  try {
    if (typeof input.extractedText !== "string" || !input.extractedText.trim()) return fail("invalid_extracted_text", "Extracted résumé text is empty or invalid.");
    const extracted = extractResumeEvidenceFromText({ text: input.extractedText, ...input.identity, parserVersion: input.versions.evidenceParserVersion, normalisationVersion: input.versions.evidenceNormalisationVersion });
    if (!extracted.ok) return fail("evidence_extraction_failed", "Résumé evidence extraction failed safely.");
    if (extracted.bundle.evidenceRecords.length === 0) return fail("no_structurally_valid_evidence", "No structurally valid evidence was extracted.", audit(0, 0, 0, 0, 0, 0));

    const eligibleEvidence = Object.freeze(extracted.bundle.evidenceRecords.map((record) => Object.freeze({
      evidenceId: record.id,
      evidenceText: record.sourceText,
    })));
    const canonicalCapabilities = Object.freeze(input.capabilityDefinitions.flatMap((definition) =>
      typeof definition.family === "string" && definition.family.trim().length > 0
        ? [Object.freeze({ id: definition.id, label: definition.label, family: definition.family })]
        : []));
    let structuredValidation: CareerCapabilityStructuredInferenceValidationResult | null = null;
    if (input.structuredInferenceProducer && canonicalCapabilities.length === input.capabilityDefinitions.length) {
      try {
        const response = await input.structuredInferenceProducer.produce(Object.freeze({
          contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
          eligibleEvidence,
          canonicalCapabilities,
          capabilityRegistryVersion: input.versions.capabilityDefinitionVersion,
        }));
        structuredValidation = validateCareerCapabilityStructuredInferenceResponse({ response, eligibleEvidence, canonicalCapabilities });
      } catch {
        structuredValidation = null;
      }
    }

    const evidence: ProvisionalLocalCareerMapEvidence[] = [];
    const mappingResults: ProvisionalMappingResult[] = [];
    let structuredCount = 0; let unresolvedCount = 0; let unsupportedCount = 0;
    for (const record of extracted.bundle.evidenceRecords) {
      const bridged = await bridgeEvidenceToProvisionalSignals({ evidence: record, sourceSpans: extracted.bundle.sourceSpans }, provisionalEvidenceSignalPolicy);
      if (bridged.status === "structured") {
        structuredCount += 1;
        evidence.push(Object.freeze({ ...bridged.evidence, extractionVersion: input.versions.evidenceParserVersion }));
        mappingResults.push(...await mapProvisionalResumeEvidencePlural({ evidence: bridged.evidence, policy: provisionalResumeMappingPolicy, capabilityDefinitions: input.capabilityDefinitions, capabilityDefinitionVersion: input.versions.capabilityDefinitionVersion }));
      } else {
        if (bridged.status === "unresolved") unresolvedCount += 1; else unsupportedCount += 1;
        evidence.push(Object.freeze({ evidenceId: bridged.unresolved.evidenceId, sourceExcerpt: bridged.unresolved.sourceExcerpt, sourceLocator: Object.freeze({ ...bridged.unresolved.sourceLocator }), signals: Object.freeze([]), reviewStatus: "unreviewed", extractionVersion: input.versions.evidenceParserVersion }));
        mappingResults.push(inactiveMappingResult({ evidenceId: bridged.unresolved.evidenceId, sourceExcerpt: bridged.unresolved.sourceExcerpt, sourceLocator: bridged.unresolved.sourceLocator, status: bridged.status, explanation: `${bridged.unresolved.reason}: ${bridged.unresolved.explanation}`, matchingRuleIds: bridged.unresolved.matchedSignalRuleIds, capabilityDefinitionVersion: input.versions.capabilityDefinitionVersion }));
      }
    }
    const structuredMappings = structuredValidation
      ? await adaptValidatedStructuredCapabilityMappings({ validation: structuredValidation, mappingPolicyVersion: provisionalResumeMappingPolicy.policyVersion, capabilityDefinitionVersion: input.versions.capabilityDefinitionVersion })
      : Object.freeze([]);
    const finalMappingResults = mergeDeterministicAndStructuredMappings({ deterministicResults: mappingResults, structuredMappings }).mappingResults;
    const autoAdmittedCount = finalMappingResults.filter((result) => result.status === "auto_admitted").length;
    const beforeMaterialization = audit(evidence.length, structuredCount, unresolvedCount, unsupportedCount, autoAdmittedCount, 0);
    if (autoAdmittedCount === 0) return fail("no_unambiguous_mappings", "No unambiguous provisional mappings were produced.", beforeMaterialization);
    const materialized = await materializeProvisionalCareerMap({ sourceMetadata: input.sourceMetadata, evidence, mappingResults: finalMappingResults, capabilityDefinitions: input.capabilityDefinitions, versions: { evidenceExtractionVersion: input.versions.evidenceParserVersion, mappingPolicyVersion: provisionalResumeMappingPolicy.policyVersion, capabilityDefinitionVersion: input.versions.capabilityDefinitionVersion }, createdAt: input.createdAt, updatedAt: input.updatedAt });
    if (!materialized.ok) return fail(materialized.code === "no_unambiguous_mappings" ? "no_unambiguous_mappings" : "materialization_validation_failed", materialized.issues[0]?.message ?? "Provisional materialization failed safely.", beforeMaterialization);
    return Object.freeze({ status: "success", state: materialized.state, audit: audit(evidence.length, structuredCount, unresolvedCount, unsupportedCount, autoAdmittedCount, materialized.state.capabilities.length) });
  } catch {
    return fail("unexpected_failure", "The provisional Career Map could not be built deterministically.");
  }
}
