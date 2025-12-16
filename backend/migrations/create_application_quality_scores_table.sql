-- Migration: Create Application Quality Scores Table
-- Description: Stores AI-powered quality scores and suggestions per job application

CREATE TABLE IF NOT EXISTS application_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_opportunity_id UUID NOT NULL,

  -- Linked documents
  resume_document_id UUID,
  cover_letter_document_id UUID,
  linkedin_url TEXT,

  -- Scores (0-100)
  overall_score NUMERIC(5,2) NOT NULL,
  alignment_score NUMERIC(5,2),
  format_score NUMERIC(5,2),
  consistency_score NUMERIC(5,2),

  -- Analysis details
  missing_keywords JSONB, -- [{ keyword, importance }]
  missing_skills JSONB,   -- [{ skill, importance }]
  issues JSONB,           -- [{ type, description, severity, location }]
  suggestions JSONB,      -- [{ id, title, description, priority, category, estimated_impact }]
  summary TEXT,

  model_version VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_quality_user_job
  ON application_quality_scores (user_id, job_opportunity_id);

CREATE INDEX IF NOT EXISTS idx_app_quality_overall_score
  ON application_quality_scores (user_id, overall_score DESC);


