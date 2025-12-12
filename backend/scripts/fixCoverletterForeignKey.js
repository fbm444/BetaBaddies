import database from "../services/database.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixForeignKey() {
  try {
    console.log("🔧 Fixing coverletter job_id foreign key constraint...\n");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "../../db/migrations/fix_coverletter_job_foreign_key.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("📝 Executing migration SQL...\n");

    // Execute the migration
    await database.query(migrationSQL);

    console.log("✅ Foreign key constraint fixed successfully!\n");

    // Verify the constraint
    console.log("🔍 Verifying constraint...\n");
    const result = await database.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'coverletter' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'job_id'
    `);

    if (result.rows.length > 0) {
      const constraint = result.rows[0];
      console.log(`   ✅ Constraint: ${constraint.constraint_name}`);
      console.log(`   ✅ References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      
      if (constraint.foreign_table_name === 'job_opportunities') {
        console.log("\n✨ Constraint correctly points to job_opportunities!");
      } else {
        console.log(`\n⚠️  Warning: Constraint points to ${constraint.foreign_table_name} instead of job_opportunities`);
      }
    } else {
      console.log("   ⚠️  No foreign key constraint found for job_id");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
}

// Run the migration
fixForeignKey();

