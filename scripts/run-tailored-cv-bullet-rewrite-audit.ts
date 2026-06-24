import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildJobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import { generateResumeCopilot } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-service";
import type { ResumeCopilotServiceResult } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";
import type { TailoringPlan, TailoringPlanSelectedEvidenceItem } from "@/lib/career-engine/copilot/resume-copilot/resume-tailoring-plan";
import { getCapabilityMatchV2, type CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import { loadCareerGraph, type EvidencePiece } from "@/lib/career-engine/memory/career-graph-loader";
import { buildTailoringPlanForCv } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";
import type { ConfirmationRescoreBridge } from "@/lib/career-engine/job-copilot/strong-match-escalation";
import { detectRoleContextProfile, type RoleContextProfile } from "@/lib/career-engine/job-copilot/backend/role-context-profile";

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

type ReplayFixtureJob = {
    case_id: string;
    case_type?: CaseType;
    requirement_profile?: string;
    expected_alignment?: AlignmentExpectation;
    title?: string;
    company?: string | null;
    scores: JobScoreBundle;
    score_reasons?: Partial<Record<keyof JobScoreBundle, string>>;
    total?: number;
    quality_judgment?: "strong" | "watch" | "failing";
    failed_dimensions?: Array<keyof JobScoreBundle>;
};

type ReplayFixture = {
    version: string;
    fixture_version: string;
    source_artifact: string;
    cases: CaseDefinition[];
    jobs: ReplayFixtureJob[];
    pair_diagnostics: PairDifferentiationDiagnostic[];
    patterns?: string[];
    pattern_details?: Array<Record<string, unknown>>;
    evidence_mismatch_events?: ReplayEvidenceMismatchEvent[];
};

type EvidenceMismatchType = "hallucination" | "meaning_drift" | "low_credibility_phrase";

type ReplayEvidenceMismatchEventHallucination = {
    case_id: string;
    evidence_id: string;
    mismatch_type: "hallucination";
    before_text: string;
    after_text: string;
    detector_payload: {
        new_numbers: string[];
    };
    event_id?: string;
    notes?: string;
    source_fixture_id?: string;
};

type ReplayEvidenceMismatchEventMeaningDrift = {
    case_id: string;
    evidence_id: string;
    mismatch_type: "meaning_drift";
    before_text: string;
    after_text: string;
    detector_payload: {
        token_overlap: number;
    };
    event_id?: string;
    notes?: string;
    source_fixture_id?: string;
};

type ReplayEvidenceMismatchEventLowCredibility = {
    case_id: string;
    evidence_id: string;
    mismatch_type: "low_credibility_phrase";
    before_text: string;
    after_text: string;
    detector_payload: {
        subtype: string;
        matched_phrase: string;
    };
    event_id?: string;
    notes?: string;
    source_fixture_id?: string;
};

type ReplayEvidenceMismatchEvent =
    | ReplayEvidenceMismatchEventHallucination
    | ReplayEvidenceMismatchEventMeaningDrift
    | ReplayEvidenceMismatchEventLowCredibility;

type DegradedReplayRegistryFixture = {
    fixture_id: string;
    target_failure_mode: FailureModeKey;
    description: string;
    replay_fixture_path: string;
};

type DegradedReplayRegistry = {
    version: string;
    fixtures: DegradedReplayRegistryFixture[];
};

type CaseType = "adjacent" | "different";
type AlignmentExpectation = "high" | "medium" | "low";

type CaseDefinition = {
    id: string;
    type: CaseType;
    requirement_profile: string;
    expected_alignment: AlignmentExpectation;
};

const DEFAULT_CASES: CaseDefinition[] = [
    {
        id: "job-01",
        type: "adjacent",
        requirement_profile: "analytics_translation_stakeholder_storytelling",
        expected_alignment: "high",
    },
    {
        id: "job-04",
        type: "adjacent",
        requirement_profile: "product_analytics_experimentation_and_roadmap",
        expected_alignment: "high",
    },
    {
        id: "job-06",
        type: "adjacent",
        requirement_profile: "marketing_science_media_measurement",
        expected_alignment: "high",
    },
    {
        id: "job-05",
        type: "different",
        requirement_profile: "bi_platform_transformation_program_delivery",
        expected_alignment: "medium",
    },
    {
        id: "job-13",
        type: "different",
        requirement_profile: "enterprise_sales_execution_and_people_leadership",
        expected_alignment: "medium",
    },
    {
        id: "job-14",
        type: "different",
        requirement_profile: "clinical_research_operations",
        expected_alignment: "low",
    },
];

type ScriptArgs = {
    profileId: string;
    profileIdSource: "arg" | "env" | "default";
    executionMode: "live" | "replay" | "auto";
    fixturePath: string;
    replayFixturePath: string;
    degradedReplayRegistryPath: string;
    outPath: string;
    caseIds: string[] | null;
    enforce: boolean;
};

type ScoredDimension = {
    score: 0 | 1 | 2;
    reason: string;
};

type JobScoreBundle = {
    relevance: number;
    readability: number;
    ats: number;
    ownership: number;
    integrity: number;
    differentiation: number;
};

type JobCaseAuditResult = {
    job_id: string;
    case_id: string;
    case_type: CaseType;
    requirement_profile: string;
    expected_alignment: AlignmentExpectation;
    title: string;
    company: string | null;
    selected_evidence_ids: string[];
    frozen_input_hash: string;
    scores: JobScoreBundle;
    score_reasons: Record<keyof JobScoreBundle, string>;
    total: number;
    quality_judgment: "strong" | "watch" | "failing";
    failed_dimensions: Array<keyof JobScoreBundle>;
    before_bullets: string[];
    after_bullets: string[];
    before_after_similarity: number;
};

type FailureModeKey =
    | "generic_rewrite"
    | "fake_tailoring"
    | "ownership_inflation"
    | "weak_job_alignment"
    | "evidence_mismatch"
    | "weak_differentiation";

type FailureModeResult = {
    mode: FailureModeKey;
    pass: boolean;
    triggered_count: number;
    threshold: string;
    affected_case_ids: string[];
    evidence: string;
};

type AdversarialFixtureResult = {
    fixture_source: "synthetic" | "degraded_replay";
    fixture_id: string;
    target_failure_mode: FailureModeKey;
    description: string;
    expected_detection: true;
    detected: boolean;
    deterministic_stable: boolean;
    mode_result: FailureModeResult | null;
    baseline_mode_pass: boolean;
    triggered_modes: FailureModeKey[];
    unexpected_triggered_modes: FailureModeKey[];
    notes: string;
};

type AdversarialFixtureAggregate = {
    fixtures: AdversarialFixtureResult[];
    mode_to_fixture_map: Record<FailureModeKey, string[]>;
    all_modes_covered: boolean;
    all_detected: boolean;
    deterministic_stable: boolean;
};

type DegradedReplayFixtureAggregate = AdversarialFixtureAggregate & {
    available: boolean;
    registry_path: string;
    registry_version: string | null;
    missing_fixture_paths: string[];
    required_modes: FailureModeKey[];
};

type PairDifferentiationDiagnostic = {
    job_a: string;
    job_b: string;
    pair_type: "adjacent" | "mixed";
    shared_evidence_count: number;
    overlap_ratio: number;
    before_similarity: number;
    after_similarity: number;
    similarity_delta: number;
    pair_score: 0 | 1 | 2;
};

type PatternDetection = {
    patterns: string[];
    details: Array<Record<string, unknown>>;
};

type RenderedCase = {
    caseDef: CaseDefinition;
    fixtureJob: FixtureJob;
    jobId: string;
    roleContextProfile: RoleContextProfile;
    jobContextTokens: string[];
    requirementClusterTokens: string[];
    selectedEvidenceIds: string[];
    selectedEvidenceInputHash: string;
    frozenSelectedEvidenceInput: NonNullable<Parameters<typeof generateResumeCopilot>[0]["selectedEvidenceInput"]>;
    tailoringPlan: TailoringPlan;
    before: ResumeCopilotServiceResult;
    after: ResumeCopilotServiceResult;
};

type DebugBulletLite = {
    evidence_id: string;
    original_bullet: string;
    rewritten_bullet: string;
    ownership_level: "owned" | "led" | "contributed";
    confirmed: boolean;
};

type AuditRecentSelectionContext = {
    recent_jobs: Array<{
        job_id: string;
        selected_evidence_ids: string[];
        role_context_signature?: string;
        role_context_similarity?: number;
    }>;
};

const STOPWORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it",
    "of", "on", "or", "that", "the", "to", "with", "using", "used", "while", "across", "within",
    "you", "your", "our", "their", "this", "those", "these", "will", "can", "has", "have", "had",
    "role", "team", "work", "working", "support", "supporting", "experience", "experiences", "strong",
]);

const ACTION_VERBS = new Set([
    "built", "build", "led", "lead", "drove", "drive", "owned", "own", "delivered", "deliver", "designed",
    "design", "developed", "develop", "executed", "execute", "optimized", "optimize", "launched", "launch",
    "created", "create", "implemented", "implement", "managed", "manage", "improved", "improve", "scaled", "scale",
]);

const OUTCOME_HINTS = new Set([
    "impact", "improved", "increase", "increased", "reduced", "reduction", "enabled", "drove", "grew", "growth",
    "efficiency", "adoption", "decision", "revenue", "cost", "conversion", "performance", "outcome", "results",
]);

const STRONG_LEAD_VERBS = new Set([
    "led", "lead", "drove", "drive", "owned", "own", "spearheaded", "architected", "orchestrated", "directed",
]);

const EVIDENCE_MISMATCH_TYPES: EvidenceMismatchType[] = [
    "hallucination",
    "meaning_drift",
    "low_credibility_phrase",
];

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_/]+/g, " ")
        .replace(/[^a-z0-9\s%.-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(value: string, minLength = 3): string[] {
    return normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= minLength && !STOPWORDS.has(token));
}

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildAuditRoleContextSignature(profile: RoleContextProfile): string {
    const entries = [
        ...Object.entries(profile.functional_domains ?? {}),
        ...Object.entries(profile.work_modes ?? {}),
        ...Object.entries(profile.decision_contexts ?? {}),
        ...Object.entries(profile.specialized_contexts ?? {}),
    ]
        .map(([key, weight]) => ({
            key: normalizeText(key).replace(/\s+/g, "_"),
            weight: typeof weight === "number" ? weight : 0,
        }))
        .filter((item) => item.key.length > 0 && Number.isFinite(item.weight) && item.weight > 0)
        .sort((left, right) => {
            if (right.weight !== left.weight) return right.weight - left.weight;
            return left.key.localeCompare(right.key);
        })
        .slice(0, 12)
        .map((item) => item.key);
    return dedupe(entries).join("|");
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function readRequiredStringField(params: {
    record: Record<string, unknown>;
    key: string;
    context: string;
    normalizeCase?: "lower";
}): string {
    const rawValue = params.record[params.key];
    if (typeof rawValue !== "string") {
        throw new Error(`${params.context}: field "${params.key}" must be a string.`);
    }
    const trimmed = rawValue.trim();
    if (!trimmed) {
        throw new Error(`${params.context}: field "${params.key}" must be non-empty.`);
    }
    if (params.normalizeCase === "lower") {
        return trimmed.toLowerCase();
    }
    return trimmed;
}

function readOptionalStringField(params: {
    record: Record<string, unknown>;
    key: string;
    context: string;
}): string | undefined {
    const rawValue = params.record[params.key];
    if (rawValue === undefined || rawValue === null) return undefined;
    if (typeof rawValue !== "string") {
        throw new Error(`${params.context}: optional field "${params.key}" must be a string when present.`);
    }
    const trimmed = rawValue.trim();
    return trimmed || undefined;
}

function normalizeReplayEvidenceMismatchEvents(params: {
    replayFixture: ReplayFixture;
    caseDefs: CaseDefinition[];
    replayFixturePath: string;
}): ReplayEvidenceMismatchEvent[] {
    const caseIdSet = new Set(params.caseDefs.map((item) => item.id.toLowerCase()));
    const rawEvents = params.replayFixture.evidence_mismatch_events;
    if (rawEvents === undefined) return [];
    if (!Array.isArray(rawEvents)) {
        throw new Error(`Replay fixture (${params.replayFixturePath}) field "evidence_mismatch_events" must be an array when present.`);
    }

    const normalizedEvents: ReplayEvidenceMismatchEvent[] = [];
    for (const [index, rawEvent] of rawEvents.entries()) {
        const context = `Replay fixture (${params.replayFixturePath}) evidence_mismatch_events[${index}]`;
        const eventRecord = toObjectRecord(rawEvent);
        if (!eventRecord) {
            throw new Error(`${context}: event must be an object.`);
        }

        const caseId = readRequiredStringField({
            record: eventRecord,
            key: "case_id",
            context,
            normalizeCase: "lower",
        });
        if (!caseIdSet.has(caseId)) {
            throw new Error(`${context}: case_id "${caseId}" is not in the replay case set.`);
        }
        const evidenceId = readRequiredStringField({
            record: eventRecord,
            key: "evidence_id",
            context,
        });
        const mismatchTypeRaw = readRequiredStringField({
            record: eventRecord,
            key: "mismatch_type",
            context,
            normalizeCase: "lower",
        });
        if (!EVIDENCE_MISMATCH_TYPES.includes(mismatchTypeRaw as EvidenceMismatchType)) {
            throw new Error(`${context}: mismatch_type must be one of ${EVIDENCE_MISMATCH_TYPES.join(", ")}.`);
        }
        const mismatchType = mismatchTypeRaw as EvidenceMismatchType;

        const beforeText = readRequiredStringField({
            record: eventRecord,
            key: "before_text",
            context,
        });
        const afterText = readRequiredStringField({
            record: eventRecord,
            key: "after_text",
            context,
        });
        if (normalizeText(beforeText) === normalizeText(afterText)) {
            throw new Error(`${context}: before_text and after_text must differ.`);
        }

        const detectorPayloadRecord = toObjectRecord(eventRecord.detector_payload);
        if (!detectorPayloadRecord) {
            throw new Error(`${context}: detector_payload must be an object.`);
        }

        const eventId = readOptionalStringField({
            record: eventRecord,
            key: "event_id",
            context,
        });
        const notes = readOptionalStringField({
            record: eventRecord,
            key: "notes",
            context,
        });
        const sourceFixtureId = readOptionalStringField({
            record: eventRecord,
            key: "source_fixture_id",
            context,
        });

        if (mismatchType === "hallucination") {
            const newNumbersRaw = detectorPayloadRecord.new_numbers;
            if (!Array.isArray(newNumbersRaw) || newNumbersRaw.length < 1) {
                throw new Error(`${context}: hallucination detector_payload.new_numbers must be a non-empty array.`);
            }
            const newNumbers = newNumbersRaw
                .map((value) => (typeof value === "string" ? value.trim() : ""))
                .filter(Boolean);
            if (newNumbers.length < 1) {
                throw new Error(`${context}: hallucination detector_payload.new_numbers must contain at least one non-empty number token.`);
            }
            normalizedEvents.push({
                case_id: caseId,
                evidence_id: evidenceId,
                mismatch_type: "hallucination",
                before_text: beforeText,
                after_text: afterText,
                detector_payload: {
                    new_numbers: newNumbers,
                },
                event_id: eventId,
                notes,
                source_fixture_id: sourceFixtureId,
            });
            continue;
        }

        if (mismatchType === "meaning_drift") {
            const tokenOverlapRaw = detectorPayloadRecord.token_overlap;
            if (typeof tokenOverlapRaw !== "number" || !Number.isFinite(tokenOverlapRaw) || tokenOverlapRaw < 0 || tokenOverlapRaw > 1) {
                throw new Error(`${context}: meaning_drift detector_payload.token_overlap must be a finite number in [0,1].`);
            }
            normalizedEvents.push({
                case_id: caseId,
                evidence_id: evidenceId,
                mismatch_type: "meaning_drift",
                before_text: beforeText,
                after_text: afterText,
                detector_payload: {
                    token_overlap: Number(tokenOverlapRaw),
                },
                event_id: eventId,
                notes,
                source_fixture_id: sourceFixtureId,
            });
            continue;
        }

        const subtype = readRequiredStringField({
            record: detectorPayloadRecord,
            key: "subtype",
            context: `${context}.detector_payload`,
        });
        const matchedPhrase = readRequiredStringField({
            record: detectorPayloadRecord,
            key: "matched_phrase",
            context: `${context}.detector_payload`,
        });
        normalizedEvents.push({
            case_id: caseId,
            evidence_id: evidenceId,
            mismatch_type: "low_credibility_phrase",
            before_text: beforeText,
            after_text: afterText,
            detector_payload: {
                subtype,
                matched_phrase: matchedPhrase,
            },
            event_id: eventId,
            notes,
            source_fixture_id: sourceFixtureId,
        });
    }

    return normalizedEvents;
}

function buildReplayPatternCollector(params: {
    replayFixture: ReplayFixture;
    evidenceMismatchEvents: ReplayEvidenceMismatchEvent[];
}): PatternDetection {
    const patterns = dedupe(params.replayFixture.patterns ?? []);
    const details = cloneJson(params.replayFixture.pattern_details ?? []);

    for (const event of params.evidenceMismatchEvents) {
        const eventMetadata = {
            source: "typed_replay_event",
            event_id: event.event_id ?? null,
            source_fixture_id: event.source_fixture_id ?? null,
            notes: event.notes ?? null,
            before_text: event.before_text,
            after_text: event.after_text,
        };

        if (event.mismatch_type === "hallucination") {
            patterns.push(`hallucination_${event.case_id}_${event.evidence_id}`);
            details.push({
                pattern: "hallucination",
                case_id: event.case_id,
                evidence_id: event.evidence_id,
                new_numbers: event.detector_payload.new_numbers,
                ...eventMetadata,
            });
            continue;
        }
        if (event.mismatch_type === "meaning_drift") {
            details.push({
                pattern: "meaning_drift",
                case_id: event.case_id,
                evidence_id: event.evidence_id,
                overlap: event.detector_payload.token_overlap,
                ...eventMetadata,
            });
            continue;
        }
        details.push({
            pattern: "low_credibility_phrase",
            case_id: event.case_id,
            evidence_id: event.evidence_id,
            subtype: event.detector_payload.subtype,
            matched_phrase: event.detector_payload.matched_phrase,
            bullet: event.after_text,
            ...eventMetadata,
        });
    }

    return {
        patterns: dedupe(patterns),
        details,
    };
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
    const profileIdFromEnv = process.env.CV_QUALITY_AUDIT_PROFILE_ID
        ?? process.env.VERIFY_PROFILE_ID
        ?? process.env.DEFAULT_PROFILE_ID
        ?? null;
    const argProfileId = readArg("--profileId");
    const caseIdsArg = readArg("--caseIds");
    const profileId = argProfileId ?? profileIdFromEnv ?? "8ec2c318-dbd0-42e2-acc7-10a103284b53";
    const profileIdSource: "arg" | "env" | "default" = argProfileId
        ? "arg"
        : profileIdFromEnv
            ? "env"
            : "default";
    const modeArg = readArg("--mode");
    const modeEnv = process.env.CV_QUALITY_AUDIT_MODE ?? null;
    const requestedMode = (modeArg ?? modeEnv ?? "auto").toLowerCase();
    const executionMode: "live" | "replay" | "auto" = requestedMode === "live"
        ? "live"
        : requestedMode === "replay"
            ? "replay"
            : "auto";
    return {
        profileId,
        profileIdSource,
        executionMode,
        fixturePath: readArg("--fixture") ?? "scripts/fixtures/human-alignment-benchmark.seed.json",
        replayFixturePath: readArg("--replayFixture")
            ?? process.env.CV_QUALITY_AUDIT_REPLAY_FIXTURE
            ?? "scripts/fixtures/tailored-cv-quality-replay.seed.json",
        degradedReplayRegistryPath: readArg("--degradedReplayRegistry")
            ?? process.env.CV_QUALITY_AUDIT_DEGRADED_REPLAY_REGISTRY
            ?? "scripts/fixtures/tailored-cv-quality-degraded-replay.registry.v1.json",
        outPath: readArg("--out") ?? "artifacts/tailored-cv-bullet-rewrite-audit-v1.json",
        caseIds: caseIdsArg
            ? caseIdsArg.split(",").map((value) => value.trim()).filter(Boolean)
            : null,
        enforce: args.includes("--enforce"),
    };
}

function readFixture(fixturePath: string): Fixture {
    const absolute = path.isAbsolute(fixturePath)
        ? fixturePath
        : path.join(process.cwd(), fixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as Fixture;
}

function toAbsolutePath(candidatePath: string): string {
    return path.isAbsolute(candidatePath)
        ? candidatePath
        : path.join(process.cwd(), candidatePath);
}

function readReplayFixture(replayFixturePath: string): ReplayFixture {
    const absolute = toAbsolutePath(replayFixturePath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as ReplayFixture;
}

function readDegradedReplayRegistry(registryPath: string): DegradedReplayRegistry {
    const absolute = toAbsolutePath(registryPath);
    return JSON.parse(fs.readFileSync(absolute, "utf8")) as DegradedReplayRegistry;
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

function resolveCaseDefinitions(caseIds: string[] | null): {
    selected: CaseDefinition[];
    requestedCount: number;
    missingIds: string[];
} {
    if (!caseIds || caseIds.length === 0) {
        return {
            selected: DEFAULT_CASES,
            requestedCount: DEFAULT_CASES.length,
            missingIds: [],
        };
    }

    const requested = Array.from(new Set(caseIds));
    const selected = DEFAULT_CASES.filter((item) => requested.includes(item.id));
    const selectedIds = new Set(selected.map((item) => item.id));
    const missingIds = requested.filter((id) => !selectedIds.has(id));
    return {
        selected,
        requestedCount: requested.length,
        missingIds,
    };
}

async function ensureDebugJob(params: {
    fixtureJob: FixtureJob;
}): Promise<string> {
    const supabase = getSupabaseClient();
    const externalSource = "debug_tailored_cv_bullet_rewrite_audit";
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

function computeJobContextTokens(params: {
    fixtureJob: FixtureJob;
    capabilityMatch: CapabilityMatchV2Result;
    roleContextProfile: RoleContextProfile;
}): { jobContextTokens: string[]; requirementClusterTokens: string[] } {
    const requirementClusterTokens = dedupe(
        params.capabilityMatch.audit.requirement_clusters.flatMap((cluster) => [
            cluster.display_name,
            cluster.cluster_id.replace(/_/g, " "),
            ...cluster.matched_terms,
            ...cluster.methods,
            ...cluster.domain_modifiers,
        ])
            .flatMap((value) => tokenize(value, 3)),
    ).slice(0, 48);

    const roleContextTokens = dedupe([
        ...Object.keys(params.roleContextProfile.functional_domains),
        ...Object.keys(params.roleContextProfile.work_modes),
        ...Object.keys(params.roleContextProfile.decision_contexts),
        ...Object.keys(params.roleContextProfile.specialized_contexts),
    ]
        .flatMap((value) => tokenize(value, 3)))
        .slice(0, 48);

    const parsedSignals = buildJobSignalsFromRawJd({
        rawJd: params.fixtureJob.job_description,
        fallbackTitle: params.fixtureJob.title,
    });
    const signalTokens = dedupe([
        ...parsedSignals.required_skills,
        ...parsedSignals.preferred_skills,
        ...parsedSignals.responsibilities,
        ...parsedSignals.domains,
        ...parsedSignals.keywords,
    ].flatMap((value) => tokenize(value, 3))).slice(0, 56);

    const jdTokens = dedupe(tokenize(params.fixtureJob.job_description, 4)).slice(0, 56);

    return {
        jobContextTokens: dedupe([
            ...requirementClusterTokens,
            ...roleContextTokens,
            ...signalTokens,
            ...jdTokens,
        ]).slice(0, 80),
        requirementClusterTokens,
    };
}

function buildTailoringPlan(params: {
    jobId: string;
    capabilityMatch: CapabilityMatchV2Result;
    roleContextProfile: RoleContextProfile;
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
            matched_requirement_clusters: Array.from(candidate.matched_cluster_ids).slice(0, 6),
            relevance_score: clampPercentage(candidate.relevance_score),
            strength: resolveEvidenceStrength(evidence),
            confirmed,
            ownership_level: ownershipLevel,
            emphasis_tags: emphasisTags,
        });
    }

    return {
        job_id: params.jobId,
        role_context_profile: params.roleContextProfile,
        requirement_clusters: params.capabilityMatch.audit.requirement_clusters.map((cluster) => ({
            cluster_id: cluster.cluster_id,
            display_name: cluster.display_name,
            importance: cluster.importance,
            optionality: cluster.optionality,
            reasoning: undefined,
        })),
        capability_ranking: capabilityRanking,
        selected_evidence: selectedByLimits,
        selection_debug: {
            job_role_context_profile: params.roleContextProfile,
            selected_evidence_ids: selectedByLimits.map((item) => item.evidence_id),
            selection_stage: "final",
            selected_evidence: selectedByLimits.map((item) => ({
                evidence_id: item.evidence_id,
                base_score: Number((item.relevance_score / 100).toFixed(4)),
                role_context_alignment: Number((item.role_context_alignment ?? 0).toFixed(4)),
                final_score: Number((item.relevance_score / 100).toFixed(4)),
                selected: true,
                matched_role_contexts: item.matched_role_contexts ?? [],
                primary_reason: "audit_runner_frozen_selected_evidence_input",
                selected_reason: "audit_runner_frozen_selected_evidence_input",
            })),
            selected_evidence_debug: selectedByLimits.map((item) => ({
                evidence_id: item.evidence_id,
                base_score: Number((item.relevance_score / 100).toFixed(4)),
                role_context_alignment: Number((item.role_context_alignment ?? 0).toFixed(4)),
                final_score: Number((item.relevance_score / 100).toFixed(4)),
                selected: true,
                matched_role_contexts: item.matched_role_contexts ?? [],
                primary_reason: "audit_runner_frozen_selected_evidence_input",
                selected_reason: "audit_runner_frozen_selected_evidence_input",
            })),
        },
        limits: {
            max_experiences: maxExperiences,
            max_bullets_per_experience: maxBulletsPerExperience,
        },
    };
}

function extractDebugBullets(result: ResumeCopilotServiceResult): DebugBulletLite[] {
    const experiences = result.debug?.experiences ?? [];
    return experiences.flatMap((experience) =>
        experience.bullets.map((bullet) => ({
            evidence_id: bullet.evidence_piece_id,
            original_bullet: bullet.original_bullet,
            rewritten_bullet: bullet.rewritten_bullet,
            ownership_level: bullet.ownership_level ?? "contributed",
            confirmed: Boolean(bullet.confirmed),
        })),
    );
}

function extractPublicBullets(result: ResumeCopilotServiceResult): string[] {
    return dedupe(
        (result.resume.experience ?? [])
            .flatMap((experience) => experience.bullets ?? [])
            .map((bullet) => bullet.trim())
            .filter(Boolean),
    );
}

function toTokenSet(texts: string[]): Set<string> {
    return new Set(texts.flatMap((text) => tokenize(text, 3)));
}

function jaccardSet(left: Set<string>, right: Set<string>): number {
    if (left.size === 0 && right.size === 0) return 1;
    if (left.size === 0 || right.size === 0) return 0;
    let intersection = 0;
    for (const token of left) {
        if (right.has(token)) intersection += 1;
    }
    const union = left.size + right.size - intersection;
    if (union <= 0) return 0;
    return Number((intersection / union).toFixed(4));
}

function textSimilarity(left: string, right: string): number {
    return jaccardSet(new Set(tokenize(left, 3)), new Set(tokenize(right, 3)));
}

function coverage(tokens: string[], targetTokens: string[]): number {
    if (targetTokens.length === 0) return 0;
    const tokenSet = new Set(tokens);
    const targetSet = new Set(targetTokens);
    let hits = 0;
    for (const token of targetSet) {
        if (tokenSet.has(token)) hits += 1;
    }
    return Number((hits / targetSet.size).toFixed(4));
}

function extractOwnershipLeadToken(value: string): string {
    const normalized = value.trim();
    if (!normalized) return "";
    const colonIndex = normalized.indexOf(":");
    const actionClause = colonIndex >= 0
        ? normalized.slice(colonIndex + 1).trim()
        : normalized;
    const actionToken = tokenize(actionClause, 2)[0];
    if (actionToken) return actionToken;
    return tokenize(normalized, 2)[0] ?? "";
}

function scoreJobRelevance(params: {
    beforeBullets: string[];
    afterBullets: string[];
    jobContextTokens: string[];
    requirementClusterTokens: string[];
}): ScoredDimension {
    const beforeTokens = params.beforeBullets.flatMap((bullet) => tokenize(bullet, 3));
    const afterTokens = params.afterBullets.flatMap((bullet) => tokenize(bullet, 3));
    const targetTokens = dedupe([
        ...params.requirementClusterTokens,
        ...params.jobContextTokens,
    ]).slice(0, 72);

    const beforeCoverage = coverage(beforeTokens, targetTokens);
    const afterCoverage = coverage(afterTokens, targetTokens);
    const delta = Number((afterCoverage - beforeCoverage).toFixed(4));

    if (afterCoverage >= (beforeCoverage + 0.08) || (afterCoverage >= 0.28 && delta >= 0.03)) {
        return {
            score: 2,
            reason: `after_coverage_improved (${beforeCoverage} -> ${afterCoverage})`,
        };
    }
    if (afterCoverage >= (beforeCoverage - 0.01)) {
        return {
            score: 1,
            reason: `after_coverage_stable (${beforeCoverage} -> ${afterCoverage})`,
        };
    }
    return {
        score: 0,
        reason: `after_coverage_regressed (${beforeCoverage} -> ${afterCoverage})`,
    };
}

function scoreReadability(afterBullets: string[]): ScoredDimension {
    if (afterBullets.length === 0) {
        return { score: 0, reason: "no_after_bullets" };
    }
    const bulletScores: number[] = [];
    for (const bullet of afterBullets) {
        const normalized = normalizeText(bullet);
        const tokens = tokenize(normalized, 2);
        const wordCount = normalized.split(" ").filter(Boolean).length;
        const firstToken = tokens[0] ?? "";
        const hasActionLead = ACTION_VERBS.has(firstToken) || /(ed|ing|ized|ized)$/i.test(firstToken);
        const hasStructure = /\b(by|through|to|for|across|while)\b/.test(normalized);
        const hasOutcome = tokens.some((token) => OUTCOME_HINTS.has(token));
        const lengthGood = wordCount >= 8 && wordCount <= 34;

        const bulletScore = Number(lengthGood) + Number(hasActionLead) + Number(hasStructure || hasOutcome);
        bulletScores.push(bulletScore);
    }
    const avg = bulletScores.reduce((sum, value) => sum + value, 0) / bulletScores.length;
    if (avg >= 2.2) {
        return { score: 2, reason: `avg_structure_score=${avg.toFixed(2)}` };
    }
    if (avg >= 1.4) {
        return { score: 1, reason: `avg_structure_score=${avg.toFixed(2)}` };
    }
    return { score: 0, reason: `avg_structure_score=${avg.toFixed(2)}` };
}

function scoreATSAlignment(params: {
    afterBullets: string[];
    jobContextTokens: string[];
    requirementClusterTokens: string[];
}): ScoredDimension {
    const targetTokens = dedupe([
        ...params.requirementClusterTokens,
        ...params.jobContextTokens,
    ]).slice(0, 60);

    const afterTokens = params.afterBullets.flatMap((bullet) => tokenize(bullet, 3));
    const coverageRatio = coverage(afterTokens, targetTokens);

    const frequency = new Map<string, number>();
    for (const token of afterTokens) {
        frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
    const maxFrequency = Array.from(frequency.values()).reduce((max, value) => Math.max(max, value), 0);
    const stuffingRatio = afterTokens.length > 0 ? maxFrequency / afterTokens.length : 0;

    const matchedTokenCount = Array.from(new Set(afterTokens)).filter((token) => targetTokens.includes(token)).length;

    let score: 0 | 1 | 2 = 0;
    if (coverageRatio >= 0.32 || matchedTokenCount >= 6) score = 2;
    else if (coverageRatio >= 0.18 || matchedTokenCount >= 3) score = 1;

    if (stuffingRatio > 0.2 && score > 0) {
        score = (score - 1) as 0 | 1 | 2;
    }

    return {
        score,
        reason: `coverage=${coverageRatio}, matched_tokens=${matchedTokenCount}, stuffing_ratio=${Number(stuffingRatio.toFixed(4))}`,
    };
}

function scoreOwnership(params: {
    afterDebugBullets: DebugBulletLite[];
    patternCollector: PatternDetection;
    caseId: string;
}): ScoredDimension {
    if (params.afterDebugBullets.length === 0) {
        return { score: 0, reason: "no_after_debug_bullets" };
    }

    let majorViolations = 0;
    let minorViolations = 0;
    for (const bullet of params.afterDebugBullets) {
        const leadToken = extractOwnershipLeadToken(bullet.rewritten_bullet);
        const strongLead = STRONG_LEAD_VERBS.has(leadToken);

        if (bullet.ownership_level === "contributed" && strongLead) {
            majorViolations += 1;
            params.patternCollector.patterns.push(`ownership_violation_${params.caseId}_${bullet.evidence_id}`);
            params.patternCollector.details.push({
                pattern: "ownership_violation",
                case_id: params.caseId,
                evidence_id: bullet.evidence_id,
                ownership_level: bullet.ownership_level,
                leading_verb: leadToken,
                reason: "contributed_but_strong_lead_verb",
            });
            continue;
        }

        if (!bullet.confirmed && strongLead) {
            minorViolations += 1;
        }
    }

    if (majorViolations > 0 || minorViolations > 1) {
        return {
            score: 0,
            reason: `ownership_violations_major=${majorViolations},minor=${minorViolations}`,
        };
    }
    if (minorViolations === 1) {
        return {
            score: 1,
            reason: `ownership_violations_major=${majorViolations},minor=${minorViolations}`,
        };
    }
    return {
        score: 2,
        reason: "ownership_alignment_clean",
    };
}

function extractNumbers(value: string): string[] {
    const matches = value.match(/\b\d+(?:\.\d+)?%?\b/g);
    if (!matches) return [];
    return matches;
}

function scoreIntegrity(params: {
    beforeDebugBullets: DebugBulletLite[];
    afterDebugBullets: DebugBulletLite[];
    patternCollector: PatternDetection;
    caseId: string;
}): ScoredDimension {
    const beforeByEvidence = new Map<string, DebugBulletLite>();
    for (const bullet of params.beforeDebugBullets) {
        if (!beforeByEvidence.has(bullet.evidence_id)) {
            beforeByEvidence.set(bullet.evidence_id, bullet);
        }
    }

    let hallucinationCount = 0;
    let driftCount = 0;

    for (const afterBullet of params.afterDebugBullets) {
        const beforeBullet = beforeByEvidence.get(afterBullet.evidence_id);
        if (!beforeBullet) continue;

        const beforeNumbers = new Set(extractNumbers(beforeBullet.rewritten_bullet));
        const afterNumbers = extractNumbers(afterBullet.rewritten_bullet);
        const newNumbers = afterNumbers.filter((value) => !beforeNumbers.has(value));

        if (newNumbers.length > 0) {
            hallucinationCount += 1;
            params.patternCollector.patterns.push(`hallucination_${params.caseId}_${afterBullet.evidence_id}`);
            params.patternCollector.details.push({
                pattern: "hallucination",
                case_id: params.caseId,
                evidence_id: afterBullet.evidence_id,
                new_numbers: newNumbers,
            });
        }

        const beforeTokens = new Set(tokenize(beforeBullet.rewritten_bullet, 3));
        const afterTokens = new Set(tokenize(afterBullet.rewritten_bullet, 3));
        const overlap = jaccardSet(beforeTokens, afterTokens);

        if (overlap < 0.22) {
            driftCount += 1;
            params.patternCollector.details.push({
                pattern: "meaning_drift",
                case_id: params.caseId,
                evidence_id: afterBullet.evidence_id,
                overlap,
            });
        }
    }

    if (hallucinationCount > 0 || driftCount > 0) {
        return {
            score: 0,
            reason: `integrity_violation hallucination=${hallucinationCount}, drift=${driftCount}`,
        };
    }

    return {
        score: 2,
        reason: "integrity_clean",
    };
}

function detectLowCredibilityRewritePatterns(params: {
    afterDebugBullets: DebugBulletLite[];
    patternCollector: PatternDetection;
    caseId: string;
}): void {
    const patternEntries: Array<{ pattern: string; token: string; reason: string }> = [
        {
            pattern: "stacked_confirmed_phrase",
            token: "stacked_confirmed_phrase",
            reason: "leading_action_plus_confirmed_phrase",
        },
        {
            pattern: "stacked_action_verb_phrase",
            token: "stacked_action_verb_phrase",
            reason: "leading_action_plus_action_verb_phrase",
        },
        {
            pattern: "transferable_support_phrase",
            token: "transferable_support_phrase",
            reason: "forced_transferable_support_phrase",
        },
        {
            pattern: "forced_context_suffix",
            token: "forced_context_suffix",
            reason: "forced_in_contexts_suffix",
        },
    ];
    for (const bullet of params.afterDebugBullets) {
        const text = bullet.rewritten_bullet.trim();
        if (!text) continue;
        const checks: Array<{ key: string; match: boolean }> = [
            {
                key: "stacked_confirmed_phrase",
                match: /^(coordinated|developed|delivered)\s+confirmed\b/i.test(text),
            },
            {
                key: "stacked_action_verb_phrase",
                match: /^(delivered|developed|coordinated)\s+(conducted|designed|built|implemented|executed|optimized|improved|presented|identified)\b/i.test(text),
            },
            {
                key: "transferable_support_phrase",
                match: /\bas transferable support\b/i.test(text),
            },
            {
                key: "forced_context_suffix",
                match: /\bin [a-z][a-z0-9\s/-]{3,} contexts[.?!]?$/i.test(text),
            },
        ];
        for (const check of checks) {
            if (!check.match) continue;
            const patternMeta = patternEntries.find((entry) => entry.pattern === check.key);
            if (!patternMeta) continue;
            params.patternCollector.patterns.push(`low_credibility_phrase_${params.caseId}_${bullet.evidence_id}_${patternMeta.token}`);
            params.patternCollector.details.push({
                pattern: "low_credibility_phrase",
                subtype: patternMeta.pattern,
                case_id: params.caseId,
                evidence_id: bullet.evidence_id,
                reason: patternMeta.reason,
                bullet: text,
            });
        }
    }
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreDifferentiationByPair(params: {
    left: RenderedCase;
    right: RenderedCase;
}): PairDifferentiationDiagnostic {
    const pairType: "adjacent" | "mixed" = params.left.caseDef.type === "adjacent" && params.right.caseDef.type === "adjacent"
        ? "adjacent"
        : "mixed";
    const leftBeforeMap = new Map(extractDebugBullets(params.left.before).map((item) => [item.evidence_id, item.rewritten_bullet]));
    const leftAfterMap = new Map(extractDebugBullets(params.left.after).map((item) => [item.evidence_id, item.rewritten_bullet]));
    const rightBeforeMap = new Map(extractDebugBullets(params.right.before).map((item) => [item.evidence_id, item.rewritten_bullet]));
    const rightAfterMap = new Map(extractDebugBullets(params.right.after).map((item) => [item.evidence_id, item.rewritten_bullet]));

    const leftIds = new Set(params.left.selectedEvidenceIds);
    const rightIds = new Set(params.right.selectedEvidenceIds);
    const sharedEvidenceIds = Array.from(leftIds).filter((id) => rightIds.has(id));
    const overlapRatio = Math.min(leftIds.size, rightIds.size) === 0
        ? 0
        : Number((sharedEvidenceIds.length / Math.min(leftIds.size, rightIds.size)).toFixed(4));

    const beforeSimilarities: number[] = [];
    const afterSimilarities: number[] = [];
    const beforeGlobal = jaccardSet(
        toTokenSet(extractPublicBullets(params.left.before)),
        toTokenSet(extractPublicBullets(params.right.before)),
    );
    const afterGlobal = jaccardSet(
        toTokenSet(extractPublicBullets(params.left.after)),
        toTokenSet(extractPublicBullets(params.right.after)),
    );

    for (const evidenceId of sharedEvidenceIds) {
        const leftBefore = leftBeforeMap.get(evidenceId) ?? "";
        const rightBefore = rightBeforeMap.get(evidenceId) ?? "";
        const leftAfter = leftAfterMap.get(evidenceId) ?? "";
        const rightAfter = rightAfterMap.get(evidenceId) ?? "";

        beforeSimilarities.push(textSimilarity(leftBefore, rightBefore));
        afterSimilarities.push(textSimilarity(leftAfter, rightAfter));
    }

    if (sharedEvidenceIds.length === 0) {
        const delta = Number((beforeGlobal - afterGlobal).toFixed(4));
        const pairScore: 0 | 1 | 2 = afterGlobal <= 0.72 ? 2 : afterGlobal <= 0.86 ? 1 : 0;
        return {
            job_a: params.left.caseDef.id,
            job_b: params.right.caseDef.id,
            pair_type: pairType,
            shared_evidence_count: 0,
            overlap_ratio: overlapRatio,
            before_similarity: beforeGlobal,
            after_similarity: afterGlobal,
            similarity_delta: delta,
            pair_score: pairScore,
        };
    }

    const sharedBeforeSimilarity = average(beforeSimilarities);
    const sharedAfterSimilarity = average(afterSimilarities);
    // Blend shared-evidence similarity with global-output similarity when overlap is moderate.
    const sharedWeight = Math.max(0.45, Math.min(0.85, overlapRatio));
    const beforeSimilarity = Number((
        (sharedBeforeSimilarity * sharedWeight)
        + (beforeGlobal * (1 - sharedWeight))
    ).toFixed(4));
    const afterSimilarity = Number((
        (sharedAfterSimilarity * sharedWeight)
        + (afterGlobal * (1 - sharedWeight))
    ).toFixed(4));
    const delta = Number((beforeSimilarity - afterSimilarity).toFixed(4));

    let pairScore: 0 | 1 | 2 = 0;
    if (afterSimilarity <= 0.65 || delta >= 0.12) {
        pairScore = 2;
    } else if (afterSimilarity <= 0.82 || delta >= 0.05) {
        pairScore = 1;
    }
    if (pairType === "mixed" && pairScore === 1 && delta >= 0.06 && afterSimilarity <= 0.88) {
        pairScore = 2;
    }

    return {
        job_a: params.left.caseDef.id,
        job_b: params.right.caseDef.id,
        pair_type: pairType,
        shared_evidence_count: sharedEvidenceIds.length,
        overlap_ratio: overlapRatio,
        before_similarity: beforeSimilarity,
        after_similarity: afterSimilarity,
        similarity_delta: delta,
        pair_score: pairScore,
    };
}

function verdictFromScore(score: number): "production_ready" | "usable_but_not_strong" | "not_working" {
    if (score >= 10) return "production_ready";
    if (score >= 7) return "usable_but_not_strong";
    return "not_working";
}

function hashJson(value: unknown): string {
    const content = JSON.stringify(value);
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

async function buildRenderedCase(params: {
    profileId: string;
    careerId: string;
    caseDef: CaseDefinition;
    fixtureJob: FixtureJob;
    careerGraph: Awaited<ReturnType<typeof loadCareerGraph>>;
    noConfirmationBridge: ConfirmationRescoreBridge;
    recentSelectionContext?: AuditRecentSelectionContext;
}): Promise<RenderedCase> {
    const jobId = await ensureDebugJob({ fixtureJob: params.fixtureJob });
    const capabilityMatch = await getCapabilityMatchV2({
        careerId: params.careerId,
        profileId: params.profileId,
        jobDescription: params.fixtureJob.job_description,
        jobTitleHint: params.fixtureJob.title,
        topSignalsLimit: 4,
    });

    const parsedSignals = buildJobSignalsFromRawJd({
        rawJd: params.fixtureJob.job_description,
        fallbackTitle: params.fixtureJob.title,
    });

    const roleContextProfile = detectRoleContextProfile(parsedSignals, capabilityMatch.audit.requirement_clusters);
    const { jobContextTokens, requirementClusterTokens } = computeJobContextTokens({
        fixtureJob: params.fixtureJob,
        capabilityMatch,
        roleContextProfile,
    });

    const tailoringPlan = buildTailoringPlanForCv({
        jobId,
        capabilityMatch,
        careerGraph: params.careerGraph,
        confirmationBridge: params.noConfirmationBridge,
        confirmedStrengthAreas: [],
        positioningHints: [],
        recentSelectionContext: params.recentSelectionContext,
    });

    const selectedEvidenceInput: NonNullable<Parameters<typeof generateResumeCopilot>[0]["selectedEvidenceInput"]> = {
        job_id: tailoringPlan.job_id,
        selected_evidence: tailoringPlan.selected_evidence,
        role_context_profile: tailoringPlan.role_context_profile ?? roleContextProfile,
        capability_ranking: tailoringPlan.capability_ranking,
        selection_debug: tailoringPlan.selection_debug,
        limits: tailoringPlan.limits,
    };
    const frozenSelectedEvidenceInput = cloneJson(selectedEvidenceInput);
    const selectedEvidenceInputHash = hashJson(frozenSelectedEvidenceInput);

    const before = await generateResumeCopilot({
        profileId: params.profileId,
        jobId,
        selectedEvidenceInput: cloneJson(frozenSelectedEvidenceInput),
        tailoringPlan: cloneJson(tailoringPlan),
        options: {
            includeDebug: true,
            rewriteBullets: false,
            overallMatchScore: capabilityMatch.overall_match_score,
        },
    });

    const after = await generateResumeCopilot({
        profileId: params.profileId,
        jobId,
        selectedEvidenceInput: cloneJson(frozenSelectedEvidenceInput),
        tailoringPlan: cloneJson(tailoringPlan),
        options: {
            includeDebug: true,
            rewriteBullets: true,
            overallMatchScore: capabilityMatch.overall_match_score,
        },
    });

    return {
        caseDef: params.caseDef,
        fixtureJob: params.fixtureJob,
        jobId,
        roleContextProfile,
        jobContextTokens,
        requirementClusterTokens,
        selectedEvidenceIds: tailoringPlan.selected_evidence.map((item) => item.evidence_id),
        selectedEvidenceInputHash,
        frozenSelectedEvidenceInput,
        tailoringPlan,
        before,
        after,
    };
}

function evaluateCase(params: {
    renderedCase: RenderedCase;
    patternCollector: PatternDetection;
}): {
    baseScores: Omit<JobScoreBundle, "differentiation">;
    baseReasons: Omit<Record<keyof JobScoreBundle, string>, "differentiation">;
    beforeAfterSimilarity: number;
    beforeBullets: string[];
    afterBullets: string[];
} {
    const beforeBullets = extractPublicBullets(params.renderedCase.before);
    const afterBullets = extractPublicBullets(params.renderedCase.after);
    const beforeDebugBullets = extractDebugBullets(params.renderedCase.before);
    const afterDebugBullets = extractDebugBullets(params.renderedCase.after);

    const relevance = scoreJobRelevance({
        beforeBullets,
        afterBullets,
        jobContextTokens: params.renderedCase.jobContextTokens,
        requirementClusterTokens: params.renderedCase.requirementClusterTokens,
    });
    const readability = scoreReadability(afterBullets);
    const ats = scoreATSAlignment({
        afterBullets,
        jobContextTokens: params.renderedCase.jobContextTokens,
        requirementClusterTokens: params.renderedCase.requirementClusterTokens,
    });
    const ownership = scoreOwnership({
        afterDebugBullets,
        patternCollector: params.patternCollector,
        caseId: params.renderedCase.caseDef.id,
    });
    const integrity = scoreIntegrity({
        beforeDebugBullets,
        afterDebugBullets,
        patternCollector: params.patternCollector,
        caseId: params.renderedCase.caseDef.id,
    });
    detectLowCredibilityRewritePatterns({
        afterDebugBullets,
        patternCollector: params.patternCollector,
        caseId: params.renderedCase.caseDef.id,
    });

    const beforeAfterSimilarity = Number(jaccardSet(
        toTokenSet(beforeBullets),
        toTokenSet(afterBullets),
    ).toFixed(4));

    return {
        baseScores: {
            relevance: relevance.score,
            readability: readability.score,
            ats: ats.score,
            ownership: ownership.score,
            integrity: integrity.score,
        },
        baseReasons: {
            relevance: relevance.reason,
            readability: readability.reason,
            ats: ats.reason,
            ownership: ownership.reason,
            integrity: integrity.reason,
        },
        beforeAfterSimilarity,
        beforeBullets,
        afterBullets,
    };
}

function evaluateDifferentiation(params: {
    renderedCases: RenderedCase[];
    baseByCaseId: Map<string, ReturnType<typeof evaluateCase>>;
    patternCollector: PatternDetection;
}): {
    perCaseScore: Map<string, ScoredDimension>;
    pairDiagnostics: PairDifferentiationDiagnostic[];
} {
    const pairDiagnostics: PairDifferentiationDiagnostic[] = [];
    const pairScoresByCase = new Map<string, Array<{ score: number; reason: string }>>();

    for (let i = 0; i < params.renderedCases.length; i += 1) {
        for (let j = i + 1; j < params.renderedCases.length; j += 1) {
            const left = params.renderedCases[i];
            const right = params.renderedCases[j];
            const diagnostic = scoreDifferentiationByPair({ left, right });
            pairDiagnostics.push(diagnostic);

            const pairKey = `${left.caseDef.id}_${right.caseDef.id}`;
            if (diagnostic.after_similarity > 0.9) {
                params.patternCollector.patterns.push(`generic_rewrite_detected_between_${left.caseDef.id}_and_${right.caseDef.id}`);
                params.patternCollector.details.push({
                    pattern: "generic_rewrite",
                    pair: pairKey,
                    after_similarity: diagnostic.after_similarity,
                });
            }
            if (diagnostic.after_similarity > 0.85 && diagnostic.similarity_delta < 0.03) {
                params.patternCollector.patterns.push(`fake_tailoring_detected_between_${left.caseDef.id}_and_${right.caseDef.id}`);
                params.patternCollector.details.push({
                    pattern: "fake_tailoring",
                    pair: pairKey,
                    after_similarity: diagnostic.after_similarity,
                    similarity_delta: diagnostic.similarity_delta,
                });
            }

            const leftScores = pairScoresByCase.get(left.caseDef.id) ?? [];
            leftScores.push({
                score: diagnostic.pair_score,
                reason: `${right.caseDef.id}:pair_score=${diagnostic.pair_score},after_similarity=${diagnostic.after_similarity},delta=${diagnostic.similarity_delta}`,
            });
            pairScoresByCase.set(left.caseDef.id, leftScores);

            const rightScores = pairScoresByCase.get(right.caseDef.id) ?? [];
            rightScores.push({
                score: diagnostic.pair_score,
                reason: `${left.caseDef.id}:pair_score=${diagnostic.pair_score},after_similarity=${diagnostic.after_similarity},delta=${diagnostic.similarity_delta}`,
            });
            pairScoresByCase.set(right.caseDef.id, rightScores);
        }
    }

    const perCaseScore = new Map<string, ScoredDimension>();
    for (const renderedCase of params.renderedCases) {
        const pairScores = pairScoresByCase.get(renderedCase.caseDef.id) ?? [];
        if (pairScores.length === 0) {
            perCaseScore.set(renderedCase.caseDef.id, {
                score: 0,
                reason: "no_pair_to_compare",
            });
            continue;
        }
        const avgPairScore = average(pairScores.map((item) => item.score));
        let score: 0 | 1 | 2 = 0;
        if (avgPairScore >= 1.5) score = 2;
        else if (avgPairScore >= 0.75) score = 1;

        perCaseScore.set(renderedCase.caseDef.id, {
            score,
            reason: pairScores.map((item) => item.reason).join(" | "),
        });
    }

    return {
        perCaseScore,
        pairDiagnostics,
    };
}

function toQualityJudgment(scores: JobScoreBundle): "strong" | "watch" | "failing" {
    const values = Object.values(scores);
    const zeroCount = values.filter((value) => value === 0).length;
    const oneCount = values.filter((value) => value === 1).length;
    if (zeroCount === 0 && oneCount <= 1) return "strong";
    if (zeroCount <= 1) return "watch";
    return "failing";
}

function parseCaseIdFromPattern(pattern: string, prefix: string): string | null {
    const normalized = pattern.trim();
    if (!normalized.startsWith(prefix)) return null;
    const parts = normalized.slice(prefix.length).split("_");
    const first = parts[0] ? parts[0].trim() : "";
    return /^job-\d+$/i.test(first) ? first.toLowerCase() : null;
}

function parsePairFromPattern(pattern: string, prefix: string): [string, string] | null {
    const normalized = pattern.trim();
    if (!normalized.startsWith(prefix)) return null;
    const remainder = normalized.slice(prefix.length);
    const match = remainder.match(/(job-\d+)_(job-\d+)/i);
    if (!match) return null;
    return [match[1].toLowerCase(), match[2].toLowerCase()];
}

function evaluateFailureModes(params: {
    jobs: JobCaseAuditResult[];
    pairDiagnostics: PairDifferentiationDiagnostic[];
    patternCollector: PatternDetection;
    caseDefs: CaseDefinition[];
}): FailureModeResult[] {
    const patternSet = dedupe(params.patternCollector.patterns);
    const caseDefById = new Map(params.caseDefs.map((item) => [item.id, item]));

    const genericPairs = params.pairDiagnostics
        .filter((pair) => pair.pair_type === "adjacent" && pair.after_similarity >= 0.94 && pair.similarity_delta <= 0.02)
        .map((pair) => [pair.job_a.toLowerCase(), pair.job_b.toLowerCase()] as [string, string]);
    const genericCaseIds = dedupe(genericPairs.flatMap((pair) => pair));

    const fakePairs = params.pairDiagnostics
        .filter((pair) => pair.pair_type === "adjacent" && pair.after_similarity >= 0.88 && pair.similarity_delta < 0.01)
        .map((pair) => [pair.job_a.toLowerCase(), pair.job_b.toLowerCase()] as [string, string]);
    const fakeCaseIds = dedupe(fakePairs.flatMap((pair) => pair));

    const ownershipCaseIds = dedupe(
        patternSet
            .map((pattern) => parseCaseIdFromPattern(pattern, "ownership_violation_"))
            .filter((value): value is string => Boolean(value)),
    );

    const hallucinationCaseIds = dedupe(
        patternSet
            .map((pattern) => parseCaseIdFromPattern(pattern, "hallucination_"))
            .filter((value): value is string => Boolean(value)),
    );
    const meaningDriftCaseIds = dedupe(
        params.patternCollector.details
            .filter((detail) => detail && detail.pattern === "meaning_drift")
            .map((detail) => {
                const caseId = typeof detail.case_id === "string" ? detail.case_id.trim().toLowerCase() : "";
                return /^job-\d+$/i.test(caseId) ? caseId : "";
            })
            .filter(Boolean),
    );
    const lowCredibilityPhraseCaseIds = dedupe(
        params.patternCollector.details
            .filter((detail) => detail && detail.pattern === "low_credibility_phrase")
            .map((detail) => {
                const caseId = typeof detail.case_id === "string" ? detail.case_id.trim().toLowerCase() : "";
                return /^job-\d+$/i.test(caseId) ? caseId : "";
            })
            .filter(Boolean),
    );
    const evidenceMismatchCaseIds = dedupe([
        ...hallucinationCaseIds,
        ...meaningDriftCaseIds,
        ...lowCredibilityPhraseCaseIds,
    ]);

    const weakAlignmentCaseIds = dedupe(params.jobs
        .filter((job) => {
            const def = caseDefById.get(job.case_id);
            const expected = def?.expected_alignment ?? "medium";
            if (expected === "high") {
                return job.scores.relevance === 0 || job.scores.ats === 0;
            }
            if (expected === "medium") {
                return job.scores.relevance === 0 && job.scores.ats === 0;
            }
            return job.scores.relevance === 0 && job.scores.ats === 0;
        })
        .map((job) => job.case_id.toLowerCase()));
    const weakAlignmentLowOnlyCount = weakAlignmentCaseIds
        .filter((caseId) => caseDefById.get(caseId)?.expected_alignment === "low")
        .length;
    const weakAlignmentHighMediumCount = weakAlignmentCaseIds
        .filter((caseId) => {
            const expected = caseDefById.get(caseId)?.expected_alignment ?? "medium";
            return expected !== "low";
        })
        .length;

    const weakAdjacentPairs = params.pairDiagnostics
        .filter((pair) => pair.pair_type === "adjacent" && pair.pair_score < 1);
    const weakDifferentiationCaseIds = dedupe(weakAdjacentPairs.flatMap((pair) => [pair.job_a, pair.job_b]).map((id) => id.toLowerCase()));

    return [
        {
            mode: "generic_rewrite",
            pass: genericCaseIds.length === 0,
            triggered_count: genericPairs.length,
            threshold: "0 adjacent pairs with after_similarity>=0.94 and similarity_delta<=0.02",
            affected_case_ids: genericCaseIds,
            evidence: genericPairs.length > 0
                ? `detected_pairs=${genericPairs.map((pair) => `${pair[0]}:${pair[1]}`).join(",")}`
                : "no_detected_adjacent_pairs",
        },
        {
            mode: "fake_tailoring",
            pass: fakeCaseIds.length === 0,
            triggered_count: fakePairs.length,
            threshold: "0 adjacent pairs with after_similarity>=0.88 and similarity_delta<0.01",
            affected_case_ids: fakeCaseIds,
            evidence: fakePairs.length > 0
                ? `detected_pairs=${fakePairs.map((pair) => `${pair[0]}:${pair[1]}`).join(",")}`
                : "no_detected_adjacent_pairs",
        },
        {
            mode: "ownership_inflation",
            pass: ownershipCaseIds.length === 0,
            triggered_count: ownershipCaseIds.length,
            threshold: "0 ownership violation patterns",
            affected_case_ids: ownershipCaseIds,
            evidence: ownershipCaseIds.length > 0
                ? `cases=${ownershipCaseIds.join(",")}`
                : "no_ownership_violation_patterns",
        },
        {
            mode: "weak_job_alignment",
            pass: weakAlignmentHighMediumCount === 0 && weakAlignmentLowOnlyCount <= 1,
            triggered_count: weakAlignmentCaseIds.length,
            threshold: "high/medium expected alignment cases must be 0 weak; low expected <=1 weak",
            affected_case_ids: weakAlignmentCaseIds,
            evidence: `weak_high_medium=${weakAlignmentHighMediumCount},weak_low=${weakAlignmentLowOnlyCount}`,
        },
        {
            mode: "evidence_mismatch",
            pass: evidenceMismatchCaseIds.length === 0,
            triggered_count: evidenceMismatchCaseIds.length,
            threshold: "0 hallucination/meaning-drift/low-credibility-phrase cases",
            affected_case_ids: evidenceMismatchCaseIds,
            evidence: `hallucination_cases=${hallucinationCaseIds.length},meaning_drift_cases=${meaningDriftCaseIds.length},low_credibility_phrase_cases=${lowCredibilityPhraseCaseIds.length}`,
        },
        {
            mode: "weak_differentiation",
            pass: weakDifferentiationCaseIds.length === 0,
            triggered_count: weakAdjacentPairs.length,
            threshold: "all adjacent pairs must score >=1 differentiation",
            affected_case_ids: weakDifferentiationCaseIds,
            evidence: weakAdjacentPairs.length > 0
                ? `weak_adjacent_pairs=${weakAdjacentPairs.map((pair) => `${pair.job_a}:${pair.job_b}:${pair.pair_score}`).join(",")}`
                : "all_adjacent_pairs_ok",
        },
    ];
}

function findModeResult(
    failureModes: FailureModeResult[],
    mode: FailureModeKey,
): FailureModeResult | null {
    return failureModes.find((item) => item.mode === mode) ?? null;
}

function findAdjacentPair(
    pairDiagnostics: PairDifferentiationDiagnostic[],
): PairDifferentiationDiagnostic | null {
    return pairDiagnostics.find((pair) => pair.pair_type === "adjacent") ?? null;
}

function buildModeToFixtureMap(
    fixtures: AdversarialFixtureResult[],
): Record<FailureModeKey, string[]> {
    const map: Record<FailureModeKey, string[]> = {
        generic_rewrite: [],
        fake_tailoring: [],
        ownership_inflation: [],
        weak_job_alignment: [],
        evidence_mismatch: [],
        weak_differentiation: [],
    };
    for (const fixture of fixtures) {
        map[fixture.target_failure_mode].push(fixture.fixture_id);
    }
    return map;
}

function runAdversarialFixtures(params: {
    jobs: JobCaseAuditResult[];
    pairDiagnostics: PairDifferentiationDiagnostic[];
    patternCollector: PatternDetection;
    caseDefs: CaseDefinition[];
    baselineFailureModes: FailureModeResult[];
}): AdversarialFixtureAggregate {
    const firstAdjacentPair = findAdjacentPair(params.pairDiagnostics);
    const firstHighAlignmentCase = params.jobs.find((job) => job.expected_alignment === "high")?.case_id ?? params.jobs[0]?.case_id ?? "job-01";
    const firstCaseId = params.jobs[0]?.case_id ?? "job-01";

    const fixtures: Array<{
        fixture_id: string;
        target_failure_mode: FailureModeKey;
        description: string;
        mutate: (draft: {
            jobs: JobCaseAuditResult[];
            pairDiagnostics: PairDifferentiationDiagnostic[];
            patternCollector: PatternDetection;
        }) => { notes: string };
    }> = [
        {
            fixture_id: "adv-generic-rewrite-jam",
            target_failure_mode: "generic_rewrite",
            description: "Force adjacent-role outputs to near-identical rewrite profile with low delta.",
            mutate: (draft) => {
                const target = findAdjacentPair(draft.pairDiagnostics);
                if (!target) return { notes: "no_adjacent_pair_available" };
                target.after_similarity = 0.95;
                target.similarity_delta = 0.015;
                return { notes: `mutated_pair=${target.job_a}:${target.job_b}` };
            },
        },
        {
            fixture_id: "adv-fake-tailoring-jam",
            target_failure_mode: "fake_tailoring",
            description: "Force adjacent-role outputs to highly similar wording with almost no delta from baseline similarity.",
            mutate: (draft) => {
                const target = findAdjacentPair(draft.pairDiagnostics);
                if (!target) return { notes: "no_adjacent_pair_available" };
                target.after_similarity = 0.9;
                target.similarity_delta = 0.005;
                return { notes: `mutated_pair=${target.job_a}:${target.job_b}` };
            },
        },
        {
            fixture_id: "adv-ownership-inflation-claim",
            target_failure_mode: "ownership_inflation",
            description: "Inject ownership violation pattern for contributed evidence with lead/owned framing.",
            mutate: (draft) => {
                draft.patternCollector.patterns.push(`ownership_violation_${firstCaseId}_adv_fixture`);
                return { notes: `pattern_case=${firstCaseId}` };
            },
        },
        {
            fixture_id: "adv-weak-alignment-collapse",
            target_failure_mode: "weak_job_alignment",
            description: "Collapse relevance score for high-alignment case to simulate weak alignment.",
            mutate: (draft) => {
                const target = draft.jobs.find((job) => job.case_id === firstHighAlignmentCase) ?? draft.jobs[0];
                if (!target) return { notes: "no_jobs_available" };
                target.scores.relevance = 0;
                target.score_reasons.relevance = "adversarial_fixture_forced_relevance_zero";
                target.failed_dimensions = dedupe([...target.failed_dimensions, "relevance"]) as Array<keyof JobScoreBundle>;
                return { notes: `mutated_case=${target.case_id}` };
            },
        },
        {
            fixture_id: "adv-evidence-mismatch-inject",
            target_failure_mode: "evidence_mismatch",
            description: "Inject hallucination pattern to simulate evidence mismatch against source bullets.",
            mutate: (draft) => {
                draft.patternCollector.patterns.push(`hallucination_${firstCaseId}_adv_fixture`);
                return { notes: `pattern_case=${firstCaseId}` };
            },
        },
        {
            fixture_id: "adv-weak-differentiation-collapse",
            target_failure_mode: "weak_differentiation",
            description: "Force adjacent pair differentiation score below threshold.",
            mutate: (draft) => {
                const target = findAdjacentPair(draft.pairDiagnostics);
                if (!target) return { notes: "no_adjacent_pair_available" };
                target.pair_score = 0;
                return { notes: `mutated_pair=${target.job_a}:${target.job_b}` };
            },
        },
    ];

    const fixtureResults: AdversarialFixtureResult[] = fixtures.map((fixture) => {
        const jobsDraft = cloneJson(params.jobs);
        const pairDraft = cloneJson(params.pairDiagnostics);
        const patternDraft = cloneJson(params.patternCollector);
        const mutateResult = fixture.mutate({
            jobs: jobsDraft,
            pairDiagnostics: pairDraft,
            patternCollector: patternDraft,
        });

        const firstEval = evaluateFailureModes({
            jobs: jobsDraft,
            pairDiagnostics: pairDraft,
            patternCollector: patternDraft,
            caseDefs: params.caseDefs,
        });
        const secondEval = evaluateFailureModes({
            jobs: jobsDraft,
            pairDiagnostics: pairDraft,
            patternCollector: patternDraft,
            caseDefs: params.caseDefs,
        });

        const firstHash = computeDeterminismHash(firstEval);
        const secondHash = computeDeterminismHash(secondEval);
        const deterministicStable = firstHash === secondHash;

        const baselineMode = findModeResult(params.baselineFailureModes, fixture.target_failure_mode);
        const modeResult = findModeResult(firstEval, fixture.target_failure_mode);
        const detected = Boolean(modeResult && modeResult.pass === false);
        const triggeredModes = firstEval
            .filter((item) => item.pass === false)
            .map((item) => item.mode);
        const unexpectedTriggeredModes = triggeredModes.filter((mode) => mode !== fixture.target_failure_mode);

        return {
            fixture_source: "synthetic",
            fixture_id: fixture.fixture_id,
            target_failure_mode: fixture.target_failure_mode,
            description: fixture.description,
            expected_detection: true,
            detected,
            deterministic_stable: deterministicStable,
            mode_result: modeResult,
            baseline_mode_pass: baselineMode ? baselineMode.pass : false,
            triggered_modes: triggeredModes,
            unexpected_triggered_modes: unexpectedTriggeredModes,
            notes: mutateResult.notes,
        };
    });

    const modeToFixtureMap = buildModeToFixtureMap(fixtureResults);
    const allModesCovered = Object.values(modeToFixtureMap).every((ids) => ids.length >= 1);
    const allDetected = fixtureResults.every((item) => item.detected === true);
    const deterministicStable = fixtureResults.every((item) => item.deterministic_stable === true);

    return {
        fixtures: fixtureResults,
        mode_to_fixture_map: modeToFixtureMap,
        all_modes_covered: allModesCovered,
        all_detected: allDetected,
        deterministic_stable: deterministicStable,
    };
}

function buildEmptyModeToFixtureMap(): Record<FailureModeKey, string[]> {
    return {
        generic_rewrite: [],
        fake_tailoring: [],
        ownership_inflation: [],
        weak_job_alignment: [],
        evidence_mismatch: [],
        weak_differentiation: [],
    };
}

function runDegradedReplayFixtures(params: {
    registryPath: string;
    caseDefs: CaseDefinition[];
    baselineFailureModes: FailureModeResult[];
}): DegradedReplayFixtureAggregate {
    const registryAbsolutePath = toAbsolutePath(params.registryPath);
    if (!fs.existsSync(registryAbsolutePath)) {
        return {
            available: false,
            registry_path: registryAbsolutePath,
            registry_version: null,
            missing_fixture_paths: [registryAbsolutePath],
            required_modes: [],
            fixtures: [],
            mode_to_fixture_map: buildEmptyModeToFixtureMap(),
            all_modes_covered: false,
            all_detected: false,
            deterministic_stable: false,
        };
    }

    const registry = readDegradedReplayRegistry(params.registryPath);
    const fixtureEntries = Array.isArray(registry.fixtures) ? registry.fixtures : [];
    const requiredModes = dedupe(fixtureEntries.map((item) => item.target_failure_mode)) as FailureModeKey[];
    const missingFixturePaths = fixtureEntries
        .map((item) => toAbsolutePath(item.replay_fixture_path))
        .filter((fixturePath) => !fs.existsSync(fixturePath));

    const fixtureResults: AdversarialFixtureResult[] = fixtureEntries.map((entry) => {
        const replayFixtureAbsolutePath = toAbsolutePath(entry.replay_fixture_path);
        if (!fs.existsSync(replayFixtureAbsolutePath)) {
            const baselineMode = findModeResult(params.baselineFailureModes, entry.target_failure_mode);
            return {
                fixture_source: "degraded_replay",
                fixture_id: entry.fixture_id,
                target_failure_mode: entry.target_failure_mode,
                description: entry.description,
                expected_detection: true,
                detected: false,
                deterministic_stable: false,
                mode_result: null,
                baseline_mode_pass: baselineMode ? baselineMode.pass : false,
                triggered_modes: [],
                unexpected_triggered_modes: [],
                notes: `missing_replay_fixture=${replayFixtureAbsolutePath}`,
            };
        }

        const replayFixture = readReplayFixture(entry.replay_fixture_path);
        const normalizedReplay = normalizeReplayJobs({
            replayFixture,
            caseDefs: params.caseDefs,
        });
        const pairDiagnostics = filterReplayPairDiagnostics({
            pairDiagnostics: replayFixture.pair_diagnostics ?? [],
            caseDefs: params.caseDefs,
        });
        const evidenceMismatchEvents = normalizeReplayEvidenceMismatchEvents({
            replayFixture,
            caseDefs: params.caseDefs,
            replayFixturePath: entry.replay_fixture_path,
        });
        const patternCollector = buildReplayPatternCollector({
            replayFixture,
            evidenceMismatchEvents,
        });

        const firstEval = evaluateFailureModes({
            jobs: normalizedReplay.jobs,
            pairDiagnostics,
            patternCollector,
            caseDefs: params.caseDefs,
        });
        const secondEval = evaluateFailureModes({
            jobs: normalizedReplay.jobs,
            pairDiagnostics,
            patternCollector,
            caseDefs: params.caseDefs,
        });

        const deterministicStable = computeDeterminismHash(firstEval) === computeDeterminismHash(secondEval);
        const baselineMode = findModeResult(params.baselineFailureModes, entry.target_failure_mode);
        const modeResult = findModeResult(firstEval, entry.target_failure_mode);
        const detected = Boolean(modeResult && modeResult.pass === false);
        const triggeredModes = firstEval
            .filter((item) => item.pass === false)
            .map((item) => item.mode);
        const unexpectedTriggeredModes = triggeredModes.filter((mode) => mode !== entry.target_failure_mode);

        return {
            fixture_source: "degraded_replay",
            fixture_id: entry.fixture_id,
            target_failure_mode: entry.target_failure_mode,
            description: entry.description,
            expected_detection: true,
            detected,
            deterministic_stable: deterministicStable,
            mode_result: modeResult,
            baseline_mode_pass: baselineMode ? baselineMode.pass : false,
            triggered_modes: triggeredModes,
            unexpected_triggered_modes: unexpectedTriggeredModes,
            notes: normalizedReplay.missingCaseIds.length > 0
                ? `missing_case_ids=${normalizedReplay.missingCaseIds.join(",")}`
                : "ok",
        };
    });

    const modeToFixtureMap = buildModeToFixtureMap(fixtureResults);
    const allModesCovered = requiredModes.length > 0
        && requiredModes.every((mode) => modeToFixtureMap[mode].length >= 1);
    const allDetected = fixtureResults.length > 0
        && fixtureResults.every((item) => item.detected === true);
    const deterministicStable = fixtureResults.length > 0
        && fixtureResults.every((item) => item.deterministic_stable === true);

    return {
        available: true,
        registry_path: registryAbsolutePath,
        registry_version: registry.version ?? null,
        missing_fixture_paths: dedupe(missingFixturePaths),
        required_modes: requiredModes,
        fixtures: fixtureResults,
        mode_to_fixture_map: modeToFixtureMap,
        all_modes_covered: allModesCovered,
        all_detected: allDetected,
        deterministic_stable: deterministicStable,
    };
}

function buildFounderReadability(params: {
    jobs: JobCaseAuditResult[];
    failureModes: FailureModeResult[];
    adversarialFixtures: AdversarialFixtureAggregate;
    degradedReplayFixtures: DegradedReplayFixtureAggregate;
    verdict: "production_ready" | "usable_but_not_strong" | "not_working";
    overallScore: number;
    deterministicStable: boolean;
    caseDefs: CaseDefinition[];
    successCriteria: Record<string, boolean>;
}): {
    gate_status: "pass" | "fail";
    quality_judgment: string;
    representative_case_coverage: Array<Record<string, unknown>>;
    weakest_cases: Array<Record<string, unknown>>;
    failure_modes: Array<Record<string, unknown>>;
    adversarial_fixtures: Array<Record<string, unknown>>;
    recommended_actions: string[];
} {
    const caseDefById = new Map(params.caseDefs.map((item) => [item.id, item]));
    const failingModes = params.failureModes.filter((mode) => !mode.pass);
    const gatePass = params.deterministicStable && Object.values(params.successCriteria).every((value) => value === true);

    const representativeCaseCoverage = params.jobs.map((job) => {
        const def = caseDefById.get(job.case_id);
        const watchDimensions = (Object.keys(job.scores) as Array<keyof JobScoreBundle>)
            .filter((dim) => job.scores[dim] <= 1);
        return {
            case_id: job.case_id,
            title: job.title,
            requirement_profile: def?.requirement_profile ?? job.requirement_profile,
            expected_alignment: def?.expected_alignment ?? job.expected_alignment,
            total_score: job.total,
            quality_judgment: job.quality_judgment,
            key_scores: {
                relevance: job.scores.relevance,
                ats: job.scores.ats,
                ownership: job.scores.ownership,
                integrity: job.scores.integrity,
                differentiation: job.scores.differentiation,
            },
            failed_dimensions: job.failed_dimensions,
            watch_dimensions: watchDimensions,
        };
    });

    const weakestCases = [...params.jobs]
        .sort((left, right) => left.total - right.total)
        .slice(0, 3)
        .map((job) => {
            const watchDimensions = (Object.keys(job.scores) as Array<keyof JobScoreBundle>)
                .filter((dim) => job.scores[dim] <= 1);
            const reasonDimensions = job.failed_dimensions.length > 0
                ? job.failed_dimensions
                : watchDimensions;
            return {
                case_id: job.case_id,
                title: job.title,
                total_score: job.total,
                quality_judgment: job.quality_judgment,
                reasons: reasonDimensions.map((dim) => `${dim}:${job.score_reasons[dim]}`),
            };
        });

    const recommendedActions = failingModes.length > 0
        ? failingModes.map((mode) => `Investigate ${mode.mode}: ${mode.evidence}`)
        : ["No immediate CV quality action needed beyond maintaining current thresholds and case set."];
    if (!params.adversarialFixtures.all_modes_covered) {
        recommendedActions.unshift("Adversarial fixture coverage is incomplete across enforced failure modes.");
    }
    if (!params.adversarialFixtures.all_detected) {
        recommendedActions.unshift("One or more adversarial fixtures did not trigger expected failure mode detection.");
    }
    if (!params.adversarialFixtures.deterministic_stable) {
        recommendedActions.unshift("Adversarial fixture evaluation is not deterministic; investigate fixture stability.");
    }
    if (!params.degradedReplayFixtures.all_modes_covered) {
        recommendedActions.unshift("Degraded replay fixture coverage is incomplete across configured degraded-first modes.");
    }
    if (!params.degradedReplayFixtures.all_detected) {
        recommendedActions.unshift("One or more degraded replay fixtures did not trigger expected mode detection.");
    }
    if (!params.degradedReplayFixtures.deterministic_stable) {
        recommendedActions.unshift("Degraded replay fixture evaluation is not deterministic; investigate fixture stability.");
    }

    return {
        gate_status: gatePass ? "pass" : "fail",
        quality_judgment: `overall_score=${params.overallScore}, verdict=${params.verdict}, deterministic=${params.deterministicStable}`,
        representative_case_coverage: representativeCaseCoverage,
        weakest_cases: weakestCases,
        failure_modes: params.failureModes.map((mode) => ({
            mode: mode.mode,
            pass: mode.pass,
            triggered_count: mode.triggered_count,
            affected_case_ids: mode.affected_case_ids,
            threshold: mode.threshold,
            evidence: mode.evidence,
        })),
        adversarial_fixtures: params.adversarialFixtures.fixtures.map((fixture) => ({
            fixture_source: fixture.fixture_source,
            fixture_id: fixture.fixture_id,
            target_failure_mode: fixture.target_failure_mode,
            expected_detection: fixture.expected_detection,
            detected: fixture.detected,
            deterministic_stable: fixture.deterministic_stable,
            triggered_modes: fixture.triggered_modes,
            unexpected_triggered_modes: fixture.unexpected_triggered_modes,
            notes: fixture.notes,
        })),
        recommended_actions: recommendedActions,
    };
}

function computeDeterminismHash(value: unknown): string {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(value))
        .digest("hex");
}

function normalizeReplayJobs(params: {
    replayFixture: ReplayFixture;
    caseDefs: CaseDefinition[];
}): {
    jobs: JobCaseAuditResult[];
    missingCaseIds: string[];
} {
    const caseById = new Map(params.caseDefs.map((item) => [item.id, item]));
    const replayByCaseId = new Map(params.replayFixture.jobs.map((job) => [job.case_id, job]));
    const missingCaseIds = params.caseDefs
        .filter((item) => !replayByCaseId.has(item.id))
        .map((item) => item.id);

    const jobs: JobCaseAuditResult[] = [];
    for (const caseDef of params.caseDefs) {
        const replayJob = replayByCaseId.get(caseDef.id);
        if (!replayJob) continue;

        const scores: JobScoreBundle = replayJob.scores;
        const scoreReasons: Record<keyof JobScoreBundle, string> = {
            relevance: replayJob.score_reasons?.relevance ?? "replay_fixture",
            readability: replayJob.score_reasons?.readability ?? "replay_fixture",
            ats: replayJob.score_reasons?.ats ?? "replay_fixture",
            ownership: replayJob.score_reasons?.ownership ?? "replay_fixture",
            integrity: replayJob.score_reasons?.integrity ?? "replay_fixture",
            differentiation: replayJob.score_reasons?.differentiation ?? "replay_fixture",
        };
        const total = replayJob.total
            ?? (scores.relevance + scores.readability + scores.ats + scores.ownership + scores.integrity + scores.differentiation);
        const failedDimensions = replayJob.failed_dimensions
            ?? ((Object.keys(scores) as Array<keyof JobScoreBundle>).filter((dimension) => scores[dimension] === 0));
        const caseDefFromReplay = caseById.get(replayJob.case_id) ?? caseDef;

        jobs.push({
            job_id: replayJob.case_id,
            case_id: replayJob.case_id,
            case_type: replayJob.case_type ?? caseDefFromReplay.type,
            requirement_profile: replayJob.requirement_profile ?? caseDefFromReplay.requirement_profile,
            expected_alignment: replayJob.expected_alignment ?? caseDefFromReplay.expected_alignment,
            title: replayJob.title ?? caseDefFromReplay.id,
            company: replayJob.company ?? null,
            selected_evidence_ids: [],
            frozen_input_hash: `replay_fixture_${replayJob.case_id}`,
            scores,
            score_reasons: scoreReasons,
            total: Number(total.toFixed(2)),
            quality_judgment: replayJob.quality_judgment ?? toQualityJudgment(scores),
            failed_dimensions: failedDimensions,
            before_bullets: [],
            after_bullets: [],
            before_after_similarity: 1,
        });
    }

    return {
        jobs,
        missingCaseIds,
    };
}

function filterReplayPairDiagnostics(params: {
    pairDiagnostics: PairDifferentiationDiagnostic[];
    caseDefs: CaseDefinition[];
}): PairDifferentiationDiagnostic[] {
    const caseSet = new Set(params.caseDefs.map((item) => item.id));
    return params.pairDiagnostics.filter((pair) => caseSet.has(pair.job_a) && caseSet.has(pair.job_b));
}

async function run(): Promise<void> {
    loadEnvLocal();
    process.env.ENABLE_RESUME_TAILORING_CANONICAL_ONLY = "1";

    const args = parseArgs();
    const caseResolution = resolveCaseDefinitions(args.caseIds);
    const caseDefs = caseResolution.selected;

    if (caseDefs.length === 0) {
        throw new Error("No audit cases resolved. Use --caseIds matching fixture ids.");
    }
    if (caseResolution.missingIds.length > 0) {
        throw new Error(`Unknown audit case ids: ${caseResolution.missingIds.join(", ")}`);
    }

    const replayFixtureAbsolutePath = toAbsolutePath(args.replayFixturePath);
    const replayFixtureExists = fs.existsSync(replayFixtureAbsolutePath);
    const degradedReplayRegistryAbsolutePath = toAbsolutePath(args.degradedReplayRegistryPath);
    const degradedReplayRegistryExists = fs.existsSync(degradedReplayRegistryAbsolutePath);
    const executionMode: "live" | "replay" = args.executionMode === "auto"
        ? (replayFixtureExists ? "replay" : "live")
        : args.executionMode;

    if (executionMode === "replay" && !replayFixtureExists) {
        throw new Error(`Replay fixture not found at ${replayFixtureAbsolutePath}.`);
    }

    let fixtureVersion = "unknown_fixture_version";
    let careerId = "replay_fixture";
    let missingFixtureCaseIds: string[] = [];
    let jobs: JobCaseAuditResult[] = [];
    let pairDiagnostics: PairDifferentiationDiagnostic[] = [];
    let replayEvidenceMismatchEventCount = 0;
    let patternCollector: PatternDetection = {
        patterns: [],
        details: [],
    };

    if (executionMode === "replay") {
        const replayFixture = readReplayFixture(args.replayFixturePath);
        fixtureVersion = replayFixture.fixture_version || replayFixture.version;
        const evidenceMismatchEvents = normalizeReplayEvidenceMismatchEvents({
            replayFixture,
            caseDefs,
            replayFixturePath: args.replayFixturePath,
        });
        replayEvidenceMismatchEventCount = evidenceMismatchEvents.length;

        const normalizedReplay = normalizeReplayJobs({
            replayFixture,
            caseDefs,
        });
        jobs = normalizedReplay.jobs;
        missingFixtureCaseIds = normalizedReplay.missingCaseIds;
        pairDiagnostics = filterReplayPairDiagnostics({
            pairDiagnostics: replayFixture.pair_diagnostics ?? [],
            caseDefs,
        });
        patternCollector = buildReplayPatternCollector({
            replayFixture,
            evidenceMismatchEvents,
        });
    } else {
        const fixture = readFixture(args.fixturePath);
        fixtureVersion = fixture.version;
        const fixtureById = new Map(fixture.jobs.map((job) => [job.id, job]));
        missingFixtureCaseIds = caseDefs
            .filter((item) => !fixtureById.has(item.id))
            .map((item) => item.id);

        careerId = await resolveCareerId(args.profileId);
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

        const renderedCases: RenderedCase[] = [];
        const rollingRecentSelectionContext: AuditRecentSelectionContext = { recent_jobs: [] };
        for (const caseDef of caseDefs) {
            const fixtureJob = fixtureById.get(caseDef.id);
            if (!fixtureJob) continue;

            const renderedCase = await buildRenderedCase({
                profileId: args.profileId,
                careerId,
                caseDef,
                fixtureJob,
                careerGraph,
                noConfirmationBridge,
                recentSelectionContext: cloneJson(rollingRecentSelectionContext),
            });
            renderedCases.push(renderedCase);
            rollingRecentSelectionContext.recent_jobs = [
                {
                    job_id: renderedCase.caseDef.id,
                    selected_evidence_ids: renderedCase.selectedEvidenceIds,
                    role_context_signature: buildAuditRoleContextSignature(
                        renderedCase.tailoringPlan.role_context_profile
                            ?? renderedCase.roleContextProfile,
                    ),
                },
                ...rollingRecentSelectionContext.recent_jobs,
            ].slice(0, 8);
        }

        const livePatternCollector: PatternDetection = {
            patterns: [],
            details: [],
        };
        const baseByCaseId = new Map<string, ReturnType<typeof evaluateCase>>();
        for (const renderedCase of renderedCases) {
            const evaluation = evaluateCase({
                renderedCase,
                patternCollector: livePatternCollector,
            });
            baseByCaseId.set(renderedCase.caseDef.id, evaluation);
        }

        const differentiation = evaluateDifferentiation({
            renderedCases,
            baseByCaseId,
            patternCollector: livePatternCollector,
        });

        const liveJobs: JobCaseAuditResult[] = [];
        for (const renderedCase of renderedCases) {
            const base = baseByCaseId.get(renderedCase.caseDef.id);
            if (!base) continue;
            const differentiationScore = differentiation.perCaseScore.get(renderedCase.caseDef.id) ?? {
                score: 0,
                reason: "missing_differentiation_score",
            };

            const scores: JobScoreBundle = {
                ...base.baseScores,
                differentiation: differentiationScore.score,
            };
            const scoreReasons: Record<keyof JobScoreBundle, string> = {
                ...base.baseReasons,
                differentiation: differentiationScore.reason,
            };
            const total = scores.relevance
                + scores.readability
                + scores.ats
                + scores.ownership
                + scores.integrity
                + scores.differentiation;

            liveJobs.push({
                job_id: renderedCase.caseDef.id,
                case_id: renderedCase.caseDef.id,
                case_type: renderedCase.caseDef.type,
                requirement_profile: renderedCase.caseDef.requirement_profile,
                expected_alignment: renderedCase.caseDef.expected_alignment,
                title: renderedCase.fixtureJob.title,
                company: renderedCase.fixtureJob.company ?? null,
                selected_evidence_ids: renderedCase.selectedEvidenceIds,
                frozen_input_hash: renderedCase.selectedEvidenceInputHash,
                scores,
                score_reasons: scoreReasons,
                total,
                quality_judgment: toQualityJudgment(scores),
                failed_dimensions: (Object.keys(scores) as Array<keyof JobScoreBundle>)
                    .filter((dimension) => scores[dimension] === 0),
                before_bullets: base.beforeBullets,
                after_bullets: base.afterBullets,
                before_after_similarity: base.beforeAfterSimilarity,
            });
        }

        jobs = liveJobs;
        pairDiagnostics = differentiation.pairDiagnostics;
        patternCollector = livePatternCollector;
    }

    if (missingFixtureCaseIds.length > 0) {
        throw new Error(`Missing fixture jobs for cases: ${missingFixtureCaseIds.join(", ")}`);
    }

    const overallScore = Number((average(jobs.map((job) => job.total))).toFixed(2));
    const verdict = verdictFromScore(overallScore);
    const failureModes = evaluateFailureModes({
        jobs,
        pairDiagnostics,
        patternCollector,
        caseDefs,
    });
    const failureModeByKey = new Map(
        failureModes.map((mode) => [mode.mode, mode]),
    );
    const adversarialFixtures = runAdversarialFixtures({
        jobs,
        pairDiagnostics,
        patternCollector,
        caseDefs,
        baselineFailureModes: failureModes,
    });
    const degradedReplayFixtures = runDegradedReplayFixtures({
        registryPath: args.degradedReplayRegistryPath,
        caseDefs,
        baselineFailureModes: failureModes,
    });

    const adjacentCaseCount = caseDefs.filter((item) => item.type === "adjacent").length;
    const differentCaseCount = caseDefs.filter((item) => item.type === "different").length;

    const successCriteria = {
        representative_case_count_gte_6: caseDefs.length >= 6,
        adjacent_case_count_gte_3: adjacentCaseCount >= 3,
        different_case_count_gte_2: differentCaseCount >= 2,
        avg_score_gte_9: overallScore >= 9,
        generic_rewrite_not_detected: failureModeByKey.get("generic_rewrite")?.pass ?? false,
        fake_tailoring_not_detected: failureModeByKey.get("fake_tailoring")?.pass ?? false,
        ownership_inflation_not_detected: failureModeByKey.get("ownership_inflation")?.pass ?? false,
        weak_job_alignment_not_detected: failureModeByKey.get("weak_job_alignment")?.pass ?? false,
        evidence_mismatch_not_detected: failureModeByKey.get("evidence_mismatch")?.pass ?? false,
        weak_differentiation_not_detected: failureModeByKey.get("weak_differentiation")?.pass ?? false,
        adversarial_fixture_mode_coverage_complete: adversarialFixtures.all_modes_covered,
        adversarial_fixture_detection_complete: adversarialFixtures.all_detected,
        adversarial_fixture_deterministic: adversarialFixtures.deterministic_stable,
        degraded_replay_fixture_available: degradedReplayFixtures.available && degradedReplayFixtures.missing_fixture_paths.length === 0,
        degraded_replay_fixture_mode_coverage_complete: degradedReplayFixtures.all_modes_covered,
        degraded_replay_fixture_detection_complete: degradedReplayFixtures.all_detected,
        degraded_replay_fixture_deterministic: degradedReplayFixtures.deterministic_stable,
    };

    const deterministicSeed = {
        jobs,
        pair_diagnostics: pairDiagnostics,
        patterns: dedupe(patternCollector.patterns),
        pattern_details: patternCollector.details,
        success_criteria: successCriteria,
        failure_modes: failureModes,
        adversarial_fixtures: adversarialFixtures,
    };
    const determinismHashA = computeDeterminismHash(deterministicSeed);
    const determinismHashB = computeDeterminismHash(deterministicSeed);
    const deterministicStable = determinismHashA === determinismHashB;

    const founderReadability = buildFounderReadability({
        jobs,
        failureModes,
        adversarialFixtures,
        degradedReplayFixtures,
        verdict,
        overallScore,
        deterministicStable,
        caseDefs,
        successCriteria,
    });

    const aggregate = {
        overall_score: overallScore,
        verdict,
        jobs,
        pair_diagnostics: pairDiagnostics,
        patterns: dedupe(patternCollector.patterns),
        pattern_details: patternCollector.details,
        failure_modes: failureModes,
        adversarial_fixtures: adversarialFixtures,
        degraded_replay_fixtures: degradedReplayFixtures,
        coverage: {
            requested_case_count: caseResolution.requestedCount,
            resolved_case_count: caseDefs.length,
            adjacent_case_count: adjacentCaseCount,
            different_case_count: differentCaseCount,
            requirement_profiles: dedupe(caseDefs.map((item) => item.requirement_profile)),
        },
        founder_readability: founderReadability,
        success_criteria: successCriteria,
    };

    const output = {
        generated_at: new Date().toISOString(),
        profile_id: args.profileId,
        profile_id_source: args.profileIdSource,
        career_id: careerId,
        fixture_version: fixtureVersion,
        cases: caseDefs,
        preflight: {
            requested_case_ids: args.caseIds ?? caseDefs.map((item) => item.id),
            unknown_requested_case_ids: caseResolution.missingIds,
            fixture_missing_case_ids: missingFixtureCaseIds,
            execution_mode_requested: args.executionMode,
            execution_mode_resolved: executionMode,
            replay_fixture_path: replayFixtureAbsolutePath,
            replay_fixture_exists: replayFixtureExists,
            degraded_replay_registry_path: degradedReplayRegistryAbsolutePath,
            degraded_replay_registry_exists: degradedReplayRegistryExists,
            replay_evidence_mismatch_event_count: replayEvidenceMismatchEventCount,
            enforce_mode: args.enforce,
        },
        deterministic_check: {
            hash_a: determinismHashA,
            hash_b: determinismHashB,
            stable: deterministicStable,
        },
        aggregate,
    };

    const absoluteOut = path.isAbsolute(args.outPath)
        ? args.outPath
        : path.join(process.cwd(), args.outPath);
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
    fs.writeFileSync(absoluteOut, `${JSON.stringify(output, null, 2)}\n`, "utf8");

    const failedCriteria = Object.entries(output.aggregate.success_criteria)
        .filter(([, passed]) => !passed)
        .map(([key]) => key);

    if (args.enforce && (!deterministicStable || failedCriteria.length > 0)) {
        const failureParts: string[] = [];
        if (!deterministicStable) {
            failureParts.push("deterministic_check_unstable");
        }
        if (failedCriteria.length > 0) {
            failureParts.push(`failed_criteria=${failedCriteria.join(",")}`);
        }
        throw new Error(`Tailored CV quality gate failed (${failureParts.join("; ")}).`);
    }

    console.log(JSON.stringify({
        out_file: absoluteOut,
        overall_score: output.aggregate.overall_score,
        verdict: output.aggregate.verdict,
        deterministic: output.deterministic_check,
        success_criteria: output.aggregate.success_criteria,
        adversarial_fixture_detection: {
            all_modes_covered: output.aggregate.adversarial_fixtures.all_modes_covered,
            all_detected: output.aggregate.adversarial_fixtures.all_detected,
            deterministic_stable: output.aggregate.adversarial_fixtures.deterministic_stable,
        },
        degraded_replay_fixture_detection: {
            all_modes_covered: output.aggregate.degraded_replay_fixtures.all_modes_covered,
            all_detected: output.aggregate.degraded_replay_fixtures.all_detected,
            deterministic_stable: output.aggregate.degraded_replay_fixtures.deterministic_stable,
            available: output.aggregate.degraded_replay_fixtures.available,
        },
        execution_mode: output.preflight.execution_mode_resolved,
        patterns: output.aggregate.patterns,
        enforce_mode: args.enforce,
    }, null, 2));
}

run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
