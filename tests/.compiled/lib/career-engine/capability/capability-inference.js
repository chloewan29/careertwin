"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferCapabilities = inferCapabilities;
exports.debugCapabilityInference = debugCapabilityInference;
const CAPABILITY_RULES = [
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
function splitLines(text) {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
}
function addChunk(chunks, source, value) {
    if (!value)
        return;
    for (const line of splitLines(value)) {
        chunks.push({ source, text: line });
    }
}
function buildTextChunks(input) {
    const chunks = [];
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
            }
            else {
                addChunk(chunks, `answers.${questionKey}`, answerValue);
            }
        }
    }
    return chunks;
}
function normalize(text) {
    return text.toLowerCase();
}
function compactSnippet(text, maxLength = 180) {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength)
        return collapsed;
    return `${collapsed.slice(0, maxLength - 3)}...`;
}
function matchPhrases(chunks, phrases) {
    const matchedPhrases = new Set();
    const evidence = new Set();
    for (const phrase of phrases) {
        const normalizedPhrase = normalize(phrase);
        for (const chunk of chunks) {
            const chunkLower = normalize(chunk.text);
            if (!chunkLower.includes(normalizedPhrase))
                continue;
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
function runInference(input) {
    const chunks = buildTextChunks(input);
    const capabilities = [];
    const evidence_map = [];
    const debug = [];
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
        if (!inferred)
            continue;
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
function inferCapabilities(input) {
    return runInference(input).result;
}
function debugCapabilityInference(input) {
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
