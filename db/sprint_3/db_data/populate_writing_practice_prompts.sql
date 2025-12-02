-- ============================================================================
-- Populate writing_practice_prompts from interview_question_banks
-- ============================================================================
-- This script extracts unique interview questions from the interview_question_banks
-- table and populates the writing_practice_prompts table with appropriate
-- category and difficulty mappings.
--
-- Usage:
--   psql -U ats_user -d ats_tracker -f db/migrations/populate_writing_practice_prompts.sql
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

-- Add some common behavioral interview prompts that might not be in the question bank
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
SELECT 
    gen_random_uuid(),
    'behavioral',
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

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================
-- This script will:
-- 1. Extract unique questions from interview_question_banks
-- 2. Map categories appropriately (culture -> company_fit, etc.)
-- 3. Map difficulty levels (entry -> beginner, mid -> intermediate, senior -> advanced)
-- 4. Set estimated time based on difficulty (3 min for beginner, 5 for intermediate, 7 for advanced)
-- 5. Add industry-specific tags when applicable
-- 6. Add common behavioral interview prompts that might be missing
-- 7. Avoid duplicates by checking existing prompts
-- ============================================================================

