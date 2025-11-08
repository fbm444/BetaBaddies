-- Grant permissions to ats_user for all tables
-- This migration grants SELECT, INSERT, UPDATE, DELETE permissions to ats_user
-- Run this as the postgres superuser or the table owner

-- First, ensure ats_user exists (create if it doesn't)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'ats_user') THEN
        CREATE USER "ats_user" WITH PASSWORD 'ats_password';
    END IF;
END
$$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO "ats_user";

-- Grant permissions on resume table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume TO "ats_user";

-- Grant permissions on resume_template table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_template TO "ats_user";

-- Grant permissions on resume_comments table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_comments TO "ats_user";

-- Grant permissions on resume_tailoring table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.resume_tailoring TO "ats_user";

-- Grant permissions on users table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO "ats_user";

-- Grant permissions on profiles table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO "ats_user";

-- Grant permissions on jobs table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.jobs TO "ats_user";

-- Grant permissions on skills table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.skills TO "ats_user";

-- Grant permissions on education table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.educations TO "ats_user";

-- Grant permissions on projects table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO "ats_user";

-- Grant permissions on certifications table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.certifications TO "ats_user";

-- Grant permissions on coverletter table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter TO "ats_user";

-- Grant permissions on coverletter_template table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coverletter_template TO "ats_user";

-- Grant permissions on company_info table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_info TO "ats_user";

-- Grant permissions on company_media table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_media TO "ats_user";

-- Grant permissions on company_news table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_news TO "ats_user";

-- Grant permissions on archived_prospectivejobs table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.archived_prospectivejobs TO "ats_user";

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.addupdatetime() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.auto_archive_jobs() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.log_material_history() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.lower_email() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_coverletter_timestamp() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_resume_timestamp() TO "ats_user";
GRANT EXECUTE ON FUNCTION public.update_status_change_time() TO "ats_user";

-- Grant default privileges for future tables (optional)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "ats_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO "ats_user";

