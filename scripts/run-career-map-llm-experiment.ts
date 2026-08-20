import { GoogleGenAI } from "@google/genai";
import { canonicalCapabilityLibrary } from "../lib/career-possibility/canonical-capability-library";

type CareerMapLlmEvidenceAssessment = {
  evidenceId: string;
  capabilityAssessments: Array<{
    capabilityId: string;
    supportAssessment: "directly_supported" | "transferable_support";
    groundingRationale: string;
  }>;
};

type LlmCareerMapBatchResponse = {
  results: CareerMapLlmEvidenceAssessment[];
};

const founderEvidence = [
  {
    n: 2,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:10",
    text:
      "• Owned client-facing analytics products and measurement workflows, partnering with Sales, agencies, data partners, vendors and technical teams to manage requirements, delivery quality and commercial insight outputs."
  },
  {
    n: 3,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:11",
    text:
      "• Delivered 40+ measurement reports and client-ready narratives across attribution, incrementality, reach/frequency and footfall analysis, translating complex platform and partner data into clear recommendations for campaign and investment decisions."
  },
  {
    n: 12,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:2",
    text:
      "• Partnered with Marketing, Product, Sales, Finance, Strategy and technical teams to translate business needs into analytics project plans, KPI definitions, reporting products and actionable insight deliverables."
  },
  {
    n: 23,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:3",
    text:
      "• Led business requirements and delivery support for self-service analytics uplift, running 12 stakeholder workshops, reviewing 400+ dashboards and identifying 10+ priority use cases for consolidation, governance and adoption."
  },
  {
    n: 27,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:4",
    text:
      "• Transformed NPS and Voice of Customer analytics into a prioritisation framework, helping business teams triage resources by recurring pain points, customer impact, urgency and follow-up action."
  },
  {
    n: 28,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:5",
    text:
      "• Used Google Gemini to classify topic and sentiment across 1M+ NPS comment records, turning unstructured feedback into structured themes while maintaining human review, prompt refinement and source validation."
  },
  {
    n: 29,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:6",
    text:
      "• Turned customer, lifecycle, retail and geo-location data into trends, risks, opportunities and recommendations, including $30M+ in growth opportunities used for localisation planning and campaign optimisation."
  },
  {
    n: 30,
    evidenceId:
      "evidence:bundle:career-source-revision:schema-1.0.0:normalisation-lf-bom-1.0.0:sha256:2fc3eda0e8d5da5436d46807306dfce659787f43d830907d6f294b2015d1b1cd:7",
    text:
      "• Enabled enterprise visualisation transformation toward Power BI as the standard reporting platform, supporting 52 Power BI champions and improving report standardisation, quality and best-practice sharing."
  }
];

async function runExperiment() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("EXPERIMENT_ENVIRONMENT_BLOCKED: No GEMINI_API_KEY found.");
    return;
  }

  const capabilitiesText = canonicalCapabilityLibrary.capabilities
    .map(c => `- ID: "${c.id}" | Label: "${c.label}" | Family: "${c.family}"`)
    .join("\n");

  const evidenceText = founderEvidence
    .map(e => `[EVIDENCE_ID: ${e.evidenceId}] ${e.text}`)
    .join("\n");

  const prompt = `
You are assessing atomic career evidence against an existing governed canonical capability library.
For EACH evidence item independently:
- Assess only what that evidence text actually demonstrates.
- Select only canonical capability IDs supplied in the definitions.
- Do not invent capability IDs.
- Do not infer capability from employer.
- Do not infer capability from title.
- Do not infer capability from seniority.
- Do not infer capability from target role.
- Do not infer a capability using facts stated only in another evidence item.
- Return zero assessments if evidence is insufficient.
- Avoid mapping generic evidence to many weakly related capabilities.
- Use multiple capabilities only when each is independently evidenced.
- Maximum 3 capability assessments per evidence item.
- Distinguish direct support from merely transferable support.
  * DIRECTLY_SUPPORTED: the atomic evidence itself demonstrates meaningful performance of the canonical capability.
  * TRANSFERABLE_SUPPORT: the atomic evidence demonstrates a related foundation that could transfer toward the capability, but does not establish direct ownership strongly enough.
- Semantic similarity alone is NOT enough for directly_supported.
- Accuracy and grounding are more important than maximizing coverage.

CANONICAL CAPABILITIES:
${capabilitiesText}

EVIDENCE BATCH:
${evidenceText}
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
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
                    items: {
                      type: "OBJECT",
                      properties: {
                        capabilityId: { type: "STRING" },
                        supportAssessment: { type: "STRING", enum: ["directly_supported", "transferable_support"] },
                        groundingRationale: { type: "STRING" }
                      },
                      required: ["capabilityId", "supportAssessment", "groundingRationale"]
                    }
                  }
                },
                required: ["evidenceId", "capabilityAssessments"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    if (!response.text) {
      console.log("Model failure: No response text.");
      return;
    }

    const payload = JSON.parse(response.text) as LlmCareerMapBatchResponse;

    // VALIDATION
    const canonicalIds = new Set(canonicalCapabilityLibrary.capabilities.map(c => c.id));

    let totalValidatedAssessments = 0;
    let directlySupported = 0;
    let transferableSupport = 0;
    let zeroAssessmentEvidence = 0;
    let rejectedAssessments = 0;
    const uniqueCapabilities = new Set<string>();

    console.log("=== EXPERIMENT RESULTS ===\n");

    for (const evidence of founderEvidence) {
      const result = payload.results.find(r => r.evidenceId === evidence.evidenceId);
      
      console.log(`[EVIDENCE ID: ${evidence.evidenceId}]`);
      console.log(`Text: ${evidence.text}`);

      if (!result || !result.capabilityAssessments || result.capabilityAssessments.length === 0) {
        zeroAssessmentEvidence++;
        console.log(`Validated Status: ZERO ASSESSMENTS\n`);
        continue;
      }

      // Fan-out guard
      const assessmentsToProcess = result.capabilityAssessments.slice(0, 3);
      if (result.capabilityAssessments.length > 3) {
        console.log(`WARNING: Truncated assessments from ${result.capabilityAssessments.length} down to 3.`);
      }

      const validatedAssessments = [];
      const seenCaps = new Set<string>();

      for (const assessment of assessmentsToProcess) {
        if (!canonicalIds.has(assessment.capabilityId)) {
          rejectedAssessments++;
          console.log(`  - REJECTED (Unknown ID): ${assessment.capabilityId}`);
          continue;
        }
        if (seenCaps.has(assessment.capabilityId)) {
          rejectedAssessments++;
          console.log(`  - REJECTED (Duplicate): ${assessment.capabilityId}`);
          continue;
        }
        if (!assessment.groundingRationale || assessment.groundingRationale.trim().length === 0) {
          rejectedAssessments++;
          console.log(`  - REJECTED (Empty Rationale): ${assessment.capabilityId}`);
          continue;
        }
        
        if (assessment.supportAssessment !== "directly_supported" && assessment.supportAssessment !== "transferable_support") {
          rejectedAssessments++;
          console.log(`  - REJECTED (Invalid Assessment Type): ${assessment.supportAssessment}`);
          continue;
        }
        
        seenCaps.add(assessment.capabilityId);
        validatedAssessments.push(assessment);
      }

      if (validatedAssessments.length === 0) {
        zeroAssessmentEvidence++;
        console.log(`Validated Status: ZERO ASSESSMENTS (after validation)\n`);
        continue;
      }

      for (const assessment of validatedAssessments) {
        totalValidatedAssessments++;
        uniqueCapabilities.add(assessment.capabilityId);
        if (assessment.supportAssessment === "directly_supported") {
          directlySupported++;
        } else {
          transferableSupport++;
        }
        console.log(`  -> Capability: ${assessment.capabilityId}`);
        console.log(`     Support: ${assessment.supportAssessment}`);
        console.log(`     Rationale: ${assessment.groundingRationale}`);
      }
      console.log("");
    }

    console.log("=== SUMMARY ===");
    console.log(`Total Evidence Records: ${founderEvidence.length}`);
    console.log(`Evidence with >=1 validated assessment: ${founderEvidence.length - zeroAssessmentEvidence}`);
    console.log(`Evidence with zero assessments: ${zeroAssessmentEvidence}`);
    console.log(`Total validated assessments: ${totalValidatedAssessments}`);
    console.log(`Unique canonical capabilities: ${uniqueCapabilities.size}`);
    console.log(`Directly Supported: ${directlySupported}`);
    console.log(`Transferable Support: ${transferableSupport}`);
    console.log(`Rejected/Hallucinated Outputs: ${rejectedAssessments}`);

  } catch (error) {
    console.error("Experiment failed with error:", error);
  }
}

runExperiment();
