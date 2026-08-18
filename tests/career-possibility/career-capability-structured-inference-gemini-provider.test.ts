import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { GoogleGenAI } from "@google/genai";
import {
  canonicalCapabilityLibrary,
  serializeCanonicalCapabilitySemanticContext,
} from "../../lib/career-possibility/canonical-capability-library";
import {
  CAREER_CAPABILITY_PROVIDER_TIMEOUT_MS,
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL,
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_PROMPT_VERSION,
  createGeminiCareerCapabilityStructuredInferenceProducer,
} from "../../lib/career-possibility/career-capability-structured-inference-gemini-provider";
import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE,
  type CareerCapabilityStructuredInferenceRequest,
} from "../../lib/career-possibility/career-capability-structured-inference-contract";

type GenerateContent = GoogleGenAI["models"]["generateContent"];
type GenerateContentInput = Parameters<GenerateContent>[0];
type GenerateContentOutput = Awaited<ReturnType<GenerateContent>>;

const request = Object.freeze({
  contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  eligibleEvidence: Object.freeze([
    Object.freeze({ evidenceId: "evidence:provider-test", evidenceText: "Synthesised findings into a decision.", employer: "FORBIDDEN_EMPLOYER_METADATA", jobTitle: "FORBIDDEN_TITLE_METADATA" }),
    Object.freeze({ evidenceId: "evidence:provider-zero", evidenceText: "Was present during a routine meeting.", education: "FORBIDDEN_EDUCATION_METADATA" }),
  ]),
  canonicalCapabilities: canonicalCapabilityLibrary.capabilities,
  capabilityRegistryVersion: "canonical-capability-library/test",
  rawResumeText: "FORBIDDEN_RAW_RESUME_METADATA",
}) as unknown as CareerCapabilityStructuredInferenceRequest;

const successfulResponse = JSON.stringify({ results: [
  { evidenceId: "evidence:provider-test", capabilityAssessments: [{ capabilityId: "insight-synthesis", supportAssessment: "directly_supported", groundingRationale: "The evidence explicitly demonstrates synthesis for a decision." }] },
  { evidenceId: "evidence:provider-zero", capabilityAssessments: [] },
] });

const expectedResponseSchema = {
  type: "OBJECT",
  properties: { results: { type: "ARRAY", items: { type: "OBJECT", properties: {
    evidenceId: { type: "STRING" },
    capabilityAssessments: { type: "ARRAY", maxItems: 3, items: { type: "OBJECT", properties: {
      capabilityId: { type: "STRING" },
      supportAssessment: { type: "STRING", enum: ["directly_supported", "transferable_support"] },
      groundingRationale: { type: "STRING" },
    }, required: ["capabilityId", "supportAssessment", "groundingRationale"] } },
  }, required: ["evidenceId", "capabilityAssessments"] } } },
  required: ["results"],
};

function canonicalContextFromPrompt(prompt: string) {
  const prefix = "CANONICAL_CAPABILITIES_JSON:\n";
  const suffix = "\n\nELIGIBLE_ATOMIC_EVIDENCE_JSON:";
  const start = prompt.indexOf(prefix);
  const end = prompt.indexOf(suffix);
  assert.ok(start >= 0 && end > start, "canonical context markers must remain stable");
  return prompt.slice(start + prefix.length, end);
}

async function main() {
  let successCalls = 0;
  let capturedApiKey = "";
  const capturedInputs: GenerateContentInput[] = [];
  const successProducer = createGeminiCareerCapabilityStructuredInferenceProducer(
    (apiKey) => {
      capturedApiKey = apiKey;
      return (async (input: GenerateContentInput) => {
        successCalls += 1;
        capturedInputs.push(input);
        return { text: successfulResponse } as GenerateContentOutput;
      }) as GenerateContent;
    },
    () => "test-api-key",
  );

  const response = await successProducer.produce(request);
  assert.equal(successCalls, 1, "one inference batch must make exactly one provider call");
  assert.equal(capturedApiKey, "test-api-key");
  assert.equal(response.results?.[0].capabilityAssessments[0].capabilityId, "insight-synthesis");
  assert.deepEqual(response.results?.[1].capabilityAssessments, []);

  const capturedInput = capturedInputs[0];
  assert.equal(capturedInput.model, CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL);
  assert.equal(capturedInput.config?.httpOptions?.timeout, CAREER_CAPABILITY_PROVIDER_TIMEOUT_MS);
  assert.equal(capturedInput.config?.temperature, 0.1);
  assert.equal(capturedInput.config?.responseMimeType, "application/json");
  assert.deepEqual(capturedInput.config?.responseSchema, expectedResponseSchema);
  assert.equal(CAREER_CAPABILITY_STRUCTURED_INFERENCE_PROMPT_VERSION, "career-capability-inference-prompt/1.0.0");
  assert.equal(MAX_CAPABILITY_ASSESSMENTS_PER_EVIDENCE, 3);

  const prompt = String(capturedInput.contents);
  const serializedCanonicalContext = serializeCanonicalCapabilitySemanticContext(canonicalCapabilityLibrary);
  const promptCanonicalContext = canonicalContextFromPrompt(prompt);
  assert.equal(promptCanonicalContext, serializedCanonicalContext, "provider must serialize canonical authority directly and deterministically");
  assert.equal(promptCanonicalContext.length, 45_294);

  const parsedContext = JSON.parse(promptCanonicalContext) as Array<{
    id: string;
    label: string;
    family: string;
    definition: string;
    positiveEvidence: string[];
    notSufficient: string[];
    distinctions: Array<{ capabilityId: string; boundary: string }>;
  }>;
  assert.equal(parsedContext.length, 51);
  assert.deepEqual(parsedContext.map((item) => item.id), canonicalCapabilityLibrary.capabilities.map((item) => item.id));
  assert.equal(parsedContext.every((item) => item.definition.length > 0), true);
  assert.equal(parsedContext.every((item) => item.positiveEvidence.length >= 2), true);
  assert.equal(parsedContext.every((item) => item.notSufficient.length >= 2), true);
  assert.equal(parsedContext.every((item) => item.distinctions.length >= 1), true);

  const contextById = new Map(parsedContext.map((item) => [item.id, item] as const));
  for (const capabilityId of ["analytics-governance", "commercial-partnerships", "service-performance"] as const) {
    const canonical = canonicalCapabilityLibrary.capabilities.find((item) => item.id === capabilityId)!;
    assert.deepEqual(contextById.get(capabilityId), { id: canonical.id, label: canonical.label, family: canonical.family, ...canonical.semanticContract });
  }
  assert.match(contextById.get("analytics-governance")!.notSufficient.join(" "), /workspace/i);
  assert.match(contextById.get("commercial-partnerships")!.notSufficient.join(" "), /without commercial value/i);
  assert.match(contextById.get("service-performance")!.notSufficient.join(" "), /without service-outcome responsibility/i);

  assert.match(prompt, /Use only the evidence text in that item\./);
  assert.match(prompt, /evidence:provider-test/);
  assert.match(prompt, /evidence:provider-zero/);
  assert.doesNotMatch(prompt, /FORBIDDEN_(?:EMPLOYER|TITLE|EDUCATION|RAW_RESUME)_METADATA/);

  const providerSource = readFileSync("lib/career-possibility/career-capability-structured-inference-gemini-provider.ts", "utf8");
  assert.equal((providerSource.match(/await generateContent\(/g) ?? []).length, 1);
  assert.doesNotMatch(providerSource, /observedBehavio|behavior decomposition|behaviour decomposition|PASS 1|PASS 2|WHAT.*HOW|partition|P2|P3|majority voting|semantic retry/i);
  assert.doesNotMatch(providerSource, /"analytics-governance"|"commercial-partnerships"|"service-performance"/);

  let timeoutCalls = 0;
  const timeoutError = new Error("The provider request timed out.");
  const timeoutProducer = createGeminiCareerCapabilityStructuredInferenceProducer(
    () => (async () => {
      timeoutCalls += 1;
      throw timeoutError;
    }) as GenerateContent,
    () => "test-api-key",
  );
  await assert.rejects(timeoutProducer.produce(request), (error) => error === timeoutError);
  assert.equal(timeoutCalls, 1, "provider failures must not trigger retries");

  console.log(JSON.stringify({ message: "career capability structured inference semantic-context provider tests passed", providerCallsPerBatch: successCalls, canonicalCapabilities: parsedContext.length, semanticContextCharacters: promptCanonicalContext.length }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
