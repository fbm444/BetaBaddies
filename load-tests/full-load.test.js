// k6 Load Test: Full Application Load Test
// Comprehensive test simulating real user behavior (50-100 concurrent users)

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config, login, getAuthHeaders } from './k6.config.js';

// Custom metrics
const userJourneyTime = new Trend('user_journey_time');
const pageLoadTime = new Trend('page_load_time');
const apiErrorRate = new Rate('api_errors');
const successfulJourneys = new Counter('successful_journeys');

export const options = {
  stages: [
    { duration: '1m', target: 25 },   // Warm up
    { duration: '2m', target: 50 },   // Normal load
    { duration: '3m', target: 50 },   // Sustained load
    { duration: '2m', target: 75 },    // Increased load
    { duration: '3m', target: 75 },    // Sustained increased load
    { duration: '2m', target: 100 },   // Peak load
    { duration: '3m', target: 100 },  // Sustained peak load
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    ...config.thresholds,
    user_journey_time: ['p(95)<5000'], // 95% of user journeys < 5s
    api_errors: ['rate<0.02'], // Less than 2% API errors
  },
};

const baseUrl = config.baseUrl;
const testUser = config.testUser;

// Simulate a complete user journey
function simulateUserJourney(sessionCookie) {
  const journeyStart = Date.now();
  if (!sessionCookie) {
    apiErrorRate.add(1);
    console.error('Failed to get session cookie, skipping iteration');
    return;
  }
  
  const headers = getAuthHeaders(sessionCookie);
  let journeySuccess = true;
  
  group('Dashboard Load', () => {
    const response = http.get(`${baseUrl}/analytics/dashboard`, { headers });
    pageLoadTime.add(response.timings.duration);
    
    const success = check(response, {
      'Dashboard loads successfully': (r) => r.status === 200,
      'Dashboard loads in < 2s': (r) => r.timings.duration < 2000,
    });
    
    if (!success) {
      journeySuccess = false;
      apiErrorRate.add(1);
    }
    
    sleep(randomIntBetween(1, 3));
  });
  
  group('Profile View', () => {
    const response = http.get(`${baseUrl}/profile`, { headers });
    pageLoadTime.add(response.timings.duration);
    
    check(response, {
      'Profile loads successfully': (r) => r.status === 200,
    });
    
    sleep(randomIntBetween(0.5, 2));
  });
  
  group('Jobs Management', () => {
    // Get jobs
    const jobsResponse = http.get(`${baseUrl}/jobs`, { headers });
    check(jobsResponse, {
      'Jobs list loads': (r) => r.status === 200,
    });
    
    sleep(randomIntBetween(1, 2));
    
    // Get job statistics
    const statsResponse = http.get(`${baseUrl}/jobs/statistics`, { headers });
    check(statsResponse, {
      'Job statistics load': (r) => r.status === 200,
    });
    
    sleep(randomIntBetween(1, 2));
  });
  
  group('Interview Management', () => {
    // Get interviews
    const interviewsResponse = http.get(`${baseUrl}/interviews`, { headers });
    check(interviewsResponse, {
      'Interviews list loads': (r) => r.status === 200,
    });
    
    sleep(randomIntBetween(1, 2));
    
    // Get interview responses
    const responsesResponse = http.get(`${baseUrl}/interview-responses`, { headers });
    check(responsesResponse, {
      'Interview responses load': (r) => r.status === 200,
    });
    
    sleep(randomIntBetween(1, 2));
  });
  
  group('Projects View', () => {
    const response = http.get(`${baseUrl}/projects`, { headers });
    check(response, {
      'Projects load': (r) => r.status === 200,
    });
    
    sleep(randomIntBetween(1, 2));
  });
  
  group('Certifications View', () => {
    const response = http.get(`${baseUrl}/certifications`, { headers });
    check(response, {
      'Certifications load': (r) => r.status === 200,
    });
    
    sleep(randomIntBetween(1, 2));
  });
  
  const journeyDuration = Date.now() - journeyStart;
  userJourneyTime.add(journeyDuration);
  
  if (journeySuccess) {
    successfulJourneys.add(1);
  }
  
  return journeySuccess;
}

export default function () {
  const sessionCookie = login(baseUrl, testUser.email, testUser.password);
  
  if (!sessionCookie) {
    apiErrorRate.add(1);
    return;
  }
  
  // Simulate user journey
  simulateUserJourney(sessionCookie);
  
  // Simulate user thinking/reading time
  sleep(randomIntBetween(5, 10));
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    `full-load-test-${timestamp}.json`: JSON.stringify(data, null, 2),
    `full-load-test-${timestamp}.html`: generateHTMLReport(data, timestamp),
  };
}

// textSummary is imported from k6-summary

function generateHTMLReport(data, timestamp) {
  const metrics = data.metrics;
  const httpReqs = metrics.http_reqs?.values || {};
  const httpDuration = metrics.http_req_duration?.values || {};
  const errors = metrics.errors?.values || {};
  const userJourney = metrics.user_journey_time?.values || {};
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Full Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
    .metric-card { background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; }
    .metric-card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; }
    .metric-card .value { font-size: 32px; font-weight: bold; color: #333; }
    .metric-card .unit { font-size: 14px; color: #999; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .status.pass { background: #4CAF50; color: white; }
    .status.fail { background: #f44336; color: white; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #4CAF50; color: white; }
    tr:hover { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Full Load Test Report</h1>
    <p><strong>Generated:</strong> ${timestamp}</p>
    
    <div class="summary">
      <div class="metric-card">
        <h3>Total Requests</h3>
        <div class="value">${httpReqs.count || 0}</div>
        <div class="unit">${(httpReqs.rate || 0).toFixed(2)} req/s</div>
      </div>
      
      <div class="metric-card">
        <h3>Average Response Time</h3>
        <div class="value">${(httpDuration.avg || 0).toFixed(0)}</div>
        <div class="unit">ms</div>
      </div>
      
      <div class="metric-card">
        <h3>P95 Response Time</h3>
        <div class="value">${(httpDuration['p(95)'] || 0).toFixed(0)}</div>
        <div class="unit">ms</div>
      </div>
      
      <div class="metric-card">
        <h3>P99 Response Time</h3>
        <div class="value">${(httpDuration['p(99)'] || 0).toFixed(0)}</div>
        <div class="unit">ms</div>
      </div>
      
      <div class="metric-card">
        <h3>Error Rate</h3>
        <div class="value">${((errors.rate || 0) * 100).toFixed(2)}%</div>
        <div class="unit">
          <span class="status ${(errors.rate || 0) < 0.01 ? 'pass' : 'fail'}">
            ${(errors.rate || 0) < 0.01 ? 'PASS' : 'FAIL'}
          </span>
        </div>
      </div>
      
      <div class="metric-card">
        <h3>User Journey Time</h3>
        <div class="value">${(userJourney.avg || 0).toFixed(0)}</div>
        <div class="unit">ms (avg)</div>
      </div>
    </div>
    
    <h2>Performance Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Average</th>
          <th>Min</th>
          <th>Max</th>
          <th>P95</th>
          <th>P99</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>HTTP Request Duration</td>
          <td>${(httpDuration.avg || 0).toFixed(2)}ms</td>
          <td>${(httpDuration.min || 0).toFixed(2)}ms</td>
          <td>${(httpDuration.max || 0).toFixed(2)}ms</td>
          <td>${(httpDuration['p(95)'] || 0).toFixed(2)}ms</td>
          <td>${(httpDuration['p(99)'] || 0).toFixed(2)}ms</td>
        </tr>
        <tr>
          <td>User Journey Time</td>
          <td>${(userJourney.avg || 0).toFixed(2)}ms</td>
          <td>${(userJourney.min || 0).toFixed(2)}ms</td>
          <td>${(userJourney.max || 0).toFixed(2)}ms</td>
          <td>${(userJourney['p(95)'] || 0).toFixed(2)}ms</td>
          <td>${(userJourney['p(99)'] || 0).toFixed(2)}ms</td>
        </tr>
      </tbody>
    </table>
    
    <h2>Thresholds</h2>
    <table>
      <thead>
        <tr>
          <th>Threshold</th>
          <th>Target</th>
          <th>Actual</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>HTTP Request Duration (P95)</td>
          <td>&lt; 500ms</td>
          <td>${(httpDuration['p(95)'] || 0).toFixed(2)}ms</td>
          <td><span class="status ${(httpDuration['p(95)'] || 0) < 500 ? 'pass' : 'fail'}">${(httpDuration['p(95)'] || 0) < 500 ? 'PASS' : 'FAIL'}</span></td>
        </tr>
        <tr>
          <td>HTTP Request Duration (P99)</td>
          <td>&lt; 1000ms</td>
          <td>${(httpDuration['p(99)'] || 0).toFixed(2)}ms</td>
          <td><span class="status ${(httpDuration['p(99)'] || 0) < 1000 ? 'pass' : 'fail'}">${(httpDuration['p(99)'] || 0) < 1000 ? 'PASS' : 'FAIL'}</span></td>
        </tr>
        <tr>
          <td>Error Rate</td>
          <td>&lt; 1%</td>
          <td>${((errors.rate || 0) * 100).toFixed(2)}%</td>
          <td><span class="status ${(errors.rate || 0) < 0.01 ? 'pass' : 'fail'}">${(errors.rate || 0) < 0.01 ? 'PASS' : 'FAIL'}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
  `;
}

