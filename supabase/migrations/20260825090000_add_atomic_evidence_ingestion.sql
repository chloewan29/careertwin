-- Canonical Career Memory atomic-evidence materialization.
-- Additive and revision-scoped: prior resume materializations remain immutable history.

ALTER TABLE IF EXISTS public.resumes
    ADD COLUMN IF NOT EXISTS content_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS materialization_version TEXT,
    ADD COLUMN IF NOT EXISTS materialization_status TEXT,
    ADD COLUMN IF NOT EXISTS materialized_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_resumes_profile_content_sha256
    ON public.resumes(profile_id, content_sha256);

ALTER TABLE IF EXISTS public.careers
    ADD COLUMN IF NOT EXISTS active_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.experiences
    ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES public.resumes(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS source_revision_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS source_role_ref TEXT,
    ADD COLUMN IF NOT EXISTS materialization_version TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_experiences_revision_role
    ON public.experiences(career_id, source_revision_sha256, source_role_ref);

CREATE INDEX IF NOT EXISTS idx_experiences_resume_id
    ON public.experiences(resume_id);

CREATE TABLE IF NOT EXISTS public.career_source_units (
    id UUID PRIMARY KEY,
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE RESTRICT,
    experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
    source_revision_sha256 TEXT NOT NULL,
    source_role_ref TEXT NOT NULL,
    source_unit_ref TEXT NOT NULL,
    source_unit_ordinal INTEGER NOT NULL CHECK (source_unit_ordinal >= 0),
    source_unit_sha256 TEXT NOT NULL,
    source_text TEXT NOT NULL,
    fate TEXT NOT NULL CHECK (fate IN (
        'ATOMIC_EVIDENCE_CREATED',
        'VALID_NO_EVIDENCE',
        'AMBIGUOUS',
        'PROVIDER_FAILURE',
        'VALIDATION_REJECTED'
    )),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    provider_version TEXT NOT NULL,
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(validation_errors) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_career_source_units_revision_ref UNIQUE (career_id, source_revision_sha256, source_unit_ref)
);

CREATE INDEX IF NOT EXISTS idx_career_source_units_resume_id
    ON public.career_source_units(resume_id);

CREATE INDEX IF NOT EXISTS idx_career_source_units_experience_id
    ON public.career_source_units(experience_id);

ALTER TABLE IF EXISTS public.evidence_pieces
    ADD COLUMN IF NOT EXISTS resume_id UUID REFERENCES public.resumes(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS source_revision_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS source_role_ref TEXT,
    ADD COLUMN IF NOT EXISTS source_unit_id UUID REFERENCES public.career_source_units(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS source_unit_ref TEXT,
    ADD COLUMN IF NOT EXISTS source_unit_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS source_quote TEXT,
    ADD COLUMN IF NOT EXISTS source_span_start INTEGER,
    ADD COLUMN IF NOT EXISTS source_span_end INTEGER,
    ADD COLUMN IF NOT EXISTS atomic_index INTEGER,
    ADD COLUMN IF NOT EXISTS atomic_statement TEXT,
    ADD COLUMN IF NOT EXISTS context TEXT,
    ADD COLUMN IF NOT EXISTS outcome TEXT,
    ADD COLUMN IF NOT EXISTS source_supported_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS provider_model TEXT,
    ADD COLUMN IF NOT EXISTS provider_version TEXT,
    ADD COLUMN IF NOT EXISTS review_status TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_pieces_revision_unit_atomic_index
    ON public.evidence_pieces(career_id, source_revision_sha256, source_unit_ref, atomic_index);

CREATE INDEX IF NOT EXISTS idx_evidence_pieces_resume_id
    ON public.evidence_pieces(resume_id);

CREATE INDEX IF NOT EXISTS idx_evidence_pieces_source_unit_id
    ON public.evidence_pieces(source_unit_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_evidence_pieces_atomic_span') THEN
        ALTER TABLE public.evidence_pieces
            ADD CONSTRAINT chk_evidence_pieces_atomic_span
            CHECK (
                source_span_start IS NULL
                OR (source_span_start >= 0 AND source_span_end > source_span_start)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_evidence_pieces_extraction_confidence') THEN
        ALTER TABLE public.evidence_pieces
            ADD CONSTRAINT chk_evidence_pieces_extraction_confidence
            CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_evidence_pieces_review_status') THEN
        ALTER TABLE public.evidence_pieces
            ADD CONSTRAINT chk_evidence_pieces_review_status
            CHECK (review_status IS NULL OR review_status IN ('machine_validated', 'needs_review', 'confirmed', 'rejected'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_evidence_pieces_source_supported_metrics') THEN
        ALTER TABLE public.evidence_pieces
            ADD CONSTRAINT chk_evidence_pieces_source_supported_metrics
            CHECK (jsonb_typeof(source_supported_metrics) = 'array');
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_careers_active_resume_id
    ON public.careers(active_resume_id);
