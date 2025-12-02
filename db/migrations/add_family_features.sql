-- ============================================================================
-- Family Support System (UC-113)
-- ============================================================================

-- Family Invitations Table
-- Similar to team_invitations but for family members
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

CREATE INDEX idx_family_invitations_token ON family_invitations(invitation_token);
CREATE INDEX idx_family_invitations_email ON family_invitations(email, status);
CREATE INDEX idx_family_invitations_user ON family_invitations(user_id, status);

-- Update family_support_access to link to invitations
ALTER TABLE family_support_access 
ADD COLUMN IF NOT EXISTS invitation_id uuid REFERENCES family_invitations(id) ON DELETE SET NULL;

-- Add account_type to users table to distinguish regular users from family-only accounts
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_type varchar(50) DEFAULT 'regular' CHECK (account_type IN ('regular', 'family_only'));

CREATE INDEX idx_users_account_type ON users(account_type);

-- Family Member Progress View (for family members to see progress summaries)
CREATE TABLE IF NOT EXISTS family_member_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    family_member_id uuid REFERENCES users(u_id) ON DELETE CASCADE NOT NULL,
    last_viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    view_count integer DEFAULT 0,
    UNIQUE(user_id, family_member_id)
);

CREATE INDEX idx_family_member_views_user ON family_member_views(user_id);
CREATE INDEX idx_family_member_views_family ON family_member_views(family_member_id);

