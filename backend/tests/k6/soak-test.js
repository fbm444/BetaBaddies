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
    { duration: "5m", target: 20 },  // Ramp up
    { duration: "30m", target: 20 }, // Sustain for 30 minutes
    { duration: "5m", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.01"], // Very low error rate for soak test
    errors: ["rate<0.01"],
  },
};

export function setup() {
  console.log(`🚀 Starting soak test against: ${BASE_URL}`);
  console.log("⏱️  This test will run for 40 minutes to detect memory leaks");
  return {};
}

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
  });
  errorRate.add(healthRes.status !== 200);
  
  // Random sleep to simulate realistic usage
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

export function teardown(data) {
  console.log("✅ Soak test completed");
  console.log("📊 Review metrics for memory leaks and performance degradation");
}


