#!/usr/bin/env node

/**
 * Test for writing prompts functionality using actual database
 * Tests prompt retrieval, filtering, and custom prompt creation
 */

import userService from "../services/userService.js";
import writingPromptsService from "../services/writingPromptsService.js";
import database from "../services/database.js";

console.log("🧪 Testing Writing Prompts Service Functionality with Database");
console.log("===============================================================\n");

const testEmail = `writing-prompts-test-${Date.now()}@example.com`;
const testPassword = "TestPassword123";

let testUserId;
let createdPromptIds = [];

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

// Setup: Create test user
async function setupTestData() {
  console.log("🔧 Setting up test data...");

  try {
    const result = await userService.createUser({
      email: testEmail,
      password: testPassword,
    });
    testUserId = result.id;
    console.log(`   ✓ Created test user: ${testEmail} (ID: ${testUserId})\n`);
  } catch (error) {
    console.error(`   ❌ Failed to create test user:`, error.message);
    throw error;
  }
}

// Cleanup: Remove test data
async function cleanupTestData() {
  console.log("\n🧹 Cleaning up test data...");

  for (const promptId of createdPromptIds) {
    try {
      await database.query(
        "DELETE FROM writing_practice_prompts WHERE id = $1",
        [promptId]
      );
      console.log(`   ✓ Deleted prompt: ${promptId}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete prompt ${promptId}:`,
        error.message
      );
    }
  }

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
    `   📊 Cleaned up ${createdPromptIds.length} prompts and 1 user`
  );
}

// Main test execution
async function runAllTests() {
  try {
    await setupTestData();

    // Test 1: Get Prompts by Category
    await runTest("Get Prompts by Category", async () => {
      const prompts = await writingPromptsService.getPromptsByCategory(
        "behavioral",
        null,
        true
      );

      if (!Array.isArray(prompts)) {
        throw new Error("Prompts should be an array");
      }

      const allBehavioral = prompts.every((p) => p.category === "behavioral");
      if (!allBehavioral) {
        throw new Error("Not all prompts are behavioral category");
      }

      const allActive = prompts.every((p) => p.isActive === true);
      if (!allActive) {
        throw new Error("Not all prompts are active");
      }

      console.log(`   ✓ Retrieved ${prompts.length} behavioral prompts`);
    });

    // Test 2: Get Prompts by Difficulty
    await runTest("Get Prompts by Difficulty", async () => {
      const prompts = await writingPromptsService.getPromptsByCategory(
        null,
        "beginner",
        true
      );

      if (!Array.isArray(prompts)) {
        throw new Error("Prompts should be an array");
      }

      const allBeginner = prompts.every(
        (p) => p.difficultyLevel === "beginner"
      );
      if (!allBeginner) {
        throw new Error("Not all prompts are beginner difficulty");
      }

      console.log(`   ✓ Retrieved ${prompts.length} beginner prompts`);
    });

    // Test 3: Get Prompts by Category and Difficulty
    await runTest("Get Prompts by Category and Difficulty", async () => {
      const prompts = await writingPromptsService.getPromptsByCategory(
        "technical",
        "intermediate",
        true
      );

      if (!Array.isArray(prompts)) {
        throw new Error("Prompts should be an array");
      }

      const allMatch = prompts.every(
        (p) =>
          p.category === "technical" && p.difficultyLevel === "intermediate"
      );
      if (!allMatch) {
        throw new Error("Not all prompts match category and difficulty");
      }

      console.log(
        `   ✓ Retrieved ${prompts.length} technical intermediate prompts`
      );
    });

    // Test 4: Get Random Prompt
    await runTest("Get Random Prompt", async () => {
      const prompt = await writingPromptsService.getRandomPrompt(
        "behavioral",
        "intermediate"
      );

      if (!prompt) {
        throw new Error("Should return a random prompt");
      }

      if (prompt.category !== "behavioral") {
        throw new Error("Random prompt category mismatch");
      }

      if (prompt.difficultyLevel !== "intermediate") {
        throw new Error("Random prompt difficulty mismatch");
      }

      if (!prompt.promptText) {
        throw new Error("Prompt text is missing");
      }

      console.log("   ✓ Retrieved random prompt successfully");
    });

    // Test 5: Get Prompt by ID
    await runTest("Get Prompt by ID", async () => {
      // First get a random prompt to use its ID
      const randomPrompt = await writingPromptsService.getRandomPrompt();

      if (!randomPrompt) {
        throw new Error("No prompts available in database");
      }

      const prompt = await writingPromptsService.getPromptById(randomPrompt.id);

      if (!prompt) {
        throw new Error("Prompt not found by ID");
      }

      if (prompt.id !== randomPrompt.id) {
        throw new Error("Prompt ID mismatch");
      }

      console.log("   ✓ Retrieved prompt by ID successfully");
    });

    // Test 6: Create Custom Prompt
    let customPromptId;
    await runTest("Create Custom Prompt", async () => {
      const promptData = {
        category: "custom",
        promptText: "Describe a challenging project you worked on recently.",
        difficultyLevel: "advanced",
        estimatedTimeMinutes: 7,
        tags: ["project", "challenge", "experience"],
      };

      const prompt = await writingPromptsService.createCustomPrompt(
        testUserId,
        promptData
      );

      if (!prompt.id) {
        throw new Error("Prompt was not created with an ID");
      }

      if (prompt.category !== promptData.category) {
        throw new Error("Prompt category mismatch");
      }

      if (prompt.promptText !== promptData.promptText) {
        throw new Error("Prompt text mismatch");
      }

      if (prompt.difficultyLevel !== promptData.difficultyLevel) {
        throw new Error("Difficulty level mismatch");
      }

      if (prompt.estimatedTimeMinutes !== promptData.estimatedTimeMinutes) {
        throw new Error("Estimated time mismatch");
      }

      customPromptId = prompt.id;
      createdPromptIds.push(customPromptId);
      console.log("   ✓ Custom prompt created successfully");
    });

    // Test 7: Get Prompts for Interview
    await runTest("Get Prompts for Interview", async () => {
      // Create a fake job opportunity ID for testing
      const fakeJobId = "00000000-0000-0000-0000-000000000000";

      const prompts = await writingPromptsService.getPromptsForInterview(
        fakeJobId
      );

      if (!Array.isArray(prompts)) {
        throw new Error("Prompts should be an array");
      }

      if (prompts.length === 0) {
        throw new Error("Should return at least some prompts");
      }

      const validCategories = [
        "behavioral",
        "company_fit",
        "strengths",
        "situational",
      ];
      const allValid = prompts.every((p) =>
        validCategories.includes(p.category)
      );

      if (!allValid) {
        throw new Error("Not all prompts have valid interview categories");
      }

      console.log(
        `   ✓ Retrieved ${prompts.length} interview-related prompts`
      );
    });

    // Test 8: Error Handling - Invalid Prompt ID
    await runTest("Error Handling - Invalid Prompt ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const prompt = await writingPromptsService.getPromptById(fakeId);

      if (prompt !== null) {
        throw new Error("Should return null for non-existent prompt");
      }

      console.log("   ✓ Correctly handled invalid prompt ID");
    });

    // Test 9: Error Handling - Missing Prompt Text
    await runTest("Error Handling - Missing Prompt Text", async () => {
      try {
        await writingPromptsService.createCustomPrompt(testUserId, {
          category: "custom",
          // Missing promptText
        });
        throw new Error("Should have thrown error for missing prompt text");
      } catch (error) {
        if (!error.message.includes("Prompt text is required")) {
          throw error;
        }
        console.log("   ✓ Correctly validated required prompt text");
      }
    });

    // Test 10: Get All Active Prompts
    await runTest("Get All Active Prompts", async () => {
      const prompts = await writingPromptsService.getPromptsByCategory(
        null,
        null,
        true
      );

      if (!Array.isArray(prompts)) {
        throw new Error("Prompts should be an array");
      }

      const allActive = prompts.every((p) => p.isActive === true);
      if (!allActive) {
        throw new Error("Not all prompts are active");
      }

      console.log(`   ✓ Retrieved ${prompts.length} active prompts`);
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
      console.log("\n🎉 All writing prompts functionality tests passed!");
      console.log("\n✅ Core writing prompts components are working correctly:");
      console.log("   • Prompt retrieval by category");
      console.log("   • Prompt retrieval by difficulty");
      console.log("   • Random prompt selection");
      console.log("   • Prompt retrieval by ID");
      console.log("   • Custom prompt creation");
      console.log("   • Interview-specific prompts");
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

