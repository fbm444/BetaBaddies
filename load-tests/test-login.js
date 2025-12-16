// Quick test script to verify login works
// Run: k6 run test-login.js

import http from 'k6/http';
import { check } from 'k6';
import { config, login, getAuthHeaders } from './k6.config.js';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const baseUrl = config.baseUrl;
  const testUser = config.testUser;
  
  console.log('\n=== Login Test ===');
  console.log(`API URL: ${baseUrl}`);
  console.log(`Email: ${testUser.email}`);
  console.log(`Password: ${testUser.password.substring(0, 3)}...`);
  console.log('');
  
  // Test 1: Login
  console.log('Step 1: Attempting login...');
  const loginRes = http.post(`${baseUrl}/users/login`, JSON.stringify({
    email: testUser.email,
    password: testUser.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  console.log(`Login response status: ${loginRes.status}`);
  
  if (loginRes.status !== 200) {
    console.error('✗ Login failed!');
    try {
      const body = JSON.parse(loginRes.body);
      console.error(`Error: ${body.error?.message || body.error?.code || 'Unknown'}`);
    } catch {
      console.error(`Response: ${loginRes.body.substring(0, 300)}`);
    }
    console.error('\nTroubleshooting:');
    console.error('  1. Check if test user exists: SELECT * FROM users WHERE email = \'loadtest@example.com\';');
    console.error('  2. Verify password is correct');
    console.error('  3. Check backend is running: curl http://localhost:3001/health');
    console.error('  4. Check backend logs for errors');
    return;
  }
  
  console.log('✓ Login request successful (200)');
  
  // Test 2: Extract cookie
  console.log('\nStep 2: Extracting session cookie...');
  const setCookieHeader = loginRes.headers['Set-Cookie'] || loginRes.headers['set-cookie'];
  console.log('Set-Cookie header:', setCookieHeader ? 'Present' : 'Missing');
  
  if (setCookieHeader) {
    if (Array.isArray(setCookieHeader)) {
      console.log(`Found ${setCookieHeader.length} Set-Cookie headers`);
      setCookieHeader.forEach((cookie, idx) => {
        console.log(`  [${idx}]: ${cookie.substring(0, 80)}...`);
      });
    } else {
      console.log(`Header: ${setCookieHeader.substring(0, 80)}...`);
    }
  }
  
  // Extract cookie using the login helper
  const sessionCookie = login(baseUrl, testUser.email, testUser.password);
  
  if (!sessionCookie) {
    console.error('✗ Could not extract session cookie!');
    console.error('Set-Cookie header type:', typeof setCookieHeader);
    console.error('Set-Cookie header value:', setCookieHeader);
    if (loginRes.cookies) {
      console.error('Response cookies object:', JSON.stringify(loginRes.cookies, null, 2));
    }
    console.error('\nTrying manual extraction...');
    
    // Manual extraction attempt
    if (setCookieHeader) {
      const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
      const match = cookieStr.match(/connect\.sid=([^;,\s]+)/);
      if (match) {
        const manualCookie = `connect.sid=${match[1]}`;
        console.log('✓ Manually extracted cookie, trying authenticated request...');
        
        const headers = getAuthHeaders(manualCookie);
        const profileRes = http.get(`${baseUrl}/profile`, { headers });
        
        if (profileRes.status === 200) {
          console.log('✓ Manual cookie extraction works!');
          console.log('Cookie format:', manualCookie.substring(0, 60) + '...');
          return;
        }
      }
    }
    return;
  }
  
  console.log('✓ Session cookie extracted');
  console.log(`Cookie: ${sessionCookie.substring(0, 60)}...`);
  
  // Test 3: Authenticated request
  console.log('\nStep 3: Testing authenticated request...');
  const headers = getAuthHeaders(sessionCookie);
  const profileRes = http.get(`${baseUrl}/profile`, { headers });
  
  console.log(`Profile response status: ${profileRes.status}`);
  
  const success = check(profileRes, {
    'Profile endpoint works': (r) => r.status === 200,
  });
  
  if (success) {
    console.log('✓ Authenticated request successful!');
    console.log('\n=== All tests passed! ===');
    console.log('You can now run load tests:');
    console.log('  k6 run api-endpoints.test.js');
  } else {
    console.error('✗ Authenticated request failed!');
    console.error(`Status: ${profileRes.status}`);
    try {
      const body = JSON.parse(profileRes.body);
      console.error(`Error: ${body.error?.message || body.error?.code || 'Unknown'}`);
    } catch {
      console.error(`Response: ${profileRes.body.substring(0, 300)}`);
    }
  }
}

