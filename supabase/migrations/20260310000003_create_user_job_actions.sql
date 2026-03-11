CREATE TABLE IF NOT EXISTS user_job_actions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_url TEXT,
    job_title TEXT NOT NULL,
    company TEXT,
    action TEXT NOT NULL CHECK (action IN ('saved', 'applied', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_job_actions_user_id ON user_job_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_job_url ON user_job_actions(job_url);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_action ON user_job_actions(action);
