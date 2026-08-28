ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS capability_evidence JSONB NOT NULL DEFAULT '[]'::jsonb;
