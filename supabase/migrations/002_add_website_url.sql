-- Add website_url column for linking to real booking sites
ALTER TABLE properties ADD COLUMN IF NOT EXISTS website_url TEXT;
