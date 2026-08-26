-- c:\Users\chloe\SandboxProjects\careertwin\supabase\migrations\20260309000000_add_job_match_fields.sql
ALTER TABLE job_matches
ADD COLUMN IF NOT EXISTS strategy JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS action_plan JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS twin_score INTEGER,
ADD COLUMN IF NOT EXISTS twin_score_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS simulation JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_title TEXT,
ADD COLUMN IF NOT EXISTS target_company TEXT;
