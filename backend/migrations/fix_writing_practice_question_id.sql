-- Fix question_id column in writing_practice_sessions
-- Make question_id nullable since we're using prompt text directly

-- Check if question_id column exists and make it nullable
DO $$ 
BEGIN
    -- Check if question_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'question_id'
    ) THEN
        -- Make question_id nullable
        ALTER TABLE public.writing_practice_sessions 
        ALTER COLUMN question_id DROP NOT NULL;
        
        RAISE NOTICE 'Made question_id nullable in writing_practice_sessions';
    ELSE
        -- If column doesn't exist, we don't need to do anything
        RAISE NOTICE 'question_id column does not exist, no changes needed';
    END IF;
END $$;

