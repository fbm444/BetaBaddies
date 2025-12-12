import database from "../services/database.js";
import dotenv from "dotenv";

dotenv.config();

async function grantPermissions() {
  try {
    console.log("🔐 Granting permissions for family support tables...\n");

    const tables = [
      "family_communications",
      "family_boundary_settings",
      "family_celebrations",
      "family_wellbeing_tracking",
      "family_support_suggestions",
      "family_educational_resources",
    ];

    for (const table of tables) {
      await database.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${table} TO "ats_user"`
      );
      console.log(`   ✅ Permissions granted for '${table}'`);
    }

    console.log("\n✨ All permissions granted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error granting permissions:", error);
    process.exit(1);
  }
}

grantPermissions();

