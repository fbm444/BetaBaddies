-- Add missing columns to resume table
-- Migration to support full resume functionality

-- Add template_id (foreign key to resume_template)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE resume ADD CONSTRAINT fk_resume_template 
  FOREIGN KEY (template_id) REFERENCES resume_template(id) 
  ON DELETE SET NULL;

-- Add job_id (foreign key to prospectivejobs)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS job_id UUID;
ALTER TABLE resume ADD CONSTRAINT fk_resume_job 
  FOREIGN KEY (job_id) REFERENCES prospectivejobs(id) 
  ON DELETE SET NULL;

-- Add content (JSONB for resume content)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS content JSONB;

-- Add section_config (JSONB for section configuration)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS section_config JSONB;

-- Add customizations (JSONB for layout customizations)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS customizations JSONB;

-- Add version_number (integer for version tracking)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Add parent_resume_id (self-referencing foreign key for resume versions)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS parent_resume_id UUID;
ALTER TABLE resume ADD CONSTRAINT fk_resume_parent 
  FOREIGN KEY (parent_resume_id) REFERENCES resume(id) 
  ON DELETE CASCADE;

-- Add is_master (boolean to indicate master resume)
ALTER TABLE resume ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

-- Add comments_id (foreign key to resume_comments - if needed, otherwise can be removed)
-- Note: Since resume_comments has resume_id, we might not need this
-- But keeping it for backward compatibility if it exists
ALTER TABLE resume ADD COLUMN IF NOT EXISTS comments_id UUID;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resume_template_id ON resume(template_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_id ON resume(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_parent_id ON resume(parent_resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_user_id_created ON resume(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_is_master ON resume(is_master) WHERE is_master = true;

-- Add comments for documentation
COMMENT ON COLUMN resume.template_id IS 'Reference to resume template';
COMMENT ON COLUMN resume.job_id IS 'Reference to job this resume is tailored for';
COMMENT ON COLUMN resume.content IS 'JSONB containing resume content (personalInfo, summary, experience, etc.)';
COMMENT ON COLUMN resume.section_config IS 'JSONB containing section configuration (enabled/disabled, order, etc.)';
COMMENT ON COLUMN resume.customizations IS 'JSONB containing layout customizations (colors, fonts, spacing, etc.)';
COMMENT ON COLUMN resume.version_number IS 'Version number for this resume';
COMMENT ON COLUMN resume.parent_resume_id IS 'Reference to parent resume (for versioning)';
COMMENT ON COLUMN resume.is_master IS 'Indicates if this is a master resume';

