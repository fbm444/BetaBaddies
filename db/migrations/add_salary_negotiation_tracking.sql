-- =====================================================
-- Migration: Add Salary Negotiation Status Tracking
-- Purpose: Track negotiation status for offers in salary progression
-- Created: 2025-01-XX
-- =====================================================

BEGIN;

-- Add negotiation_status column to job_opportunities if it doesn't exist
-- This allows tracking negotiation status directly on offers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'job_opportunities' 
        AND column_name = 'negotiation_status'
    ) THEN
        ALTER TABLE public.job_opportunities 
        ADD COLUMN negotiation_status VARCHAR(50) DEFAULT NULL;
        
        COMMENT ON COLUMN public.job_opportunities.negotiation_status IS 
            'Negotiation status for offers: pending, negotiating, accepted, rejected, no_negotiation';
    END IF;
END $$;

COMMIT;

