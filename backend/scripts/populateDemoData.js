import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import database from "../services/database.js";

dotenv.config();

const DEMO_USER_EMAIL = "demo@betabaddies.com";
const DEMO_USER_PASSWORD = "Demo123!";

async function populateDemoData() {
  try {
    console.log("🚀 Starting demo data population...\n");

    // Step 1: Create or get demo user
    console.log("📝 Step 1: Creating demo user...");
    let userId;

    // Check if user exists
    const existingUser = await database.query(
      "SELECT u_id FROM users WHERE email = $1",
      [DEMO_USER_EMAIL]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].u_id;
      console.log(`   ✓ Demo user already exists: ${userId}`);

      // Delete existing data to start fresh
      console.log("   🗑️  Clearing existing demo data...");
      // Delete in order to respect foreign key constraints
      await database.query("DELETE FROM coverletter WHERE user_id = $1", [
        userId,
      ]);
      await database.query("DELETE FROM resume WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM job_opportunities WHERE user_id = $1", [
        userId,
      ]);
      // Delete material history for existing prospective jobs first
      // Use a subquery to get job IDs before deletion
      const existingJobs = await database.query(
        "SELECT id FROM prospectivejobs WHERE user_id = $1",
        [userId]
      );
      if (existingJobs.rows.length > 0) {
        const jobIds = existingJobs.rows.map((row) => row.id);
        await database.query(
          `DELETE FROM prospectivejob_material_history WHERE job_id = ANY($1::uuid[])`,
          [jobIds]
        );
      }
      // Try to delete prospectivejobs, but continue if trigger causes issues
      try {
        await database.query("DELETE FROM prospectivejobs WHERE user_id = $1", [
          userId,
        ]);
      } catch (err) {
        console.log(
          "   ⚠️  Could not delete prospectivejobs (trigger issue), continuing..."
        );
      }
      await database.query("DELETE FROM certifications WHERE user_id = $1", [
        userId,
      ]);
      await database.query("DELETE FROM projects WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM educations WHERE user_id = $1", [
        userId,
      ]);
      await database.query("DELETE FROM skills WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM jobs WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
    } else {
      // Create new user
      userId = uuidv4();
      const hashedPassword = await bcrypt.hash(DEMO_USER_PASSWORD, 12);

      await database.query(
        `INSERT INTO users (u_id, email, password, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [userId, DEMO_USER_EMAIL, hashedPassword]
      );
      console.log(`   ✓ Created demo user: ${userId}`);
    }

    // Step 2: Create full profile
    console.log("\n📝 Step 2: Creating full profile...");
    await database.query(
      `INSERT INTO profiles (
        user_id, first_name, last_name, phone, city, state, 
        job_title, bio, industry, exp_level, pfp_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        job_title = EXCLUDED.job_title,
        bio = EXCLUDED.bio,
        industry = EXCLUDED.industry,
        exp_level = EXCLUDED.exp_level`,
      [
        userId,
        "Alex",
        "Johnson",
        "(555) 123-4567",
        "San Francisco",
        "CA",
        "Senior Software Engineer",
        "Experienced software engineer with 5+ years in full-stack development. Passionate about building scalable web applications and leading cross-functional teams. Specialized in React, Node.js, and cloud architecture.",
        "Technology",
        "Senior",
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
      ]
    );
    console.log("   ✓ Profile created");

    // Step 3: Add employment history (jobs)
    console.log("\n📝 Step 3: Adding employment history...");
    const jobs = [
      {
        title: "Senior Software Engineer",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        start_date: "2021-03-01",
        end_date: null,
        is_current: true,
        description:
          "Lead development of microservices architecture. Mentored junior developers and implemented CI/CD pipelines. Reduced deployment time by 40%.",
        salary: 145000,
      },
      {
        title: "Software Engineer",
        company: "StartupXYZ",
        location: "San Francisco, CA",
        start_date: "2019-06-01",
        end_date: "2021-02-28",
        is_current: false,
        description:
          "Developed React-based frontend applications. Collaborated with design team to implement responsive UI components. Increased user engagement by 25%.",
        salary: 110000,
      },
      {
        title: "Junior Developer",
        company: "WebDev Solutions",
        location: "Oakland, CA",
        start_date: "2018-01-15",
        end_date: "2019-05-31",
        is_current: false,
        description:
          "Built RESTful APIs using Node.js and Express. Maintained legacy codebase and fixed critical bugs. Participated in code reviews and agile ceremonies.",
        salary: 75000,
      },
    ];

    for (const job of jobs) {
      await database.query(
        `INSERT INTO jobs (id, user_id, title, company, location, start_date, end_date, is_current, description, salary)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          job.title,
          job.company,
          job.location,
          job.start_date,
          job.end_date,
          job.is_current,
          job.description,
          job.salary,
        ]
      );
    }
    console.log(`   ✓ Added ${jobs.length} employment entries`);

    // Step 4: Add education
    console.log("\n📝 Step 4: Adding education...");
    const educations = [
      {
        school: "University of California, Berkeley",
        degree_type: "Bachelor's",
        field: "Computer Science",
        gpa: 3.8,
        startdate: "2014-09-01",
        graddate: "2018-05-15",
        is_enrolled: false,
        honors: "Magna Cum Laude, Dean's List",
      },
    ];

    for (const edu of educations) {
      await database.query(
        `INSERT INTO educations (id, user_id, school, degree_type, field, gpa, startdate, graddate, is_enrolled, honors)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          edu.school,
          edu.degree_type,
          edu.field,
          edu.gpa,
          edu.startdate,
          edu.graddate,
          edu.is_enrolled,
          edu.honors,
        ]
      );
    }
    console.log(`   ✓ Added ${educations.length} education entries`);

    // Step 5: Add skills
    console.log("\n📝 Step 5: Adding skills...");
    const skills = [
      { name: "JavaScript", proficiency: "Expert", category: "Technical" },
      { name: "TypeScript", proficiency: "Advanced", category: "Technical" },
      { name: "React", proficiency: "Expert", category: "Technical" },
      { name: "Node.js", proficiency: "Expert", category: "Technical" },
      { name: "Express.js", proficiency: "Advanced", category: "Technical" },
      { name: "PostgreSQL", proficiency: "Advanced", category: "Technical" },
      { name: "MongoDB", proficiency: "Intermediate", category: "Technical" },
      { name: "AWS", proficiency: "Advanced", category: "Technical" },
      { name: "Docker", proficiency: "Intermediate", category: "Technical" },
      { name: "Git", proficiency: "Expert", category: "Technical" },
      { name: "Python", proficiency: "Intermediate", category: "Technical" },
      { name: "Agile/Scrum", proficiency: "Advanced", category: "Soft Skills" },
    ];

    for (const skill of skills) {
      await database.query(
        `INSERT INTO skills (id, user_id, skill_name, proficiency, category)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT (skill_name) DO NOTHING`,
        [userId, skill.name, skill.proficiency, skill.category]
      );
    }
    console.log(`   ✓ Added ${skills.length} skills`);

    // Step 6: Add projects
    console.log("\n📝 Step 6: Adding projects...");
    const projects = [
      {
        name: "E-Commerce Platform",
        description:
          "Built a full-stack e-commerce platform with React frontend and Node.js backend. Implemented payment processing, inventory management, and admin dashboard.",
        link: "https://github.com/demo/ecommerce-platform",
        start_date: "2022-01-01",
        end_date: "2022-06-30",
        technologies: "React, Node.js, PostgreSQL, Stripe API",
        status: "Completed",
        industry: "E-Commerce",
      },
      {
        name: "Task Management App",
        description:
          "Developed a collaborative task management application with real-time updates using WebSockets. Features include drag-and-drop, notifications, and team collaboration.",
        link: "https://github.com/demo/task-manager",
        start_date: "2021-09-01",
        end_date: "2021-12-15",
        technologies: "React, Socket.io, MongoDB, Express",
        status: "Completed",
        industry: "Productivity",
      },
      {
        name: "AI Resume Analyzer",
        description:
          "Created an AI-powered resume analysis tool using OpenAI API. Analyzes resumes for ATS compatibility and provides improvement suggestions.",
        link: "https://github.com/demo/resume-analyzer",
        start_date: "2023-03-01",
        end_date: null,
        technologies: "Python, OpenAI API, FastAPI, React",
        status: "Active",
        industry: "HR Tech",
      },
    ];

    for (const project of projects) {
      await database.query(
        `INSERT INTO projects (id, user_id, name, description, link, start_date, end_date, technologies, status, industry)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          project.name,
          project.description,
          project.link,
          project.start_date,
          project.end_date,
          project.technologies,
          project.status,
          project.industry,
        ]
      );
    }
    console.log(`   ✓ Added ${projects.length} projects`);

    // Step 7: Add certifications
    console.log("\n📝 Step 7: Adding certifications...");
    const certifications = [
      {
        name: "AWS Certified Solutions Architect",
        org_name: "Amazon Web Services",
        date_earned: "2022-05-15",
        expiration_date: "2025-05-15",
        never_expires: false,
      },
      {
        name: "React Developer Certification",
        org_name: "Meta",
        date_earned: "2021-11-20",
        expiration_date: null,
        never_expires: true,
      },
    ];

    for (const cert of certifications) {
      await database.query(
        `INSERT INTO certifications (id, user_id, name, org_name, date_earned, expiration_date, never_expires)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
        [
          userId,
          cert.name,
          cert.org_name,
          cert.date_earned,
          cert.expiration_date,
          cert.never_expires,
        ]
      );
    }
    console.log(`   ✓ Added ${certifications.length} certifications`);

    // Step 8: Add job opportunities (different stages)
    console.log("\n📝 Step 8: Adding job opportunities...");

    const jobOpportunities = [
      {
        title: "Senior Frontend Engineer",
        company: "Spotify",
        location: "New York, NY",
        salary_min: 155000,
        salary_max: 195000,
        job_posting_url: "https://www.lifeatspotify.com/jobs",
        application_deadline: "2025-12-18",
        job_description:
          "Join Spotify's Premium web team to deliver polished UI experiences for artist and listener tools used by millions.",
        industry: "Technology",
        job_type: "Full-time",
        status: "Applied",
        notes:
          "Submitted tailored resume highlighting design system work. Follow up with recruiter next week.",
        recruiter_name: "Maya Chen",
        recruiter_email: "maya.chen@spotify.com",
        salary_negotiation_notes:
          "Open to a higher equity split given NYC cost of living.",
        status_updated_at: "2024-08-05T10:15:00.000Z",
        created_at: "2024-07-29T18:42:00.000Z",
        updated_at: "2024-08-05T10:15:00.000Z",
      },
      {
        title: "Staff Software Engineer",
        company: "Google",
        location: "Austin, TX",
        salary_min: 175000,
        salary_max: 220000,
        job_posting_url: "https://careers.google.com/jobs/results/",
        application_deadline: "2025-12-28",
        job_description:
          "Own end-to-end architecture for Google Cloud reliability tooling with a focus on scalability.",
        industry: "Technology",
        job_type: "Full-time",
        status: "Phone Screen",
        notes:
          "Initial call complete. Need to prepare distributed systems deep dive and SRE scenarios.",
        recruiter_name: "Jordan Lee",
        recruiter_email: "jordanlee@google.com",
        salary_negotiation_notes: "Target L6 comp with $210k base plus bonus.",
        status_updated_at: "2024-09-12T15:20:00.000Z",
        created_at: "2024-08-19T14:03:00.000Z",
        updated_at: "2024-09-12T15:20:00.000Z",
      },
      {
        title: "Lead Full Stack Engineer",
        company: "Intuit",
        location: "Boston, MA",
        salary_min: 165000,
        salary_max: 205000,
        job_posting_url: "https://www.intuit.com/careers/open-roles/",
        application_deadline: "2026-01-05",
        job_description:
          "Build Intuit Money Platform experiences and mentor a pod of full stack engineers across React and Node.",
        industry: "Fintech",
        job_type: "Full-time",
        status: "Interview",
        notes:
          "Panel interview scheduled. Review compliance stories and data privacy approaches ahead of loop.",
        recruiter_name: "Priya Natarajan",
        recruiter_email: "priya_natarajan@intuit.com",
        salary_negotiation_notes:
          "Discuss hybrid work expectations and relocation support.",
        status_updated_at: "2024-10-02T17:00:00.000Z",
        created_at: "2024-09-28T09:48:00.000Z",
        updated_at: "2024-10-02T17:00:00.000Z",
      },
      {
        title: "Principal Platform Engineer",
        company: "Amazon Web Services",
        location: "Seattle, WA",
        salary_min: 190000,
        salary_max: 245000,
        job_posting_url: "https://aws.amazon.com/careers/",
        application_deadline: "2026-01-06",
        job_description:
          "Design and operate large-scale streaming infrastructure powering AWS Bedrock's generative AI services.",
        industry: "Cloud Infrastructure",
        job_type: "Full-time",
        status: "Offer",
        notes:
          "Offer received. Evaluating AWS package versus Snowflake opportunity before responding.",
        recruiter_name: "Alex Romero",
        recruiter_email: "alexrom@amazon.com",
        salary_negotiation_notes:
          "Ask for higher signing bonus and remote work agreement.",
        status_updated_at: "2024-10-25T12:30:00.000Z",
        created_at: "2024-10-10T11:25:00.000Z",
        updated_at: "2024-10-25T12:30:00.000Z",
      },
      {
        title: "Engineering Manager, Developer Experience",
        company: "GitHub",
        location: "San Francisco, CA",
        salary_min: 185000,
        salary_max: 230000,
        job_posting_url: "https://github.com/about/careers",
        application_deadline: "2025-12-15",
        job_description:
          "Lead GitHub's developer experience team, focusing on Codespaces, CI/CD, and productivity tooling adoption.",
        industry: "Developer Tools",
        job_type: "Full-time",
        status: "Rejected",
        notes:
          "Hiring pause for Q4. Stay in touch with recruiter for 2026 headcount updates.",
        recruiter_name: "Beatrice Holt",
        recruiter_email: "bholt@github.com",
        salary_negotiation_notes: null,
        status_updated_at: "2024-06-18T09:10:00.000Z",
        created_at: "2024-05-22T13:37:00.000Z",
        updated_at: "2024-06-18T09:10:00.000Z",
        archive_after_insert: true,
        archive_reason: "Role paused due to hiring freeze",
        archived_at: "2024-06-18T09:10:00.000Z",
      },
      {
        title: "Director of Engineering",
        company: "NVIDIA",
        location: "Santa Clara, CA",
        salary_min: 210000,
        salary_max: 260000,
        job_posting_url: "https://www.nvidia.com/en-us/about-nvidia/careers/",
        application_deadline: "2025-12-30",
        job_description:
          "Oversee NVIDIA automotive software teams delivering AI perception and motion planning systems.",
        industry: "Semiconductors",
        job_type: "Full-time",
        status: "Applied",
        notes:
          "Long-term target leadership role. Building robotics portfolio for upcoming check-in.",
        recruiter_name: "Diego Alvarez",
        recruiter_email: "dalvarez@nvidia.com",
        salary_negotiation_notes:
          "Clarify equity refresh cadence and leadership bonus structure.",
        status_updated_at: "2024-02-20T10:05:00.000Z",
        created_at: "2024-01-18T12:15:00.000Z",
        updated_at: "2024-02-20T10:05:00.000Z",
      },
      {
        title: "Principal Cloud Architect",
        company: "Salesforce",
        location: "Denver, CO",
        salary_min: 200000,
        salary_max: 255000,
        job_posting_url: "https://www.salesforce.com/company/careers/",
        application_deadline: "2026-01-03",
        job_description:
          "Define Salesforce's multi-cloud architecture standards and lead Einstein platform migration initiatives.",
        industry: "SaaS",
        job_type: "Full-time",
        status: "Rejected",
        notes:
          "Role closed after final panel. Recruiter will keep profile warm for future transformations.",
        recruiter_name: "Hannah Brooks",
        recruiter_email: "hbrooks@salesforce.com",
        salary_negotiation_notes: null,
        status_updated_at: "2024-05-05T11:55:00.000Z",
        created_at: "2024-04-14T09:40:00.000Z",
        updated_at: "2024-05-05T11:55:00.000Z",
        archive_after_insert: true,
        archive_reason: "Role closed after final panel",
        archived_at: "2024-05-05T11:55:00.000Z",
      },
      {
        title: "AI Platform Engineer",
        company: "Circuit Labs",
        location: "Remote - North America",
        salary_min: 160000,
        salary_max: 205000,
        job_posting_url: "https://circuitlabs.ai/careers/ai-platform-engineer",
        application_deadline: "2025-11-14",
        job_description:
          "Build and scale the core AI experimentation platform. Collaborate with ML researchers to productionize models.",
        industry: "Artificial Intelligence",
        job_type: "Full-time",
        status: "Interested",
        notes:
          "Exciting AI infra role. Need to tailor resume around MLOps and experimentation pipelines.",
        recruiter_name: "Sonia Patel",
        recruiter_email: "sonia.patel@circuitlabs.ai",
        salary_negotiation_notes: null,
        status_updated_at: "2024-11-12T09:30:00.000Z",
        created_at: "2024-11-05T14:10:00.000Z",
        updated_at: "2024-11-12T09:30:00.000Z",
      },
      {
        title: "Senior GraphQL Engineer",
        company: "Voyage Network",
        location: "New York, NY",
        salary_min: 150000,
        salary_max: 195000,
        job_posting_url: "https://voyagenetwork.com/jobs/graphql-engineer",
        application_deadline: "2025-11-15",
        job_description:
          "Own the evolution of our federated GraphQL gateway supporting real-time travel personalization.",
        industry: "Travel Technology",
        job_type: "Full-time",
        status: "Interested",
        notes:
          "Matches prior experience with Apollo Federation. Need to highlight schema governance wins.",
        recruiter_name: "Miles Carter",
        recruiter_email: "miles.carter@voyagenetwork.com",
        salary_negotiation_notes: "Target 190k base + 10% bonus.",
        status_updated_at: "2024-12-04T16:45:00.000Z",
        created_at: "2024-12-01T18:25:00.000Z",
        updated_at: "2024-12-04T16:45:00.000Z",
      },
      {
        title: "Headless Commerce Architect",
        company: "Shopify",
        location: "Chicago, IL",
        salary_min: 170000,
        salary_max: 215000,
        job_posting_url: "https://www.shopify.com/careers",
        application_deadline: "2026-01-07",
        job_description:
          "Design composable commerce architecture for Shopify Plus merchants, focusing on Hydrogen and Remix.",
        industry: "E-commerce",
        job_type: "Full-time",
        status: "Interested",
        notes:
          "Need to craft case study around checkout extensibility project before next call.",
        recruiter_name: "Lena Ortiz",
        recruiter_email: "lena.ortiz@shopify.com",
        salary_negotiation_notes:
          "Ask about remote-first policy and relocation stipend.",
        status_updated_at: "2025-01-15T13:05:00.000Z",
        created_at: "2025-01-10T11:00:00.000Z",
        updated_at: "2025-01-15T13:05:00.000Z",
      },
      {
        title: "Principal Reliability Engineer",
        company: "Nimbus Cloud",
        location: "Seattle, WA",
        salary_min: 180000,
        salary_max: 235000,
        job_posting_url: "https://nimbuscloud.com/careers/reliability-principal",
        application_deadline: "2025-12-22",
        job_description:
          "Lead reliability engineering initiatives for multi-region cloud services with strict SLOs.",
        industry: "Cloud Infrastructure",
        job_type: "Full-time",
        status: "Rejected",
        notes:
          "Reached final round but received a rejection. Capture feedback for future roles.",
        recruiter_name: "Chris Lang",
        recruiter_email: "chris.lang@nimbuscloud.com",
        salary_negotiation_notes: null,
        status_updated_at: "2025-02-18T20:40:00.000Z",
        created_at: "2025-02-02T15:55:00.000Z",
        updated_at: "2025-02-18T20:40:00.000Z",
      },
      {
        title: "AI Safety Program Manager",
        company: "Guardian AI",
        location: "Remote - US",
        salary_min: 160000,
        salary_max: 210000,
        job_posting_url: "https://guardianai.com/careers/ai-safety-program-manager",
        application_deadline: "2025-12-29",
        job_description:
          "Coordinate cross-functional initiatives to operationalize AI safety guidelines across products.",
        industry: "Artificial Intelligence",
        job_type: "Full-time",
        status: "Applied",
        notes:
          "Submitted application highlighting responsible AI framework work.",
        recruiter_name: "Sasha Nguyen",
        recruiter_email: "sasha.nguyen@guardianai.com",
        salary_negotiation_notes: "Request stipend for conference travel.",
        status_updated_at: "2025-09-18T12:25:00.000Z",
        created_at: "2025-09-07T16:10:00.000Z",
        updated_at: "2025-09-18T12:25:00.000Z",
      },
      {
        title: "Automation Platform Lead",
        company: "Northstar Logistics",
        location: "Denver, CO",
        salary_min: 170000,
        salary_max: 220000,
        job_posting_url: "https://northstarlogistics.com/careers/automation-platform-lead",
        application_deadline: "2025-12-26",
        job_description:
          "Build automation services for fulfillment centers with focus on reliability and telemetry.",
        industry: "Logistics",
        job_type: "Full-time",
        status: "Phone Screen",
        notes:
          "Upcoming panel with ops leaders—prep success stories around robotics integration.",
        recruiter_name: "Arjun Desai",
        recruiter_email: "arjun.desai@northstarlogistics.com",
        salary_negotiation_notes:
          "Clarify relocation support and signing bonus.",
        status_updated_at: "2025-06-28T11:30:00.000Z",
        created_at: "2025-06-14T11:30:00.000Z",
        updated_at: "2025-06-28T11:30:00.000Z",
      },
      {
        title: "Edge Computing Architect",
        company: "Skylink Aerospace",
        location: "Los Angeles, CA",
        salary_min: 190000,
        salary_max: 240000,
        job_posting_url: "https://skylinkaero.com/careers/edge-computing-architect",
        application_deadline: "2026-01-09",
        job_description:
          "Architect edge compute platform for autonomous aerial systems, with focus on low-latency data processing.",
        industry: "Aerospace",
        job_type: "Full-time",
        status: "Interview",
        notes:
          "Preparing for deep-dive with defense partners, highlight safety compliance experience.",
        recruiter_name: "Logan Pierce",
        recruiter_email: "logan.pierce@skylinkaero.com",
        salary_negotiation_notes:
          "Confirm security clearance support and relocation.",
        status_updated_at: "2025-10-29T18:05:00.000Z",
        created_at: "2025-10-18T13:22:00.000Z",
        updated_at: "2025-10-29T18:05:00.000Z",
      }
    ];

    const jobIds = [];
    for (const job of jobOpportunities) {
      const jobId = uuidv4();
      jobIds.push(jobId);
      await database.query(
        `INSERT INTO job_opportunities (
          id, user_id, title, company, location, salary_min, salary_max,
          job_posting_url, application_deadline, job_description, industry,
          job_type, status, notes, recruiter_name, recruiter_email,
          salary_negotiation_notes, status_updated_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          jobId,
          userId,
          job.title,
          job.company,
          job.location,
          job.salary_min,
          job.salary_max,
          job.job_posting_url,
          job.application_deadline,
          job.job_description,
          job.industry,
          job.job_type,
          job.status,
          job.notes,
          job.recruiter_name,
          job.recruiter_email,
          job.salary_negotiation_notes || null,
          job.status_updated_at || job.created_at,
          job.created_at,
          job.updated_at || job.created_at,
        ]
      );
    }
    console.log(
      `   ✓ Added ${jobOpportunities.length} job opportunities across all stages`
    );

    // Archive selected jobs to simulate historical data
    const archivePromises = jobOpportunities
      .map((job, index) => {
        if (!job.archive_after_insert) {
          return null;
        }
        return database.query(
          `UPDATE job_opportunities
           SET archived = true,
               archived_at = $1,
               archive_reason = $2,
               updated_at = $1
           WHERE id = $3`,
          [job.archived_at || job.updated_at || job.created_at, job.archive_reason || "Archived via demo script", jobIds[index]]
        );
      })
      .filter(Boolean);

    if (archivePromises.length) {
      await Promise.all(archivePromises);
      console.log(
        `   ✓ Archived ${archivePromises.length} job opportunities for historical metrics`
      );
    }

    // Step 9: Add prospective jobs (legacy table)
    console.log("\n📝 Step 9: Adding prospective jobs...");
    const prospectiveJobs = [
      {
        job_title: "Senior Software Engineer",
        company: "Apple",
        location: "Cupertino, CA",
        salary_low: 175000,
        salary_high: 240000,
        job_url: "https://jobs.apple.com/jobs/123456",
        deadline: "2025-12-19",
        stage: "Interested",
        description: "Work on Apple's software platforms",
        industry: "Technology",
        job_type: "Full-time",
        personal_notes: "Dream company. Need to prepare thoroughly.",
      },
      {
        job_title: "Full Stack Developer",
        company: "Salesforce",
        location: "San Francisco, CA",
        salary_low: 155000,
        salary_high: 210000,
        job_url: "https://salesforce.com/careers/789012",
        deadline: "2026-01-04",
        stage: "Applied",
        description: "Build cloud-based applications",
        industry: "Technology",
        job_type: "Full-time",
        personal_notes: "Applied on 2024-01-16",
      },
    ];

    for (const job of prospectiveJobs) {
      await database.query(
        `INSERT INTO prospectivejobs (
          id, user_id, job_title, company, location, salary_low, salary_high,
          job_url, deadline, stage, description, industry, job_type, personal_notes, date_added
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_DATE)`,
        [
          userId,
          job.job_title,
          job.company,
          job.location,
          job.salary_low,
          job.salary_high,
          job.job_url,
          job.deadline,
          job.stage,
          job.description,
          job.industry,
          job.job_type,
          job.personal_notes,
        ]
      );
    }
    console.log(`   ✓ Added ${prospectiveJobs.length} prospective jobs`);

    // Step 10: Create resumes
    console.log("\n📝 Step 10: Creating resumes...");
    const resumeContent = {
      personalInfo: {
        firstName: "Alex",
        lastName: "Johnson",
        email: "alex.johnson@email.com",
        phone: "(555) 123-4567",
        location: "San Francisco, CA",
        linkedIn: "linkedin.com/in/alexjohnson",
        portfolio: "alexjohnson.dev",
      },
      summary:
        "Experienced software engineer with 5+ years in full-stack development. Passionate about building scalable web applications and leading cross-functional teams. Proven track record of delivering high-quality software solutions.",
      experience: [
        {
          title: "Senior Software Engineer",
          company: "TechCorp Inc.",
          location: "San Francisco, CA",
          startDate: "2021-03",
          endDate: "Present",
          description: [
            "Lead development of microservices architecture serving 1M+ users",
            "Mentored 3 junior developers and reduced onboarding time by 30%",
            "Implemented CI/CD pipelines reducing deployment time by 40%",
            "Optimized database queries improving API response time by 50%",
          ],
        },
        {
          title: "Software Engineer",
          company: "StartupXYZ",
          location: "San Francisco, CA",
          startDate: "2019-06",
          endDate: "2021-02",
          description: [
            "Developed React-based frontend applications with 50K+ daily active users",
            "Collaborated with design team to implement responsive UI components",
            "Increased user engagement by 25% through A/B testing and optimization",
          ],
        },
      ],
      education: [
        {
          school: "University of California, Berkeley",
          degree: "Bachelor of Science",
          field: "Computer Science",
          graduationDate: "2018-05",
          gpa: "3.8",
          honors: "Magna Cum Laude",
        },
      ],
      skills: {
        technical: [
          "JavaScript",
          "TypeScript",
          "React",
          "Node.js",
          "PostgreSQL",
          "AWS",
        ],
        soft: ["Leadership", "Agile/Scrum", "Problem Solving", "Communication"],
      },
      projects: [
        {
          name: "E-Commerce Platform",
          description:
            "Built full-stack e-commerce platform with React and Node.js",
          technologies: ["React", "Node.js", "PostgreSQL", "Stripe API"],
        },
      ],
    };

    const resumeIds = [];
    for (let i = 0; i < 3; i++) {
      const resumeId = uuidv4();
      resumeIds.push(resumeId);
      await database.query(
        `INSERT INTO resume (
          id, user_id, version_name, name, description, content, 
          version_number, is_master, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          resumeId,
          userId,
          i === 0 ? "Master Resume" : `Resume Version ${i + 1}`,
          i === 0
            ? "Software Engineer Resume"
            : `Software Engineer Resume v${i + 1}`,
          i === 0
            ? "Master resume for software engineering positions"
            : `Tailored version ${i + 1}`,
          JSON.stringify(resumeContent),
          i + 1,
          i === 0,
        ]
      );
    }
    console.log(`   ✓ Created ${resumeIds.length} resumes`);

    // Step 11: Create cover letters
    console.log("\n📝 Step 11: Creating cover letters...");
    const coverLetterContent = {
      greeting: "Dear Hiring Manager,",
      opening:
        "I am writing to express my strong interest in the Senior Full Stack Engineer position at Google. With over 5 years of experience in full-stack development and a proven track record of building scalable applications, I am excited about the opportunity to contribute to Google's innovative projects.",
      body: [
        "In my current role as Senior Software Engineer at TechCorp Inc., I have led the development of microservices architecture serving over 1 million users. I have successfully mentored junior developers, implemented CI/CD pipelines that reduced deployment time by 40%, and optimized database queries improving API response time by 50%.",
        "My experience with React, Node.js, and cloud technologies aligns perfectly with the requirements for this position. I am particularly drawn to Google's commitment to innovation and its collaborative engineering culture.",
        "I am excited about the opportunity to bring my technical expertise and leadership skills to Google's team. Thank you for considering my application. I look forward to discussing how my experience can contribute to your team's success.",
      ],
      closing:
        "Thank you for your time and consideration. I look forward to the opportunity to discuss my qualifications further.",
      fullText: "",
    };

    const coverLetterIds = [];
    for (let i = 0; i < 2; i++) {
      const coverLetterId = uuidv4();
      coverLetterIds.push(coverLetterId);
      // Set job_id to null to avoid constraint conflicts (can be linked later via UI)
      const jobId = null;

      await database.query(
        `INSERT INTO coverletter (
          id, user_id, version_name, content, job_id,
          version_number, is_master, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          coverLetterId,
          userId,
          i === 0
            ? "Software Engineer Cover Letter"
            : `Cover Letter for ${jobOpportunities[i]?.company || "Company"}`,
          JSON.stringify(coverLetterContent),
          jobId,
          i + 1,
          i === 0,
        ]
      );
    }
    console.log(`   ✓ Created ${coverLetterIds.length} cover letters`);

    // Step 12: Link resumes and cover letters to jobs
    console.log("\n📝 Step 12: Linking resumes and cover letters to jobs...");
    if (jobIds.length > 0 && resumeIds.length > 0) {
      await database.query(
        `UPDATE job_opportunities 
         SET notes = COALESCE(notes, '') || '\nLinked resume: ' || $1
         WHERE id = $2`,
        [resumeIds[0], jobIds[0]]
      );
    }
    console.log("   ✓ Linked materials to jobs");

    console.log("\n✅ Demo data population completed successfully!");
    console.log("\n📋 Demo Account Credentials:");
    console.log(`   Email: ${DEMO_USER_EMAIL}`);
    console.log(`   Password: ${DEMO_USER_PASSWORD}`);
    console.log(`   User ID: ${userId}`);
    console.log("\n📊 Summary:");
    console.log(`   - 1 User with full profile`);
    console.log(`   - ${jobs.length} Employment history entries`);
    console.log(`   - ${educations.length} Education entries`);
    console.log(`   - ${skills.length} Skills`);
    console.log(`   - ${projects.length} Projects`);
    console.log(`   - ${certifications.length} Certifications`);
    console.log(
      `   - ${jobOpportunities.length} Job opportunities (all stages)`
    );
    console.log(`   - ${prospectiveJobs.length} Prospective jobs`);
    console.log(`   - ${resumeIds.length} Resumes`);
    console.log(`   - ${coverLetterIds.length} Cover letters`);
  } catch (error) {
    console.error("❌ Error populating demo data:", error);
    throw error;
  } finally {
    await database.close();
  }
}

populateDemoData().catch(console.error);
