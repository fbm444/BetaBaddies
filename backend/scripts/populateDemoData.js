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
        title: "Senior Full Stack Engineer",
        company: "Google",
        location: "Mountain View, CA",
        salary_min: 180000,
        salary_max: 250000,
        job_posting_url: "https://careers.google.com/jobs/results/123456",
        application_deadline: "2024-02-15",
        job_description:
          "We are looking for a Senior Full Stack Engineer to join our team. You will work on building scalable web applications, mentor junior engineers, and collaborate with cross-functional teams. Requirements: 5+ years experience, React, Node.js, cloud experience.",
        industry: "Technology",
        job_type: "Full-time",
        status: "Interested",
        notes:
          "Great opportunity at a top tech company. Need to tailor resume for this role.",
        recruiter_name: "Sarah Chen",
        recruiter_email: "sarah.chen@google.com",
      },
      {
        title: "Software Engineer III",
        company: "Microsoft",
        location: "Seattle, WA",
        salary_min: 160000,
        salary_max: 220000,
        job_posting_url: "https://careers.microsoft.com/jobs/results/789012",
        application_deadline: "2024-02-20",
        job_description:
          "Join Microsoft's cloud services team. Build and maintain large-scale distributed systems. Work with Azure, .NET, and modern web technologies.",
        industry: "Technology",
        job_type: "Full-time",
        status: "Applied",
        notes: "Applied on 2024-01-15. Waiting for response.",
        recruiter_name: "Michael Rodriguez",
        recruiter_email: "mrodriguez@microsoft.com",
      },
      {
        title: "Lead Frontend Developer",
        company: "Netflix",
        location: "Los Gatos, CA",
        salary_min: 170000,
        salary_max: 240000,
        job_posting_url: "https://jobs.netflix.com/jobs/345678",
        application_deadline: "2024-02-25",
        job_description:
          "Lead frontend development for Netflix's streaming platform. Work with React, TypeScript, and modern frontend architectures. Lead a team of 5 engineers.",
        industry: "Entertainment",
        job_type: "Full-time",
        status: "Phone Screen",
        notes:
          "Phone screen scheduled for 2024-01-20 at 2 PM. Prepare for technical questions.",
        recruiter_name: "Emily Watson",
        recruiter_email: "ewatson@netflix.com",
      },
      {
        title: "Full Stack Developer",
        company: "Airbnb",
        location: "San Francisco, CA",
        salary_min: 150000,
        salary_max: 200000,
        job_posting_url: "https://careers.airbnb.com/jobs/456789",
        application_deadline: "2024-03-01",
        job_description:
          "Build features for Airbnb's platform. Work with Ruby on Rails, React, and modern web technologies. Focus on user experience and scalability.",
        industry: "Travel",
        job_type: "Full-time",
        status: "Interview",
        notes:
          "On-site interview scheduled for 2024-01-25. Prepare system design questions.",
        recruiter_name: "David Kim",
        recruiter_email: "dkim@airbnb.com",
      },
      {
        title: "Senior Software Engineer",
        company: "Meta",
        location: "Menlo Park, CA",
        salary_min: 190000,
        salary_max: 260000,
        job_posting_url: "https://www.metacareers.com/jobs/567890",
        application_deadline: "2024-02-28",
        job_description:
          "Work on Meta's social media platforms. Build scalable backend systems, optimize performance, and work with large-scale data processing.",
        industry: "Technology",
        job_type: "Full-time",
        status: "Offer",
        notes:
          "Received offer on 2024-01-18. Negotiating salary and benefits. Base: $200k, RSU: $50k/year.",
        recruiter_name: "Jennifer Lee",
        recruiter_email: "jlee@meta.com",
        salary_negotiation_notes:
          "Initial offer: $200k base + $50k RSU. Countering with $220k base + $60k RSU.",
      },
      {
        title: "Backend Engineer",
        company: "Uber",
        location: "San Francisco, CA",
        salary_min: 140000,
        salary_max: 190000,
        job_posting_url: "https://www.uber.com/careers/jobs/678901",
        application_deadline: "2024-02-10",
        job_description:
          "Build backend services for Uber's platform. Work with microservices, distributed systems, and high-traffic applications.",
        industry: "Transportation",
        job_type: "Full-time",
        status: "Rejected",
        notes:
          "Rejected on 2024-01-12. Feedback: Looking for more Go experience.",
        recruiter_name: "Robert Taylor",
        recruiter_email: "rtaylor@uber.com",
      },
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW(), NOW())`,
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
        ]
      );
    }
    console.log(
      `   ✓ Added ${jobOpportunities.length} job opportunities across all stages`
    );

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
        deadline: "2024-02-18",
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
        deadline: "2024-02-22",
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
