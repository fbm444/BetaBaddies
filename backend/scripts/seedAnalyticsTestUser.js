/* eslint-disable no-console */
/**
 * Seed script for analytics.test@betabaddies.com
 * - Wipes existing data for this user
 * - Inserts realistic jobs (Google, Stripe, Microsoft)
 * - Adds resumes, cover letters, A/B tests, strategies
 * - Seeds one quality score for UI testing
 *
 * Usage:
 *   node backend/scripts/seedAnalyticsTestUser.js
 *
 * Uses the shared database pool (backend/services/database.js) and dotenv config.
 * Forces connection to the target DB name (defaults to "postgres").
 */

import dotenv from "dotenv";
dotenv.config();

// Force DB target to postgres (or provided env overrides)
const DB_NAME = process.env.DB_NAME || process.env.PGDATABASE || "postgres";
const DB_USER = process.env.DB_USER || process.env.PGUSER || "ats_user";
const DB_PASS = process.env.DB_PASS ?? process.env.PGPASSWORD ?? "";
const DB_HOST = process.env.DB_HOST || process.env.PGHOST || "localhost";
const DB_PORT = process.env.DB_PORT || process.env.PGPORT || "5432";

process.env.DB_NAME = DB_NAME;
process.env.DB_USER = DB_USER;
process.env.DB_PASS = DB_PASS;
process.env.DB_HOST = DB_HOST;
process.env.DB_PORT = DB_PORT;

process.env.PGDATABASE = DB_NAME;
process.env.PGUSER = DB_USER;
process.env.PGPASSWORD = DB_PASS;
process.env.PGHOST = DB_HOST;
process.env.PGPORT = DB_PORT;
process.env.DATABASE_URL = `postgres://${DB_USER}:${encodeURIComponent(
  DB_PASS
)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

const { default: database } = await import("../services/database.js");

const EMAIL = "analytics.test@betabaddies.com";
const PASSWORD = "Test123!"; // will be hashed with crypt(bf)

async function hashPassword(pwd) {
  const res = await database.query(`SELECT crypt($1, gen_salt('bf')) AS hash;`, [pwd]);
  return res.rows[0].hash;
}

async function seed() {
  console.log("🚀 Seeding analytics test user with realistic data...\n");

  // Ensure pgcrypto for crypt()
  await database.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // Start transaction
  await database.query("BEGIN");

  // Lookup and wipe existing user/data
  const existing = await database.query(
    `SELECT u_id FROM users WHERE email = $1 LIMIT 1`,
    [EMAIL]
  );
  if (existing.rows.length) {
    const uid = existing.rows[0].u_id;
    console.log(`🗑️  Removing existing data for user ${uid}...`);
    await database.query(`DELETE FROM interview_feedback WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM interview_pre_assessment WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM interview_post_reflection WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM interviews WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM salary_progression_history WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM salary_negotiations WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM job_offers WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM writing_practice_sessions WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM resume WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM coverletter WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM professional_contacts WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM networking_messages WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM coffee_chats WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM career_goals WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM certifications WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM projects WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM educations WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM skills WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM jobs WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM profiles WHERE user_id = $1`, [uid]).catch(() => {});
    await database.query(`DELETE FROM application_quality_scores WHERE user_id = $1`, [uid]);
    await database.query(`DELETE FROM application_strategies WHERE user_id = $1`, [uid]);
    await database.query(`DELETE FROM ab_tests WHERE user_id = $1`, [uid]);
    await database.query(`DELETE FROM application_documents WHERE user_id = $1`, [uid]);
    await database.query(
      `DELETE FROM coverletter WHERE job_id IN (SELECT id FROM job_opportunities WHERE user_id = $1)`,
      [uid]
    );
    await database.query(`DELETE FROM company_info WHERE job_id IN (SELECT id FROM job_opportunities WHERE user_id = $1)`, [uid]);
    await database.query(`DELETE FROM job_opportunities WHERE user_id = $1`, [uid]);
    await database.query(`DELETE FROM users WHERE u_id = $1`, [uid]);
  }

  // Create fresh user
  const hashed = await hashPassword(PASSWORD);
  const userRes = await database.query(
    `INSERT INTO users (u_id, email, password, auth_provider, role)
     VALUES (gen_random_uuid(), $1, $2, 'local', 'candidate')
     RETURNING u_id`,
    [EMAIL, hashed]
  );
  const userId = userRes.rows[0].u_id;
  console.log(`✅ Created user ${userId}`);

  // Profile
  await database.query(
    `INSERT INTO profiles (
      user_id, first_name, last_name, phone, city, state,
      job_title, bio, industry, exp_level, pfp_link
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      userId,
      "Sarah",
      "Chen",
      "(555) 987-6543",
      "San Francisco",
      "CA",
      "Senior Software Engineer",
      "Full-stack engineer with 6+ years building scalable systems, leading projects, and mentoring teams.",
      "Technology",
      "Senior",
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
    ]
  );

  // Skills
  const skills = [
    ["JavaScript", "Expert", "Languages"],
    ["TypeScript", "Advanced", "Languages"],
    ["Python", "Advanced", "Languages"],
    ["Go", "Intermediate", "Languages"],
    ["React", "Expert", "Technical"],
    ["Next.js", "Advanced", "Technical"],
    ["Node.js", "Advanced", "Technical"],
    ["Express", "Advanced", "Technical"],
    ["PostgreSQL", "Advanced", "Technical"],
    ["Redis", "Intermediate", "Technical"],
    ["AWS", "Advanced", "Technical"],
    ["Docker", "Advanced", "Technical"],
    ["Kubernetes", "Intermediate", "Technical"],
    ["System Design", "Advanced", "Technical"],
    ["Algorithms", "Expert", "Technical"],
    ["Data Structures", "Expert", "Technical"],
    ["Leadership", "Advanced", "Soft Skills"],
    ["Mentoring", "Advanced", "Soft Skills"],
  ];
  for (const [skillName, proficiency, category] of skills) {
    await database.query(
      `INSERT INTO skills (id, user_id, skill_name, proficiency, category)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [userId, skillName, proficiency, category]
    );
  }

  // Education
  await database.query(
    `INSERT INTO educations (id, user_id, school, degree_type, field, gpa, is_enrolled, graddate, startdate)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      "Stanford University",
      "Master's",
      "Computer Science",
      3.85,
      false,
      "2018-05-15",
      "2016-08-20",
    ]
  );
  await database.query(
    `INSERT INTO educations (id, user_id, school, degree_type, field, gpa, is_enrolled, graddate, startdate)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      "UC Berkeley",
      "Bachelor's",
      "Computer Science",
      3.78,
      false,
      "2016-05-20",
      "2012-08-25",
    ]
  );

  // Employment history
  const jobsHistory = [
    {
      title: "Senior Software Engineer",
      company: "LinkedIn",
      location: "Sunnyvale, CA",
      start: "2020-03-01",
      end: null,
      current: true,
      description:
        "Led microservices architecture, mentored juniors, improved latency by 30%, drove reliability initiatives.",
      salary: 155000,
    },
    {
      title: "Software Engineer",
      company: "Twitch",
      location: "San Francisco, CA",
      start: "2018-06-01",
      end: "2020-02-28",
      current: false,
      description:
        "Built React frontends and Node services; raised user engagement 25% with performance and UX improvements.",
      salary: 120000,
    },
  ];
  for (const j of jobsHistory) {
    await database.query(
      `INSERT INTO jobs (id, user_id, title, company, location, start_date, end_date, is_current, description, salary)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        j.title,
        j.company,
        j.location,
        j.start,
        j.end,
        j.current,
        j.description,
        j.salary,
      ]
    );
  }

  // Projects
  const projects = [
    {
      name: "Distributed E-Commerce Platform",
      desc: "Scalable microservices e-commerce handling 50K+ concurrent users; Redis caching, sharding, autoscaling.",
      start: "2021-01-01",
      end: "2021-06-30",
      tech: "React, Node.js, TypeScript, PostgreSQL, Redis, AWS, Docker, Kubernetes",
      status: "Completed",
      link: "https://github.com/example/ecommerce-platform",
    },
    {
      name: "Real-time Chat Application",
      desc: "WebSocket chat with 10K+ concurrent connections, queuing, presence, and E2E encryption.",
      start: "2020-08-01",
      end: "2020-12-31",
      tech: "React, Node.js, Socket.io, MongoDB, Redis, AWS",
      status: "Completed",
      link: "https://github.com/example/chat-app",
    },
  ];
  for (const p of projects) {
    await database.query(
      `INSERT INTO projects (id, user_id, name, description, start_date, end_date, technologies, status, link)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        p.name,
        p.desc,
        p.start,
        p.end,
        p.tech,
        p.status,
        p.link,
      ]
    );
  }

  // Certifications
  const certs = [
    ["AWS Certified Solutions Architect - Professional", "Amazon Web Services", "2022-05-15", false, "2025-05-15"],
    ["Google Cloud Professional Cloud Architect", "Google Cloud", "2023-02-10", false, "2026-02-10"],
    ["Kubernetes Administrator (CKA)", "CNCF", "2022-08-30", false, "2025-08-30"],
  ];
  for (const [name, org, dateEarned, neverExpires, expDate] of certs) {
    await database.query(
      `INSERT INTO certifications (id, user_id, name, org_name, date_earned, never_expires, expiration_date)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
      [userId, name, org, dateEarned, neverExpires, expDate]
    );
  }

  // Documents
  const docs = [
    {
      type: "resume",
      name: "Resume - SWE (Google focus)",
      template: "Clean",
      category: "professional",
      primary: true,
      file: "/demo/resumes/google_swe_resume.pdf",
    },
    {
      type: "resume",
      name: "Resume - PM (Stripe focus)",
      template: "Modern",
      category: "modern",
      primary: false,
      file: "/demo/resumes/stripe_pm_resume.pdf",
    },
  {
    type: "resume",
    name: "Resume - Systems (Meta focus)",
    template: "Bold",
    category: "professional",
    primary: false,
    file: "/demo/resumes/meta_systems_resume.pdf",
  },
  {
    type: "resume",
    name: "Resume - Infra (Cloud/K8s)",
    template: "Modern",
    category: "professional",
    primary: false,
    file: "/demo/resumes/cloud_infra_resume.pdf",
  },
    {
      type: "cover_letter",
      name: "Cover Letter - SWE",
      template: "Concise",
      category: "professional",
      primary: true,
      file: "/demo/covers/google_swe_cover.pdf",
    },
    {
      type: "cover_letter",
      name: "Cover Letter - PM",
      template: "Storytelling",
      category: "creative",
      primary: false,
      file: "/demo/covers/stripe_pm_cover.pdf",
    },
  {
    type: "cover_letter",
    name: "Cover Letter - Systems",
    template: "Professional",
    category: "professional",
    primary: false,
    file: "/demo/covers/meta_systems_cover.pdf",
  },
  ];

  const docIds = {};
  for (const [idx, d] of docs.entries()) {
    const res = await database.query(
      `INSERT INTO application_documents
       (id, user_id, document_type, document_name, version_number, template_name, template_category, is_active, is_primary, file_path)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, $8)
       RETURNING id`,
      [
        userId,
        d.type,
        d.name,
        idx + 1,
        d.template,
        d.category,
        d.primary,
        d.file,
      ]
    );
    docIds[d.name] = res.rows[0].id;
  }

  const resumePrimary = docIds["Resume - SWE (Google focus)"];
  const resumeAlt = docIds["Resume - PM (Stripe focus)"];
const resumeSystems = docIds["Resume - Systems (Meta focus)"];
const resumeInfra = docIds["Resume - Infra (Cloud/K8s)"];
  const coverPrimary = docIds["Cover Letter - SWE"];
  const coverAlt = docIds["Cover Letter - PM"];
const coverSystems = docIds["Cover Letter - Systems"];

  // A/B tests
  const abResumeRes = await database.query(
    `INSERT INTO ab_tests (
      id, user_id, test_name, test_type, description,
      control_group_config, variant_groups, traffic_split,
      status, created_at, start_date, end_date
    ) VALUES (
      gen_random_uuid(), $1,
      'Resume A/B: SWE vs PM flavor',
      'resume',
      'Compare SWE-focused resume vs PM-focused resume.',
      jsonb_build_object('name','SWE Resume','resumeVersionId',$2::text),
      jsonb_build_array(jsonb_build_object('name','PM Resume','resumeVersionId',$3::text)),
      jsonb_build_object('control',50,'variant_a',50),
      'completed',
      NOW() - INTERVAL '35 days',
      NOW() - INTERVAL '32 days',
      NOW() - INTERVAL '10 days'
    ) RETURNING id`,
    [userId, resumePrimary, resumeAlt]
  );
  const abResumeId = abResumeRes.rows[0].id;

  const abCoverRes = await database.query(
    `INSERT INTO ab_tests (
      id, user_id, test_name, test_type, description,
      control_group_config, variant_groups, traffic_split,
      status, created_at, start_date, end_date
    ) VALUES (
      gen_random_uuid(), $1,
      'Cover Letter A/B: concise vs storytelling',
      'cover_letter',
      'Compare concise professional cover vs storytelling cover.',
      jsonb_build_object('name','Concise CL','coverLetterVersionId',$2::text),
      jsonb_build_array(jsonb_build_object('name','Storytelling CL','coverLetterVersionId',$3::text)),
      jsonb_build_object('control',50,'variant_a',50),
      'completed',
      NOW() - INTERVAL '25 days',
      NOW() - INTERVAL '22 days',
      NOW() - INTERVAL '5 days'
    ) RETURNING id`,
    [userId, coverPrimary, coverAlt]
  );
  const abCoverId = abCoverRes.rows[0].id;

  // Jobs (core set)
  const jobs = [
    {
      key: "google",
      title: "Software Engineer, Cloud",
      company: "Google",
      location: "Mountain View, CA",
      industry: "Technology",
      jobType: "Full-time",
      salaryMin: 160000,
      salaryMax: 240000,
      url: "https://careers.google.com/jobs/cloud-swe",
      desc: "Build distributed systems and developer platforms for Google Cloud customers.",
      status: "Interview",
      appliedDaysAgo: 30,
      responseDaysAgo: 24, // responded ~6 days after apply
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "10000+",
    },
    {
      key: "stripe",
      title: "Product Manager, Issuing",
      company: "Stripe",
      location: "Remote",
      industry: "Fintech",
      jobType: "Full-time",
      salaryMin: 180000,
      salaryMax: 260000,
      url: "https://stripe.com/jobs/pm-issuing",
      desc: "Drive roadmap for Issuing; collaborate with eng/design; ship merchant-facing experiences.",
      status: "Phone Screen",
      appliedDaysAgo: 22,
      responseDaysAgo: 13, // responded ~9 days after apply
      locationType: "remote",
      timezone: "America/Los_Angeles",
      size: "5001-10000",
    },
    {
      key: "microsoft",
      title: "Technical Program Manager, AI",
      company: "Microsoft",
      location: "Redmond, WA",
      industry: "Technology",
      jobType: "Full-time",
      salaryMin: 170000,
      salaryMax: 240000,
      url: "https://careers.microsoft.com/tpm-ai",
      desc: "Lead AI/ML programs, cross-team delivery, and reliability for Azure AI.",
      status: "Applied",
      appliedDaysAgo: 10,
      responseDaysAgo: null, // no response yet
      locationType: "on-site",
      timezone: "America/Los_Angeles",
      size: "10000+",
    },
  ];

  const jobIds = {};
  const jobMeta = {};
  for (const j of jobs) {
    const appliedAt = new Date(Date.now() - j.appliedDaysAgo * 24 * 60 * 60 * 1000);
    const firstResponseAt =
      j.responseDaysAgo != null
        ? new Date(Date.now() - j.responseDaysAgo * 24 * 60 * 60 * 1000)
        : null;

    const res = await database.query(
      `INSERT INTO job_opportunities (
        id, user_id, title, company, location,
        salary_min, salary_max, job_posting_url, job_description,
        industry, job_type, status,
        application_history, location_type, timezone,
        application_submitted_at, first_response_at, status_updated_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        '[]'::jsonb, $12, $13,
        $14, $15, $16, $17, $18
      ) RETURNING id`,
      [
        userId,
        j.title,
        j.company,
        j.location,
        j.salaryMin,
        j.salaryMax,
        j.url,
        j.desc,
        j.industry,
        j.jobType,
        j.status,
        j.locationType,
        j.timezone,
        appliedAt,
        firstResponseAt,
        firstResponseAt || appliedAt,
        appliedAt,
        firstResponseAt || appliedAt,
      ]
    );
    const newJobId = res.rows[0].id;
    jobIds[j.key] = newJobId;
    jobMeta[j.key] = { title: j.title, company: j.company };

    await database.query(
      `INSERT INTO company_info (id, job_id, size, industry, location, website)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
      [
        res.rows[0].id,
        j.size,
        j.industry,
        j.location,
        `https://${j.company.toLowerCase()}.com`,
      ]
    );
  }

  // Additional jobs across many stages for testing (mostly in interviews)
  const extraJobs = [
    {
      key: "meta",
      title: "Senior Software Engineer",
      company: "Meta",
      location: "Menlo Park, CA",
      industry: "Technology",
      jobType: "Full-time",
      salaryMin: 185000,
      salaryMax: 260000,
      url: "https://www.metacareers.com/jobs",
      desc: "Build high-scale social systems and infra for feeds/ads.",
      status: "Interview",
      appliedDaysAgo: 40,
      responseDaysAgo: 33,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "10000+",
      resume: "primary",
      cover: "primary",
      channel: "Meta Careers",
      method: "company_website",
    },
    {
      key: "amazon",
      title: "Software Development Engineer II",
      company: "Amazon",
      location: "Seattle, WA",
      industry: "Technology",
      jobType: "Full-time",
      salaryMin: 170000,
      salaryMax: 240000,
      url: "https://www.amazon.jobs/en/jobs",
      desc: "Own services for retail/prime; large-scale systems.",
      status: "Interview",
      appliedDaysAgo: 35,
      responseDaysAgo: 27,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "10000+",
      resume: "primary",
      cover: "primary",
      channel: "Amazon Jobs",
      method: "company_website",
    },
    {
      key: "netflix",
      title: "Senior Software Engineer, Playback",
      company: "Netflix",
      location: "Los Gatos, CA",
      industry: "Media",
      jobType: "Full-time",
      salaryMin: 210000,
      salaryMax: 300000,
      url: "https://jobs.netflix.com",
      desc: "Improve video playback reliability and scale.",
      status: "Interview",
      appliedDaysAgo: 28,
      responseDaysAgo: 21,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "10000+",
      resume: "primary",
      cover: "primary",
      channel: "Referral",
      method: "referral",
    },
    {
      key: "airbnb",
      title: "Senior Software Engineer, Payments",
      company: "Airbnb",
      location: "San Francisco, CA",
      industry: "Travel",
      jobType: "Full-time",
      salaryMin: 190000,
      salaryMax: 270000,
      url: "https://careers.airbnb.com",
      desc: "Payments platform, risk and settlement systems.",
      status: "Phone Screen",
      appliedDaysAgo: 18,
      responseDaysAgo: 12,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "5001-10000",
      resume: "primary",
      cover: "primary",
      channel: "Referral",
      method: "referral",
    },
    {
      key: "databricks",
      title: "Senior Backend Engineer, Data Platform",
      company: "Databricks",
      location: "San Francisco, CA",
      industry: "Technology",
      jobType: "Full-time",
      salaryMin: 200000,
      salaryMax: 280000,
      url: "https://www.databricks.com/company/careers",
      desc: "Lakehouse platform services and reliability.",
      status: "Interview",
      appliedDaysAgo: 24,
      responseDaysAgo: 16,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "5001-10000",
      resume: "primary",
      cover: "primary",
      channel: "Company Careers",
      method: "company_website",
    },
    {
      key: "snowflake",
      title: "Senior Software Engineer, Storage",
      company: "Snowflake",
      location: "San Mateo, CA",
      industry: "Technology",
      jobType: "Full-time",
      salaryMin: 195000,
      salaryMax: 270000,
      url: "https://careers.snowflake.com",
      desc: "Distributed storage and performance optimizations.",
      status: "Interview",
      appliedDaysAgo: 20,
      responseDaysAgo: 13,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "5001-10000",
      resume: "primary",
      cover: "primary",
      channel: "Company Careers",
      method: "company_website",
    },
    {
      key: "openai",
      title: "Software Engineer, Applied",
      company: "OpenAI",
      location: "San Francisco, CA",
      industry: "AI",
      jobType: "Full-time",
      salaryMin: 210000,
      salaryMax: 310000,
      url: "https://openai.com/careers",
      desc: "Ship applied AI products and infra.",
      status: "Applied",
      appliedDaysAgo: 8,
      responseDaysAgo: null,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "1001-5000",
      resume: "primary",
      cover: "primary",
      channel: "Referral",
      method: "referral",
    },
    {
      key: "doordash",
      title: "Staff Engineer, Logistics",
      company: "DoorDash",
      location: "San Francisco, CA",
      industry: "Logistics",
      jobType: "Full-time",
      salaryMin: 200000,
      salaryMax: 280000,
      url: "https://careers.doordash.com",
      desc: "Routing, ETAs, and logistics optimization.",
      status: "Interview",
      appliedDaysAgo: 16,
      responseDaysAgo: 9,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "5001-10000",
      resume: "infra",
      cover: "primary",
      channel: "Referral",
      method: "referral",
    },
    {
      key: "robinhood",
      title: "Senior Backend Engineer, Brokerage",
      company: "Robinhood",
      location: "Menlo Park, CA",
      industry: "Fintech",
      jobType: "Full-time",
      salaryMin: 185000,
      salaryMax: 260000,
      url: "https://careers.robinhood.com",
      desc: "Brokerage core services, compliance, and reliability.",
      status: "Interview",
      appliedDaysAgo: 14,
      responseDaysAgo: 7,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "1001-5000",
      resume: "alt",
      cover: "primary",
      channel: "Referral",
      method: "referral",
    },
    {
      key: "twilio",
      title: "Senior Software Engineer, Messaging",
      company: "Twilio",
      location: "Remote",
      industry: "Technology",
      jobType: "Full-time",
      salaryMin: 180000,
      salaryMax: 250000,
      url: "https://www.twilio.com/company/jobs",
      desc: "Messaging reliability and scaling.",
      status: "Interview",
      appliedDaysAgo: 12,
      responseDaysAgo: 6,
      locationType: "remote",
      timezone: "America/Los_Angeles",
      size: "5001-10000",
      resume: "primary",
      cover: "primary",
      channel: "Company Careers",
      method: "company_website",
    },
    {
      key: "stripe-eng",
      title: "Senior Backend Engineer, Issuing",
      company: "Stripe",
      location: "San Francisco, CA",
      industry: "Fintech",
      jobType: "Full-time",
      salaryMin: 190000,
      salaryMax: 270000,
      url: "https://stripe.com/jobs",
      desc: "Issuing platform backend and reliability.",
      status: "Offer",
      appliedDaysAgo: 25,
      responseDaysAgo: 18,
      locationType: "hybrid",
      timezone: "America/Los_Angeles",
      size: "5001-10000",
      resume: "systems",
      cover: "systems",
      channel: "Referral",
      method: "referral",
    },
  ];

  for (const ej of extraJobs) {
    const appliedAt = new Date(Date.now() - ej.appliedDaysAgo * 86400000);
    const firstResponseAt =
      ej.responseDaysAgo != null
        ? new Date(Date.now() - ej.responseDaysAgo * 86400000)
        : null;

    const res = await database.query(
      `INSERT INTO job_opportunities (
        id, user_id, title, company, location,
        salary_min, salary_max, job_posting_url, job_description,
        industry, job_type, status,
        application_history, location_type, timezone,
        application_submitted_at, first_response_at, status_updated_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        '[]'::jsonb, $12, $13,
        $14, $15, $16, $17, $18
      ) RETURNING id`,
      [
        userId,
        ej.title,
        ej.company,
        ej.location,
        ej.salaryMin,
        ej.salaryMax,
        ej.url,
        ej.desc,
        ej.industry,
        ej.jobType,
        ej.status,
        ej.locationType,
        ej.timezone,
        appliedAt,
        firstResponseAt,
        firstResponseAt || appliedAt,
        appliedAt,
        firstResponseAt || appliedAt,
      ]
    );
    const newJobId = res.rows[0].id;
    jobIds[ej.key] = newJobId;
    jobMeta[ej.key] = { title: ej.title, company: ej.company };

    await database.query(
      `INSERT INTO company_info (id, job_id, size, industry, location, website)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
      [
        res.rows[0].id,
        ej.size,
        ej.industry,
        ej.location,
        `https://${ej.company.toLowerCase().replace(/\s+/g, "")}.com`,
      ]
    );

    const resumeMap = {
      primary: resumePrimary,
      alt: resumeAlt,
      systems: resumeSystems,
      infra: resumeInfra,
    };
    const coverMap = {
      primary: coverPrimary,
      alt: coverAlt,
      systems: coverSystems,
    };
    const resumeId = resumeMap[ej.resume] || resumePrimary;
    const coverId = coverMap[ej.cover] || coverPrimary;

    await database.query(
      `INSERT INTO application_strategies (
        user_id, job_opportunity_id, application_method, application_channel,
        application_timestamp, resume_version_id, cover_letter_version_id,
        customization_level, ab_test_id, ab_test_group
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'standard', NULL, NULL
      )`,
      [
        userId,
        res.rows[0].id,
        ej.method,
        ej.channel,
        appliedAt,
        resumeId,
        coverId,
      ]
    );
  }

  // Insert a batch of interviews (completed + scheduled) across stages
  const now = new Date();
  const interviewsData = [
    {
      jobKey: "google",
      type: "video",
      format: "technical",
      daysAgo: 60,
      duration: 60,
      status: "completed",
      outcome: "passed",
      interviewerName: "Alice Zhang",
      interviewerEmail: "alice@google.com",
      interviewerTitle: "Senior Engineer",
      videoLink: "https://meet.google.com/test-google-swe",
      notes: "Good coding performance, solid communication.",
    },
    {
      jobKey: "stripe-eng",
      type: "video",
      format: "system_design",
      daysAgo: 20,
      duration: 75,
      status: "completed",
      outcome: "offer_extended",
      interviewerName: "Ben Ortiz",
      interviewerEmail: "ben@stripe.com",
      interviewerTitle: "Staff Engineer",
      videoLink: "https://zoom.us/stripe-sd",
      notes: "Strong design; recommended for offer.",
    },
    {
      jobKey: "meta",
      type: "video",
      format: "technical",
      daysAgo: 35,
      duration: 60,
      status: "completed",
      outcome: "rejected",
      interviewerName: "Carla Diaz",
      interviewerEmail: "carla@meta.com",
      interviewerTitle: "Engineer",
      videoLink: "https://meta.zoom.com/meta-tech",
      notes: "Struggled with optimal solution.",
    },
    {
      jobKey: "netflix",
      type: "video",
      format: "technical",
      daysAgo: 25,
      duration: 60,
      status: "completed",
      outcome: "passed",
      interviewerName: "Dan Lee",
      interviewerEmail: "dan@netflix.com",
      interviewerTitle: "Senior Engineer",
      videoLink: "https://netflix.zoom.com/playback",
      notes: "Great debugging and scalability discussion.",
    },
    {
      jobKey: "airbnb",
      type: "phone",
      format: "behavioral",
      daysAgo: 15,
      duration: 30,
      status: "completed",
      outcome: "passed",
      interviewerName: "Evelyn Park",
      interviewerEmail: "epark@airbnb.com",
      phoneNumber: "+1-415-555-0100",
      notes: "Strong culture alignment.",
    },
    {
      jobKey: "databricks",
      type: "video",
      format: "technical",
      daysAgo: 12,
      duration: 60,
      status: "completed",
      outcome: "passed",
      interviewerName: "Fiona Kim",
      interviewerEmail: "fkim@databricks.com",
      interviewerTitle: "Engineer",
      videoLink: "https://databricks.zoom.com/tech",
      notes: "Solid spark knowledge and data infra.",
    },
    {
      jobKey: "snowflake",
      type: "video",
      format: "system_design",
      daysAgo: 10,
      duration: 75,
      status: "completed",
      outcome: "passed",
      interviewerName: "Greg Howard",
      interviewerEmail: "ghoward@snowflake.com",
      interviewerTitle: "Principal Engineer",
      videoLink: "https://snowflake.zoom.com/design",
      notes: "Good storage scaling discussion.",
    },
    {
      jobKey: "doordash",
      type: "video",
      format: "technical",
      daysAgo: 8,
      duration: 60,
      status: "completed",
      outcome: "pending",
      interviewerName: "Hannah Wu",
      interviewerEmail: "hwu@doordash.com",
      interviewerTitle: "Engineer",
      videoLink: "https://doordash.zoom.com/tech",
      notes: "Waiting on committee decision.",
    },
    {
      jobKey: "robinhood",
      type: "phone",
      format: "phone_screen",
      daysAgo: 6,
      duration: 30,
      status: "completed",
      outcome: "passed",
      interviewerName: "Ivan Petrov",
      interviewerEmail: "ivan@robinhood.com",
      phoneNumber: "+1-650-555-0200",
      notes: "Good API fundamentals.",
    },
    {
      jobKey: "twilio",
      type: "video",
      format: "technical",
      daysAgo: -3,
      duration: 60,
      status: "scheduled",
      outcome: "pending",
      interviewerName: "Julia Chen",
      interviewerEmail: "jchen@twilio.com",
      interviewerTitle: "Staff Engineer",
      videoLink: "https://twilio.zoom.com/msg",
      notes: "Upcoming coding interview.",
    },
    {
      jobKey: "openai",
      type: "video",
      format: "system_design",
      daysAgo: -5,
      duration: 90,
      status: "scheduled",
      outcome: "pending",
      interviewerName: "Kenji Sato",
      interviewerEmail: "kenji@openai.com",
      interviewerTitle: "Engineer",
      videoLink: "https://openai.zoom.com/design",
      notes: "Upcoming design interview focused on applied AI infra.",
    },
  ];

  for (const iv of interviewsData) {
    const jobId = jobIds[iv.jobKey];
    if (!jobId) continue;
    const meta = jobMeta[iv.jobKey] || {};
    const scheduledAt = new Date(now.getTime() - iv.daysAgo * 86400000);
    const scheduledISO = scheduledAt.toISOString();

    await database.query(
      `INSERT INTO interviews (
        id, user_id, job_opportunity_id, title, company, type, format, scheduled_at, date, duration,
        status, outcome, is_practice, interviewer_name, interviewer_email,
        interviewer_title, video_link, phone_number, notes
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17
      )`,
      [
        userId,
        jobId,
        meta.title || iv.jobKey,
        meta.company || iv.jobKey,
        iv.type,
        iv.format,
        scheduledISO,
        iv.duration,
        iv.status,
        iv.outcome,
        false,
        iv.interviewerName || null,
        iv.interviewerEmail || null,
        iv.interviewerTitle || null,
        iv.videoLink || null,
        iv.phoneNumber || null,
        iv.notes || null,
      ]
    );
  }

  // Job offers (for Offer Comparison + richer A/B data)
  const offersData = [
    {
      jobKey: "stripe-eng",
      title: "Senior Backend Engineer, Issuing",
      company: "Stripe",
      location: "San Francisco, CA",
      base: 210000,
      bonus: 35000,
      equity: 90000,
      benefits: 20000,
      currency: "USD",
      status: "active",
      level: "L5",
      notes: "Strong offer with growth potential; equity over 4 years.",
    },
    {
      jobKey: "google",
      title: "Software Engineer, Cloud",
      company: "Google",
      location: "Mountain View, CA",
      base: 190000,
      bonus: 30000,
      equity: 80000,
      benefits: 25000,
      currency: "USD",
      status: "active",
      level: "L4",
      notes: "Good brand; slightly lower equity than Stripe.",
    },
    {
      jobKey: "amazon",
      title: "Software Development Engineer II",
      company: "Amazon",
      location: "Seattle, WA",
      base: 185000,
      bonus: 25000,
      equity: 70000,
      benefits: 18000,
      currency: "USD",
      status: "active",
      level: "SDE2",
      notes: "Balanced cash/equity; location in Seattle.",
    },
  ];

  // Insert job offers so Offer Comparison has sample data
  for (const offer of offersData) {
    const jobId = jobIds[offer.jobKey];
    if (!jobId) continue;

    const offerDate = new Date();
    const decisionDeadline = new Date(Date.now() + 14 * 86400000);
    const baseSalary = offer.base || 0;
    const signingBonus = offer.bonus || 0;
    const annualBonus = 0;
    const equityAmount = offer.equity || 0;
    const colIndex = offer.colIndex || 120;
    const colAdjusted = colIndex ? Number((baseSalary * (100 / colIndex)).toFixed(2)) : baseSalary;

    await database.query(
      `
      INSERT INTO job_offers (
        id, user_id, job_opportunity_id,
        company, position_title, offer_date, decision_deadline,
        base_salary, signing_bonus, annual_bonus, equity_type, equity_amount,
        location, remote_policy, col_index, col_adjusted_salary,
        negotiation_status, offer_status, notes
      ) VALUES (
        gen_random_uuid(), $1, $2,
        $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18
      )
    `,
      [
        userId,
        jobId,
        offer.company,
        offer.title,
        offerDate,
        decisionDeadline,
        baseSalary,
        signingBonus,
        annualBonus,
        "RSU",
        equityAmount,
        offer.location,
        offer.remotePolicy || "Hybrid",
        colIndex,
        colAdjusted,
        offer.negotiationStatus || "received",
        offer.status || "active",
        offer.notes || null,
      ]
    );
  }

  // Follow-up reminders seed (pending/snoozed/completed)
  const remindersData = [
    {
      jobKey: "google",
      type: "application",
      stage: "Applied",
      daysAgo: 10,
      dueOffset: 3,
      status: "pending",
      message: "Follow up after applying 10 days ago",
    },
    {
      jobKey: "stripe-eng",
      type: "interview",
      stage: "Interview Scheduled",
      daysAgo: 7,
      dueOffset: 1,
      status: "snoozed",
      snoozedUntilOffset: 2,
      message: "Day-before reminder (snoozed)",
    },
    {
      jobKey: "meta",
      type: "post_interview",
      stage: "Interview Completed",
      daysAgo: 15,
      dueOffset: 5,
      status: "completed",
      message: "Thank-you note sent",
    },
  ];

  for (const r of remindersData) {
    const jobId = jobIds[r.jobKey];
    if (!jobId) continue;
    const createdAt = new Date(Date.now() - r.daysAgo * 86400000);
    const dueDate = new Date(createdAt.getTime() + r.dueOffset * 86400000);
    const snoozedUntil =
      r.snoozedUntilOffset != null
        ? new Date(Date.now() + r.snoozedUntilOffset * 86400000)
        : null;

    try {
      await database.query(
        `INSERT INTO follow_up_reminders (
          id, user_id, job_opportunity_id, reminder_type, application_stage,
          scheduled_date, due_date, event_date, days_after_event,
          generated_email_subject, generated_email_body,
          status, is_active, snoozed_until, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10,
          $11, true, $12, NOW(), NOW()
        )`,
        [
          userId,
          jobId,
          r.type,
          r.stage,
          createdAt,
          dueDate,
          createdAt,
          r.dueOffset,
          `Follow up: ${r.stage}`,
          r.message || "",
          r.status || "pending",
          snoozedUntil,
        ]
      );
    } catch (e) {
      console.warn("⚠️ Skipping reminder insert; FK or schema mismatch:", e.message);
    }
  }

  // Additional A/B test data for richer charts
  await database.query(
    `INSERT INTO ab_tests (
      id, user_id, test_name, test_type, description,
      control_group_config, variant_groups, traffic_split,
      status, created_at, start_date, end_date,
      sample_size, statistical_significance, winner, results_summary
    ) VALUES (
      gen_random_uuid(), $1,
      'Resume A/B: Systems vs Infra',
      'resume',
      'Compare systems-focused vs infra-focused resume performance.',
      jsonb_build_object('name','Systems Resume','resumeVersionId',$2::text),
      jsonb_build_array(jsonb_build_object('name','Infra Resume','resumeVersionId',$3::text)),
      jsonb_build_object('control',50,'variant_a',50),
      'completed',
      NOW() - INTERVAL '28 days',
      NOW() - INTERVAL '27 days',
      NOW() - INTERVAL '7 days',
      80,
      0.08,
      'variant_a',
      jsonb_build_object(
        'control', jsonb_build_object('response_rate',0.22,'interview_rate',0.15,'offer_rate',0.05,'sample',40),
        'variant_a', jsonb_build_object('response_rate',0.30,'interview_rate',0.20,'offer_rate',0.08,'sample',40)
      )
    )`,
    [userId, resumeSystems, resumeInfra]
  );

  // Strategies linking docs + A/B
  await database.query(
    `INSERT INTO application_strategies (
      user_id, job_opportunity_id, application_method, application_channel,
      application_timestamp, resume_version_id, cover_letter_version_id,
      customization_level, ab_test_id, ab_test_group
    ) VALUES
    ($1, $2, 'job_board', 'Google Careers', NOW() - INTERVAL '30 days', $3, $4, 'high', $5, 'control'),
    ($1, $6, 'referral', 'Employee Referral', NOW() - INTERVAL '22 days', $7, $8, 'standard', $9, 'variant_a'),
    ($1, $10, 'company_website', 'Microsoft Careers', NOW() - INTERVAL '10 days', $3, $4, 'standard', NULL, NULL)
    `,
    [
      userId,
      jobIds["google"],
      resumePrimary,
      coverPrimary,
      abResumeId,
      jobIds["stripe"],
      resumeAlt,
      coverAlt,
      abCoverId,
      jobIds["microsoft"],
    ]
  );

  // Pre-seeded quality score (Google SWE)
  await database.query(
    `INSERT INTO application_quality_scores (
      user_id, job_opportunity_id,
      resume_document_id, cover_letter_document_id,
      overall_score, alignment_score, format_score, consistency_score,
      missing_keywords, missing_skills, issues, suggestions, summary, model_version
    ) VALUES (
      $1, $2, $3, $4,
      78.5, 82, 75, 72,
      '[{"keyword":"Kubernetes","importance":"high"},{"keyword":"GCP","importance":"high"}]'::jsonb,
      '[{"skill":"Distributed systems","importance":"high"}]'::jsonb,
      '[{"type":"formatting","description":"Inconsistent bullet punctuation","severity":"low","location":"resume"}]'::jsonb,
      '[{"id":"s1","title":"Highlight GCP experience","description":"Add a concise bullet on GCP services used","priority":"high","category":"alignment","estimatedImpact":18}]'::jsonb,
      'Good alignment; add GCP/Kubernetes emphasis and tighten formatting.',
      'v1-seeded'
    )`,
    [userId, jobIds["google"], resumePrimary, coverPrimary]
  );

  await database.query("COMMIT");
  console.log("\n✅ Seed completed successfully.");
  console.log(`Login with ${EMAIL} / ${PASSWORD}`);
}

seed().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  try {
    await database.query("ROLLBACK");
  } catch (e) {
    /* ignore */
  }
  process.exit(1);
});

