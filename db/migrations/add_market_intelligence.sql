-- ============================================================================
-- MARKET INTELLIGENCE & INDUSTRY TREND ANALYSIS - DATABASE MIGRATION
-- ============================================================================
-- This migration adds tables to support market intelligence features
-- while leveraging existing job_opportunities, skills, and company data.
--
-- Feature: Market Intelligence Dashboard
-- Date: 2025-11-30
-- Dependencies: None (uses existing tables)
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE 1: market_intelligence_cache
-- ============================================================================
-- Stores aggregated market data to avoid expensive recalculations
-- Examples: industry trends, salary benchmarks, skill demand analytics
-- TTL: Data expires and gets refreshed based on data_type

CREATE TABLE IF NOT EXISTS public.market_intelligence_cache (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    
    -- Cache identification
    cache_key VARCHAR(500) NOT NULL,        -- e.g., "industry:Software:location:Remote:period:2024-11"
    data_type VARCHAR(50) NOT NULL,         -- 'industry_trends', 'salary_trends', 'skill_demand', etc.
    
    -- Cached data (flexible JSONB storage)
    data JSONB NOT NULL,                    -- Main cached data
    metadata JSONB,                         -- Additional context (sample_size, date_ranges, etc.)
    
    -- Cache management
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT market_intelligence_cache_pkey PRIMARY KEY (id),
    CONSTRAINT market_intelligence_cache_unique_key UNIQUE (cache_key, data_type)
);

-- Indexes for fast cache lookup and cleanup
CREATE INDEX idx_market_intelligence_cache_key ON public.market_intelligence_cache(cache_key);
CREATE INDEX idx_market_intelligence_cache_expires ON public.market_intelligence_cache(expires_at);
CREATE INDEX idx_market_intelligence_cache_type ON public.market_intelligence_cache(data_type);
CREATE INDEX idx_market_intelligence_data ON public.market_intelligence_cache USING GIN (data);

-- Comments for documentation
COMMENT ON TABLE public.market_intelligence_cache IS 'Caches aggregated market intelligence data to optimize performance';
COMMENT ON COLUMN public.market_intelligence_cache.cache_key IS 'Unique identifier for cached data (includes filters like industry, location, period)';
COMMENT ON COLUMN public.market_intelligence_cache.data_type IS 'Type of cached data: industry_trends, salary_trends, skill_demand, hiring_velocity, etc.';
COMMENT ON COLUMN public.market_intelligence_cache.data IS 'JSONB containing the cached calculation results';
COMMENT ON COLUMN public.market_intelligence_cache.metadata IS 'Additional context like sample_size, date_ranges, confidence_score';
COMMENT ON COLUMN public.market_intelligence_cache.expires_at IS 'When this cache entry expires and should be refreshed';

-- Example data structure for cache.data:
-- {
--   "job_growth_rate": 15.3,
--   "avg_salary_trend": "increasing",
--   "top_skills": ["Python", "AWS", "React"],
--   "hiring_velocity": "high",
--   "market_saturation": "moderate",
--   "total_jobs_tracked": 1250
-- }

-- ============================================================================
-- TABLE 2: skill_demand_trends
-- ============================================================================
-- Tracks skill popularity and demand over time periods
-- Used for skill gap analysis and career positioning recommendations

CREATE TABLE IF NOT EXISTS public.skill_demand_trends (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    
    -- Skill identification
    skill_name VARCHAR(100) NOT NULL,
    industry VARCHAR(255),                  -- Optional: industry-specific demand
    location VARCHAR(255),                  -- Optional: location-specific demand
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Demand metrics
    demand_count INTEGER NOT NULL,          -- Number of jobs requesting this skill in period
    avg_salary_for_skill NUMERIC,           -- Average salary for jobs requiring this skill
    
    -- Trend analysis
    trend_direction VARCHAR(20),            -- 'rising', 'stable', 'declining', 'emerging'
    growth_rate NUMERIC,                    -- Percentage change vs previous period
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT skill_demand_trends_pkey PRIMARY KEY (id),
    CONSTRAINT skill_demand_trends_trend_check CHECK (
        trend_direction IN ('rising', 'stable', 'declining', 'emerging')
    )
);

-- Indexes for efficient querying
CREATE INDEX idx_skill_demand_skill ON public.skill_demand_trends(skill_name);
CREATE INDEX idx_skill_demand_industry ON public.skill_demand_trends(industry);
CREATE INDEX idx_skill_demand_location ON public.skill_demand_trends(location);
CREATE INDEX idx_skill_demand_period ON public.skill_demand_trends(period_start, period_end);
CREATE INDEX idx_skill_demand_trend ON public.skill_demand_trends(trend_direction);

-- Comments
COMMENT ON TABLE public.skill_demand_trends IS 'Tracks skill demand evolution over time for market intelligence';
COMMENT ON COLUMN public.skill_demand_trends.demand_count IS 'Number of job postings requiring this skill in the time period';
COMMENT ON COLUMN public.skill_demand_trends.avg_salary_for_skill IS 'Average salary offered for positions requiring this skill';
COMMENT ON COLUMN public.skill_demand_trends.trend_direction IS 'Whether skill demand is rising, stable, declining, or emerging';
COMMENT ON COLUMN public.skill_demand_trends.growth_rate IS 'Percentage change in demand compared to previous period';

-- ============================================================================
-- TABLE 3: market_insights
-- ============================================================================
-- Stores AI-generated personalized insights and recommendations for users
-- Examples: skill gaps, salary positioning, career opportunities, disruption alerts

CREATE TABLE IF NOT EXISTS public.market_insights (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    
    -- Insight classification
    insight_type VARCHAR(50) NOT NULL,      -- 'skill_gap', 'career_move', 'salary_positioning', etc.
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,          -- 'high', 'medium', 'low'
    
    -- Actionable recommendations
    actionable_items JSONB,                 -- Array of specific action steps user can take
    supporting_data JSONB,                  -- Data/metrics backing the insight
    
    -- Insight lifecycle
    status VARCHAR(20) DEFAULT 'active',    -- 'active', 'dismissed', 'completed'
    expires_at TIMESTAMP WITH TIME ZONE,    -- When insight becomes irrelevant
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT market_insights_pkey PRIMARY KEY (id),
    CONSTRAINT market_insights_user_fkey FOREIGN KEY (user_id) 
        REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT market_insights_priority_check CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT market_insights_status_check CHECK (status IN ('active', 'dismissed', 'completed'))
);

-- Indexes for filtering and user queries
CREATE INDEX idx_market_insights_user ON public.market_insights(user_id);
CREATE INDEX idx_market_insights_type ON public.market_insights(insight_type);
CREATE INDEX idx_market_insights_priority ON public.market_insights(priority);
CREATE INDEX idx_market_insights_status ON public.market_insights(status);
CREATE INDEX idx_market_insights_user_status ON public.market_insights(user_id, status);
CREATE INDEX idx_market_insights_expires ON public.market_insights(expires_at);
CREATE INDEX idx_market_insights_supporting_data ON public.market_insights USING GIN (supporting_data);

-- Comments
COMMENT ON TABLE public.market_insights IS 'AI-generated personalized career insights and recommendations';
COMMENT ON COLUMN public.market_insights.insight_type IS 'Type: skill_gap, career_move, salary_positioning, market_opportunity, disruption_alert';
COMMENT ON COLUMN public.market_insights.actionable_items IS 'JSONB array of specific steps user can take to act on this insight';
COMMENT ON COLUMN public.market_insights.supporting_data IS 'JSONB containing metrics, trends, and data supporting the recommendation';
COMMENT ON COLUMN public.market_insights.status IS 'User can mark insights as dismissed or completed';

-- Example actionable_items structure:
-- [
--   "Complete AWS Solutions Architect certification",
--   "Build 2-3 AWS projects for portfolio",
--   "Highlight cloud migration experience in resume"
-- ]

-- Example supporting_data structure:
-- {
--   "jobs_requiring_skill": 842,
--   "avg_salary_increase": 18000,
--   "trending_since": "2024-08-01",
--   "market_demand_score": 8.5
-- }

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on market_intelligence_cache
CREATE OR REPLACE FUNCTION update_market_intelligence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_market_intelligence_cache_timestamp ON public.market_intelligence_cache;
CREATE TRIGGER trg_update_market_intelligence_cache_timestamp
    BEFORE UPDATE ON public.market_intelligence_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_market_intelligence_timestamp();

-- Update updated_at timestamp on market_insights
DROP TRIGGER IF EXISTS trg_update_market_insights_timestamp ON public.market_insights;
CREATE TRIGGER trg_update_market_insights_timestamp
    BEFORE UPDATE ON public.market_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_market_intelligence_timestamp();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to ats_user
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_intelligence_cache TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.skill_demand_trends TO "ats_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_insights TO "ats_user";

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Sample industry trend cache
INSERT INTO public.market_intelligence_cache (cache_key, data_type, data, metadata, expires_at)
VALUES (
    'industry:Software Engineering:location:Remote:period:2024-11',
    'industry_trends',
    '{
        "job_growth_rate": 15.3,
        "avg_salary_trend": "increasing",
        "top_skills": ["Python", "AWS", "React", "Docker", "Kubernetes"],
        "hiring_velocity": "high",
        "market_saturation": "moderate",
        "avg_time_to_hire_days": 28,
        "competitive_intensity": "high"
    }'::jsonb,
    '{
        "sample_size": 1250,
        "date_range": "2024-10-01 to 2024-11-30",
        "confidence_score": 0.92,
        "last_updated": "2024-11-30"
    }'::jsonb,
    NOW() + INTERVAL '24 hours'
) ON CONFLICT (cache_key, data_type) DO NOTHING;

-- Sample skill demand trend
INSERT INTO public.skill_demand_trends (
    skill_name, industry, location, period_start, period_end,
    demand_count, avg_salary_for_skill, trend_direction, growth_rate
)
VALUES 
    ('Python', 'Software Engineering', 'Remote', '2024-11-01', '2024-11-30', 
     892, 125000, 'rising', 12.5),
    ('React', 'Software Engineering', 'Remote', '2024-11-01', '2024-11-30', 
     745, 118000, 'stable', 2.1),
    ('AWS', 'Software Engineering', 'Remote', '2024-11-01', '2024-11-30', 
     823, 132000, 'rising', 18.3),
    ('Rust', 'Software Engineering', 'Remote', '2024-11-01', '2024-11-30', 
     127, 145000, 'emerging', 45.2)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CLEANUP FUNCTIONS (Maintenance)
-- ============================================================================

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_market_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.market_intelligence_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_market_cache IS 'Removes expired cache entries from market_intelligence_cache';

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_market_insights()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.market_insights
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_market_insights IS 'Removes expired insights from market_insights table';

-- Grant execute permissions on cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_expired_market_cache() TO "ats_user";
GRANT EXECUTE ON FUNCTION cleanup_expired_market_insights() TO "ats_user";

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Created:
--   - 3 new tables: market_intelligence_cache, skill_demand_trends, market_insights
--   - 15 indexes for query optimization
--   - 2 triggers for timestamp management
--   - 2 cleanup functions for maintenance
--   - Sample data for testing
--
-- Next steps:
--   1. Run this migration: psql -U ats_user -d your_database -f add_market_intelligence.sql
--   2. Verify tables: \d market_intelligence_cache
--   3. Test sample queries
--   4. Implement backend services (marketIntelligenceService.js)
-- ============================================================================

