/**
 * Setup Test Users for k6 Load Testing
 * 
 * This script pre-creates test users in the database so k6 tests can use them
 * without needing to register users during test execution.
 * 
 * Usage:
 *   node tests/k6/setup-test-users.js
 * 
 * Or with custom database URL:
 *   DATABASE_URL=postgresql://... node tests/k6/setup-test-users.js
 */

import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import pg from "pg";
import dbConfig from "../../config/db.config.js";

const { Client } = pg;

// Load environment variables
dotenv.config();

// Database configuration - use the same config as the app
function getDbConnectionConfig() {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    return {
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    };
  }
  
  // Use the same config as the app
  return dbConfig;
}

// Test users to create
const TEST_USERS = [
  {
    email: "test@example.com",
    password: "TestPassword123",
    firstName: "Test",
    lastName: "User",
  },
  {
    email: "test1@example.com",
    password: "TestPassword123",
    firstName: "Test",
    lastName: "User1",
  },
  {
    email: "test2@example.com",
    password: "TestPassword123",
    firstName: "Test",
    lastName: "User2",
  },
  {
    email: "test3@example.com",
    password: "TestPassword123",
    firstName: "Test",
    lastName: "User3",
  },
  {
    email: "test4@example.com",
    password: "TestPassword123",
    firstName: "Test",
    lastName: "User4",
  },
  {
    email: "test5@example.com",
    password: "TestPassword123",
    firstName: "Test",
    lastName: "User5",
  },
];

const saltRounds = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function createTestUsers() {
  const dbConfig = getDbConnectionConfig();
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log("✅ Connected to database");

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userData of TEST_USERS) {
      try {
        // Check if user already exists
        const checkQuery = `SELECT u_id, email FROM users WHERE email = $1`;
        const checkResult = await client.query(checkQuery, [
          userData.email.toLowerCase(),
        ]);

        if (checkResult.rows.length > 0) {
          console.log(`⏭️  User already exists: ${userData.email}`);
          
          // Update password if user exists (in case password changed)
          const hashedPassword = await hashPassword(userData.password);
          const updateQuery = `
            UPDATE users 
            SET password = $1, updated_at = NOW(), auth_provider = 'local'
            WHERE email = $2
          `;
          await client.query(updateQuery, [
            hashedPassword,
            userData.email.toLowerCase(),
          ]);
          console.log(`   Updated password for: ${userData.email}`);
          skippedCount++;
          continue;
        }

        // Create new user
        const userId = uuidv4();
        const hashedPassword = await hashPassword(userData.password);

        const insertUserQuery = `
          INSERT INTO users (u_id, email, password, created_at, updated_at, auth_provider, account_type)
          VALUES ($1, $2, $3, NOW(), NOW(), 'local', 'regular')
          RETURNING u_id, email
        `;

        const userResult = await client.query(insertUserQuery, [
          userId,
          userData.email.toLowerCase(),
          hashedPassword,
        ]);

        // Create profile for the user
        const defaultPfpLink =
          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

        const insertProfileQuery = `
          INSERT INTO profiles (user_id, first_name, last_name, state, pfp_link)
          VALUES ($1, $2, $3, 'NY', $4)
          ON CONFLICT (user_id) DO NOTHING
        `;

        await client.query(insertProfileQuery, [
          userId,
          userData.firstName,
          userData.lastName,
          defaultPfpLink,
        ]);

        console.log(`✅ Created user: ${userData.email} (${userId})`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Created: ${createdCount}`);
    console.log(`   Updated: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${TEST_USERS.length}`);

    if (createdCount + skippedCount === TEST_USERS.length) {
      console.log("\n✅ All test users are ready!");
    } else {
      console.log("\n⚠️  Some users could not be created. Check errors above.");
    }
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
createTestUsers().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

