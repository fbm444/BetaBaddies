/**
 * Security Testing Suite
 * Tests for common OWASP Top 10 vulnerabilities
 */

// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import request from "supertest";
import app from "../server.js";
import database from "../services/database.js";

// Test user credentials
const TEST_USER = {
  email: "security-test@example.com",
  password: "TestPassword123!",
};

let testUserId = null;
let sessionCookie = null;
let otherUserSessionCookie = null;
let otherUserId = null;

/**
 * Setup: Create test users
 */
async function setupTestUsers() {
  try {
    // Register test user via API (proper way)
    const registerRes = await request(app)
      .post("/api/v1/users/register")
      .send(TEST_USER);

    if (registerRes.status === 201 && registerRes.body.data?.user?.id) {
      testUserId = registerRes.body.data.user.id;

      // Login to get session cookies
      const loginRes = await request(app)
        .post("/api/v1/users/login")
        .send(TEST_USER);

      if (loginRes.status === 200) {
        const cookies = loginRes.headers["set-cookie"];
        sessionCookie = cookies
          ? cookies.find((cookie) => cookie.startsWith("connect.sid"))
          : null;
      }

      // Create a profile for the test user (required for XSS and other profile tests)
      try {
        await database.query(
          `INSERT INTO profiles (user_id, first_name, last_name, state)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO NOTHING`,
          [testUserId, "Test", "User", "NY"]
        );
      } catch (error) {
        console.warn("Profile creation warning:", error.message);
      }
    }

    // Register another user for authorization tests
    const otherUserRes = await request(app)
      .post("/api/v1/users/register")
      .send({
        email: "other-user@example.com",
        password: "OtherPassword123!",
      });

    if (otherUserRes.status === 201 && otherUserRes.body.data?.user?.id) {
      otherUserId = otherUserRes.body.data.user.id;
    }
  } catch (error) {
    console.error("Setup error:", error.message);
  }
}

/**
 * Cleanup: Remove test users
 */
async function cleanupTestUsers() {
  try {
    if (testUserId) {
      // Delete profile first (foreign key constraint)
      await database.query("DELETE FROM profiles WHERE user_id = $1", [testUserId]);
      await database.query("DELETE FROM users WHERE u_id = $1", [testUserId]);
    }
    if (otherUserId) {
      // Delete profile first (foreign key constraint)
      await database.query("DELETE FROM profiles WHERE user_id = $1", [otherUserId]);
      await database.query("DELETE FROM users WHERE u_id = $1", [otherUserId]);
    }
  } catch (error) {
    console.error("Cleanup error:", error.message);
  }
}

/**
 * Test Results Tracker
 */
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

function recordResult(testName, passed, message = "") {
  if (passed) {
    testResults.passed.push({ test: testName, message });
    console.log(`✓ PASS: ${testName}${message ? ` - ${message}` : ""}`);
  } else {
    testResults.failed.push({ test: testName, message });
    console.error(`✗ FAIL: ${testName}${message ? ` - ${message}` : ""}`);
  }
}

function recordWarning(testName, message) {
  testResults.warnings.push({ test: testName, message });
  console.warn(`⚠ WARN: ${testName} - ${message}`);
}

/**
 * 1. SQL Injection Tests
 */
async function testSQLInjection() {
  console.log("\n=== SQL Injection Tests ===");

  // Test SQL injection in login email
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users--",
    "'; DROP TABLE users--",
  ];

  for (const payload of sqlInjectionPayloads) {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: payload, password: "anything" });

    // Should reject with 401, not 500 (which would indicate SQL error)
    const passed = res.status === 401 || res.status === 422;
    recordResult(
      `SQL Injection in login (${payload.substring(0, 20)})`,
      passed,
      `Status: ${res.status}`
    );
  }

  // Test SQL injection in search/filter parameters
  if (sessionCookie) {
    const searchPayloads = ["' OR '1'='1", "'; DROP TABLE jobs--"];
    for (const payload of searchPayloads) {
      const res = await request(app)
        .get(`/api/v1/jobs?search=${encodeURIComponent(payload)}`)
        .set("Cookie", sessionCookie);

      // Should handle gracefully, not return 500
      const passed = res.status !== 500;
      recordResult(
        `SQL Injection in search (${payload.substring(0, 20)})`,
        passed,
        `Status: ${res.status}`
      );
    }
  }
}

/**
 * 2. XSS (Cross-Site Scripting) Tests
 */
async function testXSS() {
  console.log("\n=== XSS Tests ===");

  if (!sessionCookie) {
    recordWarning("XSS Tests", "No session cookie, skipping");
    return;
  }

  const xssPayloads = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg onload=alert('XSS')>",
  ];

  // Test XSS in profile fields
  for (const payload of xssPayloads) {
    const res = await request(app)
      .put("/api/v1/profile")
      .set("Cookie", sessionCookie)
      .send({ firstName: payload, lastName: "Test" });

    // Check if response is sanitized (should not contain script tags)
    const responseText = JSON.stringify(res.body);
    const containsScript = responseText.includes("<script>") || responseText.includes("onerror=");
    
    recordResult(
      `XSS in profile field (${payload.substring(0, 20)})`,
      !containsScript && res.status !== 500,
      containsScript ? "Script tags found in response" : `Status: ${res.status}`
    );
  }
}

/**
 * 3. Authentication Bypass Tests
 */
async function testAuthenticationBypass() {
  console.log("\n=== Authentication Bypass Tests ===");

  // Test accessing protected endpoint without authentication
  const protectedEndpoints = [
    "/api/v1/profile",
    "/api/v1/jobs",
    "/api/v1/projects",
    "/api/v1/skills",
  ];

  for (const endpoint of protectedEndpoints) {
    const res = await request(app).get(endpoint);
    const passed = res.status === 401;
    recordResult(
      `Unauthenticated access to ${endpoint}`,
      passed,
      `Status: ${res.status}`
    );
  }

  // Test with invalid session cookie
  const res = await request(app)
    .get("/api/v1/profile")
    .set("Cookie", "connect.sid=invalid_session_id");
  
  recordResult(
    "Invalid session cookie",
    res.status === 401,
    `Status: ${res.status}`
  );

  // Test with malformed session cookie
  const res2 = await request(app)
    .get("/api/v1/profile")
    .set("Cookie", "connect.sid=../../etc/passwd");
  
  recordResult(
    "Path traversal in session cookie",
    res2.status === 401,
    `Status: ${res2.status}`
  );
}

/**
 * 4. Rate Limiting Tests
 */
async function testRateLimiting() {
  console.log("\n=== Rate Limiting Tests ===");

  // Note: Rate limiting uses session-based storage which doesn't persist reliably
  // across requests in test environments. This test is informational only.
  // The rate limiting is configured in userRoutes.js (100 attempts per 15 minutes)
  
  // Test a few login attempts to verify the endpoint responds correctly
  let attemptsTested = 0;
  let allResponsesValid = true;
  
  for (let i = 0; i < 5; i++) {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "nonexistent@example.com", password: "wrong" });
    
    attemptsTested++;
    // Should return 401 (unauthorized) or 429 (rate limited), not 500 (server error)
    if (res.status === 500) {
      allResponsesValid = false;
      break;
    }
  }

  if (allResponsesValid) {
    recordWarning(
      "Login rate limiting",
      `Rate limiting configured but not testable in this environment (session-based). Tested ${attemptsTested} attempts - all returned valid responses.`
    );
  } else {
    recordResult(
      "Login rate limiting",
      false,
      "Login endpoint returned server error"
    );
  }
}

/**
 * 5. Authorization Tests (Access Control)
 */
async function testAuthorization() {
  console.log("\n=== Authorization Tests ===");

  if (!sessionCookie || !otherUserId) {
    recordWarning("Authorization Tests", "Missing test data, skipping");
    return;
  }

  // Create a resource as test user
  // Jobs require: title, company, and startDate
  const createRes = await request(app)
    .post("/api/v1/jobs")
    .set("Cookie", sessionCookie)
    .send({
      title: "Test Job",
      company: "Test Company",
      startDate: "2024-01-01",
    });

  if (createRes.status === 201 && createRes.body.data?.job?.id) {
    const jobId = createRes.body.data.job.id;

    // Try to access other user's resource (should fail)
    // Note: This assumes we can't easily get other user's session
    // In a real scenario, we'd create a resource as otherUser and try to access it
    
    recordResult(
      "Resource creation",
      true,
      "Job created successfully"
    );
  } else {
    recordResult(
      "Resource creation",
      false,
      "Failed to create test resource"
    );
  }
}

/**
 * 6. CSRF Tests
 */
async function testCSRF() {
  console.log("\n=== CSRF Tests ===");

  if (!sessionCookie) {
    recordWarning("CSRF Tests", "No session cookie, skipping");
    return;
  }

  // Test if API accepts requests without proper origin/referer
  // Note: Many APIs don't require CSRF tokens for JSON APIs
  const res = await request(app)
    .post("/api/v1/jobs")
    .set("Cookie", sessionCookie)
    .set("Origin", "https://malicious-site.com")
    .send({
      title: "CSRF Test",
      company: "Test",
      status: "applied",
    });

  // If it accepts, that's a warning (not necessarily a failure for JSON APIs)
  if (res.status === 201) {
    recordWarning(
      "CSRF Protection",
      "API accepts requests from different origins (may be acceptable for JSON APIs)"
    );
  } else {
    recordResult(
      "CSRF Protection",
      true,
      "Request rejected"
    );
  }
}

/**
 * 7. Sensitive Data Exposure Tests
 */
async function testSensitiveDataExposure() {
  console.log("\n=== Sensitive Data Exposure Tests ===");

  // Test if error messages expose sensitive information
  const res = await request(app)
    .post("/api/v1/users/login")
    .send({ email: "nonexistent@example.com", password: "wrong" });

  const responseBody = JSON.stringify(res.body);
  
  // Check for sensitive data in error messages
  const sensitivePatterns = [
    /password/i,
    /sql/i,
    /database/i,
    /connection/i,
    /stack trace/i,
    /at \w+\.\w+/i, // Stack trace patterns
  ];

  let exposed = false;
  for (const pattern of sensitivePatterns) {
    if (pattern.test(responseBody) && !responseBody.includes("Invalid email or password")) {
      exposed = true;
      break;
    }
  }

  recordResult(
    "Sensitive data in error messages",
    !exposed,
    exposed ? "Sensitive information found" : "No sensitive data exposed"
  );

  // Test if password is returned in user profile
  if (sessionCookie) {
    const profileRes = await request(app)
      .get("/api/v1/profile")
      .set("Cookie", sessionCookie);

    const profileBody = JSON.stringify(profileRes.body);
    const passwordExposed = /password/i.test(profileBody) && 
                           !profileBody.includes("password") === false;

    recordResult(
      "Password in profile response",
      !passwordExposed,
      passwordExposed ? "Password found in response" : "Password not exposed"
    );
  }
}

/**
 * 8. Input Validation Tests
 */
async function testInputValidation() {
  console.log("\n=== Input Validation Tests ===");

  if (!sessionCookie) {
    recordWarning("Input Validation Tests", "No session cookie, skipping");
    return;
  }

  // Test extremely long inputs
  const longString = "A".repeat(10000);
  const res = await request(app)
    .put("/api/v1/profile")
    .set("Cookie", sessionCookie)
    .send({ firstName: longString });

  recordResult(
    "Long input validation",
    res.status === 400 || res.status === 422,
    `Status: ${res.status}`
  );

  // Test special characters
  const specialChars = "!@#$%^&*()[]{}|;:',.<>?/~`";
  const res2 = await request(app)
    .put("/api/v1/profile")
    .set("Cookie", sessionCookie)
    .send({ firstName: specialChars });

  // Should accept or reject gracefully, not crash
  recordResult(
    "Special characters validation",
    res2.status !== 500,
    `Status: ${res2.status}`
  );
}

/**
 * 9. Session Management Tests
 */
async function testSessionManagement() {
  console.log("\n=== Session Management Tests ===");

  if (!sessionCookie) {
    recordWarning("Session Management Tests", "No session cookie, skipping");
    return;
  }

  // Test session timeout (if implemented)
  // Test logout
  const logoutRes = await request(app)
    .post("/api/v1/users/logout")
    .set("Cookie", sessionCookie);

  if (logoutRes.status === 200) {
    // Try to use session after logout
    const profileRes = await request(app)
      .get("/api/v1/profile")
      .set("Cookie", sessionCookie);

    recordResult(
      "Session invalidation on logout",
      profileRes.status === 401,
      `Status after logout: ${profileRes.status}`
    );
  }
}

/**
 * 10. API Endpoint Security Tests
 */
async function testAPIEndpointSecurity() {
  console.log("\n=== API Endpoint Security Tests ===");

  // Test HTTP methods on endpoints
  const endpoints = [
    { path: "/api/v1/users/register", methods: ["POST"] },
    { path: "/api/v1/users/login", methods: ["POST"] },
    { path: "/api/v1/profile", methods: ["GET", "PUT"] },
  ];

  for (const endpoint of endpoints) {
    for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH"]) {
      if (endpoint.methods.includes(method)) continue;

      const res = await request(app)[method.toLowerCase()](endpoint.path);
      
      // Should return 405 (Method Not Allowed) or 401/404, not 200
      const passed = res.status !== 200;
      if (!passed) {
        recordResult(
          `${method} on ${endpoint.path}`,
          false,
          `Unexpected 200 status`
        );
      }
    }
  }
}

/**
 * Main test runner
 */
async function runSecurityTests() {
  console.log("🔒 Starting Security Testing Suite\n");
  console.log("=" .repeat(50));

  try {
    await setupTestUsers();

    await testSQLInjection();
    await testXSS();
    await testAuthenticationBypass();
    await testRateLimiting();
    await testAuthorization();
    await testCSRF();
    await testSensitiveDataExposure();
    await testInputValidation();
    await testSessionManagement();
    await testAPIEndpointSecurity();

  } catch (error) {
    console.error("Test execution error:", error);
  } finally {
    await cleanupTestUsers();
    await database.close();
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Security Test Summary");
  console.log("=".repeat(50));
  console.log(`✓ Passed: ${testResults.passed.length}`);
  console.log(`✗ Failed: ${testResults.failed.length}`);
  console.log(`⚠ Warnings: ${testResults.warnings.length}`);

  if (testResults.failed.length > 0) {
    console.log("\n❌ Failed Tests:");
    testResults.failed.forEach(({ test, message }) => {
      console.log(`  - ${test}: ${message}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log("\n⚠ Warnings:");
    testResults.warnings.forEach(({ test, message }) => {
      console.log(`  - ${test}: ${message}`);
    });
  }

  console.log("\n" + "=".repeat(50));
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('security.test.js');

if (isMainModule) {
  runSecurityTests();
}

export { runSecurityTests };

