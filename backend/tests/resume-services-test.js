#!/usr/bin/env node

/**
 * Lightweight resume service checks that run without touching the real database schema.
 * We fully mock `database.query`, store everything in memory, and focus on core behaviours
 * that are compatible with the minimal resume table present in CI.
 */

import assert from "assert/strict";
import { v4 as uuidv4 } from "uuid";
import database from "../services/database.js";
import coreService from "../services/resumes/coreService.js";
import validationService from "../services/resumes/validationService.js";

console.log("🧪 Resume Services Lightweight Test Suite");
console.log("===============================================\n");

const originalQuery = database.query.bind(database);
const testUserId = uuidv4();

const fakeDB = {
  resumes: new Map(),
  users: new Map(),
  profiles: new Map(),
  validationIssues: [],
};

const testResults = { total: 0, passed: 0, failed: 0 };

function nowISO() {
  return new Date().toISOString();
}

function cloneRow(row) {
  return JSON.parse(JSON.stringify(row));
}

function normalizeSQL(text) {
  return text.replace(/\s+/g, " ").trim();
}

function resetFakeState() {
  fakeDB.resumes.clear();
  fakeDB.validationIssues.length = 0;
}

function setupMockData() {
  const timestamp = nowISO();
  fakeDB.users.set(testUserId, {
    email: `resume-tests-${testUserId}@example.com`,
    created_at: timestamp,
    updated_at: timestamp,
  });

  fakeDB.profiles.set(testUserId, {
    first_name: "Tina",
    middle_name: null,
    last_name: "Thai",
    phone: "(555) 555-5555",
    city: "Newark",
    state: "NJ",
    job_title: "Software Engineer",
    bio: "Student building polished demos.",
    industry: "Technology",
    exp_level: "Entry",
    pfp_link:
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
  });
}

function upsertResumeRecord(params) {
  const [
    id,
    userId,
    versionName,
    description,
    file,
    templateId,
    jobId,
    content,
    sectionConfig,
    customizations,
    versionNumber,
    parentResumeId,
    isMaster,
    commentsId,
  ] = params;

  const timestamp = nowISO();
  const record = {
    id,
    user_id: userId,
    version_name: versionName || "New_Resume",
    description: description || null,
    file: file || null,
    template_id: templateId || null,
    job_id: jobId || null,
    content: content || null,
    section_config: sectionConfig || null,
    customizations: customizations || null,
    version_number: versionNumber ?? 1,
    parent_resume_id: parentResumeId || null,
    is_master: Boolean(isMaster),
    comments_id: commentsId || null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  fakeDB.resumes.set(id, record);
  return { rows: [cloneRow(record)] };
}

function selectResumesByUser(userId, limit = 50, offset = 0) {
  const rows = [...fakeDB.resumes.values()]
    .filter((row) => row.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const sliced = rows.slice(offset, offset + limit);
  return { rows: sliced.map((row) => cloneRow(row)) };
}

function selectResumeById(resumeId, userId) {
  const record = fakeDB.resumes.get(resumeId);
  if (!record || record.user_id !== userId) {
    return { rows: [] };
  }
  return { rows: [cloneRow(record)] };
}

function selectChildren(parentId, userId) {
  const rows = [...fakeDB.resumes.values()]
    .filter(
      (row) => row.parent_resume_id === parentId && row.user_id === userId
    )
    .map((row) => ({
      id: row.id,
      version_name: row.version_name,
      version_number: row.version_number ?? 1,
    }));

  return { rows };
}

function selectVersionFamily(parentId, userId) {
  const rows = [...fakeDB.resumes.values()]
    .filter(
      (row) =>
        row.user_id === userId &&
        (row.id === parentId || row.parent_resume_id === parentId)
    )
    .sort((a, b) => {
      const versionDiff = (a.version_number ?? 1) - (b.version_number ?? 1);
      if (versionDiff !== 0) return versionDiff;
      return new Date(a.created_at) - new Date(b.created_at);
    })
    .map((row) => cloneRow(row));

  return { rows };
}

function parseUpdateFields(sql) {
  const setIndex = sql.indexOf("SET ");
  const whereIndex = sql.indexOf(" WHERE ");

  if (setIndex === -1 || whereIndex === -1) {
    return [];
  }

  const clause = sql.slice(setIndex + 4, whereIndex).trim();
  return clause
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.includes("$"))
    .map((part) => part.split("=")[0].trim());
}

function updateResume(sql, params) {
  const resumeId = params[params.length - 2];
  const userId = params[params.length - 1];
  const record = fakeDB.resumes.get(resumeId);

  if (!record || record.user_id !== userId) {
    return { rows: [] };
  }

  const fields = parseUpdateFields(sql);
  let paramIndex = 0;

  for (const field of fields) {
    // Skip computed fields like updated_at
    if (!field || field === "updated_at") {
      continue;
    }

    record[field] = params[paramIndex++];
  }

  record.updated_at = nowISO();
  fakeDB.resumes.set(resumeId, record);
  return { rows: [cloneRow(record)] };
}

function deleteResume(resumeId, userId) {
  const record = fakeDB.resumes.get(resumeId);
  if (!record || record.user_id !== userId) {
    return { rows: [] };
  }

  fakeDB.resumes.delete(resumeId);
  return { rows: [{ id: resumeId }] };
}

function selectProfileWithUser(userId) {
  const profile = fakeDB.profiles.get(userId);
  const user = fakeDB.users.get(userId);
  if (!profile || !user) {
    return { rows: [] };
  }

  return {
    rows: [
      cloneRow({
        ...profile,
        user_id: userId,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }),
    ],
  };
}

function deleteValidationIssues(resumeId) {
  fakeDB.validationIssues = fakeDB.validationIssues.filter(
    (issue) => issue.resumeId !== resumeId
  );
  return { rows: [] };
}

function insertValidationIssue(params) {
  const [resumeId, issueType, severity, message, sectionReference, suggestion] =
    params;

  fakeDB.validationIssues.push({
    resumeId,
    issueType,
    severity,
    message,
    sectionReference,
    suggestion,
    createdAt: nowISO(),
  });

  return { rows: [{ id: uuidv4(), resume_id: resumeId }] };
}

function selectValidationIssues(resumeId) {
  const rows = fakeDB.validationIssues
    .filter((issue) => issue.resumeId === resumeId)
    .map((issue) => ({
      id: uuidv4(),
      resume_id: issue.resumeId,
      issue_type: issue.issueType,
      severity: issue.severity,
      message: issue.message,
      section_reference: issue.sectionReference,
      suggestion: issue.suggestion,
      is_resolved: false,
      created_at: issue.createdAt,
    }));

  return { rows };
}

database.query = async function mockQuery(text, params = []) {
  const sql = normalizeSQL(text);

  if (sql.startsWith("INSERT INTO resume (")) {
    return upsertResumeRecord(params);
  }

  if (
    sql.startsWith(
      "SELECT id, user_id, version_name, description, created_at, updated_at, file, template_id, job_id, content, section_config, customizations, version_number, parent_resume_id, is_master, comments_id FROM resume WHERE user_id = $1"
    )
  ) {
    const [userId, limit, offset] = params;
    return selectResumesByUser(userId, limit, offset);
  }

  if (
    sql.startsWith(
      "SELECT id, user_id, version_name, description, created_at, updated_at, file, template_id, job_id, content, section_config, customizations, version_number, parent_resume_id, is_master, comments_id FROM resume WHERE id = $1 AND user_id = $2"
    )
  ) {
    const [resumeId, userId] = params;
    return selectResumeById(resumeId, userId);
  }

  if (sql.startsWith("UPDATE resume SET")) {
    return updateResume(sql, params);
  }

  if (sql.startsWith("DELETE FROM resume WHERE id = $1 AND user_id = $2")) {
    const [resumeId, userId] = params;
    return deleteResume(resumeId, userId);
  }

  if (
    sql.startsWith(
      "SELECT id, version_name, version_number FROM resume WHERE parent_resume_id = $1 AND user_id = $2"
    )
  ) {
    const [parentId, userId] = params;
    return selectChildren(parentId, userId);
  }

  if (
    sql.startsWith(
      "SELECT id, user_id, version_name, description, created_at, updated_at, version_number, parent_resume_id, is_master, template_id, job_id, content, section_config, customizations, file, comments_id FROM resume WHERE (id = $1 OR parent_resume_id = $1) AND user_id = $2"
    )
  ) {
    const [parentId, userId] = params;
    return selectVersionFamily(parentId, userId);
  }

  if (
    sql.startsWith(
      "SELECT p.first_name, p.middle_name, p.last_name, p.phone, p.city, p.state, p.job_title, p.bio, p.industry, p.exp_level, p.user_id, p.pfp_link, u.email, u.created_at, u.updated_at FROM profiles p JOIN users u ON p.user_id = u.u_id WHERE p.user_id = $1"
    )
  ) {
    return selectProfileWithUser(params[0]);
  }

  if (
    sql.startsWith(
      "DELETE FROM resume_validation_issues WHERE resume_id = $1 AND is_resolved = false"
    )
  ) {
    return deleteValidationIssues(params[0]);
  }

  if (
    sql.startsWith(
      "INSERT INTO resume_validation_issues (resume_id, issue_type, severity, message, section_reference, suggestion, is_resolved)"
    )
  ) {
    return insertValidationIssue(params);
  }

  if (
    sql.startsWith(
      "SELECT id, resume_id, issue_type, severity, message, section_reference, suggestion, is_resolved, created_at FROM resume_validation_issues WHERE resume_id = $1"
    )
  ) {
    return selectValidationIssues(params[0]);
  }

  // Default: return empty result to keep calls happy.
  return { rows: [] };
};

async function runTest(name, fn) {
  testResults.total += 1;
  console.log(`\n📋 Test: ${name}`);
  console.log("─".repeat(60));

  try {
    await fn();
    console.log(`✅ PASSED: ${name}`);
    testResults.passed += 1;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error?.message || error}`);
    testResults.failed += 1;
  }
}

async function runAllTests() {
  let createdResume = null;

  try {
    resetFakeState();
    setupMockData();

    await runTest("Create Resume", async () => {
      createdResume = await coreService.createResume(testUserId, {
        versionName: "Resume v1",
        description: "Entry level software engineer resume.",
      });

      assert.ok(createdResume?.id, "Expected created resume to have id");
      assert.equal(createdResume.userId, testUserId);
      assert.equal(fakeDB.resumes.size, 1);
    });

    await runTest("Get Resumes By User", async () => {
      const rows = await coreService.getResumesByUserId(testUserId, {
        limit: 10,
        offset: 0,
      });

      assert.ok(Array.isArray(rows), "Expected array of resumes");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, createdResume.id);
    });

    await runTest("Update Resume Fields", async () => {
      const updated = await coreService.updateResume(createdResume.id, testUserId, {
        description: "Updated summary for interview prep.",
        versionName: "Resume v2",
      });

      assert.equal(updated.description, "Updated summary for interview prep.");
      assert.equal(updated.versionName, "Resume v2");
      assert.notEqual(updated.updatedAt, createdResume.updatedAt);
      createdResume = updated;
    });

    await runTest("Validate Resume Basic Checks", async () => {
      const result = await validationService.validateResume(
        createdResume.id,
        testUserId
      );

      assert.ok(result);
      assert.equal(result.isValid, true, "Expected validation to pass");
      assert.ok(Array.isArray(result.issues));
      assert.ok(
        fakeDB.validationIssues.length >= result.issues.length,
        "Validation issues should be recorded in mock store"
      );
    });

    await runTest("Delete Resume", async () => {
      const deleted = await coreService.deleteResume(
        createdResume.id,
        testUserId
      );

      assert.equal(deleted.id, createdResume.id);
      assert.equal(fakeDB.resumes.size, 0);
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

    console.log("\n🎉 All resume service tests passed (mocked)!");
    console.log("\n✅ Covered:");
    console.log("   • Create resume");
    console.log("   • Get resumes by user");
    console.log("   • Update resume fields");
    console.log("   • Basic validation flow");
    console.log("   • Delete resume");
  } catch (error) {
    console.error("\n❌ Test execution failed:", error?.message || error);
    process.exit(1);
  } finally {
    database.query = originalQuery;
    resetFakeState();
  }
}

runAllTests().catch((error) => {
  console.error(error);
  process.exit(1);
});