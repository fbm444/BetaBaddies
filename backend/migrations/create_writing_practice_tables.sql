-- Writing Practice Tool Database Migration
-- Creates tables for writing practice sessions, feedback, prompts, progress tracking, and nerves management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Writing Practice Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.writing_practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    session_type varchar(50) NOT NULL DEFAULT 'interview_response',
    prompt text NOT NULL,
    response text,
    word_count integer DEFAULT 0,
    time_spent_seconds integer DEFAULT 0,
    session_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT session_type_check CHECK (session_type IN (
        'interview_response',
        'thank_you_note',
        'follow_up',
        'cover_letter',
        'custom'
    ))
);

-- Add missing columns if table already exists (for existing tables from partial runs)
DO $$ 
BEGIN
    -- Add session_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'session_type'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN session_type varchar(50) NOT NULL DEFAULT 'interview_response';
    END IF;
    
    -- Add prompt if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'prompt'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN prompt text;
    END IF;
    
    -- Add response if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'response'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN response text;
    END IF;
    
    -- Add word_count if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'word_count'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN word_count integer DEFAULT 0;
    END IF;
    
    -- Add time_spent_seconds if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'time_spent_seconds'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN time_spent_seconds integer DEFAULT 0;
    END IF;
    
    -- Add session_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'session_date'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN session_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add is_completed if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'is_completed'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN is_completed boolean DEFAULT false;
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD COLUMN updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'writing_practice_sessions' 
        AND constraint_name = 'session_type_check'
    ) THEN
        ALTER TABLE public.writing_practice_sessions 
        ADD CONSTRAINT session_type_check CHECK (session_type IN (
            'interview_response',
            'thank_you_note',
            'follow_up',
            'cover_letter',
            'custom'
        ));
    END IF;
END $$;

-- Indexes for writing_practice_sessions
CREATE INDEX IF NOT EXISTS idx_writing_sessions_user_id ON public.writing_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_sessions_session_date ON public.writing_practice_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_writing_sessions_session_type ON public.writing_practice_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_writing_sessions_user_date ON public.writing_practice_sessions(user_id, session_date DESC);

-- Comments
COMMENT ON TABLE public.writing_practice_sessions IS 'Stores writing practice sessions with prompts and responses';
COMMENT ON COLUMN public.writing_practice_sessions.session_type IS 'Type of practice session: interview_response, thank_you_note, follow_up, cover_letter, custom';
COMMENT ON COLUMN public.writing_practice_sessions.time_spent_seconds IS 'Time spent writing the response in seconds';

-- ============================================
-- 2. Writing Feedback Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.writing_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES writing_practice_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    clarity_score integer NOT NULL CHECK (clarity_score >= 1 AND clarity_score <= 10),
    professionalism_score integer NOT NULL CHECK (professionalism_score >= 1 AND professionalism_score <= 10),
    structure_score integer NOT NULL CHECK (structure_score >= 1 AND structure_score <= 10),
    storytelling_score integer NOT NULL CHECK (storytelling_score >= 1 AND storytelling_score <= 10),
    overall_score integer NOT NULL CHECK (overall_score >= 1 AND overall_score <= 10),
    clarity_feedback text,
    professionalism_feedback text,
    structure_feedback text,
    storytelling_feedback text,
    strengths jsonb DEFAULT '[]'::jsonb,
    improvements jsonb DEFAULT '[]'::jsonb,
    tips jsonb DEFAULT '[]'::jsonb,
    generated_by varchar(20) DEFAULT 'openai',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT generated_by_check CHECK (generated_by IN ('openai', 'fallback'))
);

-- Indexes for writing_feedback
CREATE INDEX IF NOT EXISTS idx_writing_feedback_session_id ON public.writing_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_writing_feedback_user_id ON public.writing_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_feedback_created_at ON public.writing_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_writing_feedback_overall_score ON public.writing_feedback(overall_score);

-- Comments
COMMENT ON TABLE public.writing_feedback IS 'Stores AI-generated feedback for writing practice sessions';
COMMENT ON COLUMN public.writing_feedback.strengths IS 'JSON array of identified strengths';
COMMENT ON COLUMN public.writing_feedback.improvements IS 'JSON array of improvement suggestions';
COMMENT ON COLUMN public.writing_feedback.tips IS 'JSON array of personalized tips';

-- ============================================
-- 3. Writing Practice Prompts Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.writing_practice_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    category varchar(50) NOT NULL,
    prompt_text text NOT NULL,
    difficulty_level varchar(20) NOT NULL DEFAULT 'intermediate',
    estimated_time_minutes integer DEFAULT 5,
    tags jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT difficulty_level_check CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT category_check CHECK (category IN (
        'behavioral',
        'technical',
        'situational',
        'strengths',
        'weaknesses',
        'company_fit',
        'leadership',
        'teamwork',
        'problem_solving',
        'custom'
    ))
);

-- Indexes for writing_practice_prompts
CREATE INDEX IF NOT EXISTS idx_writing_prompts_category ON public.writing_practice_prompts(category);
CREATE INDEX IF NOT EXISTS idx_writing_prompts_difficulty ON public.writing_practice_prompts(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_writing_prompts_active ON public.writing_practice_prompts(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE public.writing_practice_prompts IS 'Library of practice prompts/questions for writing exercises';
COMMENT ON COLUMN public.writing_practice_prompts.tags IS 'JSON array of tags for filtering and searching';

-- ============================================
-- 4. Writing Progress Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.writing_progress_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    metric_name varchar(50) NOT NULL,
    metric_value decimal(5, 2) NOT NULL,
    session_count integer DEFAULT 0,
    period_start date NOT NULL,
    period_end date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT metric_name_check CHECK (metric_name IN (
        'clarity_avg',
        'professionalism_avg',
        'structure_avg',
        'storytelling_avg',
        'overall_avg'
    )),
    CONSTRAINT period_check CHECK (period_end >= period_start)
);

-- Indexes for writing_progress_tracking
CREATE INDEX IF NOT EXISTS idx_writing_progress_user_id ON public.writing_progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_progress_metric ON public.writing_progress_tracking(metric_name);
CREATE INDEX IF NOT EXISTS idx_writing_progress_period ON public.writing_progress_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_writing_progress_user_metric ON public.writing_progress_tracking(user_id, metric_name, period_start DESC);

-- Comments
COMMENT ON TABLE public.writing_progress_tracking IS 'Tracks writing practice progress metrics over time periods';
COMMENT ON COLUMN public.writing_progress_tracking.metric_value IS 'Average score for the metric in the period';

-- ============================================
-- 5. Nerves Management Exercises Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.nerves_management_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    session_id uuid REFERENCES writing_practice_sessions(id) ON DELETE SET NULL,
    exercise_type varchar(30) NOT NULL,
    exercise_data jsonb DEFAULT '{}'::jsonb,
    completed_at timestamp with time zone,
    effectiveness_rating integer CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT exercise_type_check CHECK (exercise_type IN (
        'breathing',
        'visualization',
        'affirmation',
        'preparation_checklist'
    ))
);

-- Indexes for nerves_management_exercises
CREATE INDEX IF NOT EXISTS idx_nerves_exercises_user_id ON public.nerves_management_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_nerves_exercises_session_id ON public.nerves_management_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_nerves_exercises_type ON public.nerves_management_exercises(exercise_type);
CREATE INDEX IF NOT EXISTS idx_nerves_exercises_completed ON public.nerves_management_exercises(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Comments
COMMENT ON TABLE public.nerves_management_exercises IS 'Tracks nerves management exercises completed by users';
COMMENT ON COLUMN public.nerves_management_exercises.exercise_data IS 'JSON object with exercise-specific data';

-- ============================================
-- 6. Trigger Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_writing_practice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_writing_sessions_timestamp
    BEFORE UPDATE ON public.writing_practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_writing_practice_timestamp();

CREATE TRIGGER update_writing_prompts_timestamp
    BEFORE UPDATE ON public.writing_practice_prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_writing_practice_timestamp();

-- ============================================
-- 7. Seed Data: Default Prompts
-- ============================================

-- Behavioral Questions
INSERT INTO public.writing_practice_prompts (category, prompt_text, difficulty_level, estimated_time_minutes, tags)
VALUES
    ('behavioral', 'Tell me about a time when you had to work under pressure. How did you handle it?', 'beginner', 5, '["pressure", "stress", "time-management"]'),
    ('behavioral', 'Describe a situation where you had to deal with a difficult team member. What was your approach?', 'intermediate', 7, '["teamwork", "conflict", "communication"]'),
    ('behavioral', 'Give an example of a time you failed and what you learned from it.', 'intermediate', 6, '["failure", "learning", "growth"]'),
    ('behavioral', 'Tell me about a time you had to make a difficult decision with limited information.', 'advanced', 8, '["decision-making", "uncertainty", "leadership"]'),
    ('behavioral', 'Describe a project where you had to collaborate with people from different departments.', 'intermediate', 7, '["collaboration", "cross-functional", "teamwork"]'),

-- Strengths Questions
    ('strengths', 'What are your greatest strengths and how do they apply to this role?', 'beginner', 5, '["strengths", "self-awareness", "role-fit"]'),
    ('strengths', 'What unique value do you bring to our team?', 'intermediate', 6, '["value", "differentiation", "contribution"]'),
    ('strengths', 'How do your skills and experience make you the best candidate for this position?', 'advanced', 7, '["qualifications", "fit", "value-proposition"]'),

-- Weaknesses Questions
    ('weaknesses', 'What is your greatest weakness and how are you working to improve it?', 'beginner', 5, '["weakness", "self-awareness", "improvement"]'),
    ('weaknesses', 'Tell me about a skill you''re currently developing.', 'intermediate', 6, '["growth", "learning", "development"]'),

-- Company Fit Questions
    ('company_fit', 'Why do you want to work for our company?', 'beginner', 5, '["motivation", "company-research", "fit"]'),
    ('company_fit', 'What do you know about our company culture and how do you see yourself fitting in?', 'intermediate', 7, '["culture", "values", "fit"]'),
    ('company_fit', 'How do your values align with our company''s mission?', 'advanced', 6, '["values", "mission", "alignment"]'),

-- Situational Questions
    ('situational', 'How would you handle a situation where you disagree with your manager''s decision?', 'intermediate', 6, '["conflict", "authority", "communication"]'),
    ('situational', 'Describe how you would prioritize multiple urgent tasks with competing deadlines.', 'intermediate', 7, '["prioritization", "time-management", "organization"]'),
    ('situational', 'What would you do if you noticed a colleague making a mistake that could impact the project?', 'intermediate', 6, '["ethics", "teamwork", "communication"]'),

-- Leadership Questions
    ('leadership', 'Tell me about a time you had to lead a team without formal authority.', 'advanced', 8, '["leadership", "influence", "teamwork"]'),
    ('leadership', 'Describe a situation where you had to motivate a demotivated team.', 'advanced', 7, '["leadership", "motivation", "team-management"]'),

-- Problem Solving Questions
    ('problem_solving', 'Describe a complex problem you solved and your approach.', 'intermediate', 7, '["problem-solving", "analytical", "methodology"]'),
    ('problem_solving', 'Tell me about a time you had to think creatively to solve a problem.', 'advanced', 8, '["creativity", "innovation", "problem-solving"]')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. Grant Permissions (commented out - run separately)
-- ============================================
-- Note: Permissions should be granted separately using grant_writing_practice_permissions.sql
-- This allows for better control and security

COMMENT ON SCHEMA public IS 'Writing Practice Tool tables created successfully';

