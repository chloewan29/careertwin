import type { EvidencePiece } from "../evidence/evidence-pieces";

export type EvidenceSignalForInference = {
    id: string;
    evidence_piece_id: string;
    career_id: string;
    action?: string | null;
    domain?: string | null;
    initiative_type?: string | null;
    scope_level?: string | null;
    ownership_level?: string | null;
    stakeholder_scope?: string[] | null;
    tool_signals?: string[] | null;
    capability_hints?: string[] | null;
    team_signal?: string | null;
    impact_signal?: string | null;
    confidence_score?: number | null;
};

export type CapabilityEvidence = {
    capability: string;
    evidence: string[];
    evidence_signal_ids?: string[];
    evidence_piece_ids?: string[];
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
    evidence_signals?: EvidenceSignalForInference[] | null;
    achievements?: string[] | null;
    projects?: string[] | null;
    answers?: Record<string, string | string[]> | null;
    capability_taxonomy_mode?: "legacy" | "v1";
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

type TextChunk = {
    source: string;
    text: string;
};

type ScoredCapability = {
    capability: string;
    score: number;
    reason: string;
};

const LEGACY_CAPABILITIES = [
    "People Leadership",
    "Program Leadership",
    "Enterprise Transformation",
    "Stakeholder Strategy",
    "Commercial Analytics",
    "BI / Data Platform Transformation",
    "Strategic Planning",
    "Change Management",
] as const;

const V1_CAPABILITIES = [
    "People Leadership",
    "Executive Influence & Business Cases",
    "Cross-Functional Stakeholder Leadership",
    "Strategic Planning",
    "Market & Opportunity Assessment",
    "Commercial Analytics",
    "BI / Data Platform Transformation",
    "Analytics Automation",
    "Capability Uplift & Enablement",
    "Transformation Delivery Leadership",
    "Operational Performance Optimization",
    "Change Management & Adoption",
] as const;

function normalize(text: string): string {
    return text.toLowerCase();
}

function compactSnippet(text: string, maxLength = 180): string {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (collapsed.length <= maxLength) return collapsed;
    return `${collapsed.slice(0, maxLength - 3)}...`;
}

function hasAny(values: string[] | null | undefined, candidates: string[]): boolean {
    const set = new Set((values ?? []).map((value) => value.toLowerCase()));
    return candidates.some((candidate) => set.has(candidate.toLowerCase()));
}

function splitLines(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function addChunk(chunks: TextChunk[], source: string, value?: string | null): void {
    if (!value) return;
    for (const line of splitLines(value)) chunks.push({ source, text: line });
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
        for (const highlight of entry.highlights ?? []) addChunk(chunks, "experience.highlight", highlight);
    }

    for (const achievement of input.achievements ?? []) addChunk(chunks, "achievement", achievement);
    for (const project of input.projects ?? []) addChunk(chunks, "project", project);

    if (input.answers) {
        for (const [key, value] of Object.entries(input.answers)) {
            if (Array.isArray(value)) {
                for (const part of value) addChunk(chunks, `answer.${key}`, part);
            } else {
                addChunk(chunks, `answer.${key}`, value);
            }
        }
    }
    return chunks;
}

function resolveTaxonomyMode(input: CapabilityInferenceInput): "legacy" | "v1" {
    if (input.capability_taxonomy_mode) return input.capability_taxonomy_mode;
    return process.env.CAREERTWIN_CAPABILITY_TAXONOMY_V1 === "1" ? "v1" : "legacy";
}

function hintBonus(hints: string[], target: string): number {
    return hints.includes(target.toLowerCase()) ? 1.25 : 0;
}

function scoreSignalLegacy(signal: EvidenceSignalForInference): ScoredCapability[] {
    const action = (signal.action ?? "").toLowerCase();
    const domain = (signal.domain ?? "").toLowerCase();
    const initiative = (signal.initiative_type ?? "").toLowerCase();
    const scope = (signal.scope_level ?? "").toLowerCase();
    const ownership = (signal.ownership_level ?? "").toLowerCase();
    const impact = (signal.impact_signal ?? "").toLowerCase();
    const stakeholders = (signal.stakeholder_scope ?? []).map((value) => value.toLowerCase());
    const tools = (signal.tool_signals ?? []).map((value) => value.toLowerCase());
    const hints = (signal.capability_hints ?? []).map((value) => value.toLowerCase());

    const out: ScoredCapability[] = [];
    const add = (capability: (typeof LEGACY_CAPABILITIES)[number], score: number, reason: string): void => {
        out.push({ capability, score: score + hintBonus(hints, capability), reason });
    };

    if ((signal.team_signal && (ownership === "lead" || ownership === "owner")) || hints.includes("people leadership")) {
        if (signal.team_signal || action === "managed" || action === "led") add("People Leadership", 3, "team leadership evidence");
    }

    if (
        (initiative === "delivery" || initiative === "transformation" || initiative === "capability_uplift")
        && (ownership === "lead" || ownership === "driver" || ownership === "owner")
        && (stakeholders.includes("cross_functional") || stakeholders.includes("executive") || scope === "function" || scope === "enterprise")
    ) {
        add("Program Leadership", 3, "cross-functional delivery leadership");
    } else if (
        action === "secured approval"
        && stakeholders.includes("executive")
        && (initiative === "strategy" || initiative === "transformation" || scope === "function" || scope === "enterprise")
    ) {
        add("Program Leadership", 3.5, "executive business case approval leadership");
    } else if (
        initiative === "transformation"
        && (scope === "enterprise" || scope === "function")
        && (ownership === "lead" || ownership === "owner")
    ) {
        add("Program Leadership", 3.75, "enterprise/function transformation ownership");
    } else if (hints.includes("program leadership") && (ownership === "lead" || ownership === "driver" || ownership === "owner")) {
        add("Program Leadership", 3, "program hint with ownership");
    } else if (initiative === "capability_uplift" && (ownership === "lead" || ownership === "driver")) {
        add("Program Leadership", 3, "capability uplift ownership");
    }

    if ((initiative === "transformation" && (scope === "enterprise" || scope === "function")) || hints.includes("enterprise transformation")) {
        if (initiative === "transformation" || action === "led" || action === "drove" || action === "pioneered") {
            add("Enterprise Transformation", hints.includes("enterprise transformation") ? 4 : 3, "explicit transformation evidence");
        }
    }

    if (
        (stakeholders.includes("executive") && (action === "secured approval" || action === "influenced" || action === "negotiated" || action === "presented"))
        || action === "secured approval"
        || (action === "presented" && (scope === "function" || scope === "enterprise"))
    ) {
        add("Stakeholder Strategy", hints.includes("stakeholder strategy") ? 4 : 3.5, "executive influence / business case evidence");
    } else if (hints.includes("stakeholder strategy") && stakeholders.length > 0) {
        add("Stakeholder Strategy", 3, "stakeholder hint with audience");
    }

    if ((domain === "analytics" || domain === "commercial") && (impact === "revenue" || impact === "cost")) {
        add("Commercial Analytics", hints.includes("commercial analytics") ? 4 : 3, "commercial impact analytics evidence");
    } else if ((initiative === "market_analysis" || scope === "market") && (impact === "revenue" || impact === "cost")) {
        add("Commercial Analytics", 2.75, "opportunity assessment with commercial impact");
    } else if (hints.includes("commercial analytics") && (domain === "analytics" || domain === "commercial")) {
        add("Commercial Analytics", 3, "commercial analytics hint with domain");
    }

    if (
        hints.includes("bi / data platform transformation")
        || (
            (initiative === "transformation" || initiative === "automation" || initiative === "capability_uplift" || initiative === "analytics")
            && (domain === "analytics" || domain === "engineering")
            && hasAny(tools, ["sql", "power bi", "tableau", "bigquery", "snowflake", "dbt", "looker", "python"])
            && (
                ownership === "lead"
                || ownership === "driver"
                || action === "pioneered"
                || action === "deployed"
                || action === "implemented"
                || (initiative === "automation" && hasAny(tools, ["python", "sql"]))
            )
        )
    ) {
        add("BI / Data Platform Transformation", hints.includes("bi / data platform transformation") ? 4 : 3.75, "explicit analytics/AI automation evidence");
    }

    if (
        initiative === "strategy"
        || initiative === "market_analysis"
        || (impact === "strategic" && (action === "led" || action === "developed" || action === "drove"))
        || hints.includes("strategic planning")
    ) {
        const support = initiative === "strategy" || initiative === "market_analysis" || scope === "function" || scope === "enterprise";
        if (support) add("Strategic Planning", hints.includes("strategic planning") ? 4 : 3, "strategic planning evidence");
    }

    if (hints.includes("change management") || ((initiative === "transformation" || initiative === "delivery") && (action === "implemented" || action === "led" || action === "drove"))) {
        add("Change Management", hints.includes("change management") ? 4 : 3, "change rollout evidence");
    }

    return out;
}

function scoreSignalV1(signal: EvidenceSignalForInference): ScoredCapability[] {
    const action = (signal.action ?? "").toLowerCase();
    const domain = (signal.domain ?? "").toLowerCase();
    const initiative = (signal.initiative_type ?? "").toLowerCase();
    const scope = (signal.scope_level ?? "").toLowerCase();
    const ownership = (signal.ownership_level ?? "").toLowerCase();
    const impact = (signal.impact_signal ?? "").toLowerCase();
    const stakeholders = (signal.stakeholder_scope ?? []).map((value) => value.toLowerCase());
    const tools = (signal.tool_signals ?? []).map((value) => value.toLowerCase());
    const hints = (signal.capability_hints ?? []).map((value) => value.toLowerCase());

    const out: ScoredCapability[] = [];
    const add = (capability: (typeof V1_CAPABILITIES)[number], score: number, reason: string): void => {
        let bonus = 0;
        if (capability === "People Leadership" && hints.includes("people leadership")) bonus = 1.2;
        if (capability === "Executive Influence & Business Cases" && hints.includes("stakeholder strategy")) bonus = 1.2;
        if (capability === "Commercial Analytics" && hints.includes("commercial analytics")) bonus = 1.2;
        if (capability === "BI / Data Platform Transformation" && hints.includes("bi / data platform transformation")) bonus = 1.2;
        if (capability === "Strategic Planning" && hints.includes("strategic planning")) bonus = 1.2;
        if (capability === "Change Management & Adoption" && hints.includes("change management")) bonus = 1.2;
        out.push({ capability, score: score + bonus, reason });
    };

    if ((signal.team_signal && (ownership === "lead" || ownership === "owner")) || (ownership === "lead" && action === "managed")) {
        add("People Leadership", 3.2, "team leadership scope");
    }

    if (
        action === "secured approval"
        || (stakeholders.includes("executive") && (action === "presented" || action === "negotiated" || action === "influenced"))
    ) {
        add("Executive Influence & Business Cases", 3.4, "executive influence and approvals");
    }

    if (
        stakeholders.includes("cross_functional")
        && (ownership === "lead" || ownership === "driver" || action === "led" || action === "drove")
    ) {
        add("Cross-Functional Stakeholder Leadership", 3.0, "cross-functional stakeholder alignment");
    }

    if (initiative === "strategy" || (impact === "strategic" && (scope === "function" || scope === "enterprise"))) {
        add("Strategic Planning", 3.1, "strategic planning evidence");
    }

    if ((initiative === "market_analysis" || scope === "market") && (impact === "revenue" || impact === "cost" || domain === "market")) {
        add("Market & Opportunity Assessment", 3.2, "market sizing/opportunity evidence");
    }

    if ((domain === "analytics" || domain === "commercial") && (impact === "revenue" || impact === "cost")) {
        add("Commercial Analytics", 3.1, "commercial impact analytics");
    }

    if (
        (initiative === "transformation" || initiative === "capability_uplift")
        && (domain === "analytics" || domain === "engineering")
        && hasAny(tools, ["power bi", "tableau", "bigquery", "snowflake", "dbt", "looker", "sql"])
        && (ownership === "lead" || ownership === "driver" || scope === "enterprise" || scope === "function")
    ) {
        add("BI / Data Platform Transformation", 3.8, "data platform transformation signals");
    }

    if (
        initiative === "automation"
        && (domain === "analytics" || domain === "engineering")
        && hasAny(tools, ["python", "sql", "bigquery", "power bi"])
        && (action === "pioneered" || action === "deployed" || action === "implemented" || ownership === "lead" || ownership === "driver")
    ) {
        add("Analytics Automation", 3.6, "analytics automation delivery");
    }

    if (
        initiative === "capability_uplift"
        || (initiative === "transformation" && /capability|enablement|training|uplift|standards/i.test(`${signal.action ?? ""} ${signal.domain ?? ""}`))
    ) {
        add("Capability Uplift & Enablement", 3.2, "capability building evidence");
    }

    if (
        (initiative === "transformation" || initiative === "delivery")
        && (ownership === "lead" || ownership === "driver" || ownership === "owner")
        && (scope === "function" || scope === "enterprise" || stakeholders.includes("cross_functional") || stakeholders.includes("executive"))
    ) {
        add("Transformation Delivery Leadership", 3.4, "transformation delivery leadership");
    }

    if (initiative === "optimization" || impact === "operational" || action === "reduced" || action === "optimized") {
        add("Operational Performance Optimization", 2.9, "operational improvement evidence");
    }

    if (initiative === "transformation" && (action === "implemented" || action === "led" || action === "drove" || hints.includes("change management"))) {
        add("Change Management & Adoption", 3.0, "change and adoption evidence");
    }

    return out;
}

function thresholdForLegacy(capability: string): number {
    if (capability === "Enterprise Transformation") return 5.8;
    if (capability === "BI / Data Platform Transformation") return 4.8;
    if (capability === "Program Leadership") return 4.2;
    if (capability === "Stakeholder Strategy") return 3.6;
    return 4.5;
}

function thresholdForV1(capability: string): number {
    switch (capability) {
        case "BI / Data Platform Transformation": return 4.8;
        case "Analytics Automation": return 3.8;
        case "Transformation Delivery Leadership": return 4.2;
        case "Executive Influence & Business Cases": return 3.8;
        case "Market & Opportunity Assessment": return 3.9;
        case "Capability Uplift & Enablement": return 3.9;
        default: return 4.0;
    }
}

function inferFromStructuredSignals(signals: EvidenceSignalForInference[], mode: "legacy" | "v1"): CapabilityInferenceResult {
    const perCapability = new Map<string, {
        score: number;
        evidence: Set<string>;
        signalIds: Set<string>;
        evidencePieceIds: Set<string>;
    }>();

    for (const signal of signals) {
        const scored = mode === "v1" ? scoreSignalV1(signal) : scoreSignalLegacy(signal);
        if (scored.length === 0) continue;
        const evidenceText = compactSnippet([
            signal.action ? `action ${signal.action}` : "",
            signal.domain ? `domain ${signal.domain}` : "",
            signal.initiative_type ? `initiative ${signal.initiative_type}` : "",
            signal.scope_level ? `scope ${signal.scope_level}` : "",
            signal.ownership_level ? `ownership ${signal.ownership_level}` : "",
            ...(signal.stakeholder_scope ?? []).map((s) => `stakeholder ${s}`),
            ...(signal.tool_signals ?? []).map((t) => `tool ${t}`),
            signal.impact_signal ? `impact ${signal.impact_signal}` : "",
            ...(signal.capability_hints ?? []).map((h) => `hint ${h}`),
        ].filter(Boolean).join(" | "), 220);

        for (const entry of scored) {
            const bucket = perCapability.get(entry.capability) ?? {
                score: 0,
                evidence: new Set<string>(),
                signalIds: new Set<string>(),
                evidencePieceIds: new Set<string>(),
            };
            bucket.score += entry.score + (signal.confidence_score ?? 0.5);
            bucket.evidence.add(evidenceText);
            bucket.signalIds.add(signal.id);
            bucket.evidencePieceIds.add(signal.evidence_piece_id);
            perCapability.set(entry.capability, bucket);
        }
    }

    const capabilities: string[] = [];
    const evidence_map: CapabilityEvidence[] = [];
    for (const [capability, stats] of perCapability.entries()) {
        const threshold = mode === "v1" ? thresholdForV1(capability) : thresholdForLegacy(capability);
        if (stats.score < threshold) continue;
        capabilities.push(capability);
        evidence_map.push({
            capability,
            evidence: Array.from(stats.evidence).slice(0, 5),
            evidence_signal_ids: Array.from(stats.signalIds),
            evidence_piece_ids: Array.from(stats.evidencePieceIds),
        });
    }

    return { capabilities, evidence_map };
}

function inferFromTextFallback(input: CapabilityInferenceInput, mode: "legacy" | "v1"): CapabilityInferenceResult {
    const chunks = buildTextChunks(input);
    const corpus = normalize(chunks.map((chunk) => chunk.text).join(" "));
    if (!corpus.trim()) return { capabilities: [], evidence_map: [] };

    const legacyMatches: Array<{ capability: string; check: boolean }> = [
        { capability: "People Leadership", check: /\b(managed a team|team leadership|mentored|coached)\b/.test(corpus) },
        { capability: "Program Leadership", check: /\b(program leadership|led program|cross-functional delivery)\b/.test(corpus) },
        { capability: "Enterprise Transformation", check: /\b(enterprise transformation|operating model transformation)\b/.test(corpus) },
        { capability: "Stakeholder Strategy", check: /\b(stakeholder alignment|executive stakeholders?|secured approval)\b/.test(corpus) },
        { capability: "Commercial Analytics", check: /\b(commercial analytics|pricing|margin|profitability)\b/.test(corpus) },
        { capability: "BI / Data Platform Transformation", check: /\b(data platform transformation|bi transformation|power bi)\b/.test(corpus) },
        { capability: "Strategic Planning", check: /\b(strategic planning|strategy roadmap|annual planning)\b/.test(corpus) },
        { capability: "Change Management", check: /\b(change management|change rollout|adoption)\b/.test(corpus) },
    ];

    const v1Matches: Array<{ capability: string; check: boolean }> = [
        { capability: "People Leadership", check: /\b(managed a team|team leadership|mentored|coached)\b/.test(corpus) },
        { capability: "Executive Influence & Business Cases", check: /\b(business case|secured approval|executive approval)\b/.test(corpus) },
        { capability: "Cross-Functional Stakeholder Leadership", check: /\b(cross-functional|stakeholder alignment)\b/.test(corpus) },
        { capability: "Strategic Planning", check: /\b(strategic planning|strategy roadmap|annual planning)\b/.test(corpus) },
        { capability: "Market & Opportunity Assessment", check: /\b(market opportunity|market analysis|competitive landscape)\b/.test(corpus) },
        { capability: "Commercial Analytics", check: /\b(revenue impact|margin|profitability|pricing)\b/.test(corpus) },
        { capability: "BI / Data Platform Transformation", check: /\b(power bi transformation|data platform transformation|bi transformation)\b/.test(corpus) },
        { capability: "Analytics Automation", check: /\b(analytics automation|automated analysis|ai-powered analytics)\b/.test(corpus) },
        { capability: "Capability Uplift & Enablement", check: /\b(capability gaps|training portal|enablement|capability uplift)\b/.test(corpus) },
        { capability: "Transformation Delivery Leadership", check: /\b(led transformation|transformation program|delivery leadership)\b/.test(corpus) },
        { capability: "Operational Performance Optimization", check: /\b(reduced analysis time|improved efficiency|streamlined)\b/.test(corpus) },
        { capability: "Change Management & Adoption", check: /\b(change rollout|adoption strategy|change management)\b/.test(corpus) },
    ];

    const matches = mode === "v1" ? v1Matches : legacyMatches;
    const capabilities = matches.filter((item) => item.check).map((item) => item.capability);
    return {
        capabilities,
        evidence_map: capabilities.map((capability) => ({
            capability,
            evidence: chunks.slice(0, 3).map((chunk) => compactSnippet(chunk.text)),
        })),
    };
}

function runInference(input: CapabilityInferenceInput): {
    result: CapabilityInferenceResult;
    debug: CapabilityRuleDebug[];
    mode: "legacy" | "v1";
} {
    const mode = resolveTaxonomyMode(input);
    const signals = input.evidence_signals ?? [];
    const result = signals.length > 0
        ? inferFromStructuredSignals(signals, mode)
        : inferFromTextFallback(input, mode);

    const debugCapabilities = mode === "v1" ? V1_CAPABILITIES : LEGACY_CAPABILITIES;
    const inferredSet = new Set(result.capabilities);
    return {
        result,
        debug: debugCapabilities.map((capability) => ({
            capability,
            strong_matches: [],
            supporting_matches: [],
            inferred: inferredSet.has(capability),
        })),
        mode,
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
        evidence_piece_count: number;
        evidence_signal_count: number;
        capability_taxonomy_mode: "legacy" | "v1";
    };
    capability_debug: CapabilityRuleDebug[];
    result: CapabilityInferenceResult;
} {
    const output = runInference(input);
    const entries = input.experience_entries ?? [];
    const entriesWithDescription = entries.filter((entry) => Boolean(entry.description && entry.description.trim().length > 0)).length;
    const entriesWithHighlights = entries.filter((entry) => (entry.highlights ?? []).length > 0).length;
    return {
        input_summary: {
            current_title: input.current_title ?? null,
            summary: input.summary ?? null,
            experience_entries_count: entries.length,
            experience_entries_with_description: entriesWithDescription,
            experience_entries_with_highlights: entriesWithHighlights,
            resume_text_length: (input.resume_text ?? "").length,
            evidence_piece_count: (input.evidence_pieces ?? []).length,
            evidence_signal_count: (input.evidence_signals ?? []).length,
            capability_taxonomy_mode: output.mode,
        },
        capability_debug: output.debug,
        result: output.result,
    };
}
