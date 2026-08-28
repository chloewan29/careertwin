CREATE TABLE IF NOT EXISTS user_job_feed_memory (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canonical_job_id TEXT NOT NULL,
    job_url TEXT,
    job_title TEXT NOT NULL,
    company TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_new BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_job_feed_memory_user_job_unique UNIQUE (user_id, canonical_job_id)
);

CREATE INDEX IF NOT EXISTS idx_user_job_feed_memory_user_id ON user_job_feed_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_feed_memory_user_last_seen ON user_job_feed_memory(user_id, last_seen_at DESC);

