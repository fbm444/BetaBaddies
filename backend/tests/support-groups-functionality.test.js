#!/usr/bin/env node

/**
 * Test for support groups functionality using actual database
 * Tests group creation, joining, leaving, and member management
 */

import userService from "../services/userService.js";
import supportGroupsService from "../services/collaboration/supportGroupsService.js";
import database from "../services/database.js";

console.log("🧪 Testing Support Groups Service Functionality with Database");
console.log("=============================================================\n");

const testEmail1 = `support-groups-test1-${Date.now()}@example.com`;
const testEmail2 = `support-groups-test2-${Date.now()}@example.com`;
const testPassword = "TestPassword123";

let testUserId1;
let testUserId2;
let createdGroupIds = [];

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n📋 Test: ${testName}`);
  console.log("─".repeat(60));

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

// Setup: Create test users
async function setupTestData() {
  console.log("🔧 Setting up test data...");

  try {
    const result1 = await userService.createUser({
      email: testEmail1,
      password: testPassword,
    });
    testUserId1 = result1.id;

    const result2 = await userService.createUser({
      email: testEmail2,
      password: testPassword,
    });
    testUserId2 = result2.id;

    console.log(
      `   ✓ Created test users: ${testEmail1} and ${testEmail2}\n`
    );
  } catch (error) {
    console.error(`   ❌ Failed to create test users:`, error.message);
    throw error;
  }
}

// Cleanup: Remove test data
async function cleanupTestData() {
  console.log("\n🧹 Cleaning up test data...");

  // Delete group memberships
  for (const groupId of createdGroupIds) {
    try {
      await database.query(
        "DELETE FROM support_group_memberships WHERE group_id = $1",
        [groupId]
      );
    } catch (error) {
      console.error(
        `   ⚠️  Failed to delete memberships for group ${groupId}:`,
        error.message
      );
    }
  }

  // Delete groups
  for (const groupId of createdGroupIds) {
    try {
      await database.query("DELETE FROM support_groups WHERE id = $1", [
        groupId,
      ]);
      console.log(`   ✓ Deleted group: ${groupId}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete group ${groupId}:`,
        error.message
      );
    }
  }

  // Delete test users
  if (testUserId1) {
    try {
      await userService.deleteUser(testUserId1);
      console.log(`   ✓ Deleted test user 1: ${testUserId1}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete test user 1 ${testUserId1}:`,
        error.message
      );
    }
  }

  if (testUserId2) {
    try {
      await userService.deleteUser(testUserId2);
      console.log(`   ✓ Deleted test user 2: ${testUserId2}`);
    } catch (error) {
      console.error(
        `   ❌ Failed to delete test user 2 ${testUserId2}:`,
        error.message
      );
    }
  }

  console.log(
    `   📊 Cleaned up ${createdGroupIds.length} groups and 2 users`
  );
}

// Main test execution
async function runAllTests() {
  try {
    await setupTestData();

    // Test 1: Create Support Group
    let groupId;
    await runTest("Create Support Group", async () => {
      const groupData = {
        name: `Test Group ${Date.now()}`,
        description: "A test support group for software engineers",
        category: "industry",
        industry: "Software Engineering",
        roleType: null,
        isPublic: true,
      };

      const group = await supportGroupsService.createSupportGroup(
        testUserId1,
        groupData
      );

      if (!group.id) {
        throw new Error("Group was not created with an ID");
      }

      if (group.name !== groupData.name) {
        throw new Error("Group name mismatch");
      }

      if (group.category !== groupData.category) {
        throw new Error("Group category mismatch");
      }

      groupId = group.id;
      createdGroupIds.push(groupId);
      console.log("   ✓ Support group created successfully:", group.id);
    });

    // Test 2: Get Support Group
    await runTest("Get Support Group", async () => {
      const group = await supportGroupsService.getSupportGroup(
        groupId,
        testUserId1
      );

      if (!group) {
        throw new Error("Group not found");
      }

      if (group.id !== groupId) {
        throw new Error("Group ID mismatch");
      }

      if (group.is_member !== true) {
        throw new Error("Creator should be a member");
      }

      console.log("   ✓ Support group retrieved successfully");
    });

    // Test 3: Get All Support Groups
    await runTest("Get All Support Groups", async () => {
      const groups = await supportGroupsService.getSupportGroups(testUserId1, {
        category: "industry",
      });

      if (!Array.isArray(groups)) {
        throw new Error("Groups should be an array");
      }

      const hasOurGroup = groups.some((g) => g.id === groupId);
      if (!hasOurGroup) {
        throw new Error("Created group should be in the list");
      }

      console.log(`   ✓ Retrieved ${groups.length} support groups`);
    });

    // Test 4: Join Support Group
    await runTest("Join Support Group", async () => {
      const membership = await supportGroupsService.joinSupportGroup(
        testUserId2,
        groupId,
        "standard"
      );

      if (!membership) {
        throw new Error("Membership was not created");
      }

      // Verify membership
      const group = await supportGroupsService.getSupportGroup(
        groupId,
        testUserId2
      );

      if (group.is_member !== true) {
        throw new Error("User should be a member after joining");
      }

      console.log("   ✓ User joined support group successfully");
    });

    // Test 5: Get Group Members
    await runTest("Get Group Members", async () => {
      const members = await supportGroupsService.getGroupMembers(
        groupId,
        testUserId1
      );

      if (!Array.isArray(members)) {
        throw new Error("Members should be an array");
      }

      if (members.length < 2) {
        throw new Error(
          `Expected at least 2 members, got ${members.length}`
        );
      }

      const hasUser1 = members.some((m) => m.user_id === testUserId1);
      const hasUser2 = members.some((m) => m.user_id === testUserId2);

      if (!hasUser1 || !hasUser2) {
        throw new Error("Both users should be in members list");
      }

      console.log(`   ✓ Retrieved ${members.length} group members`);
    });

    // Test 6: Leave Support Group
    await runTest("Leave Support Group", async () => {
      await supportGroupsService.leaveSupportGroup(testUserId2, groupId);

      // Verify user is no longer a member
      const group = await supportGroupsService.getSupportGroup(
        groupId,
        testUserId2
      );

      if (group.is_member !== false) {
        throw new Error("User should not be a member after leaving");
      }

      console.log("   ✓ User left support group successfully");
    });

    // Test 7: Filter Groups by Industry
    await runTest("Filter Groups by Industry", async () => {
      const groups = await supportGroupsService.getSupportGroups(testUserId1, {
        industry: "Software Engineering",
      });

      if (!Array.isArray(groups)) {
        throw new Error("Groups should be an array");
      }

      const allMatchIndustry = groups.every(
        (g) => g.industry === "Software Engineering"
      );

      if (!allMatchIndustry) {
        throw new Error("Not all groups match the industry filter");
      }

      console.log(
        `   ✓ Filtered ${groups.length} groups by industry successfully`
      );
    });

    // Test 8: Search Groups
    await runTest("Search Groups", async () => {
      const groups = await supportGroupsService.getSupportGroups(testUserId1, {
        search: "software",
      });

      if (!Array.isArray(groups)) {
        throw new Error("Groups should be an array");
      }

      const hasRelevantGroup = groups.some(
        (g) =>
          g.name.toLowerCase().includes("software") ||
          (g.description &&
            g.description.toLowerCase().includes("software"))
      );

      if (!hasRelevantGroup && groups.length > 0) {
        throw new Error("Search should return relevant groups");
      }

      console.log(`   ✓ Searched and found ${groups.length} groups`);
    });

    // Test 9: Error Handling - Invalid Group ID
    await runTest("Error Handling - Invalid Group ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      try {
        await supportGroupsService.getSupportGroup(fakeId, testUserId1);
        throw new Error("Should have thrown error for non-existent group");
      } catch (error) {
        if (!error.message.includes("not found")) {
          throw error;
        }
        console.log("   ✓ Correctly handled invalid group ID");
      }
    });

    // Test 10: Error Handling - Missing Required Fields
    await runTest("Error Handling - Missing Required Fields", async () => {
      try {
        await supportGroupsService.createSupportGroup(testUserId1, {
          // Missing name and category
          description: "Test group",
        });
        throw new Error("Should have thrown error for missing required fields");
      } catch (error) {
        if (
          !error.message.includes("required") &&
          !error.message.includes("Name")
        ) {
          throw error;
        }
        console.log("   ✓ Correctly validated required fields");
      }
    });

    // Final Summary
    console.log("\n📊 Test Summary");
    console.log("================");
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);

    if (testResults.failed > 0) {
      console.log(`\n❌ ${testResults.failed} test(s) failed.`);
      process.exit(1);
    } else {
      console.log("\n🎉 All support groups functionality tests passed!");
      console.log("\n✅ Core support groups components are working correctly:");
      console.log("   • Group creation");
      console.log("   • Group retrieval");
      console.log("   • Group filtering and search");
      console.log("   • Joining groups");
      console.log("   • Leaving groups");
      console.log("   • Member management");
      console.log("   • Error handling");
    }
  } catch (error) {
    console.error("\n❌ Test execution failed:", error.message);
    process.exit(1);
  } finally {
    await cleanupTestData();
    console.log("\n✅ Test cleanup completed");
  }
}

// Run the tests
runAllTests().catch(console.error);

