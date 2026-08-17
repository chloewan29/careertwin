import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { canonicalCapabilityLibrary } from "../lib/career-possibility/canonical-capability-library";
import { buildCareerMapCapabilityDefinitionsFromCanonicalLibrary } from "../lib/career-possibility/canonical-capability-definition-adapter";
import { canonicalCapabilityFamilyLibrary } from "../lib/career-possibility/canonical-capability-family-library";
import { createGeminiCareerCapabilityStructuredInferenceProducer, CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL, CAREER_CAPABILITY_STRUCTURED_INFERENCE_PROMPT_VERSION } from "../lib/career-possibility/career-capability-structured-inference-gemini-provider";
import { CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION } from "../lib/career-possibility/career-capability-structured-inference-contract";
import { validateCareerCapabilityStructuredInferenceResponse } from "../lib/career-possibility/career-capability-structured-inference-validator";
import { evaluateStructuredInferenceCoverage, STRUCTURED_INFERENCE_COVERAGE_BENCHMARK_VERSION, structuredInferenceCoverageFixtures } from "../tests/career-possibility/fixtures/structured-inference-coverage-benchmark";

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

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

async function main() {
  const label = argument("--label");
  const output = argument("--output");
  if (!label || !output) throw new Error("Usage: tsx scripts/evaluate-career-capability-structured-inference-coverage.ts --label <label> --output <path>");
  loadLocalEnvironment();
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is unavailable.");
  const adapted = buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: canonicalCapabilityLibrary, familyLibrary: canonicalCapabilityFamilyLibrary });
  if (!adapted.ok) throw new Error(`Canonical definitions unavailable: ${JSON.stringify(adapted.issues)}`);
  const canonicalCapabilities = adapted.definitions.map(({ id, label: capabilityLabel, family }) => ({ id, label: capabilityLabel, family }));
  const eligibleEvidence = structuredInferenceCoverageFixtures.map((fixture) => ({ evidenceId: fixture.fixtureId, evidenceText: fixture.atomicEvidence }));
  const request = Object.freeze({ contractVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_CONTRACT_VERSION, eligibleEvidence: Object.freeze(eligibleEvidence), canonicalCapabilities: Object.freeze(canonicalCapabilities), capabilityRegistryVersion: adapted.definitionVersion });
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
  const response = await producer.produce(request);
  const validation = validateCareerCapabilityStructuredInferenceResponse({ response, eligibleEvidence, canonicalCapabilities });
  const evaluated = evaluateStructuredInferenceCoverage({ fixtures: structuredInferenceCoverageFixtures, response, validation, canonicalCapabilities });
  const producedByFixture = new Map(evaluated.fixtureResults.map((result) => [result.fixtureId, new Set(result.producedCapabilityIds)]));
  const overshadowedSecondaryRequirements = structuredInferenceCoverageFixtures
    .filter((fixture) => fixture.primaryFailureClass === "dominant_dimension_overshadowing")
    .flatMap((fixture) => fixture.requiredCanonicalCapabilityIds.slice(1).map((capabilityId) => ({ fixtureId: fixture.fixtureId, capabilityId })));
  const overshadowedSecondaryHitCount = overshadowedSecondaryRequirements.filter(({ fixtureId, capabilityId }) => producedByFixture.get(fixtureId)?.has(capabilityId)).length;
  const overshadowedSecondaryRecall = overshadowedSecondaryRequirements.length === 0 ? 1 : overshadowedSecondaryHitCount / overshadowedSecondaryRequirements.length;
  const familyByCapability = new Map(canonicalCapabilities.map((item) => [item.id, item.family] as const));
  const labelByCapability = new Map(canonicalCapabilities.map((item) => [item.id, item.label.toLowerCase()] as const));
  const distribution = { byFamily: {} as Record<string, number>, byDifficulty: {} as Record<string, number>, byShape: {} as Record<string, number>, byPolarity: {} as Record<string, number>, byFailureArchetype: {} as Record<string, number> };
  let fullCanonicalLabelLeakCount = 0;
  let distinctiveRequiredTokenLeakCount = 0;
  let level23FullCanonicalLabelLeakCount = 0;
  for (const fixture of structuredInferenceCoverageFixtures) {
    increment(distribution.byDifficulty, fixture.difficultyLevel);
    increment(distribution.byShape, fixture.multiCapabilityExpected ? "multi" : "single");
    increment(distribution.byPolarity, fixture.zeroProposalExpected ? "zero_proposal" : "positive");
    increment(distribution.byFailureArchetype, fixture.primaryFailureClass);
    for (const family of new Set(fixture.requiredCanonicalCapabilityIds.map((id) => familyByCapability.get(id) ?? "UNKNOWN"))) increment(distribution.byFamily, family);
    const evidence = fixture.atomicEvidence.toLowerCase();
    const labels = fixture.requiredCanonicalCapabilityIds.map((id) => labelByCapability.get(id) ?? "");
    const fullLeak = labels.some((label) => label.length > 0 && evidence.includes(label));
    const tokenLeak = labels.some((label) => label.split(/[^a-z]+/).filter((token) => token.length > 4).some((token) => evidence.includes(token)));
    if (fullLeak) {
      fullCanonicalLabelLeakCount += 1;
      if (fixture.difficultyLevel !== "LEVEL_1_EXPLICIT") level23FullCanonicalLabelLeakCount += 1;
    }
    if (tokenLeak) distinctiveRequiredTokenLeakCount += 1;
  }
  const report = {
    reportVersion: "structured-inference-coverage-evaluation/2.0.0",
    label,
    benchmarkVersion: STRUCTURED_INFERENCE_COVERAGE_BENCHMARK_VERSION,
    promptVersion: CAREER_CAPABILITY_STRUCTURED_INFERENCE_PROMPT_VERSION,
    model: CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL,
    fixtureCount: structuredInferenceCoverageFixtures.length,
    familyCount: canonicalCapabilityFamilyLibrary.families.length,
    benchmarkDistribution: distribution,
    leakageAudit: { fullCanonicalLabelLeakCount, level23FullCanonicalLabelLeakCount, distinctiveRequiredTokenLeakCount },
    metrics: { ...evaluated.metrics, overshadowedSecondaryRecall },
    providerDiagnostics,
    fixtureResults: evaluated.fixtureResults,
    validatorResponseIssueCodes: validation.responseIssues.map((issue) => issue.code),
    validatorRejectedResults: validation.rejectedEvidenceResults.map((result) => ({ evidenceId: result.evidenceId, issueCodes: result.issues.map((issue) => issue.code) })),
  };
  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: path.relative(process.cwd(), outputPath), label, promptVersion: report.promptVersion, fixtureCount: report.fixtureCount, familyCount: report.familyCount, metrics: report.metrics, providerDiagnostics: report.providerDiagnostics }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
