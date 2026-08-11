import { NextResponse } from "next/server";
import { canonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import {
  CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
  type CareerCapabilityStructuredInferenceEvidence,
  type CareerCapabilityStructuredInferenceProducer,
  type CareerCapabilityStructuredInferenceRequest,
} from "@/lib/career-possibility/career-capability-structured-inference-contract";
import { geminiCareerCapabilityStructuredInferenceProducer } from "@/lib/career-possibility/career-capability-structured-inference-gemini-provider";
import { validateCareerCapabilityStructuredInferenceResponse } from "@/lib/career-possibility/career-capability-structured-inference-validator";

const requestKeys = new Set(["contractVersion", "eligibleEvidence", "capabilityRegistryVersion"]);
const evidenceKeys = new Set(["evidenceId", "evidenceText"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseRequest(value: unknown): Pick<CareerCapabilityStructuredInferenceRequest, "contractVersion" | "eligibleEvidence" | "capabilityRegistryVersion"> | null {
  if (!isRecord(value) || !hasExactKeys(value, requestKeys)) return null;
  if (value.contractVersion !== CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION) return null;
  if (value.capabilityRegistryVersion !== canonicalCapabilityLibrary.contentVersion) return null;
  if (!Array.isArray(value.eligibleEvidence) || value.eligibleEvidence.length === 0) return null;

  const evidence: CareerCapabilityStructuredInferenceEvidence[] = [];
  const evidenceIds = new Set<string>();
  for (const item of value.eligibleEvidence) {
    if (!isRecord(item) || !hasExactKeys(item, evidenceKeys)) return null;
    if (typeof item.evidenceId !== "string" || item.evidenceId.trim().length === 0 || evidenceIds.has(item.evidenceId)) return null;
    if (typeof item.evidenceText !== "string" || item.evidenceText.trim().length === 0) return null;
    evidenceIds.add(item.evidenceId);
    evidence.push(Object.freeze({ evidenceId: item.evidenceId, evidenceText: item.evidenceText }));
  }
  return Object.freeze({
    contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
    eligibleEvidence: Object.freeze(evidence),
    capabilityRegistryVersion: canonicalCapabilityLibrary.contentVersion,
  });
}

export function createCareerCapabilityInferencePostHandler(
  producer: CareerCapabilityStructuredInferenceProducer = geminiCareerCapabilityStructuredInferenceProducer,
) {
  return async function post(request: Request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const parsed = parseRequest(body);
    if (!parsed) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const inferenceRequest: CareerCapabilityStructuredInferenceRequest = Object.freeze({
      ...parsed,
      canonicalCapabilities: canonicalCapabilityLibrary.capabilities,
    });
    try {
      const providerResponse = await producer.produce(inferenceRequest);
      const validation = validateCareerCapabilityStructuredInferenceResponse({
        response: providerResponse,
        eligibleEvidence: inferenceRequest.eligibleEvidence,
        canonicalCapabilities: inferenceRequest.canonicalCapabilities,
      });
      if (validation.responseIssues.length > 0) {
        return NextResponse.json({ error: "provider_response_invalid" }, { status: 502 });
      }
      return NextResponse.json({
        contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION,
        results: validation.validEvidenceResults,
      });
    } catch {
      return NextResponse.json({ error: "provider_unavailable" }, { status: 503 });
    }
  };
}

export const POST = createCareerCapabilityInferencePostHandler();
