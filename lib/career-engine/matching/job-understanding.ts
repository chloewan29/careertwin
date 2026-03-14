import { GoogleGenAI } from "@google/genai";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import {
    extractJobCapabilityProfileV1,
    type ExtractedJobCapability,
    type JobCapabilityImportance,
} from "@/lib/career-engine/matching/job-capability-extractor";
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
            const importance = matches.some((item) => item.importance === "critical")
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
        .filter((cluster): cluster is JobCapabilityClusterUnderstanding => Boolean(cluster));

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
        .filter((item): item is JobOutcomeUnderstanding => Boolean(item))
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
        .filter((item): item is JobMethodUnderstanding => Boolean(item));

    const preferredSkillItems = context.parsed.preferred_skills
        .slice(0, 3)
        .map((skill) => ({
            label: skill.display_name,
            evidence: [skill.display_name],
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
        .filter((item): item is JobModifierUnderstanding => Boolean(item));

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
        label: skill.display_name,
        reason: "Parsed as preferred or nice-to-have skill",
        evidence: [skill.display_name],
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
            llm_available: Boolean(process.env.GEMINI_API_KEY),
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

function normalizeMissionCandidate(value: unknown, fallback: JobMissionUnderstanding): JobMissionUnderstanding {
    if (!value || typeof value !== "object") return fallback;
    const candidate = value as Record<string, unknown>;
    return {
        summary: typeof candidate.summary === "string" && candidate.summary.trim() ? candidate.summary.trim() : fallback.summary,
        evidence: uniqueStrings(Array.isArray(candidate.evidence) ? candidate.evidence.map((item) => typeof item === "string" ? item : "") : fallback.evidence).slice(0, 4),
        confidence: typeof candidate.confidence === "number" ? round(clamp(candidate.confidence)) : fallback.confidence,
        source: "hybrid",
    };
}

function normalizeListItems<T extends { label: string; evidence: string[]; confidence: number; source: UnderstandingSource }>(
    value: unknown,
    fallback: T[],
    enrich: (candidate: Record<string, unknown>, base: T | null) => T,
): T[] {
    if (!Array.isArray(value)) return fallback;
    const items = value
        .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const candidate = entry as Record<string, unknown>;
            const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
            if (!label) return null;
            const base = fallback.find((item) => normalizeText(item.label) === normalizeText(label)) ?? null;
            return enrich(candidate, base);
        })
        .filter((item): item is T => Boolean(item));
    return items.length > 0 ? items : fallback;
}

function mergeUnderstanding(
    deterministic: StructuredJobUnderstanding,
    llmValue: unknown,
): StructuredJobUnderstanding {
    if (!llmValue || typeof llmValue !== "object") return deterministic;
    const candidate = llmValue as Record<string, unknown>;

    return {
        core_mission: normalizeMissionCandidate(candidate.core_mission, deterministic.core_mission),
        core_capability_clusters: normalizeListItems(candidate.core_capability_clusters, deterministic.core_capability_clusters, (item, base) => ({
            label: typeof item.label === "string" ? item.label.trim() : (base?.label ?? "Capability Cluster"),
            capabilities: uniqueStrings(Array.isArray(item.capabilities) ? item.capabilities.map((value) => typeof value === "string" ? value : "") : (base?.capabilities ?? [])).slice(0, 6),
            importance: item.importance === "critical" || item.importance === "important" || item.importance === "supporting"
                ? item.importance
                : (base?.importance ?? "important"),
            evidence: uniqueStrings(Array.isArray(item.evidence) ? item.evidence.map((value) => typeof value === "string" ? value : "") : (base?.evidence ?? [])).slice(0, 4),
            confidence: typeof item.confidence === "number" ? round(clamp(item.confidence)) : (base?.confidence ?? 0.55),
            source: "hybrid",
        })),
        business_outcomes: normalizeListItems(candidate.business_outcomes, deterministic.business_outcomes, (item, base) => ({
            label: typeof item.label === "string" ? item.label.trim() : (base?.label ?? "Business Outcome"),
            evidence: uniqueStrings(Array.isArray(item.evidence) ? item.evidence.map((value) => typeof value === "string" ? value : "") : (base?.evidence ?? [])).slice(0, 4),
            confidence: typeof item.confidence === "number" ? round(clamp(item.confidence)) : (base?.confidence ?? 0.55),
            source: "hybrid",
        })),
        collaboration_demands: normalizeListItems(candidate.collaboration_demands, deterministic.collaboration_demands, (item, base) => ({
            label: typeof item.label === "string" ? item.label.trim() : (base?.label ?? "Collaboration Demand"),
            counterparts: uniqueStrings(Array.isArray(item.counterparts) ? item.counterparts.map((value) => typeof value === "string" ? value : "") : (base?.counterparts ?? [])).slice(0, 8),
            evidence: uniqueStrings(Array.isArray(item.evidence) ? item.evidence.map((value) => typeof value === "string" ? value : "") : (base?.evidence ?? [])).slice(0, 4),
            confidence: typeof item.confidence === "number" ? round(clamp(item.confidence)) : (base?.confidence ?? 0.55),
            source: "hybrid",
        })),
        secondary_methods: normalizeListItems(candidate.secondary_methods, deterministic.secondary_methods, (item, base) => ({
            label: typeof item.label === "string" ? item.label.trim() : (base?.label ?? "Secondary Method"),
            evidence: uniqueStrings(Array.isArray(item.evidence) ? item.evidence.map((value) => typeof value === "string" ? value : "") : (base?.evidence ?? [])).slice(0, 4),
            confidence: typeof item.confidence === "number" ? round(clamp(item.confidence)) : (base?.confidence ?? 0.45),
            source: "hybrid",
        })),
        domain_modifiers: normalizeListItems(candidate.domain_modifiers, deterministic.domain_modifiers, (item, base) => ({
            label: typeof item.label === "string" ? item.label.trim() : (base?.label ?? "Domain Modifier"),
            evidence: uniqueStrings(Array.isArray(item.evidence) ? item.evidence.map((value) => typeof value === "string" ? value : "") : (base?.evidence ?? [])).slice(0, 4),
            confidence: typeof item.confidence === "number" ? round(clamp(item.confidence)) : (base?.confidence ?? 0.45),
            source: "hybrid",
        })),
        seniority_shape: {
            level: typeof candidate.seniority_shape === "object" && candidate.seniority_shape && typeof (candidate.seniority_shape as Record<string, unknown>).level === "string"
                ? ((candidate.seniority_shape as Record<string, unknown>).level as string)
                : deterministic.seniority_shape.level,
            leadership_scope: typeof candidate.seniority_shape === "object" && candidate.seniority_shape && typeof (candidate.seniority_shape as Record<string, unknown>).leadership_scope === "string"
                ? ((candidate.seniority_shape as Record<string, unknown>).leadership_scope as string)
                : deterministic.seniority_shape.leadership_scope,
            autonomy: typeof candidate.seniority_shape === "object" && candidate.seniority_shape && typeof (candidate.seniority_shape as Record<string, unknown>).autonomy === "string"
                ? ((candidate.seniority_shape as Record<string, unknown>).autonomy as string)
                : deterministic.seniority_shape.autonomy,
            evidence: uniqueStrings(
                typeof candidate.seniority_shape === "object" && candidate.seniority_shape && Array.isArray((candidate.seniority_shape as Record<string, unknown>).evidence)
                    ? ((candidate.seniority_shape as Record<string, unknown>).evidence as unknown[]).map((value) => typeof value === "string" ? value : "")
                    : deterministic.seniority_shape.evidence,
            ).slice(0, 4),
            confidence: typeof candidate.seniority_shape === "object" && candidate.seniority_shape && typeof (candidate.seniority_shape as Record<string, unknown>).confidence === "number"
                ? round(clamp((candidate.seniority_shape as Record<string, unknown>).confidence as number))
                : deterministic.seniority_shape.confidence,
            source: "hybrid",
        },
        blocker_like_requirements: normalizeListItems(candidate.blocker_like_requirements, deterministic.blocker_like_requirements, (item, base) => ({
            label: typeof item.label === "string" ? item.label.trim() : (base?.label ?? "Blocker-Like Requirement"),
            reason: typeof item.reason === "string" ? item.reason.trim() : (base?.reason ?? "Potentially gating requirement"),
            evidence: uniqueStrings(Array.isArray(item.evidence) ? item.evidence.map((value) => typeof value === "string" ? value : "") : (base?.evidence ?? [])).slice(0, 4),
            confidence: typeof item.confidence === "number" ? round(clamp(item.confidence)) : (base?.confidence ?? 0.6),
            source: "hybrid",
        })),
        stretch_like_requirements: normalizeListItems(candidate.stretch_like_requirements, deterministic.stretch_like_requirements, (item, base) => ({
            label: typeof item.label === "string" ? item.label.trim() : (base?.label ?? "Stretch-Like Requirement"),
            reason: typeof item.reason === "string" ? item.reason.trim() : (base?.reason ?? "Potentially narrative-sensitive or stretch requirement"),
            evidence: uniqueStrings(Array.isArray(item.evidence) ? item.evidence.map((value) => typeof value === "string" ? value : "") : (base?.evidence ?? [])).slice(0, 4),
            confidence: typeof item.confidence === "number" ? round(clamp(item.confidence)) : (base?.confidence ?? 0.48),
            source: "hybrid",
        })),
        extraction_diagnostics: deterministic.extraction_diagnostics,
    };
}

async function augmentUnderstandingWithLlm(params: {
    rawJobText: string;
    deterministicUnderstanding: StructuredJobUnderstanding;
}): Promise<StructuredJobUnderstanding> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return params.deterministicUnderstanding;
    }

    const prompt = `
You are analyzing a job description. Convert the role into a structured job understanding object.

Use the deterministic scaffold as your anchor. Refine semantics, cluster related requirements, and clarify mission, outcomes, collaboration, blockers, and stretch items. Do not score the role. Do not infer candidate fit. Do not invent unsupported requirements.

Return JSON only with these keys:
- core_mission: { summary, evidence, confidence }
- core_capability_clusters: [{ label, capabilities, importance, evidence, confidence }]
- business_outcomes: [{ label, evidence, confidence }]
- collaboration_demands: [{ label, counterparts, evidence, confidence }]
- secondary_methods: [{ label, evidence, confidence }]
- domain_modifiers: [{ label, evidence, confidence }]
- seniority_shape: { level, leadership_scope, autonomy, evidence, confidence }
- blocker_like_requirements: [{ label, reason, evidence, confidence }]
- stretch_like_requirements: [{ label, reason, evidence, confidence }]

Rules:
1. Stay faithful to the raw JD text.
2. Keep evidence snippets short and traceable to the JD.
3. blocker_like_requirements should be requirements that look gating or explicitly required.
4. stretch_like_requirements should be preferred, advanced, or narrative-sensitive asks.
5. Confidence must be between 0 and 1.

DETERMINISTIC SCAFFOLD:
${JSON.stringify(params.deterministicUnderstanding, null, 2)}

RAW JOB DESCRIPTION:
${params.rawJobText.slice(0, 12000)}
`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            temperature: 0.1,
            responseMimeType: "application/json",
        },
    });

    if (!response.text) return params.deterministicUnderstanding;
    const parsed = JSON.parse(response.text) as unknown;
    return mergeUnderstanding(params.deterministicUnderstanding, parsed);
}

export async function getStructuredJobUnderstanding(params: {
    rawJobText: string;
    jobTitleHint?: string | null;
}): Promise<StructuredJobUnderstanding> {
    const deterministicUnderstanding = buildDeterministicUnderstanding(params);
    if (!process.env.GEMINI_API_KEY) {
        return deterministicUnderstanding;
    }

    try {
        const augmented = await augmentUnderstandingWithLlm({
            rawJobText: params.rawJobText,
            deterministicUnderstanding,
        });
        return {
            ...augmented,
            extraction_diagnostics: {
                ...deterministicUnderstanding.extraction_diagnostics,
                mode: "llm_augmented",
                llm_attempted: true,
                llm_available: true,
                llm_error: null,
            },
        };
    } catch (error) {
        return {
            ...deterministicUnderstanding,
            extraction_diagnostics: {
                ...deterministicUnderstanding.extraction_diagnostics,
                mode: "llm_fallback",
                llm_attempted: true,
                llm_available: true,
                llm_error: error instanceof Error ? error.message : "Unknown LLM error",
            },
        };
    }
}
