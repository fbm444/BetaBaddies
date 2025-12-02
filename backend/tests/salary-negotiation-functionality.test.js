#!/usr/bin/env node

/**
 * Test for salary negotiation functionality using actual database
 * Tests negotiation creation, updates, and calculations
 */

import userService from "../services/userService.js";
import salaryNegotiationService from "../services/salaryNegotiationService.js";
import jobOpportunityService from "../services/jobOpportunityService.js";
import database from "../services/database.js";

console.log("🧪 Testing Salary Negotiation Service Functionality with Database");
console.log("==================================================================\n");

const testEmail = `salary-negotiation-test-${Date.now()}@example.com`;
const testPassword = "TestPassword123";

let testUserId;
let createdNegotiationIds = [];
let createdJobOpportunityIds = [];

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n📋 Test: ${testName}`);
  console.log("─".repeat(60));

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

// Setup: Create test user and job opportunity
async function setupTestData() {
  console.log("🔧 Setting up test data...");

  try {
    const result = await userService.createUser({
      email: testEmail,
      password: testPassword,
    });
    testUserId = result.id;

    // Create a test job opportunity
    const jobOpp = await jobOpportunityService.createJobOpportunity(
      testUserId,
      {
        title: "Senior Software Engineer",
        company: "Test Company",
        location: "San Francisco, CA",
        status: "Offer",
        salaryMin: 150000,
        salaryMax: 200000,
      }
    );
    createdJobOpportunityIds.push(jobOpp.id);

    console.log(
      `   ✓ Created test user: ${testEmail} (ID: ${testUserId})`
    );
    console.log(`   ✓ Created test job opportunity: ${jobOpp.id}\n`);
  } catch (error) {
    console.error(`   ❌ Failed to create test data:`, error.message);
    throw error;
  }
}

// Cleanup: Remove test data
async function cleanupTestData() {
  console.log("\n🧹 Cleaning up test data...");

  // Delete negotiations
  for (const negotiationId of createdNegotiationIds) {
    try {
      await database.query(
        "DELETE FROM salary_negotiations WHERE id = $1",
        [negotiationId]
      );
      console.log(`   ✓ Deleted negotiation: ${negotiationId}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete negotiation ${negotiationId}:`,
        error.message
      );
    }
  }

  // Delete job opportunities
  for (const jobOppId of createdJobOpportunityIds) {
    try {
      await database.query(
        "DELETE FROM job_opportunities WHERE id = $1",
        [jobOppId]
      );
      console.log(`   ✓ Deleted job opportunity: ${jobOppId}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete job opportunity ${jobOppId}:`,
        error.message
      );
    }
  }

  // Delete test user
  if (testUserId) {
    try {
      await userService.deleteUser(testUserId);
      console.log(`   ✓ Deleted test user: ${testUserId}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete test user ${testUserId}:`,
        error.message
      );
    }
  }

  console.log(
    `   📊 Cleaned up ${createdNegotiationIds.length} negotiations, ${createdJobOpportunityIds.length} job opportunities, and 1 user`
  );
}

// Main test execution
async function runAllTests() {
  try {
    await setupTestData();

    const jobOpportunityId = createdJobOpportunityIds[0];

    // Test 1: Create Salary Negotiation
    let negotiationId;
    await runTest("Create Salary Negotiation", async () => {
      const offerData = {
        initialOffer: {
          baseSalary: 150000,
          bonus: 20000,
          equity: 30000,
          benefitsValue: 10000,
          currency: "USD",
        },
        targetCompensation: {
          baseSalary: 170000,
          bonus: 25000,
          equity: 40000,
          benefitsValue: 10000,
        },
        initialOfferDate: new Date(),
      };

      const negotiation = await salaryNegotiationService.createNegotiation(
        testUserId,
        jobOpportunityId,
        offerData
      );

      if (!negotiation.id) {
        throw new Error("Negotiation was not created with an ID");
      }

      if (negotiation.initialOfferBaseSalary !== offerData.initialOffer.baseSalary) {
        throw new Error("Initial offer base salary mismatch");
      }

      if (negotiation.targetBaseSalary !== offerData.targetCompensation.baseSalary) {
        throw new Error("Target base salary mismatch");
      }

      if (negotiation.status !== "draft") {
        throw new Error("New negotiation should be in draft status");
      }

      negotiationId = negotiation.id;
      createdNegotiationIds.push(negotiationId);
      console.log("   ✓ Salary negotiation created successfully");
    });

    // Test 2: Get Negotiation by ID
    await runTest("Get Negotiation by ID", async () => {
      const negotiation = await salaryNegotiationService.getNegotiationById(
        negotiationId,
        testUserId
      );

      if (!negotiation) {
        throw new Error("Negotiation not found");
      }

      if (negotiation.id !== negotiationId) {
        throw new Error("Negotiation ID mismatch");
      }

      console.log("   ✓ Negotiation retrieved successfully");
    });

    // Test 3: Update Negotiation
    await runTest("Update Negotiation", async () => {
      const updates = {
        status: "active",
        marketSalaryData: {
          percentile50: 165000,
          percentile75: 180000,
        },
      };

      const updated = await salaryNegotiationService.updateNegotiation(
        negotiationId,
        testUserId,
        updates
      );

      if (updated.status !== "active") {
        throw new Error("Status was not updated");
      }

      console.log("   ✓ Negotiation updated successfully");
    });

    // Test 4: Get All Negotiations for User
    await runTest("Get All Negotiations for User", async () => {
      const negotiations = await salaryNegotiationService.getNegotiationsByUserId(
        testUserId
      );

      if (!Array.isArray(negotiations)) {
        throw new Error("Negotiations should be an array");
      }

      if (negotiations.length === 0) {
        throw new Error("Should return at least one negotiation");
      }

      const hasOurNegotiation = negotiations.some(
        (n) => n.id === negotiationId
      );
      if (!hasOurNegotiation) {
        throw new Error("Created negotiation should be in the list");
      }

      console.log(`   ✓ Retrieved ${negotiations.length} negotiations`);
    });

    // Test 5: Filter Negotiations by Status
    await runTest("Filter Negotiations by Status", async () => {
      const negotiations = await salaryNegotiationService.getNegotiationsByUserId(
        testUserId,
        { status: "active" }
      );

      if (!Array.isArray(negotiations)) {
        throw new Error("Negotiations should be an array");
      }

      const allActive = negotiations.every((n) => n.status === "active");
      if (!allActive) {
        throw new Error("Not all negotiations match the status filter");
      }

      console.log(
        `   ✓ Filtered ${negotiations.length} active negotiations`
      );
    });

    // Test 6: Calculate Total Compensation
    await runTest("Calculate Total Compensation", async () => {
      const compensationData = {
        baseSalary: 150000,
        bonus: 20000,
        equity: 30000,
        benefitsValue: 10000,
      };

      const total = salaryNegotiationService.calculateTotalCompensation(
        compensationData
      );

      const expectedTotal = 210000;
      if (total !== expectedTotal) {
        throw new Error(
          `Expected total ${expectedTotal}, got ${total}`
        );
      }

      console.log(`   ✓ Calculated total compensation: $${total}`);
    });

    // Test 7: Complete Negotiation
    await runTest("Complete Negotiation", async () => {
      const finalCompensation = {
        baseSalary: 165000,
        bonus: 22000,
        equity: 35000,
        benefitsValue: 10000,
      };

      const completed = await salaryNegotiationService.updateNegotiation(
        negotiationId,
        testUserId,
        {
          status: "completed",
          outcome: "accepted",
          finalCompensation: finalCompensation,
          outcomeDate: new Date(),
        }
      );

      if (completed.status !== "completed") {
        throw new Error("Status should be completed");
      }

      if (completed.outcome !== "accepted") {
        throw new Error("Outcome should be accepted");
      }

      console.log("   ✓ Negotiation completed successfully");
    });

    // Test 8: Error Handling - Duplicate Negotiation
    await runTest("Error Handling - Duplicate Negotiation", async () => {
      // Create another job opportunity
      const jobOpp2 = await jobOpportunityService.createJobOpportunity(
        testUserId,
        {
          title: "Software Engineer",
          company: "Another Company",
          location: "New York, NY",
          status: "Offer",
        }
      );
      createdJobOpportunityIds.push(jobOpp2.id);

      // Try to create duplicate negotiation for same job
      try {
        await salaryNegotiationService.createNegotiation(
          testUserId,
          jobOpportunityId, // Same job as first negotiation
          {
            initialOffer: { baseSalary: 100000 },
            targetCompensation: { baseSalary: 120000 },
          }
        );
        throw new Error("Should have thrown error for duplicate negotiation");
      } catch (error) {
        if (!error.message.includes("already exists")) {
          throw error;
        }
        console.log("   ✓ Correctly prevented duplicate negotiation");
      }
    });

    // Test 9: Error Handling - Invalid Status
    await runTest("Error Handling - Invalid Status", async () => {
      try {
        await salaryNegotiationService.updateNegotiation(
          negotiationId,
          testUserId,
          { status: "invalid_status" }
        );
        throw new Error("Should have thrown error for invalid status");
      } catch (error) {
        if (!error.message.includes("Invalid status")) {
          throw error;
        }
        console.log("   ✓ Correctly validated status");
      }
    });

    // Test 10: Error Handling - Invalid Job Opportunity
    await runTest("Error Handling - Invalid Job Opportunity", async () => {
      const fakeJobId = "00000000-0000-0000-0000-000000000000";
      try {
        await salaryNegotiationService.createNegotiation(
          testUserId,
          fakeJobId,
          {
            initialOffer: { baseSalary: 100000 },
            targetCompensation: { baseSalary: 120000 },
          }
        );
        throw new Error("Should have thrown error for invalid job opportunity");
      } catch (error) {
        if (!error.message.includes("not found")) {
          throw error;
        }
        console.log("   ✓ Correctly handled invalid job opportunity");
      }
    });

    // Final Summary
    console.log("\n📊 Test Summary");
    console.log("================");
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);

    if (testResults.failed > 0) {
      console.log(`\n❌ ${testResults.failed} test(s) failed.`);
      process.exit(1);
    } else {
      console.log("\n🎉 All salary negotiation functionality tests passed!");
      console.log("\n✅ Core salary negotiation components are working correctly:");
      console.log("   • Negotiation creation");
      console.log("   • Negotiation retrieval");
      console.log("   • Negotiation updates");
      console.log("   • Compensation calculations");
      console.log("   • Status management");
      console.log("   • Filtering and search");
      console.log("   • Error handling");
    }
  } catch (error) {
    console.error("\n❌ Test execution failed:", error.message);
    process.exit(1);
  } finally {
    await cleanupTestData();
    console.log("\n✅ Test cleanup completed");
  }
}

// Run the tests
runAllTests().catch(console.error);

