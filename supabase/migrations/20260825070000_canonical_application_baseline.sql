-- CareerTwin canonical application-owned public-schema baseline.
--
-- This is the pre-atomic baseline established from the verified production
-- application schema. Auth identities and Storage buckets/objects are
-- platform-managed and intentionally excluded.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    current_title TEXT,
    years_experience INTEGER,
    seniority_level TEXT,
    industry TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    display_name TEXT,
    raw_text TEXT,
    parsed_json JSONB,
    skills JSONB,
    updated_at TIMESTAMPTZ DEFAULT now(),
    companies JSONB,
    education JSONB,
    contact JSONB,
    parse_quality TEXT,
    missing_fields JSONB,
    capabilities JSONB,
    capability_evidence JSONB
);

CREATE TABLE public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    display_name TEXT,
    file_name TEXT,
    file_type TEXT,
    file_url TEXT,
    raw_text TEXT,
    parsed_json JSONB,
    upload_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    profile_id UUID
);

CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    category TEXT
);

CREATE TABLE public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    skill_id UUID,
    proficiency TEXT
);

CREATE TABLE public.careers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    headline TEXT,
    summary TEXT,
    total_years_experience NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    date_range TEXT NOT NULL,
    location TEXT,
    summary TEXT,
    source_type TEXT CHECK (source_type IN ('resume', 'linkedin', 'manual')),
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.evidence_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    date_range TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    normalized_text TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('resume_bullet', 'linkedin', 'manual', 'interview')),
    role_family TEXT,
    domains JSONB CHECK (domains IS NULL OR jsonb_typeof(domains) = 'array'),
    skills JSONB CHECK (skills IS NULL OR jsonb_typeof(skills) = 'array'),
    capabilities JSONB CHECK (capabilities IS NULL OR jsonb_typeof(capabilities) = 'array'),
    leadership BOOLEAN,
    team_size INTEGER,
    stakeholder_level JSONB CHECK (stakeholder_level IS NULL OR jsonb_typeof(stakeholder_level) = 'array'),
    initiative_type JSONB CHECK (initiative_type IS NULL OR jsonb_typeof(initiative_type) = 'array'),
    impact_type JSONB CHECK (impact_type IS NULL OR jsonb_typeof(impact_type) = 'array'),
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    confidence NUMERIC,
    strength NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    canonical_name TEXT,
    display_name TEXT,
    scope_summary TEXT,
    ownership_summary TEXT,
    impact_summary TEXT,
    confidence_score NUMERIC(5,4) CHECK (
        confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
    ),
    evidence_signal_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_capabilities_career_normalized_name UNIQUE (career_id, normalized_name)
);

CREATE TABLE public.capability_evidence_links (
    capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
    evidence_piece_id UUID NOT NULL REFERENCES public.evidence_pieces(id) ON DELETE CASCADE,
    link_strength NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (capability_id, evidence_piece_id)
);

CREATE TABLE public.evidence_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    evidence_piece_id UUID NOT NULL REFERENCES public.evidence_pieces(id) ON DELETE CASCADE,
    action TEXT,
    domain TEXT,
    initiative_type TEXT,
    scope_level TEXT CHECK (scope_level IN ('task', 'project', 'team', 'function', 'enterprise', 'market')),
    ownership_level TEXT CHECK (ownership_level IN ('contributor', 'driver', 'owner', 'lead')),
    stakeholder_scope JSONB DEFAULT '[]'::jsonb,
    tool_signals JSONB DEFAULT '[]'::jsonb,
    capability_hints JSONB DEFAULT '[]'::jsonb,
    team_signal TEXT,
    impact_signal TEXT,
    confidence_score NUMERIC(5,4) CHECK (
        confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.capability_signal_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
    evidence_signal_id UUID NOT NULL,
    contribution_weight NUMERIC(6,4) CHECK (
        contribution_weight IS NULL OR contribution_weight >= 0
    ),
    rationale TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_capability_signal_links UNIQUE (capability_id, evidence_signal_id)
);

CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_source TEXT,
    external_id TEXT,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    description TEXT,
    job_url TEXT,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_jobs_external_source_external_id UNIQUE (external_source, external_id)
);

CREATE TABLE public.job_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    target_title TEXT,
    role_family TEXT,
    seniority TEXT,
    required_skills JSONB CHECK (required_skills IS NULL OR jsonb_typeof(required_skills) = 'array'),
    preferred_skills JSONB CHECK (preferred_skills IS NULL OR jsonb_typeof(preferred_skills) = 'array'),
    responsibilities JSONB CHECK (responsibilities IS NULL OR jsonb_typeof(responsibilities) = 'array'),
    domains JSONB CHECK (domains IS NULL OR jsonb_typeof(domains) = 'array'),
    keywords JSONB CHECK (keywords IS NULL OR jsonb_typeof(keywords) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_signals_job_id UNIQUE (job_id)
);

CREATE TABLE public.job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    match_score NUMERIC,
    gap_summary JSONB CHECK (
        gap_summary IS NULL OR jsonb_typeof(gap_summary) IN ('object', 'array')
    ),
    matched_capabilities JSONB CHECK (
        matched_capabilities IS NULL OR jsonb_typeof(matched_capabilities) = 'array'
    ),
    status TEXT NOT NULL DEFAULT 'new' CHECK (
        status IN ('new', 'viewed', 'saved', 'skipped', 'applied')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    action_plan JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_job_matches_career_job UNIQUE (career_id, job_id)
);

CREATE TABLE public.job_snapshots (
    job_snapshot_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_platform TEXT NOT NULL CHECK (source_platform IN ('linkedin', 'seek')),
    job_url TEXT,
    job_title TEXT,
    company TEXT,
    location TEXT,
    job_description_raw TEXT NOT NULL,
    job_description_normalized TEXT NOT NULL,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    extraction_quality TEXT NOT NULL DEFAULT 'weak' CHECK (extraction_quality IN ('strong', 'weak')),
    content_hash TEXT NOT NULL,
    job_signals_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_job_interactions (
    interaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_snapshot_id BIGINT NOT NULL REFERENCES public.job_snapshots(job_snapshot_id) ON DELETE CASCADE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'extension' CHECK (source IN ('extension')),
    match_score INTEGER,
    verdict TEXT CHECK (
        verdict IS NULL OR verdict IN ('strong_fit', 'possible_fit', 'stretch', 'low_fit')
    ),
    selected_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    resume_generated BOOLEAN NOT NULL DEFAULT false,
    resume_downloaded_at TIMESTAMPTZ,
    pipeline_status TEXT NOT NULL DEFAULT 'viewed' CHECK (
        pipeline_status IN ('viewed', 'applied', 'interview')
    ),
    pipeline_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_job_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    profile_id UUID,
    job_url TEXT,
    job_title TEXT,
    company TEXT,
    action TEXT NOT NULL CHECK (action IN ('saved', 'applied', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tailored_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    resume_document JSONB NOT NULL CHECK (jsonb_typeof(resume_document) IN ('object', 'array')),
    evidence_piece_ids JSONB CHECK (
        evidence_piece_ids IS NULL OR jsonb_typeof(evidence_piece_ids) = 'array'
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_capabilities_career_id ON public.capabilities(career_id);
CREATE INDEX idx_capabilities_normalized_name ON public.capabilities(normalized_name);
CREATE INDEX idx_capability_evidence_links_evidence_piece_id ON public.capability_evidence_links(evidence_piece_id);
CREATE INDEX idx_capability_signal_links_capability_id ON public.capability_signal_links(capability_id);
CREATE INDEX idx_capability_signal_links_signal_id ON public.capability_signal_links(evidence_signal_id);
CREATE INDEX idx_careers_user_id ON public.careers(user_id);
CREATE INDEX idx_evidence_pieces_capabilities_gin ON public.evidence_pieces USING gin(capabilities);
CREATE INDEX idx_evidence_pieces_career_experience_sort ON public.evidence_pieces(career_id, experience_id, sort_order);
CREATE INDEX idx_evidence_pieces_career_id ON public.evidence_pieces(career_id);
CREATE INDEX idx_evidence_pieces_domains_gin ON public.evidence_pieces USING gin(domains);
CREATE INDEX idx_evidence_pieces_experience_id ON public.evidence_pieces(experience_id);
CREATE INDEX idx_evidence_pieces_role_family ON public.evidence_pieces(role_family);
CREATE INDEX idx_evidence_pieces_skills_gin ON public.evidence_pieces USING gin(skills);
CREATE INDEX idx_evidence_signals_career_id ON public.evidence_signals(career_id);
CREATE INDEX idx_evidence_signals_evidence_piece_id ON public.evidence_signals(evidence_piece_id);
CREATE INDEX idx_experiences_career_id ON public.experiences(career_id);
CREATE INDEX idx_experiences_career_sort_order ON public.experiences(career_id, sort_order);
CREATE INDEX idx_job_matches_career_id ON public.job_matches(career_id);
CREATE INDEX idx_job_matches_job_id ON public.job_matches(job_id);
CREATE INDEX idx_job_matches_match_score ON public.job_matches(match_score DESC);
CREATE INDEX idx_job_matches_status ON public.job_matches(status);
CREATE INDEX idx_job_signals_domains_gin ON public.job_signals USING gin(domains);
CREATE INDEX idx_job_signals_job_id ON public.job_signals(job_id);
CREATE INDEX idx_job_signals_keywords_gin ON public.job_signals USING gin(keywords);
CREATE INDEX idx_job_signals_preferred_skills_gin ON public.job_signals USING gin(preferred_skills);
CREATE INDEX idx_job_signals_required_skills_gin ON public.job_signals USING gin(required_skills);
CREATE INDEX idx_job_signals_responsibilities_gin ON public.job_signals USING gin(responsibilities);
CREATE INDEX idx_job_signals_role_family ON public.job_signals(role_family);
CREATE INDEX idx_job_snapshots_extracted_at ON public.job_snapshots(extracted_at DESC);
CREATE INDEX idx_job_snapshots_job_url ON public.job_snapshots(job_url);
CREATE UNIQUE INDEX uq_job_snapshots_platform_hash ON public.job_snapshots(source_platform, content_hash);
CREATE INDEX idx_jobs_company ON public.jobs(company);
CREATE INDEX idx_jobs_posted_at ON public.jobs(posted_at DESC);
CREATE INDEX idx_jobs_title ON public.jobs(title);
CREATE INDEX idx_tailored_resumes_career_job ON public.tailored_resumes(career_id, job_id);
CREATE INDEX idx_tailored_resumes_job_id ON public.tailored_resumes(job_id);
CREATE INDEX idx_user_job_actions_job_url ON public.user_job_actions(job_url);
CREATE INDEX idx_user_job_actions_profile_id ON public.user_job_actions(profile_id);
CREATE INDEX idx_user_job_actions_user_id ON public.user_job_actions(user_id);
CREATE INDEX idx_user_job_interactions_pipeline_status ON public.user_job_interactions(profile_id, pipeline_status);
CREATE INDEX idx_user_job_interactions_profile_last_seen ON public.user_job_interactions(profile_id, last_seen_at DESC);
CREATE UNIQUE INDEX uq_user_job_interactions_profile_snapshot
    ON public.user_job_interactions(profile_id, job_snapshot_id);

CREATE TRIGGER trg_capabilities_updated_at
BEFORE UPDATE ON public.capabilities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_careers_updated_at
BEFORE UPDATE ON public.careers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_evidence_pieces_updated_at
BEFORE UPDATE ON public.evidence_pieces
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_experiences_updated_at
BEFORE UPDATE ON public.experiences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_job_matches_updated_at
BEFORE UPDATE ON public.job_matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_job_signals_updated_at
BEFORE UPDATE ON public.job_signals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tailored_resumes_updated_at
BEFORE UPDATE ON public.tailored_resumes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to resumes"
    ON public.resumes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read resumes"
    ON public.resumes FOR SELECT
    USING (true);

-- Preserve the verified Supabase API-role privileges for application-owned
-- public objects. RLS remains the row-access boundary where it is enabled.
GRANT ALL ON TABLE
    public.users,
    public.profiles,
    public.resumes,
    public.skills,
    public.user_skills,
    public.careers,
    public.experiences,
    public.evidence_pieces,
    public.capabilities,
    public.capability_evidence_links,
    public.evidence_signals,
    public.capability_signal_links,
    public.jobs,
    public.job_signals,
    public.job_matches,
    public.job_snapshots,
    public.user_job_interactions,
    public.user_job_actions,
    public.tailored_resumes
TO anon, authenticated, service_role;

GRANT ALL ON FUNCTION public.set_updated_at() TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
