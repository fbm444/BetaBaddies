/**
 * Spike Test - Sudden traffic increase
 * 
 * Purpose: Test system response to sudden traffic spikes
 * VUs: Sudden increase from 10 to 200, then back down
 * Duration: 5 minutes
 * 
 * Usage:
 *   k6 run tests/k6/spike-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

const BASE_URL = __ENV.BACKEND_URL || "http://localhost:3001";
const API_BASE = `${BASE_URL}/api/v1`;

export const options = {
  stages: [
    { duration: "1m", target: 10 },   // Normal load
    { duration: "30s", target: 200 },  // Sudden spike!
    { duration: "1m", target: 200 },  // Sustain spike
    { duration: "30s", target: 10 },   // Sudden drop
    { duration: "2m", target: 10 },    // Back to normal
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // Allow higher latency during spike
    http_req_failed: ["rate<0.2"],     // Allow up to 20% errors during spike
    errors: ["rate<0.2"],
  },
};

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
  });
  errorRate.add(healthRes.status !== 200);
  sleep(1);
}


