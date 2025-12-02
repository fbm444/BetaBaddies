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

-- Verify table exists and has required columns
DO $$
DECLARE
    table_exists boolean;
    name_col_exists boolean;
    group_name_col_exists boolean;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'support_groups'
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE EXCEPTION 'Table support_groups does not exist. Please run the database schema migrations first.';
    END IF;

    -- Check if name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'support_groups' 
        AND column_name = 'name'
    ) INTO name_col_exists;

    -- Check if group_name column exists (alternative column name)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'support_groups' 
        AND column_name = 'group_name'
    ) INTO group_name_col_exists;

    IF NOT name_col_exists AND NOT group_name_col_exists THEN
        RAISE EXCEPTION 'Neither "name" nor "group_name" column exists in support_groups table. Please check your database schema. Available columns: %', 
            (SELECT string_agg(column_name, ', ') FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_groups');
    END IF;
END $$;

-- Insert premade support groups
-- Dynamically determine which column name to use (name or group_name)
DO $$
DECLARE
    use_group_name boolean;
    name_column text;
BEGIN
    -- Check which column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'support_groups' 
        AND column_name = 'group_name'
    ) INTO use_group_name;

    -- Set the column name to use
    IF use_group_name THEN
        name_column := 'group_name';
    ELSE
        name_column := 'name';
    END IF;

    -- Build and execute the INSERT statement dynamically
    EXECUTE format('
        INSERT INTO public.support_groups (
            id, %I, description, category, industry, role_type, is_public, is_active, member_count, post_count, created_at, updated_at
        )
        SELECT 
            gen_random_uuid() as id,
            name_val,
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
            (
                ''Software Engineering Support'',
                ''A community for software engineers at all levels. Share coding challenges, career advice, interview tips, and support each other through your job search journey. Whether you''''re a new grad or a senior engineer, find your tribe here.'',
                ''industry'',
                ''Software Engineering'',
                NULL::varchar,
                true,
                true,
                0,
                0
            ),
            (
                ''New Grad Software Engineers'',
                ''Specifically for new graduates entering the software engineering field. Get advice on first job applications, salary negotiations, choosing between offers, and navigating your early career. Connect with peers who understand the transition from student to professional.'',
                ''role'',
                ''Software Engineering'',
                ''New Grad'',
                true,
                true,
                0,
                0
            ),
            (
                ''Cybersecurity Professionals'',
                ''Join fellow cybersecurity professionals to discuss industry trends, share security best practices, exchange job opportunities, and support each other in advancing your security career. From SOC analysts to security architects, all are welcome.'',
                ''industry'',
                ''Cybersecurity'',
                NULL::varchar,
                true,
                true,
                0,
                0
            ),
            (
                ''Data Science & Analytics'',
                ''A vibrant community for data scientists, ML engineers, and analysts. Share projects, discuss algorithms, exchange interview experiences, and help each other land roles in data science, machine learning, and analytics.'',
                ''industry'',
                ''Data Science'',
                NULL::varchar,
                true,
                true,
                0,
                0
            ),
            (
                ''Career Changers Support'',
                ''Making a career transition? You''''re not alone. Connect with others who are pivoting into tech, sharing strategies for learning new skills, building portfolios, networking, and successfully making the switch. Get encouragement and practical advice.'',
                ''demographic'',
                NULL::varchar,
                ''Career Changer'',
                true,
                true,
                0,
                0
            ),
            (
                ''Interview Preparation & Practice'',
                ''Master your interview skills with this supportive community. Share mock interview experiences, practice coding problems together, exchange behavioral interview strategies, and celebrate wins. We''''re all in this together!'',
                ''interest'',
                NULL::varchar,
                NULL::varchar,
                true,
                true,
                0,
                0
            ),
            (
                ''Salary Negotiation & Compensation'',
                ''Learn to negotiate with confidence. Share salary data, discuss negotiation strategies, celebrate successful negotiations, and help each other get paid what you''''re worth. Knowledge is power in salary discussions.'',
                ''interest'',
                NULL::varchar,
                NULL::varchar,
                true,
                true,
                0,
                0
            ),
            (
                ''Remote Work & Distributed Teams'',
                ''Navigating remote work opportunities? Share experiences with remote interviews, discuss work-life balance, exchange tips for staying productive, and connect with companies offering remote positions.'',
                ''interest'',
                NULL::varchar,
                NULL::varchar,
                true,
                true,
                0,
                0
            )
        ) AS v(name_val, description, category, industry, role_type, is_public, is_active, member_count, post_count)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.support_groups sg 
            WHERE sg.%I = v.name_val
        )',
        name_column, name_column
    );
END $$;

-- Note: Resources, challenges, and initial posts can be added via the application
-- or through additional seed scripts that use the AI content generation feature
