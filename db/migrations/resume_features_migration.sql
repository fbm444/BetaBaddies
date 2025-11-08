-- ============================================================================
-- Resume Features Database Migration
-- ============================================================================
-- This migration script consolidates all database changes needed for the
-- resume features (AI assistant, versioning, export, etc.)
--
-- Run this script as a database superuser (e.g., postgres user)
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -U postgres -d your_database_name -f db/migrations/resume_features_migration.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create base tables if they don't exist
-- ============================================================================

-- Create resume table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resume (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_name character varying(255) DEFAULT 'New_Resume'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file character varying(1000),
    CONSTRAINT resume_pkey PRIMARY KEY (id)
);

-- Create resume_template table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resume_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    description text,
    colors text,
    fonts text,
    existing_resume_template character varying(1000),
    CONSTRAINT resume_template_pkey PRIMARY KEY (id)
);

-- Create resume_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resume_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid,
    commenter character varying(255),
    comment text,
    CONSTRAINT resume_comments_pkey PRIMARY KEY (id)
);

-- Create resume_tailoring table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.resume_tailoring (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    workexp_description text,
    CONSTRAINT resume_tailoring_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- PART 2: Add missing columns to resume table
-- ============================================================================

-- Add template_id (foreign key to resume_template)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'template_id'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN template_id UUID;
    END IF;
END $$;

-- Add foreign key constraint for template_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'fk_resume_template'
    ) THEN
        ALTER TABLE public.resume 
        ADD CONSTRAINT fk_resume_template 
        FOREIGN KEY (template_id) REFERENCES public.resume_template(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add job_id (foreign key to prospectivejobs/jobs table)
-- Note: Check if table is named 'jobs' or 'prospectivejobs' in your schema
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'job_id'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN job_id UUID;
    END IF;
END $$;

-- Add foreign key constraint for job_id
-- Handle both 'jobs' and 'prospectivejobs' table names
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'fk_resume_job'
    ) THEN
        -- Check if 'jobs' table exists (used by the application)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
            ALTER TABLE public.resume 
            ADD CONSTRAINT fk_resume_job 
            FOREIGN KEY (job_id) REFERENCES public.jobs(id) 
            ON DELETE SET NULL;
        -- Fallback to 'prospectivejobs' if 'jobs' doesn't exist (from original dump)
        ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospectivejobs') THEN
            ALTER TABLE public.resume 
            ADD CONSTRAINT fk_resume_job 
            FOREIGN KEY (job_id) REFERENCES public.prospectivejobs(id) 
            ON DELETE SET NULL;
        ELSE
            RAISE NOTICE 'Warning: Neither jobs nor prospectivejobs table found. Skipping job_id foreign key constraint.';
        END IF;
    END IF;
END $$;

-- Add content (JSONB for resume content)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN content JSONB;
    END IF;
END $$;

-- Add section_config (JSONB for section configuration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'section_config'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN section_config JSONB;
    END IF;
END $$;

-- Add customizations (JSONB for layout customizations)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'customizations'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN customizations JSONB;
    END IF;
END $$;

-- Add version_number (integer for version tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'version_number'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN version_number INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add parent_resume_id (self-referencing foreign key for resume versions)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'parent_resume_id'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN parent_resume_id UUID;
    END IF;
END $$;

-- Add foreign key constraint for parent_resume_id (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'fk_resume_parent'
    ) THEN
        ALTER TABLE public.resume 
        ADD CONSTRAINT fk_resume_parent 
        FOREIGN KEY (parent_resume_id) REFERENCES public.resume(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add is_master (boolean to indicate master resume)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'is_master'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN is_master BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add comments_id (optional, for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'comments_id'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN comments_id UUID;
    END IF;
END $$;

-- ============================================================================
-- PART 3: Create indexes for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_resume_template_id ON public.resume(template_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_id ON public.resume(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_parent_id ON public.resume(parent_resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_user_id_created ON public.resume(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_is_master ON public.resume(is_master) WHERE is_master = true;

-- ============================================================================
-- PART 4: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.resume.template_id IS 'Reference to resume template';
COMMENT ON COLUMN public.resume.job_id IS 'Reference to job this resume is tailored for';
COMMENT ON COLUMN public.resume.content IS 'JSONB containing resume content (personalInfo, summary, experience, etc.)';
COMMENT ON COLUMN public.resume.section_config IS 'JSONB containing section configuration (enabled/disabled, order, etc.)';
COMMENT ON COLUMN public.resume.customizations IS 'JSONB containing layout customizations (colors, fonts, spacing, etc.)';
COMMENT ON COLUMN public.resume.version_number IS 'Version number for this resume';
COMMENT ON COLUMN public.resume.parent_resume_id IS 'Reference to parent resume (for versioning)';
COMMENT ON COLUMN public.resume.is_master IS 'Indicates if this is a master resume';

-- ============================================================================
-- PART 5: Create/configure database user and grant permissions
-- ============================================================================

-- Create ats_user if it doesn't exist
-- NOTE: Change the password in your environment-specific configuration!
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'ats_user') THEN
        CREATE USER "ats_user" WITH PASSWORD 'ats_password';
        RAISE NOTICE 'Created user ats_user with default password. Please change the password!';
    ELSE
        RAISE NOTICE 'User ats_user already exists. Skipping creation.';
    END IF;
END $$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO "ats_user";

-- Grant permissions on resume-related tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_template TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_comments TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_tailoring TO "ats_user";

-- Grant permissions on user and profile tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO "ats_user";

-- Grant permissions on jobs table (handle both possible table names)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.jobs TO "ats_user";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prospectivejobs') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prospectivejobs TO "ats_user";
    END IF;
END $$;

-- Grant permissions on skills, education, projects, certifications tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.skills TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.educations TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certifications TO "ats_user";

-- Grant permissions on cover letter tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter_template TO "ats_user";

-- Grant permissions on company-related tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_info TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_media TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_news TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.archived_prospectivejobs TO "ats_user";

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.addupdatetime() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.auto_archive_jobs() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.log_material_history() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.lower_email() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_coverletter_timestamp() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_resume_timestamp() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_status_change_time() TO "ats_user";

-- Grant default privileges for future tables and functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "ats_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO "ats_user";

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Update your .env file with the correct database credentials
-- 2. Change the ats_user password if needed (recommended for production)
-- 3. Verify the migration by checking the resume table structure:
--    \d public.resume
-- ============================================================================

