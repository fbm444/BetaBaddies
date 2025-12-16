-- Migration: Create Follow-Up Reminders System Tables
-- Description: Creates tables for intelligent follow-up reminder system

-- 0. Email Templates Table (create first, before follow_up_reminders references it)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB,
  is_system_template BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_template_type CHECK (template_type IN ('follow_up_application', 'follow_up_interview', 'follow_up_post_interview', 'follow_up_offer_response', 'follow_up_custom'))
);

-- 1. Follow-up Reminders Table (create without foreign keys first)
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_opportunity_id UUID NOT NULL,
  
  -- Reminder Details
  reminder_type VARCHAR(50) NOT NULL,
  application_stage VARCHAR(50) NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  snoozed_until TIMESTAMP,
  
  -- Timing Configuration
  days_after_event INTEGER,
  event_date TIMESTAMP,
  
  -- Email Template
  email_template_id UUID,
  generated_email_subject TEXT,
  generated_email_body TEXT,
  
  -- Tracking
  email_sent_at TIMESTAMP,
  response_received_at TIMESTAMP,
  response_type VARCHAR(50),
  
  -- Adaptive Settings
  reminder_frequency_days INTEGER DEFAULT 7,
  company_responsiveness_score DECIMAL(3,2) DEFAULT 0.5,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('application', 'interview', 'post_interview', 'offer_response', 'custom')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'snoozed', 'completed', 'dismissed', 'expired')),
  CONSTRAINT valid_response_type CHECK (response_type IS NULL OR response_type IN ('positive', 'negative', 'neutral', 'no_response'))
);

-- 2. Follow-up Reminder Rules Table (create without foreign keys first)
CREATE TABLE IF NOT EXISTS follow_up_reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  
  -- Rule Configuration
  application_stage VARCHAR(50) NOT NULL,
  reminder_type VARCHAR(50) NOT NULL,
  days_after_event INTEGER NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  
  -- Customization
  custom_message TEXT,
  preferred_contact_method VARCHAR(50) DEFAULT 'email',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, application_stage, reminder_type),
  CONSTRAINT valid_reminder_type_rule CHECK (reminder_type IN ('application', 'interview', 'post_interview', 'offer_response', 'custom')),
  CONSTRAINT valid_contact_method CHECK (preferred_contact_method IN ('email', 'linkedin', 'phone'))
);

-- 3. Company Responsiveness Tracking Table (create without foreign keys first)
CREATE TABLE IF NOT EXISTS company_responsiveness_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  
  -- Metrics
  total_follow_ups_sent INTEGER DEFAULT 0,
  total_responses_received INTEGER DEFAULT 0,
  average_response_time_hours DECIMAL(10,2),
  responsiveness_score DECIMAL(3,2) DEFAULT 0.5,
  
  -- Last Interaction
  last_follow_up_sent_at TIMESTAMP,
  last_response_received_at TIMESTAMP,
  
  -- Calculated Fields
  response_rate DECIMAL(5,2),
  preferred_follow_up_frequency_days INTEGER DEFAULT 7,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, company_name)
);

-- Add foreign key constraints after tables are created
DO $$
BEGIN
  -- Add foreign key for follow_up_reminders.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_follow_up_reminders_user_id') THEN
      ALTER TABLE follow_up_reminders
      ADD CONSTRAINT fk_follow_up_reminders_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add foreign key for follow_up_reminders.job_opportunity_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_opportunities') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_follow_up_reminders_job_opportunity_id') THEN
      ALTER TABLE follow_up_reminders
      ADD CONSTRAINT fk_follow_up_reminders_job_opportunity_id
      FOREIGN KEY (job_opportunity_id) REFERENCES job_opportunities(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add foreign key for follow_up_reminders.email_template_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_follow_up_reminders_email_template') THEN
      ALTER TABLE follow_up_reminders
      ADD CONSTRAINT fk_follow_up_reminders_email_template
      FOREIGN KEY (email_template_id) REFERENCES email_templates(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Add foreign key for follow_up_reminder_rules.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_follow_up_reminder_rules_user_id') THEN
      ALTER TABLE follow_up_reminder_rules
      ADD CONSTRAINT fk_follow_up_reminder_rules_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add foreign key for company_responsiveness_tracking.user_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_responsiveness_user_id') THEN
      ALTER TABLE company_responsiveness_tracking
      ADD CONSTRAINT fk_company_responsiveness_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_follow_up_user_job ON follow_up_reminders(user_id, job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_due_date ON follow_up_reminders(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_follow_up_scheduled ON follow_up_reminders(scheduled_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_reminders(status, is_active);
CREATE INDEX IF NOT EXISTS idx_follow_up_user_status ON follow_up_reminders(user_id, status) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_reminder_rules_user ON follow_up_reminder_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_stage ON follow_up_reminder_rules(application_stage, is_enabled);

CREATE INDEX IF NOT EXISTS idx_company_responsiveness_user ON company_responsiveness_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_company_responsiveness_company ON company_responsiveness_tracking(company_name);

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type, is_system_template);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_follow_up_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_up_reminders_updated_at
  BEFORE UPDATE ON follow_up_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_up_reminders_updated_at();

CREATE TRIGGER trigger_update_reminder_rules_updated_at
  BEFORE UPDATE ON follow_up_reminder_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_up_reminders_updated_at();

CREATE TRIGGER trigger_update_company_responsiveness_updated_at
  BEFORE UPDATE ON company_responsiveness_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_up_reminders_updated_at();

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON follow_up_reminders TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON follow_up_reminder_rules TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_responsiveness_tracking TO ats_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates TO ats_user;

-- Comments for Documentation
COMMENT ON TABLE follow_up_reminders IS 'Stores follow-up reminders for job applications';
COMMENT ON TABLE follow_up_reminder_rules IS 'User-defined rules for when to create reminders';
COMMENT ON TABLE company_responsiveness_tracking IS 'Tracks company response patterns for adaptive reminder frequency';
COMMENT ON TABLE email_templates IS 'Email templates for follow-up communications';

