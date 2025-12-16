// Script to create a test user for load testing
// Run from backend directory: node scripts/createLoadTestUser.js

import bcrypt from 'bcrypt';
import database from '../services/database.js';
import { v4 as uuidv4 } from 'uuid';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'loadtest@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'LoadTest123!';

async function createTestUser() {
  try {
    console.log('Creating test user for load testing...');
    console.log(`Email: ${TEST_USER_EMAIL}`);
    
    // Check if user already exists
    const existingUser = await database.query(
      'SELECT u_id, email FROM users WHERE email = $1',
      [TEST_USER_EMAIL]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`✓ Test user already exists: ${TEST_USER_EMAIL}`);
      console.log(`  User ID: ${existingUser.rows[0].u_id}`);
      console.log('\nTo reset password, delete the user first or update it manually.');
      return;
    }
    
    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    
    // Create user
    const userId = uuidv4();
    const result = await database.query(
      `INSERT INTO users (u_id, email, password, account_type, created_at, updated_at)
       VALUES ($1, $2, $3, 'regular', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING u_id, email, account_type`,
      [userId, TEST_USER_EMAIL, hashedPassword]
    );
    
    if (result.rows.length > 0) {
      console.log(`✓ Test user created successfully!`);
      console.log(`  Email: ${TEST_USER_EMAIL}`);
      console.log(`  Password: ${TEST_USER_PASSWORD}`);
      console.log(`  User ID: ${result.rows[0].u_id}`);
      console.log(`  Account Type: ${result.rows[0].account_type}`);
      console.log('\nYou can now run load tests with:');
      console.log(`  cd ../load-tests`);
      console.log(`  TEST_USER_EMAIL=${TEST_USER_EMAIL} TEST_USER_PASSWORD=${TEST_USER_PASSWORD} k6 run api-endpoints.test.js`);
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await database.close();
  }
}

createTestUser();

