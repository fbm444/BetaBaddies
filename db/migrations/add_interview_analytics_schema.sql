-- ============================================================================
-- Interview Analytics Schema Migration
-- ============================================================================
-- This migration adds the necessary database schema for interview analytics
-- Run this script in your PostgreSQL database to enable analytics features
-- ============================================================================

-- PART 1: Add format/category field to interviews table
-- This allows tracking different interview formats (Phone Screen, Technical, Behavioral, etc.)
-- ============================================================================

-- Add format column to interviews table
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS format character varying(50);

-- Add constraint for valid format values
-- Format options: 'phone_screen', 'hirevue', 'technical', 'behavioral', 'on_site', 'system_design', 'other'
ALTER TABLE public.interviews
DROP CONSTRAINT IF EXISTS interviews_format_check;

ALTER TABLE public.interviews
ADD CONSTRAINT interviews_format_check 
CHECK (format IS NULL OR format IN ('phone_screen', 'hirevue', 'technical', 'behavioral', 'on_site', 'system_design', 'other'));

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_interviews_format ON public.interviews(format);

-- Add comment for documentation
COMMENT ON COLUMN public.interviews.format IS 'Interview format/category: phone_screen, hirevue, technical, behavioral, on_site, system_design, or other';

-- ============================================================================
-- PART 2: Create interview_feedback table
-- This table stores performance assessments for different skill areas
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    skill_area character varying(50) NOT NULL,
    score integer NOT NULL CHECK (score >= 0 AND score <= 100),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT fk_interview_feedback_interview FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_interview_feedback_user FOREIGN KEY (user_id) 
        REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT interview_feedback_skill_area_check 
        CHECK (skill_area IN ('system_design', 'algorithms', 'apis', 'behavioral', 'time_management'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON public.interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_user_id ON public.interview_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_skill_area ON public.interview_feedback(skill_area);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_user_skill ON public.interview_feedback(user_id, skill_area);

-- Add comments for documentation
COMMENT ON TABLE public.interview_feedback IS 'Stores performance assessments for interviews across different skill areas';
COMMENT ON COLUMN public.interview_feedback.skill_area IS 'Skill area: system_design, algorithms, apis, behavioral, or time_management';
COMMENT ON COLUMN public.interview_feedback.score IS 'Performance score from 0 to 100';

-- ============================================================================
-- PART 3: Create practice_sessions table (Optional - for tracking practice interviews)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_date timestamp with time zone NOT NULL,
    format character varying(50) NOT NULL,
    duration_minutes integer,
    overall_score integer CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT practice_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_practice_sessions_user FOREIGN KEY (user_id) 
        REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_session_date ON public.practice_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_format ON public.practice_sessions(format);

-- Add comments for documentation
COMMENT ON TABLE public.practice_sessions IS 'Tracks practice interview sessions separately from real interviews';
COMMENT ON COLUMN public.practice_sessions.format IS 'Practice session format: technical, behavioral, system_design, etc.';
COMMENT ON COLUMN public.practice_sessions.overall_score IS 'Overall performance score from 0 to 100';

-- ============================================================================
-- PART 4: Create function to update interview_feedback updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_interview_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Create trigger for interview_feedback
DROP TRIGGER IF EXISTS trg_update_interview_feedback_updated_at ON public.interview_feedback;
CREATE TRIGGER trg_update_interview_feedback_updated_at
    BEFORE UPDATE ON public.interview_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.update_interview_feedback_updated_at();

-- Create trigger for practice_sessions
DROP TRIGGER IF EXISTS trg_update_practice_sessions_updated_at ON public.practice_sessions;
CREATE TRIGGER trg_update_practice_sessions_updated_at
    BEFORE UPDATE ON public.practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_interview_feedback_updated_at();

-- ============================================================================
-- PART 5: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_feedback TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.practice_sessions TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_interview_feedback_updated_at() TO "ats_user";

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- You can now:
-- 1. Update existing interviews with format values (see backfill script)
-- 2. Start creating interview_feedback entries when interviews are completed
-- 3. Track practice sessions separately from real interviews
-- ============================================================================

