-- CareerTwin evidence/capability graph upgrade.
-- Resume-based ingestion remains conservative: unknown/missing values are stored explicitly for later enrichment.

alter table if exists public.evidence_pieces
    add column if not exists evidence_source_type text,
    add column if not exists summary text,
    add column if not exists action text,
    add column if not exists impact text,
    add column if not exists stakeholders text[] default '{}'::text[],
    add column if not exists tools_methods text[] default '{}'::text[],
    add column if not exists business_context text,
    add column if not exists inferred_scale jsonb,
    add column if not exists inferred_scope jsonb,
    add column if not exists confidence numeric,
    add column if not exists missing_fields text[] default '{}'::text[];

update public.evidence_pieces
set evidence_source_type = coalesce(evidence_source_type, case
    when source_type in ('interview') then 'interview'
    when source_type in ('manual') then 'manual'
    when source_type in ('linkedin') then 'imported_doc'
    else 'resume'
end);

alter table if exists public.evidence_pieces
    alter column evidence_source_type set default 'resume';

alter table if exists public.capabilities
    add column if not exists evidence_count integer default 0,
    add column if not exists supporting_evidence_ids uuid[] default '{}'::uuid[],
    add column if not exists context_domains text[] default '{}'::text[],
    add column if not exists scale_summary jsonb,
    add column if not exists confidence_level text;

