#!/usr/bin/env node

/**
 * Test for writing practice functionality using actual database
 * Creates test data, runs tests, and cleans up
 */

import userService from "../services/userService.js";
import writingPracticeService from "../services/writingPracticeService.js";
import writingPromptsService from "../services/writingPromptsService.js";
import database from "../services/database.js";

console.log("🧪 Testing Writing Practice Service Functionality with Database");
console.log("================================================================\n");

const testEmail = `writing-practice-test-${Date.now()}@example.com`;
const testPassword = "TestPassword123";

let testUserId;
let createdSessionIds = [];
let createdPromptId = null;

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

  // Delete practice sessions
  for (const sessionId of createdSessionIds) {
    try {
      await database.query(
        "DELETE FROM writing_practice_sessions WHERE id = $1",
        [sessionId]
      );
      console.log(`   ✓ Deleted practice session: ${sessionId}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete session ${sessionId}:`,
        error.message
      );
    }
  }

  // Delete custom prompt if created
  if (createdPromptId) {
    try {
      await database.query(
        "DELETE FROM writing_practice_prompts WHERE id = $1",
        [createdPromptId]
      );
      console.log(`   ✓ Deleted custom prompt: ${createdPromptId}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete prompt ${createdPromptId}:`,
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
    `   📊 Cleaned up ${createdSessionIds.length} sessions, ${createdPromptId ? 1 : 0} prompt, and 1 user`
  );
}

// Main test execution
async function runAllTests() {
  try {
    await setupTestData();

    // Test 1: Create Practice Session
    let sessionId;
    await runTest("Create Practice Session", async () => {
      const sessionData = {
        sessionType: "interview_response",
        prompt: "Tell me about yourself.",
        timeLimit: 300, // 5 minutes
      };

      const session = await writingPracticeService.createSession(
        testUserId,
        sessionData
      );

      if (!session.id) {
        throw new Error("Session was not created with an ID");
      }

      if (session.sessionType !== sessionData.sessionType) {
        throw new Error("Session type mismatch");
      }

      if (session.prompt !== sessionData.prompt) {
        throw new Error("Prompt mismatch");
      }

      if (session.isCompleted !== false) {
        throw new Error("New session should not be completed");
      }

      sessionId = session.id;
      createdSessionIds.push(sessionId);
      console.log("   ✓ Practice session created successfully:", session.id);
    });

    // Test 2: Get Session by ID
    await runTest("Get Session by ID", async () => {
      const session = await writingPracticeService.getSessionById(
        sessionId,
        testUserId
      );

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.id !== sessionId) {
        throw new Error("Session ID mismatch");
      }

      console.log("   ✓ Session retrieved successfully");
    });

    // Test 3: Update Session with Response
    await runTest("Update Session with Response", async () => {
      const responseText =
        "I am a software engineer with 5 years of experience in full-stack development. I have worked on various projects using React, Node.js, and PostgreSQL.";
      const wordCount = responseText.split(/\s+/).length;
      const timeSpent = 180; // 3 minutes

      const updatedSession = await writingPracticeService.updateSession(
        sessionId,
        testUserId,
        {
          response: responseText,
          wordCount: wordCount,
          timeSpentSeconds: timeSpent,
          isCompleted: true,
        }
      );

      if (updatedSession.response !== responseText) {
        throw new Error("Response text mismatch");
      }

      if (updatedSession.wordCount !== wordCount) {
        throw new Error("Word count mismatch");
      }

      if (updatedSession.timeSpentSeconds !== timeSpent) {
        throw new Error("Time spent mismatch");
      }

      if (updatedSession.isCompleted !== true) {
        throw new Error("Session should be marked as completed");
      }

      console.log("   ✓ Session updated with response successfully");
    });

    // Test 4: Get All Sessions for User
    await runTest("Get All Sessions for User", async () => {
      // Create another session
      const session2 = await writingPracticeService.createSession(
        testUserId,
        {
          sessionType: "thank_you_note",
          prompt: "Write a thank you note after an interview.",
        }
      );
      createdSessionIds.push(session2.id);

      const sessions = await writingPracticeService.getSessionsByUserId(
        testUserId,
        { limit: 10 }
      );

      if (sessions.length < 2) {
        throw new Error(
          `Expected at least 2 sessions, got ${sessions.length}`
        );
      }

      console.log(`   ✓ Retrieved ${sessions.length} sessions for user`);
    });

    // Test 5: Filter Sessions by Type
    await runTest("Filter Sessions by Type", async () => {
      const sessions = await writingPracticeService.getSessionsByUserId(
        testUserId,
        {
          sessionType: "interview_response",
          limit: 10,
        }
      );

      const allMatchType = sessions.every(
        (s) => s.sessionType === "interview_response"
      );

      if (!allMatchType) {
        throw new Error("Not all sessions match the filter type");
      }

      console.log(
        `   ✓ Filtered ${sessions.length} sessions by type successfully`
      );
    });

    // Test 6: Get Sessions with Response Only
    await runTest("Get Sessions with Response Only", async () => {
      // Create a session without response
      const sessionNoResponse = await writingPracticeService.createSession(
        testUserId,
        {
          sessionType: "interview_response",
          prompt: "What are your strengths?",
        }
      );
      createdSessionIds.push(sessionNoResponse.id);

      const sessions = await writingPracticeService.getSessionsByUserId(
        testUserId,
        {
          onlyWithResponse: true,
          limit: 10,
        }
      );

      // Verify all returned sessions have responses (if any were returned)
      if (sessions.length > 0) {
        const allHaveResponse = sessions.every(
          (s) => s.response && s.response.trim() !== ""
        );

        if (!allHaveResponse) {
          throw new Error("Some sessions don't have responses");
        }
      }

      // Note: It's okay if no sessions are returned if there are no sessions with responses
      console.log(
        `   ✓ Retrieved ${sessions.length} sessions with responses only`
      );
    });

    // Test 7: Create Session with Prompt ID
    await runTest("Create Session with Prompt ID", async () => {
      // Get a random prompt
      const prompt = await writingPromptsService.getRandomPrompt(
        "behavioral",
        "intermediate"
      );

      if (!prompt) {
        // Skip this test if no prompts are available
        console.log("   ⚠️ No prompts available in database, skipping test");
        return;
      }

      const session = await writingPracticeService.createSession(
        testUserId,
        {
          sessionType: "interview_response",
          prompt: prompt.promptText,
          promptId: prompt.id,
        }
      );

      if (!session.id) {
        throw new Error("Session was not created");
      }

      createdSessionIds.push(session.id);
      console.log("   ✓ Session created with prompt ID successfully");
    });

    // Test 8: Error Handling - Invalid Session ID
    await runTest("Error Handling - Invalid Session ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const session = await writingPracticeService.getSessionById(
        fakeId,
        testUserId
      );

      if (session !== null) {
        throw new Error("Should return null for non-existent session");
      }

      console.log("   ✓ Correctly handled invalid session ID");
    });

    // Test 9: Error Handling - Missing Prompt
    await runTest("Error Handling - Missing Prompt", async () => {
      try {
        await writingPracticeService.createSession(testUserId, {
          sessionType: "interview_response",
          // Missing prompt
        });
        throw new Error("Should have thrown error for missing prompt");
      } catch (error) {
        if (!error.message.includes("Prompt is required")) {
          throw error;
        }
        console.log("   ✓ Correctly validated required prompt");
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
      console.log("\n🎉 All writing practice functionality tests passed!");
      console.log("\n✅ Core writing practice components are working correctly:");
      console.log("   • Session creation");
      console.log("   • Session retrieval");
      console.log("   • Session updates");
      console.log("   • Session filtering");
      console.log("   • Response tracking");
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

