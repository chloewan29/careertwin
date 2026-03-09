-- Add missing columns to profiles table since it already existed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_experience NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seniority_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS summary TEXT;
