-- Migration: Add Gmail integration for email linking to job applications
-- Purpose: Enable users to link Gmail emails to job opportunities for tracking communication

-- Add Gmail OAuth token columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gmail_access_token text,
ADD COLUMN IF NOT EXISTS gmail_refresh_token text,
ADD COLUMN IF NOT EXISTS gmail_token_expiry timestamp with time zone,
ADD COLUMN IF NOT EXISTS gmail_sync_enabled boolean DEFAULT false;

-- Create email_links table to store linked emails
CREATE TABLE IF NOT EXISTS public.email_links (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    job_opportunity_id uuid NOT NULL REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
    gmail_message_id character varying(255) NOT NULL,
    subject character varying(500),
    sender_email character varying(255),
    sender_name character varying(255),
    snippet text,
    email_date timestamp with time zone NOT NULL,
    thread_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_email_link UNIQUE (user_id, job_opportunity_id, gmail_message_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_links_user_id ON public.email_links(user_id);
CREATE INDEX IF NOT EXISTS idx_email_links_job_opportunity_id ON public.email_links(job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_email_links_email_date ON public.email_links(email_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_links_gmail_message_id ON public.email_links(gmail_message_id);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_email_links_updated_at
    BEFORE UPDATE ON public.email_links
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

-- Add comments for documentation
COMMENT ON TABLE public.email_links IS 'Stores links between Gmail emails and job opportunities';
COMMENT ON COLUMN public.email_links.gmail_message_id IS 'Gmail API message ID';
COMMENT ON COLUMN public.email_links.snippet IS 'Email preview/snippet text';
COMMENT ON COLUMN public.email_links.thread_id IS 'Gmail thread ID for grouping related emails';
COMMENT ON COLUMN public.users.gmail_access_token IS 'Gmail OAuth access token';
COMMENT ON COLUMN public.users.gmail_refresh_token IS 'Gmail OAuth refresh token';
COMMENT ON COLUMN public.users.gmail_token_expiry IS 'Gmail OAuth token expiry timestamp';
COMMENT ON COLUMN public.users.gmail_sync_enabled IS 'Whether Gmail sync is enabled for the user';

