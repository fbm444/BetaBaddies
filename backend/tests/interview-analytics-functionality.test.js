#!/usr/bin/env node

/**
 * Interview Analytics Service Functionality Tests
 * Tests all interview analytics service methods with database integration
 */

import interviewAnalyticsService from "../services/interviewAnalyticsService.js";
import interviewService from "../services/interviewService.js";
import jobOpportunityService from "../services/jobOpportunityService.js";
import userService from "../services/userService.js";
import database from "../services/database.js";

console.log("🧪 Testing Interview Analytics Service Functionality");
console.log("====================================================\n");

let testUsers = [];
let testJobOpportunities = [];
let testInterviews = [];
let testFeedback = [];
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
    email: `analytics-test-${Date.now()}@example.com`,
    password: "TestPassword123",
  };

  const user = await userService.createUser(userData);
  testUsers.push(user);
  console.log(`   ✓ Created test user: ${user.email}`);

  // Create job opportunities with different industries
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
    {
      title: "Full Stack Developer",
      company: "StartupXYZ",
      location: "Austin, TX",
      industry: "Startups",
      status: "Interview",
    },
  ];

  for (const jobData of jobOpportunitiesData) {
    const job = await jobOpportunityService.createJobOpportunity(
      testUsers[0].id,
      jobData
    );
    testJobOpportunities.push(job);
    console.log(`   ✓ Created job opportunity: ${job.company}`);
  }

  // Create interviews with different formats and outcomes
  const interviewsData = [
    {
      jobOpportunityId: testJobOpportunities[0].id,
      interviewType: "phone",
      format: "phone_screen",
      scheduledAt: new Date("2024-01-15T10:00:00Z").toISOString(),
      duration: 30,
      status: "completed",
      outcome: "offer_extended",
    },
    {
      jobOpportunityId: testJobOpportunities[0].id,
      interviewType: "video",
      format: "technical",
      scheduledAt: new Date("2024-01-20T14:00:00Z").toISOString(),
      duration: 60,
      status: "completed",
      outcome: "passed",
    },
    {
      jobOpportunityId: testJobOpportunities[1].id,
      interviewType: "video",
      format: "behavioral",
      scheduledAt: new Date("2024-02-01T11:00:00Z").toISOString(),
      duration: 45,
      status: "completed",
      outcome: "passed",
    },
    {
      jobOpportunityId: testJobOpportunities[1].id,
      interviewType: "in-person",
      format: "on_site",
      scheduledAt: new Date("2024-02-10T09:00:00Z").toISOString(),
      duration: 120,
      status: "completed",
      outcome: "rejected",
    },
    {
      jobOpportunityId: testJobOpportunities[2].id,
      interviewType: "video",
      format: "technical",
      scheduledAt: new Date("2024-02-15T13:00:00Z").toISOString(),
      duration: 60,
      status: "completed",
      outcome: "offer_extended",
    },
  ];

  for (const interviewData of interviewsData) {
    // Create interview
    const interview = await interviewService.createInterview(
      testUsers[0].id,
      {
        jobOpportunityId: interviewData.jobOpportunityId,
        interviewType: interviewData.interviewType,
        scheduledAt: interviewData.scheduledAt,
        duration: interviewData.duration,
      }
    );

    // Update interview with format, status, and outcome
    await interviewService.updateInterview(
      testUsers[0].id,
      interview.id,
      {
        format: interviewData.format,
        status: interviewData.status,
        outcome: interviewData.outcome,
      }
    );

    // Get updated interview
    const updatedInterview = await interviewService.getInterviewById(
      testUsers[0].id,
      interview.id
    );
    testInterviews.push(updatedInterview);
    console.log(`   ✓ Created interview: ${updatedInterview.title}`);
  }

  // Create interview feedback for skill areas
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
      skillArea: "system_design",
      score: 80,
    },
    {
      interviewId: testInterviews[1].id,
      skillArea: "algorithms",
      score: 70,
    },
    {
      interviewId: testInterviews[1].id,
      skillArea: "apis",
      score: 40,
    },
    {
      interviewId: testInterviews[2].id,
      skillArea: "behavioral",
      score: 20,
    },
    {
      interviewId: testInterviews[2].id,
      skillArea: "time_management",
      score: 10,
    },
  ];

  for (const feedback of feedbackData) {
    const result = await database.query(
      `INSERT INTO interview_feedback (id, interview_id, user_id, skill_area, score)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING *`,
      [
        feedback.interviewId,
        testUsers[0].id,
        feedback.skillArea,
        feedback.score,
      ]
    );
    testFeedback.push(result.rows[0]);
    console.log(
      `   ✓ Created feedback: ${feedback.skillArea} (${feedback.score}/100)`
    );
  }

  console.log(
    `   📊 Created ${testJobOpportunities.length} job opportunities, ${testInterviews.length} interviews, and ${testFeedback.length} feedback entries\n`
  );
}

async function runAllTests() {
  // Check database connection first
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.error("\n❌ Cannot run tests without database connection");
    process.exit(1);
  }

  await setupTestData();

  // Test 1: Get Conversion Rate
  await runTest("Get Conversion Rate", async () => {
    const conversionRate = await interviewAnalyticsService.getConversionRate(
      testUsers[0].id
    );

    console.log(`   ✓ User conversion rate: ${conversionRate.userRate}%`);
    console.log(`   ✓ Industry average: ${conversionRate.industryAverage}%`);
    console.log(`   ✓ Offers: ${conversionRate.offers}`);
    console.log(
      `   ✓ Completed interviews: ${conversionRate.completedInterviews}`
    );

    if (typeof conversionRate.userRate !== "number") {
      throw new Error("Conversion rate should be a number");
    }
    if (conversionRate.userRate < 0 || conversionRate.userRate > 100) {
      throw new Error("Conversion rate should be between 0 and 100");
    }
  });

  // Test 2: Get Performance by Format
  await runTest("Get Performance by Format", async () => {
    const performance = await interviewAnalyticsService.getPerformanceByFormat(
      testUsers[0].id
    );

    console.log(`   ✓ Formats analyzed: ${performance.length}`);
    performance.forEach((item) => {
      console.log(
        `   ✓ ${item.formatLabel}: ${item.successful}/${item.total} successful`
      );
    });

    if (performance.length === 0) {
      throw new Error("Should return performance data for formats");
    }

    // Check that phone_screen format is included
    const phoneScreen = performance.find((p) => p.format === "phone_screen");
    if (!phoneScreen) {
      throw new Error("Should include phone_screen format");
    }
  });

  // Test 3: Get Performance by Company Type
  await runTest("Get Performance by Company Type", async () => {
    const performance =
      await interviewAnalyticsService.getPerformanceByCompanyType(
        testUsers[0].id
      );

    console.log(`   ✓ Company types analyzed: ${performance.length}`);
    performance.forEach((item) => {
      console.log(
        `   ✓ ${item.companyType}: ${item.successful}/${item.total} successful`
      );
    });

    if (performance.length === 0) {
      throw new Error("Should return performance data for company types");
    }

    // Check that FinTech is included
    const fintech = performance.find((p) => p.companyType === "FinTech");
    if (!fintech) {
      throw new Error("Should include FinTech company type");
    }
  });

  // Test 4: Get Skill Area Performance
  await runTest("Get Skill Area Performance", async () => {
    const skillPerformance =
      await interviewAnalyticsService.getSkillAreaPerformance(testUsers[0].id);

    console.log(`   ✓ Skill areas analyzed: ${skillPerformance.length}`);
    skillPerformance.forEach((item) => {
      console.log(
        `   ✓ ${item.skillAreaLabel}: ${item.averageScore}/100 (${item.count} assessments)`
      );
    });

    if (skillPerformance.length === 0) {
      throw new Error("Should return skill area performance data");
    }

    // Check that system_design is included
    const systemDesign = skillPerformance.find(
      (s) => s.skillArea === "system_design"
    );
    if (!systemDesign) {
      throw new Error("Should include system_design skill area");
    }

    // Validate score range
    skillPerformance.forEach((item) => {
      if (item.averageScore < 0 || item.averageScore > 100) {
        throw new Error(
          `Average score should be between 0 and 100, got ${item.averageScore}`
        );
      }
    });
  });

  // Test 5: Get Improvement Trend
  await runTest("Get Improvement Trend", async () => {
    const trend = await interviewAnalyticsService.getImprovementTrend(
      testUsers[0].id,
      12
    );

    console.log(`   ✓ Trend data points: ${trend.length}`);
    trend.forEach((point) => {
      if (point.averageScore !== null) {
        console.log(
          `   ✓ ${point.period}: Average score ${point.averageScore}`
        );
      }
    });

    // Trend should return data (may be empty if no data in time range)
    if (!Array.isArray(trend)) {
      throw new Error("Trend should return an array");
    }
  });

  // Test 6: Generate Recommendations
  await runTest("Generate Recommendations", async () => {
    const recommendations =
      await interviewAnalyticsService.generateRecommendations(testUsers[0].id);

    console.log(`   ✓ Recommendations generated: ${recommendations.length}`);
    recommendations.forEach((rec, index) => {
      console.log(`   ✓ ${index + 1}. ${rec}`);
    });

    if (recommendations.length === 0) {
      throw new Error("Should generate at least one recommendation");
    }

    if (!Array.isArray(recommendations)) {
      throw new Error("Recommendations should be an array");
    }
  });

  // Test 7: Get Optimal Strategy Insights
  await runTest("Get Optimal Strategy Insights", async () => {
    const insights = interviewAnalyticsService.getOptimalStrategyInsights();

    console.log(`   ✓ Strategy insights: ${insights.length}`);
    insights.forEach((insight) => {
      console.log(`   ✓ ${insight.number}. ${insight.title}`);
    });

    if (insights.length === 0) {
      throw new Error("Should return strategy insights");
    }

    // Validate insight structure
    insights.forEach((insight) => {
      if (!insight.number || !insight.title || !insight.description) {
        throw new Error("Insight should have number, title, and description");
      }
    });
  });

  // Test 8: Get All Analytics
  await runTest("Get All Analytics", async () => {
    const analytics = await interviewAnalyticsService.getAllAnalytics(
      testUsers[0].id
    );

    console.log(`   ✓ Conversion rate: ${analytics.conversionRate.userRate}%`);
    console.log(
      `   ✓ Format performance: ${analytics.performanceByFormat.length} formats`
    );
    console.log(
      `   ✓ Company type performance: ${analytics.performanceByCompanyType.length} types`
    );
    console.log(
      `   ✓ Skill areas: ${analytics.skillAreaPerformance.length} areas`
    );
    console.log(`   ✓ Trend points: ${analytics.improvementTrend.length}`);
    console.log(
      `   ✓ Recommendations: ${analytics.recommendations.length} items`
    );
    console.log(
      `   ✓ Strategy insights: ${analytics.optimalStrategyInsights.length} items`
    );

    // Validate all required fields are present
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
  });

  // Test 9: Empty Data Handling
  await runTest("Empty Data Handling", async () => {
    // Create a new user with no interviews
    const newUserData = {
      email: `empty-test-${Date.now()}@example.com`,
      password: "TestPassword123",
    };
    const newUser = await userService.createUser(newUserData);

    const conversionRate = await interviewAnalyticsService.getConversionRate(
      newUser.id
    );

    console.log(
      `   ✓ Empty data conversion rate: ${conversionRate.userRate}%`
    );
    console.log(`   ✓ Handles empty data gracefully`);

    // Should return 0% for users with no interviews
    if (conversionRate.userRate !== 0) {
      throw new Error("Empty data should return 0% conversion rate");
    }

    // Cleanup
    await database.query("DELETE FROM users WHERE u_id = $1", [newUser.id]);
  });

  // Test 10: User Isolation
  await runTest("User Isolation", async () => {
    // Create a second user
    const user2Data = {
      email: `user2-test-${Date.now()}@example.com`,
      password: "TestPassword123",
    };
    const user2 = await userService.createUser(user2Data);

    // Get analytics for user2 (should have no data)
    const user2Analytics = await interviewAnalyticsService.getAllAnalytics(
      user2.id
    );

    console.log(
      `   ✓ User2 conversion rate: ${user2Analytics.conversionRate.userRate}%`
    );
    console.log(`   ✓ User2 has no interviews (isolated)`);

    // User2 should have 0% conversion rate
    if (user2Analytics.conversionRate.userRate !== 0) {
      throw new Error("User2 should have 0% conversion rate");
    }

    // User1 should still have data
    const user1Analytics = await interviewAnalyticsService.getAllAnalytics(
      testUsers[0].id
    );

    if (user1Analytics.conversionRate.userRate === 0) {
      throw new Error("User1 should still have conversion rate data");
    }

    // Cleanup
    await database.query("DELETE FROM users WHERE u_id = $1", [user2.id]);
  });

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

  // Delete users
  for (const user of testUsers) {
    try {
      await database.query("DELETE FROM users WHERE u_id = $1", [user.id]);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  console.log(
    `   📊 Cleaned up ${testFeedback.length} feedback entries, ${testInterviews.length} interviews, ${testJobOpportunities.length} job opportunities, and ${testUsers.length} users`
  );
  console.log("\n✨ Test suite completed!");
}

// Run tests
runAllTests().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});

