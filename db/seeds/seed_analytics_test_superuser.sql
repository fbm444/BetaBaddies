-- Seed script for analytics.test@betabaddies.com
-- Recreates the test user with meaningful, real-world style data:
-- - Cleans previous data for this user
-- - Job opportunities with realistic companies (Google, Stripe, Microsoft)
-- - Response times for prediction logic
-- - Resumes and cover letters (primary versions) with sample file paths
-- - A/B tests linked to documents
-- - One pre-seeded quality score for UI testing

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_resume_primary uuid;
  v_resume_alt uuid;
  v_cover_primary uuid;
  v_cover_alt uuid;
  v_ab_test_resume_id uuid;
  v_ab_test_cover_id uuid;

  v_job_google uuid;
  v_job_stripe uuid;
  v_job_microsoft uuid;
BEGIN
  -- If user exists, wipe their related data then recreate
  PERFORM u_id FROM users WHERE email = 'analytics.test@betabaddies.com';
  IF FOUND THEN
    -- Delete dependent rows first
    DELETE FROM application_quality_scores WHERE user_id IN (SELECT u_id FROM users WHERE email = 'analytics.test@betabaddies.com');
    DELETE FROM application_strategies WHERE user_id IN (SELECT u_id FROM users WHERE email = 'analytics.test@betabaddies.com');
    DELETE FROM ab_tests WHERE user_id IN (SELECT u_id FROM users WHERE email = 'analytics.test@betabaddies.com');
    DELETE FROM application_documents WHERE user_id IN (SELECT u_id FROM users WHERE email = 'analytics.test@betabaddies.com');
    DELETE FROM job_opportunities WHERE user_id IN (SELECT u_id FROM users WHERE email = 'analytics.test@betabaddies.com');
    DELETE FROM users WHERE email = 'analytics.test@betabaddies.com';
  END IF;

  -- Create the user fresh
  INSERT INTO users (u_id, email, password, auth_provider, role)
  VALUES (
    gen_random_uuid(),
    'analytics.test@betabaddies.com',
    crypt('Test123!', gen_salt('bf')),
    'local',
    'candidate'
  )
  RETURNING u_id INTO v_user_id;

  RAISE NOTICE 'Created fresh analytics test user %', v_user_id;

  ---------------------------------------------------------------------------
  -- Documents (with sample file paths)
  ---------------------------------------------------------------------------
  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary, file_path
  ) VALUES (
    gen_random_uuid(), v_user_id, 'resume', 'Resume - SWE (Google focus)', 1,
    'Clean', 'professional', true, true, '/demo/resumes/google_swe_resume.pdf'
  ) RETURNING id INTO v_resume_primary;

  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary, file_path
  ) VALUES (
    gen_random_uuid(), v_user_id, 'resume', 'Resume - PM (Stripe focus)', 2,
    'Modern', 'modern', true, false, '/demo/resumes/stripe_pm_resume.pdf'
  ) RETURNING id INTO v_resume_alt;

  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary, file_path
  ) VALUES (
    gen_random_uuid(), v_user_id, 'cover_letter', 'Cover Letter - SWE', 1,
    'Concise', 'professional', true, true, '/demo/covers/google_swe_cover.pdf'
  ) RETURNING id INTO v_cover_primary;

  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary, file_path
  ) VALUES (
    gen_random_uuid(), v_user_id, 'cover_letter', 'Cover Letter - PM', 2,
    'Storytelling', 'creative', true, false, '/demo/covers/stripe_pm_cover.pdf'
  ) RETURNING id INTO v_cover_alt;

  ---------------------------------------------------------------------------
  -- A/B tests (resume + cover)
  ---------------------------------------------------------------------------
  INSERT INTO ab_tests (
    id, user_id, test_name, test_type, description,
    control_group_config, variant_groups, traffic_split,
    status, created_at, start_date, end_date
  ) VALUES (
    gen_random_uuid(), v_user_id,
    'Resume A/B: SWE vs PM flavor',
    'resume',
    'Compare SWE-focused resume vs PM-focused resume.',
    jsonb_build_object('name', 'SWE Resume', 'resumeVersionId', v_resume_primary),
    jsonb_build_array(jsonb_build_object('name', 'PM Resume', 'resumeVersionId', v_resume_alt)),
    jsonb_build_object('control', 50, 'variant_a', 50),
    'completed',
    NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '32 days',
    NOW() - INTERVAL '10 days'
  ) RETURNING id INTO v_ab_test_resume_id;

  INSERT INTO ab_tests (
    id, user_id, test_name, test_type, description,
    control_group_config, variant_groups, traffic_split,
    status, created_at, start_date, end_date
  ) VALUES (
    gen_random_uuid(), v_user_id,
    'Cover Letter A/B: concise vs storytelling',
    'cover_letter',
    'Compare concise professional cover vs storytelling cover.',
    jsonb_build_object('name', 'Concise CL', 'coverLetterVersionId', v_cover_primary),
    jsonb_build_array(jsonb_build_object('name', 'Storytelling CL', 'coverLetterVersionId', v_cover_alt)),
    jsonb_build_object('control', 50, 'variant_a', 50),
    'completed',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '22 days',
    NOW() - INTERVAL '5 days'
  ) RETURNING id INTO v_ab_test_cover_id;

  ---------------------------------------------------------------------------
  -- Job opportunities (realistic companies)
  ---------------------------------------------------------------------------
  -- Google SWE (responded in 6 days)
  v_job_google := gen_random_uuid();
  INSERT INTO job_opportunities (
    id, user_id, title, company, location,
    salary_min, salary_max, job_posting_url, job_description,
    industry, job_type, status,
    application_history, location_type, timezone,
    application_submitted_at, first_response_at, status_updated_at, created_at, updated_at
  ) VALUES (
    v_job_google, v_user_id,
    'Software Engineer, Cloud',
    'Google',
    'Mountain View, CA',
    160000, 240000,
    'https://careers.google.com/jobs/cloud-swe',
    'Build distributed systems and developer platforms for Google Cloud customers.',
    'Technology', 'Full-time', 'Interview',
    '[]'::jsonb, 'hybrid', 'America/Los_Angeles',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '24 days', -- responded in ~6 days
    NOW() - INTERVAL '24 days',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '24 days'
  );

  -- Stripe PM (responded in 9 days)
  v_job_stripe := gen_random_uuid();
  INSERT INTO job_opportunities (
    id, user_id, title, company, location,
    salary_min, salary_max, job_posting_url, job_description,
    industry, job_type, status,
    application_history, location_type, timezone,
    application_submitted_at, first_response_at, status_updated_at, created_at, updated_at
  ) VALUES (
    v_job_stripe, v_user_id,
    'Product Manager, Issuing',
    'Stripe',
    'Remote',
    180000, 260000,
    'https://stripe.com/jobs/pm-issuing',
    'Drive roadmap for Issuing; collaborate with eng/design; ship merchant-facing experiences.',
    'Fintech', 'Full-time', 'Phone Screen',
    '[]'::jsonb, 'remote', 'America/Los_Angeles',
    NOW() - INTERVAL '22 days',
    NOW() - INTERVAL '13 days', -- responded in ~9 days
    NOW() - INTERVAL '13 days',
    NOW() - INTERVAL '22 days',
    NOW() - INTERVAL '13 days'
  );

  -- Microsoft TPM (no response yet)
  v_job_microsoft := gen_random_uuid();
  INSERT INTO job_opportunities (
    id, user_id, title, company, location,
    salary_min, salary_max, job_posting_url, job_description,
    industry, job_type, status,
    application_history, location_type, timezone,
    application_submitted_at, first_response_at, status_updated_at, created_at, updated_at
  ) VALUES (
    v_job_microsoft, v_user_id,
    'Technical Program Manager, AI',
    'Microsoft',
    'Redmond, WA',
    170000, 240000,
    'https://careers.microsoft.com/tpm-ai',
    'Lead AI/ML programs, cross-team delivery, and reliability for Azure AI.',
    'Technology', 'Full-time', 'Applied',
    '[]'::jsonb, 'on-site', 'America/Los_Angeles',
    NOW() - INTERVAL '10 days',
    NULL, -- no response yet
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  );

  ---------------------------------------------------------------------------
  -- Company info (for company size / cohorting)
  ---------------------------------------------------------------------------
  INSERT INTO company_info (id, job_id, size, industry, location, website)
  VALUES
    (gen_random_uuid(), v_job_google, '10000+', 'Technology', 'Mountain View, CA', 'https://google.com'),
    (gen_random_uuid(), v_job_stripe, '5001-10000', 'Fintech', 'San Francisco, CA', 'https://stripe.com'),
    (gen_random_uuid(), v_job_microsoft, '10000+', 'Technology', 'Redmond, WA', 'https://microsoft.com');

  ---------------------------------------------------------------------------
  -- Application strategies linking documents
  ---------------------------------------------------------------------------
  INSERT INTO application_strategies (
    user_id, job_opportunity_id, application_method, application_channel,
    application_timestamp, resume_version_id, cover_letter_version_id,
    customization_level, ab_test_id, ab_test_group
  ) VALUES (
    v_user_id, v_job_google, 'job_board', 'Google Careers', NOW() - INTERVAL '30 days',
    v_resume_primary, v_cover_primary, 'high', v_ab_test_resume_id, 'control'
  ), (
    v_user_id, v_job_stripe, 'referral', 'Employee Referral', NOW() - INTERVAL '22 days',
    v_resume_alt, v_cover_alt, 'standard', v_ab_test_cover_id, 'variant_a'
  ), (
    v_user_id, v_job_microsoft, 'company_website', 'Microsoft Careers', NOW() - INTERVAL '10 days',
    v_resume_primary, v_cover_primary, 'standard', NULL, NULL
  );

  ---------------------------------------------------------------------------
  -- Pre-seeded quality score for UI testing (Google SWE)
  ---------------------------------------------------------------------------
  INSERT INTO application_quality_scores (
    user_id, job_opportunity_id,
    resume_document_id, cover_letter_document_id,
    overall_score, alignment_score, format_score, consistency_score,
    missing_keywords, missing_skills, issues, suggestions, summary, model_version
  ) VALUES (
    v_user_id, v_job_google,
    v_resume_primary, v_cover_primary,
    78.5, 82, 75, 72,
    '[{"keyword":"Kubernetes","importance":"high"},{"keyword":"GCP","importance":"high"}]'::jsonb,
    '[{"skill":"Distributed systems","importance":"high"}]'::jsonb,
    '[{"type":"formatting","description":"Inconsistent bullet punctuation","severity":"low","location":"resume"}]'::jsonb,
    '[{"id":"s1","title":"Highlight GCP experience","description":"Add a concise bullet on GCP services used","priority":"high","category":"alignment","estimatedImpact":18}]'::jsonb,
    'Good alignment; add GCP/Kubernetes emphasis and tighten formatting.',
    'v1-seeded'
  );

  RAISE NOTICE 'Seeded analytics test data with real companies for user %', v_user_id;
END $$;


