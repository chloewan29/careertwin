export type LlmJobSignalExtraction = {
    critical_capabilities: string[];
    important_capabilities: string[];
    supporting_capabilities: string[];
    role_family: string;
    seniority_level: string;
    domain_context: string[];
    ownership_scope: string;
    delivery_scope: string;
    transformation_scope: boolean;
    tooling: string[];
    hiring_risks: string[];
};

export type LlmJobSignalExtractionResult = {
    signals: LlmJobSignalExtraction | null;
    attempted: boolean;
    available: boolean;
    error: string | null;
    enriched: boolean;
};

const llmSignalPromiseCache = new Map<string, Promise<LlmJobSignalExtractionResult>>();
const llmSignalValueCache = new Map<string, LlmJobSignalExtractionResult>();
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_DEEPSEEK_TIMEOUT_MS = 20000;

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeString(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim();
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const normalized = value
        .map((entry) => normalizeString(entry))
        .filter(Boolean);
    return Array.from(new Set(normalized));
}

function parseBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
    }
    return false;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
    const trimmed = value.trim();
    const withoutFence = trimmed
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");
    try {
        const parsed = JSON.parse(withoutFence);
        return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    } catch {
        return null;
    }
}

function normalizeBaseUrl(value: string | null | undefined): string {
    const normalized = normalizeString(value);
    if (!normalized) return DEFAULT_DEEPSEEK_BASE_URL;
    return normalized.replace(/\/+$/g, "");
}

function parseTimeoutMs(value: string | null | undefined): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DEEPSEEK_TIMEOUT_MS;
    return parsed;
}

function extractMessageContent(value: unknown): string {
    if (typeof value === "string") return value;
    if (!Array.isArray(value)) return "";
    return value
        .map((part) => {
            if (typeof part === "string") return part;
            if (!part || typeof part !== "object") return "";
            const maybeText = (part as { text?: unknown }).text;
            return typeof maybeText === "string" ? maybeText : "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
}

function normalizeSignals(raw: Record<string, unknown>): LlmJobSignalExtraction {
    return {
        critical_capabilities: normalizeStringArray(raw.critical_capabilities),
        important_capabilities: normalizeStringArray(raw.important_capabilities),
        supporting_capabilities: normalizeStringArray(raw.supporting_capabilities),
        role_family: normalizeString(raw.role_family),
        seniority_level: normalizeString(raw.seniority_level),
        domain_context: normalizeStringArray(raw.domain_context),
        ownership_scope: normalizeString(raw.ownership_scope),
        delivery_scope: normalizeString(raw.delivery_scope),
        transformation_scope: parseBoolean(raw.transformation_scope),
        tooling: normalizeStringArray(raw.tooling),
        hiring_risks: normalizeStringArray(raw.hiring_risks),
    };
}

function isUsableSignalPayload(signals: LlmJobSignalExtraction): boolean {
    const capabilityCount = signals.critical_capabilities.length + signals.important_capabilities.length + signals.supporting_capabilities.length;
    const contextCount = signals.domain_context.length + signals.tooling.length + signals.hiring_risks.length;
    return capabilityCount > 0 || contextCount > 0 || Boolean(signals.role_family || signals.seniority_level || signals.ownership_scope || signals.delivery_scope);
}

function toCacheKey(params: { rawJobText: string; jobTitleHint?: string | null }): string {
    return normalizeText(params.rawJobText);
}

function buildPrompt(rawJobText: string): string {
    return `
System instruction:
You extract structured hiring signals from job descriptions.
You do NOT evaluate candidates.
You identify:
- capabilities the role requires
- role scope and ownership
- domain context
- role emphasis
Return structured JSON only.

User prompt:
Analyze the following job description.
Extract the role's hiring signals.
Focus on:
- capabilities required
- capabilities emphasized
- role ownership and delivery scope
- domain context
- transformation or platform responsibilities
Return JSON only.

Capability label rules:
- Use concise, reusable, canonical-style phrases (2-5 words when possible).
- Do NOT output sentence fragments or responsibility statements.
- Do NOT output one-off narrative phrases.
- Prefer styles like:
  - commercial analytics
  - strategic planning
  - executive influence
  - stakeholder leadership
  - transformation delivery
  - change management
  - process optimization
- Avoid styles like:
  - owning measurable revenue outcomes
  - influence senior leadership with evidence-backed business cases
  - partnering with product and engineering teams
  - identify operational bottlenecks

Capability list size limits:
- critical_capabilities: at most 5
- important_capabilities: at most 5
- supporting_capabilities: at most 5
- Keep only the most central and differentiated capability signals.

transformation_scope rule:
- Set transformation_scope=true only if the JD explicitly indicates transformation-type work (for example: transformation, modernization, migration, operating model redesign, enterprise change, platform transformation, change program, transformation program).
- If evidence is not explicit, set transformation_scope=false.
- Do NOT infer transformation_scope from generic improvement, automation, growth, delivery, or optimization language alone.

Grounding and uncertainty:
- Extract only signals supported by explicit JD text.
- Do NOT invent requirements.
- If uncertain, leave fields empty (or false for transformation_scope) instead of speculating.

Use this exact JSON schema:
{
  "critical_capabilities": [],
  "important_capabilities": [],
  "supporting_capabilities": [],
  "role_family": "",
  "seniority_level": "",
  "domain_context": [],
  "ownership_scope": "",
  "delivery_scope": "",
  "transformation_scope": false,
  "tooling": [],
  "hiring_risks": []
}

Job Description:
${rawJobText.slice(0, 12000)}
`;
}

async function runExtraction(params: {
    rawJobText: string;
    jobTitleHint?: string | null;
}): Promise<LlmJobSignalExtractionResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return {
            signals: null,
            attempted: false,
            available: false,
            error: null,
            enriched: false,
        };
    }

    const endpointBaseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL);
    const endpoint = `${endpointBaseUrl}/chat/completions`;
    const model = normalizeString(process.env.DEEPSEEK_MODEL) || DEFAULT_DEEPSEEK_MODEL;
    const timeoutMs = parseTimeoutMs(process.env.DEEPSEEK_TIMEOUT_MS);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                temperature: 0.1,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "user",
                        content: buildPrompt(params.rawJobText),
                    },
                ],
            }),
            signal: abortController.signal,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            const detail = normalizeString(errorText).slice(0, 180);
            return {
                signals: null,
                attempted: true,
                available: true,
                error: detail
                    ? `DeepSeek API request failed (${response.status}): ${detail}`
                    : `DeepSeek API request failed (${response.status}).`,
                enriched: false,
            };
        }

        const body = await response.json().catch(() => null) as
            | {
                choices?: Array<{
                    message?: { content?: unknown };
                }>;
            }
            | null;
        const responseText = extractMessageContent(body?.choices?.[0]?.message?.content);
        if (!responseText) {
            return {
                signals: null,
                attempted: true,
                available: true,
                error: "LLM response did not include JSON text.",
                enriched: false,
            };
        }

        const parsedObject = parseJsonObject(responseText);
        if (!parsedObject) {
            return {
                signals: null,
                attempted: true,
                available: true,
                error: "LLM response was not valid JSON object.",
                enriched: false,
            };
        }
        const normalized = normalizeSignals(parsedObject);
        if (!isUsableSignalPayload(normalized)) {
            return {
                signals: null,
                attempted: true,
                available: true,
                error: "LLM response JSON was present but unusable for enrichment.",
                enriched: false,
            };
        }
        return {
            signals: normalized,
            attempted: true,
            available: true,
            error: null,
            enriched: true,
        };
    } catch (error) {
        return {
            signals: null,
            attempted: true,
            available: true,
            error: error instanceof Error ? error.message : "Unknown LLM extraction error",
            enriched: false,
        };
    } finally {
        clearTimeout(timeout);
    }
}

export async function getLlmJobSignalExtraction(params: {
    rawJobText: string;
    jobTitleHint?: string | null;
}): Promise<LlmJobSignalExtractionResult> {
    const key = toCacheKey(params);
    const existing = llmSignalPromiseCache.get(key);
    if (existing) return existing;
    const promise = runExtraction(params).then((result) => {
        llmSignalValueCache.set(key, result);
        return result;
    });
    llmSignalPromiseCache.set(key, promise);
    return promise;
}

export function peekCachedLlmJobSignalExtraction(params: {
    rawJobText: string;
    jobTitleHint?: string | null;
}): LlmJobSignalExtraction | null {
    const cached = llmSignalValueCache.get(toCacheKey(params));
    return cached?.signals ?? null;
}
