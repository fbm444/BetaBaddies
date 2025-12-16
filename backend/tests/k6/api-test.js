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
const TEST_EMAIL = __ENV.TEST_USER_EMAIL || "test@example.com";
const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || "test-password";

export const options = {
  vus: 5,
  duration: "3m",
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.05"],
    errors: ["rate<0.05"],
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

  const success =
    res.status === 200 ||
    res.status === 404 ||
    (endpoint.public && res.status === 200);

  check(res, {
    [`${endpoint.name} status is acceptable`]: (r) => success,
  });

  if (!success) {
    if (!endpointErrors[endpoint.name]) {
      endpointErrors[endpoint.name] = 0;
    }
    endpointErrors[endpoint.name]++;
    errorRate.add(1);
  }

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

