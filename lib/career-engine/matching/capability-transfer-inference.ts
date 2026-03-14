import type { EvidencePiece, EvidenceSignal } from "@/lib/career-engine/memory/career-graph-loader";
import type { JobCapabilityClusterUnderstanding } from "@/lib/career-engine/matching/job-understanding";

export type CapabilityTransferPatternId =
    | "analytics_to_decision_translation"
    | "commercial_customer_analytics"
    | "stakeholder_storytelling_from_analytics"
    | "cross_functional_analytics_leadership"
    | "analytics_enablement_adoption"
    | "transformation_through_data"
    | "strategic_problem_solving_with_analytics";

export type CandidateCapabilityTransferInput = {
    capability_id: string;
    canonical_name: string;
    display_name: string;
    strength_score: number;
    weighted_signal_score: number;
    signal_count: number;
    transferable_tags: string[];
    domain_tags: string[];
    supporting_evidence_piece_ids: string[];
};

export type CapabilityTransferPattern = {
    pattern_id: CapabilityTransferPatternId;
    display_name: string;
    transfer_strength: number;
    aggregate_score: number;
    supporting_evidence_piece_ids: string[];
    short_explanation: string;
    reasoning: string;
    mapped_target_clusters: string[];
    related_capabilities: string[];
    matched_signal_terms: string[];
    capability_coverage_score: number;
    evidence_quality_score: number;
    ownership_scope_score: number;
    target_cluster_alignment_score: number;
};

export type CapabilityTransferInference = {
    transfer_patterns: CapabilityTransferPattern[];
    diagnostics: {
        candidate_capability_count: number;
        evidence_piece_count: number;
        evidence_signal_count: number;
        structured_job_cluster_count: number;
        total_patterns_considered: number;
    };
};

type TransferPatternDefinition = {
    id: CapabilityTransferPatternId;
    display_name: string;
    capability_names: string[];
    capability_tags: string[];
    signal_terms: string[];
    role_families: string[];
    target_cluster_terms: string[];
};

type TransferEvidenceMatch = {
    evidence_piece_id: string;
    matched_terms: string[];
    quality: number;
    ownership: number;
};

const ROLE_FAMILY_PATTERNS: Array<{ family: string; pattern: RegExp }> = [
    { family: "analytics", pattern: /\b(analytics|analyst|insights?|bi|business intelligence|measurement|reporting)\b/i },
    { family: "commercial", pattern: /\b(commercial|revenue|growth|pricing|profitability|category)\b/i },
    { family: "strategy", pattern: /\b(strategy|strategic|roadmap|prioritization|planning)\b/i },
    { family: "customer", pattern: /\b(customer|cx|consumer|client|audience)\b/i },
    { family: "product", pattern: /\b(product|experimentation|roadmap)\b/i },
    { family: "transformation", pattern: /\b(transformation|change|adoption|enablement|modernization)\b/i },
    { family: "operations", pattern: /\b(operations|operational|process|efficiency|optimization)\b/i },
    { family: "marketing", pattern: /\b(marketing|media|campaign|brand)\b/i },
];

const TRANSFER_PATTERN_DEFINITIONS: TransferPatternDefinition[] = [
    {
        id: "analytics_to_decision_translation",
        display_name: "Analytics-to-Decision Translation",
        capability_names: [
            "commercial analytics",
            "executive influence & business cases",
            "strategic planning",
        ],
        capability_tags: ["analytics", "insights", "translation", "strategy", "commercial"],
        signal_terms: [
            "decision",
            "recommendation",
            "business outcomes",
            "commercial outcomes",
            "translate",
            "insight",
            "actionable",
        ],
        role_families: ["analytics", "strategy", "commercial"],
        target_cluster_terms: ["analytics translation", "insight storytelling", "strategy", "decision"],
    },
    {
        id: "commercial_customer_analytics",
        display_name: "Commercial / Customer Analytics",
        capability_names: [
            "commercial analytics",
            "market & opportunity assessment",
            "strategic planning",
        ],
        capability_tags: ["commercial", "customer", "analytics", "growth", "segmentation"],
        signal_terms: [
            "commercial",
            "customer",
            "growth",
            "pricing",
            "profitability",
            "segmentation",
            "opportunity",
        ],
        role_families: ["commercial", "customer", "analytics", "marketing"],
        target_cluster_terms: ["commercial analytics", "customer", "cx", "insight", "growth"],
    },
    {
        id: "stakeholder_storytelling_from_analytics",
        display_name: "Stakeholder Storytelling from Analytics",
        capability_names: [
            "cross-functional stakeholder leadership",
            "executive influence & business cases",
            "strategic planning",
        ],
        capability_tags: ["stakeholder", "executive", "storytelling", "translation", "embedding"],
        signal_terms: [
            "stakeholder",
            "executive",
            "business case",
            "presentation",
            "storytelling",
            "recommendation",
            "influence",
        ],
        role_families: ["analytics", "strategy", "commercial", "customer"],
        target_cluster_terms: ["stakeholder", "storytelling", "embedding", "leadership", "client"],
    },
    {
        id: "cross_functional_analytics_leadership",
        display_name: "Cross-Functional Analytics Leadership",
        capability_names: [
            "cross-functional stakeholder leadership",
            "people leadership",
            "capability uplift & enablement",
            "transformation delivery leadership",
        ],
        capability_tags: ["cross-functional", "leadership", "embedding", "enablement", "stakeholder"],
        signal_terms: [
            "cross-functional",
            "partner with",
            "align",
            "embed",
            "operating model",
            "leadership",
            "governance",
        ],
        role_families: ["analytics", "transformation", "operations", "product", "strategy"],
        target_cluster_terms: ["stakeholder", "embedding", "leadership", "cross-functional"],
    },
    {
        id: "analytics_enablement_adoption",
        display_name: "Analytics Enablement / Adoption",
        capability_names: [
            "capability uplift & enablement",
            "change management & adoption",
            "analytics automation",
            "cross-functional stakeholder leadership",
        ],
        capability_tags: ["enablement", "adoption", "analytics", "tooling", "transformation"],
        signal_terms: [
            "enablement",
            "adoption",
            "capability uplift",
            "playbook",
            "training",
            "standards",
            "ways of working",
        ],
        role_families: ["analytics", "transformation", "operations", "product"],
        target_cluster_terms: ["enablement", "adoption", "data tooling", "methods", "transformation"],
    },
    {
        id: "transformation_through_data",
        display_name: "Transformation-through-Data",
        capability_names: [
            "transformation delivery leadership",
            "analytics automation",
            "bi / data platform transformation",
            "strategic planning",
        ],
        capability_tags: ["transformation", "analytics", "tooling", "platform", "change"],
        signal_terms: [
            "transformation",
            "modernization",
            "analytics automation",
            "platform",
            "dashboard",
            "bi",
            "change",
        ],
        role_families: ["transformation", "analytics", "operations", "product"],
        target_cluster_terms: ["transformation", "enablement", "data tooling", "platform"],
    },
    {
        id: "strategic_problem_solving_with_analytics",
        display_name: "Strategic Problem Solving with Analytics",
        capability_names: [
            "strategic planning",
            "market & opportunity assessment",
            "commercial analytics",
            "executive influence & business cases",
        ],
        capability_tags: ["strategy", "analytics", "problem", "prioritization", "roadmap", "product"],
        signal_terms: [
            "problem solving",
            "trade-off",
            "prioritization",
            "roadmap",
            "opportunity",
            "strategic",
            "recommendation",
        ],
        role_families: ["analytics", "strategy", "commercial", "product"],
        target_cluster_terms: ["strategy", "analytics translation", "commercial", "product", "insight"],
    },
];

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s/&-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 4): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function averageNumber(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(new Set(
        values
            .filter((value): value is string => Boolean(value && value.trim()))
            .map((value) => value.trim()),
    ));
}

function inferRoleFamilies(value: string | null | undefined): string[] {
    return Array.from(new Set(
        ROLE_FAMILY_PATTERNS
            .filter((entry) => entry.pattern.test(value ?? ""))
            .map((entry) => entry.family),
    ));
}

function evidenceOwnershipScore(signal?: EvidenceSignal | null, piece?: EvidencePiece | null): number {
    let score = 0.18;
    const ownership = normalizeText(signal?.ownership_level ?? "");
    if (ownership === "lead") score += 0.38;
    else if (ownership === "owner") score += 0.34;
    else if (ownership === "driver") score += 0.24;
    else if (ownership === "contributor") score += 0.08;

    const signalStakeholders = new Set((signal?.stakeholder_scope ?? []).map((value) => normalizeText(value)));
    if (signalStakeholders.has("executive")) score += 0.18;
    if (signalStakeholders.has("cross_functional")) score += 0.14;

    const scope = normalizeText(signal?.scope_level ?? "");
    if (scope === "enterprise" || scope === "market") score += 0.14;
    else if (scope === "function") score += 0.1;
    else if (scope === "team") score += 0.06;

    const orgScope = normalizeText(piece?.org_scope ?? "");
    if (orgScope === "enterprise" || orgScope === "cross_functional") score += 0.08;
    const leadershipScope = normalizeText(piece?.leadership_scope ?? "");
    if (leadershipScope === "program_lead" || leadershipScope === "org_lead") score += 0.08;
    const confidence = piece?.confidence ?? 0;
    if (confidence >= 0.75) score += 0.04;

    return clamp(score);
}

function buildEvidenceCorpus(piece: EvidencePiece, signals: EvidenceSignal[]): string {
    return normalizeText([
        piece.role,
        piece.company,
        piece.raw_text,
        piece.summary,
        piece.action,
        piece.impact,
        piece.business_context,
        ...(piece.stakeholders ?? []),
        ...(piece.tools_methods ?? []),
        ...signals.flatMap((signal) => [
            signal.action,
            signal.domain,
            signal.initiative_type,
            signal.team_signal,
            signal.impact_signal,
            ...(signal.tool_signals ?? []),
            ...(signal.capability_hints ?? []),
            ...(signal.stakeholder_scope ?? []),
        ]),
    ].join(" "));
}

function matchEvidenceForPattern(
    definition: TransferPatternDefinition,
    piece: EvidencePiece,
    signals: EvidenceSignal[],
): TransferEvidenceMatch | null {
    const corpus = buildEvidenceCorpus(piece, signals);
    const matchedTerms = definition.signal_terms.filter((term) => corpus.includes(normalizeText(term)));
    const familyHits = inferRoleFamilies(corpus).filter((family) => definition.role_families.includes(family));
    if (matchedTerms.length === 0 && familyHits.length === 0) return null;

    const topOwnership = Math.max(
        evidenceOwnershipScore(undefined, piece),
        ...signals.map((signal) => evidenceOwnershipScore(signal, piece)),
    );
    const quality = clamp(
        (matchedTerms.length * 0.11)
        + (familyHits.length > 0 ? 0.08 : 0)
        + (topOwnership * 0.55)
        + ((piece.impact_type === "strategic" || piece.impact_type === "revenue") ? 0.08 : 0),
    );

    return {
        evidence_piece_id: piece.id,
        matched_terms: uniqueStrings([...matchedTerms, ...familyHits]).slice(0, 8),
        quality,
        ownership: topOwnership,
    };
}

function matchTargetClusters(
    definition: TransferPatternDefinition,
    structuredJobClusters: JobCapabilityClusterUnderstanding[],
): { mappedTargetClusters: string[]; alignmentScore: number } {
    const matches = structuredJobClusters
        .map((cluster) => {
            const corpus = normalizeText([
                cluster.label,
                ...cluster.capabilities,
                ...cluster.evidence,
            ].join(" "));
            const termHits = definition.target_cluster_terms.filter((term) => corpus.includes(normalizeText(term)));
            const capabilityHits = definition.capability_names.filter((name) => corpus.includes(normalizeText(name)));
            const tagHits = definition.capability_tags.filter((tag) => corpus.includes(normalizeText(tag)));
            const score = clamp(
                (termHits.length * 0.18)
                + (capabilityHits.length * 0.16)
                + (tagHits.length * 0.08)
                + (cluster.importance === "critical" ? 0.16 : cluster.importance === "important" ? 0.1 : 0.04)
                + (cluster.confidence * 0.22),
            );
            if (score < 0.28) return null;
            return {
                label: cluster.label,
                score,
            };
        })
        .filter((item): item is { label: string; score: number } => Boolean(item))
        .sort((a, b) => b.score - a.score);

    return {
        mappedTargetClusters: matches.map((item) => item.label).slice(0, 4),
        alignmentScore: round(averageNumber(matches.map((item) => item.score))),
    };
}

export function inferCapabilityTransfer(params: {
    candidateEvidencePieces: EvidencePiece[];
    inferredCandidateCapabilities: CandidateCapabilityTransferInput[];
    structuredJobCapabilityClusters: JobCapabilityClusterUnderstanding[];
    candidateEvidenceSignals?: EvidenceSignal[];
    candidateTitles?: string[];
}): CapabilityTransferInference {
    const evidenceSignals = params.candidateEvidenceSignals ?? [];
    const signalsByEvidencePieceId = new Map<string, EvidenceSignal[]>();
    for (const signal of evidenceSignals) {
        const existing = signalsByEvidencePieceId.get(signal.evidence_piece_id) ?? [];
        existing.push(signal);
        signalsByEvidencePieceId.set(signal.evidence_piece_id, existing);
    }

    const titleFamilies = new Set(
        uniqueStrings(params.candidateTitles ?? []).flatMap((title) => inferRoleFamilies(title)),
    );

    const transferPatterns = TRANSFER_PATTERN_DEFINITIONS
        .map((definition) => {
            const matchedCapabilities = params.inferredCandidateCapabilities.filter((capability) => {
                if (definition.capability_names.includes(capability.canonical_name)) return true;
                if (capability.transferable_tags.some((tag) => definition.capability_tags.includes(tag))) return true;
                return capability.domain_tags.some((tag) => definition.role_families.includes(tag));
            });

            const capabilityScores = matchedCapabilities
                .map((capability) => capability.strength_score)
                .sort((a, b) => b - a);
            const capabilityCoverageScore = clamp(
                (averageNumber(capabilityScores.slice(0, 3)) * 0.62)
                + (matchedCapabilities.length >= 2 ? 0.14 : 0)
                + (matchedCapabilities.length >= 3 ? 0.08 : 0)
                + (definition.capability_names.some((name) => matchedCapabilities.some((capability) => capability.canonical_name === name)) ? 0.08 : 0)
                + (definition.role_families.some((family) => titleFamilies.has(family)) ? 0.05 : 0),
            );

            const evidenceMatches = params.candidateEvidencePieces
                .map((piece) => matchEvidenceForPattern(
                    definition,
                    piece,
                    signalsByEvidencePieceId.get(piece.id) ?? [],
                ))
                .filter((item): item is TransferEvidenceMatch => Boolean(item))
                .sort((a, b) => b.quality - a.quality)
                .slice(0, 6);

            const evidenceQualityScore = clamp(averageNumber(evidenceMatches.map((item) => item.quality)));
            const ownershipScopeScore = clamp(averageNumber(evidenceMatches.map((item) => item.ownership)));
            const targetClusterMatch = matchTargetClusters(definition, params.structuredJobCapabilityClusters);
            const transferStrength = clamp(
                (capabilityCoverageScore * 0.42)
                + (evidenceQualityScore * 0.24)
                + (ownershipScopeScore * 0.16)
                + (targetClusterMatch.alignmentScore * 0.18)
                + (evidenceMatches.length >= 2 ? 0.04 : 0),
            );

            if (transferStrength < 0.28) return null;

            const relatedCapabilities = matchedCapabilities
                .sort((a, b) => b.strength_score - a.strength_score)
                .slice(0, 4)
                .map((capability) => capability.display_name);
            const supportingEvidencePieceIds = uniqueStrings(evidenceMatches.map((item) => item.evidence_piece_id)).slice(0, 6);
            const mappedTargetClusters = targetClusterMatch.mappedTargetClusters;
            return {
                pattern_id: definition.id,
                display_name: definition.display_name,
                transfer_strength: round(transferStrength),
                aggregate_score: round(transferStrength),
                supporting_evidence_piece_ids: supportingEvidencePieceIds,
                short_explanation: `${definition.display_name} is supported by ${relatedCapabilities.length} adjacent capabilities and ${supportingEvidencePieceIds.length} evidence pieces${mappedTargetClusters.length > 0 ? `, mapping into ${mappedTargetClusters.slice(0, 2).join(" + ")}` : ""}.`,
                reasoning: `${definition.display_name}: transfer=${round(transferStrength, 2)}, capability=${round(capabilityCoverageScore, 2)}, evidence=${round(evidenceQualityScore, 2)}, ownership=${round(ownershipScopeScore, 2)}, cluster_alignment=${round(targetClusterMatch.alignmentScore, 2)}.`,
                mapped_target_clusters: mappedTargetClusters,
                related_capabilities: relatedCapabilities,
                matched_signal_terms: uniqueStrings(evidenceMatches.flatMap((item) => item.matched_terms)).slice(0, 8),
                capability_coverage_score: round(capabilityCoverageScore),
                evidence_quality_score: round(evidenceQualityScore),
                ownership_scope_score: round(ownershipScopeScore),
                target_cluster_alignment_score: round(targetClusterMatch.alignmentScore),
            } satisfies CapabilityTransferPattern;
        })
        .filter((pattern): pattern is CapabilityTransferPattern => Boolean(pattern))
        .sort((a, b) => b.transfer_strength - a.transfer_strength);

    return {
        transfer_patterns: transferPatterns,
        diagnostics: {
            candidate_capability_count: params.inferredCandidateCapabilities.length,
            evidence_piece_count: params.candidateEvidencePieces.length,
            evidence_signal_count: evidenceSignals.length,
            structured_job_cluster_count: params.structuredJobCapabilityClusters.length,
            total_patterns_considered: TRANSFER_PATTERN_DEFINITIONS.length,
        },
    };
}
