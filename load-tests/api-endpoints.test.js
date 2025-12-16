// k6 Load Test: API Endpoints Performance
// Tests main API endpoints under load (50-100 concurrent users)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config, login, getAuthHeaders } from './k6.config.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const requestsPerSecond = new Counter('requests_per_second');

export const options = {
  stages: [
    { duration: '30s', target: 25 },  // Ramp up to 25 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 75 },    // Ramp up to 75 users
    { duration: '2m', target: 75 },    // Stay at 75 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    ...config.thresholds,
    errors: ['rate<0.01'], // Less than 1% errors
  },
};

const baseUrl = config.baseUrl;
const testUser = config.testUser;

export default function () {
  // Login to get session
  const sessionCookie = login(baseUrl, testUser.email, testUser.password);
  
  if (!sessionCookie) {
    errorRate.add(1);
    return;
  }
  
  if (!sessionCookie) {
    errorRate.add(1);
    console.error('Failed to get session cookie, skipping iteration');
    return;
  }
  
  const headers = getAuthHeaders(sessionCookie);
  
  // Test different API endpoints
  const endpoints = [
    // Profile endpoints
    { method: 'GET', path: '/profile', name: 'Get Profile' },
    
    // Job endpoints
    { method: 'GET', path: '/jobs', name: 'Get Jobs' },
    { method: 'GET', path: '/jobs/statistics', name: 'Get Job Statistics' },
    
    // Education endpoints
    { method: 'GET', path: '/education', name: 'Get Education' },
    
    // Skills endpoints
    { method: 'GET', path: '/skills', name: 'Get Skills' },
    { method: 'GET', path: '/skills/categories', name: 'Get Skill Categories' },
    
    // Certifications endpoints
    { method: 'GET', path: '/certifications', name: 'Get Certifications' },
    { method: 'GET', path: '/certifications/statistics', name: 'Get Certification Statistics' },
    
    // Projects endpoints
    { method: 'GET', path: '/projects', name: 'Get Projects' },
    { method: 'GET', path: '/projects/statistics', name: 'Get Project Statistics' },
    
    // Job Opportunities endpoints
    { method: 'GET', path: '/job-opportunities', name: 'Get Job Opportunities' },
    
    // Interview endpoints
    { method: 'GET', path: '/interviews', name: 'Get Interviews' },
    { method: 'GET', path: '/interviews/analytics', name: 'Get Interview Analytics' },
    
    // Interview Response Library endpoints
    { method: 'GET', path: '/interview-responses', name: 'Get Interview Responses' },
    { method: 'GET', path: '/interview-responses/gap-analysis', name: 'Get Gap Analysis' },
    
    // Dashboard/Analytics endpoints
    { method: 'GET', path: '/analytics/dashboard', name: 'Get Dashboard Analytics' },
  ];
  
  // Randomly select endpoints to test
  const selectedEndpoints = [];
  for (let i = 0; i < 5; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    selectedEndpoints.push(endpoint);
  }
  
  // Execute requests
  for (const endpoint of selectedEndpoints) {
    const startTime = Date.now();
    
    let response;
    if (endpoint.method === 'GET') {
      response = http.get(`${baseUrl}${endpoint.path}`, { headers });
    } else if (endpoint.method === 'POST') {
      response = http.post(`${baseUrl}${endpoint.path}`, JSON.stringify({}), { headers });
    }
    
    const duration = Date.now() - startTime;
    apiResponseTime.add(duration);
    requestsPerSecond.add(1);
    
    const success = check(response, {
      [`${endpoint.name} status is 200 or 201`]: (r) => r.status === 200 || r.status === 201,
      [`${endpoint.name} response time < 1000ms`]: (r) => r.timings.duration < 1000,
      [`${endpoint.name} has response body`]: (r) => r.body && r.body.length > 0,
    });
    
    if (!success) {
      errorRate.add(1);
      console.error(`${endpoint.name} failed: ${response.status} - ${response.body.substring(0, 200)}`);
    }
    
    // Think time between requests
    sleep(randomIntBetween(0.5, 2));
  }
  
  // Simulate user behavior - wait between iterations
  sleep(randomIntBetween(2, 5));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
    'load-test-summary.html': generateHTMLReport(data),
  };
}

// textSummary is imported from k6-summary

function generateHTMLReport(data) {
  const metrics = data.metrics;
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Report - API Endpoints</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .metric { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    .metric h2 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>Load Test Report - API Endpoints</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <div class="metric">
    <h2>HTTP Request Duration</h2>
    <p>Average: ${metrics.http_req_duration?.values?.avg?.toFixed(2)}ms</p>
    <p>P95: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2)}ms</p>
    <p>P99: ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2)}ms</p>
  </div>
  
  <div class="metric">
    <h2>Error Rate</h2>
    <p>Rate: ${(metrics.errors?.values?.rate * 100 || 0).toFixed(2)}%</p>
    <p class="${metrics.errors?.values?.rate < 0.01 ? 'pass' : 'fail'}">
      ${metrics.errors?.values?.rate < 0.01 ? '✓ PASS' : '✗ FAIL'}
    </p>
  </div>
  
  <div class="metric">
    <h2>Requests</h2>
    <p>Total: ${metrics.http_reqs?.values?.count || 0}</p>
    <p>Rate: ${metrics.http_reqs?.values?.rate?.toFixed(2) || 0} req/s</p>
  </div>
</body>
</html>
  `;
}

