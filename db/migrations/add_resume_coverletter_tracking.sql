-- =====================================================
-- Migration: Add Resume and Cover Letter Tracking to Job Opportunities
-- Purpose: Track which resume/cover letter was used for each application
-- Created: 2025-01-XX
-- =====================================================

BEGIN;

-- Add resume_id and coverletter_id columns to job_opportunities if they don't exist
-- This allows tracking which materials were actually used for each application
DO $$ 
BEGIN
    -- Add resume_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'job_opportunities' 
        AND column_name = 'resume_id'
    ) THEN
        ALTER TABLE public.job_opportunities 
        ADD COLUMN resume_id UUID,
        ADD CONSTRAINT fk_job_opportunities_resume 
            FOREIGN KEY (resume_id) REFERENCES public.resume(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.job_opportunities.resume_id IS 
            'Resume that was used for this job application';
    END IF;

    -- Add coverletter_id column  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'job_opportunities' 
        AND column_name = 'coverletter_id'
    ) THEN
        ALTER TABLE public.job_opportunities 
        ADD COLUMN coverletter_id UUID,
        ADD CONSTRAINT fk_job_opportunities_coverletter 
            FOREIGN KEY (coverletter_id) REFERENCES public.coverletter(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.job_opportunities.coverletter_id IS 
            'Cover letter that was used for this job application';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_opportunities_resume_id ON public.job_opportunities(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_coverletter_id ON public.job_opportunities(coverletter_id);

COMMIT;

