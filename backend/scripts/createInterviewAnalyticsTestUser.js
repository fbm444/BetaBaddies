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

    // Step 3: Add skills
    console.log("\n📝 Step 3: Adding skills...");
    const skills = [
      { skillName: "JavaScript", proficiency: "Expert", category: "Languages" },
      { skillName: "Python", proficiency: "Advanced", category: "Languages" },
      { skillName: "React", proficiency: "Expert", category: "Technical" },
      { skillName: "Node.js", proficiency: "Advanced", category: "Technical" },
      { skillName: "System Design", proficiency: "Intermediate", category: "Technical" },
      { skillName: "Algorithms", proficiency: "Advanced", category: "Technical" },
      { skillName: "REST APIs", proficiency: "Expert", category: "Technical" },
      { skillName: "PostgreSQL", proficiency: "Advanced", category: "Technical" },
      { skillName: "AWS", proficiency: "Intermediate", category: "Technical" },
      { skillName: "Docker", proficiency: "Intermediate", category: "Technical" },
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

    // Step 6: Add projects
    console.log("\n📝 Step 6: Adding projects...");
    const projects = [
      {
        name: "E-Commerce Platform",
        description: "Built scalable e-commerce platform using React and Node.js, handling 10K+ concurrent users",
        start_date: "2021-01-01",
        end_date: "2021-06-30",
        technologies: "React, Node.js, PostgreSQL, AWS",
        status: "Completed",
      },
      {
        name: "Real-time Chat Application",
        description: "Developed real-time messaging app with WebSocket support",
        start_date: "2020-08-01",
        end_date: "2020-12-31",
        technologies: "React, Node.js, Socket.io, MongoDB",
        status: "Completed",
      },
      {
        name: "AI Recommendation System",
        description: "Machine learning recommendation engine for personalized content",
        start_date: "2022-03-01",
        end_date: null,
        technologies: "Python, TensorFlow, PostgreSQL",
        status: "Ongoing",
      },
    ];

    for (const project of projects) {
      await database.query(
        `INSERT INTO projects (id, user_id, name, description, start_date, end_date, technologies, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          project.name,
          project.description,
          project.start_date,
          project.end_date,
          project.technologies,
          project.status,
        ]
      );
    }
    console.log(`   ✓ Added ${projects.length} projects`);

    // Step 7: Add certifications
    console.log("\n📝 Step 7: Adding certifications...");
    await database.query(
      `INSERT INTO certifications (id, user_id, name, org_name, date_earned, never_expires, expiration_date)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
      [
        userId,
        "AWS Certified Solutions Architect",
        "Amazon Web Services",
        "2022-05-15",
        false,
        "2025-05-15",
      ]
    );
    console.log("   ✓ Added 1 certification");

    // Step 8: Create job opportunities (needed for interviews)
    console.log("\n📝 Step 8: Creating job opportunities...");
    const jobOpportunities = [
      {
        title: "Senior Software Engineer",
        company: "BigTech Inc",
        location: "Seattle, WA",
        industry: "Big Tech",
        status: "Interview",
      },
      {
        title: "Full Stack Developer",
        company: "FinTech Corp",
        location: "San Francisco, CA",
        industry: "FinTech",
        status: "Interview",
      },
      {
        title: "Backend Engineer",
        company: "StartupABC",
        location: "Austin, TX",
        industry: "Startups",
        status: "Interview",
      },
      {
        title: "Software Engineer",
        company: "CloudServices Co",
        location: "Remote",
        industry: "Cloud Services",
        status: "Interview",
      },
    ];

    const jobOppIds = [];
    for (const jobOpp of jobOpportunities) {
      const result = await database.query(
        `INSERT INTO job_opportunities (id, user_id, title, company, location, industry, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          userId,
          jobOpp.title,
          jobOpp.company,
          jobOpp.location,
          jobOpp.industry,
          jobOpp.status,
        ]
      );
      jobOppIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${jobOpportunities.length} job opportunities`);

    // Step 9: Create interviews with different formats and outcomes (including practice)
    console.log("\n📝 Step 9: Creating interviews...");
    
    // Calculate dates - spread interviews over the past 12 months
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
    
    const interviewsData = [
      {
        jobOpportunityId: jobOppIds[0],
        interviewType: "phone",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000), // 11 months ago
        duration: 30,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[0],
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 10 * 30 * 24 * 60 * 60 * 1000), // 10 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[0],
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 9 * 30 * 24 * 60 * 60 * 1000), // 9 months ago
        duration: 45,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[1],
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 8 * 30 * 24 * 60 * 60 * 1000), // 8 months ago
        duration: 60,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[1],
        interviewType: "in-person",
        format: "on_site",
        scheduledAt: new Date(now.getTime() - 7 * 30 * 24 * 60 * 60 * 1000), // 7 months ago
        duration: 180,
        status: "completed",
        outcome: "rejected",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[1],
        interviewType: "video",
        format: "system_design",
        scheduledAt: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
        duration: 90,
        status: "completed",
        outcome: "rejected",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[2],
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 5 * 30 * 24 * 60 * 60 * 1000), // 5 months ago
        duration: 60,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[2],
        interviewType: "video",
        format: "behavioral",
        scheduledAt: new Date(now.getTime() - 4 * 30 * 24 * 60 * 60 * 1000), // 4 months ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[3],
        interviewType: "video",
        format: "phone_screen",
        scheduledAt: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000), // 3 months ago
        duration: 30,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[3],
        interviewType: "video",
        format: "technical",
        scheduledAt: new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000), // 2 months ago
        duration: 60,
        status: "completed",
        outcome: "offer_extended",
        isPractice: false,
      },
      {
        jobOpportunityId: jobOppIds[3],
        interviewType: "video",
        format: "hirevue",
        scheduledAt: new Date(now.getTime() - 1 * 30 * 24 * 60 * 60 * 1000), // 1 month ago
        duration: 45,
        status: "completed",
        outcome: "passed",
        isPractice: false,
      },
    ];
    
    // Combine practice and real interviews
    const allInterviewsData = [...practiceInterviewsData, ...interviewsData];

    const interviewIds = [];
    for (const interviewData of allInterviewsData) {
      // Insert interview - handle both date and scheduled_at columns
      const scheduledAtISO = interviewData.scheduledAt.toISOString();
      const result = await database.query(
        `INSERT INTO interviews (id, user_id, job_opportunity_id, type, format, scheduled_at, date, duration, status, outcome, is_practice)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          userId,
          interviewData.jobOpportunityId,
          interviewData.interviewType,
          interviewData.format,
          scheduledAtISO,
          scheduledAtISO, // Also set date column for compatibility
          interviewData.duration,
          interviewData.status,
          interviewData.outcome,
          interviewData.isPractice || false,
        ]
      );
      interviewIds.push(result.rows[0].id);
    }
    console.log(`   ✓ Created ${allInterviewsData.length} interviews (${practiceInterviewsData.length} practice, ${interviewsData.length} real)`);

    // Step 10: Create interview feedback with skill area scores
    console.log("\n📝 Step 10: Creating interview feedback...");
    
    // Create feedback entries that show improvement over time
    // Earlier interviews have lower scores, later ones have higher scores
    // Note: Practice interviews are at indices 0-1, real interviews start at index 2
    const practiceCount = practiceInterviewsData.length;
    const feedbackData = [
      // Real Interview 0 (11 months ago) - Phone screen - Offer
      { interviewId: interviewIds[practiceCount + 0], skillArea: "behavioral", score: 55 },
      
      // Real Interview 1 (10 months ago) - Technical - Passed
      { interviewId: interviewIds[practiceCount + 1], skillArea: "algorithms", score: 60 },
      { interviewId: interviewIds[practiceCount + 1], skillArea: "system_design", score: 65 },
      
      // Real Interview 2 (9 months ago) - Behavioral - Offer
      { interviewId: interviewIds[practiceCount + 2], skillArea: "behavioral", score: 65 },
      
      // Real Interview 3 (8 months ago) - Technical - Passed
      { interviewId: interviewIds[practiceCount + 3], skillArea: "algorithms", score: 70 },
      { interviewId: interviewIds[practiceCount + 3], skillArea: "apis", score: 75 },
      
      // Real Interview 4 (7 months ago) - On-site - Rejected (lower scores)
      { interviewId: interviewIds[practiceCount + 4], skillArea: "behavioral", score: 45 },
      { interviewId: interviewIds[practiceCount + 4], skillArea: "system_design", score: 50 },
      { interviewId: interviewIds[practiceCount + 4], skillArea: "time_management", score: 40 },
      
      // Real Interview 5 (6 months ago) - System design - Rejected
      { interviewId: interviewIds[practiceCount + 5], skillArea: "system_design", score: 55 },
      
      // Real Interview 6 (5 months ago) - Technical - Offer (better scores)
      { interviewId: interviewIds[practiceCount + 6], skillArea: "algorithms", score: 80 },
      { interviewId: interviewIds[practiceCount + 6], skillArea: "system_design", score: 75 },
      
      // Real Interview 7 (4 months ago) - Behavioral - Passed
      { interviewId: interviewIds[practiceCount + 7], skillArea: "behavioral", score: 75 },
      
      // Real Interview 8 (3 months ago) - Phone screen - Passed
      { interviewId: interviewIds[practiceCount + 8], skillArea: "behavioral", score: 70 },
      
      // Real Interview 9 (2 months ago) - Technical - Offer (great scores)
      { interviewId: interviewIds[practiceCount + 9], skillArea: "algorithms", score: 85 },
      { interviewId: interviewIds[practiceCount + 9], skillArea: "system_design", score: 80 },
      { interviewId: interviewIds[practiceCount + 9], skillArea: "apis", score: 85 },
      
      // Real Interview 10 (1 month ago) - HireVue - Passed
      { interviewId: interviewIds[practiceCount + 10], skillArea: "behavioral", score: 80 },
      { interviewId: interviewIds[practiceCount + 10], skillArea: "time_management", score: 75 },
    ];

    // Add notes for theme analysis (using real interview IDs)
    const feedbackNotes = {
      [interviewIds[practiceCount + 0]]: "Great communication and clear explanation of experience",
      [interviewIds[practiceCount + 1]]: "Strong technical depth, excellent problem solving approach",
      [interviewIds[practiceCount + 4]]: "Struggled with time management, nervous during the interview",
      [interviewIds[practiceCount + 5]]: "Needs improvement in system design, lack of preparation",
      [interviewIds[practiceCount + 6]]: "Outstanding code quality, confident and well-prepared",
      [interviewIds[practiceCount + 9]]: "Excellent algorithm knowledge, great communication clarity",
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
    
    // Create pre-assessments for real interviews (skip practice interviews)
    const realInterviewIds = interviewIds.slice(practiceInterviewsData.length);
    const preAssessmentsData = [
      { interviewId: realInterviewIds[0], confidence: 60, anxiety: 50, prepHours: 2 },
      { interviewId: realInterviewIds[1], confidence: 65, anxiety: 45, prepHours: 8 },
      { interviewId: realInterviewIds[2], confidence: 70, anxiety: 40, prepHours: 5 },
      { interviewId: realInterviewIds[3], confidence: 68, anxiety: 42, prepHours: 10 },
      { interviewId: realInterviewIds[6], confidence: 75, anxiety: 35, prepHours: 12 },
      { interviewId: realInterviewIds[9], confidence: 80, anxiety: 30, prepHours: 15 },
    ];
    
    for (const assessment of preAssessmentsData) {
      await database.query(
        `INSERT INTO interview_pre_assessment (id, interview_id, user_id, confidence_level, anxiety_level, preparation_hours)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [assessment.interviewId, userId, assessment.confidence, assessment.anxiety, assessment.prepHours]
      );
    }
    
    // Create post-reflections for some interviews
    const postReflectionsData = [
      { interviewId: realInterviewIds[0], postConfidence: 70, postAnxiety: 35, feeling: "great", 
        whatWentWell: "Clear communication, good examples", whatToImprove: "Could be more concise" },
      { interviewId: realInterviewIds[6], postConfidence: 85, postAnxiety: 25, feeling: "great",
        whatWentWell: "Excellent preparation paid off", whatToImprove: "None, performed well" },
      { interviewId: realInterviewIds[9], postConfidence: 88, postAnxiety: 20, feeling: "great",
        whatWentWell: "Strong technical performance", whatToImprove: "Continue current approach" },
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
    console.log(`   ✓ 1 Certification`);
    console.log(`   ✓ ${jobOpportunities.length} Job Opportunities`);
    console.log(`   ✓ ${allInterviewsData.length} Interviews (${practiceInterviewsData.length} practice, ${interviewsData.length} real, spread over 12 months)`);
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

