-- Fix goal status default and ensure all goals have a status
-- This migration ensures goals have proper status values

BEGIN;

-- First, update any invalid status values to 'active'
-- This includes NULL, empty string, and any other invalid values
UPDATE public.career_goals
SET status = 'active'
WHERE status IS NULL 
   OR status = ''
   OR status NOT IN ('active', 'completed', 'paused', 'cancelled');

-- Drop the constraint if it already exists (in case of re-running)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'career_goals_status_check'
    ) THEN
        ALTER TABLE public.career_goals
        DROP CONSTRAINT career_goals_status_check;
    END IF;
END $$;

-- Ensure the default is set (in case it wasn't)
ALTER TABLE public.career_goals
ALTER COLUMN status SET DEFAULT 'active';

-- Now add the check constraint (all data should be valid now)
ALTER TABLE public.career_goals
ADD CONSTRAINT career_goals_status_check 
CHECK (status IN ('active', 'completed', 'paused', 'cancelled') OR status IS NULL);

COMMIT;

