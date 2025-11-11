--
-- PostgreSQL database dump
--

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2025-11-07 17:48:01

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
-- TOC entry 241 (class 1255 OID 16404)
-- Name: addupdatetime(); Type: FUNCTION; Schema: public; Owner: superUser
--

DROP FUNCTION IF EXISTS public.addupdatetime() CASCADE;

CREATE FUNCTION public.addupdatetime() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


ALTER FUNCTION public.addupdatetime() OWNER TO ats_user;

--
-- TOC entry 246 (class 1255 OID 25067)
-- Name: auto_archive_jobs(); Type: FUNCTION; Schema: public; Owner: superUser
--

DROP FUNCTION IF EXISTS public.auto_archive_jobs() CASCADE;

CREATE FUNCTION public.auto_archive_jobs() RETURNS trigger
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


ALTER FUNCTION public.auto_archive_jobs() OWNER TO ats_user;

--
-- TOC entry 243 (class 1255 OID 25061)
-- Name: log_material_history(); Type: FUNCTION; Schema: public; Owner: superUser
--

DROP FUNCTION IF EXISTS public.log_material_history() CASCADE;

CREATE FUNCTION public.log_material_history() RETURNS trigger
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


ALTER FUNCTION public.log_material_history() OWNER TO ats_user;

--
-- TOC entry 240 (class 1255 OID 16402)
-- Name: lower_email(); Type: FUNCTION; Schema: public; Owner: superUser
--

DROP FUNCTION IF EXISTS public.lower_email() CASCADE;

CREATE FUNCTION public.lower_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.email = LOWER(NEW.email);
RETURN NEW;
END;
$$;


ALTER FUNCTION public.lower_email() OWNER TO ats_user;

--
-- TOC entry 245 (class 1255 OID 25065)
-- Name: update_coverletter_timestamp(); Type: FUNCTION; Schema: public; Owner: superUser
--

DROP FUNCTION IF EXISTS public.update_coverletter_timestamp() CASCADE;

CREATE FUNCTION public.update_coverletter_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_coverletter_timestamp() OWNER TO ats_user;

--
-- TOC entry 244 (class 1255 OID 25063)
-- Name: update_resume_timestamp(); Type: FUNCTION; Schema: public; Owner: superUser
--

DROP FUNCTION IF EXISTS public.update_resume_timestamp() CASCADE;

CREATE FUNCTION public.update_resume_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_resume_timestamp() OWNER TO ats_user;

--
-- TOC entry 242 (class 1255 OID 24788)
-- Name: update_status_change_time(); Type: FUNCTION; Schema: public; Owner: superUser
--

DROP FUNCTION IF EXISTS public.update_status_change_time() CASCADE;

CREATE FUNCTION public.update_status_change_time() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        NEW.status_change_time := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_status_change_time() OWNER TO ats_user;

-- Drop all tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.prospectivejob_material_history CASCADE;
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP TABLE IF EXISTS public.resume_shares CASCADE;
DROP TABLE IF EXISTS public.resume_comments CASCADE;
DROP TABLE IF EXISTS public.resume_versions CASCADE;
DROP TABLE IF EXISTS public.resumes CASCADE;
DROP TABLE IF EXISTS public.resume_template CASCADE;
DROP TABLE IF EXISTS public.coverletter_versions CASCADE;
DROP TABLE IF EXISTS public.coverletters CASCADE;
DROP TABLE IF EXISTS public.coverletter_template CASCADE;
DROP TABLE IF EXISTS public.prospectivejobs CASCADE;
DROP TABLE IF EXISTS public.archived_prospectivejobs CASCADE;
DROP TABLE IF EXISTS public.company_info CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.educations CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 235 (class 1259 OID 24956)
-- Name: archived_prospectivejobs; Type: TABLE; Schema: public; Owner: superUser
--

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
    CONSTRAINT archived_prospectivejobs_stage_check CHECK (((stage)::text = ANY ((ARRAY['Interested'::character varying, 'Applied'::character varying, 'Phone Screen'::character varying, 'Interview'::character varying, 'Offer'::character varying, 'Rejected'::character varying])::text[])))
);


ALTER TABLE public.archived_prospectivejobs OWNER TO ats_user;

--
-- TOC entry 225 (class 1259 OID 16525)
-- Name: certifications; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.certifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    never_expires boolean NOT NULL,
    name character varying(255) NOT NULL,
    org_name character varying(255) NOT NULL,
    date_earned date NOT NULL,
    expiration_date date
);


ALTER TABLE public.certifications OWNER TO ats_user;

--
-- TOC entry 229 (class 1259 OID 24806)
-- Name: company_info; Type: TABLE; Schema: public; Owner: superUser
--

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
    contact_phone character varying(255)
);


ALTER TABLE public.company_info OWNER TO ats_user;

--
-- TOC entry 230 (class 1259 OID 24821)
-- Name: company_media; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.company_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    platform character varying(255) NOT NULL,
    link character varying(1000)
);


ALTER TABLE public.company_media OWNER TO ats_user;

--
-- TOC entry 231 (class 1259 OID 24837)
-- Name: company_news; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.company_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    heading character varying(255) NOT NULL,
    description character varying(1000),
    type character varying(255) DEFAULT 'misc'::character varying NOT NULL,
    date date,
    source character varying(255)
);


ALTER TABLE public.company_news OWNER TO ats_user;

--
-- TOC entry 238 (class 1259 OID 25027)
-- Name: coverletter; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.coverletter (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_name character varying(255) DEFAULT 'New_CoverLetter'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file character varying(1000),
    comments_id uuid
);


ALTER TABLE public.coverletter OWNER TO ats_user;

--
-- TOC entry 237 (class 1259 OID 25014)
-- Name: coverletter_template; Type: TABLE; Schema: public; Owner: superUser
--

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
    CONSTRAINT coverletter_template_length_check CHECK (((length)::text = ANY ((ARRAY['brief'::character varying, 'standard'::character varying, 'detailed'::character varying])::text[])))
);


ALTER TABLE public.coverletter_template OWNER TO ats_user;

--
-- TOC entry 224 (class 1259 OID 16508)
-- Name: educations; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.educations (
    id uuid NOT NULL,
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


ALTER TABLE public.educations OWNER TO ats_user;

--
-- TOC entry 221 (class 1259 OID 16449)
-- Name: files; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.files (
    file_id uuid NOT NULL,
    file_data character varying(255),
    file_path character varying(255)
);


ALTER TABLE public.files OWNER TO ats_user;

--
-- TOC entry 239 (class 1259 OID 25069)
-- Name: interviews; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    date timestamp with time zone NOT NULL,
    outcome_link character varying(255),
    CONSTRAINT interviews_type_check CHECK (((type)::text = ANY ((ARRAY['phone'::character varying, 'video'::character varying, 'in-person'::character varying])::text[])))
);


ALTER TABLE public.interviews OWNER TO ats_user;

--
-- TOC entry 222 (class 1259 OID 16471)
-- Name: jobs; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.jobs (
    id uuid NOT NULL,
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


ALTER TABLE public.jobs OWNER TO ats_user;

--
-- TOC entry 220 (class 1259 OID 16407)
-- Name: profiles; Type: TABLE; Schema: public; Owner: superUser
--

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
ALTER TABLE ONLY public.profiles ALTER COLUMN pfp_link SET STORAGE PLAIN;


ALTER TABLE public.profiles OWNER TO ats_user;

--
-- TOC entry 226 (class 1259 OID 16543)
-- Name: projects; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.projects (
    id uuid NOT NULL,
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


ALTER TABLE public.projects OWNER TO ats_user;

--
-- TOC entry 228 (class 1259 OID 24790)
-- Name: prospectivejob_material_history; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.prospectivejob_material_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    resume_version character varying(1000),
    coverletter_version character varying(1000),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.prospectivejob_material_history OWNER TO ats_user;

--
-- TOC entry 227 (class 1259 OID 24768)
-- Name: prospectivejobs; Type: TABLE; Schema: public; Owner: superUser
--

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
    autoarchive_time_limit date DEFAULT (CURRENT_DATE + INTERVAL '1 year')::date
);


ALTER TABLE public.prospectivejobs OWNER TO ats_user;

--
-- TOC entry 233 (class 1259 OID 24924)
-- Name: resume; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.resume (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_name character varying(255) DEFAULT 'New_Resume'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file character varying(1000)
);


ALTER TABLE public.resume OWNER TO ats_user;

--
-- TOC entry 234 (class 1259 OID 24942)
-- Name: resume_comments; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.resume_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid,
    commenter character varying(255),
    comment text
);


ALTER TABLE public.resume_comments OWNER TO ats_user;

--
-- TOC entry 236 (class 1259 OID 24995)
-- Name: resume_tailoring; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.resume_tailoring (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    workexp_description text
);


ALTER TABLE public.resume_tailoring OWNER TO ats_user;

--
-- TOC entry 232 (class 1259 OID 24875)
-- Name: resume_template; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.resume_template (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255),
    description text,
    colors text,
    fonts text,
    existing_resume_template character varying(1000)
);


ALTER TABLE public.resume_template OWNER TO ats_user;

--
-- TOC entry 223 (class 1259 OID 16490)
-- Name: skills; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.skills (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    skill_name character varying(100) NOT NULL,
    proficiency character varying(15) NOT NULL,
    category character varying(20),
    skill_badge character varying(500)
);


ALTER TABLE public.skills OWNER TO ats_user;

--
-- TOC entry 219 (class 1259 OID 16390)
-- Name: users; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.users (
    u_id uuid NOT NULL,
    password character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email character varying(255) NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reset_token character varying(255),
    reset_token_expires timestamp without time zone,
    google_id character varying(255),
    auth_provider character varying(50) DEFAULT 'local'::character varying,
    linkedin_id character varying(255),
    role character varying(255) DEFAULT 'candidate'::character varying
);


ALTER TABLE public.users OWNER TO ats_user;

--
-- TOC entry 5223 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN users.google_id; Type: COMMENT; Schema: public; Owner: superUser
--

COMMENT ON COLUMN public.users.google_id IS 'Google OAuth ID for social login';


--
-- TOC entry 5224 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN users.auth_provider; Type: COMMENT; Schema: public; Owner: superUser
--

COMMENT ON COLUMN public.users.auth_provider IS 'Authentication provider: llocal or google';


--
-- TOC entry 5225 (class 0 OID 0)
-- Dependencies: 219
-- Name: COLUMN users.linkedin_id; Type: COMMENT; Schema: public; Owner: superUser
--

COMMENT ON COLUMN public.users.linkedin_id IS 'LinkedIn OAuth ID for social login';


--
-- TOC entry 5213 (class 0 OID 24956)
-- Dependencies: 235
-- Data for Name: archived_prospectivejobs; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.archived_prospectivejobs


--
-- TOC entry 5203 (class 0 OID 16525)
-- Dependencies: 225
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.certifications


--
-- TOC entry 5207 (class 0 OID 24806)
-- Dependencies: 229
-- Data for Name: company_info; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.company_info


--
-- TOC entry 5208 (class 0 OID 24821)
-- Dependencies: 230
-- Data for Name: company_media; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.company_media


--
-- TOC entry 5209 (class 0 OID 24837)
-- Dependencies: 231
-- Data for Name: company_news; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.company_news


--
-- TOC entry 5216 (class 0 OID 25027)
-- Dependencies: 238
-- Data for Name: coverletter; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.coverletter


--
-- TOC entry 5215 (class 0 OID 25014)
-- Dependencies: 237
-- Data for Name: coverletter_template; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.coverletter_template


--
-- TOC entry 5202 (class 0 OID 16508)
-- Dependencies: 224
-- Data for Name: educations; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.educations


--
-- TOC entry 5199 (class 0 OID 16449)
-- Dependencies: 221
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.files


--
-- TOC entry 5217 (class 0 OID 25069)
-- Dependencies: 239
-- Data for Name: interviews; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.interviews


--
-- TOC entry 5200 (class 0 OID 16471)
-- Dependencies: 222
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.jobs


--
-- TOC entry 5198 (class 0 OID 16407)
-- Dependencies: 220
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.profiles


--
-- TOC entry 5204 (class 0 OID 16543)
-- Dependencies: 226
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.projects


--
-- TOC entry 5206 (class 0 OID 24790)
-- Dependencies: 228
-- Data for Name: prospectivejob_material_history; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.prospectivejob_material_history


--
-- TOC entry 5205 (class 0 OID 24768)
-- Dependencies: 227
-- Data for Name: prospectivejobs; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.prospectivejobs


--
-- TOC entry 5211 (class 0 OID 24924)
-- Dependencies: 233
-- Data for Name: resume; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.resume


--
-- TOC entry 5212 (class 0 OID 24942)
-- Dependencies: 234
-- Data for Name: resume_comments; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.resume_comments


--
-- TOC entry 5214 (class 0 OID 24995)
-- Dependencies: 236
-- Data for Name: resume_tailoring; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.resume_tailoring


--
-- TOC entry 5210 (class 0 OID 24875)
-- Dependencies: 232
-- Data for Name: resume_template; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.resume_template


--
-- TOC entry 5201 (class 0 OID 16490)
-- Dependencies: 223
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.skills


--
-- TOC entry 5197 (class 0 OID 16390)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: superUser
--

-- No seed data for public.users


--
-- TOC entry 5014 (class 2606 OID 24970)
-- Name: archived_prospectivejobs archived_prospectivejobs_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.archived_prospectivejobs
    ADD CONSTRAINT archived_prospectivejobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4994 (class 2606 OID 16537)
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5002 (class 2606 OID 24815)
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- TOC entry 5004 (class 2606 OID 24831)
-- Name: company_media company_media_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.company_media
    ADD CONSTRAINT company_media_pkey PRIMARY KEY (id);


--
-- TOC entry 5006 (class 2606 OID 24849)
-- Name: company_news company_news_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.company_news
    ADD CONSTRAINT company_news_pkey PRIMARY KEY (id);


--
-- TOC entry 5020 (class 2606 OID 25039)
-- Name: coverletter coverletter_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_pkey PRIMARY KEY (id);


--
-- TOC entry 5018 (class 2606 OID 25026)
-- Name: coverletter_template coverletter_template_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.coverletter_template
    ADD CONSTRAINT coverletter_template_pkey PRIMARY KEY (id);


--
-- TOC entry 4992 (class 2606 OID 16519)
-- Name: educations educations_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.educations
    ADD CONSTRAINT educations_pkey PRIMARY KEY (id);


--
-- TOC entry 4984 (class 2606 OID 16456)
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (file_id);


--
-- TOC entry 5022 (class 2606 OID 25079)
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- TOC entry 4986 (class 2606 OID 16484)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4982 (class 2606 OID 16435)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4996 (class 2606 OID 16554)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 5000 (class 2606 OID 24800)
-- Name: prospectivejob_material_history prospectivejob_material_history_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.prospectivejob_material_history
    ADD CONSTRAINT prospectivejob_material_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4998 (class 2606 OID 24782)
-- Name: prospectivejobs prospectivejobs_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.prospectivejobs
    ADD CONSTRAINT prospectivejobs_pkey PRIMARY KEY (id);


--
-- TOC entry 5012 (class 2606 OID 24950)
-- Name: resume_comments resume_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume_comments
    ADD CONSTRAINT resume_comments_pkey PRIMARY KEY (id);


--
-- TOC entry 5010 (class 2606 OID 24936)
-- Name: resume resume_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume
    ADD CONSTRAINT resume_pkey PRIMARY KEY (id);


--
-- TOC entry 5016 (class 2606 OID 25003)
-- Name: resume_tailoring resume_tailoring_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume_tailoring
    ADD CONSTRAINT resume_tailoring_pkey PRIMARY KEY (id);


--
-- TOC entry 5008 (class 2606 OID 24883)
-- Name: resume_template resume_template_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume_template
    ADD CONSTRAINT resume_template_pkey PRIMARY KEY (id);


--
-- TOC entry 4988 (class 2606 OID 16500)
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- TOC entry 4990 (class 2606 OID 16502)
-- Name: skills skills_skill_name_key; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_skill_name_key UNIQUE (skill_name);


--
-- TOC entry 4978 (class 2606 OID 16401)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4980 (class 2606 OID 16399)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (u_id);


--
-- TOC entry 4975 (class 1259 OID 16596)
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: superUser
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- TOC entry 4976 (class 1259 OID 16598)
-- Name: idx_users_linkedin_id; Type: INDEX; Schema: public; Owner: superUser
--

CREATE INDEX idx_users_linkedin_id ON public.users USING btree (linkedin_id);


--
-- TOC entry 5043 (class 2620 OID 16403)
-- Name: users lowercaseemail; Type: TRIGGER; Schema: public; Owner: superUser
--

CREATE TRIGGER lowercaseemail BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.lower_email();


--
-- TOC entry 5044 (class 2620 OID 16406)
-- Name: users set_updated_at; Type: TRIGGER; Schema: public; Owner: superUser
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.addupdatetime();


--
-- TOC entry 5045 (class 2620 OID 25068)
-- Name: prospectivejobs trg_auto_archive_jobs; Type: TRIGGER; Schema: public; Owner: superUser
--

CREATE TRIGGER trg_auto_archive_jobs BEFORE UPDATE OF autoarchive_time_limit ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.auto_archive_jobs();


--
-- TOC entry 5049 (class 2620 OID 25066)
-- Name: coverletter trg_coverletter_timestamp; Type: TRIGGER; Schema: public; Owner: superUser
--

CREATE TRIGGER trg_coverletter_timestamp BEFORE UPDATE ON public.coverletter FOR EACH ROW EXECUTE FUNCTION public.update_coverletter_timestamp();


--
-- TOC entry 5046 (class 2620 OID 25062)
-- Name: prospectivejobs trg_log_material_history; Type: TRIGGER; Schema: public; Owner: superUser
--

CREATE TRIGGER trg_log_material_history AFTER INSERT OR DELETE OR UPDATE ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.log_material_history();


--
-- TOC entry 5048 (class 2620 OID 25064)
-- Name: resume trg_resume_timestamp; Type: TRIGGER; Schema: public; Owner: superUser
--

CREATE TRIGGER trg_resume_timestamp BEFORE UPDATE ON public.resume FOR EACH ROW EXECUTE FUNCTION public.update_resume_timestamp();


--
-- TOC entry 5047 (class 2620 OID 24789)
-- Name: prospectivejobs trg_update_status_change_time; Type: TRIGGER; Schema: public; Owner: superUser
--

CREATE TRIGGER trg_update_status_change_time BEFORE UPDATE OF stage ON public.prospectivejobs FOR EACH ROW EXECUTE FUNCTION public.update_status_change_time();


--
-- TOC entry 5036 (class 2606 OID 24976)
-- Name: archived_prospectivejobs archived_prospectivejobs_current_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.archived_prospectivejobs
    ADD CONSTRAINT archived_prospectivejobs_current_resume_id_fkey FOREIGN KEY (current_resume_id) REFERENCES public.resume(id);


--
-- TOC entry 5037 (class 2606 OID 24971)
-- Name: archived_prospectivejobs archived_prospectivejobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.archived_prospectivejobs
    ADD CONSTRAINT archived_prospectivejobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5027 (class 2606 OID 16583)
-- Name: certifications certifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5031 (class 2606 OID 24816)
-- Name: company_info company_info_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.prospectivejobs(id) ON DELETE CASCADE;


--
-- TOC entry 5032 (class 2606 OID 24832)
-- Name: company_media company_media_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.company_media
    ADD CONSTRAINT company_media_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_info(id) ON DELETE CASCADE;


--
-- TOC entry 5033 (class 2606 OID 24850)
-- Name: company_news company_news_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.company_news
    ADD CONSTRAINT company_news_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_info(id) ON DELETE CASCADE;


--
-- TOC entry 5040 (class 2606 OID 25045)
-- Name: coverletter coverletter_comments_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_comments_id_fkey FOREIGN KEY (comments_id) REFERENCES public.resume_comments(id);


--
-- TOC entry 5041 (class 2606 OID 25040)
-- Name: coverletter coverletter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.coverletter
    ADD CONSTRAINT coverletter_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5026 (class 2606 OID 16578)
-- Name: educations educations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.educations
    ADD CONSTRAINT educations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5042 (class 2606 OID 25080)
-- Name: interviews fk_interviews_user; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT fk_interviews_user FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5024 (class 2606 OID 16568)
-- Name: jobs jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5023 (class 2606 OID 16563)
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5028 (class 2606 OID 16588)
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5030 (class 2606 OID 24801)
-- Name: prospectivejob_material_history prospectivejob_material_history_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.prospectivejob_material_history
    ADD CONSTRAINT prospectivejob_material_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.prospectivejobs(id) ON DELETE CASCADE;


--
-- TOC entry 5029 (class 2606 OID 24783)
-- Name: prospectivejobs prospectivejobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.prospectivejobs
    ADD CONSTRAINT prospectivejobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5035 (class 2606 OID 24951)
-- Name: resume_comments resume_comments_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume_comments
    ADD CONSTRAINT resume_comments_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resume(id) ON DELETE CASCADE;


--
-- TOC entry 5038 (class 2606 OID 25004)
-- Name: resume_tailoring resume_tailoring_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume_tailoring
    ADD CONSTRAINT resume_tailoring_id_fkey FOREIGN KEY (id) REFERENCES public.resume(id) ON DELETE CASCADE;


--
-- TOC entry 5039 (class 2606 OID 25009)
-- Name: resume_tailoring resume_tailoring_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume_tailoring
    ADD CONSTRAINT resume_tailoring_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5034 (class 2606 OID 24937)
-- Name: resume resume_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.resume
    ADD CONSTRAINT resume_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


--
-- TOC entry 5025 (class 2606 OID 16573)
-- Name: skills skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superUser
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE;


-- Completed on 2025-11-07 17:48:01

--
-- PostgreSQL database dump complete
--

