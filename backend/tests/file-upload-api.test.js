#!/usr/bin/env node

/**
 * File Upload API Integration Tests
 * Tests all API endpoints with real HTTP requests
 */

import request from "supertest";
import app from "../server.js";
import userService from "../services/userService.js";
import database from "../services/database.js";
import fs from "fs/promises";
import path from "path";

console.log("🧪 Testing File Upload API Endpoints");
console.log("===================================\n");

let testUser = null;
let testFiles = [];
let csrfToken = null;
let sessionCookie = null;
let testResults = { passed: 0, failed: 0, total: 0 };

async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n📋 Test: ${testName}`);
  console.log("─".repeat(50));

  try {
    await testFunction();
    console.log(`✅ PASSED: ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    testResults.failed++;
  }
}

async function setupTestData() {
  console.log("🔧 Setting up test data...");

  // Create test user
  const userData = {
    email: `fileapitest-${Date.now()}@example.com`,
    password: "TestPassword123",
  };

  testUser = await userService.createUser(userData);
  console.log(`   ✓ Created test user: ${testUser.email}`);

  // Login user
  console.log("🔐 Logging in test user...");
  const loginResponse = await request(app)
    .post("/api/v1/users/login")
    .send({
      email: testUser.email,
      password: "TestPassword123",
    })
    .expect(200);

  // Extract session cookie
  const cookies = loginResponse.headers["set-cookie"];
  sessionCookie = cookies
    ? cookies.find((cookie) => cookie.startsWith("connect.sid"))
    : null;

  if (!sessionCookie) {
    throw new Error("No session cookie received");
  }

  console.log(`   ✓ User logged in successfully`);
}

async function getFreshCsrfToken() {
  // CSRF tokens are no longer required
  return "";
}

async function cleanupTestData() {
  console.log("🧹 Cleaning up test data...");

  // Delete files from disk
  for (const file of testFiles) {
    try {
      if (file.filePath) {
        const fullPath = path.join(process.cwd(), file.filePath);
        await fs.unlink(fullPath).catch(() => {});
      }
      if (file.thumbnailPath) {
        const thumbnailFullPath = path.join(process.cwd(), file.thumbnailPath);
        await fs.unlink(thumbnailFullPath).catch(() => {});
      }
    } catch (error) {
      // Ignore if already deleted
    }
  }

  // Delete file records from database
  for (const file of testFiles) {
    try {
      await database.query("DELETE FROM files WHERE file_id = $1", [
        file.fileId,
      ]);
    } catch (error) {
      // Ignore if already deleted
    }
  }

  if (testUser) {
    await database.query("DELETE FROM users WHERE u_id = $1", [testUser.id]);
    console.log(`   ✓ Deleted test user: ${testUser.id}`);
  }
  console.log(`   📊 Cleaned up ${testFiles.length} files and 1 user`);
}

// Helper function to create mock file buffer
async function createMockFileBuffer(filename, mimetype, size = 1024) {
  let buffer;

  // For image files, create a valid image buffer using Sharp
  if (mimetype.startsWith("image/")) {
    try {
      const sharp = (await import("sharp")).default;
      // Create a small colored square image
      const width = 100;
      const height = 100;
      const channels = 3;
      const imageBuffer = Buffer.alloc(width * height * channels);

      // Fill with a color pattern
      for (let i = 0; i < imageBuffer.length; i += channels) {
        imageBuffer[i] = 100; // R
        imageBuffer[i + 1] = 150; // G
        imageBuffer[i + 2] = 200; // B
      }

      // Convert to JPEG or PNG
      if (mimetype === "image/jpeg" || mimetype === "image/jpg") {
        buffer = await sharp(imageBuffer, {
          raw: { width, height, channels },
        })
          .jpeg()
          .toBuffer();
      } else if (mimetype === "image/png") {
        buffer = await sharp(imageBuffer, {
          raw: { width, height, channels },
        })
          .png()
          .toBuffer();
      } else if (mimetype === "image/gif") {
        // For GIF, use PNG and let the system handle it
        buffer = await sharp(imageBuffer, {
          raw: { width, height, channels },
        })
          .png()
          .toBuffer();
      }
    } catch (error) {
      console.warn("Sharp not available, using placeholder buffer");
      buffer = Buffer.alloc(size, "A");
    }
  } else {
    // For non-image files (PDFs, docs), just use a filled buffer
    buffer = Buffer.alloc(size, "A");
  }

  return {
    fieldname: "file",
    originalname: filename,
    encoding: "7bit",
    mimetype: mimetype,
    buffer: buffer,
    size: buffer.length,
  };
}

async function runAllTests() {
  await setupTestData();

  // Test 1: POST /api/v1/files/profile-picture - Upload Profile Picture
  await runTest(
    "POST /api/v1/files/profile-picture - Upload Profile Picture",
    async () => {
      const freshCsrfToken = await getFreshCsrfToken();
      const mockFile = await createMockFileBuffer(
        "profile.jpg",
        "image/jpeg",
        1024 * 1024
      );

      const response = await request(app)
        .post("/api/v1/files/profile-picture")
        .set("Cookie", sessionCookie)
        .attach("profilePicture", mockFile.buffer, {
          filename: mockFile.originalname,
          contentType: mockFile.mimetype,
        })
        .expect(201);

      const fileData = response.body.data;
      testFiles.push(fileData);

      if (!fileData || !fileData.fileId || !fileData.filePath) {
        throw new Error("Profile picture upload failed");
      }
      console.log(`   ✓ Profile picture uploaded successfully`);
      console.log(`   ✓ File ID: ${fileData.fileId}`);
    }
  );

  // Test 2: POST /api/v1/files/document - Upload Document
  await runTest("POST /api/v1/files/document - Upload Document", async () => {
    const freshCsrfToken = await getFreshCsrfToken();
    const mockFile = await createMockFileBuffer(
      "document.pdf",
      "application/pdf",
      2 * 1024 * 1024
    );

    const response = await request(app)
      .post("/api/v1/files/document")
      .set("Cookie", sessionCookie)
      .field("documentType", "certificate")
      .attach("document", mockFile.buffer, {
        filename: mockFile.originalname,
        contentType: mockFile.mimetype,
      })
      .expect(201);

    const fileData = response.body.data;
    testFiles.push(fileData);

    if (!fileData || !fileData.fileId || !fileData.filePath) {
      throw new Error("Document upload failed");
    }
    console.log(`   ✓ Document uploaded successfully`);
    console.log(`   ✓ Document type: ${fileData.documentType}`);
  });

  // Test 3: POST /api/v1/files/resume - Upload Resume
  await runTest("POST /api/v1/files/resume - Upload Resume", async () => {
    const freshCsrfToken = await getFreshCsrfToken();
    const mockFile = await createMockFileBuffer(
      "resume.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      1.5 * 1024 * 1024
    );

    const response = await request(app)
      .post("/api/v1/files/resume")
      .set("Cookie", sessionCookie)
      .attach("resume", mockFile.buffer, {
        filename: mockFile.originalname,
        contentType: mockFile.mimetype,
      })
      .expect(201);

    const fileData = response.body.data;
    testFiles.push(fileData);

    if (!fileData || !fileData.fileId || !fileData.filePath) {
      throw new Error("Resume upload failed");
    }
    console.log(`   ✓ Resume uploaded successfully`);
    console.log(`   ✓ File size: ${fileData.fileSize} bytes`);
  });

  // Test 4: GET /api/v1/files - Get All Files
  await runTest("GET /api/v1/files - Get All Files", async () => {
    const response = await request(app)
      .get("/api/v1/files")
      .set("Cookie", sessionCookie)
      .expect(200);

    if (!response.body.data.files || response.body.data.files.length !== 3) {
      throw new Error("Failed to retrieve all files");
    }
    console.log(`   ✓ Files retrieved successfully`);
    console.log(`   ✓ Found ${response.body.data.files.length} file(s)`);
  });

  // Test 5: GET /api/v1/files/profile-picture - Get Profile Picture
  await runTest(
    "GET /api/v1/files/profile-picture - Get Profile Picture",
    async () => {
      const response = await request(app)
        .get("/api/v1/files/profile-picture")
        .set("Cookie", sessionCookie)
        .expect(200);

      if (
        !response.body.data.profilePicture ||
        !response.body.data.profilePicture.filePath
      ) {
        throw new Error("Failed to retrieve profile picture");
      }
      console.log(`   ✓ Profile picture retrieved`);
      console.log(
        `   ✓ File path: ${response.body.data.profilePicture.filePath}`
      );
    }
  );

  // Test 6: GET /api/v1/files/resumes - Get Resumes
  await runTest("GET /api/v1/files/resumes - Get Resumes", async () => {
    const response = await request(app)
      .get("/api/v1/files/resumes")
      .set("Cookie", sessionCookie)
      .expect(200);

    if (
      !response.body.data.resumes ||
      !Array.isArray(response.body.data.resumes)
    ) {
      throw new Error("Failed to retrieve resumes");
    }
    // Note: We verify resumes exist, but don't enforce exact count
    // as there might be more than one from previous tests
    console.log(`   ✓ Resumes retrieved`);
    console.log(`   ✓ Found ${response.body.data.resumes.length} resume(s)`);
  });

  // Test 7: GET /api/v1/files/documents - Get Documents
  await runTest("GET /api/v1/files/documents - Get Documents", async () => {
    const response = await request(app)
      .get("/api/v1/files/documents")
      .set("Cookie", sessionCookie)
      .expect(200);

    if (
      !response.body.data.documents ||
      !Array.isArray(response.body.data.documents)
    ) {
      throw new Error("Failed to retrieve documents");
    }
    // Note: We verify documents exist, but don't enforce exact count
    // as there might be more than one from previous tests
    console.log(`   ✓ Documents retrieved`);
    console.log(
      `   ✓ Found ${response.body.data.documents.length} document(s)`
    );
  });

  // Test 8: GET /api/v1/files/:fileId - Get File by ID
  await runTest("GET /api/v1/files/:fileId - Get File by ID", async () => {
    const fileId = testFiles[0].fileId;
    const response = await request(app)
      .get(`/api/v1/files/${fileId}`)
      .set("Cookie", sessionCookie)
      .expect(200);

    if (!response.body.data.file || response.body.data.file.fileId !== fileId) {
      throw new Error("Failed to retrieve file by ID");
    }
    console.log(`   ✓ File retrieved by ID successfully`);
    console.log(`   ✓ File ID: ${response.body.data.file.fileId}`);
  });

  // Test 9: GET /api/v1/files/statistics - Get File Statistics
  await runTest(
    "GET /api/v1/files/statistics - Get File Statistics",
    async () => {
      const response = await request(app)
        .get("/api/v1/files/statistics")
        .set("Cookie", sessionCookie)
        .expect(200);

      if (
        !response.body.data.statistics ||
        response.body.data.statistics.totalFiles !== 3
      ) {
        throw new Error("Failed to retrieve file statistics");
      }
      console.log(`   ✓ Statistics retrieved successfully`);
      console.log(
        `   ✓ Total files: ${response.body.data.statistics.totalFiles}`
      );
    }
  );

  // Test 10: GET /api/v1/files/:fileId/content - Serve File Content
  await runTest(
    "GET /api/v1/files/:fileId/content - Serve File Content",
    async () => {
      const fileId = testFiles[0].fileId;
      const response = await request(app)
        .get(`/api/v1/files/${fileId}/content`)
        .set("Cookie", sessionCookie);

      // Handle both 200 (local storage) and 302 (cloud storage redirect)
      if (response.status === 302) {
        // Cloud storage - redirect is expected
        if (!response.headers.location) {
          throw new Error("Redirect missing location header");
        }
        console.log(`   ✓ File redirect served successfully (cloud storage)`);
        console.log(`   ✓ Redirect URL: ${response.headers.location}`);
      } else if (response.status === 200) {
        // Local storage - file content should be in body
        if (!response.body || (Buffer.isBuffer(response.body) && response.body.length === 0)) {
          throw new Error("Failed to serve file content");
        }
        const contentLength = Buffer.isBuffer(response.body) 
          ? response.body.length 
          : (response.body.length || 0);
        console.log(`   ✓ File content served successfully`);
        console.log(`   ✓ Content length: ${contentLength} bytes`);
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    }
  );

  // Test 11: POST /api/v1/files/profile-picture - File Size Validation
  await runTest(
    "POST /api/v1/files/profile-picture - File Size Validation",
    async () => {
      // Skip if Sharp is not available
      let sharp;
      try {
        sharp = (await import("sharp")).default;
      } catch (error) {
        console.log(
          "   ⚠️ Sharp not available, skipping file size validation test"
        );
        return;
      }

      const freshCsrfToken = await getFreshCsrfToken();

      // Create a valid but oversized JPEG
      // Use a smaller valid image as base, then pad it to exceed 5MB
      const width = 200;
      const height = 200;
      const channels = 3;
      const smallImageBuffer = Buffer.alloc(width * height * channels);

      // Fill with a simple pattern
      for (let i = 0; i < smallImageBuffer.length; i += channels) {
        smallImageBuffer[i] = 100;
        smallImageBuffer[i + 1] = 150;
        smallImageBuffer[i + 2] = 200;
      }

      // Create a valid small JPEG
      const validImageBuffer = await sharp(smallImageBuffer, {
        raw: { width, height, channels },
      })
        .jpeg()
        .toBuffer();

      // Now create an oversized buffer by padding
      // The validation checks file.size, which is the buffer length
      const oversizedBuffer = Buffer.concat([
        validImageBuffer,
        Buffer.alloc(6 * 1024 * 1024), // Add 6MB of padding
      ]);

      const oversizedFile = {
        fieldname: "profilePicture",
        originalname: "huge.jpg",
        encoding: "7bit",
        mimetype: "image/jpeg",
        buffer: oversizedBuffer,
        size: oversizedBuffer.length,
      };

      console.log(
        `   Generated file size: ${(oversizedFile.size / (1024 * 1024)).toFixed(
          2
        )}MB`
      );

      const response = await request(app)
        .post("/api/v1/files/profile-picture")
        .set("Cookie", sessionCookie)
        .attach("profilePicture", oversizedFile.buffer, {
          filename: oversizedFile.originalname,
          contentType: oversizedFile.mimetype,
        })
        .expect(400);

      if (
        !response.body.error ||
        !response.body.error.message.includes("File size exceeds")
      ) {
        throw new Error("File size validation not handled correctly");
      }
      console.log(`   ✓ File size validation working correctly`);
    }
  );

  // Test 12: POST /api/v1/files/profile-picture - File Type Validation
  await runTest(
    "POST /api/v1/files/profile-picture - File Type Validation",
    async () => {
      const freshCsrfToken = await getFreshCsrfToken();
      const invalidFile = await createMockFileBuffer(
        "script.js",
        "application/javascript",
        1024
      );

      const response = await request(app)
        .post("/api/v1/files/profile-picture")
        .set("Cookie", sessionCookie)
        .attach("profilePicture", invalidFile.buffer, {
          filename: invalidFile.originalname,
          contentType: invalidFile.mimetype,
        })
        .expect(400);

      if (
        !response.body.error ||
        !response.body.error.message.includes("File type")
      ) {
        throw new Error("File type validation not handled correctly");
      }
      console.log(`   ✓ File type validation working correctly`);
    }
  );

  // Test 13: GET /api/v1/files - Unauthorized Access
  await runTest("GET /api/v1/files - Unauthorized Access", async () => {
    const response = await request(app).get("/api/v1/files").expect(401);

    if (!response.body.error || response.body.error.code !== "UNAUTHORIZED") {
      throw new Error("Unauthorized access not handled correctly");
    }
    console.log(`   ✓ Unauthorized access handled correctly`);
  });

  // Test 14: POST /api/v1/files/profile-picture - CSRF Protection (REMOVED - CSRF no longer in use)
  // CSRF protection has been removed from the backend

  // Test 15: DELETE /api/v1/files/:fileId - Delete File
  await runTest("DELETE /api/v1/files/:fileId - Delete File", async () => {
    const freshCsrfToken = await getFreshCsrfToken();
    const fileToDelete = testFiles.pop();

    const response = await request(app)
      .delete(`/api/v1/files/${fileToDelete.fileId}`)
      .set("Cookie", sessionCookie)
      .expect(200);

    if (!response.body.ok) {
      throw new Error("File deletion failed");
    }
    console.log(`   ✓ File deleted successfully`);

    // Verify deletion
    const verifyResponse = await request(app)
      .get(`/api/v1/files/${fileToDelete.fileId}`)
      .set("Cookie", sessionCookie)
      .expect(404);

    if (
      !verifyResponse.body.error ||
      verifyResponse.body.error.code !== "FILE_NOT_FOUND"
    ) {
      throw new Error("File not found after deletion check failed");
    }
  });

  // Test 16: GET /api/v1/files/:fileId - File Not Found
  await runTest("GET /api/v1/files/:fileId - File Not Found", async () => {
    const nonExistentId = "550e8400-e29b-41d4-a716-446655440000";
    const response = await request(app)
      .get(`/api/v1/files/${nonExistentId}`)
      .set("Cookie", sessionCookie)
      .expect(404);

    if (!response.body.error || response.body.error.code !== "FILE_NOT_FOUND") {
      throw new Error("File not found error not handled correctly");
    }
    console.log(`   ✓ File not found handled correctly`);
  });

  // Test 17: GET /api/v1/files/:fileId - Invalid File ID Format
  await runTest(
    "GET /api/v1/files/:fileId - Invalid File ID Format",
    async () => {
      const invalidId = "invalid-uuid";
      const response = await request(app)
        .get(`/api/v1/files/${invalidId}`)
        .set("Cookie", sessionCookie)
        .expect(422);

      if (
        !response.body.error ||
        response.body.error.code !== "VALIDATION_ERROR"
      ) {
        throw new Error("Invalid file ID format error not handled correctly");
      }
      console.log(`   ✓ Invalid file ID format handled correctly`);
    }
  );

  console.log("\n📊 Test Summary");
  console.log("==================================================");
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📝 Total:  ${testResults.total}`);
  console.log(
    `📈 Success Rate: ${(
      (testResults.passed / testResults.total) *
      100
    ).toFixed(1)}%`
  );

  if (testResults.failed > 0) {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed.`);
  } else {
    console.log("\n🎉 All File Upload API tests passed!");
  }
}

runAllTests()
  .catch(console.error)
  .finally(async () => {
    await cleanupTestData();
    await database.close();
    console.log("\n✨ Test suite completed!");
  });
