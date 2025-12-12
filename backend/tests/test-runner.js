#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all test files and provides a cohesive summary of passed/failed tests
 */

import { spawn } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = [
  { name: "Login Functionality", file: "login-functionality.test.js" },
  { name: "User API", file: "user-api.test.js" },
  { name: "Jobs Service", file: "jobs-service.test.js" },
  { name: "Jobs API", file: "jobs-api.test.js" },
  { name: "Job Opportunities API", file: "job-opportunities-api.test.js" },
  {
    name: "Certifications Functionality",
    file: "certifications-functionality.test.js",
  },
  { name: "Certifications API", file: "certifications-api.test.js" },
  { name: "Profile API", file: "profile-api.test.js" },
  { name: "Projects API", file: "projects-api.test.js" },
  {
    name: "Interview Analytics Functionality",
    file: "interview-analytics-functionality.test.js",
  },
  { name: "Interview Analytics API", file: "interview-analytics-api.test.js" },
  {
    name: "Reset Password Functionality",
    file: "reset-password-functionality.test.js",
  },
  { name: "Reset Password API", file: "reset-password-api.test.js" },
  { name: "Education Functionality", file: "education-functionality.test.js" },
  { name: "Skills Functionality", file: "skills-functionality.test.js" },
  { name: "Projects Functionality", file: "projects-functionality.test.js" },
  {
    name: "File Upload Functionality",
    file: "file-upload-functionality.test.js",
  },
  { name: "File Upload API", file: "file-upload-api.test.js" },
  { name: "Resume Services", file: "resume-services-test.js" },
  {
    name: "Writing Practice Functionality",
    file: "writing-practice-functionality.test.js",
  },
  {
    name: "Writing Prompts Functionality",
    file: "writing-prompts-functionality.test.js",
  },
  {
    name: "Support Groups Functionality",
    file: "support-groups-functionality.test.js",
  },
  {
    name: "Salary Negotiation Functionality",
    file: "salary-negotiation-functionality.test.js",
  },
  {
    name: "Interview Prediction Functionality",
    file: "interview-prediction-functionality.test.js",
  },
  { name: "Frontend GitHub Actions", file: "frontend-github-actions.test.js" },
];

const testResults = [];

function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = join(__dirname, testFile.file);
    const child = spawn("node", [testPath], {
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      // Show output in CI or when tests fail
      if (process.env.CI || process.env.SHOW_TEST_OUTPUT) {
        process.stdout.write(output);
      }
    });

    child.stderr.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      // Always show stderr (errors)
      process.stderr.write(output);
    });

    child.on("close", (code) => {
      let passed = 0;
      let failed = 0;
      let total = 0;

      // Method 1: Try to extract from "Test Summary" section (most common format)
      // Matches patterns like:
      // "Total Tests: 5"
      // "Passed: 4"
      // "Failed: 1"
      const summarySection = stdout.match(/Test Summary[\s\S]{0,500}/i);
      if (summarySection) {
        const summaryText = summarySection[0];

        // Try various patterns for total
        const totalPatterns = [
          /Total Tests?[^:]*:\s*(\d+)/i,
          /Total[^:]*:\s*(\d+)/i,
          /📝\s*Total[^:]*:\s*(\d+)/i,
        ];
        for (const pattern of totalPatterns) {
          const match = summaryText.match(pattern);
          if (match) {
            total = parseInt(match[1]) || 0;
            break;
          }
        }

        // Try various patterns for passed
        const passedPatterns = [
          /✅\s*Passed[^:]*:\s*(\d+)/i,
          /Passed[^:]*:\s*(\d+)/i,
          /✅\s*(\d+)/i,
        ];
        for (const pattern of passedPatterns) {
          const match = summaryText.match(pattern);
          if (match) {
            passed = parseInt(match[1]) || 0;
            break;
          }
        }

        // Try various patterns for failed
        const failedPatterns = [
          /❌\s*Failed[^:]*:\s*(\d+)/i,
          /Failed[^:]*:\s*(\d+)/i,
          /❌\s*(\d+)/i,
        ];
        for (const pattern of failedPatterns) {
          const match = summaryText.match(pattern);
          if (match) {
            failed = parseInt(match[1]) || 0;
            break;
          }
        }
      }

      // Method 2: Count test markers if we still don't have totals
      if (total === 0) {
        const testMarkers = stdout.match(/📋 Test:/g);
        if (testMarkers) {
          total = testMarkers.length;
        }
      }

      // Method 3: Count PASSED/FAILED markers
      if (passed === 0 || failed === 0) {
        const passedMarkers = stdout.match(/✅ PASSED:/g);
        const failedMarkers = stdout.match(/❌ FAILED:/g);

        if (passedMarkers) {
          passed = passedMarkers.length;
        }
        if (failedMarkers) {
          failed = failedMarkers.length;
        }

        // If we have markers but no total, calculate it
        if (total === 0 && (passed > 0 || failed > 0)) {
          total = passed + failed;
        }
      }

      // Method 4: Use exit code as fallback
      if (total === 0 && code !== null) {
        if (code === 0) {
          // Success - try to infer from test markers
          const testMarkers = stdout.match(/📋 Test:/g);
          if (testMarkers) {
            total = testMarkers.length;
            passed = total;
            failed = 0;
          } else {
            // Assume at least one test ran successfully
            total = 1;
            passed = 1;
            failed = 0;
          }
        } else {
          // Failure - at least one test failed
          const testMarkers = stdout.match(/📋 Test:/g);
          if (testMarkers) {
            total = testMarkers.length;
            failed = 1;
            passed = total > 0 ? total - 1 : 0;
          } else {
            total = 1;
            passed = 0;
            failed = 1;
          }
        }
      }

      resolve({
        name: testFile.name,
        file: testFile.file,
        passed,
        failed,
        total: total || passed + failed,
        exitCode: code,
        success: code === 0,
      });
    });

    child.on("error", (error) => {
      resolve({
        name: testFile.name,
        file: testFile.file,
        passed: 0,
        failed: 1,
        total: 1,
        exitCode: 1,
        success: false,
        error: error.message,
      });
    });
  });
}

async function runAllTests() {
  console.log("🚀 Starting Comprehensive Test Suite");
  console.log(`📦 Running ${testFiles.length} test suites...\n`);

  const startTime = Date.now();

  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    process.stdout.write(
      `[${i + 1}/${testFiles.length}] Running ${testFile.name}... `
    );

    const result = await runTest(testFile);
    testResults.push(result);

    // Show quick status
    if (result.success) {
      process.stdout.write(`✅ PASSED (${result.passed}/${result.total})\n`);
    } else {
      process.stdout.write(
        `❌ FAILED (${result.failed}/${result.total} failed)\n`
      );
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print comprehensive summary
  printSummary(duration);
}

function printSummary(duration) {
  console.log("\n\n");
  console.log("╔" + "═".repeat(78) + "╗");
  console.log(
    "║" +
      " ".repeat(20) +
      "📊 COMPREHENSIVE TEST SUMMARY" +
      " ".repeat(25) +
      "║"
  );
  console.log("╚" + "═".repeat(78) + "╝");
  console.log();

  // Overall statistics
  const totalTests = testResults.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = testResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = testResults.reduce((sum, r) => sum + r.failed, 0);
  const suitesPassed = testResults.filter((r) => r.success).length;
  const suitesFailed = testResults.filter((r) => !r.success).length;
  const successRate =
    totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

  console.log("📈 Overall Statistics:");
  console.log("─".repeat(60));
  console.log(`   Total Test Suites:     ${testResults.length}`);
  console.log(`   ✅ Suites Passed:       ${suitesPassed}`);
  console.log(`   ❌ Suites Failed:       ${suitesFailed}`);
  console.log(`   Total Tests:           ${totalTests}`);
  console.log(`   ✅ Tests Passed:        ${totalPassed}`);
  console.log(`   ❌ Tests Failed:        ${totalFailed}`);
  console.log(`   📊 Success Rate:       ${successRate}%`);
  console.log(`   ⏱️  Duration:            ${duration}s`);
  console.log();

  // Detailed breakdown by test suite
  console.log("📋 Detailed Breakdown by Test Suite:");
  console.log("─".repeat(60));

  testResults.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    const statusText = result.success ? "PASSED" : "FAILED";
    const padding = " ".repeat(Math.max(0, 45 - result.name.length));

    console.log(
      `   ${status} [${String(index + 1).padStart(2, "0")}] ${
        result.name
      }${padding} ${statusText}`
    );
    console.log(
      `      Tests: ${result.passed}/${result.total} passed, ${result.failed} failed`
    );

    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });

  console.log();

  // Failed tests section
  if (totalFailed > 0) {
    console.log("❌ Failed Test Suites:");
    console.log("─".repeat(60));

    testResults
      .filter((r) => !r.success || r.failed > 0)
      .forEach((result) => {
        console.log(`   • ${result.name} (${result.file})`);
        console.log(`     Failed: ${result.failed}/${result.total} tests`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      });
    console.log();
  }

  // Passed tests section
  if (totalPassed > 0) {
    console.log("✅ Passed Test Suites:");
    console.log("─".repeat(60));

    testResults
      .filter((r) => r.success && r.failed === 0)
      .forEach((result) => {
        console.log(
          `   • ${result.name} (${result.passed}/${result.total} tests)`
        );
      });
    console.log();
  }

  // Final status
  console.log("╔" + "═".repeat(78) + "╗");
  if (totalFailed === 0 && suitesFailed === 0) {
    console.log(
      "║" + " ".repeat(25) + "🎉 ALL TESTS PASSED!" + " ".repeat(30) + "║"
    );
  } else {
    console.log(
      "║" +
        " ".repeat(20) +
        `⚠️  ${totalFailed} TEST(S) FAILED IN ${suitesFailed} SUITE(S)` +
        " ".repeat(15) +
        "║"
    );
  }
  console.log("╚" + "═".repeat(78) + "╝");
  console.log();

  // Exit with appropriate code
  if (totalFailed > 0 || suitesFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run all tests
runAllTests().catch((error) => {
  console.error("\n❌ Test runner failed:", error);
  process.exit(1);
});
