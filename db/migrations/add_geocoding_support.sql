-- =====================================================
-- Migration: Add geocoding + commute support to job_opportunities
-- Purpose: Enable map view, commute calculations, and cached geocoding
-- Created: 2025-12-11
-- =====================================================

BEGIN;

-- Extend job_opportunities with location metadata
ALTER TABLE public.job_opportunities
  ADD COLUMN IF NOT EXISTS location_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
  ADD COLUMN IF NOT EXISTS city VARCHAR(150),
  ADD COLUMN IF NOT EXISTS region VARCHAR(150),
  ADD COLUMN IF NOT EXISTS country VARCHAR(150),
  ADD COLUMN IF NOT EXISTS geocoding_confidence NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS geocoding_raw JSONB;

-- Keep location_type constrained to supported values when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_opportunities_location_type_check'
      AND conrelid = 'public.job_opportunities'::regclass
  ) THEN
    ALTER TABLE public.job_opportunities
      ADD CONSTRAINT job_opportunities_location_type_check
        CHECK (
          location_type IS NULL OR
          LOWER(location_type) IN ('remote', 'hybrid', 'on-site')
        );
  END IF;
END $$;

-- Cache table for geocoding results (Nominatim)
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    display_name TEXT,
    timezone VARCHAR(100),
    country VARCHAR(150),
    region VARCHAR(150),
    city VARCHAR(150),
    raw JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure case-insensitive uniqueness for cache lookups (guard if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'geocoding_cache_query_unique'
      AND conrelid = 'public.geocoding_cache'::regclass
  ) THEN
    ALTER TABLE public.geocoding_cache
      ADD CONSTRAINT geocoding_cache_query_unique UNIQUE (query);
  END IF;
END $$;

-- Ensure unique cache entries per normalized query
CREATE UNIQUE INDEX IF NOT EXISTS ux_geocoding_cache_query
  ON public.geocoding_cache (LOWER(query));

-- Basic lookup index for location components
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_location
  ON public.geocoding_cache (country, region, city);

COMMIT;

