import type { EvidencePiece } from "../evidence/evidence-pieces";

export type CapabilityEvidence = {
    capability: string;
    evidence: string[];
};

export type CapabilityInferenceInput = {
    current_title?: string | null;
    summary?: string | null;
    experience_entries?: Array<{
        title?: string | null;
        company?: string | null;
        date_range?: string | null;
        description?: string | null;
        highlights?: string[] | null;
    }>;
    resume_text?: string | null;
    evidence_pieces?: EvidencePiece[] | null;

    // Reserved for future profile-enrichment inputs.
    achievements?: string[] | null;
    projects?: string[] | null;
    answers?: Record<string, string | string[]> | null;
};

export type CapabilityInferenceResult = {
    capabilities: string[];
    evidence_map: CapabilityEvidence[];
};

export type CapabilityRuleDebug = {
    capability: string;
    strong_matches: string[];
    supporting_matches: string[];
    inferred: boolean;
};

type CapabilityRule = {
    capability: string;
    strong: string[];
    supporting: string[];
};

type TextChunk = {
    source: string;
    text: string;
};

const CAPABILITY_RULES: CapabilityRule[] = [
    {
        capability: "People Leadership",
        strong: [
            "people leadership",
            "managed a team",
            "managing a team",
            "team leadership",
            "line management",
            "led team",
            "team of ",
        ],
        supporting: [
            "mentor",
            "mentored",
            "coach",
            "coached",
            "develop team",
            "developed team",
            "oversight of",
            "high-performing team",
        ],
    },
    {
        capability: "Program Leadership",
        strong: [
            "program leadership",
            "programme leadership",
            "program lead",
            "led program",
            "led initiative",
            "drive initiative",
            "drove initiative",
            "initiative leadership",
        ],
        supporting: [
            "portfolio",
            "multi-workstream",
            "cross-functional delivery",
            "delivery leadership",
            "program management",
            "across business units",
            "cross-functional initiatives",
            "oversight of",
        ],
    },
    {
        capability: "Enterprise Transformation",
        strong: [
            "enterprise transformation",
            "business transformation",
            "operating model transformation",
            "enterprise-wide transformation",
        ],
        supporting: [
            "transformation program",
            "target operating model",
            "modernization program",
            "enterprise-wide",
            "capability framework and standards",
            "from reactive reporting to proactive",
        ],
    },
    {
        capability: "Stakeholder Strategy",
        strong: [
            "stakeholder strategy",
            "executive stakeholder strategy",
            "stakeholder engagement strategy",
            "stakeholder alignment strategy",
            "strategic partnership with senior leaders",
        ],
        supporting: [
            "senior leaders",
            "executive stakeholders",
            "stakeholder alignment",
            "influenced stakeholders",
            "strategic partnership",
            "stakeholder storytelling",
        ],
    },
    {
        capability: "Commercial Analytics",
        strong: [
            "commercial analytics",
            "commercial analysis",
            "commercial insights",
            "revenue impact",
            "profitability analysis",
        ],
        supporting: [
            "business impact",
            "commercial acumen",
            "commercial thinking",
            "pricing analytics",
            "margin improvement",
        ],
    },
    {
        capability: "BI / Data Platform Transformation",
        strong: [
            "bi transformation",
            "data platform transformation",
            "analytics capability framework",
            "modernized reporting platform",
        ],
        supporting: [
            "data platform",
            "business intelligence",
            "bi platform",
            "reporting transformation",
            "analytics platform",
        ],
    },
    {
        capability: "Strategic Planning",
        strong: [
            "strategic planning",
            "strategy roadmap",
            "annual planning",
            "long-term roadmap",
        ],
        supporting: [
            "roadmap",
            "planning cycle",
            "strategic priorities",
            "planning framework",
            "operating plan",
            "framework and standards",
            "proactive strategic partnership",
        ],
    },
    {
        capability: "Change Management",
        strong: [
            "change management",
            "change leadership",
            "organizational change",
            "change rollout",
        ],
        supporting: [
            "adoption",
            "transition plan",
            "change enablement",
            "rollout",
            "behavior change",
        ],
    },
];

function splitLines(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}

function addChunk(chunks: TextChunk[], source: string, value?: string | null): void {
    if (!value) return;
    for (const line of splitLines(value)) {
        chunks.push({ source, text: line });
    }
}

function buildTextChunks(input: CapabilityInferenceInput): TextChunk[] {
    const chunks: TextChunk[] = [];

    const evidencePieces = input.evidence_pieces ?? [];
    if (evidencePieces.length > 0) {
        for (const piece of evidencePieces) {
            addChunk(chunks, `evidence.${piece.source}`, piece.raw_text);
        }
        return chunks;
    }

    addChunk(chunks, "current_title", input.current_title);
    addChunk(chunks, "summary", input.summary);
    addChunk(chunks, "resume_text", input.resume_text);

    for (const entry of input.experience_entries ?? []) {
        addChunk(chunks, "experience.title", entry.title);
        addChunk(chunks, "experience.company", entry.company);
        addChunk(chunks, "experience.date_range", entry.date_range);
        addChunk(chunks, "experience.description", entry.description);
        for (const highlight of entry.highlights ?? []) {
            addChunk(chunks, "experience.highlights", highlight);
        }
    }

    for (const achievement of input.achievements ?? []) {
        addChunk(chunks, "achievements", achievement);
    }

    for (const project of input.projects ?? []) {
        addChunk(chunks, "projects", project);
    }

    if (input.answers) {
        for (const [questionKey, answerValue] of Object.entries(input.answers)) {
            if (Array.isArray(answerValue)) {
                for (const answer of answerValue) {
                    addChunk(chunks, `answers.${questionKey}`, answer);
                }
            } else {
                addChunk(chunks, `answers.${questionKey}`, answerValue);
            }
        }
    }

    return chunks;
}

function normalize(text: string): string {
    return text.toLowerCase();
}

function compactSnippet(text: string, maxLength = 180): string {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength) return collapsed;
    return `${collapsed.slice(0, maxLength - 3)}...`;
}

function matchPhrases(chunks: TextChunk[], phrases: string[]): {
    matched_phrases: string[];
    evidence: string[];
} {
    const matchedPhrases = new Set<string>();
    const evidence = new Set<string>();

    for (const phrase of phrases) {
        const normalizedPhrase = normalize(phrase);
        for (const chunk of chunks) {
            const chunkLower = normalize(chunk.text);
            if (!chunkLower.includes(normalizedPhrase)) continue;
            matchedPhrases.add(phrase);
            evidence.add(compactSnippet(chunk.text));
            break;
        }
    }

    return {
        matched_phrases: Array.from(matchedPhrases),
        evidence: Array.from(evidence).slice(0, 5),
    };
}

function runInference(input: CapabilityInferenceInput): {
    result: CapabilityInferenceResult;
    debug: CapabilityRuleDebug[];
} {
    const chunks = buildTextChunks(input);
    const capabilities: string[] = [];
    const evidence_map: CapabilityEvidence[] = [];
    const debug: CapabilityRuleDebug[] = [];

    for (const rule of CAPABILITY_RULES) {
        const strongMatchResult = matchPhrases(chunks, rule.strong);
        const supportingMatchResult = matchPhrases(chunks, rule.supporting);
        const inferred = strongMatchResult.matched_phrases.length >= 1 || supportingMatchResult.matched_phrases.length >= 2;

        debug.push({
            capability: rule.capability,
            strong_matches: strongMatchResult.matched_phrases,
            supporting_matches: supportingMatchResult.matched_phrases,
            inferred,
        });

        if (!inferred) continue;

        const evidence = Array.from(new Set([
            ...strongMatchResult.evidence,
            ...supportingMatchResult.evidence,
        ])).slice(0, 5);
        capabilities.push(rule.capability);
        evidence_map.push({
            capability: rule.capability,
            evidence,
        });
    }

    return {
        result: { capabilities, evidence_map },
        debug,
    };
}

export function inferCapabilities(input: CapabilityInferenceInput): CapabilityInferenceResult {
    return runInference(input).result;
}

export function debugCapabilityInference(input: CapabilityInferenceInput): {
    input_summary: {
        current_title: string | null;
        summary: string | null;
        experience_entries_count: number;
        experience_entries_with_description: number;
        experience_entries_with_highlights: number;
        resume_text_length: number;
    };
    capability_debug: CapabilityRuleDebug[];
    result: CapabilityInferenceResult;
} {
    const output = runInference(input);
    const entries = input.experience_entries ?? [];
    const entriesWithDescription = entries.filter((e) => Boolean(e.description && e.description.trim().length > 0)).length;
    const entriesWithHighlights = entries.filter((e) => (e.highlights ?? []).length > 0).length;

    return {
        input_summary: {
            current_title: input.current_title ?? null,
            summary: input.summary ?? null,
            experience_entries_count: entries.length,
            experience_entries_with_description: entriesWithDescription,
            experience_entries_with_highlights: entriesWithHighlights,
            resume_text_length: (input.resume_text ?? "").length,
        },
        capability_debug: output.debug,
        result: output.result,
    };
}
