-- Fix: Ensure all analytics columns exist
-- Run this if you're getting "column does not exist" errors

BEGIN;

-- Add missing columns to job_opportunities if they don't exist
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS application_source character varying(100),
ADD COLUMN IF NOT EXISTS application_method character varying(100),
ADD COLUMN IF NOT EXISTS referral_contact_name character varying(255),
ADD COLUMN IF NOT EXISTS referral_contact_email character varying(255),
ADD COLUMN IF NOT EXISTS application_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS interview_scheduled_at timestamp with time zone;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_job_opp_application_source ON public.job_opportunities(application_source);
CREATE INDEX IF NOT EXISTS idx_job_opp_application_method ON public.job_opportunities(application_method);
CREATE INDEX IF NOT EXISTS idx_job_opp_submitted_at ON public.job_opportunities(application_submitted_at);

-- Add missing columns to interviews if they don't exist
ALTER TABLE public.interviews
ADD COLUMN IF NOT EXISTS interview_round integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS confidence_rating integer,
ADD COLUMN IF NOT EXISTS difficulty_rating integer,
ADD COLUMN IF NOT EXISTS preparation_hours numeric,
ADD COLUMN IF NOT EXISTS questions_asked text[],
ADD COLUMN IF NOT EXISTS improvement_areas text[],
ADD COLUMN IF NOT EXISTS feedback_notes text,
ADD COLUMN IF NOT EXISTS interview_type character varying(50);

-- Add constraints for rating columns if they don't exist
DO $$
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_confidence_rating_check;
    ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_difficulty_rating_check;
    
    -- Add constraints
    ALTER TABLE public.interviews 
    ADD CONSTRAINT interviews_confidence_rating_check 
    CHECK (confidence_rating IS NULL OR (confidence_rating >= 1 AND confidence_rating <= 5));
    
    ALTER TABLE public.interviews 
    ADD CONSTRAINT interviews_difficulty_rating_check 
    CHECK (difficulty_rating IS NULL OR (difficulty_rating >= 1 AND difficulty_rating <= 5));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create index for interviews outcome if column exists
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

COMMIT;
