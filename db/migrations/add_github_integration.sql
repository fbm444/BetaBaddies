-- Add GitHub integration support
-- Migration to add GitHub OAuth tokens and repositories table

-- Add GitHub OAuth fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_refresh_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);

-- Create GitHub repositories table
CREATE TABLE IF NOT EXISTS github_repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    description TEXT,
    html_url VARCHAR(500) NOT NULL,
    clone_url VARCHAR(500),
    language VARCHAR(100),
    languages JSONB, -- Store all languages with percentages
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    size INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT false,
    is_fork BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false, -- User-selected featured repos
    default_branch VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    pushed_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    topics TEXT[], -- Array of repository topics
    homepage VARCHAR(500),
    license_name VARCHAR(255),
    license_url VARCHAR(500),
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at_db TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, github_repo_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_github_repo_id ON github_repositories(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_featured ON github_repositories(user_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_github_repos_language ON github_repositories(language);
CREATE INDEX IF NOT EXISTS idx_github_repos_last_synced ON github_repositories(last_synced_at);

-- Create table to link repositories to skills
CREATE TABLE IF NOT EXISTS github_repository_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES github_repositories(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_github_repo_skills_repo ON github_repository_skills(repository_id);
CREATE INDEX IF NOT EXISTS idx_github_repo_skills_skill ON github_repository_skills(skill_id);

-- Create table to track contribution activity
CREATE TABLE IF NOT EXISTS github_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(u_id) ON DELETE CASCADE,
    repository_id UUID REFERENCES github_repositories(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    commit_count INTEGER DEFAULT 0,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, repository_id, date)
);

CREATE INDEX IF NOT EXISTS idx_github_contributions_user ON github_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_github_contributions_repo ON github_contributions(repository_id);
CREATE INDEX IF NOT EXISTS idx_github_contributions_date ON github_contributions(date);

-- Add comments for documentation
COMMENT ON TABLE github_repositories IS 'Stores GitHub repositories imported by users';
COMMENT ON COLUMN github_repositories.is_featured IS 'User-selected featured repositories for profile showcase';
COMMENT ON COLUMN github_repositories.languages IS 'JSON object with language names as keys and percentages as values';
COMMENT ON TABLE github_repository_skills IS 'Links GitHub repositories to user skills';
COMMENT ON TABLE github_contributions IS 'Tracks daily contribution activity (commits, additions, deletions)';

