-- ============================================================================
-- Seed Data: Premade Support Groups (UC-112)
-- Description: Creates initial support groups with AI-generated content
-- ============================================================================
-- 
-- This script is idempotent and can be run multiple times safely.
-- It will skip groups that already exist based on name.
--
-- Requirements:
--   - PostgreSQL 14+ with pgcrypto extension installed
--   - support_groups table must exist
--   - If extensions can't be created, they should be pre-installed by a superuser
--
-- Usage:
--   psql -U your_user -d ats_tracker -f db/migrations/seed_support_groups.sql
-- ============================================================================

-- Try to create extensions (will fail silently if user doesn't have permission)
-- Extensions should ideally be created by a superuser before running this script
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN
    -- Extension might already exist or user doesn't have permission
    -- This is okay - we'll use gen_random_uuid() from pgcrypto instead
    NULL;
END $$;

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN
    -- Extension might already exist or user doesn't have permission
    -- If this fails, gen_random_uuid() won't work - but that's a setup issue
    NULL;
END $$;

-- Ensure unique constraint exists on name column for ON CONFLICT to work
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'support_groups' 
        AND constraint_name = 'support_groups_name_unique'
    ) THEN
        ALTER TABLE public.support_groups 
        ADD CONSTRAINT support_groups_name_unique UNIQUE (name);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Constraint might already exist or user doesn't have permission
    -- We'll use WHERE NOT EXISTS as fallback
    NULL;
END $$;

-- Insert premade support groups
-- Use WHERE NOT EXISTS to skip duplicates (works with or without unique constraint)
INSERT INTO public.support_groups (
    id, name, description, category, industry, role_type, is_public, is_active, member_count, post_count, created_at, updated_at
)
SELECT 
    gen_random_uuid() as id,
    name,
    description,
    category,
    industry,
    role_type,
    is_public,
    is_active,
    member_count,
    post_count,
    now() as created_at,
    now() as updated_at
FROM (VALUES
    -- Software Engineering Groups
    (
        'Software Engineering Support',
        'A community for software engineers at all levels. Share coding challenges, career advice, interview tips, and support each other through your job search journey. Whether you''re a new grad or a senior engineer, find your tribe here.',
        'industry',
        'Software Engineering',
        NULL::varchar,
        true,
        true,
        0,
        0
    ),
    (
        'New Grad Software Engineers',
        'Specifically for new graduates entering the software engineering field. Get advice on first job applications, salary negotiations, choosing between offers, and navigating your early career. Connect with peers who understand the transition from student to professional.',
        'role',
        'Software Engineering',
        'New Grad',
        true,
        true,
        0,
        0
    ),
    -- Cybersecurity Groups
    (
        'Cybersecurity Professionals',
        'Join fellow cybersecurity professionals to discuss industry trends, share security best practices, exchange job opportunities, and support each other in advancing your security career. From SOC analysts to security architects, all are welcome.',
        'industry',
        'Cybersecurity',
        NULL::varchar,
        true,
        true,
        0,
        0
    ),
    -- Data Science Groups
    (
        'Data Science & Analytics',
        'A vibrant community for data scientists, ML engineers, and analysts. Share projects, discuss algorithms, exchange interview experiences, and help each other land roles in data science, machine learning, and analytics.',
        'industry',
        'Data Science',
        NULL::varchar,
        true,
        true,
        0,
        0
    ),
    -- Career Changers
    (
        'Career Changers Support',
        'Making a career transition? You''re not alone. Connect with others who are pivoting into tech, sharing strategies for learning new skills, building portfolios, networking, and successfully making the switch. Get encouragement and practical advice.',
        'demographic',
        NULL::varchar,
        'Career Changer',
        true,
        true,
        0,
        0
    ),
    -- Interview Prep
    (
        'Interview Preparation & Practice',
        'Master your interview skills with this supportive community. Share mock interview experiences, practice coding problems together, exchange behavioral interview strategies, and celebrate wins. We''re all in this together!',
        'interest',
        NULL::varchar,
        NULL::varchar,
        true,
        true,
        0,
        0
    ),
    -- Salary Negotiation
    (
        'Salary Negotiation & Compensation',
        'Learn to negotiate with confidence. Share salary data, discuss negotiation strategies, celebrate successful negotiations, and help each other get paid what you''re worth. Knowledge is power in salary discussions.',
        'interest',
        NULL::varchar,
        NULL::varchar,
        true,
        true,
        0,
        0
    ),
    -- Remote Work
    (
        'Remote Work & Distributed Teams',
        'Navigating remote work opportunities? Share experiences with remote interviews, discuss work-life balance, exchange tips for staying productive, and connect with companies offering remote positions.',
        'interest',
        NULL::varchar,
        NULL::varchar,
        true,
        true,
        0,
        0
    )
) AS v(name, description, category, industry, role_type, is_public, is_active, member_count, post_count)
WHERE NOT EXISTS (
    SELECT 1 FROM public.support_groups sg 
    WHERE sg.name = v.name
);

-- Note: Resources, challenges, and initial posts can be added via the application
-- or through additional seed scripts that use the AI content generation feature
