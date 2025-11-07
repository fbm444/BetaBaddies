-- Migration: Create job_opportunities table
-- Purpose: Track job opportunities/positions that users are interested in applying for
-- This is separate from the jobs table which tracks employment history

CREATE TABLE IF NOT EXISTS public.job_opportunities (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    title character varying(255) NOT NULL,
    company character varying(255) NOT NULL,
    location character varying(256) NOT NULL,
    salary_min numeric,
    salary_max numeric,
    job_posting_url character varying(1000),
    application_deadline date,
    job_description text,
    industry character varying(255),
    job_type character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_id ON public.job_opportunities(user_id);

-- Create index on application_deadline for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_job_opportunities_deadline ON public.job_opportunities(application_deadline);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_job_opportunities_updated_at
    BEFORE UPDATE ON public.job_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

-- Add comments for documentation
COMMENT ON TABLE public.job_opportunities IS 'Tracks job opportunities that users are interested in applying for';
COMMENT ON COLUMN public.job_opportunities.title IS 'Job title/position name';
COMMENT ON COLUMN public.job_opportunities.company IS 'Company name';
COMMENT ON COLUMN public.job_opportunities.location IS 'Job location (city, state, remote, etc.)';
COMMENT ON COLUMN public.job_opportunities.salary_min IS 'Minimum salary in the range';
COMMENT ON COLUMN public.job_opportunities.salary_max IS 'Maximum salary in the range';
COMMENT ON COLUMN public.job_opportunities.job_posting_url IS 'URL to the original job posting';
COMMENT ON COLUMN public.job_opportunities.application_deadline IS 'Application deadline date';
COMMENT ON COLUMN public.job_opportunities.job_description IS 'Job description (max 2000 characters)';
COMMENT ON COLUMN public.job_opportunities.industry IS 'Industry sector';
COMMENT ON COLUMN public.job_opportunities.job_type IS 'Job type (Full-time, Part-time, Contract, etc.)';

