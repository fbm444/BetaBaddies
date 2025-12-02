-- ============================================================================
-- Interview Analytics Enhancements Migration
-- ============================================================================
-- This migration adds support for:
-- 1. Practice vs real interview tracking
-- 2. Confidence and anxiety management
-- 3. Feedback theme analysis
-- ============================================================================

-- PART 1: Add practice flag to interviews table
-- ============================================================================

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_interviews_is_practice ON public.interviews(is_practice, user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.interviews.is_practice IS 'True if this is a practice/mock interview, false if real interview';

-- ============================================================================
-- PART 2: Add confidence and anxiety tracking
-- ============================================================================

-- Add confidence/anxiety columns to interview_feedback
ALTER TABLE public.interview_feedback
ADD COLUMN IF NOT EXISTS confidence_level INTEGER CHECK (confidence_level IS NULL OR (confidence_level >= 0 AND confidence_level <= 100)),
ADD COLUMN IF NOT EXISTS anxiety_level INTEGER CHECK (anxiety_level IS NULL OR (anxiety_level >= 0 AND anxiety_level <= 100)),
ADD COLUMN IF NOT EXISTS preparation_hours INTEGER DEFAULT 0;

-- Create pre-interview assessment table
CREATE TABLE IF NOT EXISTS public.interview_pre_assessment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL,
    user_id UUID NOT NULL,
    confidence_level INTEGER NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
    anxiety_level INTEGER NOT NULL CHECK (anxiety_level >= 0 AND anxiety_level <= 100),
    preparation_hours INTEGER DEFAULT 0 CHECK (preparation_hours >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT fk_pre_assessment_interview FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_pre_assessment_user FOREIGN KEY (user_id) 
        REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT unique_pre_assessment_per_interview UNIQUE (interview_id)
);

-- Create post-interview reflection table
CREATE TABLE IF NOT EXISTS public.interview_post_reflection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL,
    user_id UUID NOT NULL,
    post_confidence_level INTEGER CHECK (post_confidence_level IS NULL OR (post_confidence_level >= 0 AND post_confidence_level <= 100)),
    post_anxiety_level INTEGER CHECK (post_anxiety_level IS NULL OR (post_anxiety_level >= 0 AND post_anxiety_level <= 100)),
    what_went_well TEXT,
    what_to_improve TEXT,
    overall_feeling VARCHAR(50), -- 'great', 'good', 'ok', 'needs_work'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT fk_post_reflection_interview FOREIGN KEY (interview_id) 
        REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_reflection_user FOREIGN KEY (user_id) 
        REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT unique_post_reflection_per_interview UNIQUE (interview_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pre_assessment_user_id ON public.interview_pre_assessment(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_assessment_interview_id ON public.interview_pre_assessment(interview_id);
CREATE INDEX IF NOT EXISTS idx_pre_assessment_created_at ON public.interview_pre_assessment(created_at);
CREATE INDEX IF NOT EXISTS idx_post_reflection_user_id ON public.interview_post_reflection(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reflection_interview_id ON public.interview_post_reflection(interview_id);

-- Add comments
COMMENT ON TABLE public.interview_pre_assessment IS 'Pre-interview assessments for tracking confidence, anxiety, and preparation';
COMMENT ON TABLE public.interview_post_reflection IS 'Post-interview reflections for tracking emotional state and learnings';
COMMENT ON COLUMN public.interview_pre_assessment.confidence_level IS 'Confidence level before interview (0-100)';
COMMENT ON COLUMN public.interview_pre_assessment.anxiety_level IS 'Anxiety level before interview (0-100)';

-- ============================================================================
-- PART 3: Add feedback theme analysis
-- ============================================================================

-- Add theme columns to interview_feedback
ALTER TABLE public.interview_feedback
ADD COLUMN IF NOT EXISTS feedback_theme VARCHAR(50),
ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC(3,2) CHECK (sentiment_score IS NULL OR (sentiment_score >= -1.0 AND sentiment_score <= 1.0)),
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Create feedback themes lookup table
CREATE TABLE IF NOT EXISTS public.feedback_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('strength', 'weakness', 'neutral')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert common feedback themes
INSERT INTO public.feedback_themes (theme_name, description, category) VALUES
('communication', 'Ability to clearly articulate thoughts and ideas', 'strength'),
('technical_depth', 'Depth of technical knowledge and understanding', 'strength'),
('problem_solving', 'Approach to solving complex problems', 'strength'),
('time_management', 'Ability to manage time during interviews', 'weakness'),
('confidence', 'Level of confidence during the interview', 'neutral'),
('preparation', 'Level of preparation for the interview', 'neutral'),
('communication_clarity', 'Clarity of communication', 'strength'),
('code_quality', 'Quality of code written', 'strength'),
('algorithm_knowledge', 'Knowledge of algorithms and data structures', 'strength'),
('system_design', 'Ability to design systems', 'strength'),
('behavioral_examples', 'Quality of behavioral examples', 'strength'),
('nervousness', 'Level of nervousness affecting performance', 'weakness'),
('overthinking', 'Tendency to overthink problems', 'weakness')
ON CONFLICT (theme_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interview_feedback_theme ON public.interview_feedback(feedback_theme, user_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_sentiment ON public.interview_feedback(sentiment_score, user_id);

-- ============================================================================
-- PART 4: Create functions for updated_at timestamps
-- ============================================================================

-- Function for pre_assessment
CREATE OR REPLACE FUNCTION public.update_pre_assessment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_pre_assessment_updated_at
    BEFORE UPDATE ON public.interview_pre_assessment
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pre_assessment_updated_at();

-- ============================================================================
-- PART 5: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_pre_assessment TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interview_post_reflection TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feedback_themes TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_pre_assessment_updated_at() TO "ats_user";

-- ============================================================================
-- Migration Complete
-- ============================================================================

