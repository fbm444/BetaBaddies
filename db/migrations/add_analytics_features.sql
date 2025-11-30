-- Migration: Add Analytics and Performance Tracking Features
-- Purpose: Support comprehensive job search analytics (UC-096 through UC-101)
-- This migration aligns with sprint3_tables_migration.sql schema
-- Created: 2024

BEGIN;

-- ============================================
-- 1. Add Application Source Tracking to Job Opportunities
-- ============================================
-- These columns support UC-097: Application Success Rate Analysis
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
-- 2. Enhance Interviews Table for Performance Tracking
-- ============================================
-- Add columns for UC-098: Interview Performance Tracking
-- Note: interviews table already exists and has been extended by add_interview_scheduling_features.sql
-- We're adding analytics-specific columns that may be missing

ALTER TABLE public.interviews
ADD COLUMN IF NOT EXISTS interview_round integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS confidence_rating integer CHECK (confidence_rating IS NULL OR (confidence_rating >= 1 AND confidence_rating <= 5)),
ADD COLUMN IF NOT EXISTS difficulty_rating integer CHECK (difficulty_rating IS NULL OR (difficulty_rating >= 1 AND difficulty_rating <= 5)),
ADD COLUMN IF NOT EXISTS preparation_hours numeric,
ADD COLUMN IF NOT EXISTS questions_asked text[], -- Array of questions asked
ADD COLUMN IF NOT EXISTS improvement_areas text[], -- Array of areas to improve
ADD COLUMN IF NOT EXISTS feedback_notes text; -- Rename/combine with existing outcome_notes if needed

-- Note: interview_type may already exist as 'type', check and add if missing
DO $$
BEGIN
    -- Check if 'interview_type' column exists, if not and 'type' exists, we can use 'type'
    -- Add interview_type if it doesn't exist and type column doesn't provide what we need
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'interviews' 
        AND column_name = 'interview_type'
    ) THEN
        -- interview_type might be redundant if 'type' already exists, but adding for clarity
        ALTER TABLE public.interviews 
        ADD COLUMN interview_type character varying(50);
    END IF;
END $$;

-- Create index for interview performance analytics
-- Only create index if outcome column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'interviews' 
        AND column_name = 'outcome'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_interviews_outcome ON public.interviews(outcome);
    END IF;
END $$;

COMMENT ON COLUMN public.interviews.interview_round IS 'Interview round number (1, 2, 3, etc.)';
COMMENT ON COLUMN public.interviews.confidence_rating IS 'Self-rated confidence level (1-5)';
COMMENT ON COLUMN public.interviews.difficulty_rating IS 'Self-rated difficulty level (1-5)';
COMMENT ON COLUMN public.interviews.preparation_hours IS 'Hours spent preparing for this interview';
COMMENT ON COLUMN public.interviews.questions_asked IS 'Array of questions asked during the interview';
COMMENT ON COLUMN public.interviews.improvement_areas IS 'Array of areas identified for improvement';
COMMENT ON COLUMN public.interviews.feedback_notes IS 'Detailed feedback and notes from the interview';

-- ============================================
-- 3. Note: Analytics Tables Already Exist
-- ============================================
-- The sprint3_tables_migration.sql already created these analytics tables:
-- - job_search_metrics (UC-096)
-- - application_success_analysis (UC-097)
-- - interview_performance_tracking (UC-098)
-- - network_roi_analytics (UC-099)
-- - salary_progression_tracking (UC-100)
-- - career_goals (UC-101)
-- - goal_milestones (UC-101)
--
-- Networking is handled by:
-- - professional_contacts (UC-099)
-- - networking_events (UC-099)
--
-- No need to create duplicate tables!

-- ============================================
-- 4. Grant Permissions for Enhanced Columns
-- ============================================
-- Permissions on job_opportunities and interviews tables should already exist
-- But we ensure they're granted

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_opportunities TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO ats_user;

COMMIT;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- This migration only adds missing columns to support analytics features.
-- 
-- Analytics aggregation tables already exist from sprint3_tables_migration.sql:
--   - Use those tables for storing calculated analytics
--   - This migration adds source data columns to job_opportunities and interviews
--
-- Goals tracking:
--   - Use existing 'career_goals' table (not 'goals')
--   - Use existing 'goal_milestones' table (not 'goal_progress')
--
-- Networking:
--   - Use existing 'professional_contacts' table
--   - Use existing 'networking_events' table
--
-- This migration is idempotent and can be run multiple times safely.
-- ============================================================================
