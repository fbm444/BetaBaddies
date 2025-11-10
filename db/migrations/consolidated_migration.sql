-- ============================================================================
-- Consolidated Database Migration Script
-- ============================================================================
-- This script consolidates ALL database changes for:
-- 1. Job Opportunities (job_opportunities table and all related changes)
-- 2. Resume features (resume table columns, versioning, etc.)
-- 3. Foreign key relationships
-- 4. Permissions and indexes
--
-- This script is idempotent - it can be run multiple times safely
-- All changes use IF NOT EXISTS or DO blocks to prevent errors on re-runs
--
-- Usage:
--   psql -U your_user -d ats_tracker -f db/migrations/consolidated_migration.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Job Opportunities Table
-- ============================================================================

-- Create job_opportunities table
CREATE TABLE IF NOT EXISTS public.job_opportunities (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    title character varying(255) NOT NULL,
    company character varying(255) NOT NULL,
    location character varying(256) NOT NULL,
    salary_min numeric,
    salary_max numeric,
    job_posting_url character varying(1000),
    application_deadline date,
    job_description text,
    industry character varying(255),
    job_type character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for job_opportunities
CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_id ON public.job_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_deadline ON public.job_opportunities(application_deadline);

-- Add trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_job_opportunities_updated_at ON public.job_opportunities;
CREATE TRIGGER update_job_opportunities_updated_at
    BEFORE UPDATE ON public.job_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

-- Add status tracking columns
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS status character varying(50) DEFAULT 'Interested' NOT NULL;

ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone DEFAULT now() NOT NULL;

-- Create indexes for status
CREATE INDEX IF NOT EXISTS idx_job_opportunities_status ON public.job_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_status_updated_at ON public.job_opportunities(status_updated_at);

-- Add check constraint for status
ALTER TABLE public.job_opportunities
DROP CONSTRAINT IF EXISTS check_job_opportunity_status;

ALTER TABLE public.job_opportunities
ADD CONSTRAINT check_job_opportunity_status 
CHECK (status IN ('Interested', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'));

-- Update existing records to set status_updated_at to created_at if not set
UPDATE public.job_opportunities
SET status_updated_at = created_at
WHERE status_updated_at IS NULL;

-- Add detailed fields
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS recruiter_name character varying(255),
ADD COLUMN IF NOT EXISTS recruiter_email character varying(255),
ADD COLUMN IF NOT EXISTS recruiter_phone character varying(50);

ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS hiring_manager_name character varying(255),
ADD COLUMN IF NOT EXISTS hiring_manager_email character varying(255),
ADD COLUMN IF NOT EXISTS hiring_manager_phone character varying(50);

ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS salary_negotiation_notes text;

ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS interview_notes text;

ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS application_history jsonb DEFAULT '[]'::jsonb;

-- Create index on application_history (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_job_opportunities_application_history ON public.job_opportunities USING GIN (application_history);

-- Add archive fields
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archive_reason character varying(255);

-- Create indexes for archived field
CREATE INDEX IF NOT EXISTS idx_job_opportunities_archived ON public.job_opportunities(archived);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_archived ON public.job_opportunities(user_id, archived);

-- Add comments for job_opportunities table
COMMENT ON TABLE public.job_opportunities IS 'Tracks job opportunities that users are interested in applying for';
COMMENT ON COLUMN public.job_opportunities.title IS 'Job title/position name';
COMMENT ON COLUMN public.job_opportunities.company IS 'Company name';
COMMENT ON COLUMN public.job_opportunities.location IS 'Job location (city, state, remote, etc.)';
COMMENT ON COLUMN public.job_opportunities.salary_min IS 'Minimum salary in the range';
COMMENT ON COLUMN public.job_opportunities.salary_max IS 'Maximum salary in the range';
COMMENT ON COLUMN public.job_opportunities.job_posting_url IS 'URL to the original job posting';
COMMENT ON COLUMN public.job_opportunities.application_deadline IS 'Application deadline date';
COMMENT ON COLUMN public.job_opportunities.job_description IS 'Job description (max 2000 characters)';
COMMENT ON COLUMN public.job_opportunities.industry IS 'Industry sector';
COMMENT ON COLUMN public.job_opportunities.job_type IS 'Job type (Full-time, Part-time, Contract, etc.)';
COMMENT ON COLUMN public.job_opportunities.status IS 'Application status: Interested, Applied, Phone Screen, Interview, Offer, Rejected';
COMMENT ON COLUMN public.job_opportunities.status_updated_at IS 'Timestamp when the status was last updated';
COMMENT ON COLUMN public.job_opportunities.notes IS 'Personal notes and observations about the job opportunity (unlimited text)';
COMMENT ON COLUMN public.job_opportunities.recruiter_name IS 'Name of the recruiter contact';
COMMENT ON COLUMN public.job_opportunities.recruiter_email IS 'Email address of the recruiter';
COMMENT ON COLUMN public.job_opportunities.recruiter_phone IS 'Phone number of the recruiter';
COMMENT ON COLUMN public.job_opportunities.hiring_manager_name IS 'Name of the hiring manager';
COMMENT ON COLUMN public.job_opportunities.hiring_manager_email IS 'Email address of the hiring manager';
COMMENT ON COLUMN public.job_opportunities.hiring_manager_phone IS 'Phone number of the hiring manager';
COMMENT ON COLUMN public.job_opportunities.salary_negotiation_notes IS 'Notes about salary negotiations';
COMMENT ON COLUMN public.job_opportunities.interview_notes IS 'Interview notes and feedback';
COMMENT ON COLUMN public.job_opportunities.application_history IS 'Application history log as JSON array with timestamp, status, and notes';
COMMENT ON COLUMN public.job_opportunities.archived IS 'Whether the job opportunity has been archived';
COMMENT ON COLUMN public.job_opportunities.archived_at IS 'Timestamp when the job opportunity was archived';
COMMENT ON COLUMN public.job_opportunities.archive_reason IS 'Reason for archiving the job opportunity';

-- ============================================================================
-- PART 2: Resume Table Base Structure
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
-- PART 3: Add Resume Table Columns
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

-- Add foreign key constraint for template_id
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

-- Add job_id - Update to reference job_opportunities instead of prospectivejobs
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

-- Update foreign key constraint for job_id to reference job_opportunities
-- First, drop old constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'fk_resume_job'
    ) THEN
        ALTER TABLE public.resume DROP CONSTRAINT fk_resume_job;
    END IF;
END $$;

-- Add new foreign key constraint pointing to job_opportunities
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_opportunities') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'fk_resume_job_opportunity'
        ) THEN
            ALTER TABLE public.resume 
            ADD CONSTRAINT fk_resume_job_opportunity 
            FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) 
            ON DELETE SET NULL;
        END IF;
    ELSE
        RAISE NOTICE 'Warning: job_opportunities table not found. Skipping job_id foreign key constraint.';
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

-- Add foreign key constraint for parent_resume_id
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

-- Add name column (for backward compatibility with version_name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resume' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.resume ADD COLUMN name character varying(255);
        -- Set name from version_name for existing records
        UPDATE public.resume SET name = version_name WHERE name IS NULL;
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
-- PART 4: Create Indexes for Resume Table
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_resume_template_id ON public.resume(template_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_id ON public.resume(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_parent_id ON public.resume(parent_resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_user_id_created ON public.resume(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_is_master ON public.resume(is_master) WHERE is_master = true;

-- ============================================================================
-- PART 5: Add Column Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN public.resume.template_id IS 'Reference to resume template';
COMMENT ON COLUMN public.resume.job_id IS 'Reference to job opportunity this resume is tailored for';
COMMENT ON COLUMN public.resume.content IS 'JSONB containing resume content (personalInfo, summary, experience, etc.)';
COMMENT ON COLUMN public.resume.section_config IS 'JSONB containing section configuration (enabled/disabled, order, etc.)';
COMMENT ON COLUMN public.resume.customizations IS 'JSONB containing layout customizations (colors, fonts, spacing, etc.)';
COMMENT ON COLUMN public.resume.version_number IS 'Version number for this resume';
COMMENT ON COLUMN public.resume.parent_resume_id IS 'Reference to parent resume (for versioning)';
COMMENT ON COLUMN public.resume.is_master IS 'Indicates if this is a master resume';
COMMENT ON COLUMN public.resume.name IS 'Resume name (alias for version_name)';

-- ============================================================================
-- PART 6: Create/Configure Database User and Grant Permissions
-- ============================================================================

-- Create ats_user if it doesn't exist
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

-- Grant permissions on job_opportunities table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_opportunities TO "ats_user";

-- Grant permissions on user and profile tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO "ats_user";

-- Grant permissions on jobs table (employment history)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.jobs TO "ats_user";
    END IF;
END $$;

-- Grant permissions on prospectivejobs table (if it exists for backward compatibility)
DO $$
BEGIN
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
-- Summary of changes:
-- 1. Created job_opportunities table with all fields (status, detailed fields, archive)
-- 2. Created/updated resume table with all columns (template_id, job_id, content, etc.)
-- 3. Updated resume.job_id foreign key to reference job_opportunities
-- 4. Created all necessary indexes
-- 5. Granted permissions to ats_user
--
-- Next steps:
-- 1. Update your .env file with the correct database credentials
-- 2. Change the ats_user password if needed (recommended for production)
-- 3. Verify the migration by checking the tables:
--    \d public.job_opportunities
--    \d public.resume
-- ============================================================================

