import type {
  CareerCapabilityStructuredInferenceProducer,
  CareerCapabilityStructuredInferenceRequest,
  CareerCapabilityStructuredInferenceResponse,
} from "./career-capability-structured-inference-contract";

export const CAREER_CAPABILITY_STRUCTURED_INFERENCE_API_PATH = "/api/career-map/capability-inference" as const;

export function createCareerCapabilityStructuredInferenceApiProducer(
  request: typeof fetch = fetch,
): CareerCapabilityStructuredInferenceProducer {
  return Object.freeze({
    async produce(input: CareerCapabilityStructuredInferenceRequest): Promise<CareerCapabilityStructuredInferenceResponse> {
      const response = await request(CAREER_CAPABILITY_STRUCTURED_INFERENCE_API_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractVersion: input.contractVersion,
          eligibleEvidence: input.eligibleEvidence.map(({ evidenceId, evidenceText }) => ({ evidenceId, evidenceText })),
          capabilityRegistryVersion: input.capabilityRegistryVersion,
        }),
      });
      if (!response.ok) throw new Error("Career capability structured inference is unavailable.");
      return await response.json() as CareerCapabilityStructuredInferenceResponse;
    },
  });
}
