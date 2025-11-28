-- ============================================================================
-- Migration: Add Enriched Fields to Company Info
-- ============================================================================
-- This migration adds fields for AI-enriched company data (mission, culture, values, etc.)
-- to support comprehensive company research for interviews (UC-074)
-- ============================================================================

BEGIN;

-- Add enriched fields to company_info table
ALTER TABLE public.company_info
ADD COLUMN IF NOT EXISTS mission text,
ADD COLUMN IF NOT EXISTS culture text,
ADD COLUMN IF NOT EXISTS values text,
ADD COLUMN IF NOT EXISTS recent_developments text,
ADD COLUMN IF NOT EXISTS products text,
ADD COLUMN IF NOT EXISTS competitors text,
ADD COLUMN IF NOT EXISTS why_work_here text,
ADD COLUMN IF NOT EXISTS interview_tips text,
ADD COLUMN IF NOT EXISTS founded_year integer,
ADD COLUMN IF NOT EXISTS enriched_data jsonb DEFAULT '{}'::jsonb;

COMMIT;

