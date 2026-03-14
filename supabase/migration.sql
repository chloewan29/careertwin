-- LEGACY schema artifact.
-- compatibility-only reference.
-- canonical schema source of truth: supabase/migrations/*
-- do not use for new runtime paths.
-- see: supabase/SCHEMA_SOURCE_OF_TRUTH.md

-- CareerTwin Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Resumes
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Career data (structured extraction)
CREATE TABLE IF NOT EXISTS career_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  summary TEXT,
  skills JSONB DEFAULT '[]',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Job descriptions
CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  company TEXT,
  raw_text TEXT NOT NULL,
  required_skills JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Match results
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_data_id UUID REFERENCES career_data(id) ON DELETE CASCADE,
  job_description_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
  overall_score INTEGER,
  skill_matches JSONB DEFAULT '[]',
  skill_gaps JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Allow public uploads to resumes bucket (MVP - no auth)
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'resumes');

-- 8. RLS policies for tables (MVP - allow all for anon)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on profiles" ON profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on resumes" ON resumes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on career_data" ON career_data FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on job_descriptions" ON job_descriptions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on match_results" ON match_results FOR ALL TO anon USING (true) WITH CHECK (true);
