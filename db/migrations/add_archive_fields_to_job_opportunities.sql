-- Migration: Add archive fields to job_opportunities table
-- Purpose: Enable archiving of completed or irrelevant job opportunities

ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archive_reason character varying(255);

-- Add index on archived field for efficient filtering
CREATE INDEX IF NOT EXISTS idx_job_opportunities_archived ON public.job_opportunities(archived);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_archived ON public.job_opportunities(user_id, archived);

-- Add comments for documentation
COMMENT ON COLUMN public.job_opportunities.archived IS 'Whether the job opportunity has been archived';
COMMENT ON COLUMN public.job_opportunities.archived_at IS 'Timestamp when the job opportunity was archived';
COMMENT ON COLUMN public.job_opportunities.archive_reason IS 'Reason for archiving the job opportunity';

