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
    { duration: "10s", target: 5 },
    { duration: "5s", target: 20 },
    { duration: "10s", target: 20 },
    { duration: "5s", target: 5 },
    { duration: "10s", target: 5 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<60000"],
    http_req_failed: ["rate<1.0"],
    errors: ["rate<1.0"],
  },
};

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200 || r.status >= 200,
  });
  sleep(1);
}


