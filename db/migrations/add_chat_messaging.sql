-- Migration: Add Chat/Messaging System for Collaboration
-- Created: 2024

-- ============================================================================
-- Chat Conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_type varchar(50) NOT NULL, -- 'team', 'mentor_mentee', 'document_review', 'progress_sharing', 'direct'
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    related_entity_type varchar(50), -- 'document_review', 'job_opportunity', 'task', etc.
    related_entity_id uuid, -- ID of the related entity (document_id, job_id, etc.)
    title varchar(255), -- Optional conversation title
    created_by uuid REFERENCES users(u_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_message_at timestamp with time zone
);

CREATE INDEX idx_chat_conversations_team ON chat_conversations(team_id, updated_at DESC);
CREATE INDEX idx_chat_conversations_type ON chat_conversations(conversation_type, updated_at DESC);
CREATE INDEX idx_chat_conversations_related ON chat_conversations(related_entity_type, related_entity_id);

-- ============================================================================
-- Chat Participants
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    role varchar(50), -- 'admin', 'mentor', 'candidate', 'reviewer', etc.
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_at timestamp with time zone,
    is_active boolean DEFAULT true,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_chat_participants_conversation ON chat_participants(conversation_id, is_active);
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id, is_active);

-- ============================================================================
-- Chat Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    message_text text NOT NULL,
    message_type varchar(50) DEFAULT 'text', -- 'text', 'system', 'file', 'feedback', 'milestone'
    attachment_url varchar(500), -- For file attachments
    attachment_type varchar(50), -- 'image', 'document', 'link', etc.
    parent_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL, -- For threaded replies
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id, created_at DESC);
CREATE INDEX idx_chat_messages_parent ON chat_messages(parent_message_id);

-- ============================================================================
-- Message Reactions (optional, for engagement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    reaction_type varchar(20) NOT NULL, -- 'like', 'thumbs_up', 'celebrate', etc.
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, reaction_type)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);

-- ============================================================================
-- Chat Notifications (for unread messages)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
    notification_type varchar(50) DEFAULT 'new_message', -- 'new_message', 'mention', 'reaction'
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_notifications_user ON chat_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_chat_notifications_conversation ON chat_notifications(conversation_id);

COMMENT ON TABLE chat_conversations IS 'Chat conversations for team collaboration, mentor-mentee communication, document reviews, etc.';
COMMENT ON TABLE chat_participants IS 'Users participating in chat conversations';
COMMENT ON TABLE chat_messages IS 'Individual messages in chat conversations';
COMMENT ON TABLE message_reactions IS 'Reactions to messages (likes, thumbs up, etc.)';
COMMENT ON TABLE chat_notifications IS 'Notifications for unread messages and mentions';

