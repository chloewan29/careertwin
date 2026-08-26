-- c:\Users\chloe\SandboxProjects\careertwin\supabase\02_structured_career_schema.sql

-- users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_title TEXT,
    years_experience NUMERIC,
    seniority_level TEXT,
    industry TEXT,
    summary TEXT
);

-- skills
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT
);

-- user_skills
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    proficiency TEXT,
    UNIQUE(user_id, skill_id)
);

-- job_matches
CREATE TABLE IF NOT EXISTS job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_description TEXT NOT NULL,
    match_score INTEGER,
    missing_skills JSONB DEFAULT '[]',
    matched_skills JSONB DEFAULT '[]',
    gap_analysis JSONB DEFAULT '{}',
    strategy JSONB DEFAULT '{}',
    action_plan JSONB DEFAULT '{}',
    evidence JSONB DEFAULT '{}',
    twin_score INTEGER,
    twin_score_breakdown JSONB DEFAULT '{}',
    simulation JSONB DEFAULT '{}',
    target_title TEXT,
    target_company TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add basic RLS policies to allow anon usage for MVP
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on skills" ON skills FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_skills" ON user_skills FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on job_matches" ON job_matches FOR ALL TO anon USING (true) WITH CHECK (true);
