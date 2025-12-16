-- Fix migration: Drop and recreate if there are issues
-- This script will safely recreate the interview response library tables

-- Drop existing objects if they exist (in reverse dependency order)
DROP TRIGGER IF EXISTS set_initial_current_version ON public.interview_response_versions;
DROP TRIGGER IF EXISTS update_interview_responses_updated_at ON public.interview_responses;
DROP FUNCTION IF EXISTS set_initial_current_version() CASCADE;
DROP FUNCTION IF EXISTS update_interview_responses_updated_at() CASCADE;

DROP TABLE IF EXISTS public.interview_response_suggestions CASCADE;
DROP TABLE IF EXISTS public.interview_response_outcomes CASCADE;
DROP TABLE IF EXISTS public.interview_response_tags CASCADE;
DROP TABLE IF EXISTS public.interview_response_versions CASCADE;
DROP TABLE IF EXISTS public.interview_responses CASCADE;

-- Recreate tables
CREATE TABLE public.interview_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying(50) NOT NULL CHECK (question_type IN ('behavioral', 'technical', 'situational')),
    current_version_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_responses_pkey PRIMARY KEY (id),
    CONSTRAINT interview_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE public.interview_response_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_id uuid NOT NULL,
    version_number integer NOT NULL,
    response_text text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    edit_notes text,
    CONSTRAINT interview_response_versions_pkey PRIMARY KEY (id),
    CONSTRAINT interview_response_versions_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.interview_responses(id) ON DELETE CASCADE,
    CONSTRAINT interview_response_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT unique_response_version UNIQUE (response_id, version_number)
);

CREATE TABLE public.interview_response_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_id uuid NOT NULL,
    tag_type character varying(50) NOT NULL CHECK (tag_type IN ('skill', 'experience', 'company', 'technology', 'industry')),
    tag_value character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_response_tags_pkey PRIMARY KEY (id),
    CONSTRAINT interview_response_tags_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.interview_responses(id) ON DELETE CASCADE,
    CONSTRAINT unique_response_tag UNIQUE (response_id, tag_type, tag_value)
);

CREATE TABLE public.interview_response_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_id uuid NOT NULL,
    interview_id uuid,
    outcome_type character varying(50) NOT NULL CHECK (outcome_type IN ('offer', 'next_round', 'rejected', 'no_decision')),
    company character varying(255),
    job_title character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_response_outcomes_pkey PRIMARY KEY (id),
    CONSTRAINT interview_response_outcomes_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.interview_responses(id) ON DELETE CASCADE,
    CONSTRAINT interview_response_outcomes_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE SET NULL
);

CREATE TABLE public.interview_response_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_id uuid NOT NULL,
    job_requirements jsonb,
    suggested_version_id uuid,
    confidence_score numeric(5, 2),
    reasoning text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_response_suggestions_pkey PRIMARY KEY (id),
    CONSTRAINT interview_response_suggestions_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.interview_responses(id) ON DELETE CASCADE,
    CONSTRAINT interview_response_suggestions_suggested_version_id_fkey FOREIGN KEY (suggested_version_id) REFERENCES public.interview_response_versions(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_interview_responses_user_id ON public.interview_responses(user_id);
CREATE INDEX idx_interview_responses_question_type ON public.interview_responses(question_type);
CREATE INDEX idx_interview_response_versions_response_id ON public.interview_response_versions(response_id);
CREATE INDEX idx_interview_response_tags_response_id ON public.interview_response_tags(response_id);
CREATE INDEX idx_interview_response_tags_tag_value ON public.interview_response_tags(tag_value);
CREATE INDEX idx_interview_response_outcomes_response_id ON public.interview_response_outcomes(response_id);
CREATE INDEX idx_interview_response_outcomes_outcome_type ON public.interview_response_outcomes(outcome_type);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interview_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interview_responses_updated_at
    BEFORE UPDATE ON public.interview_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_responses_updated_at();

-- Create trigger function to set current_version_id
CREATE OR REPLACE FUNCTION set_initial_current_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Always update to the latest version
    UPDATE public.interview_responses 
    SET current_version_id = NEW.id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.response_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_initial_current_version
    AFTER INSERT ON public.interview_response_versions
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_current_version();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_responses TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_response_versions TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_response_tags TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_response_outcomes TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_response_suggestions TO ats_user;

