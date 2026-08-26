ALTER TABLE user_job_actions
    ADD COLUMN IF NOT EXISTS source_platform TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS job_description_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS match_score INTEGER,
    ADD COLUMN IF NOT EXISTS verdict TEXT,
    ADD COLUMN IF NOT EXISTS selected_evidence_ids JSONB,
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_job_actions_source_platform ON user_job_actions(source_platform);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_applied_at ON user_job_actions(applied_at);

