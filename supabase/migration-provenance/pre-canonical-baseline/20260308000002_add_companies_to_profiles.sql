-- Add companies array to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS companies TEXT[] DEFAULT '{}';
