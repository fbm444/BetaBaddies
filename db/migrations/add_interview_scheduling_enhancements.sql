-- ============================================================================
-- Interview Scheduling Enhancements Migration
-- ============================================================================
-- This migration adds support for:
-- 1. Interview reminder system (24h and 2h reminders)
-- 2. Thank-you note tracking
-- 3. Follow-up actions tracking
-- 4. Google Calendar integration support (columns may already exist)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Ensure Google Calendar columns exist in users table
-- ============================================================================

-- Check if google_calendar columns exist, if not add them (for safety)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_token_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_calendar_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255);

-- ============================================================================
-- PART 2: Ensure Google Calendar event ID exists in interviews table
-- ============================================================================

-- Ensure Google Calendar event ID exists (might already exist)
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);

-- ============================================================================
-- PART 3: Create interview_reminders table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL,
    reminder_type VARCHAR(20) NOT NULL 
        CHECK (reminder_type IN ('24_hours', '2_hours', 'custom')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT fk_reminders_interview 
        FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_interview_reminder 
        UNIQUE (interview_id, reminder_type)
);

-- Create index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON public.interview_reminders(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_reminders_interview_id ON public.interview_reminders(interview_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.interview_reminders(status);

-- Add comment
COMMENT ON TABLE public.interview_reminders IS 'Tracks scheduled email reminders for interviews (24h and 2h before)';

-- ============================================================================
-- PART 4: Create interview_thank_you_notes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_thank_you_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT fk_thank_you_notes_interview 
        FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) 
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_thank_you_notes_interview_id ON public.interview_thank_you_notes(interview_id);
CREATE INDEX IF NOT EXISTS idx_thank_you_notes_status ON public.interview_thank_you_notes(status);
CREATE INDEX IF NOT EXISTS idx_thank_you_notes_sent_at ON public.interview_thank_you_notes(sent_at);

-- Add comment
COMMENT ON TABLE public.interview_thank_you_notes IS 'Tracks thank-you notes sent after interviews';

-- ============================================================================
-- PART 5: Create interview_follow_ups table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL 
        CHECK (action_type IN (
            'thank_you_note', 
            'follow_up_email', 
            'status_inquiry', 
            'references_sent', 
            'portfolio_sent', 
            'other'
        )),
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT fk_follow_ups_interview 
        FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) 
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follow_ups_interview_id ON public.interview_follow_ups(interview_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_completed ON public.interview_follow_ups(completed);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.interview_follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_action_type ON public.interview_follow_ups(action_type);

-- Add comment
COMMENT ON TABLE public.interview_follow_ups IS 'Tracks follow-up actions recommended after interviews';

-- ============================================================================
-- PART 6: Create trigger function for updated_at timestamps
-- ============================================================================

-- Function for reminders updated_at
CREATE OR REPLACE FUNCTION public.update_reminders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_reminders_updated_at
    BEFORE UPDATE ON public.interview_reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reminders_updated_at();

-- Function for thank_you_notes updated_at
CREATE OR REPLACE FUNCTION public.update_thank_you_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_thank_you_notes_updated_at
    BEFORE UPDATE ON public.interview_thank_you_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_thank_you_notes_updated_at();

-- Function for follow_ups updated_at
CREATE OR REPLACE FUNCTION public.update_follow_ups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_follow_ups_updated_at
    BEFORE UPDATE ON public.interview_follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_follow_ups_updated_at();

-- ============================================================================
-- PART 7: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_reminders TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_thank_you_notes TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_follow_ups TO "ats_user";

GRANT EXECUTE ON FUNCTION public.update_reminders_updated_at() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_thank_you_notes_updated_at() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_follow_ups_updated_at() TO "ats_user";

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

