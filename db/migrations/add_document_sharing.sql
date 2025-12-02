-- Migration: Add Document Sharing with Teams
-- Created: 2024

-- ============================================================================
-- Shared Documents for Team Document Sharing
-- Follows the same pattern as shared_jobs table
-- Supports sharing with entire team OR individual team members
-- ============================================================================
CREATE TABLE IF NOT EXISTS shared_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_type varchar(50) NOT NULL CHECK (document_type IN ('resume', 'cover_letter')),
    document_id uuid NOT NULL,
    shared_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
    shared_by_role varchar(50), -- Optional: for analytics
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    shared_with_user_id uuid REFERENCES users(u_id) ON DELETE CASCADE, -- For individual member sharing (nullable)
    version_number integer, -- Optional: track which version was shared
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate shares: either team-wide OR with specific user
    UNIQUE(document_type, document_id, team_id, COALESCE(shared_with_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX idx_shared_documents_team ON shared_documents(team_id, shared_at DESC);
CREATE INDEX idx_shared_documents_document ON shared_documents(document_type, document_id);
CREATE INDEX idx_shared_documents_shared_by ON shared_documents(shared_by);
CREATE INDEX idx_shared_documents_shared_with_user ON shared_documents(shared_with_user_id) WHERE shared_with_user_id IS NOT NULL;

-- ============================================================================
-- Extend review_comments to support team-based document comments
-- Make review_request_id nullable and add team/document fields
-- ============================================================================
DO $$ 
BEGIN
    -- Make review_request_id nullable (if not already)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'review_comments' 
               AND column_name = 'review_request_id' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE review_comments ALTER COLUMN review_request_id DROP NOT NULL;
    END IF;

    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_comments' 
                   AND column_name = 'team_id') THEN
        ALTER TABLE review_comments 
        ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
    END IF;

    -- Add document_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_comments' 
                   AND column_name = 'document_type') THEN
        ALTER TABLE review_comments 
        ADD COLUMN document_type varchar(50) CHECK (document_type IN ('resume', 'cover_letter', 'coverletter'));
    END IF;

    -- Add document_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'review_comments' 
                   AND column_name = 'document_id') THEN
        ALTER TABLE review_comments 
        ADD COLUMN document_id uuid;
    END IF;

    -- Add indexes for team-based queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_review_comments_team_document') THEN
        CREATE INDEX idx_review_comments_team_document ON review_comments(team_id, document_type, document_id) 
        WHERE team_id IS NOT NULL;
    END IF;
END $$;

COMMENT ON TABLE shared_documents IS 'Documents (resumes/cover letters) shared with team members for collaborative review';
COMMENT ON COLUMN review_comments.team_id IS 'Team ID for team-based document comments (nullable, used when review_request_id is NULL)';
COMMENT ON COLUMN review_comments.document_type IS 'Document type for team-based comments (nullable, used when review_request_id is NULL)';
COMMENT ON COLUMN review_comments.document_id IS 'Document ID for team-based comments (nullable, used when review_request_id is NULL)';

