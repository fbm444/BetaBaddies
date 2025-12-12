-- Fix company_info foreign key constraint
-- The constraint currently points to prospectivejobs, but should point to job_opportunities

-- Drop the old constraint
ALTER TABLE company_info 
DROP CONSTRAINT IF EXISTS company_info_job_id_fkey;

-- Add the correct constraint pointing to job_opportunities
ALTER TABLE company_info 
ADD CONSTRAINT company_info_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES job_opportunities(id) ON DELETE CASCADE;

-- Verify the constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'company_info'
    AND kcu.column_name = 'job_id';

