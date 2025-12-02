-- ============================================================================
-- Add solution_code column to technical_prep_challenges table
-- ============================================================================
-- This migration adds a column to store actual code solutions for challenges
--
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -d ats_tracker -f db/migrations/interview_preparation_features/technical_interview_prep_enhancements/add_solution_code_to_technical_prep.sql
-- ============================================================================

BEGIN;

-- Add solution_code column for storing actual code solutions
ALTER TABLE public.technical_prep_challenges
ADD COLUMN IF NOT EXISTS solution_code TEXT;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

