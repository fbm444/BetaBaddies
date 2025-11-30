-- Migration: Add Analytics and Performance Tracking Features
-- Purpose: Support comprehensive job search analytics (UC-096 through UC-101)
-- Created: 2024

-- ============================================
-- 1. Goals Table (UC-101: Goal Setting and Achievement Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    title character varying(255) NOT NULL,
    description text,
    category character varying(50) NOT NULL, -- 'career', 'job_search', 'skills', 'networking', 'salary'
    goal_type character varying(50) NOT NULL, -- 'short_term', 'long_term'
    target_value numeric,
    current_value numeric DEFAULT 0,
    unit character varying(50), -- 'applications', 'interviews', 'offers', 'dollars', 'percent', 'count'
    target_date date,
    start_date date DEFAULT CURRENT_DATE,
    status character varying(50) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    priority character varying(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON public.goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date);

COMMENT ON TABLE public.goals IS 'SMART career goals with tracking and achievement metrics';
COMMENT ON COLUMN public.goals.category IS 'Goal category: career, job_search, skills, networking, salary';
COMMENT ON COLUMN public.goals.goal_type IS 'Goal type: short_term (less than 1 year), long_term (1+ years)';

-- ============================================
-- 2. Goal Progress History Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.goal_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    value numeric NOT NULL,
    notes text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON public.goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_user_id ON public.goal_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_recorded_at ON public.goal_progress(recorded_at);

-- ============================================
-- 3. Networking Activities Table (UC-099: Network ROI Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.networking_activities (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    contact_name character varying(255),
    contact_email character varying(255),
    contact_linkedin character varying(500),
    contact_company character varying(255),
    contact_title character varying(255),
    activity_type character varying(50) NOT NULL, -- 'event', 'coffee_chat', 'email', 'linkedin', 'referral_request', 'follow_up'
    event_name character varying(255),
    event_date date,
    location character varying(255),
    notes text,
    relationship_strength character varying(20) DEFAULT 'weak', -- 'weak', 'medium', 'strong'
    referral_provided boolean DEFAULT false,
    job_opportunity_id uuid REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
    outcome character varying(50), -- 'referral', 'information', 'no_response', 'ongoing'
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_networking_user_id ON public.networking_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_activity_type ON public.networking_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_networking_event_date ON public.networking_activities(event_date);
CREATE INDEX IF NOT EXISTS idx_networking_job_opportunity ON public.networking_activities(job_opportunity_id);

COMMENT ON TABLE public.networking_activities IS 'Track networking activities and relationship building';
COMMENT ON COLUMN public.networking_activities.activity_type IS 'Type: event, coffee_chat, email, linkedin, referral_request, follow_up';

-- ============================================
-- 4. Add Application Source Tracking to Job Opportunities
-- ============================================
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS application_source character varying(100), -- 'job_board', 'company_website', 'referral', 'recruiter', 'networking', 'social_media', 'other'
ADD COLUMN IF NOT EXISTS application_method character varying(100), -- 'online_form', 'email', 'linkedin_easy_apply', 'recruiter_submission', 'direct_application'
ADD COLUMN IF NOT EXISTS referral_contact_name character varying(255),
ADD COLUMN IF NOT EXISTS referral_contact_email character varying(255),
ADD COLUMN IF NOT EXISTS application_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS interview_scheduled_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_job_opp_application_source ON public.job_opportunities(application_source);
CREATE INDEX IF NOT EXISTS idx_job_opp_application_method ON public.job_opportunities(application_method);
CREATE INDEX IF NOT EXISTS idx_job_opp_submitted_at ON public.job_opportunities(application_submitted_at);

COMMENT ON COLUMN public.job_opportunities.application_source IS 'How the job opportunity was found';
COMMENT ON COLUMN public.job_opportunities.application_method IS 'Method used to submit application';
COMMENT ON COLUMN public.job_opportunities.application_submitted_at IS 'When the application was actually submitted';
COMMENT ON COLUMN public.job_opportunities.first_response_at IS 'When first response was received from employer';
COMMENT ON COLUMN public.job_opportunities.interview_scheduled_at IS 'When first interview was scheduled';

-- ============================================
-- 5. Interview Performance Tracking Enhancements
-- (Uses existing interviews table, but adding analytics columns)
-- ============================================
-- Check if interviews table exists, if not create it
CREATE TABLE IF NOT EXISTS public.interviews (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_opportunity_id uuid REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    interview_type character varying(50), -- 'phone', 'video', 'in_person', 'technical', 'behavioral', 'panel', 'final'
    interview_round integer DEFAULT 1,
    scheduled_at timestamp with time zone,
    duration_minutes integer,
    interviewer_name character varying(255),
    interviewer_title character varying(255),
    status character varying(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'rescheduled'
    outcome character varying(50), -- 'pending', 'passed', 'failed', 'offer_extended', 'rejected'
    feedback_notes text,
    confidence_rating integer CHECK (confidence_rating >= 1 AND confidence_rating <= 5),
    difficulty_rating integer CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    preparation_hours numeric,
    questions_asked text[], -- Array of questions asked
    improvement_areas text[], -- Array of areas to improve
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interviews_job_opportunity ON public.interviews(job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_outcome ON public.interviews(outcome);

COMMENT ON TABLE public.interviews IS 'Detailed interview tracking for performance analytics';

-- ============================================
-- 6. Add Triggers for Updated Timestamps
-- ============================================
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

CREATE TRIGGER update_networking_activities_updated_at
    BEFORE UPDATE ON public.networking_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

CREATE TRIGGER update_interviews_updated_at
    BEFORE UPDATE ON public.interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

-- ============================================
-- 7. Grant Permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_progress TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.networking_activities TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO ats_user;

GRANT USAGE, SELECT ON SEQUENCE public.goals_id_seq TO ats_user;
GRANT USAGE, SELECT ON SEQUENCE public.goal_progress_id_seq TO ats_user;
GRANT USAGE, SELECT ON SEQUENCE public.networking_activities_id_seq TO ats_user;
GRANT USAGE, SELECT ON SEQUENCE public.interviews_id_seq TO ats_user;

