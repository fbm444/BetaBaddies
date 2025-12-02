-- ============================================================================
-- SPRINT 3 DATABASE MIGRATION - NEW TABLES
-- ============================================================================
-- This migration script contains all new tables added in Sprint 3:
--   - Interview Preparation Suite (UC-074 to UC-085)
--   - Network Relationship Management (UC-086 to UC-095)
--   - Analytics Dashboard and Performance Insights (UC-096 to UC-107)
--   - Multi-User Collaboration Features (UC-108 to UC-115)
--   - Cover Letter Performance Tracking
--
-- Usage:
--   psql -U postgres -d your_database_name -f db/sprint3_tables_migration.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: SPRINT 3 NEW TABLES - INTERVIEW PREPARATION SUITE
-- ============================================================================

-- UC-075: Role-Specific Interview Question Bank
CREATE TABLE IF NOT EXISTS public.interview_question_banks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    difficulty_level character varying(20),
    category character varying(50),
    question_text text NOT NULL,
    star_framework_guidance text,
    industry_specific boolean DEFAULT false,
    linked_skills jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_question_banks_pkey PRIMARY KEY (id),
    CONSTRAINT interview_question_banks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.question_practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    job_id uuid,
    written_response text,
    practiced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    improvement_notes text,
    CONSTRAINT question_practice_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT question_practice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT question_practice_sessions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE,
    CONSTRAINT question_practice_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

-- UC-076: AI-Powered Response Coaching
CREATE TABLE IF NOT EXISTS public.interview_response_coaching (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_response_coaching_pkey PRIMARY KEY (id),
    CONSTRAINT interview_response_coaching_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT interview_response_coaching_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE,
    CONSTRAINT interview_response_coaching_practice_session_id_fkey FOREIGN KEY (practice_session_id) REFERENCES public.question_practice_sessions(id) ON DELETE SET NULL
);

-- UC-077: Mock Interview Practice Sessions
CREATE TABLE IF NOT EXISTS public.mock_interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_id uuid,
    target_role character varying(255),
    target_company character varying(255),
    interview_format character varying(50),
    status character varying(50) DEFAULT 'in_progress',
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    performance_summary jsonb,
    improvement_areas jsonb,
    confidence_score integer,
    pacing_recommendations text,
    CONSTRAINT mock_interview_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT mock_interview_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.mock_interview_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying(50),
    sequence_number integer,
    written_response text,
    response_length integer,
    time_spent integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mock_interview_questions_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_questions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mock_interview_followups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    followup_text text NOT NULL,
    response text,
    sequence_number integer,
    CONSTRAINT mock_interview_followups_pkey PRIMARY KEY (id),
    CONSTRAINT mock_interview_followups_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.mock_interview_questions(id) ON DELETE CASCADE
);

-- UC-078: Technical Interview Preparation
CREATE TABLE IF NOT EXISTS public.technical_prep_challenges (
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
    CONSTRAINT technical_prep_challenges_pkey PRIMARY KEY (id),
    CONSTRAINT technical_prep_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT technical_prep_challenges_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.technical_prep_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    user_id uuid NOT NULL,
    solution text,
    time_taken_seconds integer,
    performance_score integer,
    feedback text,
    completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT technical_prep_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT technical_prep_attempts_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.technical_prep_challenges(id) ON DELETE CASCADE,
    CONSTRAINT technical_prep_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.whiteboarding_practice (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    topic character varying(255),
    techniques_used jsonb,
    notes text,
    practiced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whiteboarding_practice_pkey PRIMARY KEY (id),
    CONSTRAINT whiteboarding_practice_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-079: Interview Scheduling and Calendar Integration
CREATE TABLE IF NOT EXISTS public.interview_preparation_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    task_description text NOT NULL,
    task_type character varying(50),
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_preparation_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT interview_preparation_tasks_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.calendar_sync_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calendar_provider character varying(50),
    access_token text,
    refresh_token text,
    calendar_id character varying(255),
    sync_enabled boolean DEFAULT false,
    last_sync_at timestamp with time zone,
    CONSTRAINT calendar_sync_settings_pkey PRIMARY KEY (id),
    CONSTRAINT calendar_sync_settings_user_id_key UNIQUE (user_id),
    CONSTRAINT calendar_sync_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-080: Interview Performance Analytics
CREATE TABLE IF NOT EXISTS public.interview_analytics (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT interview_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT interview_analytics_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE
);

-- UC-081: Pre-Interview Preparation Checklist
CREATE TABLE IF NOT EXISTS public.interview_preparation_checklists (
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_preparation_checklists_pkey PRIMARY KEY (id),
    CONSTRAINT interview_preparation_checklists_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT interview_preparation_checklists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-082: Interview Follow-Up Templates
CREATE TABLE IF NOT EXISTS public.interview_followups (
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
    response_content text,
    CONSTRAINT interview_followups_pkey PRIMARY KEY (id),
    CONSTRAINT interview_followups_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE,
    CONSTRAINT interview_followups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.followup_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_type character varying(50),
    template_name character varying(255),
    subject_template character varying(500),
    body_template text,
    timing_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT followup_templates_pkey PRIMARY KEY (id)
);

-- UC-083: Salary Negotiation Preparation
CREATE TABLE IF NOT EXISTS public.salary_negotiation_prep (
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
    outcome character varying(50) DEFAULT 'pending',
    final_salary numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_negotiation_prep_pkey PRIMARY KEY (id),
    CONSTRAINT salary_negotiation_prep_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT salary_negotiation_prep_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

-- UC-084: Interview Response Writing Practice
CREATE TABLE IF NOT EXISTS public.writing_practice_sessions (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT writing_practice_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT writing_practice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT writing_practice_sessions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_question_banks(id) ON DELETE CASCADE
);

-- UC-085: Interview Success Probability Scoring
CREATE TABLE IF NOT EXISTS public.interview_success_probability (
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_success_probability_pkey PRIMARY KEY (id),
    CONSTRAINT interview_success_probability_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT interview_success_probability_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 2: SPRINT 3 NEW TABLES - NETWORK RELATIONSHIP MANAGEMENT
-- ============================================================================

-- UC-086: Professional Contact Management
CREATE TABLE IF NOT EXISTS public.professional_contacts (
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT professional_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT professional_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.contact_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    interaction_type character varying(50),
    interaction_date date DEFAULT CURRENT_DATE,
    summary text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_interactions_pkey PRIMARY KEY (id),
    CONSTRAINT contact_interactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.contact_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    category_type character varying(50),
    category_value character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_categories_pkey PRIMARY KEY (id),
    CONSTRAINT contact_categories_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mutual_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    mutual_contact_id uuid NOT NULL,
    connection_strength character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mutual_connections_pkey PRIMARY KEY (id),
    CONSTRAINT mutual_connections_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT mutual_connections_mutual_contact_id_fkey FOREIGN KEY (mutual_contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.contact_job_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    job_id uuid NOT NULL,
    relationship_to_job character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_job_links_pkey PRIMARY KEY (id),
    CONSTRAINT contact_job_links_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT contact_job_links_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

-- UC-087: Referral Request Management
CREATE TABLE IF NOT EXISTS public.referral_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    etiquette_guidance text,
    timing_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT referral_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.referral_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    job_id uuid NOT NULL,
    request_template_id uuid,
    personalized_message text,
    request_status character varying(50) DEFAULT 'pending',
    sent_at timestamp with time zone,
    response_received_at timestamp with time zone,
    response_content text,
    referral_successful boolean,
    followup_required boolean DEFAULT false,
    followup_sent_at timestamp with time zone,
    gratitude_expressed boolean DEFAULT false,
    relationship_impact character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT referral_requests_pkey PRIMARY KEY (id),
    CONSTRAINT referral_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT referral_requests_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT referral_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
    CONSTRAINT referral_requests_template_id_fkey FOREIGN KEY (request_template_id) REFERENCES public.referral_templates(id) ON DELETE SET NULL
);

-- UC-088: Networking Event Management
CREATE TABLE IF NOT EXISTS public.networking_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_name character varying(255) NOT NULL,
    event_type character varying(50),
    industry character varying(255),
    location character varying(255),
    event_date date,
    event_time time,
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
    CONSTRAINT networking_events_pkey PRIMARY KEY (id),
    CONSTRAINT networking_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.event_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    connection_quality character varying(50),
    followup_required boolean DEFAULT false,
    followup_completed boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_connections_pkey PRIMARY KEY (id),
    CONSTRAINT event_connections_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE,
    CONSTRAINT event_connections_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.networking_goals (
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
    status character varying(50) DEFAULT 'active',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT networking_goals_pkey PRIMARY KEY (id),
    CONSTRAINT networking_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-089: LinkedIn Profile Integration
CREATE TABLE IF NOT EXISTS public.linkedin_networking_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_type character varying(50),
    template_name character varying(255),
    message_template text,
    optimization_suggestions text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT linkedin_networking_templates_pkey PRIMARY KEY (id),
    CONSTRAINT linkedin_networking_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.linkedin_profile_optimization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    optimization_area character varying(50),
    current_content text,
    suggested_improvements text,
    best_practices text,
    implemented boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT linkedin_profile_optimization_pkey PRIMARY KEY (id),
    CONSTRAINT linkedin_profile_optimization_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-090: Informational Interview Management
CREATE TABLE IF NOT EXISTS public.informational_interview_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    preparation_framework text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT informational_interview_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.informational_interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    request_status character varying(50) DEFAULT 'pending',
    outreach_template_id uuid,
    request_sent_at timestamp with time zone,
    scheduled_date date,
    scheduled_time time,
    preparation_framework jsonb,
    completed boolean DEFAULT false,
    completed_date date,
    insights text,
    industry_intelligence text,
    followup_sent boolean DEFAULT false,
    relationship_outcome character varying(255),
    linked_to_opportunities jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT informational_interviews_pkey PRIMARY KEY (id),
    CONSTRAINT informational_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT informational_interviews_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT informational_interviews_template_id_fkey FOREIGN KEY (outreach_template_id) REFERENCES public.informational_interview_templates(id) ON DELETE SET NULL
);

-- UC-091: Mentor and Career Coach Integration
CREATE TABLE IF NOT EXISTS public.mentor_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    relationship_type character varying(50),
    permissions_granted jsonb,
    invitation_status character varying(50) DEFAULT 'pending',
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_relationships_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_relationships_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT mentor_relationships_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mentor_shared_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    data_type character varying(50),
    data_id uuid,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_shared_data_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_shared_data_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mentor_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    feedback_type character varying(50),
    feedback_content text,
    recommendations text,
    implemented boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_feedback_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.mentor_dashboard_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relationship_id uuid NOT NULL,
    summary_data jsonb,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_dashboard_data_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_dashboard_data_relationship_id_fkey FOREIGN KEY (relationship_id) REFERENCES public.mentor_relationships(id) ON DELETE CASCADE
);

-- UC-092: Industry Contact Discovery
CREATE TABLE IF NOT EXISTS public.discovered_contacts (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT discovered_contacts_pkey PRIMARY KEY (id),
    CONSTRAINT discovered_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-093: Relationship Maintenance Automation
CREATE TABLE IF NOT EXISTS public.relationship_maintenance_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    reminder_type character varying(50),
    reminder_date date,
    reminder_sent boolean DEFAULT false,
    outreach_sent boolean DEFAULT false,
    personalized_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT relationship_maintenance_reminders_pkey PRIMARY KEY (id),
    CONSTRAINT relationship_maintenance_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT relationship_maintenance_reminders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.relationship_health_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    user_id uuid NOT NULL,
    health_score integer,
    engagement_frequency character varying(50),
    last_interaction_date date,
    reciprocity_score integer,
    value_exchange_notes text,
    maintenance_activities jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT relationship_health_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT relationship_health_tracking_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE,
    CONSTRAINT relationship_health_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-094: Networking Campaign Management
CREATE TABLE IF NOT EXISTS public.networking_campaigns (
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
    campaign_status character varying(50) DEFAULT 'planning',
    effectiveness_score integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT networking_campaigns_pkey PRIMARY KEY (id),
    CONSTRAINT networking_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.campaign_outreach (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    outreach_type character varying(50),
    outreach_message text,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    response_received boolean DEFAULT false,
    response_content text,
    relationship_quality character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT campaign_outreach_pkey PRIMARY KEY (id),
    CONSTRAINT campaign_outreach_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.networking_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT campaign_outreach_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.campaign_ab_testing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    test_name character varying(255),
    variant_a text,
    variant_b text,
    variant_a_response_rate numeric,
    variant_b_response_rate numeric,
    winning_variant character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT campaign_ab_testing_pkey PRIMARY KEY (id),
    CONSTRAINT campaign_ab_testing_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.networking_campaigns(id) ON DELETE CASCADE
);

-- UC-095: Professional Reference Management
CREATE TABLE IF NOT EXISTS public.professional_references (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    reference_type character varying(50),
    relationship_context text,
    reference_strength character varying(50),
    availability_status character varying(50) DEFAULT 'available',
    preferred_contact_method character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT professional_references_pkey PRIMARY KEY (id),
    CONSTRAINT professional_references_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT professional_references_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.professional_contacts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.reference_request_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_body text,
    preparation_guidance text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reference_request_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.reference_requests (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reference_requests_pkey PRIMARY KEY (id),
    CONSTRAINT reference_requests_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.professional_references(id) ON DELETE CASCADE,
    CONSTRAINT reference_requests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE,
    CONSTRAINT reference_requests_template_id_fkey FOREIGN KEY (request_template_id) REFERENCES public.reference_request_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.reference_portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    portfolio_name character varying(255),
    career_goal character varying(255),
    reference_ids jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reference_portfolios_pkey PRIMARY KEY (id),
    CONSTRAINT reference_portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 3: SPRINT 3 NEW TABLES - ANALYTICS DASHBOARD AND PERFORMANCE INSIGHTS
-- ============================================================================

-- UC-096: Job Search Performance Dashboard
CREATE TABLE IF NOT EXISTS public.job_search_metrics (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT job_search_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT job_search_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.performance_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    metric_type character varying(50),
    trend_direction character varying(50),
    trend_period character varying(50),
    data_points jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT performance_trends_pkey PRIMARY KEY (id),
    CONSTRAINT performance_trends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-097: Application Success Rate Analysis
CREATE TABLE IF NOT EXISTS public.application_success_analysis (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT application_success_analysis_pkey PRIMARY KEY (id),
    CONSTRAINT application_success_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-098: Interview Performance Tracking
CREATE TABLE IF NOT EXISTS public.interview_performance_tracking (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT interview_performance_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT interview_performance_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-099: Network ROI and Relationship Analytics
CREATE TABLE IF NOT EXISTS public.network_roi_analytics (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT network_roi_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT network_roi_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-100: Salary Progression and Market Positioning
CREATE TABLE IF NOT EXISTS public.salary_progression_tracking (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_progression_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT salary_progression_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT salary_progression_tracking_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_opportunities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.market_salary_data (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT market_salary_data_pkey PRIMARY KEY (id)
);

-- UC-101: Goal Setting and Achievement Tracking
CREATE TABLE IF NOT EXISTS public.career_goals (
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
    status character varying(50) DEFAULT 'active',
    milestones jsonb,
    achievement_date date,
    impact_on_job_search text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT career_goals_pkey PRIMARY KEY (id),
    CONSTRAINT career_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    milestone_description text,
    target_date date,
    completed boolean DEFAULT false,
    completed_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT goal_milestones_pkey PRIMARY KEY (id),
    CONSTRAINT goal_milestones_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.career_goals(id) ON DELETE CASCADE
);

-- UC-102: Market Intelligence and Industry Trends
CREATE TABLE IF NOT EXISTS public.market_intelligence (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT market_intelligence_pkey PRIMARY KEY (id),
    CONSTRAINT market_intelligence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.industry_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry character varying(255),
    trend_category character varying(50),
    trend_data jsonb,
    trend_description text,
    impact_analysis text,
    data_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT industry_trends_pkey PRIMARY KEY (id)
);

-- UC-103: Time Investment and Productivity Analysis
CREATE TABLE IF NOT EXISTS public.time_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type character varying(50),
    activity_description text,
    time_spent_minutes integer,
    activity_date date DEFAULT CURRENT_DATE,
    energy_level character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT time_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.productivity_analysis (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT productivity_analysis_pkey PRIMARY KEY (id),
    CONSTRAINT productivity_analysis_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-104: Competitive Analysis and Benchmarking
CREATE TABLE IF NOT EXISTS public.competitive_benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    benchmark_category character varying(50),
    user_value numeric,
    peer_average numeric,
    top_performer_value numeric,
    percentile_ranking integer,
    benchmark_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT competitive_benchmarks_pkey PRIMARY KEY (id),
    CONSTRAINT competitive_benchmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-105: Success Pattern Recognition
CREATE TABLE IF NOT EXISTS public.success_patterns (
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
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT success_patterns_pkey PRIMARY KEY (id),
    CONSTRAINT success_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-106: Custom Report Generation
CREATE TABLE IF NOT EXISTS public.custom_reports (
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT custom_reports_pkey PRIMARY KEY (id),
    CONSTRAINT custom_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    template_description text,
    default_metrics jsonb,
    default_filters jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT report_templates_pkey PRIMARY KEY (id)
);

-- UC-107: Performance Prediction and Forecasting
CREATE TABLE IF NOT EXISTS public.performance_predictions (
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT performance_predictions_pkey PRIMARY KEY (id),
    CONSTRAINT performance_predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 4: SPRINT 3 NEW TABLES - MULTI-USER COLLABORATION FEATURES
-- ============================================================================

-- UC-108: Team Account Management
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_name character varying(255) NOT NULL,
    team_type character varying(50),
    billing_email character varying(255),
    subscription_tier character varying(50),
    max_members integer,
    active_members integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- Add foreign key constraint for users.team_id after teams table is created
DO $$
BEGIN
    ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS team_id uuid;
    
    ALTER TABLE public.users 
        DROP CONSTRAINT IF EXISTS users_team_id_fkey;
    
    ALTER TABLE public.users 
        ADD CONSTRAINT users_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
    -- Constraint might already exist, ignore error
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50),
    permissions jsonb,
    invited_by uuid,
    invitation_status character varying(50) DEFAULT 'pending',
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    joined_at timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_members_pkey PRIMARY KEY (id),
    CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(u_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.team_dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    dashboard_data jsonb,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_dashboards_pkey PRIMARY KEY (id),
    CONSTRAINT team_dashboards_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.team_billing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    billing_cycle character varying(50),
    subscription_status character varying(50) DEFAULT 'active',
    next_billing_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_billing_pkey PRIMARY KEY (id),
    CONSTRAINT team_billing_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- UC-109: Mentor Dashboard and Coaching Tools
CREATE TABLE IF NOT EXISTS public.mentor_dashboard_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    dashboard_snapshot jsonb,
    key_indicators jsonb,
    coaching_insights jsonb,
    development_recommendations jsonb,
    last_viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mentor_dashboard_views_pkey PRIMARY KEY (id),
    CONSTRAINT mentor_dashboard_views_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT mentor_dashboard_views_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mentor_id uuid NOT NULL,
    mentee_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE,
    session_notes text,
    action_items jsonb,
    followup_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coaching_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT coaching_sessions_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT coaching_sessions_mentee_id_fkey FOREIGN KEY (mentee_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-110: Collaborative Resume and Cover Letter Review
CREATE TABLE IF NOT EXISTS public.document_review_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type character varying(50) NOT NULL,
    document_id uuid NOT NULL,
    requestor_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    request_status character varying(50) DEFAULT 'pending',
    deadline date,
    review_completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_review_requests_pkey PRIMARY KEY (id),
    CONSTRAINT document_review_requests_requestor_id_fkey FOREIGN KEY (requestor_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT document_review_requests_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT document_review_requests_check_type CHECK (document_type IN ('resume', 'coverletter')),
    CONSTRAINT document_review_requests_check_status CHECK (request_status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.document_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_request_id uuid,
    document_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    approver_id uuid NOT NULL,
    approved boolean DEFAULT false,
    approval_notes text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_approvals_pkey PRIMARY KEY (id),
    CONSTRAINT document_approvals_review_request_id_fkey FOREIGN KEY (review_request_id) REFERENCES public.document_review_requests(id) ON DELETE CASCADE,
    CONSTRAINT document_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT document_approvals_check_type CHECK (document_type IN ('resume', 'coverletter'))
);

-- UC-111: Progress Sharing and Accountability
CREATE TABLE IF NOT EXISTS public.progress_sharing_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    sharing_level character varying(50),
    shared_data_types jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT progress_sharing_settings_pkey PRIMARY KEY (id),
    CONSTRAINT progress_sharing_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT progress_sharing_settings_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.progress_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_period_start date,
    report_period_end date,
    report_data jsonb,
    shared_with jsonb,
    goal_progress jsonb,
    milestone_achievements jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT progress_reports_pkey PRIMARY KEY (id),
    CONSTRAINT progress_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.accountability_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    accountability_partner_id uuid NOT NULL,
    relationship_type character varying(50),
    engagement_level character varying(50),
    support_effectiveness integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accountability_relationships_pkey PRIMARY KEY (id),
    CONSTRAINT accountability_relationships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT accountability_relationships_partner_id_fkey FOREIGN KEY (accountability_partner_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-112: Peer Networking and Support Groups
CREATE TABLE IF NOT EXISTS public.support_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_name character varying(255) NOT NULL,
    group_type character varying(50),
    industry character varying(255),
    target_role character varying(255),
    description text,
    privacy_level character varying(50) DEFAULT 'public',
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_groups_pkey PRIMARY KEY (id),
    CONSTRAINT support_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.group_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_role character varying(50) DEFAULT 'member',
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    CONSTRAINT group_memberships_pkey PRIMARY KEY (id),
    CONSTRAINT group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE,
    CONSTRAINT group_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.group_discussions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    topic character varying(255),
    content text,
    is_anonymous boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_discussions_pkey PRIMARY KEY (id),
    CONSTRAINT group_discussions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE,
    CONSTRAINT group_discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.group_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    challenge_name character varying(255) NOT NULL,
    challenge_description text,
    start_date date,
    end_date date,
    participation_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_challenges_pkey PRIMARY KEY (id),
    CONSTRAINT group_challenges_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.peer_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    shared_by_user_id uuid NOT NULL,
    job_opportunity_id uuid NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT peer_referrals_pkey PRIMARY KEY (id),
    CONSTRAINT peer_referrals_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.support_groups(id) ON DELETE CASCADE,
    CONSTRAINT peer_referrals_user_id_fkey FOREIGN KEY (shared_by_user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT peer_referrals_job_id_fkey FOREIGN KEY (job_opportunity_id) REFERENCES public.job_opportunities(id) ON DELETE CASCADE
);

-- UC-113: Family and Personal Support Integration
CREATE TABLE IF NOT EXISTS public.family_support_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    family_member_email character varying(255),
    family_member_name character varying(255),
    relationship character varying(50),
    access_level character varying(50),
    educational_resources_provided boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT family_support_access_pkey PRIMARY KEY (id),
    CONSTRAINT family_support_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.family_progress_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    summary_period_start date,
    summary_period_end date,
    summary_content text,
    milestones_shared jsonb,
    celebrations jsonb,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT family_progress_summaries_pkey PRIMARY KEY (id),
    CONSTRAINT family_progress_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.support_effectiveness_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    support_type character varying(50),
    emotional_support_score integer,
    impact_on_performance text,
    stress_management_notes text,
    wellbeing_indicators jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT support_effectiveness_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT support_effectiveness_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

-- UC-114: Corporate Career Services Integration
CREATE TABLE IF NOT EXISTS public.enterprise_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_name character varying(255) NOT NULL,
    organization_type character varying(50),
    admin_user_id uuid NOT NULL,
    white_label_branding jsonb,
    max_users integer,
    active_users integer DEFAULT 0,
    subscription_tier character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT enterprise_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT enterprise_accounts_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(u_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.user_cohorts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    cohort_name character varying(255) NOT NULL,
    cohort_description text,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_cohorts_pkey PRIMARY KEY (id),
    CONSTRAINT user_cohorts_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES public.enterprise_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.cohort_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cohort_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cohort_memberships_pkey PRIMARY KEY (id),
    CONSTRAINT cohort_memberships_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.user_cohorts(id) ON DELETE CASCADE,
    CONSTRAINT cohort_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.program_effectiveness_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid NOT NULL,
    cohort_id uuid,
    analysis_period_start date,
    analysis_period_end date,
    aggregate_metrics jsonb,
    outcome_tracking jsonb,
    roi_calculations jsonb,
    program_optimization_insights jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT program_effectiveness_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT program_effectiveness_analytics_enterprise_id_fkey FOREIGN KEY (enterprise_id) REFERENCES public.enterprise_accounts(id) ON DELETE CASCADE,
    CONSTRAINT program_effectiveness_analytics_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.user_cohorts(id) ON DELETE SET NULL
);

-- UC-115: External Advisor and Coach Integration
CREATE TABLE IF NOT EXISTS public.external_advisors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    advisor_name character varying(255),
    advisor_email character varying(255),
    advisor_type character varying(50),
    relationship_status character varying(50) DEFAULT 'invited',
    permissions_granted jsonb,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT external_advisors_pkey PRIMARY KEY (id),
    CONSTRAINT external_advisors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_shared_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    data_type character varying(50),
    data_id uuid,
    shared_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_shared_data_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_shared_data_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    recommendation_type character varying(50),
    recommendation_content text,
    implementation_status character varying(50) DEFAULT 'pending',
    impact_assessment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_recommendations_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_recommendations_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE,
    session_time time,
    session_notes text,
    action_items jsonb,
    billing_integration_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_sessions_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.advisor_performance_evaluation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advisor_id uuid NOT NULL,
    evaluation_period_start date,
    evaluation_period_end date,
    effectiveness_score integer,
    impact_on_job_search text,
    feedback text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT advisor_performance_evaluation_pkey PRIMARY KEY (id),
    CONSTRAINT advisor_performance_evaluation_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES public.external_advisors(id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 5: COVER LETTER PERFORMANCE TRACKING TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS cover_letter_performance (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    coverletter_id UUID NOT NULL,
    job_id UUID,
    application_outcome VARCHAR(50), -- 'interview', 'rejected', 'no_response', 'accepted'
    response_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cover_letter_performance_pkey PRIMARY KEY (id),
    CONSTRAINT fk_performance_coverletter FOREIGN KEY (coverletter_id) REFERENCES coverletter(id) ON DELETE CASCADE,
    CONSTRAINT fk_performance_job FOREIGN KEY (job_id) REFERENCES prospectivejobs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cover_letter_template_usage (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    template_id UUID NOT NULL,
    user_id UUID,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cover_letter_template_usage_pkey PRIMARY KEY (id),
    CONSTRAINT fk_template_usage_template FOREIGN KEY (template_id) REFERENCES coverletter_template(id) ON DELETE CASCADE,
    CONSTRAINT fk_template_usage_user FOREIGN KEY (user_id) REFERENCES users(u_id) ON DELETE CASCADE,
    CONSTRAINT unique_template_user UNIQUE (template_id, user_id)
);

-- ============================================================================
-- SECTION 6: CREATE INDEXES
-- ============================================================================

-- Sprint 3: Interview Preparation Suite indexes
CREATE INDEX IF NOT EXISTS idx_interview_question_banks_job_id ON public.interview_question_banks(job_id);
CREATE INDEX IF NOT EXISTS idx_question_practice_sessions_user_id ON public.question_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_question_practice_sessions_question_id ON public.question_practice_sessions(question_id);
CREATE INDEX IF NOT EXISTS idx_interview_response_coaching_user_id ON public.interview_response_coaching(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_sessions_user_id ON public.mock_interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_questions_session_id ON public.mock_interview_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_technical_prep_challenges_user_id ON public.technical_prep_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_preparation_tasks_interview_id ON public.interview_preparation_tasks(interview_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_settings_user_id ON public.calendar_sync_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_analytics_user_id ON public.interview_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_preparation_checklists_interview_id ON public.interview_preparation_checklists(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_followups_interview_id ON public.interview_followups(interview_id);
CREATE INDEX IF NOT EXISTS idx_salary_negotiation_prep_user_id ON public.salary_negotiation_prep(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_practice_sessions_user_id ON public.writing_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_success_probability_user_id ON public.interview_success_probability(user_id);

-- Sprint 3: Network Relationship Management indexes
CREATE INDEX IF NOT EXISTS idx_professional_contacts_user_id ON public.professional_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON public.contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_user_id ON public.referral_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_job_id ON public.referral_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_networking_events_user_id ON public.networking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_event_connections_event_id ON public.event_connections(event_id);
CREATE INDEX IF NOT EXISTS idx_networking_goals_user_id ON public.networking_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_networking_templates_user_id ON public.linkedin_networking_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_informational_interviews_user_id ON public.informational_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentor_id ON public.mentor_relationships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentee_id ON public.mentor_relationships(mentee_id);
CREATE INDEX IF NOT EXISTS idx_discovered_contacts_user_id ON public.discovered_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_maintenance_reminders_user_id ON public.relationship_maintenance_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_campaigns_user_id ON public.networking_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_references_user_id ON public.professional_references(user_id);

-- Sprint 3: Analytics Dashboard indexes
CREATE INDEX IF NOT EXISTS idx_job_search_metrics_user_id ON public.job_search_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_trends_user_id ON public.performance_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_application_success_analysis_user_id ON public.application_success_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_performance_tracking_user_id ON public.interview_performance_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_network_roi_analytics_user_id ON public.network_roi_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_progression_tracking_user_id ON public.salary_progression_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON public.career_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_user_id ON public.market_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_user_id ON public.time_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_productivity_analysis_user_id ON public.productivity_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_competitive_benchmarks_user_id ON public.competitive_benchmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_success_patterns_user_id ON public.success_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON public.custom_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_predictions_user_id ON public.performance_predictions(user_id);

-- Sprint 3: Multi-User Collaboration indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_dashboard_views_mentor_id ON public.mentor_dashboard_views(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_dashboard_views_mentee_id ON public.mentor_dashboard_views(mentee_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_mentor_id ON public.coaching_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_document_review_requests_requestor_id ON public.document_review_requests(requestor_id);
CREATE INDEX IF NOT EXISTS idx_document_review_requests_reviewer_id ON public.document_review_requests(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_document_review_requests_document ON public.document_review_requests(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_review_request_id ON public.document_approvals(review_request_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON public.document_approvals(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_progress_sharing_settings_user_id ON public.progress_sharing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_accounts_admin_user_id ON public.enterprise_accounts(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_enterprise_id ON public.user_cohorts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_external_advisors_user_id ON public.external_advisors(user_id);

-- Cover Letter Performance indexes
CREATE INDEX IF NOT EXISTS idx_performance_coverletter_id ON cover_letter_performance(coverletter_id);
CREATE INDEX IF NOT EXISTS idx_performance_job_id ON cover_letter_performance(job_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON cover_letter_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON cover_letter_template_usage(user_id);

-- ============================================================================
-- SECTION 7: CREATE TRIGGERS
-- ============================================================================

-- Triggers for updated_at on all tables with updated_at columns
DROP TRIGGER IF EXISTS trg_professional_contacts_updated_at ON public.professional_contacts;
CREATE TRIGGER trg_professional_contacts_updated_at
    BEFORE UPDATE ON public.professional_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_referral_requests_updated_at ON public.referral_requests;
CREATE TRIGGER trg_referral_requests_updated_at
    BEFORE UPDATE ON public.referral_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_networking_events_updated_at ON public.networking_events;
CREATE TRIGGER trg_networking_events_updated_at
    BEFORE UPDATE ON public.networking_events
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_networking_goals_updated_at ON public.networking_goals;
CREATE TRIGGER trg_networking_goals_updated_at
    BEFORE UPDATE ON public.networking_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_linkedin_profile_optimization_updated_at ON public.linkedin_profile_optimization;
CREATE TRIGGER trg_linkedin_profile_optimization_updated_at
    BEFORE UPDATE ON public.linkedin_profile_optimization
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_informational_interviews_updated_at ON public.informational_interviews;
CREATE TRIGGER trg_informational_interviews_updated_at
    BEFORE UPDATE ON public.informational_interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_relationship_health_tracking_updated_at ON public.relationship_health_tracking;
CREATE TRIGGER trg_relationship_health_tracking_updated_at
    BEFORE UPDATE ON public.relationship_health_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_networking_campaigns_updated_at ON public.networking_campaigns;
CREATE TRIGGER trg_networking_campaigns_updated_at
    BEFORE UPDATE ON public.networking_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_professional_references_updated_at ON public.professional_references;
CREATE TRIGGER trg_professional_references_updated_at
    BEFORE UPDATE ON public.professional_references
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_salary_negotiation_prep_updated_at ON public.salary_negotiation_prep;
CREATE TRIGGER trg_salary_negotiation_prep_updated_at
    BEFORE UPDATE ON public.salary_negotiation_prep
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_interview_success_probability_updated_at ON public.interview_success_probability;
CREATE TRIGGER trg_interview_success_probability_updated_at
    BEFORE UPDATE ON public.interview_success_probability
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_interview_preparation_checklists_updated_at ON public.interview_preparation_checklists;
CREATE TRIGGER trg_interview_preparation_checklists_updated_at
    BEFORE UPDATE ON public.interview_preparation_checklists
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_career_goals_updated_at ON public.career_goals;
CREATE TRIGGER trg_career_goals_updated_at
    BEFORE UPDATE ON public.career_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_custom_reports_updated_at ON public.custom_reports;
CREATE TRIGGER trg_custom_reports_updated_at
    BEFORE UPDATE ON public.custom_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_performance_predictions_updated_at ON public.performance_predictions;
CREATE TRIGGER trg_performance_predictions_updated_at
    BEFORE UPDATE ON public.performance_predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_team_billing_updated_at ON public.team_billing;
CREATE TRIGGER trg_team_billing_updated_at
    BEFORE UPDATE ON public.team_billing
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_mentor_dashboard_views_updated_at ON public.mentor_dashboard_views;
CREATE TRIGGER trg_mentor_dashboard_views_updated_at
    BEFORE UPDATE ON public.mentor_dashboard_views
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_progress_sharing_settings_updated_at ON public.progress_sharing_settings;
CREATE TRIGGER trg_progress_sharing_settings_updated_at
    BEFORE UPDATE ON public.progress_sharing_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_advisor_recommendations_updated_at ON public.advisor_recommendations;
CREATE TRIGGER trg_advisor_recommendations_updated_at
    BEFORE UPDATE ON public.advisor_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

DROP TRIGGER IF EXISTS trg_enterprise_accounts_updated_at ON public.enterprise_accounts;
CREATE TRIGGER trg_enterprise_accounts_updated_at
    BEFORE UPDATE ON public.enterprise_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.addupdatetime();

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All Sprint 3 tables, indexes, and triggers have been created.
-- Total tables created: 70+
-- ============================================================================

