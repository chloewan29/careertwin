import { getEvidenceForCapability } from "../capability/capability-graph";
import { loadCareerGraph, type Capability, type CareerGraph, type EvidencePiece } from "../memory/career-graph-loader";
import { getRoleFit } from "./role-fit-service";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";

export type JobSignalsInput = {
    job_id: string;
    target_title: string | null;
    role_family: string | null;
    required_skills: unknown;
    preferred_skills: unknown;
    responsibilities: unknown;
    domains: unknown;
    keywords: unknown;
};

export type JobMatchExplainability = {
    matchScore: number;
    matchedCapabilities: Capability[];
    missingCapabilities: string[];
    supportingEvidence: EvidencePiece[];
    fitSummary: string;
};

function normalizeText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function dedupeStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const value of values) {
        const key = normalizeText(value);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(value.trim());
    }

    return deduped;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    const deduped: T[] = [];

    for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        deduped.push(item);
    }

    return deduped;
}

function inferTargetRole(jobSignals: JobSignalsInput): string | null {
    const title = jobSignals.target_title?.trim();
    if (title) return title;

    const roleFamily = jobSignals.role_family?.trim();
    if (roleFamily) return roleFamily;

    return null;
}

function inferSignalMissingCapabilities(careerGraph: CareerGraph, jobSignals: JobSignalsInput): string[] {
    const requiredSkills = toStringArray(jobSignals.required_skills);
    if (requiredSkills.length === 0) return [];

    const capabilityNames = new Set(
        careerGraph.capabilities.flatMap((capability) => [
            normalizeText(capability.name),
            normalizeText(capability.normalized_name),
        ]),
    );

    return requiredSkills
        .filter((skill) => !capabilityNames.has(normalizeText(skill)))
        .sort((a, b) => a.localeCompare(b));
}

export function explainJobMatchFromSignals(params: {
    careerGraph: CareerGraph;
    jobSignals: JobSignalsInput;
    matchScore?: number | null;
}): JobMatchExplainability {
    const targetRole = inferTargetRole(params.jobSignals);
    const roleFit = targetRole
        ? getRoleFit(params.careerGraph, targetRole)
        : {
            fitScore: 0,
            matchedCapabilities: [] as Capability[],
            missingCapabilities: [] as string[],
            supportingEvidence: [] as EvidencePiece[],
        };

    const matchedCapabilities = dedupeById(roleFit.matchedCapabilities)
        .sort((a, b) => a.name.localeCompare(b.name));

    const supportingEvidence = dedupeById(
        matchedCapabilities.flatMap((capability) => getEvidenceForCapability(params.careerGraph, capability.id)),
    ).sort((a, b) => a.id.localeCompare(b.id));

    const missingCapabilities = dedupeStrings([
        ...roleFit.missingCapabilities,
        ...inferSignalMissingCapabilities(params.careerGraph, params.jobSignals),
    ]).sort((a, b) => a.localeCompare(b));

    const matchScore = typeof params.matchScore === "number"
        ? Math.max(0, Math.min(100, Math.round(params.matchScore)))
        : roleFit.fitScore;

    const roleLabel = targetRole ?? "this job";
    const fitSummary = `Match score ${matchScore}/100 for ${roleLabel}. Matched ${matchedCapabilities.length} capabilities with ${supportingEvidence.length} evidence items. ${missingCapabilities.length > 0 ? `Missing capability signals: ${missingCapabilities.join(", ")}.` : "No capability gaps identified from current signals."}`;

    return {
        matchScore,
        matchedCapabilities,
        missingCapabilities,
        supportingEvidence,
        fitSummary,
    };
}

export async function explainJobMatch(params: {
    profileId: string;
    jobId: string;
}): Promise<JobMatchExplainability> {
    const careerGraph = await loadCareerGraph(params.profileId);
    if (!careerGraph.career) {
        throw new Error(`No career found for profileId=${params.profileId}`);
    }

    const supabase = createServerSupabaseClient();
    const [{ data: signalRow, error: signalError }, { data: matchRows, error: matchError }] = await Promise.all([
        supabase
            .from("job_signals")
            .select("job_id, target_title, role_family, required_skills, preferred_skills, responsibilities, domains, keywords")
            .eq("job_id", params.jobId)
            .single(),
        supabase
            .from("job_matches")
            .select("match_score")
            .eq("career_id", careerGraph.career.id)
            .eq("job_id", params.jobId)
            .limit(1),
    ]);

    if (signalError) {
        throw new Error(`Failed to load job_signals for job_id=${params.jobId}: ${signalError.message}`);
    }
    if (!signalRow) {
        throw new Error(`No job_signals found for job_id=${params.jobId}`);
    }
    if (matchError) {
        throw new Error(`Failed to load job_matches for job_id=${params.jobId}: ${matchError.message}`);
    }

    const matchScore = (matchRows?.[0] as { match_score?: number } | undefined)?.match_score ?? null;
    return explainJobMatchFromSignals({
        careerGraph,
        jobSignals: signalRow as JobSignalsInput,
        matchScore,
    });
}

