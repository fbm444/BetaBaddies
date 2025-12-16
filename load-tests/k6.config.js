// k6 Load Testing Configuration
// This file contains shared configuration for all k6 tests

import http from 'k6/http';
import { sleep } from 'k6';

export const config = {
  // Base URL for the API
  baseUrl: __ENV.API_URL || 'http://localhost:3001/api/v1',
  
  // Test user credentials (should be created in the database)
  testUser: {
    email: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
    password: __ENV.TEST_USER_PASSWORD || 'LoadTest123!',
  },
  
  // Thresholds for performance metrics
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
    http_req_waiting: ['p(95)<400'], // 95% of requests wait time < 400ms
    
    // Iteration metrics
    iteration_duration: ['p(95)<2000'], // 95% of iterations < 2s
    
    // Data transfer
    data_received: ['rate>1000'], // At least 1KB/s received
    data_sent: ['rate>500'], // At least 500B/s sent
  },
  
  // Summary time unit
  summaryTimeUnit: 'ms',
  
  // Summary trend stats
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Helper function to get auth headers
export function getAuthHeaders(sessionCookie) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  
  return headers;
}

// Alternative: Use cookie jar for automatic cookie handling
export function getAuthOptions(sessionCookie) {
  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (sessionCookie) {
    options.headers['Cookie'] = sessionCookie;
  }
  
  return options;
}

// Helper function to login and get session cookie
// Uses k6's cookie jar for automatic cookie handling
export function login(baseUrl, email, password) {
  // Create a cookie jar for this VU (virtual user)
  const jar = http.cookieJar();
  
  const loginRes = http.post(`${baseUrl}/users/login`, JSON.stringify({
    email: email,
    password: password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status !== 200) {
    console.error(`Login failed: ${loginRes.status}`);
    try {
      const body = JSON.parse(loginRes.body);
      console.error(`Error: ${body.error?.message || body.error?.code || 'Unknown error'}`);
    } catch {
      console.error(`Response body: ${loginRes.body.substring(0, 200)}`);
    }
    return null;
  }
  
  // Extract session cookie from Set-Cookie header
  const setCookieHeader = loginRes.headers['Set-Cookie'] || loginRes.headers['set-cookie'];
  let sessionCookie = '';
  
  if (setCookieHeader) {
    // Handle both string and array formats
    const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    
    for (const cookieStr of cookieStrings) {
      // Match connect.sid=value (may have path, domain, etc. after semicolon)
      const match = cookieStr.match(/connect\.sid=([^;,\s]+)/);
      if (match) {
        sessionCookie = `connect.sid=${match[1]}`;
        break;
      }
    }
  }
  
  // Also try to get from k6's cookie jar
  if (!sessionCookie) {
    try {
      const cookies = jar.cookiesForURL(baseUrl);
      if (cookies && cookies['connect.sid']) {
        sessionCookie = `connect.sid=${cookies['connect.sid']}`;
      }
    } catch (e) {
      // Cookie jar might not have it yet, that's okay
    }
  }
  
  // Try response cookies object (k6 v0.47+)
  if (!sessionCookie && loginRes.cookies) {
    const cookies = loginRes.cookies;
    if (cookies['connect.sid'] && Array.isArray(cookies['connect.sid']) && cookies['connect.sid'].length > 0) {
      sessionCookie = `connect.sid=${cookies['connect.sid'][0].value}`;
    }
  }
  
  if (!sessionCookie) {
    console.error('Warning: Could not extract session cookie from login response');
    console.error('Status:', loginRes.status);
    console.error('Set-Cookie header:', setCookieHeader);
    console.error('Response cookies:', JSON.stringify(loginRes.cookies));
    return null;
  }
  
  return sessionCookie;
}

// Note: Use sleep() with randomIntBetween() in test files for think time

