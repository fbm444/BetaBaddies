#!/usr/bin/env node

/**
 * Create Interview Analytics Test User
 * 
 * This script creates a complete test user with:
 * - Full profile
 * - Skills, Education, Jobs, Projects, Certifications
 * - Job opportunities
 * - Multiple interviews with different formats and outcomes
 * - Interview feedback for analytics
 * 
 * Usage:
 *   node backend/scripts/createInterviewAnalyticsTestUser.js
 *  
 * Login credentials:
 *   Email: analytics.test@betabaddies.com
 *   Password: Test123!
 */

import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import database from "../services/database.js";

dotenv.config();

const TEST_USER_EMAIL = "analytics.test@betabaddies.com";
const TEST_USER_PASSWORD = "Test123!";

async function createTestUser() {
  try {
    console.log("🚀 Creating Interview Analytics Test User\n");
    
    // Get current date for use throughout the script
    const now = new Date();

    // Step 1: Create or get test user
    console.log("📝 Step 1: Creating test user...");
    let userId;

    const existingUser = await database.query(
      "SELECT u_id FROM users WHERE email = $1",
      [TEST_USER_EMAIL]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].u_id;
      console.log(`   ✓ Test user already exists: ${userId}`);
      console.log("   🗑️  Clearing existing data to start fresh...");
      
      // Delete all user data in correct order (respecting foreign keys)
      await database.query("DELETE FROM writing_practice_sessions WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM negotiation_confidence_exercises WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM salary_progression_history WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM salary_negotiations WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM interview_feedback WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM interviews WHERE user_id = $1", [userId]);
      // Delete cover letters and resumes before job opportunities (they reference job_opportunities)
      await database.query("DELETE FROM coverletter WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM resume WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM job_opportunities WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM certifications WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM projects WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM educations WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM skills WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM jobs WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
    } else {
      userId = uuidv4();
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 12);

      await database.query(
        `INSERT INTO users (u_id, email, password, created_at, updated_at, auth_provider)
         VALUES ($1, $2, $3, NOW(), NOW(), 'local')`,
        [userId, TEST_USER_EMAIL, hashedPassword]
      );
      console.log(`   ✓ Created test user: ${userId}`);
    }

    // Step 2: Create full profile
    console.log("\n📝 Step 2: Creating profile...");
    await database.query(
      `INSERT INTO profiles (
        user_id, first_name, last_name, phone, city, state, 
        job_title, bio, industry, exp_level, pfp_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        "Sarah",
        "Chen",
        "(555) 987-6543",
        "San Francisco",
        "CA",
        "Senior Software Engineer",
        "Experienced software engineer with 6+ years in full-stack development. Passionate about system design, algorithms, and building scalable applications. Currently looking for new opportunities in big tech companies.",
        "Technology",
        "Senior",
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
      ]
    );
    console.log("   ✓ Profile created");

    // Step 3: Add skills - comprehensive skill set for big tech
    console.log("\n📝 Step 3: Adding skills...");
    const skills = [
      // Languages
      { skillName: "JavaScript", proficiency: "Expert", category: "Languages" },
      { skillName: "TypeScript", proficiency: "Advanced", category: "Languages" },
      { skillName: "Python", proficiency: "Advanced", category: "Languages" },
      { skillName: "Java", proficiency: "Advanced", category: "Languages" },
      { skillName: "Go", proficiency: "Intermediate", category: "Languages" },
      { skillName: "C++", proficiency: "Intermediate", category: "Languages" },
      // Frontend
      { skillName: "React", proficiency: "Expert", category: "Technical" },
      { skillName: "Next.js", proficiency: "Advanced", category: "Technical" },
      { skillName: "Redux", proficiency: "Advanced", category: "Technical" },
      { skillName: "HTML/CSS", proficiency: "Expert", category: "Technical" },
      // Backend
      { skillName: "Node.js", proficiency: "Advanced", category: "Technical" },
      { skillName: "Express.js", proficiency: "Advanced", category: "Technical" },
      { skillName: "GraphQL", proficiency: "Intermediate", category: "Technical" },
      { skillName: "REST APIs", proficiency: "Expert", category: "Technical" },
      // Databases
      { skillName: "PostgreSQL", proficiency: "Advanced", category: "Technical" },
      { skillName: "MongoDB", proficiency: "Advanced", category: "Technical" },
      { skillName: "Redis", proficiency: "Intermediate", category: "Technical" },
      // Cloud & DevOps
      { skillName: "AWS", proficiency: "Advanced", category: "Technical" },
      { skillName: "Docker", proficiency: "Advanced", category: "Technical" },
      { skillName: "Kubernetes", proficiency: "Intermediate", category: "Technical" },
      { skillName: "CI/CD", proficiency: "Advanced", category: "Technical" },
      { skillName: "Terraform", proficiency: "Intermediate", category: "Technical" },
      // Core CS
      { skillName: "System Design", proficiency: "Advanced", category: "Technical" },
      { skillName: "Algorithms", proficiency: "Expert", category: "Technical" },
      { skillName: "Data Structures", proficiency: "Expert", category: "Technical" },
      { skillName: "Distributed Systems", proficiency: "Advanced", category: "Technical" },
      // Other
      { skillName: "Microservices", proficiency: "Advanced", category: "Technical" },
      { skillName: "Git", proficiency: "Expert", category: "Technical" },
      { skillName: "Agile/Scrum", proficiency: "Advanced", category: "Soft Skills" },
      { skillName: "Leadership", proficiency: "Advanced", category: "Soft Skills" },
      { skillName: "Mentoring", proficiency: "Advanced", category: "Soft Skills" },
    ];

    for (const skill of skills) {
      await database.query(
        `INSERT INTO skills (id, user_id, skill_name, proficiency, category)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
        [userId, skill.skillName, skill.proficiency, skill.category]
      );
    }
    console.log(`   ✓ Added ${skills.length} skills`);

    // Step 4: Add education
    console.log("\n📝 Step 4: Adding education...");
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
    console.log("   ✓ Added 2 education entries");

    // Step 5: Add employment history
    console.log("\n📝 Step 5: Adding employment history...");
    const jobs = [
      {
        title: "Senior Software Engineer",
        company: "LinkedIn",
        location: "Sunnyvale, CA",
        start_date: "2020-03-01",
        end_date: null,
        is_current: true,
        description: "Lead development of microservices architecture. Mentored junior developers.",
        salary: 155000,
      },
      {
        title: "Software Engineer",
        company: "Twitch",
        location: "San Francisco, CA",
        start_date: "2018-06-01",
        end_date: "2020-02-28",
        is_current: false,
        description: "Developed React-based frontend applications. Increased user engagement by 25%.",
        salary: 120000,
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
    console.log(`   ✓ Added ${jobs.length} jobs`);

    // Step 6: Add projects - comprehensive portfolio
    console.log("\n📝 Step 6: Adding projects...");
    const projects = [
      {
        name: "Distributed E-Commerce Platform",
        description: "Built scalable e-commerce platform using microservices architecture, handling 50K+ concurrent users. Implemented Redis caching, PostgreSQL sharding, and AWS auto-scaling. Reduced latency by 60% and improved throughput by 3x.",
        start_date: "2021-01-01",
        end_date: "2021-06-30",
        technologies: "React, Node.js, TypeScript, PostgreSQL, Redis, AWS, Docker, Kubernetes",
        status: "Completed",
        link: "https://github.com/example/ecommerce-platform",
      },
      {
        name: "Real-time Chat Application",
        description: "Developed real-time messaging app with WebSocket support, supporting 10K+ concurrent connections. Implemented message queuing, presence detection, and end-to-end encryption.",
        start_date: "2020-08-01",
        end_date: "2020-12-31",
        technologies: "React, Node.js, Socket.io, MongoDB, Redis, AWS",
        status: "Completed",
        link: "https://github.com/example/chat-app",
      },
      {
        name: "AI Recommendation System",
        description: "Machine learning recommendation engine for personalized content. Trained models using TensorFlow, achieving 85% accuracy. Deployed using Flask API with Redis caching.",
        start_date: "2022-03-01",
        end_date: null,
        technologies: "Python, TensorFlow, Flask, PostgreSQL, Redis, Docker",
        status: "Ongoing",
        link: "https://github.com/example/ml-recommendations",
      },
      {
        name: "Distributed Task Queue System",
        description: "Built a distributed task queue system similar to Celery, supporting priority queues, retries, and rate limiting. Handles 1M+ tasks per day with 99.9% reliability.",
        start_date: "2021-07-01",
        end_date: "2022-02-28",
        technologies: "Go, Redis, PostgreSQL, gRPC, Docker, Kubernetes",
        status: "Completed",
        link: "https://github.com/example/task-queue",
      },
      {
        name: "Cloud Infrastructure Monitoring Tool",
        description: "Real-time monitoring dashboard for cloud infrastructure. Tracks metrics, logs, and alerts across multiple AWS accounts. Built with React and real-time WebSocket updates.",
        start_date: "2022-09-01",
        end_date: null,
        technologies: "React, TypeScript, Node.js, PostgreSQL, AWS CloudWatch, WebSockets",
        status: "Ongoing",
        link: "https://github.com/example/cloud-monitor",
      },
      {
        name: "High-Performance API Gateway",
        description: "Built a custom API gateway with rate limiting, authentication, and request routing. Handles 100K+ requests per second with sub-millisecond latency.",
        start_date: "2020-03-01",
        end_date: "2020-07-31",
        technologies: "Go, Redis, PostgreSQL, gRPC, Docker",
        status: "Completed",
        link: "https://github.com/example/api-gateway",
      },
    ];

    for (const project of projects) {
      await database.query(
        `INSERT INTO projects (id, user_id, name, description, start_date, end_date, technologies, status, link)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          project.name,
          project.description,
          project.start_date,
          project.end_date,
          project.technologies,
          project.status,
          project.link || null,
        ]
      );
    }
    console.log(`   ✓ Added ${projects.length} projects`);

    // Step 7: Add certifications - comprehensive certifications
    console.log("\n📝 Step 7: Adding certifications...");
    const certifications = [
      {
        name: "AWS Certified Solutions Architect - Professional",
        orgName: "Amazon Web Services",
        dateEarned: "2022-05-15",
        neverExpires: false,
        expirationDate: "2025-05-15",
      },
      {
        name: "AWS Certified Developer - Associate",
        orgName: "Amazon Web Services",
        dateEarned: "2021-11-20",
        neverExpires: false,
        expirationDate: "2024-11-20",
      },
      {
        name: "Google Cloud Professional Cloud Architect",
        orgName: "Google Cloud",
        dateEarned: "2023-02-10",
        neverExpires: false,
        expirationDate: "2026-02-10",
      },
      {
        name: "Kubernetes Administrator (CKA)",
        orgName: "Cloud Native Computing Foundation",
        dateEarned: "2022-08-30",
        neverExpires: false,
        expirationDate: "2025-08-30",
      },
      {
        name: "Certified Kubernetes Application Developer (CKAD)",
        orgName: "Cloud Native Computing Foundation",
        dateEarned: "2022-09-15",
        neverExpires: false,
        expirationDate: "2025-09-15",
      },
      {
        name: "MongoDB Certified Developer",
        orgName: "MongoDB",
        dateEarned: "2021-06-10",
        neverExpires: false,
        expirationDate: "2024-06-10",
      },
    ];

    for (const cert of certifications) {
    await database.query(
      `INSERT INTO certifications (id, user_id, name, org_name, date_earned, never_expires, expiration_date)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
      [
        userId,
          cert.name,
          cert.orgName,
          cert.dateEarned,
          cert.neverExpires,
          cert.expirationDate,
        ]
      );
    }
    console.log(`   ✓ Added ${certifications.length} certifications`);

    // Step 8: Create job opportunities (needed for interviews) - Using big-name tech companies, no duplicates
    console.log("\n📝 Step 8: Creating job opportunities with recruiter data...");
    const jobOpportunities = [
      {
        title: "Senior Software Engineer",
        company: "Meta",
        location: "Menlo Park, CA",
        industry: "Technology",
        status: "Offer",
        salary_min: 180000,
        salary_max: 250000,
        recruiter_name: "Sarah Johnson",
        recruiter_email: "sarah.johnson@meta.com",
        recruiter_phone: "+1 (650) 555-0123",
      },
      {
        title: "Software Development Engineer II",
        company: "Amazon",
        location: "Seattle, WA",
        industry: "Technology",
        status: "Offer",
        salary_min: 175000,
        salary_max: 240000,
        recruiter_name: "Michael Chen",
        recruiter_email: "mchen@amazon.com",
        recruiter_phone: "+1 (206) 555-0145",
      },
      {
        title: "Senior Software Engineer",
        company: "Apple",
        location: "Cupertino, CA",
        industry: "Technology",
        status: "Offer",
        salary_min: 190000,
        salary_max: 260000,
        recruiter_name: "Emily Rodriguez",
        recruiter_email: "emily.rodriguez@apple.com",
        recruiter_phone: "+1 (408) 555-0167",
      },
      {
        title: "Senior Software Engineer",
        company: "Netflix",
        location: "Los Gatos, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 200000,
        salary_max: 280000,
        recruiter_name: "David Kim",
        recruiter_email: "david.kim@netflix.com",
        recruiter_phone: "+1 (408) 555-0189",
      },
      {
        title: "Software Engineer L4",
        company: "Google",
        location: "Mountain View, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 185000,
        salary_max: 255000,
        recruiter_name: "Jessica Williams",
        recruiter_email: "jwilliams@google.com",
        recruiter_phone: "+1 (650) 555-0201",
      },
      {
        title: "Senior Backend Engineer",
        company: "Microsoft",
        location: "Redmond, WA",
        industry: "Technology",
        status: "Interview",
        salary_min: 175000,
        salary_max: 245000,
        recruiter_name: "Robert Martinez",
        recruiter_email: "robert.martinez@microsoft.com",
        recruiter_phone: "+1 (425) 555-0223",
      },
      {
        title: "Senior Software Engineer",
        company: "Salesforce",
        location: "San Francisco, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 180000,
        salary_max: 250000,
        recruiter_name: "Alex Thompson",
        recruiter_email: "alex.thompson@salesforce.com",
        recruiter_phone: "+1 (415) 555-0245",
      },
      {
        title: "Software Engineer",
        company: "Oracle",
        location: "Austin, TX",
        industry: "Technology",
        status: "Interview",
        salary_min: 175000,
        salary_max: 240000,
        recruiter_name: "Priya Patel",
        recruiter_email: "priya.patel@oracle.com",
        recruiter_phone: "+1 (512) 555-0267",
      },
      {
        title: "Senior Software Engineer",
        company: "Adobe",
        location: "San Jose, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 190000,
        salary_max: 260000,
        recruiter_name: "James Wilson",
        recruiter_email: "james.wilson@adobe.com",
        recruiter_phone: "+1 (408) 555-0289",
      },
      {
        title: "Senior Software Engineer",
        company: "Nvidia",
        location: "Santa Clara, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 200000,
        salary_max: 280000,
        recruiter_name: "Maria Garcia",
        recruiter_email: "maria.garcia@nvidia.com",
        recruiter_phone: "+1 (408) 555-0301",
      },
      {
        title: "Software Engineer",
        company: "Uber",
        location: "San Francisco, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 185000,
        salary_max: 255000,
        recruiter_name: "Chris Anderson",
        recruiter_email: "chris.anderson@uber.com",
        recruiter_phone: "+1 (415) 555-0323",
      },
      {
        title: "Senior Backend Engineer",
        company: "Stripe",
        location: "San Francisco, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 175000,
        salary_max: 245000,
        recruiter_name: "Amanda Lee",
        recruiter_email: "amanda.lee@stripe.com",
        recruiter_phone: "+1 (415) 555-0345",
      },
      {
        title: "Senior Software Engineer",
        company: "Airbnb",
        location: "San Francisco, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 190000,
        salary_max: 260000,
        recruiter_name: "Jennifer Martinez",
        recruiter_email: "jennifer.martinez@airbnb.com",
        recruiter_phone: "+1 (415) 555-0367",
      },
      {
        title: "Software Engineer",
        company: "Palantir",
        location: "Palo Alto, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 195000,
        salary_max: 270000,
        recruiter_name: "David Taylor",
        recruiter_email: "david.taylor@palantir.com",
        recruiter_phone: "+1 (650) 555-0389",
      },
      {
        title: "Senior Software Engineer",
        company: "Databricks",
        location: "San Francisco, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 200000,
        salary_max: 275000,
        recruiter_name: "Lisa Wang",
        recruiter_email: "lisa.wang@databricks.com",
        recruiter_phone: "+1 (415) 555-0401",
      },
      {
        title: "Software Engineer",
        company: "Snowflake",
        location: "San Mateo, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 185000,
        salary_max: 250000,
        recruiter_name: "Robert Chen",
        recruiter_email: "robert.chen@snowflake.com",
        recruiter_phone: "+1 (650) 555-0423",
      },
    ];

    const jobOppIds = [];
    for (const jobOpp of jobOpportunities) {
      const result = await database.query(
        `INSERT INTO job_opportunities (id, user_id, title, company, location, industry, status, salary_min, salary_max, recruiter_name, recruiter_email, recruiter_phone)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          userId,
          jobOpp.title,
          jobOpp.company,
          jobOpp.location,
          jobOpp.industry,
          jobOpp.status,
          jobOpp.salary_min || null,
          jobOpp.salary_max || null,
          jobOpp.recruiter_name || null,
          jobOpp.recruiter_email || null,
          jobOpp.recruiter_phone || null,
        ]
      );
      jobOppIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${jobOpportunities.length} job opportunities with recruiter data`);

    // Step 9: Create interviews with different formats and outcomes (including practice and scheduled)
    console.log("\n📝 Step 9: Creating interviews...");
    
    // Calculate dates - spread interviews over the past 12 months and future dates
    
    // First create some practice interviews
    const practiceInterviewsData = [
      {
        jobOpportunityId: jobOppIds[6], // Salesforce for practice
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000), // 12 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: true,
      },
      {
        jobOpportunityId: jobOppIds[7], // Oracle for practice
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 11.5 * 30 * 24 * 60 * 60 * 1000), // 11.5 months ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: true,
      },
    ];
    
    // Past completed interviews - each company appears only once
    const pastInterviewsData = [
      {
        jobOpportunityId: jobOppIds[0], // Meta
        interviewType: "phone",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000), // 11 months ago
        duration: 30,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[1], // Amazon
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 10 * 30 * 24 * 60 * 60 * 1000), // 10 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[2], // Apple
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 9 * 30 * 24 * 60 * 60 * 1000), // 9 months ago
        duration: 45,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[3], // Netflix
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 8 * 30 * 24 * 60 * 60 * 1000), // 8 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[4], // Google
        interviewType: "in-person",
        format: "on_site",
        scheduledAt: new Date(now.getTime() - 7 * 30 * 24 * 60 * 60 * 1000), // 7 months ago
        duration: 180,
        status: "completed",
        outcome: "rejected",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[5], // Microsoft
        interviewType: "video",
        format: "system_design",
        scheduledAt: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
        duration: 90,
        status: "completed",
        outcome: "rejected",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[6], // Salesforce
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 5 * 30 * 24 * 60 * 60 * 1000), // 5 months ago
        duration: 60,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[7], // Oracle
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 4 * 30 * 24 * 60 * 60 * 1000), // 4 months ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[8], // Adobe
        interviewType: "video",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000), // 3 months ago
        duration: 30,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[9], // Nvidia
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000), // 2 months ago
        duration: 60,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[10], // Uber
        interviewType: "video",
        format: "hirevue",
        scheduledAt: new Date(now.getTime() - 1 * 30 * 24 * 60 * 60 * 1000), // 1 month ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
    ];
    
    // Future scheduled interviews - each company appears only once
    const scheduledInterviewsData = [
      {
        jobOpportunityId: jobOppIds[11], // Stripe - Technical Interview
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Chris Anderson",
        interviewerEmail: "chris.anderson@stripe.com",
        interviewerTitle: "Senior Software Engineer",
        videoLink: "https://stripe.zoom.us/j/meetup-join/123",
        notes: "Technical interview focusing on problem-solving and code quality.",
      },
      {
        jobOpportunityId: jobOppIds[12], // Airbnb - Technical Round
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "John Smith",
        interviewerEmail: "john.smith@airbnb.com",
        interviewerTitle: "Senior Engineering Manager",
        videoLink: "https://airbnb.zoom.us/j/interview-room-123",
        notes: "Focus on system design and algorithms. Review Airbnb's engineering blog.",
      },
      {
        jobOpportunityId: jobOppIds[13], // Palantir - Phone Screen
        interviewType: "phone",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        duration: 30,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Michael Chen",
        interviewerEmail: "mchen@palantir.com",
        interviewerTitle: "Recruiter",
        phoneNumber: "+1-650-555-0123",
        notes: "Initial screening call. Be ready to discuss background and motivation.",
      },
      {
        jobOpportunityId: jobOppIds[14], // Databricks - Technical Interview
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Emily Rodriguez",
        interviewerEmail: "erodriguez@databricks.com",
        interviewerTitle: "Software Development Manager",
        videoLink: "https://databricks.zoom.us/j/interview-789",
        notes: "Coding interview. Focus on data structures and algorithms. Review LeetCode.",
      },
      {
        jobOpportunityId: jobOppIds[15], // Snowflake - System Design
        interviewType: "video",
        format: "system_design",
        scheduledAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        duration: 90,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "David Kim",
        interviewerEmail: "david.kim@snowflake.com",
        interviewerTitle: "Senior Software Engineer",
        videoLink: "https://snowflake.zoom.us/j/interview-abc",
        notes: "System design interview. Review cloud data architecture and distributed systems.",
      },
    ];
    
    const interviewsData = [...pastInterviewsData];
    
    // Combine practice, past, and scheduled interviews
    const allInterviewsData = [...practiceInterviewsData, ...interviewsData, ...scheduledInterviewsData];

    // Create a map of job opportunity IDs to company names for quick lookup
    const jobOppCompanyMap = new Map();
    for (let i = 0; i < jobOppIds.length; i++) {
      jobOppCompanyMap.set(jobOppIds[i], jobOpportunities[i].company);
    }

    const interviewIds = [];
    const interviewMetaMap = new Map();
    for (const interviewData of allInterviewsData) {
      // Get company name from job opportunity
      const company = interviewData.jobOpportunityId 
        ? jobOppCompanyMap.get(interviewData.jobOpportunityId) || null
        : null;
      
      // Generate title based on job opportunity
      const jobOppIndex = jobOppIds.indexOf(interviewData.jobOpportunityId);
      const title = jobOppIndex >= 0 
        ? `${jobOpportunities[jobOppIndex].title} Interview`
        : "Interview";
      
      // Insert interview - handle both date and scheduled_at columns
      const scheduledAtISO = interviewData.scheduledAt.toISOString();
      const result = await database.query(
        `INSERT INTO interviews (
          id, user_id, job_opportunity_id, title, company, type, format, scheduled_at, date, duration, 
          status, outcome, is_practice, interviewer_name, interviewer_email, 
          interviewer_title, video_link, phone_number, notes
        )
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING id`,
        [
          userId,
          interviewData.jobOpportunityId || null,
          title,
          company,
          interviewData.interviewType,
          interviewData.format,
          scheduledAtISO,
          scheduledAtISO, // Also set date column for compatibility
          interviewData.duration,
          interviewData.status,
          interviewData.outcome,
          interviewData.isPractice || false,
          interviewData.interviewerName || null,
          interviewData.interviewerEmail || null,
          interviewData.interviewerTitle || null,
          interviewData.videoLink || null,
          interviewData.phoneNumber || null,
          interviewData.notes || null,
        ]
      );
      const newId = result.rows[0].id;
      interviewIds.push(newId);
      interviewMetaMap.set(newId, {
        scheduledAt: interviewData.scheduledAt,
        outcome: interviewData.outcome,
      });
    }
    console.log(`   ✓ Created ${allInterviewsData.length} interviews:`);
    console.log(`     - ${practiceInterviewsData.length} practice interviews`);
    console.log(`     - ${pastInterviewsData.length} past completed interviews`);
    console.log(`     - ${scheduledInterviewsData.length} scheduled future interviews with real companies`);

    // Step 10: Create sample follow-up actions for analytics testing
    console.log("\n📝 Step 10: Creating follow-up actions...");

    const practiceCount = practiceInterviewsData.length;
    const pastCount = pastInterviewsData.length;
    const realInterviewIdsForFollowUps = interviewIds.slice(
      practiceCount,
      practiceCount + pastCount
    );

    const followUpActionsData = [];

    // Add thank-you + follow-up/status for a few past interviews
    realInterviewIdsForFollowUps.slice(0, 3).forEach((id) => {
      const meta = interviewMetaMap.get(id);
      if (!meta) return;
      const baseDate = meta.scheduledAt;

      const addAction = (actionType, hoursOffset, notes) => {
        const dueDate = new Date(
          baseDate.getTime() + hoursOffset * 60 * 60 * 1000
        );
        followUpActionsData.push({
          interviewId: id,
          actionType,
          dueDate: dueDate.toISOString(),
          notes,
          completed: actionType === "thank_you_note", // mark initial thank-you as completed
        });
      };

      addAction(
        "thank_you_note",
        24,
        "Send a thank-you note to express appreciation for the interview"
      );
      addAction(
        "follow_up_email",
        24 * 7,
        "Follow up on interview status if you haven't heard back"
      );
      addAction(
        "status_inquiry",
        24 * 14,
        "Inquire about the hiring decision timeline"
      );
    });

    // Insert follow-up actions
    for (const action of followUpActionsData) {
      await database.query(
        `INSERT INTO interview_follow_ups (
          id, interview_id, action_type, due_date, notes, completed, created_at, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          action.interviewId,
          action.actionType,
          action.dueDate,
          action.notes,
          action.completed,
        ]
      );
    }
    console.log(
      `   ✓ Created ${followUpActionsData.length} follow-up actions for past interviews`
    );

    // Step 11: Create interview feedback with skill area scores
    console.log("\n📝 Step 11: Creating interview feedback...");
    
    // Create feedback entries that show improvement over time
    // Earlier interviews have lower scores, later ones have higher scores
    // Note: Practice interviews are at indices 0-1, past interviews start at index 2, scheduled interviews are at the end
    const practiceCountForFeedback = practiceInterviewsData.length;
    const pastCountForFeedback = pastInterviewsData.length;
    const feedbackData = [
      // Past Interview 0 (11 months ago) - Meta Phone screen - Offer
      { interviewId: interviewIds[practiceCountForFeedback + 0], skillArea: "behavioral", score: 55 },
      
      // Past Interview 1 (10 months ago) - Amazon Technical - Passed
      { interviewId: interviewIds[practiceCountForFeedback + 1], skillArea: "algorithms", score: 60 },
      { interviewId: interviewIds[practiceCountForFeedback + 1], skillArea: "system_design", score: 65 },
      
      // Past Interview 2 (9 months ago) - Apple Behavioral - Offer
      { interviewId: interviewIds[practiceCountForFeedback + 2], skillArea: "behavioral", score: 65 },
      
      // Past Interview 3 (8 months ago) - Netflix Technical - Passed
      { interviewId: interviewIds[practiceCountForFeedback + 3], skillArea: "algorithms", score: 70 },
      { interviewId: interviewIds[practiceCountForFeedback + 3], skillArea: "apis", score: 75 },
      
      // Past Interview 4 (7 months ago) - Google On-site - Rejected (lower scores)
      { interviewId: interviewIds[practiceCountForFeedback + 4], skillArea: "behavioral", score: 45 },
      { interviewId: interviewIds[practiceCountForFeedback + 4], skillArea: "system_design", score: 50 },
      { interviewId: interviewIds[practiceCountForFeedback + 4], skillArea: "time_management", score: 40 },
      
      // Past Interview 5 (6 months ago) - Microsoft System design - Rejected
      { interviewId: interviewIds[practiceCountForFeedback + 5], skillArea: "system_design", score: 55 },
      
      // Past Interview 6 (5 months ago) - Salesforce Technical - Offer (better scores)
      { interviewId: interviewIds[practiceCountForFeedback + 6], skillArea: "algorithms", score: 80 },
      { interviewId: interviewIds[practiceCountForFeedback + 6], skillArea: "system_design", score: 75 },
      
      // Past Interview 7 (4 months ago) - Oracle Behavioral - Passed
      { interviewId: interviewIds[practiceCountForFeedback + 7], skillArea: "behavioral", score: 75 },
      
      // Past Interview 8 (3 months ago) - Adobe Phone screen - Passed
      { interviewId: interviewIds[practiceCountForFeedback + 8], skillArea: "behavioral", score: 70 },
      
      // Past Interview 9 (2 months ago) - Nvidia Technical - Offer (great scores)
      { interviewId: interviewIds[practiceCountForFeedback + 9], skillArea: "algorithms", score: 85 },
      { interviewId: interviewIds[practiceCountForFeedback + 9], skillArea: "system_design", score: 80 },
      { interviewId: interviewIds[practiceCountForFeedback + 9], skillArea: "apis", score: 85 },
      
      // Past Interview 10 (1 month ago) - Uber HireVue - Passed
      { interviewId: interviewIds[practiceCountForFeedback + 10], skillArea: "behavioral", score: 80 },
      { interviewId: interviewIds[practiceCountForFeedback + 10], skillArea: "time_management", score: 75 },
    ];

    // Add notes for theme analysis (using real interview IDs)
    const feedbackNotes = {
      [interviewIds[practiceCountForFeedback + 0]]:
        "Great communication and clear explanation of experience with Meta",
      [interviewIds[practiceCountForFeedback + 1]]:
        "Strong technical depth, excellent problem solving approach at Amazon",
      [interviewIds[practiceCountForFeedback + 4]]:
        "Struggled with time management, nervous during Google on-site",
      [interviewIds[practiceCountForFeedback + 5]]:
        "Needs improvement in system design, lack of preparation for Microsoft",
      [interviewIds[practiceCountForFeedback + 6]]:
        "Outstanding code quality, confident and well-prepared for Salesforce",
      [interviewIds[practiceCountForFeedback + 9]]:
        "Excellent algorithm knowledge, great communication clarity at Nvidia",
    };

    for (const feedback of feedbackData) {
      const notes = feedbackNotes[feedback.interviewId] || null;
      await database.query(
        `INSERT INTO interview_feedback (id, interview_id, user_id, skill_area, score, notes)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [feedback.interviewId, userId, feedback.skillArea, feedback.score, notes]
      );
    }
    console.log(`   ✓ Created ${feedbackData.length} feedback entries`);
    
    // Step 12: Create pre/post assessments for confidence/anxiety tracking
    console.log("\n📝 Step 12: Creating pre/post assessments...");
    
    // Create pre-assessments for past real interviews (skip practice interviews and scheduled ones)
    const pastRealInterviewIds = interviewIds.slice(practiceCount, practiceCount + pastCount);
    const preAssessmentsData = [
      { interviewId: pastRealInterviewIds[0], confidence: 60, anxiety: 50, prepHours: 2 },
      { interviewId: pastRealInterviewIds[1], confidence: 65, anxiety: 45, prepHours: 8 },
      { interviewId: pastRealInterviewIds[2], confidence: 70, anxiety: 40, prepHours: 5 },
      { interviewId: pastRealInterviewIds[3], confidence: 68, anxiety: 42, prepHours: 10 },
      { interviewId: pastRealInterviewIds[6], confidence: 75, anxiety: 35, prepHours: 12 },
      { interviewId: pastRealInterviewIds[9], confidence: 80, anxiety: 30, prepHours: 15 },
    ];
    
    for (const assessment of preAssessmentsData) {
      await database.query(
        `INSERT INTO interview_pre_assessment (id, interview_id, user_id, confidence_level, anxiety_level, preparation_hours)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [assessment.interviewId, userId, assessment.confidence, assessment.anxiety, assessment.prepHours]
      );
    }
    
    // Create post-reflections for some past interviews
    const postReflectionsData = [
      { interviewId: pastRealInterviewIds[0], postConfidence: 70, postAnxiety: 35, feeling: "great", 
        whatWentWell: "Clear communication, good examples with Meta recruiter", whatToImprove: "Could be more concise" },
      { interviewId: pastRealInterviewIds[6], postConfidence: 85, postAnxiety: 25, feeling: "great",
        whatWentWell: "Excellent preparation paid off at Salesforce", whatToImprove: "None, performed well" },
      { interviewId: pastRealInterviewIds[9], postConfidence: 88, postAnxiety: 20, feeling: "great",
        whatWentWell: "Strong technical performance at Nvidia", whatToImprove: "Continue current approach" },
    ];
    
    for (const reflection of postReflectionsData) {
      await database.query(
        `INSERT INTO interview_post_reflection (id, interview_id, user_id, post_confidence_level, post_anxiety_level, overall_feeling, what_went_well, what_to_improve)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
        [reflection.interviewId, userId, reflection.postConfidence, reflection.postAnxiety, 
         reflection.feeling, reflection.whatWentWell, reflection.whatToImprove]
      );
    }
    
    console.log(`   ✓ Created ${preAssessmentsData.length} pre-assessments and ${postReflectionsData.length} post-reflections`);

    // Step 13: Create salary negotiations for job opportunities with "Offer" status
    console.log("\n📝 Step 13: Creating salary negotiations...");
    
    // Find job opportunities with "Offer" status
    const offerJobOppIds = [];
    const offerJobOpps = [];
    for (let i = 0; i < jobOpportunities.length; i++) {
      if (jobOpportunities[i].status === "Offer") {
        offerJobOppIds.push(jobOppIds[i]);
        offerJobOpps.push({ id: jobOppIds[i], ...jobOpportunities[i] });
      }
    }

    const salaryNegotiationsData = [
      {
        // Meta offer
        jobOpportunityId: offerJobOppIds[0],
        initialOffer: {
          baseSalary: 200000,
          bonus: 30000,
          equity: 50000,
          benefitsValue: 15000,
          currency: "USD",
        },
        targetCompensation: {
          baseSalary: 230000,
          bonus: 40000,
          equity: 70000,
          benefitsValue: 15000,
        },
        initialOfferDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        marketData: {
          role: "Senior Software Engineer",
          location: "Menlo Park, CA",
          experienceLevel: 6,
          industry: "Technology",
          percentile25: 180000,
          percentile50: 210000,
          percentile75: 240000,
          percentile90: 280000,
          source: "AI-generated market research",
          date: new Date().toISOString().split("T")[0],
          notes: "Market data for Senior Software Engineer in Menlo Park, CA with 6 years of experience",
        },
        status: "active",
      },
      {
        // Amazon offer
        jobOpportunityId: offerJobOppIds[1],
        initialOffer: {
          baseSalary: 195000,
          bonus: 25000,
          equity: 45000,
          benefitsValue: 12000,
          currency: "USD",
        },
        targetCompensation: {
          baseSalary: 220000,
          bonus: 35000,
          equity: 60000,
          benefitsValue: 12000,
        },
        initialOfferDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        marketData: {
          role: "Software Development Engineer II",
          location: "Seattle, WA",
          experienceLevel: 6,
          industry: "Technology",
          percentile25: 175000,
          percentile50: 200000,
          percentile75: 230000,
          percentile90: 270000,
          source: "AI-generated market research",
          date: new Date().toISOString().split("T")[0],
          notes: "Market data for SDE II in Seattle, WA with 6 years of experience",
        },
        status: "active",
      },
      {
        // Apple offer (completed negotiation)
        jobOpportunityId: offerJobOppIds[2],
        initialOffer: {
          baseSalary: 210000,
          bonus: 35000,
          equity: 60000,
          benefitsValue: 18000,
          currency: "USD",
        },
        targetCompensation: {
          baseSalary: 240000,
          bonus: 45000,
          equity: 80000,
          benefitsValue: 18000,
        },
        finalCompensation: {
          baseSalary: 235000,
          bonus: 42000,
          equity: 75000,
          benefitsValue: 18000,
        },
        initialOfferDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        outcomeDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        marketData: {
          role: "Senior Software Engineer",
          location: "Cupertino, CA",
          experienceLevel: 6,
          industry: "Technology",
          percentile25: 190000,
          percentile50: 220000,
          percentile75: 250000,
          percentile90: 290000,
          source: "AI-generated market research",
          date: new Date().toISOString().split("T")[0],
          notes: "Market data for Senior Software Engineer in Cupertino, CA with 6 years of experience",
        },
        status: "completed",
        outcome: "accepted",
        outcomeNotes: "Successfully negotiated from $305k to $370k total compensation. Accepted the offer.",
      },
    ];

    for (const negotiation of salaryNegotiationsData) {
      const negotiationId = uuidv4();
      
      // Calculate totals
      const initialTotal = (negotiation.initialOffer.baseSalary || 0) +
        (negotiation.initialOffer.bonus || 0) +
        (negotiation.initialOffer.equity || 0) +
        (negotiation.initialOffer.benefitsValue || 0);
      
      const targetTotal = (negotiation.targetCompensation.baseSalary || 0) +
        (negotiation.targetCompensation.bonus || 0) +
        (negotiation.targetCompensation.equity || 0) +
        (negotiation.targetCompensation.benefitsValue || 0);

      const finalTotal = negotiation.finalCompensation
        ? (negotiation.finalCompensation.baseSalary || 0) +
          (negotiation.finalCompensation.bonus || 0) +
          (negotiation.finalCompensation.equity || 0) +
          (negotiation.finalCompensation.benefitsValue || 0)
        : null;

      await database.query(
        `INSERT INTO salary_negotiations (
          id, user_id, job_opportunity_id,
          initial_offer_base_salary, initial_offer_bonus, initial_offer_equity,
          initial_offer_benefits_value, initial_offer_total_compensation,
          initial_offer_currency, initial_offer_date,
          target_base_salary, target_bonus, target_equity,
          target_benefits_value, target_total_compensation,
          market_salary_data, market_research_notes,
          final_base_salary, final_bonus, final_equity,
          final_benefits_value, final_total_compensation,
          negotiation_outcome, outcome_date, outcome_notes,
          status, created_at, updated_at
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6, $7, $8,
          $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25,
          $26, NOW(), NOW()
        )`,
        [
          negotiationId,
          userId,
          negotiation.jobOpportunityId,
          negotiation.initialOffer.baseSalary,
          negotiation.initialOffer.bonus,
          negotiation.initialOffer.equity,
          negotiation.initialOffer.benefitsValue,
          initialTotal,
          negotiation.initialOffer.currency || "USD",
          negotiation.initialOfferDate.toISOString().split("T")[0],
          negotiation.targetCompensation.baseSalary,
          negotiation.targetCompensation.bonus,
          negotiation.targetCompensation.equity,
          negotiation.targetCompensation.benefitsValue,
          targetTotal,
          JSON.stringify(negotiation.marketData),
          negotiation.marketData.notes,
          negotiation.finalCompensation?.baseSalary || null,
          negotiation.finalCompensation?.bonus || null,
          negotiation.finalCompensation?.equity || null,
          negotiation.finalCompensation?.benefitsValue || null,
          finalTotal,
          negotiation.outcome || null,
          negotiation.outcomeDate ? negotiation.outcomeDate.toISOString().split("T")[0] : null,
          negotiation.outcomeNotes || null,
          negotiation.status || "draft",
        ]
      );

      // If negotiation was accepted, add to salary progression history
      if (negotiation.outcome === "accepted" && finalTotal) {
        const progressionId = uuidv4();
        await database.query(
          `INSERT INTO salary_progression_history (
            id, user_id, negotiation_id, job_opportunity_id,
            base_salary, bonus, equity, benefits_value, total_compensation,
            currency, role_title, company, location, effective_date,
            negotiation_type, notes, created_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14,
            $15, $16, NOW()
          )`,
          [
            progressionId,
            userId,
            negotiationId,
            negotiation.jobOpportunityId,
            negotiation.finalCompensation.baseSalary,
            negotiation.finalCompensation.bonus,
            negotiation.finalCompensation.equity,
            negotiation.finalCompensation.benefitsValue,
            finalTotal,
            "USD",
            offerJobOpps.find(j => j.id === negotiation.jobOpportunityId)?.title || "Senior Software Engineer",
            offerJobOpps.find(j => j.id === negotiation.jobOpportunityId)?.company || "Company",
            offerJobOpps.find(j => j.id === negotiation.jobOpportunityId)?.location || "Location",
            negotiation.outcomeDate.toISOString().split("T")[0],
            "accepted",
            "Accepted offer after successful negotiation",
          ]
        );
      }
    }
    
    console.log(`   ✓ Created ${salaryNegotiationsData.length} salary negotiations:`);
    console.log(`     - 2 active negotiations (Meta, Amazon)`);
    console.log(`     - 1 completed negotiation (Apple - accepted)`);
    console.log(`     - All include market research data`);

    // Step 14: Create writing practice sessions from the last month for trends
    console.log("\n📝 Step 14: Creating writing practice sessions (last month)...");
    
    const currentDate = new Date();
    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    // Sample prompts for different session types
    const prompts = {
      interview_response: [
        "Tell me about yourself.",
        "Why are you interested in this position?",
        "Describe a time when you had to work with a difficult team member.",
        "Tell me about a challenging project you worked on.",
        "What are your strengths and weaknesses?",
        "How do you handle tight deadlines?",
        "Describe a situation where you had to learn something new quickly.",
        "Tell me about a time you made a mistake and how you handled it.",
        "What motivates you in your work?",
        "Describe your approach to problem-solving.",
      ],
      thank_you_note: [
        "Thank you for taking the time to speak with me about the Senior Software Engineer position.",
        "I wanted to express my appreciation for our discussion about the Software Development Engineer II role.",
        "Thank you for the opportunity to interview for the Senior Backend Engineer position.",
      ],
      follow_up: [
        "I wanted to follow up regarding the status of my application for the Senior Software Engineer position.",
        "I hope this email finds you well. I wanted to check on the timeline for the hiring decision.",
        "I wanted to follow up on my interview and express my continued interest in the role.",
      ],
    };
    
    // Create sessions spread across the last 30 days (about 3-4 per day on average)
    const writingSessionsData = [];
    const sessionTypes = ["interview_response", "interview_response", "interview_response", "thank_you_note", "follow_up"];
    
    // Generate sessions over the last month with improving trends
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const sessionDate = new Date(currentDate);
      sessionDate.setDate(sessionDate.getDate() - dayOffset);
      
      // Vary number of sessions per day (0-5 sessions, more frequent in recent days)
      const sessionsPerDay = Math.floor(Math.random() * (dayOffset < 10 ? 6 : 4));
      
      for (let i = 0; i < sessionsPerDay; i++) {
        const sessionType = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
        const promptsForType = prompts[sessionType] || prompts.interview_response;
        const prompt = promptsForType[Math.floor(Math.random() * promptsForType.length)];
        
        // Calculate scores - improve over time (later days have better scores)
        const progressFactor = (30 - dayOffset) / 30; // 0 to 1
        const baseScore = 60 + (progressFactor * 30); // 60 to 90
        
        const clarityScore = Math.floor(baseScore + (Math.random() - 0.5) * 10);
        const professionalismScore = Math.floor(baseScore + (Math.random() - 0.5) * 10);
        const structureScore = Math.floor(baseScore + (Math.random() - 0.5) * 10);
        const storytellingScore = Math.floor(baseScore + (Math.random() - 0.5) * 10);
        
        // Realistic word counts based on session type
        let wordCount;
        if (sessionType === "thank_you_note") {
          wordCount = 150 + Math.floor(Math.random() * 100);
        } else if (sessionType === "follow_up") {
          wordCount = 200 + Math.floor(Math.random() * 150);
        } else {
          wordCount = 250 + Math.floor(Math.random() * 300);
        }
        
        // Time spent (in seconds) - roughly 1 word per 2-3 seconds
        const timeSpent = Math.floor(wordCount * (2 + Math.random() * 1.5));
        
        // Generate sample response text based on session type and prompt
        let responseText;
        if (sessionType === "thank_you_note") {
          responseText = `Dear Interviewer,\n\nThank you for taking the time to speak with me about the position. ` +
            `I truly appreciated our conversation and the opportunity to learn more about the role and your team. ` +
            `Our discussion about the projects and challenges was particularly insightful. I'm very excited about ` +
            `the possibility of contributing to your team and bringing my skills and experience to help achieve ` +
            `your goals. I look forward to hearing from you soon.\n\nBest regards,\nSarah Chen`;
        } else if (sessionType === "follow_up") {
          responseText = `Dear Interviewer,\n\nI hope this email finds you well. I wanted to follow up regarding ` +
            `the status of my application for the position. I remain very interested in the opportunity and ` +
            `would appreciate any updates you might have regarding the hiring timeline. If you need any ` +
            `additional information from me, please don't hesitate to reach out.\n\nThank you for your time ` +
            `and consideration.\n\nBest regards,\nSarah Chen`;
        } else {
          // Interview response - more detailed
          const examples = [
            `In my previous role at LinkedIn, I had the opportunity to work on several challenging projects. ` +
            `One example that comes to mind is when I led the development of a distributed system that needed ` +
            `to handle millions of requests per day. I collaborated closely with cross-functional teams, ` +
            `including product managers, designers, and other engineers, to understand requirements and ` +
            `design a scalable architecture.`,
            `I'm particularly interested in this position because it aligns perfectly with my career goals ` +
            `and my passion for building innovative solutions. The company's focus on technology and ` +
            `innovation really resonates with me, and I believe I can contribute meaningfully to your team.`,
            `One of my key strengths is my ability to communicate effectively with both technical and ` +
            `non-technical stakeholders. I make it a point to translate complex technical concepts into ` +
            `clear, actionable insights that help drive decision-making.`
          ];
          responseText = examples[Math.floor(Math.random() * examples.length)] + `\n\n` +
            `This experience taught me the importance of thorough planning, clear communication, and ` +
            `iterative development. I believe these skills would be valuable in this role, and I'm ` +
            `excited about the opportunity to bring my expertise to your team.`;
        }
        
        // Adjust response length to match target word count
        const currentWords = responseText.split(/\s+/).length;
        if (currentWords < wordCount) {
          // Add more content to reach target word count
          const additionalWords = wordCount - currentWords;
          const filler = `This demonstrates my experience and ability to effectively communicate my ideas. ` +
            `I believe this highlights my relevant skills and qualifications for this role. ` +
            `My background in software engineering has prepared me well for this type of challenge. ` +
            `I'm confident that I can bring value to your team through my technical expertise and problem-solving abilities. ` +
            `I look forward to the opportunity to contribute to your organization's success.`;
          const fillerWords = filler.split(/\s+/);
          const repetitions = Math.ceil(additionalWords / fillerWords.length);
          responseText += `\n\n` + fillerWords.join(' ').repeat(repetitions).split(/\s+/).slice(0, additionalWords).join(' ');
        } else if (currentWords > wordCount) {
          // Trim to target word count
          const words = responseText.split(/\s+/);
          responseText = words.slice(0, wordCount).join(' ');
        }
        
        // Set time within the day (9 AM to 9 PM)
        const hours = 9 + Math.floor(Math.random() * 12);
        const minutes = Math.floor(Math.random() * 60);
        sessionDate.setHours(hours, minutes, Math.floor(Math.random() * 60), 0);
        
        writingSessionsData.push({
          sessionType,
          prompt,
          response: responseText,
          wordCount,
          timeSpentSeconds: timeSpent,
          clarityScore: Math.max(40, Math.min(100, clarityScore)),
          professionalismScore: Math.max(40, Math.min(100, professionalismScore)),
          structureScore: Math.max(40, Math.min(100, structureScore)),
          storytellingScore: Math.max(40, Math.min(100, storytellingScore)),
          sessionDate: sessionDate.toISOString(),
          isCompleted: true,
        });
      }
    }
    
    // Insert writing practice sessions
    for (const session of writingSessionsData) {
      const avgScore = Math.round(
        (session.clarityScore + session.professionalismScore + 
         session.structureScore + session.storytellingScore) / 4
      );
      
      await database.query(
        `INSERT INTO writing_practice_sessions (
          id, user_id, session_type, prompt, response, response_text, word_count, 
          time_spent_seconds, clarity_score, professionalism_score,
          structure_score, storytelling_score, session_date, is_completed,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, $11, $11
        )`,
        [
          userId,
          session.sessionType,
          session.prompt,
          session.response,
          session.wordCount,
          session.timeSpentSeconds,
          session.clarityScore,
          session.professionalismScore,
          session.structureScore,
          session.storytellingScore,
          session.sessionDate,
          session.isCompleted,
        ]
      );
    }
    
    console.log(`   ✓ Created ${writingSessionsData.length} writing practice sessions over the last 30 days`);
    console.log(`     - Sessions show improving trend (scores increase over time)`);
    console.log(`     - Mix of interview responses, thank-you notes, and follow-ups`);
    console.log(`     - Realistic word counts and time spent per session`);

    // Step 13: Create resumes
    console.log("\n📝 Step 13: Creating resumes...");
    const resumesData = [
      {
        versionName: "Sarah Chen Resume 2024",
        name: "Current Resume",
        description: "Current resume - Software Engineering focus",
        file: "/uploads/resumes/Sarah_Chen_Resume_2024.pdf",
        isMaster: true,
      },
      {
        versionName: "Backend-Focused Resume",
        name: "Backend Resume",
        description: "Backend-focused resume variant",
        file: "/uploads/resumes/Sarah_Chen_Resume_Backend.pdf",
        isMaster: false,
      },
      {
        versionName: "Full-Stack Developer Resume",
        name: "Full-Stack Resume",
        description: "Full-stack developer resume",
        file: "/uploads/resumes/Sarah_Chen_Resume_Full_Stack.pdf",
        isMaster: false,
      },
    ];

    const resumeIds = [];
    for (const resume of resumesData) {
      const result = await database.query(
        `INSERT INTO resume (id, user_id, version_name, name, description, file, is_master, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          userId,
          resume.versionName,
          resume.name,
          resume.description,
          resume.file,
          resume.isMaster || false,
        ]
      );
      resumeIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${resumesData.length} resume records`);

    // Step 14: Create cover letters
    console.log("\n📝 Step 14: Creating cover letters...");
    const coverLettersData = [
      {
        versionName: "Meta - Senior Software Engineer",
        description: "Cover letter for Meta position",
        content: `Dear Hiring Manager,

I am writing to express my strong interest in the Senior Software Engineer position at Meta. With over 5 years of experience in full-stack development and a passion for building scalable systems, I am excited about the opportunity to contribute to Meta's innovative products.

In my current role at LinkedIn, I have led the development of distributed systems serving millions of users, improved system performance by 40%, and mentored junior developers. My expertise in React, Node.js, and cloud architecture aligns perfectly with Meta's technology stack.

I am particularly drawn to Meta's mission of connecting people globally and would be thrilled to help shape the future of social technology.

Thank you for considering my application.

Best regards,
Sarah Chen`,
        jobId: jobOppIds[0], // Meta
      },
      {
        versionName: "Amazon - SDE II",
        description: "Cover letter for Amazon SDE II position",
        content: `Dear Amazon Recruiting Team,

I am excited to apply for the Software Development Engineer II position at Amazon. Your commitment to innovation and customer obsession resonates deeply with my professional values.

Throughout my career, I have focused on building reliable, scalable systems. At LinkedIn, I designed and implemented microservices architecture that reduced latency by 35% and improved system reliability. My experience with AWS, distributed systems, and data structures would allow me to contribute meaningfully to Amazon's engineering culture.

I am eager to join a team that solves complex technical challenges while maintaining high standards of quality and customer focus.

Sincerely,
Sarah Chen`,
        jobId: jobOppIds[1], // Amazon
      },
      {
        versionName: "Google - Software Engineer L4",
        description: "Cover letter for Google position",
        content: `Dear Google Hiring Committee,

I am writing to apply for the Software Engineer L4 position at Google. As a software engineer passionate about solving complex problems and building products that impact billions of users, Google represents an ideal environment for my career growth.

My experience includes developing high-performance backend systems, optimizing algorithms for scale, and contributing to open-source projects. I am particularly interested in Google's work in distributed systems and machine learning infrastructure.

I am confident that my technical skills, problem-solving ability, and collaborative approach would make me a valuable addition to your team.

Best regards,
Sarah Chen`,
        jobId: jobOppIds[4], // Google
      },
      {
        versionName: "General Purpose Cover Letter",
        description: "Template cover letter for software engineering roles",
        content: `Dear Hiring Manager,

I am writing to express my interest in software engineering opportunities at your company. With a strong background in full-stack development, system design, and cloud technologies, I am excited about the possibility of contributing to your team.

My experience includes leading technical projects, mentoring developers, and delivering scalable solutions that drive business impact. I am particularly interested in roles that allow me to work on challenging problems while collaborating with talented engineers.

Thank you for your consideration. I look forward to discussing how I can contribute to your team.

Sincerely,
Sarah Chen`,
        jobId: null,
      },
    ];

    const coverLetterIds = [];
    for (const coverLetter of coverLettersData) {
      const result = await database.query(
        `INSERT INTO coverletter (id, user_id, version_name, description, content, job_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          userId,
          coverLetter.versionName,
          coverLetter.description,
          coverLetter.content,
          coverLetter.jobId || null,
        ]
      );
      coverLetterIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${coverLettersData.length} cover letters (3 job-specific, 1 general)`);

    // Step 14.5: Link job opportunities to resumes and cover letters
    console.log("\n📝 Step 14.5: Linking job opportunities to resumes and cover letters...");
    
    // Link Meta job (index 0) to first resume and first cover letter
    if (jobOppIds[0] && resumeIds[0] && coverLetterIds[0]) {
      await database.query(
        `UPDATE job_opportunities 
         SET resume_id = $1, coverletter_id = $2 
         WHERE id = $3`,
        [resumeIds[0], coverLetterIds[0], jobOppIds[0]]
      );
    }
    
    // Link Amazon job (index 1) to second resume and second cover letter
    if (jobOppIds[1] && resumeIds[1] && coverLetterIds[1]) {
      await database.query(
        `UPDATE job_opportunities 
         SET resume_id = $1, coverletter_id = $2 
         WHERE id = $3`,
        [resumeIds[1], coverLetterIds[1], jobOppIds[1]]
      );
    }
    
    // Link Google job (index 4) to first resume and third cover letter
    if (jobOppIds[4] && resumeIds[0] && coverLetterIds[2]) {
      await database.query(
        `UPDATE job_opportunities 
         SET resume_id = $1, coverletter_id = $2 
         WHERE id = $3`,
        [resumeIds[0], coverLetterIds[2], jobOppIds[4]]
      );
    }
    
    console.log(`   ✓ Linked 3 job opportunities to resumes and cover letters`);

    // Step 15: Create professional contacts
    console.log("\n📝 Step 15: Creating professional contacts...");
    const contactsData = [
      {
        firstName: "Alex",
        lastName: "Thompson",
        email: "alex.thompson@techcorp.com",
        phone: "+1 (415) 555-0100",
        company: "LinkedIn",
        jobTitle: "Senior Software Engineer",
        industry: "Technology",
        location: "Sunnyvale, CA",
        relationshipType: "Colleague",
        relationshipStrength: "Strong",
        relationshipContext: "Former coworker from previous role",
        linkedinUrl: "https://linkedin.com/in/alexthompson",
      },
      {
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria.garcia@google.com",
        phone: "+1 (650) 555-0101",
        company: "Uber",
        jobTitle: "Engineering Manager",
        industry: "Technology",
        location: "San Francisco, CA",
        relationshipType: "Mentor",
        relationshipStrength: "Very Strong",
        relationshipContext: "Met at tech conference, became mentor",
        linkedinUrl: "https://linkedin.com/in/mariagarcia",
      },
      {
        firstName: "James",
        lastName: "Wilson",
        email: "james.wilson@salesforce.com",
        phone: "+1 (415) 555-0102",
        company: "Salesforce",
        jobTitle: "Technical Recruiter",
        industry: "Technology",
        location: "San Francisco, CA",
        relationshipType: "Recruiter",
        relationshipStrength: "Medium",
        relationshipContext: "Connected through LinkedIn",
        linkedinUrl: "https://linkedin.com/in/jameswilson",
      },
      {
        firstName: "Priya",
        lastName: "Patel",
        email: "priya.patel@oracle.com",
        phone: "+1 (512) 555-0103",
        company: "Oracle",
        jobTitle: "Software Development Manager",
        industry: "Technology",
        location: "Austin, TX",
        relationshipType: "Industry Contact",
        relationshipStrength: "Weak",
        relationshipContext: "Met at cloud computing conference",
        linkedinUrl: "https://linkedin.com/in/priyapatel",
      },
      {
        firstName: "Robert",
        lastName: "Chen",
        email: "robert.chen@adobe.com",
        phone: "+1 (408) 555-0104",
        company: "Adobe",
        jobTitle: "Senior Software Engineer",
        industry: "Technology",
        location: "San Jose, CA",
        relationshipType: "College Classmate",
        relationshipStrength: "Strong",
        relationshipContext: "University computer science program",
        linkedinUrl: "https://linkedin.com/in/robertchen",
      },
      {
        firstName: "Lisa",
        lastName: "Anderson",
        email: "lisa.anderson@nvidia.com",
        phone: "+1 (408) 555-0105",
        company: "Nvidia",
        jobTitle: "Backend Engineer",
        industry: "Technology",
        location: "Santa Clara, CA",
        relationshipType: "Industry Contact",
        relationshipStrength: "Medium",
        relationshipContext: "Met through mutual connections",
        linkedinUrl: "https://linkedin.com/in/lisaanderson",
      },
      {
        firstName: "David",
        lastName: "Martinez",
        email: "david.martinez@stripe.com",
        phone: "+1 (415) 555-0106",
        company: "Stripe",
        jobTitle: "Principal Software Engineer",
        industry: "Technology",
        location: "San Francisco, CA",
        relationshipType: "Mentor",
        relationshipStrength: "Very Strong",
        relationshipContext: "Former manager, stayed in touch",
        linkedinUrl: "https://linkedin.com/in/davidmartinez",
      },
      {
        firstName: "Jennifer",
        lastName: "Lee",
        email: "jennifer.lee@startup.io",
        phone: "+1 (510) 555-0107",
        company: "StartupIO",
        jobTitle: "CTO",
        industry: "Technology",
        location: "Oakland, CA",
        relationshipType: "Alumni",
        relationshipStrength: "Medium",
        relationshipContext: "Same university, different years",
        linkedinUrl: "https://linkedin.com/in/jenniferlee",
      },
    ];

    const contactIds = [];
    for (const contact of contactsData) {
      const contactId = uuidv4();
      await database.query(
        `INSERT INTO professional_contacts (
          id, user_id, first_name, last_name, email, phone, company,
          job_title, industry, location, relationship_type, relationship_strength,
          relationship_context, linkedin_url, created_at, updated_at
        )
        VALUES ($14, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          contact.firstName,
          contact.lastName,
          contact.email,
          contact.phone,
          contact.company,
          contact.jobTitle,
          contact.industry,
          contact.location,
          contact.relationshipType,
          contact.relationshipStrength,
          contact.relationshipContext,
          contact.linkedinUrl,
          contactId,
        ]
      );
      contactIds.push(contactId);
    }
    console.log(`   ✓ Created ${contactsData.length} professional contacts`);
    console.log(`     - Mix of recruiters, mentors, colleagues, and industry contacts`);
    console.log(`     - Contacts from top tech companies`);

    // Step 15.5: Create coffee chats with contacts
    console.log("\n📝 Step 15.5: Creating coffee chats with contacts...");
    const coffeeChatsData = [
      {
        contactId: contactIds[1], // Maria Garcia at Uber
        contactName: "Maria Garcia",
        contactEmail: "maria.garcia@uber.com",
        contactCompany: "Uber",
        contactTitle: "Engineering Manager",
        chatType: "coffee_chat",
        scheduledDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "upcoming",
        messageSent: true,
        messageSentAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        responseReceived: true,
        responseReceivedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        responseContent: "Would love to meet! Let's schedule for next week.",
      },
      {
        contactId: contactIds[0], // Alex Thompson
        contactName: "Alex Thompson",
        contactEmail: "alex.thompson@linkedin.com",
        contactCompany: "LinkedIn",
        contactTitle: "Senior Software Engineer",
        chatType: "coffee_chat",
        scheduledDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        completedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: "completed",
        messageSent: true,
        messageSentAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        responseReceived: true,
        responseReceivedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
        referralProvided: true,
        referralDetails: "Referred to Meta recruiter Sarah Johnson",
        notes: "Great conversation about distributed systems. Very helpful!",
      },
      {
        contactId: contactIds[4], // Robert Chen at Adobe
        contactName: "Robert Chen",
        contactEmail: "robert.chen@adobe.com",
        contactCompany: "Adobe",
        contactTitle: "Senior Software Engineer",
        chatType: "informational",
        scheduledDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: "upcoming",
        messageSent: false,
      },
      {
        contactId: contactIds[2], // James Wilson - Salesforce recruiter
        contactName: "James Wilson",
        contactEmail: "james.wilson@meta.com",
        contactCompany: "Meta",
        contactTitle: "Technical Recruiter",
        jobOpportunityId: jobOppIds[0], // Meta job
        chatType: "interview_request",
        scheduledDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        completedDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        status: "completed",
        messageSent: true,
        messageSentAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        responseReceived: true,
        responseReceivedAt: new Date(now.getTime() - 33 * 24 * 60 * 60 * 1000),
        notes: "Initial screening call went well. Moved to next round.",
        impactOnOpportunity: "positive",
      },
    ];

    const coffeeChatIds = [];
    for (const chat of coffeeChatsData) {
      const result = await database.query(
        `INSERT INTO coffee_chats (
          id, user_id, contact_id, job_opportunity_id, contact_name, contact_email,
          contact_company, contact_title, chat_type, scheduled_date, completed_date,
          status, message_sent, message_sent_at, response_received, response_received_at,
          response_content, referral_provided, referral_details, notes, impact_on_opportunity,
          created_at, updated_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          userId,
          chat.contactId || null,
          chat.jobOpportunityId || null,
          chat.contactName,
          chat.contactEmail || null,
          chat.contactCompany || null,
          chat.contactTitle || null,
          chat.chatType,
          chat.scheduledDate ? chat.scheduledDate.toISOString() : null,
          chat.completedDate ? chat.completedDate.toISOString() : null,
          chat.status,
          chat.messageSent || false,
          chat.messageSentAt ? chat.messageSentAt.toISOString() : null,
          chat.responseReceived || false,
          chat.responseReceivedAt ? chat.responseReceivedAt.toISOString() : null,
          chat.responseContent || null,
          chat.referralProvided || false,
          chat.referralDetails || null,
          chat.notes || null,
          chat.impactOnOpportunity || null,
        ]
      );
      coffeeChatIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${coffeeChatsData.length} coffee chats`);
    console.log(`     - Mix of upcoming and completed chats`);
    console.log(`     - Some with responses and referrals`);

    // Step 15.6: Create networking messages (conversations with recruiters)
    console.log("\n📝 Step 15.6: Creating networking messages (conversations with recruiters)...");
    const networkingMessagesData = [
      {
        coffeeChatId: coffeeChatIds[0], // Maria Garcia coffee chat
        messageType: "coffee_chat",
        recipientName: "Maria Garcia",
        recipientEmail: "maria.garcia@google.com",
        recipientLinkedInUrl: "https://linkedin.com/in/mariagarcia",
        subject: "Coffee Chat Request - Software Engineering Discussion",
        messageBody: `Hi Maria,

I hope this message finds you well! I'm reaching out because I'd love to have a coffee chat to learn more about your experience as an Engineering Manager at Uber and get some insights into the industry.

I'm currently exploring opportunities in software engineering and would really value your perspective. Would you be available for a virtual coffee chat next week?

Looking forward to connecting!

Best regards,
Sarah Chen`,
        generatedBy: "manual",
        sent: true,
        sentAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        responseReceived: true,
        responseReceivedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        coffeeChatId: coffeeChatIds[2], // James Wilson conversation
        messageType: "interview_request",
        recipientName: "James Wilson",
        recipientEmail: "james.wilson@meta.com",
        recipientLinkedInUrl: "https://linkedin.com/in/jameswilson",
        subject: "Following up on Senior Software Engineer position at Meta",
        messageBody: `Hi James,

Thank you for taking the time to speak with me last week about the Senior Software Engineer position at Meta. I'm very excited about the opportunity and wanted to follow up.

I've submitted my application and would love to continue the conversation about how my background in distributed systems and full-stack development aligns with the role.

Please let me know if you need any additional information from me.

Best regards,
Sarah Chen`,
        generatedBy: "manual",
        sent: true,
        sentAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        responseReceived: true,
        responseReceivedAt: new Date(now.getTime() - 33 * 24 * 60 * 60 * 1000),
      },
      {
        coffeeChatId: null,
        messageType: "coffee_chat",
        recipientName: "Priya Patel",
        recipientEmail: "priya.patel@oracle.com",
        recipientLinkedInUrl: "https://linkedin.com/in/priyapatel",
        subject: "Networking - Cloud Computing Conference Connection",
        messageBody: `Hi Priya,

It was great meeting you at the cloud computing conference last month! I wanted to reach out and connect.

I'm currently exploring software engineering opportunities and would love to learn more about your experience at Oracle. Would you be open to a brief coffee chat?

Best,
Sarah Chen`,
        generatedBy: "manual",
        sent: true,
        sentAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        responseReceived: false,
      },
      {
        coffeeChatId: null,
        messageType: "referral_request",
        recipientName: "David Martinez",
        recipientEmail: "david.martinez@stripe.com",
        recipientLinkedInUrl: "https://linkedin.com/in/davidmartinez",
        subject: "Referral Request - Stripe Opportunities",
        messageBody: `Hi David,

I hope you're doing well! I wanted to reach out because I saw a Senior Backend Engineer position at Stripe that really interests me.

Given our previous working relationship and your knowledge of my technical skills, I was wondering if you'd be comfortable providing a referral or introduction to the hiring manager.

I'd be happy to share my resume and discuss my qualifications further. Let me know if this is something you'd be open to!

Thank you for your consideration.

Best regards,
Sarah Chen`,
        generatedBy: "manual",
        sent: true,
        sentAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        responseReceived: true,
        responseReceivedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const message of networkingMessagesData) {
      await database.query(
        `INSERT INTO networking_messages (
          id, user_id, coffee_chat_id, message_type, recipient_name, recipient_email,
          recipient_linkedin_url, subject, message_body, generated_by, sent, sent_at,
          response_received, response_received_at, created_at, updated_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          message.coffeeChatId || null,
          message.messageType,
          message.recipientName,
          message.recipientEmail || null,
          message.recipientLinkedInUrl || null,
          message.subject || null,
          message.messageBody,
          message.generatedBy,
          message.sent || false,
          message.sentAt ? message.sentAt.toISOString() : null,
          message.responseReceived || false,
          message.responseReceivedAt ? message.responseReceivedAt.toISOString() : null,
        ]
      );
    }
    console.log(`   ✓ Created ${networkingMessagesData.length} networking messages`);
    console.log(`     - Conversations with recruiters and contacts`);
    console.log(`     - Mix of sent/received status and message types`);

    // Step 16: Create career goals
    console.log("\n📝 Step 16: Creating career goals...");
    const goalsData = [
      {
        goalType: "Application",
        goalCategory: "Job Search",
        goalDescription: "Apply to 25+ software engineering positions",
        specificMetric: "Number of applications",
        targetValue: 25,
        currentValue: jobOpportunities.length,
        targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        status: "active",
      },
      {
        goalType: "Interview",
        goalCategory: "Interview Performance",
        goalDescription: "Complete 15 technical interviews with 70%+ pass rate",
        specificMetric: "Interview pass rate",
        targetValue: 70,
        currentValue: 65,
        targetDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
        status: "active",
      },
      {
        goalType: "Offer",
        goalCategory: "Job Search",
        goalDescription: "Receive 3+ job offers from top tech companies",
        specificMetric: "Number of offers",
        targetValue: 3,
        currentValue: 2, // Meta and Amazon already have "Offer" status
        targetDate: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000), // 150 days from now
        status: "active",
      },
      {
        goalType: "Salary",
        goalCategory: "Compensation",
        goalDescription: "Negotiate starting salary of $200K+",
        specificMetric: "Starting salary (USD)",
        targetValue: 200000,
        currentValue: 190000,
        targetDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
        status: "active",
      },
      {
        goalType: "Networking",
        goalCategory: "Professional Growth",
        goalDescription: "Connect with 50+ professionals in the tech industry",
        specificMetric: "Number of connections",
        targetValue: 50,
        currentValue: contactsData.length + 10, // Contacts plus some network
        targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        status: "active",
      },
      {
        goalType: "Coffee Chat",
        goalCategory: "Networking",
        goalDescription: "Complete 10 informational interviews or coffee chats",
        specificMetric: "Number of coffee chats",
        targetValue: 10,
        currentValue: 3,
        targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        status: "active",
      },
      {
        goalType: "Skill",
        goalCategory: "Professional Development",
        goalDescription: "Master system design concepts and pass design interviews",
        specificMetric: "System design interview pass rate",
        targetValue: 80,
        currentValue: 75,
        targetDate: new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000), // 100 days from now
        status: "active",
      },
    ];

    for (const goal of goalsData) {
      const progressPercentage = Math.min(
        100,
        Math.round((goal.currentValue / goal.targetValue) * 100)
      );
      
      await database.query(
        `INSERT INTO career_goals (
          id, user_id, goal_type, goal_category, goal_description, specific_metric,
          target_value, current_value, target_date, progress_percentage, status,
          created_at, updated_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          goal.goalType,
          goal.goalCategory,
          goal.goalDescription,
          goal.specificMetric,
          goal.targetValue,
          goal.currentValue,
          goal.targetDate.toISOString().split("T")[0],
          progressPercentage,
          goal.status,
        ]
      );
    }
    console.log(`   ✓ Created ${goalsData.length} career goals`);
    console.log(`     - Mix of application, interview, offer, salary, networking, and skill goals`);
    console.log(`     - Goals show realistic progress and target dates`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ SUCCESS! Test user created with complete data");
    console.log("=".repeat(60));
    console.log("\n📧 Login Credentials:");
    console.log(`   Email: ${TEST_USER_EMAIL}`);
    console.log(`   Password: ${TEST_USER_PASSWORD}`);
    console.log("\n📊 Created Data:");
    console.log(`   ✓ 1 Profile (Sarah Chen)`);
    console.log(`   ✓ ${skills.length} Skills`);
    console.log(`   ✓ 2 Education entries`);
    console.log(`   ✓ ${jobs.length} Jobs`);
    console.log(`   ✓ ${projects.length} Projects`);
    console.log(`   ✓ ${certifications.length} Certifications`);
    console.log(`   ✓ ${jobOpportunities.length} Job Opportunities (MAANG + Salesforce, Oracle, Adobe, Nvidia, Uber, Stripe, Airbnb, Palantir, Databricks, Snowflake)`);
    console.log(`     - 3 with "Offer" status for salary negotiation testing`);
    console.log(`     - All with recruiter contact information`);
    console.log(`     - 3 linked to resumes and cover letters`);
    console.log(`   ✓ ${resumeIds.length} Resumes (with master resume)`);
    console.log(`   ✓ ${coverLetterIds.length} Cover Letters (3 job-specific, 1 general)`);
    console.log(`   ✓ ${contactsData.length} Professional Contacts`);
    console.log(`   ✓ ${coffeeChatsData.length} Coffee Chats (upcoming and completed)`);
    console.log(`   ✓ ${networkingMessagesData.length} Networking Messages (conversations with recruiters)`);
    console.log(`   ✓ ${goalsData.length} Career Goals (application, interview, offer, salary, networking, skills)`);
    console.log(`   ✓ ${allInterviewsData.length} Interviews:`);
    console.log(`     - ${practiceInterviewsData.length} practice interviews`);
    console.log(`     - ${pastInterviewsData.length} past completed interviews`);
    console.log(`     - ${scheduledInterviewsData.length} scheduled future interviews with real companies`);
    console.log(`   ✓ ${feedbackData.length} Interview Feedback entries`);
    console.log(`   ✓ ${salaryNegotiationsData.length} Salary Negotiations:`);
    console.log(`     - 2 active negotiations (Meta, Amazon)`);
    console.log(`     - 1 completed negotiation (Apple - accepted)`);
    console.log(`   ✓ ${writingSessionsData.length} Writing Practice Sessions (last 30 days)`);
    console.log(`     - Shows improving trends over time`);
    console.log(`     - Mix of interview responses, thank-you notes, and follow-ups`);
    console.log("\n🎯 This user is ready to test:");
    console.log("   - Interview Analytics (navigate to Interview Analytics page)");
    console.log("   - Salary Negotiation (navigate to Salary Negotiation page)");
    console.log("   - Writing Practice with trends and charts (last month of data)\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating test user:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
createTestUser();

