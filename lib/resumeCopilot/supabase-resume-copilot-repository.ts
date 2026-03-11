import type { SupabaseClient } from "@supabase/supabase-js";
import type {
    EvidencePiece,
    JobSignals,
    ResumeCopilotRepository,
    UUID,
} from "@/lib/resumeCopilot/resume-copilot-engine";

export type ResumeCopilotRepositoryErrorCode =
    | "JOB_SIGNALS_NOT_FOUND"
    | "JOB_SIGNALS_LOAD_FAILED"
    | "EVIDENCE_LOAD_FAILED";

export class ResumeCopilotRepositoryError extends Error {
    constructor(
        message: string,
        public readonly code: ResumeCopilotRepositoryErrorCode,
    ) {
        super(message);
        this.name = "ResumeCopilotRepositoryError";
    }
}

type JobSignalsRow = {
    job_id: string;
    target_title: string | null;
    role_family: string | null;
    required_skills: unknown;
    preferred_skills: unknown;
    responsibilities: unknown;
    domains: unknown;
    keywords: unknown;
};

type EvidencePieceRow = {
    id: string;
    experience_id: string | null;
    career_id: string;
    raw_text: string | null;
    source_type: string | null;
    metadata?: Record<string, unknown> | null;
};

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export class SupabaseResumeCopilotRepository implements ResumeCopilotRepository {
    constructor(private readonly supabase: SupabaseClient) {}

    async getJobSignals(jobId: UUID): Promise<JobSignals> {
        const { data, error } = await this.supabase
            .from("job_signals")
            .select("job_id, target_title, role_family, required_skills, preferred_skills, responsibilities, domains, keywords")
            .eq("job_id", jobId)
            .single();

        if (error) {
            const code = error.code === "PGRST116" ? "JOB_SIGNALS_NOT_FOUND" : "JOB_SIGNALS_LOAD_FAILED";
            throw new ResumeCopilotRepositoryError(
                `Failed to load job_signals for job_id=${jobId}: ${error.message}`,
                code,
            );
        }
        if (!data) {
            throw new ResumeCopilotRepositoryError(
                `No job_signals found for job_id=${jobId}`,
                "JOB_SIGNALS_NOT_FOUND",
            );
        }

        const row = data as JobSignalsRow;
        const jobSignals: JobSignals = {
            job_id: row.job_id,
            target_title: row.target_title,
            normalized_role_family: row.role_family,
            required_skills: toStringArray(row.required_skills),
            preferred_skills: toStringArray(row.preferred_skills),
            responsibilities: toStringArray(row.responsibilities),
            domain_tokens: toStringArray(row.domains),
            keywords: toStringArray(row.keywords),
        };

        console.log("resume-copilot repository: loaded job_signals", {
            jobId,
            requiredSkills: jobSignals.required_skills.length,
            preferredSkills: jobSignals.preferred_skills.length,
            responsibilities: jobSignals.responsibilities.length,
            domains: jobSignals.domain_tokens.length,
            keywords: jobSignals.keywords.length,
        });

        return jobSignals;
    }

    async getEvidencePiecesForCareer(careerId: UUID): Promise<EvidencePiece[]> {
        const { data, error } = await this.supabase
            .from("evidence_pieces")
            .select("id, experience_id, career_id, raw_text, source_type")
            .eq("career_id", careerId)
            .order("sort_order", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true });

        if (error) {
            throw new ResumeCopilotRepositoryError(
                `Failed to load evidence_pieces for career_id=${careerId}: ${error.message}`,
                "EVIDENCE_LOAD_FAILED",
            );
        }

        const rows = (data ?? []) as EvidencePieceRow[];
        const evidencePieces = rows
            .filter((row) => typeof row.raw_text === "string" && row.raw_text.trim().length > 0)
            .map((row) => ({
                id: row.id,
                career_id: row.career_id,
                experience_id: row.experience_id,
                company: null,
                role: null,
                date_range: null,
                raw_text: row.raw_text ?? "",
                source_type: row.source_type,
            }));

        console.log("resume-copilot repository: loaded evidence_pieces", {
            careerId,
            totalRows: rows.length,
            usableRows: evidencePieces.length,
        });

        return evidencePieces;
    }

    async getCareerSummary(careerId: UUID): Promise<string | null> {
        const { data, error } = await this.supabase
            .from("careers")
            .select("summary")
            .eq("id", careerId)
            .single();

        if (error || !data) {
            return null;
        }

        const summary = (data as { summary: string | null }).summary;
        return typeof summary === "string" && summary.trim().length > 0 ? summary : null;
    }
}
