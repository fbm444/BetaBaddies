-- ============================================================================
-- Populate writing_practice_prompts with curated prompts
-- ============================================================================
-- This script:
-- 1. Extracts unique interview questions from interview_question_banks (optional)
-- 2. Inserts curated prompts for each category (2-3 prompts per category)
-- 3. Updates categories for prompts that already exist with wrong categories
--
-- Categories included: behavioral, technical, situational, strengths, weaknesses,
--                      company_fit, leadership, teamwork, problem_solving
--
-- Usage:
--   psql -U postgres -d postgres -f db/sprint_3/db_data/populate_writing_practice_prompts.sql
-- ============================================================================

BEGIN;

-- Map categories from interview_question_banks to writing_practice_prompts categories
-- interview_question_banks categories: behavioral, technical, situational, culture, other, culture/other
-- writing_practice_prompts categories: behavioral, technical, situational, strengths, weaknesses, 
--                                     company_fit, leadership, teamwork, problem_solving, custom

-- Map difficulty levels: entry -> beginner, mid -> intermediate, senior -> advanced

INSERT INTO writing_practice_prompts (
    id,
    category,
    prompt_text,
    difficulty_level,
    estimated_time_minutes,
    tags,
    is_active,
    created_at,
    updated_at
)
SELECT DISTINCT ON (LOWER(TRIM(question_text)))
    gen_random_uuid() as id,
    CASE 
        WHEN LOWER(category) = 'behavioral' THEN 'behavioral'
        WHEN LOWER(category) = 'technical' THEN 'technical'
        WHEN LOWER(category) = 'situational' THEN 'situational'
        WHEN LOWER(category) = 'culture' OR LOWER(category) = 'culture/other' THEN 'company_fit'
        WHEN LOWER(category) = 'other' THEN 'custom'
        -- Default to behavioral if category doesn't match
        ELSE 'behavioral'
    END as category,
    TRIM(question_text) as prompt_text,
    CASE 
        WHEN LOWER(difficulty_level) = 'entry' THEN 'beginner'
        WHEN LOWER(difficulty_level) = 'mid' THEN 'intermediate'
        WHEN LOWER(difficulty_level) = 'senior' THEN 'advanced'
        -- Default to intermediate if difficulty doesn't match
        ELSE 'intermediate'
    END as difficulty_level,
    CASE 
        WHEN LOWER(difficulty_level) = 'entry' THEN 3
        WHEN LOWER(difficulty_level) = 'mid' THEN 5
        WHEN LOWER(difficulty_level) = 'senior' THEN 7
        ELSE 5
    END as estimated_time_minutes,
    CASE 
        WHEN industry_specific = true THEN 
            jsonb_build_array('industry-specific', COALESCE(category, 'general'))
        ELSE 
            jsonb_build_array(COALESCE(category, 'general'))
    END as tags,
    true as is_active,
    COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM interview_question_banks
WHERE question_text IS NOT NULL 
  AND TRIM(question_text) != ''
  AND NOT EXISTS (
      -- Avoid duplicates: check if a prompt with the same text already exists
      SELECT 1 
      FROM writing_practice_prompts wpp 
      WHERE LOWER(TRIM(wpp.prompt_text)) = LOWER(TRIM(interview_question_banks.question_text))
  )
ORDER BY LOWER(TRIM(question_text)), created_at DESC;

-- Add curated prompts for each category (2-3 prompts per category)
-- This inserts prompts that don't already exist
INSERT INTO writing_practice_prompts (
    category,
    prompt_text,
    difficulty_level,
    estimated_time_minutes,
    tags,
    is_active,
    created_at,
    updated_at
)
SELECT 
    category,
    prompt,
    difficulty,
    time_minutes,
    tags,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (VALUES
    -- Behavioral prompts (2-3)
    ('behavioral', 'Tell me about yourself.', 'beginner', 3, jsonb_build_array('introduction', 'self-introduction')),
    ('behavioral', 'Tell me about a time when you had to work with a difficult team member. How did you handle it?', 'intermediate', 5, jsonb_build_array('teamwork', 'conflict-resolution')),
    ('behavioral', 'Give me an example of a time when you had to learn something new quickly.', 'intermediate', 5, jsonb_build_array('learning', 'adaptability')),
    
    -- Technical prompts (2-3)
    ('technical', 'Explain a complex technical concept to someone without a technical background.', 'intermediate', 5, jsonb_build_array('communication', 'technical-skills')),
    ('technical', 'Describe a technical challenge you faced and how you solved it.', 'intermediate', 5, jsonb_build_array('problem-solving', 'technical-skills')),
    ('technical', 'Walk me through your approach to debugging a difficult technical issue.', 'advanced', 7, jsonb_build_array('debugging', 'methodology')),
    
    -- Situational prompts (2-3)
    ('situational', 'How would you handle a situation where you disagree with your manager''s decision?', 'intermediate', 5, jsonb_build_array('conflict', 'professionalism')),
    ('situational', 'What would you do if you discovered a critical bug in production right before a major launch?', 'advanced', 7, jsonb_build_array('crisis-management', 'prioritization')),
    ('situational', 'How would you approach starting a new project with limited requirements or unclear direction?', 'intermediate', 5, jsonb_build_array('initiative', 'adaptability')),
    
    -- Strengths (2-3)
    ('strengths', 'What is your greatest professional achievement?', 'intermediate', 5, jsonb_build_array('achievements', 'strengths')),
    ('strengths', 'What skills do you bring to the table that set you apart from other candidates?', 'intermediate', 5, jsonb_build_array('differentiation', 'strengths')),
    ('strengths', 'Describe a time when your technical skills directly contributed to a project''s success.', 'advanced', 7, jsonb_build_array('impact', 'technical-strengths')),
    
    -- Weaknesses (2-3)
    ('weaknesses', 'What is your greatest weakness and how are you working to improve it?', 'intermediate', 5, jsonb_build_array('weaknesses', 'self-improvement')),
    ('weaknesses', 'Tell me about a skill you''re currently developing and why it matters to you.', 'beginner', 3, jsonb_build_array('growth', 'self-awareness')),
    ('weaknesses', 'Describe a time when you had to ask for help. How did you approach it?', 'intermediate', 5, jsonb_build_array('humility', 'collaboration')),
    
    -- Company fit (2-3)
    ('company_fit', 'Why do you want to work for our company specifically?', 'intermediate', 5, jsonb_build_array('company-research', 'fit')),
    ('company_fit', 'What do you know about our company culture?', 'intermediate', 5, jsonb_build_array('culture', 'research')),
    ('company_fit', 'How do your values align with our company''s mission and values?', 'intermediate', 5, jsonb_build_array('values', 'alignment')),
    
    -- Leadership (2-3)
    ('leadership', 'Describe a time when you had to lead a team through a significant change or challenge.', 'advanced', 7, jsonb_build_array('leadership', 'change-management')),
    ('leadership', 'Tell me about a time when you had to make a difficult decision without all the information you needed.', 'advanced', 7, jsonb_build_array('decision-making', 'leadership')),
    ('leadership', 'How do you motivate team members who seem disengaged or unmotivated?', 'intermediate', 5, jsonb_build_array('motivation', 'team-management')),
    
    -- Teamwork (2-3)
    ('teamwork', 'Describe a situation where you had to collaborate with multiple stakeholders with conflicting priorities.', 'advanced', 7, jsonb_build_array('collaboration', 'stakeholder-management')),
    ('teamwork', 'Tell me about a time when you successfully resolved a conflict within your team.', 'intermediate', 5, jsonb_build_array('conflict-resolution', 'teamwork')),
    ('teamwork', 'How do you handle disagreements with colleagues while maintaining a positive working relationship?', 'intermediate', 5, jsonb_build_array('communication', 'relationship-building')),
    
    -- Problem solving (2-3)
    ('problem_solving', 'Tell me about the most complex problem you''ve ever solved. Walk me through your thought process.', 'advanced', 7, jsonb_build_array('problem-solving', 'complexity')),
    ('problem_solving', 'Describe a situation where you had to think outside the box to find a solution.', 'intermediate', 5, jsonb_build_array('creativity', 'innovation')),
    ('problem_solving', 'How do you approach a problem when you don''t know where to start?', 'beginner', 3, jsonb_build_array('methodology', 'problem-solving'))
) AS additional_prompts(category, prompt, difficulty, time_minutes, tags)
WHERE NOT EXISTS (
    SELECT 1 
    FROM writing_practice_prompts wpp 
    WHERE LOWER(TRIM(wpp.prompt_text)) = LOWER(TRIM(additional_prompts.prompt))
);

-- Update category for prompts that already exist but may have wrong category
-- This ensures prompts from interview_question_banks get correct categories
UPDATE writing_practice_prompts wpp
SET 
    category = mapping.correct_category,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT 
        LOWER(TRIM(prompt)) as prompt_text,
        category as correct_category
    FROM (VALUES
        ('behavioral', 'Tell me about yourself.'),
        ('behavioral', 'Tell me about a time when you had to work with a difficult team member. How did you handle it?'),
        ('behavioral', 'Give me an example of a time when you had to learn something new quickly.'),
        ('technical', 'Explain a complex technical concept to someone without a technical background.'),
        ('technical', 'Describe a technical challenge you faced and how you solved it.'),
        ('technical', 'Walk me through your approach to debugging a difficult technical issue.'),
        ('situational', 'How would you handle a situation where you disagree with your manager''s decision?'),
        ('situational', 'What would you do if you discovered a critical bug in production right before a major launch?'),
        ('situational', 'How would you approach starting a new project with limited requirements or unclear direction?'),
        ('strengths', 'What is your greatest professional achievement?'),
        ('strengths', 'What skills do you bring to the table that set you apart from other candidates?'),
        ('strengths', 'Describe a time when your technical skills directly contributed to a project''s success.'),
        ('weaknesses', 'What is your greatest weakness and how are you working to improve it?'),
        ('weaknesses', 'Tell me about a skill you''re currently developing and why it matters to you.'),
        ('weaknesses', 'Describe a time when you had to ask for help. How did you approach it?'),
        ('company_fit', 'Why do you want to work for our company specifically?'),
        ('company_fit', 'What do you know about our company culture?'),
        ('company_fit', 'How do your values align with our company''s mission and values?'),
        ('leadership', 'Describe a time when you had to lead a team through a significant change or challenge.'),
        ('leadership', 'Tell me about a time when you had to make a difficult decision without all the information you needed.'),
        ('leadership', 'How do you motivate team members who seem disengaged or unmotivated?'),
        ('teamwork', 'Describe a situation where you had to collaborate with multiple stakeholders with conflicting priorities.'),
        ('teamwork', 'Tell me about a time when you successfully resolved a conflict within your team.'),
        ('teamwork', 'How do you handle disagreements with colleagues while maintaining a positive working relationship?'),
        ('problem_solving', 'Tell me about the most complex problem you''ve ever solved. Walk me through your thought process.'),
        ('problem_solving', 'Describe a situation where you had to think outside the box to find a solution.'),
        ('problem_solving', 'How do you approach a problem when you don''t know where to start?')
    ) AS prompts(category, prompt)
) AS mapping
WHERE LOWER(TRIM(wpp.prompt_text)) = mapping.prompt_text
  AND wpp.category != mapping.correct_category
  AND wpp.is_active = true;

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================
-- This script will:
-- 1. Extract unique questions from interview_question_banks (if table exists)
--    - Maps categories appropriately (culture -> company_fit, etc.)
--    - Maps difficulty levels (entry -> beginner, mid -> intermediate, senior -> advanced)
--    - Sets estimated time based on difficulty (3 min for beginner, 5 for intermediate, 7 for advanced)
-- 2. Insert curated prompts for each category (2-3 prompts per category)
--    - Skips prompts that already exist (checks by prompt text)
-- 3. Update categories for existing prompts that have wrong categories
--    - Ensures prompts from interview_question_banks get correct categories
-- 4. Avoids duplicates by checking existing prompts
-- ============================================================================

