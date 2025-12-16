// k6 Load Test: Database Query Performance
// Tests database-heavy endpoints to verify query performance under load

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config, login, getAuthHeaders } from './k6.config.js';

// Custom metrics for database performance
const dbQueryTime = new Trend('db_query_time');
const dbErrorRate = new Rate('db_errors');
const slowQueries = new Counter('slow_queries'); // Queries > 500ms

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 75 },
    { duration: '2m', target: 75 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...config.thresholds,
    db_query_time: ['p(95)<500', 'p(99)<1000'], // 95% of DB queries < 500ms
    db_errors: ['rate<0.01'],
  },
};

const baseUrl = config.baseUrl;
const testUser = config.testUser;

// Database-heavy endpoints to test
const dbHeavyEndpoints = [
  // Analytics endpoints (complex aggregations)
  { path: '/interviews/analytics', name: 'Interview Analytics' },
  { path: '/analytics/dashboard', name: 'Dashboard Analytics' },
  { path: '/analytics/interview-performance', name: 'Interview Performance' },
  
  // Statistics endpoints (aggregations)
  { path: '/jobs/statistics', name: 'Job Statistics' },
  { path: '/certifications/statistics', name: 'Certification Statistics' },
  { path: '/projects/statistics', name: 'Project Statistics' },
  
  // Search endpoints (full-text search)
  { path: '/projects/search?q=test', name: 'Project Search' },
  { path: '/job-opportunities?status=Applied', name: 'Job Opportunities Filter' },
  
  // List endpoints with filters (complex queries)
  { path: '/interviews?status=scheduled', name: 'Interviews Filtered' },
  { path: '/interview-responses?questionType=behavioral', name: 'Interview Responses Filtered' },
  
  // Gap analysis (aggregation queries)
  { path: '/interview-responses/gap-analysis', name: 'Gap Analysis' },
];

export default function () {
  const sessionCookie = login(baseUrl, testUser.email, testUser.password);
  
  if (!sessionCookie) {
    dbErrorRate.add(1);
    console.error('Failed to get session cookie, skipping iteration');
    return;
  }
  
  const headers = getAuthHeaders(sessionCookie);
  
  // Test database-heavy endpoints
  for (const endpoint of dbHeavyEndpoints) {
    const startTime = Date.now();
    
    const response = http.get(`${baseUrl}${endpoint.path}`, { headers });
    
    const duration = Date.now() - startTime;
    dbQueryTime.add(duration);
    
    // Track slow queries
    if (duration > 500) {
      slowQueries.add(1);
    }
    
    const success = check(response, {
      [`${endpoint.name} status is 200`]: (r) => r.status === 200,
      [`${endpoint.name} response time < 2000ms`]: (r) => r.timings.duration < 2000,
      [`${endpoint.name} returns data`]: (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.ok === true && body.data !== undefined;
        } catch {
          return false;
        }
      },
    });
    
    if (!success) {
      dbErrorRate.add(1);
      console.error(`${endpoint.name} failed: ${response.status}`);
    }
    
    sleep(randomIntBetween(1, 3));
  }
  
  sleep(randomIntBetween(3, 6));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'database-performance-results.json': JSON.stringify(data, null, 2),
  };
}

// textSummary is imported from k6-summary

