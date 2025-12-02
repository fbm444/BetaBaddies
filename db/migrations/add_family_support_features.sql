-- ============================================================================
-- Enhanced Family Support Features Migration
-- Adds tables for communications, boundaries, celebrations, well-being, and AI suggestions
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

CREATE INDEX idx_family_communications_user ON family_communications(user_id, created_at DESC);
CREATE INDEX idx_family_communications_family_member ON family_communications(family_member_user_id, created_at DESC);
CREATE INDEX idx_family_communications_unread ON family_communications(user_id, is_read) WHERE is_read = false;

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

CREATE INDEX idx_family_boundary_settings_user ON family_boundary_settings(user_id);
CREATE INDEX idx_family_boundary_settings_family_member ON family_boundary_settings(family_member_user_id);

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

CREATE INDEX idx_family_celebrations_user ON family_celebrations(user_id, created_at DESC);
CREATE INDEX idx_family_celebrations_family_member ON family_celebrations(family_member_user_id, created_at DESC);
CREATE INDEX idx_family_celebrations_shared ON family_celebrations(user_id, shared_with_family) WHERE shared_with_family = true;

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

CREATE INDEX idx_family_wellbeing_user ON family_wellbeing_tracking(user_id, created_at DESC);
CREATE INDEX idx_family_wellbeing_tracker ON family_wellbeing_tracking(tracked_by_user_id, created_at DESC);

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

CREATE INDEX idx_family_support_suggestions_user ON family_support_suggestions(user_id, created_at DESC);
CREATE INDEX idx_family_support_suggestions_family_member ON family_support_suggestions(family_member_user_id, created_at DESC);
CREATE INDEX idx_family_support_suggestions_type ON family_support_suggestions(suggestion_type, created_at DESC);

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

CREATE INDEX idx_family_educational_resources_type ON family_educational_resources(resource_type);
CREATE INDEX idx_family_educational_resources_category ON family_educational_resources(category);

-- Family Support Impact Tracking (enhance existing table)
ALTER TABLE support_effectiveness_tracking 
ADD COLUMN IF NOT EXISTS family_member_user_id uuid REFERENCES users(u_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS support_activity_type varchar(50),
ADD COLUMN IF NOT EXISTS support_activity_details jsonb,
ADD COLUMN IF NOT EXISTS performance_metrics jsonb;

CREATE INDEX IF NOT EXISTS idx_support_effectiveness_family_member ON support_effectiveness_tracking(family_member_user_id, created_at DESC);

