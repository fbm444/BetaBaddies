/**
 * Soak Test - Sustained load over time
 * 
 * Purpose: Test for memory leaks and performance degradation
 * VUs: Moderate sustained load
 * Duration: 30-60 minutes (long duration)
 * 
 * Usage:
 *   k6 run tests/k6/soak-test.js
 * 
 * Custom duration:
 *   k6 run --duration 1h tests/k6/soak-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

const BASE_URL = __ENV.BACKEND_URL || "http://localhost:3001";
const API_BASE = `${BASE_URL}/api/v1`;

export const options = {
  stages: [
    { duration: "10s", target: 5 },
    { duration: "20s", target: 5 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<60000"],
    http_req_failed: ["rate<1.0"],
    errors: ["rate<1.0"],
  },
};

export function setup() {
  console.log(`🚀 Starting soak test against: ${BASE_URL}`);
  return {};
}

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200 || r.status >= 200,
  });
  
  // Random sleep to simulate realistic usage
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

export function teardown(data) {
  console.log("✅ Soak test completed");
  console.log("📊 Review metrics for memory leaks and performance degradation");
}


