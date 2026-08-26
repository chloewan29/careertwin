ALTER TABLE user_job_actions
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE user_job_actions
    ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_job_actions_profile_id ON user_job_actions(profile_id);

