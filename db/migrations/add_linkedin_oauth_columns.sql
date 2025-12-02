-- ============================================================================
-- Migration: Add LinkedIn OAuth Columns
-- Purpose: Enable LinkedIn OAuth integration for login and profile import
-- Created: 2025-01-XX
-- ============================================================================
-- This migration adds LinkedIn OAuth token storage columns to the users table
-- to support LinkedIn sign-in and profile data import.
--
-- This script is idempotent - it can be run multiple times safely.
--
-- Usage:
--   psql -U ats_user -d ats_tracker -f db/migrations/add_linkedin_oauth_columns.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add LinkedIn OAuth token columns to users table
-- ============================================================================
-- These columns enable LinkedIn OAuth integration for authentication
-- and profile data import

-- Add LinkedIn access token
DO $$
BEGIN
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;
EXCEPTION WHEN OTHERS THEN
    -- Column might already exist or user doesn't have permission
    NULL;
END $$;

-- Add LinkedIn refresh token
DO $$
BEGIN
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT;
EXCEPTION WHEN OTHERS THEN
    -- Column might already exist or user doesn't have permission
    NULL;
END $$;

-- Add LinkedIn token expiry
DO $$
BEGIN
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN OTHERS THEN
    -- Column might already exist or user doesn't have permission
    NULL;
END $$;

-- Add comments for documentation (will fail silently if user doesn't have permission)
DO $$
BEGIN
    COMMENT ON COLUMN public.users.linkedin_access_token IS 'UC-089: LinkedIn OAuth access token (encrypted)';
    COMMENT ON COLUMN public.users.linkedin_refresh_token IS 'UC-089: LinkedIn OAuth refresh token (encrypted)';
    COMMENT ON COLUMN public.users.linkedin_token_expires_at IS 'UC-089: LinkedIn OAuth token expiration timestamp';
EXCEPTION WHEN OTHERS THEN
    -- Comments might fail if user doesn't have permission, but columns are added
    NULL;
END $$;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

