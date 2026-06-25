import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { generateResumeCopilot } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-service";
import type { TailoringPlan, TailoringPlanSelectedEvidenceItem } from "@/lib/career-engine/copilot/resume-copilot/resume-tailoring-plan";
import { getCapabilityMatchV2, type CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import { loadCareerGraph, type EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";
import type { ConfirmationRescoreBridge } from "@/lib/career-engine/job-copilot/strong-match-escalation";

type FixtureJob = {
    id: string;
    title: string;
    company?: string | null;
    job_description: string;
};

type Fixture = {
    version: string;
    jobs: FixtureJob[];
};

type ScriptArgs = {
    profileId: string;
    fixturePath: string;
    caseIds: string[];
    outPath: string;
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

function parseArgs(): ScriptArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };

    const profileId = readArg("--profileId") ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53";
    const fixturePath = readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json";
    const caseIds = (readArg("--caseIds") ?? "job-06,job-04,job-05")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    const outPath = readArg("--out") ?? "artifacts/tailored-cv-behavior-audit-inputs.json";

    return {
        profileId,
        fixturePath,
        caseIds,
        outPath,
    };
}

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath)
        ? fixturePath
        : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return createClient(url, key);
}

async function resolveCareerId(profileId: string): Promise<string> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from("careers")
        .select("id")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1);
    if (error || !data?.[0]?.id) {
        throw new Error(`Failed to resolve career for profile ${profileId}: ${error?.message ?? "not found"}`);
    }
    return data[0].id as string;
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function normalizeCapabilityKey(value: string): string {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function clampPercentage(score: number): number {
    return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

function importanceWeight(importance: "critical" | "important" | "supporting"): number {
    if (importance === "critical") return 1.15;
    if (importance === "important") return 1;
    return 0.8;
}

function resolveEvidenceStrength(piece: EvidencePiece): number {
    const inferredScale = toObjectRecord(piece.inferred_scale);
    const inferredStrength = inferredScale && typeof inferredScale.strength === "number"
        ? inferredScale.strength
        : null;
    if (typeof inferredStrength === "number" && Number.isFinite(inferredStrength)) {
        return Math.max(0, Math.min(1, inferredStrength));
    }
    if (typeof piece.confidence === "number" && Number.isFinite(piece.confidence)) {
        return Math.max(0, Math.min(1, piece.confidence));
    }
    return 0.5;
}

function resolveConfirmedFromEvidence(piece: EvidencePiece): boolean {
    const inferredScope = toObjectRecord(piece.inferred_scope);
    if (!inferredScope) return false;
    if (inferredScope.source === "quick_check_confirmation") return true;
    const quickCheck = toObjectRecord(inferredScope.quick_check);
    return Boolean(quickCheck?.question_id);
}

function toOwnershipLevel(params: {
    ownershipConfirmation: boolean;
    signalOwnershipLevels: Array<string | null>;
    confirmed: boolean;
}): "owned" | "led" | "contributed" {
    const normalized = params.signalOwnershipLevels
        .map((value) => (value ?? "").toLowerCase().trim())
        .filter(Boolean);
    if (params.confirmed && params.ownershipConfirmation) return "owned";
    if (normalized.some((value) => value === "owner" || value === "lead")) return "owned";
    if (normalized.some((value) => value === "driver")) return "led";
    return "contributed";
}

async function ensureDebugJob(params: {
    fixtureJob: FixtureJob;
}): Promise<string> {
    const supabase = getSupabaseClient();
    const externalSource = "debug_tailored_cv_behavior_audit";
    const externalId = `fixture:${params.fixtureJob.id}`;
    const { data: upserted, error: upsertError } = await supabase
        .from("jobs")
        .upsert(
            {
                external_source: externalSource,
                external_id: externalId,
                title: params.fixtureJob.title,
                company: params.fixtureJob.company ?? "Validation Fixture",
                location: null,
                description: params.fixtureJob.job_description,
                job_url: null,
            },
            { onConflict: "external_source,external_id" },
        )
        .select("id")
        .limit(1);
    if (upsertError || !upserted?.[0]?.id) {
        throw new Error(`Failed to upsert debug job ${params.fixtureJob.id}: ${upsertError?.message ?? "missing id"}`);
    }
    const jobId = upserted[0].id as string;

    const signals = buildJobSignalsFromRawJd({
        rawJd: params.fixtureJob.job_description,
        fallbackTitle: params.fixtureJob.title,
    });
    const { error: signalError } = await supabase
        .from("job_signals")
        .upsert(
            {
                job_id: jobId,
                target_title: signals.target_title,
                role_family: signals.role_family,
                seniority: signals.seniority,
                required_skills: signals.required_skills,
                preferred_skills: signals.preferred_skills,
                responsibilities: signals.responsibilities,
                domains: signals.domains,
                keywords: signals.keywords,
            },
            { onConflict: "job_id" },
        );
    if (signalError) {
        throw new Error(`Failed to upsert job_signals for ${params.fixtureJob.id}: ${signalError.message}`);
    }
    return jobId;
}

function buildTailoringPlan(params: {
    jobId: string;
    capabilityMatch: CapabilityMatchV2Result;
    careerGraph: Awaited<ReturnType<typeof loadCareerGraph>>;
    confirmationBridge: ConfirmationRescoreBridge;
    confirmedStrengthAreas: string[];
    positioningHints: string[];
    maxExperiences?: number;
    maxBulletsPerExperience?: number;
}): TailoringPlan {
    const maxExperiences = Math.max(1, Math.min(6, params.maxExperiences ?? 3));
    const maxBulletsPerExperience = Math.max(1, Math.min(5, params.maxBulletsPerExperience ?? 3));
    const maxSelected = maxExperiences * maxBulletsPerExperience;
    const evidenceById = new Map(
        params.careerGraph.evidencePieces.map((piece) => [piece.id, piece]),
    );
    const experienceOrder = new Map<string, number>();
    params.careerGraph.experiences.forEach((experience, index) => {
        experienceOrder.set(experience.id, experience.sort_order ?? index);
    });
    const resolvedClusterSet = new Set(params.confirmationBridge.resolved_cluster_ids);
    const globalEmphasis = Array.from(new Set([
        ...params.confirmedStrengthAreas.map((value) => normalizeCapabilityKey(value)),
        ...params.positioningHints.map((value) => normalizeCapabilityKey(value)),
    ])).slice(0, 6);

    const capabilityImportanceByName = new Map<string, "critical" | "important" | "supporting">();
    for (const item of [
        ...params.capabilityMatch.matched_strengths,
        ...params.capabilityMatch.partial_matches,
        ...params.capabilityMatch.gaps,
    ]) {
        capabilityImportanceByName.set(normalizeCapabilityKey(item.display_name), item.importance);
        capabilityImportanceByName.set(normalizeCapabilityKey(item.canonical_name), item.importance);
    }

    const capabilityRanking = params.capabilityMatch.candidate_capability_profile
        .map((item) => ({
            capability_id: item.capability_id,
            importance: capabilityImportanceByName.get(normalizeCapabilityKey(item.display_name)) ?? "supporting",
            score: clampPercentage(item.strength_score * 100),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 24);

    const candidateByEvidenceId = new Map<string, {
        evidence_id: string;
        matched_capabilities: Set<string>;
        relevance_score: number;
        confirmed: boolean;
        emphasis_tags: Set<string>;
        matched_cluster_ids: Set<string>;
    }>();
    const sortedBreakdowns = [...params.capabilityMatch.audit.requirement_to_candidate_match_breakdown]
        .sort((left, right) => {
            const leftWeight = importanceWeight(left.importance) * left.final_cluster_score;
            const rightWeight = importanceWeight(right.importance) * right.final_cluster_score;
            if (rightWeight !== leftWeight) return rightWeight - leftWeight;
            return left.cluster_id.localeCompare(right.cluster_id);
        });

    for (const breakdown of sortedBreakdowns) {
        const weightedRelevance = clampPercentage(
            breakdown.final_cluster_score * 100 * importanceWeight(breakdown.importance),
        );
        const clusterConfirmed = resolvedClusterSet.has(breakdown.cluster_id);
        for (const evidenceId of breakdown.supporting_evidence_piece_ids) {
            if (!evidenceById.has(evidenceId)) continue;
            const existing = candidateByEvidenceId.get(evidenceId) ?? {
                evidence_id: evidenceId,
                matched_capabilities: new Set<string>(),
                relevance_score: 0,
                confirmed: false,
                emphasis_tags: new Set<string>(),
                matched_cluster_ids: new Set<string>(),
            };
            existing.relevance_score = Math.max(existing.relevance_score, weightedRelevance);
            existing.confirmed = existing.confirmed || clusterConfirmed;
            existing.matched_cluster_ids.add(breakdown.cluster_id);
            for (const capability of breakdown.supporting_capabilities) {
                existing.matched_capabilities.add(capability);
            }
            existing.emphasis_tags.add(breakdown.cluster_id.replace(/_/g, " "));
            for (const pattern of breakdown.supporting_patterns.slice(0, 2)) {
                existing.emphasis_tags.add(pattern);
            }
            candidateByEvidenceId.set(evidenceId, existing);
        }
    }

    if (candidateByEvidenceId.size === 0) {
        for (const item of params.capabilityMatch.matched_strengths) {
            for (const signal of item.top_supporting_signals) {
                if (!evidenceById.has(signal.evidence_piece_id)) continue;
                const existing = candidateByEvidenceId.get(signal.evidence_piece_id) ?? {
                    evidence_id: signal.evidence_piece_id,
                    matched_capabilities: new Set<string>(),
                    relevance_score: 0,
                    confirmed: false,
                    emphasis_tags: new Set<string>(),
                    matched_cluster_ids: new Set<string>(),
                };
                existing.relevance_score = Math.max(existing.relevance_score, clampPercentage(item.match_score_contribution * 100));
                existing.matched_capabilities.add(item.display_name);
                existing.emphasis_tags.add(item.display_name.toLowerCase());
                candidateByEvidenceId.set(signal.evidence_piece_id, existing);
            }
        }
    }

    const selectedByLimits: TailoringPlanSelectedEvidenceItem[] = [];
    const seenExperiences = new Set<string>();
    const bulletsPerExperience = new Map<string, number>();
    const orderedCandidates = Array.from(candidateByEvidenceId.values())
        .sort((left, right) => {
            if (right.relevance_score !== left.relevance_score) {
                return right.relevance_score - left.relevance_score;
            }
            const leftEvidence = evidenceById.get(left.evidence_id);
            const rightEvidence = evidenceById.get(right.evidence_id);
            const leftExpOrder = leftEvidence ? (experienceOrder.get(leftEvidence.experience_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
            const rightExpOrder = rightEvidence ? (experienceOrder.get(rightEvidence.experience_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
            if (leftExpOrder !== rightExpOrder) return leftExpOrder - rightExpOrder;
            return left.evidence_id.localeCompare(right.evidence_id);
        });

    for (const candidate of orderedCandidates) {
        if (selectedByLimits.length >= maxSelected) break;
        const evidence = evidenceById.get(candidate.evidence_id);
        if (!evidence) continue;

        const experienceId = evidence.experience_id;
        if (!seenExperiences.has(experienceId) && seenExperiences.size >= maxExperiences) continue;
        const experienceCount = bulletsPerExperience.get(experienceId) ?? 0;
        if (experienceCount >= maxBulletsPerExperience) continue;

        seenExperiences.add(experienceId);
        bulletsPerExperience.set(experienceId, experienceCount + 1);
        const signalOwnership = (params.careerGraph.signalsByEvidencePiece?.[evidence.id] ?? [])
            .map((signal) => signal.ownership_level);
        const confirmedFromEvidence = resolveConfirmedFromEvidence(evidence);
        const confirmed = candidate.confirmed || confirmedFromEvidence;
        const ownershipLevel = toOwnershipLevel({
            ownershipConfirmation: params.confirmationBridge.ownership_confirmation,
            signalOwnershipLevels: signalOwnership,
            confirmed,
        });
        const emphasisTags = Array.from(new Set([
            ...candidate.emphasis_tags,
            ...globalEmphasis,
        ]))
            .filter(Boolean)
            .slice(0, 6);
        selectedByLimits.push({
            evidence_id: candidate.evidence_id,
            matched_capabilities: Array.from(candidate.matched_capabilities).slice(0, 6),
            relevance_score: clampPercentage(candidate.relevance_score),
            strength: resolveEvidenceStrength(evidence),
            confirmed,
            ownership_level: ownershipLevel,
            emphasis_tags: emphasisTags,
        });
    }

    return {
        job_id: params.jobId,
        requirement_clusters: params.capabilityMatch.audit.requirement_clusters.map((cluster) => {
            const breakdown = params.capabilityMatch.audit.requirement_to_candidate_match_breakdown
                .find((item) => item.cluster_id === cluster.cluster_id);
            return {
                cluster_id: cluster.cluster_id,
                display_name: cluster.display_name,
                importance: cluster.importance,
                optionality: cluster.optionality,
                reasoning: breakdown?.reasoning,
            };
        }),
        capability_ranking: capabilityRanking,
        selected_evidence: selectedByLimits,
        limits: {
            max_experiences: maxExperiences,
            max_bullets_per_experience: maxBulletsPerExperience,
        },
    };
}

async function run(): Promise<void> {
    loadEnvLocal();
    process.env.ENABLE_RESUME_TAILORING_CANONICAL_ONLY = "1";

    const args = parseArgs();
    const fixture = readFixture(args.fixturePath);
    const selected = fixture.jobs.filter((job) => args.caseIds.includes(job.id));
    if (selected.length !== args.caseIds.length) {
        throw new Error(`Expected cases [${args.caseIds.join(", ")}], found [${selected.map((job) => job.id).join(", ")}]`);
    }

    const careerId = await resolveCareerId(args.profileId);
    const cases: Array<Record<string, unknown>> = [];
    const careerGraph = await loadCareerGraph(args.profileId);
    const noConfirmationBridge: ConfirmationRescoreBridge = {
        resolved_cluster_ids: [],
        resolved_critical_cluster_ids: [],
        ownership_confirmation: false,
        decision_impact_confirmation: false,
        measurement_confirmation: false,
        capability_score_boost: 0,
        evidence_score_boost: 0,
        requirement_overlap_credit: 0,
        matched_signal_credit: 0,
        specialization_confirmation: false,
    };

    for (const fixtureJob of selected) {
        const jobId = await ensureDebugJob({ fixtureJob });

        const capabilityMatch = await getCapabilityMatchV2({
            careerId,
            profileId: args.profileId,
            jobDescription: fixtureJob.job_description,
            jobTitleHint: fixtureJob.title,
            topSignalsLimit: 4,
        });
        const plan = buildTailoringPlan({
            jobId,
            capabilityMatch,
            careerGraph,
            confirmationBridge: noConfirmationBridge,
            confirmedStrengthAreas: [],
            positioningHints: [],
        });
        const rendered = await generateResumeCopilot({
            profileId: args.profileId,
            jobId,
            tailoringPlan: plan,
            options: {
                includeDebug: true,
                overallMatchScore: capabilityMatch.overall_match_score,
            },
        });

        cases.push({
            fixture_job_id: fixtureJob.id,
            job_id: jobId,
            job_title: fixtureJob.title,
            job_description: fixtureJob.job_description,
            match_score: Number((capabilityMatch.overall_match_score * 100).toFixed(2)),
            selected_evidence_ids: plan.selected_evidence.map((item) => item.evidence_id),
            tailoring_plan: plan,
            generated_resume: rendered.resume,
            resume_debug: rendered.debug ?? null,
        });
    }

    const absoluteOut = path.isAbsolute(args.outPath)
        ? args.outPath
        : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
    fs.writeFileSync(
        absoluteOut,
        `${JSON.stringify({
            generated_at: new Date().toISOString(),
            profile_id: args.profileId,
            career_id: careerId,
            fixture_version: fixture.version,
            case_ids: args.caseIds,
            cases,
        }, null, 2)}\n`,
        "utf8",
    );

    console.log(absoluteOut);
}

run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
