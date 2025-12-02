-- ============================================================================
-- Seed Data: Premade Support Groups (UC-112)
-- Description: Creates initial support groups with AI-generated content
-- ============================================================================

-- Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert premade support groups
INSERT INTO public.support_groups (
    id, name, description, category, industry, role_type, is_public, is_active, member_count, post_count, created_at, updated_at
) VALUES
-- Software Engineering Groups
(
    gen_random_uuid(),
    'Software Engineering Support',
    'A community for software engineers at all levels. Share coding challenges, career advice, interview tips, and support each other through your job search journey. Whether you''re a new grad or a senior engineer, find your tribe here.',
    'industry',
    'Software Engineering',
    NULL,
    true,
    true,
    0,
    0,
    now(),
    now()
),
(
    gen_random_uuid(),
    'New Grad Software Engineers',
    'Specifically for new graduates entering the software engineering field. Get advice on first job applications, salary negotiations, choosing between offers, and navigating your early career. Connect with peers who understand the transition from student to professional.',
    'role',
    'Software Engineering',
    'New Grad',
    true,
    true,
    0,
    0,
    now(),
    now()
),
-- Cybersecurity Groups
(
    gen_random_uuid(),
    'Cybersecurity Professionals',
    'Join fellow cybersecurity professionals to discuss industry trends, share security best practices, exchange job opportunities, and support each other in advancing your security career. From SOC analysts to security architects, all are welcome.',
    'industry',
    'Cybersecurity',
    NULL,
    true,
    true,
    0,
    0,
    now(),
    now()
),
-- Data Science Groups
(
    gen_random_uuid(),
    'Data Science & Analytics',
    'A vibrant community for data scientists, ML engineers, and analysts. Share projects, discuss algorithms, exchange interview experiences, and help each other land roles in data science, machine learning, and analytics.',
    'industry',
    'Data Science',
    NULL,
    true,
    true,
    0,
    0,
    now(),
    now()
),
-- Career Changers
(
    gen_random_uuid(),
    'Career Changers Support',
    'Making a career transition? You''re not alone. Connect with others who are pivoting into tech, sharing strategies for learning new skills, building portfolios, networking, and successfully making the switch. Get encouragement and practical advice.',
    'demographic',
    NULL,
    'Career Changer',
    true,
    true,
    0,
    0,
    now(),
    now()
),
-- Interview Prep
(
    gen_random_uuid(),
    'Interview Preparation & Practice',
    'Master your interview skills with this supportive community. Share mock interview experiences, practice coding problems together, exchange behavioral interview strategies, and celebrate wins. We''re all in this together!',
    'interest',
    NULL,
    NULL,
    true,
    true,
    0,
    0,
    now(),
    now()
),
-- Salary Negotiation
(
    gen_random_uuid(),
    'Salary Negotiation & Compensation',
    'Learn to negotiate with confidence. Share salary data, discuss negotiation strategies, celebrate successful negotiations, and help each other get paid what you''re worth. Knowledge is power in salary discussions.',
    'interest',
    NULL,
    NULL,
    true,
    true,
    0,
    0,
    now(),
    now()
),
-- Remote Work
(
    gen_random_uuid(),
    'Remote Work & Distributed Teams',
    'Navigating remote work opportunities? Share experiences with remote interviews, discuss work-life balance, exchange tips for staying productive, and connect with companies offering remote positions.',
    'interest',
    NULL,
    NULL,
    true,
    true,
    0,
    0,
    now(),
    now()
)
ON CONFLICT (name) DO NOTHING;

-- Note: Resources, challenges, and initial posts can be added via the application
-- or through additional seed scripts that use the AI content generation feature

