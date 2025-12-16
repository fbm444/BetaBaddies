/**
 * Load Test - Standard load testing scenario
 * 
 * Purpose: Test system under normal expected load
 * VUs: 10-50 (gradual ramp-up)
 * Duration: 5 minutes
 * 
 * Usage:
 *   k6 run tests/k6/load-test.js
 * 
 * Custom load:
 *   k6 run --vus 50 --duration 5m tests/k6/load-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";

// Custom metrics
const errorRate = new Rate("errors");
const apiResponseTime = new Trend("api_response_time");

// Configuration
const BASE_URL = __ENV.BACKEND_URL || "http://localhost:3001";
const API_BASE = `${BASE_URL}/api/v1`;

// Test data (shared across VUs)
const testUsers = new SharedArray("test_users", function () {
  return [
    { email: "test1@example.com", password: "test-password" },
    { email: "test2@example.com", password: "test-password" },
    // Add more test users as needed
  ];
});

// Test options
export const options = {
  stages: [
    { duration: "1m", target: 10 }, // Ramp up to 10 VUs
    { duration: "3m", target: 10 }, // Stay at 10 VUs
    { duration: "1m", target: 50 }, // Ramp up to 50 VUs
    { duration: "2m", target: 50 }, // Stay at 50 VUs
    { duration: "1m", target: 0 },  // Ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests < 1s
    http_req_failed: ["rate<0.05"],    // Error rate < 5%
    errors: ["rate<0.05"],
    api_response_time: ["p(95)<800"],  // API response time < 800ms
  },
};

/**
 * Setup - Authenticate and prepare test data
 */
export function setup() {
  console.log(`🚀 Starting load test against: ${BASE_URL}`);

  // Authenticate first user for setup
  const loginRes = http.post(
    `${API_BASE}/users/login`,
    JSON.stringify({
      email: testUsers[0].email,
      password: testUsers[0].password,
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

/**
 * Main test function
 */
export default function (data) {
  // Select random test user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Authenticate
  const loginRes = http.post(
    `${API_BASE}/users/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (loginRes.status !== 200) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const cookies = loginRes.cookies;
  const sessionCookie = cookies["connect.sid"]?.[0]?.value;
  const headers = {
    "Content-Type": "application/json",
    Cookie: `connect.sid=${sessionCookie}`,
  };

  // Test workflow: User journey simulation

  // 1. Get user profile
  const profileStart = Date.now();
  const profileRes = http.get(`${API_BASE}/users/me`, { headers });
  apiResponseTime.add(Date.now() - profileStart);
  check(profileRes, {
    "get profile status is 200": (r) => r.status === 200,
  });
  errorRate.add(profileRes.status !== 200);
  sleep(1);

  // 2. Get job opportunities
  const jobsStart = Date.now();
  const jobsRes = http.get(`${API_BASE}/job-opportunities`, { headers });
  apiResponseTime.add(Date.now() - jobsStart);
  check(jobsRes, {
    "get jobs status is 200": (r) => r.status === 200,
  });
  errorRate.add(jobsRes.status !== 200);
  sleep(1);

  // 3. Get interviews
  const interviewsStart = Date.now();
  const interviewsRes = http.get(`${API_BASE}/interviews`, { headers });
  apiResponseTime.add(Date.now() - interviewsStart);
  check(interviewsRes, {
    "get interviews status is 200": (r) => r.status === 200,
  });
  errorRate.add(interviewsRes.status !== 200);
  sleep(1);

  // 4. Get analytics
  const analyticsStart = Date.now();
  const analyticsRes = http.get(`${API_BASE}/analytics/overview`, { headers });
  apiResponseTime.add(Date.now() - analyticsStart);
  check(analyticsRes, {
    "get analytics status is 200 or 404": (r) => r.status === 200 || r.status === 404,
  });
  errorRate.add(analyticsRes.status >= 500);
  sleep(1);

  // 5. Geocoding (public endpoint)
  const geocodeStart = Date.now();
  const geocodeRes = http.get(
    `${API_BASE}/geocoding/geocode?query=San Francisco, CA`,
    { headers: { "Content-Type": "application/json" } }
  );
  apiResponseTime.add(Date.now() - geocodeStart);
  check(geocodeRes, {
    "geocoding status is 200": (r) => r.status === 200,
  });
  errorRate.add(geocodeRes.status !== 200);
  sleep(1);

  // 6. Get resumes
  const resumesStart = Date.now();
  const resumesRes = http.get(`${API_BASE}/resumes`, { headers });
  apiResponseTime.add(Date.now() - resumesStart);
  check(resumesRes, {
    "get resumes status is 200": (r) => r.status === 200,
  });
  errorRate.add(resumesRes.status !== 200);
  sleep(1);
}

export function teardown(data) {
  console.log("✅ Load test completed");
}


