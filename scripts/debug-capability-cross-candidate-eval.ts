import fs from "node:fs";
import path from "node:path";
import { extractEvidenceSignalsFromPieces, type EvidenceSignalRecord } from "@/lib/career-engine/evidence/evidence-signals";
import { inferCapabilities, type EvidenceSignalForInference } from "@/lib/career-engine/capability/capability-inference";
import { CAPABILITY_STRENGTH_WEIGHTS, type CapabilityStrengthProfileItem } from "@/lib/career-engine/capability/capability-strength";
import { getCapabilityMatchV1FromProfile } from "@/lib/career-engine/matching/capability-match-v1";

type SyntheticCandidate = {
    id: string;
    archetype: "bi_data_platform_engineer" | "product_manager" | "strategy_consultant";
    display_name: string;
    evidence_pieces: string[];
};

type FixtureJob = {
    id: string;
    title: string;
    benchmark_label: "strong_fit" | "medium_fit" | "weak_fit";
    job_description: string;
};

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}

function normalizeStrengthScore(weightedSignalScore: number): number {
    const normalized = 1 - Math.exp(-(weightedSignalScore / CAPABILITY_STRENGTH_WEIGHTS.normalizationScale));
    return clamp(normalized);
}

function ownershipWeight(value: string | null): number {
    const key = (value ?? "unknown").toLowerCase() as keyof typeof CAPABILITY_STRENGTH_WEIGHTS.ownership;
    return CAPABILITY_STRENGTH_WEIGHTS.ownership[key] ?? CAPABILITY_STRENGTH_WEIGHTS.ownership.unknown;
}

function scopeWeight(value: string | null): number {
    const key = (value ?? "unknown").toLowerCase() as keyof typeof CAPABILITY_STRENGTH_WEIGHTS.scope;
    return CAPABILITY_STRENGTH_WEIGHTS.scope[key] ?? CAPABILITY_STRENGTH_WEIGHTS.scope.unknown;
}

function impactWeight(value: string | null): number {
    const key = (value ?? "unknown").toLowerCase() as keyof typeof CAPABILITY_STRENGTH_WEIGHTS.impact;
    return CAPABILITY_STRENGTH_WEIGHTS.impact[key] ?? CAPABILITY_STRENGTH_WEIGHTS.impact.unknown;
}

function confidenceModifier(signalConfidence: number | null, linkContribution: number | null): number {
    const values = [signalConfidence, linkContribution]
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
        .map((value) => clamp(value));
    if (values.length === 0) return 1;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return 0.9 + (avg * 0.2);
}

function computeRawSignalStrength(signal: EvidenceSignalForInference, linkContributionWeight: number | null): number {
    return 1
        * ownershipWeight(signal.ownership_level ?? null)
        * scopeWeight(signal.scope_level ?? null)
        * impactWeight(signal.impact_signal ?? null)
        * CAPABILITY_STRENGTH_WEIGHTS.recency.unknown
        * confidenceModifier(signal.confidence_score ?? null, linkContributionWeight);
}

function readFixtureJobs(): FixtureJob[] {
    const filePath = path.join(process.cwd(), "scripts", "fixtures", "capability-match-eval-jobs.v1.json");
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content) as { jobs: FixtureJob[] };
    return parsed.jobs;
}

function buildSyntheticCandidates(): SyntheticCandidate[] {
    return [
        {
            id: "synthetic-bi-engineer",
            archetype: "bi_data_platform_engineer",
            display_name: "BI / Data Platform Engineer",
            evidence_pieces: [
                "Led enterprise BI transformation program modernizing Power BI and Tableau platform architecture using SQL and BigQuery across 12 business units.",
                "Drove data platform modernization roadmap with engineering and analytics leaders, migrating legacy reporting to governed semantic models.",
                "Built analytics automation pipelines with Python, SQL, and BigQuery to generate automated executive insights and weekly anomaly reporting.",
                "Implemented automated reporting workflows and AI-assisted analysis to reduce manual dashboard production time from 2 days to 3 hours.",
                "Managed cross-functional platform delivery across product, operations, and finance; aligned stakeholders and secured executive approval.",
                "Created capability uplift enablement program with BI standards, training playbooks, and onboarding for 80+ analysts.",
                "Optimized operational data quality and release processes, reducing BI incident rates by 45% through CI/CD and governance controls.",
            ],
        },
        {
            id: "synthetic-product-manager",
            archetype: "product_manager",
            display_name: "Product Manager",
            evidence_pieces: [
                "Led cross-functional product squad across engineering, design, and analytics to deliver growth roadmap for subscription onboarding.",
                "Built annual product strategy and prioritized roadmap using market opportunity sizing, customer segmentation, and retention analytics.",
                "Presented business cases to executive leadership to secure budget for experimentation platform and lifecycle automation capabilities.",
                "Drove commercialization experiments with pricing and packaging analytics, improving trial-to-paid conversion by 18%.",
                "Managed team of product analysts and PMs, coaching delivery execution and stakeholder communication.",
                "Coordinated go-to-market launch plans with sales, marketing, and customer success for three major releases.",
                "Improved operational performance by redesigning feature release workflow, cutting cycle time by 30%.",
            ],
        },
        {
            id: "synthetic-strategy-consultant",
            archetype: "strategy_consultant",
            display_name: "Strategy Consultant",
            evidence_pieces: [
                "Led market opportunity assessment for telecommunications portfolio, identifying $40M expansion potential across customer segments.",
                "Developed executive-ready business cases for transformation investment and secured steering committee approval.",
                "Drove strategic planning workshops with C-suite and functional leaders to define three-year growth roadmap.",
                "Managed cross-functional workstreams across operations, finance, and commercial teams to deliver transformation program milestones.",
                "Built commercial analytics models for pricing, margin, and channel optimization; informed board-level decisions.",
                "Designed capability uplift program including training curriculum, operating playbooks, and adoption scorecards for client teams.",
                "Improved operating model efficiency through process redesign and performance governance, reducing delivery lead times by 25%.",
            ],
        },
    ];
}

function signalMatchesCapability(capability: string, signal: EvidenceSignalForInference): boolean {
    const canonical = capability.toLowerCase();
    const tools = (signal.tool_signals ?? []).map((tool) => tool.toLowerCase());
    const stakeholders = toStringArray(signal.stakeholder_scope).map((value) => value.toLowerCase());
    const action = (signal.action ?? "").toLowerCase();
    const initiative = (signal.initiative_type ?? "").toLowerCase();
    const domain = (signal.domain ?? "").toLowerCase();
    const scope = (signal.scope_level ?? "").toLowerCase();
    const ownership = (signal.ownership_level ?? "").toLowerCase();
    const impact = (signal.impact_signal ?? "").toLowerCase();

    if (canonical === "analytics automation") {
        return (initiative === "automation" || /automate|automation|pipeline|llm|ai|deployed/.test(action))
            && tools.some((tool) => ["python", "sql", "bigquery", "power bi", "llm"].includes(tool));
    }
    if (canonical === "bi / data platform transformation") {
        return (initiative === "transformation" || initiative === "capability_uplift" || /transform|migrat|moderni/.test(action))
            && tools.some((tool) => ["power bi", "tableau", "looker", "sql", "bigquery", "dbt", "snowflake"].includes(tool));
    }
    if (canonical === "cross-functional stakeholder leadership") {
        return (stakeholders.includes("cross_functional") || stakeholders.includes("executive"))
            && (ownership === "lead" || ownership === "driver" || /led|drove|presented|aligned|coordinated/.test(action));
    }
    if (canonical === "strategic planning") {
        return initiative === "strategy" || impact === "strategic" || /strategy|roadmap|planning/.test(action);
    }
    if (canonical === "commercial analytics") {
        return (domain === "commercial" || domain === "analytics") && (impact === "revenue" || impact === "cost");
    }
    if (canonical === "market & opportunity assessment") {
        return scope === "market" || initiative === "market_analysis";
    }
    if (canonical === "people leadership") {
        return ownership === "lead" && (scope === "team" || (signal.team_signal ?? "").length > 0);
    }
    if (canonical === "transformation delivery leadership") {
        return (initiative === "transformation" || initiative === "delivery")
            && (ownership === "lead" || ownership === "driver");
    }
    if (canonical === "operational performance optimization") {
        return initiative === "optimization" || impact === "operational" || impact === "cost";
    }
    if (canonical === "executive influence & business cases") {
        return stakeholders.includes("executive") && /presented|influenced|negotiated|secured approval/.test(action);
    }
    if (canonical === "capability uplift & enablement") {
        return initiative === "capability_uplift" || /enablement|training|upskill/.test(action);
    }
    if (canonical === "change management & adoption") {
        return /change|adoption|rollout/.test(action) || /change|adoption/.test(initiative);
    }
    return false;
}

function toInferenceSignals(
    candidateId: string,
    extractedSignals: EvidenceSignalRecord[],
): EvidenceSignalForInference[] {
    return extractedSignals.map((signal, index) => ({
        id: `${candidateId}:signal:${index + 1}`,
        evidence_piece_id: signal.evidence_piece_id,
        career_id: signal.career_id,
        action: signal.action,
        domain: signal.domain,
        initiative_type: signal.initiative_type,
        scope_level: signal.scope_level,
        ownership_level: signal.ownership_level,
        stakeholder_scope: signal.stakeholder_scope,
        tool_signals: signal.tool_signals,
        capability_hints: signal.capability_hints,
        team_signal: signal.team_signal,
        impact_signal: signal.impact_signal,
        confidence_score: signal.confidence_score,
    }));
}

function buildCandidateStrengthProfile(input: {
    candidateId: string;
    inferenceSignals: EvidenceSignalForInference[];
    evidenceMap: Array<{ capability: string; evidence_signal_ids?: string[] }>;
    evidenceTextByPieceId: Map<string, string>;
}): CapabilityStrengthProfileItem[] {
    const signalById = new Map(input.inferenceSignals.map((signal) => [signal.id, signal]));
    const profile: CapabilityStrengthProfileItem[] = [];

    for (const mapItem of input.evidenceMap) {
        const signalIds = Array.from(new Set(mapItem.evidence_signal_ids ?? []));
        const scoredSignals = signalIds
            .map((signalId) => signalById.get(signalId))
            .filter((signal): signal is EvidenceSignalForInference => Boolean(signal))
            .map((signal) => {
                const raw = computeRawSignalStrength(signal, signal.confidence_score ?? null);
                return {
                    evidence_signal_id: signal.id,
                    evidence_piece_id: signal.evidence_piece_id,
                    raw_signal_strength: raw,
                    contribution_score: raw,
                    action: signal.action ?? null,
                    scope_level: signal.scope_level ?? null,
                    ownership_level: signal.ownership_level ?? null,
                    impact_signal: signal.impact_signal ?? null,
                    confidence_score: signal.confidence_score ?? null,
                    link_contribution_weight: signal.confidence_score ?? null,
                    evidence_raw_text: input.evidenceTextByPieceId.get(signal.evidence_piece_id) ?? "",
                };
            })
            .sort((a, b) => b.raw_signal_strength - a.raw_signal_strength);

        const weightedScore = scoredSignals.reduce((sum, signal, index) => {
            const attenuation = 1 / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index));
            signal.contribution_score = signal.raw_signal_strength * attenuation;
            return sum + signal.contribution_score;
        }, 0);

        const canonical = mapItem.capability.toLowerCase().trim();
        profile.push({
            capability_id: `${input.candidateId}:capability:${canonical}`,
            canonical_name: canonical,
            display_name: mapItem.capability,
            strength_score: round(normalizeStrengthScore(weightedScore), 4),
            weighted_signal_score: round(weightedScore, 4),
            signal_count: scoredSignals.length,
            top_supporting_signals: scoredSignals.slice(0, 3).map((signal) => ({
                ...signal,
                contribution_score: round(signal.contribution_score, 4),
                raw_signal_strength: round(signal.raw_signal_strength, 4),
            })),
        });
    }

    // Simple targeted latent backfill for automation/platform/cross-functional so synthetic coverage mirrors runtime behavior.
    const existing = new Set(profile.map((item) => item.canonical_name));
    const latentRules: Array<{
        canonical: string;
        display: string;
        blend: number;
        selector: (signal: EvidenceSignalForInference) => boolean;
    }> = [
        {
            canonical: "analytics automation",
            display: "Analytics Automation",
            blend: 0.8,
            selector: (signal) => {
                const tools = (signal.tool_signals ?? []).map((tool) => tool.toLowerCase());
                const action = (signal.action ?? "").toLowerCase();
                const initiative = (signal.initiative_type ?? "").toLowerCase();
                return (initiative === "automation" || /automate|automation|pipeline|llm|ai/.test(action))
                    && tools.some((tool) => ["python", "sql", "bigquery", "power bi", "llm"].includes(tool));
            },
        },
        {
            canonical: "bi / data platform transformation",
            display: "BI / Data Platform Transformation",
            blend: 0.65,
            selector: (signal) => {
                const tools = (signal.tool_signals ?? []).map((tool) => tool.toLowerCase());
                const initiative = (signal.initiative_type ?? "").toLowerCase();
                return (initiative === "transformation" || initiative === "capability_uplift")
                    && tools.some((tool) => ["power bi", "tableau", "looker", "sql", "bigquery", "dbt"].includes(tool));
            },
        },
        {
            canonical: "cross-functional stakeholder leadership",
            display: "Cross-Functional Stakeholder Leadership",
            blend: 0.55,
            selector: (signal) => {
                const stakeholders = toStringArray(signal.stakeholder_scope).map((value) => value.toLowerCase());
                const action = (signal.action ?? "").toLowerCase();
                return (stakeholders.includes("cross_functional") || stakeholders.includes("executive"))
                    && /(led|drove|aligned|coordinated|managed|presented)/.test(action);
            },
        },
    ];

    for (const rule of latentRules) {
        if (existing.has(rule.canonical)) continue;
        const matched = input.inferenceSignals.filter(rule.selector);
        if (matched.length === 0) continue;
        const weighted = matched.reduce((sum, signal, index) => {
            const base = computeRawSignalStrength(signal, signal.confidence_score ?? null);
            const attenuation = 1 / (1 + (CAPABILITY_STRENGTH_WEIGHTS.diminishingSignalDecay * index));
            return sum + (base * attenuation);
        }, 0) * rule.blend;
        if (weighted < 1.0) continue;
        profile.push({
            capability_id: `${input.candidateId}:capability:${rule.canonical}`,
            canonical_name: rule.canonical,
            display_name: rule.display,
            strength_score: round(normalizeStrengthScore(weighted), 4),
            weighted_signal_score: round(weighted, 4),
            signal_count: matched.length,
            top_supporting_signals: matched.slice(0, 3).map((signal) => ({
                evidence_signal_id: signal.id,
                evidence_piece_id: signal.evidence_piece_id,
                contribution_score: round(computeRawSignalStrength(signal, signal.confidence_score ?? null), 4),
                raw_signal_strength: round(computeRawSignalStrength(signal, signal.confidence_score ?? null), 4),
                action: signal.action ?? null,
                scope_level: signal.scope_level ?? null,
                ownership_level: signal.ownership_level ?? null,
                impact_signal: signal.impact_signal ?? null,
                confidence_score: signal.confidence_score ?? null,
                link_contribution_weight: signal.confidence_score ?? null,
                evidence_raw_text: input.evidenceTextByPieceId.get(signal.evidence_piece_id) ?? "",
            })),
        });
    }

    return profile.sort((a, b) => b.strength_score - a.strength_score).slice(0, 12);
}

async function run(): Promise<void> {
    const jobs = readFixtureJobs();
    const candidates = buildSyntheticCandidates();

    const matrix: Record<string, Record<string, number>> = {};
    const candidateOutputs: Array<{
        candidate_id: string;
        archetype: string;
        capability_ranking: Array<{ canonical_name: string; display_name: string; strength_score: number; signal_count: number }>;
        job_results: Array<{
            job_id: string;
            job_title: string;
            benchmark_label: string;
            match_score: number;
            matched_strengths: string[];
            key_gaps: string[];
        }>;
    }> = [];

    for (const candidate of candidates) {
        const careerId = `synthetic-career:${candidate.id}`;
        const pieces = candidate.evidence_pieces.map((rawText, index) => ({
            id: `${careerId}:piece:${index + 1}`,
            career_id: careerId,
            raw_text: rawText,
        }));
        const evidenceTextByPieceId = new Map(pieces.map((piece) => [piece.id, piece.raw_text]));

        const extractedSignals = extractEvidenceSignalsFromPieces(pieces);
        const inferenceSignals = toInferenceSignals(candidate.id, extractedSignals);
        const inferredStructured = inferCapabilities({
            evidence_signals: inferenceSignals,
            capability_taxonomy_mode: "v1",
        });
        const inferredFallback = inferCapabilities({
            resume_text: candidate.evidence_pieces.join("\n"),
            capability_taxonomy_mode: "v1",
        });

        const mergedEvidenceMap = inferredStructured.evidence_map.slice();
        const existingCapabilities = new Set(mergedEvidenceMap.map((item) => item.capability.toLowerCase()));
        for (const fallbackCapability of inferredFallback.capabilities) {
            const canonical = fallbackCapability.toLowerCase();
            if (existingCapabilities.has(canonical)) continue;
            const matchedSignalIds = inferenceSignals
                .filter((signal) => signalMatchesCapability(canonical, signal))
                .map((signal) => signal.id);
            if (matchedSignalIds.length === 0) continue;
            mergedEvidenceMap.push({
                capability: fallbackCapability,
                evidence: [],
                evidence_signal_ids: matchedSignalIds,
                evidence_piece_ids: inferenceSignals
                    .filter((signal) => matchedSignalIds.includes(signal.id))
                    .map((signal) => signal.evidence_piece_id),
            });
            existingCapabilities.add(canonical);
        }

        const capabilityProfile = buildCandidateStrengthProfile({
            candidateId: candidate.id,
            inferenceSignals,
            evidenceMap: mergedEvidenceMap,
            evidenceTextByPieceId,
        });

        const jobResults: Array<{
            job_id: string;
            job_title: string;
            benchmark_label: string;
            match_score: number;
            matched_strengths: string[];
            key_gaps: string[];
        }> = [];
        matrix[candidate.display_name] = {};

        for (const job of jobs) {
            const match = getCapabilityMatchV1FromProfile({
                careerId,
                candidateProfile: capabilityProfile,
                jobDescription: job.job_description,
            });
            matrix[candidate.display_name][job.title] = match.overall_match_score;
            jobResults.push({
                job_id: job.id,
                job_title: job.title,
                benchmark_label: job.benchmark_label,
                match_score: match.overall_match_score,
                matched_strengths: match.partial_matches
                    .filter((item) => item.match_status === "strong" || item.match_status === "partial")
                    .slice(0, 3)
                    .map((item) => item.display_name),
                key_gaps: match.gaps.slice(0, 3).map((item) => item.display_name),
            });
        }

        candidateOutputs.push({
            candidate_id: candidate.id,
            archetype: candidate.archetype,
            capability_ranking: capabilityProfile.slice(0, 8).map((item) => ({
                canonical_name: item.canonical_name,
                display_name: item.display_name,
                strength_score: item.strength_score,
                signal_count: item.signal_count,
            })),
            job_results: jobResults.sort((a, b) => b.match_score - a.match_score),
        });
    }

    const diagnostics = {
        consistency_checks: candidateOutputs.map((candidate) => ({
            candidate: candidate.archetype,
            top_capabilities: candidate.capability_ranking.slice(0, 5).map((item) => item.display_name),
            top_job_match: candidate.job_results[0],
            lowest_job_match: candidate.job_results[candidate.job_results.length - 1],
        })),
        cross_candidate_observations: {
            highest_scores_by_job: jobs.map((job) => {
                const scored = candidates.map((candidate) => ({
                    candidate: candidate.display_name,
                    score: matrix[candidate.display_name][job.title],
                })).sort((a, b) => b.score - a.score);
                return {
                    job: job.title,
                    top_candidate: scored[0],
                    bottom_candidate: scored[scored.length - 1],
                };
            }),
        },
    };

    console.log(JSON.stringify({
        model: "capability_cross_candidate_eval_v1",
        candidate_count: candidates.length,
        job_count: jobs.length,
        evaluation_matrix: matrix,
        candidates: candidateOutputs,
        diagnostics,
    }, null, 2));
}

run().catch((error) => {
    console.error("[debug-capability-cross-candidate-eval] Failed", error);
    process.exit(1);
});
