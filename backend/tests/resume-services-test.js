#!/usr/bin/env node

/**
 * Test for resume page services using your actual modules
 * Creates test data, runs tests, and cleans up (via service methods)
 *
 * Designed to mirror your preferred style:
 * - ESM imports
 * - runTest helper
 * - setup/cleanup sections
 * - Clear, emoji-forward console output
 */

import database from "../services/database.js";
import coreService from "../services/resumes/coreService.js";
import validationService from "../services/resumes/validationService.js";
import aiService from "../services/resumes/aiService.js";
import * as indexExports from "../services/resumes/index.js";

console.log("🧪 Testing Resume Services Functionality");
console.log("===============================================\n");

const testUserId = "11111111-1111-1111-1111-111111111111";

// Collected IDs for cleanup
let createdResumeIds = [];

// Results tracker
let testResults = { passed: 0, failed: 0, total: 0 };

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
    console.error(`   Error: ${error?.message || error}`);
    testResults.failed++;
  }
}

// Minimal base resume payload
const baseResume = {
  versionName: "Resume v1",
  description: "Student resume for testing",
  content: {
    personalInfo: {
      firstName: "Tina",
      lastName: "Thai",
      email: "tkt@njit.edu",
      phone: "(555) 555-5555",
      location: "Newark, NJ"
    },
    summary: "NJIT student with projects in web and data.",
    experience: [{
      title: "Software Intern",
      company: "Campus Lab",
      location: "Newark, NJ",
      startDate: "2025-06",
      endDate: "2025-08",
      isCurrent: false,
      description: [
        "Built features in a React + Node stack",
        "Improved SQL query performance by 20%"
      ]
    }],
    education: [{
      degree: "B.S. in Computer Engineering",
      school: "NJIT",
      field: "Computer Engineering",
      endDate: "2025",
      gpa: "3.7"
    }],
    skills: [{ name: "JavaScript" }, { name: "React" }]
  }
};

// Setup: patch AI calls to avoid network if needed
async function setupPatches() {
  if (aiService && typeof aiService.chat === "function") {
    const original = aiService.chat;
    aiService.chat = async (prompt) => {
      return {
        message: JSON.stringify({
          overallScore: 85,
          overallStatus: "good",
          summary: "Solid structure; tighten bullet impact and quantify more results.",
          sectionGrades: [
            { section: "personal", score: 18, maxScore: 20, percentage: 90, status: "excellent", feedback: [] },
            { section: "summary", score: 10, maxScore: 15, percentage: 67, status: "good", feedback: [] },
            { section: "experience", score: 18, maxScore: 25, percentage: 72, status: "good", feedback: [] },
            { section: "education", score: 12, maxScore: 15, percentage: 80, status: "excellent", feedback: [] },
            { section: "skills", score: 10, maxScore: 15, percentage: 67, status: "good", feedback: [] },
            { section: "projects", score: 4, maxScore: 5, percentage: 80, status: "excellent", feedback: [] },
            { section: "certifications", score: 0, maxScore: 5, percentage: 0, status: "poor", feedback: [] }
          ],
          recommendations: ["Quantify outcomes", "Prioritize most relevant bullets first"]
        }),
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      };
    };
    // Keep reference in case you want to restore later:
    aiService.__originalChat = original;
  }
}

async function seedUserProfile() {
  await database.query(
    `INSERT INTO users (u_id, email, password)
     VALUES ($1, $2, $3)
     ON CONFLICT (u_id) DO NOTHING`,
    [testUserId, "resume-tests@example.com", "testing-hash"]
  );

  await database.query(
    `INSERT INTO profiles (
        user_id,
        first_name,
        middle_name,
        last_name,
        phone,
        city,
        state,
        job_title,
        bio,
        industry,
        exp_level
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (user_id) DO NOTHING`,
    [
      testUserId,
      "Tina",
      null,
      "Thai",
      "(555) 555-5555",
      "Newark",
      "NJ",
      "Software Engineer",
      "NJIT student building demos.",
      "Tech",
      "Entry",
    ]
  );
}
// Cleanup: remove created resumes via service delete
async function cleanupTestData() {
  console.log("\n🧹 Cleaning up test data...");
  for (const resumeId of [...createdResumeIds].reverse()) {
    try {
      const res = await coreService.deleteResume(resumeId, testUserId);
      if (res && (res.id || res.success)) {
        console.log(`   ✓ Deleted resume: ${resumeId}`);
      } else {
        console.log(`   • Skipped delete (already removed?): ${resumeId}`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to delete resume ${resumeId}:`, err?.message || err);
    }
  }
  await database.query("DELETE FROM profiles WHERE user_id = $1", [testUserId]);
  await database.query("DELETE FROM users WHERE u_id = $1", [testUserId]);
  console.log(`   📊 Cleaned up ${createdResumeIds.length} resume(s) and user/profile`);
}

// Main test execution
async function runAllTests() {
  try {
    // Optional patches
    await setupPatches();
    await seedUserProfile();

    // Test 1: Create Resume
    let created;
    await runTest("Create Resume", async () => {
      created = await coreService.createResume(testUserId, baseResume);
      if (!created?.id) throw new Error("Missing id on created resume");
      if (created.userId !== testUserId) throw new Error("userId mismatch");
      if (created.versionName !== baseResume.versionName) throw new Error("versionName mismatch");
      createdResumeIds.push(created.id);
      console.log("   ✓ Created:", created.id);
    });

    // Test 2: Get Resumes By User
    await runTest("Get Resumes By User", async () => {
      const rows = await coreService.getResumesByUserId(testUserId, { sort: "-created_at", limit: 10, offset: 0 });
      if (!Array.isArray(rows)) throw new Error("Expected an array");
      if (rows.length < 1) throw new Error("Expected at least one resume");
      console.log(`   ✓ Retrieved ${rows.length} resume(s)`);
    });

    // Test 3: Get Resume By ID
    await runTest("Get Resume By ID", async () => {
      const row = await coreService.getResumeById(created.id, testUserId);
      if (!row || row.id !== created.id) throw new Error("Resume fetch failed");
      console.log("   ✓ Fetched by ID:", row.id);
    });

    // Test 4: Update Resume
    await runTest("Update Resume", async () => {
      const updated = await coreService.updateResume(created.id, testUserId, {
        description: "Updated summary for testing",
        versionName: "Resume v2"
      });
      if (updated.description !== "Updated summary for testing") throw new Error("Description not updated");
      if (updated.versionName !== "Resume v2") throw new Error("versionName not updated");
      console.log("   ✓ Updated fields reflected");
    });

    // Test 5: Duplicate Resume
    await runTest("Duplicate Resume", async () => {
      const dup = await coreService.duplicateResume(created.id, testUserId);
      if (!dup?.id) throw new Error("Duplicate missing id");
      if (!/v2$/i.test(dup.versionName)) throw new Error(`Expected version name to end with v2, got ${dup.versionName}`);
      createdResumeIds.push(dup.id);
      console.log("   ✓ Duplicated:", dup.id, dup.versionName);
    });

    // Test 6: Basic Validation (non-AI)
    await runTest("Validate Resume (non-AI)", async () => {
      const res = await validationService.validateResume(created.id, testUserId);
      if (!res || typeof res !== "object") throw new Error("Expected object result");
      if (!("issues" in res)) throw new Error("Missing issues");
      if (!("isValid" in res)) throw new Error("Missing isValid");
      console.log(`   ✓ Issues: ${Array.isArray(res.issues) ? res.issues.length : 0}`);
    });

    // Test 7: Validation with Grading (AI mocked)
    await runTest("Validate Resume with Grading (AI mocked)", async () => {
      const graded = await validationService.validateResumeWithGrading(created.id, testUserId);
      if (!graded || !("overallStatus" in graded)) throw new Error("Missing overallStatus");
      if (!Array.isArray(graded.sectionGrades)) throw new Error("sectionGrades not array");
      console.log(`   ✓ Grading Status: ${graded.overallStatus}`);
    });

    // Test 8: index.js Exports
    await runTest("index.js Exports", async () => {
      if (!indexExports?.coreService) throw new Error("coreService not exported from index");
      if (!indexExports?.default) throw new Error("default export missing from index");
      console.log("   ✓ index.js exports look good");
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
      console.log("\n🎉 All resume service tests passed!");
      console.log("\n✅ Covered:");
      console.log("   • Create resume");
      console.log("   • Get resumes by user");
      console.log("   • Get resume by ID");
      console.log("   • Update resume");
      console.log("   • Duplicate resume");
      console.log("   • Validation (non-AI)");
      console.log("   • Validation with grading (AI mocked)");
      console.log("   • index.js export wiring");
    }
  } catch (error) {
    console.error("\n❌ Test execution failed:", error?.message || error);
    process.exit(1);
  } finally {
    // Always cleanup
    await cleanupTestData();
    console.log("\n✅ Test cleanup completed");
  }
}

// Run
runAllTests().catch(console.error);
