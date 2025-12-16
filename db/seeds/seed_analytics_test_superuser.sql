-- Seed script for analytics.test@betabaddies.com
-- Creates the user (if needed) and populates data to exercise:
-- - Job opportunities & pipeline
-- - Response time predictions
-- - A/B tests for resume and cover letter (with real data)

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
  v_resume_a_id uuid;
  v_resume_b_id uuid;
  v_cover_a_id uuid;
  v_cover_b_id uuid;
  v_ab_test_resume_id uuid;
  v_ab_test_cover_id uuid;
  v_job_id uuid;
  i int;
  v_status text;
  v_days_until_response int;
  v_applied_at timestamp with time zone;
  v_first_response_at timestamp with time zone;
BEGIN
  -- Look up existing user
  SELECT u_id INTO v_existing_id
  FROM users
  WHERE email = 'analytics.test@betabaddies.com'
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    -- Create the test user with password Test123!
    INSERT INTO users (
      u_id,
      email,
      password,
      auth_provider,
      role
    ) VALUES (
      gen_random_uuid(),
      'analytics.test@betabaddies.com',
      crypt('Test123!', gen_salt('bf')),
      'local',
      'candidate'
    )
    RETURNING u_id INTO v_user_id;

    RAISE NOTICE 'Created analytics test user with id %', v_user_id;
  ELSE
    v_user_id := v_existing_id;
    RAISE NOTICE 'Using existing analytics test user with id %', v_user_id;
  END IF;

  ---------------------------------------------------------------------------
  -- Application documents (resumes & cover letters)
  ---------------------------------------------------------------------------

  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary
  ) VALUES (
    gen_random_uuid(), v_user_id, 'resume', 'Resume Version A', 1,
    'Clean', 'professional', true, true
  )
  RETURNING id INTO v_resume_a_id;

  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary
  ) VALUES (
    gen_random_uuid(), v_user_id, 'resume', 'Resume Version B', 2,
    'Modern', 'modern', true, false
  )
  RETURNING id INTO v_resume_b_id;

  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary
  ) VALUES (
    gen_random_uuid(), v_user_id, 'cover_letter', 'Cover Letter A', 1,
    'Concise', 'professional', true, true
  )
  RETURNING id INTO v_cover_a_id;

  INSERT INTO application_documents (
    id, user_id, document_type, document_name, version_number,
    template_name, template_category, is_active, is_primary
  ) VALUES (
    gen_random_uuid(), v_user_id, 'cover_letter', 'Cover Letter B', 2,
    'Storytelling', 'creative', true, false
  )
  RETURNING id INTO v_cover_b_id;

  ---------------------------------------------------------------------------
  -- A/B tests for resumes and cover letters
  ---------------------------------------------------------------------------

  INSERT INTO ab_tests (
    id, user_id, test_name, test_type, description,
    control_group_config, variant_groups, traffic_split,
    status, created_at, start_date, end_date
  ) VALUES (
    gen_random_uuid(), v_user_id,
    'Demo Resume A/B Test',
    'resume',
    'Compare Resume Version A vs B on response and offer rates.',
    jsonb_build_object(
      'name', 'Resume A (Control)',
      'resumeVersionId', v_resume_a_id
    ),
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Resume B',
        'resumeVersionId', v_resume_b_id
      )
    ),
    jsonb_build_object(
      'control', 50,
      'variant_a', 50
    ),
    'completed',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days'
  )
  RETURNING id INTO v_ab_test_resume_id;

  INSERT INTO ab_tests (
    id, user_id, test_name, test_type, description,
    control_group_config, variant_groups, traffic_split,
    status, created_at, start_date, end_date
  ) VALUES (
    gen_random_uuid(), v_user_id,
    'Demo Cover Letter A/B Test',
    'cover_letter',
    'Compare Cover Letter A vs B on response and interview rates.',
    jsonb_build_object(
      'name', 'Cover A (Control)',
      'coverLetterVersionId', v_cover_a_id
    ),
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Cover B',
        'coverLetterVersionId', v_cover_b_id
      )
    ),
    jsonb_build_object(
      'control', 50,
      'variant_a', 50
    ),
    'completed',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '5 days'
  )
  RETURNING id INTO v_ab_test_cover_id;

  ---------------------------------------------------------------------------
  -- Job opportunities + application_strategies with varied response times
  ---------------------------------------------------------------------------

  -- 30 jobs: first 15 for resume test, next 15 for cover letter test
  FOR i IN 1..30 LOOP
    v_job_id := gen_random_uuid();

    -- Application submitted between 5 and 40 days ago
    v_applied_at := NOW() - ( (5 + (i % 35)) || ' days')::interval;

    -- Status & response timing pattern:
    --  - Every 5th: Offer (fast)
    --  - Every 3rd: Interview (medium)
    --  - Every 2nd: Phone Screen (slower)
    --  - Others: Applied (no response yet)
    IF (i % 5 = 0) THEN
      v_status := 'Offer';
      v_days_until_response := 3 + (i % 3); -- between 3–5 days
    ELSIF (i % 3 = 0) THEN
      v_status := 'Interview';
      v_days_until_response := 6 + (i % 4); -- between 6–9 days
    ELSIF (i % 2 = 0) THEN
      v_status := 'Phone Screen';
      v_days_until_response := 8 + (i % 5); -- between 8–12 days
    ELSE
      v_status := 'Applied';
      v_days_until_response := NULL; -- no response yet
    END IF;

    IF v_days_until_response IS NOT NULL THEN
      v_first_response_at := v_applied_at + (v_days_until_response || ' days')::interval;
    ELSE
      v_first_response_at := NULL;
    END IF;

    INSERT INTO job_opportunities (
      id, user_id, title, company, location,
      salary_min, salary_max,
      job_posting_url, application_deadline, job_description,
      industry, job_type, status,
      notes,
      application_history,
      location_type, latitude, longitude, timezone,
      city, region, country, geocoding_confidence, geocoding_raw,
      application_submitted_at, first_response_at, status_updated_at, created_at, updated_at
    ) VALUES (
      v_job_id, v_user_id,
      CASE WHEN i <= 15 THEN 'Software Engineer' ELSE 'Product Manager' END,
      CASE WHEN i % 2 = 0 THEN 'DemoCorp' ELSE 'Techify' END,
      'Remote',
      90000, 140000,
      'https://example.com/job/demo-' || i,
      NULL,
      'Seeded job for A/B testing and response-time prediction demo',
      CASE WHEN i <= 15 THEN 'Technology' ELSE 'SaaS' END,
      CASE WHEN i <= 15 THEN 'Full-time' ELSE 'Full-time' END,
      v_status,
      'Seeded for analytics testing',
      '[]'::jsonb,
      'remote', NULL, NULL, 'UTC',
      NULL, NULL, NULL, NULL, NULL,
      v_applied_at,
      v_first_response_at,
      COALESCE(v_first_response_at, v_applied_at),
      v_applied_at,
      COALESCE(v_first_response_at, NOW())
    );

    -- Application strategy / A/B linkage
    IF i <= 15 THEN
      -- Resume test
      INSERT INTO application_strategies (
        user_id,
        job_opportunity_id,
        application_method,
        application_channel,
        application_timestamp,
        resume_version_id,
        cover_letter_version_id,
        customization_level,
        ab_test_id,
        ab_test_group
      ) VALUES (
        v_user_id,
        v_job_id,
        'job_board',
        'DemoBoard',
        v_applied_at,
        CASE WHEN i <= 8 THEN v_resume_a_id ELSE v_resume_b_id END,
        NULL,
        'standard',
        v_ab_test_resume_id,
        CASE WHEN i <= 8 THEN 'control' ELSE 'variant_a' END
      );
    ELSE
      -- Cover letter test
      INSERT INTO application_strategies (
        user_id,
        job_opportunity_id,
        application_method,
        application_channel,
        application_timestamp,
        resume_version_id,
        cover_letter_version_id,
        customization_level,
        ab_test_id,
        ab_test_group
      ) VALUES (
        v_user_id,
        v_job_id,
        'company_website',
        'Careers',
        v_applied_at,
        v_resume_a_id,
        CASE WHEN i <= 23 THEN v_cover_a_id ELSE v_cover_b_id END,
        'standard',
        v_ab_test_cover_id,
        CASE WHEN i <= 23 THEN 'control' ELSE 'variant_a' END
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Seeded analytics test data for user %', v_user_id;
END $$;


