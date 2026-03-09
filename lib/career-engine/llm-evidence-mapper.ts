import { GoogleGenAI } from "@google/genai";

export interface CapabilityMatch {
    capability: string;
    status: "matched" | "missing";
    evidence: string[];
    confidence: "high" | "medium" | "low";
}

export interface CapabilityAssessment {
    matched_capabilities: CapabilityMatch[];
    missing_capabilities: CapabilityMatch[];
}

export async function extractCapabilitiesWithLLM(
    resumeBullets: string[],
    jdCapabilities: string[]
): Promise<CapabilityAssessment> {
    if (!resumeBullets.length || !jdCapabilities.length) {
        return { matched_capabilities: [], missing_capabilities: [] };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert executive recruiter. Your job is to strictly evaluate whether a candidate's resume provides concrete evidence for a set of target capabilities.

TARGET CAPABILITIES:
${jdCapabilities.map(c => `- ${c}`).join("\n")}

RESUME BULLETS:
${resumeBullets.map(b => `- ${b}`).join("\n")}

INSTRUCTIONS:
1. ONLY evaluate the "TARGET CAPABILITIES" provided above. Do not invent new capabilities.
2. Evaluate ONLY inferred soft skills and conceptual capabilities (e.g., Leadership, Communication, Stakeholder Management, Strategic Thinking, Research, Commercial Acumen).
3. IGNORE explicit hard skills or technical tools (e.g., SQL, Python, Java, AWS, Figma). Do not map them, even if they are in the target list. They are handled by a different deterministic regex engine.
4. For each valid capability, determine if it is "matched" or "missing" based purely on the provided resume bullets.
5. If "matched", you MUST provide 1-2 exact sentences or partial sentences from the resume bullets as "evidence".
6. Return structured JSON exactly matching the requested schema.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        matched_capabilities: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    capability: { type: "STRING" },
                                    status: { type: "STRING", enum: ["matched"] },
                                    evidence: {
                                        type: "ARRAY",
                                        items: { type: "STRING" }
                                    },
                                    confidence: { type: "STRING", enum: ["high", "medium", "low"] }
                                },
                                required: ["capability", "status", "evidence", "confidence"]
                            }
                        },
                        missing_capabilities: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    capability: { type: "STRING" },
                                    status: { type: "STRING", enum: ["missing"] },
                                    evidence: {
                                        type: "ARRAY",
                                        items: { type: "STRING" }
                                    },
                                    confidence: { type: "STRING", enum: ["high", "medium", "low"] }
                                },
                                required: ["capability", "status", "evidence", "confidence"]
                            }
                        }
                    },
                    required: ["matched_capabilities", "missing_capabilities"]
                }
            }
        });

        if (!response.text) {
            return { matched_capabilities: [], missing_capabilities: [] };
        }

        const result: CapabilityAssessment = JSON.parse(response.text);
        return result;

    } catch (error) {
        console.error("LLM Evidence Mapper failed:", error);
        return { matched_capabilities: [], missing_capabilities: [] };
    }
}
