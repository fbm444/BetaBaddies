-- =====================================================
-- Fix Existing Jobs for Pattern Recognition
-- Adds missing application_source and application_method
-- =====================================================

BEGIN;

-- Update jobs with realistic application sources and methods based on their characteristics
UPDATE job_opportunities
SET 
    application_source = CASE 
        -- Jobs with referrals get 'referral' source
        WHEN recruiter_name IS NOT NULL THEN 'referral'
        -- Big tech companies often found through company website
        WHEN company IN ('Google', 'Amazon Web Services', 'NVIDIA', 'GitHub', 'Salesforce', 'Shopify', 'Spotify') THEN 'company_website'
        -- Smaller companies through job boards
        ELSE 'job_board'
    END,
    application_method = CASE 
        -- Referrals typically through email
        WHEN recruiter_name IS NOT NULL THEN 'email'
        -- Company websites use direct application
        WHEN company IN ('Google', 'Amazon Web Services', 'NVIDIA', 'Salesforce', 'Shopify') THEN 'direct_application'
        -- Job boards often use online forms or easy apply
        WHEN company IN ('Intuit', 'GitHub', 'Spotify') THEN 'linkedin_easy_apply'
        ELSE 'online_form'
    END,
    -- Set application_submitted_at to created_at if missing
    application_submitted_at = COALESCE(application_submitted_at, created_at)
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND (application_source IS NULL OR application_method IS NULL OR application_submitted_at IS NULL);

-- Add realistic, varied time logs to create meaningful patterns
-- Pattern: Higher prep time (5-8 hours total) correlates with better outcomes

-- Successful applications (Offer, Interview) - HIGH prep time (5-8 hours total)
-- Research phase
INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'research',
    2.5 + (RANDOM() * 1.5), -- 2.5-4 hours research
    created_at::date,
    'In-depth company research, role analysis, team research'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status IN ('Offer', 'Interview')
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

-- Application customization phase
INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'application',
    2.0 + (RANDOM() * 1.5), -- 2-3.5 hours application
    created_at::date + INTERVAL '1 day',
    'Custom resume, tailored cover letter, portfolio updates'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status IN ('Offer', 'Interview')
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

-- Networking/prep phase for successful ones
INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'networking',
    1.0 + (RANDOM() * 1.0), -- 1-2 hours networking
    created_at::date + INTERVAL '2 days',
    'Connected with employees, informational interviews'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status IN ('Offer', 'Interview')
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

-- Phone Screen - MEDIUM prep time (3-4 hours total)
INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'research',
    1.5 + (RANDOM() * 0.5), -- 1.5-2 hours
    created_at::date,
    'Company overview and role requirements'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status = 'Phone Screen'
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'application',
    1.5 + (RANDOM() * 0.5), -- 1.5-2 hours
    created_at::date + INTERVAL '1 day',
    'Resume tailoring and basic cover letter'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status = 'Phone Screen'
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

-- Applied status - LOW prep time (1-2 hours total)
INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'research',
    0.5 + (RANDOM() * 0.5), -- 0.5-1 hour
    created_at::date,
    'Quick company lookup'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status = 'Applied'
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'application',
    0.5 + (RANDOM() * 0.5), -- 0.5-1 hour
    created_at::date,
    'Standard resume and quick apply'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status = 'Applied'
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

-- Interested/Rejected - MINIMAL prep time (0.5-1 hour)
INSERT INTO time_logs (user_id, job_opportunity_id, activity_type, hours_spent, activity_date, notes)
SELECT 
    '1799f139-7c86-40bf-8385-e268b45e6624',
    id,
    'application',
    0.25 + (RANDOM() * 0.75), -- 0.25-1 hour
    created_at::date,
    'Quick application with standard materials'
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND status IN ('Interested', 'Rejected')
  AND id NOT IN (SELECT DISTINCT job_opportunity_id FROM time_logs WHERE job_opportunity_id IS NOT NULL);

COMMIT;

-- Verification
SELECT 
    'Updated Jobs' as info,
    COUNT(*) as count
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
  AND application_source IS NOT NULL
  AND application_method IS NOT NULL;

SELECT 
    'Jobs by Source' as category,
    application_source as value,
    COUNT(*) as count
FROM job_opportunities
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624'
GROUP BY application_source;

SELECT 
    'Time Logs Added' as info,
    COUNT(*) as count
FROM time_logs
WHERE user_id = '1799f139-7c86-40bf-8385-e268b45e6624';
