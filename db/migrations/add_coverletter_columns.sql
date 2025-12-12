-- Add missing columns to coverletter table
-- Migration to support full cover letter functionality

-- Add template_id (foreign key to coverletter_template)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE coverletter ADD CONSTRAINT fk_coverletter_template 
  FOREIGN KEY (template_id) REFERENCES coverletter_template(id) 
  ON DELETE SET NULL;

-- Add job_id (foreign key to job_opportunities)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS job_id UUID;
-- Drop old constraint if it exists (pointing to prospectivejobs)
ALTER TABLE coverletter DROP CONSTRAINT IF EXISTS fk_coverletter_job;
ALTER TABLE coverletter DROP CONSTRAINT IF EXISTS coverletter_job_is_fkey;
-- Add correct constraint pointing to job_opportunities
ALTER TABLE coverletter ADD CONSTRAINT fk_coverletter_job 
  FOREIGN KEY (job_id) REFERENCES job_opportunities(id) 
  ON DELETE SET NULL;

-- Add content (JSONB for cover letter content)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS content JSONB;

-- Add tone_settings (JSONB for tone and style settings)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS tone_settings JSONB;

-- Add customizations (JSONB for layout customizations)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS customizations JSONB;

-- Add version_number (integer for version tracking)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Add parent_coverletter_id (self-referencing foreign key for cover letter versions)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS parent_coverletter_id UUID;
ALTER TABLE coverletter ADD CONSTRAINT fk_coverletter_parent 
  FOREIGN KEY (parent_coverletter_id) REFERENCES coverletter(id) 
  ON DELETE CASCADE;

-- Add is_master (boolean to indicate master cover letter)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

-- Add company_research (JSONB for company research data)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS company_research JSONB;

-- Add performance_metrics (JSONB for tracking performance)
ALTER TABLE coverletter ADD COLUMN IF NOT EXISTS performance_metrics JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coverletter_template_id ON coverletter(template_id);
CREATE INDEX IF NOT EXISTS idx_coverletter_job_id ON coverletter(job_id);
CREATE INDEX IF NOT EXISTS idx_coverletter_parent_id ON coverletter(parent_coverletter_id);
CREATE INDEX IF NOT EXISTS idx_coverletter_user_id_created ON coverletter(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coverletter_is_master ON coverletter(is_master) WHERE is_master = true;

-- Create cover_letter_performance table for tracking
CREATE TABLE IF NOT EXISTS cover_letter_performance (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    coverletter_id UUID NOT NULL,
    job_id UUID,
    application_outcome VARCHAR(50), -- 'interview', 'rejected', 'no_response', 'accepted'
    response_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cover_letter_performance_pkey PRIMARY KEY (id),
    CONSTRAINT fk_performance_coverletter FOREIGN KEY (coverletter_id) REFERENCES coverletter(id) ON DELETE CASCADE,
    CONSTRAINT fk_performance_job FOREIGN KEY (job_id) REFERENCES job_opportunities(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_coverletter_id ON cover_letter_performance(coverletter_id);
CREATE INDEX IF NOT EXISTS idx_performance_job_id ON cover_letter_performance(job_id);

-- Create cover_letter_template_usage table for analytics
CREATE TABLE IF NOT EXISTS cover_letter_template_usage (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    template_id UUID NOT NULL,
    user_id UUID,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cover_letter_template_usage_pkey PRIMARY KEY (id),
    CONSTRAINT fk_template_usage_template FOREIGN KEY (template_id) REFERENCES coverletter_template(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_usage_user FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE,
    CONSTRAINT unique_template_user UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON cover_letter_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON cover_letter_template_usage(user_id);

