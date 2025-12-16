-- Migration: Insert Default Follow-Up Email Templates
-- Description: Adds system email templates for follow-up reminders

-- Template Variables Documentation:
-- {jobTitle} - Job title
-- {companyName} - Company name
-- {recruiterName} - Recruiter name (if available)
-- {applicationDate} - Date application was submitted
-- {interviewDate} - Date of interview (if applicable)
-- {daysSince} - Days since the event
-- {userName} - User's name
-- {userEmail} - User's email

-- 1. Post-Application Follow-Up (7 days after application)
INSERT INTO email_templates (template_type, template_name, subject_template, body_template, variables, is_system_template)
VALUES (
  'follow_up_application',
  'Post-Application Follow-Up',
  'Following up on {jobTitle} application at {companyName}',
  'Hi {recruiterName},

I wanted to follow up on my application for the {jobTitle} position that I submitted on {applicationDate}. It''s been {daysSince} days since I applied, and I wanted to express my continued interest in this opportunity.

I''m very interested in this role and would love to discuss how my experience aligns with your team''s needs. I''m happy to provide any additional information or answer any questions you might have.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
{userName}',
  '{"jobTitle", "companyName", "recruiterName", "applicationDate", "daysSince", "userName", "userEmail"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- 2. Pre-Interview Reminder (1 day before interview)
INSERT INTO email_templates (template_type, template_name, subject_template, body_template, variables, is_system_template)
VALUES (
  'follow_up_interview',
  'Pre-Interview Confirmation',
  'Confirming interview for {jobTitle} at {companyName}',
  'Hi {recruiterName},

I''m looking forward to our interview tomorrow for the {jobTitle} position at {companyName}. I wanted to confirm the details and let you know I''m excited to discuss this opportunity.

Please let me know if there''s anything specific you''d like me to prepare or bring to the interview.

Thank you, and I''ll see you tomorrow!

Best regards,
{userName}',
  '{"jobTitle", "companyName", "recruiterName", "interviewDate", "userName", "userEmail"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- 3. Post-Interview Follow-Up (3 days after interview)
INSERT INTO email_templates (template_type, template_name, subject_template, body_template, variables, is_system_template)
VALUES (
  'follow_up_post_interview',
  'Post-Interview Thank You',
  'Thank you - {jobTitle} Interview',
  'Hi {recruiterName},

Thank you for taking the time to speak with me about the {jobTitle} position on {interviewDate}. I enjoyed our conversation and learning more about the role and {companyName}.

I''m very excited about the opportunity to contribute to your team and believe my experience would be a great fit. Please let me know if you need any additional information.

I look forward to hearing from you.

Best regards,
{userName}',
  '{"jobTitle", "companyName", "recruiterName", "interviewDate", "daysSince", "userName", "userEmail"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- 4. Offer Response Follow-Up (2 days after offer)
INSERT INTO email_templates (template_type, template_name, subject_template, body_template, variables, is_system_template)
VALUES (
  'follow_up_offer_response',
  'Offer Response Follow-Up',
  'Following up on {jobTitle} offer from {companyName}',
  'Hi {recruiterName},

Thank you again for extending the offer for the {jobTitle} position at {companyName}. I''m very excited about this opportunity.

I wanted to follow up regarding the offer details. I''m currently reviewing the compensation package and benefits, and I''d like to discuss a few questions I have before making my decision.

Would it be possible to schedule a brief call this week to discuss? I''m available [your availability].

Thank you for your patience, and I look forward to speaking with you soon.

Best regards,
{userName}',
  '{"jobTitle", "companyName", "recruiterName", "userName", "userEmail"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- 5. Generic Follow-Up (for custom reminders)
INSERT INTO email_templates (template_type, template_name, subject_template, body_template, variables, is_system_template)
VALUES (
  'follow_up_custom',
  'Generic Follow-Up',
  'Following up on {jobTitle} at {companyName}',
  'Hi {recruiterName},

I wanted to follow up regarding the {jobTitle} position at {companyName}. I remain very interested in this opportunity and would love to discuss next steps.

Please let me know if there''s any additional information I can provide or if you have any questions.

Thank you for your time and consideration.

Best regards,
{userName}',
  '{"jobTitle", "companyName", "recruiterName", "userName", "userEmail"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;

