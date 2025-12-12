-- Fix coverletter job_id foreign key constraint
-- The constraint was incorrectly pointing to prospectivejobs instead of job_opportunities

-- Drop the old constraint if it exists
ALTER TABLE coverletter DROP CONSTRAINT IF EXISTS fk_coverletter_job;

-- Also drop the old constraint with different name if it exists
ALTER TABLE coverletter DROP CONSTRAINT IF EXISTS coverletter_job_is_fkey;

-- Add the correct constraint pointing to job_opportunities
ALTER TABLE coverletter ADD CONSTRAINT fk_coverletter_job 
  FOREIGN KEY (job_id) REFERENCES job_opportunities(id) 
  ON DELETE SET NULL;

