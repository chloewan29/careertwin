import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { canonicalCapabilityLibrary } from "../lib/career-possibility/canonical-capability-library";
import { buildCareerMapCapabilityDefinitionsFromCanonicalLibrary } from "../lib/career-possibility/canonical-capability-definition-adapter";
import { canonicalCapabilityFamilyLibrary } from "../lib/career-possibility/canonical-capability-family-library";
import { createGeminiCareerCapabilityStructuredInferenceProducer, CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL, CAREER_CAPABILITY_STRUCTURED_INFERENCE_PROMPT_VERSION } from "../lib/career-possibility/career-capability-structured-inference-gemini-provider";
import { CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION } from "../lib/career-possibility/career-capability-structured-inference-contract";
import { validateCareerCapabilityStructuredInferenceResponse } from "../lib/career-possibility/career-capability-structured-inference-validator";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadLocalEnvironment() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

async function main() {
  const statePath = argument("--state");
  const evidenceId = argument("--evidence-id");
  const label = argument("--label");
  const output = argument("--output");
  if (!statePath || !evidenceId || !label || !output) throw new Error("Usage: tsx scripts/evaluate-career-capability-structured-inference-holdout.ts --state <json> --evidence-id <id> --label <label> --output <path>");
  loadLocalEnvironment();
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is unavailable.");
  const stateBytes = fs.readFileSync(path.resolve(statePath));
  const state = JSON.parse(stateBytes.toString("utf8")) as { evidence?: readonly { evidenceId?: unknown; sourceExcerpt?: unknown }[] };
  const record = state.evidence?.find((item) => item.evidenceId === evidenceId);
  if (!record || typeof record.sourceExcerpt !== "string") throw new Error("Requested holdout evidence is unavailable.");
  const adapted = buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: canonicalCapabilityLibrary, familyLibrary: canonicalCapabilityFamilyLibrary });
  if (!adapted.ok) throw new Error(`Canonical definitions unavailable: ${JSON.stringify(adapted.issues)}`);
  const canonicalCapabilities = adapted.definitions.map(({ id, label: capabilityLabel, family }) => ({ id, label: capabilityLabel, family }));
  const eligibleEvidence = [{ evidenceId, evidenceText: record.sourceExcerpt }];
  const providerDiagnostics = { callCount: 0, latencyMs: 0, promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const producer = createGeminiCareerCapabilityStructuredInferenceProducer(
    () => async (input) => {
      providerDiagnostics.callCount += 1;
      const started = performance.now();
      const result = await ai.models.generateContent(input);
      providerDiagnostics.latencyMs += Math.round(performance.now() - started);
      const usage = result.usageMetadata;
      providerDiagnostics.promptTokenCount += usage?.promptTokenCount ?? 0;
      providerDiagnostics.candidatesTokenCount += usage?.candidatesTokenCount ?? 0;
      providerDiagnostics.totalTokenCount += usage?.totalTokenCount ?? 0;
      return result;
    },
    () => process.env.GEMINI_API_KEY,
  );
  const response = await producer.produce(Object.freeze({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, eligibleEvidence: Object.freeze(eligibleEvidence), canonicalCapabilities: Object.freeze(canonicalCapabilities), capabilityRegistryVersion: adapted.definitionVersion }));
  const validation = validateCareerCapabilityStructuredInferenceResponse({ response, eligibleEvidence, canonicalCapabilities });
  const capabilityIds = [...new Set(validation.validEvidenceResults.flatMap((result) => result.capabilityAssessments.map((assessment) => assessment.capabilityId)))].sort();
  const report = {
    reportVersion: "structured-inference-holdout-evaluation/1.0.0",
    label,
    promptVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_PROMPT_VERSION,
    model: CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL,
    stateSha256: crypto.createHash("sha256").update(stateBytes).digest("hex").toUpperCase(),
    evidenceId,
    evidenceTextSha256: crypto.createHash("sha256").update(record.sourceExcerpt, "utf8").digest("hex").toUpperCase(),
    validEvidenceResultCount: validation.validEvidenceResults.length,
    rejectedEvidenceResultCount: validation.rejectedEvidenceResults.length,
    responseIssueCodes: validation.responseIssues.map((issue) => issue.code),
    evidenceLinkExact: validation.validEvidenceResults.every((result) => result.evidenceId === evidenceId),
    capabilityIds,
    providerDiagnostics,
  };
  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, evidenceId: "REDACTED_IN_CONSOLE", evidenceTextSha256: report.evidenceTextSha256 }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
