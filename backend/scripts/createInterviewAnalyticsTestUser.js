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
      await database.query("DELETE FROM interview_feedback WHERE user_id = $1", [userId]);
      await database.query("DELETE FROM interviews WHERE user_id = $1", [userId]);
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
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        start_date: "2020-03-01",
        end_date: null,
        is_current: true,
        description: "Lead development of microservices architecture. Mentored junior developers.",
        salary: 155000,
      },
      {
        title: "Software Engineer",
        company: "StartupXYZ",
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

    // Step 8: Create job opportunities (needed for interviews) - Using real MAANG companies
    console.log("\n📝 Step 8: Creating job opportunities...");
    const jobOpportunities = [
      {
        title: "Senior Software Engineer",
        company: "Meta",
        location: "Menlo Park, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 180000,
        salary_max: 250000,
      },
      {
        title: "Software Development Engineer II",
        company: "Amazon",
        location: "Seattle, WA",
        industry: "Technology",
        status: "Interview",
        salary_min: 175000,
        salary_max: 240000,
      },
      {
        title: "Senior Software Engineer",
        company: "Apple",
        location: "Cupertino, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 190000,
        salary_max: 260000,
      },
      {
        title: "Senior Software Engineer",
        company: "Netflix",
        location: "Los Gatos, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 200000,
        salary_max: 280000,
      },
      {
        title: "Software Engineer L4",
        company: "Google",
        location: "Mountain View, CA",
        industry: "Technology",
        status: "Interview",
        salary_min: 185000,
        salary_max: 255000,
      },
      {
        title: "Senior Backend Engineer",
        company: "Microsoft",
        location: "Redmond, WA",
        industry: "Technology",
        status: "Interview",
        salary_min: 175000,
        salary_max: 245000,
      },
    ];

    const jobOppIds = [];
    for (const jobOpp of jobOpportunities) {
      const result = await database.query(
        `INSERT INTO job_opportunities (id, user_id, title, company, location, industry, status, salary_min, salary_max)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
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
        ]
      );
      jobOppIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${jobOpportunities.length} job opportunities with real MAANG companies`);

    // Step 9: Create interviews with different formats and outcomes (including practice and scheduled)
    console.log("\n📝 Step 9: Creating interviews...");
    
    // Calculate dates - spread interviews over the past 12 months and future dates
    const now = new Date();
    
    // First create some practice interviews
    const practiceInterviewsData = [
      {
        jobOpportunityId: jobOppIds[0],
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000), // 12 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: true,
      },
      {
        jobOpportunityId: jobOppIds[1],
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 11.5 * 30 * 24 * 60 * 60 * 1000), // 11.5 months ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: true,
      },
    ];
    
    // Past completed interviews
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
        jobOpportunityId: jobOppIds[0], // Meta
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 10 * 30 * 24 * 60 * 60 * 1000), // 10 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[0], // Meta
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 9 * 30 * 24 * 60 * 60 * 1000), // 9 months ago
        duration: 45,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[1], // Amazon
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 8 * 30 * 24 * 60 * 60 * 1000), // 8 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[1], // Amazon
        interviewType: "in-person",
        format: "on_site",
        scheduledAt: new Date(now.getTime() - 7 * 30 * 24 * 60 * 60 * 1000), // 7 months ago
        duration: 180,
        status: "completed",
        outcome: "rejected",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[1], // Amazon
        interviewType: "video",
        format: "system_design",
        scheduledAt: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
        duration: 90,
        status: "completed",
        outcome: "rejected",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[2], // Apple
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 5 * 30 * 24 * 60 * 60 * 1000), // 5 months ago
        duration: 60,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[2], // Apple
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 4 * 30 * 24 * 60 * 60 * 1000), // 4 months ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[3], // Netflix
        interviewType: "video",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000), // 3 months ago
        duration: 30,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[3], // Netflix
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000), // 2 months ago
        duration: 60,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[4], // Google
        interviewType: "video",
        format: "hirevue",
        scheduledAt: new Date(now.getTime() - 1 * 30 * 24 * 60 * 60 * 1000), // 1 month ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
    ];

    // Future scheduled interviews with real companies
    const scheduledInterviewsData = [
      {
        jobOpportunityId: jobOppIds[0], // Meta - Technical Round
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "John Smith",
        interviewerEmail: "john.smith@meta.com",
        interviewerTitle: "Senior Engineering Manager",
        videoLink: "https://meet.meta.com/interview-room-123",
        notes: "Focus on system design and algorithms. Review Meta's engineering blog.",
      },
      {
        jobOpportunityId: jobOppIds[0], // Meta - System Design Round
        interviewType: "video",
        format: "system_design",
        scheduledAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        duration: 90,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Sarah Johnson",
        interviewerEmail: "sarah.j@meta.com",
        interviewerTitle: "Staff Engineer",
        videoLink: "https://meet.meta.com/interview-room-456",
        notes: "Prepare for large-scale system design. Review distributed systems concepts.",
      },
      {
        jobOpportunityId: jobOppIds[1], // Amazon - Phone Screen
        interviewType: "phone",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        duration: 30,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Michael Chen",
        interviewerEmail: "mchen@amazon.com",
        interviewerTitle: "Recruiter",
        phoneNumber: "+1-206-555-0123",
        notes: "Initial screening call. Be ready to discuss background and motivation.",
      },
      {
        jobOpportunityId: jobOppIds[1], // Amazon - Technical Round 1
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Emily Rodriguez",
        interviewerEmail: "erodriguez@amazon.com",
        interviewerTitle: "Software Development Manager",
        videoLink: "https://chime.aws.com/interview-789",
        notes: "Coding interview. Focus on data structures and algorithms. Review LeetCode.",
      },
      {
        jobOpportunityId: jobOppIds[2], // Apple - Technical Interview
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "David Kim",
        interviewerEmail: "david.kim@apple.com",
        interviewerTitle: "Senior Software Engineer",
        videoLink: "https://apple.zoom.us/j/interview-abc",
        notes: "Technical deep dive. Review iOS/macOS development if relevant.",
      },
      {
        jobOpportunityId: jobOppIds[2], // Apple - On-site (Virtual)
        interviewType: "video",
        format: "on_site",
        scheduledAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        duration: 240,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Lisa Wang",
        interviewerEmail: "lisa.wang@apple.com",
        interviewerTitle: "Engineering Director",
        videoLink: "https://apple.zoom.us/j/onsite-xyz",
        notes: "Full day virtual on-site. Multiple rounds: technical, behavioral, system design.",
      },
      {
        jobOpportunityId: jobOppIds[3], // Netflix - Technical Round
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Robert Taylor",
        interviewerEmail: "rtaylor@netflix.com",
        interviewerTitle: "Senior Engineer",
        videoLink: "https://netflix.zoom.us/j/tech-123",
        notes: "Focus on scalability and performance. Review Netflix tech blog.",
      },
      {
        jobOpportunityId: jobOppIds[3], // Netflix - System Design
        interviewType: "video",
        format: "system_design",
        scheduledAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
        duration: 90,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Jennifer Martinez",
        interviewerEmail: "jmartinez@netflix.com",
        interviewerTitle: "Principal Engineer",
        videoLink: "https://netflix.zoom.us/j/system-456",
        notes: "Design a scalable video streaming system. Review distributed systems patterns.",
      },
      {
        jobOpportunityId: jobOppIds[4], // Google - Technical Phone Screen
        interviewType: "phone",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        duration: 45,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Alex Thompson",
        interviewerEmail: "alex.thompson@google.com",
        interviewerTitle: "Recruiter",
        phoneNumber: "+1-650-555-0456",
        notes: "Initial technical screening. Prepare for coding questions.",
      },
      {
        jobOpportunityId: jobOppIds[4], // Google - Technical Round 1
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Priya Patel",
        interviewerEmail: "priya.patel@google.com",
        interviewerTitle: "Software Engineer L5",
        videoLink: "https://meet.google.com/abc-defg-hij",
        notes: "Coding interview. Focus on algorithms and problem-solving. Review Google's interview prep guide.",
      },
      {
        jobOpportunityId: jobOppIds[4], // Google - Technical Round 2
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "James Wilson",
        interviewerEmail: "jwilson@google.com",
        interviewerTitle: "Senior Software Engineer",
        videoLink: "https://meet.google.com/xyz-uvwx-rst",
        notes: "Second technical round. May include system design elements.",
      },
      {
        jobOpportunityId: jobOppIds[4], // Google - Behavioral Round
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000), // 13 days from now
        duration: 45,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Maria Garcia",
        interviewerEmail: "maria.garcia@google.com",
        interviewerTitle: "Engineering Manager",
        videoLink: "https://meet.google.com/beh-klmn-opq",
        notes: "Behavioral interview. Prepare STAR method examples. Review Google's leadership principles.",
      },
      {
        jobOpportunityId: jobOppIds[5], // Microsoft - Technical Interview
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
        duration: 60,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Chris Anderson",
        interviewerEmail: "chris.anderson@microsoft.com",
        interviewerTitle: "Senior Software Engineer",
        videoLink: "https://teams.microsoft.com/l/meetup-join/123",
        notes: "Technical interview focusing on problem-solving and code quality.",
      },
      {
        jobOpportunityId: jobOppIds[5], // Microsoft - System Design
        interviewType: "video",
        format: "system_design",
        scheduledAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        duration: 90,
        status: "scheduled",
        outcome: "pending",
        isPractice: false,
        interviewerName: "Amanda Lee",
        interviewerEmail: "amanda.lee@microsoft.com",
        interviewerTitle: "Principal Software Engineer",
        videoLink: "https://teams.microsoft.com/l/meetup-join/456",
        notes: "System design interview. Review Azure architecture and distributed systems.",
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
      interviewIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${allInterviewsData.length} interviews:`);
    console.log(`     - ${practiceInterviewsData.length} practice interviews`);
    console.log(`     - ${pastInterviewsData.length} past completed interviews`);
    console.log(`     - ${scheduledInterviewsData.length} scheduled future interviews with real companies`);

    // Step 10: Create interview feedback with skill area scores
    console.log("\n📝 Step 10: Creating interview feedback...");
    
    // Create feedback entries that show improvement over time
    // Earlier interviews have lower scores, later ones have higher scores
    // Note: Practice interviews are at indices 0-1, past interviews start at index 2, scheduled interviews are at the end
    const practiceCount = practiceInterviewsData.length;
    const pastCount = pastInterviewsData.length;
    const feedbackData = [
      // Past Interview 0 (11 months ago) - Meta Phone screen - Offer
      { interviewId: interviewIds[practiceCount + 0], skillArea: "behavioral", score: 55 },
      
      // Past Interview 1 (10 months ago) - Meta Technical - Passed
      { interviewId: interviewIds[practiceCount + 1], skillArea: "algorithms", score: 60 },
      { interviewId: interviewIds[practiceCount + 1], skillArea: "system_design", score: 65 },
      
      // Past Interview 2 (9 months ago) - Meta Behavioral - Offer
      { interviewId: interviewIds[practiceCount + 2], skillArea: "behavioral", score: 65 },
      
      // Past Interview 3 (8 months ago) - Amazon Technical - Passed
      { interviewId: interviewIds[practiceCount + 3], skillArea: "algorithms", score: 70 },
      { interviewId: interviewIds[practiceCount + 3], skillArea: "apis", score: 75 },
      
      // Past Interview 4 (7 months ago) - Amazon On-site - Rejected (lower scores)
      { interviewId: interviewIds[practiceCount + 4], skillArea: "behavioral", score: 45 },
      { interviewId: interviewIds[practiceCount + 4], skillArea: "system_design", score: 50 },
      { interviewId: interviewIds[practiceCount + 4], skillArea: "time_management", score: 40 },
      
      // Past Interview 5 (6 months ago) - Amazon System design - Rejected
      { interviewId: interviewIds[practiceCount + 5], skillArea: "system_design", score: 55 },
      
      // Past Interview 6 (5 months ago) - Apple Technical - Offer (better scores)
      { interviewId: interviewIds[practiceCount + 6], skillArea: "algorithms", score: 80 },
      { interviewId: interviewIds[practiceCount + 6], skillArea: "system_design", score: 75 },
      
      // Past Interview 7 (4 months ago) - Apple Behavioral - Passed
      { interviewId: interviewIds[practiceCount + 7], skillArea: "behavioral", score: 75 },
      
      // Past Interview 8 (3 months ago) - Netflix Phone screen - Passed
      { interviewId: interviewIds[practiceCount + 8], skillArea: "behavioral", score: 70 },
      
      // Past Interview 9 (2 months ago) - Netflix Technical - Offer (great scores)
      { interviewId: interviewIds[practiceCount + 9], skillArea: "algorithms", score: 85 },
      { interviewId: interviewIds[practiceCount + 9], skillArea: "system_design", score: 80 },
      { interviewId: interviewIds[practiceCount + 9], skillArea: "apis", score: 85 },
      
      // Past Interview 10 (1 month ago) - Google HireVue - Passed
      { interviewId: interviewIds[practiceCount + 10], skillArea: "behavioral", score: 80 },
      { interviewId: interviewIds[practiceCount + 10], skillArea: "time_management", score: 75 },
    ];

    // Add notes for theme analysis (using real interview IDs)
    const feedbackNotes = {
      [interviewIds[practiceCount + 0]]: "Great communication and clear explanation of experience with Meta",
      [interviewIds[practiceCount + 1]]: "Strong technical depth, excellent problem solving approach at Meta",
      [interviewIds[practiceCount + 4]]: "Struggled with time management, nervous during Amazon on-site",
      [interviewIds[practiceCount + 5]]: "Needs improvement in system design, lack of preparation for Amazon",
      [interviewIds[practiceCount + 6]]: "Outstanding code quality, confident and well-prepared for Apple",
      [interviewIds[practiceCount + 9]]: "Excellent algorithm knowledge, great communication clarity at Netflix",
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
    
    // Step 11: Create pre/post assessments for confidence/anxiety tracking
    console.log("\n📝 Step 11: Creating pre/post assessments...");
    
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
        whatWentWell: "Excellent preparation paid off at Apple", whatToImprove: "None, performed well" },
      { interviewId: pastRealInterviewIds[9], postConfidence: 88, postAnxiety: 20, feeling: "great",
        whatWentWell: "Strong technical performance at Netflix", whatToImprove: "Continue current approach" },
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
    console.log(`   ✓ ${jobOpportunities.length} Job Opportunities (Meta, Amazon, Apple, Netflix, Google, Microsoft)`);
    console.log(`   ✓ ${allInterviewsData.length} Interviews:`);
    console.log(`     - ${practiceInterviewsData.length} practice interviews`);
    console.log(`     - ${pastInterviewsData.length} past completed interviews`);
    console.log(`     - ${scheduledInterviewsData.length} scheduled future interviews with real companies`);
    console.log(`   ✓ ${feedbackData.length} Interview Feedback entries`);
    console.log("\n🎯 This user is ready to test Interview Analytics!");
    console.log("   Log in and navigate to the Interview Analytics page.\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating test user:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
createTestUser();

