-- ============================================
-- Create Interview Analytics Test User
-- ============================================
-- This script creates a complete test user with:
-- - Full profile, skills, education, jobs, projects, certifications
-- - Job opportunities with recruiter data
-- - Multiple interviews (practice, past, scheduled)
-- - Interview feedback, follow-ups, assessments
-- - Salary negotiations
-- - Writing practice sessions
-- - Resumes, cover letters, contacts, coffee chats, networking messages, goals
--
-- Login credentials:
--   Email: analytics.test@betabaddies.com
--   Password: Test123! (hashed with bcrypt)
-- ============================================

-- Step 1: Create or get test user
DO $$
DECLARE
    v_user_id UUID;
    v_test_email TEXT := 'analytics.test@betabaddies.com';
    -- bcrypt hash for "Test123!" with salt rounds 12
    v_hashed_password TEXT := '$2b$12$T5Gqp6qOqElPS3yh.TeIKu1vQAoHo5061ViZ6caCik76SMyjX7v.q';
BEGIN
    -- Check if user exists
    SELECT u_id INTO v_user_id FROM users WHERE email = v_test_email;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Test user already exists: %', v_user_id;
        RAISE NOTICE 'Clearing existing data to start fresh...';
        
        -- Delete all user data in correct order (respecting foreign keys)
        DELETE FROM writing_practice_sessions WHERE user_id = v_user_id;
        DELETE FROM negotiation_confidence_exercises WHERE user_id = v_user_id;
        DELETE FROM salary_progression_history WHERE user_id = v_user_id;
        DELETE FROM salary_negotiations WHERE user_id = v_user_id;
        DELETE FROM interview_feedback WHERE user_id = v_user_id;
        DELETE FROM interview_pre_assessment WHERE user_id = v_user_id;
        DELETE FROM interview_post_reflection WHERE user_id = v_user_id;
        DELETE FROM interview_follow_ups WHERE interview_id IN (SELECT id FROM interviews WHERE user_id = v_user_id);
        DELETE FROM interviews WHERE user_id = v_user_id;
        DELETE FROM coverletter WHERE user_id = v_user_id;
        DELETE FROM resume WHERE user_id = v_user_id;
        DELETE FROM job_opportunities WHERE user_id = v_user_id;
        DELETE FROM certifications WHERE user_id = v_user_id;
        DELETE FROM projects WHERE user_id = v_user_id;
        DELETE FROM educations WHERE user_id = v_user_id;
        DELETE FROM skills WHERE user_id = v_user_id;
        DELETE FROM jobs WHERE user_id = v_user_id;
        DELETE FROM profiles WHERE user_id = v_user_id;
    ELSE
        -- Create new user
        v_user_id := gen_random_uuid();
        INSERT INTO users (u_id, email, password, created_at, updated_at, auth_provider)
        VALUES (v_user_id, v_test_email, v_hashed_password, NOW(), NOW(), 'local');
        RAISE NOTICE 'Created test user: %', v_user_id;
    END IF;
    
    -- Store user_id for subsequent inserts
    PERFORM set_config('app.user_id', v_user_id::TEXT, false);
END $$;

-- Get the user_id we just created/cleared
DO $$
DECLARE
    v_user_id UUID;
    v_now TIMESTAMP := NOW();
    v_job_opp_ids UUID[];
    v_interview_ids UUID[];
    v_resume_ids UUID[];
    v_cover_letter_ids UUID[];
    v_contact_ids UUID[];
    v_coffee_chat_ids UUID[];
    v_negotiation_ids UUID[];
    v_offer_job_opp_ids UUID[];
    v_skill_id UUID;
    v_education_id UUID;
    v_job_id UUID;
    v_project_id UUID;
    v_cert_id UUID;
    v_interview_id UUID;
    v_feedback_id UUID;
    v_followup_id UUID;
    v_pre_assessment_id UUID;
    v_post_reflection_id UUID;
    v_writing_session_id UUID;
    v_networking_message_id UUID;
    v_goal_id UUID;
BEGIN
    -- Get user_id (ensure only one row)
    SELECT u_id INTO v_user_id FROM users WHERE email = 'analytics.test@betabaddies.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found. Please run the first DO block to create the user.';
    END IF;
    
    -- Step 2: Create profile
    INSERT INTO profiles (
        user_id, first_name, last_name, phone, city, state, 
        job_title, bio, industry, exp_level, pfp_link
    ) VALUES (
        v_user_id,
        'Sarah',
        'Chen',
        '(555) 987-6543',
        'San Francisco',
        'CA',
        'Senior Software Engineer',
        'Experienced software engineer with 6+ years in full-stack development. Passionate about system design, algorithms, and building scalable applications. Currently looking for new opportunities in big tech companies.',
        'Technology',
        'Senior',
        'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'
    ) ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        job_title = EXCLUDED.job_title,
        bio = EXCLUDED.bio,
        industry = EXCLUDED.industry,
        exp_level = EXCLUDED.exp_level,
        pfp_link = EXCLUDED.pfp_link;
    
    -- Step 3: Add skills
    INSERT INTO skills (id, user_id, skill_name, proficiency, category) VALUES
        (gen_random_uuid(), v_user_id, 'JavaScript', 'Expert', 'Languages'),
        (gen_random_uuid(), v_user_id, 'TypeScript', 'Advanced', 'Languages'),
        (gen_random_uuid(), v_user_id, 'Python', 'Advanced', 'Languages'),
        (gen_random_uuid(), v_user_id, 'Java', 'Advanced', 'Languages'),
        (gen_random_uuid(), v_user_id, 'Go', 'Intermediate', 'Languages'),
        (gen_random_uuid(), v_user_id, 'C++', 'Intermediate', 'Languages'),
        (gen_random_uuid(), v_user_id, 'React', 'Expert', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Next.js', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Redux', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'HTML/CSS', 'Expert', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Node.js', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Express.js', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'GraphQL', 'Intermediate', 'Technical'),
        (gen_random_uuid(), v_user_id, 'REST APIs', 'Expert', 'Technical'),
        (gen_random_uuid(), v_user_id, 'PostgreSQL', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'MongoDB', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Redis', 'Intermediate', 'Technical'),
        (gen_random_uuid(), v_user_id, 'AWS', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Docker', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Kubernetes', 'Intermediate', 'Technical'),
        (gen_random_uuid(), v_user_id, 'CI/CD', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Terraform', 'Intermediate', 'Technical'),
        (gen_random_uuid(), v_user_id, 'System Design', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Algorithms', 'Expert', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Data Structures', 'Expert', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Distributed Systems', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Microservices', 'Advanced', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Git', 'Expert', 'Technical'),
        (gen_random_uuid(), v_user_id, 'Agile/Scrum', 'Advanced', 'Soft Skills'),
        (gen_random_uuid(), v_user_id, 'Leadership', 'Advanced', 'Soft Skills'),
        (gen_random_uuid(), v_user_id, 'Mentoring', 'Advanced', 'Soft Skills');
    
    -- Step 4: Add education
    INSERT INTO educations (id, user_id, school, degree_type, field, gpa, is_enrolled, graddate, startdate) VALUES
        (gen_random_uuid(), v_user_id, 'Stanford University', 'Master''s', 'Computer Science', 3.85, false, '2018-05-15', '2016-08-20'),
        (gen_random_uuid(), v_user_id, 'UC Berkeley', 'Bachelor''s', 'Computer Science', 3.78, false, '2016-05-20', '2012-08-25');
    
    -- Step 5: Add employment history
    INSERT INTO jobs (id, user_id, title, company, location, start_date, end_date, is_current, description, salary) VALUES
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'LinkedIn', 'Sunnyvale, CA', '2020-03-01', NULL, true, 'Lead development of microservices architecture. Mentored junior developers.', 155000),
        (gen_random_uuid(), v_user_id, 'Software Engineer', 'Twitch', 'San Francisco, CA', '2018-06-01', '2020-02-28', false, 'Developed React-based frontend applications. Increased user engagement by 25%.', 120000);
    
    -- Step 6: Add projects
    INSERT INTO projects (id, user_id, name, description, start_date, end_date, technologies, status, link) VALUES
        (gen_random_uuid(), v_user_id, 'Distributed E-Commerce Platform', 'Built scalable e-commerce platform using microservices architecture, handling 50K+ concurrent users. Implemented Redis caching, PostgreSQL sharding, and AWS auto-scaling. Reduced latency by 60% and improved throughput by 3x.', '2021-01-01', '2021-06-30', 'React, Node.js, TypeScript, PostgreSQL, Redis, AWS, Docker, Kubernetes', 'Completed', 'https://github.com/example/ecommerce-platform'),
        (gen_random_uuid(), v_user_id, 'Real-time Chat Application', 'Developed real-time messaging app with WebSocket support, supporting 10K+ concurrent connections. Implemented message queuing, presence detection, and end-to-end encryption.', '2020-08-01', '2020-12-31', 'React, Node.js, Socket.io, MongoDB, Redis, AWS', 'Completed', 'https://github.com/example/chat-app'),
        (gen_random_uuid(), v_user_id, 'AI Recommendation System', 'Machine learning recommendation engine for personalized content. Trained models using TensorFlow, achieving 85% accuracy. Deployed using Flask API with Redis caching.', '2022-03-01', NULL, 'Python, TensorFlow, Flask, PostgreSQL, Redis, Docker', 'Ongoing', 'https://github.com/example/ml-recommendations'),
        (gen_random_uuid(), v_user_id, 'Distributed Task Queue System', 'Built a distributed task queue system similar to Celery, supporting priority queues, retries, and rate limiting. Handles 1M+ tasks per day with 99.9% reliability.', '2021-07-01', '2022-02-28', 'Go, Redis, PostgreSQL, gRPC, Docker, Kubernetes', 'Completed', 'https://github.com/example/task-queue'),
        (gen_random_uuid(), v_user_id, 'Cloud Infrastructure Monitoring Tool', 'Real-time monitoring dashboard for cloud infrastructure. Tracks metrics, logs, and alerts across multiple AWS accounts. Built with React and real-time WebSocket updates.', '2022-09-01', NULL, 'React, TypeScript, Node.js, PostgreSQL, AWS CloudWatch, WebSockets', 'Ongoing', 'https://github.com/example/cloud-monitor'),
        (gen_random_uuid(), v_user_id, 'High-Performance API Gateway', 'Built a custom API gateway with rate limiting, authentication, and request routing. Handles 100K+ requests per second with sub-millisecond latency.', '2020-03-01', '2020-07-31', 'Go, Redis, PostgreSQL, gRPC, Docker', 'Completed', 'https://github.com/example/api-gateway');
    
    -- Step 7: Add certifications
    INSERT INTO certifications (id, user_id, name, org_name, date_earned, never_expires, expiration_date) VALUES
        (gen_random_uuid(), v_user_id, 'AWS Certified Solutions Architect - Professional', 'Amazon Web Services', '2022-05-15', false, '2025-05-15'),
        (gen_random_uuid(), v_user_id, 'AWS Certified Developer - Associate', 'Amazon Web Services', '2021-11-20', false, '2024-11-20'),
        (gen_random_uuid(), v_user_id, 'Google Cloud Professional Cloud Architect', 'Google Cloud', '2023-02-10', false, '2026-02-10'),
        (gen_random_uuid(), v_user_id, 'Kubernetes Administrator (CKA)', 'Cloud Native Computing Foundation', '2022-08-30', false, '2025-08-30'),
        (gen_random_uuid(), v_user_id, 'Certified Kubernetes Application Developer (CKAD)', 'Cloud Native Computing Foundation', '2022-09-15', false, '2025-09-15'),
        (gen_random_uuid(), v_user_id, 'MongoDB Certified Developer', 'MongoDB', '2021-06-10', false, '2024-06-10');
    
    -- Step 8: Create job opportunities
    INSERT INTO job_opportunities (id, user_id, title, company, location, industry, status, salary_min, salary_max, recruiter_name, recruiter_email, recruiter_phone) VALUES
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Meta', 'Menlo Park, CA', 'Technology', 'Offer', 180000, 250000, 'Sarah Johnson', 'sarah.johnson@meta.com', '+1 (650) 555-0123'),
        (gen_random_uuid(), v_user_id, 'Software Development Engineer II', 'Amazon', 'Seattle, WA', 'Technology', 'Offer', 175000, 240000, 'Michael Chen', 'mchen@amazon.com', '+1 (206) 555-0145'),
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Apple', 'Cupertino, CA', 'Technology', 'Offer', 190000, 260000, 'Emily Rodriguez', 'emily.rodriguez@apple.com', '+1 (408) 555-0167'),
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Netflix', 'Los Gatos, CA', 'Technology', 'Interview', 200000, 280000, 'David Kim', 'david.kim@netflix.com', '+1 (408) 555-0189'),
        (gen_random_uuid(), v_user_id, 'Software Engineer L4', 'Google', 'Mountain View, CA', 'Technology', 'Interview', 185000, 255000, 'Jessica Williams', 'jwilliams@google.com', '+1 (650) 555-0201'),
        (gen_random_uuid(), v_user_id, 'Senior Backend Engineer', 'Microsoft', 'Redmond, WA', 'Technology', 'Interview', 175000, 245000, 'Robert Martinez', 'robert.martinez@microsoft.com', '+1 (425) 555-0223'),
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Salesforce', 'San Francisco, CA', 'Technology', 'Interview', 180000, 250000, 'Alex Thompson', 'alex.thompson@salesforce.com', '+1 (415) 555-0245'),
        (gen_random_uuid(), v_user_id, 'Software Engineer', 'Oracle', 'Austin, TX', 'Technology', 'Interview', 175000, 240000, 'Priya Patel', 'priya.patel@oracle.com', '+1 (512) 555-0267'),
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Adobe', 'San Jose, CA', 'Technology', 'Interview', 190000, 260000, 'James Wilson', 'james.wilson@adobe.com', '+1 (408) 555-0289'),
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Nvidia', 'Santa Clara, CA', 'Technology', 'Interview', 200000, 280000, 'Maria Garcia', 'maria.garcia@nvidia.com', '+1 (408) 555-0301'),
        (gen_random_uuid(), v_user_id, 'Software Engineer', 'Uber', 'San Francisco, CA', 'Technology', 'Interview', 185000, 255000, 'Chris Anderson', 'chris.anderson@uber.com', '+1 (415) 555-0323'),
        (gen_random_uuid(), v_user_id, 'Senior Backend Engineer', 'Stripe', 'San Francisco, CA', 'Technology', 'Interview', 175000, 245000, 'Amanda Lee', 'amanda.lee@stripe.com', '+1 (415) 555-0345'),
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Airbnb', 'San Francisco, CA', 'Technology', 'Interview', 190000, 260000, 'Jennifer Martinez', 'jennifer.martinez@airbnb.com', '+1 (415) 555-0367'),
        (gen_random_uuid(), v_user_id, 'Software Engineer', 'Palantir', 'Palo Alto, CA', 'Technology', 'Interview', 195000, 270000, 'David Taylor', 'david.taylor@palantir.com', '+1 (650) 555-0389'),
        (gen_random_uuid(), v_user_id, 'Senior Software Engineer', 'Databricks', 'San Francisco, CA', 'Technology', 'Interview', 200000, 275000, 'Lisa Wang', 'lisa.wang@databricks.com', '+1 (415) 555-0401'),
        (gen_random_uuid(), v_user_id, 'Software Engineer', 'Snowflake', 'San Mateo, CA', 'Technology', 'Interview', 185000, 250000, 'Robert Chen', 'robert.chen@snowflake.com', '+1 (650) 555-0423');
    
    -- Store job opportunity IDs in array (ordered by company for consistency: Amazon, Adobe, Airbnb, Apple, Databricks, Google, Meta, Microsoft, Netflix, Nvidia, Oracle, Palantir, Salesforce, Snowflake, Stripe, Uber)
    SELECT ARRAY_AGG(id ORDER BY company) INTO v_job_opp_ids FROM job_opportunities WHERE user_id = v_user_id;
    
    -- Step 9: Create interviews
    -- Practice interviews (12 and 11.5 months ago)
    INSERT INTO interviews (id, user_id, job_opportunity_id, title, company, type, format, scheduled_at, date, duration, status, outcome, is_practice)
    SELECT 
        gen_random_uuid(),
        v_user_id,
        v_job_opp_ids[7], -- Salesforce
        'Senior Software Engineer Interview',
        'Salesforce',
        'video',
        'technical',
        (v_now - INTERVAL '12 months'),
        (v_now - INTERVAL '12 months'),
        60,
        'completed',
        'passed',
        true
    UNION ALL
    SELECT 
        gen_random_uuid(),
        v_user_id,
        v_job_opp_ids[8], -- Oracle
        'Software Engineer Interview',
        'Oracle',
        'video',
        'behavioral',
        (v_now - INTERVAL '11 months 15 days'),
        (v_now - INTERVAL '11 months 15 days'),
        45,
        'completed',
        'passed',
        true;
    
    -- Past completed interviews
    INSERT INTO interviews (id, user_id, job_opportunity_id, title, company, type, format, scheduled_at, date, duration, status, outcome, is_practice)
    SELECT 
        gen_random_uuid(), v_user_id, v_job_opp_ids[1], 'Senior Software Engineer Interview', 'Meta', 'phone', 'phone_screen', (v_now - INTERVAL '11 months'), (v_now - INTERVAL '11 months'), 30, 'completed', 'offer_extended', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[2], 'Software Development Engineer II Interview', 'Amazon', 'video', 'technical', (v_now - INTERVAL '10 months'), (v_now - INTERVAL '10 months'), 60, 'completed', 'passed', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[3], 'Senior Software Engineer Interview', 'Apple', 'video', 'behavioral', (v_now - INTERVAL '9 months'), (v_now - INTERVAL '9 months'), 45, 'completed', 'offer_extended', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[4], 'Senior Software Engineer Interview', 'Netflix', 'video', 'technical', (v_now - INTERVAL '8 months'), (v_now - INTERVAL '8 months'), 60, 'completed', 'passed', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[5], 'Software Engineer L4 Interview', 'Google', 'in-person', 'on_site', (v_now - INTERVAL '7 months'), (v_now - INTERVAL '7 months'), 180, 'completed', 'rejected', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[6], 'Senior Backend Engineer Interview', 'Microsoft', 'video', 'system_design', (v_now - INTERVAL '6 months'), (v_now - INTERVAL '6 months'), 90, 'completed', 'rejected', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[7], 'Senior Software Engineer Interview', 'Salesforce', 'video', 'technical', (v_now - INTERVAL '5 months'), (v_now - INTERVAL '5 months'), 60, 'completed', 'offer_extended', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[8], 'Software Engineer Interview', 'Oracle', 'video', 'behavioral', (v_now - INTERVAL '4 months'), (v_now - INTERVAL '4 months'), 45, 'completed', 'passed', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[9], 'Senior Software Engineer Interview', 'Adobe', 'video', 'phone_screen', (v_now - INTERVAL '3 months'), (v_now - INTERVAL '3 months'), 30, 'completed', 'passed', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[10], 'Senior Software Engineer Interview', 'Nvidia', 'video', 'technical', (v_now - INTERVAL '2 months'), (v_now - INTERVAL '2 months'), 60, 'completed', 'offer_extended', false
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[11], 'Software Engineer Interview', 'Uber', 'video', 'hirevue', (v_now - INTERVAL '1 month'), (v_now - INTERVAL '1 month'), 45, 'completed', 'passed', false;
    
    -- Scheduled future interviews
    INSERT INTO interviews (id, user_id, job_opportunity_id, title, company, type, format, scheduled_at, date, duration, status, outcome, is_practice, interviewer_name, interviewer_email, interviewer_title, video_link, notes)
    SELECT 
        gen_random_uuid(), v_user_id, v_job_opp_ids[12], 'Senior Backend Engineer Interview', 'Stripe', 'video', 'technical', (v_now + INTERVAL '2 days'), (v_now + INTERVAL '2 days'), 60, 'scheduled', 'pending', false, 'Chris Anderson', 'chris.anderson@stripe.com', 'Senior Software Engineer', 'https://stripe.zoom.us/j/meetup-join/123', 'Technical interview focusing on problem-solving and code quality.'
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[13], 'Senior Software Engineer Interview', 'Airbnb', 'video', 'technical', (v_now + INTERVAL '3 days'), (v_now + INTERVAL '3 days'), 60, 'scheduled', 'pending', false, 'John Smith', 'john.smith@airbnb.com', 'Senior Engineering Manager', 'https://airbnb.zoom.us/j/interview-room-123', 'Focus on system design and algorithms. Review Airbnb''s engineering blog.'
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[14], 'Software Engineer Interview', 'Palantir', 'phone', 'phone_screen', (v_now + INTERVAL '4 days'), (v_now + INTERVAL '4 days'), 30, 'scheduled', 'pending', false, 'Michael Chen', 'mchen@palantir.com', 'Recruiter', NULL, 'Initial screening call. Be ready to discuss background and motivation.'
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[15], 'Senior Software Engineer Interview', 'Databricks', 'video', 'technical', (v_now + INTERVAL '5 days'), (v_now + INTERVAL '5 days'), 60, 'scheduled', 'pending', false, 'Emily Rodriguez', 'erodriguez@databricks.com', 'Software Development Manager', 'https://databricks.zoom.us/j/interview-789', 'Coding interview. Focus on data structures and algorithms. Review LeetCode.'
    UNION ALL SELECT gen_random_uuid(), v_user_id, v_job_opp_ids[16], 'Software Engineer Interview', 'Snowflake', 'video', 'system_design', (v_now + INTERVAL '6 days'), (v_now + INTERVAL '6 days'), 90, 'scheduled', 'pending', false, 'David Kim', 'david.kim@snowflake.com', 'Senior Software Engineer', 'https://snowflake.zoom.us/j/interview-abc', 'System design interview. Review cloud data architecture and distributed systems.';
    
    -- Get interview IDs (past real interviews, skipping practice ones)
    -- Store in array ordered by scheduled_at
    SELECT ARRAY_AGG(id ORDER BY scheduled_at) INTO v_interview_ids 
    FROM interviews 
    WHERE user_id = v_user_id AND is_practice = false AND status = 'completed';
    
    -- Step 10: Create follow-up actions (only if we have interviews)
    IF v_interview_ids IS NOT NULL AND array_length(v_interview_ids, 1) >= 3 THEN
        INSERT INTO interview_follow_ups (id, interview_id, action_type, due_date, notes, completed, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            v_interview_ids[1],
            'thank_you_note',
            (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[1] LIMIT 1) + INTERVAL '24 hours',
            'Send a thank-you note to express appreciation for the interview',
            true,
            NOW(),
            NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[1], 'follow_up_email', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[1] LIMIT 1) + INTERVAL '7 days', 'Follow up on interview status if you haven''t heard back', false, NOW(), NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[1], 'status_inquiry', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[1] LIMIT 1) + INTERVAL '14 days', 'Inquire about the hiring decision timeline', false, NOW(), NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[2], 'thank_you_note', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[2] LIMIT 1) + INTERVAL '24 hours', 'Send a thank-you note to express appreciation for the interview', true, NOW(), NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[2], 'follow_up_email', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[2] LIMIT 1) + INTERVAL '7 days', 'Follow up on interview status if you haven''t heard back', false, NOW(), NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[2], 'status_inquiry', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[2] LIMIT 1) + INTERVAL '14 days', 'Inquire about the hiring decision timeline', false, NOW(), NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[3], 'thank_you_note', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[3] LIMIT 1) + INTERVAL '24 hours', 'Send a thank-you note to express appreciation for the interview', true, NOW(), NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[3], 'follow_up_email', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[3] LIMIT 1) + INTERVAL '7 days', 'Follow up on interview status if you haven''t heard back', false, NOW(), NOW()
        UNION ALL SELECT gen_random_uuid(), v_interview_ids[3], 'status_inquiry', (SELECT scheduled_at FROM interviews WHERE id = v_interview_ids[3] LIMIT 1) + INTERVAL '14 days', 'Inquire about the hiring decision timeline', false, NOW(), NOW();
    END IF;
    
    -- Step 11: Create interview feedback
    INSERT INTO interview_feedback (id, interview_id, user_id, skill_area, score, notes)
    SELECT gen_random_uuid(), v_interview_ids[1], v_user_id, 'behavioral', 55, 'Great communication and clear explanation of experience with Meta'
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[2], v_user_id, 'algorithms', 60, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[2], v_user_id, 'system_design', 65, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[3], v_user_id, 'behavioral', 65, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[4], v_user_id, 'algorithms', 70, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[4], v_user_id, 'apis', 75, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[5], v_user_id, 'behavioral', 45, 'Struggled with time management, nervous during Google on-site'
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[5], v_user_id, 'system_design', 50, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[5], v_user_id, 'time_management', 40, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[6], v_user_id, 'system_design', 55, 'Needs improvement in system design, lack of preparation for Microsoft'
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[7], v_user_id, 'algorithms', 80, 'Outstanding code quality, confident and well-prepared for Salesforce'
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[7], v_user_id, 'system_design', 75, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[8], v_user_id, 'behavioral', 75, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[9], v_user_id, 'behavioral', 70, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[10], v_user_id, 'algorithms', 85, 'Excellent algorithm knowledge, great communication clarity at Nvidia'
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[10], v_user_id, 'system_design', 80, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[10], v_user_id, 'apis', 85, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[11], v_user_id, 'behavioral', 80, NULL
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[11], v_user_id, 'time_management', 75, NULL;
    
    -- Step 12: Create pre/post assessments
    INSERT INTO interview_pre_assessment (id, interview_id, user_id, confidence_level, anxiety_level, preparation_hours)
    SELECT gen_random_uuid(), v_interview_ids[1], v_user_id, 60, 50, 2
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[2], v_user_id, 65, 45, 8
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[3], v_user_id, 70, 40, 5
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[4], v_user_id, 68, 42, 10
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[7], v_user_id, 75, 35, 12
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[10], v_user_id, 80, 30, 15;
    
    INSERT INTO interview_post_reflection (id, interview_id, user_id, post_confidence_level, post_anxiety_level, overall_feeling, what_went_well, what_to_improve)
    SELECT gen_random_uuid(), v_interview_ids[1], v_user_id, 70, 35, 'great', 'Clear communication, good examples with Meta recruiter', 'Could be more concise'
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[7], v_user_id, 85, 25, 'great', 'Excellent preparation paid off at Salesforce', 'None, performed well'
    UNION ALL SELECT gen_random_uuid(), v_interview_ids[10], v_user_id, 88, 20, 'great', 'Strong technical performance at Nvidia', 'Continue current approach';
    
    -- Step 13: Create salary negotiations
    -- Get offer job opportunity IDs (Meta, Amazon, Apple) - ordered by company
    SELECT ARRAY_AGG(id ORDER BY company) INTO v_offer_job_opp_ids 
    FROM (
        SELECT id FROM job_opportunities 
        WHERE user_id = v_user_id AND status = 'Offer' 
        ORDER BY company 
        LIMIT 3
    ) subq;
    
    -- Only proceed if we have offer job opportunities
    IF v_offer_job_opp_ids IS NOT NULL AND array_length(v_offer_job_opp_ids, 1) >= 3 THEN
        INSERT INTO salary_negotiations (
            id, user_id, job_opportunity_id,
            initial_offer_base_salary, initial_offer_bonus, initial_offer_equity,
            initial_offer_benefits_value, initial_offer_total_compensation,
            initial_offer_currency, initial_offer_date,
            target_base_salary, target_bonus, target_equity,
            target_benefits_value, target_total_compensation,
            market_salary_data, market_research_notes,
            final_base_salary, final_bonus, final_equity,
            final_benefits_value, final_total_compensation,
            negotiation_outcome, outcome_date, outcome_notes,
            status, created_at, updated_at
        )
        SELECT 
            gen_random_uuid(), v_user_id, v_offer_job_opp_ids[1],
        200000, 30000, 50000, 15000, 295000,
        'USD', (v_now - INTERVAL '5 days')::DATE,
        230000, 40000, 70000, 15000, 355000,
        '{"role":"Senior Software Engineer","location":"Menlo Park, CA","experienceLevel":6,"industry":"Technology","percentile25":180000,"percentile50":210000,"percentile75":240000,"percentile90":280000,"source":"AI-generated market research","date":"2025-12-09","notes":"Market data for Senior Software Engineer in Menlo Park, CA with 6 years of experience"}'::JSONB,
        'Market data for Senior Software Engineer in Menlo Park, CA with 6 years of experience',
        NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL,
        'active', NOW(), NOW()
        UNION ALL SELECT 
            gen_random_uuid(), v_user_id, v_offer_job_opp_ids[2],
        195000, 25000, 45000, 12000, 277000,
        'USD', (v_now - INTERVAL '3 days')::DATE,
        220000, 35000, 60000, 12000, 327000,
        '{"role":"Software Development Engineer II","location":"Seattle, WA","experienceLevel":6,"industry":"Technology","percentile25":175000,"percentile50":200000,"percentile75":230000,"percentile90":270000,"source":"AI-generated market research","date":"2025-12-09","notes":"Market data for SDE II in Seattle, WA with 6 years of experience"}'::JSONB,
        'Market data for SDE II in Seattle, WA with 6 years of experience',
        NULL, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL,
        'active', NOW(), NOW()
        UNION ALL SELECT 
            gen_random_uuid(), v_user_id, v_offer_job_opp_ids[3],
        210000, 35000, 60000, 18000, 323000,
        'USD', (v_now - INTERVAL '30 days')::DATE,
        240000, 45000, 80000, 18000, 383000,
        '{"role":"Senior Software Engineer","location":"Cupertino, CA","experienceLevel":6,"industry":"Technology","percentile25":190000,"percentile50":220000,"percentile75":250000,"percentile90":290000,"source":"AI-generated market research","date":"2025-12-09","notes":"Market data for Senior Software Engineer in Cupertino, CA with 6 years of experience"}'::JSONB,
        'Market data for Senior Software Engineer in Cupertino, CA with 6 years of experience',
        235000, 42000, 75000, 18000, 370000,
        'accepted', (v_now - INTERVAL '20 days')::DATE,
        'Successfully negotiated from $305k to $370k total compensation. Accepted the offer.',
            'completed', NOW(), NOW();
        
        -- Add to salary progression history for accepted negotiation
        INSERT INTO salary_progression_history (
            id, user_id, negotiation_id, job_opportunity_id,
            base_salary, bonus, equity, benefits_value, total_compensation,
            currency, role_title, company, location, effective_date,
            negotiation_type, notes, created_at
        )
        SELECT 
            gen_random_uuid(), v_user_id, 
            (SELECT id FROM salary_negotiations WHERE user_id = v_user_id AND negotiation_outcome = 'accepted' ORDER BY created_at DESC LIMIT 1),
            v_offer_job_opp_ids[3],
        235000, 42000, 75000, 18000, 370000,
        'USD', 'Senior Software Engineer', 'Apple', 'Cupertino, CA',
        (v_now - INTERVAL '20 days')::DATE,
        'accepted', 'Accepted offer after successful negotiation', NOW();
    END IF;
    
    -- Step 14: Create resumes
    INSERT INTO resume (id, user_id, version_name, name, description, file, is_master, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), v_user_id, 'Sarah Chen Resume 2024', 'Current Resume', 'Current resume - Software Engineering focus', '/uploads/resumes/Sarah_Chen_Resume_2024.pdf', true, NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'Backend-Focused Resume', 'Backend Resume', 'Backend-focused resume variant', '/uploads/resumes/Sarah_Chen_Resume_Backend.pdf', false, NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'Full-Stack Developer Resume', 'Full-Stack Resume', 'Full-stack developer resume', '/uploads/resumes/Sarah_Chen_Resume_Full_Stack.pdf', false, NOW(), NOW())
    RETURNING id INTO v_resume_ids;
    
    SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_resume_ids FROM resume WHERE user_id = v_user_id;
    
    -- Step 15: Create cover letters
    INSERT INTO coverletter (id, user_id, version_name, description, content, job_id, created_at, updated_at)
    SELECT 
        gen_random_uuid(), v_user_id, 'Meta - Senior Software Engineer', 'Cover letter for Meta position',
        'Dear Hiring Manager,

I am writing to express my strong interest in the Senior Software Engineer position at Meta. With over 5 years of experience in full-stack development and a passion for building scalable systems, I am excited about the opportunity to contribute to Meta''s innovative products.

In my current role at LinkedIn, I have led the development of distributed systems serving millions of users, improved system performance by 40%, and mentored junior developers. My expertise in React, Node.js, and cloud architecture aligns perfectly with Meta''s technology stack.

I am particularly drawn to Meta''s mission of connecting people globally and would be thrilled to help shape the future of social technology.

Thank you for considering my application.

Best regards,
Sarah Chen',
        v_job_opp_ids[1],
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Amazon - SDE II', 'Cover letter for Amazon SDE II position',
        'Dear Amazon Recruiting Team,

I am excited to apply for the Software Development Engineer II position at Amazon. Your commitment to innovation and customer obsession resonates deeply with my professional values.

Throughout my career, I have focused on building reliable, scalable systems. At LinkedIn, I designed and implemented microservices architecture that reduced latency by 35% and improved system reliability. My experience with AWS, distributed systems, and data structures would allow me to contribute meaningfully to Amazon''s engineering culture.

I am eager to join a team that solves complex technical challenges while maintaining high standards of quality and customer focus.

Sincerely,
Sarah Chen',
        v_job_opp_ids[2],
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Google - Software Engineer L4', 'Cover letter for Google position',
        'Dear Google Hiring Committee,

I am writing to apply for the Software Engineer L4 position at Google. As a software engineer passionate about solving complex problems and building products that impact billions of users, Google represents an ideal environment for my career growth.

My experience includes developing high-performance backend systems, optimizing algorithms for scale, and contributing to open-source projects. I am particularly interested in Google''s work in distributed systems and machine learning infrastructure.

I am confident that my technical skills, problem-solving ability, and collaborative approach would make me a valuable addition to your team.

Best regards,
Sarah Chen',
        v_job_opp_ids[5],
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'General Purpose Cover Letter', 'Template cover letter for software engineering roles',
        'Dear Hiring Manager,

I am writing to express my interest in software engineering opportunities at your company. With a strong background in full-stack development, system design, and cloud technologies, I am excited about the possibility of contributing to your team.

My experience includes leading technical projects, mentoring developers, and delivering scalable solutions that drive business impact. I am particularly interested in roles that allow me to work on challenging problems while collaborating with talented engineers.

Thank you for your consideration. I look forward to discussing how I can contribute to your team.

Sincerely,
Sarah Chen',
        NULL,
        NOW(), NOW();
    
    SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_cover_letter_ids FROM coverletter WHERE user_id = v_user_id;
    
    -- Link job opportunities to resumes and cover letters
    UPDATE job_opportunities SET resume_id = v_resume_ids[1], coverletter_id = v_cover_letter_ids[1] WHERE id = v_job_opp_ids[1];
    UPDATE job_opportunities SET resume_id = v_resume_ids[2], coverletter_id = v_cover_letter_ids[2] WHERE id = v_job_opp_ids[2];
    UPDATE job_opportunities SET resume_id = v_resume_ids[1], coverletter_id = v_cover_letter_ids[3] WHERE id = v_job_opp_ids[5];
    
    -- Step 16: Create professional contacts
    INSERT INTO professional_contacts (
        id, user_id, first_name, last_name, email, phone, company,
        job_title, industry, location, relationship_type, relationship_strength,
        relationship_context, linkedin_url, created_at, updated_at
    )
    VALUES
        (gen_random_uuid(), v_user_id, 'Alex', 'Thompson', 'alex.thompson@techcorp.com', '+1 (415) 555-0100', 'LinkedIn', 'Senior Software Engineer', 'Technology', 'Sunnyvale, CA', 'Colleague', 'Strong', 'Former coworker from previous role', 'https://linkedin.com/in/alexthompson', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'Maria', 'Garcia', 'maria.garcia@google.com', '+1 (650) 555-0101', 'Uber', 'Engineering Manager', 'Technology', 'San Francisco, CA', 'Mentor', 'Very Strong', 'Met at tech conference, became mentor', 'https://linkedin.com/in/mariagarcia', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'James', 'Wilson', 'james.wilson@salesforce.com', '+1 (415) 555-0102', 'Salesforce', 'Technical Recruiter', 'Technology', 'San Francisco, CA', 'Recruiter', 'Medium', 'Connected through LinkedIn', 'https://linkedin.com/in/jameswilson', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'Priya', 'Patel', 'priya.patel@oracle.com', '+1 (512) 555-0103', 'Oracle', 'Software Development Manager', 'Technology', 'Austin, TX', 'Industry Contact', 'Weak', 'Met at cloud computing conference', 'https://linkedin.com/in/priyapatel', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'Robert', 'Chen', 'robert.chen@adobe.com', '+1 (408) 555-0104', 'Adobe', 'Senior Software Engineer', 'Technology', 'San Jose, CA', 'College Classmate', 'Strong', 'University computer science program', 'https://linkedin.com/in/robertchen', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'Lisa', 'Anderson', 'lisa.anderson@nvidia.com', '+1 (408) 555-0105', 'Nvidia', 'Backend Engineer', 'Technology', 'Santa Clara, CA', 'Industry Contact', 'Medium', 'Met through mutual connections', 'https://linkedin.com/in/lisaanderson', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'David', 'Martinez', 'david.martinez@stripe.com', '+1 (415) 555-0106', 'Stripe', 'Principal Software Engineer', 'Technology', 'San Francisco, CA', 'Mentor', 'Very Strong', 'Former manager, stayed in touch', 'https://linkedin.com/in/davidmartinez', NOW(), NOW()),
        (gen_random_uuid(), v_user_id, 'Jennifer', 'Lee', 'jennifer.lee@startup.io', '+1 (510) 555-0107', 'StartupIO', 'CTO', 'Technology', 'Oakland, CA', 'Alumni', 'Medium', 'Same university, different years', 'https://linkedin.com/in/jenniferlee', NOW(), NOW());
    
    SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_contact_ids FROM professional_contacts WHERE user_id = v_user_id;
    
    -- Step 17: Create coffee chats
    INSERT INTO coffee_chats (
        id, user_id, contact_id, job_opportunity_id, contact_name, contact_email,
        contact_company, contact_title, chat_type, scheduled_date, completed_date,
        status, message_sent, message_sent_at, response_received, response_received_at,
        response_content, referral_provided, referral_details, notes, impact_on_opportunity,
        created_at, updated_at
    )
    SELECT 
        gen_random_uuid(), v_user_id, v_contact_ids[2], NULL, 'Maria Garcia', 'maria.garcia@uber.com',
        'Uber', 'Engineering Manager', 'coffee_chat', (v_now + INTERVAL '7 days'), NULL,
        'upcoming', true, (v_now - INTERVAL '2 days'), true, (v_now - INTERVAL '1 day'),
        'Would love to meet! Let''s schedule for next week.', false, NULL, NULL, NULL,
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, v_contact_ids[1], NULL, 'Alex Thompson', 'alex.thompson@linkedin.com',
        'LinkedIn', 'Senior Software Engineer', 'coffee_chat', (v_now - INTERVAL '5 days'), (v_now - INTERVAL '5 days'),
        'completed', true, (v_now - INTERVAL '10 days'), true, (v_now - INTERVAL '9 days'),
        NULL, true, 'Referred to Meta recruiter Sarah Johnson', 'Great conversation about distributed systems. Very helpful!', NULL,
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, v_contact_ids[5], NULL, 'Robert Chen', 'robert.chen@adobe.com',
        'Adobe', 'Senior Software Engineer', 'informational', (v_now + INTERVAL '14 days'), NULL,
        'upcoming', false, NULL, false, NULL,
        NULL, false, NULL, NULL, NULL,
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, v_contact_ids[3], v_job_opp_ids[1], 'James Wilson', 'james.wilson@meta.com',
        'Meta', 'Technical Recruiter', 'interview_request', (v_now - INTERVAL '30 days'), (v_now - INTERVAL '30 days'),
        'completed', true, (v_now - INTERVAL '35 days'), true, (v_now - INTERVAL '33 days'),
        NULL, false, NULL, 'Initial screening call went well. Moved to next round.', 'positive',
        NOW(), NOW();
    
    SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_coffee_chat_ids FROM coffee_chats WHERE user_id = v_user_id;
    
    -- Step 18: Create networking messages
    INSERT INTO networking_messages (
        id, user_id, coffee_chat_id, message_type, recipient_name, recipient_email,
        recipient_linkedin_url, subject, message_body, generated_by, sent, sent_at,
        response_received, response_received_at, created_at, updated_at
    )
    SELECT 
        gen_random_uuid(), v_user_id, v_coffee_chat_ids[1], 'coffee_chat', 'Maria Garcia', 'maria.garcia@google.com',
        'https://linkedin.com/in/mariagarcia', 'Coffee Chat Request - Software Engineering Discussion',
        'Hi Maria,

I hope this message finds you well! I''m reaching out because I''d love to have a coffee chat to learn more about your experience as an Engineering Manager at Uber and get some insights into the industry.

I''m currently exploring opportunities in software engineering and would really value your perspective. Would you be available for a virtual coffee chat next week?

Looking forward to connecting!

Best regards,
Sarah Chen',
        'manual', true, (v_now - INTERVAL '2 days'), true, (v_now - INTERVAL '1 day'), NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, v_coffee_chat_ids[4], 'interview_request', 'James Wilson', 'james.wilson@meta.com',
        'https://linkedin.com/in/jameswilson', 'Following up on Senior Software Engineer position at Meta',
        'Hi James,

Thank you for taking the time to speak with me last week about the Senior Software Engineer position at Meta. I''m very excited about the opportunity and wanted to follow up.

I''ve submitted my application and would love to continue the conversation about how my background in distributed systems and full-stack development aligns with the role.

Please let me know if you need any additional information from me.

Best regards,
Sarah Chen',
        'manual', true, (v_now - INTERVAL '35 days'), true, (v_now - INTERVAL '33 days'), NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, NULL, 'coffee_chat', 'Priya Patel', 'priya.patel@oracle.com',
        'https://linkedin.com/in/priyapatel', 'Networking - Cloud Computing Conference Connection',
        'Hi Priya,

It was great meeting you at the cloud computing conference last month! I wanted to reach out and connect.

I''m currently exploring software engineering opportunities and would love to learn more about your experience at Oracle. Would you be open to a brief coffee chat?

Best,
Sarah Chen',
        'manual', true, (v_now - INTERVAL '20 days'), false, NULL, NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, NULL, 'referral_request', 'David Martinez', 'david.martinez@stripe.com',
        'https://linkedin.com/in/davidmartinez', 'Referral Request - Stripe Opportunities',
        'Hi David,

I hope you''re doing well! I wanted to reach out because I saw a Senior Backend Engineer position at Stripe that really interests me.

Given our previous working relationship and your knowledge of my technical skills, I was wondering if you''d be comfortable providing a referral or introduction to the hiring manager.

I''d be happy to share my resume and discuss my qualifications further. Let me know if this is something you''d be open to!

Thank you for your consideration.

Best regards,
Sarah Chen',
        'manual', true, (v_now - INTERVAL '15 days'), true, (v_now - INTERVAL '12 days'), NOW(), NOW();
    
    -- Step 19: Create career goals
    INSERT INTO career_goals (
        id, user_id, goal_type, goal_category, goal_description, specific_metric,
        target_value, current_value, target_date, progress_percentage, status,
        created_at, updated_at
    )
    SELECT 
        gen_random_uuid(), v_user_id, 'Application', 'Job Search', 'Apply to 25+ software engineering positions', 'Number of applications',
        25, 16, (v_now + INTERVAL '90 days')::DATE, 64, 'active',
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Interview', 'Interview Performance', 'Complete 15 technical interviews with 70%+ pass rate', 'Interview pass rate',
        70, 65, (v_now + INTERVAL '120 days')::DATE, 93, 'active',
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Offer', 'Job Search', 'Receive 3+ job offers from top tech companies', 'Number of offers',
        3, 2, (v_now + INTERVAL '150 days')::DATE, 67, 'active',
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Salary', 'Compensation', 'Negotiate starting salary of $200K+', 'Starting salary (USD)',
        200000, 190000, (v_now + INTERVAL '180 days')::DATE, 95, 'active',
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Networking', 'Professional Growth', 'Connect with 50+ professionals in the tech industry', 'Number of connections',
        50, 18, (v_now + INTERVAL '90 days')::DATE, 36, 'active',
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Coffee Chat', 'Networking', 'Complete 10 informational interviews or coffee chats', 'Number of coffee chats',
        10, 3, (v_now + INTERVAL '60 days')::DATE, 30, 'active',
        NOW(), NOW()
    UNION ALL SELECT 
        gen_random_uuid(), v_user_id, 'Skill', 'Professional Development', 'Master system design concepts and pass design interviews', 'System design interview pass rate',
        80, 75, (v_now + INTERVAL '100 days')::DATE, 94, 'active',
        NOW(), NOW();
    
    RAISE NOTICE '✅ Test user data created successfully!';
    RAISE NOTICE 'Login: analytics.test@betabaddies.com';
    RAISE NOTICE 'Password: Test123!';
END $$;

-- Note: Writing practice sessions are not included in this SQL script as they require
-- generating many rows with varying dates and scores. You can add them separately if needed.

