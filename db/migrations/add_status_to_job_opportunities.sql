-- Migration: Add status tracking to job_opportunities table
-- Purpose: Enable tracking of job application status through pipeline stages

-- Add status column with default value
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS status character varying(50) DEFAULT 'Interested' NOT NULL;

-- Add status_updated_at timestamp to track when status was last changed
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone DEFAULT now() NOT NULL;

-- Create index on status for faster filtering and queries
CREATE INDEX IF NOT EXISTS idx_job_opportunities_status ON public.job_opportunities(status);

-- Create index on status_updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_job_opportunities_status_updated_at ON public.job_opportunities(status_updated_at);

-- Add check constraint to ensure status is one of the valid values
ALTER TABLE public.job_opportunities
DROP CONSTRAINT IF EXISTS check_job_opportunity_status;

ALTER TABLE public.job_opportunities
ADD CONSTRAINT check_job_opportunity_status 
CHECK (status IN ('Interested', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'));

-- Add comments for documentation
COMMENT ON COLUMN public.job_opportunities.status IS 'Application status: Interested, Applied, Phone Screen, Interview, Offer, Rejected';
COMMENT ON COLUMN public.job_opportunities.status_updated_at IS 'Timestamp when the status was last updated';

-- Update existing records to set status_updated_at to created_at if not set
UPDATE public.job_opportunities
SET status_updated_at = created_at
WHERE status_updated_at IS NULL;

