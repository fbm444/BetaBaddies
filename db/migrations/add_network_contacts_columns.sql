-- ============================================================================
-- Network Contacts and Google Contacts Integration Migration
-- ============================================================================
-- This migration adds support for:
-- - Linking contacts to user accounts (contact_user_id)
-- - Google Contacts OAuth integration
--
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -U ats_user -d ats_tracker -f db/migrations/add_network_contacts_columns.sql
--   Or as table owner: psql -d ats_tracker -f db/migrations/add_network_contacts_columns.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add contact_user_id to professional_contacts table
-- ============================================================================
-- This links contacts to actual user accounts in the system
-- When a contact is also a user in the system, this field links them together

ALTER TABLE public.professional_contacts
ADD COLUMN IF NOT EXISTS contact_user_id uuid REFERENCES public.users(u_id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_professional_contacts_contact_user_id 
ON public.professional_contacts(contact_user_id);

-- ============================================================================
-- PART 2: Add Google Contacts OAuth columns to users table
-- ============================================================================
-- These columns enable Google Contacts OAuth integration for importing
-- and syncing contacts from Google

-- Add Google Contacts access token
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_contacts_access_token TEXT;

-- Add Google Contacts refresh token
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_contacts_refresh_token TEXT;

-- Add Google Contacts token expiry
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_contacts_token_expiry TIMESTAMP WITH TIME ZONE;

-- Add Google Contacts sync enabled flag
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_contacts_sync_enabled BOOLEAN DEFAULT false;

-- Add Google Contacts last sync timestamp
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_contacts_last_sync_at TIMESTAMP WITH TIME ZONE;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Summary of changes:
-- 1. Added contact_user_id to professional_contacts table
--    - Links contacts to user accounts (if contact is also a user)
--    - Foreign key to users.u_id with ON DELETE SET NULL
--    - Indexed for performance
--
-- 2. Added Google Contacts OAuth columns to users table:
--    - google_contacts_access_token: OAuth access token
--    - google_contacts_refresh_token: OAuth refresh token  
--    - google_contacts_token_expiry: Token expiration timestamp
--    - google_contacts_sync_enabled: Whether sync is enabled (default: false)
--    - google_contacts_last_sync_at: Last successful sync timestamp
--
-- ============================================================================

