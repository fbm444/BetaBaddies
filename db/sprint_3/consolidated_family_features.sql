-- ============================================================================
-- Consolidated Family Support Features Migration
-- ============================================================================
-- This script consolidates ALL family support database changes:
-- 1. Family invitations and access (from sprint_3/add_family_features.sql)
-- 2. Enhanced family support features (communications, boundaries, celebrations, etc.)
-- 3. All indexes and permissions
--
-- This script is idempotent - it can be run multiple times safely
-- All changes use IF NOT EXISTS or DO blocks to prevent errors on re-runs
--
-- Usage:
--   psql -U <db_owner> -d ats_tracker -f db/migrations/consolidated_family_features.sql
-- ============================================================================

-- ============================================================================
-- PART 1: Core Family Support Tables (from sprint_3)
-- ============================================================================

-- Family Invitations Table
CREATE TABLE IF NOT EXISTS family_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    invited_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
    email varchar(255) NOT NULL,
    family_member_name varchar(255),
    relationship varchar(50), -- e.g., 'parent', 'spouse', 'sibling', 'friend'
    invitation_token varchar(255) UNIQUE NOT NULL,
    status varchar(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON family_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_family_invitations_email ON family_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_family_invitations_user ON family_invitations(user_id, status);

-- Family Member Views Table
CREATE TABLE IF NOT EXISTS family_member_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    family_member_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    last_viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    view_count integer DEFAULT 0,
    UNIQUE(user_id, family_member_id)
);

CREATE INDEX IF NOT EXISTS idx_family_member_views_user ON family_member_views(user_id);
CREATE INDEX IF NOT EXISTS idx_family_member_views_family ON family_member_views(family_member_id);

-- ============================================================================
-- PART 2: Enhanced Family Support Features
-- ============================================================================

-- Family Communications Table
CREATE TABLE IF NOT EXISTS family_communications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    family_member_user_id uuid REFERENCES users(u_id) ON DELETE SET NULL,
    communication_type varchar(50) NOT NULL CHECK (communication_type IN ('update', 'milestone', 'celebration', 'support_message', 'check_in')),
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_family_communications_user ON family_communications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_communications_family_member ON family_communications(family_member_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_communications_unread ON family_communications(user_id, is_read) WHERE is_read = false;

-- Family Boundary Settings Table
CREATE TABLE IF NOT EXISTS family_boundary_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    family_member_user_id uuid REFERENCES users(u_id) ON DELETE CASCADE,
    setting_type varchar(50) NOT NULL CHECK (setting_type IN ('communication_frequency', 'data_sharing_level', 'support_style', 'notification_preferences')),
    setting_value jsonb NOT NULL,
    ai_suggestions jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, family_member_user_id, setting_type)
);

CREATE INDEX IF NOT EXISTS idx_family_boundary_settings_user ON family_boundary_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_family_boundary_settings_family_member ON family_boundary_settings(family_member_user_id);

-- Family Celebrations Table
CREATE TABLE IF NOT EXISTS family_celebrations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    family_member_user_id uuid REFERENCES users(u_id) ON DELETE SET NULL,
    celebration_type varchar(50) NOT NULL CHECK (celebration_type IN ('milestone', 'achievement', 'interview', 'offer', 'application_milestone', 'personal_win')),
    title varchar(255) NOT NULL,
    description text,
    milestone_data jsonb,
    shared_with_family boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_family_celebrations_user ON family_celebrations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_celebrations_family_member ON family_celebrations(family_member_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_celebrations_shared ON family_celebrations(user_id, shared_with_family) WHERE shared_with_family = true;

-- Family Well-being Tracking Table
CREATE TABLE IF NOT EXISTS family_wellbeing_tracking (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    tracked_by_user_id uuid REFERENCES users(u_id) ON DELETE SET NULL,
    stress_level integer CHECK (stress_level >= 1 AND stress_level <= 10),
    mood_indicator varchar(50),
    energy_level integer CHECK (energy_level >= 1 AND energy_level <= 10),
    sleep_quality integer CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    notes text,
    wellbeing_indicators jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_family_wellbeing_user ON family_wellbeing_tracking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_wellbeing_tracker ON family_wellbeing_tracking(tracked_by_user_id, created_at DESC);

-- Family Support Suggestions Table (AI-generated)
CREATE TABLE IF NOT EXISTS family_support_suggestions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    family_member_user_id uuid REFERENCES users(u_id) ON DELETE SET NULL,
    suggestion_type varchar(50) NOT NULL CHECK (suggestion_type IN ('support_strategy', 'boundary_setting', 'communication_tip', 'celebration_idea', 'wellbeing_support')),
    title varchar(255) NOT NULL,
    suggestion_text text NOT NULL,
    context_data jsonb,
    ai_generated boolean DEFAULT true,
    is_applied boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    applied_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_family_support_suggestions_user ON family_support_suggestions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_support_suggestions_family_member ON family_support_suggestions(family_member_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_support_suggestions_type ON family_support_suggestions(suggestion_type, created_at DESC);

-- Educational Resources Table
CREATE TABLE IF NOT EXISTS family_educational_resources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_type varchar(50) NOT NULL CHECK (resource_type IN ('article', 'guide', 'tip', 'video', 'ai_generated')),
    title varchar(255) NOT NULL,
    content text NOT NULL,
    category varchar(50),
    ai_generated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_family_educational_resources_type ON family_educational_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_family_educational_resources_category ON family_educational_resources(category);

-- ============================================================================
-- PART 3: Alter Existing Tables
-- ============================================================================

-- Update family_support_access to link to invitations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'family_support_access' 
        AND column_name = 'invitation_id'
    ) THEN
        ALTER TABLE family_support_access 
        ADD COLUMN invitation_id uuid REFERENCES family_invitations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add account_type to users table to distinguish regular users from family-only accounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'account_type'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN account_type varchar(50) DEFAULT 'regular' CHECK (account_type IN ('regular', 'family_only'));
        
        CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
    END IF;
END $$;

-- Family Support Impact Tracking (enhance existing table)
DO $$
BEGIN
    -- Add family_member_user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_effectiveness_tracking' 
        AND column_name = 'family_member_user_id'
    ) THEN
        ALTER TABLE support_effectiveness_tracking 
        ADD COLUMN family_member_user_id uuid REFERENCES users(u_id) ON DELETE SET NULL;
    END IF;
    
    -- Add support_activity_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_effectiveness_tracking' 
        AND column_name = 'support_activity_type'
    ) THEN
        ALTER TABLE support_effectiveness_tracking 
        ADD COLUMN support_activity_type varchar(50);
    END IF;
    
    -- Add support_activity_details column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_effectiveness_tracking' 
        AND column_name = 'support_activity_details'
    ) THEN
        ALTER TABLE support_effectiveness_tracking 
        ADD COLUMN support_activity_details jsonb;
    END IF;
    
    -- Add performance_metrics column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_effectiveness_tracking' 
        AND column_name = 'performance_metrics'
    ) THEN
        ALTER TABLE support_effectiveness_tracking 
        ADD COLUMN performance_metrics jsonb;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_effectiveness_family_member ON support_effectiveness_tracking(family_member_user_id, created_at DESC);

-- ============================================================================
-- PART 4: Grant Permissions
-- ============================================================================

-- Grant permissions on all family-related tables to ats_user
DO $$
BEGIN
    -- Grant permissions on family_invitations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_invitations') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_invitations TO "ats_user";
    END IF;
    
    -- Grant permissions on family_support_access
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_support_access') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_support_access TO "ats_user";
    END IF;
    
    -- Grant permissions on family_progress_summaries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_progress_summaries') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_progress_summaries TO "ats_user";
    END IF;
    
    -- Grant permissions on family_member_views
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_member_views') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_member_views TO "ats_user";
    END IF;
    
    -- Grant permissions on family_communications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_communications') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_communications TO "ats_user";
    END IF;
    
    -- Grant permissions on family_boundary_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_boundary_settings') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_boundary_settings TO "ats_user";
    END IF;
    
    -- Grant permissions on family_celebrations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_celebrations') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_celebrations TO "ats_user";
    END IF;
    
    -- Grant permissions on family_wellbeing_tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_wellbeing_tracking') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_wellbeing_tracking TO "ats_user";
    END IF;
    
    -- Grant permissions on family_support_suggestions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_support_suggestions') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_support_suggestions TO "ats_user";
    END IF;
    
    -- Grant permissions on family_educational_resources
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_educational_resources') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_educational_resources TO "ats_user";
    END IF;
    
    -- Grant permissions on support_effectiveness_tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_effectiveness_tracking') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE support_effectiveness_tracking TO "ats_user";
    END IF;
END $$;

