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
    category,
    prompt,
    difficulty,
    time_minutes,
    tags,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (VALUES
    -- Beginner behavioral prompts
    ('behavioral', 'Tell me about yourself.', 'beginner', 3, jsonb_build_array('introduction', 'self-introduction')),
    ('behavioral', 'Why are you interested in this position?', 'beginner', 3, jsonb_build_array('motivation', 'interest')),
    ('behavioral', 'What are your strengths?', 'beginner', 3, jsonb_build_array('strengths', 'self-assessment')),
    ('behavioral', 'Where do you see yourself in 5 years?', 'beginner', 3, jsonb_build_array('career-goals', 'future')),
    
    -- Intermediate behavioral prompts
    ('behavioral', 'Tell me about a time when you had to work with a difficult team member. How did you handle it?', 'intermediate', 5, jsonb_build_array('teamwork', 'conflict-resolution')),
    ('behavioral', 'Describe a situation where you had to meet a tight deadline. What was your approach?', 'intermediate', 5, jsonb_build_array('time-management', 'pressure')),
    ('behavioral', 'Give me an example of a time when you had to learn something new quickly.', 'intermediate', 5, jsonb_build_array('learning', 'adaptability')),
    ('behavioral', 'Tell me about a time when you made a mistake. How did you handle it?', 'intermediate', 5, jsonb_build_array('mistakes', 'accountability')),
    
    -- Advanced behavioral prompts
    ('leadership', 'Describe a time when you had to lead a team through a significant change or challenge.', 'advanced', 7, jsonb_build_array('leadership', 'change-management')),
    ('problem_solving', 'Tell me about the most complex problem you''ve ever solved. Walk me through your thought process.', 'advanced', 7, jsonb_build_array('problem-solving', 'complexity')),
    ('teamwork', 'Describe a situation where you had to collaborate with multiple stakeholders with conflicting priorities.', 'advanced', 7, jsonb_build_array('collaboration', 'stakeholder-management')),
    
    -- Strengths and weaknesses
    ('strengths', 'What is your greatest professional achievement?', 'intermediate', 5, jsonb_build_array('achievements', 'strengths')),
    ('weaknesses', 'What is your greatest weakness and how are you working to improve it?', 'intermediate', 5, jsonb_build_array('weaknesses', 'self-improvement')),
    
    -- Company fit
    ('company_fit', 'Why do you want to work for our company specifically?', 'intermediate', 5, jsonb_build_array('company-research', 'fit')),
    ('company_fit', 'What do you know about our company culture?', 'intermediate', 5, jsonb_build_array('culture', 'research'))
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
