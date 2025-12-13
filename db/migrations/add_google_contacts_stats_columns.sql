-- ============================================================================
-- Add Google Contacts Statistics Columns
-- ============================================================================
-- This migration adds missing statistics columns for Google Contacts integration:
-- - google_contacts_total_imported: Total number of contacts imported
-- - google_contacts_last_import_count: Number of contacts imported in last sync
--
-- This script is idempotent - it can be run multiple times safely
--
-- Usage:
--   psql -U ats_user -d ats_tracker -f db/migrations/add_google_contacts_stats_columns.sql
--   Or as table owner: psql -d ats_tracker -f db/migrations/add_google_contacts_stats_columns.sql
-- ============================================================================

BEGIN;

-- Add Google Contacts total imported count
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_contacts_total_imported INTEGER DEFAULT 0;

-- Add Google Contacts last import count
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_contacts_last_import_count INTEGER DEFAULT 0;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Summary of changes:
-- 1. Added google_contacts_total_imported to users table
--    - Tracks total number of contacts imported from Google Contacts
--    - Default value: 0
--
-- 2. Added google_contacts_last_import_count to users table
--    - Tracks number of contacts imported in the last sync
--    - Default value: 0
--
-- ============================================================================

