-- Migration: Add detailed fields to job_opportunities table
-- Purpose: Enable detailed tracking of job opportunities including notes, contacts, and application history

-- Add notes field for personal observations (unlimited text)
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS notes text;

-- Add recruiter contact information
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS recruiter_name character varying(255),
ADD COLUMN IF NOT EXISTS recruiter_email character varying(255),
ADD COLUMN IF NOT EXISTS recruiter_phone character varying(50);

-- Add hiring manager contact information
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS hiring_manager_name character varying(255),
ADD COLUMN IF NOT EXISTS hiring_manager_email character varying(255),
ADD COLUMN IF NOT EXISTS hiring_manager_phone character varying(50);

-- Add salary negotiation notes
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS salary_negotiation_notes text;

-- Add interview notes and feedback
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS interview_notes text;

-- Add application history as JSONB field
-- Structure: [{"timestamp": "2024-01-01T12:00:00Z", "status": "Applied", "notes": "Submitted application"}]
ALTER TABLE public.job_opportunities
ADD COLUMN IF NOT EXISTS application_history jsonb DEFAULT '[]'::jsonb;

-- Create index on application_history for faster queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_job_opportunities_application_history ON public.job_opportunities USING GIN (application_history);

-- Add comments for documentation
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

