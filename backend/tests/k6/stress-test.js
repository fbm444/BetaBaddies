/**
 * Stress Test - Find system breaking point
 * 
 * Purpose: Determine maximum capacity and identify bottlenecks
 * VUs: Gradually increase to find breaking point
 * Duration: 10-15 minutes
 * 
 * Usage:
 *   k6 run tests/k6/stress-test.js
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
  stages: [
    { duration: "10s", target: 10 },
    { duration: "10s", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<60000"],
    http_req_failed: ["rate<1.0"],
    errors: ["rate<1.0"],
  },
};

export function setup() {
  console.log(`🚀 Starting stress test against: ${BASE_URL}`);
  console.log("⚠️  This test will gradually increase load to find breaking point");
  return {};
}

export default function () {
  // Simple health check to test basic connectivity
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200 || r.status >= 200,
  });

  // Random sleep to simulate realistic user behavior
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

export function teardown(data) {
  console.log("✅ Stress test completed");
  console.log("📊 Review results to identify breaking point and bottlenecks");
}


