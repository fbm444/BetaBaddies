#!/usr/bin/env node

/**
 * Interview Analytics API Integration Tests
 * Tests all API endpoints with real HTTP requests
 */

import request from "supertest";
import app from "../server.js";
import userService from "../services/userService.js";
import interviewService from "../services/interviewService.js";
import jobOpportunityService from "../services/jobOpportunityService.js";
import database from "../services/database.js";

console.log("🧪 Testing Interview Analytics API Endpoints");
console.log("===========================================\n");

let testUser = null;
let testJobOpportunities = [];
let testInterviews = [];
let testFeedback = [];
let csrfToken = null;
let sessionCookie = null;
let testResults = { passed: 0, failed: 0, total: 0 };

async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n📋 Test: ${testName}`);
  console.log("─".repeat(50));

  try {
    await testFunction();
    console.log(`✅ PASSED: ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed++;
  }
}

async function checkDatabaseConnection() {
  try {
    await database.query("SELECT 1");
    console.log("   ✓ Database connection successful");
    return true;
  } catch (error) {
    console.error("   ❌ Database connection failed:", error.message);
    console.error("\n⚠️  Please ensure:");
    console.error("   1. PostgreSQL is running");
    console.error("   2. Database 'ats_tracker' exists (or update DB_NAME in .env)");
    console.error("   3. Database credentials in .env are correct");
    return false;
  }
}

async function setupTestData() {
  console.log("🔧 Setting up test data...");

  // Create test user
  const userData = {
    email: `analytics-api-test-${Date.now()}@example.com`,
    password: "TestPassword123",
  };

  testUser = await userService.createUser(userData);
  console.log(`   ✓ Created test user: ${testUser.email}`);

  // Login user
  console.log("🔐 Logging in test user...");
  const loginResponse = await request(app)
    .post("/api/v1/users/login")
    .send({
      email: testUser.email,
      password: "TestPassword123",
    })
    .expect(200);

  // Extract session cookie
  const cookies = loginResponse.headers["set-cookie"];
  sessionCookie = cookies
    ? cookies.find((cookie) => cookie.startsWith("connect.sid"))
    : null;

  if (!sessionCookie) {
    throw new Error("No session cookie received");
  }

  console.log(`   ✓ User logged in successfully`);

  // Create job opportunities
  const jobOpportunitiesData = [
    {
      title: "Software Engineer",
      company: "FinTech Corp",
      location: "San Francisco, CA",
      industry: "FinTech",
      status: "Interview",
    },
    {
      title: "Senior Developer",
      company: "BigTech Inc",
      location: "Seattle, WA",
      industry: "Big Tech",
      status: "Interview",
    },
  ];

  for (const jobData of jobOpportunitiesData) {
    const job = await jobOpportunityService.createJobOpportunity(
      testUser.id,
      jobData
    );
    testJobOpportunities.push(job);
  }

  // Create interviews
  const interviewsData = [
    {
      jobOpportunityId: testJobOpportunities[0].id,
      interviewType: "phone",
      scheduledAt: new Date("2024-01-15T10:00:00Z").toISOString(),
      duration: 30,
    },
    {
      jobOpportunityId: testJobOpportunities[0].id,
      interviewType: "video",
      scheduledAt: new Date("2024-01-20T14:00:00Z").toISOString(),
      duration: 60,
    },
    {
      jobOpportunityId: testJobOpportunities[1].id,
      interviewType: "video",
      scheduledAt: new Date("2024-02-01T11:00:00Z").toISOString(),
      duration: 45,
    },
  ];

  for (const interviewData of interviewsData) {
    const interview = await interviewService.createInterview(
      testUser.id,
      interviewData
    );

    // Update with format, status, and outcome
    const format = interviewData.interviewType === "phone" ? "phone_screen" : "technical";
    await interviewService.updateInterview(testUser.id, interview.id, {
      format: format,
      status: "completed",
      outcome: interviewData.interviewType === "phone" ? "offer_extended" : "passed",
    });

    const updatedInterview = await interviewService.getInterviewById(
      testUser.id,
      interview.id
    );
    testInterviews.push(updatedInterview);
  }

  // Create feedback
  const feedbackData = [
    {
      interviewId: testInterviews[0].id,
      skillArea: "system_design",
      score: 75,
    },
    {
      interviewId: testInterviews[0].id,
      skillArea: "algorithms",
      score: 65,
    },
    {
      interviewId: testInterviews[1].id,
      skillArea: "behavioral",
      score: 20,
    },
  ];

  for (const feedback of feedbackData) {
    const result = await database.query(
      `INSERT INTO interview_feedback (id, interview_id, user_id, skill_area, score)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING *`,
      [feedback.interviewId, testUser.id, feedback.skillArea, feedback.score]
    );
    testFeedback.push(result.rows[0]);
  }

  console.log(
    `   📊 Created ${testJobOpportunities.length} job opportunities, ${testInterviews.length} interviews, and ${testFeedback.length} feedback entries\n`
  );
}

async function getFreshCsrfToken() {
  // CSRF tokens are no longer required
  return "";
}

async function runAllTests() {
  // Check database connection first
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.error("\n❌ Cannot run tests without database connection");
    process.exit(1);
  }

  await setupTestData();

  // Test 1: GET /api/v1/interviews/analytics - Get All Analytics
  await runTest(
    "GET /api/v1/interviews/analytics - Get All Analytics",
    async () => {
      const freshCsrfToken = await getFreshCsrfToken();

      const response = await request(app)
        .get("/api/v1/interviews/analytics")
        .set("Cookie", sessionCookie)
        .expect(200);

      if (!response.body.ok) {
        throw new Error("Response should have ok: true");
      }

      if (!response.body.data) {
        throw new Error("Response should have data object");
      }

      const analytics = response.body.data;

      // Validate structure
      if (!analytics.conversionRate) {
        throw new Error("Analytics should include conversionRate");
      }
      if (!analytics.performanceByFormat) {
        throw new Error("Analytics should include performanceByFormat");
      }
      if (!analytics.performanceByCompanyType) {
        throw new Error("Analytics should include performanceByCompanyType");
      }
      if (!analytics.skillAreaPerformance) {
        throw new Error("Analytics should include skillAreaPerformance");
      }
      if (!analytics.improvementTrend) {
        throw new Error("Analytics should include improvementTrend");
      }
      if (!analytics.recommendations) {
        throw new Error("Analytics should include recommendations");
      }
      if (!analytics.optimalStrategyInsights) {
        throw new Error("Analytics should include optimalStrategyInsights");
      }

      console.log(
        `   ✓ Conversion rate: ${analytics.conversionRate.userRate}%`
      );
      console.log(
        `   ✓ Format performance: ${analytics.performanceByFormat.length} formats`
      );
      console.log(
        `   ✓ Skill areas: ${analytics.skillAreaPerformance.length} areas`
      );
      console.log(
        `   ✓ Recommendations: ${analytics.recommendations.length} items`
      );
    }
  );

  // Test 2: GET /api/v1/interviews/analytics/conversion-rate - Get Conversion Rate
  await runTest(
    "GET /api/v1/interviews/analytics/conversion-rate - Get Conversion Rate",
    async () => {
      const response = await request(app)
        .get("/api/v1/interviews/analytics/conversion-rate")
        .set("Cookie", sessionCookie)
        .expect(200);

      if (!response.body.ok) {
        throw new Error("Response should have ok: true");
      }

      if (!response.body.data.conversionRate) {
        throw new Error("Response should have conversionRate data");
      }

      const conversionRate = response.body.data.conversionRate;

      if (typeof conversionRate.userRate !== "number") {
        throw new Error("userRate should be a number");
      }

      if (conversionRate.userRate < 0 || conversionRate.userRate > 100) {
        throw new Error("userRate should be between 0 and 100");
      }

      console.log(`   ✓ User rate: ${conversionRate.userRate}%`);
      console.log(`   ✓ Industry average: ${conversionRate.industryAverage}%`);
      console.log(`   ✓ Offers: ${conversionRate.offers}`);
    }
  );

  // Test 3: GET /api/v1/interviews/analytics/trends - Get Trends
  await runTest(
    "GET /api/v1/interviews/analytics/trends - Get Trends",
    async () => {
      const response = await request(app)
        .get("/api/v1/interviews/analytics/trends")
        .set("Cookie", sessionCookie)
        .expect(200);

      if (!response.body.ok) {
        throw new Error("Response should have ok: true");
      }

      if (!response.body.data.trends) {
        throw new Error("Response should have trends data");
      }

      if (!Array.isArray(response.body.data.trends)) {
        throw new Error("Trends should be an array");
      }

      console.log(`   ✓ Trend data points: ${response.body.data.trends.length}`);
    }
  );

  // Test 4: GET /api/v1/interviews/analytics/trends?months=6 - Get Trends with Query
  await runTest(
    "GET /api/v1/interviews/analytics/trends?months=6 - Get Trends with Query",
    async () => {
      const response = await request(app)
        .get("/api/v1/interviews/analytics/trends?months=6")
        .set("Cookie", sessionCookie)
        .expect(200);

      if (!response.body.ok) {
        throw new Error("Response should have ok: true");
      }

      if (!Array.isArray(response.body.data.trends)) {
        throw new Error("Trends should be an array");
      }

      console.log(`   ✓ Trend data points (6 months): ${response.body.data.trends.length}`);
    }
  );

  // Test 5: GET /api/v1/interviews/analytics/recommendations - Get Recommendations
  await runTest(
    "GET /api/v1/interviews/analytics/recommendations - Get Recommendations",
    async () => {
      const response = await request(app)
        .get("/api/v1/interviews/analytics/recommendations")
        .set("Cookie", sessionCookie)
        .expect(200);

      if (!response.body.ok) {
        throw new Error("Response should have ok: true");
      }

      if (!response.body.data.recommendations) {
        throw new Error("Response should have recommendations data");
      }

      if (!Array.isArray(response.body.data.recommendations)) {
        throw new Error("Recommendations should be an array");
      }

      if (response.body.data.recommendations.length === 0) {
        throw new Error("Should return at least one recommendation");
      }

      console.log(
        `   ✓ Recommendations: ${response.body.data.recommendations.length} items`
      );
      response.body.data.recommendations.forEach((rec, index) => {
        console.log(`   ✓ ${index + 1}. ${rec}`);
      });
    }
  );

  // Test 6: Unauthorized Access (No Session)
  await runTest(
    "GET /api/v1/interviews/analytics - Unauthorized Access",
    async () => {
      const response = await request(app)
        .get("/api/v1/interviews/analytics")
        .expect(401);

      if (response.body.ok !== false) {
        throw new Error("Unauthorized request should return ok: false");
      }
    }
  );

  // Test 7: Invalid Endpoint
  await runTest(
    "GET /api/v1/interviews/analytics/invalid - Invalid Endpoint",
    async () => {
      const response = await request(app)
        .get("/api/v1/interviews/analytics/invalid")
        .set("Cookie", sessionCookie)
        .expect(404);
    }
  );

  // Print test summary
  console.log("\n📊 Test Summary");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📝 Total:  ${testResults.total}`);
  console.log(
    `📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`
  );

  if (testResults.failed === 0) {
    console.log("\n🎉 All tests passed!");
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed.`);
  }

  // Cleanup
  console.log("\n🧹 Cleaning up test data...");

  // Delete feedback
  for (const feedback of testFeedback) {
    try {
      await database.query("DELETE FROM interview_feedback WHERE id = $1", [
        feedback.id,
      ]);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Delete interviews
  for (const interview of testInterviews) {
    try {
      await database.query("DELETE FROM interviews WHERE id = $1", [
        interview.id,
      ]);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Delete job opportunities
  for (const job of testJobOpportunities) {
    try {
      await database.query("DELETE FROM job_opportunities WHERE id = $1", [
        job.id,
      ]);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Delete user
  try {
    await database.query("DELETE FROM users WHERE u_id = $1", [testUser.id]);
  } catch (error) {
    // Ignore cleanup errors
  }

  console.log(
    `   📊 Cleaned up ${testFeedback.length} feedback entries, ${testInterviews.length} interviews, ${testJobOpportunities.length} job opportunities, and 1 user`
  );
  console.log("\n✨ Test suite completed!");
}

// Run tests
runAllTests().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});

