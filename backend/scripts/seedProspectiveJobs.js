/**
 * Seed script to add mock prospective jobs for testing
 * Run with: node backend/scripts/seedProspectiveJobs.js
 */

import database from "../services/database.js";
import { v4 as uuidv4 } from "uuid";

// Mock prospective jobs data
const mockJobs = [
  {
    jobTitle: "Senior Software Engineer",
    company: "Google",
    location: "Mountain View, CA",
    description: "We are looking for a Senior Software Engineer with expertise in full-stack development, cloud computing, and distributed systems. The ideal candidate will have 5+ years of experience with Java, Python, or Go, and experience with Kubernetes, Docker, and microservices architecture. Strong problem-solving skills and ability to work in a fast-paced environment required.",
    industry: "Technology",
    jobType: "Full-time",
    salaryLow: 150000,
    salaryHigh: 250000,
    stage: "Interested",
    jobUrl: "https://careers.google.com/jobs/results/123456",
  },
  {
    jobTitle: "Full Stack Developer",
    company: "Meta",
    location: "Menlo Park, CA",
    description: "Join our team as a Full Stack Developer working on cutting-edge web applications. Required skills include React, Node.js, TypeScript, and experience with GraphQL. We're looking for someone passionate about building scalable, user-friendly applications. Experience with AWS or similar cloud platforms is a plus.",
    industry: "Technology",
    jobType: "Full-time",
    salaryLow: 120000,
    salaryHigh: 200000,
    stage: "Applied",
    jobUrl: "https://www.metacareers.com/jobs/123456",
  },
  {
    jobTitle: "Software Engineer - Backend",
    company: "Amazon",
    location: "Seattle, WA",
    description: "Amazon is seeking a Software Engineer to join our backend services team. You'll work on high-scale distributed systems using Java, Python, or C++. Experience with AWS services, database design, and system architecture required. Strong communication skills and ability to work in an agile environment essential.",
    industry: "Technology",
    jobType: "Full-time",
    salaryLow: 130000,
    salaryHigh: 220000,
    stage: "Phone Screen",
    jobUrl: "https://www.amazon.jobs/en/jobs/123456",
  },
  {
    jobTitle: "Frontend Engineer",
    company: "Netflix",
    location: "Los Gatos, CA",
    description: "Netflix is looking for a Frontend Engineer to help build the next generation of streaming experiences. You'll work with React, TypeScript, and modern web technologies. Experience with performance optimization, accessibility, and responsive design is crucial. Passion for creating exceptional user experiences required.",
    industry: "Entertainment",
    jobType: "Full-time",
    salaryLow: 140000,
    salaryHigh: 230000,
    stage: "Interested",
    jobUrl: "https://jobs.netflix.com/jobs/123456",
  },
  {
    jobTitle: "DevOps Engineer",
    company: "Microsoft",
    location: "Redmond, WA",
    description: "Microsoft Azure team is hiring a DevOps Engineer to help build and maintain our cloud infrastructure. Required skills include Kubernetes, Docker, Terraform, CI/CD pipelines, and experience with Azure or AWS. Strong scripting skills (Python, Bash) and knowledge of monitoring and logging tools required.",
    industry: "Technology",
    jobType: "Full-time",
    salaryLow: 125000,
    salaryHigh: 210000,
    stage: "Applied",
    jobUrl: "https://careers.microsoft.com/us/en/job/123456",
  },
];

async function seedProspectiveJobs(userId) {
  try {
    console.log(`🌱 Seeding ${mockJobs.length} prospective jobs for user ${userId}...`);

    for (const job of mockJobs) {
      const jobId = uuidv4();
      const query = `
        INSERT INTO prospectivejobs (
          id, user_id, job_title, company, location, description,
          industry, job_type, salary_low, salary_high, stage, job_url,
          date_added, status_change_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE, NOW())
        ON CONFLICT (id) DO NOTHING
      `;

      await database.query(query, [
        jobId,
        userId,
        job.jobTitle,
        job.company,
        job.location,
        job.description,
        job.industry,
        job.jobType,
        job.salaryLow,
        job.salaryHigh,
        job.stage,
        job.jobUrl,
      ]);

      console.log(`✅ Added: ${job.jobTitle} at ${job.company}`);
    }

    console.log(`✨ Successfully seeded ${mockJobs.length} prospective jobs!`);
  } catch (error) {
    console.error("❌ Error seeding prospective jobs:", error);
    throw error;
  }
}

// Get user ID from command line or fetch first user from database
async function main() {
  let userId = process.argv[2];

  // If no user ID provided, get the first user from the database
  if (!userId) {
    try {
      const result = await database.query("SELECT u_id FROM users LIMIT 1");
      if (result.rows.length === 0) {
        console.error("❌ No users found in database. Please create a user account first.");
        process.exit(1);
      }
      userId = result.rows[0].u_id;
      console.log(`📋 Using user ID: ${userId}`);
    } catch (error) {
      console.error("❌ Error fetching user ID:", error);
      console.error("Usage: node seedProspectiveJobs.js <userId>");
      process.exit(1);
    }
  }

  await seedProspectiveJobs(userId);
  console.log("✅ Seeding completed!");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});

