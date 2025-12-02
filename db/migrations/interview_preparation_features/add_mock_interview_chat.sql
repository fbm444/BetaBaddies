-- ============================================================================
-- Migration: Add Chat Support for Mock Interviews
-- ============================================================================
-- This migration adds support for conversational chat-style mock interviews
-- by creating tables to store chat messages and updating existing tables.
-- ============================================================================

BEGIN;

-- Create mock_interview_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mock_interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_id uuid,
    job_id uuid,
    target_role character varying(255),
    target_company character varying(255),
    interview_format character varying(50) DEFAULT 'mixed',
    status character varying(20) DEFAULT 'in_progress',
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    performance_summary jsonb,
    improvement_areas jsonb,
    confidence_score integer,
    pacing_recommendations text,
    CONSTRAINT mock_interview_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT mock_interview_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

-- Add interview_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mock_interview_sessions' 
        AND column_name = 'interview_id'
    ) THEN
        ALTER TABLE public.mock_interview_sessions 
        ADD COLUMN interview_id uuid;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'mock_interview_sessions_interview_id_fkey'
    ) THEN
        ALTER TABLE public.mock_interview_sessions
        ADD CONSTRAINT mock_interview_sessions_interview_id_fkey 
        FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create mock_interview_messages table for chat messages
CREATE TABLE IF NOT EXISTS public.mock_interview_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role character varying(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'message',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mock_interview_messages_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE
);

-- Create mock_interview_questions table (for backward compatibility and tracking)
CREATE TABLE IF NOT EXISTS public.mock_interview_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying(50),
    sequence_number integer,
    written_response text,
    response_length integer,
    time_spent integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mock_interview_questions_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_questions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mock_interview_sessions_user_id ON public.mock_interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_sessions_status ON public.mock_interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mock_interview_messages_session_id ON public.mock_interview_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_messages_created_at ON public.mock_interview_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_mock_interview_questions_session_id ON public.mock_interview_questions(session_id);

COMMIT;

