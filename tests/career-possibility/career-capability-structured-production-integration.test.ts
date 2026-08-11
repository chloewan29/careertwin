import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCareerCapabilityInferencePostHandler } from "../../app/api/career-map/capability-inference/route";
import { buildProvisionalCareerMapFromFile } from "../../lib/career-possibility/build-provisional-career-map-from-file";
import { buildProvisionalCareerMapFromText } from "../../lib/career-possibility/build-provisional-career-map-from-text";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { createCareerCapabilityStructuredInferenceApiProducer, CAREER_CAPABILITY_STRUCTURED_INFERENCE_API_PATH } from "../../lib/career-possibility/career-capability-structured-inference-api-producer";
import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  type CareerCapabilityStructuredInferenceProducer,
  type CareerCapabilityStructuredInferenceRequest,
} from "../../lib/career-possibility/career-capability-structured-inference-contract";

const definitions = canonicalCapabilityLibrary.capabilities;
const definitionVersion = canonicalCapabilityLibrary.contentVersion;
const input = (text: string, producer?: CareerCapabilityStructuredInferenceProducer) => ({
  extractedText: text,
  sourceMetadata: { fileName: "synthetic.pdf", mediaType: "application/pdf", byteSize: 100, sourceRevision: "source/task2c" },
  identity: { documentId: "document/task2c", bundleId: "bundle/task2c", extractionRunId: "run/task2c" },
  versions: { evidenceParserVersion: "resume-evidence-extractor/1.0.0", evidenceNormalisationVersion: "normaliser/1.0.0", capabilityDefinitionVersion: definitionVersion },
  capabilityDefinitions: definitions,
  structuredInferenceProducer: producer,
  createdAt: "2026-08-11T00:00:00Z",
  updatedAt: "2026-08-11T00:00:00Z",
} as const);

function responseFor(request: CareerCapabilityStructuredInferenceRequest, capabilityId = "research-design", supportAssessment: "directly_supported" | "transferable_support" = "directly_supported") {
  return {
    contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
    results: [{ evidenceId: request.eligibleEvidence[0].evidenceId, capabilityAssessments: [{ capabilityId, supportAssessment, groundingRationale: "Bounded synthetic grounding." }] }],
  } as const;
}

async function main() {
  let capturedRequest: CareerCapabilityStructuredInferenceRequest | null = null;
  const structuredProducer: CareerCapabilityStructuredInferenceProducer = {
    async produce(request) { capturedRequest = request; return responseFor(request); },
  };
  const structuredOnly = await buildProvisionalCareerMapFromText(input("EXPERIENCE\n- Prepared weekly notes.", structuredProducer));
  assert.equal(structuredOnly.status, "success");
  if (structuredOnly.status !== "success") throw new Error(structuredOnly.message);
  assert.equal(structuredOnly.state.mappings.length, 1);
  assert.equal(structuredOnly.state.mappings[0].method, "structured_inference");
  assert.equal("matchedRuleId" in structuredOnly.state.mappings[0], false);
  assert.equal(structuredOnly.state.mappings[0].capabilityId, "research-design");
  assert.equal(structuredOnly.state.mappings[0].evidenceId, structuredOnly.state.evidence[0].evidenceId);
  assert.equal(capturedRequest?.eligibleEvidence.length, 1);
  assert.deepEqual(Object.keys(capturedRequest!.eligibleEvidence[0]).sort(), ["evidenceId", "evidenceText"]);

  let decoratedPrivacyRequest: CareerCapabilityStructuredInferenceRequest | null = null;
  const decoratedPrivacyProducer: CareerCapabilityStructuredInferenceProducer = {
    async produce(request) { decoratedPrivacyRequest = request; return responseFor(request); },
  };
  const decoratedPrivacyInput = "WORK EXPERIENCE\nExample Company Ltd — Operations Analyst | 2020 - 2022\n- Performed professional work A.\n- Performed professional work B.\n\u25C7 Education\nPrivate degree content\n\u25C7 Skills\nSQL • Private technology list";
  const decoratedPrivacy = await buildProvisionalCareerMapFromText(input(decoratedPrivacyInput, decoratedPrivacyProducer));
  assert.equal(decoratedPrivacy.status, "success");
  assert.deepEqual(decoratedPrivacyRequest!.eligibleEvidence.map(({ evidenceText }) => evidenceText), ["- Performed professional work A.", "- Performed professional work B."]);
  assert.equal(JSON.stringify(decoratedPrivacyRequest!.eligibleEvidence).includes("Example Company"), false);
  assert.equal(JSON.stringify(decoratedPrivacyRequest!.eligibleEvidence).includes("Operations Analyst"), false);
  assert.equal(JSON.stringify(decoratedPrivacyRequest!.eligibleEvidence).includes("Education"), false);
  assert.equal(JSON.stringify(decoratedPrivacyRequest!.eligibleEvidence).includes("Private degree"), false);
  assert.equal(JSON.stringify(decoratedPrivacyRequest!.eligibleEvidence).includes("Skills"), false);
  assert.equal(JSON.stringify(decoratedPrivacyRequest!.eligibleEvidence).includes("Private technology"), false);
  assert.equal(JSON.stringify(decoratedPrivacyRequest!.eligibleEvidence).includes(decoratedPrivacyInput), false);

  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1]);
  const fileStructured = await buildProvisionalCareerMapFromFile({
    file: { name: "synthetic.pdf", type: "application/pdf", size: pdfBytes.byteLength, arrayBuffer: async () => pdfBytes.buffer },
    capabilityDefinitions: definitions,
    capabilityDefinitionVersion: definitionVersion,
    structuredInferenceProducer: structuredProducer,
    createdAt: "2026-08-11T00:00:00Z",
    updatedAt: "2026-08-11T00:00:00Z",
    parserDependencies: { extractPdf: async () => "EXPERIENCE\n- Prepared weekly notes." },
  });
  assert.equal(fileStructured.status, "success");
  if (fileStructured.status !== "success") throw new Error();
  assert.equal(fileStructured.state.mappings[0].method, "structured_inference");

  const failingProducer: CareerCapabilityStructuredInferenceProducer = { async produce() { throw new Error("synthetic provider failure"); } };
  const deterministicSurvives = await buildProvisionalCareerMapFromText(input("EXPERIENCE\n- Designed a research study for customer discovery.", failingProducer));
  assert.equal(deterministicSurvives.status, "success");
  if (deterministicSurvives.status !== "success") throw new Error();
  assert.equal(deterministicSurvives.state.mappings[0].method, "authored_deterministic");
  assert.equal(typeof deterministicSurvives.state.mappings[0].matchedRuleId, "string");

  const invalidProducer: CareerCapabilityStructuredInferenceProducer = {
    async produce(request) { return responseFor(request, "unknown-capability"); },
  };
  const invalid = await buildProvisionalCareerMapFromText(input("EXPERIENCE\n- Prepared weekly notes.", invalidProducer));
  assert.equal(invalid.status, "failure");
  if (invalid.status === "failure") assert.equal(invalid.code, "no_unambiguous_mappings");

  const zeroProducer: CareerCapabilityStructuredInferenceProducer = {
    async produce(request) {
      return { contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, results: request.eligibleEvidence.map(({ evidenceId }) => ({ evidenceId, capabilityAssessments: [] })) };
    },
  };
  const zero = await buildProvisionalCareerMapFromText(input("EXPERIENCE\n- Prepared weekly notes.", zeroProducer));
  assert.equal(zero.status, "failure");
  if (zero.status === "failure") assert.equal(zero.code, "no_unambiguous_mappings");

  let clientUrl = "";
  let clientBody: Record<string, unknown> = {};
  const fetchMock = (async (url: RequestInfo | URL, init?: RequestInit) => {
    clientUrl = String(url);
    clientBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, results: [] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const apiProducer = createCareerCapabilityStructuredInferenceApiProducer(fetchMock);
  await apiProducer.produce({
    contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
    eligibleEvidence: [{ evidenceId: "e-private", evidenceText: "Synthetic professional evidence." }],
    canonicalCapabilities: definitions,
    capabilityRegistryVersion: definitionVersion,
  });
  assert.equal(clientUrl, CAREER_CAPABILITY_STRUCTURED_INFERENCE_API_PATH);
  assert.deepEqual(Object.keys(clientBody).sort(), ["capabilityRegistryVersion", "contractVersion", "eligibleEvidence"]);
  assert.deepEqual(Object.keys((clientBody.eligibleEvidence as Record<string, unknown>[])[0]).sort(), ["evidenceId", "evidenceText"]);
  assert.equal(JSON.stringify(clientBody).includes("canonicalCapabilities"), false);
  assert.doesNotMatch(JSON.stringify(clientBody), /employer|roleTitle|education|qualification|skills|contact|rawFile|resumeText/i);

  let serverRequest: CareerCapabilityStructuredInferenceRequest | null = null;
  const serverProducer: CareerCapabilityStructuredInferenceProducer = {
    async produce(request) { serverRequest = request; return responseFor(request); },
  };
  const handler = createCareerCapabilityInferencePostHandler(serverProducer);
  const validRouteResponse = await handler(new Request("http://localhost/api/career-map/capability-inference", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, eligibleEvidence: [{ evidenceId: "e-route", evidenceText: "Synthetic evidence." }], capabilityRegistryVersion: definitionVersion }),
  }));
  assert.equal(validRouteResponse.status, 200);
  assert.equal(serverRequest?.canonicalCapabilities.length, definitions.length);
  assert.deepEqual(serverRequest?.canonicalCapabilities, definitions);

  const forbiddenRouteResponse = await handler(new Request("http://localhost/api/career-map/capability-inference", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, eligibleEvidence: [{ evidenceId: "e-route", evidenceText: "Synthetic evidence.", employer: "Forbidden" }], capabilityRegistryVersion: definitionVersion }),
  }));
  assert.equal(forbiddenRouteResponse.status, 400);

  const unavailableHandler = createCareerCapabilityInferencePostHandler(failingProducer);
  const unavailable = await unavailableHandler(new Request("http://localhost/api/career-map/capability-inference", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, eligibleEvidence: [{ evidenceId: "e-route", evidenceText: "Synthetic evidence." }], capabilityRegistryVersion: definitionVersion }),
  }));
  assert.equal(unavailable.status, 503);

  const clientSource = readFileSync("lib/career-possibility/career-capability-structured-inference-api-producer.ts", "utf8");
  assert.doesNotMatch(clientSource, /GEMINI_API_KEY|GoogleGenAI|googleapis|generativelanguage/i);
  const rootSource = readFileSync("components/career-possibility/RootCvUploadWorkspace.tsx", "utf8");
  assert.doesNotMatch(rootSource, /processed locally in this browser/i);
  assert.match(rootSource, /Selected professional evidence is processed through CareerTwin/);

  console.log("career capability structured production integration tests passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
