-- Seed Data: Sample Follow-Up Reminders
-- Description: Inserts sample follow-up reminders for testing
-- Usage: Run this after creating the follow_up_reminders tables
-- Note: This will create reminders for the first user and their job opportunities

-- First, let's get a user and their job opportunities
DO $$
DECLARE
  test_user_id UUID;
  job_opp_1 UUID;
  job_opp_2 UUID;
  job_opp_3 UUID;
  job_opp_4 UUID;
  event_date_1 TIMESTAMP;
  event_date_2 TIMESTAMP;
  event_date_3 TIMESTAMP;
  event_date_4 TIMESTAMP;
BEGIN
  -- Get the first user (or you can replace this with a specific user email)
  SELECT u_id INTO test_user_id FROM users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in database. Please create a user first.';
  END IF;

  -- Get some job opportunities for this user (or create sample ones)
  SELECT id INTO job_opp_1 FROM job_opportunities WHERE user_id = test_user_id LIMIT 1;
  SELECT id INTO job_opp_2 FROM job_opportunities WHERE user_id = test_user_id OFFSET 1 LIMIT 1;
  SELECT id INTO job_opp_3 FROM job_opportunities WHERE user_id = test_user_id OFFSET 2 LIMIT 1;
  SELECT id INTO job_opp_4 FROM job_opportunities WHERE user_id = test_user_id OFFSET 3 LIMIT 1;

  -- Set event dates (various times in the past)
  event_date_1 := CURRENT_TIMESTAMP - INTERVAL '8 days';  -- Applied 8 days ago
  event_date_2 := CURRENT_TIMESTAMP - INTERVAL '2 days';  -- Interview 2 days ago
  event_date_3 := CURRENT_TIMESTAMP - INTERVAL '5 days';  -- Interview completed 5 days ago
  event_date_4 := CURRENT_TIMESTAMP - INTERVAL '1 day';   -- Offer received 1 day ago

  -- Only insert if we have at least one job opportunity
  IF job_opp_1 IS NOT NULL THEN
    -- 1. Pending reminder for "Applied" status (due in 1 day, overdue by 1 day)
    INSERT INTO follow_up_reminders (
      id, user_id, job_opportunity_id,
      reminder_type, application_stage,
      scheduled_date, due_date, event_date, days_after_event,
      generated_email_subject, generated_email_body,
      status, is_active,
      reminder_frequency_days, company_responsiveness_score,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      test_user_id,
      job_opp_1,
      'application',
      'Applied',
      event_date_1,
      event_date_1 + INTERVAL '7 days',  -- Due 7 days after application
      event_date_1,
      7,
      'Follow-up: Software Engineer Position at Tech Corp',
      'Dear Hiring Manager,

I hope this message finds you well. I wanted to follow up on my application for the Software Engineer position that I submitted on ' || TO_CHAR(event_date_1, 'Month DD, YYYY') || '.

I remain very interested in this opportunity and would be grateful for any updates on the status of my application. I am confident that my skills and experience align well with the requirements of this role.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
[Your Name]',
      'pending',
      true,
      7,
      0.5,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    -- 2. Snoozed reminder for "Interview Scheduled" (snoozed until tomorrow)
    IF job_opp_2 IS NOT NULL THEN
      INSERT INTO follow_up_reminders (
        id, user_id, job_opportunity_id,
        reminder_type, application_stage,
        scheduled_date, due_date, event_date, days_after_event,
        generated_email_subject, generated_email_body,
        status, is_active,
        snoozed_until,
        reminder_frequency_days, company_responsiveness_score,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        test_user_id,
        job_opp_2,
        'interview',
        'Interview Scheduled',
        event_date_2,
        event_date_2 - INTERVAL '1 day',  -- Due 1 day before interview
        event_date_2,
        1,
        'Interview Confirmation: Product Manager Role at StartupXYZ',
        'Dear [Hiring Manager Name],

I am writing to confirm the details for our upcoming interview scheduled for ' || TO_CHAR(event_date_2, 'Month DD, YYYY') || '.

I am very excited about the opportunity to discuss the Product Manager position and learn more about the team and company culture. Please let me know if there is anything specific I should prepare or bring to the interview.

I look forward to speaking with you soon.

Best regards,
[Your Name]',
        'snoozed',
        true,
        CURRENT_TIMESTAMP + INTERVAL '1 day',  -- Snoozed until tomorrow
        1,
        0.7,  -- High responsiveness score
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    END IF;

    -- 3. Pending reminder for "Interview Completed" (due today)
    IF job_opp_3 IS NOT NULL THEN
      INSERT INTO follow_up_reminders (
        id, user_id, job_opportunity_id,
        reminder_type, application_stage,
        scheduled_date, due_date, event_date, days_after_event,
        generated_email_subject, generated_email_body,
        status, is_active,
        reminder_frequency_days, company_responsiveness_score,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        test_user_id,
        job_opp_3,
        'post_interview',
        'Interview Completed',
        event_date_3,
        event_date_3 + INTERVAL '3 days',  -- Due 3 days after interview
        event_date_3,
        3,
        'Thank You: Data Scientist Interview at Analytics Inc',
        'Dear [Interviewer Name],

Thank you for taking the time to speak with me on ' || TO_CHAR(event_date_3, 'Month DD, YYYY') || ' about the Data Scientist position. I truly enjoyed our conversation and learning more about the role and your team''s exciting projects.

I was particularly interested in [specific topic discussed], and I am even more enthusiastic about the opportunity to contribute to your team''s success.

I remain very interested in this position and would welcome the opportunity to continue the conversation. Please let me know if you need any additional information.

Thank you again for your time and consideration.

Best regards,
[Your Name]',
        'pending',
        true,
        3,
        0.6,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    END IF;

    -- 4. Completed reminder for "Offer" (already completed)
    IF job_opp_4 IS NOT NULL THEN
      INSERT INTO follow_up_reminders (
        id, user_id, job_opportunity_id,
        reminder_type, application_stage,
        scheduled_date, due_date, event_date, days_after_event,
        generated_email_subject, generated_email_body,
        status, is_active,
        completed_at, response_type,
        reminder_frequency_days, company_responsiveness_score,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        test_user_id,
        job_opp_4,
        'offer_response',
        'Offer',
        event_date_4,
        event_date_4 + INTERVAL '2 days',  -- Due 2 days after offer
        event_date_4,
        2,
        'Response: Senior Developer Offer at BigTech Co',
        'Dear [Hiring Manager Name],

Thank you for extending the offer for the Senior Developer position. I am thrilled about this opportunity and grateful for your confidence in my abilities.

I would like to take some time to carefully consider this offer and would appreciate the opportunity to discuss a few details before making my final decision. Would it be possible to schedule a brief call this week?

Thank you again for this wonderful opportunity. I look forward to speaking with you soon.

Best regards,
[Your Name]',
        'completed',
        true,
        CURRENT_TIMESTAMP - INTERVAL '6 hours',  -- Completed 6 hours ago
        'positive',
        2,
        0.8,  -- Very high responsiveness
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '6 hours'
      );
    END IF;

    -- 5. Another pending reminder (overdue) for "Applied" status
    INSERT INTO follow_up_reminders (
      id, user_id, job_opportunity_id,
      reminder_type, application_stage,
      scheduled_date, due_date, event_date, days_after_event,
      generated_email_subject, generated_email_body,
      status, is_active,
      reminder_frequency_days, company_responsiveness_score,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      test_user_id,
      job_opp_1,  -- Same as first one
      'application',
      'Applied',
      CURRENT_TIMESTAMP - INTERVAL '15 days',  -- Applied 15 days ago
      CURRENT_TIMESTAMP - INTERVAL '8 days',  -- Was due 8 days ago (OVERDUE)
      CURRENT_TIMESTAMP - INTERVAL '15 days',
      7,
      'Follow-up: Frontend Developer Position at Design Studio',
      'Dear Hiring Manager,

I wanted to follow up on my application for the Frontend Developer position that I submitted on ' || TO_CHAR(CURRENT_TIMESTAMP - INTERVAL '15 days', 'Month DD, YYYY') || '.

I understand that you likely receive many applications, but I wanted to express my continued interest in this opportunity. I believe my experience with React, TypeScript, and modern frontend development practices would be a great fit for your team.

I would be happy to provide any additional information or answer any questions you might have.

Thank you for your consideration.

Best regards,
[Your Name]',
      'pending',
      true,
      7,
      0.3,  -- Low responsiveness (might need to wait longer)
      CURRENT_TIMESTAMP - INTERVAL '10 days',
      CURRENT_TIMESTAMP - INTERVAL '10 days'
    );

    RAISE NOTICE '✅ Successfully inserted sample follow-up reminders for user %', test_user_id;
    RAISE NOTICE '   - 1 pending reminder (overdue)';
    RAISE NOTICE '   - 1 pending reminder (due today)';
    IF job_opp_2 IS NOT NULL THEN
      RAISE NOTICE '   - 1 snoozed reminder';
    END IF;
    IF job_opp_3 IS NOT NULL THEN
      RAISE NOTICE '   - 1 pending reminder (interview follow-up)';
    END IF;
    IF job_opp_4 IS NOT NULL THEN
      RAISE NOTICE '   - 1 completed reminder';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  No job opportunities found for user %. Please create some job opportunities first.', test_user_id;
    RAISE NOTICE '   You can still test the reminders feature by:';
    RAISE NOTICE '   1. Creating job opportunities in the app';
    RAISE NOTICE '   2. Updating their status (which will auto-create reminders)';
  END IF;

END $$;

-- Verify the inserted reminders
SELECT 
  r.id,
  r.application_stage,
  r.status,
  r.due_date,
  CASE 
    WHEN r.due_date < CURRENT_TIMESTAMP AND r.status = 'pending' THEN 'OVERDUE'
    WHEN r.due_date::date = CURRENT_DATE AND r.status = 'pending' THEN 'DUE TODAY'
    ELSE 'UPCOMING'
  END as urgency,
  jo.title as job_title,
  jo.company as company_name,
  r.created_at
FROM follow_up_reminders r
JOIN job_opportunities jo ON r.job_opportunity_id = jo.id
ORDER BY r.due_date ASC;

