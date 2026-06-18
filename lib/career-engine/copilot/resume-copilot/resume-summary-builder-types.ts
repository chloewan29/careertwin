export type ResumeSummaryDebug = {
    weak_jd_mode: boolean;
    source_evidence_ids: string[];
    source_companies: string[];
    source_roles: string[];
    source_themes: string[];
    source_matched_capabilities: string[];
    target_title_used: string | null;
    role_family_used: string | null;
    ranked_experience_order: Array<{
        company: string;
        role: string;
        score: number;
        recency_rank: number;
    }>;
};
