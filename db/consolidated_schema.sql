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

-- Script to drop all existing functions and tables
-- WARNING: This will delete all data! Use with caution in production.

-- Drop all functions first (to prevent ownership errors)
-- NOTE: If you get "must be owner" errors, run this script as a superuser (postgres)
-- or grant DROP privileges: GRANT DROP ON ALL FUNCTIONS IN SCHEMA public TO your_user;

-- Manual drop list for all known functions
-- These will fail silently if functions don't exist or user lacks permissions
-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.addupdatetime() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.auto_archive_jobs() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.log_material_history() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.lower_email() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.update_coverletter_timestamp() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.update_resume_timestamp() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.update_status_change_time() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.send_thank_you_note_email() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- DO $$
-- BEGIN
--     DROP FUNCTION IF EXISTS public.update_thank_you_note_timestamp() CASCADE;
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $$;

-- Alternative: Automated function drop script (use if manual list doesn't work)
-- Note: This may fail if current user doesn't own the functions
/*
DO $$
DECLARE
    r RECORD;
    func_signature TEXT;
BEGIN
    -- Drop all functions in public schema
    FOR r IN (
        SELECT 
            p.oid,
            p.proname,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        INNER JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.oid DESC
    ) 
    LOOP
        BEGIN
            func_signature := 'public.' || quote_ident(r.proname) || '(' || r.args || ')';
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_signature || ' CASCADE';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop function: % (%), skipping', r.proname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Function drop process completed';
END $$;
*/

-- Alternative: Manual drop list (uncomment to use instead of the script above)
-- Original tables
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
-- DROP TABLE IF EXISTS public.company_interview_insights CASCADE;
-- DROP TABLE IF EXISTS public.thank_you_notes CASCADE;
-- DROP TABLE IF EXISTS public.cover_letter_performance CASCADE;
-- DROP TABLE IF EXISTS public.cover_letter_template_usage CASCADE;

-- Sprint 3: Interview Preparation Suite tables
-- DROP TABLE IF EXISTS public.interview_question_banks CASCADE;
-- DROP TABLE IF EXISTS public.question_practice_sessions CASCADE;
-- DROP TABLE IF EXISTS public.interview_response_coaching CASCADE;
-- DROP TABLE IF EXISTS public.mock_interview_sessions CASCADE;
-- DROP TABLE IF EXISTS public.mock_interview_questions CASCADE;
-- DROP TABLE IF EXISTS public.mock_interview_followups CASCADE;
-- DROP TABLE IF EXISTS public.technical_prep_challenges CASCADE;
-- DROP TABLE IF EXISTS public.technical_prep_attempts CASCADE;
-- DROP TABLE IF EXISTS public.whiteboarding_practice CASCADE;
-- DROP TABLE IF EXISTS public.interview_preparation_tasks CASCADE;
-- DROP TABLE IF EXISTS public.calendar_sync_settings CASCADE;
-- DROP TABLE IF EXISTS public.interview_analytics CASCADE;
-- DROP TABLE IF EXISTS public.interview_preparation_checklists CASCADE;
-- DROP TABLE IF EXISTS public.interview_followups CASCADE;
-- DROP TABLE IF EXISTS public.followup_templates CASCADE;
-- DROP TABLE IF EXISTS public.salary_negotiation_prep CASCADE;
-- DROP TABLE IF EXISTS public.writing_practice_sessions CASCADE;
-- DROP TABLE IF EXISTS public.interview_success_probability CASCADE;

-- Sprint 3: Network Relationship Management tables
-- DROP TABLE IF EXISTS public.professional_contacts CASCADE;
-- DROP TABLE IF EXISTS public.contact_interactions CASCADE;
-- DROP TABLE IF EXISTS public.contact_categories CASCADE;
-- DROP TABLE IF EXISTS public.mutual_connections CASCADE;
-- DROP TABLE IF EXISTS public.contact_job_links CASCADE;
-- DROP TABLE IF EXISTS public.referral_requests CASCADE;
-- DROP TABLE IF EXISTS public.referral_templates CASCADE;
-- DROP TABLE IF EXISTS public.networking_events CASCADE;
-- DROP TABLE IF EXISTS public.event_connections CASCADE;
-- DROP TABLE IF EXISTS public.networking_goals CASCADE;
-- DROP TABLE IF EXISTS public.linkedin_networking_templates CASCADE;
-- DROP TABLE IF EXISTS public.linkedin_profile_optimization CASCADE;
-- DROP TABLE IF EXISTS public.informational_interviews CASCADE;
-- DROP TABLE IF EXISTS public.informational_interview_templates CASCADE;
-- DROP TABLE IF EXISTS public.mentor_relationships CASCADE;
-- DROP TABLE IF EXISTS public.mentor_shared_data CASCADE;
-- DROP TABLE IF EXISTS public.mentor_feedback CASCADE;
-- DROP TABLE IF EXISTS public.mentor_dashboard_data CASCADE;
-- DROP TABLE IF EXISTS public.discovered_contacts CASCADE;
-- DROP TABLE IF EXISTS public.relationship_maintenance_reminders CASCADE;
-- DROP TABLE IF EXISTS public.relationship_health_tracking CASCADE;
-- DROP TABLE IF EXISTS public.networking_campaigns CASCADE;
-- DROP TABLE IF EXISTS public.campaign_outreach CASCADE;
-- DROP TABLE IF EXISTS public.campaign_ab_testing CASCADE;
-- DROP TABLE IF EXISTS public.professional_references CASCADE;
-- DROP TABLE IF EXISTS public.reference_requests CASCADE;
-- DROP TABLE IF EXISTS public.reference_request_templates CASCADE;
-- DROP TABLE IF EXISTS public.reference_portfolios CASCADE;

-- Sprint 3: Analytics Dashboard tables
-- DROP TABLE IF EXISTS public.job_search_metrics CASCADE;
-- DROP TABLE IF EXISTS public.performance_trends CASCADE;
-- DROP TABLE IF EXISTS public.application_success_analysis CASCADE;
-- DROP TABLE IF EXISTS public.interview_performance_tracking CASCADE;
-- DROP TABLE IF EXISTS public.network_roi_analytics CASCADE;
-- DROP TABLE IF EXISTS public.salary_progression_tracking CASCADE;
-- DROP TABLE IF EXISTS public.market_salary_data CASCADE;
-- DROP TABLE IF EXISTS public.career_goals CASCADE;
-- DROP TABLE IF EXISTS public.goal_milestones CASCADE;
-- DROP TABLE IF EXISTS public.market_intelligence CASCADE;
-- DROP TABLE IF EXISTS public.industry_trends CASCADE;
-- DROP TABLE IF EXISTS public.time_tracking CASCADE;
-- DROP TABLE IF EXISTS public.productivity_analysis CASCADE;
-- DROP TABLE IF EXISTS public.competitive_benchmarks CASCADE;
-- DROP TABLE IF EXISTS public.success_patterns CASCADE;
-- DROP TABLE IF EXISTS public.custom_reports CASCADE;
-- DROP TABLE IF EXISTS public.report_templates CASCADE;
-- DROP TABLE IF EXISTS public.performance_predictions CASCADE;

-- Sprint 3: Multi-User Collaboration tables
-- DROP TABLE IF EXISTS public.teams CASCADE;
-- DROP TABLE IF EXISTS public.team_members CASCADE;
-- DROP TABLE IF EXISTS public.team_dashboards CASCADE;
-- DROP TABLE IF EXISTS public.team_billing CASCADE;
-- DROP TABLE IF EXISTS public.mentor_dashboard_views CASCADE;
-- DROP TABLE IF EXISTS public.coaching_sessions CASCADE;
-- DROP TABLE IF EXISTS public.document_review_requests CASCADE;
-- DROP TABLE IF EXISTS public.document_approvals CASCADE;
-- DROP TABLE IF EXISTS public.progress_sharing_settings CASCADE;
-- DROP TABLE IF EXISTS public.progress_reports CASCADE;
-- DROP TABLE IF EXISTS public.accountability_relationships CASCADE;
-- DROP TABLE IF EXISTS public.support_groups CASCADE;
-- DROP TABLE IF EXISTS public.group_memberships CASCADE;
-- DROP TABLE IF EXISTS public.group_discussions CASCADE;
-- DROP TABLE IF EXISTS public.group_challenges CASCADE;
-- DROP TABLE IF EXISTS public.peer_referrals CASCADE;
-- DROP TABLE IF EXISTS public.family_support_access CASCADE;
-- DROP TABLE IF EXISTS public.family_progress_summaries CASCADE;
-- DROP TABLE IF EXISTS public.support_effectiveness_tracking CASCADE;
-- DROP TABLE IF EXISTS public.enterprise_accounts CASCADE;
-- DROP TABLE IF EXISTS public.user_cohorts CASCADE;
-- DROP TABLE IF EXISTS public.cohort_memberships CASCADE;
-- DROP TABLE IF EXISTS public.program_effectiveness_analytics CASCADE;
-- DROP TABLE IF EXISTS public.external_advisors CASCADE;
-- DROP TABLE IF EXISTS public.advisor_shared_data CASCADE;
-- DROP TABLE IF EXISTS public.advisor_recommendations CASCADE;
-- DROP TABLE IF EXISTS public.advisor_sessions CASCADE;
-- DROP TABLE IF EXISTS public.advisor_performance_evaluation CASCADE;

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

-- Function: send_thank_you_note_email() - Sends email when thank you note is sent
-- Note: Actual email sending should be handled by application layer
-- This trigger updates the interview's thank_you_note_sent flag
CREATE OR REPLACE FUNCTION public.send_thank_you_note_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- When sent_at is set (not null), mark the note as sent and update interview
    IF NEW.sent_at IS NOT NULL AND (OLD.sent_at IS NULL OR OLD.sent_at IS DISTINCT FROM NEW.sent_at) THEN
        -- Update the interview's thank_you_note_sent flag
        UPDATE public.interviews
        SET thank_you_note_sent = true,
            thank_you_note_id = NEW.id
        WHERE id = NEW.interview_id;
        
        -- Note: Actual email sending should be handled by application service
        -- This could trigger a notification or queue an email job
    END IF;
    RETURN NEW;
END;
$$;

-- Function: update_thank_you_note_timestamp() - Updates thank you note timestamp
CREATE OR REPLACE FUNCTION public.update_thank_you_note_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Function: update_document_review_request_status() - Updates request status based on approval actions
CREATE OR REPLACE FUNCTION public.update_document_review_request_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_review_request_id uuid;
BEGIN
    -- Get review_request_id from the approval record
    v_review_request_id := NEW.review_request_id;
    
    -- If no review_request_id is provided, try to find it by matching document_id and document_type
    IF v_review_request_id IS NULL THEN
        SELECT id INTO v_review_request_id
        FROM public.document_review_requests
        WHERE document_id = NEW.document_id
          AND document_type = NEW.document_type
          AND request_status IN ('pending', 'in_progress')
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    -- Only proceed if we found a review request
    IF v_review_request_id IS NOT NULL THEN
        -- On INSERT: When a reviewer accepts a request (creates approval record), set to 'in_progress'
        IF TG_OP = 'INSERT' THEN
            UPDATE public.document_review_requests
            SET request_status = 'in_progress'
            WHERE id = v_review_request_id
              AND request_status = 'pending';
        
        -- On UPDATE: Handle status changes based on approval state
        ELSIF TG_OP = 'UPDATE' THEN
            -- If approved=true and approved_at is set, mark as completed
            IF NEW.approved = true AND NEW.approved_at IS NOT NULL 
               AND (OLD.approved = false OR OLD.approved_at IS NULL) THEN
                UPDATE public.document_review_requests
                SET request_status = 'completed',
                    review_completed_at = NEW.approved_at
                WHERE id = v_review_request_id
                  AND request_status IN ('pending', 'in_progress');
            
            -- If explicitly rejected/cancelled (approved=false with notes indicating cancellation)
            ELSIF NEW.approved = false AND OLD.approved = true THEN
                UPDATE public.document_review_requests
                SET request_status = 'cancelled'
                WHERE id = v_review_request_id
                  AND request_status IN ('pending', 'in_progress');
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: CREATE TABLES
-- ============================================================================

-- Table: users
-- UC-089, UC-091, UC-108: Added LinkedIn profile fields, team_id, and expanded role support
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
    -- UC-089: LinkedIn OAuth Integration (profile data stored in profiles table)
    linkedin_access_token text,
    linkedin_refresh_token text,
    linkedin_token_expires_at timestamp with time zone,
    -- UC-108: Team Account Management
    team_id uuid,
    CONSTRAINT users_pkey PRIMARY KEY (u_id),
    CONSTRAINT users_email_key UNIQUE (email)
);

COMMENT ON COLUMN public.users.google_id IS 'Google OAuth ID for social login';
COMMENT ON COLUMN public.users.auth_provider IS 'Authentication provider: local or google';
COMMENT ON COLUMN public.users.linkedin_id IS 'LinkedIn OAuth ID for social login';
COMMENT ON COLUMN public.users.linkedin_access_token IS 'UC-089: LinkedIn OAuth access token (encrypted)';
COMMENT ON COLUMN public.users.linkedin_refresh_token IS 'UC-089: LinkedIn OAuth refresh token (encrypted)';
COMMENT ON COLUMN public.users.team_id IS 'UC-108: Team/organization membership';

-- Table: profiles
-- UC-089: LinkedIn profile data (headline -> job_title, profile_url -> pfp_link) imported via OAuth
CREATE TABLE IF NOT EXISTS public.profiles (
    first_name character varying(255) NOT NULL,
    middle_name character varying(255),
    last_name character varying(255) NOT NULL,
    phone character varying(15),
    city character varying(255),
    state character(2) NOT NULL,
    job_title character varying(255), -- UC-089: Can be populated from LinkedIn headline
    bio character varying(500),
    industry character varying(255),
    exp_level character varying(10),
    user_id uuid NOT NULL,
    pfp_link character varying(1000) DEFAULT 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'::character varying NOT NULL, -- UC-089: Can be populated from LinkedIn profile picture URL
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

-- Table: thank_you_notes
-- UC-082: Interview Follow-Up Templates - Personalized thank you notes
-- Note: interview_id and template_id foreign key constraints added after both tables are created
CREATE TABLE IF NOT EXISTS public.thank_you_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_id uuid NOT NULL,
    template_id uuid,
    recipient_name character varying(255) NOT NULL,
    recipient_email character varying(255) NOT NULL,
    subject character varying(500),
    message_body text NOT NULL,
    conversation_references jsonb,
    personalized_content jsonb,
    sent_at timestamp with time zone,
    response_received boolean DEFAULT false,
    response_received_at timestamp with time zone,
    response_content text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT thank_you_notes_pkey PRIMARY KEY (id),
    CONSTRAINT thank_you_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
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

-- Table: interviews
-- UC-079: Interview Scheduling and Calendar Integration - Expanded with calendar sync, preparation, and outcomes
CREATE TABLE IF NOT EXISTS public.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    date timestamp with time zone NOT NULL,
    outcome_link character varying(255),
    -- UC-079: Calendar Integration
    job_id uuid,
    -- Note: Calendar provider stored in calendar_sync_settings table (linked via user_id)
    calendar_event_id character varying(255), -- External calendar event ID (Google/Outlook event ID)
    location character varying(500),
    video_link character varying(1000),
    interviewer_name character varying(255),
    interviewer_email character varying(255),
    interviewer_title character varying(255),
    preparation_tasks_generated boolean DEFAULT false,
    reminder_24h_sent boolean DEFAULT false,
    reminder_2h_sent boolean DEFAULT false,
    outcome character varying(50) DEFAULT 'pending',
    followup_actions jsonb,
    thank_you_note_sent boolean DEFAULT false,
    thank_you_note_id uuid,
    CONSTRAINT interviews_pkey PRIMARY KEY (id),
    CONSTRAINT interviews_type_check CHECK (((type)::text = ANY ((ARRAY['phone'::character varying, 'video'::character varying, 'in-person'::character varying])::text[]))),
    CONSTRAINT fk_interviews_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT fk_interviews_job FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
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
-- UC-110: Collaborative Resume and Cover Letter Review - Added reviewer tracking, comment types, and versioning
CREATE TABLE IF NOT EXISTS public.resume_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid,
    commenter character varying(255),
    comment text,
    -- UC-110: Enhanced collaboration features
    commenter_user_id uuid,
    comment_type character varying(50) DEFAULT 'suggestion',
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    version_number integer,
    CONSTRAINT resume_comments_pkey PRIMARY KEY (id),
    CONSTRAINT resume_comments_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resume(id) ON DELETE CASCADE,
    CONSTRAINT resume_comments_commenter_fkey FOREIGN KEY (commenter_user_id) REFERENCES public.users(u_id) ON DELETE SET NULL
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

-- Table: company_interview_insights (depends on job_opportunities)
CREATE TABLE IF NOT EXISTS public.company_interview_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    company_key text NOT NULL,
    requested_role text,
    role_key text NOT NULL DEFAULT ''::text,
    job_id uuid,
    payload jsonb NOT NULL,
    source text DEFAULT 'openai'::text,
    prompt_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    last_error text,
    CONSTRAINT company_interview_insights_pkey PRIMARY KEY (id),
    CONSTRAINT company_interview_insights_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
    CONSTRAINT company_interview_insights_company_role_key UNIQUE (company_key, role_key)
);

CREATE INDEX IF NOT EXISTS idx_company_interview_insights_company
    ON public.company_interview_insights (company_key);

CREATE INDEX IF NOT EXISTS idx_company_interview_insights_expires_at
    ON public.company_interview_insights (expires_at);

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
    is_master BOOLEAN,
    company_research JSONB,
    performance_metrics JSONB,
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

-- Sprint 3: Interview Preparation Suite indexes (UC-074 to UC-085)
-- Note: company_research table removed - use company_info, company_media, company_news instead
CREATE INDEX IF NOT EXISTS idx_interview_question_banks_job_id ON public.interview_question_banks(job_id);
CREATE INDEX IF NOT EXISTS idx_question_practice_sessions_user_id ON public.question_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_thank_you_notes_interview_id ON public.thank_you_notes(interview_id);
CREATE INDEX IF NOT EXISTS idx_thank_you_notes_user_id ON public.thank_you_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_question_practice_sessions_question_id ON public.question_practice_sessions(question_id);
CREATE INDEX IF NOT EXISTS idx_interview_response_coaching_user_id ON public.interview_response_coaching(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_sessions_user_id ON public.mock_interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_questions_session_id ON public.mock_interview_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_technical_prep_challenges_user_id ON public.technical_prep_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON public.interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_preparation_tasks_interview_id ON public.interview_preparation_tasks(interview_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_settings_user_id ON public.calendar_sync_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_analytics_user_id ON public.interview_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_preparation_checklists_interview_id ON public.interview_preparation_checklists(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_followups_interview_id ON public.interview_followups(interview_id);
CREATE INDEX IF NOT EXISTS idx_salary_negotiation_prep_user_id ON public.salary_negotiation_prep(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_practice_sessions_user_id ON public.writing_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_success_probability_user_id ON public.interview_success_probability(user_id);

-- Sprint 3: Network Relationship Management indexes (UC-086 to UC-095)
CREATE INDEX IF NOT EXISTS idx_professional_contacts_user_id ON public.professional_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON public.contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_user_id ON public.referral_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_job_id ON public.referral_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_networking_events_user_id ON public.networking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_event_connections_event_id ON public.event_connections(event_id);
CREATE INDEX IF NOT EXISTS idx_networking_goals_user_id ON public.networking_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_networking_templates_user_id ON public.linkedin_networking_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_informational_interviews_user_id ON public.informational_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentor_id ON public.mentor_relationships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentee_id ON public.mentor_relationships(mentee_id);
CREATE INDEX IF NOT EXISTS idx_discovered_contacts_user_id ON public.discovered_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_maintenance_reminders_user_id ON public.relationship_maintenance_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_campaigns_user_id ON public.networking_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_references_user_id ON public.professional_references(user_id);

-- Sprint 3: Analytics Dashboard indexes (UC-096 to UC-107)
CREATE INDEX IF NOT EXISTS idx_job_search_metrics_user_id ON public.job_search_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_trends_user_id ON public.performance_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_application_success_analysis_user_id ON public.application_success_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_performance_tracking_user_id ON public.interview_performance_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_network_roi_analytics_user_id ON public.network_roi_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_progression_tracking_user_id ON public.salary_progression_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON public.career_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_user_id ON public.market_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_user_id ON public.time_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_productivity_analysis_user_id ON public.productivity_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_competitive_benchmarks_user_id ON public.competitive_benchmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_success_patterns_user_id ON public.success_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON public.custom_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_predictions_user_id ON public.performance_predictions(user_id);

-- Sprint 3: Multi-User Collaboration indexes (UC-108 to UC-115)
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_dashboard_views_mentor_id ON public.mentor_dashboard_views(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_dashboard_views_mentee_id ON public.mentor_dashboard_views(mentee_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_mentor_id ON public.coaching_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_document_review_requests_requestor_id ON public.document_review_requests(requestor_id);
CREATE INDEX IF NOT EXISTS idx_document_review_requests_reviewer_id ON public.document_review_requests(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_document_review_requests_document ON public.document_review_requests(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_review_request_id ON public.document_approvals(review_request_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON public.document_approvals(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_progress_sharing_settings_user_id ON public.progress_sharing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_accounts_admin_user_id ON public.enterprise_accounts(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_enterprise_id ON public.user_cohorts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_external_advisors_user_id ON public.external_advisors(user_id);

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

-- Trigger: trg_company_interview_insights_updated_at - Updates timestamp on interview insights
DROP TRIGGER IF EXISTS trg_company_interview_insights_updated_at ON public.company_interview_insights;
CREATE TRIGGER trg_company_interview_insights_updated_at
    BEFORE UPDATE ON public.company_interview_insights
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

-- Trigger: trg_thank_you_note_send_email - Sends email and updates interview when thank you note is sent
DROP TRIGGER IF EXISTS trg_thank_you_note_send_email ON public.thank_you_notes;
CREATE TRIGGER trg_thank_you_note_send_email
    AFTER UPDATE OF sent_at ON public.thank_you_notes
    FOR EACH ROW
    WHEN (NEW.sent_at IS NOT NULL AND (OLD.sent_at IS NULL OR OLD.sent_at IS DISTINCT FROM NEW.sent_at))
    EXECUTE FUNCTION public.send_thank_you_note_email();

-- Trigger: trg_thank_you_note_timestamp - Updates thank you note timestamp
DROP TRIGGER IF EXISTS trg_thank_you_note_timestamp ON public.thank_you_notes;
CREATE TRIGGER trg_thank_you_note_timestamp
    BEFORE UPDATE ON public.thank_you_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_thank_you_note_timestamp();

-- Triggers for updated_at on all tables with updated_at columns
DROP TRIGGER IF EXISTS trg_company_research_updated_at ON public.company_research;
-- Note: company_research table removed, trigger not needed

DROP TRIGGER IF EXISTS trg_professional_contacts_updated_at ON public.professional_contacts;
CREATE TRIGGER trg_professional_contacts_updated_at
    BEFORE UPDATE ON public.professional_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_referral_requests_updated_at ON public.referral_requests;
CREATE TRIGGER trg_referral_requests_updated_at
    BEFORE UPDATE ON public.referral_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_networking_events_updated_at ON public.networking_events;
CREATE TRIGGER trg_networking_events_updated_at
    BEFORE UPDATE ON public.networking_events
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_networking_goals_updated_at ON public.networking_goals;
CREATE TRIGGER trg_networking_goals_updated_at
    BEFORE UPDATE ON public.networking_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_linkedin_profile_optimization_updated_at ON public.linkedin_profile_optimization;
CREATE TRIGGER trg_linkedin_profile_optimization_updated_at
    BEFORE UPDATE ON public.linkedin_profile_optimization
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_informational_interviews_updated_at ON public.informational_interviews;
CREATE TRIGGER trg_informational_interviews_updated_at
    BEFORE UPDATE ON public.informational_interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_relationship_health_tracking_updated_at ON public.relationship_health_tracking;
CREATE TRIGGER trg_relationship_health_tracking_updated_at
    BEFORE UPDATE ON public.relationship_health_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_networking_campaigns_updated_at ON public.networking_campaigns;
CREATE TRIGGER trg_networking_campaigns_updated_at
    BEFORE UPDATE ON public.networking_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_professional_references_updated_at ON public.professional_references;
CREATE TRIGGER trg_professional_references_updated_at
    BEFORE UPDATE ON public.professional_references
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_salary_negotiation_prep_updated_at ON public.salary_negotiation_prep;
CREATE TRIGGER trg_salary_negotiation_prep_updated_at
    BEFORE UPDATE ON public.salary_negotiation_prep
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_interview_success_probability_updated_at ON public.interview_success_probability;
CREATE TRIGGER trg_interview_success_probability_updated_at
    BEFORE UPDATE ON public.interview_success_probability
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_interview_preparation_checklists_updated_at ON public.interview_preparation_checklists;
CREATE TRIGGER trg_interview_preparation_checklists_updated_at
    BEFORE UPDATE ON public.interview_preparation_checklists
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_career_goals_updated_at ON public.career_goals;
CREATE TRIGGER trg_career_goals_updated_at
    BEFORE UPDATE ON public.career_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_custom_reports_updated_at ON public.custom_reports;
CREATE TRIGGER trg_custom_reports_updated_at
    BEFORE UPDATE ON public.custom_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_performance_predictions_updated_at ON public.performance_predictions;
CREATE TRIGGER trg_performance_predictions_updated_at
    BEFORE UPDATE ON public.performance_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_team_billing_updated_at ON public.team_billing;
CREATE TRIGGER trg_team_billing_updated_at
    BEFORE UPDATE ON public.team_billing
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_mentor_dashboard_views_updated_at ON public.mentor_dashboard_views;
CREATE TRIGGER trg_mentor_dashboard_views_updated_at
    BEFORE UPDATE ON public.mentor_dashboard_views
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_progress_sharing_settings_updated_at ON public.progress_sharing_settings;
CREATE TRIGGER trg_progress_sharing_settings_updated_at
    BEFORE UPDATE ON public.progress_sharing_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_advisor_recommendations_updated_at ON public.advisor_recommendations;
CREATE TRIGGER trg_advisor_recommendations_updated_at
    BEFORE UPDATE ON public.advisor_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_enterprise_accounts_updated_at ON public.enterprise_accounts;
CREATE TRIGGER trg_enterprise_accounts_updated_at
    BEFORE UPDATE ON public.enterprise_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

-- Triggers for document review request status updates
-- Trigger: trg_document_approval_status_update - Updates request status when approval is created or updated
DROP TRIGGER IF EXISTS trg_document_approval_status_update ON public.document_approvals;
CREATE TRIGGER trg_document_approval_status_update
    AFTER INSERT OR UPDATE ON public.document_approvals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_document_review_request_status();


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

-- ============================================================================
-- SECTION 3.5: SPRINT 3 NEW TABLES - INTERVIEW PREPARATION SUITE
-- ============================================================================

-- UC-074: Company Research Automation
-- Note: Uses existing tables: company_info, company_media, company_news
-- Additional research data can be stored in coverletter.company_research JSONB column

-- UC-075: Role-Specific Interview Question Bank
CREATE TABLE IF NOT EXISTS public.interview_question_banks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    difficulty_level character varying(20),
    category character varying(50),
    question_text text NOT NULL,
    star_framework_guidance text,
    industry_specific boolean DEFAULT false,
    linked_skills jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_question_banks_pkey PRIMARY KEY (id),
    CONSTRAINT interview_question_banks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.question_practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    job_id uuid,
    written_response text,
    practiced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    improvement_notes text,
    CONSTRAINT question_practice_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT question_practice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT question_practice_sessions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE,
    CONSTRAINT question_practice_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

-- UC-076: AI-Powered Response Coaching
CREATE TABLE IF NOT EXISTS public.interview_response_coaching (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    practice_session_id uuid,
    original_response text,
    ai_feedback jsonb,
    content_score integer,
    structure_score integer,
    clarity_score integer,
    relevance_score integer,
    specificity_score integer,
    impact_score integer,
    response_length integer,
    recommended_length integer,
    weak_language_patterns jsonb,
    suggested_alternatives jsonb,
    star_method_adherence integer,
    alternative_approaches jsonb,
    improvement_tracking jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_response_coaching_pkey PRIMARY KEY (id),
    CONSTRAINT interview_response_coaching_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT interview_response_coaching_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE,
    CONSTRAINT interview_response_coaching_practice_session_id_fkey FOREIGN KEY (practice_session_id) REFERENCES public.question_practice_sessions(id) ON DELETE SET NULL
);

-- UC-077: Mock Interview Practice Sessions
CREATE TABLE IF NOT EXISTS public.mock_interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid,
    target_role character varying(255),
    target_company character varying(255),
    interview_format character varying(50),
    status character varying(50) DEFAULT 'in_progress',
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    performance_summary jsonb,
    improvement_areas jsonb,
    confidence_score integer,
    pacing_recommendations text,
    CONSTRAINT mock_interview_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT mock_interview_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.mock_interview_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying(50),
    sequence_number integer,
    written_response text,
    response_length integer,
    time_spent integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mock_interview_questions_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_questions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mock_interview_followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    followup_text text NOT NULL,
    response text,
    sequence_number integer,
    CONSTRAINT mock_interview_followups_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_followups_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.mock_interview_questions(id) ON DELETE CASCADE
);

-- UC-078: Technical Interview Preparation
CREATE TABLE IF NOT EXISTS public.technical_prep_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid,
    challenge_type character varying(50),
    tech_stack jsonb,
    difficulty_level character varying(50),
    title character varying(255),
    description text,
    question_text text,
    solution_framework text,
    best_practices text,
    real_world_scenario text,
    is_timed boolean DEFAULT false,
    time_limit_minutes integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT technical_prep_challenges_pkey PRIMARY KEY (id),
    CONSTRAINT technical_prep_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT technical_prep_challenges_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.technical_prep_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    user_id uuid NOT NULL,
    solution text,
    time_taken_seconds integer,
    performance_score integer,
    feedback text,
    completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT technical_prep_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT technical_prep_attempts_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.technical_prep_challenges(id) ON DELETE CASCADE,
    CONSTRAINT technical_prep_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.whiteboarding_practice (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    topic character varying(255),
    techniques_used jsonb,
    notes text,
    practiced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whiteboarding_practice_pkey PRIMARY KEY (id),
    CONSTRAINT whiteboarding_practice_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-079: Interview Scheduling and Calendar Integration (additional tables)
CREATE TABLE IF NOT EXISTS public.interview_preparation_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    task_description text NOT NULL,
    task_type character varying(50),
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_preparation_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT interview_preparation_tasks_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.calendar_sync_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calendar_provider character varying(50),
    access_token text,
    refresh_token text,
    calendar_id character varying(255),
    sync_enabled boolean DEFAULT false,
    last_sync_at timestamp with time zone,
    CONSTRAINT calendar_sync_settings_pkey PRIMARY KEY (id),
    CONSTRAINT calendar_sync_settings_user_id_key UNIQUE (user_id),
    CONSTRAINT calendar_sync_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-080: Interview Performance Analytics
CREATE TABLE IF NOT EXISTS public.interview_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_id uuid NOT NULL,
    company_type character varying(50),
    interview_format character varying(50),
    performance_areas jsonb,
    conversion_to_offer boolean,
    feedback_themes jsonb,
    improvement_recommendations jsonb,
    benchmark_comparison jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT interview_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT interview_analytics_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE
);

-- UC-081: Pre-Interview Preparation Checklist
CREATE TABLE IF NOT EXISTS public.interview_preparation_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    checklist_items jsonb,
    role_specific_tasks jsonb,
    company_research_verified boolean DEFAULT false,
    questions_prepared boolean DEFAULT false,
    attire_selected character varying(255),
    logistics_verified boolean DEFAULT false,
    technology_setup_verified boolean DEFAULT false,
    portfolio_prepared boolean DEFAULT false,
    confidence_activities_completed boolean DEFAULT false,
    completion_percentage integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_preparation_checklists_pkey PRIMARY KEY (id),
    CONSTRAINT interview_preparation_checklists_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT interview_preparation_checklists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-082: Interview Follow-Up Templates
CREATE TABLE IF NOT EXISTS public.interview_followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    template_type character varying(50),
    recipient_name character varying(255),
    recipient_email character varying(255),
    subject character varying(500),
    message_body text,
    conversation_references jsonb,
    sent_at timestamp with time zone,
    response_received boolean DEFAULT false,
    response_received_at timestamp with time zone,
    response_content text,
    CONSTRAINT interview_followups_pkey PRIMARY KEY (id),
    CONSTRAINT interview_followups_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT interview_followups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.followup_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_type character varying(50),
    template_name character varying(255),
    subject_template character varying(500),
    body_template text,
    timing_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT followup_templates_pkey PRIMARY KEY (id)
);

-- Add foreign key constraints for thank_you_notes (after both interviews and followup_templates are created)
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Add thank_you_notes_interview_id_fkey if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'thank_you_notes_interview_id_fkey'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        ALTER TABLE public.thank_you_notes 
        ADD CONSTRAINT thank_you_notes_interview_id_fkey 
        FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;
    END IF;
    
    -- Add thank_you_notes_template_id_fkey if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'thank_you_notes_template_id_fkey'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        ALTER TABLE public.thank_you_notes 
        ADD CONSTRAINT thank_you_notes_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES public.followup_templates(id) ON DELETE SET NULL;
    END IF;
    
    -- Add fk_interviews_thank_you_note if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_interviews_thank_you_note'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        ALTER TABLE public.interviews 
        ADD CONSTRAINT fk_interviews_thank_you_note 
        FOREIGN KEY (thank_you_note_id) REFERENCES public.thank_you_notes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- UC-083: Salary Negotiation Preparation
CREATE TABLE IF NOT EXISTS public.salary_negotiation_prep (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    role character varying(255),
    location character varying(255),
    market_salary_data jsonb,
    salary_min numeric,
    salary_max numeric,
    negotiation_talking_points jsonb,
    experience_achievements jsonb,
    total_compensation_framework jsonb,
    negotiation_scripts jsonb,
    timing_strategies text,
    counteroffer_evaluation jsonb,
    confidence_exercises jsonb,
    outcome character varying(50) DEFAULT 'pending',
    final_salary numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_negotiation_prep_pkey PRIMARY KEY (id),
    CONSTRAINT salary_negotiation_prep_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT salary_negotiation_prep_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

-- UC-084: Interview Response Writing Practice
CREATE TABLE IF NOT EXISTS public.writing_practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    response_text text,
    time_limit_seconds integer,
    time_taken_seconds integer,
    clarity_score integer,
    professionalism_score integer,
    structure_score integer,
    storytelling_score integer,
    feedback text,
    improvement_suggestions jsonb,
    quality_trend jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT writing_practice_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT writing_practice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT writing_practice_sessions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE
);

-- UC-085: Interview Success Probability Scoring
CREATE TABLE IF NOT EXISTS public.interview_success_probability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_id uuid NOT NULL,
    preparation_level integer,
    role_match_score integer,
    company_research_completion integer,
    practice_hours numeric,
    historical_performance_factor numeric,
    success_probability integer,
    confidence_score integer,
    recommendations jsonb,
    prediction_factors jsonb,
    actual_outcome character varying(50),
    prediction_accuracy boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_success_probability_pkey PRIMARY KEY (id),
    CONSTRAINT interview_success_probability_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT interview_success_probability_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 3.6: SPRINT 3 NEW TABLES - NETWORK RELATIONSHIP MANAGEMENT
-- ============================================================================

-- UC-086: Professional Contact Management
CREATE TABLE IF NOT EXISTS public.professional_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255),
    phone character varying(50),
    company character varying(255),
    job_title character varying(255),
    industry character varying(255),
    location character varying(255),
    relationship_type character varying(50),
    relationship_strength character varying(50),
    relationship_context text,
    personal_interests text,
    professional_interests text,
    linkedin_url character varying(1000),
    notes text,
    imported_from character varying(50),
    last_interaction_date date,
    next_reminder_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT professional_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT professional_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.contact_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    interaction_type character varying(50),
    interaction_date date DEFAULT CURRENT_DATE,
    summary text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_interactions_pkey PRIMARY KEY (id),
    CONSTRAINT contact_interactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.contact_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    category_type character varying(50),
    category_value character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_categories_pkey PRIMARY KEY (id),
    CONSTRAINT contact_categories_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mutual_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    mutual_contact_id uuid NOT NULL,
    connection_strength character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mutual_connections_pkey PRIMARY KEY (id),
    CONSTRAINT mutual_connections_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT mutual_connections_mutual_contact_id_fkey FOREIGN KEY (mutual_contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.contact_job_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    job_id uuid NOT NULL,
    relationship_to_job character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_job_links_pkey PRIMARY KEY (id),
    CONSTRAINT contact_job_links_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT contact_job_links_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

-- UC-087: Referral Request Management
CREATE TABLE IF NOT EXISTS public.referral_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    job_id uuid NOT NULL,
    request_template_id uuid,
    personalized_message text,
    request_status character varying(50) DEFAULT 'pending',
    sent_at timestamp with time zone,
    response_received_at timestamp with time zone,
    response_content text,
    referral_successful boolean,
    followup_required boolean DEFAULT false,
    followup_sent_at timestamp with time zone,
    gratitude_expressed boolean DEFAULT false,
    relationship_impact character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT referral_requests_pkey PRIMARY KEY (id),
    CONSTRAINT referral_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT referral_requests_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT referral_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
    CONSTRAINT referral_requests_template_id_fkey FOREIGN KEY (request_template_id) REFERENCES public.referral_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.referral_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    etiquette_guidance text,
    timing_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT referral_templates_pkey PRIMARY KEY (id)
);

-- UC-088: Networking Event Management
CREATE TABLE IF NOT EXISTS public.networking_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_name character varying(255) NOT NULL,
    event_type character varying(50),
    industry character varying(255),
    location character varying(255),
    event_date date,
    event_time time,
    event_url character varying(1000),
    description text,
    networking_goals text,
    preparation_notes text,
    attended boolean DEFAULT false,
    attendance_date date,
    post_event_notes text,
    roi_score integer,
    connections_made_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT networking_events_pkey PRIMARY KEY (id),
    CONSTRAINT networking_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.event_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    connection_quality character varying(50),
    followup_required boolean DEFAULT false,
    followup_completed boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_connections_pkey PRIMARY KEY (id),
    CONSTRAINT event_connections_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE,
    CONSTRAINT event_connections_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.networking_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal_description text,
    target_industry character varying(255),
    target_companies jsonb,
    target_roles jsonb,
    goal_type character varying(50),
    target_count integer,
    current_count integer DEFAULT 0,
    deadline date,
    status character varying(50) DEFAULT 'active',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT networking_goals_pkey PRIMARY KEY (id),
    CONSTRAINT networking_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-089: LinkedIn Profile Integration (additional tables)
CREATE TABLE IF NOT EXISTS public.linkedin_networking_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_type character varying(50),
    template_name character varying(255),
    message_template text,
    optimization_suggestions text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT linkedin_networking_templates_pkey PRIMARY KEY (id),
    CONSTRAINT linkedin_networking_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.linkedin_profile_optimization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    optimization_area character varying(50),
    current_content text,
    suggested_improvements text,
    best_practices text,
    implemented boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT linkedin_profile_optimization_pkey PRIMARY KEY (id),
    CONSTRAINT linkedin_profile_optimization_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-090: Informational Interview Management
CREATE TABLE IF NOT EXISTS public.informational_interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    request_status character varying(50) DEFAULT 'pending',
    outreach_template_id uuid,
    request_sent_at timestamp with time zone,
    scheduled_date date,
    scheduled_time time,
    preparation_framework jsonb,
    completed boolean DEFAULT false,
    completed_date date,
    insights text,
    industry_intelligence text,
    followup_sent boolean DEFAULT false,
    relationship_outcome character varying(255),
    linked_to_opportunities jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT informational_interviews_pkey PRIMARY KEY (id),
    CONSTRAINT informational_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT informational_interviews_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT informational_interviews_template_id_fkey FOREIGN KEY (outreach_template_id) REFERENCES public.informational_interview_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.informational_interview_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    preparation_framework text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT informational_interview_templates_pkey PRIMARY KEY (id)
);

-- Event Registrations Table
-- Tracks which users have signed up for which events
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    registered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'registered',
    notes text,
    CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
    CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE,
    CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT event_registrations_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);

-- UC-091: Mentor and Career Coach Integration
CREATE TABLE IF NOT EXISTS public.mentor_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    relationship_type character varying(50),
    permissions_granted jsonb,
    invitation_status character varying(50) DEFAULT 'pending',
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_relationships_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_relationships_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT mentor_relationships_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mentor_shared_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    data_type character varying(50),
    data_id uuid,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_shared_data_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_shared_data_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mentor_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    feedback_type character varying(50),
    feedback_content text,
    recommendations text,
    implemented boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_feedback_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mentor_dashboard_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    summary_data jsonb,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_dashboard_data_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_dashboard_data_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE
);

-- UC-092: Industry Contact Discovery
CREATE TABLE IF NOT EXISTS public.discovered_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_name character varying(255),
    contact_title character varying(255),
    company character varying(255),
    discovery_source character varying(50),
    connection_degree character varying(50),
    mutual_connections jsonb,
    connection_path text,
    relevance_score integer,
    outreach_initiated boolean DEFAULT false,
    added_to_contacts boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT discovered_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT discovered_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-093: Relationship Maintenance Automation
CREATE TABLE IF NOT EXISTS public.relationship_maintenance_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    reminder_type character varying(50),
    reminder_date date,
    reminder_sent boolean DEFAULT false,
    outreach_sent boolean DEFAULT false,
    personalized_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT relationship_maintenance_reminders_pkey PRIMARY KEY (id),
    CONSTRAINT relationship_maintenance_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT relationship_maintenance_reminders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.relationship_health_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    user_id uuid NOT NULL,
    health_score integer,
    engagement_frequency character varying(50),
    last_interaction_date date,
    reciprocity_score integer,
    value_exchange_notes text,
    maintenance_activities jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT relationship_health_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT relationship_health_tracking_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT relationship_health_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-094: Networking Campaign Management
CREATE TABLE IF NOT EXISTS public.networking_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    campaign_name character varying(255) NOT NULL,
    target_companies jsonb,
    target_industries jsonb,
    target_roles jsonb,
    campaign_goals text,
    timeline_start date,
    timeline_end date,
    outreach_volume integer DEFAULT 0,
    response_rate numeric,
    campaign_status character varying(50) DEFAULT 'planning',
    effectiveness_score integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT networking_campaigns_pkey PRIMARY KEY (id),
    CONSTRAINT networking_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.campaign_outreach (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    outreach_type character varying(50),
    outreach_message text,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    response_received boolean DEFAULT false,
    response_content text,
    relationship_quality character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT campaign_outreach_pkey PRIMARY KEY (id),
    CONSTRAINT campaign_outreach_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.networking_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT campaign_outreach_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.campaign_ab_testing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    test_name character varying(255),
    variant_a text,
    variant_b text,
    variant_a_response_rate numeric,
    variant_b_response_rate numeric,
    winning_variant character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT campaign_ab_testing_pkey PRIMARY KEY (id),
    CONSTRAINT campaign_ab_testing_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.networking_campaigns(id) ON DELETE CASCADE
);

-- UC-095: Professional Reference Management
CREATE TABLE IF NOT EXISTS public.professional_references (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    reference_type character varying(50),
    relationship_context text,
    reference_strength character varying(50),
    availability_status character varying(50) DEFAULT 'available',
    preferred_contact_method character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT professional_references_pkey PRIMARY KEY (id),
    CONSTRAINT professional_references_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT professional_references_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.reference_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_id uuid NOT NULL,
    job_id uuid NOT NULL,
    request_sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    request_template_id uuid,
    preparation_materials jsonb,
    role_specific_talking_points text,
    reference_provided boolean DEFAULT false,
    reference_feedback text,
    impact_on_application character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reference_requests_pkey PRIMARY KEY (id),
    CONSTRAINT reference_requests_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.professional_references(id) ON DELETE CASCADE,
    CONSTRAINT reference_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
    CONSTRAINT reference_requests_template_id_fkey FOREIGN KEY (request_template_id) REFERENCES public.reference_request_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.reference_request_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    preparation_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reference_request_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.reference_portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    portfolio_name character varying(255),
    career_goal character varying(255),
    reference_ids jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reference_portfolios_pkey PRIMARY KEY (id),
    CONSTRAINT reference_portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 3.7: SPRINT 3 NEW TABLES - ANALYTICS DASHBOARD AND PERFORMANCE INSIGHTS
-- ============================================================================

-- UC-096: Job Search Performance Dashboard
CREATE TABLE IF NOT EXISTS public.job_search_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    metric_date date DEFAULT CURRENT_DATE,
    applications_sent integer DEFAULT 0,
    interviews_scheduled integer DEFAULT 0,
    offers_received integer DEFAULT 0,
    application_to_interview_rate numeric,
    interview_to_offer_rate numeric,
    avg_time_to_response_days numeric,
    avg_time_to_interview_days numeric,
    goal_applications integer,
    goal_interviews integer,
    goal_offers integer,
    progress_percentage numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT job_search_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT job_search_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.performance_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    metric_type character varying(50),
    trend_direction character varying(50),
    trend_period character varying(50),
    data_points jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT performance_trends_pkey PRIMARY KEY (id),
    CONSTRAINT performance_trends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-097: Application Success Rate Analysis
CREATE TABLE IF NOT EXISTS public.application_success_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_period_start date,
    analysis_period_end date,
    success_by_industry jsonb,
    success_by_company_size jsonb,
    success_by_role_type jsonb,
    success_by_application_method jsonb,
    success_by_source jsonb,
    resume_customization_impact numeric,
    cover_letter_customization_impact numeric,
    timing_patterns jsonb,
    recommendations jsonb,
    statistical_significance jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT application_success_analysis_pkey PRIMARY KEY (id),
    CONSTRAINT application_success_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-098: Interview Performance Tracking
CREATE TABLE IF NOT EXISTS public.interview_performance_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tracking_period_start date,
    tracking_period_end date,
    interview_to_offer_rate numeric,
    performance_by_format jsonb,
    performance_by_industry jsonb,
    performance_by_company_culture jsonb,
    improvement_trends jsonb,
    feedback_themes jsonb,
    common_improvement_areas jsonb,
    coaching_recommendations jsonb,
    benchmark_comparison jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_performance_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT interview_performance_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-099: Network ROI and Relationship Analytics
CREATE TABLE IF NOT EXISTS public.network_roi_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_period_start date,
    analysis_period_end date,
    networking_activity_volume integer,
    referrals_generated integer,
    opportunities_from_network integer,
    referral_conversion_rate numeric,
    relationship_strength_development jsonb,
    event_roi_scores jsonb,
    relationship_reciprocity_score numeric,
    most_effective_strategies jsonb,
    industry_benchmarks jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT network_roi_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT network_roi_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-100: Salary Progression and Market Positioning
CREATE TABLE IF NOT EXISTS public.salary_progression_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    offer_date date,
    job_id uuid,
    base_salary numeric,
    total_compensation numeric,
    benefits_value numeric,
    location character varying(255),
    role character varying(255),
    industry character varying(255),
    market_percentile integer,
    market_comparison jsonb,
    negotiation_outcome character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_progression_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT salary_progression_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT salary_progression_tracking_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.market_salary_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role character varying(255),
    industry character varying(255),
    location character varying(255),
    experience_level character varying(50),
    salary_25th_percentile numeric,
    salary_50th_percentile numeric,
    salary_75th_percentile numeric,
    data_source character varying(255),
    data_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT market_salary_data_pkey PRIMARY KEY (id)
);

-- UC-101: Goal Setting and Achievement Tracking
CREATE TABLE IF NOT EXISTS public.career_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal_type character varying(50),
    goal_category character varying(50),
    goal_description text,
    specific_metric character varying(255),
    target_value numeric,
    current_value numeric DEFAULT 0,
    target_date date,
    progress_percentage numeric DEFAULT 0,
    status character varying(50) DEFAULT 'active',
    milestones jsonb,
    achievement_date date,
    impact_on_job_search text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT career_goals_pkey PRIMARY KEY (id),
    CONSTRAINT career_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    milestone_description text,
    target_date date,
    completed boolean DEFAULT false,
    completed_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT goal_milestones_pkey PRIMARY KEY (id),
    CONSTRAINT goal_milestones_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.career_goals(id) ON DELETE CASCADE
);

-- UC-102: Market Intelligence and Industry Trends
CREATE TABLE IF NOT EXISTS public.market_intelligence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    industry character varying(255),
    location character varying(255),
    intelligence_type character varying(50),
    data_points jsonb,
    trend_analysis text,
    insights text,
    recommendations text,
    data_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT market_intelligence_pkey PRIMARY KEY (id),
    CONSTRAINT market_intelligence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.industry_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry character varying(255),
    trend_category character varying(50),
    trend_data jsonb,
    trend_description text,
    impact_analysis text,
    data_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT industry_trends_pkey PRIMARY KEY (id)
);

-- UC-103: Time Investment and Productivity Analysis
CREATE TABLE IF NOT EXISTS public.time_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type character varying(50),
    activity_description text,
    time_spent_minutes integer,
    activity_date date DEFAULT CURRENT_DATE,
    energy_level character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT time_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.productivity_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_period_start date,
    analysis_period_end date,
    time_by_activity jsonb,
    productivity_patterns jsonb,
    optimal_schedule jsonb,
    task_completion_rates jsonb,
    efficiency_improvements jsonb,
    time_vs_outcome_correlation jsonb,
    burnout_indicators jsonb,
    recommendations jsonb,
    avg_productivity_score numeric,
    productivity_score_trends jsonb,
    productivity_score_by_activity jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT productivity_analysis_pkey PRIMARY KEY (id),
    CONSTRAINT productivity_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-104: Competitive Analysis and Benchmarking
CREATE TABLE IF NOT EXISTS public.competitive_benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    benchmark_category character varying(50),
    user_value numeric,
    peer_average numeric,
    top_performer_value numeric,
    percentile_ranking integer,
    benchmark_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT competitive_benchmarks_pkey PRIMARY KEY (id),
    CONSTRAINT competitive_benchmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-105: Success Pattern Recognition
CREATE TABLE IF NOT EXISTS public.success_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pattern_type character varying(50),
    pattern_description text,
    correlation_factors jsonb,
    preparation_activities jsonb,
    timing_patterns jsonb,
    strategy_effectiveness jsonb,
    success_factors jsonb,
    predictive_indicators jsonb,
    recommendations jsonb,
    pattern_confidence numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT success_patterns_pkey PRIMARY KEY (id),
    CONSTRAINT success_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-106: Custom Report Generation
CREATE TABLE IF NOT EXISTS public.custom_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_name character varying(255),
    report_type character varying(50),
    selected_metrics jsonb,
    date_range_start date,
    date_range_end date,
    filters jsonb,
    report_data jsonb,
    visualization_options jsonb,
    export_format character varying(50),
    exported_file_path character varying(1000),
    shared_with jsonb,
    insights text,
    recommendations text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT custom_reports_pkey PRIMARY KEY (id),
    CONSTRAINT custom_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_description text,
    default_metrics jsonb,
    default_filters jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT report_templates_pkey PRIMARY KEY (id)
);

-- UC-107: Performance Prediction and Forecasting
CREATE TABLE IF NOT EXISTS public.performance_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prediction_type character varying(50),
    prediction_value numeric,
    confidence_interval_lower numeric,
    confidence_interval_upper numeric,
    confidence_level integer,
    prediction_factors jsonb,
    scenario_planning jsonb,
    recommendations jsonb,
    prediction_date date DEFAULT CURRENT_DATE,
    actual_outcome character varying(255),
    prediction_accuracy boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT performance_predictions_pkey PRIMARY KEY (id),
    CONSTRAINT performance_predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 3.8: SPRINT 3 NEW TABLES - MULTI-USER COLLABORATION FEATURES
-- ============================================================================

-- UC-108: Team Account Management
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_name character varying(255) NOT NULL,
    team_type character varying(50),
    billing_email character varying(255),
    subscription_tier character varying(50),
    max_members integer,
    active_members integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- Add foreign key constraint for users.team_id after teams table is created (UC-108)
-- Note: This will fail if constraint already exists - safe to ignore on re-runs
ALTER TABLE public.users 
    ADD CONSTRAINT users_team_id_fkey 
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50),
    permissions jsonb,
    invited_by uuid,
    invitation_status character varying(50) DEFAULT 'pending',
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    joined_at timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_members_pkey PRIMARY KEY (id),
    CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(u_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.team_dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    dashboard_data jsonb,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_dashboards_pkey PRIMARY KEY (id),
    CONSTRAINT team_dashboards_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.team_billing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    billing_cycle character varying(50),
    subscription_status character varying(50) DEFAULT 'active',
    next_billing_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_billing_pkey PRIMARY KEY (id),
    CONSTRAINT team_billing_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- UC-109: Mentor Dashboard and Coaching Tools
CREATE TABLE IF NOT EXISTS public.mentor_dashboard_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    dashboard_snapshot jsonb,
    key_indicators jsonb,
    coaching_insights jsonb,
    development_recommendations jsonb,
    last_viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_dashboard_views_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_dashboard_views_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT mentor_dashboard_views_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE,
    session_notes text,
    action_items jsonb,
    followup_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coaching_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT coaching_sessions_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT coaching_sessions_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-110: Collaborative Resume and Cover Letter Review (additional tables)
CREATE TABLE IF NOT EXISTS public.document_review_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type character varying(50) NOT NULL,
    document_id uuid NOT NULL,
    requestor_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    request_status character varying(50) DEFAULT 'pending',
    deadline date,
    review_completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_review_requests_pkey PRIMARY KEY (id),
    CONSTRAINT document_review_requests_requestor_id_fkey FOREIGN KEY (requestor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT document_review_requests_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT document_review_requests_check_type CHECK (document_type IN ('resume', 'coverletter')),
    CONSTRAINT document_review_requests_check_status CHECK (request_status IN ('pending', 'in_progress', 'completed', 'cancelled'))
    -- Note: document_id cannot have a foreign key constraint because it references different tables
    -- (resume.id or coverletter.id) based on document_type. Application logic must validate this.
);

CREATE TABLE IF NOT EXISTS public.document_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_request_id uuid,
    document_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    approver_id uuid NOT NULL,
    approved boolean DEFAULT false,
    approval_notes text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_approvals_pkey PRIMARY KEY (id),
    CONSTRAINT document_approvals_review_request_id_fkey FOREIGN KEY (review_request_id) REFERENCES public.document_review_requests(id) ON DELETE CASCADE,
    CONSTRAINT document_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT document_approvals_check_type CHECK (document_type IN ('resume', 'coverletter'))
    -- Note: document_id cannot have a foreign key constraint because it references different tables
    -- (resume.id or coverletter.id) based on document_type. Application logic must validate this.
);

-- UC-111: Progress Sharing and Accountability
CREATE TABLE IF NOT EXISTS public.progress_sharing_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    sharing_level character varying(50),
    shared_data_types jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT progress_sharing_settings_pkey PRIMARY KEY (id),
    CONSTRAINT progress_sharing_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT progress_sharing_settings_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.progress_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_period_start date,
    report_period_end date,
    report_data jsonb,
    shared_with jsonb,
    goal_progress jsonb,
    milestone_achievements jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT progress_reports_pkey PRIMARY KEY (id),
    CONSTRAINT progress_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.accountability_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    accountability_partner_id uuid NOT NULL,
    relationship_type character varying(50),
    engagement_level character varying(50),
    support_effectiveness integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accountability_relationships_pkey PRIMARY KEY (id),
    CONSTRAINT accountability_relationships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT accountability_relationships_partner_id_fkey FOREIGN KEY (accountability_partner_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-112: Peer Networking and Support Groups
CREATE TABLE IF NOT EXISTS public.support_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_name character varying(255) NOT NULL,
    group_type character varying(50),
    industry character varying(255),
    target_role character varying(255),
    description text,
    privacy_level character varying(50) DEFAULT 'public',
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_groups_pkey PRIMARY KEY (id),
    CONSTRAINT support_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.group_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_role character varying(50) DEFAULT 'member',
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    CONSTRAINT group_memberships_pkey PRIMARY KEY (id),
    CONSTRAINT group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE,
    CONSTRAINT group_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.group_discussions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    topic character varying(255),
    content text,
    is_anonymous boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_discussions_pkey PRIMARY KEY (id),
    CONSTRAINT group_discussions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE,
    CONSTRAINT group_discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.group_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    challenge_name character varying(255) NOT NULL,
    challenge_description text,
    start_date date,
    end_date date,
    participation_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_challenges_pkey PRIMARY KEY (id),
    CONSTRAINT group_challenges_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.peer_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    job_opportunity_id uuid NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT peer_referrals_pkey PRIMARY KEY (id),
    CONSTRAINT peer_referrals_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE,
    CONSTRAINT peer_referrals_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT peer_referrals_job_id_fkey FOREIGN KEY (job_opportunity_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

-- UC-113: Family and Personal Support Integration
CREATE TABLE IF NOT EXISTS public.family_support_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    family_member_email character varying(255),
    family_member_name character varying(255),
    relationship character varying(50),
    access_level character varying(50),
    educational_resources_provided boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT family_support_access_pkey PRIMARY KEY (id),
    CONSTRAINT family_support_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.family_progress_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    summary_period_start date,
    summary_period_end date,
    summary_content text,
    milestones_shared jsonb,
    celebrations jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT family_progress_summaries_pkey PRIMARY KEY (id),
    CONSTRAINT family_progress_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.support_effectiveness_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    support_type character varying(50),
    emotional_support_score integer,
    impact_on_performance text,
    stress_management_notes text,
    wellbeing_indicators jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_effectiveness_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT support_effectiveness_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-114: Corporate Career Services Integration
CREATE TABLE IF NOT EXISTS public.enterprise_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_name character varying(255) NOT NULL,
    organization_type character varying(50),
    admin_user_id uuid NOT NULL,
    white_label_branding jsonb,
    max_users integer,
    active_users integer DEFAULT 0,
    subscription_tier character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT enterprise_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT enterprise_accounts_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(u_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.user_cohorts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    cohort_name character varying(255) NOT NULL,
    cohort_description text,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_cohorts_pkey PRIMARY KEY (id),
    CONSTRAINT user_cohorts_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES public.enterprise_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.cohort_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cohort_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cohort_memberships_pkey PRIMARY KEY (id),
    CONSTRAINT cohort_memberships_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.user_cohorts(id) ON DELETE CASCADE,
    CONSTRAINT cohort_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.program_effectiveness_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    cohort_id uuid,
    analysis_period_start date,
    analysis_period_end date,
    aggregate_metrics jsonb,
    outcome_tracking jsonb,
    roi_calculations jsonb,
    program_optimization_insights jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT program_effectiveness_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT program_effectiveness_analytics_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES public.enterprise_accounts(id) ON DELETE CASCADE,
    CONSTRAINT program_effectiveness_analytics_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.user_cohorts(id) ON DELETE SET NULL
);

-- UC-115: External Advisor and Coach Integration
CREATE TABLE IF NOT EXISTS public.external_advisors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    advisor_name character varying(255),
    advisor_email character varying(255),
    advisor_type character varying(50),
    relationship_status character varying(50) DEFAULT 'invited',
    permissions_granted jsonb,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT external_advisors_pkey PRIMARY KEY (id),
    CONSTRAINT external_advisors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_shared_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    data_type character varying(50),
    data_id uuid,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_shared_data_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_shared_data_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    recommendation_type character varying(50),
    recommendation_content text,
    implementation_status character varying(50) DEFAULT 'pending',
    impact_assessment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_recommendations_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_recommendations_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE,
    session_time time,
    session_notes text,
    action_items jsonb,
    billing_integration_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_sessions_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_performance_evaluation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    evaluation_period_start date,
    evaluation_period_end date,
    effectiveness_score integer,
    impact_on_job_search text,
    feedback text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_performance_evaluation_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_performance_evaluation_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

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

-- Add event_id column to networking_goals table to link goals to specific events
ALTER TABLE public.networking_goals 
ADD COLUMN IF NOT EXISTS event_id uuid;

-- Add foreign key constraint
ALTER TABLE public.networking_goals
ADD CONSTRAINT networking_goals_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_networking_goals_event_id ON public.networking_goals(event_id);

-- Event Registrations Table
-- Tracks which users have signed up for which events
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    registered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'registered',
    notes text,
    CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
    CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE,
    CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT event_registrations_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);

-- Add end_date and end_time to networking_events table
ALTER TABLE public.networking_events
ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE public.networking_events
ADD COLUMN IF NOT EXISTS end_time time;



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

-- Set ownership of all tables to ats_user
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Set ownership of all tables in public schema to ats_user
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO "ats_user"';
    END LOOP;
    
    RAISE NOTICE 'Ownership set for all tables to ats_user';
END $$;

-- Set ownership of all functions to ats_user
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Set ownership of all functions in public schema to ats_user
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        INNER JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    ) 
    LOOP
        BEGIN
            EXECUTE 'ALTER FUNCTION public.' || quote_ident(r.proname) || '(' || r.args || ') OWNER TO "ats_user"';
        EXCEPTION WHEN OTHERS THEN
            -- Skip if function doesn't exist or has issues
            CONTINUE;
        END;
    END LOOP;
    
    RAISE NOTICE 'Ownership set for all functions to ats_user';
END $$;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_interview_insights TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_template TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_comments TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_tailoring TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter_template TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cover_letter_performance TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cover_letter_template_usage TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.thank_you_notes TO "ats_user";

-- Sprint 3: Interview Preparation Suite tables (UC-074 to UC-085)
-- Note: UC-074 uses existing company_info, company_media, company_news tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_question_banks TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_practice_sessions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_response_coaching TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mock_interview_sessions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mock_interview_questions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mock_interview_followups TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.technical_prep_challenges TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.technical_prep_attempts TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whiteboarding_practice TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_preparation_tasks TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_sync_settings TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_analytics TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_preparation_checklists TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_followups TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.followup_templates TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.salary_negotiation_prep TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.writing_practice_sessions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_success_probability TO "ats_user";

-- Sprint 3: Network Relationship Management tables (UC-086 to UC-095)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.professional_contacts TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_interactions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_categories TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mutual_connections TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_job_links TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.referral_requests TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.referral_templates TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.networking_events TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_connections TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.networking_goals TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.linkedin_networking_templates TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.linkedin_profile_optimization TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.informational_interviews TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.informational_interview_templates TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mentor_relationships TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mentor_shared_data TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mentor_feedback TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mentor_dashboard_data TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.discovered_contacts TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.relationship_maintenance_reminders TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.relationship_health_tracking TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.networking_campaigns TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_outreach TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_ab_testing TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.professional_references TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reference_requests TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reference_request_templates TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reference_portfolios TO "ats_user";

-- Sprint 3: Analytics Dashboard tables (UC-096 to UC-107)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_search_metrics TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.performance_trends TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.application_success_analysis TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_performance_tracking TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.network_roi_analytics TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.salary_progression_tracking TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_salary_data TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.career_goals TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goal_milestones TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_intelligence TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.industry_trends TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.time_tracking TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.productivity_analysis TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.competitive_benchmarks TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.success_patterns TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.custom_reports TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.report_templates TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.performance_predictions TO "ats_user";

-- Sprint 3: Multi-User Collaboration tables (UC-108 to UC-115)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teams TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_members TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_dashboards TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_billing TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mentor_dashboard_views TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coaching_sessions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.document_review_requests TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.document_approvals TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.progress_sharing_settings TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.progress_reports TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accountability_relationships TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.support_groups TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_memberships TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_discussions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_challenges TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.peer_referrals TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.family_support_access TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.family_progress_summaries TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.support_effectiveness_tracking TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.enterprise_accounts TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_cohorts TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cohort_memberships TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_effectiveness_analytics TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.external_advisors TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.advisor_shared_data TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.advisor_recommendations TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.advisor_sessions TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.advisor_performance_evaluation TO "ats_user";

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.addupdatetime() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.auto_archive_jobs() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.log_material_history() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.lower_email() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_coverletter_timestamp() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_resume_timestamp() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_status_change_time() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.send_thank_you_note_email() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_thank_you_note_timestamp() TO "ats_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "ats_user";

-- Grant default privileges for future tables and functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "ats_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO "ats_user";

-- Set default ownership for future objects created by ats_user
ALTER DEFAULT PRIVILEGES FOR ROLE "ats_user" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "ats_user";
ALTER DEFAULT PRIVILEGES FOR ROLE "ats_user" IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO "ats_user";

COMMIT;

-- ============================================================================
-- CONSOLIDATED SCHEMA SCRIPT COMPLETE
-- ============================================================================
-- This script has created:
-- - 100+ tables with all columns and relationships
--   * Original tables: users, profiles, jobs, educations, skills, projects,
--     certifications, files, interviews, prospectivejobs, job_opportunities,
--     resume, resume_template, resume_comments, coverletter, coverletter_template,
--     company_info, company_media, company_news, company_interview_insights
--   * Sprint 3 Interview Preparation Suite (UC-074 to UC-085): 15+ tables
--   * Sprint 3 Network Relationship Management (UC-086 to UC-095): 20+ tables
--   * Sprint 3 Analytics Dashboard (UC-096 to UC-107): 15+ tables
--   * Sprint 3 Multi-User Collaboration (UC-108 to UC-115): 20+ tables
-- - 7 functions for triggers and business logic
-- - 80+ indexes for query optimization
-- - 8 triggers for automatic data management
-- - Database user (ats_user) with appropriate permissions
--
-- Sprint 3 Use Cases Implemented:
-- Interview Preparation Suite: UC-074, UC-075, UC-076, UC-077, UC-078, UC-079,
--   UC-080, UC-081, UC-082, UC-083, UC-084, UC-085
-- Network Relationship Management: UC-086, UC-087, UC-088, UC-089, UC-090,
--   UC-091, UC-092, UC-093, UC-094, UC-095
-- Analytics Dashboard: UC-096, UC-097, UC-098, UC-099, UC-100, UC-101,
--   UC-102, UC-103, UC-104, UC-105, UC-106, UC-107
-- Multi-User Collaboration: UC-108, UC-109, UC-110, UC-111, UC-112, UC-113,
--   UC-114, UC-115
--
-- Next steps:
-- 1. Verify the schema: \d+ in psql
-- 2. Update the ats_user password for production
-- 3. Test the application with the new schema
-- 4. Review all foreign key relationships and indexes
-- ============================================================================
