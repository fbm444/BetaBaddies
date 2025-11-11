-- ============================================================================
-- Google Calendar Integration Migration
-- ============================================================================
-- This migration adds support for Google Calendar integration:
-- - Store Google Calendar access tokens and refresh tokens
-- - Track calendar sync status
-- - Store calendar event IDs for interviews
--
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -U postgres -d ats_tracker -f db/migrations/add_google_calendar_integration.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add Google Calendar columns to users table
-- ============================================================================

-- Add Google Calendar access token
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT;

-- Add Google Calendar refresh token
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT;

-- Add Google Calendar token expiry
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_calendar_token_expiry TIMESTAMP WITH TIME ZONE;

-- Add Google Calendar sync enabled flag
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_calendar_sync_enabled BOOLEAN DEFAULT false;

-- Add Google Calendar ID (primary calendar ID)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255);

-- ============================================================================
-- PART 2: Add Google Calendar event ID to interviews table
-- ============================================================================

-- Add Google Calendar event ID to link interviews to calendar events
ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_interviews_google_calendar_event_id 
ON public.interviews(google_calendar_event_id);

-- ============================================================================
-- PART 3: Grant permissions
-- ============================================================================

-- Permissions are already granted on users and interviews tables
-- No additional grants needed

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

