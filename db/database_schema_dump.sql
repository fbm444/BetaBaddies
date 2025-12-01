--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: addupdatetime(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.addupdatetime() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: auto_archive_jobs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_archive_jobs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.autoarchive_time_limit <= CURRENT_DATE THEN
        INSERT INTO archived_prospectivejobs (
            id, user_id, deadline, description, industry, job_type,
            job_title, company, location, salary_low, salary_high, stage,
            status_change_time, personal_notes, salary_notes, date_added,
            job_url, current_resume_id, current_coverletter
        )
        VALUES (
            NEW.id, NEW.user_id, NEW.deadline, NEW.description, NEW.industry, NEW.job_type,
            NEW.job_title, NEW.company, NEW.location, NEW.salary_low, NEW.salary_high, NEW.stage,
            NEW.status_change_time, NEW.personal_notes, NEW.salary_notes, NEW.date_added,
            NEW.job_url, NULL, NEW.current_coverletter
        );

        DELETE FROM prospectivejobs WHERE id = NEW.id;
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: cleanup_expired_market_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.cleanup_expired_market_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.market_intelligence_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_market_cache(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_market_cache() IS 'Removes expired cache entries from market_intelligence_cache';


--
-- Name: cleanup_expired_market_insights(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.cleanup_expired_market_insights() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.market_insights
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_market_insights(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_market_insights() IS 'Removes expired insights from market_insights table';


--
-- Name: log_material_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_material_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO prospectivejob_material_history (job_id, resume_version, coverletter_version)
        VALUES (
            OLD.id,
            OLD.current_resume,
            OLD.current_coverletter
        );
        RETURN OLD;
    END IF;

    IF (NEW.current_resume IS DISTINCT FROM OLD.current_resume)
    OR (NEW.current_coverletter IS DISTINCT FROM OLD.current_coverletter) THEN
        INSERT INTO prospectivejob_material_history (job_id, resume_version, coverletter_version)
        VALUES (
            NEW.id,
            NEW.current_resume,
            NEW.current_coverletter
        );
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: lower_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.lower_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.email = LOWER(NEW.email);
    RETURN NEW;
END;
$$;


--
-- Name: update_coverletter_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_coverletter_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_follow_ups_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_follow_ups_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_interview_feedback_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_interview_feedback_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_interviews_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_interviews_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_market_intelligence_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_market_intelligence_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_pre_assessment_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_pre_assessment_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_reminders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_reminders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_resume_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_resume_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_status_change_time(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_status_change_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        NEW.status_change_time := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_thank_you_notes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_thank_you_notes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accountability_relationships; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.accountability_relationships CASCADE;
CREATE TABLE public.accountability_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    accountability_partner_id uuid NOT NULL,
    relationship_type character varying(50),
    engagement_level character varying(50),
    support_effectiveness integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.activity_logs CASCADE;
CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid,
    user_id uuid,
    actor_role character varying(50),
    activity_type character varying(50) NOT NULL,
    activity_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE activity_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activity_logs IS 'Tracks all team activities for activity feed and analytics';


--
-- Name: advisor_performance_evaluation; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.advisor_performance_evaluation CASCADE;
CREATE TABLE public.advisor_performance_evaluation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    evaluation_period_start date,
    evaluation_period_end date,
    effectiveness_score integer,
    impact_on_job_search text,
    feedback text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: advisor_recommendations; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.advisor_recommendations CASCADE;
CREATE TABLE public.advisor_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    recommendation_type character varying(50),
    recommendation_content text,
    implementation_status character varying(50) DEFAULT 'pending'::character varying,
    impact_assessment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: advisor_sessions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.advisor_sessions CASCADE;
CREATE TABLE public.advisor_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE,
    session_time time without time zone,
    session_notes text,
    action_items jsonb,
    billing_integration_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: advisor_shared_data; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.advisor_shared_data CASCADE;
CREATE TABLE public.advisor_shared_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    data_type character varying(50),
    data_id uuid,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: application_success_analysis; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.application_success_analysis CASCADE;
CREATE TABLE public.application_success_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_period_start date,
    analysis_period_end date,
    success_by_industry jsonb,
    success_by_company_size jsonb,
    success_by_role_type jsonb,
    success_by_application_method jsonb,
    success_by_source jsonb,
    resume_customization_impact numeric,
    cover_letter_customization_impact numeric,
    timing_patterns jsonb,
    recommendations jsonb,
    statistical_significance jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: archived_prospectivejobs; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.archived_prospectivejobs CASCADE;
CREATE TABLE public.archived_prospectivejobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    deadline date,
    description character varying(2000),
    industry character varying(255),
    job_type character varying(255),
    job_title character varying(100) NOT NULL,
    company character varying(255) NOT NULL,
    location character varying(255),
    salary_low numeric,
    salary_high numeric,
    stage character varying(20) NOT NULL,
    status_change_time timestamp with time zone,
    personal_notes text,
    salary_notes text,
    date_added date NOT NULL,
    job_url character varying(1000),
    current_resume_id uuid,
    current_coverletter character varying(1000),
    CONSTRAINT archived_prospectivejobs_stage_check CHECK (((stage)::text = ANY (ARRAY[('Interested'::character varying)::text, ('Applied'::character varying)::text, ('Phone Screen'::character varying)::text, ('Interview'::character varying)::text, ('Offer'::character varying)::text, ('Rejected'::character varying)::text])))
);


--
-- Name: calendar_sync_settings; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.calendar_sync_settings CASCADE;
CREATE TABLE public.calendar_sync_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calendar_provider character varying(50),
    access_token text,
    refresh_token text,
    calendar_id character varying(255),
    sync_enabled boolean DEFAULT false,
    last_sync_at timestamp with time zone
);


--
-- Name: campaign_ab_testing; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.campaign_ab_testing CASCADE;
CREATE TABLE public.campaign_ab_testing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    test_name character varying(255),
    variant_a text,
    variant_b text,
    variant_a_response_rate numeric,
    variant_b_response_rate numeric,
    winning_variant character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: campaign_outreach; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.campaign_outreach CASCADE;
CREATE TABLE public.campaign_outreach (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    outreach_type character varying(50),
    outreach_message text,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    response_received boolean DEFAULT false,
    response_content text,
    relationship_quality character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: career_goals; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.career_goals CASCADE;
CREATE TABLE public.career_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal_type character varying(50),
    goal_category character varying(50),
    goal_description text,
    specific_metric character varying(255),
    target_value numeric,
    current_value numeric DEFAULT 0,
    target_date date,
    progress_percentage numeric DEFAULT 0,
    status character varying(50) DEFAULT 'active'::character varying,
    milestones jsonb,
    achievement_date date,
    impact_on_job_search text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: certifications; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.certifications CASCADE;
CREATE TABLE public.certifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    never_expires boolean NOT NULL,
    name character varying(255) NOT NULL,
    org_name character varying(255) NOT NULL,
    date_earned date NOT NULL,
    expiration_date date
);


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.chat_conversations CASCADE;
CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_type character varying(50) NOT NULL,
    team_id uuid,
    related_entity_type character varying(50),
    related_entity_id uuid,
    title character varying(255),
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_message_at timestamp with time zone
);


--
-- Name: TABLE chat_conversations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_conversations IS 'Chat conversations for team collaboration, mentor-mentee communication, document reviews, etc.';


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.chat_messages CASCADE;
CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message_text text NOT NULL,
    message_type character varying(50) DEFAULT 'text'::character varying,
    attachment_url character varying(500),
    attachment_type character varying(50),
    parent_message_id uuid,
    is_edited boolean DEFAULT false,
    edited_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_messages IS 'Individual messages in chat conversations';


--
-- Name: chat_notifications; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.chat_notifications CASCADE;
CREATE TABLE public.chat_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    message_id uuid,
    notification_type character varying(50) DEFAULT 'new_message'::character varying,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE chat_notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_notifications IS 'Notifications for unread messages and mentions';


--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.chat_participants CASCADE;
CREATE TABLE public.chat_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50),
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_at timestamp with time zone,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE chat_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chat_participants IS 'Users participating in chat conversations';


--
-- Name: coaching_sessions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.coaching_sessions CASCADE;
CREATE TABLE public.coaching_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE,
    session_notes text,
    action_items jsonb,
    followup_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cohort_memberships; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.cohort_memberships CASCADE;
CREATE TABLE public.cohort_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cohort_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: company_info; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.company_info CASCADE;
CREATE TABLE public.company_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    size character varying(255),
    industry character varying(255),
    location character varying(255),
    website character varying(1000),
    description character varying(1000),
    company_logo character varying(1000),
    contact_email character varying(255),
    contact_phone character varying(255),
    mission text,
    culture text,
    "values" text,
    recent_developments text,
    products text,
    competitors text,
    why_work_here text,
    interview_tips text,
    founded_year integer,
    enriched_data jsonb DEFAULT '{}'::jsonb
);


--
-- Name: company_interview_insights; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.company_interview_insights CASCADE;
CREATE TABLE public.company_interview_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    company_key text NOT NULL,
    requested_role text,
    role_key text DEFAULT ''::text NOT NULL,
    job_id uuid,
    payload jsonb NOT NULL,
    source text DEFAULT 'openai'::text,
    prompt_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    last_error text
);


--
-- Name: company_media; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.company_media CASCADE;
CREATE TABLE public.company_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    platform character varying(255) NOT NULL,
    link character varying(1000)
);


--
-- Name: company_news; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.company_news CASCADE;
CREATE TABLE public.company_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    heading character varying(255) NOT NULL,
    description character varying(1000),
    type character varying(255) DEFAULT 'misc'::character varying NOT NULL,
    date date,
    source character varying(255)
);


--
-- Name: competitive_benchmarks; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.competitive_benchmarks CASCADE;
CREATE TABLE public.competitive_benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    benchmark_category character varying(50),
    user_value numeric,
    peer_average numeric,
    top_performer_value numeric,
    percentile_ranking integer,
    benchmark_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: contact_categories; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.contact_categories CASCADE;
CREATE TABLE public.contact_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    category_type character varying(50),
    category_value character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: contact_interactions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.contact_interactions CASCADE;
CREATE TABLE public.contact_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    interaction_type character varying(50),
    interaction_date date DEFAULT CURRENT_DATE,
    summary text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: contact_job_links; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.contact_job_links CASCADE;
CREATE TABLE public.contact_job_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    job_id uuid NOT NULL,
    relationship_to_job character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cover_letter_performance; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.cover_letter_performance CASCADE;
CREATE TABLE public.cover_letter_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coverletter_id uuid NOT NULL,
    job_id uuid,
    application_outcome character varying(50),
    response_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cover_letter_template_usage; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.cover_letter_template_usage CASCADE;
CREATE TABLE public.cover_letter_template_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    user_id uuid,
    usage_count integer DEFAULT 1,
    last_used_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: coverletter; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.coverletter CASCADE;
CREATE TABLE public.coverletter (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_name character varying(255) DEFAULT 'New_CoverLetter'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file character varying(1000),
    comments_id uuid,
    template_id uuid,
    job_id uuid,
    content text,
    tone_settings text,
    customizations text,
    version_number integer DEFAULT 1,
    parent_coverletter_id uuid,
    is_master boolean DEFAULT false,
    company_research jsonb,
    performance_metrics jsonb
);


--
-- Name: coverletter_template; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.coverletter_template CASCADE;
CREATE TABLE public.coverletter_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    description text,
    tone character varying(20) NOT NULL,
    length character varying(20) NOT NULL,
    writing_style character varying(20),
    colors text,
    fonts text,
    existing_coverletter_template character varying(1000),
    CONSTRAINT coverletter_template_length_check CHECK (((length)::text = ANY (ARRAY[('brief'::character varying)::text, ('standard'::character varying)::text, ('detailed'::character varying)::text]))),
    CONSTRAINT coverletter_template_tone_check CHECK (((tone)::text = ANY (ARRAY[('formal'::character varying)::text, ('casual'::character varying)::text, ('enthusiastic'::character varying)::text, ('analytical'::character varying)::text])))
);


--
-- Name: custom_reports; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.custom_reports CASCADE;
CREATE TABLE public.custom_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_name character varying(255),
    report_type character varying(50),
    selected_metrics jsonb,
    date_range_start date,
    date_range_end date,
    filters jsonb,
    report_data jsonb,
    visualization_options jsonb,
    export_format character varying(50),
    exported_file_path character varying(1000),
    shared_with jsonb,
    insights text,
    recommendations text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: discovered_contacts; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.discovered_contacts CASCADE;
CREATE TABLE public.discovered_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_name character varying(255),
    contact_title character varying(255),
    company character varying(255),
    discovery_source character varying(50),
    connection_degree character varying(50),
    mutual_connections jsonb,
    connection_path text,
    relevance_score integer,
    outreach_initiated boolean DEFAULT false,
    added_to_contacts boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: document_approvals; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.document_approvals CASCADE;
CREATE TABLE public.document_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_request_id uuid,
    document_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    approver_id uuid NOT NULL,
    approved boolean DEFAULT false,
    approval_notes text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_approvals_check_type CHECK (((document_type)::text = ANY ((ARRAY['resume'::character varying, 'coverletter'::character varying])::text[])))
);


--
-- Name: document_review_requests; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.document_review_requests CASCADE;
CREATE TABLE public.document_review_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type character varying(50) NOT NULL,
    document_id uuid NOT NULL,
    requestor_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    request_status character varying(50) DEFAULT 'pending'::character varying,
    deadline date,
    review_completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_review_requests_check_status CHECK (((request_status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT document_review_requests_check_type CHECK (((document_type)::text = ANY ((ARRAY['resume'::character varying, 'coverletter'::character varying])::text[])))
);


--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.document_versions CASCADE;
CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type character varying(50) NOT NULL,
    document_id uuid NOT NULL,
    version_number integer NOT NULL,
    version_data jsonb,
    created_by uuid,
    change_summary text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_versions_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['resume'::character varying, 'cover_letter'::character varying])::text[])))
);


--
-- Name: TABLE document_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.document_versions IS 'Version history for resumes and cover letters';


--
-- Name: educations; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.educations CASCADE;
CREATE TABLE public.educations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    school character varying(255) NOT NULL,
    degree_type character varying(20) NOT NULL,
    field character varying(255),
    honors character varying(1000),
    gpa numeric(4,3),
    is_enrolled boolean NOT NULL,
    graddate date NOT NULL,
    startdate date
);


--
-- Name: enterprise_accounts; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.enterprise_accounts CASCADE;
CREATE TABLE public.enterprise_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_name character varying(255) NOT NULL,
    organization_type character varying(50),
    admin_user_id uuid NOT NULL,
    white_label_branding jsonb,
    max_users integer,
    active_users integer DEFAULT 0,
    subscription_tier character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: event_connections; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.event_connections CASCADE;
CREATE TABLE public.event_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    connection_quality character varying(50),
    followup_required boolean DEFAULT false,
    followup_completed boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.event_registrations CASCADE;
CREATE TABLE public.event_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    registered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'registered'::character varying,
    notes text
);


--
-- Name: external_advisors; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.external_advisors CASCADE;
CREATE TABLE public.external_advisors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    advisor_name character varying(255),
    advisor_email character varying(255),
    advisor_type character varying(50),
    relationship_status character varying(50) DEFAULT 'invited'::character varying,
    permissions_granted jsonb,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: family_progress_summaries; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.family_progress_summaries CASCADE;
CREATE TABLE public.family_progress_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    summary_period_start date,
    summary_period_end date,
    summary_content text,
    milestones_shared jsonb,
    celebrations jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: family_support_access; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.family_support_access CASCADE;
CREATE TABLE public.family_support_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    family_member_email character varying(255),
    family_member_name character varying(255),
    relationship character varying(50),
    access_level character varying(50),
    educational_resources_provided boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: feedback_themes; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.feedback_themes CASCADE;
CREATE TABLE public.feedback_themes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    theme_name character varying(50) NOT NULL,
    description text,
    category character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_themes_category_check CHECK (((category)::text = ANY ((ARRAY['strength'::character varying, 'weakness'::character varying, 'neutral'::character varying])::text[])))
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.files CASCADE;
CREATE TABLE public.files (
    file_id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_data character varying(255),
    file_path character varying(255)
);


--
-- Name: followup_templates; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.followup_templates CASCADE;
CREATE TABLE public.followup_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_type character varying(50),
    template_name character varying(255),
    subject_template character varying(500),
    body_template text,
    timing_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: goal_milestones; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.goal_milestones CASCADE;
CREATE TABLE public.goal_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    milestone_description text,
    target_date date,
    completed boolean DEFAULT false,
    completed_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: group_challenges; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.group_challenges CASCADE;
CREATE TABLE public.group_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    challenge_name character varying(255) NOT NULL,
    challenge_description text,
    start_date date,
    end_date date,
    participation_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: group_discussions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.group_discussions CASCADE;
CREATE TABLE public.group_discussions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    topic character varying(255),
    content text,
    is_anonymous boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: group_memberships; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.group_memberships CASCADE;
CREATE TABLE public.group_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: industry_trends; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.industry_trends CASCADE;
CREATE TABLE public.industry_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry character varying(255),
    trend_category character varying(50),
    trend_data jsonb,
    trend_description text,
    impact_analysis text,
    data_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: informational_interview_templates; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.informational_interview_templates CASCADE;
CREATE TABLE public.informational_interview_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    preparation_framework text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: informational_interviews; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.informational_interviews CASCADE;
CREATE TABLE public.informational_interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    request_status character varying(50) DEFAULT 'pending'::character varying,
    outreach_template_id uuid,
    request_sent_at timestamp with time zone,
    scheduled_date date,
    scheduled_time time without time zone,
    preparation_framework jsonb,
    completed boolean DEFAULT false,
    completed_date date,
    insights text,
    industry_intelligence text,
    followup_sent boolean DEFAULT false,
    relationship_outcome character varying(255),
    linked_to_opportunities jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interview_analytics; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_analytics CASCADE;
CREATE TABLE public.interview_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_id uuid NOT NULL,
    company_type character varying(50),
    interview_format character varying(50),
    performance_areas jsonb,
    conversion_to_offer boolean,
    feedback_themes jsonb,
    improvement_recommendations jsonb,
    benchmark_comparison jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interview_conflicts; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_conflicts CASCADE;
CREATE TABLE public.interview_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    conflicting_interview_id uuid NOT NULL,
    conflict_type character varying(20) NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    CONSTRAINT interview_conflicts_conflict_type_check CHECK (((conflict_type)::text = ANY ((ARRAY['overlap'::character varying, 'too_close'::character varying])::text[])))
);


--
-- Name: interview_feedback; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_feedback CASCADE;
CREATE TABLE public.interview_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    skill_area character varying(50) NOT NULL,
    score integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confidence_level integer,
    anxiety_level integer,
    preparation_hours integer DEFAULT 0,
    feedback_theme character varying(50),
    sentiment_score numeric(3,2),
    keywords text[],
    CONSTRAINT interview_feedback_anxiety_level_check CHECK (((anxiety_level IS NULL) OR ((anxiety_level >= 0) AND (anxiety_level <= 100)))),
    CONSTRAINT interview_feedback_confidence_level_check CHECK (((confidence_level IS NULL) OR ((confidence_level >= 0) AND (confidence_level <= 100)))),
    CONSTRAINT interview_feedback_score_check CHECK (((score >= 0) AND (score <= 100))),
    CONSTRAINT interview_feedback_sentiment_score_check CHECK (((sentiment_score IS NULL) OR ((sentiment_score >= '-1.0'::numeric) AND (sentiment_score <= 1.0)))),
    CONSTRAINT interview_feedback_skill_area_check CHECK (((skill_area)::text = ANY ((ARRAY['system_design'::character varying, 'algorithms'::character varying, 'apis'::character varying, 'behavioral'::character varying, 'time_management'::character varying])::text[])))
);


--
-- Name: TABLE interview_feedback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interview_feedback IS 'Stores performance assessments for interviews across different skill areas';


--
-- Name: COLUMN interview_feedback.skill_area; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interview_feedback.skill_area IS 'Skill area: system_design, algorithms, apis, behavioral, or time_management';


--
-- Name: COLUMN interview_feedback.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interview_feedback.score IS 'Performance score from 0 to 100';


--
-- Name: interview_follow_ups; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_follow_ups CASCADE;
CREATE TABLE public.interview_follow_ups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    action_type character varying(50) NOT NULL,
    due_date timestamp with time zone,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_follow_ups_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['thank_you_note'::character varying, 'follow_up_email'::character varying, 'status_inquiry'::character varying, 'references_sent'::character varying, 'portfolio_sent'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: TABLE interview_follow_ups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interview_follow_ups IS 'Tracks follow-up actions recommended after interviews';


--
-- Name: interview_followups; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_followups CASCADE;
CREATE TABLE public.interview_followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    template_type character varying(50),
    recipient_name character varying(255),
    recipient_email character varying(255),
    subject character varying(500),
    message_body text,
    conversation_references jsonb,
    sent_at timestamp with time zone,
    response_received boolean DEFAULT false,
    response_received_at timestamp with time zone,
    response_content text
);


--
-- Name: interview_performance_tracking; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_performance_tracking CASCADE;
CREATE TABLE public.interview_performance_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tracking_period_start date,
    tracking_period_end date,
    interview_to_offer_rate numeric,
    performance_by_format jsonb,
    performance_by_industry jsonb,
    performance_by_company_culture jsonb,
    improvement_trends jsonb,
    feedback_themes jsonb,
    common_improvement_areas jsonb,
    coaching_recommendations jsonb,
    benchmark_comparison jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interview_post_reflection; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_post_reflection CASCADE;
CREATE TABLE public.interview_post_reflection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    post_confidence_level integer,
    post_anxiety_level integer,
    what_went_well text,
    what_to_improve text,
    overall_feeling character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_post_reflection_post_anxiety_level_check CHECK (((post_anxiety_level IS NULL) OR ((post_anxiety_level >= 0) AND (post_anxiety_level <= 100)))),
    CONSTRAINT interview_post_reflection_post_confidence_level_check CHECK (((post_confidence_level IS NULL) OR ((post_confidence_level >= 0) AND (post_confidence_level <= 100))))
);


--
-- Name: TABLE interview_post_reflection; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interview_post_reflection IS 'Post-interview reflections for tracking emotional state and learnings';


--
-- Name: interview_pre_assessment; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_pre_assessment CASCADE;
CREATE TABLE public.interview_pre_assessment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    confidence_level integer NOT NULL,
    anxiety_level integer NOT NULL,
    preparation_hours integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_pre_assessment_anxiety_level_check CHECK (((anxiety_level >= 0) AND (anxiety_level <= 100))),
    CONSTRAINT interview_pre_assessment_confidence_level_check CHECK (((confidence_level >= 0) AND (confidence_level <= 100))),
    CONSTRAINT interview_pre_assessment_preparation_hours_check CHECK ((preparation_hours >= 0))
);


--
-- Name: TABLE interview_pre_assessment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interview_pre_assessment IS 'Pre-interview assessments for tracking confidence, anxiety, and preparation';


--
-- Name: COLUMN interview_pre_assessment.confidence_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interview_pre_assessment.confidence_level IS 'Confidence level before interview (0-100)';


--
-- Name: COLUMN interview_pre_assessment.anxiety_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interview_pre_assessment.anxiety_level IS 'Anxiety level before interview (0-100)';


--
-- Name: interview_preparation_checklists; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_preparation_checklists CASCADE;
CREATE TABLE public.interview_preparation_checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    user_id uuid NOT NULL,
    checklist_items jsonb,
    role_specific_tasks jsonb,
    company_research_verified boolean DEFAULT false,
    questions_prepared boolean DEFAULT false,
    attire_selected character varying(255),
    logistics_verified boolean DEFAULT false,
    technology_setup_verified boolean DEFAULT false,
    portfolio_prepared boolean DEFAULT false,
    confidence_activities_completed boolean DEFAULT false,
    completion_percentage integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interview_preparation_tasks; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_preparation_tasks CASCADE;
CREATE TABLE public.interview_preparation_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    task character varying(500) NOT NULL,
    completed boolean DEFAULT false,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    assigned_by uuid,
    assigned_to uuid,
    team_id uuid,
    task_type character varying(50) DEFAULT 'interview_prep'::character varying
);


--
-- Name: interview_question_banks; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_question_banks CASCADE;
CREATE TABLE public.interview_question_banks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    difficulty_level character varying(20),
    category character varying(50),
    question_text text NOT NULL,
    star_framework_guidance text,
    industry_specific boolean DEFAULT false,
    linked_skills jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interview_reminders; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_reminders CASCADE;
CREATE TABLE public.interview_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    reminder_type character varying(20) NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_reminders_reminder_type_check CHECK (((reminder_type)::text = ANY ((ARRAY['24_hours'::character varying, '2_hours'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT interview_reminders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE interview_reminders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interview_reminders IS 'Tracks scheduled email reminders for interviews (24h and 2h before)';


--
-- Name: interview_response_coaching; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_response_coaching CASCADE;
CREATE TABLE public.interview_response_coaching (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    practice_session_id uuid,
    original_response text,
    ai_feedback jsonb,
    content_score integer,
    structure_score integer,
    clarity_score integer,
    relevance_score integer,
    specificity_score integer,
    impact_score integer,
    response_length integer,
    recommended_length integer,
    weak_language_patterns jsonb,
    suggested_alternatives jsonb,
    star_method_adherence integer,
    alternative_approaches jsonb,
    improvement_tracking jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interview_success_probability; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_success_probability CASCADE;
CREATE TABLE public.interview_success_probability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_id uuid NOT NULL,
    preparation_level integer,
    role_match_score integer,
    company_research_completion integer,
    practice_hours numeric,
    historical_performance_factor numeric,
    success_probability integer,
    confidence_score integer,
    recommendations jsonb,
    prediction_factors jsonb,
    actual_outcome character varying(50),
    prediction_accuracy boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interview_thank_you_notes; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interview_thank_you_notes CASCADE;
CREATE TABLE public.interview_thank_you_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    recipient_email character varying(255) NOT NULL,
    recipient_name character varying(255),
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    sent_at timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT interview_thank_you_notes_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE interview_thank_you_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interview_thank_you_notes IS 'Tracks thank-you notes sent after interviews';


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.interviews CASCADE;
CREATE TABLE public.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    date timestamp with time zone,
    outcome_link character varying(255),
    job_opportunity_id uuid,
    title character varying(255),
    scheduled_at timestamp with time zone,
    duration integer DEFAULT 60,
    location character varying(500),
    video_link character varying(1000),
    phone_number character varying(50),
    interviewer_name character varying(255),
    interviewer_email character varying(255),
    interviewer_title character varying(255),
    notes text,
    preparation_notes text,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    outcome character varying(20) DEFAULT 'pending'::character varying,
    outcome_notes text,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    rescheduled_from uuid,
    rescheduled_to uuid,
    conflict_detected boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company character varying(255),
    google_calendar_event_id character varying(255),
    format character varying(50),
    is_practice boolean DEFAULT false,
    interview_round integer DEFAULT 1,
    confidence_rating integer,
    difficulty_rating integer,
    preparation_hours numeric,
    questions_asked text[],
    improvement_areas text[],
    feedback_notes text,
    interview_type character varying(50),
    CONSTRAINT interviews_confidence_rating_check CHECK (((confidence_rating IS NULL) OR ((confidence_rating >= 1) AND (confidence_rating <= 5)))),
    CONSTRAINT interviews_difficulty_rating_check CHECK (((difficulty_rating IS NULL) OR ((difficulty_rating >= 1) AND (difficulty_rating <= 5)))),
    CONSTRAINT interviews_format_check CHECK (((format IS NULL) OR ((format)::text = ANY ((ARRAY['phone_screen'::character varying, 'hirevue'::character varying, 'technical'::character varying, 'behavioral'::character varying, 'on_site'::character varying, 'system_design'::character varying, 'other'::character varying])::text[])))),
    CONSTRAINT interviews_outcome_check CHECK (((outcome)::text = ANY ((ARRAY['pending'::character varying, 'passed'::character varying, 'failed'::character varying, 'no_decision'::character varying, 'offer_extended'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT interviews_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'rescheduled'::character varying])::text[]))),
    CONSTRAINT interviews_type_check CHECK (((type)::text = ANY (ARRAY[('phone'::character varying)::text, ('video'::character varying)::text, ('in-person'::character varying)::text])))
);


--
-- Name: COLUMN interviews.format; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.format IS 'Interview format/category: phone_screen, hirevue, technical, behavioral, on_site, system_design, or other';


--
-- Name: COLUMN interviews.is_practice; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.is_practice IS 'True if this is a practice/mock interview, false if real interview';


--
-- Name: COLUMN interviews.interview_round; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.interview_round IS 'Interview round number (1, 2, 3, etc.)';


--
-- Name: COLUMN interviews.confidence_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.confidence_rating IS 'Self-rated confidence level (1-5)';


--
-- Name: COLUMN interviews.difficulty_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.difficulty_rating IS 'Self-rated difficulty level (1-5)';


--
-- Name: COLUMN interviews.preparation_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.preparation_hours IS 'Hours spent preparing for this interview';


--
-- Name: COLUMN interviews.questions_asked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.questions_asked IS 'Array of questions asked during the interview';


--
-- Name: COLUMN interviews.improvement_areas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.improvement_areas IS 'Array of areas identified for improvement';


--
-- Name: COLUMN interviews.feedback_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interviews.feedback_notes IS 'Detailed feedback and notes from the interview';


--
-- Name: job_comments; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.job_comments CASCADE;
CREATE TABLE public.job_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    team_id uuid,
    user_id uuid,
    parent_comment_id uuid,
    comment_text text NOT NULL,
    is_suggestion boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE job_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.job_comments IS 'Collaborative comments on shared job postings';


--
-- Name: job_opportunities; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.job_opportunities CASCADE;
CREATE TABLE public.job_opportunities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    company character varying(255) NOT NULL,
    location character varying(256) NOT NULL,
    salary_min numeric,
    salary_max numeric,
    job_posting_url character varying(1000),
    application_deadline date,
    job_description text,
    industry character varying(255),
    job_type character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'Interested'::character varying NOT NULL,
    status_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    recruiter_name character varying(255),
    recruiter_email character varying(255),
    recruiter_phone character varying(50),
    hiring_manager_name character varying(255),
    hiring_manager_email character varying(255),
    hiring_manager_phone character varying(50),
    salary_negotiation_notes text,
    interview_notes text,
    application_history jsonb DEFAULT '[]'::jsonb,
    archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archive_reason character varying(255),
    application_source character varying(100),
    application_method character varying(100),
    referral_contact_name character varying(255),
    referral_contact_email character varying(255),
    application_submitted_at timestamp with time zone,
    first_response_at timestamp with time zone,
    interview_scheduled_at timestamp with time zone,
    CONSTRAINT check_job_opportunity_status CHECK (((status)::text = ANY ((ARRAY['Interested'::character varying, 'Applied'::character varying, 'Phone Screen'::character varying, 'Interview'::character varying, 'Offer'::character varying, 'Rejected'::character varying])::text[])))
);


--
-- Name: TABLE job_opportunities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.job_opportunities IS 'Tracks job opportunities that users are interested in applying for';


--
-- Name: COLUMN job_opportunities.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.title IS 'Job title/position name';


--
-- Name: COLUMN job_opportunities.company; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.company IS 'Company name';


--
-- Name: COLUMN job_opportunities.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.location IS 'Job location (city, state, remote, etc.)';


--
-- Name: COLUMN job_opportunities.salary_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.salary_min IS 'Minimum salary in the range';


--
-- Name: COLUMN job_opportunities.salary_max; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.salary_max IS 'Maximum salary in the range';


--
-- Name: COLUMN job_opportunities.job_posting_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.job_posting_url IS 'URL to the original job posting';


--
-- Name: COLUMN job_opportunities.application_deadline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.application_deadline IS 'Application deadline date';


--
-- Name: COLUMN job_opportunities.job_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.job_description IS 'Job description (max 2000 characters)';


--
-- Name: COLUMN job_opportunities.industry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.industry IS 'Industry sector';


--
-- Name: COLUMN job_opportunities.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.job_type IS 'Job type (Full-time, Part-time, Contract, etc.)';


--
-- Name: COLUMN job_opportunities.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.status IS 'Application status: Interested, Applied, Phone Screen, Interview, Offer, Rejected';


--
-- Name: COLUMN job_opportunities.status_updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.status_updated_at IS 'Timestamp when the status was last updated';


--
-- Name: COLUMN job_opportunities.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.notes IS 'Personal notes and observations about the job opportunity (unlimited text)';


--
-- Name: COLUMN job_opportunities.recruiter_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.recruiter_name IS 'Name of the recruiter contact';


--
-- Name: COLUMN job_opportunities.recruiter_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.recruiter_email IS 'Email address of the recruiter';


--
-- Name: COLUMN job_opportunities.recruiter_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.recruiter_phone IS 'Phone number of the recruiter';


--
-- Name: COLUMN job_opportunities.hiring_manager_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.hiring_manager_name IS 'Name of the hiring manager';


--
-- Name: COLUMN job_opportunities.hiring_manager_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.hiring_manager_email IS 'Email address of the hiring manager';


--
-- Name: COLUMN job_opportunities.hiring_manager_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.hiring_manager_phone IS 'Phone number of the hiring manager';


--
-- Name: COLUMN job_opportunities.salary_negotiation_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.salary_negotiation_notes IS 'Notes about salary negotiations';


--
-- Name: COLUMN job_opportunities.interview_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.interview_notes IS 'Interview notes and feedback';


--
-- Name: COLUMN job_opportunities.application_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.application_history IS 'Application history log as JSON array with timestamp, status, and notes';


--
-- Name: COLUMN job_opportunities.archived; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.archived IS 'Whether the job opportunity has been archived';


--
-- Name: COLUMN job_opportunities.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.archived_at IS 'Timestamp when the job opportunity was archived';


--
-- Name: COLUMN job_opportunities.archive_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.archive_reason IS 'Reason for archiving the job opportunity';


--
-- Name: COLUMN job_opportunities.application_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.application_source IS 'How the job opportunity was found';


--
-- Name: COLUMN job_opportunities.application_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.application_method IS 'Method used to submit application';


--
-- Name: COLUMN job_opportunities.application_submitted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.application_submitted_at IS 'When the application was actually submitted';


--
-- Name: COLUMN job_opportunities.first_response_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.first_response_at IS 'When first response was received from employer';


--
-- Name: COLUMN job_opportunities.interview_scheduled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_opportunities.interview_scheduled_at IS 'When first interview was scheduled';


--
-- Name: job_search_metrics; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.job_search_metrics CASCADE;
CREATE TABLE public.job_search_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    metric_date date DEFAULT CURRENT_DATE,
    applications_sent integer DEFAULT 0,
    interviews_scheduled integer DEFAULT 0,
    offers_received integer DEFAULT 0,
    application_to_interview_rate numeric,
    interview_to_offer_rate numeric,
    avg_time_to_response_days numeric,
    avg_time_to_interview_days numeric,
    goal_applications integer,
    goal_interviews integer,
    goal_offers integer,
    progress_percentage numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.jobs CASCADE;
CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    company character varying(255) NOT NULL,
    location character varying(255),
    end_date date,
    is_current boolean DEFAULT false NOT NULL,
    description character varying(1000),
    salary numeric,
    start_date date NOT NULL
);


--
-- Name: linkedin_networking_templates; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.linkedin_networking_templates CASCADE;
CREATE TABLE public.linkedin_networking_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_type character varying(50),
    template_name character varying(255),
    message_template text,
    optimization_suggestions text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: linkedin_profile_optimization; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.linkedin_profile_optimization CASCADE;
CREATE TABLE public.linkedin_profile_optimization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    optimization_area character varying(50),
    current_content text,
    suggested_improvements text,
    best_practices text,
    implemented boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: market_insights; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.market_insights CASCADE;
CREATE TABLE public.market_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    insight_type character varying(50) NOT NULL,
    title character varying(500) NOT NULL,
    description text NOT NULL,
    priority character varying(20) NOT NULL,
    actionable_items jsonb,
    supporting_data jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT market_insights_priority_check CHECK (((priority)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[]))),
    CONSTRAINT market_insights_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'dismissed'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: TABLE market_insights; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.market_insights IS 'AI-generated personalized career insights and recommendations';


--
-- Name: COLUMN market_insights.insight_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_insights.insight_type IS 'Type: skill_gap, career_move, salary_positioning, market_opportunity, disruption_alert';


--
-- Name: COLUMN market_insights.actionable_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_insights.actionable_items IS 'JSONB array of specific steps user can take to act on this insight';


--
-- Name: COLUMN market_insights.supporting_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_insights.supporting_data IS 'JSONB containing metrics, trends, and data supporting the recommendation';


--
-- Name: COLUMN market_insights.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_insights.status IS 'User can mark insights as dismissed or completed';


--
-- Name: market_intelligence; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.market_intelligence CASCADE;
CREATE TABLE public.market_intelligence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    industry character varying(255),
    location character varying(255),
    intelligence_type character varying(50),
    data_points jsonb,
    trend_analysis text,
    insights text,
    recommendations text,
    data_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: market_intelligence_cache; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.market_intelligence_cache CASCADE;
CREATE TABLE public.market_intelligence_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key character varying(500) NOT NULL,
    data_type character varying(50) NOT NULL,
    data jsonb NOT NULL,
    metadata jsonb,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE market_intelligence_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.market_intelligence_cache IS 'Caches aggregated market intelligence data to optimize performance';


--
-- Name: COLUMN market_intelligence_cache.cache_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_intelligence_cache.cache_key IS 'Unique identifier for cached data (includes filters like industry, location, period)';


--
-- Name: COLUMN market_intelligence_cache.data_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_intelligence_cache.data_type IS 'Type of cached data: industry_trends, salary_trends, skill_demand, hiring_velocity, etc.';


--
-- Name: COLUMN market_intelligence_cache.data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_intelligence_cache.data IS 'JSONB containing the cached calculation results';


--
-- Name: COLUMN market_intelligence_cache.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_intelligence_cache.metadata IS 'Additional context like sample_size, date_ranges, confidence_score';


--
-- Name: COLUMN market_intelligence_cache.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.market_intelligence_cache.expires_at IS 'When this cache entry expires and should be refreshed';


--
-- Name: market_salary_data; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.market_salary_data CASCADE;
CREATE TABLE public.market_salary_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role character varying(255),
    industry character varying(255),
    location character varying(255),
    experience_level character varying(50),
    salary_25th_percentile numeric,
    salary_50th_percentile numeric,
    salary_75th_percentile numeric,
    data_source character varying(255),
    data_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mentor_dashboard_data; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mentor_dashboard_data CASCADE;
CREATE TABLE public.mentor_dashboard_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    summary_data jsonb,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mentor_dashboard_views; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mentor_dashboard_views CASCADE;
CREATE TABLE public.mentor_dashboard_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    dashboard_snapshot jsonb,
    key_indicators jsonb,
    coaching_insights jsonb,
    development_recommendations jsonb,
    last_viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mentor_feedback; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mentor_feedback CASCADE;
CREATE TABLE public.mentor_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    feedback_type character varying(50),
    feedback_content text,
    recommendations text,
    implemented boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mentor_relationships; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mentor_relationships CASCADE;
CREATE TABLE public.mentor_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    relationship_type character varying(50),
    permissions_granted jsonb,
    invitation_status character varying(50) DEFAULT 'pending'::character varying,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mentor_shared_data; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mentor_shared_data CASCADE;
CREATE TABLE public.mentor_shared_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    data_type character varying(50),
    data_id uuid,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    team_id uuid
);


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.message_reactions CASCADE;
CREATE TABLE public.message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction_type character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE message_reactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_reactions IS 'Reactions to messages (likes, thumbs up, etc.)';


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.milestones CASCADE;
CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    team_id uuid,
    milestone_type character varying(50) NOT NULL,
    milestone_title character varying(255) NOT NULL,
    milestone_description text,
    milestone_data jsonb DEFAULT '{}'::jsonb,
    achieved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    shared_with_team boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE milestones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.milestones IS 'Achievement milestones for celebration and motivation';


--
-- Name: mock_interview_followups; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mock_interview_followups CASCADE;
CREATE TABLE public.mock_interview_followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    followup_text text NOT NULL,
    response text,
    sequence_number integer
);


--
-- Name: mock_interview_messages; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mock_interview_messages CASCADE;
CREATE TABLE public.mock_interview_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'message'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mock_interview_messages_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: mock_interview_questions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mock_interview_questions CASCADE;
CREATE TABLE public.mock_interview_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying(50),
    sequence_number integer,
    written_response text,
    response_length integer,
    time_spent integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mock_interview_sessions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mock_interview_sessions CASCADE;
CREATE TABLE public.mock_interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid,
    target_role character varying(255),
    target_company character varying(255),
    interview_format character varying(50),
    status character varying(50) DEFAULT 'in_progress'::character varying,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    performance_summary jsonb,
    improvement_areas jsonb,
    confidence_score integer,
    pacing_recommendations text,
    interview_id uuid
);


--
-- Name: mutual_connections; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.mutual_connections CASCADE;
CREATE TABLE public.mutual_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    mutual_contact_id uuid NOT NULL,
    connection_strength character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: network_roi_analytics; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.network_roi_analytics CASCADE;
CREATE TABLE public.network_roi_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_period_start date,
    analysis_period_end date,
    networking_activity_volume integer,
    referrals_generated integer,
    opportunities_from_network integer,
    referral_conversion_rate numeric,
    relationship_strength_development jsonb,
    event_roi_scores jsonb,
    relationship_reciprocity_score numeric,
    most_effective_strategies jsonb,
    industry_benchmarks jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: networking_campaigns; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.networking_campaigns CASCADE;
CREATE TABLE public.networking_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    campaign_name character varying(255) NOT NULL,
    target_companies jsonb,
    target_industries jsonb,
    target_roles jsonb,
    campaign_goals text,
    timeline_start date,
    timeline_end date,
    outreach_volume integer DEFAULT 0,
    response_rate numeric,
    campaign_status character varying(50) DEFAULT 'planning'::character varying,
    effectiveness_score integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: networking_events; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.networking_events CASCADE;
CREATE TABLE public.networking_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_name character varying(255) NOT NULL,
    event_type character varying(50),
    industry character varying(255),
    location character varying(255),
    event_date date,
    event_time time without time zone,
    event_url character varying(1000),
    description text,
    networking_goals text,
    preparation_notes text,
    attended boolean DEFAULT false,
    attendance_date date,
    post_event_notes text,
    roi_score integer,
    connections_made_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cancelled boolean DEFAULT false,
    cancelled_at timestamp with time zone,
    end_date date,
    end_time time without time zone
);


--
-- Name: networking_goals; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.networking_goals CASCADE;
CREATE TABLE public.networking_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    goal_description text,
    target_industry character varying(255),
    target_companies jsonb,
    target_roles jsonb,
    goal_type character varying(50),
    target_count integer,
    current_count integer DEFAULT 0,
    deadline date,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    event_id uuid
);


--
-- Name: peer_referrals; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.peer_referrals CASCADE;
CREATE TABLE public.peer_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    job_opportunity_id uuid NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: performance_predictions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.performance_predictions CASCADE;
CREATE TABLE public.performance_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prediction_type character varying(50),
    prediction_value numeric,
    confidence_interval_lower numeric,
    confidence_interval_upper numeric,
    confidence_level integer,
    prediction_factors jsonb,
    scenario_planning jsonb,
    recommendations jsonb,
    prediction_date date DEFAULT CURRENT_DATE,
    actual_outcome character varying(255),
    prediction_accuracy boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: performance_trends; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.performance_trends CASCADE;
CREATE TABLE public.performance_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    metric_type character varying(50),
    trend_direction character varying(50),
    trend_period character varying(50),
    data_points jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: practice_sessions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.practice_sessions CASCADE;
CREATE TABLE public.practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_date timestamp with time zone NOT NULL,
    format character varying(50) NOT NULL,
    duration_minutes integer,
    overall_score integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT practice_sessions_overall_score_check CHECK (((overall_score IS NULL) OR ((overall_score >= 0) AND (overall_score <= 100))))
);


--
-- Name: TABLE practice_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.practice_sessions IS 'Tracks practice interview sessions separately from real interviews';


--
-- Name: COLUMN practice_sessions.format; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.practice_sessions.format IS 'Practice session format: technical, behavioral, system_design, etc.';


--
-- Name: COLUMN practice_sessions.overall_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.practice_sessions.overall_score IS 'Overall performance score from 0 to 100';


--
-- Name: preparation_tasks; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.preparation_tasks CASCADE;
CREATE TABLE public.preparation_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid,
    assigned_by uuid,
    assigned_by_role character varying(50),
    assigned_to uuid,
    assigned_to_role character varying(50),
    task_type character varying(50) NOT NULL,
    task_title character varying(255) NOT NULL,
    task_description text,
    task_data jsonb DEFAULT '{}'::jsonb,
    due_date date,
    status character varying(50) DEFAULT 'pending'::character varying,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT preparation_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE preparation_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.preparation_tasks IS 'Tasks assigned by mentors/admins to candidates for interview prep and job search activities';


--
-- Name: productivity_analysis; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.productivity_analysis CASCADE;
CREATE TABLE public.productivity_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_period_start date,
    analysis_period_end date,
    time_by_activity jsonb,
    productivity_patterns jsonb,
    optimal_schedule jsonb,
    task_completion_rates jsonb,
    efficiency_improvements jsonb,
    time_vs_outcome_correlation jsonb,
    burnout_indicators jsonb,
    recommendations jsonb,
    avg_productivity_score numeric,
    productivity_score_trends jsonb,
    productivity_score_by_activity jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: professional_contacts; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.professional_contacts CASCADE;
CREATE TABLE public.professional_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    email character varying(255),
    phone character varying(50),
    company character varying(255),
    job_title character varying(255),
    industry character varying(255),
    location character varying(255),
    relationship_type character varying(50),
    relationship_strength character varying(50),
    relationship_context text,
    personal_interests text,
    professional_interests text,
    linkedin_url character varying(1000),
    notes text,
    imported_from character varying(50),
    last_interaction_date date,
    next_reminder_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: professional_references; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.professional_references CASCADE;
CREATE TABLE public.professional_references (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    reference_type character varying(50),
    relationship_context text,
    reference_strength character varying(50),
    availability_status character varying(50) DEFAULT 'available'::character varying,
    preferred_contact_method character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
    first_name character varying(255) NOT NULL,
    middle_name character varying(255),
    last_name character varying(255) NOT NULL,
    phone character varying(15),
    city character varying(255),
    state character(2) NOT NULL,
    job_title character varying(255),
    bio character varying(500),
    industry character varying(255),
    exp_level character varying(10),
    user_id uuid NOT NULL,
    pfp_link character varying(1000) DEFAULT 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'::character varying NOT NULL
);


--
-- Name: program_effectiveness_analytics; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.program_effectiveness_analytics CASCADE;
CREATE TABLE public.program_effectiveness_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    cohort_id uuid,
    analysis_period_start date,
    analysis_period_end date,
    aggregate_metrics jsonb,
    outcome_tracking jsonb,
    roi_calculations jsonb,
    program_optimization_insights jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: progress_reports; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.progress_reports CASCADE;
CREATE TABLE public.progress_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_period_start date,
    report_period_end date,
    report_data jsonb,
    shared_with jsonb,
    goal_progress jsonb,
    milestone_achievements jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: progress_shares; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.progress_shares CASCADE;
CREATE TABLE public.progress_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    shared_with_user_id uuid,
    shared_with_team_id uuid,
    share_type character varying(50) NOT NULL,
    privacy_level character varying(50) DEFAULT 'team'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT progress_shares_check CHECK ((((shared_with_user_id IS NOT NULL) AND (shared_with_team_id IS NULL)) OR ((shared_with_user_id IS NULL) AND (shared_with_team_id IS NOT NULL)))),
    CONSTRAINT progress_shares_privacy_level_check CHECK (((privacy_level)::text = ANY ((ARRAY['private'::character varying, 'team'::character varying, 'mentors_only'::character varying])::text[])))
);


--
-- Name: TABLE progress_shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.progress_shares IS 'Progress sharing configuration for accountability and mentor visibility';


--
-- Name: progress_sharing_settings; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.progress_sharing_settings CASCADE;
CREATE TABLE public.progress_sharing_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    sharing_level character varying(50),
    shared_data_types jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.projects CASCADE;
CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    link character varying(500),
    description character varying(500),
    start_date date NOT NULL,
    end_date date,
    technologies character varying(500),
    collaborators character varying(255),
    status character varying(10) NOT NULL,
    industry character varying(255)
);


--
-- Name: prospectivejob_material_history; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.prospectivejob_material_history CASCADE;
CREATE TABLE public.prospectivejob_material_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    resume_version character varying(1000),
    coverletter_version character varying(1000),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: prospectivejobs; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.prospectivejobs CASCADE;
CREATE TABLE public.prospectivejobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    deadline date,
    description character varying(255),
    industry character varying(255),
    job_type character varying(255),
    job_title character varying(100),
    company character varying(255),
    location character varying(255),
    salary_low numeric,
    salary_high numeric,
    stage character varying(20) NOT NULL,
    status_change_time timestamp with time zone DEFAULT now(),
    personal_notes text,
    salary_notes text,
    date_added date DEFAULT CURRENT_DATE NOT NULL,
    job_url character varying(1000),
    current_resume character varying(1000),
    current_coverletter character varying(1000),
    autoarchive_time_limit date DEFAULT (CURRENT_DATE + '1 year'::interval),
    CONSTRAINT prospectivejobs_stage_check CHECK (((stage)::text = ANY (ARRAY[('Interested'::character varying)::text, ('Applied'::character varying)::text, ('Phone Screen'::character varying)::text, ('Interview'::character varying)::text, ('Offer'::character varying)::text, ('Rejected'::character varying)::text])))
);


--
-- Name: question_practice_sessions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.question_practice_sessions CASCADE;
CREATE TABLE public.question_practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    job_id uuid,
    written_response text,
    practiced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    improvement_notes text
);


--
-- Name: reference_portfolios; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.reference_portfolios CASCADE;
CREATE TABLE public.reference_portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    portfolio_name character varying(255),
    career_goal character varying(255),
    reference_ids jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: reference_request_templates; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.reference_request_templates CASCADE;
CREATE TABLE public.reference_request_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    preparation_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: reference_requests; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.reference_requests CASCADE;
CREATE TABLE public.reference_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_id uuid NOT NULL,
    job_id uuid NOT NULL,
    request_sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    request_template_id uuid,
    preparation_materials jsonb,
    role_specific_talking_points text,
    reference_provided boolean DEFAULT false,
    reference_feedback text,
    impact_on_application character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: referral_requests; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.referral_requests CASCADE;
CREATE TABLE public.referral_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    job_id uuid NOT NULL,
    request_template_id uuid,
    personalized_message text,
    request_status character varying(50) DEFAULT 'pending'::character varying,
    sent_at timestamp with time zone,
    response_received_at timestamp with time zone,
    response_content text,
    referral_successful boolean,
    followup_required boolean DEFAULT false,
    followup_sent_at timestamp with time zone,
    gratitude_expressed boolean DEFAULT false,
    relationship_impact character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: referral_templates; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.referral_templates CASCADE;
CREATE TABLE public.referral_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    etiquette_guidance text,
    timing_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: relationship_health_tracking; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.relationship_health_tracking CASCADE;
CREATE TABLE public.relationship_health_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    user_id uuid NOT NULL,
    health_score integer,
    engagement_frequency character varying(50),
    last_interaction_date date,
    reciprocity_score integer,
    value_exchange_notes text,
    maintenance_activities jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: relationship_maintenance_reminders; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.relationship_maintenance_reminders CASCADE;
CREATE TABLE public.relationship_maintenance_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    reminder_type character varying(50),
    reminder_date date,
    reminder_sent boolean DEFAULT false,
    outreach_sent boolean DEFAULT false,
    personalized_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.report_templates CASCADE;
CREATE TABLE public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_description text,
    default_metrics jsonb,
    default_filters jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: resume; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.resume CASCADE;
CREATE TABLE public.resume (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_name character varying(255) DEFAULT 'New_Resume'::character varying,
    name character varying(255),
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file character varying(1000),
    template_id uuid,
    job_id uuid,
    content jsonb,
    section_config jsonb,
    customizations jsonb,
    version_number integer DEFAULT 1,
    parent_resume_id uuid,
    is_master boolean DEFAULT false,
    comments_id uuid
);


--
-- Name: COLUMN resume.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.name IS 'Resume name (alias for version_name)';


--
-- Name: COLUMN resume.template_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.template_id IS 'Reference to resume template';


--
-- Name: COLUMN resume.job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.job_id IS 'Reference to job opportunity this resume is tailored for';


--
-- Name: COLUMN resume.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.content IS 'JSONB containing resume content (personalInfo, summary, experience, etc.)';


--
-- Name: COLUMN resume.section_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.section_config IS 'JSONB containing section configuration (enabled/disabled, order, etc.)';


--
-- Name: COLUMN resume.customizations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.customizations IS 'JSONB containing layout customizations (colors, fonts, spacing, etc.)';


--
-- Name: COLUMN resume.version_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.version_number IS 'Version number for this resume';


--
-- Name: COLUMN resume.parent_resume_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.parent_resume_id IS 'Reference to parent resume (for versioning)';


--
-- Name: COLUMN resume.is_master; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resume.is_master IS 'Indicates if this is a master resume';


--
-- Name: resume_comments; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.resume_comments CASCADE;
CREATE TABLE public.resume_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid,
    commenter character varying(255),
    comment text
);


--
-- Name: resume_tailoring; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.resume_tailoring CASCADE;
CREATE TABLE public.resume_tailoring (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    workexp_description text
);


--
-- Name: resume_template; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.resume_template CASCADE;
CREATE TABLE public.resume_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    description text,
    colors text,
    fonts text,
    existing_resume_template character varying(1000)
);


--
-- Name: review_comments; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.review_comments CASCADE;
CREATE TABLE public.review_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_request_id uuid,
    reviewer_id uuid,
    parent_comment_id uuid,
    comment_text text NOT NULL,
    suggestion_text text,
    comment_type character varying(50) DEFAULT 'comment'::character varying,
    document_section character varying(100),
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    team_id uuid,
    document_type character varying(50),
    document_id uuid,
    CONSTRAINT review_comments_comment_type_check CHECK (((comment_type)::text = ANY ((ARRAY['comment'::character varying, 'suggestion'::character varying, 'approval'::character varying, 'rejection'::character varying])::text[]))),
    CONSTRAINT review_comments_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['resume'::character varying, 'cover_letter'::character varying, 'coverletter'::character varying])::text[])))
);


--
-- Name: TABLE review_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.review_comments IS 'Comments and suggestions on document reviews';


--
-- Name: COLUMN review_comments.team_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_comments.team_id IS 'Team ID for team-based document comments (nullable, used when review_request_id is NULL)';


--
-- Name: COLUMN review_comments.document_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_comments.document_type IS 'Document type for team-based comments (nullable, used when review_request_id is NULL)';


--
-- Name: COLUMN review_comments.document_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.review_comments.document_id IS 'Document ID for team-based comments (nullable, used when review_request_id is NULL)';


--
-- Name: salary_negotiation_prep; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.salary_negotiation_prep CASCADE;
CREATE TABLE public.salary_negotiation_prep (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    role character varying(255),
    location character varying(255),
    market_salary_data jsonb,
    salary_min numeric,
    salary_max numeric,
    negotiation_talking_points jsonb,
    experience_achievements jsonb,
    total_compensation_framework jsonb,
    negotiation_scripts jsonb,
    timing_strategies text,
    counteroffer_evaluation jsonb,
    confidence_exercises jsonb,
    outcome character varying(50) DEFAULT 'pending'::character varying,
    final_salary numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: salary_progression_tracking; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.salary_progression_tracking CASCADE;
CREATE TABLE public.salary_progression_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    offer_date date,
    job_id uuid,
    base_salary numeric,
    total_compensation numeric,
    benefits_value numeric,
    location character varying(255),
    role character varying(255),
    industry character varying(255),
    market_percentile integer,
    market_comparison jsonb,
    negotiation_outcome character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: shared_documents; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.shared_documents CASCADE;
CREATE TABLE public.shared_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type character varying(50) NOT NULL,
    document_id uuid NOT NULL,
    shared_by uuid,
    shared_by_role character varying(50),
    team_id uuid,
    version_number integer,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    shared_with_user_id uuid,
    CONSTRAINT shared_documents_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['resume'::character varying, 'cover_letter'::character varying])::text[])))
);


--
-- Name: TABLE shared_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shared_documents IS 'Documents (resumes/cover letters) shared with team members for collaborative review';


--
-- Name: shared_jobs; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.shared_jobs CASCADE;
CREATE TABLE public.shared_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    shared_by uuid,
    shared_by_role character varying(50),
    team_id uuid,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE shared_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shared_jobs IS 'Job postings shared with team members for collaborative review';


--
-- Name: skill_demand_trends; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.skill_demand_trends CASCADE;
CREATE TABLE public.skill_demand_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    skill_name character varying(100) NOT NULL,
    industry character varying(255),
    location character varying(255),
    period_start date NOT NULL,
    period_end date NOT NULL,
    demand_count integer NOT NULL,
    avg_salary_for_skill numeric,
    trend_direction character varying(20),
    growth_rate numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT skill_demand_trends_trend_check CHECK (((trend_direction)::text = ANY ((ARRAY['rising'::character varying, 'stable'::character varying, 'declining'::character varying, 'emerging'::character varying])::text[])))
);


--
-- Name: TABLE skill_demand_trends; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.skill_demand_trends IS 'Tracks skill demand evolution over time for market intelligence';


--
-- Name: COLUMN skill_demand_trends.demand_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_demand_trends.demand_count IS 'Number of job postings requiring this skill in the time period';


--
-- Name: COLUMN skill_demand_trends.avg_salary_for_skill; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_demand_trends.avg_salary_for_skill IS 'Average salary offered for positions requiring this skill';


--
-- Name: COLUMN skill_demand_trends.trend_direction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_demand_trends.trend_direction IS 'Whether skill demand is rising, stable, declining, or emerging';


--
-- Name: COLUMN skill_demand_trends.growth_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.skill_demand_trends.growth_rate IS 'Percentage change in demand compared to previous period';


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.skills CASCADE;
CREATE TABLE public.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    skill_name character varying(100) NOT NULL,
    proficiency character varying(15) NOT NULL,
    category character varying(20),
    skill_badge character varying(500)
);


--
-- Name: success_patterns; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.success_patterns CASCADE;
CREATE TABLE public.success_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pattern_type character varying(50),
    pattern_description text,
    correlation_factors jsonb,
    preparation_activities jsonb,
    timing_patterns jsonb,
    strategy_effectiveness jsonb,
    success_factors jsonb,
    predictive_indicators jsonb,
    recommendations jsonb,
    pattern_confidence numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: support_effectiveness_tracking; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.support_effectiveness_tracking CASCADE;
CREATE TABLE public.support_effectiveness_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    support_type character varying(50),
    emotional_support_score integer,
    impact_on_performance text,
    stress_management_notes text,
    wellbeing_indicators jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: support_groups; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.support_groups CASCADE;
CREATE TABLE public.support_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_name character varying(255) NOT NULL,
    group_type character varying(50),
    industry character varying(255),
    target_role character varying(255),
    description text,
    privacy_level character varying(50) DEFAULT 'public'::character varying,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_billing; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.team_billing CASCADE;
CREATE TABLE public.team_billing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    billing_cycle character varying(50),
    subscription_status character varying(50) DEFAULT 'active'::character varying,
    next_billing_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_dashboards; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.team_dashboards CASCADE;
CREATE TABLE public.team_dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    dashboard_data jsonb,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_invitations; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.team_invitations CASCADE;
CREATE TABLE public.team_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid,
    invited_by uuid,
    email character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'candidate'::character varying,
    permissions jsonb DEFAULT '{}'::jsonb,
    invitation_token character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_invitations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE team_invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_invitations IS 'Invitation system for adding members to teams';


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.team_members CASCADE;
CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50),
    permissions jsonb,
    invited_by uuid,
    invitation_status character varying(50) DEFAULT 'pending'::character varying,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    joined_at timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.teams CASCADE;
CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_name character varying(255) NOT NULL,
    team_type character varying(50),
    billing_email character varying(255),
    subscription_tier character varying(50),
    max_members integer,
    active_members integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: technical_prep_attempts; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.technical_prep_attempts CASCADE;
CREATE TABLE public.technical_prep_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    user_id uuid NOT NULL,
    solution text,
    time_taken_seconds integer,
    performance_score integer,
    feedback text,
    completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: technical_prep_challenges; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.technical_prep_challenges CASCADE;
CREATE TABLE public.technical_prep_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid,
    challenge_type character varying(50),
    tech_stack jsonb,
    difficulty_level character varying(50),
    title character varying(255),
    description text,
    question_text text,
    solution_framework text,
    best_practices text,
    real_world_scenario text,
    is_timed boolean DEFAULT false,
    time_limit_minutes integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    whiteboarding_techniques text,
    performance_metrics jsonb DEFAULT '{}'::jsonb,
    solution_code text
);


--
-- Name: time_tracking; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.time_tracking CASCADE;
CREATE TABLE public.time_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type character varying(50),
    activity_description text,
    time_spent_minutes integer,
    activity_date date DEFAULT CURRENT_DATE,
    energy_level character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_cohorts; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.user_cohorts CASCADE;
CREATE TABLE public.user_cohorts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    cohort_name character varying(255) NOT NULL,
    cohort_description text,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    u_id uuid DEFAULT gen_random_uuid() NOT NULL,
    password character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email character varying(255) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reset_token character varying(255),
    reset_token_expires timestamp without time zone,
    google_id character varying(255),
    auth_provider character varying(50) DEFAULT 'local'::character varying,
    linkedin_id character varying(255),
    role character varying(255) DEFAULT 'candidate'::character varying,
    google_calendar_access_token text,
    google_calendar_refresh_token text,
    google_calendar_token_expiry timestamp with time zone,
    google_calendar_sync_enabled boolean DEFAULT false,
    google_calendar_id character varying(255),
    team_id uuid
);


--
-- Name: COLUMN users.google_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.google_id IS 'Google OAuth ID for social login';


--
-- Name: COLUMN users.auth_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.auth_provider IS 'Authentication provider: local or google';


--
-- Name: COLUMN users.linkedin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.linkedin_id IS 'LinkedIn OAuth ID for social login';


--
-- Name: whiteboarding_practice; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.whiteboarding_practice CASCADE;
CREATE TABLE public.whiteboarding_practice (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    topic character varying(255),
    techniques_used jsonb,
    notes text,
    practiced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: writing_practice_sessions; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE IF EXISTS public.writing_practice_sessions CASCADE;
CREATE TABLE public.writing_practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    response_text text,
    time_limit_seconds integer,
    time_taken_seconds integer,
    clarity_score integer,
    professionalism_score integer,
    structure_score integer,
    storytelling_score integer,
    feedback text,
    improvement_suggestions jsonb,
    quality_trend jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: accountability_relationships accountability_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountability_relationships
    ADD CONSTRAINT accountability_relationships_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: advisor_performance_evaluation advisor_performance_evaluation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_performance_evaluation
    ADD CONSTRAINT advisor_performance_evaluation_pkey PRIMARY KEY (id);


--
-- Name: advisor_recommendations advisor_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_recommendations
    ADD CONSTRAINT advisor_recommendations_pkey PRIMARY KEY (id);


--
-- Name: advisor_sessions advisor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_sessions
    ADD CONSTRAINT advisor_sessions_pkey PRIMARY KEY (id);


--
-- Name: advisor_shared_data advisor_shared_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_shared_data
    ADD CONSTRAINT advisor_shared_data_pkey PRIMARY KEY (id);


--
-- Name: application_success_analysis application_success_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_success_analysis
    ADD CONSTRAINT application_success_analysis_pkey PRIMARY KEY (id);


--
-- Name: archived_prospectivejobs archived_prospectivejobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_prospectivejobs
    ADD CONSTRAINT archived_prospectivejobs_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_settings calendar_sync_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_settings
    ADD CONSTRAINT calendar_sync_settings_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_settings calendar_sync_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_settings
    ADD CONSTRAINT calendar_sync_settings_user_id_key UNIQUE (user_id);


--
-- Name: campaign_ab_testing campaign_ab_testing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_ab_testing
    ADD CONSTRAINT campaign_ab_testing_pkey PRIMARY KEY (id);


--
-- Name: campaign_outreach campaign_outreach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_outreach
    ADD CONSTRAINT campaign_outreach_pkey PRIMARY KEY (id);


--
-- Name: career_goals career_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_goals
    ADD CONSTRAINT career_goals_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_notifications chat_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_notifications
    ADD CONSTRAINT chat_notifications_pkey PRIMARY KEY (id);


--
-- Name: chat_participants chat_participants_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (id);


--
-- Name: coaching_sessions coaching_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_sessions
    ADD CONSTRAINT coaching_sessions_pkey PRIMARY KEY (id);


--
-- Name: cohort_memberships cohort_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohort_memberships
    ADD CONSTRAINT cohort_memberships_pkey PRIMARY KEY (id);


--
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- Name: company_interview_insights company_interview_insights_company_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_interview_insights
    ADD CONSTRAINT company_interview_insights_company_role_key UNIQUE (company_key, role_key);


--
-- Name: company_interview_insights company_interview_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_interview_insights
    ADD CONSTRAINT company_interview_insights_pkey PRIMARY KEY (id);


--
-- Name: company_media company_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_media
    ADD CONSTRAINT company_media_pkey PRIMARY KEY (id);


--
-- Name: company_news company_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_news
    ADD CONSTRAINT company_news_pkey PRIMARY KEY (id);


--
-- Name: competitive_benchmarks competitive_benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitive_benchmarks
    ADD CONSTRAINT competitive_benchmarks_pkey PRIMARY KEY (id);


--
-- Name: contact_categories contact_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_categories
    ADD CONSTRAINT contact_categories_pkey PRIMARY KEY (id);


--
-- Name: contact_interactions contact_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_interactions
    ADD CONSTRAINT contact_interactions_pkey PRIMARY KEY (id);


--
-- Name: contact_job_links contact_job_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_job_links
    ADD CONSTRAINT contact_job_links_pkey PRIMARY KEY (id);


--
-- Name: cover_letter_performance cover_letter_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_performance
    ADD CONSTRAINT cover_letter_performance_pkey PRIMARY KEY (id);


--
-- Name: cover_letter_template_usage cover_letter_template_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_template_usage
    ADD CONSTRAINT cover_letter_template_usage_pkey PRIMARY KEY (id);


--
-- Name: coverletter coverletter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_pkey PRIMARY KEY (id);


--
-- Name: coverletter_template coverletter_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter_template
    ADD CONSTRAINT coverletter_template_pkey PRIMARY KEY (id);


--
-- Name: custom_reports custom_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_reports
    ADD CONSTRAINT custom_reports_pkey PRIMARY KEY (id);


--
-- Name: discovered_contacts discovered_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovered_contacts
    ADD CONSTRAINT discovered_contacts_pkey PRIMARY KEY (id);


--
-- Name: document_approvals document_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_approvals
    ADD CONSTRAINT document_approvals_pkey PRIMARY KEY (id);


--
-- Name: document_review_requests document_review_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_review_requests
    ADD CONSTRAINT document_review_requests_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_document_type_document_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_type_document_id_version_number_key UNIQUE (document_type, document_id, version_number);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: educations educations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educations
    ADD CONSTRAINT educations_pkey PRIMARY KEY (id);


--
-- Name: enterprise_accounts enterprise_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enterprise_accounts
    ADD CONSTRAINT enterprise_accounts_pkey PRIMARY KEY (id);


--
-- Name: event_connections event_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_connections
    ADD CONSTRAINT event_connections_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_unique UNIQUE (event_id, user_id);


--
-- Name: external_advisors external_advisors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_advisors
    ADD CONSTRAINT external_advisors_pkey PRIMARY KEY (id);


--
-- Name: family_progress_summaries family_progress_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_progress_summaries
    ADD CONSTRAINT family_progress_summaries_pkey PRIMARY KEY (id);


--
-- Name: family_support_access family_support_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_support_access
    ADD CONSTRAINT family_support_access_pkey PRIMARY KEY (id);


--
-- Name: feedback_themes feedback_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_themes
    ADD CONSTRAINT feedback_themes_pkey PRIMARY KEY (id);


--
-- Name: feedback_themes feedback_themes_theme_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_themes
    ADD CONSTRAINT feedback_themes_theme_name_key UNIQUE (theme_name);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (file_id);


--
-- Name: followup_templates followup_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.followup_templates
    ADD CONSTRAINT followup_templates_pkey PRIMARY KEY (id);


--
-- Name: goal_milestones goal_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_milestones
    ADD CONSTRAINT goal_milestones_pkey PRIMARY KEY (id);


--
-- Name: group_challenges group_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenges
    ADD CONSTRAINT group_challenges_pkey PRIMARY KEY (id);


--
-- Name: group_discussions group_discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_discussions
    ADD CONSTRAINT group_discussions_pkey PRIMARY KEY (id);


--
-- Name: group_memberships group_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_pkey PRIMARY KEY (id);


--
-- Name: industry_trends industry_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_trends
    ADD CONSTRAINT industry_trends_pkey PRIMARY KEY (id);


--
-- Name: informational_interview_templates informational_interview_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informational_interview_templates
    ADD CONSTRAINT informational_interview_templates_pkey PRIMARY KEY (id);


--
-- Name: informational_interviews informational_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informational_interviews
    ADD CONSTRAINT informational_interviews_pkey PRIMARY KEY (id);


--
-- Name: interview_analytics interview_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_analytics
    ADD CONSTRAINT interview_analytics_pkey PRIMARY KEY (id);


--
-- Name: interview_conflicts interview_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_conflicts
    ADD CONSTRAINT interview_conflicts_pkey PRIMARY KEY (id);


--
-- Name: interview_feedback interview_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_feedback
    ADD CONSTRAINT interview_feedback_pkey PRIMARY KEY (id);


--
-- Name: interview_follow_ups interview_follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_follow_ups
    ADD CONSTRAINT interview_follow_ups_pkey PRIMARY KEY (id);


--
-- Name: interview_followups interview_followups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_followups
    ADD CONSTRAINT interview_followups_pkey PRIMARY KEY (id);


--
-- Name: interview_performance_tracking interview_performance_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_performance_tracking
    ADD CONSTRAINT interview_performance_tracking_pkey PRIMARY KEY (id);


--
-- Name: interview_post_reflection interview_post_reflection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_post_reflection
    ADD CONSTRAINT interview_post_reflection_pkey PRIMARY KEY (id);


--
-- Name: interview_pre_assessment interview_pre_assessment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_pre_assessment
    ADD CONSTRAINT interview_pre_assessment_pkey PRIMARY KEY (id);


--
-- Name: interview_preparation_checklists interview_preparation_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_checklists
    ADD CONSTRAINT interview_preparation_checklists_pkey PRIMARY KEY (id);


--
-- Name: interview_preparation_tasks interview_preparation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_tasks
    ADD CONSTRAINT interview_preparation_tasks_pkey PRIMARY KEY (id);


--
-- Name: interview_question_banks interview_question_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_question_banks
    ADD CONSTRAINT interview_question_banks_pkey PRIMARY KEY (id);


--
-- Name: interview_reminders interview_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_reminders
    ADD CONSTRAINT interview_reminders_pkey PRIMARY KEY (id);


--
-- Name: interview_response_coaching interview_response_coaching_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_response_coaching
    ADD CONSTRAINT interview_response_coaching_pkey PRIMARY KEY (id);


--
-- Name: interview_success_probability interview_success_probability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_success_probability
    ADD CONSTRAINT interview_success_probability_pkey PRIMARY KEY (id);


--
-- Name: interview_thank_you_notes interview_thank_you_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_thank_you_notes
    ADD CONSTRAINT interview_thank_you_notes_pkey PRIMARY KEY (id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: job_comments job_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_comments
    ADD CONSTRAINT job_comments_pkey PRIMARY KEY (id);


--
-- Name: job_opportunities job_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_opportunities
    ADD CONSTRAINT job_opportunities_pkey PRIMARY KEY (id);


--
-- Name: job_search_metrics job_search_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_search_metrics
    ADD CONSTRAINT job_search_metrics_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: linkedin_networking_templates linkedin_networking_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkedin_networking_templates
    ADD CONSTRAINT linkedin_networking_templates_pkey PRIMARY KEY (id);


--
-- Name: linkedin_profile_optimization linkedin_profile_optimization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkedin_profile_optimization
    ADD CONSTRAINT linkedin_profile_optimization_pkey PRIMARY KEY (id);


--
-- Name: market_insights market_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_insights
    ADD CONSTRAINT market_insights_pkey PRIMARY KEY (id);


--
-- Name: market_intelligence_cache market_intelligence_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_intelligence_cache
    ADD CONSTRAINT market_intelligence_cache_pkey PRIMARY KEY (id);


--
-- Name: market_intelligence_cache market_intelligence_cache_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_intelligence_cache
    ADD CONSTRAINT market_intelligence_cache_unique_key UNIQUE (cache_key, data_type);


--
-- Name: market_intelligence market_intelligence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_intelligence
    ADD CONSTRAINT market_intelligence_pkey PRIMARY KEY (id);


--
-- Name: market_salary_data market_salary_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_salary_data
    ADD CONSTRAINT market_salary_data_pkey PRIMARY KEY (id);


--
-- Name: mentor_dashboard_data mentor_dashboard_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_dashboard_data
    ADD CONSTRAINT mentor_dashboard_data_pkey PRIMARY KEY (id);


--
-- Name: mentor_dashboard_views mentor_dashboard_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_dashboard_views
    ADD CONSTRAINT mentor_dashboard_views_pkey PRIMARY KEY (id);


--
-- Name: mentor_feedback mentor_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_pkey PRIMARY KEY (id);


--
-- Name: mentor_relationships mentor_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_relationships
    ADD CONSTRAINT mentor_relationships_pkey PRIMARY KEY (id);


--
-- Name: mentor_shared_data mentor_shared_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_shared_data
    ADD CONSTRAINT mentor_shared_data_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_message_id_user_id_reaction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_reaction_type_key UNIQUE (message_id, user_id, reaction_type);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_followups mock_interview_followups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_followups
    ADD CONSTRAINT mock_interview_followups_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_messages mock_interview_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_messages
    ADD CONSTRAINT mock_interview_messages_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_questions mock_interview_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_questions
    ADD CONSTRAINT mock_interview_questions_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_sessions mock_interview_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_sessions
    ADD CONSTRAINT mock_interview_sessions_pkey PRIMARY KEY (id);


--
-- Name: mutual_connections mutual_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mutual_connections
    ADD CONSTRAINT mutual_connections_pkey PRIMARY KEY (id);


--
-- Name: network_roi_analytics network_roi_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.network_roi_analytics
    ADD CONSTRAINT network_roi_analytics_pkey PRIMARY KEY (id);


--
-- Name: networking_campaigns networking_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_campaigns
    ADD CONSTRAINT networking_campaigns_pkey PRIMARY KEY (id);


--
-- Name: networking_events networking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_events
    ADD CONSTRAINT networking_events_pkey PRIMARY KEY (id);


--
-- Name: networking_goals networking_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_goals
    ADD CONSTRAINT networking_goals_pkey PRIMARY KEY (id);


--
-- Name: peer_referrals peer_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.peer_referrals
    ADD CONSTRAINT peer_referrals_pkey PRIMARY KEY (id);


--
-- Name: performance_predictions performance_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_predictions
    ADD CONSTRAINT performance_predictions_pkey PRIMARY KEY (id);


--
-- Name: performance_trends performance_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_trends
    ADD CONSTRAINT performance_trends_pkey PRIMARY KEY (id);


--
-- Name: practice_sessions practice_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_sessions
    ADD CONSTRAINT practice_sessions_pkey PRIMARY KEY (id);


--
-- Name: preparation_tasks preparation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preparation_tasks
    ADD CONSTRAINT preparation_tasks_pkey PRIMARY KEY (id);


--
-- Name: productivity_analysis productivity_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productivity_analysis
    ADD CONSTRAINT productivity_analysis_pkey PRIMARY KEY (id);


--
-- Name: professional_contacts professional_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_contacts
    ADD CONSTRAINT professional_contacts_pkey PRIMARY KEY (id);


--
-- Name: professional_references professional_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_references
    ADD CONSTRAINT professional_references_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: program_effectiveness_analytics program_effectiveness_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_effectiveness_analytics
    ADD CONSTRAINT program_effectiveness_analytics_pkey PRIMARY KEY (id);


--
-- Name: progress_reports progress_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_reports
    ADD CONSTRAINT progress_reports_pkey PRIMARY KEY (id);


--
-- Name: progress_shares progress_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_shares
    ADD CONSTRAINT progress_shares_pkey PRIMARY KEY (id);


--
-- Name: progress_sharing_settings progress_sharing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_sharing_settings
    ADD CONSTRAINT progress_sharing_settings_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: prospectivejob_material_history prospectivejob_material_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospectivejob_material_history
    ADD CONSTRAINT prospectivejob_material_history_pkey PRIMARY KEY (id);


--
-- Name: prospectivejobs prospectivejobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospectivejobs
    ADD CONSTRAINT prospectivejobs_pkey PRIMARY KEY (id);


--
-- Name: question_practice_sessions question_practice_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_practice_sessions
    ADD CONSTRAINT question_practice_sessions_pkey PRIMARY KEY (id);


--
-- Name: reference_portfolios reference_portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_portfolios
    ADD CONSTRAINT reference_portfolios_pkey PRIMARY KEY (id);


--
-- Name: reference_request_templates reference_request_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_request_templates
    ADD CONSTRAINT reference_request_templates_pkey PRIMARY KEY (id);


--
-- Name: reference_requests reference_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_requests
    ADD CONSTRAINT reference_requests_pkey PRIMARY KEY (id);


--
-- Name: referral_requests referral_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_requests
    ADD CONSTRAINT referral_requests_pkey PRIMARY KEY (id);


--
-- Name: referral_templates referral_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_templates
    ADD CONSTRAINT referral_templates_pkey PRIMARY KEY (id);


--
-- Name: relationship_health_tracking relationship_health_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_health_tracking
    ADD CONSTRAINT relationship_health_tracking_pkey PRIMARY KEY (id);


--
-- Name: relationship_maintenance_reminders relationship_maintenance_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_maintenance_reminders
    ADD CONSTRAINT relationship_maintenance_reminders_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: resume_comments resume_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_comments
    ADD CONSTRAINT resume_comments_pkey PRIMARY KEY (id);


--
-- Name: resume resume_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume
    ADD CONSTRAINT resume_pkey PRIMARY KEY (id);


--
-- Name: resume_tailoring resume_tailoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_tailoring
    ADD CONSTRAINT resume_tailoring_pkey PRIMARY KEY (id);


--
-- Name: resume_template resume_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_template
    ADD CONSTRAINT resume_template_pkey PRIMARY KEY (id);


--
-- Name: review_comments review_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_pkey PRIMARY KEY (id);


--
-- Name: salary_negotiation_prep salary_negotiation_prep_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_negotiation_prep
    ADD CONSTRAINT salary_negotiation_prep_pkey PRIMARY KEY (id);


--
-- Name: salary_progression_tracking salary_progression_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_progression_tracking
    ADD CONSTRAINT salary_progression_tracking_pkey PRIMARY KEY (id);


--
-- Name: shared_documents shared_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_pkey PRIMARY KEY (id);


--
-- Name: shared_jobs shared_jobs_job_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_jobs
    ADD CONSTRAINT shared_jobs_job_id_team_id_key UNIQUE (job_id, team_id);


--
-- Name: shared_jobs shared_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_jobs
    ADD CONSTRAINT shared_jobs_pkey PRIMARY KEY (id);


--
-- Name: skill_demand_trends skill_demand_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_demand_trends
    ADD CONSTRAINT skill_demand_trends_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: skills skills_user_skill_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_user_skill_unique UNIQUE (user_id, skill_name);


--
-- Name: success_patterns success_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.success_patterns
    ADD CONSTRAINT success_patterns_pkey PRIMARY KEY (id);


--
-- Name: support_effectiveness_tracking support_effectiveness_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_effectiveness_tracking
    ADD CONSTRAINT support_effectiveness_tracking_pkey PRIMARY KEY (id);


--
-- Name: support_groups support_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_groups
    ADD CONSTRAINT support_groups_pkey PRIMARY KEY (id);


--
-- Name: team_billing team_billing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_billing
    ADD CONSTRAINT team_billing_pkey PRIMARY KEY (id);


--
-- Name: team_dashboards team_dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_dashboards
    ADD CONSTRAINT team_dashboards_pkey PRIMARY KEY (id);


--
-- Name: team_invitations team_invitations_invitation_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_invitation_token_key UNIQUE (invitation_token);


--
-- Name: team_invitations team_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: technical_prep_attempts technical_prep_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_prep_attempts
    ADD CONSTRAINT technical_prep_attempts_pkey PRIMARY KEY (id);


--
-- Name: technical_prep_challenges technical_prep_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_prep_challenges
    ADD CONSTRAINT technical_prep_challenges_pkey PRIMARY KEY (id);


--
-- Name: time_tracking time_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_tracking
    ADD CONSTRAINT time_tracking_pkey PRIMARY KEY (id);


--
-- Name: interview_conflicts unique_conflict_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_conflicts
    ADD CONSTRAINT unique_conflict_pair UNIQUE (interview_id, conflicting_interview_id);


--
-- Name: interview_reminders unique_interview_reminder; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_reminders
    ADD CONSTRAINT unique_interview_reminder UNIQUE (interview_id, reminder_type);


--
-- Name: interview_post_reflection unique_post_reflection_per_interview; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_post_reflection
    ADD CONSTRAINT unique_post_reflection_per_interview UNIQUE (interview_id);


--
-- Name: interview_pre_assessment unique_pre_assessment_per_interview; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_pre_assessment
    ADD CONSTRAINT unique_pre_assessment_per_interview UNIQUE (interview_id);


--
-- Name: cover_letter_template_usage unique_template_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_template_usage
    ADD CONSTRAINT unique_template_user UNIQUE (template_id, user_id);


--
-- Name: user_cohorts user_cohorts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cohorts
    ADD CONSTRAINT user_cohorts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (u_id);


--
-- Name: whiteboarding_practice whiteboarding_practice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboarding_practice
    ADD CONSTRAINT whiteboarding_practice_pkey PRIMARY KEY (id);


--
-- Name: writing_practice_sessions writing_practice_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.writing_practice_sessions
    ADD CONSTRAINT writing_practice_sessions_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_activity_logs_role ON public.activity_logs USING btree (team_id, actor_role, created_at DESC);


--
-- Name: idx_activity_logs_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_activity_logs_team ON public.activity_logs USING btree (team_id, created_at DESC);


--
-- Name: idx_activity_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs USING btree (activity_type, created_at DESC);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_application_success_analysis_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_application_success_analysis_user_id ON public.application_success_analysis USING btree (user_id);


--
-- Name: idx_calendar_sync_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_calendar_sync_settings_user_id ON public.calendar_sync_settings USING btree (user_id);


--
-- Name: idx_career_goals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON public.career_goals USING btree (user_id);


--
-- Name: idx_chat_conversations_related; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_conversations_related ON public.chat_conversations USING btree (related_entity_type, related_entity_id);


--
-- Name: idx_chat_conversations_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_conversations_team ON public.chat_conversations USING btree (team_id, updated_at DESC);


--
-- Name: idx_chat_conversations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON public.chat_conversations USING btree (conversation_type, updated_at DESC);


--
-- Name: idx_chat_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_chat_messages_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON public.chat_messages USING btree (parent_message_id);


--
-- Name: idx_chat_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages USING btree (sender_id, created_at DESC);


--
-- Name: idx_chat_notifications_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_notifications_conversation ON public.chat_notifications USING btree (conversation_id);


--
-- Name: idx_chat_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_notifications_user ON public.chat_notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_chat_participants_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON public.chat_participants USING btree (conversation_id, is_active);


--
-- Name: idx_chat_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants USING btree (user_id, is_active);


--
-- Name: idx_coaching_sessions_mentor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_mentor_id ON public.coaching_sessions USING btree (mentor_id);


--
-- Name: idx_company_interview_insights_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_company_interview_insights_company ON public.company_interview_insights USING btree (company_key);


--
-- Name: idx_company_interview_insights_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_company_interview_insights_expires_at ON public.company_interview_insights USING btree (expires_at);


--
-- Name: idx_competitive_benchmarks_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_competitive_benchmarks_user_id ON public.competitive_benchmarks USING btree (user_id);


--
-- Name: idx_conflicts_conflicting_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_conflicts_conflicting_interview_id ON public.interview_conflicts USING btree (conflicting_interview_id);


--
-- Name: idx_conflicts_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_conflicts_interview_id ON public.interview_conflicts USING btree (interview_id);


--
-- Name: idx_conflicts_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON public.interview_conflicts USING btree (resolved);


--
-- Name: idx_contact_interactions_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON public.contact_interactions USING btree (contact_id);


--
-- Name: idx_coverletter_is_master; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coverletter_is_master ON public.coverletter USING btree (is_master) WHERE (is_master = true);


--
-- Name: idx_coverletter_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coverletter_job_id ON public.coverletter USING btree (job_id);


--
-- Name: idx_coverletter_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coverletter_parent_id ON public.coverletter USING btree (parent_coverletter_id);


--
-- Name: idx_coverletter_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coverletter_template_id ON public.coverletter USING btree (template_id);


--
-- Name: idx_coverletter_user_id_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coverletter_user_id_created ON public.coverletter USING btree (user_id, created_at DESC);


--
-- Name: idx_custom_reports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON public.custom_reports USING btree (user_id);


--
-- Name: idx_discovered_contacts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_discovered_contacts_user_id ON public.discovered_contacts USING btree (user_id);


--
-- Name: idx_document_approvals_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON public.document_approvals USING btree (document_type, document_id);


--
-- Name: idx_document_approvals_review_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_approvals_review_request_id ON public.document_approvals USING btree (review_request_id);


--
-- Name: idx_document_review_requests_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_review_requests_document ON public.document_review_requests USING btree (document_type, document_id);


--
-- Name: idx_document_review_requests_requestor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_review_requests_requestor_id ON public.document_review_requests USING btree (requestor_id);


--
-- Name: idx_document_review_requests_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_review_requests_reviewer_id ON public.document_review_requests USING btree (reviewer_id);


--
-- Name: idx_document_versions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON public.document_versions USING btree (created_by);


--
-- Name: idx_document_versions_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON public.document_versions USING btree (document_type, document_id, version_number DESC);


--
-- Name: idx_enterprise_accounts_admin_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_enterprise_accounts_admin_user_id ON public.enterprise_accounts USING btree (admin_user_id);


--
-- Name: idx_event_connections_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_event_connections_event_id ON public.event_connections USING btree (event_id);


--
-- Name: idx_event_registrations_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations USING btree (event_id);


--
-- Name: idx_event_registrations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations USING btree (user_id);


--
-- Name: idx_external_advisors_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_external_advisors_user_id ON public.external_advisors USING btree (user_id);


--
-- Name: idx_follow_ups_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_follow_ups_action_type ON public.interview_follow_ups USING btree (action_type);


--
-- Name: idx_follow_ups_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_follow_ups_completed ON public.interview_follow_ups USING btree (completed);


--
-- Name: idx_follow_ups_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.interview_follow_ups USING btree (due_date);


--
-- Name: idx_follow_ups_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_follow_ups_interview_id ON public.interview_follow_ups USING btree (interview_id);


--
-- Name: idx_group_memberships_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships USING btree (group_id);


--
-- Name: idx_group_memberships_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships USING btree (user_id);


--
-- Name: idx_informational_interviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_informational_interviews_user_id ON public.informational_interviews USING btree (user_id);


--
-- Name: idx_interview_analytics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_analytics_user_id ON public.interview_analytics USING btree (user_id);


--
-- Name: idx_interview_feedback_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON public.interview_feedback USING btree (interview_id);


--
-- Name: idx_interview_feedback_sentiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_feedback_sentiment ON public.interview_feedback USING btree (sentiment_score, user_id);


--
-- Name: idx_interview_feedback_skill_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_feedback_skill_area ON public.interview_feedback USING btree (skill_area);


--
-- Name: idx_interview_feedback_theme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_feedback_theme ON public.interview_feedback USING btree (feedback_theme, user_id);


--
-- Name: idx_interview_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_feedback_user_id ON public.interview_feedback USING btree (user_id);


--
-- Name: idx_interview_feedback_user_skill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_feedback_user_skill ON public.interview_feedback USING btree (user_id, skill_area);


--
-- Name: idx_interview_followups_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_followups_interview_id ON public.interview_followups USING btree (interview_id);


--
-- Name: idx_interview_performance_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_performance_tracking_user_id ON public.interview_performance_tracking USING btree (user_id);


--
-- Name: idx_interview_preparation_checklists_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_preparation_checklists_interview_id ON public.interview_preparation_checklists USING btree (interview_id);


--
-- Name: idx_interview_preparation_tasks_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_preparation_tasks_interview_id ON public.interview_preparation_tasks USING btree (interview_id);


--
-- Name: idx_interview_question_banks_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_question_banks_job_id ON public.interview_question_banks USING btree (job_id);


--
-- Name: idx_interview_response_coaching_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_response_coaching_user_id ON public.interview_response_coaching USING btree (user_id);


--
-- Name: idx_interview_success_probability_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interview_success_probability_user_id ON public.interview_success_probability USING btree (user_id);


--
-- Name: idx_interviews_conflict_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_conflict_detected ON public.interviews USING btree (conflict_detected);


--
-- Name: idx_interviews_format; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_format ON public.interviews USING btree (format);


--
-- Name: idx_interviews_google_calendar_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_google_calendar_event_id ON public.interviews USING btree (google_calendar_event_id);


--
-- Name: idx_interviews_is_practice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_is_practice ON public.interviews USING btree (is_practice, user_id);


--
-- Name: idx_interviews_job_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_job_opportunity_id ON public.interviews USING btree (job_opportunity_id);


--
-- Name: idx_interviews_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_outcome ON public.interviews USING btree (outcome);


--
-- Name: idx_interviews_rescheduled_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_rescheduled_from ON public.interviews USING btree (rescheduled_from);


--
-- Name: idx_interviews_rescheduled_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_rescheduled_to ON public.interviews USING btree (rescheduled_to);


--
-- Name: idx_interviews_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews USING btree (scheduled_at);


--
-- Name: idx_interviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews USING btree (status);


--
-- Name: idx_interviews_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_type ON public.interviews USING btree (type);


--
-- Name: idx_interviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews USING btree (user_id);


--
-- Name: idx_job_comments_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_comments_job ON public.job_comments USING btree (job_id, created_at DESC);


--
-- Name: idx_job_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_comments_parent ON public.job_comments USING btree (parent_comment_id);


--
-- Name: idx_job_comments_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_comments_team ON public.job_comments USING btree (team_id, created_at DESC);


--
-- Name: idx_job_opp_application_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opp_application_method ON public.job_opportunities USING btree (application_method);


--
-- Name: idx_job_opp_application_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opp_application_source ON public.job_opportunities USING btree (application_source);


--
-- Name: idx_job_opp_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opp_submitted_at ON public.job_opportunities USING btree (application_submitted_at);


--
-- Name: idx_job_opportunities_application_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opportunities_application_history ON public.job_opportunities USING gin (application_history);


--
-- Name: idx_job_opportunities_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opportunities_archived ON public.job_opportunities USING btree (archived);


--
-- Name: idx_job_opportunities_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opportunities_deadline ON public.job_opportunities USING btree (application_deadline);


--
-- Name: idx_job_opportunities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opportunities_status ON public.job_opportunities USING btree (status);


--
-- Name: idx_job_opportunities_status_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opportunities_status_updated_at ON public.job_opportunities USING btree (status_updated_at);


--
-- Name: idx_job_opportunities_user_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_archived ON public.job_opportunities USING btree (user_id, archived);


--
-- Name: idx_job_opportunities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_id ON public.job_opportunities USING btree (user_id);


--
-- Name: idx_job_search_metrics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_search_metrics_user_id ON public.job_search_metrics USING btree (user_id);


--
-- Name: idx_linkedin_networking_templates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_linkedin_networking_templates_user_id ON public.linkedin_networking_templates USING btree (user_id);


--
-- Name: idx_market_insights_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_insights_expires ON public.market_insights USING btree (expires_at);


--
-- Name: idx_market_insights_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_insights_priority ON public.market_insights USING btree (priority);


--
-- Name: idx_market_insights_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_insights_status ON public.market_insights USING btree (status);


--
-- Name: idx_market_insights_supporting_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_insights_supporting_data ON public.market_insights USING gin (supporting_data);


--
-- Name: idx_market_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_insights_type ON public.market_insights USING btree (insight_type);


--
-- Name: idx_market_insights_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_insights_user ON public.market_insights USING btree (user_id);


--
-- Name: idx_market_insights_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_insights_user_status ON public.market_insights USING btree (user_id, status);


--
-- Name: idx_market_intelligence_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_intelligence_cache_expires ON public.market_intelligence_cache USING btree (expires_at);


--
-- Name: idx_market_intelligence_cache_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_intelligence_cache_key ON public.market_intelligence_cache USING btree (cache_key);


--
-- Name: idx_market_intelligence_cache_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_intelligence_cache_type ON public.market_intelligence_cache USING btree (data_type);


--
-- Name: idx_market_intelligence_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_intelligence_data ON public.market_intelligence_cache USING gin (data);


--
-- Name: idx_market_intelligence_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_market_intelligence_user_id ON public.market_intelligence USING btree (user_id);


--
-- Name: idx_mentor_dashboard_views_mentee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mentor_dashboard_views_mentee_id ON public.mentor_dashboard_views USING btree (mentee_id);


--
-- Name: idx_mentor_dashboard_views_mentor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mentor_dashboard_views_mentor_id ON public.mentor_dashboard_views USING btree (mentor_id);


--
-- Name: idx_mentor_relationships_mentee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentee_id ON public.mentor_relationships USING btree (mentee_id);


--
-- Name: idx_mentor_relationships_mentor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentor_id ON public.mentor_relationships USING btree (mentor_id);


--
-- Name: idx_message_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions USING btree (message_id);


--
-- Name: idx_milestones_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_milestones_team ON public.milestones USING btree (team_id, achieved_at DESC);


--
-- Name: idx_milestones_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_milestones_type ON public.milestones USING btree (milestone_type, achieved_at DESC);


--
-- Name: idx_milestones_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_milestones_user ON public.milestones USING btree (user_id, achieved_at DESC);


--
-- Name: idx_mock_interview_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mock_interview_messages_created_at ON public.mock_interview_messages USING btree (created_at);


--
-- Name: idx_mock_interview_messages_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mock_interview_messages_session_id ON public.mock_interview_messages USING btree (session_id);


--
-- Name: idx_mock_interview_questions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mock_interview_questions_session_id ON public.mock_interview_questions USING btree (session_id);


--
-- Name: idx_mock_interview_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mock_interview_sessions_status ON public.mock_interview_sessions USING btree (status);


--
-- Name: idx_mock_interview_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_mock_interview_sessions_user_id ON public.mock_interview_sessions USING btree (user_id);


--
-- Name: idx_network_roi_analytics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_network_roi_analytics_user_id ON public.network_roi_analytics USING btree (user_id);


--
-- Name: idx_networking_campaigns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_networking_campaigns_user_id ON public.networking_campaigns USING btree (user_id);


--
-- Name: idx_networking_events_cancelled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_networking_events_cancelled ON public.networking_events USING btree (cancelled);


--
-- Name: idx_networking_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_networking_events_user_id ON public.networking_events USING btree (user_id);


--
-- Name: idx_networking_goals_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_networking_goals_event_id ON public.networking_goals USING btree (event_id);


--
-- Name: idx_networking_goals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_networking_goals_user_id ON public.networking_goals USING btree (user_id);


--
-- Name: idx_performance_coverletter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_performance_coverletter_id ON public.cover_letter_performance USING btree (coverletter_id);


--
-- Name: idx_performance_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_performance_job_id ON public.cover_letter_performance USING btree (job_id);


--
-- Name: idx_performance_predictions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_performance_predictions_user_id ON public.performance_predictions USING btree (user_id);


--
-- Name: idx_performance_trends_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_performance_trends_user_id ON public.performance_trends USING btree (user_id);


--
-- Name: idx_post_reflection_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_post_reflection_interview_id ON public.interview_post_reflection USING btree (interview_id);


--
-- Name: idx_post_reflection_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_post_reflection_user_id ON public.interview_post_reflection USING btree (user_id);


--
-- Name: idx_practice_sessions_format; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_practice_sessions_format ON public.practice_sessions USING btree (format);


--
-- Name: idx_practice_sessions_session_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_practice_sessions_session_date ON public.practice_sessions USING btree (session_date);


--
-- Name: idx_practice_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions USING btree (user_id);


--
-- Name: idx_pre_assessment_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pre_assessment_created_at ON public.interview_pre_assessment USING btree (created_at);


--
-- Name: idx_pre_assessment_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pre_assessment_interview_id ON public.interview_pre_assessment USING btree (interview_id);


--
-- Name: idx_pre_assessment_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pre_assessment_user_id ON public.interview_pre_assessment USING btree (user_id);


--
-- Name: idx_preparation_tasks_assigned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_preparation_tasks_assigned_by ON public.preparation_tasks USING btree (assigned_by);


--
-- Name: idx_preparation_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_preparation_tasks_assigned_to ON public.preparation_tasks USING btree (assigned_to, status);


--
-- Name: idx_preparation_tasks_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_preparation_tasks_completed ON public.interview_preparation_tasks USING btree (completed);


--
-- Name: idx_preparation_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_preparation_tasks_due_date ON public.interview_preparation_tasks USING btree (due_date);


--
-- Name: idx_preparation_tasks_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_preparation_tasks_interview_id ON public.interview_preparation_tasks USING btree (interview_id);


--
-- Name: idx_preparation_tasks_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_preparation_tasks_team ON public.preparation_tasks USING btree (team_id, status);


--
-- Name: idx_productivity_analysis_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_productivity_analysis_user_id ON public.productivity_analysis USING btree (user_id);


--
-- Name: idx_professional_contacts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_professional_contacts_user_id ON public.professional_contacts USING btree (user_id);


--
-- Name: idx_professional_references_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_professional_references_user_id ON public.professional_references USING btree (user_id);


--
-- Name: idx_progress_shares_shared_with_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_progress_shares_shared_with_user ON public.progress_shares USING btree (shared_with_user_id);


--
-- Name: idx_progress_shares_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_progress_shares_team ON public.progress_shares USING btree (shared_with_team_id);


--
-- Name: idx_progress_shares_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_progress_shares_user ON public.progress_shares USING btree (user_id, is_active);


--
-- Name: idx_progress_sharing_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_progress_sharing_settings_user_id ON public.progress_sharing_settings USING btree (user_id);


--
-- Name: idx_question_practice_sessions_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_question_practice_sessions_question_id ON public.question_practice_sessions USING btree (question_id);


--
-- Name: idx_question_practice_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_question_practice_sessions_user_id ON public.question_practice_sessions USING btree (user_id);


--
-- Name: idx_referral_requests_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_referral_requests_job_id ON public.referral_requests USING btree (job_id);


--
-- Name: idx_referral_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_referral_requests_user_id ON public.referral_requests USING btree (user_id);


--
-- Name: idx_relationship_maintenance_reminders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_relationship_maintenance_reminders_user_id ON public.relationship_maintenance_reminders USING btree (user_id);


--
-- Name: idx_reminders_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_interview_id ON public.interview_reminders USING btree (interview_id);


--
-- Name: idx_reminders_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON public.interview_reminders USING btree (scheduled_at, status);


--
-- Name: idx_reminders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.interview_reminders USING btree (status);


--
-- Name: idx_resume_is_master; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resume_is_master ON public.resume USING btree (is_master) WHERE (is_master = true);


--
-- Name: idx_resume_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resume_job_id ON public.resume USING btree (job_id);


--
-- Name: idx_resume_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resume_parent_id ON public.resume USING btree (parent_resume_id);


--
-- Name: idx_resume_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resume_template_id ON public.resume USING btree (template_id);


--
-- Name: idx_resume_user_id_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resume_user_id_created ON public.resume USING btree (user_id, created_at DESC);


--
-- Name: idx_review_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_review_comments_parent ON public.review_comments USING btree (parent_comment_id);


--
-- Name: idx_review_comments_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_review_comments_resolved ON public.review_comments USING btree (is_resolved, created_at DESC);


--
-- Name: idx_review_comments_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_review_comments_review ON public.review_comments USING btree (review_request_id, created_at DESC);


--
-- Name: idx_review_comments_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_review_comments_reviewer ON public.review_comments USING btree (reviewer_id);


--
-- Name: idx_review_comments_team_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_review_comments_team_document ON public.review_comments USING btree (team_id, document_type, document_id) WHERE (team_id IS NOT NULL);


--
-- Name: idx_salary_negotiation_prep_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_salary_negotiation_prep_user_id ON public.salary_negotiation_prep USING btree (user_id);


--
-- Name: idx_salary_progression_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_salary_progression_tracking_user_id ON public.salary_progression_tracking USING btree (user_id);


--
-- Name: idx_shared_documents_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shared_documents_document ON public.shared_documents USING btree (document_type, document_id);


--
-- Name: idx_shared_documents_shared_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_by ON public.shared_documents USING btree (shared_by);


--
-- Name: idx_shared_documents_shared_with_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_with_user ON public.shared_documents USING btree (shared_with_user_id) WHERE (shared_with_user_id IS NOT NULL);


--
-- Name: idx_shared_documents_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shared_documents_team ON public.shared_documents USING btree (team_id, shared_at DESC);


--
-- Name: idx_shared_jobs_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shared_jobs_job ON public.shared_jobs USING btree (job_id);


--
-- Name: idx_shared_jobs_shared_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shared_jobs_shared_by ON public.shared_jobs USING btree (shared_by);


--
-- Name: idx_shared_jobs_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shared_jobs_team ON public.shared_jobs USING btree (team_id, shared_at DESC);


--
-- Name: idx_skill_demand_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_skill_demand_industry ON public.skill_demand_trends USING btree (industry);


--
-- Name: idx_skill_demand_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_skill_demand_location ON public.skill_demand_trends USING btree (location);


--
-- Name: idx_skill_demand_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_skill_demand_period ON public.skill_demand_trends USING btree (period_start, period_end);


--
-- Name: idx_skill_demand_skill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_skill_demand_skill ON public.skill_demand_trends USING btree (skill_name);


--
-- Name: idx_skill_demand_trend; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_skill_demand_trend ON public.skill_demand_trends USING btree (trend_direction);


--
-- Name: idx_success_patterns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_success_patterns_user_id ON public.success_patterns USING btree (user_id);


--
-- Name: idx_team_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations USING btree (email, status);


--
-- Name: idx_team_invitations_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON public.team_invitations USING btree (team_id, status);


--
-- Name: idx_team_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations USING btree (invitation_token);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_technical_prep_challenges_performance_metrics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_technical_prep_challenges_performance_metrics ON public.technical_prep_challenges USING gin (performance_metrics);


--
-- Name: idx_technical_prep_challenges_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_technical_prep_challenges_user_id ON public.technical_prep_challenges USING btree (user_id);


--
-- Name: idx_template_usage_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON public.cover_letter_template_usage USING btree (template_id);


--
-- Name: idx_template_usage_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON public.cover_letter_template_usage USING btree (user_id);


--
-- Name: idx_thank_you_notes_interview_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_thank_you_notes_interview_id ON public.interview_thank_you_notes USING btree (interview_id);


--
-- Name: idx_thank_you_notes_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_thank_you_notes_sent_at ON public.interview_thank_you_notes USING btree (sent_at);


--
-- Name: idx_thank_you_notes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_thank_you_notes_status ON public.interview_thank_you_notes USING btree (status);


--
-- Name: idx_time_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_time_tracking_user_id ON public.time_tracking USING btree (user_id);


--
-- Name: idx_user_cohorts_enterprise_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_user_cohorts_enterprise_id ON public.user_cohorts USING btree (enterprise_id);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users USING btree (google_id);


--
-- Name: idx_users_linkedin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON public.users USING btree (linkedin_id);


--
-- Name: idx_writing_practice_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_writing_practice_sessions_user_id ON public.writing_practice_sessions USING btree (user_id);


--
-- Name: shared_documents_unique_share; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS shared_documents_unique_share ON public.shared_documents USING btree (document_type, document_id, team_id, COALESCE(shared_with_user_id, '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: users lowercaseemail; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS lowercaseemail ON public.users;
CREATE TRIGGER lowercaseemail BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.lower_email();


--
-- Name: users set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS set_updated_at ON public.users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: advisor_recommendations trg_advisor_recommendations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_advisor_recommendations_updated_at ON public.advisor_recommendations;
CREATE TRIGGER trg_advisor_recommendations_updated_at BEFORE UPDATE ON public.advisor_recommendations FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: prospectivejobs trg_auto_archive_jobs; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_auto_archive_jobs ON public.prospectivejobs;
CREATE TRIGGER trg_auto_archive_jobs BEFORE UPDATE OF autoarchive_time_limit ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.auto_archive_jobs();


--
-- Name: career_goals trg_career_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_career_goals_updated_at ON public.career_goals;
CREATE TRIGGER trg_career_goals_updated_at BEFORE UPDATE ON public.career_goals FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: company_interview_insights trg_company_interview_insights_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_company_interview_insights_updated_at ON public.company_interview_insights;
CREATE TRIGGER trg_company_interview_insights_updated_at BEFORE UPDATE ON public.company_interview_insights FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: coverletter trg_coverletter_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_coverletter_timestamp ON public.coverletter;
CREATE TRIGGER trg_coverletter_timestamp BEFORE UPDATE ON public.coverletter FOR EACH ROW EXECUTE FUNCTION public.update_coverletter_timestamp();


--
-- Name: custom_reports trg_custom_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_custom_reports_updated_at ON public.custom_reports;
CREATE TRIGGER trg_custom_reports_updated_at BEFORE UPDATE ON public.custom_reports FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: enterprise_accounts trg_enterprise_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_enterprise_accounts_updated_at ON public.enterprise_accounts;
CREATE TRIGGER trg_enterprise_accounts_updated_at BEFORE UPDATE ON public.enterprise_accounts FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: informational_interviews trg_informational_interviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_informational_interviews_updated_at ON public.informational_interviews;
CREATE TRIGGER trg_informational_interviews_updated_at BEFORE UPDATE ON public.informational_interviews FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: interview_preparation_checklists trg_interview_preparation_checklists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_interview_preparation_checklists_updated_at ON public.interview_preparation_checklists;
CREATE TRIGGER trg_interview_preparation_checklists_updated_at BEFORE UPDATE ON public.interview_preparation_checklists FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: interview_success_probability trg_interview_success_probability_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_interview_success_probability_updated_at ON public.interview_success_probability;
CREATE TRIGGER trg_interview_success_probability_updated_at BEFORE UPDATE ON public.interview_success_probability FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: linkedin_profile_optimization trg_linkedin_profile_optimization_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_linkedin_profile_optimization_updated_at ON public.linkedin_profile_optimization;
CREATE TRIGGER trg_linkedin_profile_optimization_updated_at BEFORE UPDATE ON public.linkedin_profile_optimization FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: prospectivejobs trg_log_material_history; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_log_material_history ON public.prospectivejobs;
CREATE TRIGGER trg_log_material_history AFTER INSERT OR DELETE OR UPDATE ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.log_material_history();


--
-- Name: mentor_dashboard_views trg_mentor_dashboard_views_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_mentor_dashboard_views_updated_at ON public.mentor_dashboard_views;
CREATE TRIGGER trg_mentor_dashboard_views_updated_at BEFORE UPDATE ON public.mentor_dashboard_views FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: networking_campaigns trg_networking_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_networking_campaigns_updated_at ON public.networking_campaigns;
CREATE TRIGGER trg_networking_campaigns_updated_at BEFORE UPDATE ON public.networking_campaigns FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: networking_events trg_networking_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_networking_events_updated_at ON public.networking_events;
CREATE TRIGGER trg_networking_events_updated_at BEFORE UPDATE ON public.networking_events FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: networking_goals trg_networking_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_networking_goals_updated_at ON public.networking_goals;
CREATE TRIGGER trg_networking_goals_updated_at BEFORE UPDATE ON public.networking_goals FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: performance_predictions trg_performance_predictions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_performance_predictions_updated_at ON public.performance_predictions;
CREATE TRIGGER trg_performance_predictions_updated_at BEFORE UPDATE ON public.performance_predictions FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: professional_contacts trg_professional_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_professional_contacts_updated_at ON public.professional_contacts;
CREATE TRIGGER trg_professional_contacts_updated_at BEFORE UPDATE ON public.professional_contacts FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: professional_references trg_professional_references_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_professional_references_updated_at ON public.professional_references;
CREATE TRIGGER trg_professional_references_updated_at BEFORE UPDATE ON public.professional_references FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: progress_sharing_settings trg_progress_sharing_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_progress_sharing_settings_updated_at ON public.progress_sharing_settings;
CREATE TRIGGER trg_progress_sharing_settings_updated_at BEFORE UPDATE ON public.progress_sharing_settings FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: referral_requests trg_referral_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_referral_requests_updated_at ON public.referral_requests;
CREATE TRIGGER trg_referral_requests_updated_at BEFORE UPDATE ON public.referral_requests FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: relationship_health_tracking trg_relationship_health_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_relationship_health_tracking_updated_at ON public.relationship_health_tracking;
CREATE TRIGGER trg_relationship_health_tracking_updated_at BEFORE UPDATE ON public.relationship_health_tracking FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: resume trg_resume_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_resume_timestamp ON public.resume;
CREATE TRIGGER trg_resume_timestamp BEFORE UPDATE ON public.resume FOR EACH ROW EXECUTE FUNCTION public.update_resume_timestamp();


--
-- Name: salary_negotiation_prep trg_salary_negotiation_prep_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_salary_negotiation_prep_updated_at ON public.salary_negotiation_prep;
CREATE TRIGGER trg_salary_negotiation_prep_updated_at BEFORE UPDATE ON public.salary_negotiation_prep FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: team_billing trg_team_billing_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_team_billing_updated_at ON public.team_billing;
CREATE TRIGGER trg_team_billing_updated_at BEFORE UPDATE ON public.team_billing FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: teams trg_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: interview_follow_ups trg_update_follow_ups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_follow_ups_updated_at ON public.interview_follow_ups;
CREATE TRIGGER trg_update_follow_ups_updated_at BEFORE UPDATE ON public.interview_follow_ups FOR EACH ROW EXECUTE FUNCTION public.update_follow_ups_updated_at();


--
-- Name: interview_feedback trg_update_interview_feedback_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_interview_feedback_updated_at ON public.interview_feedback;
CREATE TRIGGER trg_update_interview_feedback_updated_at BEFORE UPDATE ON public.interview_feedback FOR EACH ROW EXECUTE FUNCTION public.update_interview_feedback_updated_at();


--
-- Name: interviews trg_update_interviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_interviews_updated_at ON public.interviews;
CREATE TRIGGER trg_update_interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.update_interviews_updated_at();


--
-- Name: market_insights trg_update_market_insights_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_market_insights_timestamp ON public.market_insights;
CREATE TRIGGER trg_update_market_insights_timestamp BEFORE UPDATE ON public.market_insights FOR EACH ROW EXECUTE FUNCTION public.update_market_intelligence_timestamp();


--
-- Name: market_intelligence_cache trg_update_market_intelligence_cache_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_market_intelligence_cache_timestamp ON public.market_intelligence_cache;
CREATE TRIGGER trg_update_market_intelligence_cache_timestamp BEFORE UPDATE ON public.market_intelligence_cache FOR EACH ROW EXECUTE FUNCTION public.update_market_intelligence_timestamp();


--
-- Name: practice_sessions trg_update_practice_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_practice_sessions_updated_at ON public.practice_sessions;
CREATE TRIGGER trg_update_practice_sessions_updated_at BEFORE UPDATE ON public.practice_sessions FOR EACH ROW EXECUTE FUNCTION public.update_interview_feedback_updated_at();


--
-- Name: interview_pre_assessment trg_update_pre_assessment_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_pre_assessment_updated_at ON public.interview_pre_assessment;
CREATE TRIGGER trg_update_pre_assessment_updated_at BEFORE UPDATE ON public.interview_pre_assessment FOR EACH ROW EXECUTE FUNCTION public.update_pre_assessment_updated_at();


--
-- Name: interview_preparation_tasks trg_update_preparation_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_preparation_tasks_updated_at ON public.interview_preparation_tasks;
CREATE TRIGGER trg_update_preparation_tasks_updated_at BEFORE UPDATE ON public.interview_preparation_tasks FOR EACH ROW EXECUTE FUNCTION public.update_interviews_updated_at();


--
-- Name: interview_reminders trg_update_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_reminders_updated_at ON public.interview_reminders;
CREATE TRIGGER trg_update_reminders_updated_at BEFORE UPDATE ON public.interview_reminders FOR EACH ROW EXECUTE FUNCTION public.update_reminders_updated_at();


--
-- Name: prospectivejobs trg_update_status_change_time; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_status_change_time ON public.prospectivejobs;
CREATE TRIGGER trg_update_status_change_time BEFORE UPDATE OF stage ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.update_status_change_time();


--
-- Name: interview_thank_you_notes trg_update_thank_you_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_thank_you_notes_updated_at ON public.interview_thank_you_notes;
CREATE TRIGGER trg_update_thank_you_notes_updated_at BEFORE UPDATE ON public.interview_thank_you_notes FOR EACH ROW EXECUTE FUNCTION public.update_thank_you_notes_updated_at();


--
-- Name: job_opportunities update_job_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_job_opportunities_updated_at ON public.job_opportunities;
CREATE TRIGGER update_job_opportunities_updated_at BEFORE UPDATE ON public.job_opportunities FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- Name: accountability_relationships accountability_relationships_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountability_relationships
    ADD CONSTRAINT accountability_relationships_partner_id_fkey FOREIGN KEY (accountability_partner_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: accountability_relationships accountability_relationships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountability_relationships
    ADD CONSTRAINT accountability_relationships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: advisor_performance_evaluation advisor_performance_evaluation_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_performance_evaluation
    ADD CONSTRAINT advisor_performance_evaluation_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE;


--
-- Name: advisor_recommendations advisor_recommendations_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_recommendations
    ADD CONSTRAINT advisor_recommendations_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE;


--
-- Name: advisor_sessions advisor_sessions_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_sessions
    ADD CONSTRAINT advisor_sessions_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE;


--
-- Name: advisor_shared_data advisor_shared_data_advisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advisor_shared_data
    ADD CONSTRAINT advisor_shared_data_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE;


--
-- Name: application_success_analysis application_success_analysis_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_success_analysis
    ADD CONSTRAINT application_success_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: archived_prospectivejobs archived_prospectivejobs_current_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_prospectivejobs
    ADD CONSTRAINT archived_prospectivejobs_current_resume_id_fkey FOREIGN KEY (current_resume_id) REFERENCES public.resume(id);


--
-- Name: archived_prospectivejobs archived_prospectivejobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_prospectivejobs
    ADD CONSTRAINT archived_prospectivejobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: calendar_sync_settings calendar_sync_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_settings
    ADD CONSTRAINT calendar_sync_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: campaign_ab_testing campaign_ab_testing_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_ab_testing
    ADD CONSTRAINT campaign_ab_testing_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.networking_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_outreach campaign_outreach_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_outreach
    ADD CONSTRAINT campaign_outreach_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.networking_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_outreach campaign_outreach_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_outreach
    ADD CONSTRAINT campaign_outreach_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: career_goals career_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_goals
    ADD CONSTRAINT career_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: certifications certifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: chat_conversations chat_conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: chat_conversations chat_conversations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: chat_notifications chat_notifications_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_notifications
    ADD CONSTRAINT chat_notifications_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_notifications chat_notifications_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_notifications
    ADD CONSTRAINT chat_notifications_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_notifications chat_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_notifications
    ADD CONSTRAINT chat_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: coaching_sessions coaching_sessions_mentee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_sessions
    ADD CONSTRAINT coaching_sessions_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: coaching_sessions coaching_sessions_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_sessions
    ADD CONSTRAINT coaching_sessions_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: cohort_memberships cohort_memberships_cohort_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohort_memberships
    ADD CONSTRAINT cohort_memberships_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.user_cohorts(id) ON DELETE CASCADE;


--
-- Name: cohort_memberships cohort_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cohort_memberships
    ADD CONSTRAINT cohort_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: company_info company_info_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: company_interview_insights company_interview_insights_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_interview_insights
    ADD CONSTRAINT company_interview_insights_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;


--
-- Name: company_media company_media_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_media
    ADD CONSTRAINT company_media_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_info(id) ON DELETE CASCADE;


--
-- Name: company_news company_news_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_news
    ADD CONSTRAINT company_news_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_info(id) ON DELETE CASCADE;


--
-- Name: competitive_benchmarks competitive_benchmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitive_benchmarks
    ADD CONSTRAINT competitive_benchmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: contact_categories contact_categories_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_categories
    ADD CONSTRAINT contact_categories_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: contact_interactions contact_interactions_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_interactions
    ADD CONSTRAINT contact_interactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: contact_job_links contact_job_links_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_job_links
    ADD CONSTRAINT contact_job_links_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: contact_job_links contact_job_links_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_job_links
    ADD CONSTRAINT contact_job_links_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: coverletter coverletter_comments_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_comments_id_fkey FOREIGN KEY (comments_id) REFERENCES public.resume_comments(id);


--
-- Name: coverletter coverletter_job_is_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_job_is_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id);


--
-- Name: coverletter coverletter_parent_coverletter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_parent_coverletter_id_fkey FOREIGN KEY (parent_coverletter_id) REFERENCES public.coverletter(id);


--
-- Name: coverletter coverletter_template_is_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_template_is_fkey FOREIGN KEY (template_id) REFERENCES public.coverletter_template(id);


--
-- Name: coverletter coverletter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: custom_reports custom_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_reports
    ADD CONSTRAINT custom_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: discovered_contacts discovered_contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discovered_contacts
    ADD CONSTRAINT discovered_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: document_approvals document_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_approvals
    ADD CONSTRAINT document_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: document_approvals document_approvals_review_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_approvals
    ADD CONSTRAINT document_approvals_review_request_id_fkey FOREIGN KEY (review_request_id) REFERENCES public.document_review_requests(id) ON DELETE CASCADE;


--
-- Name: document_review_requests document_review_requests_requestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_review_requests
    ADD CONSTRAINT document_review_requests_requestor_id_fkey FOREIGN KEY (requestor_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: document_review_requests document_review_requests_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_review_requests
    ADD CONSTRAINT document_review_requests_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: educations educations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educations
    ADD CONSTRAINT educations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: enterprise_accounts enterprise_accounts_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enterprise_accounts
    ADD CONSTRAINT enterprise_accounts_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(u_id) ON DELETE RESTRICT;


--
-- Name: event_connections event_connections_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_connections
    ADD CONSTRAINT event_connections_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: event_connections event_connections_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_connections
    ADD CONSTRAINT event_connections_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: external_advisors external_advisors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_advisors
    ADD CONSTRAINT external_advisors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: family_progress_summaries family_progress_summaries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_progress_summaries
    ADD CONSTRAINT family_progress_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: family_support_access family_support_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_support_access
    ADD CONSTRAINT family_support_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_conflicts fk_conflicts_conflicting_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_conflicts
    ADD CONSTRAINT fk_conflicts_conflicting_interview FOREIGN KEY (conflicting_interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_conflicts fk_conflicts_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_conflicts
    ADD CONSTRAINT fk_conflicts_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: coverletter fk_coverletter_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT fk_coverletter_job FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;


--
-- Name: coverletter fk_coverletter_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT fk_coverletter_parent FOREIGN KEY (parent_coverletter_id) REFERENCES public.coverletter(id) ON DELETE CASCADE;


--
-- Name: coverletter fk_coverletter_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT fk_coverletter_template FOREIGN KEY (template_id) REFERENCES public.coverletter_template(id) ON DELETE SET NULL;


--
-- Name: interview_follow_ups fk_follow_ups_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_follow_ups
    ADD CONSTRAINT fk_follow_ups_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_feedback fk_interview_feedback_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_feedback
    ADD CONSTRAINT fk_interview_feedback_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_feedback fk_interview_feedback_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_feedback
    ADD CONSTRAINT fk_interview_feedback_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interviews fk_interviews_job_opportunity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT fk_interviews_job_opportunity FOREIGN KEY (job_opportunity_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: interviews fk_interviews_rescheduled_from; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT fk_interviews_rescheduled_from FOREIGN KEY (rescheduled_from) REFERENCES public.interviews(id) ON DELETE SET NULL;


--
-- Name: interviews fk_interviews_rescheduled_to; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT fk_interviews_rescheduled_to FOREIGN KEY (rescheduled_to) REFERENCES public.interviews(id) ON DELETE SET NULL;


--
-- Name: interviews fk_interviews_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT fk_interviews_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: cover_letter_performance fk_performance_coverletter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_performance
    ADD CONSTRAINT fk_performance_coverletter FOREIGN KEY (coverletter_id) REFERENCES public.coverletter(id) ON DELETE CASCADE;


--
-- Name: cover_letter_performance fk_performance_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_performance
    ADD CONSTRAINT fk_performance_job FOREIGN KEY (job_id) REFERENCES public.prospectivejobs(id) ON DELETE SET NULL;


--
-- Name: interview_post_reflection fk_post_reflection_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_post_reflection
    ADD CONSTRAINT fk_post_reflection_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_post_reflection fk_post_reflection_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_post_reflection
    ADD CONSTRAINT fk_post_reflection_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: practice_sessions fk_practice_sessions_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_sessions
    ADD CONSTRAINT fk_practice_sessions_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_pre_assessment fk_pre_assessment_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_pre_assessment
    ADD CONSTRAINT fk_pre_assessment_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_pre_assessment fk_pre_assessment_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_pre_assessment
    ADD CONSTRAINT fk_pre_assessment_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_preparation_tasks fk_preparation_tasks_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_tasks
    ADD CONSTRAINT fk_preparation_tasks_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_reminders fk_reminders_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_reminders
    ADD CONSTRAINT fk_reminders_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: resume fk_resume_job_opportunity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume
    ADD CONSTRAINT fk_resume_job_opportunity FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;


--
-- Name: resume fk_resume_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume
    ADD CONSTRAINT fk_resume_parent FOREIGN KEY (parent_resume_id) REFERENCES public.resume(id) ON DELETE CASCADE;


--
-- Name: resume fk_resume_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume
    ADD CONSTRAINT fk_resume_template FOREIGN KEY (template_id) REFERENCES public.resume_template(id) ON DELETE SET NULL;


--
-- Name: cover_letter_template_usage fk_template_usage_template; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_template_usage
    ADD CONSTRAINT fk_template_usage_template FOREIGN KEY (template_id) REFERENCES public.coverletter_template(id) ON DELETE CASCADE;


--
-- Name: cover_letter_template_usage fk_template_usage_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cover_letter_template_usage
    ADD CONSTRAINT fk_template_usage_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_thank_you_notes fk_thank_you_notes_interview; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_thank_you_notes
    ADD CONSTRAINT fk_thank_you_notes_interview FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: goal_milestones goal_milestones_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goal_milestones
    ADD CONSTRAINT goal_milestones_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.career_goals(id) ON DELETE CASCADE;


--
-- Name: group_challenges group_challenges_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenges
    ADD CONSTRAINT group_challenges_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE;


--
-- Name: group_discussions group_discussions_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_discussions
    ADD CONSTRAINT group_discussions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE;


--
-- Name: group_discussions group_discussions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_discussions
    ADD CONSTRAINT group_discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: group_memberships group_memberships_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE;


--
-- Name: group_memberships group_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: informational_interviews informational_interviews_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informational_interviews
    ADD CONSTRAINT informational_interviews_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: informational_interviews informational_interviews_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informational_interviews
    ADD CONSTRAINT informational_interviews_template_id_fkey FOREIGN KEY (outreach_template_id) REFERENCES public.informational_interview_templates(id) ON DELETE SET NULL;


--
-- Name: informational_interviews informational_interviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informational_interviews
    ADD CONSTRAINT informational_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_analytics interview_analytics_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_analytics
    ADD CONSTRAINT interview_analytics_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_analytics interview_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_analytics
    ADD CONSTRAINT interview_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_followups interview_followups_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_followups
    ADD CONSTRAINT interview_followups_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_followups interview_followups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_followups
    ADD CONSTRAINT interview_followups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_performance_tracking interview_performance_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_performance_tracking
    ADD CONSTRAINT interview_performance_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_preparation_checklists interview_preparation_checklists_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_checklists
    ADD CONSTRAINT interview_preparation_checklists_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_preparation_checklists interview_preparation_checklists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_checklists
    ADD CONSTRAINT interview_preparation_checklists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_preparation_tasks interview_preparation_tasks_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_tasks
    ADD CONSTRAINT interview_preparation_tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: interview_preparation_tasks interview_preparation_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_tasks
    ADD CONSTRAINT interview_preparation_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_preparation_tasks interview_preparation_tasks_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_preparation_tasks
    ADD CONSTRAINT interview_preparation_tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: interview_question_banks interview_question_banks_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_question_banks
    ADD CONSTRAINT interview_question_banks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: interview_response_coaching interview_response_coaching_practice_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_response_coaching
    ADD CONSTRAINT interview_response_coaching_practice_session_id_fkey FOREIGN KEY (practice_session_id) REFERENCES public.question_practice_sessions(id) ON DELETE SET NULL;


--
-- Name: interview_response_coaching interview_response_coaching_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_response_coaching
    ADD CONSTRAINT interview_response_coaching_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE;


--
-- Name: interview_response_coaching interview_response_coaching_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_response_coaching
    ADD CONSTRAINT interview_response_coaching_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: interview_success_probability interview_success_probability_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_success_probability
    ADD CONSTRAINT interview_success_probability_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;


--
-- Name: interview_success_probability interview_success_probability_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_success_probability
    ADD CONSTRAINT interview_success_probability_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: job_comments job_comments_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_comments
    ADD CONSTRAINT job_comments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: job_comments job_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_comments
    ADD CONSTRAINT job_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.job_comments(id) ON DELETE CASCADE;


--
-- Name: job_comments job_comments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_comments
    ADD CONSTRAINT job_comments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: job_comments job_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_comments
    ADD CONSTRAINT job_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: job_opportunities job_opportunities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_opportunities
    ADD CONSTRAINT job_opportunities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: job_search_metrics job_search_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_search_metrics
    ADD CONSTRAINT job_search_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: jobs jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: linkedin_networking_templates linkedin_networking_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkedin_networking_templates
    ADD CONSTRAINT linkedin_networking_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: linkedin_profile_optimization linkedin_profile_optimization_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkedin_profile_optimization
    ADD CONSTRAINT linkedin_profile_optimization_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: market_insights market_insights_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_insights
    ADD CONSTRAINT market_insights_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: market_intelligence market_intelligence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_intelligence
    ADD CONSTRAINT market_intelligence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: mentor_dashboard_data mentor_dashboard_data_relationship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_dashboard_data
    ADD CONSTRAINT mentor_dashboard_data_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE;


--
-- Name: mentor_dashboard_views mentor_dashboard_views_mentee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_dashboard_views
    ADD CONSTRAINT mentor_dashboard_views_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: mentor_dashboard_views mentor_dashboard_views_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_dashboard_views
    ADD CONSTRAINT mentor_dashboard_views_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: mentor_feedback mentor_feedback_relationship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE;


--
-- Name: mentor_relationships mentor_relationships_mentee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_relationships
    ADD CONSTRAINT mentor_relationships_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: mentor_relationships mentor_relationships_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_relationships
    ADD CONSTRAINT mentor_relationships_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: mentor_shared_data mentor_shared_data_relationship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_shared_data
    ADD CONSTRAINT mentor_shared_data_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE;


--
-- Name: mentor_shared_data mentor_shared_data_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_shared_data
    ADD CONSTRAINT mentor_shared_data_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: milestones milestones_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: mock_interview_followups mock_interview_followups_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_followups
    ADD CONSTRAINT mock_interview_followups_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.mock_interview_questions(id) ON DELETE CASCADE;


--
-- Name: mock_interview_messages mock_interview_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_messages
    ADD CONSTRAINT mock_interview_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE;


--
-- Name: mock_interview_questions mock_interview_questions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_questions
    ADD CONSTRAINT mock_interview_questions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE;


--
-- Name: mock_interview_sessions mock_interview_sessions_interview_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_sessions
    ADD CONSTRAINT mock_interview_sessions_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE SET NULL;


--
-- Name: mock_interview_sessions mock_interview_sessions_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_sessions
    ADD CONSTRAINT mock_interview_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;


--
-- Name: mock_interview_sessions mock_interview_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_interview_sessions
    ADD CONSTRAINT mock_interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: mutual_connections mutual_connections_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mutual_connections
    ADD CONSTRAINT mutual_connections_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: mutual_connections mutual_connections_mutual_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mutual_connections
    ADD CONSTRAINT mutual_connections_mutual_contact_id_fkey FOREIGN KEY (mutual_contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: network_roi_analytics network_roi_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.network_roi_analytics
    ADD CONSTRAINT network_roi_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: networking_campaigns networking_campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_campaigns
    ADD CONSTRAINT networking_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: networking_events networking_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_events
    ADD CONSTRAINT networking_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: networking_goals networking_goals_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_goals
    ADD CONSTRAINT networking_goals_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE;


--
-- Name: networking_goals networking_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_goals
    ADD CONSTRAINT networking_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: peer_referrals peer_referrals_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.peer_referrals
    ADD CONSTRAINT peer_referrals_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE;


--
-- Name: peer_referrals peer_referrals_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.peer_referrals
    ADD CONSTRAINT peer_referrals_job_id_fkey FOREIGN KEY (job_opportunity_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: peer_referrals peer_referrals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.peer_referrals
    ADD CONSTRAINT peer_referrals_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: performance_predictions performance_predictions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_predictions
    ADD CONSTRAINT performance_predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: performance_trends performance_trends_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_trends
    ADD CONSTRAINT performance_trends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: preparation_tasks preparation_tasks_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preparation_tasks
    ADD CONSTRAINT preparation_tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: preparation_tasks preparation_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preparation_tasks
    ADD CONSTRAINT preparation_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: preparation_tasks preparation_tasks_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preparation_tasks
    ADD CONSTRAINT preparation_tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: productivity_analysis productivity_analysis_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productivity_analysis
    ADD CONSTRAINT productivity_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: professional_contacts professional_contacts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_contacts
    ADD CONSTRAINT professional_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: professional_references professional_references_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_references
    ADD CONSTRAINT professional_references_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: professional_references professional_references_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_references
    ADD CONSTRAINT professional_references_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: program_effectiveness_analytics program_effectiveness_analytics_cohort_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_effectiveness_analytics
    ADD CONSTRAINT program_effectiveness_analytics_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.user_cohorts(id) ON DELETE SET NULL;


--
-- Name: program_effectiveness_analytics program_effectiveness_analytics_enterprise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_effectiveness_analytics
    ADD CONSTRAINT program_effectiveness_analytics_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES public.enterprise_accounts(id) ON DELETE CASCADE;


--
-- Name: progress_reports progress_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_reports
    ADD CONSTRAINT progress_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: progress_shares progress_shares_shared_with_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_shares
    ADD CONSTRAINT progress_shares_shared_with_team_id_fkey FOREIGN KEY (shared_with_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: progress_shares progress_shares_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_shares
    ADD CONSTRAINT progress_shares_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: progress_shares progress_shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_shares
    ADD CONSTRAINT progress_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: progress_sharing_settings progress_sharing_settings_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_sharing_settings
    ADD CONSTRAINT progress_sharing_settings_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: progress_sharing_settings progress_sharing_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_sharing_settings
    ADD CONSTRAINT progress_sharing_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: prospectivejob_material_history prospectivejob_material_history_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospectivejob_material_history
    ADD CONSTRAINT prospectivejob_material_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.prospectivejobs(id) ON DELETE CASCADE;


--
-- Name: prospectivejobs prospectivejobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospectivejobs
    ADD CONSTRAINT prospectivejobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: question_practice_sessions question_practice_sessions_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_practice_sessions
    ADD CONSTRAINT question_practice_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;


--
-- Name: question_practice_sessions question_practice_sessions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_practice_sessions
    ADD CONSTRAINT question_practice_sessions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE;


--
-- Name: question_practice_sessions question_practice_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_practice_sessions
    ADD CONSTRAINT question_practice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: reference_portfolios reference_portfolios_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_portfolios
    ADD CONSTRAINT reference_portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: reference_requests reference_requests_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_requests
    ADD CONSTRAINT reference_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: reference_requests reference_requests_reference_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_requests
    ADD CONSTRAINT reference_requests_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.professional_references(id) ON DELETE CASCADE;


--
-- Name: reference_requests reference_requests_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_requests
    ADD CONSTRAINT reference_requests_template_id_fkey FOREIGN KEY (request_template_id) REFERENCES public.reference_request_templates(id) ON DELETE SET NULL;


--
-- Name: referral_requests referral_requests_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_requests
    ADD CONSTRAINT referral_requests_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: referral_requests referral_requests_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_requests
    ADD CONSTRAINT referral_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: referral_requests referral_requests_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_requests
    ADD CONSTRAINT referral_requests_template_id_fkey FOREIGN KEY (request_template_id) REFERENCES public.referral_templates(id) ON DELETE SET NULL;


--
-- Name: referral_requests referral_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_requests
    ADD CONSTRAINT referral_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: relationship_health_tracking relationship_health_tracking_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_health_tracking
    ADD CONSTRAINT relationship_health_tracking_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: relationship_health_tracking relationship_health_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_health_tracking
    ADD CONSTRAINT relationship_health_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: relationship_maintenance_reminders relationship_maintenance_reminders_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_maintenance_reminders
    ADD CONSTRAINT relationship_maintenance_reminders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE;


--
-- Name: relationship_maintenance_reminders relationship_maintenance_reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relationship_maintenance_reminders
    ADD CONSTRAINT relationship_maintenance_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: resume_comments resume_comments_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_comments
    ADD CONSTRAINT resume_comments_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resume(id) ON DELETE CASCADE;


--
-- Name: resume_tailoring resume_tailoring_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_tailoring
    ADD CONSTRAINT resume_tailoring_id_fkey FOREIGN KEY (id) REFERENCES public.resume(id) ON DELETE CASCADE;


--
-- Name: resume_tailoring resume_tailoring_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_tailoring
    ADD CONSTRAINT resume_tailoring_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: resume resume_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume
    ADD CONSTRAINT resume_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: review_comments review_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.review_comments(id) ON DELETE CASCADE;


--
-- Name: review_comments review_comments_review_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_review_request_id_fkey FOREIGN KEY (review_request_id) REFERENCES public.document_review_requests(id) ON DELETE CASCADE;


--
-- Name: review_comments review_comments_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: review_comments review_comments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: salary_negotiation_prep salary_negotiation_prep_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_negotiation_prep
    ADD CONSTRAINT salary_negotiation_prep_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: salary_negotiation_prep salary_negotiation_prep_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_negotiation_prep
    ADD CONSTRAINT salary_negotiation_prep_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: salary_progression_tracking salary_progression_tracking_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_progression_tracking
    ADD CONSTRAINT salary_progression_tracking_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;


--
-- Name: salary_progression_tracking salary_progression_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_progression_tracking
    ADD CONSTRAINT salary_progression_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: shared_documents shared_documents_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: shared_documents shared_documents_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: shared_documents shared_documents_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_documents
    ADD CONSTRAINT shared_documents_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: shared_jobs shared_jobs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_jobs
    ADD CONSTRAINT shared_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE;


--
-- Name: shared_jobs shared_jobs_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_jobs
    ADD CONSTRAINT shared_jobs_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: shared_jobs shared_jobs_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_jobs
    ADD CONSTRAINT shared_jobs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: skills skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: success_patterns success_patterns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.success_patterns
    ADD CONSTRAINT success_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: support_effectiveness_tracking support_effectiveness_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_effectiveness_tracking
    ADD CONSTRAINT support_effectiveness_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: support_groups support_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_groups
    ADD CONSTRAINT support_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: team_billing team_billing_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_billing
    ADD CONSTRAINT team_billing_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_dashboards team_dashboards_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_dashboards
    ADD CONSTRAINT team_dashboards_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_invitations team_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: team_invitations team_invitations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(u_id) ON DELETE SET NULL;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: technical_prep_attempts technical_prep_attempts_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_prep_attempts
    ADD CONSTRAINT technical_prep_attempts_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.technical_prep_challenges(id) ON DELETE CASCADE;


--
-- Name: technical_prep_attempts technical_prep_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_prep_attempts
    ADD CONSTRAINT technical_prep_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: technical_prep_challenges technical_prep_challenges_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_prep_challenges
    ADD CONSTRAINT technical_prep_challenges_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL;


--
-- Name: technical_prep_challenges technical_prep_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technical_prep_challenges
    ADD CONSTRAINT technical_prep_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: time_tracking time_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_tracking
    ADD CONSTRAINT time_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: user_cohorts user_cohorts_enterprise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cohorts
    ADD CONSTRAINT user_cohorts_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES public.enterprise_accounts(id) ON DELETE CASCADE;


--
-- Name: users users_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: whiteboarding_practice whiteboarding_practice_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whiteboarding_practice
    ADD CONSTRAINT whiteboarding_practice_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- Name: writing_practice_sessions writing_practice_sessions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.writing_practice_sessions
    ADD CONSTRAINT writing_practice_sessions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE;


--
-- Name: writing_practice_sessions writing_practice_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.writing_practice_sessions
    ADD CONSTRAINT writing_practice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

