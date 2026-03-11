CREATE TABLE IF NOT EXISTS job_snapshots (
    job_snapshot_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_platform TEXT NOT NULL,
    job_url TEXT,
    job_title TEXT,
    company TEXT,
    location TEXT,
    job_description_raw TEXT NOT NULL,
    job_description_normalized TEXT NOT NULL,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    extraction_quality TEXT NOT NULL DEFAULT 'weak',
    content_hash TEXT NOT NULL,
    job_signals_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_job_snapshots_source_platform CHECK (source_platform IN ('linkedin', 'seek')),
    CONSTRAINT chk_job_snapshots_extraction_quality CHECK (extraction_quality IN ('strong', 'weak'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_snapshots_platform_hash ON job_snapshots(source_platform, content_hash);
CREATE INDEX IF NOT EXISTS idx_job_snapshots_job_url ON job_snapshots(job_url);
CREATE INDEX IF NOT EXISTS idx_job_snapshots_extracted_at ON job_snapshots(extracted_at DESC);

CREATE TABLE IF NOT EXISTS user_job_interactions (
    interaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_snapshot_id BIGINT NOT NULL REFERENCES job_snapshots(job_snapshot_id) ON DELETE CASCADE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'extension',
    match_score INTEGER,
    verdict TEXT,
    selected_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    resume_generated BOOLEAN NOT NULL DEFAULT FALSE,
    resume_downloaded_at TIMESTAMPTZ,
    pipeline_status TEXT NOT NULL DEFAULT 'viewed',
    pipeline_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_job_interactions_source CHECK (source IN ('extension')),
    CONSTRAINT chk_user_job_interactions_pipeline_status CHECK (pipeline_status IN ('viewed', 'applied', 'interview')),
    CONSTRAINT chk_user_job_interactions_verdict CHECK (
        verdict IS NULL OR verdict IN ('strong_fit', 'possible_fit', 'stretch', 'low_fit')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_job_interactions_profile_snapshot
    ON user_job_interactions(profile_id, job_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_user_job_interactions_profile_last_seen
    ON user_job_interactions(profile_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_job_interactions_pipeline_status
    ON user_job_interactions(profile_id, pipeline_status);

