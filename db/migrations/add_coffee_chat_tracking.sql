-- Migration: Add coffee chat and networking interaction tracking
-- This supports tracking coffee chats, interview requests, and their impact on job opportunities

CREATE TABLE IF NOT EXISTS public.coffee_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    contact_id uuid REFERENCES public.professional_contacts(id) ON DELETE SET NULL,
    job_opportunity_id uuid REFERENCES public.job_opportunities(id) ON DELETE SET NULL,
    contact_name character varying(255) NOT NULL,
    contact_email character varying(255),
    contact_linkedin_url character varying(1001),
    contact_company character varying(255),
    contact_title character varying(255),
    chat_type character varying(50) DEFAULT 'coffee_chat' CHECK (chat_type IN ('coffee_chat', 'interview_request', 'informational', 'referral_request')),
    scheduled_date timestamp with time zone,
    completed_date timestamp with time zone,
    status character varying(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled', 'no_show')),
    message_sent boolean DEFAULT false,
    message_sent_at timestamp with time zone,
    response_received boolean DEFAULT false,
    response_received_at timestamp with time zone,
    response_content text,
    referral_provided boolean DEFAULT false,
    referral_details text,
    notes text,
    impact_on_opportunity character varying(50) CHECK (impact_on_opportunity IN ('positive', 'neutral', 'negative', 'unknown')),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coffee_chats_user_id ON public.coffee_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_coffee_chats_contact_id ON public.coffee_chats(contact_id);
CREATE INDEX IF NOT EXISTS idx_coffee_chats_job_opportunity_id ON public.coffee_chats(job_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_coffee_chats_status ON public.coffee_chats(status);
CREATE INDEX IF NOT EXISTS idx_coffee_chats_scheduled_date ON public.coffee_chats(scheduled_date);

-- Table for generated messages
CREATE TABLE IF NOT EXISTS public.networking_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    coffee_chat_id uuid REFERENCES public.coffee_chats(id) ON DELETE CASCADE,
    message_type character varying(50) NOT NULL CHECK (message_type IN ('coffee_chat', 'interview_request', 'referral_request', 'follow_up')),
    recipient_name character varying(255) NOT NULL,
    recipient_email character varying(255),
    recipient_linkedin_url character varying(1000),
    subject character varying(500),
    message_body text NOT NULL,
    generated_by character varying(50) DEFAULT 'ai' CHECK (generated_by IN ('ai', 'template', 'manual')),
    sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    response_received boolean DEFAULT false,
    response_received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_networking_messages_user_id ON public.networking_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_messages_coffee_chat_id ON public.networking_messages(coffee_chat_id);
CREATE INDEX IF NOT EXISTS idx_networking_messages_sent ON public.networking_messages(sent);

-- Table for LinkedIn network contacts (cached from LinkedIn API)
CREATE TABLE IF NOT EXISTS public.linkedin_network_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(u_id) ON DELETE CASCADE,
    linkedin_id character varying(255) UNIQUE,
    first_name character varying(255),
    last_name character varying(255),
    full_name character varying(500),
    headline text,
    current_company character varying(255),
    current_title character varying(255),
    location character varying(255),
    profile_url character varying(1000),
    profile_picture_url character varying(1000),
    connection_degree character varying(50) DEFAULT '1st' CHECK (connection_degree IN ('1st', '2nd', '3rd')),
    industry character varying(255),
    mutual_connections_count integer DEFAULT 0,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_linkedin_network_user_id ON public.linkedin_network_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_network_company ON public.linkedin_network_contacts(current_company);
CREATE INDEX IF NOT EXISTS idx_linkedin_network_industry ON public.linkedin_network_contacts(industry);
CREATE INDEX IF NOT EXISTS idx_linkedin_network_linkedin_id ON public.linkedin_network_contacts(linkedin_id);

COMMENT ON TABLE public.coffee_chats IS 'Tracks coffee chats and networking interactions with contacts';
COMMENT ON TABLE public.networking_messages IS 'Stores generated networking messages (coffee chat requests, interview requests, etc.)';
COMMENT ON TABLE public.linkedin_network_contacts IS 'Cached LinkedIn network contacts for quick access';

