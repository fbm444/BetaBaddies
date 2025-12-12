-- Migration: Enhance certifications table for UC-115
-- Adds support for platform, badge images, verification URLs, categories, descriptions, scores, and achievements

-- Add new columns to certifications table
ALTER TABLE public.certifications
    ADD COLUMN IF NOT EXISTS platform character varying(255),
    ADD COLUMN IF NOT EXISTS badge_image character varying(1000),
    ADD COLUMN IF NOT EXISTS verification_url character varying(1000),
    ADD COLUMN IF NOT EXISTS category character varying(50),
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS assessment_scores jsonb,
    ADD COLUMN IF NOT EXISTS achievements jsonb,
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_certifications_category ON public.certifications(category);

-- Create index on platform for faster filtering
CREATE INDEX IF NOT EXISTS idx_certifications_platform ON public.certifications(platform);

-- Create index on user_id and category for faster queries
CREATE INDEX IF NOT EXISTS idx_certifications_user_category ON public.certifications(user_id, category);

-- Add check constraint for valid categories (optional, can be extended)
-- Common categories: coding, business, design, data-science, cloud, security, etc.
-- We'll allow any category but could add validation if needed

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_certification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_certification_timestamp ON public.certifications;

CREATE TRIGGER trg_update_certification_timestamp
    BEFORE UPDATE ON public.certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_certification_timestamp();

