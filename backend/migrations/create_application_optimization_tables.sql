-- Migration: Create Application Success Optimization Dashboard Tables
-- Description: Creates tables for tracking application strategies, document performance, A/B tests, metrics, and recommendations

-- ============================================================================
-- 1. Application Strategy Tracking Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_opportunity_id UUID NOT NULL,
  
  -- Strategy Details
  application_method VARCHAR(50) NOT NULL, -- 'direct', 'referral', 'recruiter', 'job_board', 'company_website', 'linkedin', 'other'
  application_channel VARCHAR(100), -- Specific platform or method
  referral_source VARCHAR(255), -- If referral, who referred
  recruiter_name VARCHAR(255), -- If through recruiter
  
  -- Resume/Cover Letter Versions
  resume_version_id UUID, -- Reference to resume version used
  cover_letter_version_id UUID, -- Reference to cover letter version used
  resume_template VARCHAR(100), -- Template/style used
  cover_letter_template VARCHAR(100), -- Template/style used
  
  -- Timing
  application_timestamp TIMESTAMP NOT NULL,
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  hour_of_day INTEGER, -- 0-23
  time_of_day VARCHAR(20), -- 'morning', 'afternoon', 'evening', 'night'
  
  -- Customization Level
  customization_level VARCHAR(20) DEFAULT 'standard', -- 'minimal', 'standard', 'high', 'custom'
  personalized_elements TEXT[], -- Array of personalized elements
  
  -- A/B Test Tracking
  ab_test_group VARCHAR(50), -- 'control', 'variant_a', 'variant_b', etc.
  ab_test_id UUID, -- Reference to A/B test
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_application_method CHECK (application_method IN ('direct', 'referral', 'recruiter', 'job_board', 'company_website', 'linkedin', 'other')),
  CONSTRAINT valid_customization_level CHECK (customization_level IN ('minimal', 'standard', 'high', 'custom')),
  CONSTRAINT valid_time_of_day CHECK (time_of_day IS NULL OR time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
  CONSTRAINT valid_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CONSTRAINT valid_hour_of_day CHECK (hour_of_day IS NULL OR (hour_of_day >= 0 AND hour_of_day <= 23))
);

-- ============================================================================
-- 2. Application Documents (Resume/Cover Letter Versions) Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Document Type
  document_type VARCHAR(50) NOT NULL, -- 'resume', 'cover_letter'
  document_name VARCHAR(255) NOT NULL,
  version_number INTEGER DEFAULT 1,
  
  -- Content Metadata
  template_name VARCHAR(100),
  template_category VARCHAR(50), -- 'modern', 'traditional', 'creative', 'minimalist'
  file_path TEXT, -- Path to stored document
  file_hash VARCHAR(64), -- Hash to detect duplicates
  
  -- Performance Metrics (calculated)
  total_uses INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2),
  interview_rate DECIMAL(5,2),
  offer_rate DECIMAL(5,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Primary version for this type
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_document_type CHECK (document_type IN ('resume', 'cover_letter')),
  CONSTRAINT valid_template_category CHECK (template_category IS NULL OR template_category IN ('modern', 'traditional', 'creative', 'minimalist', 'professional', 'academic'))
);

-- ============================================================================
-- 3. A/B Test Definitions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Test Details
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL, -- 'resume', 'cover_letter', 'application_method', 'timing', 'custom'
  description TEXT,
  
  -- Test Configuration
  control_group_config JSONB, -- Configuration for control group
  variant_groups JSONB, -- Array of variant configurations
  traffic_split JSONB, -- How traffic is split (e.g., {"control": 50, "variant_a": 50})
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  
  -- Results (calculated)
  sample_size INTEGER DEFAULT 0,
  statistical_significance DECIMAL(5,2), -- P-value or confidence level
  winner VARCHAR(50), -- Which variant won
  results_summary JSONB, -- Detailed results
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_test_type CHECK (test_type IN ('resume', 'cover_letter', 'application_method', 'timing', 'custom')),
  CONSTRAINT valid_test_status CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled'))
);

-- ============================================================================
-- 4. Success Metrics Snapshot Table (for trend tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS success_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Time Period
  snapshot_date DATE NOT NULL,
  period_type VARCHAR(20) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'quarterly'
  
  -- Application Metrics
  total_applications INTEGER DEFAULT 0,
  applications_this_period INTEGER DEFAULT 0,
  
  -- Response Metrics
  total_responses INTEGER DEFAULT 0,
  responses_this_period INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2),
  
  -- Interview Metrics
  total_interviews INTEGER DEFAULT 0,
  interviews_this_period INTEGER DEFAULT 0,
  interview_rate DECIMAL(5,2),
  interview_conversion_rate DECIMAL(5,2), -- Interviews / Responses
  
  -- Offer Metrics
  total_offers INTEGER DEFAULT 0,
  offers_this_period INTEGER DEFAULT 0,
  offer_rate DECIMAL(5,2),
  offer_conversion_rate DECIMAL(5,2), -- Offers / Interviews
  
  -- Strategy Breakdown
  strategy_breakdown JSONB, -- Performance by strategy type
  document_performance JSONB, -- Performance by resume/cover letter version
  timing_analysis JSONB, -- Performance by timing factors
  role_type_breakdown JSONB, -- Performance by role type
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_period_type CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'))
);

-- ============================================================================
-- 5. Optimization Recommendations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS optimization_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Recommendation Details
  recommendation_type VARCHAR(50) NOT NULL, -- 'strategy', 'timing', 'document', 'customization', 'channel', 'role_type'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT, -- Why this recommendation
  
  -- Action Items
  action_items JSONB, -- Array of specific actions to take
  expected_impact VARCHAR(50), -- 'low', 'medium', 'high'
  estimated_improvement DECIMAL(5,2), -- Expected percentage improvement
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'dismissed'
  acknowledged_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Related Data
  related_ab_test_id UUID, -- If recommendation is based on A/B test
  supporting_data JSONB, -- Additional data supporting the recommendation
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_recommendation_type CHECK (recommendation_type IN ('strategy', 'timing', 'document', 'customization', 'channel', 'role_type', 'general')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  CONSTRAINT valid_expected_impact CHECK (expected_impact IS NULL OR expected_impact IN ('low', 'medium', 'high'))
);

-- ============================================================================
-- Add Foreign Key Constraints
-- ============================================================================
DO $$
BEGIN
  -- Foreign key for application_strategies.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'u_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_strategies_user_id') THEN
      ALTER TABLE application_strategies
      ADD CONSTRAINT fk_application_strategies_user_id
      FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Foreign key for application_strategies.job_opportunity_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_opportunities') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_strategies_job_opportunity_id') THEN
      ALTER TABLE application_strategies
      ADD CONSTRAINT fk_application_strategies_job_opportunity_id
      FOREIGN KEY (job_opportunity_id) REFERENCES job_opportunities(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Foreign key for application_strategies.resume_version_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_documents') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_strategies_resume_version_id') THEN
      ALTER TABLE application_strategies
      ADD CONSTRAINT fk_application_strategies_resume_version_id
      FOREIGN KEY (resume_version_id) REFERENCES application_documents(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Foreign key for application_strategies.cover_letter_version_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_documents') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_strategies_cover_letter_version_id') THEN
      ALTER TABLE application_strategies
      ADD CONSTRAINT fk_application_strategies_cover_letter_version_id
      FOREIGN KEY (cover_letter_version_id) REFERENCES application_documents(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Foreign key for application_strategies.ab_test_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_tests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_strategies_ab_test_id') THEN
      ALTER TABLE application_strategies
      ADD CONSTRAINT fk_application_strategies_ab_test_id
      FOREIGN KEY (ab_test_id) REFERENCES ab_tests(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Foreign key for application_documents.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'u_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_application_documents_user_id') THEN
      ALTER TABLE application_documents
      ADD CONSTRAINT fk_application_documents_user_id
      FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Foreign key for ab_tests.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'u_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ab_tests_user_id') THEN
      ALTER TABLE ab_tests
      ADD CONSTRAINT fk_ab_tests_user_id
      FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Foreign key for success_metrics_snapshots.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'u_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_success_metrics_snapshots_user_id') THEN
      ALTER TABLE success_metrics_snapshots
      ADD CONSTRAINT fk_success_metrics_snapshots_user_id
      FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Foreign key for optimization_recommendations.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'u_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_optimization_recommendations_user_id') THEN
      ALTER TABLE optimization_recommendations
      ADD CONSTRAINT fk_optimization_recommendations_user_id
      FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Foreign key for optimization_recommendations.related_ab_test_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_tests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_optimization_recommendations_ab_test_id') THEN
      ALTER TABLE optimization_recommendations
      ADD CONSTRAINT fk_optimization_recommendations_ab_test_id
      FOREIGN KEY (related_ab_test_id) REFERENCES ab_tests(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Application Strategies Indexes
CREATE INDEX IF NOT EXISTS idx_application_strategies_user_id ON application_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_application_strategies_job_opportunity_id ON application_strategies(job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_application_strategies_method ON application_strategies(application_method);
CREATE INDEX IF NOT EXISTS idx_application_strategies_timestamp ON application_strategies(application_timestamp);
CREATE INDEX IF NOT EXISTS idx_application_strategies_day_hour ON application_strategies(day_of_week, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_application_strategies_ab_test ON application_strategies(ab_test_id) WHERE ab_test_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_strategies_resume_version ON application_strategies(resume_version_id) WHERE resume_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_strategies_cover_letter_version ON application_strategies(cover_letter_version_id) WHERE cover_letter_version_id IS NOT NULL;

-- Application Documents Indexes
CREATE INDEX IF NOT EXISTS idx_application_documents_user_id ON application_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_type ON application_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_application_documents_user_type ON application_documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_application_documents_primary ON application_documents(user_id, document_type, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_application_documents_active ON application_documents(user_id, document_type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_application_documents_hash ON application_documents(file_hash) WHERE file_hash IS NOT NULL;

-- A/B Tests Indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_user_id ON ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_user_status ON ab_tests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_type ON ab_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_ab_tests_dates ON ab_tests(start_date, end_date) WHERE start_date IS NOT NULL;

-- Success Metrics Snapshots Indexes
CREATE INDEX IF NOT EXISTS idx_success_metrics_user_id ON success_metrics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_success_metrics_date ON success_metrics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_success_metrics_user_period ON success_metrics_snapshots(user_id, period_type, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_success_metrics_period_type ON success_metrics_snapshots(period_type, snapshot_date);

-- Optimization Recommendations Indexes
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_user_id ON optimization_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_status ON optimization_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_priority ON optimization_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_user_status ON optimization_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_type ON optimization_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_user_priority ON optimization_recommendations(user_id, priority, status);

-- ============================================================================
-- Triggers for Updated At Timestamp
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_optimization_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for each table
CREATE TRIGGER trigger_update_application_strategies_updated_at
  BEFORE UPDATE ON application_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_tables_updated_at();

CREATE TRIGGER trigger_update_application_documents_updated_at
  BEFORE UPDATE ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_tables_updated_at();

CREATE TRIGGER trigger_update_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_tables_updated_at();

CREATE TRIGGER trigger_update_optimization_recommendations_updated_at
  BEFORE UPDATE ON optimization_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_tables_updated_at();

-- ============================================================================
-- Trigger to Auto-calculate Day of Week and Hour of Day
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_timing_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate day of week (0 = Sunday, 6 = Saturday)
  IF NEW.application_timestamp IS NOT NULL THEN
    NEW.day_of_week := EXTRACT(DOW FROM NEW.application_timestamp);
    
    -- Calculate hour of day (0-23)
    NEW.hour_of_day := EXTRACT(HOUR FROM NEW.application_timestamp);
    
    -- Calculate time of day category
    IF NEW.hour_of_day >= 5 AND NEW.hour_of_day < 12 THEN
      NEW.time_of_day := 'morning';
    ELSIF NEW.hour_of_day >= 12 AND NEW.hour_of_day < 17 THEN
      NEW.time_of_day := 'afternoon';
    ELSIF NEW.hour_of_day >= 17 AND NEW.hour_of_day < 21 THEN
      NEW.time_of_day := 'evening';
    ELSE
      NEW.time_of_day := 'night';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_timing_fields
  BEFORE INSERT OR UPDATE ON application_strategies
  FOR EACH ROW
  EXECUTE FUNCTION calculate_timing_fields();

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON application_strategies TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON application_documents TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ab_tests TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON success_metrics_snapshots TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON optimization_recommendations TO ats_user;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON SCHEMA public TO ats_user;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE application_strategies IS 'Tracks application strategies, methods, timing, and document versions used for each job application';
COMMENT ON TABLE application_documents IS 'Stores resume and cover letter versions with their performance metrics';
COMMENT ON TABLE ab_tests IS 'Defines and tracks A/B tests for different application strategies';
COMMENT ON TABLE success_metrics_snapshots IS 'Historical snapshots of success metrics for trend analysis over time';
COMMENT ON TABLE optimization_recommendations IS 'Actionable recommendations to improve application success rates';

COMMENT ON COLUMN application_strategies.application_method IS 'How the application was submitted: direct, referral, recruiter, job_board, company_website, linkedin, or other';
COMMENT ON COLUMN application_strategies.customization_level IS 'Level of customization: minimal, standard, high, or custom';
COMMENT ON COLUMN application_strategies.day_of_week IS 'Day of week (0=Sunday, 6=Saturday) when application was submitted';
COMMENT ON COLUMN application_strategies.hour_of_day IS 'Hour of day (0-23) when application was submitted';
COMMENT ON COLUMN application_documents.document_type IS 'Type of document: resume or cover_letter';
COMMENT ON COLUMN application_documents.is_primary IS 'Whether this is the primary/active version for this document type';
COMMENT ON COLUMN ab_tests.test_type IS 'Type of A/B test: resume, cover_letter, application_method, timing, or custom';
COMMENT ON COLUMN ab_tests.status IS 'Test status: draft, active, paused, completed, or cancelled';
COMMENT ON COLUMN success_metrics_snapshots.period_type IS 'Time period for snapshot: daily, weekly, monthly, quarterly, or yearly';
COMMENT ON COLUMN optimization_recommendations.recommendation_type IS 'Type of recommendation: strategy, timing, document, customization, channel, role_type, or general';
COMMENT ON COLUMN optimization_recommendations.priority IS 'Priority level: low, medium, high, or critical';

