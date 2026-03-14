-- LEGACY schema artifact.
-- compatibility-only reference.
-- canonical schema source of truth: supabase/migrations/*
-- do not use for new runtime paths.
-- see: supabase/SCHEMA_SOURCE_OF_TRUTH.md

-- ============================================================================
-- CareerTwin Supabase Migration
-- ============================================================================
-- CareerTwin is a Career Intelligence System.
--
-- The database is designed around:
-- 1. Career as root container
-- 2. Experience as timeline layer
-- 3. EvidencePiece as intelligence layer
-- 4. Capability as inference layer
-- 5. JobSignal as target-role layer
--
-- Resume output is not the core system record.
-- EvidencePieces and Capabilities are the core memory model.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- Extensions
-- --------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- updated_at helper
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- careers
-- --------------------------------------------------------------------------
create table if not exists public.careers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  headline text,
  summary text,
  total_years_experience numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_careers_user_id
  on public.careers(user_id);

create trigger trg_careers_updated_at
before update on public.careers
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- experiences
-- --------------------------------------------------------------------------
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,

  company text not null,
  title text not null,
  date_range text not null,

  location text,
  summary text,

  source_type text
    check (source_type in ('resume', 'linkedin', 'manual')),

  sort_order integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiences_career_id
  on public.experiences(career_id);

create index if not exists idx_experiences_career_sort_order
  on public.experiences(career_id, sort_order);

create trigger trg_experiences_updated_at
before update on public.experiences
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- evidence_pieces
-- --------------------------------------------------------------------------
create table if not exists public.evidence_pieces (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,

  company text not null,
  role text not null,
  date_range text not null,

  raw_text text not null,
  normalized_text text,

  source_type text not null
    check (source_type in ('resume_bullet', 'linkedin', 'manual', 'interview')),

  role_family text,
  domains jsonb,
  skills jsonb,
  capabilities jsonb,

  leadership boolean,
  team_size integer,
  stakeholder_level jsonb,
  initiative_type jsonb,
  impact_type jsonb,

  sort_order integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_evidence_domains_array
    check (domains is null or jsonb_typeof(domains) = 'array'),
  constraint chk_evidence_skills_array
    check (skills is null or jsonb_typeof(skills) = 'array'),
  constraint chk_evidence_capabilities_array
    check (capabilities is null or jsonb_typeof(capabilities) = 'array'),
  constraint chk_evidence_stakeholder_level_array
    check (stakeholder_level is null or jsonb_typeof(stakeholder_level) = 'array'),
  constraint chk_evidence_initiative_type_array
    check (initiative_type is null or jsonb_typeof(initiative_type) = 'array'),
  constraint chk_evidence_impact_type_array
    check (impact_type is null or jsonb_typeof(impact_type) = 'array')
);

create index if not exists idx_evidence_pieces_career_id
  on public.evidence_pieces(career_id);

create index if not exists idx_evidence_pieces_experience_id
  on public.evidence_pieces(experience_id);

create index if not exists idx_evidence_pieces_career_experience_sort
  on public.evidence_pieces(career_id, experience_id, sort_order);

create index if not exists idx_evidence_pieces_role_family
  on public.evidence_pieces(role_family);

create index if not exists idx_evidence_pieces_domains_gin
  on public.evidence_pieces using gin (domains);

create index if not exists idx_evidence_pieces_skills_gin
  on public.evidence_pieces using gin (skills);

create index if not exists idx_evidence_pieces_capabilities_gin
  on public.evidence_pieces using gin (capabilities);

create trigger trg_evidence_pieces_updated_at
before update on public.evidence_pieces
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- capabilities
-- --------------------------------------------------------------------------
create table if not exists public.capabilities (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,

  name text not null,
  normalized_name text not null,

  confidence numeric,
  strength numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_capabilities_career_normalized_name
    unique (career_id, normalized_name)
);

create index if not exists idx_capabilities_career_id
  on public.capabilities(career_id);

create index if not exists idx_capabilities_normalized_name
  on public.capabilities(normalized_name);

create trigger trg_capabilities_updated_at
before update on public.capabilities
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- capability_evidence_links
-- --------------------------------------------------------------------------
create table if not exists public.capability_evidence_links (
  capability_id uuid not null references public.capabilities(id) on delete cascade,
  evidence_piece_id uuid not null references public.evidence_pieces(id) on delete cascade,

  link_strength numeric,

  created_at timestamptz not null default now(),

  primary key (capability_id, evidence_piece_id)
);

create index if not exists idx_capability_evidence_links_evidence_piece_id
  on public.capability_evidence_links(evidence_piece_id);

-- --------------------------------------------------------------------------
-- jobs
-- --------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),

  external_source text,
  external_id text,

  title text not null,
  company text,
  location text,
  description text,

  job_url text,
  posted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_jobs_external_source_external_id
    unique (external_source, external_id)
);

create index if not exists idx_jobs_title
  on public.jobs(title);

create index if not exists idx_jobs_company
  on public.jobs(company);

create index if not exists idx_jobs_posted_at
  on public.jobs(posted_at desc);

create trigger trg_jobs_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- job_signals
-- --------------------------------------------------------------------------
create table if not exists public.job_signals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,

  target_title text,
  role_family text,
  seniority text,

  required_skills jsonb,
  preferred_skills jsonb,
  responsibilities jsonb,
  domains jsonb,
  keywords jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_job_signals_job_id
    unique (job_id),

  constraint chk_job_signals_required_skills_array
    check (required_skills is null or jsonb_typeof(required_skills) = 'array'),
  constraint chk_job_signals_preferred_skills_array
    check (preferred_skills is null or jsonb_typeof(preferred_skills) = 'array'),
  constraint chk_job_signals_responsibilities_array
    check (responsibilities is null or jsonb_typeof(responsibilities) = 'array'),
  constraint chk_job_signals_domains_array
    check (domains is null or jsonb_typeof(domains) = 'array'),
  constraint chk_job_signals_keywords_array
    check (keywords is null or jsonb_typeof(keywords) = 'array')
);

create index if not exists idx_job_signals_job_id
  on public.job_signals(job_id);

create index if not exists idx_job_signals_role_family
  on public.job_signals(role_family);

create index if not exists idx_job_signals_required_skills_gin
  on public.job_signals using gin (required_skills);

create index if not exists idx_job_signals_preferred_skills_gin
  on public.job_signals using gin (preferred_skills);

create index if not exists idx_job_signals_responsibilities_gin
  on public.job_signals using gin (responsibilities);

create index if not exists idx_job_signals_domains_gin
  on public.job_signals using gin (domains);

create index if not exists idx_job_signals_keywords_gin
  on public.job_signals using gin (keywords);

create trigger trg_job_signals_updated_at
before update on public.job_signals
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- job_matches
-- --------------------------------------------------------------------------
create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),

  career_id uuid not null references public.careers(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,

  match_score numeric,
  gap_summary jsonb,
  matched_capabilities jsonb,

  status text not null default 'new'
    check (status in ('new', 'viewed', 'saved', 'skipped', 'applied')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_job_matches_career_job
    unique (career_id, job_id),

  constraint chk_job_matches_gap_summary_object
    check (gap_summary is null or jsonb_typeof(gap_summary) in ('object', 'array')),
  constraint chk_job_matches_matched_capabilities_array
    check (matched_capabilities is null or jsonb_typeof(matched_capabilities) = 'array')
);

create index if not exists idx_job_matches_career_id
  on public.job_matches(career_id);

create index if not exists idx_job_matches_job_id
  on public.job_matches(job_id);

create index if not exists idx_job_matches_status
  on public.job_matches(status);

create index if not exists idx_job_matches_match_score
  on public.job_matches(match_score desc);

create trigger trg_job_matches_updated_at
before update on public.job_matches
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- tailored_resumes
-- --------------------------------------------------------------------------
create table if not exists public.tailored_resumes (
  id uuid primary key default gen_random_uuid(),

  career_id uuid not null references public.careers(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,

  resume_document jsonb not null,
  evidence_piece_ids jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_tailored_resumes_resume_document_object
    check (jsonb_typeof(resume_document) in ('object', 'array')),
  constraint chk_tailored_resumes_evidence_piece_ids_array
    check (evidence_piece_ids is null or jsonb_typeof(evidence_piece_ids) = 'array')
);

create index if not exists idx_tailored_resumes_career_job
  on public.tailored_resumes(career_id, job_id);

create index if not exists idx_tailored_resumes_job_id
  on public.tailored_resumes(job_id);

create trigger trg_tailored_resumes_updated_at
before update on public.tailored_resumes
for each row
execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- Optional: row level security
-- --------------------------------------------------------------------------
-- Uncomment after you confirm auth model.
-- Assumes careers.user_id maps to auth.users.id.

-- alter table public.careers enable row level security;
-- alter table public.experiences enable row level security;
-- alter table public.evidence_pieces enable row level security;
-- alter table public.capabilities enable row level security;
-- alter table public.capability_evidence_links enable row level security;
-- alter table public.jobs enable row level security;
-- alter table public.job_signals enable row level security;
-- alter table public.job_matches enable row level security;
-- alter table public.tailored_resumes enable row level security;

-- Example policy:
-- create policy "Users can view own careers"
-- on public.careers
-- for select
-- using (auth.uid() = user_id);

-- create policy "Users can manage own careers"
-- on public.careers
-- for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);

commit;
