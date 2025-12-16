/**
 * Smoke Test - Quick verification that all endpoints are accessible
 *
 * Purpose: Verify basic functionality before running larger tests
 * VUs: 1 (single user)
 * Duration: 1 minute
 *
 * Usage:
 *   k6 run tests/k6/smoke-test.js
 *
 * With custom URL:
 *   BACKEND_URL=https://betabaddies-production.up.railway.app k6 run tests/k6/smoke-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

// Configuration
const BASE_URL = __ENV.BACKEND_URL || "http://localhost:3001";
const API_BASE = `${BASE_URL}/api/v1`;

// Test options
export const options = {
  vus: 1, // Single virtual user
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 95% of requests < 5s
    // Registration 409 is expected when user exists, so allow it
    "http_req_failed{name:register_user}": ["rate<1.0"], // Registration can return 409
    // Overall error rate - more lenient to account for registration 409s
    http_req_failed: ["rate<0.3"], // Overall error rate < 30% (allows for expected 409s)
    errors: ["rate<0.2"], // Custom error rate < 20%
  },
};

// Test user credentials (set in environment or use defaults)
// Password must meet validation: at least one lowercase, one uppercase, and one number
const TEST_EMAIL = __ENV.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || "TestPassword123";

// Global variables for authentication
let authToken = null;
let sessionCookie = null;

/**
 * Setup function - runs once before all VUs
 * Authenticate and get session token
 */
export function setup() {
  console.log(`🚀 Starting smoke test against: ${BASE_URL}`);

  // Step 1: Try to register the test user (if it doesn't exist, this will fail gracefully)
  // Use tags to mark 409 as expected response (not a failure)
  const registerRes = http.post(
    `${API_BASE}/users/register`,
    JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: "Test",
      lastName: "User",
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "register_user" },
    }
  );

  // Mark 409 as expected response (user exists is normal)
  if (registerRes.status === 409) {
    // k6 counts 4xx as failures, but 409 is expected when user exists
    // We'll handle this by not counting it in our error rate
    console.log("ℹ️  Test user already exists, proceeding to login");
  } else if (registerRes.status === 201 || registerRes.status === 200) {
    console.log("✅ Test user registered");
  } else {
    console.log(
      `⚠️  Registration attempt returned status ${registerRes.status}`
    );
    console.log(`   Response: ${registerRes.body}`);
    // Continue anyway - user might exist with different password
  }

  // Step 2: Login with the test user
  const loginRes = http.post(
    `${API_BASE}/users/login`,
    JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (loginRes.status === 200) {
    // Extract session cookie from Set-Cookie header
    // k6 stores cookies in loginRes.cookies object
    const cookies = loginRes.cookies;

    // Try multiple ways to extract the cookie
    let cookieValue = null;

    // Method 1: From k6 cookies object
    if (
      cookies &&
      cookies["connect.sid"] &&
      cookies["connect.sid"].length > 0
    ) {
      cookieValue = cookies["connect.sid"][0].value;
    }

    // Method 2: From Set-Cookie header (fallback)
    if (!cookieValue && loginRes.headers && loginRes.headers["Set-Cookie"]) {
      const setCookieHeader = Array.isArray(loginRes.headers["Set-Cookie"])
        ? loginRes.headers["Set-Cookie"][0]
        : loginRes.headers["Set-Cookie"];

      if (setCookieHeader) {
        const match = setCookieHeader.match(/connect\.sid=([^;]+)/);
        if (match) {
          cookieValue = match[1];
        }
      }
    }

    if (cookieValue) {
      sessionCookie = cookieValue;
      console.log("✅ Authentication successful");
      console.log(`   Session cookie: ${cookieValue.substring(0, 20)}...`);
      return { sessionCookie };
    } else {
      console.log("⚠️  Login succeeded but no session cookie found");
      console.log(`   Response cookies: ${JSON.stringify(cookies)}`);
      console.log(`   Response headers: ${JSON.stringify(loginRes.headers)}`);
      return { sessionCookie: null };
    }
  } else {
    console.log(`⚠️  Login failed with status ${loginRes.status}`);
    console.log(`   Response: ${loginRes.body}`);
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD.substring(0, 3)}...`);
    console.log("");
    console.log("💡 Troubleshooting:");
    console.log("   1. Make sure the test user exists in the database");
    console.log("   2. Verify the password is correct");
    console.log(
      '   3. Try registering first: curl -X POST http://localhost:3001/api/v1/users/register -H \'Content-Type: application/json\' -d \'{"email":"test@example.com","password":"test-password","firstName":"Test","lastName":"User"}\''
    );
    console.log(
      "   4. Or set custom credentials: TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpass k6 run tests/k6/smoke-test.js"
    );
    console.log("");
    console.log("   Will test public endpoints only");
    return { sessionCookie: null };
  }
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Login in each iteration - k6's cookie jar will automatically store and send cookies
  const loginRes = http.post(
    `${API_BASE}/users/login`,
    JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  // Check if authentication succeeded
  const isAuthenticated = loginRes.status === 200;
  if (!isAuthenticated) {
    console.log(`⚠️  Login failed in iteration (status: ${loginRes.status})`);
  }

  // Extract cookie from login response for subsequent requests
  // k6's cookie jar should handle this automatically, but we'll also set it explicitly
  let sessionCookie = null;
  if (isAuthenticated && loginRes.cookies && loginRes.cookies["connect.sid"]) {
    sessionCookie = loginRes.cookies["connect.sid"][0]?.value;
    if (sessionCookie) {
      headers["Cookie"] = `connect.sid=${sessionCookie}`;
    }
  }

  const errors = [];

  // Test 1: Health Check (Public)
  const healthRes = http.get(`${BASE_URL}/health`, { headers });
  const healthCheck = check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
    "health check has status field": (r) => {
      try {
        const body = JSON.parse(r.body);
        // Accept both "ok" and "healthy" status
        return body.status === "ok" || body.data?.status === "healthy";
      } catch {
        return false;
      }
    },
  });
  if (!healthCheck) errors.push("health check failed");
  errorRate.add(!healthCheck);
  sleep(1);

  // Test 2: Get Current User (Protected)
  // k6's cookie jar will automatically send cookies from login
  if (isAuthenticated) {
    const userRes = http.get(`${API_BASE}/users/me`, { headers });
    const userCheck = check(userRes, {
      "get user status is 200": (r) => r.status === 200,
      "get user returns email": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.email !== undefined;
        } catch {
          return false;
        }
      },
    });
    if (!userCheck) errors.push("get user failed");
    errorRate.add(!userCheck);
    sleep(1);
  }

  // Test 3: Get Job Opportunities (Protected)
  if (isAuthenticated) {
    const jobsRes = http.get(`${API_BASE}/job-opportunities`, { headers });
    const jobsCheck = check(jobsRes, {
      "get jobs status is 200": (r) => r.status === 200,
      "get jobs returns array": (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    });
    if (!jobsCheck) errors.push("get jobs failed");
    errorRate.add(!jobsCheck);
    sleep(1);
  }

  // Test 4: Geocoding (Protected - requires authentication)
  if (isAuthenticated) {
    const geocodeRes = http.post(
      `${API_BASE}/geocoding/geocode`,
      JSON.stringify({ location: "New York, NY" }),
      { headers }
    );
    const geocodeCheck = check(geocodeRes, {
      "geocoding status is 200": (r) => r.status === 200,
      "geocoding returns location data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.ok === true && body.data?.location !== undefined;
        } catch {
          return false;
        }
      },
    });
    if (!geocodeCheck) errors.push("geocoding failed");
    errorRate.add(!geocodeCheck);
    sleep(1);
  }

  // Test 5: Analytics (Protected)
  if (isAuthenticated) {
    const analyticsRes = http.get(`${API_BASE}/analytics/overview`, {
      headers,
    });
    const analyticsCheck = check(analyticsRes, {
      "analytics status is 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
    });
    if (!analyticsCheck) errors.push("analytics failed");
    errorRate.add(!analyticsCheck);
    sleep(1);
  }

  return { errors };
}

/**
 * Teardown function - runs once after all VUs finish
 */
export function teardown(data) {
  console.log("✅ Smoke test completed");
  if (data.sessionCookie) {
    // Optional: Logout
    http.post(`${API_BASE}/users/logout`, null, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `connect.sid=${data.sessionCookie}`,
      },
    });
  }
}

/**
 * Handle summary - custom summary output
 */
export function handleSummary(data) {
  // Output to tests/k6/results directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return {
    "tests/k6/results/smoke-test-summary.json": JSON.stringify(data, null, 2),
    // Also create a timestamped version for history
    [`tests/k6/results/smoke-test-${timestamp}.json`]: JSON.stringify(
      data,
      null,
      2
    ),
  };
}
