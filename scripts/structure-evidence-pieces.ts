import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

type EvidenceRow = {
  id: string;
  career_id: string;
  raw_text: string;
  leadership: boolean | null;
  team_size: number | null;
  stakeholder_level: string[] | null;
  initiative_type: string[] | null;
  impact_type: string[] | null;
  capabilities: string[] | null;
};

type StakeholderLevel =
  | "internal"
  | "cross_functional"
  | "executive"
  | "external";

type InitiativeType =
  | "task"
  | "project"
  | "product"
  | "program"
  | "platform";

type ImpactType =
  | "revenue"
  | "cost"
  | "operational"
  | "strategic";

type ExtractionResult = {
  leadership: boolean | null;
  team_size: number | null;
  stakeholder_level: StakeholderLevel[];
  initiative_type: InitiativeType[];
  impact_type: ImpactType[];
  capabilities: string[];
  confidence: number | null;
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function clampConfidence(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function sanitizeExtraction(raw: any): ExtractionResult {
  const stakeholderAllowed = new Set<StakeholderLevel>([
    "internal",
    "cross_functional",
    "executive",
    "external",
  ]);

  const initiativeAllowed = new Set<InitiativeType>([
    "task",
    "project",
    "product",
    "program",
    "platform",
  ]);

  const impactAllowed = new Set<ImpactType>([
    "revenue",
    "cost",
    "operational",
    "strategic",
  ]);

  const stakeholder_level = dedupe(
    normalizeStringArray(raw?.stakeholder_level).filter((v) =>
      stakeholderAllowed.has(v as StakeholderLevel)
    )
  ) as StakeholderLevel[];

  const initiative_type = dedupe(
    normalizeStringArray(raw?.initiative_type).filter((v) =>
      initiativeAllowed.has(v as InitiativeType)
    )
  ) as InitiativeType[];

  const impact_type = dedupe(
    normalizeStringArray(raw?.impact_type).filter((v) =>
      impactAllowed.has(v as ImpactType)
    )
  ) as ImpactType[];

  const capabilities = dedupe(
    normalizeStringArray(raw?.capabilities).slice(0, 12)
  );

  return {
    leadership:
      typeof raw?.leadership === "boolean" ? raw.leadership : null,
    team_size:
      typeof raw?.team_size === "number" &&
      Number.isInteger(raw.team_size) &&
      raw.team_size >= 0
        ? raw.team_size
        : null,
    stakeholder_level,
    initiative_type,
    impact_type,
    capabilities,
    confidence: clampConfidence(raw?.confidence),
  };
}

function tryExtractJson(text: string): any {
  const cleaned = text.trim();

  // 1) direct JSON
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2) fenced code block
  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {}
  }

  // 3) first JSON object in text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  throw new Error(`Could not parse model output as JSON: ${text}`);
}

async function extractEvidence(rawText: string): Promise<ExtractionResult> {
  const systemPrompt = `
You extract structured attributes from one professional work evidence statement.

Return ONLY valid JSON.
Do not add markdown fences.
Do not add commentary.
Do not hallucinate.
If unclear, use null for scalar fields and [] for array fields.

Allowed stakeholder_level values:
["internal","cross_functional","executive","external"]

Allowed initiative_type values:
["task","project","product","program","platform"]

Allowed impact_type values:
["revenue","cost","operational","strategic"]

Rules:
- leadership = true only if the evidence clearly shows leading people, workstreams, programs, or meaningful ownership/coordination.
- team_size should be an integer only if explicitly stated or strongly implied.
- capabilities should be concise reusable labels, e.g. "Leadership", "Stakeholder Management", "Program Delivery", "Data Strategy".
- confidence must be a number between 0 and 1.

Required JSON shape:
{
  "leadership": boolean | null,
  "team_size": integer | null,
  "stakeholder_level": string[],
  "initiative_type": string[],
  "impact_type": string[],
  "capabilities": string[],
  "confidence": number | null
}
`.trim();

  const userPrompt = `
Evidence:
"""${rawText}"""
`.trim();

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const text = response.choices?.[0]?.message?.content ?? "";
  const parsed = tryExtractJson(text);
  return sanitizeExtraction(parsed);
}

async function loadRows(careerId: string, limit: number): Promise<EvidenceRow[]> {
  const { data, error } = await supabase
    .from("evidence_pieces")
    .select(`
      id,
      career_id,
      raw_text,
      leadership,
      team_size,
      stakeholder_level,
      initiative_type,
      impact_type,
      capabilities
    `)
    .eq("career_id", careerId)
    .or(
      [
        "leadership.is.null",
        "team_size.is.null",
        "stakeholder_level.is.null",
        "initiative_type.is.null",
        "impact_type.is.null",
        "capabilities.is.null",
      ].join(",")
    )
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as EvidenceRow[];
}

async function updateRow(id: string, extraction: ExtractionResult) {
  const payload = {
    leadership: extraction.leadership,
    team_size: extraction.team_size,
    stakeholder_level: extraction.stakeholder_level.length
      ? extraction.stakeholder_level
      : null,
    initiative_type: extraction.initiative_type.length
      ? extraction.initiative_type
      : null,
    impact_type: extraction.impact_type.length
      ? extraction.impact_type
      : null,
    capabilities: extraction.capabilities.length
      ? extraction.capabilities
      : null,
  };

  const { error } = await supabase
    .from("evidence_pieces")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

async function main() {
  const careerId = process.argv[2];
  const limit = Number(process.argv[3] ?? 100);

  if (!careerId) {
    throw new Error(
      "Usage: tsx scripts/structure-evidence-pieces.ts <career_id> [limit]"
    );
  }

  const rows = await loadRows(careerId, limit);
  console.log(`Found ${rows.length} evidence rows to structure`);

  for (const row of rows) {
    try {
      const extraction = await extractEvidence(row.raw_text);
      await updateRow(row.id, extraction);
      console.log(`Updated ${row.id}`, extraction);
    } catch (err) {
      console.error(`Failed on ${row.id}:`, err);
    }
  }

  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});