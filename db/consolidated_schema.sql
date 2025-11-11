-- ============================================================================
-- CONSOLIDATED DATABASE SCHEMA SCRIPT
-- ============================================================================
-- This script contains ALL tables, columns, relationships, indexes, triggers,
-- and functions for the BetaBaddies ATS Tracker application.
--
-- This script is designed to be:
-- - Complete: Contains all database objects
-- - Shareable: Can be shared with team members
-- - Reusable: Can be used to recreate the database from scratch
--
-- Usage:
--   psql -U postgres -d your_database_name -f db/consolidated_schema.sql
--
-- Note: This script will DROP existing objects if they exist. Use with caution
-- in production environments. For production, consider using migrations instead.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: DROP EXISTING OBJECTS (Optional - Comment out for production)
-- ============================================================================

-- Uncomment the following lines if you want to drop existing objects
-- DROP TABLE IF EXISTS public.archived_prospectivejobs CASCADE;
-- DROP TABLE IF EXISTS public.certifications CASCADE;
-- DROP TABLE IF EXISTS public.company_info CASCADE;
-- DROP TABLE IF EXISTS public.company_media CASCADE;
-- DROP TABLE IF EXISTS public.company_news CASCADE;
-- DROP TABLE IF EXISTS public.coverletter CASCADE;
-- DROP TABLE IF EXISTS public.coverletter_template CASCADE;
-- DROP TABLE IF EXISTS public.educations CASCADE;
-- DROP TABLE IF EXISTS public.files CASCADE;
-- DROP TABLE IF EXISTS public.interviews CASCADE;
-- DROP TABLE IF EXISTS public.jobs CASCADE;
-- DROP TABLE IF EXISTS public.job_opportunities CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.projects CASCADE;
-- DROP TABLE IF EXISTS public.prospectivejob_material_history CASCADE;
-- DROP TABLE IF EXISTS public.prospectivejobs CASCADE;
-- DROP TABLE IF EXISTS public.resume CASCADE;
-- DROP TABLE IF EXISTS public.resume_comments CASCADE;
-- DROP TABLE IF EXISTS public.resume_tailoring CASCADE;
-- DROP TABLE IF EXISTS public.resume_template CASCADE;
-- DROP TABLE IF EXISTS public.skills CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- SECTION 2: CREATE FUNCTIONS
-- ============================================================================

-- Function: addupdatetime() - Updates updated_at timestamp
CREATE OR REPLACE FUNCTION public.addupdatetime() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function: auto_archive_jobs() - Automatically archives jobs when time limit is reached
CREATE OR REPLACE FUNCTION public.auto_archive_jobs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.autoarchive_time_limit <= CURRENT_DATE THEN
        INSERT INTO archived_prospectivejobs (
            id, user_id, deadline, description, industry, job_type,
            job_title, company, location, salary_low, salary_high, stage,
            status_change_time, personal_notes, salary_notes, date_added,
            job_url, current_resume_id, current_coverletter
        )
        VALUES (
            NEW.id, NEW.user_id, NEW.deadline, NEW.description, NEW.industry, NEW.job_type,
            NEW.job_title, NEW.company, NEW.location, NEW.salary_low, NEW.salary_high, NEW.stage,
            NEW.status_change_time, NEW.personal_notes, NEW.salary_notes, NEW.date_added,
            NEW.job_url, NULL, NEW.current_coverletter
        );

        DELETE FROM prospectivejobs WHERE id = NEW.id;
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$;

-- Function: log_material_history() - Logs resume and cover letter changes
CREATE OR REPLACE FUNCTION public.log_material_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO prospectivejob_material_history (job_id, resume_version, coverletter_version)
        VALUES (
            OLD.id,
            OLD.current_resume,
            OLD.current_coverletter
        );
        RETURN OLD;
    END IF;

    IF (NEW.current_resume IS DISTINCT FROM OLD.current_resume)
    OR (NEW.current_coverletter IS DISTINCT FROM OLD.current_coverletter) THEN
        INSERT INTO prospectivejob_material_history (job_id, resume_version, coverletter_version)
        VALUES (
            NEW.id,
            NEW.current_resume,
            NEW.current_coverletter
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Function: lower_email() - Converts email to lowercase
CREATE OR REPLACE FUNCTION public.lower_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.email = LOWER(NEW.email);
    RETURN NEW;
END;
$$;

-- Function: update_coverletter_timestamp() - Updates cover letter timestamp
CREATE OR REPLACE FUNCTION public.update_coverletter_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Function: update_resume_timestamp() - Updates resume timestamp
CREATE OR REPLACE FUNCTION public.update_resume_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Function: update_status_change_time() - Updates status change timestamp
CREATE OR REPLACE FUNCTION public.update_status_change_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        NEW.status_change_time := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: CREATE TABLES
-- ============================================================================

-- Table: users
CREATE TABLE IF NOT EXISTS public.users (
    u_id uuid NOT NULL DEFAULT gen_random_uuid(),
    password character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email character varying(255) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reset_token character varying(255),
    reset_token_expires timestamp without time zone,
    google_id character varying(255),
    auth_provider character varying(50) DEFAULT 'local'::character varying,
    linkedin_id character varying(255),
    role character varying(255) DEFAULT 'candidate'::character varying,
    CONSTRAINT users_pkey PRIMARY KEY (u_id),
    CONSTRAINT users_email_key UNIQUE (email)
);

COMMENT ON COLUMN public.users.google_id IS 'Google OAuth ID for social login';
COMMENT ON COLUMN public.users.auth_provider IS 'Authentication provider: local or google';
COMMENT ON COLUMN public.users.linkedin_id IS 'LinkedIn OAuth ID for social login';

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    first_name character varying(255) NOT NULL,
    middle_name character varying(255),
    last_name character varying(255) NOT NULL,
    phone character varying(15),
    city character varying(255),
    state character(2) NOT NULL,
    job_title character varying(255),
    bio character varying(500),
    industry character varying(255),
    exp_level character varying(10),
    user_id uuid NOT NULL,
    pfp_link character varying(1000) DEFAULT 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'::character varying NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
    CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: jobs (Employment History)
CREATE TABLE IF NOT EXISTS public.jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    company character varying(255) NOT NULL,
    location character varying(255),
    end_date date,
    is_current boolean DEFAULT false NOT NULL,
    description character varying(1000),
    salary numeric,
    start_date date NOT NULL,
    CONSTRAINT jobs_pkey PRIMARY KEY (id),
    CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: educations
CREATE TABLE IF NOT EXISTS public.educations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    school character varying(255) NOT NULL,
    degree_type character varying(20) NOT NULL,
    field character varying(255),
    honors character varying(1000),
    gpa numeric(4,3),
    is_enrolled boolean NOT NULL,
    graddate date NOT NULL,
    startdate date,
    CONSTRAINT educations_pkey PRIMARY KEY (id),
    CONSTRAINT educations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: skills
CREATE TABLE IF NOT EXISTS public.skills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    skill_name character varying(100) NOT NULL,
    proficiency character varying(15) NOT NULL,
    category character varying(20),
    skill_badge character varying(500),
    CONSTRAINT skills_pkey PRIMARY KEY (id),
    CONSTRAINT skills_skill_name_key UNIQUE (skill_name),
    CONSTRAINT skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: projects
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    link character varying(500),
    description character varying(500),
    start_date date NOT NULL,
    end_date date,
    technologies character varying(500),
    collaborators character varying(255),
    status character varying(10) NOT NULL,
    industry character varying(255),
    CONSTRAINT projects_pkey PRIMARY KEY (id),
    CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: certifications
CREATE TABLE IF NOT EXISTS public.certifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    never_expires boolean NOT NULL,
    name character varying(255) NOT NULL,
    org_name character varying(255) NOT NULL,
    date_earned date NOT NULL,
    expiration_date date,
    CONSTRAINT certifications_pkey PRIMARY KEY (id),
    CONSTRAINT certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: files
CREATE TABLE IF NOT EXISTS public.files (
    file_id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_data character varying(255),
    file_path character varying(255),
    CONSTRAINT files_pkey PRIMARY KEY (file_id)
);

-- Table: interviews
CREATE TABLE IF NOT EXISTS public.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    date timestamp with time zone NOT NULL,
    outcome_link character varying(255),
    CONSTRAINT interviews_pkey PRIMARY KEY (id),
    CONSTRAINT interviews_type_check CHECK (((type)::text = ANY ((ARRAY['phone'::character varying, 'video'::character varying, 'in-person'::character varying])::text[]))),
    CONSTRAINT fk_interviews_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: prospectivejobs
CREATE TABLE IF NOT EXISTS public.prospectivejobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    deadline date,
    description character varying(255),
    industry character varying(255),
    job_type character varying(255),
    job_title character varying(100),
    company character varying(255),
    location character varying(255),
    salary_low numeric,
    salary_high numeric,
    stage character varying(20) NOT NULL,
    status_change_time timestamp with time zone DEFAULT now(),
    personal_notes text,
    salary_notes text,
    date_added date DEFAULT CURRENT_DATE NOT NULL,
    job_url character varying(1000),
    current_resume character varying(1000),
    current_coverletter character varying(1000),
    autoarchive_time_limit date DEFAULT (CURRENT_DATE + '1 year'::interval),
    CONSTRAINT prospectivejobs_pkey PRIMARY KEY (id),
    CONSTRAINT prospectivejobs_stage_check CHECK (((stage)::text = ANY ((ARRAY['Interested'::character varying, 'Applied'::character varying, 'Phone Screen'::character varying, 'Interview'::character varying, 'Offer'::character varying, 'Rejected'::character varying])::text[]))),
    CONSTRAINT prospectivejobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: job_opportunities
CREATE TABLE IF NOT EXISTS public.job_opportunities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'Interested' NOT NULL,
    status_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    recruiter_name character varying(255),
    recruiter_email character varying(255),
    recruiter_phone character varying(50),
    hiring_manager_name character varying(255),
    hiring_manager_email character varying(255),
    hiring_manager_phone character varying(50),
    salary_negotiation_notes text,
    interview_notes text,
    application_history jsonb DEFAULT '[]'::jsonb,
    archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archive_reason character varying(255),
    CONSTRAINT job_opportunities_pkey PRIMARY KEY (id),
    CONSTRAINT check_job_opportunity_status CHECK (status IN ('Interested', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected')),
    CONSTRAINT job_opportunities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

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

-- Table: resume_template (created early - no dependencies)
CREATE TABLE IF NOT EXISTS public.resume_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    description text,
    colors text,
    fonts text,
    existing_resume_template character varying(1000),
    CONSTRAINT resume_template_pkey PRIMARY KEY (id)
);

-- Table: resume (created before archived_prospectivejobs which references it)
CREATE TABLE IF NOT EXISTS public.resume (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_name character varying(255) DEFAULT 'New_Resume'::character varying,
    name character varying(255),
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file character varying(1000),
    template_id uuid,
    job_id uuid,
    content jsonb,
    section_config jsonb,
    customizations jsonb,
    version_number integer DEFAULT 1,
    parent_resume_id uuid,
    is_master boolean DEFAULT false,
    comments_id uuid,
    CONSTRAINT resume_pkey PRIMARY KEY (id),
    CONSTRAINT resume_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT fk_resume_template FOREIGN KEY (template_id) REFERENCES public.resume_template(id) ON DELETE SET NULL,
    CONSTRAINT fk_resume_job_opportunity FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
    CONSTRAINT fk_resume_parent FOREIGN KEY (parent_resume_id) REFERENCES public.resume(id) ON DELETE CASCADE
);

COMMENT ON COLUMN public.resume.template_id IS 'Reference to resume template';
COMMENT ON COLUMN public.resume.job_id IS 'Reference to job opportunity this resume is tailored for';
COMMENT ON COLUMN public.resume.content IS 'JSONB containing resume content (personalInfo, summary, experience, etc.)';
COMMENT ON COLUMN public.resume.section_config IS 'JSONB containing section configuration (enabled/disabled, order, etc.)';
COMMENT ON COLUMN public.resume.customizations IS 'JSONB containing layout customizations (colors, fonts, spacing, etc.)';
COMMENT ON COLUMN public.resume.version_number IS 'Version number for this resume';
COMMENT ON COLUMN public.resume.parent_resume_id IS 'Reference to parent resume (for versioning)';
COMMENT ON COLUMN public.resume.is_master IS 'Indicates if this is a master resume';
COMMENT ON COLUMN public.resume.name IS 'Resume name (alias for version_name)';

-- Table: resume_comments (depends on resume)
CREATE TABLE IF NOT EXISTS public.resume_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid,
    commenter character varying(255),
    comment text,
    CONSTRAINT resume_comments_pkey PRIMARY KEY (id),
    CONSTRAINT resume_comments_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resume(id) ON DELETE CASCADE
);

-- Table: resume_tailoring (depends on resume and users)
CREATE TABLE IF NOT EXISTS public.resume_tailoring (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    workexp_description text,
    CONSTRAINT resume_tailoring_pkey PRIMARY KEY (id),
    CONSTRAINT resume_tailoring_id_fkey FOREIGN KEY (id) REFERENCES public.resume(id) ON DELETE CASCADE,
    CONSTRAINT resume_tailoring_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Table: prospectivejob_material_history (depends on prospectivejobs)
CREATE TABLE IF NOT EXISTS public.prospectivejob_material_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    resume_version character varying(1000),
    coverletter_version character varying(1000),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT prospectivejob_material_history_pkey PRIMARY KEY (id),
    CONSTRAINT prospectivejob_material_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.prospectivejobs(id) ON DELETE CASCADE
);

-- Table: archived_prospectivejobs (depends on users and resume)
CREATE TABLE IF NOT EXISTS public.archived_prospectivejobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    deadline date,
    description character varying(2000),
    industry character varying(255),
    job_type character varying(255),
    job_title character varying(100) NOT NULL,
    company character varying(255) NOT NULL,
    location character varying(255),
    salary_low numeric,
    salary_high numeric,
    stage character varying(20) NOT NULL,
    status_change_time timestamp with time zone,
    personal_notes text,
    salary_notes text,
    date_added date NOT NULL,
    job_url character varying(1000),
    current_resume_id uuid,
    current_coverletter character varying(1000),
    CONSTRAINT archived_prospectivejobs_pkey PRIMARY KEY (id),
    CONSTRAINT archived_prospectivejobs_stage_check CHECK (((stage)::text = ANY ((ARRAY['Interested'::character varying, 'Applied'::character varying, 'Phone Screen'::character varying, 'Interview'::character varying, 'Offer'::character varying, 'Rejected'::character varying])::text[]))),
    CONSTRAINT archived_prospectivejobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT archived_prospectivejobs_current_resume_id_fkey FOREIGN KEY (current_resume_id) REFERENCES public.resume(id)
);

-- Table: company_info (depends on job_opportunities)
CREATE TABLE IF NOT EXISTS public.company_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    size character varying(255),
    industry character varying(255),
    location character varying(255),
    website character varying(1000),
    description character varying(1000),
    company_logo character varying(1000),
    contact_email character varying(255),
    contact_phone character varying(255),
    CONSTRAINT company_info_pkey PRIMARY KEY (id),
    CONSTRAINT company_info_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

-- Table: company_media (depends on company_info)
CREATE TABLE IF NOT EXISTS public.company_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    platform character varying(255) NOT NULL,
    link character varying(1000),
    CONSTRAINT company_media_pkey PRIMARY KEY (id),
    CONSTRAINT company_media_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_info(id) ON DELETE CASCADE
);

-- Table: company_news (depends on company_info)
CREATE TABLE IF NOT EXISTS public.company_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    heading character varying(255) NOT NULL,
    description character varying(1000),
    type character varying(255) DEFAULT 'misc'::character varying NOT NULL,
    date date,
    source character varying(255),
    CONSTRAINT company_news_pkey PRIMARY KEY (id),
    CONSTRAINT company_news_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_info(id) ON DELETE CASCADE
);

-- Table: coverletter_template (no dependencies)
CREATE TABLE IF NOT EXISTS public.coverletter_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    description text,
    tone character varying(20) NOT NULL,
    length character varying(20) NOT NULL,
    writing_style character varying(20),
    colors text,
    fonts text,
    existing_coverletter_template character varying(1000),
    CONSTRAINT coverletter_template_pkey PRIMARY KEY (id),
    CONSTRAINT coverletter_template_length_check CHECK (((length)::text = ANY ((ARRAY['brief'::character varying, 'standard'::character varying, 'detailed'::character varying])::text[]))),
    CONSTRAINT coverletter_template_tone_check CHECK (((tone)::text = ANY ((ARRAY['formal'::character varying, 'casual'::character varying, 'enthusiastic'::character varying, 'analytical'::character varying])::text[])))
);

-- Table: coverletter (depends on users and resume_comments)
CREATE TABLE IF NOT EXISTS public.coverletter (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_name character varying(255) DEFAULT 'New_CoverLetter'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file character varying(1000),
    comments_id uuid,
    template_id uuid,
    job_id uuid,
    content TEXT,
    tone_settings TEXT,
    customizations TEXT,
    version_number integer DEFAULT 1,
    parent_coverletter_id uuid,
    CONSTRAINT coverletter_pkey PRIMARY KEY (id),
    CONSTRAINT coverletter_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT coverletter_template_is_fkey FOREIGN KEY (template_id) REFERENCES public.coverletter_template(id),
    CONSTRAINT coverletter_job_is_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id),
    CONSTRAINT coverletter_comments_id_fkey FOREIGN KEY (comments_id) REFERENCES public.resume_comments(id),
    CONSTRAINT coverletter_parent_coverletter_id_fkey FOREIGN KEY (parent_coverletter_id) REFERENCES public.coverletter(id)
);

-- ============================================================================
-- SECTION 4: CREATE INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users USING btree (google_id);
CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON public.users USING btree (linkedin_id);

-- Job opportunities indexes
CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_id ON public.job_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_deadline ON public.job_opportunities(application_deadline);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_status ON public.job_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_status_updated_at ON public.job_opportunities(status_updated_at);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_application_history ON public.job_opportunities USING GIN (application_history);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_archived ON public.job_opportunities(archived);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_archived ON public.job_opportunities(user_id, archived);

-- Resume indexes
CREATE INDEX IF NOT EXISTS idx_resume_template_id ON public.resume(template_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_id ON public.resume(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_parent_id ON public.resume(parent_resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_user_id_created ON public.resume(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_is_master ON public.resume(is_master) WHERE is_master = true;

-- ============================================================================
-- SECTION 5: CREATE TRIGGERS
-- ============================================================================

-- Trigger: lowercaseemail - Converts email to lowercase before insert/update
DROP TRIGGER IF EXISTS lowercaseemail ON public.users;
CREATE TRIGGER lowercaseemail BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.lower_email();

-- Trigger: set_updated_at - Updates updated_at timestamp on users table
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();

-- Trigger: trg_auto_archive_jobs - Automatically archives jobs when time limit is reached
DROP TRIGGER IF EXISTS trg_auto_archive_jobs ON public.prospectivejobs;
CREATE TRIGGER trg_auto_archive_jobs BEFORE UPDATE OF autoarchive_time_limit ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.auto_archive_jobs();

-- Trigger: trg_log_material_history - Logs resume and cover letter changes
DROP TRIGGER IF EXISTS trg_log_material_history ON public.prospectivejobs;
CREATE TRIGGER trg_log_material_history AFTER INSERT OR DELETE OR UPDATE ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.log_material_history();

-- Trigger: trg_resume_timestamp - Updates resume timestamp
DROP TRIGGER IF EXISTS trg_resume_timestamp ON public.resume;
CREATE TRIGGER trg_resume_timestamp BEFORE UPDATE ON public.resume FOR EACH ROW EXECUTE FUNCTION public.update_resume_timestamp();

-- Trigger: trg_coverletter_timestamp - Updates cover letter timestamp
DROP TRIGGER IF EXISTS trg_coverletter_timestamp ON public.coverletter;
CREATE TRIGGER trg_coverletter_timestamp BEFORE UPDATE ON public.coverletter FOR EACH ROW EXECUTE FUNCTION public.update_coverletter_timestamp();

-- Trigger: trg_update_status_change_time - Updates status change timestamp
DROP TRIGGER IF EXISTS trg_update_status_change_time ON public.prospectivejobs;
CREATE TRIGGER trg_update_status_change_time BEFORE UPDATE OF stage ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.update_status_change_time();

-- Trigger: update_job_opportunities_updated_at - Updates job opportunities timestamp
DROP TRIGGER IF EXISTS update_job_opportunities_updated_at ON public.job_opportunities;
CREATE TRIGGER update_job_opportunities_updated_at
    BEFORE UPDATE ON public.job_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();


-- Add missing columns to coverletter table
-- Migration to support full cover letter functionality

-- Add template_id (foreign key to coverletter_template)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE coverletter ADD CONSTRAINT fk_coverletter_template 
  FOREIGN KEY (template_id) REFERENCES coverletter_template(id) 
  ON DELETE SET NULL;

-- Add job_id (foreign key to job_opportunities)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS job_id UUID;

-- Drop old constraint if it exists (from previous schema)
ALTER TABLE coverletter DROP CONSTRAINT IF EXISTS fk_coverletter_job;

-- Add new constraint pointing to job_opportunities
ALTER TABLE coverletter ADD CONSTRAINT fk_coverletter_job 
  FOREIGN KEY (job_id) REFERENCES job_opportunities(id) 
  ON DELETE SET NULL;

-- Add content (JSONB for cover letter content)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS content JSONB;

-- Add tone_settings (JSONB for tone and style settings)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS tone_settings JSONB;

-- Add customizations (JSONB for layout customizations)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS customizations JSONB;

-- Add version_number (integer for version tracking)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Add parent_coverletter_id (self-referencing foreign key for cover letter versions)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS parent_coverletter_id UUID;
ALTER TABLE coverletter ADD CONSTRAINT fk_coverletter_parent 
  FOREIGN KEY (parent_coverletter_id) REFERENCES coverletter(id) 
  ON DELETE CASCADE;

-- Add is_master (boolean to indicate master cover letter)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

-- Add company_research (JSONB for company research data)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS company_research JSONB;

-- Add performance_metrics (JSONB for tracking performance)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS performance_metrics JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coverletter_template_id ON coverletter(template_id);
CREATE INDEX IF NOT EXISTS idx_coverletter_job_id ON coverletter(job_id);
CREATE INDEX IF NOT EXISTS idx_coverletter_parent_id ON coverletter(parent_coverletter_id);
CREATE INDEX IF NOT EXISTS idx_coverletter_user_id_created ON coverletter(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coverletter_is_master ON coverletter(is_master) WHERE is_master = true;

-- Create cover_letter_performance table for tracking
CREATE TABLE IF NOT EXISTS cover_letter_performance (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    coverletter_id UUID NOT NULL,
    job_id UUID,
    application_outcome VARCHAR(50), -- 'interview', 'rejected', 'no_response', 'accepted'
    response_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cover_letter_performance_pkey PRIMARY KEY (id),
    CONSTRAINT fk_performance_coverletter FOREIGN KEY (coverletter_id) REFERENCES coverletter(id) ON DELETE CASCADE,
    CONSTRAINT fk_performance_job FOREIGN KEY (job_id) REFERENCES prospectivejobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_coverletter_id ON cover_letter_performance(coverletter_id);
CREATE INDEX IF NOT EXISTS idx_performance_job_id ON cover_letter_performance(job_id);

-- Create cover_letter_template_usage table for analytics
CREATE TABLE IF NOT EXISTS cover_letter_template_usage (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    template_id UUID NOT NULL,
    user_id UUID,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cover_letter_template_usage_pkey PRIMARY KEY (id),
    CONSTRAINT fk_template_usage_template FOREIGN KEY (template_id) REFERENCES coverletter_template(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_usage_user FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE,
    CONSTRAINT unique_template_user UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON cover_letter_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON cover_letter_template_usage(user_id);

-- ============================================================================
-- SECTION 6: GRANT PERMISSIONS
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

-- Grant permissions on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.jobs TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.educations TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.skills TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certifications TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.files TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interviews TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prospectivejobs TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_opportunities TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prospectivejob_material_history TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.archived_prospectivejobs TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_info TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_media TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_news TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_template TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_comments TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_tailoring TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter_template TO "ats_user";

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
-- CONSOLIDATED SCHEMA SCRIPT COMPLETE
-- ============================================================================
-- This script has created:
-- - 20 tables with all columns and relationships
-- - 7 functions for triggers and business logic
-- - 15+ indexes for query optimization
-- - 8 triggers for automatic data management
-- - Database user (ats_user) with appropriate permissions
--
-- Next steps:
-- 1. Verify the schema: \d+ in psql
-- 2. Update the ats_user password for production
-- 3. Test the application with the new schema
-- ============================================================================

