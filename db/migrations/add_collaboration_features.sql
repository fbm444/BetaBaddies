-- Migration: Add Multi-User Collaboration Features
-- UC-108, UC-109, UC-110, UC-111
-- Created: 2024

-- ============================================================================
-- Activity Logs for Team Activity Feed
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE,
    actor_role varchar(50), -- 'admin', 'mentor', 'candidate' - denormalized for performance
    activity_type varchar(50) NOT NULL, -- 'job_shared', 'comment_added', 'milestone_achieved', 'task_assigned', etc.
    activity_data jsonb DEFAULT '{}'::jsonb, -- Flexible data storage
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_team ON activity_logs(team_id, created_at DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type, created_at DESC);
CREATE INDEX idx_activity_logs_role ON activity_logs(team_id, actor_role, created_at DESC);

-- ============================================================================
-- Preparation Tasks for Mentor Task Assignment
-- ============================================================================
CREATE TABLE IF NOT EXISTS preparation_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
    assigned_by_role varchar(50), -- Role of person assigning
    assigned_to uuid REFERENCES users(u_id) ON DELETE CASCADE,
    assigned_to_role varchar(50), -- Role of person receiving
    task_type varchar(50) NOT NULL, -- 'interview_prep', 'resume_review', 'cover_letter_review', 'networking', etc.
    task_title varchar(255) NOT NULL,
    task_description text,
    task_data jsonb DEFAULT '{}'::jsonb, -- Additional task-specific data
    due_date date,
    status varchar(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preparation_tasks_assigned_to ON preparation_tasks(assigned_to, status);
CREATE INDEX idx_preparation_tasks_assigned_by ON preparation_tasks(assigned_by);
CREATE INDEX idx_preparation_tasks_team ON preparation_tasks(team_id, status);
CREATE INDEX idx_preparation_tasks_due_date ON preparation_tasks(due_date) WHERE status IN ('pending', 'in_progress');

-- ============================================================================
-- Shared Jobs for Team Job Sharing
-- ============================================================================
CREATE TABLE IF NOT EXISTS shared_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id uuid REFERENCES job_opportunities(id) ON DELETE CASCADE,
    shared_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
    shared_by_role varchar(50), -- Optional: for analytics
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, team_id) -- Prevent duplicate shares
);

CREATE INDEX idx_shared_jobs_team ON shared_jobs(team_id, shared_at DESC);
CREATE INDEX idx_shared_jobs_job ON shared_jobs(job_id);
CREATE INDEX idx_shared_jobs_shared_by ON shared_jobs(shared_by);

-- ============================================================================
-- Team Invitations for Member Invitation System
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    invited_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
    email varchar(255) NOT NULL,
    role varchar(50) DEFAULT 'candidate', -- Role to assign when accepted
    permissions jsonb DEFAULT '{}'::jsonb, -- Permissions to grant
    invitation_token varchar(255) UNIQUE NOT NULL,
    status varchar(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email, status);
CREATE INDEX idx_team_invitations_team ON team_invitations(team_id, status);

-- ============================================================================
-- Job Comments for Collaborative Comments on Shared Jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id uuid REFERENCES job_opportunities(id) ON DELETE CASCADE,
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES job_comments(id) ON DELETE CASCADE, -- For threaded comments
    comment_text text NOT NULL,
    is_suggestion boolean DEFAULT false, -- Whether this is a suggestion/recommendation
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_comments_job ON job_comments(job_id, created_at DESC);
CREATE INDEX idx_job_comments_team ON job_comments(team_id, created_at DESC);
CREATE INDEX idx_job_comments_parent ON job_comments(parent_comment_id);

-- ============================================================================
-- Progress Shares for Progress Sharing and Accountability
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress_shares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE, -- User sharing progress
    shared_with_user_id uuid REFERENCES users(u_id) ON DELETE CASCADE, -- Specific user (mentor/accountability partner)
    shared_with_team_id uuid REFERENCES teams(id) ON DELETE CASCADE, -- Or entire team
    share_type varchar(50) NOT NULL, -- 'goals', 'applications', 'interviews', 'milestones', 'all'
    privacy_level varchar(50) DEFAULT 'team' CHECK (privacy_level IN ('private', 'team', 'mentors_only')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_team_id IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_team_id IS NOT NULL)
    )
);

CREATE INDEX idx_progress_shares_user ON progress_shares(user_id, is_active);
CREATE INDEX idx_progress_shares_shared_with_user ON progress_shares(shared_with_user_id);
CREATE INDEX idx_progress_shares_team ON progress_shares(shared_with_team_id);

-- ============================================================================
-- Milestones for Achievement Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS milestones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE,
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    milestone_type varchar(50) NOT NULL, -- 'application_submitted', 'interview_completed', 'offer_received', 'goal_achieved', etc.
    milestone_title varchar(255) NOT NULL,
    milestone_description text,
    milestone_data jsonb DEFAULT '{}'::jsonb,
    achieved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    shared_with_team boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_user ON milestones(user_id, achieved_at DESC);
CREATE INDEX idx_milestones_team ON milestones(team_id, achieved_at DESC);
CREATE INDEX idx_milestones_type ON milestones(milestone_type, achieved_at DESC);

-- ============================================================================
-- Document Review Comments (extend existing document_review_requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    review_request_id uuid REFERENCES document_review_requests(id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES users(u_id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES review_comments(id) ON DELETE CASCADE, -- For threaded comments
    comment_text text NOT NULL,
    suggestion_text text, -- Suggested replacement text
    comment_type varchar(50) DEFAULT 'comment' CHECK (comment_type IN ('comment', 'suggestion', 'approval', 'rejection')),
    document_section varchar(100), -- Which section of document (for inline comments)
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_comments_review ON review_comments(review_request_id, created_at DESC);
CREATE INDEX idx_review_comments_reviewer ON review_comments(reviewer_id);
CREATE INDEX idx_review_comments_parent ON review_comments(parent_comment_id);
CREATE INDEX idx_review_comments_resolved ON review_comments(is_resolved, created_at DESC);

-- ============================================================================
-- Document Versions for Version History Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_type varchar(50) NOT NULL CHECK (document_type IN ('resume', 'cover_letter')),
    document_id uuid NOT NULL, -- References resume.id or coverletter.id
    version_number integer NOT NULL,
    version_data jsonb, -- Store document content/structure
    created_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
    change_summary text, -- What changed in this version
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_type, document_id, version_number)
);

CREATE INDEX idx_document_versions_document ON document_versions(document_type, document_id, version_number DESC);
CREATE INDEX idx_document_versions_created_by ON document_versions(created_by);

-- ============================================================================
-- Update existing interview_preparation_tasks to support mentor assignment
-- ============================================================================
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='interview_preparation_tasks' AND column_name='assigned_by') THEN
        ALTER TABLE interview_preparation_tasks 
        ADD COLUMN assigned_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
        ADD COLUMN assigned_to uuid REFERENCES users(u_id) ON DELETE CASCADE,
        ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
        ADD COLUMN task_type varchar(50) DEFAULT 'interview_prep';
    END IF;
END $$;

-- ============================================================================
-- Add team_id to mentor_shared_data for team-wide sharing
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='mentor_shared_data' AND column_name='team_id') THEN
        ALTER TABLE mentor_shared_data 
        ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE activity_logs IS 'Tracks all team activities for activity feed and analytics';
COMMENT ON TABLE preparation_tasks IS 'Tasks assigned by mentors/admins to candidates for interview prep and job search activities';
COMMENT ON TABLE shared_jobs IS 'Job postings shared with team members for collaborative review';
COMMENT ON TABLE team_invitations IS 'Invitation system for adding members to teams';
COMMENT ON TABLE job_comments IS 'Collaborative comments on shared job postings';
COMMENT ON TABLE progress_shares IS 'Progress sharing configuration for accountability and mentor visibility';
COMMENT ON TABLE milestones IS 'Achievement milestones for celebration and motivation';
COMMENT ON TABLE review_comments IS 'Comments and suggestions on document reviews';
COMMENT ON TABLE document_versions IS 'Version history for resumes and cover letters';

