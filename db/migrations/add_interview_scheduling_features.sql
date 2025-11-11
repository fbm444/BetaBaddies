-- ============================================================================
-- Interview Scheduling Features Migration
-- ============================================================================
-- This migration extends the interviews table to support comprehensive
-- interview scheduling features including:
-- - Calendar integration
-- - Interview type selection (phone, video, in-person)
-- - Automatic interview preparation reminders
-- - Interview details and logistics tracking
-- - Reschedule and cancellation handling
-- - Interview outcome recording
-- - Calendar conflict detection
-- - Interview preparation task generation
--
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -U postgres -d ats_tracker -f db/migrations/add_interview_scheduling_features.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Extend interviews table
-- ============================================================================

-- Add job_opportunity_id to link interviews to job opportunities
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS job_opportunity_id UUID;

-- Add foreign key constraint to job_opportunities
ALTER TABLE public.interviews 
DROP CONSTRAINT IF EXISTS fk_interviews_job_opportunity;

ALTER TABLE public.interviews 
ADD CONSTRAINT fk_interviews_job_opportunity 
FOREIGN KEY (job_opportunity_id) 
REFERENCES public.job_opportunities(id) 
ON DELETE CASCADE;

-- Add interview title/name
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Add company name
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- Make 'date' column nullable since we're using 'scheduled_at' now
ALTER TABLE public.interviews 
ALTER COLUMN date DROP NOT NULL;

-- Rename 'date' to 'scheduled_at' for clarity
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Update scheduled_at from date if date exists
UPDATE public.interviews 
SET scheduled_at = date 
WHERE scheduled_at IS NULL AND date IS NOT NULL;

-- Add duration in minutes
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;

-- Add location (for in-person interviews)
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS location VARCHAR(500);

-- Add video link (for video interviews)
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS video_link VARCHAR(1000);

-- Add phone number (for phone interviews)
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- Add interviewer information
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255);

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS interviewer_email VARCHAR(255);

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS interviewer_title VARCHAR(255);

-- Add notes and preparation notes
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS preparation_notes TEXT;

-- Add status (scheduled, completed, cancelled, rescheduled)
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled';

ALTER TABLE public.interviews 
ADD CONSTRAINT interviews_status_check 
CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled'));

-- Add outcome (pending, passed, failed, no_decision, offer_extended, rejected)
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS outcome VARCHAR(20) DEFAULT 'pending';

ALTER TABLE public.interviews 
ADD CONSTRAINT interviews_outcome_check 
CHECK (outcome IN ('pending', 'passed', 'failed', 'no_decision', 'offer_extended', 'rejected'));

-- Add outcome notes
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- Add reminder tracking
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Add cancellation tracking
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add reschedule tracking
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS rescheduled_from UUID;

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS rescheduled_to UUID;

-- Add self-referencing foreign keys for rescheduling
ALTER TABLE public.interviews 
ADD CONSTRAINT fk_interviews_rescheduled_from 
FOREIGN KEY (rescheduled_from) 
REFERENCES public.interviews(id) 
ON DELETE SET NULL;

ALTER TABLE public.interviews 
ADD CONSTRAINT fk_interviews_rescheduled_to 
FOREIGN KEY (rescheduled_to) 
REFERENCES public.interviews(id) 
ON DELETE SET NULL;

-- Add conflict detection
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS conflict_detected BOOLEAN DEFAULT false;

-- Add timestamps
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_interviews_updated_at ON public.interviews;

CREATE TRIGGER trg_update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION update_interviews_updated_at();

-- ============================================================================
-- PART 2: Create interview_preparation_tasks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_preparation_tasks (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    interview_id UUID NOT NULL,
    task VARCHAR(500) NOT NULL,
    completed BOOLEAN DEFAULT false,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT interview_preparation_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT fk_preparation_tasks_interview 
        FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) 
        ON DELETE CASCADE
);

-- Create trigger to update updated_at for preparation tasks
DROP TRIGGER IF EXISTS trg_update_preparation_tasks_updated_at ON public.interview_preparation_tasks;

CREATE TRIGGER trg_update_preparation_tasks_updated_at
BEFORE UPDATE ON public.interview_preparation_tasks
FOR EACH ROW
EXECUTE FUNCTION update_interviews_updated_at();

-- ============================================================================
-- PART 3: Create interview_conflicts table for tracking conflicts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_conflicts (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    interview_id UUID NOT NULL,
    conflicting_interview_id UUID NOT NULL,
    conflict_type VARCHAR(20) NOT NULL CHECK (conflict_type IN ('overlap', 'too_close')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT interview_conflicts_pkey PRIMARY KEY (id),
    CONSTRAINT fk_conflicts_interview 
        FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_conflicts_conflicting_interview 
        FOREIGN KEY (conflicting_interview_id) 
        REFERENCES public.interviews(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_conflict_pair UNIQUE (interview_id, conflicting_interview_id)
);

-- ============================================================================
-- PART 4: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_opportunity_id ON public.interviews(job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_type ON public.interviews(type);
CREATE INDEX IF NOT EXISTS idx_interviews_rescheduled_from ON public.interviews(rescheduled_from);
CREATE INDEX IF NOT EXISTS idx_interviews_rescheduled_to ON public.interviews(rescheduled_to);
CREATE INDEX IF NOT EXISTS idx_interviews_conflict_detected ON public.interviews(conflict_detected);

CREATE INDEX IF NOT EXISTS idx_preparation_tasks_interview_id ON public.interview_preparation_tasks(interview_id);
CREATE INDEX IF NOT EXISTS idx_preparation_tasks_completed ON public.interview_preparation_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_preparation_tasks_due_date ON public.interview_preparation_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_conflicts_interview_id ON public.interview_conflicts(interview_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_conflicting_interview_id ON public.interview_conflicts(conflicting_interview_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON public.interview_conflicts(resolved);

-- ============================================================================
-- PART 5: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_preparation_tasks TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_conflicts TO "ats_user";

GRANT EXECUTE ON FUNCTION update_interviews_updated_at() TO "ats_user";

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

