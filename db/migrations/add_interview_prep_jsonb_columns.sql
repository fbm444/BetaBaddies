-- ============================================================================
-- Add JSONB columns to interviews table for interview preparation data
-- ============================================================================
-- This migration adds JSONB columns to store preparation data directly in
-- the interviews table, complementing the existing Sprint 3 tables.
--
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -U postgres -d ats_tracker -f db/migrations/add_interview_prep_jsonb_columns.sql
-- ============================================================================

BEGIN;

-- Add preparation_data JSONB column to store question banks, technical prep, etc.
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS preparation_data JSONB DEFAULT '{}'::jsonb;

-- Add company_research_data JSONB column for interview-specific research enhancements
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS company_research_data JSONB DEFAULT '{}'::jsonb;

-- Add index for JSONB queries on preparation_data
CREATE INDEX IF NOT EXISTS idx_interviews_preparation_data 
ON public.interviews USING GIN (preparation_data);

-- Add index for JSONB queries on company_research_data
CREATE INDEX IF NOT EXISTS idx_interviews_company_research_data 
ON public.interviews USING GIN (company_research_data);

COMMENT ON COLUMN public.interviews.preparation_data IS 'JSONB storing question banks, technical prep, and other preparation materials';
COMMENT ON COLUMN public.interviews.company_research_data IS 'JSONB storing interview-specific company research enhancements';

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

