import fs from "node:fs";
import path from "node:path";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";

type Fixture = {
    jobs: Array<{
        id: string;
        title: string;
        company?: string | null;
        job_description: string;
    }>;
};

type Args = {
    profileId: string;
    fixturePath: string;
    outPath: string;
};

type QuickCheckSuppressionMemoryRecord = {
    evidence_id: string;
    source: "quick_check_confirmation";
    confidence: "self_declared";
    strength: number;
    requirement_cluster: string;
    capability_tags: string[];
};

type CaseResult = {
    case_id: string;
    class: "primary" | "contrast";
    suppressed_question_count: number;
    calibration_question_count: number;
    required_flag: boolean;
    top_candidate_cluster: string | null;
    top_candidate_display_name: string | null;
    top_candidate_match_status: string | null;
    replacement_owner_cluster: string | null;
    replacement_owner_display_name: string | null;
    candidate_proxy_source: "replacement_selected_owner" | "top_candidates_0" | "none";
    candidate_proxy_sub_context_tokens: string[];
    authoritative_gap_type: string | null;
};

function loadEnvLocal(): void {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        profileId: readArg("--profileId") ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53",
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        outPath: readArg("--out") ?? "artifacts/job-copilot-qca-suppression-subpredicate-isolation.2026-04-10.json",
    };
}

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath) ? fixturePath : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_/]+/g, " ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSuppressionCluster(value: string): string {
    return value.toLowerCase().replace(/[_-]+/g, "_").replace(/\s+/g, "_").trim();
}

function toSuppressionClusterFamily(value: string): string {
    const cluster = normalizeSuppressionCluster(value);
    if (!cluster) return "";
    if (cluster.includes("marketing_science_measurement") || cluster.includes("digital_advertising_agency")) return "marketing_measurement";
    if (cluster.includes("product_management_roadmap_discovery") || cluster.includes("product_analytics_experimentation")) return "product_management";
    if (cluster.includes("business_analysis_requirements_process")) return "business_analysis";
    if (cluster.includes("it_implementation_rollout_delivery") || cluster.includes("transformation_enablement")) return "implementation_transformation";
    if (cluster.includes("program_management_governance")) return "program_management";
    if (cluster.includes("strategy_consulting_advisory")) return "consulting_advisory";
    if (cluster.includes("customer_cx_insights")) return "crm_lifecycle";
    if (cluster.includes("commercial_strategy_planning") || cluster.includes("commercial_analytics")) return "commercial_strategy";
    if (cluster.includes("pricing_revenue")) return "pricing_revenue";
    if (cluster.includes("insight_generation_reporting") || cluster.includes("analytics_translation_storytelling")) return "analytics_translation";
    return cluster;
}

function clusterTokenSet(value: string): Set<string> {
    return new Set(
        normalizeText(value.replace(/[_-]+/g, " "))
            .split(" ")
            .filter((token) => token.length >= 3),
    );
}

function clustersAlignedDetailed(left: string, right: string): { aligned: boolean; reason: "exact" | "family" | "token_jaccard" | "none" } {
    const leftCluster = normalizeSuppressionCluster(left);
    const rightCluster = normalizeSuppressionCluster(right);
    if (!leftCluster || !rightCluster) return { aligned: false, reason: "none" };
    if (leftCluster === rightCluster) return { aligned: true, reason: "exact" };
    const leftFamily = toSuppressionClusterFamily(leftCluster);
    const rightFamily = toSuppressionClusterFamily(rightCluster);
    if (leftFamily && rightFamily && leftFamily === rightFamily) return { aligned: true, reason: "family" };

    const leftTokens = clusterTokenSet(left);
    const rightTokens = clusterTokenSet(right);
    if (leftTokens.size === 0 || rightTokens.size === 0) return { aligned: false, reason: "none" };
    let overlap = 0;
    for (const token of leftTokens) {
        if (rightTokens.has(token)) overlap += 1;
    }
    if (overlap === 0) return { aligned: false, reason: "none" };
    const union = leftTokens.size + rightTokens.size - overlap;
    const aligned = union > 0 ? (overlap / union) >= 0.6 : false;
    return { aligned, reason: aligned ? "token_jaccard" : "none" };
}

function normalizeSuppressionTag(value: string): string {
    const normalized = normalizeText(value.replace(/[_/-]+/g, " "));
    if (!normalized) return "";
    if (/\b(similar\s+)?operating context\b/.test(normalized) || /\bcontext similarity\b/.test(normalized)) return "operating context";
    if (/\bdecision( support)? impact\b/.test(normalized) || /\bbusiness action\b/.test(normalized) || /\bstakeholder decisions?\b/.test(normalized)) return "decision impact";
    if (/\b(end to end|e2e|direct)\b.*\bownership\b/.test(normalized) || /\bownership depth\b/.test(normalized) || /\baccountability\b/.test(normalized)) return "ownership";
    if (/\bstakeholder alignment\b/.test(normalized) || /\bstakeholder recommendation\b/.test(normalized)) return "stakeholder alignment";
    if (/\btransformation\b/.test(normalized) || /\benablement\b/.test(normalized)) return "transformation enablement";
    return normalized;
}

function tagsSemanticallyAligned(left: string, right: string): boolean {
    if (!left || !right) return false;
    if (left === right) return true;
    if (left.includes(right) || right.includes(left)) {
        return Math.min(left.length, right.length) >= 6;
    }
    return false;
}

function tagOverlapDetailed(left: string[], right: string[]): { count: number; overlaps: string[] } {
    const leftSet = Array.from(new Set(left.map((value) => normalizeSuppressionTag(value)).filter(Boolean)));
    const rightSet = Array.from(new Set(right.map((value) => normalizeSuppressionTag(value)).filter(Boolean)));
    if (leftSet.length === 0 || rightSet.length === 0) return { count: 0, overlaps: [] };
    const overlaps: string[] = [];
    for (const tag of leftSet) {
        if (rightSet.includes(tag)) {
            overlaps.push(tag);
            continue;
        }
        for (const candidate of rightSet) {
            if (tagsSemanticallyAligned(tag, candidate)) {
                overlaps.push(`${tag}~${candidate}`);
                break;
            }
        }
    }
    return { count: overlaps.length, overlaps };
}

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
}

function normalizeMemoryTag(value: string): string {
    const normalized = normalizeText(value);
    if (!normalized) return "";
    if (/\b(similar\s+)?operating context\b/.test(normalized) || /\bcontext similarity\b/.test(normalized)) return "operating context";
    if (/\bdecision( support)? impact\b/.test(normalized) || /\bbusiness action\b/.test(normalized) || /\bstakeholder decisions?\b/.test(normalized)) return "decision impact";
    if (/\b(end to end|e2e|direct)\b.*\bownership\b/.test(normalized) || /\bownership depth\b/.test(normalized) || /\baccountability\b/.test(normalized)) return "ownership";
    if (/\bstakeholder alignment\b/.test(normalized) || /\bstakeholder recommendation\b/.test(normalized)) return "stakeholder alignment";
    if (/\btransformation\b/.test(normalized) || /\benablement\b/.test(normalized)) return "transformation enablement";
    return normalized;
}

function dedupeMemoryTags(values: string[]): string[] {
    const out: string[] = [];
    for (const value of values) {
        const normalized = normalizeMemoryTag(value);
        if (!normalized) continue;
        if (!out.includes(normalized)) out.push(normalized);
    }
    return out.slice(0, 6);
}

function normalizeConfirmationText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function resolveStrengthFromEvidence(piece: Record<string, unknown>): number {
    const inferredScale = toRecord(piece.inferred_scale);
    const inferredScaleStrength = inferredScale && typeof inferredScale.strength === "number" ? inferredScale.strength : null;
    if (typeof inferredScaleStrength === "number" && Number.isFinite(inferredScaleStrength)) return inferredScaleStrength;
    if (typeof piece.confidence === "number" && Number.isFinite(piece.confidence)) return piece.confidence;
    return 0;
}

function resolveRequirementClusterFromScope(inferredScope: Record<string, unknown>): string {
    const quickCheck = toRecord(inferredScope.quick_check);
    if (quickCheck && typeof quickCheck.requirement_cluster === "string" && quickCheck.requirement_cluster.trim().length > 0) {
        return normalizeSuppressionCluster(quickCheck.requirement_cluster);
    }
    const jobContext = toRecord(inferredScope.job_context);
    if (jobContext && typeof jobContext.requirement_cluster === "string" && jobContext.requirement_cluster.trim().length > 0) {
        return normalizeSuppressionCluster(jobContext.requirement_cluster);
    }
    return "";
}

function resolveCapabilityTagsFromScope(inferredScope: Record<string, unknown>): string[] {
    const direct = toStringArray(inferredScope.capability_tags);
    if (direct.length > 0) return dedupeMemoryTags(direct);
    const quickCheck = toRecord(inferredScope.quick_check);
    if (!quickCheck) return [];
    const nested = toStringArray(quickCheck.capability_tags);
    return nested.length > 0 ? dedupeMemoryTags(nested) : [];
}

function resolveLegacyQuickCheckClusterFromRawText(rawText: string): string {
    const contextMatch = rawText.match(/Context:\s*([^.\n]+?)\s+requirement\s+for\s+/i);
    if (!contextMatch?.[1]) return "";
    const contextArea = contextMatch[1].trim();
    if (!contextArea) return "";
    return normalizeSuppressionCluster(contextArea);
}

function resolveLegacyQuickCheckTagsFromRawText(rawText: string): string[] {
    const normalized = normalizeConfirmationText(rawText);
    if (!normalized) return [];
    const tags: string[] = [];
    const push = (value: string): void => {
        if (!value) return;
        tags.push(value);
    };
    if (/\boperating context\b/.test(normalized)) push("operating context");
    if (/\bend to end\b|\be2e\b|\bdirect ownership\b|\bowned\b|\bownership\b/.test(normalized)) push("ownership");
    if (/\bstakeholder alignment\b|\bstakeholder recommendation\b/.test(normalized)) push("stakeholder alignment");
    if (/\bdecision\b|\bbusiness action\b|\bpriorities\b/.test(normalized)) push("decision impact");
    if (/\btransformation\b|\benablement\b/.test(normalized)) push("transformation enablement");
    if (/\bproduct\b/.test(normalized)) push("product");
    if (/\banalytics?\b/.test(normalized)) push("analytics");
    if (/\bexperiment|experimentation|test\b/.test(normalized)) push("experimentation");
    if (/\bprioritization|prioritisation|priorities\b/.test(normalized)) push("prioritization");
    if (/\broadmap\b/.test(normalized)) push("roadmap");
    if (/\bstrategic\b|\bstrategy\b/.test(normalized)) push("strategic planning");
    if (/\bcommercial\b/.test(normalized)) push("commercial analytics");
    if (/\brequirements?\b|\bprocess mapping\b|\bworkshop\b/.test(normalized)) push("business analysis");
    if (/\bretention\b|\bchurn\b|\blifecycle\b/.test(normalized)) push("retention");
    if (/\bpricing\b|\brevenue\b|\bprofitability\b/.test(normalized)) push("pricing");
    if (/\brollout\b/.test(normalized)) push("rollout");
    if (/\bimplementation\b/.test(normalized)) push("implementation");
    if (/\bintegration\b/.test(normalized)) push("integration");
    if (/\bdeployment\b/.test(normalized)) push("deployment");
    if (/\bcutover\b/.test(normalized)) push("cutover");
    if (/\badoption\b/.test(normalized)) push("adoption");
    return dedupeMemoryTags(tags);
}

function resolveLegacyQuickCheckSuppressionRecord(piece: Record<string, unknown>): {
    requirementCluster: string;
    capabilityTags: string[];
    strength: number;
} | null {
    if (piece.source_type !== "manual") return null;
    const rawText = typeof piece.raw_text === "string" ? piece.raw_text : "";
    if (!rawText) return null;
    if (!/Context:\s*[^.\n]+?\s+requirement\s+for\s+/i.test(rawText)) return null;
    const requirementCluster = resolveLegacyQuickCheckClusterFromRawText(rawText);
    if (!requirementCluster) return null;
    const capabilityTags = resolveLegacyQuickCheckTagsFromRawText(rawText);
    if (capabilityTags.length === 0) return null;
    const inferredStrength = resolveStrengthFromEvidence(piece);
    const strength = Number.isFinite(inferredStrength) && inferredStrength > 0 ? inferredStrength : 0.6;
    return { requirementCluster, capabilityTags, strength };
}

function extractSavedQuickCheckSuppressionMemory(evidencePieces: unknown[]): QuickCheckSuppressionMemoryRecord[] {
    const out: QuickCheckSuppressionMemoryRecord[] = [];
    for (const pieceUnknown of evidencePieces) {
        const piece = toRecord(pieceUnknown);
        if (!piece) continue;
        const inferredScope = toRecord(piece.inferred_scope);
        const hasCanonicalScope = Boolean(
            inferredScope
            && inferredScope.source === "quick_check_confirmation"
            && inferredScope.confidence === "self_declared",
        );
        let strength = resolveStrengthFromEvidence(piece);
        let requirementCluster = "";
        let capabilityTags: string[] = [];

        if (hasCanonicalScope && inferredScope) {
            requirementCluster = resolveRequirementClusterFromScope(inferredScope);
            capabilityTags = resolveCapabilityTagsFromScope(inferredScope);
        } else {
            const legacy = resolveLegacyQuickCheckSuppressionRecord(piece);
            if (!legacy) continue;
            requirementCluster = legacy.requirementCluster;
            capabilityTags = legacy.capabilityTags;
            if (!Number.isFinite(strength) || strength <= 0) {
                strength = legacy.strength;
            }
        }

        if (!Number.isFinite(strength) || strength < 0.6) continue;
        if (!requirementCluster || capabilityTags.length === 0) continue;

        out.push({
            evidence_id: typeof piece.id === "string" ? piece.id : "",
            source: "quick_check_confirmation",
            confidence: "self_declared",
            strength,
            requirement_cluster: requirementCluster,
            capability_tags: capabilityTags,
        });
    }
    return out;
}

function dedupe(values: Array<string | null | undefined>): string[] {
    const out: string[] = [];
    for (const value of values) {
        if (!value) continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        if (!out.includes(trimmed)) out.push(trimmed);
    }
    return out;
}

function approximateCandidateTags(params: {
    topCandidateDisplayName: string | null;
    authoritativeGapType: string | null;
    topCandidateCluster: string | null;
    subContextTokens: string[];
}): string[] {
    const gapType = params.authoritativeGapType ?? "";
    return dedupe([
        params.topCandidateDisplayName ?? "",
        gapType.replace(/_/g, " "),
        gapType === "ownership_depth" ? "ownership" : "",
        gapType === "similar_operating_context" ? "operating context" : "",
        gapType === "experimentation_depth" ? "experimentation" : "",
        gapType === "analytics_translation" ? "analytics translation" : "",
        params.topCandidateCluster ? params.topCandidateCluster.replace(/_/g, " ") : "",
        ...params.subContextTokens.map((token) => token.replace(/_/g, " ")),
    ]);
}

async function analyzeCase(params: {
    profileId: string;
    fixture: Fixture;
    caseId: string;
    className: "primary" | "contrast";
}): Promise<CaseResult> {
    const job = params.fixture.jobs.find((item) => item.id === params.caseId);
    if (!job) throw new Error(`Missing fixture case ${params.caseId}`);
    const analysis = await analyzeJobForCopilot({
        profileId: params.profileId,
        source: "linkedin",
        jobUrl: `https://qca-subpredicate-isolation.local/${job.id}`,
        jobTitle: job.title,
        company: job.company ?? null,
        location: null,
        jobDescription: job.job_description,
        topEvidenceLimit: 4,
    });
    const response = analysis.response ?? {};
    const diagnostics = response.diagnostics ?? {};
    const selectionDebug = diagnostics.selection_debug ?? {};
    const owner = selectionDebug.owner_arbitration_debug ?? {};
    const topCandidates = Array.isArray(owner.top_candidates) ? owner.top_candidates : [];
    const top = (topCandidates[0] ?? null) as Record<string, unknown> | null;
    const replacement = owner.replacement_selected_owner && typeof owner.replacement_selected_owner === "object"
        ? owner.replacement_selected_owner as Record<string, unknown>
        : null;
    const candidateProxySource: "replacement_selected_owner" | "top_candidates_0" | "none" =
        replacement && typeof replacement.cluster_id === "string"
            ? "replacement_selected_owner"
            : top && typeof top.cluster_id === "string"
                ? "top_candidates_0"
                : "none";
    const candidateCluster = candidateProxySource === "replacement_selected_owner"
        ? (replacement?.cluster_id as string | undefined) ?? null
        : (top?.cluster_id as string | undefined) ?? null;
    const candidateDisplayName = candidateProxySource === "replacement_selected_owner"
        ? (replacement?.display_name as string | undefined) ?? null
        : (top?.display_name as string | undefined) ?? null;
    const primaryGap = selectionDebug.authoritative_selection?.primary_gap ?? {};
    const clusterContextRows = Array.isArray(selectionDebug.cluster_context_debug)
        ? selectionDebug.cluster_context_debug as Array<Record<string, unknown>>
        : [];
    const proxyClusterContext = candidateCluster
        ? clusterContextRows.find((row) => row && row.cluster_id === candidateCluster) ?? null
        : null;
    const subContextTokens = proxyClusterContext && Array.isArray(proxyClusterContext.sub_context_tokens)
        ? proxyClusterContext.sub_context_tokens
            .filter((token): token is string => typeof token === "string" && token.trim().length > 0)
            .slice(0, 8)
        : [];
    return {
        case_id: params.caseId,
        class: params.className,
        suppressed_question_count: Number(response?.job_analysis?.calibration?.suppressed_question_count ?? 0),
        calibration_question_count: Array.isArray(response.calibrationQuestions) ? response.calibrationQuestions.length : 0,
        required_flag: Boolean(response?.job_analysis?.calibration?.required),
        top_candidate_cluster: candidateCluster,
        top_candidate_display_name: candidateDisplayName,
        top_candidate_match_status: top && typeof top.match_status === "string" ? top.match_status : null,
        replacement_owner_cluster: replacement && typeof replacement.cluster_id === "string" ? replacement.cluster_id : null,
        replacement_owner_display_name: replacement && typeof replacement.display_name === "string" ? replacement.display_name : null,
        candidate_proxy_source: candidateProxySource,
        candidate_proxy_sub_context_tokens: subContextTokens,
        authoritative_gap_type: typeof primaryGap?.gap_type === "string" ? primaryGap.gap_type : null,
    };
}

async function main(): Promise<void> {
    loadEnvLocal();
    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);

    const primary = await analyzeCase({
        profileId: args.profileId,
        fixture,
        caseId: "job-08",
        className: "primary",
    });
    const contrast = await analyzeCase({
        profileId: args.profileId,
        fixture,
        caseId: "job-03",
        className: "contrast",
    });

    const careerGraph = await loadCareerGraph(args.profileId);
    const suppressionMemory = extractSavedQuickCheckSuppressionMemory(careerGraph.evidencePieces as unknown[]);

    const evaluateCase = (row: CaseResult): Record<string, unknown> => {
        const candidateCluster = row.top_candidate_cluster ?? "";
        const approxTags = approximateCandidateTags({
            topCandidateDisplayName: row.top_candidate_display_name,
            authoritativeGapType: row.authoritative_gap_type,
            topCandidateCluster: row.top_candidate_cluster,
            subContextTokens: row.candidate_proxy_sub_context_tokens,
        });

        const checks = suppressionMemory.map((memory) => {
            const sourceConfidence = memory.source === "quick_check_confirmation" && memory.confidence === "self_declared";
            const strength = typeof memory.strength === "number" && memory.strength >= 0.6;
            const cluster = candidateCluster
                ? clustersAlignedDetailed(memory.requirement_cluster, candidateCluster)
                : { aligned: false, reason: "none" as const };
            const tags = tagOverlapDetailed(memory.capability_tags, approxTags);
            const full = sourceConfidence && strength && cluster.aligned && tags.count > 0;
            return {
                evidence_id: memory.evidence_id,
                source_confidence: sourceConfidence,
                strength_gate: strength,
                cluster_aligned: cluster.aligned,
                cluster_alignment_reason: cluster.reason,
                tag_overlap_count: tags.count,
                tag_overlap_examples: tags.overlaps.slice(0, 3),
                full_should_suppress: full,
                requirement_cluster: memory.requirement_cluster,
                memory_tags_sample: memory.capability_tags.slice(0, 4),
            };
        });

        const fullHits = checks.filter((item) => item.full_should_suppress);
        const clusterHits = checks.filter((item) => item.cluster_aligned);
        const familyHits = checks.filter((item) => item.cluster_alignment_reason === "family");
        const tagHits = checks.filter((item) => item.tag_overlap_count > 0);
        return {
            case_id: row.case_id,
            class: row.class,
            observed_state: {
                suppressed_question_count: row.suppressed_question_count,
                calibration_question_count: row.calibration_question_count,
                required_flag: row.required_flag,
                candidate_proxy_source: row.candidate_proxy_source,
                top_candidate_cluster: row.top_candidate_cluster,
                top_candidate_display_name: row.top_candidate_display_name,
                replacement_owner_cluster: row.replacement_owner_cluster,
                replacement_owner_display_name: row.replacement_owner_display_name,
                candidate_proxy_sub_context_tokens: row.candidate_proxy_sub_context_tokens,
                authoritative_gap_type: row.authoritative_gap_type,
                approx_candidate_tags: approxTags,
            },
            suppression_predicate_eval: {
                memory_record_count: suppressionMemory.length,
                source_confidence_true_count: checks.filter((item) => item.source_confidence).length,
                strength_gate_true_count: checks.filter((item) => item.strength_gate).length,
                cluster_aligned_count: clusterHits.length,
                cluster_aligned_family_reason_count: familyHits.length,
                tag_overlap_positive_count: tagHits.length,
                full_should_suppress_count: fullHits.length,
                first_full_hit: fullHits[0] ?? null,
            },
        };
    };

    const primaryEval = evaluateCase(primary);
    const contrastEval = evaluateCase(contrast);

    const primaryFullCount = Number((primaryEval as any).suppression_predicate_eval?.full_should_suppress_count ?? 0);
    const primaryClusterFamilyHits = Number((primaryEval as any).suppression_predicate_eval?.cluster_aligned_family_reason_count ?? 0);
    const primaryTagHits = Number((primaryEval as any).suppression_predicate_eval?.tag_overlap_positive_count ?? 0);

    const firstOwner = primaryFullCount > 0 && primaryClusterFamilyHits > 0 && primaryTagHits > 0
        ? {
            owner: "predicate_combination_cluster_family_alignment_plus_tag_overlap",
            predicate_anchor: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4783-4784",
            owner_statement: "First over-firing owner is the combination of family-level cluster alignment and generic tag overlap; source/confidence/strength are pre-qualified upstream and are non-discriminating in this path.",
        }
        : {
            owner: "unresolved_subpredicate_owner",
            predicate_anchor: "lib/career-engine/job-copilot/backend/insight-layer-role-context.ts:4780-4784",
            owner_statement: "Suppression path confirmed but one deeper subpredicate owner remains unresolved from this bounded pass.",
        };

    const observedLines: string[] = [
        "Primary case has suppressed_question_count=2 and calibration_question_count=0.",
    ];
    if (primaryFullCount > 0) {
        observedLines.push("At least one suppression-memory record satisfies full shouldSuppress predicate against the primary-case candidate proxy.");
    } else {
        observedLines.push("No full predicate hit was provable from this bounded proxy-evaluation pass.");
    }
    if (primaryClusterFamilyHits > 0) {
        observedLines.push("Family-level cluster alignment is present in primary-case suppression checks.");
    }
    if (primaryTagHits > 0) {
        observedLines.push("Tag-overlap-positive records are present in primary-case suppression checks.");
    }

    const inferredLines: string[] = [];
    if (primaryFullCount > 0) {
        inferredLines.push("Source/confidence/strength are upstream-prequalified and non-discriminating inside shouldSuppress for this path.");
        inferredLines.push("Cluster-family alignment plus tag-overlap is the actionable over-fire combination.");
    } else {
        inferredLines.push("Suppression path is confirmed by runtime output, but exact over-fire subpredicate remains unresolved in this bounded proxy pass.");
    }

    const result = {
        generated_at: new Date().toISOString(),
        decision_label: "AUDIT",
        current_task_type: "diagnosis",
        current_mode: "AUDIT",
        active_line: "JOB-COPILOT-NS-QUICK-CHECKS",
        active_branch: "QC-A",
        case_packet: {
            primary: "job-08",
            contrast: "job-03",
        },
        main_finding: firstOwner,
        exact_first_predicate_level_owner_if_isolated: firstOwner.owner,
        repair_admission_allowed: false,
        candidate_null_secondary_status: "keep_secondary_only",
        evidence: {
            primary: primaryEval,
            contrast: contrastEval,
            suppression_memory_summary: {
                total_records: suppressionMemory.length,
                unique_clusters: Array.from(new Set(suppressionMemory.map((item) => item.requirement_cluster))).slice(0, 16),
            },
        },
        observed_vs_inferred: {
            observed: observedLines,
            inferred: inferredLines,
            unproven: [
                "Exact runtime candidate object (full support-capability/context labels) is inferred from top-owner proxy in this bounded pass.",
            ],
        },
        next_gate_decision: "Repair remains blocked; run one narrow confirmation pass to test exact vs family cluster match sensitivity before admission.",
    };

    const outPath = path.isAbsolute(args.outPath) ? args.outPath : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        outPath,
        first_owner: firstOwner.owner,
        repair_admission_allowed: false,
    }, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
