-- ============================================================================
-- Migration: Fix resume table foreign key constraint
-- Purpose: Update fk_resume_job to reference job_opportunities instead of jobs
-- ============================================================================
-- This migration fixes the foreign key constraint on the resume table's job_id
-- column to reference the correct table (job_opportunities instead of jobs).
--
-- This script is idempotent - it can be run multiple times safely.
--
-- Usage:
--   psql -U postgres -d ats_database -f db/migrations/fix_resume_job_foreign_key.sql
-- ============================================================================

BEGIN;

-- Drop the old foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'fk_resume_job'
    ) THEN
        ALTER TABLE public.resume DROP CONSTRAINT fk_resume_job;
        RAISE NOTICE 'Dropped old fk_resume_job constraint';
    END IF;
END $$;

-- Add the correct foreign key constraint pointing to job_opportunities
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_opportunities') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'fk_resume_job_opportunity'
        ) THEN
            ALTER TABLE public.resume 
            ADD CONSTRAINT fk_resume_job_opportunity 
            FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added fk_resume_job_opportunity constraint';
        ELSE
            RAISE NOTICE 'Constraint fk_resume_job_opportunity already exists';
        END IF;
    ELSE
        RAISE WARNING 'Table job_opportunities does not exist. Cannot add foreign key constraint.';
    END IF;
END $$;

COMMIT;

