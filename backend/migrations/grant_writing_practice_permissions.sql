-- Grant Permissions for Writing Practice Tables
-- Run this script after creating the tables to grant necessary permissions

-- Grant permissions for writing_practice_sessions table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.writing_practice_sessions TO "ats_user";

-- Grant permissions for writing_feedback table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.writing_feedback TO "ats_user";

-- Grant permissions for writing_practice_prompts table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.writing_practice_prompts TO "ats_user";

-- Grant permissions for writing_progress_tracking table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.writing_progress_tracking TO "ats_user";

-- Grant permissions for nerves_management_exercises table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nerves_management_exercises TO "ats_user";

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "ats_user";

-- Grant execute permission on trigger function
GRANT EXECUTE ON FUNCTION public.update_writing_practice_timestamp() TO "ats_user";

