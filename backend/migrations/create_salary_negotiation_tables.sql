-- Migration: Create Salary Negotiation Tables
-- Description: Adds tables for salary negotiation tracking, market research, and progression history
-- Date: 2024

-- ============================================================================
-- Table: salary_negotiations
-- Purpose: Core table for tracking salary negotiations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.salary_negotiations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    job_opportunity_id uuid NOT NULL REFERENCES job_opportunities(id) ON DELETE CASCADE,
    
    -- Offer Details
    initial_offer_base_salary numeric,
    initial_offer_bonus numeric,
    initial_offer_equity numeric,
    initial_offer_benefits_value numeric,
    initial_offer_total_compensation numeric,
    initial_offer_currency character varying(10) DEFAULT 'USD',
    initial_offer_date date,
    
    -- Negotiation Details
    target_base_salary numeric,
    target_bonus numeric,
    target_equity numeric,
    target_benefits_value numeric,
    target_total_compensation numeric,
    negotiation_strategy text, -- JSON: {timing, approach, priorities}
    talking_points text, -- JSON array of generated talking points
    scripts text, -- JSON: {scenario_name: {script_text, notes}}
    
    -- Market Research
    market_salary_data text, -- JSON: {role, location, percentile_25, percentile_50, percentile_75, percentile_90, source, date}
    market_research_notes text,
    
    -- Counteroffer Tracking
    counteroffer_count integer DEFAULT 0,
    latest_counteroffer_base numeric,
    latest_counteroffer_total numeric,
    counteroffer_history text, -- JSON array of counteroffers
    
    -- Outcome Tracking
    final_base_salary numeric,
    final_bonus numeric,
    final_equity numeric,
    final_benefits_value numeric,
    final_total_compensation numeric,
    negotiation_outcome character varying(50), -- 'accepted', 'rejected', 'pending', 'withdrawn'
    outcome_date date,
    outcome_notes text,
    
    -- Confidence Building
    confidence_exercises_completed text, -- JSON array of exercise IDs
    practice_sessions_completed integer DEFAULT 0,
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'draft' -- 'draft', 'active', 'completed', 'archived'
);

-- Indexes for salary_negotiations
CREATE INDEX IF NOT EXISTS idx_salary_negotiations_user_id ON salary_negotiations(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_negotiations_job_opportunity_id ON salary_negotiations(job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_salary_negotiations_status ON salary_negotiations(status);

-- Comments for salary_negotiations
COMMENT ON TABLE public.salary_negotiations IS 'Tracks salary negotiations for job opportunities';
COMMENT ON COLUMN public.salary_negotiations.initial_offer_base_salary IS 'Base salary from initial offer';
COMMENT ON COLUMN public.salary_negotiations.initial_offer_total_compensation IS 'Total compensation from initial offer (base + bonus + equity + benefits)';
COMMENT ON COLUMN public.salary_negotiations.negotiation_strategy IS 'JSON object containing timing, approach, and priorities';
COMMENT ON COLUMN public.salary_negotiations.talking_points IS 'JSON array of generated talking points for negotiation';
COMMENT ON COLUMN public.salary_negotiations.scripts IS 'JSON object with scenario-based negotiation scripts';
COMMENT ON COLUMN public.salary_negotiations.market_salary_data IS 'JSON object with market research data (percentiles, source, date)';
COMMENT ON COLUMN public.salary_negotiations.counteroffer_history IS 'JSON array tracking all counteroffers';
COMMENT ON COLUMN public.salary_negotiations.negotiation_outcome IS 'Final outcome: accepted, rejected, pending, or withdrawn';
COMMENT ON COLUMN public.salary_negotiations.confidence_exercises_completed IS 'JSON array of completed confidence exercise IDs';

-- ============================================================================
-- Table: salary_progression_history
-- Purpose: Track salary progression over time for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.salary_progression_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    negotiation_id uuid REFERENCES salary_negotiations(id) ON DELETE SET NULL,
    job_opportunity_id uuid REFERENCES job_opportunities(id) ON DELETE SET NULL,
    
    -- Salary Details
    base_salary numeric NOT NULL,
    bonus numeric,
    equity numeric,
    benefits_value numeric,
    total_compensation numeric NOT NULL,
    currency character varying(10) DEFAULT 'USD',
    
    -- Context
    role_title character varying(255),
    company character varying(255),
    location character varying(255),
    effective_date date NOT NULL,
    negotiation_type character varying(50), -- 'initial_offer', 'counteroffer', 'final_offer', 'accepted'
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);

-- Indexes for salary_progression_history
CREATE INDEX IF NOT EXISTS idx_salary_progression_user_id ON salary_progression_history(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_progression_effective_date ON salary_progression_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_salary_progression_negotiation_id ON salary_progression_history(negotiation_id);

-- Comments for salary_progression_history
COMMENT ON TABLE public.salary_progression_history IS 'Historical record of salary progression for analytics';
COMMENT ON COLUMN public.salary_progression_history.negotiation_type IS 'Type: initial_offer, counteroffer, final_offer, or accepted';
COMMENT ON COLUMN public.salary_progression_history.effective_date IS 'Date when this salary became effective';

-- ============================================================================
-- Table: negotiation_confidence_exercises
-- Purpose: Track confidence-building exercises and practice sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.negotiation_confidence_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    negotiation_id uuid REFERENCES salary_negotiations(id) ON DELETE CASCADE,
    
    exercise_type character varying(50) NOT NULL, -- 'role_play', 'script_practice', 'value_articulation', 'objection_handling'
    exercise_name character varying(255),
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    self_rating integer, -- 1-5 scale
    practice_script text -- JSON: {scenario, user_response, feedback}
);

-- Indexes for negotiation_confidence_exercises
CREATE INDEX IF NOT EXISTS idx_confidence_exercises_user_id ON negotiation_confidence_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_confidence_exercises_negotiation_id ON negotiation_confidence_exercises(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_confidence_exercises_type ON negotiation_confidence_exercises(exercise_type);

-- Comments for negotiation_confidence_exercises
COMMENT ON TABLE public.negotiation_confidence_exercises IS 'Tracks confidence-building exercises for salary negotiations';
COMMENT ON COLUMN public.negotiation_confidence_exercises.exercise_type IS 'Type: role_play, script_practice, value_articulation, or objection_handling';
COMMENT ON COLUMN public.negotiation_confidence_exercises.self_rating IS 'Self-assessment rating from 1-5';
COMMENT ON COLUMN public.negotiation_confidence_exercises.practice_script IS 'JSON object with scenario, user response, and feedback';

-- ============================================================================
-- Trigger: Update updated_at timestamp for salary_negotiations
-- ============================================================================
CREATE OR REPLACE FUNCTION update_salary_negotiation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_salary_negotiation_timestamp
    BEFORE UPDATE ON salary_negotiations
    FOR EACH ROW
    EXECUTE FUNCTION update_salary_negotiation_timestamp();

-- ============================================================================
-- Grant permissions (adjust as needed for your setup)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON salary_negotiations TO ats_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON salary_progression_history TO ats_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON negotiation_confidence_exercises TO ats_user;

