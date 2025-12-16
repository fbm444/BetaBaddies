// Script to create a test user for load testing
// Run this before running load tests: 
//   cd backend && node ../load-tests/create-test-user.js

import bcrypt from 'bcrypt';
import database from './services/database.js';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'loadtest@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'LoadTest123!';

async function createTestUser() {
  try {
    console.log('Creating test user for load testing...');
    
    // Check if user already exists
    const existingUser = await database.query(
      'SELECT u_id, email FROM users WHERE email = $1',
      [TEST_USER_EMAIL]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`✓ Test user already exists: ${TEST_USER_EMAIL}`);
      console.log(`  User ID: ${existingUser.rows[0].u_id}`);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    
    // Create user
    const result = await database.query(
      `INSERT INTO users (u_id, email, password, account_type, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'regular', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING u_id, email`,
      [TEST_USER_EMAIL, hashedPassword]
    );
    
    if (result.rows.length > 0) {
      console.log(`✓ Test user created successfully!`);
      console.log(`  Email: ${TEST_USER_EMAIL}`);
      console.log(`  Password: ${TEST_USER_PASSWORD}`);
      console.log(`  User ID: ${result.rows[0].u_id}`);
      console.log('\nYou can now run load tests with:');
      console.log(`  TEST_USER_EMAIL=${TEST_USER_EMAIL} TEST_USER_PASSWORD=${TEST_USER_PASSWORD} k6 run api-endpoints.test.js`);
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  } finally {
    await database.close();
  }
}

createTestUser();

