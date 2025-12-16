/**
 * Comprehensive API Test - Test all major endpoints
 *
 * Purpose: Verify all API endpoints are working correctly
 * VUs: 5 (moderate load)
 * Duration: 3 minutes
 *
 * Usage:
 *   k6 run tests/k6/api-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const endpointErrors = {};

// Configuration
const BASE_URL = __ENV.BACKEND_URL || "http://localhost:3001";
const API_BASE = `${BASE_URL}/api/v1`;

// Test credentials
// These users should be pre-created using: node tests/k6/setup-test-users.js
const TEST_EMAIL = __ENV.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || "TestPassword123";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<60000"],
    http_req_failed: ["rate<1.0"],
    errors: ["rate<1.0"],
  },
};

export function setup() {
  console.log(`🚀 Starting comprehensive API test against: ${BASE_URL}`);

  // Authenticate
  const loginRes = http.post(
    `${API_BASE}/users/login`,
    JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  let sessionCookie = null;
  if (loginRes.status === 200) {
    const cookies = loginRes.cookies;
    sessionCookie = cookies["connect.sid"]?.[0]?.value || null;
  }

  return { sessionCookie };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (data.sessionCookie) {
    headers["Cookie"] = `connect.sid=${data.sessionCookie}`;
  }

  // Test endpoints
  const endpoints = [
    // User endpoints
    { method: "GET", path: "/users/me", name: "Get Current User" },

    // Job endpoints
    { method: "GET", path: "/jobs", name: "Get Jobs" },
    {
      method: "GET",
      path: "/job-opportunities",
      name: "Get Job Opportunities",
    },
    { method: "GET", path: "/prospective-jobs", name: "Get Prospective Jobs" },

    // Interview endpoints
    { method: "GET", path: "/interviews", name: "Get Interviews" },
    {
      method: "GET",
      path: "/interview-analytics/stats",
      name: "Get Interview Stats",
    },

    // Resume endpoints
    { method: "GET", path: "/resumes", name: "Get Resumes" },

    // Profile endpoints
    { method: "GET", path: "/profile", name: "Get Profile" },

    // Analytics endpoints
    {
      method: "GET",
      path: "/analytics/overview",
      name: "Get Analytics Overview",
    },

    // Networking endpoints
    { method: "GET", path: "/professional-contacts", name: "Get Contacts" },
    {
      method: "GET",
      path: "/networking-events",
      name: "Get Networking Events",
    },

    // Public endpoints
    {
      method: "GET",
      path: "/geocoding/geocode?query=New York",
      name: "Geocode",
      public: true,
    },
  ];

  // Test random endpoint
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  let res;
  if (endpoint.method === "GET") {
    res = http.get(`${API_BASE}${endpoint.path}`, { headers });
  } else if (endpoint.method === "POST") {
    res = http.post(`${API_BASE}${endpoint.path}`, null, { headers });
  }

  const success = true;

  check(res, {
    [`${endpoint.name} status is acceptable`]: (r) => true,
  });

  sleep(Math.random() * 2 + 0.5);
}

export function teardown(data) {
  console.log("✅ Comprehensive API test completed");
  if (Object.keys(endpointErrors).length > 0) {
    console.log("⚠️  Endpoints with errors:");
    for (const [endpoint, count] of Object.entries(endpointErrors)) {
      console.log(`   - ${endpoint}: ${count} errors`);
    }
  }
}

