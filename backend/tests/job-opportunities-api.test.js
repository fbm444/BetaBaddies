#!/usr/bin/env node

/**
 * Job Opportunities API Integration Tests
 * Covers CRUD, status counts, and bulk updates
 */

import request from "supertest";
import app from "../server.js";
import userService from "../services/userService.js";
import database from "../services/database.js";

console.log("🧪 Testing Job Opportunities API Endpoints");
console.log("========================================\n");

let testUser = null;
let sessionCookie = null;
let testOpportunities = [];
const testResults = { passed: 0, failed: 0, total: 0 };

async function ensureJobOpportunitiesTable() {
  const { rows } = await database.query(
    `SELECT to_regclass('public.job_opportunities') AS table_name`
  );

  if (rows[0]?.table_name) {
    return true;
  }

  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS job_opportunities (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        company varchar(255) NOT NULL,
        location varchar(256) NOT NULL,
        salary_min numeric,
        salary_max numeric,
        job_posting_url varchar(1000),
        application_deadline date,
        job_description text,
        industry varchar(255),
        job_type varchar(50),
        notes text,
        recruiter_name varchar(255),
        recruiter_email varchar(255),
        recruiter_phone varchar(50),
        hiring_manager_name varchar(255),
        hiring_manager_email varchar(255),
        hiring_manager_phone varchar(50),
        salary_negotiation_notes text,
        interview_notes text,
        application_history jsonb DEFAULT '[]'::jsonb,
        status varchar(50) DEFAULT 'Interested' NOT NULL,
        status_updated_at timestamptz DEFAULT now() NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);

    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_job_opportunities_user_id
        ON job_opportunities(user_id)
    `);

    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_job_opportunities_status
        ON job_opportunities(status)
    `);

    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_job_opportunities_status_updated_at
        ON job_opportunities(status_updated_at)
    `);

    await database
      .query(`
        ALTER TABLE job_opportunities
          ADD CONSTRAINT check_job_opportunity_status
          CHECK (status IN ('Interested', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'))
      `)
      .catch(() => {});

    return true;
  } catch (error) {
    if (error.code === "42501") {
      console.warn(
        "⚠️  Unable to create job_opportunities table (insufficient privileges). Please run the database migrations before executing these tests."
      );
      return false;
    }

    throw error;
  }
}

async function runTest(name, fn) {
  testResults.total += 1;
  console.log(`\n📋 Test: ${name}`);
  console.log("─".repeat(50));

  try {
    await fn();
    console.log(`✅ PASSED: ${name}`);
    testResults.passed += 1;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed += 1;
  }
}

async function setup() {
  console.log("🔧 Setting up test data...");
  const tableAvailable = await ensureJobOpportunitiesTable();

  if (!tableAvailable) {
    console.log(
      "⏭️  Skipping Job Opportunities API tests because the required table is missing."
    );
    process.exit(0);
  }

  testUser = await userService.createUser({
    email: `jobop-${Date.now()}@example.com`,
    password: "TestPassword123",
  });
  console.log(`   ✓ Created test user ${testUser.email}`);

  const loginResponse = await request(app).post("/api/v1/users/login").send({
    email: testUser.email,
    password: "TestPassword123",
  });

  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${loginResponse.body.error?.message}`);
  }

  const cookies = loginResponse.headers["set-cookie"];
  sessionCookie = cookies
    ? cookies.find((cookie) => cookie.startsWith("connect.sid"))
    : null;

  if (!sessionCookie) {
    throw new Error("No session cookie received");
  }

  console.log("   ✓ Authenticated test user");
}

async function cleanup() {
  console.log("\n🧹 Cleaning up job opportunity test data...");

  for (const opportunity of testOpportunities) {
    try {
      await database.query("DELETE FROM job_opportunities WHERE id = $1", [
        opportunity.id,
      ]);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete opportunity ${opportunity.id}:`,
        error.message
      );
    }
  }

  if (testUser) {
    try {
      await database.query("DELETE FROM users WHERE u_id = $1", [testUser.id]);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete user ${testUser.id}:`,
        error.message
      );
    }
  }

  console.log(
    `   📊 Cleaned up ${testOpportunities.length} job opportunity(ies) and 1 user`
  );
}

async function runAllTests() {
  try {
    await setup();

    await runTest("POST /api/v1/job-opportunities - Create", async () => {
      const payload = {
        title: "Backend Engineer",
        company: "Test Corp",
        location: "Remote",
        jobPostingUrl: "https://example.com/job/backend-engineer",
        status: "Interested",
      };

      const response = await request(app)
        .post("/api/v1/job-opportunities")
        .set("Cookie", sessionCookie)
        .send(payload);

      if (response.status !== 201) {
        throw new Error(
          `Expected 201, got ${response.status}: ${JSON.stringify(
            response.body
          )}`
        );
      }

      const created = response.body.data?.jobOpportunity;
      if (!created?.id) {
        throw new Error("Job opportunity ID missing in response");
      }

      testOpportunities.push(created);
      console.log(`   ✓ Created job opportunity ${created.id}`);
    });

    await runTest("GET /api/v1/job-opportunities - List", async () => {
      const response = await request(app)
        .get("/api/v1/job-opportunities")
        .set("Cookie", sessionCookie);

      if (response.status !== 200) {
        throw new Error(
          `Expected 200, got ${response.status}: ${JSON.stringify(
            response.body
          )}`
        );
      }

      const list = response.body.data?.jobOpportunities;
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("Expected at least one job opportunity in response");
      }

      console.log(`   ✓ Retrieved ${list.length} job opportunity(ies)`);
    });

    await runTest(
      "GET /api/v1/job-opportunities/status/counts - Status Counts",
      async () => {
        const response = await request(app)
          .get("/api/v1/job-opportunities/status/counts")
          .set("Cookie", sessionCookie);

        if (response.status !== 200) {
          throw new Error(
            `Expected 200, got ${response.status}: ${JSON.stringify(
              response.body
            )}`
          );
        }

        const counts = response.body.data?.statusCounts;
        if (!counts || counts.Interested === undefined) {
          throw new Error("Status counts missing from response");
        }

        if (counts.Interested < 1) {
          throw new Error(
            `Expected Interested count >= 1, received ${counts.Interested}`
          );
        }

        console.log("   ✓ Status counts retrieved successfully");
      }
    );

    await runTest(
      "POST /api/v1/job-opportunities/bulk-update-status - Bulk Update",
      async () => {
        const targetId = testOpportunities[0].id;
        const response = await request(app)
          .post("/api/v1/job-opportunities/bulk-update-status")
          .set("Cookie", sessionCookie)
          .send({
            opportunityIds: [targetId],
            status: "Applied",
          });

        if (response.status !== 200) {
          throw new Error(
            `Expected 200, got ${response.status}: ${JSON.stringify(
              response.body
            )}`
          );
        }

        const updated = response.body.data?.updatedOpportunities;
        if (!Array.isArray(updated) || updated.length !== 1) {
          throw new Error("Bulk update response missing updated items");
        }

        if (updated[0].status !== "Applied") {
          throw new Error("Status not updated to Applied");
        }

        console.log("   ✓ Bulk status update applied");
      }
    );

    await runTest("GET /api/v1/job-opportunities/:id - Retrieve by ID", async () => {
      const targetId = testOpportunities[0].id;
      const response = await request(app)
        .get(`/api/v1/job-opportunities/${targetId}`)
        .set("Cookie", sessionCookie);

      if (response.status !== 200) {
        throw new Error(
          `Expected 200, got ${response.status}: ${JSON.stringify(
            response.body
          )}`
        );
      }

      if (response.body.data?.jobOpportunity?.id !== targetId) {
        throw new Error("Returned job opportunity ID does not match");
      }

      console.log("   ✓ Retrieved job opportunity by ID");
    });

    await runTest("PUT /api/v1/job-opportunities/:id - Update", async () => {
      const targetId = testOpportunities[0].id;
      const response = await request(app)
        .put(`/api/v1/job-opportunities/${targetId}`)
        .set("Cookie", sessionCookie)
        .send({
          status: "Interview",
          notes: "Scheduled first-round interview",
        });

      if (response.status !== 200) {
        throw new Error(
          `Expected 200, got ${response.status}: ${JSON.stringify(
            response.body
          )}`
        );
      }

      const updated = response.body.data?.jobOpportunity;
      if (updated.status !== "Interview") {
        throw new Error("Status not updated to Interview");
      }

      console.log("   ✓ Updated job opportunity");
    });

    await runTest("Unauthorized access is rejected", async () => {
      const response = await request(app).get("/api/v1/job-opportunities");

      if (response.status !== 401) {
        throw new Error(
          `Expected 401, got ${response.status}: ${JSON.stringify(
            response.body
          )}`
        );
      }

      console.log("   ✓ Unauthorized request blocked");
    });

    await runTest("DELETE /api/v1/job-opportunities/:id - Delete", async () => {
      const targetId = testOpportunities[0].id;
      const response = await request(app)
        .delete(`/api/v1/job-opportunities/${targetId}`)
        .set("Cookie", sessionCookie);

      if (response.status !== 200) {
        throw new Error(
          `Expected 200, got ${response.status}: ${JSON.stringify(
            response.body
          )}`
        );
      }

      testOpportunities = testOpportunities.filter((o) => o.id !== targetId);

      const getResponse = await request(app)
        .get(`/api/v1/job-opportunities/${targetId}`)
        .set("Cookie", sessionCookie);

      if (getResponse.status !== 404) {
        throw new Error("Deleted job opportunity should return 404");
      }

      console.log("   ✓ Deleted job opportunity");
    });

    console.log("\n📊 Test Summary");
    console.log("================");
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);

    if (testResults.failed > 0) {
      console.log(`\n❌ ${testResults.failed} test(s) failed.`);
      process.exit(1);
    }

    console.log("\n🎉 All Job Opportunities API tests passed!");
  } catch (error) {
    console.error("\n❌ Test execution failed:", error.message);
    process.exit(1);
  } finally {
    await cleanup();
    console.log("\n✅ Test cleanup completed");
  }
}

runAllTests().catch(console.error);

