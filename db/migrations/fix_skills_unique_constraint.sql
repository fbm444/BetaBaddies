-- Migration: Fix skills table to have per-user uniqueness instead of global uniqueness
-- This allows multiple users to have the same skill name, but prevents duplicates for the same user

-- Drop the global unique constraint on skill_name
ALTER TABLE public.skills
    DROP CONSTRAINT IF EXISTS skills_skill_name_key;

-- Add composite unique constraint on (user_id, skill_name) if it doesn't exist
-- This ensures each user can only have one skill with a given name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'skills_user_skill_unique'
    ) THEN
        ALTER TABLE public.skills
            ADD CONSTRAINT skills_user_skill_unique UNIQUE (user_id, skill_name);
    END IF;
END $$;

