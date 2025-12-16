#!/bin/bash

# Script to create test user for load testing
# This script uses the backend's user service to create a test user

cd "$(dirname "$0")/../backend" || exit 1

TEST_USER_EMAIL=${TEST_USER_EMAIL:-"loadtest@example.com"}
TEST_USER_PASSWORD=${TEST_USER_PASSWORD:-"LoadTest123!"}

echo "Creating test user for load testing..."
echo "Email: $TEST_USER_EMAIL"
echo ""

# Use Node.js to create the user via the registration endpoint or direct DB
node -e "
import('bcrypt').then(bcrypt => {
  const bcryptModule = bcrypt.default || bcrypt;
  const { Pool } = require('pg');
  const dbConfig = require('./config/db.config.js').default;
  
  const pool = new Pool(dbConfig);
  
  async function createUser() {
    try {
      // Check if user exists
      const existing = await pool.query('SELECT u_id FROM users WHERE email = \$1', [process.env.TEST_USER_EMAIL || '$TEST_USER_EMAIL']);
      
      if (existing.rows.length > 0) {
        console.log('✓ Test user already exists');
        process.exit(0);
      }
      
      // Hash password
      const hashed = await bcryptModule.hash(process.env.TEST_USER_PASSWORD || '$TEST_USER_PASSWORD', 10);
      
      // Create user
      const result = await pool.query(
        'INSERT INTO users (u_id, email, password, account_type) VALUES (gen_random_uuid(), \$1, \$2, \$3) RETURNING u_id, email',
        [process.env.TEST_USER_EMAIL || '$TEST_USER_EMAIL', hashed, 'regular']
      );
      
      console.log('✓ Test user created successfully');
      console.log('  User ID:', result.rows[0].u_id);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }
  
  createUser();
});
" || {
  echo "Note: If the above fails, you can create the user manually via:"
  echo "  1. Registration endpoint: POST /api/v1/users/register"
  echo "  2. Or directly in the database using SQL"
  echo ""
  echo "SQL to create user:"
  echo "  INSERT INTO users (u_id, email, password, account_type)"
  echo "  VALUES (gen_random_uuid(), '$TEST_USER_EMAIL', '<bcrypt_hash_of_LoadTest123!>', 'regular');"
}

