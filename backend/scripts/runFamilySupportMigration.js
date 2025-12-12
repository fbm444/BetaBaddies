import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import database from "../services/database.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("🚀 Running Family Support Features Migration...\n");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "../../db/migrations/add_family_support_features.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📝 Executing migration SQL...\n");

    // Execute the migration
    await database.query(migrationSQL);

    console.log("✅ Migration completed successfully!\n");

    // Verify tables were created
    console.log("🔍 Verifying tables...\n");
    const tables = [
      "family_communications",
      "family_boundary_settings",
      "family_celebrations",
      "family_wellbeing_tracking",
      "family_support_suggestions",
      "family_educational_resources",
    ];

    for (const table of tables) {
      const result = await database.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      if (result.rows[0].exists) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        console.log(`   ❌ Table '${table}' does NOT exist`);
      }
    }

    console.log("\n✨ Migration verification complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();

