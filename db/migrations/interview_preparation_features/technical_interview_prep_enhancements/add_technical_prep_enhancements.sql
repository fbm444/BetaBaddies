-- ============================================================================
-- Add enhancements to technical_prep_challenges table for UC-078
-- ============================================================================
-- This migration adds columns for whiteboarding techniques and performance metrics
-- to support comprehensive technical interview preparation.
--
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -d ats_tracker -f db/migrations/interview_preparation_features/technical_interview_prep_enhancements/add_technical_prep_enhancements.sql
-- ============================================================================

BEGIN;

-- Add whiteboarding_techniques column for whiteboarding practice tips
ALTER TABLE public.technical_prep_challenges
ADD COLUMN IF NOT EXISTS whiteboarding_techniques TEXT;

-- Add performance_metrics JSONB column for tracking performance expectations
ALTER TABLE public.technical_prep_challenges
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}'::jsonb;

-- Add index for JSONB queries on performance_metrics
CREATE INDEX IF NOT EXISTS idx_technical_prep_challenges_performance_metrics 
ON public.technical_prep_challenges USING GIN (performance_metrics);

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

