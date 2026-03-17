import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import {
    extractJobCapabilityProfileV1,
    type ExtractedJobCapability,
    type JobCapabilityImportance,
} from "@/lib/career-engine/matching/job-capability-extractor";
import {
    getLlmJobSignalExtraction,
    type LlmJobSignalExtraction,
} from "@/lib/career-engine/matching/llm-job-signal-extractor";
import { parseJobDescription, type ParsedJobDescription } from "@/lib/career-engine/parsing/jd-parser";

type UnderstandingSource = "deterministic" | "llm" | "hybrid";

export type JobMissionUnderstanding = {
    summary: string;
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobCapabilityClusterUnderstanding = {
    label: string;
    capabilities: string[];
    importance: JobCapabilityImportance;
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobOutcomeUnderstanding = {
    label: string;
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobCollaborationDemandUnderstanding = {
    label: string;
    counterparts: string[];
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobMethodUnderstanding = {
    label: string;
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobModifierUnderstanding = {
    label: string;
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobSeniorityShapeUnderstanding = {
    level: string | null;
    leadership_scope: string | null;
    autonomy: string | null;
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobRequirementUnderstanding = {
    label: string;
    reason: string;
    evidence: string[];
    confidence: number;
    source: UnderstandingSource;
};

export type JobUnderstandingDiagnostics = {
    mode: "deterministic_only" | "llm_augmented" | "llm_fallback";
    llm_attempted: boolean;
    llm_available: boolean;
    llm_enriched: boolean;
    llm_error: string | null;
    scaffold_summary: {
        target_title: string | null;
        seniority_level: string | null;
        required_skill_count: number;
        preferred_skill_count: number;
        extracted_capability_count: number;
    };
};

export type StructuredJobUnderstanding = {
    core_mission: JobMissionUnderstanding;
    core_capability_clusters: JobCapabilityClusterUnderstanding[];
    business_outcomes: JobOutcomeUnderstanding[];
    collaboration_demands: JobCollaborationDemandUnderstanding[];
    secondary_methods: JobMethodUnderstanding[];
    domain_modifiers: JobModifierUnderstanding[];
    seniority_shape: JobSeniorityShapeUnderstanding;
    blocker_like_requirements: JobRequirementUnderstanding[];
    stretch_like_requirements: JobRequirementUnderstanding[];
    extraction_diagnostics: JobUnderstandingDiagnostics;
};

type UnderstandingContext = {
    parsed: ParsedJobDescription;
    flatProfile: ReturnType<typeof extractJobCapabilityProfileV1>;
    jobSignals: ReturnType<typeof buildJobSignalsFromRawJd>;
    title: string | null;
    units: string[];
};

const CAPABILITY_GROUPS: Array<{
    label: string;
    capability_names: string[];
}> = [
    {
        label: "Analytics Translation & Insight Storytelling",
        capability_names: ["commercial analytics", "strategic planning", "executive influence & business cases"],
    },
    {
        label: "Cross-Functional Embedding & Stakeholder Leadership",
        capability_names: ["cross-functional stakeholder leadership", "executive influence & business cases", "people leadership"],
    },
    {
        label: "Commercial / Customer Insight Generation",
        capability_names: ["commercial analytics", "market & opportunity assessment", "strategic planning"],
    },
    {
        label: "Transformation / Enablement Through Data",
        capability_names: ["transformation delivery leadership", "capability uplift & enablement", "change management & adoption"],
    },
    {
        label: "Data Tooling & Analytical Methods",
        capability_names: ["analytics automation", "bi / data platform transformation"],
    },
];

const OUTCOME_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: "Translate analytics into business decisions", pattern: /\b(decision|action|recommendation|narrative|inspire action)\b/i },
    { label: "Drive commercial outcomes", pattern: /\b(commercial outcomes?|commercial value|growth|revenue|profitability)\b/i },
    { label: "Improve customer experience outcomes", pattern: /\b(customer experience|cx|journey|lifecycle)\b/i },
    { label: "Improve creative or campaign effectiveness", pattern: /\b(creative effectiveness|creative ideas|campaign|brand problems?)\b/i },
    { label: "Scale reusable analytics solutions", pattern: /\b(reusable|shared|scale across|production|frameworks?)\b/i },
];

const COLLABORATION_COUNTERPARTS: Array<{ label: string; pattern: RegExp }> = [
    { label: "creative teams", pattern: /\bcreative\b/i },
    { label: "strategy teams", pattern: /\bstrategy\b/i },
    { label: "media teams", pattern: /\bmedia\b/i },
    { label: "CX teams", pattern: /\bcx|customer experience\b/i },
    { label: "client teams", pattern: /\bclient\b/i },
    { label: "commerce teams", pattern: /\bcommerce|ecommerce\b/i },
    { label: "data engineers", pattern: /\bdata engineers?\b/i },
    { label: "data solution architects", pattern: /\barchitects?\b/i },
    { label: "AI product managers", pattern: /\bai product managers?\b/i },
];

const METHOD_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: "Python", pattern: /\bpython\b/i },
    { label: "SQL", pattern: /\bsql\b/i },
    { label: "Advanced analytics techniques", pattern: /\b(predictive modelling|nlp|retrieval-based analytics|statistics|data modelling)\b/i },
    { label: "Cloud and modern data stack", pattern: /\b(aws|azure|snowflake|cloud|modern data stacks?)\b/i },
    { label: "Reusable frameworks and documentation", pattern: /\b(methodologies|frameworks|documenting approaches|intellectual property)\b/i },
];

const DOMAIN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: "Agency / client delivery context", pattern: /\b(agency|client|publicis|advertising)\b/i },
    { label: "Brand / creative / media context", pattern: /\b(brand|creative|media|campaign)\b/i },
    { label: "Customer / CX / commerce context", pattern: /\b(customer|cx|commerce|ecommerce|journey)\b/i },
    { label: "Data / AI platform context", pattern: /\b(data|analytics|ai|production|identity)\b/i },
];

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s/&-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function compactSnippet(text: string, maxLength = 180): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3)}...`;
}

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(
        values
            .filter((value): value is string => Boolean(value && value.trim()))
            .map((value) => value.trim()),
    ));
}

function isPresent<T>(value: T | null): value is T {
    return value !== null;
}

function splitUnits(text: string): string[] {
    return text
        .split(/\r?\n|(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 18);
}

function topEvidenceFromUnits(units: string[], pattern: RegExp, limit = 3): string[] {
    return units
        .filter((unit) => pattern.test(unit))
        .slice(0, limit)
        .map((unit) => compactSnippet(unit));
}

function groupCapabilities(capabilities: ExtractedJobCapability[]): JobCapabilityClusterUnderstanding[] {
    const clusters = CAPABILITY_GROUPS
        .map((group) => {
            const matches = capabilities.filter((capability) => group.capability_names.includes(capability.canonical_name));
            if (matches.length === 0) return null;
            const importance: JobCapabilityImportance = matches.some((item) => item.importance === "critical")
                ? "critical"
                : matches.some((item) => item.importance === "important")
                    ? "important"
                    : "supporting";
            const confidence = clamp(matches.reduce((sum, item) => sum + item.confidence, 0) / matches.length);
            return {
                label: group.label,
                capabilities: uniqueStrings(matches.map((item) => item.display_name)),
                importance,
                evidence: uniqueStrings(matches.flatMap((item) => [...(item.matched_snippets ?? []), ...item.evidence])).slice(0, 3),
                confidence: round(confidence),
                source: "deterministic" as const,
            };
        })
        .filter(isPresent);

    const leftovers = capabilities
        .filter((capability) => !clusters.some((cluster) => cluster.capabilities.includes(capability.display_name)))
        .slice(0, 2)
        .map((capability) => ({
            label: capability.display_name,
            capabilities: [capability.display_name],
            importance: capability.importance,
            evidence: uniqueStrings([...(capability.matched_snippets ?? []), ...capability.evidence]).slice(0, 3),
            confidence: round(capability.confidence),
            source: "deterministic" as const,
        }));

    return [...clusters, ...leftovers].slice(0, 5);
}

function buildCoreMission(context: UnderstandingContext): JobMissionUnderstanding {
    const topClusters = groupCapabilities(context.flatProfile.capabilities)
        .filter((cluster) => cluster.importance !== "supporting")
        .slice(0, 2)
        .map((cluster) => cluster.label);
    const outcomeLabels = OUTCOME_PATTERNS
        .filter((entry) => context.units.some((unit) => entry.pattern.test(unit)))
        .slice(0, 2)
        .map((entry) => entry.label);
    const summaryParts = [
        context.title ?? "This role",
        topClusters.length > 0 ? `focuses on ${topClusters.join(" and ").toLowerCase()}` : "focuses on analytics-led problem solving",
        outcomeLabels.length > 0 ? `to ${outcomeLabels.join(" and ").toLowerCase()}` : null,
    ].filter(Boolean);
    const evidence = uniqueStrings([
        ...context.parsed.responsibilities.slice(0, 2).map((item) => compactSnippet(item)),
        ...context.flatProfile.capabilities.slice(0, 2).flatMap((item) => item.evidence),
    ]).slice(0, 3);
    return {
        summary: `${summaryParts.join(" ")}.`.replace(/\s+\./g, "."),
        evidence,
        confidence: round(clamp(0.52 + (topClusters.length * 0.14) + (outcomeLabels.length * 0.08))),
        source: "deterministic",
    };
}

function buildBusinessOutcomes(context: UnderstandingContext): JobOutcomeUnderstanding[] {
    return OUTCOME_PATTERNS
        .map((entry) => {
            const evidence = topEvidenceFromUnits(context.units, entry.pattern);
            if (evidence.length === 0) return null;
            return {
                label: entry.label,
                evidence,
                confidence: round(clamp(0.52 + (evidence.length * 0.1))),
                source: "deterministic" as const,
            };
        })
        .filter(isPresent)
        .slice(0, 5);
}

function buildCollaborationDemands(context: UnderstandingContext): JobCollaborationDemandUnderstanding[] {
    const collaborationUnits = context.units.filter((unit) => /\b(partner|collaborate|work in close partnership|embed|bridge|work as part of)\b/i.test(unit));
    const counterparts = COLLABORATION_COUNTERPARTS
        .filter((entry) => collaborationUnits.some((unit) => entry.pattern.test(unit)))
        .map((entry) => entry.label);
    if (collaborationUnits.length === 0 && counterparts.length === 0) return [];
    return [{
        label: counterparts.length > 0
            ? `Partner closely across ${counterparts.slice(0, 4).join(", ")}`
            : "Operate in cross-functional partnerships",
        counterparts: counterparts.slice(0, 6),
        evidence: collaborationUnits.slice(0, 3).map((unit) => compactSnippet(unit)),
        confidence: round(clamp(0.55 + (counterparts.length * 0.05))),
        source: "deterministic",
    }];
}

function buildSecondaryMethods(context: UnderstandingContext): JobMethodUnderstanding[] {
    const methods = METHOD_PATTERNS
        .map((entry) => {
            const evidence = topEvidenceFromUnits(context.units, entry.pattern, 2);
            if (evidence.length === 0) return null;
            return {
                label: entry.label,
                evidence,
                confidence: round(clamp(0.5 + (evidence.length * 0.1))),
                source: "deterministic" as const,
            };
        })
        .filter(isPresent);

    const preferredSkillItems = context.parsed.preferred_skills
        .slice(0, 3)
        .map((skill) => ({
            label: skill.normalized,
            evidence: [skill.normalized],
            confidence: 0.42,
            source: "deterministic" as const,
        }));

    return [...methods, ...preferredSkillItems].slice(0, 6);
}

function buildDomainModifiers(context: UnderstandingContext): JobModifierUnderstanding[] {
    const modifiers = DOMAIN_PATTERNS
        .map((entry) => {
            const evidence = topEvidenceFromUnits(context.units, entry.pattern, 2);
            if (evidence.length === 0) return null;
            return {
                label: entry.label,
                evidence,
                confidence: round(clamp(0.48 + (evidence.length * 0.1))),
                source: "deterministic" as const,
            };
        })
        .filter(isPresent);

    const signalDomains = context.jobSignals.domains
        .slice(0, 3)
        .filter((domain) => !modifiers.some((item) => normalizeText(item.label).includes(normalizeText(domain))))
        .map((domain) => ({
            label: domain,
            evidence: [domain],
            confidence: 0.4,
            source: "deterministic" as const,
        }));

    return [...modifiers, ...signalDomains].slice(0, 5);
}

function inferLeadershipScope(context: UnderstandingContext): string | null {
    const corpus = normalizeText(context.parsed.raw_text);
    if (/\b(lead a team|manage a team|mentor|coach|people leader)\b/.test(corpus)) {
        return "Explicit people leadership";
    }
    if (/\b(embed|bridge between data and creativity|work as part of .* central .* capability)\b/.test(corpus)) {
        return "Individual contributor or manager operating through cross-functional embedding";
    }
    if (/\b(accountable for|own|lead)\b/.test(corpus)) {
        return "Direct ownership over analytics delivery and influence";
    }
    return null;
}

function inferAutonomy(context: UnderstandingContext): string | null {
    const corpus = normalizeText(context.parsed.raw_text);
    if (/\b(accountable for|own|discover and interrogate|build and apply)\b/.test(corpus)) {
        return "High autonomy in framing and delivering analytics work";
    }
    if (/\bassist|support\b/.test(corpus)) {
        return "Mixed autonomy with supporting responsibilities";
    }
    return null;
}

function buildSeniorityShape(context: UnderstandingContext): JobSeniorityShapeUnderstanding {
    const evidence = uniqueStrings([
        context.title ?? null,
        ...context.parsed.responsibilities.slice(0, 2).map((item) => compactSnippet(item)),
    ]).slice(0, 3);
    return {
        level: context.parsed.seniority_level,
        leadership_scope: inferLeadershipScope(context),
        autonomy: inferAutonomy(context),
        evidence,
        confidence: round(clamp(0.48 + (evidence.length * 0.08))),
        source: "deterministic",
    };
}

function dedupeRequirements(items: JobRequirementUnderstanding[]): JobRequirementUnderstanding[] {
    const seen = new Set<string>();
    const deduped: JobRequirementUnderstanding[] = [];
    for (const item of items) {
        const key = normalizeText(item.label);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
    }
    return deduped;
}

function buildBlockerLikeRequirements(context: UnderstandingContext): JobRequirementUnderstanding[] {
    const units = context.units.filter((unit) => /\b(required|proven|hands-on|strong foundations|experience working with|must have)\b/i.test(unit));
    const items: JobRequirementUnderstanding[] = [];

    if (context.parsed.years_required !== null) {
        items.push({
            label: `${context.parsed.years_required}+ years of experience`,
            reason: "Explicit years-of-experience requirement",
            evidence: [`${context.parsed.years_required}+ years`],
            confidence: 0.72,
            source: "deterministic",
        });
    }

    for (const unit of units.slice(0, 5)) {
        const label = unit.length > 96 ? compactSnippet(unit, 92) : unit;
        items.push({
            label,
            reason: /\bpython|sql|cloud|snowflake|aws|azure\b/i.test(unit)
                ? "Explicit tooling or platform expectation"
                : /\bagency|consulting|brand environment\b/i.test(unit)
                    ? "Explicit context or background expectation"
                    : "Explicitly framed as required or proven experience",
            evidence: [compactSnippet(unit)],
            confidence: 0.68,
            source: "deterministic",
        });
    }

    return dedupeRequirements(items).slice(0, 6);
}

function buildStretchLikeRequirements(context: UnderstandingContext): JobRequirementUnderstanding[] {
    const units = context.units.filter((unit) => /\b(preferred|exposure|familiarity|nice to have|bonus|where appropriate)\b/i.test(unit));
    const preferredSkills = context.parsed.preferred_skills.map((skill) => ({
        label: skill.normalized,
        reason: "Parsed as preferred or nice-to-have skill",
        evidence: [skill.normalized],
        confidence: 0.44,
        source: "deterministic" as const,
    }));
    const unitItems = units.slice(0, 5).map((unit) => ({
        label: compactSnippet(unit, 92),
        reason: "Framed as preferred, familiarity-based, or advanced-method stretch",
        evidence: [compactSnippet(unit)],
        confidence: 0.5,
        source: "deterministic" as const,
    }));
    return dedupeRequirements([...preferredSkills, ...unitItems]).slice(0, 6);
}

function buildDeterministicUnderstanding(params: {
    rawJobText: string;
    jobTitleHint?: string | null;
}): StructuredJobUnderstanding {
    const parsed = parseJobDescription(params.rawJobText);
    const title = params.jobTitleHint?.trim() || parsed.target_title || null;
    const flatProfile = extractJobCapabilityProfileV1({
        jobDescription: params.rawJobText,
        titleHint: title,
    });
    const jobSignals = buildJobSignalsFromRawJd({
        rawJd: params.rawJobText,
        fallbackTitle: title ?? "Untitled role",
    });
    const units = splitUnits(params.rawJobText);
    const context: UnderstandingContext = { parsed, flatProfile, jobSignals, title, units };

    return {
        core_mission: buildCoreMission(context),
        core_capability_clusters: groupCapabilities(flatProfile.capabilities),
        business_outcomes: buildBusinessOutcomes(context),
        collaboration_demands: buildCollaborationDemands(context),
        secondary_methods: buildSecondaryMethods(context),
        domain_modifiers: buildDomainModifiers(context),
        seniority_shape: buildSeniorityShape(context),
        blocker_like_requirements: buildBlockerLikeRequirements(context),
        stretch_like_requirements: buildStretchLikeRequirements(context),
        extraction_diagnostics: {
            mode: "deterministic_only",
            llm_attempted: false,
            llm_available: Boolean(process.env.DEEPSEEK_API_KEY),
            llm_enriched: false,
            llm_error: null,
            scaffold_summary: {
                target_title: title,
                seniority_level: parsed.seniority_level,
                required_skill_count: parsed.required_skills.length,
                preferred_skill_count: parsed.preferred_skills.length,
                extracted_capability_count: flatProfile.capabilities.length,
            },
        },
    };
}

function normalizeCapabilityLabel(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function importanceRank(value: JobCapabilityImportance): number {
    if (value === "critical") return 3;
    if (value === "important") return 2;
    return 1;
}

function toDisplayLabel(value: string): string {
    return value
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function llmCapabilityEntries(signals: LlmJobSignalExtraction): Array<{ label: string; importance: JobCapabilityImportance }> {
    return [
        ...signals.critical_capabilities.map((label) => ({ label, importance: "critical" as const })),
        ...signals.important_capabilities.map((label) => ({ label, importance: "important" as const })),
        ...signals.supporting_capabilities.map((label) => ({ label, importance: "supporting" as const })),
    ];
}

function mergeUnderstandingWithLlmSignals(
    deterministic: StructuredJobUnderstanding,
    signals: LlmJobSignalExtraction,
): StructuredJobUnderstanding {
    const mergedClusters = deterministic.core_capability_clusters.map((cluster) => ({
        ...cluster,
        capabilities: [...cluster.capabilities],
        evidence: [...cluster.evidence],
    }));

    const capabilityIndex = new Map<string, number>();
    for (let i = 0; i < mergedClusters.length; i += 1) {
        for (const capability of mergedClusters[i].capabilities) {
            capabilityIndex.set(normalizeCapabilityLabel(capability), i);
        }
    }

    for (const entry of llmCapabilityEntries(signals)) {
        const normalized = normalizeCapabilityLabel(entry.label);
        if (!normalized) continue;
        const existingIndex = capabilityIndex.get(normalized);
        if (existingIndex !== undefined) {
            const existing = mergedClusters[existingIndex];
            if (importanceRank(entry.importance) > importanceRank(existing.importance)) {
                existing.importance = entry.importance;
            }
            existing.source = "hybrid";
            existing.confidence = round(clamp(Math.max(existing.confidence, 0.58)));
            existing.evidence = uniqueStrings([...existing.evidence, `LLM signal: ${entry.label}`]).slice(0, 4);
            continue;
        }

        const displayLabel = toDisplayLabel(normalized);
        mergedClusters.push({
            label: displayLabel,
            capabilities: [displayLabel],
            importance: entry.importance,
            evidence: [`LLM signal: ${entry.label}`],
            confidence: 0.48,
            source: "hybrid",
        });
        capabilityIndex.set(normalized, mergedClusters.length - 1);
    }

    const llmMethods = signals.tooling.map((tool) => ({
        label: tool,
        evidence: [`LLM signal: ${tool}`],
        confidence: 0.4,
        source: "hybrid" as const,
    }));
    const llmDomainModifiers = signals.domain_context.map((domain) => ({
        label: domain,
        evidence: [`LLM signal: ${domain}`],
        confidence: 0.4,
        source: "hybrid" as const,
    }));
    const llmRiskBlockers = signals.hiring_risks.map((risk) => ({
        label: risk,
        reason: "LLM-identified hiring risk signal",
        evidence: [`LLM signal: ${risk}`],
        confidence: 0.4,
        source: "hybrid" as const,
    }));

    const seniorityLevel = signals.seniority_level.trim() ? signals.seniority_level.trim() : deterministic.seniority_shape.level;
    const leadershipScope = signals.ownership_scope.trim() ? signals.ownership_scope.trim() : deterministic.seniority_shape.leadership_scope;
    const autonomy = signals.delivery_scope.trim() ? signals.delivery_scope.trim() : deterministic.seniority_shape.autonomy;

    return {
        ...deterministic,
        core_capability_clusters: mergedClusters,
        secondary_methods: uniqueStrings([...deterministic.secondary_methods.map((item) => item.label), ...llmMethods.map((item) => item.label)])
            .map((label) => llmMethods.find((item) => normalizeText(item.label) === normalizeText(label))
                ?? deterministic.secondary_methods.find((item) => normalizeText(item.label) === normalizeText(label))
                ?? {
                    label,
                    evidence: [label],
                    confidence: 0.35,
                    source: "hybrid" as const,
                })
            .slice(0, 6),
        domain_modifiers: uniqueStrings([...deterministic.domain_modifiers.map((item) => item.label), ...llmDomainModifiers.map((item) => item.label)])
            .map((label) => llmDomainModifiers.find((item) => normalizeText(item.label) === normalizeText(label))
                ?? deterministic.domain_modifiers.find((item) => normalizeText(item.label) === normalizeText(label))
                ?? {
                    label,
                    evidence: [label],
                    confidence: 0.35,
                    source: "hybrid" as const,
                })
            .slice(0, 6),
        seniority_shape: {
            ...deterministic.seniority_shape,
            level: seniorityLevel,
            leadership_scope: leadershipScope,
            autonomy,
            source: "hybrid",
            evidence: uniqueStrings([
                ...deterministic.seniority_shape.evidence,
                signals.seniority_level,
                signals.ownership_scope,
                signals.delivery_scope,
            ]).slice(0, 4),
            confidence: round(clamp(Math.max(deterministic.seniority_shape.confidence, 0.55))),
        },
        blocker_like_requirements: dedupeRequirements([...deterministic.blocker_like_requirements, ...llmRiskBlockers]).slice(0, 6),
    };
}

export async function getStructuredJobUnderstanding(params: {
    rawJobText: string;
    jobTitleHint?: string | null;
}): Promise<StructuredJobUnderstanding> {
    const deterministicUnderstanding = buildDeterministicUnderstanding(params);
    const llmResult = await getLlmJobSignalExtraction({
        rawJobText: params.rawJobText,
        jobTitleHint: params.jobTitleHint,
    });

    if (!llmResult.enriched || !llmResult.signals) {
        if (llmResult.attempted || llmResult.error) {
            return {
                ...deterministicUnderstanding,
                extraction_diagnostics: {
                    ...deterministicUnderstanding.extraction_diagnostics,
                    mode: "llm_fallback",
                    llm_attempted: llmResult.attempted,
                    llm_available: llmResult.available,
                    llm_enriched: false,
                    llm_error: llmResult.error,
                },
            };
        }
        return deterministicUnderstanding;
    }

    const mergedUnderstanding = mergeUnderstandingWithLlmSignals(deterministicUnderstanding, llmResult.signals);
    return {
        ...mergedUnderstanding,
        extraction_diagnostics: {
            ...deterministicUnderstanding.extraction_diagnostics,
            mode: "llm_augmented",
            llm_attempted: llmResult.attempted,
            llm_available: llmResult.available,
            llm_enriched: true,
            llm_error: llmResult.error,
        },
    };
}
