import assert from "node:assert/strict";
import type { GoogleGenAI } from "@google/genai";
import {
  CAREER_CAPABILITY_PROVIDER_TIMEOUT_MS,
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL,
  createGeminiCareerCapabilityStructuredInferenceProducer,
} from "../../lib/career-possibility/career-capability-structured-inference-gemini-provider";
import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  type CareerCapabilityStructuredInferenceRequest,
} from "../../lib/career-possibility/career-capability-structured-inference-contract";

type GenerateContent = GoogleGenAI["models"]["generateContent"];
type GenerateContentInput = Parameters<GenerateContent>[0];
type GenerateContentOutput = Awaited<ReturnType<GenerateContent>>;

const request: CareerCapabilityStructuredInferenceRequest = Object.freeze({
  contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  eligibleEvidence: Object.freeze([
    Object.freeze({ evidenceId: "evidence:provider-test", evidenceText: "Synthesised findings into a decision." }),
  ]),
  canonicalCapabilities: Object.freeze([
    Object.freeze({ id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics" }),
  ]),
  capabilityRegistryVersion: "canonical-capability-library/test",
});

async function main() {
  let successCalls = 0;
  let capturedApiKey = "";
  let capturedInput: GenerateContentInput | null = null;
  const successProducer = createGeminiCareerCapabilityStructuredInferenceProducer(
    (apiKey) => {
      capturedApiKey = apiKey;
      return (async (input: GenerateContentInput) => {
        successCalls += 1;
        capturedInput = input;
        return {
          text: JSON.stringify({
            results: [{
              evidenceId: "evidence:provider-test",
              capabilityAssessments: [{
                capabilityId: "insight-synthesis",
                supportAssessment: "directly_supported",
                groundingRationale: "The evidence explicitly demonstrates synthesis for a decision.",
              }],
            }],
          }),
        } as GenerateContentOutput;
      }) as GenerateContent;
    },
    () => "test-api-key",
  );

  const response = await successProducer.produce(request);
  assert.equal(successCalls, 1);
  assert.equal(capturedApiKey, "test-api-key");
  assert.equal(response.results?.[0].capabilityAssessments[0].capabilityId, "insight-synthesis");
  assert.equal(capturedInput?.model, CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL);
  assert.equal(capturedInput?.config?.httpOptions?.timeout, CAREER_CAPABILITY_PROVIDER_TIMEOUT_MS);
  assert.equal(capturedInput?.config?.temperature, 0.1);
  assert.equal(capturedInput?.config?.responseMimeType, "application/json");
  assert.deepEqual(capturedInput?.config?.responseSchema, {
    type: "OBJECT",
    properties: {
      results: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            evidenceId: { type: "STRING" },
            capabilityAssessments: {
              type: "ARRAY",
              maxItems: 3,
              items: {
                type: "OBJECT",
                properties: {
                  capabilityId: { type: "STRING" },
                  supportAssessment: { type: "STRING", enum: ["directly_supported", "transferable_support"] },
                  groundingRationale: { type: "STRING" },
                },
                required: ["capabilityId", "supportAssessment", "groundingRationale"],
              },
            },
          },
          required: ["evidenceId", "capabilityAssessments"],
        },
      },
    },
    required: ["results"],
  });
  assert.equal(typeof capturedInput?.contents, "string");
  assert.match(String(capturedInput?.contents), /Use only the evidence text in that item\./);
  assert.match(String(capturedInput?.contents), /evidence:provider-test/);

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
  assert.equal(timeoutCalls, 1);

  console.log("career capability structured inference Gemini provider tests passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
