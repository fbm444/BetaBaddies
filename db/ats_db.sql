--
-- PostgreSQL database dump
--

\restrict 5tC0UzyDNSROOsfVwzolUygeroXx0MvWWiWIWnHZ1hwC55uJUlRDihBSJH7jdHa

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2025-11-07 17:48:01

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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

CREATE FUNCTION public.addupdatetime() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$;


ALTER FUNCTION public.addupdatetime() OWNER TO "superUser";

--
-- TOC entry 246 (class 1255 OID 25067)
-- Name: auto_archive_jobs(); Type: FUNCTION; Schema: public; Owner: superUser
--

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


ALTER FUNCTION public.auto_archive_jobs() OWNER TO "superUser";

--
-- TOC entry 243 (class 1255 OID 25061)
-- Name: log_material_history(); Type: FUNCTION; Schema: public; Owner: superUser
--

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


ALTER FUNCTION public.log_material_history() OWNER TO "superUser";

--
-- TOC entry 240 (class 1255 OID 16402)
-- Name: lower_email(); Type: FUNCTION; Schema: public; Owner: superUser
--

CREATE FUNCTION public.lower_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.email = LOWER(NEW.email);
RETURN NEW;
END;
$$;


ALTER FUNCTION public.lower_email() OWNER TO "superUser";

--
-- TOC entry 245 (class 1255 OID 25065)
-- Name: update_coverletter_timestamp(); Type: FUNCTION; Schema: public; Owner: superUser
--

CREATE FUNCTION public.update_coverletter_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_coverletter_timestamp() OWNER TO "superUser";

--
-- TOC entry 244 (class 1255 OID 25063)
-- Name: update_resume_timestamp(); Type: FUNCTION; Schema: public; Owner: superUser
--

CREATE FUNCTION public.update_resume_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_resume_timestamp() OWNER TO "superUser";

--
-- TOC entry 242 (class 1255 OID 24788)
-- Name: update_status_change_time(); Type: FUNCTION; Schema: public; Owner: superUser
--

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


ALTER FUNCTION public.update_status_change_time() OWNER TO "superUser";

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


ALTER TABLE public.archived_prospectivejobs OWNER TO "superUser";

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


ALTER TABLE public.certifications OWNER TO "superUser";

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


ALTER TABLE public.company_info OWNER TO "superUser";

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


ALTER TABLE public.company_media OWNER TO "superUser";

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


ALTER TABLE public.company_news OWNER TO "superUser";

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


ALTER TABLE public.coverletter OWNER TO "superUser";

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
    CONSTRAINT coverletter_template_length_check CHECK (((length)::text = ANY ((ARRAY['brief'::character varying, 'standard'::character varying, 'detailed'::character varying])::text[]))),
    CONSTRAINT coverletter_template_tone_check CHECK (((tone)::text = ANY ((ARRAY['formal'::character varying, 'casual'::character varying, 'enthusiastic'::character varying, 'analytical'::character varying])::text[])))
);


ALTER TABLE public.coverletter_template OWNER TO "superUser";

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


ALTER TABLE public.educations OWNER TO "superUser";

--
-- TOC entry 221 (class 1259 OID 16449)
-- Name: files; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.files (
    file_id uuid NOT NULL,
    file_data character varying(255),
    file_path character varying(255)
);


ALTER TABLE public.files OWNER TO "superUser";

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


ALTER TABLE public.interviews OWNER TO "superUser";

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


ALTER TABLE public.jobs OWNER TO "superUser";

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


ALTER TABLE public.profiles OWNER TO "superUser";

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


ALTER TABLE public.projects OWNER TO "superUser";

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


ALTER TABLE public.prospectivejob_material_history OWNER TO "superUser";

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
    autoarchive_time_limit date DEFAULT (CURRENT_DATE + '1 year'::interval)
);


ALTER TABLE public.prospectivejobs OWNER TO "superUser";

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


ALTER TABLE public.resume OWNER TO "superUser";

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


ALTER TABLE public.resume_comments OWNER TO "superUser";

--
-- TOC entry 236 (class 1259 OID 24995)
-- Name: resume_tailoring; Type: TABLE; Schema: public; Owner: superUser
--

CREATE TABLE public.resume_tailoring (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    workexp_description text
);


ALTER TABLE public.resume_tailoring OWNER TO "superUser";

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


ALTER TABLE public.resume_template OWNER TO "superUser";

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


ALTER TABLE public.skills OWNER TO "superUser";

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


ALTER TABLE public.users OWNER TO "superUser";

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

COPY public.archived_prospectivejobs (id, user_id, deadline, description, industry, job_type, job_title, company, location, salary_low, salary_high, stage, status_change_time, personal_notes, salary_notes, date_added, job_url, current_resume_id, current_coverletter) FROM stdin;
\.


--
-- TOC entry 5203 (class 0 OID 16525)
-- Dependencies: 225
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.certifications (id, user_id, never_expires, name, org_name, date_earned, expiration_date) FROM stdin;
748eb503-6c24-4e4e-8c8a-4106ab0e00b9	2f5801a2-2cc1-4c59-a799-280e54102657	t	AWS	Amazon	2025-10-28	\N
\.


--
-- TOC entry 5207 (class 0 OID 24806)
-- Dependencies: 229
-- Data for Name: company_info; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.company_info (id, job_id, size, industry, location, website, description, company_logo, contact_email, contact_phone) FROM stdin;
\.


--
-- TOC entry 5208 (class 0 OID 24821)
-- Dependencies: 230
-- Data for Name: company_media; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.company_media (id, company_id, platform, link) FROM stdin;
\.


--
-- TOC entry 5209 (class 0 OID 24837)
-- Dependencies: 231
-- Data for Name: company_news; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.company_news (id, company_id, heading, description, type, date, source) FROM stdin;
\.


--
-- TOC entry 5216 (class 0 OID 25027)
-- Dependencies: 238
-- Data for Name: coverletter; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.coverletter (id, user_id, version_name, description, created_at, updated_at, file, comments_id) FROM stdin;
\.


--
-- TOC entry 5215 (class 0 OID 25014)
-- Dependencies: 237
-- Data for Name: coverletter_template; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.coverletter_template (id, template_name, description, tone, length, writing_style, colors, fonts, existing_coverletter_template) FROM stdin;
\.


--
-- TOC entry 5202 (class 0 OID 16508)
-- Dependencies: 224
-- Data for Name: educations; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.educations (id, user_id, school, degree_type, field, honors, gpa, is_enrolled, graddate, startdate) FROM stdin;
5386f281-1cd2-40ce-8f6f-14872b65192e	2f5801a2-2cc1-4c59-a799-280e54102657	NJIT	Bachelor's	CS	\N	3.760	t	2025-09-01	\N
5f0baf5d-3752-4b3a-b6a1-314875a8715f	2f5801a2-2cc1-4c59-a799-280e54102657	Rutgers	Master's	CS	\N	\N	f	2025-11-01	\N
\.


--
-- TOC entry 5199 (class 0 OID 16449)
-- Dependencies: 221
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.files (file_id, file_data, file_path) FROM stdin;
74eb546b-3f84-44d6-a109-563a1039fc62	{"u":"259c70da-2bee-4d54-9efa-ce9a3114293d","t":"profile_pic","s":76879,"m":"jpeg","c":"2025-10-28","th":1}	/uploads/profile-pics/profile_74eb546b-3f84-44d6-a109-563a1039fc62.jpg
3b79c26b-e8e8-4b3f-87d6-afaccc4c0df2	{"u":"2f5801a2-2cc1-4c59-a799-280e54102657","t":"profile_pic","s":76879,"m":"jpeg","c":"2025-10-28","th":1}	/uploads/profile-pics/profile_3b79c26b-e8e8-4b3f-87d6-afaccc4c0df2.jpg
\.


--
-- TOC entry 5217 (class 0 OID 25069)
-- Dependencies: 239
-- Data for Name: interviews; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.interviews (id, user_id, type, date, outcome_link) FROM stdin;
\.


--
-- TOC entry 5200 (class 0 OID 16471)
-- Dependencies: 222
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.jobs (id, user_id, title, company, location, end_date, is_current, description, salary, start_date) FROM stdin;
82e47e99-0c96-443b-a716-b30bf053bfce	2f5801a2-2cc1-4c59-a799-280e54102657	SWE	Google	\N	\N	t	\N	\N	2025-09-17
\.


--
-- TOC entry 5198 (class 0 OID 16407)
-- Dependencies: 220
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.profiles (first_name, middle_name, last_name, phone, city, state, job_title, bio, industry, exp_level, user_id, pfp_link) FROM stdin;
Lindsay	\N	Burke	\N	\N	NJ	\N	\N	\N	\N	2f5801a2-2cc1-4c59-a799-280e54102657	/uploads/profile-pics/profile_3b79c26b-e8e8-4b3f-87d6-afaccc4c0df2.jpg
\.


--
-- TOC entry 5204 (class 0 OID 16543)
-- Dependencies: 226
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.projects (id, user_id, name, link, description, start_date, end_date, technologies, collaborators, status, industry) FROM stdin;
332ca3ba-9aeb-42de-aa2e-56f9fc5eda6a	2f5801a2-2cc1-4c59-a799-280e54102657	My Project	https://github.com	This is my project description	2025-10-21	2025-11-27	React, Node	\N	Completed	Health Care
\.


--
-- TOC entry 5206 (class 0 OID 24790)
-- Dependencies: 228
-- Data for Name: prospectivejob_material_history; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.prospectivejob_material_history (id, job_id, resume_version, coverletter_version, created_at) FROM stdin;
\.


--
-- TOC entry 5205 (class 0 OID 24768)
-- Dependencies: 227
-- Data for Name: prospectivejobs; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.prospectivejobs (id, user_id, deadline, description, industry, job_type, job_title, company, location, salary_low, salary_high, stage, status_change_time, personal_notes, salary_notes, date_added, job_url, current_resume, current_coverletter, autoarchive_time_limit) FROM stdin;
\.


--
-- TOC entry 5211 (class 0 OID 24924)
-- Dependencies: 233
-- Data for Name: resume; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.resume (id, user_id, version_name, description, created_at, updated_at, file) FROM stdin;
\.


--
-- TOC entry 5212 (class 0 OID 24942)
-- Dependencies: 234
-- Data for Name: resume_comments; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.resume_comments (id, resume_id, commenter, comment) FROM stdin;
\.


--
-- TOC entry 5214 (class 0 OID 24995)
-- Dependencies: 236
-- Data for Name: resume_tailoring; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.resume_tailoring (id, user_id, workexp_description) FROM stdin;
\.


--
-- TOC entry 5210 (class 0 OID 24875)
-- Dependencies: 232
-- Data for Name: resume_template; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.resume_template (id, template_name, description, colors, fonts, existing_resume_template) FROM stdin;
\.


--
-- TOC entry 5201 (class 0 OID 16490)
-- Dependencies: 223
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.skills (id, user_id, skill_name, proficiency, category, skill_badge) FROM stdin;
5b9ebab5-a806-4983-887c-b6f0fdf5f153	2f5801a2-2cc1-4c59-a799-280e54102657	Java	Intermediate	Technical	\N
\.


--
-- TOC entry 5197 (class 0 OID 16390)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: superUser
--

COPY public.users (u_id, password, created_at, email, updated_at, reset_token, reset_token_expires, google_id, auth_provider, linkedin_id, role) FROM stdin;
cdfdbfa7-f129-46d0-b508-03165a18e200	$2b$12$8EcsAASTRbqRIj53vUe6cuF2YbJ4RGn2Lo/8Ag9OuV2X5KCud4FgO	2025-10-23 23:28:19.113589-04	test2-1761276498416@example.com	2025-10-23 23:28:19.113589-04	\N	\N	\N	local	\N	candidate
bd11bd06-d36d-434b-ba5f-a1c53c21bb07	$2b$12$tp3rYlt9fAd3jpz.xzCAIud22PwQTHDwVkzHTPQAttXaOyHoFE1pe	2025-10-23 23:28:20.543557-04	newuser-1761276500242@example.com	2025-10-23 23:28:20.543557-04	\N	\N	\N	local	\N	candidate
c438b2a9-da50-4045-a904-4e35272c387f	$2b$12$oGiqwxoWQmTvS7O7StMrZuZnH/k1/7bJx5T2mJ1QzfpdEFpIXZ3nq	2025-10-23 23:28:21.185243-04	authtest-1761276500909@example.com	2025-10-23 23:28:21.185243-04	\N	\N	\N	local	\N	candidate
5a78afab-f1ef-43b1-b1ed-14bb9c4cecbc	$2b$12$uWPSqO8jejvrH97eo9NCNe5D.fRXvIcSimRvMYn7U.WdJMSCoyhh6	2025-10-24 16:16:16.191174-04	authtest-1761336975908@example.com	2025-10-24 16:16:16.191174-04	\N	\N	\N	local	\N	candidate
420d82b9-cd4c-441c-8f30-12c1951f8e72	$2b$10$uOxmUB8fJe9MvxqPYFTVIOYieDRfaV2Whk2o1TzTC5bT5OpeoSTIa	2025-10-24 16:17:00.172772-04	test1-1761337019661@example.com	2025-10-24 16:17:03.767562-04	expired-token	2025-10-24 15:17:03.764	\N	local	\N	candidate
f4eb8f3b-1eac-4ba3-8442-9465cffd034e	$2b$10$wzvzlQBiBU0dWNkWj8FIS.GvJwnRSPkANIAdjLpFsZN3Hxk6dsyTG	2025-10-23 23:28:18.819799-04	test1-1761276498415@example.com	2025-10-23 23:28:21.482621-04	expired-token	2025-10-23 22:28:21.481	\N	local	\N	candidate
94b5170d-cdf9-4944-881a-f1233b800cf6	$2b$12$.jURMbxvFsSnm8nXIf9S7O3ynt6GC5rxdU/ub2aWYM6YhHB55MdAS	2025-10-23 23:29:57.456548-04	test2-1761276596558@example.com	2025-10-23 23:29:57.456548-04	\N	\N	\N	local	\N	candidate
0413aea7-e221-4124-aaf4-52a9f6a58b3f	$2b$12$4vFGOeUJYJ/lxxFBZMcKyuSyswyt7OXZbMoe1pAoGMP5NhPa1Co.m	2025-10-23 23:29:59.14423-04	newuser-1761276598865@example.com	2025-10-23 23:29:59.14423-04	\N	\N	\N	local	\N	candidate
7fe28da3-22c7-43f8-8083-5f70776f3570	$2b$12$bW8aEsvAIPlvWcBrFodnZ.NHwEoCJeAM7Z9K4dgG0NnGcKW7/3kTC	2025-10-23 23:29:59.717641-04	authtest-1761276599433@example.com	2025-10-23 23:29:59.717641-04	\N	\N	\N	local	\N	candidate
214ae2dd-4ac2-4ea8-95ef-245c1a7ca106	$2b$10$.c3mxwZWQ5IwwoCEhVosZef6R..lbDQazvYkunO06KvptxvTLCgrW	2025-10-24 16:16:13.441069-04	test1-1761336972855@example.com	2025-10-24 16:16:17.084745-04	expired-token	2025-10-24 15:16:17.083	\N	local	\N	candidate
2773560a-4789-4345-8e70-0bd7354ba0b8	$2b$10$hKz5UxW7WABcfXvp4KUhne7f5ISwyYZGZ81v8XVA5fnTQYR1KhCW.	2025-10-23 23:29:57.059094-04	test1-1761276596558@example.com	2025-10-23 23:30:00.151953-04	expired-token	2025-10-23 22:30:00.149	\N	local	\N	candidate
24c379c4-ac98-4d16-9e10-200228bdfc86	$2b$12$CWmZlsj80FyoDxv8ngGzyuo7DO3ILHvP0o2yeeKjoqukq2sVovxK6	2025-10-23 23:31:28.06718-04	test2-1761276687139@example.com	2025-10-23 23:31:28.06718-04	\N	\N	\N	local	\N	candidate
469b1f91-8b61-4f3e-af83-4036304a0cb9	$2b$12$GomFFDWW11dRxedWc/7dpO75qXvoqbmjgdE6KpKK9wKGZwLGs5NBS	2025-10-23 23:31:29.620318-04	newuser-1761276689330@example.com	2025-10-23 23:31:29.620318-04	\N	\N	\N	local	\N	candidate
523187a0-d707-4e95-babf-dfb2ae5d361d	$2b$12$EHN/uMkThdJ3FbFOTT7m.OP2bKYq4zOjIaEJzHC1vHZomVbHdVcA.	2025-10-23 23:31:30.220981-04	authtest-1761276689943@example.com	2025-10-23 23:31:30.220981-04	\N	\N	\N	local	\N	candidate
c99e3ead-a0ec-4e8c-945f-1e054f167ac1	$2b$12$okD3i9WsYQ5eMsCXcYecNusZFYxRQxR7cl7EfCz5NH0WmVDiEUL5q	2025-10-24 16:16:41.701133-04	test2-1761337000757@example.com	2025-10-24 16:16:41.701133-04	\N	\N	\N	local	\N	candidate
15f8ebd2-5aeb-4dee-9a7c-d85670d11f9a	$2b$12$VnoxLklYoahuh0qAJLlKfOLmocVrBZZzHI8uTwwDHjxtiwBkzCPBO	2025-10-24 16:16:43.246902-04	newuser-1761337002969@example.com	2025-10-24 16:16:43.246902-04	\N	\N	\N	local	\N	candidate
17d9b95b-63e0-47b5-8957-3054236709d2	$2b$12$TuGvk3rYdhswJpYCugh8Yu6Ya0qgXYaXjPy.B5KbtCF3zZOTcjdzW	2025-10-24 16:16:44.05402-04	authtest-1761337003781@example.com	2025-10-24 16:16:44.05402-04	\N	\N	\N	local	\N	candidate
18b56671-cb0e-4dd2-aac2-fb059c0a9f59	$2b$10$QU21iS5gGoDghNsM2Rllv.SFLumGkcmDIw62Mu7yYnboKfsiSBgIa	2025-10-23 23:31:27.632833-04	test1-1761276687139@example.com	2025-10-23 23:31:31.739809-04	expired-token	2025-10-23 22:31:31.734	\N	local	\N	candidate
0faa846f-a687-40ee-bb14-5a4e53d40651	$2b$12$NIgvfnQXZKHYQrJR.U2/e.pDUof1ePaigzs8W9HwrPg6H3Zdq6FLS	2025-10-24 16:14:26.544865-04	test2-1761336865847@example.com	2025-10-24 16:14:26.544865-04	\N	\N	\N	local	\N	candidate
b22647e6-d694-47b2-a466-f72d9a449460	$2b$12$2FENuT74iKBU7a4/vt4R1.pylFwpDNHuwck5MPkVererqygrOJbxC	2025-10-24 16:14:27.948582-04	newuser-1761336867666@example.com	2025-10-24 16:14:27.948582-04	\N	\N	\N	local	\N	candidate
f9697bbc-651d-44cc-9581-5b0cbbacd587	$2b$12$LulGbOHcdBZEhk1/GXn9dOBidBhwHgqopDnIQZrn/mB8rv56sRBCu	2025-10-24 16:14:28.53175-04	authtest-1761336868247@example.com	2025-10-24 16:14:28.53175-04	\N	\N	\N	local	\N	candidate
ed4d5bb0-c683-4132-aecc-9eca6ff9646e	$2b$12$RKz2v5OneHfdrH5UVRXc/uB7wl6l6J1NK2zC3zt.NfgBdj6H8ELei	2025-10-26 15:46:22.16671-04	test2-1761507981414@example.com	2025-10-26 15:46:22.16671-04	\N	\N	\N	local	\N	candidate
000262ad-7b71-43df-821d-9bcfec1344fb	$2b$12$.UXp58rQ3VC4ZXTuNdKU7.yCZhbp4FxVjCj4IgGiy0PGs5UMXppky	2025-10-26 15:46:23.564228-04	newuser-1761507983278@example.com	2025-10-26 15:46:23.564228-04	\N	\N	\N	local	\N	candidate
20532026-7f45-4b97-8d99-e224a28d391d	$2b$12$fs.7/wHB6y3yBcfzpQPUJ.m5arH.CrUk5yTnIhi822KryZIKO6jkK	2025-10-26 15:46:24.179871-04	authtest-1761507983904@example.com	2025-10-26 15:46:24.179871-04	\N	\N	\N	local	\N	candidate
d16697eb-15e2-4c48-9265-8887d570c950	$2b$10$XScWVuUrO4eA.oSALq1WWuV6JuM19F6ZcbU/8zd6cfbUqiv1hNEgW	2025-10-24 16:14:26.242687-04	test1-1761336865847@example.com	2025-10-24 16:14:29.110997-04	expired-token	2025-10-24 15:14:29.109	\N	local	\N	candidate
328f3d0d-8148-485c-be33-702663a5bc6b	$2b$12$okaGzsrwnVZDfKFaghvl7eOYMTUxYcCRO1YUsZv1.TkzGa4qZ6s1.	2025-10-24 16:15:51.610478-04	test2-1761336950676@example.com	2025-10-24 16:15:51.610478-04	\N	\N	\N	local	\N	candidate
ce96fc5e-d480-4d2e-8c80-5bd8227a3483	$2b$12$1WBUpKmTzuyffDPhsUgfV.TKJvGZ4adNC.TY/0FCZtfOB2FW.rxjO	2025-10-24 16:15:53.261754-04	newuser-1761336952980@example.com	2025-10-24 16:15:53.261754-04	\N	\N	\N	local	\N	candidate
eda57561-115b-4e3e-8ddd-51dd1f102987	$2b$12$ziiKSWY0w4e..poGMYrBu.LTFzqMfsxdNG3D/MrIkllvq7NDNKB1.	2025-10-24 16:15:53.868753-04	authtest-1761336953596@example.com	2025-10-24 16:15:53.868753-04	\N	\N	\N	local	\N	candidate
17fe6321-d353-4d51-9303-0c83986def59	$2b$10$SMnwCwvECj3MvGxZrjPvjezfDd2kh87rLev8ssUI1CpKmAPVAGg.6	2025-10-24 16:16:41.267704-04	test1-1761337000757@example.com	2025-10-24 16:16:45.386877-04	expired-token	2025-10-24 15:16:45.386	\N	local	\N	candidate
1a16c4ca-9e0b-4ccb-b2c1-9eb0d9359731	$2b$12$SkOyZKnUKU3nBXVaVdNsvOQmOo1QCGHCYXJPpx7Q3DmbUnAOQPn/q	2025-10-24 16:17:00.618686-04	test2-1761337019661@example.com	2025-10-24 16:17:00.618686-04	\N	\N	\N	local	\N	candidate
3b36c0fc-13e3-429d-b971-ff5feee33417	$2b$10$z3agGULgI8/YslvrqaKdXO6dsXsjfaTjpWixnbhg4lgq4j/ZUp2cW	2025-10-24 16:15:51.185628-04	test1-1761336950676@example.com	2025-10-24 16:15:54.830743-04	expired-token	2025-10-24 15:15:54.828	\N	local	\N	candidate
e40af491-1c3a-415f-839d-25b95e02a371	$2b$12$248L9CYYMqh3cIChwUZ.sejSuElFEB2oyROS40jnR/mvOD3U20OtO	2025-10-24 16:16:13.890137-04	test2-1761336972855@example.com	2025-10-24 16:16:13.890137-04	\N	\N	\N	local	\N	candidate
5363b5db-a0bb-495b-83b5-c965aa7a0d48	$2b$12$F5kLZQD0a1uCIxyA7hmI2.u2kCcMVCbbyeGoN6K/3Ihj4dEAiMXSq	2025-10-24 16:16:15.576194-04	newuser-1761336975299@example.com	2025-10-24 16:16:15.576194-04	\N	\N	\N	local	\N	candidate
cdce5244-ecea-4556-b28d-bb3ae539e2cd	$2b$12$0056uua.V2d3mTIH.6yaIezAjx0MtGiMZ4NqLinDnZnU39MZc.j2u	2025-10-24 16:17:02.255317-04	newuser-1761337021976@example.com	2025-10-24 16:17:02.255317-04	\N	\N	\N	local	\N	candidate
21bc3291-188e-47d6-9cc7-d249d0d2f4b1	$2b$12$Yg7r1LyPR7ZiCO6WYLqHZujGhM/N6N7YpVQAw2okLmh20rBGQMOti	2025-10-24 16:17:02.911271-04	authtest-1761337022632@example.com	2025-10-24 16:17:02.911271-04	\N	\N	\N	local	\N	candidate
3876455c-9b4f-431b-9853-be63adf0eef1	$2b$12$Aglf3H8Ck/IhX1B3BWiBqeTYSJy1bwFbKyc3U.KXr1wOTuK2.0502	2025-10-27 23:03:02.885897-04	lindsayreneeburke@gmail.com	2025-10-27 23:03:02.885897-04	\N	\N	\N	local	\N	candidate
14036d30-7674-44b4-8d66-04f11ca4a6d8	$2b$10$W39DU1RXtojRksf/8MxxnOPQhRtNLjJ7RRglUUebO93oq/uUkezVy	2025-10-26 15:46:21.812958-04	test1-1761507981414@example.com	2025-10-26 15:46:24.998201-04	expired-token	2025-10-26 14:46:24.991	\N	local	\N	candidate
832ba6ed-053a-4e4f-a794-3931b0e67f3a	$2b$12$3uhnTEAQphec1zeZVyBUreFt.Z99J8B6NVz9t/niOgnnnFs0c6YoK	2025-10-28 00:25:28.121671-04	john@gmail.com	2025-10-28 00:25:28.121671-04	\N	\N	\N	local	\N	candidate
851e03dc-6964-48f3-8773-bb7297df32c4	$2b$12$aBQsrzdN.3MmyDDQCicpG.CM27NR.xZcl1PJ5ihiYDG3vsIzUyrh2	2025-10-28 00:25:21.196635-04	johnsmith@gmail.com	2025-10-28 00:25:21.196635-04	\N	\N	\N	local	\N	candidate
2f5801a2-2cc1-4c59-a799-280e54102657	$2b$12$mAf2jOmcJfu3b817DBM81e7.QocG5RgKucAaOjBcKS7ffNPChCUdy	2025-10-28 18:09:10.183429-04	lrb@njit.edu	2025-10-28 18:13:56.916356-04	\N	\N	105813263267791831458	local	\N	candidate
36c264dc-d767-4fcc-baae-ba585469e6b9	$2b$12$1FPtwEhhV8642CAQpAtZEeyZl2ws8Aa/WmbOaMr.mir3CzJZCelW.	2025-10-28 18:55:40.949001-04	newuser-1761692140659@example.com	2025-10-28 18:55:40.949001-04	\N	\N	\N	local	\N	candidate
67f144a4-388c-478f-833e-f1cebcac3c6a	$2b$12$.HnrGza6jw9zB9nQ7yLjVeIOnI3czz8vE4YA1RDudhDTTOWiv.m7e	2025-10-28 18:58:06.656799-04	burkelrb@gmail.com	2025-10-28 19:02:11.819765-04	\N	\N	108907637635966501539	google	\N	candidate
c83750be-4fe4-40f3-937d-18dfd8c837a1	$2b$12$A/wBafH0FPSkwfJ5DItn4uWLyrw2d7PohKvxSSOWXciY4jm1RfNEm	2025-10-28 19:43:18.84419-04	newuser-1761694998460@example.com	2025-10-28 19:43:18.84419-04	\N	\N	\N	local	\N	candidate
cde45570-30ad-4c44-92f2-c107e5ca7fc8	$2b$12$xK11/HaKX3mRXurOrRnriecpSnT02g.jNQh8koK1VU.59982GiFpm	2025-10-28 19:44:57.489837-04	test1-1761695096956@example.com	2025-10-28 19:44:57.489837-04	\N	\N	\N	local	\N	candidate
aa3e494e-6c2f-4797-b786-9b902249c87c	$2b$12$M9C5Rv4Tq.omndLuJxO0E.oxRYIoVNZbz942O0VLqAQvC62.9wtHO	2025-10-28 19:44:57.938413-04	test2-1761695096956@example.com	2025-10-28 19:44:57.938413-04	\N	\N	\N	local	\N	candidate
\.


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

\unrestrict 5tC0UzyDNSROOsfVwzolUygeroXx0MvWWiWIWnHZ1hwC55uJUlRDihBSJH7jdHa

